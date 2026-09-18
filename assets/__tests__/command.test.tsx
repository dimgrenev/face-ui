import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Root } from 'react-dom/client'
import { act } from 'react'
import { Command } from '../../Command/Command'
import { installMatchMedia, type MatchMediaRestore } from './harness/match-media'
import { mount } from './harness'

function setNativeInputValue(element: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value',
  )?.set
  expect(setter).toBeTypeOf('function')
  setter?.call(element, value)
}

describe('component smoke', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;({ host: container, root } = mount())
  })

  it('Command updates its query and selects a clicked item in uncontrolled mode', async () => {
    const handleSelect = vi.fn()

    await act(async () => {
      root.render(
        <Command
          defaultValue=""
          items={[
            { id: 'copy', label: 'Copy' },
            { id: 'paste', label: 'Paste' },
            { id: 'cut', label: 'Cut' },
          ]}
          onSelect={handleSelect}
        />,
      )
    })

    const input = container.querySelector(
      '[role="combobox"]',
    ) as HTMLInputElement | null
    expect(input).not.toBeNull()
    expect(container.textContent).toContain('Copy')
    expect(container.textContent).toContain('Paste')

    await act(async () => {
      if (!input) return
      setNativeInputValue(input, 'pa')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })

    expect(input?.value).toBe('pa')
    expect(container.textContent).not.toContain('Copy')
    expect(container.textContent).toContain('Paste')

    const pasteButton =
      Array.from(
        container.querySelectorAll<HTMLButtonElement>('.uf-command-item'),
      ).find((button) => button.textContent?.includes('Paste')) ?? null
    expect(pasteButton).not.toBeNull()

    await act(async () => {
      pasteButton?.dispatchEvent(new Event('pointerdown', { bubbles: true }))
      pasteButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(handleSelect).toHaveBeenCalledTimes(1)
    const selected = handleSelect.mock.calls.at(-1)?.[0] as
      | { item?: { id?: string } }
      | undefined
    expect(selected?.item?.id).toBe('paste')

    await act(async () => {
      pasteButton?.dispatchEvent(
        new MouseEvent('mouseenter', { bubbles: true }),
      )
    })

    const highlightedItems = Array.from(
      container.querySelectorAll<HTMLElement>(
        '.uf-command-item[data-highlighted]',
      ),
    )
    expect(highlightedItems).toHaveLength(1)
    expect(highlightedItems[0]?.textContent).toContain('Paste')
  })
})

describe('responsive overlay surfaces', () => {
  let container: HTMLDivElement
  let root: Root
  let restoreMatchMedia: MatchMediaRestore | null

  beforeEach(() => {
    ;({ host: container, root } = mount())
    restoreMatchMedia = installMatchMedia(true)
  })

  afterEach(() => {
    restoreMatchMedia?.()
    restoreMatchMedia = null
    document.body.style.overflow = ''
    document.body.style.paddingRight = ''
    document.body.style.touchAction = ''
  })

  it('Command binds combobox, grouped listbox and keyboard active-descendant semantics', async () => {
    const handleSelect = vi.fn()

    await act(async () => {
      root.render(
        <Command
          surface="inline"
          placeholder="Search commands"
          groups={[{ id: 'edit', label: 'Edit' }]}
          items={[
            { id: 'copy', label: 'Copy', group: 'edit' },
            { id: 'paste', label: 'Paste', group: 'edit', disabled: true },
            { id: 'cut', label: 'Cut', group: 'edit' },
          ]}
          onSelect={handleSelect}
        />,
      )
    })

    const rootNode = container.querySelector(
      '[data-scope="command"][data-part="root"]',
    ) as HTMLElement | null
    const input = container.querySelector(
      '[data-scope="command"][data-part="input"]',
    ) as HTMLInputElement | null
    const listbox = container.querySelector(
      '[data-scope="command"][data-part="list"]',
    ) as HTMLElement | null
    const group = container.querySelector(
      '[data-scope="command"][data-part="group"]',
    ) as HTMLElement | null
    const groupLabel = container.querySelector(
      '[data-scope="command"][data-part="groupLabel"]',
    ) as HTMLElement | null
    const options = Array.from(
      container.querySelectorAll<HTMLButtonElement>('[role="option"]'),
    )
    const copy =
      options.find((option) => option.dataset.value === 'copy') ?? null
    const paste =
      options.find((option) => option.dataset.value === 'paste') ?? null
    const cut = options.find((option) => option.dataset.value === 'cut') ?? null

    expect(rootNode?.getAttribute('data-state')).toBe('idle')
    expect(input?.getAttribute('role')).toBe('combobox')
    expect(input?.getAttribute('aria-expanded')).toBe('true')
    expect(input?.getAttribute('aria-controls')).toBe(listbox?.id)
    expect(input?.getAttribute('aria-activedescendant')).toBe(copy?.id)
    expect(listbox?.getAttribute('role')).toBe('listbox')
    expect(listbox?.getAttribute('aria-label')).toBe('Command items')
    expect(group?.getAttribute('role')).toBe('group')
    expect(group?.getAttribute('aria-labelledby')).toBe(groupLabel?.id)
    expect(groupLabel?.getAttribute('role')).toBe('presentation')
    expect(options).toHaveLength(3)
    expect(copy?.getAttribute('aria-selected')).toBe('true')
    expect(paste?.hasAttribute('data-disabled')).toBe(true)
    expect(paste?.getAttribute('aria-selected')).toBe('false')

    await act(async () => {
      input?.focus()
    })

    expect(rootNode?.getAttribute('data-state')).toBe('focused')

    await act(async () => {
      input?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
      )
    })

    expect(input?.getAttribute('aria-activedescendant')).toBe(cut?.id)
    expect(cut?.getAttribute('aria-selected')).toBe('true')
    expect(paste?.getAttribute('aria-selected')).toBe('false')

    await act(async () => {
      input?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
      )
    })

    expect(handleSelect).toHaveBeenCalledTimes(1)
    expect(handleSelect.mock.calls.at(-1)?.[0]).toMatchObject({
      item: { id: 'cut' },
    })
  })

  it('Command switches auto surfaces to a dialog on compact viewports', async () => {
    const handleSelect = vi.fn()

    await act(async () => {
      root.render(
        <Command
          items={[
            { id: 'copy', label: 'Copy' },
            { id: 'paste', label: 'Paste' },
            { id: 'cut', label: 'Cut' },
          ]}
          onSelect={handleSelect}
        />,
      )
    })

    expect(container.querySelector('[role="combobox"]')).toBeNull()

    const trigger = container.querySelector(
      '.uf-command__trigger',
    ) as HTMLButtonElement | null
    expect(trigger).not.toBeNull()

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const input = container.querySelector(
      '[role="combobox"]',
    ) as HTMLInputElement | null
    expect(input).not.toBeNull()
    expect(document.body.style.overflow).toBe('hidden')
    expect(
      container.querySelector('.uf-command .uf-responsive-sheetHeader'),
    ).toBeNull()

    const pasteButton =
      Array.from(
        container.querySelectorAll<HTMLButtonElement>('.uf-command-item'),
      ).find((button) => button.textContent?.includes('Paste')) ?? null
    expect(pasteButton).not.toBeNull()

    await act(async () => {
      pasteButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(handleSelect).toHaveBeenCalledTimes(1)
    expect(
      container.querySelector('.uf-command__dialog[data-state=\"open\"]'),
    ).toBeNull()
  })
})
