/**
 * RFC §0 D4: every production module is reachable from a package entry point
 * and every class a stylesheet defines is used by the library's source.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import { COMPONENTS, describeGate, eachNode, filtered, ownerOf, reachable, repo, SOURCES } from './gates'

const ENTRIES = ['index.ts', 'compat.ts', 'gallery.ts', 'uf.runtime.ts', 'face-ui-react.tsx']
const reached = reachable(ENTRIES)

const unreachableModules = (component: string) =>
  SOURCES.filter((path) => ownerOf(path) === component && !reached.has(path)).map(
    (path) => `${path}: not reachable from ${ENTRIES.join(', ')}`,
  )

// ---------------------------------------------------------------------------
// CSS classes: defined in assets/styles, used as a class token in the source

/**
 * Class tokens in the source's string and template literals; a token that
 * ends a template chunk before `${` or ends in `-`/`_` is a prefix of
 * computed names (`uf-button--${variant}`).
 */
function sourceTokens() {
  const tokens = new Set<string>()
  const prefixes: string[] = []
  for (const path of SOURCES)
    eachNode(path, (node) => {
      const open = ts.isTemplateHead(node) || ts.isTemplateMiddle(node)
      if (!(ts.isStringLiteralLike(node) || open || ts.isTemplateTail(node))) return
      const text = (node as ts.LiteralLikeNode).text
      const words = text.split(/\s+/).filter(Boolean)
      words.forEach((word) => tokens.add(word))
      const last = words.at(-1)
      // `uf-` alone would make every class computed; a prefix must name a block.
      if (last && last.length > 3 && ((open && !/\s$/.test(text)) || /[-_]$/.test(last)))
        prefixes.push(last)
    })
  return { tokens, prefixes }
}
const { tokens, prefixes } = sourceTokens()
/** Density containers consumers put on their own elements (public CSS API). */
const CONSUMER_CLASSES = new Set(['uf-compact', 'uf-large'])
const isUsed = (name: string) =>
  CONSUMER_CLASSES.has(name) || tokens.has(name) || prefixes.some((prefix) => name.startsWith(prefix))

const stylesDir = join(repo, 'assets/styles')
/** Classes named in a stylesheet's selectors (not in declarations or at-rule preludes). */
function definedClasses(file: string): string[] {
  const css = readFileSync(join(stylesDir, file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
  const classes = new Set<string>()
  for (const [, selector] of css.matchAll(/([^{};]+)\{/g))
    if (!selector!.trim().startsWith('@'))
      for (const [, name] of selector!.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) classes.add(name!)
  return [...classes]
}
const deadClasses = (file: string) =>
  definedClasses(file)
    .filter((name) => !isUsed(name))
    .map((name) => `${file}: .${name} is never rendered`)

const STYLESHEETS = [
  ...readdirSync(stylesDir).filter((file) => file.endsWith('.css')),
  ...readdirSync(join(stylesDir, 'components')).map((file) => `components/${file}`),
]
const kebab = (name: string) => name.replace(/[a-z0-9](?=[A-Z])/g, '$&-').toLowerCase()
/** The stylesheets a component owns: `components/<kebab-name>.css`, and `text.css` for Text. */
const stylesheetsOf = (component: string) =>
  [`components/${kebab(component)}.css`, ...(component === 'Text' ? ['text.css'] : [])].filter(
    (file) => STYLESHEETS.includes(file),
  )

// ---------------------------------------------------------------------------

/** Components that still violate each rule; only the wave-closing WP edits these, and they only shrink. */
const PENDING = {
  modules: [],
  css: ['Carousel'],
} satisfies Record<string, readonly string[]>

describeGate('reachability: component modules', PENDING.modules, unreachableModules)
describeGate('reachability: component CSS classes', PENDING.css, (component) =>
  stylesheetsOf(component).flatMap(deadClasses),
)

/** Shared modules and shared-stylesheet classes not yet used; the lists only shrink. */
const PENDING_SHARED = {
  modules: [],
  classes: [
    'animations.css: .uf-animated is never rendered',
    'base.css: .is-active is never rendered',
  ],
} satisfies Record<string, readonly string[]>

describe.skipIf(filtered)('reachability: shared code', () => {
  it('reaches every shared module from an entry point', () => {
    const unreached = SOURCES.filter((path) => !ownerOf(path) && !reached.has(path))
    expect(unreached, 'unreachable shared modules (pending entries that are now reached must be removed)').toEqual(
      [...PENDING_SHARED.modules].sort(),
    )
  })

  it('uses every class of the shared stylesheets', () => {
    const owned = new Set(COMPONENTS.flatMap(stylesheetsOf))
    const dead = STYLESHEETS.filter((file) => !owned.has(file)).flatMap(deadClasses).sort()
    expect(dead, 'dead shared classes (pending entries that are now used must be removed)').toEqual(
      [...PENDING_SHARED.classes].sort(),
    )
  })
})
