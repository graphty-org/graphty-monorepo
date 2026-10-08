# Tier 2 round 1 plan: returning users on the real graphty app

Round 1 is the first round of the tier 2 study: the common repeat work of a user who has done the
core path (open a file, rank, color and size by the ranking, save) a few times and comes back to
narrow the picture, trace a chain, keep notes, join two spreadsheets, read a tie's number the right
way round, redo work on a newer file, mark what meets a condition, see who is a step or two away,
and ask about one tie on the drawing. It runs on the frozen build named at the top of
`../../criteria.md`: build 16dcf3494700 (graphty@0.8.56, commit 16dcf3494), served from
`/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r1-16dcf3494/` with
`REAL_DIST=<that folder>` on every `tool/real.mjs` command. The bars, how they are scored and the
stop rules are in `../../criteria.md`; this plan changes none of them.

## Before the first session

The round may start only when every preflight item in `../../criteria.md` ("Before a round may
start") holds, recorded in `preflight.md` beside this file with its evidence. Two of them gate
sessions directly:

- **Item 2 (`real.mjs --prove` 5 clean runs in a row, or the failure's cause traced).** The tool
  once failed a first save, cause unknown. Until item 2 holds, no T21 or T19 session starts, so
  an unexplained save fault in the tool is never scored as the app losing work. That is why T21
  runs last of the core four below, not second as `../../roster.md` lists the run order.
- **Item 8 (the open-work lister).** Bar 2 is judged from a scripted list of runs, style layers,
  notes, filter steps and sources at each session's start and end. The lister runs on every
  session folder after `--end`; a session without both lists cannot be scored on bar 2.

Every task half was piloted from its ranked start on this build (`../r1/pilot/`) and reached its
end state; the answer key (`../../answers.md`) was matched to those screens.

## The questions round 1 answers

1. **The core four.** Do T20 (a weight that means "farther", set at load and read by every run),
   T21 (rerunning on a newer file), T17 (narrowing to strong ties) and T18 (the fewest people in
   between) each reach 7 of 8, at least 3 of 4 per half, at a median cost of at most twice the
   success path (bar 11)?
2. **The weight (bar 7 (b)).** In T20, does any run read the minutes or kilometers the wrong way
   round with no sign on screen? Record for every T20 session whether the meaning was chosen at
   load, left on "Not set", or set later, and which route found the answer.
3. **Earlier work kept (bar 2).** Does any session end with a ranking, its colors and sizes, a
   note, a filter step or a loaded table gone that the participant did not remove? T21 (Replace)
   and T18 (a path drawn over the ranking's colors) are where this is likeliest.
4. **Habits.** Where does each participant's first move go, and does a place their history names
   (the Data place, the find box, a person's list of connections, the analysis button) lead on
   to the task? Two sessions of one task stuck in the same such place is a confirmed severity 3.
5. **The second time.** On T17 and T18, is the follow-up prompt cheaper than the first (steps at
   most its success path + 1, no wrong turns)?
6. **Select where (T22).** How many sessions type a rule ("=") into the find box, and where else
   do they look for a "select by condition" control? The decision rule in `../../criteria.md`
   applies as written.
7. **Doors.** Which door each feature with more than one was reached by (Path, notes, filter, a
   tie), with how many sessions had the chance.
8. **T12R.** Does the habit the histories lean on most, a person's list of connections, still
   arrive now that Hops, Follow and "Filter to neighbors" sit beside it?

Bars 8, 9 and 10 (the accessibility script, words at rest, the expert walkthrough and screenshot
audit) are measured on this build apart from the sessions and are not part of this session list.

## Size: 56 sessions

| Group         | Tasks                          | Sessions | Bar 1 needs                            |
| ------------- | ------------------------------ | -------- | -------------------------------------- |
| Core four     | T20, T17, T18, T21: 4 + 4 each | 32       | 7 of 8 per task, 3 of 4 per half       |
| Two tables    | T4: 3 + 3                      | 6        | 6 of 6                                 |
| Reduced       | T19, T22, T23, T24: 2 + 2 each | 16       | 4 of 4 per task (2 of 2 per half)      |
| Returning T12 | T12R: 1 + 1                    | 2        | 2 of 2, graded with tier 1's key (T12) |

Every session is by a returning persona: 37 of 56 (66%) by personas who did tier 1 as first-time
users (Grace, Ruth, Dev, Elena, Nadia, Tom), 19 by regular analysts (Alex, Jordan, Dana). Each
persona takes 6 sessions, Ruth and Jordan 7; no persona takes both halves of one task; every
task half has at least two personas. The allocation is `../../roster.md`'s, checked by
`sessions.py` beside this file (asserts the count, each half's personas, the
per-persona totals and the graduate share).

## How a session runs

- **Folder:** `sessions/<id>/` beside this file; a session re-run after a void takes a `b` suffix
  (`r1-s07b`) and a new, empty folder.
- **The participant gets** exactly what `../../tasks.md` ("Rules for whoever runs a session")
  lists: the persona file(s), the history under the persona's name in `../../roster.md` word for
  word, the task's prompt for that half word for word, and the tool's participant instructions
  (`../../../tool/README.md`, "A session" and "Steps"). Nothing else: no notes, answer key,
  design documents, source, pilots or other personas' histories.
- **Start:** `REAL_DIST=<frozen build> node tool/real.mjs --start sessions/<id> <start>` with the
  start in the table (`empty`, or `setup:<file>` from `../../../rounds/tier-2/setups/`). A start
  that prints `SETUP FAILED` is a tool or build finding, not a session: record it and re-run.
- **Steps:** before every step the participant writes one or two sentences (what they see, what
  they will try next). No step cap: the session ends when the participant says they are done,
  gives up, or keeps repeating without progress. Always `--end`.
- **Follow-ups:** on T17 and T18, a participant who says the prompt is done gets the half's
  follow-up from `../../tasks.md` word for word, in the same session. Every participant gets it
  whether or not the runner thinks the first answer was right; graders decide success.
- **Slots:** at most 4 participants alive at once, all browsers through `tool/with-browser.sh`; a
  participant starts only when a slot is free, so no clock runs while it waits.
- **Records:** `session.json` holds the build stamp, the start and the model that ran the
  participant. A session that ends on a model API error is voided and re-run from a new folder
  with the same persona and prompt; the round report lists every retry and its reason.
- **Ease:** asked at the end, 1 to 7, read from the transcript; never used for a grade.

Run order is the table's order: the core four first (T20, T17, T18, then T21 once preflight
item 2 holds), then T4, then T19, T22, T23, T24 and T12R. Halves alternate so a build defect on
one dataset shows within the first few sessions of a task.

## Sessions

Start `empty` opens the app as a first-time visitor sees it; `setup:<file>` opens the file or
sample ranked by PageRank, its dots colored and sized by the ranking (the routine every history
shares), with every name drawn in the `-names` setups. No session starts from a saved project
file (`../../tasks.md`, "Starts"): reopening was measured in tier 1, and a setup reaches the same
open work without depending on the project format.

| Id     | Task | Half and data                                  | Persona          | Start                              |
| ------ | ---- | ---------------------------------------------- | ---------------- | ---------------------------------- |
| r1-s01 | T20  | A: bus stops, bus-stops.csv                    | Dev              | `empty`                            |
| r1-s02 | T20  | B: hiking trails, trails.csv                   | Grace            | `empty`                            |
| r1-s03 | T20  | A: bus stops, bus-stops.csv                    | Alex (analyst)   | `empty`                            |
| r1-s04 | T20  | B: hiking trails, trails.csv                   | Jordan (analyst) | `empty`                            |
| r1-s05 | T20  | A: bus stops, bus-stops.csv                    | Elena            | `empty`                            |
| r1-s06 | T20  | B: hiking trails, trails.csv                   | Nadia            | `empty`                            |
| r1-s07 | T20  | A: bus stops, bus-stops.csv                    | Dana (analyst)   | `empty`                            |
| r1-s08 | T20  | B: hiking trails, trails.csv                   | Tom              | `empty`                            |
| r1-s09 | T17  | A: running club, friends.csv                   | Ruth             | `setup:friends-ranked.txt`         |
| r1-s10 | T17  | B: Les Miserables                              | Dev              | `setup:lesmis-ranked.txt`          |
| r1-s11 | T17  | A: running club, friends.csv                   | Jordan (analyst) | `setup:friends-ranked.txt`         |
| r1-s12 | T17  | B: Les Miserables                              | Alex (analyst)   | `setup:lesmis-ranked.txt`          |
| r1-s13 | T17  | A: running club, friends.csv                   | Elena            | `setup:friends-ranked.txt`         |
| r1-s14 | T17  | B: Les Miserables                              | Grace            | `setup:lesmis-ranked.txt`          |
| r1-s15 | T17  | A: running club, friends.csv                   | Nadia            | `setup:friends-ranked.txt`         |
| r1-s16 | T17  | B: Les Miserables                              | Tom              | `setup:lesmis-ranked.txt`          |
| r1-s17 | T18  | A: running club, friends.csv                   | Ruth             | `setup:friends-ranked.txt`         |
| r1-s18 | T18  | B: Florentine families                         | Nadia            | `setup:florentine-ranked.txt`      |
| r1-s19 | T18  | A: running club, friends.csv                   | Dana (analyst)   | `setup:friends-ranked.txt`         |
| r1-s20 | T18  | B: Florentine families                         | Alex (analyst)   | `setup:florentine-ranked.txt`      |
| r1-s21 | T18  | A: running club, friends.csv                   | Grace            | `setup:friends-ranked.txt`         |
| r1-s22 | T18  | B: Florentine families                         | Dev              | `setup:florentine-ranked.txt`      |
| r1-s23 | T18  | A: running club, friends.csv                   | Elena            | `setup:friends-ranked.txt`         |
| r1-s24 | T18  | B: Florentine families                         | Tom              | `setup:florentine-ranked.txt`      |
| r1-s25 | T21  | A: running club, friends.csv to friends-v2.csv | Grace            | `setup:friends-ranked.txt`         |
| r1-s26 | T21  | B: team, team.csv to team-v2.csv               | Dev              | `setup:team-ranked.txt`            |
| r1-s27 | T21  | A: running club, friends.csv to friends-v2.csv | Alex (analyst)   | `setup:friends-ranked.txt`         |
| r1-s28 | T21  | B: team, team.csv to team-v2.csv               | Dana (analyst)   | `setup:team-ranked.txt`            |
| r1-s29 | T21  | A: running club, friends.csv to friends-v2.csv | Tom              | `setup:friends-ranked.txt`         |
| r1-s30 | T21  | B: team, team.csv to team-v2.csv               | Ruth             | `setup:team-ranked.txt`            |
| r1-s31 | T21  | A: running club, friends.csv to friends-v2.csv | Jordan (analyst) | `setup:friends-ranked.txt`         |
| r1-s32 | T21  | B: team, team.csv to team-v2.csv               | Nadia            | `setup:team-ranked.txt`            |
| r1-s33 | T4   | A: office, people.csv + messages.csv           | Grace            | `empty`                            |
| r1-s34 | T4   | B: football, players.csv + passes.csv          | Tom              | `empty`                            |
| r1-s35 | T4   | A: office, people.csv + messages.csv           | Dana (analyst)   | `empty`                            |
| r1-s36 | T4   | B: football, players.csv + passes.csv          | Alex (analyst)   | `empty`                            |
| r1-s37 | T4   | A: office, people.csv + messages.csv           | Elena            | `empty`                            |
| r1-s38 | T4   | B: football, players.csv + passes.csv          | Ruth             | `empty`                            |
| r1-s39 | T19  | A: running club, friends.csv                   | Tom              | `setup:friends-ranked.txt`         |
| r1-s40 | T19  | B: Florentine families                         | Dev              | `setup:florentine-ranked.txt`      |
| r1-s41 | T19  | A: running club, friends.csv                   | Jordan (analyst) | `setup:friends-ranked.txt`         |
| r1-s42 | T19  | B: Florentine families                         | Elena            | `setup:florentine-ranked.txt`      |
| r1-s43 | T22  | A: bus stops, bus-stops.csv                    | Nadia            | `setup:bus-stops-ranked.txt`       |
| r1-s44 | T22  | B: Les Miserables                              | Ruth             | `setup:lesmis-ranked.txt`          |
| r1-s45 | T22  | A: bus stops, bus-stops.csv                    | Jordan (analyst) | `setup:bus-stops-ranked.txt`       |
| r1-s46 | T22  | B: Les Miserables                              | Dana (analyst)   | `setup:lesmis-ranked.txt`          |
| r1-s47 | T23  | A: running club, friends.csv                   | Elena            | `setup:friends-ranked.txt`         |
| r1-s48 | T23  | B: Florentine families                         | Grace            | `setup:florentine-ranked.txt`      |
| r1-s49 | T23  | A: running club, friends.csv                   | Jordan (analyst) | `setup:friends-ranked.txt`         |
| r1-s50 | T23  | B: Florentine families                         | Nadia            | `setup:florentine-ranked.txt`      |
| r1-s51 | T24  | A: running club, friends.csv, names drawn      | Ruth             | `setup:friends-ranked-names.txt`   |
| r1-s52 | T24  | B: bus stops, bus-stops.csv, names drawn       | Dev              | `setup:bus-stops-ranked-names.txt` |
| r1-s53 | T24  | A: running club, friends.csv, names drawn      | Dana (analyst)   | `setup:friends-ranked-names.txt`   |
| r1-s54 | T24  | B: bus stops, bus-stops.csv, names drawn       | Alex (analyst)   | `setup:bus-stops-ranked-names.txt` |
| r1-s55 | T12R | A: Les Miserables                              | Ruth             | `setup:lesmis-ranked.txt`          |
| r1-s56 | T12R | B: Florentine families                         | Jordan (analyst) | `setup:florentine-ranked.txt`      |

"(analyst)" marks the three regular analysts; every other persona did tier 1 as a first-time
user.

## Persona files

Each participant reads its persona file(s), then its history in `../../roster.md`.

| Persona | Files (read in this order)                                                                                                   |
| ------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Grace   | `design/ui/studio/personas/nonprofit-operations-analyst.md`, then `design/ui/studio/personas/returning-nonprofit-analyst.md` |
| Ruth    | `design/ui/studio/personas/data-journalist.md`, then `design/ui/studio/personas/returning-data-journalist.md`                |
| Dev     | `design/ui/studio/personas/class-project-student.md`, then `design/ui/studio/personas/returning-class-project-student.md`    |
| Elena   | `<study>/personas/explorer-elena.md`                                                                                         |
| Nadia   | `<study>/personas/alert-reviewer.md`                                                                                         |
| Tom     | `<study>/personas/recipe-recipient.md`                                                                                       |
| Alex    | `<study>/personas/analyst-alex.md`                                                                                           |
| Jordan  | `<study>/personas/marketing-analyst.md`                                                                                      |
| Dana    | `<study>/personas/supply-chain-analyst.md`                                                                                   |

`<study>` is
`/home/apowers/Projects/graphty-monorepo/.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype/study`;
the `design/ui/studio/` paths are in this worktree.

## Grading and scoring

- **Graders** get the session folder (screenshots, downloads, `session.json`, the transcript with
  its step notes), the task's section of `../../answers.md` (T12R: tier 1's `../../../answers.md`,
  T12) and `../../criteria.md`'s grade rules. They are never told what outcome the studio expects,
  and are not shown the pilots' watch items or another session's grade.
- **Each grade records:** S, SD, F or G from the last screenshot, the downloads and the transcript;
  any false "done"; severity 0 to 4 for each problem; whether it was build-decided; the void line;
  steps and wrong turns; the first move and whether it came straight from the history; the door
  used where a feature has more than one; for T17 and T18 the follow-up's steps and wrong turns;
  for T20 how the weight's meaning was set and the route to the answer; for T21 which nodes in
  both files moved after Replace; for T22 whether a rule was typed and where else the participant
  looked; every difference between the start and end open-work lists, with whether the
  participant chose it.
- **Scoring:** one row per session in a script that asserts the count (56 valid sessions, voids
  listed beside), every grade's void line read, every number with its denominator, with and
  without build-decided sessions, successes beside failures. Then two independent skeptics try to
  refute every finding and every bar result (`../../criteria.md`, "After a round").
