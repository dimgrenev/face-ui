import React, { act } from 'react'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import type { Root } from 'react-dom/client'
import { beforeEach, describe, expect, it } from 'vitest'
import { Icon, ICON_NAMES } from '../../Icon/Icon'
import { FACE_UI_ICON_MAP, ICONOTEKA_PATHS } from '../iconoteka/registry'
import { expectDevError, mount } from './harness'

let host: HTMLDivElement
let root: Root
const render = async (node: React.ReactNode) => {
  await act(async () => root.render(node))
}
beforeEach(() => {
  ;({ host, root } = mount())
})

// Compare every native shape and paint/transform attribute. Static exports must
// retain the complete runtime contour, even if an upstream glyph later changes.
const geometryOf = (svg: Element) =>
  Array.from(svg.querySelectorAll('*'))
    .filter((shape) => ['g', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'ellipse'].includes(shape.localName))
    .map((shape) => ({
      tag: shape.localName,
      attributes: Object.fromEntries(
        Array.from(shape.attributes)
          .map(({ name, value }) => [name, value])
          .sort(([first], [second]) => first.localeCompare(second)),
      ),
    }))

const parseSvg = (source: string) => {
  const document = new DOMParser().parseFromString(source, 'image/svg+xml')
  expect(document.querySelector('parsererror')).toBeNull()
  const svg = document.querySelector('svg')
  expect(svg).not.toBeNull()
  return svg!
}

const controlSources = {
  'arrow-down': 'arrow_down/stroke',
  'arrow-left': 'arrow_left/stroke',
  'arrow-right': 'arrow_right/stroke',
  'arrow-up': 'arrow_up/stroke',
  check: 'checkmark/stroke',
  'check-off': 'uncheck/stroke',
  'check-on': 'checkmark_in_square/stroke',
  'check-mixed': 'delete_in_square/stroke',
  close: 'cross/stroke',
  date: 'calendar/stroke',
  minus: 'minus/stroke',
  plus: 'plus/stroke',
  more: 'more/stroke',
  copy: 'copy/stroke',
  search: 'search/stroke',
  star: 'star/stroke',
  'radio-off': 'circle/stroke',
  'radio-on': 'radio_button/stroke',
} as const

const smallChevronSources = {
  down: 'chevron_small_down/stroke',
  up: 'chevron_small_up/stroke',
  left: 'chevron_small_left/stroke',
  right: 'chevron_small_right/stroke',
  'select-chevron-down': 'chevron_small_down/stroke',
  'select-chevron-right': 'chevron_small_right/stroke',
  'select-chevron-up': 'chevron_small_up/stroke',
} as const

describe('Icon prop contract', () => {
  it('name renders every registered glyph and safely resolves arbitrary names after updates', async () => {
    for (const name of ICON_NAMES) {
      await render(<Icon name={name} />)
      expect(host.querySelector('svg path, svg circle, svg rect'), name).not.toBeNull()
      expect(host.querySelector('svg')?.getAttribute('data-icon')).toBe(name)
    }
    await render(<Icon name="notdef" />)
    const fallback = host.querySelector('svg')!.innerHTML
    for (const name of [
      'unknown', 'constructor', 'toString', '__proto__',
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

  it('aria-label and title retain their roles for both pictograms and control states', async () => {
    for (const name of ['user', 'check-on']) {
      await render(<Icon name={name} />)
      expect(host.querySelector('svg')?.getAttribute('aria-hidden'), name).toBe('true')
      await render(<Icon name={name} title="Account" />)
      expect(host.querySelector('title')?.textContent, name).toBe('Account')
      expect(host.querySelector('svg')?.getAttribute('aria-hidden'), name).toBeNull()
      expect(host.querySelector('svg')?.getAttribute('role'), name).toBe('img')
      await render(<Icon name={name} aria-label="Profile" title="Account" />)
      expect(host.querySelector('svg')?.getAttribute('aria-label'), name).toBe('Profile')
      expect(host.querySelector('title')?.textContent, name).toBe('Account')
      await render(<Icon name={name} aria-label=" " title=" " />)
      expect(host.querySelector('title'), name).toBeNull()
      expect(host.querySelector('svg')?.getAttribute('aria-hidden'), name).toBe('true')
    }
  })

  it('className and paint styles reach the SVG without changing the fixed icon box', async () => {
    for (const name of ['crop', 'close']) {
      await render(
        <Icon name={name} className="custom" style={{ color: 'red', opacity: 0.5 }} />,
      )
      const node = host.querySelector('svg')!
      expect(node.classList.contains('custom'), name).toBe(true)
      expect(node.style.color, name).toBe('red')
      expect(node.style.opacity, name).toBe('0.5')
      expect(node.getAttribute('viewBox'), name).toBe('0 0 24 24')
      expect(node.style.width, name).toBe('20px')
      expect(node.style.height, name).toBe('20px')
    }
  })
})

describe('Iconoteka integration', () => {
  it('every alias uses its pinned contour and matches its static SVG export', async () => {
    expect(ICON_NAMES).toEqual(Object.keys(FACE_UI_ICON_MAP))

    for (const name of ICON_NAMES) {
      await render(<Icon name={name} />)
      const icon = host.querySelector('svg')!
      const identifier = FACE_UI_ICON_MAP[name]
      expect(icon.getAttribute('data-iconset'), name).toBe(
        name === 'slash' ? 'face-ui' : 'iconoteka',
      )
      expect(icon.getAttribute('data-icon-source'), name).toBe(identifier)
      expect(icon.getAttribute('viewBox'), name).toBe('0 0 24 24')
      expect(identifier.startsWith('face-ui/'), name).toBe(name === 'slash')
      const paths = icon.querySelectorAll('path')
      expect(paths, name).toHaveLength(1)
      expect(paths[0].getAttribute('d'), name).toBe(
        ICONOTEKA_PATHS[identifier as keyof typeof ICONOTEKA_PATHS],
      )
      expect(paths[0].getAttribute('fill'), name).toBe('currentColor')
      expect(paths[0].getAttribute('fill-rule'), name).toBe('evenodd')
      expect(paths[0].getAttribute('clip-rule'), name).toBe('evenodd')

      const exported = parseSvg(readFileSync(
        path.resolve('assets', 'Icons', `${name}.svg`), 'utf8',
      ))
      expect(exported.getAttribute('viewBox'), name).toBe('0 0 24 24')
      expect(geometryOf(exported), name).toEqual(geometryOf(icon))
      expect(exported.querySelector('image, use, script, foreignObject'), name).toBeNull()
    }
    for (const name of ['check-mixed', 'visibility-on', 'visibility-off']) {
      expect(ICON_NAMES).toContain(name)
    }
  })

  it('direction and Select chevrons use the selected compact Iconoteka contours', async () => {
    for (const [name, source] of Object.entries(smallChevronSources)) {
      expect(FACE_UI_ICON_MAP[name as keyof typeof FACE_UI_ICON_MAP], name).toBe(source)
      await render(<Icon name={name} />)
      const icon = host.querySelector('svg')!
      expect(icon.getAttribute('data-iconset'), name).toBe('iconoteka')
      expect(icon.getAttribute('data-icon-source'), name).toBe(source)
      expect(icon.getAttribute('viewBox'), name).toBe('0 0 24 24')
      expect(icon.querySelector('path')?.getAttribute('d'), name).toBe(ICONOTEKA_PATHS[source])
    }
  })

  it('utility aliases retain their original Iconoteka source selection', async () => {
    for (const [name, source] of Object.entries(controlSources)) {
      expect(FACE_UI_ICON_MAP[name as keyof typeof FACE_UI_ICON_MAP], name).toBe(source)
      await render(<Icon name={name} />)
      const icon = host.querySelector('svg')!
      expect(icon.getAttribute('data-iconset'), name).toBe('iconoteka')
      expect(icon.getAttribute('data-icon-source'), name).toBe(source)
      expect(icon.getAttribute('viewBox'), name).toBe('0 0 24 24')
      expect(icon.querySelector('path')?.getAttribute('d'), name).toBe(ICONOTEKA_PATHS[source])
    }
  })

  it('checkbox, radio, mixed and visibility states have distinct upstream contours', async () => {
    for (const names of [
      ['check-off', 'check-on', 'check-mixed'],
      ['radio-off', 'radio-on'],
      ['visibility-on', 'visibility-off'],
      ['minus', 'check-mixed'],
    ]) {
      const sources: string[] = []
      const contours: string[] = []
      for (const name of names) {
        await render(<Icon name={name} />)
        const icon = host.querySelector('svg')!
        expect(icon.getAttribute('data-iconset'), name).toBe('iconoteka')
        sources.push(icon.getAttribute('data-icon-source')!)
        contours.push(icon.querySelector('path')!.getAttribute('d')!)
      }
      expect(new Set(sources).size, names.join(', ')).toBe(names.length)
      expect(new Set(contours).size, names.join(', ')).toBe(names.length)
    }
  })

  it('unsupported legacy runtime names render the registered fallback with no network source', async () => {
    await render(<Icon name="notdef" />)
    const fallback = host.querySelector('svg')!.innerHTML
    await expectDevError(
      () => render(<Icon name="git" />),
      /^Face UI Icon: invalid name "git"; rendering notdef\.$/,
    )
    const icon = host.querySelector('svg[data-icon="git"]')!
    expect(icon.innerHTML).toBe(fallback)
    expect(icon.querySelector('image, use, script, foreignObject')).toBeNull()
  })

  it('native Iconoteka geometry retains the same fixed 20x20 outer size', async () => {
    for (const name of ['crop', 'random', 'select-chevron-down', 'more', 'check-mixed', 'check-on', 'radio-on']) {
      await render(<Icon name={name} />)
      const icon = host.querySelector('svg')!
      expect(icon.getAttribute('width'), name).toBe('20')
      expect(icon.getAttribute('height'), name).toBe('20')
      expect(icon.getAttribute('viewBox'), name).toBe('0 0 24 24')
      expect(icon.style.width, name).toBe('20px')
      expect(icon.style.height, name).toBe('20px')
    }
  })
})
