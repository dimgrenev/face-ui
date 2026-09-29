import { test, expect, type Page } from './test'
import { axe, hooks, open } from './helpers'
import type { Density, Hooks } from './fixtures/skeleton.fixture'

const { renderSkeleton: render } = hooks<Hooks>()
type Box = { left: number; right: number; top: number; bottom: number; width: number; height: number }

/**
 * Border boxes of the skeleton, its frame, the avatar placeholder, a loaded
 * Avatar and the loaded Text line with its membrane; `bar` is the box the skeleton paints (for a text
 * line, its ::before inset by the skeleton's padding and centered in it);
 * `glyphs` is the loaded Text's content box, where its line of glyphs sits.
 */
const measure = (page: Page) =>
  page.evaluate(() => {
    const box = (node: Element | null | undefined) => {
      if (!node) return null
      const { left, right, top, bottom, width, height } = node.getBoundingClientRect()
      return { left, right, top, bottom, width, height }
    }
    const subject = document.querySelector('[data-testid="subject"]')!
    const own = box(subject)!
    const style = getComputedStyle(subject)
    const before = getComputedStyle(subject, '::before')
    const painted = !['none', 'normal'].includes(before.content)
    const barHeight = painted ? parseFloat(before.height) : own.height
    const left = own.left + (painted ? parseFloat(style.paddingLeft) : 0)
    const right = own.right - (painted ? parseFloat(style.paddingRight) : 0)
    const top = (own.top + own.bottom - barHeight) / 2
    const text = document.querySelector<HTMLElement>('[data-testid="text"]')
    const textStyle = text && getComputedStyle(text)
    const textBox = box(text)
    return {
      skeleton: own,
      bar: { left, right, top, bottom: top + barHeight, width: right - left, height: barHeight },
      frame: box(document.querySelector('[data-testid="frame"]'))!,
      avatar: box(document.querySelector('[data-testid="avatar"]')),
      loaded: box(document.querySelector('[data-testid="loaded"]')),
      text: box(text?.parentElement),
      glyphs: textBox && {
        left: textBox.left + parseFloat(textStyle!.paddingLeft),
        right: textBox.right - parseFloat(textStyle!.paddingRight),
        top: textBox.top + parseFloat(textStyle!.paddingTop),
        bottom: textBox.bottom - parseFloat(textStyle!.paddingBottom),
      },
    }
  }) as Promise<{
    skeleton: Box
    bar: Box
    frame: Box
    avatar: Box | null
    loaded: Box | null
    text: Box | null
    glyphs: Omit<Box, 'width' | 'height'> | null
  }>

/** Length custom properties as the column resolves them, in pixels. */
const tokens = (page: Page) =>
  page.evaluate(() => {
    const px = (name: string) => {
      const probe = document.querySelector('[data-testid="column"]')!.appendChild(document.createElement('div'))
      probe.style.width = `var(${name})`
      const width = probe.getBoundingClientRect().width
      probe.remove()
      return width
    }
    return {
      control: px('--uf-control-height'),
      membrane: px('--uf-membrane'),
      /** A one-line Text: its height, the inset of its glyphs and its font size. */
      text: px('--uf-text-min-height'),
      inset: px('--uf-text-pad-x'),
      font: px('--uf-text-body-size'),
    }
  })

test.beforeEach(async ({ page }) => {
  await open(page, 'skeleton')
})

for (const density of ['default', 'compact', 'large'] as Density[])
  test(`without a size each shape takes the box of the content it stands in for (${density})`, { tag: ['@layout'] }, async ({
    page,
  }) => {
    await render(page, {}, 'column', density)
    const { control, membrane, text, inset, font } = await tokens(page)
    const line = await measure(page)
    // A one-line Text with its membrane, across the column; the bar inset like its glyphs.
    expect(line.skeleton).toMatchObject({ width: line.frame.width, height: text + 2 * membrane })
    expect(line.bar).toMatchObject({ width: line.frame.width - 2 * (membrane + inset), height: font })
    // A value a face document may carry that is not a shape draws the default line.
    await render(page, { shape: 'square' as 'text' }, 'column', density)
    expect((await measure(page)).skeleton).toEqual(line.skeleton)

    await render(page, { shape: 'rect' }, 'column', density)
    const block = await measure(page)
    expect(block.skeleton).toMatchObject({ width: block.frame.width, height: control })
    expect(block.bar).toEqual(block.skeleton)

    // In a profile row whose name and email are taller, with the default (stretch) alignment.
    await render(page, { shape: 'circle' }, 'profile', density)
    const avatar = await measure(page)
    expect(avatar.frame.height).toBeGreaterThan(control)
    expect(avatar.skeleton).toMatchObject({ width: control, height: control })
    expect(avatar.skeleton.height).toBe(avatar.loaded!.height)
    expect(avatar.skeleton.width).toBe(avatar.loaded!.width)
  })

for (const layout of ['flow', 'card'] as const)
  test(`under a loaded Text line in ${layout} a text line takes the same box and paints where the glyphs are`, { tag: ['@layout'] }, async ({
    page,
  }) => {
    for (const density of ['default', 'compact', 'large'] as Density[]) {
      await render(page, {}, layout, density)
      const { font } = await tokens(page)
      const { skeleton, bar, text, glyphs } = await measure(page)
      expect(skeleton.height).toBe(text!.height)
      expect(skeleton.top).toBe(text!.bottom)
      expect(skeleton.left).toBe(text!.left)
      expect(bar.left).toBe(glyphs!.left)
      expect(bar.height).toBe(font)
      // Both centered in their boxes: the bar on the line the glyphs will take.
      expect((bar.top + bar.bottom) / 2 - skeleton.top).toBe((glyphs!.top + glyphs!.bottom) / 2 - text!.top)
    }
  })

test('width and height are the size it paints, below one control as well as above', { tag: ['@layout'] }, async ({
  page,
}) => {
  const { control, membrane, text, inset, font } = await tokens(page)
  // 16 by 12 is below one control, which the stylesheet once raised it to.
  expect(control).toBeGreaterThan(16)
  for (const shape of ['rect', 'circle'] as const) {
    await render(page, { shape, width: 16, height: 12 }, 'column')
    expect((await measure(page)).skeleton).toMatchObject({ width: 16, height: 12 })
    await render(page, { shape, width: '50%', height: '5rem' }, 'column')
    expect((await measure(page)).skeleton).toMatchObject({ width: 180, height: 80 })
  }
  await render(page, { shape: 'rect', width: 240, height: 160 }, 'column')
  expect((await measure(page)).bar).toMatchObject({ width: 240, height: 160 })
  await render(page, { shape: 'rect', width: '50', height: '25' }, 'column')
  expect((await measure(page)).bar).toMatchObject({ width: 50, height: 25 })

  // A text line paints a bar of that size, however small, with a one-line Text's space around it.
  const space = { inline: 2 * (membrane + inset), block: text + 2 * membrane - font }
  for (const [width, height] of [[12, 8], [120, 12], [96, 24]] as const) {
    await render(page, { width, height }, 'column')
    const line = await measure(page)
    expect(line.bar).toMatchObject({ width, height })
    expect(line.skeleton).toMatchObject({ width: width + space.inline, height: height + space.block })
  }
  await render(page, { width: '60%', height: '3rem' }, 'column')
  expect((await measure(page)).bar).toMatchObject({ width: 216, height: 48 })
  // As wide as it can be is its column, never past it.
  for (const width of ['100%', 1000]) {
    await render(page, { width }, 'column')
    const line = await measure(page)
    expect(line.skeleton.width).toBe(line.frame.width)
    expect(line.bar.width).toBe(line.frame.width - space.inline)
  }
})

for (const layout of ['column', 'profile', 'card'] as const)
  test(`a circle stays round from the one side it is given, a percentage too, and given both keeps both (${layout})`, { tag: ['@layout'] }, async ({
    page,
  }) => {
    // The profile row stretches its items to the name and email beside them, which are taller than every fixed side here.
    await render(page, { shape: 'circle' }, layout)
    if (layout === 'profile') expect((await measure(page)).frame.height).toBeGreaterThan(64)
    const cases = [
      [{ width: 48 }, 48],
      [{ height: 20 }, 20],
      [{ width: '3rem' }, 48],
      [{ height: '1.5rem' }, 24],
      [{ style: { width: 60 } }, 60],
      [{ style: { height: 20 } }, 20],
      [{ width: '', height: 20 }, 20],
    ] as const
    for (const [props, side] of cases) {
      await render(page, { shape: 'circle', ...props }, layout)
      expect((await measure(page)).skeleton, JSON.stringify(props)).toMatchObject({ width: side, height: side })
    }
    // A percentage is of the column's width, whichever side it is given for.
    for (const props of [{ width: '50%' }, { height: '50%' }]) {
      await render(page, { shape: 'circle', ...props }, layout)
      const { skeleton, frame } = await measure(page)
      expect(skeleton.width, JSON.stringify(props)).toBeGreaterThan(0)
      expect(skeleton.height, JSON.stringify(props)).toBe(skeleton.width)
      if (layout === 'column') expect(skeleton.width).toBe(frame.width / 2)
    }
    await render(page, { shape: 'circle', width: 64, height: 40 }, layout)
    expect((await measure(page)).skeleton).toMatchObject({ width: 64, height: 40 })
  })

test('in a container sized by its content a text line or rect adds no width of its own and paints the width it is given', { tag: ['@layout'] }, async ({
  page,
}) => {
  const { control } = await tokens(page)
  for (const shape of ['text', 'rect'] as const) {
    await render(page, { shape }, 'label')
    expect((await measure(page)).bar.width).toBe(0)
    await render(page, { shape, width: 120 }, 'label')
    const { bar, skeleton, frame } = await measure(page)
    expect(bar.width).toBe(120)
    expect(frame.width).toBe(skeleton.width)
  }
  // A circle has a size of its own.
  await render(page, { shape: 'circle' }, 'label')
  expect((await measure(page)).skeleton).toMatchObject({ width: control, height: control })
})

test('explicit width and height win over style and are the size it paints', { tag: ['@layout'] }, async ({ page }) => {
  for (const shape of ['text', 'rect', 'circle'] as const) {
    await render(page, { shape, width: 100, height: 40, style: { width: 30, height: 10 } }, 'column')
    expect((await measure(page)).bar).toMatchObject({ width: 100, height: 40 })
  }
})

test('in a list row the avatar keeps its size and the line beside it takes the rest', { tag: ['@layout'] }, async ({
  page,
}) => {
  const { control, membrane, text } = await tokens(page)
  await render(page, {}, 'row')
  const { avatar, skeleton, frame } = await measure(page)
  expect(avatar).toMatchObject({ width: control, height: control })
  expect(skeleton.left).toBe(avatar!.right + 8)
  expect(skeleton.right).toBe(frame.right)
  expect(skeleton.height).toBe(text + 2 * membrane)
  expect((skeleton.top + skeleton.bottom) / 2).toBe((avatar!.top + avatar!.bottom) / 2)
})

test('the pulse repeats until the content arrives, and under reduced motion it does not run', { tag: ['@css'] }, async ({
  page,
}) => {
  const motion = () =>
    page.getByTestId('subject').evaluate(async (node) => {
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      const style = getComputedStyle(node)
      return {
        name: style.animationName,
        iterations: style.animationIterationCount,
        running: node.getAnimations().filter((animation) => animation.playState === 'running').length,
        opacity: style.opacity,
      }
    })
  for (const shape of ['text', 'rect', 'circle'] as const) {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await render(page, { shape }, 'column')
    expect(await motion()).toMatchObject({ name: 'uf-skeleton-pulse', iterations: 'infinite', running: 1 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await render(page, { shape }, 'column')
    expect(await motion()).toMatchObject({ iterations: '1', running: 0, opacity: '1' })
  }
})

test('in forced colors every shape is painted in GrayText instead of vanishing into the canvas', { tag: ['@forced-colors', '@css'] }, async ({
  page,
}) => {
  await page.emulateMedia({ forcedColors: 'active' })
  for (const shape of ['text', 'rect', 'circle'] as const) {
    await render(page, { shape }, 'column')
    const colors = await page.getByTestId('subject').evaluate((node) => {
      const probe = document.body.appendChild(document.createElement('span'))
      probe.style.color = 'GrayText'
      probe.style.backgroundColor = 'Canvas'
      const painted = !['none', 'normal'].includes(getComputedStyle(node, '::before').content)
      const result = {
        paint: getComputedStyle(node, painted ? '::before' : null).backgroundColor,
        gray: getComputedStyle(probe).color,
        canvas: getComputedStyle(probe).backgroundColor,
      }
      probe.remove()
      return result
    })
    expect(colors.paint).toBe(colors.gray)
    expect(colors.paint).not.toBe(colors.canvas)
  }
})

test('a skeleton stays out of the accessibility tree, even with a title, while the region it fills is announced as busy', { tag: ['@a11y'] }, async ({
  page,
}) => {
  const session = await page.context().newCDPSession(page)
  /** Why the accessibility tree leaves out the subject, or [] when it is exposed. */
  const ignoredBecause = async () => {
    const { root } = await session.send('DOM.getDocument', { depth: -1 })
    const { nodeId } = await session.send('DOM.querySelector', {
      nodeId: root.nodeId,
      selector: '[data-testid="subject"]',
    })
    const { node } = await session.send('DOM.describeNode', { nodeId })
    const { nodes } = await session.send('Accessibility.getPartialAXTree', {
      backendNodeId: node.backendNodeId,
      fetchRelatives: false,
    })
    return nodes[0]!.ignored ? nodes[0]!.ignoredReasons!.map((reason) => reason.name) : []
  }
  for (const shape of ['text', 'rect', 'circle'] as const) {
    // A plain div with a title would be exposed as a generic node.
    await render(page, { shape, title: 'Loading profile' }, 'busy')
    expect(await ignoredBecause()).toContain('ariaHiddenElement')
    const { nodes } = await session.send('Accessibility.getFullAXTree')
    const busy = nodes.filter((node) => !node.ignored && node.properties?.some((p) => p.name === 'busy' && p.value.value))
    expect(busy).toHaveLength(1)
    expect(await axe(page)).toEqual([])
  }
})
