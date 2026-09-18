import {
  createElement,
  Fragment,
  isValidElement,
  type ElementType,
  type ReactNode,
} from 'react'

export type SlotDescriptor = {
  __componentName__: string
  [prop: string]: unknown
}
export type SlotContent = ReactNode | SlotDescriptor | readonly SlotContent[]

export function isSlotDescriptor(node: unknown): node is SlotDescriptor {
  return (
    !!node &&
    typeof node === 'object' &&
    !isValidElement(node) &&
    Object.prototype.hasOwnProperty.call(node, '__componentName__') &&
    typeof (node as SlotDescriptor).__componentName__ === 'string'
  )
}

/** Resolve the explicit descriptor format; component children retain their own typography. */
export function renderSlotContent(
  node: unknown,
  components: Readonly<Record<string, ElementType>>,
  renderPrimitive?: (value: string | number) => ReactNode,
): ReactNode {
  if (node == null || typeof node === 'boolean' || node === '') return null
  if (Array.isArray(node))
    return node.map((item, index) => {
      const itemKey = isValidElement(item)
        ? item.key
        : isSlotDescriptor(item)
          ? item.key
          : undefined
      const key =
        typeof itemKey === 'string' || typeof itemKey === 'number'
          ? itemKey
          : index
      return (
        <Fragment key={key}>
          {renderSlotContent(item, components, renderPrimitive)}
        </Fragment>
      )
    })
  if (isValidElement(node)) return node
  if (typeof node === 'string' || typeof node === 'number')
    return renderPrimitive ? renderPrimitive(node) : node
  if (isSlotDescriptor(node)) {
    const { __componentName__, children, ...props } = node
    if (!Object.prototype.hasOwnProperty.call(components, __componentName__))
      return null
    return createElement(
      components[__componentName__],
      props,
      renderSlotContent(children, components),
    )
  }
  return node as ReactNode
}

/** Whether a slot owns content, without executing consumer components. */
export function hasSlotContent(
  node: unknown,
  options: { trimText?: boolean } = {},
): boolean {
  if (node == null || typeof node === 'boolean' || node === '') return false
  if (options.trimText && typeof node === 'string') return !!node.trim()
  if (Array.isArray(node))
    return node.some((item) => hasSlotContent(item, options))
  if (
    isValidElement<{ children?: ReactNode }>(node) &&
    node.type === Fragment
  ) {
    return hasSlotContent(node.props.children, options)
  }
  return true
}
