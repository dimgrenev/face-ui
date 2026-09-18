import { act, Profiler, StrictMode, useState, type ReactElement } from 'react'
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { expectDevError, mount, type View } from './index'

export interface ControlledSpec<V> {
  /** Component name as reports spell it: `Face UI <name>: …`. */
  name: string
  /** State prop such as `value` or `checked`; `default<Prop>` and `on<Prop>Change` derive from it. */
  prop: string
  /** Two distinct values a user can switch between; every case starts from the first. */
  values: readonly [V, V]
  /** Renders the component with `props` spread onto it. */
  render: (props: Record<string, unknown>) => ReactElement
  /** One user interaction on `host` that proposes `to` while the other value is shown. */
  change: (host: HTMLElement, to: V) => void | Promise<void>
  /** The value the component shows, read from the DOM. */
  read: (host: HTMLElement) => V
  /** A value the component normalizes at render (unknown key, out of range) and what it shows. */
  normalizes?: readonly [value: unknown, shown: V]
  /** Native handler prop that `change` triggers: it runs first and its `preventDefault()` cancels. */
  handler?: string
  /** The component joins native forms: `form.reset()` restores the default value silently. */
  formReset?: boolean
}

/**
 * The controlled-state contract of one `x`/`defaultX`/`onXChange` triad, run in StrictMode:
 * modes, one report per user change, silent sync, refusal, mode switches, normalization,
 * consumer-first handlers and form reset. A Profiler records what every commit shows, so a
 * refused proposal cannot flash.
 */
export function describeControlled<V>(spec: ControlledSpec<V>) {
  const {
    name,
    prop,
    values: [a, b],
  } = spec
  const Prop = prop[0].toUpperCase() + prop.slice(1)
  const defaultProp = `default${Prop}`
  const onChange = `on${Prop}Change`

  describe(`${name} ${prop}: controlled state contract`, () => {
    let view: View
    let frames: V[]
    beforeEach(() => {
      view = mount()
      frames = []
    })
    const show = (ui: ReactElement, inForm = false) =>
      act(async () =>
        view.root.render(
          <StrictMode>
            <Profiler
              id={name}
              onRender={() => frames.push(spec.read(view.host))}
            >
              {inForm ? <form>{ui}</form> : ui}
            </Profiler>
          </StrictMode>,
        ),
      )
    const render = (props: Record<string, unknown>, inForm = false) =>
      show(spec.render(props), inForm)
    const change = (to: V) => {
      frames = []
      return act(async () => spec.change(view.host, to))
    }
    const shows = (value: V) => expect(spec.read(view.host)).toEqual(value)
    /** One `{ [prop]: value }` payload per change, arrays never shared with props or earlier payloads. */
    const reported = (callback: Mock, ...values: V[]) => {
      const payloads = callback.mock.calls.map(([payload]) => payload)
      expect(payloads).toEqual(values.map((value) => ({ [prop]: value })))
      const seen = new Set<unknown>([a, b])
      for (const { [prop]: value } of payloads) {
        if (!Array.isArray(value)) continue
        expect(seen.has(value), 'payload arrays are fresh copies').toBe(false)
        seen.add(value)
      }
    }

    it(`uncontrolled: ${defaultProp} starts it, each user change reports once`, async () => {
      const callback = vi.fn()
      await render({ [defaultProp]: a, [onChange]: callback })
      shows(a)
      await change(b)
      shows(b)
      await change(a)
      shows(a)
      reported(callback, b, a)
    })

    it(`${defaultProp} is read once, on mount`, async () => {
      const callback = vi.fn()
      await render({ [defaultProp]: a, [onChange]: callback })
      await render({ [defaultProp]: b, [onChange]: callback })
      shows(a)
      expect(callback).not.toHaveBeenCalled()
    })

    it('controlled: a refused proposal reports once and never renders', async () => {
      const callback = vi.fn()
      await render({ [prop]: a, [onChange]: callback })
      await change(b)
      shows(a)
      expect(frames).not.toContainEqual(b)
      // The refusal leaves no trace: proposing the same value again reports again.
      await change(b)
      shows(a)
      reported(callback, b, b)
    })

    it('controlled: an accepting parent renders each change after one report', async () => {
      const callback = vi.fn()
      function Parent() {
        const [value, setValue] = useState(() => a)
        return spec.render({
          [prop]: value,
          [onChange]: (payload: Record<string, V>) => {
            callback(payload)
            setValue(() => payload[prop])
          },
        })
      }
      await show(<Parent />)
      await change(b)
      shows(b)
      await change(a)
      shows(a)
      reported(callback, b, a)
    })

    it(`controlled: ${prop} updates from the parent are silent`, async () => {
      const callback = vi.fn()
      await render({ [prop]: a, [onChange]: callback })
      await render({ [prop]: b, [onChange]: callback })
      shows(b)
      expect(callback).not.toHaveBeenCalled()
    })

    it('controlled → uncontrolled keeps the last accepted value and reports', async () => {
      const callback = vi.fn()
      await render({ [prop]: b, [defaultProp]: a, [onChange]: callback })
      await expectDevError(
        () => render({ [defaultProp]: a, [onChange]: callback }),
        new RegExp(`^Face UI ${name}: missing ${prop}; `),
      )
      shows(b)
      await change(a)
      shows(a)
      reported(callback, a)
    })

    it(`uncontrolled → controlled follows ${prop} and reports`, async () => {
      const callback = vi.fn()
      await render({ [defaultProp]: a, [onChange]: callback })
      await expectDevError(
        () => render({ [prop]: b, [onChange]: callback }),
        new RegExp(`^Face UI ${name}: invalid ${prop} `),
      )
      shows(b)
      expect(callback).not.toHaveBeenCalled()
    })

    if (spec.normalizes) {
      const [value, shown] = spec.normalizes
      it(`normalizing ${prop} at render never reports a change`, async () => {
        const callback = vi.fn()
        await render({ [prop]: value, [onChange]: callback })
        shows(shown)
        view = mount()
        await render({ [defaultProp]: value, [onChange]: callback })
        shows(shown)
        expect(callback).not.toHaveBeenCalled()
      })
    }

    if (spec.handler) {
      const handler = spec.handler
      it(`${handler} runs before the change; preventDefault() cancels it`, async () => {
        const order: string[] = []
        const callback = vi.fn(() => order.push(onChange))
        let prevent = true
        await render({
          [defaultProp]: a,
          [onChange]: callback,
          [handler]: (event: { preventDefault(): void }) => {
            order.push(handler)
            if (prevent) event.preventDefault()
          },
        })
        await change(b)
        shows(a)
        prevent = false
        await change(b)
        shows(b)
        expect(order).toEqual([handler, handler, onChange])
      })
    }

    if (spec.formReset) {
      // Components reset after the browser's default action, in a later task.
      const reset = () =>
        act(async () => {
          view.host.querySelector('form')!.reset()
          await new Promise((resolve) => setTimeout(resolve, 0))
        })
      it(`form.reset() restores ${defaultProp} silently; controlled ignores it`, async () => {
        const callback = vi.fn()
        await render({ [defaultProp]: a, [onChange]: callback }, true)
        await change(b)
        await reset()
        shows(a)
        reported(callback, b)
        const controlledCallback = vi.fn()
        view = mount()
        await render({ [prop]: b, [onChange]: controlledCallback }, true)
        await reset()
        shows(b)
        expect(controlledCallback).not.toHaveBeenCalled()
      })
    }
  })
}
