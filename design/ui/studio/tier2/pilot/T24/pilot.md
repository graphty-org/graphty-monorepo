# Pilot: T24, one tie on the drawing

Build: graphty@0.8.55, build ca8b3b916c22, worktree commit 6eba30d4e (with uncommitted changes).
Both datasets reached the success state on the answer key's path, with the answer key's points.

## A (running club, friends.csv)

Setup `friends-names.txt`; every name drawn. The setup ends with the Everything inspector open
(its last Escape does not close it).

1. `--click-at 755,586` -- the tool prints `edge with id "13"`. The inspector reads "Gus -> Ivan",
   Edge, From Gus, To Ivan, weight 1; the line is drawn dark olive; Selection 1 (`A/02.png`).
2. `--click "Edge actions"` -- menu: "Select endpoints", "Frame selection" (disabled, "Select a
   node first"), "Add note" (`A/03.png`).
3. `--click "Select endpoints"` -- header "2 nodes, 0 edges", Selection 2, Summary Nodes 2, Edges
   among them 1; Gus and Ivan ringed in yellow, nothing else (`A/04.png`).

Answer: 1 run; Gus and Ivan selected. S.

## B (bus stops, bus-stops.csv)

Setup `bus-stops-names.txt`; every stop's name drawn; Everything inspector open (`B/01.png`).

1. `--key Escape` -- nothing changes: the Everything inspector stays open (`B/02.png`). The step is
   harmless but does not do what the answer key says.
2. `--click-at 750,172` -- `edge with id "15"`. Inspector "Station -> Stadium", From Station, To
   Stadium, minutes 4, then the raw rows "from Station" and "to Stadium"; line drawn dark
   (`B/03.png`).
3. `--click "Edge actions"` (`B/04.png`), `--click "Select endpoints"` -- "2 nodes, 0 edges",
   Station and Stadium ringed (`B/05.png`).

Answer: 4 minutes; Station and Stadium selected. S.

Other route checked: typing "Stadium" in the find box lists its three links ("School -- Stadium",
"Stadium -- Harbor", "Station -- Stadium") under Elements (`B/07.png`). The find box's accessible
name is "Find"; its placeholder "Find nodes, edges, values" is not a name the tool resolves
(`B/06.png`, a miss on the pilot's side, not the app's).

## Notes for graders and the answer key

- **Answer key:** B's first step, `--key Escape`, does not close the Everything inspector on this
  build (the setups' own final Escape does not either). Drop the step or reword it as optional;
  the line click works without it.
- **Possible confusion to record:** after Select endpoints the header says "2 nodes, 0 edges" while
  the Summary below says "Edges among them 1". A participant asked "and nobody else" may read the
  0 or the 1 as a sign something else is selected. Record any who hesitate.
- **Possible confusion to record:** the inspector title uses "->" (the file's direction) and the
  find results use "--" for the same link.
- **Minor app note:** with an edge selected, "Frame selection" is disabled with "Select a node
  first", although an edge is the selection. Not on the success path.
- Known on this build, as the key says: bus-stops.csv shows the raw "from"/"to" rows under From
  and To; friends.csv (source/target) does not.

No blockers: no script errors, console errors or failed requests were printed on any step.

## Re-walk, 2026-10-07 (after the tier 2 fixes)

Walked again with `tool/real.mjs` on a frozen copy of the served build (graphty 0.8.55 at commit 4c8d9eb2a plus the uncommitted fixes then in the worktree), both datasets,
from the same setups. Screenshots and the printed steps are in `rewalk/A/` and `rewalk/B/`
(`steps.log`); `../rewalk.sh T24A T24B` repeats it. No step printed a script error, a console
error, a failed request or "the drawing is still moving".

**Result: reached on both datasets**: A "Gus -> Ivan", weight 1, then Select endpoints rings Gus
and Ivan (`rewalk/A/02.png` to `04.png`); B "Station -> Stadium", minutes 4, then Station and
Stadium ringed (`rewalk/B/02.png` to `04.png`). The pilot's click points still hit the same lines
(`edge with id "13"`, `"15"`).

| Earlier observation | Now |
|---|---|
| "2 nodes, 0 edges" beside "Edges among them 1" | Header "2 nodes selected"; Summary Nodes 2, "Edges joining these nodes 1" (`rewalk/A/04.png`) |
| Frame selection disabled with an edge selected | Enabled in the edge's menu, with its F shortcut (`rewalk/A/03.png`) |
| Find results wrote "--" where the inspector wrote "->" | "School -> Stadium", "Stadium -> Harbor", "Station -> Stadium" (`rewalk/B/05.png`) |
| The selected line was drawn dark | A gold band (`rewalk/A/02.png`) |
| The tool missed the find box by its placeholder | `--click "Find nodes, edges, values"` works (`rewalk/B/05.png`) |

The answer key's "2 nodes, 0 edges" wording is out of date: the header reads "2 nodes selected".

## Second re-walk, 2026-10-07 (after the second round of fixes)

Walked again the same way on a frozen copy of the rebuilt app (graphty 0.8.55, build 75cbc3a9a0e9),
`../rewalk.sh T24A T24B` with `HERE` pointing at `rewalk-2/`. Screenshots are in `rewalk-2/T24A/`
and `rewalk-2/T24B/`, the printed steps in `rewalk-2/T24A.log` and `rewalk-2/T24B.log`. No step
printed a script error, a console error, a failed request or "the drawing is still moving".

**Result: reached on both datasets, unchanged from the first re-walk.** A: the click lands on
`edge with id "13"`, the inspector reads "Gus -> Ivan", weight 1, the line is a gold band; Select
endpoints gives "2 nodes selected", Nodes 2, "Edges joining these nodes 1", Gus and Ivan ringed and
nothing else (`02.png`, `04.png`). B: `edge with id "15"`, "Station -> Stadium", minutes 4 (the raw
"from"/"to" rows still follow); Select endpoints rings Station and Stadium only (`02.png`,
`04.png`). Typing "Stadium" in the find box lists the node and its three links, "School -> Stadium",
"Stadium -> Harbor", "Station -> Stadium" (`05.png`).
