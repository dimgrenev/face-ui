import { Tile } from '../../../index'

export const logicalTileIcon = <Tile icon="search" iconPosition="start" />
// @ts-expect-error Icon position follows reading direction; physical aliases were removed.
export const physicalTileIcon = <Tile iconPosition="left" />

export const tile = (
  <Tile chevron="down" aria-expanded={false} aria-busy role="button" />
)
// @ts-expect-error Tile disclosure state belongs to aria-expanded.
export const oldTileSelector = <Tile selectorOpen />
// @ts-expect-error Tile has one disclosure indicator API.
export const oldTileIndicator = <Tile selector />
// @ts-expect-error Tile visual activity has one source.
export const oldTileDescendant = <Tile selectedDescendant />
// @ts-expect-error Native aria-busy owns busy state.
export const oldTileBusy = <Tile busy />
// @ts-expect-error Row purpose does not infer a second role taxonomy.
export const oldTileIntent = <Tile intent="tab" />
// @ts-expect-error Tile owns children.
export const tileHtml = <Tile dangerouslySetInnerHTML={{ __html: 'x' }} />
// @ts-expect-error A row is not an input.
export const tileDefault = <Tile defaultValue="x" />
