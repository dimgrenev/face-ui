import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import ts from 'typescript'
import { expect, it } from 'vitest'

it('migrates only Button attributes, preserves native state, and is idempotent', () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'face-button-migration-'),
  )
  const file = path.join(directory, 'Example.tsx')
  const original = `import { Button as Action, Tile } from '@userface/face-ui-react';
export const view = <>
  <Action selector selectorDirection="side" selectorOpen={open} />
  <Action selector={enabled} selectorDirection={direction} selectorOpen={open} aria-expanded={native} />
  <Tile selector selectorOpen={open} />
</>;`
  try {
    fs.writeFileSync(file, original)
    const script = path.resolve('scripts/migrate-button-props.mjs')
    execFileSync(process.execPath, [script, directory])
    expect(fs.readFileSync(file, 'utf8')).toBe(original)
    execFileSync(process.execPath, [script, '--write', directory])
    const migrated = fs.readFileSync(file, 'utf8')
    const source = ts.createSourceFile(
      file,
      migrated,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    )
    const elements: ts.JsxSelfClosingElement[] = []
    const visit = (node: ts.Node) => {
      if (ts.isJsxSelfClosingElement(node)) elements.push(node)
      ts.forEachChild(node, visit)
    }
    visit(source)
    const names = (node: ts.JsxSelfClosingElement) =>
      node.attributes.properties
        .filter(ts.isJsxAttribute)
        .map((attribute) => attribute.name.getText(source))
    expect(names(elements[0])).toEqual(['chevron', 'aria-expanded'])
    expect(elements[0].getText(source)).toContain('aria-expanded={open}')
    expect(elements[1].getText(source)).toContain('aria-expanded={native}')
    expect(elements[1].getText(source)).toContain(
      "(enabled) ? ((direction) === 'side' ? 'right' : 'down') : undefined",
    )
    expect(names(elements[2])).toEqual(['selector', 'selectorOpen'])
    execFileSync(process.execPath, [script, '--write', directory])
    expect(fs.readFileSync(file, 'utf8')).toBe(migrated)
  } finally {
    fs.rmSync(directory, { recursive: true, force: true })
  }
})
