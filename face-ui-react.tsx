import React, { useEffect, useMemo, useRef, useState } from 'react';
// NOTE: This file exists primarily for the Render playground:
// dropping the `face-ui-react/` folder will be recognized as a component folder
// (entry = `face-ui-react/face-ui-react.tsx`), and this component will render a gallery.

import { FELD_GALLERY_ENTRIES } from './utils/__generated__/render_gallery.generated';
import { Bar } from './Bar/Bar';
import { Button } from './Button/Button';
import { Card } from './Card/Card';
import { Text } from './Text/Text';

// NOTE: This file must NOT import global CSS directly (Next.js restriction).
// Component styles for the Render sandbox are collected from VFS by CleanRenderer.
export type FeldGalleryCard = {
  id: string;
  component: string;
  title?: string;
  hidden?: boolean;
  props?: Record<string, any>;
};

export type FeldGalleryFaceV1 = {
  version: 1;
  query?: string;
  cards: FeldGalleryCard[];
};

export type FeldGalleryFace = FeldGalleryFaceV1;

export interface FeldGalleryProps {
  face?: FeldGalleryFace;
}

type FeldGalleryTheme = 'light' | 'dark';

function normalizeGalleryTheme(value: unknown): FeldGalleryTheme | null {
  return value === 'light' || value === 'dark' ? value : null;
}

function readInheritedGalleryTheme(root: HTMLElement | null): FeldGalleryTheme {
  let node = root?.parentElement ?? null;
  while (node) {
    const theme = normalizeGalleryTheme(node.getAttribute('data-theme'));
    if (theme) return theme;
    node = node.parentElement;
  }

  if (typeof document !== 'undefined') {
    const htmlTheme = normalizeGalleryTheme(document.documentElement.getAttribute('data-theme'));
    if (htmlTheme) return htmlTheme;
    const bodyTheme = normalizeGalleryTheme(document.body?.getAttribute('data-theme'));
    if (bodyTheme) return bodyTheme;
  }

  return 'dark';
}

class PreviewErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; message: string }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, message: '' };
  }
  static getDerivedStateFromError(err: any) {
    return { hasError: true, message: err?.message ? String(err.message) : String(err) };
  }
  componentDidCatch() {}
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 8, opacity: 0.7 }}>
          <Text as="span" style={{ fontSize: 12, opacity: 0.8 }}>Preview error</Text>
          <Text as="div" variant="code" size="xs" inset="none" membrane={false} style={{ marginTop: 4 }}>
            {this.state.message}
          </Text>
        </div>
      );
    }
    return this.props.children as any;
  }
}

const createDefaultFace = (): FeldGalleryFaceV1 => {
  const list = Array.isArray(FELD_GALLERY_ENTRIES) ? FELD_GALLERY_ENTRIES : [];
  const cards: FeldGalleryCard[] = list.map((e, idx) => {
    const name = String((e as any)?.name || 'Component');
    return { id: `${name}:${idx}`, component: name, title: name };
  });
  return { version: 1, query: '', cards };
};

const normalizeFace = (input: FeldGalleryFaceV1): FeldGalleryFaceV1 => {
  const cards = Array.isArray(input?.cards) ? input.cards : [];
  return {
    version: 1,
    query: String(input?.query || ''),
    cards: cards.map((card, idx) => ({
      id: String(card?.id || `${String(card?.component || 'Component')}:${idx}`),
      component: String(card?.component || 'Component'),
      title: card?.title != null ? String(card.title) : undefined,
      hidden: Boolean(card?.hidden),
    })),
  };
};

function resolveCardComponentKey(rawComponent: unknown): string {
  const raw = String(rawComponent || '').trim();
  if (!raw) return '';
  const noQuery = raw.split('?')[0];
  const noExt = noQuery.replace(/\.(tsx|jsx|ts|js)$/i, '');
  const parts = noExt.split('/').filter(Boolean);
  if (parts.length === 0) return '';
  const leaf = parts[parts.length - 1] || '';
  if (leaf.toLowerCase() === 'index' && parts.length > 1) {
    return String(parts[parts.length - 2] || '').trim().toLowerCase();
  }
  return leaf.trim().toLowerCase();
}

function resolveRenderableComponent(candidate: any, fallbackExportName?: string): any {
  try {
    if (!candidate) return null;
    const t = typeof candidate;
    if (t === 'function') return candidate;
    if (t === 'object') {
      if ((candidate as any).$$typeof) return candidate;
      if (fallbackExportName && (candidate as any)[fallbackExportName]) {
        const fromNamed = resolveRenderableComponent((candidate as any)[fallbackExportName]);
        if (fromNamed) return fromNamed;
      }
      if ((candidate as any).default) {
        const fromDefault = resolveRenderableComponent((candidate as any).default);
        if (fromDefault) return fromDefault;
      }
      for (const key of Object.keys(candidate)) {
        const fromAny = resolveRenderableComponent((candidate as any)[key]);
        if (fromAny) return fromAny;
      }
    }
  } catch {}
  return null;
}

// IMPORTANT:
// Компоненты не должны содержать sandbox-специфичные костыли (типа распаковки module namespace объектов).
// Совместимость sandbox обеспечивается на стороне iframe-хоста (`public/runtime/sandbox/react-host.js`).

// Navigation belongs to the demo boundary, not to the shared link components.
function preventGalleryNavigation(event: React.MouseEvent<HTMLElement>) {
  if (event.target instanceof Element && event.target.closest('a[href]')) event.preventDefault();
}

export default function faceUiReact(props: FeldGalleryProps) {
  const galleryRef = useRef<HTMLDivElement | null>(null);
  const face = (props && props.face && typeof props.face === 'object' && Array.isArray((props.face as any).cards))
    ? normalizeFace(props.face as FeldGalleryFaceV1)
    : createDefaultFace();

  const [localFaceOverride, setLocalFaceOverride] = useState<FeldGalleryFaceV1 | null>(null);
  const effectiveFace = localFaceOverride || face;

  const [themeOverride, setThemeOverride] = useState<FeldGalleryTheme | null>(null);
  const [inheritedTheme, setInheritedTheme] = useState<FeldGalleryTheme>(() => 'dark');
  const theme: FeldGalleryTheme = themeOverride ?? inheritedTheme;

  useEffect(() => {
    const updateInheritedTheme = () => {
      setInheritedTheme(readInheritedGalleryTheme(galleryRef.current));
    };

    updateInheritedTheme();

    if (typeof MutationObserver === 'undefined' || typeof document === 'undefined') return undefined;

    const observer = new MutationObserver(updateInheritedTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
      subtree: true,
    });
    if (document.body) {
      observer.observe(document.body, {
        attributes: true,
        attributeFilter: ['data-theme'],
        subtree: true,
      });
    }

    return () => observer.disconnect();
  }, []);

  const entryByName = useMemo(() => {
    const map = new Map<string, any>();
    const list = Array.isArray(FELD_GALLERY_ENTRIES) ? FELD_GALLERY_ENTRIES : [];
    for (const e of list) {
      const raw = String(e?.name || '');
      const key = resolveCardComponentKey(raw);
      if (!key) continue;
      map.set(key, e);
    }
    return map;
  }, []);

  const visibleCards = useMemo(() => {
    const list = Array.isArray(effectiveFace.cards) ? effectiveFace.cards : [];
    return list.filter((c) => !c?.hidden);
  }, [effectiveFace.cards]);

  return (
    <div ref={galleryRef} className="uf-gallery" data-theme={theme}>
      <Bar className="uf-gallery-header">
        <Bar.Section grow>
          <Text as="span" className="uf-gallery-title" fullWidth truncate>face-ui-react</Text>
        </Bar.Section>
        <Bar.Section align="end">
          <Button
            type="button"
            className="uf-gallery-icon-button"
            icon="theme"
            iconOnly
            membrane
            title="Toggle theme"
            aria-label="Toggle theme"
            onClick={() => setThemeOverride(theme === 'dark' ? 'light' : 'dark')}
          />
          <Button
            type="button"
            className="uf-gallery-icon-button"
            icon="clean"
            iconOnly
            membrane
            title="Clear"
            aria-label="Clear"
            onClick={() => { setLocalFaceOverride(null); setThemeOverride(null); }}
          />
        </Bar.Section>
      </Bar>

      <div className="uf-gallery-grid" onClick={preventGalleryNavigation} onAuxClick={preventGalleryNavigation}>
        {visibleCards.map((card) => {
          const rawName = String(card?.component || 'Component');
          const normalizedName = resolveCardComponentKey(rawName);
          const cleanLeafName = (() => {
            const noExt = rawName.replace(/\.(tsx|jsx|ts|js)$/i, '');
            const parts = noExt.split('/').filter(Boolean);
            if (parts.length === 0) return rawName;
            const leaf = parts[parts.length - 1];
            if (leaf.toLowerCase() === 'index' && parts.length > 1) return parts[parts.length - 2];
            return leaf;
          })();
          const entry = entryByName.get(normalizedName);
          const rawCmp: any = entry ? (entry as any).Component : null;
          const Cmp: any = resolveRenderableComponent(rawCmp, cleanLeafName);
          // Keep strict preview parity with single-component mode:
          // generated meta derives sampleProps from the component contract default state.
          // We intentionally ignore card-level props here to prevent stale/empty overrides
          // from drifting the showcase away from the per-component folder preview.
          const baseSampleProps = ((entry as any)?.sampleProps && typeof (entry as any).sampleProps === 'object')
            ? (entry as any).sampleProps
            : {};
          const sampleProps = baseSampleProps;
          return (
            <div key={card?.id || rawName} className="uf-gallery-item">
              <Text as="div" className="uf-gallery-itemTitle" fullWidth truncate membrane>
                {String(card?.title || cleanLeafName)}
              </Text>
              <div className="uf-gallery-itemPreview">
                <Card
                  border={false}
                  className="uf-gallery-itemSurface"
                >
                  <PreviewErrorBoundary>
                    {Cmp ? <Cmp {...sampleProps} /> : <Text as="span" className="uf-text-body">No component export</Text>}
                  </PreviewErrorBoundary>
                </Card>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
