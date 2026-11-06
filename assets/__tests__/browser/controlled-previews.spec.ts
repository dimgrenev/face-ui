import { expect, test, type Page } from './test'
import { hooks, open } from './helpers'
import type { Hooks } from './fixtures/controlled-previews.fixture'

const { renderControlledExample, runControlledExampleChecks } = hooks<Hooks>()
const errors = new WeakMap<Page, string[]>()
test.beforeEach(async ({ page }) => {
  const observed: string[] = []; errors.set(page, observed)
  page.on('pageerror', error => observed.push(error.message))
  page.on('console', message => { if (message.type() === 'error') observed.push(message.text()) })
  await page.route('**/*', route => {
    const url = new URL(route.request().url())
    if (['http:', 'https:'].includes(url.protocol) && !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) {
      observed.push(`Unexpected external request: ${url.origin}`)
      return route.abort('blockedbyclient')
    }
    return route.continue()
  })
})
test.afterEach(async ({ page }) => { expect(errors.get(page)).toEqual([]) })

test('authored partial Checkbox accepts actual pointer changes and Reset', { tag: ['@pointer', '@react'] }, async ({ page }) => {
  await open(page, 'controlled-previews')
  await renderControlledExample(page, 'Checkbox')
  const input = page.getByRole('checkbox')
  await expect(input).toHaveAttribute('aria-checked', 'mixed')
  const painted = page.locator('[data-face-checkbox-example] label[data-part="root"]')
  await painted.click(); await expect(input).toBeChecked()
  await renderControlledExample(page, 'Checkbox', '', { label: 'Edited label' })
  await expect(input).toBeChecked()
  await painted.click(); await expect(input).not.toBeChecked()
  await renderControlledExample(page, 'Checkbox', '', {}, true)
  await expect(input).toHaveAttribute('aria-checked', 'mixed')
  await runControlledExampleChecks(page); await runControlledExampleChecks(page)
  await renderControlledExample(page, 'Checkbox', '', {}, true)
  await expect(input).toHaveAttribute('aria-checked', 'mixed')
})

test('authored bounded empty Date opens its selectable month after today moves past it', { tag: ['@pointer', '@react'] }, async ({ page }) => {
  await page.clock.setFixedTime('2026-10-18T12:00:00Z')
  await open(page, 'controlled-previews')
  await renderControlledExample(page, 'Date', 'With Validation')
  const submitted = page.locator('[data-face-date-example] select[aria-hidden="true"]')
  const trigger = page.locator('[data-scope="date"][data-part="trigger"]')
  const original = await trigger.elementHandle()
  await expect(submitted).toHaveValue('')
  await trigger.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.locator('[data-scope="calendar"][data-part="title"]')).toHaveText('March 2026')
  await expect(submitted).toHaveValue('')
  await expect(dialog.locator('.uf-calendar-dayButton[data-date="2026-03-08"]')).toBeDisabled()
  await dialog.locator('.uf-calendar-dayButton[data-date="2026-03-10"]').click()
  await expect(submitted).toHaveValue('2026-03-10')
  await runControlledExampleChecks(page); await runControlledExampleChecks(page)
  await expect(submitted).toHaveValue(/^2026-03-/)
  expect(await original!.evaluate(node => node.isConnected)).toBe(true)
  await renderControlledExample(page, 'Date', 'With Validation', {}, true)
  await expect(submitted).toHaveValue('')
  expect(await original!.evaluate(node => node.isConnected)).toBe(false)
  await runControlledExampleChecks(page)
  await expect(submitted).toHaveValue(/^2026-03-/)
})

for (const state of ['DateTime', 'Time', 'Range', 'Week', 'Month', 'Year']) {
  test(`authored Date ${state} commits pointer selection through its own portal`, { tag: ['@pointer', '@react'] }, async ({ page }) => {
    await open(page, 'controlled-previews')
    await renderControlledExample(page, 'Date', state)
    const submitted = page.locator('[data-face-date-example] select[aria-hidden="true"]')
    const initial = await submitted.inputValue()
    const trigger = page.locator('[data-scope="date"][data-part="trigger"]')
    const original = await trigger.elementHandle()
    await trigger.click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: 'Clear', exact: true }).click()
    await expect(submitted).toHaveValue('')
    await page.keyboard.press('Escape')
    await renderControlledExample(page, 'Date', state, { description: 'Edited help' })
    await expect(submitted).toHaveValue('')
    expect(await original!.evaluate(node => node.isConnected)).toBe(true)
    await trigger.click()
    const choices = dialog.locator('.uf-calendar-dayButton:not(:disabled):not([data-disabled]), .uf-date__grid button:not(:disabled)')
    await choices.first().click()
    if (state === 'Range') await choices.nth(1).click()
    await expect(submitted).not.toHaveValue('')
    await page.keyboard.press('Escape')
    await renderControlledExample(page, 'Date', state, {}, true)
    await expect(submitted).toHaveValue(initial)
    expect(await original!.evaluate(node => node.isConnected)).toBe(false)
    await runControlledExampleChecks(page); await runControlledExampleChecks(page)
    await renderControlledExample(page, 'Date', state, {}, true)
    await expect(submitted).toHaveValue(initial)
  })
}

for (const state of ['Middle Page', 'Large Dataset']) {
  test(`authored Pagination ${state} moves actual pages and retains same-document local state`, { tag: ['@pointer', '@react'] }, async ({ page }) => {
    await open(page, 'controlled-previews')
    await renderControlledExample(page, 'Pagination', state)
    const active = page.locator('[data-scope="pagination"][aria-current="page"]')
    const initial = Number(await active.getAttribute('data-page'))
    await page.getByRole('button', { name: 'Next page', exact: true }).click()
    await expect(active).toHaveAttribute('data-page', String(initial + 1))
    await renderControlledExample(page, 'Pagination', state, { siblingCount: 2 })
    await expect(active).toHaveAttribute('data-page', String(initial + 1))
    await renderControlledExample(page, 'Pagination', state, { page: 3 })
    await expect(active).toHaveAttribute('data-page', '3')
    await runControlledExampleChecks(page); await runControlledExampleChecks(page)
    await expect(active).toHaveAttribute('data-page', '3')
    await renderControlledExample(page, 'Pagination', state, {}, true)
    await expect(active).toHaveAttribute('data-page', String(initial))
  })
}

test('authored single-page Pagination keeps its enabled current page as a silent no-op through checks and Reset', { tag: ['@pointer', '@react'] }, async ({ page }) => {
  await open(page, 'controlled-previews')
  const renderSinglePage = (reset = false) => page.evaluate(reset => {
    const host = window as unknown as Hooks & { singlePageChanges?: number }
    host.singlePageChanges ??= 0
    host.renderControlledExample('Pagination', 'Middle Page', {
      total: 0, page: 4,
      onPageChange: () => { host.singlePageChanges = (host.singlePageChanges ?? 0) + 1 },
    }, reset)
  }, reset)
  await renderSinglePage()
  const current = page.getByRole('button', { name: 'Page 1', exact: true })
  const original = await current.elementHandle()
  await expect(current).toBeEnabled()
  await expect(current).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('button', { name: 'Next page', exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Previous page', exact: true })).toBeDisabled()
  await current.click()
  await runControlledExampleChecks(page); await runControlledExampleChecks(page)
  await expect(current).toHaveAttribute('aria-current', 'page')
  expect(await page.evaluate(() => (window as unknown as { singlePageChanges: number }).singlePageChanges)).toBe(0)
  await renderSinglePage(true)
  expect(await original!.evaluate(node => node.isConnected)).toBe(false)
  await runControlledExampleChecks(page)
  await expect(current).toHaveAttribute('aria-current', 'page')
  expect(await page.evaluate(() => (window as unknown as { singlePageChanges: number }).singlePageChanges)).toBe(0)
})

test('authored Toc follows the native link and places its current marker on the selected row', { tag: ['@pointer', '@layout', '@react'] }, async ({ page }) => {
  await open(page, 'controlled-previews')
  await renderControlledExample(page, 'Toc', 'Controlled')
  const setup = page.getByRole('link', { name: 'Setup', exact: true })
  await setup.click()
  await expect(setup).toHaveAttribute('aria-current', 'location')
  await expect(page).toHaveURL(/#setup$/)
  const placed = await setup.evaluate(link => {
    const list = link.closest('[data-part="root"]')!.querySelector<HTMLElement>('[data-part="list"]')!
    const style = getComputedStyle(list), row = link.getBoundingClientRect(), plane = list.getBoundingClientRect()
    return { y: Number.parseFloat(style.getPropertyValue('--uf-toc-indicator-y')), h: Number.parseFloat(style.getPropertyValue('--uf-toc-indicator-h')), expectedY: row.top - plane.top, expectedH: row.height }
  })
  expect(placed.y).toBeCloseTo(placed.expectedY, 1)
  expect(placed.h).toBeCloseTo(placed.expectedH, 1)
  await renderControlledExample(page, 'Toc', 'Controlled', { line: 'end' })
  await expect(setup).toHaveAttribute('aria-current', 'location')
  await renderControlledExample(page, 'Toc', 'Controlled', { value: 'intro' })
  await expect(page.getByRole('link', { name: 'Introduction', exact: true })).toHaveAttribute('aria-current', 'location')
  await runControlledExampleChecks(page); await runControlledExampleChecks(page)
  await expect(page.getByRole('link', { name: 'Introduction', exact: true })).toHaveAttribute('aria-current', 'location')
  await renderControlledExample(page, 'Toc', 'Controlled', {}, true)
  await expect(page.getByRole('link', { name: 'Usage', exact: true })).toHaveAttribute('aria-current', 'location')
})
