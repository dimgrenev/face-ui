# Text height

`heightMode` separates vertical sizing from horizontal inset and typography.

```tsx
<Text text="Control label" />
<Text as="p" heightMode="content" membrane={false} text="A paragraph with horizontal breathing room." />
<Text as="span" heightMode="content" inset="none" membrane={false}>An inline run</Text>
```

| Prop | Default | Behavior |
| --- | --- | --- |
| `heightMode="control"` | Yes | Keeps each variant's existing control height and vertical padding. |
| `heightMode="content"` | No | Removes fixed/minimum height and vertical padding. Height follows the rendered line boxes, including wrapped lines. |

`heightMode` does not change `inset`, font size, line height, alignment or membrane. `inset="control"` retains `--uf-text-pad-x` / `--uf-control-pad-text`; `inset="none"` stays flush. Membrane remains opt-in/out through its existing prop and is outside the Text box.

Use content mode for paragraphs and headings in an editorial layout. Keep the default for labels aligned with other controls. Don't compensate for control height with negative margins. Put paragraph/list layout outside Text's inline content slot; use a Text for each paragraph or list item.

The standalone `assets/styles/text.css` entry point contains Text styles only. It is also imported by `components.css`. Consumers using the standalone entry must provide Face UI tokens (or their documented typography/spacing overrides).

Validation covers semantic tags, native props/ref, both height modes, inset independence, and measured browser padding/line boxes at narrow and wide widths.
