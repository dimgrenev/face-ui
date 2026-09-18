import { expect, test, type Page } from '@playwright/test'
const render = (page: Page, props: Record<string, unknown>, calendar = false) =>
  page.evaluate(
    ({ props, calendar }) =>
      (window as any).renderDate(props, false, 'field', calendar),
    { props, calendar },
  )
const changes = (page: Page) =>
  page.evaluate(() =>
    (window as any).dateEvents.filter((event: any) => event.type === 'value'),
  )
const formValue = (page: Page) =>
  page
    .locator('#form')
    .evaluate((form) => new FormData(form as HTMLFormElement).get('deadline'))
const dictionaries = [
  {
    locale: 'ru-RU',
    lang: 'ru',
    dir: 'ltr',
    theme: 'light',
    width: 1000,
    field: 'Срок',
    placeholder: 'Выберите дату',
    labels: {
      previousMonth: 'Предыдущий месяц',
      nextMonth: 'Следующий месяц',
      previousYear: 'Предыдущий год',
      nextYear: 'Следующий год',
      previousYearPage: 'Предыдущие 12 лет',
      nextYearPage: 'Следующие 12 лет',
      calendar: 'Календарь',
      day: 'День',
      month: 'Месяц',
      year: 'Год',
      hours: 'Час',
      minutes: 'Минута',
      start: 'Начало',
      end: 'Конец',
      rangeEndpoint: 'Граница диапазона',
      clear: 'Очистить',
      now: 'Сейчас',
      close: 'Закрыть',
    },
  },
  {
    locale: 'ar-EG',
    lang: 'ar',
    dir: 'rtl',
    theme: 'dark',
    width: 360,
    field: 'الموعد',
    placeholder: 'اختر التاريخ',
    labels: {
      previousMonth: 'الشهر السابق',
      nextMonth: 'الشهر التالي',
      previousYear: 'السنة السابقة',
      nextYear: 'السنة التالية',
      previousYearPage: 'السنوات الـ12 السابقة',
      nextYearPage: 'السنوات الـ12 التالية',
      calendar: 'التقويم',
      day: 'اليوم',
      month: 'الشهر',
      year: 'السنة',
      hours: 'الساعة',
      minutes: 'الدقيقة',
      start: 'بداية',
      end: 'نهاية',
      rangeEndpoint: 'طرف النطاق',
      clear: 'مسح',
      now: 'الآن',
      close: 'إغلاق',
    },
  },
]
test.beforeEach(async ({ page }) => {
  await page.goto('/.artifacts/browser-production/scripts/browser/date.html')
  await page.waitForFunction(
    () => typeof (window as any).renderDate === 'function',
  )
})
for (const config of dictionaries) {
  test(`Calendar ${config.locale}: shared navigation labels, live identity and native group naming`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: config.width, height: 850 })
    const labels = config.labels
    const props = {
      locale: config.locale,
      dir: config.dir,
      lang: config.lang,
      'aria-label': config.field,
      defaultValue: '2026-09-12',
      labels,
    }
    await render(page, props, true)
    await expect(
      page.getByRole('group', { name: config.field, exact: true }),
    ).toBeVisible()
    const previous = page.getByRole('button', {
      name: labels.previousMonth,
      exact: true,
    })
    await previous.click()
    await expect(page.locator('[data-part="title"]')).toContainText(
      '2026'.replace(/./g, (digit) =>
        new Intl.NumberFormat(config.locale, { useGrouping: false }).format(
          Number(digit),
        ),
      ),
    )
    await page
      .getByRole('button', { name: labels.nextMonth, exact: true })
      .click()
    expect(await changes(page)).toEqual([])
    await previous.focus()
    await previous.evaluate((node) => {
      ;(window as any).savedNavigation = node
    })
    await render(
      page,
      {
        ...props,
        labels: { ...labels, previousMonth: `${labels.previousMonth} (2)` },
      },
      true,
    )
    const updated = page.getByRole('button', {
      name: `${labels.previousMonth} (2)`,
      exact: true,
    })
    await expect(updated).toBeFocused()
    expect(
      await updated.evaluate(
        (node) => node === (window as any).savedNavigation,
      ),
    ).toBe(true)
    await page.keyboard.press('Enter')
    expect(await changes(page)).toEqual([])
  })
  test(`Date ${config.locale}: every internal label reaches working controls and live translation is quiet`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: config.width, height: 850 })
    await page.clock.install({ time: new Date('2026-09-13T12:30:00Z') })
    await page.evaluate((theme) => {
      document.documentElement.dataset.theme = theme
    }, config.theme)
    const labels = config.labels
    const props = {
      mode: 'datetime',
      selection: 'range',
      name: 'deadline',
      defaultValue: { start: '2026-09-12T09:35', end: '2026-09-15T10:00' },
      closeOnSelect: false,
      locale: config.locale,
      dir: config.dir,
      lang: config.lang,
      label: config.field,
      placeholder: config.placeholder,
      labels,
      surface: config.width === 360 ? 'sheet' : 'popover',
    }
    await render(page, props)
    await page.getByRole('combobox', { name: config.field }).click()
    const dialog = page.getByRole('dialog', { name: config.field, exact: true })
    await expect(dialog).toBeVisible()
    await expect(
      dialog.getByRole('group', { name: labels.calendar, exact: true }),
    ).toBeVisible()
    const button = (name: string) =>
      dialog.getByRole('button', { name, exact: true })
    await button(labels.previousMonth).click()
    await button(labels.nextMonth).click()
    const day = page.locator('[data-date="2026-09-12"]')
    await day.focus()
    await day.evaluate((node) => {
      ;(window as any).savedDay = node
    })
    await render(page, {
      ...props,
      labels: { ...labels, clear: `${labels.clear} (2)` },
    })
    await expect(day).toBeFocused()
    expect(
      await day.evaluate((node) => node === (window as any).savedDay),
    ).toBe(true)
    expect(await changes(page)).toEqual([])
    expect(await formValue(page)).toBe('2026-09-12T09:35/2026-09-15T10:00')
    await button(labels.month).click()
    await expect(
      dialog.getByRole('group', { name: labels.month, exact: true }),
    ).toBeVisible()
    await button(labels.previousYear).click()
    await button(labels.nextYear).click()
    await button(labels.year).click()
    await expect(
      dialog.getByRole('group', { name: labels.year, exact: true }),
    ).toBeVisible()
    await button(labels.previousYearPage).click()
    await button(labels.nextYearPage).click()
    await button(labels.hours).click()
    await expect(
      dialog.getByRole('group', { name: labels.hours, exact: true }),
    ).toBeVisible()
    await expect(
      dialog.getByRole('group', { name: labels.rangeEndpoint, exact: true }),
    ).toBeVisible()
    await expect(button(labels.start)).toHaveAttribute('aria-pressed', 'true')
    await button(labels.end).click()
    await expect(button(labels.end)).toHaveAttribute('aria-pressed', 'true')
    await button(labels.minutes).click()
    await expect(
      dialog.getByRole('group', { name: labels.minutes, exact: true }),
    ).toBeVisible()
    expect(await changes(page)).toEqual([])
    await button(labels.now).click()
    expect(await changes(page)).toEqual([
      {
        type: 'value',
        value: { start: '2026-09-12T09:35', end: '2026-09-13T12:30' },
      },
    ])
    await button(`${labels.clear} (2)`).click()
    expect(await formValue(page)).toBeNull()
    await expect(button(`${labels.clear} (2)`)).toBeDisabled()
    await expect(page.getByRole('combobox')).toHaveText(config.placeholder)
    await button(labels.day).click()
    if (config.width === 360) await button(labels.close).click()
    else await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await expect(page.getByRole('combobox')).toBeFocused()
  })
}
