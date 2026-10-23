# Pilot T43A: each volunteer bigger the more hours they gave (volunteers.graphml)

Build: 5bd16cda6e (frozen, served from `.study-builds/tier3-r1d1-5bd16cda6e`). Three sessions,
each from the empty start screen with clean storage, reaching the file through the file chooser
(never a URL), under `5bd16cda6e/`: `pointer/`, `detours/`, `keyboard/`. Paths below are relative
to `5bd16cda6e/`. The earlier walk on build ed4351b258 stays beside them in `pointer/`,
`detours/` and `keyboard/` (no build folder), for comparison only.

The data stayed the file's own the whole way: 24 nodes and 63 edges, columns `id`, `name`,
`role`, `hours` (2 to 52), `trained`, `phone`; Hannah Weiss (v09) 52 hours, James Carter (v02)
48 next.

**Reached:** yes on all three walks. Pointer: the key's 7 steps. Keyboard: reached the end (size
bound to hours on Everything, Hannah Weiss read from the sorted table), and focus never fell to
the page.

## 1. Success path by pointer (`pointer/`)

| Step | What was done | What the screen showed | Screenshot |
| ---- | ------------- | ---------------------- | ---------- |
| -- | Start screen | Start, Recent projects, Samples; usage-data card | `pointer/01.png` |
| 1 | No thanks | Card gone | `pointer/02.png` |
| 2 | Open project or file..., volunteers.graphml | "Open as a new graph": "volunteers: 24 nodes, 63 edges"; line 9 Hannah Weiss, hours 52, visible before Load | `pointer/03.png` |
| 3 | Load | Drawing; Graph inspector on Values: Nodes 24, Edges 63; layers Hovered, Selected, Everything | `pointer/04.png` |
| 4 | Everything | Style > Node: "Everything styles all 24 nodes"; Size line already there at 1; Shape "+" greyed | `pointer/05.png` |
| -- | Hover the link icon beside Size | tooltip "Node size by attribute"; the pointer stays the arrow, not the hand | `pointer/06.png` |
| 5 | The link icon beside Size | Popover "Node size by attribute": Find an attribute, Fixed size, Data: hours "2 to 52", Does not fit: "5 attributes, Show why" | `pointer/07.png` |
| 6 | hours | Popover closes by itself; Size box shows a chip "hours", "From 1 to 3" under it; key "Size: hours 2 -- 52" over the drawing; dots vary | `pointer/08.png` |
| 7 | Click the dot that looked biggest (862,381) | Node inspector: title v09, name Hannah Weiss, role staff, hours 52 | `pointer/09.png` |

Checks beyond the path: the next-largest dot (760,597) is v02 James Carter, 48, drawn about the
same size as v09 (`pointer/10.png`); hovering a dot shows no name (`pointer/11.png`); Table, then
the hours header: "Sorted by hours, highest first", Hannah Weiss 52 on top, James Carter 48 next
(`pointer/12.png`, `13.png`). With the table open the floating toolbar sits over the bottom of the
smaller drawing, touching the lowest dot (`pointer/12.png`).

Style tree at the end (`pointer/styles.json`): Everything's node layer encodes `node.size` by
`data.hours`, range 1 to 3, linear, painted on 24 of 24.

### Answer key against the screen

- Matches: Size line already there at 1 and Shape "+" greyed; the link icon's tooltip and name
  "Node size by attribute"; the popover title, Fixed size, the number column and "Does not fit";
  the popover closing itself; the chip with "From 1 to 3"; the key "Size: hours 2 -- 52"; Hannah
  Weiss, hours 52; v09 and v02 about the same size in 3D; the sorted table; the read-the-file page
  showing Hannah Weiss with 52 before Load. 7 steps.
- Mismatch: the "Does not fit" row reads "5 attributes", not "5 values" (`pointer/07.png`).
- Mismatch: the find-box route's layer is named "hours: has a value", not "Rule: hours", and the
  box rewrites the entry to `=hours` (`detours/19.png`, `22.png`).
- Mismatch: a size bound on a hand-picked layer no longer reads exactly as the success path: the
  key adds a line "v09: 1 of 24 nodes" under "Size: hours 2 -- 52" (`detours/16.png`).

## 2. Detours (`detours/`)

Each starts after No thanks, Open project or file..., volunteers.graphml and Load
(`detours/01.png` to `04.png`).

**a. The Graph inspector's Style tab (open beside the drawing when the file loads).** Canvas
(background, lighting, "Same size at any depth", outline width) and Labels. Nothing sizes the
dots, and nothing points to the Everything layer where sizing lives: a dead end for "make them
bigger" (`detours/05.png`).

**b. From a clicked dot: right-click, then the dot's own Style tab.** Right-click on v09 offers
Neighborhood, Path between..., Frame selection, New layer from selection, Add note; nothing about
size (`06.png`); Escape closes it (`07.png`). The dot's Style tab lists Shape, Visibility, Text,
Fill, Effects, Rendering with "+", and "Why this look: Selected Glow, Halo; Everything Color,
Size, Shape" (`08.png`). Shape "+" opens Shape / Size (`09.png`); Size makes a layer named "v09"
(the id, not the person's name), "Picked by hand: 1 node", notice "Made layer v09 for 1 node",
focus in its Size box (`10.png`). In that box Escape puts 1 back and keeps focus (`11.png`); `3`,
Enter commits and keeps focus (`12.png`); Tab moves to the link icon (`13.png`). Enter on the icon
opens the popover with focus in its box (`14.png`); Escape closes it and returns focus to the icon
(`15.png`); Enter, `hou`, Enter binds hours on that one-node layer (`16.png`). Only v09 follows the
number (F by the key). Because v09 holds the top value it is drawn at the top of the range, so the
drawing looks the same as the fixed 3; the key's added "v09: 1 of 24 nodes" is the only sign.

**c. The search box.** `hours` offers "Select by a value: hours, Select the 24 nodes (hours: has a
value)", cut off at "has a val..." (hover gives the whole text) (`17.png`, `18.png`). Enter selects
all 24 and rewrites the box to `=hours` (`19.png`). Style, Shape "+", Size makes "hours: has a
value" (24 of 24) at a fixed 1: the size key disappears and the "v09" layer row shows an icon
"Painted over by hours: has a value" (`20.png` to `22.png`, `25.png`). The link icon, hours: every
dot follows hours (`23.png`, `24.png`; `detours/styles.json`: `where: hours`, `node.size` by
`data.hours`, painted 24). The SD route. While all 24 stay selected each dot carries a yellow ring
that grows with it; v24 (Zara Ahmed, 38), drawn nearer the camera, then looks as big as v09
(`24.png`); clicking it shows 38 (`26.png`).

**d. The Data place.** Attributes, Nodes: hours, id, name, phone ("70% have a value"), role,
trained (`27.png`). Clicking hours shows Number, 24 distinct, Lowest 2, Highest 52, with no name
for the highest (`28.png`). Right-click: Add label line, Filter to..., Show in table; nothing to
size by it (`29.png`). Show in table opens the table "In the order loaded", not sorted on hours
(`30.png`).

## 3. Success path by keyboard only, with screen-reader names (`keyboard/`, `--sr`)

| Keys | Focus (screen-reader name) | Shots |
| ---- | -------------------------- | ----- |
| Tab x12 | Main menu; Local only; Settings...; Open project or file...; New from data...; Open the Les Miserables / Zachary's karate club / College football / Florentine families sample; DisclosureTriangle "What is collected" collapsed; Share usage data; No thanks | 02-13 |
| Enter | Open project or file... (live: "Usage data stays off. Change this in Settings > Privacy") | 14 |
| Enter, file | Load (live: "All 24 rows") | 15-16 |
| Enter | treeitem "Hovered, node layer, 0 nodes" (live: "volunteers: 24 nodes, 63 edges") | 17 |
| Tab x4, Shift+Tab x4 | Graph settings; separator "Resize left panel"; Canvas "Graph drawing"; Analyze; and back to Hovered | 18-25 |
| ArrowDown x2, Enter | treeitem "Everything, node and edge layer, 24 nodes, 63 edges" selected | 26-28 |
| Tab x18 | Graph settings; Resize left panel; Graph drawing; Analyze; Select what it paints; Layer actions; tab Style; tab Node; checkbox Style nodes; combobox Node shape; Node shape by attribute; Remove node shape; spinbutton "Node size" 1; Node size by attribute; Remove node size; Add to node visibility; Add to node text; Pick Node color | 29-46 |
| Shift+Tab x4, Enter | combobox "Find an attribute" expanded, nothing highlighted | 47-51 |
| Tab / Enter / Escape (checks) | Tab closes it, focus on the icon; Enter reopens; Escape closes, focus on the icon | 53-55 |
| ArrowDown x4, Enter | Fixed size; "hours, 2 to 52"; "5 attributes, hidden"; wraps to Fixed size; Enter closes, nothing changed | 56-61 |
| Enter, ArrowDown x3, Enter | "5 attributes, shown"; --read lists name, role, trained, phone, "Node id" disabled with reasons | 62-67 |
| ArrowDown, ArrowUp, Enter | "5 attributes, hidden" again | 68-70 |
| ArrowUp, Enter | button "Node size: hours, 1 to 3" (live: "Node size varies by hours, on 24 nodes"); dots sized | 71-72 |
| Shift+Tab x12, Tab x3 | back through the inspector to Analyze | 73-87 |
| ArrowRight x5, ArrowLeft, Enter | Layout; "View, 3D"; Legend (pressed); Table; Filters; Table; Enter: focus on header "Id" | 88-94 |
| ArrowRight x3, Enter | "hours, sorted descending" (live: "Sorted by hours, highest first") | 95-98 |
| --read | first row "v09 Hannah Weiss staff 52 Yes 555-0109" | 99 |
| Escape (check) | nothing; focus stays on the header, table stays open | 100 |

End state equals the pointer walk's (`keyboard/styles.json`). Focus never fell to the page.

## Defects (any walk)

1. The Graph inspector's Style tab, open by default after Load, has nothing for node looks and no
   pointer to the Everything layer (`detours/05.png`).
2. Styling from a clicked dot makes a one-node layer named by the id ("v09"), and binding its
   size to hours changes nothing visible when the dot is the top value; only the key's small "v09:
   1 of 24 nodes" says the binding covers one dot (`detours/10.png`, `16.png`).
3. With every dot selected, the selection ring scales with the dot and a nearer dot (v24, 38) reads
   as big as the busiest (v09, 52): a false "who gave the most" (`detours/24.png`, `26.png`).
4. In 3D, v09 (52) and v02 (48) draw about the same size, so the biggest is not clear at a glance
   (`pointer/08.png`, `10.png`).
5. A new layer from the selection starts at a fixed size 1 that covers the earlier size binding
   and removes the size key with no notice (`detours/22.png`).
6. The find box's suggestion is cut off ("has a val...") and Enter rewrites the entry to `=hours`
   (`detours/17.png`, `19.png`).
7. The Data place's hours summary gives "Highest 52" with no name, offers no way to size by the
   attribute, and "Show in table" opens the table unsorted (`detours/28.png` to `30.png`).
8. "Show why" names the id column "Node id"; everywhere else it is "id" (`keyboard/67`, --read).
9. The link icon beside Size keeps the arrow pointer on hover, though it is a button
   (`pointer/06.png`).
10. Opening the popover by keyboard highlights nothing; the first ArrowDown lands on Fixed size,
    and Enter there closes the popover without a word (`keyboard/51.png`, `61.png`).
11. Escape in the table does nothing (focus stays on the header, table open) (`keyboard/100.png`).
12. With the table open the floating toolbar covers the bottom of the drawing (`pointer/12.png`).
