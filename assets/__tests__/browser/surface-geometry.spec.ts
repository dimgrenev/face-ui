import { expect, test } from './test'
import { open } from './helpers'

test.beforeEach(async ({ page }) => { await open(page, 'surface-geometry') })

for (const zoom of [.8, .9, 1, 1.1] as const) {
  test(`Authored surface clearance remains identical at CSS zoom ${zoom}`, { tag: ['@layout', '@css'] }, async ({ page }) => {
    await page.locator('body').evaluate((node, zoom) => { node.style.zoom = String(zoom) }, zoom)
    const geometry = await page.evaluate(() => {
      const read = (id: string) => {
        const surface = document.getElementById(id)!, row = surface.querySelector('.test-row')!
        const bounds = surface.getBoundingClientRect(), content = row.getBoundingClientRect(), css = getComputedStyle(surface)
        return { top: bounds.top, rowTop: content.top, height: bounds.height, border: css.borderTopWidth, padding: css.paddingTop,
          paint: getComputedStyle(surface, '::before').boxShadow }
      }
      return { fixed: read('fixed'), auto: read('auto') }
    })
    expect(geometry.fixed.border).toBe('0px')
    expect(geometry.auto.border).toBe('0px')
    expect(geometry.fixed.padding).toBe('4px')
    expect(geometry.auto.padding).toBe('4px')
    expect(Math.abs(geometry.fixed.rowTop - geometry.auto.rowTop)).toBeLessThan(.05)
    expect(Math.abs(geometry.fixed.height - geometry.auto.height)).toBeLessThan(.05)
    expect(geometry.auto.paint).not.toBe('none')
  })
}

test('Card variants, nested side resets and border=false use the authored reservation', { tag: ['@layout', '@css'] }, async ({ page }) => {
  const read = (id: string) => page.locator(`#${id}`).evaluate(node => {
    const css = getComputedStyle(node)
    return { padding: [css.paddingTop, css.paddingRight, css.paddingBottom, css.paddingLeft],
      border: css.borderTopWidth, reserve: css.getPropertyValue('--face-runtime-surface-border-reserve').trim(),
      stroke: css.getPropertyValue('--uf-surface-border-width').trim(), paint: getComputedStyle(node, '::before').boxShadow }
  })
  expect((await read('variant-none')).padding).toEqual(['1px', '1px', '1px', '1px'])
  expect((await read('variant-membrane')).padding).toEqual(['2px', '2px', '2px', '2px'])
  expect((await read('variant-control')).padding).toEqual(['5px', '7px', '5px', '7px'])
  expect((await read('variant-default')).padding).toEqual(['8px', '8px', '8px', '8px'])
  expect((await read('nested')).padding).toEqual(['5px', '7px', '5px', '7px'])
  expect((await read('nested')).stroke).toBe('1px')
  expect((await read('no-border')).padding).toEqual(['3px', '3px', '3px', '3px'])
  expect((await read('authored')).padding).toEqual(['5px', '9px', '13px', '17px'])
  expect((await read('authored')).border).toBe('1px')
})

test('Paint owns no hit target and preserves positioning, shadow, radius and keyboard focus', { tag: ['@layout', '@css', '@focus', '@pointer'] }, async ({ page }) => {
  await expect(page.locator('#positioned')).toHaveCSS('position', 'fixed')
  await expect(page.locator('#shadow')).toHaveCSS('box-shadow', 'rgb(10, 20, 30) 3px 4px 5px 0px')
  await expect(page.locator('#shadow')).toHaveCSS('border-radius', '12px')
  await expect(page.locator('#shadow')).toHaveCSS('overflow', 'hidden')
  expect(await page.locator('#shadow').evaluate(node => getComputedStyle(node, '::before').pointerEvents)).toBe('none')
  await page.locator('#focus-action').focus()
  await expect(page.locator('#focus-action')).toHaveCSS('outline-style', 'solid')
  await expect(page.locator('#focus-action')).toBeFocused()
})

test('Forced colors retain a painted edge without consuming layout border space', { tag: ['@forced-colors', '@css', '@layout'] }, async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' })
  await expect(page.locator('#auto')).toHaveCSS('border-top-width', '0px')
  expect(await page.locator('#auto').evaluate(node => getComputedStyle(node, '::before').borderTopWidth)).toBe('1px')
  await expect(page.locator('#auto')).toHaveCSS('padding-top', '4px')
})

test('Manual surfaces share axis tokens in both native and stable profiles', { tag: ['@css', '@layout'] }, async ({ page }) => {
  await expect(page.locator('#manual')).toHaveCSS('border-top-width', '0px')
  await expect(page.locator('#manual')).toHaveCSS('padding-top', '4px')
  await expect(page.locator('#manual')).toHaveCSS('padding-right', '6px')
  await page.locator('html').evaluate(node => node.removeAttribute('data-uf-surface-geometry'))
  await expect(page.locator('#manual')).toHaveCSS('border-top-width', '1px')
  await expect(page.locator('#manual')).toHaveCSS('padding-top', '3px')
  await expect(page.locator('#manual')).toHaveCSS('padding-right', '5px')
  await expect(page.locator('#variant-control')).toHaveCSS('border-top-width', '1px')
  await expect(page.locator('#variant-control')).toHaveCSS('padding-top', '4px')
  await expect(page.locator('#variant-control')).toHaveCSS('padding-right', '6px')
})

for (const popup of [
  { name: 'Menu', trigger: '#launch-menu', surface: '.uf-menu-contentPanel' },
  { name: 'Select', trigger: '#launch-select', surface: '.uf-select__contentPanel' },
  { name: 'Date', trigger: '#popups [data-scope="date"][data-part="trigger"]', surface: '.uf-date__contentPanel' },
  { name: 'Overlay', trigger: '#launch-overlay', surface: '.uf-overlay-content' },
  { name: 'Navigation', trigger: '#popups [data-scope="navigation"][data-part="trigger"]', surface: '.uf-navigation-content' },
] as const) {
  test(`${popup.name} popup adopts the reusable surface recipe`, { tag: ['@css', '@layout'] }, async ({ page }) => {
    await page.locator('body').evaluate(node => { node.style.zoom = '.8' })
    await page.locator(popup.trigger).click()
    const surface = page.locator(popup.surface).last()
    await expect(surface).toBeVisible()
    await expect(surface).toHaveClass(/uf-surface-stable/)
    await expect(surface).toHaveCSS('border-top-width', '0px')
    await expect(surface).toHaveCSS('padding-top', '4px')
    await expect(surface).toHaveCSS('padding-right', '4px')
    expect(await surface.evaluate(node => getComputedStyle(node, '::before').boxShadow)).not.toBe('none')
    await page.keyboard.press('Escape')
    await expect(surface).not.toBeVisible()
  })
}
