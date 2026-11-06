import { createRef } from 'react'
import { Separator } from '../../../index'

export const separator = <Separator />
export const toolbarDivider = <Separator orientation="vertical" />
export const sectionBreak = <Separator decorative={false} membrane={false} />
// A window splitter: focus, value and keys are native attributes of the line.
export const splitter = (
  <Separator
    ref={createRef<HTMLDivElement>()}
    orientation="vertical"
    decorative={false}
    tabIndex={0}
    aria-label="Resize sidebar"
    aria-controls="sidebar"
    aria-valuenow={240}
    onKeyDown={(event) => event.currentTarget.focus()}
  />
)
// @ts-expect-error A separator is a horizontal or a vertical line.
export const diagonal = <Separator orientation="diagonal" />
// @ts-expect-error The role follows decorative.
export const role = <Separator role="separator" />
// @ts-expect-error A line has no content.
export const children = <Separator>or</Separator>
// @ts-expect-error A line has no content.
export const html = <Separator dangerouslySetInnerHTML={{ __html: 'or' }} />
// @ts-expect-error A line holds no value.
export const value = <Separator defaultValue="or" />
