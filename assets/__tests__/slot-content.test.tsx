import React, { act } from 'react'
import type { Root } from 'react-dom/client'
import { beforeEach, expect, it } from 'vitest'
import { Card } from '../../Card/Card'
import { Bar } from '../../Bar/Bar'
import { Button } from '../../Button/Button'
import { Text } from '../../Text/Text'
import { mount } from './harness'

let host: HTMLDivElement
let root: Root
const render = async (node: React.ReactNode) => {
  await act(async () => root.render(node))
}
beforeEach(() => {
  ;({ host, root } = mount())
})
it('empty React fragments and arrays do not create phantom Text or Button slots', async () => {
  for (const Component of [Text, Button]) {
    await render(
      <Component text="Ignored" icon={<>{false}</>}>
        {[false, <React.Fragment key="empty">{null}</React.Fragment>]}
      </Component>,
    )
    expect(host.textContent).toBe('')
    expect(host.querySelector('[data-part="icon"], .uf-text__icon')).toBeNull()
    expect(
      host.querySelector('[data-part="text"], .uf-text__content'),
    ).toBeNull()
    await render(
      <Component>
        {[false, <React.Fragment key="zero">{0}</React.Fragment>]}
      </Component>,
    )
    expect(host.textContent).toBe('0')
  }
})
it('Card descriptor titles have one typography and membrane owner, like the equivalent JSX', async () => {
  const descriptor = { __componentName__: 'Card.Title', children: 'Title' }
  await render(<Card>{descriptor as unknown as React.ReactNode}</Card>)
  const fromDescriptor = host.innerHTML
  expect(host.querySelectorAll('[data-scope="text"]')).toHaveLength(1)
  await render(
    <Card>
      <Card.Title>Title</Card.Title>
    </Card>,
  )
  expect(host.innerHTML).toBe(fromDescriptor)
})
it('Bar and Card resolve nested descriptor children consistently without duplicate content wrappers', async () => {
  const descriptor = {
    __componentName__: 'Text',
    children: ['Account', { __componentName__: 'Icon', name: 'user' }],
  }
  for (const Component of [Card, Bar]) {
    await render(
      <Component>{descriptor as unknown as React.ReactNode}</Component>,
    )
    expect(host.textContent).toBe('Account')
    expect(host.querySelectorAll('[data-scope="text"]')).toHaveLength(1)
    expect(host.querySelector('svg')?.getAttribute('data-icon')).toBe('user')
    expect(host.querySelectorAll('.uf-membrane:not([data-membrane-disabled])')).toHaveLength(1)
  }
})
it('unknown descriptor names cannot resolve registry prototype properties or invent visible components', async () => {
  for (const Component of [Card, Bar]) {
    for (const name of ['UnknownComponent', 'constructor', '__proto__']) {
      await render(
        <Component>
          {
            {
              __componentName__: name,
              children: 'Hidden',
            } as unknown as React.ReactNode
          }
        </Component>,
      )
      expect(host.textContent).toBe('')
    }
  }
})
it('keyed children retain their DOM and uncontrolled values when reordered in either container', async () => {
  for (const Component of [Card, Bar]) {
    const field = (id: string) => (
      <input key={id} data-field={id} defaultValue={id} />
    )
    await render(<Component>{[field('first'), field('second')]}</Component>)
    const first = host.querySelector<HTMLInputElement>('[data-field="first"]')!
    first.value = 'Edited locally'
    await render(<Component>{[field('second'), field('first')]}</Component>)
    expect(host.querySelector('[data-field="first"]')).toBe(first)
    expect(first.value).toBe('Edited locally')
    expect(host.querySelector('input')?.dataset.field).toBe('second')
  }
})
it('empty primitive array entries do not create typography or membrane boxes', async () => {
  for (const Component of [Card, Bar]) {
    await render(<Component>{['', null, false, 0]}</Component>)
    expect(host.querySelectorAll('.uf-text')).toHaveLength(1)
    expect(host.querySelectorAll('.uf-membrane:not([data-membrane-disabled])')).toHaveLength(1)
    expect(host.textContent).toBe('0')
  }
})
