import { Icon } from '../../../index'

// @ts-expect-error Icon has fixed design-system geometry.
export const iconWidth = <Icon name="user" style={{ width: 48 }} />
export const namedIcon = <Icon name="user" aria-label="Account" />
// @ts-expect-error The accessible name is the native aria-label.
export const iconLabel = <Icon name="user" label="Account" />
