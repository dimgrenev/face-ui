import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import type { Migration } from './migrations/types'

const ROOT = path.resolve(import.meta.dirname, '..')
const MIGRATIONS = path.join(ROOT, 'scripts/migrations')
const RELEASE = '0.2.0 (unreleased)'
const ROW_FILE = /^(_all|[A-Z][A-Za-z]*)\.ts$/

/** Migration rows grouped by their source file; `_all` comes first, then components alphabetically. */
export interface MigrationSection {
  /** File name without extension: a component name or `_all`. */
  name: string
  /** Rows in authored order, which is also the order the codemod applies them. */
  migrations: Migration[]
}

/** Loads every `scripts/migrations/<Name>.ts` found by walking the directory. */
export async function loadMigrationSections(directory = MIGRATIONS): Promise<MigrationSection[]> {
  const names = readdirSync(directory)
    .filter((file) => ROW_FILE.test(file))
    .map((file) => file.slice(0, -3))
    .sort((a, b) => (a === '_all' ? -1 : b === '_all' ? 1 : a < b ? -1 : a > b ? 1 : 0))
  const sections: MigrationSection[] = []
  const seen = new Set<string>()
  for (const name of names) {
    const module = (await import(pathToFileURL(path.join(directory, `${name}.ts`)).href)) as {
      default: Migration[]
    }
    for (const row of module.default) {
      const component = 'component' in row ? row.component : undefined
      const owner = component?.split('.')[0]
      if (owner && name !== '_all' && owner !== name)
        throw new Error(`${name}.ts: ${row.kind} row for ${component} belongs in ${owner}.ts`)
      const id = JSON.stringify(row)
      if (seen.has(id)) throw new Error(`${name}.ts: duplicate row ${id}`)
      seen.add(id)
    }
    sections.push({ name, migrations: module.default })
  }
  return sections
}

/** Loads all migration rows in codemod order. */
export async function loadMigrations(directory?: string): Promise<Migration[]> {
  return (await loadMigrationSections(directory)).flatMap((section) => section.migrations)
}

const code = (text: string) => `\`${text}\``
const cell = (text: string) => text.replace(/\|/g, '\\|')

function describe(row: Migration, section: MigrationSection): [string, string, string] {
  const scope = (component: string) => (component === section.name ? '' : `${component} `)
  switch (row.kind) {
    case 'rename-prop':
      return [code(`${scope(row.component)}${row.from}`), code(row.to), row.codemod]
    case 'remove-prop':
      return [code(`${scope(row.component)}${row.prop}`), row.use, row.codemod]
    case 'rename-value': {
      // Values of a renamed prop read best under the name they were written with.
      const renamed = section.migrations.find(
        (other) => other.kind === 'rename-prop' && other.component === row.component && other.to === row.prop,
      )
      const before = renamed?.kind === 'rename-prop' ? renamed.from : row.prop
      const pairs = Object.entries(row.values)
      return [
        pairs.map(([from]) => code(`${scope(row.component)}${before}="${from}"`)).join(', '),
        pairs.map(([, to]) => code(`${row.prop}="${to}"`)).join(', '),
        row.codemod,
      ]
    }
    case 'move-to-labels':
      return [code(`${scope(row.component)}${row.from}`), code(`labels.${row.key}`), row.codemod]
    case 'text-to-children':
      return [code(`${scope(row.component)}${row.from}`), 'children', row.codemod]
    case 'export': {
      const [module, name] = row.from.includes('#') ? row.from.split('#') : [undefined, row.from]
      const before = module ? `${code(name)} from ${code(module)}` : code(name)
      const after = !row.to
        ? 'Removed'
        : row.codemod === 'manual'
          ? row.to
          : row.to.includes('#')
            ? `${code(row.to.split('#')[1])} from ${code(row.to.split('#')[0])}`
            : code(row.to)
      return [before, after, row.codemod]
    }
    case 'behavior':
      return [`${scope(row.component)}${row.before}`, row.after, '—']
  }
}

/** Renders MIGRATION.md; the output depends only on the rows. */
export function renderMarkdown(sections: MigrationSection[]): string {
  const lines = [
    '# Migration',
    '',
    'Generated from `scripts/migrations/*.ts` by `pnpm migration:sync`; do not edit by hand.',
    '',
    'Run `pnpm migrate <paths…>` for a dry run, add `--write` to apply the `auto` rows, or `--check`',
    'to fail while any listed usage remains. Rows marked `manual` are reported, never rewritten.',
    '',
    `## ${RELEASE}`,
  ]
  for (const section of sections) {
    lines.push('', `### ${section.name === '_all' ? 'All components' : section.name}`, '')
    lines.push('| Before | After | Codemod |', '| --- | --- | --- |')
    for (const row of section.migrations)
      lines.push(`| ${describe(row, section).map(cell).join(' | ')} |`)
  }
  return `${lines.join('\n')}\n`
}

/** Renders migrations.json, the machine-readable input of the codemod and engine sanitizer. */
export function renderJson(sections: MigrationSection[]): string {
  const migrations = sections.flatMap((section) => section.migrations)
  return `${JSON.stringify({ version: RELEASE.split(' ')[0], migrations }, null, 2)}\n`
}

async function main() {
  const write = process.argv.includes('--write')
  const sections = await loadMigrationSections()
  const outputs = {
    'MIGRATION.md': renderMarkdown(sections),
    'migrations.json': renderJson(sections),
  }
  let stale = false
  for (const [file, content] of Object.entries(outputs)) {
    const target = path.join(ROOT, file)
    let current: string | undefined
    try {
      current = readFileSync(target, 'utf8')
    } catch {}
    if (current === content) continue
    if (write) writeFileSync(target, content)
    else stale = true
    console.log(`${write ? 'Wrote' : 'Out of date:'} ${file}`)
  }
  if (stale) {
    console.log('Run `pnpm migration:sync`.')
    process.exitCode = 1
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main()
