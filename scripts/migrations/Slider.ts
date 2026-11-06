import type { Migration } from './types'

const leading = 'Put leading content in `label` or next to the slider'
// A crop range still written as `{ min, max }`: the key, quoted in JSON, not the word, which
// the migrated `{ start: range.min, end: range.max }` keeps.
const legacyCropRange = String.raw`[{,]\s*["']?(?:min|max)["']?\s*[:,}]`
// A handler still reading the crop range itself: destructured as `({ min, max }) => …`, or
// through its parameter, `(range) => … range.min …`. `({ cropRange }) => …` is migrated, and
// a `min`/`max` of anything else in its body is not the payload.
const legacyCropHandler = String.raw`^\s*\(?\s*(?:\{[^}]*\b(?:min|max)\b[\s\S]*?=>|([A-Za-z_$][\w$]*)\b[\s\S]*?=>[\s\S]*\b\1\s*\.\s*(?:min|max)\b)`
// A handler reading the single value out of the array the payload always was: `details.value[0]`
// or `value[0]` once destructured, `details.value.at(0)`, or a parameter that destructures the
// one element, `({ value: [only] }) => …`.
const legacyValue = String.raw`\bvalue\s*(?:\[\s*0\s*\]|\.\s*at\s*\(\s*0\s*\))|^\s*\(?\s*\{[^}]*\bvalue\s*:\s*\[\s*[A-Za-z_$][\w$]*\s*\]`
// Which is still the right read while the slider has more than one thumb. Its own value says so
// when it is written as an array; when it comes from a variable only the rest of the usage can,
// so a handler that reads a further element, destructures more than one or spreads the payload
// as a list, and a `labels.thumbs` naming two thumbs, each leave the usage alone.
const arrayLiteral = String.raw`^\s*\[`
const readsMoreThanOne = String.raw`\bvalue\s*(?:\[\s*[1-9]|\.\s*at\s*\(\s*[1-9])|^\s*\(?\s*\{[^}]*\bvalue\s*:\s*\[[^\]]*,|\.\.\.\s*value\b`
const multiThumb = {
  value: arrayLiteral,
  defaultValue: arrayLiteral,
  onValueChange: readsMoreThanOne,
  onValueCommit: readsMoreThanOne,
  labels: String.raw`["']?thumbs["']?\s*:\s*\[[^\]]*,`,
}
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
  { kind: 'retype-prop', component: 'Slider', prop: 'onCropRangeChange', ...cropPayload, codemod: 'manual', legacy: legacyCropHandler },
  { kind: 'retype-prop', component: 'Slider', prop: 'onCropRangeCommit', ...cropPayload, codemod: 'manual', legacy: legacyCropHandler },
  {
    kind: 'retype-prop',
    component: 'Slider',
    prop: 'cropRange',
    before: '`{ min, max }`',
    after: '`{ start, end }`; `min` and `max` name the ends of the scale',
    codemod: 'manual',
    legacy: legacyCropRange,
  },
  {
    kind: 'retype-prop',
    component: 'Slider',
    prop: 'defaultCropRange',
    before: '`{ min, max }`',
    after: '`{ start, end }`; `min` and `max` name the ends of the scale',
    codemod: 'manual',
    legacy: legacyCropRange,
  },
  { kind: 'retype-prop', component: 'Slider', prop: 'onValueChange', ...valuePayload, codemod: 'manual', legacy: legacyValue, unless: multiThumb },
  { kind: 'retype-prop', component: 'Slider', prop: 'onValueCommit', ...valuePayload, codemod: 'manual', legacy: legacyValue, unless: multiThumb },
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
