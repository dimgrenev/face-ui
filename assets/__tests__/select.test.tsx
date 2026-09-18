import React, { act, createRef, Fragment, StrictMode } from 'react'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Select } from '../../Select/Select'
import { Icon } from '../../Icon/Icon'
import { libraryCss, mount } from './harness'
import { installMatchMedia, type MatchMediaRestore } from './harness/match-media'
import { interpret } from '../create-machine'
import { selectMachine } from '../machines/select.machine'

const options = [
  { value: 'a', label: 'Alpha' },
  { value: '', label: 'Empty value' },
  { value: 'b', label: 'Beta' },
  { value: 'c', label: 'Charlie', disabled: true },
]
let root: Root, host: HTMLDivElement
const trigger = () =>
  host.querySelector<HTMLButtonElement>('[role="combobox"]')!
const list = () => document.querySelector<HTMLElement>('[role="listbox"]')
const highlighted = () =>
  list()
    ?.querySelector<HTMLElement>('[data-highlighted]')
    ?.getAttribute('data-value')
const render = (props: Record<string, unknown> = {}) =>
  act(async () =>
    root.render(<Select options={options} surface="popover" {...props} />),
  )
const key = (node: Element, key: string) =>
  act(async () => {
    node.dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
    )
  })
beforeEach(() => {
  ;({ host, root } = mount())
})

describe('Select prop contract', () => {
  it('exposes a stable native trigger ref', async () => {
    const ref = vi.fn()
    await render({ ref })
    expect(ref.mock.calls[0][0]).toBe(trigger())
    ref.mockClear()
    await render({ ref, value: 'b', membrane: false })
    expect(ref).not.toHaveBeenCalled()
  })
  it.skipIf(!React.version.startsWith('19.'))(
    'honors ref cleanup in StrictMode',
    async () => {
      const active = new Set<Element>(),
        cleanup = vi.fn()
      const ref = (node: Element | null) => {
        expect(node?.tagName).toBe('BUTTON')
        if (node) active.add(node)
        return () => {
          if (node) active.delete(node)
          cleanup()
        }
      }
      await act(async () =>
        root.render(
          <StrictMode>
            <Select options={options} ref={ref as any} />
          </StrictMode>,
        ),
      )
      expect(active.size).toBe(1)
      await act(async () =>
        root.render(
          <StrictMode>
            <Select options={options} ref={createRef() as any} />
          </StrictMode>,
        ),
      )
      expect(active.size).toBe(0)
      expect(cleanup).toHaveBeenCalled()
    },
  )
  it('routes native identification and focus attributes to the trigger and visual styles to the root', async () => {
    await render({
      id: 'plan',
      'aria-label': 'Billing plan',
      'aria-describedby': 'help',
      tabIndex: -1,
      title: 'Choose plan',
      dir: 'rtl',
      lang: 'ar',
      style: { width: 260 },
      className: 'custom',
    })
    expect(trigger().id).toBe('plan')
    expect(trigger().getAttribute('aria-label')).toBe('Billing plan')
    expect(trigger().getAttribute('aria-describedby')).toBe('help')
    expect(trigger().tabIndex).toBe(-1)
    const visual = host.querySelector<HTMLElement>('.uf-select')!
    expect(visual.classList.contains('custom')).toBe(true)
    expect(visual.style.width).toBe('260px')
    expect(visual.dir).toBe('rtl')
    expect(visual.lang).toBe('ar')
  })
  it('lets native click and keyboard handlers cancel opening', async () => {
    const onClick = vi.fn((event: React.MouseEvent) => event.preventDefault())
    const onKeyDown = vi.fn((event: React.KeyboardEvent) =>
      event.preventDefault(),
    )
    await render({ onClick, onKeyDown })
    await act(async () => trigger().click())
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(list()).toBeNull()
    await key(trigger(), 'ArrowDown')
    expect(onKeyDown).toHaveBeenCalledTimes(1)
    expect(list()).toBeNull()
  })
  it('does not emit label slots for empty React content', async () => {
    for (const label of [false, true, '', <Fragment />]) {
      await render({ label })
      expect(host.querySelector('[data-part="label"]')).toBeNull()
      expect(trigger().hasAttribute('aria-labelledby')).toBe(false)
    }
    await render({ label: 0 })
    expect(host.querySelector('[data-part="label"]')?.textContent).toBe('0')
  })
  it('distinguishes an empty string selection and a zero display override from a placeholder', async () => {
    await render({ value: '' })
    expect(trigger().textContent).toContain('Empty value')
    expect(trigger().hasAttribute('data-placeholder')).toBe(false)
    await render({ value: null, displayValue: 0 })
    expect(trigger().textContent).toBe('0')
    expect(host.querySelector('.uf-select__value--placeholder')).toBeNull()
  })
  it('can navigate away from an option whose value is an empty string', async () => {
    await render({ defaultValue: '' })
    await act(async () => trigger().click())
    expect(highlighted()).toBe('')
    await key(trigger(), 'ArrowDown')
    expect(highlighted()).toBe('b')
    await key(trigger(), 'ArrowUp')
    expect(highlighted()).toBe('')
  })
  it('handles a key once when it originates inside the listbox', async () => {
    await render({
      options: ['a', 'b', 'c', 'd'].map((value) => ({ value, label: value })),
    })
    await act(async () => trigger().click())
    await key(list()!.querySelector('[role="option"]')!, 'ArrowDown')
    expect(highlighted()).toBe('b')
  })
  it('keeps uncontrolled defaults initial-only and parent controlled changes quiet', async () => {
    const onValueChange = vi.fn()
    await render({ defaultValue: 'a', onValueChange })
    await render({ defaultValue: 'b', onValueChange })
    expect(trigger().textContent).toContain('Alpha')
    await render({ value: 'b', onValueChange })
    expect(trigger().textContent).toContain('Beta')
    expect(onValueChange).not.toHaveBeenCalled()
  })
  it('reports a requested controlled selection once and preserves the current value if the parent refuses it', async () => {
    const onValueChange = vi.fn()
    await render({ value: 'a', onValueChange })
    await act(async () => trigger().click())
    await act(async () =>
      list()!.querySelector<HTMLElement>('[data-value="b"]')!.click(),
    )
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith({ value: 'b' })
    expect(trigger().textContent).toContain('Alpha')
  })
  it('removes a highlighted option without leaving a stale active descendant', async () => {
    await render({ defaultValue: 'a' })
    await act(async () => trigger().click())
    await render({ options: [{ value: 'b', label: 'Beta' }] })
    expect(highlighted()).toBe('b')
    expect(trigger().getAttribute('aria-activedescendant')).toBe(
      list()!.querySelector('[data-value="b"]')!.id,
    )
  })
  it('lets the parent own opening and closing without echoing external updates', async () => {
    const onOpenChange = vi.fn()
    await render({ open: false, onOpenChange })
    await act(async () => trigger().click())
    expect(onOpenChange).toHaveBeenCalledExactlyOnceWith({ open: true })
    expect(list()).toBeNull()
    onOpenChange.mockClear()
    await render({ open: true, onOpenChange })
    expect(list()).not.toBeNull()
    expect(onOpenChange).not.toHaveBeenCalled()
    await key(trigger(), 'Escape')
    expect(onOpenChange).toHaveBeenCalledExactlyOnceWith({ open: false })
    expect(list()).not.toBeNull()
    onOpenChange.mockClear()
    await render({ open: false, onOpenChange })
    expect(list()).toBeNull()
    expect(onOpenChange).not.toHaveBeenCalled()
  })
  it('uses defaultOpen only on mount and closes unavailable lists quietly', async () => {
    const onOpenChange = vi.fn()
    await render({ defaultOpen: true, onOpenChange })
    expect(list()).not.toBeNull()
    expect(onOpenChange).not.toHaveBeenCalled()
    await key(trigger(), 'Escape')
    expect(list()).toBeNull()
    await render({ defaultOpen: true, onOpenChange })
    expect(list()).toBeNull()
    await act(async () => trigger().click())
    onOpenChange.mockClear()
    await render({ defaultOpen: true, disabled: true, onOpenChange })
    expect(list()).toBeNull()
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(trigger().disabled).toBe(true)
  })
  it('uses multiple as the mode even before any values are selected', async () => {
    const onValueChange = vi.fn()
    await render({ multiple: true, onValueChange })
    await act(async () => trigger().click())
    await act(async () =>
      list()!.querySelector<HTMLElement>('[data-value=""]')!.click(),
    )
    expect(onValueChange).toHaveBeenLastCalledWith({ value: [''] })
    expect(list()?.getAttribute('aria-multiselectable')).toBe('true')
    expect(highlighted()).not.toBeUndefined()
    await act(async () =>
      list()!.querySelector<HTMLElement>('[data-value=""]')!.click(),
    )
    expect(onValueChange).toHaveBeenLastCalledWith({ value: [] })
    expect(trigger().hasAttribute('data-placeholder')).toBe(true)
  })
  it('preserves a selection when the uncontrolled mode changes and keeps unknown values until options arrive', async () => {
    const onValueChange = vi.fn()
    await render({ defaultValue: 'a', onValueChange })
    await render({ multiple: true, onValueChange })
    await act(async () => trigger().click())
    expect(list()?.getAttribute('aria-multiselectable')).toBe('true')
    expect(
      list()?.querySelector('[data-value="a"]')?.getAttribute('aria-selected'),
    ).toBe('true')
    await act(async () =>
      list()!.querySelector<HTMLElement>('[data-value="b"]')!.click(),
    )
    expect(onValueChange).toHaveBeenLastCalledWith({ value: ['a', 'b'] })
    onValueChange.mockClear()
    await render({ multiple: false, onValueChange })
    expect(trigger().textContent).toContain('Alpha')
    expect(onValueChange).not.toHaveBeenCalled()
    await render({ value: 'pending', options: [] })
    expect(trigger().textContent).toBe('pending')
    await render({
      value: 'pending',
      options: [{ value: 'pending', label: 'Loaded' }],
    })
    expect(trigger().textContent).toBe('Loaded')
  })
  it('uses textValue for rich options and ignores modifiers and composition', async () => {
    function Rich() {
      return <span>Visible label</span>
    }
    await render({
      options: [
        { value: 'a', label: 'Alpha' },
        { value: 'rich', label: <Rich />, textValue: 'Beta' },
      ],
    })
    for (const extra of [
      { ctrlKey: true },
      { metaKey: true },
      { altKey: true },
      { isComposing: true },
    ]) {
      await act(async () =>
        trigger().dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'b',
            bubbles: true,
            cancelable: true,
            ...extra,
          }),
        ),
      )
      expect(list()).toBeNull()
    }
    await key(trigger(), 'b')
    expect(highlighted()).toBe('rich')
    expect(
      list()?.querySelector('[data-value="rich"]')?.getAttribute('aria-label'),
    ).toBe('Beta')
  })
  it('keeps an unavailable option set focusable for form validation without disabling its saved value', async () => {
    await render({
      options: [],
      value: 'pending',
      name: 'plan',
      required: true,
    })
    expect(trigger().disabled).toBe(false)
    expect(trigger().tabIndex).toBe(0)
    expect(trigger().getAttribute('aria-disabled')).toBe('true')
    await act(async () => trigger().click())
    expect(list()).toBeNull()
    expect(host.querySelector('select')!.disabled).toBe(false)
    expect(host.querySelector('select')!.value).toBe('pending')
    await render({ options: [], value: null, required: true })
    await act(async () =>
      host
        .querySelector('select')!
        .dispatchEvent(new Event('invalid', { cancelable: true })),
    )
    expect(document.activeElement).toBe(trigger())
    await render({ options: [], value: null, required: true, disabled: true })
    expect(trigger().disabled).toBe(true)
    expect(host.querySelector('select')!.disabled).toBe(true)
  })

  it('renders a duplicate key once and never activates a disabled option', async () => {
    const onValueChange = vi.fn()
    await render({
      options: [...options, { value: 'a', label: 'Duplicate' }],
      onValueChange,
    })
    await act(async () => trigger().click())
    expect(list()?.querySelectorAll('[data-value="a"]')).toHaveLength(1)
    await act(async () =>
      list()!.querySelector<HTMLElement>('[data-value="c"]')!.click(),
    )
    expect(onValueChange).not.toHaveBeenCalled()
  })
})

describe('component smoke', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;({ host: container, root } = mount())
  })

  it('Select syncs controlled value updates without echoing onValueChange', async () => {
    const handleValueChange = vi.fn()

    await act(async () => {
      root.render(
        <Select
          value="alpha"
          surface="sheet"
          options={[
            { value: 'alpha', label: 'Alpha' },
            { value: 'beta', label: 'Beta' },
          ]}
          onValueChange={handleValueChange}
        />,
      )
    })

    const trigger = container.querySelector<HTMLButtonElement>(
      '[data-scope="select"][data-part="trigger"]',
    )
    expect(trigger?.textContent).toContain('Alpha')
    expect(
      trigger?.querySelector(
        '[data-part="indicator"] svg[data-icon="select-chevron-down"]',
      ),
    ).not.toBeNull()
    expect(libraryCss()).toContain(
      'padding-inline-end: var(--uf-select-indicator-edge-gap);',
    )

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(
      trigger?.querySelector(
        '[data-part="indicator"] svg[data-icon="select-chevron-up"]',
      ),
    ).not.toBeNull()

    const betaOption =
      Array.from(
        container.querySelectorAll<HTMLElement>('[role="option"]'),
      ).find((option) => option.dataset.value === 'beta') ?? null
    expect(betaOption?.textContent).toContain('Beta')

    await act(async () => {
      betaOption?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(handleValueChange.mock.calls.map(([details]) => details)).toEqual([
      { value: 'beta' },
    ])
    expect(trigger?.textContent).toContain('Alpha')

    await act(async () => {
      root.render(
        <Select
          value="beta"
          surface="sheet"
          options={[
            { value: 'alpha', label: 'Alpha' },
            { value: 'beta', label: 'Beta' },
          ]}
          onValueChange={handleValueChange}
        />,
      )
    })

    expect(handleValueChange).toHaveBeenCalledTimes(1)
    expect(trigger?.textContent).toContain('Beta')
  })

  it('Select supports an icon-only trigger without shrinking the popover', async () => {
    await act(async () => {
      root.render(
        <Select
          iconOnly
          fullWidth={false}
          surface="popover"
          aria-label="Change type"
          displayValue={<Icon name="brackets-curly" />}
          contentMinWidth="10rem"
          options={[
            { value: 'string', label: 'String' },
            { value: 'boolean', label: 'Boolean' },
          ]}
        />,
      )
    })

    const selectRoot = container.querySelector<HTMLElement>(
      '[data-scope="select"]',
    )
    const trigger = container.querySelector<HTMLButtonElement>(
      '[data-scope="select"][data-part="trigger"]',
    )

    expect(selectRoot?.hasAttribute('data-icon-only')).toBe(true)
    expect(trigger?.hasAttribute('data-icon-only')).toBe(true)
    expect(trigger?.querySelector('[data-part="indicator"]')).toBeNull()
    expect(
      trigger?.querySelector(
        '.uf-select__value svg[data-icon="brackets-curly"]',
      ),
    ).not.toBeNull()

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
    })

    const contentId = trigger?.getAttribute('aria-controls') ?? ''
    const content =
      document
        .getElementById(contentId)
        ?.closest<HTMLElement>('[data-part="content"]') ?? null
    expect(content?.hasAttribute('data-icon-only')).toBe(true)
    expect(
      content?.style.getPropertyValue(
        '--face-runtime-select-content-min-width',
      ),
    ).toBe('10rem')

    const componentStyles = libraryCss()
    expect(componentStyles).toContain(
      '.uf-select[data-scope="select"][data-icon-only] [data-part="trigger"]',
    )
    expect(componentStyles).toContain('[data-icon-only]')
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

  it('Select switches auto surfaces to a bottom sheet on compact viewports', async () => {
    await act(async () => {
      root.render(
        <Select
          options={[
            { value: 'a', label: 'Alpha' },
            { value: 'b', label: 'Beta' },
          ]}
          placeholder="Pick"
        />,
      )
    })

    const trigger = container.querySelector(
      '[data-part="trigger"]',
    ) as HTMLButtonElement | null
    expect(trigger).not.toBeNull()

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const content = container.querySelector(
      '[data-part="content"]',
    ) as HTMLElement | null
    const backdrop = container.querySelector(
      '.uf-responsive-overlay-backdrop',
    ) as HTMLElement | null
    expect(content?.getAttribute('data-surface')).toBe('sheet')
    expect(content?.hidden).toBe(false)
    expect(backdrop?.getAttribute('data-state')).toBe('open')
    expect(document.body.style.overflow).toBe('hidden')
    expect(container.textContent).toContain('Select option')

    await act(async () => {
      backdrop?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const closedContent = container.querySelector(
      '[data-part="content"]',
    ) as HTMLElement | null
    expect(closedContent?.hidden ?? true).toBe(true)
  })

  it('Select binds its visible label, trigger, listbox and options', async () => {
    await act(async () => {
      root.render(
        <Select
          label="Font style"
          options={[
            { value: 'regular', label: 'Regular' },
            { value: 'bold', label: 'Bold' },
          ]}
          placeholder="Pick"
        />,
      )
    })

    const label = container.querySelector(
      '[data-part="label"]',
    ) as HTMLLabelElement | null
    const trigger = container.querySelector(
      '[role="combobox"]',
    ) as HTMLButtonElement | null
    expect(label).not.toBeNull()
    expect(trigger).not.toBeNull()
    expect(label?.id).toBeTruthy()
    expect(trigger?.id).toBeTruthy()
    expect(label?.htmlFor).toBe(trigger?.id)
    expect(trigger?.getAttribute('aria-labelledby')).toBe(label?.id)
    expect(trigger?.hasAttribute('aria-controls')).toBe(false)

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const listbox = container.querySelector(
      '[role="listbox"]',
    ) as HTMLElement | null
    const options = Array.from(
      container.querySelectorAll<HTMLElement>('[role="option"]'),
    )
    expect(
      document
        .getElementById(trigger?.getAttribute('aria-controls') ?? '')
        ?.contains(listbox),
    ).toBe(true)
    expect(listbox?.contains(document.activeElement)).toBe(true)
    expect(listbox?.getAttribute('aria-labelledby')).toBe(label?.id)
    expect(options).toHaveLength(2)
    expect(options.every((option) => Boolean(option.id))).toBe(true)
  })

  it('Select keyboard navigation highlights enabled options and binds active descendant', async () => {
    await act(async () => {
      root.render(
        <Select
          label="Weight"
          options={[
            { value: 'thin', label: 'Thin', disabled: true },
            { value: 'regular', label: 'Regular' },
            { value: 'bold', label: 'Bold' },
            { value: 'black', label: 'Black', disabled: true },
          ]}
          placeholder="Pick"
        />,
      )
    })

    const trigger = container.querySelector(
      '[role="combobox"]',
    ) as HTMLButtonElement | null
    expect(trigger).not.toBeNull()
    expect(trigger?.hasAttribute('aria-activedescendant')).toBe(false)

    await act(async () => {
      trigger?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
      )
    })

    let highlighted = container.querySelector<HTMLElement>(
      '[role="option"][data-highlighted]',
    )
    expect(highlighted?.textContent).toContain('Regular')
    expect(
      container
        .querySelector('[role="listbox"]')
        ?.getAttribute('aria-activedescendant'),
    ).toBe(highlighted?.id)

    await act(async () => {
      trigger?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
      )
    })

    highlighted = container.querySelector<HTMLElement>(
      '[role="option"][data-highlighted]',
    )
    expect(highlighted?.textContent).toContain('Bold')
    expect(
      container
        .querySelector('[role="listbox"]')
        ?.getAttribute('aria-activedescendant'),
    ).toBe(highlighted?.id)

    await act(async () => {
      trigger?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Home', bubbles: true }),
      )
    })
    expect(
      container.querySelector<HTMLElement>('[role="option"][data-highlighted]')
        ?.textContent,
    ).toContain('Regular')

    await act(async () => {
      trigger?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'End', bubbles: true }),
      )
    })
    expect(
      container.querySelector<HTMLElement>('[role="option"][data-highlighted]')
        ?.textContent,
    ).toContain('Bold')

    await act(async () => {
      trigger?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      )
    })

    expect(container.querySelector('[role="listbox"]')).toBeNull()
    expect(trigger?.hasAttribute('aria-activedescendant')).toBe(false)
  })

  it('Select click selection keeps multiselect open and emits value callbacks', async () => {
    const handleValueChange = vi.fn()
    const handleOpenChange = vi.fn()

    await act(async () => {
      root.render(
        <Select
          multiple
          defaultValue={[]}
          options={[
            { value: 'regular', label: 'Regular' },
            { value: 'bold', label: 'Bold' },
          ]}
          placeholder="Pick"
          onValueChange={handleValueChange}
          onOpenChange={handleOpenChange}
        />,
      )
    })

    const trigger = container.querySelector(
      '[role="combobox"]',
    ) as HTMLButtonElement | null
    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(handleOpenChange).toHaveBeenLastCalledWith({ open: true })

    const regularOption =
      Array.from(
        container.querySelectorAll<HTMLElement>('[role="option"]'),
      ).find((node) => node.textContent?.includes('Regular')) ?? null
    expect(regularOption).not.toBeNull()

    await act(async () => {
      regularOption?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(container.querySelector('[role="listbox"]')).not.toBeNull()
    expect(trigger?.textContent).toContain('Regular')
    expect(handleValueChange).toHaveBeenLastCalledWith({ value: ['regular'] })
  })

  it('allows forcing desktop popover surfaces on compact viewports', async () => {
    await act(async () => {
      root.render(
        <Select
          surface="popover"
          options={[
            { value: 'a', label: 'Alpha' },
            { value: 'b', label: 'Beta' },
          ]}
        />,
      )
    })

    const trigger = container.querySelector(
      '[data-part="trigger"]',
    ) as HTMLButtonElement | null
    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const contentId = trigger?.getAttribute('aria-controls') ?? ''
    const content =
      document
        .getElementById(contentId)
        ?.closest<HTMLElement>('[data-part="content"]') ?? null
    expect(content?.getAttribute('data-surface')).toBe('popover')
    expect(
      container.querySelector('.uf-responsive-overlay-backdrop'),
    ).toBeNull()
    expect(document.body.style.overflow).toBe('')
  })

  it('Select uses the shared outside click fallback for popover dismissal', async () => {
    await act(async () => {
      root.render(
        <>
          <Select
            surface="popover"
            options={[
              { value: 'a', label: 'Alpha' },
              { value: 'b', label: 'Beta' },
            ]}
          />
          <button type="button" data-testid="select-outside-click">
            Outside
          </button>
        </>,
      )
    })

    const trigger = container.querySelector(
      '[data-part="trigger"]',
    ) as HTMLButtonElement | null
    const outside = container.querySelector(
      '[data-testid="select-outside-click"]',
    ) as HTMLButtonElement | null
    expect(trigger).not.toBeNull()
    expect(outside).not.toBeNull()

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
    })

    const contentId = trigger?.getAttribute('aria-controls') ?? ''
    expect(document.getElementById(contentId)).not.toBeNull()

    await act(async () => {
      outside?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
    })

    expect(document.getElementById(contentId)).toBeNull()
  })
})

describe('keyboard machine fidelity', () => {
  it('select highlights enabled options in order and clears highlight on escape', () => {
    const svc = interpret(selectMachine, {
      optionOrder: ['alpha', 'beta', 'gamma', 'delta'],
      disabledValues: ['beta'],
    }).start()

    svc.send({ type: 'OPEN_FIRST' })
    expect(svc.getSnapshot().context.highlightedValue).toBe('alpha')

    svc.send({ type: 'HIGHLIGHT_NEXT' })
    expect(svc.getSnapshot().context.highlightedValue).toBe('gamma')

    svc.send({ type: 'HIGHLIGHT_PREV' })
    expect(svc.getSnapshot().context.highlightedValue).toBe('alpha')

    svc.send({ type: 'HIGHLIGHT_LAST' })
    expect(svc.getSnapshot().context.highlightedValue).toBe('delta')

    svc.send({ type: 'HIGHLIGHT_FIRST' })
    expect(svc.getSnapshot().context.highlightedValue).toBe('alpha')

    svc.send({ type: 'ESCAPE' })
    expect(svc.getSnapshot().value).toBe('closed')
    expect(svc.getSnapshot().context.highlightedValue).toBeNull()
    svc.stop()
  })

  it('select chooses highlighted values without closing multiselect', () => {
    const single = interpret(selectMachine, {
      optionOrder: ['alpha', 'beta', 'gamma'],
      disabledValues: ['beta'],
    }).start()

    single.send({ type: 'OPEN_FIRST' })
    single.send({ type: 'HIGHLIGHT_NEXT' })
    single.send({ type: 'SELECT_HIGHLIGHTED' })
    expect(single.getSnapshot().value).toBe('closed')
    expect(single.getSnapshot().context.value).toBe('gamma')
    single.stop()

    const multi = interpret(selectMachine, {
      multiple: true,
      value: [],
      optionOrder: ['alpha', 'beta', 'gamma'],
      disabledValues: ['beta'],
    }).start()

    multi.send({ type: 'OPEN_FIRST' })
    multi.send({ type: 'HIGHLIGHT_NEXT' })
    multi.send({ type: 'SELECT_HIGHLIGHTED' })
    expect(multi.getSnapshot().value).toBe('open')
    expect(multi.getSnapshot().context.value).toEqual(['gamma'])

    multi.send({ type: 'SELECT_HIGHLIGHTED' })
    expect(multi.getSnapshot().value).toBe('open')
    expect(multi.getSnapshot().context.value).toEqual([])
    multi.stop()
  })
})
