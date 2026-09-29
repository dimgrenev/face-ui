import { act, useState } from 'react'
import { renderToString } from 'react-dom/server'
import { expect, it } from 'vitest'
import { Modal } from '../../Modal/Modal'
import { Select } from '../../Select/Select'
import { FaceUiOverlayProvider } from '../adapters/react/overlay-context'
import { mount } from './harness'

function Instance({ name, modal = false }: { name: string; modal?: boolean }) {
  const [scopeRoot, setScopeRoot] = useState<HTMLDivElement | null>(null)
  const [portalContainer, setPortalContainer] = useState<HTMLDivElement | null>(null)
  return <div data-instance={name} ref={setScopeRoot}>
    <FaceUiOverlayProvider scopeRoot={scopeRoot} portalContainer={portalContainer}>
      {modal ? <Modal title={`${name} dialog`} trigger={`${name} modal`} scrollLock>
        <button>{name} inside</button>
      </Modal> : <Select aria-label={`${name} select`} surface="popover" defaultOpen
        items={[{ value: 'one', label: `${name} option` }]} />}
      <button data-neighbor={name}>{name} neighbor</button>
    </FaceUiOverlayProvider>
    <div data-portal={name} ref={setPortalContainer} />
  </div>
}

const key = (node: EventTarget, name: string) => act(async () => {
  node.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true }))
})

it('keeps two Select portals and Escape lifetimes inside their own providers', async () => {
  const { host, root } = mount()
  const tree = (showA: boolean) => <FaceUiOverlayProvider scopeRoot={host}>
    {showA ? <Instance key="a" name="A" /> : null}
    <Instance key="b" name="B" />
  </FaceUiOverlayProvider>
  await act(async () => root.render(tree(true)))
  const trigger = (name: string) => host.querySelector<HTMLButtonElement>(`[data-instance="${name}"] [role="combobox"]`)!
  const portal = (name: string) => host.querySelector<HTMLElement>(`[data-portal="${name}"]`)!
  expect(portal('A').querySelector('[role="listbox"]')).not.toBeNull()
  expect(portal('B').querySelector('[role="listbox"]')).not.toBeNull()
  trigger('A').focus()
  await key(document, 'Escape')
  expect(portal('A').querySelector('[role="listbox"]')).toBeNull()
  const secondList = portal('B').querySelector('[role="listbox"]')
  expect(secondList).not.toBeNull()
  await act(async () => root.render(tree(false)))
  expect(portal('B').querySelector('[role="listbox"]')).toBe(secondList)
})

it('dismisses an outside press for the active instance only', async () => {
  const { host, root } = mount()
  await act(async () => root.render(<>
    <Instance name="A" />
    <Instance name="B" />
  </>))
  host.querySelector<HTMLElement>('[data-instance="A"] [role="combobox"]')!.focus()
  const press = new MouseEvent('pointerdown', { bubbles: true, cancelable: true })
  Object.defineProperty(press, 'pointerType', { value: 'mouse' })
  await act(async () => host.querySelector('[data-instance="A"]')!.dispatchEvent(press))
  expect(host.querySelector('[data-portal="A"] [role="listbox"]')).toBeNull()
  expect(host.querySelector('[data-portal="B"] [role="listbox"]')).not.toBeNull()
})

it('scopes modal inertness and focus to its own instance', async () => {
  const { host, root } = mount()
  await act(async () => root.render(<>
    <Instance name="A" modal />
    <Instance name="B" />
  </>))
  await act(async () => host.querySelector<HTMLButtonElement>('[data-instance="A"] [data-scope="modal"][data-part="trigger"]')!.click())
  expect(host.querySelector('[data-portal="A"] [role="dialog"]')).not.toBeNull()
  const scopeA = host.querySelector<HTMLElement>('[data-instance="A"]')!
  const scopeB = host.querySelector<HTMLElement>('[data-instance="B"]')!
  expect(scopeA.style.overflow).toBe('hidden')
  expect(scopeB.style.overflow).toBe('')
  expect(document.body.style.overflow).toBe('')
  const neighbor = host.querySelector<HTMLButtonElement>('[data-neighbor="B"]')!
  expect(neighbor.closest('[inert]')).toBeNull()
  await act(async () => neighbor.focus())
  expect(document.activeElement).toBe(neighbor)
  await key(neighbor, 'Escape')
  expect(host.querySelector('[data-portal="A"] [role="dialog"]')).not.toBeNull()
  await act(async () => root.render(<Instance name="B" />))
  expect(scopeA.style.overflow).toBe('')
  expect(document.body.style.overflow).toBe('')
})

it('moves an open portal to a new host target without losing its layer', async () => {
  let move = () => {}
  function Retarget() {
    const [scopeRoot, setScopeRoot] = useState<HTMLDivElement | null>(null)
    const [first, setFirst] = useState<HTMLDivElement | null>(null)
    const [second, setSecond] = useState<HTMLDivElement | null>(null)
    const [moved, setMoved] = useState(false)
    move = () => setMoved(true)
    return <div ref={setScopeRoot}>
      <FaceUiOverlayProvider scopeRoot={scopeRoot} portalContainer={moved ? second : first}>
        <Select aria-label="Retarget" surface="popover" defaultOpen
          items={[{ value: 'one', label: 'One' }]} />
      </FaceUiOverlayProvider>
      <div data-target="first" ref={setFirst} />
      <div data-target="second" ref={setSecond} />
    </div>
  }
  const { host, root } = mount()
  await act(async () => root.render(<Retarget />))
  expect(host.querySelector('[data-target="first"] [role="listbox"]')).not.toBeNull()
  await act(async () => move())
  expect(host.querySelector('[data-target="first"] [role="listbox"]')).toBeNull()
  expect(host.querySelector('[data-target="second"] [role="listbox"]')).not.toBeNull()
  const trigger = host.querySelector<HTMLElement>('[role="combobox"]')!
  trigger.focus()
  await key(document, 'Escape')
  expect(host.querySelector('[data-target="second"] [role="listbox"]')).toBeNull()
})

it('keeps the first server render portal-free', () => {
  const markup = renderToString(<Instance name="Server" />)
  expect(markup).toContain('Server select')
  expect(markup).not.toContain('role="listbox"')
})

it('uses the legacy body portal without a provider', async () => {
  const { host, root } = mount()
  await act(async () => root.render(<Select aria-label="Legacy" surface="popover" items={[{ value: 'one', label: 'One' }]} />))
  await act(async () => host.querySelector<HTMLButtonElement>('[role="combobox"]')!.click())
  const content = document.querySelector('[role="listbox"]')
  expect(content).not.toBeNull()
  expect(host.contains(content)).toBe(false)
})

it('keeps document modal behavior when only a portal container is supplied', async () => {
  function PortalOnly() {
    const [container, setContainer] = useState<HTMLDivElement | null>(null)
    return <>
      <FaceUiOverlayProvider portalContainer={container}>
        <Modal title="Portal-only" trigger="Open portal-only" scrollLock>
          <button>Inside portal-only</button>
        </Modal>
        <button data-outside>Outside portal-only</button>
      </FaceUiOverlayProvider>
      <div data-container ref={setContainer} />
    </>
  }
  const { host, root } = mount()
  await act(async () => root.render(<PortalOnly />))
  await act(async () => host.querySelector<HTMLButtonElement>('[data-part="trigger"]')!.click())
  const dialog = host.querySelector<HTMLElement>('[role="dialog"]')!
  const outside = host.querySelector<HTMLButtonElement>('[data-outside]')!
  expect(host.querySelector('[data-container] [role="dialog"]')).toBe(dialog)
  expect(document.body.style.overflow).toBe('hidden')
  expect(outside.closest('[inert]')).not.toBeNull()
  await act(async () => outside.focus())
  expect(document.activeElement).toBe(dialog.querySelector('[data-part="close"]'))
  await key(document.activeElement!, 'Escape')
  expect(host.querySelector('[role="dialog"]')).toBeNull()
  expect(document.body.style.overflow).toBe('')
})

it('does not lock the page while a modal waits for a null portal container', async () => {
  const { host, root } = mount()
  await act(async () => root.render(
    <FaceUiOverlayProvider portalContainer={null}>
      <Modal title="Waiting" defaultOpen scrollLock>Waiting content</Modal>
    </FaceUiOverlayProvider>,
  ))
  expect(host.querySelector('[role="dialog"]')).toBeNull()
  expect(document.body.style.overflow).toBe('')
  expect(document.querySelector('[inert]')).toBeNull()
})

it('uses the scope root as the default portal host when no target is supplied', async () => {
  function RootOnly() {
    const [scopeRoot, setScopeRoot] = useState<HTMLDivElement | null>(null)
    return <>
      <div data-scope-root ref={setScopeRoot}>
        <FaceUiOverlayProvider scopeRoot={scopeRoot}>
          <Modal title="Root-only" defaultOpen scrollLock>Scoped content</Modal>
          <button data-scoped-neighbor>Scoped neighbor</button>
        </FaceUiOverlayProvider>
      </div>
      <button data-other-instance>Other instance</button>
    </>
  }
  const { host, root } = mount()
  await act(async () => root.render(<RootOnly />))
  const scopeRoot = host.querySelector<HTMLElement>('[data-scope-root]')!
  expect(scopeRoot.querySelector('[role="dialog"]')).not.toBeNull()
  expect(scopeRoot.style.overflow).toBe('hidden')
  expect(document.body.style.overflow).toBe('')
  expect(host.querySelector('[data-scoped-neighbor]')!.closest('[inert]')).not.toBeNull()
  expect(host.querySelector('[data-other-instance]')!.closest('[inert]')).toBeNull()
})
