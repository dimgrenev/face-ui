import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { loadMigrationSections, renderJson, renderMarkdown } from '../../scripts/generate-migration'
import { type Finding, migrate } from '../../scripts/migrate'
import type { Migration } from '../../scripts/migrations/types'

// Every top-level prop removed or renamed since d30d501, with a value the old API accepted.
const REMOVED: Record<string, Record<string, unknown>> = {
  Avatar: { icon: 'user', children: 'AL' },
  Breadcrumb: { collapseAfter: 5, allowNavigation: true },
  Button: { selector: true, selectorDirection: 'side', selectorOpen: false },
  Card: { footerLayout: 'between', interactive: true },
  Date: { showPresets: true, views: ['day'] },
  Input: { ariaLabel: 'Name', stretchText: true, textLayout: 'wrap' },
  Popover: { interactive: true, openDelay: 100, closeDelay: 100 },
  Progress: { ariaLabel: 'Upload' },
  Radio: { ariaLabel: 'Plan' },
  Rating: { ariaLabel: 'Score' },
  SegmentedControl: { ariaLabel: 'View', selectionMode: 'multiple' },
  Select: { ariaLabel: 'Font', type: 'multiselect', variant: 'side' },
  Slider: { variant: 'advanced', leadingIcon: 'crop', leadingText: 'Crop', cropLocksValue: false },
  Switcher: { text: 'Sync', withText: true, textWrap: 'truncate' },
  Tabs: { withLine: true },
  Tile: { selector: true, selectorOpen: true, busy: true, intent: 'section', selectedDescendant: true },
}
const pairs = Object.entries(REMOVED).flatMap(([component, props]) => Object.keys(props).map((prop) => `${component}.${prop}`))
// Props that kept their name but changed type.
const RETYPED = ['value', 'defaultValue', 'min', 'max', 'disabledDates', 'onValueChange'].map((prop) => `Calendar.${prop}`)

const oldProp = (row: Migration) =>
  row.kind === 'rename-prop' || row.kind === 'move-to-labels'
    ? row.from
    : row.kind === 'remove-prop' || row.kind === 'rename-value' || row.kind === 'retype-prop'
      ? row.prop
      : undefined
const covered = (findings: Finding[], file: string) =>
  new Set(
    findings
      .filter((finding) => finding.file === file && 'component' in finding.migration)
      .map((finding) => `${(finding.migration as { component: string }).component}.${oldProp(finding.migration)}`),
  )

const attribute = (name: string, value: unknown) =>
  value === true ? name : typeof value === 'string' ? `${name}="${value}"` : `${name}={${JSON.stringify(value)}}`

let directory = ''
afterEach(() => fs.rmSync(directory, { recursive: true, force: true }))
function fixture(files: Record<string, string>) {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'face-migrate-'))
  for (const [name, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(directory, name)), { recursive: true })
    fs.writeFileSync(path.join(directory, name), text)
  }
  return (name: string) => path.join(directory, name)
}
const read = (file: string) => fs.readFileSync(file, 'utf8')

describe('migrations', () => {
  it('cover every removed prop and render deterministically', async () => {
    const rows = (await loadMigrationSections()).flatMap((section) => section.migrations)
    const listed = new Set(rows.map((row) => ('component' in row ? `${row.component}.${oldProp(row)}` : '')))
    expect([...pairs, ...RETYPED].filter((pair) => !listed.has(pair))).toEqual([])
    const [first, second] = [await loadMigrationSections(), await loadMigrationSections()]
    expect(renderMarkdown(second)).toBe(renderMarkdown(first))
    expect(renderJson(second)).toBe(renderJson(first))
    expect(renderMarkdown(first)).toMatch(/^# Migration\n[\s\S]*## 0\.2\.0 \(unreleased\)\n\n### All components\n/)
  })
})

describe('migrate', () => {
  it('finds every removed prop in TSX and JSON, fixes it idempotently and leaves only manual rows', async () => {
    const elements = Object.entries(REMOVED).map(([component, { children, ...props }]) => {
      const attributes = Object.entries(props).map(([name, value]) => attribute(name, value)).join(' ')
      return children ? `<${component} ${attributes}>${children}</${component}>` : `<${component} ${attributes} />`
    })
    const at = fixture({
      'Usage.tsx': `import { ${Object.keys(REMOVED).join(', ')} } from '@userface/face-ui-react'\nexport const view = <>\n${elements.join('\n')}\n</>\n`,
      'descriptors.json': `${JSON.stringify(
        Object.entries(REMOVED).map(([component, props]) => ({ __componentName__: component, ...props })),
        null,
        2,
      )}\n`,
    })
    const before = read(at('Usage.tsx'))
    const check = await migrate({ paths: [directory], mode: 'check' })
    expect(read(at('Usage.tsx'))).toBe(before)
    for (const file of ['Usage.tsx', 'descriptors.json'])
      expect(pairs.filter((pair) => !covered(check.findings, at(file)).has(pair)), file).toEqual([])

    const write = await migrate({ paths: [directory], mode: 'write' })
    expect(write.changed.sort()).toEqual([at('Usage.tsx'), at('descriptors.json')])
    const once = { tsx: read(at('Usage.tsx')), json: read(at('descriptors.json')) }
    const again = await migrate({ paths: [directory], mode: 'write' })
    expect(again.changed).toEqual([])
    expect({ tsx: read(at('Usage.tsx')), json: read(at('descriptors.json')) }).toEqual(once)
    expect(again.findings.length).toBeGreaterThan(0)
    for (const { migration } of again.findings) expect('codemod' in migration && migration.codemod).toBe('manual')
    expect(once.tsx).toContain('<Select aria-label="Font" multiple surface="side" />')
    expect(once.tsx).toContain('<Switcher label="Sync" truncate />')
    expect(JSON.parse(once.json)).toContainEqual({ __componentName__: 'Tabs', variant: 'underline' })
  })

  it('rewrites only Face UI components, through any import form', async () => {
    const at = fixture({
      'face/component-registry.json': '{}',
      'face/face-ui-react.json': '{}',
      'Example.tsx': `import { Button as Action, Tile, Date, Bar } from '@userface/face-ui-react'
import { Button as Wrapped } from '@userface/app-ui/Button/Button'
import * as UI from './face'
import { Input } from './face/Input/Input'
import { Card } from 'another-library'
import type { CardFooterLayout } from '@userface/face-ui-react/Card'
import { Select, computeSelectSidePosition } from '@userface/face-ui-react/Select'
export const align: CardFooterLayout = 'end'
export const view = <>
  <Action selector selectorDirection="side" selectorOpen={open} iconPosition="left" />
  <Wrapped selector={enabled} selectorDirection={direction} selectorOpen={open} aria-expanded={native} />
  <UI.Tile selector={expanded} busy />
  <Tile selectedDescendant />
  <Input textLayout={layout} controlRef={ref} />
  <Card interactive />
  <Date clearLabel="Clear" nowLabel={t('now')} labels={{ close: 'Done' }} />
  <UI.Bar.Right>Actions</UI.Bar.Right>
  <Bar.LeftEllipsis />
  {/* @ts-expect-error selector is gone */}
  <Action selector />
</>
`,
      'setting.json': JSON.stringify({
        schema: 'face',
        root: { type: 'Card', props: { footerLayout: 'end' }, children: [] },
        currentState: { props: { interactive: true } },
        control: { __componentName__: 'Switcher', withText: false, text: { $ref: 'label' } },
      }),
    })
    const { findings } = await migrate({ paths: [directory], mode: 'write' })
    const tsx = read(at('Example.tsx'))
    expect(tsx).toContain(`import type { CardAlign } from '@userface/face-ui-react/Card'`)
    expect(tsx).toContain(`export const align: CardAlign = 'end'`)
    expect(tsx).toContain(`import { computeSelectSidePosition } from '@userface/face-ui-react/Select/select-side-position'`)
    expect(tsx).toContain(`<Action aria-expanded={open} iconPosition="start" chevron="right" />`)
    expect(tsx).toContain(
      `<Wrapped selectorOpen={open} aria-expanded={native} chevron={(enabled) ? ((direction) === 'side' ? 'right' : 'down') : undefined} />`,
    )
    expect(tsx).toContain(`<UI.Tile aria-busy chevron={(expanded) ? 'down' : undefined} />`)
    expect(tsx).toContain(`<Tile selectedDescendant />`)
    expect(tsx).toContain(`<Input textLayout={layout} ref={ref} />`)
    expect(tsx).toContain(`<Card interactive />`)
    expect(tsx).toContain(`<Date labels={{ close: 'Done', clear: 'Clear', now: t('now') }} />`)
    expect(tsx).toContain(`<UI.Bar.Section align="end">Actions</UI.Bar.Section>`)
    expect(tsx).toContain(`<Bar.Section grow />`)
    expect(tsx).toContain(`{/* @ts-expect-error selector is gone */}\n  <Action chevron="down" />`)
    expect(JSON.parse(read(at('setting.json')))).toEqual({
      schema: 'face',
      root: { type: 'Card', props: { footerAlign: 'end' }, children: [] },
      currentState: { props: { hoverable: true } },
      control: { __componentName__: 'Switcher' },
    })
    const manual = findings.filter((finding) => finding.fix === 'manual').map((finding) => [finding.at, finding.reason])
    expect(manual).toEqual([
      ['11', 'aria-expanded is already set'],
      ['13', undefined],
      ['14', 'the value is computed'],
    ])
  })

  it('reads values as the old API did and keeps the file layout', async () => {
    const at = fixture({
      'View.tsx': `import { Breadcrumb, Calendar, Button, Date } from '@userface/face-ui-react'
import { Select, computeSelectSidePosition, type SelectSidePosition } from '@userface/face-ui-react/Select'
import { computeSelectSideOptionViewportHeight } from '@userface/face-ui-react/Select/select-side-position'
export const view = <>
  <Breadcrumb collapseAfter={0} />
  <Breadcrumb collapseAfter={Infinity} />
  <Breadcrumb collapseAfter={5} />
  <Breadcrumb collapseAfter={4.5} />
  <Breadcrumb collapseAfter={count} />
  <Calendar value={new Date()} min="2024-01-01" />
  <Button iconPosition={rtl ? 'left' : 'right'} />
  <Button iconPosition={rtl ? 'start' : 'end'} />
  <Date labels={{
      close: 'Done',
    }} clearLabel="Clear" />
</>
`,
      'Button.json': `{\n  "name": "Button",\n  "states": [{ "name": "Default", "props": { "iconPosition": "left", "selector": true } }]\n}\n`,
      'doc.json': JSON.stringify({
        crumbs: [
          { __componentName__: 'Breadcrumb', collapseAfter: 2 },
          { __componentName__: 'Breadcrumb', collapseAfter: '5' },
        ],
        calendar: { __componentName__: 'Calendar', value: '2024-01-02T00:00:00.000Z', min: '2024-01-01' },
      }),
      'face/component-registry.json': '{}',
      'face/face-ui-react.json': '{}',
      'face/types.tsx': `import { Button } from './Button/Button'\n// @ts-expect-error selector is gone\nexport const legacy = <Button selector />\n`,
    })
    const { findings } = await migrate({ paths: [directory], mode: 'write' })
    const tsx = read(at('View.tsx'))
    expect(tsx).toContain(`import { Select } from '@userface/face-ui-react/Select'
import { computeSelectSidePosition, type SelectSidePosition, computeSelectSideOptionViewportHeight } from '@userface/face-ui-react/Select/select-side-position'
export const view`)
    expect(tsx).toContain(`<Breadcrumb maxItems={null} />
  <Breadcrumb maxItems={null} />
  <Breadcrumb maxItems={5} />
  <Breadcrumb maxItems={4} />
  <Breadcrumb collapseAfter={count} />`)
    expect(tsx).toContain(`<Date labels={{
      close: 'Done',
      clear: 'Clear',
    }} />`)
    expect(read(at('Button.json'))).toBe(
      `{\n  "name": "Button",\n  "states": [\n    {\n      "name": "Default",\n      "props": {\n        "iconPosition": "start",\n        "chevron": "down"\n      }\n    }\n  ]\n}\n`,
    )
    expect(read(at('doc.json'))).toBe(
      JSON.stringify({
        crumbs: [
          { __componentName__: 'Breadcrumb', maxItems: null },
          { __componentName__: 'Breadcrumb', maxItems: 5 },
        ],
        calendar: { __componentName__: 'Calendar', value: '2024-01-02T00:00:00.000Z', min: '2024-01-01' },
      }),
    )
    const manual = findings
      .filter((finding) => finding.fix === 'manual')
      .map((finding) => `${path.basename(finding.file)}:${finding.at} ${oldProp(finding.migration)} ${finding.reason ?? ''}`)
    expect(manual).toEqual([
      'View.tsx:9 collapseAfter the value is computed',
      'View.tsx:10 value ',
      'View.tsx:11 iconPosition the value is computed',
      'doc.json:/calendar value ',
    ])

    // Face UI's own negative type tests stay as written.
    const own = await migrate({ paths: [at('face')], mode: 'check' })
    expect(own.findings).toEqual([])
  })

  it('exits non-zero from --check while legacy usages remain', () => {
    fixture({ 'a.json': JSON.stringify({ __componentName__: 'Tabs', withLine: true }) })
    const run = (...args: string[]) =>
      spawnSync(path.resolve('node_modules/.bin/tsx'), ['scripts/migrate.ts', ...args, directory], { encoding: 'utf8' })
    expect(run('--check')).toMatchObject({ status: 1, stdout: expect.stringContaining('Tabs withLine removed  [auto]') })
    expect(run('--write')).toMatchObject({ status: 0, stdout: expect.stringContaining('Updated 1 files.') })
    expect(run('--check')).toMatchObject({ status: 0, stdout: expect.stringContaining('0 usages in 0 of 1 files') })
  })
})
