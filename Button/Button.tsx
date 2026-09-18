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

import {
  forwardRef,
  useCallback,
  type HTMLAttributes,
  type ReactNode,
  type ButtonHTMLAttributes,
} from 'react'
import { createAnatomy } from '../assets/anatomy'
import { cn } from '../assets/utils'
import { copyText as copyToClipboard } from '../assets/runtime/clipboard'
import { Icon } from '../Icon/Icon'
import { Membrane } from '../assets/adapters/react/Membrane'
import { hasSlotContent } from '../assets/slot-content'

// ---------------------------------------------------------------------------
// Anatomy
// ---------------------------------------------------------------------------

export const buttonAnatomy = createAnatomy('button').parts(
  'root',
  'icon',
  'text',
  'label',
  'indicator',
  'group',
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

export type ButtonChevron = 'down' | 'right'

export interface ButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'children' | 'dangerouslySetInnerHTML' | 'defaultChecked' | 'defaultValue'
> {
  /** Button label text. */
  text?: string
  /** Optional secondary text, rendered at the far right inside the text area. */
  rightText?: ReactNode
  /** Visual variant. */
  variant?: ButtonVariant
  /** Icon (string from registry, ReactNode, or SVG element). */
  icon?: ReactNode
  /** Icon at the start or end of the label, following text direction. Default: start. */
  iconPosition?: 'start' | 'end'
  /** Hide the visual label while preserving its accessible text. Compact buttons are square. */
  iconOnly?: boolean
  /** Disabled state. */
  disabled?: boolean
  /** Loading state (shows spinner, dims text). */
  loading?: boolean
  /** Stretch text area (flex:1). */
  stretchText?: boolean
  /** Trailing disclosure chevron. aria-expanded reverses its direction when open. */
  chevron?: ButtonChevron
  /** Standard expanded state, also used to orient the disclosure chevron. */
  'aria-expanded'?: ButtonHTMLAttributes<HTMLButtonElement>['aria-expanded']
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
  /** Label content, overriding text. Icon and secondary text remain separate slots. */
  children?: ReactNode
}

export interface ButtonGroupProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'dangerouslySetInnerHTML' | 'defaultChecked' | 'defaultValue'
> {
  children: ReactNode
  orientation?: 'horizontal' | 'vertical'
  className?: string
}

// ---------------------------------------------------------------------------
// ButtonGroup
// ---------------------------------------------------------------------------

export const ButtonGroup = forwardRef<HTMLDivElement, ButtonGroupProps>(
  function ButtonGroup(
    { children, orientation = 'horizontal', className, ...rest },
    ref,
  ) {
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
  function Button(props, ref) {
    const {
      text,
      rightText,
      variant = 'default',
      icon,
      iconPosition = 'start',
      iconOnly = false,
      disabled = false,
      loading = false,
      stretchText: rawStretchText,
      chevron,
      fullWidth = false,
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

    const clampedLevel =
      level != null && Number.isFinite(Number(level))
        ? Math.max(0, Math.min(9, Math.floor(Number(level))))
        : undefined

    const handleClick = useCallback(
      async (e: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(e)
        if (e.defaultPrevented || copyText == null) return
        const button = e.currentTarget
        if (await copyToClipboard(copyText, button.ownerDocument)) {
          onCopied?.()
        }
      },
      [copyText, onCopied, onClick],
    )

    const resolvedIcon = typeof icon === 'string' ? <Icon name={icon} /> : icon

    const hasIcon = hasSlotContent(
      typeof icon === 'string' ? icon.trim() : icon,
    )
    const hasText = hasSlotContent(children ?? text)
    const hasRightText = hasSlotContent(rightText)
    const isIconOnly = iconOnly || (hasIcon && !hasText && !hasRightText)
    const hasSelectorIndicator = chevron != null
    const expanded =
      rest['aria-expanded'] === true || rest['aria-expanded'] === 'true'
    const stretchText = rawStretchText ?? false
    const resolvedSelectorDirection = chevron === 'right' ? 'side' : 'vertical'
    const selectorIconName =
      resolvedSelectorDirection === 'side'
        ? 'select-chevron-right'
        : expanded
          ? 'select-chevron-up'
          : 'select-chevron-down'
    const selectorIndicator = hasSelectorIndicator ? (
      <span {...buttonAnatomy.getPartAttrs('indicator')} aria-hidden="true">
        <Icon name={selectorIconName} />
      </span>
    ) : null

    const levelStyle =
      clampedLevel != null
        ? ({
            ...style,
            '--face-runtime-option-level': clampedLevel,
          } as React.CSSProperties)
        : style

    const buttonNode = (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        aria-busy={loading ? true : undefined}
        {...buttonAnatomy.getPartAttrs('root')}
        data-variant={variant}
        data-icon-only={isIconOnly ? '' : undefined}
        data-stretch-text={stretchText ? '' : undefined}
        data-full-width={fullWidth ? '' : undefined}
        data-align={align}
        data-icon-start={
          hasIcon && !isIconOnly && iconPosition === 'start'
            ? ''
            : undefined
        }
        data-icon-end={
          hasIcon && !isIconOnly && iconPosition === 'end'
            ? ''
            : undefined
        }
        data-selector={hasSelectorIndicator ? '' : undefined}
        data-selector-direction={
          hasSelectorIndicator ? resolvedSelectorDirection : undefined
        }
        data-selector-open={hasSelectorIndicator && expanded ? '' : undefined}
        data-level={clampedLevel != null ? '' : undefined}
        data-loading={loading ? '' : undefined}
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
        {hasIcon && !isIconOnly && iconPosition === 'start' && (
          <span {...buttonAnatomy.getPartAttrs('icon')} data-position="start">
            {resolvedIcon}
          </span>
        )}
        {hasIcon && isIconOnly && (
          <span {...buttonAnatomy.getPartAttrs('icon')} data-position="only">
            {resolvedIcon}
          </span>
        )}
        {isIconOnly && (hasText || hasRightText) && (
          <span className="uf-visually-hidden">
            {children ?? text}
            {hasRightText && <> {rightText}</>}
          </span>
        )}
        {(hasText || hasRightText) && !isIconOnly && (
          <span {...buttonAnatomy.getPartAttrs('text')}>
            <span
              {...buttonAnatomy.getPartAttrs('label')}
              className="uf-button__label"
            >
              {children ?? text}
            </span>
            {hasRightText && (
              <span className="uf-button__rightText uf-text-body">
                {rightText}
              </span>
            )}
          </span>
        )}
        {hasIcon && !isIconOnly && iconPosition === 'end' && (
          <span {...buttonAnatomy.getPartAttrs('icon')} data-position="end">
            {resolvedIcon}
          </span>
        )}
        {selectorIndicator}
      </button>
    )

    return (
      <Membrane enabled={membrane} fullWidth={fullWidth} interactive>
        {buttonNode}
      </Membrane>
    )
  },
)
