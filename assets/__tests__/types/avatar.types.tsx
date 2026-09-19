import { Avatar, Icon } from '../../../index'

export const avatar = (
  <Avatar
    name="Ada Lovelace"
    fallback={<Icon name="user" />}
    aria-label="Project owner"
    className="person"
    style={{ color: 'red' }}
  />
)
export const avatarDelay = <Avatar src="/ada.png" name="Ada" fallbackDelay={150} />
// @ts-expect-error Milliseconds carry no suffix: the delay is `fallbackDelay`.
export const avatarDelayMs = <Avatar fallbackDelayMs={150} />
// @ts-expect-error Avatar has one custom fallback slot; icon is not a second owner.
export const avatarIcon = <Avatar icon="user" />
// @ts-expect-error Arbitrary child content must be passed to the fallback slot.
export const avatarChildren = <Avatar>AL</Avatar>
// @ts-expect-error The image/fallback DOM is owned by Avatar.
export const avatarHtml = <Avatar dangerouslySetInnerHTML={{ __html: 'AL' }} />
// @ts-expect-error Native input defaults have no meaning on an avatar span.
export const avatarChecked = <Avatar defaultChecked />
