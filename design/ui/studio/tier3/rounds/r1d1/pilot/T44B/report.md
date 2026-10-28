# Pilot T44B: every volunteer's name on the drawing (volunteers.graphml)

Build: ed4351b258 (served from `.study-builds/tier3-r1d1-ed4351b258`). Every walk started on the
empty start screen with clean storage and reached the file through the start screen (a file
chooser or a drop), never a URL. The data was the volunteers file throughout: 24 nodes, 63 ties,
columns `name`, `role`, `hours`, `trained`, `phone`; Lucy Grant is node `v16`.

Result: **reached on all three walks.** By pointer in 8 steps, as the answer key counts. By
keyboard the end was reached with Control+F, `Lucy Grant`, Enter, `f`; focus never fell to the
page. Every walk ended with the Everything layer's `node.label` read from `data.name`, painted on
24 of 24 (`success/styles.json`, `detours/styles.json`, `keyboard/styles.json`).

## 1. The success path by pointer (`success/`)

| Step | Action | Screen | Shot |
| ---- | ------ | ------ | ---- |
| 1 | No thanks | consent notice closes | success/02.png |
| 2 | Open project or file..., volunteers.graphml | read-the-file page: "volunteers: 24 nodes, 63 edges" | success/03.png |
| 3 | Load | 24 dots, no names; Graph inspector on Values (Nodes 24, Edges 63) | success/04.png |
| 4 | Everything | inspector on Style > Node; the Text section is an empty row with "+" | success/05.png |
| 5 | Text "+" (tooltip "Add to node text") | menu: Label, Tooltip | success/06.png, success/07.png |
| 6 | Label | the "Label" picker opens by itself: Find an attribute, "Fixed text" first and highlighted, then Data: id, name, role, hours, trained, phone | success/08.png |
| 7 | name | every node gets its name; the row reads "Label name", "24 labels, 4 hidden", "Show all labels" | success/09.png |
| 8 | wheel zoom near Lucy Grant (2 turns, then 3) | "Lucy Grant" reads clearly; "24 labels, 0 hidden" | success/10.png, success/11.png |

At the default framing (success/09.png) "Lucy Grant" is drawn at about 7 px, crossed by a tie,
with "Diego Ruiz" running into her dot; zoomed (success/11.png) it reads clearly. The wheel
zooms toward the pointer: Lucy Grant, under the pointer, stayed where she was while the other
dots moved away from her (success/09.png against 10.png).

Fields checked on the way:

- **Label source button** ("Label source: name"): a click reopens the picker with an "In use"
  heading above `name` (success/12.png). `na` filters it to one row (success/13.png); Escape closes
  it and focus returns to the button (success/14.png). Enter reopens it, `na` then Enter picks
  `name` and closes it, focus back on the button (success/16.png). Tab in the picker's search box
  closes the picker and leaves focus on the button instead of moving into the list
  (success/17.png); the next Tab goes to "Label settings" (success/18.png), whose tooltip covers
  the words "Show all labels".
- **Label settings** (the gear, success/19.png): Text color, Background, Font (Verdana; the drawing
  shows a serif face), Weight, Alignment, **Size 48** with "Size in: Scene", Line height, box,
  margins, outline and shadow. The Size box is named "Size, not set, 48" for a screen reader.
  `96` with Enter draws every label about twice as large at once (success/20.png). `200` then
  Escape puts 96 back and keeps focus in the box with the value selected (success/21.png); Tab
  goes to "Reset Size to default" (success/22.png); Escape closes the popover and focus returns to
  the gear (success/23.png, 24.png).
- Three wheel turns of 600 outward move the view only a little (success/25.png); with 96-size
  labels the count reads "24 labels, 6 hidden".

## 2. Detours (`detours/`)

**a. The file through "New from data...", Cancel, then a drop.** With the consent notice left
open, "New from data..." opens "Open as a new graph" with a drop zone and "Choose a file..."
(detours/02.png). After the file is read, Cancel returns to the start screen cleanly with the
consent notice still there (detours/03-04.png). Dropping the file on the start screen opens the
same page, 24 and 63 (detours/05.png). There the boxes under each column (`name`: "Attribute",
combobox "Role of name") look like dropdowns, but a click opens nothing, the pointer stays an
arrow and no tooltip says why (detours/06-07.png). Load draws the graph (detours/08.png).

**b. The Graph inspector's Style tab.** Its "Labels" section holds only "Hide overlapping labels"
(on) and "Move labels off nodes and edges" (detours/09.png). Turning "Hide overlapping labels" off
changes nothing on the drawing, and nothing says labels are put on elsewhere (detours/10.png).
Under the Background color box a lone "-" ("Reset Background color to default") sits on a line
of its own although the color is the default (detours/09.png, 11.png).

**c. The find box, then the selected node's own Text "+".** `Lucy` lists one node row titled
"v16" with "name: Lucy Grant" under it, and a row "name is Lucy Grant (1)" (detours/13.png).
Enter selects her: a yellow ring, an inspector titled "v16" (detours/14.png). Her Style tab, Text
"+", Label: the picker opens over the canvas and covers the selected node itself
(detours/16-17.png). `name` makes a new layer named "v16", "Picked by hand: 1 node"; only Lucy
Grant is labeled and the row says "1 label, 0 hidden". In that layer's Text row the source
button is squeezed and "name" spills past its right edge (detours/18.png). A participant who
looks only for Lucy may stop here; no one else is named (F by the key). Escape, then Control+Z,
removes the layer in one undo: "Undid adding the layer v16." (detours/19.png).

**d. Right-click and hover on a node.** The right-click menu offers Neighborhood, Path
between..., Frame selection, New layer from selection and Add note; nothing about names
(detours/20.png). Hovering a node shows no name and no tooltip (detours/22.png).

**e. "Fixed text" picked first, then `name` typed.** On Everything: Text "+", Label, "Fixed
text" gives a box "Type the words" (detours/25.png); `name` with Enter writes the word "name" on
all 24 dots (detours/26.png). In that box `zzz` then Escape puts "name" back and keeps focus
(detours/27.png). Recovery works from the same row: the source button "Fixed text", then `name`,
gives every person's name (detours/28-29.png).

**f. "Show all labels".** Ticking it draws all 24 and the count reads "24 labels"; the four that
were hidden come back on top of others: "Zara Ahmed" over "Rosa Mendes", "Maria Lopez" under
Priya Nair's dot (detours/30.png).

## 3. The success path by keyboard only, screen-reader names (`keyboard/`, `--keys --sr`)

| Keys | Focus (screen-reader name) | Shot |
| ---- | -------------------------- | ---- |
| Tab x9 | Main menu; Local only; Settings...; Open project or file... Ctrl+O; New from data...; Open the Les Miserables sample; ... Zachary's karate club ...; ... College football ...; ... Florentine families sample | keyboard/02-10.png |
| Tab x3 | DisclosureTriangle "What is collected" collapsed; Share usage data; No thanks | keyboard/11-13.png |
| Enter | Open project or file... Ctrl+O (live: "Usage data stays off. Change this in Settings > Privacy") | keyboard/14.png |
| Enter, file | Load (live: "All 24 rows") | keyboard/15.png |
| Enter | button "Graph" (live: "volunteers: 24 nodes, 63 edges") | keyboard/16.png |
| Tab x3 | Graph volunteers.graphml; combobox "Find"; Add a layer or a folder | keyboard/17-19.png |
| Tab, ArrowDown x2 | treeitem Hovered; Selected; "Everything, node and edge layer, 24 nodes, 63 edges" | keyboard/20-22.png |
| Enter | the same treeitem, selected | keyboard/23.png |
| Tab x8 | Graph settings; separator "Resize left panel"; Canvas "Graph drawing"; Legend (pressed); Select what it paints; Layer actions; tab Style; tab Node | keyboard/24-31.png |
| Tab x10 | Edit edges; checkbox Style nodes; combobox Node shape; Node shape by attribute; Remove node shape; combobox Node size; Node size by attribute; Remove node size; Add to node visibility; **Add to node text** | keyboard/32-41.png |
| Enter | menuitem "Label" | keyboard/42.png |
| Enter | combobox "Find an attribute" expanded; highlighted option "Fixed text" | keyboard/43.png |
| type `name` | highlighted option "name" | keyboard/44.png |
| Enter | button "Label source: name" (live: "Node label added"); 24 names drawn, "24 labels, 4 hidden" | keyboard/45.png |
| Control+F | combobox "Find" | keyboard/46.png |
| type `Lucy Grant` | highlighted option "v16 name: Lucy Grant" | keyboard/47.png |
| Enter | heading "v16" (live: "1 node selected") | keyboard/48.png |
| f | heading "v16"; the view frames Lucy Grant and her label reads | keyboard/49.png |
| Escape | heading "Graph" (live: "Selection cleared: 1 node") | keyboard/50.png |

Focus never fell to the page. From the Everything row to "Add to node text" takes 18 Tabs.

## Where the answer key and the screen differ

1. "Label settings has no text size: labels cannot be made larger" is wrong on this build: Label
   settings has Size (48) and "Size in", and 96 doubles every label at once (success/19-20.png).
2. "Zoom in with the wheel (it zooms toward the canvas's center, not the pointer)": the wheel
   zooms toward the pointer; the node under it stays put (success/09-11.png).
3. The keyboard route is given for A only ("`Cosette`, Enter, then `f`"); for B the same works
   with `Lucy Grant`, and the find box is reached with Control+F (keyboard/46-49.png).
4. Everything else matched: 8 steps; the Text "+" menu of Label and Tooltip; the picker opening
   by itself with "Fixed text" first and highlighted; "24 labels, 4 hidden"; the Graph inspector's
   Labels section holding overlap options only; a selected node's Text "+" making a one-node
   layer; Fixed text with `name` drawing the word "name".

## Defects

| # | Route | What a participant meets | Shot |
| - | ----- | ------------------------ | ---- |
| 1 | success, keyboard | Names drawn at the default framing are about 7 px and overlap (Lucy Grant's crossed by a tie and run into by "Diego Ruiz"); recorded only, an open owner decision | success/09.png |
| 2 | success, keyboard, detour f | Ties and dots draw over the label text: "Lucy Grant" is struck through by ties even when zoomed, and the selection ring covers the bottom of her name | success/11.png, keyboard/49.png |
| 3 | detour c, keyboard | The find box titles a person's row by id ("v16") and the inspector heading is "v16", not "Lucy Grant", though the file has a `name` column; screen reader hears "heading v16" | detours/13-14.png, keyboard/48.png |
| 4 | detour c | Labeling a selected person from her own Text "+" makes a layer named "v16" that names one node; nothing suggests the Everything layer for all | detours/18.png |
| 5 | detour c | The label picker opens over the canvas on top of the selected node it is labeling | detours/17.png |
| 6 | detour c | In the one-node layer's Text row the source button is squeezed and "name" spills past its box | detours/18.png |
| 7 | detour b | The Graph inspector's "Labels" section has overlap switches only; turning "Hide overlapping labels" off does nothing visible and nothing points to where labels are put on | detours/09-10.png |
| 8 | detour b | A lone "-" reset button sits on its own line under the Background color box although the value is the default | detours/09.png, detours/11.png |
| 9 | detour a | On the read-the-file page the column boxes look like dropdowns but are inert: no list, arrow cursor, no tooltip saying "Set by the file" applies to them | detours/06-07.png |
| 10 | success | Tab in the label picker's search box closes the picker and returns to its button instead of moving into the list | success/17.png |
| 11 | success | The "Label settings" tooltip covers the words "Show all labels" beside it | success/18.png |
| 12 | success | The label Size box's screen-reader name is "Size, not set, 48": it says "not set" while showing 48 | success/20.png |
| 13 | success | Label settings shows Font "Verdana" while the labels draw in a serif face; recorded only, an open owner decision | success/19.png |
| 14 | detour f | "Show all labels" brings the hidden names back on top of others, unreadable ("Zara Ahmed" over "Rosa Mendes") | detours/30.png |
| 15 | success | Three outward wheel turns of 600 barely move the view; zooming out is far slower than zooming in | success/25.png |
| 16 | keyboard | From the Everything row to its "Add to node text" takes 18 Tabs, through Graph settings, the panel resizer, the canvas and the toolbar | keyboard/24-41.png |
| 17 | keyboard | The consent notice comes last in the tab order, after all four samples | keyboard/10-13.png |
| 18 | keyboard | After Load, focus lands on a button named only "Graph", then "Graph volunteers.graphml": two stops with near-duplicate names | keyboard/16-17.png |
| 19 | keyboard | "24 labels, 4 hidden" is not announced; a screen-reader user hears "Node label added" only and does not learn four names are left out | keyboard/45.png |
