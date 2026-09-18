import React, { act } from 'react'
import type { Root } from 'react-dom/client'
import { beforeEach, describe, expect, it } from 'vitest'
import { Icon, ICON_NAMES } from '../../Icon/Icon'
import { expectDevError, mount } from './harness'

let host: HTMLDivElement
let root: Root
const render = async (node: React.ReactNode) => {
  await act(async () => root.render(node))
}
beforeEach(() => {
  ;({ host, root } = mount())
})

describe('Icon prop contract', () => {
  it('name renders every registered glyph and safely resolves arbitrary names after updates', async () => {
    for (const name of ICON_NAMES) {
      await render(<Icon name={name} />)
      expect(
        host.querySelector('svg > path, svg > g, svg > circle, svg > rect'),
        name,
      ).not.toBeNull()
      expect(host.querySelector('svg')?.getAttribute('data-icon')).toBe(name)
    }
    await render(<Icon name="notdef" />)
    const fallback = host.querySelector('svg')!.innerHTML
    for (const name of [
      'unknown',
      'constructor',
      'toString',
      '__proto__',
      'https://example.com/icon.svg',
    ]) {
      await expectDevError(
        () => render(<Icon name={name} />),
        /^Face UI Icon: invalid name ".+"; rendering notdef\.$/,
      )
      expect(host.querySelector('svg')?.innerHTML, name).toBe(fallback)
    }
    await render(<Icon name="  user  " />)
    expect(host.querySelector('svg')?.getAttribute('data-icon')).toBe('user')
    await render(<Icon name="  " />)
    expect(host.firstChild).toBeNull()
  })
  it('aria-label and title have distinct accessible and visible-hint roles and can be removed', async () => {
    await render(<Icon name="user" />)
    expect(host.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
    await render(<Icon name="user" title="Account" />)
    expect(host.querySelector('title')?.textContent).toBe('Account')
    expect(host.querySelector('svg')?.getAttribute('aria-hidden')).toBeNull()
    expect(host.querySelector('svg')?.getAttribute('role')).toBe('img')
    await render(<Icon name="user" aria-label="Profile" title="Account" />)
    expect(host.querySelector('svg')?.getAttribute('aria-label')).toBe(
      'Profile',
    )
    expect(host.querySelector('title')?.textContent).toBe('Account')
    await render(<Icon name="user" aria-label=" " title=" " />)
    expect(host.querySelector('title')).toBeNull()
    expect(host.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
  })
  it('className and paint styles reach the SVG without changing the fixed icon box', async () => {
    await render(
      <Icon
        name="crop"
        className="custom"
        style={{ color: 'red', opacity: 0.5 }}
      />,
    )
    const node = host.querySelector('svg')!
    expect(node.classList.contains('custom')).toBe(true)
    expect(node.style.color).toBe('red')
    expect(node.style.opacity).toBe('0.5')
    expect(node.getAttribute('viewBox')).toBe('0 0 10 20')
    expect(node.style.width).toBe('20px')
    expect(node.style.height).toBe('20px')
  })
})

describe('component smoke', () => {
  let container: HTMLDivElement
  let root: Root
  const settingsPath =
    'M10 3L11.8751 5.47299L14.9497 5.05025L14.527 8.12485L17 10L14.527 11.8751L14.9497 14.9497L11.8751 14.527L10 17L8.12485 14.527L5.05025 14.9497L5.47299 11.8751L3 10L5.47299 8.12485L5.05025 5.05025L8.12485 5.47299L10 3Z'
  const browserPath =
    'M4 10C4 6.18182 7 4 10 4C13 4 16 6.18182 16 10C16 13.8182 13 16 10 16C7 16 4 13.8182 4 10Z'
  const chatPath =
    'M11.5 4.50019H9L8.50016 4.50016C6.29096 4.50007 4.5 6.29096 4.5 8.50016V11.5002C4.5 13.7092 6.29076 15.5001 8.49983 15.5002L9 15.5002H11.5C13.7091 15.5002 15.5 13.7093 15.5 11.5002V8.50019C15.5 6.29105 13.7091 4.50019 11.5 4.50019Z'
  const folderGoPath = 'M11 15.5H15.5L15.5 6.5H10.5L9 4.5H4.5V8'
  const fullPath = 'M10.2 5L15 5V9.8M9.8 15L5 15V10.2'
  const partPath = 'M16 8.7998L11.2 8.7998L11.2 3.9998'
  const micPath =
    'M7.5 5.5C7.5 4.39543 8.39543 3.5 9.5 3.5H10.5C11.6046 3.5 12.5 4.39543 12.5 5.5V10.5C12.5 11.6046 11.6046 12.5 10.5 12.5L9.5 12.5C8.39543 12.5 7.5 11.6046 7.5 10.5V5.5Z'
  const sidebarLeftClosedPath =
    'M5.5 6.36035C5.85346 6.36035 6.13965 6.64654 6.13965 7V13C6.13965 13.3535 5.85346 13.6396 5.5 13.6396C5.14654 13.6396 4.86035 13.3535 4.86035 13V7C4.86035 6.64654 5.14654 6.36035 5.5 6.36035Z'
  const notdefPath = 'M15.5 4.50019H9L4.5 4.5V15.5L9 15.5002H15.5V4.50019Z'
  const moreCenterDotSelector = 'circle[cx="10"][cy="10"][r="1"]'

  beforeEach(() => {
    ;({ host: container, root } = mount())
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
    await expectDevError(
      () => act(async () => root.render(<Icon name="git" />)),
      /^Face UI Icon: invalid name "git"; rendering notdef\.$/,
    )

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
        </>,
      )
    })

    expect(
      container.querySelector('svg[data-icon="layout-sidebar-left"]'),
    ).not.toBeNull()
    expect(
      container.querySelector('svg[data-icon="layout-sidebar-left-open"]'),
    ).not.toBeNull()
    expect(
      container.querySelector('svg[data-icon="layout-sidebar-right"]'),
    ).not.toBeNull()
    expect(
      container.querySelector('svg[data-icon="layout-sidebar-right-open"]'),
    ).not.toBeNull()
    expect(
      container.querySelector(`path[d="${sidebarLeftClosedPath}"]`),
    ).not.toBeNull()
    expect(container.querySelector(`path[d="${notdefPath}"]`)).toBeNull()
  })

  it('Icon wrapper includes main-window expand and save glyphs', async () => {
    await act(async () => {
      root.render(
        <>
          <Icon name="arrow_expand_simple" />
          <Icon name="arrows_contract_simple" />
          <Icon name="floppy-disk" />
        </>,
      )
    })

    expect(
      container.querySelector('svg[data-icon="arrow_expand_simple"]'),
    ).not.toBeNull()
    expect(
      container.querySelector('svg[data-icon="arrows_contract_simple"]'),
    ).not.toBeNull()
    expect(
      container.querySelector('svg[data-icon="floppy-disk"]'),
    ).not.toBeNull()
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
})
