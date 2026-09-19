import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { Media, type MediaImageProps } from '../../../../Media/Media'

const root = createRoot(document.getElementById('root')!)
Object.assign(document.body.style, { margin: '16px', background: 'var(--uf-color-bg)' })
const events: string[] = []
let generation = 0
/** A square 400×400 picture; `broken` is a source no browser can decode. */
const sources = {
  square:
    'data:image/svg+xml,' +
    encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="#4a7"/></svg>'),
  broken: 'data:image/png;base64,AAAA',
}

/** One image in a 320px column; its load and error events are recorded with their type. */
const renderMedia = (
  props: Pick<MediaImageProps, 'variant' | 'objectFit' | 'width' | 'height' | 'membrane'> & {
    source?: keyof typeof sources
    fallback?: string
  } = {},
) => {
  events.length = 0
  const { source = 'square', ...rest } = props
  flushSync(() =>
    root.render(
      <StrictMode>
        <div style={{ width: 320 }}>
          <Media
            key={generation++}
            src={sources[source]}
            alt="Green square"
            {...rest}
            onLoad={(event) => events.push(event.type)}
            onError={(event) => events.push(event.type)}
          />
        </div>
      </StrictMode>,
    ),
  )
}
Object.assign(window, { renderMedia, mediaEvents: events })
export type Hooks = { renderMedia: typeof renderMedia }
renderMedia()
