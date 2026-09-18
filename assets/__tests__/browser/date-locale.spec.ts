import { expect, test, type Page } from './test'
import { hooks, open } from './helpers'
import type { Hooks } from './fixtures/date.fixture'
const { renderDate } = hooks<Hooks>()
type Props = Parameters<typeof renderDate>[1]

test.use({ timezoneId: 'Pacific/Kiritimati' })

async function render(page: Page, props: Props, calendar = false) {
  await renderDate(page, props, false, calendar ? 'inline' : 'field', calendar)
  if (!calendar && !(await page.getByRole('dialog').count()))
    await page.getByRole('combobox').click()
}
const changes = (page: Page) =>
  page.evaluate(() =>
    (window as any).dateEvents.filter((event: any) => event.type === 'value'),
  )
const day = (page: Page, date: string) => page.locator(`[data-date="${date}"]`)
const nativeLabel = (
  page: Page,
  locale: string,
  options: Intl.DateTimeFormatOptions,
  iso = '2026-09-12',
) =>
  page.evaluate(
    ({ locale, options, iso }) =>
      new Intl.DateTimeFormat(locale, {
        ...options,
        calendar: 'gregory',
        timeZone: 'UTC',
      }).format(new Date(`${iso}T12:00Z`)),
    { locale, options, iso },
  )

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime('2026-09-12T05:00:00Z')
  await open(page, 'date')
})

for (const locale of ['th-TH', 'en-US-u-ca-hebrew', 'fa-IR']) {
  test(`${locale}: field, title, day number and accessible label describe the same Gregorian date`, { tag: ['@intl'] }, async ({
    page,
  }) => {
    await render(page, { locale, value: '2026-09-12' })
    await expect(page.getByRole('combobox')).toHaveText(
      await nativeLabel(page, locale, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
    )
    await expect(
      page.locator('[data-scope="calendar"][data-part="title"]'),
    ).toHaveText(
      await nativeLabel(page, locale, { month: 'long', year: 'numeric' }),
    )
    await expect(day(page, '2026-09-12')).toHaveAttribute(
      'aria-label',
      await nativeLabel(page, locale, { dateStyle: 'full' }),
    )
    await expect(day(page, '2026-09-12')).toHaveText(
      await page.evaluate(
        (locale) =>
          new Intl.NumberFormat(locale, { useGrouping: false }).format(12),
        locale,
      ),
    )
    expect(await changes(page)).toEqual([])
  })
  test(`${locale}: all twelve month choices use Gregorian standalone names`, { tag: ['@intl'] }, async ({
    page,
  }) => {
    await render(page, { mode: 'month', locale, value: '2026-09-01' })
    const names = await page.evaluate(
      (locale) =>
        Array.from({ length: 12 }, (_, index) =>
          new Intl.DateTimeFormat(locale, {
            month: 'short',
            calendar: 'gregory',
            timeZone: 'UTC',
          }).format(new Date(Date.UTC(2026, index, 15))),
        ),
      locale,
    )
    await expect(page.locator('.uf-date__grid--month button')).toHaveText(names)
    expect(await changes(page)).toEqual([])
  })
}

for (const calendar of [false, true]) {
  for (const locale of ['zh-CN', 'ar-EG']) {
    test(`${calendar ? 'Calendar' : 'Date'} ${locale}: narrow weekday names are distinct and accessible names are complete`, { tag: ['@intl'] }, async ({
      page,
    }) => {
      await render(
        page,
        { locale, value: '2026-09-12', weekStartsOn: 0 },
        calendar,
      )
      const labels = await page.evaluate((locale) => {
        const days = Array.from(
          { length: 7 },
          (_, index) => new Date(Date.UTC(2026, 8, 6 + index, 12)),
        )
        return {
          narrow: days.map((date) =>
            new Intl.DateTimeFormat(locale, {
              weekday: 'narrow',
              calendar: 'gregory',
              timeZone: 'UTC',
            }).format(date),
          ),
          full: days.map((date) =>
            new Intl.DateTimeFormat(locale, {
              weekday: 'long',
              calendar: 'gregory',
              timeZone: 'UTC',
            }).format(date),
          ),
        }
      }, locale)
      const headers = page.getByRole('columnheader')
      await expect(headers).toHaveText(labels.narrow)
      for (let index = 0; index < 7; index++)
        await expect(headers.nth(index)).toHaveAttribute(
          'aria-label',
          labels.full[index],
        )
      expect(await changes(page)).toEqual([])
    })
  }
  for (const [locale, firstDate] of [
    ['en-US', '2026-09-06'],
    ['ru-RU', '2026-09-07'],
    ['ar-EG', '2026-09-12'],
  ]) {
    test(`${calendar ? 'Calendar' : 'Date'} ${locale}: default week start controls both headers and Home`, { tag: ['@intl'] }, async ({
      page,
    }) => {
      await render(page, { locale, value: '2026-09-12' }, calendar)
      await expect(page.getByRole('columnheader').first()).toHaveAttribute(
        'aria-label',
        await nativeLabel(page, locale, { weekday: 'long' }, firstDate),
      )
      await day(page, '2026-09-12').focus()
      await page.keyboard.press('Home')
      await expect(day(page, firstDate)).toBeFocused()
      expect(await changes(page)).toEqual([])
    })
  }
  test(`${calendar ? 'Calendar' : 'Date'}: an explicit week start overrides locale and removing it restores the locale default`, { tag: ['@intl'] }, async ({
    page,
  }) => {
    const props = { locale: 'ru-RU', value: '2026-09-12' }
    await render(page, { ...props, weekStartsOn: 0 }, calendar)
    await day(page, '2026-09-12').focus()
    await page.keyboard.press('Home')
    await expect(day(page, '2026-09-06')).toBeFocused()
    await render(page, props, calendar)
    await day(page, '2026-09-12').focus()
    await page.keyboard.press('Home')
    await expect(day(page, '2026-09-07')).toBeFocused()
    await render(page, { ...props, locale: 'en-US' }, calendar)
    await day(page, '2026-09-12').focus()
    await page.keyboard.press('Home')
    await expect(day(page, '2026-09-06')).toBeFocused()
    expect(await changes(page)).toEqual([])
  })
}

for (const [locale, start, end] of [
  ['en-US', '2026-09-06', '2026-09-12'],
  ['ru-RU', '2026-09-07', '2026-09-13'],
  ['ar-EG', '2026-09-12', '2026-09-18'],
]) {
  test(`${locale}: week selection submits the displayed regional week`, { tag: ['@intl'] }, async ({
    page,
  }) => {
    await render(page, {
      mode: 'week',
      locale,
      defaultValue: { start: '2026-09-12', end: null },
      name: 'schedule',
    })
    await day(page, '2026-09-12').click()
    expect(await changes(page)).toEqual([
      { type: 'value', value: { start, end } },
    ])
    expect(
      await page
        .locator('#form')
        .evaluate((form) =>
          new FormData(form as HTMLFormElement).get('schedule'),
        ),
    ).toBe(`${start}/${end}`)
  })
}

for (const [locale, nine, ten, thirtyFive, fiftyNine] of [
  ['ar-EG', '٠٩', '١٠', '٣٥', '٥٩'],
  ['fa-IR', '۰۹', '۱۰', '۳۵', '۵۹'],
]) {
  test(`${locale}: localized clock labels retain numeric keyboard navigation and ISO submission`, { tag: ['@intl'] }, async ({
    page,
  }) => {
    await render(page, {
      mode: 'time',
      openTo: 'hours',
      locale,
      defaultValue: '2026-09-12T09:35',
      name: 'schedule',
      closeOnSelect: false,
    })
    const choice = (name: string) =>
      page.locator('.uf-date__grid').getByRole('button', { name, exact: true })
    await expect(choice(nine)).toBeFocused()
    await page.keyboard.press('ArrowRight')
    await expect(choice(ten)).toBeFocused()
    expect(await changes(page)).toEqual([])
    await page.keyboard.press('Enter')
    await page.getByRole('button', { name: 'Minute', exact: true }).click()
    await page.keyboard.press('Tab')
    await expect(choice(thirtyFive)).toBeFocused()
    await page.keyboard.press('Control+End')
    await expect(choice(fiftyNine)).toBeFocused()
    await page.keyboard.press('Enter')
    expect(
      await page
        .locator('#form')
        .evaluate((form) =>
          new FormData(form as HTMLFormElement).get('schedule'),
        ),
    ).toBe('2026-09-12T10:59')
    expect(await changes(page)).toHaveLength(2)
  })
}

test('Persian year choices and page title use the same ungrouped Gregorian numbers', { tag: ['@intl'] }, async ({
  page,
}) => {
  await render(page, { mode: 'year', locale: 'fa-IR', value: '2026-01-01' })
  const years = page.locator('.uf-date__grid--year')
  await expect(
    years.getByRole('button', { name: '۲۰۲۶', exact: true }),
  ).toBeFocused()
  await expect(
    page.getByRole('dialog').locator('[aria-live="polite"]'),
  ).toHaveText('۲۰۱۷–۲۰۲۸')
  await page.keyboard.press('PageDown')
  await expect(
    years.getByRole('button', { name: '۲۰۳۸', exact: true }),
  ).toBeFocused()
  expect(await changes(page)).toEqual([])
})
