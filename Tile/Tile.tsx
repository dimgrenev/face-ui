/**
 * Tile — interactive row with nested actions.
 *
 * A container that acts as a single clickable target (like a Notion sidebar tab)
 * while allowing nested Button actions (more, close, etc.) that fire independently.
 *
 * Architecture:
 *   <div role="button">          ← root: clickable surface
 *     <Icon /> <span>Label</span> ← content
 *     <div>                       ← actions slot (stopPropagation)
 *       <Button icon="more" />
 *       <Button icon="close" />
 *     </div>
 *   </div>
 *
 * Clicks on the root → `onClick`.
 * Clicks on nested buttons → their own handlers, root onClick does NOT fire.
 */

import {
  forwardRef,
  useCallback,
  useRef,
  type MutableRefObject,
  type ReactNode,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
} from 'react'
import { createAnatomy } from '../assets/anatomy'
import { cn } from '../assets/utils'
import { Text } from '../Text/Text'
import { Icon } from '../Icon/Icon'

// ---------------------------------------------------------------------------
// Anatomy
// ---------------------------------------------------------------------------

export const tileAnatomy = createAnatomy('tile').parts(
  'root', 'icon', 'text', 'actions',
)

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TileVariant =
  | 'default'
  | 'ghost'
  | 'accent'

export interface TileProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Primary label. */
  text?: string
  /** Optional secondary text at the far right of the label area. */
  rightText?: ReactNode
  /** Visual variant. */
  variant?: TileVariant
  /** Icon (string from registry or ReactNode). */
  icon?: ReactNode
  /** Icon position relative to text. */
  iconPosition?: 'left' | 'right'
  /** Disabled state. */
  disabled?: boolean
  /** Active / selected state. */
  active?: boolean
  /** Stretch text area (flex:1). */
  stretchText?: boolean
  /** Full width tile. */
  fullWidth?: boolean
  /** Text alignment. */
  align?: 'left' | 'center' | 'right'
  /** Nesting level for option-like rows: 0..9 */
  level?: number
  /** Membrane spacing around the tile. */
  membrane?: boolean
  /** Nested action buttons. Rendered at the far right; their clicks do not bubble to the tile. */
  actions?: ReactNode
  /** Custom children (overrides text/icon rendering). */
  children?: ReactNode
}

// ---------------------------------------------------------------------------
// Tile
// ---------------------------------------------------------------------------

export const Tile = forwardRef<HTMLDivElement, TileProps>(
  function Tile(props, ref) {
    const {
      text,
      rightText,
      variant = 'default',
      icon,
      iconPosition = 'left',
      disabled = false,
      active = false,
      stretchText = true,
      fullWidth = true,
      align = 'left',
      level,
      membrane = true,
      actions,
      children,
      className,
      onClick,
      onKeyDown,
      style,
      ...rest
    } = props

    const clampedLevel = (level != null && Number.isFinite(Number(level)))
      ? Math.max(0, Math.min(9, Number(level)))
      : undefined

    const tileRef = useRef<HTMLDivElement | null>(null)

    const setRefs = useCallback((node: HTMLDivElement | null) => {
      tileRef.current = node
      if (typeof ref === 'function') ref(node)
      else if (ref) {
        ;(ref as MutableRefObject<HTMLDivElement | null>).current = node
      }
    }, [ref])

    const handleClick = useCallback(
      (e: MouseEvent<HTMLDivElement>) => {
        if (disabled) return
        onClick?.(e)
      },
      [disabled, onClick],
    )

    const handleKeyDown = useCallback(
      (e: KeyboardEvent<HTMLDivElement>) => {
        if (disabled) return
        // Activate on Enter / Space like a native button.
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          tileRef.current?.click()
        }
        onKeyDown?.(e)
      },
      [disabled, onKeyDown],
    )

    const handleActionsClick = useCallback(
      (e: MouseEvent<HTMLDivElement>) => {
        // Prevent tile's onClick from firing when a nested action is clicked.
        e.stopPropagation()
      },
      [],
    )

    const resolvedIcon = typeof icon === 'string'
      ? <Icon name={icon} />
      : icon

    const hasIcon = resolvedIcon != null
    const hasText = text != null || children != null

    const levelStyle = clampedLevel != null
      ? { ...style, '--face-runtime-option-level': clampedLevel } as React.CSSProperties
      : style

    const tileNode = (
      <div
        ref={setRefs}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled || undefined}
        {...tileAnatomy.getPartAttrs('root')}
        data-variant={variant}
        data-active={active ? '' : undefined}
        data-disabled={disabled ? '' : undefined}
        data-stretch-text={stretchText ? '' : undefined}
        data-full-width={fullWidth ? '' : undefined}
        data-align={align}
        data-level={clampedLevel != null ? '' : undefined}
        data-membrane={membrane ? '' : undefined}
        className={cn('uf-tile', 'uf-option', 'uf-control', className)}
        style={levelStyle}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        {...rest}
      >
        {hasIcon && iconPosition === 'left' && (
          <span {...tileAnatomy.getPartAttrs('icon')} data-position="left">
            {resolvedIcon}
          </span>
        )}
        {hasText && (
          <Text as="span" inset="none" membrane={false} {...tileAnatomy.getPartAttrs('text')}>
            {children ?? text}
            {rightText != null && (
              <Text as="span" inset="none" membrane={false} className="uf-tile__rightText">
                {rightText}
              </Text>
            )}
          </Text>
        )}
        {hasIcon && iconPosition === 'right' && (
          <span {...tileAnatomy.getPartAttrs('icon')} data-position="right">
            {resolvedIcon}
          </span>
        )}
        {actions != null && (
          <div
            {...tileAnatomy.getPartAttrs('actions')}
            onClick={handleActionsClick}
          >
            {actions}
          </div>
        )}
      </div>
    )

    if (!membrane) return tileNode

    return (
      <span
        className={cn('uf-membrane', fullWidth ? 'uf-membrane--full' : undefined)}
        data-membrane-hover=""
        data-membrane-interactive={disabled ? undefined : ''}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return
          if (disabled) return
          tileRef.current?.focus()
          tileRef.current?.click()
        }}
      >
        {tileNode}
      </span>
    )
  },
)
