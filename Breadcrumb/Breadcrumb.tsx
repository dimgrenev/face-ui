/** Breadcrumb — a navigation trail from the root to the current location. */
import {
  forwardRef,
  useRef,
  useState,
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
import { useComposedRefs } from '../assets/adapters/react/use-composed-refs'
import { useFocusRecovery } from '../assets/adapters/react/use-focus-recovery'
import { useIsomorphicLayoutEffect } from '../assets/adapters/react/use-isomorphic-layout-effect'
import { readCollection, type Entry } from '../assets/runtime/collection'
import { resolveLabels, type CommonLabels } from '../assets/runtime/labels'
import { isAvailable } from '../assets/runtime/layers'
import { readNumber } from '../assets/runtime/props'
import { hasSlotContent } from '../assets/slot-content'

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
  /** Noninteractive content naming this location. */
  label: ReactNode
  /** Link destination; without it an item with onClick renders a button, any other item plain text. */
  href?: string
  /** Native click handler of the item's link or button; call preventDefault when a router navigates. */
  onClick?: MouseEventHandler<HTMLAnchorElement | HTMLButtonElement>
  /** Stable identity that keeps the item's DOM across reorders; defaults to its position. */
  key?: string | number
}

export type BreadcrumbLabels = Pick<CommonLabels, 'more'>
const defaultLabels: BreadcrumbLabels = Object.freeze({ more: 'Show path' })
/** Landmark name until a native aria-label or aria-labelledby names the nav. */
const LANDMARK = 'Breadcrumb'

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
  /** Ordered locations from root to current; the last item is the current page. */
  items?: readonly BreadcrumbItem[]
  /** Decorative separator. '/' uses the slash icon; empty content removes the separator. */
  separator?: ReactNode
  /** Membrane spacing around inline items and the overflow trigger. */
  membrane?: boolean
  /** Visible positions including the overflow button, an integer from 3; null shows every item. */
  maxItems?: number | null
  /** Names of the component's own controls: `more` names the overflow button and its dialog. */
  labels?: Partial<BreadcrumbLabels>
  /** Additional class name on the root nav. */
  className?: string
}

/** Keys are strings; a finite number stands for its decimal text. */
const keyOf = ({ key }: BreadcrumbItem) =>
  typeof key === 'number' && Number.isFinite(key) ? String(key) : key
const modified = (event: MouseEvent) =>
  event.ctrlKey || event.metaKey || event.shiftKey || event.altKey
const focusable = (node: HTMLElement | null | undefined): node is HTMLElement =>
  !!node && node.tabIndex >= 0 && isAvailable(node)

/** A navigation trail whose middle collapses into an overflow list once it exceeds `maxItems`. */
export const Breadcrumb = forwardRef<HTMLElement, BreadcrumbProps>(
  function Breadcrumb(props, ref) {
    const {
      items,
      separator = '/',
      membrane = true,
      maxItems = 4,
      labels,
      className,
      hidden,
      ...rest
    } = props
    const { entries } = readCollection<BreadcrumbItem>(items, {
      component: 'Breadcrumb',
      positional: true,
      key: keyOf,
    })
    const limit =
      maxItems === null
        ? null
        : readNumber('Breadcrumb', 'maxItems', maxItems, 4, {
            integer: true,
            min: 3,
          })
    const { more } = resolveLabels(defaultLabels, labels, 'Breadcrumb')
    const collapse = limit !== null && entries.length > limit
    const tailStart = collapse ? entries.length - (limit - 2) : 1
    const [overflowOpen, setOverflowOpen] = useState(false)
    // The overflow list shows only while the trail collapses and is visible; it stays closed after.
    const open = overflowOpen && collapse && !hidden
    if (overflowOpen && !open) setOverflowOpen(false)

    const navRef = useRef<HTMLElement>(null)
    const composedRef = useComposedRefs(navRef, ref)
    const trigger = useRef<HTMLButtonElement>(null)
    /** Key of the overflow crumb holding focus; the list is portaled outside the nav. */
    const overflowFocus = useRef<string | null>(null)
    const fallback = (preferred?: HTMLElement) =>
      [
        preferred,
        trigger.current,
        ...(navRef.current?.querySelectorAll<HTMLElement>(
          '.uf-breadcrumb-label',
        ) ?? []),
      ].find(focusable)
    useFocusRecovery(navRef, () => fallback())
    // A trail that stops collapsing unmounts the overflow list; focus there returns to the same crumb.
    useIsomorphicLayoutEffect(() => {
      const key = overflowFocus.current
      if (open || key === null) return
      overflowFocus.current = null
      const nav = navRef.current
      const doc = nav?.ownerDocument
      if (!nav || !isAvailable(nav) || doc!.activeElement !== doc!.body) return
      const index = entries.findIndex((entry) => entry.key === key)
      const inline = nav.querySelectorAll<HTMLElement>('.uf-breadcrumb-label')
      fallback(inline[index])?.focus({ preventScroll: true })
    })
    const closeOverflow = () => {
      overflowFocus.current = null
      setOverflowOpen(false)
    }

    if (!entries.length) return null

    const renderCrumb = (
      { key, item }: Entry<BreadcrumbItem>,
      index: number,
      overflow = false,
    ) => {
      const current = index === entries.length - 1
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
        onFocus: overflow
          ? () => {
              overflowFocus.current = key
            }
          : undefined,
      }
      const onClick = (
        event: MouseEvent<HTMLAnchorElement | HTMLButtonElement>,
      ) => {
        if (event.defaultPrevented) return
        item.onClick?.(event)
        if (overflow && !modified(event)) closeOverflow()
      }
      return (
        <Membrane enabled={overflow || membrane} interactive={interactive}>
          {isLink ? (
            <a {...attrs} href={item.href} onClick={onClick}>
              {item.label}
            </a>
          ) : interactive ? (
            <button {...attrs} type="button" onClick={onClick}>
              {item.label}
            </button>
          ) : (
            <span {...attrs}>{item.label}</span>
          )}
        </Membrane>
      )
    }
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
        ref={composedRef}
        {...breadcrumbAnatomy.getPartAttrs('root')}
        aria-label={LANDMARK}
        {...rest}
        hidden={hidden}
        className={cn('uf-breadcrumb', className)}
      >
        <ol {...breadcrumbAnatomy.getPartAttrs('list')}>
          {entries.map((entry, index) => {
            if (collapse && index > 0 && index < tailStart) {
              if (index !== 1) return null
              return (
                <li key="overflow" {...breadcrumbAnatomy.getPartAttrs('item')}>
                  <Popover
                    open={open}
                    onOpenChange={({ open: next }) =>
                      next ? setOverflowOpen(true) : closeOverflow()
                    }
                    side="bottom"
                    align="start"
                    className="uf-breadcrumb-popup"
                    aria-label={more}
                    dir={rest.dir}
                    lang={rest.lang}
                    content={
                      <ol className="uf-breadcrumb-overflowList">
                        {entries.slice(1, tailStart).map((crumb, offset) => (
                          <li key={crumb.key}>
                            {renderCrumb(crumb, offset + 1, true)}
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
                      ref={trigger}
                      // WebKit leaves buttons without an explicit tabIndex out of the Tab order.
                      tabIndex={0}
                      className="uf-breadcrumb-overflow"
                      aria-label={more}
                    />
                  </Popover>
                  {renderSeparator()}
                </li>
              )
            }
            return (
              <li key={entry.key} {...breadcrumbAnatomy.getPartAttrs('item')}>
                {renderCrumb(entry, index)}
                {index < entries.length - 1 && renderSeparator()}
              </li>
            )
          })}
        </ol>
      </nav>
    )
  },
)
