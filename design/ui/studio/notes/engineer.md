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

1. (2026-10-07) **Tier 2 element work landed (each an owner door on hold + needs-decision unless
   noted); the app side of most is still open.**
   - Edge pick + selected-edge mark (5a2b3b605, no new API): `elementAt` -> `{ kind: "edge", id }`
     within 6 CSS px of the line (`Graph.pickEdgeId`, screen-space, curves via `drawnCurve`, node
     wins); click selects, Shift adds, empty canvas clears an edge-only selection. Mark =
     `Edge.paintMarked` (width x2, selection color pushed to 3:1 vs canvas and vs its plain line;
     own batch key). On :9366 the app already opens the edge inspector on a canvas edge click and
     a table row draws the mark (`tmp/t2feat-el-edge-pick/s1/06-07.png`).
   - Filter steps (8966b0888): `visibility.steps` / `setSteps([{ id, on, rule }])`, AND of on
     steps and the single filter (`visibility/steps.ts`); facts `visibility.step-*`; counts per
     step only in `plan`. friends.csv 20/41 -> degree>=4 19/38 -> Ava 1-hop 7/10. No app UI.
   - Runs stale on data change (ce34f31f3): `StaleNote.reason` `data-changed|scope-changed`;
     content digest with edges by value (reloading the same file is NOT stale). Open: edge-metric
     runs keyed by old edge ids; app never reads `run.stale`, and Edit source... adds.
   - Every load kept (f141b1283): `session.data.sources()`; app Sources/header read `source()` only.
   - Runs read the loaded weight: uniform `weight` option, `descriptor.weightMeaning`, mismatch
     counts hops + `caveats.weightSkipped`. Weight meaning chosen at load
     (`TableMapping.weightMeaning`, `session.data.loadedWeight()`). App side DONE 2026-10-07
     (see Decisions, "Weight meaning in the app").
   - Edge-attribute filter (559f5dcb2): `range`/`categories` speak each half carrying the path;
     `nodes: "all"|"ends"`. Selector refusals coded (3d89d43c3): `details.reason`.
2. (2026-10-07) **Edge select in the app DONE (e666ae17d, no door).** Canvas click or right-click
   on an edge -> edge inspector titled `edgeName()` ("Ravi -> Theo", "--" when
   `session.status.directed` is false; also the Selection row name), Values = ends, file
   attributes (weight), per-run `result.edge(id)` results; "..." and the canvas menu offer
   `selection.endpoints` "Select endpoints". Status line announces every non-empty selection
   ("1 edge selected", "2 nodes, 1 edge selected") from `CanvasOverlays`. friends.csv loads
   DIRECTED. Open: Frame selection in the edge menu is disabled "Select a node first" (does the
   element's `scope: "selection"` frame an edge's ends? unchecked). Proof:
   `tmp/t2feat-app-edge-select/` (probe.mjs + 01-04.png, s1/04-06.png).
3. (2026-10-07) **Tier 2 audit defects still open (`tmp/t2-audit/`):** (a) FIXED 2df88ddef (path
   run Values: route in order, "3 nodes, 2 edges", distance total only on a distance weight); its
   leftovers: the tree row still counts 61 (`summary.measured`, `graph-place/rows.ts`) and the
   header calls a path a "Measure" (`rowKindOf` is measure-or-grouping only); (b) FIXED f09aae3aa (Find:
   gray "Rule: press Enter to select matches" while text starts "="; a refusal shows one line
   under the box worded from `details.reason`, via Mantine `error` + `errorProps role=alert`); (f) Edit source... ADDS a
   re-chosen file (41 -> 74 edges), never replaces; (g) app Sources list/header; (h) app ignores
   `run.stale`; (i) element caps a load at one node + one edge table. App has NO UI for filters,
   Path popover, notes, Replace, Select where, node weight, weight meaning.
4. (2026-10-07) **Remaining element plan:** a run result says each field's type (fixes (a) at the
   root); several node types / Links to / One edge per Pair is the largest item -- last.
   Undecided by the design: OR/NOT between steps (keep "all"), Path popover grouping key, where
   Replace puts runs (I proposed a stale state bar, never auto-rerun).
5. (2026-10-07) Element English still on screen: Analyze's algorithm refusals (codes exist,
   `AnalyzePopover.tsx` `estimate.reason`), `MetricAvailability.reason`, layout descriptions,
   `run.label`, partition choice labels. Fix = codes from the element, words in the app.
6. (2026-10-07) Focus after close FIXED (element `delegatesFocus` + app targets +
   compact-mantine Menu). A control that removes itself names where focus goes
   (`frame/focus.ts focusIsLost()`); never `returnFocus={false}`. Keyboard repro scripts must
   count Tabs from the drawing, not the page body.
7. (2026-10-07) The element FREEZES Babylon's active-mesh list on a still frame: a mesh toggled
   outside an update pass needs `getUpdateManager().meshesShownOrHidden()`; an edge rebuilt
   outside a style pass needs `forceEdgeWalk()` or it is never placed.
8. (2026-10-06) Graph logic goes in graphty-element; an app comment explaining why the element
   could not be used is an element bug report. Neutral facts from the element, words in the app,
   style only through layers (selection is the documented exception: drawn from the mask).
   Public element API or behavior change = owner door: `owner-decisions.md` + `npm run api:report`.
9. (2026-10-06) No default layout seed in the element (owner). The app seeds (`LAYOUT_SEED`,
   `takesSeed()` in `layout/methods.ts`); any new layout path passes it.
10. (2026-10-07) A decision's file list is a start: grep every route of the value. Any NEW site
   showing a run calls `runName`, never `run.label`.
11. (2026-10-07) Bars: 41 app words at rest (limit 50); axe 0 on all 13 screens in both schemes
   (`tool/bars.mjs <out> --scheme light`). New `c="dimmed"` text sits on panel/field/menu.
12. (2026-10-07) Small open defects: Columns by group ignores group order; Circle draws a sphere
   in 3D; group named three ways; truncated labels; Id/id.
13. (2026-10-07) Study tool: `ambiguous` on a label plus its input is a tool defect. No
   `--shift-click-at`: select two unlabeled nodes with Find `=id == 'A' || id == 'B'`.
   `--click-at` names an edge under the point now. Copy `graphty/dist`, use `REAL_DIST`.
14. (2026-10-07) Trust a scripted repro or a cause in code over a participant count; re-measure
   `next-steps/verify/results.md` before trusting old numbers.
15. (2026-10-07) Owner: no touch/tablet profile and no keyboard-only study in the tier 2 fix work;
   the owner starts the tier 2 study after the fixes land.

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

- (2026-10-07) **Weight meaning in the app (no new API).** Data page "Higher means: Closer |
  Farther | Capacity" (SegmentedControl, value "" = unset; glossary gloss beneath) sent as
  `TableMapping.weightMeaning` only while the table has a Weight column; no weight says "Weight:
  none (each edge counts 1)". Analyze/Made with: one Weight select (loaded first, None = null,
  other number|integer edge columns with the meaning the algorithm reads); Made with adds
  "Weight: <read or skip>" as wrapping Text (a DataRow truncated the skip and hid its name);
  Overview "Loaded weight". Proof: words/choices/OptionsForm/DataPage tests; served walks
  `tmp/t2feat-app-weight/s2` (Closer: PageRank reads emails, path "not read") and `s3` (Farther:
  path reads weight, Total distance).

- (2026-10-07) **A run's Values view is chosen from its shape, not its row kind (2df88ddef, no
  door).** `viewOf()` in `RunValues.tsx`: grouping (summary has groups) -> sizes; contract `layer`
  "highlight" with `order` in `nodeFields` -> path; other highlight -> set count (`graph.count`);
  else the primary field's `run.fields` type number/integer -> histogram; anything else (pairs,
  series, category strings) shows only Made with. The field contract table
  (`RESULT_FIELD_CONTRACT`) is not exported, so field types come from `run.fields`; exporting it
  would be an owner door for no gain. Path nodes = `result.ranking("order")` filtered finite and
  sorted ascending (ranking is best-first); total shown only when `run.caveats.weight?.meaning ===
  "distance"`. Proof: `PathRun.real-element.test.tsx` (fails on the old file with "onPath is typed
  boolean"); served session `tmp/t2feat-app-path-crash/s1/09-10.png` (Ava -> Ivan -> Kofi). The
  algorithm key is `shortest-path`, not `dijkstra`; a test opening a path row must set the
  `measure-row` tab, since `rowKindOf` maps it there.

- (2026-10-07) **Selected edges drawn from the mask, not a style layer.** The brief said "the
  selection layer", but none exists by design (`config/GraphStyle.ts`: selection is "DELIBERATELY
  NOT A STYLE LAYER"; the node halo is drawn from the mask). The edge mark follows the halo: a
  second appearance (own batch key), no mesh mutation. Rejected: a per-edge mesh (the old
  `setSelected` comment), a locked selection layer (would compete in precedence, persist, and be
  lost at a dataset boundary). Contrast is measured in a browser test by reading pixels at the
  edge midpoint (`test/browser/element-at.test.ts`), which caught the unplaced-line bug.

- (2026-10-07) **Staleness compares a content digest, not an input counter.** Tried first:
  hashing records keyed by id -- a reload of the same file went stale, because edge ids (slice
  keys and the `graphty.edgeId` column) are reassigned per load; hashing edges by value fixed it.
  Rejected: the input tick (moves on run execution too), per-column revisions (reload of the same
  file still bumps them), folding into the scope digest (documented as membership only; loses the
  reason). `run.record` reads `run.stale`, so `staleOf` must read `run.dataDigest`, never
  `run.record` (infinite recursion).

- (2026-10-07) **Filter steps as one list verb, counts only in `plan` (8966b0888, owner door).**
  `setSteps(list)` rather than add/edit/toggle/remove verbs (a form holds the whole list; the fact
  names the one step changed). Per-step counts in `plan` only, so no consumer pays a pass per step
  on every change. Steps live beside `filter`, not folded into it, so an unticked rule survives
  undo and the project file. Rejected: live counts on `summary`; OR/NOT between steps (unasked).
- (2026-10-07) **Edge-attribute filter (element, owner door).** `compileAttribute` (filter.ts):
  a half speaks when its elements carry the path (`FilterValueSource.halvesOf`); tests stay lazy
  per element; `nodes: "ends"` builds an end bitmap once. Rejected: a new leaf kind, a required
  `on:`, default "ends". Proof: `VisibilityApi.test.ts`, `tmp/t2feat-el-edge-filter/probe.mjs`.

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
- (2026-10-07) **Export Data warnings worded by the app (eef118341).** `export/lossWords.ts`, one
  sentence per loss code; after merging master read `result.losses` (8a2450863).
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
- 2026-10-06 -- Studies run on a local production build of the studio worktree (owner).

## Tried: worked / did not work

- (2026-10-07) **Another agent's write can silently undo my edit** in a shared file (RunValues
  lost my hunks when 2df88ddef landed). Re-grep my changes in every touched file just before
  committing. Prettier from the worktree ROOT (`npx prettier --write graphty/...`), not from
  `graphty/`. AttributeDescriptor `type` is "integer" for whole-number CSV columns: a number
  filter must accept both "number" and "integer".

- (2026-10-07) **Find rule refusals (f09aae3aa): worked, two traps.** (1) The element's
  `selection.apply` returns a Promise but THROWS SYNCHRONOUSLY on a bad selector
  (`SelectionApi.apply` is `Promise.resolve(this.applyNow(...))`; same shape in
  `ScopeApi.ts` 853/876/893 and `GraphSession.ts` 916), so `.then(ok, fail)` never sees the
  error -- an element defect, not yet filed or fixed; the app uses `async` + `try/await`, which
  catches both. (2) Mantine TextInput overrides a passed `aria-invalid` and `aria-describedby`;
  pass `error={text}` (it renders the line and ties both) and `errorProps={{ role: "alert" }}`.
  Position words: element `details.position` is 0-based after the "=", the reader's character
  is `position + 2`. friends.csv `=weight > \`3\`` selects 12 edges (matches the file).
  `nx run graphty:build` fails on another agent's test type error; `NODE_OPTIONS=
  --max-old-space-size=12288 npx vite build` builds dist (plain vite build runs out of heap).

- (2026-10-07) **App change checked on :9366 in two halves: worked.** A Playwright probe under
  `with-browser.sh` finds an edge midpoint (`elementAt` == that edge) and reads selection,
  `[role=status]` and `[data-inspected]` text; then real.mjs `--click-at` that same point (the
  seeded layout puts it at the same pixel) for what a person sees. `npm run build` stopped on
  other agents' test type errors: `npx vite build` alone builds the served dist.

- (2026-10-06 to 10-07) **Committing in the shared worktree (condensed).** Other agents stage and
  commit here continuously. Check `git diff --cached` is empty first; a file another agent staged
  between my stage and my commit lands in MY commit (8966b0888 did). Safest: a private index
  (`GIT_INDEX_FILE=<tmp> git read-tree HEAD`, stage, commit, then repoint the shared index's
  entries for my files). For a file others have dirty, stage only my hunks (`git diff -U0`, keep
  mine, `git apply --cached --unidiff-zero`) or a blob of `git show HEAD:<f>` + my replacements
  (`git hash-object -w`, `git update-index --cacheinfo`); same for API reports (never commit
  `npm run api:report` output wholesale). (2026-10-07, edge pick) A quick commit from an empty
  shared index worked: check `git show --stat HEAD` lists only my files.
- (2026-10-06 to 10-07) **Builds.** Wait on another agent's build by PID, never `pgrep -f`. Nx may
  restore a partial element dist: `npm run build` in graphty-element. App build:
  `NODE_OPTIONS=--max-old-space-size=12288 npm run build` in `graphty/`. The app reads the element
  from SOURCE (`graphty/vite.aliases.ts`). Copy a good build to the session folder, `REAL_DIST`.
  Builds by others clean `dist/` mid-test ("Cannot find package"): wait, never debug it.
- (2026-10-07) **Checking an element fact on :9366: a Playwright probe.** real.mjs has no eval step:
  write `tmp/<task>/probe.mjs` (open https://dev.ato.ms:9366/?next, "No thanks", "Open project or
  file..." + friends.csv, then `page.evaluate` on `document.querySelector("graphty-element")`) and
  run it under `with-browser.sh`; real.mjs beside it for what a person sees. Edge screen points:
  `el.graph.nodeScreenPosition(srcId/dstId)` midpoint (`tmp/t2feat-el-edge-pick/probe.mjs`).
- (2026-10-07) **Pixel assertions in browser tests: worked.** `waitForStableFrame()`, then
  `graph.scene.render()`, then `engine.readPixels(x, h - y - half, ...)` (rows from the bottom);
  take the darkest pixel in a 6x6 square to read a thin line's color on a light canvas.
- (2026-10-07) **Edge rebuilt outside a style pass is never placed** unless the next frame walks
  edges: `updateManager.forceEdgeWalk()` (a style pass does it; the mask path now does on select).
- (2026-10-07) **Tests.** A `Run` is thenable: return `{ caveats: run.caveats, result: run.result }`
  from async helpers. Mock graphs have no session (`?.`, or `createMockGraph({ loadedWeight })`).
  An order-dependent browser test means leaked page state (b40f264a9: CDP touch emulation left on).
  Real-element popover tests need `page.viewport(1366, 768)` and wait for `aria-disabled` to clear.
  Prove "fails without" against HEAD only for a file nobody else edited. Never call an unexplained
  failure a flake.
- (2026-10-07) **Reading the element.** A run's per-node values: `session.data.nodePage({ limit:
  Infinity, columns: [runId] })` (not `node.data`, not `results.get(run).nodes`). Query syntax is
  JMESPath (numbers in backticks). Rerunning an algorithm replaces its run id. Single-table source:
  `session.project.open(file)` then `draft.load()`. Audit a tier by grepping the app's command ids
  (`grep -rhn -A1 'id: "' --include=commands.ts`): no command, no door.
- (2026-10-07) Per-node depth scaling: instance `mesh.scaling` is enough; edges follow only when
  their position cache is invalidated.
- (2026-10-06) Open: the live Selection row is blank after the neighbor route
  (`tmp/check-r1-summary-cleanup/06-08.png`); suspect `useAsyncValue` reset per version bump.
- (2026-10-06) Check a layout against a reference before a study offers it (Spectral vs numpy). A
  load can count right and draw nothing: assert on `element.graph.getNodes()` too.

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
