// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Date as DateField } from '../../Date/Date'
import { Calendar } from '../../Calendar/Calendar'
import { formatTriggerValue } from '../date-utils'
import { interpret } from '../create-machine'
import { dateMachine } from '../machines/date.machine'
import { calendarMachine } from '../machines/calendar.machine'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
const format = (
  pattern: string,
  locale = 'en-US',
  value = '2026-09-12T09:35',
) =>
  formatTriggerValue(value, {
    mode: 'datetime',
    selection: 'single',
    locale,
    timezone: 'UTC',
    placeholder: '',
    format: pattern,
  })

describe('Date format has one Gregorian numeric meaning', () => {
  it.each([
    ['ar-EG', '٢٠٢٦-٠٩-١٢ ٠٩:٣٥'],
    ['fa-IR', '۲۰۲۶-۰۹-۱۲ ۰۹:۳۵'],
    ['th-TH', '2026-09-12 09:35'],
  ])(
    'keeps civil fields in %s instead of parsing localized digits',
    (locale, expected) => {
      expect(format('yyyy-MM-dd HH:mm', locale)).toBe(expected)
    },
  )
  it('removes padding using numeric fields in Arabic', () => {
    expect(format('M/d/yyyy H:m', 'ar-EG')).toBe('٩/١٢/٢٠٢٦ ٩:٣٥')
  })
  it('pads Gregorian years below 100 instead of relying on a localized substring', () => {
    expect(format('yyyy-MM-dd HH:mm', 'en-US', '0042-02-03T00:05')).toBe(
      '0042-02-03 00:05',
    )
    expect(format('yy y', 'en-US', '0007-02-03T00:05')).toBe('07 7')
  })
  it.each([
    ['00:05', '00/0/12/12/05/5'],
    ['12:05', '12/12/12/12/05/5'],
    ['23:05', '23/23/11/11/05/5'],
  ])('distinguishes 24-hour and 12-hour fields at %s', (time, expected) => {
    expect(format('HH/H/hh/h/mm/m', 'en-US', `2026-09-12T${time}`)).toBe(
      expected,
    )
  })
  it('preserves quoted words, separators and escaped apostrophes', () => {
    expect(format("yyyy-MM-dd 'at' HH:mm 'o''clock' ''")).toBe(
      "2026-09-12 at 09:35 o'clock '",
    )
  })
  it('supports weekday names and the grammatical month form in a day pattern', () => {
    expect(format('EEE EEEE, MMMM d')).toBe('Sat Saturday, September 12')
    expect(format('d MMMM yyyy', 'ru-RU')).toBe('12 сентября 2026')
    expect(format('MMMM yyyy', 'ru-RU')).toBe('сентябрь 2026')
  })
  it.each(['YYYY-MM-dd', 'ddd', "yyyy-MM-dd 'at"])(
    'rejects an invalid pattern %s instead of printing misleading fields',
    (pattern) => {
      expect(() => format(pattern)).toThrow(RangeError)
    },
  )
})

let root: Root, host: HTMLDivElement
beforeEach(() => {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})
afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
})
const render = (node: React.ReactNode) => act(async () => root.render(node))

class Boundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  render() {
    return this.state.error ? (
      <output data-error={this.state.error.name}>
        {this.state.error.message}
      </output>
    ) : (
      this.props.children
    )
  }
}

describe('locale configuration is explicit and independent of value', () => {
  // React 18 reports caught render errors through window.error as well as console.
  const caughtConfigurationError = (event: ErrorEvent) => {
    if (event.error instanceof RangeError) event.preventDefault()
  }
  beforeEach(() => window.addEventListener('error', caughtConfigurationError))
  afterEach(() => window.removeEventListener('error', caughtConfigurationError))
  it.each([
    ['Date empty', <DateField locale="not_a_locale" />],
    [
      'Date selected',
      <DateField locale="not_a_locale" defaultValue="2026-09-12" />,
    ],
    ['Calendar', <Calendar locale="not_a_locale" />],
    ['Date empty zone', <DateField timezone="Not/A_Zone" />],
    ['Date empty pattern', <DateField format="YYYY-MM-dd" />],
    [
      'Date selected zone',
      <DateField timezone="Not/A_Zone" defaultValue="2026-09-12" />,
    ],
  ])('%s reports invalid configuration at render', async (_name, element) => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      await render(<Boundary>{element}</Boundary>)
      expect(host.querySelector('output')?.dataset.error).toBe('RangeError')
    } finally {
      error.mockRestore()
    }
  })
  it.each([-1, 7, 1.5, Number.NaN])(
    'rejects invalid weekStartsOn=%s on both owners',
    async (weekStartsOn) => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => {})
      try {
        for (const [kind, Component] of [
          ['Date', DateField],
          ['Calendar', Calendar],
        ] as const) {
          await render(
            <Boundary key={kind}>
              <Component weekStartsOn={weekStartsOn as 0} />
            </Boundary>,
          )
          expect(host.querySelector('output')?.dataset.error).toBe('RangeError')
          expect(host.querySelector('output')?.textContent).toMatch(
            /weekStartsOn/,
          )
        }
      } finally {
        error.mockRestore()
      }
    },
  )
  it('changes locale and custom format without changing selection or submitted ISO', async () => {
    const change = vi.fn()
    const field = (locale: string, pattern?: string) => (
      <form>
        <DateField
          value="2026-09-12T09:35"
          mode="datetime"
          name="schedule"
          locale={locale}
          format={pattern}
          onValueChange={change}
        />
      </form>
    )
    await render(field('en-US', 'yyyy-MM-dd HH:mm'))
    expect(host.querySelector('[role="combobox"]')?.textContent).toBe(
      '2026-09-12 09:35',
    )
    await render(field('ar-EG', 'yyyy-MM-dd HH:mm'))
    expect(host.querySelector('[role="combobox"]')?.textContent).toBe(
      '٢٠٢٦-٠٩-١٢ ٠٩:٣٥',
    )
    expect(new FormData(host.querySelector('form')!).get('schedule')).toBe(
      '2026-09-12T09:35',
    )
    expect(change).not.toHaveBeenCalled()
  })
  it('uses the same native fallback for a well-formed unsupported locale in both owners', async () => {
    const locale = 'zz-ZZ'
    const resolved = new Intl.DateTimeFormat(locale).resolvedOptions().locale
    const props = { defaultValue: '2026-09-12', locale }
    await render(<Calendar {...props} />)
    const calendar = host.textContent
    await render(<Calendar {...props} locale={resolved} />)
    expect(host.textContent).toBe(calendar)
    await render(<DateField value="2026-09-12" locale={locale} />)
    const field = host.textContent
    await render(<DateField value="2026-09-12" locale={resolved} />)
    expect(host.textContent).toBe(field)
  })
  it('keeps explicit business weeks consistent when used through the machines directly', () => {
    const change = vi.fn()
    const date = interpret(dateMachine, {
      mode: 'week',
      locale: 'ar-EG',
      weekStartsOn: 1,
      onValueChange: change,
    }).start()
    const calendar = interpret(calendarMachine, {
      locale: 'ar-EG',
      weekStartsOn: 1,
      value: '2026-09-12',
      viewDate: '2026-09-01',
      focusedDate: '2026-09-12',
    }).start()
    try {
      date.send('OPEN')
      date.send({ type: 'SELECT_DAY', date: '2026-09-12' })
      expect(change).toHaveBeenLastCalledWith({
        value: { start: '2026-09-07', end: '2026-09-13' },
      })
      calendar.send({ type: 'KEY_DOWN', key: 'Home' })
      expect(calendar.getSnapshot().context.focusedDate).toBe('2026-09-07')
      date.syncContext({ weekStartsOn: null })
      calendar.syncContext({ weekStartsOn: null, focusedDate: '2026-09-12' })
      date.send('OPEN')
      date.send({ type: 'SELECT_DAY', date: '2026-09-12' })
      expect(change).toHaveBeenLastCalledWith({
        value: { start: '2026-09-12', end: '2026-09-18' },
      })
      calendar.send({ type: 'KEY_DOWN', key: 'End' })
      expect(calendar.getSnapshot().context.focusedDate).toBe('2026-09-18')
    } finally {
      date.stop()
      calendar.stop()
    }
  })
})
