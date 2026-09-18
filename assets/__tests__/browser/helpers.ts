import { createRequire } from 'node:module'
import type { ComponentProps, ReactElement } from 'react'
import type { MountRegistry } from './fixtures/mount.fixture'
import { test, type Page } from './test'

const require = createRequire(import.meta.url)

/**
 * Opens fixtures/<name>.fixture.tsx in the project's production build (React 18,
 * or React 19 for chromium-react19) and waits until the fixture has loaded.
 * Absolute, so it also works in contexts a test creates itself.
 */
export async function open(page: Page, name: string, query = '') {
  await page.goto(new URL(name + query, test.info().project.use.baseURL).href)
  await page.waitForFunction(
    (name) => document.documentElement.dataset.fixture === name,
    name,
  )
}

/** What survives page.evaluate: callbacks and elements are dropped (a spec
 * that needs them builds them in the page), so a ReactNode prop takes text.
 * `style` also takes custom properties. */
type Serial<T> = T extends (...args: any[]) => any
  ? never
  : T extends ReactElement
    ? never
    : T extends string | number | boolean | null | undefined
      ? T
      : T extends readonly (infer U)[]
        ? readonly Serial<U>[]
        : T extends Iterable<unknown>
          ? never
          : T extends object
            ? {
                [K in keyof T as [Serial<T[K]>] extends [never] ? never : K]: K extends 'style'
                  ? Serial<T[K]> & { [variable: `--${string}`]: string }
                  : Serial<T[K]>
              }
            : never
type Omitted<T, P extends PropertyKey> = T extends unknown ? Omit<T, P> : never
type Extra = { key?: string; [data: `data-${string}`]: string }
export type MountProps<K extends keyof MountRegistry> = Serial<
  Omitted<ComponentProps<MountRegistry[K]>, 'ref' | 'children'>
> &
  Extra

/**
 * The mount fixture's window, for a spec whose props need elements or
 * callbacks built in the page: `window as unknown as MountWindow` types those
 * props like mount() does.
 */
export type MountWindow = Window & {
  React: typeof import('react')
  propComponents: MountRegistry
  propEvents: string[]
  renderProps<K extends keyof MountRegistry>(
    name: K,
    props: Omitted<ComponentProps<MountRegistry[K]>, 'ref'> & Extra,
  ): void
}

/**
 * Renders `name` with `props` on the mount fixture (open(page, 'mount') first).
 * Props are typed from the component, so a renamed or removed prop does not
 * compile instead of silently testing nothing.
 */
export async function mount<K extends keyof MountRegistry>(
  page: Page,
  name: K,
  props: MountProps<K>,
) {
  const args: [string, object] = [name, props]
  await page.evaluate(
    ([name, props]) => (window as any).renderProps(name, props),
    args,
  )
}

/**
 * A mode-discriminated props union as one object: every member's keys, each
 * with the union of its values. Fixture hooks take it (and cast where they
 * render), so a spec can build props in a loop over modes while an unknown key
 * still does not compile.
 */
export type Flat<T> = {
  [K in T extends unknown ? keyof T : never]?: T extends unknown
    ? K extends keyof T
      ? T[K]
      : never
    : never
}
type SerialArgs<A extends unknown[]> = { [I in keyof A]: Serial<A[I]> }
/** Window hooks as a spec calls them: page first, then the hook's own arguments. */
export type Hooks<W> = {
  [K in keyof W]: W[K] extends (...args: infer A extends unknown[]) => void
    ? (page: Page, ...args: SerialArgs<A>) => Promise<void>
    : never
}

/**
 * The render hooks a fixture puts on window and exports as
 * `export type Hooks = { renderX: typeof renderX }`:
 * `const { renderX } = hooks<Hooks>()`, then `await renderX(page, props)`.
 * Arguments are typed from the fixture's signature, minus what page.evaluate
 * cannot carry, so a renamed prop does not compile.
 */
export const hooks = <W>() =>
  new Proxy({} as Hooks<W>, {
    get: (_, name) => (page: Page, ...args: unknown[]) =>
      page.evaluate(
        ([name, args]) => (window as any)[name](...args),
        [String(name), args] as const,
      ),
  })

/** The React version the current project's build must be running. */
export const expectedReactVersion = (): string =>
  require(
    test.info().project.use.baseURL?.endsWith('/19/')
      ? '../react-19/node_modules/react/package.json'
      : 'react/package.json',
  ).version

const WCAG = { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }

/**
 * axe-core violations inside `selector` (the whole document by default),
 * reduced to rule id, targets and summary so a failure diff is readable.
 */
export async function axe(page: Page, selector?: string, options: object = WCAG) {
  await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') })
  return page.evaluate(
    async ({ selector, options }) =>
      (
        await (window as any).axe.run(
          selector ? document.querySelector(selector) : document,
          options,
        )
      ).violations.map((violation: any) => ({
        id: violation.id,
        nodes: violation.nodes.map((node: any) => ({
          target: node.target,
          summary: node.failureSummary,
        })),
      })),
    { selector, options },
  )
}

/** Evaluate in the browser. Covers text over solid, possibly translucent
 * backgrounds; fail explicitly if the fixture adds unsupported compositing. */
export function solidTextContrast(element: Element): number {
  const context = document.createElement('canvas').getContext('2d')!
  const rgba = (color: string) => {
    context.clearRect(0, 0, 1, 1)
    context.fillStyle = color
    context.fillRect(0, 0, 1, 1)
    return [...context.getImageData(0, 0, 1, 1).data]
  }
  const blend = (foreground: number[], background: number[]) =>
    foreground
      .slice(0, 3)
      .map(
        (value, index) =>
          (value * foreground[3]) / 255 +
          background[index] * (1 - foreground[3] / 255),
      )
  const ancestors: Element[] = []
  for (let node: Element | null = element; node; node = node.parentElement)
    ancestors.unshift(node)
  let background = [255, 255, 255]
  for (const node of ancestors) {
    const style = getComputedStyle(node)
    // Card paints flat color layers as equal-stop gradients. They composite
    // like solid fills; spatial gradients and images still require pixel QA.
    const flatLayers: string[] = []
    const images = style.backgroundImage.replace(
      /linear-gradient\((rgba?\([^)]+\)), \1\)/g,
      (_match, color: string) => {
        flatLayers.push(color)
        return 'none'
      },
    )
    if (
      Number(style.opacity) !== 1 ||
      !/^none(?:,\s*none)*$/.test(images) ||
      style.filter !== 'none' ||
      style.mixBlendMode !== 'normal'
    )
      throw new Error(
        'Contrast fixture requires solid backgrounds without opacity, filters or blending',
      )
    background = blend(rgba(style.backgroundColor), background)
    for (const color of flatLayers.reverse())
      background = blend(rgba(color), background)
  }
  const luminance = (color: number[]) =>
    color
      .map((value) => {
        value /= 255
        return value <= 0.04045
          ? value / 12.92
          : ((value + 0.055) / 1.055) ** 2.4
      })
      .reduce(
        (sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index],
        0,
      )
  const a = luminance(blend(rgba(getComputedStyle(element).color), background))
  const b = luminance(background)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}
