# Grades: first look at the Les Miserables sample (round 8, task r8-t06)

Task given to participants: "You have never used this program before. You will practice on the
ready-made network of characters from the novel Les Miserables that comes with the program, not on
your own data. Get it on screen and work out what you have: how many characters there are, how many
connections between them, whether every character can be reached from every other, and what facts
are recorded about each character."

Success state: open the sample from the start screen, reach the graph's own summary (the Data tab
of the right-hand panel with nothing selected, which the Data button in the left rail also shows)
and read 77 nodes, 254 edges and 1 connected component; then list what each character carries --
label, group, degree and betweenness -- from the Attributes list in the Data section or from the
table's column headers.

Grading rules applied:

- Success with difficulty: right answers after more than two wrong turns before the participant
  held them, or counts taken from the table instead of the summary, or a list of attributes that
  names all four but commits only to label and group and leaves degree and betweenness unresolved
  (or leans toward "the program computed them", which is wrong: both are imported from the file).
- Clicks made after the participant already held all four answers (a check in the edge table, a
  click on a character) are not counted as wrong turns.
- "Connected components 1" is drawn as a bare number. A participant who needed the tooltip to be
  sure what it means is logged, not downgraded. Nobody misread it: all twelve concluded "one piece,
  everyone reachable".
- Computing the "4 more readings" was optional; nobody did.

Each grade was checked against the participant's last renders, not only their own account. The
Data section, the summary that appeared after the Analyze click (class-project-student) and after
the Columns chooser (intelligence-analyst), and the result of clicking the "1" (recipe-recipient)
all match what the transcripts describe.

## Result

| Participant | Their own grade | Graded | Route to the summary | Attribute list given |
|---|---|---|---|---|
| alert-reviewer | success | success-with-difficulty | Data rail, first move | label, group; degree and betweenness hedged, leaned "program's math" |
| recipe-recipient | success | success-with-difficulty | Data rail, first move | label, group; degree and betweenness unresolved |
| explorer-elena | success-with-difficulty | success-with-difficulty | Table, Edges, then Data rail | label, group; degree and betweenness unresolved |
| class-project-student | success-with-difficulty | success-with-difficulty | Table, Edges, Analyze (summary appeared), then Data rail | label, group; "possibly" degree and betweenness |
| expert-emma | success-with-difficulty | success-with-difficulty | Density row, Table (Louvain tab), Nodes, Edges, Columns, then Data rail | all four, confirmed "imported, not computed" |
| genomics-cytoscape-user | success | success-with-difficulty | Table, Edges, Density row, then Data rail | all four, confirmed on degree |
| intelligence-analyst | success | success-with-difficulty | Edges, Nodes, Columns (summary appeared), then Data rail | all four, by position under Nodes |
| data-journalist | success-with-difficulty | success | Data rail, first move | all four, confirmed on betweenness |
| screen-reader-analyst | success | success | Data rail, first move | all four, confirmed on betweenness |
| ml-engineer-recsys | success | success | Data rail, first move | all four, confirmed on betweenness |
| marketing-analyst | success | success | Table, Edges, then Data rail | all four, by position under Nodes |
| nonprofit-operations-analyst | success-with-difficulty | success | Table, then Data rail | all four, confirmed on betweenness |

Totals: 5 success, 7 success-with-difficulty, 0 failure, 0 gave up (12 participants).

Every participant ended with the right counts (77, 254) and the right reachability answer. No
participant reached the overview the way the success path draws it (clearing the selection on the
canvas or pressing Esc); everyone who got there on purpose used the Data button in the left rail,
which shows the same summary.

## Why each grade

- alert-reviewer: Data rail straight after opening; read all three numbers from the summary.
  After the table she wrote "label and group are the facts on each person; everything else looks
  like the program's math", and her final answer kept degree and betweenness as a hedge. The path
  was clean; the answer to the fourth question is half right. On a strict reading ("concluded
  wrongly") this is a failure; recorded here so the tally can be re-cut.
- recipe-recipient: Data rail first, summary read, then the table and a click on the "1", which
  moved him to the Graph list with every row highlighted and said nothing. Final list: "a name and
  a group number", with degree and betweenness "listed, but I can't tell". Graded down from his own
  success for the unresolved list.
- explorer-elena: counts first from the table (Nodes, then Edges), then the Data summary; the
  tooltip on "Connected components" made her sure of reachability. After answering she clicked
  Valjean and then the wrong one of two "Data" controls, losing the selection; not counted. Final
  list leaves degree and betweenness unresolved.
- class-project-student: Table, Edges, a hover and a click on Analyze, which happened to switch
  the right panel to the summary; then the Data rail. Counts first from the table, more than two
  wrong turns, and a hedged list ("possibly degree and betweenness").
- expert-emma: five off-path moves (Density row, a table that opened on the Louvain tab, Nodes,
  Edges, the Columns chooser) before the Data rail. Counts first from the table and the Density
  result. Answer complete and confirmed by clicking betweenness ("imported, not computed").
- genomics-cytoscape-user: Table, Edges, Density row (three off-path moves; counts from the table
  first), then the Data rail and a click on degree that showed "imported, not computed". Complete
  answer. Graded down from her own success for the route.
- intelligence-analyst: Edges and Nodes tabs (counts from the table first), then the Columns
  chooser, which switched the right panel to the summary without his asking; a failed hover; a
  click on Valjean; then the wrong "Data" control, which happened to be the Data section. Complete
  answer, but by position (degree and betweenness sit under Nodes, not Results), not confirmed.
  Graded down from his own success for the route.
- data-journalist: Data rail first, all three numbers from the summary. One wrong turn (clicked
  the "1" expecting an explanation), a hover on betweenness with no tooltip, then a click that
  showed "imported, not computed". Complete, confirmed answer. Graded up from her own
  success-with-difficulty: her lost points were for wording, which this task does not grade.
- screen-reader-analyst: Data rail first, summary read and checked by hand (2 x 254 / 77 = 6.60;
  254 / 2926 = 0.0868), table, then betweenness confirmed as imported; degree assumed the same.
  No wrong turns.
- ml-engineer-recsys: Data rail first, the same arithmetic check, table, betweenness confirmed;
  degree inferred. No wrong turns.
- marketing-analyst: Table then Edges (two wrong turns; she read the counts there first), then the
  Data rail, where she read the same counts in the summary. Clicked the "1" after she had already
  concluded "one piece"; counted as a check. List complete, by position under Nodes.
- nonprofit-operations-analyst: Table first (one wrong turn), then the Data rail and the summary;
  clicked the "1" while unsure what it meant (second wrong turn); clicked betweenness to confirm it
  came from the file; the tooltip settled reachability. The edge-table visit at the end came after
  all four answers. Graded up from her own success-with-difficulty: two wrong turns is within the
  bar, and the tooltip is a wording issue this task does not grade.

Where my grade differs from the participant's: six of twelve. Four graded themselves success but
either left half the attribute list unresolved (alert-reviewer, recipe-recipient) or reached the
summary only after three or more off-path moves (genomics-cytoscape-user, intelligence-analyst).
Two graded themselves lower because "Connected components 1" is jargon (data-journalist,
nonprofit-operations-analyst), which the grading note excludes.

Single Ease Question: 5 from ten participants, 6 from intelligence-analyst and ml-engineer-recsys.
Median 5.

## Findings (evidence counts, Nielsen severity 0-4)

1. Imported attributes look like computed results. In the Attributes list, betweenness and degree
   (from the file) carry the same stacked icon as Louvain and PageRank (computed, under "Results"),
   and no tooltip says which is which. 12 of 12 raised it. 6 resolved it by clicking an attribute
   and reading "imported, not computed"; 2 decided by position (under Nodes, not Results); 4 left
   it unresolved, and those four account for four of the seven downgrades. Two participants (ml
   engineer, screen-reader analyst) first guessed the icon meant "computed". Severity 3: it is the
   only thing that cost correctness in this task.
2. The sample opens crowded with prepared work (PageRank coloring, Louvain, shortest paths, link
   prediction, a watchlist, a "For the report" folder) and lands on a style panel ("Paints 77
   nodes"). 12 of 12 commented that they could not tell the dataset from someone's prior analysis;
   none could see the edge count on the first screen. 6 went to the table first, 1 to the Density
   row, 5 to the Data rail. Severity 2.
3. Clicking the "1" beside Connected components switches the left panel from Data to the Graph
   list and highlights every table row, with no sentence saying "all 77 nodes are in one
   component". 4 of 12 clicked it (recipe-recipient, data-journalist, marketing-analyst,
   nonprofit-operations-analyst), all expecting an explanation; 2 of them called it disorienting.
   Severity 2.
4. Two controls named "Data" (left rail and the inspector tab) and two named "Table". The click
   tool flagged the ambiguity in 9 sessions; 2 participants (explorer-elena, intelligence-analyst)
   meant the inspector tab for a selected character, got the rail, and lost the selection; the
   screen-reader analyst noted they are indistinguishable by ear. Severity 2.
5. Two degrees and two betweennesses: the imported "degree" attribute beside the table's
   computed "Degree (full graph)" column (4: expert-emma, genomics-cytoscape-user,
   intelligence-analyst, class-project-student), and the imported "betweenness" beside the
   "Betweenness" row in the Graph list, whose attribute page says "Nothing uses it" (2:
   ml-engineer-recsys, screen-reader-analyst). Severity 2.
6. Panels change without being asked: clicking the Density row added rows to the Graph list and
   moved the table to a Louvain tab (2: expert-emma, genomics-cytoscape-user); opening the Columns
   chooser expanded Louvain and switched the right panel (2: expert-emma, intelligence-analyst);
   clicking Analyze switched the right panel to the summary (1: class-project-student, who said she
   could not find it again on purpose). Severity 2.
7. "Connected components 1" (bare number, logged per the grading note): no misreads. 3 used the
   tooltip to be sure (explorer-elena, intelligence-analyst, nonprofit-operations-analyst), 7 asked
   for a plain sentence such as "all 77 are connected". Severity 1 as logged; not graded.
8. "group" has no meaning on screen (values 2, 8, 4 with no definition or source). 3 of 12
   (marketing-analyst, nonprofit-operations-analyst, intelligence-analyst). Severity 1.
9. The table's "Columns: 9 of 9" chooser lists four attributes, so the count does not match what
   it shows (1: intelligence-analyst). Severity 1.

What worked: the sample card states "77 characters" before opening (cited by 12 of 12); the Data
section summary answered three of the four questions in one block for everyone who reached it;
"each a distinct pair", "Undirected" and "a higher value is a stronger tie" were each quoted as
helpful; two participants checked density and average degree by hand and found them consistent;
"imported, not computed" was named as the most useful line by every participant who found it.
