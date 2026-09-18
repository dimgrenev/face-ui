import type { ProductScenarioPair } from '../sync-face-json'

export default [
  {
    name: 'Product / Content Section',
    props: { orientation: 'horizontal', decorative: false, membrane: true },
  },
  {
    name: 'Product / Toolbar Divider',
    props: { orientation: 'vertical', decorative: true, membrane: true },
  },
] satisfies ProductScenarioPair
