import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { libraryCss, stylesDir } from './harness/css'

const read = (file: string) => readFileSync(join(stylesDir, file), 'utf8')
const stripComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '')

const IMPORT = /^@import "(\.\/[a-z0-9/-]+\.css)";$/
const entryLines = stripComments(read('components.css'))
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean)
const imports = entryLines.map((line) => IMPORT.exec(line)?.[1] ?? line)
const componentFiles = readdirSync(join(stylesDir, 'components')).sort()

describe('components.css import list (import order = cascade order)', () => {
  it('contains only @import statements', () => {
    expect(entryLines.filter((line) => !IMPORT.test(line))).toEqual([])
  })

  it('imports text.css first and interaction.css last', () => {
    expect(imports[0]).toBe('./text.css')
    expect(imports.at(-1)).toBe('./components/interaction.css')
  })

  it('resolves every import, without duplicates', () => {
    expect(
      imports.filter((file) => !existsSync(join(stylesDir, file))),
    ).toEqual([])
    expect(new Set(imports).size).toBe(imports.length)
  })

  it('leaves no orphan in components/', () => {
    const imported = new Set(imports)
    expect(
      componentFiles.filter((file) => !imported.has(`./components/${file}`)),
    ).toEqual([])
  })

  it('keeps components/ free of @import and url() (flattening must not move relative URLs)', () => {
    const offenders = componentFiles.filter((file) =>
      /@import|url\(/.test(stripComments(read(`components/${file}`))),
    )
    expect(offenders).toEqual([])
  })

  it('flattens into one stylesheet', () => {
    expect(stripComments(libraryCss())).not.toMatch(/@import/)
  })
})

/**
 * A rule belongs to the file named after the component it styles, so that
 * changing one component means opening one file (RFC §7.4). A selector proves
 * ownership by naming its owner's scope — `[data-scope="x"]` or `.uf-x…` —
 * anywhere in the selector, subject or ancestor.
 */
const OWNED_BY = (file: string) => {
  const owner = file.replace('.css', '')
  return [
    `data-scope="${owner}"`,
    `.uf-${owner}`,
    `.uf-${owner.replace(/-([a-z])/g, (_, c) => c.toUpperCase())}`,
  ]
}

/**
 * Every exception, with the reason it is one. Anything not listed here has to
 * move to its owner's file; this list is the argument for why a rule cannot.
 */
const ALLOWED: Record<string, { reason: string; selectors: RegExp }> = {
  // Components whose DOM predates the file name.
  'panel.css': {
    reason:
      'Panel renders the sidebar anatomy: data-scope="sidebar", .uf-sidebar-*',
    selectors: /\.uf-sidebar|data-scope="sidebar"/,
  },
  'button.css': {
    reason:
      'Button is the only component that renders .uf-spinner, and its --uf-spinner-* tokens are declared in Button.json',
    selectors: /^\.uf-spinner(--small)?$/,
  },
  'segmented-control.css': {
    reason: 'SegmentedControl renders data-scope="toggle" and .uf-toggle-*',
    selectors: /\.uf-toggle|data-scope="toggle"/,
  },
  'sheet.css': {
    reason:
      'the responsive sheet chrome is .uf-responsive-*, shared by every overlay that becomes a sheet',
    selectors: /\.uf-responsive-/,
  },
  // Files that are a shared concern by design, not a component.
  'icon.css': {
    reason:
      'one indicator icon, rendered by the three components that have one; three copies of the rule would be the duplication the split exists to remove',
    selectors: /\[data-part="indicator"\]/,
  },
  'interaction.css': {
    reason:
      'the cross-component file: focus, hidden parts and control weight belong to no single scope',
    selectors:
      /\[data-scope\]\[data-part\]|\.uf-control\[data-scope\]|\.uf-option\[data-scope\]/,
  },
}

/**
 * A direction boundary carries no component of its own: `:where([dir=…])` sets
 * a custom property the owner's rules read, and the property names it.
 */
const DIRECTION = /^:where\(\[dir="(ltr|rtl)"\]\)$/

describe('components/<x>.css owns what it styles', () => {
  const splitSelectors = (list: string) => {
    const out: string[] = []
    let depth = 0
    let current = ''
    for (const char of list) {
      if (char === '(' || char === '[') depth++
      else if (char === ')' || char === ']') depth--
      if (char === ',' && depth === 0) {
        out.push(current)
        current = ''
      } else current += char
    }
    return [...out, current]
      .map((selector) => selector.trim().replace(/\s+/g, ' '))
      .filter(Boolean)
  }

  /** Rules of one file as [selector, declarations], at-rules flattened. */
  const rules = (css: string): [string, string][] => {
    const out: [string, string][] = []
    const walk = (source: string) => {
      let depth = 0
      let start = 0
      for (let i = 0; i < source.length; i++) {
        if (source.startsWith('/*', i)) {
          i = source.indexOf('*/', i + 2) + 1
          continue
        }
        if (source[i] === '{') depth++
        else if (source[i] === '}' && --depth === 0) {
          const block = source.slice(start, i + 1)
          const open = block.indexOf('{')
          const prelude = stripComments(block.slice(0, open)).trim()
          const body = block.slice(open + 1, block.length - 1)
          if (prelude.startsWith('@keyframes')) {
            /* a frame is a percentage, not a selector */
          } else if (prelude.startsWith('@')) walk(body)
          else
            for (const selector of splitSelectors(prelude))
              out.push([selector, body])
          start = i + 1
        }
      }
    }
    walk(css)
    return out
  }

  for (const file of componentFiles) {
    const owners = OWNED_BY(file)
    const allowed = ALLOWED[file]
    it(`${file}${allowed ? ` (exception: ${allowed.reason})` : ''}`, () => {
      const foreign = rules(read(`components/${file}`)).filter(
        ([selector, body]) => {
          if (owners.some((owner) => selector.includes(owner))) return false
          if (allowed?.selectors.test(selector)) return false
          // A direction boundary is owned when it only sets the owner's tokens.
          if (DIRECTION.test(selector))
            return !body
              .split(';')
              .filter((declaration) => declaration.trim())
              .every((declaration) =>
                declaration
                  .trim()
                  .startsWith(`--uf-${file.replace('.css', '')}-`),
              )
          return true
        },
      )
      expect(foreign.map(([selector]) => selector)).toEqual([])
    })
  }
})

/**
 * A component's stylesheet stays small enough to read in one sitting (RFC §0
 * D4). Generated files are exempt: their size is the generator's decision.
 */
describe('authored stylesheets stay readable', () => {
  const GENERATED = new Set(['tokens.css'])
  const LIMIT = 450
  const authored = [
    ...componentFiles.map((file) => `components/${file}`),
    'text.css',
    'base.css',
    'animations.css',
    'component-tokens.css',
    'tokens.css',
  ]

  it.each(
    authored.filter((file) => !GENERATED.has(file.replace('components/', ''))),
  )(`%s is at most ${LIMIT} lines`, (file) => {
    expect(read(file).split('\n').length).toBeLessThanOrEqual(LIMIT)
  })
})
