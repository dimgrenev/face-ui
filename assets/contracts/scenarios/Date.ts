import type { ProductScenarioPair } from '../sync-face-json'

export default [
  {
    name: 'Product / Schedule Campaign',
    props: {
      mode: 'datetime',
      selection: 'single',
      defaultValue: '2026-08-12T09:30:00.000Z',
      valueFormat: 'iso',
      locale: 'en-US',
      timezone: 'UTC',
      label: 'Launch time',
      placeholder: 'Choose date and time',
      surface: 'popover',
      showNow: true,
      showClear: true,
      membrane: true,
      fullWidth: true,
    },
  },
  {
    name: 'Product / Analytics Period',
    props: {
      mode: 'date',
      selection: 'range',
      defaultValue: { start: '2026-07-01', end: '2026-07-31' },
      valueFormat: 'iso',
      locale: 'en-GB',
      weekStartsOn: 1,
      label: 'Reporting period',
      surface: 'sheet',
      presets: [
        {
          id: 'july-2026',
          label: 'July 2026',
          value: { start: '2026-07-01', end: '2026-07-31' },
        },
        {
          id: 'q3-2026',
          label: 'Q3 2026',
          value: { start: '2026-07-01', end: '2026-09-30' },
        },
      ],
      showNow: false,
      showClear: true,
    },
  },
] satisfies ProductScenarioPair
