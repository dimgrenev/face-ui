// @vitest-environment jsdom
import React, { act, createRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { Bar, BarSection } from '../../Bar/Bar'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let host: HTMLDivElement
let root: Root
const render = async (children: React.ReactNode) => {
  await act(async () => root.render(children))
}
beforeEach(() => {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})
afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
})

it('Bar preserves every ordinary child and both documented BarSections across updates', async () => {
  await render(
    <Bar>
      <BarSection>Start</BarSection>
      <BarSection align="end">End</BarSection>
    </Bar>,
  )
  expect(host.querySelectorAll('[data-part="section"]')).toHaveLength(2)
  expect(host.textContent).toBe('StartEnd')
  await render(
    <Bar>
      <button>One</button>
      <button>Two</button>
      {false}
      {0}
    </Bar>,
  )
  expect(host.querySelectorAll('button')).toHaveLength(2)
  expect(host.textContent).toBe('OneTwo0')
})
it('Bar preserves mixed ordinary nodes and named slots, including fragments and arrays', async () => {
  await render(
    <Bar>
      <button>Attach</button>
      <span>Mode</span>
      <>
        <Bar.Section align="end">
          <button>Run</button>
        </Bar.Section>
      </>
    </Bar>,
  )
  expect(host.textContent).toBe('AttachModeRun')
  expect(
    host.querySelector('[data-scope="bar"][data-part="root"]')?.textContent,
  ).toBe('AttachModeRun')
  expect(
    host.querySelector('[data-part="section"][data-align="end"]')?.textContent,
  ).toBe('Run')
  await render(
    <Bar>
      <Bar.Section grow>First</Bar.Section>
      <Bar.Section grow>Second</Bar.Section>
      <Bar.Section align="end">
        {[<button key="a">A</button>, <button key="b">B</button>]}
      </Bar.Section>
    </Bar>,
  )
  expect(
    [...host.querySelectorAll('[data-part="section"][data-grow]')]
      .map((node) => node.textContent)
      .join(''),
  ).toBe('FirstSecond')
  expect(host.querySelectorAll('button')).toHaveLength(2)
})
it('Bar descriptor composition preserves all content and does not stringify false', async () => {
  const children = [
    { __componentName__: 'Button', text: 'Attach' },
    { __componentName__: 'Text', text: 'Agent mode' },
    {
      __componentName__: 'Bar.Section',
      align: 'end',
      children: [false, { __componentName__: 'Button', text: 'Run' }],
    },
  ]
  await render(<Bar>{children as unknown as React.ReactNode}</Bar>)
  expect(host.textContent).toBe('AttachAgent modeRun')
  expect(host.querySelectorAll('button')).toHaveLength(2)
})
it('Bar and BarSection forward native attributes, style, events and refs to their own DOM nodes', async () => {
  const bar = createRef<HTMLDivElement>()
  const section = createRef<HTMLDivElement>()
  const click = vi.fn()
  await render(
    <Bar
      ref={bar}
      id="bar"
      aria-label="Tools"
      orientation="vertical"
      className="custom"
      style={{ height: 240 }}
    >
      <BarSection ref={section} align="end" title="Commands" onClick={click}>
        Tools
      </BarSection>
    </Bar>,
  )
  expect(bar.current).toBe(host.querySelector('#bar'))
  expect(bar.current?.style.height).toBe('240px')
  expect(bar.current?.classList.contains('custom')).toBe(true)
  expect(bar.current?.getAttribute('aria-label')).toBe('Tools')
  expect(bar.current?.getAttribute('data-orientation')).toBe('vertical')
  expect(bar.current?.getAttribute('role')).toBeNull()
  expect(bar.current?.getAttribute('aria-orientation')).toBeNull()
  expect(section.current).toBe(host.querySelector('[data-part="section"]'))
  expect(section.current?.title).toBe('Commands')
  expect(section.current?.dataset.align).toBe('end')
  await act(async () => section.current?.click())
  expect(click).toHaveBeenCalledTimes(1)
  await render(
    <Bar role="toolbar" aria-label="Formatting" orientation="vertical">
      <button>Bold</button>
    </Bar>,
  )
  expect(
    host.querySelector('[role="toolbar"]')?.getAttribute('aria-orientation'),
  ).toBe('vertical')
})
it('Bar preserves keyed fragment identity instead of reassigning locally edited fields', async () => {
  const field = (id: string) => (
    <React.Fragment key={id}>
      <input data-field={id} defaultValue={id} />
    </React.Fragment>
  )
  await render(<Bar>{[field('first'), field('second')]}</Bar>)
  const first = host.querySelector<HTMLInputElement>('[data-field="first"]')!
  first.value = 'Edited locally'
  await render(<Bar>{[field('second'), field('first')]}</Bar>)
  expect(host.querySelector('[data-field="first"]')).toBe(first)
  expect(first.value).toBe('Edited locally')
})
it('Bar sections render inside consumer components and keep keyed group state when reordered', async () => {
  function Actions() {
    return (
      <Bar.Section align="end">
        <button>Save</button>
      </Bar.Section>
    )
  }
  await render(
    <Bar>
      <Actions />
    </Bar>,
  )
  expect(host.querySelector('button')?.textContent).toBe('Save')
  const group = (id: string) => (
    <Bar.Section align="end" key={id}>
      <input data-field={id} defaultValue={id} />
    </Bar.Section>
  )
  await render(<Bar>{[group('first'), group('second')]}</Bar>)
  const first = host.querySelector<HTMLInputElement>('[data-field="first"]')!
  first.value = 'Edited locally'
  await render(<Bar>{[group('second'), group('first')]}</Bar>)
  expect(host.querySelector('[data-field="first"]')).toBe(first)
  expect(first.value).toBe('Edited locally')
})
