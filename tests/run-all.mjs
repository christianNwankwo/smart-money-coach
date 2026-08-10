/**
 * Runs every suite and reports a summary.
 *
 *   npm test
 *
 * Each suite is a standalone node script that exits non-zero on failure, so any
 * one of them can be run on its own while working on it:
 *
 *   node tests/amortization.test.mjs
 */
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const TESTS = fileURLToPath(new URL('.', import.meta.url))

const SUITES = [
  'amortization.test.mjs',
  'debt-payoff.test.mjs',
  'refinance.test.mjs',
  'piti.test.mjs',
  'registry.test.mjs',
  'recommendation.test.mjs',
]

const results = []
for (const suite of SUITES) {
  const started = process.hrtime.bigint()
  const run = spawnSync(process.execPath, [path.join(TESTS, suite)], {
    stdio: 'inherit',
  })
  const ms = Number((process.hrtime.bigint() - started) / 1_000_000n)
  results.push({ suite, ok: run.status === 0, ms })
}

console.log('\n' + '='.repeat(52))
for (const { suite, ok, ms } of results) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${suite.padEnd(30)} ${String(ms).padStart(5)}ms`)
}
const failed = results.filter((r) => !r.ok)
console.log('='.repeat(52))
console.log(
  failed.length === 0
    ? `All ${results.length} suites pass.`
    : `${failed.length} of ${results.length} suites FAILED: ${failed.map((f) => f.suite).join(', ')}`
)
process.exit(failed.length === 0 ? 0 : 1)
