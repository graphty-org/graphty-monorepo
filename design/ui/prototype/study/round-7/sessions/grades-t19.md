# Round 7 grades: door swipes, one link per pair, then each swipe as a node

The task: a company's door-swipe export (people 412, buildings 9, entries 4,212 rows) opens on
the Data page's import screen with every swipe set to become its own edge ("One edge per: Row",
4,180 edges, no weight). The participant is asked to link each person to each building once,
keeping how often they went in on that link, and then to make each swipe something they can click
on by itself and see what that does to the picture.

What counts as success: "One edge per: Pair" is chosen (1,306 edges, a count column as the
weight), then "Each row is: a node" is tried, and the graph's own summary after loading is read
(4,633 nodes, two kinds of link: person_id and building_id). Success with difficulty: Pair is
reached only after studying the columns or the match report first, or the swipe-as-node count is
misread before being corrected. Failure: loading one edge per swipe and planning to remove repeated
lines by filtering afterwards, or never finding where swipes are turned into links.

The designed path is: the import screen (Row) -> Pair -> each row as a node -> Load -> the loaded
graph's summary in the right panel.

Grades are decided from what ended on screen and what the participant concluded, not from their
own rating.

## A limit of the skeleton, stated once

Pressing Load on this import screen ends on a "Reading 3 tables ... 4,633 nodes, 8,392 edges"
progress card over an empty canvas, and the click-through tool never advances past it. The designed
path's last screen (the loaded graph with its summary: 4,633 nodes, 412 person, 9 building, 4,212
entry, 8,392 edges, loaded weights "person_id links" and "building_id links") exists in the
skeleton only as a direct route reached through a different flow; no click from the import screen
leads there. So no participant could see the drawn picture or read the summary, and all six said
so. Studio decision: grade on the import screen's choices plus the counts on the progress card,
which carry the same node and edge numbers as the summary. Reason: failing everyone on a screen
the skeleton cannot reach would record a prototype gap as a design result.

What this leaves untested: whether a reader of the loaded graph notices it now has two kinds of
link, and what the picture looks like. The import screen's header line ("person (412)
<--person_id-- entry (4,212) --building_id--> building (9)") does name both links, and four of
six read the structure from it, but no one saw it as a property of the loaded graph.

## Grades

| Participant | Their rating | Grade | Why |
|---|---|---|---|
| Knowledge engineer | success | **success** | Pair on the first click, read 1,306 edges and count-as-weight; "Each row is: a node" next, named it as reifying the swipe as an event node; loaded both versions and checked 4,633 nodes and 8,392 edges by hand (4,180 x 2 + 32 one-ended). Last screen: the progress card with 4,633 / 8,392. Concluded correctly: ten times the nodes, six times the edges. |
| Expert Emma | success with difficulty | **success** | Same direct path: Pair, then node, then both loads with the arithmetic checked. Her lower rating comes from not seeing the picture (the skeleton gap above) and from friction she found afterwards, not from a wrong turn. Her last render (05.png) is the import screen back on "an edge / Row": an extra check made after the task was done, which showed the Pair choice is silently reset when switching to node and back. Concluded correctly. |
| ML engineer (recommendations) | success | **success** | Pair at once ("that is the groupby"), node mode at once ("bipartite-to-tripartite"), loaded both, read 4,633 / 8,392 and 421 / 1,306 and explained the difference correctly. Last screen: the progress card for the pair version. |
| Cybersecurity analyst | success | **success** | Pair on the first click, then node mode, then Load. Last screen: the progress card, 4,633 nodes and 8,392 edges, which she reconciled (4,212 x 2 minus 32). Concluded correctly that per-swipe nodes make a hairball and that she would use them only for one person or building. |
| Gephi holdout | success with difficulty | **success** | Direct path: Pair, node, Load, then a second load of the pair version to compare. Her lower rating is for not seeing the drawing (the skeleton gap) and for having to know what "Pair" means in advance. No wrong turn and no misread count. Last screen: the progress card, 421 / 1,306. Concluded correctly. |
| Marketing analyst | success | **success** | Pair at once (by elimination: "Row is the thing I don't want"), then node mode, chosen "because it was the only other choice" rather than because the words matched the task. Loaded both and compared counts correctly. Last screen: the progress card for the pair version. A plain success, with the caution that her second choice was found by elimination, not recognition. |

**Tally: 6 success, 0 success with difficulty, 0 failure, 0 gave up (6 sessions).** Ease ratings
were 6, 5, 6, 6, 6 and 6 out of 7.

Two participants rated themselves lower than this grade; in both cases the difference is the
missing picture and friction found after finishing, not trouble reaching the answer.

## What the sessions show

Counts are out of 6.

1. **"One edge per: Pair" was found immediately and its result read before loading.** 6 of 6
   chose it first, without opening a column or the match report. The header line and the closing
   sentence ("4,180 entries became 1,306 person-building edges") let every participant confirm the
   result without pressing Load. Count already set as the weight, and earliest and latest time
   kept, were named as welcome by 6 of 6. The word "Pair" itself is the weak spot: 2 of 6 (Gephi
   holdout, marketing analyst) said it does not say "merge" until after it is clicked. Severity 1
   (cosmetic): no one failed on it, but it relies on knowing the concept.

2. **Turning on "a node" silently throws away Pair and its weight.** 5 of 6 noticed the Pair control
   disappear with no message; 1 of 6 (Expert Emma) switched back and confirmed Pair had reset to Row
   and the weight to none. Severity 3 (major): a setting the user just made is lost on a toggle
   that looks reversible, and the user who does not check re-imports the hairball. All 5 who
   noticed understood why the two cannot coexist; the problem is the silence and the loss.

3. **There is no way to keep both the counted pair links and the individual swipes.** 5 of 6 said
   this is what they actually want (summary links on top, swipes underneath, or one link's swipes
   in time order); none found it, and nothing says how to get it (for example by loading the table
   twice). Severity 2 (minor) for this task, which only asked to try the swipe view; it is a
   recurring want and worth a design answer.

4. **Rows with a missing end are handled differently in the two modes.** In edge mode the 32 rows
   are left out; in node mode they come in as swipe nodes with one link. 5 of 6 noticed, from the
   button label ("Leave out the link") or from the 8,392 edge count. 1 of 6 (cybersecurity) wanted
   the node-mode behavior everywhere, because unknown badges are the swipes she hunts; 1 of 6
   (Gephi holdout) wanted to drop those rows entirely in node mode and found no way. Severity 2:
   the match report should say which rule applies in each mode.

5. **Nothing before Load warns how much bigger the swipe view is.** 3 of 6 (knowledge engineer,
   marketing analyst, ML engineer) asked for the node and edge totals of the current choice next to
   the toggle, before committing, as the header already does for the pair count. Severity 2.

6. **The table footer is stale after Pair.** 2 of 6 (Expert Emma, knowledge engineer) read
   "Showing the first 7 of 4,212 rows" under a table of pairs and asked which number applies.
   Severity 1.

7. **"Higher means Stronger / Farther / Capacity" is opaque to half the panel.** 3 of 6 said Farther
   and Capacity meant nothing to them and left the default; 2 of 6 (Expert Emma, ML engineer)
   praised the question as one most tools never ask. The default was right for all six. Severity 1.

## Fidelity gaps, not design results

- Load ends on a progress card that never finishes (6 of 6 met it). The task's "see what it does to
  the picture" could be answered only from counts. This must be fixed before this task can test
  the loaded graph's summary or its two link types.

## Single-voice remarks, recorded but not counted as findings

- The swipe view is really a timeline, not a graph (cybersecurity analyst).
- The count column's sum (should be 4,180) is not shown, so the merge cannot be checked
  (Expert Emma).
- The row-number key warning ("notes on entries may move if the row order changes") was read as a
  real trap for re-imports (cybersecurity analyst; two others acknowledged it without concern).
