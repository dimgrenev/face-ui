import type { ProductScenarioPair } from '../sync-face-json'

export default [
  {
    name: 'Product / Product Tour',
    props: {
      ariaLabel: 'Product tour',
      loop: true,
      autoPlay: true,
      autoPlayInterval: 5000,
      slidesPerView: 1,
      slides: [
        {
          src: '/assets/media/examples/office-core/lobby-day.webp',
          alt: 'Workspace overview',
        },
        {
          src: '/assets/media/examples/office-core/lobby-glass-blocks.webp',
          alt: 'Team collaboration view',
        },
        {
          src: '/assets/media/examples/office-core/skyline-window-day.webp',
          alt: 'Analytics overview',
        },
      ],
    },
  },
  {
    name: 'Product / Customer Stories',
    props: {
      ariaLabel: 'Customer stories',
      loop: false,
      autoPlay: false,
      defaultIndex: 1,
      slidesPerView: 1,
      slides: [
        {
          src: '/assets/media/examples/office-core/lobby-glass-blocks.webp',
          alt: 'Customer team in a bright office',
        },
        {
          src: '/assets/media/examples/office-core/skyline-window-day.webp',
          alt: 'Enterprise team reviewing results',
        },
      ],
    },
  },
] satisfies ProductScenarioPair
