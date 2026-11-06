import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

// Run against the canonical Face UI owner, then explicitly sync consumers.
// Runtime rendering is entirely local; this importer is only an update tool.
const owner = path.resolve(process.argv[2] || '.');
const sourcePath = process.argv[3] || '/tmp/grenev-iconoteka-02.00.15.json';
const licensePath = process.argv[4] || '/tmp/grenev-iconoteka-LICENSE';
const version = '02.00.15';
const repository = 'https://github.com/iconoteka/iconoteka';
const sourceSha = '562fcdd82ed81aabc2db2bc11abcc2950a756ef088699f3ce07b8b8924bc0722';
const licenseSha = 'b1f8cf2b24ab265e478f3645e56bee3f4f4b65ab3ba18d840027d38ef0457d56';
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const sourceBytes = await fs.readFile(sourcePath);
const licenseBytes = await fs.readFile(licensePath);
if (sha(sourceBytes) !== sourceSha || sha(licenseBytes) !== licenseSha) throw new Error('Unverified Iconoteka source or licence');
const data = JSON.parse(sourceBytes.toString());
if (data.meta.version !== version || data.icons.length !== 1300) throw new Error('Unexpected Iconoteka release');
const upstream = new Map(data.icons.map(icon => [icon.name.split('-')[0], icon]));

// Stable Face UI names describe the component's purpose, not the provider's
// changing search aliases. Suffix /fill selects the upstream solid variant.
const selection = {
  'align-horizontal-center': 'text_align_center',
  'align-horizontal-left': 'text_align_left',
  'align-horizontal-right': 'text_align_right',
  'align-vertical-bottom': 'align_bottom',
  'align-vertical-center': 'align_vertical',
  'align-vertical-top': 'align_top',
  alphabet: 'translate', animation: 'slow_motion',
  'arrow-down': 'arrow_down', 'arrow-left': 'arrow_left',
  'arrow-right': 'arrow_right', 'arrow-up': 'arrow_up',
  arrow_expand_simple: 'fullscreen', arrows_contract_simple: 'fullscreen_exit',
  cart: 'shopping_trolley', chat: 'message', check: 'checkmark',
  'check-off': 'uncheck', 'check-on': 'checkmark_in_square', 'check-mixed': 'delete_in_square',
  clean: 'cleaning', close: 'cross', 'cloud-done': 'cloud_checkmark',
  component: 'puzzle', cookie: 'cookie', copy: 'copy', crop: 'crop_tool',
  cursor: 'cursor', date: 'calendar', delete: 'trash', 'design-tool': 'pen_tool',
  'dev-tools': 'code', down: 'chevron_small_down', download: 'download',
  'floppy-disk': 'floppy_disk', drag: 'drag', ds: 'layers', edit: 'pen',
  face: 'face_smiling', file: 'doc_text', filter: 'filter', folder: 'folder',
  'folder-go': 'folder_opened', full: 'fullscreen', info: 'information',
  left: 'chevron_small_left', legend: 'table_of_contents', 'letter-spacing': 'text_format',
  'layout-sidebar-left': 'picture_in_picture_top_left',
  'layout-sidebar-left-open': 'picture_in_picture_top_left/fill',
  'layout-sidebar-right': 'picture_in_picture_top_right',
  'layout-sidebar-right-open': 'picture_in_picture_top_right/fill',
  'line-height': 'line_spacing_increase', link: 'link', mic: 'microphone',
  minus: 'minus', more: 'more', notification: 'bell', notdef: 'blocked',
  panel: 'picture_in_picture_top_left', 'panel-right': 'picture_in_picture_top_right',
  part: 'view_quilt', pause: 'pause', play: 'triangle_right', plus: 'plus',
  project: 'folder', props: 'sliders', 'radio-off': 'circle', 'radio-on': 'radio_button',
  random: 'shuffle', render: 'desktop', restart: 'replay', right: 'chevron_small_right',
  scroll: 'mouse_scroll', search: 'search', 'select-chevron-down': 'chevron_small_down',
  'select-chevron-right': 'chevron_small_right', 'select-chevron-up': 'chevron_small_up',
  slash: 'face-ui/slash', settings: 'gear', size: 'scale', sound: 'speaker',
  stop: 'square', stat: 'chart_bar', store: 'shopping_bag', switch: 'switches',
  theme: 'circle_half_left', type: 'text_format', up: 'chevron_small_up', unreaded: 'mail_unread',
  user: 'user', userface: 'face_smiling', account: 'user_in_circle',
  'activity-idle': 'pause_in_circle', 'activity-running': 'activity',
  'background-task': 'doc_backup', branch: 'split', browser: 'browser',
  conflict: 'sync_alert', diagnostics: 'bug_report', 'empty-component': 'border_clear',
  error: 'alert', function: 'sigma', 'health-issue': 'heartbeat', home: 'house',
  'no-icon': 'blocked', 'panel-open': 'picture_in_picture_top_left/fill',
  plan: 'list', 'runtime-error': 'doc_alert', star: 'star',
  'task-status': 'assignment_on', terminal: 'prompt', 'token-add': 'add_in_square',
  warning: 'warning', 'visibility-on': 'eye', 'visibility-off': 'visibility_off',
};

const current = await fs.readFile(path.join(owner, 'assets/Icon.tsx'), 'utf8');
const oldNames = [...current.slice(current.indexOf('const icons = {'), current.indexOf('export type IconName')).matchAll(/^ {2}'([^']+)':/gm)].map(match => match[1]);
for (const name of oldNames) if (!Object.hasOwn(selection, name)) throw new Error(`Missing compatible alias: ${name}`);
const contours = {};
const aliases = {};
for (const name of Object.keys(selection).sort()) {
  const source = selection[name];
  const [identity, variant = 'stroke'] = source.split('/');
  const key = source === 'face-ui/slash' ? source : `${identity}/${variant}`;
  // A slash is a typographic separator rather than a pictogram. Retain its
  // semantics as one local contour, expanded to match the 24 px coordinate grid.
  const contour = source === 'face-ui/slash'
    ? 'M7.45 19.4L15.65 4.1L16.55 4.6L8.35 19.9Z'
    : upstream.get(identity)?.variants?.regular?.[variant];
  if (typeof contour !== 'string' || !/^[Mm][\d\s.,+\-MmLlHhVvCcSsQqTtAaZzEe]+$/.test(contour)) throw new Error(`Missing or unsafe Regular SVG: ${source}`);
  contours[key] = contour;
  aliases[name] = key;
}

const changed = [];
async function write(relative, bytes) {
  const destination = path.join(owner, relative);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(destination, bytes);
  changed.push(relative);
}
const registry = `// Generated from Iconoteka ${version}. MIT © 2026 Oleg Turbaba.\n// See NOTICE.json. Do not edit geometry; update the pinned import selection.\nexport const ICONOTEKA_PATHS = ${JSON.stringify(contours, null, 2)} as const;\n\nexport const FACE_UI_ICON_MAP = ${JSON.stringify(aliases, null, 2)} as const;\n`;
await write('assets/iconoteka/registry.ts', registry);
// Remove only the generated control registry from the superseded integration.
// Any locally edited version is preserved and requires explicit resolution.
const legacyControlsPath = path.join(owner, 'assets/iconoteka/controls.tsx');
try {
  const legacyControls = await fs.readFile(legacyControlsPath);
  if (sha(legacyControls) !== '37b56a87bc23261827c9370c5f1cc1e4b023f487d823879b6992a11b63d6d39a') throw new Error('Locally modified legacy control registry');
  await fs.rm(legacyControlsPath);
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
await write('assets/iconoteka/NOTICE.json', `${JSON.stringify({name:'Iconoteka', version, repository, author:'Oleg Turbaba', license:'MIT', licenseText:licenseBytes.toString(), sourceSha256:sourceSha, weight:'regular', viewBox:'0 0 24 24', structuralGlyphs:['slash']}, null, 2)}\n`);
await write('integrations/iconoteka/LICENSE', licenseBytes);
await write('integrations/iconoteka/README.md', `# Iconoteka in Face UI\n\nFace UI uses a local selection of Iconoteka ${version} by Oleg Turbaba under MIT.\nGeneral pictograms use Regular contours; disclosure aliases use chevron_small variants.\nState and utility marks also use Iconoteka Regular. Existing Face UI names remain aliases;\n\`check-mixed\`, \`visibility-on\`, and \`visibility-off\` are also available.\nThe typographic slash separator remains a local structural glyph.\n\nAll icons keep a 20 × 20 CSS box. Iconoteka uses its native 24 × 24 SVG viewBox;\nall contours inherit currentColor,\nand preserve Icon's accessible-name and fallback behavior. No runtime CDN or icon\nframework dependency is required. Static SVG exports and React use the same paths.\n\nThe full MIT notice is in LICENSE and assets/iconoteka/NOTICE.json; the latter is\nretained in both npm runtime builds. Source: ${repository}/tree/${version}.\nPinned data SHA-256: ${sourceSha}.\n\nImport/update from the canonical package with:\n\n\`node integrations/iconoteka/import.mjs . /path/to/icons.json /path/to/LICENSE\`\n\nGenerate in the canonical package first, then sync consumers explicitly.\n`);
await write('assets/Icon.tsx', `import React from 'react';
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

const textOf = (value: unknown) => (typeof value === 'string' ? value.trim() : '') || undefined;

/** Local Iconoteka pictograms, with Face UI's stable sizing and API. */
export const Icon: React.FC<IconProps> = ({ name, className = '', style = {}, 'aria-label': ariaLabel, title }) => {
  const requestedName = textOf(name);
  if (!requestedName) return null;
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
`);
// Generate static exports from the same React contours. No independent geometry
// or fixed black paint.
execFileSync('pnpm', ['exec', 'tsx', '--eval', `import React from 'react'; import {renderToStaticMarkup} from 'react-dom/server'; import fs from 'node:fs'; import {Icon,ICON_NAMES} from './assets/Icon'; for (const name of ICON_NAMES) fs.writeFileSync('assets/Icons/'+name+'.svg',renderToStaticMarkup(React.createElement(Icon,{name}))+'\\n');`], {cwd:owner,stdio:'inherit'});
changed.push(...Object.keys(aliases).map(name => `assets/Icons/${name}.svg`));
const wrapper = (await fs.readFile(path.join(owner,'assets/icons.tsx'),'utf8')).replace(/\nexport function CheckMixedIcon[\s\S]*?\n}\n/, '\n');
await write('assets/icons.tsx', wrapper.replace('export function CheckOnIcon', "export function CheckMixedIcon({ className }: LegacyIconProps = {}) {\n  return FaceUiIcon('check-mixed', className)\n}\n\nexport function CheckOnIcon"));
await write('Checkbox/Checkbox.tsx', (await fs.readFile(path.join(owner,'Checkbox/Checkbox.tsx'),'utf8')).replace('CheckOnIcon, CheckOffIcon, MinusIcon', 'CheckOnIcon, CheckOffIcon, CheckMixedIcon').replace('<MinusIcon />', '<CheckMixedIcon />'));
const description = 'Local Iconoteka pictograms through stable Face UI aliases, with compact disclosure arrows. All icons render at 20x20; unsupported sources render notdef.';
for (const relative of ['assets/Icons/Icons.json']) {
  const doc = JSON.parse(await fs.readFile(path.join(owner, relative), 'utf8'));
  doc.description = description;
  if (doc.props.name.options) doc.props.name.options = Object.keys(aliases);
  doc.props.name.description = 'Stable Face UI alias for a local pictogram or control mark. Unknown names render notdef; blank names render nothing.';
  if (doc.tokenMapping?.notes) doc.tokenMapping.notes = ['Icon inherits currentColor and does not own palette semantics.', 'Rendered icons keep a 20x20 box and native Iconoteka 24x24 viewBox. Disclosure chevrons use compact small variants.', 'SVG counters are transparent and remain correct in both themes.'];
  await write(relative, `${JSON.stringify(doc,null,2)}\n`);
}
await write('Icon/Icon.tsx', (await fs.readFile(path.join(owner,'Icon/Icon.tsx'),'utf8')).replace('Public component wrapper around the shared icon runtime.', 'Public wrapper around the local Iconoteka runtime with stable Face UI aliases.'));
// Public contracts and scenarios belong to Face UI's own contract generator.
execFileSync('pnpm', ['contracts:sync'], { cwd: owner, stdio: 'inherit' });
changed.push('Icon/Icon.json', 'Icon/Icon.accessible-action.face.json', 'Icon/Icon.status-symbol.face.json');
await write('integrations/iconoteka/import.mjs', (await fs.readFile(process.argv[1],'utf8')).replace("process.argv[2] || '../face-ui'", "process.argv[2] || '.'"));
await write('integrations/iconoteka/import-files.json', `${JSON.stringify(changed.sort(),null,2)}\n`);
console.log(JSON.stringify({owner,version,aliases:Object.keys(aliases).length,contours:Object.keys(contours).length,files:changed.length},null,2));
