import { forwardRef, type ReactNode, type HTMLAttributes } from 'react'
import { createAnatomy } from '../assets/anatomy'
import { cn } from '../assets/utils'
import { getCardSurfaceProps } from '../assets/internal/card-surface'
import type { CardVariant, CardPadding, CardRadius } from '../assets/internal/card-surface-options'
import { invalidProp } from '../assets/runtime/props'
import { Button } from '../Button/Button'
import { Icon } from '../Icon/Icon'
import { Text, type TextProps } from '../Text/Text'
import {
  hasSlotContent,
  renderSlotContent,
  type SlotContent,
  type SlotDescriptor,
} from '../assets/slot-content'

export const cardAnatomy = createAnatomy('card').parts(
  'root',
  'header',
  'title',
  'description',
  'content',
  'footer',
  'actions',
)

export type { CardVariant, CardPadding, CardRadius } from '../assets/internal/card-surface-options'
export type CardHeaderOrientation = 'vertical' | 'horizontal'
export type CardAlign = 'start' | 'end' | 'between'

export interface CardProps
  extends Omit<
    HTMLAttributes<HTMLDivElement>,
    | 'children'
    | 'content'
    | 'title'
    | 'dangerouslySetInnerHTML'
    | 'defaultChecked'
    | 'defaultValue'
  > {
  /** Heading of the card header, rendered through Card.Title. With `title`, `description` or `footer` set, children fill the content part. */
  title?: ReactNode
  /** Secondary text under the title, rendered through Card.Description. */
  description?: ReactNode
  /** Footer content: text, elements, component descriptors or arrays of them. */
  footer?: SlotContent
  /** Surface role: a standard contained surface, an unframed composition (`plain`) or a code canvas (`code`). Default: default. */
  variant?: CardVariant
  /** Inner surface inset, from the standard 7px rhythm down to flush. Default: default. */
  padding?: CardPadding
  /** Corner geometry for contained, compact, dialog or flush surfaces. Default: md. */
  radius?: CardRadius
  /** Draw the surface border, independently of padding, radius and variant. Default: true. */
  border?: boolean
  /** Highlight the surface on hover or focus within; does not create an action. */
  hoverable?: boolean
  /** Stretch to the available inline size; `false` fits the content and keeps the parent's alignment. Default: true. */
  fullWidth?: boolean
  /** Alignment of a nonempty `footer` shorthand only; use `Card.Footer align` in compound content, or this prop reports in development. Default: end. */
  footerAlign?: CardAlign
  /** Body of the card: the content part beside `title`/`description`/`footer`, or free composition of Card parts. */
  children?: SlotContent
}

export interface CardSlotProps
  extends Omit<
    HTMLAttributes<HTMLDivElement>,
    'children' | 'dangerouslySetInnerHTML' | 'defaultChecked' | 'defaultValue'
  > {
  /** Content of the part; a string renders as body text. */
  children?: SlotContent
}

export interface CardHeaderProps extends CardSlotProps {
  /** Stack title and description, or lay the header out in a row. Default: vertical. */
  orientation?: CardHeaderOrientation
}

export interface CardFooterProps extends CardSlotProps {
  /** Placement of the footer content along the inline axis. Default: end. */
  align?: CardAlign
}

export interface CardActionsProps extends CardSlotProps {
  /** Placement of the actions along the inline axis. Default: end. */
  align?: CardAlign
}

export type CardTitleProps = TextProps

export type CardDescriptionProps = TextProps

export type CardChildDescriptor = SlotDescriptor

type CardPart = (typeof cardAnatomy.parts)[number]

function getCardSlotPartAttrs(part: CardPart): { 'data-part': string } {
  const attrs = cardAnatomy.getPartAttrs(part)
  return { 'data-part': attrs['data-part'] }
}

function renderCardNode(node: SlotContent): ReactNode {
  return renderSlotContent(node, CARD_SLOT_COMPONENTS, (value) => (
    <Text as="div">{value}</Text>
  ))
}

const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  function CardHeader(props, ref) {
    const { orientation = 'vertical', children, className, ...rest } = props

    return (
      <div
        ref={ref}
        {...cardAnatomy.getPartAttrs('header')}
        data-orientation={orientation}
        className={cn('uf-card__header', className)}
        {...rest}
      >
        {renderCardNode(children)}
      </div>
    )
  },
)

const CardTitle = forwardRef<HTMLElement, CardTitleProps>(
  function CardTitle(props, ref) {
    const {
      variant = 'body',
      as = variant === 'body' ? 'div' : undefined,
      fullWidth = true,
      membrane = true,
      children,
      className,
      ...rest
    } = props

    return (
      <Text
        ref={ref}
        {...getCardSlotPartAttrs('title')}
        as={as}
        variant={variant}
        fullWidth={fullWidth}
        membrane={membrane}
        className={cn('uf-card__title', className)}
        {...rest}
      >
        {children}
      </Text>
    )
  },
)

const CardDescription = forwardRef<HTMLElement, CardDescriptionProps>(
  function CardDescription(props, ref) {
    const {
      variant = 'muted',
      as = variant === 'muted' ? 'div' : undefined,
      fullWidth = true,
      membrane = true,
      children,
      className,
      ...rest
    } = props

    return (
      <Text
        ref={ref}
        {...getCardSlotPartAttrs('description')}
        as={as}
        variant={variant}
        fullWidth={fullWidth}
        membrane={membrane}
        className={cn('uf-card__description', className)}
        {...rest}
      >
        {children}
      </Text>
    )
  },
)

const CardContent = forwardRef<HTMLDivElement, CardSlotProps>(
  function CardContent(props, ref) {
    const { children, className, ...rest } = props

    return (
      <div
        ref={ref}
        {...cardAnatomy.getPartAttrs('content')}
        className={cn('uf-card__content', className)}
        {...rest}
      >
        {renderCardNode(children)}
      </div>
    )
  },
)

const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  function CardFooter(props, ref) {
    const { align = 'end', children, className, ...rest } = props

    return (
      <div
        ref={ref}
        {...cardAnatomy.getPartAttrs('footer')}
        data-align={align}
        className={cn('uf-card__footer', className)}
        {...rest}
      >
        {renderCardNode(children)}
      </div>
    )
  },
)

const CardActions = forwardRef<HTMLDivElement, CardActionsProps>(
  function CardActions(props, ref) {
    const { align = 'end', children, className, ...rest } = props

    return (
      <div
        ref={ref}
        {...cardAnatomy.getPartAttrs('actions')}
        data-align={align}
        className={cn('uf-card__actions', className)}
        {...rest}
      >
        {renderCardNode(children)}
      </div>
    )
  },
)

const CardRoot = forwardRef<HTMLDivElement, CardProps>(
  function Card(props, ref) {
    const {
      title,
      description,
      footer,
      variant = 'default',
      padding = 'default',
      radius = 'md',
      border = true,
      hoverable = false,
      fullWidth = true,
      footerAlign = 'end',
      children,
      className,
      ...rest
    } = props

    const hasStructuredProps =
      title != null || description != null || footer != null
    const hasTitle = hasSlotContent(title)
    const hasDescription = hasSlotContent(description)
    const hasFooter = hasSlotContent(footer)
    if (props.footerAlign !== undefined && !hasFooter)
      invalidProp(
        'Card',
        'footerAlign',
        footerAlign,
        'it only applies to nonempty footer; use Card.Footer align for compound content',
      )

    return (
      <div
        ref={ref}
        {...cardAnatomy.getPartAttrs('root')}
        {...getCardSurfaceProps({ variant, padding, radius, border, hoverable, fullWidth, className })}
        {...rest}
      >
        {hasStructuredProps ? (
          <>
            {hasTitle || hasDescription ? (
              <CardHeader>
                {hasTitle ? <CardTitle>{title}</CardTitle> : null}
                {hasDescription ? (
                  <CardDescription>{description}</CardDescription>
                ) : null}
              </CardHeader>
            ) : null}
            {hasSlotContent(children) ? (
              <CardContent>{children}</CardContent>
            ) : null}
            {hasFooter ? (
              <CardFooter align={footerAlign}>{footer}</CardFooter>
            ) : null}
          </>
        ) : (
          renderCardNode(children)
        )}
      </div>
    )
  },
)

export type CardCompoundComponent = typeof CardRoot & {
  Root: typeof CardRoot
  Header: typeof CardHeader
  Title: typeof CardTitle
  Description: typeof CardDescription
  Content: typeof CardContent
  Footer: typeof CardFooter
  Actions: typeof CardActions
}

/** A contained surface for grouped content, either filled by its title, description and footer props or composed from its parts. */
export const Card = Object.assign(CardRoot, {
  Root: CardRoot,
  Header: CardHeader,
  Title: CardTitle,
  Description: CardDescription,
  Content: CardContent,
  Footer: CardFooter,
  Actions: CardActions,
}) as CardCompoundComponent

const CARD_SLOT_COMPONENTS = {
  Text,
  Button,
  Icon,
  'Card.Header': CardHeader,
  'Card.Title': CardTitle,
  'Card.Description': CardDescription,
  'Card.Content': CardContent,
  'Card.Footer': CardFooter,
  'Card.Actions': CardActions,
}
