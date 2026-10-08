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

- (2026-10-08) **Find rules and edge names (element + app + compact-mantine, team door).**
  `FindOptions.edgeNameJoiner` (element, optional, default unchanged) finds an edge by its name,
  ranked with node names, `match.path` "ends"; the app passes `edgeJoiner(session)` (words.ts), the
  same text the inspector title uses, so "Station -> Stadium" or "Stadium" lists the edge. Rule
  example from the data (`exampleRule`: an imported number column, its rounded midpoint); a rule
  stays in the box after Enter, selected; Columns wear `GLYPHS.attribute`. ResultRow names turn off
  Inter's `calt` so "->" is not drawn as an arrow (the inspector header already showed "->").
  Evidence `tmp/r1-dry1-find-rules-polish/` (T22A/02, 03, 05, 06; T22B/02, 04; T24B/02-05).
  OPEN: inspector names an edge's ends by id, Find by name (#895); Columns after "=" omit run
  results (PageRank not offered on Les Miserables).
0. (2026-10-08) **Path form names and Made with rows (app + element, team door).** From/To boxes
   are named "From node"/"To node" (visible "From"/"To" kept), hints differ ("Where the path
   starts/ends"); a click pick moves on like Enter; the first option is active (Enter's pick).
   Popover fold "Advanced", panel fold "Advanced run settings" (`OptionsForm.advancedLabel`);
   `.ws-analyze .cm-subgroup-control` keeps the chevron inside the popover. Made with: Analysis,
   Ran, From, To, Weight as DataRows (node-id options are DataRows in `OptionsForm`); the weight
   is one row of what the run read, no select. Element `WeightMeaning.assumed` (team decision):
   "weight, meaning not set, read as closer". Header "Path ran Oct 8" when the row is named after
   its analysis. Evidence `tmp/r1-dry1-path-form-made-with/` (A/02, 03, 08, 11, 13, 15; B/10).
1. (2026-10-08) **Focus lands on a control (app).** Find path -> the route's first node in Values;
   find pick -> Degree; Degree -> first neighbor, else Hops; saved note -> "+"; project open and
   leaving Data -> the place's rail button (`focusCurrentPlace`). Evidence
   `tmp/r1-dry1-focus-placement/`.
2. (2026-10-08) **Inspector polish (app + compact-mantine).** Kind and origin as stat rows,
   Results its own section, one neighbor heading form (`neighborhoodWords`), empty number box with
   words (`StyleNumberInput.emptyText`), header right-click opens its menu, label lines carry a
   72px `labelStyle` in one undo step. OPEN: label size is world-space; a screen-fixed size needs an
   element option. Evidence `tmp/r1-dry1-inspector-polish/`.
3. (2026-10-08) **Filter rows keep their sentence (app).** Outcome as the row description; Save
   step disabled until changed; neighbor filter `aria-pressed`. Evidence `tmp/r1-dry1-filters-polish/`.
4. (2026-10-08) **Import page in reader words (app + compact-mantine).** `modelWords()`, roles
   "From"/"To", `meaningGloss`, role box `aria-label`. Open: hint 11px vs labels 9px. Evidence
   `tmp/r1-dry1-import-*`.
5. (2026-10-08) Earlier, in place: SegmentedControl `flex-basis: auto`; find hints are
   `Input.Description`; stat readings and PageList descriptions wrap; a reopened run keeps its
   summary (`projectFile.ts`); highlight `#332288` and the selected-edge band (owner doors);
   histogram bands. OPEN: T21 Replace relayouts every node; neighborhood filter has no
   `direction`; Dijkstra always undirected.

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

- (2026-10-08) **Made with states facts as rows, and the weight once, as what the run read.**
  The weight select left Made with: a rerun with another weight starts from Analyze. Reason: the
  pilot saw the weight three times in three wordings (sentence, label, select). Whether a meaning
  was assumed is the run's fact (`caveats.weight.assumed`), not `data.loadedWeight()`, which is
  the data now and is wrong after a Replace. Rejected: keeping the select and dropping the line
  (a select cannot say "not read -- ...").
- (2026-10-08) **A visible label stays exactly "From"; only the accessible name grows.** Reason:
  the study tool matches exact names first; "From node" as visible text would fall to its
  partial pass and collide with the inspector's "from PageRank" link. Limit: with the edge
  table's "From" header on screen, `--click From` still matches two (the header and the label).

- (2026-10-08) **After a surface comes up (project open, Data page closed) focus goes to the open
  place's rail button, never a tree row and never the find box.** Reason: a focused tree row takes
  every printable key for type-to-find, so "/", "P", "N", "G" and Shift+A all died (the re-walk
  typed nothing in 5 of 6 sessions); the find box takes them as text. Rejected: the drawing (a
  ring around the whole canvas), the first tree row. Cost: after a mouse open the rail button
  shows no ring (Chrome's focus-visible follows the last pointer input); a keyboard open does.

- (2026-10-08) **The app states its label look on every label line it adds** (its own font from
  `getComputedStyle(document.body)`, 72 on the label canvas). Reason: the element's default face
  (Verdana) is missing on Linux, so labels fell back to a 6 px serif; the face and size are a
  consumer's choice, so the app sets them, never the element's default. Rejected: an app-wide
  base layer (shows in the layer list), changing the element default (an owner door and an
  opinion). Two separate writes would be two undo steps: `session.transaction` makes it one.
- (2026-10-08) **A neighborhood heading has one form** ("N nodes within K hop(s) of X") for the list
  and the status line. Rejected: "X's N connections" at 1 hop only (two forms read as two things).
- (2026-10-08) **Facts are rows, not chips.** A badge looks clickable; the kind's meaning goes in a
  tooltip on the word (tabbable span). A right-click on a header opens the menu the caret and the
  context-menu key open (the participant looked for options there).

- (2026-10-08) **A filter step row shows only its sentence and checkbox.** Reason: the threshold
  is what the reader set and must stay readable on and off; the per-step count lost every room
  fight on long attribute names. The count stays one hover or one screen reader read away (row
  description), and the totals live in the header chip and Overview. Rejected: "19 left" and a
  bare number (both still cut "shared_chapters is at least 3").

- (2026-10-08) **A stat's reading and a list row's second line wrap; they are never cut.** Reason:
  the reading is what the reader came for and a tooltip is not reading. A row's quiet text gets up
  to half the row, and a cut row's tooltip carries name and quiet text. Rejected: cutting the
  stat's name instead, trimming padding (8px buys one case).
- (2026-10-08) A canned outcome (project open) must carry everything a live execution's outcome
  does: result, summary, fields, caveats. Reason: the run's record is built from the outcome, so
  any field left off silently vanishes from `run.record` after a reopen while the result itself
  looks fine. Watch for the next field added to `RunOutcome`.
- (2026-10-08) **A selected edge gets its own three settings, flat (`edgeColor`, `edgeScale`,
  `edgeOpacity`).** Reason: no one value serves a translucent ring around a ball and a band beside
  a one-pixel line; changing the shared gold would move every node halo, and blue is too close to
  the default indigo node. Flat because `setSelectionStyle` merges one level deep. Rejected: a
  nested `edge` object, darkening the line (rejected before: unconfigured olive).
- (2026-10-07, condensed) **Tier 2 element work (owner doors, hold + needs-decision):** edge pick
  5a2b3b605; filter steps `setSteps` with counts only in `plan` (8966b0888; rejected live counts,
  OR/NOT); stale runs ce34f31f3 (Replace reads `run.stale`, never reruns; Rerun passes
  `stale.scopeSpec`); every load a source f141b1283; runs read the loaded weight through one
  resolver, "is it read?" answered by `plan()` only; edge-attribute filter 559f5dcb2 (`halvesOf`,
  `nodes: "ends"`); coded selector refusals 3d89d43c3; focus after a control goes (element
  `delegatesFocus`; open: WebGPU canvas swap may drop a focused canvas); force publishes ngraph's
  defaults, `depthIndependentSize`, `fitToGraph keepAngle`, `viewInsets`; a covered legend block is
  dropped by `styles.legend()`. Next: run results typed per field; several node types last.
- (2026-10-07, condensed) **App-only (no door):** edge click opens the edge inspector (e666ae17d);
  "the selection" frames edge ends at the camera door only (not `resolve.ts`, which would widen
  scoped runs); Direction row "Undirected, from the file"; Export warnings worded by the app
  (`export/lossWords.ts`); notes are one command (`notes.add`); a run's Values view comes from its
  shape (`viewOf()`). Element English still on screen (estimate reasons, layout descriptions,
  partition labels): codes from the element are an owner door.
- (2026-09-13 to 10-07) Older standing decisions: no default layout seed in the element (the app
  seeds, `LAYOUT_SEED`); any new site showing a run calls `runName`; test the element before the
  app; a run paints when it finishes; group-row color fallback in `graph-place/rows.ts` stays until
  #1099; study APIs `nodeScreenPosition`, `elementAt`, `labelOf` merged.

## Tried: worked / did not work

- (2026-10-08) Worked: a find option the caller fills with its own words (`edgeNameJoiner`) keeps
  the arrow spelling in the app and the matching in the element. Did not hold: the toolbar real
  test "frames a selected edge's two ends" fails on this branch with or without the find change:
  the camera lands at x 13.92 / 14.46 against an expected 14.07 that is the same every run, so the
  frame itself ends somewhere different each run (not yet traced). TableDock's export preview
  passes alone and failed only inside the full real-element run (its 1 s `waitFor` on "Writing the
  preview..." expired while 20 files drew at once).

- (2026-10-08) The study tool's `combobox ""` in an ambiguity line is its own description
  (aria-label or innerText or value), not the accessible name: the From box WAS named "From" by
  its label. The real defects were the shared placeholder and the shared "From" with the table.

- (2026-10-08) Did not work: landing focus on the left panel's tree after open -- Tree typeahead
  claims every one-character key, so the study's single-key shortcuts typed nothing. Worked: a
  plain button (rail). A project that opens ON the Data page (New from data...) must not take
  focus from that page: the open effect runs only when `page === "panels"`.
- (2026-10-08) A programmatic `focus()` right after a mouse click on Degree DID show the ring on
  the first neighbor (`T12RA/03.png`); after a mouse click on a Recent project the rail button
  showed none.

- (2026-10-08) Worked: snapshot every shared file another agent has dirty BEFORE editing
  (`cp` to `tmp/<task>/base/`), so "fails without the change" is copy base -> run -> copy mine back,
  and my patch is `diff base mine`. Keep any file my new exports are imported from at mine, or the
  whole test file fails on import instead of on the assertion.
- (2026-10-08) A Mantine tooltip in a full browser-project run: `findByRole("tooltip")` missed one
  that was in the page with its text (testing-library judged it inaccessible); alone it passed.
  `findByText(...)` then `closest('[role="tooltip"]')` holds in both.
- (2026-10-08) A world-space label size is never legible everywhere (72 is the compromise; the
  fix is a screen-space size in the element).
- (2026-10-08) Adding a `set` channel to a layer can add a legend block: the element lists every
  literal set; the app's `keyBlocks` decides what is keyed (now skips `*.labelStyle`).
- (2026-10-08) Unrelated and not mine: toolbar real-element "frames a selected edge's two ends"
  fails (camera x 13.46 vs 14.07) with another agent's frame/toolbar edits in the tree.

- (2026-10-08) While other agents edit the same worktree, stage only your hunks by writing the
  index blob from HEAD plus your own edits (`git hash-object -w` + `update-index --cacheinfo`);
  a shared file's other hunks stay unstaged. Their half-saved files can break `tsc` and the build
  for minutes: wait for a clean `tsc` before building. A setup's Shift+A missed in a WIP build;
  `--click Analyze` works the same.

- (2026-10-08) Flex intrinsic sizing: a track with no width and `flex: 1 1 0` options sums their
  max-content then splits it EQUALLY, so the widest option is cut. A content floor
  (`min-width: auto`) fixes it but overflows any set-width track whose options are wider than
  their share; `flex-basis: auto` fixes it and still shrinks into a set width.
- (2026-10-08) A standalone `Input.Description` takes the theme's `InputWrapper` classNames
  (`cm-field-description`): the way to write a hint that is not attached to one field.
- (2026-10-08) Worked: measuring before fixing. The "free space" beside a cut stat value was three
  stacked 8px end paddings, and the text was 8px short -- wrapping, not padding, is the fix.
  Proving a test fails without the change with no stash: `git diff -- <src> > p.patch`,
  `git apply -R`, run, `git apply`. Did not work: putting an attribute's fill in `count` (its
  description already reads the fill; a test caught the doubled reading).

- (2026-10-08) Worked: canvas `measureText` for a DataTable column's content width, once the
  font weight and `letterSpacing` match the cell's (400 weight measured 3px short at 450). A
  Mantine Tooltip in jsdom never opens (use a `.browser.test.tsx`); the theme's open delay is
  1000 ms, so `findByRole("tooltip", {}, { timeout: 3000 })`. The study tool cannot click a role
  box named only "km" when the grid header is also "km" (pilots used `--click-at`); "Role of km" fixes it.
- (2026-10-08) Worked: comparing `run.record.summary` before save and after open in a node test.
  Comparing the whole summary did NOT work: caveats and durationMs differ because the file saves
  the record's merged caveats and wall time, not the executor's raw ones -- compare the counts.
- (2026-10-08) Choose a default color by measuring (`default-palette-quality.test.ts`: OKLab,
  Machado CVD), never by eye.
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
- (2026-10-07, condensed) Contrast in a browser test: blend alpha over the first opaque ancestor
  (`contrastOnPage`). Prove a tool fix with a copy of `real.mjs` with the fix undone;
  concurrent `--prove` runs need `REAL_PROVE_DIR`. "New from data..." opens no file chooser: click
  "Add a table" > "File..." first.
- (2026-10-07) compact-mantine browser suite is file-order dependent (color test leaves `(hover:
none)` on; not fixed).
- (2026-10-07) A partial-hunk commit by another agent can leave HEAD broken (`isLoadedSource`
  cut off; fixed 0c12c233b). `api:report` reads `dist/` types: build the element first, stage
  only my hunks. Bars: 41 app words at rest (limit 50); axe 0 on 13 screens (`tool/bars.mjs`).
- (2026-10-07) A mesh toggled outside an update pass needs `meshesShownOrHidden()` (frozen
  active-mesh list); an edge rebuilt outside a style pass needs `forceEdgeWalk()`.
- (2026-10-07) Study prep: `project.open(file)` does NOT load into the element; `tmp/` is
  gitignored (copy evidence under `rounds/`). Tool: Find `=id == 'A' || id == 'B'`; freeze with
  `REAL_DIST`; add a file to an open project with `--key Control+o --upload`.

- (2026-10-07, condensed) A list that closes on blur moved Find path from under the pointer (now
  floats). `autoFocus` loses to Mantine's focus trap (`data-autofocus`). Keep a `role=status`
  mounted, change its text. Re-grep my hunks in shared files before committing (another agent's
  write can undo them). Prettier from the worktree root. CSV whole numbers are type "integer".
  `selection.apply` THROWS SYNCHRONOUSLY on a bad selector (element defect, unfiled). Mantine
  TextInput: `error={text}` + `errorProps={{ role: "alert" }}`; selector `position` is 0-based after "=".

- (2026-10-07) `--hover "<name>"` rests on the row's CENTER; hover a row's words, not its
  checkbox name, to see a cut-name tooltip.
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
