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

1. (2026-10-07) **Neighborhood header DONE (no door).** The G list (`inspector/NodeValues.tsx
   NeighborList`) has Hops 1|2|3 and, only when `session.status.directed`, Follow Out|In|All
   (Mantine SegmentedControl from compact-mantine); a change = `selection.apply({ neighborsOf:
   [center], depth, direction })`, reopens `inspected` (key `neighborhoodKey(center, hops,
   direction)`, old keys still parse) and sets the status line once ("14 nodes within 2 hops of
   Ava"). "Filter to neighbors" appends `{ kind: "neighborhood", seeds, depth }` via
   `filterSteps.writeSteps`/`newId`; Filters row reads "neighbors of Ava within 2 hops". Grow by
   one hop is gone (command, toolbar list, neighborhood menu, CanvasMenu special case). ELEMENT
   GAP: the `neighborhood` filter rule has no `direction`, so the button is hidden unless Follow
   is All (a door if added). Proof: toolbar `tasks.real-element.test.tsx` (karate, Hops 2,
   status, filter step); `tmp/t2feat-app-neighborhood/s1/06-14.png` (friends: 14 within 2 hops =
   Selection 15; Out 2 hops = 6; chip 15 of 20).
2. (2026-10-07) **Sources per load + Edit source DONE (8569342f6, no door).** Sources draws one
   row per `data.sources()` entry (`data-place/words.ts sourceRows`; ids `source:<i>`,
   `source:<i>:<j>`); a two-file load is named "people.csv and messages.csv" by the element and
   expands to its tables; a lone one-table load keeps the tier 1 Node/Edge table children. Graph
   header line = `sourcesWords`: "From friends.csv", "From 2 files", "From 3 files" ("sources"
   when a load has `config.url`). Edit source... = `data-page/request.ts editSource`: the app
   remembers each load's Files + `PageChoices` in a WeakMap keyed by the `LoadedSource` entry
   (`rememberLoad` after a Data page load and a start-screen load); an unseen load (reopened
   project) opens an empty Add page. ELEMENT GAP, unfiled: `LoadedSource` keeps neither its input
   nor its roles. Still open: Load on an edited source ADDS again (no replace-one-load route).
   Proof: `DataPage.real-element.test.tsx` "lists each load..."; `tmp/t2feat-app-sources/s1/13,15.png`.
3. (2026-10-07) **Path popover DONE (587e2930e, 88749291a; no door).** P / "Path between..." /
   Analyze > Shortest path open one popover (`analyze/PathForm.tsx`); pick button = capture-phase
   swallow + `elementAt`; status from `pathAnnouncement` reading `session.runs.get(id)`. Open:
   no Follow (Dijkstra always undirected; would be an owner door); same From/To reuses its run id.
   Proof: `PathForm.real-element.test.tsx`, `tmp/t2feat-app-path-popover/`.
4. (2026-10-07) **Filters in the app DONE (7742cd688, no door).** `data-place/Filters.tsx`,
   `filterWords.ts`, `filterSteps.ts`; editor = inspected kind `filter-step`; counts from
   `plan({ op: "visibility.steps" })`; `FilterChip` in Header; read a step BEFORE undoing it.
   `keys.isTypingTarget` no longer swallows shortcuts on checkbox/radio. Open: row name truncates
   at 240px. Proof: `Filters.real-element.test.tsx`, `tmp/t2feat-app-filters/s2`.
5. (2026-10-07) **Tier 2 element work landed (owner doors on hold + needs-decision; details in
   Decisions):** edge pick + selected-edge mark (5a2b3b605), filter steps (8966b0888), runs stale
   on data change (ce34f31f3; app never reads `run.stale`; edge-metric runs keyed by old edge
   ids), every load kept as a source (f141b1283; app side done, item 1), runs read the loaded
   weight + weight meaning at load (app side done), edge-attribute filter (559f5dcb2), coded
   selector refusals (3d89d43c3).
6. (2026-10-07) **Edge select in the app DONE (e666ae17d, no door).** Canvas click on an edge ->
   edge inspector (`edgeName()`, ends, attributes, per-run `result.edge(id)`), "Select
   endpoints"; status line announces every selection. Open: Frame selection disabled in the edge
   menu (unchecked whether `scope: "selection"` frames an edge). Proof: `tmp/t2feat-app-edge-select/`.
7. (2026-10-07) **CSV intake FIXED (52ae4b683, no door).** A data file opened into an open project
   goes through the Data page (`openInSession` -> `openDataPage({ intent: "add", files })`); the
   start screen still loads straight in. Tests must click "Add" in the Match report.
8. (2026-10-07) **Notes place DONE (no door).** `notes/NotesPlace.tsx`, `notes.add` (N, menus,
   "+") writes about what the inspector shows (`notes/words.ts targetsOf`); draft in the store;
   header link "N notes". Not built: edit text, Cites, author. Proof:
   `Notes.real-element.test.tsx`, `tmp/t2feat-app-notes/s1/`.
9. (2026-10-07) **Tier 2 audit defects still open (`tmp/t2-audit/`):** path row counts 61
   (`summary.measured`, `graph-place/rows.ts`) and the header calls a path a "Measure"
   (`rowKindOf`); Edit source... ADDS a re-chosen file (41 -> 74 edges), never replaces; app
   ignores `run.stale`; element caps a load at one node + one edge table. No app UI for Replace,
   Select where, node weight. Fixed: path Values (2df88ddef), Find hint/refusal (f09aae3aa),
   Sources (8569342f6).
10. (2026-10-07) **Remaining element plan:** a run result says each field's type (fixes (a) at the
   root); several node types / Links to / One edge per Pair is the largest item -- last.
   Undecided by the design: OR/NOT between steps (keep "all"), Path popover grouping key, where
   Replace puts runs (I proposed a stale state bar, never auto-rerun).
11. (2026-10-07) Element English still on screen: Analyze's algorithm refusals (codes exist,
   `AnalyzePopover.tsx` `estimate.reason`), `MetricAvailability.reason`, layout descriptions,
   `run.label`, partition choice labels. Fix = codes from the element, words in the app.
12. (2026-10-07) Focus after close FIXED (element `delegatesFocus` + app targets +
   compact-mantine Menu). A control that removes itself names where focus goes
   (`frame/focus.ts focusIsLost()`); never `returnFocus={false}`. Keyboard repro scripts must
   count Tabs from the drawing, not the page body.
13. (2026-10-06) Graph logic goes in graphty-element; an app comment explaining why the element
   could not be used is an element bug report. Neutral facts from the element, words in the app,
   style only through layers (selection is the documented exception: drawn from the mask).
   Public element API or behavior change = owner door: `owner-decisions.md` + `npm run api:report`.
14. (2026-10-06/07) No default layout seed in the element (owner): the app seeds (`LAYOUT_SEED`,
   `takesSeed()`). Grep every route of a value; any NEW site showing a run calls `runName`.
15. (2026-10-07) Bars: 41 app words at rest (limit 50); axe 0 on all 13 screens in both schemes
   (`tool/bars.mjs <out> --scheme light`). New `c="dimmed"` text sits on panel/field/menu. Small open defects: Columns by group order; Circle
   draws a sphere in 3D; group named three ways; truncated labels; Id/id.

## Priorities and values

- (2026-10-07) Owner: no touch/tablet profile and no keyboard-only study in the tier 2 fix work;
  the owner starts the tier 2 study after the fixes land.

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

- (2026-10-07) **Notes: one command, the inspector decides the target.** Every door (N, "+",
  menus) runs `notes.add`, which reads `resolveInspected` at press time and stores the targets in
  the draft, so going to the Notes place (which keeps the selection) cannot change what the note
  is about. Neighborhood and Selection rows note the selection; more than 64 selected disables
  the command with a reason (element limit). The list is a plain `ul` with roving tabindex (one
  Tab stop; the active note's chips and Delete are tabbable): Tree did not fit a multi-line card
  with chips. Focus after delete/save goes by note id once the list redraws (an index would hit
  the removed row). Known: "+" and the menu item share the name "Add note" (one command, two
  doors), which the study tool reports as `ambiguous` while both are on screen.

- (2026-10-07) **Weight meaning in the app (no new API).** Data page "Higher means: Closer |
  Farther | Capacity" (SegmentedControl, value "" = unset; glossary gloss beneath) sent as
  `TableMapping.weightMeaning` only while the table has a Weight column; no weight says "Weight:
  none (each edge counts 1)". Analyze/Made with: one Weight select (loaded first, None = null,
  other number|integer edge columns with the meaning the algorithm reads); Made with adds
  "Weight: <read or skip>" as wrapping Text (a DataRow truncated the skip and hid its name);
  Overview "Loaded weight". Proof: words/choices/OptionsForm/DataPage tests; served walks
  `tmp/t2feat-app-weight/s2` (Closer: PageRank reads emails, path "not read") and `s3` (Farther:
  path reads weight, Total distance).

- (2026-10-07) **A run's Values view is chosen from its shape (2df88ddef, no door).** `viewOf()`
  in `RunValues.tsx`: groups -> sizes; highlight with `order` -> path; other highlight -> count;
  number field -> histogram; else Made with only. Field types from `run.fields`. Path nodes =
  `result.ranking("order")` finite, ascending. Algorithm key `shortest-path`.

- (2026-10-07) **Selected edges drawn from the mask, not a style layer** (selection is
  deliberately not a layer, `config/GraphStyle.ts`); own batch key, contrast checked by pixel
  reads in `test/browser/element-at.test.ts`.

- (2026-10-07) **Staleness compares a content digest** with edges hashed by value (ids are
  reassigned per load); `staleOf` reads `run.dataDigest`, never `run.record` (recursion).

- (2026-10-07) **Filter steps as one list verb, counts only in `plan` (8966b0888, owner door).**
  `setSteps(list)` rather than add/edit/toggle/remove verbs (a form holds the whole list; the fact
  names the one step changed). Per-step counts in `plan` only, so no consumer pays a pass per step
  on every change. Steps live beside `filter`, not folded into it, so an unticked rule survives
  undo and the project file. Rejected: live counts on `summary`; OR/NOT between steps (unasked).
- (2026-10-07) **Edge-attribute filter (element, owner door).** `compileAttribute` (filter.ts):
  a half speaks when its elements carry the path (`FilterValueSource.halvesOf`); tests stay lazy
  per element; `nodes: "ends"` builds an end bitmap once. Rejected: a new leaf kind, a required
  `on:`, default "ends". Proof: `VisibilityApi.test.ts`, `tmp/t2feat-el-edge-filter/probe.mjs`.

- (2026-10-07) **Weight meaning kept in config** (saved by the project file, moved by undo);
  a weight named without a meaning writes null.

- (2026-10-07) **Runs read the loaded weight (element, owner door).** One resolver for every
  weighted algorithm; distance readers count hops on a strength. Proof:
  `test/browser/runs-loaded-weight.test.ts`.
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

- (2026-10-07) **Neighborhood header: what bit.** A header above a list moves Tab counts (tests
  now Tab until focus is on the row) and adds a button that list-collecting tests must skip.
  `real.mjs --click "2"` says ambiguous ("2" vs "Dev 2") but takes the exact radio;
  `role=radio:2` finds nothing. Plain `npx vite build` in `graphty/` OOMs AND empties `dist`.
- (2026-10-07) The element FREEZES Babylon's active-mesh list on a still frame: a mesh toggled
  outside an update pass needs `getUpdateManager().meshesShownOrHidden()`.
- (2026-10-07) **Study tool habits (moved from Top of mind).** Study tool: `ambiguous` on a label plus its input is a tool defect. No
   `--shift-click-at`: select two unlabeled nodes with Find `=id == 'A' || id == 'B'`; `--key /`
   then `--type Ava --key Enter` selects one. Copy `graphty/dist`, use `REAL_DIST`. Trust a
   scripted repro over a participant count; re-measure old numbers before trusting them.
  On the Data page `--click "name"` is ambiguous (column header button + combobox); pick a role
  by clicking the combobox's shown value instead. The Sources "+" is not drawn (the `data.add-*`
  commands are not registered): add a file to an open project with `--key Control+o --upload`.
- (2026-10-07) **Committing beside others' dirty hunks (8569342f6): worked.** Private index in
  the scratchpad: `GIT_INDEX_FILE=<sp>/x.index git read-tree HEAD`, `git add` my whole files,
  `git apply --cached --unidiff-zero` my hunks of a shared file, commit with the copied hooks,
  then `git reset -q HEAD -- <my paths>` in the real index so it does not show my change undone.
  Testing Library: a Data page table row's text is "Nodes: people.csv" (one node), and Tree
  children are flat siblings of their parent in the DOM (query the tree, not the parent row).


- (2026-10-07) **A list that closes on blur moved Find path from under the pointer.** The
  pointer's press blurred the field, the in-flow list closed, the popover shrank before Floating
  UI re-placed it, and the release landed off the button (first click lost). Fix: the list floats
  (`analyze/path.css`, absolute). Also: `autoFocus` loses to Mantine's focus trap -- use
  `data-autofocus`; a focused ToggleIconButton's tooltip takes the first Esc; a `role=status`
  mounted with its text is "unconfirmed" -- keep it mounted, change its text. Never wait on a
  build with `pgrep -f '<words in my own command>'` (matched itself; hung 10 min).

- (2026-10-07) **Filters (7742cd688): worked, three traps.** (1) A Mantine Select is role
  `combobox` in tests, not `textbox`. (2) Ctrl+Z after clicking a checkbox did nothing: the
  shortcut handler treated every INPUT as a typing target -- fixed at the root in
  `keys.isTypingTarget`, not in the Filters row. (3) Staging one hunk of a file another agent
  has dirty: `git apply --cached --unidiff-zero` put my line after `};` in glyphs.ts; building
  the staged blob from `git show HEAD:<file>` + my edit, then `git hash-object -w` and
  `git update-index --cacheinfo`, was exact. `react-refresh/only-export-components` wants
  helpers out of a component file (`filterSteps.ts`).

- (2026-10-07) **Another agent's write can silently undo my edit** in a shared file (RunValues
  lost my hunks when 2df88ddef landed). Re-grep my changes in every touched file just before
  committing. Prettier from the worktree ROOT (`npx prettier --write graphty/...`), not from
  `graphty/`. AttributeDescriptor `type` is "integer" for whole-number CSV columns: a number
  filter must accept both "number" and "integer".

- (2026-10-07) **Find rule refusals (f09aae3aa).** `selection.apply` (also `ScopeApi`, some
  `GraphSession` doors) THROWS SYNCHRONOUSLY on a bad selector despite returning a Promise --
  element defect, unfiled; the app uses `try/await`. Mantine TextInput overrides `aria-invalid`/
  `aria-describedby`: pass `error={text}` + `errorProps={{ role: "alert" }}`. Element
  `details.position` is 0-based after "="; the reader's character is `position + 2`.
  `nx run graphty:build` often fails on another agent's test type error: build the served dist
  with `NODE_OPTIONS=--max-old-space-size=16384 npx vite build` in `graphty/`.

- (2026-10-07) **App change checked on :9366 in two halves: worked.** A Playwright probe under
  `with-browser.sh` finds a point (`elementAt`) and reads selection, `[role=status]` and
  `[data-inspected]`; then real.mjs `--click-at` the same point for what a person sees.

- (2026-10-06 to 10-07) **Committing in the shared worktree (condensed).** Others stage and commit
  here continuously: commit from an empty `git diff --cached`, then check `git show --stat HEAD`
  lists only my files (8966b0888 caught a stranger's file). For a file others have dirty, stage only
  my hunks (`git apply --cached --unidiff-zero`) or a private index (`GIT_INDEX_FILE`); never
  commit `npm run api:report` output wholesale. 52ae4b683: quick commit worked.
- (2026-10-06 to 10-07) **Builds.** Wait on another agent's build by PID, never `pgrep -f`. Nx may
  restore a partial element dist: `npm run build` in graphty-element. App build:
  `NODE_OPTIONS=--max-old-space-size=12288 npm run build` in `graphty/`. The app reads the element
  from SOURCE (`graphty/vite.aliases.ts`). Copy a good build to the session folder, `REAL_DIST`.
  Builds by others clean `dist/` mid-test ("Cannot find package"): wait, never debug it.
  (2026-10-07) `nx run graphty:build` runs `tsc` first and fails on other agents' half-done edits
  (e.g. `choices.test.ts`, `QuickActionsPalette.tsx`): worked around by `NODE_OPTIONS=...16384 npx
  vite build --outDir <session>/dist` + `REAL_DIST` (plain heap OOMs and drops `core.*` files).
- (2026-10-07) **Element facts on :9366: a Playwright probe** under `with-browser.sh`
  (`tmp/t2feat-el-edge-pick/probe.mjs`: load friends.csv, `page.evaluate` on the element).
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
- (2026-10-06) Check a layout against a reference before a study offers it; assert a load on `element.graph.getNodes()` too.

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
