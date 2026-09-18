import type { Migration } from './types'

const leading = 'Put leading content in `label` or next to the slider'

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
] satisfies Migration[]
