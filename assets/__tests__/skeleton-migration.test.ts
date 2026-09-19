import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, expect, it } from 'vitest'
import { migrate } from '../../scripts/migrate'
import rows from '../../scripts/migrations/Skeleton'

let directory = ''
afterEach(() => fs.rmSync(directory, { recursive: true, force: true }))

it('Skeleton variant becomes shape, aria-hidden and value attributes are dropped, and content is left for a person', async () => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'face-skeleton-'))
  const tsx = path.join(directory, 'Usage.tsx')
  const json = path.join(directory, 'descriptors.json')
  fs.writeFileSync(
    tsx,
    `import { Skeleton } from '@userface/face-ui-react'
export const view = <>
  <Skeleton variant="circle" width={40} height={40} />
  <Skeleton variant={shape} />
  <Skeleton aria-hidden="true" defaultValue="x" defaultChecked />
  <Skeleton>Loading</Skeleton>
  <Skeleton dangerouslySetInnerHTML={{ __html: 'Loading' }} />
</>
`,
  )
  fs.writeFileSync(
    json,
    JSON.stringify([
      { __componentName__: 'Skeleton', variant: 'rect', width: '100%', height: 160 },
      { __componentName__: 'Skeleton', 'aria-hidden': true },
    ]),
  )
  const { findings } = await migrate({ paths: [directory], mode: 'write', migrations: rows })
  expect(fs.readFileSync(tsx, 'utf8')).toContain(`
  <Skeleton shape="circle" width={40} height={40} />
  <Skeleton shape={shape} />
  <Skeleton />
  <Skeleton>Loading</Skeleton>
  <Skeleton dangerouslySetInnerHTML={{ __html: 'Loading' }} />
`)
  expect(JSON.parse(fs.readFileSync(json, 'utf8'))).toEqual([
    { __componentName__: 'Skeleton', shape: 'rect', width: '100%', height: 160 },
    { __componentName__: 'Skeleton' },
  ])
  expect(
    findings
      .filter((finding) => finding.fix === 'manual')
      .map((finding) => [finding.at, 'prop' in finding.migration && finding.migration.prop]),
  ).toEqual([
    ['6', 'children'],
    ['7', 'dangerouslySetInnerHTML'],
  ])
})
