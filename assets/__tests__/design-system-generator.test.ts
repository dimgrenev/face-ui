import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'

const packageRoot = path.resolve(import.meta.dirname, '../..')
const generatorUrl = pathToFileURL(path.join(packageRoot, 'scripts/generate-design-system.mjs')).href
const runGenerator = (root: string) =>
  spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '--eval',
      `import { generateDesignSystem } from ${JSON.stringify(generatorUrl)}; generateDesignSystem(process.argv[1], false)`,
      root,
    ],
    { encoding: 'utf8' },
  )

describe('design-system token ownership', () => {
  it('rejects duplicate selector/name declarations across different generated paths', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'face-ui-token-owner-'))
    try {
      const sources = path.join(root, 'design-system/source')
      mkdirSync(sources, { recursive: true })
      for (const [file, generatedPath] of [
        ['geometry.jsonc', 'design-system/tokens/geometry.css'],
        ['themes.jsonc', 'design-system/themes/default.css'],
      ]) {
        writeFileSync(
          path.join(sources, file),
          JSON.stringify({
            generatedPath,
            tokens: [{
              name: '--uf-control-height',
              sheet: file,
              variants: [{ selector: ':root', value: '32px' }],
            }],
          }),
        )
      }
      const result = runGenerator(root)
      expect(result.status).not.toBe(0)
      expect(result.stderr).toContain('Duplicate declaration: --uf-control-height')
      expect(result.stderr).toContain('geometry.jsonc and themes.jsonc')
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('rejects a component default that shadows an authored foundation token', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'face-ui-token-owner-'))
    try {
      const sources = path.join(root, 'design-system/source')
      const styles = path.join(root, 'assets/styles')
      mkdirSync(sources, { recursive: true })
      mkdirSync(styles, { recursive: true })
      writeFileSync(
        path.join(sources, 'geometry.jsonc'),
        JSON.stringify({
          generatedPath: 'design-system/tokens/geometry.css',
          tokens: [{
            name: '--uf-control-height',
            sheet: 'geometry',
            variants: [{ selector: ':root', value: '32px' }],
          }],
        }),
      )
      writeFileSync(path.join(styles, 'component-tokens.css'), ':root {\n  --uf-control-height: 32px;\n}\n')

      const result = runGenerator(root)
      expect(result.status).not.toBe(0)
      expect(result.stderr).toContain('Duplicate declaration: --uf-control-height')
      expect(result.stderr).toContain('geometry.jsonc and assets/styles/component-tokens.css')
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('keeps the effective default values of formerly conflicting text tokens', () => {
    const manifest = JSON.parse(
      readFileSync(path.join(packageRoot, 'design-system/generated/token-manifest.json'), 'utf8'),
    ) as { tokens: { name: string; selectors: string[]; values: string[] }[] }
    for (const [name, value] of [
      ['text-body-size', '14px'],
      ['text-body-line-height', '20px'],
      ['text-section-size', '12px'],
      ['text-section-line-height', '16px'],
      ['text-pad-y', '0px'],
    ]) {
      const declarations = manifest.tokens.flatMap((token) =>
        token.name === `uf-${name}`
          ? token.selectors.map((selector, index) => ({ selector, value: token.values[index] }))
          : [],
      )
      expect(declarations).toEqual([{ selector: ':root', value }])
    }
  })
})
