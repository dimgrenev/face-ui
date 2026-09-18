import { Calendar, type CalendarRangeValue } from '../../../index'

export const calendarViewedMonth = <Calendar value="2026-09-12" viewDate="2026-09-01" defaultViewDate="2026-09-01" onValueChange={({value})=>{value.toUpperCase()}} onViewDateChange={({viewDate})=>{viewDate.slice(0,7)}} />
export const calendarRangeValue: CalendarRangeValue = { start: '2026-09-12', end: null }
export const calendarRange = <Calendar selection="range" value={calendarRangeValue} onValueChange={({value})=>{value.start?.slice(0,7)}} />
// @ts-expect-error Calendar accepts civil ISO dates; instants need an explicit application conversion.
export const calendarNativeDate = <Calendar value={new Date()} />
// @ts-expect-error Viewed months use the same civil ISO representation.
export const calendarNativeView = <Calendar viewDate={new Date()} />
// @ts-expect-error Single selection cannot consume a range.
export const calendarSingleRange = <Calendar value={{start:'2026-09-12',end:'2026-09-13'}} />
// @ts-expect-error Range selection cannot consume a single value.
export const calendarRangeSingle = <Calendar selection="range" value="2026-09-12" />
// @ts-expect-error Incomplete endpoints are explicit null values.
export const calendarMissingEnd = <Calendar selection="range" defaultValue={{start:'2026-09-12'}} />
// @ts-expect-error Viewed-month navigation has its own callback payload.
export const calendarViewWrongCallback = <Calendar onViewDateChange={({value})=>{value}} />

export const calendarNativeRoot = <Calendar id="booking-days" className="calendar" style={{width:280}} dir="rtl" lang="ar" hidden aria-label="Booking days" aria-describedby="booking-help" tabIndex={-1} ref={node=>{const group: HTMLDivElement | null = node; group?.focus()}} onKeyDownCapture={event=>{const group: HTMLDivElement = event.currentTarget; group.focus()}} />
export const calendarNullableDefault = <Calendar defaultValue={null} />
export const calendarNullableRangeDefault = <Calendar selection="range" defaultValue={null} />
const readonlyHolidays = ['2026-09-12'] as const
export const calendarReadonlyHolidays = <Calendar disabledDates={readonlyHolidays} />
// @ts-expect-error Calendar owns its generated grid content.
export const calendarChildren = <Calendar>Replace grid</Calendar>
// @ts-expect-error Raw HTML cannot replace the generated calendar.
export const calendarRawHTML = <Calendar dangerouslySetInnerHTML={{__html:'Replace grid'}} />
// @ts-expect-error Editing DOM text cannot edit Calendar value.
export const calendarEditable = <Calendar contentEditable />
// @ts-expect-error Use the group ref and tabIndex for explicit root focus; div autoFocus has no control semantics.
export const calendarAutoFocus = <Calendar autoFocus />
// @ts-expect-error Calendar owns its group semantics.
export const calendarRole = <Calendar role="button" />
// @ts-expect-error onValueChange is the selection event; Calendar has no native input change.
export const calendarNativeChange = <Calendar onChange={()=>{}} />

export const calendarDisabled = <Calendar disabled />
export const calendarReadOnlyRange = <Calendar selection="range" readOnly value={{start:'2026-09-12',end:'2026-09-16'}} />
// @ts-expect-error Interaction state is a boolean.
export const calendarStringReadOnly = <Calendar readOnly="true" />
// @ts-expect-error disabled owns its ARIA state; an ARIA-only flag cannot disable interaction.
export const calendarDisabledAlias: import('../../../Calendar/Calendar').CalendarProps = { 'aria-disabled': true }
// @ts-expect-error readOnly owns the inner grid's state; the group cannot expose a competing alias.
export const calendarReadOnlyAlias: import('../../../Calendar/Calendar').CalendarProps = { 'aria-readonly': true }

export const calendarEndpointRange = <Calendar selection="range" excludeDisabledDates={false} disabledDates={['2026-09-14']} />
// @ts-expect-error Interior range policy has no effect on a single value.
export const calendarSingleRangePolicy = <Calendar excludeDisabledDates />

// Complete translation dictionaries and partial per-instance wording overrides.
export const calendarLocalized = <Calendar labels={{ previousMonth: 'Предыдущий месяц', nextMonth: 'Следующий месяц' }} />
// @ts-expect-error unknown dictionary keys must not silently do nothing
export const calendarUnknownLabel = <Calendar labels={{ previousYear: 'Назад' }} />
