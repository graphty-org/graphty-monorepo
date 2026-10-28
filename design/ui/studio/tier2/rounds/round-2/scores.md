# Tier 2 round 2 scores: returning users on the real graphty app

Scored against `../../criteria.md` on build 8f0d5a6f7791 (graphty@0.8.61), from the graders'
`grade.md` files in `sessions/`, the four expert reports in `expert/` (controls and gestures, visual
design, accessibility, and the screenshot audit at 1200 x 900 and 900 x 700), and a run of
`tool/bars.mjs` on the frozen build made for this scoring (bars 7 (a), 8 and 9;
`design/ui/studio/tmp/researcher/t2r2/bars/bars.json`, every planted check trusted). Ease is each
participant's own rating (1 = very difficult, 7 = very easy), read from the transcript; it never
decided a grade. Steps are the screenshots after the start; on T17 and T18 they count the main prompt
only. Every row is in `design/ui/studio/tmp/researcher/t2r2/score.py`, which asserts 56 rows and 55
valid sessions and prints the numbers below; `followup.py` and `concurrency.py` beside it check when
each follow-up reached its participant and how many sessions ran at once. Success paths, in the
answer key's steps: T20 11, T17 7, T18 4, T21 6, T22 3, T4 9, T19 13, T23 5, T24 3, T12R 5.

All participants are simulated: one model playing composite personas, each told a history of
earlier sessions. A failure is strong evidence; a pass is weak until real people confirm it.
Keyboard-only and screen-reader use of tier 2 is untested by sessions (owner, 2026-10-07); bar 8 is
the only check on it.

## Did a dry run happen, and are participants hitting implementation faults?

**Yes, a dry run happened, and it was wider than round 1's.** Before any session, every task's
success path and round 1's commonest wrong turns were walked by pointer and by keyboard on three
builds (`../../dry-run-r2-1.md`), every task half was piloted on three more builds
(`../../dry-run-r2-2.md` to `-4.md`) and again on the study build, the 30 detour walks were re-run on
the study build itself (30 of 30 reached their screens), and the study tool's self-check passed 5
times in a row (`plan.md`, `preflight.md`). Each walk's implementation and polish faults were fixed
before the next build was frozen; design questions were left for the sessions on purpose.

**Mostly no: participants spent their sessions on design questions, not broken controls.** All 55
valid sessions ran on the frozen build, no grade was decided by a build defect, no session ended on
an error, and only one `session.log` holds anything (r2-s13: the tool closing an idle session after
the participant had finished). Graders recorded about 355 problems; about 19 are about the study
tool or the run, and of the rest about 30 (roughly 9%) are implementation faults of the build. The
other 90% are where a feature lives, what a word means, and what the screen does not say.

**The implementation faults participants did meet**, none deciding a grade:

| Fault                                                                                                                                                      | Sessions                                  | Severity | Why the dry run did not remove it                                                                                                                                                       |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A line Width added to a style layer starts at 8, which draws no wider than an unstyled tie once the selection is cleared; 20 draws about 2 px             | r2-s11, s12, s14, s16                     | 3        | The first dry run measured it and dropped it as "not a rendering defect" (width is in scene units: 10 x W / distance pixels). The cost to a reader is the same as round 1's confirmed defect |
| A line Color added to a style layer starts at A9A9A9, the gray every tie already has, so adding it changes nothing on the drawing                          | r2-s12, s13, s14, s16                     | 2        | No walk styled a selection; the walks styled a run (T22-D2)                                                                                                                             |
| A half-made filter step is thrown away without a word when another item is selected                                                                        | r2-s17, s18                               | 2        | No walk clicked away from an open step editor; the controls expert also found Tab then Escape drops an edit silently                                                                    |
| Making or recoloring a style layer moves and rescales the drawing                                                                                          | r2-s14, s16                               | 1        | Same detour, not walked                                                                                                                                                                 |
| A left click on a source row opens the table drawer, which stays open and halves the drawing                                                               | r2-s33, s34, s35, s36, s38, s40           | 1        | Seen and kept: it is the round 2 route to the source's "..." menu                                                                                                                       |
| The canvas key grows and covers the top of the "Depot" label                                                                                               | r2-s52, s54                               | 1        | Round 1's confirmed defect, not fixed                                                                                                                                                   |
| The "Stadium" label covers the middle of the Station-Stadium line, so a click there selects the stop                                                      | r2-s52; audit finding 1                   | 2        | graphty-element's label placement, deferred on purpose                                                                                                                                  |
| Opening a node's list of connections silently selects the whole neighborhood (Selection 1 to 18)                                                          | r2-s55, s56                               | 1        | Recorded in the key as this build's behavior                                                                                                                                            |
| After "Filter to neighbors" every remaining dot keeps its yellow selection halo                                                                            | r2-s49; visual 3, controls 19             | 1        | Selection drawing, deferred                                                                                                                                                             |
| Reopening the Path form fills From with the node still selected from the last question                                                                    | r2-s30                                    | 2        | One session; the walks ran one path per session                                                                                                                                         |
| The name column's inspector says Kind "Groups" for 10 distinct names                                                                                      | r2-s42                                    | 2        | One session; the walks did not open that column                                                                                                                                         |
| Shift-click on table rows also paints a browser text selection; arrowheads do not grow with line width; the selection band hides a new color while editing | r2-s11                                    | 1        | One session each                                                                                                                                                                        |

Twelve of these thirty sit on one detour: making the marked ties of T22 stand out for good. The
first dry run walked styling from a run's Style tab, which was the round 1 defect, but not styling a
selection, which is what 5 of 8 T22 participants did this round. The dry run's lesson from round 1
held again: it removes faults only where it walks, and participants keep choosing the route nobody
walked. The width is the clearest case of a triage call the sessions overturned: the first dry run
ruled it "works as designed", and 4 of 8 T22 participants spent steps on it, three at severity 3.

**The bigger fault this round was the study's own, not the build's: participants saw facilitator
text.** The tool writes each participant a `briefing.md` holding only their persona, history,
prompt and start (`../../../tool/README.md`, "Briefing a participant"), and participants are to read
nothing else. No session folder holds a `briefing.md`, and no transcript mentions one; the
transcripts show commands run from the `tier2/` folder, where `tasks.md` (each task's avoided-word
list, follow-ups and the dry run's detour list) sits. The evidence of what reached participants:

- **r2-s05** (T20 A) read the task's "Words avoided" list, which names "weight", "higher", "means",
  "farther": the controls T20 measures. The grader voided it.
- **13 of 16 T17 and T18 sessions did their follow-up before the tool released it**
  (`followup.py`: no screenshot after the follow-up's recorded time in r2-s17, s18, s19, s21 to s24,
  s26 to s31). The transcripts say it came "from the task text" or "the task sheet". In `tasks.md`
  each follow-up sits two lines above that task's avoided-word list. Only r2-s20, s25 and s32 met
  the follow-up as designed.
- Every task's avoided-word list names the controls on its route ("filter", "step"; "shortest",
  "path"; "replace", "rerun"; "select", "rule"; "hops", "neighbors"; "endpoints"; "note").

So the round cannot show which successes the screen gave and which the facilitator text gave. Bar 1
and the stop rule are scored below as the rules ask, but every pass this round is weaker evidence
than round 1's, and the second-time measure (T17 and T18 follow-ups) is not usable. Graders did not
void the 13 sessions, because none disclosed reading avoided words; the criteria void only tool and
run failures, and round 1 kept its one contaminated session (r1-s03) the same way. Both skeptics
should weigh it task by task.

**Other run faults:**

- **r2-s05 was not re-run**, against the plan's rule (a void is re-run the same day as `r2-s05b`),
  the same miss as round 1's r1-s04. T20 A has 3 valid sessions instead of 4; bar 1 holds either
  way.
- At most 4 sessions ran at once (`concurrency.py`), so the round 1 overload is gone. Two click
  timeouts remain (r2-s10, s12, the first click on the find box), each recovered by a click by
  position.
- **The study tool's click by name cost steps in about 15 sessions**, and in three it landed on a
  same-named control the participant did not mean (r2-s17 and s18: the left panel's attribute row
  instead of the open list's option, which threw the half-made step away; r2-s30: the run row
  instead of the menu entry). `bars.mjs` finds no two controls sharing an accessible name on the tier
  2 screens, so these are the tool matching visible text, not an app defect.
- **Preflight said bar 10's scripted counts were built; they are not.** `tool/bars.mjs` and
  `tool/measure.mjs` measure bars 7 (a), 8 and 9 only; nothing counts clipped text, raw element
  strings or rejected words. And the measurement of bars 7 (a), 8 and 9 had not been run on this
  build before scoring (the newest `bars.json` was round 1's build); it was run for this report.
- Preflight item 4 (every tier 1 success path on this build) is still not checked.
- Three graders flagged a roster mismatch (r2-s08, s31, s32). The sessions match `plan.md`'s table,
  which swapped round 1's halves on purpose; `roster.md`'s per-task table was not updated.

## Sessions

56 run, 55 valid, 1 void (r2-s05, participant read facilitator text; not re-run). 0 build-decided.
55 of 55 valid sessions succeeded (100%; target 85%): 45 S, 10 SD, 0 F, 0 G.

## Bars (all must hold in one round)

| #   | Bar                                     | Round 2                                                                                                                                                                                                                                      | Status                                       |
| --- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| 1   | Each task's success rate, each half     | Every task and half meets its floor (table below). Weakened by participants seeing facilitator text                                                                                                                                          | Holds (with that caveat)                     |
| 2   | Earlier work kept                       | Scored from `work-start.json` and `work.json` in all 56 folders: nothing the participant started with is gone in any session except T21's replaced file, which each participant chose. A second path run replacing the first: see the check | Holds (check below)                          |
| 3   | Confirmed severity-4 problems open      | 0. No participant left, failed, or reported a wrong answer                                                                                                                                                                                   | Holds                                        |
| 4   | Confirmed silent commit on success path | 0 by the bar's definition. Two graders called the second path run a silent commit and one the discarded step editor; neither fits (the drawing changed; nothing was committed)                                                               | Holds                                        |
| 5   | Numbers that disagree with drawing/data | 0 misread. Three readings for the skeptics (below): the old Top 10 after Replace, "Components 1" under a filter, "4 hops" on a weighted path                                                                                                 | Holds (check below)                          |
| 6   | Confirmed false "done"                  | 0 of 55                                                                                                                                                                                                                                      | Holds                                        |
| 7   | The loaded weight read as loaded        | (a) `bars.mjs`: 290 runs (every catalog algorithm, each meaning, with and without the weight column, directed and undirected), 0 unfinished, 0 wrong readings, planted wrong readings caught. (b) 0 sessions read a weight the wrong way round | Holds                                        |
| 8   | Automated accessibility check           | axe: 3 serious violations (below). No two controls share an accessible name; focus held after all 14 scripted actions. By hand, the accessibility specialist found 3 severity-3 faults the script does not press                           | **Fails**                                    |
| 9   | App words at rest                       | (a) 42 on tier 1's screen (limit 50). (b) Every tier 2 screen rose above round 1's count: rest screen 55 (53), path run 70 (66), neighbor list 38 (36), edge inspector 34 (30)                                                              | **Fails** ((b))                              |
| 10  | Expert walkthrough and screenshot audit | 2 confirmed severity-3 findings open (below). The scripted counts were never built, and round 1 recorded no total of confirmed findings to compare against                                                                                   | **Fails**                                    |
| 11  | Cost of the core four                   | T20, T17 and T21 within 2x; T18 8.5 against 8                                                                                                                                                                                                | **Fails** (T18; holds if its path is 5)      |

**Check on bar 2.** Seven T18 sessions ran Shortest path twice (r2-s25 to s31); each second run
replaced the first chain on the drawing, in the run list and in the Values, with no notice, and most
participants expected both to stay (r2-s27, s28, s29, s30). The open-work lists do not show it: the
first chain was made during the session, so it is in neither the start list nor the end list, and
graders ruled it not `not-kept` because the participant chose to run again. Round 1, which had no
lists, read the bar's words ("a run ... gone at the end without the participant choosing to remove
it") and scored the same event `not-kept` in 5 sessions. Read round 1's way, bar 2 fails in 7
sessions. Scored as holding because the bar names a scripted list and graders ruled; the problem is
confirmed below either way.

**Check on bar 5.** None of these was misread, and each is labeled somewhere, but each is a number
on a success path a hurried reader could take as current or as the answer:

- After Replace and before Rerun, the run's histogram, "12 of 12 have a value" and the old Top 10
  stay at full contrast; the out-of-date marks are the key's title ", out of date", a bar above the
  Values and a wordless clock icon on the run's row (r2-s33 to s35, s37 to s40; visual expert 2).
  Round 1 failed bar 5 on the key's range with no mark; the key now has its mark.
- With a filter step on, the Overview lists the whole graph's "Components 1", "Nodes 77", "Edges
  254" under "Nodes showing 17 of 77", over a drawing in two pieces, with one line saying the counts
  below are for the whole graph (r2-s18, s19, s22).
- On a weighted path the run's row reads "Shortest path 4 hops" while the answer is "Total minutes
  14"; three participants briefly doubted that the minutes were used (r2-s03, s07, s08). The bar's
  own example is "a path run's row number that is not the path's length"; "4 hops" is the hop count,
  labeled as such, so it is scored as a wording problem, not a disagreement.

### Bar 1, per task

| Task | Success | Half A | Half B | Needs            | Holds | S / SD / F / G |
| ---- | ------- | ------ | ------ | ---------------- | ----- | -------------- |
| T20  | 7 of 7  | 3 of 3 | 4 of 4 | 7 of 8, 3 a half | yes   | 7 / 0 / 0 / 0  |
| T22  | 8 of 8  | 4 of 4 | 4 of 4 | 7 of 8, 3 a half | yes   | 1 / 7 / 0 / 0  |
| T17  | 8 of 8  | 4 of 4 | 4 of 4 | 7 of 8, 3 a half | yes   | 8 / 0 / 0 / 0  |
| T18  | 8 of 8  | 4 of 4 | 4 of 4 | 7 of 8, 3 a half | yes   | 6 / 2 / 0 / 0  |
| T21  | 8 of 8  | 4 of 4 | 4 of 4 | 7 of 8, 3 a half | yes   | 6 / 2 / 0 / 0  |
| T4   | 4 of 4  | 2 of 2 | 2 of 2 | 4 of 4, 2 a half | yes   | 4 / 0 / 0 / 0  |
| T19  | 3 of 3  | 1 of 1 | 2 of 2 | 3 of 3           | yes   | 3 / 0 / 0 / 0  |
| T23  | 3 of 3  | 2 of 2 | 1 of 1 | 3 of 3           | yes   | 3 / 0 / 0 / 0  |
| T24  | 4 of 4  | 2 of 2 | 2 of 2 | 4 of 4, 2 a half | yes   | 3 / 1 / 0 / 0  |
| T12R | 2 of 2  | 1 of 1 | 1 of 1 | 2 of 2, 1 a half | yes   | 2 / 0 / 0 / 0  |

T20 holds even if the void counts as a failure (7 of 8; A 3 of 4). T20 moved from 0 S of 7 in round
1 to 7 S of 7: every valid session opened the file its usual way, reached the import page through
the round 2 route, and set the minutes or kilometers to Weight and "Farther" before loading. That is
the change's own route, so it is credited, with the caveat above: r2-s05, the one session that
disclosed reading T20's avoided words, did the same thing. **T18 passes with two sessions that never
used the path tool for the prompt** (r2-s26 and s32 worked the chain out by hand from the find box;
r2-s32 never learned the tool exists and said this "would not work on a larger network").

### Bar 8, measured

`bars.mjs` on 8f0d5a6f7791 (dark scheme), every check proven on a planted failure:

- **The filter step's checkbox is 12 x 12 px** with 12 px of clear space (axe `target-size`, serious,
  on the Data place with a step on and with it off; WCAG 2.5.8 asks 24). Four participants found the
  same box small and unclear (r2-s19, s20, s22, s24).
- **The find results' scroll area is not keyboard reachable** (axe `scrollable-region-focusable`,
  serious, `.ws-find-viewport`).
- No two controls share an accessible name on the tier 2 screens; focus held after every scripted
  action (adding, ticking and deleting a step, Escape from the step editor, the Path popover and the
  find box, Find path, saving a note, each Load, Rerun, Filter to neighbors, Select endpoints).

By hand the accessibility specialist found two severity-3 faults the script does not press, each
from one specialist and so not confirmed: a second Escape in the emptied find box drops focus to the
page (`FindBox.tsx` blurs on purpose; the script presses Escape once); changing Follow by arrow keys
moves focus into Hops, so the next arrow changes Hops.

### Bar 9 (b), measured

Each count rose: the returning rest screen 53 to 55 ("Loaded weight", "PageRank on N nodes"), a
path run's inspector 66 to 70 ("Each edge counts as 1", "A path needs a distance and weight has no
meaning set"), the neighbor list 36 to 38, an edge's inspector 30 to 34 (the key's "on N nodes"
titles). The counting code did not change since round 1's limits were set (only the browser's
scrollbars did). Most of the rise is round 2's own fixes: the out-of-date and scope words in the key
and the weight lines. The criteria's rule is that words at rest never rise; these fixes added words
without removing any.

### Bar 10, the confirmed severity-3 findings

Confirmed means two specialists, a specialist and a session, or a script; the scripted counts did
not exist, so none is confirmed by measurement.

1. **Drawn names cover each other, cover the ties a task asks about, and run off the canvas.**
   "Chloe" over "Farah", "Dev" over "Eli", "Hana" on Ivan's dot; the "Stadium" label hides most of
   the Station-Stadium tie; long names cut at both edges. Audit 1 and 2, visual expert 1; sessions
   r2-s51, s52, s53 (and every session that counted dots: overlapping pairs on friends, Creek and
   Summit on trails). Owner: graphty-element (label placement, fit framing spheres and not labels).
   Expected to stay open; reported as a class.
2. **A number in a rule must be wrapped in backticks.** `=minutes >= 10` is refused; the correction
   is plain text, Enter does nothing, and it drops the "=" the rule needs. Controls expert 1 (sev 3),
   audit 5 (sev 2, the missing "="); sessions r2-s09, s10, s12, s13, s14, s15, s16 (r2-s15 "I don't
   know what a backtick is", would have stopped without copying). Owner: graphty-element (accept a
   bare number), then the app's words.

Severity 3 from one specialist only (each needs a second look or a script): the two accessibility
faults above.

**Found by both the sessions and the experts:** drawn names, backticks, the out-of-date state after
Replace, the Path popover covering the drawing, the selection halo (tinting neighbors, staying on
every dot after a filter), a note's subject following the inspector, "Filter to neighbors" not
saying what it does, the 2-hop list not saying how far each name is, the path counted three ways,
"As the file says" on a CSV, a selected source opening the table drawer, the step checkbox's size,
a typed condition recognized but not runnable. **Only the experts:** long-name truncation (no study
file has long names), the two-table source with no actions menu, "Edit source..." titled "Replace",
focus and announcement faults, the 900 x 700 layout, a filter step cutting a path result, two
selection looks, spacing and emphasis. **Only the sessions:** where features live (filtering,
Replace, Shortest path, Neighborhood, a rule), the edge-style defaults (width 8, gray color), a
selection that does not last, layers named "13 edges", the wish to compare before and after a
rerun and to keep both chains, the column that loads as "Attribute". As in round 1, the experts
find how a reached screen behaves; the sessions find whether a returning user reaches it.

### Bar 11, cost of the core four

| Task | Success path | Median steps (successful) | 2x  | Within | Steps                         |
| ---- | ------------ | ------------------------- | --- | ------ | ----------------------------- |
| T20  | 11           | 15                        | 22  | yes    | 14, 14, 14, 15, 17, 17, 18    |
| T17  | 7            | 8                         | 14  | yes    | 7, 7, 8, 8, 8, 8, 9, 9        |
| T18  | 4            | 8.5                       | 8   | **no** | 4, 4, 7, 7, 10, 10, 10, 10    |
| T21  | 6            | 9.5                       | 12  | yes    | 8, 8, 8, 9, 10, 11, 14, 14    |

T20 fell from 23 to 15 (the trip back to the start screen is gone). T18's two cheapest sessions
are the two that never opened the path tool; without them the median is 10. Every T18 and T20
session reached Shortest path through the Analyze list and its filter box (3 steps where the P key
is 1) and picked each end from its suggestion list (2 steps for 1); T18 holds if its path is
counted as 5, as several graders did. T21 counts every screenshot, including a save two
participants added; to the Rerun its median is 9.

## Measures (targets, not gates)

| Measure                                     | Target                    | Round 2                                                                                                                                                                                                                               |
| ------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| All sessions                                | >= 85%                    | 55 of 55 (100%)                                                                                                                                                                                                                       |
| Ease, mean (median)                         | >= 5.0; no task below 4.0 | 5.71 (6) overall; core four 5.87. T22 4.50, T19 5.67, T18 5.75, T21 5.75, T20 6.00, T17 6.00, T4 6.00, T23 6.00, T24 6.00, T12R 6.50. 41 of 55 ratings are exactly 6, so the scale says little this round                                 |
| Steps against the success path, other tasks | median <= 2x              | T4 11.5 of 18, T19 19 of 26, T23 7 of 10, T12R 4.5 of 10 within. **T22 16 against 6** (to the selection itself, median 8); **T24 7.5 against 6** (all four added a lasting color, which the task did not need)                                  |
| Wrong turns per session                     | median <= 1               | 0 (37 of 55 with none). T22 median 1 (round 1: 5), T20 0 (round 1: 5); r2-s12 had 6                                                                                                                                                  |
| Recovery                                    | >= 70%                    | 18 of 18 sessions with a wrong turn succeeded                                                                                                                                                                                         |
| The second time (follow-ups)                | path + 1, 0 wrong turns   | **Not usable**: 13 of 16 participants knew the follow-up before it was given. Of the three who did not, r2-s20 (T17) took 6 against 5, r2-s25 (T18) 5 within, r2-s32 (T18) 4 by hand without the tool                                 |
| Script, console and request errors          | 0                         | 0                                                                                                                                                                                                                                     |

**First moves and broken habits.**

- **T20, 7 of 7** opened the file with "Open project or file...", the route their histories name; on
  this build it now leads to the import page ("Open as a new graph"), so the habit carried. Round
  1's confirmed broken habit (the Data place, after loading) is gone.
- **T21**: the first move was the run's Values in 8 of 8 (to note the top name), then the Data place
  or the file's name. The file's name in the Graph panel title was tried as a file control in 3 of
  8 (r2-s36, s39, s40) and the Graph inspector's "..." in 2 (r2-s36, s39); neither offers anything
  about the file. r2-s33 tried "Open project or file..." and nearly loaded the newer file as an
  addition. Every session then reached Replace through the source's own "..." menu.
- **T22**: the find box first in 6 of 8; r2-s14 went to the Data place for the column's name first,
  then the find box; r2-s11 sorted the Data place's table and Shift-clicked rows.
  The find box led on only after a full condition with the exact column name: a column name alone
  or a condition without one gave only "No match" in 6 of 8 (r2-s09, s10, s12, s13, s15, s16).
  Typed "=" unprompted: 0 of 8.
- **T17**: the Data place in 7 of 8 (r2-s21 hovered the toolbar first); Filters found there 8 of 8.
- **T18**: the find box first in 6 of 8; it never leads on to the path tool. r2-s26 (prompt) and
  r2-s32 (both questions) finished by hand from the find box.
- **T23 and T12R**: the find box and the node's panel led on; Neighborhood was found in the node's
  "..." menu (r2-s48, s49) or the Degree row (r2-s55, s56). T24: 4 of 4 clicked the line first.

**Doors.** Path: the Analyze list in all 14 sessions that ran a path, the P key 0, a node's "Path
between..." 0 (28 chances across two rounds; no session was keyboard-only, so P is not a candidate
for removal on this evidence). Filter: the Filters "+" in 8 of 8, an attribute's "Filter to..."
0 of 8. Notes: the Notes place's "+" in 3 of 3, a node menu's "Add note" also in 1 (r2-s47), the N
key not seen used. A tie: the drawing 4 of 4.

**T22, select by a condition.** 7 of 8 reached a rule through the round 2 hint; 0 typed "=" first.
Places looked for a way to mark by value: the find box 7; the attribute's summary or its "..." menu
4 (r2-s11, s12, s14, s16); the edge table's column menu 1; the selection's Style tab 3. T22 met its
bar on both halves, so the rule decided before round 1 does not reopen the "select where" dialog.

**Bar 7 (b) and the weight.** T20: 7 of 7 set the weight's meaning at load ("Farther"); none chose
Closer, Capacity or "Date or time"; none ran a path without the weight. T21: 8 of 8 left "Higher
means: Not set" on the Replace page, most quoting the line under it ("reads it as closer") as their
reason; both runs' Made with say "read as closer".

**T21, positions after Replace.** On the team file every node moved (the drawing was laid out again;
r2-s34, s36, s40); on friends the drawing kept its shape and was zoomed and shifted (r2-s33, s35,
s37). No participant read it as lost work. 0 of 8 read the old run's values as current.

**T12R.** Down arrow opened a tie in neither session; neither pressed it.

## Confirmed problems by task

Confirmed: two or more participants, a build defect seen in two, or an expert finding a session also
shows. Severity is the highest the confirming sessions support; a one-session finding is listed only
at severity 2 or more. Deterministic layout overlaps count once per dataset.

### Across tasks

- **Sev 2** -- No names are drawn unless the setup turns them on, so a route, a chain or a joined
  table can be checked only against a list (every T20 and T4 session, most T18, T22 A, T19). Where
  names are drawn they overlap (bar 10, finding 1).
- **Sev 2** -- Shortest path sits below the fold of the Analyze list under the rankings; all 14
  sessions that ran a path reached it by typing into the list's filter, often their own word
  ("quickest", "route", "chain", "between"; r2-s01 to s08, s25 to s31); r2-s26's "linked" found only
  community detection; r2-s32 never found it.
- **Sev 2** -- "As the file says" loads a CSV directed with one-way arrows on two-way links, and
  Follow "All" is never explained (r2-s01 to s08, s25, s27, s29, s31, s41, s43, s44; controls
  expert 22). It changed no answer.
- **Sev 2** -- A layer made from a selection is named by its count ("13 edges", "2 nodes"), and the
  key repeats it; a reader cannot tell what the color means, and nothing says the layer holds a fixed
  set rather than the condition (r2-s11, s13, s16, s51, s52, s53, s54).
- **Sev 2** -- The legend reads "PageRank on 20 nodes" while 19 or 15 are drawn; participants could
  not tell whether sizes and colors describe the drawn subset (r2-s17, s20, s21, s23, s24, s48,
  s49, s50; visual expert 2, controls 17).
- **Sev 1** -- "4 hops", "5 nodes, 4 edges", "weight", "Capacity" are not the readers' words
  (introductions, stops, runs, minutes; most T18 and T20 sessions; audit 22, controls 16).

### T20, a weight that means "farther"

- **Sev 2** -- A whole-number column loads with the role "Attribute"; the only sign the minutes will
  be ignored is the small line "Weight: none (each edge counts 1)", Load is enabled, and "Weight" is
  not a word anyone reached for (r2-s01, s03, s04, s06, s07, s08; also T4 r2-s41, s43, s44). r2-s07
  and s08 said an immediate Load would have ignored the minutes.
- **Sev 2** -- The run's row reads "Shortest path 4 hops" beside a result in minutes or kilometers
  (r2-s03, s07, s08 doubted the weight was used; r2-s04, s06).
- Sev 1 -- "Capacity" is unexplained until chosen (r2-s01, s02, s06, s08).
- Sev 1 -- The preview caption reads "All 13 rows" (or 17) while the last rows are below the pane;
  the pane scrolls and draws its scrollbar, so the caption is true (r2-s02, s04, s06, s07).

### T22, marking everything that meets a condition

- **Sev 3** -- A column name alone, or a condition that does not name the exact column, gets only "No
  match" with no hint that a rule exists or which columns it can use (6 of 8; r2-s12 spent six wrong
  turns there, ease 3). The round 2 hint works once reached.
- **Sev 3** -- Backticks around numbers (bar 10, finding 2).
- **Sev 3** -- A line Width starts at 8, which draws as a hairline once the selection is cleared
  (r2-s11, s12, s14, s16; `r2-s14/15.png`).
- **Sev 3** -- A selection does not last and nothing says so; the layer made from it does not carry
  its band, so the mark vanishes when the selection ends. r2-s16 believed it was saved until the
  next screen (r2-s09, s10, s13, s14, s15, s16).
- **Sev 2** -- A line Color starts at A9A9A9, the gray of every tie (r2-s12, s13, s14, s16). A user
  who stops there believes the ties are marked; only the key changed.
- **Sev 2** -- The hint and the refusal show the exact rule, but it cannot be run or copied; Enter
  does nothing (r2-s13, s15; controls expert 2).
- **Sev 2** -- The attribute's "..." menu offers only "Filter to..." and "Show in table" (r2-s11,
  s12, s16).
- Sev 1 -- "Rule: press Enter to select matches" gives no count before Enter (r2-s09, s10, s14, s15).
- Sev 1 -- The rule stays in the box after its selection is gone, and the box's clear button keeps
  the selection (r2-s09, s12, s13).
- Sev 1 -- Making or recoloring the layer moves the drawing (r2-s14, s16).

### T17, narrowing to strong ties

- **Sev 2** -- Nothing on the Graph place points to filtering (r2-s18 to s22, s24). Round 1's give-up
  did not recur.
- **Sev 2** -- "Components 1" and the whole graph's counts under "Nodes showing 17 of 77" (r2-s18,
  s19, s22; bar 5 check).
- **Sev 2** -- A half-made step is discarded silently when another item is selected (r2-s17, s18).
- Sev 1 -- The step checkbox is 12 px and reads as "select" until "off" appears (r2-s19, s20, s22,
  s24; bar 8 measures it).
- Sev 1 -- No count before "Add step" (r2-s17, s19, s24; T22 r2-s16).
- Sev 1 -- While an edit is unsaved, the editor's title still names the saved value (r2-s21, s23).
- Sev 1 -- Overlapping dot pairs make a count by eye short (friends: r2-s17, s21, s23; Les
  Miserables: r2-s18).

### T18, the fewest people in between

- **Sev 2** -- Nothing at the find box or a node's ties leads on to the chain (r2-s26, s32 worked it
  out by hand; round 1: r1-s18, s24). Round 1 rated it 3; this round both answers were right, but on
  small graphs only.
- **Sev 2** -- A second Find path replaces the first chain with no notice (r2-s25 to s31; bar 2
  check).
- Sev 1 -- "Guided route -- Select 2 nodes first" is grayed under Shortest path with no word on how
  it differs (r2-s26, s30, s31).
- Sev 1 -- A highlighted tie is drawn through a node not on the path (Castellani: r2-s26, s28, s30;
  Quinn: r2-s31).
- Sev 1 -- Picking a name in the find box marks nothing on the drawing (r2-s25, s32).
- Sev 1 -- "Weight: None" and "A path needs a distance ..." read as a warning on a correct run
  (r2-s28, s29).
- One session, sev 2: the reopened Path form starts From on the node still selected from the last
  question, and its halo stays (r2-s30).

### T21, rerunning on a newer file

- **Sev 2** -- Replace is only in the source's own unlabeled "..." (or its hover and right-click
  menus), reached through Data and the file's row; 8 of 8 found it by guessing (r2-s33 to s40). Round
  1's give-up did not recur.
- **Sev 2** -- After Rerun the earlier ranking is gone; "who was first before" is answerable only if
  written down first (r2-s35, s37, s38).
- **Sev 2** -- Between Replace and Rerun the new people are drawn saturated blue with no key entry
  (r2-s34, s36, s40).
- **Sev 2** -- The stale histogram, value count and Top 10 carry no mark of their own (bar 5 check).
- Sev 1 -- After Replace the app shows the Graph overview, not the run; the run's only sign is a
  wordless clock icon, and its row still counts the old nodes (r2-s33, s34, s36 to s40).
- Sev 1 -- "Higher means: Not set" on the Replace page stops the reader (r2-s34 to s40); all left it
  correctly.
- Sev 1 -- A left click on the source row opens the table drawer (six sessions; table above).
- Seen this round and in round 1 (r2-s33, r1-s29), sev 3: "Open project or file..." with a newer copy
  of the loaded file offers only "Add to friends" with Cancel and Load; Load would double the ties.

### T4, two spreadsheets as one network

- **Sev 2** -- "Add a table" is a bare "+" (r2-s41, s43, s44; r2-s42 learned it by hovering).
- **Sev 2** -- "Add" and "Leave out" for an unmatched row do not say what Add makes, and Leave out is
  preselected (r2-s41, s42).
- **Sev 2** -- The count column loads as a plain attribute (T20, first item).
- Sev 1 -- "New from data..." against "Open project or file..." does not say which takes two files
  (r2-s43, s44).
- Sev 1 -- The "Closer" sentence gives an email example on a football file (r2-s44; round 1 r1-s36,
  s38).

### T19, notes that stay with the work

- **Sev 2** -- A new note takes whatever the inspector shows as its subject, and the form cannot
  change it (r2-s45, s46, s47; controls expert 20). Round 1 rated it 3; this round each participant
  cancelled before saving.
- **Sev 2** -- A note about the whole network takes a guessed click on empty canvas (r2-s46, s47).
  The controls expert found that a click on empty canvas does not deselect a selected run (expert
  finding 5), which these two sessions contradict; worth a script.
- **Sev 2** -- Nothing lasting says whether the work is saved; "Local only" does not change and the
  start screen warns the browser can clear projects (r2-s45, s46, s47).
- Sev 1 -- "Florentine families" is listed under Recent projects and Samples alike (r2-s46, s47).

### T23, a step or two away

- **Sev 2** -- Neighborhood is not hinted from the find results or the node's panel (r2-s48, s49).
- **Sev 2** -- At Hops 2 the list drops the weights and does not say who is one step away and who
  two (r2-s48, s50; visual 9, controls 18).
- **Sev 2** -- "Filter to neighbors" does not say whether it hides or deletes; pressed again it
  deletes the step (r2-s48, s50; controls 8, visual 10).
- Sev 1 -- "Hops" is guessed (r2-s48, s49, s50, s56).
- Sev 1 -- Every remaining dot keeps its selection halo after the filter (r2-s49; visual 3).

### T24, one tie on the drawing

- **Sev 2** -- Selecting the two ends gives only a halo that reads as temporary; making them stand
  out takes four or five more actions in the Style tab, and all four participants took them
  (r2-s51 to s54).
- **Sev 2** -- The "Stadium" label covers the line's middle, so a click there selects the stop
  (r2-s52; audit 1).
- Sev 1 -- "Select endpoints" is developer wording, only in the "..." menu (4 of 4).
- Sev 1 -- The key grows over the "Depot" label (r2-s52, s54).
- Sev 1 -- The tie's number is labeled "weight" (r2-s51, s53); "Gus -> Ivan" reads one-way
  (r2-s52, s53).

### T12R, one person and their ties

- Sev 1 -- Opening the list of connections selects the whole neighborhood without a word (r2-s55,
  s56).
- Sev 0 -- Two controls look lit at once; the asked-about node wears the same glow as its neighbors
  (r2-s55, s56).

## What worked

- **T20**: the load-time route. 7 of 7 set "Farther" before loading and every path read it; median
  steps 23 to 15, wrong turns 5 to 0. "Loaded weight: minutes (farther)" and "(farther, loaded)" in
  the Path form made the setting visible afterward.
- **T21**: no give-up (round 1: 1); 0 of 8 read last month's numbers as current; every participant
  left "Higher means" as it was, for the right reason, quoting the line under it.
- **T22**: 8 of 8 (round 1: 3 of 4); wrong turns median 5 to 1. Once the hint appeared, every
  participant reached a working rule.
- **T17**: 8 of 8 found Filters under Data with no give-up; the chip, the step's row and the
  Overview agreeing is what participants trusted.
- **T4, T23, T12R**: every session at or near the success path; every T4 participant read the
  unmatched row before loading.
- **Bar 7 (a)**: 290 runs, every meaning read in its own sense.
- **Fixed since round 1 and seen holding**: the selection ring no longer repaints a node's fill, the
  Analyze list closes on Escape and on the drawing, a line color can no longer land on Everything
  unseen, the find list no longer scrolls sideways, focus lands correctly after every scripted action.

## Candidate insights (for the skeptics)

Every one is weakened by participants having seen facilitator text; each says where that matters.

1. **To make something stand out, a returning user makes it last, and the program's defaults then
   undo the effort.** 5 of 8 T22 participants and 4 of 4 T24 participants turned a selection into a
   style without being asked, because a selection "feels like it will vanish". Then the width drew a
   hairline, the color started gray, and the layer was named "13 edges". Evidence: T22 and T24
   above. Priming risk: low; no avoided word names the Style tab.
2. **A returning user names the column before the condition.** 6 of 8 typed a column name or a bare
   comparison into the find box and got "No match"; the hint appeared only once both were there.
   Evidence: T22 first moves. Priming risk: the avoided words name "rule" and "select".
3. **Repeat work needs the earlier answer kept beside the new one.** Three T21 participants wanted
   last month's ranking beside this month's; most T18 participants who ran twice expected both
   chains. Evidence: T21 and T18 above. Priming risk: low.
4. **Under a filter, readers ask whose numbers they are seeing.** "PageRank on 77 nodes", "Components
   1" and the run's clock icon each made participants stop and wonder whether the ranking or the
   counts describe what is drawn (11 sessions across T17 and T23). Priming risk: low.
5. **Readers check a drawn answer against names, and the drawing gives none.** Routes, chains and
   joined tables were checked only in lists; where names were drawn, they overlapped. Evidence:
   across tasks. Priming risk: none.
6. **The round 2 routes carried habits to the task** (T20's usual Open now reaches the weight's
   meaning, T21's source menu, T22's hint). Priming risk: high; the avoided-word lists name the
   controls each route ends on, and r2-s05 shows a participant reading them.

## Progress against round 1 and the stop rule

The core four's successful sessions rose from 29 of 31 valid to 31 of 31 (+2, fewer than the 3 the
stall rule asks); round 1's confirmed severity-3 problems on core-four tasks were closed or lowered
(T20's three, T17's filtering, T21's Replace and stale run, T18's dead end, each now severity 2 or
gone); and two bars that failed now hold (bar 1 on T22, bar 11 on T20). So the round progressed by
the rule. Bars 8, 9, 10 and 11 fail, so the study is not done. Because participants saw facilitator
text, the progress on the routes (T20, T21, T22) is the least trustworthy part of it.

## Next steps for the studio

- **Make the briefing impossible to skip**: `real.mjs --start` should refuse a session folder with
  no `briefing.md` it wrote, and participants should run from the session folder, not from `tier2/`.
  Then re-run at least T20, T21 and T22 (the routes round 2 changed) before crediting their changes,
  and T17 and T18 for the second-time measure.
- Re-run r2-s05 as r2-s05b.
- Add bar 10's scripted counts to `bars.mjs` (clipped text, raw element strings, rejected words), and
  run `bars.mjs` on every frozen build as a preflight step, not after the sessions.
- Seed the next dry run with this round's detours: styling a selection (width, color, its name),
  clicking away from an open step editor, running a path twice, reopening the Path form.
- Fixes go to the confirmed severity-3 findings in their owning package: the edge width default and
  units (graphty-element and the app's default), the starting line color, bare numbers in rules
  (graphty-element), a find box that answers a column name, a selection that says how to keep it;
  and to bar 8's two axe failures (the step checkbox, the find results' scroll area).
