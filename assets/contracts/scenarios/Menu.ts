import type { ProductScenarioPair } from '../sync-face-json'

export default [
  {
    name: 'Product / Account Menu',
    props: {
      children: 'Account',
      surface: 'popover',
      align: 'end',
      sideOffset: 4,
      'aria-label': 'Account actions',
      items: [
        { value: 'profile', label: 'Profile settings', icon: 'user' },
        { value: 'billing', label: 'Billing' },
        { value: 'help', label: 'Help center', href: '#help' },
        { type: 'separator' },
        { value: 'logout', label: 'Sign out', tone: 'destructive' },
      ],
    },
  },
  {
    name: 'Product / Canvas Context Menu',
    props: {
      openOn: 'context',
      children: 'Right-click canvas',
      surface: 'popover',
      items: [
        { value: 'duplicate', label: 'Duplicate', icon: 'copy' },
        { value: 'rename', label: 'Rename', icon: 'edit' },
        { type: 'separator' },
        {
          type: 'group',
          label: 'View',
          items: [
            { value: 'grid', label: 'Snap to grid', checked: true },
            { value: 'rulers', label: 'Rulers', checked: false },
          ],
        },
        { type: 'separator' },
        { value: 'archive', label: 'Archive', tone: 'destructive' },
      ],
    },
  },
] satisfies ProductScenarioPair
