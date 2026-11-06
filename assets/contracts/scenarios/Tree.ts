import type { ProductScenarioPair } from '../sync-face-json'

export default [
  {
    name: 'Product / Repository Explorer',
    props: {
      'aria-label': 'Repository files',
      variant: 'lines',
      defaultExpanded: ['src', 'components'],
      defaultValue: 'agent',
      items: [
        {
          value: 'src',
          label: 'src',
          icon: 'folder',
          items: [
            {
              value: 'components',
              label: 'components',
              icon: 'folder',
              items: [
                { value: 'agent', label: 'AgentPanel.tsx', icon: 'file', meta: 'M' },
                { value: 'chat', label: 'ChatComposer.tsx', icon: 'file' },
              ],
            },
            { value: 'app', label: 'App.tsx', icon: 'file' },
          ],
        },
        { value: 'readme', label: 'README.md', icon: 'file' },
      ],
    },
  },
  {
    name: 'Product / Knowledge Base',
    props: {
      'aria-label': 'Knowledge base',
      defaultExpanded: ['company', 'engineering'],
      defaultValue: 'runbooks',
      items: [
        {
          value: 'company',
          label: 'Company wiki',
          icon: 'folder',
          items: [
            {
              value: 'policies',
              label: 'Policies',
              icon: 'folder',
              items: [
                { value: 'security-policy', label: 'Security policy', icon: 'file' },
              ],
            },
            {
              value: 'engineering',
              label: 'Engineering',
              icon: 'folder',
              items: [
                { value: 'runbooks', label: 'Runbooks', icon: 'file', meta: '8' },
                { value: 'architecture', label: 'Architecture', icon: 'file' },
                { value: 'archive', label: 'Archive', icon: 'folder', disabled: true, items: [{ value: 'old', label: '2019' }] },
              ],
            },
          ],
        },
      ],
    },
  },
] satisfies ProductScenarioPair
