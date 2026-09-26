# compact-mantine against Figma: final audit

This records how each compact-mantine component compares with the Figma editor component it
copies. The measurements come from the Figma study in `design/ui/figma` at the repository root.
The implementation plan is `figma-spec.md` in this folder.

"PASS" means three things hold:

- every property the browser tests measure matches the cited Figma capture in light and in dark;
- the component has a `States` story, which Chromatic captures in its light and dark modes;
- side by side with the Figma capture, the story shows no visible difference.

The properties measured are box size, padding, radius, fill, text color, font size, weight,
line-height, letter-spacing, border, outline and shadow. The browser tests are in
`tests/figma/*.browser.test.tsx` and `tests/theme/*.browser.test.tsx`.

Where a component does not pass exactly, the table gives the remaining difference, what Figma
does, what compact-mantine does, and why.

## Checks run for this audit

| Check | Result |
|---|---|
| compact-mantine unit tests (jsdom) | 87 files, 2261 tests, all pass |
| compact-mantine browser tests (Chromium) | 27 files, 1030 tests, all pass (includes the new Card test) |
| graphty app tests | 116 files, 2145 tests, all pass |
| compact-mantine build, `tsc` and `eslint` on the changed files | clean |

## Fixed during this audit

- **The graphty app overrode the tooltip timing.** Fourteen app tooltips passed
  `openDelay={150}` from a `TOOLTIP_DELAY_MS` app constant. Inside the app's `Tooltip.Group`,
  Mantine ignores a tooltip's own delay, so the prop did nothing there. Anywhere without the
  group, such as graphty's Storybook or its tests, it replaced Figma's 1000 ms with 150 ms. The
  props and the constant are deleted, so the theme's timing is the only one in force.
- **Cards and tiles (Figma section 55) had no counterpart.** Mantine `Card` is now themed as
  Figma's library card: padding 8, a transparent 1px edge, radius 5 and no fill. A card rendered
  as a link or button hovers to the hover fill and draws a 2px ring inside on keyboard focus.
  `radius="lg"` gives the 13px promo card. There is a `States` story
  (`stories/theme/Card.stories.tsx`) and a browser test against `left-sidebar/panel-assets`
  element 114 (`tests/figma/card.browser.test.tsx`).

## Second pass: every story against Figma

The first comparison looked only at each component's `States` story. The second put every story
of every Figma component (the 74 stories under `stories/figma`, light and dark) beside the
closest Figma capture, each shot after its play function had run, the way Chromatic shoots it.

Fixed in the components:

- **Submenus were light.** `Menu.Sub` draws its dropdown through a Popover, so it also carried
  the light popover surface, which won: a white submenu with white text in the light theme and a
  #2c2c2c one in dark. The menu surface now wins (`overlays.css.ts`), and the submenu test
  asserts it.
- **The shortcuts sheet hugged its content.** Figma's is 241 tall whatever the tab holds, with
  the tab contents scrolling; ours now is too.
- **Quick actions** gained the scope-tab row, the trailing search button and the clear button,
  lists search results flat, and dims a disabled row's glyph and shortcut with its name.

Fixed in the stories, which did not show the state Figma was captured in: the tree's drag now
drags a selected row (Figma keeps the dragged row's pill); `StickyRoots` scrolls so a frame row
is shown stuck; the combo input, select and listbox stories rest with their lists open; the
search story rests on typed text with its clear button; `InThePanel` puts the real gap field and
settings button beside the alignment matrix; the toolbar, rail, secondary bar and quick actions
fixtures use distinct, fitting glyphs (lucide, not Figma's artwork).

Chromatic reported 16 component errors: eight stories, each in light and dark, whose play
functions failed in a real browser. None of them ran anywhere else, because compact-mantine's
Vitest has no Storybook project. All eight were stale after the Figma rebuild: the popout tab
strip is now a tablist (the stories looked for radios), a nested popout now docks flush (the
story expected a 4px gap), `PopoutButton`'s open state is `aria-expanded` on the ghost variant
(the stories expected the `light` variant), the Select trigger is a `combobox` (the story looked
for a textbox), the color input and its picker both have an Opacity box (the story's query
matched both), and the toggle story read `aria-pressed` before React had committed the state
from a native pointer event.

Differences left as they are:

- Stories that end with keyboard focus show our focus rings (the popout panel, the modal's close
  button, the resize handle's bar). Figma draws none; the rings are ours on purpose.
- Without the browser's EyeDropper API (headless Chromium, Firefox, Safari) the color picker
  hides the eyedropper and leaves its slot empty, so the sliders keep Figma's position.
- An expanded top-level row in a `stickyRoots` tree always draws its hairline, stuck or not.
- The context menu is compared with the current dark-scoped capture (`ctx-canvas-frame`), not
  the legacy one, whose separators are inset.

## Completeness

Every component in `components.md`, and in sections 3 and 4 of `compact-mantine-mapping.md`,
exists in compact-mantine, with one exception: the canvas overlays of Figma section 50
(selection handles, size badges, marquee). Figma draws these in WebGL on the canvas. In graphty
the canvas belongs to graphty-element, so they have no place in a Mantine theme.

Every component has a `States` story. The Storybook preview declares Chromatic modes `light`
and `dark`, so each story is captured in both themes. The `highContrast` option is a separate
toolbar global, and Chromatic does not capture it.

## Component table

The numbers in the first column are the section numbers in `components.md`.

| Figma section | compact-mantine | Result |
|---|---|---|
| 7 Primary button | Mantine `Button` (filled) | PASS; labels set 1-4% narrower (see "Font width" under Global) |
| 8 Secondary button | `Button variant="default"` | PASS |
| 9 Ghost, danger, inverse, success | `Button` variants `subtle`, `danger`, `danger-outline`, `inverse`, `success` | PASS |
| 10 Link | Mantine `Anchor`, `variant="secondary"` | PASS |
| 11 Ghost icon button 24 / 32 | Mantine `ActionIcon` | PASS; the register's `plus` glyph draws about 8px where Figma's add glyph draws 11px |
| 12 Toggle icon button | `ToggleIconButton` (new) | Deviation: the disabled state looks enabled. That matches the capture; the spec text asked for a dimmed glyph (owner to choose) |
| 13 Split button | `SplitButton` (new) | PASS |
| 14 Joined button group | `ActionIcon.Group`, `ActionIcon variant="joined"` | PASS |
| 15 Floating help button | `HelpButton` (new) | Deviation: its tooltip opens after 1000 ms inside the app-wide tooltip group, where Figma opens it at once (0 ms) |
| 16 Pill tabs | Mantine `Tabs` (default `variant="pills"`) | PASS; labels 1-2% narrower |
| 17 Segmented control (panel) | Mantine `SegmentedControl`, `IconGroupRow` | PASS |
| 18 Segmented control with a sliding thumb | `SegmentedControl variant="toolbar"` | PASS. The thumb shadow's first blur is 1px, as captured; the shared elevation-100 token is 0.5px |
| 19 Checkbox | Mantine `Checkbox` (blue); `variant="neutral"` (gray) | PASS. Kept on purpose: a bare Checkbox is the blue dialog checkbox; ToggleRow uses the neutral one |
| 20 Toggle switch | Mantine `Switch` | PASS |
| 21 Alignment matrix | `AlignmentMatrix` (new) | PASS. Kept on purpose: arrow keys move in 2D |
| 22 Scrubbable number input | `NumberInput`, `PanelField`, `StyleNumberInput` | PASS. Kept on purpose: Enter keeps focus in the field, and the reset button stays in the trailing slot |
| 23 Combo input | `ComboInput` (new) | PASS |
| 24 Text input, inline rename | `TextInput`, `Textarea`, `InlineRename` (new) | PASS |
| 25 Search field | `SearchInput` (new) | PASS |
| 26 Select trigger and listbox | `Select`, `NativeSelect`, `StyleSelect`, dark listbox | PASS |
| 27 Color swatch (chit) | `ColorSwatch`, chit inside the paint field | PASS |
| 28 Paint row | `CompactColorInput` | PASS |
| 29 Slider | `Slider`, `RangeSlider`, `HueSlider`, `AlphaSlider` | Deviation: in dark, a disabled plain slider's thumb is #2c2c2c on a #2c2c2c-based track and nearly disappears. Figma has no capture of this state |
| 30 Color picker, gradient editor | `ColorPickerPanel` (new), `GradientEditor` | Deviation: gradient stop rows have no opacity box, because `ColorStop.color` would need to accept `#RRGGBBAA` (a data-format change). Enter keeps focus in the value box |
| 31 Variable pill, bound field | `VariablePill` (new) | PASS |
| 32 Dark menu | Mantine `Menu` | PASS; row text widths slightly off (font width). A submenu is the same dark surface as its parent (it was drawn as a light popover until the second pass) |
| 33 Context menu | `ContextMenu` (new) | PASS. Kept on purpose: it also opens with Shift+F10 and the ContextMenu key |
| 34 Tooltip | Mantine `Tooltip`, `TooltipShortcut` (new) | PASS for timing, look and arrow. Deviations: a pending tooltip is not canceled by a click, key or wheel; outside a `Tooltip.Group`, two tooltips can show at once; tooltips stay in the accessibility tree (on purpose) |
| 35 Light popover | Popout family, `Popover`, `HoverCard`, `InfoCircle` | PASS; one root popover at a time. Kept on purpose: a nested popout docks flush to its parent |
| 36 Modal dialog | Mantine `Modal`, `ModalFooter` (new) | PASS |
| 37 Toast | `Toast`, `ToastProvider`, `useToast` (new) | PASS |
| 38 Quick actions palette | `QuickActions` (new) | PASS for the panel, search, scope-tab row, trailing search button, headings and rows (light and dark, `tests/figma/shell.browser.test.tsx`). The scope tabs are the caller's `header` (the theme's pill `Tabs`, 8px apart in this row); the trailing button is the caller's `searchAction`, and while there is text the palette shows its own clear button in that place. A search lists its results flat, without headings. Deviations: the clear button draws a plain X where Figma draws a filled circle with an X; a disabled row cannot take the highlight (Figma's arrow keys land on it); results keep the order of `actions` (Figma ranks them). Kept on purpose: it is a named dialog with a combobox |
| 39 Keyboard shortcuts panel, key caps | `ShortcutSheet` (new), `Kbd` | PASS. The sheet is a fixed 241 tall and its tab contents scroll, as Figma's (it hugged its content until the second pass). Kept on purpose: Escape closes the sheet |
| 40 Floating toolbar | `Toolbar` (new) | PASS |
| 41 Tool button, group, flyout | `ToolButton`, `ToolGroup` (new) | PASS |
| 42 Contextual secondary bar | `SecondaryToolbar` (new) | PASS |
| 43 Navigation rail button | `NavRail`, `RailButton` (new) | Deviation: its tooltip opens after 1000 ms inside the app-wide group, where Figma uses 500 ms |
| 44 Section header | `ControlSection` | PASS |
| 45 Property rows and grid | `ControlGroup`, `FieldRow`, `TrailingSlot`, `CompoundRow`, `ActionRow`, `ToggleRow`, `ControlSubGroup` | PASS. `ControlSubGroup` keeps its in-panel fold-away (Figma always uses a popover) |
| 46 Layer row (tree) | `Tree`, `TreeItem` (new) | PASS. Kept on purpose: an ARIA tree with roving focus, arrow keys, F2 rename and a focus ring |
| 47 Page row | `PageList`, `PageRow` (new) | PASS |
| 48 Result and list rows | `ResultRow` (new), `DataRow`, `DataRowHeader` | PASS |
| 49 Dividers | Mantine `Divider` | PASS |
| 50 Canvas overlays | none | Not built: graphty-element draws the canvas |
| 51 Badges and dots | Mantine `Badge`, `Indicator`, `RankChip` | PASS |
| 52 Avatar and avatar stack | Mantine `Avatar`, `Avatar.Group` | PASS |
| 53 Overlay scrollbar | Mantine `ScrollArea` | PASS |
| 54 Resize handle | `ResizeHandle` (new) | PASS. Kept on purpose: Shift+arrow moves 10px; Home and End jump to the limits |
| 55 Cards and tiles | Mantine `Card` (themed in this audit) | PASS for the library card and tile states. The promo and team-library layouts are compositions of Card, Text and Button, not separate components |
| 56 Spreadsheet table | `DataTable` | PASS. Header padding is 16, as Figma draws it |
| -- (no Figma counterpart) | `RampRow`, `HistogramRow`, `SparklineRow`, `MetricRow`, `ProseBlock` | Restyled on the Figma tokens |
| -- (other Mantine parts) | Radio, Burger, NavLink, Pagination, Stepper, Loader, Progress, RingProgress, FileInput, JsonInput, PasswordInput, PillsInput, TagsInput, MultiSelect, Autocomplete, Pill, ThemeIcon, Text | Restyled on the Figma tokens and scales; Figma has no capture for most of them |

## Interaction

| Behavior | Result |
|---|---|
| Tooltip timing: 1000 ms cold, instant warm, 300 ms hide | PASS. Measured in `overlays.browser.test.tsx`, for both the pointer and keyboard focus |
| No overlay animation | PASS. Menu, sub-menu, tooltip, popover, hover card, modal and the combobox lists all have a transition duration of 0 |
| One popover at a time | PASS. Only one root popout is open on the page; a menu opened outside a popover closes it |
| Dark menus in both themes | PASS. Menu, context menu, listbox and tooltip use #1e1e1e in light and in dark |
| Focus ring geometry | PASS. The ring is 1px `--cm-border-selected`: inside fields and joined segments, outside buttons, and on keyboard focus only (fields ring on any focus). Tests are in `tests/theme/focus-ring.*` and each package's suite |
| Keyboard models | PASS. Covered for the tree, page list, menus (including type-ahead), listbox, combo input, tabs (activate on press), segmented control, alignment matrix, toolbar and flyout, quick actions, resize handle, DataTable, color fields (Escape reverts) and context menu (Shift+F10) |

## Global differences that stay

- **Font width.** Figma renders an older build of Inter. The bundled Inter Variable sets 11px
  text 1 to 4% narrower, so long labels end a pixel or two earlier. Sizes, weights and
  letter-spacing match.
- **Per-tooltip delays inside a group.** Inside `Tooltip.Group`, Mantine applies the group's
  delay to every tooltip, so no single tooltip (the rail's, the help button's) can have its own
  cold delay.
- **Four old theme test files were deleted.** `compact-css-regression`,
  `css-baseline-verification`, `css-computed-styles` and `css-variables-regression` asserted the
  pre-Figma values. The measured Figma suites and `foundation.browser.test.tsx` replace them.
