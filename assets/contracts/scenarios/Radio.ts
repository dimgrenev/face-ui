import type { ProductScenarioPair } from '../sync-face-json'

export default [
  {
    name: 'Product / Billing Cadence',
    props: {
      orientation: 'horizontal',
      defaultValue: 'annual',
      name: 'billing-cadence',
      membrane: true,
      'aria-label': 'Billing cadence',
      options: [
        { value: 'monthly', label: 'Monthly' },
        { value: 'annual', label: 'Annual - save 20%' },
      ],
    },
  },
  {
    name: 'Product / Model Quality',
    props: {
      orientation: 'vertical',
      defaultValue: 'balanced',
      name: 'model-quality',
      membrane: true,
      'aria-label': 'Model quality',
      options: [
        { value: 'fast', label: 'Fast' },
        { value: 'balanced', label: 'Balanced' },
        { value: 'quality', label: 'Highest quality' },
      ],
    },
  },
] satisfies ProductScenarioPair
