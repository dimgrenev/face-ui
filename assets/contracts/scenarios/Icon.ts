import type { ProductScenarioPair } from '../sync-face-json'

export default [
  {
    name: 'Product / Accessible Action',
    props: {
      name: 'search',
      'aria-label': 'Search workspace',
      title: 'Search workspace',
    },
  },
  {
    name: 'Product / Status Symbol',
    props: { name: 'radio-on', 'aria-label': 'Online', title: 'Service is online' },
  },
] satisfies ProductScenarioPair
