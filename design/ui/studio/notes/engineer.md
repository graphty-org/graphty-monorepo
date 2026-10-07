# Design Engineer -- designer's notes

Role: I build what the studio decides, in the graphty app (`graphty/src/workspace/`) and in
graphty-element, and I say what the code and the element's API can and cannot do today. I keep
fixes small and in the right package. I read this file at the start of every session and update it
as I decide and learn.

Words used below: "the app" is the graphty app; "the element" is graphty-element; "tier 1" is a
first-time user's core path from an empty app (open a sample or a file, read it, run an analysis,
color or size by a result, put names on, find a node and its neighbors, export a picture and the
numbers, save and reopen). "The walk" is the whole first session chained end to end, the build's
acceptance test. "The studio worktree" is
`/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1` on branch
`design/studio-tier1`.

## Top of mind

1. (2026-10-07) Round 2 closed; all ten of its build changes landed on design/studio-tier1
   (895e5fab3..b7590f8de, build b7590f8de, graphty 0.8.53) and the re-pilots of T6, T7, T9-T13,
   T15, T16 all reach their end state with no blocker. Round 3 measures THOSE changes: do not land
   another change on a path a round 3 task measures until round 3 has run (two changes on one
   path confound the measure; decisions rule).
2. (2026-10-07) Watch in round 3, by change: menu-to-dialog focus (re-run r2-s07 first); key
   drops a covered layer; 2D Fit; group layouts after Louvain; load/run announcements (tool
   blind spot 3: a region inserted already filled is "unconfirmed"); canvas name and focus ring;
   Size "+" opens its list (credit any T9 ease change to it alone); trailing chevron in the row;
   run named by method; "Show all labels". A regression there is mine to trace first.
3. (2026-10-07) Biggest remaining element defect class: element English reaching the screen.
   Re-pilots found it in layout refusals (`session/planning.ts` planar/bipartite: "G is not
   planar", "results.louvain.group names 6"), layout descriptions (`catalog/layouts.ts`, British
   "centre"), graph-io's CSV export warnings, and `run.label`. Fix = `{ code, params }` from the
   element, words in the app; never an app rename or string match.
4. (2026-10-07) Perspective in the default 3D view makes a nearer dot look bigger: on friends.csv
   Ava reads larger than Farah though Farah ranks first (T15, T9 re-pilots; also exported). This
   can make a size answer meaning-wrong. Candidate for round 3 decisions; the fix (flat/ortho by
   default when sizing, or screen-constant sizes) is element behavior, likely an owner door.
5. (2026-10-07) Key covers nodes (Florentine top-left node fully hidden, T9; Les Mis rings, T11).
   Needs a fit inset on the element's zoom-to-fit (`OrbitCameraController` fixed 5%) -- new
   public option, owner door. Deferred to after round 3 as a placement question; have the
   owner-decisions entry drafted, do not build it.
6. (2026-10-07) Still deferred, with reasons in round 2 decisions: 4x print re-render
   (`ScreenshotCapture.ts` scales; labels also soft at 2x), name behind a dot counted as shown, Force re-apply cloud (untraced -- trace before round 3 launches and
   file an element issue with the cause, do not hold the round), refusal parity for "New from
   data...".
7. (2026-10-07) Small open defects from the re-pilots (not on a measured path, safe after round
   3): Columns by group ignores group order (6,1,5,3,4,2); Circle draws a sphere in 3D; group
   named three ways ("Louvain", "Group N", "Communities" in Group by); Overview direction row
   shows raw "from the file: directed 0" and overflows; truncated "Node t..." labels; Id/id;
   Florentine histogram of 15 equal bars; Everything's Style shows base Size 1/blue after sizing.
8. (2026-10-07) Study tool: `ambiguous` on a label plus its input (Show all labels, Format,
   Table) is a tool defect, not a participant wrong turn. Fix in `tool/real.mjs` (treat a label
   and the control it labels as one match) before round 3 grading, or graders over-count.
9. (2026-10-06) Graph logic goes in graphty-element, never the app; an app comment explaining why
   the element could not be used is an element bug report. Element returns neutral facts; app owns
   words. Style only through layers. Public element API or behavior change = owner door:
   `owner-decisions.md` + `npm run api:report`.
10. (2026-10-06) No default layout seed in the element (owner). The app seeds itself
   (`LAYOUT_SEED`, `takesSeed()` in `layout/methods.ts`); any new layout path passes it. Fixed
   seed = overlay overlaps are one event per dataset, not per session.
11. (2026-10-07) A decision's file list is a start, not the set: grep every route of the value
   (run-name change missed Why this look). Any NEW site showing a run calls `runName`, never
   `run.label`. Tests assert literal method names, not `run.label`.
12. (2026-10-07) Bars baseline on 4a7a1a7fb: 42 app words at rest (no fix may push it above);
   axe fails on one cause, `#8c8c8c` on `#2c2c2c` (compact-mantine `compactDarkColors[2]`).
   Re-measure with `tool/bars.mjs`. Trust a scripted repro or a cause in code over a participant
   count (one model plays every persona).
13. (2026-10-06) Iterate locally: element build, then `pnpm exec nx run graphty:build`, re-run
   with `tool/real.mjs`. Others rebuild `graphty/dist` often: copy the build and use
   `REAL_DIST=<copy>`; check `pgrep -af "real.mjs --prove"` before trusting a FAIL. Never push.
14. (2026-10-07) Focus: the compact-mantine Menu theme returns focus only from inside the menu;
   never add `returnFocus={false}` again. The canvas is named by the host's `aria-label`, has no
   autofocus; focus stays on the body after an open (re-record keys that expected otherwise).
15. (2026-10-07) The element FREEZES Babylon's active-mesh list on a still frame
   (`UpdateManager.settleActiveMeshFreeze`). A mesh enabled or disabled outside an update pass is
   ignored until something unfreezes it: call `getUpdateManager().meshesShownOrHidden()`. Suspect
   this first when "I hid it and it is still drawn" (or the reverse). Also untraced (2026-10-06):
   live Selection row blank after the neighbor route; reopened run row has no count; Effects
   Outline black blobs; header "Untitled" after New from data.

## Priorities and values

- The first-time user's core path works end to end on real wiring, before anything else
  (owner, 2026-10-02 and 2026-10-03). A step that looks right but changes nothing visible is worse
  than a missing step: the mock rounds' dominant failure was "the right control is found; what it
  does next fails."
- Fixes land in the package every consumer gets. The app is today the only consumer of the
  element, so it is the only thing that can discover element defects; a workaround throws that
  information away (repository `CLAUDE.md`, "The app MUST NOT work around graphty-element").
- Small diffs, root causes. One guard in the shared function rather than a patch per caller.
- Evidence over taste: I assert on element reports (`runs.painting()`, `styles.explain()`,
  `labelOf`, `nodeScreenPosition`), not on pixels or on what a panel claims.
- The studio's time and the owner's attention are expensive. I tell designers early when a
  decision would need new element API (a public contract, so a one-way door for the owner), and
  when it is cheap app chrome (a two-way door I can just build).
- Never blame timing or load for a failure; find the mechanism first.

## Design criteria

- **Visible effect at commit.** Every step's change shows on the canvas and the legend the moment
  it commits (tier 1 design, the walk). Reason: round 8's walk failed 21 of 21, mostly on actions
  that changed panel text but not the drawing.
- **Live counts only.** Any number in a message is read from the element at render time. Reason:
  repeated "numbers disagree between screens" findings in rounds 2-7.
- **No promises.** An unbuilt item is not drawn: no "Coming" tags, no disabled stand-ins for work
  that does not exist (tier 1 design, section 3). Reason: dead-end menu items ("not available
  yet") turned every second route into a failure in round 8.
- **One door, one command.** A command is registered once and every door (key, menu, Quick
  actions, selection bar) uses its words verbatim; no two reachable controls share an accessible
  name. Reason: "Data" and "Louvain" on several controls confused sighted users and broke the
  screen-reader persona; it also breaks the study tool's click-by-name.
- **Element owns facts, app owns words.** The element returns codes, values and descriptors; the
  app writes every sentence (owner, 2026-10-03). Reason: a third-party consumer must be able to
  present the same facts its own way.
- **Easy things easy.** A new element API has a simple path whose first example fits in about 15
  lines and names no internal concept; it is checked by a docs-only author (repository
  `CLAUDE.md`).
- **Style layers only; suggested layers scoped to the result** (repository `CLAUDE.md`). Reason:
  styling outside layers is invisible to the layer list and lost at a dataset boundary; an
  unscoped suggested layer erases every algorithm beneath it.
- **Exact by default.** The method named is the method run; a sampled variant is offered, never
  swapped in; cost estimates come from the element (framework principle 2).
- **The app never starts work unasked.** Samples open with nothing run (round 8 decision).
- **Accessible by default.** WCAG 2.2 AA; the table and inspector are the canvas's text
  equivalent; Esc closes the innermost thing first; focus never falls to the page body.

## Decisions and reasons

- (2026-10-07) **Export leaves the selection ring out (4c087d8bc, element + app; owner door).**
  `ScreenshotOptions.showSelection` (default true); `false` disables every enabled
  `graphty-selection-halo` mesh (`SELECTION_HALO_MESH`, now exported from `Node.ts`) for that
  capture, tells `UpdateManager.meshesShownOrHidden()` (new, public via the main entry), draws a
  frame, captures, and re-enables in the outer `finally` (success and failure). Selection state
  and events untouched. App: `screenshotOptions()` always passes `showSelection: false` (export
  and preview); no dialog control. Rejected: deselect/reselect in the app (fires events, loses a
  multi-selection), default false (moves every caller's picture), `selection: false` (reads as "no
  selection"). Did not work first: disabling the halo alone -- the frozen active-mesh list kept
  drawing it (Top of mind 15). Proof: `test/browser/screenshot/screenshot-selection.test.ts`
  (real Babylon capture via `vi.importActual`; fails on the old capture with 18214 differing
  pixels); app run `design/ui/studio/tmp/r3fix-export-no-selection/run/` (06 Medici ringed,
  08 preview no ring, downloads/florentine_current-view.png no ring, 09 still ringed and
  "Selection 1"). `owner-decisions.md` entry; PR needs hold + needs-decision.

- (2026-10-07) **Show all labels (b7590f8de, app only).** Checkbox beside the label count in
  `LabelSection.tsx` ("N labels, M hidden"); store `allLabelsShown` (reader preference, not saved);
  `ElementHost.tsx` writes `layoutBehavior={{ labels: { declutter: !allLabelsShown } }}` on the tag
  (assigning `element.layoutBehavior` is refused by the `no-element-mutation` lint rule). Proof:
  T10 test in `StyleTab.real-element.test.tsx`; `tmp/check-r2-show-all-labels-switch/`.

- (2026-10-07) **A clickable DataRow's trailing glyph is part of the row (compact-mantine).** The
  `trailing` slot sits in a `display: contents` wrapper whose click activates the row unless it
  lands on a control inside the slot (`closest()` bounded by the slot). Proof: two tests in
  `compact-mantine/tests/components/rows/DataRow.test.tsx`; `tmp/check-r2-datarow-trailing-hit-area/`.
- (2026-10-07) **Menu-to-dialog focus (b7db5da7d, compact-mantine).** Mantine's
  `useFocusReturn` refocused the menu button 10 ms after close. The Menu theme now remembers the
  opener and returns focus only when focus is inside the dropdown or on body (`overlayBehavior.ts`).
  Finding the button by `aria-labelledby` failed (Tooltip drops the id). Gate:
  `MenuFocusReturn.browser.test.tsx`; proof `tmp/check-r2-menu-dialog-focus/run/`. Open: Export
  dialog Copy fails headless and drops focus to body; compact-mantine `figma/tree.browser.test.tsx`
  is order-dependent on old code too.

- (2026-10-07) Size "+" opens its list (studio decision: 18 of 18 round-2 sizing sessions named
  the fixed "1" that changes nothing). Adding node Size writes the fixed 1 as before, then the
  line's own bind pop-out opens as it is drawn, with "Fixed size" as its first, highlighted row;
  Enter on it closes the list and focuses the number; Esc or outside click leaves the fixed 1.
  Rejected: a separate picker before the write (a second bind route, rejected in round 1);
  component state for "open on mount" (lost when the first edit makes a layer and remounts the
  tab). Kept to node Size: edge Width and Color "+" behave as before. Re-record the T9 answer key
  path ("Size by attribute" click is gone) after every wording change, as with T11 and T13.

- (2026-10-07) Study tool: focus lines name the highlighted option (`aria-activedescendant`),
  `--read` is browse mode, a pre-filled live region ends `-- unconfirmed`, `REAL_DIST` serves a
  build copy; `tool/bars.mjs` measures the a11y and word bars. Proof: `--prove` 33/33.

- (2026-10-07) 2D Fit: fixed the view's unit (5 / half-width), not the camera's; see Top of mind 9.
  Lessons: test framing with a graph taller than the canvas too; trace the app's actual call first.

- (2026-10-07) Load and run announced on one status line: the store's `announcement`, rendered
  by the toolbar's polite region ("<project>: N nodes, M edges"; "<Method> finished / failed /
  stopped"). `StateCard` lost `role="status"`. Proof: `CanvasOverlays.test.tsx` status-line tests,
  T7 in `tasks.real-element.test.tsx`, `tmp/check-r2-announce-load-and-run/`. Gaps: no line at
  load start; the same text twice is not re-announced; focus falls to body after a start-screen
  sample open.

- (2026-10-07) Canvas name, focus ring, no autofocus (element): the element copies `aria-label`
  to its shadow canvas, rings it inside (`outline-offset: -2px`; the app's `overflow: hidden`
  clipped the ring), and dropped `autofocus`. Owner door recorded. Rejected a `canvas-label`
  attribute, an English default name. Proof: `test/browser/element-canvas-a11y.test.ts`.

- (2026-10-07) Which columns can group a layout: answered by `catalog.optionsFor` (a partition's
  `values`), not a new method; see Top of mind 3. Async, so the app resolves it in a hook.

- (2026-10-07) A covered legend block is dropped, not flagged. `styles.legend()` omits a block
  whose channel a higher enabled layer of the same target paints on every element the block's
  layer reaches; the English `painted over by "<layer>"` departure is deleted. Rejected: a neutral
  `coveredBy` field (new public API, and every consumer must remember to filter or show a false
  key); the app parsing the sentence (workaround, and element English). Evidence: trace test
  printed `departures: ["painted over by \"Communities\""]` on Degree's block before the change.
  The old shell (`components/shell/canvas/`) never parsed the sentence; only an AppShell comment
  named it. Lesson: when the element "already detects" something, check whether it reports it only
  in words -- that is the neutrality defect and often the whole bug.

- (2026-10-07) Rounds 1-2: round 2 passed 52 of 54 (both failures screen reader); round 1
  decisions in `rounds/round-1/decisions.md`.

- (2026-10-06, folded 2026-10-07) Focus after a Style pick moves to the first control of the
  new line (e82708488; its `returnFocus={false}` is superseded by the Menu theme fix, Top of mind
  14). Study runner: idle sessions close after 15 minutes, at most 3 session agents, `--end` after
  every attempt. Focus rings for plain controls are compact-mantine's (28bcb71a0); app code never
  draws its own.

- 2026-10-06 -- "No crossings" on a non-planar graph: the element already refuses (`E_INTERNAL`,
  previous layout kept; `test/browser/planar-refusal.test.ts`); the app's notice never reached the
  reader. Now the Method select shows Mantine's `error` line naming the method until the layout
  changes (`LayoutRefusal.real-element.test.tsx`). Lesson: test the element first.

- 2026-09-13 to 10-05 -- Standing owner decisions (see Top of mind 6): a run paints as soon as
  it finishes; tier 1 is the real app under `graphty/src/workspace/` at `/?next`. The group-row
  color fallback in `graph-place/rows.ts` stays until #1099 removes it.
- 2026-10-06 -- Study tooling element APIs `nodeScreenPosition(id)`, `elementAt({x, y})`,
  `labelOf(id) -> { text, drawn }`: held PRs merged into the studio worktree; owner to confirm
  names. The element's default layout seed was undone (owner; `owner-decisions.md`); the app seeds
  on the tag and on Method picks (`LayoutSeed.real-element.test.tsx`).
- 2026-10-06 -- Studies run on a local production build of the studio worktree, not on graphty.app
  and not after the release. Owner (this run's brief).

- 2026-10-06 -- Smaller fixes, all proven (`tmp/check-r0-*`): truncated GraphML/GEXF refused
  whole; camera keys ignore chords; Modal always has an overlay; failed open returns to start;
  exported images carry the legend (public `ScreenshotOptions.legend`, owner to confirm); exports
  write a group as its size rank (`owner-decisions.md`).

- (2026-10-07) **Round 2 changes, built and re-piloted (detail folded from Top of mind).**
  Key: `buildLegend()` skips a block `coveredBy()` finds; partial cover keeps its block
  (`legend-covered-layer.test.ts`). Run name: `runName()` in `analyze/words.ts` keeps the scope
  qualifier, passes through labels not starting with the plain name. Grouping: `catalog.optionsFor`
  fills partition `values` with categorical node columns incl. run results; app `groupings()`
  deleted. Size "+": `openListNext()` in `useFocusLine.ts`, "Fixed size" first. 2D Fit: built-in
  view used pixels per unit with aspect inverted; `FLAT_HALF_WIDTH_AT_ZOOM_ONE` in
  `camera/builtins.ts` (also fixes Frame selection, `zoomToNodes` in 2D). Re-pilots confirm each
  on screen. Why it worked: every change traced the cause first and named a test failing on the
  old build.
- (2026-10-07) **Lesson: trace before fixing** (key cover was already proved by the element, only
  in English; 2D Fit was the view's zoom units). Again on 2026-10-07: the halo "hidden but drawn"
  was the frozen mesh list.

## Tried: worked / did not work

- **(2026-10-06) Screen-reader mode in `real.mjs`: worked** (CDP AX tree on the deep
  `activeElement`; init-script MutationObserver for live regions).

- **(2026-10-06) Mouse wheel zooms the 3D orbit camera: worked** (d9e5cc8dc). A canvas `wheel`
  listener in `OrbitInputController` (passive: false, added/removed in enable/disable), not a
  scene POINTERWHEEL observer. One notch (deltaY 100, clamped) = cameraDistance *
  keyboardZoomSpeed / 2 (10%); a fixed 0.2-unit step is invisible at 300 units. No new option or
  public API. Proof: `input-speed.test.ts` wheel test fails without it; `tmp/check-r1-wheel-zoom/`.
- **(2026-10-06) Open: the live Selection row is blank after the neighbor route.** On the running
  app (`tmp/check-r1-summary-cleanup/06-08.png`): Valjean, Degree, then the Selection row (37)
  shows the header and no body, even after 5 s and an Everything/Selection round trip. The same
  component in a headless test renders. Suspect `useAsyncValue` reset by a steady stream of
  session events (it sets undefined on every version bump) or a refused `statistics()` read in
  the live element; not yet traced. Escape from the neighbor list now returns to the single node,
  so the Selection row is the only way to the several-node Summary from the neighbor route.

- **(2026-10-06) Worked, small:** empty summary rows, ComboInput arrow, undirected arrowheads,
  dead-end clicks (b11881bb2, b7bc18953, cae3dca4d); proofs under `tmp/check-r1-*`.
- **(2026-10-06) A "missing route" was a routing bug: worked.** The Neighborhood command never set `inspected: neighborhood`; routing it through `openNeighborhood` fixed it (8f4891b7c). Lesson: before designing a new affordance for a hard task, check whether an existing door reaches the wrong screen.

- 2026-10-06 -- Analyze keyboard pick as the ARIA combobox pattern (focus stays in the filter,
  `aria-activedescendant`, first match active): worked; `tmp/check-r0-analyze-keyboard-pick/`.
  The `AnalyzeFiltered` story's baseline changed (owner review).
- (2026-10-07) **Shared worktree: stage by building the index, never by copying files.** Another
  agent had uncommitted edits in the same files (ScreenshotCapture.ts, types.ts, choices.ts, the
  API report). Worked: a script that takes `git show HEAD:<path>`, applies only my edits, and
  writes it with `git hash-object -w` + `git update-index --cacheinfo`
  (`tmp/r3fix-export-no-selection/stage.py`). Did not do well: proving "fails without" by copying
  HEAD over a SHARED file -- it briefly wipes the other agent's edits; prove with a scratch copy
  of the test against a HEAD build instead. The app's `vite build` can exceed Node's 4 GB heap:
  `NODE_OPTIONS=--max-old-space-size=8192 npx vite build` in graphty (env knob, not a code change);
  another agent's half-done TS edit can also fail `nx run graphty:build` -- copy a good build to
  your session folder and use `REAL_DIST`.
- (2026-10-07) **Nx can restore a partial element dist.** `nx run graphty-element:build` said
  "from cache" yet `dist/` had no `.d.ts`, so `npm run api:report` failed; `npm run build` in
  graphty-element fixed it. Vitest browser runs go through `with-browser.sh` too. The Bash safety
  check refuses `rm -rf $VAR/...`: use a fresh session folder instead.
- (2026-10-06) **Testing lessons.** Prove a test fails on old code by copying `git show
  HEAD:<path>` over the file and back (no stash or checkout); run a new app test against the old
  build too. Probe focus with a `--type` step before blaming the app for a dead key. Hover a name
  span (`"Edges per node#2"`), not its stat group. Real-element popover tests need
  `page.viewport(1366, 768)` and must wait for `aria-disabled` to clear. "0 labels" was the camera
  spin keeping the view unsettled: look for motion first. Check `git diff HEAD` per file right
  before staging. Never call an unexplained failure a flake. Two agents' `--prove` runs clobber
  each other's `tmp/prove/` and a rebuild empties `dist`: check `pgrep -af "real.mjs --prove"`
  and rerun before trusting a FAIL.

- (2026-10-06) **Layout and load checks (folded from Top of mind).** Check a layout against a
  reference before a study offers it (Spectral was wrong until matched against numpy). A load the
  counts say worked can still draw nothing (store and render half fed separately in `ingest.ts`):
  assert on `element.graph.getNodes()` too.

## Thinking

- **(2026-10-07) The files a decision lists are a start, not the set.** The run-name decision
  listed ten files; Why this look printed the run's layer name too. Grep every route of the value
  (`run.label`, the name of a run-owned layer) before calling it done.

- **Element English in descriptors (2026-10-06).** `channels.ts` plainName still says "Node
  Colour" and Layer.ts validation messages build sentences from it. If one reaches the screen
  again, the fix is the element returning codes, not an app rename. Also: root prettier reflows a
  line in `graphty-element/test/session/styles/encoding.test.ts`; format only my own hunks there.

- **(2026-10-06) Untraced, small.** Header still "Untitled" after "New from data..." Load
  (`tmp/check-r0-new-from-data-empty-canvas/04.png`). `notReadSentence` words only
  `E_PARSE_FAILED`; another open refusal shows element English: map it there from `refusalFor`.

- **Open project or file... reopening a project.** #913 closed in the element with "one intake
  verb"; the app still imports a `.graphty.json` as data. A tier 1 task (save, close, reopen) only
  passes today through Recent projects. Adoption should be a small app change.
- **The image key's look (2026-10-06).** A fixed light card top left that can cover nodes; a
  fix is a placement option or camera fit (owner API questions), not app styling.
## Sources

- Digests in `design/ui/studio/digests/` (`tier1.md`, `decisions.md`, `study-rounds.md`,
  `owner-voice.md`, `framework.md`); repository `CLAUDE.md`; `design/ui/studio/tool/README.md`.
- Tier 1 design and plan on branch `feat/tier1-real-app` under `design/ui/tier1-real-app/`.
- App comments that cite element issues (2026-10-06): `export/ImageOutput.tsx` #133;
  `inspector/Inspector.tsx`, `NodeValues.tsx`, `RunValues.tsx` #895; `canvas/LegendCard.tsx`,
  `legendWords.ts` #912; `inspector/GraphValues.tsx` #903/#900; `graphty/src/data/sampleManifest.ts` #796.
- Transcript `.claudehistory/3a19ea55-f3cc-4fc0-b85f-842243f52536.jsonl` (2026-10-03 to 10-06);
  owner memory notes (do not blame timing; cap workflow browsers; the image model only transcribes;
  visual capture is the whole canvas).
