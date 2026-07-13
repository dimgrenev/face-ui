// @vitest-environment jsdom

import React from 'react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { Accordion } from '../../Accordion/Accordion'
import { Avatar } from '../../Avatar/Avatar'
import { Button } from '../../Button/Button'
import { Calendar } from '../../Calendar/Calendar'
import { Card } from '../../Card/Card'
import { Carousel } from '../../Carousel/Carousel'
import { Checkbox } from '../../Checkbox/Checkbox'
import { Code } from '../../Code/Code'
import { Command } from '../../Command/Command'
import { Icon } from '../../Icon/Icon'
import { Input } from '../../Input/Input'
import { Markdown } from '../../Markdown/Markdown'
import { Media } from '../../Media/Media.tsx'
import { Modal } from '../../Modal/Modal'
import { Navigation } from '../../Navigation/Navigation'
import { Pagination } from '../../Pagination/Pagination'
import { Panel } from '../../Panel/Panel'
import { Progress } from '../../Progress/Progress'
import { Radio } from '../../Radio/Radio'
import { Rating } from '../../Rating/Rating'
import { Scroll } from '../../Scroll/Scroll'
import { Separator } from '../../Separator/Separator'
import { Select } from '../../Select/Select'
import { Slider } from '../../Slider/Slider'
import { Steps } from '../../Steps/Steps'
import { Switcher } from '../../Switcher/Switcher'
import { Table } from '../../Table/Table'
import { Tabs } from '../../Tabs/Tabs'
import { Text } from '../../Text/Text'
import { Tile } from '../../Tile/Tile'
import { Toast } from '../../Toast/Toast'
import { Toc } from '../../Toc/Toc'
import { Toggle } from '../../Toggle/Toggle'
import { Tree } from '../../Tree/Tree'

function setNativeInputValue(element: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
  expect(setter).toBeTypeOf('function')
  setter?.call(element, value)
}

describe('component smoke', () => {
  let container: HTMLDivElement
  let root: Root
  const settingsPath = 'M10 3L11.8751 5.47299L14.9497 5.05025L14.527 8.12485L17 10L14.527 11.8751L14.9497 14.9497L11.8751 14.527L10 17L8.12485 14.527L5.05025 14.9497L5.47299 11.8751L3 10L5.47299 8.12485L5.05025 5.05025L8.12485 5.47299L10 3Z'
  const browserPath = 'M4 10C4 6.18182 7 4 10 4C13 4 16 6.18182 16 10C16 13.8182 13 16 10 16C7 16 4 13.8182 4 10Z'
  const chatPath = 'M11.5 4.50019H9L8.50016 4.50016C6.29096 4.50007 4.5 6.29096 4.5 8.50016V11.5002C4.5 13.7092 6.29076 15.5001 8.49983 15.5002L9 15.5002H11.5C13.7091 15.5002 15.5 13.7093 15.5 11.5002V8.50019C15.5 6.29105 13.7091 4.50019 11.5 4.50019Z'
  const folderGoPath = 'M11 15.5H15.5L15.5 6.5H10.5L9 4.5H4.5V8'
  const fullPath = 'M10.2 5L15 5V9.8M9.8 15L5 15V10.2'
  const partPath = 'M16 8.7998L11.2 8.7998L11.2 3.9998'
  const micPath = 'M7.5 5.5C7.5 4.39543 8.39543 3.5 9.5 3.5H10.5C11.6046 3.5 12.5 4.39543 12.5 5.5V10.5C12.5 11.6046 11.6046 12.5 10.5 12.5L9.5 12.5C8.39543 12.5 7.5 11.6046 7.5 10.5V5.5Z'
  const sidebarLeftClosedPath = 'M5.5 6.36035C5.85346 6.36035 6.13965 6.64654 6.13965 7V13C6.13965 13.3535 5.85346 13.6396 5.5 13.6396C5.14654 13.6396 4.86035 13.3535 4.86035 13V7C4.86035 6.64654 5.14654 6.36035 5.5 6.36035Z'
  const notdefPath = 'M15.5 4.50019H9L4.5 4.5V15.5L9 15.5002H15.5V4.50019Z'
  const moreCenterDotSelector = 'circle[cx="10"][cy="10"][r="1"]'

  beforeEach(() => {
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    ;(globalThis as typeof globalThis & { React?: typeof React }).React = React
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(async () => {
    await act(async () => {
      root.unmount()
    })
    container.remove()
  })

  it('Calendar renders and emits a selected date', async () => {
    const handleValueChange = vi.fn()

    await act(async () => {
      root.render(<Calendar defaultValue={new Date(2026, 2, 6)} onValueChange={handleValueChange} />)
    })

    const grid = container.querySelector('[data-part="grid"]')
    expect(grid).not.toBeNull()

    const dayButtons = Array.from(container.querySelectorAll<HTMLButtonElement>('.uf-calendar-dayButton'))
    const selectableDay = dayButtons.find((button) => button.getAttribute('data-disabled') == null)
    expect(selectableDay).toBeTruthy()
    expect(selectableDay?.getAttribute('data-full-width')).toBe('')
    expect(selectableDay?.parentElement?.classList.contains('uf-membrane')).toBe(true)

    await act(async () => {
      selectableDay?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(handleValueChange).toHaveBeenCalled()
    expect(selectableDay?.getAttribute('data-selected')).not.toBeNull()
    const call = handleValueChange.mock.calls.at(-1)?.[0] as { value: Date } | undefined
    expect(call?.value).toBeInstanceOf(Date)
  })

  it('Calendar ignores invalid runtime dates instead of selecting today', async () => {
    await act(async () => {
      root.render(<Calendar value={new Date(Number.NaN)} />)
    })

    expect(container.querySelector('.uf-calendar-dayButton[data-selected]')).toBeNull()
  })

  it('Accordion wraps primitive content in Text when a section opens', async () => {
    await act(async () => {
      root.render(
        <Accordion
          items={[
            { value: 'a', label: 'Section A', content: 'Content A' },
            { value: 'b', label: 'Section B', content: 'Content B' },
          ]}
        />,
      )
    })

    const trigger = container.querySelector('[data-part="trigger"]') as HTMLButtonElement | null
    expect(trigger).not.toBeNull()

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const textNode = container.querySelector('[data-part="content"] [data-scope="text"]') as HTMLElement | null
    const membrane = textNode?.parentElement as HTMLElement | null
    expect(textNode?.textContent).toContain('Content A')
    expect(textNode?.classList.contains('uf-accordion-contentText')).toBe(true)
    expect(textNode?.hasAttribute('data-membrane')).toBe(true)
    expect(textNode?.getAttribute('data-full-width')).toBe('')
    expect(membrane?.classList.contains('uf-membrane--full')).toBe(true)
  })

  it('Accordion keeps nested controls full width inside opened content', async () => {
    await act(async () => {
      root.render(
        <Accordion
          defaultExpandedIds={['getting-started']}
          items={[
            {
              value: 'getting-started',
              label: 'Getting started',
              content: <Button text="Install package" fullWidth />,
            },
          ]}
        />,
      )
    })

    const content = container.querySelector('[data-part="content"]:not([hidden])') as HTMLElement | null
    const button = content?.querySelector('.uf-button[data-scope="button"]') as HTMLButtonElement | null
    const membrane = button?.parentElement as HTMLElement | null

    expect(content).not.toBeNull()
    expect(button).not.toBeNull()
    expect(button?.getAttribute('data-full-width')).toBe('')
    expect(membrane?.classList.contains('uf-membrane--full')).toBe(true)
  })

  it('Accordion keeps opened content out of the root intrinsic width calculation', () => {
    const componentStyles = readFileSync(join(process.cwd(), 'assets/styles/components.css'), 'utf8')
    expect(componentStyles).toMatch(
      /\[data-scope="accordion"\] \[data-part="content"\],[\s\S]*?contain:\s*inline-size;/,
    )
    expect(componentStyles).toMatch(
      /\[data-scope="accordion"\] \[data-part="content"\],[\s\S]*?overflow-wrap:\s*anywhere;/,
    )
  })

  it('Accordion resolves item icons through the shared Icon renderer', async () => {
    await act(async () => {
      root.render(
        <Accordion
          items={[
            { value: 'docs', label: 'Docs', icon: 'folder', content: 'Docs content' },
          ]}
        />,
      )
    })

    const trigger = container.querySelector('[data-part="trigger"]') as HTMLButtonElement | null
    expect(trigger).not.toBeNull()
    expect(trigger?.getAttribute('data-icon-left')).toBe('')
    expect(trigger?.querySelector('.uf-accordion-icon svg')).not.toBeNull()
    expect(container.querySelector('[data-part="content"]')?.getAttribute('data-icon-left')).toBe('')
  })

  it('Accordion resolves the default icon prop through the shared Icon renderer', async () => {
    await act(async () => {
      root.render(
        <Accordion
          icon="folder"
          items={[
            { value: 'docs', label: 'Docs', content: 'Docs content' },
          ]}
        />,
      )
    })

    const trigger = container.querySelector('[data-part="trigger"]') as HTMLButtonElement | null
    expect(trigger).not.toBeNull()
    expect(trigger?.getAttribute('data-icon-left')).toBe('')
    expect(trigger?.querySelector('.uf-accordion-icon svg[data-icon="folder"]')).not.toBeNull()
    expect(container.querySelector('[data-part="content"]')?.getAttribute('data-icon-left')).toBe('')
  })

  it('Button resolves string icon names through Icon', async () => {
    await act(async () => {
      root.render(<Button icon="close" iconOnly fullWidth={false} />)
    })

    const icon = container.querySelector('[data-part="icon"] svg')
    expect(icon).not.toBeNull()
  })

  it('Button outline variant keeps its resting surface transparent', () => {
    const componentStyles = readFileSync(join(process.cwd(), 'assets/styles/components.css'), 'utf8')
    expect(componentStyles).toMatch(
      /\.uf-button\[data-scope="button"\]\[data-variant="outline"\]\s*\{[^}]*--uf-button-bg:\s*var\(--uf-color-black-0\);/s,
    )
  })

  it('Button selector mode renders a compact system indicator', async () => {
    await act(async () => {
      root.render(<Button text="GPT-5.5" selector fullWidth={false} />)
    })

    const button = container.querySelector('[data-scope="button"][data-selector]') as HTMLButtonElement | null
    expect(button?.textContent).toContain('GPT-5.5')
    expect(button?.querySelector('[data-part="indicator"] svg[data-icon="select-chevron-down"]')).not.toBeNull()

    await act(async () => {
      root.render(<Button text="GPT-5.5" selector selectorOpen fullWidth={false} />)
    })

    expect(container.querySelector('[data-part="indicator"] svg[data-icon="select-chevron-up"]')).not.toBeNull()

    await act(async () => {
      root.render(<Button text="Nested" selector selectorDirection="side" fullWidth={false} />)
    })

    const sideButton = container.querySelector('[data-scope="button"][data-selector-direction="side"]') as HTMLButtonElement | null
    expect(sideButton?.querySelector('[data-part="indicator"] svg[data-icon="select-chevron-right"]')).not.toBeNull()

    const componentStyles = readFileSync(join(process.cwd(), 'assets/styles/components.css'), 'utf8')
    expect(componentStyles).toContain('--uf-control-pad-right: var(--uf-selector-indicator-edge-gap);')
  })

  it('Button wraps text in a truncatable label slot inside constrained actions', async () => {
    await act(async () => {
      root.render(
        <div style={{ width: 96 }}>
          <Button
            icon="account"
            text="Dmitry Grer With A Very Long Account Name"
            fullWidth
            stretchText
            rightText="Pro"
          />
        </div>,
      )
    })

    const button = container.querySelector<HTMLButtonElement>('.uf-button[data-scope="button"]')
    const textSlot = button?.querySelector<HTMLElement>('[data-part="text"]')
    const label = button?.querySelector<HTMLElement>('[data-part="label"].uf-button__label')

    expect(button?.getAttribute('data-full-width')).toBe('')
    expect(button?.getAttribute('data-stretch-text')).toBe('')
    expect(textSlot).not.toBeNull()
    expect(label?.textContent).toBe('Dmitry Grer With A Very Long Account Name')
    expect(button?.querySelector('.uf-button__rightText')?.textContent).toBe('Pro')

    const componentStyles = readFileSync(join(process.cwd(), 'assets/styles/components.css'), 'utf8')
    expect(componentStyles).toContain('[data-scope="button"] [data-part="label"],\n.uf-button__label {')
    expect(componentStyles).toContain('text-overflow: ellipsis;')
  })

  it('Avatar centers icon fallback content inside a square control box', async () => {
    await act(async () => {
      root.render(<Avatar icon="user" />)
    })

    const avatar = container.querySelector<HTMLElement>('[data-scope="avatar"]')
    const icon = avatar?.querySelector<SVGElement>('.uf-avatar__content > svg[data-icon="user"]')
    expect(avatar).not.toBeNull()
    expect(icon).not.toBeNull()
    expect(avatar?.querySelector('[data-part="image"]')).toBeNull()

    const componentStyles = readFileSync(join(process.cwd(), 'assets/styles/components.css'), 'utf8')
    expect(componentStyles).toContain('block-size: var(--uf-control-height);')
    expect(componentStyles).toContain('[data-scope="avatar"] [data-part="fallback"]')
    expect(componentStyles).toContain('display: flex;')
    expect(componentStyles).toContain('.uf-avatar__content > :is(svg, img, .uf-icon)')
  })

  it('Card renders text slots through Text membranes and a descriptor footer button', async () => {
    const bodyText = 'Workspace settings and recent activity stay grouped in one place'

    await act(async () => {
      root.render(
        <Card
          title="Card Title"
          description="Card description text"
          content={bodyText}
          footer={{
            __componentName__: 'Button',
            text: 'Open',
            icon: 'arrow-right',
            iconPosition: 'right',
            fullWidth: false,
          } as any}
        />,
      )
    })

    const card = container.querySelector<HTMLElement>('[data-scope="card"]')
    expect(card).not.toBeNull()
    expect(card?.getAttribute('data-card-variant')).toBe('default')
    expect(card?.getAttribute('data-padding')).toBe('default')
    expect(card?.getAttribute('data-radius')).toBe('md')
    expect(card?.getAttribute('data-border')).toBe('true')

    const textNodes = Array.from(container.querySelectorAll<HTMLElement>('[data-scope="text"]'))
    const title = textNodes.find((node) => node.textContent?.trim() === 'Card Title') ?? null
    const description = textNodes.find((node) => node.textContent?.trim() === 'Card description text') ?? null
    const content = textNodes.find((node) => node.textContent?.trim() === bodyText) ?? null

    expect(title?.getAttribute('data-inset')).toBe('control')
    expect(description?.getAttribute('data-inset')).toBe('control')
    expect(content?.getAttribute('data-inset')).toBe('control')
    expect(title?.parentElement?.classList.contains('uf-membrane')).toBe(true)
    expect(description?.parentElement?.classList.contains('uf-membrane')).toBe(true)
    expect(content?.parentElement?.classList.contains('uf-membrane')).toBe(true)
    expect(title?.parentElement?.classList.contains('uf-membrane--full')).toBe(true)
    expect(description?.parentElement?.classList.contains('uf-membrane--full')).toBe(true)
    expect(content?.parentElement?.classList.contains('uf-membrane--full')).toBe(true)

    const footerButton = container.querySelector<HTMLButtonElement>('[data-part="footer"] [data-scope="button"]')
    expect(footerButton?.textContent).toContain('Open')
    expect(footerButton?.parentElement?.classList.contains('uf-membrane')).toBe(true)

    const componentStyles = readFileSync(join(process.cwd(), 'assets/styles/components.css'), 'utf8')
    expect(componentStyles).toContain('--uf-card-bg: var(--uf-overlay-surface-bg);')
    expect(componentStyles).toContain('background: var(--uf-card-background);')
    expect(componentStyles).toContain('--uf-card-pad: var(--uf-card-padding-default);')
    expect(componentStyles).not.toContain('.uf-card[data-scope][data-card-variant="dialog"]')
    expect(componentStyles).not.toContain('.uf-card[data-scope][data-card-variant="floating"]')
    expect(componentStyles).toContain('.uf-card[data-scope][data-border="false"]')
    expect(componentStyles).toContain('.uf-card[data-scope][data-padding="none"][data-radius="none"]')
    expect(componentStyles).toContain('.uf-card[data-scope] > [data-part="footer"][data-layout="between"]')
    expect(componentStyles).toContain('.uf-card[data-scope] .uf-text__content')
    expect(componentStyles).toContain('overflow-wrap: anywhere;')
    const getCardVariantBlock = (variant: string) => (
      componentStyles.match(new RegExp(`\\.uf-card\\[data-scope\\]\\[data-card-variant="${variant}"\\]\\s*\\{[^}]*\\}`))?.[0] ?? ''
    )
    expect(getCardVariantBlock('plain')).not.toContain('--uf-card-border-width')
    expect(getCardVariantBlock('code')).not.toContain('--uf-card-border-width')
    expect(componentStyles).not.toContain('[data-card-variant="showcase"]')
    expect(componentStyles).toMatch(
      /\.uf-card\[data-scope\]:not\(\[data-full-width\]\) \{[\s\S]*?inline-size: max-content;[\s\S]*?margin-inline: auto;[\s\S]*?align-self: center;[\s\S]*?justify-self: center;[\s\S]*?\}/,
    )
  })

  it('Card supports compound slots for modal-grade surfaces', async () => {
    await act(async () => {
      root.render(
        <Card radius="lg" footerLayout="between">
          <Card.Header layout="bar">
            <Card.Title>System surface</Card.Title>
            <Card.Actions>
              <Button icon="close" iconOnly fullWidth={false} />
            </Card.Actions>
          </Card.Header>
          <Card.Content>Shared content shell.</Card.Content>
          <Card.Footer layout="between">
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
    expect(card?.querySelector('[data-part="header"]')?.getAttribute('data-layout')).toBe('bar')
    expect(card?.querySelector('[data-part="footer"]')?.getAttribute('data-layout')).toBe('between')
    expect(card?.querySelector('[data-part="actions"]')?.getAttribute('data-align')).toBe('end')
    expect(card?.textContent).toContain('System surface')
    expect(card?.textContent).toContain('Shared content shell.')
    const buttons = Array.from(card?.querySelectorAll<HTMLElement>('[data-scope="button"]') ?? [])
    expect(buttons.some((button) => button.textContent?.includes('Cancel'))).toBe(true)
    expect(buttons.some((button) => button.textContent?.includes('Continue'))).toBe(true)
    expect(buttons.some((button) => button.getAttribute('data-icon-only') === '')).toBe(true)
  })

  it('Input syncs controlled value updates from props', async () => {
    const handleValueChange = vi.fn()

    await act(async () => {
      root.render(<Input type="text" value="Alpha" onValueChange={handleValueChange} />)
    })

    const input = container.querySelector('.uf-input input') as HTMLInputElement | null
    expect(input?.value).toBe('Alpha')
    expect(handleValueChange).not.toHaveBeenCalled()

    await act(async () => {
      root.render(<Input type="text" value="Beta" onValueChange={handleValueChange} />)
    })

    const updatedInput = container.querySelector('.uf-input input') as HTMLInputElement | null
    expect(updatedInput?.value).toBe('Beta')
    expect(handleValueChange).not.toHaveBeenCalled()
  })

  it('Select syncs controlled value updates without echoing onValueChange', async () => {
    const handleValueChange = vi.fn()

    await act(async () => {
      root.render(
        <Select
          value="alpha"
          surface="sheet"
          options={[
            { value: 'alpha', label: 'Alpha' },
            { value: 'beta', label: 'Beta' },
          ]}
          onValueChange={handleValueChange}
        />,
      )
    })

    const trigger = container.querySelector<HTMLButtonElement>('[data-scope="select"][data-part="trigger"]')
    expect(trigger?.textContent).toContain('Alpha')
    expect(trigger?.querySelector('[data-part="indicator"] svg[data-icon="select-chevron-down"]')).not.toBeNull()
    expect(readFileSync(join(process.cwd(), 'assets/styles/components.css'), 'utf8'))
      .toContain('padding-right: var(--uf-select-indicator-edge-gap);')

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(trigger?.querySelector('[data-part="indicator"] svg[data-icon="select-chevron-up"]')).not.toBeNull()

    const betaOption = Array.from(container.querySelectorAll<HTMLElement>('[role="option"]'))
      .find((option) => option.dataset.value === 'beta') ?? null
    expect(betaOption?.textContent).toContain('Beta')

    await act(async () => {
      betaOption?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(handleValueChange.mock.calls.map(([details]) => details)).toEqual([{ value: 'beta' }])
    expect(trigger?.textContent).toContain('Alpha')

    await act(async () => {
      root.render(
        <Select
          value="beta"
          surface="sheet"
          options={[
            { value: 'alpha', label: 'Alpha' },
            { value: 'beta', label: 'Beta' },
          ]}
          onValueChange={handleValueChange}
        />,
      )
    })

    expect(handleValueChange).toHaveBeenCalledTimes(1)
    expect(trigger?.textContent).toContain('Beta')
  })

  it('Select supports an icon-only trigger without shrinking the popover', async () => {
    await act(async () => {
      root.render(
        <Select
          variant="iconOnly"
          surface="popover"
          ariaLabel="Change type"
          displayValue={<Icon name="brackets-curly" />}
          contentMinWidth="10rem"
          options={[
            { value: 'string', label: 'String' },
            { value: 'boolean', label: 'Boolean' },
          ]}
        />,
      )
    })

    const selectRoot = container.querySelector<HTMLElement>('[data-scope="select"]')
    const trigger = container.querySelector<HTMLButtonElement>('[data-scope="select"][data-part="trigger"]')

    expect(selectRoot?.getAttribute('data-variant')).toBe('iconOnly')
    expect(trigger?.getAttribute('data-icon-only')).toBe('')
    expect(trigger?.querySelector('[data-part="indicator"]')).toBeNull()
    expect(trigger?.querySelector('.uf-select__value svg[data-icon="brackets-curly"]')).not.toBeNull()

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
    })

    const contentId = trigger?.getAttribute('aria-controls') ?? ''
    const content = document.getElementById(contentId) as HTMLElement | null
    expect(content?.getAttribute('data-select-variant')).toBe('iconOnly')
    expect(content?.style.getPropertyValue('--face-runtime-select-content-min-width')).toBe('10rem')

    const componentStyles = readFileSync(join(process.cwd(), 'assets/styles/components.css'), 'utf8')
    expect(componentStyles).toContain('.uf-select[data-scope="select"][data-variant="iconOnly"] [data-part="trigger"]')
    expect(componentStyles).toContain('[data-select-variant="iconOnly"]')
  })

  it('Input exposes the native textarea through controlRef', async () => {
    const controlRef = React.createRef<HTMLInputElement | HTMLTextAreaElement>()

    await act(async () => {
      root.render(<Input value="Note" textLayout="wrap" controlRef={controlRef} />)
    })

    expect(controlRef.current).toBeInstanceOf(HTMLTextAreaElement)
    expect(controlRef.current?.value).toBe('Note')
  })

  it('Icon wrapper renders Face UI built-ins instead of the notdef fallback', async () => {
    await act(async () => {
      root.render(<Icon name="settings" />)
    })

    const icon = container.querySelector('svg')
    expect(icon).not.toBeNull()
    expect(container.querySelector(`path[d="${settingsPath}"]`)).not.toBeNull()
    expect(container.querySelector(`path[d="${notdefPath}"]`)).toBeNull()
  })

  it('Icon wrapper renders unsupported legacy runtime names as notdef', async () => {
    await act(async () => {
      root.render(<Icon name="git" />)
    })

    const icon = container.querySelector('svg[data-icon="git"]')
    expect(icon).not.toBeNull()
    expect(icon?.querySelectorAll('path')).toHaveLength(2)

  })

  it('Icon wrapper includes the built-in browser glyph', async () => {
    await act(async () => {
      root.render(<Icon name="browser" />)
    })

    expect(container.querySelector('svg[data-icon="browser"]')).not.toBeNull()
    expect(container.querySelector(`path[d="${browserPath}"]`)).not.toBeNull()
    expect(container.querySelector(`path[d="${notdefPath}"]`)).toBeNull()
  })

  it('Icon wrapper includes the built-in chat glyph', async () => {
    await act(async () => {
      root.render(<Icon name="chat" />)
    })

    expect(container.querySelector('svg[data-icon="chat"]')).not.toBeNull()
    expect(container.querySelector(`path[d="${chatPath}"]`)).not.toBeNull()
    expect(container.querySelector(`path[d="${notdefPath}"]`)).toBeNull()
  })

  it('Icon wrapper includes the built-in folder-go glyph', async () => {
    await act(async () => {
      root.render(<Icon name="folder-go" />)
    })

    expect(container.querySelector('svg[data-icon="folder-go"]')).not.toBeNull()
    expect(container.querySelector(`path[d="${folderGoPath}"]`)).not.toBeNull()
    expect(container.querySelector(`path[d="${notdefPath}"]`)).toBeNull()
  })

  it('Icon wrapper includes the compact more glyph', async () => {
    await act(async () => {
      root.render(<Icon name="more" />)
    })

    expect(container.querySelector('svg[data-icon="more"]')).not.toBeNull()
    expect(container.querySelector(moreCenterDotSelector)).not.toBeNull()
    expect(container.querySelector(`path[d="${notdefPath}"]`)).toBeNull()
  })

  it('Icon wrapper includes the compact full glyph', async () => {
    await act(async () => {
      root.render(<Icon name="full" />)
    })

    expect(container.querySelector('svg[data-icon="full"]')).not.toBeNull()
    expect(container.querySelector(`path[d="${fullPath}"]`)).not.toBeNull()
    expect(container.querySelector(`path[d="${notdefPath}"]`)).toBeNull()
  })

  it('Icon wrapper includes the built-in part glyph', async () => {
    await act(async () => {
      root.render(<Icon name="part" />)
    })

    expect(container.querySelector('svg[data-icon="part"]')).not.toBeNull()
    expect(container.querySelector(`path[d="${partPath}"]`)).not.toBeNull()
    expect(container.querySelector(`path[d="${notdefPath}"]`)).toBeNull()
  })

  it('Icon wrapper includes the built-in mic glyph', async () => {
    await act(async () => {
      root.render(<Icon name="mic" />)
    })

    expect(container.querySelector('svg[data-icon="mic"]')).not.toBeNull()
    expect(container.querySelector(`path[d="${micPath}"]`)).not.toBeNull()
    expect(container.querySelector(`path[d="${notdefPath}"]`)).toBeNull()
  })

  it('Icon wrapper includes sidebar layout state glyphs', async () => {
    await act(async () => {
      root.render(
        <>
          <Icon name="layout-sidebar-left" />
          <Icon name="layout-sidebar-left-open" />
          <Icon name="layout-sidebar-right" />
          <Icon name="layout-sidebar-right-open" />
        </>
      )
    })

    expect(container.querySelector('svg[data-icon="layout-sidebar-left"]')).not.toBeNull()
    expect(container.querySelector('svg[data-icon="layout-sidebar-left-open"]')).not.toBeNull()
    expect(container.querySelector('svg[data-icon="layout-sidebar-right"]')).not.toBeNull()
    expect(container.querySelector('svg[data-icon="layout-sidebar-right-open"]')).not.toBeNull()
    expect(container.querySelector(`path[d="${sidebarLeftClosedPath}"]`)).not.toBeNull()
    expect(container.querySelector(`path[d="${notdefPath}"]`)).toBeNull()
  })

  it('Icon wrapper includes main-window expand and save glyphs', async () => {
    await act(async () => {
      root.render(
        <>
          <Icon name="arrow_expand_simple" />
          <Icon name="arrows_contract_simple" />
          <Icon name="floppy-disk" />
        </>
      )
    })

    expect(container.querySelector('svg[data-icon="arrow_expand_simple"]')).not.toBeNull()
    expect(container.querySelector('svg[data-icon="arrows_contract_simple"]')).not.toBeNull()
    expect(container.querySelector('svg[data-icon="floppy-disk"]')).not.toBeNull()
    expect(container.querySelector(`path[d="${notdefPath}"]`)).toBeNull()
  })

  it('Icon wrapper always uses the single 20x20 library size', async () => {
    await act(async () => {
      root.render(<Icon name="crop" />)
    })

    let icon = container.querySelector('svg[data-icon="crop"]')
    expect(icon?.getAttribute('width')).toBe('20')
    expect(icon?.getAttribute('height')).toBe('20')
    expect(icon?.getAttribute('viewBox')).toBe('0 0 10 20')

    await act(async () => {
      root.render(<Icon name="random" />)
    })

    icon = container.querySelector('svg[data-icon="random"]')
    expect(icon?.getAttribute('width')).toBe('20')
    expect(icon?.getAttribute('height')).toBe('20')

    expect(icon?.querySelectorAll('path')).toHaveLength(2)
  })

  it('Media defaults to iframe-width layout with auto image height', async () => {
    await act(async () => {
      root.render(<Media src="https://example.com/image.jpg" alt="Preview" />)
    })

    const media = container.querySelector('[data-scope="media"][data-part="root"]') as HTMLElement | null
    const img = container.querySelector('img') as HTMLImageElement | null
    const componentStyles = readFileSync(join(process.cwd(), 'assets/styles/components.css'), 'utf8')
    expect(media).not.toBeNull()
    expect(media?.style.width).toBe('100%')
    expect(img).not.toBeNull()
    expect(img?.style.width).toBe('100%')
    expect(img?.style.height).toBe('auto')
    expect(componentStyles).toContain('.uf-media[data-scope] {')
    expect(componentStyles).toContain('display: flex;')
    expect(componentStyles).toContain('width: 100%;')
    const runtimeSource = readFileSync(join(process.cwd(), 'uf.runtime.ts'), 'utf8')
    expect(runtimeSource).toContain("'Media'")
  })

  it('Media exposes wrapper aria-label when a role is provided', async () => {
    await act(async () => {
      root.render(
        <Media
          src="https://example.com/image.jpg"
          alt="Preview"
          role="img"
          ariaLabel="Architecture preview"
        />,
      )
    })

    const media = container.querySelector('[data-scope="media"][data-part="root"]') as HTMLElement | null
    const img = container.querySelector('img') as HTMLImageElement | null
    expect(media?.getAttribute('role')).toBe('img')
    expect(media?.getAttribute('aria-label')).toBe('Architecture preview')
    expect(img?.getAttribute('alt')).toBe('Preview')
  })

  it('Media can opt into the system membrane without forcing it by default', async () => {
    await act(async () => {
      root.render(
        <>
          <Media src="https://example.com/default.jpg" alt="Default media" />
          <Media src="https://example.com/membrane.jpg" alt="Membrane media" width="100%" membrane />
        </>,
      )
    })

    const mediaNodes = Array.from(container.querySelectorAll('[data-scope="media"][data-part="root"]')) as HTMLElement[]
    expect(mediaNodes).toHaveLength(2)
    expect(mediaNodes[0]?.parentElement?.classList.contains('uf-membrane')).toBe(false)
    expect(mediaNodes[1]?.parentElement?.classList.contains('uf-membrane')).toBe(true)
    expect(mediaNodes[1]?.parentElement?.classList.contains('uf-mediaMembrane')).toBe(true)
    expect(mediaNodes[1]?.parentElement?.classList.contains('uf-membrane--full')).toBe(true)
  })

  it('Media clears a previous load error when its source changes', async () => {
    await act(async () => {
      root.render(
        <Media
          src="https://example.com/broken.jpg"
          alt="Broken preview"
          fallback={<span>Unavailable</span>}
        />,
      )
    })

    const brokenImage = container.querySelector('img') as HTMLImageElement | null
    await act(async () => {
      brokenImage?.dispatchEvent(new Event('error', { bubbles: true }))
    })
    expect(container.textContent).toContain('Unavailable')

    await act(async () => {
      root.render(
        <Media
          src="https://example.com/recovered.jpg"
          alt="Recovered preview"
          fallback={<span>Unavailable</span>}
        />,
      )
    })

    expect(container.querySelector('img')?.getAttribute('src')).toBe('https://example.com/recovered.jpg')
    expect(container.textContent).not.toContain('Unavailable')
  })

  it('Checkbox keeps its hidden input out of the focus order and visible to a11y APIs', async () => {
    await act(async () => {
      root.render(<Checkbox label="Checkbox" defaultChecked />)
    })

    const input = container.querySelector('.uf-checkbox input[type="checkbox"]') as HTMLInputElement | null
    expect(input).not.toBeNull()
    expect(input?.getAttribute('aria-hidden')).toBeNull()
    expect(input?.tabIndex).toBe(-1)
  })

  it('Checkbox toggles correctly from a controlled checked initial state', async () => {
    const handleCheckedChange = vi.fn()

    function Harness() {
      const [checked, setChecked] = React.useState<boolean | 'indeterminate'>(true)
      return (
        <Checkbox
          checked={checked}
          onCheckedChange={({ checked: nextChecked }) => {
            handleCheckedChange(nextChecked)
            setChecked(nextChecked)
          }}
        />
      )
    }

    await act(async () => {
      root.render(<Harness />)
    })

    const input = container.querySelector('.uf-checkbox input[type="checkbox"]') as HTMLInputElement | null
    const control = container.querySelector('[data-scope="checkbox"][data-part="control"]') as HTMLElement | null
    expect(input?.checked).toBe(true)

    await act(async () => {
      control?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    })

    expect(handleCheckedChange).toHaveBeenCalledWith(false)
    expect(input?.checked).toBe(false)
  })

  it('Checkbox toggles in uncontrolled mode from the visible control and label text', async () => {
    await act(async () => {
      root.render(<Checkbox label="Receive updates" defaultChecked={false} />)
    })

    const control = container.querySelector('[data-scope="checkbox"][data-part="control"]') as HTMLElement | null
    const label = container.querySelector('[data-scope="checkbox"][data-part="label"]') as HTMLElement | null
    const input = container.querySelector('.uf-checkbox input[type="checkbox"]') as HTMLInputElement | null

    expect(control?.getAttribute('aria-checked')).toBe('false')
    expect(input?.checked).toBe(false)

    await act(async () => {
      control?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    })

    expect(control?.getAttribute('aria-checked')).toBe('true')
    expect(input?.checked).toBe(true)

    await act(async () => {
      label?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    })

    expect(control?.getAttribute('aria-checked')).toBe('false')
    expect(input?.checked).toBe(false)

    const rootLabel = container.querySelector('.uf-checkbox') as HTMLLabelElement | null
    await act(async () => {
      rootLabel?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    })

    expect(control?.getAttribute('aria-checked')).toBe('true')
    expect(input?.checked).toBe(true)
  })

  it('Separator keeps decorative dividers hidden from landmarks and exposes semantic separators on demand', async () => {
    await act(async () => {
      root.render(
        <>
          <Separator />
          <Separator decorative={false} orientation="vertical" membrane={false} />
        </>,
      )
    })

    const wrapper = container.querySelector('.uf-separator-membrane') as HTMLElement | null
    const separators = Array.from(container.querySelectorAll<HTMLElement>('.uf-separator[data-scope]'))
    const decorative = separators[0]
    const semantic = separators[1]

    expect(wrapper).not.toBeNull()
    expect(wrapper?.classList.contains('uf-membrane--full')).toBe(true)
    expect(decorative?.getAttribute('data-orientation')).toBe('horizontal')
    expect(decorative?.getAttribute('role')).toBe('none')
    expect(decorative?.getAttribute('aria-orientation')).toBeNull()
    expect(semantic?.getAttribute('role')).toBe('separator')
    expect(semantic?.getAttribute('aria-orientation')).toBe('vertical')
    expect(semantic?.getAttribute('data-orientation')).toBe('vertical')

    const componentStyles = readFileSync(join(process.cwd(), 'assets/styles/components.css'), 'utf8')
    const tokenStyles = readFileSync(join(process.cwd(), 'assets/styles/tokens.css'), 'utf8')
    const galleryMetaSource = readFileSync(join(process.cwd(), 'utils/__generated__/render_gallery.meta.generated.ts'), 'utf8')
    const runtimeSource = readFileSync(join(process.cwd(), 'uf.runtime.ts'), 'utf8')
    expect(componentStyles).toContain('.uf-separator-membrane {')
    expect(tokenStyles).toContain('--uf-border-width-thin: 1px;')
    expect(tokenStyles).toContain('--uf-separator-line-width: var(--uf-border-width-thin);')
    expect(componentStyles).not.toContain('--uf-separator-line-width: var(--uf-membrane);')
    expect(componentStyles).toContain('inline-size: 100%;')
    expect(componentStyles).toMatch(/\.uf-separator\[data-scope\] \{[\s\S]*?padding: 0;[\s\S]*?\}/)
    expect(componentStyles).toMatch(
      /\.uf-separator\[data-scope\]\[data-orientation="horizontal"\] \{[\s\S]*?height: var\(--uf-separator-line-width\);[\s\S]*?background: var\(--uf-color-border\);[\s\S]*?\}/,
    )
    expect(componentStyles).toMatch(
      /\.uf-separator\[data-scope\]\[data-orientation="vertical"\] \{[\s\S]*?width: var\(--uf-separator-line-width\);[\s\S]*?border-left: none;[\s\S]*?background: var\(--uf-color-border\);[\s\S]*?\}/,
    )
    expect(componentStyles).toContain('padding: 0 var(--uf-control-pad-text);')
    expect(componentStyles).toContain('flex: 1 1 100%;')
    expect(componentStyles).toContain('justify-self: stretch;')
    expect(componentStyles).not.toContain('.uf-gallery-itemSurface:has(> .uf-separator-membrane),')
    expect(componentStyles).toContain('.uf-gallery-itemSurface > .uf-separator-membrane')
    expect(galleryMetaSource).toContain('name: "Separator"')
    expect(galleryMetaSource).toContain('sampleProps: {"orientation":"horizontal","decorative":true,"membrane":true}')
    expect(runtimeSource).toContain("maxWidth: '100%'")
    expect(runtimeSource).toContain("fullFrameComponents: ['face-ui-react']")
    expect(runtimeSource).toContain("fullWidthComponents: ['face-ui-react', 'Accordion', 'Card', 'Carousel', 'Code', 'Media', 'Modal', 'Progress', 'Scroll', 'Separator', 'Slider', 'Table', 'Toc', 'Tree']")
  })

  it('Scroll exposes a focusable labelled region with a contextual aria label', async () => {
    await act(async () => {
      root.render(
        <Scroll orientation="both" height="12rem" ariaLabel="Token audit log">
          <div>Audit row</div>
        </Scroll>,
      )
    })

    const rootNode = container.querySelector('[data-scope="scroll"][data-part="root"]') as HTMLElement | null
    const viewport = container.querySelector('[data-scope="scroll"][data-part="viewport"]') as HTMLElement | null

    expect(rootNode?.getAttribute('data-orientation')).toBe('both')
    expect(rootNode?.style.height).toBe('12rem')
    expect(viewport?.getAttribute('role')).toBe('region')
    expect(viewport?.getAttribute('aria-label')).toBe('Token audit log')
    expect(viewport?.tabIndex).toBe(0)
    expect(viewport?.style.overflowX).toBe('auto')
    expect(viewport?.style.overflowY).toBe('auto')
  })

  it('Scroll renders plain content through a membraned Text surface inside the scroll card', async () => {
    await act(async () => {
      root.render(
        <Scroll ariaLabel="Literary excerpt">
          Вечером в доме стало тихо.
        </Scroll>,
      )
    })

    const rootNode = container.querySelector('[data-scope="scroll"][data-part="root"]') as HTMLElement | null
    const text = container.querySelector('[data-scope="text"].uf-scroll__text') as HTMLElement | null
    const membrane = container.querySelector('[data-scope="scroll"] [data-part="viewport"] > .uf-membrane.uf-membrane--full') as HTMLElement | null
    const componentStyles = readFileSync(join(process.cwd(), 'assets/styles/components.css'), 'utf8')

    expect(rootNode?.style.height).toBe('240px')
    expect(rootNode?.getAttribute('data-border')).toBe('true')
    expect(membrane).not.toBeNull()
    expect(text?.getAttribute('data-membrane')).toBe('')
    expect(text?.getAttribute('data-inset')).toBe('control')
    expect(text?.textContent).toBe('Вечером в доме стало тихо.')
    const componentTokens = readFileSync(join(process.cwd(), 'assets/styles/component-tokens.css'), 'utf8')
    expect(componentTokens).toContain('--uf-scroll-card-inset: var(--uf-card-padding-default);')
    expect(componentStyles).toContain('padding: var(--uf-scroll-card-inset);')
  })

  it('Tile preserves button-like keyboard semantics and nested action isolation', async () => {
    const handleTileClick = vi.fn()
    const handleActionClick = vi.fn()

    await act(async () => {
      root.render(
        <Tile
          text="Project map"
          rightText="Ready"
          icon="file"
          active
          onClick={handleTileClick}
          actions={<Button text="More" onClick={handleActionClick} />}
        />,
      )
    })

    const tile = container.querySelector('[data-scope="tile"][data-part="root"]') as HTMLElement | null
    const action = container.querySelector('[data-scope="tile"][data-part="actions"] button') as HTMLButtonElement | null

    expect(tile?.getAttribute('role')).toBe('button')
    expect(tile?.tabIndex).toBe(0)
    expect(tile?.getAttribute('aria-disabled')).toBeNull()
    expect(tile?.getAttribute('data-active')).toBe('')
    expect(tile?.querySelector('[data-scope="text"]')).not.toBeNull()
    expect(tile?.textContent).toContain('Project map')
    expect(tile?.textContent).toContain('Ready')
    expect(action?.textContent).toContain('More')

    await act(async () => {
      tile?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      tile?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      tile?.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
    })

    expect(handleTileClick).toHaveBeenCalledTimes(3)

    await act(async () => {
      action?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(handleActionClick).toHaveBeenCalledTimes(1)
    expect(handleTileClick).toHaveBeenCalledTimes(3)

    await act(async () => {
      const enterFromAction = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
      const spaceFromAction = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true })
      expect(action?.dispatchEvent(enterFromAction)).toBe(true)
      expect(action?.dispatchEvent(spaceFromAction)).toBe(true)
    })

    expect(handleTileClick).toHaveBeenCalledTimes(3)

    await act(async () => {
      root.render(
        <Tile onClick={handleTileClick}>
          <input aria-label="Project name" defaultValue="Project" />
        </Tile>,
      )
    })

    const nestedInput = container.querySelector('input[aria-label="Project name"]') as HTMLInputElement | null
    await act(async () => {
      const spaceFromInput = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true })
      expect(nestedInput?.dispatchEvent(spaceFromInput)).toBe(true)
    })

    expect(handleTileClick).toHaveBeenCalledTimes(3)

    await act(async () => {
      root.render(<Tile text="Disabled project" disabled onClick={handleTileClick} />)
    })

    const disabledTile = container.querySelector('[data-scope="tile"][data-part="root"]') as HTMLElement | null
    expect(disabledTile?.tabIndex).toBe(-1)
    expect(disabledTile?.getAttribute('aria-disabled')).toBe('true')

    await act(async () => {
      disabledTile?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      disabledTile?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })

    expect(handleTileClick).toHaveBeenCalledTimes(3)
  })

  it('Tile owns ellipsis behavior for constrained text slots', async () => {
    await act(async () => {
      root.render(
        <Tile
          text="A very long navigation item name that must not expand the tile"
          rightText="Ready"
          icon="file"
          style={{ width: '5rem' }}
        />,
      )
    })

    const tile = container.querySelector('[data-scope="tile"][data-part="root"]') as HTMLElement | null
    const textSlot = tile?.querySelector('[data-scope="tile"][data-part="text"]') as HTMLElement | null
    const label = tile?.querySelector('.uf-tile__label') as HTMLElement | null

    expect(tile?.getAttribute('data-truncate')).toBe('')
    expect(textSlot?.getAttribute('data-truncate')).toBe('')
    expect(label?.textContent).toContain('A very long navigation item name')

    await act(async () => {
      root.render(
        <Tile style={{ width: '5rem' }}>
          <Button icon="file" iconOnly aria-label="File" />
          <Text as="span" inset="none" membrane truncate>
            A very long composed tile label that must shrink
          </Text>
        </Tile>,
      )
    })

    const composedSlot = container.querySelector('[data-scope="tile"][data-part="text"]') as HTMLElement | null
    expect(composedSlot?.tagName).toBe('SPAN')
    expect(composedSlot?.getAttribute('data-truncate')).toBe('')
    expect(composedSlot?.querySelector('.uf-membrane--truncate')).not.toBeNull()

    const tileStyles = readFileSync(join(process.cwd(), 'assets/styles/components.css'), 'utf8')
    expect(tileStyles).toContain('[data-scope="tile"] [data-part="text"] > .uf-membrane--truncate')
    expect(tileStyles).toContain('[data-scope="tile"] [data-part="text"] > .uf-membrane:not(.uf-membrane--truncate)')
    expect(tileStyles).toContain('text-overflow: ellipsis;')
  })

  it('Tile applies Button-like icon inset only for its own icon slot', async () => {
    await act(async () => {
      root.render(<Tile icon="file" text="Page title" />)
    })

    const iconTile = container.querySelector('[data-scope="tile"][data-part="root"]') as HTMLElement | null
    expect(iconTile?.getAttribute('data-icon-left')).toBe('')
    expect(iconTile?.querySelector('[data-scope="tile"][data-part="icon"]')).not.toBeNull()

    await act(async () => {
      root.render(
        <Tile
          leading={<Button icon="folder" iconOnly aria-label="Open folder" />}
          actions={<Button icon="plus" iconOnly aria-label="Add" />}
        >
          Folder
        </Tile>,
      )
    })

    const nestedButtonTile = container.querySelector('[data-scope="tile"][data-part="root"]') as HTMLElement | null
    expect(nestedButtonTile?.hasAttribute('data-icon-left')).toBe(false)
    expect(nestedButtonTile?.hasAttribute('data-icon-right')).toBe(false)
    expect(nestedButtonTile?.querySelector('[data-scope="tile"][data-part="leading"] button[data-scope="button"]')).not.toBeNull()
    expect(nestedButtonTile?.querySelector('[data-scope="tile"][data-part="actions"] button[data-scope="button"]')).not.toBeNull()
  })

  it('Tile exposes the app row taxonomy without local class contracts', async () => {
    const handleTileClick = vi.fn()
    const handleLeadingClick = vi.fn()

    await act(async () => {
      root.render(
        <Tile
          intent="disclosure"
          tone="muted"
          selectedDescendant
          busy
          selector
          selectorOpen={false}
          actionVisibility="always"
          leading={<Button icon="folder" iconOnly onClick={handleLeadingClick} />}
          meta={<span>3</span>}
          actions={<Button icon="plus" iconOnly />}
          onClick={handleTileClick}
        >
          Workspaces
        </Tile>,
      )
    })

    const tile = container.querySelector('[data-scope="tile"][data-part="root"]') as HTMLElement | null
    const text = tile?.querySelector('[data-scope="tile"][data-part="text"]') as HTMLElement | null
    const leading = tile?.querySelector('[data-scope="tile"][data-part="leading"]') as HTMLElement | null
    const meta = tile?.querySelector('[data-scope="tile"][data-part="meta"]') as HTMLElement | null

    expect(tile?.getAttribute('data-intent')).toBe('disclosure')
    expect(tile?.getAttribute('data-density')).toBe('default')
    expect(tile?.getAttribute('data-tone')).toBe('muted')
    expect(tile?.getAttribute('data-action-visibility')).toBe('always')
    expect(tile?.getAttribute('data-selected-descendant')).toBe('')
    expect(tile?.getAttribute('data-busy')).toBe('')
    expect(tile?.getAttribute('aria-busy')).toBe('true')
    expect(text?.textContent).toContain('Workspaces')
    expect(leading).not.toBeNull()
    expect(meta?.textContent).toBe('3')

    await act(async () => {
      leading?.querySelector('button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(handleLeadingClick).toHaveBeenCalledTimes(1)
    expect(handleTileClick).not.toHaveBeenCalled()

    await act(async () => {
      tile?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(handleTileClick).toHaveBeenCalledTimes(1)
  })

  it('Tile section intent can render non-interactive headings', async () => {
    await act(async () => {
      root.render(
        <Tile intent="section" interactive={false}>
          Collections
        </Tile>,
      )
    })

    const tile = container.querySelector('[data-scope="tile"][data-part="root"]') as HTMLElement | null
    const text = tile?.querySelector('[data-scope="tile"][data-part="text"]') as HTMLElement | null
    const membrane = tile?.parentElement as HTMLElement | null

    expect(tile?.getAttribute('data-intent')).toBe('section')
    expect(tile?.hasAttribute('data-interactive')).toBe(false)
    expect(tile?.getAttribute('role')).toBeNull()
    expect(tile?.getAttribute('tabindex')).toBeNull()
    expect(membrane?.classList.contains('uf-membrane')).toBe(true)
    expect(membrane?.hasAttribute('data-membrane-interactive')).toBe(false)
    expect(text?.textContent).toContain('Collections')
  })

  it('Tile selector mode renders the selector indicator inside the text slot', async () => {
    await act(async () => {
      root.render(<Tile text="Project" icon="folder" selector selectorOpen />)
    })

    const tile = container.querySelector('[data-scope="tile"][data-selector]') as HTMLElement | null
    const textSlot = tile?.querySelector('[data-scope="tile"][data-part="text"]') as HTMLElement | null
    const indicator = textSlot?.querySelector('[data-part="indicator"] svg[data-icon="select-chevron-up"]')

    expect(tile?.getAttribute('data-stretch-text')).toBeNull()
    expect(textSlot?.textContent).toContain('Project')
    expect(indicator).not.toBeNull()

    await act(async () => {
      root.render(
        <Tile selector selectorOpen>
          <span className="custom-label">Properties</span>
        </Tile>,
      )
    })

    const customTextSlot = container.querySelector('[data-scope="tile"][data-part="text"]') as HTMLElement | null
    const labelSlot = customTextSlot?.querySelector('.uf-tile__labelSlot') as HTMLElement | null

    expect(customTextSlot?.textContent).toContain('Properties')
    expect(labelSlot?.querySelector('.custom-label')?.textContent).toBe('Properties')
    expect(customTextSlot?.querySelector('[data-part="indicator"] svg[data-icon="select-chevron-up"]')).not.toBeNull()
  })

  it('Carousel advances in uncontrolled mode', async () => {
    await act(async () => {
      root.render(
        <Carousel defaultIndex={0}>
          <div>Slide A</div>
          <div>Slide B</div>
          <div>Slide C</div>
        </Carousel>,
      )
    })

    const slideA = container.querySelector('[data-part="slide"][data-index="0"]') as HTMLElement | null
    const slideB = container.querySelector('[data-part="slide"][data-index="1"]') as HTMLElement | null
    const nextButton = container.querySelector('[data-scope="button"][data-part="next"]') as HTMLButtonElement | null
    const inactiveIndicator = container.querySelector('[data-scope="button"][data-part="indicator-item"][data-state="inactive"] svg[data-icon="radio-off"]')

    expect(slideA?.getAttribute('data-current')).toBe('')
    expect(slideB?.hasAttribute('data-current')).toBe(false)
    expect(nextButton).not.toBeNull()
    expect(inactiveIndicator).not.toBeNull()

    await act(async () => {
      nextButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(slideA?.hasAttribute('data-current')).toBe(false)
    expect(slideB?.getAttribute('data-current')).toBe('')
  })

  it('Carousel data slides use responsive Media and button-scoped controls', async () => {
    await act(async () => {
      root.render(
        <Carousel
          ariaLabel="Office gallery"
          defaultIndex={0}
          slides={[
            { src: '/assets/media/examples/office-core/lobby-day.webp', alt: 'Office lobby' },
            { src: '/assets/media/examples/office-core/lobby-glass-blocks.webp', alt: 'Glass-block lobby' },
          ]}
        />,
      )
    })

    const rootNode = container.querySelector<HTMLElement>('[data-scope="carousel"]')
    const viewport = container.querySelector<HTMLElement>('[data-scope="carousel"][data-part="viewport"]')
    const controls = container.querySelector<HTMLElement>('.uf-carousel-controls')
    const mediaSlide = container.querySelector<HTMLElement>('[data-scope="media"].uf-carousel-slideMedia')
    const mediaMembrane = mediaSlide?.parentElement
    const prevSlot = container.querySelector<HTMLElement>('.uf-carousel-navSlot--prev')
    const nextSlot = container.querySelector<HTMLElement>('.uf-carousel-navSlot--next')
    const indicators = container.querySelector<HTMLElement>('.uf-carousel-indicators')
    const prevButton = container.querySelector<HTMLButtonElement>('[data-scope="button"][data-part="prev"]')
    const nextButton = container.querySelector<HTMLButtonElement>('[data-scope="button"][data-part="next"]')
    const indicatorButtons = Array.from(container.querySelectorAll<HTMLButtonElement>('[data-scope="button"][data-part="indicator-item"]'))
    const mediaImage = mediaSlide?.querySelector<HTMLImageElement>('img')
    const activeIndicator = container.querySelector<HTMLElement>('[data-scope="button"][data-part="indicator-item"][data-state="active"] svg[data-icon="radio-on"]')
    const inactiveIndicator = container.querySelector<HTMLElement>('[data-scope="button"][data-part="indicator-item"][data-state="inactive"] svg[data-icon="radio-off"]')

    expect(rootNode).not.toBeNull()
    expect(rootNode?.getAttribute('aria-label')).toBe('Office gallery')
    expect(viewport).not.toBeNull()
    expect(controls).not.toBeNull()
    expect(viewport?.nextElementSibling).toBe(controls)
    expect(mediaSlide).not.toBeNull()
    expect(mediaImage?.getAttribute('src')).toBe('/assets/media/examples/office-core/lobby-day.webp')
    expect(mediaMembrane?.classList.contains('uf-membrane')).toBe(true)
    expect(mediaMembrane?.classList.contains('uf-mediaMembrane')).toBe(true)
    expect(prevSlot?.contains(prevButton)).toBe(true)
    expect(nextSlot?.contains(nextButton)).toBe(true)
    expect(controls?.contains(indicators)).toBe(true)
    expect(prevButton?.parentElement?.classList.contains('uf-membrane')).toBe(true)
    expect(nextButton).not.toBeNull()
    expect(nextButton?.parentElement?.classList.contains('uf-membrane')).toBe(true)
    expect(indicatorButtons.length).toBeGreaterThan(0)
    expect(indicatorButtons.every((button) => button.parentElement?.classList.contains('uf-membrane'))).toBe(true)
    expect(activeIndicator).not.toBeNull()
    expect(inactiveIndicator).not.toBeNull()

    const componentStyles = readFileSync(join(process.cwd(), 'assets/styles/components.css'), 'utf8')
    expect(componentStyles).toContain('background: transparent;')
    expect(componentStyles).toContain('border: none;')
    expect(componentStyles).toContain('.uf-carousel-controls')
    expect(componentStyles).toContain('grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);')
    expect(componentStyles).toContain('.uf-carousel-navSlot--prev')
    expect(componentStyles).toContain('.uf-carousel-navSlot--next')
    expect(componentStyles).toContain('position: static;')
    expect(componentStyles).toContain('max-width: calc(100% / var(--face-runtime-carousel-slides-per-view, 1));')
    expect(componentStyles).toContain('.uf-carousel-indicators')
    expect(componentStyles).toContain('gap: 0;')
  })

  it('Carousel does not ship product-specific fallback slides', async () => {
    await act(async () => {
      root.render(<Carousel />)
    })

    expect(container.querySelector('[data-scope="media"]')).toBeNull()
    expect(container.querySelectorAll('[data-part="slide"]')).toHaveLength(0)
    expect(container.querySelectorAll('[data-part="indicator-item"]')).toHaveLength(0)
  })

  it('Command updates its query and selects a clicked item in uncontrolled mode', async () => {
    const handleSelect = vi.fn()

    await act(async () => {
      root.render(
        <Command
          defaultValue=""
          items={[
            { id: 'copy', label: 'Copy' },
            { id: 'paste', label: 'Paste' },
            { id: 'cut', label: 'Cut' },
          ]}
          onSelect={handleSelect}
        />,
      )
    })

    const input = container.querySelector('[role="combobox"]') as HTMLInputElement | null
    expect(input).not.toBeNull()
    expect(container.textContent).toContain('Copy')
    expect(container.textContent).toContain('Paste')

    await act(async () => {
      if (!input) return
      setNativeInputValue(input, 'pa')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })

    expect(input?.value).toBe('pa')
    expect(container.textContent).not.toContain('Copy')
    expect(container.textContent).toContain('Paste')

    const pasteButton = Array.from(container.querySelectorAll<HTMLButtonElement>('.uf-command-item')).find((button) => button.textContent?.includes('Paste')) ?? null
    expect(pasteButton).not.toBeNull()

    await act(async () => {
      pasteButton?.dispatchEvent(new Event('pointerdown', { bubbles: true }))
      pasteButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(handleSelect).toHaveBeenCalledTimes(1)
    const selected = handleSelect.mock.calls.at(-1)?.[0] as { item?: { id?: string } } | undefined
    expect(selected?.item?.id).toBe('paste')

    await act(async () => {
      pasteButton?.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
    })

    const highlightedItems = Array.from(container.querySelectorAll<HTMLElement>('.uf-command-item[data-highlighted]'))
    expect(highlightedItems).toHaveLength(1)
    expect(highlightedItems[0]?.textContent).toContain('Paste')
  })

  it('Code uses Text for the title and membrane-wrapped action buttons', async () => {
    await act(async () => {
      root.render(
        <Code
          title="Files / Playground"
          code={'const answer = 42\n'.repeat(12)}
          defaultCollapsed
        />,
      )
    })

    const title = container.querySelector('.uf-code-title[data-scope="text"]') as HTMLElement | null
    const codeRoot = container.querySelector('[data-scope="code"][data-part="root"]') as HTMLElement | null
    expect(codeRoot?.getAttribute('data-border')).toBe('true')
    expect(codeRoot?.getAttribute('data-card-variant')).toBe('code')
    expect(codeRoot?.getAttribute('data-full-width')).toBe('')
    expect(title?.textContent).toContain('Files / Playground')

    const actions = Array.from(container.querySelectorAll<HTMLButtonElement>('.uf-code-action[data-scope="button"]'))
    expect(actions.length).toBeGreaterThan(0)
    expect(actions.every((button) => button.closest('.uf-membrane') != null)).toBe(true)
  })

  it('Code treats tokenizedLines as a complete source when raw code is omitted', async () => {
    const tokenizedLines = Array.from({ length: 9 }, (_, index) => [
      { content: `const value${index + 1} = ${index + 1}`, color: 'currentColor' },
    ])

    await act(async () => {
      root.render(
        <Code
          tokenizedLines={tokenizedLines}
          showLineNumbers
          defaultCollapsed
        />,
      )
    })

    const lines = container.querySelectorAll('[data-scope="code"][data-part="line"]')
    const pre = container.querySelector('[data-scope="code"][data-part="pre"]') as HTMLElement | null

    expect(lines).toHaveLength(9)
    expect(lines[8]?.textContent).toContain('const value9 = 9')
    expect(pre?.classList.contains('is-collapsed')).toBe(true)
    expect(container.querySelector('[aria-label="Copy code"]')).not.toBeNull()
    expect(container.querySelector('[aria-label="Expand code"]')).not.toBeNull()
  })

  it('Modal opens from trigger and closes from close button', async () => {
    await act(async () => {
      root.render(
        <Modal trigger="Open modal" title="Smoke modal">
          Modal content
        </Modal>,
      )
    })

    const trigger = Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.includes('Open modal'))
    const content = document.body.querySelector('[data-scope="modal"][data-part="content"]') as HTMLElement | null

    expect(trigger).not.toBeNull()
    expect(content?.hidden).toBe(true)

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(content?.hidden).toBe(false)
    expect(document.body.textContent).toContain('Smoke modal')

    const closeButton = document.body.querySelector('[data-scope="modal"][data-part="close"]') as HTMLButtonElement | null
    expect(closeButton).not.toBeNull()

    await act(async () => {
      closeButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(content?.hidden).toBe(true)
  })

  it('Modal renders as a bounded open dialog without compatibility aliases', async () => {
    await act(async () => {
      root.render(
        <Modal
          open
          portal={false}
          title="Preview modal"
        >
          Visible preview content
        </Modal>,
      )
    })

    const content = container.querySelector('[data-scope="modal"][data-part="content"]') as HTMLElement | null
    const runtimeSource = readFileSync(join(process.cwd(), 'uf.runtime.ts'), 'utf8')
    expect(content).not.toBeNull()
    expect(content?.hidden).toBe(false)
    expect(content?.classList.contains('uf-card')).toBe(true)
    expect(content?.getAttribute('data-card-variant')).toBe('default')
    expect(content?.getAttribute('data-border')).toBe('true')
    expect(content?.getAttribute('data-radius')).toBe('lg')
    expect(container.textContent).toContain('Preview modal')
    expect(container.textContent).toContain('Visible preview content')
    expect(runtimeSource).toContain("'Modal'")
  })

  it('Modal keeps inset edge surfaces rounded and bordered', async () => {
    await act(async () => {
      root.render(
        <Modal open portal={false} placement="bottom" title="Bottom modal">
          Modal content
        </Modal>,
      )
    })

    const content = container.querySelector('[data-scope="modal"][data-part="content"]') as HTMLElement | null
    expect(content).not.toBeNull()
    expect(content?.classList.contains('uf-card')).toBe(true)
    expect(content?.classList.contains('uf-modal--edge-inset')).toBe(true)
    expect(content?.getAttribute('data-edge')).toBe('inset')
    expect(content?.getAttribute('data-card-variant')).toBe('default')
    expect(content?.getAttribute('data-border')).toBe('true')
    expect(content?.getAttribute('data-radius')).toBe('lg')
  })

  it('Modal disables the Card border for flush square edge surfaces', async () => {
    await act(async () => {
      root.render(
        <Modal open portal={false} placement="right" edge="flush" title="Right modal">
          Modal content
        </Modal>,
      )
    })

    const content = container.querySelector('[data-scope="modal"][data-part="content"]') as HTMLElement | null
    expect(content).not.toBeNull()
    expect(content?.classList.contains('uf-card')).toBe(true)
    expect(content?.classList.contains('uf-modal--edge-flush')).toBe(true)
    expect(content?.getAttribute('data-radius')).toBe('none')
    expect(content?.getAttribute('data-edge')).toBe('flush')
    expect(content?.getAttribute('data-border')).toBe('false')
  })

  it('Toast renders a production notification surface without demo scaffolding', async () => {
    const onDismiss = vi.fn()
    await act(async () => {
      root.render(
        <Toast
          title="Deployment completed"
          description="Production is healthy."
          tone="positive"
          action={{ label: 'View release' }}
          onDismiss={onDismiss}
        />,
      )
    })

    const toast = container.querySelector<HTMLElement>('.uf-toast[data-scope="toast"]')
    const close = container.querySelector<HTMLButtonElement>('.uf-toast-close')
    const action = Array.from(container.querySelectorAll<HTMLButtonElement>('button'))
      .find((button) => button.textContent?.includes('View release')) ?? null

    expect(toast?.getAttribute('role')).toBe('status')
    expect(toast?.getAttribute('aria-atomic')).toBe('true')
    expect(toast?.getAttribute('data-tone')).toBe('positive')
    expect(toast?.textContent).toContain('Deployment completed')
    expect(toast?.textContent).toContain('Production is healthy.')
    expect(container.querySelector('.uf-toast-demo')).toBeNull()
    expect(close).not.toBeNull()
    expect(action).not.toBeNull()
    await act(async () => {
      close?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(onDismiss).toHaveBeenCalledTimes(1)

    const componentStyles = readFileSync(join(process.cwd(), 'assets/styles/components.css'), 'utf8')
    expect(componentStyles).toContain('z-index: var(--uf-z-toast);')
    expect(componentStyles).toContain('.uf-toast[data-scope][data-tone="positive"]')
  })

  it('Navigation changes the active item in uncontrolled mode', async () => {
    await act(async () => {
      root.render(
        <Navigation
          defaultActiveId="home"
          items={[
            { id: 'home', label: 'Home' },
            { id: 'about', label: 'About' },
            { id: 'contact', label: 'Contact' },
          ]}
        />,
      )
    })

    const about = Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find((button) => button.textContent?.includes('About')) ?? null
    expect(about).not.toBeNull()
    expect(about?.getAttribute('data-variant')).toBe('ghost')

    await act(async () => {
      about?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(about?.getAttribute('data-variant')).toBe('default')
  })

  it('Pagination changes page in uncontrolled mode', async () => {
    await act(async () => {
      root.render(<Pagination total={100} defaultPage={1} />)
    })

    const nextButton = container.querySelector('[data-part="next"]') as HTMLButtonElement | null
    const currentPage = container.querySelector('.uf-pagination-page[aria-current="page"]') as HTMLElement | null
    const pagePicker = document.querySelector('.uf-pagination-pagePicker')
    const pagePickerItem = pagePicker?.querySelector('.uf-menu-item') as HTMLButtonElement | null
    expect(nextButton).not.toBeNull()
    expect(nextButton?.closest('.uf-membrane')).not.toBeNull()
    expect(currentPage?.textContent).toBe('1')
    expect(container.querySelectorAll('.uf-pagination-page')).toHaveLength(6)
    expect(container.querySelector('.uf-pagination-ellipsis')?.textContent).toBe('…')
    expect(pagePicker).not.toBeNull()
    expect(pagePickerItem).not.toBeNull()
    expect(pagePickerItem?.getAttribute('data-align')).toBe('left')
    expect(pagePickerItem?.textContent).toContain('Page 1')

    const componentStyles = readFileSync(join(process.cwd(), 'assets/styles/components.css'), 'utf8')
    expect(componentStyles)
      .toMatch(/\.uf-pagination-pagePicker\[data-scope\]\s+\.uf-menu-item\s*\{[^}]*justify-content:\s*flex-start;/)

    await act(async () => {
      nextButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const nextCurrentPage = container.querySelector('.uf-pagination-page[aria-current="page"]') as HTMLElement | null
    expect(nextCurrentPage?.textContent).toBe('2')
    expect(nextCurrentPage?.getAttribute('aria-current')).toBe('page')
  })

  it('Progress renders a visible track without requiring text labels', async () => {
    await act(async () => {
      root.render(<Progress value={60} ariaLabel="Build progress" />)
    })

    const rootNode = container.querySelector('[data-scope="progress"]') as HTMLElement | null
    const header = container.querySelector('.uf-progress__header') as HTMLElement | null
    const trackWrap = container.querySelector('.uf-progress__trackWrap') as HTMLElement | null
    const track = container.querySelector('[data-scope="progress"] [data-part="track"]') as HTMLElement | null
    const indicator = container.querySelector('[data-scope="progress"] [data-part="indicator"]') as HTMLElement | null

    expect(rootNode?.getAttribute('aria-label')).toBe('Build progress')
    expect(rootNode?.getAttribute('data-shape')).toBe('linear')
    expect(header).toBeNull()
    expect(trackWrap).not.toBeNull()
    expect(track).not.toBeNull()
    expect(indicator).not.toBeNull()
    expect(indicator?.style.width).toBe('60%')
    expect(container.textContent).not.toContain('%')

    const componentStyles = readFileSync(join(process.cwd(), 'assets/styles/components.css'), 'utf8')
    expect(componentStyles).toContain('--uf-progress-track-height: var(--uf-membrane);')
    expect(componentStyles).toContain('--uf-progress-track-inset-inline: var(--uf-control-pad-text);')
    expect(componentStyles).toMatch(/\.uf-progress__header\s*\{[^}]*padding:\s*var\(--uf-control-pad-y\) var\(--uf-control-pad-text\);/)
    expect(componentStyles).toMatch(/\.uf-progress__trackWrap\s*\{[^}]*padding:\s*0 var\(--uf-progress-track-inset-inline\);/)
    expect(componentStyles).not.toContain('.uf-gallery-itemSurface:has(> .uf-progress[data-scope][data-shape="linear"])')
    expect(readFileSync(join(process.cwd(), 'uf.runtime.ts'), 'utf8'))
      .toContain("'Progress'")
  })

  it('Progress aligns linear labels above the one-pixel track', async () => {
    await act(async () => {
      root.render(<Progress value={28} label="Typography" showValue />)
    })

    const header = container.querySelector('.uf-progress__header') as HTMLElement | null
    const label = container.querySelector('[data-scope="progress"][data-part="label"]') as HTMLElement | null
    const percent = container.querySelector('.uf-progress-label') as HTMLElement | null
    const trackWrap = container.querySelector('.uf-progress__trackWrap') as HTMLElement | null
    const track = container.querySelector('[data-scope="progress"] [data-part="track"]') as HTMLElement | null

    expect(header).not.toBeNull()
    expect(label?.textContent).toBe('Typography')
    expect(percent?.textContent).toBe('28%')
    expect(trackWrap).not.toBeNull()
    expect(track).not.toBeNull()

    const componentStyles = readFileSync(join(process.cwd(), 'assets/styles/components.css'), 'utf8')
    expect(componentStyles).toMatch(/\.uf-progress__header\s*\{[^}]*justify-content:\s*space-between;/)
    expect(componentStyles).toMatch(/\[data-scope="progress"\] \[data-part="track"\]\s*\{[^}]*max-height:\s*var\(--uf-progress-track-height\);/)
  })

  it('Progress renders a circular ring variant without scaling the ring by percent width', async () => {
    await act(async () => {
      root.render(<Progress value={28} shape="circle" showValue ariaLabel="Context progress" />)
    })

    const rootNode = container.querySelector('[data-scope="progress"]') as HTMLElement | null
    const track = container.querySelector('[data-scope="progress"] [data-part="track"]') as HTMLElement | null
    const indicator = container.querySelector('[data-scope="progress"] [data-part="indicator"]') as HTMLElement | null

    expect(rootNode?.getAttribute('aria-label')).toBe('Context progress')
    expect(rootNode?.getAttribute('data-shape')).toBe('circle')
    expect(track).not.toBeNull()
    expect(indicator).not.toBeNull()
    expect(indicator?.style.width).toBe('')
    expect(indicator?.style.getPropertyValue('--uf-progress-percent')).toBe('28%')
    expect(container.textContent).toContain('28%')

    const componentStyles = readFileSync(join(process.cwd(), 'assets/styles/components.css'), 'utf8')
    expect(componentStyles).toContain('background: conic-gradient(')
    expect(componentStyles).toContain('-webkit-mask: radial-gradient(circle, transparent 52%, var(--uf-color-black-100) 54%);')
    expect(componentStyles).toContain('mask: radial-gradient(circle, transparent 52%, var(--uf-color-black-100) 54%);')
  })

  it('Progress clamps invalid ranges and exposes semantic tone independently from shape', async () => {
    await act(async () => {
      root.render(<Progress value={150} max={100} tone="destructive" ariaLabel="Quota used" />)
    })

    const rootNode = container.querySelector('[data-scope="progress"]') as HTMLElement | null
    const indicator = container.querySelector('[data-scope="progress"] [data-part="indicator"]') as HTMLElement | null

    expect(rootNode?.getAttribute('data-tone')).toBe('destructive')
    expect(rootNode?.getAttribute('data-state')).toBe('complete')
    expect(rootNode?.getAttribute('aria-valuenow')).toBe('100')
    expect(rootNode?.getAttribute('aria-valuemax')).toBe('100')
    expect(indicator?.style.width).toBe('100%')
  })

  it('Table wraps primitive headers and aligned cells through Text', async () => {
    await act(async () => {
      root.render(
        <Table
          ariaLabel="Price list"
          showRowNumbers
          columns={[
            { id: 'name', header: 'Name', accessor: 'name' },
            { id: 'price', header: 'Price', accessor: 'price', align: 'right' },
          ]}
          rows={[
            { id: 'r1', name: 'Akt', price: 'RUB 2 990' },
          ]}
        />,
      )
    })

    const rowNumberHeader = container.querySelector('.uf-table__row-number-header [data-scope="text"][data-align="left"]') as HTMLElement | null
    expect(rowNumberHeader?.textContent).toContain('#')
    const table = container.querySelector('.uf-table[data-scope="table"]') as HTMLTableElement | null
    expect(table?.getAttribute('aria-label')).toBe('Price list')
    const componentStyles = readFileSync(join(process.cwd(), 'assets/styles/components.css'), 'utf8')
    expect(componentStyles).toContain('inline-size: 100%;')
    expect(componentStyles).toContain('max-inline-size: 100%;')

    const rowNumberCell = container.querySelector('td[data-row-number] [data-scope="text"][data-align="left"]') as HTMLElement | null
    expect(rowNumberCell?.textContent).toContain('1')

    const rightAlignedCells = Array.from(
      container.querySelectorAll<HTMLElement>('td [data-scope="text"][data-align="right"]'),
    )
    expect(rightAlignedCells.some((node) => node.textContent?.includes('RUB 2 990'))).toBe(true)
  })

  it('Table falls back to row indexes when a rowKey function returns an empty value', async () => {
    await act(async () => {
      root.render(
        <Table
          ariaLabel="People"
          columns={[{ id: 'name', header: 'Name', accessor: 'name' }]}
          rows={[
            { name: 'Ada' },
            { name: 'Grace' },
          ]}
          rowKey={() => undefined as unknown as string}
        />,
      )
    })

    const rows = Array.from(container.querySelectorAll<HTMLTableRowElement>('tbody tr[data-row-id]'))
    expect(rows.map((row) => row.getAttribute('data-row-id'))).toEqual(['0', '1'])
  })

  it('Tabs switches content in uncontrolled mode', async () => {
    await act(async () => {
      root.render(
        <Tabs
          defaultValue="b"
          items={[
            { value: 'a', label: 'Tab A', content: 'Content A' },
            { value: 'b', label: 'Tab B', content: 'Content B' },
          ]}
        />,
      )
    })

    const tabA = container.querySelector('[role="tab"][data-value="a"]') as HTMLButtonElement | null
    const tabB = container.querySelector('[role="tab"][data-value="b"]') as HTMLButtonElement | null
    const panelA = container.querySelector('[role="tabpanel"][data-value="a"]') as HTMLElement | null
    const panelB = container.querySelector('[role="tabpanel"][data-value="b"]') as HTMLElement | null

    expect(tabA).not.toBeNull()
    expect(tabB).not.toBeNull()
    expect(panelA?.hidden).toBe(true)
    expect(panelB?.hidden).toBe(false)

    await act(async () => {
      tabA?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(panelA?.hidden).toBe(false)
    expect(panelB?.hidden).toBe(true)
  })

  it('Radio changes selection in uncontrolled mode', async () => {
    await act(async () => {
      root.render(
        <Radio
          name="smoke-radio"
          defaultValue="1"
          options={[
            { value: '1', label: 'Option 1' },
            { value: '2', label: 'Option 2' },
          ]}
        />,
      )
    })

    const optionOne = container.querySelector('[role="radio"][data-value="1"]') as HTMLElement | null
    const optionTwo = container.querySelector('[role="radio"][data-value="2"]') as HTMLElement | null

    expect(optionOne?.getAttribute('aria-checked')).toBe('true')
    expect(optionTwo?.getAttribute('aria-checked')).toBe('false')

    await act(async () => {
      optionTwo?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(optionOne?.getAttribute('aria-checked')).toBe('false')
    expect(optionTwo?.getAttribute('aria-checked')).toBe('true')
  })

  it('Toggle changes selection in uncontrolled mode', async () => {
    await act(async () => {
      root.render(
        <Toggle
          defaultValue={['bold']}
          items={[
            { value: 'bold', label: 'B' },
            { value: 'italic', label: 'I' },
          ]}
        />,
      )
    })

    const buttons = Array.from(container.querySelectorAll<HTMLButtonElement>('button'))
    const bold = buttons.find((button) => button.textContent === 'B') ?? null
    const italic = buttons.find((button) => button.textContent === 'I') ?? null

    expect(bold).not.toBeNull()
    expect(bold?.getAttribute('data-state')).toBe('on')

    await act(async () => {
      italic?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(italic?.getAttribute('data-state')).toBe('on')
  })

  it('Switcher toggles in uncontrolled mode', async () => {
    await act(async () => {
      root.render(<Switcher text="Dark mode" checked={undefined} defaultChecked={false} />)
    })

    const control = container.querySelector('[role="switch"]') as HTMLElement | null
    const label = container.querySelector('[data-scope="switcher"][data-part="label"]') as HTMLElement | null
    const rootNode = container.querySelector('.uf-switcher') as HTMLElement | null
    expect(control?.getAttribute('aria-checked')).toBe('false')

    await act(async () => {
      control?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(control?.getAttribute('aria-checked')).toBe('true')

    await act(async () => {
      label?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(control?.getAttribute('aria-checked')).toBe('false')

    await act(async () => {
      rootNode?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(control?.getAttribute('aria-checked')).toBe('true')
  })

  it('Slider increments from keyboard and track clicks in uncontrolled mode', async () => {
    await act(async () => {
      root.render(<Slider min={0} max={100} step={1} defaultValue={[40]} />)
    })

    const thumb = container.querySelector('[role="slider"]') as HTMLElement | null
    const track = container.querySelector('[data-part="track"]') as HTMLDivElement | null
    expect(thumb?.getAttribute('aria-valuenow')).toBe('40')

    await act(async () => {
      thumb?.focus()
      thumb?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    })

    expect(thumb?.getAttribute('aria-valuenow')).toBe('41')

    expect(track).not.toBeNull()
    Object.defineProperty(track, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        x: 0,
        y: 0,
        left: 0,
        top: 0,
        right: 100,
        bottom: 16,
        width: 100,
        height: 16,
        toJSON() {
          return {}
        },
      }),
    })

    await act(async () => {
      const pointerDown = new Event('pointerdown', { bubbles: true }) as Event & { clientX?: number; clientY?: number }
      pointerDown.clientX = 75
      pointerDown.clientY = 8
      track?.dispatchEvent(pointerDown)
    })

    expect(thumb?.getAttribute('aria-valuenow')).toBe('75')
  })

  it('Slider exposes the advanced variant with leading content and crop handles', async () => {
    const handleValueChange = vi.fn()
    const handleCropChange = vi.fn()

    await act(async () => {
      root.render(
        <Slider
          variant="advanced"
          label="Crop"
          min={0}
          max={100}
          step={1}
          defaultValue={[40]}
          leadingIcon="crop"
          leadingText="Crop"
          crop
          cropRange={{ min: 20, max: 80 }}
          onValueChange={handleValueChange}
          onCropChange={handleCropChange}
        />,
      )
    })

    const input = container.querySelector('.uf-slider--advanced input[type="range"]') as HTMLInputElement | null
    const cropMarkers = Array.from(container.querySelectorAll<HTMLButtonElement>('.uf-slider--advanced .uf-slider-cropMarker'))
    const renderAdvancedSlider = () => (
      <Slider
        variant="advanced"
        label="Crop"
        min={0}
        max={100}
        step={1}
        defaultValue={[40]}
        leadingIcon="crop"
        leadingText="Crop"
        crop
        cropRange={{ min: 20, max: 80 }}
        onValueChange={handleValueChange}
        onCropChange={handleCropChange}
      />
    )

    expect(input).not.toBeNull()
    expect(container.textContent).toContain('Crop')
    expect(container.querySelector('label')?.textContent).toBe('Crop')
    expect(cropMarkers).toHaveLength(2)
    expect(cropMarkers[0]?.querySelector('svg')?.getAttribute('width')).toBe('20')
    expect(cropMarkers[0]?.querySelector('svg')?.getAttribute('height')).toBe('20')

    await act(async () => {
      if (!input) return
      setNativeInputValue(input, '72')
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new Event('change', { bubbles: true }))
    })

    expect(handleValueChange).toHaveBeenCalled()
    expect(handleCropChange).not.toHaveBeenCalled()

    let body = container.querySelector('.uf-slider--advanced .uf-slider-body') as HTMLDivElement | null
    let leftMarker = container.querySelector('.uf-slider--advanced .uf-slider-cropMarker--left') as HTMLButtonElement | null

    Object.defineProperty(body, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        x: 0,
        y: 0,
        left: 0,
        top: 0,
        right: 240,
        bottom: 32,
        width: 240,
        height: 32,
        toJSON() {
          return {}
        },
      }),
    })

    await act(async () => {
      root.render(renderAdvancedSlider())
    })

    body = container.querySelector('.uf-slider--advanced .uf-slider-body') as HTMLDivElement | null
    leftMarker = container.querySelector('.uf-slider--advanced .uf-slider-cropMarker--left') as HTMLButtonElement | null

    await act(async () => {
      const down = new Event('pointerdown', { bubbles: true }) as Event & { clientX?: number; clientY?: number }
      down.clientX = 60
      down.clientY = 16
      leftMarker?.dispatchEvent(down)
      const move = new Event('pointermove', { bubbles: true }) as Event & { clientX?: number; clientY?: number }
      move.clientX = 30
      move.clientY = 16
      window.dispatchEvent(move)
      const up = new Event('pointerup', { bubbles: true }) as Event & { clientX?: number; clientY?: number }
      up.clientX = 30
      up.clientY = 16
      window.dispatchEvent(up)
    })

    // jsdom does not provide stable pointer geometry for the crop markers, so
    // the interaction contract is covered by the preview-props regression test.
    expect(handleCropChange).not.toHaveBeenCalled()
  })

  it('Slider variant is the only switch between simple and advanced presentations', async () => {
    await act(async () => {
      root.render(
        <Slider
          defaultValue={[40]}
          crop
          leadingIcon="crop"
          leadingText="Crop"
        />,
      )
    })

    expect(container.querySelector('.uf-slider--advanced')).toBeNull()
    expect(container.querySelector('[data-part="track"]')).not.toBeNull()

    await act(async () => {
      root.render(
        <Slider
          variant="advanced"
          defaultValue={[40]}
          leadingIcon="crop"
          leadingText="Crop"
        />,
      )
    })

    expect(container.querySelector('.uf-slider--advanced')).not.toBeNull()
    expect(container.querySelector('.uf-slider-leadingIcon')).not.toBeNull()
    expect(container.querySelector('.uf-slider-leadingText')?.textContent).toBe('Crop')
  })

  it('Slider advanced keeps thumb measurement stable while value text changes', async () => {
    await act(async () => {
      root.render(
        <Slider
          variant="advanced"
          label="Zoom"
          min={0}
          max={100}
          step={1}
          defaultValue={[9]}
        />,
      )
    })

    const input = container.querySelector('.uf-slider--advanced input[type="range"]') as HTMLInputElement | null
    const visibleThumbText = container.querySelector('.uf-slider-thumbButtonWrap .uf-slider-thumbButton [data-part="text"]') as HTMLElement | null
    const measureThumbText = container.querySelector('.uf-slider-thumbMeasure .uf-slider-thumbButton [data-part="text"]') as HTMLElement | null

    expect(container.querySelector('label')?.textContent).toBe('Zoom')
    expect(visibleThumbText?.textContent).toBe('9')
    expect(measureThumbText?.textContent).toBe('100')

    await act(async () => {
      if (!input) return
      setNativeInputValue(input, '10')
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new Event('change', { bubbles: true }))
    })

    expect(visibleThumbText?.textContent).toBe('10')
    expect(measureThumbText?.textContent).toBe('100')
  })

  it('Slider advanced keeps the latest edited value while a controlled parent catches up', async () => {
    vi.useFakeTimers()
    const handleValueChange = vi.fn()

    const renderControlledSlider = (nextValue: number) => (
      <Slider
        variant="advanced"
        label="Value"
        min={0}
        max={100}
        step={1}
        value={[nextValue]}
        onValueChange={handleValueChange}
      />
    )

    await act(async () => {
      root.render(renderControlledSlider(0))
    })

    const input = container.querySelector('.uf-slider--advanced input[type="range"]') as HTMLInputElement | null
    const visibleThumbText = container.querySelector('.uf-slider-thumbButtonWrap .uf-slider-thumbButton [data-part="text"]') as HTMLElement | null

    expect(visibleThumbText?.textContent).toBe('0')

    await act(async () => {
      if (!input) return
      setNativeInputValue(input, '42')
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new Event('change', { bubbles: true }))
    })

    expect(handleValueChange).toHaveBeenLastCalledWith({ value: [42] })
    expect(visibleThumbText?.textContent).toBe('42')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000)
    })

    expect(visibleThumbText?.textContent).toBe('42')

    await act(async () => {
      root.render(renderControlledSlider(7))
    })

    expect(visibleThumbText?.textContent).toBe('7')
  })

  it('Rating changes value in uncontrolled mode', async () => {
    await act(async () => {
      root.render(<Rating defaultValue={2} />)
    })

    const stars = Array.from(container.querySelectorAll<HTMLButtonElement>('.uf-rating-star'))
    expect(stars).toHaveLength(5)
    expect(stars[1]?.getAttribute('aria-checked')).toBe('true')

    await act(async () => {
      stars[3]?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(stars[3]?.getAttribute('aria-checked')).toBe('true')
    expect(stars[0]?.getAttribute('data-selected')).toBe('')
    expect(stars[2]?.getAttribute('data-selected')).toBe('')
    expect(stars[3]?.getAttribute('data-selected')).toBe('')
    expect(stars[4]?.getAttribute('data-selected')).toBeNull()

    await act(async () => {
      stars[1]?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
    })

    expect(stars[1]?.getAttribute('data-highlighted')).not.toBeNull()
    expect(stars[3]?.getAttribute('data-highlighted')).toBeNull()
    expect(stars[3]?.getAttribute('data-selected')).toBe('')
  })

  it('Steps changes active step and reveals matching content in uncontrolled mode', async () => {
    await act(async () => {
      root.render(
        <Steps
          defaultStep={0}
          items={[
            { label: 'Account', content: 'Create your workspace and owner account.' },
            { label: 'Profile', content: 'Add brand settings, themes, and team details.' },
            { label: 'Review', content: 'Review the setup before publishing.' },
          ]}
        />,
      )
    })

    const triggers = Array.from(container.querySelectorAll<HTMLButtonElement>('[data-part="trigger"]'))
    expect(triggers[0]?.getAttribute('data-state')).toBe('active')
    expect(container.textContent).toContain('Create your workspace and owner account.')
    const firstContentText = container.querySelector('[data-scope="steps"][data-part="content"]:not([hidden]) [data-scope="text"]') as HTMLElement | null
    expect(firstContentText?.classList.contains('uf-steps-contentText')).toBe(false)
    expect(firstContentText?.getAttribute('data-inset')).toBe('control')
    expect(firstContentText?.hasAttribute('data-membrane')).toBe(true)
    expect(firstContentText?.parentElement?.classList.contains('uf-membrane')).toBe(true)

    await act(async () => {
      triggers[1]?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(triggers[1]?.getAttribute('data-state')).toBe('active')
    expect(container.textContent).toContain('Add brand settings, themes, and team details.')
  })

  it('Toc changes active item in uncontrolled mode', async () => {
    await act(async () => {
      root.render(
        <Toc
          defaultActiveId="intro"
          items={[
            { id: 'intro', label: 'Introduction' },
            { id: 'setup', label: 'Setup' },
          ]}
        />,
      )
    })

    const intro = Array.from(container.querySelectorAll<HTMLElement>('button')).find((button) => button.textContent?.includes('Introduction')) ?? null
    const setup = Array.from(container.querySelectorAll<HTMLElement>('button')).find((button) => button.textContent?.includes('Setup')) ?? null

    expect(intro?.getAttribute('aria-current')).toBe('location')
    expect(intro?.getAttribute('data-full-width')).toBe('')
    expect(setup?.getAttribute('data-full-width')).toBe('')

    await act(async () => {
      setup?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(setup?.getAttribute('aria-current')).toBe('location')
  })

  it('Tree expands a branch and selects a nested node', async () => {
    await act(async () => {
      root.render(
        <Tree
          items={[
            {
              id: 'src',
              label: 'src',
              icon: 'folder',
              children: [
                { id: 'index', label: 'index.ts', icon: 'file' },
                { id: 'utils', label: 'utils.ts', icon: 'file', kind: 'tile' },
                {
                  id: 'custom',
                  label: 'Custom',
                  kind: 'custom',
                  content: <span data-testid="custom-tree-content">Custom node</span>,
                },
              ],
            },
          ]}
        />,
      )
    })

    const branchButton = container.querySelector('[data-tree-node-id="src"]') as HTMLButtonElement | null
    const branchContent = container.querySelector('[data-part="branchContent"][data-value="src"]') as HTMLElement | null

    expect(branchButton).not.toBeNull()
    expect(branchContent?.hidden).toBe(true)
    expect(branchButton?.getAttribute('data-full-width')).toBe('')
    expect(branchButton?.parentElement?.classList.contains('uf-membrane--full')).toBe(true)

    await act(async () => {
      branchButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(branchContent?.hidden).toBe(false)
    expect(branchContent?.classList.contains('uf-tree-branch-content')).toBe(true)

    const childButton = container.querySelector('[data-tree-node-id="index"]') as HTMLButtonElement | null
    expect(childButton).not.toBeNull()
    expect(childButton?.getAttribute('data-full-width')).toBe('')
    expect(childButton?.parentElement?.classList.contains('uf-membrane--full')).toBe(true)

    await act(async () => {
      childButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(childButton?.getAttribute('data-selected')).toBe('')

    const tileNode = container.querySelector('[data-tree-node-id="utils"][data-scope="tile"]') as HTMLElement | null
    const customNode = container.querySelector('[data-tree-node-id="custom"].uf-tree-custom-node') as HTMLElement | null
    expect(tileNode).not.toBeNull()
    expect(tileNode?.getAttribute('data-full-width')).toBe('')
    expect(customNode?.textContent).toContain('Custom node')

    const componentStyles = readFileSync(join(process.cwd(), 'assets/styles/components.css'), 'utf8')
    expect(componentStyles).toContain('.uf-tree[data-scope] .uf-tree-branch')
    expect(componentStyles).toContain('.uf-tree[data-scope] [data-part="branchContent"]')
    expect(componentStyles).toContain('flex-direction: column;')
    expect(componentStyles).toContain('width: 100%;')
  })

  it('Tree treats expandedIds as controlled even without a change handler', async () => {
    await act(async () => {
      root.render(
        <Tree
          expandedIds={['src']}
          selectedId="index"
          items={[
            {
              id: 'src',
              label: 'src',
              icon: 'folder',
              children: [
                { id: 'index', label: 'index.ts', icon: 'file' },
              ],
            },
          ]}
        />,
      )
    })

    const branchButton = container.querySelector('[data-tree-node-id="src"]') as HTMLButtonElement | null
    const branchContent = container.querySelector('[data-part="branchContent"][data-value="src"]') as HTMLElement | null
    expect(branchContent?.hidden).toBe(false)

    await act(async () => {
      branchButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(branchContent?.hidden).toBe(false)
  })

  it('Tree ignores non-function render overrides from generated preview props', async () => {
    await act(async () => {
      root.render(
        <Tree
          renderNode={'preview-string-placeholder' as any}
          items={[
            {
              id: 'readme',
              label: 'README.md',
              icon: 'file',
              render: 'preview-string-placeholder' as any,
            },
          ]}
        />,
      )
    })

    const node = container.querySelector('[data-tree-node-id="readme"]') as HTMLElement | null
    expect(node).not.toBeNull()
    expect(node?.textContent).toContain('README.md')
  })

  it('Tree keeps expansion stable when preview bridge promotes it to controlled props', async () => {
    const items = [
      {
        id: 'src',
        label: 'src',
        icon: 'folder',
        children: [
          {
            id: 'components',
            label: 'components',
            icon: 'folder',
            children: [
              { id: 'button', label: 'Button.tsx', icon: 'file' },
            ],
          },
          {
            id: 'assets',
            label: 'assets',
            icon: 'folder',
            children: [
              { id: 'icons', label: 'icons', icon: 'folder' },
            ],
          },
        ],
      },
    ]

    function PreviewBridgeHarness() {
      const [bridgeProps, setBridgeProps] = React.useState<Record<string, unknown>>({
        defaultExpandedIds: ['src'],
        defaultSelectedId: 'button',
      })

      return (
        <Tree
          items={items}
          {...bridgeProps}
          onExpandedChange={(details) => {
            setBridgeProps((prev) => ({ ...prev, expandedIds: details.expandedIds }))
          }}
          onSelectedChange={(details) => {
            setBridgeProps((prev) => ({ ...prev, selectedId: details.selectedId }))
          }}
        />
      )
    }

    await act(async () => {
      root.render(<PreviewBridgeHarness />)
    })

    const assetsButton = container.querySelector('[data-tree-node-id="assets"]') as HTMLButtonElement | null
    const componentsButton = container.querySelector('[data-tree-node-id="components"]') as HTMLButtonElement | null
    const assetsContent = container.querySelector('[data-part="branchContent"][data-value="assets"]') as HTMLElement | null
    const componentsContent = container.querySelector('[data-part="branchContent"][data-value="components"]') as HTMLElement | null

    expect(assetsContent?.hidden).toBe(true)
    expect(componentsContent?.hidden).toBe(true)

    await act(async () => {
      assetsButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(assetsContent?.hidden).toBe(false)
    expect(assetsButton?.getAttribute('aria-selected')).toBe('true')
    expect(assetsButton?.closest('[role="none"]')).not.toBeNull()

    await act(async () => {
      componentsButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(assetsContent?.hidden).toBe(false)
    expect(componentsContent?.hidden).toBe(false)
  })

  it('Panel renders product navigation items and changes selection', async () => {
    await act(async () => {
      root.render(
        <Panel
          surface="inline"
          defaultSelectedId="overview"
          items={[
            { id: 'overview', label: 'Overview', icon: 'layout-sidebar-left-open' },
            { id: 'projects', label: 'Projects', icon: 'folder' },
            { id: 'settings', label: 'Settings', icon: 'settings' },
          ]}
        />,
      )
    })

    expect(container.textContent).toContain('Overview')
    expect(container.textContent).toContain('Projects')
    const buttons = Array.from(container.querySelectorAll<HTMLButtonElement>('.uf-sidebar-itemButton'))
    expect(buttons).toHaveLength(3)
    expect(buttons[0]?.getAttribute('data-selected')).toBe('')
    expect(buttons[0]?.querySelector('svg[data-icon="layout-sidebar-left-open"]')).not.toBeNull()

    await act(async () => {
      buttons[1]?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(buttons[0]?.getAttribute('data-selected')).toBeNull()
    expect(buttons[1]?.getAttribute('data-selected')).toBe('')
  })

  it('Panel items API renders rows as system buttons with membranes and nesting levels', async () => {
    await act(async () => {
      root.render(
        <Panel
          surface="inline"
          defaultSelectedId="leaf"
          items={[
            {
              id: 'parent',
              label: 'Parent',
              icon: <Icon name="folder" />,
              items: [
                { id: 'child', label: 'Child' },
              ],
            },
            {
              id: 'leaf',
              label: 'Leaf',
              icon: <Icon name="component" />,
            },
          ]}
        />,
      )
    })

    const rows = Array.from(container.querySelectorAll<HTMLButtonElement>('.uf-sidebar-itemButton'))
    expect(rows).toHaveLength(3)
    expect(rows.every((row) => row.getAttribute('data-scope') === 'button')).toBe(true)
    expect(rows.every((row) => row.parentElement?.classList.contains('uf-membrane'))).toBe(true)
    expect(rows[0]?.getAttribute('data-selector')).toBe('')
    expect(rows[1]?.style.getPropertyValue('--face-runtime-option-level')).toBe('1')
    expect(rows[2]?.getAttribute('data-selected')).toBe('')
  })

  it('Markdown renders styled block structure for rich content', async () => {
    await act(async () => {
      root.render(
        <Markdown
          content={[
            '# Title',
            '',
            'Paragraph with **bold** and `code`.',
            '',
            '> Quote',
            '',
            '- [x] Done',
            '- Item',
            '',
            '| Name | Value |',
            '| :--- | ---: |',
            '| Spacing | 2px |',
            '',
            '```ts',
            'const x = 1',
            '```',
          ].join('\n')}
        />,
      )
    })

    const rootNode = container.querySelector('[data-scope="markdown"]') as HTMLElement | null
    expect(rootNode).not.toBeNull()
    expect(rootNode?.querySelector('h1')?.textContent).toBe('Title')
    expect(rootNode?.querySelector('blockquote')).not.toBeNull()
    expect(rootNode?.querySelector('input[type="checkbox"]')).not.toBeNull()
    expect(rootNode?.querySelector('table')).not.toBeNull()
    expect(rootNode?.querySelector('pre code')?.getAttribute('class')).toContain('language-ts')
  })
})
