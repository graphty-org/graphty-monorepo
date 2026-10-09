# Tier 2 round 1 decisions: what changes before round 2

Decided 2026-10-09 by the Design Director from `insights.md`, `scores.md`, the eight design roles'
proposals and the red team's challenge. Every code claim below was checked against the studio
worktree's source (branch design/studio-tier1), which is the frozen study build 946256efb plus
notes only.

## Was there a dry run, and did participants hit implementation faults?

Yes. Every task was walked on both datasets on four builds in a row, each build's faults fixed
before the next (`../../dry-run-r1-1.md` to `../../dry-run-r1-4.md`), then walked once more on the
frozen study build (`../r1d4/pilot/`). On the routes those walks followed, no participant met a
broken control: every `session.log` is empty, no grade was decided by a build defect, and the three
sessions that did not succeed stopped on where a feature lives, on controls that work.

It did not do its whole job, for three reasons:

- **It walked only the answer key's routes.** Participants who took the commonest detours met build
  defects there: adding Color under Edges while a run's style is open writes it to Everything; the
  selection halo tints a node's own color; focus falls to the page after Add step and Delete step;
  Enter does not commit a step edit. A scripted walk of the same detours would have found each one.
- **It was walked by pointer only.** No keyboard or screen-reader walk, so the focus faults reached
  the expert walkthrough instead of being fixed first.
- **The study tool was not dry-run at all.** The tool reached participants more often than the
  build did: more than four sessions alive at once (load average about 158, click timeouts in
  r1-s14, r1-s16 and r1-s46), wrong-row matches (r1-s30, r1-s44), a synthetic file drop that did
  nothing on screen (r1-s29), a void session never re-run (r1-s04), two follow-ups never sent
  (r1-s22, r1-s23), facilitator files read by a participant (r1-s03). And the scripts that bars 2,
  7, 8 and 9 are scored by were never built, so those bars could not hold whatever the sessions
  showed.

Round 2 therefore starts only after changes 1 to 3 below: the tool fixed, the missing scripts
built, and a dry run that walks each task's commonest detours by pointer and by keyboard on the
new frozen build.

## The rule for this round

Fix the measurement first, then the reproduced defects, then one door per confirmed problem. Each
change adds at most one way into a feature's existing place, so round 2 can credit each change on
its own; no feature moves. Graph logic goes in graphty-element, shared controls in compact-mantine,
words and arrangement in the graphty app. Words at rest do not rise: round 2 adds one menu ("..." on
the source's inspector) and one out-of-date mark on the canvas key; every other change shows only
after the reader acts. Answer-key changes do not change a bar.

## Changes for round 2, most severe first

Severity uses Nielsen 0 to 4; a measurement fault that voids a bar is rated 4.

| #   | Sev | Package          | Change                                                                      | Tasks              |
| --- | --- | ---------------- | --------------------------------------------------------------------------- | ------------------ |
| 1   | 4   | study tool       | Four sessions alive at most, exact matches, real file drop, every follow-up | all                |
| 2   | 4   | study tool       | Build the scripts bars 2, 7, 8 and 9 are scored by                          | all                |
| 3   | 4   | study tool       | The dry run walks the detours, by pointer and by keyboard                   | all                |
| 4   | 3   | graphty app      | Find answers a typed condition with the rule that would read it             | T22                |
| 5   | 3   | graphty app      | The source's inspector has the "..." menu with Replace and Edit source      | T21, T20           |
| 6   | 3   | graphty app      | A data file opened from the start screen goes through the Data page         | T20, T4            |
| 7   | 3   | graphty app      | Focus and keys in the filter step editor and the find box                   | T17, T22           |
| 8   | 3   | graphty app      | The words after a load are true and spoken once                             | T4, T21, T18       |
| 9   | 3   | graphty app      | Long names in the find list end with "..." and show whole on hover          | T18, T22, T23      |
| 10  | 2-3 | graphty app      | The canvas key says ", out of date" for an out-of-date run                  | T21                |
| 11  | 2   | graphty app      | Style lines go only to a layer the row names; no silent Everything          | T22, T24 (detours) |
| 12  | 2   | graphty-element  | The selection halo rings a node without tinting it                          | T18, T24 (detours) |
| 13  | 2   | graphty app      | The path's Weight list starts on the loaded weight                          | T20, T18           |
| 14  | 2   | graphty app      | Four word fixes on the path and Replace screens                             | T18, T20, T21      |
| 15  | --  | tasks-or-answers | Answer key for the new routes; graders label scripted persona exits         | T20, T21, T22, T18 |

### 1. Four sessions alive at most, exact matches, real file drop, every follow-up (study tool, severity 4)

- **What.** More than four sessions were alive at once, with a load average of about 158 and click
  timeouts in r1-s14, r1-s16 and r1-s46. The mechanism is not yet named. `real.mjs` already starts
  each session inside `with-browser.sh` and holds the slot until `--end`, so either something
  launched browsers outside the gate (an expert walkthrough, a setup or bars script, a
  `BROWSER_SLOTS` override in a caller's environment), or the load came from something other than
  the browsers. "Load" is not the explanation. The tool's text matcher took the first partial match
  ("Enjolras" row; the Sources row against the panel heading). The file drop dispatches synthetic
  events the app ignores. r1-s04 is void and was not re-run; two T18 sessions got no follow-up; one
  participant read the facilitator files.
- **Fix.** First name the overrun's mechanism from the round's process records and the slot lock
  files, then close that path: every browser launch on the machine goes through the gate, and the
  gate refuses a `BROWSER_SLOTS` above 4. The matcher refuses an
  ambiguous match and names the candidates instead of taking the first. File drop uses a real
  file chooser or Playwright's `setInputFiles` on the drop target; where it cannot, the tool prints
  that the drop was not delivered. The runner sends the follow-up prompt on every successful T17
  and T18 session and refuses `--end` without it. Participants' working folders hold only their
  briefing and persona: facilitator notes, answers and avoided words live outside it.
- **Acceptance.** Starting six sessions shows at most four alive at every sample of a one-second
  poll; an ambiguous click is refused with the candidate list; a file drop on the start screen
  opens the file in a real browser; r1-s04 re-run as r1-s04b; a check that the participant folder
  contains no facilitator file. The overrun's mechanism written in `../../../tool/README.md`.
- **Files.** `design/ui/studio/tool/with-browser.sh`, `design/ui/studio/tool/real.mjs`, the session
  runner, `design/ui/studio/tool/README.md`.

### 2. Build the scripts bars 2, 7, 8 and 9 are scored by (study tool, severity 4)

- **What.** The open-work lister (bar 2), the weight script (bar 7 part a), the accessibility and
  duplicate-name and focus-drop checks on tier 2 screens (bar 8) and the word count at rest on tier
  2 screens (bar 9) were never built; `--prove` never reached 5 clean runs.
- **Fix.** Build each in `tool/bars.mjs` (or beside it) with one planted failure each, so a check
  that reads zero items fails. The focus check presses Add step, Delete step and Escape in the find
  box and fails when `document.activeElement` is the body.
- **Acceptance.** Each script fails on its planted case and runs clean or reports on the new build;
  five `--prove` runs in a row, or the first-save fault's cause named.
- **Files.** `design/ui/studio/tool/bars.mjs`, `design/ui/studio/tool/real.mjs`.

### 3. The dry run walks the detours, by pointer and by keyboard (study tool, severity 4)

- **What.** The dry run walked only the answer key's routes.
- **Fix.** Before round 2, on the new frozen build, walk each task's success path plus its two
  commonest wrong turns from round 1, and press Enter, Tab and Escape in every field opened, once by
  pointer and once by keyboard: styling an edge from a run's Style tab (T22, T24); recoloring a
  selected node and selecting a path node (T18, T24); typing a condition in find (T22); opening the
  trail and bus files with "Open project or file..." from the start screen and from inside a project
  (T20); left-clicking the source row (T21); the toolbar and Analyze list for filtering (T17).
  The tool runs the same detours. Write the T18 B walk's report on the new build. Give the
  one-session faults a script before calling them defects: the Analyze popover not closing on a
  canvas click or Escape (r1-s16) and the import page's thin Direction list (r1-s06). Measure edge
  width against its number with a script (`graphty-element/src/meshes/EdgeMesh.ts` scales by *20
  and /40) before anyone calls it a defect.
- **Acceptance.** A written dry-run report on the new build listing every detour walked, with no
  open item that a participant could hit on a task path; each script above either reproduces its
  fault (then it is fixed) or does not (then it is dropped).
- **Files.** `design/ui/studio/tier2/dry-run-r2-1.md` (new), `../../tasks.md` (detours listed per
  task, facilitator side only).

### 4. Find answers a typed condition with the rule that would read it (graphty app, severity 3)

- **What.** 4 of 4 participants typed a condition into find (`minutes >= 10`, `shared_chapters >=
10`) and got only `No match for "..."` (`sessions/r1-s46/12.png`). T22 is the only task below its
  success floor (3 of 4; median 25 steps against 3).
- **Fix.** When plain text finds nothing, the app asks the element whether `"=" + text` is a rule,
  with the same `session.scope.count({ where })` call `ruleVerdict` already makes. If the element
  accepts it, or refuses it only with `reason: "number-needs-backticks"`, the empty line becomes
  "To select by a value, start with =, such as <example>", the example from the existing
  `exampleRule`, in monospace. Otherwise the line stays "No match". The app reads no rule syntax:
  the element decides whether the text is a rule.
- **Not now.** "Select where..." on a column's menu and a live "Select where" row: the decision fixed
  before the round says they come only if the words fail. Shipping them now would also mix their
  effect with the hint's. Accepting bare numbers stays on the owner list (it changes what an
  existing API accepts).
- **Acceptance.** A test types `minutes >= 10` on the trail data and reads the hint with a real
  column in the example; `Ava` with no match still reads "No match"; the hint is in the field's
  `aria-describedby`.
- **Files.** `graphty/src/workspace/graph-place/FindBox.tsx` (the empty line, about line 355).

### 5. The source's inspector has the "..." menu with Replace and Edit source (graphty app, severity 3)

- **What.** 8 of 8 participants bringing in a newer file hunted for Replace (median 9 steps against
  6). A left click on the source shows its facts only (`sessions/r1-s29/08.png`); the source's
  inspector is the only one with no "..." header menu, while the graph, node, run and attribute
  inspectors have one.
- **Fix.** Give the source kind the inspector's header menu, holding "Edit source..." and "Replace
  with file..." under the same labels and the same `canReplace` rule as the row's right-click menu.
  Share the verbs the way an attribute's are shared (`attributeActionsOf`), so the two menus cannot
  drift. The right-click menu stays.
- **Not this fix.** Visible buttons in the inspector body: they add words at rest.
- **Acceptance.** Left-click the source, open "...", choose Replace with file..., reach the Replace
  page; on a graph of two loads the menu offers Edit source... only, as the row does.
- **Files.** `graphty/src/workspace/inspector/kindMenus.ts`, `inspector/Inspector.tsx`,
  `data-place/DataPlace.tsx` (`useRowMenu`).

### 6. A data file opened from the start screen goes through the Data page (graphty app, severity 3)

- **What.** One command does two things. "Open project or file..." inside a project sends a data
  file to the Data page; from the start screen it loads the file at once
  (`project/actions.ts`, `openInSession` with `fresh`: `report.draft?.load({ mode: "replace" })`),
  so nothing asks what a weight means and nothing says it was not read. All 7 T20 participants took
  this route; T20 costs 23 steps against a 22-step limit.
- **Fix.** In `openInSession`, a data file on the fresh route disposes the draft and opens the Data
  page as "New from data..." does, with the file already chosen, so the page asks "Higher means"
  before anything loads. A project file still opens at once.
- **Not this fix.** "Higher means" on the column, "Set what higher means...", or "New from data..."
  in the main menu: each is a second home for a fact set at load, and the column version needs an
  element API that does not exist. Making "Back to start" undoable: it already asks before
  discarding unsaved changes (`ProjectDialogs.tsx`, `DiscardDialog`); a just-opened file has none.
- **Risk.** Opening one's own file from the start screen gains one step (Load). The dry run (change 3) re-walks tier 1's open-your-own-file task and confirms it still meets its bar.
- **Acceptance.** From the start screen, opening `trail.csv` shows the Data page titled for a new
  graph with "Higher means" unanswered; opening a `.graphty` project still opens it directly.
- **Files.** `graphty/src/workspace/project/actions.ts`, `data-page/request.ts` (`openDataPage`).

### 7. Focus and keys in the filter step editor and the find box (graphty app, severity 3)

- **What.** Focus falls to the page after Add step, after deleting a step, and after a second Escape
  in the find box (`expert/a11y/filter-sr/62.png`, `filter-sr/139.png`, `path-sr/68.png`), which
  fails WCAG 2.4.3 and bar 8. Enter in a step edit leaves the old count on screen; Escape does not
  close the editor (`expert/figma/filter/13.png`, `15.png`). Two "Delete note" buttons share one
  name (`expert/a11y/path-sr/44.png`).
- **Fix.** Focus goes to the new step after Add step; to the next row, or the Filters "+", after a
  delete; to the find box after the Escape that clears it. Enter commits a step edit, Escape closes
  it. Each note's delete button is named after its note ("Delete note: Call Farah Monday").
- **Acceptance.** The bar 8 focus script (change 2) passes on all three actions; a test presses
  Enter in a step edit and reads the new count; no two reachable controls share a name.
- **Files.** `graphty/src/workspace/data-place/Filters.tsx`, `graph-place/FindBox.tsx`, the note card
  in the Notes place.

### 8. The words after a load are true and spoken once (graphty app, severity 3)

- **What.** After Load the status line reads "Untitled: 12 nodes, 22 edges" while the header says
  "people and messages", never says a row was left out, and is mounted already filled, so many
  screen readers say nothing (`expert/a11y/import-sr/27.png`). The "Add to" page's summary puts the
  combined edge total under the new file's name (`sessions/r1-s29/05.png`). The Replace notice says
  "N rows out of date" when it means runs. The run state bar's live region wraps its buttons
  ("RunningCancel"), and the find box's rule refusal is `role="alert"`, so it is spoken again on
  every keystroke.
- **Fix.** The status line uses the header's name (`headerName`) and the element's load report:
  "people and messages: 12 nodes, 22 edges, 1 row left out", written into the one persistent polite
  region after the place mounts. The Add summary gives each file its own counts. "N runs out of
  date". The run state bar's region holds its words only; the rule refusal is polite.
- **Acceptance.** A screen-reader walk (`--sr`) of T4 hears the line once with the left-out count;
  the r1-s29 add shows the new file's own edge count; typing a refused rule is announced once.
- **Files.** `graphty/src/workspace/project/actions.ts`, `WorkspaceToolbar.tsx`,
  `data-page/words.ts` (`replacedWords`, the Add summary), `inspector/RunValues.tsx`,
  `graph-place/FindBox.tsx`.

### 9. Long names in the find list end with "..." and show whole on hover (graphty app, severity 3)

- **What.** With long names the find results are cut with no ellipsis and the list scrolls sideways
  (`expert/engineer/1200x900/long/18.png`, `expert/visual/longnames/05.png`); three experts, bar 10.
- **Fix.** Each result row ends a long name with "..." and shows the whole name on hover; the list
  never scrolls sideways. If the row is the shared compact-mantine row, the fix goes there
  (`EllipsizedName`), not in an app tooltip.
- **Acceptance.** The long-names dataset (`tool/files/long-names.csv`) shows no horizontal scroll in
  the find list and every cut row ends with "...".
- **Files.** `graphty/src/workspace/graph-place/FindBox.tsx`, `graph-place/graph-place.css`, or
  compact-mantine's row.

### 10. The canvas key says ", out of date" for an out-of-date run (graphty app, severity 2 to 3)

- **What.** After Replace and before Rerun, the key and the drawing stay at full contrast; the only
  marks are a gray clock on the run's row and a bar inside its inspector (`sessions/r1-s28/07.png`).
  Bar 5 fails on it as written; two experts found it independently; no participant was misled.
- **Fix.** A key section whose layer belongs to an out-of-date run gets the words the run list
  already uses: "Size: PageRank, out of date", from the element's `run.stale` fact.
- **Not this fix.** Warning colors, a dimmed Top 10, a colored clock and a dimmed range: four marks
  for one state. Dimming the drawing from the app would change appearance outside the style layers.
- **Acceptance.** After Replace the key title carries ", out of date"; after Rerun it does not.
- **Files.** `graphty/src/workspace/canvas/legendWords.ts`, `canvas/LegendCard.tsx`.

### 11. Style lines go only to a layer the row names; no silent Everything (graphty app, severity 2)

- **What.** Adding Color under Edges while a PageRank run's Style tab is open writes the color to
  Everything, and the open panel shows nothing (r1-s43, r1-s46; `sessions/r1-s46/05.png`). Cause:
  `writeLine` (`style/row.ts`) falls back to a new Everything layer when the row has no layer for
  that side, and the run's Style tab passes no other (`StyleTab.tsx`, `SetLine.tsx`,
  `LabelSection.tsx` all pass `fresh` through, undefined for a run).
- **Fix.** Remove `writeLine`'s default, so every caller names the layer a first edit adds (the
  Everything row passes the Everything layer, a selection passes its selection layer). A row with
  no layer for a side and no layer to add offers no lines for that side: a PageRank run shows no
  Edges segment; a path run, whose layers style edges, keeps both. This also follows the rule that
  an algorithm's style writes only to its own result.
- **Acceptance.** A test opens a PageRank run's Style tab and finds no Edges segment; Everything's
  and a selection's Style tabs add edge color to their own layers as before.
- **Files.** `graphty/src/workspace/style/row.ts`, `style/StyleTab.tsx`, `style/SetLine.tsx`,
  `style/LabelSection.tsx`.

### 12. The selection halo rings a node without tinting it (graphty-element, severity 2)

- **What.** A selected node is seen through a 40% gold sphere drawn with both faces
  (`graphty-element/src/Node.ts`, `createOverlaySource`, `backFaceCulling = false`), so black path
  nodes read olive and a new orange fill reads mustard until the selection is cleared
  (`expert/visual/path/10.png`; r1-s19, s23, s51, s52, s54). The halo's own documentation says it
  is a ring around the node, so this is a rendering defect, not a design choice and not an API
  change.
- **Fix.** Draw only the halo's back faces, so the node in front keeps its color and the ring shows
  around it. Check the case the code comment names: with the camera inside the halo the inner faces
  are back faces and still draw.
- **Acceptance.** A browser test selects a black node and samples its center pixel: within a small
  tolerance of unselected black, while the ring pixels outside the node are the selection color;
  the camera-inside case still shows the halo. Visual baselines that show a selection change and go
  to the owner's visual review.
- **Files.** `graphty-element/src/Node.ts`.

### 13. The path's Weight list starts on the loaded weight (graphty app, severity 2)

- **What.** With `minutes (farther)` loaded, the path's Weight list starts on "None" (4 sessions), so
  a reader who sets the meaning at load still sees it ignored on the path.
- **Fix.** The list starts on the weight the element reports as loaded (`descriptor.weightMeaning`),
  "None" only when none is loaded.
- **Acceptance.** Load the trail file with "Higher means: Farther"; the path form's Weight reads
  "minutes (farther)".
- **Files.** `graphty/src/workspace/analyze/PathForm.tsx`.

### 14. Four word fixes on the path and Replace screens (graphty app, severity 2)

- **What and fix.**
    - "Total distance 14" has no unit (7 of 7 T20 sessions): name the weight column, "Total minutes
      14", the existing "Total <column>" rule (`inspector/RunValues.tsx`, about line 394).
    - The unweighted path's note "Not read -- weight's meaning is not set, and a path needs a
      distance" read as gibberish (r1-s19): "Each edge counts as 1. weight's meaning is not set", in
      the form of the existing note (`analyze/words.ts`, `weightRead`).
    - The Replace page's button says "Load": "Replace", matching the title and the command
      (`data-page/DataPage.tsx`, about line 1314).
    - The Analyze filter does not find Shortest path by "chain", "quickest", "link" or "between" (6
      sessions): add them as aliases, and say "shortest path by weight" in its description, not
      "route" (`analyze/words.ts`, about line 130).
- **Acceptance.** Each string in a unit test; the aliases find Shortest path in the Analyze filter.

### 15. Answer key for the new routes; graders label scripted persona exits (tasks-or-answers)

- **What.** Changes 4, 5 and 6 add routes the answer key does not list; T18 B on the study build has
  no written walk; two of three non-successes were one persona's scripted two-attempt exit.
- **Fix.** Add the new routes to `../../answers.md` (find's hint to the rule for T22; the source
  inspector's "..." for T21; the Data page reached from the start screen's Open for T20), with their
  step counts re-measured on the new build. Record the T18 B walk. Graders mark a give-up that
  follows a persona file's scripted rule as "scripted exit" beside the grade. No task prompt
  changes; no bar, floor or step limit changes.
- **Files.** `design/ui/studio/tier2/answers.md`, the grading guide in `../../criteria.md`'s scoring
  notes (wording only).

## Not this round, and why

- **"Select where..." on a column, a live "Select where" row, a rule dialog.** Only if change 4's
  words fail with three or more participants looking in the same place (decided before round 1).
- **Filters' home, the rail, the Analyze list's order, "Hops", "Select endpoints".** 7 of 8 found
  Filters at the success path's cost; the one give-up was a scripted exit. The rest are severity 2
  or less and would blur what changes 4 to 6 achieve.
- **Drawn names overlapping and running off the canvas.** A confirmed severity-3 class, but it is
  graphty-element's label placement and frame-to-fit, too large to land between rounds. It is filed
  against graphty-element as one issue; bar 10 is expected to keep failing on it in round 2, and
  that is the evidence for the owner. The app does not shrink fonts or seed the layout to hide it.
- **Accepting bare numbers in rules.** Already on the owner list in `../../../owner-decisions.md`
  (the `E_BAD_SELECTOR` entry): it changes what an existing API accepts.
- **compact-mantine's Toast as `role="alert"`, and the chosen segment of a two-option control
  looking like the empty one.** Shared-component defects, each touching every caller and every
  compact-mantine baseline. Recorded here; fixed in compact-mantine in a later round so the
  round 2 build stays attributable.
- **The canvas selection ring and focus ring contrast.** graphty-element, issue #811.
- **"Leave out" preselected on import, a new note taking the inspector's subject, a second path
  replacing the first.** Severity 2, every outcome correct.
- **Any tour, hint panel or first-run aid.** Ruled out.

## For the owner

Nothing new. Every change above is in the app, the study tool, or a graphty-element rendering fix
with no API change. The bare-number question stays where it is.
