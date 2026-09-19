import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, expect, it } from 'vitest'
import { migrate } from '../../scripts/migrate'
import rows from '../../scripts/migrations/Markdown'

let directory = ''
afterEach(() => fs.rmSync(directory, { recursive: true, force: true }))

it('Markdown content becomes children, allowRawHtml becomes html, and safeMode and fullWidth are dropped', async () => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'face-markdown-'))
  const tsx = path.join(directory, 'Usage.tsx')
  const json = path.join(directory, 'descriptors.json')
  fs.writeFileSync(
    tsx,
    `import { Markdown } from '@userface/face-ui-react'
export const view = <>
  <Markdown content={answer} allowRawHtml safeMode={false} fullWidth />
  <Markdown content="# Notes" safeMode linkTarget="_blank" />
</>
`,
  )
  fs.writeFileSync(
    json,
    JSON.stringify([
      { __componentName__: 'Markdown', content: '# Notes', allowRawHtml: true, safeMode: false, fullWidth: false },
    ]),
  )
  await migrate({ paths: [directory], mode: 'write', migrations: rows })
  expect(fs.readFileSync(tsx, 'utf8')).toContain(`
  <Markdown html>{answer}</Markdown>
  <Markdown linkTarget="_blank"># Notes</Markdown>
`)
  expect(JSON.parse(fs.readFileSync(json, 'utf8'))).toEqual([
    { __componentName__: 'Markdown', children: '# Notes', html: true },
  ])
})
