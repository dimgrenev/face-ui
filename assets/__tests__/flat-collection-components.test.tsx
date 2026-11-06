import { act, type ReactElement } from 'react'
import { it, expect } from 'vitest'
import { Accordion } from '../../Accordion/Accordion'
import { Breadcrumb } from '../../Breadcrumb/Breadcrumb'
import { Radio } from '../../Radio/Radio'
import { Steps } from '../../Steps/Steps'
import { Table } from '../../Table/Table'
import { Tabs } from '../../Tabs/Tabs'
import { Toc } from '../../Toc/Toc'
import { Upload } from '../../Upload/Upload'
import { expectDevError, mount } from './harness'

interface FlatCase {
  name: string
  prop: 'items' | 'columns' | 'files'
  valid: object
  selector: string
  label: string
  render: (entries: object[]) => ReactElement
}

const cases: FlatCase[] = [
  {
    name: 'Accordion', prop: 'items', valid: { value: 'valid', label: 'Valid', content: 'Body' },
    selector: '[data-scope="accordion"][data-part="trigger"]', label: 'Valid',
    render: (items) => <Accordion items={items as never} />,
  },
  {
    name: 'Breadcrumb', prop: 'items', valid: { label: 'Valid' },
    selector: '.uf-breadcrumb-label', label: 'Valid',
    render: (items) => <Breadcrumb items={items as never} maxItems={null} />,
  },
  {
    name: 'Radio', prop: 'items', valid: { value: 'valid', label: 'Valid' },
    selector: '[data-scope="radio"][data-part="item"]', label: 'Valid',
    render: (items) => <Radio items={items as never} aria-label="Choices" />,
  },
  {
    name: 'Steps', prop: 'items', valid: { label: 'Valid' },
    selector: '[data-scope="steps"][data-part="trigger"]', label: 'Valid',
    render: (items) => <Steps items={items as never} />,
  },
  {
    name: 'Table', prop: 'columns', valid: { id: 'name', header: 'Valid' },
    selector: 'th[data-scope="table"][data-part="headerCell"][data-column]', label: 'Valid',
    render: (columns) => <Table aria-label="Data" columns={columns as never} rows={[{ id: 'row', name: 'Data' }]} />,
  },
  {
    name: 'Tabs', prop: 'items', valid: { value: 'valid', label: 'Valid', content: 'Body' },
    selector: '[role="tab"]', label: 'Valid',
    render: (items) => <Tabs items={items as never} aria-label="Tabs" />,
  },
  {
    name: 'Toc', prop: 'items', valid: { value: 'valid', label: 'Valid' },
    selector: 'a[data-scope="toc"][data-part="link"]', label: 'Valid',
    render: (items) => <Toc items={items as never} />,
  },
  {
    name: 'Upload', prop: 'files', valid: { id: 'valid', name: 'Valid.pdf' },
    selector: '[data-scope="upload"][data-part="fileItem"]', label: 'Valid.pdf',
    render: (files) => <Upload files={files as never} aria-label="Files" />,
  },
]

it.each(cases)('$name drops unsupported group and separator entries with reports', async ({
  name, prop, valid, selector, label, render,
}) => {
  const { host, root } = mount()
  const entries = [
    { type: 'group', label: 'Bogus', items: [
      { value: 'nested', id: 'nested', key: 'nested', label: 'Nested', name: 'Nested.pdf', header: 'Nested', content: 'Nested' },
    ] },
    { type: 'separator' },
    valid,
  ]
  const report = (type: string) =>
    new RegExp(`^Face UI ${name}: invalid ${prop}\\[\\]\\.type "${type}"; dropping the item\\.$`)

  await expectDevError(
    () => expectDevError(() => act(async () => root.render(render(entries))), report('group')),
    report('separator'),
  )
  const shown = host.querySelectorAll(selector)
  expect(shown).toHaveLength(1)
  expect(shown[0]?.textContent).toContain(label)
  expect(host.textContent).not.toContain('Bogus')
  expect(host.textContent).not.toContain('Nested')
})

it('a dropped group cannot reserve the key of a valid flat item', async () => {
  const { host, root } = mount()
  await expectDevError(
    () => act(async () => root.render(
      <Tabs
        aria-label="Tabs"
        items={[
          { type: 'group', label: 'Dropped', items: [{ value: '#0', label: 'Nested' }] },
          { value: '#0', label: 'Kept', content: 'Panel' },
        ] as never}
      />,
    )),
    /^Face UI Tabs: invalid items\[\]\.type "group"; dropping the item\.$/,
  )
  expect(host.querySelectorAll('[role="tab"]')).toHaveLength(1)
  expect(host.querySelector('[role="tab"]')?.textContent).toBe('Kept')
})
