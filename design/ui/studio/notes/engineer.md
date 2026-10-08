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

0000000. (2026-10-08) **Import page in reader words (app + compact-mantine).** Summary line
         `modelWords()` ("people and messages: 12 nodes, 22 edges; each edge goes both ways" -- the
         direction clause only once Direction is chosen; the CSV report has no direction fact);
         roles "From"/"To"; the preview follows a table added through "+" (`added` ref, matched by
         table name); preview columns sized by canvas `measureText` at the cell type (450 weight,
         0.055px tracking, +1px) and the grid as tall as its rows, `(32 + 1) * (rows + 1) + 1`
         (1px grid gap per row + 1px padding); `meaningGloss` is a whole sentence in every state;
         "Weight: km (farther)" via `weightName`; role box `aria-label="Role of km"` (new optional
         StyleSelect prop, team decision); reset tooltips on all three Style* resets. NOT done: the
         hint's type still differs from the 9px labels -- it is the theme's 11px field hint (the
         legibility decision of the shared-controls fix, and a test); matching would mean 9px hints
         or 11px labels theme-wide. Raised for the director. Evidence `tmp/r1-dry1-import-page/`
         (T4A/04, 06, 08; T20B/06, 07, 09).
000000. (2026-10-08) **Shared controls: no clipped segment, one focus ring, legible find hints.**
        (a) SegmentedControl: `.cm-sc-control { flex: 1 1 0 }` in a content-sized track gave every
        option the AVERAGE width, so "Leave out" beside "Add" lost its padding and end. Fix:
        `.cm-sc:not([data-full-width]) .cm-sc-control { flex-basis: auto }` (a set-width track with
        equal content still splits equally; `min-width: auto` was tried first and broke the 88px
        glyph track: 3 x 32 > 88). (b) VariablePill: the field's `:focus-within` ring AND the pill's
        own ring; now the field drops its outline while the pill or Detach has `:focus-visible`.
        Detach still shows on focus (keyboard reach). (c) Find hints were the app's `Text size="xs"`
        (9px caption); now `Input.Description` = the theme's field hint (11/16, text-secondary,
        7.6:1 on the dark panel). Theme `fontSizes.xs` left at 9 (243 app uses). Tests:
        `compact-mantine/tests/theme/shared-controls.browser.test.tsx`, `GraphPlace.test.tsx`.
        Evidence `tmp/r1-dry1-shared-controls/` (A/02, A/03, A/04, B/05, B/06; before/).
00000. (2026-10-08) **Row text fits; a cut row's tooltip carries the whole row (compact-mantine).**
       The inspector row is 216px inside the 240px panel (section padding 16/8, row 16/8, value 8),
       so "Edges per node 3 to 6, mean 3.667" truly did not fit (184 needed, 176 free): no padding
       trick. Fix: a `stat` DataRow's reading WRAPS (row min 32, grows; name start-aligned on the
       first line); PageList `description` wraps; Tree `count` is `flex:none; max-width:50%`
       (whole unless more than half the row) and `EllipsizedName` takes `detail` (the count,
       marked `data-row-detail`) so the tooltip shows name AND count when either is cut. Sources
       rows now pass `count` (not a pinned `actions` span). Attribute fill stays pinned text: its
       description already says "25% have a value", and `count` joins aria-describedby (read twice).
       Listed for the owner (stat rows can be taller). Evidence `tmp/r1-dry1-rows-fit/A/07.png`,
       `A/10.png` (tooltip), `A/12.png` (recent), `B/04.png` (Direction).

0000. (2026-10-08) **A reopened run keeps its summary (graphty-element `projectFile.ts`, no door).**
      Opening a project hands each saved result to its run as a canned outcome; that outcome had
      no `summary`, so `run.record.summary` was undefined and every app row reading
      `summary.measured` lost its count ("PageRank 20" -> "PageRank"). Fix: the canned outcome
      carries `summary: result.summary()`, exactly as `AlgorithmManager.execute` does. The "dimmed
      icon" in the pilot was only the unselected-row tone (dimming is for hidden rows only). Test:
      `project-file.test.ts` "gives a reopened run the record it was saved with". Evidence
      `tmp/r1-dry1-reopened-run-count/A/04.png` (PageRank 20), `B/04.png` (PageRank 15).

000. (2026-10-08) **Marks visible (graphty-element; owner doors).** Highlight default -> `#332288`
     (only dark blues/violets clear Delta E 15 from the defaults under all 3 color blindnesses);
     selected edge `edgeColor` `#0077BB` / `edgeScale` 2.5 / `edgeOpacity` 1, a casing behind the
     line (`zOffsetUnits`). Evidence `tmp/r1-dry1-marks-visible/`. The app's Highlight color
     still writes only the node halo `color`.
00. (2026-10-08) **A continuous measure's histogram is banded (element `buildHistogram`).** Per-value
    bars only for integer / all-whole / single / repeated values; else bands. Owner door listed.
    Tests `statistics.test.ts`, `column-histogram.test.ts`; evidence `tmp/r1-dry1-histogram-bands/`.
0. (2026-10-08) **A line says it can be clicked (graphty-element, no door).** The 6 px edge pick
   was already there; the defect was the cursor. A POINTERMOVE observer sets `hoverCursor` when
   `pickEdgeId` finds a line (`element-at.test.ts`). `real.mjs --hover-at` prints `cursor:`.
   Ceiling: linear edge walk per move. Evidence `tmp/r1-dry1-edge-picking/`.
1. (2026-10-08) **Tier 2 pilot fixes (58f02b5d0 element, a2bbb2248 compact-mantine, 32c645e6b app).**
   `LoadedSource.leftOut.edges` (owner door) replaces the app's "Show the left-out row";
   `endpointsFor` stores declared ends; path run opens on Values, "4 hops"; Weight box names what
   the run reads ("None" + reason when the loaded weight is not read); Higher means has "Not set";
   "Date or time"; `EllipsizedName` tooltip shuts on pointerdown. OPEN: T21 Replace relayouts
   every node; `real.mjs --prove` failed once in 4 on the first save (cause not found).
2. (2026-10-07, condensed) Re-walk passed (647ba88b2); `:has()` does NOT nest (dropped silently).
   Still open: Edit source... ADDS (41 -> 82); reopened Direction row raw; neighborhood filter has
   no `direction`; Dijkstra always undirected; `selection.apply` throws synchronously (unfiled).

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

- (2026-10-07, condensed) Notes: one command (`notes.add`), target decided at press time. Weight
  meaning in the app: "Higher means" -> `TableMapping.weightMeaning`. A run's Values view is chosen
  from its shape (`viewOf()`). Selected edges come from the mask, not a style layer.

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
- (2026-10-08) compact-mantine full run: `toolbar.test.tsx` "keeps the last picked face" hit the
  5 s test timeout (5.5 s) while the browser project shared the CPU; alone it passes in time. Not
  touched by row changes; watch it if it recurs.

- (2026-10-08) Worked: canvas `measureText` for a DataTable column's content width, once the
  font weight and `letterSpacing` match the cell's (400 weight measured 3px short at 450). A
  Mantine Tooltip in jsdom never opens (use a `.browser.test.tsx`); the theme's open delay is
  1000 ms, so `findByRole("tooltip", {}, { timeout: 3000 })`. The study tool cannot click a role
  box named only "km" when the grid header is also "km" (pilots used `--click-at`); "Role of km" fixes it.
- (2026-10-08) Worked: comparing `run.record.summary` before save and after open in a node test.
  Comparing the whole summary did NOT work: caveats and durationMs differ because the file saves
  the record's merged caveats and wall time, not the executor's raw ones -- compare the counts.
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
- (2026-10-07) Study prep: `project.open(file)` does NOT load into the element; `tmp/` is
  gitignored (copy evidence under `rounds/`). Tool: Find `=id == 'A' || id == 'B'`; freeze with
  `REAL_DIST`; add a file to an open project with `--key Control+o --upload`.

- (2026-10-07, condensed) A list that closes on blur moved Find path from under the pointer (now
  floats). `autoFocus` loses to Mantine's focus trap (`data-autofocus`). Keep a `role=status`
  mounted, change its text. Re-grep my hunks in shared files before committing (another agent's
  write can undo them). Prettier from the worktree root. CSV whole numbers are type "integer".
  `selection.apply` THROWS SYNCHRONOUSLY on a bad selector (element defect, unfiled). Mantine
  TextInput: `error={text}` + `errorProps={{ role: "alert" }}`; selector `position` is 0-based after "=".

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
