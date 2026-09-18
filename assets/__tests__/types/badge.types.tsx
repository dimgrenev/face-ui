import { Badge } from '../../../index'

// @ts-expect-error Badge is a span, not an input.
export const badgeDefault = <Badge defaultValue="Ready" />
