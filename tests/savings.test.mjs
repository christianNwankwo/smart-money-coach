// Goal saving, emergency funds, and contribution projections.
//
// The load-bearing check is that `inflate` and `discountToToday` are exact
// inverses — the goal tool inflates a target and the pension tool discounts a
// projection, and if those two disagree the same app is telling a visitor two
// incompatible stories about what money is worth.
import { createSuite } from './assert.mjs'
import { loadTs } from './tsload.mjs'

const fin = loadTs(new URL('../src/lib/finance/index.ts', import.meta.url))
const t = createSuite('savings')

// ---------------------------------------------------------------- inflation
t.section('inflate')
t.eq(fin.inflate(1000, 0, 12), 1000, '0% inflation changes nothing')
t.eq(fin.inflate(1000, 20, 0), 1000, 'zero months changes nothing')
// 20% a year compounded monthly for 12 months is (1 + 0.2/12)^12 = 1.21939…
t.close(fin.inflate(1_000_000, 20, 12), 1_219_391, '20% over 12 months', 1)
t.close(fin.inflate(5_000_000, 20, 18), 6_732_626.58, '₦5m goal 18 months out', 1)
t.ok(
  fin.inflate(1000, 20, 24) > fin.inflate(1000, 20, 12),
  'a longer horizon inflates further'
)
t.ok(
  fin.inflate(1000, 34, 12) > fin.inflate(1000, 20, 12),
  'a higher rate inflates further'
)
t.throws(() => fin.inflate(-1, 20, 12), 'negative amount', 'RangeError')
t.throws(() => fin.inflate(1000, -5, 12), 'negative inflation', 'RangeError')

t.section('discountToToday inverts inflate')
// Both tools have to agree on what money is worth, or the app contradicts
// itself between the Goal Saver and the Pension analyser.
for (const [amount, rate, months] of [
  [1_000_000, 20, 12],
  [5_000_000, 15, 60],
  [250_000, 34, 6],
  [80_000_000, 12, 300],
]) {
  const roundTripped = fin.discountToToday(
    fin.inflate(amount, rate, months),
    rate,
    months
  )
  t.close(
    roundTripped,
    amount,
    `${amount} at ${rate}% over ${months}mo round-trips`,
    0.02
  )
}
t.eq(fin.discountToToday(1000, 0, 120), 1000, '0% inflation discounts to itself')

// ---------------------------------------------------------------- goal saving
t.section('planGoal')
const goal = fin.planGoal({
  goalToday: 5_000_000,
  months: 18,
  annualInflationPct: 20,
})
t.close(goal.inflatedGoal, 6_732_626.58, 'inflated target', 1)
t.close(
  goal.inflationPremium,
  goal.inflatedGoal - 5_000_000,
  'premium is the difference from today’s price'
)
t.eq(goal.gap, goal.inflatedGoal, 'with nothing saved, the gap is the whole target')
t.ok(
  goal.monthlyContribution * 18 >= goal.gap,
  'saving the monthly amount for the full term reaches the target'
)
t.ok(
  (goal.monthlyContribution - 1) * 18 < goal.gap,
  '…and is not more than a naira per month over what is needed'
)
t.eq(goal.alreadyFunded, false, 'not yet funded')

t.section('planGoal — existing savings')
const partly = fin.planGoal({
  goalToday: 5_000_000,
  months: 18,
  annualInflationPct: 20,
  existingSavings: 2_000_000,
})
t.close(
  partly.gap,
  goal.inflatedGoal - 2_000_000,
  'existing savings come off the gap'
)
t.ok(
  partly.monthlyContribution < goal.monthlyContribution,
  'and lower the monthly contribution'
)

const funded = fin.planGoal({
  goalToday: 1_000_000,
  months: 12,
  annualInflationPct: 20,
  existingSavings: 5_000_000,
})
t.eq(funded.gap, 0, 'savings above the inflated goal leave no gap')
t.eq(funded.monthlyContribution, 0, '…and require no contribution')
t.eq(funded.alreadyFunded, true, '…and report as funded')

t.section('planGoal — the inflation premium is the point of the tool')
// Saving toward today's price is the mistake this tool exists to prevent.
const naive = 5_000_000 / 18
t.ok(
  goal.monthlyContribution > naive,
  `inflation-aware contribution (${goal.monthlyContribution}) exceeds the naive ` +
    `${Math.round(naive)} — saving toward today's price falls short`
)

t.throws(
  () => fin.planGoal({ goalToday: 0, months: 12, annualInflationPct: 20 }),
  'zero goal',
  'RangeError'
)
t.throws(
  () => fin.planGoal({ goalToday: 100, months: 0, annualInflationPct: 20 }),
  'zero months',
  'RangeError'
)

// ---------------------------------------------------------------- emergency fund
t.section('planEmergencyFund')
const ef = fin.planEmergencyFund({
  monthlyExpenses: 150_000,
  targetMonths: 3,
  currentSavings: 0,
  monthlySavings: 30_000,
})
t.eq(ef.target, 450_000, '3 months at ₦150k')
t.eq(ef.gap, 450_000, 'nothing saved yet')
t.eq(ef.monthsCovered, 0, 'covers no months')
t.eq(ef.monthsToTarget, 15, '₦30k/month closes ₦450k in 15 months')
t.eq(ef.fullyFunded, false, 'not funded')

const partial = fin.planEmergencyFund({
  monthlyExpenses: 150_000,
  targetMonths: 3,
  currentSavings: 300_000,
  monthlySavings: 30_000,
})
t.eq(partial.gap, 150_000, 'gap is the remainder')
t.eq(partial.monthsCovered, 2, '₦300k covers exactly 2 months of expenses')
t.eq(partial.monthsToTarget, 5, '…and 5 more months of saving closes it')

const done = fin.planEmergencyFund({
  monthlyExpenses: 150_000,
  targetMonths: 3,
  currentSavings: 600_000,
  monthlySavings: 30_000,
})
t.eq(done.gap, 0, 'over-funded leaves no gap')
t.eq(done.monthsToTarget, 0, 'no months needed')
t.eq(done.fullyFunded, true, 'reports funded')
t.eq(done.monthsCovered, 4, 'and reports the real coverage, not the capped target')

const stalled = fin.planEmergencyFund({
  monthlyExpenses: 150_000,
  targetMonths: 3,
  currentSavings: 0,
  monthlySavings: 0,
})
t.eq(
  stalled.monthsToTarget,
  null,
  'saving nothing never reaches the target — null, not Infinity or 0'
)

t.throws(
  () => fin.planEmergencyFund({ monthlyExpenses: 0, targetMonths: 3 }),
  'zero expenses',
  'RangeError'
)

// ---------------------------------------------------------------- projections
t.section('projectContributions')
const proj = fin.projectContributions({
  openingBalance: 0,
  monthlyContribution: 30_000,
  months: 12,
  annualReturnPct: 12,
})
// Ordinary annuity: FV = PMT × ((1+i)^n − 1) / i, derived independently.
const annuityFv = (pmt, ratePct, n) => {
  const i = ratePct / 100 / 12
  return (pmt * (Math.pow(1 + i, n) - 1)) / i
}
t.close(
  proj.finalBalance,
  annuityFv(30_000, 12, 12),
  'matches the closed-form annuity future value',
  1
)
t.eq(proj.totalContributed, 360_000, '12 × ₦30k contributed')
t.close(
  proj.investmentGrowth,
  proj.finalBalance - 360_000,
  'growth is the balance less what was put in'
)
t.eq(proj.monthlyBalances.length, 12, 'one balance per month')
t.ok(
  proj.monthlyBalances.every((b, i) => i === 0 || b > proj.monthlyBalances[i - 1]),
  'the balance rises every month'
)

t.section('projectContributions — opening balance compounds too')
const withOpening = fin.projectContributions({
  openingBalance: 1_000_000,
  monthlyContribution: 30_000,
  months: 12,
  annualReturnPct: 12,
})
t.close(
  withOpening.finalBalance,
  proj.finalBalance + 1_000_000 * Math.pow(1 + 0.12 / 12, 12),
  'opening balance grows at the same rate on top',
  1
)
t.eq(
  withOpening.totalContributed,
  360_000,
  'the opening balance is not counted as a contribution'
)

t.section('projectContributions — zero return is pure contribution')
const noReturn = fin.projectContributions({
  monthlyContribution: 30_000,
  months: 12,
  annualReturnPct: 0,
})
t.eq(noReturn.finalBalance, 360_000, 'no growth, just the contributions')
t.eq(noReturn.investmentGrowth, 0, 'no growth reported')

t.section('projectContributions — inflation discount')
const rsa = fin.projectContributions({
  monthlyContribution: 30_000,
  months: 300,
  annualReturnPct: 12,
  annualInflationPct: 15,
})
t.ok(
  rsa.balanceInTodaysMoney < rsa.finalBalance,
  `₦${Math.round(rsa.finalBalance)} nominal is ₦${Math.round(rsa.balanceInTodaysMoney)} ` +
    `in today's money — the gap is the whole point of showing both`
)
t.eq(
  rsa.balanceInTodaysMoney,
  fin.discountToToday(rsa.finalBalance, 15, 300),
  'the discounted figure uses the same function the goal tool inflates with'
)
// When returns trail inflation the real value falls — a projection that hid
// this would be actively misleading about a 25-year pension.
const losing = fin.projectContributions({
  monthlyContribution: 30_000,
  months: 300,
  annualReturnPct: 8,
  annualInflationPct: 20,
})
t.ok(
  losing.balanceInTodaysMoney < losing.totalContributed,
  'returns below inflation leave less purchasing power than was contributed'
)

t.throws(
  () => fin.projectContributions({ monthlyContribution: 100, months: 0, annualReturnPct: 5 }),
  'zero months',
  'RangeError'
)
t.throws(
  () =>
    fin.projectContributions({
      monthlyContribution: 100,
      months: 5000,
      annualReturnPct: 5,
    }),
  'a term past the 1200-month cap',
  'RangeError'
)

t.done()
