import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Button } from '../../Button/Button'
import { Membrane } from '../adapters/react/Membrane'
import { dateAnatomy } from '../machines/date.machine'

interface DateChoice {
  value: number
  label: string
  selected: boolean
  disabled: boolean
}
interface DateChoiceGridProps {
  items: DateChoice[]
  columns: 3 | 4 | 6
  label: string
  className: string
  onSelect: (value: number) => void
  onPageChange?: (direction: -1 | 1) => void
}
const useCommitEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect

/** One keyboard model for month, year, hour and minute choices. Focus is separate
 * from selection, and survives a page change at the same visual position. */
export function DateChoiceGrid({
  items,
  columns,
  label,
  className,
  onSelect,
  onPageChange,
}: DateChoiceGridProps) {
  const root = useRef<HTMLDivElement>(null)
  const buttons = useRef<Array<HTMLButtonElement | null>>([])
  const hasFocus = useRef(false)
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null)
  const preferredIndex =
    focusedIndex ?? items.findIndex((item) => item.selected && !item.disabled)
  const clampedIndex = Math.min(Math.max(preferredIndex, 0), items.length - 1)
  const activeIndex =
    items[clampedIndex] && !items[clampedIndex].disabled
      ? clampedIndex
      : items.findIndex((item) => !item.disabled)
  const activeValue = items[activeIndex]?.value
  useCommitEffect(() => {
    if (hasFocus.current)
      (buttons.current[activeIndex] ?? root.current)?.focus({
        preventScroll: true,
      })
  }, [activeIndex, activeValue])

  return (
    <div
      ref={root}
      {...dateAnatomy.getPartAttrs('grid')}
      role="group"
      aria-label={label}
      tabIndex={activeIndex < 0 ? 0 : undefined}
      className={className}
      onFocusCapture={() => {
        hasFocus.current = true
      }}
      onBlurCapture={(event) => {
        hasFocus.current = event.currentTarget.contains(
          event.relatedTarget as Node | null,
        )
      }}
      onKeyDown={(event) => {
        if (
          event.defaultPrevented ||
          event.altKey ||
          event.metaKey ||
          event.nativeEvent.isComposing ||
          (event.ctrlKey && !['Home', 'End'].includes(event.key))
        )
          return
        if (
          (event.key === 'PageUp' || event.key === 'PageDown') &&
          onPageChange
        ) {
          event.preventDefault()
          onPageChange(event.key === 'PageUp' ? -1 : 1)
          return
        }
        const current = buttons.current.indexOf(
          event.target as HTMLButtonElement,
        )
        if (current < 0) return
        const direction =
          getComputedStyle(event.currentTarget).direction ||
          event.currentTarget.closest('[dir]')?.getAttribute('dir')
        const rtl = direction === 'rtl'
        let next = current,
          step = 0,
          first = 0,
          last = items.length - 1
        switch (event.key) {
          case 'ArrowLeft':
            step = rtl ? 1 : -1
            next += step
            break
          case 'ArrowRight':
            step = rtl ? -1 : 1
            next += step
            break
          case 'ArrowUp':
            step = -columns
            next += step
            break
          case 'ArrowDown':
            step = columns
            next += step
            break
          case 'Home':
            first = event.ctrlKey ? 0 : Math.floor(current / columns) * columns
            last = event.ctrlKey ? last : Math.min(first + columns - 1, last)
            next = first
            step = 1
            break
          case 'End':
            first = event.ctrlKey ? 0 : Math.floor(current / columns) * columns
            last = event.ctrlKey ? last : Math.min(first + columns - 1, last)
            next = last
            step = -1
            break
          default:
            return
        }
        event.preventDefault()
        while (next >= first && next <= last && items[next].disabled)
          next += step
        if (next < first || next > last) return
        setFocusedIndex(next)
        buttons.current[next]?.focus({ preventScroll: true })
      }}
    >
      {items.map((item, index) => (
        <Membrane key={item.value} interactive>
          <Button
            ref={(node) => {
              buttons.current[index] = node
            }}
            text={item.label}
            fullWidth
            membrane={false}
            tabIndex={index === activeIndex ? 0 : -1}
            disabled={item.disabled}
            aria-pressed={item.selected}
            variant={item.selected ? 'secondary' : 'ghost'}
            onFocus={() => setFocusedIndex(index)}
            onClick={() => onSelect(item.value)}
          />
        </Membrane>
      ))}
    </div>
  )
}
