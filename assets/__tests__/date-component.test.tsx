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
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
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
    const content = container.querySelector('[data-part=\"content\"]') as HTMLElement | null

    expect(trigger).not.toBeNull()
    expect(content).not.toBeNull()
    expect(content?.hidden).toBe(true)

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(content?.hidden).toBe(false)
  })

  it('writes the picked date back into the trigger label', async () => {
    await act(async () => {
      root.render(<DateField label="Date" placeholder="Pick date" />)
    })

    const trigger = container.querySelector('button') as HTMLButtonElement | null
    expect(trigger).not.toBeNull()
    expect(trigger?.textContent).toContain('Pick date')

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const dayButtons = Array.from(container.querySelectorAll<HTMLButtonElement>('.uf-calendar-dayButton'))
    const selectableDay = dayButtons.find((button) => button.getAttribute('data-disabled') == null)
    expect(selectableDay).toBeTruthy()

    await act(async () => {
      selectableDay?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(trigger?.textContent).not.toContain('Pick date')
  })
})
