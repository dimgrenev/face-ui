import { createRequire } from 'node:module'
import type { MountRegistry } from './fixtures/mount.fixture'
import { mount, open, type MountProps } from './helpers'
import { test, expect, type Page } from './test'

const require = createRequire(import.meta.url)
const variants = [
  'body',
  'heading',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'label',
  'kbd',
  'code',
  'markdown',
  'muted',
  'blockquote',
] as const
async function render<K extends keyof MountRegistry>(
  page: Page,
  name: K,
  props: MountProps<K>,
) {
  await mount(page, name, props)
  await expect(
    page.locator(`[data-scope="${name.toLowerCase()}"][data-part="root"]`),
  ).toBeVisible()
}
test.beforeEach(async ({ page }) => {
  await open(page, 'mount')
})
test('Text size changes actual typography for every variant', { tag: ['@css'] }, async ({
  page,
}) => {
  const node = page.locator('[data-scope="text"]')
  for (const variant of variants) {
    const sizes: number[] = []
    for (const size of ['xs', 'sm', 'md', 'lg', 'xl'] as const) {
      await render(page, 'Text', { text: 'Typography', variant, size })
      await expect(node).toHaveAttribute('data-size', size)
      const metrics = await node.evaluate((node) => {
        const s = getComputedStyle(node)
        return { font: parseFloat(s.fontSize), line: parseFloat(s.lineHeight) }
      })
      sizes.push(metrics.font)
      expect(
        metrics.line,
        `${variant}/${size} line height`,
      ).toBeGreaterThanOrEqual(metrics.font)
    }
    expect(sizes, variant).toEqual([...new Set(sizes)].sort((a, b) => a - b))
    expect(sizes, variant).toHaveLength(5)
  }
})
test('Text inset none removes padding for every variant and either icon position', { tag: ['@css'] }, async ({
  page,
}) => {
  const node = page.locator('[data-scope="text"]')
  for (const variant of variants) {
    for (const iconPosition of ['start', 'end'] as const) {
      await render(page, 'Text', {
        text: 'Flush',
        variant,
        inset: 'none',
        icon: 'user',
        iconPosition,
      })
      await expect(node, `${variant}/${iconPosition}`).toHaveCSS(
        'padding',
        '0px',
      )
      await render(page, 'Text', {
        text: 'Inset',
        variant,
        inset: 'control',
        icon: 'user',
        iconPosition,
      })
      await expect(node).not.toHaveCSS('padding', '0px')
    }
  }
})
for (const width of [240, 800]) {
  test(`Text content height follows wrapped content at ${width}px without changing inline inset`, { tag: ['@layout', '@css'] }, async ({
    page,
  }) => {
    const node = page.locator('[data-scope="text"]')
    for (const variant of variants) {
      for (const inset of ['control', 'none'] as const) {
        for (const icon of [undefined, 'user']) {
          const props = {
            text: 'A heading or paragraph that wraps naturally when the available space becomes narrow.',
            variant,
            inset,
            icon,
            membrane: false,
            style: { width },
          }
          await render(page, 'Text', props)
          await expect(node).toHaveAttribute('data-height-mode', 'control')
          const before = await node.evaluate((n) => {
            const s = getComputedStyle(n)
            return [
              s.paddingInlineStart,
              s.paddingInlineEnd,
              s.fontSize,
              s.lineHeight,
            ]
          })
          await render(page, 'Text', { ...props, heightMode: 'content' })
          await expect(node).toHaveAttribute('data-height-mode', 'content')
          const after = await node.evaluate((n) => {
            const s = getComputedStyle(n)
            return {
              unchanged: [
                s.paddingInlineStart,
                s.paddingInlineEnd,
                s.fontSize,
                s.lineHeight,
              ],
              padding: [s.paddingTop, s.paddingBottom],
              minHeight: s.minHeight,
              height: n.getBoundingClientRect().height,
              contentHeight: Math.max(
                ...Array.from(n.children).map(
                  (c) => c.getBoundingClientRect().height,
                ),
              ),
              border:
                parseFloat(s.borderTopWidth) + parseFloat(s.borderBottomWidth),
            }
          })
          const label = `${variant}/${inset}/${icon ?? 'text'}/${width}`
          expect(after.unchanged, label).toEqual(before)
          expect(after.padding, label).toEqual(['0px', '0px'])
          expect(after.minHeight, label).toBe('0px')
          expect(
            Math.abs(after.height - after.contentHeight - after.border),
            label,
          ).toBeLessThan(1)
        }
      }
    }
  })
}
test('Text alignment, width, membrane, stretching and truncation have independent layout effects', { tag: ['@layout', '@css'] }, async ({
  page,
}) => {
  const node = page.locator('[data-scope="text"]')
  for (const membrane of [true, false]) {
    for (const align of ['left', 'center', 'right'] as const) {
      await render(page, 'Text', {
        text: 'Text',
        fullWidth: true,
        align,
        membrane,
        icon: 'user',
      })
      await expect(node).toHaveCSS('text-align', align)
      await expect(node).toHaveCSS('width', `${membrane ? 398 : 400}px`)
      const small = await node.locator('.uf-text__content').boundingBox()
      await render(page, 'Text', {
        text: 'Text',
        fullWidth: true,
        align,
        membrane,
        icon: 'user',
        stretchText: true,
      })
      await expect(node).toHaveAttribute('data-stretch-text', '')
      const stretched = await node.locator('.uf-text__content').boundingBox()
      expect(stretched!.width).toBeGreaterThan(small!.width + 200)
    }
    await render(page, 'Text', {
      text: 'A long piece of text that cannot fit on a single line '.repeat(5),
      fullWidth: true,
      truncate: true,
      membrane,
      icon: 'user',
    })
    const content = node.locator('.uf-text__content')
    await expect(content).toHaveCSS('text-overflow', 'ellipsis')
    expect(await content.evaluate((n) => n.scrollWidth > n.clientWidth)).toBe(
      true,
    )
    expect((await node.boundingBox())!.width).toBeLessThanOrEqual(400)
    await render(page, 'Text', {
      text: 'A long piece of text that cannot fit on a single line '.repeat(5),
      fullWidth: true,
      truncate: false,
      membrane,
    })
    await expect(node).not.toHaveAttribute('data-truncate')
    expect((await node.boundingBox())!.height).toBeGreaterThan(60)
  }
})
test('Text htmlFor focuses a real input and as preserves semantic elements', { tag: ['@native', '@pointer'] }, async ({
  page,
}) => {
  await render(page, 'Text', {
    text: 'Email',
    variant: 'label',
    htmlFor: 'email',
  })
  await page.evaluate(() => {
    const input = document.createElement('input')
    input.id = 'email'
    document.body.append(input)
  })
  await page.getByText('Email', { exact: true }).click()
  await expect(page.locator('#email')).toBeFocused()
  await render(page, 'Text', { text: 'Quotation', variant: 'blockquote' })
  await expect(page.locator('blockquote[data-scope="text"]')).toBeVisible()
  await render(page, 'Text', {
    text: 'Display heading',
    variant: 'h1',
    as: 'span',
  })
  await expect(page.getByRole('heading')).toHaveCount(0)
  await expect(page.locator('span[data-scope="text"]')).toBeVisible()
})
for (const theme of ['light', 'dark']) {
  test(`Text variant content is readable in ${theme}`, { tag: ['@css', '@a11y'] }, async ({ page }) => {
    await page.evaluate(
      (theme) => (document.documentElement.dataset.theme = theme),
      theme,
    )
    await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') })
    for (const variant of variants) {
      await render(page, 'Text', { text: 'Readable text', variant })
      await expect(page.locator('[data-scope="text"]')).toHaveAttribute(
        'data-variant',
        variant,
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
      expect(violations, variant).toEqual([])
    }
  })
}
