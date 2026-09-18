import { expect, test, type Locator, type Page } from '@playwright/test'

const render = (page: Page, props: Record<string, unknown>) =>
  page.evaluate((props) => (window as any).renderDate(props), props)
const button = (page: Page, name: string) =>
  page.getByRole('dialog').getByRole('button', { name, exact: true })
const changes = (page: Page) =>
  page.evaluate(() =>
    (window as any).dateEvents.filter((event: any) => event.type === 'value'),
  )
async function visibleFocus(node: Locator) {
  await expect(node).toBeFocused()
  await expect(node).toHaveCSS('outline-style', 'solid')
  await expect(node).toHaveCSS('outline-width', '2px')
}

// Match native button navigation. macOS WebKit can reserve plain Tab for text
// controls and use Option+Tab for all controls; probe instead of assuming an OS.
async function nativeButtonTabKey(page: Page) {
  await page.locator('#before').evaluate((before) => {
    const probe = document.createElement('button')
    probe.id = 'native-tab-probe'
    probe.textContent = 'Native tab probe'
    before.after(probe)
    ;(before as HTMLElement).focus()
  })
  await page.keyboard.press('Tab')
  return page.locator('#native-tab-probe').evaluate((probe) => {
    const key = probe === document.activeElement ? 'Tab' : 'Alt+Tab'
    probe.remove()
    return key
  })
}

test.beforeEach(async ({ page }) => {
  await page.goto('/.artifacts/browser-production/scripts/browser/date.html')
  await page.waitForFunction(
    () => typeof (window as any).renderDate === 'function',
  )
})

const grids = [
  {
    mode: 'month',
    openTo: 'month',
    value: '2026-09-01',
    start: 'Sep',
    end: 'Dec',
    first: 'Jan',
  },
  {
    mode: 'year',
    openTo: 'year',
    value: '2026-01-01',
    start: '2026',
    end: '2028',
    first: '2017',
  },
  {
    mode: 'time',
    openTo: 'hours',
    value: '2026-09-12T09:35',
    start: '09',
    end: '23',
    first: '00',
  },
  {
    mode: 'time',
    openTo: 'minutes',
    value: '2026-09-12T09:35',
    start: '35',
    end: '59',
    first: '00',
  },
]
for (const theme of ['light', 'dark']) {
  for (const grid of grids) {
    test(`${theme} ${grid.openTo}: modifier navigation after pointer selection has a visible focus without selecting`, async ({
      page,
    }) => {
      await page.evaluate(
        (theme) => (document.documentElement.dataset.theme = theme),
        theme,
      )
      await render(page, {
        mode: grid.mode,
        openTo: grid.openTo,
        defaultValue: grid.value,
        closeOnSelect: false,
      })
      await page.getByRole('combobox').click()
      await button(page, grid.start).click()
      const before = await changes(page)
      const size = await button(page, grid.end).boundingBox()
      await page.keyboard.press('Control+End')
      await visibleFocus(button(page, grid.end))
      expect(await button(page, grid.end).boundingBox()).toEqual(size)
      expect(
        await button(page, grid.end).evaluate(
          (node) => getComputedStyle(node).outlineColor,
        ),
      ).toBe(
        await button(page, grid.end).evaluate(
          (node) => getComputedStyle(node).color,
        ),
      )
      await page.keyboard.press('Control+End')
      await visibleFocus(button(page, grid.end))
      await page.keyboard.press('Control+Home')
      await visibleFocus(button(page, grid.first))
      expect(await changes(page)).toEqual(before)
    })
  }
  test(`${theme}: a fully unavailable choice grid retains a named visible keyboard entry`, async ({
    page,
  }) => {
    await page.evaluate(
      (theme) => (document.documentElement.dataset.theme = theme),
      theme,
    )
    await render(page, {
      mode: 'time',
      openTo: 'minutes',
      defaultValue: '2026-09-12T09:35',
      disabledTime: { minutes: Array.from({ length: 60 }, (_, i) => i) },
    })
    const tabKey = await nativeButtonTabKey(page)
    await page.getByRole('combobox').focus()
    await page.keyboard.press('Enter')
    const grid = page.getByRole('group', { name: 'Minute', exact: true })
    await visibleFocus(grid)
    await expect(grid.locator('button:enabled')).toHaveCount(0)
    await page.keyboard.press(tabKey)
    await expect(button(page, 'Clear')).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('combobox')).toBeFocused()
    expect(await changes(page)).toEqual([])
  })
}

test('keyboard indication survives changed constraints and resets on pointer use and leaving the grid', async ({
  page,
}) => {
  const props = {
    mode: 'time',
    openTo: 'minutes',
    defaultValue: '2026-09-12T09:35',
    closeOnSelect: false,
  }
  await render(page, props)
  const tabKey = await nativeButtonTabKey(page)
  await page.getByRole('combobox').click()
  await button(page, '35').click()
  await page.keyboard.press('Control+End')
  await visibleFocus(button(page, '59'))
  await render(page, { ...props, disabledTime: { minutes: [59] } })
  await visibleFocus(button(page, '00'))
  await button(page, '35').click()
  const choices = page.getByRole('dialog')
  await expect(choices).not.toHaveAttribute('data-keyboard-focus')
  if (
    !(await button(page, '35').evaluate((node) =>
      node.matches(':focus-visible'),
    ))
  )
    await expect(button(page, '35')).toHaveCSS('outline-style', 'none')
  await page.keyboard.press('Control+a')
  await expect(choices).not.toHaveAttribute('data-keyboard-focus')
  await expect(button(page, '35')).toBeFocused()
  await page.keyboard.press('Control+End')
  await visibleFocus(button(page, '58'))
  await page.keyboard.press(tabKey)
  await visibleFocus(button(page, 'Clear'))
  await page.keyboard.press(`Shift+${tabKey}`)
  await visibleFocus(button(page, '58'))
  await page.keyboard.press('Escape')
  await visibleFocus(page.getByRole('combobox'))
  await page.keyboard.press('Tab')
  await expect(page.locator('[data-keyboard-focus]')).toHaveCount(0)
})

test('period paging retains the visible keyboard position without committing', async ({
  page,
}) => {
  await render(page, {
    mode: 'year',
    defaultValue: '2026-01-01',
    closeOnSelect: false,
  })
  await page.getByRole('combobox').click()
  await button(page, '2026').click()
  await page.keyboard.press('Control+End')
  await visibleFocus(button(page, '2028'))
  await page.keyboard.press('PageDown')
  await visibleFocus(button(page, '2040'))
  await page.keyboard.press('PageUp')
  await visibleFocus(button(page, '2028'))
  expect(await changes(page)).toEqual([])
})

test('explicit keyboard focus remains visible with forced colors', async ({
  page,
}) => {
  await page.emulateMedia({ forcedColors: 'active' })
  test.skip(
    !(await page.evaluate(() => matchMedia('(forced-colors: active)').matches)),
    'Browser does not emulate forced colors',
  )
  await render(page, {
    mode: 'time',
    openTo: 'minutes',
    defaultValue: '2026-09-12T09:35',
    closeOnSelect: false,
  })
  await page.getByRole('combobox').click()
  await button(page, '35').click()
  await page.keyboard.press('Control+End')
  await visibleFocus(button(page, '59'))
})

for (const entry of [
  { mode: 'date', openTo: 'day' },
  ...grids.map(({ mode, openTo }) => ({ mode, openTo })),
  {
    mode: 'time',
    openTo: 'minutes',
    disabledTime: { minutes: Array.from({ length: 60 }, (_, i) => i) },
  },
]) {
  test(`${entry.openTo}${'disabledTime' in entry ? ' unavailable' : ''}: keyboard reopening after pointer use shows the initial focus`, async ({
    page,
  }) => {
    await render(page, {
      ...entry,
      defaultValue: '2026-09-12T09:35',
      closeOnSelect: false,
    })
    await page.getByRole('combobox').click()
    const initialFocus = () =>
      page.getByRole('dialog').locator('[tabindex="0"]')
    await expect(initialFocus()).toBeFocused()
    for (const key of ['Enter', 'Space', 'ArrowDown']) {
      await page.keyboard.press('Escape')
      await visibleFocus(page.getByRole('combobox'))
      await page.keyboard.press(key)
      await visibleFocus(initialFocus())
    }
    expect(await changes(page)).toEqual([])
  })
}
