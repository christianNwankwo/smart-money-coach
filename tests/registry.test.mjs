// The registry is plain data, so this suite loads it in Node. It checks that
// every invariant the type itself enforces actually holds: slugs are unique, every
// tool has a category that exists, every how step and FAQ answer has content, and
// the helper functions return what they promise.
import { createSuite } from './assert.mjs'
import { loadTs } from './tsload.mjs'

const reg = loadTs(new URL('../src/registry.ts', import.meta.url))
const t = createSuite('registry')

t.section('categories')
t.ok(reg.categories.length >= 1, 'at least one category')
t.ok(
  reg.categories.every((c) => c.id && c.label && c.blurb),
  'every category has an id, label and blurb'
)
const categoryIds = new Set(reg.categories.map((c) => c.id))
t.eq(
  categoryIds.size,
  reg.categories.length,
  'category ids are unique'
)

t.section('tools')
t.ok(reg.tools.length >= 3, 'at least three tools')
t.ok(
  reg.tools.every((t) => t.slug && t.title && t.blurb),
  'every tool has a slug, title and blurb'
)
t.ok(
  reg.tools.every((t) => t.keywords.length > 0),
  'every tool has at least one keyword'
)
t.ok(
  reg.tools.every((t) => categoryIds.has(t.category)),
  'every tool belongs to a category that exists'
)

const slugs = new Set(reg.tools.map((t) => t.slug))
t.eq(slugs.size, reg.tools.length, 'tool slugs are unique')

// The copy is required by the type so the page doesn't ship 20 words of unique
// text. This is the mechanical half of that check — a build-time scanner catches
// the rest.
t.ok(
  reg.tools.every((t) => t.how.length >= 2),
  'every tool has at least two how-to steps'
)
t.ok(
  reg.tools.every((t) => t.how.every((s) => s.length > 20)),
  'every how-to step has real content (is not a stub)'
)
t.ok(
  reg.tools.every((t) => t.faq.length >= 3),
  'every tool has at least three FAQ answers'
)
t.ok(
  reg.tools.every((t) => t.faq.every((f) => f.q.length > 5 && f.a.length > 20)),
  'every FAQ question and answer has real content'
)

t.section('getTool / toolsBySlug')
t.eq(reg.getTool('mortgage-deep-dive')?.slug, 'mortgage-deep-dive', 'finds a real tool')
t.eq(reg.getTool('nope'), undefined, 'returns undefined for a missing slug')
t.eq(
  reg.toolsBySlug.get('debt-payoff')?.title,
  'Debt Payoff',
  'toolsBySlug maps slugs to tools'
)

t.section('relatedTools')
// With 3 tools total, 'mortgage-deep-dive' has 2 related. The function returns
// what exists — it doesn't pad.
const related = reg.relatedTools('mortgage-deep-dive', 3)
t.ok(related.length >= 2, `returns ${related.length} related tools for a 3-tool suite`)
t.ok(
  related.every((r) => r.slug !== 'mortgage-deep-dive'),
  'does not include the tool itself'
)
t.eq(
  new Set(related.map((r) => r.slug)).size,
  related.length,
  'no duplicate slugs in related tools'
)

t.section('searchTools')
t.eq(reg.searchTools('mortgage').length, 2, 'finds two mortgage tools')
t.eq(reg.searchTools('avalanche').length, 1, 'finds the debt tool via keywords')
t.eq(reg.searchTools('').length, 3, 'empty query returns all tools')
t.eq(
  reg.searchTools('refinance').length,
  1,
  'finds the refinance tool by title'
)
t.eq(reg.searchTools('zzz-none').length, 0, 'no matches returns empty')

t.done()
