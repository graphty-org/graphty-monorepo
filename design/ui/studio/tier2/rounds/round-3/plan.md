# Tier 2 round 3 plan: returning users on the real graphty app

Round 3 runs on build 26f3bb968e43 (graphty@0.8.61, commit 26f3bb968), served from
`/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r3d2-26f3bb968/` with
`REAL_DIST=<that folder>` on every `tool/real.mjs` command (the first line of `../../criteria.md`).
Every `session.json` must read `buildStamp: 26f3bb968e43 graphty@0.8.61`; a session on any other
build is void. The bars, how they are scored and the stop rules are in `../../criteria.md`; this
plan changes none of them.

Round 2 passed 55 of 55 valid sessions, but its participants could read the facilitator's task
file, which names the controls on each route and every follow-up question. So round 2's passes are
weak, and three routes it added are not yet credited: setting what a weight means while opening
the file (T20), Replace from the source's "..." menu (T21), and the find box's rule hint (T22). Round
3 is the first round in which a participant can reach only its own briefing. Its sessions are
weighted toward what round 2 missed and what changed since, and every task is run.

## Was there a dry run before this round, and will participants hit build faults?

Yes. Every tier 2 task half was piloted from its start on three builds in a row, each build
carrying the fixes the walk before it found:

| Walk   | Build        | Result                                                                                      | Report                  |
| ------ | ------------ | ------------------------------------------------------------------------------------------- | ----------------------- |
| First  | b6d932823642 | 100 items; 8 defects a participant could hit, in six small units, all fixed                 | `../../dry-run-r3-1.md` |
| Second | 897d9aed9ffe | 95 items; one fix did not hold (the Overview's "Full graph" still read as a row), fixed      | `../../dry-run-r3-2.md` |
| Third  | 26f3bb968e43 | 88 items; 0 fixes; every success path landed, every reference value held, no script, console or request errors | `../../dry-run-r3-3.md` |

On every route those walks took, a participant meets no broken control: what is left are the
design questions the sessions exist to answer and the open owner items (drawn names covering each
other, bare numbers in rules, what an edge's width measures). Those are known and are not scored as
new findings when they recur.

What the walks did not cover, and so what a participant may still meet:

- **Routes nobody walked.** The three walks are scripted answer-key routes (`rounds/r3*/pilot/`,
  each `session.json` with no task and no briefing). No session with the leak closed has run yet:
  there is no `tmp/studio-sessions/` folder in the worktree. The criteria ask for the reworded T22
  and T24 prompts to be piloted in two throwaway briefed sessions each, and for the routes they take
  to be walked, before round 3 starts. That is gate item 1 below.
- **Round 2's detours.** Twelve of round 2's thirty build faults sat on styling a selection. The
  third walk styled a selection on T22 A only; clicking away from an open step editor, running a
  path twice and reopening the Path form are not named in any round 3 walk report.

Graders mark any grade a build defect decided, and the round reports results with and without those
sessions.

## The gate before the first session

Sessions start only when all of these hold, each with its evidence in `preflight.md` beside this
plan:

1. **The reworded prompts, piloted with the leak closed.** T22 A, T22 B, T24 A and T24 B each run in
   two throwaway briefed sessions, in folders under `prompt-pilots/` beside this plan, briefed with
   `real.mjs --brief <folder> --task <T22A ...> --persona <name>`, started in the folder that prints
   and ended with `--end`. Each `leaks.json` is clean. Every route they take that the third walk did
   not is walked on 26f3bb968e43; a fault a participant could hit is fixed and the build refrozen
   before session 1, as the dry runs did.
2. **The study tool's self-check passes five times in a row** (`real.mjs --prove`, every line `ok`) on
   the frozen build, with the tool commit the sessions will use. Until it does, no T19 or T21
   session starts (each saves or replaces a file).
3. **Every session can be briefed.** `real.mjs --brief` writes all 56 briefings from this plan's
   rows without a refusal, and no prompt holds a word its task avoids, except the words `../../tasks.md`
   keeps on purpose with a reason ("longer" on T20, "from" and "to" on T18, "updated list" on T21,
   "change the drawing so it has only" on T23). Checked 2026-10-10: before a tool fix, all six of
   Dana's sessions were refused, because her persona file's opening paragraph names its own
   "Facilitator notes" section; the briefing now leaves that paragraph out, and 56 of 56 brief.
4. **The bar scripts run on the frozen build before the sessions** (`tool/bars.mjs`: bar 7 (a),
   bar 8's tier 2 screens, bar 9 (a) and (b), bar 10's clipped-text, raw-string and glossary counts
   at both widths), each caught on a planted case first, so bars 8 to 10 are not scored after the
   fact.
5. **The open-work lister** writes `work-start.json` and `work.json` in every session folder, so
   bar 2 is scored from lists.

## The questions round 3 answers

1. **The three uncredited routes, measured clean** (both halves at full size, the route of every
   session recorded):
    - T20: does a participant set what the weight means while opening the file, before any run?
    - T21: does anyone see the line saying an Add repeats existing ties, and use Replace from the
      Add page; or do they still go through the source's "..." menu?
    - T22: after "No match", does the example rule line plus Enter get 3 or more of 8 past the dead
      end? If T22 fails both halves and 3 or more look for a select-by-condition control in one
      named place, "Select where..." is reconsidered (the decision rule in `../../criteria.md`).
2. **The second time** (T17 and T18 follow-ups, from the tool): steps and wrong turns on a repeat
   of the same work, reported on round 3 only.
3. **T18's cost (bar 11)**, the one core-four bar round 2 failed (median 8.5 against 8): does the
   Analyze list now find Shortest path from a reader's own words, and does a weighted path's run row
   show its total instead of "4 hops"?
4. **What changed on the remaining tasks:** T22 and T24 asked to "point out" rather than "stand
   out" (compare with round 2 on grade and step count only); does a Color or Width added to a
   selection's layer now draw a visible mark once the selection is cleared; does a layer made from a
   rule read by its rule ("minutes >= `10`") in the key; T23: does "Filter to neighbors" as a plain
   command end the doubt about whether it hides or deletes; T12R: after a tie is picked from the find
   list, does anyone read the tie's value as the person's answer.
5. **Words at rest** (bar 9 (b)): back at or under round 1's counts on all four tier 2 screens.
6. **Doors and habits, as before:** the first move, whether it came from the history, and the second
   place looked; the door used where a feature has more than one.

Expected to keep failing and not counted as new: drawn names covering each other and the ties
(graphty-element's label placement, on the owner's list), bare numbers in rules and edge width units
(both breaking element changes, on the owner's list).

## Size: 56 sessions, the studio's cap

The round plan asks for every task below a bar at full size, the core four at full size always, and
every task a change touched at 4 or more. Round 3's changes touched every task (words at rest went
down on every tier 2 screen), so the full rule would need 62. The cap holds, and as in round 2 the
tasks with the least at stake run below 4; such a task passes bar 1 only if every session succeeds.

| Group                | Tasks                    | Sessions | Why                                                                                                                                                                                                       | Bar 1 needs             |
| -------------------- | ------------------------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| Core four            | T20, T21, T17, T18, 4+4 each | 32   | Always full size. T20 and T21 carry uncredited routes; T18 failed bar 11 and has new Analyze words and a weighted run row; T17 has the keyboard and checkbox fixes; T17 and T18 carry the second-time measure | 7 of 8, 3 of 4 per half |
| Re-measured route    | T22 at 4+4               | 8        | The find box route is uncredited; its prompt changed; it missed the steps target (16 against 6); Enter now runs the rule and layers are named by the rule                                                | 7 of 8, 3 of 4 per half |
| Changed path         | T23 at 2+2; T24 at 2+2   | 8        | T23: "Filter to neighbors" is now a plain command, and a focus fault was fixed on its route. T24: its prompt changed, it missed the steps target (7.5 against 6), and a selection's style now starts at the highlight look | 4 of 4, 2 of 2 per half |
| Touched off the path | T4 at 2+1; T19 at 2+1    | 6        | Each met every bar and target in round 2 and changed only off its success path (T4: fewer words after a load, the import page's scrollbar gutter; T19: a repeated status is announced again)            | 3 of 3                  |
| Returning T12        | T12R at 1+1              | 2        | Its full size; the find list's tie pick now moves focus, and its path is 4 steps on this build                                                                                                            | 2 of 2                  |

T4 B, T19 B and each T12R half have one session, so one persona each; the criteria's "at least two
personas a half" cannot hold at that size, as in round 2.

## Who takes which task

Every session is by a returning persona: 37 of 56 (66%) by personas who did tier 1 as first-time
users (Grace, Ruth, Dev, Elena, Nadia, Tom), 19 by the regular analysts (Alex, Jordan, Dana). Each
persona takes 6 sessions, Ruth and Jordan 7. No persona takes both halves of one task.

**Every persona meets the other dataset from round 2** wherever it took the same task, so no
persona's memory of one dataset stands in for the design. Two exceptions, both forced:

- **Nadia on T20 A** is round 2's voided r2-s05, run again as the criteria require (T20 A, Nadia,
  empty start, the same prompt). It is r3-s01, the first session of the round. Round 2's T20 A stays
  reported at 3 graded sessions with the void named.
- **Dana on T20 B again**: with Nadia on A, T20 A has room for only three of round 2's four B
  personas, and Dana's history (exports she reads at the Data place, a number she has never told the
  program how to read) is the analyst T20 most needs.

The smaller tasks rotate the same way: Dana keeps T4 (her exports come as two sheets); Ruth and
Jordan keep T12R, whose histories name a person's list of connections as the thing they use most,
and swap halves; Ruth takes no T19 (her persona file's own word "notes" names the place T19
measures).

| Task | Half A                    | Half B                     |
| ---- | ------------------------- | -------------------------- |
| T20  | Nadia, Dev, Elena; Alex   | Grace, Tom; Jordan, Dana   |
| T22  | Nadia, Grace; Jordan, Alex | Ruth, Elena, Tom; Dana    |
| T21  | Grace, Tom; Alex, Jordan  | Dev, Ruth, Nadia; Dana     |
| T18  | Ruth, Grace, Elena; Dana  | Nadia, Dev, Tom; Alex      |
| T17  | Ruth, Elena, Nadia; Jordan | Grace, Dev, Tom; Alex     |
| T24  | Ruth; Dana                | Alex, Jordan               |
| T23  | Elena, Tom                | Nadia, Ruth                |
| T4   | Elena; Dana               | Dev                        |
| T19  | Grace; Jordan             | Dev                        |
| T12R | Ruth                      | Jordan                     |

Tier 1 graduates first in each cell, analysts after the semicolon. `sessions.py` beside this plan
holds the run order and asserts all of the above (56 sessions, the sizes, each half's personas, the
per-persona totals, the graduate share, no persona on both halves, no Ruth on T19, r2-s05's re-run
first, the two forced repeats and no others, halves alternating within each task) and writes
`sessions.json` and `table.md`.

**Tom's exits.** Tom's persona file scripts a give-up on the second failed attempt. He stays in the
core four (he opens files from "Open project or file...", the route T20's change is about), and a
give-up his rule covers is labeled "scripted exit" beside the G, as `../../criteria.md` requires.

## Where each session starts

Every start is named in the session table, from `../../roster.md` ("Where each session starts"):
`empty` for T4 and T20, whose tasks are about bringing new files in; otherwise a setup from
`../../../rounds/tier-2/setups/` that leaves the persona's earlier work open (the file ranked by
PageRank, its dots colored and sized by the ranking, names drawn for T24). No session starts from a
saved project file: `../../tasks.md` ("Starts") rules that out, since reopening was measured in tier
1 and a setup reaches the same open work without depending on the project format. Check each
session's `01.png` against its expected start before the first step.

## How a session runs

- **Briefing:** `node tool/real.mjs --brief tier2/rounds/round-3/sessions/<id>` (run from
  `design/ui/studio/`) writes the participant's own folder under `tmp/studio-sessions/` of the
  worktree and prints its `briefing.md`. The task, half, persona and start come from this plan's
  row. The participant gets only that briefing and works only in that folder; it never opens
  `tasks.md`, `answers.md`, `roster.md`, a persona file or this plan.
- **Start, steps, end** in the folder `--brief` printed: `REAL_DIST=<frozen build> node
  tool/real.mjs --start <that folder> <start>`, then `--step`, then `--end`, which copies the
  session back to `sessions/<id>/` here and writes `leaks.json`. Never wrap `--start` in
  `with-browser.sh`: it takes its own slot, and a second wrap waits on itself.
- **Follow-ups:** on every T17 and T18 session the first `--end` answers with exit 3 and the
  follow-up, word for word; the participant carries on in the same session and ends again.
- **Voids:** a session whose `leaks.json` shows a facilitator file read, a session on the wrong
  build, a save the tool lost, or a model API error is void and re-run the same day as `<id>b` from a
  new folder, same persona and prompt. Every retry and its reason go in the round report.
- **At most 4 sessions alive at once**; a session's clock starts only when its slot is free.

## Grading and scoring

As round 2 (`../round-2/plan.md`, "Grading and scoring"), with every grade recording:

- the first move, whether it came from the history, and the second place looked;
- the door used where a feature has more than one, and the route on T20, T21 and T22 (success path,
  the round 2 route in `../../answers.md`, or another);
- T20: how the weight's meaning was set (at load, left "Not set", or on one run only);
- T21: whether the repeat-count line was seen and Replace used from the Add page; which nodes in
  both files moved; whether the old run's values were read before Rerun;
- T22: what the participant did after "No match", whether Enter ran the rule, and whether a style
  made from the selection stayed visible after the selection was cleared;
- T18: what was typed to find the path tool, and on a weighted path whether the run row's total was
  read;
- T12R: whether a tie picked from the find list was reported as the person's answer;
- every difference between `work-start.json` and `work.json` and whether the participant chose it
  (bar 2), with a second path run replacing the first ruled on, not only flagged;
- the follow-up's time against the screenshots (`session.json`'s `followUp`), so the second-time
  measure counts only work done after the tool gave the follow-up;
- "scripted exit" beside a G when the persona file's rule decided it, with the rule quoted.

Steps are counted as in rounds 1 and 2 (screenshots after the start; on T17 and T18 the main prompt
only), against the same success paths (T20 11, T17 7, T18 4, T21 6, T22 3, T4 9, T19 13, T23 5,
T24 3, T12R 5), so the rounds compare. T12R's path is 4 steps on this build; its cost is reported
against both. Scoring, the two skeptics and the expert walkthrough and screenshot audit (bars 8, 9
and 10, on this build, apart from the sessions) follow `../../criteria.md`.

## Run order

r2-s05's re-run first, then T20, T22, T21, T18, T17, then T24, T23, T4, T19 and T12R. The three
uncredited routes surface first; halves alternate within each task, so a defect on one dataset shows
in a task's first few sessions.

## Sessions

"(analyst)" marks the three regular analysts; every other persona did tier 1 as a first-time user.
Persona files: `../round-1/plan.md`, "Persona files". r3-s01 is round 2's voided r2-s05, run again.

| Id     | Task | Half and data                                  | Persona          | Start                              |
| ------ | ---- | ---------------------------------------------- | ---------------- | ---------------------------------- |
| r3-s01 | T20 | A: bus stops, bus-stops.csv | Nadia | `empty` |
| r3-s02 | T20 | B: hiking trails, trails.csv | Grace | `empty` |
| r3-s03 | T20 | A: bus stops, bus-stops.csv | Dev | `empty` |
| r3-s04 | T20 | B: hiking trails, trails.csv | Jordan (analyst) | `empty` |
| r3-s05 | T20 | A: bus stops, bus-stops.csv | Alex (analyst) | `empty` |
| r3-s06 | T20 | B: hiking trails, trails.csv | Tom | `empty` |
| r3-s07 | T20 | A: bus stops, bus-stops.csv | Elena | `empty` |
| r3-s08 | T20 | B: hiking trails, trails.csv | Dana (analyst) | `empty` |
| r3-s09 | T22 | A: bus stops, bus-stops.csv | Nadia | `setup:bus-stops-ranked.txt` |
| r3-s10 | T22 | B: Les Miserables | Ruth | `setup:lesmis-ranked.txt` |
| r3-s11 | T22 | A: bus stops, bus-stops.csv | Jordan (analyst) | `setup:bus-stops-ranked.txt` |
| r3-s12 | T22 | B: Les Miserables | Dana (analyst) | `setup:lesmis-ranked.txt` |
| r3-s13 | T22 | A: bus stops, bus-stops.csv | Grace | `setup:bus-stops-ranked.txt` |
| r3-s14 | T22 | B: Les Miserables | Elena | `setup:lesmis-ranked.txt` |
| r3-s15 | T22 | A: bus stops, bus-stops.csv | Alex (analyst) | `setup:bus-stops-ranked.txt` |
| r3-s16 | T22 | B: Les Miserables | Tom | `setup:lesmis-ranked.txt` |
| r3-s17 | T21 | A: running club, friends.csv to friends-v2.csv | Grace | `setup:friends-ranked.txt` |
| r3-s18 | T21 | B: team, team.csv to team-v2.csv | Dev | `setup:team-ranked.txt` |
| r3-s19 | T21 | A: running club, friends.csv to friends-v2.csv | Alex (analyst) | `setup:friends-ranked.txt` |
| r3-s20 | T21 | B: team, team.csv to team-v2.csv | Dana (analyst) | `setup:team-ranked.txt` |
| r3-s21 | T21 | A: running club, friends.csv to friends-v2.csv | Jordan (analyst) | `setup:friends-ranked.txt` |
| r3-s22 | T21 | B: team, team.csv to team-v2.csv | Ruth | `setup:team-ranked.txt` |
| r3-s23 | T21 | A: running club, friends.csv to friends-v2.csv | Tom | `setup:friends-ranked.txt` |
| r3-s24 | T21 | B: team, team.csv to team-v2.csv | Nadia | `setup:team-ranked.txt` |
| r3-s25 | T18 | A: running club, friends.csv | Ruth | `setup:friends-ranked.txt` |
| r3-s26 | T18 | B: Florentine families | Nadia | `setup:florentine-ranked.txt` |
| r3-s27 | T18 | A: running club, friends.csv | Dana (analyst) | `setup:friends-ranked.txt` |
| r3-s28 | T18 | B: Florentine families | Alex (analyst) | `setup:florentine-ranked.txt` |
| r3-s29 | T18 | A: running club, friends.csv | Grace | `setup:friends-ranked.txt` |
| r3-s30 | T18 | B: Florentine families | Dev | `setup:florentine-ranked.txt` |
| r3-s31 | T18 | A: running club, friends.csv | Elena | `setup:friends-ranked.txt` |
| r3-s32 | T18 | B: Florentine families | Tom | `setup:florentine-ranked.txt` |
| r3-s33 | T17 | A: running club, friends.csv | Ruth | `setup:friends-ranked.txt` |
| r3-s34 | T17 | B: Les Miserables | Grace | `setup:lesmis-ranked.txt` |
| r3-s35 | T17 | A: running club, friends.csv | Jordan (analyst) | `setup:friends-ranked.txt` |
| r3-s36 | T17 | B: Les Miserables | Alex (analyst) | `setup:lesmis-ranked.txt` |
| r3-s37 | T17 | A: running club, friends.csv | Elena | `setup:friends-ranked.txt` |
| r3-s38 | T17 | B: Les Miserables | Dev | `setup:lesmis-ranked.txt` |
| r3-s39 | T17 | A: running club, friends.csv | Nadia | `setup:friends-ranked.txt` |
| r3-s40 | T17 | B: Les Miserables | Tom | `setup:lesmis-ranked.txt` |
| r3-s41 | T24 | A: running club, friends.csv, names drawn | Ruth | `setup:friends-ranked-names.txt` |
| r3-s42 | T24 | B: bus stops, bus-stops.csv, names drawn | Alex (analyst) | `setup:bus-stops-ranked-names.txt` |
| r3-s43 | T24 | A: running club, friends.csv, names drawn | Dana (analyst) | `setup:friends-ranked-names.txt` |
| r3-s44 | T24 | B: bus stops, bus-stops.csv, names drawn | Jordan (analyst) | `setup:bus-stops-ranked-names.txt` |
| r3-s45 | T23 | A: running club, friends.csv | Elena | `setup:friends-ranked.txt` |
| r3-s46 | T23 | B: Florentine families | Nadia | `setup:florentine-ranked.txt` |
| r3-s47 | T23 | A: running club, friends.csv | Tom | `setup:friends-ranked.txt` |
| r3-s48 | T23 | B: Florentine families | Ruth | `setup:florentine-ranked.txt` |
| r3-s49 | T4 | A: office, people.csv + messages.csv | Elena | `empty` |
| r3-s50 | T4 | B: football, players.csv + passes.csv | Dev | `empty` |
| r3-s51 | T4 | A: office, people.csv + messages.csv | Dana (analyst) | `empty` |
| r3-s52 | T19 | A: running club, friends.csv | Grace | `setup:friends-ranked.txt` |
| r3-s53 | T19 | B: Florentine families | Dev | `setup:florentine-ranked.txt` |
| r3-s54 | T19 | A: running club, friends.csv | Jordan (analyst) | `setup:friends-ranked.txt` |
| r3-s55 | T12R | A: Les Miserables | Ruth | `setup:lesmis-ranked.txt` |
| r3-s56 | T12R | B: Florentine families | Jordan (analyst) | `setup:florentine-ranked.txt` |
