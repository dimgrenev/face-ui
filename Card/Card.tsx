/**
 * Card — content container.
 *
 * `<Card title="Settings" content={<Form />} />`
 * `<Card>{children}</Card>`
 */

import { forwardRef, type ReactNode, type HTMLAttributes } from 'react'
import { createAnatomy } from '../assets/anatomy'
import { cn } from '../assets/utils'
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

function renderCardNode(node: ReactNode, variant: 'body' | 'muted' = 'body'): ReactNode {
  if (node == null) return null
  if (typeof node === 'string' || typeof node === 'number') {
    return (
      <Text as="div" variant={variant} membrane={false} inset="none">
        {String(node)}
      </Text>
    )
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
              <Text {...cardAnatomy.getPartAttrs('title')} as="div" membrane={false} inset="none">
                {title}
              </Text>
            )}
            {description && (
              <Text {...cardAnatomy.getPartAttrs('description')} as="div" variant="muted" membrane={false} inset="none">
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
