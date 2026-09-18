import { test, expect, type Page } from '@playwright/test'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)

async function render(page: Page, props: Record<string, unknown>) {
  await page.evaluate(
    (props) => (window as any).renderProps('Button', props),
    props,
  )
}
test.beforeEach(async ({ page }) => {
  await page.goto('/scripts/browser/props.html')
  await page.waitForFunction(
    () => typeof (window as any).renderProps === 'function',
  )
})

for (const theme of ['light', 'dark']) {
  test(`Button variant has distinct visible states and readable content in ${theme}`, async ({
    page,
  }) => {
    await page.evaluate(
      (theme) => (document.documentElement.dataset.theme = theme),
      theme,
    )
    await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') })
    const signatures = []
    for (const variant of [
      'default',
      'primary',
      'secondary',
      'accent',
      'outline',
      'ghost',
      'destructive',
    ]) {
      await page.mouse.move(700, 500)
      await render(page, {
        text: 'Action',
        rightText: '⌘K',
        icon: 'user',
        variant,
      })
      const button = page.getByRole('button', { name: 'Action ⌘K' })
      await expect(button).toHaveAttribute('data-variant', variant)
      const before = await button.evaluate((node) => {
        const style = getComputedStyle(node)
        return [
          style.backgroundColor,
          style.color,
          style.boxShadow,
          node.getBoundingClientRect().width,
          node.getBoundingClientRect().height,
        ]
      })
      await button.hover()
      const after = await button.evaluate((node) => {
        const style = getComputedStyle(node)
        return [
          style.backgroundColor,
          style.color,
          style.boxShadow,
          node.getBoundingClientRect().width,
          node.getBoundingClientRect().height,
        ]
      })
      expect(after.slice(3)).toEqual(before.slice(3))
      signatures.push(JSON.stringify([before.slice(0, 3), after.slice(0, 3)]))
      const violations = await page.evaluate(
        async () =>
          (
            await (window as any).axe.run(
              document.querySelector('[data-prop-fixture]'),
              {
                runOnly: {
                  type: 'rule',
                  values: ['color-contrast', 'button-name'],
                },
              },
            )
          ).violations,
      )
      expect(violations, variant).toEqual([])
    }
    expect(new Set(signatures).size).toBe(7)
  })
}

test('Button fullWidth, iconOnly, loading and membrane retain their effects in combination', async ({
  page,
}) => {
  const button = page.getByRole('button', { name: 'Search' })
  await render(page, { text: 'Search', icon: 'search', iconOnly: true })
  await expect(button).toBeVisible()
  const square = await button.boundingBox()
  expect(square!.width).toBe(square!.height)
  await expect(button.locator('.uf-visually-hidden')).toHaveCSS(
    'position',
    'absolute',
  )
  await expect(button.locator('.uf-visually-hidden')).toHaveCSS('width', '1px')
  await render(page, {
    text: 'Search',
    icon: 'search',
    iconOnly: true,
    fullWidth: true,
  })
  const availableWidth = await page
    .locator('[data-prop-fixture]')
    .evaluate((node) => {
      const style = getComputedStyle(node)
      return (
        node.clientWidth -
        Number.parseFloat(style.paddingLeft) -
        Number.parseFloat(style.paddingRight)
      )
    })
  await expect(button).toHaveCSS('width', `${availableWidth - 2}px`)
  const membrane = button.locator('..')
  expect(
    (await membrane.boundingBox())!.width - (await button.boundingBox())!.width,
  ).toBe(2)
  await render(page, {
    text: 'Search',
    icon: 'search',
    iconOnly: true,
    chevron: 'down',
  })
  await expect(button.locator('svg')).toHaveCount(2)
  const disclosure = await button.boundingBox()
  const geometry = await button.evaluate((node) =>
    [node, ...node.children].map((n) => {
      const s = getComputedStyle(n)
      return {
        html: n.outerHTML.slice(0, 180),
        width: s.width,
        minWidth: s.minWidth,
        flex: s.flex,
        position: s.position,
        padding: s.padding,
        gap: s.gap,
      }
    }),
  )
  expect(disclosure!.width, JSON.stringify(geometry)).toBeGreaterThan(
    disclosure!.height,
  )
  await render(page, {
    text: 'Search',
    icon: 'search',
    iconOnly: true,
    fullWidth: true,
    loading: true,
    membrane: false,
  })
  await expect(button).toHaveCSS('width', `${availableWidth}px`)
  await expect(button).toBeDisabled()
  await expect(button).toHaveAttribute('aria-busy', 'true')
  await expect(button.locator('.uf-button__spinner')).toBeVisible()
  await expect(page.locator('.uf-membrane:not([data-membrane-disabled])')).toHaveCount(0)
})

test('Button align, stretchText, rightText, iconPosition and chevron compose without overriding each other', async ({
  page,
}) => {
  const button = page.getByRole('button')
  for (const chevron of ['down', 'right']) {
    for (const align of ['left', 'center', 'right']) {
      await render(page, {
        text: 'Account',
        rightText: 'Pro',
        icon: 'user',
        iconPosition: 'end',
        style: { width: 320 },
        align,
        chevron,
      })
      await expect(button).toHaveCSS('text-align', align)
      const label = await button.locator('[data-part="label"]').boundingBox()
      const icon = await button.locator('[data-part="icon"]').boundingBox()
      const indicator = await button
        .locator('[data-part="indicator"]')
        .boundingBox()
      expect(icon!.x).toBeGreaterThan(label!.x)
      expect(indicator!.x).toBeGreaterThan(icon!.x)
      const compact = await button.locator('[data-part="text"]').boundingBox()
      await render(page, {
        text: 'Account',
        rightText: 'Pro',
        icon: 'user',
        iconPosition: 'end',
        style: { width: 320 },
        align,
        chevron,
        stretchText: true,
      })
      await expect(button).toHaveAttribute('data-stretch-text', '')
      const stretched = await button.locator('[data-part="text"]').boundingBox()
      expect(stretched!.width).toBeGreaterThan(compact!.width + 100)
    }
  }
  await render(page, {
    text: 'Details',
    chevron: 'right',
    'aria-expanded': false,
  })
  await expect(button.locator('[data-part="indicator"]')).toHaveCSS(
    'transform',
    'none',
  )
  await render(page, {
    text: 'Details',
    chevron: 'right',
    'aria-expanded': true,
  })
  await expect(button.locator('[data-part="indicator"]')).toHaveCSS(
    'transform',
    'matrix(-1, 0, 0, -1, 0, 0)',
  )
})

test('Button level changes measured indentation and clamps invalid or fractional levels', async ({
  page,
}) => {
  const button = page.getByRole('button')
  const padding = async () =>
    button.evaluate((node) =>
      Number.parseFloat(getComputedStyle(node).paddingLeft),
    )
  await render(page, { text: 'Node', level: 0 })
  const zero = await padding()
  await render(page, { text: 'Node', level: 2 })
  await expect(button).toHaveCSS('--face-runtime-option-level', '2')
  const two = await padding()
  expect(two).toBeGreaterThan(zero)
  await render(page, { text: 'Node', level: 2.8 })
  await expect(button).toHaveCSS('--face-runtime-option-level', '2')
  expect(await padding()).toBe(two)
  await render(page, { text: 'Node', level: -20 })
  await expect(button).toHaveCSS('--face-runtime-option-level', '0')
  expect(await padding()).toBe(zero)
  await render(page, { text: 'Node', level: 100 })
  await expect(button).toHaveCSS('--face-runtime-option-level', '9')
  await render(page, { text: 'Node' })
  await expect(button).not.toHaveAttribute('data-level')
  expect(await padding()).toBe(zero)
})

test('ButtonGroup orientation aligns default membrane buttons and shapes the actual inner corners', async ({
  page,
}) => {
  for (const orientation of ['horizontal', 'vertical']) {
    await page.evaluate((orientation) => {
      const { React, propComponents, renderProps } = window as any
      renderProps('ButtonGroup', {
        orientation,
        'aria-label': 'Formatting',
        children: [
          React.createElement(propComponents.Button, {
            key: 'a',
            text: 'Bold',
          }),
          React.createElement(propComponents.Button, {
            key: 'b',
            text: 'Italic',
          }),
        ],
      })
    }, orientation)
    const group = page.getByRole('group', { name: 'Formatting' })
    await expect(group).toHaveAttribute('data-orientation', orientation)
    const first = group.getByRole('button', { name: 'Bold' })
    const second = group.getByRole('button', { name: 'Italic' })
    const a = await first.boundingBox()
    const b = await second.boundingBox()
    if (orientation === 'horizontal') {
      expect(a!.y).toBe(b!.y)
      expect(b!.x).toBeGreaterThan(a!.x)
      await expect(first).toHaveCSS('border-top-right-radius', '0px')
      await expect(second).toHaveCSS('border-top-left-radius', '0px')
    } else {
      expect(a!.x).toBe(b!.x)
      expect(b!.y).toBeGreaterThan(a!.y)
      await expect(first).toHaveCSS('border-bottom-left-radius', '0px')
      await expect(second).toHaveCSS('border-top-left-radius', '0px')
    }
  }
})

test('Button native activation, disabled, copyText and onCopied work through keyboard and padding clicks', async ({
  page,
}) => {
  await page.evaluate(() => {
    const state = window as any
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          state.propEvents.push(`copy:${text}`)
        },
      },
    })
    state.renderProps('Button', {
      text: 'Copy',
      copyText: 'value',
      onClick: () => state.propEvents.push('click'),
      onCopied: () => state.propEvents.push('copied'),
    })
  })
  const button = page.getByRole('button', { name: 'Copy' })
  await button.focus()
  await page.keyboard.press('Enter')
  await expect
    .poll(() => page.evaluate(() => (window as any).propEvents))
    .toEqual(['click', 'copy:value', 'copied'])
  await page.keyboard.press('Space')
  await expect
    .poll(() => page.evaluate(() => (window as any).propEvents.length))
    .toBe(6)
  const outer = await button.locator('..').boundingBox()
  await page.mouse.click(outer!.x + 0.5, outer!.y + outer!.height / 2)
  await expect
    .poll(() => page.evaluate(() => (window as any).propEvents.length))
    .toBe(9)
  await page.evaluate(() =>
    (window as any).renderProps('Button', {
      text: 'Copy',
      copyText: 'value',
      disabled: true,
      onClick: () => (window as any).propEvents.push('unexpected'),
    }),
  )
  await expect(button).toBeDisabled()
  await page.mouse.click(outer!.x + 0.5, outer!.y + outer!.height / 2)
  expect(await page.evaluate(() => (window as any).propEvents.length)).toBe(9)
})

test('Button type, form, name and value participate in real native form actions', async ({
  page,
}) => {
  await page.evaluate(() => {
    const form = document.createElement('form')
    form.id = 'editor'
    form.innerHTML = '<input name="title" aria-label="Title" required>'
    form.addEventListener('submit', (event) => {
      event.preventDefault()
      const data = new FormData(form, (event as SubmitEvent).submitter)
      ;(window as any).propEvents.push(
        `${data.get('title')}:${data.get('action')}`,
      )
    })
    document.body.appendChild(form)
  })
  const props = { text: 'Save', form: 'editor', name: 'action', value: 'save' }
  await render(page, props)
  await page.getByRole('button', { name: 'Save' }).click()
  expect(await page.evaluate(() => (window as any).propEvents)).toEqual([])
  await render(page, { ...props, type: 'submit' })
  await page.getByRole('button', { name: 'Save' }).click()
  expect(await page.evaluate(() => (window as any).propEvents)).toEqual([])
  await page.getByRole('textbox', { name: 'Title' }).fill('Draft')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect
    .poll(() => page.evaluate(() => (window as any).propEvents))
    .toEqual(['Draft:save'])
  await render(page, { ...props, text: 'Reset', type: 'reset' })
  await page.getByRole('button', { name: 'Reset' }).click()
  await expect(page.getByRole('textbox', { name: 'Title' })).toHaveValue('')
})
