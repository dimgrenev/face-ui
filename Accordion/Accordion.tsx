/**
 * Accordion — stacked disclosure sections; a single item works as a collapsible.
 *
 * `<Accordion items={[{ value: 'a', label: 'Section A', content: <p>...</p> }]} />`
 * `<Accordion items={items} multiple={false} defaultExpanded={['a']} />`
 */

import {
  Children,
  Fragment,
  forwardRef,
  isValidElement,
  useId,
  type HTMLAttributes,
  type ReactNode,
} from 'react'
import { composeHandlers } from '../assets/adapters/react/merge-props'
import { useControllableState } from '../assets/adapters/react/use-controllable-state'
import { useRovingFocus } from '../assets/adapters/react/use-roving-focus'
import { Membrane } from '../assets/adapters/react/Membrane'
import { domId, readCollection, readKeys } from '../assets/runtime/collection'
import { readNumber } from '../assets/runtime/props'
import { hasSlotContent } from '../assets/slot-content'
import { RightIcon } from '../assets/icons'
import { cn } from '../assets/utils'
import { Icon } from '../Icon/Icon'
import { Text } from '../Text/Text'

export interface AccordionItem {
  /** Unique, stable section identity; unrelated to the generated DOM id. */
  value: string
  /** Trigger content and the section's accessible name; keep it noninteractive. */
  label: ReactNode
  /** Replaces the shared `icon` for this section; `null`, `false` or empty content removes it. */
  icon?: ReactNode
  /** Panel contents; they stay mounted while collapsed and React keys keep their identity. */
  content: ReactNode
  /** Disables this section's trigger; the panel's own controls keep their interactivity. */
  disabled?: boolean
  /** Exposes the panel as a region landmark named by its trigger; use it for a few complex panels. */
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
  /** Sections in order; an item without a string `value`, or repeating one, is dropped. */
  items?: readonly AccordionItem[]
  /** Decorative icon (an icon name or a node) at the start of every trigger; `item.icon` overrides it. */
  icon?: ReactNode
  /** Values of the open sections (controlled); values without a section are kept for items that arrive later. */
  expanded?: readonly string[]
  /** Values of the sections open on mount (uncontrolled); later changes are ignored. */
  defaultExpanded?: readonly string[]
  /** Called once per user toggle with the open values; never for prop updates. */
  onExpandedChange?: (details: {
    /** Values of the open sections after the toggle, in a new array; at most one unless `multiple`. */
    expanded: string[]
  }) => void
  /** Lets several sections stay open; when false, opening one closes the other and only the first open value shows. */
  multiple?: boolean
  /** Lets the user close the last open section; when false its trigger is `aria-disabled` while open. */
  collapsible?: boolean
  /** Disables every trigger; panel contents keep their own interactivity. */
  disabled?: boolean
  /** The `aria-level` of every trigger's heading, an integer from 1 to 6. */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6
  /** Additional class name on the root element. */
  className?: string
}

function flattenContent(content: ReactNode): ReactNode[] {
  if (
    isValidElement<{ children?: ReactNode }>(content) &&
    content.type === Fragment
  )
    return Children.toArray(content.props.children)
  return Children.toArray(content)
}

function renderContentNode(node: ReactNode): ReactNode {
  if (typeof node === 'string' || typeof node === 'number')
    return (
      <Text as="div" fullWidth className="uf-accordion-contentText">
        {String(node)}
      </Text>
    )
  return node
}

/** Stacked disclosure sections with one or several open at a time. */
export const Accordion = forwardRef<HTMLDivElement, AccordionProps>(
  function Accordion(
    {
      items,
      icon,
      expanded,
      defaultExpanded,
      onExpandedChange,
      multiple = true,
      collapsible = true,
      disabled = false,
      headingLevel = 3,
      className,
      onKeyDown,
      onFocus,
      onBlur,
      ...nativeProps
    },
    ref,
  ) {
    const collection = readCollection<AccordionItem>(items, {
      component: 'Accordion',
      key: (item) => item.value,
    })
    const { keys } = collection
    const level = readNumber('Accordion', 'headingLevel', headingLevel, 3, {
      integer: true,
      min: 1,
      max: 6,
    })
    const [stored, setStored] = useControllableState<readonly string[]>({
      value:
        expanded === undefined
          ? undefined
          : readKeys(expanded, 'Accordion', 'expanded'),
      defaultValue: () =>
        readKeys(defaultExpanded, 'Accordion', 'defaultExpanded'),
      onChange: (next) =>
        onExpandedChange?.({ expanded: next as string[] }),
      name: ['Accordion', 'expanded'],
    })
    // The stored values stay as given; only sections that exist show open, one of them unless `multiple`.
    const project = (values: readonly string[]) => {
      const present = values.filter((value) => keys.includes(value))
      return multiple ? present : present.slice(0, 1)
    }
    const open = project(stored)
    const toggle = (value: string) =>
      setStored((current) => {
        const shown = project(current)
        if (!shown.includes(value)) return multiple ? [...shown, value] : [value]
        return collapsible || shown.length > 1
          ? shown.filter((key) => key !== value)
          : current
      })
    const roving = useRovingFocus({
      keys,
      disabled: (key) => disabled || !!collection.get(key)?.disabled,
      orientation: 'vertical',
      tabStops: 'all',
    })
    const scope = `accordion-${useId()}`

    return (
      <div
        {...nativeProps}
        ref={ref}
        data-scope="accordion"
        data-part="root"
        className={cn('uf-accordion', className)}
        onKeyDown={composeHandlers(onKeyDown, roving.root.onKeyDown)}
        onFocus={composeHandlers(onFocus, roving.root.onFocus)}
        onBlur={composeHandlers(onBlur, roving.root.onBlur)}
      >
        {collection.children(null).map(({ key, item, disabled: off }) => {
          const isOpen = open.includes(key)
          const state = isOpen ? 'open' : 'closed'
          const inactive = disabled || off
          const locked = isOpen && !collapsible && open.length === 1
          const triggerId = domId(scope, 'trigger', key)
          const contentId = domId(scope, 'content', key)
          const itemIcon = item.icon === undefined ? icon : item.icon
          const hasIcon = hasSlotContent(itemIcon)
          return (
            <div
              key={key}
              data-scope="accordion"
              data-part="item"
              data-state={state}
              data-value={key}
            >
              <Membrane
                as="div"
                fullWidth
                interactive
                role="heading"
                aria-level={level}
              >
                <button
                  {...roving.item(key)}
                  type="button"
                  id={triggerId}
                  data-scope="accordion"
                  data-part="trigger"
                  data-state={state}
                  data-value={key}
                  data-icon-start={hasIcon ? '' : undefined}
                  aria-expanded={isOpen}
                  aria-controls={contentId}
                  aria-disabled={inactive || locked || undefined}
                  disabled={inactive}
                  onClick={(event) => {
                    if (!event.defaultPrevented) toggle(key)
                  }}
                >
                  {hasIcon && (
                    <span className="uf-accordion-icon" aria-hidden="true">
                      {typeof itemIcon === 'string' ? (
                        <Icon name={itemIcon} />
                      ) : (
                        itemIcon
                      )}
                    </span>
                  )}
                  <span className="uf-accordion-label">{item.label}</span>
                  <span className="uf-accordion-arrow" aria-hidden="true">
                    <RightIcon />
                  </span>
                </button>
              </Membrane>
              <div
                id={contentId}
                data-scope="accordion"
                data-part="content"
                data-state={state}
                role={item.region ? 'region' : undefined}
                aria-labelledby={item.region ? triggerId : undefined}
                hidden={!isOpen}
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
                  {flattenContent(item.content).map((node, index) => (
                    <div
                      className="uf-accordion-slot"
                      key={isValidElement(node) ? node.key : index}
                    >
                      {renderContentNode(node)}
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
