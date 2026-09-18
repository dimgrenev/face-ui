import type { ProductScenarioPair } from '../sync-face-json'

export default [
  {
    name: 'Product / AI Command Palette',
    props: {
      surface: 'inline',
      placeholder: 'Ask or run a command...',
      defaultValue: '',
      groups: [
        { id: 'create', label: 'Create' },
        { id: 'navigate', label: 'Navigate' },
      ],
      items: [
        {
          id: 'new-agent',
          label: 'Create a new agent',
          keywords: ['assistant', 'bot'],
          group: 'create',
        },
        {
          id: 'new-workflow',
          label: 'Create workflow',
          keywords: ['automation'],
          group: 'create',
        },
        {
          id: 'settings',
          label: 'Open settings',
          keywords: ['preferences'],
          group: 'navigate',
        },
      ],
      emptyContent: 'No matching commands.',
    },
  },
  {
    name: 'Product / Documentation Search',
    props: {
      surface: 'dialog',
      defaultOpen: true,
      placeholder: 'Search documentation...',
      defaultValue: 'auth',
      items: [
        { id: 'oauth', label: 'OAuth setup', keywords: ['auth', 'login'] },
        { id: 'sso', label: 'Enterprise SSO', keywords: ['auth', 'saml'] },
        { id: 'tokens', label: 'API tokens', keywords: ['auth', 'key'] },
      ],
    },
  },
] satisfies ProductScenarioPair
