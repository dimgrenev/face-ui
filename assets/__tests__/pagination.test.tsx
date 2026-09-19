import { act, createRef, useState } from 'react'
import type { Root } from 'react-dom/client'
import { beforeEach, expect, it, vi, describe } from 'vitest'
import { Pagination, type PaginationProps } from '../../Pagination/Pagination'
import { Modal } from '../../Modal/Modal'
import { expectDevError, mount } from './harness'
import { describeControlled } from './harness/controlled'

let host: HTMLDivElement, root: Root
beforeEach(() => {
  ;({ host, root } = mount())
})
const render = (props: Record<string, unknown> = {}) =>
  act(async () => {
    root.render(<Pagination total={1000} {...(props as PaginationProps)} />)
  })
const current = () =>
  Number(host.querySelector('[aria-current="page"]')?.textContent)
const click = (label: string) =>
  act(async () => {
    host
      .querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!
      .click()
  })

it.each([
  ['total', { total: 50 }],
  ['pageSize', { pageSize: 200 }],
])(
  'Previous starts from the visible page after %s changes',
  async (_, change) => {
    const callback = vi.fn()
    await render({ defaultPage: 50, onPageChange: callback })
    await render({ ...change, onPageChange: callback })
    expect(current()).toBe(5)
    expect(callback).not.toHaveBeenCalled()
    await click('Previous page')
    expect(current()).toBe(4)
    expect(callback).toHaveBeenCalledExactlyOnceWith({ page: 4 })
  },
)

it('clicking the visible current page after shrink is a no-op', async () => {
  const callback = vi.fn()
  await render({ defaultPage: 50, onPageChange: callback })
  await render({ total: 50, onPageChange: callback })
  await click('Page 5')
  expect(current()).toBe(5)
  expect(callback).not.toHaveBeenCalled()
})

it('controlled shrink proposes previous visible page and may be rejected', async () => {
  const callback = vi.fn()
  await render({ page: 50, total: 50, onPageChange: callback })
  await click('Previous page')
  expect(callback).toHaveBeenCalledExactlyOnceWith({ page: 4 })
  expect(current()).toBe(5)
})

it('normal controlled proposals can be accepted once', async () => {
  const callback = vi.fn()
  function Controlled() {
    const [page, setPage] = useState(2)
    return (
      <Pagination
        page={page}
        total={1000}
        onPageChange={(details) => {
          callback(details)
          setPage(details.page)
        }}
      />
    )
  }
  await act(async () => root.render(<Controlled />))
  await click('Next page')
  expect(current()).toBe(3)
  expect(callback).toHaveBeenCalledExactlyOnceWith({ page: 3 })
})

it('defaultPage changes do not reset uncontrolled navigation', async () => {
  await render({ defaultPage: 2 })
  await click('Next page')
  await render({ defaultPage: 80 })
  expect(current()).toBe(3)
})

it('native identity, direction and accessible name belong to the forwarded nav', async () => {
  const ref = createRef<HTMLElement>()
  await render({
    ref,
    id: 'audit-pages',
    dir: 'rtl',
    'aria-label': 'Audit pages',
    style: { width: 320 },
  })
  expect(ref.current).toBe(host.querySelector('nav'))
  expect(ref.current?.id).toBe('audit-pages')
  expect(ref.current?.dir).toBe('rtl')
  expect(ref.current?.getAttribute('aria-label')).toBe('Audit pages')
  expect(ref.current?.style.width).toBe('320px')
})

it('capture preventDefault cancels a navigation action', async () => {
  const callback = vi.fn(),
    capture = vi.fn((e: Event) => e.preventDefault())
  await render({ onClickCapture: capture, onPageChange: callback })
  await click('Next page')
  expect(capture).toHaveBeenCalledOnce()
  expect(current()).toBe(1)
  expect(callback).not.toHaveBeenCalled()
})

const pageNumbers = () =>
  [...host.querySelectorAll('.uf-pagination-page')].map((b) => b.textContent)

it.each([
  ['total', Infinity, 'Infinity; using 0', 1, ['1']],
  ['total', '50', '"50"; using 0', 1, ['1']],
  ['total', 1.5, '1.5; using 1', 1, ['1']],
  ['total', -5, '-5; using 0', 1, ['1']],
  ['total', Number.MAX_VALUE, `${Number.MAX_VALUE}; using ${Number.MAX_SAFE_INTEGER}`, 1, ['1', '2', '3', '4', '5', `${Math.ceil(Number.MAX_SAFE_INTEGER / 10)}`]],
  ['pageSize', 0, '0; using 1', 1, ['1', '2', '3', '4', '5', '1000']],
  ['pageSize', null, 'null; using 10', 1, ['1', '2', '3', '4', '5', '100']],
  ['page', 0, '0; using 1', 1, ['1', '2', '3', '4', '5', '100']],
  ['page', 2.9, '2.9; using 2', 2, ['1', '2', '3', '4', '5', '100']],
  ['page', NaN, 'NaN; using 1', 1, ['1', '2', '3', '4', '5', '100']],
  ['defaultPage', -3, '-3; using 1', 1, ['1', '2', '3', '4', '5', '100']],
  ['siblingCount', 21, '21; using 20', 1, Array.from({ length: 43 }, (_, i) => `${i + 1}`).concat('100')],
  ['siblingCount', -1, '-1; using 0', 1, ['1', '2', '3', '100']],
] as const)(
  'invalid %s=%s is normalized and reported; strings are not coerced',
  async (prop, value, message, page, pages) => {
    await expectDevError(
      () => render({ [prop]: value }),
      new RegExp(`^Face UI Pagination: invalid ${prop} ${message.replace(/[.+()]/g, '\\$&')}\\.$`),
    )
    expect(current()).toBe(page)
    expect(pageNumbers()).toEqual(pages)
  },
)

it('reading a number never runs object coercion', async () => {
  const valueOf = vi.fn(() => 100)
  await expectDevError(
    () => render({ total: { valueOf } }),
    /^Face UI Pagination: invalid total object; using 0\.$/,
  )
  expect(valueOf).not.toHaveBeenCalled()
  expect(pageNumbers()).toEqual(['1'])
})

it('internal labels and native navigation label can be localized independently', async () => {
  await render({
    'aria-label': 'Страницы журнала',
    labels: {
      previous: 'Назад',
      next: 'Далее',
      page: 'Страница {page}',
      choosePage: 'Выбрать страницу',
      pageNumber: 'Номер страницы',
      goToPage: 'Перейти',
      close: 'Закрыть',
    },
  })
  expect(host.querySelector('nav')?.getAttribute('aria-label')).toBe(
    'Страницы журнала',
  )
  expect(host.querySelector('.uf-pagination-navNext')?.textContent).toBe(
    'Далее',
  )
})

it.each([false, true])(
  'Modal respects capture cancellation for open=%s',
  async (open) => {
    const change = vi.fn()
    await act(async () =>
      root.render(
        <div onClickCapture={(e) => e.preventDefault()}>
          <Modal
            open={open}
            title="Pages"
            trigger={<button>Open pages</button>}
            onOpenChange={change}
          >
            Body
          </Modal>
        </div>,
      ),
    )
    await act(async () => {
      const button = open
        ? document.querySelector<HTMLButtonElement>('.uf-modal-closeButton')
        : host.querySelector<HTMLButtonElement>('button')
      button!.click()
    })
    expect(change).not.toHaveBeenCalled()
  },
)

it('an empty result has one bounded page and no available navigation action', async () => {
  const callback = vi.fn()
  await render({ total: 0, onPageChange: callback })
  expect(current()).toBe(1)
  for (const selector of [
    '.uf-pagination-navPrev',
    '.uf-pagination-navNext',
    '.uf-pagination-more',
  ])
    expect(host.querySelector<HTMLButtonElement>(selector)?.disabled).toBe(true)
  await click('Page 1')
  expect(callback).not.toHaveBeenCalled()
})

it('controlled page wins over an unused invalid initial default, which is not reported', async () => {
  await render({ page: 3, defaultPage: -1 })
  expect(current()).toBe(3)
})

it('invalid later defaults are ignored after uncontrolled mount', async () => {
  await render({ defaultPage: 3 })
  await render({ defaultPage: -1 })
  expect(current()).toBe(3)
})

it('external page and bounds updates are quiet, including while disabled', async () => {
  const callback = vi.fn()
  for (const props of [
    { page: 8 },
    { page: 2, total: 10 },
    { page: 3, pageSize: 20, disabled: true },
  ])
    await render({ ...props, onPageChange: callback })
  expect(current()).toBe(3)
  expect(callback).not.toHaveBeenCalled()
})

it('a quiet bounds round trip preserves initial intent until an actual user change', async () => {
  const callback = vi.fn()
  await render({ defaultPage: 50, onPageChange: callback })
  await render({ total: 50, onPageChange: callback })
  await click('Page 5')
  await render({ onPageChange: callback })
  expect(current()).toBe(50)
  expect(callback).not.toHaveBeenCalled()
  await render({ total: 50, onPageChange: callback })
  await click('Previous page')
  await render({ onPageChange: callback })
  expect(current()).toBe(4)
  expect(callback).toHaveBeenCalledExactlyOnceWith({ page: 4 })
})

it('each rejected controlled proposal starts from the unchanged visible page', async () => {
  const callback = vi.fn()
  await render({ page: 3, onPageChange: callback })
  await click('Next page')
  await click('Next page')
  expect(current()).toBe(3)
  expect(callback.mock.calls).toEqual([[{ page: 4 }], [{ page: 4 }]])
})

it('callbacks use the latest handler without storing a mutable details object', async () => {
  const first = vi.fn(),
    latest = vi.fn((details: { page: number }) => {
      details.page = 90
    })
  await render({ onPageChange: first })
  await render({ onPageChange: latest })
  await click('Next page')
  expect(first).not.toHaveBeenCalled()
  expect(latest).toHaveBeenCalledOnce()
  expect(current()).toBe(2)
})

it.each([0, 1, 3, 20])(
  'siblingCount=%s keeps a sorted unique bounded range with both ends and current',
  async (count) => {
    await render({ page: 50, total: 1e9, siblingCount: count })
    const buttons = [
      ...host.querySelectorAll<HTMLButtonElement>('.uf-pagination-page'),
    ]
    const pages = buttons.map((b) => Number(b.textContent))
    expect(pages).toEqual([...new Set(pages)].sort((a, b) => a - b))
    expect(pages).toContain(1)
    expect(pages).toContain(50)
    expect(pages).toContain(1e8)
    expect(
      pages.filter((p) => p >= 50 - count && p <= 50 + count),
    ).toHaveLength(count * 2 + 1)
    expect(
      host.querySelector('.uf-pagination-pages')?.children.length,
    ).toBeLessThanOrEqual(count * 2 + 5)
  },
)

it('changing siblingCount updates only the range, without selection or callback', async () => {
  const callback = vi.fn()
  await render({ page: 50, siblingCount: 0, onPageChange: callback })
  expect(host.querySelectorAll('.uf-pagination-page')).toHaveLength(3)
  await render({ page: 50, siblingCount: 2, onPageChange: callback })
  expect(host.querySelectorAll('.uf-pagination-page')).toHaveLength(7)
  expect(current()).toBe(50)
  expect(callback).not.toHaveBeenCalled()
})

it('all pages are shown when the full range fits and edge slots are useful', async () => {
  await render({ total: 50, siblingCount: 0 })
  expect(
    [...host.querySelectorAll('.uf-pagination-page')].map((b) => b.textContent),
  ).toEqual(['1', '2', '3', '4', '5'])
  expect(host.querySelector('.uf-pagination-ellipsis')).toBeNull()
  await render({ total: 1000, siblingCount: 0 })
  expect(
    [...host.querySelectorAll('.uf-pagination-page')].map((b) => b.textContent),
  ).toEqual(['1', '2', '3', '100'])
})

it('safe integer upper bounds still generate distinct usable pages', async () => {
  await render({
    page: Number.MAX_SAFE_INTEGER,
    total: Number.MAX_SAFE_INTEGER,
    pageSize: 1,
  })
  expect(current()).toBe(Number.MAX_SAFE_INTEGER)
  const values = [...host.querySelectorAll('.uf-pagination-page')].map((b) =>
    Number(b.textContent),
  )
  expect(values.every(Number.isSafeInteger)).toBe(true)
  expect(new Set(values).size).toBe(values.length)
  await click('Previous page')
  expect(current()).toBe(Number.MAX_SAFE_INTEGER)
})

it('membrane toggling preserves button identity, focus and uncontrolled page', async () => {
  await render({ defaultPage: 2 })
  const button = host.querySelector<HTMLButtonElement>(
    '.uf-pagination-navNext',
  )!
  button.focus()
  for (const membrane of [false, true]) {
    await render({ membrane })
    expect(host.querySelector('.uf-pagination-navNext')).toBe(button)
    expect(document.activeElement).toBe(button)
    expect(
      button.closest('.uf-membrane')?.hasAttribute('data-membrane-disabled'),
    ).toBe(!membrane)
    expect(current()).toBe(2)
  }
})

it('disabled blocks dispatched page actions and re-enabling retains the page', async () => {
  const callback = vi.fn()
  await render({ defaultPage: 2, disabled: true, onPageChange: callback })
  await act(async () => {
    for (const b of host.querySelectorAll('button'))
      b.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  expect(current()).toBe(2)
  expect(callback).not.toHaveBeenCalled()
  await render({ disabled: false, onPageChange: callback })
  await click('Next page')
  expect(current()).toBe(3)
})

it('native class, language, data and labelledby reach the same root, whose onClick runs before the change', async () => {
  const order: string[] = [],
    ref = createRef<HTMLElement>()
  await render({
    ref,
    className: 'audit',
    lang: 'ru',
    'data-audit': 'yes',
    'aria-labelledby': 'heading',
    onClick: () => order.push('bubble'),
    onPageChange: () => order.push('change'),
  })
  expect(ref.current?.classList.contains('audit')).toBe(true)
  expect(ref.current?.lang).toBe('ru')
  expect(ref.current?.dataset.audit).toBe('yes')
  expect(ref.current?.getAttribute('aria-labelledby')).toBe('heading')
  await click('Next page')
  expect(order).toEqual(['bubble', 'change'])
})

it('partial immutable dictionaries, whitespace fallback and extra fields do not leak to DOM', async () => {
  const labels = Object.freeze({
    next: '  Далее  ',
    previous: ' ',
    extra: 'unused',
  })
  await render({ labels })
  expect(host.querySelector('.uf-pagination-navNext')?.textContent).toBe(
    'Далее',
  )
  expect(host.querySelector('.uf-pagination-navPrev')?.textContent).toBe(
    'Previous page',
  )
  expect(host.querySelector('[labels], [extra]')).toBeNull()
  expect(labels.next).toBe('  Далее  ')
  await render({ labels: Object.create({ next: 'Inherited' }) })
  expect(host.querySelector('.uf-pagination-navNext')?.textContent).toBe(
    'Next page',
  )
})

it('page-name templates permit the number before or after localized text', async () => {
  await render({ labels: { page: '{page}ページ' } })
  expect(
    host.querySelector('.uf-pagination-page')?.getAttribute('aria-label'),
  ).toBe('1ページ')
  await render({ labels: { page: 'Страница {page}' } })
  expect(
    host.querySelector('.uf-pagination-page')?.getAttribute('aria-label'),
  ).toBe('Страница 1')
})

it.each([
  [null, /invalid labels null; using defaults/],
  [[], /invalid labels array; using defaults/],
  [{ next: 42 }, /invalid labels\.next 42; using "Next page"/],
])(
  'malformed label dictionary %j renders the defaults and is reported',
  async (labels, message) => {
    await expectDevError(
      () => render({ labels }),
      new RegExp(`^Face UI Pagination: ${message.source}\\.$`),
    )
    for (const name of ['Previous page', 'Next page'])
      expect(host.querySelector(`button[aria-label="${name}"]`)).not.toBeNull()
  },
)

it.each([
  ['Page', 'Page 1'],
  ['{page} / {page}', '1 / 1'],
  ['№{page}', '№1'],
])(
  'labels.page %j names page 1 %j: every {page} is replaced, a template without one gets the number appended',
  async (page, name) => {
    await render({ total: 10, labels: { page } })
    expect(
      host.querySelector('.uf-pagination-page')?.getAttribute('aria-label'),
    ).toBe(name)
  },
)

it('labels.choosePage names the picker button and titles its dialog', async () => {
  await render({ labels: { choosePage: 'Выбор страницы' } })
  expect(
    host.querySelector('.uf-pagination-more')?.getAttribute('aria-label'),
  ).toBe('Выбор страницы')
  expect(
    document.querySelector('.uf-pagination-pagePicker .uf-modal-title')
      ?.textContent,
  ).toBe('Выбор страницы')
})

it.each([undefined, 'Закрыть', ' '])(
  'Modal closeLabel=%s names its actual close control',
  async (closeLabel) => {
    const change = vi.fn()
    await act(async () =>
      root.render(
        <Modal open title="Pages" closeLabel={closeLabel} onOpenChange={change}>
          Body
        </Modal>,
      ),
    )
    const close = document.querySelector<HTMLButtonElement>(
      '.uf-modal-closeButton',
    )!
    const expected = closeLabel?.trim() || 'Close modal'
    expect(close.getAttribute('aria-label')).toBe(expected)
    expect(close.title).toBe(expected)
    await act(async () => close.click())
    expect(change).toHaveBeenCalledExactlyOnceWith({ open: false })
  },
)

it('Modal keeps its default close name for a non-string close label and reports it', async () => {
  await expectDevError(
    () =>
      act(async () =>
        root.render(<Modal open title="Pages" closeLabel={false as never} />),
      ),
    /^Face UI Modal: invalid closeLabel false; using "Close modal"\.$/,
  )
  expect(
    document
      .querySelector('.uf-modal-closeButton')
      ?.getAttribute('aria-label'),
  ).toBe('Close modal')
})

describe('component smoke', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;({ host: container, root } = mount())
  })

  it('Pagination changes page in uncontrolled mode', async () => {
    await act(async () => {
      root.render(<Pagination total={100} defaultPage={1} />)
    })

    const nextButton = container.querySelector(
      '[data-part="next"]',
    ) as HTMLButtonElement | null
    const currentPage = container.querySelector(
      '.uf-pagination-page[aria-current="page"]',
    ) as HTMLElement | null
    const pagePicker = document.querySelector('.uf-pagination-pagePicker')
    const pagePickerInput = pagePicker?.querySelector(
      'input[type="number"]',
    ) as HTMLInputElement | null
    expect(nextButton).not.toBeNull()
    expect(nextButton?.closest('.uf-membrane')).not.toBeNull()
    expect(currentPage?.textContent).toBe('1')
    expect(container.querySelectorAll('.uf-pagination-page')).toHaveLength(6)
    expect(
      container.querySelector('.uf-pagination-ellipsis')?.textContent,
    ).toBe('…')
    expect(pagePicker).not.toBeNull()
    expect(pagePickerInput).not.toBeNull()
    expect(pagePickerInput?.max).toBe('10')

    await act(async () => {
      nextButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const nextCurrentPage = container.querySelector(
      '.uf-pagination-page[aria-current="page"]',
    ) as HTMLElement | null
    expect(nextCurrentPage?.textContent).toBe('2')
    expect(nextCurrentPage?.getAttribute('aria-current')).toBe('page')
  })
})

const picker = () =>
  document.querySelector<HTMLElement>('[role="dialog"]:not([hidden])')
const press = (name: string, scope: ParentNode = host) =>
  act(async () =>
    [...scope.querySelectorAll<HTMLButtonElement>('button')]
      .find((node) => (node.getAttribute('aria-label') ?? node.textContent) === name)!
      .click(),
  )

it('capture cancellation reaches the portaled picker: opening, Enter and close', async () => {
  const change = vi.fn(),
    cancel = (event: Event) => event.preventDefault()
  await render({ onPageChange: change, onClickCapture: cancel })
  await press('Choose page')
  expect(picker()).toBeNull()
  await render({ onPageChange: change })
  await press('Choose page')
  const input = picker()!.querySelector<HTMLInputElement>('input')!
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, '9')
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await render({ onPageChange: change, onClickCapture: cancel, onKeyDownCapture: cancel })
  await act(async () =>
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
    ),
  )
  await press('Close', picker()!)
  expect(picker()).not.toBeNull()
  expect(change).not.toHaveBeenCalled()
  await render({ onPageChange: change })
  await press('Close', picker()!)
  expect(picker()).toBeNull()
})

it('native hidden closes the portaled picker and does not reopen it on reveal', async () => {
  await render()
  await press('Choose page')
  expect(picker()).not.toBeNull()
  await render({ hidden: true })
  expect(host.querySelector('nav')!.hidden).toBe(true)
  expect(picker()).toBeNull()
  await render({ hidden: false })
  expect(picker()).toBeNull()
})

it('a refused picker proposal keeps the page and reopens with the actual page', async () => {
  const change = vi.fn()
  const input = () => picker()!.querySelector<HTMLInputElement>('input')!
  await render({ page: 3, onPageChange: change })
  await press('Choose page')
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input(), '9')
    input().dispatchEvent(new Event('input', { bubbles: true }))
  })
  await press('Go to page', picker()!)
  expect(current()).toBe(3)
  expect(change).toHaveBeenCalledExactlyOnceWith({ page: 9 })
  expect(picker()).toBeNull()
  await press('Choose page')
  expect(input().value).toBe('3')
})

it('an IME confirmation Enter does not submit the page picker', async () => {
  const change = vi.fn()
  const input = () => picker()!.querySelector<HTMLInputElement>('input')!
  const enter = (isComposing: boolean) =>
    act(async () =>
      input().dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', isComposing, bubbles: true, cancelable: true }),
      ),
    )
  await render({ onPageChange: change })
  await press('Choose page')
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input(), '9')
    input().dispatchEvent(new Event('input', { bubbles: true }))
  })
  await enter(true)
  expect(picker()).not.toBeNull()
  expect(change).not.toHaveBeenCalled()
  await enter(false)
  expect(current()).toBe(9)
  expect(change).toHaveBeenCalledExactlyOnceWith({ page: 9 })
})

describeControlled({
  name: 'Pagination',
  prop: 'page',
  values: [2, 3],
  render: (props) => <Pagination total={100} {...props} />,
  change: (host, to) =>
    host
      .querySelector<HTMLButtonElement>(`.uf-pagination-page[data-page="${to}"]`)!
      .click(),
  read: (host) =>
    Number(host.querySelector('.uf-pagination-page[aria-current="page"]')!.textContent),
  normalizes: [99, 10],
  handler: 'onClick',
})
