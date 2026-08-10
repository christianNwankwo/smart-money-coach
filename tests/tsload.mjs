// Transpile a project .ts module with the TypeScript compiler that ships with
// the project, evaluate it, and return its exports.
//
// The finance library is plain TypeScript with no React and no framework
// imports, which is the whole reason it can be tested this way — in Node, in
// milliseconds, with no bundler and no browser. Relative imports between src
// modules are resolved and transpiled too, as is the `@/` alias from
// tsconfig.json, so the tests never dictate how the source is organised.
import { readFileSync, existsSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const require = createRequire(new URL('../package.json', import.meta.url))
const ts = require('typescript')

const SRC = fileURLToPath(new URL('../src/', import.meta.url))

/** Keyed by absolute path, so a module shared by two importers evaluates once. */
const cache = new Map()

export function loadTs(target) {
  const file = resolveModule(
    path.resolve(target instanceof URL ? fileURLToPath(target) : String(target))
  )
  if (!file) throw new Error(`tsload: no such module: ${target}`)

  const cached = cache.get(file)
  if (cached) return cached

  const js = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText

  const module = { exports: {} }
  // Cached before evaluation so an import cycle sees the partial exports object
  // rather than recursing until the stack runs out.
  cache.set(file, module.exports)

  const localRequire = (specifier) => {
    if (specifier.startsWith('@/')) {
      return loadTs(path.join(SRC, specifier.slice(2)))
    }
    if (!specifier.startsWith('.')) return require(specifier)
    return loadTs(path.resolve(path.dirname(file), specifier))
  }

  new Function('exports', 'module', 'require', js)(module.exports, module, localRequire)

  // `module.exports = ...` replaces the object, so re-cache what evaluation left.
  cache.set(file, module.exports)
  return module.exports
}

function resolveModule(base) {
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    path.join(base, 'index.ts'),
    path.join(base, 'index.tsx'),
  ]
  return candidates.find((c) => {
    if (!c.endsWith('.ts') && !c.endsWith('.tsx')) return false
    return existsSync(c) && statSync(c).isFile()
  })
}
