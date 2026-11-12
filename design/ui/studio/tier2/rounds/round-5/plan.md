# Tier 2 round 5 plan: returning users on the real graphty app

Round 5 runs on build 8c015b806 (graphty@0.8.65, commit 8c015b806), served from
`/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r5-8c015b806/` with
`REAL_DIST=<that folder>` on every `tool/real.mjs` command (the first line of `../../criteria.md`).
Every `session.json` must read `buildStamp: 8c015b806086 graphty@0.8.65`; a session on any other
build is void. The bars, how they are scored and the stop rules are in `../../criteria.md`; this
plan changes none of them.

**This plan's first run was void, so every session runs again as `<id>b`.** The plan was first run
with ids r5-s01 to r5-s56, and every one of the 56 was refused at its start: the round's gate had
never run, so this plan held no "Gate evidence" and `real.mjs --start` refused each session
(`scores.md` and `insights.md` beside this plan). Not one session reached the app, so that run
measured nothing about the design. Its folders `sessions/r5-s01/` to `sessions/r5-s56/` stay
untouched as the record of the void run. The sessions below are the same 56, with the same task
half, persona, prompt, start and run order, under the ids r5-s01b to r5-s56b, each in a new, empty
folder. The build, the pilots, the briefings and the expert findings made on this build all stand.
No session starts before the gate has written "Gate evidence" at the end of this plan.

Round 4 passed 53 of 53 valid sessions, and every task met its success floor (bar 1). Three bars
failed, and each points at a task:

- **Bar 10 (expert walkthrough and audit)**, on two confirmed severity 3 findings that sit on task
  routes: the find box offering a rule for a bare number and then refusing it, on T22's most likely
  route (bus stops has no 10 in its minutes column); and drawn names and dots covering the tie a task
  asks about, on T24 (the "Stadium" name over the Station-Stadium tie cost two clicks) and T20 B.
- **Bar 5 (numbers that disagree)**, on T17: with a filter step on, the data table counted and
  listed everything, beside a chip and an Overview that counted what the step keeps.
- **Bar 9 (b) (words at rest)**, an edge's inspector at 29 words against 27. That screen is
  measured by `tool/bars.mjs`, not by sessions; the word lists are in `../round-4/bars/`.

Bar 11 held, but T18 sits exactly on its limit (median 8 steps against 2 x 4).

The round 5 build carries the fixes decided after round 4 (`../round-4/decisions.md`; the build's
change list is the 2026-10-11 entry in `../../criteria.md`'s change log): the find box offers "N or
more" for a number inside a column's range, names a column the way a typed rule does, and suggests
backticks only for a rule it will accept (T22); the data table lists only what the filter steps keep,
and leaving an off step's editor without an edit leaves it off (T17, and T23, whose answer ends in a
neighbor filter); Cancel in the note editor puts focus on Add note (T19); New project, then
Discard, opens the empty project instead of the error page (T21, or any session that starts a new
project); and a dragged pop-out stays where it was put (no task's success path drags one).

So round 5 runs the core four at full size as always, T22 at full size (its bar 10 finding and three
fixes), T19 and T23 at 4 (a fix touched each), T24 at 4 (drawn names over its tie, and the tie-click
claim below), and T4 and T12R at 2 so every task is covered.

## Was there a dry run before this round, and will participants hit build faults?

Yes. Every tier 2 task half, A and B of all ten tasks, was piloted from its start on 8c015b806
(`../r5/pilot/`), and the 96 items the pilots reported were triaged in `../../dry-run-r5-1.md`: not
one is an implementation defect a participant could hit, so the build stays frozen. The answer key
was then matched to those pilots (the 2026-10-11 key entry in `../../criteria.md`): every value held;
only two notes on T18's legend and its color wording changed.

What a participant may still meet:

- **The three claims scripted on round 4's build** (the last section of this plan): a rule on a
  column that does not exist answers only "Nothing matches this rule"; Escape on a selection
  layer's Color swatch clears the selection and drops focus; a drawn name takes a click aimed at the
  tie under it. All three reproduced and none is fixed on this build.
- **The owner's open items**: drawn names and dots covering each other, nodes drawn inside each
  other, where names are placed. Known; not scored as new findings when they recur.
- **Routes nobody walked**: the pilots follow the key. Round 4's detours were seeded into the dry
  run (`../round-4/scores.md`, "Next steps"); a second Find path and Undo after it, and styling a
  selection by Width, were last walked by the specialists in round 3.

## The gate before the first session

`real.mjs --gate` refuses the round unless this folder holds a pilot on the frozen build of every
task half planned below and `bars/bars.json` from `tool/bars.mjs` on that build, and `real.mjs
--start` refuses every session of this round until the gate has written "Gate evidence" at the end
of this plan.

1. **Pilots**: the 20 dry run walks are copied unchanged from `../r5/pilot/` to `pilot/r5/`
   (`diff -r` reports no difference; every `session.json` reads `8c015b806086 graphty@0.8.65`).
2. **Bars**: run by the round runner's gate step before `--gate`.
3. **Every session can be briefed**: `design/ui/studio/tmp/researcher/t2r5/brief-all.py` briefed
   all 56 sessions from `sessions.json` into a scratch folder on 2026-10-11: 56 of 56 briefed,
   each with its prompt and its start command. The only prompt words on a task's avoided list are
   the ones `../../tasks.md` keeps on purpose with a reason, as in round 4: "from" and "to" (T18),
   "longer" and "the shortest walk" (T20), "updated list" (T21), "change the drawing so it has only"
   (T23). No briefing holds an answer the key grades on ("Mo, Nia", "6 - w", `s11`); the one match a
   grep found is the session id r5-s11 in its own folder path.
4. **The study tool's two refusals** (round 4's study faults) are in the tool the sessions use:
   `--start` refuses a round with no gate evidence and waits a bounded time for a browser slot
   (commit 571a15488); briefings name each data file and its kind only, and the leak check reads
   every briefing (commit 2d085d627).

**Owed from round 4, not run: r4-s05b, r4-s20b and r4-s28b.** Round 4's decisions asked for them
on 5277e2cbe before this round. They were not run. Round 4's bar 1 holds even if all three fail
(`../round-4/scores.md`), and this round re-runs each of their halves (T24 A, T18 B, T17 B) on the
newer build, so round 5's scoring, which uses the latest result of every task, no longer depends on
them. Round 4 stays reported with the three voids named. If they are run, they run on 5277e2cbe before the first
session of this round and are scored into round 4, not here.

## The questions round 5 answers

1. **T22, a number in the find box** (8 sessions): on A (bus stops, no 10 in minutes), what is typed
   first, and does it reach a selection of the 3 stops of 10 minutes or more with no refusal on the
   way? Credit the change by that, not by a pick of the "10 or more" row: the prompt says "or more"
   too, so a pick may only echo the prompt. Is any find row read cut off or under the fold? If a
   style is added to the selection, what is the layer named?
2. **T17, a filter step and the data table** (8 sessions): does anyone open the data table to check,
   and what count do they read there? Does anyone open an off step's editor and leave it, and is the
   step still off afterwards?
3. **T18, bar 11's task** (8 sessions): the route to Shortest path (Analyze list, the P key, other)
   and the steps it costs, against the 8-step limit.
4. **T24, one tie on the drawing** (4 sessions): on B, how many clicks it takes to pick the
   Station-Stadium tie, and whether a click lands on the "Stadium" name instead; the route to the
   two ends (Shift-click, "Select endpoints", other).
5. **T19 and T23, the touched tasks** (4 each): on T19, whether Cancel in the note editor is used and
   where the participant then works from; on T23, whether the data table is opened after "Filter to
   neighbors" and what it reads.
6. **T20 and T21, the rest of the core four**: held at 8 of 8 in round 4. T20: the meaning chosen at
   load, and misreadings caused by Creek and Summit drawn inside each other (or the route edge behind
   Pine Fork). T21: whether anyone starts a new project, and what happens when they discard.
7. **Bar 11 and the steps targets**, as before; **doors and habits**: the first move, whether it came
   from the history, the second place looked, the door used where a feature has more than one.

## Size: 56 sessions, the studio's cap

The round plan asks for every task below its bar at full size (8), the core four at full size
always, and every task a fix touched at 4 or more; a task that met its bar and no fix touched may
carry its sessions forward. No task fell below bar 1 in round 4, so the weight goes where the
failing bars and the fixes are, and the task list asks that every task be covered.

| Group                          | Tasks                          | Sessions | Why                                                                                                                                                         | Bar 1 needs             |
| ------------------------------ | ------------------------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| Core four                      | T20, T21, T17, T18 at 4+4 each | 32       | Always full size. T17 carries bar 5's finding and two fixes (the table, the off step); T18 sits on bar 11's limit; T21 the New project fix                   | 7 of 8, 3 of 4 per half |
| Bar 10 on its route            | T22 at 4+4                     | 8        | The bare-number refusal (bar 10, severity 3) sits on A's natural route; three element fixes on the find box. Full size, as in round 3                     | 7 of 8, 3 of 4 per half |
| Touched by a fix               | T19 at 2+2; T23 at 2+2         | 8        | T19: Cancel in the note editor. T23: its answer ends in a neighbor filter, which the table and off-step fixes now act on                                    | 4 of 4, 2 of 2 per half |
| Bar 10 on its screen           | T24 at 2+2                     | 4        | No fix touched it, but drawn names over its tie are bar 10's other severity 3, and the tie-click claim (c) is on B                                          | 4 of 4, 2 of 2 per half |
| Covered                        | T4 at 1+1; T12R at 1+1         | 4        | No fix on either route; 4 of 4 and 2 of 2 in round 4                                                                                                         | 2 of 2                  |

T4 and T12R have one session a half, so one persona each; the criteria's "at least two personas a
half" cannot hold at that size, as in rounds 2 to 4. Every other half has two or more, and every
task at 4 or more has at least three personas.

## Who takes which task

Every session is by a returning persona: 37 of 56 (66%) by personas who did tier 1 as first-time
users (Grace, Ruth, Dev, Elena, Nadia, Tom), 19 by the regular analysts (Alex, Jordan, Dana). Each
persona takes 6 sessions, Ruth and Jordan 7, and at most one session per task, so never both halves.

**Every persona meets the other dataset from round 4** wherever it took the same task, with no
exception. Ruth and Jordan keep T12R and swap halves; Dana keeps T4 (her exports come as two
sheets) on the other half. Ruth takes no T19 (her persona file's own word "notes" names the place
T19 measures). Dana takes no T17: her history still names the toolbar, where the Filters button
sits. Dev takes T24 for the first time; every other T24 persona swaps half.

| Task | Half A                       | Half B                       |
| ---- | ---------------------------- | ---------------------------- |
| T22  | Grace, Nadia, Tom; Alex      | Ruth, Elena; Dana, Jordan    |
| T17  | Ruth, Elena, Nadia; Jordan   | Grace, Dev, Tom; Alex        |
| T18  | Ruth, Grace, Elena; Dana     | Nadia, Dev, Tom; Alex        |
| T24  | Ruth; Dana                   | Dev; Jordan                  |
| T20  | Nadia, Dev, Elena; Alex      | Grace, Tom; Dana, Jordan     |
| T21  | Grace, Tom; Alex, Jordan     | Dev, Ruth, Nadia; Dana       |
| T19  | Grace; Jordan                | Elena; Alex                  |
| T23  | Elena, Tom                   | Ruth, Nadia                  |
| T4   | Dana                         | Dev                          |
| T12R | Ruth                         | Jordan                       |

Tier 1 graduates first in each cell, analysts after the semicolon. `sessions.py` beside this plan
holds the run order and asserts all of the above (56 sessions, the sizes, equal halves, the
per-persona totals, the graduate share, one session per persona per task, no Ruth on T19, no Dana
on T17, no persona on the half it took in round 4, read from `../round-4/sessions.json`, T22 first,
halves alternating within each task, every setup and persona file present) and writes
`sessions.json` and `table.md`.

**Tom's exits.** Tom's persona file scripts a give-up on the second failed attempt. A give-up his
rule covers is labeled "scripted exit" beside the G, as `../../criteria.md` requires.

## Where each session starts

Every start is named in the session table, from `../../roster.md` ("Where each session starts"):
`empty` for T4 and T20, whose tasks are about bringing new files in; otherwise a setup from
`../../../rounds/tier-2/setups/` that leaves the persona's earlier work open (the file ranked by
PageRank, its dots colored and sized by the ranking, every name drawn for T24). No session starts
from a saved project file: `../../tasks.md` ("Starts") rules that out, since reopening was measured
in tier 1 and a setup reaches the same open work without depending on the project format. Check
each session's `01.png` against its expected start before the first step.

## How a session runs

As round 4 (`../round-4/plan.md`, "How a session runs"), with its two study faults fixed in the tool:

- **Start**: the runner starts each session itself, before the participant's turn, with the start
  command from `node tool/real.mjs --brief tier2/rounds/round-5/sessions/<id>` (run from
  `design/ui/studio/`); a start waits for a browser slot a bounded time and is retried, so a
  participant never waits for one inside its turn. A session whose start produced no `01.png` is
  not a session: it is re-run once more with one more `b` (r5-s01b becomes r5-s01bb) and named in
  the scores. **If a start prints the "Gate evidence" refusal, the round stops there**: no further
  session starts until the gate has passed, since every later start would be refused the same way.
- **The participant** gets only that briefing, steps with `real.mjs`, and ends with `--end`, which
  copies the session back to `sessions/<id>/` here.
- **Follow-ups**: on every T17 and T18 session the first `--end` answers with exit 3 and the
  follow-up, word for word; the participant carries on in the same session and ends again.
- **The leak check** runs over the whole round (`real.mjs --leaks <this folder>`) before scoring;
  it reads every briefing and every participant log, and fails, naming them, on any session whose
  log it could not read. It also lists the 56 void folders of the first run; a line about one of them
  is part of that run's record and decides nothing about a `b` session, so each `b` session's own
  line is the one read (or `real.mjs --leaks sessions/<id>b` on its own).
- **Voids**: a facilitator file read, a session on the wrong build, a save the tool lost, or a model
  API error voids the session; it is re-run with one more `b` (r5-s07b becomes r5-s07bb) from a new
  folder, same persona and prompt, and every retry and its reason go in the round report.
- **At most 4 sessions alive at once**; a session's clock starts only when its slot is free.

## Grading and scoring

As round 4 (`../round-4/plan.md`, "Grading and scoring"), with every grade also recording:

- **T22:** what was typed first; whether the typed text reached a selection of the right items
  without a refusal, and by which row; whether the "or more" row was seen and picked; any find row
  cut at the panel edge or under the fold; if a style was added to the selection, the layer's name;
  on B, any rule on a column Les Miserables does not have, and what the participant concluded from
  the answer (claim a);
- **T17:** the first place looked; whether the data table was opened, and which counts were read
  there and elsewhere for the people left; whether an off step's editor was opened and left, and
  whether the step stayed off;
- **T18:** the route to Shortest path (the words typed into the Analyze filter, the P key, other);
  where focus was after picking it; on a second path, whether the first was needed afterwards;
- **T24:** the route to the two ends; how many clicks the tie took and what each click landed on (on
  B, a click on the "Stadium" name is claim c); whether Ctrl was tried;
- **T19:** whether Cancel in the note editor was used and where the next action started;
- **T23:** whether the data table was opened after "Filter to neighbors" and what it read;
- **T21:** whether anyone started a new project or reached the Add page, and what happened;
- **T20, T4, T12R, T23:** whether each segmented control's chosen side was read correctly; on T20 B,
  any misreading caused by Creek and Summit drawn inside each other or the route edge behind Pine
  Fork;
- **any task:** Escape pressed with focus inside the inspector's style panel (claim b), and what
  happened to the selection and the focus;
- the rest as round 4: first move, history, second place looked, doors, bar 2's open-work lists, the
  follow-up's time against the screenshots, and "scripted exit" where Tom's rule decided it.

**Priming**, as round 4 taught: a claim that a move was unprompted needs the prompt, the history,
the persona file's playing rules and the briefing grepped first. The nonprofit analyst's and the
student's count checks are persona habits, not unprompted checks.

Steps are counted as in rounds 1 to 4 (screenshots after the start; on T17 and T18 the main prompt
only), against the same success paths (T20 11, T17 7, T18 4, T21 6, T22 3, T4 9, T19 13, T23 5, T24
3, T12R 4), so the rounds compare. Scoring, the two skeptics and the expert walkthrough and
screenshot audit (bars 8, 9 and 10, on this build, apart from the sessions) follow
`../../criteria.md`. Bar 9 uses the counter that leaves out the data's own names, against round 1's
counts in `tool/bars-limits.json`.

## Run order

T22 first (bar 10's finding on its natural route, and three fixes), then T17 (bar 5) and T18 (bar
11's limit), then T24 (drawn names over its tie), then T20 and T21, then T19, T23, T4 and T12R.
Halves alternate within each task, so a defect on one dataset shows in a task's first sessions.

## Sessions

"(analyst)" marks the three regular analysts; every other persona did tier 1 as a first-time user.
Persona files: `../round-1/plan.md`, "Persona files"; histories: `../../roster.md`.

| Id     | Task | Half and data                                  | Persona          | Start                              |
| ------ | ---- | ---------------------------------------------- | ---------------- | ---------------------------------- |
| r5-s01b | T22 | A: bus stops, bus-stops.csv | Grace | `setup:bus-stops-ranked.txt` |
| r5-s02b | T22 | B: Les Miserables | Ruth | `setup:lesmis-ranked.txt` |
| r5-s03b | T22 | A: bus stops, bus-stops.csv | Alex (analyst) | `setup:bus-stops-ranked.txt` |
| r5-s04b | T22 | B: Les Miserables | Dana (analyst) | `setup:lesmis-ranked.txt` |
| r5-s05b | T22 | A: bus stops, bus-stops.csv | Nadia | `setup:bus-stops-ranked.txt` |
| r5-s06b | T22 | B: Les Miserables | Elena | `setup:lesmis-ranked.txt` |
| r5-s07b | T22 | A: bus stops, bus-stops.csv | Tom | `setup:bus-stops-ranked.txt` |
| r5-s08b | T22 | B: Les Miserables | Jordan (analyst) | `setup:lesmis-ranked.txt` |
| r5-s09b | T17 | A: running club, friends.csv | Ruth | `setup:friends-ranked.txt` |
| r5-s10b | T17 | B: Les Miserables | Grace | `setup:lesmis-ranked.txt` |
| r5-s11b | T17 | A: running club, friends.csv | Jordan (analyst) | `setup:friends-ranked.txt` |
| r5-s12b | T17 | B: Les Miserables | Alex (analyst) | `setup:lesmis-ranked.txt` |
| r5-s13b | T17 | A: running club, friends.csv | Elena | `setup:friends-ranked.txt` |
| r5-s14b | T17 | B: Les Miserables | Dev | `setup:lesmis-ranked.txt` |
| r5-s15b | T17 | A: running club, friends.csv | Nadia | `setup:friends-ranked.txt` |
| r5-s16b | T17 | B: Les Miserables | Tom | `setup:lesmis-ranked.txt` |
| r5-s17b | T18 | A: running club, friends.csv | Ruth | `setup:friends-ranked.txt` |
| r5-s18b | T18 | B: Florentine families | Nadia | `setup:florentine-ranked.txt` |
| r5-s19b | T18 | A: running club, friends.csv | Dana (analyst) | `setup:friends-ranked.txt` |
| r5-s20b | T18 | B: Florentine families | Alex (analyst) | `setup:florentine-ranked.txt` |
| r5-s21b | T18 | A: running club, friends.csv | Grace | `setup:friends-ranked.txt` |
| r5-s22b | T18 | B: Florentine families | Dev | `setup:florentine-ranked.txt` |
| r5-s23b | T18 | A: running club, friends.csv | Elena | `setup:friends-ranked.txt` |
| r5-s24b | T18 | B: Florentine families | Tom | `setup:florentine-ranked.txt` |
| r5-s25b | T24 | A: running club, friends.csv, names drawn | Ruth | `setup:friends-ranked-names.txt` |
| r5-s26b | T24 | B: bus stops, bus-stops.csv, names drawn | Dev | `setup:bus-stops-ranked-names.txt` |
| r5-s27b | T24 | A: running club, friends.csv, names drawn | Dana (analyst) | `setup:friends-ranked-names.txt` |
| r5-s28b | T24 | B: bus stops, bus-stops.csv, names drawn | Jordan (analyst) | `setup:bus-stops-ranked-names.txt` |
| r5-s29b | T20 | A: bus stops, bus-stops.csv | Nadia | `empty` |
| r5-s30b | T20 | B: hiking trails, trails.csv | Grace | `empty` |
| r5-s31b | T20 | A: bus stops, bus-stops.csv | Alex (analyst) | `empty` |
| r5-s32b | T20 | B: hiking trails, trails.csv | Dana (analyst) | `empty` |
| r5-s33b | T20 | A: bus stops, bus-stops.csv | Dev | `empty` |
| r5-s34b | T20 | B: hiking trails, trails.csv | Tom | `empty` |
| r5-s35b | T20 | A: bus stops, bus-stops.csv | Elena | `empty` |
| r5-s36b | T20 | B: hiking trails, trails.csv | Jordan (analyst) | `empty` |
| r5-s37b | T21 | A: running club, friends.csv to friends-v2.csv | Grace | `setup:friends-ranked.txt` |
| r5-s38b | T21 | B: team, team.csv to team-v2.csv | Dev | `setup:team-ranked.txt` |
| r5-s39b | T21 | A: running club, friends.csv to friends-v2.csv | Alex (analyst) | `setup:friends-ranked.txt` |
| r5-s40b | T21 | B: team, team.csv to team-v2.csv | Dana (analyst) | `setup:team-ranked.txt` |
| r5-s41b | T21 | A: running club, friends.csv to friends-v2.csv | Tom | `setup:friends-ranked.txt` |
| r5-s42b | T21 | B: team, team.csv to team-v2.csv | Ruth | `setup:team-ranked.txt` |
| r5-s43b | T21 | A: running club, friends.csv to friends-v2.csv | Jordan (analyst) | `setup:friends-ranked.txt` |
| r5-s44b | T21 | B: team, team.csv to team-v2.csv | Nadia | `setup:team-ranked.txt` |
| r5-s45b | T19 | A: running club, friends.csv | Jordan (analyst) | `setup:friends-ranked.txt` |
| r5-s46b | T19 | B: Florentine families | Elena | `setup:florentine-ranked.txt` |
| r5-s47b | T19 | A: running club, friends.csv | Grace | `setup:friends-ranked.txt` |
| r5-s48b | T19 | B: Florentine families | Alex (analyst) | `setup:florentine-ranked.txt` |
| r5-s49b | T23 | A: running club, friends.csv | Elena | `setup:friends-ranked.txt` |
| r5-s50b | T23 | B: Florentine families | Ruth | `setup:florentine-ranked.txt` |
| r5-s51b | T23 | A: running club, friends.csv | Tom | `setup:friends-ranked.txt` |
| r5-s52b | T23 | B: Florentine families | Nadia | `setup:florentine-ranked.txt` |
| r5-s53b | T4 | A: office, people.csv + messages.csv | Dana (analyst) | `empty` |
| r5-s54b | T4 | B: football, players.csv + passes.csv | Dev | `empty` |
| r5-s55b | T12R | A: Les Miserables | Ruth | `setup:lesmis-ranked.txt` |
| r5-s56b | T12R | B: Florentine families | Jordan (analyst) | `setup:florentine-ranked.txt` |

## Three claims from round 4, each checked by one script before anyone fixes it

These were scripted on round 4's build before this round's build was frozen. None of the three is
fixed on 8c015b806 (its change list in `../../criteria.md` names none of them), so a participant
can still meet each one; "Grading and scoring" above says what graders record when they do.

Round 4 left three problems that only one session or one walkthrough had seen. Each was run once,
on round 4's build 5277e2cbe1bd (graphty@0.8.64, frozen at
`/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r4d1-5277e2cbe/`), with
`tool/real.mjs` and nothing else, on 2026-10-11. Every `session.json` below reads `buildStamp:
5277e2cbe1bd graphty@0.8.64`. The screenshots are in `claims/<folder>/`, numbered as `real.mjs`
saved them.

All three reproduced, so all three are fixed in their owning package in this round.

| Claim                                                                       | Reproduced | Fix belongs in                    |
| --------------------------------------------------------------------------- | ---------- | --------------------------------- |
| A rule on a column that does not exist answers only "Nothing matches this rule" | Yes        | graphty-element, then graphty app |
| Escape on a selection layer's Color swatch clears the selection, focus to the page | Yes        | graphty app                       |
| A drawn name takes a click aimed at the tie under it                        | Yes        | graphty-element (a question for it) and graphty app |

Every command below runs from `design/ui/studio/tool` with
`REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r4d1-5277e2cbe/` set.

### A rule naming a column that does not exist (`claims/a-unknown-column/`)

Les Miserables' edge column is `shared_chapters`; there is no `weight`.

```bash
S=../tmp/t2r4-7/a-unknown-column
node real.mjs --start $S setup:lesmis-ranked.txt                                   # 01.png
node real.mjs --step $S --click "Find nodes, edges, values" --type "weight >= 10"  # 02.png
node real.mjs --step $S --click "Select its matches"                               # 03.png
node real.mjs --end $S
```

- `02.png`: the find box rewrites the text as the rule "=weight >= `10`" and offers it as "Select
  its matches". Nothing says the data has no column called `weight`.
- `03.png`: run, the box reads only "Nothing matches this rule", the same words a real rule with
  no matches gets. Nothing is selected.

**Reproduced.** Mechanism: graphty-element's selector compiler parses a rule on any column and,
by its own comment (`session/styles/selector.ts`), "matches NOTHING" for one that does not exist;
it reports the columns it reads in `CompiledSelector.paths` and leaves resolving them to the
caller, which the selection path does not do. The app's `FindBox.tsx` then shows "Nothing matches
this rule" for any empty result. Fix: the element refuses the rule with the existing
`E_UNKNOWN_ATTRIBUTE` (with candidate columns) before it runs and before it is offered, and the app
writes "No column named weight" with the columns there are.

### Escape on a selection layer's Color swatch (`claims/b-swatch-escape/`)

Done by pointer; the walkthrough that found it used keys only. The focus is the same either way.

```bash
S=../tmp/t2r4-7/b-swatch-escape
node real.mjs --start $S setup:friends-ranked.txt                                         # 01.png
node real.mjs --step $S --click "Find nodes, edges, values" --type '=weight >= `4`' --key Enter  # 02.png
node real.mjs --step $S --click "role=tab:Style"                                          # 03.png
node real.mjs --step $S --click "Add to Line"                                             # 04.png
node real.mjs --step $S --click "role=menuitem:Color" --read                              # 05.png
node real.mjs --step $S --key Escape --read                                               # 06.png
node real.mjs --end $S
```

- `03.png`: "12 edges selected", the selection's Style tab.
- `05.png`: a new layer "weight >= `4`"; focus ring on the Color swatch row; `--read` reads the
  inspector's layer panel.
- `06.png`: one Escape. A toast "Selection cleared: 12 edges", the ties lose their selection band,
  the inspector switches to "Graph" (Values tab), and `--read` reads the whole page: focus fell to
  the page.

**Reproduced.** Which handler takes the key: no control in the style panel handles Escape (the
swatch is a plain button, `CompactColorInput` in compact-mantine, and no popover is open), so the
keydown reaches the window listener in `graphty/src/workspace/keys/useCommandKeys.ts`. Escape
there is blocked only while typing in a field or while a menu, list or dialog shows; a focused
button is neither, so it runs the `selection.clear` command (`workspace/frame/commands.ts`). The
cleared selection changes what the inspector shows, the panel holding the focused swatch
unmounts, and focus goes to the page. Fix in the app: an Escape pressed inside the inspector's
panel is the panel's (innermost first) and never reaches the global clear; where the inspector
does change, focus goes to its heading.

### A drawn name over the Station-Stadium tie (`claims/c-tie-click/`)

The setup draws every stop's name on a white chip. Station is at about (777,117), Stadium at
(726,221); the straight tie between them runs under the "Stadium" chip, whose box is about
x 684-768, y 168-196. The Stadium sphere's top is at about y 199.

```bash
S=../tmp/t2r4-7/c-tie-click
node real.mjs --start $S setup:bus-stops-ranked-names.txt   # 01.png
node real.mjs --step $S --hover-at 751,169                   # 02.png  midpoint of the two centers
node real.mjs --step $S --click-at 751,169                   # 03.png
node real.mjs --step $S --key Escape --hover-at 744,185      # 04.png  on the tie, inside the chip
node real.mjs --step $S --click-at 744,185                   # 05.png
node real.mjs --step $S --key Escape --hover-at 765,141      # 06.png  on the tie, above the chip
node real.mjs --step $S --click-at 765,141                   # 07.png
node real.mjs --end $S
```

- The midpoint (751,169) and a point on the tie inside the chip (744,185) both print `node
  "Stadium"` on hover and click, with `cursor: pointer`; `03.png` and `05.png` show Stadium
  selected (ring, inspector "Stadium, Node"). Neither point is on the sphere: the drawn name took
  the click.
- The same tie above the chip (765,141) prints `edge with id "15"`; `07.png` shows the tie selected
  and the inspector "Station -> Stadium", minutes 4.

**Reproduced: the label, not the dot, takes the click.** Mechanism: the app turns on
`label.pickable` for every label line it adds (`graphty/src/workspace/style/row.ts`,
`appLabelLook`), so a click on a name selects its node, and the chip is drawn on top
(`onTop: true`). In graphty-element (`Node.ts`, where the label is made), a label plane is
pickable even when `pickable` is unset: it then answers no node but still stops the ray, so a tie
under a name cannot be clicked there either way. Questions for graphty-element, to decide this
round: whether a label that is not `pickable` should let a click through to what lies under it
(an additive change would be a new option; changing today's default is a breaking change for the
owner), and whether a pickable label should yield to an edge that the click is closer to. Where
names are placed stays on the owner's list.

## Gate evidence

Checked by `real.mjs --gate` on 2026-10-11, build 8c015b806:

- pilot T12RA: /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-5/pilot/r5/T12RA/
- pilot T12RB: /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-5/pilot/r5/T12RB/
- pilot T17A: /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-5/pilot/r5/T17A/
- pilot T17B: /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-5/pilot/r5/T17B/
- pilot T18A: /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-5/pilot/r5/T18A/
- pilot T18B: /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-5/pilot/r5/T18B/
- pilot T19A: /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-5/pilot/r5/T19A/
- pilot T19B: /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-5/pilot/r5/T19B/
- pilot T20A: /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-5/pilot/r5/T20A/
- pilot T20B: /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-5/pilot/r5/T20B/
- pilot T21A: /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-5/pilot/r5/T21A/
- pilot T21B: /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-5/pilot/r5/T21B/
- pilot T22A: /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-5/pilot/r5/T22A/
- pilot T22B: /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-5/pilot/r5/T22B/
- pilot T23A: /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-5/pilot/r5/T23A/
- pilot T23B: /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-5/pilot/r5/T23B/
- pilot T24A: /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-5/pilot/r5/T24A/
- pilot T24B: /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-5/pilot/r5/T24B/
- pilot T4A: /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-5/pilot/r5/T4A/
- pilot T4B: /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-5/pilot/r5/T4B/
- bars on 8c015b806086 graphty@0.8.65: /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-5/bars/bars.json
