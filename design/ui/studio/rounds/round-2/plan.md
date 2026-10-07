# Round 2 plan: the tier 1 study on the real graphty app

Round 2 re-tests the tier 1 workspace of the graphty app (a first-time user's core path from an
empty app) after the fixes made since round 1. It runs on a local production build of the studio
worktree at commit 4a7a1a7fb (graphty 0.8.53, build stamp `4a7a1a7fbdba`, opened at `/?next`),
driven one step at a time by `tool/real.mjs`. It follows `criteria.md` ("Round plan" and the bars)
with one logged change: 56 sessions instead of the full sizes (change log, 2026-10-06, "Round 2
runs 56 sessions").

Whether the round may start is in `preflight.md`.

## What changed since round 1, and which tasks it touches

Round 1 (`rounds/round-1/scores.md`): 39 of 43 graded sessions succeeded. The neighbors task (T12)
failed its bar on the Les Miserables half (1 of 3); the whole first session (T15), your own list of
ties (T3), who matters most (T7), circles of characters (T8) and untangle the drawing (T11) passed;
names (T10), bigger dots (T9), the broken file (T5), what did I get (T6), the picture and numbers
(T13) and stop and come back (T14) stayed open because sessions were cut off or the screen-reader
participant could not run. The mean ease was 4.50 of 7 (core four 4.07).

Since then the build gained the round 1 fixes and a larger merge of interface changes. What a
participant meets differently, by task:

| Change on the build | Tasks whose path or screen it changes |
|---|---|
| With one node selected, Neighborhood (key G, or the node's context menu) opens the list "Javert's 17 connections"; the floating selection bar is gone; the context menu opens by right-click, Shift+F10 or touch-and-hold | T12 |
| The Degree row draws a chevron ("Degree 17 >"), a cue round 1's decisions held back | T12 |
| The several-node Summary drops "Babet (1)" and "Edges 0"; the Selection row and the Data > Sources tables no longer dead-end | T12, T3, T6 |
| The Size field has no empty "Open list" arrow; the Style tab's shape, binding and label lists open in titled pop-outs; focus moves to the new line after a Style pick | T9, T10, T15 |
| The mouse wheel zooms the 3D view | T10, T12, T15 |
| Layout opens a list of methods with descriptions; a method opens a form with Apply; methods that cannot draw this graph are greyed with their reason; "Force, flat" is folded into Force | T11 |
| Export lists one row per file type (Image first, then Data) instead of tabs; Data opens on the whole-project format, and CSV opens on the Edges table | T13, T15 |
| Save keeps the project in this browser; the first Save asks for a name; Save local copy... downloads the file; the main menu is the app's one menu and "Close project" is now "Back to start" | T14 |
| Files open through one path (chosen or dropped) | T3, T5, T15 B, T16 |
| A run row opens on its Style tab; the Top 10 is one click away on Values | T7, T8, T9, T15 |
| A visible focus ring on every focusable control | every keyboard session |
| Unchanged: runs are still named by their result ("Influence", "Communities"); the method-name change was not made | - |

Every tier 1 task's path changed or was touched, so every tier 1 task runs in round 2.

## The questions this round answers first

1. Does the neighbors task (T12) now pass on **both** halves? Report Les Miserables (17 neighbors)
   and Florentine families (6) separately: round 1's detour of clicking dots one at a time works
   at 6 and breaks at 17, so a pass on Florentine alone says nothing. Two changes reach the list
   at once (the Neighborhood route and the Degree row's chevron), so graders record each
   participant's route; a pass shows the task works, not which change made it work.
2. Do names (T10) and bigger dots (T9) reach their bars at full size, and does the sizing chain
   still cost every session its ease (all 12 round 1 SD sessions named it)?
3. Does the whole first session (T15) hold at 10 sessions, with the new export list and save?
4. Bar 7 for the first time: can Morgan (screen reader) and Sam (keyboard only) do their tasks?
5. The stall rule: do the core four (T15, T10, T12, T9) gain over round 1 in success and mean ease
   (round 1: 24 of 26 graded core sessions succeeded, mean ease 4.07)? No gain means the next study
   is with real people, not round 3.

## Size: 56 sessions

| Group | Tasks | Sessions | How bar 1 is scored |
|---|---|---|---|
| Core four, full size | T15 (6 Les Miserables + 4 own file), T10 (4 + 4), T12 (4 + 4), T9 (4 + 4) | 34 | As written: 80% per task (8 of 10 on T15, 7 of 8 on the others) and each dataset half at least 3 of 4 (5 of 6 on T15's Les Miserables half) |
| Reduced, path changed | T14 3, T5 3, T11 3, T13 2, T6 2, T3 2, T7 (running club) 2, T8 2 | 19 | Passes only if every session is S or SD (3 of 3, 2 of 2), as in round 1. One F or G puts the task below its bar |
| Reduced, one session | T2 1 | 1 | 1 of 1. T2 was never run; one session checks the first step and asks the usage-data question nobody else is asked |
| Measured, not graded | T16 2 | 2 | Adds to round 1's thin baseline (one complete session) |

Why the core four keep their full size: T12 is below its bar, T10 and T9 are open with sessions
owed, and the four decide the stall rule; the per-half floor needs 4 per half to tolerate one
failure. Why the others run small: at full size (6 for T3 and T5, 5 for each other task, 5 for
T16) the round would need 81 sessions against a cap of 56. The reduced tasks' all-must-pass rule
means a single failure still shows; a reduced pass is reported with its n ("2 of 2", never "100%").

The 7 round 1 sessions that were cut off or never started run here with the same persona and task
(marked "carried" below): Sam on names, College football; Jordan on the whole first session, own
file; Ruth on bigger dots, Les Miserables; Grace on bigger dots, Florentine families; Tom on the
broken file; Dana on the picture and numbers; Elena on the first look. They count as round 2
sessions.

## Participants

36 of 56 sessions (64%) are by first-time personas: Elena, Tom, Nadia, Dev, Grace and Ruth, 6
sessions each. Every core half has 3 first-time participants except T15's own-file half (2 of 4,
as in round 1). Each first-time persona met at most one half of each core task in round 1; round 2
gives most of them the other half (fresh pairings of persona and dataset), and every reduced task
goes to personas who did not take it in round 1.

Keyboard bar (bar 7): Morgan (blind, screen reader) takes the Les Miserables halves of T15, T10, T12
and T9, plus T5, T6 and T14 (7); Sam (sighted, keyboard only) takes the other halves of T15, T10 and
T12 (3). Morgan runs in the tool's screen-reader mode (`--sr`), which now refuses every pointer
step and does not print screenshot paths (`preflight.md`, item 2).

Others: Alex 3, Dana 3, Jordan 2, Mara 2.

Persona files (the full path is in every session's record, because the session runner otherwise
finds the thinner round 8 files of the same names for Dev, Grace and Ruth, and no file at all for
Sam):

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

Run order follows `criteria.md`: Sam's carried names session first (the only keyboard evidence on
that task), then T15, T10, T12 and T9, then the reduced tasks, the ones whose path changed most
first. Each session folder is `rounds/round-2/sessions/<id>`. Start is the `real.mjs --start`
argument; `setup:` files are in `rounds/round-2/setups/` (copies of round 1's, which still run on
this build); files are in `tool/files/`. There is no step cap.

| Id | Task | Persona | Dataset | Start | Note |
|---|---|---|---|---|---|
| r2-s01 | T10 B | Sam | College football | `empty` | carried (r1-s16b); keys only |
| r2-s02 | T15 A | Grace | Les Miserables | `empty` | |
| r2-s03 | T15 A | Ruth | Les Miserables | `empty` | |
| r2-s04 | T15 A | Tom | Les Miserables | `empty` | |
| r2-s05 | T15 A | Nadia | Les Miserables | `empty` | |
| r2-s06 | T15 A | Mara | Les Miserables | `empty` | |
| r2-s07 | T15 A | Morgan | Les Miserables | `empty --sr` | screen reader |
| r2-s08 | T15 B | Elena | friends.csv | `empty` | |
| r2-s09 | T15 B | Dev | friends.csv | `empty` | |
| r2-s10 | T15 B | Jordan | friends.csv | `empty` | carried (r1-s08b) |
| r2-s11 | T15 B | Sam | friends.csv | `empty` | keys only |
| r2-s12 | T10 A | Nadia | Les Miserables | `empty` | |
| r2-s13 | T10 A | Grace | Les Miserables | `empty` | |
| r2-s14 | T10 A | Ruth | Les Miserables | `empty` | |
| r2-s15 | T10 A | Morgan | Les Miserables | `empty --sr` | screen reader |
| r2-s16 | T10 B | Elena | College football | `empty` | |
| r2-s17 | T10 B | Tom | College football | `empty` | |
| r2-s18 | T10 B | Dev | College football | `empty` | |
| r2-s19 | T12 A | Tom | Les Miserables | `empty` | |
| r2-s20 | T12 A | Dev | Les Miserables | `empty` | |
| r2-s21 | T12 A | Grace | Les Miserables | `empty` | |
| r2-s22 | T12 A | Morgan | Les Miserables | `empty --sr` | screen reader |
| r2-s23 | T12 B | Elena | Florentine families | `empty` | |
| r2-s24 | T12 B | Nadia | Florentine families | `empty` | |
| r2-s25 | T12 B | Ruth | Florentine families | `empty` | |
| r2-s26 | T12 B | Sam | Florentine families | `empty` | keys only |
| r2-s27 | T9 A | Ruth | Les Miserables | `empty` | carried (r1-s26b) |
| r2-s28 | T9 A | Dev | Les Miserables | `empty` | |
| r2-s29 | T9 A | Tom | Les Miserables | `empty` | |
| r2-s30 | T9 A | Morgan | Les Miserables | `empty --sr` | screen reader |
| r2-s31 | T9 B | Grace | Florentine families | `empty` | carried (r1-s27b) |
| r2-s32 | T9 B | Elena | Florentine families | `empty` | |
| r2-s33 | T9 B | Nadia | Florentine families | `empty` | |
| r2-s34 | T9 B | Alex | Florentine families | `empty` | |
| r2-s35 | T14 | Nadia | Les Miserables | `setup:T14.txt` | |
| r2-s36 | T14 | Alex | Les Miserables | `setup:T14.txt` | |
| r2-s37 | T14 | Morgan | Les Miserables | `setup:T14.txt --sr` | screen reader |
| r2-s38 | T13 | Dana | Les Miserables | `setup:T13.txt` | carried (r1-s46b) |
| r2-s39 | T13 | Ruth | Les Miserables | `setup:T13.txt` | |
| r2-s40 | T11 | Elena | Les Miserables | `empty` | |
| r2-s41 | T11 | Jordan | Les Miserables | `empty` | |
| r2-s42 | T11 | Mara | Les Miserables | `empty` | |
| r2-s43 | T5 | Tom | club-members.graphml | `empty` | carried (r1-s34b) |
| r2-s44 | T5 | Ruth | club-members.graphml | `empty` | |
| r2-s45 | T5 | Morgan | club-members.graphml | `empty --sr` | screen reader |
| r2-s46 | T6 | Grace | Les Miserables | `empty` | |
| r2-s47 | T6 | Morgan | Les Miserables | `empty --sr` | screen reader |
| r2-s48 | T3 | Tom | friends.csv | `empty` | |
| r2-s49 | T3 | Alex | friends.csv | `empty` | |
| r2-s50 | T7 B | Dev | running club (friends.csv, set up) | `setup:T7-B.txt` | |
| r2-s51 | T7 B | Dana | running club (friends.csv, set up) | `setup:T7-B.txt` | |
| r2-s52 | T8 | Grace | Les Miserables | `empty` | |
| r2-s53 | T8 | Dana | Les Miserables | `empty` | |
| r2-s54 | T2 | Nadia | a sample of their choice | `empty` | |
| r2-s55 | T16 | Elena | participant's choice | `empty` | carried (r1-s48b); measured |
| r2-s56 | T16 | Dev | participant's choice | `empty` | measured |

Sessions per persona: Elena 6, Tom 6, Nadia 6, Dev 6, Grace 6, Ruth 6, Morgan 7, Sam 3, Alex 3,
Dana 3, Jordan 2, Mara 2.

## How a session runs

1. **Before the first session:** `graphty/dist/index.html` carries build stamp `4a7a1a7fbdba`,
   and `git -C <worktree> diff --stat 4a7a1a7fb -- graphty graphty-element compact-mantine` is
   empty (a commit of studio documents alone does not move the build); the frozen files match the
   SHA-256 list in `preflight.md`. If the app or the element changed, rebuild, re-run the
   preflight walks and re-record the reference values first.
2. **At most 3 participants alive at once** (the runner's session slots; graders' reproductions
   take the fourth browser), and every attempt ends with `real.mjs --end`, even when its agent is
   stopped. A session nobody steps for 15 minutes also closes itself.
3. **One fresh agent per session.** It gets exactly: its persona file (the full path above), the
   task's prompt from `tasks.md` (the A or B prompt for its dataset), the tool's participant
   instructions (`tool/README.md`, "A session", "Steps" and, for Morgan, "Screen-reader mode"), the
   session folder and its start, and these rules:
   - after each step, say in one or two sentences what you see and what you will try next; say out
     loud when each part of the task is done;
   - stop when done, when giving up, or when repeating without progress; there is no step limit;
   - end with "How easy or difficult was this, from 1 (very difficult) to 7 (very easy)?" and its
     reason;
   - always `--end` the session.
   Nothing else: no `answers.md`, `criteria.md`, this plan, notes, digests, design documents,
   source code, pilot folders or other sessions.
4. **Sam** uses `--key`, `--type` and `--upload` only and sees every screenshot.
5. **Morgan** starts with `--sr` and never opens a screenshot; the tool refuses any pointer step.
6. **A runner never helps.** A participant's question is recorded and answered "do what you would
   do on your own".
7. **Void and re-run** (same persona and task, `b` suffix) when the tool did something a person
   could not, failed to do what was asked, or the session was stopped from outside (the
   provider's filter, the run stopped, the agent's time limit). Count and report voids (target 0).

## Grading

As round 1 (`rounds/round-1/plan.md`, "Grading"), with these additions:

- **T12 per half, always.** Report Les Miserables and Florentine families separately, and record
  which route reached the list: the Degree value, Neighborhood (key G or the context menu), or
  dots one at a time.
- **Sizing chain:** for every T9 and T15 session, record whether the participant named the sizing
  steps as a difficulty, so round 1's "all 12 SD sessions" can be compared.
- **Overlays:** record every session where the legend, a pop-out or the Layout list covers a node
  the participant needed.
- **Graders flag a session that ended on repetition without progress** (graded G) and any that
  ended for an outside reason (void).
- **Ease** is the participant's rating as asked (7 = very easy); no conversion.
- The answer key's round 2 paths and reference values are in `answers.md` (re-recorded on
  4a7a1a7fb; see `preflight.md`).

## Reporting

`rounds/round-2/scores.md` and `insights.md` after the last session: every bar with its
denominator, with and without build-decided and void sessions; the core four first, T15 at the
top, T12 per half; the stall comparison with round 1 (core four success and mean ease); first-time
against others on the core four; bar 7 by participant; what worked per task; every finding with
severity, how many saw it, and the package its fix belongs in. All participants are simulated: a
failure is strong evidence, a pass is weak until real people confirm it. Screen-reader speech is
not tested by this study.
