# Grades: transaction rings (round 7)

The task: "Do the accounts fall into rings that send money mostly among themselves? Get graphty to
pick them out, then say how many there are and how big the largest few are." The data is one
month of transfers: 3,000 accounts, 9,113 directed transfers weighted by amount.

Success means running a community algorithm (Louvain) from Analyze, then reading the run row's
Data tab: 35 communities, modularity 0.688, the largest three holding 297, 182 and 147 accounts.
The intended path is the loaded transfers graph, then the Analyze popover with Louvain, then the
graph with the Louvain row added (render: shots/tasks/t03-transactions/03.png).

## Headline: the prototype could not complete this task

Five of five participants found Louvain, set it up sensibly and pressed Run. In the clickable
skeleton, Run on a graph that has no Louvain row yet does not advance to the result. It only
shows a dark bubble, "Would add Louvain at the top of the list, running". The source of
app-b/sections/analyze-popover.js (the `run` function) ends that message with "(not modeled in
the skeleton)"; the participant view hides that suffix, so participants read a hypothetical
sentence as the product's answer. The success state exists and renders, but no click reaches it.

So this round measures nothing about whether a reader can find and read the community result.
Every grade below is a prototype failure, not a design failure, and the task must be rerun once
Run on Louvain for the transfers graph goes to the graph with the Louvain row added.

The rubric's other known mock artifact -- a Louvain row already drawn on the resting transfers
graph -- did not occur: the start screen showed no rows (shots/tasks/t03-transactions/01.png).

## Grades

| Participant | Their own call | Grade | Reached the result? | What ended on screen |
|---|---|---|---|---|
| Fraud analyst (Sarah) | gave up | gave-up | No | The graph, no rows, nothing found; stopped at her five minutes |
| Intelligence analyst (Marcus) | gave up | gave-up | No | The summary describing a 77-node file named miserables under the Transfers title |
| Cybersecurity analyst (Priya) | failure | gave-up | No | Column picker, no group column; stopped on her own time limit |
| ML engineer (Chris) | failure | gave-up | No | Data place showing a filter "amount is at least 1,000" (812 of 3,000) she never set |
| Analyst Alex | gave up | gave-up | No | Strongly connected components form with the same "Would add" bubble |

Why gave-up and not failure for the two who called it failure: neither ended on a wrong answer
or read PageRank or degree as rings, and both ran a grouping. Each stopped without an answer.
The rubric reserves failure for a wrong conclusion or for never running a grouping.

All five: Single Ease Question 2 of 7. Outcome tally: 0 success, 0 success with difficulty,
0 failure, 5 gave-up -- all five caused by the same unwired Run.

## Per participant

**Fraud analyst.** Opened Analyze from the left-panel link, picked Louvain because the line under
it said "densely connected groups" (she did not know the name), kept the weight on amount, ran
it, got the bubble. Searched Views, the Find groups list (rejected Connected components because
the summary already said one weak component), the Assistant (off, left off), the table and the
"4 more readings not computed" link. Concluded correctly that she had no count. Ended about five
minutes in.

**Intelligence analyst.** Same route to Louvain, same reason (the description line). After the
bubble, checked the table for a group column, tried the Assistant, then "4 more readings not
computed" and "Compute the overview". The summary panel switched to Les Miserables (77 nodes,
254 edges) while the title and canvas stayed on Transfers. Quit on trust: "Which one's lying?"

**Cybersecurity analyst.** Checked the Local only chip first (Privacy page, liked it), then
Louvain in two clicks. After the bubble, hit the same Les Miserables swap, Views, the table and
the column picker. Stopped at her ninety-second limit on a control with no output. Noted that
reciprocity 0 points at loops rather than dense blobs and asked for a cycle finder.

**ML engineer.** Reached Louvain through Recent in under a minute and praised the settings form
(weight, meaning, direction, resolution, time estimate). After the bubble, hit the Les Miserables
swap, looked at Strongly connected components without running it, then opened the Data place and
found a filter switched on that the top bar had not shown. Quit on the changing denominator.

**Analyst Alex.** Ran Louvain, then Leiden (marked "Start here"), then Strongly connected
components, each giving the same bubble. Reasoned that with reciprocity 0, "ring" means money
going round in loops, which is strongly connected components rather than modularity. Found it by
searching "cycl" after "ring" returned only Bipartite matching. Stopped seven or eight minutes in.

## Findings

Severity is Nielsen's 0 to 4. "Prototype" marks a defect of the skeleton, not of the design;
those are fixed in the skeleton and are not design evidence.

1. **Run on a new grouping does not reach the result (prototype).** 5 of 5. Blocks the task.
   Severity 4 for the study. Fix in app-b/sections/analyze-popover.js: Run on Louvain (and
   ideally Leiden) for the transfers graph goes to the graph with the Louvain row added.
2. **The "would add" wording reads as "did not run" (design, if any bubble survives).** 5 of 5
   quoted it with "Would? Did it or didn't it?". The real product will not show this sentence,
   but whatever confirms a run must say it ran and where the result went. Severity 3 until the
   real feedback is tested.
3. **"Compute the overview" swaps the summary to a different dataset (prototype).** 3 of 5
   (intelligence, cybersecurity, ML); it ended one session outright and broke trust in two.
   Severity 4 for the study: participants quit on it. Fix the dataset that action routes to.
4. **"4 more readings not computed" opens the graph's general menu.** 5 of 5 clicked it hoping
   for a group count; all got select all, re-run layout, Compute the overview and Clear graph
   data instead. Severity 3. Likely a wiring defect; if the menu is intended, the link text
   promises something it does not do.
5. **Escape steps back to the Analyze list instead of closing it, and the open popover blocks
   the rest of the app.** 5 of 5 noticed; 3 tried to reach Table or Graph through it and could
   not. Severity 2.
6. **The one-line description sells Louvain to people who do not know the name.** 5 of 5 chose
   it, 3 of them explicitly because of "densely connected groups". Positive finding; keep it.
7. **"Ring" does not lead to an algorithm.** 2 of 5 searched for "ring" (one got only Bipartite
   matching, one saw no change). 1 suggested naming the entry "Find rings / clusters". Severity 3.
8. **Nothing helps choose between dense groups and cycles.** 3 of 5 (Alex, cybersecurity, ML)
   read reciprocity 0 and asked whether "ring" means a loop, and 1 ran strongly connected
   components. This is partly a task-wording issue -- "rings" invites the cycle reading -- and
   partly a real gap in guidance. Rerun with the same wording so results compare, but record it.
   Severity 2.
9. **Attribute list says "Color (kind)" while the canvas badge says nothing is colored.** 2 of 5
   (cybersecurity, ML). Severity 2; likely a fixture inconsistency.
10. **Data place shows a filter (812 of 3,000) the top bar did not show (prototype).** 1 of 5
    (ML). Likely state from another route leaking in. Severity 3 if real, since it changes what
    an algorithm runs on.
11. **Groups reachable only through Recent; the default list opens on ranking.** 2 of 5
    (intelligence asked why an unrun Louvain is under Recent; ML noted she would have had to
    scroll). Severity 2.
12. **"Clear graph data" sits in the same menu as Select all.** 2 of 5. Severity 2.
13. **Table opens at rows 381 to 420.** 2 of 5. Severity 1.
14. **No seed on the Louvain form.** 1 of 5 (Alex); the result's Made with section does show a
    seed. Severity 1.

What participants liked, unprompted: Local only and its Privacy page (4 of 5), the Assistant off
by default with "Nothing is sent" (4 of 5), the time estimate before running (3 of 5), weight set
to amount with "higher means stronger" (3 of 5).

## Before this task is run again

- Wire Run on Louvain for the transfers graph to the result state, and check it with
  `node app-b/study.mjs --try` clicking Analyze, Louvain, Run.
- Fix "Compute the overview" so it stays on the transfers data.
- Check whether the Data place filter and the "4 more readings" menu are intended.
- Keep the task wording identical so this round's attempts compare.
