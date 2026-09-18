import { describe, expect, it } from 'vitest'
import { createMachine, interpret } from '../create-machine'
import type { MachineSchema } from '../types'

interface Schema extends MachineSchema {
  context: { request: string }
  state: 'loading'
  event:
    | { type: 'UPDATE'; request: string }
    | { type: 'RELOAD'; request: string }
}

describe('explicit state reentry', () => {
  it('restarts only the opted-in self transition and cleans every request exactly once', () => {
    const log: string[] = []
    const machine = createMachine<Schema>({
      id: 'request',
      initial: 'loading',
      context: { request: 'first' },
      states: {
        loading: {
          effects: ['request'],
          entry: [
            () => {
              log.push('enter')
            },
          ],
          exit: [
            () => {
              log.push('exit')
            },
          ],
          on: {
            UPDATE: {
              target: 'loading',
              actions: [
                (ctx, event) => {
                  ctx.request = event.request
                },
              ],
            },
            RELOAD: {
              target: 'loading',
              reenter: true,
              actions: [
                (ctx, event) => {
                  ctx.request = event.request
                },
              ],
            },
          },
        },
      },
      implementations: {
        effects: {
          request: (ctx) => {
            const request = ctx.request
            log.push(`start:${request}`)
            return () => {
              log.push(`stop:${request}`)
            }
          },
        },
      },
    })
    const service = interpret(machine).start()
    expect(log).toEqual(['enter', 'start:first'])
    service.send({ type: 'UPDATE', request: 'second' })
    expect(log).toEqual(['enter', 'start:first'])
    service.send({ type: 'RELOAD', request: 'third' })
    service.send({ type: 'RELOAD', request: 'fourth' })
    service.stop()
    expect(log).toEqual([
      'enter',
      'start:first',
      'stop:first',
      'exit',
      'enter',
      'start:third',
      'stop:third',
      'exit',
      'enter',
      'start:fourth',
      'stop:fourth',
    ])
  })
})
