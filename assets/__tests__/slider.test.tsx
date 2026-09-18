import { act, createRef, useState, version, type ComponentProps } from 'react'
import type { Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { beforeEach, it, expect, vi, describe } from 'vitest'
import { Slider } from '../../Slider/Slider'
import { createRange } from '../runtime/range'
import { formEntries, mount } from './harness'
let host: HTMLDivElement, root: Root
beforeEach(() => {
  ;({ host, root } = mount())
})
const render = (props: ComponentProps<typeof Slider> = {}) =>
  act(async () => root.render(<Slider label="Value" {...props} />))
const inputs = (kind = 'value') =>
  Array.from(
    host.querySelectorAll<HTMLInputElement>(`input[data-kind="${kind}"]`),
  )
const values = (kind = 'value') =>
  inputs(kind).map((input) => Number(input.value))
const key = (key: string, input = inputs()[0], type = 'keydown') =>
  act(async () => {
    input.focus()
    input.dispatchEvent(
      new KeyboardEvent(type, { key, bubbles: true, cancelable: true }),
    )
  })
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
    expect(inputs()[0].getAttribute('aria-label')).toBeNull()
    expect(
      document.getElementById(inputs()[0].getAttribute('aria-labelledby')!)
        ?.textContent,
    ).toBe('Font weight')
    expect(inputs()[0].getAttribute('aria-describedby')).toBe('hint')
  })
  it(`orientation reaches every value and crop control (${showValue})`, async () => {
    for (const orientation of ['horizontal', 'vertical'] as const) {
      await render({ showValue, orientation, crop: true, defaultValue: 40 })
      for (const input of [...inputs(), ...inputs('crop')])
        expect(input.getAttribute('aria-orientation')).toBe(orientation)
    }
  })
  it(`uncontrolled values remain normalized after shrink/expand (${showValue})`, async () => {
    const change = vi.fn()
    await render({ showValue, defaultValue: 80, onValueChange: change })
    await render({ showValue, max: 30, onValueChange: change })
    await render({ showValue, max: 100, onValueChange: change })
    expect(values()).toEqual([30])
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
    await key('ArrowUp')
    await key('ArrowUp', inputs()[0], 'keyup')
    expect(change).toHaveBeenLastCalledWith({ value: [21] })
    expect(values()).toEqual([20])
    expect(commit).not.toHaveBeenCalled()
    await render({ showValue, value: 50, onValueChange: change })
    await render({ showValue, onValueChange: change })
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
      defaultCropRange: { min: 80, max: 20 },
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
    cropRange: { min: 20, max: 80 },
    defaultValue: 40,
    onValueChange: change,
    onCropChange: cropChange,
    onCropCommit: cropCommit,
  })
  await key('End', inputs('crop')[0])
  await key('End', inputs('crop')[0], 'keyup')
  expect(values()).toEqual([40])
  expect(values('crop')).toEqual([20, 80])
  expect(change).not.toHaveBeenCalled()
  expect(cropCommit).not.toHaveBeenCalled()
  expect(cropChange).toHaveBeenCalledWith({ min: 80, max: 80 })
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
    defaultCropRange: { min: 20, max: 80 },
    onCropChange: (range) => {
      range.min = 90
    },
    onCropCommit: commit,
  })
  await key('ArrowUp', inputs('crop')[0])
  await key('ArrowUp', inputs('crop')[0], 'keyup')
  expect(values('crop')).toEqual([21, 80])
  expect(values()).toEqual([40])
  expect(commit).toHaveBeenCalledExactlyOnceWith({ min: 21, max: 80 })
})
it('accepted crop clamps quietly and expansion does not resurrect primary values', async () => {
  const change = vi.fn(),
    cropCommit = vi.fn()
  await render({
    crop: true,
    defaultValue: 40,
    defaultCropRange: { min: 20, max: 80 },
    onValueChange: change,
    onCropCommit: cropCommit,
  })
  await key('End', inputs('crop')[0])
  await key('End', inputs('crop')[0], 'keyup')
  expect(values()).toEqual([80])
  expect(change).not.toHaveBeenCalled()
  expect(cropCommit).toHaveBeenCalledWith({ min: 80, max: 80 })
  await key('Home', inputs('crop')[0])
  expect(values()).toEqual([80])
})
it('external crop updates and controlled releases retain the accepted selection', async () => {
  const change = vi.fn()
  await render({
    crop: true,
    cropRange: { min: 10, max: 90 },
    onCropChange: change,
  })
  await render({
    crop: true,
    cropRange: { min: 30, max: 60 },
    onCropChange: change,
  })
  await render({ crop: true, onCropChange: change })
  expect(values('crop')).toEqual([30, 60])
  expect(change).not.toHaveBeenCalled()
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
          defaultCropRange={{ min: 10, max: 90 }}
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
            defaultCropRange={{ min: 10, max: 80 }}
            max={max}
            onValueChange={change}
            onCropChange={cropChange}
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
      <form>
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
it('keyboard edit commits once on keyup, including repeated steps and Page/Home/End', async () => {
  const commit = vi.fn()
  await render({ defaultValue: 20, onValueCommit: commit })
  await key('ArrowUp')
  await key('ArrowUp')
  expect(commit).not.toHaveBeenCalled()
  await key('ArrowUp', inputs()[0], 'keyup')
  expect(commit).toHaveBeenLastCalledWith({ value: [22] })
  await key('PageUp')
  expect(values()).toEqual([32])
  await key('End')
  expect(values()).toEqual([100])
  await key('Home')
  expect(values()).toEqual([0])
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
  expect(commit).toHaveBeenLastCalledWith({ value: [70] })
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
  await act(async () => {
    const input = inputs()[0]
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    )!.set!.call(input, '60')
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await new Promise((resolve) => setTimeout(resolve, 5))
  })
  expect(change).toHaveBeenCalledWith({ value: [60] })
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
          setValue(next.value[0])
        }}
        onValueCommit={commit}
      />
    )
  }
  await act(async () => root.render(<Controlled />))
  await key('ArrowUp')
  await key('ArrowUp', inputs()[0], 'keyup')
  expect(values()).toEqual([41])
  expect(change).toHaveBeenCalledTimes(1)
  expect(commit).toHaveBeenCalledWith({ value: [41] })
})
it('autofocus runs only on mount and removed focused handles recover focus', async () => {
  await render({ value: [20, 80], autoFocus: true })
  expect(document.activeElement).toBe(inputs()[0])
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
for (const props of [
  { value: [] },
  { value: [20, 'bad', 80] },
  { value: NaN },
  { value: Infinity },
  { min: NaN },
  { min: 10, max: 0 },
  { step: 0 },
  { step: -1 },
  { step: Infinity },
  { cropRange: { min: NaN, max: 10 } },
  { labels: { thumbs: [] } },
  { crop: true, labels: { cropStart: '' } },
  { formatValue: () => '' },
])
  it(`rejects malformed data ${JSON.stringify(props)}`, () => {
    expect(() => renderToString(<Slider {...(props as any)} />)).toThrow()
  })
for (const [min, max, step, input, expected] of [
  [0, 1, 0.1, 0.3, 0.3],
  [-0.5, 0.5, 0.1, 0.3, 0.3],
  [1e14, 1e14 + 100, 1, 1e14 + 20, 1e14 + 20],
  [0, 1, 0.6, 1, 0.6],
  [0.1, 1, 0.2, 0.4, 0.5],
  [-1e308, 1e308, 1e307, 0, 0],
  [0, 1e-300, 1e-301, 3e-301, 3e-301],
  [42, 42, 1, 100, 42],
])
  it(`decimal grid ${min}..${max}/${step} normalizes ${input}`, () => {
    const grid = createRange(min, max, step)
    expect(grid.snap(input)).toBe(expected)
    expect(grid.snap(grid.snap(input))).toBe(expected)
    expect(Number.isFinite(grid.ratio(expected))).toBe(true)
  })
it('decimal keyboard steps preserve small increments at large offsets', async () => {
  await render({ min: 1e14, max: 1e14 + 100, value: 1e14 + 20 })
  expect(values()).toEqual([1e14 + 20])
  const grid = createRange(1e14, 1e14 + 100, 0.1)
  expect(grid.move(1e14 + 20, 1)).toBe(1e14 + 20.1)
})
it('rejects increments too small to affect JavaScript values', () => {
  expect(() => createRange(1e14, 1e14 + 100, 0.001)).toThrow(/representable/)
})

it('rejects explicit null instead of silently replacing supplied state', () => {
  for (const key of ['value', 'defaultValue', 'cropRange', 'defaultCropRange'])
    expect(() =>
      renderToString(<Slider {...({ [key]: null } as any)} />),
    ).toThrow()
})

describe('component smoke', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;({ host: container, root } = mount())
  })

  it('Slider edits an ordered native range with crop independently of presentation', async () => {
    const change = vi.fn()
    await act(async () => root.render(<Slider label="Range" defaultValue={[80, 20]} crop onValueChange={change} />))
    const inputs = container.querySelectorAll<HTMLInputElement>('[data-kind="value"]')
    expect(Array.from(inputs, input => input.value)).toEqual(['20', '80'])
    expect(container.querySelectorAll('[data-kind="crop"]')).toHaveLength(2)
    await act(async () => inputs[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })))
    expect(change).toHaveBeenCalledWith({ value: [21, 80] })
    expect(inputs[0].value).toBe('21')
  })
})
