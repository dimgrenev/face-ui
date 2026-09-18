// @vitest-environment jsdom
import {
  act,
  createRef,
  Fragment,
  StrictMode,
  useState,
  type ReactNode,
} from 'react'
import { createRoot, hydrateRoot, type Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { Progress, type ProgressProps } from '../../Progress/Progress'
import { Meter } from '../../Meter/Meter'
let host: HTMLDivElement, root: Root
const render = (node: ReactNode) => act(async () => root.render(node))
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})
afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
})
for (const [name, Component, role] of [
  ['Progress', Progress, 'progressbar'],
  ['Meter', Meter, 'meter'],
] as const) {
  const indicator = () => host.querySelector<HTMLElement>(`[role="${role}"]`)!
  it(`${name}: defaults and changing bounds derive one current measurement`, async () => {
    await render(<Component aria-label="Transfer" />)
    expect(indicator().getAttribute('aria-valuenow')).toBe('0')
    expect(indicator().getAttribute('aria-valuemin')).toBe('0')
    expect(indicator().getAttribute('aria-valuemax')).toBe('100')
    await render(<Component value={75} max={50} label="Transfer" showValue />)
    expect(indicator().getAttribute('aria-valuenow')).toBe('50')
    expect(indicator().getAttribute('aria-valuetext')).toBe('100%')
    await render(<Component value={75} max={200} label="Transfer" showValue />)
    expect(indicator().getAttribute('aria-valuenow')).toBe('75')
    expect(indicator().getAttribute('aria-valuetext')).toBe('37%')
  })
  it(`${name}: below-min readings clamp to zero`, async () => {
    await render(<Component value={-1} aria-label="Transfer" />)
    expect(indicator().getAttribute('aria-valuenow')).toBe('0')
    expect(indicator().getAttribute('aria-valuetext')).toBe('0%')
  })
  for (const [caseName, label] of [
    ['false', false],
    ['null', null],
    ['undefined', undefined],
    ['empty string', ''],
    ['whitespace', ' \n '],
    ['empty array', []],
    [
      'nested empty fragment',
      <Fragment>{[false, <Fragment key="f"> </Fragment>]}</Fragment>,
    ],
  ] as const)
    it(`${name}: ${caseName} label cannot suppress native naming or create empty layout`, async () => {
      await render(<Component label={label} aria-label="Transfer" />)
      expect(indicator().getAttribute('aria-label')).toBe('Transfer')
      expect(indicator().hasAttribute('aria-labelledby')).toBe(false)
      expect(host.querySelector('.uf-range-indicator__header')).toBeNull()
    })
  it(`${name}: rich label and zero remain visible, with stable unique names`, async () => {
    await render(
      <>
        <Component label={<strong>Transfer</strong>} />
        <Component label={0} />
      </>,
    )
    const nodes = host.querySelectorAll(`[role="${role}"]`)
    const ids = Array.from(nodes, (n) => n.getAttribute('aria-labelledby'))
    expect(new Set(ids).size).toBe(2)
    expect(document.getElementById(ids[0]!)?.textContent).toBe('Transfer')
    expect(document.getElementById(ids[1]!)?.textContent).toBe('0')
    await render(
      <>
        <Component label="Updated" />
        <Component label={0} />
      </>,
    )
    expect(indicator().getAttribute('aria-labelledby')).toBe(ids[0])
  })
  it(`${name}: native name override and external reference have deliberate precedence`, async () => {
    await render(
      <>
        <span id="external">External</span>
        <Component
          label="Visible"
          aria-label="Explicit"
          aria-labelledby="external"
        />
      </>,
    )
    expect(indicator().getAttribute('aria-labelledby')).toBe('external')
    await render(<Component label="Visible" aria-label="Explicit" />)
    expect(indicator().getAttribute('aria-label')).toBe('Explicit')
    expect(indicator().hasAttribute('aria-labelledby')).toBe(false)
    await render(<Component label="Visible" aria-label="  " />)
    expect(
      document.getElementById(indicator().getAttribute('aria-labelledby')!)
        ?.textContent,
    ).toBe('Visible')
  })
  it(`${name}: showValue only changes visible text and formatValue owns value units`, async () => {
    const formatValue = vi.fn(({ value, max }) => `${value} из ${max} файлов`)
    await render(
      <Component
        value={7}
        max={10}
        label="Transfer"
        formatValue={formatValue}
      />,
    )
    expect(formatValue.mock.calls[0]).toEqual([
      { value: 7, min: 0, max: 10, percent: 70 },
    ])
    expect(indicator().getAttribute('aria-valuetext')).toBe('7 из 10 файлов')
    expect(host.textContent).toBe('Transfer')
    await render(
      <Component
        value={7}
        max={10}
        label="Transfer"
        showValue
        formatValue={formatValue}
        aria-valuetext="Seven of ten"
      />,
    )
    expect(host.textContent).toBe('Transfer7 из 10 файлов')
    expect(indicator().getAttribute('aria-valuetext')).toBe('Seven of ten')
    expect(
      host
        .querySelector('.uf-range-indicator__value')
        ?.getAttribute('aria-hidden'),
    ).toBe('true')
  })
  it(`${name}: native attributes, ref and handlers belong to semantic root`, async () => {
    const ref = createRef<HTMLDivElement>(),
      onClick = vi.fn()
    await render(
      <Component
        ref={ref}
        id="native"
        title="Details"
        dir="rtl"
        lang="ru"
        className="custom"
        style={{ opacity: 0.7 }}
        data-owner="test"
        tabIndex={0}
        onClick={onClick}
        aria-describedby="description"
      />,
    )
    expect(ref.current).toBe(indicator())
    expect(indicator().id).toBe('native')
    expect(indicator().classList.contains('custom')).toBe(true)
    expect(indicator().style.opacity).toBe('0.7')
    expect(indicator().getAttribute('dir')).toBe('rtl')
    expect(indicator().getAttribute('lang')).toBe('ru')
    expect(indicator().getAttribute('title')).toBe('Details')
    expect(indicator().dataset.owner).toBe('test')
    expect(indicator().getAttribute('aria-describedby')).toBe('description')
    await act(async () => indicator().click())
    expect(onClick).toHaveBeenCalledTimes(1)
  })
  it(`${name}: membrane toggle preserves root, label and caller-owned state`, async () => {
    let mounts = 0
    function LocalLabel() {
      const [identity] = useState(() => ++mounts)
      return <span data-local-label>Label {identity}</span>
    }
    const label = <LocalLabel />
    await render(<Component label={label} />)
    const node = indicator(),
      local = host.querySelector('[data-local-label]')!
    expect(
      host.querySelectorAll('.uf-membrane:not([data-membrane-disabled])'),
    ).toHaveLength(1)
    await render(<Component label={label} membrane={false} />)
    expect(indicator()).toBe(node)
    expect(host.querySelector('[data-local-label]')).toBe(local)
    expect(mounts).toBe(1)
    expect(
      host.querySelectorAll('.uf-membrane:not([data-membrane-disabled])'),
    ).toHaveLength(0)
  })
  it(`${name}: fractional progress never rounds a nearly complete value to completion`, async () => {
    await render(<Component value={99.99} showValue aria-label="Transfer" />)
    expect(indicator().getAttribute('aria-valuenow')).toBe('99.99')
    expect(host.textContent).toBe('99%')
    expect(indicator().dataset.state).not.toMatch(/complete|full/)
  })
  for (const props of [
    { value: NaN },
    { value: Infinity },
    { max: 0 },
    { max: -1 },
    { max: Infinity },
  ])
    it(`${name}: invalid numeric input ${JSON.stringify(props)} is rejected instead of inventing a measurement`, () => {
      expect(() => renderToString(<Component {...props} />)).toThrow(RangeError)
    })
  for (const props of [
    { tone: 'unknown' },
    { shape: 'unknown' },
    { formatValue: false },
    { formatValue: () => '' },
    { formatValue: () => '  ' },
    { formatValue: () => 2 },
  ])
    it(`${name}: invalid presentation input ${String(Object.keys(props))} fails at boundary`, () => {
      expect(() =>
        renderToString(<Component {...(props as ProgressProps)} />),
      ).toThrow()
    })
}
it('Progress unknown state hides numeric text, skips formatting, and returns to the latest known value', async () => {
  const formatValue = vi.fn(({ value }) => String(value))
  await render(
    <Progress
      value={65}
      showValue
      label="Import"
      indeterminate
      formatValue={formatValue}
    />,
  )
  const node = host.querySelector('[role="progressbar"]')!
  expect(node.hasAttribute('aria-valuenow')).toBe(false)
  expect(node.hasAttribute('aria-valuetext')).toBe(false)
  expect(host.textContent).toBe('Import')
  expect(formatValue).not.toHaveBeenCalled()
  await render(
    <Progress value={70} showValue label="Import" formatValue={formatValue} />,
  )
  expect(node.getAttribute('aria-valuenow')).toBe('70')
  expect(host.textContent).toBe('Import70')
})
it('Meter supports nonzero and negative ranges, including opposite finite extremes', async () => {
  for (const props of [
    { min: -20, max: 20, value: 0 },
    { min: 100, max: 200, value: 150 },
    { min: -Number.MAX_VALUE, max: Number.MAX_VALUE, value: 0 },
  ]) {
    await render(<Meter {...props} label="Reading" showValue />)
    expect(
      host.querySelector('[role="meter"]')?.getAttribute('aria-valuemin'),
    ).toBe(String(props.min))
    expect(host.textContent).toBe('Reading50%')
  }
})
for (const props of [
  { min: 10, max: 10 },
  { min: 20, max: 10 },
  { min: NaN },
  { min: -Infinity },
])
  it(`Meter rejects invalid min ${JSON.stringify(props)}`, () => {
    expect(() => renderToString(<Meter {...props} />)).toThrow(RangeError)
  })
it('Progress and Meter keep IDs and server markup during StrictMode hydration', async () => {
  await act(async () => root.unmount())
  const tree = (
    <StrictMode>
      <Progress label="Import" value={25} />
      <Meter label="Quota" value={50} />
    </StrictMode>
  )
  host.innerHTML = renderToString(tree)
  const before = host.innerHTML,
    errors: unknown[] = []
  await act(async () => {
    root = hydrateRoot(host, tree, {
      onRecoverableError: (error) => errors.push(error),
    })
  })
  expect(errors).toEqual([])
  expect(host.innerHTML).toBe(before)
})

it('integer percentages survive floating-point multiplication without displaying one less', async () => {
  for (let value = 0; value <= 100; value++) {
    await render(<Progress value={value} showValue aria-label="Import" />)
    expect(host.textContent).toBe(`${value}%`)
  }
})
