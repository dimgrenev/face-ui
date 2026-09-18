/** Compact choice strip: one radio choice or independent pressed options. */
import {
  forwardRef,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react'
import { cn } from '../assets/utils'
import { Membrane } from '../assets/adapters/react/Membrane'
import { FormValue } from '../assets/adapters/react/FormValue'
import { useComposedRefs } from '../assets/adapters/react/use-composed-refs'

export interface SegmentedControlItem extends Pick<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'id' | 'aria-label' | 'aria-labelledby' | 'aria-describedby' | 'title'
> {
  /** Stable unique choice key; an empty string is a valid choice. */
  value: string
  /** Visible noninteractive content. Supply native ARIA naming for icons. */
  label: ReactNode
  /** Prevent choosing this item; retain any existing selection. */
  disabled?: boolean
}
interface SegmentedControlBaseProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  | 'children'
  | 'dangerouslySetInnerHTML'
  | 'defaultValue'
  | 'defaultChecked'
  | 'role'
  | 'aria-checked'
  | 'aria-pressed'
  | 'aria-orientation'
  | 'aria-disabled'
  | 'aria-readonly'
  | 'aria-required'
> {
  /** Choices in visual, keyboard and form order; missing items render an empty group. */
  items?: readonly SegmentedControlItem[]
  /** Disable every control and exclude the group from FormData. */
  disabled?: boolean
  /** Visual axis; single radio mode supports both arrow pairs. */
  orientation?: 'horizontal' | 'vertical'
  /** Accessible group name when there is no visible heading. */
  'aria-label'?: string
  /** Visible heading IDs that name this group. */
  'aria-labelledby'?: string
  /** Native FormData key; multiple selections produce repeated entries. */
  name?: string
  /** ID of an external form that owns the selection. */
  form?: string
  /** Focus the selected enabled choice, or the first enabled choice, on mount. */
  autoFocus?: boolean
  /** Shared outer spacing around each item; toggling preserves DOM and focus. */
  membrane?: boolean
}
interface SegmentedControlSingleProps {
  /** False selects one item without clearing on reselect; true toggles independent options. */
  multiple?: false
  /** Controlled selection: string/null for single, readonly string[] for multiple. Unknown keys are omitted. */
  value?: string | null
  /** Initial selection, restored on form reset: string/null for single, readonly string[] for multiple. */
  defaultValue?: string | null
  /** User selection request; parent updates and form reset are silent. */
  onValueChange?: (details: { value: string | null }) => void
}
interface SegmentedControlMultipleProps {
  /** Toggle any number of independent options. */
  multiple: true
  /** Controlled choices; duplicates/unknown keys are omitted, in item order. */
  value?: readonly string[]
  /** Initial choices, restored on form reset. */
  defaultValue?: readonly string[]
  /** User selection request with a fresh array; parent updates/reset are silent. */
  onValueChange?: (details: { value: readonly string[] }) => void
}
export type SegmentedControlProps = SegmentedControlBaseProps &
  (SegmentedControlSingleProps | SegmentedControlMultipleProps)
type Value = string | readonly string[] | null
const values = (value: Value): readonly string[] =>
  value === null ? [] : typeof value === 'string' ? [value] : value
const equal = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((value, index) => value === b[index])
const useCommitEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect

function readValue(value: unknown, multiple: boolean): readonly string[] {
  if (value === undefined) return []
  if (multiple) {
    if (!Array.isArray(value) || value.some((item) => typeof item !== 'string'))
      throw new TypeError(
        'SegmentedControl multiple value must be an array of strings',
      )
    return [...value]
  }
  if (value !== null && typeof value !== 'string')
    throw new TypeError(
      'SegmentedControl single value must be a string or null',
    )
  return value === null ? [] : [value as string]
}

export const SegmentedControl = forwardRef<
  HTMLDivElement,
  SegmentedControlProps
>(function SegmentedControl(props, ref) {
  const {
    items = [],
    value,
    defaultValue,
    multiple = false,
    disabled = false,
    orientation = 'horizontal',
    onValueChange,
    name,
    form,
    autoFocus = false,
    membrane = true,
    className,
    ...nativeProps
  } = props
  if (
    !Array.isArray(items) ||
    items.some((item) => !item || typeof item.value !== 'string')
  )
    throw new TypeError('SegmentedControl items must have string values')
  if (new Set(items.map((item) => item.value)).size !== items.length)
    throw new TypeError('SegmentedControl item values must be unique')
  const [initial] = useState(() => readValue(defaultValue, multiple))
  const [internal, setInternal] = useState<readonly string[]>(initial)
  const normalize = (candidate: readonly string[]) => {
    const selected = items
      .filter((item) => candidate.includes(item.value))
      .map((item) => item.value)
    return multiple ? selected : selected.slice(0, 1)
  }
  const selected = normalize(
    value === undefined ? internal : readValue(value, multiple),
  )
  const toValue = (candidate: readonly string[]): Value =>
    multiple ? [...candidate] : (candidate[0] ?? null)
  const current = toValue(selected)
  const rootRef = useRef<HTMLDivElement>(null)
  const composedRef = useComposedRefs(rootRef, ref)
  const itemRefs = useRef(new Map<string, HTMLButtonElement>())
  const focused = useRef<HTMLButtonElement | null>(null)
  const [focusedValue, setFocusedValue] = useState<string | null>(null)
  const enabled = items
    .filter((item) => !disabled && !item.disabled)
    .map((item) => item.value)
  const roving =
    focusedValue !== null && enabled.includes(focusedValue)
      ? focusedValue
      : (selected.find((key) => enabled.includes(key)) ?? enabled[0] ?? null)
  const mounted = useRef(false)
  const available = () =>
    enabled.filter((key) => {
      const button = itemRefs.current.get(key)
      return button && !button.matches(':disabled')
    })
  useCommitEffect(() => {
    // Keep only accepted, currently represented choices when control is released
    // or items disappear; changing defaults never replaces a user's selection.
    if (!equal(internal, selected)) setInternal(selected)
    const root = rootRef.current
    if (!root) return
    const active = root.ownerDocument.activeElement
    const previous = focused.current
    const target = () =>
      itemRefs.current.get(roving ?? '') ?? itemRefs.current.get(available()[0])
    if (!mounted.current) {
      mounted.current = true
      if (autoFocus && !root.closest('[hidden], [inert]')) target()?.focus()
    } else if (
      previous &&
      (!previous.isConnected || previous.matches(':disabled')) &&
      (active === previous || active === root.ownerDocument.body) &&
      !root.closest('[hidden], [inert]')
    ) {
      focused.current = null
      const next = target()
      if (next && !next.matches(':disabled'))
        next.focus({ preventScroll: true })
    }
  })
  const propose = (candidate: readonly string[]) => {
    const next = normalize(candidate)
    if (disabled || equal(next, selected)) return
    if (value === undefined) setInternal(next)
    if (props.multiple) props.onValueChange?.({ value: [...next] })
    else props.onValueChange?.({ value: next[0] ?? null })
  }
  const buttonFrom = (target: EventTarget | null) => {
    const ElementClass = rootRef.current?.ownerDocument.defaultView?.Element
    if (!ElementClass || !(target instanceof ElementClass)) return null
    const button = target.closest<HTMLButtonElement>(
      'button[data-scope="toggle"][data-part="item"]',
    )
    return button &&
      button.closest('[data-scope="toggle"][data-part="root"]') ===
        rootRef.current
      ? button
      : null
  }
  return (
    <div
      {...nativeProps}
      ref={composedRef}
      role={multiple ? 'group' : 'radiogroup'}
      aria-orientation={multiple ? undefined : orientation}
      aria-disabled={disabled || undefined}
      data-scope="toggle"
      data-part="root"
      data-type={multiple ? 'multiple' : 'single'}
      data-orientation={orientation}
      data-disabled={disabled || undefined}
      className={cn('uf-toggle', className)}
      onFocus={(event) => {
        const button = buttonFrom(event.target)
        if (button) {
          focused.current = button
          setFocusedValue(button.dataset.value!)
        }
        nativeProps.onFocus?.(event)
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          // Keep the node for removal recovery, but re-enter a radio group at
          // its accepted selection instead of a controlled refused proposal.
          setFocusedValue(null)
        }
        nativeProps.onBlur?.(event)
      }}
      onClick={(event) => {
        nativeProps.onClick?.(event)
        const button = buttonFrom(event.target)
        if (!button || event.defaultPrevented || button.matches(':disabled'))
          return
        const key = button.dataset.value!
        propose(
          multiple
            ? selected.includes(key)
              ? selected.filter((value) => value !== key)
              : [...selected, key]
            : [key],
        )
      }}
      onKeyDown={(event) => {
        nativeProps.onKeyDown?.(event)
        const button = buttonFrom(event.target)
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
        const delta =
          event.key === 'ArrowDown' && (!multiple || orientation === 'vertical')
            ? 1
            : event.key === 'ArrowUp' &&
                (!multiple || orientation === 'vertical')
              ? -1
              : event.key === 'ArrowRight' &&
                  (!multiple || orientation === 'horizontal')
                ? rtl
                  ? -1
                  : 1
                : event.key === 'ArrowLeft' &&
                    (!multiple || orientation === 'horizontal')
                  ? rtl
                    ? 1
                    : -1
                  : null
        if (delta === null && event.key !== 'Home' && event.key !== 'End')
          return
        const keys = available()
        if (!keys.length) return
        event.preventDefault()
        const index = keys.indexOf(button.dataset.value!)
        const nextIndex =
          event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? keys.length - 1
              : (Math.max(0, index) + delta! + keys.length) % keys.length
        const next = itemRefs.current.get(keys[nextIndex])
        next?.focus()
        // Native click keeps cancellation and pointer/keyboard selection unified.
        if (!multiple) next?.click()
      }}
    >
      {items.map(
        ({ value: key, label, disabled: itemDisabled, ...itemProps }) => {
          const checked = selected.includes(key)
          return (
            <Membrane enabled={membrane} key={key} interactive>
              <button
                {...itemProps}
                type="button"
                role={multiple ? undefined : 'radio'}
                ref={(node) => {
                  if (node) itemRefs.current.set(key, node)
                  else itemRefs.current.delete(key)
                }}
                disabled={disabled || itemDisabled}
                form={form}
                aria-checked={multiple ? undefined : checked}
                aria-pressed={multiple ? checked : undefined}
                aria-disabled={disabled || itemDisabled || undefined}
                data-scope="toggle"
                data-part="item"
                data-value={key}
                data-state={checked ? 'on' : 'off'}
                data-disabled={disabled || itemDisabled || undefined}
                data-orientation={orientation}
                tabIndex={key === roving ? 0 : -1}
                className="uf-toggle-item uf-option uf-control"
              >
                {label}
              </button>
            </Membrane>
          )
        },
      )}
      <FormValue
        name={name}
        form={form}
        disabled={disabled}
        options={items.map(({ value, disabled }) => ({ value, disabled }))}
        value={current}
        resetValue={toValue(normalize(initial))}
        triggerRef={rootRef}
        onReset={() => {
          const next = value === undefined ? normalize(initial) : selected
          if (value === undefined) setInternal(next)
          return toValue(next)
        }}
        onChange={(candidate) => {
          const next = values(candidate)
          if (
            next.some(
              (key) => !available().includes(key) && !selected.includes(key),
            )
          )
            return
          propose(next)
        }}
      />
    </div>
  )
})
