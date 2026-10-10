# Grade: session r1-s28 -- Dana (regular analyst), task T21 B (team.csv to team-v2.csv)

Build: buildStamp `946256efb876 graphty@0.8.56` (session.json), the frozen study build. Setup ran
cleanly (setup.log: the file chooser was answered with team.csv). No tool fault.

## Grade: S

Graded from the last screenshot (09.png) and the transcript, not from the participant's rating.

| Required (answer key, T21 B)             | On screen in 09.png                                                      | Reported      |
| ---------------------------------------- | ------------------------------------------------------------------------ | ------------- |
| Replaced, 14 nodes and 21 edges          | Graph header "team-v2.csv"; Edges tab "21 edges"; layer row "PageRank 14" | 14 people     |
| Rerun                                    | Ran "Oct 8, 11:36:26 PM" (was 11:34:55 PM); no "Data changed" bar         | yes           |
| First before: Hal (0.1293)               | 02.png, Top 10 starts "Hal 0.1293"                                        | Hal 0.1293    |
| First now: Di (0.1339), then Hal, Ed     | Top 10 "Di 0.1339, Hal 0.1305, Ed 0.1245"; key 0.02333 to 0.1339; "14 of 14 have a value" | Di 0.1339 |

The work was kept: the PageRank layer, its size and color by PageRank and the key all survive the
replacement (07.png, 09.png). The first name was read before the replacement, from the run's Values
(02.png). No detour that undid anything, no new project, no addition left in place.

## Claims

- **False "done": none.** "Finished: yes", with 14 people, Hal before and Di now, all matching the
  screen in 09.png.
- **Stale read: none.** At 07.png and 08.png the key and Top 10 still show the old run (Hal 0.1293);
  the participant noticed the out-of-date mark and did not report a name from that state.
- The participant read the two blue dots as the two new people with no ranking (correct), not as a
  highlight or a selection.
- The participant did not click the "Reset Damping factor to default" button.

## Wrong turns: 1

- Step 4: clicked the team.csv row on the Data page, expecting a replace control in the source's
  panel (04.png). The panel shows the file's table and "Source, Added: Nodes 12, Edges 16", no
  replace action. Recovered by right-clicking the row (step 5).

Step 3 (opening the Data page) is on the success path. Picking "Replace with file..." over
"Edit source..." in the menu was right the first time.

## Problems

| # | Problem | Severity | Evidence |
| - | ------- | -------- | -------- |
| 1 | Between Load and Rerun the drawing, the key (0.03273 to 0.1293) and the run's Values and Top 10 (Hal first, "12 of 12 have a value") stay on screen at full contrast with nothing on them saying they are out of date. The only marks are a wordless history icon on the PageRank row and the "Data changed since this run" bar, which appears only once the run's inspector is opened. The participant caught it, but said a screenshot taken then would have been wrong without her knowing. | 3 | 07.png (Graph inspector open, no bar visible; key and sizes old), 08.png (old Top 10 under the bar); transcript "What confused me", second item |
| 2 | Replacing a file is reachable only from the source row's right-click menu (or its "..." button, which appears only on hover). Neither the Data page nor the source's own panel shows a replace action at rest. The participant found it only "out of Excel habit" and said someone without it would be stuck. | 2 | 03.png, 04.png (no replace action), 05.png (menu: "Edit source...", "Replace with file..."); transcript step 4 to 5 |
| 3 | The two new people are drawn as small saturated blue dots, a color the key does not explain (the key shows only the orange PageRank ramp). The participant guessed right, but nothing on screen says why they are blue. | 2 | 07.png, 08.png (two blue dots, key shows only orange) |
| 4 | The Replace page's "Higher means: Not set / Closer / Farther / Capacity" asks a question the task does not need; the participant could not tell what "Capacity" would change and expects to wonder about it every month. | 1 | 06.png; transcript step 6 and "What confused me", third item |

## Implementation issues

None. Every command landed on the first try; no script error, failed control or console error
appears in the transcript or the screenshots. The tool's note at step 5 ("name matched two
controls, took the list item") is the tool resolving an ambiguous name, and it took the intended
control. The problems above are design findings about what the screen shows, not defects that
stopped the participant.
