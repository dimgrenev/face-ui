import { act, createRef, useState, version, type ComponentProps } from 'react'
import type { Root } from 'react-dom/client'
import { beforeEach, it, expect, vi, describe } from 'vitest'
import { Slider, type SliderCropRange } from '../../Slider/Slider'
import { createRange } from '../runtime/range'
import { expectDevError, formEntries, mount } from './harness'
import { describeControlled } from './harness/controlled'
import { describeField } from './harness/field'
let host: HTMLDivElement, root: Root
beforeEach(() => {
  ;({ host, root } = mount())
})
const render = (props: ComponentProps<typeof Slider> = {}) =>
  act(async () => root.render(<Slider label="Value" {...props} />))
const controlsOf = (container: ParentNode, kind = 'value') =>
  Array.from(
    container.querySelectorAll<HTMLInputElement>(`input[data-kind="${kind}"]`),
  )
const inputs = (kind = 'value') => controlsOf(host, kind)
const values = (kind = 'value') =>
  inputs(kind).map((input) => Number(input.value))
const dispatchKey = (input: HTMLInputElement, key: string, type = 'keydown') => {
  input.focus()
  input.dispatchEvent(
    new KeyboardEvent(type, { key, bubbles: true, cancelable: true }),
  )
}
const key = (key: string, input = inputs()[0], type = 'keydown') =>
  act(async () => dispatchKey(input, key, type))
/** A whole key press: keydown, then keyup, which ends the keyboard edit. */
const press = async (name: string, input = inputs()[0]) => {
  await key(name, input)
  await key(name, input, 'keyup')
}
const form = () => host.querySelector('form')!
const data = () => formEntries(form())
const reset = () =>
  act(async () => {
    form().reset()
    await new Promise((resolve) => setTimeout(resolve, 5))
  })
const pointer = (
  type: string,
  x: number,
  target: EventTarget = host.querySelector('[data-part="track"]')!,
  id = 1,
) =>
  act(async () => {
    const event = new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      button: 0,
      clientX: x,
      clientY: 0,
    })
    Object.defineProperty(event, 'pointerId', { value: id })
    target.dispatchEvent(event)
  })
const track = () =>
  Object.defineProperty(
    host.querySelector('[data-part="track"]'),
    'getBoundingClientRect',
    {
      value: () => ({
        left: 0,
        right: 100,
        top: 0,
        bottom: 100,
        width: 100,
        height: 100,
      }),
      configurable: true,
    },
  )
const assist = (input: HTMLInputElement, value: string) =>
  act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    )!.set!.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await new Promise((resolve) => setTimeout(resolve, 5))
  })
/** Text of the elements an attribute references, as a name is computed from them. */
const referenced = (element: Element, attribute: string) =>
  (element.getAttribute(attribute) ?? '')
    .split(' ')
    .map((id) => document.getElementById(id)?.textContent)
    .join(' ')

describeControlled<number>({
  name: 'Slider',
  prop: 'value',
  values: [0, 100],
  render: (props) => <Slider label="Value" {...props} />,
  change: (host, to) => dispatchKey(controlsOf(host)[0], to ? 'End' : 'Home'),
  read: (host) => Number(controlsOf(host)[0].value),
  normalizes: [150, 100],
  handler: 'onKeyDown',
  formReset: true,
})
describeControlled<number[]>({
  name: 'Slider',
  prop: 'value',
  values: [[0], [100]],
  render: (props) => <Slider label="Value" {...props} />,
  change: (host, [to]) => dispatchKey(controlsOf(host)[0], to ? 'End' : 'Home'),
  read: (host) => controlsOf(host).map((input) => Number(input.value)),
  normalizes: [
    [150, -5],
    [0, 100],
  ],
  handler: 'onKeyDown',
  formReset: true,
})
describeControlled<SliderCropRange>({
  name: 'Slider',
  prop: 'cropRange',
  values: [
    { start: 0, end: 100 },
    { start: 100, end: 100 },
  ],
  render: (props) => <Slider label="Value" crop {...props} />,
  change: (host, { start }) =>
    dispatchKey(controlsOf(host, 'crop')[0], start ? 'End' : 'Home'),
  read: (host) => {
    const [start, end] = controlsOf(host, 'crop').map((input) =>
      Number(input.value),
    )
    return { start, end }
  },
  normalizes: [
    { start: 90, end: 10 },
    { start: 10, end: 90 },
  ],
  handler: 'onKeyDown',
  formReset: true,
})
describeField('Slider', (props) => <Slider {...props} />)

describe('value shape round-trip', () => {
  it('a number value reports numbers from keyboard, pointer and assistive edits', async () => {
    const change = vi.fn(),
      commit = vi.fn()
    await render({ defaultValue: 40, onValueChange: change, onValueCommit: commit })
    await press('ArrowUp')
    track()
    await pointer('pointerdown', 70)
    await pointer('pointerup', 70, document)
    await assist(inputs()[0], '20')
    expect(change.mock.calls).toEqual([
      [{ value: 41 }],
      [{ value: 70 }],
      [{ value: 20 }],
    ])
    expect(commit.mock.calls).toEqual(change.mock.calls)
  })
  it('an array value reports fresh arrays, a one-element array included', async () => {
    const change = vi.fn(),
      commit = vi.fn()
    const value = [50]
    await render({ defaultValue: value, onValueChange: change, onValueCommit: commit })
    await press('ArrowUp')
    expect(change).toHaveBeenCalledExactlyOnceWith({ value: [51] })
    expect(commit).toHaveBeenCalledExactlyOnceWith({ value: [51] })
    expect(change.mock.calls[0][0].value).not.toBe(commit.mock.calls[0][0].value)
    expect(value).toEqual([50])
    await act(async () => root.render(null))
    await render({ defaultValue: [80, 20], onValueChange: change })
    await press('End', inputs()[1])
    expect(change).toHaveBeenLastCalledWith({ value: [20, 100] })
  })
  it('without value or defaultValue the value is min, a number', async () => {
    const change = vi.fn()
    await render({ min: 10, onValueChange: change })
    expect(values()).toEqual([10])
    await press('ArrowUp')
    expect(change).toHaveBeenCalledExactlyOnceWith({ value: 11 })
  })
  it('a controlled value keeps the shape the parent passes', async () => {
    function Parent({ initial }: { initial: number | number[] }) {
      const [value, setValue] = useState(initial)
      return (
        <Slider value={value} onValueChange={(details) => setValue(details.value)} />
      )
    }
    for (const [initial, shown] of [
      [30, 31],
      [[30], [31]],
    ] as const) {
      await act(async () =>
        root.render(
          <Parent key={JSON.stringify(initial)} initial={initial as number} />,
        ),
      )
      await press('ArrowUp')
      expect(values()).toEqual([shown].flat())
    }
  })
})

describe('commit', () => {
  it('fires once when a keyboard edit ends, with the value shown then', async () => {
    const commit = vi.fn()
    await render({ defaultValue: 20, onValueCommit: commit })
    await key('ArrowUp')
    await key('ArrowUp')
    expect(commit).not.toHaveBeenCalled()
    await key('ArrowUp', inputs()[0], 'keyup')
    expect(commit).toHaveBeenCalledExactlyOnceWith({ value: 22 })
    await key('PageUp')
    expect(values()).toEqual([32])
    await act(async () => inputs()[0].blur())
    expect(commit).toHaveBeenLastCalledWith({ value: 32 })
    await key('End')
    expect(values()).toEqual([100])
    await key('Home')
    expect(values()).toEqual([0])
  })
  it('a gesture that ends where it began commits nothing', async () => {
    const commit = vi.fn(),
      cropCommit = vi.fn()
    await render({
      defaultValue: 0,
      crop: true,
      clampToCrop: false,
      onValueCommit: commit,
      onCropRangeCommit: cropCommit,
    })
    await press('Home')
    await press('ArrowDown')
    await key('ArrowUp')
    await key('ArrowDown')
    await key('ArrowDown', inputs()[0], 'keyup')
    await press('Home', inputs('crop')[0])
    await press('End', inputs('crop')[1])
    track()
    await pointer('pointerdown', 0, inputs()[0])
    await pointer('pointerup', 0, document)
    await assist(inputs()[0], '0')
    expect(values()).toEqual([0])
    expect(commit).not.toHaveBeenCalled()
    expect(cropCommit).not.toHaveBeenCalled()
  })
  it('a cancelled key release discards the commit', async () => {
    const commit = vi.fn()
    await render({
      defaultValue: 20,
      onValueCommit: commit,
      onKeyUp: (event) => event.preventDefault(),
    })
    await press('ArrowUp')
    await act(async () => inputs()[0].blur())
    expect(values()).toEqual([21])
    expect(commit).not.toHaveBeenCalled()
  })
})

for (const showValue of [false, true]) {
  it(`keeps root, input, focus and accepted state when membrane/presentation change (${showValue})`, async () => {
    const ref = createRef<HTMLDivElement>()
    await render({
      ref,
      defaultValue: 40,
      showValue,
      id: 'scale',
      dir: 'rtl',
      className: 'custom',
    })
    const node = ref.current,
      input = inputs()[0]
    await key('ArrowUp')
    await render({
      ref,
      showValue: !showValue,
      membrane: false,
      defaultValue: 10,
    })
    expect(ref.current).toBe(node)
    expect(inputs()[0]).toBe(input)
    expect(document.activeElement).toBe(input)
    expect(values()).toEqual([41])
    expect(node?.querySelector('[data-membrane-disabled]')).not.toBeNull()
  })
  it(`native attributes and visible rich name (${showValue})`, async () => {
    const ref = createRef<HTMLDivElement>()
    await render({
      ref,
      showValue,
      id: 'scale',
      dir: 'rtl',
      'aria-describedby': 'hint',
      label: <strong>Font weight</strong>,
    })
    expect(ref.current?.id).toBe('scale')
    expect(ref.current?.dir).toBe('rtl')
    expect(ref.current?.className).toBe('uf-field uf-slider')
    expect(inputs()[0].getAttribute('aria-label')).toBeNull()
    expect(referenced(inputs()[0], 'aria-labelledby')).toBe('Font weight')
    expect(inputs()[0].getAttribute('aria-describedby')).toBe('hint')
  })
  it(`orientation reaches every value and crop control (${showValue})`, async () => {
    for (const orientation of ['horizontal', 'vertical'] as const) {
      await render({ showValue, orientation, crop: true, defaultValue: 40 })
      for (const input of [...inputs(), ...inputs('crop')])
        expect(input.getAttribute('aria-orientation')).toBe(orientation)
    }
  })
  it(`narrowing the scale clamps the shown value silently and widening restores it (${showValue})`, async () => {
    const change = vi.fn()
    await render({ showValue, defaultValue: 80, onValueChange: change })
    await render({ showValue, max: 30, onValueChange: change })
    expect(values()).toEqual([30])
    await render({ showValue, max: 100, onValueChange: change })
    expect(values()).toEqual([80])
    expect(change).not.toHaveBeenCalled()
  })
  it(`controlled refusal and release (${showValue})`, async () => {
    const change = vi.fn(),
      commit = vi.fn()
    await render({
      showValue,
      value: 20,
      onValueChange: change,
      onValueCommit: commit,
    })
    await press('ArrowUp')
    expect(change).toHaveBeenLastCalledWith({ value: 21 })
    expect(values()).toEqual([20])
    expect(commit).not.toHaveBeenCalled()
    await render({ showValue, value: 50, onValueChange: change })
    await expectDevError(
      () => render({ showValue, onValueChange: change }),
      /Face UI Slider: missing value; keeping the last controlled value/,
    )
    expect(values()).toEqual([50])
    expect(change).toHaveBeenCalledTimes(1)
  })
  it(`sorted immutable values share keyboard constraints (${showValue})`, async () => {
    const value = Object.freeze([80, 20]),
      change = vi.fn()
    await render({ showValue, defaultValue: value, onValueChange: change })
    await key('ArrowUp')
    expect(values()).toEqual([21, 80])
    expect(value).toEqual([80, 20])
    await key('End')
    expect(values()).toEqual([80, 80])
    expect(inputs()[1].min).toBe('80')
    await key('ArrowDown', inputs()[1])
    expect(values()).toEqual([80, 80])
    expect(change).toHaveBeenCalledTimes(2)
  })
  it(`crop has its own state and works in every presentation (${showValue})`, async () => {
    await render({
      showValue,
      crop: true,
      clampToCrop: false,
      defaultValue: 10,
      defaultCropRange: { start: 80, end: 20 },
    })
    expect(values()).toEqual([10])
    expect(values('crop')).toEqual([20, 80])
    await key('ArrowUp', inputs('crop')[0])
    expect(values('crop')).toEqual([21, 80])
    expect(values()).toEqual([10])
  })
}
it('controlled crop refusal leaves the primary state intact', async () => {
  const change = vi.fn(),
    cropChange = vi.fn(),
    cropCommit = vi.fn()
  await render({
    crop: true,
    cropRange: { start: 20, end: 80 },
    defaultValue: 40,
    onValueChange: change,
    onCropRangeChange: cropChange,
    onCropRangeCommit: cropCommit,
  })
  await press('End', inputs('crop')[0])
  expect(values()).toEqual([40])
  expect(values('crop')).toEqual([20, 80])
  expect(change).not.toHaveBeenCalled()
  expect(cropCommit).not.toHaveBeenCalled()
  expect(cropChange).toHaveBeenCalledWith({ cropRange: { start: 80, end: 80 } })
})
it('a value-dependent measured width settles without scheduling unchanged layout state', async () => {
  const getStyle = window.getComputedStyle.bind(window)
  const measure = vi
    .spyOn(window, 'getComputedStyle')
    .mockImplementation((node) => {
      const style = getStyle(node)
      if (node.matches('.uf-membrane')) {
        const input = node.querySelector('input')
        style.width = `${input ? Number(input.value) : 0}px`
        style.height = '24px'
      }
      return style
    })
  try {
    await render({ showValue: true, defaultValue: 40 })
    await key('ArrowUp')
    expect(values()).toEqual([41])
    expect(
      host
        .querySelector<HTMLElement>('[data-scope="slider"][data-part="root"]')!
        .style.getPropertyValue('--uf-slider-thumb-inline'),
    ).toBe('41px')
  } finally {
    measure.mockRestore()
  }
})
it('callback payload mutation cannot change accepted crop or its commit', async () => {
  const commit = vi.fn()
  await render({
    crop: true,
    defaultValue: 40,
    defaultCropRange: { start: 20, end: 80 },
    onCropRangeChange: ({ cropRange }) => {
      cropRange.start = 90
    },
    onCropRangeCommit: commit,
  })
  await press('ArrowUp', inputs('crop')[0])
  expect(values('crop')).toEqual([21, 80])
  expect(values()).toEqual([40])
  expect(commit).toHaveBeenCalledExactlyOnceWith({
    cropRange: { start: 21, end: 80 },
  })
})
it('accepted crop clamps the shown value quietly and widening shows the kept value again', async () => {
  const change = vi.fn(),
    cropCommit = vi.fn()
  await render({
    crop: true,
    defaultValue: 40,
    defaultCropRange: { start: 20, end: 80 },
    onValueChange: change,
    onCropRangeCommit: cropCommit,
  })
  await press('End', inputs('crop')[0])
  expect(values()).toEqual([80])
  expect(change).not.toHaveBeenCalled()
  expect(cropCommit).toHaveBeenCalledWith({ cropRange: { start: 80, end: 80 } })
  await press('Home', inputs('crop')[0])
  expect(values()).toEqual([40])
  // An edit starts from what the thumb shows, not from the kept value.
  await assist(inputs('crop')[0], '60')
  expect(values()).toEqual([60])
  await press('ArrowUp')
  expect(change).toHaveBeenCalledExactlyOnceWith({ value: 61 })
})
it('external crop updates and controlled releases retain the accepted selection', async () => {
  const change = vi.fn()
  await render({
    crop: true,
    cropRange: { start: 10, end: 90 },
    onCropRangeChange: change,
  })
  await render({
    crop: true,
    cropRange: { start: 30, end: 60 },
    onCropRangeChange: change,
  })
  await expectDevError(
    () => render({ crop: true, onCropRangeChange: change }),
    /Face UI Slider: missing cropRange; keeping the last controlled value/,
  )
  expect(values('crop')).toEqual([30, 60])
  expect(change).not.toHaveBeenCalled()
})
it('the default crop follows the scale until the user edits it', async () => {
  await render({ crop: true, max: 50 })
  expect(values('crop')).toEqual([0, 50])
  await render({ crop: true, max: 200 })
  expect(values('crop')).toEqual([0, 200])
})
it('native forms repeat ordered values and crop under their own keys', async () => {
  await act(async () =>
    root.render(
      <form>
        <Slider
          name="price"
          cropName="clip"
          defaultValue={[80, 20]}
          crop
          defaultCropRange={{ start: 10, end: 90 }}
        />
      </form>,
    ),
  )
  expect(data()).toEqual([
    ['price', '20'],
    ['price', '80'],
    ['clip', '10'],
    ['clip', '90'],
  ])
})
it('unnamed and disabled controls do not contribute to forms', async () => {
  await act(async () =>
    root.render(
      <form>
        <Slider defaultValue={5} />
        <Slider name="disabled" disabled />
        <fieldset disabled>
          <Slider name="nested" crop cropName="clip" />
        </fieldset>
      </form>,
    ),
  )
  expect(data()).toEqual([])
  await key('ArrowUp', inputs()[2])
  expect(values()[2]).toBe(0)
})
it('external form and native reset restore initial state silently under current constraints', async () => {
  const change = vi.fn(),
    cropChange = vi.fn()
  const view = (max = 100) =>
    act(async () =>
      root.render(
        <>
          <Slider
            form="edit"
            name="level"
            defaultValue={40}
            crop
            defaultCropRange={{ start: 10, end: 80 }}
            max={max}
            onValueChange={change}
            onCropRangeChange={cropChange}
          />
          <form id="edit" />
        </>,
      ),
    )
  await view()
  await key('ArrowUp')
  await key('ArrowUp', inputs('crop')[0])
  await view(30)
  await reset()
  expect(values()).toEqual([30])
  expect(values('crop')).toEqual([10, 30])
  expect(change).toHaveBeenCalledTimes(1)
  expect(cropChange).toHaveBeenCalledTimes(1)
  expect(data()).toEqual([['level', '30']])
})
it('cancelled reset and controlled reset preserve accepted values', async () => {
  await act(async () =>
    root.render(
      <form onReset={(e) => e.preventDefault()}>
        <Slider defaultValue={40} />
      </form>,
    ),
  )
  await key('ArrowUp')
  await reset()
  expect(values()).toEqual([41])
  await act(async () =>
    root.render(
      <form key="controlled">
        <Slider defaultValue={10} value={50} />
      </form>,
    ),
  )
  await reset()
  expect(values()).toEqual([50])
})
it('formatValue governs visible numbers and accessible units for each kind', async () => {
  await render({
    showValue: true,
    value: [20, 80],
    crop: true,
    formatValue: ({ value, kind }) => `${kind}: ${value}%`,
  })
  expect(host.querySelector('.uf-slider__number')?.textContent).toBe(
    'value: 20%',
  )
  expect(inputs()[0].getAttribute('aria-valuetext')).toBe('value: 20%')
  expect(inputs('crop')[0].getAttribute('aria-valuetext')).toBe('crop: 0%')
})
it('individual labels override group naming while external ids win over the visible label', async () => {
  await render({
    value: [20, 80],
    'aria-label': 'Override',
    'aria-labelledby': 'external',
    labels: {
      thumbs: ['Lowest price', 'Highest price'],
      cropStart: 'Начало',
      cropEnd: 'Конец',
    },
    crop: true,
  })
  expect(inputs()[0].getAttribute('aria-label')).toBe('Lowest price')
  expect(inputs()[0].getAttribute('aria-labelledby')).toBeNull()
  expect(
    host.querySelector('[role="group"]')?.getAttribute('aria-labelledby'),
  ).toBe('external')
  expect(
    inputs('crop').map((input) => input.getAttribute('aria-label')),
  ).toEqual(['Начало', 'Конец'])
})
it('each control is named after the group plus its own part, and carries the field description and error', async () => {
  await render({
    label: 'Price',
    description: 'Per month',
    error: 'Too wide',
    required: true,
    value: [20, 80],
    crop: true,
  })
  const group = host.querySelector('[role="group"]')!
  expect(referenced(group, 'aria-labelledby')).toBe('Price*')
  expect(
    [...inputs(), ...inputs('crop')].map((input) =>
      referenced(input, 'aria-labelledby'),
    ),
  ).toEqual(['Price 1', 'Price 2', 'Price Crop start', 'Price Crop end'])
  for (const input of [...inputs(), ...inputs('crop')]) {
    expect(referenced(input, 'aria-describedby')).toBe('Per month Too wide')
    expect(input.getAttribute('aria-invalid')).toBe('true')
  }
  expect(group.hasAttribute('aria-invalid')).toBe(false)
  await render({ 'aria-label': 'Price', label: '', value: [20, 80] })
  expect(inputs().map((input) => input.getAttribute('aria-label'))).toEqual([
    'Price 1',
    'Price 2',
  ])
})
it('keyboard cancellation and disabled controls block proposals', async () => {
  const change = vi.fn()
  await render({ onValueChange: change, onKeyDown: (e) => e.preventDefault() })
  await key('ArrowUp')
  expect(change).not.toHaveBeenCalled()
  await render({ onValueChange: change, disabled: true })
  await key('ArrowUp')
  expect(change).not.toHaveBeenCalled()
})
it('arrow keys follow the text direction on a horizontal track only', async () => {
  const change = vi.fn()
  for (const orientation of ['horizontal', 'vertical'] as const) {
    await act(async () =>
      root.render(
        <Slider
          key={orientation}
          dir="rtl"
          orientation={orientation}
          defaultValue={50}
          onValueChange={change}
        />,
      ),
    )
    await press('ArrowRight')
    await press('ArrowLeft')
  }
  expect(change.mock.calls).toEqual([
    [{ value: 49 }],
    [{ value: 50 }],
    [{ value: 51 }],
    [{ value: 50 }],
  ])
})
it('pointer track edit, thumb grab offset, pointer id and completion use one model', async () => {
  const change = vi.fn(),
    commit = vi.fn()
  await render({
    defaultValue: 40,
    onValueChange: change,
    onValueCommit: commit,
  })
  track()
  await pointer('pointerdown', 60)
  expect(values()).toEqual([60])
  await pointer('pointermove', 80, document, 2)
  expect(values()).toEqual([60])
  await pointer('pointermove', 70, document)
  await pointer('pointerup', 70, document)
  expect(values()).toEqual([70])
  expect(commit).toHaveBeenLastCalledWith({ value: 70 })
  await pointer('pointerdown', 75, inputs()[0])
  expect(values()).toEqual([70])
  await pointer('pointermove', 85, document)
  expect(values()).toEqual([80])
  await pointer('pointercancel', 85, document)
  expect(commit).toHaveBeenCalledTimes(1)
})
it('pointer cancellation, disable and unmount remove document listeners', async () => {
  const change = vi.fn(),
    commit = vi.fn()
  await render({ onValueChange: change, onValueCommit: commit })
  track()
  await pointer('pointerdown', 10)
  await pointer('pointercancel', 10, document)
  await pointer('pointermove', 20, document)
  expect(values()).toEqual([10])
  expect(commit).not.toHaveBeenCalled()
  await pointer('pointerdown', 15)
  await render({ disabled: true, onValueChange: change })
  await pointer('pointermove', 50, document)
  expect(values()).toEqual([15])
  await render({ onValueChange: change })
  track()
  await pointer('pointerdown', 20)
  await act(async () => root.render(null))
  const count = change.mock.calls.length
  await pointer('pointermove', 80, document)
  expect(change).toHaveBeenCalledTimes(count)
})
it('equal thumbs remain independently editable from track ties', async () => {
  await render({ defaultValue: [40, 40] })
  track()
  await pointer('pointerdown', 60)
  expect(values()).toEqual([40, 60])
  await pointer('pointerup', 60, document)
  await pointer('pointerdown', 20)
  expect(values()).toEqual([20, 60])
})
it('native change proposals support assistive input and controlled refusal', async () => {
  const change = vi.fn(),
    commit = vi.fn()
  await render({ value: 40, onValueChange: change, onValueCommit: commit })
  await assist(inputs()[0], '60')
  expect(change).toHaveBeenCalledWith({ value: 60 })
  expect(values()).toEqual([40])
  expect(commit).not.toHaveBeenCalled()
})
it('parent can accept proposals without duplicate callbacks', async () => {
  const change = vi.fn(),
    commit = vi.fn()
  function Controlled() {
    const [value, setValue] = useState(40)
    return (
      <Slider
        value={value}
        onValueChange={(next) => {
          change(next)
          setValue(next.value)
        }}
        onValueCommit={commit}
      />
    )
  }
  await act(async () => root.render(<Controlled />))
  await press('ArrowUp')
  expect(values()).toEqual([41])
  expect(change).toHaveBeenCalledTimes(1)
  expect(commit).toHaveBeenCalledWith({ value: 41 })
})
it('autofocus runs only on mount and removed focused handles recover focus', async () => {
  await render({ value: [20, 80], autoFocus: true })
  expect(document.activeElement).toBe(inputs()[0])
  expect(inputs()[0].hasAttribute('data-autofocus')).toBe(true)
  inputs()[1].focus()
  await render({ value: [20, 80], autoFocus: true })
  expect(document.activeElement).toBe(inputs()[1])
  await render({ value: 20 })
  expect(document.activeElement).toBe(inputs()[0])
})
it.skipIf(!version.startsWith('19.'))(
  'React 19 callback ref cleanup is forwarded',
  async () => {
    const cleanup = vi.fn(),
      ref = vi.fn(() => cleanup)
    await render({ ref })
    await act(async () => root.render(null))
    expect(cleanup).toHaveBeenCalledTimes(1)
  },
)
for (const [props, message, shown] of [
  [{ value: [] }, /invalid value array; using \[0\]/, [0]],
  [{ value: [20, 'bad', 80] }, /invalid value array; using \[20, 80\]/, [20, 80]],
  [{ value: NaN }, /invalid value NaN; using 0/, [0]],
  [{ value: Infinity }, /invalid value Infinity; using 0/, [0]],
  [{ value: null }, /invalid value null; using 0/, [0]],
  [{ defaultValue: 'x' }, /invalid defaultValue "x"; using 0/, [0]],
] as const)
  it(`normalizes and reports malformed value ${JSON.stringify(props)}`, async () => {
    await expectDevError(() => render(props as never), message)
    expect(values()).toEqual(shown)
  })
it('a malformed value still takes user edits, in the shape it was passed', async () => {
  const change = vi.fn()
  await expectDevError(
    () => render({ value: [] as number[], onValueChange: change }),
    /invalid value array/,
  )
  await press('ArrowUp')
  expect(change).toHaveBeenCalledExactlyOnceWith({ value: [1] })
})
it('missing or blank control names and blank formatted text fall back without a report', async () => {
  await render({
    value: [20, 80],
    crop: true,
    orientation: 'diagonal' as never,
    labels: { thumbs: [], cropStart: '', cropEnd: '  ' },
    formatValue: () => '',
    showValue: true,
  })
  expect(
    [...inputs(), ...inputs('crop')].map((input) =>
      referenced(input, 'aria-labelledby'),
    ),
  ).toEqual(['Value 1', 'Value 2', 'Value Crop start', 'Value Crop end'])
  expect(host.querySelector('.uf-slider__number')?.textContent).toBe('20')
  expect(inputs()[0].getAttribute('aria-orientation')).toBe('horizontal')
  await act(async () => root.render(null))
  await expectDevError(
    () => render({ formatValue: (() => null) as never, showValue: true }),
    /Face UI Slider: invalid formatValue null; ignoring it/,
  )
  expect(host.querySelector('.uf-slider__number')?.textContent).toBe('0')
})
it('crop boundaries that are missing read as the scale; non-finite ones are reported', async () => {
  await render({ crop: true, cropRange: null as never })
  expect(values('crop')).toEqual([0, 100])
  await expectDevError(
    () => render({ crop: true, cropRange: { start: NaN, end: 10 } }),
    /Face UI Slider: invalid cropRange\.start NaN; using 0/,
  )
  expect(values('crop')).toEqual([0, 10])
})
for (const [props, message, bounds] of [
  [{ min: NaN }, /invalid min NaN; using 0\.\.100/, ['0', '100', '1']],
  [{ min: 10, max: 0 }, /invalid max 0; using 0\.\.100/, ['0', '100', '1']],
  [{ step: 0 }, /invalid step 0; using 1/, ['0', '100', '1']],
  [{ step: -1 }, /invalid step -1; using 1/, ['0', '100', '1']],
  [{ step: Infinity }, /invalid step Infinity; using 1/, ['0', '100', '1']],
  [{ min: 5, max: 5 }, null, ['5', '5', '1']],
] as const)
  it(`renders the normalized range for ${JSON.stringify(props)}`, async () => {
    const run = () => render({ crop: true, ...props })
    await (message
      ? expectDevError(run, new RegExp(`Face UI Slider: ${message.source}`))
      : run())
    for (const input of [...inputs(), ...inputs('crop')])
      expect([input.min, input.max, input.step]).toEqual(bounds)
    expect(values()).toEqual([Number(bounds[0])])
    expect(values('crop')).toEqual([Number(bounds[0]), Number(bounds[1])])
  })
it('decimal keyboard steps preserve small increments at large offsets', async () => {
  await render({ min: 1e14, max: 1e14 + 100, value: 1e14 + 20 })
  expect(values()).toEqual([1e14 + 20])
  const grid = createRange(1e14, 1e14 + 100, 0.1)
  expect(grid.move(1e14 + 20, 1)).toBe(1e14 + 20.1)
})
it('renders a step below float resolution as given and reports it', async () => {
  await expectDevError(
    () => render({ min: 1e14, max: 1e14 + 100, step: 0.001, value: 1e14 + 20 }),
    /Face UI Slider: invalid step 0\.001; keeping it/,
  )
  expect(values()).toEqual([1e14 + 20])
  expect(inputs()[0].step).toBe('0.001')
})

describe('component smoke', () => {
  it('Slider edits an ordered native range with crop independently of presentation', async () => {
    const change = vi.fn()
    await act(async () =>
      root.render(
        <Slider label="Range" defaultValue={[80, 20]} crop onValueChange={change} />,
      ),
    )
    expect(values()).toEqual([20, 80])
    expect(inputs('crop')).toHaveLength(2)
    await key('ArrowRight')
    expect(change).toHaveBeenCalledWith({ value: [21, 80] })
    expect(inputs()[0].value).toBe('21')
  })
})
