# Tier 2 round 3 scores: returning users on the real graphty app

Scored against `../../criteria.md` on build 26f3bb968e43 (graphty@0.8.61), from the graders'
`grade.md` files in `sessions/`, the four expert reports in `expert/` (controls and gestures, visual
design, accessibility, and the screenshot audit at 1200 x 900 and 900 x 700), and a run of
`tool/bars.mjs` on the frozen build made for this scoring (bars 7 (a), 8, 9 and 10's scripted
counts; `design/ui/studio/tmp/researcher/t2r3/bars/bars.json`, every planted check caught). Ease is each participant's own
rating (1 = very difficult, 7 = very easy), read from the grade or, for r3-s22, the transcript; it
never decided a grade. Steps are the screenshots after the start; on T17 and T18 they count only the
screenshots taken before the tool gave the follow-up (their times against `session.json`'s
`followUp`). Every row is in `design/ui/studio/tmp/researcher/t2r3/score.py`, which asserts 56 rows,
the build stamp of each, and that each grade it was given matches the `grade.md`; `work.py`,
`concurrency.py` and `leaks.py` beside it check the open-work lists, how many sessions ran at once,
and what each participant opened. Success paths, in the answer key's steps: T20 11, T17 7, T18 4,
T21 6, T22 3, T4 9, T19 13, T23 5, T24 3, T12R 5 (4 on this build).

All participants are simulated: one model playing composite personas, each told a history of
earlier sessions. A failure is strong evidence; a pass is weak until real people confirm it.
Keyboard-only and screen-reader use of tier 2 is untested by sessions (owner, 2026-10-07); bar 8 and
the accessibility walkthrough are the only checks on it.

## Did a dry run happen, and are participants hitting implementation faults?

**Yes, a dry run happened: every task half was piloted from its start on three builds in a row**
(`../../dry-run-r3-1.md` to `-3.md`), each build carrying the fixes the walk before it found; the
third walk, on this build, needed no fix. **But the gate before the first session was not kept.**
`plan.md` lists five gate items, each with its evidence in a `preflight.md` beside the plan. No
`preflight.md` exists, and:

- **Item 1 was not done.** The reworded T22 and T24 prompts were to run in two throwaway briefed
  sessions each, in `prompt-pilots/`, and every route they took was to be walked. There is no
  `prompt-pilots/` folder. T24 is where this cost the round: its answer key still names two
  routes from an older build (Shift-click to add the second node, or select the two "one at a
  time"), and neither exists on this build (below).
- **Item 4 was not done before the sessions.** No `bars.json` on 26f3bb968e43 existed; it was run
  for this report.
- Items 2 and 3 have no record. Item 5 holds: all 56 folders have both open-work lists.

**Mostly no: participants spent their sessions on design questions, not broken controls,** with one
exception that decided two grades. All 56 sessions ran on the frozen build with the same tool
commit (`acf3894e2c56`), no `session.log` holds anything, and no session ended on an error. Graders
recorded 285 problems; about 20 are the study tool's (mostly its click-by-name refusing a name
two things share, and the lost step notes below), and about 20 more are seven implementation faults
of the build:

| Fault                                                                                                                                                       | Sessions                         | Severity | Why the dry run did not remove it                                                                                                    |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Shift-click (and Ctrl-click) on a node replaces the selection instead of adding to it; on an edge, Shift adds. graphty-element's node click always calls `select` (`NodeBehavior.handleClick`), while the canvas's edge branch reads `shiftKey` (`Graph.ts`) | r3-s41, s42, s43, s44            | 3        | The answer key lists Shift as a T24 route but was last checked on an older build; the prompt pilots that would have walked it were not run |
| A second Find path replaces the first path run with no notice                                                                                               | r3-s25, s27 to s32; controls 2   | 2 to 3   | Known since round 2 and kept as the app's behavior; no change made                                                                   |
| A rule that matches nothing still replaces the current selection                                                                                           | r3-s15                           | 2        | No walk ran a second rule over a selection                                                                                           |
| Opening a node's Degree row selects the node and all its neighbors                                                                                         | r3-s41, s42, s49                 | 1 to 2   | Recorded in the key as this build's behavior                                                                                          |
| A Width added to a selection's style starts at 24, and the selection band grows with it and hides the new line until the selection is cleared               | r3-s15                           | 2        | The third walk styled a selection by Color only                                                                                      |
| The Values row "Select where shared_chapters is 1..." is cut at the panel edge; the whole text is only in a tooltip                                         | r3-s10, s12, s14, s16            | 2        | The walks typed a rule, never a bare number                                                                                          |
| The same value at two precisions (table 0.04, panel 0.03959)                                                                                                | r3-s22                           | 1        | One session                                                                                                                          |

Every other problem is where a feature lives, what a word means, or what the screen does not say.

**The study's own faults this round, and what they changed:**

- **The leak check read nothing, in every session.** Each `leaks.json` reads `"transcripts": []`,
  `"calls": 0`, and every grader reported it as "no leaks". `real.mjs` finds a participant's log by
  its opening prompt naming the participant's own folder (`tmp/studio-sessions/...`) and the words
  "study participant". The runner's prompt named the round's `sessions/<id>` folder instead, so no
  log matched. **Re-run here against each participant's own log** (`leaks.py`; the 56 logs found by
  the folder their prompt names, one per session): 55 clean, between 15 and 56 tool calls each;
  **r3-s10 listed the study tool's folder and read the head of `with-browser.sh`** while waiting
  for a browser slot. Neither names a task, a control or an answer, and no participant opened
  `tasks.md`, `answers.md`, a persona file or another session. So r3-s10 is kept, with that named;
  the leak round 2 had is closed this round.
- **Five transcripts lost their step notes** (r3-s03, s10, s13, s44, s45 hold only the end and the
  debrief; r3-s48 was rewritten afterward). The runner told participants to write `transcript.md`
  in the round's `sessions/<id>` folder; `--end` deletes that folder before copying the
  participant's own folder over it (`copyBack` in `real.mjs`), so notes written there during the
  session are gone. Graders rebuilt each route from the screenshots, which are complete; none was
  voided.
- At most 4 sessions ran at once (`concurrency.py`), over 1.7 hours.
- **The tool's click by name refused a name two things share in about 25 sessions** (a column
  header and its role box, "minutes" or "km", in 7 of 8 T20 sessions; the attribute list's option
  and the tree row on T17; the Graph rail button and the inspector title on T19; a node row and its
  ties in the find list). Each cost one step and changed nothing on screen. Graders recorded these
  as accessibility-name problems; whether two controls share an accessible name is bar 8's
  scripted check, below.

## Sessions

56 run, 56 valid, 0 void. 54 of 56 succeeded (96%; target 85%): 47 S, 7 SD, 2 F, 0 G. Two sessions
were decided in part by a build defect (r3-s42, r3-s43: the Shift-click fault above); without them,
54 of 54.

## Bars (all must hold in one round)

| #   | Bar                                     | Round 3                                                                                                                                                                                                                 | Status                         |
| --- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| 1   | Each task's success rate, each half     | T24 2 of 4 (needs 4 of 4). Every other task and half meets its floor                                                                                                                                                   | **Fails** (T24)                |
| 2   | Earlier work kept                       | `work.py` over all 56 lists: nothing the participant started with is gone in any session, except the replaced source in each T21 session, which the participant chose. A second path run replacing the first: see the check | Holds (check below)            |
| 3   | Confirmed severity-4 problems open      | 0. No participant left, and no wrong answer was reported unknowingly                                                                                                                                                    | Holds                          |
| 4   | Confirmed silent commit on success path | 0. Two graders called the second path run a silent commit; it changes the drawing, the run row and the Values, so it fits the bar's definition no more than in round 2                                                  | Holds                          |
| 5   | Numbers that disagree with drawing/data | 0 misread. Two readings for the skeptics (below)                                                                                                                                                                        | Holds (check below)            |
| 6   | Confirmed false "done"                  | 2, both T24 and the same mechanism (r3-s42, s43): a shortest-path run between the two people used to mark them, with one of the two selected                                                                           | **Fails** (see the T24 check)  |
| 7   | The loaded weight read as loaded        | (a) `bars.mjs`: 290 runs (every catalog algorithm, each meaning, with and without the weight column, directed and undirected), 0 unfinished, 0 wrong readings; planted wrong readings caught. (b) 0 sessions read a weight the wrong way round                                                                                                                                                                                                                 | Holds                      |
| 8   | Automated accessibility check           | axe: 1 serious violation, the find results' scroll area (below). No two controls share an accessible name; focus held after all 14 scripted actions. By hand, the accessibility specialist found 3 severity-3 faults the script does not press                                                                                                                                                                                                                 | **Fails**                      |
| 9   | App words at rest                       | (a) 42 on tier 1's screen (limit 50). (b) Three of four tier 2 screens fell below round 1's count; an edge's inspector is 31 against 30                                                                                                                                                                                                                 | **Fails** ((b), by one word)                      |
| 10  | Expert walkthrough and screenshot audit | 3 confirmed severity-3 findings open (below), and the four specialists' finding counts rose from 124 to 139                                                                                                             | **Fails**                      |
| 11  | Cost of the core four                   | T20, T17, T18 and T21 each within 2x; T18 7 against 8                                                                                                                                                                   | Holds                          |

**Check on bar 2.** Seven T18 sessions ran Shortest path twice (r3-s25, s27 to s32); each second run
replaced the first chain on the drawing, in the run list and in the Values, with no notice. Graders
recorded it as a severity 2 problem in all seven, and the controls expert rated it 3 (finding 2).
It is not in the lists because the first chain was made during the session; scored as holding, as
in round 2, and confirmed as a problem below. Read round 1's way ("a run ... gone at the end without
the participant choosing to remove it"), bar 2 fails in 7 sessions.

**Check on bar 5.** Neither was misread, and each is labeled somewhere:

- After Replace and before Rerun, the old histogram, value count and Top 10 stay at full contrast
  (r3-s17, s19, s20, s21, s23, s24; visual 9). The out-of-date marks are a gray bar line, the key's
  titles and a wordless icon on the run's row. 0 of 8 read the old values as current.
- With a filter step on, the Edge table still reads "254 edges" and lists hidden ties with no mark
  (r3-s38). And a step that hides only edges leaves the chip and the step row at "20 of 20 nodes"
  (controls 3, visual 5): a count that names nodes beside a drawing that changed. No session made
  such a step.

**Check on bar 6 and T24's two failures.** Both are graded F with a false "done" because the key
asks for exactly the two ends selected, and at the end only one was. In both, the participant ran a
one-hop Shortest path between the two people, which drew both black with their tie and nobody else
(`r3-s43/13.png`), and reported done. The prompt was reworded for this round from "the ones that
stand out" to "point out Gus and Ivan, and nobody else, on the drawing"; a path drawn between them
does that by the prompt's words, and the key's S still requires a selection. Both turned to the path
only after Shift-click on the second person replaced the first (the build fault above), and neither
found "Select endpoints" in the tie's unlabeled "..." menu. So three things decide these two grades:
a build fault, a hidden command, and a prompt that does not ask for what the key measures. Bars 1
and 6 are scored as the rules and the graders give them; both skeptics should weigh how much of the
failure is the study's.

### Bar 1, per task

| Task | Success | Half A | Half B | Needs            | Holds  | S / SD / F / G |
| ---- | ------- | ------ | ------ | ---------------- | ------ | -------------- |
| T20  | 8 of 8  | 4 of 4 | 4 of 4 | 7 of 8, 3 a half | yes    | 8 / 0 / 0 / 0  |
| T22  | 8 of 8  | 4 of 4 | 4 of 4 | 7 of 8, 3 a half | yes    | 4 / 4 / 0 / 0  |
| T21  | 8 of 8  | 4 of 4 | 4 of 4 | 7 of 8, 3 a half | yes    | 8 / 0 / 0 / 0  |
| T18  | 8 of 8  | 4 of 4 | 4 of 4 | 7 of 8, 3 a half | yes    | 7 / 1 / 0 / 0  |
| T17  | 8 of 8  | 4 of 4 | 4 of 4 | 7 of 8, 3 a half | yes    | 8 / 0 / 0 / 0  |
| T24  | 2 of 4  | 1 of 2 | 1 of 2 | 4 of 4, 2 a half | **no** | 0 / 2 / 2 / 0  |
| T23  | 4 of 4  | 2 of 2 | 2 of 2 | 4 of 4, 2 a half | yes    | 4 / 0 / 0 / 0  |
| T4   | 3 of 3  | 2 of 2 | 1 of 1 | 3 of 3           | yes    | 3 / 0 / 0 / 0  |
| T19  | 3 of 3  | 2 of 2 | 1 of 1 | 3 of 3           | yes    | 3 / 0 / 0 / 0  |
| T12R | 2 of 2  | 1 of 1 | 1 of 1 | 2 of 2           | yes    | 2 / 0 / 0 / 0  |

T24 without the two sessions a build defect decided in part: 2 of 2. **These are the first round 3
credits for the three routes round 2 added**, with participants reaching only their briefing (the
leak check above): T20, 8 of 8 set what the weight means while opening the file, before any run
(r3-s01, the re-run of round 2's voided r2-s05, among them); T21, 8 of 8 replaced the file in
place from the source (5 by a right-click on its row, 3 by its inspector's "..."); T22, 8 of 8
reached a rule through the find box's hints. **T18 passes with one session that never opened the
path tool** (r3-s26, both questions worked out by hand from the find box, SD), the same route
r2-s26 took on the same prompt.

### Bar 7 (a), measured

`bars.mjs` on 26f3bb968e43: every algorithm in the element's catalog on `friends.csv` loaded with
each weight meaning (closer, farther, capacity, not set) and with no weight column, directed and
undirected: 290 runs, 0 unfinished, 0 read a meaning in the wrong sense, 0 that said they read no
weight answered differently without the column. The planted wrong readings were caught, so the
check is trusted.

(b) 0 sessions read a weight the wrong way round. T20: 8 of 8 chose "Farther" at load; none chose
Closer or Capacity. T21: 8 of 8 left "Higher means: Not set" on the Replace page, most quoting the
line under it ("reads a higher weight as closer") as their reason; both runs' Made with say "read as
closer".

### Bar 8, measured

`bars.mjs` on 26f3bb968e43 (dark scheme), every check caught its planted failure first (a clipped
name, a raw code, an image with no text, two buttons with one name, focus dropped):

- **The find results' scroll area is not keyboard reachable** (axe `scrollable-region-focusable`,
  serious, "find box with results open"), the same as in round 2. Every other tier 1 and tier 2
  screen has 0 violations; round 2's 12 px step checkbox (`target-size`) is gone.
- **No two reachable controls share an accessible name** on the tier 2 screens. So the ~25 refused
  clicks by name in the sessions are the study tool matching visible text (a column header and its
  role box, an option and a tree row), not an app defect.
- Focus held after all 14 scripted actions (adding, ticking and deleting a step, Escape from the
  step editor, the Path popover and the find box, Find path, saving a note, each Load, Rerun, Filter
  to neighbors, Select endpoints).

By hand the accessibility specialist found three severity-3 faults, each from one specialist:
picking Shortest path from the Analyze list with Enter drops focus to the page, 3 of 3 times
(`PathForm.tsx` marks its first field with `data-autofocus`, which Mantine reads only when a popover
opens, and here the popover was already open); the Add page's repeated-ties line is not announced
or tied to Load, so Enter on Load doubles every tie unheard; adding a Color to a selection's new
layer drops focus to the page, and the next Escape clears the selection. The script's focus list
includes neither picking an analysis nor styling a selection.

### Bar 9 (b), measured

Against round 1's counts (round 2 in brackets): the returning rest screen 49, limit 53 (55); a
path run's inspector 61, limit 66 (70); the neighbor list 33, limit 36 (38); **an edge's inspector
31, limit 30 (34)**. Round 3 cut words on every screen, but the edge's inspector is still one over:
under the screen's filter step its key now reads "Shortest path, full graph" and the header "of
nodes", round 3's own scope words, and nothing was removed to make room. Tier 1's screen: 42 (limit 50).

**Corrected counts (2026-10-10).** The counts above included the data's own names: the source
"friends", the file "team.csv", the column "weight", "Ava's", "Les Miserables". `bars.mjs` now
leaves out every name the session holds for the data (each source's name and its file name without
the extension, its tables, the columns the file brought, each node's name), matched as written, so
the app's own "Weight" label still counts. Re-measured on each round's frozen build
(`design/ui/studio/tmp/t2r3-r4-04/bars-r1-9462/`, `bars-r2-8f0d/`, `bars-r3-26f3/`):

| Screen                                 | Round 1 (the limit) | Round 2 | Round 3 |
| -------------------------------------- | ------------------- | ------- | ------- |
| Tier 1's screen at rest (limit 50)     | 36                  | 36      | 36      |
| The returning rest screen              | 49                  | 51      | 45      |
| A path run's inspector                 | 63                  | 67      | 58      |
| The neighbor list with Hops and Follow | 33                  | 36      | 31      |
| An edge's inspector                    | 27                  | 31      | **28**  |

`tool/bars-limits.json` now holds round 1's corrected counts. The verdict is unchanged: round 3 is
under round 1 on three screens and one word over on the edge's inspector; round 2 was over on all
four.

### Bar 8, the focus actions and the find list, scripted (2026-10-10)

`bars.mjs` now runs the two actions the accessibility specialist found by hand, each proven first
against a planted drop of focus to the page, and a scroll check proven against the active option
planted out of view. On 26f3bb968e43 (`tmp/t2r3-r4-04/bars-r3-26f3/sessions/focus-and-scroll-1440x900/`):

- **Focus falls to the page** after Enter on Shortest path, reached by typing "shortest path" in the
  Analyze list (the fourth row; Enter on the first row, Betweenness, keeps focus on Run).
- **Focus falls to the page** after choosing Color from Add to Line on a rule selection
  (`=weight >= 4`, 12 edges).
- **The find list keeps its active option in view**: 18 ArrowDowns past the 8 visible rows leave
  "Eli -> Farah" inside the list. So axe's `scrollable-region-focusable` on the find list's viewport
  (tier 1's "find box with results open") is recorded as an exception: the list is a combobox driven
  by `aria-activedescendant`, and the keys reach and show every row with no tab stop of its own.
  The script excuses that hit only while this check holds.

Both focus faults are still there on the current branch build (9ac5f9f3e60f).

**Bar 10's scripted counts** (both widths, every bar 8 screen and the long-names screens): 0 texts
cut with no way to read them whole (12 more are cut but readable by a tooltip, a title or a copy
on screen), 0 visible codes or field paths. The glossary's rejected words are not counted by the
script; that part of bar 10's scripted check does not exist yet.

### Bar 10, the confirmed severity-3 findings

Confirmed means two specialists, a specialist and a session, or the script.

1. **Drawn names cover each other and the ties a task asks about.** "Chloe" over "Farah" (Farah's
   sphere sits behind Chloe's, so a click at her center selects Chloe), "Dev" over "Eli", "Hana" on
   Ivan's dot; the "Stadium" label hides the Station-Stadium tie. Audit 1 and 3, visual 1; sessions
   r3-s41 (Hana's label over Ivan) and r3-s42 (a click on the tie selected Stadium). Owner:
   graphty-element (label placement, and a layout that spaces centers, not sizes). On the owner's
   list; reported as a class.
2. **A second Find path replaces the first path run with no notice.** Controls 2 (severity 3);
   seven T18 sessions (r3-s25, s27 to s32, each severity 2). The controls expert also found that
   Undo brings the first run back with the second run's From and To in its Made with (controls 1,
   severity 3, one specialist; a script should confirm it).
3. **The Add page's repeated-ties warning is plain text, unannounced, and Load stays the primary
   button.** Accessibility 2 (severity 3, screen-reader users); controls 8, visual 3 and audit 7
   (each severity 2). No session met the page: every T21 participant replaced the file from the
   source.

Severity 3 from one specialist only: long names cut at both canvas edges (audit 2; no study file has
long names); the key growing over the "Depot" label and node after a color is added (visual 2;
round 2's sessions rated it 1); the two accessibility focus drops in bar 8 above; Undo restating the
wrong path inputs.

**Counts.** The specialists' own totals rose from 124 to 139: controls 42 to 42, visual 25 to 34,
accessibility 24 to 25, audit 33 to 38. Most of the rise is screens round 3 added (the repeated-ties
line, the disabled "Filter to neighbors", the find list's two highlighted rows) and detours walked
for the first time (a second path, Undo). The bar's "never rises" is scored on these totals because
no confirmed count exists for round 2.

**Found by both the sessions and the experts:** drawn names; a second path replacing the first; the
stale histogram and Top 10 after Replace; the disabled "Filter to neighbors" not saying it is on;
the neighbor list at 2 hops not saying how far each name is; backticks in rules and in layer
names; "As the file says" on a CSV; the Path popover covering the drawing; Shortest path ranked
below other analyses in the Analyze list; "4 hops" against "5 nodes, 4 edges"; a selection band
hiding a new Width; the left panel naming the file and the header the project. **Only the
experts:** the Undo restating wrong inputs, an edge-only filter counted in nodes, Tab then Escape
losing an edit, focus faults, the repeated-ties line, long names, the 900 x 700 layout, spacing and
emphasis. **Only the sessions:** Shift-click not adding a node, "Select endpoints" hidden, a plain
number offering only "is equal to", where Replace and Neighborhood live, what a connection is
(T12R), a note's subject following the inspector, nothing lasting saying a project is saved. As in
rounds 1 and 2, the experts find how a reached screen behaves; the sessions find whether a
returning user reaches it.

### Bar 11, cost of the core four

| Task | Success path | Median steps (successful) | 2x  | Within | Steps                       |
| ---- | ------------ | ------------------------- | --- | ------ | --------------------------- |
| T20  | 11           | 13                        | 22  | yes    | 12, 12, 13, 13, 13, 13, 15, 17 |
| T17  | 7            | 7.5                       | 14  | yes    | 7, 7, 7, 7, 8, 9, 11, 11    |
| T18  | 4            | 7                         | 8   | yes    | 4, 7, 7, 7, 7, 8, 8, 9      |
| T21  | 6            | 8                         | 12  | yes    | 6, 6, 6, 8, 8, 9, 9, 13     |

T18, the bar round 2 failed (8.5), holds: 7, or 7 without r3-s26, which never opened the path tool.
Every T18 and T20 session that ran a path still reached it through the Analyze list and its filter
(3 steps where the P key is 1) but one: r3-s31 used a node's "Path between...", the first use of that
door in three rounds. T20 fell from 15 to 13; T21 from 9.5 to 8.

## Measures (targets, not gates)

| Measure                                     | Target                    | Round 3                                                                                                                                                                                                     |
| ------------------------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| All sessions                                | >= 85%                    | 54 of 56 (96%)                                                                                                                                                                                              |
| Ease, mean (median)                         | >= 5.0; no task below 4.0 | 5.82 (6) overall; core four 5.97. T24 4.50, T22 5.75, T19 5.67, T18 5.88, and 6.00 for T20, T21, T17, T23, T4, T12R. 48 of 56 ratings are exactly 6, so the scale says little                             |
| Steps against the success path, other tasks | median <= 2x              | T22 5 of 6 (round 2: 16), T23 6.5 of 10, T4 12 of 18, T19 16 of 26, T12R 4.5 of 10 (8 against its 4-step path on this build) within. **T24 7.5 against 6** (its two successes)                              |
| Wrong turns per session                     | median <= 1               | 0 (37 of 56 with none). T24 median 5; T22 0.5; T17 1                                                                                                                                                        |
| Recovery                                    | >= 70%                    | 17 of 19 sessions with a wrong turn succeeded (89%); the two that did not are T24's                                                                                                                        |
| The second time (follow-ups)                | path + 1, 0 wrong turns   | **Met in 16 of 16**, measured for the first time: T17 3 or 4 steps (path 4), T18 4 or 5 (path 4; r3-s25's 6 includes a check after the answer), 0 wrong turns on any follow-up                             |
| Script, console and request errors          | 0                         | 0 (every `session.log` empty)                                                                                                                                                                              |

**The second time, first measured clean.** Every follow-up reached its participant from the tool,
after the main answer (screenshot times against `followUp`). On T18, 6 of the 7 who used the tool the
first time reopened Shortest path from the Analyze list's Recent entry, so the repeat cost one step
less. On T17, every participant edited the step they had just made (row, value, "Save and turn on")
and unticked it to bring everyone back.

**First moves and broken habits.** No broken habit was confirmed: in every session the first place
the history named led on, or the history named none.

- **T20**: 6 opened the file with "Open project or file...", the route their histories name, and
  r3-s07 dropped it on the window (r3-s03's first move is not recorded: its step notes were lost);
  both lead to the import page, where all 8 then set the column's role.
- **T21**: the run's Values first in 8 of 8 (to note the top name), then the Data place. The file
  name in the Graph panel title and the Graph inspector's "..." were tried first in r3-s18 (as in
  r2-s39). Nobody opened the newer file through "Open project or file...", so nobody met the Add
  page's repeated-ties line or its Replace button.
- **T22**: the find box first in 8 of 8. On A, a column name ("minutes") got "Start with = to select
  by a value" (r3-s09, s11, s13) and a condition without "=" became a runnable row (r3-s15). **On B,
  4 of 4 typed the number "10" first**; the box offered only ties of exactly 10 and a cut-off
  "Select where shared_chapters is 1...". r3-s10 and s16 took it, selected 2 ties, and started
  again. r3-s14 and s16 then typed ">=10", which got "No match" with a generic example to retype.
  Typed "=" unprompted: 0 of 8.
- **T17**: the Data place found by 8 of 8, after the Graph place's "Everything" or the toolbar's
  Layout button in 5 (r3-s33, s34, s38, s39, s40); r3-s36 said he would have looked under Graph.
- **T18**: the analysis button first in 5 of 8, the find box in 3 (r3-s27 went on to the analysis
  button; r3-s31 to the node's "Path between..."; r3-s26 never left it). Words typed into the Analyze filter:
  "path" (4), "shortest" (2), "shortest path" (2), "quickest" (1, T20).
- **T23 and T12R**: the find box, then the node's panel. Neighborhood was found in the node's "..."
  menu (r3-s46, s47, s48) or by the Degree row's arrow (r3-s45); T12R's list by the Degree row (2 of
  2).
- **T24**: the line clicked first in 3 of 4 (r3-s44 hovered it first); each hit it on the first or
  second try.

**Doors.** Path: the Analyze list in 14 of the 15 sessions that ran a path for T18 or T20, a node's
"Path between..." 1 (r3-s31), the P key 0 (43 chances across three rounds, none keyboard-only).
Filter: the Filters "+" in 8 of 8, an attribute's "Filter to..." 0 of 8 (16 chances over two rounds
with this door; round 1 used it). Replace: the source row's right-click 5 of 8, the source
inspector's "..." 3, the Add page's Replace 0. Notes: the Notes place's "+" 3 of 3. A tie: the
drawing 4 of 4.

**T22, select by a condition.** 8 of 8 reached a rule through the find box; 0 typed "=" first. T22
met its bar on both halves, so the "select where" dialog is not reconsidered. Asked to "point out"
instead of "stand out", 1 of 8 styled the selection (round 2: 5 of 8); its layer was named by the
rule, "minutes >= `10`", with the backticks, in the list and the key (r3-s15).

**T21, positions after Replace.** On friends the drawing kept its shape; on the team file the nodes
moved. 0 of 8 read moved dots or the old run's values as lost or current work.

**T23.** "Filter to neighbors" as a plain command: no one asked whether it would delete, but 4 of 4
were unsure afterward, of something else: the button turns gray as if unavailable (r3-s45), whether
it changed the saved project or only the view (r3-s47), how to undo it (r3-s48), whether it hides
or deletes (r3-s46, before the press).

**T12R.** Neither participant read a tie's value as the person's answer; r3-s55 noticed the two
different 17s (Javert's Degree 17 and the Javert-Valjean tie's 17 shared chapters) and kept them
apart.

## Confirmed problems by task

Confirmed: two or more participants, a build defect seen in two, or an expert finding a session also
shows. Severity is the highest the confirming sessions support; a one-session finding is listed only
at severity 2 or more. Opinion-only problems are held one level down. Deterministic layout overlaps
count once per dataset.

### Across tasks

- **Sev 2** -- No names are drawn unless the setup turns them on, so a route, a chain or a joined
  table can be checked only against a list (8 of 8 T20; r3-s25, s27 to s31; r3-s09; r3-s49 to s51;
  r3-s52, s53; r3-s48). Where names are drawn they overlap (bar 10, finding 1).
- **Sev 2** -- Shortest path is not on the Analyze list's first screen and is ranked under
  Betweenness when "path" or "shortest path" is typed (r3-s01, s03, s06, s07, s27, s29, s32;
  visual 8, accessibility note).
- **Sev 2** -- "As the file says" loads a CSV directed, and Follow "All" is never explained
  (8 of 8 on T20; r3-s25, s27 on T18). It changed no answer.
- **Sev 2** -- The key's "PageRank, full graph" under a filter does not say whether sizes describe
  the drawn subset (r3-s33, s34, s39; r3-s45, s46, s47).
- Sev 1 -- The Degree row's arrow selects the node and all its neighbors unasked (r3-s41, s42,
  s49).
- Sev 1 -- "Degree", "hops", "weight", "Capacity" are not the readers' words (most T20, T18, T23
  and T12R sessions).

### T20, a weight that means "farther"

- **Sev 2** -- A whole-number column loads with the role "Attribute" and "Weight: none (each edge
  counts 1)", Load is enabled, and "Higher means" appears only after Weight is picked (8 of 8;
  r3-s01 and s03 said an immediate Load would have counted links instead). Also T4 (r3-s49, s50, s51).
- Sev 1 -- "Closer / Farther / Capacity" read only through the sentence under them (r3-s01, s04,
  s06, s07).
- Sev 1 -- The route's last tie ends under the Clinic node with no visible arrowhead (r3-s03, s05).

### T22, pointing out everything that meets a condition

- **Sev 3** -- A number typed alone offers only an "is equal to" match ("Select where
  shared_chapters is 10 (2)") and nothing toward "10 or more"; r3-s10 and s16 selected the 2 ties of
  exactly 10 before starting again (4 of 4 on B typed "10" first).
- **Sev 2** -- That row is cut to "Select where shared_chapters is 1..." at the panel edge (r3-s10,
  s12, s14, s16).
- **Sev 2** -- A condition with no column (">=10") gets "No match" and a generic example to adapt
  and retype, not the participant's own condition as a rule (r3-s14, s16).
- **Sev 2** -- A number in a rule gets a red "Put numbers in backticks:", worded as a refusal,
  with programmer vocabulary, although the corrected row under it works (r3-s09, s11, s13; controls
  9; bar 10 round 2's finding 2, lowered).
- **Sev 2** -- The result is only a selection; participants could not tell whether it lasts or how
  to keep it (r3-s09, s11, s13).
- Sev 1 -- A plain column name offers "=minutes" (every link with a value) as the marked option
  (r3-s09, s11; controls 23).
- Sev 1 -- No count before Enter, and no way to see a column's values to check the boundary
  (r3-s11, s13, s14, s15).
- One session, sev 2: a rule that matches nothing replaces the selection (r3-s15); a Width of 24
  is hidden by the selection band until the selection is cleared (r3-s15).

### T21, rerunning on a newer file

- **Sev 2** -- Replace has no visible control: it is on the source row's right-click menu, a "..."
  that shows on hover, or the source inspector's unlabeled "..." (8 of 8 found it by guessing).
- **Sev 2** -- After Replace, nothing says in words that the run is out of date until it is opened;
  the run row keeps its old count and a wordless icon (r3-s20, s22, s23).
- Sev 1 -- The stale histogram, value count and Top 10 carry no mark of their own (6 of 8; bar 5
  check).
- Sev 1 -- "Higher means: Not set" on the Replace page made 6 of 8 stop and reread (r3-s17, s18,
  s20, s21, s23, s24); all left it correctly.
- Sev 1 -- The new people are drawn saturated blue with no key entry until Rerun (r3-s18, s22,
  s24).
- Sev 1 -- The left panel names the new file while the header keeps the project's name (r3-s17,
  s18, s23, s24; audit 14); r3-s24 did not know which file a saved project would hold.
- Sev 1 -- Plain Save opens "Save as" on a project that was never saved (r3-s19, s22).

### T18, the fewest people in between

- **Sev 2** -- A second Find path replaces the first with no notice (bar 10, finding 2).
- **Sev 2** -- The answer is "4 hops" in the tree and "5 nodes, 4 edges" in the Summary; neither
  says introductions or people in between (r3-s25, s27, s29).
- Sev 1 -- Tie arrows point against the chain; only Follow "All" says ties count both ways (r3-s25,
  s27).
- Seen again from round 2 (r2-s26, r3-s26), sev 2: a returning user who starts from the find box
  gets no hint that the program can work out the chain, and a find-box hit marks nothing on the
  drawing.

### T17, narrowing to strong ties

- **Sev 2** -- Nothing on the Graph place points to filtering (r3-s33, s34, s38, s39, s40 took 1 or
  2 wrong turns there; r3-s35, s36 said so).
- Sev 1 -- No count before "Add step" (r3-s36, s38).
- Sev 1 -- Overlapping dot pairs make a count by eye short (friends: r3-s35, s37, s39).
- One session, sev 2: after a step hides a tie, the inspector still shows that tie (r3-s33); the
  Edge table still lists hidden ties under "254 edges" (r3-s38).

### T24, one tie on the drawing

- **Sev 3** -- Shift-click and Ctrl-click on a node replace the selection; nothing says how to pick
  two people (r3-s41 to s44; a build defect, see the table above).
- **Sev 3** -- "Select endpoints" is only in the tie's unlabeled "..." menu; r3-s42 and s43 read the
  tie's inspector and never opened it, and r3-s44 called finding it luck.
- **Sev 2** -- A Shortest path run used to mark the two paints both ends and leaves a run and two
  layers while one person is selected; both participants took it as done (r3-s42, s43; bar 6
  check).
- Sev 1 -- Hovering a tie shows nothing (r3-s42, s43, s44).

### T23, a step or two away

- **Sev 2** -- The neighbor list is reachable only through the node's unlabeled "..." menu or the
  Degree row's arrow (4 of 4).
- **Sev 2** -- At Hops 2 the list does not say who is one step away and who two (r3-s48; controls
  18, visual 16).
- Sev 1 -- After the press, "Filter to neighbors" turns gray like an unavailable control, and
  nothing nearby says how to undo it (r3-s45, s48; controls 27, visual 6, audit 6, accessibility
  4).
- Sev 1 -- "Hops" is guessed (r3-s46, s47).

### T4, two spreadsheets as one network

- **Sev 2** -- "Leave out" is preselected for the unmatched row with Load enabled; which choice is
  active is shown only by a fill (r3-s49, s50, s51).
- Sev 1 -- A found node is not marked on the drawing, and the dots carry no names (r3-s49, s50,
  s51).
- Sev 1 -- The count column loads as a plain attribute (T20, first item).

### T19, notes that stay with the work

- **Sev 2** -- A new note takes whatever the inspector shows as its subject, and the form cannot
  change it; 3 of 3 opened "About PageRank" first (r3-s52, s53, s54; round 2: 3 of 3).
- **Sev 2** -- Nothing lasting says whether the project is saved; "Local only" reads the same
  before and after, and the start screen warns the browser can clear projects (r3-s52, s53, s54).
- Sev 1 -- "Save local copy..." gives no message in the app (r3-s53, s54).
- Sev 1 -- The reopened project lands on the Graph place, and its "1 note" counts only the graph's
  own note (r3-s52, s53).

### T12R, one person and their ties

- **Sev 2** -- Nothing on the node or its neighbor list says what a connection is (shared chapters,
  marriages) (r3-s55, s56).
- Sev 1 -- The find list mixes the node with every tie that holds its name, and they look alike
  (r3-s55, s56).

## What worked

- **T20**: 8 of 8 S, all on the load-time route (round 1: 0 S; round 2 not creditable). Median steps
  15 to 13, wrong turns 0. Every run row of a weighted path now shows its total ("minutes 14", "km
  7.5"), which round 2's "4 hops" did not.
- **T21**: 8 of 8 S, 0 wrong turns in 6; nobody read old values as current or moved dots as lost
  work; every participant kept the weight's meaning for the right reason.
- **T22**: 8 of 8, steps 16 to 5, and nobody reached a dead end: a column name, a condition without
  "=" and a refused rule each led on to a rule that Enter runs.
- **T17 and T18 the second time**: 16 of 16 within the target with 0 wrong turns; T18's Recent
  entry made the repeat one step shorter.
- **T18**: bar 11 now holds (median 7 against 8).
- **T23, T4, T19, T12R**: every session succeeded, at or near the success path.
- **Fixed since round 2 and seen holding**: Color and Width on a selection's layer start at the
  highlight look and stay visible after the selection clears; a layer from a rule is named by the
  rule; the step checkbox takes a click 6 px outside its box; Tab out of the step editor commits;
  two Escapes keep focus in the find box; Follow by arrow keys no longer changes Hops; a half-made
  step survives the inspector moving on (controls and accessibility "What holds").

## Candidate insights (for the skeptics)

1. **A task word that does not name the measured outcome lets a reader reach a different, valid
   one.** T24 asked to "point out" two people; two of four did it with a path drawn between them,
   which the key's selection rule fails. Both turned to the path after Shift-click did not add the
   second person. Evidence: T24 above, `r3-s43/13.png`. Priming: the prompt's own words; the
   finding is about the study as much as the app.
2. **A returning user types the threshold before anything else.** On Les Miserables 4 of 4 typed
   "10" first; the box offers only "is 10", cut off, and 2 took it. On bus stops, where the column
   is named in the prompt, 3 of 4 typed "minutes" first. Evidence: T22 first moves. Priming: "10"
   and "minutes" are the prompt's data words.
3. **The rule language is copied, never learned.** 0 of 8 typed "=" unprompted, here and in round
   2; every rule came from a hint, a correction or an example, and its backticks read as code in
   the box, the layer list and the key. Evidence: T22. Priming: low.
4. **The second time is cheap when the program remembers the first.** 16 of 16 follow-ups within
   the target; T18's Recent entry is the one place the app offered the earlier action, and 6 of 7
   used it. Evidence: the second-time measure. Priming: none; the follow-up came from the tool.
5. **A feature with no visible control is found by a guess every time.** Replace (8 of 8 by
   right-click or an unlabeled "..."), Neighborhood (4 of 4 by "..." or the Degree arrow), Select
   endpoints (2 of 4 never found it), Filters (5 of 8 looked on the Graph place first). Evidence:
   T21, T23, T24, T17. Priming: low; no prompt names a control.
6. **Repeat work needs the earlier answer kept beside the new one.** Seven T18 participants lost
   their first chain to the second run without notice; T21 participants copied the old ranking by
   hand (r3-s19). Same as round 2. Priming: low.
7. **Readers check a drawn answer against names, and the drawing gives none.** Every T20 route and
   most T18 chains were checked only in lists. Same as round 2. Priming: none.

## Progress against round 2 and the stop rule

The core four's successful sessions rose from 31 of 31 valid to 32 of 32 (+1, fewer than the 3 the
stall rule asks). Round 2's one confirmed severity-3 problem on a core-four task (T21: opening a
newer copy offers only "Add", and Load doubles every tie) is lowered: the Add page now says how many
ties repeat and offers Replace beside Load, and no session met it (the experts still rate the
warning's weight 2 to 3). Bar 11, which failed in round 2, now holds. So the round progressed by the
rule, and the study is not stalled. It is not done: bars 1 (T24), 6 (T24), 8, 9 (b) and 10 fail.
Round 3 is also the first round whose route credits (T20, T21, T22) and second-time measure can be
trusted, because the leak is closed and checked.

## Next steps for the studio

- **Fix the study tool's two faults before round 4**: the runner's participant prompt must name
  the participant's own folder (or `real.mjs` must match the round's `sessions/<id>`), and a leak
  check that reads no log must fail, not pass; `--end` must not delete notes written to the round's
  folder. Keep the gate: no session starts without `preflight.md`, and the prompt pilots run.
- **T24 before its next run**: walk every route the key accepts on the build; decide whether
  "point out" or the key changes so they measure the same thing (a prompt or key change, logged).
- Fixes go to the confirmed severity-3 findings in their owning package: Shift-click adding a node
  to the selection like an edge (graphty-element); "Select endpoints" reachable without the
  unlabeled menu; a bare number in the find box offering "or more" beside "equal to"; a second path
  kept or announced; the Add page's warning announced and Replace made the primary choice when
  every tie repeats; the two focus drops (picking Shortest path, styling a selection).
- Seed the next dry run with this round's detours: a second rule over a selection, Undo after a
  second path, a number typed alone, Shift-click on two nodes, a path used to mark two nodes.
