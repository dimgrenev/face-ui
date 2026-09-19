import { forwardRef, useState } from 'react'
import {
  CalendarGrid,
  type CalendarRootAttributes,
} from '../assets/internal/CalendarGrid'
import {
  readCivilDay,
  readDateList,
  readDateShape,
} from '../assets/internal/date-value'
import { projectDateValue, type DateValueISO } from '../assets/date-utils'
import { useControllableState } from '../assets/adapters/react/use-controllable-state'
import { useIsomorphicLayoutEffect } from '../assets/adapters/react/use-isomorphic-layout-effect'
import { readWeekStartsOn } from '../assets/runtime/date-locale'
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
        /** Select one day, or a range from a start day to an end day. */
        selection?: 'single'
        /** Exclude unavailable days from the whole range; false constrains only its endpoints. */
        excludeDisabledDates?: never
        /** Selected day or range as YYYY-MM-DD; null clears the controlled value. */
        value?: string | null
        /** Initial uncontrolled day or range as YYYY-MM-DD. */
        defaultValue?: string | null
        /** Called once per user selection, with the day or the range, including an incomplete one. */
        onValueChange?: (details: { value: string }) => void
      }
    | {
        /** Select one day, or a range from a start day to an end day. */
        selection: 'range'
        /** Exclude unavailable days from the whole range; false constrains only its endpoints. */
        excludeDisabledDates?: boolean
        /** Selected day or range as YYYY-MM-DD; null clears the controlled value. */
        value?: CalendarRangeValue | null
        /** Initial uncontrolled day or range as YYYY-MM-DD. */
        defaultValue?: CalendarRangeValue | null
        /** Called once per user selection, with the day or the range, including an incomplete one. */
        onValueChange?: (details: { value: CalendarRangeValue }) => void
      }
  )

/** A civil-day selector. ISO dates are independent of the browser's timezone. */
export const Calendar = forwardRef<HTMLDivElement, CalendarProps>(
  function Calendar(props, ref) {
    const {
      value,
      defaultValue,
      viewDate,
      defaultViewDate,
      onViewDateChange,
      selection = 'single',
      onValueChange,
      min,
      max,
      disabledDates,
      excludeDisabledDates = true,
      disabled = false,
      readOnly = false,
      locale = 'en-US',
      labels,
      weekStartsOn,
      className,
      ...nativeProps
    } = props
    const project = (input: unknown, prop: string) =>
      projectDateValue(readDateShape(input, prop, readCivilDay), 'date', selection)
    const [current, setCurrent, replaceCurrent] = useControllableState({
      value: value === undefined ? undefined : project(value, 'value'),
      // A default is not read while the value is controlled, so it cannot be reported then.
      defaultValue: () =>
        value === undefined ? project(defaultValue, 'defaultValue') : null,
      onChange: (next: DateValueISO) =>
        (onValueChange as ((details: { value: DateValueISO }) => void) | undefined)?.({
          value: next,
        }),
      equal: areContextValuesEqual,
      name: ['Calendar', 'value'],
    })
    const selected = projectDateValue(current, 'date', selection)
    // A range made single keeps only its start, so switching back does not resurrect the end.
    useIsomorphicLayoutEffect(() => {
      if (!areContextValuesEqual(selected, current)) replaceCurrent(selected)
    }, [selection])
    const range =
      typeof selected === 'object' && selected !== null
        ? selected
        : { start: selected, end: null }
    const month = (input: unknown, prop: string) =>
      readCivilDay(input, prop)?.slice(0, 7).concat('-01') ?? undefined
    const [initialView] = useState(() =>
      viewDate === undefined ? month(defaultViewDate, 'defaultViewDate') : undefined,
    )
    const constraints = {
      min: readCivilDay(min, 'min'),
      max: readCivilDay(max, 'max'),
      disabledDates: readDateList(disabledDates, 'Calendar', 'disabledDates', readCivilDay),
      excludeDisabledDates,
    }
    return (
      <CalendarGrid
        {...nativeProps}
        ref={ref}
        value={selected}
        viewDate={month(viewDate, 'viewDate')}
        defaultViewDate={initialView}
        min={constraints.min}
        max={constraints.max}
        disabledDates={constraints.disabledDates}
        disabled={disabled}
        readOnly={readOnly}
        locale={locale}
        labels={resolveLabels(defaultCalendarLabels, labels, 'Calendar')}
        weekStartsOn={readWeekStartsOn('Calendar', weekStartsOn) ?? undefined}
        onViewDateChange={onViewDateChange}
        className={className}
        onDateSelect={(date) =>
          setCurrent(
            selection === 'range'
              ? getNextDateRange(range, date, (range) =>
                  isDateRangeDisabled(range, constraints),
                )
              : date,
          )
        }
      />
    )
  },
)
