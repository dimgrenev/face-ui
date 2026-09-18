/** Tabs select a persistent content panel. Header actions are ordinary controls. */
import {
  forwardRef,
  useEffect,
  useLayoutEffect,
  useId,
  useRef,
  useState,
  version,
  type HTMLAttributes,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react'
import { cn } from '../assets/utils'
import { Icon } from '../Icon/Icon'
import { Text } from '../Text/Text'
import { Membrane } from '../assets/adapters/react/Membrane'
import { useComposedRefs } from '../assets/adapters/react/use-composed-refs'
import { hasSlotContent } from '../assets/slot-content'

export interface TabItem extends Pick<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'id' | 'title' | 'aria-label' | 'aria-labelledby' | 'aria-describedby'
> {
  /** Stable unique key, including the empty string. */
  value: string
  /** Visible noninteractive tab content. Use native ARIA naming for icons. */
  label: ReactNode
  /** Persistent internal panel content; hidden panels remain mounted. */
  content?: ReactNode
  /** Prevent activation; an already selected panel stays readable. */
  disabled?: boolean
  /** Internal panel ID, or the required existing panel ID in external mode. */
  panelId?: string
  /** File/category icon before the label; strings are registered icon names. */
  leadingIcon?: ReactNode
  /** Status icon after the label; independent of the leading icon. */
  trailingIcon?: ReactNode
}
export type ExternalTabItem = Omit<TabItem, 'content' | 'panelId'> & {
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
  /** Controlled selected key. Unknown keys show no panel until they exist. */
  value?: string
  /** Mount-only selected key. Otherwise use the first enabled tab. */
  defaultValue?: string
  /** Axis of keyboard navigation and the tab list. */
  orientation?: 'horizontal' | 'vertical'
  /** Automatic activates on focus; manual requires a click, Space or Enter. */
  activationMode?: 'automatic' | 'manual'
  /** Disable tab navigation and header actions, retaining the visible panel. */
  disabled?: boolean
  /** User activation request; external updates and removal recovery are silent. */
  onValueChange?: (details: { value: string }) => void
  /** Pill background or an underline that follows the selected tab's geometry. */
  variant?: 'pill' | 'underline'
  /** Wrap the tab list instead of scrolling along its axis. */
  wrap?: boolean
  /** Shared outer spacing around each tab; toggling preserves DOM and focus. */
  membrane?: boolean
  /** Header controls outside tablist, such as New, Close selected, or More. */
  actions?: ReactNode
  /** Focus the selected enabled tab, or first enabled tab, once on mount. */
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
        /** Render persistent internal panels. */ renderPanels?: true
        /** Tabs in order: unique value, label, optional content, disabled, panelId, leadingIcon, trailingIcon and native naming (id, title, aria-*). */
        items?: readonly TabItem[]
      }
    | {
        /** External panels are owned and labelled by the consumer. */ renderPanels: false
        /** Tabs in order; each panelId names a consumer-owned tabpanel and content is not accepted. */
        items?: readonly ExternalTabItem[]
      }
  )
const useCommitEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect
const hasIcon = (icon: ReactNode) =>
  hasSlotContent(typeof icon === 'string' ? icon.trim() : icon)
const renderIcon = (icon: ReactNode) =>
  typeof icon === 'string' ? <Icon name={icon} /> : icon

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
      ...nativeProps
    } = props
    if (
      !Array.isArray(items) ||
      items.some((item) => !item || typeof item.value !== 'string')
    )
      throw new TypeError('Tabs items must have string values')
    if (new Set(items.map((item) => item.value)).size !== items.length)
      throw new TypeError('Tabs item values must be unique')
    for (const candidate of [value, defaultValue])
      if (candidate !== undefined && typeof candidate !== 'string')
        throw new TypeError('Tabs values must be strings')
    for (const item of items) {
      if (item.id !== undefined && (!item.id || /\s/.test(item.id)))
        throw new TypeError('Tabs item id must be a nonempty HTML ID')
      if (
        item.panelId !== undefined &&
        (!item.panelId || /\s/.test(item.panelId))
      )
        throw new TypeError('Tabs panelId must be a nonempty HTML ID')
      if (
        !renderPanels &&
        (!item.panelId || Object.prototype.hasOwnProperty.call(item, 'content'))
      )
        throw new TypeError(
          'External Tabs items require panelId and must not supply ignored content',
        )
    }
    const explicitIds = items
      .flatMap((item) => [item.id, ...(renderPanels ? [item.panelId] : [])])
      .filter((id): id is string => id !== undefined)
    if (new Set(explicitIds).size !== explicitIds.length)
      throw new TypeError('Tabs internal IDs must be unique')
    const firstEnabled = items.find((item) => !item.disabled)?.value ?? null
    const [internal, setInternal] = useState<string | null>(
      () => defaultValue ?? firstEnabled,
    )
    const previousOrder = useRef(items.map((item) => item.value))
    const previousSelected = useRef<string | null>(null)
    const nearest = (key: string | null) => {
      const index =
        key === null ? 0 : Math.max(0, previousOrder.current.indexOf(key))
      return (
        [...items.slice(index), ...items.slice(0, index).reverse()].find(
          (item) => !item.disabled,
        )?.value ?? null
      )
    }
    const selected =
      value !== undefined
        ? items.some((item) => item.value === value)
          ? value
          : null
        : internal !== null && items.some((item) => item.value === internal)
          ? internal
          : nearest(internal)
    const rootRef = useRef<HTMLDivElement>(null)
    const listRef = useRef<HTMLDivElement>(null)
    const composedRef = useComposedRefs(rootRef, ref)
    const triggers = useRef(new Map<string, HTMLButtonElement>())
    const focusedNode = useRef<HTMLElement | null>(null)
    const focusedTab = useRef(false)
    const focusedKey = useRef<string | null>(null)
    const [focused, setFocused] = useState<string | null>(null)
    const pointerFocus = useRef<HTMLButtonElement | null>(null)
    const suppressFocusActivation = useRef(false)
    const mounted = useRef(false)
    const enabled = items
      .filter((item) => !disabled && !item.disabled)
      .map((item) => item.value)
    const roving =
      focused !== null && enabled.includes(focused)
        ? focused
        : selected !== null && enabled.includes(selected)
          ? selected
          : (enabled[0] ?? null)
    const triggerFrom = (target: EventTarget | null) => {
      const ElementClass = rootRef.current?.ownerDocument.defaultView?.Element
      if (!ElementClass || !(target instanceof ElementClass)) return null
      const button = target.closest<HTMLButtonElement>(
        'button[data-scope="tabs"][data-part="trigger"]',
      )
      return button?.closest('[data-scope="tabs"][data-part="root"]') ===
        rootRef.current
        ? button
        : null
    }
    const available = () =>
      enabled.filter((key) => !triggers.current.get(key)?.matches(':disabled'))
    const propose = (key: string) => {
      if (!available().includes(key) || selected === key) return
      if (value === undefined) setInternal(key)
      onValueChange?.({ value: key })
    }
    const focus = (key: string | null, silent = false) => {
      const button = key === null ? undefined : triggers.current.get(key)
      if (!button || button.matches(':disabled')) return
      suppressFocusActivation.current = silent
      try {
        button.focus({ preventScroll: true })
      } finally {
        suppressFocusActivation.current = false
      }
      const list = listRef.current
      if (!list) return
      const box = button.getBoundingClientRect(),
        viewport = list.getBoundingClientRect()
      const left =
        box.left < viewport.left
          ? box.left - viewport.left
          : box.right > viewport.right
            ? box.right - viewport.right
            : 0
      const top =
        box.top < viewport.top
          ? box.top - viewport.top
          : box.bottom > viewport.bottom
            ? box.bottom - viewport.bottom
            : 0
      if (left || top) list.scrollBy?.({ left, top, behavior: 'instant' })
    }
    useCommitEffect(() => {
      // Release only the last accepted selection, never a controlled proposal.
      if (internal !== selected) setInternal(selected)
      const root = rootRef.current
      if (!root) return
      const active = root.ownerDocument.activeElement
      const previous = focusedNode.current
      const panelBecameHidden =
        selected !== previousSelected.current &&
        active !== null &&
        Array.from(root.children).some(
          (node) =>
            node.getAttribute('data-part') === 'content' &&
            (node as HTMLElement).hidden &&
            node.contains(active),
        )
      if (!mounted.current) {
        mounted.current = true
        if (autoFocus && !root.closest('[inert], [hidden]')) focus(roving, true)
      } else if (panelBecameHidden) {
        focus(roving, true)
      } else if (
        previous &&
        ((!previous.isConnected &&
          (focusedTab.current || selected !== previousSelected.current)) ||
          (focusedTab.current && previous.matches(':disabled'))) &&
        (active === previous || active === root.ownerDocument.body) &&
        !root.closest('[inert], [hidden]')
      ) {
        focusedNode.current = null
        const nearby = nearest(focusedKey.current)
        const next =
          nearby !== null && available().includes(nearby)
            ? nearby
            : (available()[0] ?? null)
        focus(next, true)
      }
      previousOrder.current = items.map((item) => item.value)
      previousSelected.current = selected
    })
    const instanceId = useId()
    const keyId = (key: string) =>
      Array.from(key, (char) => char.codePointAt(0)!.toString(16)).join('-')
    const triggerId = (item: TabItem) =>
      item.id ?? `tabs-${instanceId}-tab-${keyId(item.value)}`
    const panelId = (item: TabItem) =>
      item.panelId ?? `tabs-${instanceId}-panel-${keyId(item.value)}`
    const inertProps: Record<string, unknown> = {
      inert: disabled
        ? Number(version.split('.')[0]) >= 19
          ? true
          : ''
        : undefined,
    }
    return (
      <div
        {...nativeProps}
        ref={composedRef}
        className={cn('uf-tabs', className)}
        data-scope="tabs"
        data-part="root"
        data-orientation={orientation}
        data-variant={variant}
        data-wrap={wrap || undefined}
        data-disabled={disabled || undefined}
        onPointerDown={(event) => {
          nativeProps.onPointerDown?.(event)
          if (!event.defaultPrevented)
            pointerFocus.current = triggerFrom(event.target)
        }}
        onPointerCancel={(event) => {
          pointerFocus.current = null
          nativeProps.onPointerCancel?.(event)
        }}
        onFocus={(event) => {
          nativeProps.onFocus?.(event)
          const button = triggerFrom(event.target)
          focusedTab.current = button !== null
          if (!button) {
            focusedNode.current = event.target as HTMLElement
            focusedKey.current = selected
            return
          }
          focusedNode.current = button
          const key = button.dataset.value!
          focusedKey.current = key
          setFocused(key)
          const fromPointer = pointerFocus.current === button
          pointerFocus.current = null
          if (
            !event.defaultPrevented &&
            !fromPointer &&
            !suppressFocusActivation.current &&
            activationMode === 'automatic'
          )
            propose(key)
        }}
        onBlur={(event) => {
          nativeProps.onBlur?.(event)
          if (!listRef.current?.contains(event.relatedTarget as Node | null)) {
            setFocused(null)
            if (event.relatedTarget) focusedNode.current = null
          }
        }}
        onClick={(event) => {
          nativeProps.onClick?.(event)
          pointerFocus.current = null
          const button = triggerFrom(event.target)
          if (button && !event.defaultPrevented && !button.matches(':disabled'))
            propose(button.dataset.value!)
        }}
        onKeyDown={(event) => {
          nativeProps.onKeyDown?.(event)
          const button = triggerFrom(event.target)
          if (
            !button ||
            event.defaultPrevented ||
            event.altKey ||
            event.ctrlKey ||
            event.metaKey ||
            button.matches(':disabled')
          )
            return
          const rtl =
            button.ownerDocument.defaultView?.getComputedStyle(button)
              .direction === 'rtl'
          const nextKey =
            orientation === 'vertical'
              ? 'ArrowDown'
              : rtl
                ? 'ArrowLeft'
                : 'ArrowRight'
          const previousKey =
            orientation === 'vertical'
              ? 'ArrowUp'
              : rtl
                ? 'ArrowRight'
                : 'ArrowLeft'
          const delta =
            event.key === nextKey ? 1 : event.key === previousKey ? -1 : null
          if (delta === null && event.key !== 'Home' && event.key !== 'End')
            return
          const keys = available()
          if (!keys.length) return
          event.preventDefault()
          const index = keys.indexOf(button.dataset.value!)
          const next =
            event.key === 'Home'
              ? 0
              : event.key === 'End'
                ? keys.length - 1
                : (Math.max(0, index) + delta! + keys.length) % keys.length
          focus(keys[next])
        }}
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
          {items.map((item) => (
            <span
              key={item.value}
              className="uf-tabs-tabSlot"
              data-state={item.value === selected ? 'active' : 'inactive'}
            >
              <Membrane enabled={membrane} interactive>
                <button
                  id={triggerId(item)}
                  title={item.title}
                  aria-label={item['aria-label']}
                  aria-labelledby={item['aria-labelledby']}
                  aria-describedby={item['aria-describedby']}
                  ref={(node) => {
                    if (node) triggers.current.set(item.value, node)
                    else triggers.current.delete(item.value)
                  }}
                  type="button"
                  role="tab"
                  className="uf-tabs-tab uf-control"
                  data-scope="tabs"
                  data-part="trigger"
                  data-value={item.value}
                  data-state={item.value === selected ? 'active' : 'inactive'}
                  aria-controls={panelId(item)}
                  aria-selected={item.value === selected}
                  disabled={disabled || item.disabled}
                  tabIndex={item.value === roving ? 0 : -1}
                >
                  {hasIcon(item.leadingIcon) && (
                    <span
                      className="uf-tabs-tabIcon"
                      data-position="start"
                      aria-hidden="true"
                    >
                      {renderIcon(item.leadingIcon)}
                    </span>
                  )}
                  {hasSlotContent(item.label) && (
                    <span className="uf-tabs-tabLabel">{item.label}</span>
                  )}
                  {hasIcon(item.trailingIcon) && (
                    <span
                      className="uf-tabs-tabIcon"
                      data-position="end"
                      aria-hidden="true"
                    >
                      {renderIcon(item.trailingIcon)}
                    </span>
                  )}
                </button>
              </Membrane>
            </span>
          ))}
        </div>
        {hasSlotContent(actions) && (
          <fieldset
            className="uf-tabs-actions"
            data-scope="tabs"
            data-part="actions"
            disabled={disabled}
            {...inertProps}
          >
            {actions}
          </fieldset>
        )}
        {renderPanels &&
          items.map((item) => (
            <div
              key={item.value}
              id={panelId(item)}
              role="tabpanel"
              aria-labelledby={triggerId(item)}
              className="uf-tabs-content"
              data-scope="tabs"
              data-part="content"
              data-value={item.value}
              hidden={item.value !== selected}
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
