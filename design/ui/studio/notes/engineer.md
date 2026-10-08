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

1. (2026-10-07) **Selected edge = halo band, not a recolored line (288624ad1, no door).** `Edge.paintHalo`:
   the line keeps its paint; a band of `selection.color` at `selection.opacity`, width = line width
   x 2 x `scale`, in its own line batch (`selection-halo|...` key), curved with the line, hidden with
   it. Replaced the 3:1 darkening (`selectionMarkColor`) that made gold dark olive. Proof: pixel
   column in `element-at.test.ts` (band = canvas*(1-a)+gold*a exactly; old code drew #665600), story
   `Styles/Selection Highlight::SelectedEdge` (new baseline), `tmp/t2pilotfix-element-selected-edge-color/B`.
   CAVEAT: at the default 40% the band is paler than the olive was (no 3:1 against a light canvas,
   like the node halo); the knob is `selectionStyle.opacity`, a consumer choice.
2. (2026-10-07) **Left-out rows kept per load DONE (0c12c233b, OWNER DOOR: hold + needs-decision).**
   `LoadedSource.leftOut?: { rows, values }` (= `LoadReport.unmatched`) only when a load under
   `unmatched: "leave-out"` dropped rows; set in `ingest.ts importSource` from the report that
   `addDataFromSource` now returns. Saved, undone, redone with the entry. App does NOT show it yet
   (next: a "1 row left out" line under the source row). Proof: `data-sources.test.ts`,
   `tmp/t2pilotfix-element-source-left-out/probe.out`.
3. (2026-10-07) **Tier 2 study prep DONE (no door): tasks, answers, personas, preflight.**
   `tasks.md` and `answers.md` "Tier 2" sections: T4 (two sheets), T17 filter, T18 fewest in
   between, T19 reminders, T20 farther weight, T21 updated list; two datasets each; new files in
   `tool/files` (bus-stops, trails, players+passes, team, team-v2; `rounds/tier-2/preflight/
reference/gen.py`). Values read from the element (`reference/probe.mjs`), all 12 pilots reach
   the answer. Preflight `rounds/tier-2/preflight.md`: every tier2-design decision built / not /
   differs. Not built: "No filters.", Follow in Path popover, path row summary (shows 61), never
   "route"; Edit source... still ADDS (41 -> 82). Owner starts the study; wording check not run.
4. (2026-10-07) **Replace with file + out-of-date runs DONE (ca8b3b916, no door).** Offered when
   `canReplace(data.sources())` (one load, <= 1 table); Data page intent `"replace"` ("Replace:
   <file>", `replaceWords` "Was ...; now ...", roles and meaning carried). Stale row: `rows.ts`
   state `"stale"`, `GLYPHS.outOfDate`, label "<name>, out of date"; `RunStateBar` Rerun =
   `runs.start(algorithm, params, { as: id, scope })`. Open: positions not kept; focus lands on
   Everything after Load. Proof: `Replace.real-element.test.tsx`.
5. (2026-10-07) **Neighborhood header DONE (no door).** `NodeValues.tsx NeighborList`: Hops
   1|2|3, Follow Out|In|All only when directed; a change = `selection.apply({ neighborsOf, depth,
direction })` + one status line; "Filter to neighbors" appends a `neighborhood` step. ELEMENT
   GAP: that filter rule has no `direction` (button hidden unless All). Proof: toolbar
   `tasks.real-element.test.tsx`, `tmp/t2feat-app-neighborhood/s1/`.
6. (2026-10-07) **Sources per load + Edit source DONE (8569342f6, no door).** One row per
   `data.sources()` entry (ids `source:<i>[:<j>]`), header `sourcesWords` ("From 2 files");
   `request.ts` remembers each load's files + `PageChoices` in a WeakMap keyed by `LoadedSource`
   (`rememberLoad`). ELEMENT GAP, unfiled: `LoadedSource` keeps neither input nor roles. Load on
   an edited source ADDS again. Proof: `DataPage.real-element.test.tsx`, `tmp/t2feat-app-sources/`.
7. (2026-10-07) **Path popover DONE (587e2930e, 88749291a; no door).** P / "Path between..." /
   Analyze > Shortest path open one popover (`analyze/PathForm.tsx`); pick button = capture-phase
   swallow + `elementAt`; status from `pathAnnouncement` reading `session.runs.get(id)`. Open:
   no Follow (Dijkstra always undirected; would be an owner door); same From/To reuses its run id.
   Proof: `PathForm.real-element.test.tsx`, `tmp/t2feat-app-path-popover/`.
8. (2026-10-07) **Filters in the app DONE (7742cd688, no door).** `data-place/Filters.tsx`,
   `filterWords.ts`, `filterSteps.ts`; editor = inspected kind `filter-step`; counts from
   `plan({ op: "visibility.steps" })`; `FilterChip` in Header; read a step BEFORE undoing it.
   `keys.isTypingTarget` no longer swallows shortcuts on checkbox/radio. Open: row name truncates
   at 240px. Proof: `Filters.real-element.test.tsx`, `tmp/t2feat-app-filters/s2`.
9. (2026-10-07) **Tier 2 element work landed (owner doors, hold + needs-decision):** edge pick
   (5a2b3b605), filter steps (8966b0888), stale runs (ce34f31f3; edge-metric runs keyed by old
   edge ids), every load a source (f141b1283), loaded weight + meaning, edge-attribute filter
   (559f5dcb2), coded selector refusals (3d89d43c3). App sides all done. CSV intake: a data file opened into an open project goes through the Data page
   (52ae4b683; tests click "Add" in the Match report).
10. (2026-10-07) **Edge select in the app DONE (e666ae17d, no door).** Canvas click on an edge ->
   edge inspector (`edgeName()`, ends, attributes, per-run `result.edge(id)`), "Select
   endpoints"; status line announces every selection. Open: Frame selection disabled in the edge
   menu (unchecked whether `scope: "selection"` frames an edge). Proof: `tmp/t2feat-app-edge-select/`.
11. (2026-10-07) **Open defects found by the tier 2 preflight:** path row counts 61 (`summary.measured`,
   `graph-place/rows.ts`), header calls a path "Measure"; picking From by keys leaves focus in From;
   Edit source... ADDS (41 -> 82); adding a file of all-new people defaults to "Leave out" (adds
   nothing); a reopened project's Direction row shows raw `"directed": f...`; Find framing leaves the
   graph off-canvas; element caps a load at one node + one edge table.
12. (2026-10-07) **Remaining element plan:** a run result says each field's type (fixes (a) at the
    root); several node types / Links to / One edge per Pair is the largest item -- last.
    Undecided by the design: OR/NOT between steps (keep "all"), Path popover grouping key.
13. (2026-10-07) Element English still on screen: Analyze's algorithm refusals (codes exist,
    `AnalyzePopover.tsx` `estimate.reason`), `MetricAvailability.reason`, layout descriptions,
    `run.label`, partition choice labels. Fix = codes from the element, words in the app.
14. (2026-10-06) Graph logic goes in graphty-element; an app comment explaining why the element
    could not be used is an element bug report. Neutral facts from the element, words in the app,
    style only through layers (selection is the documented exception: drawn from the mask).
    Public element API or behavior change = owner door: `owner-decisions.md` + `npm run api:report`.
15. (2026-10-06/07) No default layout seed in the element (owner): the app seeds (`LAYOUT_SEED`,
    `takesSeed()`). Grep every route of a value; any NEW site showing a run calls `runName`.

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

- (2026-10-07) **Replace reads `run.stale`, never reruns (no door).** One mark for "out of date"
  (a new `outOfDate` glyph, not the partial warning: one concept per icon), words in the
  accessible name via Tree's `label` (the description is only aria-describedby). Rerun passes
  `stale.scopeSpec` so a scope-changed run reruns over the same scope. The weight meaning is
  re-applied in the page, not in `replaceSource`, because a draft's table ids ("rows" for one
  CSV, "nodes"/"edges" for a pair) are only known once it is read; ids are stable across files,
  so remembered `PageChoices` carry over unchanged. Rejected: Rerun all, auto-rerun (design).

- (2026-10-07) **Notes: one command, the inspector decides the target.** Every door (N, "+",
  menus) runs `notes.add`, which reads `resolveInspected` at press time and stores the targets in
  the draft, so going to the Notes place (which keeps the selection) cannot change what the note
  is about. Neighborhood and Selection rows note the selection; more than 64 selected disables
  the command with a reason (element limit). The list is a plain `ul` with roving tabindex (one
  Tab stop; the active note's chips and Delete are tabbable): Tree did not fit a multi-line card
  with chips. Focus after delete/save goes by note id once the list redraws (an index would hit
  the removed row). Known: "+" and the menu item share the name "Add note" (one command, two
  doors), which the study tool reports as `ambiguous` while both are on screen.

- (2026-10-07) **Weight meaning in the app (no new API).** Data page "Higher means" SegmentedControl
  ("" = unset, gloss beneath) sent as `TableMapping.weightMeaning` only with a Weight column;
  Analyze/Path/Made with: one Weight select (loaded first, None = null, other number columns);
  Made with "Weight: <read or skip>" as wrapping Text; Overview "Loaded weight". Proof: unit tests,
  `tmp/t2feat-app-weight/s2`, `s3`.

- (2026-10-07) **A run's Values view is chosen from its shape (2df88ddef, no door).** `viewOf()`
  in `RunValues.tsx`: groups -> sizes; highlight with `order` -> path; other highlight -> count;
  number field -> histogram; else Made with only. Field types from `run.fields`. Path nodes =
  `result.ranking("order")` finite, ascending. Algorithm key `shortest-path`.

- (2026-10-07) **Selected edges drawn from the mask, not a style layer** (selection is
  deliberately not a layer, `config/GraphStyle.ts`). Since 288624ad1 a selected edge is a halo
  band read from the same three settings as a node halo; the earlier 3:1 recolor was dropped
  because it showed a color nobody configured and ignored opacity (T22 pilot: "dark olive").

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
  Element `delegatesFocus`, `render()` returns `nothing`; per-control focus targets in the app; a
  deleted focused Tree row hands focus on. Rejected: autofocus on load, reaching into the shadow
  root. Open: the WebGPU canvas swap may drop a focused canvas (unmeasured).

- (2026-10-07) **Condensed element fixes (owner doors; proofs `tmp/r3fix-*`).** Force publishes
  ngraph's real defaults; `node.depthIndependentSize`; other-size capture drawn at its size;
  `fitToGraph` `keepAngle`; layout refusals as codes; `viewInsets` (`camera/insets.ts`).
- (2026-10-07) A covered legend block is dropped by `styles.legend()`. Lesson: when the element
  "already detects" something, check it does not say so only in words (the neutrality defect).

- (2026-09-13 to 10-06) Older standing decisions (condensed): test the element before the app
  ("No crossings" was already refused); a run paints when it finishes; the group-row color
  fallback in `graph-place/rows.ts` stays until #1099; study APIs `nodeScreenPosition`,
  `elementAt`, `labelOf` merged (owner to confirm names); the app seeds layouts.

## Tried: worked / did not work

- (2026-10-07) **Element source facts: what bit.** HEAD had `isLoadedSource` (projectFile.ts) cut
  off without its return (a partial-hunk commit by another agent); fixed in 0c12c233b. The app's
  `choices.test.ts` broke `tsc` (union `LoadMapping` read `?.tables`); fixed in 35a444f45.
  `nx run graphty:build` empties `graphty/dist` before tsc fails, leaving :9366 with no index.html:
  rebuild with `NODE_OPTIONS=--max-old-space-size=16384 npx vite build` at once. `api:report`
  reads `dist/` types: build the element first, then stage only my hunks (private index).
- (2026-10-07) Bars: 41 app words at rest (limit 50); axe 0 on all 13 screens in both schemes
  (`tool/bars.mjs <out> --scheme light`). Small open defects: Columns by group order; Circle draws a
  sphere in 3D; group named three ways; truncated labels; Id/id.
- (2026-10-07) **Neighborhood header: what bit.** A header above a list moves Tab counts (tests
  now Tab until focus is on the row) and adds a button that list-collecting tests must skip.
  `real.mjs --click "2"` says ambiguous ("2" vs "Dev 2") but takes the exact radio;
  `role=radio:2` finds nothing. Plain `npx vite build` in `graphty/` OOMs AND empties `dist`.
- (2026-10-07) The element FREEZES Babylon's active-mesh list on a still frame: a mesh toggled
  outside an update pass needs `getUpdateManager().meshesShownOrHidden()`.
- (2026-10-07) **Study prep: what bit.** Probe imports with `session.data.import({ config: { file } },
  { mapping })` (two tables: `{ nodeFile, edgeFile }`); await a Run as `new Promise(ok =>
  run.then(ok, ok))` then read `run.result`. `project.open(file)` does NOT load into the element;
  knownFields leak between imports (fresh page per file). CSV PageRank is DIRECTED; `start,end`
  are not endpoints. `design/ui/studio/tmp/` is gitignored: copy evidence under `rounds/`.
- (2026-10-07) **Study tool habits (moved from Top of mind).** Study tool: `ambiguous` on a label plus its input is a tool defect. No
  `--shift-click-at`: select two unlabeled nodes with Find `=id == 'A' || id == 'B'`; `--key /`
  then `--type Ava --key Enter` selects one. Copy `graphty/dist`, use `REAL_DIST`. Trust a
  scripted repro over a participant count; re-measure old numbers before trusting them.
  On the Data page `--click "name"` is ambiguous (column header button + combobox); pick a role
  by clicking the combobox's shown value instead. The Sources "+" is not drawn (the `data.add-*`
  commands are not registered): add a file to an open project with `--key Control+o --upload`.
- (2026-10-07) **A list that closes on blur moved Find path from under the pointer** (first click
  lost): the list now floats (`analyze/path.css`). Also: `autoFocus` loses to Mantine's focus trap
  (use `data-autofocus`); a focused ToggleIconButton's tooltip takes the first Esc; keep a
  `role=status` mounted and change its text. Never wait with `pgrep -f '<my own words>'`.
- (2026-10-07) **Filters (7742cd688): three traps.** A Mantine Select is role `combobox`; Ctrl+Z
  after a checkbox click was swallowed (`keys.isTypingTarget`, fixed at the root); one hunk of a
  file others have dirty: build the blob from `git show HEAD:<file>` + my edit, `git hash-object
  -w`, `git update-index --cacheinfo` (`--unidiff-zero` misplaced a line). Helpers out of
  component files (`react-refresh/only-export-components`).
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

- (2026-10-07) **Checking on :9366: worked.** Playwright probe under `with-browser.sh` for facts
  (`tmp/t2feat-el-edge-pick/probe.mjs`), then real.mjs for what a person sees; `--click ... --upload`
  answers a dynamically created file input. Crop + upscale a screenshot with PIL to judge thin lines.
- (2026-10-06 to 10-07) **Committing in the shared worktree (condensed).** Others stage and commit
  here continuously: commit from an empty `git diff --cached`, check `git show --stat HEAD` lists
  only my files. For a file others have dirty: a private index (`GIT_INDEX_FILE=<sp>/x.index git
read-tree HEAD`, add my files, `git apply --cached --unidiff-zero` my hunks, commit, then `git
reset -q HEAD -- <my paths>` in the real index). Never commit `npm run api:report` wholesale.
- (2026-10-06 to 10-07) **Builds.** Wait on another agent's build by PID, never `pgrep -f`. Nx may
  restore a partial element dist: `npm run build` in graphty-element. App build:
  `NODE_OPTIONS=--max-old-space-size=12288 npm run build` in `graphty/`. The app reads the element
  from SOURCE (`graphty/vite.aliases.ts`). Copy a good build to the session folder, `REAL_DIST`.
  Builds by others clean `dist/` mid-test ("Cannot find package"): wait, never debug it.
  (2026-10-07) `nx run graphty:build` runs `tsc` first and fails on other agents' half-done edits
  (e.g. `choices.test.ts`, `QuickActionsPalette.tsx`): worked around by `NODE_OPTIONS=...16384 npx
vite build --outDir <session>/dist` + `REAL_DIST` (plain heap OOMs and drops `core.*` files).
- (2026-10-07) **Pixel assertions in browser tests: worked.** `waitForStableFrame()`, `scene.render()`,
  `engine.readPixels(x, h - y - half, ...)` (rows from the bottom). A 1-px column across a line
  (`columnAt`, element-at.test.ts) shows core and band exactly; darkest-in-6x6 reads a thin line.
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
