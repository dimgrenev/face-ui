# Icons

SVG files in this directory are the raw source assets for the built-in Face UI icon set.

The single React runtime registry is `assets/Icon.tsx`. Do not add React icon registries or component entrypoints to this directory. When adding or changing an icon, keep these pieces aligned:

- add or edit the SVG file in this directory
- update the `IconName` union and `ICON_NAMES` list
- add the SVG path data to the built-in icon registry
- keep native colors as `currentColor` where possible

The published package also ships these SVG files under `assets/Icons/*` for tooling that needs raw icon assets.
