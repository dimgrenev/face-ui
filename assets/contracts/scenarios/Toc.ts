import type { ProductScenarioPair } from '../sync-face-json'

export default [
  {
    name: 'Product / API Documentation',
    props: {
      line: 'start',
      defaultValue: 'authentication',
      items: [
        { value: 'overview', label: 'Overview', level: 1 },
        { value: 'authentication', label: 'Authentication', level: 1 },
        { value: 'api-keys', label: 'API keys', level: 2 },
        { value: 'errors', label: 'Errors', level: 1 },
      ],
    },
  },
  {
    name: 'Product / Long Form Report',
    props: {
      line: 'end',
      defaultValue: 'findings',
      items: [
        { value: 'summary', label: 'Executive summary', level: 1 },
        { value: 'findings', label: 'Findings', level: 1 },
        { value: 'security', label: 'Security risks', level: 2 },
        { value: 'recommendations', label: 'Recommendations', level: 1 },
      ],
    },
  },
] satisfies ProductScenarioPair
