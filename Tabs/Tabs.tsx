/**
 * Tabs — tabbed navigation component.
 *
 * Flat API: all tabs rendered from `items` prop.
 * Supports horizontal/vertical orientation and automatic/manual activation.
 *
 * `<Tabs items={[{ value: 'a', label: 'Alpha', content: <p>Alpha</p> }]} value="a" />`
 */

import { forwardRef, useEffect, useRef, type ReactNode } from 'react'
import { useMachine } from '../assets/adapters/react/use-machine'
import { useControllableMachineProp } from '../assets/adapters/react/use-controllable-machine-prop'
import { tabsMachine, connectTabs } from '../assets/machines/tabs.machine'
import { cn } from '../assets/utils'
import { Text } from '../Text/Text'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TabItem {
  value: string
  label: ReactNode
  content: ReactNode
  disabled?: boolean
}

interface LegacyTabItem {
  id: string
  label: ReactNode
  content: ReactNode
  disabled?: boolean
}

export interface TabsProps {
  /** Tab definitions. */
  items?: TabItem[]
  /** Legacy tabs alias. */
  tabs?: LegacyTabItem[]
  /** Currently selected tab value. */
  value?: string
  /** Legacy active tab alias. */
  activeTab?: string
  /** Uncontrolled initial tab value. */
  defaultValue?: string
  /** Legacy default active tab alias. */
  defaultActiveTab?: string
  /** Orientation of the tab list. */
  orientation?: 'horizontal' | 'vertical'
  /** Activation mode: automatic selects on focus, manual requires click/Enter. */
  activationMode?: 'automatic' | 'manual'
  /** Disable the entire tab group. */
  disabled?: boolean
  /** Callback when the selected tab changes. */
  onValueChange?: (details: { value: string }) => void
  /** Legacy onChange alias. */
  onChange?: (id: string) => void
  /** components API compatibility (visual variants are styled via classes). */
  withLine?: boolean
  wrap?: boolean
  /** Outer membrane wrapper (+1px outside each tab trigger). */
  membrane?: boolean
  /** Additional class name on the root element. */
  className?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const Tabs = forwardRef<HTMLDivElement, TabsProps>(
  function Tabs(props, ref) {
    const {
      items: rawItems,
      value,
      defaultValue,
      orientation = 'horizontal',
      activationMode = 'automatic',
      disabled = false,
      onValueChange,
      withLine = false,
      wrap = false,
      membrane = true,
      className,
    } = props
    const rawTabs = props.tabs
    const legacyOnChange = props.onChange

    const itemsFromTabs: TabItem[] = Array.isArray(rawTabs)
      ? rawTabs.map((item) => ({
        value: String(item.id),
        label: item.label,
        content: item.content,
        disabled: item.disabled,
      }))
      : []
    const items = Array.isArray(rawItems) && rawItems.length > 0 ? rawItems : itemsFromTabs
    const controlledValue = typeof props.activeTab === 'string' ? props.activeTab : value
    const machineValue = useControllableMachineProp(
      controlledValue,
      defaultValue ?? props.defaultActiveTab ?? (items.length > 0 ? items[0].value : ''),
    )
    const itemOrder = items.map((item) => item.value)
    const disabledValues = items.filter((item) => item.disabled).map((item) => item.value)

    const { state, send } = useMachine(tabsMachine, {
      value: machineValue,
      itemOrder,
      disabledValues,
      orientation,
      activationMode,
      disabled,
      onValueChange: ((details: { value: string }) => {
        try { onValueChange?.(details) } catch {}
        try { legacyOnChange?.(details.value) } catch {}
      }) as any,
    })

    const api = connectTabs(state, send)
    const rootRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
      const targetValue = state.context.focusedValue
      if (!targetValue) return
      const root = rootRef.current
      if (!root) return
      const triggers = root.querySelectorAll<HTMLElement>('[role="tab"][data-value]')
      for (const trigger of triggers) {
        if (trigger.getAttribute('data-value') !== targetValue) continue
        if (trigger !== document.activeElement) {
          try { trigger.focus() } catch {}
        }
        try { trigger.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' }) } catch {}
        break
      }
    }, [state.context.focusedValue])

    return (
      <div
        ref={(node) => {
          rootRef.current = node
          if (typeof ref === 'function') ref(node)
          else if (ref) (ref as any).current = node
        }}
        {...api.getRootProps()}
        className={cn('uf-tabs', withLine && 'uf-tabs--withLine', wrap && 'uf-tabs--wrap', className)}
      >
        <div {...api.getListProps()} className={cn('uf-tabs-header')}>
          {items.map((item) => {
            const tabNode = (
              <button
                key={item.value}
                {...api.getTriggerProps({ value: item.value, disabled: item.disabled })}
                className={cn('uf-tabs-tab')}
              >
                {item.label}
              </button>
            )
            if (!membrane) return tabNode
            return (
              <span
                key={`tab-membrane:${item.value}`}
                className="uf-membrane"
                data-membrane-interactive=""
                data-membrane-hover=""
              >
                {tabNode}
              </span>
            )
          })}
          {withLine ? <div className="uf-tabs-indicator" aria-hidden="true" /> : null}
        </div>
        {items.map((item) => (
          <div key={item.value} {...api.getContentProps({ value: item.value })} className={cn('uf-tabs-content')}>
            {(typeof item.content === 'string' || typeof item.content === 'number')
              ? (
                <Text as="div" fullWidth>
                  {item.content}
                </Text>
                )
              : item.content}
          </div>
        ))}
      </div>
    )
  },
)
