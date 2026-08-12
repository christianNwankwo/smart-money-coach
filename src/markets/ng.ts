import type { MarketConfig } from "./types";

export const ngMarket: MarketConfig = {
  id: "ng",
  name: "Nigeria",
  shortName: "NG",
  currency: { code: "NGN", symbol: "₦", locale: "en-NG", fractionDigits: 0 },
  debt: {
    typicalRateRange: [15, 50],
    regulatoryMaxRate: 60,
    minimumPaymentLabel: "Minimum repayment",
    collectiveLabel: "personal debt",
    lenderExamples: ["PalmCredit", "Carbon", "FairMoney", "Renmoney"],
  },
  retirement: {
    label: "CPS / Retirement Savings Account",
    employerLabel: "Employer contribution",
    typicalAge: 60,
    hasEmployerMatch: false,
    defaultContributionPct: 8,
    description:
      "Total pension contribution from your salary (employee + employer)",
  },
  housing: {
    primaryPath: "incremental",
    maxMortgageTermMonths: 180,
    typicalMortgageRateRange: [18, 30],
    hasMortgageInsurance: false,
    mortgageInsuranceLabel: "",
    refinancingCommon: false,
  },
  incomeTiers: [1_200_000, 5_000_000, 15_000_000],
  emergencyFundTargetMonths: 3,
  // No Nigerian recommendation engine exists yet. The US one reasons about
  // 401(k) matching, PMI and mortgage prepayment — none of which apply here.
  hasQuickCheck: false,
  disclaimer:
    "These are arithmetic illustrations, not advice. They use only the " +
    "numbers you typed — not your employment status, family obligations, or " +
    "anything else a person who knows you would weigh. For educational " +
    "purposes only.",
};
