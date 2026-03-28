/**
 * Calendar — standalone date picker grid.
 *
 * `<Calendar value={date} onValueChange={({ value }) => setDate(value)} />`
 *
 * Public API uses Date objects. Internal machine uses ISO strings.
 */

import { forwardRef } from 'react'
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
  value?: Date | null
  /** Default selected date (uncontrolled). */
  defaultValue?: Date
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
  onValueChange?: (details: { value: Date }) => void
  /** Additional CSS class. */
  className?: string
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

function getViewDate(value?: Date | null, defaultValue?: Date): string {
  if (value) return dateToISO(value).slice(0, 7) + '-01'
  if (defaultValue) return dateToISO(defaultValue).slice(0, 7) + '-01'
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
      min,
      max,
      disabledDates = [],
      locale = 'en-US',
      weekStartsOn = 0,
      onValueChange,
      className,
    } = props

    const selectedISO = useControllableMachineProp(
      value !== undefined ? (value ? dateToISO(value) : null) : undefined,
      defaultValue ? dateToISO(defaultValue) : null,
    )
    const viewDate = useControllableMachineProp<string | null>(undefined, getViewDate(value, defaultValue))
    const focusedDate = useControllableMachineProp<string | null>(undefined, selectedISO ?? viewDate)

    const handleValueChange = onValueChange
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

    return (
      <div ref={ref} {...api.getRootProps()} className={cn('uf-calendar', className)}>
        <div {...api.getHeaderProps()}>
          <Button
            {...api.getPrevMonthProps()}
            icon={<Icon name="left" size={16} />}
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
            icon={<Icon name="right" size={16} />}
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
                {api.days.slice(weekIndex * 7, weekIndex * 7 + 7).map((day) => (
                  <td key={day.date}>
                    <Button
                      {...api.getDayProps(day)}
                      text={String(day.dayOfMonth)}
                      fullWidth
                      className="uf-calendar-dayButton"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  },
)
