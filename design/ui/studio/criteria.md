Frozen on 2026-10-06 for the studio's rounds.

# Success criteria and round plan: the tier 1 study on the real graphty app

Scored as written. A bar changes only between rounds, with the change and its reason written here.

**What is studied.** The tier 1 workspace of the graphty app (`/?next`), as a local production
build of this worktree, driven by `tool/real.mjs`. Tier 1 is a first-time user's core path from
an empty app: pick a sample or bring a file, read what loaded, rank, find groups, color or size by
a result, names on the nodes, a readable layout, find a node and its neighbors, save a picture
and the numbers, save and reopen, and all of it chained in one sitting. Tasks: `tasks.md`.
Answer key (graders only): `answers.md`. Participants: `roster.md`.

**Who the participants are.** Simulated: one model playing composite personas. A failure is
strong evidence; a pass is weak until real people confirm it. Every report says so. Screen-reader
speech (what a screen reader actually announces, in what order, how verbosely) is not tested by
this study; every report says that it needs a real screen-reader user.

## Grades

- **S** success, **SD** success with difficulty, **F** failure, **G** gave up. Success = S + SD.
- Graded from the last screenshot, the downloaded files and the transcript, never from the
  participant's self-rating or a session summary. Reason: in round 8, 17 of 21 self-rated a task
  they all failed.
- **Claims are graded apart from the task.** Any statement that a step is done while the screen
  shows it is not is recorded as a false "done" (bar 6), whatever the task's grade. A claim made
  while the screen itself says otherwise (for example "every name is on" beside "77 labels, 64
  hidden to avoid overlap") is still a false "done", tagged `truth-on-screen`: the user leaves
  with a wrong belief about their own picture. Its fix may not add a notice (see "How a fix is
  accepted").
- **Severity** 0-4 (Nielsen). 4 = the task cannot be done, or the user leaves, or reports a wrong
  result without knowing it. An opinion-only finding is held one level down.
- **Confirmed** = seen in 2 or more participants. A **build defect** (a crash, a control that does
  nothing, a wrong count, a step that cannot be done by keyboard) is confirmed at one participant
  once the grader reproduces it as a scripted path on the build: it does the same on every run.
  The two-participant rule stays for behavior and opinion (misreading a word, picking the wrong row).
- Every bar is scored on **all sessions**, build-decided ones included: on the real app a build
  defect is what a user meets. The number without build-decided sessions is reported beside it,
  for diagnosis only.
- **Tool fault**: `real.mjs` did something a person could not, or failed to do what they asked
  (including a screenshot or a click reaching a screen-reader session). The session is void and
  re-run; void sessions are counted and reported (target 0).

## Bars that decide "done" (all must hold in one round)

| # | Bar | Target | Reason and source |
|---|---|---|---|
| 1 | Each tier 1 task, success rate | >= 80% (4 of 5, 7 of 8, 8 of 10); on a task split over two datasets, each half >= 75% (3 of 4, 5 of 6) | The studio's bar since round 7; round 8 tier 1 was 75%. The per-half floor stops a fix that works on one domain only from passing on combined counts. The whole first session (T15) is held to this bar and reported first. |
| 2 | First-time personas' tier 1 sessions | >= 80%; the gap to the other participants is reported on the tasks both groups took | The owner's priority is the first-time user (2026-10-02). |
| 3 | Confirmed severity-4 problems open | 0 | Round 7-8 bar; a confident wrong answer is the worst first-time outcome. |
| 4 | Confirmed "silent commit" on a success path | 0 | Counts only commits whose intended effect is on the drawing: a binding set, a run finished, a layout applied, a label attribute chosen. A silent commit is one whose before and after screenshots show no change on the canvas or the legend. Round 8's top quit reason: "the panel said one thing and the drawing showed another". |
| 5 | Counts and legend sentences seen on a success path that disagree with the drawing | 0 | Wrong counts were the most repeated trust loss, rounds 2-8; tier 1 design rule "a count not computed from live state is removed". |
| 6 | Confirmed false "done" | 0 | Round 8: 10 of 21 stopped at "Show labels" believing names were on. Includes `truth-on-screen` claims (see Grades). |
| 7 | Keyboard only | Morgan (blind, screen reader) S or SD on every task Morgan takes (T2, T5, T6, T9, T10, T12, T14, T15); Sam (sighted, keyboard only) S or SD on T10, T12 and T15 | WCAG 2.2 AA (2.1.1 keyboard) is a fixed rule. Two participants per core task so a keyboard result rests on more than one session. Morgan runs in the tool's screen-reader mode: no screenshots, no clicks, only the accessibility tree (role, accessible name, state, focused element) and live-region text after each step. Graded from the accessibility tree and focus position the tool prints. Reported as "passed by simulated participants", never as an accessibility pass. |
| 8 | Automated accessibility check of the core screens (below) | All four parts below hold | Accessibility Specialist's tier 1 bar; duplicate names were a round 8 severity-3 finding. Run on the build by the specialist, not by participants, as one script. |
| 9 | App words on screen at rest | <= 50 | Framework principle 5; the owner called the old app "cluttered" and "too text-heavy". A success bar with no clutter bar rewards adding things. Counting rule below. |

**Bar 8, the automated accessibility check.**

- *Screens:* start screen; usage card; loaded Graph place; Analyze open; a finished run row; Style
  tab with a label line; a node's Values with its neighbors; find box with results open; Export
  Image and Data; Data page; Save as; the refusal of a broken file (T5).
- *axe:* 0 serious or critical violations under the tags `wcag2a`, `wcag2aa`, `wcag21aa`,
  `wcag22aa`. Best-practice rules are reported, not gated.
- *Names:* no two reachable controls share an accessible name. Reachable = in the Tab order, or
  in the same roving group, in the same screen state.
- *Focus never drops:* after each of these, `document.activeElement` is not the page body: close
  the usage card, close Analyze, Run, close Export, Save as, delete a style line, close find
  results, Escape from every popover.
- *Focus visible (2.4.7, 2.4.11, 1.4.11), computed during a Tab walk of each screen:* the focus
  ring measures at least 3:1 against what is around it, and the focused control's box does not
  overlap the toolbar, dock, an open popover or a toast.
- *Announcements (4.1.3):* each of these produces exactly one live-region announcement and does
  not move focus: load finished; load refused (assertive); run added, finished, failed; selection
  count; label line added; undo; export saved; project saved; project reopened.

**Bar 9, counting app words.** One fixed screen: Les Miserables loaded, nothing selected, the
default window size. Count visible words the app writes in chrome and headings. Exclude data
values, node names, numbers and anything inside the drawing. Counted by a script, not by eye.

## Measures reported every round (targets, not gates)

| Measure | Target | Reason and source |
|---|---|---|
| All tier 1 sessions together | >= 85% | Round 8: 75% with the chained task, 86% without. Not a gate: the easy tasks dominate it, and bar 1 already holds every task. |
| Ease (Single Ease Question 1-7, read from the transcript), tier 1 mean | >= 5.0; no task mean below 4.0 | Round 8: 4.12 on tier 1. Simulated ease is uncalibrated, so it is a target. |
| Steps against the success path (successful sessions) | median <= 2x the success path's step count | Shows where success is costly. |
| Time to first drawing | a sample in 1 action after the start screen; an own file in 2 (open, pick) | Designloom workflow W14 "first visualization in under 2 minutes"; steps stand in for wall time. |
| Wrong turns per session (a step off the success path later undone or abandoned) | median <= 2 | Rounds 7-8: the right control is found, then the next step fails. |
| Recovery: sessions with a wrong turn that still succeed | >= 70% | Undo and safe exploration are how a newcomer learns. |
| First look (T16): steps to the first drawing, whether any analysis was run without being asked, whether its result was read correctly, the stated verdict | baseline in round 1 | W14 activation: left alone, does a newcomer find value? |
| In T15: picks a ranking measure and runs it with no help, no tooltip and no detour | every successful T15 session | W14 activation, measured on the step the prompt asks for. |
| Usage card, across every empty-start session: shared, declined, or skipped by opening a sample; answered without a detour; any wrong belief about what is sent recorded; T2's "how would you change it later" answered correctly | no wrong belief | The card meets every empty start. Its wording is the owner's: findings go to him, not to studio fixes. |
| App words in a selected node's inspector | <= 40 | No baseline yet. Same counting rule as bar 9. |
| Bar 8 rerun at 320 CSS px wide and at 200% text zoom (WCAG 1.4.10, 1.4.4) | 0 serious or critical | The owner's minimum platform is an iPad with a keyboard. A measure in round 1; may become a gate once a baseline exists. |
| Script errors, console errors and failed requests printed by the tool on any success path | 0 | Each is a bug report. |
| What worked | listed per task | The owner (2026-10-02): "it's hard to tell if it was all failures". |

First-click and tree tests are not used in round 1. They are used only to settle a wording dispute
that sessions leave open, with >= 70% direct success, at least 8 participants and two datasets.

## Round plan

- **Rounds:** at most 3. Round 1 is the baseline: every tier 1 task in `roster.md`. Rounds 2 and 3
  re-run every task below its bar at full size with fresh persona mixes, T15 always at 10, and each
  task a fix touched at 4 or more as a regression check. A task that met its bar and no fix
  touched is not re-run.
- **Size (round 1, 89 sessions):** at least 5 participants per task; 8 for the tasks split over
  two datasets (T7, T9, T10, T12), 4 and 4; 10 for the whole first session (T15), 6 on Les
  Miserables and 4 on the participant's own file; 6 for import (T3) and the broken file (T5).
  T16 (first look) is 5 first-time sessions, measured, not graded.
- **Not run in tier 1 rounds:** T1 (its question moved into T2 and the usage-card measure) and T4
  (joining two tables is not a first sitting; a tier 2 candidate).
- **Persona mix:** at least 60% of sessions by first-time personas (round 1: 58 of 89, 65%);
  every task has at least 3 first-time participants and 2 domains.
- **Tier share:** 100% of sessions are tier 1.
- **Every session is a first visit:** a fresh agent with no memory of other sessions, so one
  persona can take several tasks.
- **Run order:** T15, T10, T12, T9 first, then the rest. T13 and T15 wait for the image legend fix
  (preflight item 8).
- **Browsers:** at most 4 at once, through `tool/with-browser.sh`; every session ends with `--end`.
  From round 2 the runner keeps at most 4 participants alive at once, so no session waits for a
  browser slot (change log, 2026-10-06).
- **Session length (from round 2):** no step cap. A session ends when the participant says they
  are done, gives up, or keeps repeating without progress (change log, 2026-10-06).

## Before a round may start (preflight)

1. The build under study is this worktree's commit, rebuilt; its commit is in every
   `session.json`.
2. `node tool/real.mjs --prove` prints only `ok`, and the proof includes the screen-reader mode:
   screenshots are withheld from the participant (kept for graders); `--click`, `--click-at`,
   `--hover` and `--drag` are refused; after every `--key` and `--type` the tool prints the
   focused element's role, accessible name and state and the text of every live region that
   changed. A planted `--click` must be refused before the mode is trusted.
3. Every task's success path in `answers.md`, and every keyboard path, runs on the build as a
   script and ends on its success state. A path that cannot is a deciding build defect, fixed
   first or named in the round report; a step that cannot be done by keys is severity 4 (WCAG
   2.1.1).
4. The reference values in `answers.md` are recorded on the exact commit under test; a round may
   not start with one blank.
5. A wording check: the build's visible text and accessible names are dumped on every screen a
   success path reaches, and a script lists every word a prompt shares with them, except the
   data's own words. Each overlap is reworded or kept with its reason in `tasks.md`. The script
   must fail on a planted echo before it is trusted.
6. The persona files for Dev, Ruth and Grace (about 4.5 KB each against 20-40 KB) are
   strengthened from public sources the way the others were built, and Nadia's (9 KB) is checked;
   Sam's file (sighted, keyboard only) is written. A thin file makes a simulated participant fall
   back to a generic competent user, inflating exactly the first-time numbers bar 2 gates.
7. The rehearsal settles whether the tool can close the tab and reopen the same browser storage
   (T14). If it cannot, a session that tries it is void as a tool fault and re-run, never failed.
8. **The exported image has no legend** (graphty-element issue #133). It decides T13 and the last
   step of T15, so those two tasks run only after the local graphty-element fix passes their
   scripted success paths. If the fix cannot land: T15 is graded on steps 1-4 plus "an image was
   downloaded", the legend is recorded as build-decided, and T15 and T13 are reported as "not
   tested" on the legend, not failed. Spending sessions to re-measure a known defect is the round
   5 mistake.
9. Tasks and this file are frozen; the round folder is new; participants are given only the
   `tasks.md` prompt and their persona file, never `answers.md`, the notes or the digests.
10. Every change the last round's decisions carried into this round is listed as built or not
    built, each checked on the served build (a scripted step or a look at the screen), not from
    the commit log. A change decided and never built otherwise slips through a round unnoticed.

## How a fix is accepted

1. It goes in the right package: graph logic in graphty-element, words and arrangement in the
   app, a shared control in compact-mantine. A fix in the wrong package is a second bug.
2. **Remove before adding.** A fix that adds a control, a notice or a second route removes one,
   or shows that a removal or rename was tried and failed on two datasets. App words at rest (bar
   9) never go up from one round to the next.
3. Lint, build and the affected tests pass locally; the app is rebuilt; the fix is a local commit
   in this worktree (nothing is pushed; pull requests come after the studio).
4. **Re-pilot:** the task's scripted success path passes on the new build, and one pilot session
   by a persona not booked for that task next round succeeds. A skeptic checks generality: no new
   concept, no one-dataset special case, task words do not echo the words the fix put on screen,
   and a wording change is tried on two datasets.
5. **Next round:** the fix is accepted when its task meets its bar and no new confirmed severity 3
   or 4 appears on any task it touched. Otherwise it is reworked or reverted.

## When the studio stops (done)

- **Passed:** every bar holds in one round. Recommend the next study with real people
  (graphty.app with opt-in usage data, 5 to 8 real analysts on the core path, and at least one
  real screen-reader user).
- **Round 3 finished**, whatever the result.
- **Stalled:** round 2 shows no gain over round 1 on the core four (T15, T10, T12 and T9 success
  and their mean ease). The remaining problems are probably beyond what simulated participants
  show; go to real users.
- A problem that needs an owner decision that cannot be undone cheaply (a one-way door) stops
  work on that task only; the rest continue.

The final report gives what was tested, every bar's result with its denominator, what worked,
what failed and why, each fix with its package and evidence, and the next steps.

## Change log

Changes made before round 1, after the pilot of 2026-10-06 walked every task on the build
(graphty 0.8.53, commit a1e6b91ff). None lowers a bar; each makes a bar score the build as it is.

- 2026-10-06 -- Bar 4 no longer lists "the show-all switch": the build has no control that shows
  every name. T10's success is names drawn plus the hidden-for-overlap count read and explained;
  "every name is on" beside a hidden count stays a false "done" (bar 6).
- 2026-10-06 -- Time to first drawing for an own file is 2 actions (open, pick), not 3: a CSV
  opened with "Open project or file..." is drawn at once, with no import page and no Load.
- 2026-10-06 -- T3: success needs a rows count on screen (Data > Sources, "41 rows, 41 edges")
  behind "nothing was dropped"; a claim from the Overview counts alone is success with
  difficulty. Reason: the Overview shows what arrived, not what was in the file.
- 2026-10-06 -- Usage card measure: "skipped by opening a sample" is a recorded outcome (the card
  goes away unanswered and usage data stays off). Reason: the pilot met it on every task that
  opened a sample without answering.
- 2026-10-06 -- Accepted answers: a run's on-screen name ("Influence" for PageRank, "Communities"
  for Louvain) names the measure; characters' and families' recorded facts are `id` and `name`;
  friends.csv's names are in `id`; Javert's neighbors are graded in the screen's spellings. T11's
  "it did not help" is an expected opinion, not a failure. The picture checklist's key names color
  and size, not names. Reason: graders would otherwise fail correct on-screen answers.
- 2026-10-06 -- Reference values: the pilot's values are entered in `answers.md`; "weight used by
  default" is removed (runs on this build ignore the weight). All are re-recorded on the final
  commit (preflight 4).
- 2026-10-06 -- Round 1 runs 56 sessions, not 89: the studio's budget for this round. No bar
  changes. The core four (T15 at 10, T10, T12 and T9 at 4 and 4) keep their full size, because
  they decide the stall rule. The other tasks run at 2 or 3 sessions and pass bar 1 only if every
  session succeeds (3 of 3, 2 of 2); one failure puts the task below its bar, and round 2 re-runs
  it at the full size above. T2 and T7 on Les Miserables are not run in round 1 (the first is one
  click that every empty start and T16 measure; the second is answerable from training memory).
  T16 is 2 sessions, a thin baseline. Allocation: `roster.md`; scoring: `rounds/round-1/plan.md`.
- 2026-10-06 -- T5's prompt drops the word "file" ("a network file" became "a network"): it is a
  word of the target control "Open project or file...", found by the wording check (preflight 5).

Changes for round 2 onward, made after round 1's re-score (`rounds/round-1/scores.md`). None
changes a bar or an answer; each removes a way the study, not the app, decided a result.

- 2026-10-06 -- **No step cap.** A session ends when the participant says they are done, gives
  up, or keeps repeating without progress (the same action, or the same few actions, with no new
  screen). It no longer ends at 40 steps (60 for T15). Reason: a cap turns a slow success into a
  failure the participant never chose, and the rounds look for where people stop on their own.
  Graders flag any session that ended at a cap; for round 1 the check is done and found none
  (longest graded sessions: 33 steps of a 60 cap, r1-s09b; 28 of a 40 cap, r1-s19b), so no round
  1 grade changes. A grader who sees repetition without progress grades it as giving up (G) and
  says so; a runner never ends a session on its own judgment.
- 2026-10-06 -- **One or two sentences per step instead of a full think-aloud.** After each step
  the participant says what they see and what they will try next, and still says out loud when
  each part is done and gives the rating at the end. Reason: the full think-aloud prompt was the
  likely trigger of the provider's filter, which stopped 14 of 41 first-run sessions; the short
  form ran 35 re-runs with no stop and kept what graders need (wrong turns, the moment a
  participant gives up, false "done" claims). Round 1 pooled both forms; round 2 uses only the
  short one.
- 2026-10-06 -- **At most 4 participants alive at once.** The runner starts a participant only
  when fewer than 4 are running, so each one gets a browser slot at once. Reason: in round 1 far
  more participants ran than the 4 browser slots, the agent's time limit counted the wait (17 to
  60 minutes), and 7 re-runs were cut off or never started; two abandoned sessions also kept their
  slots. A participant's time limit, if any, starts once it holds a slot, and every session ends
  with `--end` even when its agent is stopped.
- 2026-10-06 -- **The rating question is asked as written in `tasks.md`** (1 = very difficult,
  7 = very easy). Reason: round 1's session prompt asked it the other way round, so every ease
  had to be converted (8 minus the rating).
- 2026-10-06 -- **Round 2 runs 56 sessions, not the full sizes above** (the studio's cap per
  round; full sizes would need 81). No bar changes. The core four keep their full size (T15 at 10,
  6 Les Miserables and 4 own file; T10, T12 and T9 at 4 and 4): T12 is below its bar, T10 and T9
  are open, and the four decide the stall rule. Every other tier 1 task was touched by a change
  since round 1, so every one runs, but at 2 or 3 sessions (T14, T5, T11 at 3; T13, T6, T3, T7 on
  the running club, T8 at 2), not at "4 or more as a regression check"; as in round 1, such a task
  passes bar 1 only if every session succeeds. T2 runs once (1 of 1), for its first step and the
  usage-data question no other task asks. T16 runs twice. "Every task has at least 3 first-time
  participants" holds for every core half but T15's own-file half (2 of 4, as in round 1) and not
  for the reduced tasks (1 or 2 each). Allocation: `roster.md`; scoring: `rounds/round-2/plan.md`.
- 2026-10-07 -- Preflight item 10: every change carried into the round is listed as built or not
  built, checked on the served build. Reason: a run named by its method was decided after round 1
  and reached round 2 unbuilt without anyone noticing.
