import React, { act, createRef } from 'react'
import type { Root } from 'react-dom/client'
import { beforeEach, expect, it, vi, describe } from 'vitest'
import { Card } from '../../Card/Card'
import { Button } from '../../Button/Button'
import { libraryCss, mount } from './harness'

let host: HTMLDivElement
let root: Root
const render = async (children: React.ReactNode) => {
  await act(async () => root.render(children))
}
beforeEach(() => {
  ;({ host, root } = mount())
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

describe('component smoke', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;({ host: container, root } = mount())
  })

  it('Card renders text slots through Text membranes and a descriptor footer button', async () => {
    const bodyText =
      'Workspace settings and recent activity stay grouped in one place'

    await act(async () => {
      root.render(
        <Card
          title="Card Title"
          description="Card description text"
          content={bodyText}
          footer={
            {
              __componentName__: 'Button',
              text: 'Open',
              icon: 'arrow-right',
              iconPosition: 'end',
              fullWidth: false,
            } as any
          }
        />,
      )
    })

    const card = container.querySelector<HTMLElement>('[data-scope="card"]')
    expect(card).not.toBeNull()
    expect(card?.getAttribute('data-card-variant')).toBe('default')
    expect(card?.getAttribute('data-padding')).toBe('default')
    expect(card?.getAttribute('data-radius')).toBe('md')
    expect(card?.getAttribute('data-border')).toBe('true')

    const textNodes = Array.from(
      container.querySelectorAll<HTMLElement>('[data-scope="text"]'),
    )
    const title =
      textNodes.find((node) => node.textContent?.trim() === 'Card Title') ??
      null
    const description =
      textNodes.find(
        (node) => node.textContent?.trim() === 'Card description text',
      ) ?? null
    const content =
      textNodes.find((node) => node.textContent?.trim() === bodyText) ?? null

    expect(title?.getAttribute('data-inset')).toBe('control')
    expect(description?.getAttribute('data-inset')).toBe('control')
    expect(content?.getAttribute('data-inset')).toBe('control')
    expect(title?.parentElement?.classList.contains('uf-membrane')).toBe(true)
    expect(description?.parentElement?.classList.contains('uf-membrane')).toBe(
      true,
    )
    expect(content?.parentElement?.classList.contains('uf-membrane')).toBe(true)
    expect(title?.parentElement?.classList.contains('uf-membrane--full')).toBe(
      true,
    )
    expect(
      description?.parentElement?.classList.contains('uf-membrane--full'),
    ).toBe(true)
    const footerButton = container.querySelector<HTMLButtonElement>(
      '[data-part="footer"] [data-scope="button"]',
    )
    expect(footerButton?.textContent).toContain('Open')
    expect(footerButton?.parentElement?.classList.contains('uf-membrane')).toBe(
      true,
    )

    const componentStyles = libraryCss()
    expect(componentStyles).toContain(
      '--uf-card-bg: var(--uf-overlay-surface-bg);',
    )
    expect(componentStyles).toContain('background: var(--uf-card-background);')
    expect(componentStyles).toContain(
      '--uf-card-pad: var(--uf-card-padding-default);',
    )
    expect(componentStyles).not.toContain(
      '.uf-card[data-scope][data-card-variant="dialog"]',
    )
    expect(componentStyles).not.toContain(
      '.uf-card[data-scope][data-card-variant="floating"]',
    )
    expect(componentStyles).toContain(
      '.uf-card[data-scope][data-border="false"]',
    )
    expect(componentStyles).not.toContain(
      '.uf-card[data-scope][data-padding="none"][data-radius="none"]',
    )
    expect(componentStyles).toContain(
      '.uf-card[data-scope] > [data-part="footer"][data-align="between"]',
    )
    expect(componentStyles).toContain('.uf-card[data-scope] .uf-text__content')
    expect(componentStyles).toContain('overflow-wrap: anywhere;')
    const getCardVariantBlock = (variant: string) =>
      componentStyles.match(
        new RegExp(
          `\\.uf-card\\[data-scope\\]\\[data-card-variant="${variant}"\\]\\s*\\{[^}]*\\}`,
        ),
      )?.[0] ?? ''
    expect(getCardVariantBlock('plain')).not.toContain('--uf-card-border-width')
    expect(getCardVariantBlock('code')).not.toContain('--uf-card-border-width')
    expect(componentStyles).not.toContain('[data-card-variant="showcase"]')
    expect(componentStyles).toMatch(
      /\.uf-card\[data-scope\]:not\(\[data-full-width\]\) \{[\s\S]*?inline-size: max-content;[\s\S]*?\}/,
    )
  })

  it('Card supports compound slots for modal-grade surfaces', async () => {
    await act(async () => {
      root.render(
        <Card radius="lg" footerAlign="between">
          <Card.Header orientation="horizontal">
            <Card.Title>System surface</Card.Title>
            <Card.Actions>
              <Button icon="close" iconOnly fullWidth={false} />
            </Card.Actions>
          </Card.Header>
          <Card.Content>Shared content shell.</Card.Content>
          <Card.Footer align="between">
            <Card.Actions align="between">
              <Button text="Cancel" variant="outline" fullWidth={false} />
              <Button text="Continue" variant="accent" fullWidth={false} />
            </Card.Actions>
          </Card.Footer>
        </Card>,
      )
    })

    const card = container.querySelector<HTMLElement>('[data-scope="card"]')
    expect(card?.getAttribute('data-card-variant')).toBe('default')
    expect(card?.getAttribute('data-radius')).toBe('lg')
    expect(
      card
        ?.querySelector('[data-part="header"]')
        ?.getAttribute('data-orientation'),
    ).toBe('horizontal')
    expect(
      card?.querySelector('[data-part="footer"]')?.getAttribute('data-align'),
    ).toBe('between')
    expect(
      card?.querySelector('[data-part="actions"]')?.getAttribute('data-align'),
    ).toBe('end')
    expect(card?.textContent).toContain('System surface')
    expect(card?.textContent).toContain('Shared content shell.')
    const buttons = Array.from(
      card?.querySelectorAll<HTMLElement>('[data-scope="button"]') ?? [],
    )
    expect(
      buttons.some((button) => button.textContent?.includes('Cancel')),
    ).toBe(true)
    expect(
      buttons.some((button) => button.textContent?.includes('Continue')),
    ).toBe(true)
    expect(
      buttons.some((button) => button.getAttribute('data-icon-only') === ''),
    ).toBe(true)
  })
})
