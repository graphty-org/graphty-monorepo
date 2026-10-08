# Pilot: T20 A (bus stops), the load-time route

Build: graphty@0.8.55 (build ca8b3b916c22), commit 6eba30d4e with uncommitted changes, `/?next`,
1440 x 900. Start: empty. Walked the success path from `answers.md` exactly; no step missed and
the tool reported no script error, console error or failed request.

**Reached: yes.** The run's Values read Route "5 nodes, 4 edges", Total distance "14", Nodes in
order Depot 1, Market 2, Park 3, Clinic 4, Harbor 5, and Made with "Weight: minutes (farther)"
(`15.png`). The graph's Overview reads "Loaded weight minutes (farther)" from the moment the file
loads (`08.png`). Both match the answer key.

## Steps

| # | Step | What the screen showed |
|---|---|---|
| 01 | start empty | Start screen with the usage-data card. |
| 02 | `--click "No thanks"` | Card gone. |
| 03 | `--click "New from data..."` | "Open as a new graph", "choose a file...", Load disabled. |
| 04 | `--click "choose a file..." --upload bus-stops.csv` | Edges table, 17 rows; "Weight: none (each edge counts 1)"; minutes column role "Attribute". |
| 05 | `--click-at 728,205` | Role list: From -> node, To -> node, Weight, Time, Edge id, Attribute. |
| 06 | `--click "Weight"` | "Weight: minutes"; "Higher means Closer / Farther / Capacity" with none visibly picked; hint "paths ignore it; PageRank and communities read it as larger = closer". |
| 07 | `--click "Farther"` | Farther selected; hint "smaller = closer". |
| 08 | `--click "Load"` | 10 nodes, 17 edges, Directed; Overview "Loaded weight minutes (farther)". No node names drawn. |
| 09 | `--key p` | Shortest path popover; Weight preset to "minutes (farther, loaded)". |
| 10-11 | `--type Depot`, `--click "Depot"` | From = Depot. |
| 12-13 | `--click "To" --type Harbor`, `--click "Harbor"` | To = Harbor. |
| 14 | `--click "Find path"` | Route drawn in orange; inspector opens on the run's **Style** tab; tree row "Shortest path 27"; legend "Shortest route (edges) 24". |
| 15 | `--click "Values"` | The answer (above). |

## Findings

1. **Answer key: two wrong numbers sit beside the route and are not listed for T20.** After Find
   path the tree row reads "Shortest path 27" and the legend reads "Shortest route (edges) 24"
   (`14.png`), and the inspector opens on Style, not Values, so neither 14 nor the stop order is
   on screen until the participant opens Values. A participant who reports 27 or 24 minutes has
   misread one of these. T18's key notes the same two readouts ("61", "24"); T20's key should list
   27 and 24 as `read-wrong` too.
2. **Answer key: the "Time" role is an untested trap.** The minutes column's role list offers
   "Time" next to "Weight" (`05.png`). A participant told the column holds minutes may pick it.
   The key does not say what Time does to the path (likely `weight-not-read`). Not walked here.
3. **App (minor): no "Higher means" choice looks selected before one is picked** (`06.png`), and
   the hint under it ("paths ignore it ...") is very small, low-contrast text. A participant who
   picks Weight and goes straight to Load gets a weight that paths ignore. That is the intended
   trap of this task, so it is a watch item, not a blocker.
4. **Watch:** the file is drawn Directed (`08.png`), and no stop names are drawn, so the route
   cannot be read off the drawing without the Values or names put on.

## Not walked

Dataset B (trails.csv) and the per-run route from "Open project or file...".

## Re-walk, 2026-10-07 (after the tier 2 fixes)

Walked again with `tool/real.mjs` on a frozen copy of the served build (graphty 0.8.55 at commit 75cbc3a9a plus the tree-row checkbox fix for A; graphty 0.8.55 at commit 4c8d9eb2a plus the uncommitted fixes then in the worktree for B), both datasets,
from the same setups. Screenshots and the printed steps are in `rewalk/A/` and `rewalk/B/`
(`steps.log`); `../rewalk.sh T20A T20B` repeats it. No step printed a script error, a console
error, a failed request or "the drawing is still moving".

**Result: reached on both datasets**: A Total distance 14, Depot, Market, Park, Clinic, Harbor, Made
with "Weight: minutes (farther)" (`rewalk/A/15.png`); B Total distance 7.5, Trailhead, Creek,
Meadow, Ridge, Summit, "Weight: km (farther)" (`rewalk/B/15.png`). B had not been walked before;
the km column's role box sits at the same point as A's (728,205).

| Earlier observation | Now |
|---|---|
| The hint under "Higher means" was very small, low-contrast text | It is drawn at the fields' description size in the secondary ink: "paths ignore it; PageRank and communities read it as larger = closer" (`rewalk/A/06.png`), "smaller = closer" once Farther is picked (`rewalk/A/07.png`) |

Still so: no "Higher means" choice looks picked before one is chosen; the tree row reads "Shortest
path 27" (A) and "22" (B), the legend 24.
