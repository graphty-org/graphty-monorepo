# T79 A pilot: one kind, in a network of 50,000 (targeted re-pilot)

Build f0a9a014cb (`.study-builds/tier5-r1d1-f0a9a014cb`), setup `staff-50k.txt`, 2026-11-02.
A targeted re-pilot: the pointer success path and the three routes of this task that the last fix
pass touched. Each walk is its own session, started by replaying the newest earlier walk of the
same route. The walk folders carry the build in their names because this pass's folder already
holds the walks of an earlier build of the same name.

Screenshots: under `/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T79A/`.

## Result

Reached. Nothing crashes, blocks the task or spoils its grade. The data stays the task's own the
whole way (50,000 nodes, 100,000 edges, 40 departments in `dept`).

## Success path by pointer (`success-f0a9a014cb`)

+ > Layer; Which nodes; `dept, 40 values`; type Grants; tick Grants; Done; Add to node fill; type
E4572E, Enter. All 10 steps matched the earlier walk.

- 06.png: the workspace reads "Which nodes -- Layer 1 1,076 of 50,000"; Grants 1,076, No match
  48,924; the table lists only Grants rows.
- 07.png: after Done the workspace closes; the layer list reads Layer 1 1,076; Which nodes shows
  Edit in place of the count while focus stays there (known, unchanged).
- 09.png: Fill E4572E; the key reads "Color: Layer 1, 1,076 of 50,000 nodes"; Which nodes "1,076 of
  50k". Matches the answer key (1,076 of 50,000).
- 10.png and 11.png: typing 00FF00 and pressing Escape puts the color back to E4572E; Tab moves on
  to the link button beside the color.
- Waits (from the step's input to a settled screen): open Which nodes 18 s, the tick 21 s, Done 17
  s; the rest under 5 s.

No mismatch with the answer key.

## Touched routes

### touched-30: reference list bounded at 50,000 nodes (`touched-30-f0a9a014cb`)

+ > Layer; Which nodes; type "within", Enter; Choose a reference; type "Person 0"; Escape. All 5
steps matched.

- 05.png: the list reads "Nodes 8 of 10,000" and shows 8 rows: bounded, as required. The rows are
  not in name order (n6818 first, Person 00000 not shown), which matters only to a reader hunting
  for one exact name; not this task's route.
- 06.png: Escape closes the list and leaves the workspace and the step as they were.

### touched-32: Cancel on a new filter card (`touched-32-f0a9a014cb`)

Data; Add filter; `dept, 40 values`; type Grants; tick Grants; Cancel; then by hand: hover Undo,
Control+Z, hover Redo, Redo.

- 03.png: the card previews dept Grants, 1,076 of 50,000; the top bar shows the preview count.
- 05.png: Cancel removes the card; Filters is empty; the graph is back to 50,000 nodes. The replay
  stopped here because the Undo button is no longer named "Undo deleting a filter condition": the
  cancelled card left nothing on the undo history, which is the fix.
- 06.png to 08.png: Undo is named "Undo changing the layout"; Control+Z undoes the setup's layout
  (camera left close up on a few large nodes, toast "Undid changing the layout."), the decided
  behavior; the card does not come back.
- 09.png: Redo restores the layout; nothing else changed.

### touched-42: success path, dept Grants (`touched-42-f0a9a014cb`)

The same route as the success path, in its own session; all 10 steps matched, with the same
screens (11.png: Layer 1 1,076, key "1,076 of 50,000 nodes", fill E4572E). Waits: open Which nodes
17 s, the tick 18 s, Done 18 s.

## Not walked

The detour and keyboard walks are not part of a targeted re-pilot; the earlier pass's walks stand.
