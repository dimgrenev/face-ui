import React, { act, useEffect, useId } from 'react'
import { createPortal } from 'react-dom'
import type { Root } from 'react-dom/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Button } from '../../Button/Button'
import { Checkbox } from '../../Checkbox/Checkbox'
import { Icon, IconProvider, type IconProps } from '../../Icon/Icon'
import { Input } from '../../Input/Input'
import { Menu } from '../../Menu/Menu'
import { Modal } from '../../Modal/Modal'
import { Radio } from '../../Radio/Radio'
import { Select } from '../../Select/Select'
import { Text } from '../../Text/Text'
import { Tile } from '../../Tile/Tile'
import { Toast } from '../../Toast/Toast'
import { IconProvider as PublicIconProvider } from '../../index'
import { mount } from './harness'

let host: HTMLDivElement
let root: Root
beforeEach(() => {
  ;({ host, root } = mount())
})
const render = (node: React.ReactNode) => act(async () => root.render(node))

function HostIcon({ name, className, style, title, 'aria-label': ariaLabel }: IconProps) {
  return <svg className={className} style={{ ...style, width: 20, height: 20 }}
    width={20} height={20} viewBox="0 0 20 20" data-host-icon={name}
    role={ariaLabel || title ? 'img' : undefined}
    aria-label={ariaLabel} aria-hidden={ariaLabel || title ? undefined : true}>
    {title ? <title>{title}</title> : null}
  </svg>
}

describe('IconProvider', () => {
  it('exports the same boundary from the package root and the Icon entry point', () => {
    expect(PublicIconProvider).toBe(IconProvider)
  })

  it('delegates requested names and presentation to a React component with independent hooks', async () => {
    let mounted = 0, unmounted = 0
    function StatefulHostIcon(props: IconProps) {
      const id = useId()
      useEffect(() => {
        mounted += 1
        return () => { unmounted += 1 }
      }, [])
      return <g id={id}><HostIcon {...props} /></g>
    }
    const view = (name: string) => <IconProvider renderer={StatefulHostIcon}>
      <svg><Icon name={name} className="custom" style={{ color: 'red', opacity: .5 }}
        aria-label="Project" title="Current project" /></svg>
    </IconProvider>
    // The host can resolve names beyond Face UI aliases; no notdef or built-in diagnostic leaks.
    await render(view('  product-private-name  '))
    const icon = host.querySelector<SVGSVGElement>('[data-host-icon]')!
    const instanceId = icon.parentElement!.id
    expect(icon.getAttribute('data-host-icon')).toBe('product-private-name')
    expect(icon.classList.contains('custom')).toBe(true)
    expect(icon.style.color).toBe('red')
    expect(icon.style.opacity).toBe('0.5')
    expect(icon.getAttribute('role')).toBe('img')
    expect(icon.getAttribute('aria-label')).toBe('Project')
    expect(icon.querySelector('title')?.textContent).toBe('Current project')
    expect(host.querySelector('[data-iconset]')).toBeNull()
    await render(view('folder'))
    expect(host.querySelector('[data-host-icon]')).toBe(icon)
    expect(icon.parentElement!.id).toBe(instanceId)
    expect(icon.getAttribute('data-host-icon')).toBe('folder')
    expect(mounted).toBe(1)
    expect(unmounted).toBe(0)
    await render(<Icon name="folder" />)
    expect(unmounted).toBe(1)
    expect(host.querySelector('svg')?.getAttribute('data-iconset')).toBe('iconoteka')
  })

  it('keeps blank names empty without invoking the host renderer', async () => {
    const renderer = vi.fn(HostIcon)
    await render(<IconProvider renderer={renderer}><Icon name="  " /></IconProvider>)
    expect(host.firstChild).toBeNull()
    expect(renderer).not.toHaveBeenCalled()
  })

  it('inherits an omitted renderer and isolates a null reset, including React portals', async () => {
    const portalTarget = document.body.appendChild(document.createElement('div'))
    try {
      await render(<IconProvider renderer={HostIcon}>
        <IconProvider><Icon name="folder" /></IconProvider>
        {createPortal(<>
          <Icon name="chat" />
          <IconProvider renderer={null}><Icon name="folder" /></IconProvider>
          <Icon name="close" />
        </>, portalTarget)}
      </IconProvider>)
      expect(host.querySelector('[data-host-icon="folder"]')).not.toBeNull()
      expect(portalTarget.querySelector('[data-host-icon="chat"]')).not.toBeNull()
      expect(portalTarget.querySelector('[data-host-icon="close"]')).not.toBeNull()
      const resetIcon = portalTarget.querySelector<SVGSVGElement>('svg[data-icon="folder"]')!
      expect(resetIcon.getAttribute('data-iconset')).toBe('iconoteka')
      expect(resetIcon.getAttribute('width')).toBe('20')
      expect(resetIcon.getAttribute('viewBox')).toBe('0 0 24 24')
      expect(resetIcon.style.width).toBe('20px')
    } finally {
      await render(null)
      portalTarget.remove()
    }
  })

  const controls: Array<[string, () => React.ReactNode]> = [
    ['Button leading icon and disclosure', () => <Button icon="folder" chevron="down">Project</Button>],
    ['Tile leading icon and disclosure', () => <Tile icon="folder" chevron="end" aria-expanded>Project</Tile>],
    ['Input leading icon', () => <Input icon="folder" aria-label="Path" />],
    ['Text leading icon', () => <Text icon="chat">Chat</Text>],
    ['Checkbox checked and mixed indicators', () => <><Checkbox checked label="Checked" />
      <Checkbox checked="indeterminate" label="Mixed" /><Checkbox label="Unchecked" /></>],
    ['Radio selected and unselected indicators', () => <Radio name="plan" aria-label="Plan"
      value="one" items={[{ value: 'one', label: 'One' }, { value: 'two', label: 'Two' }]} />],
    ['Toast close button', () => <Toast title="Saved" onClose={() => {}} />],
    ['Select disclosure and checked option in its portal', () => <Select surface="popover" open
      aria-label="Plan" value="one" items={[{ value: 'one', label: 'One' }]} />],
    ['Menu item and checked marker in its portal', () => <Menu surface="popover" open
      items={[{ value: 'one', label: 'One', icon: 'folder', checked: true }]}><button>Actions</button></Menu>],
    ['Modal close button in its portal', () => <Modal open title="Dialog"><button>Inside</button></Modal>],
  ]
  it.each(controls)('routes %s through the boundary without replacing control anatomy', async (_, view) => {
    await render(view())
    const originalIcons = [...document.querySelectorAll<SVGSVGElement>('svg[data-iconset]')]
    const requestedNames = originalIcons.map(icon => icon.getAttribute('data-icon'))
    expect(requestedNames.length).toBeGreaterThan(0)
    for (const icon of originalIcons) {
      expect(icon.getAttribute('width')).toBe('20')
      expect(icon.getAttribute('height')).toBe('20')
    }
    await render(<IconProvider renderer={HostIcon}>{view()}</IconProvider>)
    const hostIcons = [...document.querySelectorAll<SVGSVGElement>('svg[data-host-icon]')]
    expect(hostIcons.map(icon => icon.getAttribute('data-host-icon'))).toEqual(requestedNames)
    expect(document.querySelector('svg[data-iconset]')).toBeNull()
    for (const icon of hostIcons) {
      expect(icon.getAttribute('width')).toBe('20')
      expect(icon.getAttribute('height')).toBe('20')
      expect(icon.style.width).toBe('20px')
      expect(icon.style.height).toBe('20px')
    }
    await render(<IconProvider renderer={HostIcon}><IconProvider renderer={null}>{view()}</IconProvider></IconProvider>)
    expect(document.querySelector('[data-host-icon]')).toBeNull()
    expect([...document.querySelectorAll('svg[data-iconset]')].map(icon => icon.getAttribute('data-icon')))
      .toEqual(requestedNames)
  })
})
