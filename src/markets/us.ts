import type { MarketConfig } from "./types";

export const usMarket: MarketConfig = {
  id: "us",
  name: "United States",
  shortName: "US",
  currency: { code: "USD", symbol: "$", locale: "en-US", fractionDigits: 2 },
  debt: {
    typicalRateRange: [12, 30],
    regulatoryMaxRate: 36,
    minimumPaymentLabel: "Minimum payment",
    collectiveLabel: "non-mortgage debt",
    lenderExamples: ["Chase", "Citi", "Discover"],
  },
  retirement: {
    label: "401(k) / IRA",
    employerLabel: "Employer match",
    typicalAge: 65,
    hasEmployerMatch: true,
    defaultContributionPct: 6,
    description: "Retirement contribution from you",
  },
  housing: {
    primaryPath: "mortgage",
    maxMortgageTermMonths: 360,
    typicalMortgageRateRange: [3, 9],
    hasMortgageInsurance: true,
    mortgageInsuranceLabel: "PMI",
    refinancingCommon: true,
  },
  incomeTiers: [60_000, 120_000, 250_000],
  emergencyFundTargetMonths: 6,
  disclaimer:
    "These are arithmetic results, not a recommendation. They use only the " +
    "numbers you typed — not your tax situation, job security, health, or " +
    "anything else a person who knows you would weigh. For educational " +
    "purposes only.",
};
