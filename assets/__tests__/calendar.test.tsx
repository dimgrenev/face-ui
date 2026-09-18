import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Root } from 'react-dom/client'
import { act } from 'react'
import { Calendar } from '../../Calendar/Calendar'
import { mount } from './harness'

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
