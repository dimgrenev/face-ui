import { createRequire } from 'node:module'
import { test, expect, type Page } from './test'
import { mount, open, type MountProps, type MountWindow } from './helpers'

const avatarContract = createRequire(import.meta.url)('../../../Avatar/Avatar.json') as {
  states: { name: string; props: MountProps<'Avatar'> }[]
}

const render = (page: Page, props: MountProps<'Avatar'>) =>
  mount(page, 'Avatar', props)
test.beforeEach(async ({ page }) => {
  await open(page, 'mount')
})

test('Avatar authored With Image loads a real image offline instead of claiming fallback success', { tag: ['@native', '@react'] }, async ({ page }) => {
  const authored = avatarContract.states.find((state) => state.name === 'With Image')
  expect(authored).toBeDefined()
  const origin = new URL(page.url()).origin
  const externalRequests: string[] = []
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url())
    if ((url.protocol === 'http:' || url.protocol === 'https:') && url.origin !== origin) {
      externalRequests.push(url.origin + url.pathname)
      return route.abort('blockedbyclient')
    }
    return route.continue()
  })
  await render(page, authored!.props)
  const avatar = page.locator('[data-scope="avatar"][data-part="root"]')
  const image = avatar.locator('img')
  await expect(avatar).toHaveAttribute('data-state', 'loaded')
  await expect(image).toBeVisible()
  await expect(image).toHaveAttribute('src', authored!.props.src!)
  expect(await image.evaluate((element: HTMLImageElement) =>
    element.complete && element.naturalWidth > 0 && element.naturalHeight > 0,
  )).toBe(true)
  await expect(avatar.locator('[data-part="fallback"]')).toBeHidden()
  await expect(avatar).toHaveAccessibleName(authored!.props.name!)
  expect(externalRequests).toEqual([])
})

test('Avatar preserves Unicode initials during server rendering, hydration, and name changes without native Segmenter', { tag: ['@hydration', '@intl'] }, async ({
  page,
  request,
}) => {
  const cases = [
    ['𠮷田 太郎', '𠮷太'],
    ['áda Lovelace', 'ÁL'],
    ['👩🏽‍💻 Ada', '👩🏽‍💻A'],
    ['🇷🇺 Иван', '🇷🇺И'],
    ['क्षमा शर्मा', 'क्षश'],
  ]
  const response = await request.get('hydration')
  expect(response.ok()).toBe(true)
  const html = await response.text()
  for (const [, initials] of cases) expect(html).toContain(initials)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  await page.addInitScript(() =>
    Object.defineProperty(Intl, 'Segmenter', {
      value: undefined,
      configurable: true,
    }),
  )
  await open(page, 'hydration')
  await page.getByRole('button', { name: 'Open dialog', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden()
  for (const [name, initials] of cases) {
    await expect(page.getByRole('img', { name, exact: true })).toHaveText(
      initials,
    )
  }
  expect(errors).toEqual([])
  await open(page, 'mount')
  for (const [name, initials] of cases) {
    await render(page, { name })
    await expect(page.getByRole('img', { name, exact: true })).toHaveText(
      initials,
    )
  }
  expect(errors).toEqual([])
})

test('Avatar src and fallbackDelay follow actual requests, including pending replacement, failure and a cached image', { tag: ['@native'] }, async ({
  page,
}) => {
  let release: () => void = () => {}
  const ready = new Promise<void>((resolve) => {
    release = resolve
  })
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="red"/></svg>'
  await page.route('**/avatar-pending.svg', async (route) => {
    await ready
    await route.fulfill({ contentType: 'image/svg+xml', body: svg })
  })
  await page.route('**/avatar-ready.svg', (route) =>
    route.fulfill({ contentType: 'image/svg+xml', body: svg }),
  )
  await page.route('**/avatar-error.svg', (route) =>
    route.fulfill({ status: 404, body: '' }),
  )
  const avatar = page.locator('[data-scope="avatar"][data-part="root"]')
  const fallback = avatar.locator('[data-part="fallback"]')
  await render(page, {
    name: 'Ada Lovelace',
    src: '/avatar-pending.svg',
    fallbackDelay: 500,
  })
  await expect(avatar).toHaveAttribute('data-state', 'idle')
  await expect(fallback).toBeHidden()
  await expect(fallback).toBeVisible({ timeout: 2000 })
  await expect(avatar).toHaveAttribute('data-state', 'loading')
  await expect(avatar).toHaveAccessibleName('Ada Lovelace')
  await render(page, {
    name: 'Grace Hopper',
    src: '/avatar-ready.svg',
    fallbackDelay: 500,
  })
  await expect(avatar).toHaveAttribute('data-state', 'loaded')
  await expect(avatar.locator('img')).toBeVisible()
  await expect(fallback).toBeHidden()
  release()
  await expect(avatar.locator('img')).toHaveAttribute(
    'src',
    '/avatar-ready.svg',
  )
  await expect(avatar).toHaveAccessibleName('Grace Hopper')
  await render(page, {
    name: 'Grace Hopper',
    src: '/avatar-error.svg',
    fallbackDelay: 10000,
  })
  await expect(fallback).toBeVisible()
  await expect(fallback).toHaveText('GH')
  await expect(avatar.locator('img')).toBeHidden()
  await expect(avatar).toHaveAttribute('data-state', 'error')
  await render(page, { name: 'Grace Hopper', src: '/avatar-ready.svg' })
  await expect(avatar).toHaveAttribute('data-state', 'loaded')
  await expect(avatar.locator('img')).toBeVisible()
  await expect(fallback).toBeHidden()
  await render(page, { name: 'Grace Hopper', fallback: '?' })
  await expect(avatar.locator('img')).toHaveCount(0)
  await expect(fallback).toHaveText('?')
})

test('Avatar fallback, className, style, name and root semantics survive rerender without changing geometry', { tag: ['@layout', '@css'] }, async ({
  page,
}) => {
  await render(page, {
    name: 'Ada Lovelace',
    fallback: '?',
    className: 'person',
    title: 'Owner',
    style: { color: 'rgb(255, 0, 0)' },
  })
  const avatar = page.getByRole('img', { name: 'Ada Lovelace' })
  await expect(avatar).toHaveClass(/person/)
  await expect(avatar).toHaveAttribute('title', 'Owner')
  await expect(avatar).toHaveCSS('color', 'rgb(255, 0, 0)')
  const box = await avatar.boundingBox()
  expect(box!.width).toBe(box!.height)
  await page.evaluate(() => {
    const { React: R, propComponents, renderProps } =
      window as unknown as MountWindow
    renderProps('Avatar', {
      name: 'Ada Lovelace',
      fallback: R.createElement(propComponents.Icon, { name: 'user' }),
    })
  })
  const icon = avatar.locator('svg')
  await expect(icon).toBeVisible()
  const iconBox = await icon.boundingBox()
  expect(
    Math.abs(iconBox!.x + iconBox!.width / 2 - box!.x - box!.width / 2),
  ).toBeLessThan(1)
  expect(
    Math.abs(iconBox!.y + iconBox!.height / 2 - box!.y - box!.height / 2),
  ).toBeLessThan(1)
  await render(page, { name: 'Ada Lovelace', 'aria-hidden': true })
  await expect(page.getByRole('img', { name: 'Ada Lovelace' })).toHaveCount(0)
  await expect(
    page.locator('[data-scope="avatar"][data-part="root"]'),
  ).toHaveText('AL')
})
