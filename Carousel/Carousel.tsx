/**
 * Carousel — slides shown one position at a time.
 *
 * `<Carousel aria-label="Product tour"><Media src="/a.jpg" alt="Dashboard" /><Media src="/b.jpg" alt="Reports" /></Carousel>`
 */

import {
  forwardRef,
  isValidElement,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from 'react'
import { Button } from '../Button/Button'
import { Media } from '../Media/Media'
import { Text } from '../Text/Text'
import { inertProp } from '../assets/adapters/react/inert-prop'
import { composeHandlers } from '../assets/adapters/react/merge-props'
import { useComposedRefs } from '../assets/adapters/react/use-composed-refs'
import { useControllableState } from '../assets/adapters/react/use-controllable-state'
import { useFocusRecovery } from '../assets/adapters/react/use-focus-recovery'
import { useRovingFocus } from '../assets/adapters/react/use-roving-focus'
import { createAnatomy } from '../assets/anatomy'
import { move, type Move } from '../assets/runtime/collection'
import { keyToMove, readDirection } from '../assets/runtime/keyboard'
import {
  formatLabel,
  resolveLabel,
  resolveLabels,
  type CommonLabels,
} from '../assets/runtime/labels'
import { invalidProp, readNumber } from '../assets/runtime/props'
import {
  hasSlotContent,
  isSlotDescriptor,
  renderSlotContent,
  type SlotContent,
} from '../assets/slot-content'
import { cn } from '../assets/utils'

export interface CarouselLabels
  extends Pick<CommonLabels, 'previous' | 'next'> {
  /** Name of the control that starts automatic rotation. */
  play: string
  /** Name of the control that pauses automatic rotation. */
  pause: string
  /** Name of each slide; `{index}` becomes its number from 1 and `{count}` the number of slides. The kind is `roleSlide`, so the name does not repeat it. */
  slide: string
  /** Name of each indicator; `{index}` becomes the number of the first slide it shows. */
  goToSlide: string
  /** Kind of region the carousel announces, its `aria-roledescription`. */
  roleCarousel: string
  /** Kind of group each slide announces, its `aria-roledescription`. */
  roleSlide: string
}

export interface CarouselProps
  extends Omit<
    HTMLAttributes<HTMLDivElement>,
    | 'children'
    | 'dangerouslySetInnerHTML'
    | 'defaultValue'
    | 'defaultChecked'
    | 'role'
    | 'aria-roledescription'
    | 'autoFocus'
    | 'contentEditable'
    | 'suppressContentEditableWarning'
  > {
  /** The slides in order, one per top-level child: elements, text, or JSON `Media` descriptors. */
  children?: SlotContent
  /** Position shown (controlled): the index of the first visible slide, from 0; past the last position shows the last. */
  index?: number
  /** Position shown on mount (uncontrolled), from 0; later changes are ignored. */
  defaultIndex?: number
  /** Called once per position change a control, key, swipe or autoplay proposes; never for `index` updates. */
  onIndexChange?: (details: {
    /** The proposed position, from 0. */
    index: number
  }) => void
  /** Slides visible side by side, a whole number from 1; each takes that share of the width. Default: 1. */
  slidesPerView?: number
  /** Previous and next, by control, key or swipe, wrap around at the ends instead of stopping there. */
  loop?: boolean
  /** Advances one position per interval, after the last back to the first; a move by the user, keyboard focus inside or a press outside the rotation control stops it, hover pauses it. */
  autoPlay?: boolean
  /** Milliseconds each position shows before autoplay advances, from 100. Default: 3000. */
  autoPlayInterval?: number
  /** Names of the carousel's controls and slides, and the kinds they announce. */
  labels?: Partial<CarouselLabels>
  /** Names the carousel region; without it and `aria-labelledby` the name is "Carousel". */
  'aria-label'?: string
}

const { getPartAttrs: part } = createAnatomy('carousel').parts(
  'root',
  'viewport',
  'slide',
  'indicator',
)

const defaultLabels: CarouselLabels = Object.freeze({
  previous: 'Previous slide',
  next: 'Next slide',
  play: 'Start rotation',
  pause: 'Pause rotation',
  slide: '{index} of {count}',
  goToSlide: 'Go to slide {index}',
  roleCarousel: 'carousel',
  roleSlide: 'slide',
})
/** A carousel region needs a name until a native aria-label or aria-labelledby gives one (K14). */
const defaultRootLabels = Object.freeze({ region: 'Carousel' })

const INDEX = { integer: true, min: 0 } as const
const PER_VIEW = { integer: true, min: 1 } as const
/** Faster rotation is unreadable; the maximum is the longest delay a timer can wait. */
const INTERVAL = { min: 100, max: 2_147_483_647 } as const
/** Pixels a swipe must travel to change the position. */
const SWIPE = 50
/** Custom property the track follows while a pointer drags it. */
const DRAG = '--face-runtime-carousel-drag'

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'
const motionQuery = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(REDUCED_MOTION)
    : null
const subscribeMotion = (onChange: () => void) => {
  const query = motionQuery()
  query?.addEventListener?.('change', onChange)
  return () => query?.removeEventListener?.('change', onChange)
}
const prefersReducedMotion = () => motionQuery()?.matches ?? false
/** Until the client reads the preference, nothing rotates. */
const serverPrefersReducedMotion = () => true

/** Whether focus came from the keyboard rather than a pointer; browsers without `:focus-visible` say yes. */
const keyboardFocus = (target: EventTarget) => {
  try {
    return (target as Element).matches(':focus-visible')
  } catch {
    return true
  }
}

const SLIDE_COMPONENTS = { Media }
const renderText = (value: string | number) => <Text as="div">{value}</Text>

/**
 * One slide per top-level child: nested arrays flatten, empty children drop, text and JSON `Media`
 * descriptors render as components; any other JSON descriptor is reported and dropped.
 */
function slidesOf(children: SlotContent) {
  const slides: Array<{ key: string; node: ReactNode }> = []
  const visit = (node: unknown) => {
    if (Array.isArray(node)) node.forEach(visit)
    else if (
      isSlotDescriptor(node) &&
      !Object.prototype.hasOwnProperty.call(
        SLIDE_COMPONENTS,
        node.__componentName__,
      )
    )
      invalidProp(
        'Carousel',
        'children',
        node.__componentName__,
        'JSON slides are Media descriptors; the slide is left out',
      )
    else if (hasSlotContent(node))
      slides.push({
        key:
          isValidElement(node) && node.key != null
            ? `key:${node.key}`
            : `at:${slides.length}`,
        node: renderSlotContent(node, SLIDE_COMPONENTS, renderText),
      })
  }
  visit(children)
  return slides
}

/** Slides shown one position at a time, with previous and next controls, indicators and optional autoplay. */
export const Carousel = forwardRef<HTMLDivElement, CarouselProps>(
  function Carousel(props, ref) {
    const {
      children,
      index,
      defaultIndex = 0,
      onIndexChange,
      slidesPerView = 1,
      loop = false,
      autoPlay = false,
      autoPlayInterval = 3000,
      labels,
      'aria-label': ariaLabel,
      className,
      style,
      onClick,
      onKeyDown,
      onFocus,
      onPointerDown,
      onPointerEnter,
      onPointerLeave,
      ...rest
    } = props
    const text = resolveLabels(defaultLabels, labels, 'Carousel')
    const slides = slidesOf(children)
    const count = slides.length
    const perView = readNumber(
      'Carousel',
      'slidesPerView',
      slidesPerView,
      1,
      PER_VIEW,
    )
    const positions = Math.max(1, count - perView + 1)
    const last = positions - 1
    const keys = Array.from({ length: positions }, (_, position) =>
      String(position),
    )

    const [stored, setIndex] = useControllableState<number>({
      value:
        index === undefined
          ? undefined
          : readNumber('Carousel', 'index', index, 0, INDEX),
      // Read only while uncontrolled: an unused default reports nothing.
      defaultValue: () =>
        index === undefined
          ? readNumber('Carousel', 'defaultIndex', defaultIndex, 0, INDEX)
          : 0,
      onChange: (next) => onIndexChange?.({ index: next }),
      name: ['Carousel', 'index'],
    })
    const shown = Math.min(stored, last)

    // Rotation: 'auto' follows the reduced-motion preference until the user starts or stops it.
    const [rotation, setRotation] = useState<'auto' | 'on' | 'off'>('auto')
    /** Stops rotation until the rotation control starts it again. */
    const stop = () => {
      if (autoPlay) setRotation('off')
    }
    /** A move the user asks for, by control, key or swipe; it stops rotation. */
    const go = (to: Move | number) => {
      stop()
      const next =
        typeof to === 'number' ? to : move(keys, String(shown), to, loop)
      if (next !== null) setIndex(Number(next))
    }
    const [hovered, setHovered] = useState(false)
    const reducedMotion = useSyncExternalStore(
      subscribeMotion,
      prefersReducedMotion,
      serverPrefersReducedMotion,
    )
    const hasControls = positions > 1
    const rotationOn =
      rotation === 'on' || (rotation === 'auto' && !reducedMotion)
    const rotating = autoPlay && hasControls && rotationOn && !hovered
    const interval = readNumber(
      'Carousel',
      'autoPlayInterval',
      autoPlayInterval,
      3000,
      INTERVAL,
    )
    useEffect(() => {
      if (!rotating) return
      const timer = setTimeout(
        () => setIndex(shown < last ? shown + 1 : 0),
        interval,
      )
      return () => clearTimeout(timer)
    }, [rotating, shown, last, interval, setIndex])

    const rootRef = useRef<HTMLDivElement>(null)
    const composedRef = useComposedRefs(rootRef, ref)
    const controlsRef = useRef<HTMLDivElement>(null)
    const indicatorsRef = useRef<HTMLDivElement>(null)
    const rotationRef = useRef<HTMLButtonElement>(null)
    const prevRef = useRef<HTMLButtonElement>(null)
    const nextRef = useRef<HTMLButtonElement>(null)
    // A previous or next button disabled at an end hands focus to the other one; anything else
    // lost (a slide's content hidden by a controlled change) goes to the current indicator.
    useFocusRecovery(rootRef, (lost) =>
      lost === prevRef.current
        ? nextRef.current
        : lost === nextRef.current
          ? prevRef.current
          : indicatorsRef.current?.querySelector<HTMLElement>('[aria-current]'),
    )
    const roving = useRovingFocus({
      keys,
      active: String(shown),
      orientation: 'horizontal',
      loop,
      activateOnMove: true,
    })

    const onRotation = (target: EventTarget) =>
      !!rotationRef.current?.contains(target as Node)
    const activate = (event: MouseEvent<HTMLDivElement>) => {
      const control = (event.target as Element).closest?.('button')
      if (!control || !controlsRef.current?.contains(control)) return
      const kind = control.getAttribute('data-part')
      if (kind === 'prev') go('prev')
      else if (kind === 'next') go('next')
      else if (kind === 'indicator-item')
        go(Number(control.getAttribute('data-index')))
      else if (kind === 'rotation') setRotation(rotationOn ? 'off' : 'on')
    }
    // Keys on the carousel's own controls move it; slide content keeps its keys. The indicators
    // move focus themselves (roving) and mark the event handled.
    const navigate = (event: KeyboardEvent<HTMLDivElement>) => {
      if (
        event.defaultPrevented ||
        !controlsRef.current?.contains(event.target as Node)
      )
        return
      const to = keyToMove(
        event,
        'horizontal',
        readDirection(event.currentTarget),
      )
      if (!to) return
      event.preventDefault()
      go(to)
    }

    const trackRef = useRef<HTMLDivElement>(null)
    const drag = useRef<{ pointer: number; x: number } | null>(null)
    const follow = (offset: number | null) => {
      const track = trackRef.current
      if (!track) return
      track.toggleAttribute('data-dragging', offset !== null)
      if (offset === null) track.style.removeProperty(DRAG)
      else track.style.setProperty(DRAG, `${offset}px`)
    }
    const release = () => {
      drag.current = null
      follow(null)
    }
    const dragStart = (event: PointerEvent<HTMLDivElement>) => {
      if (
        event.button !== 0 ||
        drag.current ||
        !hasControls ||
        (event.target as Element).closest(
          'a, button, input, select, textarea, label, [contenteditable]',
        )
      )
        return
      drag.current = { pointer: event.pointerId, x: event.clientX }
      event.currentTarget.setPointerCapture?.(event.pointerId)
    }
    const dragMove = (event: PointerEvent<HTMLDivElement>) => {
      if (drag.current?.pointer === event.pointerId)
        follow(event.clientX - drag.current.x)
    }
    const dragEnd = (event: PointerEvent<HTMLDivElement>) => {
      if (drag.current?.pointer !== event.pointerId) return
      const offset = event.clientX - drag.current.x
      release()
      if (Math.abs(offset) < SWIPE) return
      // Dragging the track left brings in what lies to the right, as ArrowRight would.
      const to = keyToMove(
        { key: offset < 0 ? 'ArrowRight' : 'ArrowLeft' },
        'horizontal',
        readDirection(event.currentTarget),
      )
      if (to) go(to)
    }

    const name = resolveLabel(
      ariaLabel,
      defaultRootLabels.region,
      'Carousel',
      'aria-label',
    )
    const rootStyle = {
      ...style,
      '--face-runtime-carousel-slides-per-view': perView,
      '--face-runtime-carousel-index': shown,
    } as CSSProperties

    return (
      <div
        {...rest}
        {...part('root')}
        ref={composedRef}
        role="region"
        aria-roledescription={text.roleCarousel}
        aria-label={name}
        className={cn('uf-carousel', className)}
        style={rootStyle}
        onClick={composeHandlers(onClick, activate)}
        onKeyDown={composeHandlers(onKeyDown, navigate)}
        // Keyboard focus anywhere inside, the rotation control included, stops rotation (APG);
        // so does a press anywhere but on the rotation control, which only toggles it.
        onFocus={composeHandlers(onFocus, (event) => {
          if (!onRotation(event.target) || keyboardFocus(event.target)) stop()
        })}
        onPointerDown={composeHandlers(onPointerDown, (event) => {
          if (!onRotation(event.target)) stop()
        })}
        onPointerEnter={composeHandlers(onPointerEnter, () => setHovered(true))}
        onPointerLeave={composeHandlers(onPointerLeave, () =>
          setHovered(false),
        )}
      >
        <div
          {...part('viewport')}
          aria-live={rotating ? 'off' : 'polite'}
          onDragStart={(event) => event.preventDefault()}
          onPointerDown={dragStart}
          onPointerMove={dragMove}
          onPointerUp={dragEnd}
          onPointerCancel={release}
          onLostPointerCapture={release}
        >
          <div ref={trackRef} className="uf-carousel-track">
            {slides.map(({ key, node }, position) => {
              const visible = position >= shown && position < shown + perView
              return (
                <div
                  key={key}
                  {...part('slide')}
                  {...inertProp(!visible)}
                  role="group"
                  aria-roledescription={text.roleSlide}
                  aria-label={formatLabel(text.slide, {
                    index: position + 1,
                    count,
                  })}
                  data-index={position}
                  data-current={visible ? '' : undefined}
                >
                  {node}
                </div>
              )
            })}
          </div>
        </div>
        {hasControls && (
          // An explicit tabIndex keeps the buttons in WebKit's Tab order, as the indicators are.
          <div ref={controlsRef} className="uf-carousel-controls">
            <div className="uf-carousel-navSlot uf-carousel-navSlot--prev">
              {autoPlay && (
                <Button
                  ref={rotationRef}
                  data-part="rotation"
                  tabIndex={0}
                  icon={rotationOn ? 'pause' : 'play'}
                  iconOnly
                  className="uf-carousel-nav"
                >
                  {rotationOn ? text.pause : text.play}
                </Button>
              )}
              <Button
                ref={prevRef}
                data-part="prev"
                tabIndex={0}
                icon="arrow-left"
                iconOnly
                disabled={!loop && shown === 0}
                className="uf-carousel-nav uf-carousel-navPrev"
              >
                {text.previous}
              </Button>
            </div>
            <div
              ref={indicatorsRef}
              {...part('indicator')}
              {...roving.root}
              className="uf-carousel-indicators"
            >
              {keys.map((key, position) => (
                <Button
                  key={key}
                  {...roving.item(key)}
                  data-part="indicator-item"
                  data-index={position}
                  data-state={position === shown ? 'active' : 'inactive'}
                  aria-current={position === shown || undefined}
                  icon={position === shown ? 'radio-on' : 'radio-off'}
                  iconOnly
                  className="uf-carousel-indicatorButton"
                >
                  {formatLabel(text.goToSlide, { index: position + 1 })}
                </Button>
              ))}
            </div>
            <div className="uf-carousel-navSlot uf-carousel-navSlot--next">
              <Button
                ref={nextRef}
                data-part="next"
                tabIndex={0}
                icon="arrow-right"
                iconOnly
                disabled={!loop && shown === last}
                className="uf-carousel-nav uf-carousel-navNext"
              >
                {text.next}
              </Button>
            </div>
          </div>
        )}
      </div>
    )
  },
)
