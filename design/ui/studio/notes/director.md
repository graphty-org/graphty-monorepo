# Design Director -- designer's notes

Role: I run the graphty design studio. I frame the problem, synthesize what the other designers and
the participants say, break ties with evidence, and own the success criteria and the round plans.
I want a small, sharp, coherent product. Read this file at the start of every session; update it
whenever I decide something, learn something, or change my mind.

Last updated: 2026-11-05 (tier 6 dry run pass 2 triaged).
Summarized on 2026-10-17 to 2026-10-21, 2026-10-29, 2026-10-30 and twice on 2026-11-05; the full earlier text is in this file's git
history.

## Top of mind

- (2026-11-05) TIER 6 DRY RUN PASS 2 TRIAGED: 57 lines on 3549e11129, 4 of them notes; 9 fix now (0 crashes, 0 blocks,
  9 spoils; 7 repeats, 2 new, 0 regressions), 1 decided, 41 backlog, 2 sessions, three units, `tier6/dry-run-r1-2.md`.
  Next: build `chip-row`, `export-scope`, `last-read`, re-match `answers.md`, refreeze, walk their routes.
- (2026-11-05) The rejected chip-row fix had the right rule and the wrong layer: the binding outlives the selection in
  `settleTarget`. One cause behind seven rows. Binding ends when the selection empties, for good within the message.
- (2026-11-05) `last-read` is a prompt line and may only lower the odds of a 5 or 9 chip. If it does not hold, the key's
  `Build decided` line stays and the report gives both numbers. Do not reach for a second chip.
- (2026-11-05) Pass 1 total: 24 fix now of 232, ten units. Pass 1's fixes all held, with no regression.
- (2026-11-05) Two selector faults in graphty-element lie behind the 63, 361 and 24 chips the pilots filed as
  separate panel defects: a lone `false` read as a column, and a negative rule true on every edge that lacks the
  column. Reproduced in a script. Pilots reported symptoms in four tasks; the cause was two lines of predicate logic.
- (2026-11-05) A rule-language fix is not an API break when the old answer contradicts the file's own promise
  (query.ts: a path nothing answers matches nothing). Both recorded as the team's.
- (2026-11-05) Backlog's first line: the model acting after a no (Keep them hid the seven) and changing the selection
  on a plain question. Truthful on screen, so not a spoil; both are the model's acts, and a tool or prompt rule is
  the likely fix between rounds.
- (2026-11-05) TIER 6 CRITERIA FROZEN, 12 bars: `tier6/criteria.md`. One round, then fixes walked again; the bars
  gate fixes, not a further round.
- (2026-11-05) The doubt lives in follow-ups: T92, T93 and T95 prompts stop at the outcome, and `Taken on trust:`,
  `Checked:` and `Card:` grade the first report. A prompt that asks "how sure" measures obedience.
- (2026-11-05) The planted wrong count is a selection, not a falsified reply: T92 A starts with the 14 people
  selected; 6 of 9 against the file's 7 of 12. Prose against a chip stays untested and is the report's first limit.
- (2026-11-04) ASSISTANT DESIGNED: `tier6/design.md`, `tier6/decided.md`, research in
  `design/ai/assistant-chat-research.md`. A rail place, not a window. Plain text is the model's, a chip is computed, a
  change line is what happened. Undo on the newest step only.
- (2026-10-30) Give each decided fix its own dry-run acceptance check: four of fifteen walkthrough fixes in tier 4
  were never built as decided, and a dry run graded only on spoils did not notice.
- (2026-10-30) Run `git diff <earlier> <frozen>` over source FIRST in any later triage; an earlier walk stands when
  the diff is code its route never reaches. Fix bar-failing defects before freezing.
- (2026-10-21) Same-model participants: a failure is strong evidence, a pass is weak. Two skeptics settle scores.
- (2026-10-19) Before a fix lands, list the routes that cross the switch it flips and re-walk those. A docs-only
  commit never refreezes.
- Owner items open: eleven, all breaking, defaults or a saved-file format (`owner-decisions.md`).

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

- 2026-11-05 (dry run pass 2) -- Worked: reading `rejected-fixes.md` before any row; it named the cause and the rows
  fell into it. Worked: `work.json` across every walk plus the typed messages, which settled that T92 is untouched by
  the dead Open run. Worked: reading the screenshot behind a mechanism marked not proved (two Algorithm results steps
  last, then 'Changed the graph'). Did not work: nothing failed; the T92 A report is missing from the study's folder, so
  those rows rest on the pilot's list and the screenshots.
- 2026-11-05 (dry run pass 1) -- Worked: reading the element before classing; a five-line tsx script against
  `compileExpressionPredicate` turned four tasks' chip complaints into two causes. Worked: the rows file plus
  generator with per-task counts asserted (232 rows). Worked: reading `design/ai/assistant-coverage-design.md` before
  touching rollback: the rule is right and the failing call is the fault. Did not work: pilot severity as a class
  (a 3 is harm, not a block). Note: the pilot's `session.log` holds no tool arguments, so a failed call cannot be named
  from the records; a line per failed call would have settled `run-scope`.
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

- Tier 6: `tier6/{criteria,tasks,answers,roster,decided,design,backlog,rejected-fixes,dry-run-r1-1,dry-run-r1-2}.md`; pilots
  `tier6/rounds/r1/pilot/<task>/report.md`, screenshots under the main checkout's
  `tmp/design-studio/tier6/r1/pilot/`; generators `tmp/director-dryrun-t6/` and `tmp/director-dryrun-t6-2/` in the studio worktree.
- Tier 4: `tier4/{criteria,tasks,answers,roster,decided,backlog,rejected-fixes}.md`, `tier4/rounds/round-1/`, dry runs
  `tier4/dry-run-r1-*.md` (each file names the triages it replaced).
- Tier 3: `tier3/{criteria,tasks,answers,roster,decided,design,bulk-edit-plan,decisions-round-6}.md`,
  `tier3/dry-run-r1-*.md`; tools `tool/{real,bars,score,wording}.mjs`.
- Tier 2: `tier2/criteria.md`, `tier2/rounds/round-{1..5}/`, `tier2/dry-run-*.md`.
- Builds: `.study-builds/`. Owner items: `owner-decisions.md`.
