// Assertions shared by every suite.
//
// Deliberately tiny and dependency-free. The suites are plain node scripts that
// exit non-zero on failure, which is all a CI job needs and all `npm test`
// invokes — no runner, no config, no watch mode to get out of sync with.

export function createSuite(title) {
  let fails = 0
  let checks = 0
  console.log(`\n=== ${title} ===`)

  const record = (ok, msg, detail) => {
    checks++
    if (ok) {
      console.log('ok  ', msg)
    } else {
      fails++
      console.log('FAIL', msg, detail ? `→ ${detail}` : '')
    }
  }

  const api = {
    section(name) {
      console.log(`--- ${name} ---`)
    },

    /** Deep equality by JSON shape. */
    eq(actual, expected, msg) {
      record(
        JSON.stringify(actual) === JSON.stringify(expected),
        msg,
        `got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`
      )
    },

    /**
     * Equality within a tolerance. Default 0.005 — half a cent, so a figure
     * that rounds to the right cent passes and one that is a cent out does not.
     */
    close(actual, expected, msg, tolerance = 0.005) {
      const ok = Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance
      record(ok, msg, `got ${actual}, want ${expected} ±${tolerance}`)
    },

    ok(value, msg) {
      record(Boolean(value), msg, `got ${JSON.stringify(value)}`)
    },

    /** Asserts the callback throws, optionally of a named error class. */
    throws(fn, msg, name) {
      try {
        fn()
        record(false, msg, 'expected a throw, got a value')
      } catch (err) {
        if (name && err?.name !== name) {
          record(false, msg, `threw ${err?.name} (${err?.message}), want ${name}`)
        } else {
          record(true, `${msg} (throws${name ? ` ${name}` : ''})`)
        }
      }
    },

    done() {
      if (fails === 0) {
        console.log(`\n${title}: ALL ${checks} CHECKS PASS`)
      } else {
        console.log(`\n${title}: ${fails} of ${checks} CHECKS FAILED`)
      }
      process.exit(fails === 0 ? 0 : 1)
    },
  }

  return api
}
