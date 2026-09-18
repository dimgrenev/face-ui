import type { ProductScenarioPair } from '../sync-face-json'

export default [
  { name: 'Product / Storage Quota', props: { value: 82, tone: 'warning', label: 'Storage used', showValue: true } },
  {
    name: 'Product / Context Window',
    props: {
      value: 74,
      max: 100,
      tone: 'warning',
      shape: 'circle',
      showValue: true,
      label: 'Context used',
    },
  },
] satisfies ProductScenarioPair
