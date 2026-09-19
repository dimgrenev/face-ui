import { Progress as AuditedProgress } from '../../../Progress/Progress'
import { Meter as AuditedMeter } from '../../../Meter/Meter'

// Range indicators: semantic responsibilities stay separate, naming uses native HTML.
const rangePropsProof = <><AuditedProgress value={5} max={10} label="Task" membrane={false} formatValue={({value, max}) => `${value}/${max}`} /><AuditedMeter min={-20} max={20} value={0} aria-label="Temperature" /><AuditedProgress value={null} aria-label="Task" /></>
void rangePropsProof
// @ts-expect-error native name replaces the duplicate alias
const oldProgressName = <AuditedProgress ariaLabel="Task" />
// @ts-expect-error a task starts at zero
const progressMinimum = <AuditedProgress min={1} />
// @ts-expect-error an unknown amount is value={null}
const oldUnknownProgress = <AuditedProgress indeterminate />
// @ts-expect-error measurements must be known
const unknownMeter = <AuditedMeter indeterminate />
// @ts-expect-error measurements must be known
const nullMeter = <AuditedMeter value={null} />
// @ts-expect-error semantics are owned by the component
const customMeterRole = <AuditedMeter role="progressbar" />
// @ts-expect-error numeric accessibility cannot diverge from visual value
const mismatchedProgress: import('../../../Progress/Progress').ProgressProps = { 'aria-valuenow': 99 }
// @ts-expect-error a range indicator does not accept arbitrary children
const rangeChildren = <AuditedProgress>Child</AuditedProgress>
void oldProgressName; void progressMinimum; void oldUnknownProgress; void unknownMeter; void nullMeter; void customMeterRole; void mismatchedProgress; void rangeChildren
