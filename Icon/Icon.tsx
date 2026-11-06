/**
 * Icon — Face UI icon renderer.
 *
 * Public wrapper around the local Iconoteka runtime with stable Face UI aliases.
 * The default renderer keeps 20x20 boxes; IconProvider lets a host supply its
 * existing icon library to this entry point and to nested control icons.
 */

export {
  Icon,
  IconProvider,
  ICON_NAMES,
} from '../assets/Icon'

export { Icon as default } from '../assets/Icon'

export type {
  IconName,
  IconProps,
  IconProviderProps,
  IconRenderer,
} from '../assets/Icon'
