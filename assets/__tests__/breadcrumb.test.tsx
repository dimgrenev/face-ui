import { act, createRef } from 'react'
import type { Root } from 'react-dom/client'
import { beforeEach, expect, it, vi } from 'vitest'
import { Breadcrumb, type BreadcrumbProps } from '../../Breadcrumb/Breadcrumb'
import { expectDevError, mount } from './harness'

let host: HTMLDivElement, root: Root
beforeEach(() => {
  ;({ host, root } = mount())
})
const render = (props: Record<string, unknown>) =>
  act(async () => {
    root.render(<Breadcrumb {...(props as BreadcrumbProps)} />)
  })

it('a current item without a destination is not a fake hyperlink', async () => {
  await render({
    items: [{ label: 'Home', href: '#home' }, { label: 'Current' }],
  })
  const current = host.querySelector('[aria-current="page"]')!
  expect(current.textContent).toBe('Current')
  expect(current.matches('a[href]')).toBe(false)
})

it('an ordinary href keeps native navigation enabled by default', async () => {
  await render({
    items: [{ label: 'Home', href: '#home' }, { label: 'Current' }],
  })
  const event = new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    button: 0,
  })
  await act(async () => {
    host.querySelector('a')!.dispatchEvent(event)
  })
  expect(event.defaultPrevented).toBe(false)
})

it('item onClick receives the event needed by a router adapter', async () => {
  let targetTag: string | undefined
  const onClick = vi.fn((event) => {
    targetTag = event?.currentTarget?.tagName
  })
  await render({
    items: [{ label: 'Home', href: '#home', onClick }, { label: 'Current' }],
  })
  await act(async () => {
    host.querySelector('a')!.click()
  })
  expect(onClick).toHaveBeenCalledOnce()
  expect(targetTag).toBe('A')
})

it('capture cancellation prevents an item callback', async () => {
  const onClick = vi.fn()
  await act(async () =>
    root.render(
      <div onClickCapture={(event) => event.preventDefault()}>
        <Breadcrumb
          items={[
            { label: 'Home', href: '#home', onClick },
            { label: 'Current' },
          ]}
        />
      </div>,
    ),
  )
  await act(async () => {
    host.querySelector('a')!.click()
  })
  expect(onClick).not.toHaveBeenCalled()
})

it('native naming and identity apply to the forwarded navigation landmark', async () => {
  const ref = createRef<HTMLElement>()
  await render({
    ref,
    items: [{ label: 'Current' }],
    id: 'path',
    dir: 'rtl',
    'aria-label': 'Путь документа',
  })
  expect(ref.current).toBe(host.querySelector('nav'))
  expect(ref.current?.id).toBe('path')
  expect(ref.current?.dir).toBe('rtl')
  expect(ref.current?.getAttribute('aria-label')).toBe('Путь документа')
})

it('collapsed destinations retain their link semantics and href', async () => {
  await render({
    items: [
      { label: 'Home', href: '#home' },
      { label: 'Library', href: '#library' },
      { label: 'Collection', href: '#collection' },
      { label: 'Current' },
    ],
    maxItems: 3,
  })
  await act(async () => {
    host
      .querySelector<HTMLButtonElement>('button[aria-label="Show path"]')!
      .click()
  })
  const anchor = document.querySelector('[role="dialog"] a[href="#library"]')
  expect(anchor?.textContent).toBe('Library')
})

it('custom label nodes and separators preserve their actual content', async () => {
  await render({
    items: [
      { label: <strong>Home</strong>, href: '#home' },
      { label: 'Current' },
    ],
    separator: <span>→</span>,
  })
  expect(host.querySelector('strong')?.textContent).toBe('Home')
  const separator = host.querySelector('[data-part="separator"]')!
  expect(separator.textContent).toBe('→')
  expect(separator.getAttribute('aria-hidden')).toBe('true')
})

it('frozen shared item arrays are not mutated by collapse', async () => {
  const items = Object.freeze(
    Array.from({ length: 6 }, (_, index) =>
      Object.freeze({ label: `Item ${index}`, href: `#${index}` }),
    ),
  )
  await render({ items, maxItems: 4 })
  expect(items.map((item) => item.label)).toEqual([
    'Item 0',
    'Item 1',
    'Item 2',
    'Item 3',
    'Item 4',
    'Item 5',
  ])
  expect(host.querySelector('nav')?.textContent).toContain('Item 0')
  expect(host.querySelector('nav')?.textContent).toContain('Item 5')
})

it.each([false, true])(
  'Popover capture respects cancellation while open=%s',
  async (open) => {
    const { Popover } = await import('../../Popover/Popover')
    const onOpenChange = vi.fn()
    await act(async () =>
      root.render(
        <div onClickCapture={(event) => event.preventDefault()}>
          <Popover open={open} onOpenChange={onOpenChange} content="Path">
            <button>Open path</button>
          </Popover>
        </div>,
      ),
    )
    await act(async () => {
      host.querySelector('button')!.click()
    })
    expect(onOpenChange).not.toHaveBeenCalled()
  },
)

const trail = Object.freeze(
  ['Root', 'A', 'B', 'C', 'D', 'Current'].map((label, index) =>
    Object.freeze({
      label,
      href: index < 5 ? `#${label}` : undefined,
      key: label,
    }),
  ),
)
const visible = () =>
  Array.from(host.querySelectorAll('nav > ol > li')).map(
    (node) =>
      node.querySelector('.uf-breadcrumb-label')?.textContent ?? '[overflow]',
  )

it('maxItems defaults to four positions including overflow and retains the tail', async () => {
  await render({ items: trail })
  expect(visible()).toEqual(['Root', '[overflow]', 'D', 'Current'])
})
it('maxItems can show only root/current or the entire trail and updates live', async () => {
  await render({ items: trail, maxItems: 3 })
  expect(visible()).toEqual(['Root', '[overflow]', 'Current'])
  await render({ items: trail, maxItems: null })
  expect(visible()).toEqual(['Root', 'A', 'B', 'C', 'D', 'Current'])
  await render({ items: trail, maxItems: 6 })
  expect(host.querySelector('button')).toBeNull()
})
it.each([
  [0, '0; using 3', ['Root', '[overflow]', 'Current']],
  [2, '2; using 3', ['Root', '[overflow]', 'Current']],
  [3.5, '3.5; using 3', ['Root', '[overflow]', 'Current']],
  [NaN, 'NaN; using 4', ['Root', '[overflow]', 'D', 'Current']],
  [Infinity, 'Infinity; using 4', ['Root', '[overflow]', 'D', 'Current']],
  ['4', '"4"; using 4', ['Root', '[overflow]', 'D', 'Current']],
  [Number.MAX_VALUE, `${Number.MAX_VALUE}; using ${Number.MAX_SAFE_INTEGER}`, ['Root', 'A', 'B', 'C', 'D', 'Current']],
] as const)(
  'invalid maxItems=%s is normalized and reported',
  async (maxItems, message, shown) => {
    await expectDevError(
      () => render({ items: trail, maxItems }),
      new RegExp(`^Face UI Breadcrumb: invalid maxItems ${message.replace(/[.+]/g, '\\$&')}\\.$`),
    )
    expect(visible()).toEqual(shown)
  },
)
it('item keys preserve DOM identity through reorder in the same list', async () => {
  await render({ items: trail, maxItems: null })
  const original = host.querySelector('a[href="#B"]')
  original?.setAttribute('data-remembered', 'yes')
  await render({
    items: [trail[0], trail[2], trail[1], ...trail.slice(3)],
    maxItems: null,
  })
  expect(host.querySelector('a[href="#B"]')).toBe(original)
  expect(original?.getAttribute('key')).toBeNull()
})
const labels = () =>
  Array.from(host.querySelectorAll('.uf-breadcrumb-label'), (node) => node.textContent)
it.each([
  ['not an array', {}, [], /invalid items object; using \[\]/],
  ['null', null, [], /invalid items null; using \[\]/],
  ['a null item', [null, { label: 'B' }], ['B'], /invalid items\[0\] null; dropping the item/],
  ['an object key', [{ label: 'A', key: {} }, { label: 'B' }], ['A', 'B'], /invalid items\[0\] key object; using "#0"/],
  ['an infinite key', [{ label: 'A', key: Infinity }], ['A'], /invalid items\[0\] key Infinity; using "#0"/],
  ['a repeated key', [{ label: 'A', key: 1 }, { label: 'B', key: '1' }], ['A'], /invalid items\[1\] key "1"; dropping the duplicate/],
] as const)('items with %s render normalized and are reported', async (_, items, shown, message) => {
  await expectDevError(
    () => render({ items }),
    new RegExp(`^Face UI Breadcrumb: ${message.source}\\.$`),
  )
  expect(labels()).toEqual(shown)
  expect(host.querySelector('nav') !== null).toBe(shown.length > 0)
})
it('empty labels render as given, without a report', async () => {
  await render({ items: [{ label: '' }, { label: '   ' }, { label: false }] })
  expect(labels()).toEqual(['', '   ', ''])
})
it('input metadata cannot impersonate the internal overflow slot', async () => {
  await render({ items: [{ label: 'Current', __overflow: true }] })
  expect(host.textContent).toBe('Current')
  expect(host.querySelector('button')).toBeNull()
})
it.each([null, false, '', []])(
  'empty separator=%j removes its slot',
  async (separator) => {
    await render({ items: trail, separator })
    expect(host.querySelector('[data-part="separator"]')).toBeNull()
  },
)
it('native class/style/lang/data attributes stay on the same nav', async () => {
  const ref = createRef<HTMLElement>()
  await render({
    items: trail,
    ref,
    className: 'owned',
    style: { width: 400 },
    lang: 'ru',
    'data-owned': 'yes',
  })
  expect(ref.current?.classList.contains('owned')).toBe(true)
  expect(ref.current?.style.width).toBe('400px')
  expect(ref.current?.lang).toBe('ru')
  expect(ref.current?.dataset.owned).toBe('yes')
})
it('labels.more names the real trigger and dialog', async () => {
  await render({
    items: trail,
    labels: { more: 'Все разделы' },
    'aria-label': 'Путь',
  })
  const button = host.querySelector<HTMLButtonElement>('button')!
  expect(button.getAttribute('aria-label')).toBe('Все разделы')
  await act(async () => button.click())
  expect(
    document.querySelector('[role="dialog"]')?.getAttribute('aria-label'),
  ).toBe('Все разделы')
  expect(host.querySelector('nav')?.getAttribute('aria-label')).toBe('Путь')
})
it('blank labels.more falls back silently; a non-string one falls back and is reported', async () => {
  await render({ items: trail, labels: { more: '  ' } })
  expect(host.querySelector('button')?.getAttribute('aria-label')).toBe(
    'Show path',
  )
  await expectDevError(
    () => render({ items: trail, labels: { more: 5 } }),
    /^Face UI Breadcrumb: invalid labels\.more 5; using "Show path"\.$/,
  )
  expect(host.querySelector('button')?.getAttribute('aria-label')).toBe(
    'Show path',
  )
})
it('a callback without href is a native button and never submits its parent form', async () => {
  const onClick = vi.fn(),
    submit = vi.fn()
  await act(async () =>
    root.render(
      <form onSubmit={submit}>
        <Breadcrumb
          items={[{ label: 'Action', onClick }, { label: 'Current' }]}
        />
      </form>,
    ),
  )
  const button = host.querySelector<HTMLButtonElement>('[data-part="action"]')!
  expect(button.tagName).toBe('BUTTON')
  expect(button.type).toBe('button')
  await act(async () => button.click())
  expect(onClick).toHaveBeenCalledOnce()
  expect(submit).not.toHaveBeenCalled()
})
it('a supplied current href stays a real link with aria-current', async () => {
  await render({ items: [{ label: 'Current', href: '#current' }] })
  expect(host.querySelector('a')?.getAttribute('aria-current')).toBe('page')
  expect(host.querySelector('a')?.getAttribute('href')).toBe('#current')
})
it('membrane toggles preserve existing links and callbacks', async () => {
  const onClick = vi.fn((event) => event.preventDefault())
  const items = [
    { label: 'Home', href: '#home', onClick },
    { label: 'Current' },
  ]
  await render({ items })
  const link = host.querySelector('a')!
  await render({ items, membrane: false })
  expect(host.querySelector('a')).toBe(link)
  expect(link.parentElement?.hasAttribute('data-membrane-disabled')).toBe(true)
  await act(async () => link.click())
  expect(onClick).toHaveBeenCalledOnce()
})
it('hidden and maxItems=null close overflow without reopening it later', async () => {
  for (const change of [{ hidden: true }, { maxItems: null }]) {
    await render({ items: trail })
    await act(async () =>
      host.querySelector<HTMLButtonElement>('button')!.click(),
    )
    await render({ items: trail, ...change })
    await render({ items: trail })
    expect(host.querySelector('button')?.getAttribute('aria-expanded')).toBe(
      'false',
    )
  }
})
it('an absent or empty trail does not add an empty navigation landmark', async () => {
  await render({})
  expect(host.querySelector('nav')).toBeNull()
  await render({ items: [] })
  expect(host.querySelector('nav')).toBeNull()
})

it('the gallery owns navigation cancellation for inline and portaled links', async () => {
  const { default: Gallery } = await import('../../face-ui-react')
  await act(async () =>
    root.render(
      <Gallery
        face={{ version: 1, cards: [{ id: 'path', component: 'Breadcrumb' }] }}
      />,
    ),
  )
  const link = host.querySelector('nav a')!
  const event = new MouseEvent('click', { bubbles: true, cancelable: true })
  await act(async () => {
    link.dispatchEvent(event)
  })
  expect(event.defaultPrevented).toBe(true)
  const trigger = host.querySelector<HTMLButtonElement>(
    'button[aria-label="Show path"]',
  )!
  const openEvent = new MouseEvent('click', { bubbles: true, cancelable: true })
  await act(async () => {
    trigger.dispatchEvent(openEvent)
  })
  expect(openEvent.defaultPrevented).toBe(false)
  const popupLink = document.querySelector('[role="dialog"] a')!
  const popupEvent = new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
  })
  await act(async () => {
    popupLink.dispatchEvent(popupEvent)
  })
  expect(popupEvent.defaultPrevented).toBe(true)
})

it('a focused crumb that collapses into the overflow hands focus to the overflow button', async () => {
  await render({ items: trail, maxItems: null })
  await act(async () => host.querySelector<HTMLElement>('a[href="#B"]')!.focus())
  await render({ items: trail, maxItems: 3 })
  expect(document.activeElement).toBe(
    host.querySelector('button[aria-label="Show path"]'),
  )
})
it('a removed focused crumb hands focus to the first remaining link; a retained one keeps it', async () => {
  await render({ items: trail, maxItems: null })
  const root = host.querySelector<HTMLElement>('a[href="#Root"]')!
  await act(async () => root.focus())
  await render({ items: trail.slice(0, 5), maxItems: null })
  expect(document.activeElement).toBe(root)
  await act(async () => host.querySelector<HTMLElement>('a[href="#C"]')!.focus())
  await render({ items: [trail[0], trail[1], trail[5]], maxItems: null })
  expect(document.activeElement).toBe(root)
})
it('focus in the overflow list returns to the same crumb when the trail stops collapsing', async () => {
  await render({ items: trail })
  await act(async () =>
    host.querySelector<HTMLButtonElement>('button[aria-label="Show path"]')!.click(),
  )
  await act(async () =>
    document.querySelector<HTMLElement>('[role="dialog"] a[href="#B"]')!.focus(),
  )
  await render({ items: trail, maxItems: null })
  expect(document.querySelector('[role="dialog"]')).toBeNull()
  expect(document.activeElement).toBe(host.querySelector('a[href="#B"]'))
})
const openOverflowAt = async (href: string) => {
  await act(async () =>
    host.querySelector<HTMLButtonElement>('button[aria-label="Show path"]')!.click(),
  )
  await act(async () =>
    document.querySelector<HTMLElement>(`[role="dialog"] a[href="${href}"]`)!.focus(),
  )
}
it('a focused overflow crumb removed while the list stays open hands focus to the overflow button', async () => {
  await render({ items: trail })
  await openOverflowAt('#B')
  await render({ items: trail.filter(({ key }) => key !== 'B') })
  expect(document.querySelector('[role="dialog"] a[href="#A"]')).not.toBeNull()
  expect(document.activeElement).toBe(
    host.querySelector('button[aria-label="Show path"]'),
  )
})
it('a focused overflow crumb that moves inline while the trail still collapses keeps focus on its location', async () => {
  await render({ items: trail, maxItems: 4 })
  await openOverflowAt('#C')
  await render({ items: trail, maxItems: 5 })
  expect(document.activeElement).toBe(host.querySelector('a[href="#C"]'))
})
it('a focused crumb whose element is replaced keeps focus on the same location', async () => {
  await render({ items: trail, maxItems: null })
  await act(async () => host.querySelector<HTMLElement>('a[href="#C"]')!.focus())
  await render({
    items: trail.map((item) =>
      item.key === 'C' ? { key: 'C', label: 'C', onClick() {} } : item,
    ),
    maxItems: null,
  })
  const active = document.activeElement as HTMLElement
  expect([active.tagName, active.textContent]).toEqual(['BUTTON', 'C'])
})
it('focus moved out of the overflow list is not recovered when that crumb goes away', async () => {
  await render({ items: trail })
  await openOverflowAt('#B')
  const outside = document.body.appendChild(document.createElement('button'))
  await act(async () => outside.focus())
  await act(async () => outside.remove())
  await render({ items: trail.filter(({ key }) => key !== 'B') })
  expect(document.activeElement).toBe(document.body)
})
it('closing the overflow list by an outside press leaves focus where the user put it', async () => {
  await render({ items: trail })
  await act(async () =>
    host.querySelector<HTMLButtonElement>('button[aria-label="Show path"]')!.click(),
  )
  await act(async () =>
    document.querySelector<HTMLElement>('[role="dialog"] a[href="#B"]')!.focus(),
  )
  await act(async () => {
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    ;(document.activeElement as HTMLElement | null)?.blur()
  })
  expect(document.querySelector('[role="dialog"]:not([hidden])')).toBeNull()
  await render({ items: trail, maxItems: null })
  expect(document.activeElement).toBe(document.body)
})
