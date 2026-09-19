import { test, expect, type Page } from './test'
import { hooks, open } from './helpers'
import type { Hooks } from './fixtures/carousel.fixture'

const { renderCarousel: render } = hooks<Hooks>()
const events = (page: Page) => page.evaluate(() => (window as any).carouselEvents as number[])
const region = (page: Page) => page.getByRole('region', { name: 'Tour' })
const control = (page: Page, name: string) => region(page).getByRole('button', { name, exact: true })
/** The href, or else the text, of the focused element. */
const focused = (page: Page) =>
  page.evaluate(() => document.activeElement?.getAttribute('href') ?? document.activeElement?.textContent?.trim())
/** Rounded left and right edges of a slide and of the viewport. */
const edges = (page: Page, name: string) =>
  page.evaluate((name) => {
    const box = (element: Element) => {
      const { left, right } = element.getBoundingClientRect()
      return `${Math.round(left)}..${Math.round(right)}`
    }
    return {
      slide: box(document.querySelector(`[data-slide="${name}"]`)!),
      viewport: box(document.querySelector('[data-scope="carousel"][data-part="viewport"]')!),
    }
  }, name)
/** Waits until the slide covers the viewport exactly, after the track's transition. */
const fills = (page: Page, name: string) =>
  expect.poll(async () => {
    const { slide, viewport } = await edges(page, name)
    return slide === viewport
  }).toBe(true)

test.beforeEach(async ({ page }) => {
  await open(page, 'carousel')
})

test('Tab reaches the visible slide and one indicator, never a hidden slide', { tag: ['@focus', '@react'] }, async ({ page }) => {
  await render(page)
  const tabOrder = async () => {
    await page.locator('#before').focus()
    const order: unknown[] = []
    for (let step = 0; step < 4; step++) {
      await page.keyboard.press('Tab')
      order.push(await focused(page))
    }
    return order
  }
  // Previous is disabled on the first slide.
  expect(await tabOrder()).toEqual(['#One', 'Go to slide 1', 'Next slide', 'After'])
  // Inert slides take no focus, even from script.
  await page.locator('a[href="#Three"]').evaluate((link) => (link as HTMLElement).focus())
  await expect(page.locator('a[href="#Three"]')).not.toBeFocused()
  await control(page, 'Go to slide 2').click()
  await fills(page, 'Two')
  expect(await tabOrder()).toEqual(['#Two', 'Previous slide', 'Go to slide 2', 'Next slide'])
})

test('the controls move the slides by key and keep focus when an end disables one', { tag: ['@focus'] }, async ({ page }) => {
  await render(page)
  await control(page, 'Next slide').focus()
  await page.keyboard.press('Enter')
  await page.keyboard.press('Enter')
  await expect(control(page, 'Next slide')).toBeDisabled()
  await expect(control(page, 'Previous slide')).toBeFocused()
  await fills(page, 'Three')
  await page.keyboard.press('ArrowLeft')
  await fills(page, 'Two')
  await page.keyboard.press('Home')
  await expect(control(page, 'Previous slide')).toBeDisabled()
  await expect(control(page, 'Next slide')).toBeFocused()
  await fills(page, 'One')
  expect(await events(page)).toEqual([1, 2, 1, 0])
})

test('the indicators are one tab stop whose arrows move focus and the slide', { tag: ['@focus'] }, async ({ page }) => {
  await render(page)
  await control(page, 'Go to slide 1').focus()
  await page.keyboard.press('ArrowRight')
  await expect(control(page, 'Go to slide 2')).toBeFocused()
  await fills(page, 'Two')
  await page.keyboard.press('End')
  await expect(control(page, 'Go to slide 3')).toBeFocused()
  await fills(page, 'Three')
  await expect(control(page, 'Go to slide 3')).toHaveAttribute('aria-current', 'true')
  await expect(control(page, 'Go to slide 1')).toHaveAttribute('tabindex', '-1')
})

test('in right-to-left text the track, the controls, the arrow keys and the icons mirror', { tag: ['@layout', '@focus'] }, async ({ page }) => {
  await render(page, {}, { direction: 'rtl' })
  await fills(page, 'One')
  const previous = (await control(page, 'Previous slide').boundingBox())!
  const next = (await control(page, 'Next slide').boundingBox())!
  expect(previous.x).toBeGreaterThan(next.x)
  await control(page, 'Next slide').focus()
  await page.keyboard.press('ArrowLeft')
  await fills(page, 'Two')
  await page.keyboard.press('ArrowRight')
  await fills(page, 'One')
  const mirrored = await control(page, 'Next slide')
    .locator('[data-part="icon"]')
    .evaluate((icon) => new DOMMatrix(getComputedStyle(icon).transform).a)
  expect(mirrored).toBe(-1)
})

test('a swipe follows the pointer and moves one slide toward the drag', { tag: ['@pointer'] }, async ({ page }) => {
  for (const direction of ['ltr', 'rtl'] as const) {
    await render(page, {}, { direction })
    const box = (await page.locator('[data-slide="One"]').boundingBox())!
    const y = box.y + box.height - 12
    const x = box.x + box.width / 2
    const toward = direction === 'ltr' ? -1 : 1
    const offset = () =>
      page.locator('.uf-carousel-track').evaluate((track) => new DOMMatrix(getComputedStyle(track).transform).e)
    // A short drag snaps back.
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.move(x + toward * 30, y, { steps: 3 })
    expect(Math.round(await offset())).toBe(toward * 30)
    await page.mouse.up()
    await fills(page, 'One')
    // A long one moves to the next slide.
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.move(x + toward * 120, y, { steps: 6 })
    expect(Math.round(await offset())).toBe(toward * 120)
    await page.mouse.up()
    await fills(page, 'Two')
    expect(await events(page)).toEqual([1])
  }
})

test('slidesPerView shows that many slides side by side and ends at the last full window', { tag: ['@layout'] }, async ({ page }) => {
  await render(page, { slidesPerView: 2 })
  const slide = (await page.locator('[data-slide="One"]').boundingBox())!
  expect(Math.round(slide.width)).toBe(240)
  await control(page, 'Next slide').click()
  await expect(control(page, 'Next slide')).toBeDisabled()
  await expect
    .poll(async () => {
      const { slide, viewport } = await edges(page, 'Three')
      return slide.split('..')[1] === viewport.split('..')[1]
    })
    .toBe(true)
})

test('rotation advances on its own, pauses under the pointer and waits for the control under reduced motion', { tag: ['@css', '@native'] }, async ({ page }) => {
  await page.clock.install()
  await open(page, 'carousel')
  await page.mouse.move(0, 0)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await render(page, { autoPlay: true, autoPlayInterval: 1000 })
  await expect(control(page, 'Pause rotation')).toBeVisible()
  await page.clock.runFor(1000)
  await expect.poll(() => events(page)).toEqual([1])
  await region(page).hover()
  await page.clock.runFor(3000)
  expect(await events(page)).toEqual([1])
  await page.mouse.move(0, 0)
  await page.clock.runFor(1000)
  await expect.poll(() => events(page)).toEqual([1, 2])

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await render(page, { autoPlay: true, autoPlayInterval: 1000 })
  await expect(control(page, 'Start rotation')).toBeVisible()
  await page.clock.runFor(3000)
  expect(await events(page)).toEqual([])
  const duration = await page
    .locator('.uf-carousel-track')
    .evaluate((track) => parseFloat(getComputedStyle(track).transitionDuration))
  expect(duration).toBeLessThan(0.001)
  await control(page, 'Start rotation').focus()
  await page.keyboard.press('Enter')
  await expect(control(page, 'Pause rotation')).toBeVisible()
  await page.clock.runFor(1000)
  await expect.poll(() => events(page)).toEqual([1])
})
