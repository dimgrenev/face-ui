import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { FELD_GALLERY_META as galleryMetadata } from '../../gallery'
import * as metadataEntry from '../../gallery-meta'
import { FELD_GALLERY_META, type FeldGalleryMetaEntry } from '../../gallery-meta'

describe('public gallery metadata entry', () => {
  it('exports only the existing metadata object, without a runtime component registry', () => {
    expect(Object.keys(metadataEntry)).toEqual(['FELD_GALLERY_META'])
    expect(FELD_GALLERY_META).toBe(galleryMetadata)
    const entries: readonly FeldGalleryMetaEntry[] = FELD_GALLERY_META
    expect(entries.length).toBeGreaterThan(0)
    expect(entries.find(entry => entry.name === 'Button')?.relativeSourcePath).toBe('Button/Button.tsx')
  })

  it('publishes the narrow ESM, CJS and type entries while retaining the runtime gallery', () => {
    const manifest = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'))
    expect(manifest.exports['./gallery/meta']).toEqual({
      types: './dist/types/gallery-meta.d.ts',
      import: './dist/esm/gallery-meta.js',
      require: './dist/cjs/gallery-meta.js',
    })
    expect(manifest.exports['./gallery']).toEqual({
      types: './dist/types/gallery.d.ts',
      import: './dist/esm/gallery.js',
      require: './dist/cjs/gallery.js',
    })
    expect(manifest.files).toEqual(expect.arrayContaining(['dist/esm', 'dist/cjs', 'dist/types']))
  })
})
