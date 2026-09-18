import { Icon } from '../../../index'

// @ts-expect-error Icon has fixed design-system geometry.
export const iconWidth = <Icon name="user" style={{ width: 48 }} />
