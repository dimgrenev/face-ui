import { forwardRef, type HTMLAttributes } from 'react'
import { cn } from '../../utils'

interface MembraneProps extends HTMLAttributes<HTMLElement> {
  as?: 'span' | 'div'
  /** Disable the spacing box without remounting its contents. */
  enabled?: boolean
  /** Only control membranes forward padding interactions. Containers are passive. */
  interactive?: boolean
  /** Explicit control inside a composed child; otherwise the direct child is used. */
  target?: string
  fullWidth?: boolean
  truncate?: boolean
}

/** One outer spacing boundary. It never adds a tab stop or intercepts child clicks. */
export const Membrane = forwardRef<HTMLElement, MembraneProps>(
  function Membrane(
    {
      as: Element = 'span',
      enabled = true,
      interactive = false,
      target,
      fullWidth,
      truncate,
      className,
      children,
      onClick,
      onPointerDown,
      onPointerOver,
      onPointerLeave,
      onPointerUp,
      onPointerCancel,
      ...rest
    },
    ref,
  ) {
    const resolveTarget = (wrapper: HTMLElement): HTMLElement | null => {
      if (!enabled || !interactive) return null
      let node = target
        ? wrapper.querySelector<HTMLElement>(target)
        : (wrapper.firstElementChild as HTMLElement | null)
      // A composed control may disable its own spacing. That transparent
      // boundary is not the activation target and must not consume focus.
      while (node?.matches('.uf-membrane[data-membrane-disabled]')) {
        node = node.firstElementChild as HTMLElement | null
      }
      if (
        !node ||
        !wrapper.contains(node) ||
        node.closest(
          '[inert], [disabled], [data-disabled], [aria-disabled="true"]',
        )
      )
        return null
      return node
    }

    return (
      <Element
        {...rest}
        ref={ref as React.Ref<HTMLDivElement>}
        className={cn(
          'uf-membrane',
          enabled && fullWidth && 'uf-membrane--full',
          enabled && truncate && 'uf-membrane--truncate',
          className,
        )}
        data-membrane-disabled={enabled ? undefined : ''}
        data-membrane-interactive={enabled && interactive ? '' : undefined}
        onPointerOver={(event) => {
          onPointerOver?.(event)
          const wrapper = event.currentTarget
          wrapper.toggleAttribute(
            'data-membrane-hover',
            event.target === wrapper && !!resolveTarget(wrapper),
          )
        }}
        onPointerLeave={(event) => {
          onPointerLeave?.(event)
          event.currentTarget.removeAttribute('data-membrane-hover')
          event.currentTarget.removeAttribute('data-membrane-pressed')
        }}
        onPointerDown={(event) => {
          onPointerDown?.(event)
          if (
            event.defaultPrevented ||
            event.button !== 0 ||
            event.target !== event.currentTarget
          )
            return
          const node = resolveTarget(event.currentTarget)
          if (!node) return
          event.currentTarget.setAttribute('data-membrane-pressed', '')
          node.focus({ preventScroll: true })
        }}
        onPointerUp={(event) => {
          onPointerUp?.(event)
          event.currentTarget.removeAttribute('data-membrane-pressed')
        }}
        onPointerCancel={(event) => {
          onPointerCancel?.(event)
          event.currentTarget.removeAttribute('data-membrane-pressed')
        }}
        onClick={(event) => {
          onClick?.(event)
          if (
            event.defaultPrevented ||
            event.button !== 0 ||
            event.target !== event.currentTarget
          )
            return
          const node = resolveTarget(event.currentTarget)
          if (!node) return
          // The forwarded event bubbles once from the actual control and keeps
          // modifiers, so delegated application handlers see the correct target.
          event.stopPropagation()
          event.preventDefault()
          node.focus({ preventScroll: true })
          const MouseEvent = node.ownerDocument.defaultView!.MouseEvent
          node.dispatchEvent(
            new MouseEvent('click', {
              bubbles: true,
              cancelable: true,
              composed: true,
              detail: event.detail,
              button: event.button,
              buttons: event.buttons,
              clientX: event.clientX,
              clientY: event.clientY,
              ctrlKey: event.ctrlKey,
              metaKey: event.metaKey,
              shiftKey: event.shiftKey,
              altKey: event.altKey,
            }),
          )
        }}
      >
        {children}
      </Element>
    )
  },
)
