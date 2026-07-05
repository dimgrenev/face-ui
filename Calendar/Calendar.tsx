/**
 * Calendar — standalone date picker grid.
 *
 * `<Calendar value={date} onValueChange={({ value }) => setDate(value)} />`
 *
 * Public API uses Date objects. Internal machine uses ISO strings.
 */

import { forwardRef, useMemo, useState } from 'react'
import { useMachine } from '../assets/adapters/react/use-machine'
import { useControllableMachineProp } from '../assets/adapters/react/use-controllable-machine-prop'
import { calendarMachine, connectCalendar } from '../assets/machines/calendar.machine'
import { cn } from '../assets/utils'
import { Icon } from '../Icon/Icon'
import { Button } from '../Button/Button'
import { Text } from '../Text/Text'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CalendarProps {
  /** Selected date. */
  value?: Date | CalendarRangeValue | null
  /** Default selected date (uncontrolled). */
  defaultValue?: Date | CalendarRangeValue
  /** Selection model. */
  selection?: 'single' | 'range'
  /** Minimum selectable date. */
  min?: Date
  /** Maximum selectable date. */
  max?: Date
  /** Array of dates that cannot be selected. */
  disabledDates?: Date[]
  /** Locale for month and weekday names. */
  locale?: string
  /** First day of the week: 0=Sunday, 1=Monday, etc. */
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6
  /** Callback when the selected date changes. */
  onValueChange?: (details: { value: Date | CalendarRangeValue }) => void
  /** Additional CSS class. */
  className?: string
}

export interface CalendarRangeValue {
  start?: Date | null
  end?: Date | null
}

// ---------------------------------------------------------------------------
// Date <-> ISO helpers
// ---------------------------------------------------------------------------

function dateToISO(d: Date | string | unknown): string {
  // Accept Date objects, ISO strings, or anything parseable
  if (typeof d === 'string') {
    // Already an ISO-like string — validate and return
    const parsed = new Date(d)
    if (!isNaN(parsed.getTime())) {
      const y = String(parsed.getFullYear()).padStart(4, '0')
      const m = String(parsed.getMonth() + 1).padStart(2, '0')
      const day = String(parsed.getDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    }
    return d // return as-is if unparseable
  }
  if (!(d instanceof Date) || isNaN((d as Date).getTime())) {
    // Fallback: try to create a Date from whatever we got
    const fallback = new Date()
    const y = String(fallback.getFullYear()).padStart(4, '0')
    const m = String(fallback.getMonth() + 1).padStart(2, '0')
    const day = String(fallback.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }
  const y = String(d.getFullYear()).padStart(4, '0')
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function isCalendarRangeValue(value: unknown): value is CalendarRangeValue {
  return Boolean(value && typeof value === 'object' && ('start' in value || 'end' in value))
}

function normalizeCalendarRange(value: Date | CalendarRangeValue | null | undefined): { start: string | null; end: string | null } {
  if (!isCalendarRangeValue(value)) {
    const iso = value ? dateToISO(value) : null
    return { start: iso, end: null }
  }
  return {
    start: value.start ? dateToISO(value.start) : null,
    end: value.end ? dateToISO(value.end) : null,
  }
}

function normalizeRangeOrder(range: { start: string | null; end: string | null }): { start: string | null; end: string | null } {
  if (!range.start || !range.end || range.start <= range.end) return range
  return { start: range.end, end: range.start }
}

function rangeToDates(range: { start: string | null; end: string | null }): CalendarRangeValue {
  return {
    start: range.start ? isoToDate(range.start) : null,
    end: range.end ? isoToDate(range.end) : null,
  }
}

function getViewDate(value?: Date | CalendarRangeValue | null, defaultValue?: Date | CalendarRangeValue): string {
  const valueRange = normalizeCalendarRange(value)
  const defaultRange = normalizeCalendarRange(defaultValue)
  if (valueRange.start) return valueRange.start.slice(0, 7) + '-01'
  if (valueRange.end) return valueRange.end.slice(0, 7) + '-01'
  if (defaultRange.start) return defaultRange.start.slice(0, 7) + '-01'
  if (defaultRange.end) return defaultRange.end.slice(0, 7) + '-01'
  const now = new Date()
  return dateToISO(now).slice(0, 7) + '-01'
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const Calendar = forwardRef<HTMLDivElement, CalendarProps>(
  function Calendar(props, ref) {
    const {
      value,
      defaultValue,
      selection = 'single',
      min,
      max,
      disabledDates = [],
      locale = 'en-US',
      weekStartsOn = 0,
      onValueChange,
      className,
    } = props

    const controlledRange = useMemo(() => normalizeCalendarRange(value), [value])
    const defaultRange = useMemo(() => normalizeCalendarRange(defaultValue), [defaultValue])
    const [uncontrolledRange, setUncontrolledRange] = useState(defaultRange)
    const rangeValue = value !== undefined ? controlledRange : uncontrolledRange
    const selectedISO = useControllableMachineProp(
      selection === 'single'
        ? (value !== undefined ? (value && !isCalendarRangeValue(value) ? dateToISO(value) : null) : undefined)
        : (value !== undefined ? rangeValue.start : undefined),
      selection === 'single'
        ? (defaultValue && !isCalendarRangeValue(defaultValue) ? dateToISO(defaultValue) : null)
        : defaultRange.start,
    )
    const viewDate = useControllableMachineProp<string | null>(undefined, getViewDate(value, defaultValue))
    const focusedDate = useControllableMachineProp<string | null>(undefined, selectedISO ?? viewDate)

    const handleValueChange = selection === 'single' && onValueChange
      ? (details: { value: string }) => {
          onValueChange({ value: isoToDate(details.value) })
        }
      : null

    const { state, send } = useMachine(calendarMachine, {
      value: selectedISO ?? undefined,
      viewDate: viewDate ?? undefined,
      focusedDate: focusedDate ?? undefined,
      min: min ? dateToISO(min) : undefined,
      max: max ? dateToISO(max) : undefined,
      disabledDates: disabledDates.map(dateToISO),
      locale,
      weekStartsOn,
      onValueChange: handleValueChange,
    })

    const api = connectCalendar(state, send)
    const handleRangeDateSelect = (date: string) => {
      const isRestart = !rangeValue.start || (rangeValue.start && rangeValue.end)
      const nextRange = normalizeRangeOrder(isRestart
        ? { start: date, end: null }
        : { start: rangeValue.start, end: date })
      if (value === undefined) setUncontrolledRange(nextRange)
      onValueChange?.({ value: rangeToDates(nextRange) })
    }

    return (
      <div ref={ref} {...api.getRootProps()} className={cn('uf-calendar', className)}>
        <div {...api.getHeaderProps()}>
          <Button
            {...api.getPrevMonthProps()}
            icon={<Icon name="arrow-left" />}
            iconOnly
            fullWidth={false}
            className="uf-calendar-navButton"
          />
          <Text
            {...api.getTitleProps()}
            as="div"
            text={api.monthLabel}
            variant="label"
            align="center"
            fullWidth
            className="uf-calendar-titleText"
          />
          <Button
            {...api.getNextMonthProps()}
            icon={<Icon name="arrow-right" />}
            iconOnly
            fullWidth={false}
            className="uf-calendar-navButton"
          />
        </div>

        <table {...api.getGridProps()}>
          <thead>
            <tr>
              {api.weekdayLabels.map((label, i) => {
                const firstLetter = Array.from(String(label || '').trim())[0] ?? ''
                return (
                  <th key={i} {...api.getWeekdayProps(i)}>
                    <Text
                      as="span"
                      text={firstLetter}
                      variant="caption"
                      inset="none"
                      className="uf-calendar-weekdayText"
                    />
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 6 }, (_, weekIndex) => (
              <tr key={weekIndex}>
                {api.days.slice(weekIndex * 7, weekIndex * 7 + 7).map((day) => {
                  const dayProps = api.getDayProps(day) as any
                  const normalizedRange = normalizeRangeOrder(rangeValue)
                  const isRangeStart = selection === 'range' && normalizedRange.start === day.date
                  const isRangeEnd = selection === 'range' && normalizedRange.end === day.date
                  const isRangeBetween = selection === 'range' && Boolean(
                    normalizedRange.start &&
                    normalizedRange.end &&
                    day.date > normalizedRange.start &&
                    day.date < normalizedRange.end,
                  )
                  return (
                    <td key={day.date}>
                      <Button
                        {...dayProps}
                        text={String(day.dayOfMonth)}
                        fullWidth
                        className="uf-calendar-dayButton"
                        data-range-start={isRangeStart || undefined}
                        data-range-end={isRangeEnd || undefined}
                        data-range-between={isRangeBetween || undefined}
                        onClick={(event) => {
                          dayProps.onClick?.(event)
                          if (selection === 'range' && !day.isDisabled) handleRangeDateSelect(day.date)
                        }}
                      />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  },
)
