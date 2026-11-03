# Pilot: T72 B (gauges -- readings sent by itself, not installed in the 1990s), targeted re-pilot

Build: 47c95a09fc, served from `.study-builds/tier5-r1d2-47c95a09fc`. Every walk started from the
task's real start, `setup:gauges-clean.txt` (11 gauges, 13 stretches, station as the label, the
node table open). Screenshots are under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d2/pilot/T72B/ (below, `<walk>/NN.png`).
The data stayed the task's own on every walk: 11 nodes and 13 edges in the graph; the five gauges
reached are G02 Mill Pond, G04 Fox Creek, G06 Willow Run, G07 Stone Weir and G11 Quarry Pool.

Result: **reached** by pointer. Nothing on the touched routes crashes, blocks the task or gives a
wrong count. Cancel or Escape on a new filter card takes the card away and leaves no filter mark in
the top bar, whichever way the card was opened.

## Success path by pointer (`success/`)

Replayed the earlier pass's success walk step for step; every check point matched.

- + > Layer, Which nodes, telemetry, tick yes: "7 of 11", the yes box drawn ticked (05.png).
- Condition... > installed, 2000, Except: "Except installed before 2000", header 5 of 11, strip lists
  G02, G04, G06, G07, G11 (08.png).
- Done, Add to node fill, E4572E, Enter: five orange nodes, key "Color: Layer 1, 5 of 11 nodes",
  inspector "telemetry yes / Except installed before 2000", row count 5 (10.png).
- Hex box: a new value then Escape put back E4572E (11.png); Tab kept it and moved to the link
  button (12.png).

Matches the answer key's B route and its final outline.

## Touched routes that belong to this task

Numbered as in the fix pass's list. Entries 1-3 are the same change (Cancel on a new filter card);
each was walked from a different opener: the Data place's Add filter with one step, with two steps,
and the canvas toolbar's Filters.

| Walk | Route | What happened |
| ---- | ----- | ------------- |
| touched-1 | Data > Add filter, telemetry yes, Cancel | Card gone, Filters section empty, top bar mark gone, 11 nodes drawn (03.png). Then Control+Z: the card comes back switched on, "telemetry yes 7 of 11", top bar "7 of 11 nodes, 3 of 13 edges", toast "Undid deleting a filter condition." (04.png). A real card built after it worked: 5 of 11 (05.png). |
| touched-2 | Data > Add filter, telemetry yes, Condition... installed 2000, Except, Cancel | Two-step new card gone, no filter mark (04.png); Tab from where focus landed goes to the panel's resize handle, so focus was on Add filter. |
| touched-3 | Canvas toolbar Filters, telemetry yes, Cancel | Card gone, no filter mark (04.png). |
| touched-4 | Canvas toolbar Filters, then Escape | Card gone, focus ring on the toolbar's Filters (03.png); Enter there opens a new card again (05.png); Escape takes it away again (06.png). |
| touched-5 | Canvas toolbar Filters, tick yes, Escape x3 | First Escape closed the picker and kept the card (as decided); the second closed the workspace keeping "telemetry yes 7 of 11" (04.png, 05.png). |
| touched-6 | Cancel on an existing card | Card "telemetry yes" made and Done; Edit, Except installed before 2000 (5 of 11, 03.png), Cancel: the card is kept and back to 7 of 11 (04.png); Edit then Cancel with no change keeps it too (06.png). |
| touched-7 | Keys only (`--keys --sr`): Control+K, "filter", Enter, then Cancel and Escape | See below. Reached the end. |
| touched-14 | New layer, Which nodes, the tick | Each box drawn ticked on its own click (yes, then no: "telemetry no, yes", 11 of 11, 06.png); unticking no and Done: Layer 1 counts 7 (07.png). |

### Keyboard (`touched-7/`)

- Control+K: combobox "Search commands"; "filter": option "Filters"; Enter: combobox "Find attributes,
  results", said "Editing New filter, Filters" (04).
- "tele", Enter: checkbox "yes, 7 nodes"; Space: checked, "7 of 11 nodes" (06).
- Shift+Tab: "Value: telemetry", switch "Except", "More for telemetry yes", "Or...", "Condition...",
  "id", "Fit", treeitem "telemetry yes, 7 of 11 nodes", "Done", "Cancel" (07-16).
- Enter on Cancel: focus to button "Add filter", said "Filter not added", then "Filter off"; the card is
  gone (21.png). Tab: separator "Resize left panel"; Shift+Tab back to "Add filter".
- Control+K, "filter", Enter, Escape on the empty picker: focus to "Add filter", "Filter not added", no
  card (25.png).
- Control+K, "filter", Enter, "tele", Enter, Space, then Escape: treeitem kept; Escape: "Done, 7 of 11";
  Escape: focus on the card's own button "telemetry yes, 7 of 11 nodes" (as decided).

Focus never fell to the page body, Quick actions or Main menu. Every control met had a name.

## Routes in the list that are not this task's

Entries 8-13 and 15-19 (the success paths of T71 A, T71 B, T77 A, T77 B, T79 A, T79 B, T74 A, T70 A,
T79 B detour-3 and T79 A touched-30) are other tasks' walks on other starts and datasets; they are not
walked here.

## Defects (all walks)

1. **Undo after Cancel on a new filter card brings the card back, switched on**, under the words
   "Undid deleting a filter condition." The person never made or deleted a card: they cancelled it.
   Someone who presses Control+Z right after Cancel (to undo the edit before it, or to be sure) gets a
   filter they turned down, hiding four gauges. For T72 B a filter card is already not success, so it
   does not spoil this grade, but it adds a card where tasks count cards (T71, T77, T79).
   touched-1/03.png against 04.png.
2. **Cancel on a new card says two things**: "Filter not added" then "Filter off". The second reads as
   if a card still exists and was switched off. touched-7, step 21.
3. Still seen, unchanged from the earlier passes: one orange node half under the canvas toolbar with
   the node table open, so a count of the picture finds four (success/10.png); "With issues 11" counts
   every row (success/10.png); a filter card holding an Except step is named by its first step only
   (touched-1/05.png).

## Answer key against the screen

- Path B: "type 2000; Enter" -- the count updates as the digits are typed; Enter changes nothing visible.
- Otherwise the route and its final outline match the screen.
