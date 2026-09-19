import type { ProductScenarioPair } from '../sync-face-json'

export default [
  {
    name: 'Product / CSV Import',
    props: {
      label: 'Customer list',
      description: 'A CSV file up to 10 MB with a header row.',
      accept: '.csv,text/csv',
      maxSize: 10485760,
      name: 'customers',
      required: true,
    },
  },
  {
    name: 'Product / Product Media',
    props: {
      label: 'Product images',
      description: 'PNG, JPEG or WebP, up to 5 MB each; at most 8.',
      accept: 'image/png,image/jpeg,image/webp',
      multiple: true,
      maxSize: 5242880,
      maxFiles: 8,
      name: 'images',
      defaultFiles: [
        { id: 'hero', name: 'hero.jpg', size: 482133 },
        { id: 'side', name: 'side-view.webp', size: 220416, progress: 64 },
        { id: 'box', name: 'packaging.png', size: 1048576, progress: 30, error: 'Upload failed. Remove it and try again.' },
      ],
      labels: {
        drop: 'Drop product images here',
        open: 'Choose images',
      },
    },
  },
] satisfies ProductScenarioPair
