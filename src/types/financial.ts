export type RiskTolerance = "low" | "medium" | "high";

export interface FinancialProfile {
  age: number;
  householdIncome: number;
  mortgageBalance: number;
  mortgageInterestRate: number;
  monthlyMortgagePayment: number;
  retirementContributionPct: number;
  employerMatchPct: number;
  savingsAmount: number;
  otherDebt: number;
  riskTolerance: RiskTolerance;
  financialGoal: string;
}

export interface RecommendationResult {
  recommendation: string;
  why: string;
  priorityOrder: string[];
  nextActions: string[];
}

export const STORAGE_KEY = "smart-money-coach-profile";
