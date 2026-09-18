import type { ProductScenarioPair } from '../sync-face-json'

export default [
  {
    name: 'Product / User Avatar Loading',
    props: { variant: 'circle', width: 40, height: 40 },
  },
  {
    name: 'Product / Dashboard Card Loading',
    props: { variant: 'rect', width: '100%', height: 160 },
  },
] satisfies ProductScenarioPair
