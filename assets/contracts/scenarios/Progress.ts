import type { ProductScenarioPair } from '../sync-face-json'

export default [
  { name: 'Product / Background Task', props: { indeterminate: true, label: 'Analyzing documents' } },
  {
    name: 'Product / File Upload',
    props: {
      value: 68,
      max: 100,
      tone: 'neutral',
      shape: 'linear',
      showValue: true,
      label: 'Uploading dataset',
    },
  },
] satisfies ProductScenarioPair
