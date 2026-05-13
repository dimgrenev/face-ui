# Icons

SVG files in this directory are the source assets for the built-in Face UI icon set.

The React runtime is exposed through `assets/Icon.tsx` and the public `Icon/Icon.tsx` wrapper. When adding or changing an icon, keep these pieces aligned:

- add or edit the SVG file in this directory
- update the `IconName` union and `ICON_NAMES` list
- add the SVG path data to the built-in icon registry
- keep native colors as `currentColor` where possible

The published package also ships these SVG files under `assets/Icons/*` for tooling that needs raw icon assets.
