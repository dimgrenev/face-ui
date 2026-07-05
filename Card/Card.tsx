/**
 * Card — content container.
 *
 * `<Card title="Settings" content={<Form />} />`
 * `<Card>{children}</Card>`
 */

import { forwardRef, isValidElement, type ReactNode, type HTMLAttributes } from 'react'
import { createAnatomy } from '../assets/anatomy'
import { cn } from '../assets/utils'
import { Button } from '../Button/Button'
import { Icon } from '../Icon/Icon'
import { Text } from '../Text/Text'

export const cardAnatomy = createAnatomy('card').parts(
  'root', 'header', 'title', 'description', 'content', 'footer',
)

export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'content' | 'title'> {
  title?: ReactNode
  description?: ReactNode
  content?: ReactNode
  footer?: ReactNode
  membrane?: boolean
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

function renderCardDescriptor(node: CardChildDescriptor): ReactNode {
  const { __componentName__, ...slotProps } = node
  switch (__componentName__) {
    case 'Text': return <Text fullWidth {...withDefaultMembrane(slotProps)} />
    case 'Button': return <Button {...withDefaultMembrane(slotProps)} />
    case 'Icon': return <Icon {...slotProps} />
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
  if (Array.isArray(node)) return node.map((item, index) => <span key={index}>{renderCardNode(item, variant)}</span>)
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

export const Card = forwardRef<HTMLDivElement, CardProps>(
  function Card(props, ref) {
    const {
      title,
      description,
      content,
      footer,
      membrane = true,
      children,
      className,
      ...rest
    } = props

    // If children are provided, render them directly (escape hatch)
    if (children && !title && !content) {
      return (
        <div
          ref={ref}
          {...cardAnatomy.getPartAttrs('root')}
          data-membrane={membrane ? '' : undefined}
          className={cn('uf-card', className)}
          {...rest}
        >
          {renderCardNode(children)}
        </div>
      )
    }

    return (
      <div
        ref={ref}
        {...cardAnatomy.getPartAttrs('root')}
        data-membrane={membrane ? '' : undefined}
        className={cn('uf-card', className)}
        {...rest}
      >
        {(title || description) && (
          <div {...cardAnatomy.getPartAttrs('header')}>
            {title && (
              <Text {...getCardSlotPartAttrs('title')} as="div" fullWidth membrane>
                {title}
              </Text>
            )}
            {description && (
              <Text {...getCardSlotPartAttrs('description')} as="div" variant="muted" fullWidth membrane>
                {description}
              </Text>
            )}
          </div>
        )}
        {(content || children) && (
          <div {...cardAnatomy.getPartAttrs('content')}>
            {renderCardNode(content ?? children)}
          </div>
        )}
        {footer && (
          <div {...cardAnatomy.getPartAttrs('footer')}>
            {renderCardNode(footer)}
          </div>
        )}
      </div>
    )
  },
)
