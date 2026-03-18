/**
 * Accordion — expandable panel navigation.
 *
 * Also works as a Collapsible with a single item.
 * Flat API: all items rendered from `items` prop.
 *
 * `<Accordion items={[{ value: 'a', label: 'Section A', content: <p>...</p> }]} />`
 * `<Accordion items={[{ value: 'solo', label: 'Toggle', content: <p>...</p> }]} collapsible />`
 */

import { Children, Fragment, forwardRef, isValidElement, useMemo, type ReactNode } from 'react'
import { useMachine } from '../assets/adapters/react/use-machine'
import { useControllableMachineProp } from '../assets/adapters/react/use-controllable-machine-prop'
import { accordionMachine, connectAccordion } from '../assets/machines/accordion.machine'
import { cn } from '../assets/utils'
import { RightIcon } from '../assets/icons'
import { Button } from '../Button/Button'
import { Text } from '../Text/Text'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AccordionItem {
  value: string
  label: ReactNode
  content: ReactNode
  disabled?: boolean
}

export interface AccordionProps {
  /** Accordion item definitions. */
  items?: AccordionItem[]
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

interface AccordionLegacyProps {
  legacyItems?: Array<{ id?: string; summary: ReactNode; content: ReactNode; isOpen?: boolean; disabled?: boolean }>
  onChange?: (expandedIds: string[]) => void
}

function buildDefaultItems(): AccordionItem[] {
  return [
    {
      value: 'getting-started',
      label: 'Getting Started',
      content: (
        <>
          <Button text="Install package" variant="default" align="left" stretchText membrane />
          <Button text="Quick start" variant="default" align="left" stretchText membrane />
          <Button text="Delete setup" variant="delete" align="left" stretchText membrane />
        </>
      ),
    },
    {
      value: 'usage',
      label: 'Usage Guide',
      content: (
        <>
          <Button text="Basic usage" variant="default" align="left" stretchText membrane />
          <Button text="Advanced usage" variant="default" align="left" stretchText membrane />
        </>
      ),
    },
    {
      value: 'api',
      label: 'API Reference',
      content: (
        <>
          <Button text="Props" variant="default" align="left" stretchText membrane />
          <Button text="Events" variant="default" align="left" stretchText membrane />
        </>
      ),
    },
  ]
}

function flattenAccordionContent(content: ReactNode): ReactNode[] {
  try {
    if (content == null) return []
    if (isValidElement(content) && content.type === Fragment) {
      return Children.toArray((content as any).props?.children)
    }
    return Children.toArray(content)
  } catch {
    return []
  }
}

function renderAccordionContentNode(node: ReactNode): ReactNode {
  if (node == null) return null
  if (isValidElement(node) || Array.isArray(node)) return node
  if (typeof node === 'string' || typeof node === 'number' || typeof node === 'boolean') {
    return (
      <Text as="div" fullWidth>
        {String(node)}
      </Text>
    )
  }
  return node
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const Accordion = forwardRef<HTMLDivElement, AccordionProps>(
  function Accordion(props, ref) {
    const legacyProps = props as AccordionProps & AccordionLegacyProps
    const {
      items: rawItems,
      expandedIds,
      defaultExpandedIds,
      multiple = false,
      collapsible = true,
      disabled = false,
      onExpandedChange,
      className,
    } = props
    const legacyItems = legacyProps.legacyItems
    const legacyOnChange = legacyProps.onChange

    const legacySource = Array.isArray(legacyItems) ? legacyItems : []
    const fromLegacy = legacySource.map((item, index) => ({
        value: String(item.id ?? index),
        label: item.summary,
        content: item.content,
        disabled: item.disabled,
      }))
    const items = Array.isArray(rawItems) && rawItems.length > 0
      ? rawItems
      : (fromLegacy.length > 0 ? fromLegacy : buildDefaultItems())
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
      : legacySource
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => item.isOpen)
        .map(({ item, index }) => String(item.id ?? index))
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
        try { onExpandedChange?.(details) } catch {}
        try { legacyOnChange?.(details.expandedIds) } catch {}
      }) as any,
    }
    const { state, send } = useMachine(accordionMachine, machineOptions)

    const api = connectAccordion(state, send)

    return (
      <div ref={ref} {...api.getRootProps()} className={cn('uf-accordion', className)}>
        {items.map((item) => (
          <div key={item.value} {...api.getItemProps({ value: item.value, disabled: item.disabled })}>
            <span className="uf-membrane uf-membrane--full">
              <button
                {...api.getTriggerProps({ value: item.value, disabled: item.disabled })}
              >
                <Text as="span" inset="none" membrane={false} className="uf-accordion-label">
                  {item.label}
                </Text>
                <Text as="span" inset="none" membrane={false} className="uf-accordion-arrow" aria-hidden="true"><RightIcon /></Text>
              </button>
            </span>
            <div {...api.getContentProps({ value: item.value })}>
              <Text as="div" inset="none" membrane={false} className="uf-accordion-content-inner">
                {flattenAccordionContent(item.content).map((node, idx) => (
                  <div className="uf-accordion-slot" key={`${item.value}:slot:${idx}`}>
                    {renderAccordionContentNode(node)}
                  </div>
                ))}
              </Text>
            </div>
          </div>
        ))}
      </div>
    )
  },
)
