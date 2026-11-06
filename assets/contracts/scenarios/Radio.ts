import type { ProductScenarioPair } from '../sync-face-json'

export default [
  {
    name: 'Product / Billing Cadence',
    props: {
      orientation: 'horizontal',
      defaultValue: 'annual',
      name: 'billing-cadence',
      membrane: true,
      label: 'Billing cadence',
      items: [
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
      label: 'Model quality',
      description: 'Higher quality answers take longer.',
      items: [
        { value: 'fast', label: 'Fast' },
        { value: 'balanced', label: 'Balanced' },
        { value: 'quality', label: 'Highest quality' },
      ],
    },
  },
] satisfies ProductScenarioPair
