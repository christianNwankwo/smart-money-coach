/**
 * Avalanche vs snowball.
 *
 * Both strategies pay every minimum, then throw the whole remaining budget at
 * one target debt; they differ only in which debt is the target. Both also roll
 * a cleared debt's minimum into the budget rather than pocketing it — that
 * rollover is what makes either method finish materially earlier than paying
 * minimums, and leaving it out is the usual way these calculators get flattered.
 *
 * Avalanche targets the highest rate, which always costs the least interest.
 * Snowball targets the smallest balance, which clears accounts soonest. The
 * point of computing both is that the gap is often small enough to be worth
 * trading for the motivation, and sometimes it is not — the number decides.
 */
import { MAX_MONTHS, monthlyRate, requireNonNegative, roundCents } from "./money";

export interface Debt {
  id: string;
  name: string;
  balance: number;
  annualRatePct: number;
  /** Contractual minimum. Paid every month until the account clears. */
  minimumPayment: number;
}

export type PayoffStrategy = "avalanche" | "snowball";

export interface DebtPayoffInput {
  debts: Debt[];
  strategy: PayoffStrategy;
  /** Paid on top of the sum of the minimums, every month. */
  extraMonthly?: number;
}

export interface DebtPayoffMonth {
  month: number;
  /** Combined balance across all debts at the end of the month. */
  totalBalance: number;
  interest: number;
  paid: number;
  cumulativeInterest: number;
  /** Balance per debt id at the end of the month, for stacked charts. */
  balances: Record<string, number>;
}

export interface DebtOutcome {
  id: string;
  name: string;
  /** 1-based month this account hits zero. */
  payoffMonth: number;
  totalInterest: number;
  totalPaid: number;
}

export interface DebtPayoffPlan {
  strategy: PayoffStrategy;
  /** Debt ids in the order the strategy attacks them. */
  order: string[];
  months: DebtPayoffMonth[];
  perDebt: DebtOutcome[];
  monthsToDebtFree: number;
  totalInterest: number;
  totalPaid: number;
  /** Sum of the minimums plus the extra — constant for the whole plan. */
  monthlyBudget: number;
}

/** Thrown when the budget can never clear the debts. */
export class UnpayableDebtError extends Error {
  constructor(message: string, readonly outstanding: string[]) {
    super(message);
    this.name = "UnpayableDebtError";
  }
}

/** Debt ids in the order `strategy` attacks them. */
export function payoffOrder(
  debts: readonly Debt[],
  strategy: PayoffStrategy
): string[] {
  const sorted = [...debts];
  if (strategy === "avalanche") {
    // Highest rate first; ties broken by smallest balance so the order is
    // deterministic rather than dependent on input order.
    sorted.sort(
      (a, b) => b.annualRatePct - a.annualRatePct || a.balance - b.balance
    );
  } else {
    sorted.sort(
      (a, b) => a.balance - b.balance || b.annualRatePct - a.annualRatePct
    );
  }
  return sorted.map((d) => d.id);
}

export function planPayoff(input: DebtPayoffInput): DebtPayoffPlan {
  const extraMonthly = requireNonNegative(input.extraMonthly ?? 0, "extraMonthly");
  const debts = input.debts.filter((d) => d.balance > 0);

  for (const debt of debts) {
    requireNonNegative(debt.balance, `${debt.name} balance`);
    requireNonNegative(debt.annualRatePct, `${debt.name} rate`);
    requireNonNegative(debt.minimumPayment, `${debt.name} minimum payment`);
  }
  if (new Set(debts.map((d) => d.id)).size !== debts.length) {
    throw new RangeError("every debt needs a unique id");
  }

  const order = payoffOrder(debts, input.strategy);
  const monthlyBudget = roundCents(
    debts.reduce((sum, d) => sum + d.minimumPayment, 0) + extraMonthly
  );

  const empty: DebtPayoffPlan = {
    strategy: input.strategy,
    order,
    months: [],
    perDebt: [],
    monthsToDebtFree: 0,
    totalInterest: 0,
    totalPaid: 0,
    monthlyBudget,
  };
  if (debts.length === 0) return empty;

  const state = new Map(
    debts.map((d) => [
      d.id,
      {
        debt: d,
        balance: roundCents(d.balance),
        interest: 0,
        paid: 0,
        payoffMonth: 0,
      },
    ])
  );

  const months: DebtPayoffMonth[] = [];
  let cumulativeInterest = 0;
  let totalPaid = 0;

  for (let month = 1; month <= MAX_MONTHS; month++) {
    let monthInterest = 0;
    let monthPaid = 0;

    // 1. Interest accrues on every open account.
    for (const s of state.values()) {
      if (s.balance <= 0) continue;
      const charge = roundCents(s.balance * monthlyRate(s.debt.annualRatePct));
      s.balance = roundCents(s.balance + charge);
      s.interest = roundCents(s.interest + charge);
      monthInterest = roundCents(monthInterest + charge);
    }

    // 2. Minimums, capped at what is actually owed.
    let budget = monthlyBudget;
    for (const id of order) {
      const s = state.get(id)!;
      if (s.balance <= 0) continue;
      const pay = Math.min(s.debt.minimumPayment, s.balance, budget);
      if (pay <= 0) continue;
      s.balance = roundCents(s.balance - pay);
      s.paid = roundCents(s.paid + pay);
      budget = roundCents(budget - pay);
      monthPaid = roundCents(monthPaid + pay);
    }

    // 3. Everything left goes to the target debt, cascading to the next one if
    //    the target clears mid-month — otherwise the surplus would idle for a
    //    month and the plan would report a payoff date that is too late.
    for (const id of order) {
      if (budget <= 0) break;
      const s = state.get(id)!;
      if (s.balance <= 0) continue;
      const pay = Math.min(budget, s.balance);
      s.balance = roundCents(s.balance - pay);
      s.paid = roundCents(s.paid + pay);
      budget = roundCents(budget - pay);
      monthPaid = roundCents(monthPaid + pay);
    }

    for (const s of state.values()) {
      if (s.balance <= 0 && s.payoffMonth === 0) s.payoffMonth = month;
    }

    cumulativeInterest = roundCents(cumulativeInterest + monthInterest);
    totalPaid = roundCents(totalPaid + monthPaid);

    const balances: Record<string, number> = {};
    let totalBalance = 0;
    for (const [id, s] of state) {
      balances[id] = s.balance;
      totalBalance = roundCents(totalBalance + s.balance);
    }

    months.push({
      month,
      totalBalance,
      interest: monthInterest,
      paid: monthPaid,
      cumulativeInterest,
      balances,
    });

    if (totalBalance <= 0) {
      return {
        strategy: input.strategy,
        order,
        months,
        perDebt: [...state.values()].map((s) => ({
          id: s.debt.id,
          name: s.debt.name,
          payoffMonth: s.payoffMonth,
          totalInterest: s.interest,
          totalPaid: s.paid,
        })),
        monthsToDebtFree: month,
        totalInterest: cumulativeInterest,
        totalPaid,
        monthlyBudget,
      };
    }
  }

  // Reaching here means the budget never clears the balances. That is a real
  // input — minimums below the interest charge — not an internal error, so name
  // the accounts rather than returning a plan that quietly stops short.
  const outstanding = [...state.values()]
    .filter((s) => s.balance > 0)
    .map((s) => s.debt.name);
  throw new UnpayableDebtError(
    `A budget of ${monthlyBudget}/month never clears these balances: ` +
      `${outstanding.join(", ")}. The minimum payments do not cover the interest.`,
    outstanding
  );
}

export interface StrategyComparison {
  avalanche: DebtPayoffPlan;
  snowball: DebtPayoffPlan;
  /** Interest the avalanche saves. Never negative — avalanche is optimal. */
  interestSaved: number;
  /** Months the avalanche saves. Can be zero, and occasionally negative. */
  monthsSaved: number;
  /** The first account each strategy clears, and when. */
  firstWin: {
    avalanche: { name: string; month: number } | null;
    snowball: { name: string; month: number } | null;
  };
}

/**
 * Run both strategies over the same debts and budget.
 *
 * `monthsSaved` can come out negative: the avalanche minimises interest, not
 * time, and a large high-rate balance can push the debt-free date past what the
 * snowball reaches. That is a real result and is reported rather than clamped.
 */
export function compareStrategies(
  debts: Debt[],
  extraMonthly = 0
): StrategyComparison {
  const avalanche = planPayoff({ debts, strategy: "avalanche", extraMonthly });
  const snowball = planPayoff({ debts, strategy: "snowball", extraMonthly });

  const firstCleared = (plan: DebtPayoffPlan) => {
    const cleared = plan.perDebt
      .filter((d) => d.payoffMonth > 0)
      .sort((a, b) => a.payoffMonth - b.payoffMonth)[0];
    return cleared ? { name: cleared.name, month: cleared.payoffMonth } : null;
  };

  return {
    avalanche,
    snowball,
    interestSaved: roundCents(snowball.totalInterest - avalanche.totalInterest),
    monthsSaved: snowball.monthsToDebtFree - avalanche.monthsToDebtFree,
    firstWin: {
      avalanche: firstCleared(avalanche),
      snowball: firstCleared(snowball),
    },
  };
}
