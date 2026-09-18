import type { ProductScenarioPair } from '../sync-face-json'

export default [
  {
    name: 'Product / Account Menu',
    props: {
      trigger: 'click',
      children: 'Account',
      surface: 'popover',
      align: 'end',
      sideOffset: 4,
      surfaceTitle: 'Account actions',
      items: [
        { value: 'profile', label: 'Profile settings' },
        { value: 'billing', label: 'Billing' },
        { type: 'separator' },
        { value: 'logout', label: 'Sign out' },
      ],
    },
  },
  {
    name: 'Product / Canvas Context Menu',
    props: {
      trigger: 'context',
      children: 'Right-click canvas',
      surface: 'popover',
      align: 'start',
      sideOffset: 2,
      items: [
        { value: 'duplicate', label: 'Duplicate' },
        { value: 'rename', label: 'Rename' },
        { value: 'archive', label: 'Archive' },
      ],
    },
  },
] satisfies ProductScenarioPair
