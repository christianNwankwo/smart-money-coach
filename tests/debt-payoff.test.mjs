// Avalanche vs snowball.
//
// The load-bearing test here is the differential one: a single debt run through
// the payoff planner must produce exactly the schedule the amortisation engine
// produces for the same loan. They are separate implementations of the same
// arithmetic, so agreement to the cent over hundreds of months is strong
// evidence both are right, and any disagreement is a real difference in
// behaviour worth naming rather than averaging away.
import { createSuite } from './assert.mjs'
import { loadTs } from './tsload.mjs'

const fin = loadTs(new URL('../src/lib/finance/index.ts', import.meta.url))
const t = createSuite('debt payoff')

const DEBTS = [
  { id: 'card-a', name: 'Card A', balance: 8_000, annualRatePct: 22.99, minimumPayment: 200 },
  { id: 'card-b', name: 'Card B', balance: 2_500, annualRatePct: 15.99, minimumPayment: 75 },
  { id: 'auto', name: 'Auto loan', balance: 14_000, annualRatePct: 6.49, minimumPayment: 320 },
  { id: 'student', name: 'Student loan', balance: 22_000, annualRatePct: 5.5, minimumPayment: 240 },
]

// ---------------------------------------------------------------- ordering
t.section('payoffOrder')
t.eq(
  fin.payoffOrder(DEBTS, 'avalanche'),
  ['card-a', 'card-b', 'auto', 'student'],
  'avalanche runs highest rate first'
)
t.eq(
  fin.payoffOrder(DEBTS, 'snowball'),
  ['card-b', 'card-a', 'auto', 'student'],
  'snowball runs smallest balance first'
)
t.eq(
  fin.payoffOrder(
    [
      { id: 'big', name: 'big', balance: 9_000, annualRatePct: 10, minimumPayment: 50 },
      { id: 'small', name: 'small', balance: 1_000, annualRatePct: 10, minimumPayment: 50 },
    ],
    'avalanche'
  ),
  ['small', 'big'],
  'equal rates tie-break on balance, not on input order'
)
t.eq(
  fin.payoffOrder(
    [
      { id: 'low', name: 'low', balance: 5_000, annualRatePct: 4, minimumPayment: 50 },
      { id: 'high', name: 'high', balance: 5_000, annualRatePct: 19, minimumPayment: 50 },
    ],
    'snowball'
  ),
  ['high', 'low'],
  'equal balances tie-break on rate'
)

// ---------------------------------------------------------------- differential
t.section('differential: one debt vs the amortisation engine')
for (const [balance, rate, payment] of [
  [8_000, 22.99, 200],
  [14_000, 6.49, 320],
  [22_000, 5.5, 240],
  [1_200, 0, 100],
]) {
  const plan = fin.planPayoff({
    debts: [{ id: 'x', name: 'X', balance, annualRatePct: rate, minimumPayment: payment }],
    strategy: 'avalanche',
  })
  const schedule = fin.buildSchedule({
    principal: balance,
    annualRatePct: rate,
    payment,
  })
  t.eq(
    plan.monthsToDebtFree,
    schedule.monthsToPayoff,
    `$${balance} @ ${rate}% paying $${payment}: same number of months`
  )
  t.close(
    plan.totalInterest,
    schedule.totalInterest,
    `…and the same total interest ($${plan.totalInterest.toFixed(2)})`
  )
  t.close(
    plan.totalPaid,
    schedule.totalPaid,
    '…and the same total paid'
  )
}

// ---------------------------------------------------------------- the plans
t.section('avalanche vs snowball on the same four debts')
const cmp = fin.compareStrategies(DEBTS, 300)
const { avalanche, snowball } = cmp

t.eq(avalanche.monthlyBudget, 1135, 'budget is the minimums ($835) plus the extra ($300)')
t.eq(snowball.monthlyBudget, 1135, 'both strategies spend the same each month')
t.ok(
  avalanche.totalInterest <= snowball.totalInterest,
  `avalanche never costs more interest ($${avalanche.totalInterest.toFixed(0)} vs ` +
    `$${snowball.totalInterest.toFixed(0)})`
)
t.eq(
  cmp.interestSaved,
  fin.roundCents(snowball.totalInterest - avalanche.totalInterest),
  'reported saving is the difference between the two'
)
t.ok(cmp.interestSaved >= 0, `avalanche saves $${cmp.interestSaved.toFixed(2)}`)
t.eq(cmp.firstWin.snowball.name, 'Card B', 'snowball clears the smallest balance first')
t.eq(cmp.firstWin.avalanche.name, 'Card A', 'avalanche clears the highest rate first')
t.ok(
  cmp.firstWin.snowball.month <= cmp.firstWin.avalanche.month,
  `snowball's first win comes sooner (month ${cmp.firstWin.snowball.month} vs ` +
    `${cmp.firstWin.avalanche.month}) — the whole reason to consider it`
)

t.section('plan invariants')
for (const plan of [avalanche, snowball]) {
  const label = plan.strategy
  const startingTotal = DEBTS.reduce((s, d) => s + d.balance, 0)
  t.close(
    plan.totalPaid,
    fin.roundCents(startingTotal + plan.totalInterest),
    `${label}: total paid = balances + interest`
  )
  t.eq(
    plan.months.length,
    plan.monthsToDebtFree,
    `${label}: one row per month, ending on the debt-free month`
  )
  t.eq(
    plan.months.at(-1).totalBalance,
    0,
    `${label}: finishes at exactly zero`
  )
  t.ok(
    plan.months.every((m, i) => i === 0 || m.totalBalance <= plan.months[i - 1].totalBalance),
    `${label}: the combined balance never rises`
  )
  t.ok(
    plan.perDebt.every((d) => d.payoffMonth > 0 && d.payoffMonth <= plan.monthsToDebtFree),
    `${label}: every account has a payoff month inside the plan`
  )
  t.close(
    plan.perDebt.reduce((s, d) => fin.roundCents(s + d.totalInterest), 0),
    plan.totalInterest,
    `${label}: per-debt interest sums to the total`
  )
  // The rollover is the point: a cleared debt's minimum stays in the budget
  // rather than being pocketed, so every month except the last spends the full
  // amount. Without it both strategies would finish years later.
  const shortMonths = plan.months.filter(
    (m, i) => i < plan.months.length - 1 && Math.abs(m.paid - plan.monthlyBudget) > 0.005
  )
  t.eq(
    shortMonths.length,
    0,
    `${label}: every month before the last spends the whole budget (rollover works)`
  )
  t.ok(
    plan.months.at(-1).paid <= plan.monthlyBudget + 0.005,
    `${label}: the final month spends no more than the budget`
  )
}

t.section('extra payments move the needle')
const noExtra = fin.compareStrategies(DEBTS, 0)
t.ok(
  noExtra.avalanche.monthsToDebtFree > avalanche.monthsToDebtFree,
  `$300/mo extra cuts ${noExtra.avalanche.monthsToDebtFree - avalanche.monthsToDebtFree} ` +
    `months off (${noExtra.avalanche.monthsToDebtFree} → ${avalanche.monthsToDebtFree})`
)
t.ok(
  noExtra.avalanche.totalInterest > avalanche.totalInterest,
  `…and $${(noExtra.avalanche.totalInterest - avalanche.totalInterest).toFixed(0)} of interest`
)
t.ok(
  noExtra.avalanche.totalInterest <= noExtra.snowball.totalInterest,
  'avalanche still wins on interest with no extra payment'
)

t.section('a case where snowball costs real money')
// One big high-rate balance next to several small cheap ones is the shape that
// punishes the snowball: it spends a year clearing trivia while the expensive
// balance compounds.
const lopsided = [
  { id: 'big', name: 'Big card', balance: 18_000, annualRatePct: 26.99, minimumPayment: 450 },
  { id: 's1', name: 'Store card', balance: 600, annualRatePct: 5, minimumPayment: 25 },
  { id: 's2', name: 'Phone plan', balance: 900, annualRatePct: 4, minimumPayment: 40 },
  { id: 's3', name: 'Medical', balance: 1_200, annualRatePct: 0, minimumPayment: 50 },
]
const lop = fin.compareStrategies(lopsided, 250)
t.ok(
  lop.interestSaved > 100,
  `avalanche saves $${lop.interestSaved.toFixed(0)} here — enough to be worth saying out loud`
)
t.eq(lop.firstWin.snowball.name, 'Store card', 'snowball still gets the quick win')

// ---------------------------------------------------------------- edges
t.section('edge cases')
const none = fin.planPayoff({ debts: [], strategy: 'avalanche' })
t.eq(none.monthsToDebtFree, 0, 'no debts, no months')
t.eq(none.totalInterest, 0, 'no debts, no interest')
t.eq(none.months.length, 0, 'no debts, no rows')

const withZero = fin.planPayoff({
  debts: [
    { id: 'a', name: 'A', balance: 1_000, annualRatePct: 10, minimumPayment: 100 },
    { id: 'paid', name: 'Already paid', balance: 0, annualRatePct: 10, minimumPayment: 50 },
  ],
  strategy: 'avalanche',
})
t.eq(withZero.order, ['a'], 'a cleared account is dropped, not ordered')
t.eq(withZero.monthlyBudget, 100, '…and its minimum is not counted in the budget')

t.throws(
  () =>
    fin.planPayoff({
      debts: [
        { id: 'dup', name: 'A', balance: 100, annualRatePct: 5, minimumPayment: 50 },
        { id: 'dup', name: 'B', balance: 200, annualRatePct: 5, minimumPayment: 50 },
      ],
      strategy: 'avalanche',
    }),
  'duplicate ids',
  'RangeError'
)

t.throws(
  () =>
    fin.planPayoff({
      debts: [
        { id: 'x', name: 'Deep hole', balance: 20_000, annualRatePct: 24, minimumPayment: 100 },
      ],
      strategy: 'avalanche',
    }),
  'a minimum below the interest charge never clears',
  'UnpayableDebtError'
)

// The failure has to name the account — "it never pays off" is not actionable.
try {
  fin.planPayoff({
    debts: [
      { id: 'ok', name: 'Fine', balance: 500, annualRatePct: 5, minimumPayment: 100 },
      { id: 'bad', name: 'Runaway card', balance: 30_000, annualRatePct: 25, minimumPayment: 60 },
    ],
    strategy: 'snowball',
  })
  t.ok(false, 'expected UnpayableDebtError')
} catch (err) {
  t.eq(err.outstanding, ['Runaway card'], 'the error names the account that never clears')
}

t.section('zero-interest debts')
const interestFree = fin.planPayoff({
  debts: [
    { id: 'a', name: 'A', balance: 1_200, annualRatePct: 0, minimumPayment: 100 },
    { id: 'b', name: 'B', balance: 600, annualRatePct: 0, minimumPayment: 50 },
  ],
  strategy: 'avalanche',
  extraMonthly: 0,
})
t.eq(interestFree.totalInterest, 0, '0% charges nothing')
t.eq(interestFree.totalPaid, 1_800, 'and repays exactly the balances')
t.eq(interestFree.monthsToDebtFree, 12, '$150/mo clears $1,800 in 12 months')

t.done()
