// @vitest-environment jsdom

import React from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { Tabs, type TabItem } from '../../Tabs/Tabs'

const items: TabItem[] = [
  { value: 'overview', label: 'Overview', content: 'Overview panel' },
  { value: 'details', label: 'Details', content: 'Details panel', disabled: true },
  { value: 'billing', label: 'Billing', content: 'Billing panel' },
]

function keyDown(node: HTMLElement, key: string) {
  node.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
}

describe('Tabs a11y and keyboard baseline', () => {
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

  function getTab(value: string): HTMLButtonElement {
    const tab = container.querySelector<HTMLButtonElement>(`[role="tab"][data-value="${value}"]`)
    expect(tab).not.toBeNull()
    return tab as HTMLButtonElement
  }

  function getPanel(value: string): HTMLElement {
    const panel = container.querySelector<HTMLElement>(`#tabs\\:content\\:${value}`)
    expect(panel).not.toBeNull()
    return panel as HTMLElement
  }

  it('wires tablist, tab, and tabpanel a11y attributes', async () => {
    await act(async () => {
      root.render(
        <Tabs
          items={items}
          defaultValue="overview"
          orientation="vertical"
          activationMode="manual"
        />,
      )
    })

    const tablist = container.querySelector<HTMLElement>('[role="tablist"]')
    const overviewTab = getTab('overview')
    const detailsTab = getTab('details')
    const billingTab = getTab('billing')
    const overviewPanel = getPanel('overview')
    const detailsPanel = getPanel('details')
    const billingPanel = getPanel('billing')

    expect(tablist).not.toBeNull()
    expect(tablist?.getAttribute('aria-orientation')).toBe('vertical')
    expect(overviewTab.id).toBe('tabs:trigger:overview')
    expect(overviewTab.getAttribute('aria-selected')).toBe('true')
    expect(overviewTab.getAttribute('aria-controls')).toBe(overviewPanel.id)
    expect(overviewTab.getAttribute('data-orientation')).toBe('vertical')
    expect(detailsTab.disabled).toBe(true)
    expect(detailsTab.getAttribute('aria-selected')).toBe('false')
    expect(detailsTab.getAttribute('aria-controls')).toBe(detailsPanel.id)
    expect(billingTab.getAttribute('aria-selected')).toBe('false')
    expect(billingTab.getAttribute('aria-controls')).toBe(billingPanel.id)

    expect(overviewPanel.getAttribute('role')).toBe('tabpanel')
    expect(overviewPanel.getAttribute('aria-labelledby')).toBe(overviewTab.id)
    expect(overviewPanel.hidden).toBe(false)
    expect(detailsPanel.getAttribute('role')).toBe('tabpanel')
    expect(detailsPanel.getAttribute('aria-labelledby')).toBe(detailsTab.id)
    expect(detailsPanel.hidden).toBe(true)
    expect(billingPanel.getAttribute('role')).toBe('tabpanel')
    expect(billingPanel.getAttribute('aria-labelledby')).toBe(billingTab.id)
    expect(billingPanel.hidden).toBe(true)
  })

  it('keeps manual activation on focus until Enter or Space selects the focused tab', async () => {
    await act(async () => {
      root.render(
        <Tabs
          items={items}
          defaultValue="overview"
          orientation="horizontal"
          activationMode="manual"
        />,
      )
    })

    const overviewTab = getTab('overview')

    await act(async () => {
      overviewTab.focus()
      keyDown(overviewTab, 'ArrowRight')
    })

    expect(getTab('billing').tabIndex).toBe(0)
    expect(getTab('overview').getAttribute('aria-selected')).toBe('true')
    expect(getTab('details').getAttribute('aria-selected')).toBe('false')
    expect(getTab('billing').getAttribute('aria-selected')).toBe('false')
    expect(getPanel('overview').hidden).toBe(false)
    expect(getPanel('billing').hidden).toBe(true)

    await act(async () => {
      keyDown(getTab('billing'), 'Enter')
    })

    expect(getTab('overview').getAttribute('aria-selected')).toBe('false')
    expect(getTab('billing').getAttribute('aria-selected')).toBe('true')
    expect(getPanel('overview').hidden).toBe(true)
    expect(getPanel('billing').hidden).toBe(false)

    await act(async () => {
      keyDown(getTab('billing'), 'ArrowLeft')
      keyDown(getTab('overview'), ' ')
    })

    expect(getTab('overview').getAttribute('aria-selected')).toBe('true')
    expect(getPanel('overview').hidden).toBe(false)
    expect(getPanel('billing').hidden).toBe(true)
  })

  it('selects on Arrow navigation in automatic activation and skips disabled tabs', async () => {
    await act(async () => {
      root.render(
        <Tabs
          items={items}
          defaultValue="overview"
          orientation="horizontal"
          activationMode="automatic"
        />,
      )
    })

    const overviewTab = getTab('overview')

    await act(async () => {
      overviewTab.focus()
      keyDown(overviewTab, 'ArrowRight')
    })

    expect(getTab('details').tabIndex).toBe(-1)
    expect(getTab('details').getAttribute('aria-selected')).toBe('false')
    expect(getPanel('details').hidden).toBe(true)
    expect(getTab('billing').tabIndex).toBe(0)
    expect(getTab('overview').getAttribute('aria-selected')).toBe('false')
    expect(getTab('billing').getAttribute('aria-selected')).toBe('true')
    expect(getPanel('overview').hidden).toBe(true)
    expect(getPanel('billing').hidden).toBe(false)
  })
})
