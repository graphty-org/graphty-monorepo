# Grades: open your own common graph file and check it all arrived (round 8)

Task given to participants: "You have never used this program before. A colleague sent you a
network file of the characters in Les Miserables and the chapters they share; you saved it as
miserables.gexf in your Downloads folder. Bring it into the program and, before you do anything
else with it, check that all of it arrived: how many characters, how many connections, and that
nothing was dropped on the way in."

What counts as success: open the file picker from the first-launch screen (Open project or
file..., Ctrl+O or the drop line), tick miserables.gexf and press Open; on the import page read
the "Makes" line (77 nodes, 254 edges) and the match report ("77 rows; every id is unique");
state 77, 254 and that nothing was left out; press Load. The success path is the first-launch
screen (app-b/#/start-screen/first-run), the import page (app-b/#/data-page/graph-file) and the
loading card (app-b/#/canvas-and-states/loading).

How this was graded. In the skeleton the loading card never finishes, so the graded session
ends at Load. Everything a participant did after Load -- clicking Everything, Data, Table or the
"from miserables.gexf" link to get past the stuck card -- lands on the skeleton's loaded Les
Miserables state, which is the sample with its worked examples (PageRank coloring, a Louvain
result, notes, a watchlist). That is a skeleton artifact, not something a real import of this
file would show, so it does not lower a grade. Grades are by what the participant did up to
Load and what they concluded about the counts.

## Outcomes

| Participant | They said | Graded | Why |
|---|---|---|---|
| Explorer Elena | success with difficulty | **success** | Direct path: Open, miserables.gexf, Open, read nodes 77 / edges 254, opened the edges table, Load. Stated 77 and 254 and that every id was unique and every connection had both ends. Her difficulty was all after Load. |
| Tom, the recipe recipient | success with difficulty | **success** | Same direct path. Read "77 rows; every id is unique" and "254 rows; every edge has both ends" before Load and stated both counts. Unsure whether the weight column was "dropped" -- he raised it as a question, not a conclusion that data was lost. |
| Nadia, the alert reviewer | success with difficulty | **success** | Direct path, both match reports read before Load, 77 and 254 stated, "nothing dropped" concluded from the match reports. |
| The class-project student | success | **success** | Direct path. "The import screen answered the whole task before Load." |
| Grace, the nonprofit operations analyst | success with difficulty | **success** | Direct path. Stated 77 and 254 and that nothing was dropped from the two match-report sentences. A post-Load scare over "rows removed from list view" was resolved on her own and did not change her answer. |
| Ruth, the data journalist | success with difficulty | **success** | Direct path. Stated 77 and 254, unique ids, both ends. Wanted a plain "kept N, skipped 0" sentence but did not conclude anything was lost. |
| Mara, the Gephi holdout | success with difficulty | **success (hedged)** | Direct path, 77 and 254 stated, "every node id unique, every edge has both ends... that's the check." Borderline on "nothing left out": she said she could not establish whether duplicate edges were merged or rows skipped, because no line says "0 skipped". Graded success because she read the match report the criteria name and drew no wrong conclusion; her hedge is evidence for the missing-line finding below, not a failure. |
| Renata, the Cytoscape holdout | success with difficulty | **success** | Direct path. "On the letter of the task, yes": 77, 254, unique ids, both ends. |
| Morgan, the screen-reader analyst | success with difficulty | **success** | Direct path, both match reports read in words, 77 and 254 stated, nothing dropped "by inference". |
| Analyst Alex | success with difficulty | **success** | Direct path; numbers matched his NetworkX reference (77, 254). |

**Totals: 10 success (one hedged), 0 with difficulty, 0 failure, 0 gave up.**

No one opened the Les Miserables sample card (all ten named it and deliberately skipped it), no
one opened miserables-edited.graphml, and no one needed New from data... or the Tables "+".
Every participant also opened the edges table before Load, which is the only place "every edge
has both ends" appears; this was reading, not a wrong turn.

Why nine of ten rated themselves lower than graded: the loading card never finished, and the
screen they reached by clicking past it carried PageRank, Louvain and notes they never made.
Both are skeleton artifacts. Their self-ratings (Single Ease Question 4 to 6, median 4.5) measure
the post-Load skeleton more than the import task, and should not be read as a score for the
import page. Every participant rated the import page itself well ("the best part", "better than
Gephi's import report", "exactly what a fact-checker wants").

## Findings on the graded routes

Severity uses Nielsen's 0-4 scale. Counts are participants out of 10 who raised it unprompted.

1. **"Weight: none (each edge counts 1)" sits next to a numeric value column** (import page,
   edges table). 10 of 10. Every participant read the value column (1, 8, 10, 6) as the number
   of shared chapters and asked whether it was being ignored or dropped; three (Alex, Mara,
   Renata) named the downstream risk, a wrong weighted result later with no warning. Nobody
   found how to change it on that page. After Load the skeleton says "Weight: value", so the
   two screens contradict each other -- that contradiction is partly the loaded-state fixture,
   but the import-page line on its own is enough to cause the doubt. Severity 3.
2. **No explicit "nothing was skipped" line.** 8 of 10 (all but the student and Grace) said the
   import page reports what it read, not what the file held versus what was kept, and that they
   had to infer "nothing dropped" from the counts matching and "every edge has both ends".
   Several asked for one copyable sentence: "file had X nodes and Y edges; loaded X and Y;
   skipped 0" (Nadia, Ruth, Elena, Mara, Morgan), plus duplicates merged and self loops (Mara,
   Morgan). Morgan also wants that sentence somewhere reachable after Load, not only on the
   preview. Severity 3 for this task, since "nothing was dropped" is the task.
3. **"Direction: As the file says" never says what the file says.** 2 of 10 (student, Mara).
   Gephi's report prints the graph type. Severity 2.
4. **The "from miserables.gexf" source link opens a screen titled "Edit: miserables.gexf".**
   9 of 10 clicked it; 4 (Nadia, Tom, Ruth, Renata) read "Edit" as a threat to the colleague's
   file or as the wrong place ("tells me what the file holds, not what landed"). Mara found the
   way back to the report useful. "Apply is off: Nothing has changed yet" and "Edit canceled:
   nothing changed" reassured those who saw them. Severity 2.
5. **"group" is typed as text although its values are numbers.** 2 of 10 (Renata, Mara); Renata
   cannot tell whether the file declared it as an integer, which is the silent-type-change
   problem she checks for. Severity 2.
6. **Only the first 8 rows of each table are shown before Load.** 1 of 10 (Grace wanted to scroll
   all 77 like a spreadsheet). Severity 1.
7. **"nodes" and "edges" rather than characters and connections.** 7 of 10 mentioned the
   translation; all made it correctly. Severity 1.

## Off the graded route (recorded, not graded)

- **Skeleton artifacts, 10 of 10.** The loading card never finishes; "Reading the data..." stays
  in the left list even after a drawing appears; the screen reached after Load is the sample's
  loaded state, with PageRank coloring, Louvain, betweenness, degree, 1 to 7 notes dated before
  the file was opened, a watchlist and a "For the report" folder. Every participant asked
  whether they were looking at their file or the sample, and three (Mara, Renata, Grace) said it
  would stop them using the product for client or donor data. This is the fixture, not a design
  decision, but because it fired for everyone, the study should give an own-file import its own
  clean loaded state before the next round, or end this task's script at Load.
- **Three names for one graph on the loading screen** (Les Miserables in the header,
  Co-appearances in the inspector, Graph in the list): raised by Mara, who could not click
  "Co-appearances" because it was truncated. Skeleton artifact, not graded.
- **Two controls called "Data"** (the left rail button and the inspector tab): Morgan says a
  screen reader announces "Data button" and "Data tab" with no way to know which is which;
  the click tool also reported the ambiguity in four sessions. Severity 2, an accessibility
  finding for the loaded state.
- **"1 row not listed still paints" / "Show rows removed from list view"** read as data loss by
  Grace until she opened it. 1 of 10, severity 1, on the sample state.
- **Tooltip on Everything, "Built-in rows keep their names"**, meant nothing to Grace. 1 of 10.

## Evidence

Transcripts: study/round-8/sessions/r8-t03--<persona>.md. Renders:
tmp/round-8-sessions/r8-t03--<persona>/. Success-path renders: shots/tasks/r8-t03/01.png to
03.png.
