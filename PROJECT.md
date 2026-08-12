# Smart Money Coach

Financial calculators that show their arithmetic. Every figure is computed in the
browser from numbers the visitor types — there is no backend, nothing is
uploaded, and the site is a folder of static HTML.

The differentiator is not the calculators, which are commodity, but that the
maths is **a tested library rather than a formula inlined into a form**, and that
each market gets the tools its readers actually need instead of a translated copy
of the US set.

---

## Current state

| | |
| --- | --- |
| Stack | Next.js 16 (App Router, static export) · TypeScript · Tailwind v4 |
| Markets | US (3 tools) · Nigeria (4 tools) |
| Tests | 7 suites, ~395 checks, all passing |
| Deployed | **No** — runs locally only |
| Repo | `christianNwankwo/smart-money-coach` |

**Working:** both market builds, all seven tools, dark mode, the tested finance
library, per-page metadata and JSON-LD, generated sitemap and service worker,
market-gated Quick Check, error boundaries, the market bundle split.

**Verified by measurement, not assumption:**

| Check | US build | Nigeria build |
| --- | --- | --- |
| Pages emitted | 7 | 8 |
| `/recommendation` links on home | 3 | 0 |
| US-only code in chunks (PMI, refinance, recommendation) | present | **0** |

**Not done:** no deployment, no CI, no browser-level tests, no Nigerian housing
tool, no Nigerian recommendation engine. See *Known gaps*.

---

## Markets

One codebase, one calculation engine, a different tool suite per market.

| | United States | Nigeria |
| --- | --- | --- |
| Currency | USD | NGN |
| Tools | Mortgage Deep Dive · Debt Payoff · Refinance Break-Even | Debt Payoff · Goal Saver · Emergency Fund · Pension CPS |
| Retirement | 401(k) / IRA, employer match | CPS / Retirement Savings Account |
| Housing | 30-year fixed, PMI, refinancing | *(no tool yet)* |
| Quick Check | Yes | No — no engine for this market |

A traditional 30-year mortgage is not how most Nigerians acquire housing, so the
mortgage and refinance tools are absent from that build rather than reworded.
Conversely Goal Saver and Pension CPS exist only for Nigeria. `Debt Payoff` is
shared — avalanche versus snowball is the same arithmetic everywhere, and only
the defaults, currency and copy differ.

---

## Running it

```bash
npm install
npm run dev            # US market, http://localhost:3000
npm run build          # US      → out/
npm run build:ng       # Nigeria → out/
npm run preview        # serve out/ on http://localhost:4173
npm test               # every suite
npm run typecheck
```

Both markets build into `out/`, so `npm run clean` runs first — otherwise the
previous market's chunks are left in the deployed directory.

---

## Architecture

```
src/
  lib/finance/        The calculation library. Pure, market-agnostic, tested.
    money.ts            rounding, rates, month arithmetic
    amortization.ts     payment, term, schedule, extra principal
    debt-payoff.ts      avalanche vs snowball
    refinance.ts        break-even, both kinds
    piti.ts             PITI and PMI (US Homeowners Protection Act)
    savings.ts          inflation, goals, emergency funds, contributions
  markets/
    types.ts          MarketConfig + registry types — the contract a market fulfils
    us.ts  ng.ts      currency, income tiers, retirement system, capabilities
    us/  ng/          registry.ts, tool-components.ts, QuickCheck.tsx, tools/
    active.ts         GENERATED — points at one market
  components/         Layout, ToolPage, charts, ErrorBoundary, MarketContext
  app/                Routes. Everything derives from the registry.
```

**The calculation library never branches on market.** It takes a balance, a rate
and a term and does arithmetic. What differs per market — the currency, realistic
rate ranges, what the pension is called — lives in the market config.

### Adding a tool

One entry in `src/markets/<id>/registry.ts`, one component in
`src/markets/<id>/tools/`, one line in that market's `tool-components.ts`.
Routing, the home grid, search, the related-tools rail, page metadata, the
sitemap and the JSON-LD all follow from the registry.

The registry type requires `how` and `faq`. Without them a tool page serves a
heading, a blurb and five sibling links, which is thin content by any measure.
`tests/registry.test.mjs` additionally asserts they are not stubs — a type can
require a field but not require it to say anything.

### Adding a market

1. `src/markets/<id>.ts` — a `MarketConfig`
2. `src/markets/<id>/registry.ts` — categories and tools
3. `src/markets/<id>/tool-components.ts` — the lazy import map
4. `src/markets/<id>/QuickCheck.tsx` — the recommendation panel, or a stand-in
5. Add the id to `MARKETS` in `tests/registry.test.mjs`

Step 5 is enforced: the suite reads `src/markets/` from disk and fails if a
directory is not under test, so a new market cannot ship untested.

### The generated barrel

`src/markets/active.ts` is written by `scripts/active-market.mjs` before every
build, dev run, typecheck and test. It names exactly one market.

This exists because the obvious approach does not work. Importing every market
and selecting one at runtime — `registries[MARKET]` — leaves both reachable, so
no bundler can drop the unused one and every market ships every other market's
code. Naming a single market in a generated file makes the others unreachable.

The same applies to the Quick Check panel, which is routed through the barrel
rather than imported by the route: a Server Component's static import is bundled
whether or not it renders, and `next/dynamic` does **not** code-split a Client
Component imported from a Server Component (the bundled Next docs say so
explicitly).

---

## Testing

```bash
npm test                    # all suites
node tests/piti.test.mjs    # one suite
```

Plain Node scripts — no framework, no config, no watch mode to fall out of sync.
`tests/tsload.mjs` transpiles the TypeScript with the compiler already in the
project and evaluates it, which is possible only because the finance library has
no React or framework imports.

| Suite | What it proves |
| --- | --- |
| `amortization` | Payments against published figures; the month-by-month loop against the **closed-form balance** `B(k) = P(1+i)^k − M((1+i)^k − 1)/i`; 2,000 fuzzed loans holding every invariant; 1,000 realistic loans landing exactly on maturity |
| `debt-payoff` | Ordering, rollover, per-account payoff — and a **differential check that one debt through the payoff planner matches the amortisation engine to the cent** |
| `refinance` | Both break-evens, the sign flipping exactly on the break-even month, and the case that matters: a refinance that lowers the payment and still costs more |
| `piti` | The three PMI dates, the midpoint backstop, and that extra principal does **not** move automatic cancellation |
| `savings` | `inflate` and `discountToToday` as exact inverses; contributions against the closed-form annuity future value |
| `registry` | Every market's registry against the same invariants, plus cross-market slug consistency |
| `recommendation` | Every section populated across profile shapes, including edge profiles |

### Testing notes

**Fuzz with a seeded generator.** The 2,000-loan sweep uses a fixed-seed LCG, so
a failure is reproducible rather than a story about a build that once went red.

**Assert the invariant, not the implementation.** Principal repaid sums to
exactly the loan; the balance never rises; every payment splits into interest
plus principal; total paid equals principal plus interest. None restate the code,
and all would catch a rewrite that broke it.

**Differential tests are worth more than more examples.** The month-by-month loop
is checked against the closed-form balance, and the debt planner against the
amortisation engine. A bug would have to be reproduced independently in algebra,
or in two separate implementations, to survive.

**Verify the claim, not the shape.** That `breakEvenRate` returns a rate
satisfying its own deadline; that `inflate` and `discountToToday` are exact
inverses; that every tool is findable by its own keywords. Each caught something.

**When my expected value disagreed with the library, the library was right —
twice.** Recompute independently before assuming the code is wrong.

**Grep the built output, and clean it first.** Bundle claims cannot be reasoned
about. And make sure the pattern can actually match — see *Current state*.

---

## Search and metadata

Each tool page carries its own `<title>`, description, Open Graph tags and
`WebApplication` + `FAQPage` JSON-LD, server-rendered into the static HTML so a
crawler reads it without executing JavaScript. `scripts/sitemap.mjs` writes
`sitemap.xml` and the service worker precache manifest from the registry after
each build, so neither can drift from the routes that exist.

A market without a Quick Check engine gets `noindex, nofollow` on that route and
no sitemap entry.

---

## Decisions worth not re-litigating

**Static export, not a server.** Every calculation runs in the browser from
numbers the visitor typed. Nothing needs a request-time runtime.

**`trailingSlash: true`.** Each route emits `<route>/index.html`, which every
static host serves without a rewrite rule. Without it, hosts that do not try
`$uri.html` return 404 on deep links.

**The payment rounds up; interest rounds to nearest.** Two different rules on
purpose, because that is what servicers do. See *Bugs found*.

**Total-cost break-even is the headline, not cash-flow break-even.** The usual
figure divides closing costs by the monthly saving and ignores that a fresh
30-year term pays principal down more slowly — so it flatters any refinance that
lowers the payment by re-extending the term. The honest comparison is cost over a
window: payments minus equity bought. For the current loan that reduces to
cumulative interest; for the new one the principal terms cancel and it becomes
cumulative interest plus closing costs, financed or not. Both are shown, because
the gap between them is the point.

**PMI cancellation is read off the original amortisation schedule.** Automatic
termination at 78% LTV is keyed by statute to the schedule the loan started with,
not the actual balance — so paying extra principal reaches the threshold years
earlier without moving the date the servicer must act. Modelling it off the real
balance is the standard bug, and it tells borrowers to wait for a date that will
not arrive. The three dates (requestable at 80%, automatic at 78%, midpoint
backstop) are reported separately because the actionable one is the first.

**The debt planner rolls cleared minimums forward.** When an account clears, its
minimum joins the money attacking the next debt. Both strategies do this. A plan
without it finishes years later — it is simply wrong about the payoff date.

**Avalanche vs snowball is reported, not resolved.** Avalanche always costs less
interest; that is arithmetic. Snowball clears an account sooner, and for many
people that is what keeps the plan alive. Showing both makes the trade explicit.
The tool does not make the choice.

**Markets get different tools, not translated ones.** A Nigerian visitor is not
looking for PMI cancellation dates. Rewording the US suite would have produced
four pages answering questions nobody asked.

**A market without a recommendation engine gets none.** `recommendation.ts`
reasons about 401(k) matching, mortgage prepayment and PMI. Running it elsewhere
would hand someone confident, specific advice about instruments they do not have
— worse than silence. `hasQuickCheck` gates the route, nav link, home card and
sitemap entry.

**The recommendation engine cites computed outcomes, not heuristics.** It
originally produced prose from classification tiers alone. Every figure now comes
from `lib/finance` run against the visitor's own numbers. The first-person voice
went with it — it reports what the arithmetic shows and labels scenarios as
illustrations.

**Tests are plain Node scripts.** No framework, no config. Each suite exits
non-zero on failure, which is all `npm test` and a CI job need. Possible only
because the finance library is pure — worth preserving.

---

## Bugs found, and how

Each was found by measuring rather than reading. The method matters more than the
fix, because the same method finds the next one.

**Rounding the payment down pushed loans past their own maturity.** The exact
payment on $300,000 at 6.5% is $1,896.2027. Rounded to nearest it becomes
$1,896.20, underpaying by a fraction every month and leaving $4.71 owing after
the 360th payment — so a "30-year" loan runs to 361 payments with a stub. Lenders
round **up** for this reason. Found by fuzzing 2,000 random loans: **572 ran a
month long.** No hand-written example would have surfaced it, because the
examples people reach for have clean numbers.

**A $0.01 payment in month 51.** After that fix, a second drift remained:
interest is rounded to the cent 49 times, and those roundings need not net out
against the fraction the payment was rounded up by. Every note covers this with
"the final payment will be the remaining unpaid balance", and the schedule now
does too — but only when the residual is under one instalment, because a larger
shortfall is not rounding, it is a payment that does not amortise the loan.

**The bisection returned a rate that missed its own deadline.** `breakEvenRate`
rounded its answer to three decimals; rounding *up* crossed back over the
threshold it had just found, returning 6.507% for a 60-month target that actually
breaks even in month 61. Flooring keeps it on the side known to work. Found by
the test asserting the returned rate satisfies the condition it claims to.

**Nigeria shipped an empty category.** The registry declared a `housing` category
with a blurb and no tools, so the home page rendered a heading above nothing.
Found the first time the registry suite iterated over every market.

**Every market shipped every other market's code.** The barrels imported all
markets and selected one with a runtime index. That leaves both branches
reachable, so no bundler can eliminate the unused one. Confirmed by grepping the
built chunks for `pmiRequestableMonth`: the Nigerian build contained the US
mortgage and PMI engine. Fixed by generating a barrel naming one market.

Two follow-ons came from the same grep. Importing one function through the
`@/lib/finance` barrel drags in every calculator it re-exports, so the Nigerian
tools now import from the specific module. And `out/` was not cleaned between
builds, so a previous market's chunks sat in the deployed directory — which also
meant the first measurement was of the wrong thing.

**A Server Component's static import is bundled whether or not it renders.**
Gating the recommendation route behind a config flag hid it from users but not
from the bundle: `page.tsx` still imported the client component at module top,
dragging the US engine into Nigeria. `next/dynamic` does not help — the bundled
docs state that automatic code splitting is **not supported** when a Server
Component dynamically imports a Client Component.

**The Quick Check flow had no entry point.** During the visual redesign the
financial form was dropped from the home page and nothing else imported it. The
recommendation page went on telling visitors to "complete the form on the
homepage", where there was no longer a form. Found by grepping for the component
name and getting one hit — its own definition.

**A test suite sat on disk not running.** `savings.test.mjs` was written with 55
checks and never added to the hardcoded list in `run-all.mjs`, so `npm test`
reported "all 6 suites pass" while ignoring it. The runner now discovers
`*.test.mjs` from disk. Any list that has to be kept in sync by hand eventually
is not.

**A verification grep that could never match.** The check confirming the Nigerian
home page carried no `/recommendation` links searched for `href="/recommendation"`.
Next renders links inside the RSC payload with escaped quotes, so that pattern
returns zero whether the link is present or not — the US page, which *does* link
there, also scored zero. Any grep asserting absence needs a positive control:
run it against the case that should match first.

---

## Known gaps

**No Nigerian housing tool.** Incremental building — land, then foundation, then
walls — is the dominant path to ownership and there is nothing for it. The
category was removed so the site is not broken; it comes back with the tool.

**No Nigerian recommendation engine.** Gated rather than faked.

**Untested in a browser.** Every suite is Node-only and covers the calculation
library and registry. There are no rendering, accessibility or interaction tests,
so charts, forms and dark mode are verified by eye. The toolbox project this
mirrors found seven accessibility failures and an idle render loop that no
DOM-based test could have caught — both classes of bug are live here.

**No deployment.** No host, no CI, no analytics, no Search Console.

**The service worker is untested against a real deployment.** Cache-first with no
versioning beyond a cache name; bumping `CACHE` invalidates everything, which is
blunt but correct. The toolbox project found its own service worker had never
once installed in production — that failure mode is only visible when deployed.
