/**
 * Tabs — tabbed navigation component.
 *
 * Flat API: all tabs rendered from `items` prop.
 * Supports horizontal/vertical orientation and automatic/manual activation.
 *
 * `<Tabs items={[{ value: 'a', label: 'Alpha', content: <p>Alpha</p> }]} value="a" />`
 */

import { forwardRef, useEffect, useId, useRef, type MouseEvent, type ReactNode } from 'react'
import { useMachine } from '../assets/adapters/react/use-machine'
import { useControllableMachineProp } from '../assets/adapters/react/use-controllable-machine-prop'
import { tabsMachine, connectTabs } from '../assets/machines/tabs.machine'
import { cn } from '../assets/utils'
import { Icon } from '../Icon/Icon'
import { Text } from '../Text/Text'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TabItem {
  value: string
  label: ReactNode
  content: ReactNode
  disabled?: boolean
  /** Optional content panel id, useful when panels are rendered outside Tabs. */
  panelId?: string
  /** Optional icon rendered before the label. */
  leadingIcon?: ReactNode
  /** Optional icon rendered after the label. */
  trailingIcon?: ReactNode
  /** Optional overlay action icon rendered at the end of the tab trigger. */
  actionIcon?: ReactNode
  /** Accessible label for the overlay action. */
  actionLabel?: string
  /** Optional native title for the overlay action. */
  actionTitle?: string
  /** Disable only the overlay action. */
  actionDisabled?: boolean
  /** Overlay action visibility. Defaults to hover/focus. */
  actionVisibility?: 'hover' | 'always'
  /** Overlay action position. Defaults to the trailing edge. */
  actionPosition?: 'right' | 'left-overlay'
  /** Callback fired from the overlay action. */
  onAction?: (details: { value: string; event: MouseEvent<HTMLButtonElement> }) => void
}

function renderTabIcon(icon: ReactNode): ReactNode {
  if (icon == null) return null
  if (typeof icon === 'string') return <Icon name={icon} />
  return icon
}

export interface TabsProps {
  /** Tab definitions. Each item supports value, label, content, disabled, panelId, leadingIcon, trailingIcon, and an optional overlay action via actionIcon, actionLabel, actionVisibility, actionPosition, and onAction. */
  items?: TabItem[]
  /** Currently selected tab value. */
  value?: string
  /** Uncontrolled initial tab value. */
  defaultValue?: string
  /** Orientation of the tab list. */
  orientation?: 'horizontal' | 'vertical'
  /** Activation mode: automatic selects on focus, manual requires click/Enter. */
  activationMode?: 'automatic' | 'manual'
  /** Disable the entire tab group. */
  disabled?: boolean
  /** Callback when the selected tab changes. */
  onValueChange?: (details: { value: string }) => void
  /** Render the active-tab indicator line. */
  withLine?: boolean
  /** Allow tab triggers to wrap onto multiple rows. */
  wrap?: boolean
  /** Outer membrane wrapper around each tab trigger. */
  membrane?: boolean
  /** Render internal content panels. Set false when panels are rendered outside Tabs. */
  renderPanels?: boolean
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
      renderPanels = true,
      className,
    } = props
    const items = Array.isArray(rawItems) ? rawItems : []
    const controlledValue = value
    const itemOrder = items.map((item) => item.value)
    const disabledValues = items.filter((item) => item.disabled).map((item) => item.value)
    const firstEnabledValue = items.find((item) => !item.disabled)?.value ?? ''
    const defaultMachineValue = defaultValue ?? firstEnabledValue
    const isControlled = controlledValue !== undefined
    const machineValue = useControllableMachineProp(controlledValue, defaultMachineValue)
    const itemOrderSignature = itemOrder.join('\u0001')
    const disabledValuesSignature = disabledValues.join('\u0001')

    const { state, send } = useMachine(tabsMachine, {
      value: machineValue,
      itemOrder,
      disabledValues,
      orientation,
      activationMode,
      disabled,
      onValueChange: ((details: { value: string }) => {
        if (isControlled && details.value === controlledValue) {
          return
        }
        onValueChange?.(details)
      }) as any,
    })

    const api = connectTabs(state, send)
    const rootRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
      if (isControlled) return
      if (!firstEnabledValue) return
      const currentValue = state.context.value
      if (itemOrder.includes(currentValue) && !disabledValues.includes(currentValue)) return
      send({ type: 'SET_VALUE', value: firstEnabledValue })
    }, [disabledValuesSignature, firstEnabledValue, isControlled, itemOrderSignature, send, state.context.value])

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

    const instanceId = useId().replace(/:/g, '')

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
            const leadingIcon = renderTabIcon(item.leadingIcon)
            const trailingIcon = renderTabIcon(item.trailingIcon)
            const actionIcon = renderTabIcon(item.actionIcon)
            const hasAction = actionIcon != null && typeof item.onAction === 'function'
            const actionVisibility = item.actionVisibility === 'always' ? 'always' : 'hover'
            const actionPosition = item.actionPosition === 'left-overlay' ? 'left-overlay' : 'right'
            const triggerProps = api.getTriggerProps({ value: item.value, disabled: item.disabled })
            const triggerId = `tabs:${instanceId}:trigger:${item.value}`
            const panelId = item.panelId || `tabs:${instanceId}:content:${item.value}`
            const tabNode = (
              <button
                key={item.value}
                {...triggerProps}
                id={triggerId}
                aria-controls={panelId}
                className={cn('uf-tabs-tab')}
                data-action-overlay={hasAction ? '' : undefined}
                data-action-position={hasAction ? actionPosition : undefined}
              >
                {leadingIcon != null ? (
                  <span className="uf-tabs-tabIcon" data-position="left">
                    {leadingIcon}
                  </span>
                ) : null}
                <span className="uf-tabs-tabLabel">
                  {typeof item.label === 'string'
                    ? <Text as="span" inset="none" membrane={false}>{item.label}</Text>
                    : item.label}
                </span>
                {trailingIcon != null ? (
                  <span className="uf-tabs-tabIcon" data-position="right">
                    {trailingIcon}
                  </span>
                ) : null}
              </button>
            )
            const tabWithAction = (
              <span
                key={`tab-slot:${item.value}`}
                className="uf-tabs-tabSlot"
                data-action-overlay={hasAction ? '' : undefined}
                data-action-visibility={hasAction ? actionVisibility : undefined}
                data-action-position={hasAction ? actionPosition : undefined}
              >
                {tabNode}
                {hasAction ? (
                  <button
                    type="button"
                    className="uf-tabs-tabAction"
                    data-action-position={actionPosition}
                    aria-label={item.actionLabel || `Tab action: ${item.value}`}
                    title={item.actionTitle || item.actionLabel}
                    disabled={item.actionDisabled || item.disabled}
                    onClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      if (item.actionDisabled || item.disabled) return
                      item.onAction?.({ value: item.value, event })
                    }}
                  >
                    <span className="uf-tabs-tabActionIcon">
                      {actionIcon}
                    </span>
                  </button>
                ) : null}
              </span>
            )
            if (!membrane) return tabWithAction
            return (
              <span
                key={`tab-membrane:${item.value}`}
                className="uf-membrane"
                data-membrane-interactive=""
              >
                {tabWithAction}
              </span>
            )
          })}
          {withLine ? <div className="uf-tabs-indicator" aria-hidden="true" /> : null}
        </div>
        {renderPanels
          ? items.map((item) => {
            const contentProps = api.getContentProps({ value: item.value })
            const triggerId = `tabs:${instanceId}:trigger:${item.value}`
            const panelId = item.panelId || `tabs:${instanceId}:content:${item.value}`
            return (
              <div
                key={item.value}
                {...contentProps}
                id={panelId}
                aria-labelledby={triggerId}
                className={cn('uf-tabs-content')}
              >
                {(typeof item.content === 'string' || typeof item.content === 'number')
                  ? (
                    <Text as="div" fullWidth>
                      {item.content}
                    </Text>
                    )
                  : item.content}
              </div>
            )
          })
          : null}
      </div>
    )
  },
)
