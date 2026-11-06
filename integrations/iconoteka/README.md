# Iconoteka in Face UI

Face UI uses a local selection of Iconoteka 02.00.15 by Oleg Turbaba under MIT.
General pictograms use Regular contours; disclosure aliases use chevron_small variants.
State and utility marks also use Iconoteka Regular. Existing Face UI names remain aliases;
`check-mixed`, `visibility-on`, and `visibility-off` are also available.
The typographic slash separator remains a local structural glyph.

All icons keep a 20 × 20 CSS box. Iconoteka uses its native 24 × 24 SVG viewBox;
all contours inherit currentColor,
and preserve Icon's accessible-name and fallback behavior. No runtime CDN or icon
framework dependency is required. Static SVG exports and React use the same paths.

The full MIT notice is in LICENSE and assets/iconoteka/NOTICE.json; the latter is
retained in both npm runtime builds. Source: https://github.com/iconoteka/iconoteka/tree/02.00.15.
Pinned data SHA-256: 562fcdd82ed81aabc2db2bc11abcc2950a756ef088699f3ce07b8b8924bc0722.

Import/update from the canonical package with:

`node integrations/iconoteka/import.mjs . /path/to/icons.json /path/to/LICENSE`

Generate in the canonical package first, then sync consumers explicitly.
