import type { ProductScenarioPair } from '../sync-face-json'

export default [
  {
    name: 'Product / Hover Help',
    props: {
      trigger: 'hover',
      children: 'API limits',
      content: 'Limits reset at the start of each billing cycle.',
      side: 'top',
      align: 'center',
      sideOffset: 4,
      openDelay: 250,
    },
  },
  {
    name: 'Product / Click Inspector',
    props: {
      trigger: 'click',
      children: 'Inspect run',
      content: 'Latency: 1.8s. Tokens: 2,460. Cache hit: 72%.',
      side: 'right',
      align: 'start',
      sideOffset: 6,
      open: true,
    },
  },
] satisfies ProductScenarioPair
