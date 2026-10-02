# Round 7 preflight (attempt 4)

Run on 2026-10-02 against the clickable refined B skeleton (app-b/) and the round 7 plan. Every
check was run afresh; no earlier preflight result was reused. Commands were run from
design/ui/prototype/. Scratch files are in tmp/preflight-r7a4/.

**Result: PASS.** All ten checks pass. The four wording failures of the previous attempt (t17-transactions
"again", t12 and t12-doorentries "fewest steps", t10 "both", t21 "lines") are gone from the plan's
current wording. Plan defects that are not among the ten checks are listed below; none blocks the
sessions.

## Summary

| # | Check | Result |
|---|-------|--------|
| 1 | Fresh round folder | pass |
| 2 | Every named route exists and renders in the participant view | pass (0 of 158 failed) |
| 3 | Renders are exactly each id's routes, and fresh | pass (0 of 75 ids differ; 0 problems on 235 renders) |
| 4 | The study tool's own check is sound | pass (no FAIL) |
| 5 | tree.md is the outline only, and matches the skeleton | pass |
| 6 | Answer keys stay away from participants | pass (borderline items recorded) |
| 7 | Coverage, domains and datasets | pass |
| 8 | Decided changes not drawn: dependent tasks excluded or flagged | pass |
| 9 | Every persona has a file | pass |
| 10 | success_criteria carries the round's targets | pass |

## Plan defects (not among the ten checks; fix in the plan text when convenient)

- **t02-transactions and t03-transactions put their mock artifact on the wrong screen.** Both say
  "the resting transfers already draw a Louvain row and a finished 'Links in (count)' row". The
  start screen, graph-place/transfers-loaded, draws neither: its tree is Selection, Notes,
  Everything and "Analyze (Shift+A) to add results here" (shots/tasks/t03-transactions/01.png).
  The rows appear on the second screen, analyze-popover/transfers, whose tree already shows
  "Louvain 35 groups" and "Links in (count)" before anything has run (shots/tasks/t02-transactions/02.png
  and 03.png, shots/tasks/fc09/01.png). For t03-transactions that puts the answer count, 35, on
  screen the moment Analyze opens. Reword both clauses (and the grading-notes sentence) to: "the
  Analyze screen's tree already shows a Louvain row (35 groups) and a 'Links in (count)' row the
  participant has not run". The grading rule itself (reading the row counts as success with
  difficulty, filed as a mock artifact) can stay.
- **The start screen gives the transfers two sizes.** start-screen/returning lists "Mule ring
  review, 3,093 accounts" and "March transfers, 3,000 accounts" (the count check below reports
  start-screen.js typing both). t14, t28-lesmis and t40 start there; none uses the transfers, so no
  task depends on it, but no grading note names it. Add one line so a participant who remarks on it
  is filed as a mock artifact.

Borderline, recorded but not failed:
- t12-doorentries says "as few go-betweens as possible"; its way in through the selection bar is
  "Path between", so the two share "between". "Go-between" means an intermediary and is the wording
  the previous preflight proposed; watch for participants who click Path between because of it.
  t39 and t39-doorentries use the same word, but their target is Add note, not a path control.
- fc12 and fc14 use "data" (the Data rail button is one correct click); t18 says "one row for every
  door swipe" (the target is "Show the 32 rows"); tree11's target is "Select where..." and every
  tree prompt says "where".
- t30 starts in the empty Views place, where "Save view (+)" is on screen. It is a start state (no
  view saved yet) and the plan chose it as the empty-state test, so it does not measure finding
  where views are kept; tree09 and fc04 measure that.
- The tree outline offers Settings > General > Number format, which shares "number" with tree16's
  prompt ("tell it they are numbers"; target Read as...). It is a real skeleton label and a fair
  lure, not a leak.

## Check 1. Fresh round folder

Command: `ls study/round-7/` and `find study/round-7 -maxdepth 1 -mindepth 1 -type d`. Exit code 0 for both.

Result: pass. The folder holds gate.md, preflight.md, tree.md and tree-test.md, and no directory at all (none named sessions/, tree-test/, first-click/ or focus-groups/). gate.md describes an earlier gallery-based plan and, as the plan says, does not apply.

```
gate.md
preflight.md
tree.md
tree-test.md
(find printed no directories)
```

## Check 2. Every named route exists and renders

Command: `timeout 600 node app-b/study.mjs --check <the 158 routes>` (one batch; the routes are in tmp/preflight-r7a4/routes.txt). Exit code 0.

Result: pass, 0 of 158 routes failed. --check fails a route that is unknown, a stub, fails to render, throws a script error, hits a 404 or shows the review bar.

```
ok   app-b/#/graph-place/at-rest (lesmis)
ok   app-b/#/inspector-nothing-selected/overview (lesmis)
ok   app-b/#/context-menus/graph (lesmis)
ok   app-b/#/inspector-nothing-selected/computed (lesmis)
ok   app-b/#/inspector-node/transfers-node (transactions)
ok   app-b/#/graph-place/transfers-loaded (transactions)
ok   app-b/#/inspector-nothing-selected/transfers (transactions)
ok   app-b/#/graph-place/louvain-open (lesmis)
ok   app-b/#/inspector-measure-row/data (lesmis)
ok   app-b/#/analyze-popover/transfers (transactions)
ok   app-b/#/analyze-popover/link-counts (transactions)
ok   app-b/#/inspector-run-row/data (lesmis)
ok   app-b/#/inspector-group-set-path-row/community-3 (lesmis)
ok   app-b/#/inspector-run-row/settings-changed (lesmis)
ok   app-b/#/graph-place/many-groups (transactions)
ok   app-b/#/graph-place/find (lesmis)
ok   app-b/#/inspector-node/why-this-look (lesmis)
ok   app-b/#/inspector-node/data (lesmis)
ok   app-b/#/selection-bar/neighborhood (lesmis)
ok   app-b/#/selection-bar/filtered-to-neighbors (lesmis)
ok   app-b/#/selection-bar/neighborhood-directed (transactions)
ok   app-b/#/notes-place/writing (lesmis)
ok   app-b/#/notes-place/all (lesmis)
ok   app-b/#/inspector-edge/data (lesmis)
ok   app-b/#/notes-place/edge-note (lesmis)
ok   app-b/#/notes-place/earlier-group (lesmis)
ok   app-b/#/graph-place/door-entries (doorEntries)
ok   app-b/#/inspector-edge/door-pair (doorEntries)
ok   app-b/#/notes-place/door-entries (doorEntries)
ok   app-b/#/inspector-group-set-path-row/path-lesmis (lesmis)
ok   app-b/#/graph-place/door-entries-path (doorEntries)
ok   app-b/#/inspector-group-set-path-row/path-door-entries (doorEntries)
ok   app-b/#/data-place/empty-filters (transactions)
ok   app-b/#/data-place/new-step (transactions)
ok   app-b/#/data-place/one-step (transactions)
ok   app-b/#/graph-place/wide (wide)
ok   app-b/#/data-place/attributes-wide (wide)
ok   app-b/#/data-place/wide-filters (wide)
ok   app-b/#/data-place/wide-computed (wide)
ok   app-b/#/inspector-nothing-selected/canvas (lesmis)
ok   app-b/#/inspector-nothing-selected/layout-method (lesmis)
ok   app-b/#/toolbar/at-rest (lesmis)
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
ok   app-b/#/graphs-switcher/many (transactions)
ok   app-b/#/full-canvas-modes/comparison (transactions)
ok   app-b/#/full-canvas-modes/group (transactions)
ok   app-b/#/full-canvas-modes/kept (transactions)
ok   app-b/#/inspector-several-elements/two-nodes (lesmis)
ok   app-b/#/path-popover/from-selection (lesmis)
ok   app-b/#/path-popover/found (lesmis)
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
ok   app-b/#/data-place/at-rest (transactions)
ok   app-b/#/export-dialog/recent-exports (transactions)
ok   app-b/#/data-page/people (doorEntries)
ok   app-b/#/data-page/entries (doorEntries)
ok   app-b/#/data-page/unmatched-rows (doorEntries)
ok   app-b/#/canvas-and-states/door-entries-loading (doorEntries)
ok   app-b/#/data-page/kind-as-type (transactions)
ok   app-b/#/data-page/entries-pair (doorEntries)
ok   app-b/#/data-page/entries-as-nodes (doorEntries)
ok   app-b/#/inspector-nothing-selected/door-entries-as-nodes (doorEntries)
ok   app-b/#/data-page/buildings (doorEntries)
ok   app-b/#/inspector-nothing-selected/door-entries (doorEntries)
ok   app-b/#/inspector-attribute-and-filter-step/edge-weight (doorEntries)
ok   app-b/#/data-page/weight-moved (transactions)
ok   app-b/#/inspector-group-set-path-row/label-empty (lesmis)
ok   app-b/#/style-pickers/label-new-line (lesmis)
ok   app-b/#/inspector-group-set-path-row/label-two (lesmis)
ok   app-b/#/inspector-selection-and-everything/notes-row-label (lesmis)
ok   app-b/#/style-pickers/wide-label (wide)
ok   app-b/#/style-pickers/wide-bind (wide)
ok   app-b/#/data-place/attributes-wide-search (wide)
ok   app-b/#/context-menus/attribute (wide)
ok   app-b/#/graph-place/wide-sized (wide)
ok   app-b/#/start-screen/wide-first-use (wide)
ok   app-b/#/start-screen/wide-choose (wide)
ok   app-b/#/data-page/wide-hosts (wide)
ok   app-b/#/data-page/wide-find-column (wide)
ok   app-b/#/data-page/wide-link-menu (wide)
ok   app-b/#/start-screen/nested-first-use (nested)
ok   app-b/#/start-screen/nested-choose (nested)
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
ok   app-b/#/data-page/refused-empty (doorEntries)
ok   app-b/#/data-page/refused-ids (lesmis)
ok   app-b/#/data-page/json-invalid (nested)
ok   app-b/#/canvas-and-states/refused-too-large (lesmis)
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
ok   app-b/#/inspector-group-set-path-row/style (lesmis)
ok   app-b/#/analyze-popover/open (lesmis)
0 of 158 routes failed
exit 0
```

Also run, beyond the check: the focus groups' 27 stimulus routes, `timeout 300 node app-b/study.mjs --check notes-place/all ... data-page/json-array-menu`. Exit code 0.

```
ok   app-b/#/notes-place/all (lesmis)
ok   app-b/#/inspector-edge/data (lesmis)
ok   app-b/#/inspector-group-set-path-row/path-door-entries (doorEntries)
ok   app-b/#/settings/general (lesmis)
ok   app-b/#/notes-place/one-author (lesmis)
ok   app-b/#/notes-place/two-authors (lesmis)
ok   app-b/#/data-page/people (doorEntries)
ok   app-b/#/data-page/entries (doorEntries)
ok   app-b/#/data-page/unmatched-rows (doorEntries)
ok   app-b/#/data-page/entries-pair (doorEntries)
ok   app-b/#/data-page/entries-as-nodes (doorEntries)
ok   app-b/#/data-page/wide-link-menu (wide)
ok   app-b/#/data-page/json-tree (nested)
ok   app-b/#/graph-place/at-rest (lesmis)
ok   app-b/#/graph-place/finished (lesmis)
ok   app-b/#/inspector-node/why-this-look (lesmis)
ok   app-b/#/inspector-measure-row/covered (lesmis)
ok   app-b/#/graph-place/solo (lesmis)
ok   app-b/#/graph-place/show-hidden (lesmis)
ok   app-b/#/start-screen/wide-choose (wide)
ok   app-b/#/data-place/attributes-wide (wide)
ok   app-b/#/data-place/attributes-wide-search (wide)
ok   app-b/#/style-pickers/wide-size-by (wide)
ok   app-b/#/table-dock/wide (wide)
ok   app-b/#/inspector-node/wide-data (wide)
ok   app-b/#/start-screen/nested-choose (nested)
ok   app-b/#/data-page/json-array-menu (nested)
0 of 27 routes failed
exit 0
```

## Check 3. Renders are exactly each id's routes, and fresh

Commands:
- `node tmp/preflight-r7a4/cmp.mjs` -- compares shots/tasks/<id>/routes.json with the plan's routes (tmp/preflight-r7a4/plan.txt, the routes without the app-b/#/ prefix) for all 75 task and first-click ids. Exit code 0.
- `timeout 120 node app-b/study.mjs --fresh t01 ... fc14` (the 75 ids). Exit code 0.
- `node tmp/preflight-r7a4/ds.mjs` -- each folder holds exactly 01.png..NN.png, one per route, and the datasets its routes draw (the dataset column of `--list`) equal the plan's datasets. Exit code 1, on t13 and t33 only; see below.

Result: pass. Every routes.json equals the plan, every PNG is newer than every skeleton file, and every folder holds one numbered PNG per route. The dataset script flags t13 and t33 because inspector-run-row/data-changed and inspector-run-row/failed are listed as "lesmis (or its left panel's)": they take the dataset of the left panel they open beside. Both renders (shots/tasks/t13/06.png, shots/tasks/t33/02.png) show the "Transfers, March 2026" project with the transfers tree and inspector, and `--task` refuses a task whose routes draw two projects, so both tasks draw only the transfers, as the plan says.

--- cmp.mjs
```
ok   t01 routes.json=4 plan=4 pngs=4 01.png,02.png,03.png,04.png
ok   t01-transactions routes.json=3 plan=3 pngs=3 01.png,02.png,03.png
ok   t02 routes.json=3 plan=3 pngs=3 01.png,02.png,03.png
ok   t02-transactions routes.json=3 plan=3 pngs=3 01.png,02.png,03.png
ok   t03 routes.json=5 plan=5 pngs=5 01.png,02.png,03.png,04.png,05.png
ok   t03-transactions routes.json=3 plan=3 pngs=3 01.png,02.png,03.png
ok   t04 routes.json=6 plan=6 pngs=6 01.png,02.png,03.png,04.png,05.png,06.png
ok   t04-transactions routes.json=3 plan=3 pngs=3 01.png,02.png,03.png
ok   t05 routes.json=4 plan=4 pngs=4 01.png,02.png,03.png,04.png
ok   t06 routes.json=5 plan=5 pngs=5 01.png,02.png,03.png,04.png,05.png
ok   t06-doorentries routes.json=3 plan=3 pngs=3 01.png,02.png,03.png
ok   t39 routes.json=2 plan=2 pngs=2 01.png,02.png
ok   t39-doorentries routes.json=2 plan=2 pngs=2 01.png,02.png
ok   t07 routes.json=4 plan=4 pngs=4 01.png,02.png,03.png,04.png
ok   t07-wide routes.json=4 plan=4 pngs=4 01.png,02.png,03.png,04.png
ok   t08 routes.json=5 plan=5 pngs=5 01.png,02.png,03.png,04.png,05.png
ok   t08-transactions routes.json=2 plan=2 pngs=2 01.png,02.png
ok   t09 routes.json=2 plan=2 pngs=2 01.png,02.png
ok   t09-wide routes.json=4 plan=4 pngs=4 01.png,02.png,03.png,04.png
ok   t10 routes.json=3 plan=3 pngs=3 01.png,02.png,03.png
ok   t10-transactions routes.json=2 plan=2 pngs=2 01.png,02.png
ok   t11 routes.json=5 plan=5 pngs=5 01.png,02.png,03.png,04.png,05.png
ok   t12 routes.json=5 plan=5 pngs=5 01.png,02.png,03.png,04.png,05.png
ok   t12-doorentries routes.json=3 plan=3 pngs=3 01.png,02.png,03.png
ok   t12-transactions routes.json=5 plan=5 pngs=5 01.png,02.png,03.png,04.png,05.png
ok   t13 routes.json=6 plan=6 pngs=6 01.png,02.png,03.png,04.png,05.png,06.png
ok   t14 routes.json=4 plan=4 pngs=4 01.png,02.png,03.png,04.png
ok   t14-transactions routes.json=4 plan=4 pngs=4 01.png,02.png,03.png,04.png
ok   t15 routes.json=3 plan=3 pngs=3 01.png,02.png,03.png
ok   t15-wide routes.json=2 plan=2 pngs=2 01.png,02.png
ok   t16 routes.json=4 plan=4 pngs=4 01.png,02.png,03.png,04.png
ok   t17 routes.json=3 plan=3 pngs=3 01.png,02.png,03.png
ok   t17-transactions routes.json=2 plan=2 pngs=2 01.png,02.png
ok   t18 routes.json=5 plan=5 pngs=5 01.png,02.png,03.png,04.png,05.png
ok   t18-transactions routes.json=4 plan=4 pngs=4 01.png,02.png,03.png,04.png
ok   t19 routes.json=4 plan=4 pngs=4 01.png,02.png,03.png,04.png
ok   t20 routes.json=5 plan=5 pngs=5 01.png,02.png,03.png,04.png,05.png
ok   t20-transactions routes.json=3 plan=3 pngs=3 01.png,02.png,03.png
ok   t21 routes.json=5 plan=5 pngs=5 01.png,02.png,03.png,04.png,05.png
ok   t21-wide routes.json=3 plan=3 pngs=3 01.png,02.png,03.png
ok   t22 routes.json=5 plan=5 pngs=5 01.png,02.png,03.png,04.png,05.png
ok   t23 routes.json=6 plan=6 pngs=6 01.png,02.png,03.png,04.png,05.png,06.png
ok   t24 routes.json=8 plan=8 pngs=8 01.png,02.png,03.png,04.png,05.png,06.png,07.png,08.png
ok   t25 routes.json=5 plan=5 pngs=5 01.png,02.png,03.png,04.png,05.png
ok   t26 routes.json=3 plan=3 pngs=3 01.png,02.png,03.png
ok   t27 routes.json=4 plan=4 pngs=4 01.png,02.png,03.png,04.png
ok   t28 routes.json=2 plan=2 pngs=2 01.png,02.png
ok   t28-doorentries routes.json=2 plan=2 pngs=2 01.png,02.png
ok   t28-lesmis routes.json=2 plan=2 pngs=2 01.png,02.png
ok   t28-nested routes.json=2 plan=2 pngs=2 01.png,02.png
ok   t40 routes.json=2 plan=2 pngs=2 01.png,02.png
ok   t29 routes.json=4 plan=4 pngs=4 01.png,02.png,03.png,04.png
ok   t30 routes.json=5 plan=5 pngs=5 01.png,02.png,03.png,04.png,05.png
ok   t31 routes.json=3 plan=3 pngs=3 01.png,02.png,03.png
ok   t32 routes.json=2 plan=2 pngs=2 01.png,02.png
ok   t33 routes.json=2 plan=2 pngs=2 01.png,02.png
ok   t34 routes.json=4 plan=4 pngs=4 01.png,02.png,03.png,04.png
ok   t35 routes.json=3 plan=3 pngs=3 01.png,02.png,03.png
ok   t36 routes.json=3 plan=3 pngs=3 01.png,02.png,03.png
ok   t37 routes.json=4 plan=4 pngs=4 01.png,02.png,03.png,04.png
ok   t38 routes.json=3 plan=3 pngs=3 01.png,02.png,03.png
ok   fc01 routes.json=1 plan=1 pngs=1 01.png
ok   fc02 routes.json=1 plan=1 pngs=1 01.png
ok   fc03 routes.json=1 plan=1 pngs=1 01.png
ok   fc04 routes.json=1 plan=1 pngs=1 01.png
ok   fc05 routes.json=1 plan=1 pngs=1 01.png
ok   fc06 routes.json=1 plan=1 pngs=1 01.png
ok   fc07 routes.json=1 plan=1 pngs=1 01.png
ok   fc08 routes.json=1 plan=1 pngs=1 01.png
ok   fc09 routes.json=1 plan=1 pngs=1 01.png
ok   fc10 routes.json=1 plan=1 pngs=1 01.png
ok   fc11 routes.json=1 plan=1 pngs=1 01.png
ok   fc12 routes.json=1 plan=1 pngs=1 01.png
ok   fc13 routes.json=1 plan=1 pngs=1 01.png
ok   fc14 routes.json=1 plan=1 pngs=1 01.png
all routes.json match the plan
exit 0
```
--- --fresh
```
0 problems on 235 renders
exit 0
```
--- ds.mjs
```
ok   t01 pngs=[01.png 02.png 03.png 04.png] drawn=lesmis (some routes take the left panel's dataset) plan=lesmis
ok   t01-transactions pngs=[01.png 02.png 03.png] drawn=transactions plan=transactions
ok   t02 pngs=[01.png 02.png 03.png] drawn=lesmis (some routes take the left panel's dataset) plan=lesmis
ok   t02-transactions pngs=[01.png 02.png 03.png] drawn=transactions plan=transactions
ok   t03 pngs=[01.png 02.png 03.png 04.png 05.png] drawn=lesmis (some routes take the left panel's dataset) plan=lesmis
ok   t03-transactions pngs=[01.png 02.png 03.png] drawn=transactions plan=transactions
ok   t04 pngs=[01.png 02.png 03.png 04.png 05.png 06.png] drawn=lesmis (some routes take the left panel's dataset) plan=lesmis
ok   t04-transactions pngs=[01.png 02.png 03.png] drawn=transactions plan=transactions
ok   t05 pngs=[01.png 02.png 03.png 04.png] drawn=lesmis (some routes take the left panel's dataset) plan=lesmis
ok   t06 pngs=[01.png 02.png 03.png 04.png 05.png] drawn=lesmis (some routes take the left panel's dataset) plan=lesmis
ok   t06-doorentries pngs=[01.png 02.png 03.png] drawn=doorEntries plan=doorEntries
ok   t39 pngs=[01.png 02.png] drawn=lesmis (some routes take the left panel's dataset) plan=lesmis
ok   t39-doorentries pngs=[01.png 02.png] drawn=doorEntries plan=doorEntries
ok   t07 pngs=[01.png 02.png 03.png 04.png] drawn=transactions plan=transactions
ok   t07-wide pngs=[01.png 02.png 03.png 04.png] drawn=wide plan=wide
ok   t08 pngs=[01.png 02.png 03.png 04.png 05.png] drawn=lesmis (some routes take the left panel's dataset) plan=lesmis
ok   t08-transactions pngs=[01.png 02.png] drawn=transactions plan=transactions
ok   t09 pngs=[01.png 02.png] drawn=nested plan=nested
ok   t09-wide pngs=[01.png 02.png 03.png 04.png] drawn=wide plan=wide
ok   t10 pngs=[01.png 02.png 03.png] drawn=lesmis (some routes take the left panel's dataset) plan=lesmis
ok   t10-transactions pngs=[01.png 02.png] drawn=transactions plan=transactions
ok   t11 pngs=[01.png 02.png 03.png 04.png 05.png] drawn=transactions plan=transactions
ok   t12 pngs=[01.png 02.png 03.png 04.png 05.png] drawn=lesmis (some routes take the left panel's dataset) plan=lesmis
ok   t12-doorentries pngs=[01.png 02.png 03.png] drawn=doorEntries plan=doorEntries
ok   t12-transactions pngs=[01.png 02.png 03.png 04.png 05.png] drawn=transactions plan=transactions
BAD  t13 pngs=[01.png 02.png 03.png 04.png 05.png 06.png] drawn=lesmis,transactions (some routes take the left panel's dataset) plan=transactions
ok   t14 pngs=[01.png 02.png 03.png 04.png] drawn=lesmis (some routes take the left panel's dataset) plan=lesmis
ok   t14-transactions pngs=[01.png 02.png 03.png 04.png] drawn=transactions plan=transactions
ok   t15 pngs=[01.png 02.png 03.png] drawn=transactions plan=transactions
ok   t15-wide pngs=[01.png 02.png] drawn=wide plan=wide
ok   t16 pngs=[01.png 02.png 03.png 04.png] drawn=lesmis (some routes take the left panel's dataset) plan=lesmis
ok   t17 pngs=[01.png 02.png 03.png] drawn=lesmis (some routes take the left panel's dataset) plan=lesmis
ok   t17-transactions pngs=[01.png 02.png] drawn=transactions plan=transactions
ok   t18 pngs=[01.png 02.png 03.png 04.png 05.png] drawn=doorEntries plan=doorEntries
ok   t18-transactions pngs=[01.png 02.png 03.png 04.png] drawn=transactions plan=transactions
ok   t19 pngs=[01.png 02.png 03.png 04.png] drawn=doorEntries plan=doorEntries
ok   t20 pngs=[01.png 02.png 03.png 04.png 05.png] drawn=doorEntries plan=doorEntries
ok   t20-transactions pngs=[01.png 02.png 03.png] drawn=transactions plan=transactions
ok   t21 pngs=[01.png 02.png 03.png 04.png 05.png] drawn=lesmis (some routes take the left panel's dataset) plan=lesmis
ok   t21-wide pngs=[01.png 02.png 03.png] drawn=wide plan=wide
ok   t22 pngs=[01.png 02.png 03.png 04.png 05.png] drawn=wide plan=wide
ok   t23 pngs=[01.png 02.png 03.png 04.png 05.png 06.png] drawn=wide plan=wide
ok   t24 pngs=[01.png 02.png 03.png 04.png 05.png 06.png 07.png 08.png] drawn=nested plan=nested
ok   t25 pngs=[01.png 02.png 03.png 04.png 05.png] drawn=nested plan=nested
ok   t26 pngs=[01.png 02.png 03.png] drawn=plainJson plan=plainJson
ok   t27 pngs=[01.png 02.png 03.png 04.png] drawn=lesmis (some routes take the left panel's dataset) plan=lesmis
ok   t28 pngs=[01.png 02.png] drawn=transactions plan=transactions
ok   t28-doorentries pngs=[01.png 02.png] drawn=doorEntries plan=doorEntries
ok   t28-lesmis pngs=[01.png 02.png] drawn=lesmis (some routes take the left panel's dataset) plan=lesmis
ok   t28-nested pngs=[01.png 02.png] drawn=nested plan=nested
ok   t40 pngs=[01.png 02.png] drawn=lesmis (some routes take the left panel's dataset) plan=lesmis
ok   t29 pngs=[01.png 02.png 03.png 04.png] drawn=lesmis (some routes take the left panel's dataset) plan=lesmis
ok   t30 pngs=[01.png 02.png 03.png 04.png 05.png] drawn=lesmis (some routes take the left panel's dataset) plan=lesmis
ok   t31 pngs=[01.png 02.png 03.png] drawn=lesmis (some routes take the left panel's dataset) plan=lesmis
ok   t32 pngs=[01.png 02.png] drawn=lesmis (some routes take the left panel's dataset) plan=lesmis
BAD  t33 pngs=[01.png 02.png] drawn=lesmis,transactions (some routes take the left panel's dataset) plan=transactions
ok   t34 pngs=[01.png 02.png 03.png 04.png] drawn=lesmis (some routes take the left panel's dataset) plan=lesmis
ok   t35 pngs=[01.png 02.png 03.png] drawn=lesmis (some routes take the left panel's dataset) plan=lesmis
ok   t36 pngs=[01.png 02.png 03.png] drawn=transactions plan=transactions
ok   t37 pngs=[01.png 02.png 03.png 04.png] drawn=lesmis (some routes take the left panel's dataset) plan=lesmis
ok   t38 pngs=[01.png 02.png 03.png] drawn=lesmis (some routes take the left panel's dataset) plan=lesmis
ok   fc01 pngs=[01.png] drawn=lesmis (some routes take the left panel's dataset) plan=-
ok   fc02 pngs=[01.png] drawn=lesmis (some routes take the left panel's dataset) plan=-
ok   fc03 pngs=[01.png] drawn=lesmis (some routes take the left panel's dataset) plan=-
ok   fc04 pngs=[01.png] drawn=lesmis (some routes take the left panel's dataset) plan=-
ok   fc05 pngs=[01.png] drawn=lesmis (some routes take the left panel's dataset) plan=-
ok   fc06 pngs=[01.png] drawn=lesmis (some routes take the left panel's dataset) plan=-
ok   fc07 pngs=[01.png] drawn=lesmis (some routes take the left panel's dataset) plan=-
ok   fc08 pngs=[01.png] drawn=lesmis (some routes take the left panel's dataset) plan=-
ok   fc09 pngs=[01.png] drawn=transactions plan=-
ok   fc10 pngs=[01.png] drawn=nested plan=-
ok   fc11 pngs=[01.png] drawn=transactions plan=-
ok   fc12 pngs=[01.png] drawn=lesmis (some routes take the left panel's dataset) plan=-
ok   fc13 pngs=[01.png] drawn=wide plan=-
ok   fc14 pngs=[01.png] drawn=doorEntries plan=-
2 problem(s)
exit 1
```

## Check 4. The study tool's own check is sound

Command: `timeout 300 node app-b/study.mjs --prove`. Exit code 0.

Result: pass, no FAIL: --check fails an unknown section, an unknown state and a stub, and passes a good route.

```
ok   a good route passes
ok   an unknown section fails: no section "no-such-section" (the manifest lists the sections; --list shows every route)
ok   an unknown state fails: section graph-place has no state "no-such-state" (its states: at-rest, empty, door-entries, louvain-open, many-groups, transfers-loaded, door-entries-path, door-entries-running, path-found, transfers-running, running, queued, finished, partial, failed, solo, everything-hidden, show-hidden, scope-mark, out-of-date, invalid-drop, find, list-menu, rename, rename-chain, rename-run-group, rename-builtin, rename-run-disabled, notes-eye-off, find-no-match, one-group, long-names, wide, wide-sized, nested, nested-set, plain-json, registry, painted)
ok   a stub fails: section prove-stub is a stub (no render)
exit 0
```

## Check 5. tree.md is the outline only, and matches the skeleton

Command: `node tmp/preflight-r7a4/tree.mjs` -- (a) every run of six words from each of the 16 prompts in tree-test.md is absent from tree.md; (b) tree.md has no route, app-b, "correct", "answer", "score", tree, task or id pattern; (c) no hyphenated section id from sections/manifest.json; (d) every one of the 231 outline labels, less its parenthetical, is looked up verbatim in app.js, lib.js and the section files. Exit code 0. Then a word grep for each tree prompt's example (go-between, cluster, slides, colleague, Tuesday, small, door, swipe, tangle, Monday, month, country, score, department, April, March, words).

Result: pass. No prompt text, answer, location key, score, route or section id is in tree.md, and no example a tree prompt names appears (the grep finds none; "IT" hits are substrings such as "Edit"; "number" is Settings > General > Number format). The 28 labels not found verbatim are descriptions of places, not labels ("The list of rows, top to bottom", "Right-click on a node", "Each table"), plus "To ->" (the skeleton writes "To -> building" or "To -> account") and two choice rows written with "|" whose parts the skeleton draws ("Each row is", "a node", "an edge"; "As the file says", "Directed", "Undirected"). The outline's structure follows README.md and the renders: header (main menu, project-name menu, Undo, Redo, Local only, Full graph), rail (Graph, Data, Views, Notes, Assistant), the Data page, the canvas menus, the toolbar's five tooltip names, the selection bar, the inspector's Style and Data tabs, and the table dock.

```
prompts read from tree-test.md: 16; section ids checked: 41
labels: 231; not found verbatim in the skeleton source: 28
  ? Project name (click it for its menu)
  ? Graph switcher (the graph's name, with a menu)
  ? The list of rows, top to bottom
  ? Rows added by Analyze, each with its eye
  ? A ranking (a measure)
  ? A grouping (a run), opening to its groups
  ? Sets you kept
  ? Folders you made
  ? A row's right-click menu
  ? Graph switcher
  ? Each file or address, with its menu
  ? A step's menu
  ? Your saved views, in order, each with In tour
  ? Every note, newest first
  ? Each table
  ? The chosen table
  ? Each row is: a node | an edge
  ? Each column's role, under its name
  ? To ->
  ? For a nested document: the document's outline, with a checkbox on each list of records
  ? Direction: As the file says | Directed | Undirected
  ? Legend card (top left)
  ? Right-click on empty canvas
  ? Right-click on a node
  ? Header: name, kind, where it came from, and "..." (the same menu as right-click)
  ? Members or Values (with Top 10)
  ? A tab for a grouping's groups
  ? A column header's menu
exit 0
```

## Check 6. Answer keys stay away from participants

Commands:
- `timeout 600 kit/with-browser.sh node tmp/round-7-preflight-2/scan.mjs <prototype> tmp/preflight-r7a4/texts.json <the 158 routes>` -- opens each route in the participant view, saves its visible text, and reports any visible review bar, design note, section id or hyphenated state id. Exit code 0.
- `python3 tmp/preflight-r7a4/leak.py` -- content words each scenario and prompt, in the plan's current wording (tmp/preflight-r7a4/scen.json), shares with its target controls' labels, tooltips and description lines (the target table built by the previous preflight from the renders and section files). Exit code 0.
- `node app-b/study.mjs --try ... --click "Add note" --expect ...` on inspector-group-set-path-row/path-lesmis and path-door-entries (check 7 uses it too).
- Renders read by eye: t03-transactions/01.png, t02-transactions/03.png, t39-doorentries/01.png, t19/01.png, t20-transactions/01.png, t14-transactions/01.png, t30/01.png, t32/02.png, t07/04.png, t13/06.png, t33/02.png, fc08/01.png, fc09/01.png.

Results:
- Participant view: pass. On all 158 routes the review bar is hidden and no design note shows. The only ids matched are "toolbar" (the screen-reader heading "Canvas toolbar") and "settings" (the Settings menu item and dialog), which are UI words, not section or state names.
- Render file names: pass. Each folder holds 01.png ... NN.png and routes.json only (check 3).
- First renders: pass. Each 01.png is the state before the job. t01-transactions starts with one account selected and no graph-wide count in view, as planned; t19 starts with One edge per: Row chosen; t20-transactions with amount as the weight; t39-doorentries with the chain row present but not selected; t03-transactions and t02-transactions start on a tree with no result rows (the rows appear on the Analyze screen -- see Plan defects).
- Wording: pass. The scan's hits are stemming noise ("Notes" against "not"; "are"; "Each"; "What"; "Open" as in "the network you have open") or the borderline items listed above. The previous attempt's four failures are fixed: t17-transactions says "this month's version of it"; t12 "as few others as possible"; t12-doorentries "as few go-betweens as possible"; t10 "have in common"; t21 "two pieces of text". t32's "graphics card" does not appear on the Performance page, which says GPU and WebGPU. fc08 and fc09 use no word of "Total value" or "Total amount in". No task or first-click id names its answer (they are t01..t40 and fc01..fc14).

--- scan.mjs
```
graph-place/at-rest: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
inspector-nothing-selected/overview: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
context-menus/graph: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
inspector-nothing-selected/computed: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
inspector-node/transfers-node: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
graph-place/transfers-loaded: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
inspector-nothing-selected/transfers: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
graph-place/louvain-open: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
inspector-measure-row/data: SHOWS {"shown":["toolbar","settings"],"review":false,"notes":0}
analyze-popover/transfers: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
analyze-popover/link-counts: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
inspector-run-row/data: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
inspector-group-set-path-row/community-3: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
inspector-run-row/settings-changed: SHOWS {"shown":["toolbar","settings"],"review":false,"notes":0}
graph-place/many-groups: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
graph-place/find: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
inspector-node/why-this-look: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
inspector-node/data: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
selection-bar/neighborhood: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
selection-bar/filtered-to-neighbors: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
selection-bar/neighborhood-directed: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
notes-place/writing: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
notes-place/all: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
inspector-edge/data: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
notes-place/edge-note: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
notes-place/earlier-group: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
graph-place/door-entries: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
inspector-edge/door-pair: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
notes-place/door-entries: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
inspector-group-set-path-row/path-lesmis: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
graph-place/door-entries-path: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
inspector-group-set-path-row/path-door-entries: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
data-place/empty-filters: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
data-place/new-step: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
data-place/one-step: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
graph-place/wide: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
data-place/attributes-wide: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
data-place/wide-filters: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
data-place/wide-computed: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
inspector-nothing-selected/canvas: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
inspector-nothing-selected/layout-method: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
toolbar/at-rest: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
toolbar/layout-paused: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
inspector-nothing-selected/transfers-methods: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
graph-place/nested-set: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
style-pickers/nested-color-by: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
style-pickers/wide-color-by: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
style-pickers/wide-search: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
inspector-measure-row/painted-color: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
inspector-several-rows/style: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
inspector-several-rows/result-intersect: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
select-where/where: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
graphs-switcher/many: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
full-canvas-modes/comparison: clean
full-canvas-modes/group: clean
full-canvas-modes/kept: clean
inspector-several-elements/two-nodes: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
path-popover/from-selection: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
path-popover/found: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
path-popover/transfers-directed: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
path-popover/found-tied: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
inspector-group-set-path-row/path: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
table-dock/path-members: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
context-menus/source: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
data-page/replace: clean
data-place/after-replace: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
inspector-run-row/data-changed: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
start-screen/returning: clean
data-page/graph-file: clean
canvas-and-states/loading: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
data-page/edge-list: clean
data-page/transfers: clean
canvas-and-states/transfers-loading: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
recipe-apply/binding: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
recipe-apply/applied: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
recipe-apply/wide-mismatch: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
project-menu/open: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
export-dialog/image: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
export-image/image: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
table-dock/table-options: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
export-dialog/data: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
data-place/at-rest: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
export-dialog/recent-exports: SHOWS {"shown":["toolbar","settings"],"review":false,"notes":0}
data-page/people: clean
data-page/entries: clean
data-page/unmatched-rows: clean
canvas-and-states/door-entries-loading: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
data-page/kind-as-type: clean
data-page/entries-pair: clean
data-page/entries-as-nodes: clean
inspector-nothing-selected/door-entries-as-nodes: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
data-page/buildings: clean
inspector-nothing-selected/door-entries: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
inspector-attribute-and-filter-step/edge-weight: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
data-page/weight-moved: clean
inspector-group-set-path-row/label-empty: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
style-pickers/label-new-line: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
inspector-group-set-path-row/label-two: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
inspector-selection-and-everything/notes-row-label: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
style-pickers/wide-label: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
style-pickers/wide-bind: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
data-place/attributes-wide-search: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
context-menus/attribute: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
graph-place/wide-sized: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
start-screen/wide-first-use: clean
start-screen/wide-choose: clean
data-page/wide-hosts: clean
data-page/wide-find-column: clean
data-page/wide-link-menu: clean
start-screen/nested-first-use: clean
start-screen/nested-choose: clean
data-page/json-tree: clean
data-page/json-researchers: clean
data-page/json-array-menu: clean
data-page/json-any-type: clean
data-page/json-report: clean
graph-place/nested: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
data-page/edit-json-researchers: clean
data-page/json-keep-value: clean
data-page/json-affiliations: clean
inspector-node/nested-data: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
data-page/json-plain: clean
graph-place/plain-json: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
inspector-node/plain-data: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
start-screen/first-run: SHOWS {"shown":["settings"],"review":false,"notes":0}
start-screen/disclosure: SHOWS {"shown":["settings"],"review":false,"notes":0}
start-screen/declined: SHOWS {"shown":["settings"],"review":false,"notes":0}
settings/privacy: SHOWS {"shown":["toolbar","settings"],"review":false,"notes":0}
data-page/refused-parse: SHOWS {"shown":["settings"],"review":false,"notes":0}
data-page/refused-empty: clean
data-page/refused-ids: clean
data-page/json-invalid: clean
canvas-and-states/refused-too-large: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
graph-place/empty: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
canvas-and-states/empty: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
data-place/no-sources: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
views-place/empty: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
views-place/saving: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
views-place/at-rest: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
present-mode/first-view: clean
present-mode/presenting: clean
assistant-place/no-provider: SHOWS {"shown":["toolbar","settings"],"review":false,"notes":0}
settings/assistant: SHOWS {"shown":["toolbar","settings"],"review":false,"notes":0}
settings/performance-gpu-unavailable: SHOWS {"shown":["toolbar","settings"],"review":false,"notes":0}
inspector-run-row/failed: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
graph-place/show-hidden: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
inspector-measure-row/covered: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
canvas-and-states/drawn: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
canvas-and-states/walked: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
full-canvas-modes/version-history: clean
full-canvas-modes/past-version: clean
graph-place/solo: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
selection-bar/hidden: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
graph-place/rename: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
graph-place/rename-chain: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
toolbar/legend-off: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
inspector-group-set-path-row/style: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
analyze-popover/open: SHOWS {"shown":["toolbar"],"review":false,"notes":0}
exit 0
```
--- leak.py
```
t06-doorentries    shares with its target labels: ['Notes']
t39                shares with its target labels: ['Notes']
t39-doorentries    shares with its target labels: ['Notes']
t07                shares with its target labels: ['are']
t12-doorentries    shares with its target labels: ['between']
t18                shares with its target labels: ['rows']
t19                shares with its target labels: ['Each']
t27                shares with its target labels: ['What']
fc12               shares with its target labels: ['Data']
fc14               shares with its target labels: ['Data']
tree04             shares with its target labels: ['Open']
tree11             shares with its target labels: ['where']
10 of 75 task/first-click ids share a word with their target labels; ids with no target table: []
exit 0
```

## Check 7. Coverage

Commands:
- `node tmp/preflight-r7a4/cov.mjs` -- for every coverage key and task, the distinct domains of its personas (domains read from each persona file; see below); that wide-field tasks draw the wide dataset and nested-json tasks the nested one; that every persona has a file; the session and task counts. Exit code 0.
- `timeout 300 node app-b/study.mjs --try tmp/preflight-r7a4/t39-try.png app-b/#/inspector-group-set-path-row/path-lesmis --click "Add note" --expect "Valjean to Javert"` and the same on path-door-entries with "Ana Ruiz to Priya Nair". Exit code 0 for both.
- The dataset column of `node app-b/study.mjs --list` (check 3's ds.mjs).

Domains, read from the persona files: alert-reviewer and fraud-analyst financial crime (transaction monitoring; fraud investigation); analyst-alex logistics operations (operations analytics at a logistics company); bioinformatics-researcher and genomics-cytoscape-user biology research; cybersecurity-analyst IT security (SOC threat hunter); expert-emma network science; explorer-elena product management; gephi-holdout social science (computational social science professor); intelligence-analyst law enforcement intelligence; knowledge-engineer data architecture; marketing-analyst marketing; ml-engineer-recsys e-commerce engineering (online retailer); recipe-recipient biology lab management (cell biology lab manager); screen-reader-analyst public health (epidemiology); supply-chain-analyst supply chain.

Result: pass. Every one of the 21 keys has at least one task, every covering task has personas from at least two domains (the lowest is 3), and each task's routes exercise its key: the task renders show the measured controls (for example t05 notes-place/writing, t07 data-place/new-step, t11 full-canvas-modes/comparison, t13 data-page/replace, t20 data-page/entries-pair and inspector-attribute-and-filter-step/edge-weight, t21 inspector-group-set-path-row/label-empty). The two chain-note tasks reach the writing box by click-through, and --try proves it opens with the chain's chip. wide-field (t22, t23) draws only the wide dataset and nested-json (t24, t25) only the nested one; every task's datasets list equals what its routes draw (check 3). The first-use tasks include a first nested file (t24, from start-screen/nested-first-use, before the export is read) and a first very wide file (t23, from start-screen/wide-first-use). The plan has 61 think-aloud tasks and 280 sessions.

```
ok   characterize t01 personas=7 domains=7 datasets=lesmis
ok   characterize t01-transactions personas=6 domains=5 datasets=transactions
ok   rank t02 personas=6 domains=5 datasets=lesmis
ok   rank t02-transactions personas=6 domains=5 datasets=transactions
ok   communities t03 personas=6 domains=5 datasets=lesmis
ok   communities t03-transactions personas=5 domains=5 datasets=transactions
ok   find-explore t04 personas=5 domains=5 datasets=lesmis
ok   find-explore t04-transactions personas=4 domains=3 datasets=transactions
ok   note t05 personas=6 domains=6 datasets=lesmis
ok   filter t07 personas=5 domains=4 datasets=transactions
ok   filter t07-wide personas=5 domains=5 datasets=wide
ok   layout t08 personas=6 domains=6 datasets=lesmis
ok   layout t08-transactions personas=4 domains=4 datasets=transactions
ok   color-size t09 personas=5 domains=4 datasets=nested
ok   color-size t09-wide personas=5 domains=5 datasets=wide
ok   sets t10 personas=5 domains=5 datasets=lesmis
ok   sets t10-transactions personas=5 domains=4 datasets=transactions
ok   compare t11 personas=6 domains=6 datasets=transactions
ok   path t12 personas=5 domains=5 datasets=lesmis
ok   path t12-transactions personas=4 domains=3 datasets=transactions
ok   path t12-doorentries personas=4 domains=4 datasets=doorEntries
ok   reuse t13 personas=6 domains=6 datasets=transactions
ok   load t14 personas=5 domains=5 datasets=lesmis
ok   load t14-transactions personas=5 domains=4 datasets=transactions
ok   load t26 personas=4 domains=4 datasets=plainJson
ok   recipe t15 personas=5 domains=4 datasets=transactions
ok   recipe t15-wide personas=4 domains=4 datasets=wide
ok   export t16 personas=6 domains=5 datasets=lesmis
ok   export t17 personas=5 domains=5 datasets=lesmis
ok   export t17-transactions personas=4 domains=3 datasets=transactions
ok   multi-table t18 personas=7 domains=7 datasets=doorEntries
ok   multi-table t19 personas=6 domains=6 datasets=doorEntries
ok   multi-table t18-transactions personas=5 domains=4 datasets=transactions
ok   weight t20 personas=5 domains=5 datasets=doorEntries
ok   weight t20-transactions personas=5 domains=4 datasets=transactions
ok   labels t21 personas=6 domains=6 datasets=lesmis
ok   labels t21-wide personas=4 domains=4 datasets=wide
ok   notes-targets t06 personas=5 domains=5 datasets=lesmis
ok   notes-targets t06-doorentries personas=4 domains=4 datasets=doorEntries
ok   notes-targets t39 personas=4 domains=4 datasets=lesmis
ok   notes-targets t39-doorentries personas=3 domains=3 datasets=doorEntries
ok   wide-field t22 personas=7 domains=7 datasets=wide
ok   wide-field t23 personas=6 domains=6 datasets=wide
ok   nested-json t24 personas=7 domains=6 datasets=nested
ok   nested-json t25 personas=5 domains=5 datasets=nested
distinct personas in plan: 16; every one has a file: true
think-aloud sessions: 280 tasks: 61
exit 0
```
--- --try
```
/home/apowers/Projects/graphty-monorepo/.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype/tmp/preflight-r7a4/t39-try.png
exit 0
/home/apowers/Projects/graphty-monorepo/.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype/tmp/preflight-r7a4/t39d-try.png
exit 0
```

## Check 8. Decided changes not drawn

Commands: `timeout 120 node app-b/study.mjs --counts` (exit code 1, 14 violations, below); each decided change's route compared with the plan's routes; renders read for the routes the plan does use near a change (t07/04.png, fc09/01.png, t33/02.png).

Result: pass. Each decided change is either on no route the plan uses, or the tasks that use its route are flagged or excluded:
- Analyze: Exact or Sampled and the declined run (costly, declined) -- no task uses them; named as not testable.
- Analyze: weighted degree and task-word search -- no task uses analyze-popover/search. fc09 uses analyze-popover/transfers, which draws "Total amount", "Total amount in" and "Total amount out" with one line each (fc09/01.png); fc08's analyze-popover/open draws "Total value". t02-transactions ends on analyze-popover/link-counts, drawn.
- "Not on a bridge edge" (search route, data-place/filters) -- no task uses either route; t07-wide's data-place/wide-computed draws it.
- The degree step on data-place/filters -- no task uses that route; t07 ends at data-place/one-step, whose inspector is the graph's own (state bar "5 readings are for all 3,000 nodes", "Compute on 812"), not the scope pattern; t07-wide uses wide-computed, where the step is drawn.
- Attributes grouping, fill, computed rows; the wide list's "In use (6)" -- t07-wide, t22 and fc13 use attributes-wide and attributes-wide-search for the Find box, which is drawn; none depends on the unfiltered order or the In use count.
- Nested names by full stored path -- t09 carries the flag; no task uses data-place/attributes-nested.
- Link-count measure names on graph-place/transfers-loaded -- the start screen draws no measure rows; "Links in (count)" appears on the Analyze screen with the catalog's name (see Plan defects).
- A run painting on finish (graph-place/finished) -- excluded from tasks; t02 reads an existing ranking and t02-transactions stops at Run; the paint focus group names it as a known gap of the mock.
- A failed GPU run (graph-place/failed) -- excluded; t33 uses inspector-run-row/failed (the rerun's state bar, drawn) and flags the missing failure mark on the tree row, which t33/02.png confirms.
- The graph switcher's note count -- t11 uses graphs-switcher/many for Compare graphs..., not the count; named as not testable.
- Sampled ranks, "=" ties, the weighted Made with -- t02 reads exact ranks on inspector-measure-row/data and does not depend on them.
- "Covered by" on the covering row's Style tab -- t34 uses inspector-measure-row/covered, where the covered case is drawn.
- Per-edge-type weights in the door entries inspector -- t20 carries the flag.
- Readings-only tree row; label top N; palette picker -- no task uses those routes.
- Select lands on the usual selection picture -- t10-transactions ends on select-where/where and asks how the list would be kept; both later states excluded.
- Counts from fixtures and one shared formatter -- --counts still fails (below). The "Filtered: ..." lines in notes-place.js and path-popover.js draw only on notes-place/filter-step-on and path-popover/no-path, which no task uses. t07, t07-wide and t12-transactions carry the formatter flag. The start screen's two transfer sizes touch t14, t28-lesmis and t40 without any task depending on them (see Plan defects). The hand-typed 77 in toolbar.js and style-pickers.js matches the fixture (77 nodes) on every route used.
- Message keys, the data-source password, framework-change records and the "run without waiting" process decision -- not screens; out of scope as the plan says. "Change overview..." -- the skeleton draws no such card; no task depends on it.

```
sections/inspector-nothing-selected.js:475: assigns AB.projectCounts; register the project's counts with AB.countSource(dataset, fn)
sections/notes-place.js:471: ""Filtered: " + AB.fx" writes a part of a whole its own way; use AB.count(n, noun, { of })
sections/path-popover.js:310: ""Filtered: " + AB.fx" writes a part of a whole its own way; use AB.count(n, noun, { of })
sections/start-screen.js:30: "3,093 accounts" is typed by hand; read it from AB.fx and write it with AB.count
sections/start-screen.js:31: "300 proteins" is typed by hand; read it from AB.fx and write it with AB.count
sections/start-screen.js:32: "3,000 accounts" is typed by hand; read it from AB.fx and write it with AB.count
sections/start-screen.js:33: "124,318 patents" is typed by hand; read it from AB.fx and write it with AB.count
sections/start-screen.js:36: "3,093 accounts" is typed by hand; read it from AB.fx and write it with AB.count
sections/style-pickers.js:369: "total: "77" is typed by hand; read it from AB.fx and write it with AB.count
sections/style-pickers.js:370: "total: "3,000" is typed by hand; read it from AB.fx and write it with AB.count
sections/style-pickers.js:372: "total: "77" is typed by hand; read it from AB.fx and write it with AB.count
sections/style-pickers.js:375: "total: "77" is typed by hand; read it from AB.fx and write it with AB.count
sections/style-pickers.js:394: ""77", "nodes"" is typed by hand; read it from AB.fx and write it with AB.count
sections/toolbar.js:89: "count: "77" is typed by hand; read it from AB.fx and write it with AB.count
14 counts not written by AB.count
exit 1
```

## Check 9. Every persona has a file

Command: `node tmp/preflight-r7a4/cov.mjs` (it checks study/personas/<id>.md for every persona of every task) and `ls study/personas/`. Exit code 0.

Result: pass. The plan names 16 personas, and each has a file; the focus groups' members are among them.

```
alert-reviewer.md
analyst-alex.md
bioinformatics-researcher.md
cybersecurity-analyst.md
expert-emma.md
explorer-elena.md
fraud-analyst.md
genomics-cytoscape-user.md
gephi-holdout.md
intelligence-analyst.md
knowledge-engineer.md
marketing-analyst.md
ml-engineer-recsys.md
recipe-recipient.md
screen-reader-analyst.md
supply-chain-analyst.md
```

## Check 10. success_criteria carries the round's targets

Read from the plan's success_criteria. Result: pass. It states, in its first paragraph: every top task (the twelve ranked tasks and the three bookends) and each new task (one graph from several tables, weight set at load, labels from a field, notes with no author name, a field found and used among dozens, a graph built from a nested document) at 80 percent graded success or success-with-difficulty; no confirmed severity-4 problem left unresolved; mean SEQ at least 5.5 of 7 over every session; every tree-test task at 70 percent direct success (correct with no backtracking).
