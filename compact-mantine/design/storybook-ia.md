# compact-mantine Storybook: information architecture and consolidation plan

The compact-mantine Storybook is published at https://graphty.app/storybook/compact-mantine/
(`tools/assemble-pages-site.sh` copies `compact-mantine/storybook-static` to
`storybook/compact-mantine`). Its readers are third-party developers deciding whether to use
these components and how. This document fixes three things before the 0.9.0 release:

1. the sidebar -- where every component and every story file lives;
2. the page every component gets;
3. four component consolidations (GradientEditor on ColorPickerPanel, IconGroupRow, the graphty
   app's style layer list on Tree, and one Select page).

The last section splits the work into packages with disjoint files.

## 1. Where things stand

- 107 story files. 95 live under `stories/`, three under `src/components/popout/`, and a
  parallel "Figma/..." tree of 27 files lives under `stories/figma/`. A component can appear
  twice: Select is in "Compact Theme/Mantine Components/Select", "Figma/Inputs/Select and
  listbox" and "Editing a Value/StyleSelect".
- Six section overview pages in `stories/docs/*.mdx` ("Getting Started/Introduction",
  "Building a Panel/Overview", "Editing a Value/Overview", "Showing Data/Overview", "Floating
  Panels/Overview", "Compact Theme/Overview").
- `.storybook/preview.tsx` has three toolbar globals (theme light/dark, contrast figma/high,
  direction ltr/rtl), a single decorator (MantineProvider with `forceColorScheme`), Chromatic
  modes `light` and `dark` for every story, and an alphabetical `storySort` with a written-out
  top-level order. `.storybook/main.ts` indexes `stories/**/*.mdx`, `stories/**/*.stories.*` and
  `src/**/*.stories.*`, with addon-essentials, addon-a11y and the Chromatic addon.
- Autodocs is opt-in per file. 36 files tag `autodocs`; none of the `stories/theme/*` or
  `stories/figma/*` files do (two exceptions: ResizeHandle and AlignmentMatrix).
- Every States story shows one colour scheme, whichever the toolbar selects. The only
  side-by-side light and dark render is `Compact Theme/Mantine Components/Light-Dark Mode`,
  which nests a second `MantineProvider` with `cssVariablesSelector`.
- Four near-identical story helpers draw state grids: `stories/figma/inputs/StateGrid.ts`,
  `stories/figma/selection/StateGrid.ts`, `stories/figma/chrome/StoryPanel.ts` and
  `stories/figma/color/ForceState.ts`. 44 files outside `stories/figma` import them.

What the graphty app uses (from `graphty/src`): PANEL_INK, PANEL_GRID, UiGlyph, COMPACT_SIZING,
DataRow, PopoutManager, ControlSection, ActionRow, ProseBlock, PanelField, DataTable,
useNumberFormatter, AdvancedButton, FieldRow, InfoCircle, ToggleRow, compactThemeOverride,
PopoutRegion, CompoundRow, Popout, DataRowHeader, HistogramRow, usePopoutManager, MetricRow,
RankChip, CompactColorInput, ControlGroup, ControlSubGroup, StyleNumberInput, StyleSelect.
It uses none of the Figma release's new components yet, and it does not use IconGroupRow.

## 2. The sidebar

Five roots, in this order. Storybook shows the first path segment as a root heading, the second
as a group, the third as the component.

```
INTRODUCTION
  Getting started
  Choosing a component
  Customising the theme
  Languages and direction
  Events and shared props
  Accessibility
  Upgrading to 0.9
FOUNDATIONS
  Colour
  Typography
  Spacing, radii and grid
  Elevation
  Focus and motion
  Glyphs
COMPONENTS
  Panels and rows      Overview, ControlSection, ControlGroup, ControlSubGroup, FieldRow,
                       CompoundRow, TrailingSlot, ResizeHandle
  Inputs               Overview, PanelField, Select, StyleNumberInput, SearchInput,
                       ComboInput, VariablePill
  Selection            Overview, ToggleRow, ToggleRowGroup, ToggleWithContent, AlignmentMatrix
  Colour               Overview, CompactColorInput, ColorPickerPanel, GradientEditor, RampRow
  Actions              Overview, ToggleIconButton, SplitButton, AdvancedButton
  Overlays             Overview, Popout, PopoutButton, InfoCircle, Menu, Tooltip, Modal, Toast
  Lists and trees      Overview, Tree, PageList, InlineRename, ResultRow
  Data display         Overview, DataRow, DataRowHeader, RankChip, MetricRow, HistogramRow,
                       SparklineRow, ProseBlock, ActionRow, DataTable
  App shell            Overview, Toolbar, SecondaryToolbar, NavRail, HelpButton,
                       QuickActions, ShortcutSheet
PATTERNS
  Settings panels
THEMED MANTINE
  Actions              ActionIcon, Anchor, Burger, Button, CloseButton
  Inputs               Autocomplete, FileInput, JsonInput, MultiSelect, NumberInput,
                       PasswordInput, Pill, PillsInput, TagsInput, Textarea, TextInput
  Selection            Checkbox, Radio, RangeSlider, SegmentedControl, Slider, Switch
  Navigation           NavLink, Pagination, Stepper, Tabs
  Feedback             Badge, Indicator, Kbd, Loader, Progress, RingProgress
  Surfaces             Avatar, Card, Divider, ScrollArea, Text, ThemeIcon
```

Why this order. A developer arrives asking "what is this and how do I switch it on"
(Introduction), then "what does it look like" (Foundations), then "which piece do I need"
(Components, grouped by the job the reader is doing, starting with the panel every other piece
sits in), then "show me a whole panel" (Patterns). The Mantine components the theme restyles
but does not wrap come last: they are Mantine's, and a reader only needs to see that they fit.

Rules the sidebar keeps:

- **One home per component.** A component has one page. States, the Figma comparison and the
  keyboard stories all live on it. The side-by-side comparison with Figma captures lives only
  in the local gallery (`tmp/figma-comparison`), not in the Storybook.
- **A Mantine family the package extends lives in Components.** Where compact-mantine exports
  something that belongs to a Mantine component, that component's page is in Components and
  the Themed Mantine section does not repeat it: Select (StyleSelect), Menu (ContextMenu,
  MenuCheckItem), Tooltip (TooltipShortcut), Modal (ModalFooter), Popover and HoverCard (the
  light popover surface shared with Popout, on the Popout page).
- **Every Components group opens with an Overview page**: two short paragraphs and a
  "reach for X when" list, including the nearest alternative outside the group.
- **Play-only twins stay but are hidden.** The Popout stories come in pairs (`Basic` and
  `BasicInteractions`, and so on); the `*Interactions` twin exists for its play function. Tag
  it `["!dev", "!autodocs"]`: out of the sidebar and the docs page, still run by Chromatic.

### 2.1 Folders

```
stories/
  helpers/          shared story helpers (not stories)
  introduction/     Introduction MDX pages, plus CustomisingTheTheme.stories.tsx
  foundations/
  components/
    panels/ inputs/ selection/ colour/ actions/ overlays/ lists/ data/ shell/
  patterns/
  mantine/
    actions/ inputs/ selection/ navigation/ feedback/ surfaces/
```

`stories/figma/`, `stories/theme/`, `stories/docs/` and `src/components/popout/*.stories.tsx`
are emptied and deleted. `.storybook/main.ts` keeps its `src/**/*.stories.*` glob (harmless
once empty).

### 2.2 Mapping: old file and title -> new file and title

New paths are relative to `compact-mantine/stories/`. "Merge" means the old file's stories are
moved into the named file and the old file is deleted.

**Introduction**

| Old | New file | New title |
|---|---|---|
| `docs/Introduction.mdx` (Getting Started/Introduction) | `introduction/GettingStarted.mdx` | Introduction/Getting started |
| (new; from README "Which one should I use?" and the old overviews) | `introduction/ChoosingAComponent.mdx` | Introduction/Choosing a component |
| `Theming.stories.tsx` stories ChangePrimaryColor, ChangeFonts, ChangeBorderRadius (Compact Theme/Showcase) | `introduction/CustomisingTheTheme.stories.tsx` | Introduction/Customising the theme |
| (new; from README "Internationalization" and "Right-to-left languages") | `introduction/LanguagesAndDirection.mdx` | Introduction/Languages and direction |
| (new; from README "Handling events" and "The shared prop names") | `introduction/EventsAndProps.mdx` | Introduction/Events and shared props |
| (new; from README "Accessibility") | `introduction/Accessibility.mdx` | Introduction/Accessibility |
| (new; from CHANGELOG-figma.md) | `introduction/Upgrading.mdx` | Introduction/Upgrading to 0.9 |
| `docs/CompactTheme.mdx` (Compact Theme/Overview) | split: provider, light/dark and WCAG AA into Getting started; "What it sets" into Foundations; "Making it your own", "A compact region", "Server rendering and shadow roots" into Customising the theme | -- |

Getting started covers: what the package is, install and peers, `MantineProvider` with
`compactTheme`, `createCompactTheme({ highContrast: true })`, light and dark
(`forceColorScheme`, `defaultColorScheme`), the bundled Inter font, the three optional wrappers
(`Tooltip.Group`, `PopoutManager`, `LabelsProvider`), and how this Storybook is organised with
the toolbar globals.

**Foundations**

| Old | New file | New title |
|---|---|---|
| `theme/LightDarkMode.stories.tsx` (Compact Theme/Mantine Components/Light-Dark Mode): Tokens, SideBySide | `foundations/Colour.stories.tsx` (Tokens, LightAndDark, plus a new PanelInk story listing every `PANEL_INK` role) | Foundations/Colour |
| same file: SegmentedControlIndicator, ControlGroupColors, ControlSectionColors | deleted: each is a cell of the SegmentedControl, ControlGroup and ControlSection States stories, which now render both schemes | -- |
| (new) | `foundations/Typography.stories.tsx` (the xs-xl scale with line heights, weights 450/550/600, tracking, Inter) | Foundations/Typography |
| (new) | `foundations/SpacingAndGrid.stories.tsx` (theme spacing, radii, `PANEL_GRID` drawn as 16 + 88 + 8 + 88 + 8 + 24 + 8, `COMPACT_SIZING`, 24px control and 32px row) | Foundations/Spacing, radii and grid |
| (new) | `foundations/Elevation.stories.tsx` (shadows xs-xl, light and dark) | Foundations/Elevation |
| (new) | `foundations/FocusAndMotion.stories.tsx` (1px ring inside fields and outside buttons; 100ms state changes; overlays opening in one frame; tooltip timing) | Foundations/Focus and motion |
| `Glyphs.stories.tsx` (Glyphs/Glyph Gallery) | `foundations/Glyphs.stories.tsx` | Foundations/Glyphs |

**Components / Panels and rows**

| Old | New file | New title |
|---|---|---|
| `docs/BuildingAPanel.mdx` (Building a Panel/Overview) | `components/panels/Overview.mdx` | Components/Panels and rows/Overview |
| `ControlSection.stories.tsx` (Building a Panel/ControlSection) | `components/panels/ControlSection.stories.tsx` | Components/Panels and rows/ControlSection |
| `ControlGroup.stories.tsx` | `components/panels/ControlGroup.stories.tsx` | Components/Panels and rows/ControlGroup |
| `ControlSubGroup.stories.tsx` | `components/panels/ControlSubGroup.stories.tsx` | Components/Panels and rows/ControlSubGroup |
| `FieldRow.stories.tsx` | `components/panels/FieldRow.stories.tsx` | Components/Panels and rows/FieldRow |
| `CompoundRow.stories.tsx` (Editing a Value/CompoundRow) | `components/panels/CompoundRow.stories.tsx` | Components/Panels and rows/CompoundRow |
| `TrailingSlot.stories.tsx` | `components/panels/TrailingSlot.stories.tsx` | Components/Panels and rows/TrailingSlot |
| `figma/chrome/ResizeHandle.stories.tsx` (Figma/Chrome/ResizeHandle) | `components/panels/ResizeHandle.stories.tsx` | Components/Panels and rows/ResizeHandle |

**Components / Inputs**

| Old | New file | New title |
|---|---|---|
| `docs/EditingAValue.mdx` (Editing a Value/Overview) | split into the Inputs, Selection and Colour overviews | -- |
| (new) | `components/inputs/Overview.mdx` | Components/Inputs/Overview |
| `PanelField.stories.tsx` (Editing a Value/PanelField) | `components/inputs/PanelField.stories.tsx` | Components/Inputs/PanelField |
| `theme/Select.stories.tsx` (Compact Theme/Mantine Components/Select) | merge into `components/inputs/Select.stories.tsx` | Components/Inputs/Select |
| `figma/inputs/Listbox.stories.tsx` (Figma/Inputs/Select and listbox) | merge into the same file | Components/Inputs/Select |
| `StyleSelect.stories.tsx` (Editing a Value/StyleSelect) | merge into the same file | Components/Inputs/Select |
| `StyleNumberInput.stories.tsx` | `components/inputs/StyleNumberInput.stories.tsx` | Components/Inputs/StyleNumberInput |
| `figma/inputs/SearchInput.stories.tsx` | `components/inputs/SearchInput.stories.tsx` | Components/Inputs/SearchInput |
| `figma/inputs/ComboInput.stories.tsx` | `components/inputs/ComboInput.stories.tsx` (moved LAST, by the integrator: another agent is editing it) | Components/Inputs/ComboInput |
| `figma/inputs/VariablePill.stories.tsx` | `components/inputs/VariablePill.stories.tsx` | Components/Inputs/VariablePill |

The merged Select page, in export order: `Default` (Mantine Select), `States` (the trigger's
states, from theme/Select), `OpenList` (Listbox OpenOverTrigger), `BelowTheField`,
`GroupsAndLongLists`, `Keyboard`, `Searchable`, `Clearable`, `Native`, `ResetToDefault`
(StyleSelect Default and Overridden in one render), `ResetToDefaultStates`, `Controlled`,
`Translated`, `RightToLeft`. Deleted as duplicates: theme/Select `Disabled` (a cell of States)
and Listbox `TriggerStates` (the same cells as States).

**Components / Selection**

| Old | New file | New title |
|---|---|---|
| (new) | `components/selection/Overview.mdx` | Components/Selection/Overview |
| `ToggleRow.stories.tsx` | `components/selection/ToggleRow.stories.tsx` | Components/Selection/ToggleRow |
| `ToggleRowGroup.stories.tsx` | `components/selection/ToggleRowGroup.stories.tsx` | Components/Selection/ToggleRowGroup |
| `ToggleWithContent.stories.tsx` | `components/selection/ToggleWithContent.stories.tsx` | Components/Selection/ToggleWithContent |
| `figma/selection/AlignmentMatrix.stories.tsx` | `components/selection/AlignmentMatrix.stories.tsx` | Components/Selection/AlignmentMatrix |
| `IconGroupRow.stories.tsx` (Editing a Value/IconGroupRow) | deleted with the component (section 4.2); its coverage is Themed Mantine/Selection/SegmentedControl `PicturesInAPanelRow` | -- |

**Components / Colour**

| Old | New file | New title |
|---|---|---|
| (new) | `components/colour/Overview.mdx` | Components/Colour/Overview |
| `CompactColorInput.stories.tsx` | `components/colour/CompactColorInput.stories.tsx` | Components/Colour/CompactColorInput |
| `figma/color/ColorPickerPanel.stories.tsx` (Figma/Colour/ColorPickerPanel) | `components/colour/ColorPickerPanel.stories.tsx` | Components/Colour/ColorPickerPanel |
| `GradientEditor.stories.tsx` | `components/colour/GradientEditor.stories.tsx` | Components/Colour/GradientEditor |
| `RampRow.stories.tsx` (Editing a Value/RampRow) | `components/colour/RampRow.stories.tsx` | Components/Colour/RampRow |

**Components / Actions**

| Old | New file | New title |
|---|---|---|
| (new) | `components/actions/Overview.mdx` | Components/Actions/Overview |
| `figma/buttons/ToggleIconButton.stories.tsx` | `components/actions/ToggleIconButton.stories.tsx` | Components/Actions/ToggleIconButton |
| `figma/buttons/SplitButton.stories.tsx` | `components/actions/SplitButton.stories.tsx` | Components/Actions/SplitButton |
| `AdvancedButton.stories.tsx` (Building a Panel/AdvancedButton) | `components/actions/AdvancedButton.stories.tsx` | Components/Actions/AdvancedButton |

**Components / Overlays**

| Old | New file | New title |
|---|---|---|
| `docs/FloatingPanels.mdx` (Floating Panels/Overview) | `components/overlays/Overview.mdx` | Components/Overlays/Overview |
| `src/components/popout/Popout.stories.tsx` (Floating Panels/Popout) | merge into `components/overlays/Popout.stories.tsx` | Components/Overlays/Popout |
| `src/components/popout/PopoutAnchor.stories.tsx` (Floating Panels/Popout.Anchor) | merge into the same file (AnchorToPanel, AnchorToButton, Comparison) | Components/Overlays/Popout |
| `figma/overlays/Popover.stories.tsx` (Figma/Overlays/Light popover) | merge into the same file (as `LightPopoverSurfaces` and `OneAtATime`; it covers Mantine Popover and HoverCard too) | Components/Overlays/Popout |
| `src/components/popout/PopoutButton.stories.tsx` | `components/overlays/PopoutButton.stories.tsx` | Components/Overlays/PopoutButton |
| `InfoCircle.stories.tsx` (Floating Panels/InfoCircle) | `components/overlays/InfoCircle.stories.tsx` | Components/Overlays/InfoCircle |
| `figma/overlays/Menu.stories.tsx` | `components/overlays/Menu.stories.tsx` (`component: ContextMenu`, `subcomponents: { MenuCheckItem }`; the `Context` story is renamed `ContextMenu` so sidebar search finds it) | Components/Overlays/Menu |
| `figma/overlays/Tooltip.stories.tsx` | `components/overlays/Tooltip.stories.tsx` (`component: TooltipShortcut`) | Components/Overlays/Tooltip |
| `figma/overlays/Modal.stories.tsx` | `components/overlays/Modal.stories.tsx` (`component: ModalFooter`) | Components/Overlays/Modal |
| `figma/overlays/Toast.stories.tsx` | `components/overlays/Toast.stories.tsx` | Components/Overlays/Toast |
| `figma/overlays/ScrollArea.stories.tsx` (Figma/Overlays/Scrollbar) | `mantine/surfaces/ScrollArea.stories.tsx` | Themed Mantine/Surfaces/ScrollArea |

**Components / Lists and trees**

| Old | New file | New title |
|---|---|---|
| (new) | `components/lists/Overview.mdx` | Components/Lists and trees/Overview |
| `figma/tree/Tree.stories.tsx` | `components/lists/Tree.stories.tsx` (plus a new `FlatReorderableList` story: the style layer list shape of section 4.3) | Components/Lists and trees/Tree |
| `figma/tree/PageList.stories.tsx` | `components/lists/PageList.stories.tsx` | Components/Lists and trees/PageList |
| `figma/tree/InlineRename.stories.tsx` | `components/lists/InlineRename.stories.tsx` | Components/Lists and trees/InlineRename |
| `figma/tree/ResultRow.stories.tsx` | `components/lists/ResultRow.stories.tsx` | Components/Lists and trees/ResultRow |
| `figma/tree/fixtures.ts` | `components/lists/fixtures.ts` | -- |

**Components / Data display**

| Old | New file | New title |
|---|---|---|
| `docs/ShowingData.mdx` (Showing Data/Overview) | `components/data/Overview.mdx` | Components/Data display/Overview |
| `DataRow.stories.tsx` | `components/data/DataRow.stories.tsx`; `SingleSelection`, `MultipleSelection` and `Gestures` are deleted with the props they show (section 4.4); their coverage is the Tree and PageList pages | Components/Data display/DataRow |
| `DataRowHeader.stories.tsx` | `components/data/DataRowHeader.stories.tsx` | Components/Data display/DataRowHeader |
| `RankChip.stories.tsx` | `components/data/RankChip.stories.tsx` | Components/Data display/RankChip |
| `MetricRow.stories.tsx` | `components/data/MetricRow.stories.tsx` | Components/Data display/MetricRow |
| `HistogramRow.stories.tsx` | `components/data/HistogramRow.stories.tsx` | Components/Data display/HistogramRow |
| `SparklineRow.stories.tsx` | `components/data/SparklineRow.stories.tsx` | Components/Data display/SparklineRow |
| `ProseBlock.stories.tsx` | `components/data/ProseBlock.stories.tsx` | Components/Data display/ProseBlock |
| `ActionRow.stories.tsx` | `components/data/ActionRow.stories.tsx` | Components/Data display/ActionRow |
| `DataTable.stories.tsx` | `components/data/DataTable.stories.tsx` | Components/Data display/DataTable |

**Components / App shell**

| Old | New file | New title |
|---|---|---|
| (new) | `components/shell/Overview.mdx` | Components/App shell/Overview |
| `figma/shell/Toolbar.stories.tsx` | `components/shell/Toolbar.stories.tsx` (`subcomponents: { ToolButton, ToolGroup }`) | Components/App shell/Toolbar |
| `figma/shell/SecondaryToolbar.stories.tsx` | `components/shell/SecondaryToolbar.stories.tsx` | Components/App shell/SecondaryToolbar |
| `figma/shell/NavRail.stories.tsx` | `components/shell/NavRail.stories.tsx` (`subcomponents: { RailButton }`) | Components/App shell/NavRail |
| `figma/shell/HelpButton.stories.tsx` | `components/shell/HelpButton.stories.tsx` | Components/App shell/HelpButton |
| `figma/shell/QuickActions.stories.tsx` | `components/shell/QuickActions.stories.tsx` | Components/App shell/QuickActions |
| `figma/shell/ShortcutSheet.stories.tsx` | `components/shell/ShortcutSheet.stories.tsx` | Components/App shell/ShortcutSheet |
| `figma/shell/fixtures.ts` | `components/shell/fixtures.ts` | -- |

**Patterns**

| Old | New file | New title |
|---|---|---|
| `Theming.stories.tsx` stories SidebarPattern, PopoutPanelPattern, ControlGroupPatterns, InlineSettingsPattern (the "General Settings", "Appearance", "Advanced Settings", "Label Settings" panels) | `patterns/SettingsPanels.stories.tsx`, renamed `Sidebar`, `PopOutPanel`, `GroupedControls`, `InlineSettings` | Patterns/Settings panels |

**Themed Mantine.** Every file keeps its component name; only the folder and title change.
Old title "Compact Theme/Mantine Components/<Name>" becomes "Themed Mantine/<Group>/<Name>".

| Group | Old files -> `mantine/<group>/<Name>.stories.tsx` |
|---|---|
| Actions | `theme/ActionIcon`, `theme/Anchor`, `theme/Burger`, `theme/Button`, `theme/CloseButton` |
| Inputs | `theme/Autocomplete`, `theme/FileInput`, `theme/JsonInput`, `theme/MultiSelect`, `theme/NumberInput`, `theme/PasswordInput`, `theme/Pill`, `theme/PillsInput`, `theme/TagsInput`, `theme/Textarea`, `theme/TextInput` |
| Selection | `theme/Checkbox`, `theme/Radio`, `theme/RangeSlider`, `theme/SegmentedControl` (plus the new `PicturesInAPanelRow` story, section 4.2), `theme/Slider`, `theme/Switch` |
| Navigation | `theme/NavLink`, `theme/Pagination`, `theme/Stepper`, `theme/Tabs` |
| Feedback | `theme/Badge`, `theme/Indicator`, `theme/Kbd`, `theme/Loader`, `theme/Progress`, `theme/RingProgress` |
| Surfaces | `theme/Avatar`, `theme/Card`, `figma/chrome/Divider` (was Figma/Chrome/Divider), `figma/overlays/ScrollArea` (above), `theme/Text`, `theme/ThemeIcon` |

Within Themed Mantine files, a story that shows one state and nothing else (Checkbox
`Unchecked`, `Checked`, `Disabled`, `DisabledChecked`, `Indeterminate`; Switch `Off`, `On`,
`DisabledOff`, `DisabledOn`; Radio `Unselected`, `Selected`, `Disabled`; and the `Disabled` /
`WithError` / `WithValue` single-state stories of the input files) is deleted: it is a cell of
that file's States story, which now shows it in both schemes. Stories that show a feature
rather than a state (`Variants`, `Sections`, `Colors`, `JoinedGroup`, `MultiRow`, `WithMarks`,
`Clearable`, `MaxTags`) stay.

**Helpers** (not stories). Copied verbatim, export names unchanged, into `stories/helpers/`;
the old files are deleted by the integrator once nothing imports them.

| Old | New |
|---|---|
| `figma/inputs/StateGrid.ts` | `helpers/input-states.ts` |
| `figma/selection/StateGrid.ts` | `helpers/selection-states.ts` |
| `figma/chrome/StoryPanel.ts` | `helpers/story-panel.ts` |
| `figma/color/ForceState.ts` | `helpers/force-state.ts` |
| (new) | `helpers/schemes.ts` (`BOTH_SCHEMES`, section 3.2) |

Merging the four grid helpers into one is left for later: it touches all 44 importers again
for no reader-visible change.

### 2.3 Sort order

`.storybook/preview.tsx` `parameters.options.storySort`:

```ts
storySort: {
    method: "alphabetical",
    order: [
        "Introduction", ["Getting started", "Choosing a component", "Customising the theme",
            "Languages and direction", "Events and shared props", "Accessibility", "Upgrading to 0.9"],
        "Foundations", ["Colour", "Typography", "Spacing, radii and grid", "Elevation",
            "Focus and motion", "Glyphs"],
        "Components", [
            "Panels and rows", ["Overview"], "Inputs", ["Overview"], "Selection", ["Overview"],
            "Colour", ["Overview"], "Actions", ["Overview"], "Overlays", ["Overview"],
            "Lists and trees", ["Overview"], "Data display", ["Overview"], "App shell", ["Overview"],
        ],
        "Patterns",
        "Themed Mantine", ["Actions", "Inputs", "Selection", "Navigation", "Feedback", "Surfaces"],
        "*",
    ],
},
```

`includeNames` stays off, so stories inside a page keep their export order (Default first,
then States). The first page a visitor lands on is Introduction/Getting started.

## 3. The component page

### 3.1 Autodocs, globally

`preview.tsx` sets `tags: ["autodocs"]` for every CSF file and `parameters.docs.toc: true`, so
every component gets a Docs page without per-file opt-in, and long pages get a table of
contents. No per-component MDX: the page is Storybook's default autodocs page (Title,
Description, Primary story with "Show code", Controls, then every other story), and the
Description block is the JSDoc comment above `const meta`, which Storybook renders as
Markdown. The existing StyleSelect page already works this way.

Every CSF file is laid out like this:

```tsx
/**
 * <One sentence: what it is and what it is for.>
 *
 * ## When to use it
 *
 * Reach for <Name> when <job>. Reach for <nearest alternative> when <other job>.
 * (A two-row table is fine when the difference has several parts.)
 *
 * ## Usage
 *
 * ```tsx
 * import { <Name> } from "@graphty/compact-mantine";
 *
 * <Name ... />
 * ```
 *
 * ## Keyboard and accessibility
 *
 * - <keys and what they do>
 * - <role / pattern, how it is named, what is announced>
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Height | 24px control in a 32px row |
 * | Radius | 5px |
 * (from design/figma-spec.md section <n>)
 */
const meta: Meta<typeof Name> = {
    title: "Components/<Group>/<Name>",
    component: Name,
    // subcomponents: { ... } when the page documents a family
};
export default meta;

/** One sentence on what this example shows. */
export const Default: Story = { args: { ... } };   // args-driven, so Controls work

/** Every state, light and dark side by side. */
export const States: Story = { parameters: BOTH_SCHEMES, render: ... };

// then feature stories, then Keyboard / Translated / RightToLeft last
```

Rules:

- `Default` is the first export and is driven by `args`, so the Controls table edits it.
- `States` is the second export and uses `parameters: BOTH_SCHEMES`.
- Every story has a one-sentence JSDoc comment; Storybook shows it above the story.
- Measurements come from `design/figma-spec.md` (heights, radius, padding, widths); cite the
  section number, as the existing JSDoc comments do.
- The "When to use it" pairs every page must answer:

| Page | Nearest alternative it must name |
|---|---|
| SearchInput | Mantine TextInput (search adds the glyph, clear button and Escape-to-clear) |
| ComboInput | Select (fixed choices) and Autocomplete (free text with suggestions) |
| Select | StyleSelect on the same page (undefined means "inherit the default") and ComboInput |
| StyleNumberInput | PanelField `kind="number"` (the panel field) and Mantine NumberInput (a form) |
| PanelField | FieldRow (lays out one or two PanelFields) |
| ContextMenu (Menu page) | Mantine Menu (opened from a button rather than a right-click) |
| Tooltip | InfoCircle (an explanation the reader asks for, which stays open) |
| Popout | Mantine Popover (one-off, not draggable, no nesting) |
| Tree | DataRow (a reading, not an object the reader selects, renames or moves) and PageList (flat, no nesting) |
| DataRow | Tree / PageList / ResultRow (lists of objects) and DataTable (columns, thousands of rows) |
| ToggleRow | ToggleWithContent (a yes/no that brings its own settings) and the trailing-slot checkbox (a lone boolean) |
| SegmentedControl (Themed Mantine) | the replacement for IconGroupRow: pictures in segments, section 4.2 |
| CompactColorInput | ColorPickerPanel (the picker on its own, for a surface of your own) |
| GradientEditor | ColorPickerPanel's `gradient` slot, which hosts it |
| ToggleIconButton | Mantine ActionIcon (an action, not an on/off state) |
| SplitButton | Mantine Menu on a Button (no default action) |
| ControlSection | ControlGroup (never folds) and ControlSubGroup (quieter, nested) |

Themed Mantine pages use the same template with shorter text: one line saying what the theme
changes, a link to the component's mantine.dev page for its props, Default, States, and the
feature stories. Their Controls table is Mantine's docgen, which is sparse; that is expected.

### 3.2 How light and dark are shown

Two mechanisms, for two audiences:

1. **The toolbar global** (`theme`: light or dark) drives every story, for a reader clicking
   around. Chromatic keeps its two modes, `light` and `dark`, for every story, so every story
   is captured in both schemes from a real, un-nested render. This is the regression record.
2. **`BOTH_SCHEMES` on the States story** shows light and dark side by side on the docs page, so
   a reader sees both without touching the toolbar. `stories/helpers/schemes.ts`:

   ```ts
   export const BOTH_SCHEMES = { schemes: "both" } as const;
   ```

   and the preview decorator, when `context.parameters.schemes === "both"`, renders the story
   twice in a wrapping row. Each half is
   `<div className="cm-scheme-<s>" data-mantine-color-scheme="<s>" style={{ colorScheme: "<s>", background: "var(--cm-bg)", color: "var(--cm-text)", padding: 16 }}>`
   holding a nested `MantineProvider` with the same theme, `forceColorScheme="<s>"`,
   `cssVariablesSelector=".cm-scheme-<s>"` and `getRootElement` returning that div, with a
   9px caption "Light" / "Dark" above it. The toolbar's `theme` global is ignored for these
   stories; `contrast` and `direction` still apply.

   Portalled overlays escape the halves (Mantine renders them into `document.body`). A States
   story that holds an overlay open renders it in place: `withinPortal={false}` or
   `comboboxProps={{ withinPortal: false }}`.

   Verification the Foundations package must do before handing over: screenshot one field, one
   button and one open listbox States story (a) as a pair and (b) alone under each toolbar
   scheme, and compare each half with the single render. A half that differs has found a rule
   the theme draws from Mantine's `[data-mantine-color-scheme]` ancestor selector instead of a
   `light-dark()` `--cm-*` token. That is a theme defect -- the same leak breaks a consumer's
   "compact region inside a normal app" -- and the fix goes in the theme's stylesheet, not in the
   story. List any such rules found; fix them only if the fix is a token swap.

## 4. Component consolidations

### 4.1 GradientEditor picks colours with ColorPickerPanel

Today each stop row holds a `CompactColorInput`, which opens its own pop-out picker per stop.
Inside a colour picker that is a pop-out on a pop-out, and it is not how Figma's gradient mode
works: Figma shows one picker, under the gradient bar, editing the selected stop.

New layout of `GradientEditor`, top to bottom (figma-spec 7.5):

1. The 208 x 24 gradient bar with its stop handles and the direction controls (unchanged).
2. **A `ColorPickerPanel` for the selected stop**: `value={selected.color}`,
   `withAlpha={false}` (a `ColorStop.color` is `#RRGGBB`; see the audit's deviation note),
   `onChange` writes the selected stop live, `onChangeEnd` ends the gesture the same way a
   handle drag does (one undo entry per drag, as `CoalescedIntoOneUndoEntry` tests today). No
   `gradient` prop, so it draws no paint-type bar. It sits full width in the editor's 240px
   column; the picker's own 16px body padding is the editor's padding for that band.
3. The "Stops" header and one 32px row per stop: position % field, **a chit and a hex text
   field** (the chit is a button that selects the stop, `aria-pressed` on the selected one; the
   hex field commits on Enter or blur and reverts on Escape through the existing
   `color/escape` helpers), and the minus button. No pop-out.

Selecting a stop -- its handle, its row's chit, or focus entering its row -- makes the picker
edit it (the editor already tracks `selectedId`). Public props do not change. Behaviour change
for the changelog: stop colours are edited in the editor's own picker; the stop rows no longer
open a pop-out. When a GradientEditor is placed in a `ColorPickerPanel`'s `gradient` slot,
the outer panel draws Solid / Gradient and the inner one draws only the picker body, so there is
one paint-type bar.

Files: `src/components/GradientEditor.tsx`, the `.cm-gradient-*` rules in
`src/theme/css/color.css.ts`, `tests/components/GradientEditor.test.tsx`, the gradient cases in
`tests/figma/color.browser.test.tsx`.

### 4.2 IconGroupRow is removed

IconGroupRow is already built on the themed Mantine `SegmentedControl` (it was moved onto it
before this release; the audit rates the panel segmented control PASS). What it adds is layout:
a 32px row, the 88 / 184px band, the trailing slot, pictures with hidden words, Home/End, and
development warnings for fewer than two or more than six options. Nothing uses it: not the
graphty app (two app files explain why they did not), not another component in the package.

Decision: remove it (the owner's "or removed if nothing needs it"). The themed SegmentedControl
already draws the panel look, so a reader loses no appearance. The Themed Mantine SegmentedControl
page gains `PicturesInAPanelRow`: a `SegmentedControl fullWidth` whose `data` labels are a 14px
glyph plus a `VisuallyHidden` word, next to a `TrailingSlot`, inside a `ControlSection`. That is
the recipe the "Choosing a component" page and the Selection overview point to. Undo cost: a
file restore and a minor release, so this is not a one-way door.

Breaking changes (CHANGELOG-figma.md, 0.9.0): `IconGroupRow`, `IconGroupRowProps` and
`IconGroupOption` are no longer exported. Migration: use `SegmentedControl` as in the recipe.

Files: delete `src/components/rows/IconGroupRow.tsx`, `stories/IconGroupRow.stories.tsx`,
`tests/components/rows/IconGroupRow.test.tsx`, `tests/components/rows/IconGroupRow.browser.test.tsx`
and its eight `tests/components/rows/__screenshots__/IconGroupRow.browser.test.tsx/an-icon-group-*`
images; edit `src/components/rows/index.ts`, `src/types/index.ts`, `src/index.ts` (the
IconGroupRow lines only), `tests/exports.test.ts`, `tests/consistency.test.tsx`,
`tests/components/disabledReason.test.tsx`, `tests/components/rows/trailing-slot-grid.browser.test.tsx`,
and the comments naming it in `src/i18n/labels.ts` and `src/utils/control-annotation.ts`.

Follow-up, not in this release: the graphty app hand-builds two radio tracks
(`graphty/src/components/shell/toolbar/ViewModeSegment.tsx` and `CardViewToggle` in
`graphty/src/components/shell/panel/AnalyzePanel.tsx`), each with a comment explaining why it
could not use IconGroupRow. With IconGroupRow gone, both should become `SegmentedControl`
(`variant="toolbar"` for the canvas one). Record it as an issue.

### 4.3 The graphty app's style layer list moves to Tree

The owner's note says the style layer list is built on DataRow. It is not: it is
`graphty/src/components/layout/LeftSidebar.tsx`, a hand-built list with dnd-kit sorting, its own
drag-handle glyph, a Mantine TextInput for rename and hard-coded Mantine colours, embedded in
`StylePanel`'s "Layers" section. The DataRow rows in `StylePanel` are the Styles library
(apply a built-in or saved style), which is a name/value reading and stays on DataRow.

The list becomes a flat `Tree`:

- items: the layers in reverse order (the topmost layer first, as today), each
  `{ id: layer.id, name: layer.name }`, no `children` (so a drop can only reorder, never nest);
- `label="Style layers"`, `renameLabel="Layer name"`;
- `selected={selectedLayerId === null ? [] : [selectedLayerId]}`, `onSelect(ids)` calls
  `onLayerSelect(ids[0])`;
- `onRename(id, name)`: a trimmed non-empty name replaces that layer's name through
  `onLayersChange`; an empty name is refused (the current behaviour);
- `onMove({ id, index })`: reorder in the reversed list, reverse back, `onLayersChange`.

A new file `graphty/src/components/shell/panel/StyleLayerList.tsx` holds this mapping and
re-exports `export type LayerItem = Layer` so the eight files that import the type only change
their import path. `LeftSidebar.tsx` and its test are deleted; its unused non-embedded mode
(header, own Add button) goes with it. The dnd-kit packages have no other user in the app and
are removed from `graphty/package.json`.

**One element change first.** dnd-kit's default sensors include a keyboard sensor, so today a
layer can be reordered from the keyboard (focus the handle, Space, arrows, Space). Tree has no
keyboard move, so switching would regress. Tree gains one: while `onMove` is given, Alt+ArrowUp
and Alt+ArrowDown move the focused item one place among its siblings, reported through `onMove`,
focus following the item. Alt+ArrowUp/Down is the move-item chord most editors use and does not
collide with Tree's existing keys (arrows, Home/End, `*`, F2, Alt+L, type-ahead). Additive, not
breaking. The Tree page's Keyboard story and the Lists and trees overview document it.

Tests: `LeftSidebar.test.tsx`'s cases (select, rename by double-click and F2, Escape cancels,
empty name refused, reorder by drag, reorder by keyboard, reverse order) move into a new
`StyleLayerList.test.tsx`; `AppShell.test.tsx`'s `dragRow` helper stops looking for
`layer-drag-handle` and drags the row itself, as Tree's own browser test does.

### 4.4 DataRow keeps only data rows

With object lists on Tree, PageList and ResultRow, DataRow is for readings: statistics, facts,
rankings. It keeps `name`, `value`, `icon`, `selected` (the current item of a ranking, as the
app's PatternMatchInspector uses it), `onClick` (open what the reading is about, as the app's
Styles library, samples and recent files use it), `onFocus`, `onBlur` and `trailing`.

It loses the props that exist only for object lists, none of which the app uses: `role` and
the `DataRowRole` type (the listbox `option` mode), `tabIndex` (roving focus for that listbox),
`onDoubleClick` (open or rename) and `onContextMenu`. Breaking changes (CHANGELOG-figma.md):
those four props and the `DataRowRole` export are removed. Migration: a selectable, renameable
or reorderable list is a `Tree` (nesting) or a `PageList` (flat); a find result is a
`ResultRow`.

Files: `src/components/rows/DataRow.tsx`, `src/types/index.ts` and `src/index.ts` (the
DataRowRole line only), `tests/exports.test.ts`, `tests/components/rows/DataRow.test.tsx`.

### 4.5 One Select page; StyleSelect stays a thin wrapper

Decision: keep `StyleSelect` as its own export and document it on the one Select page
(`component: StyleSelect`, since it is the package's own export and has a real props table;
the themed Mantine `Select` is shown in `Default` and `States` with a link to mantine.dev).

Why not move its reset button into the themed Select: StyleSelect's contract is a data
convention, not a look -- `undefined` means "inherit the default", the reset reports
`undefined`, and the button exists only while a choice has been made. A theme can restyle
Select but cannot add a button with a different `onChange` meaning, and doing it through the
theme would change every Select in every consumer's app. Reversible: merging later is an
additive change.

### 4.6 Changelog

`CHANGELOG-figma.md` currently says "Every existing export keeps its name and its props". That
sentence becomes false and is replaced by a "Breaking changes in 0.9.0" section listing 4.2 and
4.4 with their migrations, plus behaviour notes for 4.1 (stop colours edited in the editor's
own picker) and the Tree keyboard move (4.3). The README's "Breaking changes in the Figma
release" section and the Introduction "Upgrading to 0.9" page repeat the same list.

## 5. Work packages

Phases run in order; packages within a phase run in parallel and own disjoint files.

- **Phase 1:** `gradient-editor-picker`, `rows-and-tree-api`, `docs-and-foundations`.
- **Phase 2:** `app-style-layers-on-tree` (needs the Tree keyboard move) and every other story
  package (they need `stories/helpers/` and the component changes).
- **Phase 3, the integrator:** see 5.3.

Rules for every package: import story helpers from `stories/helpers/`; never edit
`src/components/inputs/listbox.tsx` or `stories/figma/inputs/ComboInput.stories.tsx`; never edit
`.storybook/` (only `docs-and-foundations` does); never delete `stories/docs/*.mdx` or the old
helper files (the integrator does, after every reader is done); plain ASCII.

`src/index.ts` is edited only by `rows-and-tree-api` (the IconGroupRow and DataRowRole lines).
No other package changes an export.

### 5.1 Component packages

| Key | What | Files |
|---|---|---|
| `gradient-editor-picker` | Section 4.1 | `src/components/GradientEditor.tsx`, `src/theme/css/color.css.ts`, `tests/components/GradientEditor.test.tsx`, `tests/figma/color.browser.test.tsx` |
| `rows-and-tree-api` | Sections 4.2, 4.4, the Tree keyboard move of 4.3, and 4.6 | `src/components/rows/IconGroupRow.tsx` (delete), `src/components/rows/DataRow.tsx`, `src/components/rows/index.ts`, `src/components/tree/Tree.tsx`, `src/components/tree/treeModel.ts`, `src/types/index.ts`, `src/index.ts`, `src/i18n/labels.ts`, `src/utils/control-annotation.ts`, `tests/exports.test.ts`, `tests/consistency.test.tsx`, `tests/components/disabledReason.test.tsx`, `tests/components/rows/DataRow.test.tsx`, `tests/components/rows/IconGroupRow.test.tsx` (delete), `tests/components/rows/IconGroupRow.browser.test.tsx` (delete), its screenshots (delete), `tests/components/rows/trailing-slot-grid.browser.test.tsx`, `tests/components/tree/Tree.browser.test.tsx`, `stories/IconGroupRow.stories.tsx` (delete), `CHANGELOG-figma.md` |
| `app-style-layers-on-tree` | Section 4.3, app side | `graphty/src/components/shell/panel/StyleLayerList.tsx` (new), `graphty/src/components/shell/panel/__tests__/StyleLayerList.test.tsx` (new), `graphty/src/components/shell/panel/StylePanel.tsx`, `graphty/src/components/shell/panel/__tests__/StylePanel.test.tsx`, `graphty/src/components/layout/LeftSidebar.tsx` (delete), `graphty/src/components/layout/__tests__/LeftSidebar.test.tsx` (delete), `graphty/src/components/shell/__tests__/AppShell.test.tsx`, the `LayerItem` import path in `graphty/src/components/Graphty.tsx`, `graphty/src/components/shell/AppShell.tsx`, `graphty/src/components/shell/canvas/CanvasRegion.tsx`, `graphty/src/components/shell/inspector/StyleLayerInspector.tsx`, `graphty/src/components/sidebar/panels/StyleLayerPropertiesPanel.tsx`, `graphty/src/components/shell/inspector/__tests__/StyleLayerInspector.test.tsx`, `graphty/src/components/sidebar/panels/__tests__/StyleLayerPropertiesPanel.test.tsx`, `graphty/src/components/sidebar/__tests__/SidebarCompactIntegration.test.tsx`, `graphty/package.json` and `pnpm-lock.yaml` (drop the three `@dnd-kit/*` packages) |

### 5.2 Story packages

Each owns the new folder for its section and the old files it moves there (moving = create at
the new path, delete the old path). Each rewrites every meta JSDoc to the template of 3.1, adds
`States` with `BOTH_SCHEMES`, puts `Default` first, and writes its Overview page from the old
overview MDX it reads.

| Key | Section | Owns |
|---|---|---|
| `docs-and-foundations` | Introduction and Foundations, plus the Storybook config | `.storybook/preview.tsx`, `.storybook/main.ts`, `stories/helpers/*` (new), `stories/introduction/*.mdx` (new), `stories/foundations/*` (new), `stories/theme/LightDarkMode.stories.tsx` (moves to Colour), `stories/Glyphs.stories.tsx` (moves), `README.md` |
| `components-panels` | Components/Panels and rows | `stories/components/panels/*`; moves `ControlSection`, `ControlGroup`, `ControlSubGroup`, `FieldRow`, `CompoundRow`, `TrailingSlot` stories and `stories/figma/chrome/ResizeHandle.stories.tsx`; reads `stories/docs/BuildingAPanel.mdx` |
| `components-inputs` | Components/Inputs | `stories/components/inputs/*` (not ComboInput); moves `PanelField`, `StyleNumberInput`, `figma/inputs/SearchInput`, `figma/inputs/VariablePill`; merges `theme/Select`, `figma/inputs/Listbox`, `StyleSelect` into `Select.stories.tsx`; reads `stories/docs/EditingAValue.mdx` |
| `components-selection` | Components/Selection | `stories/components/selection/*`; moves `ToggleRow`, `ToggleRowGroup`, `ToggleWithContent`, `figma/selection/AlignmentMatrix`; reads `stories/docs/EditingAValue.mdx` |
| `components-colour` | Components/Colour | `stories/components/colour/*`; moves `CompactColorInput`, `GradientEditor`, `RampRow`, `figma/color/ColorPickerPanel`; reads `stories/docs/EditingAValue.mdx` |
| `components-actions` | Components/Actions | `stories/components/actions/*`; moves `figma/buttons/ToggleIconButton`, `figma/buttons/SplitButton`, `AdvancedButton` |
| `components-overlays` | Components/Overlays | `stories/components/overlays/*`; merges `src/components/popout/Popout.stories.tsx`, `src/components/popout/PopoutAnchor.stories.tsx`, `figma/overlays/Popover` into `Popout.stories.tsx`; moves `src/components/popout/PopoutButton.stories.tsx`, `InfoCircle`, `figma/overlays/Menu`, `figma/overlays/Tooltip`, `figma/overlays/Modal`, `figma/overlays/Toast`; reads `stories/docs/FloatingPanels.mdx` |
| `components-lists` | Components/Lists and trees | `stories/components/lists/*`; moves `figma/tree/Tree`, `PageList`, `InlineRename`, `ResultRow`, `fixtures.ts`; adds the `FlatReorderableList` Tree story |
| `components-data` | Components/Data display | `stories/components/data/*`; moves `DataRow` (dropping the object-list stories), `DataRowHeader`, `RankChip`, `MetricRow`, `HistogramRow`, `SparklineRow`, `ProseBlock`, `ActionRow`, `DataTable`; reads `stories/docs/ShowingData.mdx` |
| `components-shell` | Components/App shell | `stories/components/shell/*`; moves `figma/shell/*` stories and `fixtures.ts` |
| `patterns` | Patterns (and the Customising the theme CSF) | `stories/patterns/*`, `stories/introduction/CustomisingTheTheme.stories.tsx`; splits and deletes `stories/Theming.stories.tsx`; reads `stories/docs/CompactTheme.mdx` |
| `themed-mantine` | Themed Mantine | `stories/mantine/**`; moves every `stories/theme/*` file except `Select` and `LightDarkMode`, plus `figma/chrome/Divider` and `figma/overlays/ScrollArea`; adds `PicturesInAPanelRow` to SegmentedControl |

### 5.3 The integrator (phase 3, last)

1. Move `stories/figma/inputs/ComboInput.stories.tsx` to
   `stories/components/inputs/ComboInput.stories.tsx`: title "Components/Inputs/ComboInput",
   the 3.1 template (vs Select and Autocomplete), a `BOTH_SCHEMES` States story, helpers from
   `stories/helpers/`. Only once the agent fixing `listbox.tsx` and that story is done.
2. Delete `stories/docs/`, the four old helper files and the then-empty `stories/figma/`,
   `stories/theme/`.
3. Update `tmp/figma-comparison-build.py`'s story-id keys (for example
   `figma-chrome-divider--states` becomes `themed-mantine-surfaces-divider--states`) and its
   source directory, and rebuild the gallery.
4. Check: no story title starts with "Figma/", "Compact Theme/", "Building a Panel/",
   "Editing a Value/", "Showing Data/", "Floating Panels/", "Glyphs/" or "Getting Started/";
   every exported component in `src/index.ts` has exactly one page; `build-storybook` succeeds
   with no duplicate-title or missing-import warnings.
5. Run lint, build, knip and the tests of compact-mantine and graphty.
6. Chromatic: every story id changes, so every snapshot shows as new. Only the owner accepts
   them.
