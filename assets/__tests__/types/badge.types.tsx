import { Badge } from '../../../index'

// @ts-expect-error Badge is a span, not an input.
export const badgeDefault = <Badge defaultValue="Ready" />
export const badge = <Badge variant="fill" tone="positive">Ready</Badge>
// @ts-expect-error The fill or outline treatment is variant.
export const badgeAppearance = <Badge appearance="fill" />
// @ts-expect-error Content is children; the text prop was removed.
export const badgeText = <Badge text="Ready" />
