# Grade: session r5-s38b -- Dev (tier 1 graduate), team (T21 B), the list was updated

**Grade: S** (success). The last screen (`10.png`) matches the answer key's B end state. The left
panel reads "Graph team-v2.csv" with the PageRank row at 14; the inspector shows PageRank "ran Oct
11, 10:35:25 AM", Distribution "14 of 14 have a value, 0.02333 to 0.1339", Top 10 "Di 0.1339, Hal
0.1305, Ed 0.1245", and Made with Ran "Oct 11, 10:35:25 AM", Weight "weight (read as closer)". The
canvas key reads "Size: PageRank" and "Color: PageRank", 0.02333 to 0.1339, with no "out of date"
mark, and every node is colored. Dev's sentence gives all three answers right: 14 people now, Hal
first before (0.129), Di first now (0.134), Hal second (0.131).

Build seen: `8c015b806086 graphty@0.8.65` (`session.json`), the frozen build named at the top of the
criteria, at 1440 x 900, no uncommitted changes in the tool. Start: setup `team-ranked` (team.csv
loaded, PageRank run, sized and colored by it).

## The answer against the key

- **People now (right).** 14, read from the Replace page "Was 12 nodes, 16 edges; now 14, 21"
  (`06.png`) and "14 of 14 have a value" after Rerun (`08.png`).
- **First before (right).** Hal 0.1293, read from the Values' Top 10 before anything changed
  (`02.png`; the same list still shows in `07.png`). Not a `stale-read`: it was read before the
  replacement and reported as the old list.
- **First now (right).** Di 0.1339, read after Rerun (`08.png`), with the run's time changed from
  10:34:13 AM (`07.png`) to 10:35:25 AM (`08.png`).
- **Replaced, not added.** The Replace page made 14 nodes and 21 edges (`06.png`), not the 37 edges
  the Add page's Load would have made (`05.png`). `work.json` lists team.csv under "gone" and
  team-v2.csv as the only source; the run "pagerank PageRank (label Influence)" and all three layers
  are kept. That is the replacement the task asks for, not `work-lost` (key, "For graders reading
  `work.json`").

## Measures

- **Route:** not the key's Data page route. Dev opened team-v2.csv through Main menu, "Open project
  or file...", which leads to the "Add to team" page (`04.png`). On this build that page carries a
  "Replace team.csv" button beside Load (not in the key's notes, which say the Add page offered
  only Cancel and Load on earlier builds). Dev pressed it, which opened the same "Replace:
  team-v2.csv" page the key's route reaches (`06.png`), then Replace and Rerun. Same end state, no
  addition made and undone, so not a detour.
- **Steps:** 7 `real.mjs` steps to the answer (Values, Main menu, Open with upload, Add, Replace
  team.csv, Replace, Rerun) against the key's 6, plus 2 for an unasked Save (Control+S, Save). The
  extra step is "Add" on the Add page (below).
- **Wrong turns:** 0. Pressing "Add" for the 2 unmatched nodes on the Add page was a sensible move
  there; the Replace page that followed computed its own counts (14, 21, no unmatched line,
  `06.png`), so it neither helped nor hurt. One extra step, not a wrong turn.
- **False "done":** none. "Done" with 14 people, Hal before and Di now is true on `08.png` and
  `10.png`; "my ranking layer, its colors and sizes all stayed" is true (`work.json`, `10.png`).
  "Saved team in this browser" is on screen (`10.png`). truth-on-screen holds.
- **Silent commit:** none.
- **Numbers that disagree:** none. Row 14, "14 of 14", Top 10 and key range agree.
- **Wording echo:** Dev quoted "assumed a higher weight means closer" (from Made with) as the reason
  to leave Higher means at "Not set" so the comparison stays like for like (transcript step 05,
  `08.png`). Recorded as the key asks; it did not change the result.
- **Moved drawing:** the replacement laid the drawing out again; Dev did not read it as lost work.
  He read the two blue dots as "the new people, not colored because they weren't in the old
  ranking" -- correct, not read as a highlight or a selection (`07.png`).
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. Ten screenshots for ten steps; `leaks.json` shows no leaks
  over 23 calls.

## Problems

| #   | Severity | Kind          | Problem                                                                                                                                                                                                                                                                                                                                         | Evidence                                                                                          |
| --- | -------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 1   | 3        | trap          | Opening a newer copy of the loaded file from the main menu lands on "Add to team" with Load as the blue primary button. Load adds the 16 shared edges a second time ("the load makes 14 nodes and 37 edges"). "Replace team.csv" sits beside it as a plain secondary button. Dev found it only after reading the yellow duplicate warning. | `04.png`, `05.png` (footer "37 edges", warning, Load blue, "Replace team.csv" plain); transcript steps 04-05 |
| 2   | 2        | comprehension | The Add page leaves the two new people out by default ("Leave out" pressed, header "team-v2 adds 0 nodes"), and explains it as "5 edge rows name 2 nodes missing from the node rows" -- but the file is an edge list with no node rows. Dev linked it to the new people only because the prompt said two had joined; he says he would otherwise have loaded a team with nobody new. | `04.png` (header "adds 0 nodes", "Leave out" pressed, "21 rows, 5 left out"); transcript step 04 and "What confused me" |
| 3   | 1        | comprehension | "Open project or file..." gives no sign before the file is chosen whether it will add to or replace the open work; Dev was "nervous that Open will throw away my project" and learned the answer only from the page heading.                                                                                                             | `03.png` (menu: New project, Open project or file..., Open sample, Save...); transcript step 03 and "What confused me" |
| 4   | 1        | legibility    | Between Replace and Rerun the two new nodes are drawn saturated blue and the key does not explain them, while the old Top 10 and histogram stay at full contrast. Dev read both correctly, helped by the "Data changed since this run" bar and "out of date" in the key titles. Known on this half.                                     | `07.png`; transcript step 07                                                                      |

Problem 1 repeats a round 2 finding on this route (`round-2/sessions/r2-s33/grade.md`, problem 1):
the build now offers "Replace team.csv" on that page, which is what let Dev succeed here, but the
doubling Load is still the primary action. Problem 2 is new to this route: it does not occur on the
Replace page, which counts the new nodes in (`06.png`).
