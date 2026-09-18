import React, { act, createRef, StrictMode } from 'react'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Radio } from '../../Radio/Radio'
import contract from '../../Radio/Radio.json'
import { installMatchMedia, type MatchMediaRestore } from './harness/match-media'
import { interpret } from '../create-machine'
import { radioMachine } from '../machines/radio.machine'
import { mount } from './harness'
let root: Root, host: HTMLDivElement
const options = [
  { value: 'a', label: 'Alpha' },
  { value: '', label: 'Empty' },
  { value: 'b', label: 'Beta' },
]
const inputs = () => [
  ...host.querySelectorAll<HTMLInputElement>('input[type="radio"]'),
]
const render = (props: Record<string, unknown> = {}) =>
  act(async () => root.render(<Radio options={options} {...props} />))
const key = (node: Element, key: string) =>
  act(async () => {
    node.dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
    )
  })
beforeEach(() => {
  ;({ host, root } = mount())
})
describe('Radio prop contract', () => {
  it('arrows select and focus an empty string value and can leave it in both directions', async () => {
    const onValueChange = vi.fn()
    await render({ defaultValue: 'a', onValueChange })
    await act(async () => inputs()[0].focus())
    await key(inputs()[0], 'ArrowDown')
    expect(inputs()[1].checked).toBe(true)
    expect(document.activeElement).toBe(inputs()[1])
    await key(inputs()[1], 'ArrowDown')
    expect(inputs()[2].checked).toBe(true)
    expect(document.activeElement).toBe(inputs()[2])
    await key(inputs()[2], 'ArrowUp')
    expect(document.activeElement).toBe(inputs()[1])
    await key(inputs()[1], 'ArrowUp')
    expect(document.activeElement).toBe(inputs()[0])
    expect(onValueChange.mock.calls.map(([details]) => details.value)).toEqual([
      '',
      'b',
      '',
      'a',
    ])
  })
  it('native group attributes and external form association reach their semantic owner', async () => {
    const ref = createRef<HTMLDivElement>(),
      onFocus = vi.fn(),
      onKeyDown = vi.fn()
    await render({
      id: 'choices',
      ref,
      form: 'settings',
      name: 'choice',
      'aria-label': 'Choices',
      'aria-labelledby': 'heading',
      'aria-describedby': 'help',
      title: 'Choose',
      dir: 'rtl',
      style: { width: 320 },
      onFocus,
      onKeyDown,
    })
    expect(ref.current?.id).toBe('choices')
    expect(ref.current?.getAttribute('aria-label')).toBe('Choices')
    expect(ref.current?.getAttribute('aria-labelledby')).toBe('heading')
    expect(ref.current?.getAttribute('aria-describedby')).toBe('help')
    expect(ref.current?.style.width).toBe('320px')
    expect(ref.current?.dir).toBe('rtl')
    for (const input of inputs())
      expect(input.getAttribute('form')).toBe('settings')
    await act(async () => inputs()[0].focus())
    await key(inputs()[0], 'Tab')
    expect(onFocus).toHaveBeenCalledTimes(1)
    expect(onKeyDown).toHaveBeenCalledTimes(1)
  })
  it('unchanged refs stay attached across value and options renders', async () => {
    const ref = vi.fn()
    await render({ ref })
    ref.mockClear()
    await render({ ref, value: 'b', options: [...options] })
    expect(ref).not.toHaveBeenCalled()
  })
  it.skipIf(!React.version.startsWith('19.'))(
    'callback ref cleanup is honored on replacement and unmount in StrictMode',
    async () => {
      const active = new Set<Element>(),
        cleanup = vi.fn()
      const ref = (node: Element | null) => {
        expect(node).not.toBeNull()
        if (!node) return
        active.add(node)
        return () => {
          active.delete(node)
          cleanup()
        }
      }
      await act(async () =>
        root.render(
          <StrictMode>
            <Radio options={options} ref={ref} />
          </StrictMode>,
        ),
      )
      expect(active.size).toBe(1)
      await act(async () =>
        root.render(
          <StrictMode>
            <Radio options={options} ref={createRef<HTMLDivElement>()} />
          </StrictMode>,
        ),
      )
      expect(active.size).toBe(0)
      expect(cleanup).toHaveBeenCalled()
    },
  )
  it('root capture can cancel navigation before a value is changed', async () => {
    const onValueChange = vi.fn()
    await render({
      defaultValue: 'a',
      onValueChange,
      onKeyDownCapture: (event: React.KeyboardEvent) => event.preventDefault(),
    })
    await act(async () => inputs()[0].focus())
    await key(inputs()[0], 'ArrowDown')
    expect(inputs()[0].checked).toBe(true)
    expect(onValueChange).not.toHaveBeenCalled()
  })
  it('root bubble listeners can cancel native keyboard and pointer defaults', async () => {
    const onValueChange = vi.fn()
    await render({
      defaultValue: 'a',
      onValueChange,
      onKeyDown: (event: React.KeyboardEvent) => event.preventDefault(),
      onClick: (event: React.MouseEvent) => event.preventDefault(),
    })
    await act(async () => inputs()[0].focus())
    await key(inputs()[0], 'ArrowDown')
    expect(inputs()[0].checked).toBe(true)
    await act(async () => inputs()[2].click())
    expect(inputs()[0].checked).toBe(true)
    expect(onValueChange).not.toHaveBeenCalled()
  })
  it('visual items and native controls have distinct anatomy', async () => {
    await render()
    expect(host.querySelectorAll('[data-part="item"]')).toHaveLength(
      options.length,
    )
    for (const input of inputs())
      expect(input.getAttribute('data-part')).toBe('input')
  })
  it('autoFocus focuses the selected enabled input instead of the wrapper', async () => {
    await render({ defaultValue: '', autoFocus: true })
    expect(document.activeElement).toBe(inputs()[1])
  })
  it('option id and ARIA support rich or externally described labels', async () => {
    await render({
      options: [
        {
          value: 'a',
          label: <strong>Alpha</strong>,
          id: 'alpha',
          'aria-label': 'Alpha plan',
          'aria-describedby': 'alpha-help',
        },
      ],
    })
    expect(inputs()[0].id).toBe('alpha')
    expect(inputs()[0].getAttribute('aria-label')).toBe('Alpha plan')
    expect(inputs()[0].getAttribute('aria-describedby')).toBe('alpha-help')
  })
  it('defaultValue is initial only; controlled parent updates and replaced callbacks stay silent', async () => {
    const old = vi.fn(),
      next = vi.fn()
    await render({ defaultValue: '', onValueChange: old })
    expect(inputs()[1].checked).toBe(true)
    await act(async () => inputs()[2].click())
    expect(old).toHaveBeenCalledExactlyOnceWith({ value: 'b' })
    await render({ defaultValue: 'a', onValueChange: next })
    expect(inputs()[2].checked).toBe(true)
    await render({ value: null, onValueChange: next })
    expect(inputs().some((input) => input.checked)).toBe(false)
    await render({ value: '', disabled: true, onValueChange: next })
    expect(inputs()[1].checked).toBe(true)
    expect(next).not.toHaveBeenCalled()
  })
  it('JSON does not invent runtime options or a selected default', async () => {
    await act(async () => root.render(<Radio />))
    expect(inputs()).toHaveLength(0)
    expect(contract.props.options).not.toHaveProperty('default')
    expect(contract.props.defaultValue).not.toHaveProperty('default')
  })
})

describe('component smoke', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;({ host: container, root } = mount())
  })

  it('Radio changes selection in uncontrolled mode', async () => {
    await act(async () => {
      root.render(
        <Radio
          name="smoke-radio"
          defaultValue="1"
          options={[
            { value: '1', label: 'Option 1' },
            { value: '2', label: 'Option 2' },
          ]}
        />,
      )
    })

    const optionOne = container.querySelector(
      '[role="radio"][data-value="1"]',
    ) as HTMLElement | null
    const optionTwo = container.querySelector(
      '[role="radio"][data-value="2"]',
    ) as HTMLElement | null

    expect(optionOne?.getAttribute('aria-checked')).toBe('true')
    expect(optionTwo?.getAttribute('aria-checked')).toBe('false')

    await act(async () => {
      optionTwo?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(optionOne?.getAttribute('aria-checked')).toBe('false')
    expect(optionTwo?.getAttribute('aria-checked')).toBe('true')
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

  it('Radio binds visible option labels to native controls and mirrors checked disabled required state', async () => {
    await act(async () => {
      root.render(
        <Radio
          name="notification-frequency"
          defaultValue="daily"
          required
          options={[
            { value: 'daily', label: 'Daily updates' },
            { value: 'never', label: 'Never notify', disabled: true },
          ]}
        />,
      )
    })

    const group = container.querySelector(
      '[role="radiogroup"]',
    ) as HTMLElement | null
    const daily = container.querySelector(
      'label[data-value="daily"]',
    ) as HTMLLabelElement | null
    const never = container.querySelector(
      'label[data-value="never"]',
    ) as HTMLLabelElement | null
    const dailyInput = daily?.querySelector(
      'input[type="radio"]',
    ) as HTMLInputElement | null
    const neverInput = never?.querySelector(
      'input[type="radio"]',
    ) as HTMLInputElement | null

    expect(group?.getAttribute('aria-orientation')).toBe('vertical')
    expect(daily?.textContent).toContain('Daily updates')
    expect(never?.textContent).toContain('Never notify')
    expect(dailyInput?.labels?.[0]).toBe(daily)
    expect(neverInput?.labels?.[0]).toBe(never)
    expect(dailyInput?.getAttribute('aria-checked')).toBe('true')
    expect(dailyInput?.checked).toBe(true)
    expect(dailyInput?.required).toBe(true)
    expect(neverInput?.getAttribute('aria-disabled')).toBe('true')
    expect(neverInput?.disabled).toBe(true)
    expect(neverInput?.required).toBe(true)
  })
})

describe('keyboard machine fidelity', () => {
  it('radio roves focus and selection together', () => {
    const svc = interpret(radioMachine, {
      value: 'a',
      itemOrder: ['a', 'b', 'c'],
      disabledValues: ['b'],
    }).start()

    svc.send({ type: 'FOCUS', value: 'a' })
    svc.send({ type: 'FOCUS_NEXT' })
    expect(svc.getSnapshot().context.focusedValue).toBe('c')
    expect(svc.getSnapshot().context.value).toBe('c')

    svc.send({ type: 'FOCUS_PREV' })
    expect(svc.getSnapshot().context.focusedValue).toBe('a')
    expect(svc.getSnapshot().context.value).toBe('a')
    svc.stop()
  })

  it('radio keeps empty values in navigation and rejects disabled or unknown user choices', () => {
    const chosen: string[] = []
    const svc = interpret(radioMachine, {
      value: 'a',
      itemOrder: ['a', '', 'b'],
      disabledValues: ['b'],
      onValueChange: ({ value }) => chosen.push(value),
    }).start()
    svc.send({ type: 'SELECT', value: 'b' })
    svc.send({ type: 'SELECT', value: 'missing' })
    expect(svc.getSnapshot().context.value).toBe('a')
    svc.send({ type: 'FOCUS', value: 'a' })
    svc.send({ type: 'FOCUS_NEXT' })
    expect(svc.getSnapshot().context.value).toBe('')
    svc.send({ type: 'FOCUS_NEXT' })
    expect(svc.getSnapshot().context.value).toBe('a')
    svc.syncContext({ disabled: true })
    svc.send({ type: 'FOCUS_NEXT' })
    svc.send({ type: 'SELECT', value: '' })
    expect(svc.getSnapshot().context.value).toBe('a')
    expect(chosen).toEqual(['', 'a'])
    svc.stop()
  })
})
