# Design Director -- designer's notes

Role: I run the graphty design studio. I frame the problem, synthesize what the other designers and
the participants say, break ties with evidence, and own the success criteria and the round plans.
I want a small, sharp, coherent product. Read this file at the start of every session; update it
whenever I decide something, learn something, or change my mind.

Last updated: 2026-11-02 (tier 5 dry run pass 6 triaged on d3fda9f2b6: 8 product defects, 0 fix now; SESSION-READY).
Summarized on 2026-10-17, 2026-10-18, 2026-10-19, 2026-10-20, 2026-10-21, 2026-10-29 (three times),
2026-10-30 (five times) and 2026-11-02 (twice); the full earlier text is in this file's git history.

## Top of mind

- (2026-11-02) DRY RUN PASS 6 TRIAGED (`tier5/dry-run-r1-6.md`; `dry-run-r1-3.md` holds pass 3, so
  pass 6 took the next free name): 8 product defects on d3fda9f2b6, 0 fix now, 1 decided (nodes under
  the toolbar), 7 backlog (5 keyboard/screen-reader, 1 friction, 1 cosmetic), all but three repeats.
  Both pass 4 units are in the build and held on their acceptance routes (T77 A/B touched-1/2, T71 A
  touched-8). The build is SESSION-READY by the dry run's rule: the r1 sessions can start on it.
- (2026-11-02) Dry run passes 1-5 (`tier5/dry-run-r1-{1..5}.md`): 319, 93, 34, 37, 44 defects; fix
  units in order: covered-claim, main-table, test mode, reference names, count base, busy sign (pass
  1); Cancel on a new card refix, open busy sign (2); cancel-no-undo, done-busy-sign (3);
  table-after-history, setup-history (4, carried unbuilt through 5, built in d3fda9f2b6). Rule from
  pass 5: a fix-now unit stays open until a build carries it.
- (2026-11-02) Criteria item 8 makes every named severity 3 candidate a round blocker, so the dry run
  fixes them even where no single step is blocked (rule in `tier5/decided.md`, "Dry run pass 1").
  T75 A is no longer blocked: the Piece size So far route reaches 105.
- (2026-11-02) The study build is named on `criteria.md` line 1 (now c3100058ab); each dry-run fix pass
  refreezes and names the build before it on line 3. Criteria were frozen on d13c2ff3da.
- (2026-11-02) Criteria item 8's five severity 3 candidates: four sent to fix in pass 1 (covered-claim,
  style-count-base, main-table, busy-sign); T75 A is unblocked by Piece size So far, so its rewrite is
  off unless a re-walk fails. So far on Largest component stays backlog (spec 4.2).
- (2026-11-02) Bar 9 is three parts: calm-first (0 sev 3-4, at most 3 sev 2), no screen named as the reason
  for a 4+ in two sessions on different halves, and the median <= 2 ONLY if the rating check separates the
  rejected build (7dfd51c277) from the frozen one by 2+ points. The calm-first check must fail the rejected
  build before it gates.
- (2026-11-02) T78 core (4 sessions), T76 dry run only (its path never opens the editor). Round: 30
  sessions, 8 alive at once, rating first in every follow-up.
- (2026-10-30) Tier 4 lessons that shaped tier 5: freezing with a known bar-failer backlogged fails the bar
  by construction; a dry run graded only on spoils lets decided fixes go unbuilt (each decided fix now gets
  its own acceptance check); wrong turn = input before success; preview must equal result.
- (2026-10-30) A tool line that contradicts the screenshot is worse than none: check every tool line
  against its image before a round.
- (2026-10-30) Run `git diff <earlier> <frozen>` over source FIRST in any triage; an earlier walk stands when
  the diff is code its route never reaches.
- (2026-10-29) A fix that gives an answer a new input must move every count and cache derived from it.
- (2026-10-21) Same-model participants: a failure is strong evidence, a pass is weak; two skeptics
  weaken more than they confirm, so settle every score through them.

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
  strong signal, a pass is weak. Compare rounds to each other, not to published norms. An
  instrument is checked against a case it must fail before it gates (2026-11-02).
- **Calm first** (owner 2026-11-01: "overwhelming, they make me want to walk away"). Clutter is a
  finding, not polish.
- **Do not waste the owner's time.** Decide reversible things myself with a stated reason; bring
  the owner only one-way doors and before/after evidence for his own review items.

## Design criteria

- **Every step of the chained first session commits visibly** -- canvas and legend change the
  moment the step commits.
- **The obvious first choice does the thing** ("Show labels" matched and did nothing; 12 of 21).
- **Every count names its unit and its whole, and is live.** A count that hides something offers
  the way out beside it. A list answers with names, not counts. Every list is bounded, counted and
  searchable at 50,000 nodes.
- **Nothing pre-done in a first session; no first-run interface; no unbuilt item drawn.**
- **Words: one label per command, everywhere; field-standard terms; American spelling; no two
  reachable controls share an accessible name.** Screen at rest with a graph loaded: about 50
  words of app text.
- **No confirmation dialogs for undoable acts; Esc closes the innermost thing first.**
- **Every focus change says where focus goes instead; after adding a field, focus is where the
  next keystroke belongs.**
- **The key and the drawing never disagree.**
- **A screen shows what its step needs and little else**: no blank pane, no row break, controls in
  line; advanced settings closed at rest (owner 2026-11-01).
- **Time to first drawing under 2 minutes; the user runs at least one analysis; the user can say
  what they see** (designloom workflow W14).

## Decisions and reasons

- **2026-11-02, dry run pass 6 triage** (`tier5/dry-run-r1-6.md`, entries in `tier5/decided.md` "Dry
  run pass 6"). Fix now: none. Settled for the backlog: when Undo or Redo takes away the focused
  control, focus goes to its section (Add filter for a filter card), never the status bar; Ctrl+Z /
  Ctrl+Shift+Z with nothing to undo or redo speak what the disabled button speaks; the status after
  Undo and Redo uses one wording with each count's "of N". Not taken: those three (keyboard or screen
  reader only, no such round session), nodes under the toolbar (decided), the 'PageRank test' select
  name and the key card's gradient (graded values right), Edit for a focused count (friction). Not a
  product defect: two `--prove` self-tests collide because `real.mjs` line 3145 names the round folder
  from `basename(REAL_PROVE_DIR)` (both "prove"); the engineer's, sessions never meet it.
- **2026-11-02, dry run pass 5 triage** (`tier5/dry-run-r1-5.md`, entries in `tier5/decided.md` "Dry
  run pass 5"). Fix now: only pass 4's two units, carried because f0a9a014cb does not carry them
  (`git diff --stat c3100058ab f0a9a014cb` is design files only, so pass 4's walks stand). Settled: a
  fix-now unit stays open until a build carries it; a spoken count reads over the same base as the
  screen's (T70 B's status spoke "of 11" over 7 of 7; backlog, no screen-reader sessions). Not taken:
  a hidden layer's edges left drawn (not-success route), nodes under the toolbar (decided), the
  50,000-node Done turning every node blue under "Drawing" (cosmetic), the Edit-for-count swap
  (friction, standing since pass 2).
- **2026-11-02, dry run pass 4 triage** (`tier5/dry-run-r1-4.md`, entries in `tier5/decided.md` "Dry
  run pass 4"). Fix now: the node table after a new card's take-back (T77 B touched-2: "Shown 1 of 11"
  while 7 are drawn; 47c95a09fc listed 7, 9610767e29's `restoreTo` does not move what the table's
  cached pages are keyed on; T76 B's Undo shows the same) and the study start's undo history (T77 A
  and B: Undo after Cancel undid the setup's orange, which T77 grades; every start is a saved project,
  and a reopened project has no history). Settled: a history move reaches every reading of the filter;
  a study start has no undo history (the tool's job, not the product's); Undo right after Cancel on an
  existing card undoes the Cancel (line 586 read literally; the sessions say whether readers expect
  it); a new card left with only an untested step stays inert and is graded as no change
  (`answers.md` T77). Not taken: the wrong spoken counts (no screen-reader sessions), Redo restoring an
  inert card after Undo on an open new card (T76 only, filters nothing), the 50,000-node waits (busy
  with a sign).
- **2026-11-02, dry run passes 1-3** (summarized 2026-11-02; full text in git history and
  `tier5/dry-run-r1-{1,2,3}.md`, entries in `tier5/decided.md` "Dry run pass 1" to "pass 3"). Fixed:
  the false "covered" claim, the data table under the workspace, a test's mode, the reference names,
  one count base, Cancel on a new filter card (removes it, focus to a filters opener else Add filter,
  no undo step), and "Drawing" on every blocking 50,000-node edit including open, Done, Cancel and
  Escape. Not taken: pickers flipping and the camera moving, Visibility Hidden's key, every T76 row,
  every keyboard-only row, overlays over a node (the canvas is the frame).
- **2026-11-02, tier 5 criteria reviewed and frozen** (three reviews: researcher 81e993f52d, user advocate
  65a6f779a1, red team 6946dd5032; they agreed on most points). Taken: bar 9 split into calm-first (gating
  sev 2 at most 3, with counts of what is drawn, gaps, row breaks, alignment, words budget, at 1440 x 900 and
  1280 x 800), named reasons, and a median that gates only after a rating check on the rejected build
  (reason: the placement study rated 2-3 everywhere, including the cards the owner rejected); the check must
  fail the rejected build too; a table from each of the owner's six complaints to its check; "Large graphs"
  severities (unbounded 50k list 3; >1 s blocked with no sign 3; >10 s busy without progress 2, 3 if anyone
  gave up); the 50k walk of every list; bar 5 counts a11y-walk keyboard blocks with a `--keys` repro; wrong
  turns before success only, never hovers, with worked examples in `answers.md`; expert-to-bar table; item 8
  (no half blocked, no known sev 3 open; the dry run may fix confirmed sev 3 candidates); T78 core and T76
  dry-run only; rating first and neutral owner questions; prompt words "either direction", "neighboring",
  "instead of" replaced; 8 alive at once (the browser pool). Roster: Grace takes T78 A with the shifts file
  added to her history, Tom T78 B, Ruth drops T76 A; every start is a saved project. Not taken: lowering bar
  9's median target (the rating check decides whether it gates); keeping "neighboring" as a detour (the
  alias makes it a direct route). Froze d13c2ff3da (its dist's stamp d13c2ff3dabe; only notes since).
- **2026-10-30, tier 4 round 1 and its report** (summarized 2026-11-02; full text in git history and
  `tier4/rounds/round-1/`). 28 sessions on 79ed770292; bars 1 and 4 held, 5, 6, 7 failed, 2 and 3 failed only
  as frozen (never re-scored after results). Stopped at the round cap; the top blocker was the study tool
  misreporting popover hovers. Four walkthrough fixes were not built as decided. The filter-words decision
  goes in with a non-destructive default (5 of 5 marking-first sessions). Report returned as text (the
  harness refuses a report file from a subagent).
- **2026-10-29..30, tier 4 criteria freeze and dry run passes 1-8** (summarized 2026-10-30; full text in git
  history). Grade from step log and end-state records; end-state check in bar 4; audit confirms only what a
  screenshot shows; bar 7 cost bar; gate refuses "pilot to confirm". Rules in `tier4/decided.md`: a fix is
  taken back only for a regression its re-walk shows; an earlier build's walk stands when the source diff is
  code its route never reaches.
- **2026-09-26..10-23, tier 2 and tier 3 decisions, and the Layout/Analyze section pattern** (summarized
  2026-10-29; full text in git history, `tier3/decided.md`, `tier3/design.md`). Kept: design problems
  confirmed across two halves; docs-only commits never refreeze; key-and-drawing on every last screenshot;
  Style rows are layers and folders only; the app sets consumer choices; read the API report before naming
  an element addition; the owner judges by interaction consistency; Figma is the paved path for chrome.

## Tried: worked / did not work

- 2026-11-02 (dry run pass 6) -- Worked: `git merge-base --is-ancestor` on each unit's fix commit
  before reading the defects (both in d3fda9f2b6), then the re-pilot reports of the units' own
  acceptance routes (T77 A/B, T71 A) to confirm they held, so a quiet defect list was real evidence
  this time; reading the self-test source line behind the tool row to name its mechanism instead of
  calling it a collision. Did not work: nothing new.
- 2026-11-02 (dry run pass 5) -- Worked: `git diff --stat <previous build> <frozen build>` first,
  as the 2026-10-30 note says; it showed at once that no code had changed, so the pilots' "unchanged"
  rows were not new evidence and pass 4's units were simply unbuilt. Checking the engineer's commits
  between the builds (all notes, re-walking pass 1's units) explained why. Did not work: trusting the
  defect list alone; it had no T77 Undo rows only because no re-pilot walked those routes.
- 2026-11-02 (dry run pass 4) -- Worked: reading the previous fix's mechanism (a take-back by
  `restoreTo` instead of `removeCondition`) next to the pilot's "the earlier build showed 7 rows"; it
  pointed straight at a cache keyed on something only commands move (`RevisionCache` on the input
  tick in graphty-element's `data.ts`), and T76 B's stale table after Undo confirmed it was a history
  move, not the take-back. Reading `roster.md` for screen-reader sessions before classing a spoken
  count (none, so backlog). Reading the answer key's build notes: they already said T77 B's grade
  reads the layer as it ends, which made the setup-history rows spoils, not notes. Did not work:
  nothing new.
- 2026-11-02 (dry run pass 3) -- Worked: reading the previous fix's diff before classing (47c95a09fc's
  `removeCondition` on Cancel explained the Undo label at once); reading the walk's `route.jsonl` timing
  (Done: firstFrame 29 ms, settle 13 s) and its 1 s glance, which separated "busy with a sign" (open,
  tick) from "no sign" (Done); classing each row by its own task's grade, so one mechanism gave one
  fix-now row and two backlog rows fixed with it. Did not work: nothing new.
- 2026-11-02 (dry run pass 2) -- Worked: reading the previous pass's fix commits and the engineer's
  re-walk notes before classing (they explained the blank band as the hidden table's kept place, showed
  that T73 A's "data table still draws" was the matches strip, and had already found the open-workspace
  block's mechanism); one data list generating both the triage tables and the backlog section, with an
  assert on the total (93). Did not work: citing interaction-patterns.md line 333 for the T77 A search
  before reading on; line 342 decides the opposite (an out-of-scope selection is allowed and marked).
- 2026-11-02 (dry run pass 1) -- Worked: reading `criteria.md` item 8 before classing (it turned four
  "friction" candidates into round blockers); reading the source behind each unit before naming files
  (the main table follows `editingSelection`, which an editor at rest keeps; the date mode is lost
  because a card with no bound reads back as Before); generating `backlog.md` from the triage's rows
  with a script and counting classes from the file (319 rows matched the brief). Did not work: a
  first regex that dropped rows with an empty reason cell (112 of 275); caught by checking the total.
- 2026-11-02 (tier 5 criteria) -- Worked: reading the answer key's build notes against each bar to find bars
  that would fail by construction (five candidates); grepping the catalog's `keywords` for prompt words (it
  found "neighbors" behind "neighboring", which the noun list could not); checking the dist's
  `graphty-build` stamp and `git diff --stat <stamp> HEAD` before freezing; checking that the rejected
  build's dist exists before naming it (7dfd51c277 has none, 7ca4cae647 does). Did not work: nothing yet;
  the dry run will show whether the rating check separates builds.
- 2026-10-30 (tier 4) -- Worked: reading `insights.md` before `scores.md`; fix coverage tables (they caught
  four unbuilt fixes); two independent skeptics. Did not work: freezing with a known bar-failer backlogged;
  writing a report file from a subagent.
- 2026-10-29..30 and earlier (summarized; full text in git history) -- Worked: `git diff --stat` over source
  first; `session.json` buildStamp per walk; searching app strings for each prompt word; starting a changed
  setup on the frozen build before committing it; Node repros against the built element; root-causing in
  source. Did not work: the pilots' "BLOCKS keyboard" label; claiming repeats unchecked; leading task
  wording; a success bar the model always meets; a fix nobody grepped for siblings; more pilots than
  browser slots.

## Thinking

- **2026-11-02, dry run pass 6:** the dry run converged once every unit's acceptance walked one step
  past its action and the triage checked the build carried each unit. What is left is all one family:
  what a keyboard or screen-reader user meets around Undo and Redo (focus, silence, wording). No round
  session exercises it, so the accessibility walk, not the sessions, will tell whether it matters;
  take it first in the decide-and-fix loop because three passes in a row have found a new instance.
- **2026-11-02, dry run pass 5:** a re-pilot only sees the routes it is told to walk. When a
  workflow restarts, its "touched routes" list comes from the units it re-ran, not from the last
  triage, so an unbuilt unit goes silent instead of failing. Before trusting "nothing spoils", check
  that the frozen build carries every unit the last triage sent; a quiet pass on unchanged code is
  not a pass.
- **2026-11-02, dry run pass 4:** pass 3's "walk one step past the fix" held, and found the next step
  was not in the product at all: once Undo after Cancel did the decided thing, it reached history the
  study tool had made. An instrument that builds a start by clicking leaves traces a real start never
  has (history, focus, hover); each trace is a way a correct participant can be graded wrong. Ask of
  every setup: what would a reopened saved project NOT have? Also: a fix that swaps a command for a
  history move must be checked against every cache keyed on what commands move.
- **2026-11-02, dry run pass 3:** each pass's fix leaves one neighbor open: pass 1's busy sign covered
  edits but not the close, pass 2's Cancel removed the card but wrote history. The neighbor is always
  what happens just AFTER the fixed step (the next Undo, the frame after the close). A unit's acceptance
  should walk one step past its own action.
- **2026-11-02, dry run pass 2:** both fix-now items were leftovers of pass 1, not new problems: one
  fix reverted, one fix that covered edits but not opening. A pass converges when each fix's acceptance
  names every entry route the decided behavior covers (Quick actions and the toolbar as openers;
  opening as well as editing), so write those routes into the unit, not only the pilot's.
- **2026-11-02, dry run pass 1:** the pilots found more "decided, not built" than new problems. A fix
  round that is graded on spoils alone leaves those standing (tier 4's lesson again), so the backlog
  carries them as their own first section and the decide-and-fix loop must take them before deciding
  anything new. The most damaging defect was a quiet one: a table that keeps showing the last thing
  edited reads as an answer.
- **2026-11-02, tier 5 criteria:** the owner's complaint is mostly severity 2 clutter, and every earlier tier
  gated only severity 3-4. A bar built from his words that cannot see his words is the same failure as a
  success bar the model always meets. So the instrument is now tested against the build he rejected before
  it may gate. If the self-rating does not separate the two builds, simulated overwhelm is not a measure at
  all and the expert counts carry bar 9 alone; that is worth knowing for every later tier.
- **2026-10-30, tier 4 report:** success is saturated; the data is truthful; what is left is cost -- people
  pay steps to check what the screen did not show them. Score cost and "preview equals result" directly.
- **2026-10-21:** the cheapest next round is one where the instrument moves first; report pre-round numbers
  as previews. Build the tool's planted cases from the criteria table row by row.
- **2026-10-19..21:** regressions come from a fix flipping one switch its neighbors depend on; list the
  routes that cross the switch and re-walk those. When two decided behaviors own one thing (the camera),
  write down which wins in the overlap. A rule the tool does not enforce is a wish.
- **Standing:** simulated readers succeed where tasks send them. The owner judges by interaction
  consistency. When three lenses land on one defect, the cause is usually one gate in one file; read every
  `ponytail:` note saying "the element has no X". Truth and loss outrank polish.

## Sources

- Tier 5: `tier5/{criteria,tasks,answers,roster,decided,owner-feedback-2026-11-01,placement-study}.md`;
  dry run triages `tier5/dry-run-r1-{1,2,3,4,5,6}.md` (pass 6 pilots: main checkout
  `tmp/design-studio/tier5/r1d2/pilot/`; pass 4 pilots: main checkout
  `tmp/design-studio/tier5/r1d3/pilot/`; pass 5 pilots: `r1d1/pilot/`), `tier5/backlog.md`, `tier5/rejected-fixes.md`; pass 2
  pilots under the main checkout's `tmp/design-studio/tier5/r1d1/pilot/`; pilots under the main checkout's
  `tmp/design-studio/tier5/r1/pilot/<task>/`;
  reviews in `notes/{researcher,user,redteam}.md` (81e993f52d, 65a6f779a1, 6946dd5032); frozen build
  `tmp/design-studio/tier5/builds/tier5-r1d1-d13c2ff3da` (main checkout); rejected-card build copy
  `tmp/design-studio/tier5/prep/build-7ca4cae647`; walks `tmp/design-studio/tier5/materials/p1..p9`.
- Tier 4: `tier4/{criteria,tasks,answers,roster,decided,backlog,rejected-fixes}.md`; round 1
  `tier4/rounds/round-1/{plan,scores,insights}.md`; dry run triages `tier4/dry-run-r1-*.md` (see their git
  history); builds under the main checkout's `.study-builds/tier4-*`.
- Tier 3 and 2: `tier3/{criteria,tasks,answers,roster,decided,design}.md`, `tier3/dry-run-r1-*.md`,
  `tier2/criteria.md`, `tier2/rounds/round-{1..5}/`.
- Tools: `tool/{real,bars,steps,score,wording,endstate}.mjs`, `tool/README.md`.
- Owner items: `owner-decisions.md`.
