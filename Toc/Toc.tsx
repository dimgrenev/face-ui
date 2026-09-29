/** Toc — a table of contents: native links to the sections of the current document. */
import {
  forwardRef,
  useEffect,
  useRef,
  type CSSProperties,
  type HTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from 'react'
import { cn } from '../assets/utils'
import { Membrane } from '../assets/adapters/react/Membrane'
import { composeHandlers } from '../assets/adapters/react/merge-props'
import { useControllableState } from '../assets/adapters/react/use-controllable-state'
import { useEventCallback } from '../assets/adapters/react/use-event-callback'
import { useIsomorphicLayoutEffect } from '../assets/adapters/react/use-isomorphic-layout-effect'
import { readFlatCollection } from '../assets/internal/flat-collection'
import type { Entry } from '../assets/runtime/collection'
import { readNumber } from '../assets/runtime/props'

export interface TocItem {
  /** Id of the section's element: the entry links to `#value`. A link, not a button: the browser scrolls, sets the hash and opens it in a new tab. */
  value: string
  /** Visible text of the entry, usually the section heading. */
  label: ReactNode
  /** Outline depth, an integer from 1: the entry nests under the previous entry of a smaller level. */
  level?: number
}

export interface TocProps extends Omit<
  HTMLAttributes<HTMLElement>,
  | 'children'
  | 'dangerouslySetInnerHTML'
  | 'defaultValue'
  | 'defaultChecked'
  | 'onSelect'
  | 'autoFocus'
  | 'contentEditable'
  | 'suppressContentEditableWarning'
> {
  /** Entries in document order; an empty list renders nothing. Groups and separators are dropped with a report. */
  items?: readonly TocItem[]
  /** Controlled current entry, marked `aria-current="location"`; `null` or a value missing from `items` marks none. */
  value?: string | null
  /** Uncontrolled current entry on mount, read once; by default no entry is current. */
  defaultValue?: string | null
  /** Called once when following an entry makes it current; `value` updates from the parent never call it. */
  onValueChange?: (details: { value: string }) => void
  /** Called each time an entry is followed in this document, the current one included; `event` is the click, whose `preventDefault()` stops only the jump. */
  onSelect?: (details: { value: string; event: MouseEvent<HTMLElement> }) => void
  /** Rail with a marker at the current entry, at the inline start or end of the list; `none` removes both. */
  line?: 'start' | 'end' | 'none'
  /** Additional class name on the root nav. */
  className?: string
}

/** Landmark name until a native aria-label or aria-labelledby names the nav (K14). */
const defaultRootLabels = Object.freeze({ nav: 'Table of contents' })

interface Branch {
  entry: Entry<TocItem>
  level: number
  children: Branch[]
}

/** Nests each entry under the closest earlier entry of a smaller level. */
function outlineOf(entries: readonly Entry<TocItem>[]): Branch[] {
  const outline: Branch[] = []
  const open: Branch[] = []
  entries.forEach((entry, index) => {
    const level = readNumber('Toc', `items[${index}].level`, entry.item.level, 1, {
      integer: true,
      min: 1,
    })
    while (open.length && open[open.length - 1]!.level >= level) open.pop()
    const branch: Branch = { entry, level, children: [] }
    ;(open[open.length - 1]?.children ?? outline).push(branch)
    open.push(branch)
  })
  return outline
}

/** A modified or non-primary click opens the link elsewhere; this document does not move. */
const followsHere = (event: MouseEvent) =>
  event.button === 0 &&
  !event.metaKey &&
  !event.ctrlKey &&
  !event.shiftKey &&
  !event.altKey

/** A table of contents: native links to the sections of this document, nested by level, with the current one marked. */
export const Toc = forwardRef<HTMLElement, TocProps>(function Toc(props, ref) {
  const {
    items,
    value,
    defaultValue = null,
    onValueChange,
    onSelect,
    line = 'start',
    className,
    onClick,
    ...rest
  } = props
  const entries = readFlatCollection<TocItem>(items, {
    component: 'Toc',
    key: (item) => item.value,
    disabled: () => false,
  }).entries
  const [stored, setValue] = useControllableState<string | null>({
    value,
    defaultValue,
    onChange: (next) => {
      if (next !== null) onValueChange?.({ value: next })
    },
    name: ['Toc', 'value'],
  })
  const current = entries.some((entry) => entry.key === stored) ? stored : null

  const select = (event: MouseEvent<HTMLElement>) => {
    const link = (event.target as Element).closest?.('a[data-scope="toc"][data-part="link"]')
    if (
      !link ||
      event.defaultPrevented ||
      !followsHere(event) ||
      link.closest('[data-scope="toc"][data-part="root"]') !== event.currentTarget
    )
      return
    const next = link.getAttribute('data-value')!
    setValue(next)
    onSelect?.({ value: next, event })
  }

  // The marker is the list's ::after, moved by custom properties. It slides only between placed
  // positions ("moving"); a newly shown marker ("placed") appears at its entry, in WebKit too.
  const listRef = useRef<HTMLUListElement>(null)
  const place = useEventCallback(() => {
    const list = listRef.current
    if (!list) return
    const link = list.querySelector<HTMLElement>('[data-part="link"][aria-current]')
    // No current entry, or a hidden Toc: the marker shows again, unmoved, where it is next placed.
    if (!link?.offsetHeight) return void list.removeAttribute('data-indicator')
    let top = 0
    for (
      let node: HTMLElement | null = link;
      node && node !== list;
      node = node.offsetParent as HTMLElement | null
    )
      top += node.offsetTop
    const box = Object.entries({
      '--uf-toc-indicator-y': `${top}px`,
      '--uf-toc-indicator-h': `${link.offsetHeight}px`,
    })
    const shown = list.hasAttribute('data-indicator')
    if (shown && box.every(([name, px]) => list.style.getPropertyValue(name) === px)) return
    for (const [name, px] of box) list.style.setProperty(name, px)
    list.setAttribute('data-indicator', shown ? 'moving' : 'placed')
  })
  useIsomorphicLayoutEffect(() => place())
  const listed = entries.length > 0
  // Wrapping labels move the entries without a render: a narrower sidebar, a late web font.
  useEffect(() => {
    const list = listRef.current
    if (!list || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => place())
    observer.observe(list)
    return () => observer.disconnect()
  }, [listed, place])

  if (!listed) return null

  const renderList = (branches: readonly Branch[], depth: number) => (
    <ul
      ref={depth === 0 ? listRef : undefined}
      data-scope="toc"
      data-part="list"
      // WebKit drops list semantics under list-style: none.
      role="list"
      className="uf-toc-list"
    >
      {branches.map(({ entry: { key, item }, children }) => (
        <li key={key} data-scope="toc" data-part="item" className="uf-toc-item">
          <Membrane fullWidth interactive>
            <a
              data-scope="toc"
              data-part="link"
              data-value={key}
              href={`#${key}`}
              // WebKit leaves links out of the Tab order by default; entries are the landmark's controls.
              tabIndex={0}
              aria-current={key === current ? 'location' : undefined}
              className="uf-toc-link uf-option uf-control"
              style={depth ? ({ '--uf-toc-depth': depth } as CSSProperties) : undefined}
            >
              <span className="uf-toc-label">{item.label}</span>
            </a>
          </Membrane>
          {children.length > 0 && renderList(children, depth + 1)}
        </li>
      ))}
    </ul>
  )

  return (
    <nav
      aria-label={defaultRootLabels.nav}
      {...rest}
      ref={ref}
      data-scope="toc"
      data-part="root"
      data-line={line}
      className={cn('uf-toc', className)}
      onClick={composeHandlers(onClick, select)}
    >
      {renderList(outlineOf(entries), 0)}
    </nav>
  )
})
