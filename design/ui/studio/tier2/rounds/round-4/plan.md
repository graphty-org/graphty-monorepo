# Tier 2 round 4 plan: returning users on the real graphty app

Round 4 runs on build 5277e2cbe1bd (graphty@0.8.64, commit 5277e2cbe), served from
`/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r4d1-5277e2cbe/` with
`REAL_DIST=<that folder>` on every `tool/real.mjs` command (the first line of `../../criteria.md`).
Every `session.json` must read `buildStamp: 5277e2cbe1bd graphty@0.8.64`; a session on any other
build is void. The bars, how they are scored and the stop rules are in `../../criteria.md`; this
plan changes none of them.

Round 3 passed 54 of 56 sessions. The one task below its bar was T24 (reading one tie on the
drawing and then selecting its two ends): 2 of 4. Both failures came from a fault in
graphty-element (a Shift-click on a node replaced the selection instead of adding to it) and
from the study (the prompt asked participants to "point out" the two people, which a one-hop path
also does, while the answer key credits only a selection). Round 4's build fixes the Shift-click
and rewords the prompt, and carries eleven smaller changes on the paths of T17, T18, T20, T21,
T22, T4, T12R and T23 (`../round-3/decisions.md`). So round 4 runs T24 at full size, the core
four at full size as always, and every other task at a size that can show whether its change held.

## Was there a dry run before this round, and will participants hit build faults?

Yes. Every tier 2 task half, A and B of all ten tasks, was piloted from its start on two builds in
a row, the second carrying the fixes the first found:

| Walk   | Build        | Result                                                                                                              | Report                  |
| ------ | ------------ | ------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| First  | 38e180aac230 | Three fixes a participant could hit (a grayed step button with no reason, an edge-only step counted in nodes, a heading) | `../../dry-run-r4-1.md` |
| Second | 5277e2cbe1bd | 91 items, none a new implementation defect; the three fixes hold; no script, console or request errors              | `../../dry-run-r4-2.md` |

On every route those walks took, a participant meets no broken control. What is left are the
design questions the sessions exist to answer and the owner's open items (drawn names covering
each other and nodes drawn inside each other, bare numbers in rules, the chosen face of a
segmented control, the reopened camera). They are known and are not scored as new findings when
they recur.

What the walks did not cover, and so what a participant may still meet:

- **Routes nobody walked.** The walks follow the answer key. Round 3's detours that are still
  possible (a second Find path, Undo after it, styling a selection by Width, a rule over an
  existing selection) were walked by the specialists in round 3, not on this build.
- **The reworded T24 prompt with a real participant** (gate item 5 below).

## The gate before the first session

`real.mjs --gate` refuses to start the round unless the evidence below is in this folder, and
appends a "Gate evidence" section to this plan listing it by file. Items 1 and 2 are what it checks;
items 3 to 5 are checked here.

1. **A pilot of every task half on 5277e2cbe1bd**, under `pilot/`:
    - 18 halves are the second dry run's walks, copied unchanged from `../r4d1/pilot/` to
      `pilot/r4d1/` (every `session.json` reads the frozen build, every screenshot is there). The
      dry run predates the rule that pilots live in the round's own folder; the copies are
      byte-for-byte the files `../../dry-run-r4-2.md` triaged.
    - **T24 A and B were walked again on 2026-10-11** (`pilot/T24A/`, `pilot/T24B/`), because the
      round 3 decisions require every route the key names for T24 to be walked on the round 4
      build, and the Shift route had never been. Results, both halves:
        - the key's path (click the line, read the number, "Edge actions", "Select endpoints"):
          the number reads 1 on A and 4 on B, and the end is "2 nodes selected", Selection row 2
          (`T24A/02.png` to `04.png`, `T24B/02.png` to `04.png`);
        - **the Shift route now works**: click one end, Shift-click the other, and the screen
          reads "2 nodes selected", Nodes 2, "Edges joining these nodes 1", both ringed, the same
          end state (`T24A/06.png`, `07.png`; `T24B/06.png`, `07.png`). So the element fix is on
          the frozen build and `../../answers.md` now names this route (logged in
          `../../criteria.md`);
        - a Ctrl-click on the second end still replaces the selection with that one node
          (`T24A/10.png`, `T24B/08.png`), as decided (only Shift was changed). The key says so; a
          participant who ends there has one selected and is graded by the F rule.
2. **The bars on the frozen build**: `bars/bars.json` from `tool/bars.mjs bars --dist <frozen
   build>`, every planted case caught. The round runner's gate step runs it before `--gate`.
3. **The study tool's self-check, five runs in a row** on the frozen build with the tool commit the
   sessions use: `preflight/prove-1.txt` to `prove-5.txt`, exit codes in
   `preflight/prove-exits.txt`. Run on 2026-10-11: 5 of 5 exited 0, every line `ok` ("every
   check passed" in each), so T19 and T21 sessions may start.
4. **Every session can be briefed.** `tmp/researcher/t2r4/brief-all.py` (in `design/ui/studio/`)
   wrote all 56 briefings from `sessions.json` into a scratch folder on 2026-10-11: 56 of 56
   briefed, every one with its prompt and its start command. The only prompt words shared with
   the task's avoided list are the ones `../../tasks.md` keeps on purpose with a reason: "from" and
   "to" (T18), "longer" and "the shortest walk" (T20), "updated list" (T21), "change the drawing so
   it has only" (T23).
5. **Not met: the reworded T24 prompt was not piloted with briefed participants.** The criteria's
   change log (2026-10-10) asks for two throwaway briefed sessions a half on the round 4 build
   before the first session. They were not run: they need fresh participant agents that have
   never seen the key, and the round runner starts participants only after this plan and its
   gate. What stands in for them, and how T24 is reported because of it:
    - every route the key names was walked on the build (item 1), so no participant can be
      failed by a route the key names and the build does not have, which is what decided
      round 3's two failures;
    - a desk check of the new words against the routes round 3 took: "so that whatever you do next
      applies only to those two" is not met by a one-hop path (it marks the two but a next action
      applies to nothing), nor by a color or size layer, so the routes that answered the old
      prompt and not the key no longer answer the new one;
    - T24 runs first (r4-s01 to r4-s08), so its first graded sessions are the earliest evidence
      of the round;
    - **every T24 grade records whether the participant's end state answers the prompt by a route
      the key does not credit** ("prompt-decided"). If any does, the prompt and the key still
      disagree: T24's bar 1 and bar 6 are reported with and without those sessions, the round
      report names it as a study fault, and the next round's prompt pilots are run before its
      plan, not after.
6. **Every change carried into the round, checked on the served build** (criteria preflight 10):
   the two dry run reports list each change on 38e180aac230 and 5277e2cbe1bd against its
   screenshot. Shift-click on a node, which no dry run walked, is item 1 above.

**The round's first 53 sessions ran without the gate.** `bars/bars.json` did not exist and `--gate`
never passed, so this plan held no "Gate evidence" section while they ran; the runner's gate step
was skipped, and nothing else checked it. The bars were run on 5277e2cbe1bd and the gate passed on
2026-10-11, after those sessions and before the three re-runs (r4-s05b, r4-s20b, r4-s28b): the
section at the end of this plan is that check. `real.mjs --start` now refuses every session of a
round whose plan holds no such section.

## The questions round 4 answers

1. **T24, the one bar round 3 missed** (8 sessions, 4 a half): with Shift-click adding and the
   prompt asking for a selection, do 7 of 8 end with exactly the two ends selected? Which route:
   the tie's "Edge actions" menu and "Select endpoints", Shift-click, or another; does anyone try
   Ctrl first (macOS habit), and does anyone end with a path or a style instead (prompt-decided)?
2. **T22, the find box with a number** (change 7): on B, where 4 of 4 typed "10" first in round
   3, does the "10 or more" row get picked, and does any find row still read cut off?
3. **T18, the shortest chain** (changes 5, 6, 8): does "path" or "shortest path" in the Analyze
   list now put Shortest path first, and does Enter leave focus in From? After a second path and
   Undo, does "Made with" name the route on screen?
4. **T17, filtering** (changes 9, 11 and the step editor's reasons): how many start from the new
   Filters tool on the canvas toolbar instead of the Graph place's Layout button or "Everything"
   (round 3: 5 of 8 looked there first)? With the chip and the step row naming both counts, does
   anyone report the tie count as the number of people (`read-wrong`)?
5. **Every task whose controls changed off the success path**: the chosen face of a segmented
   control (T4's Add and Leave out, the Hops switch in T12R and T23, "a node" / "an edge" in T20):
   is the chosen side read correctly? The Add page's repeated-ties warning (T21, if anyone reaches
   that page); the run section headed "Distribution" (T21); the disabled "Filter to neighbors"
   and its reason (T23).
6. **Bar 11 and the steps targets**, as before; T24's steps against its 3-step path.
7. **Drawn names, measured fairly.** Round 3's severity 3 for names covering each other was
   measured with "Show all labels" ticked, which turns the element's label declutter off. The T24
   setups still tick it (T24 reads two names on the drawing); graders record any misread name on
   T24 and say whether the overlap that caused it would remain with declutter on. Other setups do
   not draw names.
8. **Doors and habits, as before:** the first move, whether it came from the history, and the
   second place looked; the door used where a feature has more than one.

## Size: 56 sessions, the studio's cap

The round plan asks for every task below its bar at full size (8), the core four at full size
always, and every task a change touched at 4 or more. Every task but T19 has a change on or beside
its path, so the rule needs 40 sessions for T24 and the core four, 4 each for T22, T23 and T4, and
T12R at its own full size of 2: 54. The last 2 go to T19. A task below full size passes bar 1 only
if every session succeeds.

| Group                 | Tasks                      | Sessions | Why                                                                                                                                                       | Bar 1 needs             |
| --------------------- | -------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| Below its bar         | T24 at 4+4                 | 8        | 2 of 4 in round 3; Shift-click now adds; the prompt was reworded; bar 6's two false "done" were both T24. Full size for the first time since round 1      | 7 of 8, 3 of 4 per half |
| Core four             | T20, T21, T17, T18, 4+4 each | 32     | Always full size. T18 carries changes 5, 6 and 8 (bar 11's task); T17 changes 9 and 11; T20 the Analyze list order and the path form's focus; T21 the Add page warning and the Distribution heading | 7 of 8, 3 of 4 per half |
| Changed on the path   | T22 at 2+2; T23 at 2+2; T4 at 2+2 | 12 | T22: the "or more" row (change 7) and no cut rows. T23: the Hops switch's chosen face and the disabled button's reason. T4: Add and Leave out's chosen face, which the second dry run read as a likely severity 3 | 4 of 4, 2 of 2 per half |
| Returning T12R        | T12R at 1+1                | 2        | Its full size; the Hops switch's chosen face                                                                                                              | 2 of 2                  |
| Touched off the path  | T19 at 1+1                 | 2        | Nothing changed on its route; the shared left-panel list (compact-mantine's Tree now wraps a long row) and the segmented control's face are on every screen, and the task list asks that every task be covered | 2 of 2                  |

T19 and T12R have one session a half, so one persona each; the criteria's "at least two personas
a half" cannot hold at that size, as in rounds 2 and 3. Every other half has two or more.

## Who takes which task

Every session is by a returning persona: 37 of 56 (66%) by personas who did tier 1 as first-time
users (Grace, Ruth, Dev, Elena, Nadia, Tom), 19 by the regular analysts (Alex, Jordan, Dana). Each
persona takes 6 sessions, Ruth and Jordan 7. No persona takes both halves of one task.

**Every persona meets the other dataset from round 3** wherever it took the same task, with no
exception this round, so no persona's memory of one dataset stands in for the design. T24's four
new personas (Nadia, Tom, Grace, Elena) have never taken T24. Ruth and Jordan keep T12R and swap
halves; Dana keeps T4 (her exports come as two sheets) on the other half; Ruth takes no T19 (her
persona file's own word "notes" names the place T19 measures).

| Task | Half A                     | Half B                     |
| ---- | -------------------------- | -------------------------- |
| T24  | Nadia, Tom; Alex, Jordan   | Ruth, Grace, Elena; Dana   |
| T22  | Ruth; Dana                 | Grace; Alex                |
| T18  | Nadia, Dev, Tom; Alex      | Ruth, Grace, Elena; Dana   |
| T17  | Grace, Dev, Tom; Alex      | Ruth, Elena, Nadia; Jordan |
| T20  | Grace, Tom; Jordan, Dana   | Nadia, Dev, Elena; Alex    |
| T21  | Dev, Ruth, Nadia; Dana     | Grace, Tom; Alex, Jordan   |
| T23  | Nadia, Ruth                | Elena, Tom                 |
| T4   | Dev; Jordan                | Elena; Dana                |
| T12R | Jordan                     | Ruth                       |
| T19  | Dev                        | Jordan                     |

Tier 1 graduates first in each cell, analysts after the semicolon. `sessions.py` beside this plan
holds the run order and asserts all of the above (56 sessions, the sizes, each half's personas
and at least two a half where the size allows, the per-persona totals, the graduate share, no
persona on both halves, no Ruth on T19, no persona on the same half it took in round 3, read from
`../round-3/sessions.json`, T24 first, halves alternating within each task, every setup file
present) and writes `sessions.json` and `table.md`.

**Tom's exits.** Tom's persona file scripts a give-up on the second failed attempt. A give-up his
rule covers is labeled "scripted exit" beside the G, as `../../criteria.md` requires. He takes T24
A, where round 3's first Shift-click failure would have been his second attempt; with Shift fixed,
his exit is a fair test of whether the route is findable.

## Where each session starts

Every start is named in the session table, from `../../roster.md` ("Where each session starts"):
`empty` for T4 and T20, whose tasks are about bringing new files in; otherwise a setup from
`../../../rounds/tier-2/setups/` that leaves the persona's earlier work open (the file ranked by
PageRank, its dots colored and sized by the ranking, every name drawn for T24). No session starts
from a saved project file: `../../tasks.md` ("Starts") rules that out, since reopening was
measured in tier 1 and a setup reaches the same open work without depending on the project
format. Check each session's `01.png` against its expected start before the first step.

## How a session runs

As round 3 (`../round-3/plan.md`, "How a session runs"), with the round 3 tool faults fixed:

- **Briefing:** `node tool/real.mjs --brief tier2/rounds/round-4/sessions/<id>` (run from
  `design/ui/studio/`) writes the participant's own folder under `tmp/studio-sessions/` of the
  worktree and prints its `briefing.md`. The participant gets only that briefing.
- **Start, steps, end** in the folder `--brief` printed; `--end` copies the session back to
  `sessions/<id>/` here, keeps every note written there during the session, and writes
  `leaks.json`. Never wrap `--start` in `with-browser.sh`.
- **Follow-ups:** on every T17 and T18 session the first `--end` answers with exit 3 and the
  follow-up, word for word; the participant carries on in the same session and ends again.
- **The leak check** runs over the whole round (`real.mjs --leaks <this folder>`) before scoring,
  and fails, naming them, on any session whose participant log it could not read.
- **Voids:** a facilitator file read, a session on the wrong build, a save the tool lost, or a
  model API error voids the session; it is re-run as `<id>b` from a new folder, same persona and
  prompt, and every retry and its reason go in the round report.
- **At most 4 sessions alive at once**; a session's clock starts only when its slot is free.

## Grading and scoring

As round 3 (`../round-3/plan.md`, "Grading and scoring"), with every grade also recording:

- **T24:** the route (line and "Select endpoints", Shift-click, Ctrl-click, find box, other), how
  many tries the line click took, whether Ctrl was tried and what the participant concluded from
  it, the end state's Selection count, and "prompt-decided" when the end state answers the prompt
  by a route the key does not credit (gate item 5);
- **T22:** what was typed first; whether the "or more" row was seen and picked; any find row cut
  at the panel edge;
- **T18:** the words typed into the Analyze filter and the row Shortest path stood on; where focus
  was after picking it; on a second path and Undo, whether "Made with" matched the route drawn;
- **T17:** the first place looked, and whether the canvas toolbar's Filters tool was used; which
  count was read for the people left (the Overview's "Nodes showing", the chip or the step row);
- **T4, T12R, T23, T20:** whether each segmented control's chosen side was read correctly;
- **T21:** whether anyone reached the Add page and its warning, and what they did there;
- **T23:** what the participant concluded from the disabled "Filter to neighbors";
- the rest as round 3: first move, history, second place looked, doors, bar 2's open-work lists,
  the follow-up's time against the screenshots, and "scripted exit" where Tom's rule decided it.

Steps are counted as in rounds 1 to 3 (screenshots after the start; on T17 and T18 the main prompt
only), against the same success paths (T20 11, T17 7, T18 4, T21 6, T22 3, T4 9, T19 13, T23 5,
T24 3, T12R 5, 4 on this build), so the rounds compare. Scoring, the two skeptics and the expert
walkthrough and screenshot audit (bars 8, 9 and 10, on this build, apart from the sessions) follow
`../../criteria.md`. Bar 9 uses the counter that leaves out the data's own names, against round 1's
corrected counts in `tool/bars-limits.json`.

## Run order

T24 first (the task below its bar, and the first briefed use of its new prompt), then T22, T18
and T17 (the tasks the decisions name for re-measurement), then T20 and T21, then T23, T4, T12R
and T19. Halves alternate within each task, so a defect on one dataset shows in a task's first
sessions.

## Sessions

"(analyst)" marks the three regular analysts; every other persona did tier 1 as a first-time user.
Persona files: `../round-1/plan.md`, "Persona files"; histories: `../../roster.md`.

| Id     | Task | Half and data                                  | Persona          | Start                              |
| ------ | ---- | ---------------------------------------------- | ---------------- | ---------------------------------- |
| r4-s01 | T24 | A: running club, friends.csv, names drawn | Alex (analyst) | `setup:friends-ranked-names.txt` |
| r4-s02 | T24 | B: bus stops, bus-stops.csv, names drawn | Ruth | `setup:bus-stops-ranked-names.txt` |
| r4-s03 | T24 | A: running club, friends.csv, names drawn | Nadia | `setup:friends-ranked-names.txt` |
| r4-s04 | T24 | B: bus stops, bus-stops.csv, names drawn | Grace | `setup:bus-stops-ranked-names.txt` |
| r4-s05 | T24 | A: running club, friends.csv, names drawn | Jordan (analyst) | `setup:friends-ranked-names.txt` |
| r4-s06 | T24 | B: bus stops, bus-stops.csv, names drawn | Dana (analyst) | `setup:bus-stops-ranked-names.txt` |
| r4-s07 | T24 | A: running club, friends.csv, names drawn | Tom | `setup:friends-ranked-names.txt` |
| r4-s08 | T24 | B: bus stops, bus-stops.csv, names drawn | Elena | `setup:bus-stops-ranked-names.txt` |
| r4-s09 | T22 | A: bus stops, bus-stops.csv | Ruth | `setup:bus-stops-ranked.txt` |
| r4-s10 | T22 | B: Les Miserables | Grace | `setup:lesmis-ranked.txt` |
| r4-s11 | T22 | A: bus stops, bus-stops.csv | Dana (analyst) | `setup:bus-stops-ranked.txt` |
| r4-s12 | T22 | B: Les Miserables | Alex (analyst) | `setup:lesmis-ranked.txt` |
| r4-s13 | T18 | A: running club, friends.csv | Nadia | `setup:friends-ranked.txt` |
| r4-s14 | T18 | B: Florentine families | Ruth | `setup:florentine-ranked.txt` |
| r4-s15 | T18 | A: running club, friends.csv | Dev | `setup:friends-ranked.txt` |
| r4-s16 | T18 | B: Florentine families | Dana (analyst) | `setup:florentine-ranked.txt` |
| r4-s17 | T18 | A: running club, friends.csv | Alex (analyst) | `setup:friends-ranked.txt` |
| r4-s18 | T18 | B: Florentine families | Grace | `setup:florentine-ranked.txt` |
| r4-s19 | T18 | A: running club, friends.csv | Tom | `setup:friends-ranked.txt` |
| r4-s20 | T18 | B: Florentine families | Elena | `setup:florentine-ranked.txt` |
| r4-s21 | T17 | A: running club, friends.csv | Grace | `setup:friends-ranked.txt` |
| r4-s22 | T17 | B: Les Miserables | Ruth | `setup:lesmis-ranked.txt` |
| r4-s23 | T17 | A: running club, friends.csv | Dev | `setup:friends-ranked.txt` |
| r4-s24 | T17 | B: Les Miserables | Jordan (analyst) | `setup:lesmis-ranked.txt` |
| r4-s25 | T17 | A: running club, friends.csv | Alex (analyst) | `setup:friends-ranked.txt` |
| r4-s26 | T17 | B: Les Miserables | Elena | `setup:lesmis-ranked.txt` |
| r4-s27 | T17 | A: running club, friends.csv | Tom | `setup:friends-ranked.txt` |
| r4-s28 | T17 | B: Les Miserables | Nadia | `setup:lesmis-ranked.txt` |
| r4-s29 | T20 | A: bus stops, bus-stops.csv | Grace | `empty` |
| r4-s30 | T20 | B: hiking trails, trails.csv | Nadia | `empty` |
| r4-s31 | T20 | A: bus stops, bus-stops.csv | Jordan (analyst) | `empty` |
| r4-s32 | T20 | B: hiking trails, trails.csv | Dev | `empty` |
| r4-s33 | T20 | A: bus stops, bus-stops.csv | Tom | `empty` |
| r4-s34 | T20 | B: hiking trails, trails.csv | Alex (analyst) | `empty` |
| r4-s35 | T20 | A: bus stops, bus-stops.csv | Dana (analyst) | `empty` |
| r4-s36 | T20 | B: hiking trails, trails.csv | Elena | `empty` |
| r4-s37 | T21 | A: running club, friends.csv to friends-v2.csv | Dev | `setup:friends-ranked.txt` |
| r4-s38 | T21 | B: team, team.csv to team-v2.csv | Grace | `setup:team-ranked.txt` |
| r4-s39 | T21 | A: running club, friends.csv to friends-v2.csv | Dana (analyst) | `setup:friends-ranked.txt` |
| r4-s40 | T21 | B: team, team.csv to team-v2.csv | Alex (analyst) | `setup:team-ranked.txt` |
| r4-s41 | T21 | A: running club, friends.csv to friends-v2.csv | Ruth | `setup:friends-ranked.txt` |
| r4-s42 | T21 | B: team, team.csv to team-v2.csv | Tom | `setup:team-ranked.txt` |
| r4-s43 | T21 | A: running club, friends.csv to friends-v2.csv | Nadia | `setup:friends-ranked.txt` |
| r4-s44 | T21 | B: team, team.csv to team-v2.csv | Jordan (analyst) | `setup:team-ranked.txt` |
| r4-s45 | T23 | A: running club, friends.csv | Nadia | `setup:friends-ranked.txt` |
| r4-s46 | T23 | B: Florentine families | Elena | `setup:florentine-ranked.txt` |
| r4-s47 | T23 | A: running club, friends.csv | Ruth | `setup:friends-ranked.txt` |
| r4-s48 | T23 | B: Florentine families | Tom | `setup:florentine-ranked.txt` |
| r4-s49 | T4 | A: office, people.csv + messages.csv | Dev | `empty` |
| r4-s50 | T4 | B: football, players.csv + passes.csv | Dana (analyst) | `empty` |
| r4-s51 | T4 | A: office, people.csv + messages.csv | Jordan (analyst) | `empty` |
| r4-s52 | T4 | B: football, players.csv + passes.csv | Elena | `empty` |
| r4-s53 | T12R | A: Les Miserables | Jordan (analyst) | `setup:lesmis-ranked.txt` |
| r4-s54 | T12R | B: Florentine families | Ruth | `setup:florentine-ranked.txt` |
| r4-s55 | T19 | A: running club, friends.csv | Dev | `setup:friends-ranked.txt` |
| r4-s56 | T19 | B: Florentine families | Jordan (analyst) | `setup:florentine-ranked.txt` |

## Gate evidence

Checked by `real.mjs --gate` on 2026-10-11, build 5277e2cbe:

- pilot T12RA: /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-4/pilot/r4d1/T12RA/
- pilot T12RB: /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-4/pilot/r4d1/T12RB/
- pilot T17A: /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-4/pilot/r4d1/T17A/
- pilot T17B: /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-4/pilot/r4d1/T17B/
- pilot T18A: /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-4/pilot/r4d1/T18A/
- pilot T18B: /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-4/pilot/r4d1/T18B/
- pilot T19A: /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-4/pilot/r4d1/T19A/
- pilot T19B: /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-4/pilot/r4d1/T19B/
- pilot T20A: /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-4/pilot/r4d1/T20A/
- pilot T20B: /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-4/pilot/r4d1/T20B/
- pilot T21A: /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-4/pilot/r4d1/T21A/
- pilot T21B: /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-4/pilot/r4d1/T21B/
- pilot T22A: /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-4/pilot/r4d1/T22A/
- pilot T22B: /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-4/pilot/r4d1/T22B/
- pilot T23A: /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-4/pilot/r4d1/T23A/
- pilot T23B: /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-4/pilot/r4d1/T23B/
- pilot T24A: /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-4/pilot/T24A/
- pilot T24B: /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-4/pilot/T24B/
- pilot T4A: /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-4/pilot/r4d1/T4A/
- pilot T4B: /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-4/pilot/r4d1/T4B/
- bars on 5277e2cbe1bd graphty@0.8.64: /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-4/bars/bars.json
