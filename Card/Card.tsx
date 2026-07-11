/**
 * Card — composable contained surface.
 *
 * `<Card title="Settings" content={<Form />} />`
 * `<Card><Card.Header><Card.Title>Settings</Card.Title></Card.Header></Card>`
 */

import React, { forwardRef, isValidElement, type ReactNode, type HTMLAttributes } from 'react'
import { createAnatomy } from '../assets/anatomy'
import { cn } from '../assets/utils'
import { Button } from '../Button/Button'
import { Icon } from '../Icon/Icon'
import { Text, type TextProps } from '../Text/Text'

export const cardAnatomy = createAnatomy('card').parts(
  'root', 'header', 'title', 'description', 'content', 'footer', 'actions',
)

export type CardVariant =
  | 'default'
  | 'code'
  | 'showcase'
  | 'plain'
export type CardPadding = 'none' | 'membrane' | 'control' | 'default' | 'spacious'
export type CardRadius = 'none' | 'base' | 'sm' | 'md' | 'lg' | 'xl'
export type CardHeaderLayout = 'stack' | 'bar'
export type CardFooterLayout = 'start' | 'end' | 'between' | 'split'
export type CardActionAlign = 'start' | 'end' | 'between'

export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'content' | 'title'> {
  title?: ReactNode
  description?: ReactNode
  content?: ReactNode
  footer?: ReactNode
  variant?: CardVariant
  padding?: CardPadding
  radius?: CardRadius
  border?: boolean
  interactive?: boolean
  fullWidth?: boolean
  footerLayout?: CardFooterLayout
  children?: ReactNode
}

export interface CardSlotProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode
}

export interface CardHeaderProps extends CardSlotProps {
  layout?: CardHeaderLayout
}

export interface CardFooterProps extends CardSlotProps {
  layout?: CardFooterLayout
}

export interface CardActionsProps extends CardSlotProps {
  align?: CardActionAlign
}

export interface CardTitleProps extends Omit<TextProps, 'children'> {
  children?: ReactNode
}

export interface CardDescriptionProps extends Omit<TextProps, 'children'> {
  children?: ReactNode
}

export type CardChildDescriptor = {
  __componentName__: string
  [key: string]: any
}

type CardPart = (typeof cardAnatomy.parts)[number]

function getCardSlotPartAttrs(part: CardPart): { 'data-part': string } {
  const attrs = cardAnatomy.getPartAttrs(part)
  return { 'data-part': attrs['data-part'] }
}

function withDefaultMembrane<T extends Record<string, any>>(props: T): T {
  if (Object.prototype.hasOwnProperty.call(props, 'membrane')) return props
  return { ...props, membrane: true }
}

function renderCardSlotDescriptor(
  Component: React.ComponentType<any>,
  slotProps: Record<string, any>,
): ReactNode {
  const { children, ...rest } = slotProps
  return (
    <Component {...rest}>
      {renderCardNode(children)}
    </Component>
  )
}

function renderCardDescriptor(node: CardChildDescriptor): ReactNode {
  const { __componentName__, ...slotProps } = node
  switch (__componentName__) {
    case 'Text': return <Text fullWidth {...withDefaultMembrane(slotProps)} />
    case 'Button': return <Button {...withDefaultMembrane(slotProps)} />
    case 'Icon': {
      const { name: iconName, ...iconProps } = slotProps
      return typeof iconName === 'string' && iconName.length > 0
        ? <Icon name={iconName} {...iconProps} />
        : null
    }
    case 'Card.Header': return renderCardSlotDescriptor(CardHeader, slotProps)
    case 'Card.Title': return renderCardSlotDescriptor(CardTitle, slotProps)
    case 'Card.Description': return renderCardSlotDescriptor(CardDescription, slotProps)
    case 'Card.Content': return renderCardSlotDescriptor(CardContent, slotProps)
    case 'Card.Footer': return renderCardSlotDescriptor(CardFooter, slotProps)
    case 'Card.Actions': return renderCardSlotDescriptor(CardActions, slotProps)
    default: return null
  }
}

function isCardChildDescriptor(node: unknown): node is CardChildDescriptor {
  return Boolean(
    node &&
    typeof node === 'object' &&
    !isValidElement(node) &&
    typeof (node as { __componentName__?: unknown }).__componentName__ === 'string',
  )
}

function renderCardNode(node: ReactNode, variant: 'body' | 'muted' = 'body'): ReactNode {
  if (node == null) return null
  if (Array.isArray(node)) {
    return node.map((item, index) => (
      <React.Fragment key={index}>
        {renderCardNode(item, variant)}
      </React.Fragment>
    ))
  }
  if (typeof node === 'string' || typeof node === 'number') {
    return (
      <Text as="div" variant={variant} fullWidth membrane>
        {String(node)}
      </Text>
    )
  }
  if (isCardChildDescriptor(node)) {
    return renderCardDescriptor(node)
  }
  return node
}

const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  function CardHeader(props, ref) {
    const {
      layout = 'stack',
      children,
      className,
      ...rest
    } = props

    return (
      <div
        ref={ref}
        {...cardAnatomy.getPartAttrs('header')}
        data-layout={layout}
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
      as = 'div',
      variant = 'body',
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
      as = 'div',
      variant = 'muted',
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
    const {
      children,
      className,
      ...rest
    } = props

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
    const {
      layout = 'end',
      children,
      className,
      ...rest
    } = props

    return (
      <div
        ref={ref}
        {...cardAnatomy.getPartAttrs('footer')}
        data-layout={layout}
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
    const {
      align = 'end',
      children,
      className,
      ...rest
    } = props

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
      interactive = false,
      fullWidth = true,
      footerLayout = 'end',
      children,
      className,
      ...rest
    } = props

    const hasStructuredProps = title != null || description != null || content != null || footer != null
    const hasHeader = title != null || description != null
    const hasContent = content != null || (hasStructuredProps && children != null)
    const hasFooter = footer != null

    return (
      <div
        ref={ref}
        {...cardAnatomy.getPartAttrs('root')}
        data-card-variant={variant}
        data-padding={padding}
        data-radius={radius}
        data-border={border ? 'true' : 'false'}
        data-interactive={interactive ? '' : undefined}
        data-full-width={fullWidth ? '' : undefined}
        className={cn('uf-card', className)}
        {...rest}
      >
        {hasStructuredProps ? (
          <>
            {hasHeader ? (
              <CardHeader>
                {title != null ? <CardTitle>{title}</CardTitle> : null}
                {description != null ? <CardDescription>{description}</CardDescription> : null}
              </CardHeader>
            ) : null}
            {hasContent ? (
              <CardContent>
                {content ?? children}
              </CardContent>
            ) : null}
            {hasFooter ? (
              <CardFooter layout={footerLayout}>
                {renderCardNode(footer)}
              </CardFooter>
            ) : null}
          </>
        ) : renderCardNode(children)}
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
