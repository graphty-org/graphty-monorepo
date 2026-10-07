# Round 2 decisions: what changes before round 3

Decided 2026-10-07 by the Design Director from `insights.md`, `scores.md`, the eight design roles'
proposals and the red team's challenge. Every code claim below was checked against the studio
worktree's source on build 4a7a1a7fb.

## The rule for this round

Fix the reproduced defects on a first-time user's core path, one change per problem, in the
package that owns the cause. No redesign. Each change names the test that fails on today's build.
Graph logic goes in graphty-element, shared controls in compact-mantine, words in the app. A change
to graphty-element's public behavior or exports is recorded in `../../owner-decisions.md` before it
lands.

## Changes for round 3, most severe first

Severity uses the study scale (4 = blocks the task or the measurement, 1 = cosmetic).

| # | Sev | Package | Change |
|---|---|---|---|
| 1 | 3 | compact-mantine | A dialog opened from a menu keeps focus |
| 2 | 3 | graphty-element | The key leaves out a layer that is painted over on every node |
| 3 | 3 | graphty-element | Fit in 2D frames the whole graph |
| 4 | 3 | graphty-element and app | Group layouts offer community results |
| 5 | 3 | graphty app | A finished load and a finished run are announced |
| 6 | 3 | graphty-element | The drawing has a name and a visible focus ring |
| 7 | 2 | graphty app | Size "+" opens its picker, as Label "+" does |
| 8 | 2 | compact-mantine | A clickable row's trailing glyph is part of the row |
| 9 | 2 | graphty app | A run is named by its method everywhere |
| 10 | 2 | graphty app | "Show all labels" beside the hidden count |
| 11 | 3 | study tool | Screen-reader mode hears the highlighted option; baselines before fixes |
| 12 | 2 | tasks and answers | Answer key for the new routes; the names task keeps its prompt |

### 1. A dialog opened from a menu keeps focus (compact-mantine, severity 3)

- **What.** Main menu > Export... and Main menu > Keyboard shortcuts open a modal dialog, then
  Mantine's Menu returns focus to the "Main menu" button behind it about 10 ms later
  (`useFocusReturn` in `@mantine/hooks`). Tab then walks Project, Undo and Redo behind the dialog.
  When the dialog closes, it returns focus to the menu item it recorded, which no longer exists,
  so focus drops to the page.
- **Fix.** In compact-mantine's Menu defaults: return focus to the trigger only when focus is still
  inside the dropdown or on the page body. A dialog that has taken focus keeps it. Then remove the
  per-caller `returnFocus={false}` copies the shared fix makes redundant
  (`graphty/src/workspace/style/StyleTab.tsx:355`, and `WorkspaceToolbar.tsx:245` or
  `compact-mantine/src/components/shell/ToolGroup.tsx:114` only if their own reason is covered).
- **Not this fix.** `returnFocus={false}` on `MainMenu`: Escape on the open menu would then drop
  focus to the page. A third per-caller copy is the pattern the repository forbids.
- **Why.** The only reproduced defect that ended a session (r2-s07). A sighted keyboard user's Tab
  also walks controls hidden behind the modal (WCAG 2.4.3). The "focus drops after Done in the
  shortcut dialog" row of `scores.md` has the same cause and is counted with this one.
- **Test.** After Enter on Export..., focus is inside the dialog; after Cancel, focus is on "Main
  menu"; Escape on the open menu returns focus to "Main menu". A compact-mantine story test plus a
  re-run of `repro/r2-s07/repro-menu.sh`.
- **Files.** `compact-mantine/src/theme/components/overlays.ts` (or a Menu wrapper there); the
  callers named above.

### 2. The key leaves out a layer painted over on every node (graphty-element, severity 3)

- **What.** After Degree and then a community run, the key and the exported picture keep "Color:
  Connections" while every node shows its community color (`repro/r2-s56/run/07.png`).
- **Cause, from the code.** graphty-element already detects a full cover: `coveredBy()` in
  `graphty-element/src/session/styles/legend.ts:730` finds the covering layer, but reports it only
  as the English departure `painted over by "<layer>"` (an English string the element should not
  write, issue #867). The app drops the element's English notes, so the fact is lost.
- **Fix.** `styles.legend()` leaves out a block whose channel is covered on every element it
  reaches, and the English sentence goes. A partly covered layer keeps its block, because
  `coveredBy()` only reports full cover. No exported name changes.
- **Trace first.** Read `styles.legend()` after Degree then Louvain: does `covers()` prove the cover
  in this repro? If not, the cover test is the element defect to fix.
- **Before landing.** The old app shell may read the English sentence
  (`graphty/src/components/shell/canvas/`); check it does not break.
- **Owner decision.** A behavior change to a public method: record it in `owner-decisions.md`.
- **Test.** An element test with a full cover (block absent), a partial cover (block present), and
  the r2-s56 repro on the app.

### 3. Fit in 2D frames the whole graph (graphty-element, severity 3)

- **What.** In 2D, Fit (key 0 or View > Fit) zooms into a single edge or letter, with nothing
  selected, and does not recover (`repro/r2-s14/run/06.png`, `repro/r2-s01/run-2d/07.png`).
- **Trace first.** What hands the bounds to `TwoDCameraController.zoomToBoundingBox()`; its math
  looks right, so the suspect is its caller (label meshes, or the wrong space).
- **Test.** After Fit in 2D, every node's screen position is inside the canvas. Story baselines
  for 2D and 3D framing; the owner reviews changed images.

### 4. Group layouts offer community results (graphty-element and app, severity 3)

- **What.** After a community run, Rings by group, Two columns and Columns by group stay disabled
  with "Needs a node attribute to group by". `groupings()` in
  `graphty/src/workspace/layout/methods.ts:83` reads only `session.data.attributes()`, so a result
  never qualifies, and the app is deciding which columns can group a layout, which is graph logic.
- **Fix.** `session.catalog.optionsFor` (`graphty-element/src/session/optionsFor.ts`) already fills
  `values` for "node-id" and "node-set" options with real choices. It also fills `values` for a
  "partition" option: one choice per categorical node column that can group, run results included,
  leaving out key and label columns and any column with a value per node. The app reads those values
  and deletes `groupings()`. No new exported name.
- **Trace first.** Does `layout.set` accept a result's path as `groupBy`? If not, that is part of
  the element fix.
- **Owner decision.** A behavior change to a public method: record it in `owner-decisions.md`.
- **Not taken.** A new element call listing groupable attributes (new API the existing method
  covers); the app filtering `run.fields` itself (keeps graph logic in the app).

### 5. A finished load and a finished run are announced (graphty app, severity 3)

- **What.** The only spoken line about a run is "added, running" (`WorkspaceToolbar.tsx:265`), and a
  load never says it finished or how big the graph is (reproduced in r2-s15, s22, s37, s47).
- **Fix.** The persistent polite status region (`WorkspaceToolbar.tsx`, around line 312) also says
  "Les Miserables: 77 nodes, 254 edges" when the element's load reading clears, and "PageRank
  finished" once when a run's status settles. It replaces the "added, running" line rather than
  adding a second one. The facts come from graphty-element; the words are the app's. Consider
  taking `role="status"` off `canvas/StateCard.tsx`'s title so core-path status has one channel.
- **Not done.** A refused load is still not reported until graphty-element issue #902; no app
  workaround.

### 6. The drawing has a name and a visible focus ring (graphty-element, severity 3)

- **What.** `createCanvas()` in `graphty-element/src/Graph.ts:1389` sets `tabindex="0"` and
  `autofocus` and nothing else: the canvas has no accessible name and no visible focus indicator
  (WCAG 4.1.2, 2.4.7; reproduced in r2-s11, s26).
- **Fix.** The canvas takes its name from the host element's standard `aria-label` (the app writes
  the words, the element stays neutral). Use the browser's default focus ring; find what suppresses
  it. Remove `autofocus` if it pulls focus into the drawing on load (WCAG 2.4.3).
- **Owner decision.** Forwarding the host's `aria-label` changes public behavior: record it. No new
  CSS variable.

### 7. Size "+" opens its picker, as Label "+" does (graphty app, severity 2)

- **What.** A new Size line arrives as a fixed "1" that changes nothing, and links to a result only
  through an unlabeled chain-link icon. 18 of 18 sizing sessions named it, the largest single cost
  to ease on the core path. Removing the empty list in round 2 did not change that share.
- **Fix.** Size "+" opens its from-data picker at once, the pattern Label "+" already uses. "Fixed
  size" stays the first choice, one Enter away. The chain-link icon stays the way back to the list.
  Nothing else on the sizing path changes this round, so a change in round 3 is credited to this.
- **Why this and not the others.** It adds no control and reuses a pattern that works.
- **Files.** `graphty/src/workspace/style/StyleTab.tsx`, `SetLine.tsx`.

### 8. A clickable row's trailing glyph is part of the row (compact-mantine, severity 2)

- **What.** 4 of 6 pointer users clicked the chevron on "Degree 17 >" first and nothing happened
  (`repro/r2-s19/run1/04.png`). `DataRow` draws `trailing` in a slot outside its `<button>`, a slot
  documented for "the row's occasional control".
- **Fix.** In `compact-mantine/src/components/rows/DataRow.tsx`, a clickable row's trailing slot that
  holds no control of its own is part of the row's hit area. A trailing control (a reset, a "+")
  stays separate. Every row with a trailing glyph gets the fix.
- **Not changed.** The Degree row's words, and the Neighborhood command (keyboard routes keep it).

### 9. A run is named by its method everywhere (graphty app, severity 2)

- **What.** Decided for round 2 (`../round-1/decisions.md`, change 11) and never built: the round 2
  plan lists it as unchanged. The outline, inspector, table, key and values still read
  graphty-element's English `run.label` ("Influence", "Connections", "Communities"); 17 sessions
  paused on the swap.
- **Fix.** One app function, `runName(run)`, built from the method's app words
  (`analyze/words.ts` `wordsFor(descriptor).name`), used at every site that prints `run.label`:
  `graph-place/rows.ts`, `inspector/Inspector.tsx`, `NodeValues.tsx`, `RunValues.tsx`, `reads.ts`,
  `table/columns.ts`, `TableDock.tsx`, `style/FromDataList.tsx`, `style/row.ts`,
  `canvas/legendWords.ts`. Keep any scope qualifier the label carried. The TableDock stories that
  expect "Influence" change in the same commit.
- **Not taken.** Renaming only the inspector subtitle (a third naming state).
- The element writing English in `run.label` stays a recorded element defect.

### 10. "Show all labels" beside the hidden count (graphty app, severity 2)

- **What.** "N labels, M hidden to avoid overlap" is true, but leads nowhere: every names session
  hunted for a way to show the hidden names (about 5 wrong turns each); only View > 2D reached 0.
- **Fix.** A "Show all labels" switch, off by default, writes graphty-element's existing
  `layoutBehavior.labels.declutter`, replacing the constant in
  `graphty/src/workspace/frame/ElementHost.tsx:11`. The count shortens to "77 labels, 12 hidden",
  so words at rest do not rise. The name is the one `tier1-design.md` section 2.7 already gives it.
- **Why now.** The element already has the capability; the drawing changes visibly when it is
  turned on, so it is not the round 8 "Show labels" trap; writing element config is the app
  consuming the element. Round 1's reason to wait (test whether the count alone suffices) is
  answered: it does not.
- **Files.** `style/LabelSection.tsx`, `style/words.ts`, `frame/ElementHost.tsx`.

### 11. Screen-reader mode hears the highlighted option; baselines before fixes (study tool, severity 3)

- **What.** `tool/real.mjs` follows `aria-activedescendant` when reporting focus, adds a "read this
  region or dialog" command, and logs a live region inserted already filled as "unconfirmed".
- **Before any fix lands.** Run axe-core and the app-words-at-rest count on build 4a7a1a7fb. Neither
  has ever run; round 1's baseline was lost because fixes replaced the build first.
- **Preflight.** List every decision carried into round 3 as built or not built, checked on the
  served build. The run rename slipped through round 2 this way.
- **Then.** Re-run r2-s07 (the whole first session, screen reader) first.

### 12. Answer key for the new routes; the names task keeps its prompt (tasks and answers, severity 2)

- **What.** Re-record the answer key for: Size "+" opening its picker; the "Show all labels" switch
  as a route to every name (success still needs only the count read correctly, as today); method
  names in place of result names; the group layouts after a community run. Report both the old and
  the new scoring where a route changed.
- **The names task (T10) keeps its prompt.** "Every character's name" is a real first-time goal;
  rewording it to fit the build would stamp a pass on a gap. With change 10 it becomes a fair test
  of that change. No prompt may echo "Show all labels" or "picker".
- No bar changes.

## Not changed, with reasons

- **Force re-applied with a changed spring length leaves a still cloud** (`repro/r2-s40/run/13.png`).
  Cause untraced; a blind fix risks a second bug. Trace it in graphty-element and layout before
  round 3 launches, and file an element issue with the cause; do not hold the round for it.
- **"For print, 4x" is the 2x picture enlarged.** A real element defect
  (`ScreenshotCapture.ts` scales the canvas), off the core path (T13 passed 2 of 2). Fix it in the
  element after the changes above; removing the choice in the app would hide the element defect.
- **Size arriving already bound to the row's result.** On a community run it would size by a group
  id. Change 7 is the one sizing change this round.
- **A word on the chain-link icon, renaming its tooltip, moving Size out of "+".** Two changes on one
  path would confound round 3.
- **Key placement, fitting the camera around the key, a different layout seed.** The overlap is real
  and every user of that sample meets it, but moving the key or insetting the fit needs new element
  API, and the seed is the owner's. Revisit after round 3 as a placement question.
- **"Javert and his 17 connections."** The app cannot know a node's gender, and both counts are true.
- **A hint under the hidden count about zooming.** A notice instead of a fix; change 10 is the fix.
- **One refusal sentence for a damaged file on both routes; Overview deletions ("Edges per node",
  the raw file syntax).** Severity 2, all sessions succeeded; next round.
- **A cue on the Degree row, removing the Neighborhood command, toolbar words, hover tooltips by
  default, raw scores on the key, Analyze wording, "Saved in this browser".** No failure argues for
  them; they are opinions or would add words.
- **The selection ring in an exported current view, and a name behind a dot counted as shown.**
  Not on the core path; the count is literally true.
- **Screen-reader items resting on the study tool's blind spots.** Change 11 first.

## Where this departs from the insights

- **The menu focus defect stays first** at severity 3: a sighted keyboard user's Tab also walks the
  hidden page, and it is the cheapest fix with the strongest evidence.
- **The key fix is not "the key from the live style stack"**: the key already reads it. The element
  already finds a full cover and only says it in English.
- **The names task is not reworded.** It measures change 10.
- **Grouping needs no new element call**: an existing method grows one option type.
