/**
 * Refinance break-even.
 *
 * Two break-evens are reported, and they answer different questions:
 *
 *   - **Cash-flow break-even** — how many months of a lower payment repay the
 *     closing costs. This is the number lenders quote, and it flatters any refi
 *     that lowers the payment by stretching the term back out to 30 years.
 *   - **Total-cost break-even** — the month from which refinancing has cost
 *     less overall. This is the honest one, and it is the headline here.
 *
 * The second needs a definition of "cost" that survives the two loans having
 * different balances and different terms: cost over a window is what you paid
 * minus the equity you bought, i.e.
 *
 *     net cost(m) = cumulative payments(m) − (starting balance − balance(m))
 *
 * For the current loan that reduces to its cumulative interest. For the new
 * loan, expanding `balance(m) = newLoanAmount − cumulative principal(m)` makes
 * the principal terms cancel and leaves
 *
 *     cumulative interest(m) + (newLoanAmount − currentBalance) + cash at close
 *
 * — which is cumulative interest plus the closing costs whether they were
 * financed or paid in cash. Rolling costs into the loan does not make them
 * cheaper; it moves them, and this formula keeps them visible either way.
 */
import { buildSchedule, type Schedule } from "./amortization";
import { requireNonNegative, requirePositive, roundCents } from "./money";

export interface RefinanceInput {
  currentBalance: number;
  currentRatePct: number;
  /** Payments left on the existing loan. */
  currentRemainingMonths: number;
  newRatePct: number;
  newTermMonths: number;
  /** Lender fees, title, appraisal, points — everything due at close. */
  closingCosts: number;
  /** Finance the costs into the new balance instead of paying cash. */
  rollCostsIn?: boolean;
  /** How long the borrower expects to keep the house. Default 120 (10 years). */
  monthsYouStay?: number;
}

export interface RefinanceResult {
  currentPayment: number;
  newPayment: number;
  /** Positive when the new payment is lower. */
  monthlySavings: number;
  newLoanAmount: number;
  cashDueAtClose: number;

  /** Months of payment savings needed to repay the cash paid at close. */
  cashFlowBreakEvenMonths: number | null;
  /** First month from which refinancing has cost less overall. */
  totalCostBreakEvenMonths: number | null;

  currentTotalInterest: number;
  newTotalInterest: number;
  /** Positive when refinancing costs less interest over the full terms. */
  lifetimeInterestSaved: number;

  monthsYouStay: number;
  /** Net cost of each option over `monthsYouStay`, and the difference. */
  costOverStay: { staying: number; refinancing: number; saved: number };

  /** True when the new term ends later than the current loan would have. */
  extendsTerm: boolean;
  monthsAddedToPayoff: number;

  currentSchedule: Schedule;
  newSchedule: Schedule;
}

export function analyzeRefinance(input: RefinanceInput): RefinanceResult {
  const currentBalance = requirePositive(input.currentBalance, "currentBalance");
  const currentRatePct = requireNonNegative(input.currentRatePct, "currentRatePct");
  const currentRemainingMonths = requirePositive(
    input.currentRemainingMonths,
    "currentRemainingMonths"
  );
  const newRatePct = requireNonNegative(input.newRatePct, "newRatePct");
  const newTermMonths = requirePositive(input.newTermMonths, "newTermMonths");
  const closingCosts = requireNonNegative(input.closingCosts, "closingCosts");
  const monthsYouStay = requirePositive(input.monthsYouStay ?? 120, "monthsYouStay");

  const rollCostsIn = input.rollCostsIn ?? false;
  const newLoanAmount = roundCents(currentBalance + (rollCostsIn ? closingCosts : 0));
  const cashDueAtClose = rollCostsIn ? 0 : closingCosts;

  const currentSchedule = buildSchedule({
    principal: currentBalance,
    annualRatePct: currentRatePct,
    termMonths: currentRemainingMonths,
  });
  const newSchedule = buildSchedule({
    principal: newLoanAmount,
    annualRatePct: newRatePct,
    termMonths: newTermMonths,
  });

  const currentPayment = currentSchedule.payment;
  const newPayment = newSchedule.payment;
  const monthlySavings = roundCents(currentPayment - newPayment);

  const cashFlowBreakEvenMonths =
    cashDueAtClose === 0
      ? monthlySavings > 0
        ? 0
        : null
      : monthlySavings > 0
        ? Math.ceil(cashDueAtClose / monthlySavings)
        : null;

  // Cumulative interest for each loan, held flat once that loan is paid off, so
  // both series are comparable at every month out to the longer horizon.
  const horizon = Math.max(
    currentSchedule.monthsToPayoff,
    newSchedule.monthsToPayoff,
    Math.ceil(monthsYouStay)
  );
  const stayingCost = cumulativeInterestSeries(currentSchedule, horizon);
  const refinancingCost = cumulativeInterestSeries(newSchedule, horizon).map((v) =>
    roundCents(v + closingCosts)
  );

  let totalCostBreakEvenMonths: number | null = null;
  for (let m = 1; m <= horizon; m++) {
    if (refinancingCost[m] <= stayingCost[m]) {
      totalCostBreakEvenMonths = m;
      break;
    }
  }

  const stayIndex = Math.min(Math.ceil(monthsYouStay), horizon);

  return {
    currentPayment,
    newPayment,
    monthlySavings,
    newLoanAmount,
    cashDueAtClose,
    cashFlowBreakEvenMonths,
    totalCostBreakEvenMonths,
    currentTotalInterest: currentSchedule.totalInterest,
    newTotalInterest: newSchedule.totalInterest,
    lifetimeInterestSaved: roundCents(
      currentSchedule.totalInterest - newSchedule.totalInterest - closingCosts
    ),
    monthsYouStay: Math.ceil(monthsYouStay),
    costOverStay: {
      staying: stayingCost[stayIndex],
      refinancing: refinancingCost[stayIndex],
      saved: roundCents(stayingCost[stayIndex] - refinancingCost[stayIndex]),
    },
    extendsTerm: newSchedule.monthsToPayoff > currentSchedule.monthsToPayoff,
    monthsAddedToPayoff:
      newSchedule.monthsToPayoff - currentSchedule.monthsToPayoff,
    currentSchedule,
    newSchedule,
  };
}

/**
 * Cumulative interest by month, index 0 = before the first payment, padded out
 * to `horizon` with the loan's final total once it is paid off.
 */
function cumulativeInterestSeries(schedule: Schedule, horizon: number): number[] {
  const series = new Array<number>(horizon + 1);
  series[0] = 0;
  for (let m = 1; m <= horizon; m++) {
    const row = schedule.rows[m - 1];
    series[m] = row ? row.cumulativeInterest : schedule.totalInterest;
  }
  return series;
}

/**
 * The rate at which refinancing this balance would break even by `byMonth`,
 * found by bisection. Answers "what rate would actually be worth the fees?" —
 * the question behind most refinance shopping, and one no break-even figure on
 * its own tells you.
 *
 * Returns null when no rate down to 0% clears the costs in time.
 */
export function breakEvenRate(
  input: Omit<RefinanceInput, "newRatePct">,
  byMonth: number
): number | null {
  const test = (rate: number) => {
    const result = analyzeRefinance({ ...input, newRatePct: rate });
    const breakEven = result.totalCostBreakEvenMonths;
    return breakEven !== null && breakEven <= byMonth;
  };

  if (!test(0)) return null;
  if (test(input.currentRatePct)) return input.currentRatePct;

  let low = 0; // known to break even in time
  let high = input.currentRatePct; // known not to
  for (let i = 0; i < 40; i++) {
    const mid = (low + high) / 2;
    if (test(mid)) low = mid;
    else high = mid;
  }
  // Floored, not rounded. `low` is the side known to work and lower is better,
  // so rounding to the nearest thousandth can land a hair above the threshold
  // and return a rate that misses the deadline by a month.
  return Math.floor(low * 1000) / 1000;
}
