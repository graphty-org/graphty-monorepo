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

- (2026-10-08) **Labels on top (element + app, team door).** `LabelStyle.onTop` (and
  `RichTextStyle.onTop`), optional, default depth sorted; on, the label goes to rendering group 1
  (drawn after the graph, depth cleared), as tooltips already did. The app's `appLabelLook` sets it,
  so every label line the app adds is never cut by a nearer sphere or a selected tie's band.
  Re-pilot on a fresh build: "Hana" under Ivan and "Stadium" over the blue band read whole.
  Evidence `tmp/r1-dry2-labels-on-top/` (T24A/02-04, T24B/02-04, story capture, accept.sh).
- (2026-10-08) **Route color is black (element default, owner door).** `DEFAULT_HIGHLIGHT.color`
  `#332288` -> `#000000`. Indigo passed every swatch check but, rendered as lit spheres, sat Delta E
  19.5 / 2.1:1 from the default nodes (pilots T20A/T20B read the route's nodes as ordinary). Black:
  rendered Delta E 50 / 3.0:1 unranked, 44-50 over PageRank. Rule learned: judge node colors at the
  shaded tones (`shaded()` x `NODE_TONES` in `default-palette-quality.test.ts`) and on screenshot
  pixels (`tmp/r1-dry2-path-color/measure.py`), never on swatches alone. Known cost: black is the
  7th default group color. Evidence `tmp/r1-dry2-path-color/walk/`.
- (2026-10-08) **Which end is missing (element + app, team door).** `LeftOutEdge.missingEnds` and
  `DraftRow.missingEnds` (`EdgeEnd[]`, only under `only: "unmatched"`) say which end names no node;
  saved with the project. The app marks the cell ("s11 (no node row)" + warning glyph), the grid
  caption says "1 unmatched row: s11 has no node row", the inspector line LEADS with it ("Line 17:
  s11 has no node row; from s04, ...") because the narrow inspector cuts the line's end. Evidence
  `tmp/r1-dry2-missing-end/` (T4B/05, 07; T4A/05, 07). OPEN: `door-surface.test.ts` fails on HEAD
  (`Graphty.nodesInRect` not in `doors.ts`).
- (2026-10-08) **Study tool trust (real.mjs).** A hover prints only its own tooltip: tooltips on the
  page before the pointer moved are marked and skipped (one still showing after 2 s is the same
  control's, so hovering a control twice still reads it). The socket server handles a client that
  left (EPIPE killed the session process, r1-s05/s06). A click timeout prints Playwright's call log
  ("element is not enabled", "... intercepts pointer events"). A setup ends with focus released
  (the Size box wore a ring at 01.png). Sessions call real.mjs directly, never through a shared
  helper (launch prompt, workflow RULES, README). Evidence `tmp/r1-dry1-study-tool/`.

0. (2026-10-08) **The drawing stays put (element + app, team door).** Three pilot defects, two
   mechanisms. (a) A run grew the legend card; the app reported a bigger top inset and the element
   re-framed (`viewInsets` setter called `zoomToFit` under `autoFrame`) and the orbit camera
   re-centered on the new free area: every node moved and shrank. Now insets never move the
   camera (`OrbitCameraController.setViewInsets` shifts the pivot by the change in lens shift),
   and the app's legend calls `zoomToFit()` only when `element.nodesInRect(cardBox)` is not empty
   (new additive element API). (b) Find's pick called `zoomToSelection`, which TURNS the camera to
   look at the node (pivotRotation x 0.26): the top of the drawing left the canvas and stayed out.
   Now the camera turns only for a pick that is off screen (`nodeScreenPosition().visible`). (c) The
   "empty canvas below the Save dialog" was (b): after the turn, the drawing ended at y 490 and the
   dialog covered it. Evidence `tmp/r1-dry1-view-stays-put/` (T18B/03-04, T20B/04-05, T19A/02-04).

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

1. (2026-10-08) **Path form names and Made with rows (app + element, team door).** From/To named
   "From node"/"To node" (visible text kept); Made with lists Analysis, Ran, From, To, Weight as
   rows; element `WeightMeaning.assumed`. Evidence `tmp/r1-dry1-path-form-made-with/`.
2. (2026-10-08) **Focus lands on a control (app).** Find path -> the route's first node in Values;
   find pick -> Degree; Degree -> first neighbor, else Hops; saved note -> "+"; project open and
   leaving Data -> the place's rail button (`focusCurrentPlace`). Evidence
   `tmp/r1-dry1-focus-placement/`.
3. (2026-10-08) Earlier polish, in place (details under Decisions): inspector rows and one
   neighbor heading form; filter rows keep their sentence; import page in reader words; segmented
   `flex-basis: auto`; readings wrap; a reopened run keeps its summary; highlight (now black, see path color) and the
   selected-edge band. OPEN: label size is world-space (needs an element option); T21 Replace
   relayouts every node; neighborhood filter has no `direction`; Dijkstra always undirected.

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

- (2026-10-08) **A row says which END is missing, not which value.** Ends stay exact when both ends
  hold the same text and match `LeftOutEdge.source/target`; the app maps an end to its column with
  `draft.resolve(loadChoices(...))` (grid) or `leftOut.endColumns` (inspector). The ingest test is
  the one `isUnmatched` uses (`unmatchedValues` or not held), so the mark and the count agree.
  Rejected: missing values (ambiguous), column names (a `LeftOutEdge` end may be an expression).
- (2026-10-08) **A label's draw order is a style field, not an element switch.** `onTop` lives on
  the label style so a layer can lift some names and not others; the default stays depth sorted
  (another consumer may want the depth cue). Wired by one row in `StylePainter.RICH_TEXT_KEYS`:
  Node and Edge spread the resolved block into `RichTextLabel`, which already honored `onTop`.
  Rejected: always on top (an opinion as a default), a depth offset (still cut by nearer nodes).
- (2026-10-08) **A route is told apart by color, not by a second cue.** Searched the color space
  under the shading model against the default node, the measurement ramp, edge grey, background
  and the selection band (normal, protan, deutan): black wins by far (min Delta E 22 vs 14 for
  indigo). Size was rejected (flattens a size encoding beneath, e.g. PageRank size), outline too
  (one thin width for all, a full-screen pass). Changes a default -> owner-decisions "for the owner".
- (2026-10-08) **View insets are margins for the next fit, never a reason to move the drawing.**
  The consumer that laid something over the canvas decides whether it hides a node, by the shape
  it knows (`nodesInRect`), and asks for the fit. Reason: insets are bands across the canvas; a
  corner card covers far less than its band, so "a node under the bands" re-framed the T18B
  drawing although the card hid nothing. Not breaking: `viewInsets` is new on this branch (master
  has none). Rejected: re-frame when a node is under the bands (tried, moved T18B), a second
  switch beside `autoFrame`.
- (2026-10-08) **Find moves the camera only to show a pick that is off screen.** Reason: turning to
  every pick (`zoomToSelection`) swings the far side of the drawing off the canvas for good.

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

- (2026-10-08) Did not work: a value marked at the END of an inspector DataRow ("to s11 (no node
  row)") -- the row is cut at 1440 px wide; the fact must lead. Did not work (again): `while pgrep
  -f <pattern>` waiting on a build matches its own shell and never ends; wait by PID. The session
  entry's public types are listed in `graphty-element/session.ts`, not only `src/session/index.ts`:
  a type missing there is absent from `api/session.api.md`. `getByText` misses text split across a
  glyph span: read `.textContent` of the marked cell.
- (2026-10-08) Worked: `label-drawn-over-edges.test.ts`'s fixture (a red edge in front of a green
  label, pixels read off the frame) proves draw order with no camera guessing; 282 edge pixels over
  the label without the change, 0 with it. A story scene that puts a far label behind a near sphere
  needs a capture to check (`visual-review capture --stories styles-label--on-top`): the fixed
  layout's camera did not frame it the way I guessed, but it still shows one cut and one whole label.
- (2026-10-08) Worked: re-walking the pilots with a copy of `tier2/pilot/rewalk.sh` whose `SET`
  is overridable and setup files rebuilt from each pilot's `session.json` "setup" list (the r1d1
  T18 pilots started with PageRank run and sized, not the plain friends setup). Did not work:
  flat-swatch Delta E as a proxy for what a reader sees on a 20 px shaded sphere.
- (2026-10-06 to 10-08, condensed) Small facts: `--hover` rests on a row's center; a mesh toggled
  outside an update pass needs `meshesShownOrHidden()`, an edge rebuilt outside a style pass
  `forceEdgeWalk()`; a layer `set` channel can add a legend block (`keyBlocks` decides).
- (2026-10-08) Worked: a probe script (`tmp/r1-dry1-view-stays-put/probe.mjs`, own static server,
  run through `with-browser.sh`) logging `getCameraState()`, canvas rect and `viewInsets` around
  each step. It named all three mechanisms in two runs: canvas size never changed; insets went
  top 80 -> 180 with cameraDistance 66.6 -> 77.6; Find left the camera position and rotated the
  pivot. Did not work: re-framing only when a node lies under the new bands (T18B still moved:
  its band reached Strozzi beside, not under, the card). A real-element app test of the legend
  could not measure it: the element is 0 px wide in that harness; a stand-in element in
  `CanvasOverlays.test.tsx` (spies on `nodesInRect`/`zoomToFit`) does.

- (2026-10-08) Worked: a find option the caller fills with its own words (`edgeNameJoiner`).
  Untraced: toolbar real test "frames a selected edge's two ends" lands at x 13.92/14.46 vs 14.07
  with or without that change; TableDock's export preview fails only inside the full real run.

- (2026-10-08) Did not work: landing focus on the left panel's tree after open -- Tree typeahead
  claims every one-character key, so the study's single-key shortcuts typed nothing. Worked: a
  plain button (rail). A project that opens ON the Data page (New from data...) must not take
  focus from that page: the open effect runs only when `page === "panels"`.

- (2026-10-08) Worked: snapshot every shared file another agent has dirty BEFORE editing
  (`cp` to `tmp/<task>/base/`), so "fails without the change" is copy base -> run -> copy mine back,
  and my patch is `diff base mine`. Keep any file my new exports are imported from at mine, or the
  whole test file fails on import instead of on the assertion.

- (2026-10-08) While other agents edit the same worktree, stage only your hunks by writing the
  index blob from HEAD plus your own edits (`git hash-object -w` + `update-index --cacheinfo`);
  a shared file's other hunks stay unstaged. Their half-saved files can break `tsc` and the build
  for minutes: wait for a clean `tsc` before building. A setup's Shift+A missed in a WIP build;
  `--click Analyze` works the same.

- (2026-10-08) Flex: `flex-basis: auto`, not `1 1 0`, to split by content. Measure before fixing.
  "Fails without" with no stash: `git diff > p.patch`, `git apply -R`, run, `git apply`.

- (2026-10-08) Canvas `measureText` sizes a column once weight and `letterSpacing` match. Mantine
  Tooltip never opens in jsdom (`.browser.test.tsx`, 1000 ms delay). Name role boxes uniquely ("Role of km").

- (2026-10-08) Save/open: compare summary counts. Colors by measuring. Same-depth line: `zOffsetUnits`.
- (2026-10-08) real.mjs: `--key Shift+A` after a setup that ends with focus on a tree row types
  nothing (focus is a treeitem). To capture a second analysis, start a separate setup for it.
- (2026-10-08) Check a dry-run finding on the frozen build first (`--hover-at` sweeps print
  `elementAt` and the cursor). A Tree child row is not inside its parent treeitem: use `within(tree)`.

- (2026-10-07, condensed) Contrast in a browser test: blend alpha over the first opaque ancestor
  (`contrastOnPage`). Prove a tool fix with a copy of `real.mjs` with the fix undone (beside it in
  `tool/`, so its relative paths hold; delete after); concurrent `--prove` runs need `REAL_PROVE_DIR`. "New from data..." opens no file chooser: click
  "Add a table" > "File..." first.
- (2026-10-07) Another agent's partial-hunk commit can leave HEAD broken. `api:report` reads
  `dist/` types. `tmp/` is gitignored (copy evidence under `rounds/`). Bars: 41 words, axe 0.

- (2026-10-07, condensed) `autoFocus` loses to Mantine's focus trap (`data-autofocus`). Keep a
  `role=status` mounted, change its text. Re-grep my hunks in shared files before committing.
  `selection.apply` THROWS SYNCHRONOUSLY on a bad selector (element defect, unfiled).

- (2026-10-06 to 10-07) **Committing in the shared worktree (condensed).** Commit from an empty
  `git diff --cached`; for a file others have dirty use a private index (`GIT_INDEX_FILE`, `read-tree
  HEAD`, `apply --cached` my hunks). Never commit `api:report` output wholesale; check
  `git show --stat HEAD`.
- (2026-10-06 to 10-07) **Builds and runs (condensed).** `nx run graphty:build` can OOM at 4 GB and
  empty `graphty/dist`: rebuild with `NODE_OPTIONS=--max-old-space-size=8192 npx vite build` in
  `graphty/` (`--outDir <dir>` + `REAL_DIST=<dir>` for a private build). The app reads compact-mantine
  from its `dist/`. Real-element tests: `npx vitest run --project=real-element <file>`; a first run
  after another agent's may fail "Failed to fetch dynamically imported module" (vite re-optimizing).
  `with-browser.sh bash -c` is refused: pass a script. Add a file: "Add a table" > "File...".
- (2026-10-07) Pixel assertions: `waitForStableFrame()`, `scene.render()`, `engine.readPixels` (rows
  from the bottom); a 1-px column across a line (`columnAt`, element-at.test.ts).
- (2026-10-07) **Tests (condensed).** A `Run` is thenable (return plain fields from async helpers).
  Mock graphs have no session. An order-dependent browser test means leaked page state. Real-element
  popover tests need `page.viewport(1366, 768)`. Never call an unexplained failure a flake.
- (2026-10-07) **Reading the element.** A run's per-node values: `session.data.nodePage({ limit:
Infinity, columns: [runId] })` (not `node.data`, not `results.get(run).nodes`). Query syntax is
  JMESPath (numbers in backticks). Rerunning an algorithm replaces its run id. Single-table source:
  `session.project.open(file)` then `draft.load()`. Audit a tier by grepping the app's command ids
  (`grep -rhn -A1 'id: "' --include=commands.ts`): no command, no door.

- (2026-10-08) real.mjs: stale tooltip reproduces with "Local only" -> Everything row (slow fade);
  a killed client gives EPIPE; strip `\x1b[...m` from Playwright call logs.

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
