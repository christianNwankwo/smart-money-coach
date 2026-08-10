/**
 * PITI — principal, interest, taxes and insurance — plus PMI.
 *
 * The PMI rules here are the US Homeowners Protection Act (1998), which governs
 * borrower-paid PMI on a single-family primary residence. Three dates matter and
 * most calculators only model the first:
 *
 *   1. **Requestable at 80% LTV.** The borrower may ask for cancellation; the
 *      servicer may require a current appraisal and a clean payment record. It
 *      does not happen automatically, which is why so many people overpay.
 *   2. **Automatic at 78% LTV.** The servicer must drop it — but the date is
 *      fixed by the *original amortisation schedule* against the *original*
 *      value. Extra principal does not move it. That is counter-intuitive
 *      enough that modelling it off the actual balance is the standard bug.
 *   3. **Midpoint termination.** If PMI is somehow still being charged at the
 *      halfway point of the amortisation schedule, it must end regardless of
 *      LTV. This is what protects borrowers on long or slow-amortising loans.
 *
 * The requestable date is the one worth acting on, so it is reported separately
 * rather than folded into the automatic date.
 *
 * FHA mortgage insurance follows different rules entirely and is not modelled.
 */
import { buildSchedule, paymentFor } from "./amortization";
import { requireNonNegative, requirePositive, roundCents } from "./money";

export interface PitiInput {
  homePrice: number;
  downPayment: number;
  annualRatePct: number;
  termMonths: number;
  /** Annual property tax in dollars. */
  annualPropertyTax: number;
  /** Annual hazard/homeowners premium in dollars. */
  annualHomeInsurance: number;
  monthlyHoa?: number;
  /**
   * Annual PMI premium as a percent of the original loan amount — the form
   * lenders quote (0.3–1.5% is the usual range). Omit or zero for no PMI.
   */
  pmiAnnualRatePct?: number;
  /**
   * Value PMI is measured against. Defaults to the purchase price; the rules
   * use the lesser of price and appraised value at origination.
   */
  originalValue?: number;
}

export interface PitiResult {
  loanAmount: number;
  /** Loan-to-value at origination, as a percent. */
  ltvPct: number;

  principalAndInterest: number;
  propertyTax: number;
  homeInsurance: number;
  hoa: number;
  /** Monthly PMI premium while it is charged. */
  pmi: number;

  /** Everything, while PMI is still being charged. */
  monthlyTotal: number;
  /** Everything, once PMI drops off. */
  monthlyTotalAfterPmi: number;

  pmiRequired: boolean;
  /** First month the borrower may request cancellation (80% LTV). */
  pmiRequestableMonth: number | null;
  /** First month the servicer must cancel automatically (78% LTV). */
  pmiAutomaticMonth: number | null;
  /** Halfway through the amortisation schedule — the backstop cancellation. */
  pmiMidpointMonth: number;
  /** When PMI actually ends without the borrower doing anything. */
  pmiEndsMonth: number | null;
  /** Total PMI paid if the borrower never asks. */
  totalPmiPaid: number;
  /** PMI avoided by requesting cancellation at 80% instead of waiting. */
  pmiSavedByRequesting: number;
}

export function computePiti(input: PitiInput): PitiResult {
  const homePrice = requirePositive(input.homePrice, "homePrice");
  const downPayment = requireNonNegative(input.downPayment, "downPayment");
  const annualRatePct = requireNonNegative(input.annualRatePct, "annualRatePct");
  const termMonths = requirePositive(input.termMonths, "termMonths");
  const annualPropertyTax = requireNonNegative(
    input.annualPropertyTax,
    "annualPropertyTax"
  );
  const annualHomeInsurance = requireNonNegative(
    input.annualHomeInsurance,
    "annualHomeInsurance"
  );
  const monthlyHoa = requireNonNegative(input.monthlyHoa ?? 0, "monthlyHoa");
  const pmiAnnualRatePct = requireNonNegative(
    input.pmiAnnualRatePct ?? 0,
    "pmiAnnualRatePct"
  );

  if (downPayment >= homePrice) {
    throw new RangeError("downPayment must be less than homePrice");
  }

  const originalValue = requirePositive(
    input.originalValue ?? homePrice,
    "originalValue"
  );
  const loanAmount = roundCents(homePrice - downPayment);
  const ltvPct = (loanAmount / originalValue) * 100;

  const principalAndInterest = paymentFor(loanAmount, annualRatePct, termMonths);
  const propertyTax = roundCents(annualPropertyTax / 12);
  const homeInsurance = roundCents(annualHomeInsurance / 12);
  const hoa = roundCents(monthlyHoa);

  // PMI is only required above 80% LTV at origination.
  const pmiRequired = pmiAnnualRatePct > 0 && ltvPct > 80;
  const pmi = pmiRequired
    ? roundCents((loanAmount * (pmiAnnualRatePct / 100)) / 12)
    : 0;

  // Both cancellation thresholds are read off the ORIGINAL schedule — no extra
  // principal — because that is what the statute keys on.
  const scheduled = buildSchedule({
    principal: loanAmount,
    annualRatePct,
    termMonths,
  });
  const firstMonthAtOrBelow = (thresholdPct: number): number | null => {
    const target = originalValue * (thresholdPct / 100);
    for (const row of scheduled.rows) {
      if (row.endingBalance <= target) return row.month;
    }
    return null;
  };

  const pmiRequestableMonth = pmiRequired ? firstMonthAtOrBelow(80) : null;
  const pmiAutomaticMonth = pmiRequired ? firstMonthAtOrBelow(78) : null;
  const pmiMidpointMonth = Math.ceil(termMonths / 2);

  const pmiEndsMonth = pmiRequired
    ? Math.min(pmiAutomaticMonth ?? pmiMidpointMonth, pmiMidpointMonth)
    : null;

  // PMI is charged for the months before cancellation takes effect.
  const monthsCharged = pmiEndsMonth ?? 0;
  const totalPmiPaid = roundCents(pmi * monthsCharged);
  const monthsIfRequested = pmiRequestableMonth
    ? Math.min(pmiRequestableMonth, pmiMidpointMonth)
    : monthsCharged;
  const pmiSavedByRequesting = roundCents(
    pmi * Math.max(0, monthsCharged - monthsIfRequested)
  );

  const withoutPmi = roundCents(
    principalAndInterest + propertyTax + homeInsurance + hoa
  );

  return {
    loanAmount,
    ltvPct: Math.round(ltvPct * 100) / 100,
    principalAndInterest,
    propertyTax,
    homeInsurance,
    hoa,
    pmi,
    monthlyTotal: roundCents(withoutPmi + pmi),
    monthlyTotalAfterPmi: withoutPmi,
    pmiRequired,
    pmiRequestableMonth,
    pmiAutomaticMonth,
    pmiMidpointMonth,
    pmiEndsMonth,
    totalPmiPaid,
    pmiSavedByRequesting,
  };
}

/**
 * The share of gross monthly income this housing payment consumes — the
 * front-end ratio underwriters use. 28% is the conventional comfort line.
 */
export function frontEndRatio(
  monthlyHousingPayment: number,
  annualGrossIncome: number
): number {
  if (annualGrossIncome <= 0) return Infinity;
  return monthlyHousingPayment / (annualGrossIncome / 12);
}

/**
 * The back-end (total debt-to-income) ratio: housing plus every other monthly
 * debt payment. Conventional underwriting generally stops at 43–50%.
 */
export function backEndRatio(
  monthlyHousingPayment: number,
  otherMonthlyDebtPayments: number,
  annualGrossIncome: number
): number {
  if (annualGrossIncome <= 0) return Infinity;
  return (
    (monthlyHousingPayment + otherMonthlyDebtPayments) / (annualGrossIncome / 12)
  );
}
