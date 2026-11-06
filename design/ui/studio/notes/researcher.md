# UX Researcher -- designer's notes

The researcher designs and runs the graphty app's studies: tasks written without interface words,
the participant personas, graders who alone hold the success definitions, and skeptic checks on
every insight and every fix. The job is to make sure a finding is about the design, not an artifact
of the study, the prototype or the task wording.

Read "Top of mind" first at the start of every session. Update the dated sections as decisions are
made and evidence comes in. Summarized 2026-11-05 (older entries folded; full text in git history).

## Top of mind

- (2026-11-05) `answers.md` now holds decided words for a build that does not exist: "the fixed build". Round 3's
  dry run must check every such line; the unit's acceptance cannot be met before then. The key's header says so.
- (2026-11-05) Round 2 critique: "Ask about this graph" stays in the composer under "Selection 14" on 3 viewed
  screens. No grade or insight named it. Fix it before any warning sentence on the scope line.
- (2026-11-05) The fold finding is probably a follow bug, not a long reply: the log stopped short with no jump button
  on 2 screens, and the follow effect has no dependency for rows landing late. Read from source, not reproduced.
- (2026-11-05) Round 2 settled in `round-2/insights.md`: 11 of 12 succeeded, 0 false done, no confirmed 3. After the
  skeptics: 11 at 2, 6 at 1, 5 unconfirmed, 1 dropped. Bars: 6 hold, 2 fail (7 as worded, 8), 2 did not hold, 2 open.
- (2026-11-05) Lead finding: the Autosave tooltip's "comes back when you reopen graphty" is false for a clean opened
  file. No way of opening a file gets a handle, so none reaches Recent projects. No reader saw that tooltip.
- (2026-11-05) Hover is a deliberate command in the tool: 1 hover in 12 sessions. Every "nobody hovered" measures
  the tool. The one-hover chip check is untested, not refuted. Fix the tool or stop reporting it.
- (2026-11-05) Bar 9 turns on the 400% claim: still no `repro/`, needs no model call. Do it first.
- (2026-11-05) Bars 10 and 11 need an audit of the 193 session screens; none has run. Don't let "12 graders, 0
  exceptions" read as held: the bar names the audit and allows zero.
- (2026-11-05) Bar 5's pass is suspect: Dev, written to trust, doubted twice. One model plays every persona.
- (2026-11-05) "RETURNING" was in 12 of 12 first prompts, still unfixed: 9 sessions mislabeled. CORS lines also
  reached T90's participants. Persona histories teach behavior: two of six insights died of it.
- (2026-11-05) Still open: restart unlogged in `criteria.md`; whether the conversation returns with a key.
- (2026-11-05) A `False done: no` on a session that never opened is not a pass. Same for "no leak".
- (2026-11-05) The main risk is false passes: a bar counted over sessions where its trap never fired,
  a recovery the prompt supplied, a report right after a reflex.
- (2026-11-05) Ask the doubt question after the first answer, never in the prompt. A live model is a
  second participant: the key states what the reader must conclude, never the model's words.
- (2026-10-30) A severity 3 needs its cost: a reader blocked, or a wrong belief left standing. Graders
  over-rate on one half; expert counts are not user evidence; an expert-only 3 needs a repro.

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

- **2026-11-05 (key matched for round 3):** This step runs before the fixes are built, so no walk of the new build
  exists. Wrote the decided words as "the fixed build", said so in the header and the log, and left the check to the
  dry run rather than claim it. Matched 3b2a7f0649 too, which nobody had: `decisions.md` asked for the new words only,
  but stale lines would have marked sessions `Build decided` for fixed defects. Kept a `Build decided` line only as
  "if it returns" where the fix rests on the model (six after the x, "at least 6", the chip of 15), since a prompt
  line cannot promise. Dropped it for a right fact 2 with only the reply's words: nothing in the build forces that.
  Counted repeating the row's "or" as `Failure read: key` by the existing "I cannot tell" line, no new rule.

- **2026-11-05 (tier 6 round 2 critique):** Proposed nine small fixes, all in the app but one. Tooltip word change over
  a file handle at open: "Your changes are kept..." is true for every case, and `showOpenFilePicker` would dodge the
  tool's file chooser and add a permission prompt. Keep the catalog's plainName and name the line with `wordsFor`: an
  app may replace it by id, and a rename is breaking. Table scroll through the existing `scrollToRow`, so no
  compact-mantine change. Refused key: "key" only for a provider with `requiresKey`. Against the insights: finding 1
  leads on severity, not on reach; the tooltip fix would not have changed Ruth's session.

- **2026-11-05 (tier 6 round 2 insights):** Applied the verdicts from each skeptic's rows, not their summary lines:
  both summaries disagree with their own rows, and skeptic 2's "10 at 2, 12 at 1" counts 11 and 11. Took row 1 to 2:
  she was not blocked and kept a true belief, so the criteria's cost is missing, and the file reopens. Led with the
  tooltip, since a false promise is the defect, not the close. Kept r2-s09's F and bar 7 as failing as worded. Bar 9
  moved to open, not hold, because 400% stands unreproduced. Rejected "stop inviting a retry": Send again is right
  for a drop. Rows with one drop (17, 22) went to no longer confirmed. Where rows differ on a fact I read the source:
  `pickFiles`, `locateFile`, `findKept`, `remember`, the tooltip, and the wheel test's comment, which names the canvas
  keeping the wheel. Left `scores.md` as written and listed its corrections in `insights.md`, as round 1 did.

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

- 2026-11-05 (key for round 3) -- Worked: viewing `T92A/success/07.png` and `detour-1/03.png`, which showed the x
  reaching seven on 2 of 2, and that Open run on a line for 14 nodes opens a 14-node run (s11 at 4), so the key's "covers
  all 24" was wrong for that case; `wc` on a download for the narrowed file. Did not work: searching `route.jsonl` for
  quoted replies: it holds control names, not prose, so a 0 hit there proves nothing; multi-line asserted anchors twice.

- 2026-11-05 (round 2 critique) -- Worked: reading a screen for what it says beside the finding, not only the finding
  (the placeholder under Selection 14); estimating a log's position from its scrollbar thumb; grepping for an existing
  API before proposing a shared-component change (`scrollToRow`). Did not work: `grep "selected"` in `TableDock.tsx`
  to find row shading; the selection reaches the table some other way.

- 2026-11-05 (round 2 insights) -- Worked: recounting each skeptic's rows against their summaries; counting Show in
  table from the `steps` field; viewing all six cited screens before citing. Did not work: grep on `route.jsonl`, which
  matches the `screen` list too and gave r2-s01 two false hits. My scoring's "a different door" came from reading the
  menu's name, not the command behind it: trace a door to its handler before saying two doors differ.

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

- 2026-11-05 -- Graders score what the task targets, so a fixed string that contradicts a moving one goes unseen: every
  grade read the scope line and none read the placeholder under it. An audit should compare neighbors on a screen.
- 2026-11-05 -- "The reader never scrolled" can hide a product fault: ask first whether the app should have scrolled.

- 2026-11-05 -- A bar counted at the session's end can fail on what a persona's rule does after the task is over.
  Read a persona rule like a prompt: it can force the very act that fails a bar.
- 2026-11-05 -- An insight about what readers did not do needs the tool to make not-doing cheap and doing free. A
  behavior that takes a deliberate command in the tool cannot show neglect.
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
- 2026-09-28 to 10-30 (tiers 1 to 4, folded) -- Worked: two skeptics per insight; viewing each cited screenshot;
  re-tallying grades from each `^Grade:` line; `git status` and round listings after any stop; a browser gate. Did not
  work: trusting `tooltip: null` and grader wrong-turn counts; bars needing "no open severity 3" no task reaches;
  counting one defect in three lists; launching every agent at once; editing a script while it runs.

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
