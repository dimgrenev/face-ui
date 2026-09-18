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
export const nestedTile = <Tile indent={1} meta="12" chevron="end" align="start">Project</Tile>
// @ts-expect-error Content is children; the text prop was removed.
export const tileText = <Tile text="Project" />
// @ts-expect-error Secondary text is meta.
export const tileRightText = <Tile rightText="12" />
// @ts-expect-error Nesting is indent; level belongs to Toc.
export const tileLevel = <Tile level={1} />
// @ts-expect-error The side chevron points to the inline end.
export const tileChevronRight = <Tile chevron="right" />
// @ts-expect-error Alignment follows reading direction: start, center or end.
export const tileAlignRight = <Tile align="right" />
