import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, expect, it } from 'vitest'
import { migrate } from '../../scripts/migrate'
import rows from '../../scripts/migrations/Progress'

let directory = ''
afterEach(() => fs.rmSync(directory, { recursive: true, force: true }))

it('Progress indeterminate becomes value={null}, and a competing value is left for a person', async () => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'face-progress-'))
  const tsx = path.join(directory, 'Usage.tsx')
  const json = path.join(directory, 'descriptors.json')
  fs.writeFileSync(
    tsx,
    `import { Progress } from '@userface/face-ui-react'
export const view = <>
  <Progress indeterminate label="Import" />
  <Progress indeterminate={false} value={40} />
  <Progress indeterminate={busy} />
  <Progress indeterminate={busy} value={40} />
</>
`,
  )
  fs.writeFileSync(
    json,
    JSON.stringify([
      { __componentName__: 'Progress', indeterminate: true },
      { __componentName__: 'Progress', indeterminate: false, value: 3 },
    ]),
  )
  const { findings } = await migrate({ paths: [directory], mode: 'write', migrations: rows })
  expect(fs.readFileSync(tsx, 'utf8')).toContain(`
  <Progress label="Import" value={null} />
  <Progress value={40} />
  <Progress value={(busy) ? null : undefined} />
  <Progress indeterminate={busy} value={40} />
`)
  expect(JSON.parse(fs.readFileSync(json, 'utf8'))).toEqual([
    { __componentName__: 'Progress', value: null },
    { __componentName__: 'Progress', value: 3 },
  ])
  expect(
    findings.filter((finding) => finding.fix === 'manual').map((finding) => [finding.at, finding.reason]),
  ).toEqual([['6', 'value is already set']])
})
