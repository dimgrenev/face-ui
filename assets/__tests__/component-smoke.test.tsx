// @vitest-environment jsdom

import React from 'react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { Accordion } from '../../Accordion/Accordion'
import { Button } from '../../Button/Button'
import { Calendar } from '../../Calendar/Calendar'
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
    expect(textNode?.textContent).toContain('Content A')
  })

  it('Button resolves string icon names through Icon', async () => {
    await act(async () => {
      root.render(<Button icon="close" iconOnly fullWidth={false} />)
    })

    const icon = container.querySelector('[data-part="icon"] svg')
    expect(icon).not.toBeNull()
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

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

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
      root.render(<Icon name="settings" size={20} />)
    })

    const icon = container.querySelector('svg')
    expect(icon).not.toBeNull()
    expect(container.querySelector(`path[d="${settingsPath}"]`)).not.toBeNull()
    expect(container.querySelector(`path[d="${notdefPath}"]`)).toBeNull()
  })

  it('Icon wrapper renders unsupported legacy runtime names as notdef', async () => {
    await act(async () => {
      root.render(<Icon name="git" size={20} />)
    })

    expect(container.querySelector('svg[data-icon="git"]')).not.toBeNull()
    expect(container.querySelector(`path[d="${notdefPath}"]`)).not.toBeNull()

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

  it('Icon wrapper always uses the single 20x20 library size', async () => {
    await act(async () => {
      root.render(<Icon name="crop" />)
    })

    let icon = container.querySelector('svg[data-icon="crop"]')
    expect(icon?.getAttribute('width')).toBe('20')
    expect(icon?.getAttribute('height')).toBe('20')
    expect(icon?.getAttribute('viewBox')).toBe('0 0 10 20')

    await act(async () => {
      root.render(<Icon name="crop" size={16} />)
    })

    icon = container.querySelector('svg[data-icon="crop"]')
    expect(icon?.getAttribute('width')).toBe('20')
    expect(icon?.getAttribute('height')).toBe('20')

    await act(async () => {
      root.render(<Icon name="random" />)
    })

    icon = container.querySelector('svg[data-icon="random"]')
    expect(icon?.getAttribute('width')).toBe('20')
    expect(icon?.getAttribute('height')).toBe('20')

    await act(async () => {
      root.render(<Icon icon={<svg viewBox="0 0 12 12"><path d="M0 0H12" /></svg>} />)
    })

    icon = container.querySelector('svg[data-icon="notdef"]')
    expect(icon?.getAttribute('width')).toBe('20')
    expect(icon?.getAttribute('height')).toBe('20')
    expect(container.querySelector(`path[d="${notdefPath}"]`)).not.toBeNull()
  })

  it('Media renders images with auto height when no explicit height is provided', async () => {
    await act(async () => {
      root.render(<Media src="https://example.com/image.jpg" alt="Preview" />)
    })

    const img = container.querySelector('img') as HTMLImageElement | null
    expect(img).not.toBeNull()
    expect(img?.style.width).toBe('100%')
    expect(img?.style.height).toBe('auto')
  })

  it('Media exposes wrapper aria-label when a role is provided', async () => {
    await act(async () => {
      root.render(
        <Media
          src="https://example.com/image.jpg"
          alt="Preview"
          role="img"
          aria-label="Architecture preview"
        />,
      )
    })

    const media = container.querySelector('[data-scope="media"][data-part="root"]') as HTMLElement | null
    const img = container.querySelector('img') as HTMLImageElement | null
    expect(media?.getAttribute('role')).toBe('img')
    expect(media?.getAttribute('aria-label')).toBe('Architecture preview')
    expect(img?.getAttribute('alt')).toBe('Preview')
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
    expect(input?.checked).toBe(true)

    await act(async () => {
      input?.click()
    })

    expect(handleCheckedChange).toHaveBeenCalledWith(false)
    expect(input?.checked).toBe(false)
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
    expect(decorative?.getAttribute('role')).toBe('none')
    expect(decorative?.getAttribute('aria-orientation')).toBeNull()
    expect(semantic?.getAttribute('role')).toBe('separator')
    expect(semantic?.getAttribute('aria-orientation')).toBe('vertical')
    expect(semantic?.getAttribute('data-orientation')).toBe('vertical')
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
    const nextButton = container.querySelector('[data-part="next"]') as HTMLButtonElement | null

    expect(slideA?.getAttribute('data-current')).toBe('')
    expect(slideB?.hasAttribute('data-current')).toBe(false)
    expect(nextButton).not.toBeNull()

    await act(async () => {
      nextButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(slideA?.hasAttribute('data-current')).toBe(false)
    expect(slideB?.getAttribute('data-current')).toBe('')
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
    expect(title?.textContent).toContain('Files / Playground')

    const actions = Array.from(container.querySelectorAll<HTMLButtonElement>('.uf-code-action[data-scope="button"]'))
    expect(actions.length).toBeGreaterThan(0)
    expect(actions.every((button) => button.closest('.uf-membrane') != null)).toBe(true)
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

  it('Toast demo opens a toast and renders a close button', async () => {
    await act(async () => {
      root.render(<Toast />)
    })

    const trigger = Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.includes('Show toast')) ?? null
    expect(trigger).not.toBeNull()

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(container.textContent).toContain('Notification')
    expect(container.querySelector('.uf-toast-close')).not.toBeNull()
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
    const currentPage = container.querySelector('.uf-pagination-current[data-scope="text"]') as HTMLElement | null
    expect(nextButton).not.toBeNull()
    expect(nextButton?.closest('.uf-membrane')).not.toBeNull()
    expect(currentPage?.textContent).toBe('1')

    await act(async () => {
      nextButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(currentPage?.textContent).toBe('2')
    expect(currentPage?.getAttribute('aria-current')).toBe('page')
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

    const rowNumberCell = container.querySelector('td[data-row-number] [data-scope="text"][data-align="left"]') as HTMLElement | null
    expect(rowNumberCell?.textContent).toContain('1')

    const rightAlignedCells = Array.from(
      container.querySelectorAll<HTMLElement>('td [data-scope="text"][data-align="right"]'),
    )
    expect(rightAlignedCells.some((node) => node.textContent?.includes('RUB 2 990'))).toBe(true)
  })

  it('Table falls back to row indexes when getRowId returns an empty value', async () => {
    await act(async () => {
      root.render(
        <Table
          ariaLabel="People"
          columns={[{ id: 'name', header: 'Name', accessor: 'name' }]}
          rows={[
            { name: 'Ada' },
            { name: 'Grace' },
          ]}
          getRowId={() => undefined as unknown as string}
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
    const panelA = container.querySelector('#tabs\\:content\\:a') as HTMLElement | null
    const panelB = container.querySelector('#tabs\\:content\\:b') as HTMLElement | null

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
    expect(control?.getAttribute('aria-checked')).toBe('false')

    await act(async () => {
      control?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
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
    const handleChange = vi.fn()
    const handleValueChange = vi.fn()
    const handleCropChange = vi.fn()

    await act(async () => {
      root.render(
        <Slider
          variant="advanced"
          min={0}
          max={100}
          step={1}
          defaultValue={[40]}
          leading="iconText"
          leadingIcon="crop"
          leadingText="Crop"
          crop
          cropRange={{ min: 20, max: 80 }}
          onChange={handleChange}
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
        min={0}
        max={100}
        step={1}
        defaultValue={[40]}
        leading="iconText"
        leadingIcon="crop"
        leadingText="Crop"
        crop
        cropRange={{ min: 20, max: 80 }}
        onChange={handleChange}
        onValueChange={handleValueChange}
        onCropChange={handleCropChange}
      />
    )

    expect(input).not.toBeNull()
    expect(container.textContent).toContain('Crop')
    expect(cropMarkers).toHaveLength(2)
    expect(cropMarkers[0]?.querySelector('svg')?.getAttribute('width')).toBe('20')
    expect(cropMarkers[0]?.querySelector('svg')?.getAttribute('height')).toBe('20')

    await act(async () => {
      if (!input) return
      setNativeInputValue(input, '72')
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new Event('change', { bubbles: true }))
    })

    expect(handleChange).toHaveBeenCalled()
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

    await act(async () => {
      stars[1]?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
    })

    expect(stars[1]?.getAttribute('data-highlighted')).not.toBeNull()
    expect(stars[3]?.getAttribute('data-highlighted')).toBeNull()
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
              children: [
                { id: 'index', label: 'index.ts' },
                { id: 'utils', label: 'utils.ts' },
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

    await act(async () => {
      branchButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(branchContent?.hidden).toBe(false)

    const childButton = container.querySelector('[data-tree-node-id="index"]') as HTMLButtonElement | null
    expect(childButton).not.toBeNull()

    await act(async () => {
      childButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(childButton?.getAttribute('data-selected')).toBe('')
  })

  it('Panel workspace preset renders and changes selection', async () => {
    await act(async () => {
      root.render(<Panel items={[]} previewPreset="workspace" defaultSelectedId="overview" />)
    })

    expect(container.textContent).toContain('FaceUI React')
    expect(container.textContent).toContain('Workspace')
    expect(container.textContent).toContain('Tools')
    expect(container.textContent).toContain('Structure')
    const buttons = Array.from(container.querySelectorAll<HTMLButtonElement>('.uf-sidebar-preview-item'))
    expect(buttons.length).toBeGreaterThan(2)
    expect(container.querySelector('.uf-sidebar-preview-separator')).toBeNull()

    await act(async () => {
      buttons[1]?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(buttons[1]?.getAttribute('data-variant')).toBe('default')
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
