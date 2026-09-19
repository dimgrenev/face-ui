// Pins the docs.md layout that `library_guide` slices, without copying its code:
// userface-engine `mcp-server.ts` toolLibraryGuide and userface-site `engine-tools.ts`
// handleLibraryGuide both cut the constitution at the separator, the reference at
// `\n## 3.`, and one component at the first `^###+ <Name>\b` in the whole file.
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = path.resolve(__dirname, '../../..')
const docs = fs.readFileSync(path.join(root, 'docs.md'), 'utf8')
const registry = JSON.parse(
  fs.readFileSync(path.join(root, 'component-registry.json'), 'utf8'),
) as { components: Record<string, unknown> }
const names = Object.keys(registry.components).sort()

const SEPARATOR = '<!-- SEPARATOR:CONSTITUTION_END -->'
const separator = docs.indexOf(SEPARATOR)
const reference = docs.indexOf('\n## 3.')
const components = docs.indexOf('\n## 4. Components\n')

describe('docs.md layout read by library_guide', () => {
  it('has exactly one separator, immediately before section 3', () => {
    expect(docs.split(SEPARATOR)).toHaveLength(2)
    expect(reference).toBeGreaterThan(separator)
    expect(docs.slice(separator + SEPARATOR.length, reference).trim()).toBe('')
  })

  it('numbers every subheading outside the component reference', () => {
    // An unnumbered `### Text rendering` would win `component:Text` over section 4.
    expect(components).toBeGreaterThan(reference)
    const outside = docs.slice(0, components).match(/^#{3,} .*/gm) ?? []
    expect(outside.filter((heading) => !/^#{3,} \d/.test(heading))).toEqual([])
  })

  it('has one `### <Name>` article per registry component and nothing else', () => {
    const body = docs.slice(components)
    expect(body.match(/^#{4,} /m)).toBeNull()
    const headings = (body.match(/^### .*/gm) ?? []).map((heading) => heading.slice(4))
    expect(headings).toEqual(names)
  })

  it('ends with the component reference', () => {
    expect(docs.slice(components + 1).match(/^## /gm)).toEqual(['## '])
  })

  it('keeps articles, the constitution and the file readable in one prompt', () => {
    for (const article of docs.slice(components).split(/^### /m).slice(1))
      expect(article.length, article.split('\n')[0]).toBeLessThanOrEqual(1_800)
    expect(docs.slice(0, separator).length).toBeLessThanOrEqual(12_000)
    expect(docs.length).toBeLessThanOrEqual(40_000)
  })

  it('links only to sources that ship', () => {
    expect(docs).not.toMatch(/docs\/audit|\.artifacts|\/tmp\//)
  })
})
