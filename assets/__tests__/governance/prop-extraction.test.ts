import { describe, expect, it } from 'vitest'
import {
  extractComponentDescription,
  extractReactTsPropsFromSource as extract,
  getPropOptions,
} from '../../contracts/lib/tsPropExtractor'

describe('authored prop extraction', () => {
  it('does not keep the last literal options when another branch needs type enrichment', () => {
    for (const branches of [
      "{ view?: ImportedView } | { view?: 'year' }",
      "{ view?: 'year' } | { view?: ImportedView }",
    ]) {
      const [prop] = extract({
        fileName: 'Picker.tsx',
        code: `type PickerProps = ${branches}`,
      })
      expect(prop.type).toBe('any')
      expect(prop.options).toBeUndefined()
    }
  })
  it('keeps generated option order independent of checker union interning', () => {
    const first = ['auto', 'popover', 'sheet'],
      second = ['popover', 'auto', 'sheet']
    expect(getPropOptions(undefined, first)).toEqual(
      getPropOptions(undefined, second),
    )
    expect(second).toEqual(['popover', 'auto', 'sheet'])
    expect(getPropOptions(['sheet', 'auto', 'popover'], second)).toEqual([
      'sheet',
      'auto',
      'popover',
    ])
    expect(getPropOptions(undefined, [true, 'true', 1, '1', false])).toEqual([
      false,
      true,
      1,
      '1',
      'true',
    ])
    expect(getPropOptions(undefined, undefined)).toBeUndefined()
  })
  it('preserves every value of a finite mixed primitive union', () => {
    const props = extract({
      fileName: 'Choice.tsx',
      code: `interface ChoiceProps { checked?: boolean | 'indeterminate'; size?: 0 | 1 | 'auto'; enabled?: boolean }`,
    })
    expect(props[0]).toMatchObject({
      type: 'select',
      options: [true, false, 'indeterminate'],
    })
    expect(props[1]).toMatchObject({ type: 'select', options: [0, 1, 'auto'] })
    expect(props[2]).toMatchObject({ type: 'boolean' })
  })
  it('follows a compound export to its root defaults instead of reading its static parts', () => {
    const props = extract(
      {
        fileName: 'Card.tsx',
        code: `
      interface CardProps { border?: boolean; padding?: string; fullWidth?: boolean }
      const CardRoot = forwardRef(function Card(props, ref) {
        const { border = true, padding = 'default', fullWidth = true } = props
        return null
      })
      const CardTitle = ({ padding = 'wrong' }) => null
      export const Card = Object.assign(CardRoot, { Title: CardTitle }) as CardCompound
    `,
      },
      'CardProps',
    )
    expect(props.map((prop) => prop.defaultValue)).toEqual([
      true,
      'default',
      true,
    ])
  })
  it('does not confuse nested callbacks or helper objects with root prop defaults', () => {
    const props = extract({
      fileName: 'Example.tsx',
      code: `
      interface ExampleProps { value?: string; disabled?: boolean }
      const Example = memo(forwardRef((props, ref) => {
        const { value = 'root', disabled = false } = props
        const helper = ({ value = 'helper' }) => null
        const result = items.map(({ disabled = true }) => disabled)
        const { value: other = 'object' } = unrelatedObject
        return null
      }))
    `,
    })
    expect(props.map((prop) => prop.defaultValue)).toEqual(['root', false])
  })
  it('does not invent defaults from unrelated functions when the component cannot be resolved', () => {
    const props = extract({
      fileName: 'Example.tsx',
      code: `
      interface ExampleProps { value?: string }
      function Helper({ value = 'not a component default' }) {}
    `,
    })
    expect(props[0].defaultValue).toBeUndefined()
  })
  it('selects the requested component contract even beside compound parts', () => {
    const props = extract(
      {
        fileName: 'Example.tsx',
        code: `
      interface ExampleProps {
        /** A comment can contain unmatched }} and quotes ' without ending the interface. */
        value?: string
      }
      interface ExamplePartProps { wrong?: boolean }
    `,
      },
      'ExampleProps',
    )
    expect(props).toMatchObject([
      { name: 'value', type: 'string', required: false },
    ])
  })
  it('comments, apostrophes, and braces cannot swallow subsequent props', () => {
    const props = extract({
      fileName: 'Avatar.tsx',
      code: `
      interface AvatarProps {
        src?: string
        /** Person's name: don't parse {braces}, [brackets], or "quotes". */
        name?: string
        fallback?: React.ReactNode
        fallbackDelayMs?: number
        'aria-label'?: string
      }
      function Avatar({ name: userName = 'Ada', fallbackDelayMs = 0 }: AvatarProps) { return null }
    `,
    })
    expect(props.map((prop) => prop.name)).toEqual([
      'src',
      'name',
      'fallback',
      'fallbackDelayMs',
      'aria-label',
    ])
    expect(props.find((prop) => prop.name === 'name')?.defaultValue).toBe('Ada')
    expect(props.find((prop) => prop.name === 'fallback')?.type).toBe(
      'ReactNode',
    )
  })
  it('resolves multiline aliases, ignores callback members, and handles optional undefined', () => {
    const props = extract({
      fileName: 'Example.tsx',
      code: `
      type Appearance =
        | 'outline'
        | 'fill'
      interface ExampleProps {
        appearance?: Appearance
        onChange?: (details: { value: string; nested: { enabled: boolean } }) => void
        value: string | undefined
        rows: ReadonlyArray<{ title: string }>
      }
    `,
    })
    expect(props).toEqual([
      {
        name: 'appearance',
        type: 'select',
        required: false,
        options: ['outline', 'fill'],
      },
      { name: 'onChange', type: 'function', required: false },
      { name: 'value', type: 'string', required: false },
      { name: 'rows', type: 'array', required: true },
    ])
  })
  it('takes defaults from the selected component, with real arrays and objects', () => {
    const props = extract({
      fileName: 'Example.tsx',
      code: `
      function Other({ value = 'wrong' }) {}
      interface ExampleProps { value?: string; options?: string[]; config?: object }
      const Example = forwardRef(function Example({ value = 'right', options = ['a', 'b'], config = { active: true } }, ref) { return null })
      function Later({ value = 'also wrong' }) {}
    `,
    })
    expect(props.map((prop) => prop.defaultValue)).toEqual([
      'right',
      ['a', 'b'],
      { active: true },
    ])
  })
  it('extracts authored interface inheritance and discriminated unions without never fields', () => {
    const props = extract(
      {
        fileName: 'Field.tsx',
        code: `
      interface Base extends InputHTMLAttributes<HTMLInputElement> { placeholder?: string }
      interface Shared extends Base { value?: string; min?: string | number }
      type Kind = 'text' | 'email'
      type FieldProps = Shared & (
        { multiline?: false; type?: Kind; rows?: never; impossible?: never } |
        { multiline: true; type?: 'text'; rows?: number; impossible?: never }
      )
      const Field = forwardRef(function Field({ multiline = false, rows = 1 }, ref) {})
    `,
      },
      'FieldProps',
    )
    expect(
      props.map(({ name, type, required, options, defaultValue }) => ({
        name,
        type,
        required,
        options,
        defaultValue,
      })),
    ).toEqual([
      { name: 'placeholder', type: 'string', required: false },
      { name: 'value', type: 'string', required: false },
      { name: 'min', type: 'string | number', required: false },
      {
        name: 'multiline',
        type: 'boolean',
        required: false,
        defaultValue: false,
      },
      {
        name: 'type',
        type: 'select',
        required: false,
        options: ['text', 'email'],
      },
      { name: 'rows', type: 'number', required: false, defaultValue: 1 },
    ])
  })
  it('requires a union member only when required in every branch and terminates circular aliases', () => {
    const props = extract({
      fileName: 'Example.tsx',
      code: `
      type Cycle = Cycle
      type ExampleProps = Cycle & ({ shared: string; first: number } | { shared: string; second?: boolean })
    `,
    })
    expect(props.map(({ name, required }) => ({ name, required }))).toEqual([
      { name: 'shared', required: true },
      { name: 'first', required: false },
      { name: 'second', required: false },
    ])
  })
})

it('preserves nullable single and readonly multiple value branches without narrowing the contract to arrays', () => {
  const props = extract({
    fileName: 'Choice.tsx',
    code: `
    interface Single { multiple?: false; value?: string | null }
    interface Multiple { multiple: true; value?: readonly string[] }
    type ChoiceProps = Single | Multiple
  `,
  })
  expect(props.find((prop) => prop.name === 'value')?.type).toBe(
    'string | array',
  )
  expect(props.find((prop) => prop.name === 'multiple')).toMatchObject({
    type: 'boolean',
    required: false,
  })
})

describe('composed authored props across files', () => {
  function bundle(
    files: Record<string, string>,
    name: string,
  ): Parameters<typeof extract>[0] {
    return {
      fileName: name,
      code: files[name],
      resolveImport: (specifier) =>
        files[specifier] === undefined ? undefined : bundle(files, specifier),
    }
  }
  it('keeps imported names and descriptions through Omit without copying platform attributes', () => {
    const files = {
      Base: `import {HTMLAttributes} from 'react';
export interface BaseProps extends HTMLAttributes<HTMLDivElement> {
  /** Group name. */
  'aria-label'?:string;
  disabled?:boolean;
  value?:string;
  onValueChange?:()=>void
}`,
      Wrapper: `import type {BaseProps as Shared} from 'Base'; export type WrapperProps=Omit<Shared,'value'|'onValueChange'> & {value?:readonly string[]}`,
    }
    const props = extract(bundle(files, 'Wrapper'), 'WrapperProps')
    expect(props.map((p) => p.name)).toEqual([
      'aria-label',
      'disabled',
      'value',
    ])
    expect(props[0]).toMatchObject({
      description: 'Group name.',
      type: 'string',
      required: false,
    })
    expect(props[2]).toMatchObject({ type: 'array' })
  })
  it('handles Pick, Partial, Required and Readonly inheritance', () => {
    const props = extract(
      {
        fileName: 'Choice.tsx',
        code: `interface Base {a:string;b?:boolean;c?:number}; type Alias=Partial<Pick<Base,'a'|'b'>>; interface ChoiceProps extends Required<Readonly<Alias>> {b?:boolean}`,
      },
      'ChoiceProps',
    )
    expect(props.map((p) => [p.name, p.required])).toEqual([
      ['a', true],
      ['b', false],
    ])
  })
  it('extracts only the wrapper own defaults: a type import does not establish runtime forwarding', () => {
    const files = {
      Base: `export interface BaseProps {disabled?:boolean;other?:boolean}; export function Base({disabled=false,other=true}){}`,
      Wrapper: `import {BaseProps} from 'Base'; export type WrapperProps=Omit<BaseProps,never>; export function Wrapper({disabled=true}){}`,
    }
    const props = extract(bundle(files, 'Wrapper'), 'WrapperProps')
    expect(props[0].defaultValue).toBe(true)
    expect(props[1].defaultValue).toBeUndefined()
  })
  it('terminates cyclic imports while retaining declared fields', () => {
    const files = {
      A: `import {BProps} from 'B'; export interface AProps extends BProps {a?:string}`,
      B: `import {AProps} from 'A'; export interface BProps extends AProps {b?:number}`,
    }
    expect(extract(bundle(files, 'A'), 'AProps').map((p) => p.name)).toEqual([
      'b',
      'a',
    ])
  })
  it('does not substitute another Props declaration for an unresolved symbol', () => {
    const files = {
      Base: `export interface OtherProps {wrong:string}`,
      Wrapper: `import {MissingProps} from 'Base'; export type WrapperProps=MissingProps & {correct?:number}`,
    }
    expect(
      extract(bundle(files, 'Wrapper'), 'WrapperProps').map((p) => p.name),
    ).toEqual(['correct'])
  })
})

describe('JSDoc as the single description source', () => {
  it('records union branches that document the same prop differently, including a missing JSDoc', () => {
    const props = extract({
      fileName: 'Choice.tsx',
      code: `
      interface Shared {
        /** Same everywhere. */
        size?: string
      }
      interface Single {
        /** Select one option. */
        multiple?: false
        /** Picked value. */
        value?: string
        hint?: string
      }
      interface Multiple {
        /** Select any number of options. */
        multiple: true
        /** Picked value. */
        value?: string[]
        /** Hint. */
        hint?: string
      }
      type ChoiceProps = Shared & (Single | Multiple)
    `,
    })
    const byName = new Map(props.map((prop) => [prop.name, prop]))
    expect(byName.get('multiple')?.docConflict).toEqual([
      'Select one option.',
      'Select any number of options.',
    ])
    expect(byName.get('hint')?.docConflict).toEqual(['', 'Hint.'])
    expect(byName.get('value')).not.toHaveProperty('docConflict')
    expect(byName.get('size')).not.toHaveProperty('docConflict')
  })
  it('reads prop JSDoc as one line without tags', () => {
    const [prop] = extract({
      fileName: 'Example.tsx',
      code: `interface ExampleProps {
        /**
         * Pre-tokenized lines.
         * One entry per line.
         * @example [[]]
         */
        lines?: string[]
      }`,
    })
    expect(prop.description).toBe('Pre-tokenized lines. One entry per line.')
  })
  it('describes a component by the JSDoc of its own declaration, not the file header', () => {
    expect(
      extractComponentDescription({
        fileName: 'Tile/Tile.tsx',
        code: `
      /** Tile — file header. */
      import { forwardRef } from 'react'
      /** Helper, not the component. */
      const TileRoot = () => null
      /**
       * Composed row with an optional primary action.
       * @deprecated only the text above is a description
       */
      export const Tile = forwardRef(function Tile() { return null })
    `,
      }),
    ).toBe('Composed row with an optional primary action.')
    expect(
      extractComponentDescription({
        fileName: 'Tile.tsx',
        code: `// Header\nexport function Tile() { return null }`,
      }),
    ).toBeUndefined()
  })
  it('follows a re-exported component to its declaring file', () => {
    const files: Record<string, string> = {
      'Icon.tsx': `/** Wrapper header. */\nexport { Renderer as Icon, ICON_NAMES } from './impl'`,
      './impl': `/** Renders built-in icons. */\nexport const Renderer = () => null`,
    }
    const bundle = (name: string): Parameters<typeof extract>[0] => ({
      fileName: name,
      code: files[name],
      resolveImport: (specifier) => (files[specifier] ? bundle(specifier) : undefined),
    })
    expect(extractComponentDescription(bundle('Icon.tsx'))).toBe('Renders built-in icons.')
  })
})
