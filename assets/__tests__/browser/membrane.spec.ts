import { test, expect } from './test'
import { hooks, open } from './helpers'
import type { Hooks } from './fixtures/membrane.fixture'

const { renderMembrane } = hooks<Hooks>()
type Case = Parameters<typeof renderMembrane>[1]

test.beforeEach(async ({ page }) => {
  await open(page, 'membrane')
})
const selectors = {
  Button: 'button',
  Tile: '[data-part="primary"]',
  Text: '.uf-text',
  Input: 'input',
  Checkbox: 'input',
  Switcher: 'input',
  Radio: 'input',
  SegmentedControl: 'button',
  Tabs: '[role="tab"]',
  Select: '[data-part="trigger"]',
  Date: '[data-part="trigger"]',
  Breadcrumb: 'a',
  Separator: '[role="separator"]',
  Media: '[data-scope="media"][data-part="root"]',
  Markdown: 'a',
  Table: 'button',
} satisfies Partial<Record<Case, string>>
for (const [name, selector] of Object.entries(selectors) as [Case, string][]) {
  test(`${name} spacing changes preserve the control, focus and accessible representation`, { tag: ['@layout', '@focus', '@react'] }, async ({
    page,
  }) => {
    await renderMembrane(page, name, false)
    const node = page.locator(selector).first()
    await expect(node).toBeVisible()
    await node.evaluate((node) => {
      ;(window as any).membraneControl = node
      ;(node as HTMLElement).focus()
    })
    const focusable = name !== 'Separator'
    if (focusable) await expect(node).toBeFocused()
    const representation = await node.ariaSnapshot()
    const before = await node.boundingBox()
    for (const enabled of [true, false, true, false]) {
      await renderMembrane(page, name, enabled)
      await expect(page.locator('[data-membrane-value]')).toHaveAttribute(
        'data-membrane-value',
        String(enabled),
      )
      expect(
        await node.evaluate((node) => node === (window as any).membraneControl),
      ).toBe(true)
      if (focusable) await expect(node).toBeFocused()
      expect(await node.ariaSnapshot()).toBe(representation)
      if (!enabled) expect(await node.boundingBox()).toEqual(before)
    }
  })
}

test('an edited field keeps text selection and a child keeps React state while spacing changes', { tag: ['@focus', '@react'] }, async ({
  page,
}) => {
  await renderMembrane(page, 'Input', false)
  const input = page.getByRole('textbox', { name: 'Name' })
  await input.fill('Unsaved edits')
  await input.evaluate((node) =>
    (node as HTMLInputElement).setSelectionRange(2, 7),
  )
  for (const enabled of [true, false]) {
    await renderMembrane(page, 'Input', enabled)
    await expect(page.locator('[data-membrane-value]')).toHaveAttribute(
      'data-membrane-value',
      String(enabled),
    )
    await expect(input).toBeFocused()
    await expect(input).toHaveValue('Unsaved edits')
    expect(
      await input.evaluate((node) => [
        (node as HTMLInputElement).selectionStart,
        (node as HTMLInputElement).selectionEnd,
      ]),
    ).toEqual([2, 7])
  }
  await renderMembrane(page, 'Children', true)
  const counter = page.getByRole('button', { name: 'Count 0' })
  await counter.focus()
  await page.keyboard.press('Enter')
  for (const enabled of [false, true]) {
    await renderMembrane(page, 'Children', enabled)
    await expect(page.locator('[data-membrane-value]')).toHaveAttribute(
      'data-membrane-value',
      String(enabled),
    )
    await expect(page.getByRole('button', { name: 'Count 1' })).toBeFocused()
  }
})

test('only enabled spacing creates a box and forwards its padding activation', { tag: ['@layout', '@css', '@pointer'] }, async ({
  page,
}) => {
  for (const name of ['Button', 'Tile', 'ComposedButton'] as const) {
    for (const enabled of [true, false, true]) {
      await renderMembrane(page, name, enabled)
      await expect(page.locator('[data-membrane-value]')).toHaveAttribute(
        'data-membrane-value',
        String(enabled),
      )
      await expect(page.locator('[data-membrane-component]')).toHaveAttribute(
        'data-membrane-component',
        name,
      )
      const control = page.getByRole('button', {
        name: name === 'Tile' ? 'Project' : 'Save',
      })
      const boundary = page.locator('[data-membrane-value] > .uf-membrane')
      const count = await page.evaluate(
        () => (window as any).membraneEvents.length,
      )
      if (enabled) {
        const box = (await boundary.boundingBox())!
        expect(box.height - (await control.boundingBox())!.height).toBe(2)
        if (name === 'ComposedButton') {
          await control.hover()
          const nativeHover = await control.evaluate(
            (node) => getComputedStyle(node).backgroundColor,
          )
          await page.mouse.move(box.x + 0.5, box.y + 0.5)
          await expect(boundary).toHaveAttribute('data-membrane-hover', '')
          await expect(control).toHaveCSS('background-color', nativeHover)
        }
        await page.mouse.click(box.x + 0.5, box.y + 0.5)
      } else {
        await expect(boundary).toHaveCSS('display', 'contents')
        expect(
          await boundary.evaluate((node) => node.getClientRects().length),
        ).toBe(0)
        await control.focus()
        await page.keyboard.press('Enter')
      }
      await expect(control).toBeFocused()
      expect(
        await page.evaluate(() => (window as any).membraneEvents.length),
      ).toBe(count + 1)
    }
  }
})

test('a full-width boundary stretches a control through its inactive membrane', { tag: ['@layout'] }, async ({
  page,
}) => {
  await renderMembrane(page, 'FullWidth', true)
  const button = page.getByRole('button', { name: 'Save' })
  await expect(button).toBeVisible()
  const boundary = page.locator('[data-membrane-value] > .uf-membrane')
  const outer = (await boundary.boundingBox())!
  const inner = (await button.boundingBox())!
  expect(outer.width).toBe(400)
  expect(outer.width - inner.width).toBe(2)
})
