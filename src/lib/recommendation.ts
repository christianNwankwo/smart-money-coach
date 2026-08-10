/**
 * Recommendation engine — classification plus computed outcomes.
 *
 * The profile is classified into tiers by profile-analysis.ts so the engine
 * knows what to order. Every figure in the prose then comes from lib/finance,
 * computed against the visitor's own numbers and cited directly. Nothing here
 * is a guess.
 *
 * The copy itself is reframed as illustrations, not first-person advice. The
 * engine never says "I'd" or "you should"; it says "here is what the numbers
 * show" and "one scenario looks like this."
 */

import {
  analyzeProfile,
  focusAreaLabel,
  riskTone,
  savingsAdequacyLabel,
  type ProfileAnalysis,
  type PrimaryFocus,
} from "@/lib/profile-analysis";
import { computeOutcomes } from "@/lib/finance-recommendation";
import type { ComputedOutcomes } from "@/lib/finance-recommendation";
import type { FinancialProfile, RecommendationResult } from "@/types/financial";

const DISCLAIMER =
  "Disclaimer: These are arithmetic results, not a recommendation. " +
  "They use only the numbers you typed — not your tax situation, job " +
  "security, health, or anything else a person who knows you would weigh. " +
  "Treat the figures below as illustrations: here is what one scenario " +
  "could look like with your inputs.";

export function generateRecommendation(
  profile: FinancialProfile
): RecommendationResult {
  const a = analyzeProfile(profile);
  const outcomes = computeOutcomes(profile);

  const summary = buildSummary(a, outcomes);
  const personalizedWhy = buildPersonalizedWhy(a, outcomes);
  const suggestedStrategy = buildStrategy(a, outcomes);
  const risksAndTradeoffs = buildRisks(a, outcomes);
  const nextActions = buildNextActions(a, outcomes);

  return {
    summary,
    personalizedWhy,
    suggestedStrategy,
    risksAndTradeoffs,
    nextActions,
    focusArea: focusAreaLabel(a.primaryFocus),
  };
}

// ---------------------------------------------------------------- summary

function buildSummary(a: ProfileAnalysis, o: ComputedOutcomes): string {
  const p = a.profile;
  const opener = ageOpener(a);
  const core = primaryFocusSummary(a, o);
  const note = DISCLAIMER;
  return `${opener}\n\n${core}\n\n${note}`;
}

// ---------------------------------------------------------------- why

function buildPersonalizedWhy(
  a: ProfileAnalysis,
  o: ComputedOutcomes
): string {
  const p = a.profile;
  const paragraphs: string[] = [];

  paragraphs.push(
    `At ${p.age}, household income of ${money(
      p.householdIncome
    )} puts you roughly ${a.yearsToRetirement} years from a typical retirement window. ` +
      `Each section below cites the arithmetic that applies to your numbers — ` +
      `none of it is generic advice.`
  );

  paragraphs.push(savingsParagraph(a, o));
  paragraphs.push(debtParagraph(a, o));
  if (a.hasMortgage) paragraphs.push(mortgageParagraph(a, o));
  paragraphs.push(retirementParagraph(a));
  paragraphs.push(incomeParagraph(a));
  paragraphs.push(`${riskTone(p.riskTolerance)}`);

  return paragraphs.filter(Boolean).join("\n\n");
}

function savingsParagraph(a: ProfileAnalysis, o: ComputedOutcomes): string {
  const ef = o.emergencyFund;
  if (ef.gap <= 0) {
    return (
      `Your ${money(ef.current)} in liquid savings covers about ` +
      `${formatMonths(ef.monthsCovered)} of expenses — above the six-month ` +
      `benchmark. That means cash is not the bottleneck right now.`
    );
  }
  return (
    `You have ${money(ef.current)} saved, which covers about ` +
    `${formatMonths(ef.monthsCovered)} of expenses. Six months is roughly ` +
    `${money(ef.target)}, so the gap is ${money(ef.gap)}. ` +
    `Until that cushion exists, every other financial move — investing, ` +
    `extra mortgage payments — runs on a thinner margin than it would with ` +
    `a full fund.`
  );
}

function debtParagraph(a: ProfileAnalysis, o: ComputedOutcomes): string {
  const p = a.profile;
  if (p.otherDebt <= 0) {
    return `No non-mortgage debt was reported — that frees cash flow for the mortgage, retirement, or your goal without competing interest charges.`;
  }
  const base = `Non-mortgage debt of ${money(
    p.otherDebt
  )} (${formatPct(a.debtToIncome * 100)} of income).`;
  if (!o.debt) {
    return `${base} The interest rate and minimums on each account determine how long this takes — enter them individually in the Debt Payoff tool for a precise plan.`;
  }
  const d = o.debt;
  return (
    `${base} As an illustration: with an extra ${money(
      d.illustrationExtra
    )}/month, the ` +
    `avalanche method clears everything in about ${formatMonths(
      d.avalanche.months
    )} at a total interest cost of ${money(d.avalanche.interest)}. ` +
    `The snowball would take about ${formatMonths(
      d.snowball.months
    )} and cost ${money(d.snowball.interest)} — ` +
    `${money(d.interestSaved)} more in interest, ` +
    (d.firstCleared
      ? `but it clears "${d.firstCleared.name}" in month ${d.firstCleared.month}.`
      : `though the first-account win can make it easier to stick with.`)
  );
}

function mortgageParagraph(a: ProfileAnalysis, o: ComputedOutcomes): string {
  const p = a.profile;
  if (!o.mortgage) {
    return `Mortgage: ${money(p.mortgageBalance)} at ${
      p.mortgageInterestRate
    }% with ${money(p.monthlyMortgagePayment)}/month payments.`;
  }
  const m = o.mortgage;
  const base = `Mortgage balance of ${money(
    m.loanAmount
  )} at ${p.mortgageInterestRate}%, with ${money(m.payment)}/month. ` +
    `At this pace it retires in about ${formatMonths(m.monthsRemaining)} ` +
    `(roughly ${payoffLabel(m.monthsRemaining)}), at a total remaining interest cost ` +
    `of ${money(m.totalInterestRemaining)}.`;

  if (!m.illustration) return base;

  return (
    `${base}\n\n` +
    `**Illustration — what an extra ${money(m.illustration.extraMonthly)}/month would do:** ` +
    `payoff moves from ${m.illustration.payoffWithout} to ${m.illustration.payoffWith} ` +
    `(${m.illustration.monthsSaved} months sooner), avoiding ${money(
      m.illustration.interestSaved
    )} in interest. ` +
    `Every extra dollar saves about ${formatPct(
      m.illustration.savedPerExtraDollar * 100
    )} in interest — a guaranteed return.`
  );
}

function retirementParagraph(a: ProfileAnalysis): string {
  const p = a.profile;
  const total = a.ownContribution + a.employerMatch;
  if (a.matchUncaptured) {
    return (
      `Retirement: contributing ${formatPct(
        a.ownContribution
      )} while the employer offers ` +
      `up to ${formatPct(a.employerMatch)} — that is unclaimed compensation ` +
      `worth ${money(
        Math.round(p.householdIncome * (a.employerMatch / 100))
      )}/year. ` +
      `No other move comes close to the effective return of capturing a match.`
    );
  }
  const status = a.retirementStatus.replace("-", " ");
  return (
    `Retirement savings rate of ${formatPct(total)} all-in ` +
    `(${formatPct(a.ownContribution)} from you + ${formatPct(
      a.employerMatch
    )} match) ` +
    `is ${status} at age ${p.age}.`
  );
}

function incomeParagraph(a: ProfileAnalysis): string {
  const tierNote: Record<ProfileAnalysis["incomeTier"], string> = {
    modest:
      "At this income, small automated amounts compound — consistency beats size.",
    middle:
      "Your income supports meaningful monthly progress if transfers happen right after payday.",
    "upper-middle":
      "There is likely room for parallel goals once the sequence is set — avoid spreading too thin too early.",
    high:
      "Higher income raises the stakes for tax-efficient ordering: match, HSA, IRA, then taxable investing.",
  };
  return tierNote[a.incomeTier];
}

// ---------------------------------------------------------------- strategy

function buildStrategy(
  a: ProfileAnalysis,
  o: ComputedOutcomes
): string {
  const phases: string[] = [];

  phases.push(`**Phase 1 (next 90 days):** ${phaseOne(a, o)}`);

  if (a.secondaryFocus && a.secondaryFocus !== a.primaryFocus) {
    phases.push(
      `**Phase 2 (months 4–12):** ${phaseTwo(a, o)}`
    );
  }

  phases.push(`**Phase 3 (12+ months):** ${phaseThree(a, o)}`);

  const allocation = allocationGuidance(a, o);
  if (allocation) {
    phases.push(`**How to split extra dollars:** ${allocation}`);
  }

  return phases.join("\n\n");
}

function phaseOne(a: ProfileAnalysis, o: ComputedOutcomes): string {
  switch (a.primaryFocus) {
    case "emergency-fund": {
      const ef = o.emergencyFund;
      const monthly = Math.max(100, Math.round(ef.gap / 12));
      return (
        `Build savings toward ${money(ef.target)} — a six-month cushion ` +
        `at your income. That means adding about ${money(monthly)}/month ` +
        `for roughly 12 months while covering minimums and capturing any employer match.`
      );
    }
    case "debt-paydown": {
      if (!o.debt) {
        return `List every non-mortgage balance with its APR and minimum payment; pay minimums everywhere and direct every extra dollar to the highest-rate account.`;
      }
      return (
        `List debts by APR. Pay minimums everywhere and send every extra dollar ` +
        `to the highest-rate balance. At ${money(o.debt.illustrationExtra)}/month extra, ` +
        `the avalanche clears everything in about ${formatMonths(o.debt.avalanche.months)}.`
      );
    }
    case "retirement-catch-up":
      if (a.matchUncaptured) {
        return `Adjust payroll this week to capture the full ${formatPct(a.employerMatch)} employer match — no other move returns that much immediately.`;
      }
      return `Increase deferrals by 1% of salary and confirm investment elections match your stated ${a.profile.riskTolerance} risk comfort.`;
    case "mortgage-optimization": {
      const base = `Compare refinance offers: your rate is ${a.profile.mortgageInterestRate}% with about ${formatMonths(o.mortgage?.monthsRemaining ?? 0)} left.`;
      if (o.refinance) {
        const r = o.refinance;
        return (
          `${base} Refinancing to roughly ${r.newRate}% at a cost of about ` +
          `${money(r.closingCosts)} in fees would ` +
          (r.breakEvenMonths !== null
            ? `break even in about ${r.breakEvenMonths} months and ` +
              (r.lifetimeSaving > 0
                ? `save ${money(r.lifetimeSaving)} over the full term.`
                : `cost ${money(-r.lifetimeSaving)} more over the full term — not worth it.`)
            : `never break even — the fees are not recovered by the rate drop.`)
        );
      }
      return `${base} Get two no-cost estimates, run the Refinance Break-Even tool, and compare the honest break-even against how long you expect to keep the house.`;
    }
    case "wealth-building":
      return `Confirm a six-month emergency fund, then open automated investing at ${money(suggestedInvestAmount(a))}/month in a diversified allocation matched to your ${a.profile.riskTolerance} risk profile.`;
    default:
      return `Automate bills, minimum debt payments, and the full employer match. Track spending for 30 days to find at least ${money(Math.round(a.profile.householdIncome / 12 / 20))}/month for the highest-priority goal.`;
  }
}

function phaseTwo(a: ProfileAnalysis, o: ComputedOutcomes): string {
  const secondary = a.secondaryFocus ?? "stability-first";
  switch (secondary) {
    case "emergency-fund":
      return `Finish the six-month emergency fund (${money(o.emergencyFund.target)}) before scaling up optional investing.`;
    case "debt-paydown":
      return `Continue the highest-rate-first plan until non-mortgage debt reaches zero — the Debt Payoff tool keeps both avalanche and snowball visible side by side.`;
    case "retirement-catch-up":
      return `Raise total retirement contributions by 1% every six months until the rate reaches roughly 15–20% of income.`;
    case "mortgage-optimization":
      if (o.mortgage?.illustration) {
        return `Automate an extra ${money(o.mortgage.illustration.extraMonthly)}/month toward principal — at the current rate this pulls the payoff date forward by ${o.mortgage.illustration.monthsSaved} months.`;
      }
      return `Apply half of any raise to mortgage principal if the rate is above 6%; otherwise revisit taxable investing.`;
    case "wealth-building":
      return `Expand brokerage contributions if cash flow stays comfortable after Phase 1.`;
    case "goal-acceleration":
      return `Increase monthly transfers toward ${a.goalPhrase} by half of any raise or bonus.`;
    default:
      return `Reassess progress and direct the next available dollar to the weakest metric among savings, debt, and retirement.`;
  }
}

function phaseThree(a: ProfileAnalysis, o: ComputedOutcomes): string {
  if (a.goalThemes.includes("retirement")) {
    return `Annual review: project the retirement balance at the current savings rate and adjust deferrals until the trajectory fits ${a.goalPhrase} by the target age.`;
  }
  if (a.goalThemes.includes("mortgage-free")) {
    if (o.mortgage?.illustration) {
      return `If you sustain ${money(o.mortgage.illustration.extraMonthly)}/month extra, the mortgage retires around ${o.mortgage.illustration.payoffWith}. Revisit this projection annually — raises and windfalls shorten it further.`;
    }
    return `Model the mortgage payoff date with the Deep Dive tool and revisit it each year — a small extra payment now compounds into months saved.`;
  }
  if (a.investReadiness === "aggressive" || a.investReadiness === "ready") {
    return `Rebalance investments yearly, increase the savings rate with raises, and revisit whether mortgage prepay still beats the after-tax expected return.`;
  }
  return `Build the habit of reviewing insurance, estate beneficiaries, and the goal timeline each year — a twelve-month cadence catches drift before it compounds.`;
}

function allocationGuidance(
  a: ProfileAnalysis,
  o: ComputedOutcomes
): string | null {
  if (a.surplusCapacity === "tight") {
    return `With tight cash flow, a simple waterfall: essentials → employer match → ${money(Math.max(50, Math.round(o.emergencyFund.gap / 24)))}/mo to savings → highest-rate debt. Optional mortgage prepay and investing wait until after that sequence.`;
  }
  if (a.primaryFocus === "mortgage-optimization" && a.retirementStatus !== "behind") {
    return `Split extra cash about 60/40 between mortgage principal and retirement until the rate falls below 6% or is refinanced, then shift toward investing.`;
  }
  if (a.investReadiness === "aggressive") {
    return `After the match and a six-month cash cushion: roughly 70% to diversified investing, 30% to goal-specific savings or optional mortgage prepay.`;
  }
  if (a.investReadiness === "ready") {
    return `After basics: about 50% to retirement and tax-advantaged accounts, 30% to a goal account, and 20% to a brokerage or mortgage prepay — the exact split depends on whether the current mortgage rate feels more like a cost or an afterthought.`;
  }
  return null;
}

// ---------------------------------------------------------------- risks

function buildRisks(
  a: ProfileAnalysis,
  o: ComputedOutcomes
): string {
  const risks: string[] = [];

  if (a.savingsAdequacy === "critical" || a.savingsAdequacy === "thin") {
    risks.push(
      `Only ${formatMonths(a.savingsMonths)} of expenses in cash ` +
        `(${money(a.profile.savingsAmount)} saved) leaves a thin margin for a job ` +
        `loss or medical bill. High-interest borrowing in an emergency would undo ` +
        `progress on ${a.goalPhrase} faster than this engine can model.`
    );
  }

  if (a.debtBurden === "heavy" || a.debtBurden === "moderate") {
    const p = a.profile;
    const extra = o.debt?.illustrationExtra ?? Math.round(p.householdIncome / 12 / 20);
    risks.push(
      `${money(p.otherDebt)} in non-mortgage debt ` +
        `(${formatPct(a.debtToIncome * 100)} of gross income) ` +
        `means that amount of every paycheck is not available for saving or ` +
        `investing. At an extra ${money(extra)}/month, the Debt Payoff tool ` +
        `shows exactly how long this takes to clear — the length of that runway ` +
        `is the risk of any competing priority.`
    );
  }

  if (a.retirementStatus === "behind") {
    risks.push(
      `At ${formatPct(a.effectiveRetirement)} all-in retirement savings ` +
        `at age ${a.profile.age}, more of the future landing depends on investment ` +
        `returns arriving as hoped — and less on the contributions that are under ` +
        `your control.`
    );
  }

  if (a.mortgageOutlook === "costly" && a.investReadiness !== "not-yet") {
    risks.push(
      `A mortgage at ${a.profile.mortgageInterestRate}% is a guaranteed "return" ` +
        `on every extra dollar put toward it. Investing instead means the market ` +
        `has to beat that rate after tax, every year, to come out ahead. The Deep ` +
        `Dive tool shows exactly what extra principal is worth — that figure is the ` +
        `comparison point.`
    );
  } else if (a.mortgageOutlook === "favorable" && a.goalThemes.includes("mortgage-free")) {
    risks.push(
      `Prepaying a ${a.profile.mortgageInterestRate}% mortgage aggressively ` +
        `may feel satisfying, but at this rate it may trail behind tax-advantaged ` +
        `retirement growth. The trade is peace of mind against expected return — ` +
        `both sides are real, and neither answer fits everyone.`
    );
  }

  if (a.matchUncaptured) {
    risks.push(
      `Leaving part of the employer's ${formatPct(a.employerMatch)} match on ` +
        `the table is an immediate pay cut you cannot recover later.`
    );
  }

  if (a.surplusCapacity === "tight") {
    risks.push(
      `Housing consumes about ${formatPct(a.housingPaymentRatio * 100)} of ` +
        `gross income (${money(a.profile.monthlyMortgagePayment)}/month). ` +
        `Trying to max retirement, prepay the mortgage and invest all at once ` +
        `may strain cash flow — the order matters more than the speed.`
    );
  }

  if (risks.length === 0) {
    risks.push(
      `The profile is relatively balanced. The main risk is complacency: ` +
        `without automatic increases to savings and retirement, inflation and ` +
        `lifestyle creep can erode progress toward ${a.goalPhrase} without a ` +
        `single crisis.`
    );
  }

  return risks.slice(0, 4).join("\n\n");
}

// ---------------------------------------------------------------- next actions

function buildNextActions(
  a: ProfileAnalysis,
  o: ComputedOutcomes
): [string, string, string] {
  const p = a.profile;
  const actions: string[] = [];

  switch (a.primaryFocus) {
    case "emergency-fund": {
      const ef = o.emergencyFund;
      const monthly = Math.max(100, Math.round(ef.gap / 12));
      actions.push(
        `Transfer ${money(monthly)}/month automatically into a high-yield ` +
          `savings account until the balance reaches ${money(ef.target)} ` +
          `(about six months of expenses at your income).`
      );
      actions.push(
        a.debtBurden !== "none"
          ? `Pay minimums on ${money(p.otherDebt)} in debt, but pause extra ` +
              `principal on the mortgage until at least three months of expenses are saved.`
          : `Direct windfalls (tax refunds, bonuses) to savings before increasing ` +
              `investing or mortgage prepayments.`
      );
      break;
    }
    case "debt-paydown": {
      if (o.debt) {
        actions.push(
          `Direct ${money(o.debt.illustrationExtra)}/month extra toward the ` +
            `highest-rate debt. Using the avalanche method, this clears ` +
            `everything in about ${formatMonths(o.debt.avalanche.months)} ` +
            `at a cost of ${money(o.debt.avalanche.interest)} in interest.`
        );
        actions.push(
          `Open the Debt Payoff tool, list every account with its actual rate ` +
            `and balance, and compare avalanche against snowball — the interest ` +
            `gap between them is the price of the quicker win.`
        );
      } else {
        actions.push(
          `Write down every balance, APR, and minimum payment. Attack the ` +
            `highest-rate account first while paying minimums on the rest.`
        );
        actions.push(
          `Find ${money(Math.min(300, Math.round(p.householdIncome / 200)))}/month ` +
            `by trimming one discretionary category and send it to the highest-rate debt.`
        );
      }
      break;
    }
    case "retirement-catch-up": {
      actions.push(
        a.matchUncaptured
          ? `Increase payroll deferrals this week until you capture the full ` +
              `${formatPct(a.employerMatch)} employer match — that is an immediate ` +
              `${formatPct(a.employerMatch)} return on the contribution, which no ` +
              `other move matches.`
          : `Raise retirement contributions by 1% now and calendar another 1% bump ` +
              `in six months.`
      );
      actions.push(
        p.age >= 50
          ? `Confirm whether catch-up contributions apply to your 401(k) or IRA ` +
              `this year — at ${p.age}, the extra room helps close gaps faster.`
          : `Log into the retirement plan and confirm the fund mix matches ` +
              `${p.riskTolerance} risk comfort for a ${a.yearsToRetirement}-year window.`
      );
      break;
    }
    case "mortgage-optimization": {
      if (o.refinance) {
        actions.push(
          `Request refinance estimates from two lenders. With your ` +
            `${p.mortgageInterestRate}% rate, a move to roughly ` +
            `${o.refinance.newRate}% with about ${money(o.refinance.closingCosts)} ` +
            `in costs would ` +
            (o.refinance.breakEvenMonths !== null
              ? `break even in ${o.refinance.breakEvenMonths} months and ` +
                (o.refinance.lifetimeSaving > 0
                  ? `save ${money(o.refinance.lifetimeSaving)} over the full term.`
                  : `cost ${money(-o.refinance.lifetimeSaving)} more — worse than staying.`)
              : `never break even.`)
        );
      } else {
        actions.push(
          `Request two no-cost refinance estimates and compare the break-even ` +
            `against how long you expect to keep the house.`
        );
      }
      if (o.mortgage?.illustration) {
        actions.push(
          `Add ${money(o.mortgage.illustration.extraMonthly)}/month in extra ` +
            `principal. At your rate this cuts the payoff date from ` +
            `${o.mortgage.illustration.payoffWithout} to ${o.mortgage.illustration.payoffWith} ` +
            `and saves ${money(o.mortgage.illustration.interestSaved)} in interest ` +
            `(${money(Math.round(o.mortgage.illustration.savedPerExtraDollar * 100))}¢ ` +
            `saved per extra dollar).`
        );
      } else {
        actions.push(
          `Add one extra principal payment a year (${money(p.monthlyMortgagePayment)}) ` +
            `or round up each payment by $50–100 while keeping retirement at the match minimum.`
        );
      }
      break;
    }
    case "wealth-building": {
      actions.push(
        `Automate ${money(suggestedInvestAmount(a))}/month into a diversified ` +
          `portfolio matched to ${p.riskTolerance} risk — only after the ` +
          `emergency fund and retirement match are handled.`
      );
      actions.push(
        `Max out tax-advantaged space next (IRA, HSA if eligible) before ` +
          `adding taxable brokerage investments.`
      );
      break;
    }
    default: {
      actions.push(
        `Automate retirement, savings, and bill payments on payday so good ` +
          `months do not depend on willpower.`
      );
      actions.push(
        `Block 30 minutes this month to review beneficiaries, insurance ` +
          `deductibles, and whether the mortgage payment still fits the income tier.`
      );
    }
  }

  actions.push(
    `Open the ${goalToolLabel(a)} tool with your actual numbers — ` +
      `the illustration above uses conservative defaults, and your real ` +
      `account rates and balances will sharpen the picture.`
  );
  actions.push(
    `Set a quarterly calendar reminder to re-run this check-in when income, ` +
      `rates, or debt change by more than 10%.`
  );

  const unique = [...new Set(actions)];
  return [unique[0], unique[1], unique[2]];
}

// ---------------------------------------------------------------- narrative helpers

function ageOpener(a: ProfileAnalysis): string {
  const p = a.profile;
  if (a.lifeStage === "early-career") {
    return `At ${p.age}, early in the earning years, small habit changes now compound dramatically — but only after the basics are covered.`;
  }
  if (a.lifeStage === "mid-career") {
    return `At ${p.age}, in the prime window to align income (${money(
      p.householdIncome
    )}) with long-term goals before obligations harden.`;
  }
  if (a.lifeStage === "pre-retirement") {
    return `At ${p.age}, with roughly ${a.yearsToRetirement} years to retirement, the tradeoffs between debt, mortgage, and portfolio growth get sharper.`;
  }
  return `At ${p.age}, capital preservation and predictable income matter as much as growth — every decision should protect the retirement timeline already set.`;
}

function primaryFocusSummary(
  a: ProfileAnalysis,
  o: ComputedOutcomes
): string {
  const p = a.profile;
  switch (a.primaryFocus) {
    case "emergency-fund": {
      const ef = o.emergencyFund;
      return (
        `The numbers point to building cash reserves first. You have ` +
        `${money(ef.current)} saved, covering about ` +
        `${formatMonths(ef.monthsCovered)} of expenses — below the ` +
        `six-month benchmark of ${money(ef.target)}. A ${money(ef.gap)} gap ` +
        `is the most immediate thing standing between this profile and the ` +
        `rest of the plan.`
      );
    }
    case "debt-paydown": {
      const base = `Non-mortgage debt of ${money(p.otherDebt)} ` +
        `(${formatPct(a.debtToIncome * 100)} of income) is the heaviest drag on cash flow.`;
      if (!o.debt) return base;
      return (
        `${base} As an illustration: the avalanche method clears it in about ` +
        `${formatMonths(o.debt.avalanche.months)}. ` +
        `The snowball takes ${formatMonths(o.debt.snowball.months)} and ` +
        `costs ${money(o.debt.interestSaved)} more — ` +
        `usually a small premium for the momentum of clearing the first account sooner.`
      );
    }
    case "retirement-catch-up":
      return (
        `Retirement savings of ${formatPct(a.effectiveRetirement)} ` +
        `(${formatPct(a.ownContribution)} from you + ${formatPct(a.employerMatch)} match) ` +
        `is below target for age ${p.age}. ` +
        (a.matchUncaptured
          ? `The employer match alone is worth ${money(
              Math.round(p.householdIncome * (a.employerMatch / 100))
            )}/year — capturing it is the highest-return move in the whole profile.`
          : `Raising contributions by 1% now and another 1% in six months gets the trajectory moving.`)
      );
    case "mortgage-optimization": {
      if (!o.mortgage?.illustration) {
        return `Mortgage at ${p.mortgageInterestRate}% on ${money(p.mortgageBalance)} — at this rate, refinancing or extra principal warrants a close look.`;
      }
      const m = o.mortgage.illustration;
      return (
        `At ${p.mortgageInterestRate}%, a ${money(m.extraMonthly)}/month extra principal ` +
        `illustration shows a payoff date moving from ${m.payoffWithout} to ${m.payoffWith} — ` +
        `${m.monthsSaved} months sooner, saving ${money(m.interestSaved)} in interest ` +
        `(${money(Math.round(m.savedPerExtraDollar * 100))}¢ saved per extra dollar). ` +
        `That is a guaranteed return, because it is interest never paid.`
      );
    }
    case "wealth-building":
      return (
        `The profile is positioned for growth: savings are ` +
        `${savingsAdequacyLabel(a.savingsAdequacy)}, debt is ` +
        `${a.debtBurden.replace("-", " ")}, and retirement is ` +
        `${a.retirementStatus.replace("-", " ")}. The next dollar of surplus ` +
        `can go toward investing rather than repair.`
      );
    case "goal-acceleration":
      return `Cash flow should be structured around ${a.goalPhrase}, using the current ${formatPct(a.effectiveRetirement)} retirement rate and ${p.riskTolerance}-risk comfort as guardrails.`;
    default:
      return `A steady, layered approach — shore up the weakest spots, then line up extra dollars with ${a.goalPhrase}.`;
  }
}

// ---------------------------------------------------------------- helpers

function money(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function formatPct(n: number): string {
  const rounded = Math.round(n * 10) / 10;
  return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)}%`;
}

function formatMonths(total: number): string {
  const y = Math.floor(total / 12);
  const m = total % 12;
  const parts: string[] = [];
  if (y > 0) parts.push(`${y} year${y > 1 ? "s" : ""}`);
  if (m > 0 || parts.length === 0)
    parts.push(`${m} month${m > 1 ? "s" : ""}`);
  return parts.join(", ");
}

function payoffLabel(months: number): string {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth() + Math.round(months), 1);
  return target.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

function suggestedInvestAmount(a: ProfileAnalysis): number {
  const monthly = a.profile.householdIncome / 12;
  const base = monthly * 0.08;
  if (a.incomeTier === "modest") return Math.round(Math.min(base, 200));
  if (a.incomeTier === "middle") return Math.round(Math.min(base, 600));
  return Math.round(Math.min(base, 1500));
}

function goalToolLabel(a: ProfileAnalysis): string {
  if (a.goalThemes.includes("mortgage-free") || a.primaryFocus === "mortgage-optimization") {
    return "Mortgage Deep Dive";
  }
  if (a.goalThemes.includes("debt-free") || a.primaryFocus === "debt-paydown") {
    return "Debt Payoff";
  }
  return "Mortgage Deep Dive";
}
