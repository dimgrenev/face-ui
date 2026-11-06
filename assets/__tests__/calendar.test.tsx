import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Root } from 'react-dom/client'
import { act } from 'react'
import { Calendar } from '../../Calendar/Calendar'
import { mount } from './harness'
import { describeControlled } from './harness/controlled'

describe('component smoke', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;({ host: container, root } = mount())
  })

  it('Calendar renders and emits a selected date', async () => {
    const handleValueChange = vi.fn()

    await act(async () => {
      root.render(
        <Calendar
          defaultValue="2026-03-06"
          onValueChange={handleValueChange}
        />,
      )
    })

    const grid = container.querySelector('[data-part="grid"]')
    expect(grid).not.toBeNull()

    const dayButtons = Array.from(
      container.querySelectorAll<HTMLButtonElement>('.uf-calendar-dayButton'),
    )
    const selectableDay = dayButtons.find(
      (button) => button.getAttribute('data-disabled') == null,
    )
    expect(selectableDay).toBeTruthy()
    expect(selectableDay?.getAttribute('data-full-width')).toBe('')
    expect(
      selectableDay?.parentElement?.classList.contains('uf-membrane'),
    ).toBe(true)

    await act(async () => {
      selectableDay?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(handleValueChange).toHaveBeenCalled()
    expect(selectableDay?.getAttribute('data-selected')).not.toBeNull()
    const call = handleValueChange.mock.calls.at(-1)?.[0] as
      | { value: string }
      | undefined
    expect(call?.value).toBe(selectableDay?.getAttribute('data-date'))
  })
})

const day = (host: HTMLElement, iso: string) =>
  host.querySelector<HTMLElement>(`[data-date="${iso}"]`)!
describeControlled<string | null>({
  name: 'Calendar',
  prop: 'value',
  values: ['2026-09-12', '2026-09-20'],
  render: (props) => <Calendar defaultViewDate="2026-09-01" {...props} />,
  change: (host, to) => day(host, to!).click(),
  read: (host) =>
    host
      .querySelector('[role="gridcell"][aria-selected="true"] [data-date]')
      ?.getAttribute('data-date') ?? null,
  // A range given to a single-day calendar is projected onto its start.
  normalizes: [{ start: '2026-09-12', end: '2026-09-14' }, '2026-09-12'],
  handler: 'onClickCapture',
})
describeControlled<string | null>({
  name: 'Calendar',
  prop: 'viewDate',
  values: ['2026-09-01', '2026-10-01'],
  render: (props) => <Calendar {...props} />,
  change: (host, to) =>
    host
      .querySelector<HTMLElement>(
        `[data-part="${to === '2026-10-01' ? 'nextButton' : 'prevButton'}"]`,
      )!
      .click(),
  read: (host) =>
    host
      .querySelector('[data-date]:not([data-outside])')
      ?.getAttribute('data-date')
      ?.replace(/\d\d$/, '01') ?? null,
  // Any day of a month shows that month.
  normalizes: ['2026-09-17', '2026-09-01'],
  handler: 'onClickCapture',
})
