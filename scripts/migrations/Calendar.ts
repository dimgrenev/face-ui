import type { Migration } from './types'

// A `Date` built in code, or one serialized to a date-time string.
const legacy = String.raw`\bnew Date\b|\d{4}-\d{2}-\d{2}T\d`
const day = 'A `YYYY-MM-DD` string; a `Date` or a date-time string is invalid'
const range = '`Date`, or `{ start, end }` of `Date`'
const selection = 'A `YYYY-MM-DD` string, or `{ start, end }` of them; a `Date` or a date-time string is invalid'

export default [
  { kind: 'retype-prop', component: 'Calendar', prop: 'value', before: range, after: selection, codemod: 'manual', legacy },
  { kind: 'retype-prop', component: 'Calendar', prop: 'defaultValue', before: range, after: selection, codemod: 'manual', legacy },
  { kind: 'retype-prop', component: 'Calendar', prop: 'min', before: '`Date`', after: day, codemod: 'manual', legacy },
  { kind: 'retype-prop', component: 'Calendar', prop: 'max', before: '`Date`', after: day, codemod: 'manual', legacy },
  {
    kind: 'retype-prop',
    component: 'Calendar',
    prop: 'disabledDates',
    before: '`Date[]`',
    after: '`YYYY-MM-DD` strings',
    codemod: 'manual',
    legacy,
  },
  {
    kind: 'retype-prop',
    component: 'Calendar',
    prop: 'onValueChange',
    before: '`details.value` was a `Date` or a range of them',
    after: '`details.value` is a `YYYY-MM-DD` string or a range of them',
    codemod: 'manual',
  },
  {
    kind: 'behavior',
    component: 'Calendar',
    before: '`weekStartsOn` defaulted to 0 (Sunday)',
    after: 'The first weekday follows `locale`; set `weekStartsOn` to pin it',
  },
  {
    kind: 'behavior',
    component: 'Calendar',
    before: 'An unreadable `value`, `defaultValue`, `viewDate`, `defaultViewDate`, `min`, `max`, `disabledDates`, `locale` or `weekStartsOn` threw during render',
    after: 'The calendar renders without it and reports it once in development; a day given for a range, or a range for a day, is projected silently',
  },
] satisfies Migration[]
