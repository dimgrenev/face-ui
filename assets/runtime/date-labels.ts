export interface CalendarLabels {
  /** Accessible name of the previous-month button. */
  previousMonth: string
  /** Accessible name of the next-month button. */
  nextMonth: string
}

/** Internal controls only. Field labels, placeholders and dialog titles keep
 * their existing content APIs rather than duplicating them in this dictionary. */
export interface DateLabels extends CalendarLabels {
  /** Accessible name of the calendar group inside the picker. */
  calendar: string
  /** Day view switch. */
  day: string
  /** Month view switch and choice group. */
  month: string
  /** Year view switch and choice group. */
  year: string
  /** Hour view switch and choice group. */
  hours: string
  /** Minute view switch and choice group. */
  minutes: string
  /** Button for editing the start of a time range. */
  start: string
  /** Button for editing the end of a time range. */
  end: string
  /** Accessible name of the start/end selector. */
  rangeEndpoint: string
  /** Previous year in the month view. */
  previousYear: string
  /** Next year in the month view. */
  nextYear: string
  /** Previous page of twelve years in the year view. */
  previousYearPage: string
  /** Next page of twelve years in the year view. */
  nextYearPage: string
  /** Clear action, visible text and accessible name. */
  clear: string
  /** Current day/time action, visible text and accessible name. */
  now: string
  /** Accessible name of the sheet close button. */
  close: string
}

export const defaultCalendarLabels: CalendarLabels = Object.freeze({
  previousMonth: 'Previous month',
  nextMonth: 'Next month',
})

export const defaultDateLabels: DateLabels = Object.freeze({
  ...defaultCalendarLabels,
  calendar: 'Calendar',
  day: 'Day',
  month: 'Month',
  year: 'Year',
  hours: 'Hour',
  minutes: 'Minute',
  start: 'Start',
  end: 'End',
  rangeEndpoint: 'Range endpoint',
  previousYear: 'Previous year',
  nextYear: 'Next year',
  previousYearPage: 'Previous 12 years',
  nextYearPage: 'Next 12 years',
  clear: 'Clear',
  now: 'Now',
  close: 'Close',
})
