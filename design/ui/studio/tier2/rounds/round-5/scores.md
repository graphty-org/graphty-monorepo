# Tier 2 round 5 scores: returning users on the real graphty app

Scored against `../../criteria.md` on build 8c015b806 (graphty@0.8.65), from the graders'
`grade.md` files of the re-run sessions `sessions/r5-s01b/` to `sessions/r5-s56b/`, the round's
bars run (`bars/bars.json`, written by the start gate on the frozen build), the four expert reports
in `expert/` (controls and gestures, visual design, accessibility, and the screenshot audit at 1200
x 900 and 900 x 700), and the round's leak check. Ease is each participant's own rating (1 = very
difficult, 7 = very easy), read from the grade or, where the grade does not give it, from the
transcript; it never decided a grade. Steps are the screenshots after the start in the
participant's own folder; on T17 and T18 they count only those taken before the tool gave the
follow-up. Every row is in `design/ui/studio/tmp/researcher/t2r5/score-b.py`, which asserts the 56
planned `b` sessions, each grade against its `grade.md`, the build stamp of every session, that
every leak check read exactly one participant log with at least one call and that only the two
named below were flagged, the open-work differences and how many sessions ran at once. Success
paths, in the answer key's steps: T20 11, T17 7, T18 4, T21 6, T22 3, T4 9, T19 13, T23 5, T24 3,
T12R 4.

All participants are simulated: one model playing composite personas, each told a history of
earlier sessions. A failure is strong evidence; a pass is weak until real people confirm it. A
simulated returning user remembers exactly what its history names, so it is likely faster than a
real one on what the history names and no faster elsewhere. Keyboard-only and screen-reader use of
tier 2 is untested by sessions (owner, 2026-10-07); bar 8 and the accessibility walkthrough are the
only checks on it.

## The result in one paragraph

**55 of 55 valid sessions succeeded (50 S, 5 SD), and every task meets its success floor (bar 1).**
The round's start gate passed this time ("Gate evidence" at the end of `plan.md`, bars on the
frozen build), so this is the first valid measurement of build 8c015b806. **Two bars fail**: bar
9 (b), an edge's inspector at 29 words against 27, unchanged from round 4 because no fix touched
it; and bar 10, on one confirmed severity 3 (drawn names and nodes covering each other) and a rise
in the specialists' total from 153 to 162. Bars 2 to 8 and 11 hold, bar 5 because no
reader opened the data table under a filter step this round (it failed in round 4 on that table,
now fixed by specialist checks). **Bar 11 holds for T18 only on its limit, 8 against 8, and only
because two participants answered by hand without the path tool; the six who used the tool took a
median of 8.5.** One session is void (r5-s02b, a model-side interruption before its first step) and
its re-run is owed; no bar's verdict depends on it.

## Did the gate run, and are participants hitting implementation faults?

**Yes, the gate ran.** `plan.md` ends with "Gate evidence" written by `real.mjs --gate` on
2026-10-11: the 20 task-half pilots on 8c015b806 (`pilot/r5/`) and `bars/bars.json` on
`8c015b806086 graphty@0.8.65`. Every session started after it, and every `session.json` reads that
build stamp.

**No: participants spent their sessions on design questions, not broken controls.** No session
ended on an app error, and no `session.log` holds a script, console or request error, apart from
r5-s02b's "No step for 900 seconds; closing the session" (a run fault, below). No grader recorded a
control that failed to do what it says.

**The study's own faults this round:**

- **One void, re-run owed: r5-s02b** (T22 B, Les Miserables, Ruth). It started (setup ran, `01.png`
  is the right T22 B start), but no step followed, and the session server closed itself after 900
  seconds idle. Mechanism, from the participant's own log
  (`.../subagents/workflows/wf_66aeb0f0-ba3/agent-a01b896ad8ca286b2.jsonl`): it read the briefing
  and the start screenshot, and its first write to its transcript was stopped by a model-side
  safety classifier; the participant then ended its turn without taking a step. Nothing the app or
  the tool did caused it. By the criteria a tool or run fault voids the session and it is re-run
  and counted: **r5-s02bb is owed** (Ruth, T22 B, the same prompt and start). T22 passes bar 1 even
  if it fails (7 of 8, B 3 of 4).
- **No session failed to start.** Every one of the 56 reached `--start` and its setup.
- **The leak check flagged two `b` sessions; both stand.** It printed VOID for r5-s03b ("a path up
  out of its folder, ..") and r5-s53b ("a studio file, .../design/ui/studio/tool"). Reading each
  participant's own log shows neither opened anything outside its briefing and its screenshots:
    - r5-s03b (`agent-aebd31df4135af143.jsonl`): the two ".." are prose in its transcript heredocs,
      "real.mjs <cmd> .../r5-s03b ..." and the legend text "Everything 2 .. 15". After `--end` it
      listed its own copied folder and read its own `leaks.json`.
    - r5-s53b (`agent-a35f4e20d3267ec35.jsonl`): the path is a variable written into the
      transcript's header ("T=.../design/ui/studio/tool"); every command touching that folder is
      the briefed `node design/ui/studio/tool/real.mjs` call. Its 39 calls are transcript writes,
      `real.mjs` steps and screenshot reads.
  The check's other 52 VOID lines name the first run's folders (r5-s01 to r5-s56, no suffix),
  which were already void (every one refused at `--start`) and are not scored. Every `b` session's
  check read one participant log (10 to 46 calls each).
- **Tool versions.** The sessions ran on tool commits `0340fb332` (16), `753bae997` (36) and
  `a5de4b445` (4); no file under `tool/` differs between them. The four on `a5de4b445` recorded
  uncommitted changes in the worktree; the record does not say which files, and every step still
  produced its screenshot.
- **The tool's click by name refused names two things share** in about 15 sessions, each costing
  one step and changing nothing: a column header and its role box ("minutes", "km", "emails") on T20
  and T4; a node row and its ties ("Ava", "Chloe") on T18 and T23; "2" as the Hops segment and a
  weight; "Graph" as the rail button and a note's chip on T19; "Shortest path" under Recent and in
  its section on T18. The "Graph" pair is the app's own shared name (bar 8, below).
- **A setup that contradicts its history (T21).** Tom's and Ruth's histories say the project was
  saved earlier, but `friends-ranked.txt` and `team-ranked.txt` never save, so a plain Save opened
  "Save ... as" (r5-s41b, r5-s42b; r5-s39b expected a plain save too). Graders correctly did not
  score it against the app; the setups or the histories must be made to agree before T21 runs again.
- At most 4 sessions ran at once, over 0.85 hours (16:58 to 17:49 UTC).

## Sessions

56 run, 55 valid, 1 void (re-run owed). **55 of 55 valid sessions succeeded** (100%; target 85%):
50 S, 5 SD, 0 F, 0 G. No session was decided by a build defect. Against all 56 planned, 55 of 56
(98%), the void counted as not succeeding.

## Bars (all must hold in one round)

Round 5 re-ran every task, so no task carries sessions forward from round 4.

| #   | Bar                                     | Round 5                                                                                                                                                                                                                       | Status                      |
| --- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| 1   | Each task's success rate, each half     | Every task and half meets its floor; T22 7 of 7 valid, holds even if the owed re-run fails                                                                                                                                    | Holds                       |
| 2   | Earlier work kept                       | `work.json` over all 55: nothing gone except the replaced source in each T21 session, which the participant chose. Six T18 sessions' second path replaced the first: see the check                                              | Holds (check below)         |
| 3   | Confirmed severity-4 problems open      | 0. No participant left; no wrong answer was reported                                                                                                                                                                          | Holds                       |
| 4   | Confirmed silent commit on success path | 0. r5-s46b's grader noted Cancel on a note form also clearing the node selection; the halo and the inspector changed on screen, and Cancel is not a commit                                                                       | Holds                       |
| 5   | Numbers that disagree with drawing/data | 0 seen on any route. No T17 or T23 participant opened the data table under a step (0 of 12), so round 4's failure was neither met nor re-checked by a reader. After Replace, the old values sat under their out-of-date bar      | Holds (check below)         |
| 6   | Confirmed false "done"                  | 0                                                                                                                                                                                                                             | Holds                       |
| 7   | The loaded weight read as loaded        | (a) `bars.mjs`: 290 runs, 0 unfinished, 0 wrong readings; every planted wrong reading caught. (b) 0 sessions read a weight the wrong way round                                                                                  | Holds                       |
| 8   | Automated accessibility check           | axe: 0 serious or critical on all 14 tier 2 screens. No shared names on them; focus held after all 17 scripted actions. Two script moves outside bar 8's list did not run (below)                                              | Holds (check below)         |
| 9   | App words at rest                       | (a) 37 on tier 1's screen (limit 50). (b) **an edge's inspector 29 against 27**, as in round 4; the other three tier 2 screens under their limits                                                                                | **Fails** ((b), by 2 words) |
| 10  | Expert walkthrough and screenshot audit | 1 confirmed severity 3 open (names and nodes covering each other); the specialists' total rose from 153 to 162                                                                                                                 | **Fails**                   |
| 11  | Cost of the core four                   | T20, T17, T21 within 2x; **T18 8 against 8, on the limit**                                                                                                                                                                    | Holds (check below)         |

**Check on bar 2.** Six T18 sessions ran Shortest path a second time for the follow-up (r5-s17b,
s19b to s23b); each second run replaced the first chain in the drawing, the run list and the
Values with no notice (every grader: severity 2). The first chain was made during the session, so
it is in neither open-work list, and each participant had written it down first. Scored as holding,
as in rounds 2 to 4. Read round 1's way ("a run ... gone at the end without the participant
choosing to remove it"), bar 2 fails in 6 sessions. r5-s06b left an extra "Everything" layer from
an abandoned width change; that is added work, not lost work.

**Check on bar 5.** It holds by absence, not by a reader meeting the fix: the specialists show the
table under a step now reads "12 of 41 edges" with only the kept rows, but no participant opened
it this round (round 4: 2 of 4 T17 A did, and the bar failed). T22 participants who opened the
table (r5-s03b, s05b) had no filter step. The other reading the bar names, an out-of-date value
shown without its mark: after Replace and before Rerun, the old Distribution, value count and Top
10 stay at full contrast under a "Data changed since this run" bar, key titles marked out of date
and a clock on the run's row. 8 of 8 T21 participants noticed it and 0 copied the old values, but
r5-s40b "almost copied the old list" and r5-s42b and s44b said a colleague could have (severity 2,
confirmed). By the bar's words the values carry their mark; both skeptics should weigh whether a
mark the reader nearly misses counts.

### Bar 1, per task

| Task | Success | Half A | Half B | Needs            | Holds | S / SD / F / G | Void    |
| ---- | ------- | ------ | ------ | ---------------- | ----- | -------------- | ------- |
| T22  | 7 of 7  | 4 of 4 | 3 of 3 | 7 of 8, 3 a half | yes   | 5 / 2 / 0 / 0  | r5-s02b |
| T17  | 8 of 8  | 4 of 4 | 4 of 4 | 7 of 8, 3 a half | yes   | 8 / 0 / 0 / 0  |         |
| T18  | 8 of 8  | 4 of 4 | 4 of 4 | 7 of 8, 3 a half | yes   | 6 / 2 / 0 / 0  |         |
| T24  | 4 of 4  | 2 of 2 | 2 of 2 | 4 of 4, 2 a half | yes   | 4 / 0 / 0 / 0  |         |
| T20  | 8 of 8  | 4 of 4 | 4 of 4 | 7 of 8, 3 a half | yes   | 8 / 0 / 0 / 0  |         |
| T21  | 8 of 8  | 4 of 4 | 4 of 4 | 7 of 8, 3 a half | yes   | 7 / 1 / 0 / 0  |         |
| T19  | 4 of 4  | 2 of 2 | 2 of 2 | 4 of 4, 2 a half | yes   | 4 / 0 / 0 / 0  |         |
| T23  | 4 of 4  | 2 of 2 | 2 of 2 | 4 of 4, 2 a half | yes   | 4 / 0 / 0 / 0  |         |
| T4   | 2 of 2  | 1 of 1 | 1 of 1 | 2 of 2           | yes   | 2 / 0 / 0 / 0  |         |
| T12R | 2 of 2  | 1 of 1 | 1 of 1 | 2 of 2           | yes   | 2 / 0 / 0 / 0  |         |

The SD grades: r5-s03b and r5-s06b (T22) styled the whole graph first, then used the find box;
r5-s18b and r5-s24b (T18 B) worked the chain out by hand in the find box and never ran Shortest
path; r5-s43b (T21 A) took two wrong turns in the Graph place before finding Replace.

### Bar 7 (a), measured

`bars.mjs` on 8c015b806 (the gate's run): every algorithm in the element's catalog on
`friends.csv` loaded with each weight meaning (closer, farther, capacity, not set) and with no
weight column, directed and undirected: 290 runs, 0 unfinished, 0 read a meaning in the wrong
sense, 0 that said they read no weight answered differently without the column. Every planted wrong
reading was caught (`untrusted` is empty).

(b) 0 sessions read a weight the wrong way round. T20: 8 of 8 set the column's role to Weight and
Higher means to Farther on the import page, and every Overview read "Loaded weight ... (farther)".
T21: 8 of 8 left "Higher means: Not set" on the Replace page; most gave the old run's "assumed a
higher weight means closer" or the page's own line as the reason. T4 A: r5-s53b set the email count
as a weight, unasked.

### Bar 8, measured

`bars.mjs` on 8c015b806 (dark scheme); every check caught its planted failure first (a clipped
name, a raw code, an image with no text, two buttons with one name, focus dropped, the active option
scrolled out of view):

- **axe**: 0 serious or critical on every one of the 14 tier 2 screens. On tier 1's screens the find
  results' scroll area (`scrollable-region-focusable`, serious) is excused as recorded in round 3:
  the scripted check that 18 ArrowDowns keep the active option ("Eli -> Farah") in view holds. The
  accessibility specialist agrees no change is wanted (a11y 46).
- **No two controls share an accessible name** on the listed tier 2 screens.
- **Focus held after all 17 scripted actions**, including leaving an off step's editor unedited and
  Cancel in the note editor, both new this round.
- **Two script moves did not run**, neither on bar 8's list: tier 1's "a node's Values with its
  neighbors" (the click on "Degree" timed out; not traced), and the extra focus check "Enter on
  Shortest path, found by typing 'shortest path'", whose three ArrowDowns now land on "All-pairs
  distance" (`bars/sessions/focus-and-scroll-1440x900/04.png`) because name matches lead the Analyze
  list since round 4. Both missed the same way in round 4's run, and round 4's report did not say
  so. Bar 8's own "Find path" focus check ran and held. The script needs both moves fixed.

**A shared name the sessions found is the app's:** a note's "Graph" chip beside the rail's "Graph"
button (r5-s45b, s47b, s48b; round 4: r4-s55, s56). The scripted "Notes place with two notes" has
no note about the graph, so the script never draws that chip. Add a graph note to that screen.

### Bar 9, measured

(a) Tier 1's screen: 37 words (limit 50; round 4: 37). (b) Against round 1's counts in
`tool/bars-limits.json`: the returning rest screen 48 (limit 49), a path run's inspector 59 (63),
the neighbor list 32 (33), **an edge's inspector 29 (27)**. Every count equals round 4's: no fix
since touched these screens. The two extra words on the edge's inspector are round 4's: scope
words ("full graph", "of nodes") added since round 1 with nothing removed.

### Bar 10, the confirmed severity-3 finding

Confirmed means measured by the script, named by a second specialist, or a specialist finding a
session also shows. Severities follow the skeptics' verdicts on these same expert reports
(`insights.md`), which stand because the build is the same.

1. **Drawn names and nodes cover each other.** On friends "Chloe" is drawn over "Farah" and "Dev"
   over "Eli", "Hana" sits on Ivan's node; sized nodes are drawn inside each other. Visual and audit,
   severity 3 each. Sessions this round show the same class on every dataset where it matters:
   T17 A's overlapping pair hides one tie at "5 or more" and made counts uncheckable by eye (r5-s09b,
   s11b, s13b, s15b); T20 B's Creek and Summit drawn inside each other (r5-s30b, s32b, s34b, s36b);
   Hana's label over Ivan (r5-s27b). Owner: graphty-element (label placement, and a layout that
   spaces centers by drawn size). On the owner's list; reported as a class.
   - **The tie-click half did not reproduce.** On T24 B both participants clicked the
     Station-Stadium tie on the first try and got the tie (r5-s26b, s28b); r5-s28b aimed at the
     short stretch the "Stadium" name does not cover. With the controls walk (`expert/figma/path/27.png`),
     that is three clicks on this build and none landed on the name. Round 4's scripted claim
     (`claims/c-tie-click/`) was made on 5277e2cbe and has not been re-run here.

**Counts.** The specialists' totals rose from 153 to 162: controls 42 to 39, visual 42 to 52,
accessibility 31 to 46, audit 38 to 25. The accessibility specialist's second pass added 10
findings, all on screens no earlier round walked (Export, Save as, Settings, a run's Values; none
above severity 2); the visual specialist names the rise as ground walked for the first time. By the
bar's words, "never rises" fails on these totals, as scored in rounds 3 and 4, because no confirmed
count exists for earlier rounds. Severity 3 fell from 5 confirmed in round 4 to 1.

Severity 3 from one source only, not confirmed: long names cut at both canvas edges (audit 4; no
study file has long names; the script's cut-text check finds the long names readable by tooltip,
name or a whole copy on screen, so it is about the canvas labels, which it does not measure); the
key growing over the drawing and cutting "Depot" (visual 2; no session reported it). The script's
raw-string check found nothing on any screen. Rejected glossary words are not scripted
(`tool/measure.mjs` says so); only the specialists check them.

**Found by both the sessions and the specialists:** names and nodes covering each other; a second
path replacing the first (controls 12); the Path popover over the nodes it asks about (r5-s30b,
s32b; audit 14, controls 21, visual 24); "Filter to neighbors" giving no way back once pressed
(r5-s49b, s52b; audit 11, visual 13); backticks in rules, layer names and the key (r5-s03b, s05b,
s06b, s08b; accessibility 23, visual); "PageRank, full graph" under a filter (r5-s09b, s14b, s51b, s52b; audit
20); the old Top 10 after Replace (8 of 8 T21; visual); Load as the filled button on the Add page
when every incoming tie repeats (r5-s38b; controls 17 in round 4, and the same state in
`expert/visual/replace/13.png`). **Only the specialists:** the edge-only filter step's "Ran on 20
nodes; 20 shown now", a rule on a missing column answering "Nothing matches", the "or more" row
under the matching ties on friends, the Delete key on a step, the two-table source with no actions,
"Edit source..." titled "Replace", the Analyze search box moving, long names, the export and
settings screens. **Only the sessions:** the funnel icon on the find box's value rows, the Style
tab's lack of a threshold, a numeric column loading as a plain attribute, Replace with no visible
control and the Graph title read as the file's control, the Replace page silent about the run, a
note's subject following the selection, nothing lasting saying a project is saved, the neighbor
list behind a menu or a small arrow, the Hops heading's count, no word on who a filter dropped, raw
column names. As in every round, the specialists find how a reached screen behaves; the sessions
find whether a returning user reaches it.

### Bar 11, cost of the core four

| Task | Success path | Median steps (successful) | 2x  | Within | Steps                          |
| ---- | ------------ | ------------------------- | --- | ------ | ------------------------------ |
| T20  | 11           | 15                        | 22  | yes    | 12, 14, 15, 15, 15, 15, 15, 16 |
| T17  | 7            | 7                         | 14  | yes    | 6, 6, 6, 7, 7, 7, 7, 8         |
| T18  | 4            | 8                         | 8   | yes    | 4, 4, 8, 8, 8, 9, 9, 9         |
| T21  | 6            | 9.5                       | 12  | yes    | 6, 6, 6, 9, 10, 11, 11, 13     |

**T18 holds on the limit for the second round running, and only because of two SD sessions.** The
two 4s are r5-s18b and r5-s24b, who answered by hand in the find box and never ran the path tool.
The six who ran it took 8, 8, 8, 9, 9, 9 (median 8.5, over the limit): five through the Analyze
list and its filter ("path", "shortest"), one through a node's "Path between..." (r5-s17b), and
none by the P key. Each typed and picked both ends as separate steps. T20 rose from 13 to 15 and
T21 from 7 to 9.5; T21's rise is mostly saves nobody asked for, three of them prompted by the
setup's unsaved project (r5-s39b, s41b, s42b: 3, 2 and 3 steps), and r5-s39b's and s43b's wrong
turns. Without the saves T21's median is 8.5.

## Measures (targets, not gates)

| Measure                                     | Target                    | Round 5                                                                                                                                                                                         |
| ------------------------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| All sessions                                | >= 85%                    | 55 of 55 valid (100%); 55 of 56 counting the void as not succeeding (98%)                                                                                                                       |
| Ease, mean (median)                         | >= 5.0; no task below 4.0 | 5.91 (6) overall; core four 5.91. T22 5.71, T18 5.75, T21 5.75, T19 5.75, T20 6.00, T24 6.00, T23 6.00, T4 6.00, T17 6.12, T12R 6.50. 46 of 55 ratings are exactly 6, so the scale says little |
| Steps against the success path, other tasks | median <= 2x              | All within: T22 6 of 6 (on the limit; round 4: 8), T24 3 of 6, T23 7 of 10, T4 16 of 18, T19 18 of 26, T12R 3.5 of 8                                                                             |
| Wrong turns per session                     | median <= 1               | 0 (41 of 55 with none; round 4: 47 of 53). T19 and T4 median 1                                                                                                                                  |
| Recovery                                    | >= 70%                    | 14 of 14 sessions with a wrong turn succeeded (100%)                                                                                                                                            |
| The second time (follow-ups)                | path + 1, 0 wrong turns   | T17 8 of 8 (4 or 5 steps against 5). T18 6 of 8 on raw counts (r5-s20b's 6 include one click the tool refused; r5-s23b's 8 include clearing a stale From), 7 of 8 without the refusal. 0 wrong turns on any follow-up |
| Script, console and request errors          | 0                         | 0 (every valid `session.log` empty)                                                                                                                                                             |

**The second time.** T18: five reopened Shortest path from the Analyze list's Recent row, r5-s17b
used the node's "Path between..." again, and the two by-hand sessions stayed by hand. r5-s23b's
From came back holding Chloe, still selected from the first question, and she cleared it; a reader
who did not look would have run Chloe to Nora (one session, severity 2). T17: every participant
reopened the off step, changed the value, saved and unticked it; r5-s14b added a second step
instead, to keep the first.

**The plan's questions.**

1. **T22, a number in the find box.** 3 of 7 typed a bare "10" first (r5-s01b, s07b on A; r5-s04b
   on B); all three got a row "... is 10 or more (N)" and reached the right selection with no
   refusal (A: the 3 stops' links; round 4: no A participant typed a bare number, and its "10" was
   refused). The other four typed a condition: r5-s05b typed "minutes", saw "Start with =", then
   "=minutes >= 10" and took the offered backtick rewrite; r5-s03b, s06b and s08b typed it without
   "=" and took the offered "=... >= `10`" row. **"=" typed unprompted: 0 of 7** (0 of 31 over four
   rounds). No find row was cut or under the fold on A or B (the friends case is a specialist
   finding). r5-s03b styled the selection: the layer and the key read "minutes >= `10`", named like
   the rule, not by a field path (round 4's severity 3 is fixed for a reader). No B session typed a
   column Les Miserables lacks (claim a not met).
2. **T17.** 0 of 8 opened the data table, so the fix is unmet by readers. 8 of 8 opened an off
   step's editor for the follow-up; each step stayed off until its participant saved it on, and
   r5-s14b left one unsaved and it stayed off.
3. **T18.** Analyze list 5 (typed "path" or "shortest"), a node's "Path between..." 1, the P key 0,
   none 2 (by hand). Cost: above.
4. **T24.** B: the tie in one click in 2 of 2; no click landed on the "Stadium" name. Ends: Shift-click
   4 of 4 (from file-manager and spreadsheet habits, as in round 4); "Select endpoints" 0 of 4 (0 of
   11 over rounds 4 and 5); Ctrl not tried.
5. **T19 and T23.** T19: 4 of 4 met a note form "About PageRank" or "About Medici" they did not want
   (the setup leaves the PageRank run in the inspector) and pressed Cancel; three then chose the
   subject (Graph > Everything, or a node through the find box), and r5-s46b's Cancel also cleared
   the node selection, which she wanted. T23: 0 of 4 opened the table after Filter to neighbors.
6. **T20 and T21.** T20: Farther chosen at load 8 of 8; Creek and Summit drawn inside each other on
   B misled nobody, but 4 of 4 on B could read the route only from "Nodes in order". T21: nobody
   started a new project; r5-s38b reached the Add page through "Open project or file...", where Load
   is the filled button and would add 16 ties a second time; he read the warning and chose Replace.
   No Escape on a style swatch in any session (claim b not met).
7. **Doors and habits**, below.

**First moves and broken habits.** Graders recorded no broken habit. One borderline case for the
skeptics: on T18 B, r5-s18b and r5-s24b started in the find box (a place Nadia's history names; the
grader says Tom's does not) and answered by hand from it, so the place led to a correct answer and
is not a dead end by the measure's words; read as "led nowhere near the path tool", it would be two
sessions in one task, a confirmed severity 3. Scored here as the confirmed severity 2 below.

- **T17**: the toolbar's Filters button first, 8 of 8 (round 4: 7 of 7); 0 wrong turns in all 8.
- **T22**: the find box first in 4 of 7; Everything's Style tab, Edges, first in 3 (r5-s03b, s06b,
  s08b), all three looking for a way to color or size "10 or more", none finding one there.
- **T18**: the find box first in 3 (r5-s17b, s18b, s24b), the Analyze button in the other 5 (r5-s20b
  after a hover on the left rail).
- **T20**: "Open project or file..." 8 of 8, then the role box, Weight and Farther.
- **T21**: the run's Values first to note the top name, then the Data place. r5-s39b and s43b first
  clicked the file name beside "Graph" at the top of the left panel, expecting the file's actions
  there (two wrong turns each); r5-s41b looked in the main menu.
- **T23, T12R, T4**: the find box, then the node's panel; T4 "New from data..." 1, "Open project or
  file..." 1.

**Doors.** Path: the Analyze list 5 of 8 T18 and 8 of 8 T20 (13 of 16), a node's "Path between..."
1, the P key 0 (74 chances over five rounds). Filter: the toolbar Filters button 8 of 8, the Filters
"+" 1 (r5-s14b's second step), an attribute's "Filter to..." 0. A tie's two ends: Shift-click 4 of
4, "Select endpoints" 0 of 4. Replace: the source row's right-click 3 of 8, the source inspector's
"..." 4, the Add page's Replace 1. Notes: the Notes place's "+" 4 of 4 (r5-s46b also the
inspector's "Add note"), the N key 0. Neighbors: the node's "..." menu 3 of 4 on T23, the Degree
arrow 1, and 2 of 2 on T12R.

**The segmented controls' chosen face:** 0 misreads (Higher means on T20 and T21, Hops on T23 and
T12R, Add and Leave out on T4, Each row is). r5-s54b doubted Add had worked because the unmatched
view kept its warning after Add (below).

**T21, positions after Replace.** On friends the drawing kept its shape and zoomed out slightly; on
the team file it was laid out again. 0 of 8 read moved dots as lost work; 3 of 4 on B read the two
new blue dots, which the key does not explain, correctly as unranked newcomers.

## Confirmed problems by task

Confirmed: two or more participants, a build behavior seen in two, or a specialist finding a
session also shows. Severity is the highest the confirming sessions support, opinion-only problems
held one level down; a one-session problem is listed only at severity 2 or more. Deterministic
layout overlaps count once per dataset.

### Across tasks

- **Sev 2** -- No names are drawn unless the setup turns them on, so a route, a chain, a joined
  table or a filtered set can be checked only against a list (8 of 8 T20; r5-s19b to s22b, s24b on
  T18; r5-s50b to s52b on T23; both T4; r5-s48b). Where names are drawn they overlap (bar 10).
- **Sev 2** -- "Follow: Out / All" is never explained and ties are drawn with arrows for relations
  that run both ways; participants could not say whether All ignores direction (T18 r5-s19b, s21b,
  s23b; T20 r5-s29b, s31b, s32b, s33b, s35b, s36b; T23 r5-s49b). It changed no answer.
- **Sev 2** -- "PageRank, full graph" in the key and a clock on the run's row under a filter left
  readers unsure whether the colors were now wrong (T17 r5-s09b, s14b; T23 r5-s51b, s52b); most read
  it correctly and none reran.
- Sev 1 -- Graph words where readers have their own: nodes, edges, hops, "weight" and
  "shared_chapters" as raw column names, "Capacity" (most T17, T18, T20, T23 and T24 sessions).
- Sev 1 -- Small gray labels on the import page and in the inspector are hard to read (r5-s04b,
  s19b, s27b, s32b, s40b, s53b). The accessibility specialist measures them at 7.59:1, so it is
  size, not contrast.
- Sev 1 -- The data table opens about four rows high at 1440 x 900 (r5-s05b, s53b).

### T22, pointing out everything that meets a condition

- **Sev 2** -- The find box's value rows ("minutes is 10 or more (3)") carry the funnel icon of the
  toolbar's Filters tool but select and hide nothing, and hovering shows no tooltip; participants
  clicked expecting stops and links to vanish (r5-s01b "clicked on faith", r5-s04b "I nearly didn't
  click it", r5-s07b; r5-s05b noticed, not misled). 3 of 3 who used the row hesitated. Owner:
  graphty app (the row's icon and a tooltip).
- **Sev 2** -- Everything's Style tab offers only a ramp by attribute, with no way to mark ties above
  a value, and nothing there points to the find box's rules; 3 of 7 spent 4 to 9 steps there (r5-s03b
  colored and undid, r5-s06b sized and abandoned, r5-s08b looked). By the criteria's T22 rule the
  separate "select where" dialog is reconsidered only if T22 fails both halves, which it does not;
  the three looked in the same named place, so the next look is whether Style should point to the
  find box.
- **Sev 2** -- Rule syntax reaches reader-facing text: the red "Put numbers in backticks:" read as a
  refusal of "=minutes >= 10" (r5-s05b, took the offered rewrite), and the layer and the key read
  "minutes >= `10`" (r5-s03b); r5-s06b and s08b called the backticks code they would not type. Round
  4 had this at sev 1.
- Sev 1 -- An empty find box gives no sign it takes a value or a condition (r5-s03b, s04b, s06b,
  s07b, s08b); all found it by typing.
- Sev 1 -- The result is a selection, and nothing offers to keep it for a slide (r5-s01b, s08b;
  r5-s03b made a style layer from it).
- One session, sev 2: Width by attribute on edges looks unchanged (8 to 16 on hair-thin lines) and
  leaves a layer behind (r5-s06b).
- Answer key: T22's entry does not describe the value-row route (type "10", pick "... is 10 or more")
  that 3 sessions took; graders judged it by the end state. Add it.

### T17, narrowing the drawing

- **Sev 2** -- The overlapping pair on friends hides one tie at "5 or more", so a count by eye does not
  match the on-screen count (r5-s09b, s11b, s13b, s15b). Bar 10's class, counted once for friends.
- **Sev 2** -- The step's column is offered only by its file name ("weight", "shared_chapters"), and
  nothing says what it holds; r5-s13b chose by elimination (r5-s10b, s11b, s16b).
- **Sev 2** -- Nothing says who a step dropped (r5-s09b, s13b at 4 or more, one person gone).
- Sev 1 to 2 -- The new step's editor shows no count of what it would keep before Add step (r5-s10b,
  s11b at 2, s12b, s13b, s15b).
- Sev 1 -- The toolbar's Filters tool is an unlabeled icon, found by its funnel shape or a hover
  (r5-s10b, s12b, s13b, s14b, s15b, s16b).
- Sev 1 -- The step's on/off box has no word while on (r5-s10b, s11b); with the step off, the header
  chip simply disappears (r5-s16b).

### T18, the shortest chain

- **Sev 2** -- A second path replaces the first with no notice (6 of 6 who ran two; controls 12).
- **Sev 2** -- A returning user who starts in the find box gets no hint that the program can find the
  chain; r5-s18b and s24b answered by hand and could not tell it was the fewest (rounds 2 and 3 had
  the same). See "First moves" for the stricter reading.
- Sev 1 -- "4 hops" and "5 nodes, 4 edges" must be translated into introductions or people between
  (r5-s17b, s19b, s21b, s23b).
- Sev 1 -- Shortest path is not on the Analyze list's first screen; it was found by typing "path" or
  "shortest" (r5-s22b, s23b at 2).
- One session, sev 2: a stale From on the follow-up (r5-s23b, above).

### T24, one tie on the drawing

- Sev 1 to 2 -- The tie's number sits under the file's column name with nothing saying what it counts
  (r5-s25b, s27b at 2, s28b at 0).
- Sev 1 -- The tie's title "Gus -> Ivan" reads as one-way for a mutual relation (r5-s25b, s26b, s27b).
- Sev 1 -- Nothing says a line can be clicked, and it is a thin target (r5-s25b, s26b, s28b); all
  four hit it first time.
- Sev 0 to 1 -- After the two ends are selected nothing marks the tie itself (r5-s26b, s27b, s28b).

### T20, a weight read at load

- **Sev 2** -- A numeric column loads as a plain attribute, and only the gray line "Weight: none (each
  edge counts 1)" says so, with Load enabled; 8 of 8 graders record that pressing Load as usual gives
  the fewest-stops route with no warning, and r5-s32b says she would have. All 8 set it right.
- Sev 1 -- "As the file says" loads a CSV as directed, which nobody chose (r5-s30b, s32b to s36b).
- Sev 1 -- "Capacity" under Higher means is not understood (r5-s30b, s36b; also T4 r5-s53b).
- Sev 1 -- The Path form opens over the lower drawing where both ends sit (r5-s30b, s32b; three
  specialists).
- Sev 1 -- The role box reads "Attribute", not its column's name, and did not read as a control
  until opened (r5-s33b, s35b, s36b).

### T21, rerunning on a newer file

- **Sev 2** -- Replace has no visible control: it is in the source row's right-click menu and behind
  a hover "..." or the source inspector's "..." (7 of 8; r5-s39b and s43b first tried the file name
  beside "Graph", two wrong turns each; r5-s41b the main menu).
- **Sev 2** -- Between Replace and Rerun the old Distribution, value count and Top 10 stay at full
  contrast (8 of 8 noticed; r5-s40b almost copied the old list). See the bar 5 check.
- **Sev 2** -- Opening the newer file from the main menu lands on "Add to ..." with Load as the
  filled button although every shared tie would be added a second time (r5-s38b graded 3: "37
  edges"; he read the warning and chose Replace). The same state is in
  `expert/visual/replace/13.png` on this build, and the controls specialist named it in round 4 at
  severity 2 (#17, not re-walked). Held at 2 here because no participant pressed Load; one session
  supports 3, so the skeptics should weigh it.
- Sev 1 -- The Replace page asks "Higher means: Not set" again with no sign of what the run used
  (r5-s37b, s39b, s40b, s41b, s43b, s44b).
- Sev 1 to 2 -- The two new people are drawn as blue dots the key does not explain (r5-s38b, s42b at
  2, s44b); all read them correctly.
- One session, sev 2: the Replace page says nothing about whether the run and its styling survive
  (r5-s41b).

### T19, notes

- **Sev 2** -- A new note's subject is whatever the inspector shows, and the form cannot change it; 4
  of 4 met a form "About PageRank" or "About Medici" they did not want and caught it only by its
  small heading (rounds 3 and 4 had the same).
- **Sev 2** -- Nothing lasting says the project is saved: the header reads "Local only" before and
  after, the toast fades, and the start screen then warns that the browser can clear projects (4 of
  4).
- Sev 1 -- "Save local copy..." gives no message (r5-s45b, s47b, s48b); the inspector's "1 note" link
  does nothing visible with Notes open (r5-s45b, s48b); "Everything" becomes "About Graph" with a
  "Graph" chip, two names for one subject that also share the rail's name (r5-s45b, s47b, s48b).

### T23, how far a neighborhood reaches

- **Sev 2** -- The neighbor list is behind the node's "..." menu or a small arrow beside "Degree";
  nothing on the panel says neighbors (4 of 4).
- **Sev 2** -- "Hops" is unexplained and the heading "Medici and 11 connections" has the same shape at
  every reach and does not match "Selection 12" (r5-s49b, s50b, s51b, s52b).
- **Sev 2** -- After "Filter to neighbors" the button only grays out, with no way back on the panel
  (r5-s49b, s52b; audit 11, visual 13).
- One session, sev 2: Hops 2 does not say through whom each second-step node is reached (r5-s50b).

### T4 and T12R

- Sev 1 -- The "+" beside Tables opens a menu, not a file picker (r5-s53b, s54b).
- Sev 1 -- On T12R the path to the neighbor names is a row labeled "Degree" whose chevron does not
  read as a button (r5-s55b, s56b).
- One session, sev 2: after Add, the unmatched view still says "1 unmatched row" with its warning
  while the table list turns green (r5-s54b; round 4's r4-s50 saw the same).

## What worked

- **The gate.** The tool's refusal stopped round 5's first run, and this run passed the gate before
  its first session; every bar was measured on the frozen build before anyone started.
- **The bare number in the find box (T22).** 3 of 3 who typed "10" reached the right set with no
  refusal, two of them on bus stops, where round 4's build refused it. A rule's layer is now named
  like the rule.
- **The toolbar's Filters button (T17)**: 8 of 8 first moves, 0 wrong turns, every follow-up within
  the target.
- **The weight at load (T20)**: 8 of 8 chose Farther and named where the program says so.
- **Shift-click (T24)**: 4 of 4, every tie hit on the first click, including Station-Stadium.
- **Recent (T18)**: 5 of 6 tool users came back to Shortest path from Recent.
- **Recovery**: 14 of 14 sessions with a wrong turn succeeded; no false "done" anywhere.

## Candidate insights (for the skeptics)

1. **A fix that matches the reader's habit lands at once, and its icon can undo the gain.** The "N
   or more" row turned a bare "10" from a refusal into a right answer for 3 of 3, yet all three
   hesitated because the row wears the filter's funnel. Evidence: r5-s01b, s04b, s07b transcripts and
   `02.png`/`03.png`. Refuted by: a session that read the funnel as "select".
2. **The Style tab is the second place a returning user looks to mark a set.** 3 of 7 T22 sessions
   went to Everything > Style > Edges first; none found a threshold. Evidence: r5-s03b `07.png` and
   `08.png`, r5-s06b `05.png`, r5-s08b `05.png`. Round 4 had r4-s12 there too. Refuted by: the
   histories naming the Style tab as where marking is done (grep before claiming).
3. **T18's cost is the path tool's route, not the task.** Every tool user took 8 or 9 steps against
   a 4-step key path, and bar 11 held only on two by-hand answers. Evidence: the bar 11 table; 0 of
   74 P key uses over five rounds. Refuted by: a tool route of 5 or fewer steps in any session.
4. **Setups steer two findings.** T19's note-target problem (4 of 4) starts from the run the setup
   leaves in the inspector, and T21's surprise at "Save as" comes from setups that never save while
   histories say they did. The first is a real returning state (users come back with something
   selected); the second is a study fault. Evidence: `session.json` setups; r5-s41b, s42b grades.
5. **Bar 5 holding is not evidence about the table.** It held because no reader opened it.

## Progress against round 4 and the stop rule

Round 4: 53 of 53 valid; three bars failed (5, 9 (b), 10). Round 5: 55 of 55; two bars fail (9
(b), 10).

- The core four's successful sessions: 30 of 30 valid in round 4 (two voids), 32 of 32 now, a rise
  of 2 (the rule asks 3 or more).
- A confirmed severity 3 on a core-four task closed: round 4's unfiltered data table on T17 is fixed
  on this build by four specialist checks, but no reader met it.
- A failed bar now holding: bar 5 holds, by absence (above).

**Not stalled**, on the third test, and arguably the second; both rest on the data table fix, which
no reader has met. The skeptics should test that. If bar 5's hold is set aside, the round meets the
stall rule's words on a ceiling: every task already succeeds, so success cannot rise by 3, and what
remains open is bar 9 (b) (two words on one screen), bar 10 (the owner's label placement) and costs.

## Next steps for the studio

1. **Run r5-s02bb** (Ruth, T22 B, the same prompt and start) and score it into this round.
2. **Bar 10's severity 3 is graphty-element's label placement and layout spacing**, on the owner's
   list; the studio cannot close it alone. Re-run `claims/c-tie-click` on 8c015b806 to settle the
   tie-click half.
3. **Bar 9 (b)**: the two words over round 1's count on an edge's inspector are the scope words
   added since round 1 ("full graph", "of nodes", with a filter step on). Decide whether they earn
   their place; do not reword or move words elsewhere just to meet the count.
4. **Fix the bars script**: the "Enter on Shortest path" move (pick the row by name, not by three
   ArrowDowns) and tier 1's "a node's Values with its neighbors" click; add a graph note to the
   Notes screen so the shared "Graph" name is measured.
5. **Fix the T21 setups or histories** so a history that says "saved" starts from a saved project.
6. Add the find box's value-row route to T22's answer key.
7. Smallest fixes to weigh, each in its owning package: the value row's icon and tooltip (app); a
   pointer from Style to the find box's rules (app); Load not the filled button when every incoming
   tie repeats (app); the note form's subject choosable (app); a lasting saved state (app); a path
   route under the Analyze list that costs fewer steps (app). Script the edge-only filter's
   out-of-date words before choosing their owner.
