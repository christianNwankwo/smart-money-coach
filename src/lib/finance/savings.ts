/**
 * Saving toward a goal, an emergency cushion, and a retirement balance.
 *
 * None of this is market-specific — the arithmetic of "put X aside for N
 * months at R% and adjust for inflation" is the same everywhere. What differs
 * per market is the currency, the realistic inflation rate, and what the
 * account is called, and all of that lives in the market config rather than
 * here.
 *
 * Inflation is compounded monthly rather than annually. Compounding it once a
 * year understates the target for any goal that is not a whole number of years
 * out, and most goals are not.
 */
import {
  MAX_MONTHS,
  requireNonNegative,
  requirePositive,
  roundCents,
} from "./money";

// ---------------------------------------------------------------- inflation

/**
 * What `amount` costs after `months` of `annualInflationPct`.
 *
 * The rate is converted to a monthly one and compounded, so an 18-month goal
 * at 20% is inflated by 20% pro-rated across 18 months rather than by a flat
 * year-and-a-half of annual steps.
 */
export function inflate(
  amount: number,
  annualInflationPct: number,
  months: number
): number {
  requireNonNegative(amount, "amount");
  requireNonNegative(annualInflationPct, "annualInflationPct");
  requireNonNegative(months, "months");
  const monthly = annualInflationPct / 100 / 12;
  return roundCents(amount * Math.pow(1 + monthly, months));
}

/**
 * The reverse: what a future `amount` is worth in today's money.
 *
 * A balance projected 25 years out is meaningless without this — the number
 * looks enormous and buys much less than it appears to.
 */
export function discountToToday(
  amount: number,
  annualInflationPct: number,
  months: number
): number {
  requireNonNegative(amount, "amount");
  requireNonNegative(annualInflationPct, "annualInflationPct");
  requireNonNegative(months, "months");
  const monthly = annualInflationPct / 100 / 12;
  return roundCents(amount / Math.pow(1 + monthly, months));
}

// ---------------------------------------------------------------- goal saving

export interface GoalPlanInput {
  /** What the thing costs today. */
  goalToday: number;
  months: number;
  /** Expected annual inflation on this goal's price. */
  annualInflationPct: number;
  /** Already set aside toward it. */
  existingSavings?: number;
}

export interface GoalPlan {
  /** Price at the target date, after inflation. */
  inflatedGoal: number;
  /** How much inflation adds to the bill. */
  inflationPremium: number;
  /** Still to find, after what is already saved. */
  gap: number;
  /** Monthly contribution that closes the gap in time. */
  monthlyContribution: number;
  /** Everything paid in, including the existing balance. */
  totalContributed: number;
  /** True when the existing savings already cover the inflated goal. */
  alreadyFunded: boolean;
}

export function planGoal(input: GoalPlanInput): GoalPlan {
  const goalToday = requirePositive(input.goalToday, "goalToday");
  const months = requirePositive(input.months, "months");
  const annualInflationPct = requireNonNegative(
    input.annualInflationPct,
    "annualInflationPct"
  );
  const existingSavings = requireNonNegative(
    input.existingSavings ?? 0,
    "existingSavings"
  );

  const inflatedGoal = inflate(goalToday, annualInflationPct, months);
  const gap = roundCents(Math.max(0, inflatedGoal - existingSavings));
  // Rounded up: a contribution rounded down leaves the goal a few naira short
  // on the final month, which is the same stub-payment problem the amortisation
  // engine solves by rounding the payment up.
  const monthlyContribution = gap > 0 ? Math.ceil(gap / months) : 0;

  return {
    inflatedGoal,
    inflationPremium: roundCents(inflatedGoal - goalToday),
    gap,
    monthlyContribution,
    totalContributed: roundCents(monthlyContribution * months + existingSavings),
    alreadyFunded: gap === 0,
  };
}

// ---------------------------------------------------------------- emergency fund

export interface EmergencyFundInput {
  monthlyExpenses: number;
  targetMonths: number;
  currentSavings?: number;
  /** What can be added each month. */
  monthlySavings?: number;
}

export interface EmergencyFundPlan {
  target: number;
  gap: number;
  /** Months of expenses the current balance already covers. */
  monthsCovered: number;
  /** Months to close the gap, or null when nothing is being saved. */
  monthsToTarget: number | null;
  fullyFunded: boolean;
}

export function planEmergencyFund(
  input: EmergencyFundInput
): EmergencyFundPlan {
  const monthlyExpenses = requirePositive(
    input.monthlyExpenses,
    "monthlyExpenses"
  );
  const targetMonths = requirePositive(input.targetMonths, "targetMonths");
  const currentSavings = requireNonNegative(
    input.currentSavings ?? 0,
    "currentSavings"
  );
  const monthlySavings = requireNonNegative(
    input.monthlySavings ?? 0,
    "monthlySavings"
  );

  const target = roundCents(monthlyExpenses * targetMonths);
  const gap = roundCents(Math.max(0, target - currentSavings));

  let monthsToTarget: number | null;
  if (gap === 0) monthsToTarget = 0;
  else if (monthlySavings <= 0) monthsToTarget = null;
  else monthsToTarget = Math.ceil(gap / monthlySavings);

  return {
    target,
    gap,
    monthsCovered: currentSavings / monthlyExpenses,
    monthsToTarget,
    fullyFunded: gap === 0,
  };
}

// ---------------------------------------------------------------- contributions

export interface ContributionProjectionInput {
  /** Balance today. */
  openingBalance?: number;
  monthlyContribution: number;
  months: number;
  /** Expected nominal annual return on the invested balance. */
  annualReturnPct: number;
  /** Used to express the result in today's money. */
  annualInflationPct?: number;
}

export interface ContributionProjection {
  /** Nominal balance at the end. */
  finalBalance: number;
  /** Sum of the contributions alone. */
  totalContributed: number;
  /** Growth on top of contributions and opening balance. */
  investmentGrowth: number;
  /** `finalBalance` expressed in today's purchasing power. */
  balanceInTodaysMoney: number;
  /** Nominal balance at the end of each month, for charting. */
  monthlyBalances: number[];
}

/**
 * Compound an opening balance plus a level monthly contribution.
 *
 * The contribution is applied at the end of each period (an ordinary annuity),
 * which is how a salary deduction actually lands: the month's return accrues on
 * the balance that was there before this month's contribution arrived.
 */
export function projectContributions(
  input: ContributionProjectionInput
): ContributionProjection {
  const openingBalance = requireNonNegative(
    input.openingBalance ?? 0,
    "openingBalance"
  );
  const monthlyContribution = requireNonNegative(
    input.monthlyContribution,
    "monthlyContribution"
  );
  const months = requirePositive(input.months, "months");
  const annualReturnPct = requireNonNegative(
    input.annualReturnPct,
    "annualReturnPct"
  );
  const annualInflationPct = requireNonNegative(
    input.annualInflationPct ?? 0,
    "annualInflationPct"
  );

  if (months > MAX_MONTHS) {
    throw new RangeError(
      `months must be at most ${MAX_MONTHS} (got ${months})`
    );
  }

  const monthlyReturn = annualReturnPct / 100 / 12;
  const monthlyBalances: number[] = [];

  let balance = roundCents(openingBalance);
  for (let m = 0; m < months; m++) {
    balance = roundCents(balance * (1 + monthlyReturn) + monthlyContribution);
    monthlyBalances.push(balance);
  }

  const totalContributed = roundCents(monthlyContribution * months);

  return {
    finalBalance: balance,
    totalContributed,
    investmentGrowth: roundCents(balance - openingBalance - totalContributed),
    balanceInTodaysMoney: discountToToday(balance, annualInflationPct, months),
    monthlyBalances,
  };
}
