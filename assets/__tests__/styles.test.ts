import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { libraryCss, stylesDir } from './harness/css'

const read = (file: string) => readFileSync(join(stylesDir, file), 'utf8')
const stripComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '')

const IMPORT = /^@import "(\.\/[a-z0-9/-]+\.css)";$/
const entryLines = stripComments(read('components.css'))
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean)
const imports = entryLines.map((line) => IMPORT.exec(line)?.[1] ?? line)
const componentFiles = readdirSync(join(stylesDir, 'components')).sort()

describe('components.css import list (import order = cascade order)', () => {
  it('contains only @import statements', () => {
    expect(entryLines.filter((line) => !IMPORT.test(line))).toEqual([])
  })

  it('imports text.css first and interaction.css last', () => {
    expect(imports[0]).toBe('./text.css')
    expect(imports.at(-1)).toBe('./components/interaction.css')
  })

  it('resolves every import, without duplicates', () => {
    expect(imports.filter((file) => !existsSync(join(stylesDir, file)))).toEqual([])
    expect(new Set(imports).size).toBe(imports.length)
  })

  it('leaves no orphan in components/', () => {
    const imported = new Set(imports)
    expect(componentFiles.filter((file) => !imported.has(`./components/${file}`))).toEqual([])
  })

  it('keeps components/ free of @import and url() (flattening must not move relative URLs)', () => {
    const offenders = componentFiles.filter((file) =>
      /@import|url\(/.test(stripComments(read(`components/${file}`))),
    )
    expect(offenders).toEqual([])
  })

  it('flattens into one stylesheet', () => {
    expect(stripComments(libraryCss())).not.toMatch(/@import/)
  })
})
