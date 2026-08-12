/**
 * Runs every suite and reports a summary.
 *
 *   npm test
 *
 * Each suite is a standalone node script that exits non-zero on failure, so any
 * one of them can be run on its own while working on it:
 *
 *   node tests/amortization.test.mjs
 *
 * Suites are DISCOVERED from disk rather than listed here. A hardcoded list is
 * one edit away from silently dropping coverage — `savings.test.mjs` was written
 * with 55 checks and never added, so it sat in the directory not running while
 * `npm test` reported everything passing. Anything matching `*.test.mjs` runs.
 */
import { spawnSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const TESTS = fileURLToPath(new URL('.', import.meta.url))

// Fast unit suites first so a common failure surfaces quickly. Anything not
// named here still runs, alphabetically, after the ones that are.
const PREFERRED_ORDER = [
  'amortization.test.mjs',
  'savings.test.mjs',
  'debt-payoff.test.mjs',
  'refinance.test.mjs',
  'piti.test.mjs',
  'registry.test.mjs',
  'recommendation.test.mjs',
]

const discovered = readdirSync(TESTS)
  .filter((f) => f.endsWith('.test.mjs'))
  .sort()

const SUITES = [
  ...PREFERRED_ORDER.filter((s) => discovered.includes(s)),
  ...discovered.filter((s) => !PREFERRED_ORDER.includes(s)),
]

const missing = PREFERRED_ORDER.filter((s) => !discovered.includes(s))
if (missing.length) {
  console.log(`note: listed but not on disk: ${missing.join(', ')}\n`)
}

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
