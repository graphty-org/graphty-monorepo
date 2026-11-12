# Pilot: T72 B (gauges -- readings sent by itself, not installed in the 1990s)

Build: baac78342b, served from `.study-builds/tier5-r1-baac78342b`. Every walk started from the
task's real start, `setup:gauges-clean.txt` (11 gauges, 13 stretches, station as the label, the
node table open). Screenshots are under
`/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1/pilot/T72B/` (below, `<walk>/NN.png`).
The data stayed the task's own on every walk: 11 nodes and 13 edges at the start and at the end;
the five gauges reached are G02 Mill Pond, G04 Fox Creek, G06 Willow Run, G07 Stone Weir and G11
Quarry Pool.

Result: **reached** by pointer and by keyboard. The answer key's route works as written. The route
a person who reads "not in the 1990s" is most likely to take -- the time step's Between mode -- does
not work: the mode list never changes from Before.

## 1. Success path by pointer (`success/`)

| Step                                       | What happened                                                                                                    | Screenshot     |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- | -------------- |
| Start                                      | Graph place; style layers Hovered, Selected, Pinned, Everything; node table open under the canvas                | success/01.png |
| + (Add a layer or a folder) > Layer        | Layer 1 added, "All nodes 11 of 11", its name box focused for renaming                                           | 02, 03         |
| Which nodes                                | Workspace "Which nodes -- Layer 1 11 of 11"; the value picker open with Data columns; telemetry "2 values"     | 04             |
| telemetry, tick yes                        | "telemetry yes", 7 of 11, No match 4                                                                             | 06, 07         |
| Condition... > installed                   | A new step: "Before" mode, box "A date or a year" focused                                                        | 08, 09         |
| Type 2000, Enter                           | "installed before 2000", 2 of 11 (G01 Upper Falls, G09 Lake Inlet)                                               | 10             |
| Except switch                              | Row reads "Except installed before 2000"; header 5 of 11; strip lists G02, G04, G06, G07, G11                    | 11             |
| Done                                       | Inspector outline "telemetry yes / Except installed before 2000"; layer row count 5                              | 12             |
| Fill + (Add to node fill), type E4572E, Enter | Five nodes orange; canvas key "Color: Layer 1, 5 of 11 nodes"                                                | 14, 15         |
| Hex box: new value, Escape                 | Escape put back E4572E (the edit was dropped)                                                                    | 16             |
| Hex box: Tab                               | Value kept, focus to the link button                                                                             | 17             |

Final outline matches the answer key's B route ("telemetry yes / Except installed before 2000",
5 of 11). The answer key's step "Enter" after typing 2000 changes nothing visible: the count had
already updated while typing (10.png).

## 2. Detours

### Detour 1 -- two layers, one coloring and one un-coloring (`detour-1/`)

Layer 1 on telemetry yes, filled E4572E (7 orange). A second layer on installed, aiming at "the
1990s":

- The mode list (Before, After, Between, Has a value, Has no value) does not change. Between picked
  by pointer stays "Before" (05.png, 07.png); After by pointer stays "Before" (10.png); Between by
  ArrowDown, ArrowDown, Enter stays "Before" (11.png). Worse, after typing 1990 (08.png, "Passes
  none", 0 of 11) a pick of Between or After clears the typed date (09.png, 10.png) and the count goes
  back to 11 of 11.
- Gave up on Between, typed 2000 under Before: Layer 2 "installed before 2000", 3 of 11 (G01, G05,
  G09), Done.
- Fill +: the box shows 6366F1 with a blue chip (12.png), but nothing is applied: the canvas still
  shows seven orange nodes and the key lists only Layer 1. Only Enter applied it (13.png).
- After Enter the key reads "Color: Layer 2, 3 of 11" and "Color: Layer 1, 7 of 11 nodes, 2 nodes
  covered by Layer 2"; five nodes orange. A participant would answer 5 (right count, "not success"
  by the answer key: no layer holds the rule).

### Detour 2 -- looking for "not" in the value picker, then the equal second step (`detour-2/`)

- New layer, Which nodes, typed "not" in the picker's search: "Nothing found" (02.png). "1990":
  "Nothing found" (03.png). Nothing in the picker leads to Except.
- Escape in the search took the empty step back, focus to "Condition...", workspace open (04.png);
  matches decided.md ("Escape in that picker takes the card back").
- telemetry yes, Condition... > installed, picked After before typing (05.png): stays "Before"
  (06.png). Typed 2000 (2 of 11), Escape: value kept, focus to the outline row (07.png), as decided.
- With 2000 typed, After again: the date is cleared and the mode stays Before (08.png), count back
  to 7 of 11. The answer key's "Also success: installed not before 2000" (After 2000) cannot be built.

### Detour 3 -- a filter card from the canvas toolbar (`detour-3/`)

- The canvas toolbar's Filters button opened the Data place with a new filter card's workspace and
  its value picker (02.png).
- telemetry yes, Condition... installed, 2000, Except: top bar "5 of 11 nodes, 1 of 13 edges",
  card named "telemetry yes" (03.png). Done: six gauges gone from the canvas (04.png).
- Graph place, new layer on All nodes, Fill E4572E: five orange nodes, but the layer's row says 11
  while the inspector says "5 of 5" and the key "Color: Layer 1" carries no count (05.png). A
  participant would answer 5 ("not success": a filter card).

## 3. Keyboard only (`keyboard/`, started `--keys --sr`)

Reached the end with keys only. Route: Tab x8 to "Add a layer or a folder" (09), Enter, menu
"Layer" (10), Enter: textbox "Layer name" (13), Enter: treeitem "Layer 1, node and edge layer, 11
nodes, 13 edges" (14); Tab x20 through the left panel's Graph settings, the resize handle, the
canvas, Analyze, the table's controls and the inspector to "Edit Which nodes" (34); Enter: picker
search focused, "Editing Which nodes, Layer 1" said (38); "tele", Enter: checkbox "yes, 7 nodes"
(41); Space: "7 of 11 nodes" (42); Shift+Tab x5 to "Condition..." (47-49); Enter, "inst", Enter:
combobox "installed before, a date or a year" (52); "2000": "2 of 11 nodes" (53); Shift+Tab x4 to
switch "Except" (59); Space: "5 of 11 nodes" (60); Escape: outline row "Except, installed before
2000, 5 of 11 nodes so far" (61); Escape: workspace closed, "Done, 5 of 11", focus back on "Edit
Which nodes" (62); Tab x4 to "Add to node fill" (66); Enter: textbox "Node color, not set, drawn
#6366F1 indigo", "Node color added: pick a value" (71); "E4572E", Enter: "Node color now red, on 5
nodes" (73); Tab: "Node color by attribute" (74).

Focus never fell to the page body. Every control met had a name; none were duplicated.

## Defects (all walks)

1. **The time step's mode list cannot be changed.** Before, After, Between, Has a value, Has no
   value are listed, but every pick leaves "Before"; a pick after a date is typed clears the date.
   Pointer and keys. Blocks "between 1990 and 1999" and the answer key's equal route "not before
   2000". detour-1/05.png, 07.png, 09.png, 10.png, 11.png; detour-2/06.png, 08.png.
2. **Two tables stacked under the workspace preview.** With the node table open when the workspace
   opens, the matches strip shows about three rows and the main table is drawn under it with the
   same rows again. success/04.png, 07.png, 11.png; detour-1/03.png.
3. **A filter card's matches strip is clipped at the left**: its Nodes | Edges tabs, Group and id
   columns sit behind the outline column, and the header shows a stray "All" segment.
   detour-3/02.png, 03.png.
4. **A new Fill shows a color it does not draw.** Fill + shows 6366F1 and a blue chip with nothing
   applied; the canvas and the key do not change until Enter. The screen-reader name says so ("not
   set, drawn #6366F1"); the screen does not. detour-1/12.png against 13.png.
5. **A layer row's count disagrees with its inspector under a filter**: row "11", inspector "5 of 5",
   key with no count. detour-3/05.png.
6. **Nothing in the value picker leads to Except.** "not" (and "1990") find nothing; the task's
   own word for Except has no search alias. detour-2/02.png, 03.png.
7. **The orange color is named "red"** in the color box's name and its announcement ("Node color
   now red, on 5 nodes") while the chip and the task say orange (E4572E is a red-orange). A
   screen-reader user asked for orange is told red. keyboard/73.png; success/16.png.
8. **Each count is announced twice** (two identical "7 of 11 nodes", "2 of 11", "5 of 11" live
   messages per change). keyboard/42.png, 53.png, 60.png.
9. **Tab from the last field in the workspace leaves for the status bar** ("Local only"), past the
   inspector, which stays visible and usable beside a style layer's workspace. keyboard/55.png.
10. **One orange node sits under the canvas toolbar** with the node table open (the table takes half
    the canvas): counting on the canvas finds four plus a half-hidden one; the key says 5.
    success/15.png.
11. **"With issues" chip equals every row** (11, then 7, then 5): every node counts as having an
    issue, from the station column's warning. A participant reading it may think the gauges are
    faulty. success/01.png, 07.png, 11.png.
12. **Layer control named "Select what it paints"** (the dotted-square icon by the layer's title)
    does not say what it does in the reader's words. keyboard/28.png.

Not defects (decided.md): Escape in the workspace keeps every edit and closes the innermost thing
first; Escape in a new step's empty picker takes the step back; the drawing is not re-framed when a
filter hides nodes.

## Answer key against the screen

- Path B: "type 2000; Enter" -- Enter does nothing visible; the count updates as each digit is typed.
- "Also success: installed not before 2000": cannot be built on this build (defect 1).
- Path B's step list starts "+ > Layer; Which nodes": the new layer's name box takes focus first, so
  a typed key would rename it; harmless by pointer.
