import {
  Slider as AuditedSlider,
  type SliderProps,
  type SliderFormatDetails,
  type SliderValueDetails,
  type SliderCropRange,
} from '../../../Slider/Slider'

const sliderFormatter = ({ value, kind }: SliderFormatDetails) => `${kind}: ${value}%`
;<AuditedSlider value={[20, 80] as const} labels={{ thumbs: ['Min', 'Max'] }} formatValue={sliderFormatter} showValue />
;<AuditedSlider name="axis" form="settings" crop cropName="clip" clampToCrop={false} autoFocus membrane={false} dir="rtl" />
;<AuditedSlider onValueChange={(_value: SliderValueDetails) => {}} onValueCommit={(_value: SliderValueDetails) => {}} onCropCommit={(_range: SliderCropRange) => {}} />
// @ts-expect-error one behavior model, explicit value presentation
;<AuditedSlider variant="advanced" />
// @ts-expect-error crop constraint has an explicit name
;<AuditedSlider cropLocksValue />
// @ts-expect-error compose rich label or adjacent content
;<AuditedSlider leadingIcon="size" />
// @ts-expect-error duplicated labels removed
;<AuditedSlider leadingText="Size" />
// @ts-expect-error a native range always has a value; required adds no behavior
;<AuditedSlider required />
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
// @ts-expect-error a native range always has a value; required does not apply to its group
;<AuditedSlider {...({ 'aria-required': true } satisfies SliderProps)} />
