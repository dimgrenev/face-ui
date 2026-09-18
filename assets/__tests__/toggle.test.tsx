import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Root } from 'react-dom/client'
import { act } from 'react'
import { Toggle } from '../../Toggle/Toggle'
import { mount } from './harness'

describe('component smoke', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;({ host: container, root } = mount())
  })

  it('Toggle changes selection in uncontrolled mode', async () => {
    await act(async () => {
      root.render(
        <Toggle
          defaultValue={['bold']}
          items={[
            { value: 'bold', label: 'B' },
            { value: 'italic', label: 'I' },
          ]}
        />,
      )
    })

    const buttons = Array.from(
      container.querySelectorAll<HTMLButtonElement>('button'),
    )
    const bold = buttons.find((button) => button.textContent === 'B') ?? null
    const italic = buttons.find((button) => button.textContent === 'I') ?? null

    expect(bold).not.toBeNull()
    expect(bold?.getAttribute('data-state')).toBe('on')

    await act(async () => {
      italic?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(italic?.getAttribute('data-state')).toBe('on')
  })
})

describe('data and feedback a11y characterization', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;({ host: container, root } = mount())
  })

  it('keeps Toggle group and item pressed, disabled, orientation, and onValueChange semantics', async () => {
    const handleValueChange = vi.fn()

    await act(async () => {
      root.render(
        <Toggle
          type="multiple"
          orientation="vertical"
          defaultValue={['bold']}
          onValueChange={handleValueChange}
          items={[
            { value: 'bold', label: 'Bold' },
            { value: 'italic', label: 'Italic' },
            { value: 'strike', label: 'Strike', disabled: true },
          ]}
        />,
      )
    })

    const group = container.querySelector<HTMLElement>(
      '[data-scope="toggle"][data-part="root"]',
    )
    expect(group).not.toBeNull()
    expect(group?.getAttribute('role')).toBe('group')
    expect(group?.getAttribute('aria-orientation')).toBeNull()
    expect(group?.getAttribute('data-type')).toBe('multiple')

    const items = Array.from(
      container.querySelectorAll<HTMLButtonElement>(
        'button[data-scope="toggle"][data-part="item"]',
      ),
    )
    expect(items).toHaveLength(3)
    expect(items[0]?.getAttribute('role')).toBeNull()
    expect(items[0]?.getAttribute('aria-pressed')).toBe('true')
    expect(items[0]?.getAttribute('data-orientation')).toBe('vertical')

    expect(items[1]?.getAttribute('aria-pressed')).toBe('false')

    expect(items[2]?.getAttribute('aria-disabled')).toBe('true')
    expect(items[2]?.tabIndex).toBe(-1)

    await act(async () => {
      items[1]?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(handleValueChange).toHaveBeenLastCalledWith({
      value: ['bold', 'italic'],
    })
    expect(items[1]?.getAttribute('aria-pressed')).toBe('true')
  })
})
