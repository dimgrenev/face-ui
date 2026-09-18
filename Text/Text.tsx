/**
 * Text — typography component.
 *
 * Unifies: Typography, Label, Kbd.
 *
 * `<Text>Hello</Text>`
 * `<Text variant="kbd">⌘K</Text>`
 * `<Text variant="label">Label</Text>`
 * `<Text icon="settings">Settings</Text>`
 * `<Text inset="none">Flush</Text>`
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
import { invalidProp } from '../assets/runtime/props'

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
  /** Content of the text; a string is the common case. Empty content renders no content slot. */
  children?: ReactNode
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
  /** Inline alignment of the content, following text direction. Default: start. */
  align?: 'start' | 'center' | 'end'
  /** Membrane spacing. */
  membrane?: boolean
  /** Truncate text with ellipsis when it overflows. */
  truncate?: boolean
  /** Associated control ID when the resolved element is a label. */
  htmlFor?: string
}

// ---------------------------------------------------------------------------
// Element per variant
// ---------------------------------------------------------------------------

const VARIANT_ELEMENT: Partial<Record<TextVariant, TextElement>> = {
  heading: 'h2',
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  h5: 'h5',
  h6: 'h6',
  label: 'label',
  kbd: 'kbd',
  code: 'code',
  blockquote: 'blockquote',
}
const ELEMENTS = new Set<unknown>([
  'p', 'span', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'label', 'kbd', 'code', 'strong', 'em', 'small', 'blockquote',
])
const BLOCK = new Set<unknown>(['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote'])
const HEADING = /^h[1-6]$/

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------

export const Text = forwardRef<HTMLElement, TextProps>(
  function Text(props, ref) {
    const {
      variant = 'body',
      size,
      as,
      icon,
      iconPosition = 'start',
      inset = 'control',
      heightMode = 'control',
      stretchText = false,
      fullWidth = false,
      align = 'start',
      membrane = true,
      truncate = false,
      children,
      className,
      htmlFor,
      ...rest
    } = props

    const fallback = VARIANT_ELEMENT[variant] ?? 'p'
    if (as != null && !ELEMENTS.has(as))
      invalidProp('Text', 'as', as, `rendering <${fallback}>`)
    const element = as != null && ELEMENTS.has(as) ? as : fallback
    const Element = element as ElementType
    const hasIcon = hasSlotContent(
      typeof icon === 'string' ? icon.trim() : icon,
    )
    const iconNode = hasIcon ? (
      <span className="uf-text__icon">
        {typeof icon === 'string' ? <Icon name={icon} /> : icon}
      </span>
    ) : null

    return (
      <Membrane
        enabled={membrane}
        as={BLOCK.has(element) ? 'div' : 'span'}
        fullWidth={fullWidth}
        truncate={truncate}
      >
        <Element
          ref={ref}
          {...textAnatomy.getPartAttrs('root')}
          data-variant={variant}
          data-size={size}
          data-inset={inset}
          data-height-mode={heightMode}
          data-icon-position={hasIcon ? iconPosition : undefined}
          data-stretch-text={stretchText ? '' : undefined}
          data-full-width={fullWidth ? '' : undefined}
          data-truncate={truncate ? '' : undefined}
          data-align={align}
          data-membrane={membrane ? '' : undefined}
          className={cn(
            'uf-text',
            // Components-compat class contract, kept beside the data-* attributes.
            variant === 'label'
              ? 'uf-text-section'
              : HEADING.test(variant)
                ? 'uf-text-heading'
                : 'uf-text-body',
            `uf-text--${variant}`,
            `uf-text--align-${align}`,
            inset === 'none' ? 'uf-text--inset-none' : 'uf-text--inset-control',
            hasIcon && 'uf-text--withIcon',
            hasIcon && `uf-text--icon-${iconPosition}`,
            className,
          )}
          htmlFor={element === 'label' ? htmlFor : undefined}
          {...rest}
        >
          {iconPosition === 'start' && iconNode}
          {hasSlotContent(children) && (
            <span className="uf-text__content">{children}</span>
          )}
          {iconPosition === 'end' && iconNode}
        </Element>
      </Membrane>
    )
  },
)
