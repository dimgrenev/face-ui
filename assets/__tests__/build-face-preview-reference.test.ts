import { createRequire } from 'node:module'
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const { normalizePublishedFacePreview } = require('../../scripts/build-npm.cjs') as {
  normalizePublishedFacePreview?: (bytes: Buffer, sourceFile: string, sourceRoot: string, targetRoot: string) => Buffer
}
const roots: string[] = []
afterEach(() => roots.splice(0).forEach(root => rmSync(root, { recursive: true, force: true })))
function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), 'face-ui-preview-package-')); roots.push(root)
  const sourceRoot = path.join(root, 'source'), targetRoot = path.join(root, 'published')
  for (const dir of [sourceRoot, targetRoot]) mkdirSync(path.join(dir, 'Modal'), { recursive: true })
  const sourceFile = path.join(sourceRoot, 'Modal/Modal.json')
  const normalize = (bytes: Buffer) => normalizePublishedFacePreview
    ? normalizePublishedFacePreview(bytes, sourceFile, sourceRoot, targetRoot) : bytes
  return { root, sourceRoot, sourceFile, targetRoot, normalize }
}

describe('published Face executable references', () => {
  it('keeps source bytes while pointing the published object at its actual emitted module', () => {
    const f = fixture()
    const bytes = Buffer.from('{ "name": "Modal", "preview": { "entryPath": "./Modal.preview.tsx", "exportName": "ModalPreview" }, "meta": { "custom": 0 } }\n')
    writeFileSync(f.sourceFile, bytes)
    writeFileSync(path.join(f.sourceRoot, 'Modal/Modal.preview.tsx'), 'export function ModalPreview() { return null }')
    writeFileSync(path.join(f.targetRoot, 'Modal/Modal.preview.js'), 'export function ModalPreview() { return null }')
    expect(JSON.parse(f.normalize(bytes).toString())).toEqual({ name: 'Modal', preview: {
      entryPath: './Modal.preview.js', exportName: 'ModalPreview',
    }, meta: { custom: 0 } })
    expect(readFileSync(f.sourceFile)).toEqual(bytes)
  })

  it('rejects a declared TypeScript example that the build did not emit', () => {
    const f = fixture()
    writeFileSync(path.join(f.sourceRoot, 'Modal/Modal.preview.tsx'), 'export function ModalPreview() { return null }')
    expect(() => f.normalize(Buffer.from(JSON.stringify({ name: 'Modal', preview: {
      entryPath: './Modal.preview.tsx', exportName: 'ModalPreview',
    } })))).toThrow(/emitted/i)
  })

  it.each(['./Image.tsx', 'https://example.test/preview.png', 'data:image/png;base64,AAAA'])('preserves legacy string metadata byte-for-byte: %s', preview => {
    const f = fixture(), bytes = Buffer.from(`{ "name": "Legacy", "preview": ${JSON.stringify(preview)} }\n`)
    writeFileSync(path.join(f.sourceRoot, 'Modal/Image.tsx'), 'export default function Image() { return null }')
    writeFileSync(path.join(f.targetRoot, 'Modal/Image.js'), 'export default function Image() { return null }')
    expect(f.normalize(bytes)).toEqual(bytes)
  })

  it.each([['tsx', 'js'], ['ts', 'js'], ['mts', 'mjs'], ['cts', 'cjs']])('follows actual emitted %s modules while preserving default exports', (sourceExtension, emittedExtension) => {
    const f = fixture()
    for (const root of [f.sourceRoot, f.targetRoot]) mkdirSync(path.join(root, 'examples'))
    writeFileSync(path.join(f.sourceRoot, `examples/Usage.${sourceExtension}`), 'export default function Usage() { return null }')
    writeFileSync(path.join(f.targetRoot, `examples/Usage.${emittedExtension}`), 'export default function Usage() { return null }')
    const bytes = Buffer.from(JSON.stringify({ preview: { entryPath: `../examples/Usage.${sourceExtension}`, exportName: 'default' } }))
    expect(JSON.parse(f.normalize(bytes).toString()).preview).toEqual({ entryPath: `../examples/Usage.${emittedExtension}`, exportName: 'default' })
  })

  it('rejects lexical and symlink source/output escapes instead of publishing foreign modules', () => {
    const f = fixture()
    const foreign = path.join(f.root, 'Foreign.tsx'); writeFileSync(foreign, 'export default function Foreign() { return null }')
    const bytes = (entryPath: string) => Buffer.from(JSON.stringify({ preview: { entryPath, exportName: 'default' } }))
    expect(() => f.normalize(bytes('../../Foreign.tsx'))).toThrow(/inside/i)
    symlinkSync(foreign, path.join(f.sourceRoot, 'Modal/Usage.tsx'))
    expect(() => f.normalize(bytes('./Usage.tsx'))).toThrow(/outside/i)
    writeFileSync(path.join(f.sourceRoot, 'Modal/Local.tsx'), 'export default function Local() { return null }')
    symlinkSync(foreign, path.join(f.targetRoot, 'Modal/Local.js'))
    expect(() => f.normalize(bytes('./Local.tsx'))).toThrow(/outside/i)
  })

  it('preserves runtime references and unsupported shapes without inventing executable syntax', () => {
    const f = fixture()
    for (const preview of [{ entryPath: './Usage.js', exportName: 'default' }, { entryPath: './Usage.tsx' },
      { entryPath: './Usage.tsx', exportName: 'default', extra: true }, null, []]) {
      const bytes = Buffer.from(`{ "preview": ${JSON.stringify(preview)} }\n`)
      expect(f.normalize(bytes)).toEqual(bytes)
    }
  })

  it('copies every current no-preview JSON asset byte-for-byte', () => {
    const f = fixture(), packageRoot = path.resolve(import.meta.dirname, '../..')
    const assets: string[] = []
    const walk = (directory: string) => {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        if (entry.name.startsWith('.') || ['node_modules', 'dist', 'scripts', '__tests__', 'contracts', 'test-results', 'playwright-report', 'coverage'].includes(entry.name)) continue
        const file = path.join(directory, entry.name)
        if (entry.isDirectory()) walk(file)
        else if (entry.name.endsWith('.json')) assets.push(file)
      }
    }
    walk(packageRoot)
    let checked = 0
    for (const file of assets) {
      const bytes = readFileSync(file), value = JSON.parse(bytes.toString())
      if (Object.hasOwn(value, 'preview')) continue
      expect(f.normalize(bytes), path.relative(packageRoot, file)).toEqual(bytes); checked++
    }
    expect(checked).toBeGreaterThan(100)
  })
})
