import { Bar } from '../../../index'

export const bar = (
  <Bar>
    {[
      { __componentName__: 'Text', children: 'Workspace' },
      {
        __componentName__: 'Bar.Section',
        align: 'end',
        children: [{ __componentName__: 'Button', children: 'Run' }],
      },
    ]}
  </Bar>
)

export const barSection = (
  <Bar.Section grow align="end">
    Content
  </Bar.Section>
)
// @ts-expect-error Sections render normally; marker-only parts were removed.
export const oldBarRight = <Bar.Right />
// @ts-expect-error Overlap is no longer a second Bar composition model.
export const oldBarOverlap = <Bar.LeftOverlap />
