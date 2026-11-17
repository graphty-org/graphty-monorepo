# Hooks, helpers and constants

The package also exports the small pieces its components are built from, for a control of your own
that should behave like theirs.

| Export                                                                                                                                            | What it does                                                                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useActualColorScheme(fallback?)`                                                                                                                 | The color scheme in force, `"light"` or `"dark"`, with Mantine's `"auto"` resolved from the system preference. `fallback` (default `"dark"`) is used where there is no system preference to read, such as server rendering. |
| `useDirection()`, `isRtl(direction)`                                                                                                              | The text direction set by Mantine's `DirectionProvider` (`"ltr"` with no provider), and whether a direction runs right to left. See [Right-to-left languages](./i18n#right-to-left-languages).                              |
| `getActivationMeta(event)`                                                                                                                        | Whether a click or key event came from a pointer or the keyboard, as `{ source: "pointer" \| "keyboard" }`: the `meta` the rows pass to `onClick` (see [Handling events](./events)), for a row of your own.                 |
| `ensureCompactStyles()`                                                                                                                           | Puts the theme's stylesheet into `document.head` once. The theme and its components already call it; call it yourself for a shadow root. See [Stylesheet, SSR and shadow roots](./theme#stylesheet-ssr-and-shadow-roots).   |
| `useLocale()`, `useNumberParser()`, `parseLocaleNumber(text, locale)`                                                                             | The locale numbers are formatted for, and a parser that reads a number typed in that locale (`3,14` in German is 3.14). See [Internationalization](./i18n#internationalization).                                            |
| `useScrub(enabled, rtl, callbacks)`                                                                                                               | The horizontal drag on a field's leading glyph that changes its value: returns the pointer handlers to spread on the glyph, and reports start, change and end so one drag is one undo step.                                 |
| `useFileDrop(ref, onFiles, options?)`, `pickFiles(options?)`                                                                                      | Files dropped on an element, and the browser's file picker (call it from a click or key handler). `FileSource` is built from both.                                                                                          |
| `focusWithRing(element)`                                                                                                                          | Moves focus to a field the reader did not press and draws its focus ring there, as keyboard focus would.                                                                                                                    |
| `FieldCaret`, `ListboxCheck`, `LISTBOX_CLASS_NAMES`                                                                                               | A select field's caret, the check column of a list option, and the class names that make a list built on Mantine's `Combobox` look like every `Select`'s.                                                                   |
| `MenuShortcut`, `MenuItemDescription`                                                                                                             | A menu row's keyboard shortcut and its second line, for `Menu.Item`.                                                                                                                                                        |
| `EllipsizedName`                                                                                                                                  | A name that ellipsizes in a narrow row and shows the whole string in a tooltip only while it is cut short.                                                                                                                  |
| `mixHex(from, to, t)`                                                                                                                             | The color a fraction `t` (0 to 1) of the way between two hex colors, as `#RRGGBB`.                                                                                                                                          |
| `isLightColor(color)`                                                                                                                             | Whether a hex color is near-white (every channel at or above `E0`), so a swatch of it needs a ring to show on a white surface.                                                                                              |
| `colorWord(color)`                                                                                                                                | A hex color as a reader says it in English ("purple", "dark indigo"), for a tooltip or a spoken name beside the hex code.                                                                                                   |
| `isValidHex`, `normalizeHexa`, `parseHexaColor`, `toHexaColor`, `opacityToAlphaHex`, `parseAlphaFromHexa`, `MAX_ALPHA_HEX`, `MAX_OPACITY_PERCENT` | Reading, checking and writing `#RRGGBBAA` colors and converting between an opacity percentage (0 to 100) and its two hex digits.                                                                                            |
| `createColorStop`, `createDefaultGradientStops`, `DEFAULT_GRADIENT_STOP_COLOR`                                                                    | Gradient stops with fresh ids, for the value of `GradientEditor`.                                                                                                                                                           |
| `SWATCH_COLORS_HEXA`                                                                                                                              | The swatches `CompactColorInput`'s picker offers.                                                                                                                                                                           |
| `COMPACT_SIZING`, `MANTINE_SPACING`, `PANEL_GRID`, `PANEL_INK`                                                                                    | The compact sizes, spacing steps, panel grid and panel colors, for a custom control that lines up with the rest. See [The panel grid](./panel-grid).                                                                        |
| `POPOUT_Z_INDEX_BASE`, `POPOUT_GAP`, `POPOUT_NESTED_GAP`                                                                                          | The stacking level and gaps pop-outs use. See [Floating panels](./popouts).                                                                                                                                                 |
| `ALIGNMENT_MATRIX_VALUES`                                                                                                                         | The nine values of `AlignmentMatrix`, in reading order.                                                                                                                                                                     |

## TypeScript

The package is written in TypeScript and ships its own declarations; there is no
`@types` package to install. Every component's props are exported as a named
type, so you can extend them:

```tsx
import type { DataRowProps, PanelFieldProps } from "@graphty/compact-mantine";

interface MyRowProps extends DataRowProps {
    nodeId: string;
}
```

The prop documentation you see in your editor is the same text that appears in
Storybook's prop tables, so a tooltip is the primary reference and this README
does not repeat it.

A few types are worth knowing by name: `FieldGlyphName` and `UiGlyphName` are
the closed glyph registers (`isFieldGlyphName` and `isFieldLetter` narrow an
unknown string to them), `DataTableColumn<TRow>` describes a table column, and
`CompactMantineLabels` is the string set.
