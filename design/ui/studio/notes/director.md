# Design Director -- designer's notes

Role: I run the graphty design studio. I frame the problem, synthesize what the other designers and
the participants say, break ties with evidence, and own the success criteria and the round plans.
I want a small, sharp, coherent product. Read this file at the start of every session; update it
whenever I decide something, learn something, or change my mind.

Last updated: 2026-11-02 (dry run pass 7, the first fix pass on the round's build 0c163f54bf).
Summarized on 2026-10-17, 2026-10-18, 2026-10-19, 2026-10-20, 2026-10-21, 2026-10-29 (three times),
2026-10-30 (five times) and 2026-11-02 (four times); the full earlier text is in this file's git history.

## Top of mind

- (2026-11-02) DRY RUN PASS 7 on 0c163f54bf (`tier5/dry-run-r1-7.md`): 293 pilot lines, 8 fix now
  in two units, both graphty app: fill-box-truth (a just-added color line shows no color and Enter
  writes nothing; item 8's Fill box repro) and busy-close-focus (the close hands focus back only if
  the reader has not moved on; a regression of pass 3's busy-Done fix). 247 backlog rows. This is
  fix pass 1 of the 2 the cap allows; the second takes only what the bars' re-run on 0c163f54bf
  still fails (50,000-node lists, axe) and new grade spoilers.
- (2026-11-02) Item 8's two calm-first "two counts" candidates are two facts by the criteria's own
  log (a second card or step separates them; `T77A/detour-1 03.png`); the skeptics still owe the
  written refutation. Do not send them to fix.
- (2026-11-02) TIER 5 CRITERIA FROZEN AGAIN for the rounds after the second three reviews. The next
  build must carry 4fb3f45d59 (matches strip search, value picker scroller) and d801a0fddd (large
  repaints); items 5, 8, 9 and T79's timings are re-read on it, never carried over from d3fda9f2b6.
- (2026-11-02) Bar 9 now: calm-first (0 sev 3-4, at most 3 sev 2) where the sev 2 allowance also
  counts an editor element named in the "least sure" answer by two sessions on different halves at
  any rating, and each T79 wait > 10 s without progress. The median is a measure only (the rating
  check failed: gap 1.5 of 2). Elements outside the editor (Fill box) go to the backlog.
- (2026-11-02) Item 8 reads its candidates from files: `bars.json` / `bars-light` `ok:false`,
  serious axe, sev 3 in `calm-first-frozen.md`, answer-key build notes, a Fill box repro. The gate
  reads only some of them; a tool check for the rest is still owed (a rule the tool does not
  enforce is a wish).
- (2026-11-02) Calm-first check owes: every listed screen on the frozen build (reference picker at 11
  and 50,000, the 50,000-node checklist, words at rest), a blind per-complaint calibration, every
  "+" listed, and "two counts" only when no reachable state separates them.
- (2026-11-02) Dry-run cap after this freeze: 2 fix passes limited to the gate's open items and new
  grade spoilers, then round 1 starts; a blocked half is "blocked, not run", a failing bar "failing
  before the round". Six passes produced zero sessions; only sessions measure the bars.
- (2026-11-02) Prompts: T74 B "journeys ... go through" (not "routes": Shortest route's keyword),
  T75 drops "at the middle"; follow-up asks for the least-sure moment, anchor "you knew what to do
  next". `wording.mjs` grades prompts only: 0 shared words on d3fda9f2b6's vocabulary.
- (2026-11-02) Each finding counts once, toward the smaller allowance (bar 9 before bar 7).
- (2026-11-02) Owner items for tier 5, breaking or Figma only: 5 element and 5 compact-mantine (see
  the tier 5 report); eight reversible "For the owner" entries are built, not his decision.
- (2026-11-02) The tier 5 report was written before any session (0 run); a subagent cannot write
  `tier5/report.md`, so it goes back as text.
- (2026-10-30) Tier 4 lessons that shaped tier 5: freezing with a known bar-failer backlogged fails the bar
  by construction; each decided fix gets its own acceptance check; wrong turn = input before success;
  preview must equal result.
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

- **2026-11-02, dry run pass 7** (`tier5/dry-run-r1-7.md`, `decided.md` "Dry run pass 7"). Fix now:
  fill-box-truth (item 8 names it; it was backlog in passes 1 to 5 because only the screen-reader
  name looked wrong, but the box itself draws a color nothing paints and Enter commits it) and
  busy-close-focus (`answers.md` "can spoil the fill"; one check in the shared close). Not taken: the
  hiding layer's key (not-success route), nodes under overlays (the canvas is the frame), the calm-
  first double counts (two facts by the criteria log), the bars' failures (4fb3f45d59 aims at each;
  re-run first). Why: the cap limits this pass to item 8 and new spoilers, and the round must start.
- **2026-11-02, tier 5 criteria after the second reviews, frozen for the rounds** (researcher
  7e4f4e71aa, red team 7881e4e012, user advocate ba5a319098; they agreed on almost every point).
  Taken: bar 9 counts named elements at any rating and T79 waits; "two counts" needs a reachable
  state separating them, checked against spec 2 and 3.0; every "+" listed with a pass rule; a
  tier 5 words budget (whole screen 50; workspace about 30, 40 at most; headings 3) counted by
  script; blind per-complaint calibration; the calm-first check walks every screen it lists; item
  1 requires the fixes since d3fda9f2b6; item 8 by file; findings count once; placement-study
  fixes as rates against baselines; one-domain features reported as such; the dry-run cap that
  starts the round instead of stopping; T74 B and T75 reworded, other shared words kept with
  reasons, T76 "everything" and T78 "pair"/"count" walked as detours; `wording.mjs` grades prompts
  only. Not taken: dropping the 1-to-7 rating (a measure for comparison); showing the owner three
  screens now (the report carries before-and-after). Why: the owner's complaint must be able to
  fail the round, and a bar that holds because a screen was skipped or a rule cannot fire is a
  false pass.
- **2026-11-02, tier 5 report before round 1** (returned as text). Every bar "not measured" with its
  preview; only breaking or Figma-lock owner items. Why: previews dressed as results would be the
  false "done" bar 2 forbids.
- **2026-11-02, dry run passes 1-6** (summarized; `tier5/dry-run-r1-{1..6}.md`, `tier5/decided.md`
  "Dry run pass 1" to "pass 6"). Fixed: the false "covered" claim, the data table under the
  workspace, a test's mode, reference names, one count base, Cancel on a new card, "Drawing" on
  every blocking 50,000-node edit, record pages after a history move, an empty undo history at a
  setup start. Rules: a fix-now unit stays open until a build carries it; item 8 makes every named
  sev 3 candidate a blocker. Not taken: nodes under the toolbar (the canvas is the frame), keyboard
  and screen-reader rows (backlog).
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

- 2026-11-02 (dry run pass 7) -- Worked: reading item 8's files (bars.json, calm-first-frozen.md, the
  rating check, the answer key's build notes) before the defect list, which turned a long-standing
  backlog row (the Fill box) into the gate's item; reading the pilot's `route.jsonl` for T79 A
  detour-4, which showed the batched steps (Done, Fill +, type) a session can send in one call, so the
  focus steal is reachable in a session; reading `PropertyRow.tsx` to find the mechanism (`shown`
  falls back to the starting color whenever the layers beneath vary) before naming the unit; the
  criteria log's own ruling on "two counts". Did not work: nothing new; a 293-row list again needed
  a generator script with an assert on the total.
- 2026-11-02 (criteria, second reviews) -- Worked: running `wording.mjs` and filtering out the rating
  question's words, which showed the follow-ups made half the hits; reading the catalog's keyword
  dump in `vocabulary.json` to tell a real lure (a search keyword: "route") from a deep result name
  ("In the pairing"); reading the design-studio skill to learn the workflow refreezes after my
  freeze, so the refreeze is a gate rule, not my build. Did not work: nothing yet; the next dry run
  shows whether the new bar 9 rules fire.
- 2026-11-02 (tier 5 report) -- Worked: listing the round's session folders before writing (30
  folders, each only `briefing.md`) instead of trusting the plan; reading the tool dry run's
  "Problems" as the gate's state; grepping `owner-decisions.md` for tier 5 "For the owner" entries
  and keeping only breaking or Figma-lock ones. Did not work: writing `tier5/report.md` from a
  subagent (refused again, as in tier 4); the workflow should write it from the returned text.
- 2026-11-02 (dry run passes 4-6) -- Worked: `git merge-base --is-ancestor` on each unit's fix commit
  and `git diff --stat <previous> <frozen>` before reading defects (pass 5 showed no code change, so
  pass 4's units were simply unbuilt); reading a fix's mechanism next to the pilot's symptom (the
  table cache keyed on commands, not history moves); reading `roster.md` for screen-reader sessions
  before classing spoken counts. Did not work: trusting a quiet defect list when no re-pilot walked
  the unit's route.
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

- **2026-11-02, dry run pass 7:** a defect that sat in the backlog for five passes as "screen reader
  only" was a visible lie all along (a swatch of a color nothing draws); the class came from the row's
  first wording, not from looking at the screen. Read the screenshot, not only the line. And every
  fix that holds the screen longer (pass 3's busy Done) opens a window where the reader acts first:
  ask what the reader can do during the wait, and what the end of the wait does to it.
- **2026-11-02, second criteria review:** all three reviewers found the same shape of defect: a
  rule that cannot fire (4+ ratings), a check that did not walk its own screens, a list naming an
  old build's problems, a cap nobody enforced. Each passes by construction. The test for every bar
  is now: name the state of the build in which it fails, and check the instrument actually looks
  at that state.
- **2026-11-02, tier 5 report:** the dry run converged on what crashes, blocks and spoils, but the
  gate failed on things no pilot grades: a list with no search, axe findings, words shared with the
  prompts, and two instrument checks never run. A dry run's triage should read the scripted gate's
  output every pass, not only at the end, or the studio learns its round is blocked after six passes.
  And a fix-pass cap nobody enforces is a wish: the tool should count passes and refuse the next.
- **2026-11-02, dry run passes 4-6:** a re-pilot only sees the routes it is told to walk, so check
  the build carries every unit before trusting "nothing spoils"; an instrument that builds a start
  by clicking leaves traces a real start never has (ask what a reopened saved project would NOT
  have); what is left after six passes is one family, keyboard and screen-reader users around Undo
  and Redo, which only the accessibility walk can test.
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

- Tier 5: report returned as text 2026-11-02 (meant for `tier5/report.md`); round 1 `tier5/rounds/round-1/{plan,tool-dry-run-1,tool-dry-run-2}.md`, `bars/`, `bars-light/`; briefings under the worktree's `tmp/studio-sessions/tier5/rounds/round-1/sessions/`;
  `tier5/{criteria,tasks,answers,roster,decided,owner-feedback-2026-11-01,placement-study}.md`;
  dry run triages `tier5/dry-run-r1-{1,2,3,4,5,6,7}.md` (pass 7 pilots on 0c163f54bf: main checkout
  `tmp/design-studio/tier5/r1/pilot/`; pass 6 pilots: main checkout
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
