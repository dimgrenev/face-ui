import { Tooltip } from '../../../Tooltip/Tooltip'

;<Tooltip defaultOpen openDelay={0} closeDelay={50} dir="auto" content="Hint" title="Native title" style={{ opacity: 0.5 }}><span>Term</span></Tooltip>
// @ts-expect-error Tooltip content is informational; choose Popover for actions.
;<Tooltip interactive />
// @ts-expect-error Tooltip has fixed hover/focus behavior.
;<Tooltip trigger="click" />
// @ts-expect-error Floating components own their focus behavior.
;<Tooltip tabIndex={0} />
