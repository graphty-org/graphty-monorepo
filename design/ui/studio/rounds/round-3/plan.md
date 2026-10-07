# Round 3 plan: the tier 1 study on the real graphty app

Round 3 is the last round the studio's criteria allow. It re-tests the tier 1 workspace of the
graphty app (a first-time user's core path from an empty app) after the twelve changes decided at
the end of round 2. It runs on a local production build of the studio worktree, build stamp
`b7590f8de22b graphty@0.8.53` (commit b7590f8de; the worktree's later commits change only studio
documents), opened at `/?next` and driven one step at a time by `tool/real.mjs`. It follows
`criteria.md` ("Round plan" and the bars) with one logged change: 56 sessions instead of the full
sizes (change log, 2026-10-07, "Round 3 runs 56 sessions").

Whether the round may start is in `preflight.md`.

## Where round 2 left each task

Round 2 (`rounds/round-2/scores.md`, `insights.md`): 52 of 54 graded sessions succeeded. By the
scores, only "what did I get?" (T6) was below its bar (1 of 2; the one failure was the
screen-reader participant's and was build-decided); the skeptic check held that failure not shown,
because the study tool had no reading mode. Every other task passed. The targets that were missed:
untangle the drawing (T11) had a mean ease of 3.33 (floor 4.0) and took 5.2 times its success path;
names on every dot (T10) took 3.5 times its path, about 5 wrong turns a session, every session
with difficulty; sizing the dots by a result was named as a cost in 18 of 18 sizing sessions. Bar 3
(no confirmed severity 4) was not shown to fail, bar 5 failed on one stale key row, and bar 7
failed on one screen-reader session that could not export. Bars 8 and 9 were not run.

## What changed since round 2, and which tasks it touches

Every change below is built and was checked on the served build (`preflight.md`, item 10).

| Change on the build | Tasks whose path or screen it changes |
|---|---|
| A dialog opened from a menu keeps focus (Main menu > Export...) | T15 and T13 (export), T14 (main menu); every keyboard session |
| The key leaves out a color layer painted over on every node (a ranking run, then a community run, shows only the community colors) | any task where two runs stack: T16, T9, T15, T8 |
| Fit in 2D frames the whole graph | T10 (the 2D route to hidden names), T11 |
| Group layouts accept a community result after a community run ("Group by: Communities" preselected) | T11 |
| A finished load ("Les Miserables: 77 nodes, 254 edges") and a finished run ("PageRank finished") are announced | every screen-reader session |
| The drawing is named "Graph drawing", shows a focus ring, and no longer takes focus on load | every keyboard session |
| Size "+" opens its from-data list at once ("Fixed size" first) | T9, T15 |
| The chevron on "Degree 17 >" is part of the row | T12 |
| A run is named by its method everywhere ("PageRank", "Louvain") | T7, T8, T9, T13, T14, T15, T16 |
| A "Show all labels" checkbox beside "77 labels, 7 hidden" | T10, T15, T14, T16 |
| The study tool's screen-reader mode hears the highlighted option, reads a region (`--read`) and marks a region that arrived already filled as unconfirmed | every screen-reader session, T6 most |
| Answer key re-walked for the new routes | grading of every task |

Untouched paths: T2, T3 and T5 (only their spoken announcements changed).

## The questions this round answers first

1. **Does the whole first session (T15) hold at 10, and does the screen-reader participant now
   finish it?** r3-s01 repeats the session that ended at the export dialog in round 2, on the build
   with the menu focus fix. It runs first.
2. **Does the names checkbox work for a first-time user?** T10 at 4 and 4: record for every
   session whether every name was reached, and the wrong turns spent hunting (round 2: about 5 a
   session, 8 of 8 with difficulty, ease 4.25). The prompt is unchanged, so the comparison is fair.
3. **Does opening the Size list at once remove the sizing cost?** T9 at 4 and 4 and T15 at 10:
   record for every sizing session whether the list was used, closed, or answered "Fixed size",
   and whether the participant named sizing as a difficulty (round 2: 18 of 18).
4. **Does untangling (T11) clear its ease floor** (round 2: 3.33) now that the group layouts work
   after a community run? Record whether each participant ran a community analysis and tried a
   group layout.
5. **Does "what did I get?" (T6) pass with a reading mode** for the screen-reader participant, and
   with four sighted sessions?
6. **Bar 7:** the screen-reader participant on T15, T10, T9, T12, T6, T14 and T5; the keyboard-only
   participant on T15, T10 and T12.
7. **Run names:** how many sessions pause on a run's name (round 2: 17).
8. **Against round 2:** core four (T15, T10, T12, T9) success and mean ease. Round 3 ends the
   study either way (`criteria.md`, "When the studio stops"); a core four that did not move points
   the next study at real users.

## Size: 56 sessions

| Group | Tasks | Sessions | How bar 1 is scored |
|---|---|---|---|
| Full size | T15 (6 Les Miserables + 4 own file), T10 (4 + 4), T9 (4 + 4), T11 5, T6 5 | 36 | As written: 80% per task (8 of 10, 7 of 8, 4 of 5) and each dataset half at least 3 of 4 (5 of 6 on T15's Les Miserables half) |
| Regression check at 4 | T12 (2 Les Miserables + 2 Florentine families), T7 (running club) 4 | 8 | T7 as written (4 of 4 needed for 80%: 4 of 5 is not reachable at 4, so 4 of 4). T12 passes only if every session succeeds, 2 of 2 per half |
| Reduced, touched | T14 3, T13 2, T8 2 | 7 | Every session S or SD (3 of 3, 2 of 2), as in rounds 1 and 2 |
| Reduced, untouched | T5 1, T3 1, T2 1 | 3 | 1 of 1. Run so every tier 1 task is seen; T5 is the screen-reader participant's (bar 7, the assertive refusal) |
| Measured, not graded | T16 2 | 2 | Adds to the first-look baseline (round 1: 1 complete, round 2: 2) |

Why this shape: the full rule (every task below its bar at full size, every touched task at 4 or
more) needs about 70 sessions against the cap of 56. The sessions go first to the tasks whose path
changed most and whose round 2 numbers missed a target (T10, T9, T15, T11), then to the one task
below its bar (T6), then to regression checks. T12 passed 8 of 8 in round 2 and only the chevron
fix touched it, so it runs at 2 and 2, which still carries both keyboard participants. T7 runs only
on the running club, as before (the model knows Les Miserables' ranking from training). A reduced
pass is reported with its n ("2 of 2", never "100%").

## Participants

37 of 56 sessions (66%) are by first-time personas: Elena, Tom, Nadia, Dev, Grace (6 each) and Ruth
(7). Each of them takes the whole first session, names and bigger dots once each, one dataset half
of each, so no first-time persona meets T15 twice. Every core half has 3 first-time participants
except T12 (1 per half at its regression size). The smaller tasks go to personas who have not taken
them before where one is left.

Keyboard bar (bar 7): Morgan (blind, screen reader, `--sr` mode) takes the Les Miserables halves of
T15, T10, T9 and T12, plus T6, T14 and T5 (7); Sam (sighted, keyboard only) takes the other halves
of T15, T10 and T12 (3).

Others: Alex 3, Jordan 2, Dana 2, Mara 2.

Persona files (the full path goes in every session record; the session runner otherwise finds the
thinner round 8 files of the same names for Dev, Grace and Ruth, and no file for Sam):

| Name | File |
|---|---|
| Elena | `P/explorer-elena.md` |
| Tom | `P/recipe-recipient.md` |
| Nadia | `P/alert-reviewer.md` |
| Dev | `S/class-project-student.md` |
| Grace | `S/nonprofit-operations-analyst.md` |
| Ruth | `S/data-journalist.md` |
| Alex | `P/analyst-alex.md` |
| Jordan | `P/marketing-analyst.md` |
| Dana | `P/supply-chain-analyst.md` |
| Morgan | `P/screen-reader-analyst.md` |
| Sam | `S/keyboard-only-sam.md` |
| Mara | `P/gephi-holdout.md` |

`P/` = `/home/apowers/Projects/graphty-monorepo/.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype/study/personas/`;
`S/` = `/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/personas/`.

## Sessions, in run order

The screen-reader whole first session first (the round 2 session that could not export), then
T15, T10, T12 and T9, then the rest, the tasks with the most changed paths first. Each session
folder is `rounds/round-3/sessions/<id>`. Start is the `real.mjs --start` argument; `setup:` files
are in `rounds/round-3/setups/` (round 2's, re-run whole on this build); files are in
`tool/files/`. There is no step cap.

| Id | Task | Persona | Dataset | Start | Note |
|---|---|---|---|---|---|
| r3-s01 | T15 A | Morgan | Les Miserables | `empty --sr` | screen reader; repeats round 2's r2-s07 |
| r3-s02 | T15 A | Elena | Les Miserables | `empty` | |
| r3-s03 | T15 A | Dev | Les Miserables | `empty` | |
| r3-s04 | T15 A | Grace | Les Miserables | `empty` | |
| r3-s05 | T15 A | Mara | Les Miserables | `empty` | |
| r3-s06 | T15 A | Alex | Les Miserables | `empty` | |
| r3-s07 | T15 B | Tom | friends.csv | `empty` | |
| r3-s08 | T15 B | Nadia | friends.csv | `empty` | |
| r3-s09 | T15 B | Ruth | friends.csv | `empty` | |
| r3-s10 | T15 B | Sam | friends.csv | `empty` | keys only |
| r3-s11 | T10 A | Elena | Les Miserables | `empty` | |
| r3-s12 | T10 A | Tom | Les Miserables | `empty` | |
| r3-s13 | T10 A | Dev | Les Miserables | `empty` | |
| r3-s14 | T10 A | Morgan | Les Miserables | `empty --sr` | screen reader |
| r3-s15 | T10 B | Nadia | College football | `empty` | |
| r3-s16 | T10 B | Grace | College football | `empty` | |
| r3-s17 | T10 B | Ruth | College football | `empty` | |
| r3-s18 | T10 B | Sam | College football | `empty` | keys only |
| r3-s19 | T12 A | Ruth | Les Miserables | `empty` | |
| r3-s20 | T12 A | Morgan | Les Miserables | `empty --sr` | screen reader |
| r3-s21 | T12 B | Grace | Florentine families | `empty` | |
| r3-s22 | T12 B | Sam | Florentine families | `empty` | keys only |
| r3-s23 | T9 A | Grace | Les Miserables | `empty` | |
| r3-s24 | T9 A | Elena | Les Miserables | `empty` | |
| r3-s25 | T9 A | Nadia | Les Miserables | `empty` | |
| r3-s26 | T9 A | Morgan | Les Miserables | `empty --sr` | screen reader |
| r3-s27 | T9 B | Ruth | Florentine families | `empty` | |
| r3-s28 | T9 B | Dev | Florentine families | `empty` | |
| r3-s29 | T9 B | Tom | Florentine families | `empty` | |
| r3-s30 | T9 B | Jordan | Florentine families | `empty` | |
| r3-s31 | T11 | Nadia | Les Miserables | `empty` | |
| r3-s32 | T11 | Dev | Les Miserables | `empty` | |
| r3-s33 | T11 | Ruth | Les Miserables | `empty` | |
| r3-s34 | T11 | Dana | Les Miserables | `empty` | |
| r3-s35 | T11 | Mara | Les Miserables | `empty` | |
| r3-s36 | T6 | Elena | Les Miserables | `empty` | |
| r3-s37 | T6 | Tom | Les Miserables | `empty` | |
| r3-s38 | T6 | Nadia | Les Miserables | `empty` | |
| r3-s39 | T6 | Morgan | Les Miserables | `empty --sr` | screen reader |
| r3-s40 | T6 | Alex | Les Miserables | `empty` | |
| r3-s41 | T7 B | Elena | running club (friends.csv, set up) | `setup:T7-B.txt` | |
| r3-s42 | T7 B | Tom | running club (friends.csv, set up) | `setup:T7-B.txt` | |
| r3-s43 | T7 B | Grace | running club (friends.csv, set up) | `setup:T7-B.txt` | |
| r3-s44 | T7 B | Jordan | running club (friends.csv, set up) | `setup:T7-B.txt` | |
| r3-s45 | T14 | Ruth | Les Miserables | `setup:T14.txt` | |
| r3-s46 | T14 | Grace | Les Miserables | `setup:T14.txt` | |
| r3-s47 | T14 | Morgan | Les Miserables | `setup:T14.txt --sr` | screen reader |
| r3-s48 | T13 | Dev | Les Miserables | `setup:T13.txt` | |
| r3-s49 | T13 | Alex | Les Miserables | `setup:T13.txt` | |
| r3-s50 | T8 | Nadia | Les Miserables | `empty` | |
| r3-s51 | T8 | Dana | Les Miserables | `empty` | |
| r3-s52 | T5 | Morgan | club-members.graphml | `empty --sr` | screen reader |
| r3-s53 | T3 | Elena | friends.csv | `empty` | |
| r3-s54 | T2 | Dev | a sample of their choice | `empty` | |
| r3-s55 | T16 | Tom | participant's choice | `empty` | measured |
| r3-s56 | T16 | Ruth | participant's choice | `empty` | measured |

Sessions per persona: Elena 6, Tom 6, Nadia 6, Dev 6, Grace 6, Ruth 7, Morgan 7, Sam 3, Alex 3,
Jordan 2, Dana 2, Mara 2.

## How a session runs

1. **Before the first session:** the frozen copy of the build,
   `design/ui/studio/tmp/researcher/r3/dist-b7590f8de/index.html`, carries `b7590f8de22b
   graphty@0.8.53`; `git -C <worktree> diff --stat b7590f8de -- graphty graphty-element
   compact-mantine` is empty; the frozen files match the SHA-256 list in `preflight.md`.
2. **Every session serves the frozen copy:** `REAL_DIST=/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tmp/researcher/r3/dist-b7590f8de`
   in the environment of every `real.mjs` command, so a rebuild of `graphty/dist` during the round
   cannot change the app under a running session. A fix that lands during the round is studied in
   the next study, not this one.
3. **At most 3 participants alive at once** (graders' reproductions take the fourth browser), and
   every attempt ends with `real.mjs --end`, even when its agent is stopped. A session nobody
   steps for 15 minutes closes itself.
4. **One fresh agent per session.** It gets exactly: its persona file (the full path above), the
   task's prompt from `tasks.md` (the A or B prompt for its dataset), the tool's participant
   instructions (`tool/README.md`, "A session", "Steps" and, for Morgan, "Screen-reader mode",
   which now includes `--read`), the session folder and its start, and these rules:
   - after each step, say in one or two sentences what you see and what you will try next; say out
     loud when each part of the task is done;
   - stop when done, when giving up, or when repeating without progress; there is no step limit;
   - end with "How easy or difficult was this, from 1 (very difficult) to 7 (very easy)?" and its
     reason;
   - always `--end` the session.
   Nothing else: no `answers.md`, `criteria.md`, this plan, notes, digests, design documents,
   source code, pilot or preflight folders, or other sessions.
5. **Sam** uses `--key`, `--type` and `--upload` only and sees every screenshot.
6. **Morgan** starts with `--sr` and never opens a screenshot; the tool refuses any pointer step.
7. **A runner never helps.** A participant's question is recorded and answered "do what you would
   do on your own".
8. **Void and re-run** (same persona and task, `b` suffix) when the tool did something a person
   could not, failed to do what was asked, or the session was stopped from outside. Count and
   report voids (target 0).

## Grading

As round 2 (`rounds/round-2/plan.md`, "Grading"), using the round 3 entries of `answers.md`, which
give round 2 and round 3 scoring side by side where a route changed. Graders also record, for the
round's questions:

- **T10:** "every name reached: yes / no" apart from the grade, and wrong turns spent hunting for
  the hidden names. Turning the checkbox on and saying every name is written is S, not
  `false-done`.
- **T9 and T15 (sizing):** whether the Size list was used, closed, or answered "Fixed size"; the
  chain-link route after closing the list is SD on round 3 (a detour then a correction); whether
  the participant named sizing as a difficulty.
- **T11:** whether a community analysis was run and a group layout tried; a group layout greyed
  after a finished community run is a build regression (F `dead-end`, build-decided). "Did it
  help" is an opinion: expect it to differ between Rings by group and Columns by group.
- **Run names:** every pause or question about a run's name (round 2: 17). Either word ("PageRank"
  or "influence") still names the measure.
- **T12:** the route (the Degree row by its word or its chevron, G, the context menu, dots one at
  a time).
- **Screen reader:** whether `--read` was used and what it offered; whether the export dialog
  kept focus; record a load or run that was not announced against bar 8, not against Morgan.
- **Watch, not pre-scored:** a size read from the 3D drawing where perspective makes a smaller-
  ranked dot look bigger (friends.csv: Ava drawn larger than Farah, #1) is `meaning-wrong` on that
  claim; the key covering a node (Pazzi on Florentine families, Blacheville on Les Miserables) is
  one event per dataset, not one per session.
- **Tool prints:** `ambiguous` for a label and its control is gone (fixed in `real.mjs`); the
  remaining `ambiguous` prints ("PageRank", "Group 1") are not participant wrong turns.
- **Ease** is the participant's rating as asked (7 = very easy).

## Reporting

`rounds/round-3/scores.md` and `insights.md` after the last session: every bar with its
denominator, with and without build-decided and void sessions; T15 first, then the core four, each
two-dataset task per half; the comparison with round 2 (core four success and mean ease; T10 wrong
turns; the sizing share; T11 ease; run-name pauses), each change credited only on the route it
changed; bar 7 by participant; bars 8 and 9 from the specialist's script on this build
(`preflight.md` has the automated parts already measured); what worked per task; every finding with
severity, how many saw it, and the package its fix belongs in. All participants are simulated: a
failure is strong evidence, a pass is weak until real people confirm it. Screen-reader speech is
not tested by this study. Round 3 is the last round: the report ends with the recommendation for
the next study, with real people.
