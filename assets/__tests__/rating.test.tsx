import { act, createRef, Fragment, StrictMode, version, type ReactNode } from 'react'
import type { Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { beforeEach, expect, it, vi, describe } from 'vitest'
import { Rating, type RatingProps } from '../../Rating/Rating'
import { formEntries, hydrate, mount } from './harness'
let host: HTMLDivElement, root: Root
beforeEach(() => {
  ;({ host, root } = mount())
})
const render = (props: RatingProps = {}) =>
  act(async () => root.render(<Rating aria-label="Review" {...props} />))
const renderNode = (node: ReactNode) => act(async () => root.render(node))
const inputs = () =>
  Array.from(host.querySelectorAll<HTMLInputElement>('input[type="radio"]'))
const checked = () =>
  inputs()
    .filter((input) => input.checked)
    .map((input) => Number(input.value))
const click = (score: number) =>
  act(async () =>
    inputs()
      .find((input) => Number(input.value) === score)!
      .click(),
  )
const key = (key: string) =>
  act(async () =>
    document.activeElement?.dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
    ),
  )
const form = () => host.querySelector('form')!
const submitted = () => formEntries(form())
const reset = () =>
  act(async () => {
    form().reset()
    await new Promise((resolve) => setTimeout(resolve, 5))
  })
const fill = () =>
  Array.from(host.querySelectorAll<HTMLElement>('.uf-rating__fill'), (node) =>
    Number(node.style.getPropertyValue('--uf-rating-fill')),
  )

it('unrated default has one entry point, no selection, and five choices', async () => {
  await render()
  expect(inputs()).toHaveLength(5)
  expect(checked()).toEqual([])
  expect(
    inputs()
      .filter((input) => input.tabIndex === 0)
      .map((input) => input.value),
  ).toEqual(['1'])
})
for (const [value, allowHalf, expected] of [
  [-1, false, 0],
  [9, false, 5],
  [2.4, false, 2],
  [2.5, false, 3],
  [2.2, true, 2],
  [2.3, true, 2.5],
] as const)
  it(`normalizes editable ${value}, half ${allowHalf} to ${expected}`, async () => {
    const change = vi.fn()
    await render({ value, allowHalf, onValueChange: change })
    expect(checked()).toEqual(expected ? [expected] : [])
    expect(change).not.toHaveBeenCalled()
  })
it('selection emits once and reselecting does not silently clear a score', async () => {
  const change = vi.fn()
  await render({ defaultValue: 2, onValueChange: change })
  await click(4)
  await click(4)
  expect(checked()).toEqual([4])
  expect(change.mock.calls).toEqual([[{ value: 4 }]])
})
it('controlled refusal preserves selection and FormData while navigation follows focus', async () => {
  const change = vi.fn()
  await renderNode(
    <form>
      <Rating value={2} name="score" onValueChange={change} />
    </form>,
  )
  await act(async () => inputs()[1].focus())
  await key('ArrowRight')
  await key('ArrowRight')
  expect(document.activeElement).toBe(inputs()[3])
  expect(checked()).toEqual([2])
  expect(submitted()).toEqual([['score', '2']])
  expect(change.mock.calls).toEqual([[{ value: 3 }], [{ value: 4 }]])
})
it('external updates are silent and leave focus on surviving choices', async () => {
  const change = vi.fn()
  await render({ value: 2, onValueChange: change })
  await act(async () => inputs()[1].focus())
  await render({ value: 4, onValueChange: change })
  expect(checked()).toEqual([4])
  expect(document.activeElement).toBe(inputs()[1])
  expect(change).not.toHaveBeenCalled()
})
it('uncontrolled initial value is stable across new defaults', async () => {
  await render({ defaultValue: 2 })
  await render({ defaultValue: 4 })
  expect(checked()).toEqual([2])
})
it('uncontrolled shrink commits bounded score instead of resurrecting removed values', async () => {
  const change = vi.fn()
  await render({ defaultValue: 8, max: 10, onValueChange: change })
  await render({ max: 3, onValueChange: change })
  await render({ max: 10, onValueChange: change })
  expect(checked()).toEqual([3])
  expect(change).not.toHaveBeenCalled()
})
it('removing a focused half choice recovers focus without a change notification', async () => {
  const change = vi.fn()
  await render({ defaultValue: 2.5, allowHalf: true, onValueChange: change })
  inputs()[4].focus()
  await render({ allowHalf: false, onValueChange: change })
  expect(checked()).toEqual([3])
  expect(document.activeElement).toBe(inputs()[2])
  expect(change).not.toHaveBeenCalled()
})
it('whole/half conversion does not bring back a discarded half value', async () => {
  await render({ defaultValue: 2.5, allowHalf: true })
  await render({ allowHalf: false })
  await render({ allowHalf: true })
  expect(checked()).toEqual([3])
})
it('keyboard wraps and Home/End select real first/last options', async () => {
  await render({ allowHalf: true })
  inputs()[0].focus()
  await key('ArrowLeft')
  expect(checked()).toEqual([5])
  await key('ArrowRight')
  expect(checked()).toEqual([0.5])
  await key('End')
  expect(checked()).toEqual([5])
  await key('Home')
  expect(checked()).toEqual([0.5])
})
it('consumer key cancellation retains the selected choice and focus', async () => {
  await render({
    defaultValue: 2,
    onKeyDown: (event) => event.preventDefault(),
  })
  inputs()[1].focus()
  await key('ArrowRight')
  expect(checked()).toEqual([2])
  expect(document.activeElement).toBe(inputs()[1])
})
for (const phase of ['onClick', 'onClickCapture'] as const)
  it(`${phase} cancellation prevents a proposed change`, async () => {
    const change = vi.fn()
    await render({
      defaultValue: 2,
      onValueChange: change,
      [phase]: (event: { preventDefault(): void }) => event.preventDefault(),
    })
    await click(3)
    expect(change).not.toHaveBeenCalled()
    expect(checked()).toEqual([2])
  })
for (const label of [
  false,
  null,
  undefined,
  '',
  '  ',
  [],
  <Fragment>{[false, ' ', <Fragment key="a" />]}</Fragment>,
])
  it(`empty label ${String(label)} preserves native name and omits empty layout`, async () => {
    await render({ label })
    const node = host.querySelector('[role="radiogroup"]')!
    expect(node.getAttribute('aria-label')).toBe('Review')
    expect(node.hasAttribute('aria-labelledby')).toBe(false)
    expect(host.querySelector('[data-part="label"]')).toBeNull()
  })
it('visible/rich/zero labels get stable unique names, native overrides take precedence', async () => {
  await renderNode(
    <>
      <Rating label={<strong>Quality</strong>} />
      <Rating label={0} />
    </>,
  )
  const groups = host.querySelectorAll('[role="radiogroup"]')
  const ids = Array.from(
    groups,
    (node) => node.getAttribute('aria-labelledby')!,
  )
  expect(new Set(ids).size).toBe(2)
  expect(ids.map((id) => document.getElementById(id)?.textContent)).toEqual([
    'Quality',
    '0',
  ])
  await render({
    label: 'Quality',
    'aria-label': 'Native',
    'aria-labelledby': 'external',
  })
  expect(
    host.querySelector('[role="radiogroup"]')?.getAttribute('aria-labelledby'),
  ).toBe('external')
})
it('root identity, style, description, direction and ref forward without detach on updates', async () => {
  const ref = vi.fn()
  await render({
    id: 'score',
    ref,
    dir: 'rtl',
    'aria-describedby': 'help',
    className: 'custom',
    style: { width: 200 },
  } as RatingProps)
  const node = ref.mock.calls[0][0] as HTMLDivElement
  await render({
    id: 'score',
    ref,
    dir: 'rtl',
    'aria-describedby': 'help',
    className: 'custom',
    style: { width: 200 },
    value: 4,
  } as RatingProps)
  expect(ref).toHaveBeenCalledTimes(1)
  expect(node.id).toBe('score')
  expect(node.dir).toBe('rtl')
  expect(node.style.width).toBe('200px')
  expect(node.classList.contains('custom')).toBe(true)
  expect(node.getAttribute('aria-describedby')).toBe('help')
})
it.skipIf(!version.startsWith('19'))(
  'React19 callback ref cleanup runs exactly once',
  async () => {
    const cleanup = vi.fn()
    const ref = vi.fn(() => cleanup)
    await renderNode(<Rating ref={ref} />)
    await renderNode(null)
    expect(ref).toHaveBeenCalledTimes(1)
    expect(cleanup).toHaveBeenCalledTimes(1)
  },
)
it('membrane toggling retains root, inputs, focus and current selection', async () => {
  const ref = createRef<HTMLDivElement>()
  await renderNode(<Rating ref={ref} defaultValue={2} />)
  const node = ref.current,
    control = inputs()[1]
  control.focus()
  await renderNode(<Rating ref={ref} membrane={false} />)
  expect(ref.current).toBe(node)
  expect(inputs()[1]).toBe(control)
  expect(document.activeElement).toBe(control)
  expect(checked()).toEqual([2])
  expect(host.querySelectorAll('[data-membrane-interactive]')).toHaveLength(0)
})
it('autofocus runs on mount, never steals focus on later mode changes', async () => {
  await render({ defaultValue: 2, autoFocus: true })
  expect(document.activeElement).toBe(inputs()[1])
  const elsewhere = document.createElement('button')
  document.body.append(elsewhere)
  elsewhere.focus()
  await render({ autoFocus: true, allowHalf: true })
  expect(document.activeElement).toBe(elsewhere)
  elsewhere.remove()
})
it('readonly averages retain exact precision with no radios or tab stops', async () => {
  const change = vi.fn()
  await render({ value: 4.2, readOnly: true, onValueChange: change })
  const meter = host.querySelector('[role="meter"]')!
  expect(meter.getAttribute('aria-valuenow')).toBe('4.2')
  expect(meter.getAttribute('aria-valuemax')).toBe('5')
  expect(inputs()).toHaveLength(0)
  expect(fill().slice(0, 4)).toEqual([1, 1, 1, 1])
  expect(fill()[4]).toBeCloseTo(0.2)
  expect(host.querySelector('[tabindex="0"]')).toBeNull()
  expect(change).not.toHaveBeenCalled()
})
it('readonly allowHalf changes no precision, tab order or star geometry', async () => {
  await render({ readOnly: true, value: 2.3 })
  const fills = fill()
  await render({ readOnly: true, value: 2.3, allowHalf: true })
  expect(fill()).toEqual(fills)
  expect(inputs()).toHaveLength(0)
  expect(host.querySelector('[data-half]')).toBeNull()
})
it('formatter localizes every option and the readonly score', async () => {
  const formatValue = vi.fn(({ value, max }) => `${value} из ${max}`)
  await render({ allowHalf: true, formatValue })
  expect(inputs()[0].getAttribute('aria-label')).toBe('0.5 из 5')
  expect(inputs()[9].getAttribute('aria-label')).toBe('5 из 5')
  formatValue.mockClear()
  await render({ value: 4.2, readOnly: true, formatValue })
  expect(
    host.querySelector('[role="meter"]')?.getAttribute('aria-valuetext'),
  ).toBe('4.2 из 5')
  expect(formatValue.mock.calls.length).toBeGreaterThan(0)
  expect(
    formatValue.mock.calls.every(
      ([details]) => details.value === 4.2 && details.max === 5,
    ),
  ).toBe(true)
})
it('named native rating submits one score and validates unrated required state', async () => {
  await renderNode(
    <form>
      <Rating name="score" required />
    </form>,
  )
  expect(submitted()).toEqual([])
  expect(form().checkValidity()).toBe(false)
  await click(3)
  expect(submitted()).toEqual([['score', '3']])
  expect(form().checkValidity()).toBe(true)
})
it('separate native groups preserve independent selections', async () => {
  await renderNode(
    <form>
      <Rating name="a" defaultValue={2} />
      <Rating name="b" defaultValue={4} />
    </form>,
  )
  expect(submitted()).toEqual([
    ['a', '2'],
    ['b', '4'],
  ])
})
it('unnamed choice stays out of FormData', async () => {
  await renderNode(
    <form>
      <Rating defaultValue={2} />
    </form>,
  )
  expect(submitted()).toEqual([])
})
it('disabled native rating retains selection, prevents editing and leaves submission', async () => {
  const change = vi.fn()
  await renderNode(
    <form>
      <Rating
        defaultValue={2}
        name="score"
        disabled
        required
        onValueChange={change}
      />
    </form>,
  )
  await click(4)
  expect(checked()).toEqual([2])
  expect(submitted()).toEqual([])
  expect(form().checkValidity()).toBe(true)
  expect(change).not.toHaveBeenCalled()
})
it('disabled fieldset prevents editing and native submission', async () => {
  const change = vi.fn()
  await renderNode(
    <form>
      <fieldset disabled>
        <Rating defaultValue={2} name="score" required onValueChange={change} />
      </fieldset>
    </form>,
  )
  await click(4)
  expect(checked()).toEqual([2])
  expect(submitted()).toEqual([])
  expect(change).not.toHaveBeenCalled()
})
it('readonly is submitted precisely but exempt from required validation', async () => {
  await renderNode(
    <form>
      <Rating readOnly name="score" required value={4.2} />
    </form>,
  )
  expect(submitted()).toEqual([['score', '4.2']])
  expect(form().checkValidity()).toBe(true)
  await renderNode(
    <form>
      <Rating readOnly name="score" required value={0} />
    </form>,
  )
  expect(submitted()).toEqual([])
  expect(form().checkValidity()).toBe(true)
  await renderNode(
    <form>
      <Rating readOnly name="score" value={4.2} disabled />
    </form>,
  )
  expect(submitted()).toEqual([])
})
it('reset restores the original default silently, including after default prop changes', async () => {
  const change = vi.fn()
  await renderNode(
    <form>
      <Rating defaultValue={2} name="score" onValueChange={change} />
    </form>,
  )
  await click(4)
  await renderNode(
    <form>
      <Rating defaultValue={1} name="score" onValueChange={change} />
    </form>,
  )
  change.mockClear()
  await reset()
  expect(checked()).toEqual([2])
  expect(submitted()).toEqual([['score', '2']])
  expect(change).not.toHaveBeenCalled()
})
it('controlled reset preserves parent value even when native default action changes checked inputs', async () => {
  await renderNode(
    <form>
      <Rating value={4} defaultValue={1} name="score" />
    </form>,
  )
  await reset()
  expect(checked()).toEqual([4])
  expect(submitted()).toEqual([['score', '4']])
})
it('canceled reset leaves current value and input checks intact', async () => {
  await renderNode(
    <form onReset={(event) => event.preventDefault()}>
      <Rating defaultValue={2} name="score" />
    </form>,
  )
  await click(4)
  await reset()
  expect(checked()).toEqual([4])
  expect(submitted()).toEqual([['score', '4']])
})
it('external form association supports validation, submission and reset', async () => {
  await renderNode(
    <>
      <Rating form="external" name="score" defaultValue={2} required />
      <form id="external" />
    </>,
  )
  await click(4)
  expect(submitted()).toEqual([['score', '4']])
  await reset()
  expect(submitted()).toEqual([['score', '2']])
})
for (const props of [
  { max: 0 },
  { max: 1.5 },
  { max: 11 },
  { max: Infinity },
  { max: NaN },
  { max: 1e9 },
  { value: NaN },
  { value: Infinity },
  { value: '3' },
  { defaultValue: NaN },
  { required: true },
  { required: true, name: '' },
  { formatValue: 'bad' },
  { formatValue: () => '' },
  { formatValue: () => null },
])
  it(`rejects invalid contract ${JSON.stringify(props)}`, () => {
    expect(() =>
      renderToString(<Rating {...(props as unknown as RatingProps)} />),
    ).toThrow()
  })
it('SSR hydration retains native form state and stable label ids', async () => {
  await act(async () => root.unmount())
  const node = (
    <StrictMode>
      <form>
        <Rating label="Review" defaultValue={2.5} allowHalf name="score" />
      </form>
    </StrictMode>
  )
  const { recoverableErrors } = await hydrate(node, host)
  expect(recoverableErrors).toEqual([])
  expect(checked()).toEqual([2.5])
  expect(submitted()).toEqual([['score', '2.5']])
  await click(4)
  expect(checked()).toEqual([4])
})

it('releasing control continues from the last accepted bounded score', async () => {
  const change = vi.fn()
  await render({ defaultValue: 1, value: 4, onValueChange: change })
  await click(2)
  await render({ onValueChange: change })
  expect(checked()).toEqual([4])
  await click(3)
  expect(checked()).toEqual([3])
  expect(change.mock.calls).toEqual([[{ value: 2 }], [{ value: 3 }]])
})
it('editable/readOnly transitions preserve accepted state with their documented precision', async () => {
  const change = vi.fn()
  await render({ defaultValue: 4.2, readOnly: true, onValueChange: change })
  expect(
    host.querySelector('[role="meter"]')?.getAttribute('aria-valuenow'),
  ).toBe('4.2')
  await render({ onValueChange: change })
  expect(checked()).toEqual([4])
  await render({ readOnly: true, onValueChange: change })
  expect(
    host.querySelector('[role="meter"]')?.getAttribute('aria-valuenow'),
  ).toBe('4')
  expect(change).not.toHaveBeenCalled()
})

describe('component smoke', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;({ host: container, root } = mount())
  })

  it('Rating changes the selected native score in uncontrolled mode', async () => {
    await act(async () => root.render(<Rating defaultValue={2} name="score" />))
    const stars = Array.from(container.querySelectorAll<HTMLInputElement>('.uf-rating input[type="radio"]'))
    expect(stars).toHaveLength(5)
    expect(stars[1].checked).toBe(true)
    await act(async () => stars[3].click())
    expect(stars[3].checked).toBe(true)
    expect(stars.filter(input => input.checked)).toHaveLength(1)
  })
})
