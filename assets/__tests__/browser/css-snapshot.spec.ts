/**
 * P4 — proof that moving a rule between component stylesheets changed nothing.
 *
 * W4-04 moved the cross-component rules W0-03 left behind into the files that
 * own them, which changes where those rules sit in the cascade. The move is
 * only safe if the two orders are indistinguishable: this spec rebuilds the
 * stylesheet as it was before the move (MOVES below describes every run and
 * where it came from), applies each order to the same live page, and compares
 * the computed value of every property of every element.
 *
 * The comparison runs over the gallery and whatever overlay the page can be
 * made to open, across {light, dark} x {ltr, rtl} x {1280, 360}, with
 * forced-colors and forced :hover/:focus-visible where the engine supports it.
 * The criterion is zero differences.
 *
 * It is not a one-off: the invariant it states — a shared run renders the same
 * wherever it sits among the component rules it used to sit among — is what
 * makes the split maintainable, so the rebuild stays in the suite.
 */
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test, type Page } from './test'
import { open } from './helpers'
import { libraryCss, stylesDir } from '../harness/css'

const registry = createRequire(import.meta.url)(
  '../../../component-registry.json',
) as { components: Record<string, { status?: string }> }

const components = Object.entries(registry.components)
  .filter(([, entry]) => entry.status !== 'deprecated')
  .map(([name]) => name)

/**
 * The components a moved run actually styles. The whole gallery is compared on
 * the engine that can also force pseudo-states; every other engine compares
 * these, which is the full browser matrix for what the move touches.
 */
const FOCUSED = [
  'Button',
  'Tile',
  'Text',
  'Media',
  'Table',
  'Radio',
  'Checkbox',
  'Switcher',
  'Carousel',
  'Select',
  'Navigation',
  'Menu',
  'Date',
  'Modal',
]

// ---------------------------------------------------------------------------
// The stylesheet as it was before W4-04
// ---------------------------------------------------------------------------

/**
 * The :where() prefix W4-04 added so the shared focus rules stop matching a
 * reference library's data-scope/data-part (RFC §5 #17). It carries no
 * specificity, so deleting it from the rebuild restores the old selectors
 * exactly and the comparison covers the scoping as well as the moves.
 */
const GUARD = ':where([class^="uf-"], [class*=" uf-"], [class^="uf-"] *, [class*=" uf-"] *)'

/** A run of top-level blocks that W4-04 moved, and where it used to live. */
type Run = { id: string; file: string; start?: string; count?: number }

const MOVES: {
  runs: Run[]
  /** Runs, in order, re-inserted into a file that existed before the move. */
  inserts: { file: string; at: 'start' | 'end' | { after: string }; runs: string[] }[]
  /** Files created by the move, empty once their runs are taken out. */
  dropped: string[]
  /** Files the move deleted, restored at their old place in the import list. */
  restored: { file: string; before: string }[]
} = {
  runs: [
    { id: 'sheet', file: './components/sheet.css' },
    { id: 'membrane-truncate', file: './components/membrane.css', start: '/* Truncate — ellipsis overflow.', count: 1 },
    { id: 'membrane', file: './components/membrane.css' },
    { id: 'button-icon', file: './components/button.css', start: '/* Button icon box.', count: 4 },
    { id: 'media-image', file: './components/media.css', start: '/* Parity with the reference library, whose image', count: 1 },
    { id: 'text-body', file: './text.css', start: '/* The class a consumer puts on non-Text markup', count: 1 },
    { id: 'tile-actions', file: './components/tile.css', start: '/* Hidden actions must not receive keyboard focus.', count: 3 },
    { id: 'tile-hit-area', file: './components/tile.css', start: '/* The primary action covers the whole tile', count: 3 },
    { id: 'radio-ring', file: './components/radio.css', start: '/* The visible row is the <label>', count: 1 },
    { id: 'checkbox-ring', file: './components/checkbox.css', start: '/* The visible row is the <label>', count: 1 },
    { id: 'switcher-ring', file: './components/switcher.css', start: '/* The visible row is the <label>', count: 1 },
    { id: 'navigation-tail', file: './components/navigation.css', start: '/* A horizontal menubar wraps', count: 2 },
    { id: 'command-label', file: './components/command.css', start: '/* A label slot renders a Text;', count: 1 },
    { id: 'menu-label', file: './components/menu.css', start: '/* A label slot renders a Text;', count: 1 },
  ],
  inserts: [
    { file: './components/select.css', at: { after: '.uf-select[data-scope="select"][data-full-width]' }, runs: ['sheet'] },
    { file: './components/button.css', at: { after: '.uf-button[data-scope][data-indent]' }, runs: ['membrane'] },
    { file: './text.css', at: { after: '.uf-text[data-scope][data-size="xl"]' }, runs: ['membrane-truncate'] },
    { file: './components/carousel.css', at: 'end', runs: ['button-icon'] },
    { file: './components/compat.css', at: 'end', runs: ['media-image'] },
    { file: './components/gallery.css', at: 'start', runs: ['text-body'] },
    {
      file: './components/interaction.css',
      at: { after: '@media (forced-colors: active)' },
      // The order these had inside interaction.css. `.uf-checkbox:has(…)` and
      // `.uf-switcher:has(…)` were one selector list; adjacent rules with the
      // same declarations are the same cascade.
      runs: [
        'tile-actions',
        'radio-ring',
        'tile-hit-area',
        'checkbox-ring',
        'switcher-ring',
        'navigation-tail',
      ],
    },
    // One selector list before the split, so the rebuild puts them back adjacent.
    {
      file: './components/input.css',
      at: { after: '[data-part="textarea"]::placeholder' },
      runs: ['command-label', 'menu-label'],
    },
  ],
  dropped: ['./components/sheet.css', './components/membrane.css'],
  restored: [{ file: './components/compat.css', before: './components/gallery.css' }],
}

/** Top-level blocks: one rule or at-rule, with the comments written above it. */
function units(css: string): string[] {
  const out: string[] = []
  let depth = 0
  let start = 0
  for (let i = 0; i < css.length; i++) {
    if (css.startsWith('/*', i)) {
      i = css.indexOf('*/', i + 2)
      if (i < 0) throw new Error('unterminated comment')
      i++
      continue
    }
    if (css[i] === '{') depth++
    else if (css[i] === '}' && --depth === 0) {
      out.push(css.slice(start, i + 1))
      start = i + 1
    }
  }
  if (css.slice(start).trim()) out.push(css.slice(start))
  return out
}

const read = (file: string) => readFileSync(join(stylesDir, file.replace('./', '')), 'utf8')

/** The one block of `blocks` holding `marker`. A marker that misses, or that
 *  matches twice, is a stale manifest, and the rebuild has to say so. */
function only(blocks: string[], marker: string, file: string): number {
  const found = blocks.filter((block) => block.includes(marker))
  if (found.length !== 1)
    throw new Error(`${file}: "${marker}" matches ${found.length} blocks, expected exactly one`)
  return blocks.indexOf(found[0])
}

/** The library stylesheet with every move in MOVES undone. */
function legacyCss(): string {
  const order = read('components.css')
    .split('\n')
    .map((line) => /^@import "(.+)";$/.exec(line.trim())?.[1])
    .filter((file): file is string => !!file)
  const files = new Map(order.map((file) => [file, units(read(file))]))
  const cut = new Map<string, string[]>()

  for (const run of MOVES.runs) {
    const source = files.get(run.file)
    if (!source) throw new Error(`${run.file}: not imported`)
    if (run.start === undefined) {
      cut.set(run.id, source.splice(0, source.length))
      continue
    }
    cut.set(run.id, source.splice(only(source, run.start, run.file), run.count))
  }

  for (const insert of MOVES.inserts) {
    const target = files.get(insert.file) ?? []
    files.set(insert.file, target)
    const moved = insert.runs.flatMap((id) => {
      const run = cut.get(id)
      if (!run) throw new Error(`${id}: run used twice`)
      cut.delete(id)
      return run
    })
    const at = insert.at
    if (at === 'end') target.push(...moved)
    else if (at === 'start') target.unshift(...moved)
    else {
      target.splice(only(target, at.after, insert.file) + 1, 0, ...moved)
    }
  }
  if (cut.size) throw new Error(`runs that land nowhere: ${[...cut.keys()].join(', ')}`)

  for (const file of MOVES.dropped) {
    const left = files.get(file)?.join('').trim()
    if (left) throw new Error(`${file} still holds rules after its runs were taken out`)
    order.splice(order.indexOf(file), 1)
  }
  for (const { file, before } of MOVES.restored)
    order.splice(order.indexOf(before), 0, file)

  return order.map((file) => files.get(file)!.join('\n')).join('\n').split(GUARD).join('')
}


/** Selectors and declarations of every rule, in cascade order. */
function ruleList(css: string): string[] {
  const expand = (unit: string): string[] => {
    const open = unit.indexOf('{')
    if (open < 0) return []
    const prelude = unit.slice(0, open).replace(/\/\*[\s\S]*?\*\//g, '').trim()
    const body = unit.slice(open + 1, unit.lastIndexOf('}'))
    if (prelude.startsWith('@') && /\{/.test(body))
      return units(body).flatMap((inner) => expand(inner).map((rule) => `${prelude} ${rule}`))
    return [`${prelude.replace(/\s+/g, ' ')} { ${body.replace(/\s+/g, ' ').trim()} }`]
  }
  return units(css).flatMap(expand)
}

// ---------------------------------------------------------------------------
// The page side
// ---------------------------------------------------------------------------

/** Custom properties the moved runs declare or read: not enumerable in every
 *  engine's computed style, so they are read by name. */
const CUSTOM_PROPERTIES = [
  '--uf-membrane',
  '--uf-responsive-overlay-zero-blur',
  '--uf-overlay-backdrop-blur',
  '--uf-button-inline-sign',
  '--uf-carousel-inline-sign',
  '--uf-icon-only-size',
  '--uf-tile-action-size',
  '--uf-tile-indicator-opacity',
  '--uf-spinner-size',
  '--uf-spinner-size-sm',
  '--uf-spinner-border-width',
  '--uf-spinner-border-width-sm',
  '--uf-interactive-weight',
  '--uf-text-color',
  '--uf-control-pad-text',
  '--uf-color-fg',
]

declare global {
  interface Window {
    /** One row per element: every computed property as "name=value". */
    __ufSnapshot?: string[][]
  }
}

type Measured = {
  elements: number
  properties: number
  diffs: { path: string; property: string; before: string; after: string }[]
}

/** Writes the sheet under test, settles animations, then records — or diffs
 *  against the recording — every computed property of every element. */
async function measure(page: Page, css: string, mode: 'record' | 'compare') {
  return page.evaluate(
    async ({ css, mode, customProperties }) => {
      const id = 'uf-css-snapshot'
      let sheet = document.getElementById(id) as HTMLStyleElement | null
      if (!sheet) {
        sheet = document.createElement('style')
        sheet.id = id
        document.head.append(sheet)
      }
      sheet.textContent = css
      if (!sheet.sheet?.cssRules.length) throw new Error('snapshot stylesheet did not parse')
      // Two frames under this sheet, so a resize observer or a floating
      // placement has reacted to it before anything is read. Both sheets get
      // the same treatment; measuring one of them earlier would compare a
      // layout that had settled against one that had not.
      await new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      )

      // Deterministic frame: a finite animation or transition is taken to its
      // end, an indefinite one to its first frame. Neither touches the
      // computed value of any animation-* or transition-* property.
      for (const animation of document.getAnimations()) {
        const timing = animation.effect?.getComputedTiming()
        if (timing && timing.iterations !== Infinity && Number.isFinite(Number(timing.endTime)))
          animation.finish()
        else {
          animation.currentTime = 0
          animation.pause()
        }
      }

      const rows: string[][] = []
      const paths: string[] = []
      // ::before and ::after too: a moved run draws the membrane's link hit
      // area with them. A pseudo-element that generates no box is recorded as
      // its `content` alone — nothing else about it is rendered, and a run
      // that started generating one would change `content` first.
      const record = (node: Element, path: string, pseudo: string | null) => {
        const computed = getComputedStyle(node, pseudo)
        const entries: string[] = []
        if (pseudo && (computed.content === 'none' || computed.content === 'normal'))
          entries.push(`content=${computed.content}`)
        else {
          for (let i = 0; i < computed.length; i++)
            entries.push(`${computed[i]}=${computed.getPropertyValue(computed[i])}`)
          for (const property of customProperties)
            entries.push(`${property}=${computed.getPropertyValue(property)}`)
        }
        rows.push(entries)
        paths.push(path + (pseudo ?? ''))
      }
      const walk = (node: Element, path: string) => {
        for (const pseudo of [null, '::before', '::after']) record(node, path, pseudo)
        ;[...node.children].forEach((child, index) =>
          walk(child, `${path} > ${child.tagName.toLowerCase()}:nth-child(${index + 1})`),
        )
      }
      walk(document.body, 'body')
      // Three boxes per element; `properties` counts every value read.
      const elements = rows.length / 3
      const properties = rows.reduce((total, row) => total + row.length, 0)

      if (mode === 'record') {
        window.__ufSnapshot = rows
        return { elements, properties, diffs: [] }
      }
      const before = window.__ufSnapshot ?? []
      const value = (entry: string) => entry.slice(entry.indexOf('=') + 1)
      const diffs: { path: string; property: string; before: string; after: string }[] = []
      if (before.length !== rows.length)
        diffs.push({
          path: 'document',
          property: 'element count',
          before: String(before.length),
          after: String(rows.length),
        })
      for (let row = 0; row < Math.min(before.length, rows.length) && diffs.length < 40; row++) {
        if (before[row].length !== rows[row].length)
          diffs.push({
            path: paths[row],
            property: 'content',
            before: value(before[row][0]),
            after: value(rows[row][0]),
          })
        for (let column = 0; column < rows[row].length && diffs.length < 40; column++)
          if (before[row][column] !== rows[row][column])
            diffs.push({
              path: paths[row],
              property: rows[row][column].slice(0, rows[row][column].indexOf('=')),
              before: value(before[row][column]),
              after: value(rows[row][column]),
            })
      }
      return { elements, properties, diffs }
    },
    { css, mode, customProperties: CUSTOM_PROPERTIES },
  ) as Promise<Measured>
}

/** Two frames, so a resize observer or a floating placement has settled. */
const settle = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  )

/** Opens whatever the page offers: the gallery renders Modal and Command open,
 *  everything else hangs off a collapsed trigger. Then checks that the guard on
 *  the shared focus rules still reaches every part this component rendered —
 *  narrowing it must cost Face UI nothing (RFC §5 #17). */
async function openOverlays(page: Page, name: string) {
  await page.evaluate(() => {
    for (const trigger of document.querySelectorAll('[aria-expanded="false"]'))
      (trigger as HTMLElement).click()
  })
  await settle(page)
  const unreached = await page.evaluate(
    (guard) =>
      [...document.querySelectorAll('[data-scope][data-part]')]
        .filter((node) => !node.matches(`${guard}[data-scope][data-part]`))
        .map((node) => `${node.tagName}.${node.className}[data-part=${node.getAttribute('data-part')}]`),
    GUARD,
  )
  expect(unreached, `${name}: a Face UI part outside every .uf-* root`).toEqual([])
}

async function compareOrders(page: Page, totals: { elements: number; properties: number }) {
  await measure(page, LEGACY, 'record')
  const current = await measure(page, CURRENT, 'compare')
  expect(current.diffs).toEqual([])
  // A page that rendered nothing would pass the line above for free.
  expect(current.elements, 'the fixture rendered something to compare').toBeGreaterThan(1)
  totals.elements += current.elements
  totals.properties += current.properties
}

const LEGACY = legacyCss()
/** What dist ships: components.css with its import list inlined. */
const CURRENT = libraryCss()

// ---------------------------------------------------------------------------

test('the rebuilt order is the shipped rules in a different order', { tag: ['@css'] }, async () => {
  const shipped = ruleList(CURRENT.split(GUARD).join(''))
  const rebuilt = ruleList(LEGACY)
  // Same rules: the comparison below is a permutation, never a subset.
  expect([...rebuilt].sort()).toEqual([...shipped].sort())
  // A different order: otherwise the comparison would prove nothing.
  expect(rebuilt).not.toEqual(shipped)
  // …and the shipped sheet is the one carrying the RFC §5 #17 guard.
  expect(CURRENT).toContain(GUARD)
  expect(LEGACY).not.toContain(GUARD)
})

/**
 * The control. Everything below passes when the two stylesheets render the
 * same; it would also pass if the injected sheet never reached the page, or
 * lost to the fixture's own copy of the same rules. One rule that ties with a
 * shipped one on specificity has to win, and the walk has to say so.
 */
test('a rule that only order can decide is visible to the comparison', { tag: ['@css'] }, async ({
  page,
}) => {
  await open(page, 'gallery', '?component=Button')
  await measure(page, CURRENT, 'record')
  const { diffs } = await measure(
    page,
    `${CURRENT}\n.uf-button[data-scope] { color: rgb(1, 2, 3); }\n`,
    'compare',
  )
  expect(diffs.some((diff) => diff.property === 'color' && diff.after === 'rgb(1, 2, 3)')).toBe(true)
})

for (const name of components) {
  test(`${name} renders the same in either order`, { tag: ['@css'] }, async ({ page, browserName }, info) => {
    test.skip(
      browserName !== 'chromium' && !FOCUSED.includes(name),
      'the whole gallery is compared on one engine; the moved runs on all of them',
    )
    // Sixteen walks of every computed property of every box on the page. That
    // is minutes on a big fixture in a slow engine, and still not a hang.
    test.setTimeout(180_000)
    const totals = { elements: 0, properties: 0 }
    await open(page, 'gallery', `?component=${name}`)
    for (const [width, height] of [
      [1280, 900],
      [360, 780],
    ]) {
      await page.setViewportSize({ width, height })
      await openOverlays(page, name)
      for (const theme of ['light', 'dark'])
        for (const direction of ['ltr', 'rtl']) {
          await page.evaluate(
            ([theme, direction]) => {
              document.documentElement.dataset.theme = theme
              document.documentElement.dir = direction
            },
            [theme, direction],
          )
          await settle(page)
          await compareOrders(page, totals)
        }
    }
    info.annotations.push({
      type: 'compared',
      description: `${totals.elements} elements, ${totals.properties} property values`,
    })
  })
}

for (const name of FOCUSED) {
  test(`${name} renders the same in either order in forced colors`, { tag: ['@forced-colors', '@css'] }, async ({
    page,
  }, info) => {
    test.setTimeout(180_000)
    const totals = { elements: 0, properties: 0 }
    await page.emulateMedia({ forcedColors: 'active' })
    await open(page, 'gallery', `?component=${name}`)
    await openOverlays(page, name)
    for (const theme of ['light', 'dark']) {
      await page.evaluate((value) => {
        document.documentElement.dataset.theme = value
      }, theme)
      await settle(page)
      await compareOrders(page, totals)
    }
    info.annotations.push({
      type: 'compared',
      description: `${totals.elements} elements, ${totals.properties} property values`,
    })
  })

  test(`${name} renders the same in either order under hover and focus`, { tag: ['@css', '@focus'] }, async ({
    page,
    browserName,
  }, info) => {
    test.skip(browserName !== 'chromium', 'forcePseudoState is a Chrome DevTools Protocol command')
    test.setTimeout(180_000)
    const totals = { elements: 0, properties: 0 }
    await open(page, 'gallery', `?component=${name}`)
    await openOverlays(page, name)
    const session = await page.context().newCDPSession(page)
    await session.send('DOM.enable')
    await session.send('CSS.enable')
    const { root } = await session.send('DOM.getDocument', { depth: -1 })
    const { nodeIds } = await session.send('DOM.querySelectorAll', {
      nodeId: root.nodeId,
      // Everything the moved runs style on hover or focus, plus every part.
      selector:
        '.uf-membrane, .uf-tile, .uf-radio-option, .uf-checkbox, .uf-switcher, .uf-button, [data-scope][data-part]',
    })
    for (const nodeId of nodeIds)
      await session.send('CSS.forcePseudoState', {
        nodeId,
        forcedPseudoClasses: ['hover', 'focus', 'focus-visible', 'focus-within', 'active'],
      })
    await settle(page)
    await compareOrders(page, totals)
    await session.detach()
    info.annotations.push({
      type: 'compared',
      description: `${nodeIds.length} forced nodes, ${totals.elements} elements, ${totals.properties} property values`,
    })
  })
}

test('the shared focus ring stops at a foreign data-scope element', { tag: ['@focus', '@css'] }, async ({
  page,
}) => {
  // That the ring still reaches every part Face UI renders is checked per
  // component, on every gallery page the comparison above opens. What it must
  // not reach is a reference library rendering the same two attributes.
  await open(page, 'gallery')
  await page.evaluate(() => {
    document.body.insertAdjacentHTML(
      'beforeend',
      '<div class="uf-probe"><input id="owned" data-scope="combobox" data-part="input"></div>' +
        '<div class="zag-combobox"><input id="foreign" data-scope="combobox" data-part="input"></div>',
    )
  })
  expect(
    await page.evaluate(
      (guard) => ({
        owned: document.querySelector('#owned')!.matches(`${guard}[data-scope][data-part]`),
        foreign: document.querySelector('#foreign')!.matches(`${guard}[data-scope][data-part]`),
      }),
      GUARD,
    ),
  ).toEqual({ owned: true, foreign: false })

  // And what each one is actually painted with. A text field matches
  // :focus-visible however it was focused, in every engine, so the ring is
  // read without depending on what a platform's Tab key does with buttons.
  const ring = async (id: string) => {
    await page.locator(id).focus()
    await expect(page.locator(id)).toBeFocused()
    return page.locator(id).evaluate((node) => {
      const { outlineStyle, outlineWidth } = getComputedStyle(node)
      return `${outlineWidth} ${outlineStyle}`
    })
  }
  expect(await ring('#owned')).toBe('2px solid')
  expect(await ring('#foreign')).not.toBe('2px solid')
})
