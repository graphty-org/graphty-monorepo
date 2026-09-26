# compact-mantine: the Figma release

This release redraws every compact-mantine component to match the Figma editor's own UI,
measured property by property from captures of Figma in light and dark. compact-mantine is
0.x, so the visual changes and the handful of behavior changes below ship in a minor release.
The restyles land inside the existing components, but a few exports and props are removed;
they are listed, with their migrations, under "Breaking changes in 0.9.0: removed exports and
props" below.

## What changed visually

- **Color.** Every color is a `--cm-*` CSS custom property written with `light-dark()`, so it
  follows the color scheme of the element that uses it. The dark scheme uses Figma's neutral
  grays (#2c2c2c panels, #383838 fields, #1e1e1e menus) instead of the old blue-gray ramp. The
  accent is Figma's: #0d99ff for filled surfaces (primary button, selected tool, checked box),
  #007be5 for links, #0768cf pressed, and #0c8ce9 where Figma's dark theme uses it.
- **Type.** The body face is Inter at 11/16 weight 450 with Figma's letter-spacing. Captions are
  9/14, headings 550, emphasis 600. See "The bundled font" below.
- **Size.** Controls are 24px tall with an 11px face. The property panel is 240px wide with 88px
  fields (it was 280 / 108).
- **Fields** are filled and borderless at rest, outlined on hover and ringed on focus. `Select`
  is Figma's one outlined field. Field labels are 9/14 weight-500 captions above the field.
- **Focus ring.** Figma's 1px #0d99ff ring replaces Mantine's 2px ring: inside fields and joined
  segments, outside buttons, keyboard focus only (number and text fields ring on any focus).
  A page row rings its 24px pill; a row that is itself a button (`ActionRow` or `MetricRow` with
  `onClick`) draws Figma's 24px pill 8px before and after its text and rings that.
- **Motion.** The few things that move (a checkbox tick, a switch knob, a hover color) take
  100ms, and change in one frame when the reader asks the system for reduced motion.
- **Radii and shadows.** Radius 5 almost everywhere (2 small, 13 large). Shadows are Figma's
  five elevations; in dark they carry Figma's 0.5px inner white hairlines.
- **Overlays.** Menus, list boxes and tooltips are dark in both schemes. Overlays open and close
  in one frame, with no fade. Only one root pop-out is open at a time; opening another replaces
  it.
- **Tooltips** open after 1000ms, hand off at once to the next one while one is showing or for
  300ms after it hides, and hide at once on a pointer-down, a key (not a modifier), the wheel, or
  the pointer leaving the window. They sit below their trigger with an arrow.

## New components

| Export                                                           | What it is                                                                                                                 |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `ToggleIconButton`, `SplitButton`                                | Figma's toggle icon button (with drag-to-toggle) and split button                                                          |
| `SearchInput`, `ComboInput`, `VariablePill`                      | Search field, combo input with a dark list, variable pill for a bound field                                                |
| `AlignmentMatrix`, `ALIGNMENT_MATRIX_VALUES`                     | The 3 x 3 alignment matrix (radios with 2D arrow keys)                                                                     |
| `ColorPickerPanel`                                               | The color picker: paint type, format, saturation field, hue and alpha sliders                                             |
| `ContextMenu`, `MenuCheckItem`, `TooltipShortcut`, `ModalFooter` | Right-click menu (also Shift+F10 and the ContextMenu key), checkable menu row, a tooltip's shortcut label, a dialog footer |
| `Toast`, `ToastProvider`, `useToast`                             | Figma's dark toast and the queue that shows it                                                                             |
| `ResizeHandle`                                                   | The panel edge resize handle (role separator)                                                                              |
| `Tree`, `TreeItem`                                               | The layer tree, a real ARIA tree with roving focus, arrow keys and F2 rename                                               |
| `moveTreeItem`, `renameTreeItem`                                 | Apply the move `Tree`'s `onMove` reports, or the rename `onRename` reports, to your own item list                          |
| `PageList`, `PageRow`, `InlineRename`, `ResultRow`               | The page list, inline rename, and a find result row                                                                        |
| `Toolbar`, `ToolButton`, `ToolGroup`, `SecondaryToolbar`         | The floating toolbar, its tools and flyout, and the contextual bar                                                         |
| `NavRail`, `RailButton`, `HelpButton`                            | The navigation rail and the floating help button                                                                           |
| `ShortcutSheet`, `QuickActions`                                  | The keyboard shortcuts sheet and the quick actions palette                                                                 |
| `isLightColor`, `mixHex`, `normalizeHexa`                        | Color helpers                                                                                                             |

Every component's prop types are exported alongside it (for example `TreeProps`,
`TreeNodeData`, `TreeMove`, `ToastApi`).

New looks through ordinary Mantine props, with no new export:

- Button: `variant="danger"`, `"danger-outline"`, `"inverse"`, `"success"`; `color="red"` with
  `variant="filled"` is Figma's danger button.
- ActionIcon: `variant="joined"`; `ActionIcon.Group` is themed as Figma's joined group.
- Checkbox: `variant="neutral"` is the gray panel checkbox (the default is the blue dialog one).
- SegmentedControl: `variant="toolbar"` (sliding thumb) and `variant="loose"`.
- Anchor: `variant="secondary"`.
- Card: Figma's library card by default (padding 8, a transparent 1px edge, radius 5, no fill);
  as a link or button it hovers to the hover ground and rings 2px inside on keyboard focus.
  `radius="lg"` is the 13px promo card.
- Switch: `data-indeterminate` draws the mixed state.
- `data-cm-state="hover" | "pressed"` on a control forces that look (for stories and tests).

New props on existing components: `ControlSection.collapsible`, `FieldRow.labelPosition`,
`ActionRow.reveal`, `CompactColorInput.width` and `.showReset`, `GradientEditor.labels`,
`PanelField.stepHint`, `VariablePill.onValueCommit` and `.valueLabel`.

## The high-contrast option (WCAG 2.2 AA)

The default is exact Figma, and some of Figma's colors fall short of WCAG 2.2 AA. To pass AA,
create the theme with `highContrast`:

```tsx
import { MantineProvider } from "@mantine/core";
import { createCompactTheme } from "@graphty/compact-mantine";

<MantineProvider theme={createCompactTheme({ highContrast: true })}>
    <App />
</MantineProvider>;
```

For server rendering, use `compactGlobalCss({ highContrast: true })` as the stylesheet.

It changes color tokens only; nothing moves or resizes:

- Secondary text and icons go from 50% to 55% black (4.74:1 on white). Dark already passes.
- Checkbox and switch edges go to 3:1, and fields gain a 1px inside edge at 3:1 (drawn as a
  shadow, so the field does not grow). Hovering a field darkens that edge.
- The selected segment of a segmented control gets a 3:1 edge.
- Dividers stay as Figma draws them.
- Beyond that list, these also change, each to the next darker color in Figma's own palette:
  placeholder text, the focus ring (#007be5 in light), links (#0768cf), and the brand, danger and
  success fills that carry white text. These were added so every text and control pairing
  passes; each is one line in `src/theme/tokens.ts` if any should be dropped.

`createCompactTheme()` with no options equals `compactThemeOverride`, and the options are on
`theme.other.compact`.

## The bundled font

compact-mantine now ships Inter Variable (latin subset, woff2), inlined into its stylesheet, and
sets it as the theme font. Figma's 450, 550 and 600 weights render exactly with no setup and no
network request. Inter is by the Inter Project Authors and licensed under the SIL Open Font License 1.1;
the license text ships as `dist/fonts/LICENSE-Inter.txt`, and the package's license field is now
`MIT AND OFL-1.1`. To use another face, set `fontFamily` in a theme merged over this one.

## Setup changes for consumers

- The stylesheet is injected into `document.head` when the theme is created, so no import is
  needed. For SSR or a shadow root use `compactGlobalCss()` / `ensureCompactStyles()`.
- Wrap the app once in `<Tooltip.Group>` (no props; the theme sets the timing) to get Figma's
  warm tooltip hand-off across the whole app.

## Breaking changes

### Theme and tokens

1. Panel grid: `PANEL_GRID.WIDTH` 280 -> 240 and `FIELD` 108 -> 88. `CONTENT`, `BODY`, `TRIPLE`,
   `TRIPLE_GAP`, `TOGGLE_PITCH`, `DATA_PITCH`, `SECTION_HEADER`, `SECTION_PAD_BOTTOM`,
   `GLYPH_SLOT`, `GLYPH`, `CHEVRON` and `LABEL_COLUMN` also change. Code that hard-codes a 280px
   panel must read `PANEL_GRID.WIDTH`.
2. `PANEL_INK.SELECTED` / `ON_SELECTED` now mean Figma's selected item (pale blue ground, brand
   glyph), not an inverted solid patch. Every `PANEL_INK` value is now a `--cm-*` token.
3. Theme scales: `spacing.sm` 6 -> 8; `radius.sm` / `md` 4 / 6 -> 5, `lg` / `xl` 8 / 12 -> 13;
   `fontSizes.xs` 10 -> 9, `lg` 14 -> 15, `xl` 16 -> 24; `lineHeights` are px; `shadows` are
   Figma's elevations.
4. `colors.dark` is a neutral ramp and `primaryColor` is the new `brand` palette. Code that
   passed `color="blue"` expecting the primary color now gets Mantine's blue.
5. `focusRing` is `"never"`; the ring is the theme's own 1px one. A consumer's own `focusRing`
   no longer controls compact-mantine components.
6. `<Text size="sm">` and `size="xs"` render at weight 450 with Figma's letter-spacing (Mantine
   renders 400). `fw` still overrides it.
7. Internal style exports that nothing outside the package used were removed:
   `compactSegmentedControlRootStyles`, `compactSegmentedControlIndicatorStyles`,
   `compactControlLabelStyles`, `compactSliderMarkLabelStyles`, `compactAnchorStyles`,
   `compactNavLinkStyles`, `compactTabsStyles`.

### Buttons

8. ActionIcon `variant="light"` no longer draws a 1px accent border; it is the highlighted look
   (selected ground, brand glyph). The AA option does not bring the border back.
9. Button `md` is 32 tall (was 30); `lg` / `xl` text is 13 / 15 (was 15 / 17). ActionIcon `md` is 32. CloseButton's default is `sm`, a 24px box with a 10px X (was 16 / 12); its `sm` / `md` /
   `lg` / `xl` are 24 / 32 / 36 / 44.
10. Button reports `padding: 0`; the inset is a margin on the label. A shortcut in the right
    section keeps the size's inset after it (8 at `sm`, 12 at `md`). Button type is 11/16 weight
    450, letter-spacing 0.055px.
11. With no `color`, or with the primary color, Button and ActionIcon draw Figma's token colors
    instead of Mantine's derived ones.
12. Buttons use `cursor: default` (`auto` when disabled). The loading slide animation is gone.
13. A disabled ActionIcon with `variant="default"` draws the disabled border (#e6e6e6 / #444444).

### Selection controls

14. `Tabs` default to `variant="pills"` (`variant="default"` keeps the underline), render through
    a default `renderRoot`, and activate on mouse-down, as does `SegmentedControl`.
15. New `sm` sizes: Switch 32 x 16, Slider and RangeSlider track 8px, SegmentedControl text
    11px, Burger lines 1.5px, NavLink rows 32 tall; Pagination and Checkbox use Figma's radii.
16. The SegmentedControl indicator no longer slides (`variant="toolbar"` has the sliding thumb).
17. A checked Checkbox is Figma's blue by default. `ToggleRow` and `ToggleWithContent` use the
    neutral variant, and ToggleRow's word sits 8px after the box in a 32px row.
18. `IconGroupRow` loses its inverted selected tile (Figma's white face with an inset edge);
    tracks are 88 and 184 wide and faces 24 tall.

### Inputs

19. `Select` defaults to the outlined trigger. Its dropdown is the dark list box opening over the
    trigger, and no longer uses `ScrollArea`.
20. `Select` and `Autocomplete` have `role="combobox"`: tests must query
    `getByRole("combobox")`, not `"textbox"`.
21. Field labels are 9/14 weight-500 captions (were 11/16).
22. No italic default value; after a scrub, focus moves into the field.
23. Opening a `Select` sets `aria-activedescendant` to the checked option at once; Home and End
    move the highlight in an open list.
24. In the AA option, a hovered filled field draws its edge as a 1px outline; its computed
    `box-shadow` is `none`.
25. A `Textarea` with `autosize` now floors at `minRows` lines (one line is 24px) instead of the
    fixed 56px of its size.

### Color

26. `CompactColorInput` is one paint field: a 14px chit inside the field, a hex box 77 wide that
    grows, radius 5, default width 184. The opacity box shows the bare number and the "%" is a
    separate scrub handle. The hex and opacity boxes are plain inputs, so Mantine
    `TextInput` / `NumberInput` class names and styles no longer reach them. The picker is 240
    wide and docks to the start side; while it is open the field and its `FieldRow` turn the
    pressed color.
27. `GradientEditor`: the per-stop position sliders and the direction slider are replaced by the
    gradient bar with square handles (role slider), a position field per row, and a direction row
    (angle spinbutton plus flip and rotate buttons). The direction heading is visually hidden,
    the tick marks and the stop-row reset buttons are gone, and the editor is 216 tall at 240
    wide. Delete or Backspace on a handle moves focus to the neighboring handle.
28. Escape in any color text field reverts the value, commits nothing and stops at the field; a
    second Escape closes the picker. Before, one Escape committed the typed value and closed the
    enclosing pop-out.

### Overlays and pop-outs

29. `POPOUT_GAP` 8 -> 0 and `POPOUT_NESTED_GAP` 4 -> 0.
30. Only one root pop-out can be open on the whole page. `PopoutRegion` and `usePopoutRegion`
    still work, but a region no longer keeps its own pop-out open.
31. `PopoutButton` defaults to `sm` (24px), always renders `variant="subtle"`, shows its open
    state as the ghost button's `aria-expanded` look, and is no longer dimmed when closed.
32. Pop-out tab headers are pill `Tabs` (role tab, with a real tab panel) instead of a
    `SegmentedControl` (role radio). `Popout.Content` padding is 12 top and bottom, 16 left and
    right (was 8 all round). A pop-out that would open off screen is moved inside the window.
33. `InfoCircle`'s trigger is a 24px ActionIcon with no native `title`; its bubble is 240 wide
    (was 250).
34. Tooltip timing and placement as described above; z-index 1200. `NavRail`, `RailButton` and
    `HelpButton` no longer nest their own `Tooltip.Group`: inside an app-wide group they share
    its timing (1000ms cold, 300ms hide); outside one they keep 500ms and 0 / 0.
35. `Modal` is centered with no backdrop by default (`withOverlay` brings it back); sizes are sm
    320, md 480, lg 760; body padding is 8 top and bottom, 16 left and right (was 16 all round).
36. `ScrollArea` defaults to `type="hover"`, a 10px scrollbar and no hide delay. `Loader`
    defaults to 16px (was 18). `Progress` is fully round.
37. In a themed `Menu`, typing a printable key moves focus to the next row starting with it. A
    long menu draws 24px chevron rows at the ends it can still scroll to.

### Sections, rows and data

38. `ControlSection`: header 40 tall (was 32), the rule sits below the section (the
    `control-section-divider` element is gone), bottom padding 12 (was 8), the chevron is a 5 x 3
    caret in a 16px gutter and the name starts at x 16 (was 36). An empty section has no blank
    chevron slot, and clicking its title calls `onAdd`.
39. `ControlGroup`'s title is Figma's legend (a 16px band with a 9/14 weight-500 caption in the
    secondary color); its rule and 8px inline padding are gone and `bleed` has no effect.
40. `ControlSubGroup` is a 32px row with the chevron in the gutter and an 11px label; its content
    is no longer indented, it opens without animation, and it is no longer a Mantine Accordion
    (no `mantine-Accordion-*` classes).
41. `FieldRow` with labels shown draws captions above each column in one 50px row;
    `labelPosition="inline"` restores the split rows (label column 72, was 76).
42. `ActionRow` actions are always visible by default; pass `reveal="hover"` for the old hover
    reveal.
43. `AdvancedButton`'s default glyph is `settings` (was `gear`); unchanged it uses the ghost
    button's ink, changed it draws the brand glyph. It no longer passes `color="gray"`.
44. `CompoundRow`: 24px glyph slot, no leading padding next to a glyph (8px without one), default
    width 184, half width 88.
45. Chart rows and `ProseBlock`: all text 11/16; bars and lines use the secondary icon color;
    histogram axis row 16 (was 13); sparkline stroke 1px (was 1.5); `RampRow` minimum drawing
    width 96 (was 120).
46. A `PanelField` unit keeps a 4px gap after the value whatever its width, and a value too long
    for the field ends in an ellipsis.
47. `Toolbar` and `SecondaryToolbar` are as wide as their content in any container.
48. `DataRow` is 32 tall with an 11px name; hover and selected are a 24px pill instead of a
    full-row tint; its layout moved from inline styles to `cm-*` classes. `DataRowHeader` is 32
    tall (was 20) at 11/16 weight 550 with the 5 x 3 caret as its sort glyph.
49. `RankChip` is no longer a Mantine Badge: it is a span with Figma's outlined badge look (no
    `--badge-*` variables, no `mantine-Badge-root` class).
50. `DataTable`: default `rowHeight` and `headerHeight` 32 (were 28 and 24); a 1px cell grid (rows
    33px apart); no outer border and no row-hover tint; a selected row uses the selected ground;
    keyboard focus draws an inside box; body text 11/16; header labels padded 16, value cells 12
    at the start and 8 at the end.
51. `Tree`: a top-level item with an empty `children` array is bold, like one with children.

### Display components

52. `Badge` defaults to the outlined 16px look, `Pill` is 20 tall, `Indicator` is a 9px dot with a
    ring (`withBorder` on), `Kbd` is a dark key cap in both schemes, and `Avatar` defaults to
    `variant="filled"`.
53. `Card` defaults to padding 8, radius 5, `withBorder` (a transparent edge) and no fill (was
    Mantine's md padding on the body color).

## Known differences from Figma

These remain after the release; the comparison gallery lists them per component.

- Figma renders an older build of Inter; the bundled Inter Variable sets 11px text about 1 to 4
  percent narrower, so long labels end a pixel or two earlier.
- Kept on purpose for accessibility: tooltips stay in the accessibility tree; the layer tree,
  find results and quick actions are focusable and announced; the context menu also opens from
  the keyboard; Escape closes the shortcuts sheet; the resize handle takes Shift+arrow, Home and
  End; Enter in a field keeps focus there (Figma sends it to the canvas).
- Inside one app-wide `Tooltip.Group` every tooltip opens after 1000ms cold, where Figma's rail
  uses 500ms and its help button 0ms: Mantine cannot give one tooltip its own delay inside a
  shared group.
- A hover tooltip still waiting out its delay is not canceled by a mouse-down, key or wheel.
- A disabled `ToggleIconButton` looks like an enabled one, as the Figma capture shows; the spec
  text asked for a dimmed glyph.
- In dark, a disabled plain slider's thumb nearly disappears (Figma has no capture to settle it).
- `RampRow`, the chart rows, `ProseBlock`, `RankChip`, `DataTable`, `InfoCircle` and the
  in-panel `ControlSubGroup` have no Figma counterpart and are restyled on the Figma tokens.

## Breaking changes in 0.9.0: removed exports and props

These change the public API, so code that uses them stops compiling.

### `IconGroupRow` is removed

`IconGroupRow`, `IconGroupRowProps` and `IconGroupOption` are no longer exported. The row was a
layout wrapper around the themed Mantine `SegmentedControl`, which already draws the panel look,
so nothing is lost by using `SegmentedControl` directly. Put a 14px glyph and a visually hidden
word in each option, and the row's trailing control in a `TrailingSlot`:

```tsx
import { SegmentedControl, VisuallyHidden } from "@mantine/core";
import { AdvancedButton, ControlSection, PANEL_GRID, TrailingSlot } from "@graphty/compact-mantine";

<ControlSection label="Shape">
    <div style={{ display: "flex", alignItems: "center", gap: PANEL_GRID.TRAIL_GAP, height: PANEL_GRID.ROW_PITCH }}>
        <SegmentedControl
            fullWidth
            aria-label="Node shape"
            value={shape}
            onChange={setShape}
            data={[
                { value: "sphere", label: <><SphereGlyph /><VisuallyHidden>Sphere</VisuallyHidden></> },
                { value: "box", label: <><BoxGlyph /><VisuallyHidden>Box</VisuallyHidden></> },
            ]}
            style={{ flex: "1 1 auto", minWidth: 0 }}
        />
        <TrailingSlot>
            <AdvancedButton label="Shape options" onClick={openOptions} />
        </TrailingSlot>
    </div>
</ControlSection>
```

`disabledReason` has no `SegmentedControl` equivalent: give the control a `title` of the form
"Node shape. Load data first" yourself. The development warnings for fewer than two or more than
six options are gone with the row.

### `DataRow` keeps only data rows

`DataRow` is for readings -- statistics, facts, rankings -- and keeps `name`, `value`, `icon`,
`selected`, `onClick`, `onFocus`, `onBlur` and `trailing`. The props that existed only for lists
of objects are removed:

- `role` and the `DataRowRole` type export (the `role="option"` listbox mode). A selected
  `DataRow` is always reported as `aria-current`.
- `tabIndex` (roving focus inside a listbox). A row with `onClick` is in the tab order; a row
  without one is inert text and takes no focus.
- `onDoubleClick` (open or rename) and `onContextMenu`.

Migration: a list the reader selects, renames or reorders is a `Tree` (nested, or flat when no
item has `children`) or a `PageList` (flat pages with dividers). Both have roving focus,
multiple selection, F2 and double-click rename and a context menu of their own. A find result is
a `ResultRow`.

### American spelling

compact-mantine is written in American English. The hooks a test or a stylesheet can reach that
changed spelling in 0.9:

- `FieldRow`: the labeled group's `data-testid` is `field-row-labeled` (was `field-row-labelled`)
  and each captioned column carries `data-labeled="true"` (was `data-labelled`).
- `CompactColorInput`: the labeled wrapper's `data-testid` is `compact-color-input-labeled` (was
  `compact-color-input-labelled`) and its class is `cm-paint-labeled` (was `cm-paint-labelled`).
- Storybook: the "Colour" groups are "Color" (`Foundations/Color`, `Components/Color/*`), and
  "Customising the theme" is "Customizing the theme", so their story ids changed.

`DataTable` and `ToggleRowGroup` keep the `labelledBy` prop they had in 0.8: it is released API
that 0.9 does not otherwise change, and it names the `aria-labelledby` attribute it sets, which
the platform spells that way.

### Behavior changes

- `GradientEditor`: stop colors are edited in the editor's own `ColorPickerPanel`, under the
  gradient bar, which edits the selected stop. Selecting a stop -- its handle, its row's chit, or
  focus entering its row -- points the picker at it. The stop rows keep a chit and a hex field and
  no longer open a pop-out picker. Public props do not change.
- `Tree`: while `onMove` is given, Alt+ArrowUp and Alt+ArrowDown move the focused item one place
  among its siblings, reported through `onMove` exactly as a drop is, and focus follows the item.
  Nothing happens at either end of the sibling list, and an item never leaves its parent this
  way. Without `onMove`, Alt+Arrow keys move focus as the plain arrows do. Additive.
- `ComboInput`: an arrow key pressed while the list is opening, before the current value is
  highlighted, now moves from the current value instead of from the top of the list.

### The graphty app's style layer list is a flat `Tree`

Not a change to any compact-mantine export; recorded here as the worked migration. The graphty
app's style layer list (`graphty/src/components/shell/panel/StyleLayerList.tsx`) is a flat
`Tree` over the layers, topmost first: `label="Style layers"`, `renameLabel="Layer name"`,
`multiselect={false}`, no item has `children` so a drop only reorders. `onRename` refuses an
empty or whitespace name and applies the rest with `renameTreeItem`; `onMove` applies the move
to the reversed list with `moveTreeItem` and hands it back in graphty-element's bottom-first
order. Drag and Alt+ArrowUp / Alt+ArrowDown both reorder. The
hand-built dnd-kit list it replaces (`LeftSidebar`) is deleted, and `@dnd-kit/core`,
`@dnd-kit/sortable` and `@dnd-kit/utilities` are no longer dependencies of the app.
