// PITI and PMI.
//
// The PMI assertions are the point of this file. Three rules govern when the
// premium stops, they disagree with each other, and the one most people assume
// — "it comes off when I owe 80%" — is the one that does not happen by itself.
import { createSuite } from './assert.mjs'
import { loadTs } from './tsload.mjs'

const fin = loadTs(new URL('../src/lib/finance/index.ts', import.meta.url))
const t = createSuite('PITI + PMI')

// $400k house, 10% down, so PMI applies.
const BASE = {
  homePrice: 400_000,
  downPayment: 40_000,
  annualRatePct: 6.5,
  termMonths: 360,
  annualPropertyTax: 6_000,
  annualHomeInsurance: 1_800,
  monthlyHoa: 0,
  pmiAnnualRatePct: 0.5,
}

const p = fin.computePiti(BASE)

t.section('the components')
t.eq(p.loanAmount, 360_000, 'price less the down payment')
t.eq(p.ltvPct, 90, '90% loan-to-value')
t.eq(
  p.principalAndInterest,
  fin.paymentFor(360_000, 6.5, 360),
  'P&I matches the amortisation engine'
)
t.eq(p.propertyTax, 500, '$6,000 a year is $500 a month')
t.eq(p.homeInsurance, 150, '$1,800 a year is $150 a month')
t.eq(p.hoa, 0, 'no HOA')
t.eq(p.pmi, 150, 'PMI is 0.5% of the original loan, monthly')
t.eq(
  p.monthlyTotal,
  fin.roundCents(p.principalAndInterest + 500 + 150 + 0 + 150),
  'the total is the sum of its parts'
)
t.eq(
  p.monthlyTotalAfterPmi,
  fin.roundCents(p.monthlyTotal - p.pmi),
  'and drops by exactly the premium when PMI ends'
)
t.ok(
  p.monthlyTotal > p.principalAndInterest * 1.3,
  `escrow and PMI add ${(((p.monthlyTotal - p.principalAndInterest) / p.principalAndInterest) * 100).toFixed(0)}% ` +
    `to the payment — the gap between "the mortgage" and what leaves the account`
)

t.section('PMI: the three dates')
t.eq(p.pmiRequired, true, 'above 80% LTV at origination')
t.eq(p.pmiMidpointMonth, 180, 'halfway through a 360-month schedule')
t.ok(p.pmiRequestableMonth !== null, `requestable at 80% LTV in month ${p.pmiRequestableMonth}`)
t.ok(p.pmiAutomaticMonth !== null, `automatic at 78% LTV in month ${p.pmiAutomaticMonth}`)
t.ok(
  p.pmiRequestableMonth < p.pmiAutomaticMonth,
  'the borrower can ask before the servicer must act'
)
t.ok(
  p.pmiAutomaticMonth < p.pmiMidpointMonth,
  'both land before the midpoint on a normal 30-year loan'
)
t.eq(
  p.pmiEndsMonth,
  Math.min(p.pmiAutomaticMonth, p.pmiMidpointMonth),
  'left alone, PMI ends on the earlier of automatic and midpoint'
)

t.section('PMI: the thresholds are read off the original schedule')
const scheduled = fin.buildSchedule({
  principal: 360_000,
  annualRatePct: 6.5,
  termMonths: 360,
})
t.eq(
  p.pmiRequestableMonth,
  fin.monthBalanceReaches(scheduled, 400_000 * 0.8),
  '80% of the original value ($320,000), on the scheduled balance'
)
t.eq(
  p.pmiAutomaticMonth,
  fin.monthBalanceReaches(scheduled, 400_000 * 0.78),
  '78% of the original value ($312,000), on the scheduled balance'
)

// This is the rule people get wrong. Automatic termination is keyed to the
// original amortisation schedule, so paying extra principal reaches 78% of the
// house's value years earlier without moving the date the servicer must act.
const prepaid = fin.buildSchedule({
  principal: 360_000,
  annualRatePct: 6.5,
  termMonths: 360,
  extraMonthly: 500,
})
const prepaidReaches78 = fin.monthBalanceReaches(prepaid, 400_000 * 0.78)
t.ok(
  prepaidReaches78 < p.pmiAutomaticMonth,
  `$500/mo extra reaches 78% in month ${prepaidReaches78}, ` +
    `${p.pmiAutomaticMonth - prepaidReaches78} months before automatic termination`
)
t.eq(
  fin.computePiti(BASE).pmiAutomaticMonth,
  p.pmiAutomaticMonth,
  '…and the automatic date does not move, because the statute keys on the schedule'
)

t.section('PMI: what it costs and what asking saves')
t.eq(p.totalPmiPaid, fin.roundCents(150 * p.pmiEndsMonth), 'premium × months charged')
t.eq(
  p.pmiSavedByRequesting,
  fin.roundCents(150 * (p.pmiEndsMonth - p.pmiRequestableMonth)),
  'asking at 80% saves the premiums between the two dates'
)
t.ok(
  p.pmiSavedByRequesting > 1_000,
  `$${p.pmiSavedByRequesting.toFixed(0)} for making one phone call`
)

t.section('PMI: when it does not apply')
const twentyDown = fin.computePiti({ ...BASE, downPayment: 80_000 })
t.eq(twentyDown.ltvPct, 80, 'exactly 80% LTV')
t.eq(twentyDown.pmiRequired, false, 'no PMI at exactly 80% — the rule is *above* 80')
t.eq(twentyDown.pmi, 0, 'no premium')
t.eq(twentyDown.pmiEndsMonth, null, 'no end date, because there is nothing to end')
t.eq(twentyDown.pmiRequestableMonth, null, 'nothing to request')
t.eq(twentyDown.totalPmiPaid, 0, 'nothing paid')
t.eq(
  twentyDown.monthlyTotal,
  twentyDown.monthlyTotalAfterPmi,
  'the two totals are the same when there is no PMI'
)

const hair = fin.computePiti({ ...BASE, downPayment: 79_960 })
t.ok(hair.ltvPct > 80, `${hair.ltvPct}% LTV`)
t.eq(hair.pmiRequired, true, '…a hair above 80% and PMI applies')

const noPmiQuoted = fin.computePiti({ ...BASE, pmiAnnualRatePct: 0 })
t.eq(noPmiQuoted.pmiRequired, false, 'a 0% premium means no PMI even at 90% LTV')

t.section('PMI: the midpoint backstop')
// A 40-year term at a high rate against a 99% LTV loan amortises so slowly that
// 78% arrives after the halfway mark. The statute cancels at the midpoint
// regardless, and that is the branch this exercises.
const slow = fin.computePiti({
  homePrice: 400_000,
  downPayment: 4_000,
  annualRatePct: 12,
  termMonths: 480,
  annualPropertyTax: 6_000,
  annualHomeInsurance: 1_800,
  pmiAnnualRatePct: 1.2,
})
t.eq(slow.pmiMidpointMonth, 240, 'midpoint of a 480-month schedule')
t.ok(
  slow.pmiAutomaticMonth === null || slow.pmiAutomaticMonth > 240,
  `78% LTV is not reached until month ${slow.pmiAutomaticMonth ?? '(never)'}`
)
t.eq(slow.pmiEndsMonth, 240, 'so PMI ends at the midpoint instead')
t.eq(
  slow.totalPmiPaid,
  fin.roundCents(slow.pmi * 240),
  'and only 240 premiums are charged'
)

t.section('escrow extras')
const withHoa = fin.computePiti({ ...BASE, monthlyHoa: 275 })
t.eq(withHoa.hoa, 275, 'HOA passes through')
t.eq(
  withHoa.monthlyTotal,
  fin.roundCents(p.monthlyTotal + 275),
  'and lands in the total'
)

t.section('affordability ratios')
t.close(fin.frontEndRatio(2_400, 100_000), 0.288, 'housing / gross monthly income', 0.001)
t.close(
  fin.backEndRatio(2_400, 600, 100_000),
  0.36,
  'housing plus other debt / gross monthly income',
  0.001
)
t.eq(fin.frontEndRatio(2_400, 0), Infinity, 'no income is not a divide-by-zero')
t.eq(fin.backEndRatio(2_400, 600, 0), Infinity, 'same for the back-end ratio')

t.section('validation')
t.throws(
  () => fin.computePiti({ ...BASE, downPayment: 400_000 }),
  'putting the whole price down leaves no loan',
  'RangeError'
)
t.throws(() => fin.computePiti({ ...BASE, homePrice: 0 }), 'zero price', 'RangeError')
t.throws(() => fin.computePiti({ ...BASE, termMonths: 0 }), 'zero term', 'RangeError')
t.throws(
  () => fin.computePiti({ ...BASE, annualPropertyTax: -1 }),
  'negative tax',
  'RangeError'
)

t.section('appraised value below the purchase price')
// The rules use the value at origination, so an appraisal under the price
// raises the effective LTV and pushes both cancellation dates out.
const lowAppraisal = fin.computePiti({ ...BASE, originalValue: 370_000 })
t.ok(lowAppraisal.ltvPct > p.ltvPct, `LTV rises to ${lowAppraisal.ltvPct}%`)
t.ok(
  lowAppraisal.pmiAutomaticMonth > p.pmiAutomaticMonth,
  `automatic termination slips from month ${p.pmiAutomaticMonth} to ` +
    `${lowAppraisal.pmiAutomaticMonth}`
)
t.eq(
  lowAppraisal.pmi,
  p.pmi,
  'the premium itself is unchanged — it is a share of the loan, not the value'
)

t.done()
