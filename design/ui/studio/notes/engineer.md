# Design Engineer -- designer's notes

Role: I build what the studio decides, in the graphty app (`graphty/src/workspace/`) and in
graphty-element, small and in the right package, and say what the element's API can do today. I
read this file first every session and update it as I decide and learn.

Words: "the app" is the graphty app; "the element" is graphty-element; "tier 1" is a first-time
user's core path (open, read, analyze, color or size by a result, names, find a node and its
neighbors, export, save and reopen); "the walk" chains it end to end as the build's acceptance
test. "The studio worktree" is `.worktrees/design-studio-tier1` (branch `design/studio-tier1`).

## Top of mind

- (2026-10-11) **Round 4 closed: 53 of 53 valid sessions succeeded; bars 9 (b) and 10 fail.** Bar 10
  on two confirmed severity 3s: drawn names and nodes covering ties and dots (element, owner's
  list, not mine in the app) and the find box offering "=`10`" for a bare number and then refusing
  it. Shift-click carried T24 from 2 of 4 to 7 of 7. Three sessions void (runner start on a full
  browser slot); the briefings' file table leaked answers.
- (2026-10-11) **Round 4 critique, six changes proposed, each with its mechanism read in source:**
  (1) element `suggestBackticks` (`session/styles/predicate.ts`) offers a rewrite that only
  parses; a lone literal parses but is no rule, so suggest only a rewrite the rule check accepts.
  (2) element find: an "or more" answer for a typed number inside a quantitative column's range
  that is not a value (additive field), so bus stops' "10" gets "minutes is 10 or more".
  (3) app `FindBox.tsx`: Values section before the record sections when the text is a number.
  (4) element `atLeastOf` (`session/query.ts`) writes `data.minutes`; write the bare name as the
  app's `columnText` does (unreleased field, 9b69ca650 is only on the studio branch: not breaking).
  (5) app `TableDock.tsx:349` reads scope "graph"; the element already offers `scope: "visible"`,
  so the table lists what the drawing keeps, count "12 of 41 edges" only while they differ.
  (6) app `Filters.tsx`: the leave path's `unchanged` needs `step.on === true` (line 444), so
  leaving an off step's editor turns it on; script it first, then compare rules alone on leave.
- (2026-10-11) **Not to change after round 4:** Shift-click, toolbar Filters door, Replace place,
  scope words, names off in setups, T18 (8 against 8: no new step there), second path replacing
  the first (no task needs both; decided), any label placement in the app.
- (2026-10-11) **Script first, from round 4:** New project then Discard showing the error page; a
  rule on a missing column answering only "Nothing matches" (element has `E_UNKNOWN_ATTRIBUTE`;
  a coded fact would let the app say the column is missing); the edge inspector's 29 words (find
  which two to cut with `bars.mjs` before cutting).
- (2026-10-11) **Watch in round 5:** T22 A on bus stops typing "10" (the prompt's own number);
  T17 with the table open under a step; the owed re-runs r4-s05b, s20b, s28b.
- (2026-10-11) **One variant per problem, one change per task's route.** Words at rest never rise.
- (2026-10-11) **Held, first in line:** distance per name at Hops 2/3 (element `depth` option and
  `hops` per `Neighbor`, additive); "4 hops" vs "5 nodes, 4 edges" (sev 1); `nodesInRect(..., {
  labels: true })`; a second Find path replacing the first.
- (2026-10-10) **Not mine to fix in the app, ever:** drawn names covering names and ties, sized
  nodes inside each other (element label placement and layout spacing, owner's list); bare
  numbers in rules, backticks, what an edge width measures (breaking, owner's list).
- (2026-10-11) **A one-specialist claim is scripted on the frozen build before any fix;** not
  reproduced means closed as not shown. Reading the mechanism in source does not replace the script.
- (2026-10-10) **OPEN, not reproduced:** a reopen from Recent projects once drew no "Opened
  friends" (`tmp/r3-dry1-reopen-shows-opened-notice/`). No code without a mechanism.
- (2026-10-10) **Still open from audits:** Escape does nothing on the Data pages; two-table source
  has no actions and no reason; "Edit source..." lands on "Replace: ..."; neighbor Back row scrolls
  the inspector sideways; path popover covers the nodes it asks for; 900 x 700 canvas is 363 px;
  Delete does nothing on a step; Analyze box jumps as the list narrows.
- (2026-10-11) **Pilot on a copied `graphty/dist`** (REAL_DIST at the copy); real.mjs cannot
  click aria-disabled buttons (prove with `--key Enter` or a real-element test).

## Decisions and reasons

- (2026-10-11) Built for round 4 (all walked on fresh builds, evidence `tmp/t2r3-r4-*/`,
  `tmp/r4-dry1-*/`): Shift-click adds (element `SelectionManager.add`), Made with after Undo, two
  focus drops, find-box "or more" (`FindValueRow.atLeast`), Analyze name matches first, toolbar
  Filters, repeated-ties warning in Load's description, filter step counts edges, disabled submit
  says what is missing, "Distribution" heading.
- (2026-10-11) **The table follows the drawing, by the element's own scope.** Reason: under a filter
  step the table listed 41 edges beside "12 of 41" everywhere else (r4-s27, s21); the element
  already has `scope: "visible"`, so the app needs no computing, only the scope it asks for.

- (2026-10-11) **Round 3 decisions I build to:** study fixed first (gate and T24 key before any
  session); one variant per problem; every fix in its owning package; words at rest do not rise;
  a claim only one specialist made is scripted before it is fixed. Not changed: Replace's place
  and out-of-date marks (8 of 8), the weight's meaning at load, Recent in Analyze, the find box's
  example rule, names not drawn by default (the app's consumer choice), "PageRank, full graph"
  under a filter. Reason: each was read right by every session that met it.
- (2026-10-11, condensed from Top of mind) Distribution heading: `RunValues.tsx`, section is a
  `role="group"` (ControlSection). Disabled step-editor submit: Tooltip plus aria-disabled,
  `commit()` returns on incomplete or unchanged; Attribute not prefilled. Toolbar Filters:
  command `filters.open`, new step autofocuses Keep (d2280466e). Filter step over an edge column:
  row "20 to 19 nodes, 41 to 12 edges", counts are the element's `plan` steps; compact-mantine
  Tree wraps a visible description. "Or more" in find box: 9b69ca650.

- (2026-10-11) Heading a histogram and its range "Distribution": a heading that repeats its tab's
  name tells the reader nothing, and "distribution" is the standard word for that pair.
- (2026-10-11) Still open from the round 3 critique: element `depth` on `data.neighbors` and `hops`
  on each `Neighbor`, then the app shows each name's hops (Shift-click, "or more", Analyze name
  matches and the toolbar Filters tool are built).
- (2026-10-10) **Owner decision: the chosen segment keeps Figma's face, never an inverse fill.**
  Dark #2c2c2c face, 1px #444 edge on #383838; light white face, 1px #e6e6e6 edge on #f5f5f5;
  `highContrast` gives a 3:1 edge. See `owner-decisions.md`.
- (2026-10-09) Script before calling it a defect (two round 2 "app faults" were the study tool's
  click by name landing on a same-named control); every study-tool change gets a planted-failure
  check.
- (2026-10-10) **Typed filter: the badge stays on a marked entry, never moves to an unmarked first
  result.** "Start here" is the studio's recommendation; drawing it on Betweenness because "brokers"
  found it would invent a recommendation. So "brokers" shows no badge, "linked" one (Shortest
  path). Nothing is hidden: description-only matches stay listed after the name matches, because
  hiding them would stop line words finding anything once any name matched.
- (2026-10-10) **Bar 9's data names are matched as written; ids and values stay case-blind.** The
  column "weight" and the app's "Weight" label differ only in case, and the label is the app's word.
  Known ceiling: an app word spelled exactly like a data name ("Loaded weight") is left out too.
  Result columns ("PageRank") count: their names are the app's or the catalog's, not the file's.
  The limits were re-measured on round 1's build rather than kept, so every round is counted by one
  rule. The axe exception is code, not a note: excused only while the scroll check holds and only
  on the find list's viewport, so a regression in the list's scrolling brings the hit back.
- (2026-10-10) **A warning that changes what Load does is part of Load's description, and the
  warning glyph marks it.** One `aria-describedby` list built from the ids that show (blocked
  reason, repeats), so a screen reader on Load hears why the button may surprise; the glyph is
  `aria-hidden` (the sentence carries the meaning). Replace is not promoted: Load adding a second
  copy is a legitimate choice, and the round measures the words and mark alone.
- (2026-10-10) **"Or more" counts both kinds of a column, because the rule does.** The target is
  the rule text, not an id list, so it reads every node and edge with that column; counting only
  the row's kind would let `count` and `selection.count(target)` disagree when nodes and edges
  share a column name. A value row stays one kind (its exact target is ids of that kind). Rule
  written with `quotePath(path)` and the number as a JSON literal in backticks; non-finite numbers
  get no `atLeast`. The scope input is carried on `SearchRequest.scopeInput` so a scoped find's
  rule is scoped too. API report updated (index and session entries): additive.
- (2026-10-10, condensed 2026-10-11) **Element calls, round 4.** A run's `params`/`seed` read the
  held record history put back, and `rerun()` adopts them (not breaking: documented as "the
  current execution's"). Shift-click on a node adds through a new `SelectionManager.add(node)`
  (additive; edge clicks already did; Shift only; XR `select()` still replaces). A distance per
  neighbor is the element's fact: additive `depth` option and `hops` field, never split in the app.

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

- (2026-10-10, condensed) **A selection notice ends with the selection** by one flag on the
  notice, never by matching words. **A scrolling pane with a header row reserves its gutter**
  (`scrollbar-gutter: stable`, 15 px). **One focus request per find pick**, taken once by whichever
  view (node or edge) draws, the edge view only once its record exists.

- (2026-10-10, condensed) **Announcements, scope words.** A repeated announcement is keyed by a
  counter in `store.set` (no clear-then-refill timer; the live region stays mounted). Scope words
  follow the element's drawn count (`stale.ranOn` against `visibility.summary` visible and total
  nodes): plain, ", full graph", else "on N nodes".
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
- (2026-10-10, condensed) **Keep `selection.count`** (a rule over an edge column counted 0 as a
  node scope; "what would Enter select" is the element's question). **Leaving the step editor
  saves** a whole, changed rule on blur or unmount (one `keep` ref against double writes); an
  incomplete rule waits as the "+" draft.
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

- (2026-10-09, summarized 2026-10-10) **Standing calls from 10-09:** path Weight list starts on the loaded weight; live regions
  exist before their words; the halo draws back faces only; the neighbor list opens at
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

- (2026-10-10) The dry run must walk what participants do, not last round's list: 12 of about 30
  build faults sat on the one detour nobody walked (styling a selection). Pilot each task on the
  candidate build, script the routes, keyboard-press every control, and fix before freeze.
- (2026-10-10) Round 2's study leak biases one way: a problem found anyway is solid, a route that
  worked proves little. So treat every round 2 "pass" on a new route as unmeasured, and every
  confirmed failure as real.
- (2026-10-10) Prompts shape behavior: "stand out" produced the whole styling detour. When a
  finding traces to the prompt's own words, fix the prompt, not the app.
- (2026-10-10) The simulation understates costs a person pays (typing a backtick, guessing Replace
  is "replace"); weigh those findings up, not down.

## Tried: worked / did not work

- (2026-10-11) Worked: reading each round 4 finding's mechanism in source before proposing a fix
  (grep the refusal reason, the leave handler's `unchanged`, the table's scope). Two of six fixes
  turned out to be one word or one condition because the element already had the capability.

- (2026-10-11) **Audit without a wrapper script worked:** one Bash call per walk, each line a
  direct `node real.mjs --step <own folder> ...` with output to `<walk>.log`, run in the background
  (four machine slots were mostly taken by other experts; each start waited, none failed); a later
  batch chained behind the earlier with `until grep -q "session ended" <log>`. Names that changed
  since round 3: "Save and turn on" is "Save step"; "Graph" and "Data" need `role=button:`; the find
  list's lower rows need `--wheel x,y,800` before a screenshot shows them; `--hover-at` on a tree
  row's icon prints its accessible name and tooltip (how the "out of date" name was found).

- (2026-10-11) Worked: copying `graphty/dist` into the session folder and pointing REAL_DIST at
  the copy, so another agent's rebuild cannot swap the app mid-pilot; delete the copy after
  `--end`. The start queued for a browser slot and then ran; no wrapper around real.mjs needed.
- (2026-10-11) Worked: wrapping the Tree description in compact-mantine (`overflow-wrap:
anywhere`, row `height: auto; min-height: 44px; padding-block: 6px`, pill and ring `bottom:
4px`). One-line rows look the same (44). Did not do: no-break spaces inside each count phrase so
  "41 to 12" and "edges" stay together; the wrap puts "edges" alone on a third line, which reads
  fine and the acceptance allows.

- (2026-10-11) **real.mjs cannot click an aria-disabled button.** Its click is Playwright's, which
  waits for an "enabled" element and treats aria-disabled as disabled, so `--click "Add step"` on
  the disabled button only retries. A person's click goes through. What worked: prove "a press adds
  nothing" in the real-element test (`Filters.real-element.test.tsx`, toolbar test, user-event
  click), and in real.mjs with `--key Enter` in the empty Value box (`06.png`: no step).
- (2026-10-11) **Shared files in a shared worktree.** Stage only my hunks (HEAD plus my edits as a
  blob, `git update-index --cacheinfo`). Another agent's commit can sweep up my uncommitted edits
  to a shared file: a test in 115bc0aa4, answer key lines in c9f2ceed3. Commit shared edits
  (`answers.md`, shared tests) as soon as they are made.

- (2026-10-10, summarized 2026-10-11) **Focus and description proofs.** Focus after a pointer
  click draws no ring: `--key ArrowDown` opens a focused Mantine Select (`tmp/t2r3-r4-09/fresh/04.png`).
  Toolbar real-element tests go inside the describe that sets 1366 x 768. A module-level focus ask
  consumed by a component about to remount is re-armed in a layout cleanup. Analyze rows: `--click
role=button:Analyze`, type, ArrowDowns, Enter, then `--expect role=button:<name>`; `--click` is
  refused under `--sr`. "Add to <graph>": `--key Control+k`, type "Add data", Enter. Descriptions:
  `--expect "described=<text>"` (CDP AX description); reach the control by Tab to hear what a
  keyboard user hears. A new tool check goes in `measure.mjs` with a planted case and a browser test.
- (2026-10-10, summarized) **Smaller lessons from 10-10.** Lint wants a test key like
  `shared_chapters` as `const WEIGHT = "shared_chapters"` and `[WEIGHT]:`. Shift-add needed
  `selection.size` from the session (the manager's own index skipped a click). Audit walks: one
  data line per walk, each its own real.mjs session; names collide (`role=option:weight`,
  "Graph" is rail button and heading). Probing a frozen build: copy it, `chmod -R u+w`, add
  `console.error` probes; read the pilot's own commands in `.claudehistory` before trusting a
  route; `--hover` right after `--click` gives `tooltip: null`; a click on `aria-disabled` is
  refused; Escape in the find box only empties it. Tests: headless vitest hides scrollbars (assert
  computed `scrollbar-gutter`); `MutationObserver.takeRecords()` before `disconnect()`; read the
  failure screenshot first; a real-element test with real typing for every path a unit adds;
  anchor scripted edits on a line unique to the test; prove a test fails without the change
  (`git show HEAD:<file>` beside it). real.mjs needs no helper; `--start` waits for a free slot,
  not hung. Another agent's rebuild breaks tsc, vitest and `bars.mjs` mid-run: copy the dist or
  rerun. Resuming after an interruption: check `git log`, the round folder and `tmp/<task>/` first.
  Script a finding on the frozen build before reading the suspect code.

- (2026-10-09, summarized 2026-10-10) **Probes before code.** Subagent logs:
  `~/.claude/projects/<proj>/<session>/subagents/workflows/wf_*/agent-*.jsonl`. Axe probe as a
  throwaway compact-mantine test before CSS. Pixel checks from public API only
  (`element.captureScreenshot` at a `nodeScreenPosition`). Print the element's report before coding
  to place a defect. App real-element tests: `--project=real-element`. Critique: `insights.md`
  section 2 first. Seen, not mine: `bars.mjs` misses "a node's Values with its neighbors".

- (2026-10-06 to 10-09, summarized again 2026-10-10) **Older tool, test and worktree lessons.**
  Copy a script before editing it while it runs; read output, not exit codes; step N lands in
  screenshot N+1; read `setup.log` after `--start`; pilot on a copied dist; prove "nothing
  follows" by spying, never a sleep. Shared worktree: stage only my files or hunks, commit as soon
  as they pass, regenerate `api:report` and commit only its lines for my change. Builds need
  `NODE_OPTIONS=--max-old-space-size=8192`. Element facts: a `Run` is thenable; per-node values via
  `data.nodePage({ columns: [runId] })`; `data.name()` returns the id until
  `knownFields.nodeLabelPath` is set.

## Sources

- Digests in `design/ui/studio/digests/` (`tier1.md`, `decisions.md`, `study-rounds.md`,
  `owner-voice.md`, `framework.md`); repository `CLAUDE.md`; `design/ui/studio/tool/README.md`.
- Tier 1 design and plan on branch `feat/tier1-real-app` under `design/ui/tier1-real-app/`.
- App comments citing element issues: grep `#[0-9]{3,4}` under `graphty/src/`.
- Owner memory notes (do not blame timing; cap workflow browsers; the image model only transcribes).
