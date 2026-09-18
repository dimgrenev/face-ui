import { test, expect, type Page } from './test'
import { mount, open, type MountProps } from './helpers'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
async function render(page: Page, props: MountProps<'Badge'>) {
  await mount(page, 'Badge', props)
  await expect(page.locator('[data-scope="badge"][data-part="root"]')).toBeVisible()
}
test.beforeEach(async ({ page }) => {
  await open(page, 'mount')
})
for (const theme of ['light', 'dark']) {
  test(`Badge tone and appearance combinations are readable in ${theme}`, { tag: ['@css', '@a11y'] }, async ({
    page,
  }) => {
    await page.evaluate(
      (theme) => (document.documentElement.dataset.theme = theme),
      theme,
    )
    await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') })
    const signatures: string[] = []
    for (const appearance of ['fill', 'outline'] as const) {
      for (const tone of [
        'neutral',
        'accent',
        'positive',
        'warning',
        'destructive',
      ] as const) {
        await render(page, {
          text: 'Deployment ready',
          tone,
          appearance,
        })
        const node = page.locator('[data-scope="badge"]')
        await expect(node).toHaveAttribute('data-tone', tone)
        signatures.push(
          await node.evaluate((n) => {
            const s = getComputedStyle(n)
            return [s.color, s.backgroundColor, s.boxShadow].join(';')
          }),
        )
        const violations = await page.evaluate(
          async () =>
            (
              await (window as any).axe.run(
                document.querySelector('[data-prop-fixture]'),
                { runOnly: { type: 'rule', values: ['color-contrast'] } },
              )
            ).violations,
        )
        expect(violations, `${appearance}/${tone}`).toEqual([])
      }
    }
    // The authored monochrome palette intentionally aliases accent/destructive
    // in light mode. The custom-palette test checks their independent bindings.
    expect(new Set(signatures).size).toBe(theme === 'light' ? 8 : 10)
  })
}
test('Badge tones bind independent semantic tokens when the host supplies a color palette', { tag: ['@css'] }, async ({
  page,
}) => {
  await page.evaluate(() => {
    for (const [name, color] of Object.entries({
      accent: '#2457d6',
      success: '#18743d',
      warning: '#916b00',
      destructive: '#b82030',
    }))
      document.documentElement.style.setProperty(`--uf-color-${name}`, color)
  })
  for (const appearance of ['fill', 'outline'] as const) {
    const colors = new Set<string>()
    for (const tone of [
      'neutral',
      'accent',
      'positive',
      'warning',
      'destructive',
    ] as const) {
      await render(page, { text: 'Status', tone, appearance })
      const node = page.locator('[data-scope="badge"]')
      await expect(node).toHaveAttribute('data-tone', tone)
      colors.add(
        await node.evaluate((node, appearance) => {
          const s = getComputedStyle(node)
          return appearance === 'fill' ? s.backgroundColor : s.boxShadow
        }, appearance),
      )
    }
    expect(colors.size).toBe(5)
  }
})
