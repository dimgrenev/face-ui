/**
 * Breadcrumb — navigation trail showing the current location in a hierarchy.
 *
 * `<Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Docs', href: '/docs' }, { label: 'API' }]} />`
 */

import { forwardRef, type ReactNode } from 'react'
import { createAnatomy } from '../assets/anatomy'
import { cn } from '../assets/utils'
import { Button } from '../Button/Button'
import { Menu } from '../Menu/Menu'

// ---------------------------------------------------------------------------
// Anatomy
// ---------------------------------------------------------------------------

export const breadcrumbAnatomy = createAnatomy('breadcrumb').parts(
  'root',
  'list',
  'item',
  'link',
  'separator',
  'current',
)

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BreadcrumbItem {
  /** Display text or node. */
  label: ReactNode
  /** Link destination. If omitted, item is rendered as text (typically the last/current item). */
  href?: string
  /** Click handler for programmatic navigation. */
  onClick?: () => void
}

export interface BreadcrumbProps {
  /** Breadcrumb entries, from root to current page. */
  items: BreadcrumbItem[]
  /** Custom separator between items. Defaults to "/". */
  separator?: ReactNode
  /** Wrap breadcrumb options (link/current) with membrane spacing. */
  membrane?: boolean
  /** Allow real browser navigation on link click. Defaults to false for sandbox/demo safety. */
  allowNavigation?: boolean
  /** Additional class name on the root element. */
  className?: string
  /** Collapse middle crumbs after this many visible entries. */
  collapseAfter?: number
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const Breadcrumb = forwardRef<HTMLElement, BreadcrumbProps>(
  function Breadcrumb(props, ref) {
    const {
      items: rawItems,
      separator = '/',
      membrane = true,
      allowNavigation = false,
      className,
      collapseAfter = 4,
    } = props

    const items = Array.isArray(rawItems) ? rawItems : []
    const shouldCollapse = collapseAfter >= 3 && items.length > collapseAfter
    const overflowItems = shouldCollapse
      ? items.slice(1, Math.max(1, items.length - (collapseAfter - 2)))
      : []
    const visibleItems = shouldCollapse
      ? [items[0], { label: 'More', __overflow: true } as BreadcrumbItem & { __overflow: true }, ...items.slice(-(collapseAfter - 2))]
      : items
    const defaultSeparatorNode = (
      <svg
        className="uf-breadcrumb-separatorSvg"
        viewBox="0 0 8 24"
        width="8"
        height="18"
        aria-hidden="true"
        focusable="false"
      >
        <path
          d="M2 22L6 2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )

    return (
      <nav
        ref={ref}
        {...breadcrumbAnatomy.getPartAttrs('root')}
        aria-label="Breadcrumb"
        className={cn('uf-breadcrumb', className)}
      >
        <ol {...breadcrumbAnatomy.getPartAttrs('list')}>
          {visibleItems.map((item, index) => {
            const isOverflow = '__overflow' in item
            const isLast = index === visibleItems.length - 1
            const isDefaultSlash = separator === '/'
            const handleItemClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
              // In playground/sandbox mode we keep clicks inside preview.
              // Set allowNavigation=true to restore native anchor navigation.
              if (!allowNavigation || item.onClick) {
                e.preventDefault()
              }
              item.onClick?.()
            }

            return (
              <li
                key={index}
                {...breadcrumbAnatomy.getPartAttrs('item')}
              >
                <>
                  {membrane ? (
                    isOverflow ? (
                      <Menu
                        items={overflowItems.map((overflowItem, overflowIndex) => ({
                          value: String(overflowIndex),
                          label: overflowItem.label,
                        }))}
                        surfaceTitle="Path"
                        onSelect={({ value }) => {
                          const overflowItem = overflowItems[Number(value)]
                          overflowItem?.onClick?.()
                          if (overflowItem?.href && typeof window !== 'undefined' && allowNavigation) {
                            window.location.assign(overflowItem.href)
                          }
                        }}
                      >
                        <Button
                          icon="more"
                          iconOnly
                          fullWidth={false}
                          membrane
                          variant="default"
                          className="uf-breadcrumb-overflow"
                          aria-label="Show path"
                        />
                      </Menu>
                    ) : (
                      <span className="uf-membrane">
                        <a
                          {...(isLast ? breadcrumbAnatomy.getPartAttrs('current') : breadcrumbAnatomy.getPartAttrs('link'))}
                          aria-current={isLast ? 'page' : undefined}
                          href={item.href ?? '#'}
                          onClick={handleItemClick}
                        >
                          {item.label}
                        </a>
                      </span>
                    )
                  ) : (
                    isOverflow ? (
                      <Menu
                        items={overflowItems.map((overflowItem, overflowIndex) => ({
                          value: String(overflowIndex),
                          label: overflowItem.label,
                        }))}
                        surfaceTitle="Path"
                        onSelect={({ value }) => {
                          const overflowItem = overflowItems[Number(value)]
                          overflowItem?.onClick?.()
                          if (overflowItem?.href && typeof window !== 'undefined' && allowNavigation) {
                            window.location.assign(overflowItem.href)
                          }
                        }}
                      >
                        <Button
                          icon="more"
                          iconOnly
                          fullWidth={false}
                          membrane={false}
                          variant="default"
                          className="uf-breadcrumb-overflow"
                          aria-label="Show path"
                        />
                      </Menu>
                    ) : (
                      <a
                        {...(isLast ? breadcrumbAnatomy.getPartAttrs('current') : breadcrumbAnatomy.getPartAttrs('link'))}
                        aria-current={isLast ? 'page' : undefined}
                        href={item.href ?? '#'}
                        onClick={handleItemClick}
                      >
                        {item.label}
                      </a>
                    )
                  )}
                  {!isLast && (
                    <span
                      {...breadcrumbAnatomy.getPartAttrs('separator')}
                      className={cn('uf-breadcrumb-separator', isDefaultSlash && 'uf-breadcrumb-separator--slash')}
                      aria-hidden="true"
                    >
                      {isDefaultSlash ? defaultSeparatorNode : separator}
                    </span>
                  )}
                </>
              </li>
            )
          })}
        </ol>
      </nav>
    )
  },
)
