import type { ProductScenarioPair } from '../sync-face-json'

export default [
  {
    name: 'Product / Customer Satisfaction',
    props: {
      defaultValue: 4,
      max: 5,
      allowHalf: false,
      label: 'How helpful was this answer?',
      name: 'helpfulness',
      required: true,
    },
  },
  {
    name: 'Product / Marketplace Score',
    props: {
      value: 4.2,
      max: 5,
      readOnly: true,
      label: '4.2 average rating',
    },
  },
] satisfies ProductScenarioPair
