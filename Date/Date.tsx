import React, {
  forwardRef,
  useMemo,
  useRef,
  useId,
  useEffect,
  useLayoutEffect,
  useState,
} from 'react'
import { areContextValuesEqual } from '../assets/create-machine'
import {
  readDateValue,
  readDateBound,
  readDisabledDates,
  readDisabledTime,
  readDatePresets,
} from '../assets/internal/date-value'
import { FormValue } from '../assets/adapters/react/FormValue'
import { useMachine } from '../assets/adapters/react/use-machine'
import { useControllableMachineProp } from '../assets/adapters/react/use-controllable-machine-prop'
import {
  DEFAULT_OVERLAY_SURFACE_BREAKPOINT,
  useResponsiveOverlaySurface,
  type ResponsiveOverlaySurface,
} from '../assets/adapters/react/use-responsive-overlay-surface'
import { createPortal } from 'react-dom'
import { usePortalTarget } from '../assets/adapters/react/use-portal-target'
import { useFloatingPosition } from '../assets/adapters/react/use-floating-position'
import { useLayer } from '../assets/adapters/react/use-layer'
import { useBodyScrollLock } from '../assets/adapters/react/use-body-scroll-lock'
import { ResponsiveSheetHeader } from '../assets/ResponsiveSheetHeader'
import { CalendarGrid } from '../assets/internal/CalendarGrid'
import { DateChoiceGrid } from '../assets/internal/DateChoiceGrid'
import { resolveLabels } from '../assets/runtime/labels'
import {
  defaultDateLabels,
  type DateLabels,
} from '../assets/runtime/date-labels'
export type { DateLabels } from '../assets/runtime/date-labels'
import { useComposedRefs } from '../assets/adapters/react/use-composed-refs'
import { hasSlotContent } from '../assets/slot-content'
import { Button } from '../Button/Button'
import { Card } from '../Card/Card'
import { Bar } from '../Bar/Bar'
import { Text } from '../Text/Text'
import { Icon } from '../Icon/Icon'
import { cn } from '../assets/utils'
import { connectDate, dateMachine } from '../assets/machines/date.machine'
import {
  type DateView,
  type DateValueExternal,
  type DateRangeValue,
  type DateValueISO,
  extractDatePart,
  getDefaultViews,
  getHourGrid,
  getMinuteGrid,
  getMonthGrid,
  getYearGrid,
  projectDateValue,
  getEffectiveSelection,
} from '../assets/date-utils'
import { parseCivilDate as parseDate } from '../assets/runtime/civil-date'
import { Membrane } from '../assets/adapters/react/Membrane'
import {
  createDateFormatter,
  createDateNumberFormatter,
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

interface DateSharedProps extends Omit<
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
  /** Internal action and view labels; field label, placeholder and surfaceTitle keep their own content APIs. */
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
  closeOnSelect?: boolean
  /** Show the shortcut to the current day or time in timezone. */
  showNow?: boolean
  /** Show the clear action; it is disabled when the selection is empty. */
  showClear?: boolean
  surface?: ResponsiveOverlaySurface
  surfaceBreakpoint?: number
  surfaceTitle?: React.ReactNode
  label?: React.ReactNode
  description?: React.ReactNode
  error?: React.ReactNode
  /** Native form field name. Ranges serialize as an ISO start/end interval. */
  name?: string
  /** Associate the field with a form by id. */
  form?: string
  /** Require a complete selection for native form validation. */
  required?: boolean
  disabled?: boolean
  readOnly?: boolean
  placeholder?: string
  membrane?: boolean
  fullWidth?: boolean
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
      valueFormat: 'date'
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
  | { mode?: 'date'; openTo?: 'day' | 'month' | 'year' }
  | { mode: 'datetime'; openTo?: DateView }
  | { mode: 'time'; openTo?: 'hours' | 'minutes' }
  | { mode: 'month'; openTo?: 'month' | 'year' }
  | { mode: 'year'; openTo?: 'year' }

/** Mode owns precision and available views; selection owns the value shape. */
export type DateProps = DateSharedProps &
  (
    | (DateModeProps &
        (
          | ({
              /** Single value or range endpoints; week owns its range selection. */
              selection?: 'single'
              excludeDisabledDates?: never
            } & SingleValueProps)
          | ({
              selection: 'range'
              /** Exclude unavailable days from the whole range; false constrains only its endpoints. */
              excludeDisabledDates?: boolean
            } & RangeValueProps)
        ))
    | ({
        mode: 'week'
        selection?: never
        excludeDisabledDates?: never
        openTo?: 'day' | 'month' | 'year'
      } & RangeValueProps)
  )

const useCommitEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect

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
      min = null,
      max = null,
      disabledDates = [],
      excludeDisabledDates = true,
      disabledTime,
      closeOnSelect = mode === 'date' && selection === 'single',
      showNow = true,
      showClear = true,
      presets,
      surface = 'auto',
      surfaceBreakpoint = DEFAULT_OVERLAY_SURFACE_BREAKPOINT,
      surfaceTitle,
      label,
      description,
      error,
      required = false,
      name,
      form,
      disabled = false,
      readOnly = false,
      placeholder = mode === 'time' ? 'Pick time' : 'Pick date',
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
      () =>
        createDateFormatter(requestedLocale, {
          timeZone: requestedTimezone,
        }).resolvedOptions(),
      [requestedLocale, requestedTimezone],
    )
    const numbers = useMemo(() => createDateNumberFormatter(locale), [locale])
    const clockNumbers = useMemo(
      () => createDateNumberFormatter(locale, 2),
      [locale],
    )
    const unavailable = disabled || readOnly || Boolean(hidden)
    const syncingOpen = useRef(false)
    const machine = useMemo(
      () => ({
        ...dateMachine,
        initial:
          (open ?? defaultOpen) && !unavailable
            ? ('open' as const)
            : ('closed' as const),
      }),
      [],
    )

    const resolvedViews = getDefaultViews(mode)

    const controlledValue =
      value === undefined
        ? undefined
        : readDateValue(value, mode, selection, timezone, 'value')
    const [initialValue] = useState<DateValueISO>(() =>
      value === undefined
        ? readDateValue(defaultValue, mode, selection, timezone, 'defaultValue')
        : null,
    )
    const machineValue = useControllableMachineProp(
      controlledValue,
      initialValue,
    )

    const initialView = useControllableMachineProp(
      undefined,
      openTo && resolvedViews.includes(openTo) ? openTo : resolvedViews[0],
    )
    const { state, send, syncContext } = useMachine(machine, {
      mode,
      selection,
      view: initialView,
      valueFormat,
      value: machineValue,
      locale,
      labels: resolvedLabels,
      timezone,
      triggerFormat:
        typeof format === 'string' && format.trim() ? format.trim() : null,
      weekStartsOn: weekStartsOn ?? null,
      min: readDateBound(min, timezone, 'min'),
      max: readDateBound(max, timezone, 'max'),
      disabledDates: readDisabledDates(disabledDates, timezone),
      excludeDisabledDates: mode === 'week' || excludeDisabledDates,
      disabledTime: readDisabledTime(disabledTime),
      closeOnSelect,
      disabled,
      readOnly,
      placeholder,
      onValueChange: (details) => {
        // The machine emits the active selection/format branch of the public union.
        const callback = onValueChange as
          | ((details: { value: DateValueExternal }) => void)
          | undefined
        callback?.(details)
      },
      onOpenChange: (details) => {
        if (!syncingOpen.current) onOpenChange?.(details)
      },
    })

    const previousValueConfig = useRef({ mode, selection })
    useCommitEffect(() => {
      const previous = previousValueConfig.current
      previousValueConfig.current = { mode, selection }
      if (
        value !== undefined ||
        (previous.mode === mode && previous.selection === selection)
      )
        return
      const projected = projectDateValue(state.context.value, mode, selection)
      if (!areContextValuesEqual(projected, state.context.value))
        syncContext({
          value: projected,
          ...(getEffectiveSelection(previous.mode, previous.selection) !==
          getEffectiveSelection(mode, selection)
            ? { rangePart: 'start' as const }
            : {}),
        })
    })

    useCommitEffect(() => {
      const wanted = !unavailable && (open ?? state.matches('open'))
      if (wanted !== state.matches('open')) {
        syncingOpen.current = true
        try {
          send({ type: wanted ? 'OPEN' : 'CLOSE' })
        } finally {
          syncingOpen.current = false
        }
      }
    })
    const api = connectDate(state, send)
    // The trigger and portal share input modality. Native focus-visible alone
    // misses modifier navigation and Firefox reopening after pointer use.
    const [keyboardFocus, setKeyboardFocus] = useState(false)
    const isOpen = !unavailable && (open ?? state.matches('open'))
    const resolvedSurface = useResponsiveOverlaySurface(
      surface,
      surfaceBreakpoint,
    )
    useBodyScrollLock(isOpen && resolvedSurface === 'sheet')
    const triggerRef = useRef<HTMLButtonElement | null>(null)
    const setTriggerRef = useComposedRefs(triggerRef, ref)
    const [direction, setDirection] = useState<'ltr' | 'rtl'>('ltr')
    const [surfaceLanguage, setSurfaceLanguage] = useState(lang)
    useCommitEffect(() => {
      if (triggerRef.current) {
        setDirection(
          getComputedStyle(triggerRef.current).direction === 'rtl'
            ? 'rtl'
            : 'ltr',
        )
        setSurfaceLanguage(
          triggerRef.current.closest('[lang]')?.getAttribute('lang') ??
            undefined,
        )
      }
    })
    const contentId = useId(),
      labelId = useId(),
      generatedTriggerId = useId(),
      descriptionId = useId(),
      errorId = useId(),
      titleId = useId()
    const triggerId = id ?? generatedTriggerId
    const hasLabel = hasSlotContent(label),
      hasDescription = hasSlotContent(description),
      hasError = hasSlotContent(error)
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
    useCommitEffect(() => {
      if (panelHadFocus.current) getPanelFocus()?.focus({ preventScroll: true })
    }, [api.view])

    const serialize = (selection: DateValueISO): string | null =>
      typeof selection === 'string'
        ? selection
        : selection?.start && selection.end
          ? `${selection.start}/${selection.end}`
          : null
    const formValue = api.value
    const presetsList = readDatePresets(presets, mode, selection, timezone)
    const contentProps = api.getContentProps()
    const hasSurfaceTitle = hasSlotContent(surfaceTitle)
    const hasPlainLabel =
      hasLabel && (typeof label === 'string' || typeof label === 'number')
    const sheetTitle = hasSurfaceTitle
      ? surfaceTitle
      : ariaLabel ||
        (hasPlainLabel
          ? label
          : mode === 'time'
            ? 'Choose time'
            : 'Choose date')
    // A rich label can own ids/state. Reference it rather than mounting it twice.
    const dialogLabelId =
      !hasSurfaceTitle && !hasPlainLabel && !ariaLabel
        ? [labelledBy ?? (hasLabel ? labelId : undefined), titleId]
            .filter(Boolean)
            .join(' ')
        : titleId

    const baseDate = parseDate(api.viewDate)
    const yearGrid = getYearGrid(baseDate.year)
    const monthGrid = getMonthGrid(locale)
    const hours = getHourGrid(1)
    const minutes = getMinuteGrid(1)
    const choices =
      api.view === 'month'
        ? monthGrid.map(({ value, label }) => ({
            value,
            label,
            selected: api.isPeriodSelected('month', value),
            disabled: api.isSelectionDisabled({
              type: 'SELECT_MONTH',
              month: value,
            }),
          }))
        : api.view === 'year'
          ? yearGrid.map((value) => ({
              value,
              label: numbers.format(value),
              selected: api.isPeriodSelected('year', value),
              disabled: api.isSelectionDisabled({
                type: 'SELECT_YEAR',
                year: value,
              }),
            }))
          : api.view === 'hours'
            ? hours.map((value) => ({
                value,
                label: clockNumbers.format(value),
                selected: api.hasTime && api.hour === value,
                disabled: api.isSelectionDisabled({
                  type: 'SELECT_HOUR',
                  hour: value,
                }),
              }))
            : api.view === 'minutes'
              ? minutes.map((value) => ({
                  value,
                  label: clockNumbers.format(value),
                  selected: api.hasTime && api.minute === value,
                  disabled: api.isSelectionDisabled({
                    type: 'SELECT_MINUTE',
                    minute: value,
                  }),
                }))
              : []
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
            titleId={titleId}
            closeLabel={resolvedLabels.close}
            onClose={() => send({ type: 'CLOSE' })}
          />
        ) : (
          <div id={titleId} className="uf-visually-hidden">
            {sheetTitle}
          </div>
        )}
        {api.views.length > 1 ? (
          <div className="uf-date__toolbar">
            {api.views.map((view) => (
              <Membrane key={view} interactive>
                <Button
                  {...api.getViewSwitchProps(view)}
                  text={resolvedLabels[view]}
                  fullWidth={false}
                  membrane={false}
                  variant={api.view === view ? 'secondary' : 'ghost'}
                />
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
                  text={resolvedLabels[part]}
                  aria-pressed={api.rangePart === part}
                  fullWidth={false}
                  membrane={false}
                  variant={api.rangePart === part ? 'secondary' : 'ghost'}
                  onClick={() => send({ type: 'SET_RANGE_PART', part })}
                />
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
              min={extractDatePart(state.context.min)}
              max={extractDatePart(state.context.max)}
              disabledDates={state.context.disabledDates}
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
              {api.view === 'month' || api.view === 'year' ? (
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
                className={`uf-date__grid uf-date__grid--${api.view === 'month' || api.view === 'year' ? api.view : 'time'}`}
                label={resolvedLabels[api.view]}
                columns={api.view === 'month' ? 3 : api.view === 'year' ? 4 : 6}
                items={choices}
                onPageChange={
                  api.view === 'month' || api.view === 'year'
                    ? (direction) => send({ type: 'PAGE_VIEW', direction })
                    : undefined
                }
                onSelect={(value) => {
                  switch (api.view) {
                    case 'month':
                      send({ type: 'SELECT_MONTH', month: value })
                      break
                    case 'year':
                      send({ type: 'SELECT_YEAR', year: value })
                      break
                    case 'hours':
                      send({ type: 'SELECT_HOUR', hour: value })
                      break
                    case 'minutes':
                      send({ type: 'SELECT_MINUTE', minute: value })
                      break
                  }
                }}
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
                  text={preset.label}
                  fullWidth
                  membrane={false}
                  variant="ghost"
                />
              </Membrane>
            ))}
          </div>
        ) : null}

        {showClear || showNow ? (
          <div className="uf-date__footer">
            {showClear ? (
              <Membrane interactive>
                <Button
                  {...api.getClearProps()}
                  text={resolvedLabels.clear}
                  fullWidth={false}
                  membrane={false}
                  variant="ghost"
                />
              </Membrane>
            ) : null}
            {showNow ? (
              <Membrane interactive>
                <Button
                  {...api.getNowProps()}
                  text={resolvedLabels.now}
                  fullWidth={false}
                  membrane={false}
                  variant="default"
                />
              </Membrane>
            ) : null}
          </div>
        ) : null}
      </Card>
    ) : null

    return (
      <div
        {...api.getRootProps()}
        data-state={isOpen ? 'open' : 'closed'}
        style={style}
        dir={dir}
        lang={lang}
        title={title}
        hidden={hidden}
        className={cn('uf-date', className)}
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
        <FormValue
          name={name}
          form={form}
          value={serialize(formValue)}
          required={required && !readOnly}
          disabled={disabled}
          triggerRef={triggerRef}
          resetValue={serialize(
            value === undefined
              ? projectDateValue(initialValue, mode, selection)
              : controlledValue!,
          )}
          onReset={() => {
            const reset =
              value === undefined
                ? projectDateValue(initialValue, mode, selection)
                : controlledValue!
            syncContext({
              value: reset,
              rangePart: 'start',
            })
            return serialize(reset)
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
        />
        {hasLabel ? (
          <Text
            as="label"
            id={labelId}
            htmlFor={triggerId}
            className="uf-date__label"
          >
            {label}
            {required ? <span aria-hidden="true"> *</span> : null}
          </Text>
        ) : null}

        <div className="uf-date__triggerWrap">
          <Membrane enabled={membrane} fullWidth={fullWidth} interactive>
            <button
              {...nativeProps}
              {...api.getTriggerProps()}
              ref={setTriggerRef}
              id={triggerId}
              form={form}
              dir={dir}
              lang={lang}
              title={title}
              tabIndex={nativeProps.tabIndex ?? 0}
              aria-expanded={isOpen}
              aria-controls={isOpen && portalTarget ? contentId : undefined}
              aria-label={
                ariaLabel ??
                (hasLabel || labelledBy
                  ? undefined
                  : mode === 'time'
                    ? 'Choose time'
                    : 'Choose date')
              }
              aria-labelledby={
                labelledBy ??
                (ariaLabel ? undefined : hasLabel ? labelId : undefined)
              }
              aria-describedby={
                Array.from(
                  new Set(
                    [
                      ...(describedBy?.split(/\s+/) ?? []),
                      hasDescription ? descriptionId : '',
                      hasError ? errorId : '',
                    ].filter(Boolean),
                  ),
                ).join(' ') || undefined
              }
              aria-invalid={ariaInvalid ?? (hasError ? true : undefined)}
              aria-required={required || undefined}
              aria-readonly={readOnly || undefined}
              className="uf-date__trigger"
              disabled={disabled}
              onClick={(event) => {
                onClick?.(event)
                if (!event.defaultPrevented && !unavailable) {
                  triggerRef.current?.focus({ preventScroll: true })
                  api.getTriggerProps().onClick()
                }
              }}
              onKeyDown={(event) => {
                onKeyDown?.(event)
                if (!event.defaultPrevented && !unavailable)
                  api.getTriggerProps().onKeyDown(event)
              }}
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
                        !event.currentTarget.contains(
                          event.relatedTarget as Node,
                        )
                      )
                        panelHadFocus.current = false
                    }}
                    id={contentId}
                    aria-modal="true"
                    aria-labelledby={dialogLabelId}
                    aria-label={undefined}
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
        </div>

        {hasDescription ? (
          <Text as="div" id={descriptionId} className="uf-date__description">
            {description}
          </Text>
        ) : null}
        {hasError ? (
          <Text as="div" id={errorId} className="uf-date__error">
            {error}
          </Text>
        ) : null}
      </div>
    )
  },
)
