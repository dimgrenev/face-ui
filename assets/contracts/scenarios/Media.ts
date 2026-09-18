import type { ProductScenarioPair } from '../sync-face-json'

export default [
  {
    name: 'Product / Dashboard Screenshot',
    props: {
      type: 'image',
      src: '/assets/media/examples/office-core/lobby-day.webp',
      alt: 'Analytics dashboard overview',
      variant: 'rounded',
      loading: 'eager',
      decoding: 'async',
      objectFit: 'cover',
      width: '100%',
      height: 320,
      membrane: true,
    },
  },
  {
    name: 'Product / Customer Portrait',
    props: {
      type: 'image',
      src: '/assets/media/examples/office-core/lobby-glass-blocks.webp',
      alt: 'Customer profile portrait',
      variant: 'circle',
      loading: 'lazy',
      objectFit: 'cover',
      width: 96,
      height: 96,
      membrane: true,
    },
  },
] satisfies ProductScenarioPair
