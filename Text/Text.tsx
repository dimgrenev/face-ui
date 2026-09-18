/**
 * Text — typography component.
 *
 * Unifies: Typography, Label, Kbd.
 * Per synthesize doc section 5: "Typography + Label + Kbd"
 *
 * `<Text text="Hello" />`
 * `<Text text="⌘K" variant="kbd" />`
 * `<Text text="Label" variant="label" />`
 * `<Text text="Settings" icon={<Icon name="settings" />} />`
 * `<Text text="Flush" inset="none" />`
 */

import {
  forwardRef,
  type ReactNode,
  type HTMLAttributes,
  type ElementType,
} from 'react'
import { createAnatomy } from '../assets/anatomy'
import { cn } from '../assets/utils'
import { Icon } from '../Icon/Icon'
import { Membrane } from '../assets/adapters/react/Membrane'
import { hasSlotContent } from '../assets/slot-content'

// ---------------------------------------------------------------------------
// Anatomy
// ---------------------------------------------------------------------------

export const textAnatomy = createAnatomy('text').parts('root')

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TextVariant =
  | 'body'
  | 'heading'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'label'
  | 'kbd'
  | 'code'
  | 'markdown'
  | 'muted'
  | 'blockquote'

export type TextSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

export type TextElement =
  | 'p'
  | 'span'
  | 'div'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'label'
  | 'kbd'
  | 'code'
  | 'strong'
  | 'em'
  | 'small'
  | 'blockquote'

export interface TextProps extends Omit<
  HTMLAttributes<HTMLElement>,
  'children' | 'dangerouslySetInnerHTML' | 'defaultChecked' | 'defaultValue'
> {
  /** Text content. */
  text?: string
  /** Typography treatment. `markdown` supplies paragraph rhythm; it does not parse Markdown. */
  variant?: TextVariant
  /** Explicit font size, overriding the variant's default. */
  size?: TextSize
  /** HTML element to render. Auto-detected from variant if not specified. */
  as?: TextElement
  /** Built-in icon name or custom node. Empty content creates no icon slot. */
  icon?: ReactNode | string
  /** Icon at the start or end of the label, following text direction. Default: start. */
  iconPosition?: 'start' | 'end'
  /** Padding/height behavior. `control` matches buttons; `none` is flush (no inner padding). */
  inset?: 'control' | 'none'
  /** Block sizing. `control` keeps the variant's control height; `content` fits its line boxes without vertical padding. Horizontal inset is preserved. */
  heightMode?: 'control' | 'content'
  /** Stretch text area (flex:1). */
  stretchText?: boolean
  /** Full width. */
  fullWidth?: boolean
  /** Text alignment. */
  align?: 'left' | 'center' | 'right'
  /** Membrane spacing. */
  membrane?: boolean
  /** Truncate text with ellipsis when it overflows. */
  truncate?: boolean
  /** Custom children (overrides text). */
  children?: ReactNode
  /** Associated control ID when the resolved element is a label. */
  htmlFor?: string
}

// ---------------------------------------------------------------------------
// Auto-detect element from variant
// ---------------------------------------------------------------------------

function defaultElement(variant: TextVariant): TextElement {
  switch (variant) {
    case 'heading':
      return 'h2'
    case 'h1':
      return 'h1'
    case 'h2':
      return 'h2'
    case 'h3':
      return 'h3'
    case 'h4':
      return 'h4'
    case 'h5':
      return 'h5'
    case 'h6':
      return 'h6'
    case 'label':
      return 'label'
    case 'kbd':
      return 'kbd'
    case 'code':
      return 'code'
    case 'blockquote':
      return 'blockquote'
    default:
      return 'p'
  }
}

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------

export const Text = forwardRef<HTMLElement, TextProps>(
  function Text(props, ref) {
    const {
      text,
      variant = 'body',
      size,
      as,
      icon,
      iconPosition = 'start',
      inset = 'control',
      heightMode = 'control',
      stretchText = false,
      fullWidth = false,
      align = 'left',
      membrane = true,
      truncate = false,
      children,
      className,
      htmlFor,
      ...rest
    } = props

    const resolvedVariant = variant
    // `control` remains the default for every variant. Explicit `none` must be
    // honored for labels embedded in full-surface controls.
    const effectiveInset: TextProps['inset'] = inset
    const effectiveMembrane = membrane
    const selectedElement = as ?? defaultElement(resolvedVariant)
    const Element = selectedElement as ElementType
    const hasIcon = hasSlotContent(
      typeof icon === 'string' ? icon.trim() : icon,
    )
    const content = children ?? text
    const hasContent = hasSlotContent(content)

    const textClasses = cn(
      'uf-text',
      // Components-compat class contract (keep while also exposing data-* attrs).
      resolvedVariant === 'label'
        ? 'uf-text-section'
        : resolvedVariant === 'h1' ||
            resolvedVariant === 'h2' ||
            resolvedVariant === 'h3' ||
            resolvedVariant === 'h4' ||
            resolvedVariant === 'h5' ||
            resolvedVariant === 'h6'
          ? 'uf-text-heading'
          : 'uf-text-body',
      `uf-text--${resolvedVariant}`,
      `uf-text--align-${align}`,
      effectiveInset === 'none'
        ? 'uf-text--inset-none'
        : 'uf-text--inset-control',
      hasIcon && 'uf-text--withIcon',
      hasIcon && `uf-text--icon-${iconPosition}`,
      className,
    )

    const textNode = (
      <Element
        ref={ref}
        {...textAnatomy.getPartAttrs('root')}
        data-variant={resolvedVariant}
        data-size={size}
        data-inset={effectiveInset}
        data-height-mode={heightMode}
        data-icon-position={hasIcon ? iconPosition : undefined}
        data-stretch-text={stretchText ? '' : undefined}
        data-full-width={fullWidth ? '' : undefined}
        data-truncate={truncate ? '' : undefined}
        data-align={align}
        data-membrane={effectiveMembrane ? '' : undefined}
        className={textClasses}
        htmlFor={selectedElement === 'label' ? htmlFor : undefined}
        {...rest}
      >
        {hasIcon && iconPosition === 'start' && (
          <span className="uf-text__icon">
            {typeof icon === 'string' ? <Icon name={icon} /> : icon}
          </span>
        )}
        {hasContent && <span className="uf-text__content">{content}</span>}
        {hasIcon && iconPosition === 'end' && (
          <span className="uf-text__icon">
            {typeof icon === 'string' ? <Icon name={icon} /> : icon}
          </span>
        )}
      </Element>
    )

    return (
      <Membrane
        enabled={membrane}
        as={
          [
            'p',
            'div',
            'h1',
            'h2',
            'h3',
            'h4',
            'h5',
            'h6',
            'blockquote',
          ].includes(selectedElement)
            ? 'div'
            : 'span'
        }
        fullWidth={fullWidth}
        truncate={truncate}
      >
        {textNode}
      </Membrane>
    )
  },
)
