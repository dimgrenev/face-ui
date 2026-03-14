/**
 * Overlay — floating content surface.
 *
 * Unifies: Tooltip + Popover + HoverCard into a single component.
 *
 * - trigger='hover'                -> tooltip (non-interactive, delay-based)
 * - trigger='click'                -> popover (interactive, toggle + dismiss)
 * - trigger='hover' + interactive  -> hovercard (hover-triggered, interactive content)
 */

import { forwardRef, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type MutableRefObject, type ReactNode, type HTMLAttributes } from 'react'
import { createPortal } from 'react-dom'
import { useMachine } from '../assets/adapters/react/use-machine'
import { overlayMachine, connectOverlay } from '../assets/machines/overlay.machine'
import type { OverlaySchema } from '../assets/machines/overlay.machine'
import { cn } from '../assets/utils'
import { Button } from '../Button/Button'
import { Text } from '../Text/Text'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OverlayProps extends Omit<HTMLAttributes<HTMLDivElement>, 'content'> {
  /** How the overlay is triggered. */
  trigger?: 'hover' | 'click'
  /** Whether content is interactive (keeps open on hover). */
  interactive?: boolean
  /** Content rendered inside the floating surface. */
  content?: ReactNode
  /** Trigger element (the anchor). */
  children?: ReactNode
  /** Controlled open state. */
  open?: boolean
  /** Delay before opening (ms). */
  openDelay?: number
  /** Delay before closing (ms). */
  closeDelay?: number
  /** Preferred side placement. */
  side?: 'top' | 'right' | 'bottom' | 'left'
  /** Alignment along the side. */
  align?: 'start' | 'center' | 'end'
  /** Offset from the trigger along the side axis (px). */
  sideOffset?: number
  /** Called when the open state changes. */
  onOpenChange?: (details: { open: boolean }) => void
  /** Additional class name for the content element. */
  className?: string
}

// ---------------------------------------------------------------------------
// Overlay
// ---------------------------------------------------------------------------

export const Overlay = forwardRef<HTMLDivElement, OverlayProps>(
  function Overlay(props, ref) {
    const {
      trigger = 'hover',
      interactive = false,
      content,
      children,
      open,
      openDelay,
      closeDelay,
      side = 'top',
      align = 'center',
      sideOffset = 8,
      onOpenChange,
      className,
      ...rest
    } = props

    const { state, send } = useMachine<OverlaySchema>(overlayMachine, {
      open,
      trigger,
      interactive,
      openDelay: openDelay ?? 200,
      closeDelay: closeDelay ?? 0,
      positioning: { side, align, sideOffset },
      onOpenChange: onOpenChange ?? null,
    })

    const api = connectOverlay(state, send)
    const isOpen = state.matches('open', 'closing')
    const triggerElRef = useRef<HTMLElement | null>(null)
    const contentElRef = useRef<HTMLDivElement | null>(null)
    const [contentStyle, setContentStyle] = useState<CSSProperties>({ position: 'fixed', top: -9999, left: -9999 })

    const triggerProps = api.getTriggerProps()
    const contentProps = api.getContentProps()
    const isPrimitiveTrigger = children == null || typeof children === 'string' || typeof children === 'number'

    const updateFloatingPosition = useCallback(() => {
      if (typeof window === 'undefined') return

      const triggerEl = triggerElRef.current
      const contentEl = contentElRef.current
      if (!triggerEl || !contentEl) return

      const triggerRect = triggerEl.getBoundingClientRect()
      const contentRect = contentEl.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const viewportInset = 8

      let top = triggerRect.bottom + sideOffset
      let left = triggerRect.left + (triggerRect.width - contentRect.width) / 2

      if (side === 'top') {
        top = triggerRect.top - contentRect.height - sideOffset
      } else if (side === 'left') {
        top = triggerRect.top + (triggerRect.height - contentRect.height) / 2
        left = triggerRect.left - contentRect.width - sideOffset
      } else if (side === 'right') {
        top = triggerRect.top + (triggerRect.height - contentRect.height) / 2
        left = triggerRect.right + sideOffset
      }

      if (side === 'top' || side === 'bottom') {
        if (align === 'start') left = triggerRect.left
        if (align === 'end') left = triggerRect.right - contentRect.width
      } else {
        if (align === 'start') top = triggerRect.top
        if (align === 'end') top = triggerRect.bottom - contentRect.height
      }

      top = Math.min(Math.max(viewportInset, top), Math.max(viewportInset, viewportHeight - contentRect.height - viewportInset))
      left = Math.min(Math.max(viewportInset, left), Math.max(viewportInset, viewportWidth - contentRect.width - viewportInset))

      setContentStyle({
        position: 'fixed',
        top: Math.round(top),
        left: Math.round(left),
      })
    }, [align, side, sideOffset])

    const handleContentRef = useCallback(
      (el: HTMLDivElement | null) => {
        contentElRef.current = el
        if (typeof ref === 'function') ref(el)
        else if (ref) (ref as MutableRefObject<HTMLDivElement | null>).current = el
        send({ type: 'SET_CONTENT', el } as OverlaySchema['event'])
      },
      [ref, send],
    )

    const handleTriggerRef = useCallback(
      (el: HTMLElement | null) => {
        triggerElRef.current = el
        send({ type: 'SET_TRIGGER', el } as OverlaySchema['event'])
      },
      [send],
    )

    useEffect(() => {
      if (!isOpen) return
      updateFloatingPosition()

      const rafId = window.requestAnimationFrame(updateFloatingPosition)
      const handleWindowChange = () => updateFloatingPosition()

      window.addEventListener('resize', handleWindowChange)
      window.addEventListener('scroll', handleWindowChange, true)

      return () => {
        window.cancelAnimationFrame(rafId)
        window.removeEventListener('resize', handleWindowChange)
        window.removeEventListener('scroll', handleWindowChange, true)
      }
    }, [isOpen, updateFloatingPosition])

    const rawContentNode = content ?? 'Tooltip text'
    const contentNode = (
      typeof rawContentNode === 'string' || typeof rawContentNode === 'number'
        ? (
            <Text as="div" fullWidth>
              {String(rawContentNode)}
            </Text>
          )
        : rawContentNode
    )

    const contentElement = (
      <div
        ref={handleContentRef}
        {...contentProps}
        data-trigger={trigger}
        className={cn('uf-overlay-content', className)}
        style={contentStyle}
        {...rest}
      >
        <div {...api.getArrowProps()} className={cn('uf-overlay-arrow')} />
        {contentNode}
      </div>
    )

    const renderedContent = useMemo(() => {
      if (typeof document === 'undefined') return contentElement
      return createPortal(contentElement, document.body)
    }, [contentElement])

    return (
      <>
        {isPrimitiveTrigger ? (
          <span
            {...triggerProps}
            ref={handleTriggerRef as any}
            className="uf-membrane uf-overlay-triggerMembrane"
            data-membrane-hover=""
            data-membrane-interactive=""
          >
            <Button
              text={children == null ? 'Hover me' : String(children)}
              fullWidth={false}
              membrane={false}
              className="uf-overlay-triggerButton"
            />
          </span>
        ) : (
          <span
            {...triggerProps}
            ref={handleTriggerRef}
            className={cn('uf-overlay-trigger')}
            style={{ display: 'inline-flex' }}
          >
            {children}
          </span>
        )}
        {renderedContent}
      </>
    )
  },
)
