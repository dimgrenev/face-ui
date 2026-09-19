import type { ProductScenarioPair } from '../sync-face-json'

const media = (src: string, alt: string) => ({ __componentName__: 'Media', src, alt, height: 320 })

export default [
  {
    name: 'Product / Product Tour',
    props: {
      'aria-label': 'Product tour',
      loop: true,
      autoPlay: true,
      autoPlayInterval: 5000,
      children: [
        media('/assets/media/examples/office-core/lobby-day.webp', 'Workspace overview'),
        media('/assets/media/examples/office-core/lobby-glass-blocks.webp', 'Team collaboration view'),
        media('/assets/media/examples/office-core/skyline-window-day.webp', 'Analytics overview'),
      ],
    },
  },
  {
    name: 'Product / Customer Stories',
    props: {
      'aria-label': 'Customer stories',
      defaultIndex: 1,
      slidesPerView: 2,
      children: [
        media('/assets/media/examples/office-core/lobby-day.webp', 'Design team in the studio'),
        media('/assets/media/examples/office-core/lobby-glass-blocks.webp', 'Customer team in a bright office'),
        media('/assets/media/examples/office-core/skyline-window-day.webp', 'Enterprise team reviewing results'),
      ],
    },
  },
] satisfies ProductScenarioPair
