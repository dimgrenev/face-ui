import React, { act, createRef } from 'react'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Button, ButtonGroup } from '../../Button/Button'
import { expectDevError, libraryCss, mount } from './harness'
import { installMatchMedia, type MatchMediaRestore } from './harness/match-media'

let host: HTMLDivElement
let root: Root
const render = async (props: React.ComponentProps<typeof Button>) => {
  await act(async () => {
    root.render(<Button {...props} />)
  })
}
const button = () => host.querySelector('button')!
beforeEach(() => {
  ;({ host, root } = mount())
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('Button prop contract', () => {
  it('children label and meta own separate slots and update after mount', async () => {
    await render({ children: 'Save', meta: '⌘S' })
    expect(button().textContent).toBe('Save⌘S')
    expect(button().querySelector('[data-part="meta"]')?.textContent).toBe('⌘S')
    await render({ children: <strong>Publish</strong>, meta: 'Live' })
    expect(button().textContent).toBe('PublishLive')
    expect(button().querySelector('strong')).not.toBeNull()
    await render({ children: 0 })
    expect(button().textContent).toBe('0')
    expect(button().querySelector('[data-part="meta"]')).toBeNull()
  })

  it('align is logical and indent is an integer step from 0 to 9', async () => {
    for (const align of ['start', 'center', 'end'] as const) {
      await render({ children: 'Save', align })
      expect(button().getAttribute('data-align')).toBe(align)
    }
    for (const indent of [0, 9]) {
      await render({ children: 'Row', indent })
      expect(button().hasAttribute('data-indent')).toBe(true)
      expect(button().style.getPropertyValue('--face-runtime-option-level')).toBe(String(indent))
    }
    for (const [indent, expected] of [
      [2.8, '2'],
      [12, '9'],
      [-1, '0'],
    ] as const) {
      await expectDevError(
        () => render({ children: 'Row', indent }),
        new RegExp(`^Face UI Button: invalid indent ${indent}; using ${expected}\\.$`),
      )
      expect(button().style.getPropertyValue('--face-runtime-option-level')).toBe(expected)
    }
    await render({ children: 'Row' })
    expect(button().hasAttribute('data-indent')).toBe(false)
  })

  it('icon and iconPosition remain independent of the disclosure indicator', async () => {
    await render({
      children: 'Account',
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
      children: 'Account',
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
    await render({ children: 'Search', icon: 'search', iconOnly: true })
    expect(button().textContent).toBe('Search')
    expect(button().querySelector('.uf-visually-hidden')?.textContent).toBe(
      'Search',
    )
    await render({ icon: 'search', 'aria-label': 'Find' })
    expect(button().hasAttribute('data-icon-only')).toBe(true)
    expect(button().getAttribute('aria-label')).toBe('Find')
    await render({ children: 'Search', icon: 'search', iconOnly: false })
    expect(button().querySelector('.uf-visually-hidden')).toBeNull()
  })

  it('chevron follows aria-expanded while preserving the native state declaration', async () => {
    await render({ children: 'Options', chevron: 'down', 'aria-expanded': false })
    expect(
      button()
        .querySelector('[data-part="indicator"] svg')
        ?.getAttribute('data-icon'),
    ).toBe('select-chevron-down')
    await render({ children: 'Options', chevron: 'down', 'aria-expanded': 'true' })
    expect(
      button()
        .querySelector('[data-part="indicator"] svg')
        ?.getAttribute('data-icon'),
    ).toBe('select-chevron-up')
    expect(button().getAttribute('aria-expanded')).toBe('true')
    await render({ children: 'Options', 'aria-expanded': false })
    expect(button().querySelector('[data-part="indicator"]')).toBeNull()
    expect(button().getAttribute('aria-expanded')).toBe('false')
  })

  it('disabled and loading block activation independently and preserve the label', async () => {
    const onClick = vi.fn()
    for (const state of [{ disabled: true }, { loading: true }]) {
      await render({ children: 'Save', onClick, ...state })
      await act(async () => {
        button().click()
      })
      expect(button().disabled).toBe(true)
      expect(button().textContent).toBe('Save')
    }
    expect(onClick).not.toHaveBeenCalled()
    expect(button().getAttribute('aria-busy')).toBe('true')
    await render({ children: 'Save', onClick, loading: false })
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
    await render({ children: 'Copy', copyText: '', onCopied: copied })
    await act(async () => {
      button().click()
    })
    expect(writeText).toHaveBeenLastCalledWith('')
    expect(copied).toHaveBeenCalledTimes(1)
    await render({
      children: 'Copy',
      copyText: 'secret',
      onCopied: copied,
      onClick: (event) => event.preventDefault(),
    })
    await act(async () => {
      button().click()
    })
    expect(writeText).toHaveBeenCalledTimes(1)
    await render({ children: 'Copy', copyText: 'new' })
    await act(async () => {
      button().click()
    })
    expect(writeText).toHaveBeenLastCalledWith('new')
    expect(copied).toHaveBeenCalledTimes(1)
    writeText.mockRejectedValue(new Error('Denied'))
    await render({ children: 'Copy', copyText: 'failed', onCopied: copied })
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
        children: 'Save',
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
      await render({ children: 'Save', ref })
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
            <Button>Bold</Button>
            <Button>Italic</Button>
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

describe('component smoke', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;({ host: container, root } = mount())
  })

  it('Button resolves string icon names through Icon', async () => {
    await act(async () => {
      root.render(<Button icon="close" iconOnly fullWidth={false} />)
    })

    const icon = container.querySelector('[data-part="icon"] svg')
    expect(icon).not.toBeNull()
  })

  it('Button outline variant keeps its resting surface transparent', () => {
    const componentStyles = libraryCss()
    expect(componentStyles).toMatch(
      /\.uf-button\[data-scope\]\[data-variant="outline"\]\s*\{[^}]*--uf-button-bg:\s*var\(--uf-color-black-0\);/,
    )
  })

  it('Button selector mode renders a compact system indicator', async () => {
    await act(async () => {
      root.render(
        <Button fullWidth={false} chevron="down">
          GPT-5.5
        </Button>,
      )
    })

    const button = container.querySelector(
      '[data-scope="button"][data-selector]',
    ) as HTMLButtonElement | null
    expect(button?.textContent).toContain('GPT-5.5')
    expect(
      button?.querySelector(
        '[data-part="indicator"] svg[data-icon="select-chevron-down"]',
      ),
    ).not.toBeNull()

    await act(async () => {
      root.render(
        <Button fullWidth={false} chevron="down" aria-expanded>
          GPT-5.5
        </Button>,
      )
    })

    expect(
      container.querySelector(
        '[data-part="indicator"] svg[data-icon="select-chevron-up"]',
      ),
    ).not.toBeNull()

    await act(async () => {
      root.render(
        <Button fullWidth={false} chevron="end">
          Nested
        </Button>,
      )
    })

    const sideButton = container.querySelector(
      '[data-scope="button"][data-selector-direction="side"]',
    ) as HTMLButtonElement | null
    expect(
      sideButton?.querySelector(
        '[data-part="indicator"] svg[data-icon="select-chevron-right"]',
      ),
    ).not.toBeNull()

    const componentStyles = libraryCss()
    expect(componentStyles).toContain(
      '--uf-control-pad-end: var(--uf-selector-indicator-edge-gap);',
    )
  })

  it('Button wraps text in a truncatable label slot inside constrained actions', async () => {
    await act(async () => {
      root.render(
        <div style={{ width: 96 }}>
          <Button
            icon="account"
            fullWidth
            stretchText
            meta="Pro"
          >
            Dmitry Grer With A Very Long Account Name
          </Button>
        </div>,
      )
    })

    const button = container.querySelector<HTMLButtonElement>(
      '.uf-button[data-scope]',
    )
    const textSlot = button?.querySelector<HTMLElement>('[data-part="text"]')
    const label = button?.querySelector<HTMLElement>(
      '[data-part="label"].uf-button__label',
    )

    expect(button?.getAttribute('data-full-width')).toBe('')
    expect(button?.getAttribute('data-stretch-text')).toBe('')
    expect(textSlot).not.toBeNull()
    expect(label?.textContent).toBe('Dmitry Grer With A Very Long Account Name')
    expect(button?.querySelector('.uf-button__meta')?.textContent).toBe('Pro')

    const componentStyles = libraryCss()
    expect(componentStyles).toContain(
      '.uf-button [data-part="label"],\n.uf-button__label {',
    )
    expect(componentStyles).toContain('text-overflow: ellipsis;')
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

  it('Button defaults to non-submit native button semantics inside forms', async () => {
    const handleClick = vi.fn()
    const handleSubmit = vi.fn((event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
    })

    await act(async () => {
      root.render(
        <form onSubmit={handleSubmit}>
          <Button
            onClick={handleClick}
            fullWidth={false}
            membrane={false}
          >
            Run action
          </Button>
        </form>,
      )
    })

    const button = container.querySelector(
      '.uf-button',
    ) as HTMLButtonElement | null
    expect(button).not.toBeNull()
    expect(button?.tagName).toBe('BUTTON')
    expect(button?.type).toBe('button')

    await act(async () => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(handleClick).toHaveBeenCalledTimes(1)
    expect(handleSubmit).not.toHaveBeenCalled()
  })
})
