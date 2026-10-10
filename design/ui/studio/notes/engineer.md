# Design Engineer -- designer's notes

Role: I build what the studio decides, in the graphty app (`graphty/src/workspace/`) and in
graphty-element, small and in the right package, and say what the element's API can do today. I
read this file first every session and update it as I decide and learn.

Words: "the app" is the graphty app; "the element" is graphty-element; "tier 1" is a first-time
user's core path (open, read, analyze, color or size by a result, names, find a node and its
neighbors, export, save and reopen); "the walk" chains it end to end as the build's acceptance
test. "The studio worktree" is `.worktrees/design-studio-tier1` (branch `design/studio-tier1`).

## Top of mind

- (2026-10-09) **Round 2 critique: the next round's first fix is the study tool, not the app.**
  Participants read the facilitator's `tasks.md` (13 of 16 follow-ups answered early; r2-s05
  voided), so every route that worked is weak evidence. `real.mjs --start` must refuse a session
  folder without the briefing it wrote, and participants run from that folder. Re-run the three new
  routes (weight meaning at load, Replace in "...", find's rule hint) before crediting them.
- (2026-10-09) **Did the dry run work? Mostly.** About 30 of ~355 recorded problems were build
  faults, none above severity 2, no grade decided by one; the only `session.log` line is r2-s13's
  900 s idle close. Twelve of the thirty sit on the one detour no dry run walked: styling a
  selection. The dry run must walk what participants style, not only what the answer key styles.
- (2026-10-09) **A new style line starts on the element's default, which is what is already drawn**
  (`startingValue` in `style/row.ts` reads `descriptor.default`): edge Width 8 and Color A9A9A9
  change nothing. Proposed: the app starts a line on a layer that does not target Everything one
  visible step away (color from the app palette, width double the default). App choice, no door.
- (2026-10-09) **Built: an Add that repeats loaded ties says so and offers Replace.** The element
  already had the count (`LoadReport.repeated.seen`); only the draft's merge report read 0, since it
  measures in a scratch session without the graph's edges. Fixed in the element (pairs handed to
  the measure); the Add page shows one line above the buttons and "Replace <source>" beside Load,
  which reopens the page as Replace on the same file. Walk: `design/ui/studio/tmp/t2r2-5/`.
- (2026-10-09) **Find box, severity 3:** "chapters 10" says only "No match". Proposed: when plain
  text names part of a column the app already lists after "=", hint "=<column> >= `10`"; for bare
  numbers an opt-in element parse option (`bareNumbers`, default off, additive) instead of changing
  what the selector accepts (that would be breaking).
- (2026-10-09) **Drawn names covering names and the picked tie stay graphty-element's** (label
  placement, no size floor). Not a round 3 app change; no workaround in the app.
- (2026-10-09) **A layer made from a rule should be named by the rule**, not "13 edges"
  (`selection.origin.text` is already read in `FindBox`). Smallest fix for "the key says nothing".
- (2026-10-09) **Open from the round 2 audit, app:** two-table source has no Edit/Replace and no
  reason; "Edit source..." lands on "Replace: ..."; the refused rule's fix drops "="; neighbor
  Back row scrolls the inspector sideways.
- (2026-10-09) **Dry run = `tier2/pilot/detours.sh all`** on every new frozen build, plus this
  round's detours: style a selection (width, color, name), click away from an open step editor,
  run a path twice, reopen the Path form, open a newer copy of a loaded file.
- (2026-10-09) **Script before calling it a defect:** a half-made filter step discarded on another
  selection (the tool's click caused r2-s17/18), empty-canvas click while a run is selected, edge
  width units (`EdgeMesh.ts` *20 and /40; "8" drawn as a hairline).
- (2026-10-09) **The study tool reaches participants more often than the build does.** Every tool
  change gets a planted-failure check; click by name landing on a same-named control (r2-s17, s18,
  s30) needs a refusal like ambiguous names already get.
- (2026-10-09) **Bars 2, 7, 8, 9 are scored by `tool/bars.mjs`**, each with one planted failure.
- (2026-10-09) **Per-change details for the round 2 fixes** are in this file's git history and in
  each change's test; this file keeps only the lesson.

## Decisions and reasons

- (2026-10-09) **Read the report type before adding a field.** The task asked for a new count; the
  report already promised it (`repeated.seen`) and the load already counted it, so the defect was
  the measured merge, not a missing field -- no API change, a fix every consumer gets. Replace
  from the Add page calls `replaceSource` (what the source menu's Replace with file... runs after
  its picker), and an open page restarts on a replace request (`DataPage` keys a view by a
  counter) rather than taking it as a drop. Rejected: running "Replace with file..." itself (a
  second file picker for a file already chosen); a new `LoadReport` field for repeats of the graph
  only (in-file repeats also count today; none of the study files have any).

- (2026-10-09) **Round 2 critique: smallest changes, ranked by what a returning user loses.**
  1 study tool (briefing only), 2 the Add page warns on repeated ties and offers Replace, 3 find's
  hint for a condition in the reader's words, 4 a new line starts visible, 5 a rule-made layer is
  named by its rule. Reason: 1 decides whether round 3 measures anything; 2 is the only finding one
  slip from severity 4; 3 is the one confirmed broken habit; 4 caused twelve of the build faults;
  5 is one string. Not changed: no new words at rest (bar 9 b already fails), no Filters hint on
  the Graph place (found in 1 to 2 steps by 8 of 8), the path tool's place (find led all 8 to a
  right answer), label placement in the app, the element's style defaults (neutral; the starting
  value is the app's choice), the frozen build mid-round, the three new routes before a clean
  re-run.

- (2026-10-09) **An audit walks screens by script, both sizes, and reruns from the script.**
  `round-2/expert/engineer/audit.sh` (one `walk` per screen, `SIZE=`, `LANES=`) and `audit2.sh`
  for walks added after a run started. Reason: round 1's walks lived in a scratchpad and were gone;
  a scripted walk lets the next round compare the same screens. Findings that persist say
  "(round 1)" so the count can be read against bar 10.
- (2026-10-09) **Round 2 waits on measurement first.** Round 1 decided: fix the tool, build the bar
  scripts and walk the detours (pointer and keyboard) before any session, then reproduced defects,
  then one door per confirmed problem; words at rest do not rise (only the source "..." menu and
  the key's ", out of date"). Reason: a session spent on a tool or build fault teaches nothing
  about what returning users need. No breaking API change; nothing for the owner.

- (2026-10-09) **Label picks are an opt-in style field, not a default and not an event.**
  Cytoscape.js passes label clicks through; a reading app wants a name to pick its node -- a
  consumer's choice, so neutral default. Resolving in `pickNodeId` via metadata (one place) means
  click, hover, drag and `elementAt` cannot disagree. A per-layer field beats an element-wide
  switch; a `label-click` event would push wiring to every consumer. Recorded in
  owner-decisions.md "decided by the team".

- (2026-10-09, condensed) **A landed click is read from Playwright's call log** ("click action
  done"), not by a longer limit for everyone; setup clicks get 20 s.

- (2026-10-09, summarized) **Smaller standing facts:** the path's Weight list starts on the loaded
  weight; a live region is in the page before its words arrive (`Frame.tsx`); the selection halo
  draws only back faces (`createOverlaySource`); ", out of date" only on `data-changed`; the
  Filters step editor is a `<form>` (`focusNext`/`focusStep`).
- (2026-10-09) **The list follows the filter, not the other way round.** Reopening a node under its
  2-hop filter opened one hop with the button pressed, and pressing it there removed the filter
  instead of narrowing. Opening at the on step's depth makes list, Hops and button agree; with no
  on step nothing changes (T12R still opens at Hops 1). Only an ON step counts: an off step is
  the reader's own choice not to filter, so it should not change where the list opens.
- (2026-10-09) **Wrap a sentence heading, opt in.** A neighbor heading is the task's answer, so it
  must be read whole; section names of one to three words stay on one line, so `wrapLabel` is
  per section with the old drawing as default (no change to any other section). One line at
  `wrapLabel` keeps the 40px header (16px lines plus 8px padding = the old 32px line box).
- (2026-10-09, condensed) **A chosen segment is filled** (`--cm-bg-inverse`) and every control shows
  the arrow cursor (one rule in compact-mantine `00-foundation.css.ts`; only Anchor keeps the hand).
- (2026-10-09, condensed) **A data file opened from the start screen goes through the Data page**
  (`openInSession`; Control+O on the page lands as a drop), and the source's inspector "..." holds
  the Sources row menu's verbs (`useSourceActions`). Tests `StartScreen.real-element.test.tsx`,
  `DataPlace.real-element.test.tsx`.
- (2026-10-09) **Pointer-opened menus focus the menu, not row one, for every menu.** A filled first
  row reads as already chosen (Edge actions showed "Select endpoints" blue in the T24 pilots). The
  WAI-ARIA menu-button pattern focuses the first item on any open; we keep that for keyboard opens
  only, where the highlight is the reader's cursor. The rule is limited to the row the focus trap
  picks: applying it to any row focused from the menu also undid type-ahead from the menu (typing
  "l" went back to row one) -- caught by `tests/figma/overlays.browser.test.tsx`.

- (2026-10-09) **One neighborhood filter per center, whatever the reach.** The toggle is about
  "this node's neighbors are filtered", so a 2-hop step answers it at Hops 1 too; matching only the
  reach shown made the button lie and stack a second step. The tooltip names the other reach so
  the pressed state is not read as "1 hop". The OptionsForm unread note needed no change: it is
  already 11 px and starts under its label (the popover's Weight); the inspector's Advanced run
  settings form sits at 8 px, left of the rows' 16 px -- a form-layout question, not a note.
- (2026-10-09, condensed) **Move the link, not the control** (reading order, smallest diff); a
  row's inspector answers to its title.
- (2026-10-09) **A new event rather than an empty `selection:changed`.** Its TSDoc promises "only
  a real movement arrives", so an empty delta would change what an existing event does (breaking)
  and make every listener redraw for nothing. The new event fires only when no member moved, so
  one call never fires both. Recorded under "decided by the team" in `owner-decisions.md`.
- (2026-10-09) **A suggestion the selector would refuse is no suggestion.** Validated by parsing
  the rewrite; a rewrite equal to the input is skipped first, which also stops the parse from
  asking for its own suggestion again.

- (2026-10-09) **No forced focus ring after a pointer click.** `focus({ focusVisible: true })`
  after Save would make the note card the one control that rings after a mouse click (spec 2.7,
  same reason as the cursor rule); a keyboard user sees the mark at the next key.
- (2026-10-09) **A study tool that hides what a person saw is fixed in the tool, not the app.**
  Lengthening `NOTICE_MS` would change the product for the tool's sake. Rejected: a screenshot
  before settling (it would catch half-drawn frames).

- (2026-10-09, summarized) **Reset, Graph title, heading counts:** `OptionsForm` passes no value at
  a run setting's default (a style layer's explicit default still overrides, so `StyleNumberInput`
  keeps its reset; its real defect, an undefined `value` going uncontrolled, was fixed there); the
  Graph title opens a "graph" row so a node can stay picked; a heading's count must be checkable
  beside it ("Ava and 14 ..." matches Selection 15); a key under a filter names the run's own count.
- (2026-10-09, condensed) **Segment fill = the inverse color** (brand blue failed 1.4.11 and
  1.4.3); `--cm-segment-edge` kept (removing a published variable is breaking). **Arrow cursor on
  every control, the hand only on links** (Mantine's UnstyledButton default was the hand).

- (2026-10-09, summarized) **Round 1 and dry-run calls, still standing:** a vertical list passes
  `scrollbars="y"` and ellipsizes through `EllipsizedName`; the app breaks on long names and narrow
  windows, not at 1440x900 (`REAL_VIEWPORT`); path and Replace words name the weight column and say
  why a weight was not read; plain text counts as a condition only when the accepted rule matches
  something (no syntax read in the app; Mantine's `description` links the hint); the element no
  longer cancels canvas pointerdown (click-outside works for every consumer); a Select list that
  fits opens whole; the path's Weight list already starts on the loaded weight; reopen is a fresh
  fit (camera unsaved, owner door); a skipped weight's note says what the run did, then why; the
  page that names the graph announces its load; an Add counts what it adds.
- (2026-10-09, condensed) **The bar scripts measure in the participant's own `real.mjs` session**
  (ops `measure`, `work`; checks in `measure.mjs`), each move with an `--expect`. Focus fell = body
  or null (shadow-root focus is kept); shared names count reachable controls, not list items; bar
  7 seeds 42; bar 9 limits are round 1's counts on round 1's frozen build.
- (2026-10-08, summarized 2026-10-09) **Older dry-run fixes, still standing:** `--read` prints rows
  by cell; sources show "Added"/"Left out"; compact-mantine Tree type-ahead and menu Escape. OPEN:
  Columns after "=" omit run results; edge-only `edgePage` selection (owner door); dijkstra over a
  negative undirected weight freezes the page.

- (2026-10-09) **A run row's Style tab offers only the sides the run's own layers cover** (built,
  see Top of mind). A node-only result has nothing to say about edges (the algorithm-styles rule).
  Rejected: a run-named edge layer with an empty selector (paints every edge, breaks the rule).
- (2026-10-09) **Audit findings name the owning package; the canvas label clipping is the
  element's.** The fit frames spheres only, so any app fix (smaller font, padding) would hide an
  element defect. The legend card's label overlap waits on the same element fact (label bounds).
- (2026-10-08, summarized) **Older dry-run calls and element facts:** camera unsaved; a step named
  by what changed; a reopened load replaces itself; Esc exits only an empty import page; no script
  focus ring after a pointer action; shared-control defects fixed in compact-mantine; a resolved
  option is a caveat (`caveats.method`), never written into params; a left-out row names its
  missing END; label draw order is `onTop`; what a rule tested is `selection.originPaths`, never
  parsed; find moves the camera only to an off-screen pick; facts are rows, not chips.
- (2026-10-07, condensed) **Tier 2 element work (owner doors):** edge pick 5a2b3b605; filter steps
  `setSteps`, counts only in `plan` (8966b0888); stale runs ce34f31f3 (Replace never reruns);
  every load a source f141b1283; edge-attribute filter 559f5dcb2 (`nodes: "ends"`); coded selector
  refusals 3d89d43c3. Next: run results typed per field; several node types last.
- (2026-10-07, condensed) **App-only (no door):** edge click opens the edge inspector (e666ae17d);
  Export warnings worded by the app (`export/lossWords.ts`); a run's Values view comes from its
  shape (`viewOf()`). Element English still on screen (estimate reasons, layout descriptions):
  codes from the element are an owner door.
- (2026-09-13 to 10-07) Older standing decisions: no default layout seed in the element (the app
  seeds, `LAYOUT_SEED`); any new site showing a run calls `runName`; test the element before the
  app; a run paints when it finishes; group-row color fallback in `graph-place/rows.ts` stays until
  #1099; study APIs `nodeScreenPosition`, `elementAt`, `labelOf` merged.

## Tried: worked / did not work

- (2026-10-09) Worked: a one-off element test printing `JSON.stringify(await draft.report(...))`
  before writing code -- it showed `repeated.seen: 0` beside `counts.edges: 82`, which placed the
  defect in the measure, not the type. `session.data.import` takes `{ config: { file } }`, not
  `{ file }`. The app's real-element project is `--project=real-element` (`browser` excludes
  them); `?raw` imports of `design/ui/studio/tool/files/*.csv` work from graphty tests.

- (2026-10-09) Worked for a critique: reading `insights.md` section 2 first (it answers "was it
  the build or the design"), then grepping `startingValue` and `ruleFromText` to place each fix in
  its package before proposing it; `for f in */session.log; do [ -s $f ] ...` finds the sessions
  where the tool or build spoke.

- (2026-10-09, condensed) Never edit a script while it runs (bash reads by offset; use a copy);
  `chmod +x` new scripts and read their output, not the exit code; 2x2 `montage` sheets for 900 x
  700 shots. Control names: "Filter: <n> of <m> nodes", "Source actions", "Graph#1".
- (2026-10-09) Did not work: a left-edge test with `getBoundingClientRect().left` of a padded
  `Text` -- the box starts before its padding, so the broken build passed. Worked: a Range over
  the element's contents (`range.selectNodeContents(el).getBoundingClientRect().left`) for where
  the text is drawn.

- (2026-10-09) Worked: an app real-element test that finds a point on a drawn name with public
  API only -- walk up from `nodeScreenPosition(id)` past its `radius` and take the first point
  `elementAt` answers the node (the app lint rule `graphty/no-element-mutation` refuses
  `element.graph`). Seen, not mine: `tsc` in graphty-element flags `maxNodes` in
  `test/managers/LayoutManager.test.ts` because `layout/dist` predates the master merge (stale
  build, not a source error).

- (2026-10-09, condensed) Worked for a slow-click test: the click sets `location.href` to a path
  `context.route` answers with 204 after 4.5 s (blocking the main thread did not work).

- (2026-10-09, condensed) `.cm-section-header` sets `height: 40px`, so growing it needs a CSS rule
  (`[data-wrap-label]` sets `height: auto`), not an inline `minHeight`.
- (2026-10-09) Worked: when a pilot's log is gone, rebuild its walk from `repilot.sh` and the
  screenshots (T23B 14 to 17: Data page, then Find Medici and `g` under the 2-hop filter).
- (2026-10-09) Worked: re-piloting only the halves a fix touches with
  `REAL_DIST=graphty/dist OUT=<my tmp> LANES=3 tier2/pilot/repilot.sh T20A T20B T21A`, then one
  hand session for a hover the script does not take (`--hover "Add a table"` prints the tooltip).

- (2026-10-09) Did not work: wrapping `tier2/pilot/repilot.sh` in `tool/with-browser.sh` -- the
  wrapper held a browser slot with no browser while each `real.mjs --start` took its own; run
  repilot.sh bare. Did not work: dropping the enabled-row early return outright (broke type-ahead
  from the menu itself, see decisions).

- (2026-10-09, condensed) Worked: a scripted re-pilot of the fixed screens, then contact sheets
  (`montage *.png -tile 4x -geometry 720x450`) and full-size reads of each fixed item.

- (2026-10-09) Worked: proving a tool test fails without the change by writing `git show HEAD:`
  copies of the tool files into a scratch folder beside the new test and running `node --test`
  there (no stash, no checkout). Did not work as a check: eslint on `design/ui/studio/tool/` --
  it flags every Node global (`process`, `URL`) because that folder has no lint config; prettier is
  the check that applies.

- (2026-10-09) Worked: proving a test fails without the fix by copying the changed sources aside,
  writing `git show HEAD:<file>` over them, running the test, and copying them back (no stash).
  Did not work as a first guess: notifying only the internal scope notifier -- the app listens
  only through `session.on`, so the fix needed a public event.

- (2026-10-09, condensed) A pilot's exact steps are in its agent transcript under
  `.claudehistory/<session>/subagents/workflows/<wf>/agent-*.jsonl`; `--read` in a non-`--sr`
  session tells where focus is.

- (2026-10-09, summarized) **Measure before fixing a look.** A Playwright probe under
  `with-browser.sh` showed a list really overflowed (Mantine keeps a hidden ScrollArea bar mounted:
  check computed display); log a root's computed `display` when a rule "does nothing" (a `.dp`
  class collision made a grid flex; grep new root classes). `--expect selected=N` counts selected
  rows, not nodes. TS drops narrowing inside hoisted nested functions.

- (2026-10-09, condensed) Seen, not mine: T7 in `tasks.real-element.test.tsx` reads Damping's
  `value` outside its `waitFor` after Revert (the field re-syncs a commit later); read it inside.
  Worked: proving a CSS fix's test fails by copying `git show HEAD:<file>` over it and back;
  `--hover-at` over every control class before choosing a rule; re-walking every dry-run walk whose
  path uses a changed door (`detours.sh T3 T4 ...`), which found the silent Control+O loss.
- (2026-10-09) Worked: a local walk script beside the evidence (`r2-dry2-app-import-and-left-out/walk.sh`)
  when rewalk.sh's fixed steps stop one click short; a real-element test of "does not move" reads
  the control's `getBoundingClientRect().left` before and after the click.

- (2026-10-09, condensed) **Test and walk lessons.** A second load in a test needs
  `session.data.import(..., { mode: "merge" })` (default replaces). Prove "nothing follows" by
  spying the element call and settling it in `act`, never a sleep. `--sr` walks give the Tab
  order; `--expect-not` on a placeholder proves nothing (prove every check on the broken build);
  a miss exits 0, only `--expect` fails a walk. A build from the shared tree holds others'
  unfinished edits. Read graders' state lines before coding (the "starts on None" task was a
  verification). Prove a test fails without the fix with `git diff -- <mine> > patch; git apply -R`
  or a one-line sed revert. Focus after a write: a module-level request taken in an effect keyed on
  the element's change version. Hooks: copy `.husky/_/` AND the top-level hooks into the temp dir
  (the shim runs `$(dirname $(dirname $0))/<hook>`, else every hook exits 0); commit scope `tools`,
  not `studio`. Open: a run hidden by an Everything edit shows a blank Style tab
  (`defaultRow` null on empty bindings; `tmp/t2r1-11/a/06.png`).

- (2026-10-09, condensed) The first-save fault: one cause is gone with the picker save; the other
  (ECONNREFUSED, session process gone) is unproven. Two `--prove` runs on the default `tmp/prove`
  end each other's sessions: always set `REAL_PROVE_DIR`.

- (2026-10-09, condensed) Did not work: leaving edits uncommitted while others commit in the same
  files (`17bf87085` swept my hunks); commit as soon as hunks pass. Did not work:
  `open(p, "w").write(f(open(p).read()))` empties the file before the read; read first, then write.
- (2026-10-09, condensed) Worked: polling `/proc/*/fd` for slot-file holders (`tmp/t2r1-1/holders.sh`;
  `fuser` prints nothing useful); staging only my hunks of shared files (`git update-index
--cacheinfo`), since real.mjs edits reach every agent's next session; `real.mjs --sr` with Tab and
  Enter to check a live line prints once (pick the visible line by `role !== "status"`); finding a
  layout cause in Mantine's CSS first; reading `scores.md` beside `insights.md`; `long-names.csv`
  for truncation audits, with PIL 4x crops for small text. `--click Graph` takes the rail button.
- (2026-10-08, summarized) **Older tool and test lessons.** Pilot on a `cp -r graphty/dist` copy;
  read `setup.log` after every `--start`; step N lands in screenshot N+1; `--sr` focus lines tell
  "not focused" from "focused, no ring"; hover tooltips need `{ timeout: 3000 }`; assert
  `checkVisibility()`; a hung browser test is a sync loop (bisect with `-t`); `pgrep -f` matches
  itself (wait by PID).
- (2026-10-06 to 10-08, condensed) Shared worktree: stage only my hunks (`git apply --cached`, or a
  private `GIT_INDEX_FILE`), commit from an empty `git diff --cached`; wait for a clean `tsc` before
  building over others' half-saved files; never commit `api:report` output wholesale. Builds:
  `NODE_OPTIONS=--max-old-space-size=8192`. Element facts: a `Run` is thenable; per-node values via
  `session.data.nodePage({ columns: [runId] })`; `selection.apply` throws synchronously on a bad
  selector (unfiled); `data.name()` returns the id until `knownFields.nodeLabelPath` is set.
- (2026-10-06 to 10-08) Grep every route of a value before calling a change done.

## Sources

- Digests in `design/ui/studio/digests/` (`tier1.md`, `decisions.md`, `study-rounds.md`,
  `owner-voice.md`, `framework.md`); repository `CLAUDE.md`; `design/ui/studio/tool/README.md`.
- Tier 1 design and plan on branch `feat/tier1-real-app` under `design/ui/tier1-real-app/`.
- App comments citing element issues: grep `#[0-9]{3,4}` under `graphty/src/`.
- Owner memory notes (do not blame timing; cap workflow browsers; the image model only transcribes).
