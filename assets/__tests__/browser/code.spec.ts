import { test, expect, type Locator, type Page } from './test'
import { axe, hooks, open } from './helpers'
import type { Hooks } from './fixtures/code.fixture'

const { renderCode: render } = hooks<Hooks>()
const source = (count: number, prefix = 'line') =>
  Array.from({ length: count }, (_, index) => `${prefix} ${index + 1}`).join('\n')
const subject = (page: Page) => page.getByTestId('subject')
const box = (locator: Locator) =>
  locator.evaluate((node) => node.getBoundingClientRect().toJSON() as DOMRect)
/** Box of a line's own text, without its gutter number. */
const textBox = (line: Locator) =>
  line.evaluate((node) => {
    const text = [...node.childNodes].find(
      (child) => child.nodeType === Node.TEXT_NODE && child.textContent !== '\n',
    )!
    const range = document.createRange()
    range.selectNodeContents(text)
    return range.getBoundingClientRect().toJSON() as DOMRect
  })

test.beforeEach(async ({ page }) => {
  await open(page, 'code')
})

test('a collapsed source is exactly as tall as collapsedLines lines and expands to every line', { tag: ['@layout'] }, async ({
  page,
}) => {
  await render(
    page,
    { children: source(20), title: 'build.log', collapsedLines: 5, defaultCollapsed: true },
    { reference: { children: source(5), title: 'build.log' } },
  )
  const pre = subject(page).locator('pre')
  const reference = await box(page.getByTestId('reference'))
  expect((await box(subject(page))).height).toBeCloseTo(reference.height, 0)
  const lines = pre.locator('[data-part="line"]')
  const lineHeight = (await box(lines.first())).height
  const padding = await pre.evaluate((node) => parseFloat(getComputedStyle(node).paddingTop))
  const clip = await box(pre)
  // Five whole lines above the bottom padding; the sixth starts where the padding does.
  expect((await box(lines.nth(4))).bottom).toBeLessThanOrEqual(clip.bottom - padding + 0.5)
  expect((await box(lines.nth(5))).top).toBeCloseTo(clip.bottom - padding, 0)

  await subject(page).getByRole('button', { name: 'Expand code' }).click()
  const expanded = await pre.evaluate((node) => ({
    height: node.getBoundingClientRect().height,
    hidden: node.scrollHeight - node.clientHeight,
  }))
  expect(expanded.hidden).toBe(0)
  expect(expanded.height).toBeCloseTo(clip.height + 15 * lineHeight, 0)

  await subject(page).getByRole('button', { name: 'Collapse code' }).click()
  expect((await box(pre)).height).toBeCloseTo(clip.height, 0)
})

test('the scroll limit caps the expanded source, and a collapsed one is never taller', { tag: ['@layout'] }, async ({
  page,
}) => {
  const limit = await page.evaluate(() => {
    const probe = document.body.appendChild(document.createElement('div'))
    probe.className = 'uf-code'
    probe.dataset.scope = 'code'
    probe.style.blockSize = 'var(--uf-code-scroll-max-height)'
    const height = probe.getBoundingClientRect().height
    probe.remove()
    return height
  })
  expect(limit).toBeGreaterThan(0)
  await render(page, { children: source(60) })
  const pre = subject(page).locator('pre')
  expect((await box(pre)).height).toBeCloseTo(limit, 0)
  await render(page, { children: source(60), collapsedLines: 50, defaultCollapsed: true })
  expect(await subject(page).getAttribute('data-state')).toBe('collapsed')
  expect((await box(pre)).height).toBeCloseTo(limit, 0)
})

for (const direction of ['ltr', 'rtl'] as const)
  test(`without a title the actions sit at the inline end beside the source (${direction})`, { tag: ['@layout'] }, async ({
    page,
  }) => {
    await render(page, { children: 'npm install @userface/engine' }, { direction })
    // The root's padding box: inside its border.
    const root = await subject(page).evaluate((node) => {
      const { left, top, width } = node.getBoundingClientRect()
      const start = left + node.clientLeft
      return { left: start, right: start + node.clientWidth, top: top + node.clientTop, width }
    })
    const pre = await box(subject(page).locator('pre'))
    const copy = await box(subject(page).getByRole('button', { name: 'Copy code' }))
    expect(pre.top).toBeCloseTo(root.top, 0)
    expect(copy.top).toBeGreaterThanOrEqual(root.top)
    expect(copy.bottom).toBeLessThanOrEqual(pre.bottom + 0.5)
    if (direction === 'ltr') {
      expect(pre.left).toBeCloseTo(root.left, 0)
      expect(copy.left).toBeGreaterThanOrEqual(pre.right - 0.5)
      expect(copy.right).toBeLessThanOrEqual(root.right + 0.5)
    } else {
      expect(pre.right).toBeCloseTo(root.right, 0)
      expect(copy.right).toBeLessThanOrEqual(pre.left + 0.5)
      expect(copy.left).toBeGreaterThanOrEqual(root.left - 0.5)
    }
    // The source itself still reads from the left edge.
    const text = await textBox(subject(page).locator('[data-part="line"]').first())
    expect(text.left - pre.left).toBeLessThan(pre.right - text.right)
  })

for (const direction of ['ltr', 'rtl'] as const)
  test(`line numbers share one gutter to the left of the source (${direction})`, { tag: ['@layout'] }, async ({
    page,
  }) => {
    await render(page, { children: source(12), showLineNumbers: true, title: 'app.ts' }, { direction })
    const lines = subject(page).locator('[data-part="line"]')
    const numbers = subject(page).locator('[data-part="lineNumber"]')
    const [nine, ten] = [await box(numbers.nth(8)), await box(numbers.nth(9))]
    expect(nine.right).toBeCloseTo(ten.right, 0)
    expect(nine.width).toBeCloseTo(ten.width, 0)
    // Digits end at the gutter's end: "9" is narrower than "10" and right-aligned.
    const digits = (index: number) =>
      numbers.nth(index).evaluate((node) => {
        const range = document.createRange()
        range.selectNodeContents(node)
        return range.getBoundingClientRect().toJSON() as DOMRect
      })
    expect((await digits(8)).right).toBeCloseTo((await digits(9)).right, 0)
    expect((await digits(8)).left).toBeGreaterThan((await digits(9)).left)
    const [textNine, textTen] = [await textBox(lines.nth(8)), await textBox(lines.nth(9))]
    expect(textNine.left).toBeCloseTo(textTen.left, 0)
    expect(textNine.left).toBeGreaterThan(nine.right)
  })

test('a selection of the source leaves the line numbers out', { tag: ['@native'] }, async ({
  page,
}) => {
  await render(page, { children: 'alpha\nbeta', showLineNumbers: true })
  const selected = await subject(page)
    .locator('code')
    .evaluate((node) => {
      getSelection()!.selectAllChildren(node)
      return getSelection()!.toString()
    })
  expect(selected.replace(/\n+$/, '')).toBe('alpha\nbeta')
})

test('copy puts children on the clipboard and then confirms', { tag: ['@native'] }, async ({
  page,
  context,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'only Chromium lets a test read the clipboard back')
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await render(page, { children: 'npm install\n', showLineNumbers: true, title: 'install.sh' })
  await expect(subject(page).getByRole('status')).toHaveText('')
  await subject(page).getByRole('button', { name: 'Copy code' }).click()
  await expect(subject(page).getByRole('status')).toHaveText('Copied')
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('npm install\n')
  await expect(subject(page).getByRole('button', { name: 'Copy code' })).toBeFocused()
})

test('the source takes keyboard focus only while it can scroll', { tag: ['@focus'] }, async ({
  page,
  browserName,
}) => {
  const pre = subject(page).locator('pre')
  /** Shift+Tab from the button after the block: the pre when it is a tab stop. */
  const previousStop = async () => {
    await page.locator('#after').focus()
    await page.keyboard.press('Shift+Tab')
    return page.evaluate(() => document.activeElement?.tagName)
  }
  await render(page, { children: 'npm install' })
  await expect(pre).not.toHaveAttribute('tabindex')
  expect(await previousStop()).not.toBe('PRE')

  await render(page, { children: `const long = '${'x'.repeat(200)}'` })
  await expect(pre).toHaveAttribute('tabindex', '0')
  expect(await previousStop()).toBe('PRE')

  // Thirty lines outgrow the scroll limit once expanded.
  await render(page, { children: source(30), defaultCollapsed: true })
  await expect(pre).not.toHaveAttribute('tabindex')
  expect(await previousStop()).not.toBe('PRE')
  await subject(page).getByRole('button', { name: 'Expand code' }).click()
  await expect(pre).toHaveAttribute('tabindex', '0')
  expect(await previousStop()).toBe('PRE')
  // Code owns the tab stop; Playwright's WebKit does not scroll a focused box with arrow keys.
  if (browserName === 'webkit') return
  await page.keyboard.press('ArrowDown')
  await expect.poll(() => pre.evaluate((node) => node.scrollTop)).toBeGreaterThan(0)
})

test('titled, untitled, numbered, marked and collapsed blocks pass axe', { tag: ['@a11y'] }, async ({
  page,
}) => {
  await render(
    page,
    {
      children: `${source(12)}\nconst long = '${'x'.repeat(200)}'`,
      title: 'app.ts',
      showLineNumbers: true,
      highlightedLines: [2],
    },
    { reference: { children: source(12), defaultCollapsed: true } },
  )
  await expect(subject(page).locator('pre')).toHaveAttribute('tabindex', '0')
  expect(await axe(page)).toEqual([])
})

test('highlighted lines stay distinct in forced colors', { tag: ['@forced-colors'] }, async ({
  page,
}) => {
  await page.emulateMedia({ forcedColors: 'active' })
  await render(page, { children: source(3), highlightedLines: [2] })
  const backgrounds = await subject(page)
    .locator('[data-part="line"]')
    .evaluateAll((lines) => lines.map((line) => getComputedStyle(line).backgroundColor))
  expect(backgrounds[1]).not.toBe(backgrounds[0])
  expect(backgrounds[0]).toBe(backgrounds[2])
})
