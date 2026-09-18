import { useRef, useState, type CSSProperties, type ReactNode } from 'react'
import {
  useRovingFocus,
  type RovingFocusOptions,
} from '../../adapters/react/use-roving-focus'

export interface RovingProbeItem {
  value: string
  label: string
  disabled?: boolean
  hidden?: boolean
  /** Rendered inside a `<fieldset>` that `fieldsetDisabled` disables. */
  fieldset?: boolean
}

/** The hook's options plus the probe's items, selection and the shapes a test varies. */
export interface RovingProbeProps extends Omit<
  RovingFocusOptions,
  'keys' | 'disabled' | 'active' | 'typeahead' | 'scrollRef'
> {
  items: readonly RovingProbeItem[]
  /** Initial selection; clicks select, unless a click handler called `preventDefault()`. */
  defaultValue?: string | null
  /** Typeahead over the item labels. */
  typeahead?: boolean
  /** Only the item list scrolls to reveal moves. */
  scroll?: boolean
  fieldsetDisabled?: boolean
  /** Disabled items stay focusable, marked with `aria-disabled`. */
  ariaDisabled?: boolean
  dir?: 'ltr' | 'rtl'
  style?: CSSProperties
  listStyle?: CSSProperties
  /** Rendered inside the root after the list, where Tabs renders its panels. */
  children?: ReactNode
}

/**
 * The smallest roving group: a list of buttons wired through useRovingFocus exactly as a
 * Face UI collection component is, with a click-to-select state it exposes as `data-selected`.
 */
export function RovingProbe({
  items,
  defaultValue = null,
  typeahead,
  scroll,
  fieldsetDisabled,
  ariaDisabled,
  dir,
  style,
  listStyle,
  children,
  ...options
}: RovingProbeProps) {
  const [selected, setSelected] = useState(defaultValue)
  const listRef = useRef<HTMLDivElement>(null)
  const find = (key: string) => items.find((item) => item.value === key)
  const roving = useRovingFocus({
    ...options,
    keys: items.map((item) => item.value),
    disabled: (key) => find(key)?.disabled === true,
    active: selected,
    typeahead: typeahead ? (key) => find(key)?.label ?? '' : undefined,
    scrollRef: scroll ? listRef : undefined,
  })
  return (
    <div
      {...roving.root}
      dir={dir}
      style={style}
      data-roving-probe=""
      data-selected={selected ?? undefined}
    >
      <div ref={listRef} role="group" style={listStyle}>
        {items.map((item) => {
          const button = (
            <button
              key={item.value}
              type="button"
              {...roving.item(item.value)}
              data-value={item.value}
              hidden={item.hidden}
              disabled={item.disabled && !ariaDisabled}
              aria-disabled={item.disabled || undefined}
              aria-pressed={item.value === selected}
              onClick={(event) => {
                if (!event.defaultPrevented && !item.disabled)
                  setSelected(item.value)
              }}
            >
              {item.label}
            </button>
          )
          return item.fieldset ? (
            <fieldset key={item.value} disabled={fieldsetDisabled}>
              {button}
            </fieldset>
          ) : (
            button
          )
        })}
      </div>
      {children}
    </div>
  )
}
