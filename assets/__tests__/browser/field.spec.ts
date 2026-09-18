import { expect, test, type Page } from './test'
import { axe, hooks, open } from './helpers'
import type { Hooks } from './fixtures/field.fixture'

const { renderField } = hooks<Hooks>()
type Props = Parameters<typeof renderField>[1]

const errors = new WeakMap<Page, string[]>()
test.beforeEach(async ({ page }) => {
  errors.set(page, [])
  page.on('pageerror', (error) => errors.get(page)!.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.get(page)!.push(message.text())
  })
  await open(page, 'field')
})
test.afterEach(async ({ page }) => {
  expect(errors.get(page)).toEqual([])
})

// Wraps beside the control at 420px, so first-line alignment is what is measured.
const LABEL = 'Billing contact email for monthly invoices'
const full: Props = {
  label: LABEL,
  required: true,
  description: 'Help',
  error: 'Wrong',
}
const modes = [false, true].flatMap((group) =>
  (['ltr', 'rtl'] as const).flatMap((dir) =>
    [true, false].map((membrane) => ({ group, dir, membrane })),
  ),
)

/** Boxes of the root and its parts; a disabled membrane contributes its child. */
async function measure(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready
  })
  return page.evaluate(() => {
    const root = document.querySelector('.uf-field')!
    const box = (element: Element) => {
      const { left, right, top, bottom, width } = element.getBoundingClientRect()
      return { left, right, top, bottom, width }
    }
    const [label, item, description, error] = Array.from(root.children, (child) =>
      getComputedStyle(child).display === 'contents' ? child.firstElementChild! : child,
    )
    const value = root.querySelector('.uf-probe__input, .uf-probe__options')!
    const text = document.createRange()
    text.selectNodeContents(label.firstChild!)
    const lines = text.getClientRects()
    const line = (rect: DOMRect) => (rect.top + rect.bottom) / 2
    return {
      root: box(root),
      label: box(label),
      item: box(item),
      description: box(description),
      error: box(error),
      marker: box(root.querySelector('.uf-field__required')!),
      labelLines: lines.length,
      labelLine: line(lines[0]),
      valueLine: line(value.getBoundingClientRect()),
      overflow: root.scrollWidth - root.clientWidth,
    }
  })
}

for (const labelPosition of ['top', 'start'] as const)
  for (const width of [300, 420, 800])
    test(`${labelPosition} at ${width}px lays out label, control, help and error in both directions, with and without membrane`, { tag: ['@layout'] }, async ({
      page,
    }) => {
      // Beside the control only where two 10rem columns fit; narrower, it stacks as top.
      const beside = labelPosition === 'start' && width >= 420
      for (const mode of modes) {
        const at = JSON.stringify(mode)
        await renderField(page, { ...full, labelPosition, ...mode }, width)
        const m = await measure(page)
        const rtl = mode.dir === 'rtl'
        const start = (b: { left: number; right: number }) => (rtl ? -b.right : b.left)
        const end = (b: { left: number; right: number }) => (rtl ? -b.left : b.right)
        expect(m.root.width, at).toBeCloseTo(width, 0)
        expect(m.overflow, at).toBeLessThanOrEqual(0)
        for (const part of [m.label, m.item, m.description, m.error, m.marker]) {
          expect(start(part), at).toBeGreaterThanOrEqual(start(m.root) - 0.5)
          expect(end(part), at).toBeLessThanOrEqual(end(m.root) + 0.5)
        }
        expect(m.marker.top, at).toBeGreaterThanOrEqual(m.label.top)
        expect(m.marker.bottom, at).toBeLessThanOrEqual(m.label.bottom)
        if (beside) {
          // Two equal columns, label first in reading order, its first line on the control's.
          expect(end(m.label), at).toBeLessThanOrEqual(start(m.item) + 0.5)
          expect(Math.abs(m.label.width - m.item.width), at).toBeLessThanOrEqual(1)
          expect(Math.abs(m.labelLine - m.valueLine), at).toBeLessThanOrEqual(0.5)
          if (width === 420) expect(m.labelLines, at).toBeGreaterThan(1)
          for (const part of [m.description, m.error])
            expect(Math.abs(start(part) - start(m.item)), at).toBeLessThanOrEqual(0.5)
        } else {
          expect(m.label.bottom, at).toBeLessThanOrEqual(m.item.top + 0.5)
          expect(Math.abs(start(m.label) - start(m.root)), at).toBeLessThanOrEqual(0.5)
          expect(Math.abs(m.item.width - m.root.width), at).toBeLessThanOrEqual(0.5)
          // A top label is as wide as its text, so the empty row beside it is not a click target.
          if (labelPosition === 'top' && width === 800)
            expect(m.label.width, at).toBeLessThan(m.root.width / 2)
        }
        expect(m.description.top, at).toBeGreaterThanOrEqual(m.item.bottom - 0.5)
        expect(m.error.top, at).toBeGreaterThanOrEqual(m.description.bottom - 0.5)
      }
    })

test('names and descriptions reach the accessibility tree without the required marker', { tag: ['@a11y'] }, async ({
  page,
}) => {
  await renderField(page, { label: 'Email', required: true, description: 'Help', error: 'Wrong' })
  const input = page.getByRole('textbox')
  await expect(input).toHaveAccessibleName(/^Email$/)
  await expect(input).toHaveAccessibleDescription(/^Help Wrong$/)
  await expect(input).toHaveAttribute('aria-invalid', 'true')
  await renderField(page, { label: 'Email', 'aria-label': 'Direct' })
  await expect(input).toHaveAccessibleName(/^Direct$/)
  await renderField(page, {
    label: 'Email',
    'aria-label': 'Direct',
    'aria-labelledby': 'outside-name',
  })
  await expect(input).toHaveAccessibleName(/^Outside name$/)

  await renderField(page, {
    group: true,
    label: 'Plan',
    required: true,
    description: 'Help',
    error: 'Wrong',
  })
  const group = page.getByRole('radiogroup')
  await expect(group).toHaveAccessibleName(/^Plan$/)
  await expect(group).toHaveAccessibleDescription(/^Help Wrong$/)
  await expect(group).toHaveAttribute('aria-invalid', 'true')
  for (const [index, radio] of (await page.getByRole('radio').all()).entries()) {
    await expect(radio).toHaveAccessibleName(['A', 'B'][index])
    await expect(radio).toHaveAccessibleDescription(/^Help Wrong$/)
  }
})

test('every layout passes axe', { tag: ['@a11y'] }, async ({ page }) => {
  for (const labelPosition of ['top', 'start'] as const)
    for (const mode of modes) {
      await renderField(page, { ...full, labelPosition, ...mode })
      expect(await axe(page, '#frame'), JSON.stringify({ labelPosition, ...mode })).toEqual([])
    }
})

test('clicking the label focuses a labelable control, and a group label activates nothing', { tag: ['@native', '@focus'] }, async ({
  page,
}) => {
  await renderField(page, { label: 'Email' })
  await page.locator('.uf-field__label').click()
  await expect(page.getByRole('textbox')).toBeFocused()
  await renderField(page, { group: true, label: 'Plan' })
  await page.locator('.uf-field__label').click()
  await expect(page.locator('body')).toBeFocused()
  for (const radio of await page.getByRole('radio').all())
    await expect(radio).not.toBeChecked()
})

test('forced colors keep every part in system text colors', { tag: ['@forced-colors', '@css'] }, async ({
  page,
}) => {
  await page.emulateMedia({ forcedColors: 'active' })
  await renderField(page, { ...full, labelPosition: 'start' }, 800)
  expect(await page.evaluate(() => matchMedia('(forced-colors: active)').matches)).toBe(true)
  const parts = await page.evaluate(() => {
    const canvas = document.body.appendChild(document.createElement('span'))
    canvas.style.color = 'Canvas'
    const background = getComputedStyle(canvas).color
    canvas.remove()
    return Array.from(
      document.querySelectorAll('.uf-field [data-scope="field"]'),
      (part) => {
        const style = getComputedStyle(part)
        return {
          part: part.getAttribute('data-part'),
          adjust: style.getPropertyValue('forced-color-adjust'),
          visible: style.color !== background && style.color !== 'rgba(0, 0, 0, 0)',
        }
      },
    )
  })
  expect(parts.map(({ part }) => part)).toEqual(['label', 'required', 'description', 'error'])
  for (const { part, adjust, visible } of parts) {
    expect(adjust, part!).not.toBe('none')
    expect(visible, part!).toBe(true)
  }
})
