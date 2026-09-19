import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { Media, type MediaAudioProps, type MediaImageProps } from '../../../../Media/Media'

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
/** A tenth of a second of silence as 8 kHz, 8-bit mono WAV, which every engine plays. */
const silence = (() => {
  const samples = 800
  const bytes = new Uint8Array(44 + samples).fill(128)
  const view = new DataView(bytes.buffer)
  const text = (at: number, value: string) =>
    [...value].forEach((char, index) => view.setUint8(at + index, char.charCodeAt(0)))
  text(0, 'RIFF')
  view.setUint32(4, 36 + samples, true)
  text(8, 'WAVEfmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, 8000, true)
  view.setUint32(28, 8000, true)
  view.setUint16(32, 1, true)
  view.setUint16(34, 8, true)
  text(36, 'data')
  view.setUint32(40, samples, true)
  return URL.createObjectURL(new Blob([bytes], { type: 'audio/wav' }))
})()

/** One audio player with native controls; `broken` is a source no engine can decode. */
const renderPlayer = (
  props: Pick<MediaAudioProps, 'preload'> & { broken?: boolean; fallback?: string } = {},
) => {
  const { broken, ...rest } = props
  flushSync(() =>
    root.render(
      <StrictMode>
        <Media
          key={generation++}
          type="audio"
          src={broken ? 'data:audio/wav;base64,AAAA' : silence}
          controls
          aria-label="Silence"
          {...rest}
        />
      </StrictMode>,
    ),
  )
}
Object.assign(window, { renderMedia, renderPlayer, mediaEvents: events })
export type Hooks = { renderMedia: typeof renderMedia; renderPlayer: typeof renderPlayer }
renderMedia()
