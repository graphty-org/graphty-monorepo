# Design Engineer -- designer's notes

Role: I build what the studio decides, in the graphty app (`graphty/src/workspace/`) and in
graphty-element, small and in the right package, and say what the element's API can do today. I
read this file first every session and update it as I decide and learn.

Words: "the app" is the graphty app; "the element" is graphty-element; "tier 1" is a first-time
user's core path (open, read, analyze, color or size by a result, names, find a node and its
neighbors, export, save and reopen); "the walk" chains it end to end as the build's acceptance
test. "The studio worktree" is `.worktrees/design-studio-tier1` (branch `design/studio-tier1`).

## Top of mind

- (2026-10-11) **The step editor's disabled submit says what is missing: built** (app only).
  "Add step" / "Save step" / "Save and turn on" use the Filter to neighbors pattern (Tooltip,
  aria-disabled, data-disabled; the click and Enter reach `commit()`, which returns on an
  incomplete or unchanged rule). Words in `filterWords.ts` `missingTip`: "Choose an attribute
  first", "Type a value first", "Select a node first", "Nothing changed since the last save".
  The Attribute is NOT prefilled from the Data page (left to the sessions). Fresh build:
  `tmp/r4-dry1-step-editor-reason/fresh/03.png` (toolbar tool, attribute tip), `06.png` (value
  tip, after Enter added nothing), `08.png` (valid rule added), `09.png` (same from "+").
- (2026-10-10) **A Filters tool on the canvas toolbar: built** (app only, commit d2280466e).
  Icon-only (ListFilter glyph), tooltip "Filters", after Table; command `filters.open` (group
  Data, disabled with nothing drawn) runs `openStepEditor(store, NEW)`, which already moves to
  the Data place. A new step's editor (`id === NEW`, from the toolbar or Filters' "+") now
  autofocuses Keep; Escape still returns focus to "+". No words at rest added. Fresh build:
  `tmp/t2r3-r4-09/fresh/01.png` (rest), `02.png` (tooltip), `03.png` (Data place, New filter
  step), `04.png` (ArrowDown opens Keep's list: focus is there). Round 4 should record T17's first
  moves against round 3 (5 of 8 looked on the Graph place first).
- (2026-10-10, condensed) **Built in the app, round 4:** Analyze ranks name and alias matches
  first within and across headings (key and technical name count as description-level; "Start
  here" only on a marked first result while filtering; `tmp/t2r3-r4-08/fresh/`). Two focus drops
  fixed: the swapped-in path form needs `autoFocus` (Mantine reads `data-autofocus` only on open),
  and `useFocusLine` re-asks in a layout cleanup when the Style tab remounts
  (`tmp/t2r3-r4-06/fresh/`). Escape on an inspector control clearing the selection is designed.
- (2026-10-10, condensed) **`bars.mjs` measures bars 8 and 9 as the criteria word them.** Bar 9
  leaves out the data's names (matched as written); round 1 / 2 / 3 rest screen 49 / 51 / 45, edge
  inspector 27 / 31 / 28 (one over). Bar 8 runs two focus actions proven on planted drops (both
  now fixed). The find list's axe `scrollable-region-focusable` is excused only while its scroll
  check holds (`tmp/t2r3-r4-04/`).
- (2026-10-10, condensed) **A filter step over an edge column counts edges: built** (8ab196fb3,
  app only; the element already counts edges). Row and chip read "41 to 20 edges" / "20 of 41
  edges" (`tmp/t2r3-r4-11/fresh/`). **Re-record the T17A answer key ("12 of 41 edges" / "41 to 12
  edges") before round 4 freezes.**
  Two tests still expect "8 to 5 nodes" / "8 to 4 nodes" (`Filters.real-element.test.tsx`,
  `FilterFocus.real-element.test.tsx`) and fail on this change: update them to the edge words.
- (2026-10-10, condensed) **Two screen-reader descriptions:** the Add page's repeated-ties line is
  now a warning (danger glyph, id `dp-repeats`) that Load's `aria-describedby` lists (built,
  `tmp/t2r3-r4-10/fresh/`); a pressed "Filter to neighbors" already reads its reason on keyboard
  focus (nothing built; `--expect "described=<text>"` added to real.mjs, `tmp/t2r3-r4-12/`). Still
  open: the hidden tooltip after a pointer press, and the disabled look like an empty field.
- (2026-10-10, condensed) **"Or more" in the find box: built** (9b69ca650). Element
  `FindValueRow.atLeast: { count, target }`; app row "<column> is N or more (count)"; Les
  Miserables "10" selects 13 ties (`tmp/t2r3-r4-07/`). Words at rest unchanged (42).
- (2026-10-10, condensed) **Built in graphty-element:** after Undo of a re-run, Made with shows
  the restored run (`Run.params`/`seed` read the handle, undo swapped only `runs`;
  `tmp/t2r3-r4-05/fixed/`); Shift-click on a node adds (`SelectionManager.add`; Shift only,
  macOS Ctrl-click is the context menu; `tmp/t2r3-r4-03/`).
- (2026-10-10, condensed) **Round 3 critique's five changes:** Shift-click adds, "or more", Analyze
  name matches first, and the toolbar Filters tool are built; still open: element `depth` on
  `data.neighbors` and `hops` on each `Neighbor`, then the app shows each name's hops.
- (2026-10-10) **Hold still in round 4:** second Find path replacing the first, "Select endpoints"
  in "..." (confounded with Shift-click), the "=" hint and backtick wording (measure "or more"
  alone), round 2's routes (now passing clean), label and node overlap (element, owner's list).
- (2026-10-10, condensed) **Round 3 screenshot audit: 38 findings, 2 at severity 3 (element
  label placement).** `tier2/rounds/round-3/expert/engineer.md`. Still mine: Escape does nothing on
  the Data pages. For the element: sized nodes drawn inside each other (layout spaces centers).
- (2026-10-10, condensed) **Round 3 changes were measured in round 3; edge inspector words 31 of
  30 still OPEN. Round 2's new routes (weight meaning at load, Replace in "...", rule hint) count
  only once a clean round re-measures them; do not reword or move them meanwhile.**
- (2026-10-10) **Not mine to fix in the app, ever:** drawn names covering names and ties (element
  label placement on an unseeded layout, owner's list); bare numbers in rules and what an edge
  width measures (both breaking, owner's list); never scale widths or parse rules in the app.
  "Components 1" under a filter is held so the words change is measured alone.
- (2026-10-10) **OPEN, not reproduced: a reopen from Recent projects once drew no "Opened friends"**
  (r3 pilot `T19A/11.png`, route `--reopen`). Eleven walks showed it; suspect the open finishing
  late (an element question). No code without a mechanism. Evidence
  `tmp/r3-dry1-reopen-shows-opened-notice/`.
- (2026-10-10) **Still open from the round 2 audit, confirmed on r3d2:** two-table source has no
  actions and no reason; "Edit source..." lands on "Replace: ..."; neighbor Back row scrolls the
  inspector sideways; path popover covers the nodes it asks for; 900 x 700 canvas is 363 px. The
  "Full graph" section under a filter is frozen and reads right at both sizes.

## Decisions and reasons

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

- (2026-10-11) **real.mjs cannot click an aria-disabled button.** Its click is Playwright's, which
  waits for an "enabled" element and treats aria-disabled as disabled, so `--click "Add step"` on
  the disabled button only retries. A person's click goes through. What worked: prove "a press adds
  nothing" in the real-element test (`Filters.real-element.test.tsx`, toolbar test, user-event
  click), and in real.mjs with `--key Enter` in the empty Value box (`06.png`: no step).
- (2026-10-11) **Two agents editing Filters.tsx and filterWords.ts at once.** Stage only my hunks by
  writing HEAD plus my edits to a blob and `git update-index --cacheinfo`; another agent's commit
  can sweep up a test I added to a shared test file (my toolbar test landed in 115bc0aa4).

- (2026-10-10) **Proving where focus landed in real.mjs without `--sr`.** A programmatic focus
  after a pointer click draws no ring, so the screenshot cannot show it. Worked: `--key ArrowDown`
  after the click; a focused Mantine Select opens its list (`tmp/t2r3-r4-09/fresh/04.png`). In a
  real-element test, a top-level `it` outside the describe runs at the 414 px default viewport
  and the left panel is not drawn; put toolbar tests inside the describe that sets 1366 x 768.

- (2026-10-10) **Finding why `useFocusLine` lost a line.** Worked: `console.log` in the hook's
  effect and a mount/unmount effect, run under the real-element test; it showed the focus landed and
  the tab then unmounted. Rule: a module-level focus ask consumed by a component that is about to
  remount must be re-armed in a layout cleanup (a passive cleanup runs after the nodes are gone,
  when `activeElement` is already body).
- (2026-10-10) **Scripting the Analyze focus drop.** Did not work: typing "shortest path" and
  Enter (the first row is Betweenness, which keeps focus on Run); Shift+A while the find box has
  focus (types "A" into the find). Worked: `--click role=button:Analyze`, type, three ArrowDowns,
  Enter, `--expect role=button:Find path` (the expect fails the move if a build reorders the rows).
  `--click` is refused in an `--sr` session; explore with keys there, then walk without `--sr`.
  A new tool check that reads the page goes in `measure.mjs` with a planted case in `plant()`, and a
  browser test beside it (`bar8-9.test.mjs`) that fails on the old code.
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
