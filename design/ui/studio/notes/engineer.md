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

000. (2026-10-08) **Marks visible on a colored drawing (graphty-element; owner doors listed).**
     Highlight default `#D55E00` -> `#332288` (Tol indigo): vermilion was Delta E 1 from the
     default ramp's 2nd step. A grid search of sRGB found ONLY dark blues/violets clear Delta E 15
     from the indigo node, darkgrey edge, whitesmoke and the YlOrBr ramp under all 3 color
     blindnesses (tritan kills teals/blues, protan/deutan kill greens/reds). Cost: on an
     unmeasured drawing the route is dark indigo among periwinkle nodes (lightness, not hue).
     Selected edge: new `edgeColor` `#0077BB` / `edgeScale` 2.5 / `edgeOpacity` 1 on the selection
     style; the band is drawn BEHIND the line (material `zOffset` + `zOffsetUnits` -- `zOffset`
     alone does nothing for a camera-facing quad) as a casing. Evidence
     `tmp/r1-dry1-marks-visible/` (T18A/05, T18B/05, T20B/05, T22B/04, T22B-middle-x3.png).
     The app's Highlight color still writes only the node halo `color`.
00. (2026-10-08) **A continuous measure's histogram is banded (element `buildHistogram`).** Per-value
    bars only for an integer field, all-whole values, a single value, or repeats (distinct * 2 <=
    measured); else bands. Owner door already listed in `owner-decisions.md` (built rule added).
    PageRank Values chart now uneven bands; Degree stays one bar per value. Evidence:
    `tmp/r1-dry1-histogram-bands/T21A/02.png`, `T21B/02.png`, `D21A/02.png`, `D21B/02.png`.
    Tests: `statistics.test.ts` (12 PageRank-like values -> banded; counts and repeated decimals
    per-value); `column-histogram.test.ts` score expectation is now "banded".
0. (2026-10-08) **A line says it can be clicked (graphty-element, no door).** The 6 px screen-space
   edge pick with closest-wins (`EDGE_PICK_TOLERANCE_PX`, `Graph.pickEdgeId`) was ALREADY in the
   frozen tier 2 build: on it a click 4-5 px off Gus-Ivan, near Gus, selects Gus -> Ivan (sweep at
   x=755: y 582-594 all hit edge 13). The dry-run finding "edges are 1-pixel targets" was a
   cursor problem, not a pick problem. Fix: `setupBackgroundClickHandler` adds a POINTERMOVE
   observer on `scene.onPointerObservable` that sets `hoverCursor` on the input element when
   `pickEdgeId` finds a line (Babylon restores `defaultCursor` on every move and already sets
   `hoverCursor` over a node, whose mesh has pointer triggers; lines are an unpickable thin-instance
   batch). Skipped while a button is down, in XR, and when Babylon already set it. Test:
   `element-at.test.ts` "shows the pointer cursor..." (fails without: '' over the line).
   `real.mjs --hover-at` now prints `cursor: <shape>` (screenshots never draw the pointer).
   Frozen build: line `auto`, node `pointer`; fixed build: line `pointer`. Evidence
   `design/ui/studio/tmp/r1-dry1-edge-picking/` (A, B, before-A, before-B).
   Ceiling: the hover runs the linear edge walk per move (a spatial index for huge graphs).
1. (2026-10-08) **Tier 2 pilot fixes (58f02b5d0 element, a2bbb2248 compact-mantine, 32c645e6b app).**
   `LoadedSource.leftOut.edges` (owner door) replaces the app's "Show the left-out row";
   `endpointsFor` stores declared ends; path run opens on Values, "4 hops"; Weight box names what
   the run reads ("None" + reason when the loaded weight is not read); Higher means has "Not set";
   "Date or time"; `EllipsizedName` tooltip shuts on pointerdown. OPEN: T21 Replace relayouts
   every node; `real.mjs --prove` failed once in 4 on the first save (cause not found).
2. (2026-10-07) **Tier 2 re-walk: all 12 pilots reach the answer (647ba88b2).** Regression fixed
   (1c723b415): only a `.cm-tree-actions` slot with pinned text and no button/input shrinks.
   `:has()` does NOT nest (a `:has(:not(:has()))` selector is dropped whole, silently).
3. (2026-10-07) Bare `Input.Wrapper` themed in compact-mantine (aaf5ef737): 11 px secondary ink.
4. (2026-10-07) Weight read-or-not comes from the element's `plan()` (0e2379250, 295d601b9).
5. (2026-10-07, condensed) Older fixes each with a proof test: Path popover Enter, Frame selection
   frames a selected edge, selection summary words, Find rule checks, Overview "Nodes showing",
   Find names edges by end names (inspector `edgeName` still passes ids), real.mjs placeholder
   clicks and overlay-free motion check.
6. (2026-10-07) Still open from the tier 2 preflight: Edit source... ADDS (41 -> 82); a reopened
   project's Direction row shows raw text; element gaps: neighborhood filter has no `direction`,
   one node + one edge table per load, Dijkstra always undirected; `selection.apply` throws
   synchronously on a bad selector (unfiled).

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

- (2026-10-08) **A selected edge gets its own three settings, flat (`edgeColor`, `edgeScale`,
  `edgeOpacity`).** Reason: no one value serves a translucent ring around a ball and a band beside
  a one-pixel line; changing the shared gold would move every node halo, and blue is too close to
  the default indigo node. Flat because `setSelectionStyle` merges one level deep. Rejected: a
  nested `edge` object, darkening the line (rejected before: unconfigured olive).
- (2026-10-07) "Is the weight read?" is answered by the element's `plan()`, never re-derived from
  meanings in the app; the plan reuses the run's resolver so the two cannot disagree. Tier 2 study
  prep (T4, T17-T21 in `tasks.md`/`answers.md`, preflight `rounds/tier-2/preflight.md`) is done.
- (2026-10-07) "The selection" frames its edges' ends at the camera door only, not in the scope
  resolver: changing `resolve.ts` would also widen every algorithm run scoped to the selection.
  Evidence: `zoomToSelection` already used the edge-ends rule, so the two camera doors now agree.
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
- (2026-10-07) **Direction row: "Undirected, from the file", never the file's syntax** (app, no
  door; `directionWords.test.ts`). The element's `statedBy` stays a fact. Still cut at the default
  inspector width.

- (2026-10-06/07) No default layout seed in the element (owner): the app seeds (`LAYOUT_SEED`,
  `takesSeed()`). Grep every route of a value; any NEW site showing a run calls `runName`.

- (2026-10-07) **Replace reads `run.stale`, never reruns (no door).** One `outOfDate` glyph, words
  in Tree's `label`; Rerun passes `stale.scopeSpec`; the weight meaning is re-applied in the page
  (table ids are known only once read). Rejected: Rerun all, auto-rerun.

- (2026-10-07) **Notes: one command (`notes.add`), the inspector decides the target** at press
  time; over 64 selected disables it; the list is a plain `ul` with roving tabindex.

- (2026-10-07) **Weight meaning in the app (no new API).** Data page "Higher means" ->
  `TableMapping.weightMeaning`; Analyze/Path one Weight select (loaded first); Overview "Loaded weight".

- (2026-10-07) **A run's Values view is chosen from its shape** (`viewOf()`, `RunValues.tsx`):
  groups -> sizes; highlight + `order` -> path; highlight -> count; number -> histogram.

- (2026-10-07) **Selected edges drawn from the mask, not a style layer** (selection is not a layer);
  since 288624ad1 a halo band from the node halo's settings, not a 3:1 recolor.

- (2026-10-07) **Filter steps: one list verb `setSteps`, counts only in `plan`** (8966b0888, owner
  door); steps beside `filter` so an unticked rule survives undo and the file. Rejected: live counts
  on `summary`, OR/NOT between steps.

- (2026-10-07) **Edge-attribute filter (element, owner door):** a half speaks when its elements carry
  the path (`halvesOf`); `nodes: "ends"`. Rejected: a new leaf kind, a required `on:`.

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

- (2026-10-08) Choosing a default color: measure it, never eyeball. `default-palette-quality.test.ts`
  has the color science (OKLab, Machado CVD); a scratch copy in `tmp/r1-dry1-marks-visible/`
  (`search.mjs` grid search, `pair.mjs` pairwise) found the feasible region in seconds.
- (2026-10-08) Drawing one line mesh behind another at the same depth: `material.zOffset` did
  NOTHING (it is slope-scaled; a screen-facing quad has slope 0); `zOffsetUnits` worked. Probe:
  a one-pixel column of `engine.readPixels` across the line, before and after.
- (2026-10-08) real.mjs: `--key Shift+A` after a setup that ends with focus on a tree row types
  nothing (focus is a treeitem). To capture a second analysis, start a separate setup for it.
- (2026-10-08) Check a dry-run finding against the frozen build before building a fix: sweep
  `--hover-at` points across the target (it prints what `elementAt` finds). Half of the edge-picking
  item already worked. A cursor is invisible in screenshots: read `getComputedStyle(el).cursor`
  (through shadow roots), now printed by `--hover-at`.
- (2026-10-08) A Tree child row is NOT inside its parent's treeitem in the DOM: query children with
  `within(tree)`, not `within(parentRow)`. A new graph's name change moves the Data page heading
  ("Add to people and ties"): grep tests for "Add to " after renaming.
- (2026-10-07) Measuring text contrast in a browser test: walk up to the first opaque
  `backgroundColor`, blend the text's alpha over it (`contrastOnPage` in `DataPage.real-element.test.tsx`). Worked.
- (2026-10-07) Proving a tool fix: copy `real.mjs` beside itself with the fix undone, run once,
  delete. Concurrent `--prove` runs collide (use `REAL_PROVE_DIR`).
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
- (2026-10-07) **Study tool habits.** Two unlabeled nodes: Find `=id == 'A' || id == 'B'`. Freeze
  `graphty/dist` with `REAL_DIST`. Add a file to an open project: `--key Control+o --upload`.
  Directed sample with named edge ends: `bus-stops.csv`.

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
  Hovering a filter step by its checkbox name ("Apply step: ...") hits the checkbox, whose own
  tooltip is none: hover the row's words ("weight is at least 4") to see the cut-name tooltip.
- (2026-10-06 to 10-07) **Committing in the shared worktree (condensed).** Others stage and commit
  here continuously: commit from an empty `git diff --cached`, check `git show --stat HEAD` lists
  only my files. For a file others have dirty: a private index (`GIT_INDEX_FILE=<sp>/x.index git
read-tree HEAD`, add my files, `git apply --cached --unidiff-zero` my hunks, commit, then `git
reset -q HEAD -- <my paths>` in the real index). Never commit `npm run api:report` wholesale.
- (2026-10-06 to 10-07) **Builds and runs.** `nx run graphty:build` OOMs at 4 GB, EMPTIES
  `graphty/dist` (the served app breaks for everyone) and fails on others' half-done edits: rebuild
  at once with `NODE_OPTIONS=--max-old-space-size=8192 npx vite build` in `graphty/` (42 s; add
  `--outDir <dir>` + `REAL_DIST=<dir>` for a private build). The app reads compact-mantine from its
  `dist/` (build it first). Wait on others' builds by PID, never `pgrep -f`. Real-element tests:
  `npx vitest run --project=real-element <file>`; the first run after another agent's can fail
  "Failed to fetch dynamically imported module" (vite re-optimizing deps), the rerun passes.
  `with-browser.sh bash -c "..."` is refused by a safety check: write a `run.sh`, pass that.
  Sources "+" draws nothing (`data.add-*` unregistered); add a file with `--key Control+o --upload`.
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
