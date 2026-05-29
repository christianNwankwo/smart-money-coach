import type { FinancialProfile, RecommendationResult } from "@/types/financial";

const HIGH_MORTGAGE_RATE = 6.5;
const LOW_RETIREMENT_PCT = 12;
const STABLE_RETIREMENT_PCT = 15;
const HIGH_DEBT_RATIO = 0.3;
const HIGH_DEBT_ABSOLUTE = 50_000;

export function generateRecommendation(
  profile: FinancialProfile
): RecommendationResult {
  const effectiveRetirement =
    profile.retirementContributionPct + profile.employerMatchPct;
  const debtToIncome =
    profile.householdIncome > 0
      ? profile.otherDebt / profile.householdIncome
      : 1;
  const monthlyIncome = profile.householdIncome / 12;
  const emergencyTarget = monthlyIncome * 6;

  const mortgageRateHigh = profile.mortgageInterestRate >= HIGH_MORTGAGE_RATE;
  const retirementLow = effectiveRetirement < LOW_RETIREMENT_PCT;
  const highDebt =
    debtToIncome >= HIGH_DEBT_RATIO || profile.otherDebt >= HIGH_DEBT_ABSOLUTE;
  const highSavings = profile.savingsAmount >= emergencyTarget;
  const stableRetirement = effectiveRetirement >= STABLE_RETIREMENT_PCT;

  const priorities: { label: string; score: number; reason: string }[] = [
    {
      label: "Pay down high-interest debt",
      score: highDebt ? 100 : profile.otherDebt > 0 ? 40 : 10,
      reason: "Non-mortgage debt is weighing on cash flow",
    },
    {
      label: "Boost retirement contributions",
      score: retirementLow ? 90 : stableRetirement ? 20 : 50,
      reason: "Retirement savings rate drives long-term security",
    },
    {
      label: "Extra mortgage principal payments",
      score:
        mortgageRateHigh && !highDebt
          ? 75
          : profile.mortgageBalance > 0
            ? 35
            : 5,
      reason: "Mortgage rate affects whether prepaying beats investing",
    },
    {
      label: "Build or maintain emergency fund",
      score: highSavings ? 15 : 80,
      reason: "Liquid savings protect against income shocks",
    },
    {
      label: "Invest for growth (taxable/brokerage)",
      score:
        highSavings && stableRetirement && !highDebt
          ? 85
          : profile.riskTolerance === "high"
            ? 55
            : 30,
      reason: "Surplus cash after basics can compound in markets",
    },
    {
      label: "Refinance or rate-shop mortgage",
      score: mortgageRateHigh ? 70 : 10,
      reason: "A lower rate may free monthly cash without extra risk",
    },
  ];

  priorities.sort((a, b) => b.score - a.score);
  const priorityOrder = priorities.map((p) => p.label);

  let recommendation: string;
  let why: string;
  let nextActions: string[];

  if (highDebt) {
    recommendation =
      "Focus on debt reduction before aggressive investing or extra mortgage prepayments.";
    why = `Other debt is ${formatPercent(debtToIncome * 100)} of household income ($${formatMoney(profile.otherDebt)}). Paying this down improves cash flow and reduces risk faster than market returns in the short term.`;
    nextActions = [
      "List debts by interest rate and pay minimums on all except the highest-rate balance.",
      "Redirect any windfalls or bonus income toward the highest-rate debt until ratio is under 20% of income.",
      "Pause new discretionary investing until non-mortgage debt is manageable.",
    ];
  } else if (mortgageRateHigh && retirementLow) {
    recommendation =
      "Balance mortgage payoff with retirement — your rate is high while retirement savings are behind.";
    why = `Mortgage rate is ${profile.mortgageInterestRate}% (above ${HIGH_MORTGAGE_RATE}%) but total retirement savings rate is only ${effectiveRetirement}% (target ${STABLE_RETIREMENT_PCT}%+). Split extra dollars between rate reduction and tax-advantaged growth.`;
    nextActions = [
      "Increase 401(k)/IRA contributions by 1–2% of pay this quarter, at least to capture full employer match.",
      "Apply one extra mortgage payment per year or round up monthly payments if cash flow allows.",
      "Compare refinance quotes — a lower rate may beat extra principal at today's payment level.",
    ];
  } else if (highSavings && stableRetirement) {
    const aggressiveness =
      profile.riskTolerance === "high"
        ? "aggressively"
        : profile.riskTolerance === "medium"
          ? "with a balanced portfolio"
          : "conservatively";
    recommendation = `Invest surplus savings more ${aggressiveness} — your foundation is solid.`;
    why = `Savings ($${formatMoney(profile.savingsAmount)}) cover roughly ${Math.round(profile.savingsAmount / Math.max(monthlyIncome, 1))} months of income, and retirement savings (${effectiveRetirement}%) are on track. Markets can work harder for long-term goals like "${truncateGoal(profile.financialGoal)}".`;
    nextActions = [
      "Open or max out annual IRA/HSA contributions if not already done.",
      "Automate monthly transfers to a diversified index fund portfolio aligned with risk tolerance.",
      "Review asset allocation annually; rebalance when any sleeve drifts more than 5% from target.",
    ];
  } else if (retirementLow) {
    recommendation =
      "Prioritize catching up on retirement contributions before discretionary investing.";
    why = `At age ${profile.age}, compounding favors earlier contributions. Current rate (${effectiveRetirement}%) is below the ${STABLE_RETIREMENT_PCT}% stability threshold.`;
    nextActions = [
      "Raise payroll deferral by 1% now; schedule another 1% increase in six months.",
      "Confirm you receive the full employer match (${profile.employerMatchPct}% available).",
      "Use catch-up contributions if age 50+ and accounts allow.",
    ];
  } else if (mortgageRateHigh) {
    recommendation =
      "Consider accelerating mortgage payoff or refinancing while rates remain elevated.";
    why = `Your ${profile.mortgageInterestRate}% mortgage costs more than typical long-term market averages after tax adjustments. Balance ${formatMoney(profile.mortgageBalance)} remaining against investment opportunities.`;
    nextActions = [
      "Request refinance scenarios from two lenders; compare break-even months vs staying put.",
      "If staying, add principal to one payment per quarter.",
      "Keep retirement contributions at least at match level while prepaying.",
    ];
  } else {
    recommendation =
      "Stay the course with a balanced plan — strengthen weak spots incrementally.";
    why = `Debt, savings, and retirement metrics are moderate. Goal: "${truncateGoal(profile.financialGoal)}". Small, consistent moves beat timing the market.`;
    nextActions = [
      "Automate retirement and savings transfers on payday.",
      "Review insurance and estate basics (beneficiaries, term life if dependents).",
      "Revisit this plan when income, rates, or goals change materially.",
    ];
  }

  return {
    recommendation,
    why,
    priorityOrder,
    nextActions,
  };
}

function formatMoney(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function formatPercent(n: number): string {
  return `${n.toFixed(0)}%`;
}

function truncateGoal(goal: string, max = 60): string {
  const trimmed = goal.trim();
  if (trimmed.length <= max) return trimmed || "your stated goal";
  return `${trimmed.slice(0, max)}…`;
}
