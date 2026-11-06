import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, expect, it } from 'vitest'
import { migrate } from '../../scripts/migrate'
import rows from '../../scripts/migrations/Separator'

let directory = ''
afterEach(() => fs.rmSync(directory, { recursive: true, force: true }))

it('Separator role becomes decorative, value attributes are dropped, and aria-orientation, content and conflicting roles are left for a person', async () => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'face-separator-'))
  const tsx = path.join(directory, 'Usage.tsx')
  const json = path.join(directory, 'descriptors.json')
  fs.writeFileSync(
    tsx,
    `import { Separator } from '@userface/face-ui-react'
export const view = <>
  <Separator role="separator" orientation="vertical" />
  <Separator role="none" />
  <Separator role="presentation" decorative />
  <Separator role="none" decorative={false} />
  <Separator role={role} />
  <Separator aria-orientation="vertical" />
  <Separator>or</Separator>
  <Separator dangerouslySetInnerHTML={{ __html: 'or' }} />
  <Separator defaultValue="or" defaultChecked />
</>
`,
  )
  fs.writeFileSync(
    json,
    JSON.stringify([
      { __componentName__: 'Separator', role: 'separator' },
      { __componentName__: 'Separator', role: 'none', orientation: 'vertical' },
      { __componentName__: 'Separator', defaultValue: 'or' },
    ]),
  )
  const { findings } = await migrate({ paths: [directory], mode: 'write', migrations: rows })
  expect(fs.readFileSync(tsx, 'utf8')).toContain(`
  <Separator orientation="vertical" decorative={false} />
  <Separator decorative />
  <Separator decorative />
  <Separator role="none" decorative={false} />
  <Separator role={role} />
  <Separator aria-orientation="vertical" />
  <Separator>or</Separator>
  <Separator dangerouslySetInnerHTML={{ __html: 'or' }} />
  <Separator />
`)
  expect(JSON.parse(fs.readFileSync(json, 'utf8'))).toEqual([
    { __componentName__: 'Separator', decorative: false },
    { __componentName__: 'Separator', orientation: 'vertical', decorative: true },
    { __componentName__: 'Separator' },
  ])
  expect(
    findings
      .filter((finding) => finding.fix === 'manual')
      .map((finding) => [finding.at, 'prop' in finding.migration && finding.migration.prop, finding.reason]),
  ).toEqual([
    ['6', 'role', 'decorative is already set'],
    ['7', 'role', 'the value is computed'],
    ['8', 'aria-orientation', undefined],
    ['9', 'children', undefined],
    ['10', 'dangerouslySetInnerHTML', undefined],
  ])
})
