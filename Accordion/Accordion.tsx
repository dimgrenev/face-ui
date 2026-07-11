/**
 * Accordion — expandable panel navigation.
 *
 * Also works as a Collapsible with a single item.
 * Flat API: all items rendered from `items` prop.
 *
 * `<Accordion items={[{ value: 'a', label: 'Section A', content: <p>...</p> }]} />`
 * `<Accordion items={[{ value: 'solo', label: 'Toggle', content: <p>...</p> }]} collapsible />`
 */

import React, { Children, Fragment, forwardRef, isValidElement, useId, useMemo, type ReactNode } from 'react'
import { useMachine } from '../assets/adapters/react/use-machine'
import { useControllableMachineProp } from '../assets/adapters/react/use-controllable-machine-prop'
import { accordionMachine, connectAccordion } from '../assets/machines/accordion.machine'
import { cn } from '../assets/utils'
import { RightIcon } from '../assets/icons'
import { Icon } from '../Icon/Icon'
import { Text } from '../Text/Text'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AccordionItem {
  value: string
  label: ReactNode
  icon?: ReactNode
  content: ReactNode
  disabled?: boolean
}

export interface AccordionProps {
  /** Accordion item definitions. */
  items?: AccordionItem[]
  /** Default left icon for item triggers. Individual items can override it with item.icon. */
  icon?: ReactNode
  /** Currently expanded item IDs (controlled). */
  expandedIds?: string[]
  /** Uncontrolled initial expanded item IDs. */
  defaultExpandedIds?: string[]
  /** Allow multiple items to be expanded simultaneously. */
  multiple?: boolean
  /** Allow collapsing the last open item. */
  collapsible?: boolean
  /** Disable the entire accordion. */
  disabled?: boolean
  /** Callback when expanded items change. */
  onExpandedChange?: (details: { expandedIds: string[] }) => void
  /** Additional class name on the root element. */
  className?: string
}

function flattenAccordionContent(content: ReactNode): ReactNode[] {
  if (content == null) return []
  if (isValidElement<{ children?: ReactNode }>(content) && content.type === Fragment) {
    return Children.toArray(content.props.children)
  }
  return Children.toArray(content)
}

function renderAccordionContentNode(node: ReactNode): ReactNode {
  if (node == null) return null
  if (isValidElement(node) || Array.isArray(node)) return node
  if (typeof node === 'string' || typeof node === 'number' || typeof node === 'boolean') {
    return (
      <Text as="div" fullWidth className="uf-accordion-contentText">
        {String(node)}
      </Text>
    )
  }
  return node
}

function getAccordionDomId(instanceId: string, part: 'trigger' | 'content', value: string): string {
  return `accordion:${instanceId}:${part}:${value}`
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const Accordion = forwardRef<HTMLDivElement, AccordionProps>(
  function Accordion(props, ref) {
    const {
      items: rawItems,
      icon,
      expandedIds,
      defaultExpandedIds,
      multiple = true,
      collapsible = true,
      disabled = false,
      onExpandedChange,
      className,
    } = props
    const items = Array.isArray(rawItems) ? rawItems : []
    const isControlledExpanded = Array.isArray(expandedIds)
    const controlledExpandedSig = isControlledExpanded
      ? (expandedIds as any[]).map((id) => String(id)).join('\u0001')
      : ''
    const controlledExpanded = useMemo(
      () => (isControlledExpanded ? (expandedIds as any[]).map((id) => String(id)) : []),
      [isControlledExpanded, controlledExpandedSig],
    )
    const initialExpanded = controlledExpanded.length > 0
      ? controlledExpanded
      : Array.isArray(defaultExpandedIds) && defaultExpandedIds.length > 0
        ? defaultExpandedIds.map((id) => String(id))
        : []
    const machineExpandedIds = useControllableMachineProp(
      isControlledExpanded ? controlledExpanded : undefined,
      initialExpanded,
    )

    const machineOptions: any = {
      expandedIds: machineExpandedIds,
      multiple,
      collapsible,
      disabled,
      onExpandedChange: ((details: { expandedIds: string[] }) => {
        onExpandedChange?.(details)
      }) as any,
    }
    const { state, send } = useMachine(accordionMachine, machineOptions)

    const api = connectAccordion(state, send)
    const accordionInstanceId = useId().replace(/:/g, '')

    return (
      <div ref={ref} {...api.getRootProps()} className={cn('uf-accordion', className)}>
        {items.map((item) => {
          const triggerId = getAccordionDomId(accordionInstanceId, 'trigger', item.value)
          const contentId = getAccordionDomId(accordionInstanceId, 'content', item.value)
          const itemIcon = item.icon === undefined ? icon : item.icon
          const resolvedIcon = typeof itemIcon === 'string'
            ? <Icon name={itemIcon} />
            : itemIcon
          const hasIcon = resolvedIcon != null
          return (
            <div key={item.value} {...api.getItemProps({ value: item.value, disabled: item.disabled })}>
              <span className="uf-membrane uf-membrane--full">
                <button
                  {...api.getTriggerProps({ value: item.value, disabled: item.disabled })}
                  id={triggerId}
                  aria-controls={contentId}
                  data-icon-left={hasIcon ? '' : undefined}
                >
                  {hasIcon && (
                    <span className="uf-accordion-icon" aria-hidden="true">
                      {resolvedIcon}
                    </span>
                  )}
                  <Text as="span" inset="none" membrane={false} className="uf-accordion-label">
                    {item.label}
                  </Text>
                  <Text as="span" inset="none" membrane={false} className="uf-accordion-arrow" aria-hidden="true"><RightIcon /></Text>
                </button>
              </span>
              <div
                {...api.getContentProps({ value: item.value })}
                id={contentId}
                aria-labelledby={triggerId}
                data-icon-left={hasIcon ? '' : undefined}
              >
                <div className="uf-accordion-content-inner">
                  {flattenAccordionContent(item.content).map((node, idx) => (
                    <div className="uf-accordion-slot" key={`${item.value}:slot:${idx}`}>
                      {renderAccordionContentNode(node)}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )
  },
)
