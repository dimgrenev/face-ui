/**
 * Button — action component.
 *
 * Unifies: Button, ButtonGroup, Clipboard (copyText prop).
 * Per synthesize doc section 5: "Button + ButtonGroup + Clipboard"
 *
 * `<Button text="Save" />`
 * `<Button text="Copy" copyText={code} />`
 * `<Button icon="search" iconOnly />`
 */

import { forwardRef, useCallback, useRef, useState, type MutableRefObject, type ReactNode, type ButtonHTMLAttributes } from 'react'
import { createAnatomy } from '../assets/anatomy'
import { cn } from '../assets/utils'
import { Icon } from '../Icon/Icon'

// ---------------------------------------------------------------------------
// Anatomy
// ---------------------------------------------------------------------------

export const buttonAnatomy = createAnatomy('button').parts(
  'root', 'icon', 'text', 'group',
)

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ButtonVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'outline'
  | 'ghost'
  | 'destructive'
  | 'suggestion'

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Button label text. */
  text?: string
  /** Optional secondary text, rendered at the far right inside the text area. */
  rightText?: ReactNode
  /** Visual variant. */
  variant?: ButtonVariant | 'delete'
  /** Icon (string from registry, ReactNode, or SVG element). */
  icon?: ReactNode
  /** Icon position relative to text. */
  iconPosition?: 'left' | 'right'
  /** Icon-only mode (no text, square button). */
  iconOnly?: boolean
  /** Disabled state. */
  disabled?: boolean
  /** Loading state (shows spinner, dims text). */
  loading?: boolean
  /** Stretch text area (flex:1). */
  stretchText?: boolean
  /** Full width button. */
  fullWidth?: boolean
  /** Text alignment. */
  align?: 'left' | 'center' | 'right'
  /** Nesting level for option-like rows: 0..9 */
  level?: number
  /** Membrane spacing around the button. */
  membrane?: boolean
  /** Copy text to clipboard on click (Clipboard integration). */
  copyText?: string
  /** Callback when copy succeeds. */
  onCopied?: () => void
  /** Custom children (overrides text/icon rendering). */
  children?: ReactNode
}

export interface ButtonGroupProps {
  children: ReactNode
  orientation?: 'horizontal' | 'vertical'
  className?: string
}

// ---------------------------------------------------------------------------
// ButtonGroup
// ---------------------------------------------------------------------------

export const ButtonGroup = forwardRef<HTMLDivElement, ButtonGroupProps>(
  function ButtonGroup({ children, orientation = 'horizontal', className, ...rest }, ref) {
    return (
      <div
        ref={ref}
        role="group"
        {...buttonAnatomy.getPartAttrs('group')}
        data-orientation={orientation}
        className={cn('uf-button-group', className)}
        {...rest}
      >
        {children}
      </div>
    )
  },
)

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(rawProps, ref) {
    const props = rawProps
    const {
      text,
      rightText,
      variant: rawVariant = 'default',
      icon,
      iconPosition = 'left',
      iconOnly = false,
      disabled = false,
      loading = false,
      stretchText = false,
      fullWidth = true,
      align,
      level,
      membrane = true,
      copyText,
      onCopied,
      children,
      className,
      onClick,
      style,
      type = 'button',
      ...rest
    } = props

    const variant = rawVariant === 'delete' ? 'destructive' : rawVariant

    const clampedLevel = (level != null && Number.isFinite(Number(level)))
      ? Math.max(0, Math.min(9, Number(level)))
      : undefined

    const [copied, setCopied] = useState(false)
    const buttonRef = useRef<HTMLButtonElement | null>(null)

    const setRefs = useCallback((node: HTMLButtonElement | null) => {
      buttonRef.current = node
      if (typeof ref === 'function') ref(node)
      else if (ref) {
        ;(ref as MutableRefObject<HTMLButtonElement | null>).current = node
      }
    }, [ref])

    const handleClick = useCallback(
      async (e: React.MouseEvent<HTMLButtonElement>) => {
        if (copyText != null) {
          const canUseNavigatorClipboard =
            typeof window !== 'undefined' &&
            typeof navigator !== 'undefined' &&
            typeof navigator.clipboard?.writeText === 'function' &&
            window.isSecureContext &&
            window.top === window.self

          let didCopy = false

          if (canUseNavigatorClipboard) {
            try {
              await navigator.clipboard.writeText(copyText)
              didCopy = true
            } catch {
              didCopy = false
            }
          }

          if (!didCopy && typeof document !== 'undefined') {
            try {
              const el = document.createElement('textarea')
              el.value = copyText
              el.setAttribute('readonly', 'true')
              el.style.position = 'fixed'
              el.style.left = '-9999em'
              el.style.opacity = '0'
              document.body.appendChild(el)
              el.select()
              document.execCommand('copy')
              document.body.removeChild(el)
              didCopy = true
            } catch {
              didCopy = false
            }
          }

          if (didCopy) {
            setCopied(true)
            onCopied?.()
            setTimeout(() => setCopied(false), 3000)
          }
        }
        onClick?.(e)
      },
      [copyText, onCopied, onClick],
    )

    const resolvedIcon = typeof icon === 'string'
      ? <Icon name={icon} />
      : icon

    const hasIcon = resolvedIcon != null
    const hasText = text != null || children != null
    const isIconOnly = iconOnly || (hasIcon && !hasText)

    const levelStyle = clampedLevel != null
      ? { ...style, '--face-runtime-option-level': clampedLevel } as React.CSSProperties
      : style

    const buttonNode = (
      <button
        ref={setRefs}
        type={type}
        disabled={disabled || loading}
        aria-busy={loading ? true : undefined}
        {...buttonAnatomy.getPartAttrs('root')}
        data-variant={variant}
        data-icon-only={isIconOnly ? '' : undefined}
        data-stretch-text={stretchText ? '' : undefined}
        data-full-width={fullWidth ? '' : undefined}
        data-align={align}
        data-icon-left={hasIcon && !isIconOnly && iconPosition === 'left' ? '' : undefined}
        data-icon-right={hasIcon && !isIconOnly && iconPosition === 'right' ? '' : undefined}
        data-level={clampedLevel != null ? '' : undefined}
        data-loading={loading ? '' : undefined}
        data-copied={copied ? '' : undefined}
        data-membrane={membrane ? '' : undefined}
        className={cn('uf-button', 'uf-option', 'uf-control', className)}
        style={levelStyle}
        onClick={handleClick}
        {...rest}
      >
        {loading && (
          <span className="uf-button__spinner">
            <span className="uf-spinner uf-spinner--small" />
          </span>
        )}
        {hasIcon && !isIconOnly && iconPosition === 'left' && (
          <span {...buttonAnatomy.getPartAttrs('icon')} data-position="left">
            {resolvedIcon}
          </span>
        )}
        {hasIcon && isIconOnly && (
          <span {...buttonAnatomy.getPartAttrs('icon')} data-position="only">
            {resolvedIcon}
          </span>
        )}
        {hasText && !isIconOnly && (
          <span {...buttonAnatomy.getPartAttrs('text')}>
            {children ?? text}
            {rightText != null && (
              <span className="uf-button__rightText uf-text-body">
                {rightText}
              </span>
            )}
          </span>
        )}
        {hasIcon && !isIconOnly && iconPosition === 'right' && (
          <span {...buttonAnatomy.getPartAttrs('icon')} data-position="right">
            {resolvedIcon}
          </span>
        )}
      </button>
    )

    if (!membrane) return buttonNode

    return (
      <span
        className={cn('uf-membrane', fullWidth ? 'uf-membrane--full' : undefined)}
        data-membrane-hover=""
        data-membrane-interactive={disabled || loading ? undefined : ''}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return
          if (disabled || loading) return
          const button = buttonRef.current
          button?.focus()
          button?.click()
        }}
      >
        {buttonNode}
      </span>
    )
  },
)
