import type { ProductScenarioPair } from '../sync-face-json'

export default [
  {
    name: 'Product / Search Results',
    props: {
      defaultPage: 4,
      total: 248,
      pageSize: 20,
      siblingCount: 2,
      membrane: true,
      labels: { choosePage: 'Choose results page' },
    },
  },
  {
    name: 'Product / Audit Log',
    props: {
      defaultPage: 18,
      total: 1260,
      pageSize: 50,
      siblingCount: 1,
      membrane: true,
      labels: { choosePage: 'Choose audit page' },
    },
  },
] satisfies ProductScenarioPair
