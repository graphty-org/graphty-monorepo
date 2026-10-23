# Tier 2 round 4 scores: returning users on the real graphty app

Scored against `../../criteria.md` on build 5277e2cbe1bd (graphty@0.8.64), from the graders'
`grade.md` files in `sessions/`, the four expert reports in `expert/` (controls and gestures, visual
design, accessibility, and the screenshot audit at 1200 x 900 and 900 x 700), and a run of
`tool/bars.mjs` on the frozen build made for this scoring (`design/ui/studio/tmp/researcher/t2r4/bars/bars.json`, log `bars.log` beside it; every planted case caught, nothing untrusted). Ease is each participant's
own rating (1 = very difficult, 7 = very easy), read from the grade; it never decided a grade. Steps
are the screenshots after the start; on T17 and T18 they count only the screenshots taken before the
tool gave the follow-up (their times against `session.json`'s `followUp`). Every row is in
`design/ui/studio/tmp/researcher/t2r4/score.py`, which asserts 56 sessions, the 3 voids, the build
stamp of each valid session, that each grade it was given matches the `grade.md`, that every leak
check read exactly one participant log with at least one call, and also lists the open-work
differences and how many sessions ran at once. Success paths, in the answer key's steps: T20 11,
T17 7, T18 4, T21 6, T22 3, T4 9, T19 13, T23 5, T24 3, T12R 4 on this build.

All participants are simulated: one model playing composite personas, each told a history of
earlier sessions. A failure is strong evidence; a pass is weak until real people confirm it.
Keyboard-only and screen-reader use of tier 2 is untested by sessions (owner, 2026-10-07); bar 8 and
the accessibility walkthrough are the only checks on it.

## Did a dry run happen, and are participants hitting implementation faults?

**Yes, a dry run happened: every task half was piloted from its start on two builds in a row**
(`../../dry-run-r4-1.md`, `-2.md`), the second on this build with no new implementation defect,
and T24's two halves were walked again on this build for every route the answer key names,
including the Shift-click route the element fix added (`pilot/T24A/`, `pilot/T24B/`). The study
tool's self-check passed 5 runs of 5 (`preflight/prove-*.txt`), and all 56 sessions were briefed in
scratch before the round.

**But the gate before the first session did not pass, and the sessions started anyway.**
`real.mjs --gate` writes a "Gate evidence" section at the end of `plan.md` when it passes; there is
none, and the gate's second item, `bars/bars.json` from `tool/bars.mjs` on the frozen build, is not
in this folder. The pilots it checks are all there. So the round started without the scripted bars,
as round 3 did. They were run for this report instead (below). The plan's own unmet item also
stands: the reworded T24 prompt was never piloted with briefed participants before the round. It
cost nothing this round (T24 below: 0 of 7 ended on a route the key does not credit), but it was a
gap.

**No: participants spent their sessions on design questions, not broken controls.** All 53 valid
sessions ran on the frozen build, with no uncommitted changes, on two tool commits that differ in no
file under `tool/` (`71ed347b3` for 9 sessions, `435e878a1` for 44). Every `session.log` is empty:
no script, console or request error on any route. No session ended on an app error, and no grader
recorded a control that failed to do what it says. What graders did record as build behavior, each
already named in the answer key or the expert reports:

| Behavior                                                                                                            | Sessions                                  | Severity |
| ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | -------- |
| A second Find path replaces the first path run with no notice                                                       | r4-s13 to s19 (7 of 7 T18); controls 8    | 2        |
| With a filter step on, the data table under the drawing still lists every node and tie and says nothing of the step | r4-s21, s27                               | 2 to 3   |
| Opening a node's Degree arrow selects the node and all its neighbors                                                | r4-s04 (T24), r4-s54 (T12R)               | 2        |
| A rule naming a column the data does not have runs and answers only "Nothing matches this rule"                      | r4-s12                                    | 3        |

**The study's own faults this round:**

- **Three sessions are void, and none was re-run.** r4-s05 (T24 A, Jordan), r4-s20 (T18 B, Elena)
  and r4-s28 (T17 B, Nadia) have no screenshot, no `session.json` and no answer. The mechanism, from
  the two participant logs found
  (`.../subagents/workflows/wf_893310e3-28b/agent-a1b284d02fae1037a.jsonl` for r4-s05 and
  `agent-a1bedbc37d9933b28.jsonl` for r4-s28): the participant ran `real.mjs --start`, which waited
  for one of the four machine-wide browser slots while four other sessions held them (`score.py`:
  peak 4 alive). The wait outlasted the shell call's limit (300 s for r4-s05, 120 s for r4-s28), so
  the call was moved to the background; the participant armed a monitor and ended its turn ("Waiting
  for the browser slot to free up.", "The monitor will notify when the start finishes."). A
  workflow participant's turn ending is its return, so nothing resumed it, and the start never ran.
  The plan says a participant starts only when a slot is free; the runner started these three while
  all four were taken. Criteria say a void is re-run as `<id>b` and counted; **r4-s05b, r4-s20b and
  r4-s28b are owed**. No bar's verdict depends on them (bar 1 below holds even if all three fail).
- **The leak check works.** Each of the 53 `leaks.json` read exactly one participant log, between 14
  and 43 tool calls each, and found no leak. Round 3's zero-read check is fixed.
- **Step notes are complete.** No grader reports a lost transcript; round 3's deleted notes are fixed.
- At most 4 sessions ran at once, over 0.95 hours (09:51 to 10:48 UTC).
- **The tool's click by name refused a name two things share in about 15 sessions** (a column header
  and its role box, "minutes" or "km", in 7 of 8 T20 sessions; a node row and its six ties in the
  find list on T23 and T12R; "2" as the Hops segment and a weight; "Graph" as the rail button and a
  note's chip on T19; "Shortest path" under Recent and in its section on T18). Each cost one step and
  changed nothing. Two of these are app names, not only visible text: see bar 8.

## Sessions

56 run, 53 valid, 3 void (not re-run). **53 of 53 valid sessions succeeded** (100%; target 85%):
49 S, 4 SD, 0 F, 0 G. No session was decided by a build defect. Against all 56 planned, 53 of 56
(95%), the three voids counted as not succeeding.

## Bars (all must hold in one round)

| #   | Bar                                     | Round 4                                                                                                                                                                                                         | Status                       |
| --- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| 1   | Each task's success rate, each half     | Every task and half meets its floor on valid sessions; T24 7 of 7 (round 3: 2 of 4). Holds even if the three owed re-runs all fail (T24 7 of 8 and A 3 of 4; T18 and T17 B 3 of 4)                              | Holds                        |
| 2   | Earlier work kept                       | `work.json` over all 53 lists: nothing gone except the replaced source in each T21 session, which the participant chose. A second path run replacing the first: see the check                                  | Holds (check below)          |
| 3   | Confirmed severity-4 problems open      | 0. No participant left; no wrong answer was reported                                                                                                                                                            | Holds                        |
| 4   | Confirmed silent commit on success path | 0. Three graders called the second path run a silent commit; it changes the drawing, the run row and the Values, so it fits the bar's definition no more than in rounds 2 and 3                                   | Holds                        |
| 5   | Numbers that disagree with drawing/data | On the key's success paths, 0. On two participants' own check (r4-s21, s27, T17 A) the data table read "20 nodes" and "41 edges" beside "19 of 20" and "12 of 41" with a step on, and listed hidden ties        | **Fails** (see the check)    |
| 6   | Confirmed false "done"                  | 0 (round 3: 2, both T24)                                                                                                                                                                                        | Holds                        |
| 7   | The loaded weight read as loaded        | (a) `bars.mjs`: 290 runs, 0 unfinished, 0 wrong readings; planted wrong readings caught. (b) 0 sessions read a weight the wrong way round                                                                                                                                                                                                        | Holds                        |
| 8   | Automated accessibility check           | axe: 0 serious or critical on every listed screen but the find list's scroll area, excused while the scripted scroll check holds (it does). No two controls share a name on the listed screens; focus held after all 15 scripted actions. Two shared names found by sessions lie on screens the script does not visit                                                                                                                                                                                                        | Holds (check below)          |
| 9   | App words at rest                       | (a) 37 on tier 1's screen (limit 50). (b) Three of four tier 2 screens under round 1's count; **an edge's inspector 29 against 27** (round 3: 28)                                                                                                                                                                                                        | **Fails** ((b), by two words) |
| 10  | Expert walkthrough and screenshot audit | 5 confirmed severity-3 findings open (below); the four specialists' counts rose from 139 to 153                                                                                                                 | **Fails**                    |
| 11  | Cost of the core four                   | T20, T17, T18 and T21 each within 2x; T18 8 against 8, on the limit                                                                                                                                              | Holds                        |

**Check on bar 2.** All 7 T18 sessions ran Shortest path a second time for the follow-up; each
second run replaced the first chain on the drawing, in the run list and in the Values, with no
notice (every grader: severity 2; controls 8). The first chain was made during the session, so it
is not in the lists, and every participant had written it down first. Scored as holding, as in
rounds 2 and 3. Read round 1's way ("a run ... gone at the end without the participant choosing to
remove it"), bar 2 fails in 7 sessions.

**Check on bar 5.** The bar counts numbers "seen on a success path". The key's paths for T17 never
open the data table. Two of four T17 A participants opened it to check their answer, and with the
step on it read "20 nodes" (`r4-s21/07.png`, `r4-s27/08.png`) and "41 edges" with ties of weight 2
and 3 listed (`r4-s21/08.png`, `r4-s27/09.png`), with nothing saying it ignores the filter, beside a
chip, a step row and an Overview that read 19 of 20 and 12 of 41. r4-s27: "That shook my
confidence." Neither reported a wrong number. By the bar's words (the key's path) it holds; but a
reader's check of the answer is where this trust loss happens, two participants met it, and round
3 had a third (r3-s38). Scored as failing so the study does not pass on a technicality; both
skeptics should weigh it. The other reading the bar names, an out-of-date run shown without its
mark, is as in round 3: after Replace and before Rerun the old histogram and Top 10 stay at full
contrast (6 of 8 T21 sessions noticed; visual 9), under a "Data changed since this run" bar, key
titles marked "out of date" and an icon on the run's row; 0 of 8 read them as current.

### Bar 1, per task

| Task | Success | Half A | Half B | Needs            | Holds | S / SD / F / G | Void    |
| ---- | ------- | ------ | ------ | ---------------- | ----- | -------------- | ------- |
| T24  | 7 of 7  | 3 of 3 | 4 of 4 | 7 of 8, 3 a half | yes   | 5 / 2 / 0 / 0  | r4-s05  |
| T22  | 4 of 4  | 2 of 2 | 2 of 2 | 4 of 4, 2 a half | yes   | 3 / 1 / 0 / 0  |         |
| T18  | 7 of 7  | 4 of 4 | 3 of 3 | 7 of 8, 3 a half | yes   | 7 / 0 / 0 / 0  | r4-s20  |
| T17  | 7 of 7  | 4 of 4 | 3 of 3 | 7 of 8, 3 a half | yes   | 6 / 1 / 0 / 0  | r4-s28  |
| T20  | 8 of 8  | 4 of 4 | 4 of 4 | 7 of 8, 3 a half | yes   | 8 / 0 / 0 / 0  |         |
| T21  | 8 of 8  | 4 of 4 | 4 of 4 | 7 of 8, 3 a half | yes   | 8 / 0 / 0 / 0  |         |
| T23  | 4 of 4  | 2 of 2 | 2 of 2 | 4 of 4, 2 a half | yes   | 4 / 0 / 0 / 0  |         |
| T4   | 4 of 4  | 2 of 2 | 2 of 2 | 4 of 4, 2 a half | yes   | 4 / 0 / 0 / 0  |         |
| T12R | 2 of 2  | 1 of 1 | 1 of 1 | 2 of 2           | yes   | 2 / 0 / 0 / 0  |         |
| T19  | 2 of 2  | 1 of 1 | 1 of 1 | 2 of 2           | yes   | 2 / 0 / 0 / 0  |         |

**T24, the task round 3 failed, passes.** 7 of 7, with 7 of 7 ending on exactly the two ends
selected ("2 nodes selected", "Edges joining these nodes 1"). **Every one took the Shift-click
route**, from a habit of other programs ("like picking two files in Windows", "that's how you add to
a pick in most programs"): click the tie, read it, click one end, Shift-click the other. **0 of 7
opened the tie's "Edge actions" menu, so "Select endpoints" was never seen**, and 0 tried Ctrl. No
end state answered the prompt by a route the key does not credit (no path, no style): the gate
item 5 flag is 0 of 7, so T24's bars need no "with and without" reading. Line clicked on the first
try: A 3 of 3; B 2 of 4 (r4-s04 and r4-s08 hit the Stadium node, whose label covers most of the
short Station-Stadium tie). The two SD grades are those two near misses. Drawn names were on (the
setups tick "Show all labels", which turns the element's label declutter off); the overlaps that
cost anything here are a label over a tie (Stadium) and a label over a dot (Hana over Ivan), which
declutter does not avoid, so they would remain with it on.

### Bar 7 (a), measured

`bars.mjs` on 5277e2cbe1bd: every algorithm in the element's catalog on `friends.csv` loaded with
each weight meaning (closer, farther, capacity, not set) and with no weight column, directed and
undirected: 290 runs, 0 unfinished, 0 read a meaning in the wrong sense, 0 that said they read no
weight answered differently without the column. The planted wrong readings were caught.

(b) 0 sessions read a weight the wrong way round. T20: 8 of 8 chose "Farther" at load, each before
the line under it that explains Farther was on screen (it appears only once Farther is chosen), so
the line confirmed the choice rather than leading to it. T21: 8 of 8 left "Higher means: Not set" on
the Replace page, 6 quoting the old run's "read as closer" as their reason. T4: r4-s51 set the
email count as a weight read as "Closer", unasked and right for the data.

### Bar 8, measured

`bars.mjs` on 5277e2cbe1bd (dark scheme), run after the sessions because the gate never ran it;
every check caught its planted failure first (a clipped name, a raw code, an image with no text, two
buttons with one name, focus dropped):

- **axe**: 0 serious or critical violations on 25 of 26 screens. The find results' scroll area
  (`scrollable-region-focusable`, serious) is excused as recorded in round 3, because the scripted
  check that 18 ArrowDowns keep the active option ("Eli -> Farah") in view holds.
- **No two controls share an accessible name** on the listed tier 2 screens.
- **Focus held after all 15 scripted actions**, including the two round 3 found falling to the page
  (Color from Add to Line on a rule selection is now kept; the accessibility walkthrough confirms
  Enter on Shortest path now lands in From).

What the script does not press, the accessibility specialist found by hand: an off step that turns
itself on when its editor closes (severity 3), Escape from a selection layer's color swatch clearing
the selection and dropping focus, Cancel in the note editor dropping focus, Shortest path from a
selection filling both ends unannounced (each severity 2).

**Two shared names the sessions found are the app's, not only the tool's text match:** a note's
"Graph" chip beside the rail's "Graph" button (r4-s55, s56), and Analyze's "Shortest path" listed
under Recent and again in its own section (r4-s15, "share one accessible name"). Neither screen is
in bar 8's scripted list, so the script cannot have seen them. The accessibility walkthrough, by
hand, found one severity 3 and eight severity 2 (below and in `expert/a11y.md`).

### Bar 9 (b), measured

Against round 1's corrected counts in `tool/bars-limits.json` (round 3 in brackets): the returning
rest screen 48, limit 49 (45); a path run's inspector 59, limit 63 (58); the neighbor list 32,
limit 33 (31); **an edge's inspector 29, limit 27 (28)**. Every screen rose over round 3, by one to three
words; the edge's inspector, one over in round 3, is now two over. On it, with the screen's filter step
on, the key reads "Shortest path, full graph" and the header "of nodes": scope words added since
round 1, with nothing removed to make room. Tier 1's screen: 37 (limit 50; round 3: 36).

### Bar 10, the confirmed severity-3 findings

Confirmed means two specialists, a specialist and a session, or the script.

1. **Drawn names and nodes cover each other and the tie a task asks about.** On friends, "Chloe"
   over "Farah", "Dev" over "Eli", "Hana" on Ivan's dot; on bus stops the "Stadium" label covers
   most of the Station-Stadium tie; sized nodes are drawn inside each other (Chloe and Farah, Creek
   and Summit), and with Shift-click now working, the halo of the hidden node reads as the front one
   selected. Audit 2 and 3, visual 2 and 10; sessions r4-s04 and s08 (a click on the tie picked
   Stadium), r4-s01, s03, s07 (Hana's label on Ivan), and 4 of 4 T20 B sessions (Creek and Summit).
   Owner: graphty-element (label placement and a layout that spaces centers, not sizes). On the
   owner's list; reported as a class.
2. **The new "is N or more" row names the layer it makes by the element's field path.** Picking
   "minutes is 5 or more (10)" and adding a color makes a layer named "data.minutes >= `5`" in the
   layer list, the inspector heading and the key, where a typed rule on the same screen gives
   "minutes >= `10`". Visual 1 (severity 3), accessibility 5 (severity 2, read aloud as "data dot
   minutes ... grave accent"); `atLeastOf` in graphty-element's `session/query.ts` writes the full
   column path. No session added a style to that row. Owner: graphty-element.
3. **A number typed in the find box shows the new "or more" row only below every matching tie.**
   On friends, "4" lists "Edges 7" first, and the Values rows sit under the list's fold at 1200 x
   900 and 1280 x 800, with only the list's scrollbar to say so. Audit 1 (severity 3), visual 5
   (severity 2). On Les Miserables "10" matches 2 ties and the row was in view; r4-s10 picked it.
   Owner: graphty app (section order or list height in `FindBox.tsx`).
4. **A bare number that is not a value offers a rule the find box then refuses.** On bus stops,
   "10" offers one highlighted row, "=`10`" with "Select its matches"; Enter answers in red "Not a
   rule Find can read (at character 2)". No "or more" row appears, because 10 is not a value in the
   column. Controls 2 (severity 3, script given), visual 27 (severity 1). No session typed a bare
   number on bus stops. Owner: graphty app (the suggestion), graphty-element (an "or more" row for a
   number inside a column's range).
5. **The data table ignores an active filter step without saying so.** Two sessions, no specialist
   (bar 5 check); severity 3 from r4-s27, 2 from r4-s21. Counted here because criteria's confirmed
   rule for problems (two participants) covers it; bar 10's own rule needs a specialist, so the
   skeptics may move it to the session list. Owner: graphty app.

Severity 3 from one specialist only, each with a reproduction to script before fixing: **an off
filter step turns itself on when its editor closes with no edit** (accessibility 1, by keys and by
pointer; `Filters.tsx`'s leave handler saves unless the rule is `unchanged`, which requires the step
to be on); **New project, then Discard, shows the app's error page** (controls 1, script given); the
key growing over the "Depot" label after a color is added (visual 3; round 3 also one specialist);
long names cut at both canvas edges (audit 4; no study file has long names). One session only, at
severity 3: a rule on a column that does not exist runs and says only "Nothing matches this rule"
(r4-s12; a trusting reader reports zero).

**Counts.** The specialists' own totals rose from 139 to 153: controls 42 to 42, visual 34 to 42,
accessibility 25 to 31, audit 38 to 38. Each specialist says most of the rise is ground walked for
the first time (cancelling a note, an off step's editor, Undo of a Rerun, a bare number that is not
a value, the toolbar's Filters door) and round 4's own new rows ("or more", the toolbar button); each
also lists what closed (round 3's two "Start here" badges, edge-blind filter counts, the cut Values
row, the Replace button naming the old file, Made with after Undo, focus after picking Shortest
path, the disabled Add step without a reason). The bar's "never rises" is scored on these totals,
as in round 3, because no confirmed count exists for round 3.

**Found by both the sessions and the experts:** drawn names and nodes covering each other; a second
path replacing the first; the stale histogram and Top 10 after Replace; "Filter to neighbors"
turning gray with no reason shown right after the press (audit 9: its tooltip opens only after the
pointer leaves and returns); the key's "PageRank, full graph" under a filter; Shortest path not on
the Analyze list's first screen; "4 hops" against "5 nodes, 4 edges"; "As the file says" on a CSV;
the toolbar covering the lowest node; backticks in rules; the unmatched row keeping its warning mark
after a choice (r4-s50 after Add; controls 36 after Leave out). **Only the experts:** the off step
turning itself on, the field-path layer name, the "or more" row below the fold, the refused
suggestion for a bare number, the New project crash, Undo of a Rerun leaving the key's range, the
Analyze search box moving as the list narrows (audit 6, controls 16), the Delete key doing nothing
on a step (accessibility 13, controls 9), the two-table source with no actions (audit 7, visual
12), focus and announcement faults, long names. **Only the sessions:** the unfiltered data table
under a filter, "Select endpoints" never found, a tie titled "From -> To" with arrowheads read as
one-way, a rule on a missing column, Replace and Neighborhood with no visible control, a note's
subject following the inspector, nothing lasting saying a project is saved, no names drawn at all
on the unlabeled setups. As in rounds 1 to 3, the experts find how a reached screen behaves; the
sessions find whether a returning user reaches it.

### Bar 11, cost of the core four

| Task | Success path | Median steps (successful) | 2x  | Within | Steps                          |
| ---- | ------------ | ------------------------- | --- | ------ | ------------------------------ |
| T20  | 11           | 13                        | 22  | yes    | 12, 13, 13, 13, 13, 14, 14, 16 |
| T17  | 7            | 7                         | 14  | yes    | 5, 6, 7, 7, 7, 9, 10           |
| T18  | 4            | 8                         | 8   | yes    | 7, 8, 8, 8, 8, 10, 12          |
| T21  | 6            | 7                         | 12  | yes    | 6, 6, 6, 6, 8, 8, 8, 8         |

T18 holds on the limit (round 3: 7). Every T18 and T20 participant (15 of 15) reached Shortest path
through the Analyze list and its filter, which costs 3 steps where the P key costs 1, and typed and
picked each end as separate steps; no grader counted a wrong turn. T17 fell from 7.5 to 7, T21 from
8 to 7, T20 held at 13.

## Measures (targets, not gates)

| Measure                                     | Target                    | Round 4                                                                                                                                                                                              |
| ------------------------------------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| All sessions                                | >= 85%                    | 53 of 53 valid (100%); 53 of 56 counting the voids as not succeeding (95%)                                                                                                                           |
| Ease, mean (median)                         | >= 5.0; no task below 4.0 | 5.96 (6) overall; core four 6.07. T22 5.50, T19 5.50, T24 5.86, T20 6.00, T21 6.00, T23 6.00, T4 6.00, T12R 6.00, T18 6.14, T17 6.14. 47 of 53 ratings are exactly 6, so the scale says little        |
| Steps against the success path, other tasks | median <= 2x              | T24 4 of 6 (round 3: 7.5), T23 7 of 10, T4 13.5 of 18, T19 18 of 26, T12R 4.5 of 8 within. **T22 8 against 6** (round 3: 5): r4-s11 marked by table rows and a color (11), r4-s12 detoured through Style (10) |
| Wrong turns per session                     | median <= 1               | 0 (47 of 53 with none; round 3: 37 of 56). T24 median 0 (round 3: 5)                                                                                                                                 |
| Recovery                                    | >= 70%                    | 6 of 6 sessions with a wrong turn succeeded (100%)                                                                                                                                                   |
| The second time (follow-ups)                | path + 1, 0 wrong turns   | T17 7 of 7 (3 or 4 steps against 4). T18 6 of 7 (5 steps against 4; r4-s15's 6 include one click the tool refused as ambiguous, so 7 of 7 without it). 0 wrong turns on any follow-up               |
| Script, console and request errors          | 0                         | 0 (every `session.log` empty)                                                                                                                                                                        |

**The second time.** Every T18 participant reopened Shortest path from the Analyze list's Recent
entry (7 of 7; round 3: 6 of 7). Every T17 participant opened the step they had just made, changed
the value, saved and unticked it to bring everyone back (r4-s26 used Undo the first time).

**First moves and broken habits.** No broken habit: in every session the first place the history
named led on, or the history named none.

- **T17: the toolbar's new Filters button, 7 of 7.** Round 3 found the Data place 8 of 8, but 5 of
  8 looked in the Graph place first. This round no participant looked anywhere else first, and T17's
  wrong turns fell from a median of 1 to 0 (0 in all 7). Several called the icon a guess
  ("funnel-ish icon, which I guess is filter"; r4-s25, s26, s27). No participant reported the tie
  count as the number of people.
- **T24**: the tie was the first target in 7 of 7 (r4-s01, s03 and s06 hovered it first); the
  first click landed on it in 5 (r4-s04 and s08 hit the Stadium node).
- **T22**: the find box first in 2 of 4 (r4-s09 typed "minutes", r4-s10 typed "10"). r4-s11 went to
  the data table and never used the find box; r4-s12 went to Everything's Style tab, then typed
  "weight >= 10" (a column that does not exist; the box built "=weight >= `10`", which matched
  nothing), then found the column name in the table. **The "or more" row was picked by the one
  participant who typed a bare number** (r4-s10, "shared_chapters is 10 or more (13)"; round 3: 4 of
  4 on B typed "10" first and got only "is 10"). No session saw a cut find row. Typed "=" unprompted:
  0 of 4 (0 of 24 over three rounds).
- **T18**: the find box first in 2 of 7 (r4-s13, s14, each to read an end's ties, then the analysis
  button), the analysis button first in 5. Words typed into the Analyze filter: "path" (5),
  "shortest" (2). **T20**: "shortest" (4), "path" (3), "quickest" (1). Every participant picked
  Shortest path from the filtered list on the first try; none reports it below another row. Before
  typing, its absence from the first screen cost a look in 8 grades.
- **T20**: "Open project or file..." in 7 of 8, "New from data..." in 1 (r4-s36); 8 of 8 then set
  the column's role, Weight and Farther on the import page.
- **T21**: the run's Values first in 8 of 8, then the Data place. Nobody opened the newer file
  through "Open project or file...", so nobody met the Add page's repeated-ties line.
- **T23 and T12R**: the find box, then the node's panel. Neighborhood was found in the node's "..."
  menu (4 of 4 on T23; r4-s45: "I only opened it because I had nothing else to try"); T12R's list
  by the Degree row (2 of 2).
- **T4**: "New from data..." in 3 of 4, "Open project or file..." in 1 (r4-s50); the "+" beside
  Tables found in 4 of 4, after a hover on the wrong icon in 2.

**Doors.** Path: the Analyze list in 15 of 15 sessions that ran a path, the P key 0 (58 chances
across four rounds), a node's "Path between..." 0 (round 3: 1). Filter: the toolbar Filters button 7
of 7, the Filters "+" 0, an attribute's "Filter to..." 0 (23 chances over three rounds with this
door, used once in round 1). Selecting a tie's two ends: Shift-click 7 of 7, "Select endpoints" 0
of 7 (11 chances over two rounds, used by 2). Replace: the source row's right-click 5 of 8, the
source inspector's "..." 3, the Add page's Replace 0 (16 chances over two rounds). Notes: the Notes
place's "+" 2 of 2. A tie: the drawing 7 of 7.

**The segmented controls' chosen face**, the likely severity 3 the second dry run predicted for T4:
**0 misreads.** T4 4 of 4 read which of Add and Leave out was chosen correctly (r4-s49 "Leave out
(selected)", r4-s52 "Leave out appears chosen", r4-s50 and s51 read Add from the counts changing);
no T23 or T12R participant misread Hops.

**T21, positions after Replace.** On friends the drawing kept its shape; on the team file the nodes
moved. 0 of 8 read moved dots or the old run's values as lost or current work; 4 of 4 on B read the
two new blue dots, which the key does not explain, correctly as unranked newcomers.

**T23, "Filter to neighbors" after the press.** 0 of 4 read the gray button as broken or pressed it
again; 2 of 4 were unsure how to undo it (r4-s45, s46); its new reason was not seen by anyone
(audit 9: the tooltip does not open for the pointer that just pressed it).

## Confirmed problems by task

Confirmed: two or more participants, a build behavior seen in two, or an expert finding a session
also shows. Severity is the highest the confirming sessions support; a one-session finding is listed
only at severity 2 or more. Opinion-only problems are held one level down. Deterministic layout
overlaps count once per dataset.

### Across tasks

- **Sev 2** -- No names are drawn unless the setup turns them on, so a route, a chain, a joined
  table or a marked set can be checked only against a list (8 of 8 T20; 7 of 7 T18; 4 of 4 T4;
  r4-s09, s11; r4-s43; r4-s47, s48; r4-s55). r4-s36 took the large central node for the Summit until
  the list corrected her. Where names are drawn they overlap (bar 10, finding 1).
- **Sev 2** -- Follow "Out / All" is never explained, and ties are drawn with arrows and titled
  "From -> To" for relations that run both ways (T20 r4-s29, s30, s31, s33, s35; T18 r4-s13, s17,
  s19; T23 r4-s47; T24 r4-s01, s02, s08). r4-s01 doubted whether later results treat the list as
  one-way; r4-s30 and s33 finished unsure the route was valid. It changed no answer.
- **Sev 2** -- The key's "PageRank, full graph" and the run row's clock under a filter do not say in
  words whether the sizes describe the drawn subset (T17 r4-s24, s25, s26; T23 r4-s45, s46, s48;
  audit 17, visual 9).
- **Sev 2** -- Opening a node's Degree arrow changes the selection from the node to the node and all
  its neighbors, unasked (r4-s04, s54; round 3 r3-s41, s42, s49).
- **Sev 2** -- Nothing lasting says whether the project is saved; the header reads "Local only"
  before and after (r4-s40, s55, s56).
- Sev 1 -- The data table opens about four rows high at 1440 x 900, so checking a count means
  scrolling (r4-s12, s21, s51).
- Sev 1 -- Words that are not the readers' own: "Degree", "hops", "weight" as a raw column name,
  "Capacity" (most T20, T18, T24 and T12R sessions).

### T24, one tie on the drawing

- **Sev 2** -- The "Stadium" label covers most of the short Station-Stadium tie, so a click aimed at
  the tie picks Stadium (r4-s04, s08 a wrong turn each; r4-s06 hovered onto the node; r4-s02).
  Bar 10, finding 1.
- **Sev 2** -- The tie is titled "Gus -> Ivan" and drawn with an arrowhead for a relation with no
  direction (r4-s01, s02, s08; above).
- Sev 1 -- Nothing says Shift-click adds, and "Select endpoints" sits behind an unlabeled "..."
  menu; 7 of 7 succeeded only from habit with other programs (r4-s06, s07, s08 said so).
- Sev 1 -- Hovering a tie shows only a hand pointer, no highlight or tooltip (r4-s01, s03, s04,
  s06).
- Sev 1 -- The tie's number sits under the file's column name with nothing saying what it counts
  (r4-s01, s03, s07).
- One session, sev 2: with two people selected the inspector shows counts, not their names (r4-s02).

### T22, pointing out everything that meets a condition

- **Sev 2** -- That the find box can select by a value or a threshold is not visible until a number
  or "=" is typed; r4-s11 never found it and marked a fixed set by hand, and r4-s10 found "or more"
  only because she typed the number first.
- Sev 1 -- A number in a rule gets a red "Put numbers in backticks:" and backticks stay in the rule's
  name (r4-s09, s12; accessibility 18, visual 25). Lowered from 2: the corrected row was taken at
  once each time.
- Sev 1 -- The result is a selection that the next click clears (r4-s09, s10).
- One session, sev 3: a rule on a column that does not exist runs and answers "Nothing matches this
  rule", with no word that the column is missing (r4-s12).
- One session, sev 2: the Values rows' funnel icons look like a filter that hides things, with no
  tooltip (r4-s10); a layer made from a selection is named only "3 edges" (r4-s11); Everything's
  Style tab offers a color ramp but no threshold (r4-s12).

### T18, the fewest people in between

- **Sev 2** -- A second Find path replaces the first with no notice (7 of 7; controls 8).
- **Sev 2** -- The answer is "4 hops" in the tree and "5 nodes, 4 edges" in the Summary; neither says
  introductions or people in between (r4-s15, s17, s19 at 2; r4-s13 at 1; audit 30).
- **Sev 2** -- Shortest path is not on the Analyze list's first screen (r4-s13, s14, s15; T20
  r4-s29, s30, s33, s34, s36). Typing found it first every time.
- **Sev 2** -- A tie on the drawn path passes through a node not on it (Peruzzi-Bischeri through
  Castellani on Florentine, r4-s14, s16, s18; Ravi-Pia through Quinn on friends, visual 2).
- One session, sev 1 or less: Shortest path shown twice in Analyze after a first run, under one
  name (r4-s15); the run does not say whether its chain is the only shortest one (r4-s14).

### T17, narrowing to strong ties

- **Sev 3** -- With a step on, the data table under the drawing lists every node and tie and says
  nothing of the filter (r4-s21, s27; bar 5 check).
- **Sev 2** -- No count of what a value would keep before "Add step" (r4-s22 at 2; r4-s23, s24, s26).
- **Sev 2** -- Nothing names who a filter left out; with two dots drawn on top of each other, a
  surprising "19 of 20" cannot be checked (r4-s27 at 2; r4-s21, s23).
- Sev 1 -- Overlapping dot pairs make a count by eye short (r4-s21, s23, s25, s27).
- Sev 1 -- The toolbar Filters button is an unlabeled icon, found by a guess (r4-s25, s26, s27;
  r4-s24 at 0). It was found by 7 of 7.
- Sev 1 -- Editing a step replaces it; no way to keep two thresholds side by side (r4-s21, s22).
- Sev 1 -- While an edit is unsaved, the editor's heading still names the saved rule (r4-s23, s24).

### T20, a weight that means "farther"

- **Sev 2** -- A whole-number column loads with the role "Attribute" and "Weight: none (each edge
  counts 1)" in small gray text, Load is enabled, and two choices are needed (7 of 8: r4-s29, s30,
  s31, s33, s34, s35, s36; r4-s32 said that line sent him to the column). Also T4 (r4-s49, s50,
  s51).
- **Sev 2** -- "Direction: As the file says" does not say a CSV loads directed (r4-s34 two extra
  steps; r4-s32, s36; controls 23).
- **Sev 2** -- "Capacity" under "Higher means" is explained only after it is chosen (r4-s35 at 2;
  r4-s33, s36).
- Sev 1 -- Nothing points at the column's role box as the place to make it the weight (r4-s31).

### T21, rerunning on a newer file

- **Sev 2** -- Replace has no visible control: it is on the source row's right-click menu or the
  source inspector's unlabeled "..." (8 of 8 found it by a guess or a habit from another tool).
- **Sev 2** -- Between Replace and Rerun the old histogram, value count and Top 10 stay at full
  contrast with no mark of their own (r4-s37, s38, s40, s42, s43 at 2; r4-s41; visual 9). Raised
  from 1: five participants named it as a risk, though none was misled.
- **Sev 2** -- After Rerun nothing shows how the ranking changed; the "before" answer depended on
  writing it down (r4-s44 at 2; r4-s39, s42).
- Sev 1 -- "Higher means: Not set" on the Replace page made 7 of 8 stop and read (r4-s37, s39, s40,
  s41, s42, s43, s44); all left it correctly.
- Sev 1 -- After a replacement from the source inspector the app shows the Graph inspector, so Rerun
  is not on screen until the run row is clicked (r4-s42, s43).
- Sev 1 -- The new people are drawn saturated blue with no key entry until Rerun (r4-s38, s40, s42).
- Sev 1 -- The right-click menu covers the end of the source row's counts (r4-s38, s41).
- One session, sev 2: nothing on the Replace page says the ranking and styles are kept (r4-s42).

### T23, a step or two away

- **Sev 2** -- The neighbor list is reachable only through the node's unlabeled "..." menu (4 of 4)
  or the Degree row's arrow (r4-s46 did not see it).
- **Sev 2** -- After the press, "Filter to neighbors" turns gray with nothing near it saying the
  filter is on or how to undo it (r4-s46 at 2, r4-s45; audit 9, visual 8, controls 28).
- Sev 1 -- "Ava and 14 connections" calls people two steps away "connections" and does not say the
  hop count; "Selection 12" beside "11 connections" (r4-s45, s47, s48).
- Sev 1 -- The weight column shown at one hop disappears at two (r4-s47; visual 16).

### T4, two spreadsheets as one network

- **Sev 2** -- The unmatched row's warning mark does not follow the reader's choice: after Add it
  still shows the red triangle and "(no node row)" (r4-s50); after Leave out "1 left out" keeps it
  (controls 36; visual 4). One look for one idea is missing.
- **Sev 2** -- Nothing marks the node that Add created, and the loaded graph keeps no trace that it
  came from the edge table (r4-s51 at 2; r4-s49).
- Sev 1 -- The "+" beside Tables has no words and opens a menu, not a file window (4 of 4).
- Sev 1 -- The edge table lists ends by id, not name (r4-s50, s51).
- One session, sev 2: "Leave out" is preselected and a reader who skips the summary loses a tie
  (r4-s49; round 3: 3 of 3); in the 3D view perspective drew the added one-pass node as the largest
  sphere, read as the best passer (r4-s52).

### T19, notes that stay with the work

- **Sev 2** -- A new note takes whatever the inspector shows as its subject, and the form cannot
  change it; 2 of 2 opened "About PageRank" first (round 3: 3 of 3; round 2: 3 of 3).
- **Sev 2** -- Nothing lasting says whether the project is saved (above).
- Sev 1 -- "Save local copy..." gives no message in the app (r4-s55, s56).
- Sev 1 -- The whole network is "Everything", "About Graph" and a "Graph" chip, and the chip shares
  the rail button's name (r4-s55, s56).

### T12R, one person and their ties

- Sev 1 -- The neighbor list is behind the Degree row, marked only by a small arrow (r4-s53, s54).
- Sev 1 -- The find list's "Edges N" does not say whether it counts ties or people, and a scrollbar
  hides whether the list is whole (r4-s53, s54).
- Sev 1 -- In the neighbor list two controls look lit at once, the Hops "1" and the first name under
  the pointer (r4-s53, s54).

## What worked

- **T24**: 7 of 7 (round 3: 2 of 4), 0 false "done" (round 3: 2), median 4 steps against 3 (round
  3: 7.5), wrong turns median 0 (round 3: 5). The element's Shift-click fix carried the whole task:
  every participant reached for it unprompted and it did what they expected. The reworded prompt and
  the key now measure the same thing: 0 of 7 ended on a path or a style.
- **T17**: the toolbar's Filters button was the first and only door in 7 of 7, and wrong turns fell
  to 0 in all 7 (round 3: median 1, 5 of 8 looked in the Graph place first). Counts were read right
  every time; nobody took the tie count for people.
- **T20 and T21**: 16 of 16 S for the second round running, all on the load-time and replace-in-place
  routes, every weight read the right way and for the right reason, 0 wrong turns in 15 of 16.
- **T22**: 4 of 4; the one participant who typed a bare number got "or more" and took it (round 3:
  2 of 4 took "is 10" and started again). No cut row.
- **T4**: 4 of 4, and the segmented control's chosen side, predicted as a likely severity 3, was read
  right by all 4.
- **T18, T23, T12R, T19**: every session succeeded; T18's second time came from Recent in 7 of 7.
- **The study**: the leak check read every participant's log (round 3: none), no step notes were
  lost (round 3: five), and no session log holds an error.

## Candidate insights (for the skeptics)

1. **A fix that matches a habit is used by everyone; a command behind a menu is used by no one.**
   Shift-click, fixed this round, was the route in 7 of 7 T24 sessions, each citing other programs;
   "Select endpoints" was opened 0 of 7 and 2 of 4 in round 3. The toolbar Filters button, added
   beside the canvas, was the door in 7 of 7 T17 sessions. Evidence: T24 and T17 above. Priming:
   low; no prompt or history names Shift or the toolbar.
2. **A feature with no visible control is still found by a guess every time.** Replace (8 of 8 by
   right-click or an unlabeled "..."), Neighborhood (4 of 4 by "..."; "I had nothing else to try"),
   the find box's threshold rows (found only by typing a number; r4-s11 never did). Same as round 3.
   Priming: low.
3. **Readers check an answer in the table, and the table must agree with the drawing.** Two of four
   T17 A participants opened the data table to confirm a filtered count, and it ignored the filter
   (r4-s27: "That shook my confidence"); T22 and T4 participants sorted it to check selections.
   Evidence: bar 5 check. Priming: none; no prompt asks for a check.
4. **Repeat work needs the earlier answer kept beside the new one.** 7 of 7 T18 participants lost
   their first chain to the second run without notice and had written it down first; T21
   participants compared rankings from memory (r4-s39, s42, s44). Same as rounds 2 and 3. Priming:
   low.
5. **Readers check a drawn answer against names, and the default drawing gives none.** Every T20
   route, every T18 chain, the T4 joined table and the T22 marked links were checked only in lists.
   Same as rounds 2 and 3. Priming: none.
6. **A study gate that is not enforced is not a gate.** Round 3 started without its scripted bars;
   round 4 started without them again, and the runner started three participants with no free
   browser slot, all three lost. Evidence: the dry-run section above. Priming: not applicable; this
   is about the study.

## Progress against round 3 and the stop rule

The core four's successful sessions are 30 of 30 valid (round 3: 32 of 32); the two voids in the
core four (r4-s20, r4-s28) lower the count, not any failure. Two bars that failed in round 3 now
hold: bar 1 (T24 2 of 4 to 7 of 7) and bar 6 (2 false "done" to 0). By the rule ("no bar that
failed now holds" is one of the three stall conditions, and all three must be true to stall), the
round progressed and the study is not stalled. It is not done: bars 5, 9 (b) and 10 fail.
Round 3's confirmed severity 3 on a core-four task (a second path replacing the first, T18) is still
open by decision, and one new confirmed severity 3 is on a core-four task (T17's unfiltered table).

## Next steps for the studio

- **Re-run r4-s05b, r4-s20b and r4-s28b** from new folders with the same persona, task half and
  start, and fix the runner first: a participant may start only when a browser slot is free (the
  plan's rule), or `real.mjs --start` must return before the shell call's limit and say how to
  resume, so a waiting participant never ends its turn with no session.
- **Enforce the gate**: the runner must not start a session unless `real.mjs --gate` exited 0 and
  wrote "Gate evidence" into the plan. Two rounds in a row started without the scripted bars.
- Fixes go to the confirmed severity-3 findings in their owning package: the data table showing
  only what a filter step keeps, or saying it shows everything (graphty app); the "or more" row
  naming its layer as the find box's own rule does (graphty-element, `atLeastOf`); the find box's
  Values rows above the matching ties, or in view (graphty app); no suggestion the find box will
  refuse, and an "or more" row for a number inside a column's range (graphty app and
  graphty-element); script the one-specialist severity 3s first (the off step turning itself on,
  the New project crash) and the one-session one (a rule on a missing column).
- Seed the next dry run with this round's detours: a bare number that is not a value, the data
  table opened under a filter, an off step's editor opened and left, the "or more" row styled,
  Undo after a Rerun, New project after work.
