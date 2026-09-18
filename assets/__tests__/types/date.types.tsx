import {
  Calendar,
  type DateLabels as CompleteDateLabels,
  type CalendarLabels as CompleteCalendarLabels,
} from '../../../index'
import { Date as DatePicker, type DateProps } from '../../../Date/Date'

export const dateNativeProps = <DatePicker id="date" autoFocus open defaultOpen labels={{close:"Close calendar"}} style={{width:320}} aria-label="Delivery" onClick={event=>{event.currentTarget.focus()}} ref={node=>{node?.form?.checkValidity()}} />
// @ts-expect-error Date exposes the actual trigger button, not its wrapper.
export const dateDivRef = <DatePicker ref={(node: HTMLDivElement | null)=>{node?.align}} />
// @ts-expect-error Date owns its trigger type; it cannot submit the form.
export const dateSubmit = <DatePicker type="submit" />
// @ts-expect-error Form submit actions have no meaning on a picker trigger.
export const dateFormAction = <DatePicker formAction="/save" />
// @ts-expect-error There is one value-change callback for the Date model.
export const dateNativeChange = <DatePicker onChange={()=>{}} />
// @ts-expect-error Expanded state comes from open, not a conflicting ARIA override.
export const dateExpanded: DateProps = { 'aria-expanded': true }
// @ts-expect-error A Date has no checked state.
export const dateChecked = <DatePicker defaultChecked />
export const dateBirthYear = <DatePicker openTo="year" />
export const dateTimeView = <DatePicker mode="time" openTo="minutes" />
export const dateWeek = <DatePicker mode="week" openTo="month" value={{start:'2026-09-07',end:'2026-09-13'}} />
export const dateSingleISOCallback = <DatePicker value={new Date()} onValueChange={({value})=>{ const iso: string | null = value; iso?.slice(0,10) }} />
export const dateSingleInstantCallback = <DatePicker valueFormat="date" value="2026-09-12" onValueChange={({value})=>{ const instant: Date | null = value; instant?.getTime() }} />
export const dateRangeISOCallback = <DatePicker selection="range" onValueChange={({value})=>{ const start: string | null = value.start; start?.slice(0,10) }} />
export const dateWeekInstantCallback = <DatePicker mode="week" valueFormat="date" onValueChange={({value})=>{ const start: Date | null = value.start; start?.getTime() }} />
// @ts-expect-error Single selection cannot silently discard a range.
export const dateSingleRangeValue = <DatePicker value={{start:'2026-09-12',end:null}} />
// @ts-expect-error Range selection needs explicit endpoints.
export const dateRangePointValue = <DatePicker selection="range" value="2026-09-12" />
// @ts-expect-error Week input uses the same range model as its callback and form.
export const dateWeekPointValue = <DatePicker mode="week" defaultValue="2026-09-12" />
// @ts-expect-error Partial ranges represent an unknown endpoint with null.
export const dateIncompleteRangeShape = <DatePicker selection="range" value={{start:'2026-09-12'}} />
// @ts-expect-error Mode is the only source of supported views.
export const dateCustomViews = <DatePicker views={['day']} />
// @ts-expect-error A time picker has no calendar year view.
export const dateTimeYear = <DatePicker mode="time" openTo="year" />
// @ts-expect-error A year picker cannot open a more precise calendar view.
export const dateYearDay = <DatePicker mode="year" openTo="day" />
// @ts-expect-error Week mode always selects a whole week; selection is redundant.
export const dateWeekSelection = <DatePicker mode="week" selection="range" />

export const dateExplicitPresets = <DatePicker presets={[{id:'release',label:'Release',value:'2026-09-12'}] as const} labels={{clear:"Очистить",now:"Сейчас"}} />
export const dateRangePresets = <DatePicker selection="range" presets={[{id:'period',label:'Period',value:{start:'2026-09-01',end:'2026-09-30'}}] as const} />
// @ts-expect-error Explicit presets are their own visibility source.
export const datePresetVisibilityAlias = <DatePicker showPresets />
// @ts-expect-error Actions need stable identity independently of label and value.
export const dateUnidentifiedPreset = <DatePicker presets={[{label:'Release',value:'2026-09-12'}]} />
// @ts-expect-error A single picker cannot apply a range action.
export const dateRangePresetInSingle = <DatePicker presets={[{id:'period',label:'Period',value:{start:'2026-09-01',end:'2026-09-30'}}]} />
// @ts-expect-error Week actions use a range, just like week values.
export const dateSinglePresetInWeek = <DatePicker mode="week" presets={[{id:'day',label:'Day',value:'2026-09-12'}]} />
// @ts-expect-error An empty action duplicates Clear and cannot select a date.
export const dateEmptyPreset = <DatePicker presets={[{id:'empty',label:'Empty',value:null}]} />
const readonlyHolidays = ['2026-09-12'] as const
export const dateReadonlyHolidays = <DatePicker disabledDates={readonlyHolidays} />
export const dateEndpointRange = <DatePicker selection="range" excludeDisabledDates={false} disabledDates={['2026-09-14']} />
// @ts-expect-error Interior range policy has no effect on a single field value.
export const dateSingleRangePolicy = <DatePicker excludeDisabledDates />
// @ts-expect-error A week always requires all seven days; its selection is not an arbitrary interval.
export const dateWeekRangePolicy = <DatePicker mode="week" excludeDisabledDates={false} />
// @ts-expect-error The range policy is a boolean, not a string flag.
export const dateStringRangePolicy = <DatePicker selection="range" excludeDisabledDates="false" />
export const dateLocalized = <DatePicker labels={{ previousMonth: 'Назад', month: 'Месяц', clear: 'Очистить', now: 'Сейчас', close: 'Закрыть' }} />
// @ts-expect-error labels are plain text
export const dateRichInternalLabel = <DatePicker labels={{ clear: <span>Clear</span> }} />
// @ts-expect-error use labels.clear
export const dateRemovedClearLabel = <DatePicker clearLabel="Clear" />
// @ts-expect-error use labels.now
export const dateRemovedNowLabel = <DatePicker nowLabel="Now" />
// @ts-expect-error use labels.close
export const dateRemovedCloseLabel = <DatePicker closeLabel="Close" />
export const dateDictionary: CompleteDateLabels = { calendar:'Calendar',previousMonth:'Previous month',nextMonth:'Next month',previousYear:'Previous year',nextYear:'Next year',previousYearPage:'Previous 12 years',nextYearPage:'Next 12 years',day:'Day',month:'Month',year:'Year',hours:'Hour',minutes:'Minute',start:'Start',end:'End',rangeEndpoint:'Range endpoint',clear:'Clear',now:'Now',close:'Close' }
export const calendarDictionary: CompleteCalendarLabels = dateDictionary
export const calendarSharedDictionary = <Calendar labels={dateDictionary} />
