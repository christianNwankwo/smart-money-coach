// Refinance break-even.
//
// The interesting assertions are not the arithmetic — they are the cases where
// the two break-evens disagree, because that disagreement is the entire reason
// this tool exists. A refi that halves the payment and costs more money still
// shows a flattering cash-flow break-even.
import { createSuite } from './assert.mjs'
import { loadTs } from './tsload.mjs'

const fin = loadTs(new URL('../src/lib/finance/index.ts', import.meta.url))
const t = createSuite('refinance')

// 25 years into a 30-year note at 7%, offered 5.75% over a fresh 30 years.
const BASE = {
  currentBalance: 300_000,
  currentRatePct: 7,
  currentRemainingMonths: 300,
  newRatePct: 5.75,
  newTermMonths: 360,
  closingCosts: 6_000,
}

const r = fin.analyzeRefinance(BASE)

t.section('payments')
t.eq(
  r.currentPayment,
  fin.paymentFor(300_000, 7, 300),
  'current payment comes from the existing balance and remaining term'
)
t.eq(
  r.newPayment,
  fin.paymentFor(300_000, 5.75, 360),
  'new payment comes from the new rate and new term'
)
t.eq(
  r.monthlySavings,
  fin.roundCents(r.currentPayment - r.newPayment),
  'monthly saving is the difference'
)
t.ok(r.monthlySavings > 0, `saves $${r.monthlySavings.toFixed(2)}/month`)
t.eq(r.newLoanAmount, 300_000, 'costs paid in cash leave the balance alone')
t.eq(r.cashDueAtClose, 6_000, 'and $6,000 is due at closing')

t.section('cash-flow break-even')
t.eq(
  r.cashFlowBreakEvenMonths,
  Math.ceil(6_000 / r.monthlySavings),
  'closing costs divided by the monthly saving, rounded up'
)

t.section('total-cost break-even')
t.ok(
  r.totalCostBreakEvenMonths !== null,
  `refinancing pays for itself in month ${r.totalCostBreakEvenMonths}`
)
// Verify the search found the *first* crossing rather than any crossing: the
// inequality must hold on that month and fail on the one before it.
const cumInterest = (schedule, month) =>
  month <= 0 ? 0 : (schedule.rows[month - 1]?.cumulativeInterest ?? schedule.totalInterest)
const be = r.totalCostBreakEvenMonths
t.ok(
  cumInterest(r.newSchedule, be) + 6_000 <= cumInterest(r.currentSchedule, be),
  'refinancing has cost less by the break-even month'
)
t.ok(
  cumInterest(r.newSchedule, be - 1) + 6_000 > cumInterest(r.currentSchedule, be - 1),
  '…and had not the month before, so it is the first crossing'
)
t.ok(
  r.totalCostBreakEvenMonths > r.cashFlowBreakEvenMonths,
  `the honest break-even (${r.totalCostBreakEvenMonths} months) is later than the ` +
    `quoted one (${r.cashFlowBreakEvenMonths} months) — the new loan also pays ` +
    `principal down more slowly`
)

t.section('extending the term')
t.eq(r.extendsTerm, true, '300 months left, refinanced into 360')
t.eq(r.monthsAddedToPayoff, 60, 'five years added to the payoff date')

t.section('a refi that lowers the payment and costs more money')
// Same rate, fresh 30-year term, $6k of fees. The payment falls because the
// term is longer — and it is unambiguously a worse deal.
const worse = fin.analyzeRefinance({
  ...BASE,
  newRatePct: 7,
  newTermMonths: 360,
})
t.ok(worse.monthlySavings > 0, `payment still falls $${worse.monthlySavings.toFixed(2)}/month`)
t.ok(
  worse.cashFlowBreakEvenMonths !== null,
  `…and the quoted break-even looks fine at ${worse.cashFlowBreakEvenMonths} months`
)
t.eq(
  worse.totalCostBreakEvenMonths,
  null,
  'but it never breaks even on total cost, and the tool says so'
)
t.ok(
  worse.lifetimeInterestSaved < 0,
  `lifetime interest is $${Math.abs(worse.lifetimeInterestSaved).toFixed(0)} worse`
)

t.section('rolling the costs into the loan')
const rolled = fin.analyzeRefinance({ ...BASE, rollCostsIn: true })
t.eq(rolled.newLoanAmount, 306_000, 'the balance absorbs the fees')
t.eq(rolled.cashDueAtClose, 0, 'nothing due at closing')
t.eq(rolled.cashFlowBreakEvenMonths, 0, 'no cash out means instant cash-flow break-even')
t.ok(
  rolled.totalCostBreakEvenMonths > r.totalCostBreakEvenMonths,
  `financing the fees pushes the real break-even out from ` +
    `${r.totalCostBreakEvenMonths} to ${rolled.totalCostBreakEvenMonths} months — ` +
    `rolling costs in moves them, it does not remove them`
)
t.ok(
  rolled.newPayment > r.newPayment,
  'and the payment is higher, because the balance is'
)

t.section('a genuinely good refi')
const good = fin.analyzeRefinance({
  currentBalance: 300_000,
  currentRatePct: 7.5,
  currentRemainingMonths: 300,
  newRatePct: 5.25,
  newTermMonths: 300,
  closingCosts: 4_000,
})
t.eq(good.extendsTerm, false, 'same payoff date')
t.eq(good.monthsAddedToPayoff, 0, 'no months added')
t.ok(good.lifetimeInterestSaved > 0, `saves $${good.lifetimeInterestSaved.toFixed(0)} lifetime`)
t.ok(
  good.totalCostBreakEvenMonths <= good.cashFlowBreakEvenMonths,
  `with the term held constant the honest break-even (${good.totalCostBreakEvenMonths}) ` +
    `is no later than the quoted one (${good.cashFlowBreakEvenMonths})`
)

t.section('cost over the time you actually stay')
const stay = fin.analyzeRefinance({ ...BASE, monthsYouStay: 12 })
t.eq(stay.monthsYouStay, 12, 'one year')
t.eq(
  stay.costOverStay.saved,
  fin.roundCents(stay.costOverStay.staying - stay.costOverStay.refinancing),
  'saving over the window is the difference of the two net costs'
)
t.ok(
  stay.costOverStay.saved < 0,
  `moving after 12 months loses $${Math.abs(stay.costOverStay.saved).toFixed(0)} — ` +
    `short of the ${r.totalCostBreakEvenMonths}-month break-even`
)
// The sign has to flip exactly at the break-even month, or the two figures are
// describing different things.
const justBefore = fin.analyzeRefinance({ ...BASE, monthsYouStay: be - 1 })
const justAfter = fin.analyzeRefinance({ ...BASE, monthsYouStay: be })
t.ok(justBefore.costOverStay.saved < 0, `still behind at month ${be - 1}`)
t.ok(justAfter.costOverStay.saved >= 0, `ahead at month ${be} — the sign flips on break-even`)
const stayLong = fin.analyzeRefinance({ ...BASE, monthsYouStay: 300 })
t.ok(stayLong.costOverStay.saved > 0, 'staying 25 years comes out ahead')

t.section('breakEvenRate')
const target = 60
const rate = fin.breakEvenRate(BASE, target)
t.ok(rate !== null && rate < BASE.currentRatePct, `needs ${rate}% or better to break even in 5 years`)
const atRate = fin.analyzeRefinance({ ...BASE, newRatePct: rate })
t.ok(
  atRate.totalCostBreakEvenMonths !== null && atRate.totalCostBreakEvenMonths <= target,
  `${rate}% does break even within ${target} months (month ${atRate.totalCostBreakEvenMonths})`
)
const justAbove = fin.analyzeRefinance({ ...BASE, newRatePct: rate + 0.05 })
t.ok(
  justAbove.totalCostBreakEvenMonths === null ||
    justAbove.totalCostBreakEvenMonths > target,
  `…and ${(rate + 0.05).toFixed(3)}% does not, so the bisection found the edge`
)
t.eq(
  fin.breakEvenRate({ ...BASE, closingCosts: 250_000 }, 12),
  null,
  'fees no rate can repay in a year return null rather than a fake answer'
)

t.section('validation')
t.throws(() => fin.analyzeRefinance({ ...BASE, currentBalance: 0 }), 'zero balance', 'RangeError')
t.throws(
  () => fin.analyzeRefinance({ ...BASE, newTermMonths: 0 }),
  'zero new term',
  'RangeError'
)
t.throws(
  () => fin.analyzeRefinance({ ...BASE, closingCosts: -1 }),
  'negative closing costs',
  'RangeError'
)

t.done()
