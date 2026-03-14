// @vitest-environment jsdom

import React from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import {
  DatePicker,
  Drawer,
  getFaceUiComponentMeta,
  isDeprecatedFaceUiComponent,
  Popover,
  SegmentedControl,
  Tooltip,
} from '../../index'
import * as faceUiIndex from '../../index'
import * as faceUiCompat from '../../compat'

function queryModal(container: HTMLElement): HTMLElement | null {
  return container.querySelector('.uf-modal[data-scope]') as HTMLElement | null
}

describe('taxonomy and governance', () => {
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

  it('exposes governance metadata and deprecated aliases', () => {
    expect(isDeprecatedFaceUiComponent('Overlay')).toBe(true)
    expect(isDeprecatedFaceUiComponent('Toggle')).toBe(true)
    expect(isDeprecatedFaceUiComponent('Sheet')).toBe(true)
    expect(isDeprecatedFaceUiComponent('Date')).toBe(true)
    expect(getFaceUiComponentMeta('Sidebar')?.status).toBe('stable')
    expect(getFaceUiComponentMeta('Sidebar')?.aliases).toContain('Sidebar')
    expect(getFaceUiComponentMeta('Overlay')?.replacedBy).toEqual(['Tooltip', 'Popover'])
    expect(getFaceUiComponentMeta('Sheet')?.replacedBy).toEqual(['Drawer'])
    expect(getFaceUiComponentMeta('Date')?.replacedBy).toEqual(['DatePicker'])
  })

  it('keeps deprecated aliases out of the primary barrel and exposes them only through compat', () => {
    expect('Overlay' in faceUiIndex).toBe(false)
    expect('Toggle' in faceUiIndex).toBe(false)
    expect('Sidebar' in faceUiIndex).toBe(false)
    expect('Sheet' in faceUiIndex).toBe(false)
    expect('Date' in faceUiIndex).toBe(false)

    expect('Overlay' in faceUiCompat).toBe(true)
    expect('Toggle' in faceUiCompat).toBe(true)
    expect('Sidebar' in faceUiCompat).toBe(true)
    expect('Sheet' in faceUiCompat).toBe(true)
    expect('Date' in faceUiCompat).toBe(true)
  })

  it('Tooltip and Popover map to the canonical Overlay trigger behaviors', async () => {
    await act(async () => {
      root.render(
        <div>
          <Tooltip content="Tooltip content">Hover me</Tooltip>
          <Popover content="Popover content">Open me</Popover>
        </div>,
      )
    })

    const contents = Array.from(container.querySelectorAll<HTMLElement>('.uf-overlay-content'))
    expect(contents).toHaveLength(2)
    expect(contents[0]?.getAttribute('data-trigger')).toBe('hover')
    expect(contents[1]?.getAttribute('data-trigger')).toBe('click')
  })

  it('Drawer renders the modal primitive with directional variants and compat Sheet aliases to it', async () => {
    await act(async () => {
      root.render(
        <div>
          <faceUiCompat.Sheet open title="Drawer" side="bottom">Content</faceUiCompat.Sheet>
          <Drawer open title="Drawer" side="left">Content</Drawer>
          <Drawer open title="Drawer" side="top">Content</Drawer>
        </div>,
      )
    })

    const modals = Array.from(container.querySelectorAll<HTMLElement>('.uf-modal[data-scope]'))
    expect(modals).toHaveLength(3)
    expect(modals[0]?.getAttribute('data-surface')).toBe('sheet')
    expect(modals[0]?.getAttribute('data-variant')).toBe('bottom')
    expect(modals[1]?.getAttribute('data-variant')).toBe('left')
    expect(modals[2]?.getAttribute('data-surface')).toBe('sheet')
    expect(modals[2]?.getAttribute('data-variant')).toBe('top')
  })

  it('SegmentedControl defaults to single selection and DatePicker reuses Date behavior', async () => {
    await act(async () => {
      root.render(
        <div>
          <SegmentedControl
            items={[
              { value: 'grid', label: 'Grid' },
              { value: 'list', label: 'List' },
            ]}
            defaultValue={['grid']}
          />
          <DatePicker label="Date" />
        </div>,
      )
    })

    const buttons = Array.from(container.querySelectorAll<HTMLButtonElement>('.uf-toggle-item'))
    expect(buttons).toHaveLength(2)
    expect(buttons[0]?.getAttribute('data-state')).toBe('on')

    await act(async () => {
      buttons[1]?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(buttons[0]?.getAttribute('data-state')).toBe('off')
    expect(buttons[1]?.getAttribute('data-state')).toBe('on')
    expect(container.textContent).toContain('Date')
  })
})
