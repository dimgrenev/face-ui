import { test, expect } from '@playwright/test'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const registry = require('../../component-registry.json')
for (const [name, entry] of Object.entries(registry.components)) {
  if ((entry as any).status === 'deprecated') continue
  test(`${name} gallery has valid accessible markup`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto(`/scripts/browser/gallery.html?component=${name}`)
    await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') })
    const violations = await page.evaluate(
      async () =>
        (
          await (window as any).axe.run(document, {
            runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
          })
        ).violations,
    )
    expect(errors).toEqual([])
    expect(
      violations.map((v: any) => ({
        id: v.id,
        nodes: v.nodes.map((n: any) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
    ).toEqual([])
  })
}
