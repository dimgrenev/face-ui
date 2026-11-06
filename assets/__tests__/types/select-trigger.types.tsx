import { SelectTrigger, type SelectTriggerProps } from '../../../Select/Select'
import { SelectTrigger as RootSelectTrigger } from '../../../index'

export const externalDialogTrigger = <SelectTrigger open surface="side" aria-haspopup="dialog"
  aria-controls="properties" aria-label="Properties" isPlaceholder unavailable
  fullWidth stretchText membrane valueClassName="value"
  ref={node => { const button: HTMLButtonElement | null = node; button?.focus() }}
  onClick={event => { const button: HTMLButtonElement = event.currentTarget; button.focus() }}>
  <strong>Component</strong>
</SelectTrigger>
export const rootTrigger = <RootSelectTrigger iconOnly disabled aria-label="More" />
export const triggerProps: SelectTriggerProps = { open: false, surface: 'sheet', tabIndex: -1 }
// @ts-expect-error The existing parent owns selection and the list.
export const triggerItems = <SelectTrigger items={[{ value: 'a', label: 'A' }]} />
// @ts-expect-error Open is controlled presentation, with no second state owner.
export const triggerDefaultOpen = <SelectTrigger defaultOpen />
// @ts-expect-error This is always a non-submitting button.
export const triggerType = <SelectTrigger type="submit" />
// @ts-expect-error Open owns the expanded state.
export const triggerExpanded: SelectTriggerProps = { 'aria-expanded': true }
// @ts-expect-error The parent has already resolved responsive presentation.
export const triggerAuto = <SelectTrigger surface="auto" />
