import type { ProductScenarioPair } from '../sync-face-json'

export default [
  {
    name: 'Product / Price Range',
    props: {
      label: 'Monthly price',
      name: 'price',
      labels: { thumbs: ['Minimum monthly price', 'Maximum monthly price'] },
      defaultValue: [40, 180],
      min: 0,
      max: 250,
      step: 10,
      orientation: 'horizontal',
    },
  },
  {
    name: 'Product / AI Creativity',
    props: {
      showValue: true,
      label: 'Creativity',
      name: 'creativity',
      defaultValue: [62],
      min: 0,
      max: 100,
      step: 1,
    },
  },
] satisfies ProductScenarioPair
