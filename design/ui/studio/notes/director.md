# Design Director -- designer's notes

Role: I run the graphty design studio. I frame the problem, synthesize what the other designers and
the participants say, break ties with evidence, and own the success criteria and the round plans.
I want a small, sharp, coherent product. Read this file at the start of every session; update it
whenever I decide something, learn something, or change my mind.

Last updated: 2026-11-03 (tier 5 report after round 1, returned as text).
Summarized on 2026-10-17, 2026-10-18, 2026-10-19, 2026-10-20, 2026-10-21, 2026-10-29 (three times),
2026-10-30 (five times), 2026-11-02 (four times) and 2026-11-03 (three times); the full earlier text is in
this file's git history.

## Top of mind

- (2026-11-03) "Condition... / Or..." sits on the owner list as a word choice, but it is a two-way
  door and round 1 is its evidence (3 sessions, 3 halves read neither as and / or else). Take
  "And... / Or..." as the team, record the reason, let round 2 check it.
- (2026-11-03) TIER 5 ROUND 1 CLOSED, studio stopped at the 1-round cap: 30 valid sessions on
  1e123d7d33. Fails bars 1 and 3 (T75 only), 4 (two sev 3), 8 (T70, T74, T78; T71 B), 9 (4 of 3, a
  floor). Holds 2 and 5. 6 and 7 not measured. See `tier5/rounds/round-1/insights.md`.
- (2026-11-03) Bar 4 = two sev 3: counts spoken from the covered inspector row (fixed after the
  freeze, re-walk), and a picker entry from a visible-scope run binding a whole-graph run. A run's
  scope is an element fact the app words; fix it there, not by renaming entries in the app.
- (2026-11-03) Next fixes, each with a repro re-walk: By position box (direction, unit, an error
  built from `card.top ?? 10` that lies), empty Fill color box and its first-click commit, "Is
  exactly" on an empty step, Clear then Escape/Done deleting a reopened card (`openedNew` check).
- (2026-11-03) Bar 9 work: the new Or group's first state (B 0, full-width untouched range), the
  words "Condition..." / "Or..." that never say and / or else, the workspace header's Tab order.
- (2026-11-03) Bar 8 cost is dominated by the color row (largest share of T70 overage), then By
  position. Cheapest cost win is there, not in the editor's structure.
- (2026-11-03) The instrument failed twice: T73's key wants a live rule the words never ask for
  (0 of 4 measures the key); "Would you rather it had shown something else?" invites a wish. Fix
  both, and vary fixture colors vs asked colors, before round 2.
- (2026-11-03) Bars 6, 7, 9 lacked feeds AGAIN: content designer, interaction designer and
  calm-first walks did not run. Make them part of the round's launch, gated like sessions.
- (2026-11-03) One round per run was too few to close a tier with 5 failing bars; next run needs
  room for fix, refreeze, re-walk and a second round.
- (2026-11-03) Launch path: gate check before launch, stop at first shared refusal, ONE smoke
  session before the roster (the 60-void first attempt).
- (2026-11-03) The report file is refused from a subagent every tier (fourth time today); return
  the full report as text and let the workflow write `tier5/report.md`.
- (2026-11-02) Owner items for tier 5, breaking or Figma only: 5 element, 5 compact-mantine. Round
  1 added none.
- (2026-10-30) Freezing with a known bar-failer fails the bar by construction; each decided fix
  gets an acceptance check that walks one step past its own action. Same-model participants: a
  failure is strong evidence, a pass is weak; settle every score through two skeptics.

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

- **2026-11-03, tier 5 round 1 closed.** Studio stops at the cap with bars 1, 3, 4, 8, 9 failing.
  Carry-over order for the next run: the two sev 3 (scope of a run as an element fact), then the
  four repro'd sev 2, then bar 9's three elements, then the T73 and follow-up rewording. Why: bar 4
  and bar 9 are the owner's; cost (bar 8) mostly falls out of the color row and By position fixes.
- **2026-11-03, tier 5 report after the valid round 1** (returned as text; Write refused). Two
  results tables: the void attempt (short, expert parts only) and round 1 after both skeptics, with
  per-half cost inline. T73's 0 of 4 is reported as a key fault, not a build failure (both
  skeptics); bar 7 reads 3 confirmed, not scores.md's 5 (the yes-or-no title fell to 1, the Tab
  order moved to bar 9). Each package change carries a "confirmed by round 1?" column. Owner list
  unchanged at 10. Why: the reader needs to see which pre-round fixes people confirmed (checklist
  0 of 6 wrong, Escape 0 of 3, key 39 of 39) apart from what only the dry run saw.
- **2026-11-03, tier 5 report after the void attempt** (returned as text). Round 1's void attempt
  does not count toward the cap: a round that never showed the app is a tool failure.
- **2026-11-03, dry run pass 8** (`tier5/dry-run-r1-8.md`, `decided.md` "Dry run pass 8"). No fix
  now. Backlog, not fix now: focus leaving the color box after Enter when a busy close ends (the fill
  is set and `answers.md` grades the fill the layer ends with; only a correction typed next would
  miss), and Escape in the color box (takes a just-added line away with its typed text; swallowed
  with nothing typed; Enter, Tab and "+" still reach the fill). Settled by the framework's key table
  (`interaction-patterns.md` line 702), not by a new opinion: pending edit, Esc reverts and stays;
  no pending edit, Esc goes on to the overlay or the section heading; Enter commits and stays. Why:
  the cap allows two fix passes, and nothing on a success path or listed detour crashes, blocks or
  spoils.
- **2026-11-02, dry run pass 7** (`tier5/dry-run-r1-7.md`). Fixed fill-box-truth (a box drawing a
  color nothing paints, item 8's repro) and busy-close-focus (keys typed during a busy Done went to
  shortcuts); left the bars' failures for their re-run, nodes under overlays (the canvas is the
  frame) and the calm-first double counts (two facts by the criteria log).
- **2026-11-02, tier 5 criteria after the second reviews, frozen for the rounds** (researcher
  7e4f4e71aa, red team 7881e4e012, user advocate ba5a319098; summarized 2026-11-03, full text in
  git history). Taken: bar 9 counts named elements at any rating and T79 waits; "two counts" needs
  a reachable state separating them; a scripted words budget (screen 50, workspace 30-40,
  headings 3); fixes as rates against placement baselines; the dry-run cap starts the round. Not
  taken: dropping the 1-to-7 rating. Why: the owner's complaint must be able to fail the round.
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
- **2026-11-02, tier 5 criteria reviewed and frozen** (summarized 2026-11-03; full text in git
  history; reviews 81e993f52d, 65a6f779a1, 6946dd5032). Bar 9 split into calm-first counts and a
  rating median that gates only if a rating check separates the rejected build; "Large graphs"
  severities; bar 5 counts walk keyboard blocks; item 8 (no half blocked, no known sev 3 open).
  Froze d13c2ff3da. Why: the owner's complaint must be able to fail the round.
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

- (2026-11-03, report after round 1) Worked: `git log 1e123d7d33..HEAD -- . ':!design'` showed
  only one app fix and the runner fix since the freeze, so "what changed" is pre-freeze work plus
  a round-1 confirmation column; reading `insights.md` over `scores.md` where they differ (bar 7,
  T73, bar 9's value picker); checking that `round-1-void/calm-first-frozen.md` is on d3fda9f2b6,
  not the frozen build, before claiming calm first ran. Did not work: Write on `tier5/report.md`
  from a subagent (refused, fourth time).

- (2026-11-03, round 1 close) Worked: two skeptic checks cut overclaims (T73's 0 of 4, orange
  swatches, "drowned" color, wish-inviting answers). Did not work: running a round without the
  designer walks (bars 6, 7 unmeasured twice now); a task whose key and wording disagree.
- (2026-11-03, tier 5 report) Worked: reading `insights.md` (after both checks) over `scores.md`
  where they differ (bar 9 went "failing" to "not measured"); summing the backlog's per-pass
  section headers instead of grepping rows (722 = 136 + 158 + 115 + 78 + 235); `git log
d3fda9f2b6..1e123d7d33 -- . ':!design'` to list what changed since the last report. Did not
  work: writing `tier5/report.md` from a subagent (refused a third time).
- (2026-11-03) Did not work: launching the full 60-session roster without a recorded start gate.
  One shared cause voided every session. Worked: two skeptic checks still turned four expert walks
  into a short, cited fix list (1 sev 3, 4 sev 2) despite no sessions.

- 2026-11-03 (dry run pass 8) -- Worked: `git diff --stat <previous> <frozen> -- . ':!design'`
  first (five files, so only the two fix routes needed new eyes); reading the fix diffs to tell
  regression from pre-existing (the Escape branch in `fieldKeyDown` and the close's body check were
  untouched, and pass 7 already listed T76B.p7.7); grepping the framework's key table for the Escape
  and Enter rows instead of inventing a rule; looking at the T73 A screenshot, which showed the
  "table under the preview" is the matches strip. Did not work: the task's file name for the triage
  collided with an older pass's file; wrote `dry-run-r1-8.md` instead of overwriting history.
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
- 2026-11-02 (dry run passes 1-6, summarized 2026-11-03; full text in git history) -- Worked:
  `git merge-base --is-ancestor` on each unit's fix and `git diff --stat` before reading defects;
  reading the previous fix's diff and the engineer's re-walk notes before classing; `route.jsonl`
  timings to tell "busy with a sign" from "no sign"; reading `criteria.md` item 8 and the source
  behind each unit before naming files; one data list generating the triage and the backlog with an
  assert on the total. Did not work: trusting a quiet defect list when no re-pilot walked the unit's
  route; a regex that dropped rows with an empty cell; citing a framework line before reading on.
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

- **2026-11-03, report after round 1:** the pre-round fixes people confirmed are the truth fixes
  (no false done, key equals drawing, no wrong checklist value); the ones people never reached
  (`hops`, Edges where, history) are exactly where tasks offered an easier door (canvas
  Neighborhood, the Data place filter). A feature people route around is untested, not
  validated: the next round's task words must make the editor the only door, or stop counting
  those tasks toward the editor.

- **2026-11-03, round 1 close:** the editor's structure held (0 false "done", every Or task
  succeeded); its doubt lives in small words and empty first states. Expect the next round to move
  on wording and defaults, not a redesign.
- **2026-11-03, tier 5 report:** the studio's failures this tier were all upstream of the
  participant: a gate nobody ran, a re-run rule blind to cause, a leak check reading its own
  messages. Each was a rule written down and not enforced by the tool. Before a costly launch, ask
  the tool to prove it would start one session, not whether the roster is ready.
- **2026-11-03, dry run pass 8:** the first pass with nothing to fix. Its two leftovers are again the
  step just after the fixed one (the Enter after the typed color; the Escape after the typed text),
  as pass 3 predicted. What converged it was the answer key, not the build: `answers.md` already
  grades the end state, so a focus slip after a commit cannot spoil. Keep grading end states.
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
- **2026-11-02, dry run passes 1-6** (summarized 2026-11-03; full text in git history): each fix
  leaves open the step just AFTER it (the next Undo, the frame after the close), so a unit's
  acceptance walks one step past its own action and names every entry route; a re-pilot sees only
  routes it is told to walk; a setup built by clicking leaves traces a real start never has;
  "decided, not built" rows go first in every fix loop; a table still showing the last edit reads
  as an answer.
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
  dry run triages `tier5/dry-run-r1-{1,...,8}.md` (pass 8 pilots on 1e123d7d33: main checkout `tmp/design-studio/tier5/r1d1/pilot/`; pass 7 pilots on 0c163f54bf: main checkout
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
