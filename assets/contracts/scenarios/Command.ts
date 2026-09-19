import type { ProductScenarioPair } from '../sync-face-json'

export default [
  {
    name: 'Product / AI Command Palette',
    props: {
      surface: 'inline',
      'aria-label': 'Commands',
      placeholder: 'Ask or run a command...',
      items: [
        {
          type: 'group',
          label: 'Create',
          items: [
            {
              value: 'new-agent',
              label: 'Create a new agent',
              icon: 'plus',
              keywords: ['assistant', 'bot'],
            },
            {
              value: 'new-workflow',
              label: 'Create workflow',
              keywords: ['automation'],
            },
          ],
        },
        {
          type: 'group',
          label: 'Navigate',
          items: [
            {
              value: 'settings',
              label: 'Open settings',
              icon: 'settings',
              keywords: ['preferences'],
            },
          ],
        },
      ],
      labels: { empty: 'No matching commands.' },
    },
  },
  {
    name: 'Product / Documentation Search',
    props: {
      surface: 'dialog',
      defaultOpen: true,
      'aria-label': 'Search documentation',
      placeholder: 'Search documentation...',
      defaultSearch: 'auth',
      items: [
        { value: 'oauth', label: 'OAuth setup', keywords: ['auth', 'login'] },
        { value: 'sso', label: 'Enterprise SSO', keywords: ['auth', 'saml'] },
        { value: 'tokens', label: 'API tokens', keywords: ['auth', 'key'] },
      ],
    },
  },
] satisfies ProductScenarioPair
