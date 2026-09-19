import type { Migration } from './types'

const leading = 'Put leading content in `label` or next to the slider'
// Crop boundaries written as `{ min, max }`, and handlers reading the old payload.
const legacyCrop = String.raw`\b(min|max)\b`
const cropPayload = {
  before: 'The crop range itself, `{ min, max }`',
  after: '`{ cropRange }`, with `cropRange` as `{ start, end }`',
}
const valuePayload = {
  before: '`details.value` was always an array',
  after: '`details.value` has the shape of `value`/`defaultValue`: a number for a number, an array for an array',
}

export default [
  {
    kind: 'remove-prop',
    component: 'Slider',
    prop: 'variant',
    use: '`showValue` instead of `"advanced"`; omit `"simple"`',
    codemod: 'auto',
    values: { advanced: 'showValue', simple: '' },
  },
  { kind: 'remove-prop', component: 'Slider', prop: 'leadingIcon', use: leading, codemod: 'manual' },
  { kind: 'remove-prop', component: 'Slider', prop: 'leadingText', use: leading, codemod: 'manual' },
  { kind: 'rename-prop', component: 'Slider', from: 'cropLocksValue', to: 'clampToCrop', codemod: 'auto' },
  { kind: 'export', from: 'SliderVariant', to: 'The boolean `showValue` prop', codemod: 'manual' },
  { kind: 'export', from: 'Slider/SliderAdvanced#SliderAdvanced', to: '`Slider` with `showValue` and `crop`', codemod: 'manual' },
  { kind: 'export', from: 'Slider/SliderAdvanced#SliderAdvancedProps', to: '`SliderProps`', codemod: 'manual' },
  { kind: 'export', from: 'Slider/SliderAdvanced#SliderCropRange', to: 'Slider/Slider#SliderCropRange', codemod: 'auto' },
  { kind: 'rename-prop', component: 'Slider', from: 'onCropChange', to: 'onCropRangeChange', codemod: 'auto' },
  { kind: 'rename-prop', component: 'Slider', from: 'onCropCommit', to: 'onCropRangeCommit', codemod: 'auto' },
  { kind: 'retype-prop', component: 'Slider', prop: 'onCropRangeChange', ...cropPayload, codemod: 'manual', legacy: legacyCrop },
  { kind: 'retype-prop', component: 'Slider', prop: 'onCropRangeCommit', ...cropPayload, codemod: 'manual', legacy: legacyCrop },
  {
    kind: 'retype-prop',
    component: 'Slider',
    prop: 'cropRange',
    before: '`{ min, max }`',
    after: '`{ start, end }`; `min` and `max` name the ends of the scale',
    codemod: 'manual',
    legacy: legacyCrop,
  },
  {
    kind: 'retype-prop',
    component: 'Slider',
    prop: 'defaultCropRange',
    before: '`{ min, max }`',
    after: '`{ start, end }`; `min` and `max` name the ends of the scale',
    codemod: 'manual',
    legacy: legacyCrop,
  },
  { kind: 'retype-prop', component: 'Slider', prop: 'onValueChange', ...valuePayload, codemod: 'manual', legacy: String.raw`\.value\[0\]` },
  { kind: 'retype-prop', component: 'Slider', prop: 'onValueCommit', ...valuePayload, codemod: 'manual', legacy: String.raw`\.value\[0\]` },
  {
    kind: 'behavior',
    component: 'Slider',
    before: 'An empty or non-finite `value`, a `labels.thumbs` of the wrong length, a blank control name, a non-object crop range or a non-text `formatValue` result threw during render',
    after: 'The slider renders: non-finite entries are dropped (none left reads as `min`), missing or blank names and text fall back to the defaults, and malformed data is reported once in development',
  },
  {
    kind: 'behavior',
    component: 'Slider',
    before: 'Narrowing `max`, `min` or the crop rewrote the uncontrolled value (and the default crop) to the clamped one, so widening again did not bring it back',
    after: 'The value is kept and shown clamped; widening the scale or the crop shows it again, and the default crop follows the scale until the user edits it',
  },
  {
    kind: 'behavior',
    component: 'Slider',
    before: '`onValueCommit`/`onCropRangeCommit` fired only when the parent had accepted the last proposal of the gesture',
    after: 'They fire when a gesture ends showing a different value than at its start, whatever the parent accepted along the way',
  },
  {
    kind: 'behavior',
    component: 'Slider',
    before: 'ArrowRight decreased a vertical slider in right-to-left text',
    after: 'ArrowRight and ArrowUp always increase a vertical slider; only a horizontal right-to-left track swaps Left and Right',
  },
  {
    kind: 'behavior',
    component: 'Slider',
    before: 'The label was a `Text` part (`[data-scope=slider][data-part=label]`, `.uf-slider__label`) with the membrane around it',
    after: 'The root is a field (`uf-field`) with `label`, `description`, `error`, `labelPosition` and a `required` marker; the label is `.uf-field__label` in the shared field typography, and each thumb carries the description, the error and `aria-invalid`',
  },
] satisfies Migration[]
