// Every market's registry, checked against the same invariants.
//
// The earlier version of this suite loaded `src/registry.ts`, which resolves to
// whichever market the env var selects — so it only ever tested one, and the
// Nigerian registry shipped with no coverage at all. Markets are enumerated
// explicitly here: a new market that is not added to MARKETS below fails the
// first check rather than being silently skipped.
import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createSuite } from './assert.mjs'
import { loadTs } from './tsload.mjs'

const t = createSuite('registry')

const MARKETS = ['us', 'ng']

// The directory is the source of truth. If someone adds src/markets/uk/ without
// listing it here, this fails — which is the point.
const MARKETS_DIR = fileURLToPath(new URL('../src/markets/', import.meta.url))
const onDisk = readdirSync(MARKETS_DIR, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort()

t.section('market coverage')
t.eq(
  onDisk,
  [...MARKETS].sort(),
  `every market directory is under test (found: ${onDisk.join(', ')})`
)

for (const id of MARKETS) {
  const reg = loadTs(new URL(`../src/markets/${id}/registry.ts`, import.meta.url))
  const configModule = loadTs(new URL(`../src/markets/${id}.ts`, import.meta.url))
  const config = configModule[`${id}Market`]

  t.section(`${id} — config`)
  t.ok(config, `${id}: config exports ${id}Market`)
  t.eq(config.id, id, `${id}: config id matches its directory`)
  t.ok(config.currency.code.length === 3, `${id}: ISO currency code`)
  t.ok(config.currency.symbol.length > 0, `${id}: currency symbol`)
  t.ok(
    typeof config.hasQuickCheck === 'boolean',
    `${id}: declares whether it has a recommendation engine`
  )
  t.ok(
    config.incomeTiers.length === 3 &&
      config.incomeTiers.every((v, i, a) => i === 0 || v > a[i - 1]),
    `${id}: income tiers ascend`
  )
  t.ok(config.disclaimer.length > 40, `${id}: has a real disclaimer`)

  t.section(`${id} — categories`)
  t.ok(reg.categories.length >= 1, `${id}: at least one category`)
  t.ok(
    reg.categories.every((c) => c.id && c.label && c.blurb),
    `${id}: every category has an id, label and blurb`
  )
  const categoryIds = new Set(reg.categories.map((c) => c.id))
  t.eq(categoryIds.size, reg.categories.length, `${id}: category ids are unique`)
  // A category with no tools renders an empty heading on the home page.
  const usedCategories = new Set(reg.tools.map((tool) => tool.category))
  const empty = [...categoryIds].filter((c) => !usedCategories.has(c))
  t.eq(empty, [], `${id}: no category is left without tools`)

  t.section(`${id} — tools`)
  t.ok(reg.tools.length >= 1, `${id}: has tools`)
  t.ok(
    reg.tools.every((tool) => tool.slug && tool.title && tool.blurb),
    `${id}: every tool has a slug, title and blurb`
  )
  t.ok(
    reg.tools.every((tool) => /^[a-z0-9-]+$/.test(tool.slug)),
    `${id}: slugs are URL-safe`
  )
  t.eq(
    new Set(reg.tools.map((tool) => tool.slug)).size,
    reg.tools.length,
    `${id}: tool slugs are unique`
  )
  t.ok(
    reg.tools.every((tool) => categoryIds.has(tool.category)),
    `${id}: every tool belongs to a category that exists`
  )
  t.ok(
    reg.tools.every((tool) => tool.keywords.length > 0),
    `${id}: every tool has search keywords`
  )

  // The copy requirement is the whole reason `how` and `faq` are non-optional
  // on the type. This is the half a type cannot enforce: that they say anything.
  t.section(`${id} — required copy`)
  t.ok(
    reg.tools.every((tool) => tool.how.length >= 2),
    `${id}: every tool has at least two how-to steps`
  )
  t.ok(
    reg.tools.every((tool) => tool.how.every((s) => s.length > 20)),
    `${id}: no how-to step is a stub`
  )
  t.ok(
    reg.tools.every((tool) => tool.faq.length >= 3),
    `${id}: every tool has at least three FAQ entries`
  )
  t.ok(
    reg.tools.every((tool) =>
      tool.faq.every((f) => f.q.length > 5 && f.a.length > 20)
    ),
    `${id}: no FAQ question or answer is a stub`
  )

  t.section(`${id} — lookups`)
  const first = reg.tools[0]
  t.eq(reg.getTool(first.slug)?.slug, first.slug, `${id}: getTool finds a real tool`)
  t.eq(reg.getTool('does-not-exist'), undefined, `${id}: getTool misses cleanly`)
  t.eq(
    reg.toolsBySlug.size,
    reg.tools.length,
    `${id}: toolsBySlug indexes every tool`
  )

  const related = reg.relatedTools(first.slug, 3)
  t.ok(
    related.every((r) => r.slug !== first.slug),
    `${id}: relatedTools excludes the tool itself`
  )
  t.eq(
    new Set(related.map((r) => r.slug)).size,
    related.length,
    `${id}: relatedTools returns no duplicates`
  )
  t.ok(
    related.length === Math.min(3, reg.tools.length - 1),
    `${id}: relatedTools returns what exists without padding`
  )

  t.section(`${id} — search`)
  t.eq(reg.searchTools('').length, reg.tools.length, `${id}: empty query returns all`)
  t.eq(
    reg.searchTools('zzzz-no-such-tool').length,
    0,
    `${id}: an unmatched query returns nothing`
  )
  // Every tool must be reachable by its own title, or search is decorative.
  const unreachable = reg.tools.filter(
    (tool) => !reg.searchTools(tool.title).some((r) => r.slug === tool.slug)
  )
  t.eq(unreachable, [], `${id}: every tool is findable by its own title`)
  // And by at least one of its keywords.
  const unkeyworded = reg.tools.filter(
    (tool) =>
      !tool.keywords.some((k) =>
        reg.searchTools(k).some((r) => r.slug === tool.slug)
      )
  )
  t.eq(unkeyworded, [], `${id}: every tool is findable by its own keywords`)
}

// ---------------------------------------------------------------- cross-market
t.section('cross-market')
// A slug shared between markets must mean the same tool, because the URL is the
// same on both sites and a reader moving between them would otherwise land on
// something unrelated with a familiar address.
const bySlug = new Map()
for (const id of MARKETS) {
  const reg = loadTs(new URL(`../src/markets/${id}/registry.ts`, import.meta.url))
  for (const tool of reg.tools) {
    if (!bySlug.has(tool.slug)) bySlug.set(tool.slug, [])
    bySlug.get(tool.slug).push({ market: id, title: tool.title })
  }
}
const conflicting = [...bySlug.entries()]
  .filter(([, entries]) => entries.length > 1)
  .filter(([, entries]) => new Set(entries.map((e) => e.title)).size > 1)
  .map(([slug, entries]) => `${slug}: ${entries.map((e) => `${e.market}="${e.title}"`).join(' vs ')}`)
t.eq(conflicting, [], 'a shared slug means the same tool in every market')

const shared = [...bySlug.entries()].filter(([, e]) => e.length > 1).map(([s]) => s)
t.ok(
  shared.length > 0,
  `markets share ${shared.length} slug(s) (${shared.join(', ')}) — the shared engine is being reused`
)

t.done()
