import { expect, test } from './test'
import { hooks, open } from './helpers'
import type { Hooks as FloatingHooks } from './fixtures/floating-overlay.fixture'
import type { Hooks as MenuHooks } from './fixtures/menu.fixture'
import type { Hooks as SelectHooks } from './fixtures/select.fixture'
import type { Hooks as DateHooks } from './fixtures/date.fixture'

const { renderFloating } = hooks<FloatingHooks>()
const { renderMenu } = hooks<MenuHooks>()
const { renderSelect } = hooks<SelectHooks>()
const { renderDate } = hooks<DateHooks>()
const selector = '[data-uf-dropdown-attachment]'

for (const side of ['right', 'left'] as const) {
  test(`Popover ${side} measures the painted gap from its attachment Card`, { tag: ['@layout', '@css'] }, async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 })
    await open(page, 'floating-overlay')
    await renderFloating(page, {
      kind: 'popover', left: 400, top: 180,
      attachment: { width: 420, height: 38, gap: 'calc(8px - 2px)' },
      props: { open: true, side, align: 'start', attachmentSelector: selector },
    })
    const surface = page.getByRole('dialog')
    await expect(surface).toHaveAttribute('data-side', side)
    const verify = async () => {
      const geometry = await surface.evaluate((node) => ({
        panel: document.getElementById('attachment')!.getBoundingClientRect().toJSON(),
        trigger: document.getElementById('trigger')!.getBoundingClientRect().toJSON(),
        surface: node.getBoundingClientRect().toJSON(),
      }))
      const gap = side === 'right' ? geometry.surface.left - geometry.panel.right : geometry.panel.left - geometry.surface.right
      expect(gap).toBeCloseTo(6, 0)
      expect(geometry.surface.top).toBeCloseTo(geometry.trigger.top + 1, 0)
      expect(geometry.surface.height).toBeGreaterThan(geometry.panel.height)
    }
    await expect(verify).toPass()
    const mutations = await page.locator('#trigger').evaluate(async (node) => {
      let count = 0
      const observer = new MutationObserver((records) => { count += records.length })
      observer.observe(node, { childList: true })
      for (let index = 0; index < 4; index++) {
        window.dispatchEvent(new Event('scroll'))
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
      }
      observer.disconnect()
      return count
    })
    expect(mutations).toBe(0)
    await page.locator('#attachment').evaluate((node) => { node.style.width = '500px' })
    await expect(verify).toPass()
    await page.evaluate(() => { document.body.style.minHeight = '2000px'; window.scrollTo(0, 80) })
    await expect(verify).toPass()
  })
}

test('Menu flips from the Card edge, keeps a six-pixel painted gap, and follows Card resize', { tag: ['@layout', '@css'] }, async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 800 })
  await open(page, 'menu')
  await page.evaluate(() => document.documentElement.style.setProperty('--uf-dropdown-surface-padding', 'calc(6px / 2)'))
  await renderMenu(page, { defaultOpen: true, side: 'right', align: 'start', attachmentSelector: selector },
    { attachment: { left: 700, width: 480, gap: 'calc(3px * 2)' } })
  const popup = page.locator('.uf-menu-content')
  await expect(popup.locator('.uf-menu-contentPanel')).toHaveCSS('padding', '3px')
  await expect(popup).toHaveAttribute('data-side', 'left')
  const verify = async () => {
    const gap = await popup.evaluate((node) => document.getElementById('attachment')!.getBoundingClientRect().left
      - node.querySelector('.uf-menu-contentPanel')!.getBoundingClientRect().right)
    expect(gap).toBeCloseTo(6, 0)
  }
  await expect(verify).toPass()
  await page.locator('#attachment').evaluate((node) => { node.style.left = '650px'; node.style.width = '530px' })
  await expect(verify).toPass()
  await page.keyboard.press('Escape')
  await expect(popup).toHaveCount(0)
  await expect(page.locator('#trigger')).toBeFocused()
})

test('Select side uses the marked Card edge, CSS calc gap, and independent height limits', { tag: ['@layout', '@css', '@focus'] }, async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 800 })
  await open(page, 'select')
  await page.evaluate(() => document.documentElement.style.setProperty('--uf-dropdown-surface-padding', 'calc(6px / 2)'))
  await renderSelect(page, { surface: 'side', defaultValue: 'b' })
  await page.locator('section').evaluate((node) => {
    node.setAttribute('data-uf-dropdown-attachment', '')
    Object.assign(node.style, { position: 'absolute', left: '700px', top: '180px', width: '420px', height: '38px' })
    node.style.setProperty('--uf-dropdown-panel-gap', 'calc(8px - 2px)')
  })
  await page.getByRole('combobox').click()
  const listbox = page.getByRole('listbox')
  await expect(listbox).toBeVisible()
  await expect(page.locator('.uf-select__contentPanel')).toHaveCSS('padding', '3px')
  const verify = async () => {
    const geometry = await listbox.evaluate((node) => ({
      attachment: document.querySelector('[data-uf-dropdown-attachment]')!.getBoundingClientRect().toJSON(),
      panel: node.closest('.uf-select__contentPanel')!.getBoundingClientRect().toJSON(),
    }))
    expect(geometry.attachment.left - geometry.panel.right).toBeCloseTo(6, 0)
    expect(geometry.panel.height).toBeGreaterThan(geometry.attachment.height)
  }
  await expect(verify).toPass()
  await page.locator('section').evaluate((node) => { node.style.left = '650px'; node.style.width = '470px' })
  await expect(verify).toPass()
  await page.keyboard.press('Escape')
  await expect(listbox).toHaveCount(0)
  await expect(page.getByRole('combobox')).toBeFocused()
})

test('Date uses the same dropdown surface padding token', { tag: ['@css', '@layout'] }, async ({ page }) => {
  await open(page, 'date')
  await page.evaluate(() => document.documentElement.style.setProperty('--uf-dropdown-surface-padding', '3px'))
  await renderDate(page, { surface: 'popover', defaultOpen: true, defaultValue: '2026-09-12' })
  await expect(page.locator('.uf-date__contentPanel')).toHaveCSS('padding', '3px')
})

for (const location of ['top', 'middle', 'bottom'] as const) {
  const top = { top: 30, middle: 380, bottom: 748 }[location]
  test(`Menu row alignment faces the ${location} option, excluding groups and separators`, { tag: ['@layout', '@css', '@focus'] }, async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 })
    await open(page, 'menu')
    await renderMenu(page, { defaultOpen: true, side: 'right', align: 'start', attachmentSelector: selector, alignToOption: '[role^="menuitem"]' },
      { attachment: { left: 220, width: 200, top, gap: '6px' } })
    await page.locator('#trigger').evaluate(node => { Object.assign(node.style, { height: '28px', boxSizing: 'border-box' }); window.dispatchEvent(new Event('resize')) })
    const menu = page.locator('.uf-menu-content')
    await expect(async () => {
      const geometry = await menu.evaluate((node, location) => {
        const bounds = node.getBoundingClientRect(), trigger = document.getElementById('trigger')!.getBoundingClientRect()
        const rows = [...node.querySelectorAll<HTMLElement>('[role^="menuitem"]')].map(row => row.getBoundingClientRect())
        const target = location === 'top' ? rows[0] : location === 'bottom' ? rows.at(-1)!
          : rows.reduce((a, b) => Math.abs(a.top + a.height / 2 - (bounds.top + bounds.height / 2)) <= Math.abs(b.top + b.height / 2 - (bounds.top + bounds.height / 2)) ? a : b)
        return { target: target.top + target.height / 2, trigger: trigger.top + trigger.height / 2, top: bounds.top, bottom: bounds.bottom }
      }, location)
      expect(Math.abs(geometry.target - geometry.trigger)).toBeLessThan(0.1)
      expect(geometry.top).toBeGreaterThanOrEqual(8)
      expect(geometry.bottom).toBeLessThanOrEqual(792)
    }).toPass()
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Escape')
    await expect(page.locator('#trigger')).toBeFocused()
  })

  test(`Popover faces a measured ${location} row with variable heights and nested actions`, { tag: ['@layout', '@css'] }, async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 })
    await open(page, 'floating-overlay')
    await renderFloating(page, { kind: 'popover', left: 220, top, optionRows: [28, 44, 35, 51, 28],
      attachment: { width: 200, height: 38, gap: '6px' },
      props: { open: true, side: 'right', attachmentSelector: selector, alignToOption: '[role="menuitem"]' } })
    await page.locator('#trigger').evaluate(node => { Object.assign(node.style, { height: '28px', boxSizing: 'border-box' }); window.dispatchEvent(new Event('resize')) })
    await expect(async () => {
      const geometry = await page.getByRole('dialog').evaluate((node, location) => {
        const bounds = node.parentElement!.getBoundingClientRect(), trigger = document.getElementById('trigger')!.getBoundingClientRect()
        const rows = [...node.querySelectorAll<HTMLElement>('[role="menuitem"]')].map(row => row.getBoundingClientRect())
        const target = location === 'top' ? rows[0] : location === 'bottom' ? rows.at(-1)!
          : rows.reduce((a, b) => Math.abs(a.top + a.height / 2 - (bounds.top + bounds.height / 2)) <= Math.abs(b.top + b.height / 2 - (bounds.top + bounds.height / 2)) ? a : b)
        return { target: target.top + target.height / 2, trigger: trigger.top + trigger.height / 2 }
      }, location)
      expect(Math.abs(geometry.target - geometry.trigger)).toBeLessThan(0.1)
    }).toPass()
  })

  test(`Select attachment policy faces the ${location} option without changing selection`, { tag: ['@layout', '@css', '@focus'] }, async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 })
    await open(page, 'select')
    await renderSelect(page, { surface: 'side', defaultValue: 'b' })
    await page.locator('section').evaluate(node => {
      node.setAttribute('data-uf-dropdown-attachment', '')
      Object.assign(node.style, { position: 'fixed', left: '220px', width: '200px' })
      node.style.setProperty('--uf-dropdown-panel-gap', '6px')
      node.style.setProperty('--uf-dropdown-row-alignment', 'adaptive')
    })
    const trigger = page.getByRole('combobox')
    await trigger.evaluate((node, top) => { Object.assign(node.style, { position: 'fixed', left: '230px', top: `${top}px`, height: '28px', width: '160px', boxSizing: 'border-box' }) }, top)
    await trigger.click()
    const content = page.locator('.uf-select__content')
    await expect(async () => {
      const geometry = await content.evaluate((node, location) => {
        const bounds = node.getBoundingClientRect(), trigger = document.querySelector('[role="combobox"]')!.getBoundingClientRect()
        const rows = [...node.querySelectorAll<HTMLElement>('[role="option"]')].map(row => row.getBoundingClientRect())
        const target = location === 'top' ? rows[0] : location === 'bottom' ? rows.at(-1)!
          : rows.reduce((a, b) => Math.abs(a.top + a.height / 2 - (bounds.top + bounds.height / 2)) <= Math.abs(b.top + b.height / 2 - (bounds.top + bounds.height / 2)) ? a : b)
        return { target: target.top + target.height / 2, trigger: trigger.top + trigger.height / 2, selected: node.querySelector('[aria-selected="true"]')?.getAttribute('data-value') }
      }, location)
      expect(Math.abs(geometry.target - geometry.trigger)).toBeLessThan(0.1)
      expect(geometry.selected).toBe('b')
    }).toPass()
    await page.keyboard.press('Escape')
    await expect(trigger).toBeFocused()
  })
}

for (const edge of ['top', 'bottom'] as const) {
  test(`Menu ${edge} uses the consumer inset at its painted edge and faces a 28px control exactly`, { tag: ['@layout', '@css'] }, async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 })
    await open(page, 'menu')
    await page.evaluate(() => {
      for (const [name, value] of Object.entries({ '--uf-control-height': '28px', '--uf-control-pad-y': '4px',
        '--uf-control-pad-icon': '4px', '--uf-control-pad-text': '6px', '--uf-dropdown-surface-padding': '3px',
        '--uf-dropdown-viewport-inset': 'calc(6px + 1px)' })) document.documentElement.style.setProperty(name, value)
    })
    await renderMenu(page, { defaultOpen: true, side: 'right', attachmentSelector: selector, alignToOption: '[role^="menuitem"]' },
      { attachment: { left: 220, width: 240, top: edge === 'top' ? 7 : 755, gap: '6px' } })
    await page.locator('#trigger').evaluate((node, edge) => {
      Object.assign(node.style, { position: 'fixed', top: edge === 'top' ? '12px' : '760px', height: '28px', boxSizing: 'border-box' })
      window.dispatchEvent(new Event('resize'))
    }, edge)
    const popup = page.locator('.uf-menu-content')
    await expect(async () => {
      const geometry = await popup.evaluate((node, edge) => {
        const surface = node.querySelector('.uf-menu-contentPanel')!.getBoundingClientRect()
        const rows = [...node.querySelectorAll<HTMLElement>('[role^="menuitem"]')]
        const row = (edge === 'top' ? rows[0] : rows.at(-1)!).getBoundingClientRect()
        const trigger = document.getElementById('trigger')!.getBoundingClientRect()
        return { row: row.top + row.height / 2, trigger: trigger.top + trigger.height / 2,
          top: surface.top, bottom: surface.bottom,
          gap: surface.left - document.getElementById('attachment')!.getBoundingClientRect().right }
      }, edge)
      expect(Math.abs(geometry.row - geometry.trigger)).toBeLessThan(0.1)
      expect(geometry.top).toBeGreaterThanOrEqual(7)
      expect(geometry.bottom).toBeLessThanOrEqual(793)
      expect(geometry.gap).toBeCloseTo(6, 0)
    }).toPass()
  })

  test(`Select ${edge} uses the consumer painted inset with an extreme 28px control`, { tag: ['@layout', '@css'] }, async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 })
    await open(page, 'select')
    await page.evaluate(() => {
      for (const [name, value] of Object.entries({ '--uf-control-height': '28px', '--uf-control-pad-y': '4px',
        '--uf-dropdown-surface-padding': '3px', '--uf-dropdown-viewport-inset': 'calc(6px + 1px)' })) document.documentElement.style.setProperty(name, value)
    })
    await renderSelect(page, { surface: 'side', defaultValue: 'b' })
    await page.locator('section').evaluate(node => {
      node.setAttribute('data-uf-dropdown-attachment', '')
      Object.assign(node.style, { position: 'fixed', left: '220px', width: '240px' })
      node.style.setProperty('--uf-dropdown-panel-gap', '6px')
      node.style.setProperty('--uf-dropdown-row-alignment', 'adaptive')
    })
    await page.getByRole('combobox').evaluate((node, edge) => {
      Object.assign(node.style, { position: 'fixed', left: '230px', top: edge === 'top' ? '12px' : '760px', height: '28px', width: '160px', boxSizing: 'border-box' })
    }, edge)
    await page.getByRole('combobox').click()
    await expect(async () => {
      const geometry = await page.locator('.uf-select__content').evaluate((node, edge) => {
        const surface = node.querySelector('.uf-select__contentPanel')!.getBoundingClientRect()
        const rows = [...node.querySelectorAll<HTMLElement>('[role="option"]')]
        const row = (edge === 'top' ? rows[0] : rows.at(-1)!).getBoundingClientRect()
        const trigger = document.querySelector('[role="combobox"]')!.getBoundingClientRect()
        return { row: row.top + row.height / 2, trigger: trigger.top + trigger.height / 2,
          top: surface.top, bottom: surface.bottom }
      }, edge)
      expect(Math.abs(geometry.row - geometry.trigger)).toBeLessThan(0.1)
      expect(geometry.top).toBeGreaterThanOrEqual(7)
      expect(geometry.bottom).toBeLessThanOrEqual(793)
    }).toPass({ timeout: 2000 })
  })
}

test('Select adaptive long-list scrolling settles without rewriting user scroll or selection', { tag: ['@layout', '@css', '@focus'] }, async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 800 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await open(page, 'select')
  await page.evaluate(() => {
    for (const [name, value] of Object.entries({ '--uf-control-height': '28px', '--uf-control-pad-y': '4px',
      '--uf-dropdown-surface-padding': '3px', '--uf-dropdown-viewport-inset': '7px' })) document.documentElement.style.setProperty(name, value)
  })
  await renderSelect(page, { surface: 'side', defaultValue: 'row18', items: Array.from({ length: 30 }, (_, index) => ({ value: `row${index}`, label: `Row ${index}` })) })
  await page.locator('section').evaluate(node => {
    node.setAttribute('data-uf-dropdown-attachment', '')
    Object.assign(node.style, { position: 'fixed', left: '220px', width: '240px' })
    node.style.setProperty('--uf-dropdown-panel-gap', '6px')
    node.style.setProperty('--uf-dropdown-row-alignment', 'adaptive')
  })
  const trigger = page.getByRole('combobox')
  await trigger.evaluate(node => { Object.assign(node.style, { position: 'fixed', left: '230px', top: '330px', height: '28px', width: '160px', boxSizing: 'border-box' }) })
  await trigger.click()
  const viewport = page.getByRole('listbox')
  await expect.poll(() => viewport.evaluate(node => node.scrollTop)).toBeGreaterThan(0)
  for (const scrollTop of [120, 180]) {
    const samples = await viewport.evaluate(async (node, scrollTop) => {
      node.scrollTop = scrollTop
      const frames: Array<{ scrollTop: number; top: number }> = []
      for (let index = 0; index < 12; index++) {
        await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
        frames.push({ scrollTop: node.scrollTop, top: node.closest('.uf-select__content')!.getBoundingClientRect().top })
      }
      return frames
    }, scrollTop)
    expect(samples.every(value => value.scrollTop === scrollTop)).toBe(true)
    const stable = samples.slice(4)
    expect(stable.every(value => Math.abs(value.top - stable[0].top) < 0.1)).toBe(true)
    await expect(page.getByRole('option', { name: 'Row 18', exact: true })).toHaveAttribute('aria-selected', 'true')
  }
  await trigger.press('ArrowDown')
  await expect(async () => {
    const inside = await viewport.evaluate(node => {
      const bounds = node.getBoundingClientRect(), active = node.querySelector('[data-highlighted]')!.getBoundingClientRect()
      return active.top >= bounds.top && active.bottom <= bounds.bottom
    })
    expect(inside).toBe(true)
  }).toPass()
  await page.keyboard.press('Escape')
  await expect(trigger).toBeFocused()
})
