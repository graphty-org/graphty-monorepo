# The components

Every component has one page in
[Storybook](https://graphty.app/storybook/compact-mantine/): what it is for and when to use it
instead of its nearest alternative, an example whose props you can edit, every state in light
and dark side by side, the keyboard, and the key measurements. Every prop is also documented in
your editor. The groups below match the Storybook sidebar, and each group has an overview page.

## Inputs

Values the reader types or picks. [Overview](https://graphty.app/storybook/compact-mantine/?path=/docs/components-inputs-overview--docs)

| Component                                                                                                        | Reach for it when                                                                                                                                                                |
| ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`PanelField`](https://graphty.app/storybook/compact-mantine/?path=/docs/components-inputs-panelfield--docs)     | a value is typed, picked from a list or dragged in a panel row. A 24px text box, number box or select whose caption is a 16px drawing inside the box instead of a word above it. |
| [`Select`](https://graphty.app/storybook/compact-mantine/?path=/docs/components-inputs-select--docs)             | one of a fixed list. Mantine's `Select` is themed as Figma's outlined trigger with a list.                                                                                       |
| [`SearchInput`](https://graphty.app/storybook/compact-mantine/?path=/docs/components-inputs-searchinput--docs)   | a filter or find box: a leading magnifier, a clear button and Escape to clear.                                                                                                   |
| [`ComboInput`](https://graphty.app/storybook/compact-mantine/?path=/docs/components-inputs-comboinput--docs)     | a value you can type, with a chevron that opens a list of presets over the field (font size, gap, export scale).                                                                 |
| [`VariablePill`](https://graphty.app/storybook/compact-mantine/?path=/docs/components-inputs-variablepill--docs) | a value bound to a named variable, drawn as a pill inside a field, with a Detach button.                                                                                         |

## Selection

Yes or no, and one of a few. [Overview](https://graphty.app/storybook/compact-mantine/?path=/docs/components-selection-overview--docs)

| Component                                                                                                                     | Reach for it when                                                                              |
| ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| [`ToggleRow`](https://graphty.app/storybook/compact-mantine/?path=/docs/components-selection-togglerow--docs)                 | a setting is a plain yes or no that no picture could stand for.                                |
| [`ToggleRowGroup`](https://graphty.app/storybook/compact-mantine/?path=/docs/components-selection-togglerowgroup--docs)       | you have two or more of those. It packs them and warns in development if you give it only one. |
| [`ToggleWithContent`](https://graphty.app/storybook/compact-mantine/?path=/docs/components-selection-togglewithcontent--docs) | a yes or no brings its own settings with it; turning it off takes them off the screen.         |
| [`AlignmentMatrix`](https://graphty.app/storybook/compact-mantine/?path=/docs/components-selection-alignmentmatrix--docs)     | the 3 x 3 alignment grid: nine radios with two-dimensional arrow keys.                         |

Two to six options whose difference can be drawn are this package's `SegmentedControl` with a
glyph and a visually hidden word in each segment; its
[Storybook page](https://graphty.app/storybook/compact-mantine/?path=/docs/themed-mantine-selection-segmentedcontrol--docs) shows the recipe in a panel
row. (`IconGroupRow` did this until 0.9.)

## Actions

[Overview](https://graphty.app/storybook/compact-mantine/?path=/docs/components-actions-overview--docs)

| Component                                                                                                                 | Reach for it when                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| [`ToggleIconButton`](https://graphty.app/storybook/compact-mantine/?path=/docs/components-actions-toggleiconbutton--docs) | an icon button stays pressed (`aria-pressed`): a lock, a visibility eye. Drag across a column of them to set them all.   |
| [`SplitButton`](https://graphty.app/storybook/compact-mantine/?path=/docs/components-actions-splitbutton--docs)           | a main action and a chevron that opens a menu of related choices.                                                        |
| [`AdvancedButton`](https://graphty.app/storybook/compact-mantine/?path=/docs/components-actions-advancedbutton--docs)     | a row or a section has settings most people never change. It marks itself when something behind it is no longer default. |

Variants the theme adds to Mantine buttons (pass them as `variant`): `Button` `danger`,
`danger-outline`, `inverse`, `success`; `ActionIcon` `joined` (inside a themed
`ActionIcon.Group`).

## Other overlays

| Component                                                                                                                         | What it is                                                                                                                                             |
| --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`ContextMenu`, `MenuCheckItem`](https://graphty.app/storybook/compact-mantine/?path=/docs/components-overlays-menu--docs)        | A menu opened at the pointer by a right-click, or from the keyboard with Shift+F10 or the ContextMenu key; and a checkable row for any Mantine `Menu`. |
| [`TooltipShortcut`](https://graphty.app/storybook/compact-mantine/?path=/docs/components-overlays-tooltip--docs)                  | A tooltip label with its keyboard shortcut after it.                                                                                                   |
| [`TargetTooltip`](https://graphty.app/storybook/compact-mantine/?path=/docs/components-overlays-tooltip--docs)                    | The tooltip for a button that opens a `Menu` or `Popover`, inside `Menu.Target`: the button keeps `aria-expanded` and its open look.                   |
| [`ModalFooter`](https://graphty.app/storybook/compact-mantine/?path=/docs/components-overlays-modal--docs)                        | The footer row of a Mantine `Modal`: its action buttons, end-aligned.                                                                                  |
| [`Toast`, `ToastProvider`, `useToast`](https://graphty.app/storybook/compact-mantine/?path=/docs/components-overlays-toast--docs) | Figma's dark toast: put one `ToastProvider` near the root and call `useToast()` to show one.                                                           |

## Lists and trees

Objects the reader selects, renames or moves. [Overview](https://graphty.app/storybook/compact-mantine/?path=/docs/components-lists-and-trees-overview--docs)

| Component                                                                                                                    | Reach for it when                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`Tree`, `TreeItem`](https://graphty.app/storybook/compact-mantine/?path=/docs/components-lists-and-trees-tree--docs)        | a list of objects, nested or flat: a real ARIA tree with arrow keys, multiple selection, F2 to rename, drag to reorder, and Alt+ArrowUp / Alt+ArrowDown to move an item when you pass `onMove`. With no `children` on any item it is a flat reorderable list. The tree never edits your data: `moveTreeItem(items, move)` and `renameTreeItem(items, id, name)` apply what `onMove` and `onRename` report and return a new list. A row can also carry a `swatch`, an always-visible `count`, a `progress` line and a spoken `description`, and `onRowKeyDown` gives rows keys of their own (Space, Delete). |
| [`PageList`, `PageRow`](https://graphty.app/storybook/compact-mantine/?path=/docs/components-lists-and-trees-pagelist--docs) | flat pages with dividers, above a layer tree. A row can add a trailing `value`, a second-line `description` (in the danger ink for an error) and a `menu` of its own.                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| [`InlineRename`](https://graphty.app/storybook/compact-mantine/?path=/docs/components-lists-and-trees-inlinerename--docs)    | the in-place rename field a tree or page row turns into, for a row of your own.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| [`ResultRow`](https://graphty.app/storybook/compact-mantine/?path=/docs/components-lists-and-trees-resultrow--docs)          | one row of find results.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

## Data display

Readings: things the reader looks at rather than changes. [Overview](https://graphty.app/storybook/compact-mantine/?path=/docs/components-data-display-overview--docs)

| Component                                                                                                                | Reach for it when                                                                                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`DataRow`](https://graphty.app/storybook/compact-mantine/?path=/docs/components-data-display-datarow--docs)             | a name and a reading on one line -- a statistic, a fact, a ranking. `selected` marks the current item of a ranking; `onClick` opens what the reading is about. For objects the reader selects, renames or moves, use `Tree` or `PageList`. |
| [`DataRowHeader`](https://graphty.app/storybook/compact-mantine/?path=/docs/components-data-display-datarowheader--docs) | a run of data rows needs a caption. Give it `onSortChange` and it becomes a sort control.                                                                                                                                                  |
| [`RankChip`](https://graphty.app/storybook/compact-mantine/?path=/docs/components-data-display-rankchip--docs)           | a rank belongs beside a row: `#6`, rather than "rank 6 of 318".                                                                                                                                                                            |
| [`MetricRow`](https://graphty.app/storybook/compact-mantine/?path=/docs/components-data-display-metricrow--docs)         | one reading has a percentile and a rank: the name, a bar filled to the percentile, the number and the chip.                                                                                                                                |
| [`HistogramRow`](https://graphty.app/storybook/compact-mantine/?path=/docs/components-data-display-histogramrow--docs)   | a distribution would otherwise be spelled as the numbers that summarize it. 64px tall.                                                                                                                                                     |
| [`SparklineRow`](https://graphty.app/storybook/compact-mantine/?path=/docs/components-data-display-sparklinerow--docs)   | a series is going somewhere and you want to see which way. 32px tall.                                                                                                                                                                      |
| [`ProseBlock`](https://graphty.app/storybook/compact-mantine/?path=/docs/components-data-display-proseblock--docs)       | the panel has to say something in words: a reading, a caveat, a record of the last run.                                                                                                                                                    |
| [`ActionRow`](https://graphty.app/storybook/compact-mantine/?path=/docs/components-data-display-actionrow--docs)         | a row reports a state and offers verbs beside it.                                                                                                                                                                                          |
| [`DataTable`](https://graphty.app/storybook/compact-mantine/?path=/docs/components-data-display-datatable--docs)         | you have columns rather than rows: thousands of them, sortable, searchable, selectable, virtualized. A column can be pinned at the start, and its header can carry a glyph, a tooltip and a menu.                                          |

## The editor shell

The chrome around an editor's canvas, as Figma draws it. Each one is a real toolbar, dialog or
tab list: one Tab stop, arrow keys inside, names for screen readers.
[Overview](https://graphty.app/storybook/compact-mantine/?path=/docs/components-app-shell-overview--docs)

| Component                                                                                                                            | What it is                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`Toolbar`, `ToolButton`, `ToolGroup`](https://graphty.app/storybook/compact-mantine/?path=/docs/components-app-shell-toolbar--docs) | The floating bottom toolbar (48 tall, 13px corners, `floating` pins it bottom center), its 32 x 32 tools (`label`, `icon`, `shortcut`, `selected`), and a tool with a flyout of related tools whose face shows the last one picked.                            |
| [`SecondaryToolbar`](https://graphty.app/storybook/compact-mantine/?path=/docs/components-app-shell-secondarytoolbar--docs)          | The contextual 40-tall bar above the toolbar while a mode is active.                                                                                                                                                                                           |
| [`NavRail`, `RailButton`](https://graphty.app/storybook/compact-mantine/?path=/docs/components-app-shell-navrail--docs)              | The 56-wide navigation rail at the window's edge, and its destinations: a 32 x 32 pill over a 9px caption.                                                                                                                                                     |
| [`HelpButton`](https://graphty.app/storybook/compact-mantine/?path=/docs/components-app-shell-helpbutton--docs)                      | The round floating help button; its children are the items of the menu it opens.                                                                                                                                                                               |
| [`ShortcutSheet`](https://graphty.app/storybook/compact-mantine/?path=/docs/components-app-shell-shortcutsheet--docs)                | The keyboard shortcuts sheet docked at the window's foot: tabs of shortcut columns with dark key caps.                                                                                                                                                         |
| [`QuickActions`](https://graphty.app/storybook/compact-mantine/?path=/docs/components-app-shell-quickactions--docs)                  | The quick actions palette: a search field over sectioned rows. Typing filters, arrows move, Enter runs, Escape closes. For a short pick-list: a second line per action (`description`) and `truncate="middle"`; the search field always shows and holds focus. |

```tsx
import { useState } from "react";
import { SegmentedControl, Toolbar, ToolButton, ToolGroup } from "@graphty/compact-mantine";

function EditorToolbar() {
    const [tool, setTool] = useState("move");
    return (
        <Toolbar aria-label="Editor" floating>
            <ToolGroup label="Move tools" tools={moveTools} activeTool={tool} onToolChange={setTool} />
            <ToolGroup label="Shape tools" tools={shapeTools} activeTool={tool} onToolChange={setTool} />
            <ToolButton label="Actions" icon={<ActionsGlyph />} shortcut="Ctrl+K" />
            <Toolbar.Divider />
            <SegmentedControl variant="toolbar" data={modes} />
        </Toolbar>
    );
}
```

The shell brings no glyphs of its own for your tools: pass your own icons, drawn to sit in a 24px
box.

## Glyphs

The premise of the row components is that a small drawing can replace a word, which only works
if the drawings are a fixed, learnable set. Two components draw them:

- `FieldGlyph` -- the eight glyphs allowed inside a field's slot, each with a hollow and a filled
  form. `FIELD_GLYPH_NAMES` lists them.
- `UiGlyph` -- the shared marks the components draw elsewhere: chevrons and carets, settings, close,
  plus, check, warning, the alignment and transform verbs, and the layer shapes, each drawn with a
  1px stroke at any size. `UI_GLYPH_NAMES` lists them.

Both take a `name` and an optional `size`, draw in `currentColor`, and are hidden from screen
readers, because the control around them carries the name. `FIELD_LETTERS` is the small set of
capital letters a field may show when a concept has no picture. See every drawing on the
[Glyphs page](https://graphty.app/storybook/compact-mantine/?path=/docs/foundations-glyphs--docs).

## Themed Mantine components

The Mantine components the theme restyles but does not wrap have their own section in Storybook,
[Themed Mantine](https://graphty.app/storybook/compact-mantine/?path=/docs/themed-mantine-actions-button--docs), grouped as actions, inputs,
selection, navigation, feedback and surfaces. Their props are Mantine's. Looks the theme adds through
`variant`: `Checkbox` `neutral` (Figma's gray panel checkbox; the default is the blue dialog one),
`SegmentedControl` `toolbar` (the sliding mode switch) and `loose`, `Anchor` `secondary`, and
`Tabs` `default` (the underline tabs; pills are the default).
