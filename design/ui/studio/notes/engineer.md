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

0000. (2026-10-07) **Filter steps (8966b0888, element, owner door, hold + needs-decision).**
   `visibility.steps` / `setSteps([{ id, on, rule }])`, AND of the on steps and the single
   filter (`combinedRule`, memoized by identity, in `visibility/steps.ts`); slice key
   `visibility/steps` (default empty, so digests of old states changed). Fact by diffing the list:
   `visibility.step-add|edit|on|off|remove {id}` or `visibility.steps`. No coalescing: a slider
   drag on a step needs a transaction. `plan({ op: "visibility.steps", steps })` -> effect
   `{ kind: "steps", start, steps: [{ id, nodes, edges }] }`. friends.csv: 20/41 -> degree>=4
   19/38 -> Ava's 1-hop 7/10 (same on :9366, `tmp/t2feat-el-filter-steps/steps-probe.mjs`). App
   has no filter UI yet; history words added in `historyWords.ts`. Session-internal
   `visibility.rule` is what sets, runs' "visible" hash and captures read now, not `filter`.
000. (2026-10-07) **Every load is kept: `session.data.sources()` (f141b1283, element, owner door,
   hold + needs-decision).** One `LoadedSource` per load still in the graph (descriptor + `tables`
   names + `added: { nodes, edges }`); graph value `sources` written by `Ingest.importSource`
   (merge appends, replace resets), saved as `graphty-data.sources`, renamed with the last entry.
   Proof: `test/session/data-sources.test.ts`; on :9366 friends.csv then Add data... messages.csv
   (unmatched "Add") gives 20/41 + 13/23, undo one, redo two (`tmp/t2feat-el-sources/sources.mjs`).
   App side of audit defect (g) still open: Sources list and header read `source()` only.
00. (2026-10-07) **Every run reads the loaded weight (element, owner door, hold + needs-decision).**
   `Algorithm.weightMeaning` (static; strength/distance/capacity/null) -> catalog
   `descriptor.weightMeaning` + a uniform `weight` option on every weighted algorithm (absent =
   loaded, null = none, column or `{ attribute, meaning }`). Resolver: `algorithms/input/weight.ts`;
   base `input()` injects it, `weightCaveats()` states it; mismatch -> counts hops +
   `caveats.weightSkipped` `weight.meaning-mismatch {attribute, meaning, reads}`. Loaded weight =
   `dataManager.lastImport.weights.attribute` + `knownFields.edgeWeightMeaning`. App follow-ups:
   Analyze/Made with "Weight" select shows "None" for absent (now means the LOADED weight); no app
   screen shows caveats (weight read or skipped) yet. Mock graphs: `createMockGraph({ loadedWeight })`.
0. (2026-10-07) **Tier 2 audit on build b40f264a9 (`tmp/t2-audit/`, sessions s1-s4, probes in
   `probe/`).** Works end to end: shortest path via Analyze (2 nodes selected), Neighborhood +
   "Grow by one hop", Find value rows ("Select where team is X"), adding rows via the Data page
   (counts right; runs need "Update <run> row" by hand). App has NO UI for filters, filter chip,
   Path popover/P, notes, Replace with file, Select where dialog, node weight, weight meaning.
   Element HAS filters (`visibility.set`), notes (`notes.*`), depth 1-3 + direction, `{ where }`.
   Defects found: (a) clicking a Shortest path run row CRASHES the app (`RunValues` calls
   `histogram("onPath")`, boolean); (b) Find "=weight > 3" throws uncaught (needs backticks),
   nothing shown; (c) edge-attribute filter 0/0 FIXED (559f5dcb2, see item 1);
   (d) selected edges get no canvas mark and edges are not pickable; (e) FIXED, see 00; (f) Edit source...
   opens an empty "Add to" page and a re-chosen file is ADDED (41 -> 74 edges), never replaced;
   (g) Sources lists only the last added file (element side FIXED, see 000); header "Graph <last file>"; (h) `run.stale` is
   set by the element (ranOn/nowVisible counts) but the app never reads it; a same-size
   replacement would not be flagged at all; (i) the element caps a load at one node table plus
   one edge table (`draft.ts` "at most one table of"), the app at two files.
1. (2026-10-07) **Weight meaning at load DONE (element, owner door, hold + needs-decision).**
   `TableMapping.weightMeaning` (strength|distance|capacity|null) -> config
   `data.knownFields.edgeWeightMeaning` (saved, undoable); `session.data.loadedWeight()` =
   `{ attribute, meaning }` or null; `WeightMeaning.meaning` takes `capacity`. A replace load
   through a draft or a plain `import` resets a stale meaning to null. NOT done: runs reading it
   (another task), app UI to choose it (the app passes no meaning today: friends.csv reports
   `{ attribute: "weight", meaning: null }`).
2. (2026-10-07) **Tier 2 build plan (my proposal; sources: tier 1 design section 7, refined B
   sections 2.3, 7, 8, 10.1, 11.3, 18.9).** Element first, in this order, because each unblocks
   app work: (1) DONE 559f5dcb2 (owner door, hold + needs-decision): `range`/`categories` speak
   each half that carries the path; `nodes: "all"|"ends"` (friends weight>=4: 20/12 or 19/12);
   the app's filter UI should offer both, default "all"; (2) every run
   defaults to the loaded weight and a weight carries a meaning (strength|distance|capacity) --
   owner door; (3) a run result says each field's type so the inspector never histograms a
   boolean (fixes the path-row crash in `RunValues.tsx` MeasureValues, app side: branch on it);
   (4) query errors as `{ code, params }` (Find "=weight > 3"); (5) edge picking + edge
   selection style; (6) `run.stale` also on a data fingerprint, not counts only. Several node
   types / Links to / One edge per Pair is the largest element item -- last. Undecided by the
   design: OR/NOT between steps (keep "all"), Path popover's run grouping key, where Replace
   puts runs (I proposed: stale state bar, never auto-rerun). Re-measure verify results
   (`next-steps/verify/results.md`) before trusting old numbers; `git status` before a build stamp.
2. (2026-10-07) Focus after close FIXED (element + app + compact-mantine). Targets: a graph opens
   (sample, file, recent, New project, Data page Load) -> the drawing; start screen comes back,
   usage card answered, file refused, last Recent row removed -> "Open project or file...";
   Recent row removed -> the row now in its place; style line removed -> its section's first
   control; tree row deleted -> the row now in its place (Tree); table or notice closed -> the
   drawing; members chip x -> Nodes tab; New from data... -> "choose a file...". Dialogs and
   menus return to their opener (the drawing too, via `delegatesFocus`). Keyboard repro scripts
   written before this count Tabs from the page body: re-count them from the new focus.
3. (2026-10-07) Element English on screen: layout refusals FIXED (481c6715a, owner door, hold +
   needs-decision): `CostEstimate.refusal` = `{ code, params }`, 16 codes (`layout.*`,
   `algorithm.*`, `estimate.*`); app words in `layout/refusalWords.ts`. Still English: Analyze's
   algorithm refusals (codes exist, app words not written -- `AnalyzePopover.tsx` `estimate.reason`),
   `MetricAvailability.reason`, layout descriptions (`catalog/layouts.ts`, "with `dim: 2`",
   "centre"), `run.label`, partition choice labels (`root.label`).
   Fix = codes from the element, words in the app; never an app rename or string match.
   (2026-10-07) Selector refusals FIXED in the element (3d89d43c3, owner door, hold +
   needs-decision; owner asked whether bare numbers should be accepted): every `E_BAD_SELECTOR`
   has `details.reason` (17 expression codes, 10 shape codes; member scope details moved to
   `details.scope`). App side still OPEN: Find "=weight > 3" throws uncaught and shows nothing --
   catch it and word it by `details.reason` + `position`.
4. (2026-10-07) FIXED, owner doors on hold + needs-decision: 3D size misreading
   (`layoutBehavior.node.depthIndependentSize`; anything setting a node mesh's `scaling` fights
   `UpdateManager.sizeNodesForDepth`); key covering nodes (`viewInsets`, fa260f20d; a reader's
   camera is refit when the card resizes); 2x/4x exports drawn at size (6783ba895: a pixel-sized
   mesh reads `engine.getRenderWidth()` in the render and honors `setPixelScale`).
8. (2026-10-07) Small open defects: Columns by group ignores group order; Circle draws a sphere
   in 3D; group named three ways; truncated labels; Id/id. Study tool: `ambiguous` on a label
   plus its input is a tool defect, not a wrong turn. No `--shift-click-at`: select two unlabeled nodes with Find `=id == 'A' || id == 'B'`.
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
12. (2026-10-07) Bars: 41 app words at rest (limit 50); axe 0 on all 13 screens in both schemes
   (`tool/bars.mjs <out> --scheme light`). New `c="dimmed"` text sits on panel/field/menu, never
   on default-hover. Trust a scripted repro or a cause in code over a participant count.
13. (2026-10-06) Iterate locally: element build, then `pnpm exec nx run graphty:build`, re-run
   with `tool/real.mjs` (no eval step: read the element with a Playwright script on :9366;
   "Add data..." via Control+k; its unmatched choice defaults to "Leave out"). Concurrent
   `nx run graphty:build` runs delete each other's `graph-io/dist` and `graphty/dist`: wait for
   their PID, then `npm run build` inside the package. Others rebuild `graphty/dist` often: copy the build and use
   `REAL_DIST=<copy>`; check `pgrep -af "real.mjs --prove"` before trusting a FAIL. Never push.
   (2026-10-07) The app's vite build now runs out of Node's default 4 GB heap ("rendering
   chunks", core dumps in `graphty/`): build with `NODE_OPTIONS=--max-old-space-size=12288`.
   Other agents rebuild the element mid-build; wait until no element build runs first.
14. (2026-10-07) Focus: the compact-mantine Menu theme returns focus only from inside the menu;
   never add `returnFocus={false}` again. The canvas has no autofocus; the app hands focus to the
   drawing with `element.focus()` (host `delegatesFocus`). A control that removes itself must
   name where focus goes (`frame/focus.ts focusIsLost()` before handing it on); never leave it.
   Also: the element FREEZES Babylon's active-mesh list on a still frame
   (`UpdateManager.settleActiveMeshFreeze`). A mesh enabled or disabled outside an update pass is
   ignored until something unfreezes it: call `getUpdateManager().meshesShownOrHidden()`. Suspect
   this first when "I hid it and it is still drawn" (or the reverse).

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

- (2026-10-07) **Filter steps as one list verb, counts only in `plan` (8966b0888, owner door).**
  `setSteps(list)` rather than add/edit/toggle/remove verbs (a form holds the whole list; the fact
  names the one step changed). Per-step counts in `plan` only, so no consumer pays a pass per step
  on every change. Steps live beside `filter`, not folded into it, so an unticked rule survives
  undo and the project file. Rejected: live counts on `summary`; OR/NOT between steps (unasked).
- (2026-10-07) **Edge-attribute filter (element, owner door).** Cause: `rangeTest`/`categoriesTest`
  read `nodeValue` only, so `data.weight` hid every node and every edge followed its ends. Fix in
  `compileAttribute` (filter.ts): a half speaks when its elements carry the path (session answers
  via new optional `FilterValueSource.halvesOf`, from `data.attributes()` kinds; without it, an
  early-exit scan). Tests stay LAZY per element: `sets.containing` asserts one read per question
  (eager bitmaps broke it). Option `nodes: "ends"` builds an end bitmap once (not element-local:
  `offers.elementLocal` false, dependency adds topology). A path neither half carries still holds
  no node and is reported unresolved. Rejected: a new leaf kind; a required `on:` field; default
  "ends". Proof: `VisibilityApi.test.ts` "a filter on an edge attribute",
  `visibility-on-session.test.ts`; served probe `tmp/t2feat-el-edge-filter/probe.mjs` + 3 PNGs.

- (2026-10-07) **Weight meaning kept in config, not in the load report or a `{ column, meaning }`
  weight role.** Config is already saved by the project file and moved by undo (test proves both);
  the role form would change every reader of `weight` as a string. The fact's attribute comes from
  `lastImport().weights.attribute` (null = no weight), the meaning from config. A weight named
  without a meaning writes null, so an old meaning never describes a new column. Edge case left:
  a replace route other than `data.import` and `Draft.load` (element `dataSource` attribute?)
  keeps the old meaning (`ponytail:` note in `data.ts`).

- (2026-10-07) **Runs read the loaded weight (element, owner door; see Top of mind 00).** One
  resolver for every weighted algorithm rather than per-class options; distance readers count hops
  on a strength instead of converting (owner question recorded: 1/w, 1-w, -log w). Max flow reads
  a capacity weight when one resolves, else each record's `capacity`. Proof:
  `test/browser/runs-loaded-weight.test.ts`; served-app probe
  `tmp/t2feat-el-runs-loaded-weight/probe/caveats.mjs` (PageRank from Analyze on friends.csv:
  `caveats.weight = { weight, strength }`).
- (2026-10-07) **Export Data warnings worded by the app (eef118341, no door).** `export/lossWords.ts`:
  one sentence per loss code from `code`, `column`, `count`, never `message`; unknown codes get a
  generic sentence. This branch reads `lossNotes`; after merging master switch `DataOutput` to
  `result.losses` (`{ code, params: { columns[], count } }`, 8a2450863).
- (2026-10-07) **Focus after a control goes (element + app + compact-mantine; owner door).**
  Element: `delegatesFocus`, `render()` returns `nothing` (Lit moved the container and dropped a
  focus given at mount). App: new project's drawing focused when its element comes up; per-control
  targets (UsageDataCard, RecentProjects, NoticeSlot, DataPage, TableDock, Style removes). Tree: a
  deleted focused row hands focus on. Rejected: autofocus on load, reaching into the shadow root.
  Proof: `FocusAfterClose.real-element.test.tsx`, `element-canvas-a11y.test.ts`, Tree test.
  Open: the WebGPU canvas swap still drops a focused canvas (unmeasured; the app runs WebGL).

- (2026-10-07) **Condensed element fixes (proofs under `tmp/r3fix-*`).** Force publishes ngraph's
  real defaults (b6011c01d; schema = engine). `node.depthIndependentSize` (optional, not
  `.default(false)`; `UpdateManager.sizeNodesForDepth`). Other-size capture drawn at that size
  (6783ba895; render-target screenshot + `CustomLineRenderer.setPixelScale`). `fitToGraph`
  `keepAngle` (6f1cf692b; ~20% margin ceiling). Layout refusals as codes (481c6715a;
  `refused(reason, code, params)`; gap: Method select shows no reason). `viewInsets`
  (fa260f20d; `camera/insets.ts freeArea()`, lens shift for orbit). All owner doors.

- (2026-10-07) A covered legend block is dropped, not flagged (`styles.legend()` omits it; the
  English `painted over by` departure deleted). Rejected a `coveredBy` field and the app parsing
  the sentence. Lesson: when the element "already detects" something, check whether it says so
  only in words -- that is the neutrality defect and often the whole bug.

- 2026-10-06 -- "No crossings" refusal: the element already refused; the app now shows the
  Method select's `error` line (`LayoutRefusal.real-element.test.tsx`). Lesson: test the element first.

- 2026-09-13 to 10-05 -- Standing owner decisions (see Top of mind 6): a run paints as soon as
  it finishes; tier 1 is the real app under `graphty/src/workspace/` at `/?next`. The group-row
  color fallback in `graph-place/rows.ts` stays until #1099 removes it.
- 2026-10-06 -- Study tooling element APIs `nodeScreenPosition(id)`, `elementAt({x, y})`,
  `labelOf(id) -> { text, drawn }`: held PRs merged into the studio worktree; owner to confirm
  names. The element's default layout seed was undone (owner; `owner-decisions.md`); the app seeds
  on the tag and on Method picks (`LayoutSeed.real-element.test.tsx`).
- 2026-10-06 -- Studies run on a local production build of the studio worktree, not on graphty.app
  and not after the release. Owner (this run's brief).

## Tried: worked / did not work

- **(2026-10-07) Committing beside agents who are mid-commit: worked.** Wait until
  `git diff --cached` is empty, then stage HEAD + only my edits by replaying my old->new
  replacements on `git show HEAD:<file>` (`tmp/t2feat-el-sources/stage.py`): safer than hunk
  regexes when another agent's line sits inside my hunk (an import list).

- **(2026-10-07) Committing in a worktree where 5+ agents edit the same files: worked.** A
  scripted stage (`tmp/t2feat-el-weight-meaning/stage.py`): HEAD content + my edits by anchored
  replacement, `git hash-object -w` + `git update-index --cacheinfo`, including the API reports
  (only my lines; `npm run api:report` writes everyone's changes). A hunk-level variant:
  `git diff -U0`, keep my hunks, `git apply --cached --unidiff-zero` (2026-10-07, edge filter).
  In a probe, Ctrl+O no longer opens the chooser on the start screen: click "Open project or
  file...". Builds by others clean `dist/` mid-test ("Cannot find package
  @graphty/graph-io/dot"): wait, never debug it. A `pgrep -f "nx.js run"` wait never ends here.
  (2026-10-07, later) NEVER stage in the shared index: another agent's commit swept my staged
  files into theirs, and my stage script overwrote their staged blob (recovered from
  `git fsck --unreachable`). Commit with a private index instead: `GIT_INDEX_FILE=<tmp> git
  read-tree HEAD`, stage there, commit, then point the shared index's entries for my files at the
  new HEAD blobs where they still equal the old HEAD's (else others' commits revert my hunks).

- **(2026-10-07) A run's caveats in a test: return a plain object.** A `Run` is thenable, so an
  async helper that `return run` hands back the RunResult (no `caveats`). Return
  `{ caveats: run.caveats, result: run.result }`. Run status when done is `"succeeded"`.
  Mock graphs have no session: anything an algorithm reads must tolerate that (`?.`), or
  the mock grows an option (`loadedWeight`).
- **(2026-10-07) Checking an element fact in the served app: worked.** real.mjs has no eval step
  and prints only an uncaught error's first line, so for "details.X is present" write a small
  Playwright probe (`tmp/t2feat-el-selector-reason/probe.mjs`: open https://dev.ato.ms:9366/?next,
  upload friends.csv, `el.select({ where })` in `page.evaluate`, print `e.details`) and run it under
  `with-browser.sh`; use real.mjs beside it for what a person sees. To commit one entry of a file
  others have dirty (owner-decisions.md), stage a blob of HEAD + my entry via `git hash-object -w`
  and `git update-index --cacheinfo`.
- **(2026-10-07) Auditing a tier against the build: worked.** grep the app's registered command
  ids first (`grep -rhn -A1 'id: "' --include=commands.ts`): a capability with no command has no
  door. Then one element probe (`tmp/t2-audit/probe/weights.mjs`: `el.session`, run each
  algorithm, read `run.caveats.weight`; try `visibility.set` per rule kind; `notes.add`) and
  real.mjs sessions for the doors that exist. Query syntax is JMESPath: numbers in backticks.
  Rerunning one algorithm replaces its run id: compare with `runs.start(k, p, { as })`.

- **(2026-10-07) compact-mantine figma tree test failing only in a mixed run: traced, fixed
  (b40f264a9).** Not hover (pointer parked), not focus: the `touchDrag` command left CDP touch
  emulation on, so `(hover: none)` matched in every later file and the tree toggles showed.
  Debugged with one temporary `console.log` of `:hover`, `:focus-within` and computed opacity.
  Lesson: an order-dependent browser test means leaked page state (emulation, media, pointer).

- **(2026-10-07) Sources row of a single-table file opens its table (71be6d4fb).** Reproduce a
  single-table source with `session.project.open(file)` then `draft.load()`, not
  `data.import(...)` (that gives two tables). `real.mjs --read` reads only the focused region.

- **(2026-10-07) Per-node depth scaling on instanced node meshes: worked.** Setting
  `mesh.scaling` on the instance is enough; edges only follow if their position cache is
  invalidated (their dirty check reads positions, not sizes). Edge ends and arrowheads looked
  right in the repro export.

- **(2026-10-07) Reading the element in a trace script: worked.** A standalone Playwright script
  against :9366 (via `with-browser.sh`), driving the app by role names, then reading
  `nodeScreenPosition(id).radius`, `node.size`, the mesh bounding box and the view matrix.
  A run's per-node values are NOT on `node.data` nor in `session.results.get(run).nodes` (empty
  for a node metric); read them with `session.data.nodePage({ limit: Infinity, columns: [runId] })`.
  The view menu button is found by `getByRole("toolbar", { name: "Canvas tools" })` then name /^View/.

- **(2026-10-06) Open: the live Selection row is blank after the neighbor route**
  (`tmp/check-r1-summary-cleanup/06-08.png`); renders in a headless test. Suspect `useAsyncValue`
  reset on every session version bump; not traced.
- (2026-10-06 to 10-07) **Shared worktree and testing lessons (condensed).** Wait on another
  agent's build by PID, never `pgrep -f "<cmd>"` (their wait loops match). Stage shared files
  as HEAD + only my hunks (`tmp/r3fix-key-view-insets/stage_blob.py <file> <regex>`); never copy
  files over others' edits. Prove "fails without" against HEAD only for a file nobody else has
  edited (`git diff HEAD` first), else a scratch test against a HEAD build. Nx may restore a
  partial element dist (no `.d.ts`): `npm run build` in graphty-element. Copy a good app build to
  the session folder and use `REAL_DIST`. Vitest browser runs go through `with-browser.sh`. The
  Bash safety check refuses `rm -rf $VAR/...`. Probe focus with `--type` before blaming a dead
  key; real-element popover tests need `page.viewport(1366, 768)` and must wait for
  `aria-disabled` to clear; "0 labels" was motion keeping the view unsettled. Never call an
  unexplained failure a flake; two `--prove` runs clobber `tmp/prove/`.
  (2026-10-07) **The shared INDEX is a race too.** Other agents stage and commit in this worktree
  continuously: `git diff --cached` before staging; wait for their staged set to land when it
  overlaps my files (their blob lacks my hunk and would revert it). Even then, files they stage
  between my staging and my `git commit` go into MY commit (8966b0888 swept in weight-meaning
  files). Fix next time: commit with a private index (`GIT_INDEX_FILE=<tmp>`, `git read-tree
  HEAD`, stage there, commit). stage_blob.py can keep foreign hunks when the file moves under it:
  for a shared file, build the blob as `git show HEAD:<f>` + my string replacements instead.
  The app reads the element from SOURCE (`graphty/vite.aliases.ts`), so any app build after an
  element source edit has it; no element build needed for a :9366 check.

- (2026-10-06) **Layout and load checks (folded from Top of mind).** Check a layout against a
  reference before a study offers it (Spectral was wrong until matched against numpy). A load the
  counts say worked can still draw nothing (store and render half fed separately in `ingest.ts`):
  assert on `element.graph.getNodes()` too.

## Thinking

- (2026-10-06 to 10-07) Grep every route of a value before calling a change done (see Top of
  mind 11). Untraced: header "Untitled" after New from data; `notReadSentence` words only
  `E_PARSE_FAILED`, other open refusals show element English.

- **Open project or file... reopening a project.** #913 closed in the element with "one intake
  verb"; the app still imports a `.graphty.json` as data. A tier 1 task (save, close, reopen) only
  passes today through Recent projects. Adoption should be a small app change.
## Sources

- Digests in `design/ui/studio/digests/` (`tier1.md`, `decisions.md`, `study-rounds.md`,
  `owner-voice.md`, `framework.md`); repository `CLAUDE.md`; `design/ui/studio/tool/README.md`.
- Tier 1 design and plan on branch `feat/tier1-real-app` under `design/ui/tier1-real-app/`.
- App comments that cite element issues (2026-10-06): `export/ImageOutput.tsx` #133;
  `inspector/Inspector.tsx`, `NodeValues.tsx`, `RunValues.tsx` #895; `canvas/LegendCard.tsx`,
  `legendWords.ts` #912; `inspector/GraphValues.tsx` #903/#900; `graphty/src/data/sampleManifest.ts` #796.
- Owner memory notes (do not blame timing; cap workflow browsers; the image model only transcribes).
