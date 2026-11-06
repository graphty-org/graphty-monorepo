# Design Director -- designer's notes

Role: I run the graphty design studio. I frame the problem, synthesize what the other designers and
the participants say, break ties with evidence, and own the success criteria and the round plans.
I want a small, sharp, coherent product. Read this file at the start of every session; update it
whenever I decide something, learn something, or change my mind.

Last updated: 2026-11-05 (tier 6 round 2 read; 30 units decided for round 3).
Summarized on 2026-10-17 to 2026-10-21, 2026-10-29, 2026-10-30 and twice on 2026-11-05; the full earlier text is in this file's git
history.

## Top of mind

- (2026-11-05) ROUND 3 DECIDED: 30 units in `tier6/rounds/round-2/decisions.md`, 15 from the round and 15 from the
  backlog (153 rows marked). No breaking change, nothing in compact-mantine, no bar moved.
- (2026-11-05) The round's faults share a shape: the screen says less than the graph did, or says it where the reader
  is not looking. No sentence added: facts join existing lines, the placeholder replaces words. Bars 7 and 9 stay as read.
- (2026-11-05) ONE CHANGE PER PROBLEM, or round 3 credits nothing. T92 A's plant retests the placeholder alone; the
  scope word and a scope row under You wait for that result. Re-run T92 A and T90 after units 3 and 7.
- (2026-11-05) Requests: 3,669 of 5,000 spent, 1,331 left. Reserve 480 for the 12 sessions BEFORE any dry run.
- (2026-11-05) Owed by the study, not a unit: the 193-screen audit (bars 10, 11), the conversation returning with a key,
  and the 400% walks copied into `repro/`. Bar 9 stays open until they are there.
- (2026-11-05) Autosave's tooltip fix answers no session: no reader saw it. Finding 1's label stays open at 2. Say so.
- (2026-11-05) A read mechanism is measured before it is built on. The log's fix starts with one CSS line and a number;
  the observer exists only if that falls short.
- (2026-11-05) Open question worth keeping: sets and filters the model makes leave nothing to find, because
  `VisibilityApi` rules and the Data place's filter cards are two models. Needs a design, not a unit.
- (2026-11-05) Budget a tier's dry runs against its sessions BEFORE the first pilot. Three dry-run passes ate round 1.
- (2026-11-05) A build must carry an acceptance check per fix, and never freezes on an empty source diff.
- (2026-11-05) The doubt lives in follow-ups: T92, T93 and T95 prompts stop at the outcome. A prompt that asks "how sure"
  measures obedience. Prose against a chip stays untested and is the report's first limit.
- (2026-11-04) ASSISTANT DESIGNED: `tier6/design.md`, `tier6/decided.md`. A rail place, not a window. Plain text is the
  model's, a chip is computed, a change line is what happened. Undo on the newest step only.
- (2026-10-21) Same-model participants: a failure is strong evidence, a pass is weak. Two skeptics settle scores.
- (2026-10-19) Before a fix lands, list the routes that cross the switch it flips and re-walk those.
- Owner items open: ten older entries, all breaking, defaults or a saved-file format. None comes from tier 6.
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
