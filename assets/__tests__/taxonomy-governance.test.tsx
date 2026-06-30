// @vitest-environment jsdom

import React from 'react'
import { readFileSync } from 'node:fs'
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
  Text,
  Tooltip,
} from '../../index'
import * as faceUiIndex from '../../index'
import * as faceUiCompat from '../../compat'

function readFixture(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8')
}

function readCssNumberToken(source: string, tokenName: string): number {
  const match = source.match(new RegExp(`${tokenName}:\\s*([0-9]+);`))
  if (!match) throw new Error(`Missing CSS token: ${tokenName}`)
  return Number(match[1])
}

const componentsCss = readFixture('../styles/components.css')
const animationsCss = readFixture('../styles/animations.css')
const tokensCss = readFixture('../styles/tokens.css')
const designSystemColorCss = readFixture('../../design-system/tokens/colors.css')
const colorSystemSource = readFixture('../../design-system/source/color-system.jsonc')
const semanticFeedbackSource = readFixture('../../design-system/source/semantic-feedback.jsonc')
const textMeta = JSON.parse(readFixture('../../Text/Text.json')) as {
  props?: { size?: { options?: string[] } }
  tokenMapping?: { component?: string[]; semanticFallbacks?: string[] }
}
const textSizeTokenMap = {
  xs: '--uf-font-size-xs',
  sm: '--uf-font-size-sm',
  md: '--uf-font-size-md',
  lg: '--uf-font-size-lg',
  xl: '--uf-font-size-xl',
} as const
const textSizeOptions = Object.keys(textSizeTokenMap) as Array<keyof typeof textSizeTokenMap>

function queryModal(container: HTMLElement): HTMLElement | null {
  return container.querySelector('.uf-modal[data-scope]') as HTMLElement | null
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function readCssBlock(source: string, selector: string): string {
  const match = source.match(new RegExp(`${escapeRegExp(selector)}\\s*\\{([\\s\\S]*?)\\n\\}`))
  if (!match) throw new Error(`Missing CSS selector: ${selector}`)
  return match[1] || ''
}

function readCssBlocks(source: string, selector: string): string[] {
  return Array.from(source.matchAll(new RegExp(`${escapeRegExp(selector)}\\s*\\{([\\s\\S]*?)\\n\\}`, 'g')))
    .map((match) => match[1] || '')
}

function expectCssBlockContains(source: string, selector: string, declaration: string) {
  const blocks = readCssBlocks(source, selector)
  expect(blocks.length, `${selector} should exist`).toBeGreaterThan(0)
  expect(
    blocks.some((block) => block.includes(declaration)),
    `${selector} should contain ${declaration}`,
  ).toBe(true)
}

function isAllowedMonochromeColorLiteral(literal: string): boolean {
  const normalized = literal.toLowerCase().replace(/\s+/g, '')
  if (normalized === '#000' || normalized === '#000000' || normalized === '#fff' || normalized === '#ffffff') {
    return true
  }

  const rgba = normalized.match(/^rgba?\((0|255),(0|255),(0|255)(?:,([0-9.]+))?\)$/)
  if (!rgba) return false
  if (!(rgba[1] === rgba[2] && rgba[2] === rgba[3])) return false

  const alpha = rgba[4] == null ? 1 : Number(rgba[4])
  if (!Number.isFinite(alpha) || alpha < 0 || alpha > 1) return false

  const percent = alpha * 100
  return Math.abs(Math.round(percent) - percent) < 0.0001 && Math.round(percent) % 2 === 0
}

function findNonMonochromeColorLiterals(source: string): string[] {
  const colorLiteralPattern = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]+\)|hsla?\([^)]+\)|hsl\([^)]+\)|oklch\([^)]+\)|color\([^)]+\)/g
  const literals = source.match(colorLiteralPattern) || []
  return literals.filter((literal) => !isAllowedMonochromeColorLiteral(literal))
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

  it('routes component motion through tokens and reduced-motion overrides', () => {
    expect(tokensCss).toContain('--uf-motion-duration-reduced: 0.01ms;')
    expect(tokensCss).toContain('--uf-motion-iteration-indefinite: infinite;')
    expect(tokensCss).toContain('--uf-motion-iteration-indefinite: 1;')
    expect(componentsCss).toContain('var(--uf-motion-iteration-indefinite)')
    expect(componentsCss).not.toMatch(/animation:\s*[^;]*\binfinite\b/)
    expect(animationsCss).toContain('animation-duration: var(--uf-motion-duration-reduced);')
    expect(animationsCss).toContain('transition-duration: var(--uf-motion-duration-reduced);')
  })

  it('keeps component geometry runtime aliases available', () => {
    expect(tokensCss).toContain('--uf-membrane: 1px;')
    expect(tokensCss).toContain('--uf-radius: 6px;')
    expect(tokensCss).toContain('--uf-radius-base: var(--uf-radius);')
    expect(tokensCss).toContain('--uf-control-pad-left: var(--uf-control-pad-text);')
    expect(tokensCss).toContain('--uf-control-pad-right: var(--uf-control-pad-text);')
    expect(tokensCss).toContain('--uf-option-indent: calc(var(--uf-icon-size) + var(--uf-control-gap) - var(--uf-spacing-1));')
    expect(tokensCss).toContain('--uf-selector-indicator-gap: var(--uf-spacing-1);')
    expect(tokensCss).toContain('--uf-selector-indicator-offset-inline-start: calc(var(--uf-membrane) * -2);')
    expect(tokensCss).toContain('--uf-selector-indicator-edge-gap: var(--uf-spacing-1);')
    expect(tokensCss).toContain('--uf-select-indicator-edge-gap: var(--uf-selector-indicator-edge-gap);')
    expect(tokensCss).toContain('--uf-content-inset: 12px;')
    expect(tokensCss).toContain('--uf-button-ring-color: var(--uf-color-border);')
    expect(componentsCss).toContain('padding: var(--uf-membrane);')
    expect(componentsCss).toContain('border-radius: var(--uf-radius);')
  })

  it('keeps runtime and design-system colors monochrome-only', () => {
    const sources = {
      'assets/styles/tokens.css': tokensCss,
      'design-system/tokens/colors.css': designSystemColorCss,
      'design-system/source/color-system.jsonc': colorSystemSource,
      'design-system/source/semantic-feedback.jsonc': semanticFeedbackSource,
    }
    const offenders = Object.entries(sources).flatMap(([sourceName, source]) =>
      findNonMonochromeColorLiterals(source).map((literal) => `${sourceName}: ${literal}`),
    )

    for (let opacity = 0; opacity <= 100; opacity += 2) {
      expect(tokensCss).toContain(`--uf-color-black-${opacity}:`)
      expect(tokensCss).toContain(`--uf-color-white-${opacity}:`)
      expect(designSystemColorCss).toContain(`--uf-color-black-${opacity}:`)
      expect(designSystemColorCss).toContain(`--uf-color-white-${opacity}:`)
    }

    expect(tokensCss).toContain('--uf-color-new: var(--uf-color-foreground);')
    expect(designSystemColorCss).toContain('--uf-color-new: var(--uf-color-foreground);')
    expect(offenders).toEqual([])
  })

  it('keeps core controls on the 32px geometry contract with compact and large as explicit density variants', () => {
    expect(tokensCss).toContain('--uf-control-height: 32px;')
    expect(readCssBlock(tokensCss, '.uf-compact')).toContain('--uf-control-height: 28px;')
    expect(readCssBlock(tokensCss, '.uf-large')).toContain('--uf-control-height: 40px;')

    const controlSelectors = [
      '.uf-button[data-scope="button"]',
      '.uf-tile[data-scope="tile"]',
      '.uf-checkbox[data-scope="checkbox"]',
      '.uf-switcher[data-scope]',
      '[data-scope="radio"] [data-part="item"]',
      '[data-scope="input"] [data-part="input"],\n[data-scope="input"] [data-part="textarea"]',
      '[data-scope="select"] [data-part="trigger"]',
      '[data-scope="select"] [data-part="option"]',
      '.uf-date__trigger',
      '.uf-slider[data-scope="slider"]',
      '.uf-rating-star',
      '[data-scope="toggle-group"] [data-part="item"],\n.uf-toggle[data-scope] [data-part="item"]',
      '[data-scope="tabs"] [data-part="trigger"]',
      '[data-scope="accordion"] [data-part="trigger"],\n[data-scope="accordion"] [data-part="item-trigger"]',
      '[data-scope="steps"] [data-part="trigger"]',
      '.uf-command__trigger',
      '.uf-breadcrumb[data-scope] a',
      '.uf-sidebar-item',
      '[data-scope="navigation"] [data-part="trigger"],\n[data-scope="navigation"] [data-part="link"]',
      '.uf-tree[data-scope] [data-part="item"]:not([data-scope="button"]),\n.uf-tree[data-scope] [data-part="branchTrigger"]:not([data-scope="button"])',
    ]

    for (const selector of controlSelectors) {
      expectCssBlockContains(componentsCss, selector, 'min-height: var(--uf-control-height);')
    }

    expect(readCssBlock(componentsCss, '.uf-button[data-scope="button"][data-selector]'))
      .toContain('--uf-control-pad-right: var(--uf-selector-indicator-edge-gap);')
    expect(readCssBlock(componentsCss, '[data-scope="button"] [data-part="indicator"],\n[data-scope="tile"] [data-part="indicator"],\n[data-scope="select"] [data-part="indicator"]'))
      .toContain('margin-inline-start: var(--uf-selector-indicator-offset-inline-start, 0px);')
    expect(readCssBlock(componentsCss, '.uf-tile[data-scope="tile"][data-selector] [data-part="indicator"]'))
      .toContain('opacity: var(--uf-tile-selector-indicator-opacity, 0);')
    expect(readCssBlock(componentsCss, '.uf-tile[data-scope="tile"][data-selector]:hover [data-part="indicator"],\n.uf-tile[data-scope="tile"][data-selector]:focus-visible [data-part="indicator"],\n.uf-tile[data-scope="tile"][data-selector]:focus-within [data-part="indicator"]'))
      .toContain('opacity: var(--uf-tile-selector-indicator-hover-opacity, 0.7);')
    expect(readCssBlock(componentsCss, '[data-scope="select"] [data-part="trigger"]'))
      .toContain('padding-right: var(--uf-select-indicator-edge-gap);')
  })

  it('keeps standard interactive hover surfaces on the shared hover background token', () => {
    const hoverSelectors = [
      '.uf-button[data-scope="button"]:hover',
      '.uf-tile[data-scope="tile"]:hover',
      '.uf-checkbox[data-scope="checkbox"]:hover',
      '.uf-switcher[data-scope]:hover:not([data-disabled])',
      '.uf-radio-option:hover,\n[data-scope="radio"] [data-part="item"]:hover',
      '[data-scope="input"] [data-part="input"]:hover,\n[data-scope="input"] [data-part="textarea"]:hover',
      '[data-scope="select"] [data-part="trigger"]:hover',
      '[data-scope="select"] [data-part="option"]:hover,\n[data-scope="select"] [data-part="option"][data-highlighted]',
      '.uf-date__trigger:hover',
      '.uf-rating-star:hover',
      '[data-scope="toggle-group"] [data-part="item"]:hover,\n.uf-toggle[data-scope] [data-part="item"]:hover',
      '.uf-menu-item:hover,\n.uf-menu-item[data-highlighted]',
      '[data-scope="tabs"] [data-part="trigger"]:hover',
      '[data-scope="accordion"] [data-part="trigger"]:hover,\n[data-scope="accordion"] [data-part="item-trigger"]:hover',
      '.uf-pagination[data-scope] button:hover',
      '[data-scope="steps"] [data-part="trigger"]:hover',
      '[data-scope="calendar"] [data-part="prevButton"]:hover,\n[data-scope="calendar"] [data-part="nextButton"]:hover',
      '.uf-command__trigger:hover',
      '.uf-breadcrumb[data-scope] a:hover',
      '.uf-sidebar-item:hover',
      '[data-scope="navigation"] [data-part="trigger"]:hover,\n[data-scope="navigation"] [data-part="link"]:hover',
      '[data-scope="tree-view"] [data-part="item"]:hover,\n[data-scope="tree-view"] [data-part="branchTrigger"]:hover,\n.uf-tree[data-scope] [data-part="item"]:not([data-scope="button"]):hover,\n.uf-tree[data-scope] [data-part="branchTrigger"]:not([data-scope="button"]):hover',
    ]
    const hoverBackgroundPattern = /background:\s*var\(--uf-(?:color-hover-bg|button-hover-bg|tile-hover-bg)\);/

    for (const selector of hoverSelectors) {
      const blocks = readCssBlocks(componentsCss, selector)
      expect(blocks.length, `${selector} should exist`).toBeGreaterThan(0)
      expect(
        blocks.some((block) => hoverBackgroundPattern.test(block)),
        `${selector} should use shared hover background`,
      ).toBe(true)
    }
  })

  it('keeps portalled dropdown layers above modal panels', () => {
    const overlayZ = readCssNumberToken(tokensCss, '--uf-z-overlay')
    const modalZ = readCssNumberToken(tokensCss, '--uf-z-modal')
    const dropdownZ = readCssNumberToken(tokensCss, '--uf-z-dropdown')
    const toastZ = readCssNumberToken(tokensCss, '--uf-z-toast')

    expect(modalZ).toBeGreaterThan(overlayZ)
    expect(dropdownZ).toBeGreaterThan(modalZ)
    expect(toastZ).toBeGreaterThan(dropdownZ)
    expect(componentsCss).toContain('z-index: var(--uf-z-dropdown);')
  })

  it('keeps Text size schema, data attributes, and CSS token mapping aligned', async () => {
    await act(async () => {
      root.render(
        <div>
          {textSizeOptions.map((size) => (
            <Text key={size} text={size} size={size} />
          ))}
        </div>,
      )
    })

    expect(textMeta.props?.size?.options).toEqual(textSizeOptions)
    expect(textMeta.tokenMapping?.component).toContain('--uf-text-size-font-size')
    expect(componentsCss).toContain('font-size: var(--uf-text-font-size, var(--uf-text-size-font-size,')

    for (const size of textSizeOptions) {
      const token = textSizeTokenMap[size]
      const node = container.querySelector<HTMLElement>(`.uf-text[data-scope="text"][data-size="${size}"]`)

      expect(node).not.toBeNull()
      expect(node?.style.fontSize).toBe('')
      expect(textMeta.tokenMapping?.semanticFallbacks).toContain(token)
      expect(tokensCss).toContain(`${token}:`)
      expect(componentsCss).toMatch(
        new RegExp(
          String.raw`\.uf-text\[data-scope\]\[data-size="${size}"\]\s*{\s*--uf-text-size-font-size:\s*var\(${token}\);\s*}`,
        ),
      )
    }
  })

  it('Tooltip and Popover map to the canonical Overlay trigger behaviors', async () => {
    await act(async () => {
      root.render(
        <div>
          <Tooltip open content="Tooltip content">Hover me</Tooltip>
          <Popover open content="Popover content">Open me</Popover>
        </div>,
      )
    })

    // Overlay portals content to document.body, so query there instead of the render container
    const contents = Array.from(document.body.querySelectorAll<HTMLElement>('.uf-overlay-content'))
    expect(contents).toHaveLength(2)
    expect(contents[0]?.getAttribute('data-trigger')).toBe('hover')
    expect(contents[1]?.getAttribute('data-trigger')).toBe('click')
  })

  it('keeps Tooltip colors on dedicated non-inverted tokens', () => {
    expect(tokensCss).toContain('--uf-tooltip-bg: var(--uf-color-black-100);')
    expect(tokensCss).toContain('--uf-tooltip-fg: var(--uf-color-white-100);')
    expect(componentsCss).toContain('--uf-text-color: var(--uf-tooltip-fg);')
    expect(componentsCss).toContain('background: var(--uf-tooltip-bg);')
    expect(componentsCss).toContain('color: var(--uf-tooltip-fg);')
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

    const modals = Array.from(document.body.querySelectorAll<HTMLElement>('.uf-modal[data-scope]'))
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
