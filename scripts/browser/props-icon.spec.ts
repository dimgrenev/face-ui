import { test, expect } from '@playwright/test'
import { createRequire } from 'node:module'
const expectedReactVersion = createRequire(import.meta.url)(
  'react/package.json',
).version

test('Icon name, accessible label, SVG title and paint styles survive real browser updates', async ({
  page,
}) => {
  await page.goto('/scripts/browser/props.html')
  await page.waitForFunction(
    () => typeof (window as any).renderProps === 'function',
  )
  expect(await page.evaluate(() => (window as any).React.version)).toBe(
    expectedReactVersion,
  )
  const render = async (props: Record<string, unknown>) => {
    await page.evaluate(
      (props) => (window as any).renderProps('Icon', props),
      props,
    )
  }
  await render({ name: 'user', title: 'Account' })
  await expect(page.getByRole('img', { name: 'Account' })).toBeVisible()
  await render({
    name: 'crop',
    label: 'Profile',
    title: 'Account',
    className: 'custom',
    style: { color: 'rgb(120, 10, 20)', opacity: 0.5 },
  })
  const icon = page.getByRole('img', { name: 'Profile' })
  await expect(icon).toHaveAttribute('data-icon', 'crop')
  await expect(icon).toHaveAttribute('viewBox', '0 0 10 20')
  await expect(icon).toHaveClass(/custom/)
  await expect(icon).toHaveCSS('color', 'rgb(120, 10, 20)')
  await expect(icon).toHaveCSS('opacity', '0.5')
  const box = await icon.boundingBox()
  expect([box!.width, box!.height]).toEqual([20, 20])
  await render({ name: 'user', label: ' ', title: ' ' })
  await expect(page.getByRole('img')).toHaveCount(0)
  await expect(page.locator('svg')).toHaveAttribute('aria-hidden', 'true')
  await render({ name: '' })
  await expect(page.locator('svg')).toHaveCount(0)
})
