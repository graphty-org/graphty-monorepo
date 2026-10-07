# Round 1 plan: the tier 1 study on the real graphty app

Round 1 is the baseline study of the tier 1 workspace of the graphty app: a first-time user's
core path from an empty app, on a local production build (commit 9d6598eea, opened at `/?next`),
driven one step at a time by `tool/real.mjs`. It follows `criteria.md` ("Round plan" and the bars)
with one change, logged there: 56 sessions instead of 89.

**Status: blocked by preflight item 2** (the tool's screen-reader mode does not exist yet). See
`preflight.md`. The 49 sighted sessions are ready; the 7 screen-reader sessions are last in the
run order and wait for the mode.

## Status on 2026-10-06, evening: 14 sessions done, 35 to run again, 7 still blocked

**Valid and ready to grade (14):** r1-s01, s02, s05 (T15A); s13, s14 (T10B); s18 (T12A); s20,
s23 (T12B); s24, s25 (T9A); s32 (T3); s39 (T8); s42 (T6); s45 (T13). All ran on commit 9d6598eea.

**Void, none of them the app's or the participant's doing (35).** Run each again with a fresh
agent, the same persona and task, in a new folder named with a `b` suffix (r1-s03 becomes
r1-s03b): the tool refuses a folder that already holds screenshots, and the old folders are kept
as they are.

- 14 were stopped mid-session by the model provider's safety filter (the error reads "safeguards
  flagged this message", reason `reasoning_extraction`): s03, s06, s08, s09, s10, s12, s15, s16,
  s17, s26, s27, s29, s30, s38. The app was working at every point they stopped. The likely
  trigger is the session prompt's instruction to think aloud before every step; asking instead
  for one or two sentences per step on what the participant sees and will try next keeps the
  measure and may stop the trips. Their partial screenshots are kept but not graded.
- 9 never ran at all and were still recorded as finished: the agent was waiting for one of the 4
  browser slots, put the start in the background and ended its turn ("Waiting for the browser
  slot to free up"): s21, s31, s33, s34, s35, s36, s40, s48, s49. Cause: far more session agents
  ran at once than there are browser slots. The runner should start at most 4 session agents at a
  time, or each agent must wait for its start in the foreground.
- 12 were cut off when the whole run was stopped by hand at 16:08: s04, s07, s11, s19, s22, s28,
  s37, s41, s43, s44, s46, s47.

**Blocked (7):** Morgan's s50 to s56. The tool still has no screen-reader mode. Four of them were
started by the runner anyway; all four were stopped before a browser opened, so none is spoiled.
They stay out of the run list until the mode exists.

**Build:** re-runs use commit 452285142, two commits after 9d6598eea. One changes what a person
sees (the inspector header no longer prints "Everything" twice when the Everything row is
selected); the other only records a getter in the element's API report. The re-pilot of every
task on 452285142 reached every end state with the same reference values, and no frozen file
changed (SHA-256 checked). Sessions on the two builds are pooled; the report says which session
ran on which build.

**Sam's persona file is not where the session prompt looks.** The prompt searches the round 8
persona folder and the project records; `keyboard-only-sam.md` is only in this studio's
`personas/`. Sam's re-runs (s09b, s16b) need the prompt pointed at that file, and his
keyboard-only rule (`--key` and `--type` only) stated in it. The same is true for the stronger
studio files of Dev, Grace and Ruth: the prompt finds their older, thinner round 8 files of the
same names. The 14 valid sessions include Dev, Grace and Ruth sessions played from the older
files; the report notes it.

## What is measured

Every bar and measure in `criteria.md`, scored on all sessions, build-decided ones included, with
the number without build-decided sessions beside it for diagnosis. Every result is from simulated
participants: a failure is strong evidence, a pass is weak until real people confirm it, and the
report says so. Screen-reader speech is not tested by this study.

The questions this round answers first:

1. Does the whole first session (T15) pass on the real app, on a sample and on the participant's
   own file? It was 0 of 21 on the clickable mock (round 8).
2. Do the three round 8 failures pass now: names on every dot (T10), one node and its neighbors
   by name (T12), sizes bound to a result (T9)?
3. What does a newcomer do when nobody asks for anything (T16), and does anyone reach for an
   analysis unprompted?

## Size: 56 sessions

| Group | Tasks | Sessions | How bar 1 is scored |
|---|---|---|---|
| Core four, full size | T15 (6 + 4), T10 (4 + 4), T12 (4 + 4), T9 (4 + 4) | 34 | As written: 80% per task (8 of 10 on T15), and each dataset half at least 3 of 4 |
| Reduced | T3, T5, T7 (running club), T8: 3 each; T6, T11, T13, T14: 2 each | 20 | Passes only if every session is S or SD (3 of 3, 2 of 2). One F or G puts the task below its bar; round 2 re-runs it at the full size in `criteria.md` |
| Measured, not graded | T16 | 2 | A first baseline only; thin |

Not run: T1 and T4 (never in tier 1 rounds); T2 (one click; every empty start records the steps to
the first drawing and the usage card, and T16 measures the unprompted first step, so T2's "change
it later" question goes unasked this round); T7 on Les Miserables (the model knows its ranking from
training; the ranking run on Les Miserables is inside T9 and T15, and T7's top-three reading is
tested on the running club, a dataset no model has seen).

Why the core four keep their size: they decide the stall rule (`criteria.md`, "When the studio
stops"), and the two-dataset floor needs 4 per half to tolerate one failure.

## Participants

38 of 56 sessions (68%) are by first-time personas; every core task has 3 first-time participants
on each dataset half except T15 on the own file (2 of 4). Two keyboard participants on every core
task: Morgan (screen reader) on the Les Miserables halves of T15, T10, T12, T9, plus T5, T6 and
T14; Sam (sighted, keyboard only) on the other halves of T15, T10 and T12. Allocation and persona
files: `roster.md`. First-time and other participants are compared only on tasks both took (the
core four).

## Sessions, in run order

Run order follows `criteria.md`: T15, T10, T12, T9 first, then the rest; Morgan's sessions last.
At most 4 sessions at once. Each session folder is `rounds/round-1/sessions/<id>-<task>-<persona>`
(lower case). Start is the `real.mjs --start` argument; files are in `tool/files/`; the limit is
the step limit.

| Id | Task | Persona | Dataset | Start | Files | Limit |
|---|---|---|---|---|---|---|
| r1-s01 | T15A | Elena | Les Miserables | `empty` | - | 60 |
| r1-s02 | T15A | Tom | Les Miserables | `empty` | - | 60 |
| r1-s03 | T15A | Nadia | Les Miserables | `empty` | - | 60 |
| r1-s04 | T15A | Dev | Les Miserables | `empty` | - | 60 |
| r1-s05 | T15A | Alex | Les Miserables | `empty` | - | 60 |
| r1-s06 | T15B | Grace | friends.csv (own file) | `empty` | friends.csv | 60 |
| r1-s07 | T15B | Ruth | friends.csv (own file) | `empty` | friends.csv | 60 |
| r1-s08 | T15B | Jordan | friends.csv (own file) | `empty` | friends.csv | 60 |
| r1-s09 | T15B | Sam | friends.csv (own file) | `empty` | friends.csv | 60 |
| r1-s10 | T10A | Elena | Les Miserables | `empty` | - | 40 |
| r1-s11 | T10A | Tom | Les Miserables | `empty` | - | 40 |
| r1-s12 | T10A | Dev | Les Miserables | `empty` | - | 40 |
| r1-s13 | T10B | Nadia | College football | `empty` | - | 40 |
| r1-s14 | T10B | Grace | College football | `empty` | - | 40 |
| r1-s15 | T10B | Ruth | College football | `empty` | - | 40 |
| r1-s16 | T10B | Sam | College football | `empty` | - | 40 |
| r1-s17 | T12A | Elena | Les Miserables | `empty` | - | 40 |
| r1-s18 | T12A | Nadia | Les Miserables | `empty` | - | 40 |
| r1-s19 | T12A | Ruth | Les Miserables | `empty` | - | 40 |
| r1-s20 | T12B | Tom | Florentine families | `empty` | - | 40 |
| r1-s21 | T12B | Dev | Florentine families | `empty` | - | 40 |
| r1-s22 | T12B | Grace | Florentine families | `empty` | - | 40 |
| r1-s23 | T12B | Sam | Florentine families | `empty` | - | 40 |
| r1-s24 | T9A | Elena | Les Miserables | `empty` | - | 40 |
| r1-s25 | T9A | Nadia | Les Miserables | `empty` | - | 40 |
| r1-s26 | T9A | Ruth | Les Miserables | `empty` | - | 40 |
| r1-s27 | T9B | Grace | Florentine families | `empty` | - | 40 |
| r1-s28 | T9B | Dev | Florentine families | `empty` | - | 40 |
| r1-s29 | T9B | Tom | Florentine families | `empty` | - | 40 |
| r1-s30 | T9B | Mara | Florentine families | `empty` | - | 40 |
| r1-s31 | T3 | Dev | friends.csv | `empty` | friends.csv | 40 |
| r1-s32 | T3 | Ruth | friends.csv | `empty` | friends.csv | 40 |
| r1-s33 | T3 | Dana | friends.csv | `empty` | friends.csv | 40 |
| r1-s34 | T5 | Tom | club-members.graphml | `empty` | club-members.graphml | 40 |
| r1-s35 | T5 | Elena | club-members.graphml | `empty` | club-members.graphml | 40 |
| r1-s36 | T7B | Grace | friends.csv (setup) | `setup:rounds/round-1/setups/T7-B.txt` | - | 40 |
| r1-s37 | T7B | Nadia | friends.csv (setup) | `setup:rounds/round-1/setups/T7-B.txt` | - | 40 |
| r1-s38 | T7B | Jordan | friends.csv (setup) | `setup:rounds/round-1/setups/T7-B.txt` | - | 40 |
| r1-s39 | T8 | Elena | Les Miserables | `empty` | - | 40 |
| r1-s40 | T8 | Dev | Les Miserables | `empty` | - | 40 |
| r1-s41 | T8 | Jordan | Les Miserables | `empty` | - | 40 |
| r1-s42 | T6 | Ruth | Les Miserables | `empty` | - | 40 |
| r1-s43 | T11 | Tom | Les Miserables | `empty` | - | 40 |
| r1-s44 | T11 | Alex | Les Miserables | `empty` | - | 40 |
| r1-s45 | T13 | Nadia | Les Miserables (setup) | `setup:rounds/round-1/setups/T13.txt` | - | 40 |
| r1-s46 | T13 | Dana | Les Miserables (setup) | `setup:rounds/round-1/setups/T13.txt` | - | 40 |
| r1-s47 | T14 | Tom | Les Miserables (setup) | `setup:rounds/round-1/setups/T14.txt` | - | 40 |
| r1-s48 | T16 | Elena | participant's choice | `empty` | friends.csv | 40 |
| r1-s49 | T16 | Grace | participant's choice | `empty` | friends.csv | 40 |
| r1-s50 | T15A | Morgan | Les Miserables | `empty` | - | 60 |
| r1-s51 | T10A | Morgan | Les Miserables | `empty` | - | 40 |
| r1-s52 | T12A | Morgan | Les Miserables | `empty` | - | 40 |
| r1-s53 | T9A | Morgan | Les Miserables | `empty` | - | 40 |
| r1-s54 | T5 | Morgan | club-members.graphml | `empty` | club-members.graphml | 40 |
| r1-s55 | T6 | Morgan | Les Miserables | `empty` | - | 40 |
| r1-s56 | T14 | Morgan | Les Miserables (setup) | `setup:rounds/round-1/setups/T14.txt` | - | 40 |

## How a session runs

1. **Before the first session of a batch:** confirm the frozen files' SHA-256 (`preflight.md`)
   and the commit (`git -C <worktree> rev-parse HEAD` is 9d6598eea, or `git diff --stat 9d6598eea
   -- graphty graphty-element` is empty; otherwise re-record the reference values first).
2. **One fresh agent per session.** It gets exactly: its persona file (`roster.md`), the task's
   prompt from `tasks.md` word for word (the A or B prompt for its dataset), the tool's participant
   instructions (`tool/README.md`, sections "A session" and "Steps"), the session folder and start
   command, and these rules:
   - think aloud at every step; say out loud when each part of the task is done;
   - stop when done, when giving up, or at the step limit;
   - end with "How easy or difficult was this, from 1 (very difficult) to 7 (very easy)?" and its
     reason;
   - always `--end` the session.
   Nothing else: no `answers.md`, `criteria.md`, this plan, notes, digests, design documents,
   source code, pilot folders or other sessions.
3. **Sam** uses `--key` and `--type` only, and sees every screenshot.
4. **Morgan** runs only in the tool's screen-reader mode, once it exists and its proof passes:
   no screenshots, no pointer steps, only focus and live-region text. A Morgan session run any
   other way is void.
5. **A runner never helps.** No hints, no rewording, no answers to questions about the program; a
   question from the participant is recorded and answered "do what you would do on your own".
6. **Void and re-run** a session when the tool did something a person could not, or failed to do
   what was asked (a tool fault). Count and report void sessions (target 0).

## Grading

- One grader agent per task, holding `answers.md` and `criteria.md`; never a participant agent.
- Graded from the last screenshot, the downloads and the transcript; never from the
  participant's self-rating or summary. A named answer counts only if a screenshot taken before it
  was said shows it.
- Per session: grade (S, SD, F, G), failure codes, steps, wrong turns, ease read from the
  transcript, every silent commit (before and after screenshots), every false "done" (graded apart
  from the task, `truth-on-screen` where the screen said otherwise), every count that disagrees
  with the drawing, every `ambiguous`, script error, console error or failed request the tool
  printed, and for empty starts the usage card's outcome.
- T15 reports, for every session, how many of its five parts were reached.
- Build-decided: a build defect alone decided the grade. Confirmed: seen in 2 or more
  participants, or a build defect the grader reproduces as a scripted path.
- Known build behavior graders must not count as participant error is listed in `answers.md`
  (on-screen run names, short Top 10 lists at ties, the reopened run's missing count) and in
  `preflight.md`, "Found while checking".

## Reporting

`rounds/round-1/report.md` after the last session: every bar with its denominator, with and without
build-decided sessions; the core four first, T15 at the top; first-time against others on the core
four; what worked per task; every finding with severity, how many saw it, and the package its fix
belongs in; the measures (ease, steps, wrong turns, recovery, time to first drawing, T16, the
usage card, app words). Reduced tasks are reported with their n ("3 of 3", never "100%").

## What round 2 owes from this plan

- Every task below its bar, at the full size in `criteria.md`, with fresh persona mixes; T15 at 10.
- Every reduced task that had a failure, at full size, even if a fix is not ready, so its number
  rests on more than 3 sessions.
- T7 on Les Miserables and T2 only if a fix touches them.
- T16 to 5 first-time sessions if the round-1 pair disagree.
</content>
</invoke>
