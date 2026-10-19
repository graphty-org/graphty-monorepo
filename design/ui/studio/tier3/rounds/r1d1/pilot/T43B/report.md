# Pilot T43B: each source bigger the more they gave (sources.graphml)

Build: 5bd16cda6e (frozen, served from `.study-builds/tier3-r1d1-5bd16cda6e`). The sessions are in
`5bd16cda6e/` (pointer, detours, keyboard). The folders `pointer/`, `detours/` and `keyboard/`
directly under this one are an earlier walk on build ed4351b258 and are kept only as history.

Every walk started on the empty start screen with clean storage and reached the file through a
file chooser, never a URL. The data was the sources file throughout: 24 nodes, 59 edges, columns
`name`, `kind`, `donations` (0 to 250,000), `on_record`, `email`.

Result: **reached on all three walks.** The pointer walk took the answer key's 7 steps. The
keyboard walk reached the end (size bound to donations on Everything, Harlan Development read
from the sorted table) and focus never fell to the page.

## 1. The success path by pointer (`5bd16cda6e/pointer/`)

| Step | Action | Screen | Shot |
| ---- | ------ | ------ | ---- |
| 1 | No thanks | consent notice closes | pointer/02.png |
| 2 | Open project or file..., sources.graphml | "Open as a new graph": "sources: 24 nodes, 59 edges"; Harlan Development 250000 on line 1 | pointer/03.png |
| 3 | Load | drawing; Graph inspector on Values: Nodes 24, Edges 59 | pointer/04.png |
| 4 | Everything | inspector on Style > Node; Size line already there at 1; Shape "+" dimmed | pointer/05.png |
| -- | hover the link icon beside Size | tooltip "Node size by attribute" | pointer/06.png |
| 5 | the link icon beside Size | popover "Node size by attribute": Find an attribute, Fixed size, Data: donations "0 to 250,000", Does not fit: "5 attributes, Show why" | pointer/07.png |
| 6 | donations | popover closes by itself; Size box shows a chip "donations" with "From 1 to 3"; key over the drawing "Size: donations" with a wedge from 0 to 250,000; Legend in the toolbar turns on; one dot plainly biggest | pointer/08.png |
| 7 | click the biggest dot | node inspector (Values): s01, name Harlan Development, donations 250,000 | pointer/10.png |

Also read from the table: Table (toolbar), then the donations header gives "Sorted by donations,
highest first", Harlan Development 250,000 on top, Northgate Capital 90,000 next
(pointer/11-12.png). Hovering the dot shows no tooltip (pointer/09.png).

Style tree at the end (`5bd16cda6e/pointer/styles.json`): Everything carries `node.size` encoded
`by: data.donations`, range 1 to 3, linear, painted on 24 of 24.

## 2. Detours (`5bd16cda6e/detours/`)

**a. Consent notice left open; file through "New from data...", Cancel, second try.** "New from
data..." opens "Open as a new graph" with a drop zone and "Choose a file..." (detours/02.png); the
file reads as on the main route (detours/03.png). Cancel returns to the start screen with the
notice still there (detours/04.png); "Open project or file..." then Load gives the same 24 and 59
(detours/05-06.png).

**b. The Graph inspector's Style tab.** Canvas (background, lighting, "Same size at any depth",
outline width) and Labels; nothing sizes nodes by a column (detours/07.png). The dash beside the
background color is a reset button, "Reset Background color to default" (detours/08.png).

**c. A fixed bigger size on the biggest donors, picked by hand.** Table, donations header, click
Harlan Development, Shift+click Riverside Partners: 3 nodes selected, "donations mean 133,300"
(detours/09-12.png). Style, Shape "+" (menu Shape, Size), Size makes a layer "3 nodes" ("Picked
by hand: 3 nodes", notice "Made layer 3 nodes for 3 nodes") with focus in its Size box and 1
selected (detours/13-15.png). `3`, Enter makes the three dots equal and bigger and keeps focus in
the box (detours/16.png); `5`, Escape puts 3 back (detours/17.png); `2`, Tab commits 2 and moves
to the link icon, whose tooltip now shows below it (detours/18.png). The drawing does not follow
the number (F by the key).

**d. The link icon on that hand-picked layer, opened and closed with Escape.** Enter opens "Node
size by attribute"; Escape closes it and returns focus to the icon (detours/19-20.png). "Show why"
lists name and email as "Holds text, not groups or amounts", kind and on_record as "Holds groups,
not amounts", and Node id as text, all disabled (detours/22-23.png). Typing `dona` leaves one
match; Enter binds the size to donations (detours/24-25.png). Only the 3 picked nodes follow it,
and the key over the drawing now says so: "3 nodes: 3 of 24 nodes" under the wedge
(detours/25.png). Escape with focus on the Size chip clears the selection ("Selection cleared:
3 nodes") and the inspector stays on the layer (detours/26.png).

**e. The find box.** `donations` offers "Select by a value: donations, Select the 24 nodes
(donations: has a value)" (cut off; the hover gives it whole) (detours/27-28.png). Enter selects
all 24 and the box text becomes "=donations" (detours/29.png). From that selection, Shape "+",
Size, the link icon, donations makes a layer "donations: has a value" (24 of 24) whose size follows
donations for every node (detours/30-33.png): the success state by another route. The "3 nodes"
layer shows an icon "Painted over by donations: has a value" (detours/34.png).

**f. Right-click on a node.** Neighborhood, Path between..., Frame selection, New layer from
selection, Add note; nothing about size (detours/35.png).

**g. Control+O with the graph open.** "Add to sources", "sources adds 0 nodes, 59 edges", warning
"59 edges in this file are already in sources. Load adds them a second time", primary "Replace
sources.graphml" (detours/37.png). Replace shows "Replace: sources.graphml, Was 24 nodes, 59
edges; now 24, 59" (detours/38.png); Replace keeps the layers and the size binding
(detours/39.png).

**h. The Data place.** Attributes lists donations; clicking it shows a summary (Number, 17
distinct, 0 to 250,000); its right-click menu offers Add label line, Filter to..., Show in table,
and no way to size or color by it (detours/40-42.png).

## 3. The success path by keyboard only, screen-reader names (`5bd16cda6e/keyboard/`, `--keys --sr`)

| Keys | Focus (screen-reader name) | Shot |
| ---- | -------------------------- | ---- |
| Tab x12 | Main menu; Local only; Settings...; Open project or file...; New from data...; Open the Les Miserables / Zachary's karate club / College football / Florentine families sample; DisclosureTriangle "What is collected" collapsed; Share usage data; No thanks | keyboard/02-13.png |
| Enter | Open project or file... (live: "Usage data stays off. Change this in Settings > Privacy") | keyboard/14.png |
| Enter, file | Load (live: "All 24 rows") | keyboard/15.png |
| Enter | treeitem "Hovered, node layer, 0 nodes" (live: "sources: 24 nodes, 59 edges") | keyboard/16.png |
| (Tab x4, Shift+Tab x4: Graph settings; separator "Resize left panel"; Canvas "Graph drawing"; button "Analyze" and back) | | keyboard/17-21.png |
| ArrowDown x2, Enter | treeitem "Everything, node and edge layer, 24 nodes, 59 edges" selected | keyboard/22-24.png |
| Tab x18 (overshoot), Shift+Tab x4 | Graph settings; Resize left panel; Graph drawing; Analyze; Select what it paints; Layer actions; tab Style; tab Node; checkbox Style nodes; combobox Node shape; Node shape by attribute; Remove node shape; spinbutton "Node size" 1; button "Node size by attribute" collapsed; Remove node size; Add to node visibility; Add to node text; Pick Node color; back to "Node size by attribute" | keyboard/25-26.png |
| Enter | combobox "Find an attribute" expanded, nothing highlighted | keyboard/26.png |
| Tab (check) | popover closes, focus back on "Node size by attribute" | keyboard/27.png |
| Enter, Escape (check) | opens, then closes with focus back on the icon | keyboard/28.png |
| Enter, ArrowDown x4, ArrowUp x2 | highlighted "Fixed size", "donations, 0 to 250,000", "5 attributes, hidden", wraps to "Fixed size", back | keyboard/29.png |
| ArrowDown, Enter, ArrowDown x2 (check) | "5 attributes, shown"; "name, Holds text, not groups or amounts" disabled; "kind, Holds groups, not amounts" disabled | keyboard/30.png |
| Enter on a disabled option (check) | nothing happens; highlight stays | keyboard/32.png |
| ArrowUp x3, Enter | button "Node size: donations, 1 to 3" (live: "Node size varies by donations, on 24 nodes") | keyboard/33.png |
| Shift+Tab x11, Tab x2 | back through the inspector to the canvas and the toolbar's "Analyze" | keyboard/34-35.png |
| ArrowRight x4 | Layout; View, 3D; Legend (pressed); Table | keyboard/35.png |
| Enter | button "Id" (table header) | keyboard/36.png |
| ArrowRight x3, Enter | button "donations, sorted descending" (live: "Sorted by donations, highest first") | keyboard/37.png |
| --read | row "s01 Harlan Development company 250,000 No press@harlandev.example" first | keyboard/38.png |
| Escape (check) | nothing happens; focus stays on the header, the table stays open | keyboard/39.png |

`--read` of the open popover: dialog "Node size by attribute", heading, button "Close panel",
combobox "Find an attribute", options "Fixed size", "donations, 0 to 250,000", "5 attributes,
shown", then name, kind, on_record, email and Node id, each disabled with its reason in its name.
The end state equals the pointer walk's (`5bd16cda6e/keyboard/styles.json`).

## Where the answer key and the screen differ

1. The popover's "Does not fit" row reads "5 attributes, Show why", not "5 values" (pointer/07.png).
2. The key over the drawing reads "Size: donations" over a wedge from 0 to 250,000, not "Size:
   donations, 0 to 250,000" as one line (pointer/08.png).
3. The find box route makes a layer named "donations: has a value", not "Rule: donations"; the
   box's text becomes "=donations" after Enter (detours/29.png, detours/33.png). The route is
   still SD by the key's definition.
4. The key says a binding on 3 hand-picked nodes leaves the key over the drawing reading as if it
   covered everything; on this build the key adds "3 nodes: 3 of 24 nodes" (detours/25.png).
5. After Load, keyboard focus starts on the layer tree (treeitem "Hovered"), so Everything is two
   ArrowDowns away with no Tab (keyboard/16.png).

## Defects

| # | Route | What a participant meets | Shot |
| - | ----- | ------------------------ | ---- |
| 1 | detour g | After Control+O > Replace, the Graph Style tab shows "Same size at any depth" switched on; it was off on the same tab after Load (detours/07.png) and nothing in the walk touched it. The step that switched it was not isolated | detours/07.png, detours/39.png |
| 2 | detour d | With picked nodes and focus on the Size chip, Escape clears the graph's selection ("Selection cleared: 3 nodes") rather than doing nothing in the field | detours/26.png |
| 3 | keyboard | Escape in the table does nothing; the table cannot be closed from the keyboard without tabbing to "Close table" | keyboard/39.png |
| 4 | keyboard | Tab from the popover's find box closes the popover; its "Close panel" button is never reached by Tab | keyboard/27.png |
| 5 | keyboard | Enter in the popover opens the find box with nothing highlighted, so a screen-reader user hears no option until an arrow key | keyboard/26.png |
| 6 | detour e | The find box rewrites the typed `donations` as "=donations" after Enter, a formula-like token the participant never typed | detours/29.png |
| 7 | detour e | The find result "Select the 24 nodes (donations: has a value)" is cut off at "has a..." in the list; only a hover shows it whole | detours/27-28.png |
| 8 | detour h | An attribute's own menu in the Data place offers no way to size or color by it (Add label line, Filter to..., Show in table only) | detours/42.png |
| 9 | pointer, keyboard | The Size chip sits in a box with an empty slot to its left, so "donations" looks offset inside an empty field | pointer/08.png, keyboard/39.png |
