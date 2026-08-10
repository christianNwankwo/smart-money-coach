/**
 * Fixed-rate amortisation: the scheduled payment, the month-by-month schedule,
 * and what extra principal does to it.
 *
 * US conventions: monthly compounding at rate/12, interest charged on the
 * balance at the start of the period, extra principal applied after the
 * scheduled payment has been split.
 */
import {
  MAX_MONTHS,
  ceilCents,
  monthlyRate,
  requireNonNegative,
  requirePositive,
  roundCents,
} from "./money";

export interface OneTimeExtra {
  /** 1-based payment number the lump sum lands on. */
  month: number;
  amount: number;
}

export interface ScheduleInput {
  /** Balance owed today. */
  principal: number;
  annualRatePct: number;
  /**
   * Scheduled payment (principal and interest only — no escrow). Omit to
   * derive it from `termMonths`.
   */
  payment?: number;
  /**
   * Remaining term. Used to derive `payment` when that is omitted; ignored
   * when a payment is supplied, since the payment then determines the term.
   */
  termMonths?: number;
  /** Extra principal added to every payment. */
  extraMonthly?: number;
  oneTimeExtras?: OneTimeExtra[];
}

export interface ScheduleRow {
  /** 1-based payment number. */
  month: number;
  startingBalance: number;
  /** Scheduled payment actually made — smaller than usual on the final month. */
  payment: number;
  interest: number;
  /** Principal from the scheduled payment, excluding `extra`. */
  principal: number;
  /** Extra principal applied this month. */
  extra: number;
  endingBalance: number;
  cumulativeInterest: number;
  cumulativePrincipal: number;
}

export interface Schedule {
  /** The scheduled payment, before any extra principal. */
  payment: number;
  rows: ScheduleRow[];
  monthsToPayoff: number;
  totalInterest: number;
  /** Every dollar paid, including extra principal. */
  totalPaid: number;
  totalExtra: number;
}

/**
 * Thrown when a payment cannot retire the balance: the interest charge meets or
 * exceeds the payment, so the balance never falls.
 *
 * A distinct class because the UI has something useful to say about this case
 * ("your payment doesn't cover the interest") and nothing useful to say about a
 * generic error.
 */
export class NonAmortizingError extends Error {
  constructor(
    message: string,
    readonly payment: number,
    readonly monthlyInterest: number
  ) {
    super(message);
    this.name = "NonAmortizingError";
  }
}

/**
 * The level payment that retires `principal` over `termMonths`.
 *
 * M = P · i / (1 − (1 + i)^−n), degenerating to P / n at zero interest.
 *
 * Rounded **up** to the cent, per `ceilCents` — rounding to nearest leaves a
 * residual that pushes the loan past its stated term.
 */
export function paymentFor(
  principal: number,
  annualRatePct: number,
  termMonths: number
): number {
  requireNonNegative(principal, "principal");
  requireNonNegative(annualRatePct, "annualRatePct");
  requirePositive(termMonths, "termMonths");
  if (principal === 0) return 0;

  const i = monthlyRate(annualRatePct);
  if (i === 0) return ceilCents(principal / termMonths);
  return ceilCents((principal * i) / (1 - Math.pow(1 + i, -termMonths)));
}

/**
 * How many payments of `payment` retire `principal` — the inverse of
 * `paymentFor`, rounded up because a partial month is still a payment.
 *
 * n = −ln(1 − P·i / M) / ln(1 + i)
 */
export function termForPayment(
  principal: number,
  annualRatePct: number,
  payment: number
): number {
  requireNonNegative(principal, "principal");
  requireNonNegative(annualRatePct, "annualRatePct");
  requirePositive(payment, "payment");
  if (principal === 0) return 0;

  const i = monthlyRate(annualRatePct);
  if (i === 0) return Math.ceil(principal / payment);

  const monthlyInterest = roundCents(principal * i);
  if (payment <= monthlyInterest) {
    throw new NonAmortizingError(
      `A payment of ${payment} never retires ${principal} at ${annualRatePct}% — ` +
        `the first month's interest alone is ${monthlyInterest}.`,
      payment,
      monthlyInterest
    );
  }
  return Math.ceil(-Math.log(1 - (principal * i) / payment) / Math.log(1 + i));
}

/**
 * Build the full month-by-month schedule.
 *
 * Extra principal is applied after the scheduled payment is split, and is
 * capped at the balance so the last month never overpays.
 */
export function buildSchedule(input: ScheduleInput): Schedule {
  const principal = requireNonNegative(input.principal, "principal");
  const annualRatePct = requireNonNegative(input.annualRatePct, "annualRatePct");
  const extraMonthly = requireNonNegative(input.extraMonthly ?? 0, "extraMonthly");

  if (input.payment === undefined && input.termMonths === undefined) {
    throw new RangeError("buildSchedule needs either a payment or a termMonths");
  }

  const payment =
    input.payment !== undefined
      ? requirePositive(input.payment, "payment")
      : paymentFor(principal, annualRatePct, input.termMonths!);

  if (principal === 0) {
    return {
      payment,
      rows: [],
      monthsToPayoff: 0,
      totalInterest: 0,
      totalPaid: 0,
      totalExtra: 0,
    };
  }

  const lumpSums = new Map<number, number>();
  for (const extra of input.oneTimeExtras ?? []) {
    requirePositive(extra.month, "oneTimeExtras[].month");
    requireNonNegative(extra.amount, "oneTimeExtras[].amount");
    lumpSums.set(extra.month, (lumpSums.get(extra.month) ?? 0) + extra.amount);
  }

  // The month the note matures. Interest is rounded to the cent 360 times, and
  // those roundings do not have to net out against the fraction of a cent the
  // payment was rounded up by — so the balance at maturity can be a few cents
  // either side of zero. Left alone that surfaces as an absurd extra payment of
  // $0.01 in month 361. Every note covers this with "the final payment will be
  // the remaining unpaid balance", and so does the schedule below.
  const maturityMonth = input.termMonths ?? impliedTerm(principal, annualRatePct, payment);

  const i = monthlyRate(annualRatePct);
  const rows: ScheduleRow[] = [];

  let balance = roundCents(principal);
  let cumulativeInterest = 0;
  let cumulativePrincipal = 0;
  let totalExtra = 0;
  let totalPaid = 0;

  for (let month = 1; balance > 0; month++) {
    const startingBalance = balance;
    const interest = roundCents(startingBalance * i);

    // Only the scheduled payment has to clear the interest. A payment that
    // cannot is a real input someone can type — an interest-only loan, or a
    // balance that has grown — and the schedule below would run to the cap
    // producing nonsense, so refuse it by name instead.
    if (payment <= interest && extraMonthly === 0 && !lumpSums.has(month)) {
      throw new NonAmortizingError(
        `Payment of ${payment} does not cover month ${month}'s interest of ${interest} — ` +
          `the balance would never fall.`,
        payment,
        interest
      );
    }

    // The last payment is only what is left owing — and at maturity it absorbs
    // any rounding residual, so long as that residual is under one instalment.
    // A shortfall bigger than a whole payment is not rounding, it is a payment
    // that does not amortise the loan, and that must not be papered over.
    const payoffAmount = roundCents(startingBalance + interest);
    const scheduled =
      payoffAmount <= payment ||
      (month === maturityMonth && payoffAmount <= payment * 2)
        ? payoffAmount
        : payment;
    const principalPart = roundCents(scheduled - interest);

    const afterScheduled = roundCents(startingBalance - principalPart);
    const wantedExtra = roundCents(extraMonthly + (lumpSums.get(month) ?? 0));
    const extra = Math.min(wantedExtra, afterScheduled);

    balance = roundCents(afterScheduled - extra);
    cumulativeInterest = roundCents(cumulativeInterest + interest);
    cumulativePrincipal = roundCents(cumulativePrincipal + principalPart + extra);
    totalExtra = roundCents(totalExtra + extra);
    totalPaid = roundCents(totalPaid + scheduled + extra);

    rows.push({
      month,
      startingBalance,
      payment: scheduled,
      interest,
      principal: principalPart,
      extra,
      endingBalance: balance,
      cumulativeInterest,
      cumulativePrincipal,
    });

    if (month >= MAX_MONTHS) {
      throw new NonAmortizingError(
        `Balance still ${balance} after ${MAX_MONTHS} payments of ${payment}.`,
        payment,
        interest
      );
    }
  }

  return {
    payment,
    rows,
    monthsToPayoff: rows.length,
    totalInterest: cumulativeInterest,
    totalPaid,
    totalExtra,
  };
}

/**
 * The maturity a payment implies, when the caller supplied a payment instead of
 * a term. Returns undefined for a payment that never amortises — the schedule
 * loop reports that itself, with the month it happened on.
 */
function impliedTerm(
  principal: number,
  annualRatePct: number,
  payment: number
): number | undefined {
  try {
    return termForPayment(principal, annualRatePct, payment);
  } catch {
    return undefined;
  }
}

export interface PrepaymentComparison {
  baseline: Schedule;
  accelerated: Schedule;
  monthsSaved: number;
  interestSaved: number;
  /** Total extra principal put in to buy those savings. */
  extraPaid: number;
  /**
   * Interest saved per dollar of extra principal. 0.42 means every extra $1
   * avoided 42¢ of interest — the number that makes prepayment comparable to
   * an investment return, rather than just a big-sounding total.
   */
  savedPerExtraDollar: number;
}

/**
 * What extra principal buys, against the same loan without it.
 */
export function comparePrepayment(
  base: ScheduleInput,
  extra: { extraMonthly?: number; oneTimeExtras?: OneTimeExtra[] }
): PrepaymentComparison {
  const baseline = buildSchedule({
    ...base,
    extraMonthly: 0,
    oneTimeExtras: [],
  });
  const accelerated = buildSchedule({
    ...base,
    // The baseline derives its payment from the term; reuse that exact payment
    // so the comparison isolates the extra principal and nothing else.
    payment: baseline.payment,
    extraMonthly: extra.extraMonthly ?? 0,
    oneTimeExtras: extra.oneTimeExtras ?? [],
  });

  const interestSaved = roundCents(
    baseline.totalInterest - accelerated.totalInterest
  );
  const extraPaid = accelerated.totalExtra;

  return {
    baseline,
    accelerated,
    monthsSaved: baseline.monthsToPayoff - accelerated.monthsToPayoff,
    interestSaved,
    extraPaid,
    savedPerExtraDollar: extraPaid > 0 ? interestSaved / extraPaid : 0,
  };
}

/**
 * The first month the balance is at or below `targetBalance`, or null if the
 * schedule ends without reaching it. 1-based, matching `ScheduleRow.month`.
 */
export function monthBalanceReaches(
  schedule: Schedule,
  targetBalance: number
): number | null {
  for (const row of schedule.rows) {
    if (row.endingBalance <= targetBalance) return row.month;
  }
  return null;
}
