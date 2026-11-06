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
  // Clipping is visual only: the lines below stay in the accessibility tree.
  expect(await pre.ariaSnapshot()).toContain('line 20')

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

for (const by of ['the user', 'the collapsed prop'] as const)
  test(`collapsed by ${by}, a scrolled source shows its first lines, cannot scroll, and expands from line 1`, { tag: ['@layout'] }, async ({
    page,
  }) => {
    const props = { children: `${source(40)}\n${'x'.repeat(300)}`, title: 'build.log' }
    await render(page, by === 'the user' ? props : { ...props, collapsed: false })
    const pre = subject(page).locator('pre')
    const first = pre.locator('[data-part="line"]').first()
    /** Line 1 relative to the source box: where it sits unscrolled. */
    const offset = async () => {
      const [outer, line] = [await box(pre), await box(first)]
      return [Math.round(line.top - outer.top), Math.round(line.left - outer.left)]
    }
    const scrollTo = (to: number) =>
      pre.evaluate((node, to) => {
        node.scrollTop = node.scrollLeft = to
        return [node.scrollTop, node.scrollLeft]
      }, to)
    const toggle = (collapsed: boolean) =>
      by === 'the user'
        ? subject(page).getByRole('button', { name: collapsed ? 'Collapse code' : 'Expand code' }).click()
        : render(page, { ...props, collapsed }, { update: true })
    const home = await offset()
    expect(Math.min(...(await scrollTo(10_000)))).toBeGreaterThan(0)

    await toggle(true)
    expect(await subject(page).getAttribute('data-state')).toBe('collapsed')
    expect(await offset()).toEqual(home)
    // Neither script nor scrollIntoView (as find in page does) moves it while collapsed.
    expect(await scrollTo(10_000)).toEqual([0, 0])
    await pre.locator('[data-part="line"]').nth(30).evaluate((node) => node.scrollIntoView())
    expect(await offset()).toEqual(home)

    await toggle(false)
    expect(await pre.evaluate((node) => [node.scrollTop, node.scrollLeft])).toEqual([0, 0])
    expect(await offset()).toEqual(home)
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
  test(`an untitled one-line source has its copy button at the inline end beside it (${direction})`, { tag: ['@layout'] }, async ({
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
  test(`an untitled source of several lines keeps the full width, its buttons in a header above it (${direction})`, { tag: ['@layout'] }, async ({
    page,
  }) => {
    await render(page, { children: source(30) }, { direction })
    const root = await subject(page).evaluate((node) => {
      const { left, top } = node.getBoundingClientRect()
      const start = left + node.clientLeft
      return { left: start, right: start + node.clientWidth, top: top + node.clientTop }
    })
    const pre = await box(subject(page).locator('pre'))
    const copy = await box(subject(page).getByRole('button', { name: 'Copy code' }))
    const collapse = await box(subject(page).getByRole('button', { name: 'Collapse code' }))
    expect(pre.left).toBeCloseTo(root.left, 0)
    expect(pre.right).toBeCloseTo(root.right, 0)
    expect(Math.max(copy.bottom, collapse.bottom)).toBeLessThanOrEqual(pre.top + 0.5)
    expect(Math.min(copy.top, collapse.top)).toBeGreaterThanOrEqual(root.top)
    // Grouped at the header's inline end.
    const middle = (root.left + root.right) / 2
    if (direction === 'ltr') expect(Math.min(copy.left, collapse.left)).toBeGreaterThan(middle)
    else expect(Math.max(copy.right, collapse.right)).toBeLessThan(middle)
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
  if (browserName === 'chromium') await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await render(page, { children: 'npm install\n', showLineNumbers: true, title: 'install.sh' })
  const copy = subject(page).getByRole('button', { name: 'Copy code' })
  await expect(subject(page).getByRole('status')).toHaveText('')
  await expect(copy.locator('[data-icon]')).toHaveAttribute('data-icon', 'copy')
  // From the keyboard, so the button holds focus in every engine (WebKit does not focus a clicked button).
  await copy.focus()
  await page.keyboard.press('Enter')
  await expect(subject(page).getByRole('status')).toHaveText('Copied')
  await expect(copy.locator('[data-icon]')).toHaveAttribute('data-icon', 'check')
  // Only Chromium lets a test read the clipboard back.
  if (browserName === 'chromium')
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('npm install\n')
  await expect(copy).toBeFocused()
})

test('a refused copy confirms nothing', { tag: ['@native'] }, async ({ page }) => {
  await render(page, { children: 'secret' })
  await page.evaluate(() => {
    const attempts: string[] = Object.assign(window, { copyAttempts: [] as string[] }).copyAttempts
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async () => {
          attempts.push('clipboard')
          throw new DOMException('Denied', 'NotAllowedError')
        },
      },
    })
    document.execCommand = () => (attempts.push('execCommand'), false)
  })
  const copy = subject(page).getByRole('button', { name: 'Copy code' })
  await copy.click()
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { copyAttempts: string[] }).copyAttempts))
    .toEqual(['clipboard', 'execCommand'])
  await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))))
  await expect(subject(page).getByRole('status')).toHaveText('')
  await expect(copy.locator('[data-icon]')).toHaveAttribute('data-icon', 'copy')
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
  await expect(pre).toHaveAttribute('tabindex', '-1')
  expect(await previousStop()).not.toBe('PRE')

  await render(page, { children: `const long = '${'x'.repeat(200)}'` })
  await expect(pre).toHaveAttribute('tabindex', '0')
  expect(await previousStop()).toBe('PRE')

  // Thirty lines outgrow the scroll limit once expanded.
  await render(page, { children: source(30), defaultCollapsed: true })
  await expect(pre).toHaveAttribute('tabindex', '-1')
  expect(await previousStop()).not.toBe('PRE')
  await subject(page).getByRole('button', { name: 'Expand code' }).click()
  await expect(pre).toHaveAttribute('tabindex', '0')
  expect(await previousStop()).toBe('PRE')
  // Code owns the tab stop; Playwright's WebKit does not scroll a focused box with arrow keys.
  if (browserName === 'webkit') return
  await page.keyboard.press('ArrowDown')
  await expect.poll(() => pre.evaluate((node) => node.scrollTop)).toBeGreaterThan(0)
})

for (const change of ['is collapsed by the prop', 'shrinks to fit'] as const)
  test(`a focused source that ${change} keeps focus, and Tab continues after it`, { tag: ['@focus'] }, async ({
    page,
  }) => {
    const props = { children: source(40), collapsed: false }
    await render(page, props)
    const pre = subject(page).locator('pre')
    await expect(pre).toHaveAttribute('tabindex', '0')
    await pre.focus()
    await render(
      page,
      change === 'is collapsed by the prop' ? { ...props, collapsed: true } : { ...props, children: 'npm install' },
      { update: true },
    )
    await expect(pre).toBeFocused()
    await expect(pre).toHaveAttribute('tabindex', '-1')
    await page.keyboard.press('Tab')
    await expect(page.locator('#after')).toBeFocused()
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

/** Box of the text an element or text node holds. */
const runBox = (locator: Locator, part: 'element' | 'text') =>
  locator.evaluate((node, part) => {
    const range = document.createRange()
    const text = [...node.childNodes].find(
      (child) => child.nodeType === Node.TEXT_NODE && child.textContent !== '\n',
    )
    range.selectNodeContents(part === 'text' ? text! : node)
    return range.getBoundingClientRect().toJSON() as DOMRect
  }, part)
/** What the eye gets in `rect`: its dominant color, and how many pixels contrast with it by more than 3:1. */
const look = async (page: Page, rect: DOMRect) => {
  const [x, y] = [Math.floor(rect.left), Math.floor(rect.top)]
  const clip = { x, y, width: Math.ceil(rect.right) - x, height: Math.ceil(rect.bottom) - y }
  const png = (await page.screenshot({ clip, animations: 'disabled' })).toString('base64')
  return page.evaluate(async (png) => {
    const luminance = (rgb: number[]) => {
      const [r, g, b] = rgb.map((c) => (c / 255 <= 0.03928 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4))
      return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
    }
    const image = new Image()
    image.src = `data:image/png;base64,${png}`
    await image.decode()
    const canvas = Object.assign(document.createElement('canvas'), { width: image.width, height: image.height })
    const context = canvas.getContext('2d')!
    context.drawImage(image, 0, 0)
    const { data } = context.getImageData(0, 0, image.width, image.height)
    const pixels = Array.from({ length: data.length / 4 }, (_, at) => [...data.subarray(at * 4, at * 4 + 3)])
    const counts = new Map<string, number>()
    for (const pixel of pixels) counts.set(`${pixel}`, (counts.get(`${pixel}`) ?? 0) + 1)
    const backdrop = [...counts].sort((a, b) => b[1] - a[1])[0]![0].split(',').map(Number)
    const light = luminance(backdrop)
    const strokes = pixels.filter((pixel) => {
      const [hi, lo] = [luminance(pixel), light].sort((a, b) => b - a)
      return (hi! + 0.05) / (lo! + 0.05) > 3
    }).length
    return { backdrop, strokes }
  }, png)
}

for (const colorScheme of ['light', 'dark'] as const)
  test(`marked lines stay distinct and legible in forced colors, numbers and syntax colors included (${colorScheme})`, { tag: ['@forced-colors', '@css'] }, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme, forcedColors: 'active' })
    await render(page, {
      children: `${source(10)}\nconst marked = 11\nline 12`,
      showLineNumbers: true,
      highlightedLines: [11, 12],
      // Line 12 has no tokens yet; line 11 colors "const" as Mark's own yellow.
      tokenizedLines: [
        ...Array.from({ length: 10 }, (_, index) => [{ content: `line ${index + 1}` }]),
        [{ content: 'const', color: 'rgb(255, 255, 0)' }, { content: ' marked = 11' }],
      ],
    })
    const lines = subject(page).locator('[data-part="line"]')
    const plain = await look(page, await box(lines.nth(9)))
    const bar = await look(page, await box(lines.nth(10)))
    expect(bar.backdrop).not.toEqual(plain.backdrop)
    const runs = {
      number: runBox(lines.nth(10).locator('[data-part="lineNumber"]'), 'element'),
      token: runBox(lines.nth(10).locator('span:not([data-part])').first(), 'element'),
      text: runBox(lines.nth(11), 'text'),
    }
    // Compare the same glyphs at the same pixel phase with the platform's
    // explicit MarkText. A system font's thin "11" has no universal pixel
    // count; wrong or invisible inherited text must still fail this control.
    const number = lines.nth(10).locator('[data-part="lineNumber"]')
    const priorStyle = await number.evaluate((node) => {
      const prior = node.getAttribute('style')
      node.style.setProperty('color', 'MarkText', 'important')
      node.style.setProperty('forced-color-adjust', 'none', 'important')
      return prior
    })
    const referenceNumber = await look(page, await runs.number)
    await number.evaluate((node, prior) => {
      if (prior === null) node.removeAttribute('style')
      else node.setAttribute('style', prior)
    }, priorStyle)
    expect(referenceNumber.strokes).toBeGreaterThan(0)
    for (const [run, rect] of Object.entries(runs)) {
      // Ink on the mark itself, with no plate of another color behind the text.
      const seen = await look(page, await rect)
      expect(seen.backdrop, run).toEqual(bar.backdrop)
      if (run === 'number') expect(seen.strokes, run).toBe(referenceNumber.strokes)
      else expect(seen.strokes, run).toBeGreaterThan(20)
    }
  })
