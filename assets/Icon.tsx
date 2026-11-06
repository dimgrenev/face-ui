import React from 'react';
import { invalidProp } from './runtime/props';
import { FACE_UI_ICON_MAP, ICONOTEKA_PATHS } from './iconoteka/registry';

export type IconName = keyof typeof FACE_UI_ICON_MAP;
export const ICON_NAMES = Object.keys(FACE_UI_ICON_MAP) as IconName[];

export interface IconProps {
  /** Stable Face UI alias. Unknown names render notdef; a blank name renders nothing. */
  name: IconName | string;
  /** Class of the fixed 20 px SVG box. */
  className?: string;
  /** Paint/transform styles; width and height stay fixed at 20 px. */
  style?: Omit<React.CSSProperties, 'width' | 'height'>;
  /** Accessible name; icons without a label or title are decorative. */
  'aria-label'?: string;
  /** Native pointer hint and accessible name when aria-label is absent. */
  title?: string;
}

/** A host-owned renderer for this package's named icon slots. */
export type IconRenderer = React.ComponentType<IconProps>;

export interface IconProviderProps {
  children: React.ReactNode;
  /** Inherit when omitted; null restores the built-in renderer for this subtree. */
  renderer?: IconRenderer | null;
}

const IconRendererContext = React.createContext<IconRenderer | null>(null);

/** Share one icon renderer with controls and their React portals. */
export const IconProvider: React.FC<IconProviderProps> = ({ children, renderer }) => {
  const inheritedRenderer = React.useContext(IconRendererContext);
  return (
    <IconRendererContext.Provider value={renderer === undefined ? inheritedRenderer : renderer}>
      {children}
    </IconRendererContext.Provider>
  );
};

const textOf = (value: unknown) => (typeof value === 'string' ? value.trim() : '') || undefined;

/** Local Iconoteka pictograms, with Face UI's stable sizing and API. */
export const Icon: React.FC<IconProps> = ({ name, className = '', style = {}, 'aria-label': ariaLabel, title }) => {
  const Renderer = React.useContext(IconRendererContext);
  const requestedName = textOf(name);
  if (!requestedName) return null;
  if (Renderer) {
    return <Renderer name={requestedName} className={className} style={style} aria-label={ariaLabel} title={title} />;
  }
  const known = Object.prototype.hasOwnProperty.call(FACE_UI_ICON_MAP, requestedName);
  if (!known) invalidProp('Icon', 'name', requestedName, 'rendering notdef');
  const builtinName: IconName = known ? requestedName as IconName : 'notdef';
  const source = FACE_UI_ICON_MAP[builtinName];
  const accessibleLabel = textOf(ariaLabel);
  const accessibleTitle = textOf(title);
  const ariaProps = accessibleLabel || accessibleTitle
    ? { role: 'img' as const, 'aria-label': accessibleLabel }
    : { 'aria-hidden': true as const };

  return (
    <svg className={['uf-icon', className].filter(Boolean).join(' ')}
      width={20} height={20} viewBox="0 0 24 24" fill="none"
      xmlns="http://www.w3.org/2000/svg" style={{ ...style, width: 20, height: 20 }}
      data-icon={requestedName} data-iconset={source.startsWith('face-ui/') ? 'face-ui' : 'iconoteka'}
      data-icon-source={source} {...ariaProps}>
      {accessibleTitle ? <title>{accessibleTitle}</title> : null}
      <path d={ICONOTEKA_PATHS[source as keyof typeof ICONOTEKA_PATHS]} fill="currentColor" fillRule="evenodd" clipRule="evenodd" />
    </svg>
  );
};

export default Icon;
