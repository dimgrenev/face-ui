import React, { act, createRef, Fragment, StrictMode, useState } from 'react'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Switcher } from '../../Switcher/Switcher'
import { installMatchMedia, type MatchMediaRestore } from './harness/match-media'
import { mount } from './harness'
let host: HTMLDivElement, root: Root
const control = () => host.querySelector<HTMLInputElement>('input')!
const render = (props: Record<string, unknown> = {}) =>
  act(async () => root.render(<Switcher {...props} />))
beforeEach(() => {
  ;({ host, root } = mount())
})

describe('Switcher prop contract', () => {
  it('ref exposes the native switch without detaching on parent updates', async () => {
    const ref = vi.fn()
    await render({ ref, label: 'Setting' })
    expect(ref.mock.calls[0][0]).toBe(control())
    ref.mockClear()
    await render({ ref, label: 'Renamed', checked: true })
    expect(ref).not.toHaveBeenCalled()
  })
  it.skipIf(!React.version.startsWith('19.'))(
    'supports callback ref cleanup in StrictMode',
    async () => {
      const active = new Set<HTMLInputElement>(),
        cleanup = vi.fn()
      const ref = (node: HTMLInputElement | null) => {
        expect(node?.tagName).toBe('INPUT')
        if (node) active.add(node)
        return () => {
          if (node) active.delete(node)
          cleanup()
        }
      }
      await act(async () =>
        root.render(
          <StrictMode>
            <Switcher {...({ ref } as any)} />
          </StrictMode>,
        ),
      )
      expect(active.size).toBe(1)
      await act(async () =>
        root.render(
          <StrictMode>
            <Switcher {...({ ref: createRef<HTMLInputElement>() } as any)} />
          </StrictMode>,
        ),
      )
      expect(active.size).toBe(0)
      expect(cleanup).toHaveBeenCalled()
    },
  )
  it('routes field attributes to input and visual attributes to the whole field', async () => {
    await render({
      id: 'updates',
      name: 'setting',
      value: 'yes',
      form: 'settings',
      tabIndex: -1,
      title: 'Help',
      lang: 'ar',
      dir: 'rtl',
      hidden: true,
      style: { width: 180 },
      className: 'custom',
      'data-trace': 'field',
      'aria-describedby': 'help',
    })
    expect(control().id).toBe('updates')
    expect(control().getAttribute('form')).toBe('settings')
    expect(control().tabIndex).toBe(-1)
    expect(control().getAttribute('data-trace')).toBe('field')
    expect(control().getAttribute('aria-describedby')).toBe('help')
    const field = host.querySelector<HTMLElement>('.uf-switcher')!
    expect(field.hidden).toBe(true)
    expect(field.dir).toBe('rtl')
    expect(field.lang).toBe('ar')
    expect(field.title).toBe('Help')
    expect(field.style.width).toBe('180px')
    expect(field.classList.contains('custom')).toBe(true)
  })
  it('keeps explicit accessible names and native label association', async () => {
    await render({ label: 'Visible', 'aria-label': 'Complete setting name' })
    expect(control().getAttribute('aria-label')).toBe('Complete setting name')
    expect(control().hasAttribute('aria-labelledby')).toBe(false)
    expect(control().labels?.[0]?.textContent).toContain('Visible')
  })
  it('does not create empty labels for boolean or empty fragment content', async () => {
    for (const label of [false, true, '', <Fragment />]) {
      await render({ label })
      expect(host.querySelector('[data-part="label"]')).toBeNull()
    }
    await render({ label: 0 })
    expect(host.querySelector('[data-part="label"]')?.textContent).toBe('0')
    await render({ label: <strong>Rich</strong> })
    expect(host.querySelector('[data-part="label"] strong')?.textContent).toBe(
      'Rich',
    )
  })
  it('notifies native and value observers once when a visible label is activated', async () => {
    const onClick = vi.fn(),
      onChange = vi.fn(),
      onCheckedChange = vi.fn()
    await render({ label: 'Setting', onClick, onChange, onCheckedChange })
    await act(async () =>
      host.querySelector<HTMLElement>('[data-part="label"]')!.click(),
    )
    expect(control().checked).toBe(true)
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onCheckedChange).toHaveBeenCalledExactlyOnceWith({ checked: true })
    expect(onChange.mock.calls[0][0].target).toBe(control())
  })
  it('can be controlled by the native onChange handler', async () => {
    function Field() {
      const [checked, setChecked] = useState(false)
      return (
        <Switcher
          {...({
            checked,
            onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
              setChecked(e.currentTarget.checked),
          } as any)}
        />
      )
    }
    await act(async () => root.render(<Field />))
    await act(async () => control().click())
    expect(control().checked).toBe(true)
  })
  it('preserves checked state and suppresses change notifications when a native click is canceled', async () => {
    const onChange = vi.fn(),
      onCheckedChange = vi.fn()
    await render({
      onClick: (e: React.MouseEvent) => e.preventDefault(),
      onChange,
      onCheckedChange,
    })
    await act(async () => control().click())
    expect(control().checked).toBe(false)
    expect(control().getAttribute('aria-checked')).toBe('false')
    expect(onChange).not.toHaveBeenCalled()
    expect(onCheckedChange).not.toHaveBeenCalled()
  })
  it('defaultChecked is initial-only and disabled controlled changes are quiet', async () => {
    const first = vi.fn(),
      second = vi.fn()
    await render({ defaultChecked: true, onCheckedChange: first })
    expect(control().checked).toBe(true)
    await render({ defaultChecked: false, onCheckedChange: second })
    expect(control().checked).toBe(true)
    await render({ checked: false, disabled: true, onCheckedChange: second })
    expect(control().checked).toBe(false)
    expect(first).not.toHaveBeenCalled()
    expect(second).not.toHaveBeenCalled()
    await render({ disabled: false, onCheckedChange: second })
    await act(async () => control().click())
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledExactlyOnceWith({ checked: true })
  })
})

describe('component smoke', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;({ host: container, root } = mount())
  })

  it('Switcher toggles in uncontrolled mode', async () => {
    await act(async () => {
      root.render(
        <Switcher
          label="Dark mode"
          checked={undefined}
          defaultChecked={false}
        />,
      )
    })

    const control = container.querySelector(
      '[role="switch"]',
    ) as HTMLElement | null
    const label = container.querySelector(
      '[data-scope="switcher"][data-part="label"]',
    ) as HTMLElement | null
    const rootNode = container.querySelector(
      '.uf-switcher',
    ) as HTMLElement | null
    expect(control?.getAttribute('aria-checked')).toBe('false')

    await act(async () => {
      control?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(control?.getAttribute('aria-checked')).toBe('true')

    await act(async () => {
      label?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(control?.getAttribute('aria-checked')).toBe('false')

    await act(async () => {
      rootNode?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(control?.getAttribute('aria-checked')).toBe('true')
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

  it('Switcher wires its visible label to toggling and exposes checked disabled required state', async () => {
    await act(async () => {
      root.render(
        <>
          <Switcher
            name="auto-publish"
            label="Auto publish"
            defaultChecked={false}
            required
            membrane={false}
          />
          <Switcher
            name="locked-sync"
            label="Locked sync"
            defaultChecked
            disabled
            required
            membrane={false}
          />
        </>,
      )
    })

    const switchers = Array.from(
      container.querySelectorAll<HTMLElement>('.uf-switcher'),
    )
    const autoPublish =
      switchers.find((node) => node.textContent?.includes('Auto publish')) ??
      null
    const lockedSync =
      switchers.find((node) => node.textContent?.includes('Locked sync')) ??
      null
    const autoLabel = autoPublish as HTMLLabelElement | null
    const autoControl = autoPublish?.querySelector(
      'input[role="switch"]',
    ) as HTMLElement | null
    const autoInput = autoPublish?.querySelector(
      'input[role="switch"]',
    ) as HTMLInputElement | null
    const lockedControl = lockedSync?.querySelector(
      'input[role="switch"]',
    ) as HTMLElement | null
    const lockedInput = lockedSync?.querySelector(
      'input[role="switch"]',
    ) as HTMLInputElement | null
    const autoLabelText = autoLabel?.querySelector(
      '.uf-text[data-part="label"]',
    ) as HTMLElement | null

    expect(autoLabel?.textContent).toContain('Auto publish')
    expect(autoLabelText?.textContent).toContain('Auto publish')
    expect(autoLabelText?.getAttribute('data-inset')).toBe('none')
    expect(autoInput?.labels?.[0]).toBe(autoLabel)
    expect(autoControl?.getAttribute('aria-checked')).toBe('false')
    expect(autoControl?.getAttribute('aria-required')).toBe('true')
    expect(autoInput?.checked).toBe(false)
    expect(autoInput?.required).toBe(true)

    await act(async () => {
      autoLabel?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(autoControl?.getAttribute('aria-checked')).toBe('true')
    expect(autoInput?.checked).toBe(true)
    expect(lockedControl?.getAttribute('aria-checked')).toBe('true')
    expect(lockedControl?.getAttribute('aria-disabled')).toBe('true')
    expect(lockedControl?.getAttribute('aria-required')).toBe('true')
    expect(lockedInput?.checked).toBe(true)
    expect(lockedInput?.disabled).toBe(true)
    expect(lockedInput?.required).toBe(true)
  })
})

describe('controlled form regressions', () => {
  let root: Root
  let container: HTMLDivElement
  beforeEach(() => {
    ;({ host: container, root } = mount())
  })

  it('Switcher accepts controlled updates while disabled without emitting change', async () => {
    const onCheckedChange = vi.fn()
    await act(async () =>
      root.render(
        <StrictMode>
          <Switcher
            checked={false}
            disabled
            label="Choice"
            onCheckedChange={onCheckedChange}
          />
        </StrictMode>,
      ),
    )
    await act(async () =>
      root.render(
        <StrictMode>
          <Switcher
            checked
            disabled
            label="Choice"
            onCheckedChange={onCheckedChange}
          />
        </StrictMode>,
      ),
    )
    expect(
      container.querySelector('[role="switch"]')?.getAttribute('aria-checked'),
    ).toBe('true')
    expect(onCheckedChange).not.toHaveBeenCalled()
    await act(async () =>
      root.render(
        <StrictMode>
          <Switcher checked label="Choice" onCheckedChange={onCheckedChange} />
        </StrictMode>,
      ),
    )
    await act(async () =>
      container.querySelector<HTMLElement>('[role="switch"]')!.click(),
    )
    expect(onCheckedChange).toHaveBeenCalledExactlyOnceWith({ checked: false })
    expect(
      container.querySelector('[role="switch"]')?.getAttribute('aria-checked'),
    ).toBe('true')
  })
})
