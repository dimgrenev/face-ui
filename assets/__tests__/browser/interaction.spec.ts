import { expect, test, type Locator, type Page } from './test'
import { open } from './helpers'

const focusPaint = (control: Locator) =>
  control.evaluate((node) => {
    const style = getComputedStyle(node)
    return {
      visible: node.matches(':focus-visible'),
      outline: style.outlineStyle,
      width: style.outlineWidth,
      color: style.outlineColor,
      shadow: style.boxShadow,
    }
  })

// macOS WebKit can reserve plain Tab for fields. Follow the platform's key
// for all controls instead of changing the components' native tab behavior.
async function tabKey(page: Page) {
  await page.locator('#before').evaluate((before: HTMLElement) => {
    before.after(Object.assign(document.createElement('button'), { id: 'tab-probe' }))
    before.focus()
  })
  await page.keyboard.press('Tab')
  return page.locator('#tab-probe').evaluate((probe) => {
    const key = probe === document.activeElement ? 'Tab' : 'Alt+Tab'
    probe.remove()
    return key
  })
}

for (const theme of ['light', 'dark']) {
  test(`pointer activation does not borrow keyboard focus from an edited input (${theme})`, {
    tag: ['@focus', '@pointer', '@css'],
  }, async ({ page }) => {
    await open(page, 'interaction')
    await page.evaluate((theme) => { document.documentElement.dataset.theme = theme }, theme)
    const input = page.getByRole('textbox', { name: 'Field', exact: true })
    const controls = [
      { control: page.locator('#action'), target: page.locator('#action') },
      { control: page.locator('#choice'), target: page.locator('#choice') },
      { control: page.locator('#check'), target: page.locator('.uf-checkbox') },
      { control: page.locator('#switch'), target: page.locator('.uf-switcher') },
      { control: page.getByRole('radio', { name: 'Column', exact: true }), target: page.getByRole('radio', { name: 'Column', exact: true }) },
      { control: page.locator('#tile'), target: page.locator('.uf-tile') },
    ]
    for (const { control, target } of controls) {
      await input.click()
      await page.keyboard.type('x')
      await target.click()
      // Native :focus-visible heuristics differ for forwarded pointer focus.
      // The library's visible treatment must still stay in pointer mode.
      expect(await focusPaint(control)).toMatchObject({ outline: 'none', shadow: 'none' })
      if (await control.getAttribute('role') === 'combobox') {
        await page.getByRole('option', { name: 'Beta', exact: true }).click()
        await expect(control).toBeFocused()
        expect(await focusPaint(control)).toMatchObject({ outline: 'none', shadow: 'none' })
      }
      if (await control.getAttribute('role') === 'checkbox' || await control.getAttribute('role') === 'switch') {
        expect(await focusPaint(target)).toMatchObject({ outline: 'none' })
      }
    }
    // Membrane padding forwards focus and activation to the same control.
    for (const id of ['action', 'choice']) {
      await input.click()
      await page.keyboard.type('x')
      const control = page.locator(`#${id}`)
      const membrane = control.locator('xpath=ancestor::*[contains(@class,"uf-membrane")][1]')
      const rect = (await membrane.boundingBox())!
      await page.mouse.click(rect.x + 0.25, rect.y + rect.height / 2)
      await expect(control).toBeFocused()
      expect(await focusPaint(control)).toMatchObject({ outline: 'none', shadow: 'none' })
      if (id === 'choice') await page.getByRole('option', { name: 'Alpha', exact: true }).click()
    }
  })

  test(`keyboard navigation keeps a visible focus indicator across controls and popup return (${theme})`, {
    tag: ['@focus', '@css'],
  }, async ({ page }) => {
    await open(page, 'interaction')
    await page.evaluate((theme) => { document.documentElement.dataset.theme = theme }, theme)
    const tab = await tabKey(page)
    await page.locator('#before').focus()
    await page.keyboard.press(tab)
    await expect(page.locator('#field')).toBeFocused()
    for (const selector of ['#action', '#choice']) {
      await page.keyboard.press(tab)
      const control = page.locator(selector)
      await expect(control).toBeFocused()
      expect(await focusPaint(control)).toMatchObject({ visible: true, outline: 'solid', width: '2px' })
    }
    await page.keyboard.press('ArrowDown')
    await expect(page.getByRole('listbox')).toBeVisible()
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    await expect(page.locator('#choice')).toContainText('Beta')
    await expect(page.locator('#choice')).toBeFocused()
    expect(await focusPaint(page.locator('#choice'))).toMatchObject({ visible: true, outline: 'solid', width: '2px' })
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Escape')
    await expect(page.getByRole('listbox')).toHaveCount(0)
    expect(await focusPaint(page.locator('#choice'))).toMatchObject({ visible: true, outline: 'solid', width: '2px' })
    for (const [controlSelector, paintedSelector] of [
      ['#check', '.uf-checkbox'],
      ['#switch', '.uf-switcher'],
      ['[role="radio"][data-value="row"]', '[role="radio"][data-value="row"]'],
      ['#tile', '#tile'],
    ]) {
      await page.keyboard.press(tab)
      const control = page.locator(controlSelector)
      await expect(control).toBeFocused()
      expect((await focusPaint(control)).visible).toBe(true)
      expect(await focusPaint(page.locator(paintedSelector))).toMatchObject({ outline: 'solid', width: '2px' })
    }
  })

  test(`changing input method updates the focused control without a blur (${theme})`, {
    tag: ['@focus', '@pointer', '@css'],
  }, async ({ page }) => {
    await open(page, 'interaction')
    await page.evaluate((theme) => { document.documentElement.dataset.theme = theme }, theme)
    const action = page.locator('#action')
    // Membrane padding focuses on every engine, including macOS WebKit.
    const membrane = action.locator('..')
    const rect = (await membrane.boundingBox())!
    await page.mouse.click(rect.x + 0.25, rect.y + rect.height / 2)
    await expect(action).toBeFocused()
    expect(await focusPaint(action)).toMatchObject({ outline: 'none', shadow: 'none' })
    await action.evaluate((node) => {
      node.setAttribute('data-blur-count', '0')
      node.addEventListener('blur', () => {
        node.setAttribute('data-blur-count', String(Number(node.getAttribute('data-blur-count')) + 1))
      })
    })
    await page.keyboard.press('ArrowRight')
    await expect(action).toBeFocused()
    expect(await focusPaint(action)).toMatchObject({ outline: 'solid', width: '2px' })
    await expect(action).toHaveAttribute('data-blur-count', '0')
    await page.mouse.click(rect.x + 0.25, rect.y + rect.height / 2)
    await expect(action).toBeFocused()
    expect(await focusPaint(action)).toMatchObject({ outline: 'none', shadow: 'none' })
    const blurCount = await action.getAttribute('data-blur-count')
    await page.keyboard.press('Enter')
    await expect(action).toBeFocused()
    expect(await focusPaint(action)).toMatchObject({ outline: 'solid', width: '2px' })
    await expect(action).toHaveAttribute('data-blur-count', blurCount!)
  })

  test(`a portalled menu restores keyboard focus after Escape and quiet focus after a pointer choice (${theme})`, {
    tag: ['@focus', '@pointer', '@css'],
  }, async ({ page }) => {
    await open(page, 'interaction')
    await page.evaluate((theme) => { document.documentElement.dataset.theme = theme }, theme)
    const trigger = page.locator('#menu-trigger')
    await trigger.click()
    const list = page.getByRole('menu')
    await expect(list).toBeFocused()
    expect(await list.evaluate((node) => !document.getElementById('root')!.contains(node))).toBe(true)
    expect(await focusPaint(list)).toMatchObject({ outline: 'none' })
    await page.keyboard.press('Escape')
    await expect(trigger).toBeFocused()
    expect(await focusPaint(trigger)).toMatchObject({ outline: 'solid', width: '2px' })
    await trigger.click()
    await page.getByRole('menuitem', { name: 'Menu Beta', exact: true }).click()
    await expect(trigger).toBeFocused()
    await expect(list).toHaveCount(0)
    expect(await focusPaint(trigger)).toMatchObject({ outline: 'none', shadow: 'none' })
  })

  test(`keyboard traversal from an unowned iframe restores the parent focus indicator (${theme})`, {
    tag: ['@focus', '@pointer', '@css'],
  }, async ({ page }) => {
    await open(page, 'interaction')
    await page.evaluate((theme) => { document.documentElement.dataset.theme = theme }, theme)
    const tab = await tabKey(page)
    await page.locator('#field').click()
    await expect(page.locator('html')).toHaveAttribute('data-uf-focus-modality', 'pointer')
    await page.frameLocator('#preview-frame').getByRole('button', { name: 'Preview action' }).click()
    const returned = page.locator('#after-preview')
    // Firefox can visit the frame's own tab stop before crossing its boundary.
    for (let step = 0; step < 3; step++) {
      await page.keyboard.press(tab)
      if (await returned.evaluate((node) => node === document.activeElement)) break
    }
    await expect(returned).toBeFocused()
    expect(await focusPaint(returned)).toMatchObject({ outline: 'solid', width: '2px' })
    const rect = (await returned.locator('..').boundingBox())!
    await page.mouse.click(rect.x + 0.25, rect.y + rect.height / 2)
    await expect(returned).toBeFocused()
    expect(await focusPaint(returned)).toMatchObject({ outline: 'none', shadow: 'none' })
    const trigger = page.locator('#menu-trigger')
    await trigger.click()
    await expect(page.getByRole('menu')).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(trigger).toBeFocused()
    expect(await focusPaint(trigger)).toMatchObject({ outline: 'solid', width: '2px' })
  })

  test(`text editing has a quiet inset focus and selection uses fill without changing geometry (${theme})`, {
    tag: ['@focus', '@css', '@layout'],
  }, async ({ page }) => {
    await open(page, 'interaction')
    await page.evaluate((theme) => { document.documentElement.dataset.theme = theme }, theme)
    const tab = await tabKey(page)
    for (const id of ['field', 'multiline']) {
      const input = page.locator(`#${id}`)
      const before = await input.boundingBox()
      await input.click()
      const paint = await input.evaluate((node) => {
        const style = getComputedStyle(node)
        const token = document.createElement('span')
        token.style.color = 'var(--uf-color-border-hover)'
        node.parentElement!.append(token)
        const expected = getComputedStyle(token).color
        token.remove()
        return { outline: style.outlineStyle, width: style.outlineWidth, offset: style.outlineOffset, color: style.outlineColor, expected }
      })
      expect(paint).toMatchObject({ outline: 'solid', width: '1px', offset: '-1px' })
      expect(paint.color).toBe(paint.expected)
      expect(await input.boundingBox()).toEqual(before)
      await page.keyboard.press(`Shift+${tab}`)
      await page.keyboard.press(tab)
      await expect(input).toBeFocused()
      expect(await focusPaint(input)).toMatchObject({ visible: true, outline: 'solid', width: '1px', color: paint.color })
    }
    const selected = page.getByRole('radio', { name: 'Column', exact: true })
    const before = await selected.boundingBox()
    await selected.click()
    await page.mouse.move(800, 600)
    await expect(selected).toHaveAttribute('aria-checked', 'true')
    const paint = await selected.evaluate((node) => {
      const style = getComputedStyle(node)
      const off = getComputedStyle(node.parentElement!.parentElement!.querySelector('[data-state="off"]')!)
      return { border: style.borderColor, width: style.borderWidth, background: style.backgroundColor, off: off.backgroundColor }
    })
    expect(paint).toMatchObject({ border: 'rgba(0, 0, 0, 0)', width: '1px' })
    expect(paint.background).not.toBe(paint.off)
    expect(await selected.boundingBox()).toEqual(before)
    expect(await focusPaint(selected)).toMatchObject({ outline: 'none' })
  })
}

test('forced colors retain strong text focus and a selected segment boundary', {
  tag: ['@forced-colors', '@focus', '@css'],
}, async ({ page }) => {
  await open(page, 'interaction')
  await page.emulateMedia({ forcedColors: 'active' })
  for (const id of ['field', 'multiline']) {
    await page.locator(`#${id}`).click()
    expect(await focusPaint(page.locator(`#${id}`))).toMatchObject({ outline: 'solid', width: '2px' })
  }
  const selected = page.getByRole('radio', { name: 'Column', exact: true })
  await selected.click()
  const border = await selected.evaluate((node) => {
    const style = getComputedStyle(node)
    return { color: style.borderColor, width: style.borderWidth }
  })
  expect(border.width).toBe('1px')
  expect(border.color).not.toBe('rgba(0, 0, 0, 0)')
})
