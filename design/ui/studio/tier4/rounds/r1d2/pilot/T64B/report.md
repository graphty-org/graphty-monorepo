# T64 B pilot: the gauge's name and the river distance (targeted re-pilot)

Build ff17391bb1 (frozen, served from .study-builds/tier4-r1d2-ff17391bb1), start `gauges-joined.txt`.
Every walk started from the task's real start and was driven by clicks and keys only. Screenshots
are under /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T64B.

**Reached: yes.** With Label station and Weight km, Higher means farther set in Data > Fields, the
inspector names G05 **Old Bridge**, Shortest path opens on "km (farther, loaded)", and its result
lists the path by name (Old Bridge, Heron Marsh, Lake Inlet) with Total km 5.3. No mismatch with
the answer key. The data stayed the task's own (12 nodes, 14 edges, gauges.csv and flows.csv) on
every walk.

## Walks that matched the earlier pass to the end

A replay on this build matched every check point of these earlier walks, so their findings stand:
detour-inspector, detour-inspector-c, detour-style, detour-style-table-c, fields-keys-c,
fields-keys-d, pointer, success, success-c (see rewalk.json in the folder above).

## Success path, by pointer

- pointer-p2 (replay of the last pass's pointer route, 18 steps, matched to the end): Label station
  and Weight km farther set in Fields (12.png: Loaded weight "km (farther)"); clicking the G05 row
  names it Old Bridge (15.png); Quick actions answers "No results" for "Old" (14.png), as the key
  says; Analyze > Betweenness opens with no weight row (19.png).
- pointer-sp (the same route, then Analyze > Shortest path): the form opens with From "Old Bridge"
  (the selected node) and Weight "km (farther, loaded)" (20.png); Find path to Lake Inlet gives
  Nodes in order Old Bridge, Heron Marsh, Lake Inlet, Total km 5.3, Weight km (farther) (21.png).

## Touched routes

- **Table header Role > Weight, then Shortest path again** (detour-table-role; detour-table-role-rerun).
  The replay diverged where the fix landed: the first run, with Higher means empty, reads Weight
  None, "Each edge counts as 1; km has no meaning set", and now lists the path by name
  (detour-table-role/09.png, detour-table-role-rerun/05.png). Setting Higher means > farther (by
  keys, 10-12.png; by pointer, rerun/06.png) and asking Shortest path again opens on "km (farther,
  loaded)" (14.png) and computes a new run: new time, Weight km (farther), Total km 5.3
  (detour-table-role/15.png, detour-table-role-rerun/08.png). The stale-result defect is gone.
- **Analyze list for a weight** (detour-analyze-weight, matched to the end): with no weight in Data,
  Shortest path's Weight list offers "km (farther)" for that run; the result reads km (farther),
  Total km 5.3 and lists G05, G08, G09 by code because no label is set on this route (08.png).
  That is right for this route; the answer key grades it P on Data > Fields.
- **Analyze > Shortest path after the label is set**: names in the path result on every route that
  set the label (pointer-sp/21.png, detour-style-table/29.png, keyboard/128.png).
- **Inspector and find name G05**: pointer-p2/15.png; the keyboard walk's find box steps matched.

## Detours (held to the earlier pilot's set)

- **Style text, then the Analyze list, then the table header Role menu** (detour-style-table,
  replayed; diverged at its last step). With farther set in Data, Shortest path opens on "km
  (farther, loaded)" (25.png). Escape with focus on "Pick To on the canvas" now goes back to the
  analyses list (26.png); before, it stayed in the form. Reopening Shortest path shows From empty
  again (27.png): the "Old Bridge" already chosen is gone. Typing Old / Lake and Find path gives
  Old Bridge, Heron Marsh, Lake Inlet, Total km 5.3 (29.png).
- **The inspector and the canvas menu** (detour-inspector, detour-inspector-c): matched to the end.

## Keyboard only

keyboard, keyboard-c, keys (screen-reader keyboard sessions; replays of the earlier pass's route,
which diverged at step 105 where Weight now reads "km (farther, loaded)" instead of "None"). Carried
on by hand: Tab order in the form is Advanced, Find path, Back to analyses, From node, Clear From,
Pick From on the canvas, To node, Clear To, Pick To on the canvas, Follow All, Weight. Typing
"Lake" highlights Lake Inlet; Enter takes it and moves focus to Find path; Enter runs it, focus
goes to the inspector heading "Shortest path", and the live region says "Shortest path added: Old
Bridge to Lake Inlet, km 5.3" (keyboard/128.png). Every control had a name; focus never fell to the
page body. All three reached the end.

## Defects

- **Escape on the path form's Pick button goes back to the list of analyses and drops the chosen
  From.** Route: detour-style-table, Shortest path with From "Old Bridge", focus on "Pick To on the
  canvas", Escape (26.png), then Shortest path again shows From empty (27.png). A participant who
  presses Escape to back out of a step must choose From again. It does not change the answer.
- **The status region's first message is marked unconfirmed** ("Queued, 1st" arrives with the
  region already holding it), so a screen reader may not speak it; the later messages, including
  the result, are spoken (keyboard, Find path step). Minor.

Nothing crashed, blocked the task or gave a wrong result.

## Every route walked again on this build

Each route above was replayed once more from the task's real start into its own session (folders
named r3-<walk> under /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T64B), and every session was ended:

- Success path by pointer, then Shortest path (r3-pointer-sp, 20 steps): matched to the end;
  r3-pointer-sp/21.png shows Old Bridge, Heron Marsh, Lake Inlet, Total km 5.3, Weight km (farther).
- Success path with Enter, Tab and Escape in every field it opens (r3-success, 37 steps): matched.
- Table header Role > Weight, then Shortest path again (r3-detour-table-role, 14 steps;
  r3-detour-table-role-rerun, 7 steps): matched; r3-detour-table-role/15.png is a new run with
  Weight km (farther), Total km 5.3 and the path by name.
- Analyze list for a weight (r3-detour-analyze-weight, 7 steps): matched.
- Style text, the Analyze list and the table header Role menu (r3-detour-style-table, 28 steps):
  matched, including the From dropped after Escape (r3-detour-style-table/27.png).
- The inspector and the canvas menu (r3-detour-inspector, 7 steps): matched.
- Keyboard only (r3-keyboard, 128 steps): every step matched; the last screen-reader read differs
  only in the run's time stamp. Reached the end.

The findings above stand unchanged.

## Not walked

The other routes in this re-pilot's list belong to other tasks and their own pilots: the T65 A and
T65 B success paths and detour, the T68 A and T68 B starts, the T65 selection inspector, and the
T64 A table header detour (T64 A uses pantries.csv, not this task's data).
