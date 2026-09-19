import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, expect, it } from 'vitest'
import { migrate } from '../../scripts/migrate'
import rows from '../../scripts/migrations/Table'

let directory = ''
afterEach(() => fs.rmSync(directory, { recursive: true, force: true }))

type Finding = Awaited<ReturnType<typeof migrate>>['findings'][number]
const describe = ({ migration: row }: Finding) =>
  row.kind === 'retype-prop'
    ? `${row.prop}${row.prop === 'columns' ? (row.before.includes('render') ? ' render' : ' align') : ''}`
    : row.kind === 'remove-prop'
      ? row.prop
      : row.kind === 'rename-prop'
        ? row.from
        : row.kind

async function findings(files: Record<string, string>) {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'face-table-'))
  for (const [name, text] of Object.entries(files)) fs.writeFileSync(path.join(directory, name), text)
  const result = await migrate({ paths: [directory], migrations: rows, mode: 'write' })
  return {
    found: result.findings.map((finding) => `${path.basename(finding.file)}:${finding.at} ${describe(finding)}`),
    read: (name: string) => fs.readFileSync(path.join(directory, name), 'utf8'),
  }
}

it('Table migration reports handlers and renders written for positional arguments, left and right, and removed fields', async () => {
  const { found, read } = await findings({
    'Legacy.tsx': `import { Table } from '@userface/face-ui-react'
export const view = <>
  <Table columns={[{ id: 'a', render: (_value, row) => row.name }]} />
  <Table columns={[{ id: 'a', render(value, row) { return row.name } }]} />
  <Table columns={[{ id: 'a', render: function (value: unknown, row: Row) { return row.name } }]} />
  <Table onRowClick={(row, index) => open(row, index)} onColumnResize={async (columnId: string, width) => save(columnId, width)} />
  <Table onSortChange={({ column, direction }) => save(column, direction)} />
  <Table columns={[{ id: 'a', align: 'right', maxWidth: 200 }]} onRowMouseEnter={enter} showRowNumbers={false} />
</>
`,
    'legacy.face.json': JSON.stringify({ schema: 'face', root: { type: 'Table', props: { columns: [{ id: 'a', align: 'left' }] } } }),
  })
  expect(found).toEqual([
    'Legacy.tsx:3 columns render',
    'Legacy.tsx:4 columns render',
    'Legacy.tsx:5 columns render',
    'Legacy.tsx:6 onRowClick',
    'Legacy.tsx:6 onColumnResize',
    'Legacy.tsx:7 onSortChange',
    'Legacy.tsx:8 showRowNumbers',
    'Legacy.tsx:8 onRowMouseEnter',
    'Legacy.tsx:8 columns[].maxWidth',
    'Legacy.tsx:8 columns align',
    'legacy.face.json:/root columns align',
  ])
  expect(read('Legacy.tsx')).toContain('onRowMouseEnter={enter} rowNumbers={false} />')
})

it('Table migration reports nothing in migrated code: columns in a variable or a face document, one-parameter handlers and renders', async () => {
  const { found } = await findings({
    'Migrated.tsx': `import { Table, type TableColumn } from '@userface/face-ui-react'
const columns: TableColumn[] = [
  { id: 'a', render: ({ value }) => String(value) },
  { id: 'b', render: (cell) => cell.value as string },
]
const plain = [{ id: 'c', align: 'end' }]
export const view = <>
  <Table columns={columns} onRowClick={(details) => open(details.row)} onColumnResize={({ column, width }) => save(column, width)} />
  <Table columns={plain} rowNumbers onSortChange={({ sort }) => { const { column, direction } = sort ?? {}; save(column, direction) }} />
  <Table columns={[{ id: 'a', render: ({ value, row }) => row.name ?? value }, { id: 'b', render: renderCell }, { id: 'c', render: () => 'x' }]} />
  <Table columns={[{ id: 'a', render: (details: TableCellDetails<Record<string, unknown>>) => String(details.value) }]} onRowClick={openRow} />
</>
`,
    'migrated.face.json': JSON.stringify({
      schema: 'face',
      root: { type: 'Table', props: { columns: { $ref: 'props.columns' }, rowNumbers: { $ref: 'props.rowNumbers' } } },
    }),
  })
  expect(found).toEqual([])
})
