# Design Engineer -- designer's notes

Role: I build what the studio decides, in the graphty app (`graphty/src/workspace/`) and in
graphty-element, small and in the right package, and say what the element's API can do today. I
read this file first every session and update it as I decide and learn.

Words: "the app" is the graphty app; "the element" is graphty-element; "tier 1" is a first-time
user's core path (open, read, analyze, color or size by a result, names, find a node and its
neighbors, export, save and reopen); "the walk" chains it end to end as the build's acceptance
test. "The studio worktree" is `.worktrees/design-studio-tier1` (branch `design/studio-tier1`).

## Top of mind

- (2026-10-09) **The neighbor list opens at the reach of the filter that is on, and its heading
  wraps.** `selection.neighborhood` (Degree link and `g`, `toolbar/commands.ts`) reads an on
  neighborhood step seeded on the one center (`filteredReach`) and selects and keys the list at
  its depth; no such step, one hop. The heading uses compact-mantine `ControlSection wrapLabel`
  (new, default off; recorded "decided by the team"): a long title wraps, the header grows, so it
  is never cut and has no tooltip; a cut title without `wrapLabel` still shows the shared tooltip
  (`EllipsizedName`). Tests: "reopens a node's neighbor list at the reach of its 2-hop filter" in
  `toolbar/__tests__/tasks.real-element.test.tsx` (fails without the change: list opened at 1
  hop), two `wrapLabel` cases in `ControlSection.browser.test.tsx`. Evidence
  `tmp/r2-dry3-neighbor-list-reach-and-heading/T23B/{05,10,11,12,13}.png`, `T12RA/04`, `T12RB/04`.
  For `real.mjs`: the heading's text now matches 2 things (group, span); hover it as `"<text>#2"`.

- (2026-10-09) **The import preview's caption says "All N rows" when it holds the whole table**
  ("1 row" for a one-row table), and "The first N rows of M" only when it holds fewer.
  `previewCaption(shown, total)` in `data-page/words.ts`, unit-tested in `words.test.ts`; the
  real-element "draws every sample row" test now waits for "All 12 rows". The "Add a table"
  tooltip opens `position="left"` of its "+", over the empty Tables heading row, so it no longer
  covers "Each row is". Evidence `tmp/r2-dry3-import-page-caption-and-tooltip/{T20A/05,T20B/06,
T21A/05,T4A-hover/05}.png`.

- (2026-10-09) **A menu opened by a click highlights no row, whatever its first row is.**
  compact-mantine `overlayBehavior.ts` (`skipDisabledFirstRow`): the row Mantine's focus trap
  picks (the menu's first menuitem) is redirected to the menu itself when the pointer opened it;
  opened by a key it stays on (or moves to) the first enabled row. Any other enabled row reached
  from the menu (type-ahead) is left alone. Tests: two enabled-first-row cases in
  `MenuKeys.browser.test.tsx` (the pointer one fails without the change); three tests and the
  Menu story's play function that asserted "a click focuses the first row" now assert the menu
  has focus and ArrowDown reaches row one; graphty `HelpMenu.test.tsx` likewise. Evidence
  `tmp/r2-dry3-shared-menu-pointer-highlight/T24A/03.png`, `T24B/` (Edge actions, no row filled).

- (2026-10-09) **Study build is d5a3bee20b61**, frozen write-protected at
  `design/ui/studio/tmp/study-builds/tier2-r2d2-d5a3bee20/` (inside the worktree: the main
  checkout's `.study-builds/` is off limits). All 20 task halves were walked on it with
  `tier2/pilot/repilot.sh` (sessions `tier2/rounds/r2d2/pilot/`, triage `tier2/dry-run-r2-3.md`):
  every step landed and none of the second dry run's 15 fixed items came back. The answer key's
  four false claims (Medici scrollbar, Graph title "does nothing", T19 reshaping, T19 ring beside
  the new form) are rewritten against that build's screenshots; T21B finally has screens.

- (2026-10-09, condensed) **Find, neighbor list and inspector notes:** the Find refusal starts at
  the hint's x (`.ws-find-refusal`); the neighbor list is named once (its `ControlSection` group);
  Filter to neighbors toggles the one neighborhood step on this center at any reach; inspector notes
  are `size="sm"` with `pl={PANEL_GRID.PAD_LEFT}`. Tests in `GraphPlace`, `Inspector`, `PathForm.real-element`.
- (2026-10-09, condensed) **Nothing on the Data page moves when a link goes;** a Sources row shows
  only what its title names (`DataPage.real-element.test.tsx`).
- (2026-10-09, condensed) **Study screenshots draw native scrollbars** (`measure.mjs` `LAUNCH`
  drops `--hide-scrollbars`); `work.json` records whole step rules and runs as `technicalName
plainName`; reports quote names at `NAME_CHARS` = 80. Test `tool/measure.test.mjs`. Bars 2, 7, 8, 9 scored by
  `bars.mjs`; one 4-browser pool; ambiguous names refused with `"<name>#n"`.

- (2026-10-09, condensed) **`selection:origin-changed` `{ origin }`** fires when only a
  selection's origin changes (`selection:changed` stays membership-only); a bare-number
  `suggestion` is attached only when the rewrite parses. Tests `selection-origin.test.ts`,
  `selector.test.ts`.

- (2026-10-09, condensed) **A missing notice in a pilot screenshot is first a timing question:**
  a notice lasts 6 s (`NOTICE_MS`) and a step can take 8 s to settle; `real.mjs` prints `a notice
showed and went before this screenshot` (`goneNotices`). Test `undoWords.real-element.test.tsx`.
- (2026-10-09, condensed) **Save and Recent projects:** focus after Save returns to what opened it
  (no mark after a pointer click, `:focus-visible`); Recent projects' date reads like a note's
  (`whenWords`, non-breaking spaces). Tests in `Project.real-element.test.tsx`, `project.test.tsx`.
- (2026-10-09, condensed) **Find's hints show the reader's own rule** (`details.suggestion` from the
  element, only when it parses; "Start with = to select by a value:"); a condition typed without
  "=" gets how to write it (`readsAsRule` in `FindBox.tsx`). Tests `selector.test.ts`,
  `GraphPlace.test.tsx`.
- (2026-10-09, condensed) **The Data page's root is `.dp-page`** (sharing `.dp` with the Data place
  let `display: flex` replace its grid, so Load moved); the format button sits on the file heading's
  line under "File settings". Test in `DataPage.real-element.test.tsx`.
- (2026-10-09, condensed) **Panels:** the Graph title opens the graph's Overview (`fromRow` in
  `inspector/inspected.ts` resolves "graph"); the open filter step's row is marked; the
  neighborhood wears its node's header; `OptionsForm` passes no `value` at a default. Tests in
  `GraphPlace.test.tsx`, `inspected.test.ts`, `Filters.real-element.test.tsx`, `OptionsForm.test.tsx`.
- (2026-10-09, condensed) **The dry run walks the detours as a script: `tier2/pilot/detours.sh all`**
  (30 walks: success paths, `--sr` keyboard walks, round 1's wrong turns, each with `--expect`;
  report `tier2/dry-run-r2-1.md`). Its fixes: pointerdown no longer canceled (2a236410c), short
  Select lists open whole (ca3f10515), note focus and Control+Enter (55e71f98e, 0e9e329c6).
- (2026-10-09) **A style line goes only to a layer its row names; nothing falls back to
  Everything.** `writeLine(..., fresh)` in `style/row.ts` takes the layer to add as a required
  argument and throws when there is none; `RowStyle` offers a side only when the row has a layer
  on it or one to add (PageRank: no Nodes | Edges switch). Test `StyleTab.real-element.test.tsx`;
  evidence `tmp/t2r1-11/`.

## Decisions and reasons

- (2026-10-09, summarized) **Smaller standing facts:** the path's Weight list starts on the loaded
  weight; a live region is in the page before its words arrive (`Frame.tsx`); the selection halo
  draws only back faces (`createOverlaySource`); ", out of date" only on `data-changed`; the
  Filters step editor is a `<form>` (`focusNext`/`focusStep`).
- (2026-10-09) **The list follows the filter, not the other way round.** Reopening a node under its
  2-hop filter opened one hop with the button pressed, and pressing it there removed the filter
  instead of narrowing. Opening at the on step's depth makes list, Hops and button agree; with no
  on step nothing changes (T12R still opens at Hops 1). Only an ON step counts: an off step is
  the reader's own choice not to filter, so it should not change where the list opens.
- (2026-10-09) **Wrap a sentence heading, opt in.** A neighbor heading is the task's answer, so it
  must be read whole; section names of one to three words stay on one line, so `wrapLabel` is
  per section with the old drawing as default (no change to any other section). One line at
  `wrapLabel` keeps the 40px header (16px lines plus 8px padding = the old 32px line box).
- (2026-10-09, condensed) **A chosen segment is filled** (`--cm-bg-inverse`) and every control shows
  the arrow cursor (one rule in compact-mantine `00-foundation.css.ts`; only Anchor keeps the hand).
- (2026-10-09, condensed) **A data file opened from the start screen goes through the Data page**
  (`openInSession`; Control+O on the page lands as a drop), and the source's inspector "..." holds
  the Sources row menu's verbs (`useSourceActions`). Tests `StartScreen.real-element.test.tsx`,
  `DataPlace.real-element.test.tsx`.
- (2026-10-09) **Pointer-opened menus focus the menu, not row one, for every menu.** A filled first
  row reads as already chosen (Edge actions showed "Select endpoints" blue in the T24 pilots). The
  WAI-ARIA menu-button pattern focuses the first item on any open; we keep that for keyboard opens
  only, where the highlight is the reader's cursor. The rule is limited to the row the focus trap
  picks: applying it to any row focused from the menu also undid type-ahead from the menu (typing
  "l" went back to row one) -- caught by `tests/figma/overlays.browser.test.tsx`.

- (2026-10-09) **One neighborhood filter per center, whatever the reach.** The toggle is about
  "this node's neighbors are filtered", so a 2-hop step answers it at Hops 1 too; matching only the
  reach shown made the button lie and stack a second step. The tooltip names the other reach so
  the pressed state is not read as "1 hop". The OptionsForm unread note needed no change: it is
  already 11 px and starts under its label (the popover's Weight); the inspector's Advanced run
  settings form sits at 8 px, left of the rows' 16 px -- a form-layout question, not a note.
- (2026-10-09) **Move the link, not the control.** Putting the link after the segmented control
  keeps the sentence, the control and the link in reading order and is the smallest diff; a
  reserved-width link slot would leave a gap while the unmatched rows show. A row's inspector
  answers to its title: counts of the whole load under "1 row left out" read as the row's counts.
- (2026-10-09) **A new event rather than an empty `selection:changed`.** Its TSDoc promises "only
  a real movement arrives", so an empty delta would change what an existing event does (breaking)
  and make every listener redraw for nothing. The new event fires only when no member moved, so
  one call never fires both. Recorded under "decided by the team" in `owner-decisions.md`.
- (2026-10-09) **A suggestion the selector would refuse is no suggestion.** Validated by parsing
  the rewrite; a rewrite equal to the input is skipped first, which also stops the parse from
  asking for its own suggestion again.

- (2026-10-09) **No forced focus ring after a pointer click.** `focus({ focusVisible: true })`
  after Save would make the note card the one control that rings after a mouse click (spec 2.7,
  same reason as the cursor rule); a keyboard user sees the mark at the next key.
- (2026-10-09) **A study tool that hides what a person saw is fixed in the tool, not the app.**
  Lengthening `NOTICE_MS` would change the product for the tool's sake. Rejected: a screenshot
  before settling (it would catch half-drawn frames).

- (2026-10-09) **A reset that resets nothing is not drawn; the fix is split by owner.** The app
  decides what "default" means for a run setting (equal to the descriptor's default), so
  `OptionsForm` hands no value then. Making `StyleNumberInput` hide its reset whenever value equals
  `defaultValue` was rejected: in a style layer an explicit value equal to the default still
  overrides layers beneath, so its reset does something. The shared component's real defect was
  that an undefined `value` after typing went uncontrolled and showed the stale number -- fixed
  there, since every caller passing `value` relies on the documented "undefined shows default".
- (2026-10-09) **The Graph title opens a "graph" row rather than clearing the selection.** The
  canvas click reaches the Overview only by emptying the selection; T20 needs the Overview while a
  node stays picked. A selection change still closes the row, as for every other row.

- (2026-10-09) **A count in a heading is the count the reader can check beside it.** "Ava's 14
  connections" next to "Selection 15" read as a disagreement; naming the center in the heading
  ("Ava and 14 ...") keeps the one-hop count equal to Degree and makes the sum match Selection.
  Chosen over "15 nodes: Ava and 14 ..." as the shorter form. A key under a filter names the run's
  own node count rather than nothing, so a reader comparing 19 shown with 20 ranked sees why.
- (2026-10-09, condensed) **Segment fill = the inverse color** (brand blue failed 1.4.11 and
  1.4.3); `--cm-segment-edge` kept (removing a published variable is breaking). **Arrow cursor on
  every control, the hand only on links** (Mantine's UnstyledButton default was the hand).

- (2026-10-09, summarized) **Round 1 and dry-run calls, still standing:** a vertical list passes
  `scrollbars="y"` and ellipsizes through `EllipsizedName`; the app breaks on long names and narrow
  windows, not at 1440x900 (`REAL_VIEWPORT`); path and Replace words name the weight column and say
  why a weight was not read; plain text counts as a condition only when the accepted rule matches
  something (no syntax read in the app; Mantine's `description` links the hint); the element no
  longer cancels canvas pointerdown (click-outside works for every consumer); a Select list that
  fits opens whole; the path's Weight list already starts on the loaded weight; reopen is a fresh
  fit (camera unsaved, owner door); a skipped weight's note says what the run did, then why; the
  page that names the graph announces its load; an Add counts what it adds.
- (2026-10-09, condensed) **The bar scripts measure in the participant's own `real.mjs` session**
  (ops `measure`, `work`; checks in `measure.mjs`), each move with an `--expect`. Focus fell = body
  or null (shadow-root focus is kept); shared names count reachable controls, not list items; bar
  7 seeds 42; bar 9 limits are round 1's counts on round 1's frozen build.
- (2026-10-08, summarized 2026-10-09) **Older dry-run fixes, still standing:** `--read` prints rows
  by cell; sources show "Added"/"Left out"; compact-mantine Tree type-ahead and menu Escape. OPEN:
  Columns after "=" omit run results; edge-only `edgePage` selection (owner door); dijkstra over a
  negative undirected weight freezes the page.

- (2026-10-09) **A run row's Style tab offers only the sides the run's own layers cover** (built,
  see Top of mind). A node-only result has nothing to say about edges (the algorithm-styles rule).
  Rejected: a run-named edge layer with an empty selector (paints every edge, breaks the rule).
- (2026-10-09) **Audit findings name the owning package; the canvas label clipping is the
  element's.** The fit frames spheres only, so any app fix (smaller font, padding) would hide an
  element defect. The legend card's label overlap waits on the same element fact (label bounds).
- (2026-10-08, summarized) **Dry-run 3 and 4 calls:** the camera stays unsaved; a step is named
  by what changed; a reopened load replaces itself, never adds; Esc exits only an empty import
  page; no script focus ring after a pointer action (spec 2.7); tooltip dismissal follows the
  pressed control; one label style (`Text xs`); lists snap to whole rows; a shared control's defect
  is fixed in compact-mantine; a saved note takes focus; a run's time shows seconds.
- (2026-10-08, condensed) **Element facts over new fields:** a resolved option is the caveat that
  names it (`caveats.method`), never written into params (a rerun would pin it); a left-out row
  says which END is missing (`LeftOutEdge.source/target`, mapped by `draft.resolve`); a label's
  draw order is the style field `onTop` (default depth sorted); a route is told apart by color
  (black, min Delta E 22; the app sets it); view insets are margins for the next fit, never a
  reason to move the drawing.
- (2026-10-08, condensed) **Standing app decisions from the dry runs:** find moves the camera only
  to an off-screen pick; Made with states the weight the run read (`caveats.weight.assumed`);
  visible labels stay exact, only accessible names grow; what a rule tested is an element fact
  (`selection.originPaths`), never parsed; facts are rows, not chips; a stat's reading wraps.
- (2026-10-07, condensed) **Tier 2 element work (owner doors):** edge pick 5a2b3b605; filter steps
  `setSteps`, counts only in `plan` (8966b0888); stale runs ce34f31f3 (Replace never reruns);
  every load a source f141b1283; edge-attribute filter 559f5dcb2 (`nodes: "ends"`); coded selector
  refusals 3d89d43c3. Next: run results typed per field; several node types last.
- (2026-10-07, condensed) **App-only (no door):** edge click opens the edge inspector (e666ae17d);
  Export warnings worded by the app (`export/lossWords.ts`); a run's Values view comes from its
  shape (`viewOf()`). Element English still on screen (estimate reasons, layout descriptions):
  codes from the element are an owner door.
- (2026-09-13 to 10-07) Older standing decisions: no default layout seed in the element (the app
  seeds, `LAYOUT_SEED`); any new site showing a run calls `runName`; test the element before the
  app; a run paints when it finishes; group-row color fallback in `graph-place/rows.ts` stays until
  #1099; study APIs `nodeScreenPosition`, `elementAt`, `labelOf` merged.

## Tried: worked / did not work

- (2026-10-09) Did not work: making a section header grow with an inline `minHeight` alone --
  `.cm-section-header` sets `height: 40px` in `chrome.css.ts`, so the header stayed 40 until the
  `[data-wrap-label]` rule set `height: auto`. The browser test caught it (40 not above 40).
- (2026-10-09) Worked: when a pilot's log is gone, rebuild its walk from `repilot.sh` and the
  screenshots (T23B 14 to 17: Data page, then Find Medici and `g` under the 2-hop filter).
- (2026-10-09) Worked: re-piloting only the halves a fix touches with
  `REAL_DIST=graphty/dist OUT=<my tmp> LANES=3 tier2/pilot/repilot.sh T20A T20B T21A`, then one
  hand session for a hover the script does not take (`--hover "Add a table"` prints the tooltip).

- (2026-10-09) Did not work: wrapping `tier2/pilot/repilot.sh` in `tool/with-browser.sh` -- the
  wrapper held a browser slot with no browser while each `real.mjs --start` took its own; run
  repilot.sh bare. Did not work: dropping the enabled-row early return outright (broke type-ahead
  from the menu itself, see decisions).

- (2026-10-09) Worked: a scripted re-pilot that walks each half's success path plus the exact
  steps that reach every fixed screen, then contact sheets (`montage *.png -tile 4x -geometry
720x450`) to scan all 161 screenshots and full-size reads for each fixed item. Did not work at
  first: hovering a section title as `"<text>#3"` -- after the neighbor list was named once only
  two controls carry the name, so the span is `#2` now.

- (2026-10-09) Worked: proving a tool test fails without the change by writing `git show HEAD:`
  copies of the tool files into a scratch folder beside the new test and running `node --test`
  there (no stash, no checkout). Did not work as a check: eslint on `design/ui/studio/tool/` --
  it flags every Node global (`process`, `URL`) because that folder has no lint config; prettier is
  the check that applies.

- (2026-10-09) Worked: proving a test fails without the fix by copying the changed sources aside,
  writing `git show HEAD:<file>` over them, running the test, and copying them back (no stash).
  Did not work as a first guess: notifying only the internal scope notifier -- the app listens
  only through `session.on`, so the fix needed a public event.

- (2026-10-09) Worked: a pilot's exact steps are in its agent transcript under
  `.claudehistory/<session>/subagents/workflows/<wf>/agent-*.jsonl` (tool_use commands); two
  steps chained in one shell line give the second step's duration from screenshot mtimes. Worked:
  `--read` in a non-`--sr` session tells where focus is. Did not work: assuming a missing notice
  meant a second code path -- the test of the route passed on the first run.

- (2026-10-09) Worked: when a screenshot "shows a scrollbar it should not", measure before fixing:
  a Playwright probe (`tmp/r2-dry1-find-box-hints/probe.mjs`, run under `with-browser.sh`) printed
  scrollHeight 362 vs clientHeight 298 and the rows below the cut -- the list did overflow. Mantine
  keeps a ScrollArea scrollbar mounted (`forceMount`) and hides it with `data-state="hidden"` +
  `display: none`, so a test must check computed display, not presence. Did not work: a find
  test graph whose nodes carry a `name` column -- it adds a Values row and changes the row count.

- (2026-10-09) Worked: when a layout rule "does nothing", log the computed `display` and
  `gridTemplateRows` of the root in the test. A grid that measured as flex exposed a class-name
  collision between two places (`.dp`). Grep a new root class across `src/**/*.css` before using
  it. Seen, not mine: the "Role Menu" and "Unmatched Rows" Data page stories fail (they look for
  combobox "owner" and text "1 unmatched row"; the page names "Role of owner").

- (2026-10-09) Worked: `real.mjs` `--expect selected=N` counts selected ROWS (aria-selected), not
  selected nodes -- read the Selection row's count in the screenshot instead. Did not work: one
  Shift+Tab from the paint tree reaches the find box, not the title; two do.
- (2026-10-09) Did not work: `assert.isDefined(x)` before a nested `function` declaration -- TS
  drops narrowing inside hoisted functions; bind a narrowed `const` outside it.

- (2026-10-09, condensed) Seen, not mine: T7 in `tasks.real-element.test.tsx` reads Damping's
  `value` outside its `waitFor` after Revert (the field re-syncs a commit later); read it inside.
  Worked: proving a CSS fix's test fails by copying `git show HEAD:<file>` over it and back;
  `--hover-at` over every control class before choosing a rule; re-walking every dry-run walk whose
  path uses a changed door (`detours.sh T3 T4 ...`), which found the silent Control+O loss.
- (2026-10-09) Worked: a local walk script beside the evidence (`r2-dry2-app-import-and-left-out/walk.sh`)
  when rewalk.sh's fixed steps stop one click short; a real-element test of "does not move" reads
  the control's `getBoundingClientRect().left` before and after the click.

- (2026-10-09, condensed) **Test and walk lessons.** A second load in a test needs
  `session.data.import(..., { mode: "merge" })` (default replaces). Prove "nothing follows" by
  spying the element call and settling it in `act`, never a sleep. `--sr` walks give the Tab
  order; `--expect-not` on a placeholder proves nothing (prove every check on the broken build);
  a miss exits 0, only `--expect` fails a walk. A build from the shared tree holds others'
  unfinished edits. Read graders' state lines before coding (the "starts on None" task was a
  verification). Prove a test fails without the fix with `git diff -- <mine> > patch; git apply -R`
  or a one-line sed revert. Focus after a write: a module-level request taken in an effect keyed on
  the element's change version. Hooks: copy `.husky/_/` AND the top-level hooks into the temp dir
  (the shim runs `$(dirname $(dirname $0))/<hook>`, else every hook exits 0); commit scope `tools`,
  not `studio`. Open: a run hidden by an Everything edit shows a blank Style tab
  (`defaultRow` null on empty bindings; `tmp/t2r1-11/a/06.png`).

- (2026-10-09, condensed) The first-save fault: one cause is gone with the picker save; the other
  (ECONNREFUSED, session process gone) is unproven. Two `--prove` runs on the default `tmp/prove`
  end each other's sessions: always set `REAL_PROVE_DIR`.

- (2026-10-09, condensed) Did not work: leaving edits uncommitted while others commit in the same
  files (`17bf87085` swept my hunks); commit as soon as hunks pass. Did not work:
  `open(p, "w").write(f(open(p).read()))` empties the file before the read; read first, then write.
- (2026-10-09, condensed) Worked: polling `/proc/*/fd` for slot-file holders (`tmp/t2r1-1/holders.sh`;
  `fuser` prints nothing useful); staging only my hunks of shared files (`git update-index
--cacheinfo`), since real.mjs edits reach every agent's next session; `real.mjs --sr` with Tab and
  Enter to check a live line prints once (pick the visible line by `role !== "status"`); finding a
  layout cause in Mantine's CSS first; reading `scores.md` beside `insights.md`; `long-names.csv`
  for truncation audits, with PIL 4x crops for small text. `--click Graph` takes the rail button.
- (2026-10-08, summarized) **Older tool and test lessons.** Pilot on a `cp -r graphty/dist` copy;
  read `setup.log` after every `--start`; step N lands in screenshot N+1; `--sr` focus lines tell
  "not focused" from "focused, no ring"; hover tooltips need `{ timeout: 3000 }`; assert
  `checkVisibility()`; a hung browser test is a sync loop (bisect with `-t`); `pgrep -f` matches
  itself (wait by PID).
- (2026-10-06 to 10-08, condensed) Shared worktree: stage only my hunks (`git apply --cached`, or a
  private `GIT_INDEX_FILE`), commit from an empty `git diff --cached`; wait for a clean `tsc` before
  building over others' half-saved files; never commit `api:report` output wholesale. Builds:
  `NODE_OPTIONS=--max-old-space-size=8192`. Element facts: a `Run` is thenable; per-node values via
  `session.data.nodePage({ columns: [runId] })`; `selection.apply` throws synchronously on a bad
  selector (unfiled); `data.name()` returns the id until `knownFields.nodeLabelPath` is set.
- (2026-10-06 to 10-08) Grep every route of a value before calling a change done.

## Sources

- Digests in `design/ui/studio/digests/` (`tier1.md`, `decisions.md`, `study-rounds.md`,
  `owner-voice.md`, `framework.md`); repository `CLAUDE.md`; `design/ui/studio/tool/README.md`.
- Tier 1 design and plan on branch `feat/tier1-real-app` under `design/ui/tier1-real-app/`.
- App comments citing element issues: grep `#[0-9]{3,4}` under `graphty/src/`.
- Owner memory notes (do not blame timing; cap workflow browsers; the image model only transcribes).
