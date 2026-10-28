# Expert walkthrough: controls and gestures, judged against Figma

Build: 758b8e8081 (`.study-builds/tier3-r1d2-758b8e8081`), the frozen build of tier 3.
Date: 2026-10-21. Reviewer: Figma Product Designer.

## What was walked

Three `real.mjs` sessions at 1440 x 900, light theme, every screenshot looked at. Paths below are
relative to `figma/`; `crops/` holds enlarged cut-outs of the same screenshots.

- `a-start/` (61 shots): the empty start screen, the sample library, Les Miserables; the base
  layer's Node and Edge tabs; the color popover, a pick and Control+Z; binding color to a column
  and its value popover; the Values tab; the "+" menu of Style layers; a new layer, rename, the
  "Which nodes" picker with a text card; adding a fill; the layer context menu, Duplicate, the
  painted-over mark; Shift-click multi-select and the bulk panel; Control+G; Move to folder;
  "+" > Folder around a selection; the purple "Layer" token and its popover; hovering a layer row;
  dragging rows; Delete and Control+Z on a layer; tooltips of the toolbar and header.
- `b-volunteers/` (17 shots): opening `volunteers.graphml` (the import screen), the attribute list
  of "Add a condition", category and number cards, arrow keys in number fields, "+" on Shape and
  Text, a label bound to a column, the label settings popover, the Data panel.
- `c-saved/` (4 shots): opening `lesmis-poster.graphty.json`, a colleague's layer, "Select what it
  paints".

Severity: 0 cosmetic only, 1 minor, 2 noticeable inconsistency or cost, 3 leads a reader to act on
the wrong thing or hides a control, 4 blocks a task. Owner is the package where the fix belongs.

## Findings, most severe first

| # | Sev | Screen | Finding | Evidence | Owner |
| - | --- | ------ | ------- | -------- | ----- |
| 1 | 3 | Layer tree, multi-select | Shift-click selects a range from the last layer the reader clicked, not from the current selection. After Duplicate selected "Picked copy", Shift-click on "Picked" selected Picked and Everything (the base layer the reader never touched), and the bulk panel then edits the base layer. Figma moves the range anchor to whatever is selected, however it got selected (a click, Duplicate, a new layer, Undo). | `a-start/38.png` then `a-start/41.png` | graphty |
| 2 | 2 | Folder / several layers, "Layer" token | When two layers set different colors and one is painted over, the field strip and its chit line show only the color that wins (one blue chit for two layers, red and blue), and the spoken name says "2 colors: Picked copy blue". The popover behind it lists both. A mixed field must show every value it mixes, as Figma's Selection colors does. | `a-start/54.png`, `a-start/55.png` | graphty |
| 3 | 2 | Three attribute pickers | Choosing a column is drawn three ways: an inline drop-down in 11 px type under "Add a condition" (`a-start/30.png`, `b-volunteers/04.png`), a side popover in 14 px type with half its height empty for binding a color (`a-start/17.png`), and a side popover in 14 px type with a scrollbar for a label (`b-volunteers/14.png`). Figma has one variable picker, one type size, sized to its content. | as listed | graphty |
| 4 | 2 | "Color by name" / "Color from each layer" popover | Values are a bordered grid with a header row (Color, Group, Nodes, Actions); value names are about 9 px while counts are 12 px; the row "..." and the palette's minus have no tooltip; "69 more" is plain text. Figma lists values as rows (swatch, name, count, eye, more) with no grid and no header, at the panel's one type size. | `a-start/19.png`, `crops/a19-bindpop.png` | graphty |
| 5 | 2 | Layer tree, folders | Control+G does nothing with two layers selected; the context menu has no "Put in a new folder"; "Move to folder" opens a submenu that says only "No folders yet". "+" > Folder does wrap the selection, so the capability exists but the two doors a Figma user tries first lead nowhere. | `a-start/44.png`, `crops/a46-menu.png`, `a-start/48.png` | graphty |
| 6 | 2 | Layer tree and Which nodes | Hovering or selecting a layer row marks nothing on the canvas, and building a condition card changes nothing on the canvas until a property is set; the only way to see a layer's nodes is "Select what it paints", which replaces the selection. Figma outlines a layer's object on hover in the layers panel. The outline must be drawn by the element through its layer system, not by the app. | `a-start/56.png` vs `a-start/57.png` (only the row changes), `b-volunteers/06.png` | graphty-element (a transient highlight of a node set), graphty (calling it on hover) |
| 7 | 2 | Number card | Up and Down do not step the card's "to" field; the Size property field steps with them (1 to 3 with two presses). One field, two behaviors. Figma: arrows step 1, Shift+arrows 10, in every number field. | `crops/b08-card.png`, `crops/b09-card.png` vs `b-volunteers/12.png` | graphty (the card uses another input; use the shared number field) |
| 8 | 2 | Style tab, several states | Sentences sit in the panel where Figma has none: "Everything styles all 77 nodes: it is the base layer, under every other layer." (`a-start/05.png`), "All 77 nodes: add a condition to narrow" (`a-start/27.png`), "2 layers in New folder. Layers added later are not changed." (`a-start/48.png`), a three-line arrowhead paragraph (`a-start/25.png`), "1 layer sets shape; not set: Picked" under each bulk field (`a-start/41.png`). Figma states these with a count, a mark or a tooltip. | as listed | graphty |
| 9 | 2 | Layer row | A pin glyph after the count on Hovered, Selected and Everything has no tooltip and no name, and the same slot shows a count, a count and a pin, or the painted-over mark with no count. The context menu reveals the pin means "Pin to top/bottom". Figma's row has one trailing slot (lock, eye) and no unexplained glyph. | `crops/a05-tree.png`, `crops/a37-tree.png` | graphty |
| 10 | 2 | Text section, label row | The label row uses another grammar than the property rows above it: icon, name, a 60 px field starting 15 px right of the field column, gear, eye, minus. The bound column ("name") is drawn as plain text in a field, where a bound color is drawn as a pill with the link mark lit. One binding, two drawings. | `crops/b15-textrow.png`, `a-start/18.png` | graphty |
| 11 | 2 | Label settings popover | About 30 fields, stacked label-above-field (a third row grammar), scrolling the full window height, with tooltip-panel settings (Close button, Panel shadow, margins) inside a label's settings. Figma's Type settings is one short popover with Basics and Details. | `b-volunteers/16.png` | graphty |
| 12 | 2 | Canvas labels | Labels draw in a serif face while the label's font says Verdana: the font is named with no generic fallback, so a machine without it falls back to the browser's serif. | `crops/b15-labels.png`, `b-volunteers/16.png` | graphty-element |
| 13 | 2 | Condition card | A card is removed with an X; a property is removed with a minus two rows below. Figma removes list items with a minus everywhere. | `a-start/31.png` | graphty |
| 14 | 2 | Duplicate | Duplicating a node layer ("Node layer", Edge "not styled") makes a "Node and edge layer" with a different icon. Figma's duplicate is an exact copy. | `a-start/35.png` vs `a-start/38.png`, `crops/a37-tree.png` | graphty |
| 15 | 2 | Which nodes | The picker has a filled primary "Done" button inside the inspector, and its chevron disappears while it is open. Figma's panel is live: no commit button, and the section collapses by its own chevron. | `a-start/29.png`, `b-volunteers/06.png` | graphty |
| 16 | 2 | Undo after Delete | Control+Z brings a deleted layer back but not its selection: the inspector stays on the graph and the focus ring sits on another row. Figma's undo restores the selection with the object. | `a-start/60.png`, `a-start/61.png` | graphty |
| 17 | 2 | Color popover | No opacity: no alpha slider in the popover and no opacity next to the hex in the Fill row. Figma's color row and picker both carry opacity. (Rendering's "+" was not opened, so opacity may exist there; if so it is in the wrong place.) | `a-start/13.png`, `a-start/05.png` | compact-mantine (picker), graphty (row) |
| 18 | 2 | Import screen | Column roles the file sets are shown as disabled fields ("Set by the file", "Key", "Attribute" greyed). Controls that cannot be used should be absent; the roles can be stated as text. | `b-volunteers/02.png` | graphty |
| 19 | 1 | Key | Binding color opens the key at the top left, over nodes of the drawing; the toolbar's Legend button lights up but the reader did not ask. | `a-start/18.png` | graphty |
| 20 | 1 | Values tab | "on 254 of 254 edges" wraps to two lines in every edge row. Figma's rows never wrap. | `a-start/24.png` | graphty |
| 21 | 1 | Folder selected | Its children get no tint; Figma tints the children of a selected group. | `a-start/51.png` | graphty |
| 22 | 1 | Layer tree drag | Dragging a pinned row does nothing and says nothing (no refused cursor, no line). | `a-start/58.png` | graphty |
| 23 | 1 | Select what it paints | Selecting moved the drawing about 60 px; Figma never pans on select (zoom to selection is its own command). | `c-saved/03.png` vs `c-saved/04.png` | graphty |
| 24 | 1 | Category card | Counts are in the value's text ("volunteer, 16 nodes") rather than a right-aligned secondary column as in the attribute list one step earlier. | `b-volunteers/05.png`, `b-volunteers/04.png` | graphty |
| 25 | 1 | Attribute order | The Data panel lists columns alphabetically; every picker lists them in file order. | `b-volunteers/17.png` vs `b-volunteers/04.png` | graphty |
| 26 | 1 | Inspector tabs | Selecting nodes after working in a layer's Style tab opens the selection on Values. Figma keeps the Design tab across selections. | `c-saved/03.png`, `c-saved/04.png` | graphty |
| 27 | 1 | "+" on Shape | Opens a menu whose first item repeats the section title ("Shape", "Size"). | `b-volunteers/10.png` | graphty |

## What already matches Figma

New layer opens in rename; Duplicate is Control+D; Hide and Lock are Shift+Control+H and
Shift+Control+L, shown in the context menu; Delete removes a layer and Control+Z brings it back
with a notice naming what was undone; drag reorders rows and into folders; "+" > Folder wraps the
selection; the color popover sits beside the panel with hex, eyedropper and document colors; the
Fill row is swatch, hex, bind, minus; property number fields step with arrows; Escape closes the
innermost popover; every toolbar icon has a tooltip with its shortcut.

## Most important to fix

1. The Shift-click anchor (finding 1): it puts the base layer into a bulk edit nobody asked for.
2. One attribute picker and one value list (3, 4, 10, 11): four drawings of the same two lists.
3. Mixed fields show every value they mix (2), and the canvas shows what a layer covers on hover (6).
</content>
</invoke>
