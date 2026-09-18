import { SegmentedControl } from '../../../SegmentedControl/SegmentedControl'
import { Toggle } from '../../../Toggle/Toggle'

// SegmentedControl preserves single/multiple value contracts and readonly items.
const segmentedChoices = [{ value: '', label: 'None' }, { value: 'a', label: 'A' }] as const
;<SegmentedControl items={segmentedChoices} value="" name="view" form="settings" aria-label="View" onValueChange={({value}) => { const choice: string | null = value; void choice }} />
;<SegmentedControl multiple items={segmentedChoices} value={['a'] as const} onValueChange={({value}) => { const choices: readonly string[] = value; void choices }} />
;<Toggle items={segmentedChoices} type="single" value={['a'] as const} aria-label="Legacy view" />
// @ts-expect-error a single choice is a string or null
;<SegmentedControl value={['a']} />
// @ts-expect-error multiple choices require an array
;<SegmentedControl multiple value="a" />
// @ts-expect-error no value is an empty array in multiple mode
;<SegmentedControl multiple value={null} />
// @ts-expect-error use multiple, not the removed duplicate mode name
;<SegmentedControl selectionMode="multiple" />
// @ts-expect-error use native aria-label
;<SegmentedControl ariaLabel="View" />
// @ts-expect-error item roles and checked state are component-owned
;<SegmentedControl items={[{value:'a',label:'A',role:'link'}]} />
// @ts-expect-error use Radio or Select for required native validation
;<SegmentedControl required />
