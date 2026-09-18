import type { ProductScenarioPair } from '../sync-face-json'

export default [
  {
    name: 'Product / Workspace Header',
    props: {
      orientation: 'horizontal',
      children: [
        { __componentName__: 'Text', children: 'Acme Workspace', truncate: true },
        {
          __componentName__: 'Bar.Section',
          align: 'end',
          children: [
            {
              __componentName__: 'Button',
              children: 'Invite',
              icon: 'plus',
              fullWidth: false,
            },
          ],
        },
      ],
    },
  },
  {
    name: 'Product / AI Composer Tools',
    props: {
      orientation: 'horizontal',
      children: [
        {
          __componentName__: 'Button',
          icon: 'plus',
          iconOnly: true,
          fullWidth: false,
          'aria-label': 'Attach file',
        },
        {
          __componentName__: 'Text',
          children: 'Agent mode',
          variant: 'muted',
          truncate: true,
        },
        {
          __componentName__: 'Bar.Section',
          align: 'end',
          children: [
            {
              __componentName__: 'Button',
              children: 'Run',
              variant: 'accent',
              fullWidth: false,
            },
          ],
        },
      ],
    },
  },
] satisfies ProductScenarioPair
