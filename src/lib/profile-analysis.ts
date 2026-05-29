import type { FinancialProfile, RiskTolerance } from "@/types/financial";

export type SavingsAdequacy =
  | "critical"
  | "thin"
  | "adequate"
  | "strong"
  | "excellent";
export type DebtBurden = "heavy" | "moderate" | "light" | "none";
export type RetirementStatus = "behind" | "building" | "on-track" | "strong";
export type IncomeTier = "modest" | "middle" | "upper-middle" | "high";
export type LifeStage =
  | "early-career"
  | "mid-career"
  | "pre-retirement"
  | "near-retirement";
export type MortgageOutlook = "costly" | "moderate" | "favorable" | "none";
export type PrimaryFocus =
  | "emergency-fund"
  | "debt-paydown"
  | "retirement-catch-up"
  | "mortgage-optimization"
  | "goal-acceleration"
  | "wealth-building"
  | "stability-first";

export type GoalTheme =
  | "retirement"
  | "mortgage-free"
  | "debt-free"
  | "investing"
  | "security"
  | "major-purchase"
  | "general";

export interface ProfileAnalysis {
  profile: FinancialProfile;
  effectiveRetirement: number;
  ownContribution: number;
  employerMatch: number;
  debtToIncome: number;
  savingsMonths: number;
  emergencyTarget: number;
  savingsGap: number;
  savingsAdequacy: SavingsAdequacy;
  debtBurden: DebtBurden;
  retirementStatus: RetirementStatus;
  incomeTier: IncomeTier;
  lifeStage: LifeStage;
  mortgageOutlook: MortgageOutlook;
  mortgageToIncome: number;
  housingPaymentRatio: number;
  yearsToRetirement: number;
  goalThemes: GoalTheme[];
  goalPhrase: string;
  primaryFocus: PrimaryFocus;
  secondaryFocus: PrimaryFocus | null;
  matchUncaptured: boolean;
  hasMortgage: boolean;
  surplusCapacity: "tight" | "moderate" | "comfortable";
  investReadiness: "not-yet" | "cautious" | "ready" | "aggressive";
}

export function analyzeProfile(profile: FinancialProfile): ProfileAnalysis {
  const effectiveRetirement =
    profile.retirementContributionPct + profile.employerMatchPct;
  const ownContribution = profile.retirementContributionPct;
  const employerMatch = profile.employerMatchPct;
  const monthlyIncome = Math.max(profile.householdIncome / 12, 1);
  const emergencyTarget = monthlyIncome * 6;
  const savingsMonths = profile.savingsAmount / monthlyIncome;
  const savingsGap = Math.max(0, emergencyTarget - profile.savingsAmount);
  const debtToIncome =
    profile.householdIncome > 0
      ? profile.otherDebt / profile.householdIncome
      : 1;
  const hasMortgage = profile.mortgageBalance > 0;
  const mortgageToIncome = hasMortgage
    ? profile.mortgageBalance / profile.householdIncome
    : 0;
  const housingPaymentRatio =
    (profile.monthlyMortgagePayment * 12) / Math.max(profile.householdIncome, 1);
  const yearsToRetirement = Math.max(0, 65 - profile.age);
  const goalThemes = detectGoalThemes(profile.financialGoal);
  const goalPhrase = formatGoalPhrase(profile.financialGoal, goalThemes);

  const savingsAdequacy = classifySavings(
    savingsMonths,
    profile.savingsAmount,
    emergencyTarget
  );
  const debtBurden = classifyDebt(debtToIncome, profile.otherDebt);
  const retirementStatus = classifyRetirement(
    effectiveRetirement,
    ownContribution,
    profile.age
  );
  const incomeTier = classifyIncome(profile.householdIncome);
  const lifeStage = classifyLifeStage(profile.age);
  const mortgageOutlook = classifyMortgage(
    profile.mortgageInterestRate,
    hasMortgage
  );
  const matchUncaptured =
    employerMatch > 0 && ownContribution < employerMatch * 0.9;
  const surplusCapacity = classifySurplus(
    housingPaymentRatio,
    debtToIncome,
    savingsAdequacy
  );
  const investReadiness = classifyInvestReadiness(
    savingsAdequacy,
    debtBurden,
    retirementStatus,
    profile.riskTolerance
  );

  const { primaryFocus, secondaryFocus } = determineFocus({
    savingsAdequacy,
    debtBurden,
    retirementStatus,
    mortgageOutlook,
    hasMortgage,
    goalThemes,
    matchUncaptured,
    investReadiness,
    profile,
  });

  return {
    profile,
    effectiveRetirement,
    ownContribution,
    employerMatch,
    debtToIncome,
    savingsMonths,
    emergencyTarget,
    savingsGap,
    savingsAdequacy,
    debtBurden,
    retirementStatus,
    incomeTier,
    lifeStage,
    mortgageOutlook,
    mortgageToIncome,
    housingPaymentRatio,
    yearsToRetirement,
    goalThemes,
    goalPhrase,
    primaryFocus,
    secondaryFocus,
    matchUncaptured,
    hasMortgage,
    surplusCapacity,
    investReadiness,
  };
}

function classifySavings(
  months: number,
  amount: number,
  target: number
): SavingsAdequacy {
  if (amount < 1000 || months < 1) return "critical";
  if (months < 3) return "thin";
  if (months < 6 || amount < target * 0.85) return "adequate";
  if (months < 12) return "strong";
  return "excellent";
}

function classifyDebt(ratio: number, absolute: number): DebtBurden {
  if (absolute <= 0) return "none";
  if (ratio >= 0.35 || absolute >= 75_000) return "heavy";
  if (ratio >= 0.15 || absolute >= 15_000) return "moderate";
  return "light";
}

function classifyRetirement(
  total: number,
  own: number,
  age: number
): RetirementStatus {
  const target =
    age < 35 ? 12 : age < 45 ? 15 : age < 55 ? 18 : 20;
  if (total < target - 4) return "behind";
  if (total < target) return "building";
  if (total < target + 6) return "on-track";
  return "strong";
}

function classifyIncome(income: number): IncomeTier {
  if (income < 60_000) return "modest";
  if (income < 120_000) return "middle";
  if (income < 250_000) return "upper-middle";
  return "high";
}

function classifyLifeStage(age: number): LifeStage {
  if (age < 35) return "early-career";
  if (age < 50) return "mid-career";
  if (age < 60) return "pre-retirement";
  return "near-retirement";
}

function classifyMortgage(rate: number, hasMortgage: boolean): MortgageOutlook {
  if (!hasMortgage) return "none";
  if (rate >= 7) return "costly";
  if (rate >= 5.5) return "moderate";
  return "favorable";
}

function classifySurplus(
  housingRatio: number,
  debtRatio: number,
  savings: SavingsAdequacy
): "tight" | "moderate" | "comfortable" {
  if (
    housingRatio > 0.35 ||
    debtRatio > 0.25 ||
    savings === "critical" ||
    savings === "thin"
  ) {
    return "tight";
  }
  if (housingRatio > 0.28 || debtRatio > 0.12) return "moderate";
  return "comfortable";
}

function classifyInvestReadiness(
  savings: SavingsAdequacy,
  debt: DebtBurden,
  retirement: RetirementStatus,
  risk: RiskTolerance
): "not-yet" | "cautious" | "ready" | "aggressive" {
  if (savings === "critical" || savings === "thin" || debt === "heavy") {
    return "not-yet";
  }
  if (
    debt === "moderate" ||
    retirement === "behind" ||
    savings === "adequate"
  ) {
    return "cautious";
  }
  if (
    (savings === "strong" || savings === "excellent") &&
    (retirement === "on-track" || retirement === "strong")
  ) {
    return risk === "high" ? "aggressive" : "ready";
  }
  return "cautious";
}

function detectGoalThemes(goal: string): GoalTheme[] {
  const g = goal.toLowerCase();
  const themes: GoalTheme[] = [];
  if (/retire|retirement|fire|financial independence/.test(g))
    themes.push("retirement");
  if (/mortgage|home|house|pay off.*home|own my home/.test(g))
    themes.push("mortgage-free");
  if (/debt|loan|credit card|pay off/.test(g)) themes.push("debt-free");
  if (/invest|wealth|grow|stock|portfolio|passive/.test(g))
    themes.push("investing");
  if (/emergency|safety|security|stable|buffer/.test(g))
    themes.push("security");
  if (/college|education|wedding|car|vacation|buy/.test(g))
    themes.push("major-purchase");
  if (themes.length === 0) themes.push("general");
  return themes;
}

function formatGoalPhrase(goal: string, themes: GoalTheme[]): string {
  const trimmed = goal.trim();
  if (trimmed) return `"${trimmed}"`;
  const fallback: Record<GoalTheme, string> = {
    retirement: "building long-term retirement security",
    "mortgage-free": "becoming mortgage-free",
    "debt-free": "eliminating non-mortgage debt",
    investing: "growing invested wealth",
    security: "strengthening financial safety nets",
    "major-purchase": "funding an upcoming major expense",
    general: "improving your overall financial position",
  };
  return fallback[themes[0]];
}

function determineFocus(ctx: {
  savingsAdequacy: SavingsAdequacy;
  debtBurden: DebtBurden;
  retirementStatus: RetirementStatus;
  mortgageOutlook: MortgageOutlook;
  hasMortgage: boolean;
  goalThemes: GoalTheme[];
  matchUncaptured: boolean;
  investReadiness: ProfileAnalysis["investReadiness"];
  profile: FinancialProfile;
}): { primaryFocus: PrimaryFocus; secondaryFocus: PrimaryFocus | null } {
  const scores: Record<PrimaryFocus, number> = {
    "emergency-fund": 0,
    "debt-paydown": 0,
    "retirement-catch-up": 0,
    "mortgage-optimization": 0,
    "goal-acceleration": 0,
    "wealth-building": 0,
    "stability-first": 0,
  };

  if (ctx.savingsAdequacy === "critical") scores["emergency-fund"] += 100;
  else if (ctx.savingsAdequacy === "thin") scores["emergency-fund"] += 75;
  else if (ctx.savingsAdequacy === "adequate") scores["emergency-fund"] += 35;

  if (ctx.debtBurden === "heavy") scores["debt-paydown"] += 95;
  else if (ctx.debtBurden === "moderate") scores["debt-paydown"] += 55;
  else if (ctx.debtBurden === "light") scores["debt-paydown"] += 20;

  if (ctx.retirementStatus === "behind") scores["retirement-catch-up"] += 85;
  else if (ctx.retirementStatus === "building")
    scores["retirement-catch-up"] += 45;
  if (ctx.matchUncaptured) scores["retirement-catch-up"] += 40;

  if (ctx.mortgageOutlook === "costly" && ctx.hasMortgage)
    scores["mortgage-optimization"] += 70;
  else if (ctx.mortgageOutlook === "moderate" && ctx.hasMortgage)
    scores["mortgage-optimization"] += 40;

  if (ctx.goalThemes.includes("mortgage-free"))
    scores["goal-acceleration"] += 50;
  if (ctx.goalThemes.includes("retirement"))
    scores["goal-acceleration"] += 45;
  if (ctx.goalThemes.includes("debt-free")) scores["debt-paydown"] += 25;

  if (ctx.investReadiness === "aggressive") scores["wealth-building"] += 80;
  else if (ctx.investReadiness === "ready") scores["wealth-building"] += 60;
  else if (ctx.investReadiness === "cautious") scores["wealth-building"] += 25;

  if (
    ctx.savingsAdequacy === "strong" &&
    ctx.debtBurden !== "heavy" &&
    ctx.retirementStatus !== "behind"
  ) {
    scores["stability-first"] += 30;
  }

  const ranked = (Object.entries(scores) as [PrimaryFocus, number][]).sort(
    (a, b) => b[1] - a[1]
  );
  const primaryFocus = ranked[0][1] > 0 ? ranked[0][0] : "stability-first";
  const secondaryFocus =
    ranked[1][1] >= ranked[0][1] * 0.55 ? ranked[1][0] : null;

  return { primaryFocus, secondaryFocus };
}

export function savingsAdequacyLabel(a: SavingsAdequacy): string {
  const map: Record<SavingsAdequacy, string> = {
    critical: "well below a safe cushion",
    thin: "below the 3–6 month target",
    adequate: "approaching a solid emergency buffer",
    strong: "in a healthy range for emergencies",
    excellent: "well-funded for shocks and opportunities",
  };
  return map[a];
}

export function focusAreaLabel(f: PrimaryFocus): string {
  const map: Record<PrimaryFocus, string> = {
    "emergency-fund": "Build your safety net",
    "debt-paydown": "Reduce debt pressure",
    "retirement-catch-up": "Strengthen retirement savings",
    "mortgage-optimization": "Optimize your mortgage",
    "goal-acceleration": "Accelerate your stated goal",
    "wealth-building": "Grow long-term wealth",
    "stability-first": "Protect and steady your finances",
  };
  return map[f];
}

export function riskTone(risk: RiskTolerance): string {
  if (risk === "low")
    return "You prefer stability, so any market exposure should stay diversified and gradual.";
  if (risk === "high")
    return "You're comfortable with volatility, but that doesn't remove the need for liquidity and matched retirement savings first.";
  return "A balanced mix of safety and growth fits your stated risk comfort.";
}
