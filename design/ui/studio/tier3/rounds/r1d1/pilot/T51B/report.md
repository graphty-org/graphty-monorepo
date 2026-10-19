# Pilot T51B: each kind its own color (sources.graphml)

Build ed4351b258 (frozen, `.study-builds/tier3-r1d1-ed4351b258`), 1440 x 900. Every session started on
the empty start screen. Screenshots are in `pointer/`, `detours/` and `keyboard/` next to this file.

**Result.** The success path reaches the goal by pointer, in 6 steps as the answer key counts them, and
by keyboard alone. The data stayed the task's file the whole way: 24 nodes, 59 edges, and a `kind`
column with person 14, company 6 and agency 4. The key over the drawing shows person orange, company
sky blue and agency green, as the reference values say. The style tree ends with Everything's node
color bound to `data.kind` with the okabe-ito palette.

## 1. Success path by pointer (`pointer/`)

| Step | Action | What the screen showed | Shot |
| ---- | ------ | ---------------------- | ---- |
| 0 | Start, empty | The start screen with the consent notice | 01 |
| 1 | "No thanks" | The notice closed | 02 |
| 2 | "Open project or file...", then sources.graphml | "Open as a new graph": 24 nodes, 59 edges; kind is typed "category" | 03 |
| 3 | Load | The drawing, all nodes indigo; the layers are Hovered, Selected and Everything | 04 |
| 4 | Everything | Style tab, Color 6366F1, a link icon beside the color | 05 |
| -- | Hover over the link icon | Tooltip "Node color by attribute" | 06 |
| 5 | Link icon | A popover titled **"Node color by attribute"**: id, name, kind (3 values), donations, on_record, email | 07 |
| 6 | kind | Three colors. A key at the top left reads **"Color: kind"**: person orange, company sky blue, agency green. The Color line reads "kind", with three small squares under it | 08 |
| -- | Click the Color box | A dialog, "Color by kind": person 14, company 6, agency 4, palette "Eight distinct colors" | 09 |
| -- | Escape | The dialog closes and focus goes back to the Color box | 10 |
| -- | Hover over the third small square | Tooltip "agency" | 11 |

## 2. Detours (`detours/`)

**A. One color typed on Everything (shots 06-09).** I clicked in the Color box, which selected the hex,
typed `green` and pressed Enter. Every node turned green (`008000`) (07). Typing `red` and pressing
Escape put `008000` back, and focus stayed in the box (08). A second click in the box, which already
had focus, put the caret where the click landed and did not select the text. Typing `blue` then made
`0080blue00`, and Tab showed the error "'0080blue00' is not a color, so this stays 008000..." (09).
While the error shows, the Color label and the link icon drop about 40 px below the box. Tab moved
focus to the link icon, and that icon's tooltip covers the first line of the error. The error stays
on screen after focus leaves the box and while other work goes on (11). The key shows no line for a
color typed on Everything.

**B. Three layers made by hand (shots 10-20).** The "+" next to Style layers (tooltip "Add a layer or
a folder") opens Layer, Folder, Select... and Analyze... (11). Layer opens a name box with its text
selected; I typed "Agencies" and pressed Enter (12-13). "Add a condition" opens an attribute list
(14). That list shows "Node id" under Structure and has no "id" under Data, but the color popover
shows "id" under Data. Picking kind gives an "Is any of" card with person 14, company 6 and agency 4
(15). After agency and Done, the card reads "kind: agency, 4", 4 of 24 (16-17). After Done, the focus
ring is on the Effects "+" (17). The Fill "+" offers Color (18). The new color starts as the color
underneath (`008000`), and the key adds "Color: Agencies" (19). Typing `red` and Enter turns the four
agencies red (20). The other two layers would repeat these steps.

**C. The find box (shots 21-22).** Typing `agency` shows "Nodes 4": **s09, s12, s15, s22**, each with
"kind: agency" under it, and a Values line, "kind is agency (4)". The list shows ids only, although
the file has a `name` column (City Planning Office, Port Authority, ...). Enter selected s09 and
opened its values, and the box emptied (22). Nothing on this route colors anything.

**D. Right-click on a node (shots 23-25).** The menu offers Neighborhood, Path between..., Frame
selection, New layer from selection and Add note. None of them colors by a column. The menu opens
over the clicked node and hides half of it (23). The node's Style tab has a "+" for each group, and
"Why this look" lists Selected; Agencies, Color; and Everything, Size and Shape (25).

**E. Back to Everything after route B (shots 26-34).** Two controls are named "Everything": the layer
row and a button in "Why this look", so the click was ambiguous (26). I picked the row, then the link
icon, and typed `ki`; the list narrowed to kind, and Enter picked it (29-32). On the drawing, persons
turned orange and companies sky blue, and the agencies stayed red from the hand-made layer. The key
now reads "Color: Agencies" in red, then "Color: kind" with **agency in green**. No node is drawn
green, so the key gives two colors for the agencies. The Color line says "Covered by Agencies on 4 of
24", but the key does not. The taller key covers a node near its lower edge, at about 533,190 (32,
34).

## 3. Success path by keyboard only, in screen-reader mode (`keyboard/`)

| Shots | Keys | Focus and announcements (accessible names quoted) |
| ----- | ---- | ------------------------------------------------- |
| 01 | -- | Focus is on nothing (the page itself) at the start |
| 02-11 | Tab x10 | "Main menu", "Local only", "Settings...", "Open project or file... Ctrl+O", "New from data...", the four "Open the ... sample" buttons, then DisclosureTriangle "What is collected" |
| 12-14 | Tab, Tab, Enter | "Share usage data", then "No thanks". After Enter, focus is on "Open project or file... Ctrl+O", and the status reads "Usage data stays off. Change this in Settings > Privacy" |
| 15 | Enter, upload | Focus goes to "Load"; the status reads "All 24 rows" |
| 16 | Enter | Focus goes to "Graph" (the rail); the status reads "sources: 24 nodes, 59 edges" |
| 17-22 | Tab x6 | "Graph sources.graphml", combobox "Find", "Add a layer or a folder", treeitem "Hovered, node layer, 0 nodes" (the tree is one Tab stop), "Graph settings", separator "Resize left panel" |
| 23-27 | Shift+Tab x2, Down x2, Enter | treeitem "Everything, node and edge layer, 24 nodes, 59 edges", selected |
| 28-49 | Tab x22 | "Graph settings", the separator, Canvas "Graph drawing", "Legend" (pressed), "Select what it paints", "Layer actions", the "Style" and "Node" tabs, "Edit edges", "Style nodes", the shape and size controls, "Add to node visibility", "Add to node text", "Pick Node color", textbox "Node color, set here", "Node color by attribute", "Remove node color" |
| 50-51 | Shift+Tab, Enter | "Node color by attribute", then combobox "Find an attribute", expanded, with "id" highlighted |
| 52-54 | Escape, Enter, Tab | Escape closes the popover and focus returns to "Node color by attribute". Enter opens it again. Tab also closes it, and focus returns to the same button (54) |
| 55-58 | Enter, Down, Down, Enter | The highlight moves from "id" to "name" to "kind". After Enter, focus is on button "Node color: kind, 3 groups, Eight distinct colors" (58 matches pointer 08). Nothing announces the change to the drawing |
| 59 | read | The Fill group reads "person orange, company blue, agency teal" |
| 60-61 | Enter, read | The "Color by kind" dialog opens with focus on the dialog itself. A row reads "kind agency color, teal agency , 4 nodes 4 Hide kind agency kind agency actions" |
| 62 | Escape | Focus returns to the Color button |
| 63-82 | Shift+Tab x17, Tab x2 | Back to "Legend" (pressed) |
| 83 | read | The key reads "Color: kind person company agency", with no color names |

Focus never fell to the page body. The keyboard reached the end of the success path.

## Answer key compared with the screen (success path)

1. In step 5, the popover title is "Node color by attribute", not "Vary by" (pointer 07).
2. In step 6, the key reads "Color: kind", not "Color: Everything" (pointer 08).
3. The small squares under the Color line now show a value's name on hover, such as "agency"
   (pointer 11). The key says they show no tooltip.
4. The screen calls the palette "Eight distinct colors". The key uses the style tree's name,
   okabe-ito (pointer 09).
5. These match: 6 steps; person orange, company sky blue, agency green ("teal" to a screen reader);
   and the "Color by kind" dialog opening from the Color line.

## Defects (all walks)

1. **The key gives two colors for the agencies.** With a hand-made layer and a binding, it shows
   "Color: Agencies" in red and "agency" in green, though every agency is drawn red. Nothing in the
   key says the green is covered. Severity 3: a reader can name the wrong color (detours 32 and 34,
   route E).
2. **The key names no colors to a screen reader:** "Color: kind person company agency" (keyboard 83).
   Colors are spoken only on the Fill line and in the dialog, which call agency "teal" while the key
   draws green.
3. **A color typed on Everything gets no line in the key**, while a binding and a hand-made layer
   each get one (detours 07 and 20).
4. **The find list labels nodes by id** (s09, s12, ...) although the file has a `name` column
   (detours 21).
5. **A second click in the focused color box puts the caret mid-text**, so new typing mixes with the
   old hex ("0080blue00") (detours 09).
6. **While the color error shows, the Color label and the link icon drop about 40 px**, and the
   icon's tooltip covers the first line of the error (detours 09).
7. **The color error stays on screen** after focus leaves the box and while other work goes on
   (detours 11 and 12).
8. **After Done on a condition card, focus lands on the Effects "+"**, a control the person never
   moved to (detours 17).
9. **The two attribute lists disagree.** The condition list has "Node id" under Structure and no
   "id"; the color popover has "id" under Data (detours 14 compared with pointer 07).
10. **The right-click menu hides half of the clicked node** (detours 23).
11. **The key covers part of the drawing** once it shows two groups (detours 32, a node near
    533,190).
12. **Two controls are named "Everything":** the layer row and a button in "Why this look"
    (detours 26).
13. **The rows of "Color by kind" read redundantly to a screen reader:** "kind agency color, teal
    agency , 4 nodes 4 Hide kind agency kind agency actions" (keyboard 61).
14. **Nothing is announced when the color binding is applied.** Only the focused button's new name
    reflects it (keyboard 58).
15. **The "Open project or file..." name includes "Ctrl+O"** (keyboard 05). Minor.
16. **Tab in "Find an attribute" closes the popover** instead of moving into the list (keyboard 54).
    This follows common combobox practice; recorded only.
