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

1. (2026-10-07) **Sources says what a load left out (f79110b10 app, 3ea9171e3 compact-mantine; no
   new door).** Reads `LoadedSource.leftOut` (element 0c12c233b, OWNER DOOR: hold + needs-decision):
   row quiet "17 edges, 1 row left out" (a zero kind is no longer counted). Selecting a source or
   table row opens inspected kind `source` (id = row id; `data-place/SourceValues.tsx`): Added
   Nodes/Edges, "1 edge row was left out: it names 1 node no node row holds.", "Show the left-out
   row" = `editSource(store, load, "unmatched")` -> `DataPageRequest.show`; the page jumps the grid
   to the unmatched rows once the report is in; link only when `canReopen(load)`. FOUND + FIXED:
   `useLoadDraft` called `draft.rows({ only })` WITHOUT `choices`, so an edge file added to a graph
   listed 0 unmatched rows (the report's own link too). compact-mantine `.cm-tree-actions` was
   `flex: none`: a long pinned text squeezed the name to 0px; now `flex: 0 4 auto` + ellipsis.
   CAVEAT: at 240px both cut ("passes.c... 17 edges, 1 row left..."). Proof:
   `DataPage.real-element.test.tsx` (3 new), `Tree.browser.test.tsx` "a long pinned text",
   `tmp/t2pilotfix-app-source-left-out/s3/04-06.png`, `s4/03.png`.
2. (2026-10-07) **Selection summary words (84bf6a791, app only, no door).** Header is
   `words.ts selectionWords`: only the nonzero halves + "selected" ("2 nodes selected", "13 edges
   selected"; was "2 nodes, 0 edges"). `NodeValues SeveralValues`: Nodes row only when nodes > 0;
   "Edges joining these nodes" (`inducedEdges`, was "Edges among them") only for 2+ nodes, so an
   edge-only selection and Select endpoints no longer read as extra selected edges. Proof:
   `Inspector.test.tsx` (two new tests fail before), `tmp/t2pilotfix-app-selection-summary-words/s1/05.png`, `07.png`.
3. (2026-10-07) **Find checks a rule while typing and offers columns after "=" (app, no door).**
   `FindBox.tsx`: 200 ms after typing stops, `ruleVerdict` asks `session.scope.count({ where })`
   (an existing read that parses exactly as `selection.apply({ text: "=..." })` and refuses with the
   same `details.reason`); the refusal goes in the box's error line before Enter; "Rule: press Enter
   ..." only for an accepted rule. A lone "=" is the app's own text check ("Type a rule after =,
   such as weight > `3`"): the element refuses it as E_BAD_COMMAND from `scope.count` but
   E_BAD_SELECTOR from `selection.apply` (an unfiled element inconsistency). Columns group lists
   `data.attributes()` names holding the typed word, only where a column can start (start, after
   `&&`, `||`, `(`, `!`), never inside quotes; picking inserts the bare name (`quotePath` form when
   it needs quotes) and keeps focus. Proof: `GraphPlace.test.tsx` (two tests, fail on HEAD),
   `tmp/t2pilotfix-app-find-rule-help/s1/02-07.png` (bus-stops: =, =min, refusal, Enter selects 3).
4. (2026-10-07) **Study tool clicks a text box by its placeholder (bbf1c4738, no door).** `find()`
   in `tool/real.mjs`: when no accessible name, label or text matches (and no `role=`), it tries
   `getByPlaceholder`, so `--click "Find nodes, edges, values"` focuses the find box (name "Find").
   Proof: `--prove` "a click by a text box's placeholder focuses that box"; with the fix undone the
   step prints `nothing on screen is called ...` and types nothing
   (`tmp/t2pilotfix-tool-click-placeholder/nofix/03.png`; with it `s1/04.png`, `05.png`).
5. (2026-10-07) **Study tool: overlays over the canvas are not motion (real.mjs, no door).**
   `canvasMoves` decodes its three captures (pngjs) and compares only cells (16 CSS px, plus their
   neighbors) where `document.elementFromPoint` hits the element or its canvas, in any capture; the
   T18 pilot's false "still moving" came from an open Path popover repainting over a still drawing.
   Hiding overlays by style stays forbidden (blur drops a held camera key). Self-test: planted
   ticker in the popover (`plant-ticker`) FAILS on the old check, passes now; spin still reported.
   `REAL_PROVE_DIR` gives a self-test its own folder (others' `--prove` runs clear `tmp/prove`).
   Ceiling: an overlay with `pointer-events: none` (a tooltip) still counts as canvas.
6. (2026-10-07) **Overview under a filter (app only, no door).** While any step is on,
   `GraphValues.tsx Overview` leads with "Nodes showing 19 of 20" and "Edges showing 12 of 41"
   (`visibility.summary`), then "The counts below are for the whole graph."; no step, unchanged.
   Two rows, not one "19 of 20 nodes, 12 edges" value: that cut to "12 ed..." in the inspector.
   `useVisibilityVersion` moved to `data-place/useVisibilityVersion.ts` (fast-refresh warning).
   Proof: `Inspector.test.tsx` ("leads the Overview..."), `tmp/t2pilotfix-app-overview-under-filter/10.png`.
7. (2026-10-07) **Find names an edge the way the inspector does (app, no door).** `FindBox hitName`
   calls `inspector/words.ts edgeName` with the hit's end NAMES: "Market -> Library" on a directed
   graph, "A -- B" otherwise (was a hardcoded "--"). OPEN: the inspector's `edgeName` callers pass
   the record's source/target IDS, so on data whose ids differ from names the two still disagree.
   Proof: `GraphPlace.test.tsx` "names an edge hit" (directed case fails before),
   `tmp/t2pilotfix-app-edge-name-one-way/s1/05.png`, `06.png` (bus-stops).
8. (2026-10-07) **Long stat values stay in the row (a8dae1930, compact-mantine, no door).**
   `.cm-data-row-body` is a GRID `minmax(0,auto) minmax(0,max-content)`: when name and value do
   not both fit, each gets half and a half one does not need goes to the other (grid "maximize
   tracks"), so "Direction" and "Edges per node" stay whole and the value ellipsizes. A cut value
   is `EllipsizedName self` (own tooltip, `data-ellipsized`). The name's Tooltip is now MOUNTED
   only while cut (+ `flushSync` in the pointerover measure): a disabled Mantine tooltip still
   opens unseen and, inside the app's `Tooltip.Group`, steals the one open turn. Proof:
   `DataRow.long-value.browser.test.tsx`, `tmp/t2pilotfix-cm-datarow-long-value/after-les/05.png`.
9. (2026-10-07) **A cut row name's tooltip opens from anywhere on its row (compact-mantine, no door).**
   `EllipsizedName` anchors its Tooltip (`target`) to its parent row, measures the cut on the row's
   `pointerover`; a control in the row keeps its own tooltip; a whole name has none. Cause was NOT
   the first-hover guess (hovering the text always worked): the pilots' hover hit the row center,
   the count. Every Tree row and DataRow. Proof: `EllipsizedName.browser.test.tsx` (count / value / checkbox cases),
   `tmp/t2pilotfix-cm-ellipsized-tooltip/after-filter/05.png`, `after-sources/10.png`, `12.png`.
10. (2026-10-07) **Selected edge = halo band (288624ad1, no door).** `Edge.paintHalo`: band of
   `selection.color` at `selection.opacity`, own line batch; replaced the 3:1 darkening (dark olive).
   Paler at 40% (knob `selectionStyle.opacity`). Proof: `element-at.test.ts` pixel column.
11. (2026-10-07) **Tier 2 study prep DONE (no door).** `tasks.md`/`answers.md` "Tier 2": T4, T17-T21,
   two datasets each, files in `tool/files`; values from `reference/probe.mjs`; preflight
   `rounds/tier-2/preflight.md`. Not built: "No filters.", Follow in Path, never "route".
12. (2026-10-07) **Tier 2 app features DONE (no door; proofs in each `*.real-element.test.tsx`):**
   Replace with file + out-of-date runs ca8b3b916 (positions not kept); Neighborhood header
   (ELEMENT GAP: neighborhood filter has no `direction`); Sources per load + Edit source 8569342f6
   (ELEMENT GAP, unfiled: `LoadedSource` keeps neither input nor roles); Path popover 587e2930e
   (no Follow: Dijkstra always undirected); Filters 7742cd688 (read a step BEFORE undoing it).
13. (2026-10-07) **Open defects found by the tier 2 preflight:** path row counts 61 (`summary.measured`,
   `graph-place/rows.ts`), header calls a path "Measure"; picking From by keys leaves focus in From;
   Edit source... ADDS (41 -> 82); adding a file of all-new people defaults to "Leave out" (adds
   nothing); a reopened project's Direction row shows raw `"directed": f...`; Find framing leaves the
   graph off-canvas; element caps a load at one node + one edge table.

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

- (2026-10-07) Tier 2 element work landed as owner doors (hold + needs-decision): edge pick
  5a2b3b605, filter steps 8966b0888, stale runs ce34f31f3, every load a source f141b1283, loaded
  weight + meaning, edge-attribute filter 559f5dcb2, coded selector refusals 3d89d43c3; app sides
  done. Next element items: run results typed per field; several node types last. Undecided:
  OR/NOT between steps, Path popover grouping key.
- (2026-10-07) Edge select in the app (e666ae17d, no door): canvas click on an edge opens the edge
  inspector; Frame selection for an edge is unchecked.
- (2026-10-07) Element English still on screen (Analyze refusals `estimate.reason`,
  `MetricAvailability.reason`, layout descriptions, `run.label`, partition labels): fix = codes from
  the element, words in the app; a public element API change is an owner door.
- (2026-10-07) **Direction row never quotes the file's statement (app words only, no door).**
  `directionWords` gives "Undirected, from the file", not "..., from the file: directed 0": a reader
  cannot read GML/DOT syntax. The element's `statedBy` stays (a fact; another consumer may show it).
  Proof: `inspector/__tests__/directionWords.test.ts` (fails on the old text);
  `tmp/t2pilotfix-app-direction-words/s1/04.png` (florentine.gml, tooltip "Undirected, from the
  file"). Still cut to "Undirected, from the ..." at the default inspector width: the grid gives
  "Direction" and the value half each; shorter words do not fix that.

- (2026-10-06/07) No default layout seed in the element (owner): the app seeds (`LAYOUT_SEED`,
    `takesSeed()`). Grep every route of a value; any NEW site showing a run calls `runName`.

- (2026-10-07) **Replace reads `run.stale`, never reruns (no door).** One `outOfDate` glyph, words
  in Tree's `label`; Rerun passes `stale.scopeSpec`; the weight meaning is re-applied in the page
  (table ids are known only once read). Rejected: Rerun all, auto-rerun.

- (2026-10-07) **Notes: one command (`notes.add`), the inspector decides the target** at press
  time; over 64 selected disables it; the list is a plain `ul` with roving tabindex.

- (2026-10-07) **Weight meaning in the app (no new API).** Data page "Higher means" ->
  `TableMapping.weightMeaning`; Analyze/Path one Weight select (loaded first); Overview "Loaded weight".

- (2026-10-07) **A run's Values view is chosen from its shape (2df88ddef, no door).** `viewOf()`
  in `RunValues.tsx`: groups -> sizes; highlight with `order` -> path; other highlight -> count;
  number field -> histogram; else Made with only. Field types from `run.fields`. Path nodes =
  `result.ranking("order")` finite, ascending. Algorithm key `shortest-path`.

- (2026-10-07) **Selected edges drawn from the mask, not a style layer** (selection is
  deliberately not a layer, `config/GraphStyle.ts`). Since 288624ad1 a selected edge is a halo
  band read from the same three settings as a node halo; the earlier 3:1 recolor was dropped
  because it showed a color nobody configured and ignored opacity (T22 pilot: "dark olive").

- (2026-10-07) **Filter steps as one list verb, counts only in `plan` (8966b0888, owner door).**
  `setSteps(list)` rather than add/edit/toggle/remove verbs (a form holds the whole list; the fact
  names the one step changed). Per-step counts in `plan` only, so no consumer pays a pass per step
  on every change. Steps live beside `filter`, not folded into it, so an unticked rule survives
  undo and the project file. Rejected: live counts on `summary`; OR/NOT between steps (unasked).
- (2026-10-07) **Edge-attribute filter (element, owner door).** `compileAttribute` (filter.ts):
  a half speaks when its elements carry the path (`FilterValueSource.halvesOf`); tests stay lazy
  per element; `nodes: "ends"` builds an end bitmap once. Rejected: a new leaf kind, a required
  `on:`, default "ends". Proof: `VisibilityApi.test.ts`, `tmp/t2feat-el-edge-filter/probe.mjs`.

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

- (2026-10-07) Proving a tool fix: copy `real.mjs` beside itself with the fix undone, run once,
  delete. Concurrent `--prove` runs collide (use `REAL_PROVE_DIR`).
- (2026-10-07) **Build + run.** `nx run graphty:build` OOMs at 4 GB and leaves `graphty/dist`
  EMPTY (the served app breaks for everyone): rebuild at once with
  `NODE_OPTIONS=--max-old-space-size=8192 npx vite build` in `graphty/`; a compact-mantine change
  needs `nx run compact-mantine:build` first (the app bundles its dist). App real-element tests:
  `npx vitest run --project=real-element <file>`. Sources "+" draws nothing (`data.add-*` commands
  unregistered); add a file with `--key Control+o --upload`.
- (2026-10-07) Unmatched-rows verb agrees (f1f041a40). real.mjs: "New from data..." opens NO file
  chooser (the T4 path in `answers.md` assumes one); click "Add a table" > "File..." first.
- (2026-10-07) compact-mantine browser suite is file-order dependent (color test leaves `(hover:
  none)` on; not fixed).
- (2026-10-07) A partial-hunk commit by another agent can leave HEAD broken (`isLoadedSource`
  cut off; fixed 0c12c233b). `api:report` reads `dist/` types: build the element first, stage
  only my hunks. Bars: 41 app words at rest (limit 50); axe 0 on 13 screens (`tool/bars.mjs`).
- (2026-10-07) A header above a list moves Tab counts (list-collecting tests must skip its buttons).
- (2026-10-07) The element FREEZES Babylon's active-mesh list on a still frame: a mesh toggled
  outside an update pass needs `getUpdateManager().meshesShownOrHidden()`.
- (2026-10-07) **Study prep: what bit.** `project.open(file)` does NOT load into the element;
  knownFields leak between imports (fresh page per file). `design/ui/studio/tmp/` is gitignored:
  copy evidence under `rounds/`.
- (2026-10-07) **Study tool habits.** `ambiguous` on a label plus its input is a tool defect. Select
  two unlabeled nodes with Find `=id == 'A' || id == 'B'`. Copy `graphty/dist`, use `REAL_DIST`.
  Data page: click a combobox by its shown value. Add a file to an open project: `--key Control+o
  --upload`. Find box: `--click "Find" --type ...`. Directed sample with named edge ends:
  `bus-stops.csv` (GML edges carry no names, so Find shows no edge hits there).
- (2026-10-07) **A list that closes on blur moved Find path from under the pointer** (first click
  lost): the list now floats (`analyze/path.css`). Also: `autoFocus` loses to Mantine's focus trap
  (use `data-autofocus`); a focused ToggleIconButton's tooltip takes the first Esc; keep a
  `role=status` mounted and change its text. Never wait with `pgrep -f '<my own words>'`.
- (2026-10-07) A Mantine Select is role `combobox`; `keys.isTypingTarget` swallowed Ctrl+Z after a
  checkbox (fixed at the root).
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

- (2026-10-07) `--hover "<name>"` rests on the row's CENTER (often its count); `--hover-at` on a point.
- (2026-10-06 to 10-07) **Committing in the shared worktree (condensed).** Others stage and commit
  here continuously: commit from an empty `git diff --cached`, check `git show --stat HEAD` lists
  only my files. For a file others have dirty: a private index (`GIT_INDEX_FILE=<sp>/x.index git
read-tree HEAD`, add my files, `git apply --cached --unidiff-zero` my hunks, commit, then `git
reset -q HEAD -- <my paths>` in the real index). Never commit `npm run api:report` wholesale.
- (2026-10-06 to 10-07) **Builds.** App: `NODE_OPTIONS=--max-old-space-size=8192 npx vite build
  --outDir <private dir>` in `graphty/` + `REAL_DIST=<dir>`; `nx run graphty:build` OOMs, empties
  `dist` first (again 2026-10-07: rebuild into `dist` with the vite line to restore it) and fails on others' half-done edits. The app reads compact-mantine from its `dist/`
  (build it first). Wait on others' builds by PID, never `pgrep -f`.
- (2026-10-07) Pixel assertions: `waitForStableFrame()`, `scene.render()`, `engine.readPixels` (rows
  from the bottom); a 1-px column across a line (`columnAt`, element-at.test.ts).
- (2026-10-07) Edge rebuilt outside a style pass needs `updateManager.forceEdgeWalk()`.
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
- App comments citing element issues: grep `#[0-9]{3,4}` under `graphty/src/`.
- Owner memory notes (do not blame timing; cap workflow browsers; the image model only transcribes).
