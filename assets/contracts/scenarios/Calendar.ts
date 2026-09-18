import type { ProductScenarioPair } from '../sync-face-json'

export default [
  {
    name: 'Product / Booking Range',
    props: {
      selection: 'range',
      defaultValue: { start: '2026-07-14', end: '2026-07-18' },
      min: '2026-07-01',
      max: '2026-08-31',
      locale: 'en-US',
      weekStartsOn: 1,
    },
  },
  {
    name: 'Product / Release Deadline',
    props: {
      selection: 'single',
      defaultValue: '2026-09-30',
      disabledDates: ['2026-09-26', '2026-09-27'],
      locale: 'en-GB',
      weekStartsOn: 1,
    },
  },
] satisfies ProductScenarioPair
