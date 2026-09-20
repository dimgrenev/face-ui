import {
  forwardRef,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from 'react'
import { cn } from '../assets/utils'
import { Icon } from '../Icon/Icon'
import { Text } from '../Text/Text'
import { Membrane } from '../assets/adapters/react/Membrane'
import { inertProp } from '../assets/adapters/react/inert-prop'
import { composeHandlers } from '../assets/adapters/react/merge-props'
import { useControllableState } from '../assets/adapters/react/use-controllable-state'
import { useIsomorphicLayoutEffect } from '../assets/adapters/react/use-isomorphic-layout-effect'
import { useRovingFocus } from '../assets/adapters/react/use-roving-focus'
import type { CollectionItem } from '../assets/internal/item'
import { domId, nearest, readCollection } from '../assets/runtime/collection'
import { invalidProp } from '../assets/runtime/props'
import { hasSlotContent } from '../assets/slot-content'

export interface TabItem
  extends Omit<CollectionItem, 'textValue'>,
    Pick<
      ButtonHTMLAttributes<HTMLButtonElement>,
      'id' | 'title' | 'aria-label' | 'aria-labelledby' | 'aria-describedby'
    > {
  /** Visible noninteractive tab content; name an icon-only tab with `aria-label`. */
  label: ReactNode
  /** Icon before the label; a string is a registered icon name. */
  icon?: ReactNode
  /** Keeps the tab out of activation and arrow navigation; a selected disabled tab still shows its panel. */
  disabled?: boolean
  /** Persistent panel content; hidden panels stay mounted. */
  content?: ReactNode
  /** Id of the rendered panel; generated when omitted. */
  panelId?: string
}
export type ExternalTabItem = Omit<TabItem, 'content' | 'panelId'> & {
  /** Id of the consumer's tabpanel this tab controls. */
  panelId: string
  content?: never
}
interface TabsBaseProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  | 'children'
  | 'dangerouslySetInnerHTML'
  | 'defaultValue'
  | 'defaultChecked'
  | 'role'
  | 'aria-orientation'
  | 'aria-disabled'
  | 'aria-selected'
  | 'autoFocus'
> {
  /** Controlled selected key; a key missing from `items` shows the first enabled tab until it appears. */
  value?: string
  /** Selected key on mount, else the first enabled tab; a key that `items` do not contain yet waits for them. */
  defaultValue?: string
  /** Axis of the tab list and of its arrow keys. */
  orientation?: 'horizontal' | 'vertical'
  /** Automatic selects the tab an arrow key reaches; manual waits for a click, Space or Enter. */
  activationMode?: 'automatic' | 'manual'
  /** Disables the tabs and header actions; the selected panel stays visible. */
  disabled?: boolean
  /** Called once per user selection; `value` updates and recovery from a removed tab never call it. */
  onValueChange?: (details: { value: string }) => void
  /** Pill background or an underline that follows the selected tab's geometry. */
  variant?: 'pill' | 'underline'
  /** Wraps the tab list instead of scrolling along its axis. */
  wrap?: boolean
  /** Shared outer spacing around each tab; toggling preserves DOM and focus. */
  membrane?: boolean
  /** Header controls outside the tablist, such as New, Close selected or More. */
  actions?: ReactNode
  /** Focuses the selected enabled tab, else the first enabled one, once on mount. */
  autoFocus?: boolean
  /** Accessible name of the tablist, not the generic outer wrapper. */
  'aria-label'?: string
  /** Visible heading IDs naming the tablist. */
  'aria-labelledby'?: string
  /** Additional description IDs for the tablist. */
  'aria-describedby'?: string
}
export type TabsProps = TabsBaseProps &
  (
    | {
        /** Renders a persistent panel per tab; `false` leaves panels to the consumer, referenced by each item's `panelId`. */
        renderPanels?: true
        /** The tabs in order, keyed by `value`: label, icon, content, disabled, panelId and native naming (id, title, aria-*). */
        items?: readonly TabItem[]
      }
    | {
        /** Renders a persistent panel per tab; `false` leaves panels to the consumer, referenced by each item's `panelId`. */
        renderPanels: false
        /** The tabs in order, keyed by `value`: label, icon, content, disabled, panelId and native naming (id, title, aria-*). */
        items?: readonly ExternalTabItem[]
      }
  )

/** Tabs that show one content panel at a time; header actions stay ordinary controls. */
export const Tabs = forwardRef<HTMLDivElement, TabsProps>(
  function Tabs(props, ref) {
    const {
      items = [],
      value,
      defaultValue,
      orientation = 'horizontal',
      activationMode = 'automatic',
      disabled = false,
      onValueChange,
      variant = 'pill',
      wrap = false,
      membrane = true,
      renderPanels = true,
      actions,
      autoFocus = false,
      className,
      'aria-label': label,
      'aria-labelledby': labelledBy,
      'aria-describedby': describedBy,
      onClick,
      onKeyDown,
      onFocus,
      onBlur,
      ...nativeProps
    } = props
    const collection = readCollection<TabItem>(items, {
      component: 'Tabs',
      key: (item) => item.value,
    })
    const { keys } = collection
    const enabled = (key: string) => collection.get(key)?.disabled === false
    const firstEnabled = keys.find(enabled) ?? null
    const [current, setValue, replaceValue] = useControllableState<
      string | null
    >({
      value,
      defaultValue: () => defaultValue ?? firstEnabled,
      onChange: (next) => onValueChange?.({ value: next as string }),
      name: ['Tabs', 'value'],
    })
    // Only a removal moves an uncontrolled selection, to its enabled neighbour; a key that is
    // not there yet (async or momentarily empty items) keeps waiting while the first tab shows.
    const previous = useRef(keys)
    const lost =
      value === undefined &&
      current !== null &&
      keys.length > 0 &&
      !keys.includes(current) &&
      previous.current.includes(current)
    const neighbour = (key: string) => {
      const at = keys.indexOf(nearest(previous.current, keys, key)!)
      return (
        [...keys.slice(at), ...keys.slice(0, at).reverse()].find(enabled) ??
        null
      )
    }
    const selected =
      current !== null && keys.includes(current)
        ? current
        : lost
          ? neighbour(current!)
          : firstEnabled
    useIsomorphicLayoutEffect(() => {
      if (lost) replaceValue(selected)
      previous.current = keys
    })

    const listRef = useRef<HTMLDivElement>(null)
    const roving = useRovingFocus({
      keys,
      disabled: (key) => disabled || !enabled(key),
      active: selected,
      orientation,
      activateOnMove: activationMode === 'automatic',
      scrollRef: listRef,
      autoFocus,
    })
    const select = (event: MouseEvent<HTMLDivElement>) => {
      const tab = (event.target as Element).closest?.('[role="tab"]') ?? null
      const key = roving.keyOf(tab)
      if (key !== null && !event.defaultPrevented && !tab!.matches(':disabled'))
        setValue(key)
    }

    const scope = `tabs-${useId()}`
    const tabId = (item: TabItem, key: string) =>
      item.id || domId(scope, 'tab', key)
    const panelId = (item: TabItem, key: string) =>
      item.panelId || domId(scope, 'panel', key)
    const controls = (item: TabItem, key: string) => {
      if (renderPanels) return panelId(item, key)
      if (!item.panelId)
        invalidProp(
          'Tabs',
          'items[].panelId',
          item.panelId,
          `rendering tab ${JSON.stringify(key)} without aria-controls`,
        )
      return item.panelId || undefined
    }
    const entries = collection.children(null)
    return (
      <div
        {...nativeProps}
        ref={ref}
        className={cn('uf-tabs', className)}
        data-scope="tabs"
        data-part="root"
        data-orientation={orientation}
        data-variant={variant}
        data-wrap={wrap || undefined}
        data-disabled={disabled || undefined}
        onClick={composeHandlers(onClick, select)}
        onKeyDown={composeHandlers(onKeyDown, roving.root.onKeyDown)}
        onFocus={composeHandlers(onFocus, roving.root.onFocus)}
        onBlur={composeHandlers(onBlur, roving.root.onBlur)}
      >
        <div
          ref={listRef}
          className="uf-tabs-header"
          data-scope="tabs"
          data-part="list"
          role="tablist"
          aria-label={label}
          aria-labelledby={labelledBy}
          aria-describedby={describedBy}
          aria-orientation={orientation}
          aria-disabled={disabled || undefined}
        >
          {entries.map(({ key, item, disabled: off }) => {
            const state = key === selected ? 'active' : 'inactive'
            const icon =
              typeof item.icon === 'string' ? item.icon.trim() : item.icon
            return (
              <span key={key} className="uf-tabs-tabSlot" data-state={state}>
                <Membrane enabled={membrane} interactive>
                  <button
                    {...roving.item(key)}
                    id={tabId(item, key)}
                    title={item.title}
                    aria-label={item['aria-label']}
                    aria-labelledby={item['aria-labelledby']}
                    aria-describedby={item['aria-describedby']}
                    type="button"
                    role="tab"
                    className="uf-tabs-tab uf-control"
                    data-scope="tabs"
                    data-part="trigger"
                    data-value={key}
                    data-state={state}
                    aria-controls={controls(item, key)}
                    aria-selected={key === selected}
                    disabled={disabled || off}
                  >
                    {hasSlotContent(icon) && (
                      <span className="uf-tabs-tabIcon" aria-hidden="true">
                        {typeof icon === 'string' ? <Icon name={icon} /> : icon}
                      </span>
                    )}
                    {hasSlotContent(item.label) && (
                      <span className="uf-tabs-tabLabel">{item.label}</span>
                    )}
                  </button>
                </Membrane>
              </span>
            )
          })}
        </div>
        {hasSlotContent(actions) && (
          <fieldset
            className="uf-tabs-actions"
            data-scope="tabs"
            data-part="actions"
            disabled={disabled}
            {...inertProp(disabled)}
          >
            {actions}
          </fieldset>
        )}
        {renderPanels &&
          entries.map(({ key, item }) => (
            <div
              key={key}
              id={panelId(item, key)}
              role="tabpanel"
              aria-labelledby={tabId(item, key)}
              className="uf-tabs-content"
              data-scope="tabs"
              data-part="content"
              data-value={key}
              hidden={key !== selected}
              tabIndex={0}
            >
              {typeof item.content === 'string' ||
              typeof item.content === 'number' ? (
                <Text
                  as="div"
                  heightMode="content"
                  inset="none"
                  membrane={false}
                >
                  {item.content}
                </Text>
              ) : (
                item.content
              )}
            </div>
          ))}
      </div>
    )
  },
)
