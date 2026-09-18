// @vitest-environment jsdom
import React, { act, createRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Button, ButtonGroup } from '../../Button/Button'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let host: HTMLDivElement
let root: Root
const render = async (props: React.ComponentProps<typeof Button>) => {
  await act(async () => {
    root.render(<Button {...props} />)
  })
}
const button = () => host.querySelector('button')!
beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(async () => {
  await act(async () => {
    root.unmount()
  })
  host.remove()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('Button prop contract', () => {
  it('text, children and rightText have explicit content ownership and update after mount', async () => {
    await render({ text: 'Save', rightText: '⌘S' })
    expect(button().textContent).toBe('Save⌘S')
    await render({
      text: 'Ignored',
      children: <strong>Publish</strong>,
      rightText: 'Live',
    })
    expect(button().textContent).toBe('PublishLive')
    expect(button().querySelector('strong')).not.toBeNull()
    await render({ text: 'Restore', children: 0 })
    expect(button().textContent).toBe('0')
    await render({ text: 'Restore' })
    expect(button().textContent).toBe('Restore')
  })

  it('icon and iconPosition remain independent of the disclosure indicator', async () => {
    await render({
      text: 'Account',
      icon: 'user',
      iconPosition: 'end',
      chevron: 'down',
    })
    const icon = button().querySelector('[data-part="icon"]')!
    const label = button().querySelector('[data-part="label"]')!
    expect(
      label.compareDocumentPosition(icon) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(icon.querySelector('svg')?.getAttribute('data-icon')).toBe('user')
    await render({
      text: 'Account',
      icon: <span data-custom-icon />,
      iconPosition: 'start',
    })
    expect(
      button()
        .querySelector('[data-part="icon"]')
        ?.firstElementChild?.hasAttribute('data-custom-icon'),
    ).toBe(true)
  })

  it('iconOnly hides the visual label while keeping it available to assistive technology', async () => {
    await render({ text: 'Search', icon: 'search', iconOnly: true })
    expect(button().textContent).toBe('Search')
    expect(button().querySelector('.uf-visually-hidden')?.textContent).toBe(
      'Search',
    )
    await render({ icon: 'search', 'aria-label': 'Find' })
    expect(button().hasAttribute('data-icon-only')).toBe(true)
    expect(button().getAttribute('aria-label')).toBe('Find')
    await render({ text: 'Search', icon: 'search', iconOnly: false })
    expect(button().querySelector('.uf-visually-hidden')).toBeNull()
  })

  it('chevron follows aria-expanded while preserving the native state declaration', async () => {
    await render({ text: 'Options', chevron: 'down', 'aria-expanded': false })
    expect(
      button()
        .querySelector('[data-part="indicator"] svg')
        ?.getAttribute('data-icon'),
    ).toBe('select-chevron-down')
    await render({ text: 'Options', chevron: 'down', 'aria-expanded': 'true' })
    expect(
      button()
        .querySelector('[data-part="indicator"] svg')
        ?.getAttribute('data-icon'),
    ).toBe('select-chevron-up')
    expect(button().getAttribute('aria-expanded')).toBe('true')
    await render({ text: 'Options', 'aria-expanded': false })
    expect(button().querySelector('[data-part="indicator"]')).toBeNull()
    expect(button().getAttribute('aria-expanded')).toBe('false')
  })

  it('disabled and loading block activation independently and preserve the label', async () => {
    const onClick = vi.fn()
    for (const state of [{ disabled: true }, { loading: true }]) {
      await render({ text: 'Save', onClick, ...state })
      await act(async () => {
        button().click()
      })
      expect(button().disabled).toBe(true)
      expect(button().textContent).toBe('Save')
    }
    expect(onClick).not.toHaveBeenCalled()
    expect(button().getAttribute('aria-busy')).toBe('true')
    await render({ text: 'Save', onClick, loading: false })
    await act(async () => {
      button().click()
    })
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(button().querySelector('.uf-button__spinner')).toBeNull()
  })

  it('copyText and onCopied report actual success, allow cancellation, and honor new props', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('isSecureContext', true)
    const descriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard')
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      get: () => ({ writeText }),
    })
    const copied = vi.fn()
    await render({ text: 'Copy', copyText: '', onCopied: copied })
    await act(async () => {
      button().click()
    })
    expect(writeText).toHaveBeenLastCalledWith('')
    expect(copied).toHaveBeenCalledTimes(1)
    await render({
      text: 'Copy',
      copyText: 'secret',
      onCopied: copied,
      onClick: (event) => event.preventDefault(),
    })
    await act(async () => {
      button().click()
    })
    expect(writeText).toHaveBeenCalledTimes(1)
    await render({ text: 'Copy', copyText: 'new' })
    await act(async () => {
      button().click()
    })
    expect(writeText).toHaveBeenLastCalledWith('new')
    expect(copied).toHaveBeenCalledTimes(1)
    writeText.mockRejectedValue(new Error('Denied'))
    await render({ text: 'Copy', copyText: 'failed', onCopied: copied })
    await act(async () => {
      button().click()
    })
    expect(copied).toHaveBeenCalledTimes(1)
    if (descriptor) Object.defineProperty(navigator, 'clipboard', descriptor)
    else Reflect.deleteProperty(navigator, 'clipboard')
  })

  it('native button props and ref address the real control with or without membrane', async () => {
    const ref = createRef<HTMLButtonElement>()
    for (const membrane of [true, false]) {
      await render({
        text: 'Save',
        id: 'save',
        type: 'submit',
        name: 'action',
        value: 'save',
        form: 'editor',
        title: 'Commit',
        tabIndex: -1,
        className: 'custom',
        style: { color: 'red' },
        membrane,
        ref,
      })
      expect(ref.current).toBe(button())
      expect(button().type).toBe('submit')
      expect(button().name).toBe('action')
      expect(button().value).toBe('save')
      expect(button().getAttribute('form')).toBe('editor')
      expect(button().id).toBe('save')
      expect(button().title).toBe('Commit')
      expect(button().tabIndex).toBe(-1)
      expect(button().classList.contains('custom')).toBe(true)
      expect(button().style.color).toBe('red')
      expect(host.querySelectorAll('.uf-membrane:not([data-membrane-disabled])')).toHaveLength(
        membrane ? 1 : 0,
      )
    }
  })

  it.runIf(Number.parseInt(React.version, 10) >= 19)(
    'ref preserves React 19 callback cleanup',
    async () => {
      const cleanup = vi.fn()
      const ref = vi.fn((node) => (node ? cleanup : undefined))
      await render({ text: 'Save', ref })
      await act(async () => {
        root.render(null)
      })
      expect(cleanup).toHaveBeenCalledTimes(1)
      expect(ref).toHaveBeenCalledTimes(1)
    },
  )

  it('ButtonGroup forwards its accessible label and orientation to the group element', async () => {
    const ref = createRef<HTMLDivElement>()
    for (const orientation of ['horizontal', 'vertical'] as const) {
      await act(async () => {
        root.render(
          <ButtonGroup
            ref={ref}
            orientation={orientation}
            aria-label="Formatting"
            className="toolbar"
          >
            <Button text="Bold" />
            <Button text="Italic" />
          </ButtonGroup>,
        )
      })
      expect(ref.current?.getAttribute('role')).toBe('group')
      expect(ref.current?.getAttribute('aria-label')).toBe('Formatting')
      expect(ref.current?.dataset.orientation).toBe(orientation)
      expect(ref.current?.classList.contains('toolbar')).toBe(true)
      expect(ref.current?.querySelectorAll('button')).toHaveLength(2)
    }
  })
})
