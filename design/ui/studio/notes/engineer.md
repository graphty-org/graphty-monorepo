# Design Engineer -- designer's notes

Role: I build what the studio decides, in the graphty app (`graphty/src/workspace/`) and in
graphty-element, small and in the right package, and say what the element's API can do today. I
read this file first every session and update it as I decide and learn.

Words: "the app" is the graphty app; "the element" is graphty-element; "tier 1" is a first-time
user's core path (open, read, analyze, color or size by a result, names, find a node and its
neighbors, export, save and reopen); "the walk" chains it end to end as the build's acceptance
test. "The studio worktree" is `.worktrees/design-studio-tier1` (branch `design/studio-tier1`).

## Top of mind

- (2026-10-10) **A filter step over an edge column counts edges: built** (app only, 8ab196fb3).
  Scripted on 26f3bb968 first: friends, "weight is at least 3" read "20 to 20 nodes" on its row
  and "20 of 20 nodes" on the chip while the element's Overview said "Edges showing 20 of 41"
  (`tmp/t2r3-r4-11/frozen/05.png`). The element already counts both (`plan` steps effect has
  `edges`; `visibility.summary` has `visibleEdges`/`totalEdges`), so no element change. Row uses
  edges for a step whose rule has `nodes: "ends"`; the chip uses edges only while EVERY step that
  is on is such a step (a mixed set stays in nodes, since node steps change what the chip is
  for). Status line unchanged (it names both). Fresh build: "41 to 20 edges", chip "20 of 41
  edges", Overview agrees; unticked, chip goes, row "off" (`tmp/t2r3-r4-11/fresh/04.png`,
  `05.png`). Same word count. **The T17A answer key's "19 of 20 nodes" / "20 to 19 nodes" become
  "12 of 41 edges" / "41 to 12 edges" on the next build** -- re-record it before round 4 freezes.
- (2026-10-10) **The Add page's repeated-ties line now reads as a warning and describes Load:
  built** (app only). The line carries the danger-colored warning glyph (as an unmatched table's
  check does), its text has id `dp-repeats`, and Load's `aria-describedby` lists it beside
  `dp-load-reason`. Words unchanged; Replace stays a default button. Fresh build, friends ranked,
  Add friends-v2.csv: glyph shown, `--expect "described=41 edges in this file..."` passes; Add
  trails.csv (no repeats): Load described as "" (`tmp/t2r3-r4-10/fresh/11.png`, `12.png`, `17.png`).
- (2026-10-10) **A pressed "Filter to neighbors" already gives a screen reader its reason: nothing
  built.** On 26f3bb968, keyboard focus on it reads the description "The drawing already shows
  only this neighborhood. Its step in Filters turns it off" at once, and still after Enter
  presses it (compact-mantine's Tooltip opens on focus; Mantine sets aria-describedby while open,
  and the dismissed-on-key tooltip is only hidden, so the description stays). A pointer press
  gets it after the 1 s hover delay. New tool check: `--expect "described=<text>"` reads the
  focused control's accessible description (`tmp/t2r3-r4-12/frozen/`: 06 and 09 fail as planted,
  10-14 pass). Still open from the audit: the hidden tooltip after a pointer press (visual only)
  and the disabled look like an empty text field.
- (2026-10-10) **"Or more" beside a typed number in the find box: built** (commit 9b69ca650).
  Element: `FindValueRow.atLeast: { count, target }` on a number value, target the typed rule
  `{ text: "=data.<col> >= \`N\`" }` (with the find's scope). App: a second row "<column> is N
  or more (count)"; visible rows drop "Select where", accessible names keep it. Fresh build, Les
  Miserables, "10": rows "shared_chapters is 10 (2)" and "... 10 or more (13)", neither cut;
  picking it selects the 13 ties the file holds at 10 or more (`tmp/t2r3-r4-07/lesmis/03.png`,
  `04.png`). Bars on that build (`tmp/t2r3-r4-07/bars/`): bar 10 no cut text anywhere, find box
  included; words at rest identical to round 3 (42; tier 2 screens 49/61/33/31). It exits 1 on two
  items ALSO failing on round 3's build: axe `scrollable-region-focusable` on the find list's
  ScrollArea viewport (Mantine viewport has no tabindex; the list is driven by
  aria-activedescendant, so the fix is in compact-mantine, not done here) and the edge inspector's
  31 of 30 words.
- (2026-10-10) **After Undo of a re-run, Made with now shows the run on screen: built** in
  graphty-element. Cause was the element, not the app's draft: `Run.params`/`seed` read the
  handle's own definition, while undo swapped only the `runs` entry. Scripted on 26f3bb968
  (`tmp/t2r3-r4-05/repro-26f3/09.png`: route Depot, Station, Stadium; Made with Market, Station);
  fixed build reads Depot, Stadium after Undo and Market, Station after Redo
  (`tmp/t2r3-r4-05/fixed/`).
- (2026-10-10) **Shift-click on a node adds: built** in graphty-element (`SelectionManager.add`,
  called from `NodeBehavior.handleClick` on Shift). Shift only -- Ctrl and Meta stay out (macOS
  Ctrl-click is the context menu). Checked on a fresh build: Gus then Shift Ivan reads Selection
  2, a plain click on Theo reads 1 (`design/ui/studio/tmp/t2r3-r4-03/`).
- (2026-10-10) **Round 3 critique: five smallest changes, in order.** (1) Shift-click on a node
  adds (built). (2) "Or more" beside a typed number (built, top bullet; rows not under a heading:
  the visible "Select where" was simply dropped). (3) Analyze filter puts name matches first,
  app-only in `analyze/words.ts`. (4) Element adds `depth` to `data.neighbors` and `hops` to each
  `Neighbor`; the app shows each name's hops. (5) A Filter button on the Graph toolbar opening the
  Data place's Filters (5 of 8 T17 looked there first).
- (2026-10-10) **Hold still in round 4:** second Find path replacing the first, "Select endpoints"
  in "..." (confounded with Shift-click), the "=" hint and backtick wording (measure "or more"
  alone), round 2's routes (now passing clean), label and node overlap (element, owner's list).
- (2026-10-10) **Round 3 screenshot audit done: 38 findings, 0 at severity 4, 2 at 3 (both
  element label placement), 12 at 2.** `tier2/rounds/round-3/expert/engineer.md`. New this round
  and mine to fix in the app: the disabled "Filter to neighbors" shows no reason to the person who
  just pressed it (tooltip opens on pointer entry only) and looks like an empty text field
  (compact-mantine's disabled Button); the repeated-ties warning (built 10-10, top bullet); Escape does nothing on the Data pages. New for the element: sized nodes drawn
  inside each other (layout spaces centers, not sizes) -- the cause under "Farah under Chloe".
- (2026-10-10) **The dry run must walk what participants do, not last round's list.** 12 of about
  30 build faults sat on the one detour nobody walked (styling a selection). Round 3: two
  throwaway pilots per task on the candidate build, script their routes, walk them plus round 2's
  detours, keyboard-press every control on each screen, and FIX before freeze -- never hand a
  found fault to a later pass (the find box's second Escape slipped through that way).
- (2026-10-10, condensed) **Round 3 changes were measured in round 3; edge inspector words 31 of
  30 still OPEN. Round 2's new routes (weight meaning at load, Replace in "...", rule hint) count
  only once a clean round re-measures them; do not reword or move them meanwhile.**
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
- (2026-10-10) **A run reports the parameters of the execution history put back.** `params` and
  `seed` read the held record when one is shown (as `caveats`, `fields`, `status` already did);
  `rerun()` adopts them before executing, and RunsApi's stored re-run command follows the restored
  entry, so Rerun after Undo computes and records what Made with shows. Not breaking: `params` is
  documented as "the parameters the current execution uses". The app's draft was not involved
  (the second path came from Find path, not Made with), so no app change.
- (2026-10-10) **Shift-click on a node adding is a defect fix; its one API change is additive.**
  The edge click already adds on Shift; nothing documents a node replacing on Shift; `node-click`
  still fires; a Shift-drag still drags; XR `select()` still replaces (no pointer event). Shift
  only, per owner-decisions.md. Routed through a new `SelectionManager.add(node)` rather than
  `session.selection.applyNow` straight from NodeBehavior: the context only exposes the public
  `GraphSession` (no `applyNow`, and its `apply` is async with cause "api"), and bypassing the
  manager would leave its index stale.
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

- (2026-10-10) Round 2's study leak biases one way: a problem found anyway is solid, a route that
  worked proves little. So treat every round 2 "pass" on a new route as unmeasured, and every
  confirmed failure as real.
- (2026-10-10) Prompts shape behavior: "stand out" produced the whole styling detour. When a
  finding traces to the prompt's own words, fix the prompt, not the app.
- (2026-10-10) The simulation understates costs a person pays (typing a backtick, guessing Replace
  is "replace"); weigh those findings up, not down.

## Tried: worked / did not work

- (2026-10-10) **Reaching "Add to <graph>" in real.mjs.** Did not work: `--drop` on the Graph
  canvas (nothing takes it), `--click "Add data"` in the Data place (the Sources "+" is not
  rendered for a loaded project). Worked: `--key Control+k`, `--type "Add data"`, `--key Enter`,
  then `--click "choose a file..." --upload <file>`. Load takes focus on a clean file, so
  `--expect "described=..."` reads Load directly. Test of a description: resolve
  `aria-describedby` ids to text in the real-element test (no extra dependency).
- (2026-10-10) **Tried: checking an accessible description with `--expect` or `--sr`. Did not
  work:** neither read descriptions (`--sr`'s focus line is role, name, value, states). Worked:
  `--expect "described=<text>"` in real.mjs (CDP's AX node `description` of the focused control).
  A pointer click is not focus-visible, so Mantine's focus opening does not fire on it; to test
  what a keyboard user hears, reach the control by Tab or Shift+Tab.
- (2026-10-10) **Tried: test data keyed `shared_chapters` in an element unit test. Did not work
  as written:** lint's camelcase rule flags the key, prettier strips quotes, and a literal
  computed key trips no-useless-computed-key. Worked: a `const WEIGHT = "shared_chapters"` and
  `[WEIGHT]:`.
- (2026-10-10) **Tried: Shift-add through the session only. Did not work.** The manager's
  `select()` skipped a click on a node when its OWN index held one node, so click C, Shift A,
  click C left {A, C}. Fixed by counting `selection.size` from the session. The interaction test
  covers both (each half fails alone without its fix, checked by reverting).
- (2026-10-10, condensed) **Audit walks:** one data line per walk (`engineer/walks.txt`), each its
  own session calling real.mjs directly, all queued at once on the shared slots. Name collisions:
  `role=option:weight`, `"Source#1"`; "Graph" is both rail button and heading.
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

- (2026-10-10) **Shared-worktree builds:** another agent's rebuild breaks tsc, vitest imports and
  `bars.mjs` mid-run; copy the dist or rerun after their build exits. Measure word arithmetic on
  screen.
- (2026-10-10) Worked: scripting a finding on the frozen build before reading the suspect: the
  task blamed the app's draft, the script (Find path twice, Control+z) showed no draft was ever
  written. A failing element test first (`test/session/history/runs.test.ts`, 'n2' for 'n1').
- (2026-10-10, condensed) Prove a test fails without the change (`&& false`, or `git show
  HEAD:<file>` over the source, run, copy the new file back). A backtick-typed rule shows only
  "Rule: press Enter to select matches", no option row.
- (2026-10-10) Worked: a real-element test with real typing for every path a unit adds (the
  backtick-typed condition failed only there).
- (2026-10-10) Resuming after an interrupted session: check `git log`, the round folder and
  `tmp/<session>/` before redoing a task (focus-after-actions was already on the branch, 7f61a2ab2).
- (2026-10-10) Anchor scripted test edits on a line unique to the test (a shared line got the
  assertion in two tests).
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
