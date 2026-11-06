import { Input } from '../../../index'

export const logicalInputIcon = <Input icon="search" iconPosition="end" />
// @ts-expect-error Icon position follows reading direction; physical aliases were removed.
export const physicalInputIcon = <Input iconPosition="right" />

export const nativeFields = <>
  <Input type="email" multiple autoComplete="email" aria-label="Email" inputMode="email" form="settings" />
  <Input multiline rows={4} autoGrow={false} ref={node => node?.focus()} aria-describedby="help" />
  <Input type="date" min="2026-01-01" max="2026-12-31" />
</>
// @ts-expect-error multiline is the native textarea mode
export const obsoleteInputLayout = <Input textLayout="wrap" />
// @ts-expect-error use native aria-label
export const obsoleteInputAria = <Input ariaLabel="Name" />
// @ts-expect-error ordinary ref targets the native control
export const obsoleteInputRef = <Input controlRef={() => {}} />
// @ts-expect-error stretchText had no observable behavior
export const obsoleteInputStretch = <Input stretchText />
// @ts-expect-error textarea has no numeric/date input type
export const incompatibleInputMode = <Input multiline type="number" />
// @ts-expect-error rows only size multiline fields
export const incompatibleInputRows = <Input rows={4} />
// @ts-expect-error autoGrow only sizes multiline fields
export const incompatibleInputGrowth = <Input autoGrow />
// @ts-expect-error textarea has no pattern validation
export const incompatibleInputPattern = <Input multiline pattern="[A-Z]+" />

export const fieldInput = <Input label="Name" labelPosition="start" labels={{ clear: 'Очистить' }} fullWidth={false} membrane={false} />
// @ts-expect-error the clear button's name lives in labels.clear
export const obsoleteInputClearLabel = <Input clearLabel="Clear" />
// @ts-expect-error labelPosition replaces labelOrientation
export const obsoleteInputLabelOrientation = <Input labelOrientation="horizontal" />
// @ts-expect-error labelPosition is top or start
export const physicalInputLabelPosition = <Input labelPosition="left" />
