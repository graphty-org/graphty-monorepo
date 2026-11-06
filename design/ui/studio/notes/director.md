# Design Director -- designer's notes

Role: I run the graphty design studio. I frame the problem, synthesize what the other designers and
the participants say, break ties with evidence, and own the success criteria and the round plans.
I want a small, sharp, coherent product. Read this file at the start of every session; update it
whenever I decide something, learn something, or change my mind.

Last updated: 2026-11-06 (round 2 closed; round 3 frozen on a80da6d62e; stale tier 5 duplicate sections cut).
Summarized on 2026-10-17 to 2026-10-21, 2026-10-29, 2026-10-30 and twice on 2026-11-05; the full earlier text is in this file's git
history.

## Top of mind

- (2026-11-06) ROUND 3 RUNS ON a80da6d62e (`tier6/criteria.md` line 1). Before any session, check each of the 30 units
  has its acceptance re-walk on that build; a unit with no walk is not credited.
- (2026-11-06) Round 2 lesson: the Assistant works (11 of 12, no false "done", Undo 2 of 2, no sev 3 confirmed). What
  is left is the screen saying less than the graph did, or saying it where the reader is not looking. Watch those.
- (2026-11-06) Bar 7 failed on how it is read (session end after the reader closed the tab), not on Undo. Read bar 7
  at the step the task is done; record that reading before round 3 scores, not after.
- (2026-11-06) Bar 9 stays OPEN until the 400% walks sit in `repro/`; the 193-screen audit (bars 10, 11) and the
  conversation returning with a key are owed by the study, not by a unit.
- (2026-11-05) ONE CHANGE PER PROBLEM, or round 3 credits nothing. T92 A retests the placeholder alone; the scope word
  and a scope row under You wait for that result. Re-run T92 A and T90 after units 3 and 7.
- (2026-11-05) Requests: 1,331 of 5,000 left. Reserve 480 for the 12 sessions BEFORE any dry run.
- (2026-11-05) Autosave's tooltip fix answers no session: no reader saw it. Finding 1's label stays open at 2. Say so.
- (2026-11-05) A read mechanism is measured before it is built on: one CSS line and a number first, an observer only if
  that falls short.
- (2026-11-05) Open design question: `VisibilityApi` rules and the Data place's filter cards are two models, so sets and
  filters the model makes leave nothing to find. Needs a design, not a unit.
- (2026-11-05) The doubt lives in follow-ups: T92, T93, T95 prompts stop at the outcome. Asking "how sure" measures
  obedience. Prose against a chip stays untested and is the report's first limit.
- (2026-11-05) A build carries an acceptance check per fix and never freezes on an empty source diff.
- (2026-11-04) Assistant design: `tier6/design.md`, `tier6/decided.md`. A rail place, not a window. Plain text is the
  model's, a chip is computed, a change line is what happened. Undo on the newest step only.
- (2026-10-21) Same-model participants: a failure is strong evidence, a pass is weak. Two skeptics settle scores.
- (2026-10-19) Before a fix lands, list the routes that cross the switch it flips and re-walk those.
- Owner items open: ten older entries, all breaking, defaults or a saved-file format. None comes from tier 6.

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

- **2026-11-06, round 2 closed.** Kept the round's settled reading: 0 sev 3 confirmed, 11 at sev 2, bars 7 and 9 not
  moved by a unit. Reason: the skeptics' rows, not their summary lines, are the count; bar 7's miss is the bar's
  reading point, so the fix is the reading, not the product. Round 3 is frozen on a80da6d62e with the 30 units of
  `tier6/rounds/round-2/decisions.md`.

- **2026-11-05, tier 6 round 3 units.** 15 from the round, 15 from the backlog. Reasons: severity first, with the
  400% page first because bar 9 reads it and a pointer reader has no other way to a key. Took the red team's cuts over
  the roles' extra forms, because each extra form was a rider on a measured line. Kept its ordering except two calls of
  mine: the status-less failure keeps a second button against the advocate (a named cause with no door is a notice),
  and Settings gets the media block, not its floor, which cannot help the one-column case. A painting run joins the
  Computed line rather than adding a row: `styleEffects` is one effect per channel. Rulings: a rollback is not a reader's
  Undo, so the kept reselect does not reach it; the x outlives closing, so the build was wrong and not the entry. Open
  run landing on Values went in despite five roles saying leave it: their reason was one click, but a blank tab is a
  dead landing, and only an empty Style changes. Refused a task with one bad key: bar 3 reads a real answer, so a
  scripted walk covers it.
- **2026-11-05, tier 6 report.** Say first that no reader saw the Assistant, and keep the bars in three classes rather
  than one row of "did not hold". Recommend 4,500, not the entry's 4,000. Reasons: the 200 for 26 gate walks was never
  computed; 2,822 requests over 151 pilot walks is at most 19 a walk (re-walks are not in that denominator), so up to
  about 490, and with 480 for sessions and about 110 for fix walks 4,000 covers the best case only. Running short twice
  costs more than $2.50. The cap stays his: nothing in the owner's words or the history settles it, though $150 a month
  would hold it. Named the two selector fixes as near the line, as tier 4's report did for the weight role: they change
  what an expression returns, and the team's reason is the 2026-10-28 rule on bringing an API to its written contract.
- **2026-11-05, tier 6 round 1 close.** Take `insights.md` as settled, and as walks only. Reasons: 0 sessions ran, so no
  bar that reads "in every session" can pass or fail; bar 8 fails narrower and bar 10 did not hold on its state list.
  The stop stands: spending is the owner's, so nobody uses `REAL_GEMINI_COUNT` to get past the cap. Dropping sessions
  to fit is his alternative, not mine to take. The disputed selection in `k1/99.png` was settled from the route log,
  not by argument: the model made it (x appears at step 50, walker's chip press at 84).
  Two calls `scores.md` leaves to me, both yes: fix first, then freeze and walk, since no walk exists on this build and
  walking first would pay for 26 walks twice; and the round starts over from clean folders with no re-run spent, since
  no session started. The second still needs its line logged in `criteria.md` when the round restarts.
- **2026-11-05, tier 6 dry run of 48879618c4.** 15 of 63 fix now. Reasons: every row a build note explains stays a
  repeat, not a new fault. The x keeping six moved from backlog to fix now, since two of three replies now hold no seven
  and `Build decided: yes` is the test for a spoil. The second request is new and on T93's own path: the grade is the
  report agreeing with the network. Totals restart after approval rather than a batch being let through when it
  measures nothing, because a small write after an approved removal would otherwise still show the old card. T91 A's 15
  chip joins `last-read`: the pilot read it as the line failing, but the line is not in the build. T93 A's 9 chip is
  decided, since the request is what T93 grades. Notes stay a class of their own though the brief names four: a build
  note is no defect and no backlog item.
- **2026-11-05, tier 6 dry run pass 2.** 9 of 53 defects fix now. Reasons: `Build decided: yes` stays the test for a
  spoil, which makes the chip of 5 under 7 a spoil though every count is true. Its fix is the model's read order, since
  the row itself is decided and may not read prose. Open run doing nothing stays backlog though rated 3: the key says it
  is no step on T95, and every T92 walk that asked fact 1 kept its run. The 'Selected 0 nodes' rows ride with chip-row as
  one defect, whatever their rating. Binding ends rather than the clear being refused, because a refusal leaves the
  model's own offer dead. Export takes a target, not only the bound selection, because 'export those five' under Whole
  graph is the same false file.
- **2026-11-05, tier 6 dry run pass 1.** 24 of 232 fix now. Reasons: a row with a route past it is backlog however
  the pilot rated it (Done dropping a key leaves an honest screen); `answers.md`'s `Build decided: yes` lines are the
  test for a spoil, since they name a careful reader marked wrong; keyboard-only rows go to backlog by this pass's
  rule, with bar 8's Undo focus first in line. Deleting a layer leaving its run stays for the sessions: the key already
  reports it through bar 7. The export is the one block: the step's result never appears and nothing else does it.
- **2026-11-05, tier 6 criteria.** Applied the three reviews where they converged (returning readers,
  doubt moved to follow-ups, bars 4 to 8 tightened, a state list behind bar 10). Added bar 11 from the
  advocate and bar 12 in place of the red team's gate on severity 2s: answered, not fixed, since a quick
  round gates on harm. Rejected: a tool option for a mid-session failure (the `REAL_GEMINI_COUNT` file
  gives one free) and a model instruction that falsifies counts (the selection plant needs a setup only).
  T92 A went to Dev, a believer, because a doubter on the plant measures the briefing.
- **2026-11-04, Assistant concept.** Panel in the rail, with the chip reply language and the
  reviewed transcript grafted in. All four reviews ranked the panel over the window, and the window's
  covered-node failure is the worst one: a reader checks the wrong picture. Rejected: the window;
  folding older turns; prose mentions as chips (launders model claims); a Quick actions door as the
  no-key path; a model dropdown in the composer; glyph marks beside chips.
- **2026-10-23, Layout and Analyze section pattern (issue #3315; full text in git history).** Headings
  for both menus, every row under one, no indentation in any pick list: indentation cannot carry the
  Graphviz engines, and Layout's four headings come from the catalog's `family` fact.
- **2026-10-21 and before (summarized 2026-11-05; full text in git history).** Tier 3 round 1 closed on the
  skeptic-settled insights; bar 1's F stood under the frozen rule; dry runs stayed against `decided.md`; a tier 3
  build iteration kept two row kinds, layers and folders; Style lists only a layer's own entries; the app sets
  `startingRows` and `runPlacement`; label size in screen pixels is additive; before naming an element addition, read
  the API report. Tier 2 closed on 8c015b806; the gate lives inside `real.mjs --start`; briefings name file and kind
  only. Owner: Figma is the paved path for chrome; tiers, tier 1 first; element neutral about presentation.

## Tried: worked / did not work

- 2026-11-06 -- Worked: cutting the stale tier 5 Top of mind and the duplicated Tried/Thinking/Sources tail (44 KB to
  about 29 KB); the full text is in git history.

- 2026-11-05 (round 3 units) -- Worked: reading `Checks.tsx`, `derive.ts` and `RunsApi` before ruling; three "lacks" fell.
  `painting()` is public, every suggestion carries a color channel, `data-disabled` is already styled. Worked: reading
  the `results` `top` action, which showed round 1's selection line is still open. Worked: a marker script
  with per-unit counts for 153 backlog rows, run dry first. Did not work: my crude scan for write tools lacking
  `effects` (helpers hide them), so unit 6 asks the walk to name the tool behind any "Changed the graph" left.
  Unknown: `expert/a11y.md` is not in round 2's folder; round 1's counts by `from-round-1.md`.
- 2026-11-05 (tier 6 report) -- Worked: running `--gate` again and reading the count file rather than quoting `scores.md`
  (13 `FAIL` lines, 3,000 bytes). Worked: counting pilot walks to test the 200 estimate. Worked: `git diff` between
  builds for the by-package table. Worked: issue #1727's table to clear stale "for the owner" entries (histogram and
  edge band are decided there). Did not work: Write of `tier6/report.md` from a subagent, again; the harness refuses it,
  so the text goes back in the reply and the launching session saves it. Do not route around that with a shell write.
- 2026-11-05 (tier 6 round 1) -- Worked: two skeptics again, and settling a disagreement at its source (route log,
  `decided.md`, CSS arithmetic) rather than splitting it. Worked: expert walks and source reading still found nine
  problems with no session. Did not work: three dry-run passes with no reserve for the sessions, so the gate
  refused the round only once too few requests were left. Did not work: a private count file let the accessibility
  walk make 4 real requests past the cap (3,004 in all): the cap binds only through the shared count file. Did not work: `scores.md` raising bar 11 and a 3 on Talk from
  reading alone; both came down. Unknown still: every mechanism unless marked run; no skeptic re-ran anything.
- 2026-11-05 (dry run of 48879618c4) -- Worked: `git diff` over source first, as the notes say; it turned 13 rows into
  one fact. Worked: reading `largePreview` and the second-request screenshot before ruling; the pilot's mechanism held.
  Worked: checking a pilot's claim against the build ('the line does not always hold', when the line was never in it).
  Did not work: the freeze itself, a docs commit frozen as a build, against my own 2026-10-19 rule. A freeze step needs
  a line that refuses an empty diff.
- 2026-11-05 (dry run pass 2) -- Worked: reading `rejected-fixes.md` before any row; it named the cause and the rows
  fell into it. Worked: `work.json` across every walk plus the typed messages, which settled that T92 is untouched by
  the dead Open run. Worked: reading the screenshot behind a mechanism marked not proved (two Algorithm results steps
  last, then 'Changed the graph'). Did not work: nothing failed; the T92 A report is missing from the study's folder, so
  those rows rest on the pilot's list and the screenshots.
- 2026-11-05 (dry run pass 1, summarized) -- Worked: reading the element before classing; a rows file with per-task
  counts. Did not work: pilot severity as a class (a 3 is harm, not a block).
- 2026-11-05 (tier 6 freeze) -- Worked: walking each proposed setup before ruling. `--expect API key` first in every
  setup stopped a race. Did not work: `--expect selected=N` reads table rows, not canvas selection.
- 2026-11-04 (Assistant) -- Worked: checking each review claim in source before ruling, and measuring the caption fit.
  A reviewer's "the element lacks X" is a lead to grep.
- 2026-10-30 (tier 4) -- Worked: `insights.md` before `scores.md`; `scores.md`'s fix coverage table; two independent
  skeptics. Did not work: Write of a report file from a subagent (the harness refuses it: return the text); freezing
  with a known bar-failing defect.
- 2026-10-29..30 (dry runs) -- Worked: `git diff --stat` over source first; `git log` on rejected-fixes and reverts;
  grepping earlier triages for each row's words; `session.json` buildStamp per walk; searching `graphty/src` strings
  for prompt words. Did not work: pilots' "BLOCKS keyboard" label; numbering units before the last demotion; grep -o
  with long spans; reusing file names and pass numbers.
- 2026-09-27..10-21 (summarized) -- Worked: root-causing in source; one change per path; a Node repro before a unit;
  reading each fix commit before classing origin; lists, not tables, for long triages. Did not work: a fix nobody
  grepped for siblings; prose counts copied from an earlier pass; leading task wording; judging a focus fix alone.

## Thinking

- **2026-11-05, round 3:** nine critics converge on the same screens, so the risk moved from missing a defect to each
  role adding one more line to the same turn. A red team that counts lines is worth more than a tenth critic. The
  critics' best find was not in any grade: neighboring text contradicting itself (placeholder under the scope line).
  The screen audit should compare neighbors, not read rows alone.
- **2026-11-05, tier 6 report:** a stale decision entry is worse than none, because its options change as the numbers
  move: "drop sessions" stopped being an option at 0 left. Restate an owner item's options whenever its figures change.
  The last five fixes have no written acceptance record beyond the engineer's notes; next tier, each fix's acceptance
  result goes in a file the report can cite.
- **2026-11-05, tier 6 round 1:** an instrument's budget is part of the study design, and the dry runs that protect a
  round can consume it: each pass was right on its own, and together they left no round. The Assistant's faults share a
  shape: the state that decides a message (scope, focus, a rolled-back selection) moves without a line, while the words
  stay honest. Truthful counts did hold. A claim of harm needs a reader who paid; a walk shows only what is on screen.
- **2026-11-05, dry run of 48879618c4:** a limit that counts a running total needs a rule for what closing the limit
  does to the total, and a frozen scope and a model's memory are the same drift: the screen moved on and the words
  did not. A remedy the study offers must be walked as a remedy, not only drawn. Writing a fix in a triage is not
  building it: check the commits before reading the next pilots' rows as evidence about the fix.
- **2026-11-05, tier 6 dry run pass 2:** a value frozen at send time and a screen that reads live state will drift
  apart, and the drift looks like a panel bug. Look for the frozen copy first. A fix that makes something visible (the
  export arriving) can expose the next fault behind it, so walk the result, not only the arrival.
- **2026-11-05, tier 6 dry run:** panel rows pointed at the element, as they keep doing: a chip is only as true as
  the selector behind it, and the app was right to show what it was given. When the same wrong number shows on
  several surfaces, go below all of them first. Next tier, add a tool line that records each failed call's name and
  code without its arguments.
- **2026-11-05, tier 6 criteria:** all three reviewers found the same shape: a bar can pass while the thing it studies
  never happens. Before freezing a bar, ask what it reads if the trap never fires.
- **2026-10-30, tier 4:** success is saturated, the data is truthful, and what is left is cost: people pay steps to
  check what the screen did not show. Score cost, and score "preview equals result" directly. A dry run graded only
  on spoils lets decided fixes go unbuilt. A rule changed after results makes the grade mean nothing.
- **2026-10-29..30:** both regressions shared one shape: a fix gave an answer a new input, and derived counts and
  caches kept the old one. Run the tool dry run first. A fix that adds a control to a shared row needs its neighbors
  walked before the freeze.
- **2026-10-19..21:** regressions come from a fix that flips one switch its neighbors depend on. When two decided
  behaviors both own the camera, write down which wins. A rule the tool does not enforce is a wish: name the script
  line that refuses it. Two halves of one verb disagreeing (`addRow` and `update`) is the element's recurring shape.
- **Earlier:** the instrument, not the product, has limited what we learned at every tier's end; the owner judges by
  interaction consistency; when three lenses land on one defect the cause is usually one gate in one file; truth and
  loss outrank polish.

## Sources

- Tier 6: `tier6/report.md`; round 2 `tier6/rounds/round-2/{insights,scores,plan,decisions}.md`; round 1 `tier6/rounds/round-1/{insights,scores,plan}.md` and `expert/`; `tier6/{criteria,tasks,answers,roster,decided,design,backlog,rejected-fixes,dry-run-r1-1,dry-run-r1-2}.md`; pilots
  `tier6/rounds/r1/pilot/<task>/report.md`, screenshots under the main checkout's
  `tmp/design-studio/tier6/r1/pilot/`; generators `tmp/director-dryrun-t6/`, `-2/` and `-3/` in the studio worktree.
- Tier 4: `tier4/{criteria,tasks,answers,roster,decided,backlog,rejected-fixes}.md`, `tier4/rounds/round-1/`, dry runs
  `tier4/dry-run-r1-*.md` (each file names the triages it replaced).
- Tier 3: `tier3/{criteria,tasks,answers,roster,decided,design,bulk-edit-plan,decisions-round-6}.md`,
  `tier3/dry-run-r1-*.md`; tools `tool/{real,bars,score,wording}.mjs`.
- Tier 2: `tier2/criteria.md`, `tier2/rounds/round-{1..5}/`, `tier2/dry-run-*.md`.
- Builds: `.study-builds/`. Owner items: `owner-decisions.md`.
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
