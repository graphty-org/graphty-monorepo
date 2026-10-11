# Design Engineer -- designer's notes

Role: I build what the studio decides, in the graphty app (`graphty/src/workspace/`) and in
graphty-element, small and in the right package, and say what the element's API can do today. I
read this file first every session and update it as I decide and learn.

Words: "the app" is the graphty app; "the element" is graphty-element; "tier 1" is a first-time
user's core path (open, read, analyze, color or size by a result, names, find a node and its
neighbors, export, save and reopen); "the walk" chains it end to end as the build's acceptance
test. "The studio worktree" is `.worktrees/design-studio-tier1` (branch `design/studio-tier1`).

## Top of mind

- (2026-10-10) **Round 3 critique: five smallest changes, in order.** (1) graphty-element:
  Shift-click (and Ctrl, Meta on macOS) on a node adds, through the same `selection.applyNow(...,
"add", "user")` the edge click uses -- the round's only confirmed app-caused severity 3 (4 of 4
  T24; `NodeBehavior.handleClick` always replaces). (2) Element adds an optional "or more" target
  to a numeric `FindValueRow`; the app shows "is 10" and "is 10 or more" under a "Select where"
  heading so the value is not cut. (3) Analyze filter puts name matches first ("path" finds
  Shortest path before Betweenness), app-only in `analyze/words.ts`. (4) Element adds `depth` to
  `data.neighbors` and `hops` to each `Neighbor`; the app shows each name's hops (today it lists
  the selection by name and cannot know distance without computing over the graph). (5) A Filter
  button on the Graph toolbar opening the Data place's Filters (5 of 8 T17 looked there first).
- (2026-10-10) **Hold still in round 4:** second Find path replacing the first, "Select endpoints"
  in "..." (confounded with Shift-click), the "=" hint and backtick wording (measure "or more"
  alone), round 2's routes (now passing clean), label and node overlap (element, owner's list).
- (2026-10-10) **Round 3 screenshot audit done: 38 findings, 0 at severity 4, 2 at 3 (both
  element label placement), 12 at 2.** `tier2/rounds/round-3/expert/engineer.md`. New this round
  and mine to fix in the app: the disabled "Filter to neighbors" shows no reason to the person who
  just pressed it (tooltip opens on pointer entry only) and looks like an empty text field
  (compact-mantine's disabled Button); the repeated-ties warning on "Add to" is plain text with Load
  still primary; Escape does nothing on the Data pages. New for the element: sized nodes drawn
  inside each other (layout spaces centers, not sizes) -- the cause under "Farah under Chloe".
- (2026-10-10) **Round 2 closed; its lesson for me: a study that leaks proves only failures.**
  Participants read the facilitator's task file, so the three routes added for round 2 (weight
  meaning at load, Replace in the source's "..." menu, the find box's rule hint) are NOT credited
  until round 3 re-measures them clean. Do not reword or move them meanwhile. Round 3 does not
  start until the study-tool fixes (no participant read outside its own folder, dry run from pilot
  routes, every named bar script proven on a planted fault) pass.
- (2026-10-10) **The dry run must walk what participants do, not last round's list.** 12 of about
  30 build faults sat on the one detour nobody walked (styling a selection). Round 3: two
  throwaway pilots per task on the candidate build, script their routes, walk them plus round 2's
  detours, keyboard-press every control on each screen, and FIX before freeze -- never hand a
  found fault to a later pass (the find box's second Escape slipped through that way).
- (2026-10-10) **Round 3 changes, built (verify on the next frozen build):** find box offers a
  typed condition as a rule Enter runs, with the "=" kept; Add warns on repeated ties with Replace
  beside Load; three focus faults (second Escape, Hops/Follow arrows, Tab out of the step editor
  saves); selection layer Color/Width start at `styles.highlightStyle`; a rule's layer named by its
  rule; words at rest under round 1 (edge inspector 31 of 30 -- OPEN which scope phrase goes); 24 px
  xs checkbox; path aliases; weighted path row shows its total; Filter to neighbors a plain
  command, disabled with its reason when its step is on; repeated status keyed in the store.
- (2026-10-10) **Watch in round 3.** (1) Find box: do 3 or more of 8 still stall after a typed
  condition? That alone unlocks "Select where..." on a column. (2) Highlight-start styling: the
  walk once showed edge Color 000000, not the highlight band's 0077BB, and width 24 may cover the
  tie -- check before freeze. (3) Paths cost at or under 8 steps (bar 11). (4) Bar 9 (b) words at
  rest on all four tier 2 screens. (5) Leak check lists 0 unvoided reads. (6) Reworded T22/T24
  compared with round 2 on outcome only, not steps.
- (2026-10-10) **Not mine to fix in the app, ever:** drawn names covering names and ties (element
  label placement on an unseeded layout, owner's list); bare numbers in rules and what an edge
  width measures (both breaking, owner's list); never scale widths or parse rules in the app.
  "Components 1" under a filter is held so the words change is measured alone.
- (2026-10-10) **Owner decision: the chosen segment keeps Figma's face, never an inverse fill.**
  Dark #2c2c2c face, 1px #444 edge on #383838; light white face, 1px #e6e6e6 edge on #f5f5f5;
  `highContrast` gives a 3:1 edge. See `owner-decisions.md`.
- (2026-10-10) **OPEN, not reproduced: a reopen from Recent projects once drew no "Opened friends"**
  (r3 pilot `T19A/11.png`, route `--reopen`). Eleven walks showed it; suspect the open finishing
  late (an element question). No code without a mechanism. Evidence
  `tmp/r3-dry1-reopen-shows-opened-notice/`.
- (2026-10-10) **Still open from the round 2 audit, confirmed on r3d2:** two-table source has no
  actions and no reason; "Edit source..." lands on "Replace: ..."; neighbor Back row scrolls the
  inspector sideways; path popover covers the nodes it asks for; 900 x 700 canvas is 363 px. The
  "Full graph" section under a filter is frozen and reads right at both sizes.
- (2026-10-09) Script before calling it a defect (two round 2 "app faults" were the study tool's
  click by name landing on a same-named control); every study-tool change gets a planted-failure
  check.

## Decisions and reasons

- (2026-10-10) **Shift-click on a node adding is a defect fix, not an API change.** The edge
  click already adds on Shift; nothing documents a node replacing on Shift; no option, nothing
  removed, `node-click` still fires. Ctrl adds on Windows and Linux, Meta on macOS (Ctrl-click is
  the macOS context-menu gesture). A Shift-drag still drags.
- (2026-10-10) **A distance per neighbor is the element's fact, never the app's.** The 2- and
  3-hop list reads `selection.nodes` sorted by name; splitting it by the 1-hop page would be a
  neighbor lookup in the app (forbidden). Additive `depth` option and `hops` field instead.

- (2026-10-10) **Round 2 decisions I build to (from round 2's decisions.md).** One change per
  confirmed problem, in its owning package (graph facts in the element, shared controls in
  compact-mantine, words and arrangement in the app); no feature moves; no second door where one
  is being measured (so no column rows in plain search, no find-box door to paths, "+" opening a
  value picker held); words at rest only go down. Rejected: an opt-in `bareNumbers` flag (a
  capability, not a choice, so it waits for the owner as a breaking change); matching file names
  in the app to detect a repeat Add (guessing what the element reports).

- (2026-10-10) **A heading that splits a panel into two scopes is a `ControlSection`, not a
  `DataRowHeader`.** `DataRowHeader` is a column caption: same inset and size as row labels, empty
  trailing edge, so on its own above value rows it reads as a row whose value is missing (T17B
  re-pilot: "77" read as the count still drawn). Use it only over a run that has a unit or column
  to caption (Largest 10, Selection | Graph); a change of scope gets a section heading.

- (2026-10-10) **A command with nothing to do is disabled and says why, in its tooltip.** Filter to
  neighbors stays a command (round 2: a toggle confused on and off with the step's own checkbox),
  but when its step is already on at this reach a press changed nothing and said nothing. Disabled
  by `data-disabled` and `aria-disabled`, not `disabled`, so Mantine's tooltip still opens on hover
  (the TopBar Export and toolbar pattern); the click handler returns early. Only the exact reach
  disables it: at another reach a press moves the one step there, which is a change.

- (2026-10-10) **A notice that describes the selection ends with it, by a flag on the notice.** Not
  by matching its words and not by a second notice slot: one optional field, set by the one
  command whose words describe the selection, read by the listener that already announces
  selections. A notice about anything else is not taken down by a selection.

- (2026-10-10) **A scrolling pane with a header row reserves its gutter** (`scrollbar-gutter:
stable`), rather than moving the header out of the pane: one CSS line, and the Add and Replace
  pages share the pane. Costs 15 px of table width when nothing overflows.
- (2026-10-10) **One focus request for a find pick, not one per kind.** The pick sets it, and
  whichever view the selection draws (node or edge) takes it once; a second flag per kind would
  let a stale node request fire on a later node view. The edge view consumes it only once the
  edge record exists, so an early render with no record does not swallow it.

- (2026-10-10) **A repeated announcement is keyed in the store, not by clearing the region.**
  The counter sits in `store.set`, the one place every writer goes through, so no caller changes;
  a cleared-then-refilled region needs a timer between the two writes or the screen reader sees
  no change. All writers are event-driven (selection, load, run end, filter step, note), so a
  repeat is always a new event worth speaking. The live region itself stays mounted (only its
  child is replaced): a region inserted already filled is often not read.

- (2026-10-10) **Scope words follow the drawn count, read from the element.** `rowName` compares
  `stale.ranOn` with `visibility.summary.visibleNodes` (equal: plain) and `totalNodes` (equal:
  ", full graph"), else "on N nodes". The decision assumed the rest and edge screens would go
  plain; they do not: team.csv adds 12 nodes, so PageRank ran on 20 of 32, and a filter is on.
  The two extra cuts that cover it are redundancy only: a merged highlight's title repeated its
  one row, and the Overview sentence restated what "showing" already set apart. Not cut: "Color:",
  "Summary", "Edge", "4 hops" (each decided or consistent across inspectors).
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
- (2026-10-10, condensed) **Hops/Follow focus:** `NeighborList` remounts on reselect, so the
  control's `onChange` sets `refocusControl` and the effect focuses that group's checked radio
  (`CSS.escape` the ids). **Bar 10** skips VisuallyHidden lines and counts a title cut while its id
  row shows it whole as readable. **Filter to neighbors is a command, not a toggle:** a second press
  lost the step; one place turns a step off (its checkbox); one step per center, moved by a press at
  other hops (the element's `visibility.setSteps` does it all).
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

- (2026-10-09, summarized) **Audit and round-2 method:** audits walk screens by script at both
  sizes (`round-2/expert/engineer/audit.sh`, `audit2.sh`) so the next round compares the same
  screens; measure first (tool, bar scripts, detour walks) before any session; no new words at
  rest. **Label picks** are an opt-in per-layer style field resolved in `pickNodeId` (click, hover,
  drag and `elementAt` agree), recorded under "decided by the team".

- (2026-10-09, summarized) **Smaller standing facts:** the path's Weight list starts on the loaded
  weight; a live region is in the page before its words arrive (`Frame.tsx`); the selection halo
  draws only back faces (`createOverlaySource`); ", out of date" only on `data-changed`; the
  Filters step editor is a `<form>` (`focusNext`/`focusStep`).
- (2026-10-09, summarized 2026-10-10) **Standing calls from 10-09:** the neighbor list opens at
  the ON filter step's depth (an off step is the reader's choice); sentence headings wrap by
  per-section `wrapLabel` opt-in; every control but a link shows the arrow cursor (compact-mantine
  `00-foundation.css.ts`); the chosen segment's inverse fill was undone on 10-10 (below); a start-screen data file goes through the Data page; a
  pointer-opened menu focuses the menu; one neighborhood filter per center; no forced focus ring
  after a pointer click; a study tool that hides what a person saw is fixed in the tool, not the
  app (never lengthen `NOTICE_MS` for it); `OptionsForm` passes no value at a run setting's
  default; a heading's count must be checkable beside it; vertical lists use `scrollbars="y"` and
  `EllipsizedName`; reopen is a fresh fit (camera unsaved, owner door); an Add counts what it adds;
  bar scripts measure in the participant's own `real.mjs` session, each move with an `--expect`.

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

## Thinking

- (2026-10-10) Round 2's study leak biases one way: a problem found anyway is solid, a route that
  worked proves little. So treat every round 2 "pass" on a new route as unmeasured, and every
  confirmed failure as real.
- (2026-10-10) Prompts shape behavior: "stand out" produced the whole styling detour. When a
  finding traces to the prompt's own words, fix the prompt, not the app.
- (2026-10-10) The simulation understates costs a person pays (typing a backtick, guessing Replace
  is "replace"); weigh those findings up, not down.

## Tried: worked / did not work

- (2026-10-10) **Round 3 audit method.** Worked: every walk as one data line (`engineer/walks.txt`:
  name|start|step|step...) read by an inline loop in one background Bash command, each walk its own
  session folder calling real.mjs directly; all 34 walks queued at once and waited on the shared
  slots (other agents held all four for about 20 minutes). Did not work: `--click "weight#1"` with
  the list open (refused as ambiguous: use `role=option:weight`), `--click "Graph"` (rail button and
  heading share it), plain `--rclick` on a source row (row and heading share the name: `#1`). Sources
  has no Add control; Control+O with the loaded file reaches "Add to <graph>". A hover right after
  the click that disabled a button reads `tooltip: null`; hover elsewhere, then back.
- (2026-10-10, condensed) **Real.mjs and probe lessons.** A missed notice did not reproduce by
  route (11 walks); probing worked: copy the frozen build, `chmod -R u+w`, add `console.error`
  probes in the bundle (real.mjs prints them with page times). Read the pilot agent's own commands
  in `.claudehistory/.../agent-*.jsonl` before trusting a triage row's route. `--hover` right after
  `--click` on the same button gives `tooltip: null`; hover elsewhere first. A click on an
  `aria-disabled` button is refused ("element is not enabled"). Escape in the find box only empties
  it; put a clear and a new selection in one `--step` (a 6 s wait proves nothing about a notice).
  Focus tests: `userEvent.click(document.body)`, not `document.body.focus()`.
- (2026-10-10, condensed) **Test lessons.** Headless vitest Chromium hides scrollbars, so assert
  computed `scrollbar-gutter` and measure on real.mjs shots. Test rings load directed (" -> "
  joiner). Use `MutationObserver.takeRecords()` before `disconnect()`; `textContent?.trim()` in the
  tool's observer (a document record has null text). Read the failure screenshot before changing
  code.
- (2026-10-10) Worked: real.mjs runs need no helper and no `rm -rf` (the safety check refuses a
  variable path); pick a fresh session folder. With all four browser slots held by others,
  `--start` waits ("waiting for a free browser slot"); it is not hung.

- (2026-10-10) Did not work: `npm run build` while another agent's untracked
  `graphty/src/zz-probe/` test broke `tsc`; worked: `npx vite build --outDir tmp/<task>/dist`
  and `bars.mjs --dist` on it. Did not work: trusting the decision's word arithmetic -- measure
  first; the screens' filters and added tables decide which scope words show.
- (2026-10-10) Worked: proving the rule-name test fails by disabling the branch (`&& false`)
  gave "expected [ '2 edges' ] to deeply equal [ 'minutes >= `10`' ]". Did not work at first: a
  rule typed with backticks gets no option row under the box (only "Rule: press Enter to select
  matches"), so the test waits for that line, not an option.
- (2026-10-10) Worked: a real-element test with real typing for every path a unit adds. The
  backtick-typed condition failed only there (edge column counted as a node scope). Did not work:
  running vitest while another agent rebuilt the shared dists (graph-io chunks missing, "Failed to
  import test file"); wait until its `nx run graphty:build` exits, then rerun.
- (2026-10-10) Resuming after an interrupted session: check `git log`, the round folder and
  `tmp/<session>/` before redoing a task (focus-after-actions was already on the branch, 7f61a2ab2).
- (2026-10-10) Did not work: running `bars.mjs` on `graphty/dist` of the shared worktree; another
  agent rebuilt it mid-run (ENOENT on index.html). Copy the dist into the task folder and pass
  `--dist`. Seen, not mine: tier 1's "a node's Values with its neighbors" step misses (click on
  "Degree" times out) on 7fe0a48412cc.
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

- (2026-10-06 to 10-09, summarized 2026-10-10) **Older tool, test and worktree lessons.** Never
  edit a running script (copy it); read script output, not exit codes; step N lands in screenshot
  N+1; read `setup.log` after `--start`; pilot on a copied dist; `--sr` tells "not focused" from
  "focused, no ring"; hover tooltips need `{ timeout: 3000 }`; `pgrep -f` matches itself. Where
  text is drawn: a Range over the contents; a point on a name: walk up from `nodeScreenPosition`
  past its `radius` to the first `elementAt` hit. Probe computed CSS under `with-browser.sh` before
  a CSS fix; prove "nothing follows" by spying, never a sleep; a second test load needs `{ mode:
"merge" }`. Shared worktree: stage only my hunks (`git apply --cached` or `update-index
--cacheinfo`), commit as soon as they pass (`17bf87085` swept mine), never commit `api:report`
  wholesale, wait for a clean `tsc`; read a file before opening it for write. Builds:
  `NODE_OPTIONS=--max-old-space-size=8192`. Element facts: a `Run` is thenable; per-node values via
  `data.nodePage({ columns: [runId] })`; `selection.apply` throws synchronously on a bad selector;
  `data.name()` returns the id until `knownFields.nodeLabelPath` is set.

## Sources

- Digests in `design/ui/studio/digests/` (`tier1.md`, `decisions.md`, `study-rounds.md`,
  `owner-voice.md`, `framework.md`); repository `CLAUDE.md`; `design/ui/studio/tool/README.md`.
- Tier 1 design and plan on branch `feat/tier1-real-app` under `design/ui/tier1-real-app/`.
- App comments citing element issues: grep `#[0-9]{3,4}` under `graphty/src/`.
- Owner memory notes (do not blame timing; cap workflow browsers; the image model only transcribes).
