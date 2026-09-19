import React, { forwardRef, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { areContextValuesEqual } from '../assets/create-machine'
import {
  readDatePresets,
  readDateList,
  readDateValue,
  readPoint,
  withOwnedContext,
} from '../assets/internal/date-value'
import { FieldLayout, useField, type FieldProps } from '../assets/internal/field'
import { FormValue } from '../assets/adapters/react/FormValue'
import { useMachine } from '../assets/adapters/react/use-machine'
import { useControllableState } from '../assets/adapters/react/use-controllable-state'
import { useIsomorphicLayoutEffect } from '../assets/adapters/react/use-isomorphic-layout-effect'
import {
  useResponsiveOverlaySurface,
  type ResponsiveOverlaySurface,
} from '../assets/adapters/react/use-responsive-overlay-surface'
import { usePortalTarget } from '../assets/adapters/react/use-portal-target'
import { useFloatingPosition } from '../assets/adapters/react/use-floating-position'
import { useLayer } from '../assets/adapters/react/use-layer'
import { useBodyScrollLock } from '../assets/adapters/react/use-body-scroll-lock'
import { ResponsiveSheetHeader } from '../assets/ResponsiveSheetHeader'
import { CalendarGrid } from '../assets/internal/CalendarGrid'
import { DateChoiceGrid } from '../assets/internal/DateChoiceGrid'
import { resolveLabels } from '../assets/runtime/labels'
import { readDirection } from '../assets/runtime/keyboard'
import {
  defaultDateLabels,
  type DateLabels,
} from '../assets/runtime/date-labels'
export type { DateLabels } from '../assets/runtime/date-labels'
import { useComposedRefs } from '../assets/adapters/react/use-composed-refs'
import { composeHandlers } from '../assets/adapters/react/merge-props'
import { Button } from '../Button/Button'
import { Card } from '../Card/Card'
import { Bar } from '../Bar/Bar'
import { Text } from '../Text/Text'
import { Icon } from '../Icon/Icon'
import { cn } from '../assets/utils'
import {
  connectDate,
  dateMachine,
  type DateSchema,
} from '../assets/machines/date.machine'
import {
  type DateView,
  type DateValueExternal,
  type DateRangeValue,
  type DateValueISO,
  extractDatePart,
  getDefaultViews,
  getEffectiveSelection,
  getHourGrid,
  getMinuteGrid,
  getMonthGrid,
  getYearGrid,
  projectDateValue,
  toExternalValue,
} from '../assets/date-utils'
import { parseCivilDate as parseDate } from '../assets/runtime/civil-date'
import { Membrane } from '../assets/adapters/react/Membrane'
import {
  createDateNumberFormatter,
  readWeekStartsOn,
  resolveDateLocale,
} from '../assets/runtime/date-locale'

export type { DateRangeValue } from '../assets/date-utils'

export interface DatePreset<
  Value extends Exclude<DateValueExternal, null> = Exclude<
    DateValueExternal,
    null
  >,
> {
  /** Stable action identity, unique within the picker; independent of label and value. */
  id: string
  /** Nonempty visible action label; applications own its localization. */
  label: string
  /** Civil ISO or Date instant, matching the picker's single/range selection. */
  value: Value
}

interface DateSharedProps
  extends FieldProps,
    Omit<
      React.ButtonHTMLAttributes<HTMLButtonElement>,
      | 'children'
      | 'dangerouslySetInnerHTML'
      | 'type'
      | 'role'
      | 'value'
      | 'defaultValue'
      | 'defaultChecked'
      | 'onChange'
      | 'aria-expanded'
      | 'aria-controls'
      | 'aria-activedescendant'
      | 'aria-haspopup'
      | 'aria-required'
      | 'aria-disabled'
      | 'aria-readonly'
      | 'formAction'
      | 'formEncType'
      | 'formMethod'
      | 'formNoValidate'
      | 'formTarget'
      | 'popoverTarget'
      | 'popoverTargetAction'
    > {
  /** Controlled visibility; disabled, readOnly and hidden fields cannot open. */
  open?: boolean
  /** Initial visibility for an uncontrolled picker. */
  defaultOpen?: boolean
  /** User requests to open or close; external updates are quiet. */
  onOpenChange?: (details: { open: boolean }) => void
  /** Date formatting language, numbering system and default first weekday; dates stay Gregorian. */
  locale?: string
  /** Internal action and view labels; the field keeps label and placeholder as its own props. */
  labels?: Partial<DateLabels>
  /** Zone for instants and today's civil date. Defaults to UTC. */
  timezone?: string
  /** Override the locale's first weekday: 0=Sunday through 6=Saturday. */
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6
  /** Display pattern; see the supported tokens and quoted literals in the Date docs. */
  format?: string
  /** Inclusive lower bound in timezone; a date-only bound includes its whole day. */
  min?: string | globalThis.Date | null
  /** Inclusive upper bound in timezone; a date-only bound includes its whole day. */
  max?: string | globalThis.Date | null
  /** Unavailable whole days; Date instants are converted into timezone before taking the day. */
  disabledDates?: readonly (string | globalThis.Date)[]
  /** Unavailable hours (0–23) and minutes (0–59) for every day in time/datetime mode. */
  disabledTime?: { hours?: number[]; minutes?: number[] }
  /** Close the picker once a selection is complete; defaults to true for a single date. */
  closeOnSelect?: boolean
  /** Show the shortcut to the current day or time in timezone. */
  showNow?: boolean
  /** Offer the clear action; it is disabled while the selection is empty. */
  clearable?: boolean
  /** Picker surface: a popover, a bottom sheet, or auto (a sheet below 900px wide). */
  surface?: ResponsiveOverlaySurface
  /** Native form field name. Ranges serialize as an ISO start/end interval. */
  name?: string
  /** Associate the field with a form by id. */
  form?: string
  /** Require a complete selection for native form validation. */
  required?: boolean
  /** Disable the trigger; the picker cannot open. */
  disabled?: boolean
  /** Show the value without letting the user change it; it is still submitted. */
  readOnly?: boolean
  /** Trigger text while nothing is selected. */
  placeholder?: string
  /** Wrap the trigger in the membrane spacing of controls in a row. */
  membrane?: boolean
  /** Stretch the field to the width of its container. */
  fullWidth?: boolean
  /** CSS class on the field root, which also takes style, dir, lang and title. */
  className?: string
}

type DateValueProps<
  Input extends Exclude<DateValueExternal, null>,
  ISO,
  Instant,
> = {
  /** Explicit shortcuts with unique id, label and selection-shaped value; an omitted or empty array renders none. */
  presets?: readonly DatePreset<Input>[]
  /** Controlled civil ISO or Date instant, or a range of these; null clears selection. */
  value?: Input | null
  /** Initial uncontrolled value; ignored while value is controlled. */
  defaultValue?: Input | null
} & (
  | {
      /** Callback representation; form submission always uses civil ISO values. */
      valueFormat?: 'iso'
      /** User value changes only; output follows selection and valueFormat. */
      onValueChange?: (details: { value: ISO }) => void
    }
  | {
      /** Callback representation; form submission always uses civil ISO values. */
      valueFormat: 'date'
      /** User value changes only; output follows selection and valueFormat. */
      onValueChange?: (details: { value: Instant }) => void
    }
)

type SingleValueProps = DateValueProps<
  string | globalThis.Date,
  string | null,
  globalThis.Date | null
>
type RangeValueProps = DateValueProps<
  DateRangeValue,
  DateRangeValue<string>,
  DateRangeValue<globalThis.Date>
>
type DateModeProps =
  | {
      /** Picker mode: date, datetime, time, week, month or year. */
      mode?: 'date'
      /** First view shown when the picker opens. */
      openTo?: 'day' | 'month' | 'year'
    }
  | {
      /** Picker mode: date, datetime, time, week, month or year. */
      mode: 'datetime'
      /** First view shown when the picker opens. */
      openTo?: DateView
    }
  | {
      /** Picker mode: date, datetime, time, week, month or year. */
      mode: 'time'
      /** First view shown when the picker opens. */
      openTo?: 'hours' | 'minutes'
    }
  | {
      /** Picker mode: date, datetime, time, week, month or year. */
      mode: 'month'
      /** First view shown when the picker opens. */
      openTo?: 'month' | 'year'
    }
  | {
      /** Picker mode: date, datetime, time, week, month or year. */
      mode: 'year'
      /** First view shown when the picker opens. */
      openTo?: 'year'
    }

/** Mode owns precision and available views; selection owns the value shape. */
export type DateProps = DateSharedProps &
  (
    | (DateModeProps &
        (
          | ({
              /** Single value or range endpoints; week owns its range selection. */
              selection?: 'single'
              /** Exclude unavailable days from the whole range; false constrains only its endpoints. */
              excludeDisabledDates?: never
            } & SingleValueProps)
          | ({
              /** Single value or range endpoints; week owns its range selection. */
              selection: 'range'
              /** Exclude unavailable days from the whole range; false constrains only its endpoints. */
              excludeDisabledDates?: boolean
            } & RangeValueProps)
        ))
    | ({
        /** Picker mode: date, datetime, time, week, month or year. */
        mode: 'week'
        /** Single value or range endpoints; week owns its range selection. */
        selection?: never
        /** Exclude unavailable days from the whole range; false constrains only its endpoints. */
        excludeDisabledDates?: never
        /** First view shown when the picker opens. */
        openTo?: 'day' | 'month' | 'year'
      } & RangeValueProps)
  )

/** A date, time, week, month or year field with a picker; values are civil ISO strings or Date instants. */
export const Date = forwardRef<HTMLButtonElement, DateProps>(
  function Date(props, ref) {
    const {
      mode = 'date',
      selection = 'single',
      openTo,
      value,
      defaultValue = null,
      onValueChange,
      open,
      defaultOpen = false,
      onOpenChange,
      valueFormat = 'iso',
      locale: requestedLocale = 'en-US',
      labels,
      timezone: requestedTimezone = 'UTC',
      weekStartsOn,
      format,
      min,
      max,
      disabledDates,
      excludeDisabledDates = true,
      disabledTime,
      closeOnSelect = mode === 'date' && selection === 'single',
      showNow = true,
      clearable = true,
      presets,
      surface = 'auto',
      label,
      description,
      error,
      labelPosition,
      required = false,
      name,
      form,
      disabled = false,
      readOnly = false,
      placeholder,
      membrane = true,
      fullWidth = true,
      className,
      style,
      id,
      hidden,
      dir,
      lang,
      title,
      onClick,
      onKeyDown,
      'aria-label': ariaLabel,
      'aria-labelledby': labelledBy,
      'aria-describedby': describedBy,
      'aria-invalid': ariaInvalid,
      ...nativeProps
    } = props
    const resolvedLabels = resolveLabels(defaultDateLabels, labels, 'Date')
    const { locale, timeZone: timezone } = useMemo(
      () => resolveDateLocale('Date', requestedLocale, requestedTimezone),
      [requestedLocale, requestedTimezone],
    )
    const numbers = useMemo(() => createDateNumberFormatter(locale), [locale])
    const clockNumbers = useMemo(
      () => createDateNumberFormatter(locale, 2),
      [locale],
    )
    const unavailable = disabled || readOnly || Boolean(hidden)
    const read = (input: unknown, prop: string) =>
      readDateValue(input, mode, selection, timezone, prop)

    // React owns value and open; the machine mirrors them and proposes user changes.
    const [initialValue] = useState(() =>
      value === undefined ? read(defaultValue, 'defaultValue') : null,
    )
    const [current, setValue, replaceValue] = useControllableState({
      value: value === undefined ? undefined : read(value, 'value'),
      defaultValue: initialValue,
      onChange: (next: DateValueISO) =>
        (
          onValueChange as
            | ((details: { value: DateValueExternal }) => void)
            | undefined
        )?.({ value: toExternalValue(next, valueFormat, timezone) }),
      equal: areContextValuesEqual,
      name: ['Date', 'value'],
    })
    const [openState, setOpen, replaceOpen] = useControllableState({
      value: open,
      defaultValue: defaultOpen,
      onChange: (open: boolean) => onOpenChange?.({ open }),
      name: ['Date', 'open'],
    })
    const isOpen = !unavailable && openState
    const shown = projectDateValue(current, mode, selection)
    const syncingOpen = useRef(false)
    const [machine] = useState(() => {
      const views = getDefaultViews(mode)
      return {
        ...dateMachine,
        initial: isOpen ? ('open' as const) : ('closed' as const),
        context: {
          ...dateMachine.context,
          view: openTo && views.includes(openTo) ? openTo : views[0],
        },
      }
    })
    const owned = { value: shown }
    const bounds = {
      min: readPoint(min, timezone, 'min'),
      max: readPoint(max, timezone, 'max'),
      disabledDates: readDateList(
        disabledDates,
        'Date',
        'disabledDates',
        (input, prop, outcome) => readPoint(input, timezone, prop, outcome),
      ),
    }
    const { state, send, syncContext } = useMachine(machine, {
      ...owned,
      ...bounds,
      mode,
      selection,
      // The machine proposes ISO values; onValueChange converts them to valueFormat.
      valueFormat: 'iso',
      locale,
      labels: resolvedLabels,
      timezone,
      triggerFormat:
        typeof format === 'string' && format.trim() ? format.trim() : null,
      weekStartsOn: readWeekStartsOn('Date', weekStartsOn),
      excludeDisabledDates: mode === 'week' || excludeDisabledDates,
      disabledTime: disabledTime ?? null,
      closeOnSelect,
      disabled,
      readOnly,
      placeholder: placeholder ?? '',
      onValueChange: (details) => setValue(details.value as DateValueISO),
      onOpenChange: (details) => {
        if (!syncingOpen.current) setOpen(details.open)
      },
    })
    const api = connectDate(withOwnedContext(machine, state, owned), send)

    // An uncontrolled value keeps only what its mode and selection show, so switching
    // back does not resurrect a dropped clock or range end.
    useIsomorphicLayoutEffect(() => {
      if (!areContextValuesEqual(shown, current)) replaceValue(shown)
    }, [mode, selection])
    const effectiveSelection = getEffectiveSelection(mode, selection)
    useIsomorphicLayoutEffect(
      () => syncContext({ rangePart: 'start' }),
      [effectiveSelection],
    )
    useIsomorphicLayoutEffect(() => {
      // A field that became unavailable closes and stays closed.
      if (unavailable && openState) replaceOpen(false)
      if (isOpen !== state.matches('open')) {
        syncingOpen.current = true
        try {
          send({ type: isOpen ? 'OPEN' : 'CLOSE' })
        } finally {
          syncingOpen.current = false
        }
      }
    })
    // The trigger and portal share input modality. Native focus-visible alone
    // misses modifier navigation and Firefox reopening after pointer use.
    const [keyboardFocus, setKeyboardFocus] = useState(false)
    const resolvedSurface = useResponsiveOverlaySurface(surface)
    useBodyScrollLock(isOpen && resolvedSurface === 'sheet')
    const triggerRef = useRef<HTMLButtonElement | null>(null)
    const setTriggerRef = useComposedRefs(triggerRef, ref)
    // The portal leaves the field's subtree, so it takes the trigger's direction and language.
    const [direction, setDirection] = useState<'ltr' | 'rtl'>('ltr')
    const [surfaceLanguage, setSurfaceLanguage] = useState(lang)
    useIsomorphicLayoutEffect(() => {
      if (triggerRef.current) {
        setDirection(readDirection(triggerRef.current))
        setSurfaceLanguage(
          triggerRef.current.closest('[lang]')?.getAttribute('lang') ??
            undefined,
        )
      }
    })
    const [nativeError, setNativeError] = useState<string | null>(null)
    const field = useField({
      id,
      label,
      description,
      error,
      labelPosition,
      labelable: true,
      required,
      nativeError,
      'aria-label': ariaLabel,
      'aria-labelledby': labelledBy,
      'aria-describedby': describedBy,
      'aria-invalid': ariaInvalid,
    })
    const contentId = useId()
    const portalTarget = usePortalTarget()
    const contentRef = useRef<HTMLDivElement | null>(null)
    const panelRef = useRef<HTMLDivElement | null>(null)
    const panelHadFocus = useRef(false)
    const getPanelFocus = () =>
      panelRef.current?.querySelector<HTMLElement>('[tabindex="0"]') ??
      panelRef.current?.querySelector<HTMLElement>('button:not(:disabled)') ??
      null
    const { style: floatingStyle } = useFloatingPosition({
      open: isOpen && portalTarget !== null && resolvedSurface === 'popover',
      triggerRef,
      contentRef,
      side: 'bottom',
      align: 'start',
    })
    useLayer({
      enabled: isOpen && portalTarget !== null,
      contentRef,
      triggerRef,
      modal: true,
      autoFocus: true,
      restoreFocus: true,
      initialFocus: getPanelFocus,
      onOutside: () => {
        setKeyboardFocus(false)
        send({ type: 'CLOSE' })
      },
      onEscape: () => {
        setKeyboardFocus(true)
        send({ type: 'CLOSE' })
      },
    })
    useIsomorphicLayoutEffect(() => {
      if (panelHadFocus.current) getPanelFocus()?.focus({ preventScroll: true })
    }, [api.view])

    const serialize = (selection: DateValueISO): string | null =>
      typeof selection === 'string'
        ? selection
        : selection?.start && selection.end
          ? `${selection.start}/${selection.end}`
          : null
    // A form reset restores the mount default; a controlled field keeps its value.
    const resetValue = serialize(
      value === undefined ? projectDateValue(initialValue, mode, selection) : shown,
    )
    const presetsList = readDatePresets(presets, mode, selection, timezone)
    const contentProps = api.getContentProps()
    // The dialog shares the field's name; a rich label is referenced, never mounted twice.
    const sheetTitle =
      typeof label === 'string' || typeof label === 'number'
        ? field.label
        : field.controlProps['aria-label']

    const baseDate = parseDate(api.viewDate)
    const yearGrid = getYearGrid(baseDate.year)
    const period = api.view === 'month' || api.view === 'year'
    // The event that selects one number of the current month, year, hour or minute view.
    const select = (value: number): DateSchema['event'] =>
      api.view === 'month'
        ? { type: 'SELECT_MONTH', month: value }
        : api.view === 'year'
          ? { type: 'SELECT_YEAR', year: value }
          : api.view === 'hours'
            ? { type: 'SELECT_HOUR', hour: value }
            : { type: 'SELECT_MINUTE', minute: value }
    const choices = (
      api.view === 'month'
        ? getMonthGrid(locale)
        : api.view === 'day'
          ? []
          : (api.view === 'year'
              ? yearGrid
              : api.view === 'hours'
                ? getHourGrid(1)
                : getMinuteGrid(1)
            ).map((value) => ({
              value,
              label: (period ? numbers : clockNumbers).format(value),
            }))
    ).map(({ value, label }) => ({
      value,
      label,
      selected: period
        ? api.isPeriodSelected(api.view as 'month' | 'year', value)
        : api.hasTime &&
          (api.view === 'hours' ? api.hour : api.minute) === value,
      disabled: api.isSelectionDisabled(select(value)),
    }))
    const contentPanel = isOpen ? (
      <Card
        padding="membrane"
        radius="md"
        fullWidth={resolvedSurface === 'sheet'}
        className="uf-date__contentPanel"
      >
        {resolvedSurface === 'sheet' ? (
          <ResponsiveSheetHeader
            title={sheetTitle}
            closeLabel={resolvedLabels.close}
            onClose={() => send({ type: 'CLOSE' })}
          />
        ) : null}
        {api.views.length > 1 ? (
          <div className="uf-date__toolbar">
            {api.views.map((view) => (
              <Membrane key={view} interactive>
                <Button
                  {...api.getViewSwitchProps(view)}
                  fullWidth={false}
                  membrane={false}
                  variant={api.view === view ? 'secondary' : 'ghost'}
                >
                  {resolvedLabels[view]}
                </Button>
              </Membrane>
            ))}
          </div>
        ) : null}

        {api.selection === 'range' &&
        (api.view === 'hours' || api.view === 'minutes') ? (
          <div
            className="uf-date__toolbar"
            role="group"
            aria-label={resolvedLabels.rangeEndpoint}
          >
            {(['start', 'end'] as const).map((part) => (
              <Membrane key={part} interactive>
                <Button
                  aria-pressed={api.rangePart === part}
                  fullWidth={false}
                  membrane={false}
                  variant={api.rangePart === part ? 'secondary' : 'ghost'}
                  onClick={() => send({ type: 'SET_RANGE_PART', part })}
                >
                  {resolvedLabels[part]}
                </Button>
              </Membrane>
            ))}
          </div>
        ) : null}
        <div className="uf-date__panel" ref={panelRef}>
          {api.view === 'day' ? (
            <CalendarGrid
              value={
                typeof api.value === 'object' && api.value !== null
                  ? {
                      start: extractDatePart(api.value?.start ?? null),
                      end: extractDatePart(api.value?.end ?? null),
                    }
                  : extractDatePart(
                      typeof api.value === 'string' ? api.value : null,
                    )
              }
              viewDate={api.viewDate}
              onViewDateChange={({ viewDate }) =>
                send({ type: 'SET_VIEW_DATE', date: viewDate })
              }
              onDateSelect={(date) => send({ type: 'SELECT_DAY', date })}
              isDateUnavailable={(date) =>
                api.isSelectionDisabled({ type: 'SELECT_DAY', date })
              }
              min={extractDatePart(bounds.min)}
              max={extractDatePart(bounds.max)}
              disabledDates={bounds.disabledDates}
              locale={locale}
              labels={{
                previousMonth: resolvedLabels.previousMonth,
                nextMonth: resolvedLabels.nextMonth,
              }}
              aria-label={resolvedLabels.calendar}
              timezone={timezone}
              weekStartsOn={api.weekStartsOn}
            />
          ) : null}

          {api.view !== 'day' ? (
            <>
              {period ? (
                <Bar>
                  <Bar.Section>
                    <Button
                      {...api.getPageProps(-1)}
                      icon="arrow-left"
                      iconOnly
                      fullWidth={false}
                    />
                  </Bar.Section>
                  <Bar.Section grow>
                    <Text as="div" align="center" fullWidth aria-live="polite">
                      {api.view === 'month'
                        ? numbers.format(baseDate.year)
                        : `${numbers.format(yearGrid[0])}–${numbers.format(yearGrid[yearGrid.length - 1])}`}
                    </Text>
                  </Bar.Section>
                  <Bar.Section align="end">
                    <Button
                      {...api.getPageProps(1)}
                      icon="arrow-right"
                      iconOnly
                      fullWidth={false}
                    />
                  </Bar.Section>
                </Bar>
              ) : null}
              <DateChoiceGrid
                key={api.view}
                className={`uf-date__grid uf-date__grid--${period ? api.view : 'time'}`}
                label={resolvedLabels[api.view]}
                columns={api.view === 'month' ? 3 : api.view === 'year' ? 4 : 6}
                items={choices}
                onPageChange={
                  period
                    ? (direction) => send({ type: 'PAGE_VIEW', direction })
                    : undefined
                }
                onSelect={(value) => send(select(value))}
              />
            </>
          ) : null}
        </div>

        {presetsList.length > 0 ? (
          <div className="uf-date__presets">
            {presetsList.map((preset) => (
              <Membrane key={preset.id} interactive>
                <Button
                  {...api.getPresetProps(preset.value)}
                  fullWidth
                  membrane={false}
                  variant="ghost"
                >
                  {preset.label}
                </Button>
              </Membrane>
            ))}
          </div>
        ) : null}

        {clearable || showNow ? (
          <div className="uf-date__footer">
            {clearable ? (
              <Membrane interactive>
                <Button
                  {...api.getClearProps()}
                  fullWidth={false}
                  membrane={false}
                  variant="ghost"
                >
                  {resolvedLabels.clear}
                </Button>
              </Membrane>
            ) : null}
            {showNow ? (
              <Membrane interactive>
                <Button
                  {...api.getNowProps()}
                  fullWidth={false}
                  membrane={false}
                  variant="default"
                >
                  {resolvedLabels.now}
                </Button>
              </Membrane>
            ) : null}
          </div>
        ) : null}
      </Card>
    ) : null

    return (
      <div
        {...api.getRootProps()}
        {...field.rootProps}
        data-state={isOpen ? 'open' : 'closed'}
        style={style}
        dir={dir}
        lang={lang}
        title={title}
        hidden={hidden}
        className={cn('uf-field uf-date', className)}
        data-full-width={fullWidth ? '' : undefined}
        data-keyboard-focus={keyboardFocus || undefined}
        onPointerDownCapture={() => setKeyboardFocus(false)}
        onClickCapture={(event) => {
          if (event.detail === 0) setKeyboardFocus(true)
        }}
        onKeyDown={(event) => {
          if (event.defaultPrevented) setKeyboardFocus(true)
        }}
        onBlurCapture={(event) => {
          const next = event.relatedTarget as Node | null
          if (
            next &&
            !event.currentTarget.contains(next) &&
            !contentRef.current?.contains(next)
          )
            setKeyboardFocus(false)
        }}
      >
        <FieldLayout field={field}>
          <Membrane enabled={membrane} fullWidth={fullWidth} interactive>
            <button
              {...nativeProps}
              {...api.getTriggerProps()}
              {...field.controlProps}
              ref={setTriggerRef}
              form={form}
              dir={dir}
              lang={lang}
              title={title}
              tabIndex={nativeProps.tabIndex ?? 0}
              aria-expanded={isOpen}
              aria-controls={isOpen && portalTarget ? contentId : undefined}
              aria-invalid={ariaInvalid ?? (field.invalid || undefined)}
              aria-required={required || undefined}
              aria-readonly={readOnly || undefined}
              className="uf-date__trigger"
              disabled={disabled}
              onClick={composeHandlers(onClick, () => {
                if (unavailable) return
                triggerRef.current?.focus({ preventScroll: true })
                send({ type: 'TOGGLE' })
              })}
              onKeyDown={composeHandlers(onKeyDown, (event) => {
                if (!unavailable) api.getTriggerProps().onKeyDown(event)
              })}
            >
              <Text
                as="span"
                membrane={false}
                inset="none"
                truncate
                className="uf-date__value"
              >
                {api.triggerLabel}
              </Text>
              <span className="uf-date__icon" aria-hidden="true">
                <Icon name="date" />
              </span>
            </button>
          </Membrane>
        </FieldLayout>
        {isOpen && portalTarget
          ? createPortal(
              <>
                {resolvedSurface === 'sheet' ? (
                  <div
                    className="uf-responsive-overlay-backdrop"
                    data-state="open"
                  />
                ) : null}

                <div
                  {...contentProps}
                  ref={contentRef}
                  onFocusCapture={(event) => {
                    panelHadFocus.current = Boolean(
                      panelRef.current?.contains(event.target as Node),
                    )
                  }}
                  onBlurCapture={(event) => {
                    if (
                      event.relatedTarget &&
                      !event.currentTarget.contains(event.relatedTarget as Node)
                    )
                      panelHadFocus.current = false
                  }}
                  id={contentId}
                  aria-modal="true"
                  aria-labelledby={field.labelledBy}
                  aria-label={
                    field.labelledBy ? undefined : field.controlProps['aria-label']
                  }
                  hidden={false}
                  data-state="open"
                  data-keyboard-focus={keyboardFocus || undefined}
                  dir={direction}
                  lang={surfaceLanguage}
                  tabIndex={-1}
                  style={
                    resolvedSurface === 'popover' ? floatingStyle : undefined
                  }
                  className="uf-date__content"
                  data-surface={resolvedSurface}
                >
                  <Membrane
                    enabled={membrane}
                    as="div"
                    fullWidth
                    className="uf-date__contentMembrane"
                  >
                    {contentPanel}
                  </Membrane>
                </div>
              </>,
              portalTarget,
            )
          : null}
        <FormValue
          name={name}
          form={form}
          value={serialize(shown)}
          required={required && !readOnly}
          disabled={disabled}
          triggerRef={triggerRef}
          resetValue={resetValue}
          onReset={() => {
            replaceValue()
            syncContext({ rangePart: 'start' })
            return resetValue
          }}
          onChange={(next) => {
            if (next !== null && typeof next !== 'string') return
            let candidate: DateValueExternal = next
            if (typeof next === 'string' && api.selection === 'range') {
              const parts = next.split('/')
              if (parts.length !== 2 || !parts[0] || !parts[1]) return
              candidate = { start: parts[0], end: parts[1] }
            }
            send({ type: 'SET_VALUE', value: candidate })
          }}
          onReport={setNativeError}
        />
      </div>
    )
  },
)
