import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, expect, it } from 'vitest'
import { migrate } from '../../scripts/migrate'
import rows from '../../scripts/migrations/Table'

let directory = ''
afterEach(() => fs.rmSync(directory, { recursive: true, force: true }))

it('Table migration reports every render that does not destructure its argument, columns it cannot read, and removed fields', async () => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'face-table-'))
  const tsx = path.join(directory, 'Usage.tsx')
  fs.writeFileSync(
    tsx,
    `import { Table } from '@userface/face-ui-react'
const columns = [{ id: 'a', render: (value: unknown) => String(value) }]
export const view = <>
  <Table columns={columns} />
  <Table columns={[{ id: 'a', render: (value: unknown) => String(value) }]} />
  <Table columns={[{ id: 'a', render: (v) => (v ? 'yes' : 'no') }]} />
  <Table columns={[{ id: 'a', render: v => String(v) }]} />
  <Table columns={[{ id: 'a', render(value) { return String(value) } }]} />
  <Table columns={[{ id: 'a', render: function (value) { return String(value) } }]} />
  <Table columns={[{ id: 'a', render: renderCell }]} />
  <Table columns={[{ id: 'a', render: ({ value }) => String(value) }]} />
  <Table columns={[{ id: 'a', render: () => 'x' }]} />
  <Table columns={[{ id: 'a', header: 'A' }]} />
  <Table columns={[{ id: 'a', maxWidth: 200 }]} onRowMouseEnter={enter} />
</>
`,
  )
  const { findings } = await migrate({ paths: [directory], migrations: rows })
  const lines = (match: (row: (typeof findings)[number]['migration']) => boolean) =>
    findings.filter((finding) => match(finding.migration)).map((finding) => finding.at)
  expect(
    lines((row) => row.kind === 'retype-prop' && row.prop === 'columns' && row.before.includes('render')),
  ).toEqual(['4', '5', '6', '7', '8', '9', '10'])
  expect(lines((row) => row.kind === 'remove-prop' && row.prop === 'columns[].maxWidth')).toEqual(['14'])
  expect(lines((row) => row.kind === 'remove-prop' && row.prop === 'onRowMouseEnter')).toEqual(['14'])
})
