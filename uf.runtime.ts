const runtime = {
  project: {
    name: 'face-ui-react',
    framework: 'react',
  },

  styles: {
    include: ['assets/styles/index.css'],
  },

  preview: {
    theme: 'light',
    centerCanvas: true,
    align: 'center',
    padding: 'var(--uf-spacing-6)',
    background: 'var(--uf-color-panel, Canvas)',
    maxWidth: '100%',
    fullFrameComponents: ['face-ui-react'],
    fullWidthComponents: ['face-ui-react', 'Card', 'Carousel', 'Media', 'Modal', 'Progress', 'Scroll', 'Separator', 'Table', 'Toc'],
    env: {
      pathname: '/preview/face-ui-react',
      route: '/preview/face-ui-react',
      asPath: '/preview/face-ui-react',
    },
  },
} as const;

export default runtime;
