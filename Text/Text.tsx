/**
 * Text — typography component.
 *
 * Unifies: Typography, Label, Kbd.
 * Per synthesize doc section 5: "Typography + Label + Kbd"
 *
 * `<Text text="Hello" />`
 * `<Text text="⌘K" variant="kbd" />`
 * `<Text text="Label" variant="label" />`
 * `<Text text="Settings" icon={<GearIcon />} />`
 * `<Text text="Flush" inset="none" />`
 */

import { forwardRef, type ReactNode, type HTMLAttributes, type ElementType } from 'react'
import { createAnatomy } from '../assets/anatomy'
import { cn } from '../assets/utils'
import { Icon } from '../Icon/Icon'

// ---------------------------------------------------------------------------
// Anatomy
// ---------------------------------------------------------------------------

export const textAnatomy = createAnatomy('text').parts('root')

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TextVariant =
  | 'default'
  | 'body'
  | 'heading'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'label'
  | 'caption'
  | 'kbd'
  | 'code'
  | 'muted'
  | 'blockquote'

export type TextSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

export type TextElement = 'p' | 'span' | 'div' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'label' | 'kbd' | 'code' | 'strong' | 'em' | 'small'

export interface TextProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  /** Text content. */
  text?: string
  /** Visual variant. */
  variant?: TextVariant
  /** Text size. */
  size?: TextSize
  /** HTML element to render. Auto-detected from variant if not specified. */
  as?: TextElement
  /** Icon element (ReactNode). */
  icon?: ReactNode | string
  /** Icon position relative to text. */
  iconPosition?: 'left' | 'right'
  /** Padding/height behavior. `control` matches buttons; `none` is flush (no inner padding). */
  inset?: 'control' | 'none'
  /** Stretch text area (flex:1). */
  stretchText?: boolean
  /** Full width. */
  fullWidth?: boolean
  /** Text alignment. */
  align?: 'left' | 'center' | 'right'
  /** Membrane spacing. */
  membrane?: boolean
  /** Custom children (overrides text). */
  children?: ReactNode
  /** For label variant: htmlFor attribute. */
  htmlFor?: string
}

// ---------------------------------------------------------------------------
// Auto-detect element from variant
// ---------------------------------------------------------------------------

function defaultElement(variant: TextVariant): TextElement {
  switch (variant) {
    case 'heading': return 'h2'
    case 'h1': return 'h1'
    case 'h2': return 'h2'
    case 'h3': return 'h3'
    case 'h4': return 'h4'
    case 'h5': return 'h5'
    case 'h6': return 'h6'
    case 'label': return 'label'
    case 'kbd': return 'kbd'
    case 'code': return 'code'
    case 'caption': return 'small'
    case 'blockquote': return 'div'
    case 'default': return 'div'
    default: return 'p'
  }
}

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------

export const Text = forwardRef<HTMLElement, TextProps>(
  function Text(props, ref) {
    const {
      text,
      variant = 'default',
      size,
      as,
      icon,
      iconPosition = 'left',
      inset = 'control',
      stretchText = false,
      fullWidth = false,
      align = 'left',
      membrane = true,
      children,
      className,
      htmlFor,
      ...rest
    } = props

    const normalizedVariant = variant === 'default' ? 'body' : variant
    const isLabelVariant = variant === 'label'
    // Label must keep default Text control paddings/membrane for consistent UI rhythm.
    const effectiveInset: TextProps['inset'] = isLabelVariant ? 'control' : inset
    const effectiveMembrane = isLabelVariant ? true : membrane
    const Element = (as ?? defaultElement(variant)) as ElementType
    const hasIcon = icon != null
    const content = children ?? text
    const hasContent = content != null && String(content).length > 0

    const textClasses = cn(
      'uf-text',
      // Components-compat class contract (keep while also exposing data-* attrs).
      variant === 'label' ? 'uf-text-section'
        : (variant === 'h1' || variant === 'h2' || variant === 'h3' || variant === 'h4' || variant === 'h5' || variant === 'h6') ? 'uf-text-heading'
        : 'uf-text-body',
      `uf-text--${variant}`,
      `uf-text--align-${align}`,
      effectiveInset === 'none' ? 'uf-text--inset-none' : 'uf-text--inset-control',
      hasIcon && 'uf-text--withIcon',
      hasIcon && `uf-text--icon-${iconPosition}`,
      stretchText && 'uf-control--stretchText',
      className,
    )

    const textNode = (
      <Element
        ref={ref}
        {...textAnatomy.getPartAttrs('root')}
        data-variant={normalizedVariant}
        data-size={size}
        data-inset={effectiveInset}
        data-icon-position={hasIcon ? iconPosition : undefined}
        data-stretch-text={stretchText ? '' : undefined}
        data-full-width={fullWidth ? '' : undefined}
        data-align={align}
        data-membrane={effectiveMembrane ? '' : undefined}
        className={textClasses}
        htmlFor={variant === 'label' ? htmlFor : undefined}
        {...rest}
      >
        {hasIcon && iconPosition === 'left' && (
          <span className="uf-text__icon">{typeof icon === 'string' ? <Icon name={icon as any} /> : icon}</span>
        )}
        {hasContent && (
          <span className="uf-text__content">{content}</span>
        )}
        {hasIcon && iconPosition === 'right' && (
          <span className="uf-text__icon">{typeof icon === 'string' ? <Icon name={icon as any} /> : icon}</span>
        )}
      </Element>
    )

    if (!effectiveMembrane) return textNode

    return (
      <span className={cn('uf-membrane', fullWidth && 'uf-membrane--full')}>
        {textNode}
      </span>
    )
  },
)
