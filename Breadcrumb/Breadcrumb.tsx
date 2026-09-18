/** Breadcrumb — a navigation trail from the root to the current location. */
import {
  forwardRef,
  useEffect,
  useState,
  useRef,
  type HTMLAttributes,
  type MouseEvent,
  type MouseEventHandler,
  type ReactNode,
} from 'react'
import { createAnatomy } from '../assets/anatomy'
import { cn } from '../assets/utils'
import { Button } from '../Button/Button'
import { Icon } from '../Icon/Icon'
import { Popover } from '../Popover/Popover'
import { Membrane } from '../assets/adapters/react/Membrane'
import { hasSlotContent } from '../assets/slot-content'
import { resolveLabel } from '../assets/runtime/labels'

export const breadcrumbAnatomy = createAnatomy('breadcrumb').parts(
  'root',
  'list',
  'item',
  'link',
  'action',
  'label',
  'separator',
  'current',
)

export interface BreadcrumbItem {
  /** Nonempty, noninteractive content naming this location. */
  label: ReactNode
  /** Real link destination. Without href, render an action when onClick exists, otherwise text. */
  href?: string
  /** Native activation event. Call preventDefault when a router handles the link. */
  onClick?: MouseEventHandler<HTMLAnchorElement | HTMLButtonElement>
  /** Stable, unique identity for dynamic items; defaults to the original array index. */
  key?: string | number
}

export interface BreadcrumbProps extends Omit<
  HTMLAttributes<HTMLElement>,
  | 'children'
  | 'dangerouslySetInnerHTML'
  | 'defaultValue'
  | 'defaultChecked'
  | 'autoFocus'
  | 'contentEditable'
  | 'suppressContentEditableWarning'
> {
  /** Ordered locations from root to current; the last item is current. */
  items?: readonly BreadcrumbItem[]
  /** Decorative separator. '/' uses the slash icon; empty content removes the separator. */
  separator?: ReactNode
  /** Membrane spacing around inline items and the overflow trigger. */
  membrane?: boolean
  /** Maximum visible positions, including overflow: integer >=3; null shows all. Defaults to 4. */
  maxItems?: number | null
  /** Accessible name of the overflow button and its list dialog. Empty text uses the default. */
  overflowLabel?: string
  /** Additional class name on the root nav. */
  className?: string
}

function readItems(value: BreadcrumbProps['items']): readonly BreadcrumbItem[] {
  if (value === undefined) return []
  if (!Array.isArray(value))
    throw new TypeError('Breadcrumb items must be an array')
  const keys = new Set<string>()
  for (const item of value) {
    if (
      !item ||
      typeof item !== 'object' ||
      !hasSlotContent(item.label) ||
      (typeof item.label === 'string' && !item.label.trim())
    )
      throw new TypeError('Breadcrumb item labels must contain content')
    if (item.href !== undefined && typeof item.href !== 'string')
      throw new TypeError('Breadcrumb item href must be a string')
    if (item.onClick !== undefined && typeof item.onClick !== 'function')
      throw new TypeError('Breadcrumb item onClick must be a function')
    if (item.key !== undefined) {
      if (
        typeof item.key !== 'string' &&
        (typeof item.key !== 'number' || !Number.isFinite(item.key))
      )
        throw new TypeError(
          'Breadcrumb item key must be a string or finite number',
        )
      const key = String(item.key)
      if (keys.has(key))
        throw new TypeError('Breadcrumb item keys must be unique')
      keys.add(key)
    }
  }
  return value
}

export const Breadcrumb = forwardRef<HTMLElement, BreadcrumbProps>(
  function Breadcrumb(props, ref) {
    const {
      items: rawItems,
      separator = '/',
      membrane = true,
      maxItems = 4,
      overflowLabel,
      className,
      hidden,
      ...rest
    } = props
    const items = readItems(rawItems)
    if (maxItems !== null && (!Number.isSafeInteger(maxItems) || maxItems < 3))
      throw new RangeError('Breadcrumb maxItems must be an integer >=3 or null')
    const resolvedOverflowLabel = resolveLabel(
      overflowLabel,
      'Show path',
      'Breadcrumb overflowLabel',
    )
    const shouldCollapse = maxItems !== null && items.length > maxItems
    const tailStart = shouldCollapse ? items.length - (maxItems! - 2) : 1
    const [overflowOpen, setOverflowOpen] = useState(false)
    useEffect(() => {
      if (hidden || !shouldCollapse) setOverflowOpen(false)
    }, [hidden, shouldCollapse])

    const overflowTrigger = useRef<HTMLButtonElement>(null)
    const inlineNodes = useRef(new Map<string, HTMLElement>())
    const focusedCrumb = useRef<{ key: string; element: HTMLElement } | null>(
      null,
    )
    useEffect(() => {
      const previous = focusedCrumb.current
      if (hidden) {
        focusedCrumb.current = null
        return
      }
      if (
        !previous ||
        (previous.element.isConnected && !previous.element.closest('[hidden]'))
      )
        return
      const active = previous.element.ownerDocument.activeElement
      if (
        active !== previous.element.ownerDocument.body &&
        active !== previous.element &&
        !previous.element.contains(active)
      )
        return
      const isFocusable = (
        node: HTMLElement | undefined,
      ): node is HTMLElement =>
        !!node?.isConnected &&
        node.tabIndex >= 0 &&
        !node.closest('[hidden], [inert]')
      const same = inlineNodes.current.get(previous.key)
      const target = isFocusable(same)
        ? same
        : (overflowTrigger.current ??
          [...inlineNodes.current.values()].find(isFocusable))
      focusedCrumb.current = null
      target?.focus({ preventScroll: true })
    })

    if (!items.length) return null

    const renderCrumb = (
      item: BreadcrumbItem,
      index: number,
      overflow = false,
    ) => {
      const current = index === items.length - 1
      const isLink = item.href !== undefined
      const interactive = isLink || !!item.onClick
      const attrs = {
        ...breadcrumbAnatomy.getPartAttrs(
          current
            ? 'current'
            : isLink
              ? 'link'
              : interactive
                ? 'action'
                : 'label',
        ),
        'aria-current': current ? ('page' as const) : undefined,
        className: cn('uf-breadcrumb-label', interactive && 'uf-control'),
        tabIndex: interactive ? 0 : undefined,
        ref: (node: HTMLElement | null) => {
          if (overflow) return
          const key = itemKey(item, index)
          if (node) inlineNodes.current.set(key, node)
          else inlineNodes.current.delete(key)
        },
        onFocus: (event: React.FocusEvent<HTMLElement>) => {
          focusedCrumb.current = {
            key: itemKey(item, index),
            element: event.currentTarget,
          }
        },
      }
      const onClick = (
        event: MouseEvent<HTMLAnchorElement | HTMLButtonElement>,
      ) => {
        if (event.defaultPrevented) return
        item.onClick?.(event)
        if (
          overflow &&
          !event.ctrlKey &&
          !event.metaKey &&
          !event.shiftKey &&
          !event.altKey
        )
          setOverflowOpen(false)
      }
      return (
        <Membrane enabled={overflow || membrane} interactive={interactive}>
          {isLink ? (
            <a {...attrs} href={item.href} onClick={onClick}>
              {item.label}
            </a>
          ) : interactive ? (
            <button {...attrs} type="button" tabIndex={0} onClick={onClick}>
              {item.label}
            </button>
          ) : (
            <span {...attrs}>{item.label}</span>
          )}
        </Membrane>
      )
    }
    const itemKey = (item: BreadcrumbItem, index: number) =>
      item.key === undefined ? `index:${index}` : `key:${item.key}`
    const renderSeparator = () =>
      hasSlotContent(separator) ? (
        <span
          {...breadcrumbAnatomy.getPartAttrs('separator')}
          className={cn(
            'uf-breadcrumb-separator',
            separator === '/' && 'uf-breadcrumb-separator--slash',
          )}
          aria-hidden="true"
        >
          {separator === '/' ? (
            <Icon name="slash" className="uf-breadcrumb-separatorSvg" />
          ) : (
            separator
          )}
        </span>
      ) : null

    return (
      <nav
        ref={ref}
        {...breadcrumbAnatomy.getPartAttrs('root')}
        aria-label="Breadcrumb"
        {...rest}
        hidden={hidden}
        className={cn('uf-breadcrumb', className)}
      >
        <ol {...breadcrumbAnatomy.getPartAttrs('list')}>
          {items.map((item, index) => {
            if (shouldCollapse && index > 0 && index < tailStart) {
              if (index !== 1) return null
              return (
                <li key="overflow" {...breadcrumbAnatomy.getPartAttrs('item')}>
                  <Popover
                    open={overflowOpen && !hidden}
                    onOpenChange={({ open }) => setOverflowOpen(open)}
                    side="bottom"
                    align="start"
                    className="uf-breadcrumb-popup"
                    aria-label={resolvedOverflowLabel}
                    dir={rest.dir}
                    lang={rest.lang}
                    content={
                      <ol className="uf-breadcrumb-overflowList">
                        {items.slice(1, tailStart).map((entry, offset) => (
                          <li key={itemKey(entry, offset + 1)}>
                            {renderCrumb(entry, offset + 1, true)}
                          </li>
                        ))}
                      </ol>
                    }
                  >
                    <Button
                      icon="more"
                      iconOnly
                      fullWidth={false}
                      membrane={membrane}
                      variant="ghost"
                      tabIndex={0}
                      ref={overflowTrigger}
                      className="uf-breadcrumb-overflow"
                      aria-label={resolvedOverflowLabel}
                    />
                  </Popover>
                  {renderSeparator()}
                </li>
              )
            }
            return (
              <li
                key={itemKey(item, index)}
                {...breadcrumbAnatomy.getPartAttrs('item')}
              >
                {renderCrumb(item, index)}
                {index < items.length - 1 && renderSeparator()}
              </li>
            )
          })}
        </ol>
      </nav>
    )
  },
)
