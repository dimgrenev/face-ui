// @vitest-environment jsdom

import React from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { Accordion, type AccordionItem } from '../../Accordion/Accordion'
import { Navigation, type NavigationItem } from '../../Navigation/Navigation'

const accordionItems: AccordionItem[] = [
  { value: 'overview', label: 'Overview', content: 'Overview content' },
  { value: 'details', label: 'Details', content: 'Details content', disabled: true },
  { value: 'billing', label: 'Billing', content: 'Billing content' },
]

const navigationItems: NavigationItem[] = [
  { id: 'home', label: 'Home' },
  {
    id: 'library',
    label: 'Library',
    items: [
      { id: 'typefaces', label: 'Typefaces', href: '#typefaces' },
      { id: 'components', label: 'Components' },
    ],
  },
  { id: 'disabled', label: 'Disabled', disabled: true },
  { id: 'settings', label: 'Settings' },
]

function keyDown(node: HTMLElement, key: string) {
  node.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
}

describe('Accordion and Navigation disclosure a11y baseline', () => {
  let container: HTMLDivElement
  let root: Root

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

  function getAccordionTrigger(value: string): HTMLButtonElement {
    const trigger = container.querySelector<HTMLButtonElement>(`button[data-scope="accordion"][data-part="trigger"][data-value="${value}"]`)
    expect(trigger).not.toBeNull()
    return trigger as HTMLButtonElement
  }

  function getAccordionContent(value: string): HTMLElement {
    const trigger = getAccordionTrigger(value)
    const contentId = trigger.getAttribute('aria-controls')
    expect(contentId).toBeTruthy()
    const content = contentId ? container.ownerDocument.getElementById(contentId) : null
    expect(content).not.toBeNull()
    return content as HTMLElement
  }

  function getNavTrigger(id: string): HTMLElement {
    const trigger = container.querySelector<HTMLElement>(`[role="menuitem"][data-scope="navigation"][data-part="trigger"][data-value="${id}"]`)
    expect(trigger).not.toBeNull()
    return trigger as HTMLElement
  }

  function getNavContent(id: string): HTMLElement {
    const content = container.querySelector<HTMLElement>(`[role="menu"][data-scope="navigation"][data-part="content"][data-value="${id}"]`)
    expect(content).not.toBeNull()
    return content as HTMLElement
  }

  it('wires Accordion button triggers to controlled regions and disabled items', async () => {
    await act(async () => {
      root.render(
        <Accordion
          items={accordionItems}
          defaultExpandedIds={['overview']}
        />,
      )
    })

    const overviewTrigger = getAccordionTrigger('overview')
    const detailsTrigger = getAccordionTrigger('details')
    const billingTrigger = getAccordionTrigger('billing')
    const overviewContent = getAccordionContent('overview')
    const detailsContent = getAccordionContent('details')
    const billingContent = getAccordionContent('billing')

    expect(overviewTrigger.getAttribute('role')).toBe('button')
    expect(overviewTrigger.id).toMatch(/^accordion:r\d+:trigger:overview$/)
    expect(overviewTrigger.getAttribute('aria-expanded')).toBe('true')
    expect(overviewTrigger.getAttribute('aria-controls')).toBe(overviewContent.id)
    expect(overviewContent.getAttribute('role')).toBe('region')
    expect(overviewContent.getAttribute('aria-labelledby')).toBe(overviewTrigger.id)
    expect(overviewContent.hidden).toBe(false)

    expect(detailsTrigger.disabled).toBe(true)
    expect(detailsTrigger.getAttribute('aria-expanded')).toBe('false')
    expect(detailsTrigger.getAttribute('aria-controls')).toBe(detailsContent.id)
    expect(detailsContent.getAttribute('role')).toBe('region')
    expect(detailsContent.hidden).toBe(true)

    expect(billingTrigger.getAttribute('aria-expanded')).toBe('false')
    expect(billingTrigger.getAttribute('aria-controls')).toBe(billingContent.id)
    expect(billingContent.hidden).toBe(true)
  })

  it('keeps single Accordion expansion and honors collapsible mode', async () => {
    await act(async () => {
      root.render(
        <Accordion
          items={accordionItems}
          defaultExpandedIds={['overview']}
          collapsible={false}
        />,
      )
    })

    await act(async () => {
      getAccordionTrigger('overview').dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(getAccordionTrigger('overview').getAttribute('aria-expanded')).toBe('true')
    expect(getAccordionContent('overview').hidden).toBe(false)

    await act(async () => {
      getAccordionTrigger('billing').dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(getAccordionTrigger('overview').getAttribute('aria-expanded')).toBe('false')
    expect(getAccordionContent('overview').hidden).toBe(true)
    expect(getAccordionTrigger('billing').getAttribute('aria-expanded')).toBe('true')
    expect(getAccordionContent('billing').hidden).toBe(false)

    await act(async () => {
      root.render(
        <Accordion
          key="collapsible"
          items={accordionItems}
          defaultExpandedIds={['overview']}
          collapsible
        />,
      )
    })

    await act(async () => {
      getAccordionTrigger('overview').dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(getAccordionTrigger('overview').getAttribute('aria-expanded')).toBe('false')
    expect(getAccordionContent('overview').hidden).toBe(true)
  })

  it('wires Navigation menubar relationships and roves focus around disabled items', async () => {
    await act(async () => {
      root.render(
        <Navigation
          items={navigationItems}
          defaultActiveId="home"
          surface="inline"
        />,
      )
    })

    const navigation = container.querySelector<HTMLElement>('[role="navigation"][data-scope="navigation"][data-part="root"]')
    const menubar = container.querySelector<HTMLElement>('[role="menubar"][data-scope="navigation"][data-part="list"]')
    const home = getNavTrigger('home')
    const library = getNavTrigger('library')
    const disabled = getNavTrigger('disabled') as HTMLButtonElement
    const settings = getNavTrigger('settings')
    const libraryMenu = getNavContent('library')

    expect(navigation).not.toBeNull()
    expect(navigation?.getAttribute('aria-orientation')).toBe('horizontal')
    expect(menubar).not.toBeNull()
    expect(menubar?.getAttribute('aria-orientation')).toBe('horizontal')
    expect(home.tabIndex).toBe(0)
    expect(library.tabIndex).toBe(-1)
    expect(disabled.tabIndex).toBe(-1)
    expect(settings.tabIndex).toBe(-1)
    expect(library.getAttribute('aria-haspopup')).toBe('menu')
    expect(library.getAttribute('aria-expanded')).toBe('false')
    expect(libraryMenu.hidden).toBe(true)

    await act(async () => {
      home.focus()
      keyDown(home, 'ArrowRight')
    })

    expect(library.tabIndex).toBe(0)
    expect(disabled.tabIndex).toBe(-1)

    await act(async () => {
      keyDown(library, 'ArrowRight')
    })

    expect(getNavTrigger('settings').tabIndex).toBe(0)
    expect(disabled.tabIndex).toBe(-1)
  })

  it('opens and closes Navigation dropdowns by keyboard and activates child links', async () => {
    await act(async () => {
      root.render(
        <Navigation
          items={navigationItems}
          defaultActiveId="home"
          surface="inline"
        />,
      )
    })

    const library = getNavTrigger('library')
    const libraryMenu = getNavContent('library')

    await act(async () => {
      library.focus()
      keyDown(library, 'Enter')
    })

    const typefaces = container.querySelector<HTMLAnchorElement>('a[data-scope="navigation"][data-part="link"][data-value="typefaces"]')
    const components = container.querySelector<HTMLButtonElement>('button[data-scope="navigation"][data-part="link"][data-value="components"]')

    expect(library.getAttribute('aria-expanded')).toBe('true')
    expect(libraryMenu.hidden).toBe(false)
    expect(typefaces).not.toBeNull()
    expect(typefaces?.getAttribute('role')).toBe('menuitem')
    expect(typefaces?.getAttribute('aria-current')).toBeNull()
    expect(components).not.toBeNull()
    expect(components?.getAttribute('role')).toBe('menuitem')

    await act(async () => {
      typefaces?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(getNavTrigger('library').getAttribute('aria-expanded')).toBe('false')
    expect(getNavContent('library').hidden).toBe(true)
    expect(container.querySelector<HTMLAnchorElement>('a[data-value="typefaces"]')?.getAttribute('aria-current')).toBe('page')

    await act(async () => {
      keyDown(getNavTrigger('library'), 'ArrowDown')
    })

    expect(getNavTrigger('library').getAttribute('aria-expanded')).toBe('true')
    expect(getNavContent('library').hidden).toBe(false)

    await act(async () => {
      keyDown(getNavContent('library'), 'Escape')
    })

    expect(getNavTrigger('library').getAttribute('aria-expanded')).toBe('false')
    expect(getNavContent('library').hidden).toBe(true)
  })
})
