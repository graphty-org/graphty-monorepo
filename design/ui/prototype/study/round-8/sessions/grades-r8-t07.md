# Grades: rank the characters and read the top three (round 8, task r8-t07)

Task given to participants: "You have never used this program before. You will practice on the
ready-made network of characters from the novel Les Miserables that comes with the program, not on
your own data. Have the program put the characters in order of how much the whole network depends
on them, and tell us the top three, in order, and what the order was based on."

Success state: the participant opens Analyze (toolbar flask, right-click > Analyze..., or Quick
actions), picks a ranking measure, runs it, and names the top three from the result's Top 10 list
together with the measure's name. For PageRank on the ready-made project the run button reads
"Update PageRank row" and opens the PageRank row's Data tab (app-b/#/inspector-measure-row/data):
Valjean, Myriel, Gavroche.

Success with difficulty: the top three read from the PageRank row the project already holds, or
from the node table sorted by a measure, or reached after more than two wrong turns.
Failure: a top three guessed from the drawing, or named without saying what ranked them.

Grading rule for a known skeleton gap: a Betweenness run lands on a row that stays "Running" and
never finishes (the skeleton has no finish for it). That stop is logged below and not counted as a
design wrong turn; the participant is graded on what they did next.

Each grade was checked against the participant's last render, not only their own account.

## Result

| Participant | Measure chosen | Their own grade | Graded | Ended on | Answer |
|---|---|---|---|---|---|
| explorer-elena | PageRank (by the "Start here" badge) | success-with-difficulty | success | PageRank row, Data tab, Top 10 | Valjean, Myriel, Gavroche -- PageRank |
| recipe-recipient | PageRank (by the badge) | success-with-difficulty | success-with-difficulty | node table sorted by PageRank | Valjean, Myriel, Gavroche -- PageRank |
| alert-reviewer | Betweenness | success-with-difficulty | success-with-difficulty | node table sorted by Betweenness | Valjean, Myriel, Gavroche -- betweenness |
| class-project-student | Betweenness, gave up on it | success-with-difficulty | success-with-difficulty | node table, default sort by degree | Valjean, Gavroche, Marius -- degree |
| nonprofit-operations-analyst | Betweenness | success-with-difficulty | success-with-difficulty | node table sorted by Betweenness | Valjean, Myriel, Gavroche -- betweenness |
| data-journalist | Betweenness | success-with-difficulty | success-with-difficulty | node table sorted by Betweenness | Valjean, Myriel, Gavroche -- betweenness |
| analyst-alex | Betweenness | success-with-difficulty | success-with-difficulty | node table sorted by Betweenness | Valjean, Myriel, Gavroche -- betweenness |
| fraud-analyst | Degree, then Betweenness | success-with-difficulty | success-with-difficulty | node table sorted by Betweenness | Valjean, Myriel, Gavroche -- betweenness |
| gephi-holdout | Betweenness | success-with-difficulty | success-with-difficulty | node table sorted by Betweenness | Valjean, Myriel, Gavroche -- betweenness |
| screen-reader-analyst | Betweenness | success-with-difficulty | success-with-difficulty | node table sorted by Betweenness | Valjean, Myriel, Gavroche -- betweenness |
| supply-chain-analyst | Betweenness | success-with-difficulty | success-with-difficulty | node table sorted by Betweenness | Valjean, Myriel, Gavroche -- betweenness |
| bioinformatics-researcher | Betweenness | success-with-difficulty | success-with-difficulty | node table sorted by Betweenness | Valjean, Myriel, Gavroche -- betweenness |

Totals: 1 success, 11 success-with-difficulty, 0 failure, 0 gave up (12 participants).

Every answer is correct for the measure the participant named; nobody guessed from the drawing and
nobody left the measure out. The grade spread comes from where the answer was read, not from wrong
answers.

## Why each grade

- **explorer-elena -- success.** Opened the table first (one detour, a degree list she could not
  interpret), then Analyze > PageRank > "Update PageRank row", and read the Top 10 (render 08:
  1 Valjean 0.0754, 2 Myriel 0.0428, 3 Gavroche 0.0358). That is the success path and its success
  screen, reached with one wrong turn. She used the toolbar tooltip to confirm the flask was
  Analyze, which is ordinary discovery, not rescue. Her own "difficulty" is doubt about whether
  PageRank fits the question, which the task does not grade.
- **recipe-recipient -- success-with-difficulty.** Reached the PageRank form, then refused both
  buttons ("Update" sounded like changing the file) and backed out to the table, where he sorted by
  the PageRank column (render 07 confirms the arrow on PageRank and Valjean, Myriel, Gavroche).
  Table sorted by a measure.
- **class-project-student -- success-with-difficulty.** Ran Betweenness and hit the skeleton stop,
  tried the existing Betweenness row, the Data page and "Move above", then gave up on betweenness
  and handed in the table's default degree order (render 11: table "sorted by degree", Valjean 36,
  Gavroche 22, Marius 19). The answer is correct and names degree, and the student said plainly that
  it is degree. Graded as a read from the table sorted by a measure, with many wrong turns. The
  program never put anything in order for this participant; the order was already on screen.
- **The nine betweenness participants -- success-with-difficulty.** All ran Betweenness from
  Analyze, all hit the skeleton stop, and all ended by sorting the table's existing "Betweenness
  (full graph)" column (render example: gephi-holdout 04, Valjean 0.570, Myriel 0.177, Gavroche
  0.165). That column is an attribute imported with the sample file, not the result of their run.
  Each named betweenness and explained it in plain words. Graded on what they did after the stop:
  a read from the table sorted by a measure. The gephi-holdout went to the table column first and
  ran Betweenness only afterwards, to get a computed number; same grade.
- **fraud-analyst** additionally reached a true success screen along the way: searching Analyze for
  "hub" and picking Degree opened a Degree Top 10 (render 08: Valjean 36, Gavroche 22, Marius 19).
  She rejected it as "most connected, not depends on" and moved on, so it does not change her grade,
  but it shows the degree branch of the success path works.

## Skeleton stops (not design findings)

- **The Betweenness run never finishes.** 10 of 12 started one (everyone except explorer-elena and
  recipe-recipient). The "Betweenness 2" row stayed on a spinner although the form said "Under a
  second". This stop is why the betweenness participants could not reach the success state.
- **The running row disappears.** 6 of the 10 saw "Betweenness 2" vanish from the list after opening
  the Columns menu, opening the table or pressing Escape, with no message. Most likely a replay
  artifact of the skeleton, but every one of them then doubted which run their numbers came from.
- **"Move above" did nothing visible** on the existing Betweenness row (class-project-student).

## What this task measured, and what it did not

The success path was written around PageRank, but the task's words ("how much the whole network
depends on them") read as betweenness to 10 of 12 participants. Every participant with any graph
vocabulary, and three without it (alert-reviewer, nonprofit-operations-analyst, supply-chain-
analyst), chose Betweenness from its one-line description, and Betweenness is the one measure the
skeleton cannot finish. So the round mostly measured the skeleton gap and the table, not the
run-and-read-the-Top-10 path. Only explorer-elena exercised the intended result screen. Before the
next round, the skeleton needs a finished Betweenness result (a Betweenness row with a Top 10), or
the task wording needs to stop pointing at a measure the skeleton cannot complete.

## Design findings

Counts are participants out of 12 who hit or named the problem. Severity is Nielsen's 0-4 scale.

| # | Finding | Count | Severity |
|---|---|---|---|
| 1 | After sorting the node table by another column, the caption still reads "sorted by degree" (confirmed in gephi-holdout 04 and recipe-recipient 07). Several said they would have screenshotted a mislabeled table for a report. | 9 | 3 |
| 2 | A table column does not say where it came from or how it was computed: the sample's betweenness is an imported file attribute but its header reads "Betweenness (full graph)" like a computed result, with no weighting, normalization or run date. Participants could not tell their run's numbers from the file's; three recognized the values as unweighted textbook numbers although the form they ran promised 1/value weighting. | 9 | 3 |
| 3 | The "Start here" badge on PageRank picks the measure for people without graph vocabulary. Both participants who chose PageRank did so only because of the badge and said so; eight others named the badge as pushing toward a measure that does not answer "depends on". | 10 | 3 |
| 4 | The table's summary line "Valjean is first on all three measures; Gavroche is in the top 3 on all three" does not name the three measures, and only two measure columns fit on screen. | 11 | 2 |
| 5 | Two controls named "Data" (the left rail and the inspector tab) side by side; participants aiming for the tab landed on the rail page and lost their place. Same-name controls also hit "Betweenness" (list row behind the Analyze popover) and "Table". For the screen-reader participant the names are indistinguishable by ear. Partly amplified by the click-by-name harness, but the duplicate accessible names are real. | 8 | 2 |
| 6 | The sample opens with many measures, groups and folders already in it, so "have the program put them in order" was ambiguous (the table was already sorted) and participants could not separate their own work from what was there. | 8 | 2 |
| 7 | A wanted column sat off the right edge of the table; participants hid other columns to reach it, and the Columns menu lists only file attributes, not the measure and rank columns taking the room. | 5 | 2 |
| 8 | Selecting a running measure row leaves the inspector on the graph summary: nothing says what is running, how far along, or where the result will land. | 10 | 2 |
| 9 | Analyze's search box says "Search, or say what to find" but matched nothing for "depends on"; it is a name filter. | 2 | 2 |
| 10 | After "Update PageRank row", the result showed "Ran Sep 28" and the drawing did not change, so explorer-elena doubted her run had happened. This is the intended success screen failing to confirm the action. Single voice, but on the success path. | 1 | 2 |
| 11 | Clicking a row in the left list reset the table's sort to degree. Single voice. | 1 | 2 |
| 12 | The Betweenness entry's description is cut off in the popover; the clear wording ("pass through a node") is only in a hover tooltip. Small clock icons next to Betweenness and Closeness have no name. | 3 | 1 |
| 13 | The weight options (Stronger / Farther / Capacity, "uses 1/value") were skipped unread by every non-specialist; harmless because the defaults were kept. | 7 | 1 |

## What worked

- Analyze's "Rank nodes and edges" list with a one-line description per measure let 10 of 12 map
  "depends on" to a measure in seconds, including three participants with no graph vocabulary.
- The Betweenness form's sentence "Betweenness reads a weight as distance: it uses 1/value" was
  singled out as better than Gephi, NetworkX and Cytoscape by all four specialists (analyst-alex,
  gephi-holdout, screen-reader-analyst, bioinformatics-researcher) and by the data-journalist.
- The "#1 of 77" rank columns and "(full graph)" in every header were read and trusted.
- On the one run that completed, the Top 10 panel was exactly what the participant wanted to paste
  into a message.
