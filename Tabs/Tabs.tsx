/**
 * Tabs — tabbed navigation component.
 *
 * Flat API: all tabs rendered from `items` prop.
 * Supports horizontal/vertical orientation and automatic/manual activation.
 *
 * `<Tabs items={[{ value: 'a', label: 'Alpha', content: <p>Alpha</p> }]} value="a" />`
 */

import { forwardRef, useEffect, useRef, type MouseEvent, type ReactNode } from 'react'
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
  /** Callback fired from the overlay action. */
  onAction?: (details: { value: string; event: MouseEvent<HTMLButtonElement> }) => void
}

interface LegacyTabItem {
  id: string
  label: ReactNode
  content: ReactNode
  disabled?: boolean
}

function renderTabIcon(icon: ReactNode): ReactNode {
  if (icon == null) return null
  if (typeof icon === 'string') return <Icon name={icon} />
  return icon
}

export interface TabsProps {
  /** Tab definitions. Each item supports value, label, content, disabled, panelId, leadingIcon, trailingIcon, and an optional overlay action via actionIcon, actionLabel, actionVisibility, and onAction. */
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
            const leadingIcon = renderTabIcon(item.leadingIcon)
            const trailingIcon = renderTabIcon(item.trailingIcon)
            const actionIcon = renderTabIcon(item.actionIcon)
            const hasAction = actionIcon != null && typeof item.onAction === 'function'
            const actionVisibility = item.actionVisibility === 'always' ? 'always' : 'hover'
            const triggerProps = api.getTriggerProps({ value: item.value, disabled: item.disabled })
            const tabNode = (
              <button
                key={item.value}
                {...triggerProps}
                aria-controls={item.panelId || triggerProps['aria-controls']}
                className={cn('uf-tabs-tab')}
                data-action-overlay={hasAction ? '' : undefined}
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
              >
                {tabNode}
                {hasAction ? (
                  <button
                    type="button"
                    className="uf-tabs-tabAction"
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
                data-membrane-hover=""
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
            return (
              <div
                key={item.value}
                {...contentProps}
                id={item.panelId || contentProps.id}
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
