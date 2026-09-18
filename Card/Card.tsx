/**
 * Card — composable contained surface.
 *
 * `<Card title="Settings" content={<Form />} />`
 * `<Card><Card.Header><Card.Title>Settings</Card.Title></Card.Header></Card>`
 */

import { forwardRef, type ReactNode, type HTMLAttributes } from 'react'
import { createAnatomy } from '../assets/anatomy'
import { cn } from '../assets/utils'
import { getCardSurfaceProps } from '../assets/internal/card-surface'
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

export type CardVariant = 'default' | 'code' | 'plain'
export type CardPadding = 'none' | 'membrane' | 'control' | 'default'
export type CardRadius = 'none' | 'md' | 'lg'
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
  title?: ReactNode
  description?: ReactNode
  content?: SlotContent
  footer?: SlotContent
  variant?: CardVariant
  padding?: CardPadding
  radius?: CardRadius
  border?: boolean
  /** Highlight the surface on hover or focus within; does not create an action. */
  hoverable?: boolean
  fullWidth?: boolean
  footerAlign?: CardAlign
  children?: SlotContent
}

export interface CardSlotProps
  extends Omit<
    HTMLAttributes<HTMLDivElement>,
    'children' | 'dangerouslySetInnerHTML' | 'defaultChecked' | 'defaultValue'
  > {
  children?: SlotContent
}

export interface CardHeaderProps extends CardSlotProps {
  orientation?: CardHeaderOrientation
}

export interface CardFooterProps extends CardSlotProps {
  align?: CardAlign
}

export interface CardActionsProps extends CardSlotProps {
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
      content,
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
      title != null || description != null || content != null || footer != null
    const hasTitle = hasSlotContent(title)
    const hasDescription = hasSlotContent(description)
    const hasHeader = hasTitle || hasDescription
    const hasContent = hasSlotContent(content ?? children)
    const hasFooter = hasSlotContent(footer)

    return (
      <div
        ref={ref}
        {...cardAnatomy.getPartAttrs('root')}
        {...getCardSurfaceProps({ variant, padding, radius, border, hoverable, fullWidth, className })}
        {...rest}
      >
        {hasStructuredProps ? (
          <>
            {hasHeader ? (
              <CardHeader>
                {hasTitle ? <CardTitle>{title}</CardTitle> : null}
                {hasDescription ? (
                  <CardDescription>{description}</CardDescription>
                ) : null}
              </CardHeader>
            ) : null}
            {hasContent ? (
              <CardContent>{content ?? children}</CardContent>
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
