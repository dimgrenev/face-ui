// @vitest-environment jsdom
import React, { act, createRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { Card } from '../../Card/Card'

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
it('Card convenience slots update, preserve zero and rich nodes, and omit empty sections', async () => {
  await render(
    <Card
      title="Title"
      description="Description"
      content={<b>Content</b>}
      footer="Footer"
    />,
  )
  expect(host.textContent).toBe('TitleDescriptionContentFooter')
  expect(host.querySelector('[data-part="content"] b')?.textContent).toBe(
    'Content',
  )
  await render(
    <Card title={0} description={false} content={0} footer={false} />,
  )
  expect(host.textContent).toBe('00')
  expect(host.querySelector('[data-part="description"]')).toBeNull()
  expect(host.querySelector('[data-part="footer"]')).toBeNull()
  await render(
    <Card
      title={false}
      description=""
      content={<span>Kept</span>}
      footer={<></>}
    />,
  )
  expect(host.querySelector('[data-part="header"]')).toBeNull()
  expect(host.querySelector('[data-part="footer"]')).toBeNull()
  expect(host.textContent).toBe('Kept')
})
it('Card children form the content fallback when convenience slots are used, or the compound tree otherwise', async () => {
  await render(<Card title="Title">Fallback</Card>)
  expect(host.querySelector('[data-part="content"]')?.textContent).toBe(
    'Fallback',
  )
  await render(
    <Card title="Title" content="Preferred">
      Fallback
    </Card>,
  )
  expect(host.querySelector('[data-part="content"]')?.textContent).toBe(
    'Preferred',
  )
  await render(
    <Card>
      <Card.Header>
        <Card.Title as="h3">Heading</Card.Title>
        <Card.Description>Description</Card.Description>
      </Card.Header>
      <Card.Content>Body</Card.Content>
      <Card.Footer>
        <Card.Actions>
          <button>Action</button>
        </Card.Actions>
      </Card.Footer>
    </Card>,
  )
  expect(host.textContent).toBe('HeadingDescriptionBodyAction')
  expect(host.querySelector('h3[data-part="title"]')).not.toBeNull()
  expect(host.querySelectorAll('[data-part="header"]')).toHaveLength(1)
})
it('Card root and slots forward native props and refs to the intended DOM element', async () => {
  const refs = [
    createRef<HTMLDivElement>(),
    createRef<HTMLDivElement>(),
    createRef<HTMLElement>(),
    createRef<HTMLElement>(),
    createRef<HTMLDivElement>(),
    createRef<HTMLDivElement>(),
    createRef<HTMLDivElement>(),
  ]
  const click = vi.fn()
  await render(
    <Card
      ref={refs[0] as React.Ref<HTMLDivElement>}
      id="root"
      aria-label="Summary"
      className="custom"
      style={{ color: 'red' }}
      onClick={click}
    >
      <Card.Header ref={refs[1] as React.Ref<HTMLDivElement>} id="header">
        <Card.Title ref={refs[2]} id="title">
          Title
        </Card.Title>
        <Card.Description ref={refs[3]} id="description">
          Description
        </Card.Description>
      </Card.Header>
      <Card.Content ref={refs[4] as React.Ref<HTMLDivElement>} id="content">
        Content
      </Card.Content>
      <Card.Footer ref={refs[5] as React.Ref<HTMLDivElement>} id="footer">
        <Card.Actions ref={refs[6] as React.Ref<HTMLDivElement>} id="actions">
          <button>Action</button>
        </Card.Actions>
      </Card.Footer>
    </Card>,
  )
  for (const [i, id] of [
    'root',
    'header',
    'title',
    'description',
    'content',
    'footer',
    'actions',
  ].entries())
    expect(refs[i].current).toBe(host.querySelector(`#${id}`))
  const card = host.querySelector<HTMLElement>('#root')!
  expect(card.getAttribute('aria-label')).toBe('Summary')
  expect(card.classList.contains('custom')).toBe(true)
  expect(card.style.color).toBe('red')
  await act(async () => card.click())
  expect(click).toHaveBeenCalledTimes(1)
})
it('Card typography parts preserve Text semantics, explicit elements and label association', async () => {
  for (const Part of [Card.Title, Card.Description]) {
    await render(
      <Card>
        <Part variant="h3">Heading</Part>
      </Card>,
    )
    expect(host.querySelector('h3')?.textContent).toBe('Heading')
    await render(
      <Card>
        <Part variant="label" htmlFor="field">
          Label
        </Part>
      </Card>,
    )
    expect(host.querySelector('label')?.htmlFor).toBe('field')
    await render(
      <Card>
        <Part as="span" variant="h3" htmlFor="field">
          Explicit
        </Part>
      </Card>,
    )
    expect(host.querySelector('.uf-text')?.tagName).toBe('SPAN')
    expect(host.querySelector('.uf-text')?.hasAttribute('for')).toBe(false)
  }
})
