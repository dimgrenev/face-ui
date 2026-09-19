import React, { act, useState } from 'react'
import type { Root } from 'react-dom/client'
import { beforeEach, expect, it } from 'vitest'
import {
  Button,
  Tile,
  Text,
  Input,
  Checkbox,
  Switcher,
  Radio,
  SegmentedControl,
  Tabs,
  Select,
  Date as DateControl,
  Breadcrumb,
  Separator,
  Media,
  Markdown,
  Table,
} from '../../../index'
import { mount } from '../harness'

let host: HTMLDivElement
let root: Root
beforeEach(() => {
  ;({ host, root } = mount())
})

const cases: [string, (membrane: boolean) => React.ReactNode, string][] = [
  [
    'Button',
    (membrane) => <Button membrane={membrane}>Save</Button>,
    'button',
  ],
  [
    'Tile',
    (membrane) => (
      <Tile membrane={membrane} onClick={() => {}}>Project</Tile>
    ),
    '[data-part="primary"]',
  ],
  [
    'Text',
    (membrane) => (
      <Text membrane={membrane} tabIndex={0}>
        Content
      </Text>
    ),
    '.uf-text',
  ],
  [
    'Input',
    (membrane) => <Input membrane={membrane} defaultValue="Draft" />,
    'input',
  ],
  [
    'Checkbox',
    (membrane) => <Checkbox membrane={membrane} label="Agree" />,
    'input',
  ],
  [
    'Switcher',
    (membrane) => <Switcher membrane={membrane} label="Enabled" />,
    'input',
  ],
  [
    'Radio',
    (membrane) => (
      <Radio membrane={membrane} items={[{ value: 'a', label: 'A' }]} />
    ),
    'input',
  ],
  [
    'SegmentedControl',
    (membrane) => (
      <SegmentedControl
        membrane={membrane}
        items={[{ value: 'a', label: 'A' }]}
      />
    ),
    'button',
  ],
  [
    'Tabs',
    (membrane) => (
      <Tabs membrane={membrane} items={[{ value: 'a', label: 'A' }]} />
    ),
    '[role="tab"]',
  ],
  [
    'Select',
    (membrane) => (
      <Select membrane={membrane} aria-label="Plan" items={[{ value: 'a', label: 'A' }]} />
    ),
    '[data-part="trigger"]',
  ],
  [
    'Date',
    (membrane) => <DateControl membrane={membrane} />,
    '[data-part="trigger"]',
  ],
  [
    'Breadcrumb',
    (membrane) => (
      <Breadcrumb
        membrane={membrane}
        items={[{ label: 'Home', href: '#home' }]}
      />
    ),
    'a',
  ],
  [
    'Separator',
    (membrane) => <Separator decorative={false} membrane={membrane} />,
    '[role="separator"]',
  ],
  [
    'Media',
    (membrane) => <Media membrane={membrane} src="/image.png" tabIndex={0} />,
    '[data-part="root"]',
  ],
  [
    'Markdown',
    (membrane) => <Markdown membrane={membrane}>[Help](#help)</Markdown>,
    'a',
  ],
  [
    'Table',
    (membrane) => (
      <Table
        membrane={membrane}
        columns={[
          { id: 'name', header: 'Name', accessor: 'name', sortable: true },
        ]}
        rows={[{ id: 'a', name: 'Ada' }]}
      />
    ),
    'button',
  ],
]

it.each(cases)(
  '%s keeps its control and focus when membrane changes in either direction',
  async (_name, render, selector) => {
    await act(async () => root.render(render(false)))
    const control = host.querySelector<HTMLElement>(selector)!
    expect(control).not.toBeNull()
    await act(async () => control.focus())
    const wasFocused = document.activeElement === control
    for (const membrane of [true, false, true]) {
      await act(async () => root.render(render(membrane)))
      expect(host.querySelector(selector)).toBe(control)
      if (wasFocused) expect(document.activeElement).toBe(control)
    }
  },
)

it('preserves uncontrolled input value and selection through spacing changes', async () => {
  const render = (membrane: boolean) => (
    <Input membrane={membrane} defaultValue="Draft" />
  )
  await act(async () => root.render(render(false)))
  const input = host.querySelector('input')!
  await act(async () => input.focus())
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    )!.set!.call(input, 'Unsaved edits')
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  input.setSelectionRange(2, 7)
  for (const membrane of [true, false]) {
    await act(async () => root.render(render(membrane)))
    expect(host.querySelector('input')).toBe(input)
    expect(input.value).toBe('Unsaved edits')
    expect([input.selectionStart, input.selectionEnd]).toEqual([2, 7])
  }
})

it('preserves state in consumer children without a focus-restoration effect', async () => {
  function Counter() {
    const [count, setCount] = useState(0)
    return <button onClick={() => setCount(count + 1)}>Count {count}</button>
  }
  const render = (membrane: boolean) => (
    <Tile interactive={false} membrane={membrane}>
      <Counter />
    </Tile>
  )
  await act(async () => root.render(render(true)))
  const button = host.querySelector('button')!
  await act(async () => button.click())
  await act(async () => button.focus())
  for (const membrane of [false, true]) {
    await act(async () => root.render(render(membrane)))
    expect(host.querySelector('button')).toBe(button)
    expect(button.textContent).toBe('Count 1')
    expect(document.activeElement).toBe(button)
  }
})
