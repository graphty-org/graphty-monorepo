# Design Director -- designer's notes

Role: I run the graphty design studio. I frame the problem, synthesize what the other designers and
the participants say, break ties with evidence, and own the success criteria and the round plans.
I want a small, sharp, coherent product. Read this file at the start of every session; update it
whenever I decide something, learn something, or change my mind.

Last updated: 2026-10-13 (tier 3 build phase finished: draft study materials written, the branch
pushed and a held draft pull request opened for the owner's review).

## Top of mind

- 2026-10-13: BUILD PHASE FINISHED, WAITING ON THE OWNER. Draft (not frozen) study materials are in
  `tier3/criteria.md`, `tasks.md`, `answers.md`, `roster.md`, each marked DRAFT at the top. Twelve
  tasks, T25 to T36 (tier 1 used T1-T16, tier 2 T17-T24): group colors and one group red, a
  gradient with a cap, a route, odd ids, letters in a name, a folder, a dark room (Everything and
  Selected), names with the top five bold, shapes for black-and-white print, re-found groups that
  keep their red, unsetting, and the genomics expression figure. Core five (6 sessions each): T25,
  T26, T29, T31, T35 -- the owner's three questions sit in T25 (no split parent), T29 (generic
  picking) and T35 (unset). Why T35 exists: "can a reader unset without being told" is the owner's
  first question and no earlier task measured it.
- 2026-10-13: Decided for the drafts. A tier 3 grade reads the style tree, not only the picture:
  a group recolored by its entry and by "New layer for" draw the same canvas, and both are S
  (both are ordinary layers; record which). Wording echoes are measured by giving the two halves
  different words where a control word is the natural one (T31 "background" against "everything
  behind"; T33 "shape" against "symbol"). Histories say what was done, never where (tier 2 round 5
  lesson). T36 runs on one dataset because no other file has signed values; it is reported per
  persona and judges no wording. Bar 4 makes the owner's "provenance never changes behavior" a
  scripted bar. Bar 11 keeps the accordion item honest: 900 x 700 fit is measured every round.
- 2026-10-13: New study file `tool/files/yeast-galactose.graphml` (331 genes, 361 interactions,
  three expression columns), written from graph-samples' `yeast-perturbation` dataset (Cytoscape's
  galFiltered demo, CC0) by `tmp/design-director-tier3/refs.mts`, which also printed every count in
  `answers.md`'s reference table. Run-dependent values (Louvain sizes, re-run groups) are recorded
  only on the frozen build.
- 2026-10-13: Open before freezing: the fifteen setups in `rounds/tier-3/setups/` (written on the
  approved build, through the panel the way a reader would); the detours; the bar scripts (style
  tree dump, row-consistency walk, 900 x 700 fit, the bar 9 baseline = the approved build);
  whether the owner wants a second signed-value file for T36.

- 2026-10-13: BUILD PAUSED FOR THE OWNER'S REVIEW after iteration 3 (review in
  `tier3/iterations/3/review.md`, approval screenshots captured). Iteration 4 is planned (10
  units: 3 element, 2 compact-mantine, 5 app; stories last) and NOT built. Do not start it until
  the owner answers; their answers may move units.
- 2026-10-13: What stands, and why. Two row kinds only, layer and folder: no split parent, no
  child rows; per-group colors are entries of an ordinary binding, "New layer for <value>" makes an
  ordinary layer (one interaction model for every layer; the same rows already serve a second
  case, a number column like College football's conference). Unset and cover are two acts: the
  minus (or emptying a field) removes this layer's value so the layers beneath show through; an
  entry set to nothing ("Hide label from Key people") covers what is beneath. Figma taken: one-line
  rows, effect rows, Selection colors, "Mixed" only for multi-selection, right-click selects,
  popovers beside the panel; next: one settings button per section (Type settings), 1 px swatch
  border, opacity inline, icon-grid shapes, draggable color popover.
- 2026-10-13: What to watch at the owner's review: (1) does the minus read as "unset", and does
  its tooltip naming what comes back earn trust; (2) is "Hide label from Key people" in the "+"
  menu where they look to cover something beneath; (3) does a dimmed painted-over value read as
  "not what is drawn"; (4) the six sev 3s still in this build (names cut to two letters, kind
  change discards settings, ramp handle locked, focus to page, oranges for categories, 0-to-0
  histogram) -- the owner will meet them; say so up front, do not let them read as design.
- 2026-10-13: What to watch in the study (after approval): whether readers find unset without
  being told; whether lower layers' values ever get mistaken for this layer's once a layer lists
  only its own entries; whether a kind change feels safe; keyboard paths through every NEW
  capability, since each iteration's new capability has produced its worst finding.
- 2026-10-13: Open for the owner: the default label font fallback (new), plus the five breaking
  items; accordions are no longer needed (the panel fits 900 x 700).

- 2026-10-13: ITERATION 3 REVIEWED (`tier3/iterations/3/review.md`): 107 findings (0 sev 4, 9 sev
  3, 45 sev 2), about 55 distinct. Not ready for approval: six distinct sev 3s (names cut to two
  letters, kind change discards settings, ramp handle locked after one step, focus to the page
  after Clear/Remove/Undo, numeric "one color per value" in oranges, Values histogram 0 to 0).
  The panel now fits 900 x 700 (owner item 5, accordions, is moot).
- 2026-10-13: Lesson, again: the fix that shortened the panel (one line per property) caused the
  top finding (gear and painted-over mark squeezed into the name column). Count what each column
  holds, not just how many columns, before building a row grammar in 240 px.
- 2026-10-13: Decided one settings button per kind SECTION (Figma's Type settings), not per
  property, so the name column holds only the name and no tail column is added. Painted-over mark
  moves into the field and the value dims. If anyone puts a gear back into the name column, stop it.
- 2026-10-13: Decided a layer lists only its OWN entries; covering a lower layer's label is
  "Hide label from Key people" in the "+" menu, which adds an ordinary entry set to nothing. This is
  also the clean answer to the owner's unset question: unset (minus) and cover (an entry) are two
  acts with two controls.
- 2026-10-13: A kind change keeps both parts in the element (a part the kind does not draw waits);
  passing Edges on the way to Both loses nothing, so the radios keep standard select-on-arrow.
- 2026-10-13: New owner item: the element's default label font is bare "Verdana" (released), so
  Linux draws serif. Adding a fallback is a default change. App picks its own font meanwhile.
  NOT an owner item: the ordinal scale's sequential default (ordered categories; Vega-Lite does the
  same); the app's "One color per value" passes a categorical palette as its choice.

- 2026-10-12: ITERATION 2 REVIEWED (`tier3/iterations/2/review.md`): 116 findings (1 sev 4, 11 sev
  3, 58 sev 2), about 55 distinct. Not ready for approval. The one blocker is a kind change that
  destroys the layer (`retargetRow` mints a new id for a one-part row switching kind and copies a
  node rule onto edges). Lesson: the iteration's own new capability (kind change in place) was the
  only sev 4; walk every NEW capability by keyboard in the build before calling a unit done.
- 2026-10-12: The owner's unset question is now about TRUST, not mechanism: "what comes back" was
  read over the whole graph, named invisible "Node defaults", and Undo after Clear did nothing.
  Next build: element `agreement` scoped to a row's matches; "the default" for base layers;
  "Varies" for several beneath; "Mixed" only for multi-row selection.
- 2026-10-12: Decided one ~28 px row per property, label left, pairs no longer share a row;
  accordions stay owner item 5 and are NOT built. Effect and category rows use a chip, not hex.
  One name per value = catalog plainName everywhere (pills used technicalName). Label size in
  screen pixels as an ADDITIVE element option, so the owner's label-size item loses its urgency.
- 2026-10-12: ITERATION 1 REVIEWED (`tier3/iterations/1/review.md`): 122 findings, about 60
  distinct, 2 at severity 4 (Label settings pop-out unscrollable; no keyboard move into a folder).
  Not ready for the owner's approval. The model held; the doors around it did not. Biggest lesson:
  the app shipped with `startingRows` off and run layers without Which elements, so provenance
  changed the panel -- check every settled-model rule against the app a reader OPENS, not the
  review stories, which set things by hand.
- 2026-10-12: The app now sets `startingRows: true` and `runPlacement: "top"` itself (consumer
  choice; element defaults stay neutral). The Selected starting row's look is unreleased, so making
  it visible on every palette color is the team's call, not owner item 3.
- 2026-10-12: OWNER REVIEW 1 ANSWERED in `tier3/design.md` (decisions 1.1, 1.7, new 1.13; change
  log at the end). Two row kinds only. If anyone rebuilds a split row, a child row, "Follow parent"
  or a split command, stop it: per-group colors are value-table entries, anything else is "New layer
  for <value>". The built split API is unreleased and is replaced by `element-value-entries`.
- 2026-10-12: Before naming an element addition, read the API report: `styles.agreement` already
  returns `layerId` / a breakdown (one proposal asked for a new `from` field), and
  `session.transaction` already makes several writes one undo step.
- 2026-10-12: TIER 3 IS A BUILD, NOT A STUDY, until the owner approves the UI. Design and plan:
  `tier3/design.md` (24 units: 8 element, 2 compact-mantine, 10 app, 4 values/tests/stories/docs).
  Owner checkpoints after the tree + Style tab, after pickers/popovers/labels/effects, after layer 4.
- 2026-10-12: The real app draws NO unbuilt item -- the mock's "marked" controls do not carry over.
  A control lands when the element can do it. Watch for disabled "not yet" glyphs creeping back.
- 2026-10-12: Both-kinds layers ship as element style-tree rows owning a node part and an edge
  part; `styles.list()` keeps single `target`. The app reads only `styles.tree()`. If anyone builds
  the pairing in the app, that is the workaround the rules forbid -- stop it.
- 2026-10-12: Owner items for tier 3 are five (owner-decisions.md 2026-10-12): both-kinds `target`,
  starting rows + run placement defaults, selection/badge contrast, reduced motion, accordions only
  if 900 x 700 still scrolls.
- 2026-10-11: ROUND 5 RE-RUN IS VALID: 55 of 55 on 8c015b806, gate passed, leak check read one log
  per session. Fails only bar 9 (b) (edge inspector 29 vs 27) and bar 10 (drawn names/nodes
  overlapping, element). Owed: r5-s02bb (Ruth, T22 B). Round 4's three owed sessions were never
  run; round 5 re-ran their halves, so they are dropped, not owed.
- 2026-10-11: THE TASKS HIT THEIR CEILING. Strict stall rule met: every task succeeds, and the
  round 4 fixes (table under a step etc.) sit where no task routes a reader. Next useful signal is
  new tasks through the fixed screens, or real people. Do not run another round on these tasks
  unchanged.
- 2026-10-11: STUDY ARTIFACTS IN ROUND 5 SCORES, fix before any comparison: step counting
  (type+pick is one step in the key, two for participants; "T18 on the limit" was this);
  histories steer first moves (Style tab); T19/T21 setups never save while histories say saved;
  T20/T22 prompts name what they measure; T17 prompt never needs the table.
- 2026-10-11: Owner items are THREE, not six: bare numbers in rules, edge width unit, camera in
  the project file. #1727's table (2026-10-10 ruling) settled histogram banding, the edge's blue
  band and all three compact-mantine rows (20, 21).
- 2026-10-11: Tier 2 report: the Write tool refuses a subagent writing `tier2/report.md` (twice
  now); the full text goes back to the orchestrator to save. Do not route around it with Bash.
- 2026-10-11: Bar 9 (b): the diff (`round-4/bars/edge-inspector-words.md`) shows +"full graph",
  +"on nodes": true scope facts. Decide on merits -- raise that screen's limit with a change-log
  reason rather than cut them; it has failed honestly at 29 vs 27 for two rounds.
- 2026-10-11: Round 5 severity 2 (app unless noted): no names drawn by default; Replace has no
  visible control; Add lands with Load filled when every tie repeats; Add leaves new people out,
  naming node rows the file lacks (maybe element fact); note subject not choosable; Hops count
  mismatch; Filter to neighbors has no way back. Specialist-only: "or more" row placement,
  missing column reads as empty, edge-only out-of-date note.
- 2026-10-11: Both round 4 severity 3s were ONE QUESTION ANSWERED BY TWO TESTS; round 5 found two
  more (the out-of-date note's counts vs the step's; the missing column vs a true empty). Hunt pairs.
- 2026-10-11: MEASURE OR WALK A CLAIM BEFORE CLASSING IT (`--hover`, source for names, ratios
  across undo for sizes). A key note names the mechanism once known.
- 2026-10-11: The briefing leaked answers in rounds 3-4; discount every "noticed unprompted" count
  from them; leak checks read briefings.
- 2026-10-11: A fix that swaps one count for another is a new half-truth; add the missing unit.
- 2026-10-09: Before calling a defect an app job, read the element; expose the fact, never compute
  in the app. A pattern fixed in one place is a defect wherever it is missing.
- 2026-10-07: Words: glossary wins. Severity 4 needs a wrong conclusion a reader would act on.
  Words at rest never rise.

## Priorities and values

- **A newcomer finishes the core path.** The average first-time user before specialized features;
  the owner's 2026-10-02 instruction and the reason tiers exist.
- **Small and coherent over complete.** One home per feature, one word per meaning, one pattern
  per job. Personas validate the design, they never generate features (owner, 2026-09-26).
- **Evidence over taste.** A departure from Figma's conventions needs a graph fact, a WCAG
  criterion, a named failing workflow, or a field convention. I break ties with the observed
  behavior of two or more participants, not opinions.
- **Truthful screens.** A value never misstates what it describes; every count is computed from
  live state or removed; a result the user cannot see is a fatal flaw (owner 2026-09-30).
- **The element owns the graph.** graphty-element returns neutral facts; the app writes the words
  and arranges them. A missing capability becomes an element change, not an app workaround.
- **Honest measurement.** Simulated participants share one model's blind spots: a failure is a
  strong signal, a pass is weak. Compare rounds to each other, not to published norms.
- **Do not waste the owner's time.** Decide reversible things myself with a stated reason; bring
  the owner only one-way doors and before/after evidence for his own review items.

## Design criteria

- **Every step of the chained first session commits visibly** -- canvas and legend change the
  moment the step commits (round 8: "the panel said one thing and the drawing showed another").
- **The obvious first choice does the thing** ("Show labels" matched and did nothing; 12 of 21).
- **Every count names its unit and its whole, and is live.**
- **A count that hides something offers the way out beside it** (round 2: 8 of 8 hunted).
- **A list answers with names, not counts** (0 of 12 could answer from "Javert and 17 neighbors").
- **Nothing pre-done in a first session** (21 of 21 could not tell pre-run work from their own).
- **No unbuilt item is drawn.**
- **Words: one label per command, everywhere; field-standard terms; American spelling; no two
  reachable controls share an accessible name** ("Data" on two controls dropped the selection 12/12).
- **Screen at rest with a graph loaded: about 50 words of app text.**
- **No first-run interface** (owner ruled out wizards and suggestion cards, 2026-09-26).
- **No confirmation dialogs for undoable acts; Esc closes the innermost thing first.**
- **Every focus change says where focus goes instead.**
- **Time to first drawing under 2 minutes; the user runs at least one analysis; the user can say
  what they see** (designloom workflow W14).

## Decisions and reasons

- 2026-09-26..10-08 (summarized; full text in git history of this file) -- Owner: Figma is the
  paved path for chrome; refined structure B; a run paints as soon as it finishes; tiers, tier 1
  first; build the real app and study it; element neutral about presentation. Me: real-app
  criteria; tier 1 rounds 1-3 and their units; tier 2 design (`next-steps/tier2-design.md`);
  tier 2 pilot fixes and criteria freeze (carry-forward scoring, bar 10, bar 11 as a gate, bar 9
  (b) limited by round 1's count); round 1 dry runs one to four: fix what a participant could hit
  in its owning package, leave what the task asks.

- 2026-10-09 (summarized; full text in `tier2/rounds/round-{1,2}/decisions.md`, the dry-run files
  and git history) -- Tier 2 round 1: took the red team on five verified points (T20's one command
  doing two things; T22 words first with the element answering "is this a rule"; Replace in the
  source "..."; one stale mark; `writeLine`'s shared default); halo is a rendering defect. Round 2:
  study first (session folders outside the tree, transcript leak check, pilot-seeded dry runs,
  scripts that fail on planted faults); find box one path (miss, hint, Enter runs it); Add's repeat
  count from the element; selection's new line starts at `styles.highlightStyle`; held label
  overlap, neighbor depth, column "Select where".

- 2026-10-10..10-11 (summarized; full text in git history of this file and in
  `tier2/rounds/round-{3,4}/decisions.md`, `tier2/dry-run-r{3,4,5}-*.md`) -- Round 3: three dry runs
  (6, 1, 0 fixes); twelve changes (Shift-click in the element, toolbar Filters, `FindValueRow.atLeast`,
  edge steps count edges, runner gate); took the red team on rank-never-hide and no second-path
  notice. Owner review: label overlap re-scored with declutter on; extending declutter to dots is
  additive, the team's call, not an owner item. Round 4: two dry runs (3 fixes, then 0); twelve
  changes (gate into `real.mjs --start`, briefings name file and kind only, `suggestBackticks` uses
  the selector's acceptance, `FindResult.atLeast`, `rulePath`, off step stays off, table scope
  "visible", bar 9 (b) diff before any cut); over the red team on `rulePath` and keeping
  `--shift-click`. Round 5 dry run one: 0 fixes; 8c015b806 frozen. Round 4 closed with every change
  built and the three single-source claims scripted (all reproduced on 5277e2cbe).

- 2026-10-11 -- Round 5 came back void (0 of 56; `tier2/rounds/round-5/{scores,insights}.md`). Cause,
  checked by both skeptics against the journal: the run in flight is the continuation script written
  after the 2026-10-10 usage limit, which goes from plan straight to participants with no gate step;
  the gate step exists only in `workflow-tier2.js`, which the running workflow never read. The
  `real.mjs --start` refusal held 56 of 56, so no bad data entered. Decision: no round 5 decisions on
  specialist evidence alone; relaunch from the main script, gate first, owed round 4 sessions, then
  all 56 as `<id>b` on the same build. Reason: the build has not changed, so expert findings stand,
  and deciding fixes before readers meet the round 4 fixes would blur what round 5 credits.
- 2026-10-11 -- Tier 2 report for the owner drafted (summary, per-round bar tables, what was learned,
  changes by package with confirmation, deferred items, six owner items, next steps). The Write tool
  refused a subagent writing `tier2/report.md`, so the full text went back to the orchestrator to
  save. Owner list kept to breaking changes and one-way doors: bare numbers in rules, edge width
  unit, camera in the project file, and three compact-mantine behavior changes outside the table
  the 2026-10-10 ruling covered. Label overlap is NOT on it (additive declutter, team's call).
- 2026-10-11 -- Round 5 re-run (55 of 55 valid, gate passed) read: the product is at the tasks'
  ceiling; strict stall rule met. Decision: no further simulated round on these tasks unchanged;
  next is (a) fix the study's four self-measurements (step counts, histories, setups, prompts),
  (b) the smallest severity 2 fixes in their packages plus element label placement, (c) real
  people on the core four, or new tasks that route readers through the round 4-5 fixes. Reason:
  `round-5/insights.md` items 2-3; both skeptics weakened "not stalled".
- 2026-10-11 -- Round 4's owed sessions (r4-s05b, s20b, s28b) are dropped, not owed: round 5
  re-ran their halves on the newer build and no round 4 verdict depends on them.
- 2026-10-11 -- Owner list cut to three (bare numbers, edge width unit, camera in the project
  file). Checked #1727's breaking table: rows 7 (edge band), 10 (histogram), 20-21 (compact-mantine)
  are all "Decided by the owner (2026-10-10): ships as a minor". The earlier draft's "six" was wrong.
- 2026-10-11 -- Tier 2 report rewritten for the re-run (summary, five per-round tables, eight
  lessons, changes by package with confirmation, deferred, three owner items, next steps). The
  Write tool again refused a subagent writing `tier2/report.md`; full text returned to the
  orchestrator to save.
- 2026-10-11 -- State after the token limit, checked: the only uncommitted work was round 5's 56
  void session folders (graders finished by 07:16); committed them as the record of the void round,
  as rounds 3 and 4's folders were. `workflow-tier2.js` stays out of git on purpose
  (`.git/info/exclude`); round 5's insights said to commit it, I did not.

- 2026-10-12 -- Tier 3 decisions (full text `tier3/design.md` section 1). "+" only on lists;
  seven core one-value properties always drawn on four paired rows with "beneath" placeholders,
  rare ones behind the row's settings button, yes/no as two-word selects with an empty state.
  Shorten instead of hide (no empty titles, paired rows, sticky headings), no accordions/tabs
  unless 900 x 700 fails. Hide a kind group by the kind choice, not the count. Vary picker: search,
  In use/Data/run/Facts, misfits folded, no new fit check (proposeEncoding). Ramp editor in
  compact-mantine fed by one `styles.preview` call; domain and clamp separate. Split parent is a
  layer with its own glyph; split offered on any categorical layer; runs arrive unsplit. One Which
  elements: Nodes|Edges|Both + one rule + between/touching. Coverage is a test. Labels: look
  select (new element looks that pass 4.5:1, not the badges) + one popover, "Edited". Picking:
  conditions shared with Filters, find offers rules, selection makes a layer; text leaf on find's
  matcher; odd ids by `[13579]$` on the id, no modulo. Vary on every bindable field; build label
  size/color/background channels rather than show disabled glyphs. Reasons: one home per thing,
  no unbuilt item drawn, one matcher for find and rules, element owns every fact.
- 2026-10-12 -- Chose element style-tree rows over a `targets` field or app pairing for both-kinds
  layers: additive, the element's own representation, and the app's code survives the major.
- 2026-10-12 -- Everything starts writing nothing (floor shows through its placeholders); Hovered
  starts writing nothing; Selected starts with today's halo and band as effects. Reason: neutral
  defaults; the model left these to the build.
- 2026-10-12 -- Owner review 1 (`tier3/owner-feedback-1.md`). (1) Unsetting: three field states
  (not set / set / set to nothing), one command Clear on a minus drawn at rest only on set fields,
  empty-and-Enter or Delete as shortcuts, tooltip from `agreement` below, focus to the field after,
  one undo. Rejected a "Not set" select option (sits beside "None", opposite meaning), a per-field
  eye and Clear all. Labels: per-field minus back to the look, no Reset. (2) Split: took the IA
  proposal over the Figma designer's "layer with children" and interaction's "folder of empty
  layers". Reason: the owner's test is every row a layer or a folder; "layer with children" keeps
  the sibling-only and refused-drop rules under another name, and generated layers flood the tree
  and copy rules that drift. The value table gives palette reach already, and the built split
  stored overrides there anyway, so the element work mostly survives. (3) Figma pass as decision
  1.13; Selection colors names the layers each color comes from (the crosswalk's existing rule),
  edits in place in those layers; eye per list entry where Figma has it, meaning "draws nothing
  here" (a value that covers), flagged for the owner review because Figma's hidden fill reveals
  what is beneath. Clicking an empty list title adds (Figma), over interaction's "second door".
- 2026-10-12 -- Iteration 1 review. Units for iteration 2 by package: element (one row per run,
  run rules readable, kind change in place; one list of readable values; small facts), compact-mantine
  (pop-out fits and returns focus; field states; glyph grid and ramp; tree move into folder), app
  (defaults and tree; property rows; lists and labels; popovers and picker; key, values, settings;
  then which elements and draft; then stories). Decided: vary glyph drawn at rest in a reserved
  column (departs from Figma's hover-only "Apply variable"; reason: tier 1's 18 of 18 hidden-door
  evidence, and it ends the row jump); opacity inline as % in the color row (Figma's paint row);
  Text holds Label and Tooltip; draft picks elements before any value; locked layer uses
  aria-disabled, not a native disabled fieldset; inspector stays 240 px; key shows only readable
  blocks and is capped in height. No new owner item.
- 2026-10-12 -- Iteration 2 review. Units for iteration 3: element (kind change keeps the layer;
  scoped beneath; readable values incl. number value counts, color fact, edge source/target, find
  over runs; label screen size, number format, Selected ring on black), compact-mantine (field
  states and a chip-only color; tree one Tab stop, right-click selects, popout placement, menu
  shortcuts, ramp Home/End), app (one-line rows and undo; effects and labels; popovers and
  pickers; tree, key and settings; then Which elements, names and Values tab), then stories.
  Reasons: two lines per property made the panel longer than iteration 1; four names per value
  came from the app mixing plainName and technicalName; every "beneath" defect traced to one
  unscoped call (the ponytail note in `row.ts` said so). Yes-or-no properties get no vary by (a
  rule plus a fixed value is their home); opacity varies through the color row's settings.
- 2026-10-13 -- Iteration 3 review. Units for iteration 4: element (nothing hidden is lost: kind
  change keeps parts and carries shared channels, effect off keeps its color; previews over the
  data's full extent, ordinal key as swatches, enum fit for few-valued numbers; label screen
  default, undirected head beneath, Selected ring on a hub), compact-mantine (swatch border, no
  swatch for Varies, 240 px icon grid; pop-out Tab order and drag, tree roving, names), app
  (whole names via section settings; own entries and focus; pickers, find and rules; popovers and
  Values; panels, frame and key), then stories. Reasons in the review. Held with reasons: numeric
  id comparisons and parity, canvas marks for a draft, the eight unchanneled label fields,
  case-duplicate layer names, toggles for three-state yes/no, one swatch size, a Data page home
  for "this number names groups".
- 2026-10-12 -- Held as second doors until a study shows need: "Vary color by this" from a table
  column, "Show by" in the Values tab, saved label looks, a per-property pause eye.

## Tried: worked / did not work

- 2026-09-27..10-08 (summarized; full text in git history) -- Worked: piloting every task on each
  new build; pilots naming file, line and screenshot; root-causing proposals in source (several
  "new APIs" were already half-built); one change per path; re-piloting each fix batch on the built
  result. Did not work: a check that read 0 pages passed (plant a failure); a session clock
  running while queued (14 voided); a decided rename never built; starting round 1 before a dry
  run; checking colors on flat swatches; a helper script shared between sessions.

- 2026-10-09 (tier 2 rounds 1-2, summarized) -- Worked: dry runs leaving 0 broken controls on
  walked routes; the red team reading proposals in source (found T20's cause six roles missed);
  reading the element's facts before calling a word wrong (`stale.reason`); measuring pixels
  before calling a misalignment; reading `owner-decisions.md` before ruling on a "units bug". Did
  not work: walking only the key's routes by pointer; bar scripts unbuilt at round start; the walk
  list one round behind; handing a keyboard fault to the expert pass; session folders inside the
  studio tree (13 of 16 leaked); the key copying pilot claims as facts; a local fix nobody grepped
  for siblings.

- 2026-10-10..10-11 (rounds 3-5, summarized; full text in git history) -- Worked: classing
  pilot items against the key and earlier triages first, reading source only for new ones; reading
  the red team against source before taking it; `git tag --contains` to settle breaking or not;
  `--hover`, PNG contrast and undo ratios to settle claims; pilots in waves under the 4-browser cap;
  the token-limit stops lost nothing when roles committed before them. Did not work: a gate enforced
  only by the runner (rounds 3 and 4); an acceptance line written as a word budget; 20 pilots at
  once; a watch item with no mechanism named; diagnoses cited from files not on disk.
- 2026-10-11 (round 5) -- Worked: the refusal in `real.mjs --start` (56 of 56). Did not work: editing
  `workflow-tier2.js` while a continuation script was the one running -- the fix never reached the
  run. Did not work: the runner starting all 56 sessions in parallel with nothing to stop on.

- 2026-10-11 (round 5 re-run) -- Worked: relaunching from the main script; the gate ran and every
  session read the build stamp; leak check read one log per session and both flags cleared on
  reading. Did not work: histories, setups and prompts written without grepping them against what
  the round scores (four artifacts reached `scores.md`); counting steps differently for the key and
  for participants (made a false "T18 on the limit").

## Thinking

- **2026-10-10, after round 3:** the product's remaining problems are small doors and orderings;
  the study's are bigger. Three of round 3's measurement faults hid themselves (a check that read
  nothing, a deleted note, a skipped gate). Every study rule now needs a mechanism that refuses,
  not a sentence in a plan.
- **2026-10-10, prompt words:** a prompt that avoids naming the control must still name the
  outcome the key grades. "Point out" admits a path; "so that whatever you do next applies only to
  those two" admits only a selection without saying "select".
- **2026-10-09, round 1 lessons:** prompts can induce what they measure; credit what users do
  next, not the first door; walk the previous round's wrong turns by pointer and keyboard.
- **Real-user study design:** 5-8 analysts plus one screen-reader user; tier 1 core four; measure
  what simulation could not (Size and labels found, 3D sizes misleading, ease calibration).
- **Discovery is the remaining cost.** Do not redesign from simulated evidence alone; it is one
  shared guess. The Filters icon is the one clean case so far.
- **Where fixes go.** Graph logic (element), a word or arrangement (app), a shared control
  (compact-mantine). A fix in the wrong package is a second bug.
- **Open tension:** "a run paints as soon as it finishes" vs a reader's Everything color
  suppressing it. Owner item.

- **2026-10-11, after round 4:** the product is down to small mismatches between two checks of one
  fact; the study's faults are still the larger risk, and they hide themselves the same way (a
  check in one place, the act in another). Put each refusal in the one path every action takes.
- **2026-10-11, after round 5:** the same shape one level up: a fix in one copy of the run script,
  the run on another. Recovery after a limit is part of the study, not housekeeping; the first
  step after any restart is to diff what is running against what we last fixed.

- **2026-10-11, after the round 5 re-run:** the instrument, not the product, now limits what we
  learn. Simulated readers succeed everywhere the tasks send them; the fixes sit where tasks do not
  go. The honest next move is real people, or tasks rebuilt around the fixed screens, after the
  histories, setups, prompts and step counts are checked against what each round scores.

- **2026-10-12, tier 3:** eight proposals agreed on direction; the risk was overlap -- about
  20 element calls, several the same question under four names, some already existing
  (`proposeEncoding`). Ask "does the element already answer this?" before naming a new call, and
  give each question one call.

- **2026-10-12, owner review 1:** the owner judged by interaction consistency, not by model
  fidelity. The split parent satisfied the model and failed that test; three of my reasons for it
  were really about storage. Ask of every new row or control: does a reader learn a rule that
  applies nowhere else? If yes, find the existing mechanism first.
- **Watch at the owner review:** whether an entry's eye that blocks the beneath reads as Figma's
  eye that reveals it; whether empty fields with gray placeholders read as "not set" at a glance.

- **2026-10-12, iteration 1:** the experts agreed with each other far more than with the build:
  the same defect came from three walkthroughs (Label settings, category rows, run rows). When three
  lenses land on one defect, the cause is usually one gate in one file (`source.by === "user"`, a
  missing `width`, a pop-out with no height cap). Look for the one line before planning a unit.

- **2026-10-12, iteration 2:** fixes that reserve space (vary column, Clear column) pushed rows
  into two lines; a fix for jumping made the panel long. When a fix adds a column in 240 px, count
  the columns before building. Also: every `ponytail:` note in the app that says "the element has
  no X" was a finding three experts later reported; read those notes at review time.

- **2026-10-13, iteration 3:** the owner's three questions now have clean answers in the build
  (unset = minus, cover = an entry; no third row kind; Figma's patterns named one by one). What is
  left is mostly truth at rest (dimmed painted-over values, Varies without a swatch, the font and
  arrow head beneath) and loss (kind change, effect eye, focus). Truth and loss outrank polish.

## Sources

- Tier 2 round 3 (2026-10-10): `tier2/rounds/round-3/{plan,scores,insights,decisions}.md`;
  proposals in `notes/{user,researcher,ia,content,interaction,figma,visual,a11y,engineer,redteam}.md`.
- Round 3 dry runs: `tier2/dry-run-r3-{1,2,3}.md` (pilots in `tier2/rounds/{r3,r3d1,r3d2}/pilot/`).
- Tier 2 rounds 1-2: `tier2/rounds/round-{1,2}/{plan,preflight,scores,insights,decisions}.md`;
  dry runs `tier2/dry-run-r{1,2}-{1..4}.md`.
- Tier 2 frame: `tier2/criteria.md` (frozen; names the study build), `tier2/tasks.md`,
  `tier2/answers.md`, `tier2/roster.md`, `owner-decisions.md`, `tool/README.md`.
- Tier 1 and earlier: `criteria.md`, `tasks.md`, `answers.md`, `rounds/round-{1,2,3}/`,
  `digests/`, `.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype/`.
- Builds: tier 2 round 1 9d6598eea, round 2 4a7a1a7fb, round 3 26f3bb968 (served from
  `.study-builds/tier2-r3d2-26f3bb968/`); round 4 candidate 38e180aac (`.study-builds/tier2-r4-38e180aac/`).
- Round 4 dry run one: `tier2/dry-run-r4-1.md` (pilots in `tier2/rounds/r4/pilot/`).
- Round 5 dry run one: `tier2/dry-run-r5-1.md` (pilots in `tier2/rounds/r5/pilot/`); round 5
  build 8c015b806 (`.study-builds/tier2-r5-8c015b806/`).
- Round 4 dry run two: `tier2/dry-run-r4-2.md` (pilots in `tier2/rounds/r4d1/pilot/`); round 4
  build 5277e2cbe (`.study-builds/tier2-r4d1-5277e2cbe/`).
- Tier 2 round 4 (2026-10-11): `tier2/rounds/round-4/{plan,scores,insights,decisions}.md`;
  sessions in `round-4/sessions/`; proposals in `notes/*.md` (commits 6171f0486 to 90ea5b8e8).
- Tier 2 round 5 (first run void, re-run valid): `tier2/rounds/round-5/{plan,scores,insights,table}.md`,
  `expert/`, `claims/`, sessions `r5-s01b`..`r5-s56b`; build 8c015b806. PR #1727 (breaking table). Run scripts: `tier2/rounds/workflow-tier2.js` (main, excluded from
  git) and the main checkout's `tmp/studio-resume/workflow-tier2-continue.js` (the stale fork).
- Tier 3 iteration 1 (2026-10-12): build `tier3-i1-68a2140049` at https://dev.ato.ms:9373/?next;
  reports and review in `tier3/iterations/1/{figma,visual,a11y,engineer,ia,review}.md`.
- Tier 3 iteration 2 (2026-10-12): build `tier3-i2-2faecd941b` at https://dev.ato.ms:9373/?next;
  reports and review in `tier3/iterations/2/{figma,visual,a11y,engineer,ia,review}.md`.
- Tier 3 iteration 3 (2026-10-13): build `tier3-i3-617b43b270` at https://dev.ato.ms:9373/?next;
  reports and review in `tier3/iterations/3/{figma,visual,a11y,engineer,ia,review}.md`.
- Tier 3 (2026-10-12): `tier3/design.md` (decisions, panel, coverage table, element additions,
  owner items, units, change log); owner review 1 `tier3/owner-feedback-1.md` and proposals
  `tier3/decide/feedback-1-{figma,interaction,ia}.md`; proposals `tier3/decide/{ia,interaction,figma,visual,content,a11y,user,engineer}.md`;
  `tier3/style-catalog.md`; model `design/ui/unified-style-layers.md`; mock and organization design
  on branch `mock/style-panel` (pull request #2098).
