import { expect, test } from '@playwright/test'

for (const component of ['Button', 'Text', 'Tile', 'Input']) {
  test(`${component} mirrors icon position and edge padding in RTL`, async ({
    page,
  }) => {
    await page.goto('/scripts/browser/props.html')
    await page.waitForFunction(
      () => typeof (window as any).renderProps === 'function',
    )
    for (const iconPosition of ['start', 'end']) {
      const measurements = []
      for (const dir of ['ltr', 'rtl']) {
        await page.evaluate(
          ({ component, iconPosition, dir }) => {
            document.documentElement.dir = dir
            const props =
              component === 'Input'
                ? {
                    label: 'Label',
                    defaultValue: 'Value',
                    description: 'Description',
                    error: 'Error',
                  }
                : { text: 'Label', fullWidth: true, stretchText: false }
            ;(window as any).renderProps(component, {
              ...props,
              icon: 'search',
              iconPosition,
              membrane: false,
              key: `${iconPosition}-${dir}`,
            })
          },
          { component, iconPosition, dir },
        )
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
    test(`Input trailing icon and keyboard clear share space in ${dir}/${multiline}`, async ({
      page,
    }) => {
      await page.goto('/scripts/browser/props.html')
      await page.waitForFunction(
        () => typeof (window as any).renderProps === 'function',
      )
      const render = async (extra: Record<string, unknown> = {}) => {
        await page.evaluate(
          ({ dir, multiline, extra }) => {
            document.documentElement.dir = dir
            ;(window as any).renderProps('Input', {
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
          },
          { dir, multiline, extra },
        )
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
      for (const state of ['readOnly', 'disabled']) {
        await render({ [state]: true })
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

test('shared control padding follows direction in Checkbox, Radio, and Steps', async ({
  page,
}) => {
  await page.goto('/scripts/browser/props.html')
  await page.waitForFunction(
    () => typeof (window as any).renderProps === 'function',
  )
  for (const component of ['Checkbox', 'Radio', 'Steps']) {
    const sides = []
    for (const dir of ['ltr', 'rtl']) {
      await page.evaluate(
        ({ component, dir }) => {
          document.documentElement.dir = dir
          const props =
            component === 'Checkbox'
              ? { label: 'Label' }
              : component === 'Radio'
                ? {
                    ariaLabel: 'Options',
                    options: [{ value: 'a', label: 'Label' }],
                  }
                : { items: [{ label: 'Label' }] }
          ;(window as any).renderProps(component, props)
        },
        { component, dir },
      )
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
