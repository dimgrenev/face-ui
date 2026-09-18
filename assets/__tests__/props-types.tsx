import { Switcher } from '../../Switcher/Switcher'
import { Accordion, type AccordionItem } from '../../Accordion/Accordion'
const immutableAccordionItems: readonly AccordionItem[] = Object.freeze([{value:'account',label:'Account',content:'Settings',region:true}])
export const accordionNativeProps = <Accordion items={immutableAccordionItems} expandedIds={Object.freeze(['account'])} defaultExpandedIds={Object.freeze([])} headingLevel={2} id="sections" dir="rtl" lang="ru" style={{width:320}} hidden className="test" aria-label="Sections" role="group" onClickCapture={event=>event.preventDefault()} onKeyDown={event=>{event.currentTarget.focus()}} ref={node=>{node?.focus()}} />
// @ts-expect-error items owns the accordion's content.
export const accordionChildren = <Accordion>Ignored content</Accordion>
// @ts-expect-error items owns the accordion's markup.
export const accordionHtml = <Accordion dangerouslySetInnerHTML={{__html:'ignored'}} />
// @ts-expect-error Accordion is not a form field; defaultExpandedIds owns initial expansion.
export const accordionDefaultValue = <Accordion defaultValue="account" />
// @ts-expect-error A div cannot have a default checked state.
export const accordionDefaultChecked = <Accordion defaultChecked />
// @ts-expect-error Focus belongs to user navigation; React does not autofocus the root div.
export const accordionAutoFocus = <Accordion autoFocus />
// @ts-expect-error Editing the library-owned disclosure markup is not a content editor API.
export const accordionEditable = <Accordion contentEditable />
// @ts-expect-error There is no contentEditable API on the root.
export const accordionEditableWarning = <Accordion suppressContentEditableWarning />
// @ts-expect-error There are six native heading levels.
export const accordionHeading = <Accordion headingLevel={7} />
// @ts-expect-error Item identities are not coerced.
export const accordionNumericIdentity = <Accordion items={[{value:1,label:'One',content:'One'}]} />
// @ts-expect-error Expanded identities are string values.
export const accordionNumericValue = <Accordion expandedIds={[1]} />
// @ts-expect-error The forwarded ref owns the root div.
export const accordionButtonRef = <Accordion ref={(node: HTMLButtonElement|null)=>{node?.click()}} />
import { Membrane } from '../adapters/react/Membrane'
import {
  Avatar,
  Badge,
  Bar,
  Button,
  ButtonGroup,
  Card,
  Calendar,
  Checkbox,
  Icon,
  Input,
  Radio,
  Text,
  Tile,
} from '../../index'
import type { RadioOption, CalendarRangeValue } from '../../index'
import { Date as DatePicker, type DateProps } from '../../Date/Date'

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

export const checkboxNative = <Checkbox checked="indeterminate" defaultChecked={false} name="permission" value="edit" form="settings" required autoFocus fullWidth aria-label="Permission" onChange={event=>{event.currentTarget.checked}} ref={node=>{node?.focus()}} />
// @ts-expect-error Checkbox owns the input type.
export const checkboxType = <Checkbox type="radio" />
// @ts-expect-error Selection comes from checked, not a native text default.
export const checkboxDefaultValue = <Checkbox defaultValue="yes" />
// @ts-expect-error readOnly has no native meaning for a checkbox; disabled prevents activation.
export const checkboxReadOnly = <Checkbox readOnly />
// @ts-expect-error Native text validation does not apply to checkboxes.
export const checkboxPattern = <Checkbox pattern=".*" />
// @ts-expect-error The label slot owns visible content.
export const checkboxChildren = <Checkbox>Choice</Checkbox>
// @ts-expect-error Checkbox preserves its native checkbox role.
export const checkboxRole = <Checkbox role="switch" />

const radioOptions: readonly RadioOption[] = [{value:'',label:<strong>Default</strong>,id:'default-choice','aria-describedby':'choice-help'}]
export const radioNativeProps = <Radio options={radioOptions} value={null} name="plan" required form="settings" aria-label="Plan" style={{width:320}} ref={node=>{node?.focus()}} />
export const unnamedRadio = <Radio options={radioOptions} />
// @ts-expect-error Native radio group validation requires a submission name.
export const unnamedRequiredRadio = <Radio required />
// @ts-expect-error Group content comes from options; arbitrary children are not rendered.
export const radioChildren = <Radio>Plan</Radio>
// @ts-expect-error Accessible names use native attributes.
export const radioAriaAlias = <Radio ariaLabel="Plan" />
// @ts-expect-error External headings use native aria-labelledby.
export const radioLabelledByAlias = <Radio ariaLabelledBy="plan-heading" />
// @ts-expect-error Selection belongs to value/defaultValue, not a group checked flag.
export const radioDefaultChecked = <Radio defaultChecked />
// @ts-expect-error The radiogroup role is part of the component's semantics.
export const radioRole = <Radio role="listbox" />

export const logicalIcons = (
  <>
    <Button icon="search" iconPosition="start" />
    <Text icon="search" iconPosition="end" />
    <Tile icon="search" iconPosition="start" />
    <Input icon="search" iconPosition="end" />
  </>
)
// @ts-expect-error Icon position follows reading direction; physical aliases were removed.
export const physicalButtonIcon = <Button iconPosition="left" />
// @ts-expect-error Icon position follows reading direction; physical aliases were removed.
export const physicalTextIcon = <Text iconPosition="right" />
// @ts-expect-error Icon position follows reading direction; physical aliases were removed.
export const physicalTileIcon = <Tile iconPosition="left" />
// @ts-expect-error Icon position follows reading direction; physical aliases were removed.
export const physicalInputIcon = <Input iconPosition="right" />

export const avatar = (
  <Avatar
    name="Ada Lovelace"
    fallback={<Icon name="user" />}
    aria-label="Project owner"
    className="person"
    style={{ color: 'red' }}
  />
)
// @ts-expect-error Avatar has one custom fallback slot; icon is not a second owner.
export const avatarIcon = <Avatar icon="user" />
// @ts-expect-error Arbitrary child content must be passed to the fallback slot.
export const avatarChildren = <Avatar>AL</Avatar>
// @ts-expect-error The image/fallback DOM is owned by Avatar.
export const avatarHtml = <Avatar dangerouslySetInnerHTML={{ __html: 'AL' }} />
// @ts-expect-error Native input defaults have no meaning on an avatar span.
export const avatarChecked = <Avatar defaultChecked />

export const disclosure = (
  <Button text="Details" chevron="right" aria-expanded />
)
export const group = (
  <ButtonGroup aria-label="Formatting">
    <Button text="Bold" />
  </ButtonGroup>
)
// @ts-expect-error A single chevron direction replaces the competing selector flags.
export const buttonSelector = <Button selector />
// @ts-expect-error Expanded state uses the native ARIA attribute.
export const buttonSelectorOpen = <Button selectorOpen />
// @ts-expect-error Direction belongs to chevron.
export const buttonSelectorDirection = <Button selectorDirection="side" />
// @ts-expect-error A button has no checked input default.
export const buttonDefaultChecked = <Button defaultChecked />

export const quote = (
  <Text as="blockquote" variant="blockquote" size="xl">
    Quote
  </Text>
)
// @ts-expect-error Text owns its content slot.
export const textHtml = <Text dangerouslySetInnerHTML={{ __html: 'Text' }} />
// @ts-expect-error Badge is a span, not an input.
export const badgeDefault = <Badge defaultValue="Ready" />
// @ts-expect-error Icon has fixed design-system geometry.
export const iconWidth = <Icon name="user" style={{ width: 48 }} />

export const card = (
  <Card
    hoverable
    footerAlign="between"
    footer={{ __componentName__: 'Button', text: 'Save' }}
  >
    <Card.Header orientation="horizontal">
      <Card.Title size="lg">Title</Card.Title>
    </Card.Header>
    <Card.Footer align="end">Footer</Card.Footer>
  </Card>
)
export const bar = (
  <Bar>
    {[
      { __componentName__: 'Text', text: 'Workspace' },
      {
        __componentName__: 'Bar.Section',
        align: 'end',
        children: [{ __componentName__: 'Button', text: 'Run' }],
      },
    ]}
  </Bar>
)
// @ts-expect-error Card hover styling does not create an interactive control.
export const interactiveCard = <Card interactive />
// @ts-expect-error Footer position is alignment, not a separate layout model.
export const cardFooterLayout = <Card footerLayout="between" />
// @ts-expect-error Header direction uses orientation consistently with Bar.
export const cardHeaderLayout = <Card.Header layout="bar" />
// @ts-expect-error The surface owns its composed content.
export const cardHtml = <Card dangerouslySetInnerHTML={{ __html: 'Card' }} />

export const barSection = (
  <Bar.Section grow align="end">
    Content
  </Bar.Section>
)
// @ts-expect-error Sections render normally; marker-only parts were removed.
export const oldBarRight = <Bar.Right />
// @ts-expect-error Overlap is no longer a second Bar composition model.
export const oldBarOverlap = <Bar.LeftOverlap />

export const tile = (
  <Tile chevron="down" aria-expanded={false} aria-busy role="button" />
)
// @ts-expect-error Tile disclosure state belongs to aria-expanded.
export const oldTileSelector = <Tile selectorOpen />
// @ts-expect-error Tile has one disclosure indicator API.
export const oldTileIndicator = <Tile selector />
// @ts-expect-error Tile visual activity has one source.
export const oldTileDescendant = <Tile selectedDescendant />
// @ts-expect-error Native aria-busy owns busy state.
export const oldTileBusy = <Tile busy />
// @ts-expect-error Row purpose does not infer a second role taxonomy.
export const oldTileIntent = <Tile intent="tab" />
// @ts-expect-error Tile owns children.
export const tileHtml = <Tile dangerouslySetInnerHTML={{ __html: 'x' }} />
// @ts-expect-error A row is not an input.
export const tileDefault = <Tile defaultValue="x" />

// Membrane has one explicit addressing mechanism for a composed control.
export const membraneTarget = (
  <Membrane target="input" interactive>
    <input />
  </Membrane>
)
export const removedMembraneTargetRef = (
  // @ts-expect-error targetRef duplicated the target contract and had no consumers
  <Membrane targetRef={{ current: null }} />
)

export const nativeFields = <>
  <Input type="email" multiple autoComplete="email" aria-label="Email" inputMode="email" form="settings" />
  <Input multiline rows={4} autoGrow={false} ref={node => node?.focus()} aria-describedby="help" />
  <Input type="date" min="2026-01-01" max="2026-12-31" />
</>
// @ts-expect-error multiline is the native textarea mode
export const obsoleteInputLayout = <Input textLayout="wrap" />
// @ts-expect-error use native aria-label
export const obsoleteInputAria = <Input ariaLabel="Name" />
// @ts-expect-error ordinary ref targets the native control
export const obsoleteInputRef = <Input controlRef={() => {}} />
// @ts-expect-error stretchText had no observable behavior
export const obsoleteInputStretch = <Input stretchText />
// @ts-expect-error textarea has no numeric/date input type
export const incompatibleInputMode = <Input multiline type="number" />
// @ts-expect-error rows only size multiline fields
export const incompatibleInputRows = <Input rows={4} />
// @ts-expect-error autoGrow only sizes multiline fields
export const incompatibleInputGrowth = <Input autoGrow />
// @ts-expect-error textarea has no pattern validation
export const incompatibleInputPattern = <Input multiline pattern="[A-Z]+" />

export const nativeSwitch = <Switcher ref={node => node?.focus()} checked name="sync" value="enabled" form="settings" required autoFocus fullWidth truncate onChange={event => { const input: HTMLInputElement = event.currentTarget; input.checkValidity() }} />
// @ts-expect-error Switcher is a binary setting, not a tri-state summary.
export const mixedSwitch = <Switcher checked="indeterminate" />
// @ts-expect-error One shared truncation prop replaces textWrap.
export const obsoleteSwitchTextWrap = <Switcher textWrap="wrap" />
// @ts-expect-error label owns visible content.
export const switchChildren = <Switcher>Content</Switcher>
// @ts-expect-error native checkbox has no readOnly behavior.
export const switchReadOnly = <Switcher readOnly />
// @ts-expect-error role is owned by the switch component.
export const switchRole = <Switcher role="checkbox" />
// @ts-expect-error defaultChecked owns binary state.
export const switchDefaultValue = <Switcher defaultValue="on" />

// Select's mode owns the shape of its values and callbacks.
import { Select, type SelectOption } from '../../Select/Select'
const selectOptions: readonly SelectOption[] = [{ value: '', label: <strong>Default</strong>, textValue: 'Default' }]
export const singleSelect = <Select options={selectOptions} value={null} onValueChange={({value})=>{const single: string | null = value; return single}} ref={node=>{const button: HTMLButtonElement | null = node; button?.focus()}} aria-label="Plan" open={false} defaultOpen name="plan" required />
export const multipleSelect = <Select multiple options={selectOptions} value={['a'] as const} onValueChange={({value})=>{const items: readonly string[] = value; return items}} />
// @ts-expect-error A single select cannot receive an array.
export const singleSelectArray = <Select value={['a']} />
// @ts-expect-error Multiple selection requires an array, including for defaults.
export const multipleSelectString = <Select multiple defaultValue="a" />
// @ts-expect-error The empty multiple value is [], not null.
export const multipleSelectNull = <Select multiple value={null} />
// @ts-expect-error Use multiple for selection mode.
export const legacySelectType = <Select type="multiselect" />
// @ts-expect-error Use surface or iconOnly for their respective concerns.
export const legacySelectVariant = <Select variant="side" />
// @ts-expect-error Use the native accessible name.
export const legacySelectName = <Select ariaLabel="Plan" />
// @ts-expect-error Select owns its combobox semantics.
export const wrongSelectRole = <Select role="menu" />
// @ts-expect-error Selection changes are onValueChange; trigger onChange has no selection semantics.
export const wrongSelectChange = <Select onChange={()=>{}} />
// @ts-expect-error Content belongs to options and displayValue.
export const selectChildren = <Select>Plan</Select>

// @ts-expect-error The required prop owns both native validation and ARIA state.
export const redundantSelectRequired: import('../../Select/Select').SelectProps = { 'aria-required': true }
// @ts-expect-error The popup is owned by Select, not the native Popover API.
export const competingSelectPopup = <Select popoverTarget="another-popup" />

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

export const calendarNativeRoot = <Calendar id="booking-days" className="calendar" style={{width:280}} dir="rtl" lang="ar" hidden aria-label="Booking days" aria-describedby="booking-help" tabIndex={-1} ref={node=>{const group: HTMLDivElement | null = node; group?.focus()}} onKeyDownCapture={event=>{const group: HTMLDivElement = event.currentTarget; group.focus()}} />
export const calendarNullableDefault = <Calendar defaultValue={null} />
export const calendarNullableRangeDefault = <Calendar selection="range" defaultValue={null} />
const readonlyHolidays = ['2026-09-12'] as const
export const calendarReadonlyHolidays = <Calendar disabledDates={readonlyHolidays} />
export const dateReadonlyHolidays = <DatePicker disabledDates={readonlyHolidays} />
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
export const calendarDisabledAlias: import('../../Calendar/Calendar').CalendarProps = { 'aria-disabled': true }
// @ts-expect-error readOnly owns the inner grid's state; the group cannot expose a competing alias.
export const calendarReadOnlyAlias: import('../../Calendar/Calendar').CalendarProps = { 'aria-readonly': true }

export const calendarEndpointRange = <Calendar selection="range" excludeDisabledDates={false} disabledDates={['2026-09-14']} />
export const dateEndpointRange = <DatePicker selection="range" excludeDisabledDates={false} disabledDates={['2026-09-14']} />
// @ts-expect-error Interior range policy has no effect on a single value.
export const calendarSingleRangePolicy = <Calendar excludeDisabledDates />
// @ts-expect-error Interior range policy has no effect on a single field value.
export const dateSingleRangePolicy = <DatePicker excludeDisabledDates />
// @ts-expect-error A week always requires all seven days; its selection is not an arbitrary interval.
export const dateWeekRangePolicy = <DatePicker mode="week" excludeDisabledDates={false} />
// @ts-expect-error The range policy is a boolean, not a string flag.
export const dateStringRangePolicy = <DatePicker selection="range" excludeDisabledDates="false" />

// Complete translation dictionaries and partial per-instance wording overrides.
export const calendarLocalized = <Calendar labels={{ previousMonth: 'Предыдущий месяц', nextMonth: 'Следующий месяц' }} />
export const dateLocalized = <DatePicker labels={{ previousMonth: 'Назад', month: 'Месяц', clear: 'Очистить', now: 'Сейчас', close: 'Закрыть' }} />
// @ts-expect-error unknown dictionary keys must not silently do nothing
export const calendarUnknownLabel = <Calendar labels={{ previousYear: 'Назад' }} />
// @ts-expect-error labels are plain text
export const dateRichInternalLabel = <DatePicker labels={{ clear: <span>Clear</span> }} />
// @ts-expect-error use labels.clear
export const dateRemovedClearLabel = <DatePicker clearLabel="Clear" />
// @ts-expect-error use labels.now
export const dateRemovedNowLabel = <DatePicker nowLabel="Now" />
// @ts-expect-error use labels.close
export const dateRemovedCloseLabel = <DatePicker closeLabel="Close" />
import type { DateLabels as CompleteDateLabels, CalendarLabels as CompleteCalendarLabels } from '../../index'
export const dateDictionary: CompleteDateLabels = { calendar:'Calendar',previousMonth:'Previous month',nextMonth:'Next month',previousYear:'Previous year',nextYear:'Next year',previousYearPage:'Previous 12 years',nextYearPage:'Next 12 years',day:'Day',month:'Month',year:'Year',hours:'Hour',minutes:'Minute',start:'Start',end:'End',rangeEndpoint:'Range endpoint',clear:'Clear',now:'Now',close:'Close' }
export const calendarDictionary: CompleteCalendarLabels = dateDictionary
export const calendarSharedDictionary = <Calendar labels={dateDictionary} />
import { Pagination as AuditedPagination, Modal as AuditedPaginationModal } from '../../index'
import type { PaginationLabels } from '../../index'
import { createRef as createPaginationRef } from 'react'
export const paginationDictionary: Readonly<PaginationLabels> = { previousPage:'Назад',nextPage:'Далее',page:'Страница {page}',choosePage:'Страница',pageNumber:'Номер',goToPage:'Перейти',close:'Закрыть' }
export const paginationNative = <AuditedPagination ref={createPaginationRef<HTMLElement>()} labels={paginationDictionary} page={3} defaultPage={2} total={100} pageSize={10} siblingCount={2} membrane={false} disabled={false} surfaceTitle="Журнал" id="pages" className="pages" style={{width:300}} dir="rtl" lang="ru" hidden={false} aria-label="Pages" aria-labelledby="heading" data-page-nav="yes" onClickCapture={e=>e.preventDefault()} onPageChange={({page})=>page.toFixed()} />
export const paginationModalCloseLabel = <AuditedPaginationModal closeLabel="Закрыть" />
// @ts-expect-error Pagination owns the navigation children.
export const paginationInvalidChildren = <AuditedPagination>custom</AuditedPagination>
// @ts-expect-error Pagination owns the navigation markup.
export const paginationInvalidHTML = <AuditedPagination dangerouslySetInnerHTML={{__html:'custom'}} />
// @ts-expect-error Page is a number, not a coercible string.
export const paginationInvalidPage = <AuditedPagination page="2" />
// @ts-expect-error Pagination root is not a form field.
export const paginationInvalidDefaultValue = <AuditedPagination defaultValue="2" />
// @ts-expect-error Pagination root is not a checkable field.
export const paginationInvalidDefaultChecked = <AuditedPagination defaultChecked />
// @ts-expect-error A nav cannot honor native autofocus.
export const paginationInvalidAutoFocus = <AuditedPagination autoFocus />
// @ts-expect-error Editable markup conflicts with generated navigation controls.
export const paginationInvalidEditable = <AuditedPagination contentEditable />
// @ts-expect-error Editable markup is not part of Pagination's API.
export const paginationInvalidEditableWarning = <AuditedPagination suppressContentEditableWarning />
// @ts-expect-error The ref points at an HTML nav, not an SVG node.
export const paginationInvalidRef = <AuditedPagination ref={createPaginationRef<SVGSVGElement>()} />
// @ts-expect-error Labels are string templates, not callback formatters.
export const paginationInvalidLabels = <AuditedPagination labels={{page:(page:number)=>String(page)}} />
// @ts-expect-error surfaceTitle is not duplicated in the internal label dictionary.
export const paginationInvalidTitleAlias = <AuditedPagination labels={{surfaceTitle:'Pages'}} />
// @ts-expect-error Internal close labels must be strings.
export const paginationInvalidModalClose = <AuditedPaginationModal closeLabel={false} />
import { Breadcrumb as AuditedBreadcrumb } from '../../index'
import type { BreadcrumbItem as AuditedCrumbItem } from '../../Breadcrumb/Breadcrumb'
export const breadcrumbReadonlyItems: readonly AuditedCrumbItem[] = Object.freeze([{key:'root',label:'Root',href:'#root',onClick:e=>e.preventDefault()},{key:2,label:'Current'}])
export const breadcrumbNative = <AuditedBreadcrumb items={breadcrumbReadonlyItems} maxItems={null} membrane={false} separator={null} overflowLabel="Показать путь" ref={createPaginationRef<HTMLElement>()} id="path" lang="ru" dir="rtl" hidden={false} className="path" style={{width:320}} aria-label="Путь" onClickCapture={e=>e.preventDefault()} />
// @ts-expect-error Breadcrumb follows native navigation without a sandbox opt-in.
export const breadcrumbRemovedAllowNavigation = <AuditedBreadcrumb allowNavigation />
// @ts-expect-error maxItems names the bound including the overflow position.
export const breadcrumbRemovedCollapseAfter = <AuditedBreadcrumb collapseAfter={4} />
// @ts-expect-error The component owns its trail markup.
export const breadcrumbInvalidChildren = <AuditedBreadcrumb>custom</AuditedBreadcrumb>
// @ts-expect-error The component owns its trail markup.
export const breadcrumbInvalidHTML = <AuditedBreadcrumb dangerouslySetInnerHTML={{__html:'custom'}} />
// @ts-expect-error Navigation is not an editable field.
export const breadcrumbInvalidEditable = <AuditedBreadcrumb contentEditable />
// @ts-expect-error Navigation is not a value field.
export const breadcrumbInvalidDefaultValue = <AuditedBreadcrumb defaultValue="path" />
// @ts-expect-error Navigation cannot honor autofocus.
export const breadcrumbInvalidAutoFocus = <AuditedBreadcrumb autoFocus />
// @ts-expect-error The overflow name is text, not content markup.
export const breadcrumbInvalidOverflowLabel = <AuditedBreadcrumb overflowLabel={<span>Path</span>} />
// @ts-expect-error The ref belongs to the HTML nav.
export const breadcrumbInvalidRef = <AuditedBreadcrumb ref={createPaginationRef<SVGSVGElement>()} />

import { Tooltip } from '../../Tooltip/Tooltip'
import { Popover } from '../../Popover/Popover'
import { Overlay } from '../../Overlay/Overlay'

;<Tooltip defaultOpen openDelay={0} closeDelay={50} dir="auto" content="Hint" title="Native title" style={{ opacity: 0.5 }}><span>Term</span></Tooltip>
;<Popover defaultOpen side="right" align="end" sideOffset={8} aria-label="Details" content={<button>Action</button>}><button>Open</button></Popover>
;<Overlay trigger="hover" interactive openDelay={80} closeDelay={40} content="Details">Trigger</Overlay>
;<Overlay trigger="click" defaultOpen content="Details">Trigger</Overlay>
// @ts-expect-error Click opening has no hover delay.
;<Popover openDelay={50} />
// @ts-expect-error Click closing has no hover delay.
;<Popover closeDelay={50} />
// @ts-expect-error Popover is always interactive.
;<Popover interactive />
// @ts-expect-error Tooltip content is informational; choose Popover for actions.
;<Tooltip interactive />
// @ts-expect-error Tooltip has fixed hover/focus behavior.
;<Tooltip trigger="click" />
// @ts-expect-error Click compatibility overlay does not have hover-only options.
;<Overlay trigger="click" openDelay={20} />
// @ts-expect-error Click compatibility overlay does not have hover-only options.
;<Overlay trigger="click" interactive />
// @ts-expect-error Floating components own their semantic role.
;<Popover role="tooltip" />
// @ts-expect-error Floating components own their focus behavior.
;<Tooltip tabIndex={0} />
// @ts-expect-error Floating components own their focus behavior.
;<Popover autoFocus />
// @ts-expect-error Content is a React slot, not raw HTML.
;<Popover dangerouslySetInnerHTML={{ __html: 'Help' }} />
// @ts-expect-error Native popover lifecycle conflicts with controlled floating visibility.
;<Popover popover="auto" />

import { Steps as AuditedSteps, type StepItem as AuditedStepItem } from '../../index'
const auditedStepsItems: readonly AuditedStepItem[] = Object.freeze([{key:'one',label:'One',content:<input/>},{key:2,label:<strong>Two</strong>}])
export const stepsNative = <AuditedSteps items={auditedStepsItems} step={1} defaultStep={0} linear disabled={false} membrane={false} id="wizard" aria-label="Setup" aria-labelledby="heading" dir="rtl" lang="ru" title="Wizard" hidden={false} className="wizard" style={{width:300}} tabIndex={-1} ref={node=>{const group: HTMLDivElement|null=node;group?.focus()}} onClickCapture={e=>e.preventDefault()} onStepChange={({step})=>step.toFixed()} />
// @ts-expect-error Items own panel content.
;<AuditedSteps children="Ignored" />
// @ts-expect-error Raw HTML would replace the navigation.
;<AuditedSteps dangerouslySetInnerHTML={{__html:''}} />
// @ts-expect-error Native input defaults do not apply to wizard groups.
;<AuditedSteps defaultValue="one" />
// @ts-expect-error The root has a fixed group role.
;<AuditedSteps role="tablist" />
// @ts-expect-error disabled owns navigation availability; it does not disable panel content.
export const stepsDisabledAlias: import('../../Steps/Steps').StepsProps = {'aria-disabled': true}
// @ts-expect-error Index selection remains numeric.
;<AuditedSteps step="one" />
// @ts-expect-error Navigation does not claim business completion.
;<AuditedSteps completed={[0]} />

// Range indicators: semantic responsibilities stay separate, naming uses native HTML.
import { Progress as AuditedProgress } from '../../Progress/Progress'
import { Meter as AuditedMeter } from '../../Meter/Meter'
const rangePropsProof = <><AuditedProgress value={5} max={10} indeterminate label="Task" membrane={false} formatValue={({value, max}) => `${value}/${max}`} /><AuditedMeter min={-20} max={20} value={0} aria-label="Temperature" /></>
void rangePropsProof
// @ts-expect-error native name replaces the duplicate alias
const oldProgressName = <AuditedProgress ariaLabel="Task" />
// @ts-expect-error a task starts at zero
const progressMinimum = <AuditedProgress min={1} />
// @ts-expect-error measurements must be known
const unknownMeter = <AuditedMeter indeterminate />
// @ts-expect-error semantics are owned by the component
const customMeterRole = <AuditedMeter role="progressbar" />
// @ts-expect-error numeric accessibility cannot diverge from visual value
const mismatchedProgress: import('../../Progress/Progress').ProgressProps = { 'aria-valuenow': 99 }
// @ts-expect-error a range indicator does not accept arbitrary children
const rangeChildren = <AuditedProgress>Child</AuditedProgress>
void oldProgressName; void progressMinimum; void unknownMeter; void customMeterRole; void mismatchedProgress; void rangeChildren

// Rating owns semantic roles/values; native names replace ariaLabel.
import { Rating as AuditedRating, type RatingValueDetails } from '../../Rating/Rating'
const ratingFormatter = ({ value, max }: RatingValueDetails) => `${value} из ${max}`
;<AuditedRating readOnly value={4.2} formatValue={ratingFormatter} aria-label="Average" />
;<AuditedRating name="score" required form="review" autoFocus membrane={false} />
// @ts-expect-error native naming replaces the duplicate alias
;<AuditedRating ariaLabel="Review" />
// @ts-expect-error required native validation needs a form key
;<AuditedRating required />
// @ts-expect-error a readonly rating still owns the precise numeric value
const mismatchedRating: import('../../Rating/Rating').RatingProps = { 'aria-valuenow': 9 }
// @ts-expect-error custom children bypass choice semantics
;<AuditedRating>Stars</AuditedRating>
// @ts-expect-error Rating chooses its semantic role
;<AuditedRating role="slider" />

import { Slider as AuditedSlider, type SliderProps, type SliderFormatDetails, type SliderValueDetails, type SliderCropRange } from '../../Slider/Slider'
const sliderFormatter = ({ value, kind }: SliderFormatDetails) => `${kind}: ${value}%`
;<AuditedSlider value={[20, 80] as const} labels={{ thumbs: ['Min', 'Max'] }} formatValue={sliderFormatter} showValue />
;<AuditedSlider name="axis" form="settings" crop cropName="clip" clampToCrop={false} autoFocus membrane={false} dir="rtl" />
;<AuditedSlider onValueChange={(_value: SliderValueDetails) => {}} onValueCommit={(_value: SliderValueDetails) => {}} onCropCommit={(_range: SliderCropRange) => {}} />
// @ts-expect-error one behavior model, explicit value presentation
;<AuditedSlider variant="advanced" />
// @ts-expect-error crop constraint has an explicit name
;<AuditedSlider cropLocksValue />
// @ts-expect-error compose rich label or adjacent content
;<AuditedSlider leadingIcon="size" />
// @ts-expect-error duplicated labels removed
;<AuditedSlider leadingText="Size" />
// @ts-expect-error a native range always has a value; required adds no behavior
;<AuditedSlider required />
// @ts-expect-error range readonly is a browser no-op
;<AuditedSlider readOnly />
// @ts-expect-error Slider owns its control composition
;<AuditedSlider>Child</AuditedSlider>
// @ts-expect-error one native slider role per control, group root is owned
;<AuditedSlider role="slider" />
// @ts-expect-error accessible numeric values come from the value model
;<AuditedSlider {...({ 'aria-valuenow': 2 } satisfies SliderProps)} />
// @ts-expect-error readonly is not an editing mode of Slider or an ARIA group property
;<AuditedSlider {...({ 'aria-readonly': true } satisfies SliderProps)} />
// @ts-expect-error a native range always has a value; required does not apply to its group
;<AuditedSlider {...({ 'aria-required': true } satisfies SliderProps)} />

// SegmentedControl preserves single/multiple value contracts and readonly items.
import { SegmentedControl } from '../../SegmentedControl/SegmentedControl'
import { Toggle } from '../../Toggle/Toggle'
const segmentedChoices = [{ value: '', label: 'None' }, { value: 'a', label: 'A' }] as const
;<SegmentedControl items={segmentedChoices} value="" name="view" form="settings" aria-label="View" onValueChange={({value}) => { const choice: string | null = value; void choice }} />
;<SegmentedControl multiple items={segmentedChoices} value={['a'] as const} onValueChange={({value}) => { const choices: readonly string[] = value; void choices }} />
;<Toggle items={segmentedChoices} type="single" value={['a'] as const} aria-label="Legacy view" />
// @ts-expect-error a single choice is a string or null
;<SegmentedControl value={['a']} />
// @ts-expect-error multiple choices require an array
;<SegmentedControl multiple value="a" />
// @ts-expect-error no value is an empty array in multiple mode
;<SegmentedControl multiple value={null} />
// @ts-expect-error use multiple, not the removed duplicate mode name
;<SegmentedControl selectionMode="multiple" />
// @ts-expect-error use native aria-label
;<SegmentedControl ariaLabel="View" />
// @ts-expect-error item roles and checked state are component-owned
;<SegmentedControl items={[{value:'a',label:'A',role:'link'}]} />
// @ts-expect-error use Radio or Select for required native validation
;<SegmentedControl required />

// Tabs: internal panels and external ownership are distinct contracts.
import { Tabs as AuditedTabs, type TabItem as AuditedTabItem } from '../../Tabs/Tabs'
const readonlyTabs: readonly AuditedTabItem[] = [{ value: '', label: 'Empty', content: <input /> }]
;<AuditedTabs items={readonlyTabs} variant="underline" aria-label="Editor" actions={<button>New</button>} />
;<AuditedTabs renderPanels={false} items={[{value:'a',label:'A',panelId:'external'}]} />
// @ts-expect-error External panels require an explicit existing ID.
;<AuditedTabs renderPanels={false} items={[{value:'a',label:'A'}]} />
// @ts-expect-error External content cannot be supplied and silently ignored.
;<AuditedTabs renderPanels={false} items={[{value:'a',label:'A',panelId:'external',content:null}]} />
// @ts-expect-error The visual style is one variant, not an independent line flag.
;<AuditedTabs withLine />
// @ts-expect-error Per-item overlay actions have been replaced by a composed header slot.
;<AuditedTabs items={[{value:'a',label:'A',actionIcon:'close'}]} />
// @ts-expect-error Tabs values are stable string keys, not arrays.
;<AuditedTabs value={['a']} />
// @ts-expect-error The component owns its children and panel structure.
;<AuditedTabs children={<div/>} />
