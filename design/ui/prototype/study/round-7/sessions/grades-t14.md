# Grades: bring in a saved file and check it arrived whole

The task: "A colleague saved the network of characters onto your computer for you. Bring it into
graphty, starting from the screen you see, and check it arrived whole. The data on screen is a
sample: characters of the novel Les Miserables, linked when they appear in the same chapter."

The intended path: on the start screen, Open project or file... (or a drop) leads to the Data page
with the file already read (miserables.gexf, GEXF detected, nodes and edges tables with their match
reports). The participant presses Load, the graph comes up, and its inspector (nothing selected)
shows Nodes 77 and Edges 254, which the participant checks.

Grading rule: success means the Data page was read, Load was pressed, and the participant checked
77 nodes and 254 edges in the inspector. Success with difficulty means they picked the sample first
and backed out, loaded before reading the Data page, or got there after a wrong turn or a long
search. Failure means the network never came in, or they never checked what arrived. Grades go by
what was on screen at the end and what they concluded, not by how they rated themselves.

## Read this first: the skeleton cannot show the intended path

In the clickable skeleton, Open project or file... on the start screen does not open the Data
page. It goes straight to the finished Les Miserables project, the same screen the sample opens:
PageRank colors, Louvain groups, two saved shortest paths, a Watchlist, a "For the report" folder
and four notes. No file is chosen, the Data page never appears, Load is never pressed and the
loading screen never shows. The drop hint only shows the "drag over" state, and New from data...
opens a different dataset (door entries). So no click sequence from the start screen reaches the
Data page for this file, and none of the five participants could have taken the intended path.

What this round therefore measured is only the second half of the task: given a graph that is
already in, can people find out whether it arrived whole? It says nothing about whether the Data
page, read before Load, does its job. The task must be run again after the start screen's Open
(and the drop) lead to the Data page for miserables.gexf.

Everyone ended with the network on screen and checked its counts, but none of them saw anything
before it loaded. That matches "loaded before reading the Data page", so every participant is
graded success with difficulty. The difficulty here was put there by the skeleton, not by the
design, so these grades are not evidence about the import step.

## Results

| Participant | Their own verdict | Grade | Why |
|---|---|---|---|
| Explorer Elena | success with difficulty | success with difficulty | Open landed on the finished project. She guessed that Data on the left rail held the counts and read "miserables.gexf, 77 nodes, 254 edges", "254 rows, 254 edges" and the Summary (Nodes 77, Edges 254). Then she went back to try New from data..., found the door-entries table, cancelled, and opened the source view: "77 rows; every id is unique". Her conclusion is correct: 77 characters, nothing dropped. She had no expected edge count to compare against, so for the edges she relied on rows matching edges. |
| Gephi user | success with difficulty | success with difficulty | Open landed on the finished project. She clicked the project title and got the inspector's graph summary: Nodes 77, Edges 254, density 0.0868, average degree 6.6, highest degree 36. She checked each one in her head and they are right. Then she went to Data, the table and the source view, where the match reports read "77 rows; every id is unique" and "254 rows; every edge has both ends" (06.png). Her conclusion, that it arrived whole, is correct. She found that the weight is described two different ways (finding 3). |
| Recipe recipient | success with difficulty | success with difficulty | Open landed on the finished project. He found the counts only because he clicked the title, which turned the right panel to the graph summary: Nodes 77, Edges 254, 1 component (02.png). He followed "from miserables.gexf" to the source view and read both match reports. His conclusion is correct, and he hedged correctly that he could not be sure the file was his colleague's. He said himself that the click that found the counts was luck. |
| Screen-reader analyst | success with difficulty | success with difficulty | Open landed on the finished project, with no file name announced. She went to Data, where the summary gave 77 and 254 and she checked them against NetworkX. In the source view the match reports confirmed unique ids and that every edge has both ends. She then looked in the title menu for a file path and found none. Her conclusion is correct: the data is whole, but she cannot vouch that this is the colleague's file. |
| Marketing analyst | success with difficulty | success with difficulty | Open landed on the finished project. He went to Data and then the Table (77 nodes, Valjean on top at degree 36), then to the source view and its edges list, where both match reports were showing (06.png). His conclusion is correct. Like the others, he was unsure whether he had opened his colleague's file or the sample, because there is one of each with the same name. |

Totals: 0 success, 5 success with difficulty, 0 failure, 0 gave up. All five checked 77 and 254
and drew the right conclusion. Nobody reached the Data page before loading, because the skeleton
gives no way to get there. Ease scores out of 7: 5, 4, 5, 4, 5 (Elena, Gephi user, recipe
recipient, screen-reader analyst, marketing analyst).

## Findings

Severity uses Nielsen's scale: 0 means not a problem, 4 means a usability catastrophe.

1. **Open skips the import step and gives no "you opened X" moment (5 of 5).** Every participant
   said, unprompted, that they never chose a file and could not tell whether they had their
   colleague's file, an old project or the sample with the same name. This is mostly a fault in
   the skeleton (see above), so it is not a measured design finding. But it carries one real
   lesson for the design: the screen people land on after opening something says nothing about
   what was opened or from where. The project menu has no file path either (screen-reader
   analyst). Severity 4 for this study, because it makes the task untestable. Fix the skeleton
   before the task is run again. Whether the loaded graph should also confirm what it came from
   is a design question the rerun should answer.
2. **The proof that it arrived whole is found by search, not handed over (5 of 5).** The counts
   were one panel away (Data on the left rail, or the right panel after clicking the title). The
   best proof, the match reports "every id is unique" and "every edge has both ends", sat three
   levels down in the source view. Every participant asked for "77 nodes, 254 edges, nothing
   missing" at the moment the file opens. In the intended design the Data page shows exactly
   this before Load, so this finding may disappear once the skeleton is fixed. Until the rerun,
   it stands as a severity 3.
3. **Weight is described two ways (4 of 5: Gephi user, marketing analyst, recipe recipient,
   screen-reader analyst).** The graph summary says Weight "value, stronger". The source view's
   edges header says "Weight: none (each edge counts 1)", right next to a value column holding 8s
   and 10s. All four said that until they knew whether PageRank and degree were weighted they
   would not publish or present a number. Two of them said this alone would keep them on their
   current tool. Severity 3. It is a contradiction in content the skeleton shows, so it holds
   whatever the wiring. One of the two lines is wrong; pick which and make both agree.
4. **Checking the data means opening a screen called "Edit" (5 of 5).** The source view is titled
   "Edit: miserables.gexf" and has Cancel and Apply. All five wanted to look, not edit, and
   hesitated. "Apply is off: Nothing has changed yet" and "Esc to leave" reassured three of them.
   The recipe recipient would not press Cancel because "it sounds like it might undo the import".
   Severity 2. Opening the source just to look should not be framed as editing.
5. **Where a column came from is unclear (1 of 5: Gephi user).** On the Data page, degree and
   betweenness are listed as attributes, as though they came from the file, while PageRank and
   Louvain are listed as results. She asked who computed betweenness and on what data. A single
   voice, but from the participant who knows import provenance best. Severity 2. Watch for it in
   the rerun.
6. **Column types read differently than expected (2 of 5: Gephi user, screen-reader analyst).**
   group was imported as text, not an integer, and source and target show as text. Both said it
   was acceptable for GEXF. Severity 1.
7. **The finished project made everything afterward look doubtful (5 of 5).** A "freshly
   received file" that already held paths, a watchlist, a report folder and notes made people
   doubt where the file came from. This is a consequence of the skeleton reusing the sample
   project, not a design finding. It goes away when Open leads to the Data page.
8. **New from data... opened someone else's data (1 of 5: Elena).** She expected her own file and
   got the door-entries table with warnings, read it as someone else's data, and cancelled. Her
   doubt grew. This is a fault in the skeleton (the button opens a fixed dataset) and a single
   voice. Not graded as a design finding.

## What worked

- "Files are read on this computer and never uploaded" on the start screen and "Local only" in
  the top bar (5 of 5, each unprompted; three called it the first question they would have asked).
- The match-report wording, "77 rows; every id is unique" and "254 rows; every edge has both ends"
  (5 of 5).
- "254 rows, 254 edges" on the source row on the Data page, read as "nothing was dropped" (4 of 5).
- Summary numbers that an expert can check in their head: density, average degree, highest degree
  (Gephi user, screen-reader analyst).
- "Direction: As the file says", read as "nothing was quietly flattened" (screen-reader analyst).

## Next step

Before the next round, the start screen's Open project or file... and its drop should lead to the
Data page for miserables.gexf (the start-screen section). Then run this task again with fresh
participants, so the Data page, Load and the loading screen are tested at last. Keep the five
transcripts above as evidence about checking a graph that has already loaded, not about importing.
