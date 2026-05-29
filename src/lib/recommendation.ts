import {
  analyzeProfile,
  focusAreaLabel,
  riskTone,
  savingsAdequacyLabel,
  type ProfileAnalysis,
  type PrimaryFocus,
} from "@/lib/profile-analysis";
import type { FinancialProfile, RecommendationResult } from "@/types/financial";

export function generateRecommendation(
  profile: FinancialProfile
): RecommendationResult {
  const a = analyzeProfile(profile);

  const summary = buildSummary(a);
  const personalizedWhy = buildPersonalizedWhy(a);
  const suggestedStrategy = buildStrategy(a);
  const risksAndTradeoffs = buildRisks(a);
  const nextActions = buildNextActions(a);

  return {
    summary,
    personalizedWhy,
    suggestedStrategy,
    risksAndTradeoffs,
    nextActions,
    focusArea: focusAreaLabel(a.primaryFocus),
  };
}

function buildSummary(a: ProfileAnalysis): string {
  const p = a.profile;
  const opener = ageOpener(a);
  const core = primaryFocusSummary(a);
  const goalTie = goalConnection(a);

  return `${opener} ${core}${goalTie ? ` ${goalTie}` : ""}`.replace(/\s+/g, " ").trim();
}

function buildPersonalizedWhy(a: ProfileAnalysis): string {
  const p = a.profile;
  const paragraphs: string[] = [];

  paragraphs.push(
    `At ${p.age}, with about ${a.yearsToRetirement} years before a typical retirement window, time is still your biggest asset — but only if dollars are pointed at the right bottlenecks.`
  );

  paragraphs.push(savingsParagraph(a));
  paragraphs.push(debtParagraph(a));
  paragraphs.push(retirementParagraph(a));

  if (a.hasMortgage) {
    paragraphs.push(mortgageParagraph(a));
  }

  paragraphs.push(incomeParagraph(a));
  paragraphs.push(`${riskTone(p.riskTolerance)}`);

  return paragraphs.filter(Boolean).join("\n\n");
}

function buildStrategy(a: ProfileAnalysis): string {
  const phases: string[] = [];
  const p = a.profile;

  phases.push(
    `**Phase 1 (next 90 days):** ${phaseOne(a)}`
  );

  if (a.secondaryFocus && a.secondaryFocus !== a.primaryFocus) {
    phases.push(
      `**Phase 2 (months 4–12):** ${phaseTwo(a)}`
    );
  }

  phases.push(`**Phase 3 (12+ months):** ${phaseThree(a)}`);

  const allocation = allocationGuidance(a);
  if (allocation) {
    phases.push(`**How to split extra dollars:** ${allocation}`);
  }

  return phases.join("\n\n");
}

function buildRisks(a: ProfileAnalysis): string {
  const risks: string[] = [];
  const p = a.profile;

  if (a.savingsAdequacy === "critical" || a.savingsAdequacy === "thin") {
    risks.push(
      `With only about ${formatMonths(a.savingsMonths)} of expenses in cash ($${money(a.profile.savingsAmount)}), a job loss or medical bill could force high-interest borrowing — which would work against ${a.goalPhrase}.`
    );
  }

  if (a.debtBurden === "heavy" || a.debtBurden === "moderate") {
    risks.push(
      `Carrying $${money(p.otherDebt)} in non-mortgage debt (${formatPct(a.debtToIncome * 100)} of income) means more of every paycheck is committed before you can invest or prepay the mortgage.`
    );
  }

  if (a.retirementStatus === "behind") {
    risks.push(
      `Saving only ${formatPct(a.effectiveRetirement)} toward retirement (including match) at age ${p.age} increases the chance you'll need to work longer or cut spending later to reach ${a.goalPhrase}.`
    );
  }

  if (a.mortgageOutlook === "costly" && a.investReadiness !== "not-yet") {
    risks.push(
      `Every dollar invested in the market while holding a ${p.mortgageInterestRate}% mortgage is a tradeoff: long-term returns may win, but the ${p.mortgageInterestRate}% rate is a guaranteed cost until the balance is gone.`
    );
  } else if (a.mortgageOutlook === "favorable" && a.goalThemes.includes("mortgage-free")) {
    risks.push(
      `Aggressively prepaying a ${p.mortgageInterestRate}% mortgage may feel satisfying, but at your rate it may underperform tax-advantaged retirement growth — weigh peace of mind against opportunity cost.`
    );
  }

  if (p.riskTolerance === "high" && a.investReadiness !== "aggressive") {
    risks.push(
      `High risk tolerance can tempt you to invest before the foundation is set; volatility hurts most when you might need to sell savings to cover bills or debt payments.`
    );
  }

  if (p.riskTolerance === "low" && a.investReadiness === "ready") {
    risks.push(
      `Conservative preferences may leave you under-invested for a ${a.yearsToRetirement}-year horizon — too much cash can quietly lose ground to inflation relative to your goal.`
    );
  }

  if (a.matchUncaptured) {
    risks.push(
      `Leaving part of your employer's ${formatPct(a.employerMatch)} match on the table is an immediate pay cut you can't recover later — it's often the highest-return move available.`
    );
  }

  if (a.surplusCapacity === "tight") {
    risks.push(
      `Housing consumes about ${formatPct(a.housingPaymentRatio * 100)} of gross income ($${money(p.monthlyMortgagePayment)}/month). Big simultaneous moves (max retirement + extra mortgage + investing) may strain cash flow — sequence matters.`
    );
  }

  if (risks.length === 0) {
    risks.push(
      `Your profile is relatively balanced; the main risk is complacency — without automatic increases to savings and retirement, inflation and lifestyle creep can erode progress toward ${a.goalPhrase}.`
    );
  }

  return risks.slice(0, 4).join("\n\n");
}

function buildNextActions(
  a: ProfileAnalysis
): [string, string, string] {
  const p = a.profile;
  const actions: string[] = [];

  switch (a.primaryFocus) {
    case "emergency-fund":
      actions.push(
        `Set up automatic transfers of $${money(Math.max(100, Math.round(a.savingsGap / 12)))}/month into a high-yield savings account until you reach $${money(a.emergencyTarget)} (roughly 6 months of take-home cushion at your income).`
      );
      actions.push(
        a.debtBurden !== "none"
          ? `Keep paying minimums on $${money(p.otherDebt)} debt, but pause extra principal on the mortgage until you have at least 3 months of expenses saved.`
          : `Park windfalls (tax refunds, bonuses) directly into savings before increasing investing or mortgage prepayments.`
      );
      break;
    case "debt-paydown":
      actions.push(
        `Write down every non-mortgage balance, APR, and minimum payment — attack the highest-rate account first while paying minimums on the rest (debt is ${formatPct(a.debtToIncome * 100)} of your $${money(p.householdIncome)} income).`
      );
      actions.push(
        `Find $${money(Math.min(300, Math.round(p.householdIncome / 200)))}+/month by trimming one discretionary category and send it to debt until you're under 15% debt-to-income.`
      );
      break;
    case "retirement-catch-up":
      actions.push(
        a.matchUncaptured
          ? `Increase your payroll deferral this week until you're capturing the full ${formatPct(a.employerMatch)} employer match — that's immediate return on your ${formatPct(a.ownContribution)} contribution.`
          : `Raise retirement contributions by 1% of salary now; calendar another 1% bump in 6 months until you reach at least ${targetRetirementPct(a)}% total (you're at ${formatPct(a.effectiveRetirement)}%).`
      );
      actions.push(
        p.age >= 50
          ? `Confirm whether catch-up contributions apply to your 401(k)/IRA this year — at ${p.age}, the extra room can close gaps faster.`
          : `Log into your retirement plan and confirm your fund mix matches ${p.riskTolerance} risk tolerance (not too conservative for ${a.yearsToRetirement} years out).`
      );
      break;
    case "mortgage-optimization":
      actions.push(
        `Request no-cost refinance estimates from two lenders — compare monthly savings on your $${money(p.mortgageBalance)} balance at ${p.mortgageInterestRate}% vs closing costs and break-even months.`
      );
      actions.push(
        `If you stay put, add one extra principal payment per year ($${money(p.monthlyMortgagePayment)}) or round up each payment by $50–100 while keeping retirement at match minimum.`
      );
      break;
    case "wealth-building":
      actions.push(
        `Automate monthly investing of $${money(suggestedInvestAmount(a))} into a diversified portfolio aligned with ${p.riskTolerance} risk — only after retirement is at ${formatPct(a.effectiveRetirement)}%+ and emergency cash is solid.`
      );
      actions.push(
        `Max out tax-advantaged space next (IRA/HSA if eligible) before adding taxable brokerage investments.`
      );
      break;
    case "goal-acceleration":
      actions.push(goalSpecificAction(a));
      actions.push(
        `Create a dedicated sub-account labeled for your goal and auto-transfer a fixed amount each payday so progress toward ${a.goalPhrase} is visible.`
      );
      break;
    default:
      actions.push(
        `Automate retirement, savings, and bill payments on payday so good months don't depend on willpower.`
      );
      actions.push(
        `Block 30 minutes this month to review beneficiaries, insurance deductibles, and whether your mortgage payment still fits your income tier.`
      );
  }

  actions.push(goalAnchoredAction(a));
  actions.push(reviewAction(a));

  const unique = [...new Set(actions)];
  return [unique[0], unique[1], unique[2]];
}

// --- Narrative helpers ---

function ageOpener(a: ProfileAnalysis): string {
  const p = a.profile;
  if (a.lifeStage === "early-career") {
    return `As a ${p.age}-year-old early in your earning years, small habit changes now compound dramatically — but only after basics are covered.`;
  }
  if (a.lifeStage === "mid-career") {
    return `At ${p.age}, you're in the prime window to align income ($${money(p.householdIncome)}) with long-term goals before obligations harden.`;
  }
  if (a.lifeStage === "pre-retirement") {
    return `At ${p.age}, with roughly ${a.yearsToRetirement} years to retirement, tradeoffs between debt, mortgage, and portfolio growth get sharper.`;
  }
  return `At ${p.age}, capital preservation and predictable income matter as much as growth — every decision should protect the retirement timeline you've set.`;
}

function primaryFocusSummary(a: ProfileAnalysis): string {
  const p = a.profile;
  switch (a.primaryFocus) {
    case "emergency-fund":
      return `I'd prioritize growing cash reserves first: your $${money(p.savingsAmount)} savings cover about ${formatMonths(a.savingsMonths)} of monthly needs, which is ${savingsAdequacyLabel(a.savingsAdequacy)}.`;
    case "debt-paydown":
      return `I'd put non-mortgage debt first — $${money(p.otherDebt)} (${formatPct(a.debtToIncome * 100)} of income) is the drag most likely to block progress on everything else.`;
    case "retirement-catch-up":
      return `I'd focus on lifting retirement savings from ${formatPct(a.effectiveRetirement)} (${formatPct(a.ownContribution)} from you + ${formatPct(a.employerMatch)} match) before chasing aggressive investing.`;
    case "mortgage-optimization":
      return `I'd tackle your ${p.mortgageInterestRate}% mortgage on $${money(p.mortgageBalance)} — at this rate, refinancing or extra principal likely beats taxable investing for now.`;
    case "wealth-building":
      return `You're positioned to direct surplus cash toward growth: savings are ${savingsAdequacyLabel(a.savingsAdequacy)}, debt is manageable, and retirement is ${a.retirementStatus.replace("-", " ")}.`;
    case "goal-acceleration":
      return `I'd structure cash flow explicitly around ${a.goalPhrase}, using your ${p.riskTolerance}-risk comfort and current ${formatPct(a.effectiveRetirement)} retirement rate as guardrails.`;
    default:
      return `I'd take a steady, layered approach — shore up weak spots, then line up extra dollars with ${a.goalPhrase}.`;
  }
}

function goalConnection(a: ProfileAnalysis): string {
  if (a.goalThemes.includes("retirement") && a.primaryFocus !== "retirement-catch-up") {
    return `That path still supports your retirement-focused goal (${a.goalPhrase}) by reducing shocks that force you to pause contributions.`;
  }
  if (a.goalThemes.includes("mortgage-free")) {
    return `This sequencing keeps you moving toward becoming mortgage-free without starving retirement or emergency cash.`;
  }
  if (a.goalThemes.includes("debt-free")) {
    return `Clearing obstacles in order makes your debt-free goal realistic without derailing housing or retirement.`;
  }
  return `Everything below is sequenced so each step moves you closer to ${a.goalPhrase}.`;
}

function savingsParagraph(a: ProfileAnalysis): string {
  const p = a.profile;
  const target = a.emergencyTarget;
  if (a.savingsAdequacy === "excellent" || a.savingsAdequacy === "strong") {
    return `Your $${money(p.savingsAmount)} liquid savings (~${formatMonths(a.savingsMonths)} months of income) ${savingsAdequacyLabel(a.savingsAdequacy)} — that's breathing room most households at the ${a.incomeTier} income level don't have.`;
  }
  if (a.savingsGap > 0) {
    return `You have $${money(p.savingsAmount)} saved (~${formatMonths(a.savingsMonths)} months of expenses). For your $${money(p.householdIncome)} household, I'd like to see closer to $${money(target)} before aggressive investing — you're about $${money(a.savingsGap)} short of a 6-month cushion.`;
  }
  return `Savings of $${money(p.savingsAmount)} are ${savingsAdequacyLabel(a.savingsAdequacy)} relative to your income and fixed costs.`;
}

function debtParagraph(a: ProfileAnalysis): string {
  const p = a.profile;
  if (a.debtBurden === "none") {
    return `You reported no non-mortgage debt — that frees cash flow for retirement, your mortgage, or your goal without competing interest charges.`;
  }
  const tone =
    a.debtBurden === "heavy"
      ? "is the clearest red flag in your profile"
      : a.debtBurden === "moderate"
        ? "warrants a deliberate paydown plan"
        : "is manageable but still worth eliminating methodically";
  return `Other debt of $${money(p.otherDebt)} (${formatPct(a.debtToIncome * 100)} of $${money(p.householdIncome)} income) ${tone}.`;
}

function retirementParagraph(a: ProfileAnalysis): string {
  const p = a.profile;
  const target = targetRetirementPct(a);
  if (a.matchUncaptured) {
    return `You're contributing ${formatPct(a.ownContribution)} while your employer offers up to ${formatPct(a.employerMatch)} match — I'd verify you're not leaving free compensation on the table before other moves.`;
  }
  if (a.retirementStatus === "strong" || a.retirementStatus === "on-track") {
    return `Total retirement savings rate of ${formatPct(a.effectiveRetirement)} (your ${formatPct(a.ownContribution)} + match) is ${a.retirementStatus.replace("-", " ")} for age ${p.age}; maintain or nudge toward ${target}% as income grows.`;
  }
  return `At ${formatPct(a.effectiveRetirement)} all-in retirement savings, you're ${a.retirementStatus.replace("-", " ")} for age ${p.age}; I'd aim for roughly ${target}% over the next 12–18 months.`;
}

function mortgageParagraph(a: ProfileAnalysis): string {
  const p = a.profile;
  const ltv =
    p.householdIncome > 0
      ? formatPct((p.mortgageBalance / p.householdIncome) * 100)
      : "—";
  if (a.mortgageOutlook === "costly") {
    return `Your ${p.mortgageInterestRate}% rate on a $${money(p.mortgageBalance)} balance (${ltv} of annual income) is expensive in today's market — $${money(p.monthlyMortgagePayment)}/month in housing payment is meaningful at your income level.`;
  }
  if (a.mortgageOutlook === "favorable") {
    return `Your ${p.mortgageInterestRate}% mortgage is relatively low-cost; extra principal is optional compared with maxing tax-advantaged accounts.`;
  }
  return `Mortgage: $${money(p.mortgageBalance)} at ${p.mortgageInterestRate}% with $${money(p.monthlyMortgagePayment)}/month payments — worth monitoring, but not necessarily your first lever.`;
}

function incomeParagraph(a: ProfileAnalysis): string {
  const p = a.profile;
  const tierNote: Record<ProfileAnalysis["incomeTier"], string> = {
    modest: "At this income, small automated amounts matter more than perfect optimization — consistency beats size.",
    middle: "Your income supports meaningful monthly progress if you automate transfers right after payday.",
    "upper-middle": "You likely have room for parallel goals once priorities are sequenced — avoid spreading too thin too early.",
    high: "Higher income raises the stakes for tax-efficient ordering (match, HSA, IRA, then taxable investing).",
  };
  return tierNote[a.incomeTier];
}

function phaseOne(a: ProfileAnalysis): string {
  switch (a.primaryFocus) {
    case "emergency-fund":
      return `Build savings to at least 3 months of expenses ($${money(Math.round(a.emergencyTarget / 2))}) while covering minimum debt and capturing any employer match.`;
    case "debt-paydown":
      return `List debts by APR; pay minimums everywhere and send every extra dollar to the highest-rate balance until non-mortgage debt drops below 15% of income.`;
    case "retirement-catch-up":
      return a.matchUncaptured
        ? `Adjust payroll today to capture the full ${formatPct(a.employerMatch)} match — no other move pays that well instantly.`
        : `Increase deferrals by 1% of salary and confirm investment elections match ${a.profile.riskTolerance} risk.`;
    case "mortgage-optimization":
      return `Get two refinance quotes and run break-even math; if you don't refinance, set up one automatic extra principal payment.`;
    case "wealth-building":
      return `Confirm 6-month emergency fund, then open automated investing at $${money(suggestedInvestAmount(a))}/month in a diversified allocation.`;
    case "goal-acceleration":
      return goalSpecificAction(a);
    default:
      return `Automate bills, minimum debt payments, and at least full employer match; track spending for one month to find $200+ for goals.`;
  }
}

function phaseTwo(a: ProfileAnalysis): string {
  const secondary = a.secondaryFocus ?? "stability-first";
  switch (secondary) {
    case "emergency-fund":
      return `Finish the 6-month emergency fund ($${money(a.emergencyTarget)}) before increasing optional investing.`;
    case "debt-paydown":
      return `Continue debt snowball until only mortgage remains (if any).`;
    case "retirement-catch-up":
      return `Raise total retirement rate toward ${targetRetirementPct(a)}% through bi-annual 1% increases.`;
    case "mortgage-optimization":
      return `Apply half of any raise to mortgage principal if rate stays above 6%; otherwise revisit taxable investing.`;
    case "wealth-building":
      return `Expand brokerage contributions if cash flow stays comfortable after Phase 1.`;
    case "goal-acceleration":
      return `Increase monthly transfers toward ${a.goalPhrase} by 50% of any raise or bonus.`;
    default:
      return `Reassess progress; shift extra cash to the next-weakest metric (savings, debt, or retirement).`;
  }
}

function phaseThree(a: ProfileAnalysis): string {
  const p = a.profile;
  if (a.goalThemes.includes("retirement")) {
    return `Annual review: project retirement balance at current ${formatPct(a.effectiveRetirement)} savings rate; adjust until on track for ${a.goalPhrase} by your target age.`;
  }
  if (a.goalThemes.includes("mortgage-free")) {
    return `Model mortgage payoff date with optional extra payments; align with ${a.goalPhrase} and don't sacrifice match or emergency fund.`;
  }
  if (a.investReadiness === "aggressive" || a.investReadiness === "ready") {
    return `Rebalance investments yearly, increase savings rate with raises, and revisit whether mortgage prepay still beats after-tax investment returns.`;
  }
  return `Build a 12-month habit of increasing savings rate 1% per year and revisiting insurance, estate beneficiaries, and goal timeline.`;
}

function allocationGuidance(a: ProfileAnalysis): string {
  const p = a.profile;
  if (a.surplusCapacity === "tight") {
    return `With tight cash flow, use a simple rule: essentials → employer match → $${money(Math.max(50, Math.round(a.savingsGap / 24)))}/mo to savings → highest-rate debt — only then optional mortgage or investing.`;
  }
  if (a.primaryFocus === "mortgage-optimization" && a.retirementStatus !== "behind") {
    return `Split extra cash 60/40 between mortgage principal and retirement until the rate is below 6% or refinanced, then shift toward investing given your ${p.riskTolerance} tolerance.`;
  }
  if (a.investReadiness === "aggressive") {
    return `After match and 6-month cash: ~70% to diversified investing, ~30% to goal-specific savings or optional mortgage prepay — adjust down if markets make you uncomfortable.`;
  }
  if (a.investReadiness === "ready") {
    return `After basics: ~50% retirement/tax-advantaged, ~30% goal account, ~20% brokerage or mortgage prepay depending on whether your ${p.mortgageInterestRate}% rate feels painful.`;
  }
  return `Until savings and debt metrics improve, put 100% of extra cash to cushion + debt + match — investing can wait without jeopardizing ${a.goalPhrase}.`;
}

function goalSpecificAction(a: ProfileAnalysis): string {
  const p = a.profile;
  if (a.goalThemes.includes("mortgage-free")) {
    return `Calculate how one extra $${money(p.monthlyMortgagePayment)} payment per year shifts your payoff date on $${money(p.mortgageBalance)} — that's the clearest path toward ${a.goalPhrase}.`;
  }
  if (a.goalThemes.includes("retirement")) {
    return `Use an online retirement projector with age ${p.age}, income $${money(p.householdIncome)}, and ${formatPct(a.effectiveRetirement)} savings rate to see if ${a.goalPhrase} is realistic — adjust deferrals quarterly.`;
  }
  if (a.goalThemes.includes("debt-free")) {
    return `Pick a debt-free date and divide $${money(p.otherDebt)} by remaining months — that's your monthly target payment above minimums.`;
  }
  if (a.goalThemes.includes("investing")) {
    return `Open or review a brokerage account with an asset mix matching ${p.riskTolerance} risk only after emergency fund and match are handled.`;
  }
  return `Break ${a.goalPhrase} into a monthly dollar target based on your timeline and automate that transfer on payday.`;
}

function goalAnchoredAction(a: ProfileAnalysis): string {
  return `Write your goal — ${a.goalPhrase} — at the top of your budget spreadsheet and tag every transfer so you can see momentum monthly.`;
}

function reviewAction(a: ProfileAnalysis): string {
  return `Set a quarterly calendar reminder to re-run this check-in when income, rates, or debt change by more than 10%.`;
}

function targetRetirementPct(a: ProfileAnalysis): number {
  const age = a.profile.age;
  if (age < 35) return 15;
  if (age < 45) return 18;
  if (age < 55) return 20;
  return 22;
}

function suggestedInvestAmount(a: ProfileAnalysis): number {
  const monthly = a.profile.householdIncome / 12;
  const base = monthly * 0.08;
  if (a.incomeTier === "modest") return Math.round(Math.min(base, 200));
  if (a.incomeTier === "middle") return Math.round(Math.min(base, 600));
  return Math.round(Math.min(base, 1500));
}

function money(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function formatPct(n: number): string {
  const rounded = Math.round(n * 10) / 10;
  return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)}%`;
}

function formatMonths(m: number): string {
  const rounded = Math.round(m * 10) / 10;
  if (rounded < 1) return "less than one month";
  if (rounded === 1) return "about one month";
  return `about ${rounded} months`;
}
