/**
 * Tile — interactive row with nested actions.
 *
 * A container that acts as a single clickable target (like a Notion sidebar tab)
 * while allowing nested Button actions (more, close, etc.) that fire independently.
 *
 * Composed rows keep the primary button and action controls as siblings.
 * The outer element owns row layout and delegated click callbacks.
 */

import {
  forwardRef,
  useCallback,
  useId,
  useRef,
  type ReactNode,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
} from 'react'
import { createAnatomy } from '../assets/anatomy'
import { cn } from '../assets/utils'
import { Icon } from '../Icon/Icon'
import { hasSlotContent } from '../assets/slot-content'
import { Membrane } from '../assets/adapters/react/Membrane'

// ---------------------------------------------------------------------------
// Anatomy
// ---------------------------------------------------------------------------

export const tileAnatomy = createAnatomy('tile').parts(
  'root',
  'primary',
  'leading',
  'icon',
  'text',
  'indicator',
  'meta',
  'actions',
)

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TileVariant = 'default' | 'ghost'

export type TileDensity = 'default' | 'spacious'

export type TileTone =
  | 'neutral'
  | 'muted'
  | 'accent'
  | 'positive'
  | 'warning'
  | 'destructive'

export type TileActionVisibility = 'reveal' | 'hover' | 'always' | 'hidden'

export interface TileProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'children' | 'dangerouslySetInnerHTML' | 'defaultValue' | 'defaultChecked'
> {
  /** Primary label. */
  text?: string
  /** Optional secondary text at the far right of the label area. */
  rightText?: ReactNode
  /** Visual variant. */
  variant?: TileVariant
  /** Density adjusts internal padding while keeping the shared control rhythm. */
  density?: TileDensity
  /** Semantic visual tone for muted, accent, status, or destructive rows. */
  tone?: TileTone
  /** Controls how the actions slot is revealed. */
  actionVisibility?: TileActionVisibility
  /** Icon (string from registry or ReactNode). */
  icon?: ReactNode
  /** Icon at the start or end of the label, following text direction. Default: start. */
  iconPosition?: 'start' | 'end'
  /** Isolated leading slot for nested controls such as disclosure or file action buttons. */
  leading?: ReactNode
  /** Non-interactive trailing metadata rendered before actions. */
  meta?: ReactNode
  /** Disable the primary action. Nested controls own their disabled state. */
  disabled?: boolean
  /** Active / selected state. */
  active?: boolean
  /** Enable a primary action; inferred from onClick or an explicit button/tab role. */
  interactive?: boolean
  /** Stretch text area (flex:1). */
  stretchText?: boolean
  /** Trailing disclosure chevron, matching Button. Down follows aria-expanded. */
  chevron?: 'down' | 'right'
  /** Expanded state of the controlled region; also orients chevron. */
  'aria-expanded'?: HTMLAttributes<HTMLDivElement>['aria-expanded']
  /** Busy state of the row region, reflected by the wait cursor. */
  'aria-busy'?: HTMLAttributes<HTMLDivElement>['aria-busy']
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
  /** Custom label content. Overrides text; icon/rightText/other slots remain independent. */
  children?: ReactNode
}

// ---------------------------------------------------------------------------
// Tile
// ---------------------------------------------------------------------------

// Live-region and visibility attributes describe the entire row, including its actions.
const regionAria = new Set([
  'aria-hidden',
  'aria-live',
  'aria-atomic',
  'aria-relevant',
])
const isControlAria = (name: string) =>
  name.startsWith('aria-') && !regionAria.has(name)

export const Tile = forwardRef<HTMLDivElement, TileProps>(
  function Tile(props, ref) {
    const {
      text,
      rightText,
      variant = 'default',
      density = 'default',
      tone = 'neutral',
      actionVisibility = 'reveal',
      icon,
      iconPosition = 'start',
      leading,
      meta,
      disabled = false,
      active = false,
      interactive: rawInteractive,
      stretchText: rawStretchText,
      chevron,
      fullWidth = true,
      align = 'left',
      level,
      truncate = true,
      membrane = true,
      actions,
      children,
      className,
      id,
      onClick,
      onKeyDown,
      role,
      tabIndex,
      'aria-busy': ariaBusy,
      style,
      ...rest
    } = props

    const clampedLevel =
      level != null && Number.isFinite(Number(level))
        ? Math.max(0, Math.min(9, Math.floor(Number(level))))
        : undefined
    const resolvedInteractive =
      rawInteractive ?? (onClick != null || role === 'button' || role === 'tab')
    const resolvedRole = role ?? (resolvedInteractive ? 'button' : undefined)
    const resolvedTabIndex =
      tabIndex ?? (resolvedInteractive ? (disabled ? -1 : 0) : undefined)

    const splitAction =
      resolvedInteractive &&
      (resolvedRole === 'button' || resolvedRole === 'tab')
    const labelId = useId()
    const primaryRef = useRef<HTMLButtonElement>(null)
    const semantics = Object.fromEntries(
      Object.entries(rest).filter(([key]) => isControlAria(key)),
    )
    const rootRest = splitAction
      ? Object.fromEntries(
          Object.entries(rest).filter(([key]) => !isControlAria(key)),
        )
      : rest
    const handleClick = useCallback(
      (e: MouseEvent<HTMLDivElement>) => {
        if (disabled || !resolvedInteractive || e.defaultPrevented) return
        const nested = (e.target as HTMLElement).closest(
          'a, button, input, select, textarea, [contenteditable="true"], [role="button"], [role="tab"]',
        )
        if (
          nested &&
          nested !== e.currentTarget &&
          nested !== primaryRef.current
        )
          return
        primaryRef.current?.focus({ preventScroll: true })
        onClick?.(e)
      },
      [disabled, onClick, resolvedInteractive],
    )

    const handleKeyDown = useCallback(
      (e: KeyboardEvent<HTMLDivElement>) => {
        onKeyDown?.(e)
        if (disabled || e.defaultPrevented) return
        // Activate on Enter / Space like a native button.
        if (
          resolvedInteractive &&
          !splitAction &&
          e.target === e.currentTarget &&
          (e.key === 'Enter' || e.key === ' ')
        ) {
          e.preventDefault()
          e.currentTarget.click()
        }
      },
      [disabled, onKeyDown, resolvedInteractive, splitAction],
    )

    const handleIsolatedSlotClick = useCallback(
      (e: MouseEvent<HTMLDivElement>) => {
        // Prevent tile's onClick from firing when a nested action is clicked.
        e.stopPropagation()
      },
      [],
    )

    const resolvedIcon = typeof icon === 'string' ? <Icon name={icon} /> : icon

    const hasIcon = hasSlotContent(
      typeof icon === 'string' ? icon.trim() : icon,
    )
    const hasLeading = hasSlotContent(leading)
    const hasMeta = hasSlotContent(meta)
    const hasText =
      hasSlotContent(children ?? text) || hasSlotContent(rightText)
    const busy = ariaBusy === true || ariaBusy === 'true'
    const expanded =
      rest['aria-expanded'] === true || rest['aria-expanded'] === 'true'
    const childrenArePlainText =
      typeof children === 'string' || typeof children === 'number'
    const hasSelectorIndicator = chevron != null
    const stretchText = rawStretchText ?? (hasSelectorIndicator ? false : true)
    const selectorIndicator = hasSelectorIndicator ? (
      <span
        {...tileAnatomy.getPartAttrs('indicator')}
        className="uf-tile__indicator"
        data-direction={chevron}
        data-open={expanded ? '' : undefined}
        aria-hidden="true"
      >
        <Icon
          name={
            chevron === 'right'
              ? 'select-chevron-right'
              : expanded
                ? 'select-chevron-up'
                : 'select-chevron-down'
          }
        />
      </span>
    ) : null

    const levelStyle =
      clampedLevel != null
        ? ({
            ...style,
            '--face-runtime-option-level': clampedLevel,
          } as React.CSSProperties)
        : style

    const tileNode = (
      <div
        ref={ref}
        id={splitAction ? undefined : id}
        role={splitAction ? undefined : resolvedRole}
        tabIndex={splitAction ? undefined : resolvedTabIndex}
        aria-disabled={!splitAction && disabled ? true : undefined}
        aria-busy={ariaBusy}
        {...tileAnatomy.getPartAttrs('root')}
        data-variant={variant}
        data-density={density}
        data-tone={tone}
        data-action-visibility={actionVisibility}
        data-active={active ? '' : undefined}
        data-primary-disabled={disabled ? '' : undefined}
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
        data-icon-start={hasIcon && iconPosition === 'start' ? '' : undefined}
        data-icon-end={hasIcon && iconPosition === 'end' ? '' : undefined}
        className={cn('uf-tile', className)}
        style={levelStyle}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        {...rootRest}
      >
        {splitAction && (
          <button
            ref={primaryRef}
            id={id}
            type="button"
            role={resolvedRole}
            tabIndex={resolvedTabIndex}
            disabled={disabled}
            aria-labelledby={semantics['aria-label'] ? undefined : labelId}
            {...semantics}
            {...tileAnatomy.getPartAttrs('primary')}
            className="uf-tile-primary"
          />
        )}
        {hasLeading && (
          <div
            {...tileAnatomy.getPartAttrs('leading')}
            onClick={handleIsolatedSlotClick}
          >
            {leading}
          </div>
        )}
        {hasIcon && iconPosition === 'start' && (
          <span {...tileAnatomy.getPartAttrs('icon')} data-position="start">
            {resolvedIcon}
          </span>
        )}
        {(hasText || hasSelectorIndicator) && (
          <div
            {...tileAnatomy.getPartAttrs('text')}
            data-truncate={truncate ? '' : undefined}
            id={labelId}
            className="uf-tile__content"
          >
            {children != null && !childrenArePlainText ? (
              hasSelectorIndicator ? (
                <div className="uf-tile__label uf-tile__labelSlot">
                  {children}
                </div>
              ) : (
                children
              )
            ) : (
              <span className="uf-tile__label">
                {childrenArePlainText ? children : text}
              </span>
            )}
            {hasSlotContent(rightText) && (
              <span className="uf-tile__rightText">{rightText}</span>
            )}
            {selectorIndicator}
          </div>
        )}
        {hasIcon && iconPosition === 'end' && (
          <span {...tileAnatomy.getPartAttrs('icon')} data-position="end">
            {resolvedIcon}
          </span>
        )}
        {hasMeta && <div {...tileAnatomy.getPartAttrs('meta')}>{meta}</div>}
        {hasSlotContent(actions) && (
          <div
            {...tileAnatomy.getPartAttrs('actions')}
            onClick={handleIsolatedSlotClick}
          >
            {actions}
          </div>
        )}
      </div>
    )

    return (
      <Membrane
        enabled={membrane}
        as="div"
        fullWidth={fullWidth}
        interactive={!disabled && resolvedInteractive}
        target={splitAction ? '[data-part="primary"]' : undefined}
      >
        {tileNode}
      </Membrane>
    )
  },
)
