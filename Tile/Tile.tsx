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
  'root', 'leading', 'icon', 'text', 'indicator', 'meta', 'actions',
)

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TileVariant =
  | 'default'
  | 'ghost'

export type TileIntent =
  | 'default'
  | 'disclosure'
  | 'tree'
  | 'tab'
  | 'section'

export type TileDensity =
  | 'default'
  | 'spacious'

export type TileTone =
  | 'neutral'
  | 'muted'
  | 'accent'
  | 'positive'
  | 'warning'
  | 'destructive'

export type TileActionVisibility =
  | 'reveal'
  | 'hover'
  | 'always'
  | 'hidden'

export interface TileProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Primary label. */
  text?: string
  /** Optional secondary text at the far right of the label area. */
  rightText?: ReactNode
  /** Visual variant. */
  variant?: TileVariant
  /** Semantic row intent. Keeps app row variants on one small taxonomy. */
  intent?: TileIntent
  /** Density adjusts internal padding while keeping the shared control rhythm. */
  density?: TileDensity
  /** Semantic visual tone for muted, accent, status, or destructive rows. */
  tone?: TileTone
  /** Controls how the actions slot is revealed. */
  actionVisibility?: TileActionVisibility
  /** Icon (string from registry or ReactNode). */
  icon?: ReactNode
  /** Icon position relative to text. */
  iconPosition?: 'left' | 'right'
  /** Isolated leading slot for nested controls such as disclosure or file action buttons. */
  leading?: ReactNode
  /** Non-interactive trailing metadata rendered before actions. */
  meta?: ReactNode
  /** Disabled state. */
  disabled?: boolean
  /** Busy state. Adds aria-busy/data-busy without disabling by itself. */
  busy?: boolean
  /** Active / selected state. */
  active?: boolean
  /** Parent row contains the selected descendant, usually while collapsed. */
  selectedDescendant?: boolean
  /** Set false for section/header rows that should not expose button semantics. */
  interactive?: boolean
  /** Stretch text area (flex:1). */
  stretchText?: boolean
  /** Render a compact selector indicator after the label. */
  selector?: boolean
  /** Open state for the selector indicator. */
  selectorOpen?: boolean
  /** Full width tile. */
  fullWidth?: boolean
  /** Text alignment. */
  align?: 'left' | 'center' | 'right'
  /** Nesting level for option-like rows: 0..9 */
  level?: number
  /** Truncate overflowing text content with ellipsis. */
  truncate?: boolean
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
      intent = 'default',
      density = 'default',
      tone = 'neutral',
      actionVisibility = 'reveal',
      icon,
      iconPosition = 'left',
      leading,
      meta,
      disabled = false,
      busy = false,
      active = false,
      selectedDescendant = false,
      interactive: rawInteractive,
      stretchText: rawStretchText,
      selector = false,
      selectorOpen = false,
      fullWidth = true,
      align = 'left',
      level,
      truncate = true,
      membrane = true,
      actions,
      children,
      className,
      onClick,
      onKeyDown,
      role,
      tabIndex,
      'aria-busy': ariaBusy,
      style,
      ...rest
    } = props

    const clampedLevel = (level != null && Number.isFinite(Number(level)))
      ? Math.max(0, Math.min(9, Number(level)))
      : undefined
    const resolvedInteractive = rawInteractive ?? !(intent === 'section' && onClick == null && role == null)
    const resolvedRole = role ?? (resolvedInteractive ? (intent === 'tab' ? 'tab' : 'button') : undefined)
    const resolvedTabIndex = tabIndex ?? (resolvedInteractive ? (disabled ? -1 : 0) : undefined)

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
        if (disabled || !resolvedInteractive) return
        onClick?.(e)
      },
      [disabled, onClick, resolvedInteractive],
    )

    const handleKeyDown = useCallback(
      (e: KeyboardEvent<HTMLDivElement>) => {
        if (disabled) return
        // Activate on Enter / Space like a native button.
        if (resolvedInteractive && e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          tileRef.current?.click()
        }
        onKeyDown?.(e)
      },
      [disabled, onKeyDown, resolvedInteractive],
    )

    const handleIsolatedSlotClick = useCallback(
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
    const hasLeading = leading != null
    const hasMeta = meta != null
    const hasText = text != null || children != null
    const childrenArePlainText = typeof children === 'string' || typeof children === 'number'
    const hasSelectorIndicator = selector && hasText
    const stretchText = rawStretchText ?? (hasSelectorIndicator ? false : true)
    const selectorIndicator = hasSelectorIndicator ? (
      <span {...tileAnatomy.getPartAttrs('indicator')} aria-hidden="true">
        <Icon name={selectorOpen ? 'select-chevron-up' : 'select-chevron-down'} />
      </span>
    ) : null

    const levelStyle = clampedLevel != null
      ? { ...style, '--face-runtime-option-level': clampedLevel } as React.CSSProperties
      : style

    const tileNode = (
      <div
        ref={setRefs}
        role={resolvedRole}
        tabIndex={resolvedTabIndex}
        aria-disabled={disabled || undefined}
        aria-busy={ariaBusy ?? (busy ? true : undefined)}
        {...tileAnatomy.getPartAttrs('root')}
        data-variant={variant}
        data-intent={intent}
        data-density={density}
        data-tone={tone}
        data-action-visibility={actionVisibility}
        data-active={active ? '' : undefined}
        data-selected-descendant={selectedDescendant ? '' : undefined}
        data-disabled={disabled ? '' : undefined}
        data-busy={busy ? '' : undefined}
        data-interactive={resolvedInteractive ? '' : undefined}
        data-stretch-text={stretchText ? '' : undefined}
        data-full-width={fullWidth ? '' : undefined}
        data-align={align}
        data-selector={hasSelectorIndicator ? '' : undefined}
        data-level={clampedLevel != null ? '' : undefined}
        data-truncate={truncate ? '' : undefined}
        data-membrane={membrane ? '' : undefined}
        data-leading={hasLeading ? '' : undefined}
        data-meta={hasMeta ? '' : undefined}
        data-icon-left={hasIcon && iconPosition === 'left' ? '' : undefined}
        data-icon-right={hasIcon && iconPosition === 'right' ? '' : undefined}
        className={cn('uf-tile', 'uf-option', 'uf-control', className)}
        style={levelStyle}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        {...rest}
      >
        {hasLeading && (
          <span
            {...tileAnatomy.getPartAttrs('leading')}
            onClick={handleIsolatedSlotClick}
          >
            {leading}
          </span>
        )}
        {hasIcon && iconPosition === 'left' && (
          <span {...tileAnatomy.getPartAttrs('icon')} data-position="left">
            {resolvedIcon}
          </span>
        )}
        {hasText && (
          children != null && !childrenArePlainText ? (
            <span
              {...tileAnatomy.getPartAttrs('text')}
              data-truncate={truncate ? '' : undefined}
              className="uf-tile__content"
            >
              {hasSelectorIndicator ? (
                <span className="uf-tile__label uf-tile__labelSlot">
                  {children}
                </span>
              ) : children}
              {selectorIndicator}
            </span>
          ) : (
            <Text
              as="span"
              inset="none"
              membrane={false}
              truncate={truncate}
              {...tileAnatomy.getPartAttrs('text')}
            >
              <span className="uf-tile__label">
                {childrenArePlainText ? children : text}
              </span>
              {rightText != null && (
                <Text as="span" inset="none" membrane={false} className="uf-tile__rightText">
                  {rightText}
                </Text>
              )}
              {selectorIndicator}
            </Text>
          )
        )}
        {hasIcon && iconPosition === 'right' && (
          <span {...tileAnatomy.getPartAttrs('icon')} data-position="right">
            {resolvedIcon}
          </span>
        )}
        {hasMeta && (
          <span {...tileAnatomy.getPartAttrs('meta')}>
            {meta}
          </span>
        )}
        {actions != null && (
          <div
            {...tileAnatomy.getPartAttrs('actions')}
            onClick={handleIsolatedSlotClick}
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
        data-membrane-interactive={!disabled && resolvedInteractive ? '' : undefined}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return
          if (disabled || !resolvedInteractive) return
          tileRef.current?.focus()
          tileRef.current?.click()
        }}
      >
        {tileNode}
      </span>
    )
  },
)
