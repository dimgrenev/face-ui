/** Command — a search field that filters a list of commands, in the page or in a dialog. */
import {
  forwardRef,
  useId,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from 'react'
import { Membrane } from '../assets/adapters/react/Membrane'
import { composeHandlers } from '../assets/adapters/react/merge-props'
import { useBodyScrollLock } from '../assets/adapters/react/use-body-scroll-lock'
import { useComposedRefs } from '../assets/adapters/react/use-composed-refs'
import { useControllableState } from '../assets/adapters/react/use-controllable-state'
import { useIsomorphicLayoutEffect } from '../assets/adapters/react/use-isomorphic-layout-effect'
import { useLayer } from '../assets/adapters/react/use-layer'
import { useResponsiveOverlaySurface } from '../assets/adapters/react/use-responsive-overlay-surface'
import { createAnatomy } from '../assets/anatomy'
import type { CollectionItem, ItemGroup } from '../assets/internal/item'
import {
  domId,
  move,
  readCollection,
  type Entry,
} from '../assets/runtime/collection'
import { keyToMove } from '../assets/runtime/keyboard'
import {
  resolveLabel,
  resolveLabels,
  type CommonLabels,
} from '../assets/runtime/labels'
import { invalidProp } from '../assets/runtime/props'
import { matchesSearch } from '../assets/runtime/search'
import { hasSlotContent } from '../assets/slot-content'
import { cn } from '../assets/utils'
import { Button } from '../Button/Button'
import { Card } from '../Card/Card'
import { Icon } from '../Icon/Icon'
import { Text } from '../Text/Text'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** One command of a Command list. */
export interface CommandItem extends CollectionItem {
  /** More words the search finds the item by, such as synonyms; they are not shown. */
  keywords?: readonly string[]
}

/** What `items` holds: commands and labelled groups of them. */
export type CommandItemEntry = CommandItem | ItemGroup<CommandItem>

/** Strings Command renders itself. */
export type CommandLabels = Pick<CommonLabels, 'empty'>

export interface CommandProps
  extends Omit<
    HTMLAttributes<HTMLInputElement>,
    | 'children'
    | 'dangerouslySetInnerHTML'
    | 'role'
    | 'defaultValue'
    | 'defaultChecked'
    | 'onChange'
    | 'onSelect'
    | 'hidden'
    | 'dir'
    | 'contentEditable'
    | 'suppressContentEditableWarning'
    | 'aria-activedescendant'
    | 'aria-autocomplete'
    | 'aria-controls'
    | 'aria-expanded'
    | 'aria-haspopup'
  > {
  /** Commands and labelled groups in list order; an item repeating an earlier value is dropped. */
  items?: readonly CommandItemEntry[]
  /** Search text that filters the items; the parent owns it while set. */
  search?: string
  /** Search text on mount when `search` is not set; read once. */
  defaultSearch?: string
  /** Called once per edit of the search field; never for prop updates. */
  onSearchChange?: (details: { search: string }) => void
  /** Called when the user picks an enabled item by click or Enter; a dialog then closes. */
  onSelect?: (details: { value: string }) => void
  /** Hint in the empty search field and the dialog trigger; names the search without aria-label. */
  placeholder?: string
  /** Where the search shows: in the page, or in a dialog opened from a trigger; auto is a dialog below 900px. Default auto. */
  surface?: 'auto' | 'inline' | 'dialog'
  /** Controlled visibility of the dialog; an inline Command is always shown. */
  open?: boolean
  /** Dialog visibility on mount when `open` is not set; read once. */
  defaultOpen?: boolean
  /** Called once per user request to open or close the dialog; a controlled parent may refuse it. */
  onOpenChange?: (details: { open: boolean }) => void
  /** Names the search field, its list and dialog, and the dialog trigger. */
  'aria-label'?: string
  /** Ids of the elements that name the search field, its list and dialog, and the trigger; wins over aria-label. */
  'aria-labelledby'?: string
  /** Strings Command renders itself: `empty` replaces the list when no item matches. */
  labels?: Partial<CommandLabels>
  /** Class on the search box, as is `style`; the other native attributes and ref go on the search field. */
  className?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const { getPartAttrs: part } = createAnatomy('command').parts(
  'root',
  'input',
  'list',
  'group',
  'groupLabel',
  'item',
  'empty',
)
const defaultLabels: CommandLabels = Object.freeze({
  empty: 'No results found.',
})

const kindOf = (item: unknown) => {
  const { type } = item as { type?: unknown }
  return type === 'group' || type === 'separator' ? type : 'item'
}

// ---------------------------------------------------------------------------
// Command
// ---------------------------------------------------------------------------

/** A search field that filters a list of commands, in the page or in a dialog. */
export const Command = forwardRef<HTMLInputElement, CommandProps>(
  function Command(props, ref) {
    const {
      items,
      search,
      defaultSearch = '',
      onSearchChange,
      onSelect,
      placeholder,
      surface = 'auto',
      open,
      defaultOpen = false,
      onOpenChange,
      labels,
      className,
      style,
      id,
      onKeyDown,
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledby,
      ...rest
    } = props
    const strings = resolveLabels(defaultLabels, labels, 'Command')

    // Search: the list is a projection of the current items and search, never stored.
    const [searchState, setSearch] = useControllableState<string>({
      value: search,
      defaultValue: defaultSearch,
      onChange: (next) => onSearchChange?.({ search: next }),
      name: ['Command', 'search'],
    })
    let query = searchState
    if (typeof query !== 'string') {
      invalidProp(
        'Command',
        search === undefined ? 'defaultSearch' : 'search',
        query,
        'using ""',
      )
      query = ''
    }
    const collection = readCollection<CommandItemEntry>(items, {
      component: 'Command',
      key: (item) => (item as CommandItem).value,
    })
    const visible = new Set<string>()
    const enabled: string[] = []
    for (const entry of collection.entries) {
      if (kindOf(entry.item) !== 'item') continue
      if (!entry.text)
        invalidProp(
          'Command',
          'textValue',
          undefined,
          `the search finds item ${JSON.stringify(entry.key)} by its keywords only`,
        )
      const words = (entry.item as CommandItem).keywords ?? []
      if (!matchesSearch(query, [entry.text].concat(words))) continue
      visible.add(entry.key)
      if (!entry.disabled) enabled.push(entry.key)
    }

    // Highlight: a new search starts at its first enabled item; a highlight that is filtered out
    // or disabled falls back there too.
    const [pick, setPick] = useState<string | null>(null)
    const [pickedFor, setPickedFor] = useState(query)
    if (pickedFor !== query) {
      setPickedFor(query)
      setPick(null)
    }
    const active =
      pick !== null && enabled.includes(pick) ? pick : (enabled[0] ?? null)

    // Surface.
    const resolved = useResponsiveOverlaySurface(
      surface === 'dialog' ? 'sheet' : surface === 'inline' ? 'popover' : 'auto',
    )
    const dialog = resolved === 'sheet'
    const [openState, setOpen] = useControllableState<boolean>({
      value: open,
      defaultValue: defaultOpen,
      onChange: (next) => onOpenChange?.({ open: next }),
      name: ['Command', 'open'],
    })
    const shown = !dialog || !!openState
    const close = () => setOpen(false)
    const choose = (key: string) => {
      if (!enabled.includes(key)) return
      onSelect?.({ value: key })
      if (dialog) close()
    }

    const baseId = useId()
    const listId = `${baseId}-list`
    const dialogId = `${baseId}-dialog`
    const optionId = (key: string) => domId(listId, 'option', key)
    const inputRef = useRef<HTMLInputElement | null>(null)
    const inputRefs = useComposedRefs(inputRef, ref)
    const listRef = useRef<HTMLDivElement | null>(null)
    const paletteRef = useRef<HTMLDivElement | null>(null)
    const triggerRef = useRef<HTMLButtonElement | null>(null)

    useBodyScrollLock(dialog && shown)
    useLayer({
      enabled: dialog && shown,
      contentRef: paletteRef,
      triggerRef,
      modal: true,
      autoFocus: true,
      restoreFocus: true,
      onEscape: close,
      onOutside: close,
    })
    // A new search shows its results from the top.
    useIsomorphicLayoutEffect(() => {
      if (listRef.current) listRef.current.scrollTop = 0
    }, [query])

    // Naming: aria-labelledby, else aria-label, else the placeholder names every part.
    const name = resolveLabel(ariaLabel, '', 'Command', 'aria-label') || undefined
    const hint = resolveLabel(placeholder, '', 'Command', 'placeholder') || undefined
    const naming = ariaLabelledby
      ? { 'aria-labelledby': ariaLabelledby }
      : { 'aria-label': name ?? hint }
    if (!ariaLabelledby && !name && !hint)
      invalidProp(
        'Command',
        'aria-label',
        undefined,
        'the search has no accessible name; pass aria-label, aria-labelledby or placeholder',
      )

    const onInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
      // Home and End stay with the text caret.
      const to = keyToMove(event, 'vertical', 'ltr')
      if (to === 'next' || to === 'prev') {
        event.preventDefault()
        const next = move(enabled, active, to)
        if (next === null) return
        setPick(next)
        // Highlighting changes no structure, so the option to reveal is already in place.
        event.currentTarget.ownerDocument
          .getElementById(optionId(next))
          ?.scrollIntoView?.({ block: 'nearest' })
      } else if (
        event.key === 'Enter' &&
        active !== null &&
        !event.nativeEvent.isComposing &&
        event.keyCode !== 229
      ) {
        event.preventDefault()
        choose(active)
      }
    }

    const renderItem = ({ key, item, disabled: off }: Entry<CommandItemEntry>) => {
      const { label, icon } = item as CommandItem
      const current = key === active
      return (
        <Membrane
          key={key}
          fullWidth
          className="uf-command-itemMembrane"
          data-disabled={off || undefined}
          // The pointer highlights what it moves over; a list scrolled by keys under a resting pointer does not.
          onPointerMove={(event: PointerEvent<HTMLElement>) => {
            if (!off && !current && event.pointerType !== 'touch') setPick(key)
          }}
          onClick={() => choose(key)}
        >
          <Button
            {...part('item')}
            id={optionId(key)}
            role="option"
            aria-selected={current}
            aria-disabled={off || undefined}
            data-value={key}
            data-highlighted={current ? '' : undefined}
            data-disabled={off ? '' : undefined}
            tabIndex={-1}
            disabled={off}
            icon={icon}
            membrane={false}
            fullWidth
            align="start"
            stretchText
            className="uf-command-item"
          >
            {label}
          </Button>
        </Membrane>
      )
    }
    const renderEntries = (parent: string | null): ReactNode[] =>
      collection.children(parent).flatMap((entry) => {
        if (kindOf(entry.item) !== 'group')
          return visible.has(entry.key) ? [renderItem(entry)] : []
        const children = renderEntries(entry.key)
        if (!children.length) return []
        const { label } = entry.item as ItemGroup<CommandItem>
        const labelId = domId(listId, 'group', entry.key)
        const labelled = hasSlotContent(label)
        return [
          <div
            key={entry.key}
            {...part('group')}
            role="group"
            aria-labelledby={labelled ? labelId : undefined}
          >
            {labelled && (
              // Names the group through aria-labelledby; a listbox has no place for plain text.
              <div {...part('groupLabel')} id={labelId} aria-hidden="true">
                <Text as="span" size="xs" inset="none" membrane={false}>
                  {label}
                </Text>
              </div>
            )}
            {children}
          </div>,
        ]
      })

    const palette = (
      <Card
        {...part('root')}
        ref={paletteRef}
        id={dialog ? dialogId : undefined}
        padding={dialog ? 'none' : 'membrane'}
        radius="md"
        fullWidth
        className={cn('uf-command', className)}
        style={style}
        data-surface={dialog ? 'dialog' : 'inline'}
        role={dialog ? 'dialog' : undefined}
        aria-modal={dialog || undefined}
        {...(dialog ? naming : {})}
        tabIndex={dialog ? -1 : undefined}
        // A press anywhere but the field keeps focus, and the keyboard, in the search.
        onMouseDown={(event: MouseEvent<HTMLDivElement>) => {
          if (event.target !== inputRef.current) event.preventDefault()
        }}
      >
        <Membrane
          fullWidth
          as="div"
          className="uf-command__inputMembrane"
          interactive
          target="input"
        >
          <input
            autoCorrect="off"
            spellCheck={false}
            {...rest}
            {...part('input')}
            ref={inputRefs}
            id={id}
            type="text"
            role="combobox"
            aria-expanded
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={active !== null ? optionId(active) : undefined}
            aria-label={name}
            aria-labelledby={ariaLabelledby}
            autoComplete="off"
            placeholder={hint}
            value={query}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={composeHandlers(onKeyDown, onInputKeyDown)}
          />
        </Membrane>
        <div {...part('list')} ref={listRef} id={listId} role="listbox" {...naming}>
          {renderEntries(null)}
        </div>
        {!visible.size && (
          <div {...part('empty')}>
            <Text as="span" inset="none" membrane={false}>
              {strings.empty}
            </Text>
          </div>
        )}
      </Card>
    )

    if (!dialog) return palette
    return (
      <div
        className="uf-commandSurface"
        data-surface="dialog"
        data-state={shown ? 'open' : 'closed'}
      >
        <Membrane fullWidth className="uf-command__triggerMembrane" interactive>
          <button
            ref={triggerRef}
            type="button"
            className="uf-command__trigger"
            aria-haspopup="dialog"
            aria-expanded={shown}
            aria-controls={shown ? dialogId : undefined}
            {...naming}
            onClick={() => setOpen(true)}
          >
            <span className="uf-command__triggerIcon" aria-hidden="true">
              <Icon name="search" />
            </span>
            <Text
              as="span"
              membrane={false}
              inset="none"
              className={cn(
                'uf-command__triggerLabel',
                !query && 'uf-command__triggerLabel--placeholder',
              )}
            >
              {query || hint}
            </Text>
          </button>
        </Membrane>
        <div
          className="uf-responsive-overlay-backdrop"
          data-state={shown ? 'open' : 'closed'}
        />
        <div className="uf-command__dialog" data-state={shown ? 'open' : 'closed'}>
          {shown ? palette : null}
        </div>
      </div>
    )
  },
)
