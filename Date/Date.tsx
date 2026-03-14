import React, { forwardRef, useEffect, useMemo, useRef } from 'react'
import { useMachine } from '../assets/adapters/react/use-machine'
import { useControllableMachineProp } from '../assets/adapters/react/use-controllable-machine-prop'
import {
  DEFAULT_OVERLAY_SURFACE_BREAKPOINT,
  useResponsiveOverlaySurface,
  type ResponsiveOverlaySurface,
} from '../assets/adapters/react/use-responsive-overlay-surface'
import { useBodyScrollLock } from '../assets/adapters/react/use-body-scroll-lock'
import { ResponsiveSheetHeader } from '../assets/ResponsiveSheetHeader'
import { Calendar } from '../Calendar/Calendar'
import { Button } from '../Button/Button'
import { Text } from '../Text/Text'
import { Icon } from '../Icon/Icon'
import { cn } from '../assets/utils'
import {
  connectDate,
  dateMachine,
} from '../assets/machines/date.machine'
import {
  type DateMode,
  type DateSelection,
  type DateView,
  type DateValueExternal,
  type DateValueFormat,
  extractDatePart,
  getDefaultViews,
  getHourGrid,
  getMinuteGrid,
  getMonthGrid,
  getYearGrid,
  isTimeDisabled,
  normalizeISOValue,
  parseDateLike,
  toISODate,
  toISODateTime,
} from '../assets/date-utils'

export interface DatePreset {
  label: string
  value: DateValueExternal
}

export interface DateProps {
  mode?: DateMode
  selection?: DateSelection
  views?: DateView[]
  openTo?: DateView
  value?: DateValueExternal
  defaultValue?: DateValueExternal
  onValueChange?: (details: { value: DateValueExternal }) => void
  onOpenChange?: (details: { open: boolean }) => void
  valueFormat?: DateValueFormat
  locale?: string
  timezone?: string
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6
  format?: string
  min?: string | globalThis.Date | null
  max?: string | globalThis.Date | null
  disabledDates?: Array<string | globalThis.Date>
  disabledTime?: { hours?: number[]; minutes?: number[] }
  closeOnSelect?: boolean
  showNow?: boolean
  showClear?: boolean
  showPresets?: boolean
  presets?: DatePreset[]
  surface?: ResponsiveOverlaySurface
  surfaceBreakpoint?: number
  surfaceTitle?: React.ReactNode
  label?: React.ReactNode
  description?: React.ReactNode
  error?: React.ReactNode
  required?: boolean
  disabled?: boolean
  readOnly?: boolean
  placeholder?: string
  membrane?: boolean
  fullWidth?: boolean
  className?: string
}

function normalizeIsoPoint(input: string | globalThis.Date | null | undefined): string | null {
  const parsed = parseDateLike(input ?? null)
  return parsed ? toISODateTime(parsed) : null
}

function normalizeDateList(values: Array<string | globalThis.Date> | undefined): string[] {
  if (!Array.isArray(values)) return []
  return values
    .map((item) => {
      const d = parseDateLike(item)
      return d ? toISODate(d) : null
    })
    .filter((item): item is string => Boolean(item))
}

function getDefaultPresets(locale: string): DatePreset[] {
  const now = new globalThis.Date()
  const today = new globalThis.Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new globalThis.Date(today)
  yesterday.setDate(today.getDate() - 1)
  const last7Start = new globalThis.Date(today)
  last7Start.setDate(today.getDate() - 6)
  return [
    { label: 'Today', value: toISODate(today) },
    { label: 'Yesterday', value: toISODate(yesterday) },
    {
      label: 'Last 7 days',
      value: {
        start: toISODate(last7Start),
        end: toISODate(today),
      },
    },
    {
      label: locale.startsWith('ru') ? 'Текущий месяц' : 'This month',
      value: {
        start: toISODate(new globalThis.Date(today.getFullYear(), today.getMonth(), 1)),
        end: toISODate(new globalThis.Date(today.getFullYear(), today.getMonth() + 1, 0)),
      },
    },
  ]
}

function viewLabel(view: DateView): string {
  switch (view) {
    case 'day': return 'Day'
    case 'month': return 'Month'
    case 'year': return 'Year'
    case 'hours': return 'Hour'
    case 'minutes': return 'Minute'
    default: return String(view)
  }
}

export const Date = forwardRef<HTMLDivElement, DateProps>(function Date(props, ref) {
  const {
    mode = 'date',
    selection = 'single',
    views: viewsProp,
    openTo,
    value,
    defaultValue = null,
    onValueChange,
    onOpenChange,
    valueFormat = 'iso',
    locale = 'en-US',
    timezone = 'UTC',
    weekStartsOn = 1,
    min = null,
    max = null,
    disabledDates = [],
    disabledTime,
    closeOnSelect = mode === 'date' && selection === 'single',
    showNow = true,
    showClear = true,
    showPresets = false,
    presets,
    surface = 'auto',
    surfaceBreakpoint = DEFAULT_OVERLAY_SURFACE_BREAKPOINT,
    surfaceTitle,
    label,
    description,
    error,
    required = false,
    disabled = false,
    readOnly = false,
    placeholder = mode === 'time' ? 'Pick time' : 'Pick date',
    membrane = true,
    fullWidth = true,
    className,
  } = props

  const resolvedViews = useMemo(
    () => (Array.isArray(viewsProp) && viewsProp.length > 0 ? viewsProp : getDefaultViews(mode)),
    [viewsProp, mode],
  )

  const controlledNormalized = useControllableMachineProp(
    value !== undefined ? normalizeISOValue(value) : undefined,
    normalizeISOValue(defaultValue),
  )

  const normalizedSingle = controlledNormalized === undefined
    ? undefined
    : (typeof controlledNormalized === 'string' ? controlledNormalized : null)
  const normalizedRange = controlledNormalized === undefined
    ? undefined
    : (controlledNormalized && typeof controlledNormalized === 'object' && 'start' in controlledNormalized
        ? { start: controlledNormalized.start ?? null, end: controlledNormalized.end ?? null }
        : { start: null, end: null })

  const { state, send } = useMachine(dateMachine, {
    mode,
    selection,
    views: resolvedViews,
    view: openTo && resolvedViews.includes(openTo) ? openTo : resolvedViews[0],
    valueFormat,
    valueSingle: normalizedSingle,
    valueRange: normalizedRange,
    locale,
    timezone,
    weekStartsOn,
    min: normalizeIsoPoint(min),
    max: normalizeIsoPoint(max),
    disabledDates: normalizeDateList(disabledDates),
    disabledTime: disabledTime ?? null,
    closeOnSelect,
    disabled,
    readOnly,
    placeholder,
    onValueChange,
    onOpenChange,
  })

  const api = connectDate(state, send)
  const resolvedSurface = useResponsiveOverlaySurface(surface, surfaceBreakpoint)
  useBodyScrollLock(api.open && resolvedSurface === 'sheet')
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!api.open || resolvedSurface !== 'popover') return
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null
      if (!target) return
      if (rootRef.current?.contains(target)) return
      send({ type: 'CLOSE' })
    }
    window.addEventListener('mousedown', handlePointerDown)
    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
    }
  }, [api.open, resolvedSurface, send])

  const selectedDateForCalendar = useMemo(() => {
    if (api.selection === 'range') {
      const start = extractDatePart(api.valueRange?.start ?? null)
      if (!start) return null
      const d = parseDateLike(start)
      return d ?? null
    }
    if (!api.valueSingle) return null
    const datePart = extractDatePart(api.valueSingle)
    if (!datePart) return null
    return parseDateLike(datePart)
  }, [api.selection, api.valueRange, api.valueSingle])

  const mergedRef = (node: HTMLDivElement | null) => {
    rootRef.current = node
    if (typeof ref === 'function') ref(node)
    else if (ref && typeof ref === 'object') (ref as React.MutableRefObject<HTMLDivElement | null>).current = node
  }

  const presetsList = Array.isArray(presets) && presets.length > 0 ? presets : getDefaultPresets(locale)
  const contentProps = api.getContentProps()
  const sheetTitle = surfaceTitle ?? label ?? (mode === 'time' ? 'Choose time' : 'Choose date')

  const baseDate = parseDateLike(extractDatePart(api.valueSingle) ?? null) ?? new globalThis.Date()
  const yearGrid = getYearGrid(baseDate.getFullYear(), 6)
  const monthGrid = getMonthGrid(locale)
  const hours = getHourGrid(1)
  const minutes = getMinuteGrid(5)
  const contentPanel = (
    <div className="uf-date__contentPanel">
      {resolvedSurface === 'sheet' ? (
        <ResponsiveSheetHeader
          title={sheetTitle}
          onClose={() => send({ type: 'CLOSE' })}
        />
      ) : null}
      <div className="uf-date__toolbar">
        {api.views.map((view) => (
          <span key={view} className="uf-membrane">
            <Button
              {...api.getViewSwitchProps(view)}
              text={viewLabel(view)}
              fullWidth={false}
              membrane={false}
              variant={api.view === view ? 'default' : 'ghost'}
            />
          </span>
        ))}
      </div>

      <div className="uf-date__panel">
        {api.view === 'day' ? (
          <Calendar
            value={selectedDateForCalendar}
            onValueChange={(details) => {
              const date = details?.value
              if (!date) return
              const iso = toISODate(date)
              send({ type: 'SELECT_DAY', date: iso })
            }}
            min={parseDateLike(min) ?? undefined}
            max={parseDateLike(max) ?? undefined}
            disabledDates={normalizeDateList(disabledDates).map((iso) => parseDateLike(iso)).filter((d): d is globalThis.Date => Boolean(d))}
            locale={locale}
            weekStartsOn={weekStartsOn}
          />
        ) : null}

        {api.view === 'month' ? (
          <div className="uf-date__grid uf-date__grid--month">
            {monthGrid.map((month) => {
              const selected = (baseDate.getMonth() + 1) === month.value
              return (
                <span key={month.value} className="uf-membrane">
                  <Button
                    text={month.label}
                    fullWidth
                    membrane={false}
                    variant={selected ? 'default' : 'ghost'}
                    onClick={() => send({ type: 'SELECT_MONTH', month: month.value })}
                  />
                </span>
              )
            })}
          </div>
        ) : null}

        {api.view === 'year' ? (
          <div className="uf-date__grid uf-date__grid--year">
            {yearGrid.map((year) => {
              const selected = baseDate.getFullYear() === year
              return (
                <span key={year} className="uf-membrane">
                  <Button
                    text={String(year)}
                    fullWidth
                    membrane={false}
                    variant={selected ? 'default' : 'ghost'}
                    onClick={() => send({ type: 'SELECT_YEAR', year })}
                  />
                </span>
              )
            })}
          </div>
        ) : null}

        {api.view === 'hours' ? (
          <div className="uf-date__grid uf-date__grid--time">
            {hours.map((hour) => {
              const selected = api.draftHour === hour
              const disabledHour = isTimeDisabled(hour, api.draftMinute, disabledTime)
              return (
                <span key={`hour:${hour}`} className="uf-membrane">
                  <Button
                    text={String(hour).padStart(2, '0')}
                    fullWidth
                    membrane={false}
                    variant={selected ? 'default' : 'ghost'}
                    disabled={disabledHour}
                    onClick={() => send({ type: 'SELECT_HOUR', hour })}
                  />
                </span>
              )
            })}
          </div>
        ) : null}

        {api.view === 'minutes' ? (
          <div className="uf-date__grid uf-date__grid--time">
            {minutes.map((minute) => {
              const selected = api.draftMinute === minute
              const disabledMinute = isTimeDisabled(api.draftHour, minute, disabledTime)
              return (
                <span key={`minute:${minute}`} className="uf-membrane">
                  <Button
                    text={String(minute).padStart(2, '0')}
                    fullWidth
                    membrane={false}
                    variant={selected ? 'default' : 'ghost'}
                    disabled={disabledMinute}
                    onClick={() => send({ type: 'SELECT_MINUTE', minute })}
                  />
                </span>
              )
            })}
          </div>
        ) : null}
      </div>

      {showPresets ? (
        <div className="uf-date__presets">
          {presetsList.map((preset) => (
            <span key={preset.label} className="uf-membrane">
              <Button
                {...api.getPresetProps(preset.value)}
                text={preset.label}
                fullWidth
                membrane={false}
                variant="ghost"
              />
            </span>
          ))}
        </div>
      ) : null}

      <div className="uf-date__footer">
        {showClear ? (
          <span className="uf-membrane">
            <Button
              {...api.getClearProps()}
              text="Clear"
              fullWidth={false}
              membrane={false}
              variant="ghost"
            />
          </span>
        ) : null}
        {showNow ? (
          <span className="uf-membrane">
            <Button
              {...api.getNowProps()}
              text="Now"
              fullWidth={false}
              membrane={false}
              variant="default"
            />
          </span>
        ) : null}
      </div>
    </div>
  )

  return (
    <div
      ref={mergedRef}
      {...api.getRootProps()}
      className={cn('uf-date', className)}
      data-full-width={fullWidth ? '' : undefined}
    >
      {label != null ? (
        <Text as="label" variant="label" className="uf-date__label">
          {label}
          {required ? ' *' : null}
        </Text>
      ) : null}

      <div className="uf-date__triggerWrap">
        {membrane ? (
          <span className={cn('uf-membrane', fullWidth && 'uf-membrane--full')}>
            <button
              {...api.getTriggerProps()}
              className="uf-date__trigger"
              disabled={disabled}
            >
              <Text as="span" membrane={false} inset="none" className="uf-date__value">
                {api.triggerLabel}
              </Text>
              <span className="uf-date__icon" aria-hidden="true">
                <Icon name="date" size={16} />
              </span>
            </button>
          </span>
        ) : (
          <button
            {...api.getTriggerProps()}
            className="uf-date__trigger"
            disabled={disabled}
          >
            <Text as="span" membrane={false} inset="none" className="uf-date__value">
              {api.triggerLabel}
            </Text>
            <span className="uf-date__icon" aria-hidden="true">
              <Icon name="date" size={16} />
            </span>
          </button>
        )}

        {resolvedSurface === 'sheet' ? (
          <div
            className="uf-responsive-overlay-backdrop"
            data-state={api.open ? 'open' : 'closed'}
            onClick={() => send({ type: 'CLOSE' })}
          />
        ) : null}

        <div
          {...contentProps}
          className="uf-date__content"
          data-surface={resolvedSurface}
        >
          {membrane ? (
            <span className="uf-membrane uf-date__contentMembrane">
              {contentPanel}
            </span>
          ) : contentPanel}
        </div>
      </div>

      {description ? (
        <Text as="div" variant="caption" className="uf-date__description">
          {description}
        </Text>
      ) : null}
      {error ? (
        <Text as="div" variant="caption" className="uf-date__error">
          {error}
        </Text>
      ) : null}
    </div>
  )
})
