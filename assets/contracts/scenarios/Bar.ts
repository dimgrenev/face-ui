import type { ProductScenarioPair } from '../sync-face-json'

export default [
  {
    name: 'Product / Workspace Header',
    props: {
      orientation: 'horizontal',
      children: [
        { __componentName__: 'Text', text: 'Acme Workspace', truncate: true },
        {
          __componentName__: 'Bar.Section',
          align: 'end',
          children: [
            {
              __componentName__: 'Button',
              text: 'Invite',
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
          text: 'Agent mode',
          variant: 'muted',
          truncate: true,
        },
        {
          __componentName__: 'Bar.Section',
          align: 'end',
          children: [
            {
              __componentName__: 'Button',
              text: 'Run',
              variant: 'accent',
              fullWidth: false,
            },
          ],
        },
      ],
    },
  },
] satisfies ProductScenarioPair
