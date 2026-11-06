import { act, StrictMode, useRef, useState, type MouseEventHandler } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { composeHandlers } from '../adapters/react/merge-props'
import {
  useControllableState,
  type ControllableStateOptions,
} from '../adapters/react/use-controllable-state'
import { useFormReset } from '../adapters/react/use-form-reset'
import { expectDevError, mount, type View } from './harness'
import { describeControlled } from './harness/controlled'

type Options = Partial<ControllableStateOptions<unknown>>
type Proposal = ((current: unknown) => unknown) | string | number | string[]
let api: ReturnType<typeof useControllableState<unknown>>
let renders = 0

function Probe(options: Options) {
  api = useControllableState<unknown>({
    name: ['Probe', 'value'],
    defaultValue: null,
    value: undefined,
    ...options,
  })
  renders += 1
  return <output>{JSON.stringify(api[0])}</output>
}

/** A parent that accepts every proposal. */
function Parent({
  initial,
  onChange,
}: {
  initial: unknown
  onChange: (value: unknown) => void
}) {
  const [value, setValue] = useState(initial)
  return (
    <Probe
      value={value}
      onChange={(next) => {
        onChange(next)
        setValue(next)
      }}
    />
  )
}

describe('useControllableState', () => {
  let view: View
  beforeEach(() => {
    view = mount()
    renders = 0
  })
  const render = (options: Options) =>
    act(async () => view.root.render(<Probe {...options} />))
  const shown = () => JSON.parse(view.host.querySelector('output')!.textContent!)
  const propose = (...proposals: Proposal[]) =>
    act(async () => proposals.forEach((next) => api[1](next)))
  const replace = (...args: [] | [unknown]) => act(async () => api[2](...args))

  it('uncontrolled: starts from defaultValue and reports each change once', async () => {
    const onChange = vi.fn()
    await render({ defaultValue: 'a', onChange })
    expect(shown()).toBe('a')
    await propose('b')
    expect(shown()).toBe('b')
    await propose('a')
    expect(onChange.mock.calls).toEqual([['b'], ['a']])
  })

  it('reads defaultValue once: a lazy initializer runs on mount only', async () => {
    const initializer = vi.fn(() => 'a')
    await render({ defaultValue: initializer })
    await render({ defaultValue: () => 'b' })
    await render({ defaultValue: 'c' })
    expect(shown()).toBe('a')
    expect(initializer).toHaveBeenCalledTimes(1)
  })

  it('null is a controlled value, not a switch to uncontrolled', async () => {
    const onChange = vi.fn()
    await render({ value: null, defaultValue: 'a', onChange })
    expect(shown()).toBe(null)
    await propose('b')
    expect(shown()).toBe(null)
    expect(onChange.mock.calls).toEqual([['b']])
  })

  it('controlled: a proposal reports without rendering', async () => {
    const onChange = vi.fn()
    await render({ value: 'a', onChange })
    const before = renders
    await propose('b')
    expect(renders).toBe(before)
    expect(shown()).toBe('a')
    expect(onChange.mock.calls).toEqual([['b']])
  })

  it('controlled: value updates from the parent are silent', async () => {
    const onChange = vi.fn()
    await render({ value: 'a', onChange })
    await render({ value: 'b', onChange })
    expect(shown()).toBe('b')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('drops no-op proposals; arrays are compared element by element', async () => {
    const onChange = vi.fn()
    await render({ defaultValue: 'a', onChange })
    const before = renders
    await propose('a', (current) => current)
    expect(renders).toBe(before)
    view = mount()
    await render({ defaultValue: ['a', 'b'], onChange })
    await propose(['a', 'b'], (current) => [...(current as string[])])
    expect(onChange).not.toHaveBeenCalled()
    await propose(['b', 'a'])
    expect(onChange.mock.calls).toEqual([[['b', 'a']]])
  })

  it('a custom equal decides which proposals are no-ops', async () => {
    const onChange = vi.fn()
    const equal = (a: unknown, b: unknown) =>
      String(a).toLowerCase() === String(b).toLowerCase()
    await render({ defaultValue: 'a', onChange, equal })
    await propose('A')
    expect(shown()).toBe('a')
    await propose('b')
    expect(onChange.mock.calls).toEqual([['b']])
  })

  it('arrays reach onChange as fresh copies the consumer may mutate', async () => {
    const onChange = vi.fn((value: unknown) => (value as string[]).push('mutated'))
    await render({ defaultValue: [], onChange })
    const next = ['a']
    await propose(next)
    const [[payload]] = onChange.mock.calls
    expect(payload).not.toBe(next)
    expect(shown()).toEqual(['a'])
    expect(next).toEqual(['a'])
  })

  it('several proposals in one handler chain like state updaters', async () => {
    const onChange = vi.fn()
    await render({ defaultValue: 0, onChange })
    await propose((n) => (n as number) + 1, (n) => (n as number) + 1)
    expect(shown()).toBe(2)
    expect(onChange.mock.calls).toEqual([[1], [2]])
    // A later proposal back to the committed value is still a change from the queued one.
    await propose(3, 2)
    expect(shown()).toBe(2)
    expect(onChange.mock.calls).toEqual([[1], [2], [3], [2]])
  })

  it('several proposals in one handler chain for an accepting parent', async () => {
    const onChange = vi.fn()
    await act(async () => view.root.render(<Parent initial={0} onChange={onChange} />))
    await propose((n) => (n as number) + 1, (n) => (n as number) + 1)
    expect(shown()).toBe(2)
    expect(onChange.mock.calls).toEqual([[1], [2]])
  })

  it('a refused proposal is not the base of the next one', async () => {
    const onChange = vi.fn()
    await render({ value: 0, onChange })
    await propose((n) => (n as number) + 1)
    await propose((n) => (n as number) + 1)
    await propose(0)
    expect(shown()).toBe(0)
    expect(onChange.mock.calls).toEqual([[1], [1]])
  })

  it('StrictMode: an updater proposal reports once in both modes', async () => {
    const uncontrolled = vi.fn()
    const controlled = vi.fn()
    await act(async () =>
      view.root.render(
        <StrictMode>
          <Probe defaultValue={0} onChange={uncontrolled} />
        </StrictMode>,
      ),
    )
    await propose((n) => (n as number) + 1)
    expect(shown()).toBe(1)
    view = mount()
    await act(async () =>
      view.root.render(
        <StrictMode>
          <Parent initial={0} onChange={controlled} />
        </StrictMode>,
      ),
    )
    await propose((n) => (n as number) + 1)
    expect(shown()).toBe(1)
    expect(uncontrolled.mock.calls).toEqual([[1]])
    expect(controlled.mock.calls).toEqual([[1]])
  })

  it('controlled → uncontrolled keeps the last controlled value and reports once', async () => {
    const onChange = vi.fn()
    await render({ value: 'a', defaultValue: 'x', onChange })
    await propose('refused')
    await render({ value: 'b', defaultValue: 'x', onChange })
    await expectDevError(
      () => render({ defaultValue: 'x', onChange }),
      /^Face UI Probe: missing value; keeping the last controlled value\.$/,
    )
    expect(shown()).toBe('b')
    await propose('c')
    expect(shown()).toBe('c')
    // The same switch again is not reported twice.
    await expectDevError(() => render({ value: 'd', onChange }), /"d"; switching/)
    await render({ onChange })
    expect(shown()).toBe('d')
    expect(onChange.mock.calls).toEqual([['refused'], ['c']])
  })

  it('uncontrolled → controlled follows the prop and reports once', async () => {
    const onChange = vi.fn()
    await render({ defaultValue: 'a', onChange })
    await expectDevError(
      () => render({ value: 'b', onChange }),
      /^Face UI Probe: invalid value "b"; switching from uncontrolled to controlled\.$/,
    )
    expect(shown()).toBe('b')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('replaceValue is silent; without an argument it restores the mount default', async () => {
    const onChange = vi.fn()
    await render({ defaultValue: 'a', onChange })
    await render({ defaultValue: 'later', onChange })
    await replace('b')
    expect(shown()).toBe('b')
    await replace()
    expect(shown()).toBe('a')
    // A replaced value is the base of a proposal in the same handler.
    await act(async () => {
      api[2]('c')
      api[1]((current: unknown) => `${current}!`)
    })
    expect(shown()).toBe('c!')
    expect(onChange.mock.calls).toEqual([['c!']])
  })

  it('replaceValue does nothing while controlled', async () => {
    await render({ value: 'a', defaultValue: 'x' })
    const before = renders
    await replace('b')
    expect(renders).toBe(before)
    expect(shown()).toBe('a')
    await expectDevError(() => render({ defaultValue: 'x' }), /missing value/)
    expect(shown()).toBe('a')
  })

  it('setters keep their identity, and call the latest committed onChange', async () => {
    const first = vi.fn()
    const second = vi.fn()
    await render({ defaultValue: 'a', onChange: first })
    const [, setValue, replaceValue] = api
    await render({ defaultValue: 'a', onChange: second })
    expect(api[1]).toBe(setValue)
    expect(api[2]).toBe(replaceValue)
    await propose('b')
    expect(first).not.toHaveBeenCalled()
    expect(second.mock.calls).toEqual([['b']])
  })
})

// A tiny single-choice component: projection at render, consumer-first
// onClick, form reset through replaceValue.
function Choice({
  items = ['a', 'b', 'c'],
  value,
  defaultValue = null,
  onValueChange,
  onClick,
}: {
  items?: readonly string[]
  value?: string | null
  defaultValue?: string | null
  onValueChange?: (details: { value: string | null }) => void
  onClick?: MouseEventHandler<HTMLButtonElement>
}) {
  const [selected, setSelected, replaceSelected] = useControllableState({
    value,
    defaultValue,
    onChange: (value) => onValueChange?.({ value }),
    name: ['Choice', 'value'],
  })
  const input = useRef<HTMLInputElement>(null)
  useFormReset(input, () => replaceSelected())
  const shown = selected !== null && items.includes(selected) ? selected : null
  return (
    <div>
      <input ref={input} type="hidden" name="choice" value={shown ?? ''} />
      {items.map((item) => (
        <button
          key={item}
          type="button"
          aria-pressed={item === shown}
          onClick={composeHandlers(onClick, () => setSelected(item))}
        >
          {item}
        </button>
      ))}
    </div>
  )
}

// A tiny multiple-choice component: array state built with updaters.
function Chips({
  value,
  defaultValue = [],
  onValueChange,
}: {
  value?: readonly string[]
  defaultValue?: readonly string[]
  onValueChange?: (details: { value: string[] }) => void
}) {
  const [selected, setSelected, replaceSelected] = useControllableState({
    value,
    defaultValue,
    onChange: (value) => onValueChange?.({ value: value as string[] }),
    name: ['Chips', 'value'],
  })
  const input = useRef<HTMLInputElement>(null)
  useFormReset(input, () => replaceSelected())
  return (
    <div>
      <input ref={input} type="hidden" name="chips" value={selected.join()} />
      {['a', 'b', 'c'].map((item) => (
        <button
          key={item}
          type="button"
          aria-pressed={selected.includes(item)}
          onClick={() =>
            setSelected((current) =>
              current.includes(item)
                ? current.filter((key) => key !== item)
                : [...current, item],
            )
          }
        >
          {item}
        </button>
      ))}
    </div>
  )
}

const button = (host: HTMLElement, label: string) =>
  Array.from(host.querySelectorAll('button')).find(
    (node) => node.textContent === label,
  )!
const pressed = (host: HTMLElement) =>
  Array.from(host.querySelectorAll('[aria-pressed="true"]'), (node) => node.textContent!)

describeControlled<string | null>({
  name: 'Choice',
  prop: 'value',
  values: ['a', 'b'],
  render: (props) => <Choice {...props} />,
  change: (host, to) => button(host, to!).click(),
  read: (host) => pressed(host)[0] ?? null,
  normalizes: ['missing', null],
  handler: 'onClick',
  formReset: true,
})

describeControlled<string[]>({
  name: 'Chips',
  prop: 'value',
  values: [['a'], ['a', 'b']],
  render: (props) => <Chips {...props} />,
  change: (host) => button(host, 'b').click(),
  read: pressed,
  formReset: true,
})
