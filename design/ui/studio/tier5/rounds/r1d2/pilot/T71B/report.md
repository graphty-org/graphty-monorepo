# T71 B pilot on build 47c95a09fc (targeted re-walk)

The study build is 47c95a09fc (`.study-builds/tier5-r1d2-47c95a09fc`). Every walk starts from the
task's real start (`rounds/tier-5/setups/gauges-clean.txt`: gauges.csv joined with flows.csv,
station as the label). Screenshots stay out of git, under the main checkout's
`tmp/design-studio/tier5/r1d2/pilot/T71B/<walk>/`.

This pass walks only the pointer success path and the routes the last fixes touched that belong to
T71 B: "T71B success path" (touched-10) and the task-free keyboard route "new card from Quick
actions, then Cancel and Escape" (touched-8). The other touched routes name other tasks and are
walked in their own pilots. The detours and the full keyboard walk were not asked for this pass;
their last reading stands.

## Result

Reached. The answer key's values hold: top bar "6 of 11 nodes, 2 of 13 edges", one filter card,
G01, G03, G05, G08, G09 and G10 in the picture. No crash, no script error, nothing that blocks the
task or spoils its grade.

## Walks

### success -- the pointer success path

Replayed the earlier pass's 10 steps; every check point matched (Data, Add filter, telemetry, no,
Or..., installed, type 2000, Enter, Done, hover Shown). 9 path steps, as the answer key counts.

- Before Done: workspace "telemetry no -- Filters 6 of 11"; outline "A 4 / telemetry no / or B 3 /
  installed before 20..."; No match 5 (success/09.png).
- End: one card in Filters, "telemetry no", outline "A 4 / telemetry no / or B 3 / installed before
  2000"; top bar "6 of 11 nodes, 2 of 13 edges"; the node table "6 of 11 nodes" lists G01, G03,
  G05, G08, G09, G10 (success/11.png).
- No mismatch with the answer key.

### touched-10 -- T71 B success path

The same route, replayed into its own session; every check point matched, same end screen
(touched-10/11.png).

### touched-8 -- keyboard: new card from Quick actions, then Cancel, then a new card and Escape

Keyboard-only session with screen-reader names (`--keys --sr`).

- Control+K, "filter", Enter: focus combobox "Find attributes, results", live "Editing New filter,
  Filters"; the workspace reads "New filter -- Filters 11 of 11" (touched-8/02.png).
- Shift+Tab walks: "Condition..." (live "No step added"), "id", "Fit", treeitem "New filter, 11 of 11
  nodes" selected, "Done", "Cancel", "Clear", "Table of matches" pressed. Every control named, no
  duplicate, focus never on the page body.
- Tab, Tab to "Cancel", Enter: focus "Add filter", live "Filter not added"; the Filters section is
  empty and the top bar shows no filter count, Nodes 11 (touched-8/12.png). The card is gone, as
  `decided.md` (dry run pass 1 and 2) settles.
- Control+K, "filter", Enter, then Escape: focus "Add filter", live "Filter not added", no card
  left; a second Escape keeps focus on "Add filter" and changes nothing (touched-8/14.png,
  touched-8/15.png).

## Defects

None that block the task or spoil its grade on these routes.

- Look only, not new: Enter on the header's "Clear" while a new card has no step reopens the
  value picker (an earlier aborted keyboard try on this route; the route above uses Cancel).
