import {
  forwardRef,
  useCallback,
  type CSSProperties,
  type HTMLAttributes,
  type MouseEvent,
  type ReactNode,
  type ButtonHTMLAttributes,
} from 'react'
import { createAnatomy } from '../assets/anatomy'
import { cn } from '../assets/utils'
import { copyText as copyToClipboard } from '../assets/runtime/clipboard'
import { readNumber } from '../assets/runtime/props'
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
  'meta',
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

export type ButtonChevron = 'down' | 'end'

export interface ButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'children' | 'dangerouslySetInnerHTML' | 'defaultChecked' | 'defaultValue'
> {
  /** Label of the button; with `iconOnly` it stays as the accessible name only. */
  children?: ReactNode
  /** Secondary text at the inline end of the label area, such as a shortcut or count. */
  meta?: ReactNode
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
  /** Trailing disclosure chevron: `down` flips with aria-expanded; `end` points to the inline end and mirrors in right-to-left text. */
  chevron?: ButtonChevron
  /** Standard expanded state, also used to orient the disclosure chevron. */
  'aria-expanded'?: ButtonHTMLAttributes<HTMLButtonElement>['aria-expanded']
  /** Full width button. */
  fullWidth?: boolean
  /** Inline alignment of the content, following text direction. */
  align?: 'start' | 'center' | 'end'
  /** Indent steps for nested option-like rows, an integer from 0 to 9. */
  indent?: number
  /** Membrane spacing around the button. */
  membrane?: boolean
  /** Copy text to clipboard on click (Clipboard integration). */
  copyText?: string
  /** Callback when copy succeeds. */
  onCopied?: () => void
}

export interface ButtonGroupProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'dangerouslySetInnerHTML' | 'defaultChecked' | 'defaultValue'
> {
  /** The grouped buttons. */
  children: ReactNode
  /** Direction the buttons are joined in. Default: horizontal. */
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

/** An action the reader can take: a labelled control with optional icons, a loading state and a copy-to-clipboard shortcut. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(props, ref) {
    const {
      children,
      meta,
      variant = 'default',
      icon,
      iconPosition = 'start',
      iconOnly = false,
      disabled = false,
      loading = false,
      stretchText = false,
      chevron,
      fullWidth = false,
      align,
      indent,
      membrane = true,
      copyText,
      onCopied,
      className,
      onClick,
      style,
      type = 'button',
      ...rest
    } = props

    const steps =
      indent == null
        ? undefined
        : readNumber('Button', 'indent', indent, 0, { integer: true, min: 0, max: 9 })

    const handleClick = useCallback(
      async (e: MouseEvent<HTMLButtonElement>) => {
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
    const hasLabel = hasSlotContent(children)
    const hasMeta = hasSlotContent(meta)
    const isIconOnly = iconOnly || (hasIcon && !hasLabel && !hasMeta)
    const hasChevron = chevron != null
    const expanded =
      rest['aria-expanded'] === true || rest['aria-expanded'] === 'true'
    const side = chevron === 'end'
    const iconSlot = (position: 'start' | 'end' | 'only') => (
      <span {...buttonAnatomy.getPartAttrs('icon')} data-position={position}>
        {resolvedIcon}
      </span>
    )

    return (
      <Membrane enabled={membrane} fullWidth={fullWidth} interactive>
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
            hasIcon && !isIconOnly && iconPosition === 'start' ? '' : undefined
          }
          data-icon-end={
            hasIcon && !isIconOnly && iconPosition === 'end' ? '' : undefined
          }
          data-selector={hasChevron ? '' : undefined}
          data-selector-direction={
            hasChevron ? (side ? 'side' : 'vertical') : undefined
          }
          data-selector-open={hasChevron && expanded ? '' : undefined}
          data-indent={steps != null ? '' : undefined}
          data-loading={loading ? '' : undefined}
          data-membrane={membrane ? '' : undefined}
          className={cn('uf-button', 'uf-option', 'uf-control', className)}
          style={
            steps != null
              ? ({ ...style, '--face-runtime-option-level': steps } as CSSProperties)
              : style
          }
          onClick={handleClick}
          {...rest}
        >
          {loading && (
            <span className="uf-button__spinner">
              <span className="uf-spinner uf-spinner--small" />
            </span>
          )}
          {hasIcon && !isIconOnly && iconPosition === 'start' && iconSlot('start')}
          {hasIcon && isIconOnly && iconSlot('only')}
          {isIconOnly && (hasLabel || hasMeta) && (
            <span className="uf-visually-hidden">
              {children}
              {hasMeta && <> {meta}</>}
            </span>
          )}
          {(hasLabel || hasMeta) && !isIconOnly && (
            <span {...buttonAnatomy.getPartAttrs('text')}>
              <span
                {...buttonAnatomy.getPartAttrs('label')}
                className="uf-button__label"
              >
                {children}
              </span>
              {hasMeta && (
                <span
                  {...buttonAnatomy.getPartAttrs('meta')}
                  className="uf-button__meta uf-text-body"
                >
                  {meta}
                </span>
              )}
            </span>
          )}
          {hasIcon && !isIconOnly && iconPosition === 'end' && iconSlot('end')}
          {hasChevron && (
            <span {...buttonAnatomy.getPartAttrs('indicator')} aria-hidden="true">
              <Icon
                name={
                  side
                    ? 'select-chevron-right'
                    : expanded
                      ? 'select-chevron-up'
                      : 'select-chevron-down'
                }
              />
            </span>
          )}
        </button>
      </Membrane>
    )
  },
)
