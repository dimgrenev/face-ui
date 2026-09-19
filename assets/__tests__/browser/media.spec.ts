import { test, expect, type Page } from './test'
import { hooks, open } from './helpers'
import type { Hooks } from './fixtures/media.fixture'

const { renderMedia: render, renderPlayer } = hooks<Hooks>()
const events = (page: Page) => page.evaluate(() => (window as any).mediaEvents as string[])
const root = (page: Page) => page.locator('[data-scope="media"][data-part="root"]')
const image = (page: Page) => page.locator('img[data-part="element"]')
const size = async (page: Page, which: 'root' | 'image') => {
  const box = (await (which === 'root' ? root(page) : image(page)).boundingBox())!
  return [Math.round(box.width), Math.round(box.height)]
}

test.beforeEach(async ({ page }) => {
  await open(page, 'media')
})

test('width and height size the box, which the image fills without distortion', { tag: ['@layout'] }, async ({ page }) => {
  await render(page, { width: 200, height: 100 })
  await expect(root(page)).toHaveAttribute('data-state', 'loaded')
  expect(await size(page, 'root')).toEqual([200, 100])
  expect(await size(page, 'image')).toEqual([200, 100])
  expect(await image(page).evaluate((img) => getComputedStyle(img).objectFit)).toBe('cover')
  await render(page, { width: 200, height: 100, objectFit: 'contain' })
  expect(await image(page).evaluate((img) => getComputedStyle(img).objectFit)).toBe('contain')
  // Without a height the image keeps its own square ratio.
  await render(page, { width: 200 })
  await expect(root(page)).toHaveAttribute('data-state', 'loaded')
  expect(await size(page, 'image')).toEqual([200, 200])
  // Without a width the box takes the column.
  await render(page)
  await expect(root(page)).toHaveAttribute('data-state', 'loaded')
  expect(await size(page, 'root')).toEqual([320, 320])
})

test('variant circle crops a round square and thumbnail draws a border', { tag: ['@css'] }, async ({ page }) => {
  await render(page, { variant: 'circle', width: 96 })
  await expect(root(page)).toHaveAttribute('data-state', 'loaded')
  expect(await size(page, 'root')).toEqual([96, 96])
  expect(await size(page, 'image')).toEqual([96, 96])
  const radius = await root(page).evaluate((box) => parseFloat(getComputedStyle(box).borderTopLeftRadius))
  expect(radius).toBeGreaterThanOrEqual(48)
  await render(page, { variant: 'thumbnail', width: 96 })
  const frame = await root(page).evaluate((box) => getComputedStyle(box).boxShadow)
  expect(frame).toContain('inset')
  await render(page, { width: 96 })
  const plain = await root(page).evaluate((box) => getComputedStyle(box).boxShadow)
  expect(plain).toBe('none')
})

test('a real image reports load; a broken one reports error and shows the fallback', { tag: ['@native'] }, async ({ page }) => {
  await render(page)
  await expect(root(page)).toHaveAttribute('data-state', 'loaded')
  expect(await events(page)).toEqual(['load'])
  await render(page, { source: 'broken', fallback: 'Unavailable' })
  await expect(root(page)).toHaveAttribute('data-state', 'error')
  await expect(page.getByText('Unavailable')).toBeVisible()
  await expect(image(page)).toBeHidden()
  expect(await events(page)).toEqual(['error'])
})

test('a player is loaded once its metadata arrives or fetching waits for playback; a broken one shows the fallback', { tag: ['@native'] }, async ({ page }) => {
  await renderPlayer(page)
  await expect(root(page)).toHaveAttribute('data-state', 'loaded')
  await renderPlayer(page, { preload: 'none' })
  await expect(root(page)).toHaveAttribute('data-state', 'loaded')
  await renderPlayer(page, { broken: true, fallback: 'No audio' })
  await expect(root(page)).toHaveAttribute('data-state', 'error')
  await expect(page.getByText('No audio')).toBeVisible()
})
