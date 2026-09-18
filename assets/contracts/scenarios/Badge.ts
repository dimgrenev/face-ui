import type { ProductScenarioPair } from '../sync-face-json'

export default [
  {
    name: 'Product / Deployment Ready',
    props: { text: 'Ready to deploy', appearance: 'fill', tone: 'positive' },
  },
  {
    name: 'Product / Usage Warning',
    props: {
      text: '82% of quota used',
      appearance: 'outline',
      tone: 'warning',
    },
  },
] satisfies ProductScenarioPair
