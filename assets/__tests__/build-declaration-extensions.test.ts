import { createRequire } from 'node:module'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const { fixDeclarationExtensions } = require('../../scripts/build-npm.cjs') as {
  fixDeclarationExtensions: (dir: string) => void
}

describe('published declaration paths', () => {
  it('resolves both sibling declarations and directory indexes for NodeNext', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'face-ui-types-'))
    try {
      mkdirSync(path.join(root, 'machines'))
      writeFileSync(path.join(root, 'child.d.ts'), 'export interface Child { value: string }\n')
      writeFileSync(path.join(root, 'machines', 'index.d.ts'), 'export interface Machine {}\n')
      writeFileSync(
        path.join(root, 'entry.d.ts'),
        "export type { Child } from './child'\nexport * from './machines'\nexport type Lazy = import('./child').Child\nexport type { Child as Existing } from './child.js'\n",
      )

      fixDeclarationExtensions(root)

      expect(readFileSync(path.join(root, 'entry.d.ts'), 'utf8')).toBe(
        "export type { Child } from './child.js'\nexport * from './machines/index.js'\nexport type Lazy = import('./child.js').Child\nexport type { Child as Existing } from './child.js'\n",
      )
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('fails the build for an unresolved generated relative declaration', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'face-ui-types-'))
    try {
      writeFileSync(path.join(root, 'entry.d.ts'), "export * from './missing'\n")
      expect(() => fixDeclarationExtensions(root)).toThrow(/missing/)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})
