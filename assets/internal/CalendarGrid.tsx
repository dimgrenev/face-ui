import {
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
} from 'react'
import { mergeProps } from '../adapters/react/merge-props'
import { useMachine } from '../adapters/react/use-machine'
import { useControllableState } from '../adapters/react/use-controllable-state'
import { useComposedRefs } from '../adapters/react/use-composed-refs'
import { withOwnedContext } from './date-value'
import { calendarMachine, connectCalendar } from '../machines/calendar.machine'
import { type DateRangeISO, getTodayISO } from '../date-utils'
import { cn } from '../utils'
import {
  defaultCalendarLabels,
  type CalendarLabels,
} from '../runtime/date-labels'
import { Icon } from '../../Icon/Icon'
import { Button } from '../../Button/Button'
import { Text } from '../../Text/Text'
import {
  createDateNumberFormatter,
  resolveDateLocale,
} from '../runtime/date-locale'

export type CalendarRootAttributes = Omit<
  HTMLAttributes<HTMLDivElement>,
  | 'children'
  | 'dangerouslySetInnerHTML'
  | 'role'
  | 'defaultValue'
  | 'defaultChecked'
  | 'autoFocus'
  | 'contentEditable'
  | 'suppressContentEditableWarning'
  | 'onChange'
  | 'onChangeCapture'
  | 'onInput'
  | 'onInputCapture'
  | 'onBeforeInput'
  | 'onBeforeInputCapture'
  | 'aria-activedescendant'
  | 'aria-multiselectable'
  | 'aria-selected'
  | 'aria-disabled'
  | 'aria-readonly'
  | 'aria-required'
>

interface CalendarGridProps extends CalendarRootAttributes {
  value: string | DateRangeISO
  viewDate?: string
  defaultViewDate?: string
  min?: string | null
  max?: string | null
  disabledDates?: string[]
  disabled?: boolean
  readOnly?: boolean
  isDateUnavailable?: (date: string) => boolean
  locale?: string
  labels?: CalendarLabels
  timezone?: string
  weekStartsOn?: number
  onViewDateChange?: (details: { viewDate: string }) => void
  onDateSelect: (date: string) => void
  className?: string
}

/** Shared navigation and rendering. The owner decides what a day activation
 * means (single, range, week, datetime) and whether it changes its value. */
export const CalendarGrid = forwardRef<HTMLDivElement, CalendarGridProps>(
  function CalendarGrid(
    {
      value,
      viewDate: controlledView,
      defaultViewDate,
      min = null,
      max = null,
      disabledDates = [],
      disabled = false,
      readOnly = false,
      isDateUnavailable,
      locale: requestedLocale = 'en-US',
      labels = defaultCalendarLabels,
      timezone,
      weekStartsOn,
      onViewDateChange,
      onDateSelect,
      className,
      ...nativeProps
    },
    ref,
  ) {
    const { locale } = useMemo(
      () => resolveDateLocale('Calendar', requestedLocale),
      [requestedLocale],
    )
    const numbers = useMemo(() => createDateNumberFormatter(locale), [locale])
    const range =
      typeof value === 'object' && value !== null ? value : undefined
    const selectedDate =
      typeof value === 'string' ? value : (range?.start ?? range?.end ?? null)
    const today = getTodayISO(timezone)
    const [viewDate, setViewDate] = useControllableState({
      value: controlledView,
      defaultValue: () =>
        defaultViewDate ?? (selectedDate ?? today).slice(0, 7) + '-01',
      onChange: (viewDate: string) => onViewDateChange?.({ viewDate }),
      name: ['Calendar', 'viewDate'],
    })
    // The first focused day is machine state; React owns the selection and the viewed month.
    const [machine] = useState(() => ({
      ...calendarMachine,
      context: {
        ...calendarMachine.context,
        focusedDate:
          selectedDate ??
          (viewDate.slice(0, 7) === today.slice(0, 7) ? today : viewDate),
      },
    }))
    const owned = { value: selectedDate, viewDate }
    const { state, send } = useMachine(machine, {
      ...owned,
      min,
      max,
      disabledDates,
      disabled,
      readOnly,
      locale,
      labels,
      timezone: timezone ?? null,
      weekStartsOn: weekStartsOn ?? null,
      onViewDateChange: (details) => setViewDate(details.viewDate),
    })
    const api = connectCalendar(withOwnedContext(machine, state, owned), send)
    const days = api.days.map((day) => ({
      ...day,
      isDisabled: day.isDisabled || Boolean(isDateUnavailable?.(day.date)),
    }))
    const rootRef = useRef<HTMLDivElement | null>(null)
    const gridHasFocus = useRef(false)
    const setRefs = useComposedRefs(rootRef, ref)
    useEffect(() => {
      if (!disabled && gridHasFocus.current)
        rootRef.current
          ?.querySelector<HTMLElement>(`[data-date="${api.focusedDate}"]`)
          ?.focus({ preventScroll: true })
    }, [api.focusedDate, viewDate, disabled])
    const selectDate = (
      date: string,
      event?: { defaultPrevented: boolean },
    ) => {
      if (event?.defaultPrevented || !api.isDateSelectable(date)) return
      if (!days.some((day) => day.date === date && !day.isDisabled)) return
      send({ type: 'SELECT_DATE', date })
      onDateSelect(date)
    }
    return (
      <div
        ref={setRefs}
        {...mergeProps<Record<string, unknown>>(
          {
            ...api.getRootProps(),
            onFocusCapture(event: React.FocusEvent<HTMLDivElement>) {
              gridHasFocus.current = (event.target as HTMLElement).hasAttribute(
                'data-date',
              )
            },
            onBlurCapture(event: React.FocusEvent<HTMLDivElement>) {
              gridHasFocus.current = Boolean(
                (event.relatedTarget as HTMLElement | null)?.hasAttribute?.(
                  'data-date',
                ) &&
                event.currentTarget.contains(
                  event.relatedTarget as Node | null,
                ),
              )
            },
          },
          { ...nativeProps },
        )}
        role="group"
        aria-disabled={disabled || undefined}
        aria-readonly={undefined}
        contentEditable={undefined}
        dangerouslySetInnerHTML={undefined}
        className={cn('uf-calendar', className)}
      >
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
            align="center"
            fullWidth
            className="uf-calendar-titleText"
          >
            {api.monthLabel}
          </Text>
          <Button
            {...api.getNextMonthProps()}
            icon={<Icon name="arrow-right" />}
            iconOnly
            fullWidth={false}
            className="uf-calendar-navButton"
          />
        </div>

        <table
          {...api.getGridProps()}
          aria-multiselectable={range !== undefined || undefined}
          onKeyDown={(event) => {
            if (
              disabled ||
              event.defaultPrevented ||
              event.altKey ||
              event.ctrlKey ||
              event.metaKey ||
              event.nativeEvent.isComposing
            )
              return
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              const day = days.find((day) => day.date === api.focusedDate)
              if (day && !day.isDisabled) {
                selectDate(day.date)
              }
            } else api.getGridProps().onKeyDown(event)
          }}
        >
          <thead>
            <tr>
              {api.weekdayLabels.map((label, i) => {
                return (
                  <th key={i} {...api.getWeekdayProps(i)}>
                    <Text
                      as="span"
                      inset="none"
                      className="uf-calendar-weekdayText"
                    >
                      {label}
                    </Text>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 6 }, (_, weekIndex) => (
              <tr key={weekIndex}>
                {Array.from({ length: 7 }, (_, column) => {
                  const day =
                    days[weekIndex * 7 + column - api.leadingEmptyDays]
                  if (!day)
                    return (
                      <td
                        key={`empty-${column}`}
                        role="gridcell"
                        aria-disabled="true"
                      />
                    )
                  const dayProps = api.getDayProps(day)
                  const isRangeStart =
                    range !== undefined && range?.start === day.date
                  const isRangeEnd =
                    range !== undefined && range?.end === day.date
                  const isRangeBetween =
                    range !== undefined &&
                    Boolean(
                      range?.start &&
                      range?.end &&
                      day.date > range?.start &&
                      day.date < range?.end,
                    )
                  return (
                    <td
                      key={day.date}
                      role="gridcell"
                      aria-selected={
                        day.isSelected ||
                        isRangeStart ||
                        isRangeEnd ||
                        isRangeBetween
                      }
                    >
                      <Button
                        {...dayProps}
                        fullWidth
                        className="uf-calendar-dayButton"
                        data-range-start={isRangeStart || undefined}
                        data-range-end={isRangeEnd || undefined}
                        data-range-between={isRangeBetween || undefined}
                        onClick={(event) => selectDate(day.date, event)}
                      >
                        {numbers.format(day.dayOfMonth)}
                      </Button>
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
