# Breaking changes in the Figma release

compact-mantine is 0.x, and 0.9.0 redraws every component to match the Figma editor. The full
list, with every changed value, is [CHANGELOG-figma.md](https://github.com/graphty-org/graphty-monorepo/blob/master/compact-mantine/CHANGELOG-figma.md); Storybook's
[Upgrading to 0.9](https://graphty.app/storybook/compact-mantine/?path=/docs/introduction-upgrading-to-0-9--docs)
page has the migrations.

**Removed exports and props (code that stops compiling):**

1. **`IconGroupRow`**, `IconGroupRowProps` and `IconGroupOption` are removed. Use the themed
   Mantine `SegmentedControl` directly: a glyph and a `VisuallyHidden` word per segment, the row's
   trailing control in a `TrailingSlot` (see [the worked example](./rows#a-worked-example)).
2. **`DataRow`** keeps only `name`, `value`, `icon`, `selected`, `onClick`, `onFocus`, `onBlur`
   and `trailing`. `role`, the `DataRowRole` type, `tabIndex`, `onDoubleClick` and
   `onContextMenu` are removed; a selected row is always `aria-current`. A list the reader
   selects, renames or reorders is a `Tree` or a `PageList`; a find result is a `ResultRow`.

**Behavior changes:**

3. **`GradientEditor`** edits stop colors in one picker under the gradient bar, which follows the
   selected stop; stop rows no longer open a pop-out, so it no longer needs a `PopoutManager`.
4. **`Tree`**: with `onMove`, Alt+ArrowUp / Alt+ArrowDown move the focused item among its
   siblings (additive).
5. **Motion and timing.** Overlays have no transitions, and a tooltip opens after 1000ms (it was
   immediate). Wrap your app in `Tooltip.Group` for the warm hand-off.
6. **Pop-outs.** Only one root pop-out is open on the page at a time; `PopoutRegion` no longer
   keeps one open per region. `POPOUT_GAP` 8 -> 0, `POPOUT_NESTED_GAP` 4 -> 0.
7. **Select and Autocomplete** have `role="combobox"`; `Select` defaults to the outlined trigger
   with a dark list opening over it. `Tabs` default to `variant="pills"`.
8. **Escape in a color field** reverts the typed value and stops at the field.

**Values and looks:**

9. **Panel grid.** `PANEL_GRID.WIDTH` 280 -> 240, `FIELD` 108 -> 88, and most other members
   change value. Code that hard-codes a 280px panel must follow `PANEL_GRID.WIDTH`.
10. **Theme scales.** `spacing.sm` 6 -> 8; `radius.sm` / `md` 4 / 6 -> 5, `lg` / `xl` 8 / 12 ->
    13; `fontSizes.xs` 10 -> 9, `lg` 14 -> 15, `xl` 16 -> 24; `lineHeights` are px; `shadows` are
    Figma's elevations.
11. **Colors.** `colors.dark` is a neutral ramp, and `primaryColor` is the new `brand` palette
    (`color="blue"` now gets Mantine's blue). `PANEL_INK.SELECTED` / `ON_SELECTED` are Figma's
    pale selected ground and brand glyph; every `PANEL_INK` value is a `--cm-*` token.
12. **Focus.** `focusRing` is `"never"` and the ring is the theme's own 1px ring.
13. **Typeface.** The body font is the bundled Inter at 11/16 weight 450; `<Text size="sm">` and
    `size="xs"` render at 450 with Figma's letter-spacing.
14. **Rows and sections.** `ControlSection`'s header is 40 tall with its rule below; `DataRow` is
    32 tall with an 11px name; `DataTable` rows and header are 40; `FieldRow` puts captions above
    by default (`labelPosition="inline"` restores beside).
15. **Display and overlays.** `Badge` defaults to the outlined look, `Kbd` is a dark key cap in
    both schemes, `Modal` blocks the page behind a transparent overlay by default, `Loader` at `sm` is 16px, and
    `PopoutButton` defaults to `sm` and shows its open state as the ghost button's
    `aria-expanded` look.
16. **Mantine's `ColorInput` and `ColorPicker` are no longer themed.** They render as plain
    Mantine. Use `CompactColorInput` (see
    [Use these instead of Mantine's](./which-one#use-these-instead-of-mantines)).
