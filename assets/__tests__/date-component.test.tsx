// @vitest-environment jsdom

import React from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { Date as DateField } from '../../Date/Date'

describe('Date component', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    ;(globalThis as typeof globalThis & { React?: typeof React }).React = React
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(async () => {
    await act(async () => {
      root.unmount()
    })
    container.remove()
  })

  it('renders and opens without crashing in the playground baseline state', async () => {
    await act(async () => {
      root.render(<DateField label="Date" placeholder="Pick date" />)
    })

    expect(container.textContent).toContain('Date')
    expect(container.textContent).toContain('Pick date')

    const trigger = container.querySelector('button')
    expect(trigger).not.toBeNull()
    expect(trigger?.hasAttribute('aria-controls')).toBe(false)
    expect(document.querySelector('[role="dialog"]')).toBeNull()

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const content = document.getElementById(
      trigger?.getAttribute('aria-controls') ?? '',
    )
    expect(content?.hidden).toBe(false)
  })

  it('writes the picked date back into the trigger label', async () => {
    await act(async () => {
      root.render(<DateField label="Date" placeholder="Pick date" />)
    })

    const trigger = container.querySelector(
      'button',
    ) as HTMLButtonElement | null
    expect(trigger).not.toBeNull()
    expect(trigger?.textContent).toContain('Pick date')

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const dayButtons = Array.from(
      document.querySelectorAll<HTMLButtonElement>(
        '.uf-date__content .uf-calendar-dayButton',
      ),
    )
    const selectableDay = dayButtons.find(
      (button) => button.getAttribute('data-disabled') == null,
    )
    expect(selectableDay).toBeTruthy()

    await act(async () => {
      selectableDay?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(trigger?.textContent).not.toContain('Pick date')
  })

  it('applies the public trigger format prop in Date', async () => {
    const fixedDate = new globalThis.Date(
      globalThis.Date.UTC(2026, 2, 6, 14, 35),
    )

    await act(async () => {
      root.render(
        <div>
          <DateField
            label="Report date"
            value={fixedDate}
            timezone="UTC"
            format="yyyy/MM/dd"
          />
          <DateField
            label="Published"
            mode="datetime"
            value={fixedDate}
            timezone="UTC"
            format="MMM dd, yyyy HH:mm"
          />
        </div>,
      )
    })

    const triggers = Array.from(
      container.querySelectorAll<HTMLButtonElement>(
        '[data-scope="date"][data-part="trigger"]',
      ),
    )
    expect(triggers[0]?.textContent).toContain('2026/03/06')
    expect(triggers[1]?.textContent).toContain('Mar 06, 2026 14:35')
  })
})
