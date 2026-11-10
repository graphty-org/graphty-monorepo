# Pilot: T71 A (volunteers, either of two things)

Build: baac78342b (frozen, `/home/apowers/Projects/graphty-monorepo/.study-builds/tier5-r1-baac78342b`).
Start: setup `volunteers.txt` (volunteers.graphml, PageRank run). Every walk began at that start and
went by clicks, typing and keys only. The data stayed the volunteers network (24 nodes, 63 edges)
the whole way. Screenshots are under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1/pilot/T71A/ (not in git).

Result: **reached** by pointer (10 of 24, 9 path steps, as the answer key says) and by keyboard.

## Success path, pointer (success/)

| Step | Action                | What the screen showed                                                            | Shot   |
| ---- | --------------------- | --------------------------------------------------------------------------------- | ------ |
| 1    | Data                  | Data place, Filters with "+"                                                      | 02.png |
| 2    | Add filter            | Workspace "New filter -- Filters 24 of 24", value picker open, all nodes teal     | 03.png |
| 3    | role                  | Checklist volunteer 16, staff 5, board 3                                          | 05.png |
| 4    | board                 | 3 of 24; top bar "3 of 24 nodes, 1 of 63 edges"                                   | 06.png |
| 5    | Or...                 | Outline "A 3 / role board / or B 0 / Value...", picker open                       | 07.png |
| 6    | hours                 | Range card, Min box focused, "0 so far"                                           | 08.png |
| 7-8  | type 30, Enter        | 10 of 24, B 7, outline "hours min 30", top bar "10 of 24 nodes, 14 of 63 edges"   | 09.png |
| 9    | Done                  | Card outline "A 3 / role board / or B 7 / hours min 30"; Values "Nodes showing 10 of 24" | 10.png |

Matches the answer key: path, 9 steps, final outline and the count. One mismatch of naming only:
`role` is two controls while the workspace is open (the picker's option and the strip's "role"
column header button), so a step script must say `role=option:role` (04.png); a person is not
affected.

## Detour 1: two filter cards (detour-1/)

- The canvas toolbar's Filters button (tooltip "Filters") opens the Data place with a new filter
  card and its picker open (03.png): a good second way in.
- Typing "rol" in that picker and pressing Escape takes the whole new card back and closes the
  workspace (04.png); decided.md settles this ("Escape on a new card's picker says Filter not added").
- Card 1 role board (05.png), card 2 hours min 30: while card 2 is edited the top bar reads "0 of 24
  nodes" and Filters "Passes none", the header "7 of 24" (06.png). After Done the canvas is empty,
  0 of 24, each card still showing its own count (role board 3 of 24) (07.png). The "Passes none"
  word and the empty canvas tell a person both must hold; nothing says why.
- Recovery: a click on the name of card 1 at its text opened the workspace (10.png); Or..., hours,
  30, Enter, Done gave "7 of 24" with both cards on (11.png). Card 2 has no remove control at rest
  and no right-click menu (12.png, 14.png); Edit, then "..." (Select 7, Duplicate, Delete) and
  Delete removed the card and closed the workspace: 10 of 24 (16.png, 17.png). Reached.

## Detour 2: the second value by Condition... in the same group (detour-2/)

- role board, then Condition..., hours, 30, Enter: 0 of 24, the strip "No rows" (03.png).
- The step's outline row is cut to "ho...  m...  Passes none" (03.png); its whole words are only in
  the tooltip "hours min 30, 0 of 24 nodes so far" (04.png).
- The step's "..." menu holds Add instead, Turn off, Duplicate, Move up, Move down, Delete (05.png).
  Add instead turned it into "Add hours min 30": 10 of 24 (06.png); Done: one card, outline "role
  board / Add hours min 30", top bar 10 of 24 (07.png). An equal result with one card.

## Detour 3: a style layer instead of a filter (detour-3/)

- Style layers "+" > Layer, Enter commits the name, Which nodes opens the workspace (02-05.png);
  role board, Or..., hours 30: "Which nodes -- Layer 1 10 of 24" (06.png).
- After Done the inspector's outline grows and pushes Visibility from y 287 to y 415; a click where
  Visibility had been landed on the outline's "B" row and reopened the workspace (07.png, 08.png).
- Visibility "+" > Hide hides the 10 wanted people, not the 14 others (10.png). The canvas key then
  reads "Show: Layer 1, 10 of 24 nodes" for a layer that hides them, and the hidden nodes' edges
  stay drawn, ending in empty space. The Show select offers only Shown and Hidden (12.png): no way
  to turn it round from here.
- Going on to Data and building the right filter card (14-15.png): the top bar says "10 of 24
  nodes, 14 of 63 edges", the Values tab and the Which nodes count say 10 of 10, but the canvas
  shows no node at all, only 14 edges, because Layer 1 still hides those 10. A person reading the
  canvas sees nobody left; one reading the top bar reports 10 with a picture that contradicts it.
  Per the answer key a layer with Visibility is not success; the filter card on top is.

## Keyboard only (keyboard/, started --keys --sr)

Focus order and names: Main menu, "Project: volunteers", "Undo running PageRank", Redo (disabled,
still a stop), rail "Graph"; ArrowDown to "Data", Enter opens it (10.png). Tab: Collapse Data
sources, Add source, "volunteers.graphml 24 nodes, 63 edges", its menu, Collapse Attributes,
Collapse volunteers.graphml, "Add to node attributes", "Add filter". Enter: the picker's combobox
"Find attributes, results" focused, "Editing New filter, Filters" spoken. Typing "role" highlights
"role, 3 values"; Enter focuses checkbox "volunteer, 16 nodes"; Tab, Tab to "board, 3 nodes";
Space checks it and "3 of 24 nodes" is spoken. Or... is above the checklist: Shift+Tab from the
checklist goes Value: role, Except, "More for role board", "Or...". Enter on Or... opens the picker
(nothing spoken); "hours", Enter focuses "hours from, number"; 30, Enter speaks "10 of 24 nodes".
Escape (three presses, see below) closes it as Done and speaks "Done, 10 of 24"; focus lands on
the card's row "role board, 10 of 24 nodes" (79.png). Reached.

Fields: Enter in the min box commits and speaks the count; Tab moves to "hours to", then out of the
workspace; Escape in the min box after typing 31 keeps 31 and moves focus to the outline row
(decided: Escape closes the innermost and keeps work). Ctrl+Z undid it ("Undid editing the filter
..."). Enter on the resting card's row reopens the workspace on the last edited step.

Focus never fell to the page body.

## Defects

1. **A hiding layer leaves its nodes' edges drawn** (detour 3, detour-3/10.png, 15.png): with
   Visibility Hidden the nodes go but every edge to them stays, ending in empty space; with the
   filter on top the canvas shows 14 edges and no node while the top bar says 10 of 24 nodes.
2. **The canvas key says "Show:" for a layer that hides** (detour-3/10.png, 15.png): "Show: Layer
   1, 10 of 24 nodes" while Layer 1's Visibility is Hidden.
3. **A condition step's row is cut to "ho... m..."** beside "Passes none" in the outline column
   (detour-2/03.png); the rule is readable only from the tooltip.
4. **A click on the middle of a collapsed filter card's row does not open it** (detour-1/09.png,
   13.png): clicking the card button "role board, 3 of 24 nodes" (or "hours min 30, 7 of 24 nodes"
   at 200,553) only focuses it and shows Edit; a click on the name text opens the workspace
   (10.png). decided.md: "Edit, a click or Enter on any row opens the workspace on that row".
5. **Edit is not drawn on hover while another card holds focus** (detour-1/12.png): pointing at
   card 2 tints its row but Edit stays on card 1. decided.md: "Sidebar Edit is drawn on hover or
   focus over the title row's end".
6. **A card has no remove at rest** (detour-1/12.png, 14.png): no X on hover, no right-click menu;
   removing a card needs Edit, "...", Delete.
7. **Done moves the inspector's controls under the pointer** (detour-3/07.png, 08.png): after Done
   the Which nodes outline expands by four rows, so Visibility, Text, Fill move down 128 px and a
   click aimed at Visibility reopens the editor on group B.
8. **First Escape on the "More for hours" button does nothing a person can see or hear**
   (keyboard/77.png): it takes three Escapes from the properties column to close the workspace
   (the first seemingly only dismisses the button's tooltip, the second moves focus to the outline
   row, the third is Done).
9. **The page scrolls up 1 px in the workspace** (keyboard/77.png against keyboard/10.png): the
   top bar and the status bar move up by a pixel once focus walks the properties column.
10. **Three slider stops for one range** (keyboard walk, Tab after "hours test"): slider "hours
    range" value "30 to 52", then "hours range start" and "hours range end": the first is an extra
    Tab stop that says nothing the two thumbs do not.
11. **Or... adds group B with nothing spoken** (keyboard walk): Enter on "Or..." moves focus to the
    picker's search with no announcement that a second way in was added.
12. **"0 so far" beside a step that has no test yet** (success/08.png): the new B step reads "0 so
    far" before any bound is set, which reads as "nobody has 2 to 52 hours".
13. **The Tab order in the workspace runs canvas, header, outline, Fit, strip, properties**: the
    preview canvas ("Preview: role board -- Filters") comes before the header's Group colors,
    Table, Clear, Cancel and Done, though the header is drawn above it.
14. **Every start prints "the drawing is still moving"** (success/01.png and every other walk's
    01.png): the layout is still settling when the participant arrives.

## Skipped

None.
