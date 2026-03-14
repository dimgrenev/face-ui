/**
 * Toc — table of contents navigation.
 *
 * Renders a list of section links with active-item tracking and
 * an optional animated indicator line (matching the reference library).
 *
 * `<Toc items={[{ id: 'intro', label: 'Introduction' }]} activeId="intro" />`
 * `<Toc items={items} withLine lineSide="left" />`
 * `<Toc items={items} defaultActiveId="setup" />`
 */

import { forwardRef, useRef, useEffect } from 'react'
import { useMachine } from '../assets/adapters/react/use-machine'
import { useControllableMachineProp } from '../assets/adapters/react/use-controllable-machine-prop'
import { tocMachine, connectToc } from '../assets/machines/toc.machine'
import type { TocItem } from '../assets/machines/toc.machine'
import { cn } from '../assets/utils'
import { Button } from '../Button/Button'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type { TocItem }

export interface TocProps {
  /** Section items to render. */
  items: TocItem[]
  /** Currently active section id (controlled). */
  activeId?: string
  /** Initial active section id (uncontrolled). Falls back to first item. */
  defaultActiveId?: string
  /** Show the active indicator line + baseline rail. */
  withLine?: boolean
  /** Side of the indicator/rail. */
  lineSide?: 'left' | 'right'
  /** Callback when the active section changes. */
  onActiveChange?: (details: { id: string }) => void
  /** Additional class name on the root element. */
  className?: string
}

interface TocLegacyProps {
  onChange?: (id: string) => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const Toc = forwardRef<HTMLElement, TocProps>(
  function Toc(props, ref) {
    const legacyProps = props as TocProps & TocLegacyProps
    const {
      items: rawItems,
      activeId,
      defaultActiveId,
      withLine = true,
      lineSide = 'left',
      onActiveChange,
      className,
    } = props

    const items = Array.isArray(rawItems) ? rawItems : []

    const resolvedActiveId = useControllableMachineProp(
      activeId,
      defaultActiveId ?? items[0]?.id ?? '',
    )

    const { state, send } = useMachine(tocMachine, {
      items,
      activeId: resolvedActiveId,
      onActiveChange: ((details: { id: string }) => {
        try { onActiveChange?.(details) } catch {}
        try { legacyProps.onChange?.(details.id) } catch {}
      }) as any,
    })

    const api = connectToc(state, send)
    const listRef = useRef<HTMLDivElement>(null)
    const indicatorRef = useRef<HTMLDivElement>(null)

    // Animate indicator to the active item's position
    useEffect(() => {
      if (!withLine) return
      if (!listRef.current || !indicatorRef.current) return

      const currentId = state.context.activeId
      if (!currentId) return

      const rows = listRef.current.querySelectorAll<HTMLElement>('.uf-toc-item[data-active]')
      let target: HTMLElement | null = null
      rows.forEach((row) => {
        if (row.getAttribute('data-active') != null) target = row
      })

      if (!target) return

      const { offsetTop, offsetHeight } = target
      indicatorRef.current.style.transform = `translateY(${offsetTop}px)`
      indicatorRef.current.style.height = `${offsetHeight}px`
    }, [state.context.activeId, items, withLine])

    return (
      <nav
        ref={ref}
        {...api.getRootProps()}
        data-with-line={withLine || undefined}
        data-line-side={withLine ? lineSide : undefined}
        className={cn('uf-toc', className)}
      >
        <div className="uf-toc-list" ref={listRef}>
          {items.map((item) => (
            <div className="uf-toc-slot" key={item.id}>
              <Button
                {...(() => {
                  const p = { ...(api.getItemProps({ id: item.id, disabled: item.disabled }) as any) }
                  delete p['data-scope']
                  return p
                })()}
                className="uf-toc-item"
                align="left"
                stretchText
                level={Math.max(0, (item.level ?? 1) - 1)}
                membrane
                variant="default"
              >
                {item.label}
              </Button>
            </div>
          ))}
          {withLine && <div className="uf-toc-indicator" ref={indicatorRef} />}
        </div>
      </nav>
    )
  },
)
