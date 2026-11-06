# UX Researcher -- designer's notes

The researcher designs and runs the graphty app's studies: tasks written without interface words,
the participant personas, graders who alone hold the success definitions, and skeptic checks on
every insight and every fix. The job is to make sure a finding is about the design, not an artifact
of the study, the prototype or the task wording.

Read "Top of mind" first at the start of every session. Update the dated sections as decisions are
made and evidence comes in. Summarized 2026-11-05 (older entries folded; full text in git history).

## Top of mind

- (2026-11-05) Round 2 ran: the study's first readers. 11 of 12 succeeded, 0 false done, 0 void, 0 Sonnet. Bars
  1 to 6 hold (4 and 5 weakly), 7, 8, 9 fail, 10 and 11 did not hold, 12 open. `round-2/scores.md` is the record.
- (2026-11-05) The one confirmed 3: start screen file, changes undone, tab closed, no way back. Its weak point
  is study-made: the setup opened the file, and Ruth's briefing promised Recent projects. If skeptics hold that,
  it falls to 2 and bar 9 reads clean. Say so, never hide it.
- (2026-11-05) The key's 3 on the refused key came down to 2: neither reader blocked or misled. Untested for a
  reader with one bad key, since the prompt hands over a second.
- (2026-11-05) Bars 10 and 11 need an audit of the 193 session screens; none has run. Bar 11 found no exception.
  Don't let "12 graders, 0 exceptions" read as held: the bar names the audit and allows zero.
- (2026-11-05) Bar 5's pass is suspect: Dev, written to trust, doubted twice. One model plays every persona.
- (2026-11-05) Readers check through the table, never a chip: 0 of 12 hovered one. That door leaves rows out of
  view, moves scope and shrinks the drawing. Biggest gap between design and use so far.
- (2026-11-05) "RETURNING" was in 12 of 12 first prompts, still unfixed: 9 sessions mislabeled. Limits every
  first-meeting result. CORS lines also reached T90's participants.
- (2026-11-05) Still open: the 400% claim at 3 has no `repro/`; three rulings (rollback, the x on close, a Colored
  row for a painting run: sessions now lean yes); `answers.md` unmatched; restart unlogged in `criteria.md`.
- (2026-11-05) A `False done: no` on a session that never opened is not a pass. Same for "no leak".
- (2026-11-05) The main risk is false passes: a bar counted over sessions where its trap never fired,
  a recovery the prompt supplied, a report right after a reflex.
- (2026-11-05) Ask the doubt question after the first answer, never in the prompt. A live model is a
  second participant: the key states what the reader must conclude, never the model's words.
- (2026-10-30) A severity 3 needs its cost: a reader blocked, or a wrong belief left standing. Graders
  over-rate on one half; expert counts are not user evidence; an expert-only 3 needs a repro.
- (2026-10-30) First check of any pilot finding: the build in its walk's session.json, then tool lines
  against images: simulated participants believe a tool line over the screenshot.

## Priorities and values

- **Findings that are real.** A study that flatters the design is worse than no study: it ships
  the defect with a pass stamped on it. Every method choice is judged by whether it can produce a
  false pass.
- **The first-time user's core path first** (owner, 2026-10-02): load or pick a sample, read what
  loaded, rank, find groups, color or size by a result, labels from an attribute, a readable
  layout, find a node and its neighbors, export a picture and the numbers, save and reopen.
- **Behavior over opinion.** What ended on screen and what the participant concluded outweigh what
  they said. An opinion-only finding is held one severity level down.
- **Studies are expensive; validate before launch** (owner, 2026-09-29). Preflight, rehearsal,
  dry run and a snapshot before any paid round. A check that inspects zero items must fail.
- **Generality.** Personas validate the design; they never generate features (owner, 2026-09-26).
  No persona-specific fix, no one-domain wording.
- **Honest reporting.** Every number with its denominator, with and without deciding defects and
  cut-off sessions, and successes alongside failures.

## Design criteria

The bars live in each tier's `criteria.md` (frozen before a round; changes only between rounds,
logged). Their reasons, in short:

- **Each task >= 75-80% success, each dataset half at a floor** -- the half floor stops a
  one-domain fix passing on combined counts.
- **No confirmed severity 3 or 4.** Nielsen 0-4; confirmed = 2 sessions on different halves, a
  session or an expert plus a scripted repro, or an expert screenshot finding the audit also shows.
- **Cost measured in steps, not minutes** (the clock holds model thinking), on pointer sessions;
  keyboard personas reported apart.
- **An end-state script** for what a picture cannot show (filter and export counts).
- **A bar only a route under study can meet**; a pass around the feature does not hold it.

## Decisions and reasons

- **2026-11-05 (tier 6 round 2 scoring):** Scored all 12 bars by hand from the 12 grades, routes and logs. Kept
  r2-s09's F (bar 7 reads the end state) and its 3 (blocked is the criteria's test), and wrote the case against
  it beside it. Took the key's refused-key 3 to 2: the key says a rating stands until a session shows otherwise.
  Settled r2-s11's `Trap fired` by the key's own line, and showed bar 5 holds on either reading. Scored bars 10
  and 11 "did not hold", not held, because their named source read no session. Dropped a bundled row of two
  different acts from the confirmed list; narrowed the Undo row to one act; took Figma 18 out of bar 12's tally
  (a severity 1). Ignored `truth_on_screen`: it means something only with a false done. Reason: every claim on
  a screen or a trace. Checked: 125 calls, 21 logs, 193 screens by script; viewed 10 screens; read `remember`,
  `findKept`, the tool's pickers. Proposed nothing to `decided.md`; rulings stay the Director's.

- **2026-11-05 (tier 6 round 1, folded):** Plan took the roster's 12 rows; 24 VOID at `--start`, no gate check.
  Scored as nothing to count, fails on expert evidence, or open, so "none holds" could not read as a failure.
  Skeptics moved bar 11 to nothing to count and Talk to 2. Left `decided.md` alone. Round 2 plan: same 12 rows.

- **2026-11-05 (key matched to 8fa33aa786, 3549e11129, 48879618c4, folded):** Split each mismatch three
  ways: a door the key got wrong is rewritten, a defect giving another number gets a grading line, a
  session a defect decides gets `Build decided: yes`. Ruled a chip counting something else no backing
  but a true count; a bare id a right answer; a right fact with only prose behind it F. Graded on the
  report, never the scope line. `tasks.md` untouched: no prompt was wrong.

- **2026-11-05 (tier 6 criteria review):** Proposed changes rather than editing `criteria.md`, as in
  earlier tiers: the Director freezes. Checked before writing: every reference count recomputed from
  the files (all match); all 14 prompts and follow-ups carry none of the avoided words; two- and
  three-word overlap with the design's section 6 strings is function words only. Chose a three-way
  persona move (T95 A to Grace, T95 B to Dev, T94 B to Maren) because it puts non-doubters on the
  only task whose trap reliably fires and keeps every persona's count and the no-both-halves rule.
  Asked for returning readers on T91 A and T94 A, because someone who has never seen the layer list
  cannot miss it, so questions 1 and 3 had no possible answer. Kept T90 and T94 on people data and
  asked only that the "two domains" sentence be made true: neither task's wording depends on domain.

- **2026-11-05 (tier 6 materials):** Kept to 6 tasks by 2 halves, which is exactly the 12-session
  limit, rather than a seventh task on one half: every task then reaches two domains. Put the
  failed-message path inside T90 instead of a task of its own, because the expired key is what a
  first-time reader really meets. T93 grades reading, not obedience: a wrong remembered number
  ("about three") beside the true count, and either decision passes if the report is right, so the
  prompt never says to stop. No planted wrong count: it needs the tool to falsify a reply, so T95
  asks what the file cannot answer, which makes the model's own reading the trap. Put the message
  limit in each persona's history as money, since the product's reader does pay. Left the
  screen-reader persona to the accessibility expert, since a sixth persona would not fit.

- **2026-10-30 (tier 4 round 1, folded):** Recorded as findings, not a verdict: bars 2 and 3 were partly
  study artifacts (key definition, the tool's `tooltip: null`, hover counting); 5, 6, 7 and the join
  preview were the product's. All four 3 candidates fell to 2 or below under the skeptics.
- **2026-10-30 (tier 4 round 1 scoring, folded):** Scored by hand from grade.md lines plus `steps.mjs`
  and `endstate.mjs`; four severity 3s proposed, each a confirmed defect with a 3 from a grader or expert.
  The frozen rules stay frozen.

- **2026-10-29 to 10-30 (tier 4 plan and criteria review, folded):** 28 sessions exactly as roster.md;
  T65 B's key facts reworded so `--brief` stops refusing. Proposed eight criteria changes, applied none
  (the Director freezes); most were adopted.

- **2026-10-21 (tier 3, folded):** Two skeptics per insight (two drops = dropped, one = weakened);
  disputed claims settled at their source; scored by hand where `score.mjs` was wrong and said so;
  stopped tier 3 at round 1 (remaining failures came from the grading rule and unreached backlog).
- **2026-10-02 to 10-20 (tiers 1 and 2, folded):** Real app only; criteria frozen before a round;
  every task walked first; task words never echo the screen; VOIDs re-run as `<id>b`; change the
  prompt, not the key, when a prompt leads.

## Tried: worked / did not work

- 2026-11-05 (round 2 scoring) -- Worked: asking of a defect whether the tool could have made it (`--reopen`
  against `beforeunload`; `--upload` against the file handle), which cleared both at source; a script over the
  logs, which turned "the first prompt said returning" into 12 of 12; recounting my own table before trusting
  the headline (24 rows, 19 logs and 8 findings were all wrong in the first draft). Did not work: a regex
  for "first prompt" that read the follow-up's log first and reported two false negatives.

- 2026-11-05 (round 1, folded) -- Worked: reading the workflow script itself; `--gate` as well as `--brief`;
  skeptics' source checks; one script over all logs; a scan of one control across every route step. Did not
  work: a launch with no gate check; a route log as proof of absence (it holds names, not prose).

- 2026-11-05 (key matches, folded) -- Worked: the `\s+`-joined asserted edit script; viewing the screen
  rather than the pilot's line; `route.jsonl` for what the scope line read at a step; `facts.py`
  recomputing closeness and betweenness. Did not work: a key line naming a walk count I had not counted;
  reading only the pilot's summary.

- 2026-11-05 (tier 6 criteria review) -- Worked: one script over tasks, roster and design
  (`tmp/tier6-criteria-review/check.py`) for avoided words, phrase overlap and the reference counts;
  it also caught the histories' send, stop, message and talk, which no earlier check read. Reading
  `work.json` in the walk of T94: run list and layers matched start and end, so `look` plus
  `work.json` covers "exactly as she made it". Asking of each bar "can it hold if the design failed?"
  found more than asking if it is measurable. Did not work: a word list for leaks: "expired" sat in
  the key string, outside every prompt-word check, so read literals too.
- (2026-10-21, folded from Top of mind) `score.mjs` bar 4 took the start page's demo as the start; a
  grade.md without the three header lines is silently dropped; `--start` inside a participant's turn
  dies with the turn; backlog.md rows carry no severity; `colorWord` returns "gold" before the hue
  band. Top tier 3 insight: Graph inspector looked at first for node color (9 sessions).

- 2026-11-05 (tier 6 materials) -- Worked: walking each kind of task on the real build before writing
  its key (about 40 model calls), which found the approval's own words and the `look` hash that
  grades T94 with no script; computing every reference value from the files; `--brief` for all 12
  rows to prove the roster, prompts and facts parse. Did not work: a setup clicking Graph right
  after Save (the Settings dialog can still be open; `--expect-not` on its text settles it) or
  plain `--click Graph` (it also matches a heading).

- (2026-10-21) Worked: two independent skeptics per insight -- every single-half 3 came down to 2,
  two build defects were restated or weakened to tool artifacts. Did not work: bars that require
  "no open severity 3" while no task reaches the backlog 3s; a frozen color rule using CSS keywords.

- 2026-10-17 to 10-21 (key edits, folded) -- Worked: one asserted edit script per pass; grepping the key
  for stale phrases and old build ids after edits. Did not work: trusting pilot step totals.

## Thinking

- 2026-11-05 -- A bar that passes because the prompt supplies the exit (bar 4) measures the door, not the
  message. Neither reader learned the cause and it still held. Word such a bar for what the reader knows after.
- 2026-11-05 -- A task's failure can sit outside the feature: T94's only F came from a check the reader
  invented, on a word (Autosave) the study never targeted. End-state grading catches this; keep it.
- 2026-11-05 -- A persona that behaves unlike its brief tells on the method. Report it beside the bar it props up.

- 2026-11-05 -- A study's budget is part of its validity: a cap reached in preparation leaves findings
  with no reader behind them. Count walks and pilots against the cap before freezing the round's size.

- 2026-11-05 -- A bar worded "in every session" cannot fail on an audit with no sessions: expert evidence
  can break the design and leave the bar uncounted. Say which of the two a finding is.
- 2026-11-05 -- A bundled row ("eight findings") passes as one confirmed problem while its evidence is
  uneven. Split before scoring.
- 2026-11-05 -- A check placed at the last moment protects the data, not the budget: `--start` kept the
  round honest and still let 24 sessions and 24 graders spend themselves. Check at launch as well.
- 2026-11-05 -- A round that ran nothing tempts two false readings: "none holds, so it is broken" and
  "no false done, so that one is fine". State the denominator first.

- 2026-11-05 -- A bar's denominator should be the sessions where the thing could go wrong, not the
  sessions that ran. A trap that never fires counts as a pass under "at most 1 of 4".
- 2026-11-05 -- Reflex approval comes from repetition (research: catch rate falls after 50+ prompts).
  A single card seen by an attentive simulated reader cannot show it; say so rather than score it.

- 2026-10-20 -- A word list cannot catch an echo made of common words: "keeps its own color"
  vs "each layer's own value" shares only stop-words. Echo checks need phrases, and the spoken
  layer, where the bulk token's meaning is written out, is where the echo lives.
- 2026-10-20 -- A change log entry is a claim about the build; check it against the commit graph
  before trusting any decision that rests on it.

- 2026-10-17 -- A prompt must state the goal, and when the goal IS the meaning a new control is
  meant to convey ("every cluster keeps its own color" vs the bulk token), the session cannot
  show whether the control conveyed it. Test the control's meaning where it is a trap, not where
  it is beside the route (T46, not T47).
- 2026-10-17 -- A wording check is only as complete as the screens it walks. Every popover on a
  success path belongs in the walk, or its words are unchecked and its focus untested.
- 2026-10-17 -- "Focus never falls to the page" is too weak for creation flows: focus on the
  wrong control (a menu, a swatch) makes typing go nowhere and passes the bar. Test that typing
  lands.
- 2026-10-30 (insights) -- Worked: viewing each owner screenshot before citing it (r1-s03/20.png
  showed "deliveri...", not one letter: wording corrected). Did not work: my scoring trusted the
  tool's `tooltip: null` and grader wrong-turn counts that included post-success checks.
- 2026-10-30 (round 1 scoring, folded) -- Worked: running the scripts first; parsing grade tables with an
  assert on the row count. Did not work: a multi-line `old` string in an asserted replace.
- 2026-10-30 (plan) -- Worked: diffing roster.md and tasks.md since the plan commit before
  regenerating; briefing all 28 and tallying `REAL_DIST` and `setup:` lines.
- 2026-10-21 (tier 3) -- Worked: two skeptics per insight; re-tallying every grade from plan.md and
  each `^Grade:` line; a key-and-drawing script over last states; one screenshot per owner insight.
  Did not work: bars requiring "no open severity 3" while no task reaches the backlog 3s; counting
  one defect in three lists (count each once, at its highest list).
- 2026-09-28 to 10-11 (tiers 1 and 2) -- Worked: `git status`, `git log` and round listings after
  any stop; viewing every cited screenshot; a browser gate. Did not work: launching every agent at
  once; editing a script while it runs.

## Thinking

- 2026-10-30 -- Simulated participants trust the tool's text over the picture. Every tool line
  that says "nothing" is a claim to verify against the screenshot, before it becomes a finding.
- 2026-10-30 -- A trap that a task's order guarantees (filter first, then mark) measures the task
  as much as the default; vary the order before calling the default the cause.
- 2026-10-30 -- A fix can create the trap the next round finds: R15 made the first header click
  sort A to Z, which on ISO-day text looks exactly like a date column. Ask of every fix what a
  half-done state now looks like.
- 2026-10-30 -- A count with no rows behind it turns every task into a checking task; that shows up
  as cost (bar 7), not failure. When cost fails and success holds, look for results the screen does
  not confirm.
- 2026-10-30 -- Where people go first depends on where they stand: T67 A went to the table, T67 B
  to the source row. A decided "one home" has to carry everything the other door has.
- 2026-10-29 -- A pilot "mismatch" splits three ways: the key described a door the build lacks
  (rewrite the path), the build gives a different number for the same act (grading line while the
  defect stands), or the act cannot be done (blocked). Never fold the second into the first.
- 2026-10-21 -- A tool that measures "change from the start" must know where the start is.
- 2026-10-21 -- When every task passes, the bars that still move are cost, route share and
  confirmed problems. A design whose traps never fire may be avoided rather than understood.
- 2026-10-20 -- Echo checks need phrases, not word lists; the spoken layer is where echoes live.
- 2026-10-11 -- A study near its ceiling produces mostly study artifacts: audit prompt, history,
  setup and step count first. Priming has four sources: prompt, history, persona rules, tool text.
- **What can produce a false pass.** Task words that echo controls; a goal that states the control's
  meaning; graders accepting "I think it worked"; setups that pre-do part of a task; a fix judged on
  the easier dataset; a route around the feature counted as success.
- **What can produce a false fail.** Build defects that decide the task, tool limits, headless
  timing (name the mechanism), and the runner (time limits, slot waits).
- **Stopping simulation.** When rounds stop moving the core tasks, go to real users (graphty.app
  with opt-in usage data, 5 to 8 analysts, a real screen-reader user).

## Sources

- Tier 6 rounds: `tier6/rounds/round-1/scores.md`, `insights.md`, `expert/`; `round-2/scores.md`, `plan.md`,
  `repro/`; scripts in the worktree's `tmp/tier6-r1-score/`, `tmp/tier6-r2-score/`.
- Tier 6: `tier6/criteria.md`, `tasks.md`, `answers.md`, `roster.md`, `design.md`, `decided.md`,
  `connected-*.txt` setups; tool: `tool/tier6.mjs`, README "Tier 6 sessions". Pilot walks:
  main checkout `tmp/design-studio/tier6/prep/`.
- Tier 3: `tier3/criteria.md`, `tasks.md`, `answers.md`, `roster.md`, `design.md` (2026-10-16
  section), `bulk-edit-plan.md`, `pilot-materials/README.md`; tool: `tool/score.mjs`
  (ROUTE_TASKS), `tool/wording.mjs`, `tool/bars.mjs`; vocabulary `tmp/style-study/bars3/`.
- App words: `graphty/src/workspace/style/words.ts`, `PropertyRow.tsx`, `Groups.tsx`,
  `BindingPopover.tsx`.
- Earlier: `design/ui/studio/digests/`, `tier2/report.md`, `report.md`, round folders,
  `tmp/researcher/` scripts.
- Tier 4: `tier4/criteria.md`, `tasks.md`, `answers.md`, `roster.md`, `decided.md` (R1-R15, owner
  data rules, approved surfaces), `words-at-rest.md`, `owner-decisions.md`,
  `rounds/round-1/scores.md`, `design/data/filter-cards.md`; tools `tool/steps.mjs`,
  `tool/endstate.mjs`, `tool/bars.mjs`; reference images in the main checkout's
  `tmp/design-studio/tier4/reference/`.
