# Design Engineer -- designer's notes

Role: I build what the studio decides, in the graphty app (`graphty/src/workspace/`) and in
graphty-element, small and in the right package, and say what the element's API can do today. I
read this file first every session and update it as I decide and learn.

Words: "the app" is the graphty app; "the element" is graphty-element; "tier 1" is a first-time
user's core path (open, read, analyze, color or size by a result, names, find a node and its
neighbors, export, save and reopen); "the walk" chains it end to end as the build's acceptance
test. "The studio worktree" is `.worktrees/design-studio-tier1` (branch `design/studio-tier1`).

## Top of mind

- (2026-10-08) **A saved note takes focus; delete note is a trash glyph (app only, no API).**
  `Editor.onSaved(id)` -> `focusWhenDrawn(id)` (NotesPlace.tsx): Control+Enter focuses the new note
  (index 0, newest first), so no "Add note N" tooltip opens over it. `GLYPHS.delete` = lucide
  `Trash2`; `GLYPHS.remove` (Minus) stays for taking a value out of a list. The "tooltip drawn under
  the key" was a misreading: the dark tooltip sits ABOVE the dark legend card (z 1200 at body vs the
  overlays' 2) and covers its first digit, so ".03779" and an "N" at the card edge looked clipped.
  No stacking change. Evidence `tmp/r1-dry2-notes-polish/` (T19A/05, 09, T19B/05, 09,
  probe-before-crop vs probe-after-crop.png). Test: Notes.real-element (fails on the old code).
- (2026-10-08) **Path form and Made with (app + compact-mantine, no element API).** A panel's
  Escape (Path, Analyze, Layout popovers) waits for inner controls: `isPanelEscape` (keys.ts) is
  false when `defaultPrevented` or the target has `data-expanded`, so one Escape closes only the
  Weight list and From/To stay. Made with's Weight is `weightRead(caveats)` -> `{ value, note }`:
  "km (farther)", "weight (read as closer)" or "None" in the row, the reason on its own `xs`
  line under it ("Its meaning was not set, so this run assumed a higher weight means closer.").
  Runs show date and time to the second (`runTime`, header "ran Oct 8, 3:36:46 PM" and Ran row).
  `ControlSubGroup` content is no longer a named region (it took the button's name; "Advanced"
  named two things) -- for the owner. Made with rows: Analysis, Ran, From, To, Weight.
  Evidence `tmp/r1-dry2-path-form-made-with/` (T18A/07-09, T18B/07 vs 14, T20A/14-17, T21A/02,
  07, T21B/02, 07). OPEN: `--click "From"` with a path run inspected is ambiguous (Made with's
  group "From Strozzi", the popover's "From"; the tool took the group); toolbar test "frames a
  selected edge's two ends" still off in x (known before this, see Tried); Columns after "=" omit run results; Dijkstra always undirected.
- (2026-10-08) **Filter steps show on/off and what they keep (compact-mantine + app, team door).**
  A step row's outcome ("77 to 26 nodes", "off") is a second line under the condition through the
  new shared `TreeNodeData.descriptionVisible` (row 44 tall); the count slot cut both in the
  240-wide list. Saving a step from the editor turns it on (Undo restores the old rule, off);
  status "Saved "x". The step is on."; header chip Tooltip names the steps on ("Turn it off in the
  Filters list", `chipTip`). Off-row dimming left as is: under the app's high-contrast theme
  tertiary == secondary (70% white, the AA floor), so the word "off" carries the state. Evidence
  `tmp/r1-dry2-filters/` (T17A/07-12, T17B/07-12). OPEN: once, T17B's "Attribute actions" click
  timed out with the button "visible, enabled and stable"; the rerun passed. Mechanism not found.
- (2026-10-08) **Focus after an action goes to the inspector's title (app + element).** A run or a
  find pick focuses the title (`focusInspectorTitle`, `frame/focus.ts`, `tabIndex -1`, ring class
  `cm-focus-outside`). The canvas ring after a click: the element's pointerdown focuses the canvas
  from script, which Chrome marks focus-visible after a key; graphty-element's container now sets
  `data-pointer-focus` on a press and hides the ring then. Evidence `tmp/r1-dry2-focus-after-actions/`.
- (2026-10-08) **Import page and Sources tell the truth (element + app + compact-mantine).** A load
  that leaves rows out wears a warning ("23 rows, 1 left out"), never the green check; a Sources
  child opens what it names (element `LoadedSource.tableRows`); leaving Data closes its rows. A
  replace under the seeded layout draws as an open does (`Dispatcher.graphWritesQueued`). Evidence
  `tmp/r1-dry2-import-page-sources/`. OPEN: after Replace the legend loses "Size: PageRank" (T21A/06).
- (2026-10-08) **Find confirms what it ran; selections list members (element + app).** After Enter
  the rule stays in the box and the line under it reads the live count; "Selected edges" lists
  each edge by its ends' names and each tested column's value (element `selection.originPaths`).
  Evidence `tmp/r1-dry2-find-and-selection/`. OPEN: `edgePage({ scope: "selection" })` is empty
  for an edge-only selection (owner door: behavior change).
- (2026-10-08) **Neighborhood list (app only, no API change).** Heading and status line
  "Javert's 17 connections" at every hop count (`neighborhoodWords`, inspector/words.ts), named by
  `session.data.name()` (the old "#895, named by id" note was stale). Every hop count lists by
  name (one hop: element `sort: { by: "name" }`; two or more: numeric `Intl.Collator` over the
  selection); a weighted one hop keeps its tie values. "Filter to neighbors": `default` Button at
  rest, `filled` when on, Tooltip says what it does and, on, "Press again to show every node".
  Evidence `tmp/r1-dry2-neighborhood-view/` (T23B/04-08, T12RA/04-06, T23A/04, 07, 08).
- (2026-10-08) **The key speaks the app's words for a run's highlight (app only).** One section per
  run color titled by the run ("Shortest path" / "On the path", `highlightEntry`), never the
  element's layer name; card and exported key share `keyNames`. Evidence `tmp/r1-dry2-key-words/`.

- (2026-10-08) **Shared rows, lists and menus (compact-mantine).** A tree row's count yields to its
  name; a selected expanded parent fills `bg-selected-hover`; unchosen segment label in `--cm-text`;
  only a keyboard open focuses a ContextMenu's first row; list fields consume their Escape (a
  Popover with `closeOnEscape` still wins). Evidence `tmp/r1-dry2-rows-shared-controls/`.
- (2026-10-08) **A run says which method it used (element + app, team door).** Unset `method` ->
  Dijkstra, Bellman-Ford on a negative read weight; option meta `choiceLabels`; Made with says
  "Dijkstra, chosen automatically". OPEN: explicit dijkstra over a negative undirected weight
  freezes the page (`algorithms/src/indexed/dijkstra.ts`). Evidence `tmp/r1-dry2-run-record-method/`.
- (2026-10-08) **Route color: element default stays indigo, the app sets black (owner decided).**
  Never change an element default for the app: the app calls `session.styles.setHighlightColor`
  with `APP_HIGHLIGHT_COLOR` (`graphty/src/constants/highlight.ts`) in BOTH hosts (`ElementHost.tsx`
  for `?next`, `Graphty.tsx`). Indigo read as ordinary on lit spheres; judge node colors at shaded
  tones and screenshot pixels (`tmp/r1-dry2-path-color/measure.py`). Cost: black is the 7th group color.

## Priorities and values

- (2026-10-07) Owner: no touch/tablet profile and no keyboard-only study in the tier 2 fix work.
- The core path works end to end on real wiring first (owner, 2026-10-02/03): a step that looks
  right but changes nothing visible is worse than a missing one.
- Fixes land in the package every consumer gets; an app workaround hides an element defect.
- Small diffs, root causes; one guard in the shared function, not a patch per caller.
- Evidence over taste: assert on element reports (`runs.painting()`, `styles.explain()`,
  `labelOf`, `nodeScreenPosition`), not on what a panel claims.
- Say early when a decision needs element API (owner door if breaking) vs cheap app chrome.
- Never blame timing or load; find the mechanism.

## Design criteria

- **Visible effect at commit** on canvas and legend (round 8's walk failed 21/21 on panel-only
  changes). **Live counts only**, read from the element at render time.
- **No promises:** nothing unbuilt is drawn (no "Coming", no disabled stand-ins).
- **One door, one command:** registered once, same words at every door, no two controls share an
  accessible name (also what the study tool clicks by).
- **Element owns facts, app owns words** (owner, 2026-10-03). **Easy things easy:** a new element
  API's first example fits in about 15 lines with no internal concept.
- **Style layers only;** suggested layers scoped to the result. **Exact by default;** cost
  estimates come from the element. **The app never starts work unasked.**
- **Accessible by default:** WCAG 2.2 AA; Esc closes the innermost thing; focus never falls to
  the page body; a ring never sits on a value row the reader did not pick.

## Decisions and reasons

- (2026-10-08) **A saved note takes focus, not "+".** Focus on "+" opened its tooltip over the
  note just written (items 40, 44); the note itself reads whole and Tab/Arrow move on from it.
  Rejected: suppressing the tooltip on "+" (a shared component's behavior, every icon button).
- (2026-10-08) **Delete note gets its own glyph (`delete`, trash) rather than changing `remove`.**
  `remove` (minus) also marks "take out of this list" in SetLine and LabelSection, where minus is right.
- (2026-10-08) **A run's time is shown to the second.** Two path runs in one minute (T18B) must
  differ in their own record; minutes alone tie. Rejected: a relative "2 min ago" (goes stale on a
  saved project), a run counter (not a fact the reader can check).
- (2026-10-08) **The weight row holds a short fact; the why goes on a line under it.** Rejected:
  "weight, meaning not set, read as closer" (read as a contradiction) and any sentence in the
  value column (wraps, orphan "1)"). The select's description and Made with share one sentence.
- (2026-10-08) **Escape guard is one helper for every popover form, not per caller.** The shared
  list already consumes its Escape; the panel guard also covers a field that overrides the
  theme's `onKeyDown` and the Layout popover (same pattern, not in the pilot).
- (2026-10-08) **A replace is laid out as an open is, not framed differently.** The "small graph"
  after Replace was a correct fit of a deep layout (z extent 37 vs x 23; an explicit `zoomToFit()`
  changed nothing). Mechanism: the seeded restart skipped while "another graph write waits", and
  the import being placed counted as waiting. Only not-started jobs count now. Rejected: re-arming
  the settle framing (the fit was already right), turning the camera to the thinnest axis (an
  opinion as a default).
- (2026-10-08) **Which file held nodes is the element's fact (`tableRows`).** The app cannot infer
  it: order of adding and "Each row is" both change it. Rejected: a record keyed by name (collides
  like `tables`). A table child shows only its own count; the left-out child only the rows.
- (2026-10-08) **A shared link follows its size prop.** `.cm-anchor` set the body font outright, so
  `size="xs"` links were 11 px in 9 px captions. Fixed once for every caller (inspector "from"
  line, usage card, import grid caption). The report itself moved to `sm`, the row size.
- (2026-10-08) **Neighbors in name order at every hop count, weighted one hop included.** Two or
  more hops list the selection, which has no single tie per node, so weight order is impossible
  there; one hop in weight order made the lists disagree (pilot T23B). Tie values still show at
  one hop. Filter to neighbors is outlined at rest because a subtle button read as a list row; the
  way back is in the pressed button's tooltip, not new chrome.

- (2026-10-08) **One key section per highlight color, titled by the run.** A node and an edge
  section with the same chip told a reader nothing the one does not; the property word ("Color",
  "Edge color") is dropped only when merged, since the one entry then covers both. Entry words
  live by result shape in analyze/words.ts beside the run names, so a new highlight shape gets
  "In the result" until it gets its own words. Rejected: renaming the element's layers (its English
  layer name is a default, the app replaces words by id).

- (2026-10-08) **The name wins the room fight, the count yields.** Reverses the earlier "count stays
  whole up to half the row": the name says which row it is, and two versions of a file differ at
  the end of the name. The tooltip still carries both. Rejected: moving the count under the name
  (rows are a fixed 32 px, virtualized), `min-width: 0` (the count vanished with no sign).
- (2026-10-08) **A pointer-opened menu has no keyboard position.** Rejected: highlighting row 1 for
  every open (read as the suggested choice, "Edit source..." in T21B).
- (2026-10-08) **The run record of a resolved option is the caveat that names it, not a new field.**
  `caveats.method` already said "dijkstra"; a `resolvedParams` record would state it twice. The app
  matches it against the option's choice values only for an enum left unset. Writing the resolved
  value into params was rejected: a rerun would pin it and lose "left unset".
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
  (one thin width for all, a full-screen pass). The owner kept the element default; the app sets it.
- (2026-10-08) **View insets are margins for the next fit, never a reason to move the drawing.**
  The consumer that covered the canvas decides, by the shape it knows (`nodesInRect`), whether to
  ask for a fit. Rejected: re-frame when a node is under the bands (moved T18B), a second switch.
- (2026-10-08, condensed) **Standing app decisions from the dry runs:** find moves the camera only
  to an off-screen pick (`zoomToSelection` swung the drawing away); Made with states the weight the
  run read (`caveats.weight.assumed`, not `data.loadedWeight()`); visible labels stay exact ("From"),
  only accessible names grow; after a surface comes up focus goes to the open place's rail button;
  the app states its label look (body font) on every label line it adds, in one transaction; what
  a rule tested is an element fact (`selection.originPaths`), never parsed from the text; facts are
  rows, not chips; a filter step's outcome is a second line and saving a step turns it on; a stat's
  reading wraps, never cut; a canned run outcome carries every field a live one does; a selected
  edge has flat settings (`edgeColor`, `edgeScale`, `edgeOpacity`).
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

- (2026-10-08) Did not work: reading "tooltip under the key" from a screenshot -- two dark
  surfaces abutting look like clipping. Worked: a probe (`tmp/r1-dry2-notes-polish/probe.mjs`)
  printing the tooltip's ancestor chain and z-index, plus a zoomed crop showing what covers what.
  `elementFromPoint` is no evidence here: tooltips have `pointer-events: none`, so it returns the card.
- (2026-10-08) Worked: `pilot/rewalk.sh` with `HERE=<my tmp>` and `REAL_DIST=graphty/dist` re-pilots
  a task on a fresh build; step N lands in screenshot N+1 (01 is the start).
- (2026-10-08) Did not work: rerunning a path with the same From and To to show two times -- it
  returns the same run (same time is then the truth). Use a different pair (T18B: Peruzzi, Ginori).
- (2026-10-08) Did not work: a tree row's count slot for a filter outcome. The slot yields to the
  name but keeps a 2.5em stub, so "weight is at least 4" + "20 to 19 nodes" became "weight is at
  least..." + "20 to ...". An old test passed because `textContent` includes a `hidden` span:
  assert `checkVisibility()` on visible words.
- (2026-10-08) Did not work: `focus({ focusVisible: false })` (HTML standard) -- Chrome 143
  ignores it, still draws the ring. Worked: a plain probe page (`fv-probe3.mjs`: input, key,
  click a canvas in a delegatesFocus shadow root) showed every script focus inherits the
  keyboard modality there, with or without preventDefault; `real.mjs --sr` "focus:" lines and a
  computed-style probe (`title-ring-probe.mjs`) told "not focused" from "focused, no ring"
  (Mantine's `mantine-focus-never` erases outlines; `cm-focus-outside` restores one).
- (2026-10-08) Worked: logging the node box's x/y/z extents and calling `zoomToFit()` in a probe
  (`tmp/r1-dry2-import-page-sources/probe-replace.mjs`) split "framed wrong" from "laid out
  differently" in one run. Did not work: `graph.waitForSettled()` right after a second load -- it
  resolves on the OLD settlement; poll `isSettled && !running`. A column label click already opened
  its role list on this build (the pilot's miss did not reproduce at 728,205 or 662,201); a test pins it.
- (2026-10-08) Did not work: expecting `data.name()` to read a
  `name` field -- it returns the id until `knownFields.nodeLabelPath` is set (an import sets it);
  a headless test sets it. Did not work: `max-height` from row bottoms alone; border-box counts
  the list's 1 px border, so the list ended 1 px above the row.

- (2026-10-08) Did not work: piloting on `graphty/dist` while others rebuild (their `vite build`
  empties it: "no production build"). Worked: copy dist into the task's tmp folder after the
  build, grep its JS for the new words, serve the copy. Run prettier on an index-built blob.

- (2026-10-08) A test must fail without the fix: a contrast check passed on the old gray (compare
  to the chosen label instead); unnested rows fit at 240 px and proved nothing.
- (2026-10-08) Did not work: a browser test asserting explicit Dijkstra over a negative weight --
  the page froze (no test timeout fires on a synchronous loop); the vitest run sat at "RUN" 12 min.
  A hung browser test with no output means a sync infinite loop: rerun with `-t` to bisect. Another
  agent's `nx run graphty:build` emptied `graphty/dist` mid-start: copy dist to `tmp/<task>/dist`.
- (2026-10-08, condensed) A fact at the END of a narrow inspector row is cut: lead with it.
  `while pgrep -f` matches its own shell: wait by PID. Session-entry public types are listed in
  `graphty-element/session.ts`. `getByText` misses text split across a glyph span.
- (2026-10-06 to 10-08, condensed) Re-walk pilots from their `session.json` setup lists, not the
  plain setups. Flat-swatch Delta E is no proxy for a shaded sphere. `--hover` rests on a row's
  center; toggled meshes need `meshesShownOrHidden()`, rebuilt edges `forceEdgeWalk()`. A camera
  probe logging `getCameraState()`, canvas rect and `viewInsets` per step names camera mechanisms;
  a real-element app test cannot measure the legend (element 0 px wide). Untraced: toolbar real
  test "frames a selected edge's two ends" lands off in x (13.8 to 14.5 vs 14.07) with or without
  unrelated changes; TableDock's export preview fails only inside the full real run.

- (2026-10-08) Did not work: landing focus on the left panel's tree after open -- Tree typeahead
  claims every one-character key, so the study's single-key shortcuts typed nothing. Worked: a
  plain button (rail). A project that opens ON the Data page (New from data...) must not take
  focus from that page: the open effect runs only when `page === "panels"`.

- (2026-10-08, condensed) Shared worktree: snapshot a file another agent has dirty BEFORE editing
  (`tmp/<task>/base/`); stage only my hunks (`git apply --cached --unidiff-zero`, or
  `hash-object -w` + `update-index --cacheinfo`). Their half-saved files can break `tsc` and the build
  for minutes: wait for a clean `tsc` before building. A setup's Shift+A missed in a WIP build;
  `--click Analyze` works the same.

- (2026-10-08, condensed) Flex: `flex-basis: auto` to split by content. "Fails without" with no
  stash: `git diff > p.patch`, `git apply -R`, run, `git apply`. Canvas `measureText` sizes a column
  once weight and `letterSpacing` match. Mantine Tooltip never opens in jsdom. Same-depth line:
  `zOffsetUnits`. real.mjs: `--key Shift+A` after a setup ending on a tree row types nothing; check
  a dry-run finding on the frozen build first; a Tree child row is not inside its parent treeitem.

- (2026-10-07, condensed) Contrast in a browser test: blend alpha over the first opaque ancestor
  (`contrastOnPage`). Prove a tool fix with a copy of `real.mjs` with the fix undone (beside it in
  `tool/`, so its relative paths hold; delete after); concurrent `--prove` runs need `REAL_PROVE_DIR`. "New from data..." opens no file chooser: click
  "Add a table" > "File..." first.
- (2026-10-06 to 10-07, condensed) Shared worktree: commit from an empty `git diff --cached`; for a
  file others have dirty use a private index (`GIT_INDEX_FILE`, `read-tree HEAD`, `apply --cached`
  my hunks); never commit `api:report` output wholesale (it reads `dist/` types). Builds: `nx run
graphty:build` can OOM and empty `graphty/dist` (`NODE_OPTIONS=--max-old-space-size=8192 npx vite
build --outDir <dir>`); the app reads compact-mantine from its `dist/`. Tests: a `Run` is thenable;
  pixel checks via `waitForStableFrame()` + `engine.readPixels`; never call a failure a flake; a
  run's per-node values via `session.data.nodePage({ columns: [runId] })`; queries are JMESPath.
  `selection.apply` throws synchronously on a bad selector (element defect, unfiled).

- (2026-10-06 to 10-08) Grep every route of a value before calling a change done. Untraced: header
  "Untitled" after New from data; `notReadSentence` words only `E_PARSE_FAILED`.

- **Open project or file... reopening a project.** #913 closed in the element with "one intake
  verb"; the app still imports a `.graphty.json` as data. A tier 1 task (save, close, reopen) only
  passes today through Recent projects. Adoption should be a small app change.

## Sources

- Digests in `design/ui/studio/digests/` (`tier1.md`, `decisions.md`, `study-rounds.md`,
  `owner-voice.md`, `framework.md`); repository `CLAUDE.md`; `design/ui/studio/tool/README.md`.
- Tier 1 design and plan on branch `feat/tier1-real-app` under `design/ui/tier1-real-app/`.
- App comments citing element issues: grep `#[0-9]{3,4}` under `graphty/src/`.
- Owner memory notes (do not blame timing; cap workflow browsers; the image model only transcribes).
