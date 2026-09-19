import { useState } from 'react'
import {
  Slider as AuditedSlider,
  type SliderProps,
  type SliderFormatDetails,
  type SliderValueDetails,
  type SliderCropRangeDetails,
} from '../../../Slider/Slider'

const sliderFormatter = ({ value, kind }: SliderFormatDetails) => `${kind}: ${value}%`
;<AuditedSlider value={[20, 80] as const} labels={{ thumbs: ['Min', 'Max'] }} formatValue={sliderFormatter} showValue />
;<AuditedSlider name="axis" form="settings" crop cropName="clip" clampToCrop={false} autoFocus membrane={false} dir="rtl" />
;<AuditedSlider label="Level" description="Help" error="Too high" labelPosition="start" required />
;<AuditedSlider onValueChange={(_value: SliderValueDetails) => {}} onValueCommit={(_value: SliderValueDetails) => {}} />
// The callbacks answer in the shape of the value (K24).
;<AuditedSlider value={5} onValueChange={({ value }) => value.toFixed()} onValueCommit={({ value }) => value.toFixed()} />
;<AuditedSlider defaultValue={[1, 2]} onValueChange={({ value }) => value.map(String)} />
;<AuditedSlider onValueChange={({ value }) => value.toFixed()} />
function Either() {
  const [value, setValue] = useState<number | number[]>(5)
  return <AuditedSlider value={value} onValueChange={(details) => setValue(details.value)} />
}
void Either
const shared: SliderProps = {}
;<AuditedSlider {...shared} onValueChange={({ value }: SliderValueDetails<number | number[]>) => value} />
// @ts-expect-error a number value never reports an array
;<AuditedSlider value={5} onValueChange={(_details: SliderValueDetails<number[]>) => {}} />
// @ts-expect-error an array value never reports a number
;<AuditedSlider defaultValue={[5]} onValueChange={({ value }) => value.toFixed()} />
// Crop boundaries are start/end (K23) and report through the cropRange state (K1).
;<AuditedSlider crop defaultCropRange={{ start: 20, end: 80 }} onCropRangeChange={({ cropRange }) => cropRange.start} onCropRangeCommit={(_details: SliderCropRangeDetails) => {}} />
// @ts-expect-error min/max name the scale; crop boundaries are start/end
;<AuditedSlider cropRange={{ min: 20, max: 80 }} />
// @ts-expect-error crop callbacks are named after the cropRange state
;<AuditedSlider onCropChange={() => {}} />
// @ts-expect-error one behavior model, explicit value presentation
;<AuditedSlider variant="advanced" />
// @ts-expect-error crop constraint has an explicit name
;<AuditedSlider cropLocksValue />
// @ts-expect-error compose rich label or adjacent content
;<AuditedSlider leadingIcon="size" />
// @ts-expect-error duplicated labels removed
;<AuditedSlider leadingText="Size" />
// @ts-expect-error range readonly is a browser no-op
;<AuditedSlider readOnly />
// @ts-expect-error Slider owns its control composition
;<AuditedSlider>Child</AuditedSlider>
// @ts-expect-error one native slider role per control, group root is owned
;<AuditedSlider role="slider" />
// @ts-expect-error accessible numeric values come from the value model
;<AuditedSlider {...({ 'aria-valuenow': 2 } satisfies SliderProps)} />
// @ts-expect-error readonly is not an editing mode of Slider or an ARIA group property
;<AuditedSlider {...({ 'aria-readonly': true } satisfies SliderProps)} />
// @ts-expect-error a native range always has a value; aria-required does not apply to its group
;<AuditedSlider {...({ 'aria-required': true } satisfies SliderProps)} />
