import { Overlay } from '../../../Overlay/Overlay'

;<Overlay trigger="hover" interactive openDelay={80} closeDelay={40} content="Details">Trigger</Overlay>
;<Overlay trigger="click" defaultOpen content="Details">Trigger</Overlay>
// @ts-expect-error Click compatibility overlay does not have hover-only options.
;<Overlay trigger="click" openDelay={20} />
// @ts-expect-error Click compatibility overlay does not have hover-only options.
;<Overlay trigger="click" interactive />
