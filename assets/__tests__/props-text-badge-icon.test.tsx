// @vitest-environment jsdom
import React, { act, createRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Text, type TextElement, type TextVariant } from '../../Text/Text'
import { Badge } from '../../Badge/Badge'
import { Icon, ICON_NAMES } from '../../Icon/Icon'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let host: HTMLDivElement
let root: Root
const render = async (node: React.ReactNode) => {
  await act(async () => root.render(node))
}
beforeEach(() => {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})
afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
})

describe('Text and Badge content contracts', () => {
  it('keeps content sizing independent from inset, semantics and ref forwarding', async () => {
    const ref = createRef<HTMLElement>()
    await render(<Text ref={ref} as="h2" heightMode="content" membrane={false}>A heading</Text>)
    const heading = host.querySelector('h2')!
    expect(ref.current).toBe(heading)
    expect(heading.dataset.heightMode).toBe('content')
    expect(heading.dataset.inset).toBe('control')
    expect(heading.textContent).toBe('A heading')
    expect(heading.hasAttribute('data-membrane')).toBe(false)
    await render(<Text inset="none" membrane={false}>Inline label</Text>)
    expect(host.querySelector('[data-scope="text"]')?.getAttribute('data-height-mode')).toBe('control')
    expect(host.querySelector('[data-scope="text"]')?.getAttribute('data-inset')).toBe('none')
  })

  for (const Component of [Text, Badge]) {
    it(`${Component.displayName || (Component === Text ? 'Text' : 'Badge')} renders text or rich children with predictable precedence and forwards native root props`, async () => {
      const ref = createRef<HTMLElement>()
      const click = vi.fn()
      await render(<Component text="Plain" />)
      expect(host.textContent).toBe('Plain')
      await render(<Component text="Fallback">{0}</Component>)
      expect(host.textContent).toBe('0')
      await render(<Component text="Fallback">{false}</Component>)
      expect(host.textContent).toBe('')
      expect(host.querySelector('.uf-text__content')).toBeNull()
      await render(<Component text="Fallback">{''}</Component>)
      expect(host.textContent).toBe('')
      await render(<Component text="Fallback">{null}</Component>)
      expect(host.textContent).toBe('Fallback')
      await render(
        <Component
          ref={ref}
          id="content"
          title="Hint"
          aria-label="Status"
          role="status"
          lang="ru"
          dir="rtl"
          className="custom"
          style={{ color: 'red' }}
          onClick={click}
        >
          <strong>Ready</strong>
        </Component>,
      )
      const node = host.querySelector<HTMLElement>('#content')!
      expect(ref.current).toBe(node)
      expect(node.classList.contains('custom')).toBe(true)
      expect(node.title).toBe('Hint')
      expect(node.style.color).toBe('red')
      expect(node.getAttribute('role')).toBe('status')
      expect(node.getAttribute('aria-label')).toBe('Status')
      expect(node.lang).toBe('ru')
      expect(node.dir).toBe('rtl')
      expect(node.querySelector('strong')?.textContent).toBe('Ready')
      await act(async () => node.click())
      expect(click).toHaveBeenCalledTimes(1)
      expect(host.querySelectorAll('.uf-membrane:not([data-membrane-disabled])')).toHaveLength(1)
    })
  }
  it('Text variants select appropriate semantics; explicit as overrides semantics only', async () => {
    const tags: Record<TextVariant, string> = {
      body: 'P',
      heading: 'H2',
      h1: 'H1',
      h2: 'H2',
      h3: 'H3',
      h4: 'H4',
      h5: 'H5',
      h6: 'H6',
      label: 'LABEL',
      kbd: 'KBD',
      code: 'CODE',
      markdown: 'P',
      muted: 'P',
      blockquote: 'BLOCKQUOTE',
    }
    for (const [variant, tag] of Object.entries(tags)) {
      await render(<Text text="Content" variant={variant as TextVariant} />)
      expect(host.querySelector('[data-scope="text"]')?.tagName, variant).toBe(
        tag,
      )
    }
    for (const as of [
      'p',
      'span',
      'div',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'label',
      'kbd',
      'code',
      'strong',
      'em',
      'small',
      'blockquote',
    ]) {
      await render(
        <Text
          text="Content"
          as={as as TextElement}
          variant="muted"
          membrane={false}
          htmlFor="field"
        />,
      )
      const node = host.querySelector('.uf-text')!
      expect(node.tagName).toBe(as.toUpperCase())
      expect(node.getAttribute('data-variant')).toBe('muted')
      expect(node.getAttribute('for')).toBe(as === 'label' ? 'field' : null)
    }
  })
  it('Text icon can change side, accept rich nodes, and disappear without an empty slot', async () => {
    for (const iconPosition of ['start', 'end'] as const) {
      await render(
        <Text text="Content" icon="user" iconPosition={iconPosition} />,
      )
      const node = host.querySelector('[data-scope="text"]')!
      expect(node.querySelector('svg')?.getAttribute('data-icon')).toBe('user')
      expect(
        (iconPosition === 'start'
          ? node.firstElementChild
          : node.lastElementChild
        )?.className,
      ).toBe('uf-text__icon')
    }
    await render(<Text text="Content" icon={<b>!</b>} />)
    expect(host.querySelector('.uf-text__icon b')?.textContent).toBe('!')
    for (const icon of [null, undefined, false, '']) {
      await render(<Text text="Content" icon={icon} />)
      expect(host.querySelector('.uf-text__icon')).toBeNull()
    }
  })
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
      await render(<Icon name={name} />)
      expect(host.querySelector('svg')?.innerHTML, name).toBe(fallback)
    }
    await render(<Icon name="  user  " />)
    expect(host.querySelector('svg')?.getAttribute('data-icon')).toBe('user')
    await render(<Icon name="  " />)
    expect(host.firstChild).toBeNull()
  })
  it('label and title have distinct accessible and visible-hint roles and can be removed', async () => {
    await render(<Icon name="user" />)
    expect(host.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
    await render(<Icon name="user" title="Account" />)
    expect(host.querySelector('title')?.textContent).toBe('Account')
    expect(host.querySelector('svg')?.getAttribute('aria-hidden')).toBeNull()
    expect(host.querySelector('svg')?.getAttribute('role')).toBe('img')
    await render(<Icon name="user" label="Profile" title="Account" />)
    expect(host.querySelector('svg')?.getAttribute('aria-label')).toBe(
      'Profile',
    )
    expect(host.querySelector('title')?.textContent).toBe('Account')
    await render(<Icon name="user" label=" " title=" " />)
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
