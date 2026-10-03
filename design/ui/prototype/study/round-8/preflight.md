# Round 8 preflight (attempt 9): PASSED

Run on 2026-10-02 from `design/ui/prototype/`, every check done afresh from files and commands. The
round can start. Advisories at the end do not block it.

## Result at a glance

| Check | Result |
|---|---|
| 1. Fresh round folder | pass |
| 2. Every route exists and renders in the participant view | pass (0 of 78 failed) |
| 3. Renders of exactly each task's routes, newer than the skeleton | pass (46 folders match the plan; 0 problems on 143 renders) |
| 4. The study tool proves its own check | pass (no FAIL) |
| 5. Tree outline matches the skeleton and holds only the outline | pass |
| 6. Answers stay away from participants | pass |
| 7. Coverage, domains, datasets, tier 1 share | pass (264 sessions, 169 tier 1 = 64.0 percent) |
| 8. Decided changes not drawn are excluded or flagged | pass |
| 9. Every persona has a file | pass |
| 10. Success criteria carry the round's targets | pass |

## 1. Fresh round folder -- pass

Command: `ls -la study/round-8/`. Exit code: 0. Output:

```
total 64
drwxrwxr-x  2 apowers apowers  4096 Oct  2 18:21 .
drwxrwxr-x 14 apowers apowers  4096 Oct  2 14:00 ..
-rw-rw-r--  1 apowers apowers 34470 Oct  2 18:21 preflight.md
-rw-rw-r--  1 apowers apowers  6901 Oct  2 14:45 tree.md
-rw-rw-r--  1 apowers apowers 11675 Oct  2 15:43 tree-test.md
```

(preflight.md was the previous attempt's report; this file replaces it.)

No directory named sessions/, tree-test/, first-click/ or focus-groups/ exists.

## 2. Every route exists and renders in the participant view -- pass

Command: `timeout 600 node app-b/study.mjs --check <the 78 routes the plan names>` (one batch).
Exit code: 0. Full output:

```
ok   app-b/#/start-screen/first-run (lesmis)
ok   app-b/#/graph-place/at-rest (lesmis)
ok   app-b/#/analyze-popover/open (lesmis)
ok   app-b/#/analyze-popover/essentials (lesmis)
ok   app-b/#/inspector-measure-row/data (lesmis)
ok   app-b/#/inspector-measure-row/style (lesmis)
ok   app-b/#/inspector-selection-and-everything/everything (lesmis)
ok   app-b/#/project-menu/open (lesmis)
ok   app-b/#/export-dialog/image (lesmis)
ok   app-b/#/data-page/graph-file (lesmis)
ok   app-b/#/canvas-and-states/loading (lesmis)
ok   app-b/#/start-screen/wide-first-use (wide)
ok   app-b/#/start-screen/wide-choose (wide)
ok   app-b/#/data-page/wide-hosts (wide)
ok   app-b/#/graph-place/wide (wide)
ok   app-b/#/data-page/refused-ids (lesmis)
ok   app-b/#/inspector-nothing-selected/overview (lesmis)
ok   app-b/#/inspector-nothing-selected/computed (lesmis)
ok   app-b/#/data-place/graph-file (lesmis)
ok   app-b/#/inspector-run-row/data (lesmis)
ok   app-b/#/style-pickers/bind-prop (lesmis)
ok   app-b/#/style-pickers/bind (lesmis)
ok   app-b/#/toolbar/layout-open (lesmis)
ok   app-b/#/inspector-nothing-selected/layout-method (lesmis)
ok   app-b/#/commands-and-search/find-exact (lesmis)
ok   app-b/#/inspector-node/data (lesmis)
ok   app-b/#/selection-bar/neighborhood (lesmis)
ok   app-b/#/export-dialog/data (lesmis)
ok   app-b/#/project-menu/save-as (lesmis)
ok   app-b/#/start-screen/returning (lesmis)
ok   app-b/#/start-screen/disclosure (lesmis)
ok   app-b/#/start-screen/declined (lesmis)
ok   app-b/#/graph-place/empty (lesmis)
ok   app-b/#/data-place/no-sources (lesmis)
ok   app-b/#/graph-place/transfers-loaded (transactions)
ok   app-b/#/data-place/empty-filters (transactions)
ok   app-b/#/inspector-attribute-and-filter-step/step (transactions)
ok   app-b/#/path-popover/from-analyze (lesmis)
ok   app-b/#/path-popover/found (lesmis)
ok   app-b/#/inspector-group-set-path-row/path-lesmis-found (lesmis)
ok   app-b/#/graph-place/many-groups (transactions)
ok   app-b/#/path-popover/transfers-directed (transactions)
ok   app-b/#/path-popover/found-tied (transactions)
ok   app-b/#/inspector-node/why-this-look (lesmis)
ok   app-b/#/notes-place/writing (lesmis)
ok   app-b/#/notes-place/about-selection (lesmis)
ok   app-b/#/inspector-edge/data (lesmis)
ok   app-b/#/notes-place/edge-note (lesmis)
ok   app-b/#/graph-place/louvain-open (lesmis)
ok   app-b/#/inspector-group-set-path-row/community-3 (lesmis)
ok   app-b/#/inspector-group-set-path-row/path-lesmis (lesmis)
ok   app-b/#/notes-place/all (lesmis)
ok   app-b/#/graph-place/path-found (transactions)
ok   app-b/#/inspector-group-set-path-row/path (transactions)
ok   app-b/#/inspector-group-set-path-row/path-notes (transactions)
ok   app-b/#/data-page/people (doorEntries)
ok   app-b/#/data-page/entries (doorEntries)
ok   app-b/#/data-page/entries-pair (doorEntries)
ok   app-b/#/data-page/unmatched-rows (doorEntries)
ok   app-b/#/canvas-and-states/door-entries-loading (doorEntries)
ok   app-b/#/graph-place/door-entries (doorEntries)
ok   app-b/#/data-page/transfers (transactions)
ok   app-b/#/canvas-and-states/transfers-loading (transactions)
ok   app-b/#/inspector-nothing-selected/transfers (transactions)
ok   app-b/#/data-page/buildings (doorEntries)
ok   app-b/#/inspector-nothing-selected/door-entries (doorEntries)
ok   app-b/#/data-page/weight-moved (transactions)
ok   app-b/#/data-place/at-rest (transactions)
ok   app-b/#/data-page/replace (transactions)
ok   app-b/#/data-page/replace-chosen (transactions)
ok   app-b/#/data-place/after-replace (transactions)
ok   app-b/#/data-page/add-rows (transactions)
ok   app-b/#/commands-and-search/find-rule (transactions)
ok   app-b/#/select-where/where (transactions)
ok   app-b/#/context-menus/run-row (lesmis)
ok   app-b/#/views-place/at-rest (lesmis)
ok   app-b/#/views-place/saving (lesmis)
ok   app-b/#/present-mode/presenting (lesmis)
0 of 78 routes failed
```

## 3. Renders of exactly each task's routes, newer than the skeleton -- pass

### 3a. Stored routes against the plan

Command: `node tmp/preflight-r8-a9/routes.mjs` (compares each `shots/tasks/<id>/routes.json` with the
plan's routes for that id, in order, and checks the folder holds exactly 01.png ... NN.png, one per
route). Exit code: 0. Full output:

```
ok   r8-t01: 9 routes match, pngs 01.png,02.png,03.png,04.png,05.png,06.png,07.png,08.png,09.png
ok   r8-t02: 2 routes match, pngs 01.png,02.png
ok   r8-t03: 3 routes match, pngs 01.png,02.png,03.png
ok   r8-t04: 4 routes match, pngs 01.png,02.png,03.png,04.png
ok   r8-t05: 2 routes match, pngs 01.png,02.png
ok   r8-t06: 5 routes match, pngs 01.png,02.png,03.png,04.png,05.png
ok   r8-t07: 5 routes match, pngs 01.png,02.png,03.png,04.png,05.png
ok   r8-t08: 4 routes match, pngs 01.png,02.png,03.png,04.png
ok   r8-t09: 4 routes match, pngs 01.png,02.png,03.png,04.png
ok   r8-t10: 4 routes match, pngs 01.png,02.png,03.png,04.png
ok   r8-t11: 4 routes match, pngs 01.png,02.png,03.png,04.png
ok   r8-t12: 5 routes match, pngs 01.png,02.png,03.png,04.png,05.png
ok   r8-t13: 5 routes match, pngs 01.png,02.png,03.png,04.png,05.png
ok   r8-t14: 6 routes match, pngs 01.png,02.png,03.png,04.png,05.png,06.png
ok   r8-t15: 3 routes match, pngs 01.png,02.png,03.png
ok   r8-t16: 2 routes match, pngs 01.png,02.png
ok   r8-t20: 2 routes match, pngs 01.png,02.png
ok   r8-t20-transactions: 3 routes match, pngs 01.png,02.png,03.png
ok   r8-t21: 4 routes match, pngs 01.png,02.png,03.png,04.png
ok   r8-t21-transactions: 3 routes match, pngs 01.png,02.png,03.png
ok   r8-t22: 6 routes match, pngs 01.png,02.png,03.png,04.png,05.png,06.png
ok   r8-t23: 5 routes match, pngs 01.png,02.png,03.png,04.png,05.png
ok   r8-t23-transactions: 3 routes match, pngs 01.png,02.png,03.png
ok   r8-t24: 6 routes match, pngs 01.png,02.png,03.png,04.png,05.png,06.png
ok   r8-t24-transactions: 4 routes match, pngs 01.png,02.png,03.png,04.png
ok   r8-t25: 5 routes match, pngs 01.png,02.png,03.png,04.png,05.png
ok   r8-t25-transactions: 4 routes match, pngs 01.png,02.png,03.png,04.png
ok   r8-t26: 5 routes match, pngs 01.png,02.png,03.png,04.png,05.png
ok   r8-t30: 3 routes match, pngs 01.png,02.png,03.png
ok   r8-t32: 3 routes match, pngs 01.png,02.png,03.png
ok   r8-t33: 2 routes match, pngs 01.png,02.png
ok   r8-t34: 4 routes match, pngs 01.png,02.png,03.png,04.png
ok   r8-fc01: 1 routes match, pngs 01.png
ok   r8-fc02: 1 routes match, pngs 01.png
ok   r8-fc03: 1 routes match, pngs 01.png
ok   r8-fc04: 1 routes match, pngs 01.png
ok   r8-fc05: 1 routes match, pngs 01.png
ok   r8-fc06: 1 routes match, pngs 01.png
ok   r8-fc07: 1 routes match, pngs 01.png
ok   r8-fc08: 1 routes match, pngs 01.png
ok   r8-fc09: 1 routes match, pngs 01.png
ok   r8-fc10: 1 routes match, pngs 01.png
ok   r8-fc11: 1 routes match, pngs 01.png
ok   r8-fc12: 1 routes match, pngs 01.png
ok   r8-fc13: 1 routes match, pngs 01.png
ok   r8-fc14: 1 routes match, pngs 01.png
0 mismatches; 143 PNGs
```

### 3b. Freshness

Command: `timeout 120 node app-b/study.mjs --fresh r8-t01 ... r8-fc14` (all 46 ids). Exit code: 0.
Full output:

```
0 problems on 143 renders
```

The newest skeleton file is `app-b/sections/inspector-run-row.js` (18:17:24); the renders date from
18:22 onward.

## 4. The study tool's own check is sound -- pass

Command: `timeout 300 node app-b/study.mjs --prove`. Exit code: 0. `grep -c FAIL`: 0. Full output:

```
ok   a good route passes
ok   an unknown section fails: no section "no-such-section" (the manifest lists the sections; --list shows every route)
ok   an unknown state fails: section graph-place has no state "no-such-state" (its states: at-rest, empty, door-entries, louvain-open, many-groups, rerun-failed, transfers-loaded, door-entries-path, door-entries-running, path-found, transfers-running, running, queued, finished, partial, failed, solo, everything-hidden, show-hidden, scope-mark, out-of-date, invalid-drop, find, list-menu, list-menu-on, rename, rename-chain, rename-run-group, rename-builtin, rename-run-disabled, notes-eye-off, find-no-match, one-group, long-names, wide, wide-sized, nested, nested-set, plain-json, registry, painted)
ok   a stub fails: section prove-stub is a stub (no render)
ok   --type types into a focused box
nothing that takes text has focus (focus is on h2 "Data"); typed nothing, not "abc"
ok   --type with nothing that takes text focused fails
ok   a ctrl-click keeps two rows selected
ok   a shift-click adds a second row
ok   a plain click keeps one row selected
ok   a reviewer word in text or a tooltip fails, one in a design note does not
ok   an unknown step is refused with exit 2
```

## 5. Tree outline -- pass

Read `study/round-8/tree.md` and `study/round-8/tree-test.md` in full.

- Outline only. Command: `grep -nE '[a-z]+-[a-z]+/[a-z]|#/|app-b|correct|Correct|answer|score|Tree [0-9]|tree-[0-9]|Prompt|badge|swipe|April|March|country|Excel|slides|Downloads|colleague' tree.md`.
  Exit code: 1 (no match). So no route, section id, answer list, scoring, prompt text or example
  a tree task names is in the outline.
- Matches the skeleton. Command: `node tmp/preflight-r8-a9/tree-labels.mjs` (looks up every outline
  label verbatim in app-b's source). 11 lines did not match verbatim, and each is a description, not
  a label: "Usage data card (first launch only)", "Project name (click it for its menu)", "Graph
  switcher" (twice), "Shortest paths, opening to each one found", "To ->", "Legend card (top left)",
  "Right-click on empty canvas", "Right-click on a node", "Nodes | Edges", "Values or Members (with
  Top 10)". A second search found "Shortest paths", "To", "From", "Values", "Members", "Motion",
  "Pause layout" and "Resume layout" in the source. Every other label was found verbatim. The
  outline's regions (start screen, header with main menu and project-name menu, rail Graph / Data /
  Views / Notes / Assistant, the Data page, canvas menus, toolbar tooltip names, selection bar,
  inspector Style / Layout / Data tabs, table) are the regions the skeleton draws.

## 6. Answers stay away from participants -- pass

- Every task scenario, tree prompt and first-click prompt was read against the words on its
  target. None names its answer or the label on the target: the scenarios say "picture file",
  "names written next to its dot", "a different way of arranging", "go-betweens", "the smallest
  number of other accounts", "reminders", "in place of March's", "hold both months", "pick out ...
  all at once", "by itself", "keep that exact angle", where the controls say Export / Image,
  Label, Layout / Method, Shortest path / Path between / "None (fewest steps)", Add note, Replace
  with file..., Add rows from file..., Select where, Show only this row, Save view and Present.
  The one near-echo is listed under Advisories.
- Participant view: check 2 (`--check`) fails any route that shows the review bar or a reviewer
  word; none did. Renders read directly: r8-t01/01, r8-t26/01, r8-t24/01, r8-fc14/01, r8-fc05/01
  and r8-fc06/01 show no review bar, no design notes and no section or state names.
- r8-t26/01 (the grouped March transfers, also the first screen of r8-t21-transactions and r8-t30)
  reads "Data version: March" in the Louvain inspector; nothing on it says April is in place.
- Every 01.png is a start state: the first routes are start-screen/first-run,
  start-screen/wide-first-use, graph-place/empty, graph-place/at-rest,
  graph-place/transfers-loaded, graph-place/many-groups, graph-place/louvain-open,
  graph-place/path-found, data-page/people, data-page/entries, data-page/transfers, and for
  first-click the screen the prompt is asked on.
- Render names are 01.png, 02.png ... (check 3a); none carries a route. Task and first-click ids
  are numbered and name no answer.

## 7. Coverage -- pass

Every coverage key has a task whose routes exercise it: first-session r8-t01 (ends on
export-dialog/image after analyze and style routes); sample r8-t02; load r8-t03 (data-page/graph-file),
r8-t04 (start-screen/wide-choose, data-page/wide-hosts), r8-t05 (data-page/refused-ids);
characterize r8-t06 (inspector-nothing-selected/overview, data-place/graph-file); rank r8-t07
(inspector-measure-row/data); communities r8-t08 (inspector-run-row/data); color-size r8-t09
(style-pickers/bind-prop); labels r8-t10 (style-pickers/bind); layout r8-t11 (toolbar/layout-open,
inspector-nothing-selected/layout-method); find-explore r8-t12 (commands-and-search/find-exact,
inspector-node/data, selection-bar/neighborhood); export r8-t13 (export-dialog/image and /data);
save r8-t14 (project-menu/save-as, start-screen/returning); filter r8-t20, r8-t20-transactions
(inspector-attribute-and-filter-step/step); path r8-t21, r8-t21-transactions; note r8-t22, r8-t23,
r8-t23-transactions; multi-table r8-t24, r8-t24-transactions; weight r8-t25, r8-t25-transactions;
reuse r8-t26.

Persona domains, read from each file in `study/personas/`: alert-reviewer bank compliance;
analyst-alex logistics analytics; bioinformatics-researcher drug discovery; class-project-student
university coursework; cybersecurity-analyst IT security; cytoscape-holdout molecular biology
research (core facility); data-journalist journalism; expert-emma network science research;
explorer-elena product management; fraud-analyst bank fraud investigation;
gene-ontology-cytoscape-user gene function research; genomics-cytoscape-user genomics (cancer
genomics lab); gephi-holdout computational social science; intelligence-analyst law enforcement
intelligence; knowledge-engineer enterprise knowledge graphs; marketing-analyst marketing;
ml-engineer-recsys machine learning engineering; nonprofit-operations-analyst nonprofit
operations; recipe-recipient cell biology lab; screen-reader-analyst public health research
(epidemiology); supply-chain-analyst supply chain. Each persona is a different domain, and every
covering task has at least 4 personas, so every covering task spans at least two domains.

No coverage key this round is wide-field or nested-json, so that clause has nothing to check.

Datasets and session shares. Commands: `timeout 120 node app-b/study.mjs --list` (exit 0, 659 rows,
saved as `tmp/preflight-r8-a9/list.txt`), then `node tmp/preflight-r8-a9/datasets.mjs` (compares
each task's plan datasets with the dataset column of its stored routes and sums persona counts).
Exit code: 0. Full output:

```
ok   r8-t01: plan lesmis, routes draw lesmis, first start-screen/first-run, sessions 21
ok   r8-t02: plan lesmis, routes draw lesmis, first start-screen/first-run, sessions 10
ok   r8-t03: plan lesmis, routes draw lesmis, first start-screen/first-run, sessions 10
ok   r8-t04: plan wide, routes draw wide, first start-screen/wide-first-use, sessions 10
ok   r8-t05: plan lesmis, routes draw lesmis, first start-screen/first-run, sessions 8
ok   r8-t06: plan lesmis, routes draw lesmis, first start-screen/first-run, sessions 12
ok   r8-t07: plan lesmis, routes draw lesmis, first start-screen/first-run, sessions 12
ok   r8-t08: plan lesmis, routes draw lesmis, first start-screen/first-run, sessions 12
ok   r8-t09: plan lesmis, routes draw lesmis, first start-screen/first-run, sessions 12
ok   r8-t10: plan lesmis, routes draw lesmis, first start-screen/first-run, sessions 12
ok   r8-t11: plan lesmis, routes draw lesmis, first start-screen/first-run, sessions 10
ok   r8-t12: plan lesmis, routes draw lesmis, first start-screen/first-run, sessions 12
ok   r8-t13: plan lesmis, routes draw lesmis, first start-screen/first-run, sessions 12
ok   r8-t14: plan lesmis, routes draw lesmis, first start-screen/first-run, sessions 10
ok   r8-t15: plan lesmis, routes draw lesmis, first start-screen/first-run, sessions 6
ok   r8-t16: plan lesmis, routes draw lesmis, first graph-place/empty, sessions 6
ok   r8-t20: plan lesmis, routes draw lesmis, first graph-place/at-rest, sessions 6
ok   r8-t20-transactions: plan transactions, routes draw transactions, first graph-place/transfers-loaded, sessions 6
ok   r8-t21: plan lesmis, routes draw lesmis, first graph-place/at-rest, sessions 6
ok   r8-t21-transactions: plan transactions, routes draw transactions, first graph-place/many-groups, sessions 6
ok   r8-t22: plan lesmis, routes draw lesmis, first graph-place/at-rest, sessions 6
ok   r8-t23: plan lesmis, routes draw lesmis, first graph-place/louvain-open, sessions 5
ok   r8-t23-transactions: plan transactions, routes draw transactions, first graph-place/path-found, sessions 5
ok   r8-t24: plan doorEntries, routes draw doorEntries, first data-page/people, sessions 7
ok   r8-t24-transactions: plan transactions, routes draw transactions, first data-page/transfers, sessions 5
ok   r8-t25: plan doorEntries, routes draw doorEntries, first data-page/entries, sessions 6
ok   r8-t25-transactions: plan transactions, routes draw transactions, first data-page/transfers, sessions 5
ok   r8-t26: plan transactions, routes draw transactions, first graph-place/many-groups, sessions 7
ok   r8-t30: plan transactions, routes draw transactions, first graph-place/many-groups, sessions 5
ok   r8-t32: plan transactions, routes draw transactions, first graph-place/transfers-loaded, sessions 5
ok   r8-t33: plan lesmis, routes draw lesmis, first graph-place/at-rest, sessions 5
ok   r8-t34: plan lesmis, routes draw lesmis, first graph-place/at-rest, sessions 4
sessions 264, tier 1 169 (64.0 percent); 0 dataset mismatches
```

Tier 1 (r8-t01 to r8-t15) is 169 of 264 sessions, 64.0 percent, above 60. Every tier 1 task starts
on the empty app (start-screen/first-run, or start-screen/wide-first-use for r8-t04, which --list
gives as the IT estate's start screen). No task or first-click id names its answer.

## 8. Decided changes not drawn -- pass

Each decided change was matched to the tasks whose routes pass it.

| Decided change not drawn | Tasks that depend on it | Flagged in the plan? |
|---|---|---|
| Weight "Higher means" control on an edge table before Pair | r8-t25 | yes |
| (empty change) | none | -- |
| Run settings in the kind line | r8-t08 | yes (r8-t23 starts on graph-place/louvain-open but does not read the kind line) |
| Many groups: about ten listed, one wording for the rest | r8-t21-transactions (start) | yes (r8-t26, r8-t30 start there but do not read it) |
| Tied ranks ("3=") | r8-t07 | yes |
| Result under a filter states its scope | none | -- |
| Everything row base color and base lines | r8-t01, r8-t10 | yes |
| Bind icon at rest on Color, Size, Label (both entries) | r8-t01, r8-t09, r8-t10, coloring focus group | yes |
| Notes row look and label paint only noted elements | none | -- |
| Quick actions command glyph | r8-fc08 | yes |
| "Pause layout" / "Resume layout" tooltip | r8-t11 | yes |
| Body-text contrast for Data place file and step lines | r8-t20, r8-t20-transactions, r8-t26, r8-t30, r8-fc14 | yes, all five |
| Counted noun on every count | r8-t06 | yes |
| Counts typed by hand / one formatter / one fixture per dataset | none (see below) | -- |
| One delete notice | r8-t33 | yes |
| Reopen with the saved selection | r8-t14 | yes |
| No screen to test (note value, recipe-opened network, message keys, feedback log, records, recipe format, wording on two domains, tiering, running without the owner's review) | none | -- |

Counts typed by hand. Command: `timeout 120 node app-b/study.mjs --counts`. Exit code: 1. The
hand-typed counts are in the nested research network's counts (inspector-nothing-selected.js:573,
inside `nestedCounts`), the layout popover on the nested dataset (line 698, `ds === "nested"`) and
the style comparison screen's Group 2 (style-tab-same-panel.js:47). No task or first-click route
draws the nested dataset or style-tab-same-panel. The two delete notices are on the run row's
Delete (context-menus/run-row, flagged in r8-t33) and the run inspector's Delete, which no task
asks for. Full output:

```
sections/context-menus.js:210: "", its 6 c" words a delete notice its own way; a tree row's Delete is AB.deleteRow(name), any other names its count with AB.count
sections/inspector-nothing-selected.js:573: "? 514" types the fixture count 514 by hand; read it from the fixture
sections/inspector-nothing-selected.js:573: ": 510" types the fixture count 510 by hand; read it from the fixture
sections/inspector-nothing-selected.js:573: "? 242" types the fixture count 242 by hand; read it from the fixture
sections/inspector-nothing-selected.js:573: ": 118" types the fixture count 118 by hand; read it from the fixture
sections/inspector-nothing-selected.js:698: "? 200" types the fixture count 200 by hand; read it from the fixture
sections/inspector-run-row.js:666: "deleted("Louvain and " +" words a delete notice its own way; a tree row's Delete is AB.deleteRow(name), any other names its count with AB.count
sections/style-tab-same-panel.js:47: "AB.count(28" types the fixture count 28 by hand; read it from the fixture
8 problems: counts not written by AB.count, banned scope strings, reviewer words
```

## 9. Every persona has a file -- pass

Command: `ls study/personas/`. Exit code: 0. All 21 plan personas, and every focus-group member,
have a file: alert-reviewer, analyst-alex, bioinformatics-researcher, class-project-student,
cybersecurity-analyst, cytoscape-holdout, data-journalist, expert-emma, explorer-elena,
fraud-analyst, gene-ontology-cytoscape-user, genomics-cytoscape-user, gephi-holdout,
intelligence-analyst, knowledge-engineer, marketing-analyst, ml-engineer-recsys,
nonprofit-operations-analyst, recipe-recipient, screen-reader-analyst, supply-chain-analyst.

## 10. Success criteria -- pass

The plan's success_criteria opens with the round's targets word for word: at least 80 percent
graded success or success-with-difficulty on every tier 1 and tier 2 task, no unresolved confirmed
severity-4 problem, mean ease (SEQ) at least 5.5 of 7 over every session, at least 70 percent
direct success on every tree task, and tier 1 first.

## Advisories (do not block the round)

- r8-t26's scenario says the work should "run again" on April's numbers; the last step of its
  success path is the Louvain inspector's Rerun. The graded step is finding Replace with file...,
  which the scenario does not echo, and the rerun is "reruns or says they would". Graders should
  not credit a participant who goes to Rerun before replacing the data.
- r8-fc05 (the "+" on Label, on the Everything row) and r8-fc06 (the "+" on Shape, on the PageRank
  row) are asked on Style tabs where the decided bind icon at rest is not drawn. Label and Size are
  behind "+" under the decision too, so the correct click does not change, but a bind icon at rest
  on the Color line would be one more thing to click. Graders should log a participant who looks
  for a control on the Color line.
- Quick actions is drawn as a lightning bolt. r8-fc08 is flagged; r8-t12, r8-fc03 and r8-fc09 also
  accept Quick actions but each has another correct way.
- r8-t25's success line names a weight "Number of rows per pair"; the screen says "Weight: count,
  the number of rows per pair" once One edge per is Pair. Pair is already a success, so grading is
  unaffected.
- Twenty-one simulated participants share blind spots; tree-test.md already says a failed tree task
  is a strong signal and a passed one a weak one.
