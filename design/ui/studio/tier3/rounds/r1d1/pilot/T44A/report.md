# Pilot: T44A, names on the drawing (Les Miserables)

Build: ed4351b258 (frozen, `/home/apowers/Projects/graphty-monorepo/.study-builds/tier3-r1d1-ed4351b258`).
Three sessions, each from the empty start screen: `pointer/`, `detours/`, `keyboard/` (keyboard
only, screen-reader mode). The data stayed the sample's own the whole way: 77 nodes and 254 edges
(status line and Values tab), the same characters in the find box, the inspector and the labels.

**Reached:** yes by pointer (7 steps: No thanks, Les Miserables, Everything, Text "+", Label,
`name`, wheel zoom until Cosette reads) and yes by keyboard (Cosette framed and readable). The
final style tree (`pointer/styles.json`) holds `node.label` by `data.name` on Everything, painted
on 77 of 77 nodes.

## 1. Success path by pointer (`pointer/`)

| Step | What was done | What the screen showed | Screenshot |
| ---- | ------------- | ---------------------- | ---------- |
| 1 | No thanks | Consent card gone | `pointer/02.png` |
| 2 | Les Miserables | Graph opens; inspector on Graph, Values tab | `pointer/03.png` |
| 3 | Everything | Inspector "Everything, Node and edge layer", Style > Node; Text section with a "+" | `pointer/04.png` |
| - | Hover Text "+" | Tooltip "Add to node text" | `pointer/05.png` |
| 4 | Text "+" | Menu: Label (highlighted), Tooltip | `pointer/06.png` |
| 5 | Label | Picker "Label" opens by itself: search "Find an attribute", "Fixed text" first and highlighted, then Data: id, name. Behind it the Text line reads "Pick a value" | `pointer/07.png` |
| 6 | name | Every node gets its name; line "Label name", "77 labels, 7 hidden", "Show all labels" box | `pointer/08.png` |
| 7 | Wheel -300 near Cosette, four turns | Zooms toward the canvas center, not the pointer; Cosette readable after four turns; "6 hidden", then "4 hidden" | `pointer/09.png` to `pointer/12.png` |

Extra checks on the same session:

- "Show all labels" ticked: "77 labels", every label drawn, several overlap ("Mme de R" under
  Labarre, "Bamatabois" into "Mother Innocent") (`pointer/13.png`).
- Label line icons: gear "Node label settings" (tooltip "Label settings"), eye "Hide label"
  (`pointer/15.png`, `16.png`).
- The source box ("Label source: name"): click opens the picker with "In use: name" and "Data: id"
  (`17.png`); Escape closes it and focus returns to the box (`18.png`); typing `id` filters to id
  (`19.png`), Enter picks it (`20.png`); Tab inside the picker closes it with no change and focus
  on the box (`21.png`); Escape with nothing open does nothing (`22.png`).
- With `id` the labels lose their spaces: "MlleVaubois", "OldMan", "MotherInnocent", "Woman1"
  (`pointer/20.png`). Back to `name` (`23.png`).
- Label settings (gear): a panel with Text color, Background, Font (Verdana), Weight, Alignment,
  **Size 48, Size in Scene**, Line height, Box, Letters (`pointer/24.png`). Size 96 + Enter makes
  every label about twice as large (`25.png`); typing then Escape keeps 96 (`26.png`); Escape
  again closes the panel, focus on the gear (`27.png`). The drawing shows a serif face although the
  font reads Verdana (the known no-fallback font; not a new finding).

### Answer key against the screen

- Matches: Text "+" is "Add to node text" with Label and Tooltip; Label opens the column picker
  by itself with "Fixed text" first and highlighted; `name` gives "77 labels, 7 hidden"; "Show all
  labels" draws them all; the wheel zooms toward the canvas center, not the pointer; the style
  tree holds `node.label` by `data.name` on all 77.
- **Mismatch:** the key says `name` or `id` "are the same text in Les Miserables". They are not:
  every multi-word name loses its spaces in `id` ("Mlle Vaubois" / "MlleVaubois", "Mother
  Innocent" / "MotherInnocent", `pointer/20.png`). Cosette reads the same both ways, so grading A
  by "Cosette readable" still holds, but labels by `id` do not show the names as written.
- **Mismatch:** the key says "Label settings has no text size: labels cannot be made larger."
  On this build Label settings has a Size field (48, in Scene units); 96 + Enter doubles every
  label (`pointer/24.png`, `25.png`; keyboard `45.png`, `47.png`).
- **Mismatch:** the "N hidden" count is not fixed at 7: it follows the zoom (7, 6, 4 in
  `pointer/08.png`, `10.png`, `12.png`) and the label size (8 hidden at size 96, keyboard
  `45.png`). The key quotes only "77 labels, 7 hidden".
- **Mismatch (keyboard route):** the key's keyboard zoom is "the find box, `Cosette`, Enter, then
  `f`". It works when the box is reached with `/` (Enter moves focus to the inspector heading
  "Cosette", `keyboard/30.png`, and `f` frames it, `keyboard/31.png`). When the box is clicked
  first, Enter leaves focus in the box and `f` is typed into it as a search (`detours/26.png`,
  `27.png`). The key does not name `/` as the way into the box.

## 2. Detours (`detours/`)

Each starts after the sample is open, as a newcomer who does not know the Text "+" route might try.

| Detour | What happened | Screenshots |
| ------ | ------------- | ----------- |
| Sample from the main menu (consent card left open) | Main menu > Open sample > Les Miserables opens the sample; the consent card is gone once it opens | `detours/03.png` to `05.png` |
| Graph inspector, Style tab | Canvas (background, lighting, outline width) and a Labels section with only "Hide overlapping labels" (on) and "Move labels off nodes and edges"; nothing puts names on, and nothing points to where | `detours/06.png` |
| Right-click a node (Cosette) | Menu: Neighborhood, Path between..., Frame selection, New layer from selection, Add note; no label item. Escape closes it, selection kept | `detours/08.png`, `09.png` |
| The selected node's own Style tab > Text "+" > Label > name | Silently makes a one-node layer "Cosette" above Everything; only Cosette gets a label ("1 label, 0 hidden"), drawn tiny; no notice that only one node is affected. The header changes from "Cosette, Node" to "Cosette, Node layer", "Picked by hand: 1 node" | `detours/10.png` to `13.png` |
| Everything > Text "+" > Label, then Escape in the picker | The unfinished Label line is removed with no notice; focus returns to Text "+" | `detours/16.png`, `17.png` |
| Everything > Text "+" > Label > Fixed text, typed `name` + Enter | The word "name" on all 77 nodes ("77 labels, 0 hidden"), as the key says. Typing more then Escape restores "name" (`22.png`). Recovery: "Label source: Fixed text" > name gives the names (`24.png`) | `detours/20.png` to `24.png` |
| Find box: click, `Cosette`, Enter, then `f` | Find lists 1 node, 11 edges; Enter selects Cosette and clears the box, but focus stays in the box; `f` is typed there and lists 9 nodes. Escape twice does not leave the box | `detours/25.png` to `30.png` |

## 3. Success path by keyboard (`keyboard/`, screen-reader mode)

| Step | Keys | Focus / what was read | Screenshot |
| ---- | ---- | --------------------- | ---------- |
| Start screen | Tab x6 | button "Main menu", "Local only", "Settings...", "Open project or file... Ctrl+O", "New from data...", "Open the Les Miserables sample" | `keyboard/02.png` to `07.png` |
| Consent | Tab x6 more | the other three samples, DisclosureTriangle "What is collected" collapsed, "Share usage data", "No thanks" (the consent card comes after every sample) | `keyboard/08.png` to `14.png` |
| No thanks | Enter | focus "Open project or file... Ctrl+O"; live: "Usage data stays off. Change this in Settings > Privacy" | `keyboard/15.png` |
| Open sample | Shift+Tab, Tab x3, Enter | focus button "Graph"; live: "Les Miserables: 77 nodes, 254 edges" | `keyboard/16.png` to `18.png` |
| To the layers | Tab x6, Shift+Tab x2 | "Graph Les Miserables", combobox "Find", "Add a layer or a folder", treeitem "Hovered, node layer, 0 nodes" (the tree is one Tab stop) | `keyboard/19.png`, `20.png` |
| Everything | ArrowDown x2, Enter | treeitem "Everything, node and edge layer, 77 nodes, 254 edges" selected | `keyboard/20.png`, `21.png` |
| To Text "+" | Tab x18 | "Graph settings", separator "Resize left panel", Canvas "Graph drawing", "Legend" pressed, "Select what it paints", "Layer actions", tab "Style", tab "Node", "Edit edges", checkbox "Style nodes", node shape and size controls, "Add to node visibility", "Add to node text" | `keyboard/22.png`, `23.png` |
| Text "+" | Enter | menuitem "Label" | `keyboard/24.png` |
| Label | Enter | combobox "Find an attribute" expanded; highlighted option "Fixed text" | `keyboard/25.png` |
| name | ArrowDown x2, Enter | button "Label source: name"; live: "Node label added"; 77 labels, 7 hidden | `keyboard/26.png`, `27.png` |
| Find Cosette | `/`, type `Cosette`, Enter | combobox "Find"; highlighted option "Cosette"; then heading "Cosette"; live: "1 node selected" | `keyboard/28.png` to `30.png` |
| Frame | `f` | Camera frames Cosette; "Cosette" readable | `keyboard/31.png` |

Field checks by keyboard:

- Find box: `/`, `Cos`, Escape clears it and closes the list, focus stays in the box; a second
  Escape does nothing; Tab goes to "Add a layer or a folder" (`keyboard/32.png` to `35.png`).
- Label source picker: Enter opens it on "name"; Tab closes it with no change and focus on the
  source button; Tab again to "Node label settings" (`keyboard/39.png` to `41.png`).
- Label settings: Enter opens dialog "Label settings"; Tab order Close panel, Text color, ...,
  Font, Weight, Alignment, spinbutton "Size, not set, 48"; `96` + Enter: live "77 labels, 8
  hidden"; Tab to "Reset Size to default"; Escape closes the dialog and focus returns to "Node
  label settings" (`keyboard/42.png` to `47.png`).
- Focus never fell to the page body on this walk.

## Defects

1. **The find box keeps focus after Enter when it was clicked** (detours). Clicking the box,
   typing `Cosette` and Enter selects Cosette but leaves focus in the box, so `f` (Frame
   selection) types a search instead of framing (`detours/26.png`, `27.png`). Reached with `/`,
   the same Enter moves focus to the inspector heading (`keyboard/30.png`). Two behaviors for one
   key in one box.
2. **Escape in an empty find box does nothing** (detours and keyboard): focus stays in the box;
   no key returns to the drawing short of Tab (`detours/28.png`, `29.png`; `keyboard/34.png`).
3. **A selected node's Text "+" silently makes a one-node layer** (detours): asked for a label
   from the node's own panel, the app makes a new layer "Cosette" with no notice; only "1 label,
   0 hidden" and the changed header say so (`detours/13.png`).
4. **The label source box is squeezed in a node layer's panel** (detours): in the "Cosette" layer
   (and a node's inspector) the "name" box shrinks to its text, the letters touching both
   borders, while the same line on Everything is full width (`detours/13.png`, `detours/26.png`).
5. **Escape in the picker of a new Label line removes the line with no notice** (detours,
   `detours/16.png`, `17.png`).
6. **The Graph inspector's Labels section points nowhere** (detours): its two switches tune
   overlap only, with nothing saying where names are put on (`detours/06.png`).
7. **"Show all labels" draws labels on top of each other** ("Mme de R" under Labarre,
   "Bamatabois" into "Mother Innocent", `pointer/13.png`).
8. **The main menu's accessible name differs from its tooltip**: name "Main menu", tooltip "Main
   menu: open, save, export, settings" (`pointer/14.png`, `detours/02.png`).
9. **The consent card comes after every sample in the Tab order** (keyboard): "No thanks" is
   reached only after Tab passes all four samples (`keyboard/08.png` to `14.png`).
10. **The label Size field reads "Size, not set, 48"** while showing 48 in italics; nothing says
    48 is the default in use or what unit "Scene" is (`keyboard/44.png`, `pointer/24.png`).
