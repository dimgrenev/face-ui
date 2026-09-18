import { Tabs as AuditedTabs, type TabItem as AuditedTabItem } from '../../../Tabs/Tabs'

// Tabs: internal panels and external ownership are distinct contracts.
const readonlyTabs: readonly AuditedTabItem[] = [{ value: '', label: 'Empty', content: <input /> }]
;<AuditedTabs items={readonlyTabs} variant="underline" aria-label="Editor" actions={<button>New</button>} />
;<AuditedTabs renderPanels={false} items={[{value:'a',label:'A',panelId:'external'}]} />
// @ts-expect-error External panels require an explicit existing ID.
;<AuditedTabs renderPanels={false} items={[{value:'a',label:'A'}]} />
// @ts-expect-error External content cannot be supplied and silently ignored.
;<AuditedTabs renderPanels={false} items={[{value:'a',label:'A',panelId:'external',content:null}]} />
// @ts-expect-error The visual style is one variant, not an independent line flag.
;<AuditedTabs withLine />
// @ts-expect-error Per-item overlay actions have been replaced by a composed header slot.
;<AuditedTabs items={[{value:'a',label:'A',actionIcon:'close'}]} />
// @ts-expect-error Tabs values are stable string keys, not arrays.
;<AuditedTabs value={['a']} />
// @ts-expect-error The component owns its children and panel structure.
;<AuditedTabs children={<div/>} />
