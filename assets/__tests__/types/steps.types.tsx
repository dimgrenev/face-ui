import { Steps as AuditedSteps, type StepItem as AuditedStepItem } from '../../../index'

const auditedStepsItems: readonly AuditedStepItem[] = Object.freeze([{key:'one',label:'One',content:<input/>},{key:2,label:<strong>Two</strong>}])
export const stepsNative = <AuditedSteps items={auditedStepsItems} step={1} defaultStep={0} linear disabled={false} membrane={false} id="wizard" aria-label="Setup" aria-labelledby="heading" dir="rtl" lang="ru" title="Wizard" hidden={false} className="wizard" style={{width:300}} tabIndex={-1} ref={node=>{const group: HTMLDivElement|null=node;group?.focus()}} onClickCapture={e=>e.preventDefault()} onStepChange={({step})=>step.toFixed()} />
// @ts-expect-error Items own panel content.
;<AuditedSteps children="Ignored" />
// @ts-expect-error Raw HTML would replace the navigation.
;<AuditedSteps dangerouslySetInnerHTML={{__html:''}} />
// @ts-expect-error Native input defaults do not apply to wizard groups.
;<AuditedSteps defaultValue="one" />
// @ts-expect-error The root has a fixed group role.
;<AuditedSteps role="tablist" />
// @ts-expect-error disabled owns navigation availability; it does not disable panel content.
export const stepsDisabledAlias: import('../../../Steps/Steps').StepsProps = {'aria-disabled': true}
// @ts-expect-error Index selection remains numeric.
;<AuditedSteps step="one" />
// @ts-expect-error Navigation does not claim business completion.
;<AuditedSteps completed={[0]} />
