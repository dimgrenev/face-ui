import { expect, test, type Page } from './test'
import { hooks, open } from './helpers'
import type { Hooks } from './fixtures/roving-focus.fixture'

const { renderRoving } = hooks<Hooks>()
type Item = Parameters<typeof renderRoving>[1]['items'][number]

const ITEMS: Item[] = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Bravo' },
  { value: 'c', label: 'Charlie' },
  { value: 'd', label: 'Delta' },
]
const change = (value: string, patch: Partial<Item>) =>
  ITEMS.map((item) => (item.value === value ? { ...item, ...patch } : item))

const errors = new WeakMap<Page, string[]>()
test.beforeEach(async ({ page }) => {
  errors.set(page, [])
  page.on('pageerror', (error) => errors.get(page)!.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.get(page)!.push(message.text())
  })
  await open(page, 'roving-focus')
})
test.afterEach(async ({ page }) => {
  expect(errors.get(page)).toEqual([])
})

/** The focused item's value, else the focused element's id or tag. */
const focused = (page: Page) =>
  page.evaluate(() => {
    const active = document.activeElement
    return (
      active?.getAttribute('data-value') ?? (active?.id || active?.localName)
    )
  })
/** Focuses without the browser scrolling anything, so only the group's own moves scroll. */
const focus = (page: Page, value: string) =>
  page
    .locator(`[data-value="${value}"]`)
    .evaluate((node: HTMLElement) => node.focus({ preventScroll: true }))

/**
 * Tab, or Option+Tab where macOS WebKit keeps plain Tab for text fields and elements with a
 * tabindex: a native button right after #before tells which one reaches every control.
 */
async function tabKey(page: Page) {
  await page.locator('#before').evaluate((before: HTMLElement) => {
    before.after(
      Object.assign(document.createElement('button'), { id: 'tab-probe' }),
    )
    before.focus()
  })
  await page.keyboard.press('Tab')
  return page.locator('#tab-probe').evaluate((probe) => {
    const key = probe === document.activeElement ? 'Tab' : 'Alt+Tab'
    probe.remove()
    return key
  })
}

test(
  'Tab enters at the tab stop and leaves in one step; Shift+Tab returns to it',
  { tag: ['@focus'] },
  async ({ page }) => {
    await renderRoving(page, {
      items: ITEMS,
      orientation: 'horizontal',
      defaultValue: 'c',
    })
    const tab = await tabKey(page)
    await page.locator('#before').focus()
    await page.keyboard.press(tab)
    expect(await focused(page)).toBe('c')
    await page.keyboard.press('ArrowRight')
    expect(await focused(page)).toBe('d')
    await page.keyboard.press(tab)
    expect(await focused(page)).toBe('after')
    await page.keyboard.press(`Shift+${tab}`)
    expect(await focused(page)).toBe('c')
    await renderRoving(page, {
      items: ITEMS,
      orientation: 'horizontal',
      tabStops: 'all',
    })
    await page.locator('#before').focus()
    const order: unknown[] = []
    for (let i = 0; i < 5; i += 1) {
      await page.keyboard.press(tab)
      order.push(await focused(page))
    }
    expect(order).toEqual(['a', 'b', 'c', 'd', 'after'])
  },
)

test(
  'arrows skip items a disabled fieldset disables',
  { tag: ['@focus'] },
  async ({ page }) => {
    const items = ITEMS.map((item) =>
      item.value === 'b' || item.value === 'c'
        ? { ...item, fieldset: true }
        : item,
    )
    await renderRoving(page, {
      items,
      orientation: 'horizontal',
      fieldsetDisabled: true,
    })
    await focus(page, 'a')
    await page.keyboard.press('ArrowRight')
    expect(await focused(page)).toBe('d')
    await page.keyboard.press('ArrowRight')
    expect(await focused(page)).toBe('a')
  },
)

test(
  'focus moves to the neighbour when the focused item is removed, hidden or disabled',
  { tag: ['@focus'] },
  async ({ page }) => {
    // Bravo always sits in its own fieldset, so every change keeps the DOM around it.
    const base = change('b', { fieldset: true })
    const losses: [how: string, items: Item[], fieldsetDisabled: boolean][] = [
      ['removed', ITEMS.filter((item) => item.value !== 'b'), false],
      ['hidden', change('b', { fieldset: true, hidden: true }), false],
      ['disabled', change('b', { fieldset: true, disabled: true }), false],
      ['in a disabled fieldset', base, true],
    ]
    for (const [how, items, fieldsetDisabled] of losses) {
      await renderRoving(page, { items: base, orientation: 'horizontal' })
      await focus(page, 'b')
      await renderRoving(page, {
        items,
        orientation: 'horizontal',
        fieldsetDisabled,
      })
      expect(await focused(page), how).toBe('c')
    }
  },
)

test(
  'with scrollRef a move scrolls only the list, never the scroller around it',
  { tag: ['@layout'] },
  async ({ page }) => {
    const offsets = () =>
      page.evaluate(() => {
        const list = document.querySelector('[role="group"]')!
        const item = document.activeElement!.getBoundingClientRect()
        const view = list.getBoundingClientRect()
        return {
          list: list.scrollLeft,
          scroller: document.getElementById('scroller')!.scrollTop,
          window: window.scrollY,
          shown: item.left >= view.left - 0.5 && item.right <= view.right + 0.5,
        }
      })
    for (const dir of ['ltr', 'rtl'] as const) {
      await renderRoving(
        page,
        { items: ITEMS, orientation: 'horizontal', scroll: true, dir },
        true,
      )
      await focus(page, 'a')
      for (const value of ['b', 'c', 'd']) {
        await page.keyboard.press(dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight')
        expect(await focused(page)).toBe(value)
        const at = await offsets()
        expect(at, `${dir} ${value}`).toMatchObject({
          scroller: 0,
          window: 0,
          shown: true,
        })
      }
      expect(Math.abs((await offsets()).list)).toBeGreaterThan(0)
    }
    // The same moves without scrollRef let the browser scroll the scroller too.
    await renderRoving(
      page,
      { items: ITEMS, orientation: 'horizontal', dir: 'ltr' },
      true,
    )
    await focus(page, 'a')
    await page.keyboard.press('ArrowRight')
    expect((await offsets()).scroller).toBeGreaterThan(0)
  },
)

test(
  'the direction comes from computed style, not only the dir attribute',
  { tag: ['@intl'] },
  async ({ page }) => {
    await renderRoving(page, {
      items: ITEMS,
      orientation: 'horizontal',
      style: { direction: 'rtl' },
    })
    await focus(page, 'b')
    await page.keyboard.press('ArrowLeft')
    expect(await focused(page)).toBe('c')
    await page.keyboard.press('ArrowRight')
    expect(await focused(page)).toBe('b')
  },
)
