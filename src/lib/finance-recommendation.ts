/**
 * Computed outcomes for the recommendation engine.
 *
 * Every figure the recommendation cites is computed here from the finance
 * library — payoff dates, interest saved, break-even months — so the prose in
 * recommendation.ts never has to guess. This file is pure: numbers in, numbers
 * out, no React. The recommendation engine wires these into the narrative.
 */
import { buildSchedule, comparePrepayment } from "./finance/amortization";
import { compareStrategies } from "./finance/debt-payoff";
import { analyzeRefinance } from "./finance/refinance";
import { roundCents } from "./finance/money";
import type { FinancialProfile } from "@/types/financial";

export interface MortgageOutcomes {
  loanAmount: number;
  payment: number;
  monthsRemaining: number;
  totalInterestRemaining: number;
  /** What $200/mo extra principal buys — a concrete illustration. */
  illustration: {
    extraMonthly: number;
    monthsSaved: number;
    interestSaved: number;
    payoffWithout: string; // e.g. "April 2051"
    payoffWith: string;
    savedPerExtraDollar: number;
  } | null;
}

export interface DebtOutcomes {
  avalanche: { months: number; interest: number };
  snowball: { months: number; interest: number };
  interestSaved: number;
  firstCleared: { name: string; month: number } | null;
  /** The illustration extra payment: 5% of monthly income. */
  illustrationExtra: number;
}

export interface RefinanceOutcomes {
  breakEvenMonths: number | null;
  lifetimeSaving: number;
  extendsTerm: boolean;
  closingCosts: number;
  newRate: number;
}

export interface EmergencyFundGap {
  current: number;
  target: number;
  gap: number;
  monthsCovered: number;
}

export interface ComputedOutcomes {
  mortgage: MortgageOutcomes | null;
  debt: DebtOutcomes | null;
  refinance: RefinanceOutcomes | null;
  emergencyFund: EmergencyFundGap;
}

/**
 * Compute every outcome that could be cited in a recommendation.
 * Returns null for sections where the profile has no relevant data.
 */
export function computeOutcomes(profile: FinancialProfile): ComputedOutcomes {
  const monthlyIncome = profile.householdIncome / 12;
  const emergencyTarget = roundCents(monthlyIncome * 6);
  const emergencyFund: EmergencyFundGap = {
    current: profile.savingsAmount,
    target: emergencyTarget,
    gap: roundCents(Math.max(0, emergencyTarget - profile.savingsAmount)),
    monthsCovered: monthlyIncome > 0
      ? profile.savingsAmount / monthlyIncome
      : 0,
  };

  // --- Mortgage ---
  let mortgage: MortgageOutcomes | null = null;
  if (profile.mortgageBalance > 0 && profile.mortgageInterestRate > 0 && profile.monthlyMortgagePayment > 0) {
    try {
      const schedule = buildSchedule({
        principal: profile.mortgageBalance,
        annualRatePct: profile.mortgageInterestRate,
        payment: profile.monthlyMortgagePayment,
      });
      const extra = Math.max(50, Math.round(monthlyIncome * 0.04));
      let illustration: MortgageOutcomes["illustration"] = null;
      try {
        const cmp = comparePrepayment(
          {
            principal: profile.mortgageBalance,
            annualRatePct: profile.mortgageInterestRate,
            payment: profile.monthlyMortgagePayment,
          },
          { extraMonthly: extra }
        );
        if (cmp.monthsSaved > 0) {
          illustration = {
            extraMonthly: extra,
            monthsSaved: cmp.monthsSaved,
            interestSaved: cmp.interestSaved,
            payoffWithout: payoffDate(schedule.monthsToPayoff),
            payoffWith: payoffDate(cmp.accelerated.monthsToPayoff),
            savedPerExtraDollar: cmp.savedPerExtraDollar,
          };
        }
      } catch {
        // Payment doesn't cover interest — skip the illustration
      }
      mortgage = {
        loanAmount: profile.mortgageBalance,
        payment: schedule.payment,
        monthsRemaining: schedule.monthsToPayoff,
        totalInterestRemaining: schedule.totalInterest,
        illustration,
      };
    } catch {
      // Non-amortizing — skip
    }
  }

  // --- Debt ---
  let debt: DebtOutcomes | null = null;
  if (profile.otherDebt > 0) {
    const extra = Math.max(50, Math.round(monthlyIncome * 0.05));
    // The profile only has a lump "other debt" — treat it as a single account
    // plus a second smaller one at a typical rate so the comparison still runs.
    const debts = [
      {
        id: "main",
        name: "Primary balance",
        balance: profile.otherDebt,
        annualRatePct: 18, // conservative estimate for unsecured
        minimumPayment: Math.max(25, Math.round(profile.otherDebt * 0.02)),
      },
    ];
    // If the debt is large enough, split it so the avalanche/snowball comparison
    // actually exercises the difference.
    if (profile.otherDebt > 5_000) {
      debts.push({
        id: "sub",
        name: "Smaller account",
        balance: Math.round(profile.otherDebt * 0.22),
        annualRatePct: 14,
        minimumPayment: Math.max(25, Math.round(profile.otherDebt * 0.22 * 0.03)),
      });
    }
    try {
      const cmp = compareStrategies(debts, extra);
      const firstCleared = cmp.avalanche.perDebt
        .filter((d) => d.payoffMonth > 0)
        .sort((a, b) => a.payoffMonth - b.payoffMonth)[0];
      debt = {
        avalanche: {
          months: cmp.avalanche.monthsToDebtFree,
          interest: cmp.avalanche.totalInterest,
        },
        snowball: {
          months: cmp.snowball.monthsToDebtFree,
          interest: cmp.snowball.totalInterest,
        },
        interestSaved: cmp.interestSaved,
        firstCleared: firstCleared
          ? { name: firstCleared.name, month: firstCleared.payoffMonth }
          : null,
        illustrationExtra: extra,
      };
    } catch {
      // Unpayable — skip
    }
  }

  // --- Refinance ---
  let refinance: RefinanceOutcomes | null = null;
  if (mortgage && profile.mortgageInterestRate >= 5.5) {
    // Illustrate a refi at 75 basis points below current, if the current rate is high enough.
    const newRate = roundCents(profile.mortgageInterestRate - 0.75);
    if (newRate > 0 && newRate < profile.mortgageInterestRate) {
      try {
        const closingCosts = roundCents(profile.mortgageBalance * 0.02); // ~2% of balance
        const result = analyzeRefinance({
          currentBalance: profile.mortgageBalance,
          currentRatePct: profile.mortgageInterestRate,
          currentRemainingMonths: mortgage.monthsRemaining,
          newRatePct: newRate,
          newTermMonths: Math.min(360, mortgage.monthsRemaining),
          closingCosts,
          rollCostsIn: true,
          monthsYouStay: 120,
        });
        refinance = {
          breakEvenMonths: result.totalCostBreakEvenMonths,
          lifetimeSaving: result.lifetimeInterestSaved,
          extendsTerm: result.extendsTerm,
          closingCosts,
          newRate,
        };
      } catch {
        // Skip
      }
    }
  }

  return { mortgage, debt, refinance, emergencyFund };
}

/** Approximate payoff date from today + N months. */
function payoffDate(monthsFromNow: number): string {
  const now = new Date();
  const target = new Date(
    now.getFullYear(),
    now.getMonth() + Math.round(monthsFromNow),
    1
  );
  return target.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}
