import { createRequire } from 'node:module'
import { test, expect } from './test'
import { axe, open } from './helpers'

const registry = createRequire(import.meta.url)('../../../component-registry.json')

for (const [name, entry] of Object.entries(registry.components)) {
  if ((entry as any).status === 'deprecated') continue
  test(`${name} gallery has valid accessible markup`, { tag: ['@a11y'] }, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await open(page, 'gallery', `?component=${name}`)
    const violations = await axe(page)
    expect(errors).toEqual([])
    expect(violations).toEqual([])
  })
}

for (const mode of ['light', 'dark'] as const) {
  test(`composed components are accessible in ${mode} theme`, { tag: ['@css', '@a11y'] }, async ({ page }) => {
    await open(page, 'composition')
    await page
      .locator('html')
      .evaluate((el, mode) => el.setAttribute('data-theme', mode), mode)
    expect(await axe(page)).toEqual([])
  })
}
