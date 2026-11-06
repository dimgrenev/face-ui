import { Overlay } from '../../../Overlay/Overlay'

;<Overlay openOn="hover" interactive openDelay={80} closeDelay={40} content="Details">Trigger</Overlay>
;<Overlay openOn="click" defaultOpen content="Details">Trigger</Overlay>
// @ts-expect-error Click compatibility overlay does not have hover-only options.
;<Overlay openOn="click" openDelay={20} />
// @ts-expect-error Click compatibility overlay does not have hover-only options.
;<Overlay openOn="click" interactive />
// @ts-expect-error The interaction mode is openOn; trigger was renamed.
;<Overlay trigger="click" />
