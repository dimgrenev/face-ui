import { Tree, type TreeItem, type TreeRenderNodeDetails } from '../../../Tree/Tree'

// Items nest through `items`; labels and meta take rich content, icons a registry name or a node.
const files: readonly TreeItem[] = [
  {
    value: 'src',
    label: 'src',
    icon: 'folder',
    items: [{ value: 'app', label: <em>App.tsx</em>, textValue: 'App.tsx', meta: 'M', disabled: true }],
  },
]
const renderNode = ({ item, expanded, selected }: TreeRenderNodeDetails) => (
  <span data-selected={selected}>
    {expanded ? 'open' : 'closed'} {item.label}
  </span>
)
export const tree = (
  <Tree
    items={files}
    value={null}
    defaultValue="app"
    onValueChange={({ value }) => {
      const key: string = value
      return key
    }}
    expanded={['src']}
    defaultExpanded={[]}
    onExpandedChange={({ expanded }) => {
      const keys: string[] = expanded
      keys.push('mutable copy')
    }}
    renderNode={renderNode}
    variant="lines"
    aria-label="Files"
    aria-labelledby="files-heading"
    id="files"
    dir="rtl"
    style={{ width: 240 }}
    onKeyDown={(event) => event.preventDefault()}
    ref={(node) => {
      const element: HTMLDivElement | null = node
      return void element
    }}
  />
)

// @ts-expect-error The selection is value; selectedId was renamed.
export const legacySelectedId = <Tree selectedId="a" />
// @ts-expect-error defaultSelectedId was renamed to defaultValue.
export const legacyDefaultSelectedId = <Tree defaultSelectedId="a" />
// @ts-expect-error onSelectedChange was renamed to onValueChange.
export const legacyOnSelectedChange = <Tree onSelectedChange={() => {}} />
// @ts-expect-error Expansion is expanded; expandedIds was renamed.
export const legacyExpandedIds = <Tree expandedIds={['a']} />
// @ts-expect-error defaultExpandedIds was renamed to defaultExpanded.
export const legacyDefaultExpandedIds = <Tree defaultExpandedIds={['a']} />
// @ts-expect-error The payload key matches the prop: details.expanded.
export const legacyExpandedPayload = <Tree onExpandedChange={({ expandedIds }) => expandedIds} />
// @ts-expect-error Items are keyed by value, not id.
export const legacyItemId = <Tree items={[{ id: 'a', label: 'A' }]} />
// @ts-expect-error Nested items live in items, not children.
export const legacyChildren = <Tree items={[{ value: 'a', label: 'A', children: [] }]} />
// @ts-expect-error Trailing text is meta.
export const legacyRightText = <Tree items={[{ value: 'a', label: 'A', rightText: '3' }]} />
// @ts-expect-error Rows have one look per tree: variant.
export const legacyKind = <Tree items={[{ value: 'a', label: 'A', kind: 'tile' }]} />
// @ts-expect-error Rich row content goes in label.
export const legacyContent = <Tree items={[{ value: 'a', label: 'A', content: 'Custom' }]} />
// @ts-expect-error One render function, renderNode on the Tree.
export const legacyRender = <Tree items={[{ value: 'a', label: 'A', render: () => null }]} />
// @ts-expect-error A tree item cannot hold controls.
export const legacyActions = <Tree items={[{ value: 'a', label: 'A', actions: <button /> }]} />
// @ts-expect-error renderNode details carry item, not node.
export const legacyRenderDetails = <Tree renderNode={({ node }) => node} />
// @ts-expect-error The tile look is gone; variant is default or lines.
export const wrongVariant = <Tree variant="tile" />
// @ts-expect-error Tree owns its tree role.
export const wrongRole = <Tree role="list" />
// @ts-expect-error Items are data; the tree has no children.
export const wrongChildren = <Tree>Files</Tree>
// @ts-expect-error The item type is TreeItem.
export type LegacyTreeNode = import('../../../Tree/Tree').TreeNode
