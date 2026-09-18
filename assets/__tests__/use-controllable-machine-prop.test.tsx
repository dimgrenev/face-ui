import { beforeEach, describe, expect, it } from 'vitest'
import { act } from 'react'
import type { Root } from 'react-dom/client'
import { useControllableMachineProp } from '../adapters/react/use-controllable-machine-prop'
import { mount } from './harness'

function Probe(props: {
  controlledValue?: string
  initialValue?: string
  onValue: (value: string | undefined) => void
}) {
  const value = useControllableMachineProp(props.controlledValue, props.initialValue)
  props.onValue(value)
  return <div data-value={value || ''} />
}

describe('useControllableMachineProp', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;({ host: container, root } = mount())
  })

  it('uses the initial value only on the first uncontrolled render', async () => {
    const seen: Array<string | undefined> = []

    await act(async () => {
      root.render(<Probe initialValue="seed" onValue={(value) => seen.push(value)} />)
    })
    await act(async () => {
      root.render(<Probe initialValue="changed-later" onValue={(value) => seen.push(value)} />)
    })

    expect(seen[0]).toBe('seed')
    expect(seen[1]).toBeUndefined()
    expect(container.firstElementChild?.getAttribute('data-value')).toBe('')
  })

  it('prefers controlled values when provided', async () => {
    let current: string | undefined

    await act(async () => {
      root.render(<Probe initialValue="seed" controlledValue="controlled" onValue={(value) => { current = value }} />)
    })

    expect(current).toBe('controlled')
    expect(container.firstElementChild?.getAttribute('data-value')).toBe('controlled')
  })
})
