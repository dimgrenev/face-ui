import type { ProductScenarioPair } from '../sync-face-json'

export default [
  {
    name: 'Product / API Documentation',
    props: {
      withLine: true,
      lineSide: 'left',
      defaultActiveId: 'authentication',
      items: [
        { id: 'overview', label: 'Overview', level: 1 },
        { id: 'authentication', label: 'Authentication', level: 1 },
        { id: 'api-keys', label: 'API keys', level: 2 },
        { id: 'errors', label: 'Errors', level: 1 },
      ],
    },
  },
  {
    name: 'Product / Long Form Report',
    props: {
      withLine: true,
      lineSide: 'right',
      defaultActiveId: 'findings',
      items: [
        { id: 'summary', label: 'Executive summary', level: 1 },
        { id: 'findings', label: 'Findings', level: 1 },
        { id: 'security', label: 'Security risks', level: 2 },
        { id: 'recommendations', label: 'Recommendations', level: 1 },
      ],
    },
  },
] satisfies ProductScenarioPair
