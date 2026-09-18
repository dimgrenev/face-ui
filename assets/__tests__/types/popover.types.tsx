import { Popover } from '../../../Popover/Popover'

;<Popover defaultOpen side="right" align="end" sideOffset={8} aria-label="Details" content={<button>Action</button>}><button>Open</button></Popover>
// @ts-expect-error Click opening has no hover delay.
;<Popover openDelay={50} />
// @ts-expect-error Click closing has no hover delay.
;<Popover closeDelay={50} />
// @ts-expect-error Popover is always interactive.
;<Popover interactive />
// @ts-expect-error Floating components own their semantic role.
;<Popover role="tooltip" />
// @ts-expect-error Floating components own their focus behavior.
;<Popover autoFocus />
// @ts-expect-error Content is a React slot, not raw HTML.
;<Popover dangerouslySetInnerHTML={{ __html: 'Help' }} />
// @ts-expect-error Native popover lifecycle conflicts with controlled floating visibility.
;<Popover popover="auto" />
