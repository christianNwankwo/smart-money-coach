/**
 * Existing recommendation engine — heuristic, pending the rewrite in issue #6.
 *
 * This suite keeps the existing code honest while the engine is being
 * restructured onto computed outcomes from lib/finance.
 */
import { createSuite } from './assert.mjs'
import { loadTs } from './tsload.mjs'

const rec = loadTs(new URL('../src/lib/recommendation.ts', import.meta.url))
const ana = loadTs(new URL('../src/lib/profile-analysis.ts', import.meta.url))
const t = createSuite('recommendation (heuristic)')

const profile = {
  age: 38,
  householdIncome: 110_000,
  mortgageBalance: 280_000,
  mortgageInterestRate: 6.5,
  monthlyMortgagePayment: 2_100,
  retirementContributionPct: 6,
  employerMatchPct: 4,
  savingsAmount: 12_000,
  otherDebt: 25_000,
  riskTolerance: 'medium',
  financialGoal: 'pay off my home and retire by 62',
}

const a = ana.analyzeProfile(profile)

t.section('profile analysis returns every field')
// Every key listed in the ProfileAnalysis type must be present. If one is
// missing the result object — because determineFocus no longer returns it —
// the recommendation builder will read undefined and produce broken copy.
// The first generation of this code was reviewed against a spreadsheet of
// example profiles, and a missing field here was the only thing that
// surfaced as garbled text rather than an incorrect figure, which is hard to
// catch in a UI demo.
const expectedKeys = [
  'profile', 'effectiveRetirement', 'ownContribution', 'employerMatch',
  'debtToIncome', 'savingsMonths', 'emergencyTarget', 'savingsGap',
  'savingsAdequacy', 'debtBurden', 'retirementStatus', 'incomeTier',
  'lifeStage', 'mortgageOutlook', 'mortgageToIncome', 'housingPaymentRatio',
  'yearsToRetirement', 'goalThemes', 'goalPhrase', 'primaryFocus',
  'secondaryFocus', 'matchUncaptured', 'hasMortgage', 'surplusCapacity',
  'investReadiness',
]
for (const key of expectedKeys) {
  t.ok(
    key in a,
    `analysis includes ${key}`
  )
}

t.section('derived fields are in range')
t.ok(a.effectiveRetirement >= 0 && a.effectiveRetirement <= 100, 'retirement rate in range')
t.ok(a.debtToIncome >= 0 && a.debtToIncome <= 10, 'debt-to-income in range')
t.ok(a.savingsMonths >= 0, 'savings months non-negative')
t.ok(a.yearsToRetirement >= 0 && a.yearsToRetirement <= 70, 'years to retirement in range')
t.eq(a.hasMortgage, true, 'detects the mortgage')

t.section('primary focus is assigned')
const validFocuses = [
  'emergency-fund', 'debt-paydown', 'retirement-catch-up',
  'mortgage-optimization', 'goal-acceleration', 'wealth-building',
  'stability-first',
]
t.eq(
  validFocuses.includes(a.primaryFocus),
  true,
  `primaryFocus is "${a.primaryFocus}"`
)

t.section('recommendation returns every section')
const result = rec.generateRecommendation(profile)
t.ok(result.summary.length > 50, 'summary has content')
t.ok(result.personalizedWhy.length > 100, 'personalizedWhy has content')
t.ok(result.suggestedStrategy.length > 50, 'suggestedStrategy has content')
t.ok(result.risksAndTradeoffs.length > 20, 'risksAndTradeoffs has content')
t.ok(result.nextActions.length === 3, 'returns exactly three next actions')
t.ok(
  result.nextActions.every((a) => a.length > 10),
  'every action has real content'
)
t.ok(result.focusArea.length > 0, 'focusArea is not empty')

t.section('edge profiles do not throw')
// A mid-career profile with no mortgage and a decent cushion.
const balanced = {
  age: 35,
  householdIncome: 150_000,
  mortgageBalance: 0,
  mortgageInterestRate: 0,
  monthlyMortgagePayment: 0,
  retirementContributionPct: 15,
  employerMatchPct: 6,
  savingsAmount: 45_000,
  otherDebt: 0,
  riskTolerance: 'high',
  financialGoal: 'build wealth through investing',
}
const ba = ana.analyzeProfile(balanced)
t.eq(ba.hasMortgage, false, 'no mortgage detected')

const br = rec.generateRecommendation(balanced)
t.ok(br.summary.length > 20, 'balanced profile gets a summary')
t.ok(br.nextActions.length === 3, 'balanced profile gets three actions')

// The form edge: a 22-year-old with little saved and high-rate debt.
const young = {
  age: 22,
  householdIncome: 40_000,
  mortgageBalance: 0,
  mortgageInterestRate: 0,
  monthlyMortgagePayment: 0,
  retirementContributionPct: 0,
  employerMatchPct: 3,
  savingsAmount: 500,
  otherDebt: 15_000,
  riskTolerance: 'high',
  financialGoal: '',
}
const ya = ana.analyzeProfile(young)
t.ok(ya.primaryFocus !== 'wealth-building', 'a thin profile does not push investing')
t.ok(ya.goalPhrase.length > 0, 'an empty goal gets a fallback phrase')

t.done()
