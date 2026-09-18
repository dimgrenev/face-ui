import React, { act, createRef } from 'react'
import type { Root } from 'react-dom/client'
import { beforeEach, expect, it, vi, describe } from 'vitest'
import { Tile } from '../../Tile/Tile'
import { Button } from '../../Button/Button'
import { Tree } from '../../Tree/Tree'
import { Text } from '../../Text/Text'
import { expectDevError, libraryCss, mount } from './harness'
let host: HTMLDivElement
let root: Root
const render = async (props: React.ComponentProps<typeof Tile>) => {
  await act(async () => {
    root.render(<Tile {...props} />)
  })
}
const tile = () => host.querySelector<HTMLElement>('.uf-tile')!
beforeEach(() => {
  ;({ host, root } = mount())
})

it('keeps meta beside both scalar and composed labels and omits an empty label slot', async () => {
  await render({ children: 'Title', meta: '⌘K' })
  expect(tile().textContent).toBe('Title⌘K')
  expect(tile().querySelector('[data-part="meta"]')?.textContent).toBe('⌘K')
  await render({ children: <strong>Custom</strong>, meta: '⌘K' })
  expect(tile().textContent).toBe('Custom⌘K')
  await render({ children: 0, meta: 'items' })
  expect(tile().textContent).toBe('0items')
  await render({ children: false })
  expect(tile().textContent).toBe('')
  expect(tile().querySelector('[data-part="text"]')).toBeNull()
})
it('empty slots preserve the primary control without adding layout boxes', async () => {
  await render({
    children: 'Title',
    onClick: vi.fn(),
    icon: false,
    leading: <>{false}</>,
    meta: [],
    actions: false,
  })
  for (const part of ['icon', 'leading', 'meta', 'actions'])
    expect(tile().querySelector(`[data-part="${part}"]`)).toBeNull()
  expect(
    tile().querySelector('[data-part="primary"]')?.getAttribute('role'),
  ).toBe('button')
})
it('does not turn a structural role into a keyboard button', async () => {
  await render({ children: 'Item', role: 'listitem' })
  expect(tile().getAttribute('role')).toBe('listitem')
  expect(tile().hasAttribute('tabindex')).toBe(false)
  expect(tile().hasAttribute('data-interactive')).toBe(false)
})
it('preserves object refs and native attributes for both compositions', async () => {
  const ref = createRef<HTMLDivElement>()
  for (const actions of [undefined, <Button key="edit">Edit</Button>]) {
    await render({
      children: 'Project',
      onClick: vi.fn(),
      actions,
      ref,
      id: 'project',
      title: 'Details',
      className: 'custom',
      style: { width: 300 },
      'aria-label': 'Open project',
      'aria-controls': 'panel',
      tabIndex: -1,
    })
    expect(ref.current).toBe(tile())
    expect(tile().title).toBe('Details')
    expect(tile().classList.contains('custom')).toBe(true)
    const control = tile().querySelector('[data-part="primary"]') ?? tile()
    expect(control.id).toBe('project')
    expect(control.getAttribute('aria-label')).toBe('Open project')
    expect(control.getAttribute('aria-controls')).toBe('panel')
    expect(control.getAttribute('tabindex')).toBe('-1')
  }
})
it.skipIf(Number.parseInt(React.version, 10) < 19)(
  'calls React 19 callback-ref cleanup on replacement and unmount',
  async () => {
    const cleanup = vi.fn()
    const ref = vi.fn((node: HTMLDivElement | null) =>
      node ? cleanup : undefined,
    )
    await render({ children: 'A', ref })
    await render({ children: 'B', ref: createRef<HTMLDivElement>() })
    expect(cleanup).toHaveBeenCalledTimes(1)
    expect(ref).toHaveBeenCalledTimes(1)
  },
)
it('chevron follows aria-expanded and remains independent of icon and label content', async () => {
  for (const children of ['Label', <strong key="label">Label</strong>]) {
    for (const expanded of [false, true, 'false', 'true'] as const) {
      await render({
        children,
        icon: 'folder',
        chevron: 'down',
        'aria-expanded': expanded,
        actions: <Button>Edit</Button>,
        onClick: vi.fn(),
      })
      const control = tile().querySelector('[data-part="primary"]')!
      expect(control.getAttribute('aria-expanded')).toBe(String(expanded))
      expect(
        tile()
          .querySelector('[data-part="indicator"] svg')
          ?.getAttribute('data-icon'),
      ).toBe(`select-chevron-${String(expanded) === 'true' ? 'up' : 'down'}`)
    }
  }
  await render({
    chevron: 'end',
    'aria-label': 'Next',
    'aria-expanded': true,
  })
  expect(
    tile()
      .querySelector('[data-part="indicator"] svg')
      ?.getAttribute('data-icon'),
  ).toBe('select-chevron-right')
  await render({ children: 'Label', 'aria-expanded': false })
  expect(tile().querySelector('[data-part="indicator"]')).toBeNull()
})
it('aria-busy is the single visual state source without disabling activation', async () => {
  const onClick = vi.fn()
  for (const busy of [true, 'true', false, 'false'] as const) {
    await render({ children: 'Title', onClick, 'aria-busy': busy })
    expect(tile().hasAttribute('data-busy')).toBe(String(busy) === 'true')
    await act(async () => tile().click())
  }
  expect(onClick).toHaveBeenCalledTimes(4)
})
it('indent is a whole step from 0 to 9, reports other values and preserves other styles', async () => {
  await render({ children: 'Title', indent: 3, style: { color: 'red' } })
  expect(tile().style.getPropertyValue('--face-runtime-option-level')).toBe('3')
  expect(tile().hasAttribute('data-indent')).toBe(true)
  for (const [input, expected] of [
    [-4, '0'],
    [2.8, '2'],
    [99, '9'],
    [NaN, '0'],
    [Infinity, '0'],
  ] as const) {
    await expectDevError(
      () => render({ children: 'Title', indent: input, style: { color: 'red' } }),
      new RegExp(`^Face UI Tile: invalid indent ${input}; using ${expected}\\.$`),
    )
    expect(tile().style.getPropertyValue('--face-runtime-option-level')).toBe(
      expected,
    )
    expect(tile().style.color).toBe('red')
  }
  await render({ children: 'Title' })
  expect(tile().hasAttribute('data-indent')).toBe(false)
})
it('aria-expanded makes the row a disclosure button without onClick, role or interactive', async () => {
  await render({ children: 'Project', chevron: 'down', 'aria-expanded': false })
  const control = tile().querySelector<HTMLButtonElement>('[data-part="primary"]')
  expect(control?.tagName).toBe('BUTTON')
  expect(control?.getAttribute('aria-expanded')).toBe('false')
  expect(control?.tabIndex).toBe(0)
  expect(tile().hasAttribute('aria-expanded')).toBe(false)
  expect(tile().hasAttribute('data-interactive')).toBe(true)
  await render({ children: 'Project', 'aria-expanded': true, interactive: false })
  expect(tile().querySelector('[data-part="primary"]')).toBeNull()
  expect(tile().hasAttribute('data-interactive')).toBe(false)
})
it('align is logical and the end chevron marks its direction for mirroring', async () => {
  for (const align of ['start', 'center', 'end'] as const) {
    await render({ children: 'Row', align })
    expect(tile().getAttribute('data-align')).toBe(align)
  }
  await render({ children: 'Row', chevron: 'end', onClick: vi.fn() })
  const indicator = tile().querySelector('[data-part="indicator"]')!
  expect(indicator.getAttribute('data-direction')).toBe('end')
  expect(indicator.querySelector('svg')?.getAttribute('data-icon')).toBe('select-chevron-right')
})
it('interactive=false suppresses inferred activation and custom roles stay explicit', async () => {
  const onClick = vi.fn()
  await render({ children: 'Heading', onClick, interactive: false })
  await act(async () => tile().click())
  expect(onClick).not.toHaveBeenCalled()
  expect(tile().hasAttribute('role')).toBe(false)
  await render({ children: 'Tab', role: 'tab', 'aria-selected': true, onClick })
  expect(
    tile().querySelector('[data-part="primary"]')?.getAttribute('role'),
  ).toBe('tab')
  expect(
    tile()
      .querySelector('[data-part="primary"]')
      ?.getAttribute('aria-selected'),
  ).toBe('true')
  await render({ children: 'Current', active: true, onClick })
  expect(tile().getAttribute('aria-selected')).toBeNull()
  expect(tile().getAttribute('aria-current')).toBeNull()
})

it('Tree exposes expansion only on branches for both Tile and Button rows', async () => {
  await act(async () =>
    root.render(
      <Tree
        defaultExpandedIds={['branch']}
        items={[
          {
            id: 'branch',
            label: 'Folder',
            kind: 'tile',
            children: [
              { id: 'tile-leaf', kind: 'tile', label: 'Tile leaf' },
              { id: 'button-leaf', kind: 'button', label: 'Button leaf' },
            ],
          },
        ]}
      />,
    ),
  )
  expect(
    host
      .querySelector('[data-tree-node-id="branch"]')
      ?.getAttribute('aria-expanded'),
  ).toBe('true')
  for (const id of ['tile-leaf', 'button-leaf'])
    expect(
      host
        .querySelector(`[data-tree-node-id="${id}"]`)
        ?.hasAttribute('aria-expanded'),
    ).toBe(false)
})
it('id identifies the actual primary control for keyboard focus and ARIA references', async () => {
  await render({
    id: 'tab-control',
    role: 'tab',
    children: <strong>Tab</strong>,
  })
  const control = document.getElementById('tab-control')!
  control.focus()
  expect(document.activeElement).toBe(control)
  expect(control.getAttribute('role')).toBe('tab')
})

it('adding and removing actions preserves the focused primary control', async () => {
  await render({ children: 'Title', onClick: vi.fn() })
  const control = tile().querySelector<HTMLButtonElement>(
    '[data-part="primary"]',
  )!
  control.focus()
  for (const actions of [<Button key="edit">Edit</Button>, false]) {
    await render({ children: 'Title', onClick: vi.fn(), actions })
    expect(tile().querySelector('[data-part="primary"]')).toBe(control)
    expect(document.activeElement).toBe(control)
  }
})
it('region ARIA stays on the container while control naming addresses the primary button', async () => {
  await render({
    children: 'Title',
    interactive: true,
    actions: <Button>Edit</Button>,
    'aria-hidden': true,
    'aria-live': 'polite',
    'aria-atomic': true,
    'aria-label': 'Open',
    actionVisibility: 'always',
  })
  expect(tile().getAttribute('aria-hidden')).toBe('true')
  // Every control, the actions included, sits inside the hidden region.
  const buttons = [...host.querySelectorAll('button')]
  expect(buttons).toHaveLength(2)
  expect(buttons.every((node) => tile().contains(node))).toBe(true)
  expect(tile().getAttribute('aria-live')).toBe('polite')
  expect(tile().getAttribute('aria-atomic')).toBe('true')
  expect(
    tile().querySelector('[data-part="primary"]')?.getAttribute('aria-label'),
  ).toBe('Open')
})

describe('component smoke', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;({ host: container, root } = mount())
  })

  it('Tile preserves button-like keyboard semantics and nested action isolation', async () => {
    const handleTileClick = vi.fn()
    const handleActionClick = vi.fn()

    await act(async () => {
      root.render(
        <Tile
          meta="Ready"
          icon="file"
          active
          onClick={handleTileClick}
          actions={<Button onClick={handleActionClick}>More</Button>}
        >
          Project map
        </Tile>,
      )
    })

    const tile = container.querySelector(
      '[data-scope="tile"][data-part="root"]',
    ) as HTMLElement | null
    const action = container.querySelector(
      '[data-scope="tile"][data-part="actions"] button',
    ) as HTMLButtonElement | null

    const primary = tile?.querySelector<HTMLButtonElement>(
      '[data-part="primary"]',
    )
    expect(tile?.getAttribute('role')).toBeNull()
    expect(primary?.type).toBe('button')
    expect(primary?.tabIndex).toBe(0)
    expect(tile?.getAttribute('aria-disabled')).toBeNull()
    expect(tile?.getAttribute('data-active')).toBe('')
    expect(
      tile?.querySelector('[data-part="text"] .uf-tile__label')?.textContent,
    ).toBe('Project map')
    expect(tile?.textContent).toContain('Project map')
    expect(tile?.textContent).toContain('Ready')
    expect(action?.textContent).toContain('More')

    await act(async () => {
      tile?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      primary?.click()
      primary?.click()
    })

    expect(handleTileClick).toHaveBeenCalledTimes(3)

    await act(async () => {
      action?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(handleActionClick).toHaveBeenCalledTimes(1)
    expect(handleTileClick).toHaveBeenCalledTimes(3)

    await act(async () => {
      const enterFromAction = new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true,
      })
      const spaceFromAction = new KeyboardEvent('keydown', {
        key: ' ',
        bubbles: true,
        cancelable: true,
      })
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

    const nestedInput = container.querySelector(
      'input[aria-label="Project name"]',
    ) as HTMLInputElement | null
    await act(async () => {
      const spaceFromInput = new KeyboardEvent('keydown', {
        key: ' ',
        bubbles: true,
        cancelable: true,
      })
      expect(nestedInput?.dispatchEvent(spaceFromInput)).toBe(true)
    })

    expect(handleTileClick).toHaveBeenCalledTimes(3)

    await act(async () => {
      root.render(
        <Tile disabled onClick={handleTileClick}>Disabled project</Tile>,
      )
    })

    const disabledTile = container.querySelector(
      '[data-scope="tile"][data-part="root"]',
    ) as HTMLElement | null
    expect(disabledTile?.tabIndex).toBe(-1)
    expect(
      disabledTile?.querySelector<HTMLButtonElement>('[data-part="primary"]')
        ?.disabled,
    ).toBe(true)

    await act(async () => {
      disabledTile?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      disabledTile?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
      )
    })

    expect(handleTileClick).toHaveBeenCalledTimes(3)
  })

  it('Tile owns ellipsis behavior for constrained text slots', async () => {
    await act(async () => {
      root.render(
        <Tile
          meta="Ready"
          icon="file"
          style={{ width: '5rem' }}
        >
          A very long navigation item name that must not expand the tile
        </Tile>,
      )
    })

    const tile = container.querySelector(
      '[data-scope="tile"][data-part="root"]',
    ) as HTMLElement | null
    const textSlot = tile?.querySelector(
      '[data-scope="tile"][data-part="text"]',
    ) as HTMLElement | null
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

    const composedSlot = container.querySelector(
      '[data-scope="tile"][data-part="text"]',
    ) as HTMLElement | null
    expect(composedSlot?.tagName).toBe('DIV')
    expect(composedSlot?.getAttribute('data-truncate')).toBe('')
    expect(composedSlot?.querySelector('.uf-membrane--truncate')).not.toBeNull()

    const tileStyles = libraryCss()
    expect(tileStyles).toContain(
      '[data-scope="tile"] > [data-part="text"] > .uf-membrane--truncate',
    )
    expect(tileStyles).toContain(
      '[data-scope="tile"] > [data-part="text"] > .uf-membrane:not(.uf-membrane--truncate)',
    )
    expect(tileStyles).toContain('text-overflow: ellipsis;')
  })

  it('Tile applies Button-like icon inset only for its own icon slot', async () => {
    await act(async () => {
      root.render(<Tile icon="file">Page title</Tile>)
    })

    const iconTile = container.querySelector(
      '[data-scope="tile"][data-part="root"]',
    ) as HTMLElement | null
    expect(iconTile?.getAttribute('data-icon-start')).toBe('')
    expect(
      iconTile?.querySelector('[data-scope="tile"][data-part="icon"]'),
    ).not.toBeNull()

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

    const nestedButtonTile = container.querySelector(
      '[data-scope="tile"][data-part="root"]',
    ) as HTMLElement | null
    expect(nestedButtonTile?.hasAttribute('data-icon-start')).toBe(false)
    expect(nestedButtonTile?.hasAttribute('data-icon-end')).toBe(false)
    expect(
      nestedButtonTile?.querySelector(
        '[data-scope="tile"][data-part="leading"] button[data-scope="button"]',
      ),
    ).not.toBeNull()
    expect(
      nestedButtonTile?.querySelector(
        '[data-scope="tile"][data-part="actions"] button[data-scope="button"]',
      ),
    ).not.toBeNull()
  })

  it('Tile composes row state and isolated controls', async () => {
    const handleTileClick = vi.fn()
    const handleLeadingClick = vi.fn()

    await act(async () => {
      root.render(
        <Tile
          tone="muted"
          active={true}
          aria-busy={true}
          chevron="down"
          aria-expanded={false}
          actionVisibility="always"
          leading={
            <Button icon="folder" iconOnly onClick={handleLeadingClick} />
          }
          meta={<span>3</span>}
          actions={<Button icon="plus" iconOnly />}
          onClick={handleTileClick}
        >
          Workspaces
        </Tile>,
      )
    })

    const tile = container.querySelector(
      '[data-scope="tile"][data-part="root"]',
    ) as HTMLElement | null
    const text = tile?.querySelector(
      '[data-scope="tile"][data-part="text"]',
    ) as HTMLElement | null
    const leading = tile?.querySelector(
      '[data-scope="tile"][data-part="leading"]',
    ) as HTMLElement | null
    const meta = tile?.querySelector(
      '[data-scope="tile"][data-part="meta"]',
    ) as HTMLElement | null

    expect(tile?.getAttribute('data-density')).toBe('default')
    expect(tile?.getAttribute('data-tone')).toBe('muted')
    expect(tile?.getAttribute('data-action-visibility')).toBe('always')
    expect(tile?.getAttribute('data-active')).toBe('')
    expect(tile?.getAttribute('data-busy')).toBe('')
    expect(tile?.getAttribute('aria-busy')).toBe('true')
    expect(text?.textContent).toContain('Workspaces')
    expect(leading).not.toBeNull()
    expect(meta?.textContent).toBe('3')

    await act(async () => {
      leading
        ?.querySelector('button')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(handleLeadingClick).toHaveBeenCalledTimes(1)
    expect(handleTileClick).not.toHaveBeenCalled()

    await act(async () => {
      tile?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(handleTileClick).toHaveBeenCalledTimes(1)
  })

  it('Tile can render non-interactive headings', async () => {
    await act(async () => {
      root.render(
        <Tile tone="muted" interactive={false}>
          Collections
        </Tile>,
      )
    })

    const tile = container.querySelector(
      '[data-scope="tile"][data-part="root"]',
    ) as HTMLElement | null
    const text = tile?.querySelector(
      '[data-scope="tile"][data-part="text"]',
    ) as HTMLElement | null
    const membrane = tile?.parentElement as HTMLElement | null

    expect(tile?.getAttribute('data-tone')).toBe('muted')
    expect(tile?.hasAttribute('data-interactive')).toBe(false)
    expect(tile?.getAttribute('role')).toBeNull()
    expect(tile?.getAttribute('tabindex')).toBeNull()
    expect(membrane?.classList.contains('uf-membrane')).toBe(true)
    expect(membrane?.hasAttribute('data-membrane-interactive')).toBe(false)
    expect(text?.textContent).toContain('Collections')
  })

  it('Tile selector mode renders the selector indicator inside the text slot', async () => {
    await act(async () => {
      root.render(
        <Tile
          icon="folder"
          chevron="down"
          aria-expanded={true}
        >
          Project
        </Tile>,
      )
    })

    const tile = container.querySelector(
      '[data-scope="tile"][data-selector]',
    ) as HTMLElement | null
    const textSlot = tile?.querySelector(
      '[data-scope="tile"][data-part="text"]',
    ) as HTMLElement | null
    const indicator = textSlot?.querySelector(
      '[data-part="indicator"] svg[data-icon="select-chevron-up"]',
    )

    expect(tile?.getAttribute('data-stretch-text')).toBeNull()
    expect(textSlot?.textContent).toContain('Project')
    expect(indicator).not.toBeNull()

    await act(async () => {
      root.render(
        <Tile chevron="down" aria-expanded={true}>
          <span className="custom-label">Properties</span>
        </Tile>,
      )
    })

    const customTextSlot = container.querySelector(
      '[data-scope="tile"][data-part="text"]',
    ) as HTMLElement | null
    const labelSlot = customTextSlot?.querySelector(
      '.uf-tile__labelSlot',
    ) as HTMLElement | null

    expect(customTextSlot?.textContent).toContain('Properties')
    expect(labelSlot?.querySelector('.custom-label')?.textContent).toBe(
      'Properties',
    )
    expect(
      customTextSlot?.querySelector(
        '[data-part="indicator"] svg[data-icon="select-chevron-up"]',
      ),
    ).not.toBeNull()
  })
})
