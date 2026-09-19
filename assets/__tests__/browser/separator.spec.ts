import { test, expect, type Page } from './test'
import { axe, hooks, open } from './helpers'
import type { Hooks } from './fixtures/separator.fixture'

const { renderSeparator: render } = hooks<Hooks>()
type Box = { left: number; right: number; top: number; bottom: number; width: number; height: number }

/** Border boxes of the separator line, its layout frame, the frame's first and last children, and the visible boxes of the first control and text. */
const measure = (page: Page) =>
  page.evaluate(() => {
    const box = (node: Element | null | undefined) => {
      if (!node) return null
      const { left, right, top, bottom, width, height } = node.getBoundingClientRect()
      return { left, right, top, bottom, width, height }
    }
    const frame = document.querySelector('[data-testid="frame"]')!
    return {
      line: box(document.querySelector('[data-testid="subject"]'))!,
      frame: box(frame)!,
      first: box(frame.firstElementChild)!,
      last: box(frame.lastElementChild)!,
      control: box(frame.querySelector('.uf-input__control, button.uf-button')),
      text: box(frame.querySelector('.uf-text')),
      overflow: frame.scrollWidth - frame.clientWidth,
    }
  }) as Promise<{
    line: Box
    frame: Box
    first: Box
    last: Box
    control: Box | null
    text: Box | null
    overflow: number
  }>

/** A length custom property of the document, in pixels. */
const token = (page: Page, name: string) =>
  page.evaluate((name) => {
    const probe = document.body.appendChild(document.createElement('div'))
    probe.style.width = `var(${name})`
    const width = probe.getBoundingClientRect().width
    probe.remove()
    return width
  }, name)

test.beforeEach(async ({ page }) => {
  await open(page, 'separator')
})

test('in a settings card the line spans the fields’ visible box, and without membrane the card’s content box', { tag: ['@layout'] }, async ({
  page,
}) => {
  const thickness = await token(page, '--uf-separator-line-width')
  const membrane = await token(page, '--uf-membrane')
  await render(page, {}, 'card')
  const on = await measure(page)
  expect(on.line.height).toBe(thickness)
  expect(on.line.left).toBe(on.control!.left)
  expect(on.line.right).toBe(on.control!.right)
  // The title's membrane and the separator's own one lie between them.
  expect(on.line.top - on.text!.bottom).toBe(2 * membrane)

  await render(page, { membrane: false }, 'card')
  const off = await measure(page)
  expect(off.line.height).toBe(thickness)
  expect(off.line.left).toBe(off.control!.left - membrane)
  expect(off.line.right).toBe(off.control!.right + membrane)
  expect(off.line.top - off.text!.bottom).toBe(membrane)
})

test('in a toolbar a vertical line is as tall as the buttons, and without membrane as tall as the bar', { tag: ['@layout'] }, async ({
  page,
}) => {
  const thickness = await token(page, '--uf-separator-line-width')
  await render(page, { orientation: 'vertical' }, 'toolbar')
  const on = await measure(page)
  expect(on.line.width).toBe(thickness)
  expect(on.line.top).toBe(on.control!.top)
  expect(on.line.height).toBe(on.control!.height)
  expect(on.line.left).toBeGreaterThan(on.first.right)
  expect(on.line.right).toBeLessThan(on.last.left)

  await render(page, { orientation: 'vertical', membrane: false }, 'toolbar')
  const off = await measure(page)
  expect(off.line.width).toBe(thickness)
  expect(off.line.top).toBe(off.frame.top)
  expect(off.line.height).toBe(off.frame.height)
})

for (const membrane of [true, false])
  test(`in a row a horizontal line fills the space its siblings leave${membrane ? '' : ' without membrane'}`, { tag: ['@layout'] }, async ({
    page,
  }) => {
    const inset = membrane ? await token(page, '--uf-membrane') : 0
    await render(page, { membrane }, 'row')
    const { line, frame, first, last, overflow } = await measure(page)
    expect(overflow).toBe(0)
    expect(line.left).toBeCloseTo(first.right + inset, 1)
    expect(line.right).toBeCloseTo(last.left - inset, 1)
    expect((line.top + line.bottom) / 2).toBeCloseTo((frame.top + frame.bottom) / 2, 0)
  })

test('outside a row a vertical line is one control tall, with or without membrane', { tag: ['@layout'] }, async ({
  page,
}) => {
  const control = await token(page, '--uf-control-height')
  for (const membrane of [true, false]) {
    await render(page, { orientation: 'vertical', membrane }, 'flow')
    expect((await measure(page)).line.height).toBe(control)
  }
})

test('a className sizes the line itself, as a wider resize handle does', { tag: ['@layout'] }, async ({
  page,
}) => {
  await page.addStyleTag({
    content: `
      .handle.uf-separator[data-scope][data-orientation="vertical"] { width: 8px; }
      .handle.uf-separator[data-scope][data-orientation="horizontal"] { height: 4px; }`,
  })
  for (const membrane of [true, false]) {
    await render(page, { orientation: 'vertical', membrane, className: 'handle' }, 'row')
    expect((await measure(page)).line.width).toBe(8)
    await render(page, { membrane, className: 'handle' }, 'card')
    expect((await measure(page)).line.height).toBe(4)
  }
})

test('in forced colors the line keeps the text color instead of vanishing into the canvas', { tag: ['@forced-colors', '@css'] }, async ({
  page,
}) => {
  await page.emulateMedia({ forcedColors: 'active' })
  for (const orientation of ['horizontal', 'vertical'] as const) {
    await render(page, { orientation }, 'toolbar')
    const colors = await page.getByTestId('subject').evaluate((line) => {
      const probe = document.body.appendChild(document.createElement('span'))
      probe.style.color = 'CanvasText'
      probe.style.backgroundColor = 'Canvas'
      const result = {
        line: getComputedStyle(line).backgroundColor,
        text: getComputedStyle(probe).color,
        canvas: getComputedStyle(probe).backgroundColor,
      }
      probe.remove()
      return result
    })
    expect(colors.line).toBe(colors.text)
    expect(colors.line).not.toBe(colors.canvas)
  }
})

test('only a separator that is not decorative reaches the accessibility tree, with its orientation', { tag: ['@a11y'] }, async ({
  page,
}) => {
  const session = await page.context().newCDPSession(page)
  const separators = async () => {
    const { nodes } = await session.send('Accessibility.getFullAXTree')
    return nodes
      .filter((node) => !node.ignored && node.role?.value === 'separator')
      .map((node) => ({
        orientation: node.properties?.find((property) => property.name === 'orientation')?.value.value,
        name: node.name?.value ?? '',
        focusable: !!node.properties?.find((property) => property.name === 'focusable')?.value.value,
      }))
  }
  for (const orientation of ['horizontal', 'vertical'] as const) {
    await render(page, { orientation }, 'toolbar')
    expect(await separators()).toEqual([])
    await render(page, { orientation, decorative: false }, 'toolbar')
    expect(await separators()).toEqual([{ orientation, name: '', focusable: false }])
    expect(await axe(page, '[data-testid="frame"]')).toEqual([])
  }
  // A window splitter: a focusable, named separator carrying its value.
  await render(
    page,
    {
      orientation: 'vertical',
      decorative: false,
      membrane: false,
      tabIndex: 0,
      'aria-label': 'Resize sidebar',
      'aria-valuenow': 240,
      'aria-valuemin': 180,
      'aria-valuemax': 420,
    },
    'row',
  )
  expect(await separators()).toEqual([{ orientation: 'vertical', name: 'Resize sidebar', focusable: true }])
  expect(await axe(page, '[data-testid="frame"]')).toEqual([])
})
