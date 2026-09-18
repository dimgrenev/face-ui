import type { ProductScenarioPair } from '../sync-face-json'

export default [
  {
    name: 'Product / CSV Import',
    props: {
      accept: '.csv,text/csv',
      multiple: false,
      maxSize: 10485760,
      maxFiles: 1,
      disabled: false,
    },
  },
  {
    name: 'Product / Product Media',
    props: {
      accept: 'image/png,image/jpeg,image/webp',
      multiple: true,
      maxSize: 5242880,
      maxFiles: 8,
      disabled: false,
      labels: {
        idle: 'Drop product images here',
        dragging: 'Release to add images',
        trigger: 'Choose images',
        remove: 'Remove',
      },
    },
  },
] satisfies ProductScenarioPair
