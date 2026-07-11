/**
 * Icon — Face UI icon renderer.
 *
 * Public component wrapper around the shared icon runtime.
 * All rendered icon boxes are 20x20. Unsupported external/custom sources
 * intentionally render the Face UI notdef icon.
 */

export {
  Icon,
  ICON_NAMES,
} from '../assets/Icon'

export { Icon as default } from '../assets/Icon'

export type {
  IconName,
  IconProps,
} from '../assets/Icon'
