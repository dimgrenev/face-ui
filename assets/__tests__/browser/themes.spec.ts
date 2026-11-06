import { expect, test } from './test'
import { open } from './helpers'

test('nested themes resolve text, border, surface and compatibility aliases locally without resetting density', { tag: ['@css'] }, async ({
  page,
}) => {
  await open(page, 'themes')
  await expect(page.getByRole('switch')).toHaveCount(2)
  for (const outer of ['dark', 'light']) {
    await page.evaluate(
      (theme) => (document.documentElement.dataset.theme = theme),
      outer,
    )
    for (const theme of ['light', 'dark']) {
      const panel = page.locator(`section[data-theme="${theme}"]`)
      const mismatches = await panel.evaluate((node) => {
        const probe = document.createElement('span')
        node.append(probe)
        const color = (value: string) => {
          probe.style.color = value
          return getComputedStyle(probe).color
        }
        const failures: string[] = []
        for (const [alias, semantic] of [
          ['--uf-text-color', '--uf-color-fg'],
          ['--foreground', '--uf-color-foreground'],
          ['--background', '--uf-color-background'],
          ['--border', '--uf-color-border'],
          ['--uf-tile-fg', '--uf-color-fg'],
          ['--uf-badge-fg', '--uf-color-fg'],
          ['--uf-badge-bg', '--uf-color-hover-bg'],
          ['--uf-card-bg', '--uf-overlay-surface-bg'],
          ['--uf-table-resize-line-color', '--uf-color-border-hover'],
        ])
          if (color(`var(${alias})`) !== color(`var(${semantic})`))
            failures.push(alias)
        const text = node.querySelector(':scope > .uf-membrane > .uf-text')!
        if (getComputedStyle(text).color !== color('var(--uf-color-fg)'))
          failures.push('actual Text')
        probe.style.border = 'var(--uf-border-default)'
        if (
          getComputedStyle(probe).borderTopColor !==
          color('var(--uf-color-border)')
        )
          failures.push('actual border')
        probe.remove()
        return failures
      })
      expect(mismatches, `${outer} root / ${theme} island`).toEqual([])
      await expect(
        panel.locator(':scope > .uf-membrane > .uf-switcher'),
      ).toHaveCSS('min-height', '40px')
    }
  }
})
