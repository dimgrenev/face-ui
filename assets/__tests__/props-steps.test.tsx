// @vitest-environment jsdom
import { act, createRef, StrictMode, useState, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { Steps, type StepsProps } from '../../Steps/Steps'
let host: HTMLDivElement, root: Root
const items = [
  { label: 'Account', content: 'Account content' },
  { label: 'Profile', content: 'Profile content' },
  { label: 'Review', content: 'Review content' },
]
const renderNode = (node: ReactNode) => act(async () => root.render(node))
const render = (props: StepsProps = {}) =>
  renderNode(<Steps items={items} {...props} />)
const current = () =>
  host.querySelector('[aria-current="step"]')?.getAttribute('data-index')
const click = (index: number) =>
  act(async () => {
    host.querySelectorAll<HTMLButtonElement>('button')[index].click()
  })
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
it('a controlled parent can reject selection without changing the displayed step', async () => {
  const onStepChange = vi.fn()
  await render({ step: 0, onStepChange })
  onStepChange.mockClear()
  await click(1)
  expect(current()).toBe('0')
  expect(onStepChange.mock.calls).toEqual([[{ step: 1 }]])
})
it('external controlled changes update the panel without echoing a user callback', async () => {
  const onStepChange = vi.fn()
  await render({ step: 0, onStepChange })
  onStepChange.mockClear()
  await render({ step: 1, onStepChange })
  expect(current()).toBe('1')
  expect(onStepChange).not.toHaveBeenCalled()
})
it('shrinking the list retains a valid current step and visible panel', async () => {
  await render({ defaultStep: 2 })
  await render({ items: items.slice(0, 2), defaultStep: 2 })
  expect(current()).toBe('1')
  expect(
    host.querySelector('[data-part="content"]:not([hidden])')?.textContent,
  ).toContain('Profile content')
})
it('capture cancellation stops step selection', async () => {
  const onStepChange = vi.fn()
  await act(async () =>
    root.render(
      <div onClickCapture={(e) => e.preventDefault()}>
        <Steps items={items} onStepChange={onStepChange} />
      </div>,
    ),
  )
  onStepChange.mockClear()
  await click(1)
  expect(current()).toBe('0')
  expect(onStepChange).not.toHaveBeenCalled()
})
it('native naming, direction and identity reach the forwarded root', async () => {
  const ref = createRef<HTMLDivElement>()
  await act(async () =>
    root.render(
      <Steps
        ref={ref}
        items={items}
        id="setup"
        dir="rtl"
        aria-label="Настройка"
      />,
    ),
  )
  expect(ref.current?.id).toBe('setup')
  expect(ref.current?.getAttribute('dir')).toBe('rtl')
  expect(ref.current?.getAttribute('aria-label')).toBe('Настройка')
})
it('disabled prevents selection without removing current content', async () => {
  const onStepChange = vi.fn()
  await render({ disabled: true, onStepChange })
  onStepChange.mockClear()
  await click(1)
  expect(
    [...host.querySelectorAll('button')].every((button) => button.disabled),
  ).toBe(true)
  expect(current()).toBe('0')
  expect(onStepChange).not.toHaveBeenCalled()
})
it('linear allows the next step and blocks skipping an unvisited step', async () => {
  await render()
  await click(2)
  expect(current()).toBe('0')
  await click(1)
  expect(current()).toBe('1')
})
it('defaultStep changes after mount do not reset user navigation', async () => {
  await render({ defaultStep: 0 })
  await click(1)
  await render({ defaultStep: 2 })
  expect(current()).toBe('1')
})
it('frozen items are not modified while changing steps', async () => {
  const frozen = Object.freeze(items.map((item) => Object.freeze({ ...item })))
  await render({ items: frozen })
  await click(1)
  expect(frozen).toEqual(items)
})

import { renderToString } from 'react-dom/server'
import { interpret } from '../create-machine'
import { connectSteps, stepsMachine } from '../machines/steps.machine'

it('native class, style, events and ref use the same semantic root', async () => {
  const ref = createRef<HTMLDivElement>(),
    focus = vi.fn(),
    blur = vi.fn(),
    key = vi.fn()
  await renderNode(
    <Steps
      items={items}
      ref={ref}
      className="custom"
      lang="ru"
      title="Title"
      data-custom="value"
      style={{ width: 280 }}
      tabIndex={0}
      onFocusCapture={focus}
      onBlurCapture={blur}
      onKeyDown={key}
    />,
  )
  expect(ref.current?.getAttribute('role')).toBe('group')
  expect(ref.current?.classList.contains('custom')).toBe(true)
  expect(ref.current?.style.width).toBe('280px')
  expect(ref.current?.lang).toBe('ru')
  expect(ref.current?.title).toBe('Title')
  expect(ref.current?.dataset.custom).toBe('value')
  await act(async () => {
    ref.current?.focus()
    ref.current?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'a', bubbles: true }),
    )
    ref.current?.blur()
  })
  expect(focus).toHaveBeenCalledTimes(1)
  expect(blur).toHaveBeenCalledTimes(1)
  expect(key).toHaveBeenCalledTimes(1)
  await renderNode(null)
  expect(ref.current).toBeNull()
})
it('ordered navigation names controls once and connects only existing panels', async () => {
  await render({
    items: [
      { label: 'One', content: 0 },
      { label: <strong>Two</strong> },
      { label: 'Three', content: false },
    ],
  })
  expect(host.querySelector('ol')?.children).toHaveLength(3)
  expect(host.querySelectorAll('ol > li')).toHaveLength(3)
  const controls = host.querySelectorAll('button')
  expect(controls[0].querySelector('[aria-hidden="true"]')?.textContent).toBe(
    '1',
  )
  const panel = host.querySelector('[data-part="content"]')!
  expect(controls[0].getAttribute('aria-controls')).toBe(panel.id)
  expect(panel.getAttribute('aria-labelledby')).toBe(controls[0].id)
  expect(panel.textContent).toBe('0')
  expect(controls[1].hasAttribute('aria-controls')).toBe(false)
  expect(controls[2].hasAttribute('aria-controls')).toBe(false)
  expect(host.querySelectorAll('[data-part="content"]')).toHaveLength(1)
})
it('multiple instances have distinct control and panel ids', async () => {
  await renderNode(
    <>
      <Steps items={items} />
      <Steps items={items} />
    </>,
  )
  const ids = [...host.querySelectorAll('[id]')].map((node) => node.id)
  expect(new Set(ids).size).toBe(ids.length)
})
it('current clicks are quiet and each different user selection emits once under StrictMode', async () => {
  const change = vi.fn()
  await renderNode(
    <StrictMode>
      <Steps items={items} onStepChange={change} />
    </StrictMode>,
  )
  await click(0)
  expect(change).not.toHaveBeenCalled()
  await click(1)
  await click(0)
  expect(change.mock.calls).toEqual([[{ step: 1 }], [{ step: 0 }]])
})
it('controlled parent acceptance updates the visible panel', async () => {
  function Controlled() {
    const [step, set] = useState(0)
    return <Steps items={items} step={step} onStepChange={(v) => set(v.step)} />
  }
  await renderNode(<Controlled />)
  await click(1)
  expect(current()).toBe('1')
})
it('replacing callbacks uses the latest function without emitting on the prop change', async () => {
  const before = vi.fn(),
    after = vi.fn()
  await render({ onStepChange: before })
  await render({ onStepChange: after })
  await click(1)
  expect(before).not.toHaveBeenCalled()
  expect(after.mock.calls).toEqual([[{ step: 1 }]])
})
it('removing the callback leaves navigation functional', async () => {
  const change = vi.fn()
  await render({ onStepChange: change })
  await render()
  await click(1)
  expect(current()).toBe('1')
  expect(change).not.toHaveBeenCalled()
})
it('controlled selection overrides defaultStep and can be released without resetting', async () => {
  await render({ step: 1, defaultStep: 2 })
  expect(current()).toBe('1')
  await render({ defaultStep: 2 })
  await click(0)
  expect(current()).toBe('0')
})
it('linear guards are based on the current position, not alleged completion', async () => {
  await render({ defaultStep: 2 })
  await click(0)
  await click(2)
  expect(current()).toBe('0')
  expect(host.querySelector('[data-state="completed"]')).toBeNull()
  await click(1)
  expect(host.querySelector('li')?.getAttribute('data-state')).toBe('previous')
})
it('changing linear and disabled changes navigation guards immediately', async () => {
  await render({ disabled: true })
  await render({ linear: false })
  await click(2)
  expect(current()).toBe('2')
  await render({ disabled: true, linear: false })
  await click(0)
  expect(current()).toBe('2')
  await render({ linear: true })
  await click(0)
  expect(current()).toBe('0')
  expect(host.querySelectorAll('button')[2].disabled).toBe(true)
})
it('disabled and linear do not prevent quiet external controlled updates', async () => {
  const change = vi.fn()
  await render({ step: 0, disabled: true, onStepChange: change })
  await render({ step: 2, disabled: true, onStepChange: change })
  expect(current()).toBe('2')
  expect(change).not.toHaveBeenCalled()
})
it('uncontrolled bounds are committed when shrinking and do not revive on growth', async () => {
  const change = vi.fn()
  await render({ defaultStep: 10, onStepChange: change })
  expect(current()).toBe('2')
  await render({ items: items.slice(0, 2), onStepChange: change })
  expect(current()).toBe('1')
  await render({ onStepChange: change })
  expect(current()).toBe('1')
  expect(change).not.toHaveBeenCalled()
})
it('controlled out-of-bounds selection is derived and respects later growth', async () => {
  const change = vi.fn()
  await render({ step: 2, items: items.slice(0, 2), onStepChange: change })
  expect(current()).toBe('1')
  await click(1)
  expect(change).not.toHaveBeenCalled()
  await render({ step: 2, onStepChange: change })
  expect(current()).toBe('2')
  expect(change).not.toHaveBeenCalled()
})
it('empty-to-filled and filled-to-empty lists remain usable without callbacks', async () => {
  const change = vi.fn()
  await render({ items: [], defaultStep: 2, onStepChange: change })
  expect(current()).toBeUndefined()
  expect(host.querySelector('ol')).toBeNull()
  await render({ onStepChange: change })
  expect(current()).toBe('0')
  await click(1)
  change.mockClear()
  await render({ items: [], onStepChange: change })
  await render({ onStepChange: change })
  expect(current()).toBe('0')
  expect(change).not.toHaveBeenCalled()
})
it('omitted items render a stable empty root', async () => {
  await render({ items: undefined })
  expect(host.querySelector('.uf-steps')).not.toBeNull()
  expect(host.querySelector('button')).toBeNull()
})
it('item keys preserve input identity and values on reorder while step remains an index', async () => {
  const keyed = items.map((item, index) => ({
    ...item,
    key: index,
    content: (
      <input
        aria-label={String(item.label)}
        defaultValue={String(item.label)}
      />
    ),
  }))
  await render({ items: keyed, step: 1 })
  const input = host.querySelector<HTMLInputElement>('[aria-label="Profile"]')!
  input.value = 'Edited'
  await render({ items: [keyed[1], keyed[0], keyed[2]], step: 1 })
  expect(host.querySelector('[aria-label="Profile"]')).toBe(input)
  expect(input.value).toBe('Edited')
  expect(host.querySelector('[aria-current]')?.textContent).toContain('Account')
})
it('panels retain input state while hidden and membrane changes never remount controls', async () => {
  const panelItems = [
    { label: 'One', content: <input defaultValue="Original" /> },
    { label: 'Two', content: 'Second' },
  ]
  await render({ items: panelItems })
  const input = host.querySelector('input')!,
    button = host.querySelector('button')
  input.value = 'Edited'
  await click(1)
  expect(input.closest('[hidden]')).not.toBeNull()
  await render({ items: panelItems, membrane: false })
  await click(0)
  expect(host.querySelector('input')).toBe(input)
  expect(input.value).toBe('Edited')
  expect(host.querySelector('button')).toBe(button)
  expect(button?.parentElement?.hasAttribute('data-membrane-disabled')).toBe(
    true,
  )
})
it('removing a focused panel recovers to the surviving active control', async () => {
  const withInputs = items.map((item) => ({ ...item, content: <input /> }))
  await render({ items: withInputs, defaultStep: 2 })
  await act(async () => {
    host.querySelectorAll('input')[2].focus()
  })
  await render({ items: withInputs.slice(0, 2) })
  expect(document.activeElement).toBe(host.querySelector('[aria-current]'))
})
it('an external change recovers focus from a now-hidden panel', async () => {
  const withInputs = items.map((item) => ({ ...item, content: <input /> }))
  await render({ items: withInputs, step: 0 })
  await act(async () => {
    host.querySelector('input')!.focus()
  })
  await render({ items: withInputs, step: 1 })
  expect(document.activeElement).toBe(host.querySelector('[aria-current]'))
})
it('changing steps does not steal focus from an external control', async () => {
  const outside = document.createElement('button')
  document.body.append(outside)
  await render({ step: 0 })
  await act(async () => {
    host.querySelector('button')!.focus()
    outside.focus()
  })
  await render({ step: 1 })
  expect(document.activeElement).toBe(outside)
  outside.remove()
})
it('disabling focused navigation recovers focus to usable current content', async () => {
  await render()
  await act(async () => {
    host.querySelector('button')!.focus()
  })
  await render({ disabled: true })
  expect(document.activeElement).toBe(
    host.querySelector('[data-part="content"]:not([hidden])'),
  )
})
it('hidden does not focus another control or reset the selection', async () => {
  await render({ defaultStep: 1 })
  await act(async () => {
    host.querySelectorAll('button')[1].focus()
  })
  await render({ hidden: true })
  expect(host.querySelector('.uf-steps')?.hasAttribute('hidden')).toBe(true)
  await render()
  expect(current()).toBe('1')
})
for (const name of ['step', 'defaultStep'] as const) {
  for (const value of [
    -1,
    0.5,
    NaN,
    Infinity,
    Number.MAX_SAFE_INTEGER + 1,
    null,
    '1',
  ]) {
    it(`${name} rejects invalid index ${String(value)}`, () => {
      expect(() =>
        renderToString(<Steps items={items} {...({ [name]: value } as any)} />),
      ).toThrow(/Steps .*nonnegative safe integer/)
    })
  }
}
for (const [name, value] of Object.entries({
  notArray: {},
  null: null,
  sparse: new Array(2),
  missingLabel: [{}],
  emptyLabel: [{ label: '' }],
  blankLabel: [{ label: '  ' }],
  falseLabel: [{ label: false }],
  duplicateKey: [
    { label: 'A', key: 1 },
    { label: 'B', key: '1' },
  ],
  invalidKey: [{ label: 'A', key: NaN }],
})) {
  it(`items rejects ${name}`, () => {
    expect(() => renderToString(<Steps items={value as any} />)).toThrow(
      /Steps /,
    )
  })
}
it('keyed and fallback indices occupy distinct identity namespaces', async () => {
  const warn = vi.spyOn(console, 'error').mockImplementation(() => {})
  await render({ items: [{ label: 0, key: 1 }, { label: 'B' }] })
  expect(host.querySelectorAll('button')).toHaveLength(2)
  expect(warn).not.toHaveBeenCalled()
  warn.mockRestore()
})
it('machine navigation boundaries and public capability flags agree', () => {
  const change = vi.fn(),
    service = interpret(stepsMachine, {
      total: 3,
      linear: false,
      onStepChange: change,
    })
  service.start()
  const api = () => connectSteps(service.getSnapshot(), service.send)
  for (const index of [NaN, Infinity, 0.5, -1, 3])
    service.send({ type: 'SET_STEP', step: index })
  expect(api().step).toBe(0)
  expect(change).not.toHaveBeenCalled()
  service.send('NEXT')
  expect(api().step).toBe(1)
  service.syncContext({ disabled: true })
  expect(api().canGoNext).toBe(false)
  expect(api().canGoPrev).toBe(false)
  service.send('NEXT')
  service.send('PREV')
  expect(api().step).toBe(1)
  service.syncContext({ disabled: false, total: 1 })
  expect(api().step).toBe(0)
  expect(api().isFirst).toBe(true)
  expect(api().isLast).toBe(true)
  service.syncContext({ total: 0 })
  expect(api().isFirst).toBe(false)
  expect(api().isLast).toBe(false)
  expect(api().canGoNext).toBe(false)
  service.stop()
})
