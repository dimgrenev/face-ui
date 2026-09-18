import type { ProductScenarioPair } from '../sync-face-json'

export default [
  {
    name: 'Product / Repository Explorer',
    props: {
      defaultExpandedIds: ['src', 'components'],
      defaultSelectedId: 'agent',
      items: [
        {
          id: 'src',
          label: 'src',
          icon: 'folder',
          children: [
            {
              id: 'components',
              label: 'components',
              icon: 'folder',
              kind: 'tile',
              children: [
                { id: 'agent', label: 'AgentPanel.tsx', icon: 'file' },
                { id: 'chat', label: 'ChatComposer.tsx', icon: 'file' },
              ],
            },
            { id: 'app', label: 'App.tsx', icon: 'file' },
          ],
        },
        { id: 'readme', label: 'README.md', icon: 'file' },
      ],
    },
  },
  {
    name: 'Product / Knowledge Base',
    props: {
      defaultExpandedIds: ['company', 'engineering'],
      defaultSelectedId: 'runbooks',
      items: [
        {
          id: 'company',
          label: 'Company wiki',
          icon: 'folder',
          kind: 'tile',
          children: [
            {
              id: 'policies',
              label: 'Policies',
              icon: 'folder',
              children: [
                {
                  id: 'security-policy',
                  label: 'Security policy',
                  icon: 'file',
                },
              ],
            },
            {
              id: 'engineering',
              label: 'Engineering',
              icon: 'folder',
              children: [
                {
                  id: 'runbooks',
                  label: 'Runbooks',
                  icon: 'file',
                  rightText: '8',
                },
                { id: 'architecture', label: 'Architecture', icon: 'file' },
              ],
            },
          ],
        },
      ],
    },
  },
] satisfies ProductScenarioPair
