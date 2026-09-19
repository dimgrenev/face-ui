import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it } from 'vitest'
import { act } from 'react'
import type { Root } from 'react-dom/client'
import {
  Date as DateField,
  getFaceUiComponentMeta,
  isDeprecatedFaceUiComponent,
  Modal,
  Popover,
  SegmentedControl,
  Text,
  Tooltip,
} from '../../../index'
import * as faceUiIndex from '../../../index'
import * as faceUiCompat from '../../../compat'
import { libraryCss, mount } from '../harness'

function readFixture(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8')
}

function readCssNumberToken(source: string, tokenName: string): number {
  const match = source.match(new RegExp(`${tokenName}:\\s*([0-9]+);`))
  if (!match) throw new Error(`Missing CSS token: ${tokenName}`)
  return Number(match[1])
}

const componentsCss = libraryCss()
const baseCss = readFixture('../../styles/base.css')
const animationsCss = readFixture('../../styles/animations.css')
const tokensCss = readFixture('../../styles/tokens.css')
const designSystemColorCss = readFixture(
  '../../../design-system/tokens/colors.css',
)
const colorSystemSource = readFixture(
  '../../../design-system/source/color-system.jsonc',
)
const semanticFeedbackSource = readFixture(
  '../../../design-system/source/semantic-feedback.jsonc',
)
const textMeta = JSON.parse(readFixture('../../../Text/Text.json')) as {
  props?: { size?: { options?: string[] }; variant?: { options?: string[] } }
  tokenMapping?: { component?: string[]; semanticFallbacks?: string[] }
}
const textSizeTokenMap = {
  xs: '--uf-font-size-xs',
  sm: '--uf-font-size-sm',
  md: '--uf-font-size-md',
  lg: '--uf-font-size-lg',
  xl: '--uf-font-size-xl',
} as const
const textSizeOptions = Object.keys(textSizeTokenMap) as Array<
  keyof typeof textSizeTokenMap
>

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function readCssBlock(source: string, selector: string): string {
  const match = source.match(
    new RegExp(
      `(?:^|\\n)[\\t ]*${escapeRegExp(selector)}\\s*\\{([\\s\\S]*?)\\n\\}`,
    ),
  )
  if (!match) throw new Error(`Missing CSS selector: ${selector}`)
  return match[1] || ''
}

function readCssBlocks(source: string, selector: string): string[] {
  return Array.from(
    source.matchAll(
      new RegExp(
        `(?:^|\\n)[\\t ]*${escapeRegExp(selector)}\\s*\\{([\\s\\S]*?)\\n\\}`,
        'g',
      ),
    ),
  ).map((match) => match[1] || '')
}

function expectCssBlockContains(
  source: string,
  selector: string,
  declaration: string,
) {
  const blocks = readCssBlocks(source, selector)
  expect(blocks.length, `${selector} should exist`).toBeGreaterThan(0)
  expect(
    blocks.some((block) => block.includes(declaration)),
    `${selector} should contain ${declaration}`,
  ).toBe(true)
}

function isAllowedMonochromeColorLiteral(literal: string): boolean {
  const normalized = literal.toLowerCase().replace(/\s+/g, '')
  if (
    normalized === '#000' ||
    normalized === '#000000' ||
    normalized === '#fff' ||
    normalized === '#ffffff'
  ) {
    return true
  }

  const rgba = normalized.match(
    /^rgba?\((0|255),(0|255),(0|255)(?:,([0-9.]+))?\)$/,
  )
  if (!rgba) return false
  if (!(rgba[1] === rgba[2] && rgba[2] === rgba[3])) return false

  const alpha = rgba[4] == null ? 1 : Number(rgba[4])
  if (!Number.isFinite(alpha) || alpha < 0 || alpha > 1) return false

  const percent = alpha * 100
  return (
    Math.abs(Math.round(percent) - percent) < 0.0001 &&
    Math.round(percent) % 2 === 0
  )
}

function findNonMonochromeColorLiterals(source: string): string[] {
  const colorLiteralPattern =
    /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]+\)|hsla?\([^)]+\)|hsl\([^)]+\)|oklch\([^)]+\)|color\([^)]+\)/g
  return source.split('\n').flatMap((line) => {
    const literals = line.match(colorLiteralPattern) || []
    return literals.filter(
      (literal) => !isAllowedMonochromeColorLiteral(literal),
    )
  })
}

function findFeedbackSourceOffenders(jsoncSource: string): string[] {
  let parsed: {
    tokens?: Array<{ name?: string; variants?: Array<{ value?: string }> }>
  }
  try {
    parsed = JSON.parse(jsoncSource)
  } catch {
    return ['semantic-feedback.jsonc: unparseable']
  }
  const out: string[] = []
  for (const tok of parsed.tokens ?? []) {
    for (const variant of tok.variants ?? []) {
      const chromatic = findNonMonochromeColorLiterals(
        String(variant.value ?? ''),
      )
      if (chromatic.length) {
        out.push(`semantic-feedback.jsonc: ${tok.name}=${variant.value}`)
      }
    }
  }
  return out
}

describe('taxonomy and governance', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;({ host: container, root } = mount())
  })

  it('exposes governance metadata and deprecated aliases', () => {
    expect(isDeprecatedFaceUiComponent('Overlay')).toBe(true)
    expect(isDeprecatedFaceUiComponent('Toggle')).toBe(true)
    expect(isDeprecatedFaceUiComponent('Date')).toBe(false)
    expect(getFaceUiComponentMeta('Sidebar')?.status).toBe('stable')
    expect(getFaceUiComponentMeta('Sidebar')?.aliases).toContain('Sidebar')
    expect(getFaceUiComponentMeta('Overlay')?.replacedBy).toEqual([
      'Tooltip',
      'Popover',
    ])
    expect(getFaceUiComponentMeta('Drawer')).toBeNull()
    expect(getFaceUiComponentMeta('Sheet')).toBeNull()
  })

  it('keeps deprecated aliases governed by the public and compat barrels', () => {
    expect('Overlay' in faceUiIndex).toBe(false)
    expect('Toggle' in faceUiIndex).toBe(false)
    expect('Sidebar' in faceUiIndex).toBe(false)
    expect('Drawer' in faceUiIndex).toBe(false)
    expect('Sheet' in faceUiIndex).toBe(false)
    expect('Modal' in faceUiIndex).toBe(true)
    expect('Date' in faceUiIndex).toBe(true)

    expect('Overlay' in faceUiCompat).toBe(true)
    expect('Toggle' in faceUiCompat).toBe(true)
    expect('Sidebar' in faceUiCompat).toBe(true)
    expect('Drawer' in faceUiCompat).toBe(false)
    expect('Sheet' in faceUiCompat).toBe(false)
  })

  it('routes component motion through tokens and reduced-motion overrides', () => {
    expect(tokensCss).toContain('--uf-motion-duration-reduced: 0.01ms;')
    expect(tokensCss).toContain('--uf-motion-iteration-indefinite: infinite;')
    expect(tokensCss).toContain('--uf-motion-iteration-indefinite: 1;')
    expect(componentsCss).toContain('var(--uf-motion-iteration-indefinite)')
    expect(componentsCss).not.toMatch(/animation:\s*[^;]*\binfinite\b/)
    expect(animationsCss).toContain(
      'animation-duration: var(--uf-motion-duration-reduced) !important;',
    )
    expect(animationsCss).toContain(
      'transition-duration: var(--uf-motion-duration-reduced) !important;',
    )
  })

  it('keeps component geometry runtime aliases available', () => {
    expect(tokensCss).toContain('--uf-membrane: 1px;')
    expect(tokensCss).toContain('--uf-radius: 6px;')
    expect(tokensCss).toContain('--uf-radius-base: var(--uf-radius);')
    expect(tokensCss).toContain(
      '--uf-control-pad-start: var(--uf-control-pad-text);',
    )
    expect(tokensCss).toContain(
      '--uf-control-pad-end: var(--uf-control-pad-text);',
    )
    expect(tokensCss).toContain(
      '--uf-option-indent: calc(var(--uf-icon-size) + var(--uf-control-gap) - var(--uf-spacing-1));',
    )
    expect(tokensCss).toContain(
      '--uf-selector-indicator-gap: var(--uf-spacing-1);',
    )
    expect(tokensCss).toContain(
      '--uf-selector-indicator-offset-inline-start: calc(var(--uf-membrane) * -2);',
    )
    expect(tokensCss).toContain(
      '--uf-selector-indicator-edge-gap: var(--uf-spacing-1);',
    )
    expect(tokensCss).toContain(
      '--uf-select-indicator-edge-gap: var(--uf-selector-indicator-edge-gap);',
    )
    expect(tokensCss).toContain('--uf-content-inset: 12px;')
    expect(tokensCss).toContain(
      '--uf-button-ring-color: var(--uf-color-border);',
    )
    expect(componentsCss).toContain('padding: var(--uf-membrane);')
    expect(componentsCss).toContain('border-radius: var(--uf-radius);')
  })

  it('does not double-inset controls that own an explicit membrane wrapper', () => {
    // No component allowlist: anatomy roots never create outer spacing.
    expect(baseCss).not.toMatch(/padding:\s*var\(--uf-membrane/)
    expect(readCssBlock(componentsCss, '.uf-membrane')).toContain(
      'padding: var(--uf-membrane);',
    )
  })

  it('keeps every runtime and design-system color on the monochrome 2% atom scale', () => {
    const sources = {
      'assets/styles/tokens.css': tokensCss,
      'design-system/tokens/colors.css': designSystemColorCss,
      'design-system/source/color-system.jsonc': colorSystemSource,
    }
    const offenders = [
      ...Object.entries(sources).flatMap(([sourceName, source]) =>
        findNonMonochromeColorLiterals(source).map(
          (literal) => `${sourceName}: ${literal}`,
        ),
      ),
      ...findFeedbackSourceOffenders(semanticFeedbackSource),
    ]

    for (let opacity = 0; opacity <= 100; opacity += 2) {
      expect(tokensCss).toContain(`--uf-color-black-${opacity}:`)
      expect(tokensCss).toContain(`--uf-color-white-${opacity}:`)
      expect(designSystemColorCss).toContain(`--uf-color-black-${opacity}:`)
      expect(designSystemColorCss).toContain(`--uf-color-white-${opacity}:`)
    }

    expect(tokensCss).toContain('--uf-color-new: var(--uf-color-foreground);')
    expect(designSystemColorCss).toContain(
      '--uf-color-new: var(--uf-color-foreground);',
    )
    expect(offenders).toEqual([])
  })

  it('keeps core controls on the 32px geometry contract with compact and large as explicit density variants', () => {
    expect(tokensCss).toContain('--uf-control-height: 32px;')
    expect(readCssBlock(tokensCss, '.uf-compact')).toContain(
      '--uf-control-height: 28px;',
    )
    expect(readCssBlock(tokensCss, '.uf-large')).toContain(
      '--uf-control-height: 40px;',
    )

    expectCssBlockContains(
      componentsCss,
      '.uf-toggle[data-scope] .uf-toggle-item',
      'min-block-size: max(24px, var(--uf-control-height));',
    )
    expectCssBlockContains(
      componentsCss,
      '.uf-tabs[data-variant] > .uf-tabs-header .uf-tabs-tab',
      'min-block-size: max(24px, var(--uf-control-height));',
    )

    const controlSelectors = [
      '.uf-button[data-scope]',
      '.uf-tile[data-scope="tile"]',
      '.uf-badge[data-scope]',
      '.uf-checkbox[data-scope="checkbox"]',
      '.uf-switcher[data-scope="switcher"]',
      '[data-scope="radio"] [data-part="item"]',
      '[data-scope="input"] [data-part="input"],\n[data-scope="input"] [data-part="textarea"]',
      '.uf-select[data-scope="select"] [data-part="trigger"]',
      ':is(.uf-select[data-scope="select"], .uf-select__content[data-scope="select"][data-part="content"]) [data-part="option"]',
      '.uf-date__trigger',
      '.uf-slider[data-scope="slider"]',

      '[data-scope="accordion"][data-part="trigger"]',
      '[data-scope="steps"][data-part="trigger"]',
      '.uf-command__trigger',
      '.uf-breadcrumb-label[data-scope]',
      '.uf-sidebar-item',
      '[data-scope="navigation"] [data-part="trigger"],\n[data-scope="navigation"] [data-part="link"]',
      '.uf-tree-item[data-scope]',
    ]

    for (const selector of controlSelectors) {
      expectCssBlockContains(
        componentsCss,
        selector,
        'min-height: var(--uf-control-height);',
      )
    }

    expect(
      readCssBlock(componentsCss, '.uf-button[data-scope][data-selector]'),
    ).toContain('--uf-control-pad-end: var(--uf-selector-indicator-edge-gap);')
    expect(
      readCssBlock(
        componentsCss,
        '.uf-button [data-part="label"],\n.uf-button__label',
      ),
    ).toContain('text-overflow: ellipsis;')
    expect(
      readCssBlock(
        componentsCss,
        '.uf-button [data-part="indicator"],\n[data-scope="tile"][data-part="indicator"],\n.uf-select[data-scope="select"] [data-part="indicator"]',
      ),
    ).toContain(
      'margin-inline-start: var(--uf-selector-indicator-offset-inline-start, 0px);',
    )
    expect(
      readCssBlock(componentsCss, '.uf-tile__indicator[data-scope]'),
    ).toContain('opacity: var(--uf-tile-indicator-opacity);')
    expect(
      readCssBlock(
        componentsCss,
        '.uf-tile[data-scope="tile"][data-selector] > [data-part="text"]',
      ),
    ).toContain('gap: var(--uf-selector-indicator-gap);')
    expect(
      readCssBlock(
        componentsCss,
        '.uf-tile[data-scope="tile"][data-selector] > [data-part="text"]',
      ),
    ).toContain('width: auto;')
    expect(
      readCssBlock(
        componentsCss,
        '.uf-tile[data-scope="tile"][data-selector]:is(:hover, :focus-within)',
      ),
    ).toContain(
      '--uf-tile-indicator-opacity: var(--uf-tile-selector-indicator-hover-opacity);',
    )
    const tileBlock = readCssBlock(componentsCss, '.uf-tile[data-scope="tile"]')
    expect(tileBlock).toContain('--uf-tile-pad: calc(var(--uf-membrane) * 3);')
    expect(tileBlock).toContain('--uf-tile-pad-y: var(--uf-tile-pad);')
    expect(tileBlock).toContain('--uf-tile-pad-x: var(--uf-tile-pad);')
    expect(tileBlock).toContain(
      '--uf-tile-action-size: calc(var(--uf-control-height) - (var(--uf-tile-pad) * 2) - (var(--uf-membrane) * 2));',
    )
    expect(tileBlock).toContain('padding-top: var(--uf-tile-pad-y);')
    expect(tileBlock).toContain(
      'padding-inline-start: var(--uf-tile-pad-start);',
    )
    expect(
      readCssBlock(
        componentsCss,
        '.uf-tile[data-scope="tile"][data-icon-start]',
      ),
    ).toContain('--uf-tile-pad-start: var(--uf-control-pad-icon);')
    expect(
      readCssBlock(componentsCss, '.uf-tile[data-scope="tile"][data-icon-end]'),
    ).toContain('--uf-tile-pad-end: var(--uf-control-pad-icon);')
    expect(
      readCssBlock(
        componentsCss,
        '.uf-tile[data-scope="tile"][data-action-visibility="always"] > [data-part="actions"]',
      ),
    ).toContain('pointer-events: auto;')
    expect(
      readCssBlock(
        componentsCss,
        '.uf-tile[data-scope="tile"][data-action-visibility="hidden"] > [data-part="actions"]',
      ),
    ).toContain('pointer-events: none;')
    expect(
      readCssBlock(componentsCss, '.uf-tile[data-scope="tile"]'),
    ).toContain('cursor: default;')
    expect(
      readCssBlock(
        componentsCss,
        '.uf-select[data-scope="select"] [data-part="trigger"]',
      ),
    ).toContain('padding-inline-end: var(--uf-select-indicator-edge-gap);')
    expect(readCssBlock(componentsCss, '.uf-badge[data-scope]')).toContain(
      'padding: var(--uf-control-pad-y) var(--uf-control-pad-text);',
    )
    expect(readCssBlock(componentsCss, '.uf-badge[data-scope]')).toContain(
      'font-size: var(--uf-control-font-size);',
    )
    expect(readCssBlock(componentsCss, '.uf-bar[data-scope="bar"]')).toContain(
      'gap: var(--uf-control-gap);',
    )
    expect(readCssBlock(componentsCss, '.uf-bar-section')).toContain(
      'gap: var(--uf-control-gap);',
    )
    expect(
      readCssBlock(componentsCss, '.uf-breadcrumb-label[data-scope]'),
    ).toContain('line-height: var(--uf-control-line-height);')
    expect(
      readCssBlock(
        componentsCss,
        '[data-scope="accordion"][data-part="content"]',
      ),
    ).toContain('padding: 0;')
    expect(
      readCssBlock(
        componentsCss,
        '[data-scope="accordion"] .uf-accordion-slot',
      ),
    ).toContain('display: flex;')
    expect(
      readCssBlock(
        componentsCss,
        '[data-scope="accordion"] .uf-accordion-slot > .uf-membrane,\n[data-scope="accordion"] .uf-accordion-slot > .uf-button[data-scope],\n[data-scope="accordion"] .uf-accordion-slot > .uf-tile[data-scope="tile"],\n[data-scope="accordion"] .uf-accordion-slot > .uf-text[data-scope="text"]',
      ),
    ).toContain('width: 100%;')
    expect(
      readCssBlocks(
        componentsCss,
        '[data-scope="accordion"] .uf-accordion-slot > .uf-text[data-scope="text"],\n[data-scope="accordion"] .uf-accordion-slot > .uf-membrane > .uf-text[data-scope="text"]',
      ),
    ).toHaveLength(0)
    expect(readCssBlock(componentsCss, '.uf-steps[data-scope]')).not.toContain(
      '--uf-steps-label-inset',
    )
    expect(
      readCssBlock(componentsCss, '[data-scope="steps"][data-part="trigger"]'),
    ).toContain('--uf-control-pad-start: var(--uf-control-pad-icon);')
    expect(
      readCssBlock(componentsCss, '[data-scope="steps"][data-part="trigger"]'),
    ).toContain('padding-inline-start: var(--uf-control-pad-start);')
    expect(componentsCss).not.toContain('.uf-steps-contentText')
    expect(
      readCssBlock(componentsCss, '[data-scope="steps"][data-part="content"]'),
    ).toContain('padding: 0;')
    expect(readCssBlock(componentsCss, '.uf-code[data-scope]')).toContain(
      'max-inline-size: 100%;',
    )
    expect(readCssBlock(componentsCss, '.uf-code[data-scope] pre')).toContain(
      'min-inline-size: 0;',
    )
    expect(readCssBlock(componentsCss, '.uf-code[data-scope] pre')).toContain(
      'overflow-x: auto;',
    )
    expect(readCssBlock(componentsCss, '.uf-code[data-scope] code')).toContain(
      'min-inline-size: 100%;',
    )
    expect(readCssBlock(componentsCss, '.uf-code[data-scope] code')).toContain(
      'width: max-content;',
    )
    expect(
      readCssBlock(componentsCss, '[data-scope="code"] [data-part="line"]'),
    ).toContain('min-inline-size: max-content;')
  })

  it('keeps standard interactive hover surfaces on the shared hover background token', () => {
    const hoverSelectors = [
      '.uf-button[data-scope]:hover:not(:disabled):not([data-disabled])',
      '.uf-tile[data-scope="tile"][data-interactive]:not([data-primary-disabled]):hover',
      '.uf-checkbox[data-scope="checkbox"]:hover',
      '.uf-switcher[data-scope]:hover:not([data-disabled])',
      '.uf-radio-option:hover,\n[data-scope="radio"] [data-part="item"]:hover',
      '[data-scope="input"] [data-part="input"]:hover,\n[data-scope="input"] [data-part="textarea"]:hover',
      '.uf-select[data-scope="select"] [data-part="trigger"]:hover',
      ':is(.uf-select[data-scope="select"], .uf-select__content[data-scope="select"][data-part="content"]) [data-part="option"]:hover,\n:is(.uf-select[data-scope="select"], .uf-select__content[data-scope="select"][data-part="content"]) [data-part="option"][data-highlighted]',
      '.uf-date__trigger:hover',
      '.uf-rating__option[data-scope="rating"]:hover:not(:has(input:disabled)),\n.uf-membrane[data-membrane-hover] > .uf-rating__option[data-scope="rating"]',
      '.uf-toggle[data-scope] .uf-toggle-item:hover:not(:disabled)',
      '.uf-menu-item:hover,\n.uf-menu-item[data-highlighted]',
      '.uf-tabs[data-variant] > .uf-tabs-header .uf-tabs-tab:not(:disabled):hover,\n.uf-tabs[data-variant="pill"] > .uf-tabs-header .uf-tabs-tab[aria-selected="true"]',
      '[data-scope="accordion"][data-part="trigger"]:hover:not([aria-disabled="true"])',
      '[data-scope="steps"][data-part="trigger"]:hover:not(:disabled)',
      '[data-scope="calendar"] [data-part="prevButton"]:hover,\n[data-scope="calendar"] [data-part="nextButton"]:hover',
      '.uf-command__trigger:hover',
      '.uf-breadcrumb-label.uf-control:hover',
      '.uf-sidebar-item:hover',
      '[data-scope="navigation"] [data-part="trigger"]:hover,\n[data-scope="navigation"] [data-part="link"]:hover',
      '.uf-tree-item[data-scope]:hover',
    ]
    const hoverBackgroundPattern =
      /background:\s*var\(--uf-(?:color-hover-bg|button-hover-bg|tile-hover-bg)\);/

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
            <Text key={size} size={size}>{size}</Text>
          ))}
          <Text variant="markdown">Markdown text</Text>
          <Text variant="label">Label text</Text>
        </div>,
      )
    })

    expect(textMeta.props?.size?.options).toEqual(textSizeOptions)
    expect(textMeta.props?.variant?.options).toContain('markdown')
    expect(textMeta.props?.variant?.options).toContain('label')
    expect(textMeta.props?.variant?.options).not.toContain('default')
    expect(textMeta.props?.variant?.options).not.toContain('caption')
    expect(textMeta.tokenMapping?.component).toContain(
      '--uf-text-size-font-size',
    )
    expect(textMeta.tokenMapping?.component).toContain(
      '--uf-text-label-font-size',
    )
    expect(textMeta.tokenMapping?.component).toContain(
      '--uf-text-label-line-height',
    )
    expect(textMeta.tokenMapping?.component).toContain(
      '--uf-text-label-min-height',
    )
    expect(textMeta.tokenMapping?.component).toContain('--uf-text-label-pad-y')
    expect(componentsCss).toContain(
      'font-size: var(--uf-text-font-size, var(--uf-text-size-font-size,',
    )
    expect(componentsCss).toContain(
      '.uf-text[data-scope][data-variant="markdown"]',
    )
    expect(componentsCss).toContain('--uf-text-markdown-line-height: 24px;')
    expect(componentsCss).toContain(
      '.uf-text[data-scope][data-variant="markdown"] .uf-text__content',
    )
    expect(componentsCss).toContain('line-height: inherit;')
    expect(componentsCss).toContain(
      'calc(var(--uf-text-pad-y, var(--uf-control-pad-y)) - 2px)',
    )
    expect(tokensCss).toContain(
      '--uf-text-label-font-size: var(--uf-font-size-base);',
    )
    expect(tokensCss).toContain('--uf-text-label-line-height: 16px;')
    expect(tokensCss).toContain(
      '--uf-text-label-min-height: var(--uf-spacing-6);',
    )
    expect(tokensCss).toContain('--uf-text-label-pad-y: var(--uf-spacing-1);')
    expectCssBlockContains(
      componentsCss,
      '.uf-text[data-scope][data-variant="label"]',
      'font-size: var(--uf-text-font-size, var(--uf-text-size-font-size, var(--uf-text-label-font-size, 12px)));',
    )
    expectCssBlockContains(
      componentsCss,
      '.uf-text[data-scope][data-variant="label"]',
      'line-height: var(--uf-text-line-height, max(var(--uf-text-label-line-height, 16px), 1.25em));',
    )
    expectCssBlockContains(
      componentsCss,
      '.uf-text[data-scope][data-variant="label"]',
      '--uf-text-size-font-size',
    )
    expectCssBlockContains(
      componentsCss,
      '.uf-text[data-scope][data-variant="label"]',
      '--uf-text-label-line-height',
    )
    expectCssBlockContains(
      componentsCss,
      '.uf-text[data-scope][data-variant="label"]:not([data-inset="none"])',
      'box-sizing: border-box;',
    )
    expectCssBlockContains(
      componentsCss,
      '.uf-text[data-scope][data-variant="label"]:not([data-inset="none"])',
      'min-height: var(--uf-text-label-min-height, var(--uf-spacing-6));',
    )
    expectCssBlockContains(
      componentsCss,
      '.uf-text[data-scope][data-variant="label"]:not([data-inset="none"])',
      'padding-top: var(--uf-text-label-pad-y, var(--uf-spacing-1));',
    )
    expectCssBlockContains(
      componentsCss,
      '.uf-text[data-scope][data-variant="label"]:not([data-inset="none"])',
      'padding-bottom: var(--uf-text-label-pad-y, var(--uf-spacing-1));',
    )

    const markdownNode = container.querySelector<HTMLElement>(
      '.uf-text[data-scope="text"][data-variant="markdown"]',
    )
    expect(markdownNode).not.toBeNull()
    const labelNode = container.querySelector<HTMLElement>(
      '.uf-text[data-scope="text"][data-variant="label"]',
    )
    expect(labelNode).not.toBeNull()
    expect(labelNode?.tagName).toBe('LABEL')
    for (const size of textSizeOptions) {
      const token = textSizeTokenMap[size]
      const node = container.querySelector<HTMLElement>(
        `.uf-text[data-scope="text"][data-size="${size}"]`,
      )

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
          <Tooltip open content="Tooltip content">
            Hover me
          </Tooltip>
          <Popover open content="Popover content">
            Open me
          </Popover>
        </div>,
      )
    })

    // Overlay portals content to document.body, so query there instead of the render container
    const contents = Array.from(
      document.body.querySelectorAll<HTMLElement>('.uf-overlay-content'),
    )
    expect(contents).toHaveLength(2)
    expect(contents[0]?.getAttribute('data-trigger')).toBe('hover')
    expect(contents[1]?.getAttribute('data-trigger')).toBe('click')
  })

  it('keeps dropdown and overlay surfaces theme-aware while Tooltip colors stay invariant', () => {
    expect(tokensCss).toContain(
      '--uf-overlay-surface-bg: var(--uf-color-surface-sidebar, var(--uf-color-white-14));',
    )
    expect(tokensCss).toContain(
      '--uf-overlay-surface-bg: var(--uf-color-white-100);',
    )
    expect(designSystemColorCss).toContain(
      '--uf-overlay-surface-bg: var(--uf-color-surface-sidebar, var(--uf-color-white-14));',
    )
    expect(designSystemColorCss).toContain(
      '--uf-overlay-surface-bg: var(--uf-color-white-100);',
    )
    expect(tokensCss).toContain(
      '--uf-overlay-surface-underlay-bg: var(--uf-color-black-96);',
    )
    expect(tokensCss).toContain(
      '--uf-overlay-surface-underlay-bg: var(--uf-color-white-100);',
    )
    expect(tokensCss).toContain(
      '--uf-overlay-surface-background: linear-gradient(var(--uf-overlay-surface-bg), var(--uf-overlay-surface-bg)), var(--uf-overlay-surface-underlay-bg);',
    )
    expect(tokensCss).toContain(
      '--uf-dropdown-surface-bg: var(--uf-overlay-surface-bg);',
    )
    expect(tokensCss).toContain(
      '--uf-dropdown-surface-bg: var(--uf-color-white-100);',
    )
    expect(tokensCss).toContain(
      '--uf-dropdown-surface-underlay-bg: var(--uf-overlay-surface-underlay-bg);',
    )
    expect(tokensCss).toContain(
      '--uf-dropdown-surface-underlay-bg: var(--uf-color-white-100);',
    )
    expect(tokensCss).toContain(
      '--uf-dropdown-surface-background: linear-gradient(var(--uf-dropdown-surface-bg), var(--uf-dropdown-surface-bg)), var(--uf-dropdown-surface-underlay-bg);',
    )
    expect(designSystemColorCss).toContain(
      '--uf-dropdown-surface-bg: var(--uf-overlay-surface-bg);',
    )
    expect(designSystemColorCss).toContain(
      '--uf-dropdown-surface-bg: var(--uf-color-white-100);',
    )
    expect(tokensCss).toContain(
      '--uf-tooltip-bg: var(--uf-color-surface-sidebar, var(--uf-color-white-14));',
    )
    expect(tokensCss).toContain(
      '--uf-tooltip-background: linear-gradient(var(--uf-tooltip-bg), var(--uf-tooltip-bg)), var(--uf-color-black-96);',
    )
    expect(tokensCss).toContain('--uf-tooltip-fg: var(--uf-color-white-92);')
    expect(tokensCss).toContain(
      '--uf-tooltip-border: var(--uf-color-white-20);',
    )
    expect(designSystemColorCss).toContain(
      '--uf-tooltip-bg: var(--uf-color-surface-sidebar, var(--uf-color-white-14));',
    )
    expect(designSystemColorCss).toContain(
      '--uf-tooltip-fg: var(--uf-color-white-92);',
    )
    expect(componentsCss).toContain(
      '.uf-card[data-scope][data-card-variant="code"]',
    )
    expect(componentsCss).toContain('--uf-card-bg: var(--uf-tooltip-bg);')
    expect(componentsCss).toContain(
      '--uf-card-background: var(--uf-tooltip-background);',
    )
    expect(componentsCss).toContain(
      '--uf-card-border: var(--uf-tooltip-border);',
    )
    expect(componentsCss).toContain('--uf-text-color: var(--uf-tooltip-fg);')
    expect(componentsCss).toContain('color: var(--uf-tooltip-fg);')
  })

  it('Modal composes centered and edge-aligned surfaces through placement and edge', async () => {
    await act(async () => {
      root.render(
        <div>
          <Modal open portal={false} title="Bottom" placement="bottom">
            Content
          </Modal>
          <Modal open portal={false} title="Start" placement="start" edge="flush">
            Content
          </Modal>
          <Modal open portal={false} title="Top" placement="top">
            Content
          </Modal>
          <Modal open portal={false} title="End" placement="end">
            Content
          </Modal>
        </div>,
      )
    })

    const modals = Array.from(
      document.body.querySelectorAll<HTMLElement>('.uf-modal[data-scope]'),
    )
    const positioners = Array.from(
      document.body.querySelectorAll<HTMLElement>(
        '.uf-modal-positioner[data-scope]',
      ),
    )
    expect(modals).toHaveLength(4)
    expect(modals[0]?.getAttribute('data-variant')).toBe('bottom')
    expect(modals[0]?.getAttribute('data-edge')).toBe('inset')
    expect(modals[0]?.classList.contains('uf-modal--edge-inset')).toBe(true)
    expect(
      positioners[0]?.classList.contains('uf-modal-positioner--edge-inset'),
    ).toBe(true)
    expect(modals[1]?.getAttribute('data-variant')).toBe('start')
    expect(modals[1]?.getAttribute('data-edge')).toBe('flush')
    expect(modals[1]?.classList.contains('uf-modal--edge-flush')).toBe(true)
    expect(
      positioners[1]?.classList.contains('uf-modal-positioner--edge-flush'),
    ).toBe(true)
    expect(modals[2]?.getAttribute('data-variant')).toBe('top')
    expect(modals[2]?.classList.contains('uf-modal--edge-inset')).toBe(true)
    expect(modals[3]?.getAttribute('data-variant')).toBe('end')
    expect(modals[3]?.classList.contains('uf-modal--edge-inset')).toBe(true)
    expect(modals[0]?.getAttribute('data-border')).toBe('true')
    expect(modals[1]?.getAttribute('data-border')).toBe('false')
    expect(modals[2]?.getAttribute('data-border')).toBe('true')
    expect(modals[3]?.getAttribute('data-border')).toBe('true')
    expect(modals[0]?.getAttribute('data-radius')).toBe('lg')
    expect(modals[1]?.getAttribute('data-radius')).toBe('none')
    expect(modals[2]?.getAttribute('data-radius')).toBe('lg')
    expect(modals[3]?.getAttribute('data-radius')).toBe('lg')
    expect(componentsCss).toContain(
      '.uf-modal-positioner[data-scope].uf-modal-positioner--edge-inset:not([data-variant="center"])',
    )
    expect(componentsCss).toContain('.uf-modal[data-scope].uf-modal--edge-flush {')
    expect(componentsCss).toContain(
      '.uf-modal[data-scope].uf-modal--edge-inset:not([data-variant="center"])',
    )
  })

  it('SegmentedControl defaults to single selection and Date renders date field behavior', async () => {
    await act(async () => {
      root.render(
        <div>
          <SegmentedControl
            items={[
              { value: 'grid', label: 'Grid' },
              { value: 'list', label: 'List' },
            ]}
            defaultValue="grid"
          />
          <DateField label="Date" />
        </div>,
      )
    })

    const buttons = Array.from(
      container.querySelectorAll<HTMLButtonElement>('.uf-toggle-item'),
    )
    expect(buttons).toHaveLength(2)
    expect(buttons[0]?.getAttribute('data-state')).toBe('on')

    await act(async () => {
      buttons[1]?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(buttons[0]?.getAttribute('data-state')).toBe('off')
    expect(buttons[1]?.getAttribute('data-state')).toBe('on')
    expect(buttons[0]?.getAttribute('tabindex')).toBe('-1')
    expect(buttons[1]?.getAttribute('tabindex')).toBe('0')

    await act(async () => {
      buttons[1]?.focus()
      buttons[1]?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }),
      )
    })

    expect(document.activeElement).toBe(buttons[0])
    expect(buttons[0]?.getAttribute('data-state')).toBe('on')
    expect(buttons[1]?.getAttribute('data-state')).toBe('off')
    expect(buttons[0]?.getAttribute('tabindex')).toBe('0')
    expect(buttons[1]?.getAttribute('tabindex')).toBe('-1')
    expect(container.textContent).toContain('Date')
  })

  it('honors an explicit flush inset for label text', async () => {
    await act(async () => {
      root.render(
        <Text as="span" variant="label" inset="none">Flush label</Text>,
      )
    })

    const label = container.querySelector<HTMLElement>('[data-scope="text"]')
    expect(label?.getAttribute('data-inset')).toBe('none')
    expect(label?.classList.contains('uf-text--inset-none')).toBe(true)
  })
})
