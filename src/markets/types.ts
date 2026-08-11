/**
 * Every market-specific value the app needs.
 *
 * Adding a market is one config file + one registry file + tools. The rest of
 * the codebase reads from this shape and never branches on market.
 */

// ---- market config ----

export interface CurrencyConfig {
  code: string; // "USD", "NGN"
  symbol: string; // "$", "₦"
  locale: string; // "en-US", "en-NG"
  /** Fraction digits for currency display. Naira uses 0 (no cents). */
  fractionDigits: number;
}

export interface DebtConfig {
  /** Range lenders actually charge in this market. */
  typicalRateRange: [number, number];
  /** Regulatory maximum, if one exists. */
  regulatoryMaxRate?: number;
  /** How minimum payments are usually quoted. */
  minimumPaymentLabel: string;
  /** What people call non-mortgage debt here. */
  collectiveLabel: string;
  /** Names of common unsecured lenders/loan apps for the copy. */
  lenderExamples: string[];
}

export interface RetirementConfig {
  /** What the system is called. */
  label: string;
  /** What the employer contribution is called, if anything. */
  employerLabel: string;
  /** Typical retirement age. */
  typicalAge: number;
  /** Whether employer matching is a concept in this market. */
  hasEmployerMatch: boolean;
  /** Contribution rate the system defaults to. */
  defaultContributionPct: number;
  /** Short description for the form. */
  description: string;
}

export interface HousingConfig {
  /** Whether traditional mortgages are the primary path to ownership. */
  primaryPath: "mortgage" | "incremental" | "cash" | "cooperative";
  /** Max mortgage term in months, if mortgages exist. */
  maxMortgageTermMonths: number;
  /** Typical rate range for mortgages. */
  typicalMortgageRateRange: [number, number];
  /** Whether PMI/mortgage insurance exists. */
  hasMortgageInsurance: boolean;
  /** What mortgage insurance is called, if it exists. */
  mortgageInsuranceLabel: string;
  /** Whether refinancing is a common consumer activity. */
  refinancingCommon: boolean;
}

export interface MarketConfig {
  id: string;
  name: string;
  /** Shown in the header. */
  shortName: string;
  currency: CurrencyConfig;
  debt: DebtConfig;
  retirement: RetirementConfig;
  housing: HousingConfig;

  /** Gross annual income thresholds: modest / middle / upper-middle. */
  incomeTiers: [number, number, number];

  /** How many months of expenses the emergency fund advice targets. */
  emergencyFundTargetMonths: number;

  /** One-sentence disclaimer, market-appropriate. */
  disclaimer: string;
}

// ---- registry types ----

export type CategoryId = string;

export interface Category {
  id: CategoryId;
  label: string;
  blurb: string;
  /** Tailwind classes for the category chip. */
  accent: string;
}

export interface FaqItem {
  q: string;
  a: string;
}

export interface Tool {
  slug: string;
  category: CategoryId;
  title: string;
  blurb: string;
  keywords: string[];
  how: string[];
  faq: FaqItem[];
}
