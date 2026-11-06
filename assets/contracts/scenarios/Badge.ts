import type { ProductScenarioPair } from '../sync-face-json'

export default [
  {
    name: 'Product / Deployment Ready',
    props: { children: 'Ready to deploy', variant: 'fill', tone: 'positive' },
  },
  {
    name: 'Product / Usage Warning',
    props: {
      children: '82% of quota used',
      variant: 'outline',
      tone: 'warning',
    },
  },
] satisfies ProductScenarioPair
