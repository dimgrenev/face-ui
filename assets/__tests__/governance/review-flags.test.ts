import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import registry from '../../../component-registry.json'

/**
 * `a11yReviewed` claims a component was checked for accessibility, so the claim
 * has to name the checks that prove it: axe over its gallery scenarios, and —
 * when its contract declares keyboard interaction — a browser test that drives
 * that keyboard. A flag without those specs is a truth claim nothing verifies.
 */
const root = join(import.meta.dirname, '../../..')
const browser = join(root, 'assets/__tests__/browser')
const specs = Object.fromEntries(
  readdirSync(browser)
    .filter((file) => file.endsWith('.spec.ts'))
    .map((file) => [file, readFileSync(join(browser, file), 'utf8')]),
)
const components = Object.entries(registry.components) as [
  string,
  { a11yReviewed?: boolean; status?: string },
][]
const keyboardOf = (name: string): number =>
  Object.keys(
    JSON.parse(readFileSync(join(root, name, `${name}.json`), 'utf8'))
      .keyboard ?? {},
  ).length
const focusTests = Object.entries(specs).filter(([, source]) =>
  source.includes('@focus'),
)

describe('review flags are backed by specs', () => {
  it('runs axe over every registry component', () => {
    // The axe suite iterates the registry itself, so coverage cannot drift.
    const source = specs['a11y.spec.ts'] ?? ''
    expect(source).toMatch(/component-registry\.json/)
    expect(source).toMatch(/Object\.entries\(registry\.components\)/)
    expect(source).not.toMatch(/test\.skip|test\.fixme/)
  })

  it.each(components.filter(([, entry]) => entry.a11yReviewed))(
    '%s declares keyboard interaction only with a @focus spec that drives it',
    (name) => {
      if (keyboardOf(name) === 0) return
      const covering = focusTests.filter(([file, source]) =>
        file ===
        `${name.replace(/(?<!^)(?=[A-Z])/g, '-').toLowerCase()}.spec.ts`
          ? true
          : new RegExp(`\\b${name}\\b`).test(source),
      )
      expect(covering.map(([file]) => file)).not.toEqual([])
    },
  )

  it('keeps every flag a claim about a live component', () => {
    const stale = components.filter(
      ([, entry]) => entry.a11yReviewed && entry.status === 'deprecated',
    )
    expect(stale.map(([name]) => name)).toEqual([])
  })
})
