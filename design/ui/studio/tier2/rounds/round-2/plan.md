# Tier 2 round 2 plan: returning users on the real graphty app

Round 2 re-runs every tier 2 task on the round 2 study build, 8f0d5a6f7791 (graphty@0.8.61,
commit 8f0d5a6f7), served from `/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r2d4-8f0d5a6f7/`
with `REAL_DIST=<that folder>` on every `tool/real.mjs` command (the first line of
`../../criteria.md`). Its sessions are weighted toward the tasks that missed a bar in round 1 and
the tasks whose route changed since. The bars, how they are scored and the stop rules are in
`../../criteria.md`; this plan changes none of them.

## Was there a dry run before this round, and will participants hit build faults?

The sessions are for learning what a returning user needs. A session spent on a broken control,
a focus mark in the wrong place or a fault in the study tool teaches nothing about that, so this
round's build was walked before any session, more widely than round 1's was.

Round 1's dry runs walked only the answer key's routes, by pointer only, and never checked the
study tool. Participants met no broken control on those routes, but they met eight build defects
on the detours they chose instead (styling an edge from a run, recoloring a selected node), and
they met the study tool's own faults more often than the build's (more than four browsers at
once, a click matched to the wrong row, a file drop that did nothing, two follow-ups never sent,
a participant reading facilitator files). So before this round:

| Walk                                         | Build walked                              | What it covered                                                                                                                         | Report                       |
| -------------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| First (detours)                              | 4e112b8e9df2, f164ebed85a7, 5ac7ca8f7058  | Every task's success path plus round 1's commonest wrong turns, by pointer and by keyboard, Enter, Tab and Escape in every field opened; the two faults only one round 1 session met, each given a script first | `../../dry-run-r2-1.md`      |
| Second                                       | fabc16247403                              | Every task half piloted from its start                                                                                                  | `../../dry-run-r2-2.md`      |
| Third                                        | eaea2a75d95b                              | The same                                                                                                                                | `../../dry-run-r2-3.md`      |
| Fourth                                       | 2dcea6dd5bba                              | The same                                                                                                                                | `../../dry-run-r2-4.md`      |
| Pilots on the study build                    | 8f0d5a6f7791                              | Every task half from its start, with the T17 and T18 follow-ups; every success path landed first try, no script, console or request errors | `../r2d4/pilot/`, `../../answers.md` |
| Detours on the study build (this plan)       | 8f0d5a6f7791                              | The first walk's 30 detour walks again, on the build the sessions use                                                                   | below                        |
| Study tool self-check, 5 in a row (this plan) | 8f0d5a6f7791                              | `real.mjs --prove`: clicks by name, point and drawn label, hover, upload, download, save and reopen, a killed client                     | below                        |

The study tool was fixed before the walks: one machine-wide limit of four browsers, an ambiguous
click refused with its candidates named, real file drops, the follow-up sent on every T17 and
T18 session, and participants' folders holding only their briefing (`../../../tool/README.md`).
The scripts bars 2, 7, 8 and 9 are scored by were built, each proven on a planted failure.

**The detour walks on the study build (2026-10-09).** All 30 walks of `../../pilot/detours.sh`
(every task's success path and round 1's commonest wrong turns, by pointer and by keyboard) were
run on 8f0d5a6f7791 itself; every `session.json` reads `8f0d5a6f7791 graphty@0.8.61`. They had
last run on 5ac7ca8f7058, a build made from the working tree while round 2's changes were still
being written, so until now the study build's detours had not been walked. Result: **30 of 30
reach the screens they should; no fault a participant could meet.** Two walks needed a second run,
neither for an app fault:

- **T20-D1** (the bus-stop file opened from the start screen) checked for the "Higher means"
  choices before the minutes column was made the weight. The screen was right: the file opens on
  the Data page titled "Open as a new graph", and "Higher means" (Not set, Closer, Farther,
  Capacity) appears once the column's role is Weight, as on the success path
  (`tmp/researcher/r2-detours-8f0d5/T20-D1/04.png`, `07.png` under `design/ui/studio/`). The walk
  now checks in that order and passes.
- **T12R-P** collided with a walk session left running when the walk script was edited while it
  ran (bash reads a script as it goes). That session was stopped and the walk passed alone.

Walk logs and screenshots: `design/ui/studio/tmp/researcher/r2-detours-8f0d5/`.

**The study tool's self-check (`real.mjs --prove`) on the study build:** **5 of 5 runs clean in a row**, 62 checks each, every one `ok` (`tmp/researcher/r2-prove-8f0d5/run1.txt` to `run5.txt`). Item 2 of the gate holds, so T19 and T21 may run in their place in the order.

**What the walks confirm is built** (preflight item 10, checked on the served build, not the
commit log): the find box's hint for a condition typed without "=" (T22-D1); the start-screen open
through the Data page (T4-D1, T20-D1); the path's Weight list starting on the loaded weight,
"minutes (farther)" (T20-D1); no Edges side on a run's Style tab, so no line color lands silently
on Everything (T22-D2); Enter, Tab and Escape in the filter step editor (T17-P, T17-D2); the
Analyze list closing on Escape and on a click on the drawing (T17-D1); the selection ring not
tinting a recolored node (T18-D1, T24-P); the note editor's keys (T19-P, T19-K); and the source's
"..." on a left click (T21-D1, by eye on its screenshots). Not walked by a script: the ellipsis on
long names in the find list (the expert audit measures it on `long-names.csv`, bar 10) and the
four word fixes (the pilots' screens in `../r2d4/pilot/`).

**Will participants hit build faults?** On every route walked, no. What participants can still
meet are the open design questions the sessions exist to answer (where a feature lives, names not
drawn by default) and the known overlap of drawn names, which is the element's label placement
and is reported as a class (bar 10). A fault on a route nobody walked is still possible; graders
mark any grade a build defect decided, and the round reports successes with and without them.

## The gate before the first session

Sessions start only when all of these hold, each with its evidence in `preflight.md` beside this
plan:

1. The detour walks run clean on 8f0d5a6f7791, or each failing walk's screenshot shows the fault
   is the walk script's and not on a route a participant can take.
2. `real.mjs --prove` prints only `ok` on 5 runs in a row on 8f0d5a6f7791. Until it does, no T19
   or T21 session starts (each saves or replaces a file).
3. The open-work lister runs on every session folder after `--end` (`work-start.json` and
   `work.json`), so bar 2 is scored from lists, not by eye.
4. Round 1's unfinished items are closed in the runner, not hoped for: every T17 and T18 session
   gets its follow-up (the tool refuses `--end` without it); a void is re-run from a new folder
   with a `b` suffix the same day; no more than four sessions are alive at once.

## The questions round 2 answers

1. **The three new routes, each credited only on its own route.** T22: does a condition typed in
   the find box now lead, through the hint, to the rule (round 1: 3 of 4, below the 4 of 4 floor,
   ease 2.75)? T21: does the "..." on the source's inspector put "Replace with file..." where the
   left click lands (round 1: 1 give-up, 7 of 7 others hunted)? T20: does opening the file from
   the start screen now reach the weight's meaning at load, so a session sets it before any run
   (round 1: 0 of 7 at the success path, 3 of 7 never set it for every run)? A pass on the old
   route says nothing about the change; graders record which route each session took.
2. **The core four's cost (bar 11).** T20 (median 23 steps against 22) and T18 (9.5 against 8)
   were over twice the success path. Did the new T20 route and the path's Weight list starting on
   the loaded weight bring them under?
3. **Severity 4, read strictly (bar 3).** Filtering from the Graph place (T17), Replace (T21) and
   a condition in the find box (T22) each made one participant leave in round 1. Does any
   participant leave over any of them now?
4. **Out-of-date marks (bar 5).** After Replace and before Rerun, does any participant read the
   old run's numbers as current now that the canvas key says ", out of date"?
5. **A second path run (bar 2).** Round 1 scored 5 sessions `not-kept` when a second Shortest path
   replaced the first. Graders rule on it now, from the open-work lists.
6. **The false-answer trap on T12R.** On this build Down arrow in the find list opens the person's
   first tie, not the next person. Does any participant read a tie's value (Les Miserables:
   "shared_chapters 17") as the person's answer?
7. **Doors and habits, as round 1.** First move and the second place looked (round 1: the second
   place was the real signal, the column for 6 of 7 on T20, 4 of 4 on T22); door used where a
   feature has more than one.

Expected to keep failing, not fixed between rounds: bar 10 on drawn names overlapping (the
element's label placement). The layout is not seeded, so each drawing differs: report the class,
not each instance.

## Size: 56 sessions, the studio's cap per round

The round plan (`../../criteria.md`) asks for every task below its bar at full size, the core
four at full size always, and each task a fix touched at 4 or more. Every tier 2 task was touched
by a change since round 1, so that rule would need 60. As in tier 1's rounds 2 and 3, the cap
holds and the reduced tasks run below 4 where they must; such a task passes bar 1 only if every
session succeeds.

| Group            | Tasks                                   | Sessions | Why                                                                                                   | Bar 1 needs                |
| ---------------- | --------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------- | -------------------------- |
| Core four        | T20, T17, T18, T21 at 4 + 4 each        | 32       | Always at full size; T20 and T18 missed bar 11, T17 and T21 each had a give-up, T20 and T21 have new routes | 7 of 8, 3 of 4 per half    |
| Below its bar    | T22 at 4 + 4                            | 8        | The only task below bar 1 in round 1 (3 of 4); its route changed (the find hint); raised from 4 to full size | 7 of 8, 3 of 4 per half    |
| Touched, 4       | T4 at 2 + 2; T24 at 2 + 2               | 8        | T4: the start-screen open now goes through the Data page, and the words after a load changed. T24: the selection ring no longer tints its two ends, and a click on a drawn name now selects | 4 of 4, 2 of 2 per half    |
| Touched, below 4 | T19 at 1 + 2; T23 at 2 + 1              | 6        | Each touched only off its success path (T19: the note editor's focus and keys; T23: the find list's marked first result and long names) | 3 of 3                     |
| Returning T12    | T12R at 1 + 1                           | 2        | Its full size; its route changed (Down arrow now opens a tie), graded with tier 1's key (T12)         | 2 of 2                     |

Every session is by a returning persona: 37 of 56 (66%) by personas who did tier 1 as first-time
users (Grace, Ruth, Dev, Elena, Nadia, Tom), 19 by the regular analysts (Alex, Jordan, Dana). Each
persona takes 6 sessions, Ruth and Jordan 7. No persona takes both halves of one task; Ruth takes
no T19 (her persona file's own word "notes" names the place T19 measures). T19 A, T23 B and each
T12R half have one session, so one persona each.

## Who takes which task

**The core four and T22 swap round 1's halves**: every persona meets the other dataset of each
task it took in round 1 (Grace did T20 on the trails file; now she does the bus stops). This keeps
round 1's balance of graduates and analysts per half, which was checked against the roster, and
it stops a persona's round 1 history with one dataset standing in for the design. T22 adds four
personas so it reaches full size with eight different people. The reduced tasks rotate the same
way where they can: Dana, whose exports come as two sheets, keeps T4; Ruth and Jordan, whose
histories name a person's list of connections as the thing they use most, keep T12R and swap
halves.

| Task | Half A                         | Half B                           |
| ---- | ------------------------------ | -------------------------------- |
| T20  | Grace, Nadia, Tom; Jordan      | Dev, Elena; Alex, Dana           |
| T22  | Ruth, Elena, Tom; Dana         | Nadia, Grace; Jordan, Alex       |
| T17  | Grace, Dev, Tom; Alex          | Ruth, Elena, Nadia; Jordan       |
| T18  | Nadia, Dev, Tom; Alex          | Ruth, Grace, Elena; Dana         |
| T21  | Dev, Ruth, Nadia; Dana         | Grace, Tom; Alex, Jordan         |
| T4   | Tom, Dev                       | Elena; Dana                      |
| T19  | Dev                            | Grace; Jordan                    |
| T23  | Nadia, Ruth                    | Elena                            |
| T24  | Alex, Jordan                   | Ruth; Dana                       |
| T12R | Jordan                         | Ruth                             |

Tier 1 graduates first in each cell, analysts after the semicolon. `sessions.py` beside this
plan holds the run order and asserts all of the above (the count, the sizes, each half's
personas, the round 1 swap, the per-persona totals, the graduate share, no Ruth on T19) and writes
`sessions.json` and `table.md`.

**Tom's exits.** Tom's persona file scripts a give-up on the second failed attempt, which decided
2 of round 1's 3 non-successes. He stays in the core four (he is the persona who opens files with
"Open project or file...", the route T20's change is about), and a give-up his rule covers is
labeled "scripted exit" beside the G, as `../../criteria.md` ("Grades") requires.

## How a session runs

As round 1 (`../round-1/plan.md`, "How a session runs"), with these changes:

- **Folder:** `sessions/<id>/` beside this plan; a void is re-run as `<id>b` in a new folder.
- **Start:** `REAL_DIST=<frozen build> node tool/real.mjs --start sessions/<id> <start>`, the start
  from the table: `empty` for T4 and T20, otherwise `setup:<file>`, a ranked start as each history
  leaves the work. No session starts from a saved project file (`../../tasks.md`, "Starts"):
  reopening was measured in tier 1, and a setup reaches the same open work without depending on
  the project format. Check each session's `01.png` against its expected start before the first
  step: under load a setup click can land or not while the setup log reads "could not click"
  either way.
- **Never wrap `real.mjs --start` in `with-browser.sh`**: it takes its own slot, and a second
  wrap waits on itself (the cause of round 1's void r1-s04).
- **Records:** `session.json`'s `buildStamp` must read `8f0d5a6f7791 graphty@0.8.61`; a session on
  any other build is void.
- **Follow-ups:** every T17 and T18 session gets its half's follow-up from `../../tasks.md` word
  for word, whatever the runner thinks of the first answer.
- **At most 4 sessions alive at once**; a session's clock starts only when its slot is free.

## Grading and scoring

As round 1 (`../round-1/plan.md`, "Grading and scoring"), with what round 1's grades left out now
required in every grade, because the scores had to reconstruct it:

- the first move, whether it came straight from the history, and the second place looked;
- the door used where a feature has more than one, and **which route** the session took on T20,
  T21 and T22 (the success path, the round 2 route in `../../answers.md`, or another);
- T20: how the weight's meaning was set (at load, left "Not set", or on one run only);
- T21: which nodes in both files moved after Replace, and whether the participant read the old
  run's values before Rerun;
- T12R: whether Down arrow opened a tie, and whether its value was reported as the answer;
- every difference between `work-start.json` and `work.json`, with whether the participant chose
  it (bar 2); a second path run replacing the first is ruled on, not only flagged;
- "scripted exit" beside a G when the persona file's rule decided it, with the rule quoted.

Steps are counted as round 1 counted them (screenshots after the start; on T17 and T18 the main
prompt only), so the two rounds compare. Bar 11 and the steps measure keep the success paths'
counts (T20 11, T17 7, T18 4, T21 6, T22 3); a session on a round 2 route is compared with the
same limit. Scoring, skeptics and the expert walkthrough and screenshot audit (bars 8, 9 and 10,
on this build, apart from the sessions) follow `../../criteria.md`.

## Run order

T20, T22, T17, T18, T21, then T4, T19, T23, T24 and T12R: the three new routes surface first (T20,
T22; T21 waits for the gate's save check), halves alternate so a build defect on one dataset shows
within a task's first few sessions.

## Sessions

"(analyst)" marks the three regular analysts; every other persona did tier 1 as a first-time user.
Persona files: `../round-1/plan.md`, "Persona files".

| Id     | Task | Half and data | Persona | Start |
| ------ | ---- | ------------- | ------- | ----- |
| r2-s01 | T20 | A: bus stops, bus-stops.csv | Grace | `empty` |
| r2-s02 | T20 | B: hiking trails, trails.csv | Dev | `empty` |
| r2-s03 | T20 | A: bus stops, bus-stops.csv | Jordan (analyst) | `empty` |
| r2-s04 | T20 | B: hiking trails, trails.csv | Alex (analyst) | `empty` |
| r2-s05 | T20 | A: bus stops, bus-stops.csv | Nadia | `empty` |
| r2-s06 | T20 | B: hiking trails, trails.csv | Elena | `empty` |
| r2-s07 | T20 | A: bus stops, bus-stops.csv | Tom | `empty` |
| r2-s08 | T20 | B: hiking trails, trails.csv | Dana (analyst) | `empty` |
| r2-s09 | T22 | A: bus stops, bus-stops.csv | Ruth | `setup:bus-stops-ranked.txt` |
| r2-s10 | T22 | B: Les Miserables | Nadia | `setup:lesmis-ranked.txt` |
| r2-s11 | T22 | A: bus stops, bus-stops.csv | Dana (analyst) | `setup:bus-stops-ranked.txt` |
| r2-s12 | T22 | B: Les Miserables | Jordan (analyst) | `setup:lesmis-ranked.txt` |
| r2-s13 | T22 | A: bus stops, bus-stops.csv | Elena | `setup:bus-stops-ranked.txt` |
| r2-s14 | T22 | B: Les Miserables | Grace | `setup:lesmis-ranked.txt` |
| r2-s15 | T22 | A: bus stops, bus-stops.csv | Tom | `setup:bus-stops-ranked.txt` |
| r2-s16 | T22 | B: Les Miserables | Alex (analyst) | `setup:lesmis-ranked.txt` |
| r2-s17 | T17 | A: running club, friends.csv | Grace | `setup:friends-ranked.txt` |
| r2-s18 | T17 | B: Les Miserables | Ruth | `setup:lesmis-ranked.txt` |
| r2-s19 | T17 | A: running club, friends.csv | Alex (analyst) | `setup:friends-ranked.txt` |
| r2-s20 | T17 | B: Les Miserables | Jordan (analyst) | `setup:lesmis-ranked.txt` |
| r2-s21 | T17 | A: running club, friends.csv | Dev | `setup:friends-ranked.txt` |
| r2-s22 | T17 | B: Les Miserables | Elena | `setup:lesmis-ranked.txt` |
| r2-s23 | T17 | A: running club, friends.csv | Tom | `setup:friends-ranked.txt` |
| r2-s24 | T17 | B: Les Miserables | Nadia | `setup:lesmis-ranked.txt` |
| r2-s25 | T18 | A: running club, friends.csv | Nadia | `setup:friends-ranked.txt` |
| r2-s26 | T18 | B: Florentine families | Ruth | `setup:florentine-ranked.txt` |
| r2-s27 | T18 | A: running club, friends.csv | Alex (analyst) | `setup:friends-ranked.txt` |
| r2-s28 | T18 | B: Florentine families | Dana (analyst) | `setup:florentine-ranked.txt` |
| r2-s29 | T18 | A: running club, friends.csv | Dev | `setup:friends-ranked.txt` |
| r2-s30 | T18 | B: Florentine families | Grace | `setup:florentine-ranked.txt` |
| r2-s31 | T18 | A: running club, friends.csv | Tom | `setup:friends-ranked.txt` |
| r2-s32 | T18 | B: Florentine families | Elena | `setup:florentine-ranked.txt` |
| r2-s33 | T21 | A: running club, friends.csv to friends-v2.csv | Dev | `setup:friends-ranked.txt` |
| r2-s34 | T21 | B: team, team.csv to team-v2.csv | Grace | `setup:team-ranked.txt` |
| r2-s35 | T21 | A: running club, friends.csv to friends-v2.csv | Dana (analyst) | `setup:friends-ranked.txt` |
| r2-s36 | T21 | B: team, team.csv to team-v2.csv | Alex (analyst) | `setup:team-ranked.txt` |
| r2-s37 | T21 | A: running club, friends.csv to friends-v2.csv | Ruth | `setup:friends-ranked.txt` |
| r2-s38 | T21 | B: team, team.csv to team-v2.csv | Jordan (analyst) | `setup:team-ranked.txt` |
| r2-s39 | T21 | A: running club, friends.csv to friends-v2.csv | Nadia | `setup:friends-ranked.txt` |
| r2-s40 | T21 | B: team, team.csv to team-v2.csv | Tom | `setup:team-ranked.txt` |
| r2-s41 | T4 | A: office, people.csv + messages.csv | Tom | `empty` |
| r2-s42 | T4 | B: football, players.csv + passes.csv | Dana (analyst) | `empty` |
| r2-s43 | T4 | A: office, people.csv + messages.csv | Dev | `empty` |
| r2-s44 | T4 | B: football, players.csv + passes.csv | Elena | `empty` |
| r2-s45 | T19 | A: running club, friends.csv | Dev | `setup:friends-ranked.txt` |
| r2-s46 | T19 | B: Florentine families | Jordan (analyst) | `setup:florentine-ranked.txt` |
| r2-s47 | T19 | B: Florentine families | Grace | `setup:florentine-ranked.txt` |
| r2-s48 | T23 | A: running club, friends.csv | Nadia | `setup:friends-ranked.txt` |
| r2-s49 | T23 | B: Florentine families | Elena | `setup:florentine-ranked.txt` |
| r2-s50 | T23 | A: running club, friends.csv | Ruth | `setup:friends-ranked.txt` |
| r2-s51 | T24 | A: running club, friends.csv, names drawn | Alex (analyst) | `setup:friends-ranked-names.txt` |
| r2-s52 | T24 | B: bus stops, bus-stops.csv, names drawn | Ruth | `setup:bus-stops-ranked-names.txt` |
| r2-s53 | T24 | A: running club, friends.csv, names drawn | Jordan (analyst) | `setup:friends-ranked-names.txt` |
| r2-s54 | T24 | B: bus stops, bus-stops.csv, names drawn | Dana (analyst) | `setup:bus-stops-ranked-names.txt` |
| r2-s55 | T12R | A: Les Miserables | Jordan (analyst) | `setup:lesmis-ranked.txt` |
| r2-s56 | T12R | B: Florentine families | Ruth | `setup:florentine-ranked.txt` |
