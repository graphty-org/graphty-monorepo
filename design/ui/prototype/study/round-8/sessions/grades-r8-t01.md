# Grades: first sitting with the Les Miserables sample (task r8-t01)

The task asked a first-time reader to open the Les Miserables sample, have the program work
something out about the characters, make the drawing's colors or sizes show that result, put the
characters' names on the drawing, and finish on a picture file. Twenty-one simulated participants
ran it on the clickable skeleton. Grades are decided by what was on screen at the end and what the
participant concluded, not by what they believed.

What success required, in order:

1. The network open from the start screen.
2. A measure or grouping run or updated from Analyze (or a row's Rerun), its result read in the
   inspector's Data tab.
3. The drawing's colors or sizes coming from that result, and the participant naming it (legend
   "Color: <that result>", or a Size line bound to it).
4. A label line on Everything, or on another row covering all 77 characters, bound to the name
   column.
5. The session ending on the Export dialog's Image page.

Success with difficulty allowed more than two wrong turns, a help request, reading the ready-made
PageRank row instead of running anything, or names first put on a partial row and then fixed. It
did not allow skipping step 3 or step 4.

## Outcome

| | Count |
|---|---|
| Success | 0 |
| Success with difficulty | 0 |
| Failure | 20 |
| Gave up | 1 |

The participants rated themselves far higher: 17 called it success with difficulty, 3 failure, 1
gave up. Every self-reported "success with difficulty" here is a failure on the evidence, almost
always because the names step was never done (step 4), and usually also because the colors were
the sample's PageRank rather than the participant's own result (step 3).

Only 2 of 21 ever bound a label line to the name column. Only 4 ended with the drawing colored by
a result they had themselves run or updated, and in all 4 that result was PageRank, the color the
sample opens with. No participant met steps 3 and 4 at the same moment at the end.

## Per participant

Columns: 1 open, 2 ran and read a result, 3 colors from that result and named, 4 names bound on a
row covering everyone, 5 ended on Export > Image. "y*" = met on screen, then lost before export.

| Participant | 1 | 2 | 3 | 4 | 5 | Grade | Self-grade | Where it broke |
|---|---|---|---|---|---|---|---|---|
| explorer-elena | y | y (Update PageRank row, read Top 10) | y (PageRank, named) | n (ticked Show labels only) | y | failure | swd | Names only: accepted the sample's 13 labels after "Show labels" changed nothing |
| recipe-recipient | y | y (Update PageRank row, read Top 10) | y (PageRank, named) | n (clicked the Label word twice, nothing opened) | y | failure | swd | Names only; said so himself ("the names part I did not do") |
| alert-reviewer | y | y (Degree; Louvain updated) | n (colors stayed PageRank, which she did not run) | n (Show labels) | y | failure | swd | Own results never reached the drawing; names |
| class-project-student | y | y (Degree) | n | n (could not name the Label "+") | y | failure | swd | Degree size "0.5 to 3" drew nothing; hiding PageRank did nothing; names |
| nonprofit-operations-analyst | y | y (Degree) | n (Color by degree left legend on PageRank) | n (Show labels) | y | failure | swd | Could not tell whether her coloring applied; names |
| data-journalist | y | n (Betweenness run never finished) | n | n (Show labels) | y | failure | swd | Run never returned; reorder and eye did not repaint; names |
| analyst-alex | y | y (Louvain updated) | n | n | y | failure | failure | Could not get Louvain onto the drawing; names |
| bioinformatics-researcher | y | y (Louvain; then Update PageRank row, read Top 10) | y (PageRank at export, named) | n (Show labels on Everything and PageRank) | y (SVG) | failure | swd | Names only; had Louvain colors briefly through Show only this row, lost on opening the menu |
| cybersecurity-analyst | y | n (Betweenness never finished) | n | n (Show labels) | y | failure | swd | Run never returned; reorder and eye did not repaint; names |
| cytoscape-holdout | y | y (Update PageRank row, read Top 10) | y (PageRank, named) | n | y (SVG) | failure | swd | Names only; Quick actions "Add label line" opened a different project, attribute menu said "not available yet" |
| expert-emma | y | n (Betweenness never finished; Run as copy) | n | n (Show labels on Everything) | y | failure | swd | Run never returned; names |
| fraud-analyst | y | y (Degree) | n | n | y | failure | swd | Degree never reached the drawing; Source picker did not open; names |
| gene-ontology-cytoscape-user | y | n (Betweenness never finished; Escape removed the row) | n | n (Show labels on Everything) | y | failure | swd | Run never returned; names |
| genomics-cytoscape-user | y | y (Degree) | n | n | y | failure | failure | Degree arrived hidden and unlisted; hiding PageRank did nothing; names |
| gephi-holdout | y | y (Louvain updated) | y* (Show only this row; lost on opening the menu) | y (Louvain row, label line on "Name, Label"; all names drawn) | y (SVG) | failure | failure | Closest. Colors fell back to PageRank before export; concluded correctly that the file shows PageRank |
| intelligence-analyst | y | n (Betweenness never finished) | n | n | n (looked for an Export button on screen, stopped) | gave up | gave up | Never reached the main menu |
| knowledge-engineer | y | n (Betweenness never finished) | n | n (Show labels on Everything) | y | failure | swd | Run never returned; could not name the Size bind icon; names |
| marketing-analyst | y | n (Betweenness never finished) | n | n | y | failure | swd | Run never returned; hiding PageRank did nothing; names |
| ml-engineer-recsys | y | n (Betweenness never finished) | n | n (Show labels on Everything) | y | failure | swd | Run never returned; names |
| screen-reader-analyst | y | y (Louvain updated, read in full) | y* (Show only this row; lost on opening the menu) | y (Louvain row, label line on "label") | y | failure | swd | Closest. Colors fell back to PageRank on opening the menu; she caught it by rereading the legend |
| supply-chain-analyst | y | n (Betweenness never finished) | n | n | y | failure | failure | Run never returned; names |

swd = success with difficulty.

## Where the task breaks, by step

Step 1 (open) and step 5 (export) were easy for 20 of 21. The main menu's Export... was found
first time by everyone who looked there; the one who gave up looked for an Export button on the
canvas and stopped.

Step 2 (run something): 12 of 21 got a result they could read. Every participant who chose
Betweenness (14) hit a run that never finished (see the skeleton stops below). Degree (5) runs
with no dialog and shows its Top 10 at once, but it never reached the drawing.

Step 3 (colors show my result): no one who ran Degree, Betweenness or Louvain ended with that
result on the drawing. The ready-made PageRank row covers Color on all 77 nodes, and none of the
obvious ways past it worked: Hide PageRank, Show on the hidden Betweenness, Move above, and Color by
attribute all changed the panel's words and left the drawing and legend on PageRank. Three
participants found Show only this row (two through a tooltip's Alt+Space, one in the row menu); it
did paint Louvain, and all three lost it when they opened the main menu.

Step 4 (names): the hardest step of the task, and the one most participants believed they had done.
Twelve participants opened the Label "+" and chose **Show labels**, the second of its two items.
It gives an unticked checkbox; ticking it changes nothing, because names come from a label line,
not from Show. Ten of the twelve stopped there. The first place they learned anything was the
Export dialog's "64 labels hidden to avoid overlap", which they read as the program deliberately
hiding names, and accepted. Nine never found the "+" at all (clicking the word "Label" does
nothing, and the "+" has no visible name). Only gephi-holdout and screen-reader-analyst went back
to the "+" and chose the label line. Screen-reader-analyst put it this way: "the checkbox on its
own looked finished and was not".

## Findings

Counts are participants out of 21. Severity is Nielsen's 0-4 scale. A finding counts as a design
finding only if the skeleton is drawing what the spec intends; anything else is listed under
skeleton stops below.

1. **The Label section offers Show labels next to Label line, and Show is picked as the way to put
   names on (12 of 21; 10 stopped there).** Show only does something when there is a label to
   show, and the sample's canvas already shows 13 names, so ticking it looks like it worked, or
   like the program refused. No participant connected "names" with "Label line". Severity 4: this
   step blocks every grade above failure. The spec offers Show only while the row has no label
   line, which is exactly the moment a newcomer opens the menu. Worth weighing: the menu's first
   item reading in terms of the reader's goal (a name column picker), or Show not being offered on
   Everything when no label line exists anywhere.
2. **The ready-made project hides the reader's own work (21 of 21 refused to count the pre-done
   PageRank as theirs).** The 12 who mention the sample card's "opens with worked examples" still
   wanted to run something themselves, and the PageRank row covering Color then made every
   new result invisible on the drawing. Most debriefs say in so many words that they could not
   tell their own work from the sample's. Severity 3. This is the sample working as designed, colliding with a task
   (and a first-time reader's instinct) to learn by doing.
3. **A new or rerun result does not say whether it reached the drawing.** Degree's Style tab says
   "Paints 77 nodes" and "Size 0.5 to 3" while nothing on the canvas changes (5 of 5 who ran
   Degree), and only genomics-cytoscape-user found, by accident, that it had arrived hidden.
   "Covered by PageRank for Color" was understood and praised by most who reached it, but the one control
   offered beside it, Move above, did not change the drawing. Severity 3 as a design question
   (should a run the reader just started land visible and on top, as the spec's "the newest lands
   on top" says?), on top of the skeleton stops below.
4. **"64 labels hidden to avoid overlap" appears only in the Export dialog.** Nearly everyone
   who reached Export read it as the first explanation of the missing names; most said it belonged
   on the canvas when they ticked Show labels, and 8 asked for a way to show them anyway. 8 flagged
   Thenardier (degree 16) as a main character the picture drops. Severity 2. The skeleton's count is a fixed number and does not reflect label
   lines (see the skeleton stops), so this tested only where the message is, not what it counts.
5. **Section words in the Style tab are not controls (about half the participants clicked
   "Label", "Fill" or "Shape" and nothing happened).** Those who found the "+" beside them mostly
   did so by guessing its accessible name; nine never found it. Severity 2.
6. **Run status: "Ran Sep 28" after Update PageRank row (4 of 4 who updated PageRank doubted the
   run happened).** Louvain's update says "Updated just now"; PageRank's says "Ran Sep 28".
   Severity 2.
7. **Same name on several controls**: two Betweenness, four Louvain, three PageRank. For the
   screen-reader participant these are "the same word at my speed"; for sighted participants
   it is mostly an artifact of the click tool. Severity 2 for keyboard and screen-reader users.

Not graded, logged as instructed:

- The **Everything row's Color line reads 808080 while every dot is orange**: noticed by 7
  (alert-reviewer, nonprofit-operations-analyst, class-project-student, cytoscape-holdout,
  knowledge-engineer, ml-engineer-recsys, gene-ontology-cytoscape-user). Two read "808080" as
  "everything will turn gray" and backed away from it.
- The **bind icon at rest on Color, Size and Label lines is not drawn**: 7 tried and failed to
  find the "cylinder" or "database" icon's name (explorer-elena, alert-reviewer,
  nonprofit-operations-analyst, data-journalist, knowledge-engineer, genomics-cytoscape-user,
  ml-engineer-recsys). Nonprofit-operations-analyst found it only as "Color by attribute" and
  said "attribute is not my word". Explorer-elena and knowledge-engineer gave up on sizing because
  "Size 1" with an unnamed icon read as a constant.
- **The sample card's "opens with worked examples"**: read or recalled by 12
  (class-project-student, cybersecurity-analyst, cytoscape-holdout, expert-emma,
  gene-ontology-cytoscape-user, genomics-cytoscape-user, knowledge-engineer, screen-reader-analyst,
  nonprofit-operations-analyst, data-journalist, marketing-analyst, ml-engineer-recsys;
  analyst-alex "skimmed it"). Not mentioned by explorer-elena, recipe-recipient, alert-reviewer,
  fraud-analyst, gephi-holdout, intelligence-analyst, supply-chain-analyst or
  bioinformatics-researcher. No participant took the shortcut of counting the existing PageRank
  row as their result for step 2 without first trying to run something.

## Skeleton stops (fidelity, not design)

These were places the skeleton did not do what the spec says. They drove most failures at step 2
and step 3, so this round's step 3 result says little about the design until they are fixed.

| Stop | Participants | Spec says |
|---|---|---|
| A run started from Analyze (Betweenness) shows a spinner forever; its row never opens, its column never appears, and it vanishes from the list after later clicks or Escape | 14: data-journalist, analyst-alex, bioinformatics-researcher, cybersecurity-analyst, cytoscape-holdout, expert-emma, gene-ontology-cytoscape-user, genomics-cytoscape-user, intelligence-analyst, knowledge-engineer, marketing-analyst, ml-engineer-recsys, screen-reader-analyst, supply-chain-analyst | the dialog's "Under a second" |
| Hide on PageRank, Show on Betweenness and Move above change the eye, the toast and the inspector text, but not the drawing or the legend; Move above does not move the row in the list | 16: alert-reviewer, class-project-student, data-journalist, analyst-alex, bioinformatics-researcher, cybersecurity-analyst, expert-emma, gene-ontology-cytoscape-user, genomics-cytoscape-user, gephi-holdout, intelligence-analyst, knowledge-engineer, marketing-analyst, ml-engineer-recsys, screen-reader-analyst, supply-chain-analyst | The eye "shows or hides that row's paint on the canvas" |
| Show only this row is dropped when the main menu or Export opens (Ctrl+E too), with PageRank back on the drawing and no message | 3: gephi-holdout, screen-reader-analyst, bioinformatics-researcher | Solo is an eye state; Alt-click again restores |
| Degree run straight from Analyze lands hidden and unlisted (a gray "Group 6, not listed" row appears instead); its Style tab claims Size 0.5 to 3 | 5: alert-reviewer, class-project-student, nonprofit-operations-analyst, fraud-analyst, genomics-cytoscape-user | Unclear: either a skeleton stop or an undecided rule for where a run with no dialog lands |
| Run as copy shows only "Would add ... as a copy" | 3: explorer-elena, expert-emma, bioinformatics-researcher | Known (grader notes) |
| Quick actions "Add label line" opened a different project (IT estate, March 2026) | 1: cytoscape-holdout | A command never replaces the open project |
| Clicking the Degree size value opened "Color by PageRank" and moved the inspector to PageRank; that popover's Source picker did not open | 2: class-project-student, fraud-analyst | -- |
| The Show labels checkbox is gone from the Style tab after Export | 3: explorer-elena, alert-reviewer, cybersecurity-analyst | -- |
| The Export dialog always says "64 labels hidden" (fixed set), even after a label line put every name on | 2: gephi-holdout, screen-reader-analyst | Count what the drawing hides |
| Under Show only this row, the drawing's Louvain colors disagree with the legend for the hubs (Valjean, Gavroche) | 1: bioinformatics-researcher | -- |

## Single Ease Question and would-switch

SEQ (1 = very hard, 7 = very easy): median 3, range 2 to 4 (4 from explorer-elena,
class-project-student, ml-engineer-recsys; 2 from intelligence-analyst). Almost everyone split it
the same way: opening and exporting about 6, the middle about 2.

Would switch today: 0 of 21. Things named most often as better than their current tool: "files are read on this
computer and never uploaded" on the start screen and in Export (nearly everyone); the Analyze
list's one-line meanings; Betweenness stating "uses 1/value" and that all 254 edges count; "Covered
by PageRank for Color"; the Export legend and the gray Print preview with values at each step; the
Louvain result panel (seed, modularity in a sentence, hub names, "the same as before"); the graph
summary. The most common reason for not switching: the panel said one thing and the drawing
showed another.
