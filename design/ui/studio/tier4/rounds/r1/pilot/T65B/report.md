# Pilot: T65 B (gauges + flows, tidied)

Build: tier4-r1-0ffeae2ef5 (frozen). Screenshots under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1/pilot/T65B/ (git ignores them).

Start: the answer key names the setup `gauges-tidy.txt` (gauges.csv joined with flows.csv, Stone
Weir's bad depth made blank, `installed` read as dates). No such file is in the studio's setups
(`rounds/tier-4/setups/` holds only `gauges-joined.txt`), so every walk started from a copy with
those steps at tmp/design-studio/tier4/r1/pilot/T65B/setup/gauges-tidy.txt. The data stayed the
task's own the whole way (12 gauges, 14 edges, the dates and depths as in the file).

## Result

Not reached as the answer key describes it. The first half works and matches the key: one card,
telemetry is yes and depth_cm 70 to 210, Hide, reads **5 of 12** (G01, G02, G04, G09, G11). The
second half cannot be built: `installed` is a date column (the table draws it as dates and its
Type menu has "date" ticked), but Filters "+" lists it as text ("Aa", "91% have a value") and its
card offers only Contains / Starts with / Ends with / Is exactly / Has a value / Has no value. No
"before 2005" condition exists. The nearest a participant gets is Starts with "19", set to Select,
which reports **3 nodes selected** -- the key's number, by accident: the three are G01, G09 and
G05 (Old Bridge, 1995), a gauge that is out of the picture; G02 (2003) is missed. The true count
among those in the picture would be 3 (G01, G02, G09), and there is no way to reach it.

## Route 1: success path by pointer (p2-path)

1. 02: Filters "+" opens the attribute picker. `installed` shows as text.
2. 03-04: telemetry > yes. Card defaults to Hide; header chip and toolbar read 7 of 12.
3. 05-07: Add a condition > depth_cm. The method list (06) has Between / Highest / Has a value /
   Has no value; no "at least". From 48 changed to 70, Enter: 5 of 12. Enter writes, Tab moves on,
   Escape keeps the card (08).
4. 09-10: Filters "+" > installed: a text card; its method list (10) has no date comparison.
5. 11: Starts with "19": the suggestion list shows raw stored values
   "1995-06-30T00:00:00.000Z" while the table shows "Jun 30, 1995".
6. 12: Enter writes the card as Hide (2 of 12 in the picture) and leaves the suggestion list open.
7. 14: Select: inspector "3 nodes selected", telemetry "yes (2), no (1)"; only two nodes and two
   table rows are highlighted.

## Route 2: detours (p2-detours)

- Toolbar magnifier (02-04): it is Quick actions, not find. "telemetry yes" gives "No results"
  with no pointer elsewhere; "filter" finds Filters, and Enter opens the same attribute picker.
- Filters picker search "time" (05-06): "Nothing found". The Structure group holds only Data
  source and Largest component -- no Time window, although installed is set as the Time.
- Toolbar Filters button (07, 09): opens the Data place's picker, focused; it keeps the last scroll
  position. Escape closes it and puts focus on the panel's "+", not on the toolbar button.
- Graph place find box (11-14): "installed < 2005" says no match (a date cannot be used in a rule);
  "depth_cm >= 70" selects 7 and the drawing re-lays itself (node positions change between 12 and
  13) without being asked. A combined rule with "and" gives no match. The hint only offers
  "lat >= 44"; nothing points to Filters.
- Right-click a selected node (15): Neighborhood, Path between, Frame selection, New layer from
  selection, Add note, Motion off. No way to take the selection out of the picture or keep only it.
- Style layer (16-20): Add > Layer > Which nodes > installed: the same text card. Visibility "+"
  offers Hide (a not-success route that keeps everyone in the data but nothing links to Filters).
  Escape on the empty condition drops it with a notice, as decided.
- Table header right-click on installed (21-22): Type shows "date" ticked; the menu has no filter
  item. Its "Hide" hides the column, the same word the filter card uses for taking nodes away.

## Route 3: keyboard only, with screen-reader names (p2-keys-sr)

Reached the same end state as route 1 (same date problem). Focus never fell to the page body.

- 18 Tabs from the top to Filters "+": Main menu, Project: gauges, Undo changing a column's type,
  Redo (disabled), Data, Collapse Sources, Add source, gauges.csv 11 nodes, gauges.csv menu,
  flows.csv 13 of 15 rows joined 12 nodes, 14 edges, 1 issue in flows.csv, flows.csv menu,
  Collapse Fields, Collapse flows.csv, Add to edge fields, Direction, Expand gauges.csv, Add filter.
- Enter, "tel", Enter: focus lands on checkbox "yes, 7 nodes"; Space: "Filter on: 7 of 12 nodes".
- Add a condition, "dep", Enter: focus goes back to "Add a condition", past the new fields;
  two Shift+Tabs reach "depth_cm from, number". 70, Enter: "Filter on: 5 of 12 nodes, 2 edges".
  Escape puts focus on "Apply telemetry is yes and depth_cm is between 70 and 210" (as decided).
- Add filter, "inst", Enter: focus on "installed: text to match". Shift+Tab to "installed: how to
  match", Enter, ArrowDown, Enter: Starts with. "19", Enter: "Filter on: 2 of 12 nodes"; the list
  stays expanded. Escape closes the list; a second Escape moves to the on box.
- Shift+Tab: radio "Hide nodes that do not match"; ArrowLeft: radio "Select". Spoken:
  "5 of 5 rows, 3 selected" and "3 nodes selected" while the table shows two of its five rows
  selected. F6 to the Inspector reads "3 nodes selected ... telemetry yes (2), no (1)".

## Mismatches with the answer key

1. No date condition: installed is offered as text, so "installed before 2005" cannot be made.
2. No "at least" method for numbers: the key's "at least 10/70" is "Between" with the low end set.
3. Setup `gauges-tidy.txt` named by the key does not exist in the studio's setups.
4. A Select card selects matching nodes that are out of the picture, so "selected among those in
   the picture" is not what the screen counts; the key's 3 cannot be read correctly.

## Defects

Severity order. Route and screenshot (under tmp/design-studio/tier4/r1/pilot/T65B/).

1. Date column offered as text in Filters "+", the Style condition picker and the find box rules
   (route 1 p2-path/02.png, 10.png; route 2 p2-detours/18.png, 12.png, 22.png).
2. A Select card counts and selects nodes another card has taken out of the picture: inspector
   "3 nodes selected" with one of them hidden; screen reader says "5 of 5 rows, 3 selected"
   (p2-path/14.png; p2-keys-sr/11.png).
3. Time window missing from the Structure group although a Time is set (p2-detours/06.png).
4. Suggestion list for a date shows raw ISO timestamps "1995-06-30T00:00:00.000Z"
   (p2-path/11.png).
5. Enter in a text card writes the condition but leaves its suggestion list open
   (p2-path/12.png; keyboard: combobox still "expanded").
6. Find-box selection re-lays the drawing without being asked (p2-detours/12.png vs 13.png).
7. Keyboard: after picking a number field in "Add a condition", focus returns to "Add a condition"
   instead of the new condition's first field (a category field goes into its first value)
   (p2-keys-sr/04.png).
8. A node of the filtered picture sits under the canvas toolbar, so 5 in the picture shows as 4
   (p2-path/07.png, 14.png).
9. A new filter card has no Select / Hide until it holds a value, and then defaults to Hide, so a
   reader building a "mark" card first takes gauges out of the picture (p2-path/12.png).
10. The Hide radio's name is "Hide nodes that do not match" but Select's is only "Select"
    (p2-keys-sr route).
11. Quick actions (the toolbar magnifier) answers "telemetry yes" with "No results" and no pointer
    to Filters or the find box (p2-detours/02.png).
12. The find box hint "To select by a value, type a rule such as lat >= 44" never mentions taking
    nodes out of the picture; no route from a selection to Filters, and the node menu has no
    "hide" or "keep only" (p2-detours/14.png, 15.png).
13. Escape from the picker opened by the toolbar Filters button returns focus to the Data place's
    "+", not to the button that opened it (p2-detours/10.png).
14. "Hide" in the table header menu hides a column, the same word the filter card uses for nodes
    (p2-detours/21.png).
15. The Graph place header reads "Graph gauges.csv" for a graph built from two files
    (p2-detours/11.png).
16. Sentences on screen where the owner rule asks for controls: "2 nodes have no value and are
    left out." on the depth card, "All 12 nodes: add a condition to narrow" on Which nodes
    (p2-path/05.png; p2-detours/19.png).

## Skipped

Nothing. The follow-up (order) was not walked as a separate route; cards are flat and order-free
by decision.
