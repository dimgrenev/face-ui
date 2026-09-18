import React, { act, Fragment, StrictMode } from 'react'
import type { Root } from 'react-dom/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Date as DateField } from '../../Date/Date'
import { mount } from './harness'

let root: Root, host: HTMLDivElement
const trigger = () =>
  host.querySelector<HTMLButtonElement>('[role="combobox"]')!
const dialog = () =>
  document.querySelector<HTMLElement>('[role="dialog"]:not([hidden])')
const render = (props: Record<string, unknown>) =>
  act(async () => root.render(<DateField {...props} />))
const click = (node: Element) =>
  act(async () =>
    node.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true }),
    ),
  )
const key = (node: Element, key: string, extra = {}) =>
  act(async () =>
    node.dispatchEvent(
      new KeyboardEvent('keydown', {
        key,
        bubbles: true,
        cancelable: true,
        ...extra,
      }),
    ),
  )
beforeEach(() => {
  ;({ host, root } = mount())
})

describe('Date native field and layer contract', () => {
  it('does not mount a rich field label a second time inside the dialog title', async () => {
    await render({
      defaultOpen: true,
      label: <span id="field-copy">Delivery</span>,
    })
    expect(document.querySelectorAll('#field-copy')).toHaveLength(1)
    expect(dialog()?.getAttribute('aria-labelledby')?.split(' ')).toContain(
      host.querySelector('label')!.id,
    )
  })
  it('exposes a stable native button ref across value and membrane changes', async () => {
    const ref = vi.fn()
    await render({ ref })
    expect(ref.mock.calls[0][0]).toBe(trigger())
    ref.mockClear()
    await render({ ref, value: '2026-09-12', membrane: false })
    expect(ref).not.toHaveBeenCalled()
  })
  it.skipIf(!React.version.startsWith('19.'))(
    'honors callback-ref cleanup in StrictMode',
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
            <DateField ref={ref as any} />
          </StrictMode>,
        ),
      )
      expect(active.size).toBe(1)
      await act(async () =>
        root.render(
          <StrictMode>
            <DateField />
          </StrictMode>,
        ),
      )
      expect(active.size).toBe(0)
      expect(cleanup).toHaveBeenCalled()
    },
  )
  it('routes native identification/events to the trigger and styles to the whole field', async () => {
    const focus = vi.fn()
    await render({
      id: 'delivery',
      title: 'Choose delivery',
      'aria-label': 'Delivery',
      'data-testid': 'delivery',
      lang: 'ar',
      dir: 'rtl',
      style: { width: 260 },
      className: 'custom',
      tabIndex: -1,
      onFocus: focus,
    })
    expect(trigger().id).toBe('delivery')
    expect(trigger().getAttribute('aria-label')).toBe('Delivery')
    expect(trigger().dataset.testid).toBe('delivery')
    expect(trigger().tabIndex).toBe(-1)
    const field = host.querySelector<HTMLElement>('.uf-date')!
    expect(field.style.width).toBe('260px')
    expect(field.dir).toBe('rtl')
    expect(field.lang).toBe('ar')
    expect(field.classList.contains('custom')).toBe(true)
    await act(async () => trigger().focus())
    expect(focus).toHaveBeenCalledTimes(1)
  })
  it('lets native click and keydown handlers cancel opening', async () => {
    const onClick = vi.fn((event) => event.preventDefault()),
      onKeyDown = vi.fn((event) => event.preventDefault())
    await render({ onClick, onKeyDown })
    await click(trigger())
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(dialog()).toBeNull()
    await key(trigger(), 'ArrowDown')
    expect(onKeyDown).toHaveBeenCalledTimes(1)
    expect(dialog()).toBeNull()
  })
  it('reserves Enter/Space activation for native click and ignores modified/composing ArrowDown', async () => {
    await render({})
    for (const name of ['Enter', ' ']) {
      await key(trigger(), name)
      expect(dialog()).toBeNull()
    }
    for (const extra of [
      { ctrlKey: true },
      { altKey: true },
      { metaKey: true },
      { isComposing: true },
    ]) {
      await key(trigger(), 'ArrowDown', extra)
      expect(dialog()).toBeNull()
    }
    await key(trigger(), 'ArrowDown')
    expect(dialog()).not.toBeNull()
  })
  it('keeps controlled open changes quiet and respects parent refusal in both directions', async () => {
    const change = vi.fn(),
      props = { defaultValue: '2026-09-12', onOpenChange: change }
    await render({ ...props, open: false })
    await click(trigger())
    expect(change).toHaveBeenCalledExactlyOnceWith({ open: true })
    expect(dialog()).toBeNull()
    await render({ ...props, open: true })
    expect(dialog()).not.toBeNull()
    expect(change).toHaveBeenCalledTimes(1)
    const day = dialog()!.querySelector<HTMLElement>(
      '[data-date="2026-09-12"]',
    )!
    await act(async () => day.focus())
    await key(day, 'Escape')
    expect(change).toHaveBeenLastCalledWith({ open: false })
    expect(dialog()).not.toBeNull()
    expect(document.activeElement).toBe(day)
    await render({ ...props, open: false })
    expect(dialog()).toBeNull()
    expect(change).toHaveBeenCalledTimes(2)
  })
  it('uses defaultOpen once and does not call the change observer on mount', async () => {
    const change = vi.fn()
    await render({ defaultOpen: true, onOpenChange: change })
    expect(dialog()).not.toBeNull()
    expect(change).not.toHaveBeenCalled()
    await key(dialog()!, 'Escape')
    await render({ defaultOpen: true, onOpenChange: change })
    expect(dialog()).toBeNull()
    expect(change).toHaveBeenCalledExactlyOnceWith({ open: false })
  })
  it.each(['disabled', 'readOnly', 'hidden'])(
    '%s suppresses even controlled opening quietly',
    async (prop) => {
      const change = vi.fn()
      await render({ open: true, [prop]: true, onOpenChange: change })
      expect(dialog()).toBeNull()
      expect(change).not.toHaveBeenCalled()
      if (prop === 'readOnly') {
        expect(trigger().disabled).toBe(false)
        expect(trigger().getAttribute('aria-readonly')).toBe('true')
      }
    },
  )
  it('does not create empty label/help/error slots and keeps zero content', async () => {
    for (const empty of [false, true, '', <Fragment />]) {
      await render({ label: empty, description: empty, error: empty })
      expect(host.querySelector('.uf-date__label')).toBeNull()
      expect(host.querySelector('.uf-date__description')).toBeNull()
      expect(host.querySelector('.uf-date__error')).toBeNull()
      expect(trigger().getAttribute('aria-labelledby')).toBeNull()
      expect(trigger().getAttribute('aria-invalid')).toBeNull()
    }
    await render({ label: 0, description: 0, error: 0 })
    expect(host.querySelector('.uf-date__label')?.textContent).toBe('0')
    expect(host.querySelector('.uf-date__description')?.textContent).toBe('0')
    expect(host.querySelector('.uf-date__error')?.textContent).toBe('0')
    expect(trigger().getAttribute('aria-invalid')).toBe('true')
  })
  it('honors native accessible names and merges description links without duplicate ids', async () => {
    await render({
      label: 'Delivery',
      description: 'Hint',
      error: 'Invalid',
      'aria-label': 'Shipping date',
      'aria-describedby': 'external external',
      'aria-invalid': 'grammar',
    })
    expect(trigger().getAttribute('aria-labelledby')).toBeNull()
    expect(trigger().getAttribute('aria-label')).toBe('Shipping date')
    expect(trigger().getAttribute('aria-invalid')).toBe('grammar')
    const ids = trigger().getAttribute('aria-describedby')!.split(' ')
    expect(ids).toHaveLength(3)
    expect(ids[0]).toBe('external')
    expect(document.getElementById(ids[1])?.textContent).toBe('Hint')
    expect(document.getElementById(ids[2])?.textContent).toBe('Invalid')
  })
  it('hides the required marker from the name and uses a consumer id for label activation', async () => {
    await render({ id: 'delivery-date', label: 'Delivery', required: true })
    expect(host.querySelector('label')?.htmlFor).toBe('delivery-date')
    expect(
      host.querySelector('label [aria-hidden="true"]')?.textContent?.trim(),
    ).toBe('*')
  })
  it('names a dialog from a rich title and localizes the sheet close control', async () => {
    await render({
      defaultOpen: true,
      surface: 'sheet',
      surfaceTitle: <strong>Campaign period</strong>,
      labels: { close: 'Закрыть календарь' },
    })
    const id = dialog()!.getAttribute('aria-labelledby')!
    expect(document.getElementById(id)?.textContent).toBe('Campaign period')
    expect(
      dialog()!.querySelector('button[aria-label="Закрыть календарь"]'),
    ).not.toBeNull()
  })
  it('focuses the selected calendar day on open and closes a repeated selection without value callback', async () => {
    const change = vi.fn(),
      opens = vi.fn()
    await render({
      defaultValue: '2026-09-12',
      onValueChange: change,
      onOpenChange: opens,
    })
    await click(trigger())
    const day = dialog()!.querySelector('[data-date="2026-09-12"]')!
    expect(document.activeElement).toBe(day)
    await click(day)
    expect(dialog()).toBeNull()
    expect(change).not.toHaveBeenCalled()
    expect(opens.mock.calls).toEqual([[{ open: true }], [{ open: false }]])
  })
  it('reflects whole-week availability and selection in the shared Calendar grid', async () => {
    const change = vi.fn()
    await render({
      mode: 'week',
      weekStartsOn: 1,
      defaultValue: { start: '2026-09-14', end: '2026-09-20' },
      disabledDates: ['2026-09-23'],
      closeOnSelect: false,
      onValueChange: change,
    })
    await click(trigger())
    const selected = () =>
      dialog()!.querySelectorAll('[role="gridcell"][aria-selected="true"]')
    expect(selected()).toHaveLength(7)
    expect(
      dialog()!
        .querySelector('[data-date="2026-09-21"]')
        ?.getAttribute('aria-disabled'),
    ).toBe('true')
    await click(dialog()!.querySelector('[data-date="2026-09-08"]')!)
    expect(change).toHaveBeenCalledExactlyOnceWith({
      value: { start: '2026-09-07', end: '2026-09-13' },
    })
    expect(selected()).toHaveLength(7)
  })
  it('a day with no permitted time is unavailable and cannot be activated', async () => {
    const change = vi.fn()
    await render({
      mode: 'datetime',
      defaultValue: '2026-09-12T09:00',
      disabledTime: { hours: Array.from({ length: 24 }, (_, hour) => hour) },
      onValueChange: change,
    })
    await click(trigger())
    const day = dialog()!.querySelector<HTMLElement>('[data-date="2026-09-12"]')!
    expect(day.getAttribute('aria-disabled')).toBe('true')
    await click(day)
    await key(day, 'Enter')
    expect(change).not.toHaveBeenCalled()
  })
  it('handles a native range proxy change as one typed value change', async () => {
    const change = vi.fn()
    await render({
      mode: 'datetime',
      selection: 'range',
      name: 'window',
      defaultValue: { start: '2026-09-12T09:35', end: '2026-09-12T16:45' },
      onValueChange: change,
    })
    const proxy = host.querySelector('select')!
    await act(async () => {
      proxy.append(
        new Option('New interval', '2026-09-13T10:20/2026-09-14T15:40'),
      )
      proxy.value = '2026-09-13T10:20/2026-09-14T15:40'
      proxy.dispatchEvent(new Event('change', { bubbles: true }))
    })
    expect(change).toHaveBeenCalledExactlyOnceWith({
      value: { start: '2026-09-13T10:20', end: '2026-09-14T15:40' },
    })
    expect(proxy.value).toBe('2026-09-13T10:20/2026-09-14T15:40')
  })
  it('closes only on a day selection that closeOnSelect allows, never on a view switch or Now, and reopens', async () => {
    const action = (label: string) =>
      [...dialog()!.querySelectorAll('button')].find(
        (node) => node.textContent === label,
      )!
    const day = (date: string) => dialog()!.querySelector(`[data-date="${date}"]`)!
    await render({ label: 'Deadline', surface: 'popover', defaultValue: '2026-09-11' })
    await click(trigger())
    await click(action('Month'))
    expect(action('Sep')).toBeDefined()
    await click(action('Day'))
    await click(day('2026-09-15'))
    expect(dialog()).toBeNull()
    await click(trigger())
    expect(dialog()).not.toBeNull()
    await act(async () =>
      root.render(
        <DateField
          key="stay-open"
          label="Stay open"
          surface="popover"
          defaultValue="2026-09-11"
          closeOnSelect={false}
        />,
      ),
    )
    await click(trigger())
    await click(day('2026-09-15'))
    expect(dialog()).not.toBeNull()
    await click(action('Now'))
    expect(dialog()).not.toBeNull()
  })
  it('a reverse range closes on completion and reopens with both endpoints selected', async () => {
    await render({
      label: 'Period',
      surface: 'popover',
      selection: 'range',
      defaultValue: { start: '2026-09-11', end: null },
      closeOnSelect: true,
    })
    await click(trigger())
    await click(dialog()!.querySelector('[data-date="2026-09-08"]')!)
    expect(dialog()).toBeNull()
    await click(trigger())
    for (const date of ['2026-09-08', '2026-09-11'])
      expect(
        dialog()!
          .querySelector(`[data-date="${date}"]`)!
          .closest('td')!
          .getAttribute('aria-selected'),
      ).toBe('true')
  })
})
