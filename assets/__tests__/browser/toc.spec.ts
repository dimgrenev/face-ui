import { test, expect, type Page } from './test'
import { axe, hooks, open } from './helpers'
import type { Hooks } from './fixtures/toc.fixture'

const { renderToc: render } = hooks<Hooks>()
const events = (page: Page) => page.evaluate(() => (window as any).tocEvents)
const entry = (page: Page, name: string) =>
  page.getByRole('navigation', { name: 'Table of contents' }).getByRole('link', { name, exact: true })
/** Viewport top of the section with `id`: 0 once the browser has jumped to it. */
const sectionTop = (page: Page, id: string) =>
  page.evaluate((id) => Math.round(document.getElementById(id)!.getBoundingClientRect().top), id)

/** Boxes of the current link, the rail (::before) and the marker (::after), in viewport pixels. */
const geometry = (page: Page) =>
  page.evaluate(() => {
    const list = document.querySelector<HTMLElement>('nav > ul')!
    const box = list.getBoundingClientRect()
    const pseudo = (which: '::before' | '::after') => {
      const style = getComputedStyle(list, which)
      if (style.content === 'none' || style.content === 'normal') return null
      const left = box.left + parseFloat(style.left)
      const top = box.top + parseFloat(style.top) + new DOMMatrix(style.transform).m42
      return { left, right: left + parseFloat(style.width), top, height: parseFloat(style.height) }
    }
    const link = list.querySelector('[aria-current]')?.getBoundingClientRect()
    return {
      link: link && { left: link.left, right: link.right, top: link.top, height: link.height },
      rail: pseudo('::before'),
      marker: pseudo('::after'),
    }
  })
/** Waits until the marker covers the current link: WebKit may report a pseudo-element's style one update late. */
const onCurrent = (page: Page) =>
  expect
    .poll(async () => {
      const { link, marker } = await geometry(page)
      return [Math.round(marker!.top - link!.top), Math.round(marker!.height - link!.height)]
    })
    .toEqual([0, 0])

test.beforeEach(async ({ page }) => {
  await open(page, 'toc')
})

test('Tab reaches every entry in order and Enter follows one to its section', { tag: ['@focus'] }, async ({ page }) => {
  await render(page)
  await page.locator('#before').focus()
  for (const name of ['Introduction', 'Setup', 'Design tokens', 'Usage']) {
    await page.keyboard.press('Tab')
    await expect(entry(page, name)).toBeFocused()
  }
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/#usage$/)
  await expect(entry(page, 'Usage')).toHaveAttribute('aria-current', 'location')
  await expect.poll(() => sectionTop(page, 'usage')).toBe(0)
  expect(await events(page)).toEqual([{ change: 'usage' }, { select: 'usage' }])
})

test('arrow keys on a focused entry are left to the page and focus stays', { tag: ['@native'] }, async ({ page, browserName }) => {
  await render(page)
  await page.evaluate(() => {
    const prevented: boolean[] = ((window as any).tocKeys = [])
    window.addEventListener('keydown', (event) => prevented.push(event.defaultPrevented))
  })
  await entry(page, 'Setup').focus()
  for (const key of ['ArrowDown', 'ArrowDown', 'ArrowUp', 'ArrowDown']) await page.keyboard.press(key)
  expect(await page.evaluate(() => (window as any).tocKeys)).toEqual([false, false, false, false])
  await expect(entry(page, 'Setup')).toBeFocused()
  // Playwright's WebKit coalesces or drops keyboard scrolling at random; the default ran all the same.
  if (browserName !== 'webkit') await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
})

test('following the current entry again scrolls back to its section', { tag: ['@native'] }, async ({ page }) => {
  await render(page)
  await entry(page, 'Setup').click()
  await expect.poll(() => sectionTop(page, 'setup')).toBe(0)
  await page.evaluate(() => window.scrollBy(0, 500))
  await expect.poll(() => sectionTop(page, 'setup')).toBe(-500)
  await entry(page, 'Setup').click()
  await expect.poll(() => sectionTop(page, 'setup')).toBe(0)
  expect(await events(page)).toEqual([{ change: 'setup' }, { select: 'setup' }, { select: 'setup' }])
})

test('a modified click opens the entry elsewhere and changes nothing here', { tag: ['@native'] }, async ({ page, context }) => {
  context.on('page', (opened) => void opened.close())
  await render(page, { defaultValue: 'intro' })
  await entry(page, 'Usage').click({ modifiers: ['ControlOrMeta'] })
  await expect(entry(page, 'Introduction')).toHaveAttribute('aria-current', 'location')
  expect(new URL(page.url()).hash).toBe('')
  expect(await events(page)).toEqual([])
})

test('the marker sits on the current entry at the inline start and follows it', { tag: ['@layout'] }, async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await render(page, { defaultValue: 'setup' })
  await onCurrent(page)
  const box = await geometry(page)
  expect(box.marker!.right).toBeLessThanOrEqual(box.link!.left)
  expect(box.rail!.right).toBeLessThanOrEqual(box.link!.left)
  await entry(page, 'Design tokens').click()
  await expect(entry(page, 'Design tokens')).toHaveAttribute('aria-current', 'location')
  await onCurrent(page)
})

test('with motion opted in, the marker appears on mount without sliding and then follows selection', { tag: ['@layout'] }, async ({ page }) => {
  const frames = () => page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))))
  const sliding = () => page.evaluate(() => document.getAnimations().length)
  // A slide would still be running whenever it is looked for.
  await page.evaluate(() => {
    document.documentElement.classList.add('uf-animated')
    document.documentElement.style.setProperty('--uf-motion-duration-control', '10s')
  })
  await render(page, { defaultValue: 'usage' })
  await frames()
  expect(await sliding()).toBe(0)
  await onCurrent(page)
  const sidebar = page.locator('#sidebar')
  await sidebar.evaluate((node) => (node.style.display = 'none'))
  await frames()
  await sidebar.evaluate((node) => (node.style.display = ''))
  await frames()
  expect(await sliding()).toBe(0)
  await onCurrent(page)
  // A move between entries does slide.
  await entry(page, 'Introduction').click()
  expect(await sliding()).toBe(1)
})

test('the marker keeps the height of a label that wraps as the sidebar narrows', { tag: ['@layout'] }, async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await render(page, { defaultValue: 'setup' }, { longLabel: true, width: 800 })
  await onCurrent(page)
  const { link } = await geometry(page)
  await page.evaluate(() => {
    document.getElementById('sidebar')!.style.width = '160px'
  })
  await expect.poll(async () => (await geometry(page)).link!.height).toBeGreaterThan(link!.height + 1)
  await onCurrent(page)
})

test('line follows the text direction: start and end sides in both directions, none removes it', { tag: ['@layout'] }, async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const direction of ['ltr', 'rtl'] as const)
    for (const line of ['start', 'end'] as const) {
      await render(page, { defaultValue: 'intro', line }, { direction })
      const { link, rail, marker } = await geometry(page)
      const left = (direction === 'ltr') === (line === 'start')
      for (const part of [rail!, marker!])
        if (left) expect(part.right, `${direction} ${line}`).toBeLessThanOrEqual(link!.left)
        else expect(part.left, `${direction} ${line}`).toBeGreaterThanOrEqual(link!.right)
    }
  await render(page, { defaultValue: 'intro', line: 'none' })
  const none = await geometry(page)
  expect([none.rail, none.marker]).toEqual([null, null])
})

test('forced colors keep the current entry distinct', { tag: ['@forced-colors'] }, async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' })
  await render(page, { defaultValue: 'setup', line: 'none' })
  const background = (name: string) =>
    entry(page, name).evaluate((node) => getComputedStyle(node).backgroundColor)
  expect(await background('Setup')).not.toBe(await background('Usage'))
})

test('the outline has no accessibility violations', { tag: ['@a11y'] }, async ({ page }) => {
  await render(page, { defaultValue: 'tokens' })
  expect(await axe(page, 'nav')).toEqual([])
})
