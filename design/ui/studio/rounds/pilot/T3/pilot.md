# Pilot: T3, "Your own list of ties"

Build under study: commit a1e6b91ff, build 0196d46212aa graphty@0.8.53, opened at `/?next`, empty
start. Screenshots in this folder; a second route was tried in
`design/ui/studio/tmp/pilot-T3-newfromdata/` and `design/ui/studio/tmp/pilot-T3-newfromdata-2/`.

## Verdict

The end state is reached, but not by the answer key's path. "Open project or file..." loads a CSV
straight onto the canvas with no import page and no Load button. The import page with counts and a
Load button exists only behind "New from data...", and on that route Load leaves the canvas empty.

## The walk

| Step | Command                                        | Screenshot | What happened                                                                                                                                                                                                  |
| ---- | ---------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | `--start ... empty`                            | 01.png     | The start screen: Open project or file..., New from data..., samples, and the usage-data consent card.                                                                                                         |
| 2    | `--click "Open project or file..."`            | 02.png     | A file chooser opens.                                                                                                                                                                                          |
| 3    | `--upload friends.csv`                         | 03.png     | The graph is drawn at once (20 spheres, arrows). Values > Overview: Nodes 20, Edges 41, Direction Directed, Components 1. No import page appears.                                                              |
| 4    | `--click "Load"` (the answer key's third step) | 04.png     | `nothing on screen is called "Load"`.                                                                                                                                                                          |
| 5    | `--click "Data"`                               | 05.png     | Data > Sources: `friends.csv 20 nodes, 41 edges`; `Node ... 20 rows, 20 nodes`; `Edge t... 41 rows, 41 edges`. This is the only place on this route that shows nothing was dropped (41 rows in, 41 edges out). |
| 6    | `--hover "Edge t"`                             | 06.png     | `tooltip: null`: the truncated source names have no tooltip.                                                                                                                                                   |

No script errors, console errors or failed requests were printed at any step.

The file itself: 41 data rows, 20 distinct names, so 20 nodes and 41 edges is correct.

## The other route: "New from data..."

`--click "New from data..."`, `--click "choose a file..." --upload friends.csv`, `--click "Load"`.

- The import page (tmp/pilot-T3-newfromdata/03.png) is what the answer key describes: it proposes
  "Each row is an edge", source and target as node, weight as a whole number, and states "0 node
  rows and 41 edge rows read; the load makes 20 nodes and 41 edges." That sentence is the clearest
  "nothing dropped" evidence anywhere in the app.
- After Load (04.png), the Overview reads 20 nodes, 41 edges, but the canvas is EMPTY. Waiting 8
  seconds (05.png), zooming out (06.png) and selecting Everything (07.png) change nothing; a click at
  the canvas center reports `empty canvas`. Reproduced in a fresh session
  (tmp/pilot-T3-newfromdata-2/04.png, 05.png). No console errors were printed.

## Blockers

1. **App defect, possibly graphty-element: the import page's Load draws nothing.** After "New from
   data..." > choose friends.csv > Load, the data is in the graph (Overview 20 / 41) but the canvas
   stays empty, silently. Evidence: tmp/pilot-T3-newfromdata/04.png to 07.png,
   tmp/pilot-T3-newfromdata-2/04.png and the `empty canvas` probe at 750,450. Not isolated to the app
   or the element; whoever fixes it should check whether the element's render is ever triggered for
   a graph built through the import page.
2. **Wrong answer key: the success path does not match the build.** The key says Open project or
   file... > upload > Load, with counts read on the import page. In this build that route has no
   import page and no Load (04.png). The 3-step path is really 2 steps, and the counts are read from
   the Overview (03.png) or Data > Sources (05.png). The import page with counts is behind "New from
   data...", which is the broken route above. The "Partial: SD if the counts were read only after
   loading" rule cannot be applied on the Open route, since there is nothing to read before loading.
3. **App defect (minor): truncated source names on the Data page have no tooltip.** "Node ..." and
   "Edge t..." (05.png); hovering gives `tooltip: null` (06.png). A participant checking "nothing
   was dropped" has to guess which line is the links table.
4. **Task wording (minor):** "how many ties ... nothing was dropped" -- on the Open route the screen
   never says "dropped" or "rows read" unless the participant opens Data. A participant who reads
   20 / 41 off the Overview cannot confirm nothing was dropped without knowing the file has 41
   rows. Decide whether stating 41 from the Overview alone counts as success (the key currently says
   yes).
5. **Observation, not a blocker:** a list of who knows whom loads as Directed, with arrows. A
   participant may remark on it; it does not affect the counts.

No study-tool defects were found: every step printed what it should, the chooser was answered and
the sessions ended cleanly. (A miss such as `--click "Load"` exits 0 rather than 1; the README only
promises exit 1 for script errors, so this is consistent.)
