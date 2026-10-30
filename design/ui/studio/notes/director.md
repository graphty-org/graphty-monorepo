# Design Director -- designer's notes

Role: I run the graphty design studio. I frame the problem, synthesize what the other designers and
the participants say, break ties with evidence, and own the success criteria and the round plans.
I want a small, sharp, coherent product. Read this file at the start of every session; update it
whenever I decide something, learn something, or change my mind.

Last updated: 2026-10-30 (tier 4 dry run pass 6 triaged on build a53beb7179).
Summarized on 2026-10-17, 2026-10-18, 2026-10-19, 2026-10-20, 2026-10-21, 2026-10-29 (three times) and 2026-10-30;
the full earlier text is in this file's git history.

## Top of mind

- (2026-10-30) TIER 4 DRY RUN PASS 6 on a53beb7179 (`tier4/dry-run-r1-4.md`): 83 rows, 7 fix-now in 1 unit,
  all repeats: U1, the Select card's count, now restored by `git revert 0b1175dabc` (355022569a unchanged;
  no code under it moved). 1 decided, 2 design questions, 58 backlog (57 met before), 15 not defects.
- (2026-10-30) U1 was reverted TWICE for an unfinished re-walk and re-found on four passes. New decided entry:
  a fix-now unit is taken back only for a regression its re-walk shows; the freeze waits for the re-walk.
  If the next pass finds U1 again, check first whether a revert landed, before anything else.
- (2026-10-30) A pilot's "matches the answer key" is not "no defect": T65 B said none while the card read
  5 of 12 with 3 selected; the key grades around it. Class by the screen, not by the key.
- (2026-10-29) Before re-sending a reverted fix, diff what merged since (`git diff <revert> HEAD -- <files>`);
  empty means revert the revert, never rewrite it. Key on the predicate the behavior uses, not a literal.
- (2026-10-29) A wrong mark is (a) only when the table is the one screen naming the answer; otherwise backlog.
- (2026-10-29) "Graded around by the answer key" is not harmless; if the key's rule is settled design, it is (n).
- (2026-10-29) Decided but not built is backlog, not (n) (Open button, Filter to / out, detected-role marks).
- (2026-10-29) A route walked on the frozen build counts as walked; check `session.json` buildStamp per
  folder, not the pilot's word.
- (2026-10-29) A team entry that contradicts an earlier decided entry must name it; I record the reversal.
- (2026-10-29) Bars: 1 success (pointer only); 2 false done 0; 3 wrong turns median <= 2; 4 severity 3-4
  open 0; 5 keyboard (Sam S/SD + axe); 6 owner's data rules 0; 7 core median steps <= key path + 3.
- (2026-10-29) Still owed before the round: `data.json` from `--end` and the end-state check; the scripted
  tier 4 walk with wording and axe; words-at-rest budget.
- (2026-10-29) Every start must match the persona's history; a task half the program does cannot fail.
- (2026-10-21) Same-model participants: a failure is strong evidence, a pass is weak.
- (2026-10-19) Before a fix lands, list the routes that cross the switch it flips and re-walk those.

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
  moment the step commits.
- **The obvious first choice does the thing** ("Show labels" matched and did nothing; 12 of 21).
- **Every count names its unit and its whole, and is live.** A count that hides something offers
  the way out beside it. A list answers with names, not counts.
- **Nothing pre-done in a first session; no first-run interface; no unbuilt item drawn.**
- **Words: one label per command, everywhere; field-standard terms; American spelling; no two
  reachable controls share an accessible name.** Screen at rest with a graph loaded: about 50
  words of app text.
- **No confirmation dialogs for undoable acts; Esc closes the innermost thing first.**
- **Every focus change says where focus goes instead; after adding a field, focus is where the
  next keystroke belongs** (2026-10-17: three adds failed this on one build).
- **The key and the drawing never disagree** (2026-10-17: now an audit check on every last
  screenshot).
- **Time to first drawing under 2 minutes; the user runs at least one analysis; the user can say
  what they see** (designloom workflow W14).

## Decisions and reasons

- **2026-10-30, tier 4 dry run pass 6 on a53beb7179 (`tier4/dry-run-r1-4.md`).** 83 rows (81 reported,
  T60A and T61A split by class), generator `tmp/director-dryrun6/gen.mjs` (per-task count asserts; every
  evidence path checked). Fix now: U1 only, repeat, seen by five pilots (T62 A, T62 B, T65 A, T65 B, T67 B);
  evidence `r1d3/pilot/T65A/q1-T65A-path/17.png` (5 of 24, 4 selected). Unit: `git revert 0b1175dabc`
  (restores 355022569a; `git diff 0b1175dabc HEAD` on its files is empty), answers.md T65 by hand (the docs
  revert 555cbb52b8 is not reverted: the key moved under it), finish the re-walk, then freeze. New decided
  entry "A fix-now unit is taken back only for a regression its re-walk shows". (n): Tab with "ho" typed
  takes the highlighted field (decided Tab rule). Not (a): T63 B's place chips (Fields names the place),
  T68 B's source-row Export (scope says 0 of 14 edges first), T61 A's Escape on the join screen (files not
  lost), T67 B's With issues 0 (end state graded).
- **2026-10-29, tier 4 dry runs passes 1-5** (summarized 2026-10-29 and 2026-10-30; full text in git history
  and `tier4/dry-run-r1-1.md`, `-r1-2.md` at 028483e572 and 8f1aa15875, `-r1-3.md` at cc562d52cd and as of
  a2544e0dde). Pass 1
  (0ffeae2ef5): 8 units (source-row chips, a false refused-row issue, Add data... to the join screen, one
  kind drawing, a date condition card, the Data source card's `side: "nodes"`, Export scope, a weight given
  after the load). Pass 2 (037e96e9bb): 3 units (Select within the picture, run reuse reads the Data
  weight, result rows named by `nodeName`) and the reversal of pass 1's Select entry. Pass 3 (ff17391bb1):
  1 unit, the Select card's count (a regression of pass 2's fix). Pass 4 (same build): U1 again plus U2,
  an unknown end's warning on the end that is unknown (`params.ends`, additive). Pass 5 (bccf8fe47f): U1
  again, refixed on `selectsOverGraph` (355022569a), then reverted unfinished again. Not (a) across them:
  answer-key-graded cosmetic and keyboard-only rows, decided-but-not-built team entries, T61's repeat
  resolved on the join screen (b), Replace of the same file, PASS INCOMPLETE notes whose routes were walked.
- **2026-10-29, tier 4 criteria reviewed and frozen** (three reviews: researcher, user advocate,
  red team; they agreed on most points). Taken: grade from step log and end-state records
  (`data.json`), not the last screenshot alone; end-state check in bar 4; audit confirms only what a
  screenshot shows, expert + repro counts; bar 1 pointer-only with stated arithmetic; axe in bar 5;
  new bar 7 (core median steps <= key path + 3, fixed before data); gate refuses "pilot to
  confirm"; fix coverage reported. Tasks: T60/T64/T65 echoes removed; T65 B moved to the gauges
  (yes/no, number, date) on a tidied start; T63 must name the place columns; T62 needs a changed
  kind; T68 starts narrowed; Sam takes T61 A (file chooser, join screen) instead of T62 A; histories
  rewritten so each start is the person's or a colleague's saved project; 28 sessions. Not taken:
  a new single "lat, lon" data file for T63 (re-walks every gauge setup; the report requirement
  gives the half a fail mode at no cost); starting T60 B from an open project for the Sources "+"
  door (it would merge two networks and muddy the counts; reported as not re-tested). Build:
  rebuilt `graphty/dist` at 7de2dc4e23 (the dist on disk was 90e0f8470c, before the SonarQube
  refactor) and copied read-only.
- **2026-10-23, Layout and Analyze section pattern (issue #3315)** (summarized 2026-10-29; full
  spec in git history). Headings for both lists, every row under one, no indentation; Layout's
  sections come from the catalog's `family` fact (Force-directed, Shapes, Hierarchy, Other), the
  app owning words and order. Rejected: indentation, flat lists, an expanding Force row.
- **2026-10-21, tier 3 round 1, its report and dry run pass 3** (summarized 2026-10-29; full text in
  git history, `tier3/dry-run-r1-3.md` and the tier 3 report). Round 1 closed on the skeptic-settled
  insights; bar 1's F stood under the frozen rule (a frozen rule changed after results makes the grade
  mean nothing); the report put instrument work ahead of product fixes and recounted the owner list
  entry by entry. Dry run pass 3 (758b8e8081): 141 lines, 0 (a); a held selection asks for nothing
  after the pick (narrows the glide).
- **2026-10-20, dry run passes 1 and 2 on 7d87760756 and 6de5f95d12** (summarized 2026-10-21; full
  text in git history and `tier3/dry-run-r1-1.md`, `-r1-2.md`). Five units, all fixed and held: a
  project opens with its look across a channel rename; the table names community groups as the key
  does; Replace with the same file keeps hand-picked layers; a layer from a selection takes its
  conditions before a look (`addRow` admitted what `update` refused); Undo across Replace redraws
  from the layers. Each settled in `decided.md` 2026-10-20.
- **2026-09-26..10-20, earlier tier 2 and tier 3 decisions** (summarized 2026-10-29; full text in
  git history, `tier3/decided.md`, `tier3/design.md`, `tier3/bulk-edit-plan.md`,
  `tier3/decisions-round-6.md`, the tier 3 criteria change log and `tier2/rounds/*/decisions.md`).
  Kept from them: the round 1 build must hold golden; design problems confirmed across two halves;
  docs-only commits never refreeze; bar 4 pointer sessions only; key-and-drawing on every last
  screenshot; Style rows are layers and folders only, per-group colors are value-table entries;
  unset and cover are two acts; the app sets `startingRows` and `runPlacement` (consumer choices);
  before naming an element addition, read the API report; the owner judges by interaction
  consistency; Figma is the paved path for chrome; tiers, tier 1 first; the element is neutral
  about presentation.

## Tried: worked / did not work

- 2026-10-30 (dry run pass 6) -- Worked: `git log` on rejected-fixes.md and the reverts first; it showed U1
  reverted a second time for "incomplete", which explained four pilots' rows before reading any of them.
  Worked: `git diff <revert> HEAD` on the fix's files (empty) to justify a plain revert-the-revert. Worked:
  grepping all earlier triages for each row's key words; 57 of 58 backlog rows were repeats. Did not work:
  copying a backlog table header by line number from an earlier section (took the separator; fixed by
  asserting the header text).
- 2026-10-29 (dry run pass 5) -- Worked: listing walk folders with their `session.json` buildStamp first;
  reading rejected-fixes.md and `git log` before classing U1's origin; `git merge-tree` before the refix.
  Did not work: the workflow reusing `dry-run-r1-3.md` again.
- 2026-10-29 (dry run pass 4) -- Worked: grepping every earlier triage for each defect's key words before
  classing; reading the answer key's newest commit (it had turned U2's wrong screen into a grading note);
  checking the data files for which end is unknown; checking each pilot's build stamp.
- 2026-10-29 (dry runs passes 1-3; summarized 2026-10-29, full text in git history) -- Worked:
  reading the element before classing (`selectedBy`, the source leaf's `side`, `loadedWeight()`,
  `countsNow`'s cache key, `RunsApi.resolve`); checking a claim against the data file; looking at the
  screenshot (and the other half's last one) before writing a unit; `git log` on decided.md for team
  entries landing after a pass; `jq` over every `rewalk.json` to prove PASS INCOMPLETE routes were
  walked; classing repeats by the earlier row id. Did not work: the pilots' "BLOCKS keyboard" label
  (friction once checked against the roster); claiming repeats were "word for word" unchecked;
  numbering units before the last demotion.
- 2026-10-29 (tier 4 freeze) -- Worked: searching `graphty/src` strings for each prompt word; it
  found four echoes the hand-written avoid list missed. Worked: starting the changed
  `volunteers.txt` setup on the frozen build before committing it (a PageRank layer coloring 24
  people, no SETUP FAILED). Did not work (found by review): a roster whose per-task starts were
  right but whose persona histories never mentioned those files.
- 2026-10-21 (round 1, its report, dry run pass 3; summarized 2026-10-29) -- Worked: two
  independent skeptic checks with a drop/weaken rule; re-reading every owner heading instead of
  copying a list; checking pre-round claims against the round's measurement; reading the element's
  camera code before classing a jump; `session.json` commits to prove an "unwalked" route was walked.
  Did not work: leading task wording and a success bar the model always meets (55 of 56); writing a
  report file from a subagent (the harness refuses it; return the text).
- 2026-10-19..20 (summarized 2026-10-29; full text in git history) -- Worked: a Node repro against the
  built element before writing a unit; walking an unjudged (a) candidate myself; reading `answers.md`
  grading before classing spoils; one rows file plus a generator with asserts; reading each fix commit's
  message before classing origin; grepping for a decided rule's code before calling a regression;
  reading `gateCheck` before taking a red-team claim. Did not work: a reused pass file name; prose counts
  copied from an earlier pass; "does not pass until" sentences in preflights; a new build for a
  docs-only commit.
- 2026-09-27..10-18 (summarized 2026-10-29; full text in git history) -- Worked: root-causing in
  source; grepping on-screen strings to find the owning file; reading `owner-decisions.md` before
  classing; triaging by mechanism; lists, not tables, for long triages; checking reviewer claims
  against the tool. Did not work: judging a focus fix alone; a fix nobody grepped for siblings;
  counting steps differently for key and participants; launching more pilots than browser slots.

## Thinking

- **2026-10-30, dry run pass 6:** the fix stage treats "the re-walk did not finish" as a failure and reverts,
  while the triage treats it as nothing found. The two stages had no shared rule, so the cheapest outcome for
  the fixer (revert, record, move on) cost a whole pass each time (passes 5 and 6 both re-found U1). A rule
  only binds the stage that reads it: the new entry is in decided.md, which the fix stage reads; the freeze
  step should also refuse a build while rejected-fixes.md has an open entry.
- **2026-10-29, dry run pass 4:** the answer key and the triage drifted apart again: the key-matching
  step after a re-pilot writes grading notes for whatever the pilots saw, including wrong screens. The
  key-matching step should not run before the triage; or every new grading note it adds should come to
  me as an untriaged defect. A wrong mark on a known value (P05 for P13) is a "spoils" even when the
  counts are right, because the prompt asks what did not fit, not how many.
- **2026-10-29, dry run pass 3:** both regressions in this dry run share one shape: a fix gives an
  answer a new input (the Data weight; the picture) and the numbers derived from that answer, and
  their caches, keep reading the old inputs. For the next fix that adds an input, list every number on
  screen derived from the changed answer and every cache key on the path, and put each in acceptance.
- **2026-10-29, dry run pass 2:** pass 1's 8 units all held, and pass 2 found 4 rows, one of them a
  regression from a fix that added a default input (the Data weight) without adding it to the cache
  key. A fix that makes the element read something new by default must also make every cache and
  reuse check read it. The other three came from the decision log moving under a frozen build; a
  team entry written after the freeze is an untriaged fix request and must be classed in the next
  pass, not left to the answer key.
- **2026-10-29, dry run pass 1:** the answer key had quietly become a list of workarounds: each
  build defect the pilots found got a grading rule instead of a fix. A key that grades around a
  wrong screen keeps the round honest but measures the build's defects as the participants' cost.
  Next tier, the key-reading pass and the triage should be the same pass, so a defect is either
  fixed or deliberately graded around, never both by accident.
- **2026-10-29:** six of 23 fix-now rows came from two review fixes meeting on one row (R9's chip,
  R11's counts) or opening a new door (R14's source-row Export). A review fix that adds a control to a
  shared row or a new door to a shared dialog needs its neighbors walked before the freeze.

- **2026-10-21, after round 1:** the cheapest next round is one where the instrument moves first.
  Every pre-round claim I carried as a measurement (contrast on every screen, the private-window
  notice gone with a disk profile) was narrower or different once the round measured it. Report
  pre-round numbers as previews, and expect the round to restate them.
- **2026-10-21, round 1:** success is saturated with same-model participants, so the next tier's
  bars should score cost (steps over key, wrong turns, routes) and named problems, not completion.
  The cheapest high-value fixes are shared ones where the product's words disagree with its
  drawing (`colorWord`) and where an action gives no visible result (default-valued new lines).
- **2026-10-21, tier 3 report:** a whole tier of work reached the owner with no round run, and
  the thing holding it back is the instrument again, as at tier 2's end. The tool has now had two
  readiness checks, and each found a bar it claimed to read and did not. Before the next tier,
  build the tool's planted cases from the criteria table row by row (each bar x each size x each
  theme), so a missing cell is a failing test, not a reviewer's find.
- **2026-10-21, dry run pass 3:** the most-walked defect came from two settled rules meeting (the
  owner's glide to a pick, the drawing staying put when a key arrives). Neither rule was wrong; the
  element had no rule for the moment after the pick. When two decided behaviors both own the
  camera, write down which one wins in the overlap before anyone fixes either.

- **2026-10-20 (summarized 2026-10-21):** two halves of one verb disagreeing (`addRow` vs
  `update`, Undo restoring layers but not the drawing) is the element's recurring defect shape;
  pilot the next verb on any newly accepted state. A merge from upstream is an untriaged fix pass:
  walk one file saved by the previous build. A frozen document naming a build needs a
  script-checkable rule.
- **2026-10-19, r1-5:** the regressions are not spread out; they come from a fix that answered one
  complaint by flipping a single switch the complaint's neighbors also depend on (when to frame,
  whether the list starts open, where focus goes after a write). Before a fix group lands, list
  the routes that cross the switch it flips and re-walk those, not the task that reported it.
- **2026-10-19, criteria review:** a rule the tool does not enforce is a wish. Three of this
  review's findings were rules already written (three walks, keyboard walk, five walk screens)
  that the gate or the walk never checked. When I write a preflight rule, name the script line
  that refuses it and the planted case that proves it, or list it as owed.
- **2026-10-17..18 (summarized 2026-10-21; full text in git history):** criteria reviews and
  readiness passes r1-2 to r1-4 kept finding instrument gaps before product gaps; build planted
  cases from the criteria table, and walk unwalked screens before trusting a bar.
- **2026-10-11, tier 2 end:** the instrument, not the product, limited what we learned. Simulated
  readers succeed where tasks send them; fixes sat where tasks did not go.
- **2026-10-12, owner review 1:** the owner judges by interaction consistency, not model fidelity.
  Ask of every new row or control: does a reader learn a rule that applies nowhere else?
- **When three lenses land on one defect,** the cause is usually one gate in one file. Every
  `ponytail:` note in the app saying "the element has no X" was a finding three experts later
  reported; read those notes at review time.
- **When a fix adds a column in 240 px,** count what each column holds before building.
- **Truth and loss outrank polish.**

## Sources

- Tier 4: `tier4/{criteria,tasks,answers,roster,decided,backlog,rejected-fixes}.md`; dry run pass 6 `tier4/dry-run-r1-4.md`
  (build a53beb7179, re-pilots in `tmp/design-studio/tier4/r1d3/pilot/`, generator `tmp/director-dryrun6/gen.mjs`); dry run pass 5 `tier4/dry-run-r1-3.md`
  (build bccf8fe47f, re-pilots in `tmp/design-studio/tier4/r1d2/pilot/`, generator `tmp/director-dryrun5/`); dry run pass 4 `tier4/dry-run-r1-2.md`
  (build ff17391bb1, second re-pilot in `tmp/design-studio/tier4/r1d1/pilot/`, generator `tmp/director-dryrun4/gen.mjs`);
  dry run pass 3 `tier4/dry-run-r1-3.md` at cc562d52cd
  (build ff17391bb1, re-pilots in `tmp/design-studio/tier4/r1d2/pilot/`, generator `tmp/director-dryrun3/gen.mjs`);
  dry runs `tier4/dry-run-r1-2.md` at 8f1aa15875
  (build 037e96e9bb, re-pilots in `tmp/design-studio/tier4/r1d1/pilot/`, generator `tmp/director-dryrun2/gen.mjs`)
  and `tier4/dry-run-r1-1.md`
  (build 0ffeae2ef5, pilots in the main checkout's `tmp/design-studio/tier4/r1/pilot/`; generator
  `tmp/director-dryrun/gen.mjs` and `units.json` in the studio worktree).
- Tier 3 study: `tier3/{criteria,tasks,answers,roster,decided}.md`; dry runs `tier3/dry-run-r1-3.md` (build 758b8e8081, 2026-10-21, pilots in `tier3/rounds/r1d2/pilot/`; the 2026-10-18 pass on 5bd16cda6e is at b296635060), `tier3/dry-run-r1-1.md` (build 7d87760756, 2026-10-20; the 2026-10-17 pass on 58556989e8 is at 7c241de4b), `tier3/dry-run-r1-2.md` (build 6de5f95d12, 2026-10-20, pilots in `tier3/rounds/r1d1/pilot/`; the 2026-10-17 pass on ed4351b258 is at 98b7f9a4df), `tier3/dry-run-r1-4.md` (build 6dd0b00bd7, pilots in `tier3/rounds/r1d2/pilot/<task>/<route>/`); tools `tool/{real,bars,score,wording}.mjs`,
  `tool/bars-limits.json`; pilots `tier3/pilot-materials/`, `tier3/build/{walk-p1..p3,pilot-bulk*}/`.
- Tier 3 reviews: `notes/{researcher,user,redteam}.md` (2026-10-17: 05f4ee91a, 863ebb9a8,
  de16901f7; 2026-10-19: c1ebeeff4, 34b1e3ce0, 881ad2550; 2026-10-20: 16b22cb0d, 70575b0cf, 3bdcc279b); stopped pass 5 in `tier3/rounds/r1/pilot/`; my walk of the proposed screens in the worktree's `tmp/director-freeze/explore*`.
- Tier 3 design: `tier3/design.md`, `tier3/bulk-edit-plan.md`, `tier3/decisions-round-6.md`,
  `tier3/owner-feedback-1.md`, `tier3/decide/`, `tier3/iterations/{1,2,3}/`, `tier3/style-catalog.md`.
- Tier 2: `tier2/criteria.md` (frozen), `tier2/rounds/round-{1..5}/`, `tier2/dry-run-*.md`.
- Builds: tier 3 bulk 7 `tier3-bulk7-457aa9f0f2`; tier 2 round 5 8c015b806
  (`.study-builds/tier2-r5-8c015b806/`).
- Owner items: `owner-decisions.md`.
