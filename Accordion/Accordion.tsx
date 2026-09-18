/**
 * Accordion — expandable panel navigation.
 *
 * Also works as a Collapsible with a single item.
 * Flat API: all items rendered from `items` prop.
 *
 * `<Accordion items={[{ value: 'a', label: 'Section A', content: <p>...</p> }]} />`
 * `<Accordion items={[{ value: 'solo', label: 'Toggle', content: <p>...</p> }]} collapsible />`
 */

import {
  Children,
  Fragment,
  forwardRef,
  isValidElement,
  useId,
  useState,
  useEffect,
  useRef,
  type ReactNode,
  type HTMLAttributes,
} from 'react'
import { useMachine } from '../assets/adapters/react/use-machine'
import { useControllableMachineProp } from '../assets/adapters/react/use-controllable-machine-prop'
import {
  accordionMachine,
  connectAccordion,
} from '../assets/machines/accordion.machine'
import { cn } from '../assets/utils'
import { RightIcon } from '../assets/icons'
import { Icon } from '../Icon/Icon'
import { Text } from '../Text/Text'
import { Membrane } from '../assets/adapters/react/Membrane'
import { hasSlotContent } from '../assets/slot-content'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AccordionItem {
  /** Unique, stable section identity; unrelated to the generated DOM ID. */
  value: string
  /** Nonempty, noninteractive trigger content and accessible name. */
  label: ReactNode
  /** Override the shared icon; null/false/empty content removes it. */
  icon?: ReactNode
  /** Panel contents remain mounted when collapsed; React keys retain identity. */
  content: ReactNode
  /** Disable this disclosure trigger; contents keep their own interactivity. */
  disabled?: boolean
  /** Expose this panel as a named region landmark. Use selectively for complex panels. */
  region?: boolean
}

export interface AccordionProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  | 'children'
  | 'dangerouslySetInnerHTML'
  | 'defaultValue'
  | 'defaultChecked'
  | 'autoFocus'
  | 'contentEditable'
  | 'suppressContentEditableWarning'
> {
  /** Ordered section definitions with unique string values. */
  items?: readonly AccordionItem[]
  /** Default decorative icon at the start of each trigger; item.icon overrides it. */
  icon?: ReactNode
  /** Controlled section values; absent items are retained for asynchronous lists. */
  expandedIds?: readonly string[]
  /** Initial uncontrolled section values; later changes are ignored. */
  defaultExpandedIds?: readonly string[]
  /** Allow multiple open sections; false displays the first available expanded value. */
  multiple?: boolean
  /** Allow users to collapse the last visible open section; does not auto-open a section. */
  collapsible?: boolean
  /** Disable all disclosure triggers; panel contents keep their own interactivity. */
  disabled?: boolean
  /** Heading level for section triggers in the containing document. */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6
  /** User changes only; receives existing section values in a new array. */
  onExpandedChange?: (details: { expandedIds: string[] }) => void
  /** Additional class name on the root element. */
  className?: string
}

function readExpandedIds(value: unknown, prop: string): readonly string[] {
  if (value === undefined) return []
  const ids = Array.isArray(value) ? [...value] : null
  if (!ids || ids.some((id) => typeof id !== 'string'))
    throw new TypeError(`Accordion ${prop} must be an array of strings`)
  return ids
}

function readItems(value: AccordionProps['items']): readonly AccordionItem[] {
  if (value === undefined) return []
  if (!Array.isArray(value))
    throw new TypeError('Accordion items must be an array')
  const values = new Set<string>()
  for (const item of value) {
    if (!item || typeof item.value !== 'string')
      throw new TypeError('Accordion items must have string values')
    if (values.has(item.value))
      throw new TypeError('Accordion item values must be unique')
    if (
      !hasSlotContent(item.label) ||
      (typeof item.label === 'string' && !item.label.trim())
    )
      throw new TypeError('Accordion item labels must contain content')
    values.add(item.value)
  }
  return value
}

function flattenAccordionContent(content: ReactNode): ReactNode[] {
  if (content == null) return []
  if (
    isValidElement<{ children?: ReactNode }>(content) &&
    content.type === Fragment
  ) {
    return Children.toArray(content.props.children)
  }
  return Children.toArray(content)
}

function renderAccordionContentNode(node: ReactNode): ReactNode {
  if (node == null) return null
  if (isValidElement(node) || Array.isArray(node)) return node
  if (
    typeof node === 'string' ||
    typeof node === 'number' ||
    typeof node === 'boolean'
  ) {
    return (
      <Text as="div" fullWidth className="uf-accordion-contentText">
        {String(node)}
      </Text>
    )
  }
  return node
}

function getAccordionDomId(
  instanceId: string,
  part: 'trigger' | 'content',
  value: string,
): string {
  // Escape the escape marker too, so arbitrary UTF-16 strings remain distinct.
  const token = value.replace(
    /[^a-zA-Z0-9-]/g,
    (character) => `_${character.charCodeAt(0).toString(16)}_`,
  )
  return `accordion:${instanceId}:${part}:${token}`
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
      headingLevel = 3,
      onExpandedChange,
      className,
      ...nativeProps
    } = props
    const items = readItems(rawItems)
    if (!Number.isInteger(headingLevel) || headingLevel < 1 || headingLevel > 6)
      throw new RangeError(
        'Accordion headingLevel must be an integer from 1 to 6',
      )
    const controlledExpanded =
      expandedIds === undefined
        ? undefined
        : readExpandedIds(expandedIds, 'expandedIds')
    const [initialExpanded] = useState(
      () =>
        controlledExpanded ??
        readExpandedIds(defaultExpandedIds, 'defaultExpandedIds'),
    )
    const machineExpandedIds = useControllableMachineProp(
      controlledExpanded,
      initialExpanded,
    )

    const { state, send } = useMachine(accordionMachine, {
      expandedIds: machineExpandedIds,
      itemValues: items.map((item) => item.value),
      enabledValues: items
        .filter((item) => !item.disabled)
        .map((item) => item.value),
      multiple,
      collapsible,
      disabled,
      onExpandedChange: (details) => {
        onExpandedChange?.(details)
      },
    })

    const triggerRefs = useRef(new Map<string, HTMLButtonElement>())
    const previousValues = useRef(items.map((item) => item.value))
    useEffect(() => {
      const value = state.context.focusedValue
      if (value !== null) {
        let target = triggerRefs.current.get(value)
        if (disabled) target = undefined
        else if (!target || target.disabled) {
          const index = Math.max(0, previousValues.current.indexOf(value))
          const next =
            items.slice(index).find((item) => !item.disabled) ??
            items
              .slice(0, index)
              .reverse()
              .find((item) => !item.disabled)
          target = next ? triggerRefs.current.get(next.value) : undefined
        }
        if (target) target.focus()
        else send({ type: 'BLUR' })
      }
      previousValues.current = items.map((item) => item.value)
    }, [state.context.focusedValue, items, disabled, send])
    const api = connectAccordion(state, send)
    const accordionInstanceId = useId().replace(/:/g, '')

    return (
      <div
        {...nativeProps}
        ref={ref}
        {...api.getRootProps()}
        className={cn('uf-accordion', className)}
      >
        {items.map((item) => {
          const triggerId = getAccordionDomId(
            accordionInstanceId,
            'trigger',
            item.value,
          )
          const contentId = getAccordionDomId(
            accordionInstanceId,
            'content',
            item.value,
          )
          const itemIcon = item.icon === undefined ? icon : item.icon
          const hasIcon = hasSlotContent(itemIcon)
          const resolvedIcon =
            typeof itemIcon === 'string' ? <Icon name={itemIcon} /> : itemIcon
          return (
            <div
              key={item.value}
              {...api.getItemProps({
                value: item.value,
              })}
            >
              <Membrane
                as="div"
                fullWidth
                interactive
                role="heading"
                aria-level={headingLevel}
              >
                <button
                  {...api.getTriggerProps({
                    value: item.value,
                    disabled: item.disabled,
                  })}
                  ref={(node) => {
                    if (node) triggerRefs.current.set(item.value, node)
                    else triggerRefs.current.delete(item.value)
                  }}
                  id={triggerId}
                  aria-controls={contentId}
                  data-icon-start={hasIcon ? '' : undefined}
                >
                  {hasIcon && (
                    <span className="uf-accordion-icon" aria-hidden="true">
                      {resolvedIcon}
                    </span>
                  )}
                  <span className="uf-accordion-label">{item.label}</span>
                  <span className="uf-accordion-arrow" aria-hidden="true">
                    <RightIcon />
                  </span>
                </button>
              </Membrane>
              <div
                {...api.getContentProps({
                  value: item.value,
                  region: item.region,
                })}
                id={contentId}
                aria-labelledby={item.region ? triggerId : undefined}
              >
                <div
                  className="uf-accordion-content-inner"
                  key={
                    isValidElement(item.content) &&
                    item.content.type === Fragment
                      ? item.content.key
                      : undefined
                  }
                >
                  {flattenAccordionContent(item.content).map((node, idx) => (
                    <div
                      className="uf-accordion-slot"
                      key={isValidElement(node) ? node.key : idx}
                    >
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
