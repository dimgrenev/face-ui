import { createRoot } from 'react-dom/client'
import { Card } from '../../../../Card/Card'
import { Button } from '../../../../Button/Button'
import { Text } from '../../../../Text/Text'
import { Menu } from '../../../../Menu/Menu'
import { Select } from '../../../../Select/Select'
import { Date as DateField } from '../../../../Date/Date'
import { Popover } from '../../../../Popover/Popover'
import { Navigation } from '../../../../Navigation/Navigation'

const root = createRoot(document.getElementById('root')!)
document.documentElement.setAttribute('data-uf-surface-geometry', 'stable')
Object.assign(document.body.style, { margin: '0', fontFamily: 'var(--uf-font-family-base)' })
root.render(<>
  <style>{`
    :root {--uf-control-height:28px;--uf-control-pad-y:4px;--uf-control-pad-icon:4px;--uf-control-pad-text:6px}
    #stage {padding:20px;display:flex;gap:10px;align-items:start}
    .owned {--uf-surface-pad-block:3px;--uf-surface-pad-inline:3px}
    #fixed {height:38px}
    .test-row {display:flex;align-items:center;box-sizing:border-box;height:28px;width:140px}
    #sent {--uf-surface-pad-top:13px;--uf-surface-pad-bottom:17px;--uf-surface-border-width:4px;--uf-surface-border-color:red}
    #positioned {position:fixed;top:100px;left:600px}
    #manual {--uf-surface-border-width:1px;--uf-surface-border-color:rgb(10,20,30);--uf-surface-pad-block:3px;--uf-surface-pad-inline:5px}
    #popups {position:fixed;top:300px;left:20px;display:flex;align-items:start;gap:20px}
    #popups > * {max-width:200px}
    .uf-menu-contentPanel, .uf-select__contentPanel, .uf-date__contentPanel, .uf-overlay-content, .uf-navigation-content {
      --uf-surface-pad-block:3px;--uf-surface-pad-inline:3px;
    }
  `}</style>
  <main id="stage">
    <Card id="fixed" className="uf-surface-stable owned" padding="none" fullWidth={false}>
      <Button className="test-row" fullWidth={false}>Fixed row</Button>
    </Card>
    <Card id="auto" className="uf-surface-stable owned" padding="none" fullWidth={false}>
      <Button className="test-row" fullWidth={false}>Auto row</Button>
    </Card>
    {(['none', 'membrane', 'control', 'default'] as const).map(padding => <Card key={padding} id={`variant-${padding}`} className="uf-surface-stable" padding={padding} fullWidth={false}>
      <Text membrane={false} inset="none">Variant</Text>
    </Card>)}
  </main>
  <Card id="sent" className="uf-surface-stable owned" padding="none">
    <Card id="nested" className="uf-surface-stable" padding="control" fullWidth={false}><Button>Nested action</Button></Card>
    <Card id="no-border" className="uf-surface-stable owned" padding="none" border={false} fullWidth={false}>No border</Card>
  </Card>
  <Card id="positioned" className="uf-surface-stable owned" padding="none" fullWidth={false}><Button>Positioned action</Button></Card>
  <Card id="authored" padding="control" style={{ padding: '5px 9px 13px 17px', height: 80 }} fullWidth={false}>Authored CSS</Card>
  <Card id="shadow" className="uf-surface-stable owned" padding="none" style={{ boxShadow: '3px 4px 5px rgb(10, 20, 30)', borderRadius: 12, overflow: 'hidden' }} fullWidth={false}>
    <Button id="focus-action">Focused action</Button>
  </Card>
  <div id="manual" className="uf-surface-stable"><Text membrane={false} inset="none">Manual surface</Text></div>
  <div id="popups">
    <Menu items={[{value:'alpha',label:'Alpha'},{value:'beta',label:'Beta'}]}>
      <Button id="launch-menu">Menu</Button>
    </Menu>
    <Select id="launch-select" items={[{value:'alpha',label:'Alpha'},{value:'beta',label:'Beta'}]} placeholder="Select" />
    <DateField id="launch-date" placeholder="Date" />
    <Popover content={<Button>Popup action</Button>}><Button id="launch-overlay">Overlay</Button></Popover>
    <Navigation aria-label="Fixture navigation" items={[{value:'home',label:'Home',items:[{value:'child',label:'Child'}]}]} />
  </div>
</>)
