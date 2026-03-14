/**
 * Bar — toolbar layout component with start/end sections.
 *
 * `<Bar><BarSection align="start">Left</BarSection><BarSection align="end">Right</BarSection></Bar>`
 * `<Bar orientation="vertical">...</Bar>`
 */

import React, { forwardRef, type ReactNode, type HTMLAttributes } from 'react'
import { createAnatomy } from '../assets/anatomy'
import { cn } from '../assets/utils'
import { Button } from '../Button/Button'
import { Icon } from '../Icon/Icon'
import { Text } from '../Text/Text'

// ---------------------------------------------------------------------------
// Anatomy
// ---------------------------------------------------------------------------

export const barAnatomy = createAnatomy('bar').parts('root', 'section')

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BarProps extends HTMLAttributes<HTMLDivElement> {
  /** Bar content (typically BarSection elements). */
  children?: ReactNode
  /** Layout direction. */
  orientation?: 'horizontal' | 'vertical'
}

export interface BarSectionProps extends HTMLAttributes<HTMLDivElement> {
  /** Alignment within the bar. */
  align?: 'start' | 'end'
  /** Section content. */
  children?: ReactNode
}

type SlotProps = { children?: ReactNode }

const BarLeftEllipsis: React.FC<SlotProps> = (_props) => null
BarLeftEllipsis.displayName = 'Bar.LeftEllipsis'

const BarLeftOverlap: React.FC<SlotProps> = (_props) => null
BarLeftOverlap.displayName = 'Bar.LeftOverlap'

const BarRight: React.FC<SlotProps> = (_props) => null
BarRight.displayName = 'Bar.Right'

function isElementOfType(el: unknown, type: unknown): el is React.ReactElement<any> {
  return Boolean(el) && React.isValidElement(el) && (el as React.ReactElement<any>).type === type
}

export type FeldChildDescriptor = {
  __componentName__: string
  [key: string]: any
}

function renderSlot(node: any): React.ReactNode {
  if (node == null) return null
  if (Array.isArray(node)) return node.map((x, i) => <React.Fragment key={i}>{renderSlot(x)}</React.Fragment>)
  if (React.isValidElement(node)) return node
  if (typeof node === 'string' || typeof node === 'number') {
    return (
      <Text as="span" className="uf-bar__slotText">
        {String(node)}
      </Text>
    )
  }
  if (typeof node !== 'object') return String(node)

  const name = (node as FeldChildDescriptor).__componentName__
  if (!name || typeof name !== 'string') return null
  const { __componentName__, ...slotProps } = node as FeldChildDescriptor
  switch (name) {
    case 'Text': return <Text {...slotProps} />
    case 'Icon': return <Icon {...slotProps} />
    case 'Button': return <Button {...slotProps} />
    default:
      return (
        <Text as="span" className="uf-bar__slotText" style={{ opacity: 0.6 }}>
          {name}
        </Text>
      )
  }
}

type BarCompoundComponent = React.ForwardRefExoticComponent<BarProps & React.RefAttributes<HTMLDivElement>> & {
  LeftEllipsis: React.FC<SlotProps>
  LeftOverlap: React.FC<SlotProps>
  Right: React.FC<SlotProps>
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

export const Bar = forwardRef<HTMLDivElement, BarProps>(
  function Bar(props, ref) {
    const {
      orientation = 'horizontal',
      children: rawChildren,
      className,
      ...rest
    } = props

    const children: any[] = (() => {
      if (rawChildren == null) return []
      if (Array.isArray(rawChildren)) return rawChildren
      if (typeof rawChildren === 'object' && !React.isValidElement(rawChildren)) return [rawChildren]
      return React.Children.toArray(rawChildren)
    })()

    // components API compatibility:
    // support compound children (`Bar.LeftEllipsis`, `Bar.LeftOverlap`, `Bar.Right`)
    // and plain Feld descriptor objects from playground JSON.
    let leftMode: 'ellipsis' | 'overlap' = 'ellipsis'
    let leftNode: ReactNode = null
    let rightNode: ReactNode = null

    for (const child of children) {
      if (isElementOfType(child, BarRight)) {
        rightNode = child.props?.children ?? null
        continue
      }
      if (isElementOfType(child, BarLeftOverlap)) {
        leftMode = 'overlap'
        leftNode = child.props?.children ?? null
        continue
      }
      if (isElementOfType(child, BarLeftEllipsis)) {
        leftMode = 'ellipsis'
        leftNode = child.props?.children ?? null
        continue
      }
      if (child && typeof child === 'object' && !React.isValidElement(child) && typeof (child as FeldChildDescriptor).__componentName__ === 'string') {
        const n = String((child as FeldChildDescriptor).__componentName__)
        if (n === 'Bar.Right') {
          rightNode = (child as any).children ?? null
          continue
        }
        if (n === 'Bar.LeftOverlap') {
          leftMode = 'overlap'
          leftNode = (child as any).children ?? null
          continue
        }
        if (n === 'Bar.LeftEllipsis') {
          leftMode = 'ellipsis'
          leftNode = (child as any).children ?? null
          continue
        }
      }
      if (leftNode == null) leftNode = child
    }

    if (leftNode == null && rightNode == null) {
      leftNode = (
        <Text as="span" className="uf-bar__slotText">
          Bar
        </Text>
      )
      rightNode = (
        <Button
          type="button"
          aria-label="Close"
          title="Close"
          icon="close"
          iconOnly
          fullWidth={false}
          variant="default"
        />
      )
    }

    if (leftNode != null || rightNode != null) {
      return (
        <div
          ref={ref}
          {...barAnatomy.getPartAttrs('root')}
          role="toolbar"
          aria-orientation={orientation}
          data-orientation={orientation}
          className={cn('uf-bar', leftMode === 'overlap' ? 'uf-bar--overlap' : 'uf-bar--ellipsis', className)}
          {...rest}
        >
          <div className="uf-bar__left">{renderSlot(leftNode)}</div>
          <div className="uf-bar__right">{renderSlot(rightNode)}</div>
        </div>
      )
    }

    return (
      <div
        ref={ref}
        {...barAnatomy.getPartAttrs('root')}
        role="toolbar"
        aria-orientation={orientation}
        data-orientation={orientation}
        className={cn('uf-bar', className)}
        {...rest}
      >
        {children}
      </div>
    )
  },
) as BarCompoundComponent

Bar.LeftEllipsis = BarLeftEllipsis
Bar.LeftOverlap = BarLeftOverlap
Bar.Right = BarRight

export const BarSection = forwardRef<HTMLDivElement, BarSectionProps>(
  function BarSection(props, ref) {
    const {
      align = 'start',
      children,
      className,
      ...rest
    } = props

    return (
      <div
        ref={ref}
        {...barAnatomy.getPartAttrs('section')}
        data-align={align}
        className={cn('uf-bar-section', className)}
        {...rest}
      >
        {children}
      </div>
    )
  },
)
