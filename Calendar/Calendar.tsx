/** A civil-day selector. ISO dates are independent of the browser's timezone. */
import { forwardRef, useState } from 'react'
import { parseCivilDate as parseDate } from '../assets/runtime/civil-date'
import {
  CalendarGrid,
  type CalendarRootAttributes,
} from '../assets/internal/CalendarGrid'
import { normalizeRange } from '../assets/date-utils'
import {
  getNextDateRange,
  isDateRangeDisabled,
} from '../assets/runtime/date-range'
import { areContextValuesEqual } from '../assets/create-machine'
import { resolveLabels } from '../assets/runtime/labels'
import {
  defaultCalendarLabels,
  type CalendarLabels,
} from '../assets/runtime/date-labels'
export type { CalendarLabels } from '../assets/runtime/date-labels'

interface CalendarSharedProps extends CalendarRootAttributes {
  /** Displayed month as YYYY-MM-DD, independently of selection. */
  viewDate?: string
  /** Initial displayed month as YYYY-MM-DD; read only on initialization. */
  defaultViewDate?: string
  /** User navigation only; receives the first day of the month as YYYY-MM-DD. */
  onViewDateChange?: (details: { viewDate: string }) => void
  /** Earliest selectable civil date, inclusive, as YYYY-MM-DD. */
  min?: string
  /** Latest selectable civil date, inclusive, as YYYY-MM-DD. */
  max?: string
  /** Unavailable civil dates as YYYY-MM-DD strings. */
  disabledDates?: readonly string[]
  /** Disable date selection and month navigation; remove internal controls from Tab. */
  disabled?: boolean
  /** Prevent user selection while keeping focus and month navigation available. */
  readOnly?: boolean
  /** Date formatting language, numbering system and default first weekday; dates stay Gregorian. */
  locale?: string
  /** Internal navigation labels; use aria-label/aria-labelledby to name the calendar group. */
  labels?: Partial<CalendarLabels>
  /** Override the locale's first weekday: 0=Sunday through 6=Saturday. */
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6
  /** CSS class on the calendar group root, also addressed by id, style and ref. */
  className?: string
  /** Accessible name of the calendar group; the inner grid is named by its displayed month. */
  'aria-label'?: string
  /** External label IDs for the calendar group; takes precedence over aria-label. */
  'aria-labelledby'?: string
  /** External description IDs for the calendar group. */
  'aria-describedby'?: string
}

export interface CalendarRangeValue {
  /** First civil date as YYYY-MM-DD, or null for an empty endpoint. */
  start: string | null
  /** Last civil date as YYYY-MM-DD, or null while selecting the range. */
  end: string | null
}

export type CalendarProps = CalendarSharedProps &
  (
    | {
        selection?: 'single'
        excludeDisabledDates?: never
        /** Selected civil day or range; dates use YYYY-MM-DD and null clears the controlled value. */
        value?: string | null
        /** Initial uncontrolled civil day or range; dates use YYYY-MM-DD. */
        defaultValue?: string | null
        /** Called once for a user selection, with its civil ISO date. */
        onValueChange?: (details: { value: string }) => void
      }
    | {
        selection: 'range'
        /** Exclude unavailable days from the whole range; false constrains only its endpoints. */
        excludeDisabledDates?: boolean
        /** Selected civil range; null clears the controlled value. */
        value?: CalendarRangeValue | null
        /** Initial uncontrolled civil range. */
        defaultValue?: CalendarRangeValue | null
        /** Called once for a user selection, including an incomplete range. */
        onValueChange?: (details: { value: CalendarRangeValue }) => void
      }
  )

function readDate(value: unknown, prop: string): string {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    try {
      return parseDate(value).toString()
    } catch {
      /* Report the owning prop below. */
    }
  }
  throw new RangeError(
    `Calendar ${prop} must be a valid Gregorian YYYY-MM-DD string (years 0001–9999)`,
  )
}

function readSelection(
  value: unknown,
  selection: 'single' | 'range',
  prop: string,
): CalendarRangeValue {
  if (value == null) return { start: null, end: null }
  if (selection === 'single') return { start: readDate(value, prop), end: null }
  if (typeof value !== 'object' || !('start' in value) || !('end' in value))
    throw new RangeError(
      `Calendar ${prop} must have start and end civil dates, each YYYY-MM-DD or null`,
    )
  return normalizeRange(
    value.start === null ? null : readDate(value.start, `${prop}.start`),
    value.end === null ? null : readDate(value.end, `${prop}.end`),
  )
}

export const Calendar = forwardRef<HTMLDivElement, CalendarProps>(
  function Calendar(props, ref) {
    const {
      value,
      defaultValue,
      viewDate,
      defaultViewDate,
      onViewDateChange,
      selection = 'single',
      onValueChange: _onValueChange,
      min,
      max,
      disabledDates = [],
      excludeDisabledDates = true,
      disabled = false,
      readOnly = false,
      locale = 'en-US',
      labels,
      weekStartsOn,
      className,
      ...nativeProps
    } = props
    const controlled =
      value !== undefined ? readSelection(value, selection, 'value') : undefined
    const [stored, setStored] = useState(
      () =>
        controlled ?? readSelection(defaultValue, selection, 'defaultValue'),
    )
    // Preserve the last controlled value when the caller releases ownership.
    if (controlled && !areContextValuesEqual(controlled, stored))
      setStored(controlled)
    else if (selection === 'single' && stored.end !== null)
      setStored({ start: stored.start ?? stored.end, end: null })
    const current = controlled ?? stored
    const selected =
      selection === 'single'
        ? { start: current.start ?? current.end, end: null }
        : current
    const [initialView] = useState(() =>
      viewDate !== undefined || defaultViewDate === undefined
        ? undefined
        : readDate(defaultViewDate, 'defaultViewDate'),
    )
    if (!Array.isArray(disabledDates))
      throw new RangeError(
        'Calendar disabledDates must be an array of YYYY-MM-DD strings',
      )
    const constraints = {
      min: min === undefined ? null : readDate(min, 'min'),
      max: max === undefined ? null : readDate(max, 'max'),
      disabledDates: Array.from(disabledDates, (date, index) =>
        readDate(date, `disabledDates[${index}]`),
      ),
      excludeDisabledDates,
    }
    return (
      <CalendarGrid
        {...nativeProps}
        ref={ref}
        value={selection === 'range' ? selected : selected.start}
        viewDate={
          viewDate === undefined
            ? undefined
            : readDate(viewDate, 'viewDate').slice(0, 7) + '-01'
        }
        defaultViewDate={
          initialView === undefined
            ? undefined
            : initialView.slice(0, 7) + '-01'
        }
        min={constraints.min}
        max={constraints.max}
        disabledDates={constraints.disabledDates}
        disabled={disabled}
        readOnly={readOnly}
        locale={locale}
        labels={resolveLabels(defaultCalendarLabels, labels, 'Calendar')}
        weekStartsOn={weekStartsOn}
        onViewDateChange={onViewDateChange}
        className={className}
        onDateSelect={(date) => {
          const next =
            selection === 'range'
              ? getNextDateRange(selected, date, (range) =>
                  isDateRangeDisabled(range, constraints),
                )
              : { start: date, end: null }
          if (areContextValuesEqual(selected, next)) return
          if (value === undefined) setStored(next)
          if (props.selection === 'range')
            props.onValueChange?.({ value: next })
          else props.onValueChange?.({ value: date })
        }}
      />
    )
  },
)
