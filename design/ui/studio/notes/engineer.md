# Design Engineer -- designer's notes

Role: I build what the studio decides, in the graphty app (`graphty/src/workspace/`) and in
graphty-element, small and in the right package, and say what the element's API can do today. I
read this file first every session and update it as I decide and learn.

Words: "the app" is the graphty app; "the element" is graphty-element; "tier 1" is a first-time
user's core path (open, read, analyze, color or size by a result, names, find a node and its
neighbors, export, save and reopen); "the walk" chains it end to end as the build's acceptance
test. "The studio worktree" is `.worktrees/design-studio-tier1` (branch `design/studio-tier1`).

## Top of mind

- (2026-10-10) **Built: Filter to neighbors is a plain command.** It adds this center's step at the
  hops shown, or turns that one step on (moving it to the hops shown); a second press never deletes
  it, and it is never drawn pressed. Off lives only on the step's checkbox in Filters, and the
  tooltip says so ("... Its step in Filters turns it off"). Walk: `tmp/t2r2-13/walk/06-11.png`.
- (2026-10-10) **Built: a weighted path's run row and its "Shortest path added" line give its
  total, "minutes 14", not "3 hops".** One helper, `pathLengthWords(run)` in
  `graphty/src/workspace/analyze/words.ts`, feeds both the row (`graph-place/rows.ts`) and the
  announcement; it reads the element's published `cost` and `caveats.weight` (distance only, the
  same rule as the inspector's "Total minutes"). Walk: `design/ui/studio/tmp/t2r2-12/walk/11.png`.
- (2026-10-09) **Built: a 24 px target on the extra-small checkbox; find-list arrows scroll the row
  into view.** compact-mantine's xs Checkbox input grows to 24 x 24 (margin -6, paints nothing;
  `::before` draws the 12 px face from the input's state colors): pixel-identical box, axe
  target-size 0 on both filter-step screens. The find list did NOT scroll to the arrows' row on
  8f0d5a6f7791 (`tmp/t2r2-10/find/04.png`); `FindBox` now scrolls it (and its group heading)
  into view; `scrollable-region-focusable` on `.ws-find-viewport` recorded as a criteria exception.
- (2026-10-09) **Built: participants run outside the studio's files, and a read voids them.**
  `--brief <round>/sessions/<id>` writes the participant's folder under `<worktree>/tmp/studio-sessions/`
  (same path below it); `--start` refuses a round `sessions/<id>` folder or a briefed folder inside
  `design/ui/studio`, and a scratch folder without its own briefing; `--end` copies back with
  `leaks.json`; `--leaks` reads the participant's Claude Code logs (opening prompt names the folder
  and "study participant"). The workflow briefs, prompts, ends (twice) and grades on that. Round 2
  routes that worked are weak evidence until re-run (weight meaning, Replace, find's rule hint).
- (2026-10-09) **Did the dry run work? Mostly.** About 30 of ~355 recorded problems were build
  faults, none above severity 2, no grade decided by one; the only `session.log` line is r2-s13's
  900 s idle close. Twelve of the thirty sit on the one detour no dry run walked: styling a
  selection. The dry run must walk what participants style, not only what the answer key styles.
- (2026-10-09) **Built: a Color or Width added to a selection's layer starts at the highlight
  look.** `session.styles.highlightStyle(target)` (element, additive) states what `highlight()`
  paints with no set; `startingValue(descriptor, session, selector)` reads it when the layer the
  line lands on names ids. Everything and run rows keep the descriptor default. Open, not the
  app's: at width 24 the element's selection band grows with the line and covers the tie while
  selected (`tmp/t2r2-7/walk/09.png`); width units stay an owner question.
- (2026-10-09) **Built: an Add that repeats loaded ties says so and offers Replace.** The element
  already had the count (`LoadReport.repeated.seen`); only the draft's merge report read 0, since it
  measures in a scratch session without the graph's edges. Fixed in the element (pairs handed to
  the measure); the Add page shows one line above the buttons and "Replace <source>" beside Load,
  which reopens the page as Replace on the same file. Walk: `design/ui/studio/tmp/t2r2-5/`.
- (2026-10-09) **Find box, severity 3:** "chapters 10" says only "No match". Proposed: when plain
  text names part of a column the app already lists after "=", hint "=<column> >= `10`"; for bare
  numbers an opt-in element parse option (`bareNumbers`, default off, additive) instead of changing
  what the selector accepts (that would be breaking).
- (2026-10-09) **Drawn names covering names and the picked tie stay graphty-element's** (label
  placement, no size floor). Not a round 3 app change; no workaround in the app.
- (2026-10-09) **A layer made from a rule should be named by the rule**, not "13 edges"
  (`selection.origin.text` is already read in `FindBox`). Smallest fix for "the key says nothing".
- (2026-10-09) **Open from the round 2 audit, app:** two-table source has no Edit/Replace and no
  reason; "Edit source..." lands on "Replace: ..."; the refused rule's fix drops "="; neighbor
  Back row scrolls the inspector sideways.
- (2026-10-09) **Dry run = `tier2/pilot/detours.sh all`** on every new frozen build, plus this
  round's detours: style a selection (width, color, name), click away from an open step editor,
  run a path twice, reopen the Path form, open a newer copy of a loaded file.
- (2026-10-09) **Script before calling it a defect:** a half-made filter step discarded on another
  selection (the tool's click caused r2-s17/18), empty-canvas click while a run is selected, edge
  width units (`EdgeMesh.ts` *20 and /40; "8" drawn as a hairline).
- (2026-10-09) **The study tool reaches participants more often than the build does.** Every tool
  change gets a planted-failure check; click by name landing on a same-named control (r2-s17, s18,
  s30) needs a refusal like ambiguous names already get.

## Decisions and reasons

- (2026-10-10) **A command and a toggle on one button was the defect, not the words.** Participants
  pressed "Filter to neighbors" twice and lost the step they had made; the pressed look and "Press
  again to show every node" only explained the trap. One place turns a step off (its checkbox), as
  for every other step. Kept: one step per center (a press at other hops moves that step rather
  than stacking a second, which would intersect to the nearer reach). App only: the element's
  `visibility.setSteps` already does all of it.
- (2026-10-10) **A path's length words come from one function.** The row and the status line both
  said "N hops" from two copies; a weighted path's answer is its total, so both now call
  `pathLengthWords`, with the inspector's distance-only rule for "Total <column>". Unweighted (or a
  non-distance weight) keeps "4 hops". No element change: `cost` and `caveats.weight` were
  already published.
- (2026-10-09) **Only participant folders are refused in the studio, not every folder.** Pilots,
  experts, graders' repros and `--prove` start under `design/ui/studio` by design; a literal "refuse
  anything under the studio tree" would break them. A participant folder is recognized by place
  (`rounds/*/sessions/*`, the old layout) or by holding `briefing.md`. Scratch mirrors the studio
  path so `--end` and the plan lookup need no record file. The leak check is the backstop, since
  `tmp/studio-sessions/` is still in the same repository: it flags facilitator names anywhere, any
  `personas/` path, any studio path but its own copy, `real.mjs` and `tool/files/`, any `..`, and a
  Grep/Glob with no folder. Checked on r2-s05's real log: it names `tasks.md` and the persona read.

- (2026-10-09) **A bigger target is the input itself, not a pseudo-element hit area.** axe measures
  the focusable element's box, so a `::after` hit area clicks but still fails target-size (it did,
  in a probe: "12px by 12px", the containing tree row as the too-near neighbor). The input is the
  24 px target and draws nothing; `background-clip: content-box` with 12 px padding hides its
  face, `::before` (`border-color`/`background-color: inherit`) draws the box, so every state rule
  keeps working; `outline-offset: -5px` keeps the ring 1 px off the drawn box. xs only (keyed on
  Mantine's `data-size`). Limit: on rows under 24 px the area overhangs 2 px; a row painted later
  (positioned, as Tree's) wins that overlap, so the next row keeps its clicks, but the next row's
  box takes the previous row's bottom 2 px. Real filter rows are 44 px.
- (2026-10-09) **Scroll the arrows' row with `scrollIntoView({ block: "nearest" })`, keyed on the
  option id, not on every render** (a render-time scroll would fight a reader's wheel). The first
  row of a group brings its heading too, or ArrowUp to the top hides "Nodes 64".

- (2026-10-09) **The line lands on the row's own topmost layer, so read its selector, not
  `fresh`.** After a selection's first edit the inspector moves to the new layer's row, where
  `fresh` is undefined; reading `fresh?.selector` gave Color the highlight and Width the default.
  The real-element test caught it (width 8, not 24). Rejected: a scaled width in the app (copies
  an element constant and hides the units question).

- (2026-10-09, condensed) **Read the report type before adding a field:** the repeated-ties count
  already existed (`repeated.seen`); the defect was the measured merge, fixed in the element.
  Replace from the Add page calls `replaceSource`; an open page restarts on a replace request.

- (2026-10-09, condensed) **Round 2 critique ranking:** study tool briefing, Add warns on repeats
  and offers Replace, find's hint for a condition in words, new lines start visible, rule-made
  layers named by their rule. Not changed: no new words at rest, label placement in the app, the
  element's style defaults, the frozen build mid-round.

- (2026-10-09, summarized) **Audit and round-2 method:** audits walk screens by script at both
  sizes (`round-2/expert/engineer/audit.sh`, `audit2.sh`) so the next round compares the same
  screens; measure first (tool, bar scripts, detour walks) before any session; no new words at
  rest. **Label picks** are an opt-in per-layer style field resolved in `pickNodeId` (click, hover,
  drag and `elementAt` agree), recorded under "decided by the team".

- (2026-10-09, condensed) **A landed click is read from Playwright's call log** ("click action
  done"), not by a longer limit for everyone; setup clicks get 20 s.

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
- (2026-10-09, summarized) **Menus, neighborhoods, events:** a pointer-opened menu focuses the
  menu, not row one (only the focus trap's pick; type-ahead from the menu kept); one neighborhood
  filter per center whatever the reach, the tooltip naming the other reach; a no-movement
  selection gets a new event, never an empty `selection:changed` (breaking), recorded under
  "decided by the team"; a suggestion the selector would refuse is no suggestion.

- (2026-10-09, condensed) **Move the link, not the control** (reading order, smallest diff); a
  row's inspector answers to its title.
- (2026-10-09) **No forced focus ring after a pointer click.** `focus({ focusVisible: true })`
  after Save would make the note card the one control that rings after a mouse click (spec 2.7,
  same reason as the cursor rule); a keyboard user sees the mark at the next key.
- (2026-10-09) **A study tool that hides what a person saw is fixed in the tool, not the app.**
  Lengthening `NOTICE_MS` would change the product for the tool's sake. Rejected: a screenshot
  before settling (it would catch half-drawn frames).

- (2026-10-09, summarized) **Reset, Graph title, heading counts:** `OptionsForm` passes no value at
  a run setting's default (a style layer's explicit default still overrides, so `StyleNumberInput`
  keeps its reset; its real defect, an undefined `value` going uncontrolled, was fixed there); the
  Graph title opens a "graph" row so a node can stay picked; a heading's count must be checkable
  beside it ("Ava and 14 ..." matches Selection 15); a key under a filter names the run's own count.
- (2026-10-09, condensed) **Segment fill = the inverse color** (brand blue failed 1.4.11 and
  1.4.3); `--cm-segment-edge` kept (removing a published variable is breaking). **Arrow cursor on
  every control, the hand only on links** (Mantine's UnstyledButton default was the hand).

- (2026-10-09, summarized) **Round 1 and dry-run calls, still standing:** vertical lists pass
  `scrollbars="y"` and ellipsize through `EllipsizedName`; path and Replace words name the weight
  column and why it was not read; plain text is a condition only when the accepted rule matches;
  the element no longer cancels canvas pointerdown; reopen is a fresh fit (camera unsaved, owner
  door); an Add counts what it adds.
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
- (2026-10-08, summarized) **Older dry-run calls and element facts:** camera unsaved; a step named
  by what changed; a reopened load replaces itself; Esc exits only an empty import page; no script
  focus ring after a pointer action; shared-control defects fixed in compact-mantine; a resolved
  option is a caveat (`caveats.method`), never written into params; a left-out row names its
  missing END; label draw order is `onTop`; what a rule tested is `selection.originPaths`, never
  parsed; find moves the camera only to an off-screen pick; facts are rows, not chips.
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

- (2026-10-10) Did not work: a Python heredoc with `\\'` inside a single-quoted string (syntax
  error); write the edit script to a file with the Write tool. Worked: `openKarate("data")` (the
  Workspace's `initialState.place`) puts Filters beside the inspector in a real-element test, so the
  step's checkbox is clicked by its name "Apply step: within 2 hops of <name>".
- (2026-10-10) Did not work: a Python `str.replace` to add an assertion after a line two tests
  shared put it in both (the unweighted test then failed on "minutes 14"); anchor test edits on a
  line unique to the test. Worked: proving the row test fails without the fix by writing
  `git show HEAD:<file>` over the source, running, and copying the new file back.
- (2026-10-09) Worked: finding a workflow agent's log by its opening prompt. Workflow subagent logs
  are `~/.claude/projects/<proj>/<session>/subagents/workflows/wf_*/agent-*.jsonl`; the first user
  lines can be the harness's relayed request, so read every user line before the first assistant
  line. Filtering by mtime since the briefing keeps the scan of ~19k logs to a second.

- (2026-10-09) Worked: an axe probe as a throwaway compact-mantine browser test before choosing
  the CSS (printed `failureSummary`); a pixel diff of the 24 px crop around the box against the
  frozen build's `bars.mjs` capture (bbox None). `userEvent.click(container, { position })` clicks
  a page point as long as what is hit is inside the container. Seen, not mine: `bars.mjs` MISSes
  "a node's Values with its neighbors" on 8f0d5a6f7791 too (Degree click times out), and bar 9 (b)
  is over round 1's counts on the shared tree.

- (2026-10-09) Worked: a pixel check in an app real-element test from public API only --
  `element.captureScreenshot`, the midpoint of two `nodeScreenPosition`s scaled by bitmap width
  over the element's CSS width, the mean of a 9 px square, styled tie against an unstyled one.
  Without the fix the two differed by 2 (of 765); with it, well over 30. Select ties for a walk
  with find `=minutes >= \`10\`` on bus-stops.

- (2026-10-09) Worked: a one-off element test printing `JSON.stringify(await draft.report(...))`
  before writing code -- it showed `repeated.seen: 0` beside `counts.edges: 82`, which placed the
  defect in the measure, not the type. `session.data.import` takes `{ config: { file } }`, not
  `{ file }`. The app's real-element project is `--project=real-element` (`browser` excludes
  them); `?raw` imports of `design/ui/studio/tool/files/*.csv` work from graphty tests.

- (2026-10-09) Worked for a critique: reading `insights.md` section 2 first (it answers "was it
  the build or the design"), then grepping `startingValue` and `ruleFromText` to place each fix in
  its package before proposing it; `for f in */session.log; do [ -s $f ] ...` finds the sessions
  where the tool or build spoke.

- (2026-10-09, condensed) Never edit a script while it runs (bash reads by offset; use a copy);
  `chmod +x` new scripts and read their output, not the exit code; 2x2 `montage` sheets for 900 x
  700 shots. Control names: "Filter: <n> of <m> nodes", "Source actions", "Graph#1".
- (2026-10-09) Did not work: a left-edge test with `getBoundingClientRect().left` of a padded
  `Text` -- the box starts before its padding, so the broken build passed. Worked: a Range over
  the element's contents (`range.selectNodeContents(el).getBoundingClientRect().left`) for where
  the text is drawn.

- (2026-10-09) Worked: an app real-element test that finds a point on a drawn name with public
  API only -- walk up from `nodeScreenPosition(id)` past its `radius` and take the first point
  `elementAt` answers the node (the app lint rule `graphty/no-element-mutation` refuses
  `element.graph`). Seen, not mine: `tsc` in graphty-element flags `maxNodes` in
  `test/managers/LayoutManager.test.ts` because `layout/dist` predates the master merge (stale
  build, not a source error).

- (2026-10-09, summarized) Pilot walks: rebuild a lost walk from `repilot.sh` and its screenshots;
  run repilot.sh bare (inside `with-browser.sh` it held a slot with no browser); re-pilot fixed
  screens by script, then contact sheets (`montage *.png -tile 4x -geometry 720x450`).

- (2026-10-09, condensed) Proving a test fails without the change: copy the changed file aside,
  write `git show HEAD:<file>` (or a one-line python edit) over it, run, copy back -- no stash. For
  tool files, `node --test` on `git show HEAD:` copies in a scratch folder; prettier, not eslint,
  checks `design/ui/studio/tool/`. The app hears the element only through `session.on`.

- (2026-10-09, summarized) **Measure before fixing a look.** A Playwright probe under
  `with-browser.sh` showed a list really overflowed (Mantine keeps a hidden ScrollArea bar mounted:
  check computed display); log a root's computed `display` when a rule "does nothing" (a `.dp`
  class collision made a grid flex; grep new root classes). `--expect selected=N` counts selected
  rows, not nodes. TS drops narrowing inside hoisted nested functions.

- (2026-10-09, condensed) A pilot's exact steps are in `.claudehistory/<session>/subagents/`;
  `--hover-at` over every control class before choosing a rule; re-walk every dry-run walk whose
  path uses a changed door (`detours.sh T3 T4 ...`).
- (2026-10-09) Worked: a local walk script beside the evidence (`r2-dry2-app-import-and-left-out/walk.sh`)
  when rewalk.sh's fixed steps stop one click short; a real-element test of "does not move" reads
  the control's `getBoundingClientRect().left` before and after the click.

- (2026-10-09, condensed) **Test and walk lessons.** A second load in a test needs
  `{ mode: "merge" }`. Prove "nothing follows" by spying the element call, never a sleep; prove
  every walk check on the broken build (only `--expect` fails a walk). A build from the shared tree
  holds others' unfinished edits. Hooks: copy `.husky/_/` AND the top-level hooks into the temp
  dir, else every hook exits 0. Open: a run hidden by an Everything edit shows a blank Style tab.

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
  building over others' half-saved files; grep every route of a value before calling a change done; never commit `api:report` output wholesale. Builds:
  `NODE_OPTIONS=--max-old-space-size=8192`. Element facts: a `Run` is thenable; per-node values via
  `session.data.nodePage({ columns: [runId] })`; `selection.apply` throws synchronously on a bad
  selector (unfiled); `data.name()` returns the id until `knownFields.nodeLabelPath` is set.

## Sources

- Digests in `design/ui/studio/digests/` (`tier1.md`, `decisions.md`, `study-rounds.md`,
  `owner-voice.md`, `framework.md`); repository `CLAUDE.md`; `design/ui/studio/tool/README.md`.
- Tier 1 design and plan on branch `feat/tier1-real-app` under `design/ui/tier1-real-app/`.
- App comments citing element issues: grep `#[0-9]{3,4}` under `graphty/src/`.
- Owner memory notes (do not blame timing; cap workflow browsers; the image model only transcribes).
