// Amortisation: the scheduled payment, the schedule itself, and extra principal.
//
// Two ideas do most of the work here. The month-by-month loop is checked
// against the *closed form* balance B(k) = P(1+i)^k − M((1+i)^k − 1)/i, which is
// a completely separate derivation — a bug in the loop would have to be
// reproduced in algebra to survive. And the extra-payment path is checked
// against `termForPayment`, since paying the scheduled amount plus $200 every
// month is arithmetically the same loan as one whose payment is $200 higher.
import { createSuite } from './assert.mjs'
import { loadTs } from './tsload.mjs'

const fin = loadTs(new URL('../src/lib/finance/index.ts', import.meta.url))
const t = createSuite('amortisation')

// ---------------------------------------------------------------- money
t.section('roundCents')
t.eq(fin.roundCents(1.005), 1.01, '1.005 rounds up — the case naive v*100 gets wrong')
t.eq(fin.roundCents(2.675), 2.68, '2.675 rounds up')
t.eq(fin.roundCents(1625), 1625, 'whole dollars are untouched')
t.eq(fin.roundCents(0.1 + 0.2), 0.3, '0.1 + 0.2 lands on 0.30')
t.eq(fin.roundCents(-1.005), -1.01, 'negatives round away from zero')
t.eq(Object.is(fin.roundCents(-0.001), 0), true, 'no negative zero')
t.eq(fin.roundCents(1234.5678), 1234.57, 'rounds to the cent')

t.section('monthlyRate / splitMonths')
t.close(fin.monthlyRate(6.5), 0.0054166667, '6.5% → monthly', 1e-9)
t.eq(fin.monthlyRate(0), 0, 'zero stays zero')
t.eq(fin.splitMonths(27), { years: 2, months: 3 }, '27 months → 2y 3m')
t.eq(fin.splitMonths(0), { years: 0, months: 0 }, 'zero')

t.section('addMonths')
t.eq(
  fin.addMonths(new Date(2026, 0, 31), 1).getMonth(),
  1,
  '31 Jan + 1 month stays in February'
)
t.eq(
  fin.addMonths(new Date(2026, 0, 31), 1).getDate(),
  28,
  '…clamped to the 28th, not rolled into March'
)
t.eq(
  fin.addMonths(new Date(2024, 0, 31), 1).getDate(),
  29,
  'leap year gets the 29th'
)
t.eq(
  fin.addMonths(new Date(2026, 5, 15), 360).getFullYear(),
  2056,
  '360 months is 30 years'
)

// ---------------------------------------------------------------- paymentFor
t.section('ceilCents')
t.eq(fin.ceilCents(1896.2040704788958), 1896.21, 'the exact $300k @ 6.5% payment rounds up')
t.eq(fin.ceilCents(500), 500, 'an exact figure is not nudged up a cent')
t.eq(fin.ceilCents(0.001), 0.01, 'a fraction of a cent becomes a cent')
// Genuine double-precision noise, not a hand-written near-miss: 0.07 × 100 is
// 7.000000000000001 and 1.15 × 3 is 3.4499999999999997. Both must land on the
// cent they represent rather than being pushed to the next one.
t.eq(fin.ceilCents(0.07), 0.07, '0.07 × 100 overshoots in binary — not rounded up')
t.eq(fin.ceilCents(1.15 * 3), 3.45, '1.15 × 3 undershoots — still lands on 3.45')

t.section('paymentFor — published figures')
// Rounded up to the cent, which only changes the answer when the exact payment
// is not already inside the cent: 1896.2040… crosses, the other three do not.
t.eq(fin.paymentFor(300_000, 6.5, 360), 1896.21, '$300k @ 6.5% / 30yr (exact 1896.2040)')
t.eq(fin.paymentFor(250_000, 7, 360), 1663.26, '$250k @ 7% / 30yr (exact 1663.2562)')
t.eq(fin.paymentFor(400_000, 3.25, 360), 1740.83, '$400k @ 3.25% / 30yr (exact 1740.8252)')
t.eq(fin.paymentFor(200_000, 5.5, 180), 1634.17, '$200k @ 5.5% / 15yr (exact 1634.1669)')
t.eq(fin.paymentFor(24_000, 0, 48), 500, '0% is P/n, not a divide-by-zero')
t.eq(fin.paymentFor(0, 6.5, 360), 0, 'nothing owed, nothing due')
t.throws(() => fin.paymentFor(300_000, 6.5, 0), 'zero term', 'RangeError')
t.throws(() => fin.paymentFor(-1, 6.5, 360), 'negative principal', 'RangeError')
t.throws(() => fin.paymentFor(300_000, NaN, 360), 'NaN rate', 'RangeError')

t.section('termForPayment inverts paymentFor')
for (const [P, r, n] of [
  [300_000, 6.5, 360],
  [250_000, 7, 360],
  [200_000, 5.5, 180],
  [35_000, 9.9, 60],
  [15_000, 24.99, 36],
]) {
  const m = fin.paymentFor(P, r, n)
  t.eq(fin.termForPayment(P, r, m), n, `$${P} @ ${r}% round-trips through ${n} months`)
}
t.eq(fin.termForPayment(24_000, 0, 500), 48, '0% term')
t.eq(fin.termForPayment(24_000, 0, 700), 35, '0%, partial month counts as a payment')
t.throws(
  () => fin.termForPayment(300_000, 6.5, 1000),
  'payment below the interest charge',
  'NonAmortizingError'
)
t.throws(
  () => fin.termForPayment(300_000, 6.5, 1625),
  'payment exactly equal to the interest charge',
  'NonAmortizingError'
)

// ---------------------------------------------------------------- schedule
t.section('buildSchedule — $300k @ 6.5% / 30yr')
const base = fin.buildSchedule({
  principal: 300_000,
  annualRatePct: 6.5,
  termMonths: 360,
})
t.eq(base.payment, 1896.21, 'payment matches paymentFor')
t.eq(base.monthsToPayoff, 360, 'runs the full term')
t.eq(base.rows.length, 360, 'one row per payment')
t.eq(base.rows[0].interest, 1625, 'first month interest is balance × rate/12')
t.eq(base.rows[0].principal, 271.21, 'first month principal is the remainder')
t.eq(base.rows[0].endingBalance, 299_728.79, 'first month ending balance')
t.eq(base.rows[359].endingBalance, 0, 'ends at exactly zero')
t.ok(base.rows[359].payment < base.payment, 'final payment is trued up, not overpaid')
t.ok(
  base.rows[359].principal > base.rows[0].principal,
  'principal share grows over the term'
)
t.close(base.totalInterest, 382_635, 'total interest ≈ payment × 360 − principal', 10)

t.section('schedule invariants')
const sums = (s) =>
  s.rows.reduce(
    (acc, r) => ({
      principal: fin.roundCents(acc.principal + r.principal + r.extra),
      interest: fin.roundCents(acc.interest + r.interest),
      paid: fin.roundCents(acc.paid + r.payment + r.extra),
    }),
    { principal: 0, interest: 0, paid: 0 }
  )
const baseSums = sums(base)
t.close(baseSums.principal, 300_000, 'principal repaid sums to exactly the loan')
t.close(baseSums.interest, base.totalInterest, 'reported interest matches the rows')
t.close(baseSums.paid, base.totalPaid, 'reported total paid matches the rows')
t.close(
  base.totalPaid,
  fin.roundCents(300_000 + base.totalInterest),
  'total paid = principal + interest'
)
t.ok(
  base.rows.every((r) => r.endingBalance <= r.startingBalance),
  'the balance never rises'
)
t.ok(
  base.rows.every(
    (r) => Math.abs(fin.roundCents(r.payment - r.interest - r.principal)) < 0.005
  ),
  'every payment splits exactly into interest + principal'
)

t.section('differential: iterative loop vs closed-form balance')
// B(k) = P(1+i)^k − M((1+i)^k − 1)/i, derived independently of the loop.
const closedFormBalance = (P, ratePct, M, k) => {
  const i = ratePct / 100 / 12
  return P * Math.pow(1 + i, k) - (M * (Math.pow(1 + i, k) - 1)) / i
}
for (const [P, r, n] of [
  [300_000, 6.5, 360],
  [250_000, 7, 360],
  [180_000, 4.125, 240],
  [42_000, 11.5, 84],
]) {
  const s = fin.buildSchedule({ principal: P, annualRatePct: r, termMonths: n })
  let worst = 0
  for (let k = 1; k < n; k++) {
    const drift = Math.abs(s.rows[k - 1].endingBalance - closedFormBalance(P, r, s.payment, k))
    if (drift > worst) worst = drift
  }
  // Cent-rounding every month is the only source of divergence, so the gap is
  // pennies. A dollar of tolerance across 360 months would still catch any
  // structural error in the loop.
  t.ok(worst < 1, `$${P} @ ${r}%: max drift from closed form is ${worst.toFixed(4)} (< $1)`)
}

t.section('buildSchedule — edge cases')
const zeroRate = fin.buildSchedule({
  principal: 24_000,
  annualRatePct: 0,
  termMonths: 48,
})
t.eq(zeroRate.totalInterest, 0, '0% charges no interest')
t.eq(zeroRate.monthsToPayoff, 48, '0% runs the stated term')
t.eq(zeroRate.totalPaid, 24_000, '0% repays exactly the principal')

const paidOff = fin.buildSchedule({ principal: 0, annualRatePct: 6.5, termMonths: 360 })
t.eq(paidOff.rows.length, 0, 'a zero balance has no schedule')
t.eq(paidOff.monthsToPayoff, 0, '…and no months')

const byPayment = fin.buildSchedule({
  principal: 300_000,
  annualRatePct: 6.5,
  payment: 1896.21,
})
t.eq(byPayment.monthsToPayoff, 360, 'a supplied payment implies the same term')
t.eq(
  byPayment.rows.at(-1).payment,
  base.rows.at(-1).payment,
  '…and the same trued-up final payment'
)

// The residual absorbed at maturity must be a rounding artefact, never a real
// shortfall. This payment is $500 short every month for 49 months, which leaves
// far more than one instalment owing — so the schedule must run past maturity
// rather than quietly clearing a five-figure balance in the final month.
const shortPayment = fin.buildSchedule({
  principal: 737_116,
  annualRatePct: 4.28,
  termMonths: 49,
  payment: 15_922.72,
})
t.ok(
  shortPayment.monthsToPayoff > 49,
  `a payment short by more than one instalment is not absorbed at maturity ` +
    `(runs to ${shortPayment.monthsToPayoff} months)`
)
t.ok(
  shortPayment.rows[48].payment === 15_922.72,
  '…the maturity month pays the scheduled amount, not the whole balance'
)

t.throws(
  () => fin.buildSchedule({ principal: 300_000, annualRatePct: 6.5 }),
  'neither payment nor term supplied',
  'RangeError'
)
t.throws(
  () => fin.buildSchedule({ principal: 300_000, annualRatePct: 6.5, payment: 1200 }),
  'payment below the interest charge',
  'NonAmortizingError'
)
t.throws(
  () => fin.buildSchedule({ principal: 300_000, annualRatePct: 6.5, payment: 1626 }),
  'payment barely above interest — runs past the 1200-month cap',
  'NonAmortizingError'
)

// ---------------------------------------------------------------- prepayment
t.section('extra principal')
const extra200 = fin.comparePrepayment(
  { principal: 300_000, annualRatePct: 6.5, termMonths: 360 },
  { extraMonthly: 200 }
)
// Cross-check: paying 1896.21 + 200 every month is the same loan as one whose
// payment is 2096.21, which `termForPayment` solves in closed form.
t.eq(
  extra200.accelerated.monthsToPayoff,
  fin.termForPayment(300_000, 6.5, 2096.21),
  '$200/mo extra matches the closed-form term for a $2,096.21 payment'
)
t.ok(extra200.monthsSaved > 0, `saves ${extra200.monthsSaved} months`)
t.ok(extra200.interestSaved > 0, `saves $${extra200.interestSaved.toFixed(0)} interest`)
t.eq(
  extra200.baseline.payment,
  extra200.accelerated.payment,
  'the comparison holds the scheduled payment fixed'
)
t.close(
  sums(extra200.accelerated).principal,
  300_000,
  'accelerated schedule still repays exactly the loan'
)
t.close(
  extra200.savedPerExtraDollar,
  extra200.interestSaved / extra200.accelerated.totalExtra,
  'saved-per-dollar matches its parts'
)
t.ok(
  extra200.savedPerExtraDollar > 0 && extra200.savedPerExtraDollar < 3,
  `interest saved per extra dollar is ${extra200.savedPerExtraDollar.toFixed(2)} — plausible`
)

const noExtra = fin.comparePrepayment(
  { principal: 300_000, annualRatePct: 6.5, termMonths: 360 },
  {}
)
t.eq(noExtra.monthsSaved, 0, 'no extra saves no months')
t.eq(noExtra.interestSaved, 0, 'no extra saves no interest')
t.eq(noExtra.savedPerExtraDollar, 0, 'no divide-by-zero when nothing extra was paid')

t.section('one-time lump sums')
const lump = fin.buildSchedule({
  principal: 300_000,
  annualRatePct: 6.5,
  termMonths: 360,
  oneTimeExtras: [{ month: 1, amount: 50_000 }],
})
// Structural cross-check: month 1 plus a $50k lump leaves a balance that, at the
// same payment, must take exactly the same number of further months.
const afterMonthOne = fin.buildSchedule({
  principal: fin.roundCents(299_728.79 - 50_000),
  annualRatePct: 6.5,
  payment: 1896.21,
})
t.eq(
  lump.monthsToPayoff - 1,
  afterMonthOne.monthsToPayoff,
  'a lump at month 1 leaves the same remaining term as restarting from that balance'
)
t.eq(lump.rows[0].extra, 50_000, 'the lump lands on the month it was scheduled for')
t.eq(lump.rows[1].extra, 0, 'and only that month')
t.ok(lump.monthsToPayoff < 360, `payoff pulled in to ${lump.monthsToPayoff} months`)

const overpay = fin.buildSchedule({
  principal: 10_000,
  annualRatePct: 6.5,
  termMonths: 60,
  oneTimeExtras: [{ month: 2, amount: 999_999 }],
})
t.eq(overpay.monthsToPayoff, 2, 'an oversized lump clears the loan')
t.eq(overpay.rows[1].endingBalance, 0, 'and does not overshoot into a negative balance')
t.ok(
  overpay.rows[1].extra < 999_999,
  'the lump is capped at what was actually owed'
)

t.section('monthBalanceReaches')
t.eq(fin.monthBalanceReaches(base, 300_000), 1, 'already below at month 1')
t.eq(fin.monthBalanceReaches(base, 0), 360, 'zero is reached on the last month')
t.eq(fin.monthBalanceReaches(base, -1), null, 'unreachable target returns null')
t.ok(
  fin.monthBalanceReaches(base, 240_000) > 120,
  '80% of the balance takes more than 10 years at 6.5%'
)

// ---------------------------------------------------------------- fuzz
t.section('fuzz — 2,000 random loans hold every invariant')
// A seeded LCG, so a failure is reproducible rather than a story about a build
// that once went red.
let seed = 20260810
const rand = () => {
  seed = (seed * 1103515245 + 12345) % 2147483648
  return seed / 2147483648
}
let fuzzFails = 0
let worstDrift = 0
for (let n = 0; n < 2000; n++) {
  const principal = Math.round(1000 + rand() * 900_000)
  const rate = Math.round(rand() * 2400) / 100 // 0–24%, two decimals
  const term = 6 + Math.floor(rand() * 474) // 6–479 months
  const extraMonthly = rand() < 0.4 ? Math.round(rand() * 800) : 0

  let s
  try {
    s = fin.buildSchedule({
      principal,
      annualRatePct: rate,
      termMonths: term,
      extraMonthly,
    })
  } catch (err) {
    fuzzFails++
    console.log('   threw', err.name, err.message, { principal, rate, term, extraMonthly })
    continue
  }

  const repaid = s.rows.reduce(
    (acc, r) => fin.roundCents(acc + r.principal + r.extra),
    0
  )
  const drift = Math.abs(repaid - principal)
  if (drift > worstDrift) worstDrift = drift

  const problems = []
  if (drift > 0.005) problems.push(`repaid ${repaid} vs principal ${principal}`)
  if (s.rows[s.rows.length - 1].endingBalance !== 0) problems.push('does not end at zero')
  if (s.rows.some((r) => r.endingBalance > r.startingBalance)) problems.push('balance rose')
  if (s.rows.some((r) => r.interest < 0 || r.principal < 0)) problems.push('negative split')
  // Never longer than the stated term. It can be *shorter*: rounding the
  // payment up overpays by under a cent a month, which at 20%+ over 400+ months
  // compounds into several months of principal. That is arithmetic, not a bug,
  // so the invariant is one-sided — and the exact-term case is asserted below
  // over the range real loans actually occupy.
  if (s.monthsToPayoff > term) problems.push(`ran ${s.monthsToPayoff} vs term ${term}`)
  if (Math.abs(fin.roundCents(s.totalPaid - principal - s.totalInterest)) > 0.005) {
    problems.push('total paid ≠ principal + interest')
  }

  if (problems.length) {
    fuzzFails++
    console.log('   ', { principal, rate, term, extraMonthly }, problems.join('; '))
  }
}
t.eq(fuzzFails, 0, `2,000 random loans, 0 invariant violations (max drift ${worstDrift})`)

t.section('fuzz — realistic loans land on the stated term exactly')
// Rates and terms a US borrower can actually be offered. Here the cent the
// payment was rounded up by never accumulates to a whole month, so the schedule
// must finish on the maturity date and not a payment either side of it.
let termFails = 0
for (let n = 0; n < 1000; n++) {
  const principal = Math.round(5_000 + rand() * 1_500_000)
  const rate = Math.round(rand() * 1200) / 100 // 0–12%
  const term = [120, 180, 240, 360][Math.floor(rand() * 4)]
  const s = fin.buildSchedule({ principal, annualRatePct: rate, termMonths: term })
  if (s.monthsToPayoff !== term) {
    termFails++
    console.log('   ', { principal, rate, term }, `→ ${s.monthsToPayoff} months`)
  }
}
t.eq(termFails, 0, '1,000 realistic loans all finish on the maturity month')

t.done()
