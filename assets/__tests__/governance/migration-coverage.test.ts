/**
 * RFC §0 F3: a consumer who upgrades can look up every prop that left.
 *
 * `public-props.4fa2f77.json` freezes the props Face UI declared itself at
 * commit 4fa2f77, per component, compound part and sibling export, read the
 * way `componentParts` reads them now. A name in it that no longer reaches the
 * component needs a row in `migrations.json`; one that React's DOM attribute
 * types now supply still reaches it, so dropping its declaration is not a break.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, it } from 'vitest'

import type { Migration } from '../../../scripts/migrations/types'
import { COMPONENTS, componentParts, describeGate, filtered, repo } from './gates'

const read = (file: string) => JSON.parse(readFileSync(join(repo, file), 'utf8'))

/** Face UI's own props at 4fa2f77, by `Component`, `Component.Part` or exported name. */
const BASELINE: Record<string, readonly string[]> = read('assets/__tests__/governance/public-props.4fa2f77.json')

/** `Part.prop` for every row that retires a prop under that name. */
const DOCUMENTED = new Set(
  (read('migrations.json').migrations as Migration[]).flatMap((row) => {
    switch (row.kind) {
      case 'rename-prop':
      case 'move-to-labels':
      case 'text-to-children':
        return [`${row.component}.${row.from}`]
      case 'remove-prop':
        return [`${row.component}.${row.prop}`]
      default:
        return []
    }
  }),
)

/** The props each of a component's parts accepts today, inherited ones included. */
const partsOf = (name: string) =>
  new Map(componentParts(name).map((part) => [part.name, new Set(part.props.map((prop) => prop.name))]))

describeGate('props removed since 4fa2f77 have a migration row', [], (name) =>
  [...partsOf(name)].flatMap(([part, props]) =>
    (BASELINE[part] ?? [])
      .filter((prop) => !props.has(prop) && !DOCUMENTED.has(`${part}.${prop}`))
      .map((prop) => `${part}.${prop} no longer exists and migrations.json does not say so`),
  ),
)

it.skipIf(filtered)('keeps every documented part reachable, so no row is orphaned', () => {
  const parts = new Set(COMPONENTS.flatMap((name) => [...partsOf(name).keys()]))
  const gone = Object.keys(BASELINE).filter((part) => !parts.has(part))
  expect(gone, 'these parts vanished: document them with an `export` row and drop them from the baseline').toEqual([])
})
