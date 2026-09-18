import { mount, open } from './helpers'
import { expect, test, type Page } from './test'

const setDir = (page: Page, dir: string) =>
  page.evaluate((dir) => (document.documentElement.dir = dir), dir)

for (const component of ['Button', 'Text', 'Tile', 'Input'] as const) {
  test(`${component} mirrors icon position and edge padding in RTL`, { tag: ['@layout', '@css'] }, async ({
    page,
  }) => {
    await open(page, 'mount')
    for (const iconPosition of ['start', 'end'] as const) {
      const measurements = []
      for (const dir of ['ltr', 'rtl']) {
        await setDir(page, dir)
        const shared = {
          icon: 'search',
          iconPosition,
          membrane: false,
          key: `${iconPosition}-${dir}`,
        }
        await (component === 'Input'
          ? mount(page, component, {
              label: 'Label',
              defaultValue: 'Value',
              description: 'Description',
              error: 'Error',
              ...shared,
            })
          : mount(page, component, {
              text: 'Label',
              fullWidth: true,
              stretchText: false,
              ...shared,
            }))
        const scope = component.toLowerCase()
        const root = page.locator(`[data-scope="${scope}"][data-part="root"]`)
        const icon = root.locator(
          component === 'Input'
            ? '.uf-input__icon'
            : component === 'Text'
              ? '.uf-text__icon'
              : '[data-part="icon"]',
        )
        await expect(icon).toBeVisible()
        // Wait for the requested render, including when the preceding root is still mounted.
        await expect(root).toHaveAttribute(
          component === 'Button' || component === 'Tile'
            ? `data-icon-${iconPosition}`
            : 'data-icon-position',
          component === 'Button' || component === 'Tile' ? '' : iconPosition,
        )
        const measurement = await root.evaluate((node, component) => {
          const control =
            component === 'Input' ? node.querySelector('input')! : node
          const icon = node.querySelector(
            component === 'Input'
              ? '.uf-input__icon'
              : component === 'Text'
                ? '.uf-text__icon'
                : '[data-part="icon"]',
          )!
          const box = control.getBoundingClientRect()
          const iconBox = icon.getBoundingClientRect()
          const css = getComputedStyle(control)
          return {
            left: iconBox.left - box.left,
            right: box.right - iconBox.right,
            padLeft: parseFloat(css.paddingLeft),
            padRight: parseFloat(css.paddingRight),
          }
        }, component)
        measurements.push(measurement)
      }
      const [ltr, rtl] = measurements
      expect
        .soft(rtl.left, `${iconPosition}: mirrored icon left`)
        .toBeCloseTo(ltr.right, 0)
      expect
        .soft(rtl.right, `${iconPosition}: mirrored icon right`)
        .toBeCloseTo(ltr.left, 0)
      expect
        .soft(rtl.padLeft, `${iconPosition}: mirrored padding left`)
        .toBeCloseTo(ltr.padRight, 0)
      expect
        .soft(rtl.padRight, `${iconPosition}: mirrored padding right`)
        .toBeCloseTo(ltr.padLeft, 0)
    }
  })
}

for (const dir of ['ltr', 'rtl']) {
  for (const multiline of [false, true]) {
    test(`Input trailing icon and keyboard clear share space in ${dir}/${multiline}`, { tag: ['@layout', '@focus'] }, async ({
      page,
    }) => {
      await open(page, 'mount')
      const render = async (extra: { readOnly?: true; disabled?: true } = {}) => {
        await setDir(page, dir)
        await mount(page, 'Input', {
          key: JSON.stringify(extra),
          label: 'Label',
          description: 'Help',
          error: 'Error',
          defaultValue: 'A long editable value '.repeat(10),
          icon: 'search',
          iconPosition: 'end',
          multiline,
          membrane: false,
          ...extra,
        })
      }
      await render()
      const input = page.getByRole('textbox', { name: 'Label', exact: true })
      await input.focus()
      const clear = page.getByRole('button', { name: 'Clear input' })
      const icon = page.locator('.uf-input__icon')
      const assertSpace = async () => {
        const c = (await clear.boundingBox())!
        const i = (await icon.boundingBox())!
        expect(
          dir === 'ltr' ? c.x - i.x - i.width : i.x - c.x - c.width,
        ).toBeGreaterThan(0)
        const geometry = await input.evaluate((node) => {
          const box = node.getBoundingClientRect(),
            style = getComputedStyle(node)
          return {
            left: box.left + parseFloat(style.paddingLeft),
            right: box.right - parseFloat(style.paddingRight),
          }
        })
        expect(
          dir === 'ltr' ? i.x - geometry.right : geometry.left - i.x - i.width,
        ).toBeGreaterThan(0)
      }
      await assertSpace()
      await page.keyboard.press('Tab')
      await expect(clear).toBeFocused()
      await expect(clear).toHaveCSS('outline-style', 'solid')
      await page.keyboard.press('Enter')
      await expect(input).toHaveValue('')
      await expect(input).toBeFocused()
      await expect(clear).toBeHidden()
      await input.fill('New value')
      await expect(clear).toBeVisible()
      await assertSpace()
      for (const state of ['readOnly', 'disabled'] as const) {
        await render(state === 'readOnly' ? { readOnly: true } : { disabled: true })
        if (state === 'disabled') await expect(input).toBeDisabled()
        else await expect(input).toHaveAttribute('readonly', '')
        await expect(clear).toBeHidden()
        const inset = await input.evaluate((node) =>
          parseFloat(getComputedStyle(node).paddingInlineEnd),
        )
        expect(inset).toBeLessThan(50)
      }
    })
  }
}

test('shared control padding follows direction in Checkbox, Radio, and Steps', { tag: ['@css'] }, async ({
  page,
}) => {
  await open(page, 'mount')
  for (const component of ['Checkbox', 'Radio', 'Steps'] as const) {
    const sides = []
    for (const dir of ['ltr', 'rtl']) {
      await setDir(page, dir)
      await (component === 'Checkbox'
        ? mount(page, component, { label: 'Label' })
        : component === 'Radio'
          ? mount(page, component, {
              'aria-label': 'Options',
              options: [{ value: 'a', label: 'Label' }],
            })
          : mount(page, component, { items: [{ label: 'Label' }] }))
      const control = page.locator(
        component === 'Checkbox'
          ? '[data-scope="checkbox"][data-part="root"]'
          : component === 'Radio'
            ? 'label[data-scope="radio"][data-part="item"]'
            : '[data-scope="steps"][data-part="trigger"]',
      )
      await expect(control).toBeVisible()
      sides.push(
        await control.evaluate((node) => {
          const css = getComputedStyle(node)
          return {
            left: parseFloat(css.paddingLeft),
            right: parseFloat(css.paddingRight),
          }
        }),
      )
    }
    expect(sides[1].left).toBe(sides[0].right)
    expect(sides[1].right).toBe(sides[0].left)
  }
})
