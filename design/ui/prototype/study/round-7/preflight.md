# Round 7 preflight: the refined B skeleton

Run on 2026-10-02, attempt 1, against the clickable skeleton in `app-b/` and the round 7 plan
(58 think-aloud tasks, 280 sessions, 16 tree tasks, 14 first-click prompts, 4 focus groups).
Every check was run afresh. Commands were run from `design/ui/prototype/`.

**Verdict: FAIL.** Checks 1 to 5, 9 and 10 pass. Checks 6, 7 and 8 fail. Nothing in the
skeleton is broken: every route renders, and every render is fresh. What fails is the study
material. Several prompts carry a word printed on their own target, two tasks start on a
screen that already shows the answer, no task starts before a very wide or nested file has
been read, path notes are never tested, and one task depends on a decided change that is not
drawn and is not flagged.

| # | Check | Result |
|---|---|---|
| 1 | Round folder is fresh | PASS |
| 2 | Every named route exists and renders in the participant view | PASS (155 of 155) |
| 3 | Task renders match the plan's routes and are newer than the skeleton | PASS (72 of 72 ids) |
| 4 | The study tool's own check is sound | PASS |
| 5 | tree.md matches the navigation and holds only the outline | PASS (one wording note) |
| 6 | Answer keys stay away from participants | FAIL |
| 7 | Coverage | FAIL (two clauses) |
| 8 | Tasks that depend on decided changes the skeleton does not draw | FAIL (one task) |
| 9 | Every persona has a file | PASS |
| 10 | success_criteria carries the round's targets | PASS |

## What must change before sessions run

1. **Words on the target (check 6).** Each of these prompts uses a word that the skeleton
   prints on the control the prompt is testing. That cues the participant and inflates
   success. Each one can be reworded without the word:
   - "find" on a Find control: fc13 ("Find the column ..." where the correct first click is the
     Find attribute box, or the table's Columns, so "column" is a cue too); t23 ("find which
     host column ...", target Go to column / Find a column); t22 ("find the one that counts
     ...", target the Find attribute box, which is exactly the search-or-scroll behavior the
     task grades); t04-transactions ("Find it", where grading separates Find from the table
     and Select where); t03-transactions ("Get graphty to find them", Analyze heading Find
     groups); t12-doorentries ("Find the fewest steps", the Find paths heading and the path
     popover's Find button).
   - "file" on a file command: tree04 and t15 (Apply recipe or style file...); tree13 and t13
     (Replace with file...); t14 and t28-lesmis (Open project or file...; t28-lesmis also says
     "Open it"). Inside the project-name menu and a source's menu, "file" appears on only one
     item, so it singles out the answer.
   - Other words: t34 "Find out why" (target Why this look); t38 "rename the next group" (row
     menu Rename); t21-wide "the host's own name" (hostname, tagged Name at the top of the
     list); t25 "keep ... together as one piece" (Keep as one value, One value); t12-transactions
     "following the direction" (the popover's Direction control); t18 "could not be matched"
     (Match report, unmatched rows); t12 "shortest chain" (the Shortest paths row and the
     Analyze entry Shortest path, a credited route). Minor: t20 and t20-transactions say
     "should count as more tightly tied", and the weight column they must choose is named count.
2. **Start screens that already show the answer (check 6).**
   - t01-transactions: 01.png (graph-place/transfers-loaded) already shows the graph's
     inspector, Data tab, with 3,000 nodes, 9,113 edges, Directed, Weak components 1 and
     Density. That is every number the task asks for. The task measures reading, not finding.
     Either start on a screen where something is selected, or regrade it as a reading task.
   - t09: 01.png (graph-place/nested-set) and 02.png show the kept set's Style tab with a
     label line "Above: # a...last_5_years". That is the target field, on screen before the
     participant looks for it. Together with the scenario's "cited in the last five years",
     the answer is given away.
3. **First-use moments for a wide and a nested file (check 7).** The check requires a first
   nested file and a first very wide file, each starting before the file is read. t24 starts
   at data-page/json-tree and t23 at data-page/wide-hosts. On both screens the file has
   already been read: the tables are proposed and the match report is filled in. The only
   moment before reading is first click fc10, which is nested only and is not a task. Nothing
   tests a wide file before it is read. The skeleton draws no wide or nested route before
   reading: the start screen, main-menu/open-file and data-place/no-sources all draw the Les
   Miserables project. Either the shell adds such a route, or the plan names this gap as not
   testable and the gate accepts it.
4. **Notes on paths are never tested (check 7).** The notes-targets key lists nodes, edges,
   groups and paths. t05 covers a node, t06 an edge and a group, t06-doorentries an edge. No
   task writes or reads a note about a path.
5. **t07 depends on an undrawn change and is not flagged (check 8).** The decided
   shared-formatter change names "3,000 to 812 nodes" as a string that the shared formatter
   should write. data-place/one-step and data-place/at-rest, t07's last two screens, still
   draw it. t07's success depends on reading counts, but only t07-wide is flagged for this
   string. The same at-rest render also shows a second filter step, "kind is not merchant",
   and a note bubble on the first step, neither made by the participant. Flag both in t07's
   grading notes.

## Hazards that do not fail a check

- Every participant-view render has a small "Review" button at the bottom left. Its accessible
  name is "Show design notes". Clicking it in a click-through (`--try ... --click "Review"`) turns
  design notes back on: the inspector then shows "needs graphty-element" chips. No review bar or
  state name appears, so check 6 passes on the renders. The facilitator and every simulated
  participant must still be told never to press it. The better fix is for the shell to leave
  it out of the participant view.
- In tree.md, a row's right-click menu lists "Compare with another row...". On a grouping (a
  run row) the skeleton labels the same command "Compare with another run...". Tree task 10's
  answer cites that menu. The tree's union menu still represents it fairly. Record the
  difference when scoring.
- t22 and fc13 use the hosts' attribute list, where a decided change ("In use (6)", a computed
  group, then by name) is only partly drawn: the list shows "In use (2)" or "In use (4)" and has
  no computed group. The search they test is drawn, so they are not excluded. Synthesis should
  know about the gap.
- t09's color picker shows nested fields as folders (attributes > profile > ...). A decided
  change replaces folders with full stored names. That change is drawn on neither
  data-place/attributes-nested nor this picker. t09 already fails above. When it is reworded,
  also flag this.

## Check 1: the round folder is fresh

Command: `ls -la study/round-7/` and `ls study/round-7 | grep -E "^(sessions|tree-test|first-click|focus-groups)$"`
(grep exit 1: no match).

```
total 44
drwxrwxr-x  2 apowers apowers  4096 Oct  2 03:38 .
drwxrwxr-x 13 apowers apowers  4096 Sep 29 18:43 ..
-rw-rw-r--  1 apowers apowers  5570 Sep 29 14:10 gate.md
-rw-rw-r--  1 apowers apowers  7321 Oct  2 04:01 preflight.md (this file, listed while it was being written; it replaced the earlier 8,312-byte preflight of Sep 29)
-rw-rw-r--  1 apowers apowers  6643 Oct  2 03:36 tree.md
-rw-rw-r--  1 apowers apowers 11968 Oct  2 03:38 tree-test.md
```

PASS. None of sessions/, tree-test/, first-click/ or focus-groups/ exists. The expected
tree.md, tree-test.md, gate.md and preflight.md are present. gate.md and the old preflight.md
describe an earlier gallery-based plan, as the plan says. This file replaces that preflight.md.

## Check 2: every named route exists and renders

Command: `timeout 600 node app-b/study.mjs --check <the 155 routes of the plan>` (one batch; the
route list is in `tmp/preflight-r7/routes.txt`). Exit code: 0.

```
ok   app-b/#/graph-place/at-rest (lesmis)
ok   app-b/#/inspector-nothing-selected/overview (lesmis)
ok   app-b/#/context-menus/graph (lesmis)
ok   app-b/#/inspector-nothing-selected/computed (lesmis)
ok   app-b/#/graph-place/transfers-loaded (transactions)
ok   app-b/#/inspector-nothing-selected/transfers (transactions)
ok   app-b/#/graph-place/louvain-open (lesmis)
ok   app-b/#/inspector-measure-row/data (lesmis)
ok   app-b/#/analyze-popover/transfers (transactions)
ok   app-b/#/analyze-popover/link-counts (transactions)
ok   app-b/#/graph-place/transfers-running (transactions)
ok   app-b/#/inspector-run-row/data (lesmis)
ok   app-b/#/inspector-group-set-path-row/community-3 (lesmis)
ok   app-b/#/inspector-run-row/settings-changed (lesmis)
ok   app-b/#/graph-place/many-groups (transactions)
ok   app-b/#/graph-place/find (lesmis)
ok   app-b/#/inspector-node/why-this-look (lesmis)
ok   app-b/#/inspector-node/data (lesmis)
ok   app-b/#/selection-bar/neighborhood (lesmis)
ok   app-b/#/selection-bar/filtered-to-neighbors (lesmis)
ok   app-b/#/inspector-node/transfers-node (transactions)
ok   app-b/#/selection-bar/neighborhood-directed (transactions)
ok   app-b/#/notes-place/writing (lesmis)
ok   app-b/#/notes-place/all (lesmis)
ok   app-b/#/inspector-edge/data (lesmis)
ok   app-b/#/notes-place/edge-note (lesmis)
ok   app-b/#/notes-place/earlier-group (lesmis)
ok   app-b/#/graph-place/door-entries (doorEntries)
ok   app-b/#/inspector-edge/door-pair (doorEntries)
ok   app-b/#/notes-place/door-entries (doorEntries)
ok   app-b/#/data-place/empty-filters (transactions)
ok   app-b/#/data-place/new-step (transactions)
ok   app-b/#/data-place/one-step (transactions)
ok   app-b/#/data-place/at-rest (transactions)
ok   app-b/#/graph-place/wide (wide)
ok   app-b/#/data-place/attributes-wide (wide)
ok   app-b/#/data-place/wide-filters (wide)
ok   app-b/#/data-place/wide-computed (wide)
ok   app-b/#/inspector-nothing-selected/canvas (lesmis)
ok   app-b/#/inspector-nothing-selected/layout-method (lesmis)
ok   app-b/#/toolbar/layout-paused (lesmis)
ok   app-b/#/inspector-nothing-selected/transfers-methods (transactions)
ok   app-b/#/graph-place/nested-set (nested)
ok   app-b/#/style-pickers/nested-color-by (nested)
ok   app-b/#/style-pickers/wide-color-by (wide)
ok   app-b/#/style-pickers/wide-search (wide)
ok   app-b/#/inspector-measure-row/painted-color (wide)
ok   app-b/#/inspector-several-rows/style (lesmis)
ok   app-b/#/inspector-several-rows/result-intersect (lesmis)
ok   app-b/#/select-where/where (transactions)
ok   app-b/#/select-where/selected (transactions)
ok   app-b/#/graphs-switcher/many (transactions)
ok   app-b/#/full-canvas-modes/comparison (transactions)
ok   app-b/#/full-canvas-modes/group (transactions)
ok   app-b/#/full-canvas-modes/kept (transactions)
ok   app-b/#/inspector-several-elements/two-nodes (lesmis)
ok   app-b/#/path-popover/from-selection (lesmis)
ok   app-b/#/path-popover/found (lesmis)
ok   app-b/#/inspector-group-set-path-row/path-lesmis (lesmis)
ok   app-b/#/graph-place/door-entries-path (doorEntries)
ok   app-b/#/inspector-group-set-path-row/path-door-entries (doorEntries)
ok   app-b/#/path-popover/transfers-directed (transactions)
ok   app-b/#/path-popover/found-tied (transactions)
ok   app-b/#/inspector-group-set-path-row/path (transactions)
ok   app-b/#/table-dock/path-members (transactions)
ok   app-b/#/context-menus/source (transactions)
ok   app-b/#/data-page/replace (transactions)
ok   app-b/#/data-place/after-replace (transactions)
ok   app-b/#/inspector-run-row/data-changed (transactions)
ok   app-b/#/start-screen/returning (lesmis)
ok   app-b/#/data-page/graph-file (lesmis)
ok   app-b/#/canvas-and-states/loading (lesmis)
ok   app-b/#/data-page/edge-list (transactions)
ok   app-b/#/data-page/transfers (transactions)
ok   app-b/#/canvas-and-states/transfers-loading (transactions)
ok   app-b/#/recipe-apply/binding (transactions)
ok   app-b/#/recipe-apply/applied (transactions)
ok   app-b/#/recipe-apply/wide-mismatch (wide)
ok   app-b/#/project-menu/open (lesmis)
ok   app-b/#/export-dialog/image (lesmis)
ok   app-b/#/export-image/image (lesmis)
ok   app-b/#/table-dock/table-options (lesmis)
ok   app-b/#/export-dialog/data (lesmis)
ok   app-b/#/export-dialog/recent-exports (transactions)
ok   app-b/#/data-page/people (doorEntries)
ok   app-b/#/data-page/entries (doorEntries)
ok   app-b/#/data-page/unmatched-rows (doorEntries)
ok   app-b/#/canvas-and-states/door-entries-loading (doorEntries)
ok   app-b/#/data-page/kind-as-type (transactions)
ok   app-b/#/data-page/edit-entries (doorEntries)
ok   app-b/#/data-page/entries-pair (doorEntries)
ok   app-b/#/data-page/entries-as-nodes (doorEntries)
ok   app-b/#/inspector-nothing-selected/door-entries-as-nodes (doorEntries)
ok   app-b/#/data-page/buildings (doorEntries)
ok   app-b/#/inspector-nothing-selected/door-entries (doorEntries)
ok   app-b/#/inspector-attribute-and-filter-step/edge-weight (doorEntries)
ok   app-b/#/data-page/weight-moved (transactions)
ok   app-b/#/inspector-group-set-path-row/style (lesmis)
ok   app-b/#/inspector-group-set-path-row/label-empty (lesmis)
ok   app-b/#/style-pickers/label-new-line (lesmis)
ok   app-b/#/inspector-group-set-path-row/label-two (lesmis)
ok   app-b/#/inspector-selection-and-everything/notes-row-label (lesmis)
ok   app-b/#/style-pickers/wide-label (wide)
ok   app-b/#/style-pickers/wide-bind (wide)
ok   app-b/#/data-place/attributes-wide-search (wide)
ok   app-b/#/context-menus/attribute (wide)
ok   app-b/#/graph-place/wide-sized (wide)
ok   app-b/#/data-page/wide-hosts (wide)
ok   app-b/#/data-page/wide-find-column (wide)
ok   app-b/#/data-page/wide-link-menu (wide)
ok   app-b/#/data-page/json-tree (nested)
ok   app-b/#/data-page/json-researchers (nested)
ok   app-b/#/data-page/json-array-menu (nested)
ok   app-b/#/data-page/json-any-type (nested)
ok   app-b/#/data-page/json-report (nested)
ok   app-b/#/graph-place/nested (nested)
ok   app-b/#/data-page/edit-json-researchers (nested)
ok   app-b/#/data-page/json-keep-value (nested)
ok   app-b/#/data-page/json-affiliations (nested)
ok   app-b/#/inspector-node/nested-data (nested)
ok   app-b/#/data-page/json-plain (plainJson)
ok   app-b/#/graph-place/plain-json (plainJson)
ok   app-b/#/inspector-node/plain-data (plainJson)
ok   app-b/#/start-screen/first-run (lesmis)
ok   app-b/#/start-screen/disclosure (lesmis)
ok   app-b/#/start-screen/declined (lesmis)
ok   app-b/#/settings/privacy (lesmis)
ok   app-b/#/data-page/refused-parse (transactions)
ok   app-b/#/data-page/refused-too-large (doorEntries)
ok   app-b/#/data-page/refused-ids (lesmis)
ok   app-b/#/data-page/json-invalid (nested)
ok   app-b/#/graph-place/empty (lesmis)
ok   app-b/#/canvas-and-states/empty (lesmis)
ok   app-b/#/data-place/no-sources (lesmis)
ok   app-b/#/views-place/empty (lesmis)
ok   app-b/#/views-place/saving (lesmis)
ok   app-b/#/views-place/at-rest (lesmis)
ok   app-b/#/present-mode/first-view (lesmis)
ok   app-b/#/present-mode/presenting (lesmis)
ok   app-b/#/assistant-place/no-provider (lesmis)
ok   app-b/#/settings/assistant (lesmis)
ok   app-b/#/settings/performance-gpu-unavailable (lesmis)
ok   app-b/#/inspector-run-row/failed (transactions)
ok   app-b/#/graph-place/show-hidden (lesmis)
ok   app-b/#/inspector-measure-row/covered (lesmis)
ok   app-b/#/canvas-and-states/drawn (lesmis)
ok   app-b/#/canvas-and-states/walked (lesmis)
ok   app-b/#/full-canvas-modes/version-history (transactions)
ok   app-b/#/full-canvas-modes/past-version (transactions)
ok   app-b/#/graph-place/solo (lesmis)
ok   app-b/#/selection-bar/hidden (lesmis)
ok   app-b/#/graph-place/rename (lesmis)
ok   app-b/#/graph-place/rename-chain (lesmis)
ok   app-b/#/toolbar/legend-off (lesmis)
ok   app-b/#/analyze-popover/open (lesmis)
0 of 155 routes failed
EXIT 0
```

PASS: 0 of 155 routes failed. --check fails a route on any stub, render failure, script
error, 404 or visible review bar.

## Check 3: task renders match the plan and are fresh

Command 1: `timeout 120 node app-b/study.mjs --fresh t01 ... fc14` (all 72 ids). Exit code: 0.

```
0 problems on 228 renders
EXIT 0
```

Command 2: `node tmp/preflight-r7/cmp.mjs`. This compares each id's `shots/tasks/<id>/routes.json`
with the plan's routes, in order. It also checks that the PNGs are exactly 01.png to NN.png,
that every persona has a file, and that each task's datasets list matches the datasets its
routes draw, using the dataset column of `--list`. Exit code: 1, for the reason explained
below.

```
ok   t01: routes.json matches; pngs 01.png,02.png,03.png,04.png; datasets drawn lesmis vs plan lesmis
ok   t01-transactions: routes.json matches; pngs 01.png,02.png; datasets drawn transactions vs plan transactions
ok   t02: routes.json matches; pngs 01.png,02.png,03.png; datasets drawn lesmis vs plan lesmis
ok   t02-transactions: routes.json matches; pngs 01.png,02.png,03.png,04.png; datasets drawn transactions vs plan transactions
ok   t03: routes.json matches; pngs 01.png,02.png,03.png,04.png,05.png; datasets drawn lesmis vs plan lesmis
ok   t03-transactions: routes.json matches; pngs 01.png,02.png,03.png; datasets drawn transactions vs plan transactions
ok   t04: routes.json matches; pngs 01.png,02.png,03.png,04.png,05.png,06.png; datasets drawn lesmis vs plan lesmis
ok   t04-transactions: routes.json matches; pngs 01.png,02.png,03.png; datasets drawn transactions vs plan transactions
ok   t05: routes.json matches; pngs 01.png,02.png,03.png,04.png; datasets drawn lesmis vs plan lesmis
ok   t06: routes.json matches; pngs 01.png,02.png,03.png,04.png,05.png; datasets drawn lesmis vs plan lesmis
ok   t06-doorentries: routes.json matches; pngs 01.png,02.png,03.png; datasets drawn doorEntries vs plan doorEntries
ok   t07: routes.json matches; pngs 01.png,02.png,03.png,04.png,05.png; datasets drawn transactions vs plan transactions
ok   t07-wide: routes.json matches; pngs 01.png,02.png,03.png,04.png; datasets drawn wide vs plan wide
ok   t08: routes.json matches; pngs 01.png,02.png,03.png,04.png; datasets drawn lesmis vs plan lesmis
ok   t08-transactions: routes.json matches; pngs 01.png,02.png; datasets drawn transactions vs plan transactions
ok   t09: routes.json matches; pngs 01.png,02.png; datasets drawn nested vs plan nested
ok   t09-wide: routes.json matches; pngs 01.png,02.png,03.png,04.png; datasets drawn wide vs plan wide
ok   t10: routes.json matches; pngs 01.png,02.png,03.png; datasets drawn lesmis vs plan lesmis
ok   t10-transactions: routes.json matches; pngs 01.png,02.png,03.png; datasets drawn transactions vs plan transactions
ok   t11: routes.json matches; pngs 01.png,02.png,03.png,04.png,05.png; datasets drawn transactions vs plan transactions
ok   t12: routes.json matches; pngs 01.png,02.png,03.png,04.png,05.png; datasets drawn lesmis vs plan lesmis
ok   t12-doorentries: routes.json matches; pngs 01.png,02.png,03.png; datasets drawn doorEntries vs plan doorEntries
ok   t12-transactions: routes.json matches; pngs 01.png,02.png,03.png,04.png,05.png; datasets drawn transactions vs plan transactions
FAIL t13: routes.json matches; pngs 01.png,02.png,03.png,04.png,05.png,06.png; datasets drawn lesmis,transactions vs plan transactions
ok   t14: routes.json matches; pngs 01.png,02.png,03.png,04.png; datasets drawn lesmis vs plan lesmis
ok   t14-transactions: routes.json matches; pngs 01.png,02.png,03.png,04.png; datasets drawn transactions vs plan transactions
ok   t15: routes.json matches; pngs 01.png,02.png,03.png; datasets drawn transactions vs plan transactions
ok   t15-wide: routes.json matches; pngs 01.png,02.png; datasets drawn wide vs plan wide
ok   t16: routes.json matches; pngs 01.png,02.png,03.png,04.png; datasets drawn lesmis vs plan lesmis
ok   t17: routes.json matches; pngs 01.png,02.png,03.png; datasets drawn lesmis vs plan lesmis
ok   t17-transactions: routes.json matches; pngs 01.png,02.png; datasets drawn transactions vs plan transactions
ok   t18: routes.json matches; pngs 01.png,02.png,03.png,04.png,05.png; datasets drawn doorEntries vs plan doorEntries
ok   t18-transactions: routes.json matches; pngs 01.png,02.png,03.png,04.png; datasets drawn transactions vs plan transactions
ok   t19: routes.json matches; pngs 01.png,02.png,03.png,04.png,05.png; datasets drawn doorEntries vs plan doorEntries
ok   t20: routes.json matches; pngs 01.png,02.png,03.png,04.png,05.png; datasets drawn doorEntries vs plan doorEntries
ok   t20-transactions: routes.json matches; pngs 01.png,02.png,03.png; datasets drawn transactions vs plan transactions
ok   t21: routes.json matches; pngs 01.png,02.png,03.png,04.png,05.png,06.png; datasets drawn lesmis vs plan lesmis
ok   t21-wide: routes.json matches; pngs 01.png,02.png,03.png; datasets drawn wide vs plan wide
ok   t22: routes.json matches; pngs 01.png,02.png,03.png,04.png,05.png; datasets drawn wide vs plan wide
ok   t23: routes.json matches; pngs 01.png,02.png,03.png,04.png; datasets drawn wide vs plan wide
ok   t24: routes.json matches; pngs 01.png,02.png,03.png,04.png,05.png,06.png; datasets drawn nested vs plan nested
ok   t25: routes.json matches; pngs 01.png,02.png,03.png,04.png,05.png; datasets drawn nested vs plan nested
ok   t26: routes.json matches; pngs 01.png,02.png,03.png; datasets drawn plainJson vs plan plainJson
ok   t27: routes.json matches; pngs 01.png,02.png,03.png,04.png; datasets drawn lesmis vs plan lesmis
ok   t28: routes.json matches; pngs 01.png,02.png; datasets drawn transactions vs plan transactions
ok   t28-doorentries: routes.json matches; pngs 01.png,02.png; datasets drawn doorEntries vs plan doorEntries
ok   t28-lesmis: routes.json matches; pngs 01.png,02.png; datasets drawn lesmis vs plan lesmis
ok   t28-nested: routes.json matches; pngs 01.png,02.png; datasets drawn nested vs plan nested
ok   t29: routes.json matches; pngs 01.png,02.png,03.png,04.png; datasets drawn lesmis vs plan lesmis
ok   t30: routes.json matches; pngs 01.png,02.png,03.png,04.png,05.png; datasets drawn lesmis vs plan lesmis
ok   t31: routes.json matches; pngs 01.png,02.png,03.png; datasets drawn lesmis vs plan lesmis
ok   t32: routes.json matches; pngs 01.png,02.png; datasets drawn lesmis vs plan lesmis
FAIL t33: routes.json matches; pngs 01.png,02.png; datasets drawn lesmis,transactions vs plan transactions
ok   t34: routes.json matches; pngs 01.png,02.png,03.png,04.png; datasets drawn lesmis vs plan lesmis
ok   t35: routes.json matches; pngs 01.png,02.png,03.png; datasets drawn lesmis vs plan lesmis
ok   t36: routes.json matches; pngs 01.png,02.png,03.png; datasets drawn transactions vs plan transactions
ok   t37: routes.json matches; pngs 01.png,02.png,03.png,04.png; datasets drawn lesmis vs plan lesmis
ok   t38: routes.json matches; pngs 01.png,02.png,03.png; datasets drawn lesmis vs plan lesmis
ok   fc01: routes.json matches; pngs 01.png; datasets drawn lesmis
ok   fc02: routes.json matches; pngs 01.png; datasets drawn lesmis
ok   fc03: routes.json matches; pngs 01.png; datasets drawn lesmis
ok   fc04: routes.json matches; pngs 01.png; datasets drawn lesmis
ok   fc05: routes.json matches; pngs 01.png; datasets drawn lesmis
ok   fc06: routes.json matches; pngs 01.png; datasets drawn lesmis
ok   fc07: routes.json matches; pngs 01.png; datasets drawn lesmis
ok   fc08: routes.json matches; pngs 01.png; datasets drawn lesmis
ok   fc09: routes.json matches; pngs 01.png; datasets drawn transactions
ok   fc10: routes.json matches; pngs 01.png; datasets drawn lesmis
ok   fc11: routes.json matches; pngs 01.png; datasets drawn transactions
ok   fc12: routes.json matches; pngs 01.png; datasets drawn lesmis
ok   fc13: routes.json matches; pngs 01.png; datasets drawn wide
ok   fc14: routes.json matches; pngs 01.png; datasets drawn doorEntries
2 failing ids
```

The two FAIL lines come from the script, not from the plan. In the --list output, a right-hand
or overlay route reads "lesmis (or its left panel's)". The script read that as lesmis, but
such a route draws the dataset of the left panel it opens beside. In t13 that route is
inspector-run-row/data-changed, and in t33 it is inspector-run-row/failed. Both renders
(t13/06.png and t33/02.png) show "Transfers, March 2026": transactions, as the plan says.
`--task` also refuses to write routes.json unless every route draws one project.

PASS: all 72 routes.json files match the plan's routes exactly, every PNG name is a bare
number with no route in it, and the renders are newer than every file under app-b/.

## Check 4: the study tool's own check is sound

Command: `timeout 300 node app-b/study.mjs --prove`. Exit code: 0.

```
ok   a good route passes
ok   an unknown section fails: no section "no-such-section" (the manifest lists the sections; --list shows every route)
ok   an unknown state fails: section graph-place has no state "no-such-state" (its states: at-rest, empty, door-entries, louvain-open, many-groups, transfers-loaded, door-entries-path, door-entries-running, path-found, transfers-running, running, queued, finished, partial, failed, solo, everything-hidden, show-hidden, scope-mark, out-of-date, invalid-drop, find, list-menu, rename, rename-chain, rename-run-group, rename-builtin, rename-run-disabled, notes-eye-off, find-no-match, one-group, long-names, wide, wide-sized, nested, nested-set, plain-json, registry, painted)
ok   a stub fails: section prove-stub is a stub (no render)
EXIT 0
```

PASS: no FAIL line.

## Check 5: tree.md

Commands:
- `grep -niE "april|march|door|swipe|friday|tuesday|monday|go-between|colleague|angle|scores|correct|answer|score|task|app-b|#/|[a-z]+-[a-z]+/[a-z]" study/round-7/tree.md`
  exit 1 (no match): tree.md has no task text, answers, scoring, routes, section ids or
  examples from the tree prompts.
- `tmp/preflight-r7/labels.sh` looks up every outline label in the skeleton's source. 178 of
  206 labels were found verbatim. Every label not found is listed here:

```
MISSING A column header's menu
MISSING A grouping, opening to its groups
MISSING A row's right-click menu
MISSING A step's menu
MISSING A tab for a grouping's groups
MISSING Direction: As the file says | Directed | Undirected
MISSING Each column's role, under its name
MISSING Each file or address, with its menu
MISSING (each graph in the project)
MISSING Each row is: a node | an edge
MISSING Each step, with a checkbox to apply it
MISSING Every note, newest first
MISSING Folders you made
MISSING For a nested document: the document's outline, with a checkbox on each list of records
MISSING Header: name, kind, where it came from, and "..."
MISSING Members or Values
MISSING Nodes | Edges
MISSING One edge per: Row | Pair
MISSING Pause layout / Resume layout
MISSING Right-click on a node
MISSING Right-click on empty canvas
MISSING Rows added by Analyze, each with its eye
MISSING Sets you kept
MISSING Shortest paths, opening to each route found
MISSING Switch to 2D / Switch to 3D
MISSING The chosen table
MISSING The list of rows, top to bottom
MISSING (your recent projects)
MISSING Your saved views, in order, each with In tour
```

Every one of these is a descriptive placeholder ("The chosen table", "Sets you kept"), a pair
written with a slash or a bar, or a parenthetical, so a verbatim lookup cannot find it. Each
concrete control was looked up on its own and found: As the file says, Each row is, One edge
per, Pause layout, Resume layout, Switch to 2D, Switch to 3D, In tour, Members, Values, Top 10,
Painted by, Memberships, Go to column, Makes, Match report, Edge id, Subtype, Move to folder,
Time slider, Export table as CSV, Find in notes, Export tour video, Standard views, Enter VR,
Enter AR, Compare graphs, Version history, Measure the graph, Find paths and edge sets, Rank
nodes and edges, Find groups, Clear graph data, Compute the overview, Combine with selected
rows and Hide in list. Place by appears in lib.js and the specification (section 7, attribute
menu).

The menus were also rendered in the participant view and read against the outline:
main-menu/open, project-menu/open, context-menus/canvas, context-menus/node,
context-menus/run-row and context-menus/attribute (`node app-b/study.mjs --shoot ...`, PNGs
in shots/app-b/). The rail (Graph, Data, Views, Notes, Assistant), the header (main menu,
project name, Undo, Redo, Local only, Full graph), the five toolbar icons, the inspector's
Style and Data tabs, and the table dock all match.

PASS, with one wording note: a run row's menu says "Compare with another run...", while the
outline's union menu says "Compare with another row..." (see Hazards).

## Check 6: answer keys stay away from participants

Method: read every task scenario, tree prompt and first-click prompt against the labels on its
target. The labels were read from the renders and found by grep in the section files. Then
the first render (01.png) of every distinct starting route was viewed:
graph-place/at-rest, transfers-loaded, louvain-open, many-groups, door-entries, wide,
nested-set, nested, empty; data-page/people, entries, edge-list, transfers, wide-hosts,
json-tree, json-plain; data-place/at-rest; start-screen/returning and first-run;
views-place/empty; canvas-and-states/drawn. The first-click screens fc02, fc06, fc08, fc09
and fc13 were viewed as well.

- Participant view: no render shows a review bar, design notes, or a section or state name.
  PNG names are 01.png to NN.png. PASS on the renders, with the Review-button hazard above.
- Start states: FAIL for t01-transactions and t09 (see "What must change", item 2). Every other
  01.png viewed is a start state, not the answer.
- Words on the target: FAIL for the prompts listed in "What must change", item 1.
- Clean on reading: t01, t02, t02-transactions, t03, t04, t05, t06, t06-doorentries, t07,
  t07-wide, t08, t08-transactions, t09-wide, t10, t10-transactions, t11, t16, t17,
  t17-transactions, t19, t24, t26, t27, t28, t28-doorentries, t28-nested, t29, t30, t31, t32,
  t33, t35, t36, t37, t21; tree 1-3, 5-12, 14-16; fc01-fc12 and fc14. fc08 and fc09 avoid
  "total", "sum", "value" and "amount". fc11 and fc12 point at a rail or header first click,
  which carries no "file".

## Check 7: coverage

Command: `node tmp/preflight-r7/domains.mjs`. Each persona's domain comes from the opening of
its file: alert-reviewer and fraud-analyst financial crime; analyst-alex logistics operations;
bioinformatics-researcher and genomics-cytoscape-user biology research; cybersecurity-analyst
IT security; expert-emma network science; explorer-elena product management; gephi-holdout
social science; intelligence-analyst law enforcement intelligence; knowledge-engineer data
architecture; marketing-analyst marketing; ml-engineer-recsys e-commerce engineering;
recipe-recipient biology lab management; screen-reader-analyst public health;
supply-chain-analyst supply chain. Exit code: 0.

```
characterize   t01(7 domains) t01-transactions(5 domains)
rank           t02(5 domains) t02-transactions(5 domains)
communities    t03(5 domains) t03-transactions(5 domains)
find-explore   t04(5 domains) t04-transactions(3 domains)
note           t05(6 domains)
filter         t07(4 domains) t07-wide(5 domains)
layout         t08(6 domains) t08-transactions(4 domains)
color-size     t09(4 domains) t09-wide(5 domains)
sets           t10(5 domains) t10-transactions(4 domains)
compare        t11(6 domains)
path           t12(5 domains) t12-transactions(3 domains) t12-doorentries(4 domains)
reuse          t13(6 domains)
load           t14(5 domains) t14-transactions(4 domains) t26(4 domains)
recipe         t15(4 domains) t15-wide(4 domains)
export         t16(5 domains) t17(5 domains) t17-transactions(3 domains)
multi-table    t18(7 domains) t19(6 domains) t18-transactions(4 domains)
weight         t20(5 domains) t20-transactions(4 domains)
labels         t21(6 domains) t21-wide(4 domains)
notes-targets  t06(5 domains) t06-doorentries(4 domains)
wide-field     t22(7 domains) t23(6 domains)
nested-json    t24(6 domains) t25(5 domains)
tasks 58, sessions 280, 0 tasks with one domain
```

- Every key has at least one task, and every task has personas from three to seven domains.
- Every wide-field task (t22, t23) draws the wide dataset. Every nested-json task (t24, t25)
  draws the nested dataset. Every task's datasets list names exactly the datasets its routes
  draw (check 3).
- No task or first-click id names its answer (ids are t01 ... t38, fc01 ... fc14).
- FAIL: no first-use task starts before a nested or a very wide file is read ("What must
  change", item 3).
- FAIL: the notes-targets key is exercised for nodes, edges and groups, but not paths ("What
  must change", item 4).

## Check 8: decided changes the skeleton does not draw

Each decided change was read against the routes of every task, tree prompt and first-click
prompt:

- Exact or Sampled, the declined run, and the bridges wording in Analyze: no task uses
  analyze-popover/costly, declined, essentials or search. Excluded.
- Weighted degree in the catalog: fc08, fc09 and t02-transactions use analyze-popover/open and
  transfers, where Total value, Total amount in and Links in (count) are drawn.
- The bridges and degree filter steps: t07-wide uses data-place/wide-computed, where both are
  drawn; the "300 to 187 nodes" rows are flagged in its grading note.
- Attributes grouped by type, the wide list order, nested names by full stored path: no task
  uses data-place/attributes or attributes-nested. t22 and fc13 touch the partly drawn wide
  list (hazard above).
- A run painting as soon as it finishes, and the failed GPU run: excluded (t02 reads an
  existing ranking, t02-transactions ends at the running row, t33 uses a different failed
  state and is flagged). The focus group on stacked results names the gap when it is shown.
- The graph switcher's note count: t11 uses graphs-switcher/many, but it does not depend on
  the note count.
- Sampled rank ranges and weighted Made with: t02 reads exact PageRank, so it does not depend
  on them.
- "Covered by" on the covering row: t34 uses inspector-measure-row/covered, where it is drawn.
- Per-edge-type weights: t20 reads one edge table ("count, stronger"). t19's
  door-entries-as-nodes inspector does name each edge type's weight ("Loaded weights:
  person_id links none; building_id links none").
- Readings-only run, full selection, top-N labels and the group color picker: no task uses
  those routes.
- Counts from the fixture file (shell): no task depends on a statistic that differs between
  two of its own routes.
- One shared formatter (shell): t12-transactions is flagged for 3,530.28 against 3,530.
  t07-wide is flagged. **t07 is not flagged** although data-place/one-step and at-rest draw
  "3,000 to 812 nodes". FAIL ("What must change", item 5).
- Changes with no screen: message keys, the password, framework records, the review process.
  Out of scope, as the plan says.

## Check 9: personas

Every persona id in the plan's personas, tasks and focus groups has a file in
`study/personas/` (16 files; `cmp.mjs` reported no missing persona). PASS.

## Check 10: success_criteria

The plan's success_criteria begins with the round's targets, word for word: at least 80
percent graded success or success with difficulty for every top task, bookend and new task;
no confirmed severity-4 problem left unresolved; a mean ease rating (SEQ) of at least 5.5 of
7 over every session; at least 70 percent direct success on every tree-test task. PASS.

Scratch files for this preflight: `tmp/preflight-r7/`.
