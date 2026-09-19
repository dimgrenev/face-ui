import type { Migration } from './types'

export default [
  {
    kind: 'remove-prop',
    component: 'Date',
    prop: 'showPresets',
    use: 'Pass `presets`; they render whenever the list is not empty',
    codemod: 'manual',
  },
  { kind: 'remove-prop', component: 'Date', prop: 'views', use: '`mode` and `openTo`', codemod: 'manual' },
  { kind: 'move-to-labels', component: 'Date', from: 'clearLabel', key: 'clear', codemod: 'auto' },
  { kind: 'move-to-labels', component: 'Date', from: 'nowLabel', key: 'now', codemod: 'auto' },
  { kind: 'move-to-labels', component: 'Date', from: 'closeLabel', key: 'close', codemod: 'auto' },
  {
    kind: 'retype-prop',
    component: 'Date',
    prop: 'presets',
    before: '`{ label, value }` items',
    after: 'Each item also needs an `id`, unique within the picker',
    codemod: 'manual',
  },
  {
    kind: 'behavior',
    component: 'Date',
    before: '`weekStartsOn` defaulted to 1 (Monday)',
    after: 'The first weekday follows `locale`; set `weekStartsOn` to pin it',
  },
  {
    kind: 'behavior',
    component: 'Date',
    before: '`ref` pointed to the wrapper `<div>`',
    after: '`ref` points to the trigger `<button>`; `className` and `style` still style the whole field',
  },
  { kind: 'rename-prop', component: 'Date', from: 'showClear', to: 'clearable', codemod: 'auto' },
  {
    kind: 'remove-prop',
    component: 'Date',
    prop: 'surfaceTitle',
    use: 'The picker takes the field name: `label`, `aria-label` or `aria-labelledby`',
    codemod: 'manual',
  },
  {
    kind: 'remove-prop',
    component: 'Date',
    prop: 'surfaceBreakpoint',
    use: '`surface="auto"` switches to a sheet below 900px; pass `surface="sheet"` or `"popover"` to pin one',
    codemod: 'auto',
  },
  {
    kind: 'behavior',
    component: 'Date',
    before: 'The trigger showed "Pick date" or "Pick time", and an unlabelled field was named "Choose date" or "Choose time"',
    after: 'There is no English default: pass `placeholder`, and `label` or `aria-label`',
  },
  {
    kind: 'behavior',
    component: 'Date',
    before: 'Label, help and error were `.uf-date__label`, `.uf-date__description` and `.uf-date__error` inside `.uf-date__triggerWrap`',
    after: 'They are the shared Field parts `.uf-field__label`, `.uf-field__description`, `.uf-field__error` and `.uf-field__required` (`[data-scope="field"]`); `labelPosition` places the label',
  },
  {
    kind: 'behavior',
    component: 'Date',
    before: 'An unreadable `value`, `defaultValue`, `min`, `max`, `disabledDates`, `presets`, `format`, `locale`, `timezone` or `weekStartsOn`, or an out-of-range `disabledTime`, threw during render',
    after: 'The picker renders without it (a preset is dropped, a format or locale falls back) and reports it once in development; a point given for a range, or a range for a point, is projected silently',
  },
] satisfies Migration[]
