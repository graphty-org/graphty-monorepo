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

1. (2026-10-07) Round 3 proposal, in order (round 2 ran on 4a7a1a7fb): (a) menu-to-dialog focus
   -- Main menu > Export... / Keyboard shortcuts leave focus on "Main menu" behind the open modal
   (`rounds/round-2/repro/r2-s07/run-menu.log`); same race as the Style "+" menu, fix the same way
   (`returnFocus={false}` on `MainMenu` in `frame/menus.tsx` and the table dock's options menu),
   prove Esc still returns to the trigger; (b) stale key -- done, see 2; (c) run named by method, decided in
   round 1 and STILL unbuilt (`run.label` in Inspector, NodeValues, RunValues, reads, legendWords);
   (d) "Degree N >" chevron inside the row's button; (e) group layouts after a community run (done);
   (f) 2D Fit: DONE 2026-10-07, see 8. (g) load and run announcements: DONE 2026-10-07.
2. (2026-10-07) DONE: the key leaves out a covered layer. Traced first: after Degree then
   Louvain, `covers()` in `StylesApi.ts` DID prove the cover (Louvain's `has group` test passes
   on every row Degree measured); the only gap was that the element said so in English the app
   drops. Now `buildLegend()` skips a block `coveredBy()` finds and the English departure is gone;
   a partly covered layer keeps its block. No exported name changed; behavior change recorded in
   `owner-decisions.md`. Proof: `test/browser/legend-covered-layer.test.ts` (real Degree + Louvain)
   and the unit tests in `legend.test.ts` / `StylesApi.test.ts` fail on the old file;
   `tmp/check-r2-key-drops-covered-layer/a/07.png` and its exported PNG show only
   "Color: Communities". The Style tree still lists the Connections row (it is a layer, not a key).
3. (2026-10-07) DONE: grouping layouts take run results. `catalog.optionsFor` fills a node
   partition's `values` (attributes + finished runs' categorical node fields, no key/label, no
   value-per-node); the app's `useLayouts()` in `layout/methods.ts` resolves the grouping layouts
   and `OptionsForm` lists `option.values`. Owner door recorded. Left: Two columns shows the
   element's English estimate reason ("needs exactly two groups ... names 4") -- needs a code.
4. (2026-10-07) Not for round 3: 4x print re-render (T13 passed 2 of 2; labels are textures, a
   render-target capture is a risky swap), selection ring in export, label-count-vs-dot overlap,
   hover tooltip default, key placement / fit insets (owner API), a "show all names" control
   (T10's prompt asked for what the build lacks; reword the task first), the sizing chain (decide
   as design, not engineering; a second bind route was rejected in round 1).
5. (2026-10-06) Graph logic goes in graphty-element, never the app; an app comment explaining why
   the element could not be used is an element bug report. The element returns neutral facts and
   `{ code, params }`; the app owns words. Style only through layers; suggested layers paint only
   their result. Public element API = owner one-way door: `owner-decisions.md` + `npm run api:report`.
6. (2026-10-06) No default layout seed in the element (owner). The app seeds itself: `LAYOUT_SEED`
   and `takesSeed()` in `layout/methods.ts`; seed on the tag in `ElementHost.tsx` and on every
   Method pick. Any new layout path passes the seed. A fixed seed makes overlay overlaps one event
   per dataset, not per session.
7. (2026-10-06) Test the element first, and check whether an existing door reaches the wrong
   screen before designing a new affordance (planar refusal, Neighborhood route).
8. (2026-10-07) DONE: 2D Fit frames the whole graph. The app's Fit is
   `applyCameraView("fitToGraph")`, not `zoomToBoundingBox` (the decision's suspect, correct). The
   built-in view answered 2D zoom in pixels per unit with the aspect inverted; the camera reads
   zoom as 5 / half-width. Fixed in `camera/builtins.ts` (`FLAT_HALF_WIDTH_AT_ZOOM_ONE`, shared
   with `RenderManager`), zoom documented on `CameraState`, owner-decisions entry. Also fixes
   Frame selection and `zoomToNodes` in 2D. Proof: `fit-frames-whole-graph.test.ts` (wide and
   tall rings; 2D fails on old code), stories "Camera Controls/Fit 2D" and "Fit 3D" (new
   baselines), `tmp/check-r2-fit-2d-whole-graph/a/06.png`, `08.png`.
9. (2026-10-06) Every count on screen is computed from live element state, and every claim is
   checked against the drawing. Look for motion first ("0 labels" was the camera spin).
10. (2026-10-06) Open items still untraced: live Selection row blank after the neighbor route;
    reopened run row has no count (element); Force re-applied with a new spring length freezes as
    a cloud (`repro/r2-s40/run/13.png`); Effects Outline black blobs; CSV headers internal.
11. (2026-10-06) Re-record the answer key after every wording change (T11 refusal line, T13 tabs,
    and run names once (c) lands).
12. (2026-10-07) Baseline on 4a7a1a7fb (`rounds/round-2/baseline/bars.md`): bar 9 = 42 app words
    at rest (36 without the dataset title), so no round 3 fix may push it above 42; bar 8 axe fails
    on ONE cause, dimmed `#8c8c8c` on `#2c2c2c` (4.15:1) = compact-mantine `compactDarkColors[2]`.
    Re-measure with `tool/bars.mjs <out> [--dist <copy>]`. Simulated participants are one model:
    trust a scripted repro or a cause in code over a participant count. Others rebuild
    `graphty/dist` every few minutes in a fix phase, so a `--prove` fails on vanished assets: copy
    the build, use `REAL_DIST=<copy>` (real.mjs) or `--dist` (bars.mjs).
13. (2026-10-06) Iterate locally: change, rebuild (element first, then `pnpm exec nx run
    graphty:build`), re-run with `tool/real.mjs`. Never push. Stage only my hunks; check
    `pgrep -af "real.mjs --prove"` and rebuilds before trusting a FAIL.
14. (2026-10-06) Focus follows the pick (`focusNodeValuesNext()`, `focusLineNext()`); a Menu whose
    item opens something that takes focus needs `returnFocus={false}`. No two reachable controls
    share a name. Use compact-mantine defaults; fix the shared component. One group number
    everywhere (`partitionGroupRanks()`); the legend shows only what the drawing shows.
15. (2026-10-07) The drawing's canvas is named by the host's `aria-label` (app: "Graph drawing"
    in `ElementHost.tsx`), has no autofocus, and draws the browser ring inside itself. Re-record
    any answer key or repro that expected `Canvas (no name)` or focus on the canvas after an open:
    focus now stays on the page body after a file opens.

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

- (2026-10-07) Study tool (`tool/real.mjs`): a focus line adds `; highlighted: option "..."`
  for `aria-activedescendant` (resolved in its own root, read from the AX tree); `--read` is
  browse mode over the open modal, else the region/landmark/form around focus (full AX tree, text
  runs, headings with level, controls as single items, 80-line cap); a live region first seen
  already filled ends `-- unconfirmed` (not `role=alert`, read on arrival); `REAL_DIST` serves a
  build copy. Proof: `--prove` 33/33 on the frozen build (`tmp/engineer/prove3.out`); the three
  new checks fail on the old tool. New `tool/bars.mjs` (bar 8 axe, bar 9 words) gave the
  4a7a1a7fb baseline in `rounds/round-2/baseline/`. Added preflight item 10 to `criteria.md`.
  Rejected: the option's DOM text (a screen reader reads its accessible name). Left to the round
  3 runner: re-running r2-s07 first (a persona session).

- (2026-10-07) 2D Fit: fix the view's unit, not the camera's. `fitToGraph` answers zoom as
  `5 / half-width`, the unit `setCameraState`, `getCameraState`, `setCameraZoom` and `zoomStep`
  already use. Rejected: zoom as pixels per unit (breaks every saved camera state), a new
  `CameraViewInput` field for the constant 5. The unit-only fix passed my wide-ring test, but the
  new story's tall graph still failed: the aspect was also inverted. Lessons: test framing with a
  graph taller than the canvas as well as wider; trace the app's actual call before the named
  suspect -- an unresolved repro step (r2-s14's canvas click) was not the cause.

- (2026-10-07) Load and run announced on one status line. The store holds `announcement`; the
  toolbar's persistent polite region renders it. `useCanvasReading` writes "<project>: N nodes, M
  edges" (from `data.statistics()`) on the load's progress `end`, and "<Method> finished / failed /
  stopped" on a command run's `end` (method name from `wordsFor(descriptor)`, else `run.label`);
  each replaces "added, running". `StateCard` lost `role="status"`: the study tool showed its
  lines arrive pre-filled (unconfirmed) and the empty card's "No nodes to draw" flashing past
  during a sample open. Proof: two "status line" tests in `CanvasOverlays.test.tsx` fail on the
  old code; T7 in `toolbar/__tests__/tasks.real-element.test.tsx` waits for "Untitled: 34 nodes, 78
  edges" and "PageRank finished"; `tmp/check-r2-announce-load-and-run/` (screen-reader mode: one
  confirmed live line per event). Not done: a "Reading <name>" line at load start (long loads say
  nothing until done; add if a study shows a wait); refused loads (#902). Known gap: the same text
  twice in a row (reopening the same sample) is not re-announced. Seen in passing: after opening a
  sample from the start screen, focus falls to the page body.

- (2026-10-07) Canvas name, focus ring, no autofocus (element, `Graph.ts` and
  `graphty-element.ts`). Causes found: (a) the canvas sits in the element's shadow root, so nothing
  on the page could name it; (b) the browser's ring WAS drawn (`outline: auto`, `:focus-visible`
  matched) but outside the canvas box, and the app's `.ws-canvas` (`overflow: hidden`) clipped it
  -- found by walking computed `overflow` up from the canvas, no CSS anywhere set `outline: none`;
  (c) `autofocus` on the canvas pulled focus into the drawing when it mounted after a file opened.
  Fix: the element observes `aria-label` and copies it to the canvas (kept across the WebGPU
  canvas swap), `canvas:focus-visible { outline-offset: -2px }` in the host styles, autofocus
  removed. Public API (owner door, in `owner-decisions.md`): `observedAttributes` and
  `attributeChangedCallback` on `Graphty` in the API report, `"aria-label"` in the JSX props.
  Rejected: a `canvas-label` attribute (a second name for `aria-label`), an English default name,
  a ring color variable. Proof: `test/browser/element-canvas-a11y.test.ts` (3 tests, all fail on
  the old element); `tmp/check-r2-canvas-name-focus-ring/sr/` prints `focus: Canvas "Graph
  drawing"` and `nothing (the page itself)` after the open; `vis2/06.png` shows the ring (1px
  #101010 plus 2px white inside the canvas edge), `05.png` none.

- (2026-10-07) Which columns can group a layout is answered by `catalog.optionsFor`, not a new
  method: it already resolves data-dependent option facts (node ids, bounds), so a partition's
  `values` is the same kind of fact and adds no exported name. Labels: attribute `plainName`, run
  `label` (the app already shows run labels verbatim). `layout.set` already took
  `results.<run>.group` (`layout/groupBy.ts`), so the defect was only the app's list. Evidence:
  `test/session/options-for.test.ts` ("offers a grouping layout every column..."), app test
  `LayoutPopover.real-element.test.tsx` ("offers Rings by group once a community run..."),
  `tmp/check-r2-group-layouts-take-results/04.png` (disabled before) and `10-12.png` (enabled,
  "Group by: Communities", rings drawn). Async `optionsFor` means the app resolves in a hook;
  the static descriptors stand in until the answer arrives.

- (2026-10-07) A covered legend block is dropped, not flagged. `styles.legend()` omits a block
  whose channel a higher enabled layer of the same target paints on every element the block's
  layer reaches; the English `painted over by "<layer>"` departure is deleted. Rejected: a neutral
  `coveredBy` field (new public API, and every consumer must remember to filter or show a false
  key); the app parsing the sentence (workaround, and element English). Evidence: trace test
  printed `departures: ["painted over by \"Communities\""]` on Degree's block before the change.
  The old shell (`components/shell/canvas/`) never parsed the sentence; only an AppShell comment
  named it. Lesson: when the element "already detects" something, check whether it reports it only
  in words -- that is the neutrality defect and often the whole bug.

- (2026-10-07) Rounds 1 and 2 (summary). Round 2: 52 of 54 tasks, both failures the
  screen-reader persona; neighbors fixed by the round 1 routing fix. Round 1's decisions
  (`rounds/round-1/decisions.md`): I built changes 1-10; rejected a Degree-row cue (two changes at
  once hides which helped), a refusal code (app knows the method), filling the Size list (second
  bind route), a Style-tab signpost (one model's guess).

- (2026-10-06) Focus after a Style pick (commit e82708488): a pick moves focus to the first
  control of the line it made (`[data-line]`, waiting for `[data-bound]` after a bind); the "+"
  Menu has `returnFocus={false}` so Mantine's 10 ms return cannot win; Esc still returns. Rejected
  per-component state (lost on remount). Proof: "focus after a pick" in
  `StyleTab.real-element.test.tsx`; `tmp/check-r1-focus-after-pick/`.

- (2026-10-06) Study runner. Round 1's "failed 40m00s" sessions were runner timeouts (an agent's
  clock ran while `real.mjs --start` waited for a browser slot; stopped agents kept slots). Now a
  session nobody steps for 15 minutes closes itself, counted from the end of the last request
  (commit 7d40cfe59); the rounds workflow runs at most 3 session agents, `--end` after every
  attempt, and asks ease as "1 (very difficult) to 7 (very easy)" (round 1 ease = 8 minus answer).

- (2026-10-06) Keyboard focus ring for plain controls (28bcb71a0): compact-mantine rings any
  `.mantine-focus-never` control with no `cm-` class on `:focus-visible`. App code never adds its
  own focus ring; a missing ring is a compact-mantine fix.

- 2026-10-06 -- "No crossings" on a non-planar graph: the element already refuses (`E_INTERNAL`,
  previous layout kept; `test/browser/planar-refusal.test.ts`); the app's notice never reached the
  reader. Now the Method select shows Mantine's `error` line naming the method until the layout
  changes (`LayoutRefusal.real-element.test.tsx`). Lesson: test the element first.

- 2026-09-13 to 10-05 -- Standing owner decisions: styling only through layers, algorithms never
  mute others, the element owns all graph logic (`CLAUDE.md`); a run paints as soon as it
  finishes; tier 1 is built as the real app under `graphty/src/workspace/` at `/?next` (no more
  mocks); the element is neutral about presentation. The group-row color fallback in
  `graph-place/rows.ts` stays until #1099 removes it.
- 2026-10-06 -- Study tooling element APIs `nodeScreenPosition(id)`, `elementAt({x, y})`,
  `labelOf(id) -> { text, drawn }`: held PRs merged into the studio worktree; owner to confirm
  names. The element's default layout seed was undone (owner; `owner-decisions.md`); the app seeds
  on the tag and on Method picks (`LayoutSeed.real-element.test.tsx`).
- 2026-10-06 -- Studies run on a local production build of the studio worktree, not on graphty.app
  and not after the release. Owner (this run's brief).

- 2026-10-06 -- Smaller fixes, all proven (commits and `tmp/check-r0-*`): truncated
  GraphML/GEXF refused whole; camera keys ignore chords; themed Modal always has an overlay; a
  failed open returns to start with a lasting notice; exported images carry the legend
  (c77e473ab, public `ScreenshotOptions.legend`, owner to confirm); a load draws every node its
  edges name; chrome tooltips; truthful `keyBlocks()`; one Everything row; exports write a group
  as its size rank (file format, `owner-decisions.md`).

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

- **(2026-10-06) Worked, small:** summary rows that say nothing (b11881bb2), the empty
  ComboInput arrow (b7bc18953, compact-mantine), undirected arrowheads, dead-end clicks (cae3dca4d). The Selection row renders `SeveralValues`;
  a Sources table click opens the dock via the one-shot store request `tableOn`. Tests fail on old;
  `tmp/check-r1-dead-end-clicks/s1/`.
- **(2026-10-06) A "missing route" was a routing bug: worked.** The Neighborhood command never set `inspected: neighborhood`; routing it through `openNeighborhood` fixed it (8f4891b7c). Lesson: before designing a new affordance for a hard task, check whether an existing door reaches the wrong screen.

- 2026-10-06 -- Analyze keyboard pick as the ARIA combobox pattern (focus stays in the filter,
  `aria-activedescendant`, first match active): worked; `tmp/check-r0-analyze-keyboard-pick/`.
  The `AnalyzeFiltered` story's baseline changed (owner review).
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
- **Run landing above a reader's layer.** Today a suggested style is suppressed by a reader-set
  "Everything" color, with a notice. If the study shows first-time users never see their run, the
  remedy is a design decision for the owner, not a quiet code change.
- **The image key's look (2026-10-06).** A fixed light card top left that can cover nodes; a
  fix is a placement option or camera fit (owner API questions), not app styling.
- **What a study can and cannot observe.** The tool drives a headless browser and asserts on
  element reads; it cannot judge color legibility or motion. Visual claims need a screenshot and a
  human-readable check, and the image model only transcribes; its yes/no answers are not evidence.

- **Public API report (2026-10-06).** Any element change that adds a public member needs
  `npm run api:report` in the same commit and a line in `owner-decisions.md`.
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
