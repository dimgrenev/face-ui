export type CardVariant = 'default' | 'code' | 'plain'
export type CardPadding = 'none' | 'membrane' | 'control' | 'default'
export type CardRadius = 'none' | 'md' | 'lg'

/** Shared style inputs; Card owns its DOM and shorthand content props. */
export interface CardSurfaceOptions {
  variant: CardVariant
  padding: CardPadding
  radius: CardRadius
  border: boolean
  hoverable: boolean
  fullWidth: boolean
}
