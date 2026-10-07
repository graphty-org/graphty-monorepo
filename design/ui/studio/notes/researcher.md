# UX Researcher -- designer's notes

The researcher designs and runs the graphty app's studies: tasks written without interface words,
the participant personas, graders who alone hold the success definitions, and skeptic checks on
every insight and every fix. The job is to make sure a finding is about the design, not an artifact
of the study, the prototype or the task wording.

Read "Top of mind" first at the start of every session. Update the dated sections as decisions are
made and evidence comes in.

## Top of mind

- 2026-10-06 -- The "failed ... 40m00s" sessions in the studio list are session agents that hit
  the 40-minute limit, which counted the wait for a browser slot (17-50 min). Not app failures.
  Do not restart: first runs with a "b" re-run are covered (r1-s03 -> r1-s03b, graded success
  with difficulty); 14 finished first runs need grading only; the 7 timed-out "b" re-runs move
  into round 2's roster; Morgan's 7 wait for the tool's screen-reader mode.
- 2026-10-06 -- Before any round 2 session: the runner fix (at most 4 agents alive, clock starts
  once a slot is held, `--end` always) proven by a dry run of 8 with a planted stop. Ease asked
  as 7 = very easy. Without these, round 2 voids the same way.
- 2026-10-06 -- Round 1 standing (partial, 29 graded): 26 succeed; 0 false "done"; bar 3 not
  shown, bar 4 borderline, bar 5 not shown pending the stale-legend repro (r1-s49b), bar 7 cannot
  pass, bar 8 expected to fail on focus. Reconcile `scores.md` with `insights.md` before any report.
- 2026-10-06 -- Round 2 tests one change per problem: Neighborhood command opens the neighbor
  list (no Degree-row cue, so the effect is attributable); Summary drops "Babet (1)"; Selection row
  and Sources tables stop dead-ending; empty "Open list" arrow gone; "No crossings" refusal line;
  wheel zoom; focus ring and focus after "+" pick; runs named by method.
- 2026-10-06 -- Watch T12 first: re-test on both datasets with fresh personas. If the routed build
  still fails, the Degree-row cue comes back. Sam's keyboard names session runs after the focus fixes.
- 2026-10-06 -- Watch T11: the pilot found "Force, flat" lays nothing out (even disc, unchanged
  after 10 s) and Spectral clumps under the toolbar. A "did not help" there is the build, not the
  participant; confirm in graphty-element before round 2 and report T11 with and without it.
- 2026-10-06 -- Watch overlays: legend, Layout popover and toolbar cover nodes (Florentine node,
  Les Mis node at 525,186, the post-search camera pushing the graph under the toolbar). Could
  decide a "find this node" step; deferred, so log every session where it bites.
- 2026-10-06 -- Pilot on e82708488 reached every walked task's end state; answer-key edits owed:
  T11 refusal words are "No crossings could not lay out this graph, so the drawing is unchanged";
  T13 Export kinds are `role=tab:Image/Data`; T8 "Group 1" matches 4 controls (first is right).
  Re-pilot again once changes 3-12 land, and re-record reference values.
- 2026-10-06 -- All participants are one model: N participants alike is not independent. Count a
  finding solid only with a `run.sh` repro or a cause in the code. Failure strong, pass weak.
- 2026-10-06 -- Before counting a finding against a bar: is the count actually false (not just
  confusing), is the step on the path, is the session valid (cut-off = void, not F)?
- 2026-10-06 -- Grade from the last screenshot and the transcript, never self-ratings; check a
  transcript.md and screenshots exist; a truncated transcript is graded from screenshots or void.
- 2026-10-06 -- Keep the short per-step think-aloud prompt (0 provider-filter stops in 35 vs 14 of
  41). Point the prompt at the studio persona files, not round 8's.
- 2026-10-06 -- Task wording never reuses a control's word (`tmp/researcher/wording-check.py`);
  run bar 8 and bar 9 scripts on the round 1 build as the baseline before fixes land.
- 2026-10-06 -- Simulated participants never hover: hover cues (DataRow tint, tooltips, dot
  tooltip) are untested either way; do not count them as passes.

## Priorities and values

- **Findings that are real.** A study that flatters the design is worse than no study: it ships
  the defect with a pass stamped on it. Every method choice is judged by whether it can produce a
  false pass.
- **The first-time user's core path first** (owner, 2026-10-02): load or pick a sample, read what
  loaded, rank, find groups, color or size by a result, labels from an attribute, a readable
  layout, find a node and its neighbors, export a picture and the numbers, save and reopen, and the
  whole chain in one sitting. Until tier 1 meets its bars, studio changes go to tier 1 problems.
- **Behavior over opinion.** What ended on screen and what the participant concluded outweigh what
  they said. Focus groups are weighted below sessions; an opinion-only finding is held one
  severity level down.
- **Studies are expensive; validate before launch** (owner, 2026-09-29). Preflight, rehearsal,
  dry run and a snapshot before any paid round. A check that inspects zero items must fail.
- **Generality.** Personas validate the design; they never generate features (owner, 2026-09-26).
  No persona-specific fix, no one-domain wording.
- **Honest reporting.** Every number reported with its denominator, with and without deciding
  defects, and successes alongside failures.

## Design criteria

The criteria a study holds the tier 1 build to. Each is a measurable bar or an observable check.

- **Every tier 1 task at >= 80% graded success** (success plus success-with-difficulty). Reason:
  the studio's bar since round 7; tier 1 was 75% in round 8, 86% without the whole-session task.
- **The whole first session (task 15) passes**: open Les Miserables with nothing run, read the
  overview, run an analysis that paints on top, size by it, add a label line bound to the name,
  export the image with its legend, and the picture matches the screen. Reason: it is the build's
  acceptance walk and was 0 of 21 in round 8.
- **No confirmed severity-4 problem unresolved.** Severity is Nielsen 0-4; 4 = cannot be done, or
  the user leaves or reports a wrong answer unknowingly. Confirmed = observed in 2 or more
  participants. Reason: a confident wrong answer is the worst outcome for a first-time user.
- **Mean ease >= 5.5 of 7**, with median also reported. Reason: published task average; never met,
  so track the round-over-round trend as the real signal.
- **Every change a step makes is visible on the canvas and the legend the moment it commits.**
  Reason: "the panel said one thing and the drawing showed another" was the most common reason
  round 8 participants would not switch to the app.
- **Every count shown is computed from live state.** Reason: fixed strings ("64 labels hidden")
  were the top trust-killer in rounds 2-8.
- **Candidate first-use bars, from the framework and the onboarding workflow** (to be chosen when
  criteria are frozen): first visualization in under 2 minutes; runs at least one analysis
  unprompted; can say what loaded and whether it loaded right; a sample is one step and a file
  three; at rest, at most 50 words of app text. Reason: the framework's own provisional targets;
  none has been measured.

## Decisions and reasons

- 2026-10-06 -- Answer key changed for round 2 without moving any bar: (1) run names list the
  method first, the round 1 result word in parentheses, both accepted; paths say which word to
  click on which build. (2) T12 gains a Neighborhood-command path (selection bar, node menu or
  G), graded like the Degree route; on round 1's build that command listed no names and stays a
  non-success there. (3) T11 records the refusal line under Method as a correct reading, not
  `false-done` and not a success. Reason: graders must grade the routed build and the renamed
  runs the same way as round 1. Evidence: `rounds/round-1/decisions.md` items 3, 7, 11, 12; the
  app code on 452285142 still has the old behavior (`commands.ts` only selects; `LayoutGroup.tsx`
  posts a notice), so the words and key counts are provisional until the pilot.

- 2026-09-28 (owner) -- Studies use simulated personas built from public sources (forums,
  YouTube, Biostars, Cytoscape and Gephi forums), each checked by a skeptical reviewer; mocks are
  shown to the owner as they appear so at least one real human is involved.
- 2026-09-29 (studio, after a script review) -- Answer keys are kept from participants. Every tree
  test and first-click test before round 7 was unsound: the key was in the prompt, and later in
  the outline file itself. Outline and answers now live in separate files, with a check that the
  outline holds no answers; one grader agent scores afterwards.
- 2026-09-29 (owner) -- Task wording must never reuse the words a fix puts on screen; every label
  change is tested on at least two domains; no one-domain special cases. Evidence: round 6's
  "money in against money out" went from ease 2.00 to 5.00 partly by word matching.
- 2026-09-29 (studio) -- An Ontology and Generality Steward gate checks every decided change before
  it is drawn. Reason: the critic had no veto, fixes were never challenged, and re-running the same
  task on the same dataset rewarded overfitting.
- 2026-09-29 (studio) -- Every flow task runs on at least two datasets from different domains, each
  with a participant from that domain. Reason: more participants on the same money screen only
  confirm the money screen; another domain's participants must see the label to object to it.
- 2026-09-29 (studio) -- Frozen core task set and a stop rule (converge on the core set; stop after
  two non-improving rounds and go to real users). Reason: a moving target with skeptical critics
  never clears "no confirmed severity 3".
- 2026-09-29 (studio) -- A landing step before a round: every decision must be visible on the
  rendered screen, checked by a separate agent, or it is excluded. Reason: 114 of 347 decisions had
  never been drawn, which spoiled rounds 5 and 6.
- 2026-10-01 (owner) -- Determine success criteria before starting.
- 2026-10-02 (studio, after round 7) -- Rehearsal: before any session, each task is clicked from
  its first screen to its last using only participant actions, and the data must stay the task's
  own. Reason: the round 7 check opened screens by address and passed 18 tasks whose end state no
  click reached; the tool's typing silently did nothing.
- 2026-10-02 (owner) -- Tier the tasks; first-time users first; at least 60% of sessions on tier 1;
  every tier 1 task starts from the empty app.
- 2026-10-02 (studio) -- Self-ratings and session summaries are not used for grades or ease.
- 2026-10-03 (owner) -- Stop mocking; build tier 1 as the real app and study that. Reason: "our
  user studies keep breaking on the fact that it's not a real app".
- 2026-10-06 (studio plan) -- The next round runs on a local production build of master plus the
  study-tool element branches, without waiting for release or deploy. Designers keep running notes.
  Success criteria are drafted, critiqued by four specialists, revised once and frozen; every task
  is walked on the real app before participants see it; up to three rounds, stopping early when the
  frozen criteria are met.

- 2026-10-06 (researcher, critique of criteria, tasks, answers, roster) -- Proposed: grade claims
  separately from tasks; per-dataset floors on two-dataset tasks; an open-ended first-look task
  for activation and time to first drawing; T1 folded into every empty start as a measure rather
  than a standalone task, T4 kept but not gating; T11's "did it help" not graded; a second dataset
  for the ranking tasks because the model knows Les Miserables (Valjean is first from memory);
  per-measure expected top threes filled in from the rehearsal run; a scripted echo check of task
  words against the build's visible text (the build shows "Connections", "Arrangement", "Recent
  projects", "Close project", "N labels, M hidden to avoid overlap"). Reason: each is a way the
  study could pass or fail for reasons that are not the design.

- 2026-10-06 (researcher, answer-key fixes after the pilot) -- Graders accept a run's on-screen
  name ("Influence", "Communities") as naming the measure; the key copies the screen's spellings
  (MmeThenardier, Woman1); T10 drops the show-all branch because no such control exists; T3's
  S needs a rows count on screen; T11's "did not help" is expected. Reason: otherwise a grader
  scores the build's words as participant error. Bar 4 and the own-file first-drawing measure were
  aligned with the build and logged. I did not loosen T13 for the CSV group numbers that differ
  from the screen: that is a build defect the round should see.

- 2026-10-06 (researcher, round 1 plan) -- 56 sessions under the studio's budget: core four at
  full size, the rest at 2-3 with an all-must-pass rule, T2 and T7 on Les Miserables dropped, T16
  at 2. Reason: the core four decide convergence and need 4 per half to tolerate one failure; a
  reduced task can still show a failure, which sends it to round 2 at full size. Alternatives
  rejected: every task at 3 (the core halves could not tolerate a single failure); dropping T16
  (the only activation measure).
- 2026-10-06 (researcher, persona allocation) -- 38 first-time sessions (68%); Elena and Tom 7
  each, Dev, Ruth, Grace 6 each (thinner files carry fewer); Morgan 7 on the criteria's list minus
  T2; Sam 3 (T15, T10, T12 other halves); the four other personas 1-3 each, mostly on the core four
  so first-time and others can be compared there. Each session is a fresh agent.
- 2026-10-06 (researcher, answer key) -- Core depth, How tightly knit and How far from everything
  else are not answers to "how much the network depends on them": F (`meaning-wrong`) on T7 unless
  corrected. A top three with a tie is right in either order of the tied names.

- 2026-10-06 (researcher, round 1 re-runs) -- A session stopped by the provider's filter, by the
  run being stopped, or that never got a browser is void and re-run with the same persona and
  task in a new folder (`b` suffix). Reason: none says anything about the design; keeping the
  persona keeps the allocation in `roster.md`. Sessions on 9d6598eea and 452285142 are pooled
  because the only visible change is one repeated header word; the report labels the build.

- 2026-10-06 (researcher, round 1 scoring) -- Sessions cut off by the runner's time limit are
  void and re-run even when graded F from the last screen (r1-s16b, s27b), with both numbers
  reported. Reason: the participant had not given up; the re-run rule above already covers "the
  run being stopped", and it was set before these results. Bar 3 counts the neighbor-list problem
  as severity 4: 4 of 4 participants missed the route and one failed; scoring it 3 would flatter
  the design. "0 hidden to avoid overlap" beside colliding names is listed as borderline for bar
  5, not counted, because the graders judged the count true. (Severity 4 reversed to 3 after
  the skeptic check, below.)

- 2026-10-06 (researcher, round 1 skeptic verdicts) -- Applied two skeptics' verdicts: two drops
  drop an item, one drop weakens it. Severity 4 on the neighbor list reversed to 3: the only F
  (r1-s17b) is a 16-step, 3-minute session ending in a bare `--end`, three graders said 3, and
  the scorer's "scoring 3 would flatter the design" overrode the graders' own call. Bar 5 items
  dropped: "18 nodes, 0 edges" beside "Edges among them 61" are both true; "Babet (1)" is
  `attributeSummary()` printing the commonest value. Lesson: before counting a finding against a
  bar, check that the count is false, not just confusing, and that the step is on the path.

- 2026-10-06 (researcher, round 2 critique) -- Proposed the smallest fixes for verified,
  reproduced problems on the core path only; held back every severity 1-2 item that rests on one
  model's shared first guess (Style-tab signpost, run names, toolbar words, "Start here"). Two
  challenges to the insights: the multi-node summary's "commonest value" is a computation over a
  column and belongs in graphty-element as a neutral fact (distinct count), not in the app; and
  `scores.md` still says bars 3 and 5 fail while `insights.md` says not shown, so reconcile before
  any report. Re-test T12 with fresh personas and new wording on both datasets after the fix.

- 2026-10-06 (round 1 close, Design Director with my input) -- The failed-in-list sessions are
  not restarted: grade the 14 valid first runs; move the 7 timed-out re-runs into round 2 instead
  of round 1 "c" runs (round 1's build leaves the served folder; rebuilding it for 7 cells costs
  more than it tells); Morgan's blocked until screen-reader mode. Rejected for round 2: the Degree
  row cue (two changes at once), Size moves, Style-tab signpost, toolbar words, "show all labels"
  (wheel zoom first). Reason: round 2 must be able to tell which change helped.

## Tried: worked / did not work

- 2026-09-28 to 2026-09-30 (rounds 1-3, static mocks; participants described clicks) -- Ease on
  repeated tasks rose 3.65 to 4.21 to 4.45. Taught: steady wording gains are real but static mocks
  cannot reveal what happens after a click; one task (clear or refer a flagged account) stayed at
  2.0 all three rounds.
- 2026-09-29 (round 4, tree test and first click added) -- Showed places were mostly right; failures
  were on settings and file jobs. Did not work: the answer key leaked, so the outline numbers were
  inflated.
- 2026-09-29 (round 5) -- Re-measured round 4 because its decisions were not drawn, and overwrote
  round 4's raw answers. Taught: fresh round folder and "decided, not drawn" exclusion.
- 2026-09-29 (round 6) -- The precondition gate FAILED and the round ran anyway; a task check
  reported "0 problems on 0 pages"; nine summaries carried higher ease than their transcripts.
  Taught: every check fails on zero items and proves it can fail (planted failures); ease from the
  transcript only. One finding held up: undo with a notice plus Ctrl+Z restoring the selection
  beat a notice alone (ease 5.12 vs 3.62).
- 2026-10-01 (round 7, first clickable skeleton) -- 23 concurrent browsers filled swap (49 GB).
  Taught: the shared 4-slot browser gate. 18 of 61 tasks could not reach their end state; on the
  14 tasks with no deciding defect, 91% success and ease 4.86. Taught: rehearsal by participant
  actions, not by address.
- 2026-10-02 (round 8, tiered tasks) -- Worked: tiering; the scripted rehearsal; grading from the
  last render (it exposed 17 of 21 false self-ratings). Did not work: the sample's pre-run results
  made task 15 ambiguous; one fixed screen after load made "did my file load or the sample?" 10 of
  10; experts drew the hardest tasks, so first-time vs expert numbers could not be compared; the
  click-by-name tool picked the first of several same-named controls, inflating wrong turns.
  Without four skeleton-decided tasks success was 90% and ease 4.59, against 83% and 4.28 reported.
- 2026-10-02 (round 8, outline and first-click methods) -- Tree test 99.7% correct but 68% direct;
  first click 87%. Taught: these methods measure where people look, not whether the step after
  works; they cannot predict task success on their own.
- 2026-10-06 (real-app study tool) -- `tool/real.mjs` drives the production build with one live
  browser per session, numbered full-window screenshots, uploads and downloads, click by name, by
  point, or on a drawn node label; it holds a browser slot and closes itself after 45 idle minutes.
  Untried in a round yet. Never more than 4 browsers at once (`with-browser.sh`); one live
  browser per session; always `--end` a session so it frees its slot.

- 2026-10-06 (T14 setup run whole) -- Worked: the corrected setup (label line on Everything,
  then PageRank picked by click) ended on an Influence row, names drawn, "77 labels, 7 hidden"
  (`rounds/pilot/T14/setup-check/01.png`). The setup log is empty on success; check the
  screenshot, not the log.

- 2026-10-06 (round 1 preflight) -- Worked: a Playwright harness of my own under the browser gate
  for what `real.mjs` cannot do (dump text and accessible names, print focus and live regions,
  record every ranking): `tmp/researcher/lib.mjs`, `ranks.mjs`, `wording-dump.mjs`,
  `wording-check.py`, `keypaths.mjs`, `sessions.py`. Did not work: my own stand-in for the app's
  file picker failed to open friends.csv by keyboard; `real.mjs` did it. Use `real.mjs` for any
  file open. Also: pressing Shift+A after clicking a run row did not add a run in the harness;
  clicking the Analyze button did (not reproduced by hand).
- 2026-10-06 (round 1 preflight) -- The re-pilot on 9d6598eea (`rounds/r0/pilot/`) reached every
  task's end state; together with the keyboard walks it settled preflight item 3 without a new
  mouse walk.

- 2026-10-06 (round 1, first run) -- Did not work: launching every session agent at once against
  4 browser slots (agents gave up waiting and ended without a session) and a think-aloud prompt
  that tripped the provider's filter in 14 of 41 started sessions. Worked: the tool itself; every
  stopped session's last screen shows the app behaving as the re-pilot did.

- 2026-10-06 (round 1 re-runs) -- Worked: the shorter per-step prompt (no filter stops in 35
  re-runs); graders with reproduction scripts (`repro/<session>/run.sh`) confirmed 15 build
  defects at one participant each. Did not work: launching many agents against 4 browser slots
  under a 40-minute limit (7 voids, waits up to 50 minutes); agents killed before `--end` left
  browsers holding slots (r1-s08b, s29b, ended by hand); the 14 valid first-run sessions were
  never sent to graders. Scoring arithmetic: `tmp/researcher/r1-score.py`, ratings
  `r1-ease.py`.
- 2026-10-06 (round 1 skeptic check) -- Worked: two independent skeptics against transcripts,
  repros and source caught overcounts in my scores (sizing "9 of 9" was 3 with the empty list,
  "tried to click the hidden note" was 2 not 6, a voided session used as the sizing failure). Did
  not work: counting a cut-off session's dead end as evidence for a finding; treating the study
  tool's "ambiguous" name prints as accessibility defects (different roles are not a WCAG fail).
  Still owed: `run.sh` for the r1-s43b and r1-s09b repros. Simulated participants never hover,
  so hover cues (DataRow tint, toolbar tooltips) are untested either way.

- 2026-10-06 (re-pilot on e82708488, `rounds/r1/pilot/`) -- Worked: every walked tier 1 task
  reached its end state; drawings deterministic (byte-identical screenshots); the Neighborhood "g"
  route and the keyboard PageRank path already work. Found: "Force, flat" not laying out, overlays
  covering nodes, raw direction text in the Overview, internal CSV column names, a possible false
  "still moving" from the tool (a tooltip change). Lesson: pilot every task, not just touched ones.

## Thinking

- **Returning users (open, 2026-10-06).** Whether to add briefed returning-user sessions (a
  short note on what the participant did last time, graded on steps against the shortest path).
  Every simulated session is a first visit, so repeat-use speed has never been measured. Tier 1
  does not need it.
- **What can still produce a false pass on the real app.** (1) Task words that echo control
  names, now including words the real build shows that the mock did not. (2) Graders who accept
  "I think it worked" without checking the screenshot. (3) Setup states that pre-do part of the
  task. (4) Same-named controls that the click-by-name tool resolves for the participant -- an
  "ambiguous" print is itself a finding (two reachable controls must not share a name). (5)
  Assertions the build's own tests make on element reports that do not match what a person sees.
- **What can produce a false fail.** Build defects that decide the task (legend missing from the
  exported image; ids instead of names), tool limits (a node with no drawn label cannot be clicked
  by name, as for a person; clicking by point is the fallback), and timing in a headless browser.
  Rehearsal sorts these out before sessions; anything left is reported with and without.
- **Between rounds (folded 2026-10-06).** Re-test failing tasks with fresh personas, new wording
  and a second domain; a same-persona, same-words re-test is not evidence. Bars kept from rounds
  7-8 for comparison, plus T15 as a must and "each committed step shows on the drawing".
- **When to stop simulating.** If two rounds on the real app do not move the core set, the
  remaining problems are probably beyond what simulated participants can see (speed, feel, trust
  over weeks). Then the next study is real: graphty.app with opt-in usage data, and a handful of
  real analysts.

## Sources

- `design/ui/studio/digests/study-rounds.md`, `tier1.md`, `decisions.md`, `owner-voice.md`,
  `framework.md` (this worktree; all read 2026-10-06).
- `design/ui/studio/tool/README.md` (the real-app study tool).
- Round records cited by the digests: `.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype/study/round-N/insights.md`,
  `study/decision-log.md`, `study/round-8/preflight.md`, `study/round-8/sessions/grades-r8-t01.md`,
  `grades-r8-t10.md`, `grades-r8-t12.md`, `prototype/owner-feedback.md`.
- Tier 1 spec and plan: `.worktrees/feat-tier1-real-app/design/ui/tier1-real-app/tier1-design.md`,
  `plan.md`, `ship-and-study.md`.
- Transcript `.claudehistory/3a19ea55-f3cc-4fc0-b85f-842243f52536.jsonl`, assistant messages of
  2026-09-29 03:32 (simulated scores against published norms), 2026-09-29 14:57 (stop rule),
  2026-09-29 15:45-15:53 (answer key leak and script review), 2026-09-29 19:17 and 19:53 (why
  overfitting was missed; two-domain rule), 2026-09-30 00:23 (114 of 347 decisions not drawn),
  2026-10-02 16:31 (why the dry run missed mock defects; first-use share; returning-user
  question), 2026-10-02 16:40 (tiering and the typical use case), 2026-10-03 05:20 (stop round 9),
  2026-10-06 18:27 (this studio run's plan).
- Extraction scripts: `design/ui/studio/tmp/researcher/scan.py`, `full_at.py`.
