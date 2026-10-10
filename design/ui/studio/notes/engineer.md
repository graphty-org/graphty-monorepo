# Design Engineer -- designer's notes

Role: I build what the studio decides, in the graphty app (`graphty/src/workspace/`) and in
graphty-element, small and in the right package, and say what the element's API can do today. I
read this file first every session and update it as I decide and learn.

Words: "the app" is the graphty app; "the element" is graphty-element; "tier 1" is a first-time
user's core path (open, read, analyze, color or size by a result, names, find a node and its
neighbors, export, save and reopen); "the walk" chains it end to end as the build's acceptance
test. "The studio worktree" is `.worktrees/design-studio-tier1` (branch `design/studio-tier1`).

## Top of mind

- (2026-10-10) **Built: a selection's own row made from a rule is named by the rule.**
  `selectionName` in `style/StyleTab.tsx` reads `session.selection.origin`: a text origin that
  starts with "=" names the row by the rest ("minutes >= `10`"), shown in the layer list, the
  inspector header and the key ("Edge color: minutes >= `10`"); every other selection keeps its
  node id, edge ends or count. Walk: `tmp/t2r2b-8/rule/06-09.png`. Open: on that walk the new
  edge Color line showed 000000, not the band's 0077BB the highlight-look test expects -- check
  whether `highlightStyle("edge")` or the walk's Line + Color path differs from the test's.
- (2026-10-10) **Built: readers' words find Shortest path in the Analyze list.** Aliases now
  include "linked", "between", "in between", "fewest", "chain" (search only, never shown;
  "linked" replaced "link", which it contains). Walk on 3ee5ca8b0e01: Shift+A, "linked",
  Shortest path, From, pick, To, pick, Find path = 8 steps, Chloe-Ava-Ivan-Kofi-Milo
  (`tmp/t2r2b-11/linked/02-09.png`). Open: "linked" also lists Louvain and Leiden first ("densely
  linked groups", Louvain marked Start here); after picking Shortest path focus is on the
  dialog, not From, so typing a name types nothing (`tmp/t2r2b-11/fewest/05.png`) -- one more
  step on every path; putting focus in From would bring T18 to 7.
- (2026-10-10) **Built: the find box gives a way on from a typed condition, and Enter runs it.**
  Plain text that finds nothing and reads as no rule gets "No match for ... To select by a value,
  type a rule such as =<example>"; a rule shown under the box (the text as a rule, or the
  element's backtick rewrite, now with its "=") is the last option and the one Enter picks; a
  click runs it too. Text-as-rule is judged by the element's new `selection.count` (reads the
  target as `apply` does), not `scope.count`. Walk: `tmp/t2r2b-4/find/01-07.png`.
- (2026-10-10) **Built: three keyboard focus faults on tier 2 controls.** A second Esc in an
  empty find box keeps focus there (the `blur()` is gone); a Hops or Follow change by arrow keys
  keeps focus on that control (the list remounts on every reselect, so a module flag names the
  control to refocus); leaving the filter step editor (Tab out, or a click on anything else) saves
  a whole, changed rule, a half-made one stays a draft, and Esc says "Step not added." or 'Not
  saved: "..." is as it was.' on the status line. Walk: `tmp/t2r2b-6/find/07,08,13,16,17.png`.
- (2026-10-10) **Unfinished, uncommitted: the round 3 dry run from real routes.** In the worktree,
  not committed: `real.mjs` (Tab after a setup starts at Main menu; `REAL_MISS_FAILS=1` makes a
  scripted walk's miss exit 2; self-test checks for both), `detours.sh` (round 2 detours R2-* and
  keyboard sweeps KS-*), `rewalk.sh` (replays a session's transcript route, `routes:<round>`),
  README, the owner-decisions entry for `canvas:empty-click` (its code is in bde1e5de0), and
  FindBox's rule as the option Enter picks is now committed. Still to do: build, `--prove`,
  `detours.sh all`, `rewalk.sh routes:tier2/rounds/round-2`, fix what fails, write the round 3
  preflight's walk table, commit. The "#n among kinds" refusal is already committed with its check.
- (2026-10-10) **Built: bar 10's scripted counts in `tool/bars.mjs`** (`measure.mjs` `bar10()`):
  text cut off with no title, accessible name, tooltip (hovered, 1 s delay) or whole copy on
  screen, and visible error codes / field paths, on every bar 8 screen plus long-names.csv's Data
  place, inspector and find box, at 1440x900 and 1280x800. Planted clipped name and E_BAD_SELECTOR
  are caught and printed by screen and element. On 7fe0a48412cc: 0 unreadable cuts (12 cut but
  readable: find rows by tooltip, a column by name, the inspector title by its id row), 0 codes.
- (2026-10-10, condensed) **Built:** Filter to neighbors is a plain command (adds or turns on
  this center's step; off lives on the step's checkbox); a weighted path's row and announcement
  give its total ("minutes 14") via `pathLengthWords(run)` in `analyze/words.ts`.
- (2026-10-09, condensed) **Built on 10-09:** 24 px xs checkbox target (compact-mantine);
  find-list arrows scroll the row into view; participants run outside the studio's files
  (`--brief`, `--start` refusals, `--leaks`); a selection layer's Color or Width starts at the
  highlight look (`styles.highlightStyle`; open: width 24 band covers the tie); an Add that
  repeats loaded ties says so and offers Replace. Dry run verdict: ~30 of ~355 problems were build
  faults, 12 on the one detour no dry run walked (styling a selection): walk what participants do.
- (2026-10-09) **Drawn names covering names and the picked tie stay graphty-element's** (label
  placement, no size floor). Not a round 3 app change; no workaround in the app.
- (2026-10-09) **Open from the round 2 audit, app:** two-table source has no Edit/Replace and no
  reason; "Edit source..." lands on "Replace: ..."; the refused rule's fix drops "="; neighbor
  Back row scrolls the inspector sideways.
- (2026-10-09) **Dry run = `tier2/pilot/detours.sh all`** on every new frozen build, plus this
  round's detours: style a selection (width, color, name), click away from an open step editor,
  run a path twice, reopen the Path form, open a newer copy of a loaded file.
- (2026-10-09) **Script before calling it a defect:** empty-canvas click while a run is
  selected, edge width units (`EdgeMesh.ts` *20 and /40; "8" drawn as a hairline). (The half-made
  step on another selection is settled: a whole rule saves on leaving, 2026-10-10.)
- (2026-10-09) **The study tool reaches participants more often than the build does.** Every tool
  change gets a planted-failure check; click by name landing on a same-named control (r2-s17, s18,
  s30) needs a refusal like ambiguous names already get.

## Decisions and reasons

- (2026-10-10) A rule selection's row takes the rule's text without its "=", trimmed, not a
  sentence ("Edges where ..."): the rule is the reader's own words and the key already titles the
  section "Edge color: <row>". Only text origins starting with "=" count; a plain text search or a
  `{ where }` target keeps the count, since the first is not a rule and the second has no text a
  reader typed. A hand-picked set with the same ids as an earlier rule reuses that rule's row
  (rows are found by ids), so it shows the rule's name -- left as is.
- (2026-10-10) **Path search words go in aliases, not in the line a reader sees.** Matching
  is a substring of name, line, aliases, key; a word in the line would also be shown. The test
  asserts Shortest path is among the results for each word, not alone: "between" rightly also
  finds Betweenness, and "linked" the community runs.
- (2026-10-10) **Keep `selection.count`; the earlier "drop it" was wrong.** `scope.count({ where })`
  reads a rule as a node scope, so "minutes >= `10`" (an edge column) counted 0 and the box said
  "No match" with an example instead of offering the rule; a real-element test with real typing
  caught it, the unit test did not (its bare-number text took the refusal path, which never counts).
  Asking "what would Enter select" belongs to the element, so FindBox calls `selection.count`.
- (2026-10-10) **Leaving the step editor saves; a click away no longer only keeps a draft.** A
  whole, changed rule is written when focus leaves the form (`onBlur` with a target outside it) or
  the editor unmounts (a click elsewhere moves the inspector on); one `keep` ref stops a double
  write and the Esc path. After a Tab-out the editor moves on to the saved step only if the
  inspector still shows it, so a click that opened something else is never overridden by the
  async write. An incomplete rule still waits as the "+" draft (the a97eb3b67 behavior, kept for
  that case only).
- (2026-10-10) **Hops/Follow focus: the effect's deps were never the cause.** `showNeighborhood`
  reselects, the selection change closes the inspector row and `store.set` opens it again, so
  `NeighborList` mounts fresh and its focus-on-open effect sends focus to Hops. Fix: the control's
  `onChange` sets `refocusControl` to its label id and the effect focuses that group's checked
  radio (ids hold quotes from `nodeKey`: `CSS.escape`). App only; no element change.
- (2026-10-10) **Bar 10 counts visually hidden text as off screen, and a copy on screen as
  readable.** The first run reported every Mantine VisuallyHidden status line (1 px box) as cut;
  the same rule `wordsOnScreen` uses now skips them. A node's title cut while its id row shows it
  whole is readable (criteria: "a wider view"). Raw refusal text and raw file statements have no
  fixed shape: left to the experts. Counts are findings, not a failing exit.
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
- (2026-10-09, summarized 2026-10-10) **Study folders, targets, scrolling, selection lines:**
  only participant folders (`rounds/*/sessions/*` or holding `briefing.md`) are refused in the
  studio; pilots, experts and `--prove` start there by design, and the leak check is the backstop.
  A 24 px xs checkbox target is the input itself (axe measures the focusable box; a `::after` hit
  area still fails), its face drawn by `::before`. The find list scrolls the arrows' row with
  `scrollIntoView({ block: "nearest" })` keyed on the option id, never every render. A selection
  row's line reads its own topmost layer's selector, not `fresh` (undefined after the first edit).

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

- (2026-10-09, summarized 2026-10-10) **Older element and app calls, still standing:** a run row's
  Style tab offers only the sides its own layers cover; audit findings name the owning package
  (canvas label clipping is the element's); camera unsaved; a reopened load replaces itself; a
  resolved option is a caveat, never written into params; what a rule tested is
  `selection.originPaths`, never parsed; tier 2 element doors: edge pick 5a2b3b605, filter steps
  8966b0888, stale runs ce34f31f3, every load a source f141b1283, edge-attribute filter 559f5dcb2,
  coded selector refusals 3d89d43c3; app-only: edge inspector e666ae17d, Export warnings worded by
  the app, a run's Values view from its shape.

## Tried: worked / did not work

- (2026-10-10) Worked: proving the rule-name test fails by disabling the branch (`&& false`)
  gave "expected [ '2 edges' ] to deeply equal [ 'minutes >= `10`' ]". Did not work at first: a
  rule typed with backticks gets no option row under the box (only "Rule: press Enter to select
  matches"), so the test waits for that line, not an option.
- (2026-10-10) Worked: a real-element test with real typing for every path a unit adds. The
  backtick-typed condition failed only there (edge column counted as a node scope). Did not work:
  running vitest while another agent rebuilt the shared dists (graph-io chunks missing, "Failed to
  import test file"); wait until its `nx run graphty:build` exits, then rerun.
- (2026-10-10) Resuming after an interrupted session: check `git log` and `tmp/<session>/` before
  redoing a task. Focus after actions (inspector title after a run or find pick, Degree after
  Back, no canvas ring after a pointer click) was already on the branch (c9430b8d7, refined in
  7f61a2ab2); its re-pilot shots still hold (`tmp/r1-dry2-focus-after-actions/T12RA/09.png`
  Degree focused, `T24A/02.png` no canvas outline). Worked: nothing to redo.
- (2026-10-10) Did not work: running `bars.mjs` on `graphty/dist` of the shared worktree; another
  agent rebuilt it mid-run (ENOENT on index.html). Copy the dist into the task folder and pass
  `--dist`. Seen, not mine: tier 1's "a node's Values with its neighbors" step misses (click on
  "Degree" times out) on 7fe0a48412cc.
- (2026-10-10) Did not work: a Python heredoc with `\\'` inside a single-quoted string (syntax
  error); write the edit script to a file with the Write tool. Worked: `openKarate("data")` (the
  Workspace's `initialState.place`) puts Filters beside the inspector in a real-element test, so the
  step's checkbox is clicked by its name "Apply step: within 2 hops of <name>".
- (2026-10-10) Did not work: a Python `str.replace` to add an assertion after a line two tests
  shared put it in both (the unweighted test then failed on "minutes 14"); anchor test edits on a
  line unique to the test. Worked: proving the row test fails without the fix by writing
  `git show HEAD:<file>` over the source, running, and copying the new file back.
- (2026-10-09, summarized 2026-10-10) **Probes before code.** Workflow subagent logs live in
  `~/.claude/projects/<proj>/<session>/subagents/workflows/wf_*/agent-*.jsonl` (read every user
  line before the first assistant line; filter by mtime). An axe probe as a throwaway
  compact-mantine test before choosing CSS. A pixel check from public API only:
  `element.captureScreenshot` at a `nodeScreenPosition` midpoint scaled by bitmap over CSS width,
  9 px mean, styled against unstyled. Print `JSON.stringify(await draft.report(...))` before
  coding to place a defect. `data.import` takes `{ config: { file } }`; app real-element tests run
  with `--project=real-element`; `?raw` imports of `tool/files/*.csv` work. For a critique read
  `insights.md` section 2 first, then grep to place each fix in its package. Seen, not mine:
  `bars.mjs` misses "a node's Values with its neighbors" (Degree click times out).

- (2026-10-09, condensed) Never edit a script while it runs (bash reads by offset; use a copy);
  `chmod +x` new scripts and read their output, not the exit code; 2x2 `montage` sheets for 900 x
  700 shots. Control names: "Filter: <n> of <m> nodes", "Source actions", "Graph#1".
- (2026-10-09, summarized 2026-10-10) **Geometry and proof in tests.** Where text is drawn:
  a Range over the element's contents, not a padded box's `left`. A point on a drawn name: walk up
  from `nodeScreenPosition(id)` past its `radius` to the first point `elementAt` answers. Prove a
  test fails without the change by writing `git show HEAD:<file>` over the source, running, and
  copying back (no stash); tool files with `node --test` on HEAD copies; prettier checks
  `design/ui/studio/tool/`. Pilot walks: rebuild from `repilot.sh` and its shots, run it bare,
  contact sheets with `montage`.

- (2026-10-09, summarized 2026-10-10) **Measure before fixing a look; walk lessons.** Probe
  computed `display` and real overflow under `with-browser.sh` before CSS; `--expect selected=N`
  counts rows; a pilot's exact steps are in `.claudehistory/<session>/subagents/`; re-walk every
  walk whose path uses a changed door; a second test load needs `{ mode: "merge" }`; prove
  "nothing follows" by spying, never a sleep; hooks: copy `.husky/_/` AND top-level hooks.

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
