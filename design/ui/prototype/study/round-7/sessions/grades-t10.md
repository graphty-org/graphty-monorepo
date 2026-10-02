# Round 7 grades: t10, "make a third list of what two kept lists have in common"

The task: "Earlier you kept two lists of characters. Make a third list holding just the characters
the two lists have in common." The data is the Les Miserables co-appearance network.

What counts as success: two kept-set rows are selected together in the tree and Combine (from the
row menu) produces their intersection as a new row on top. Success with difficulty: the participant
reaches the combine command only after a detour (the selection bar, Analyze), or makes the union
first and corrects it. Failure: building the list by hand-picking characters, making the union and
keeping it, ending somewhere else, or concluding wrongly.

The designed path is: the graph at rest -> two set rows selected, inspector showing "2 rows" ->
Combine > Intersect, which adds "Group 8 and Top 9 by degree" (5 nodes) on top of the tree.

Grades are decided from what ended on screen and what the participant concluded, not from their
own rating.

## Grades

| Participant | Their rating | Grade | Why |
|---|---|---|---|
| Gephi holdout | failure | **gave up** | Never had two rows selected (a second click replaced the first). Ran Combine > Intersect from a menu titled "Community 3" while Group 2 was selected, got "Group 8 and Top 9 by degree", read the "Made with" block, and rejected it: "I would not put that list in a report." Last screen is the start screen with the list-options menu open. Concluded nothing wrong; abandoned. |
| Intelligence analyst | failure | **gave up** | Same route: one row selected, menu for Community 3, Intersect. Last screen is the 5-node result. He used "Made with" to see that one input was a list he never chose and refused the result: "If I tell the sergeant these five are on both lists, I'm wrong." Correct reading, task abandoned. |
| Genomics Cytoscape user | failure | **gave up** | Tried to select Group 2 and Group 8 together; nothing showed two rows selected. Ran Intersect, got the Group 8 / Top 9 result, then checked hidden rows to see whether Top 9 had existed (it had not). Stopped: "Not sure, leaning no." Last screen is the start screen with hidden rows shown. |
| Marketing analyst | success with difficulty | **failure** | Ran Intersect from the Community 3 menu with only Group 8 selected, got the Group 8 / Top 9 result, then clicked the "Top 9 by degree" link in "Made with" to check it. That reset the whole screen to the start state (Community 3 selected, no new list, no message). Her last screen holds no third list, and she said "I don't trust it." Ended somewhere else. |
| Expert Emma | success with difficulty | **gave up** | Reached Combine > Intersect through the "..." menu and Shift+F10, both of which opened Community 3's menu. Never selected two rows. Last screen is the 5-node result, which she accepted only conditionally ("If those are the two lists I kept earlier, then fine") and said she would undo with real data. She chose neither input; the prototype did. Stopped rather than verify. |

**Tally: 0 success, 0 success with difficulty, 1 failure, 4 gave up (5 sessions).**

Nobody built the list by hand and nobody made a union. All five found the right command (the "..."
menu, "Combine with selected rows", "Intersect") without help, and all five praised the result's
"Made with" block. No one completed the defining act of the task: selecting the two inputs.

## This round does not measure the design

Three defects in the skeleton and the study harness decided every session before the design could:

1. **The start screen does not contain the designed second input.** The designed answer intersects
   Group 8 with "Top 9 by degree", but the start screen (shots/tasks/t10/01.png) has no "Top 9 by
   degree" row; it appears only in the two-rows-selected state (shots/tasks/t10/02.png), whose tree
   also drops Shortest paths and Betweenness. Five of 5 picked Group 2 and Group 8 as "the two lists
   I kept" (they share a folder named "For the report"), and 5 of 5 were then told the result came
   from a list they had never seen. 3 of 5 also noticed Shortest paths and Betweenness vanish.
2. **The set inspector's "..." and Shift+F10 open a canned menu for Community 3**, expand Louvain
   and move the selection there, whatever row is selected. 5 of 5 hit this, 4 of 5 more than once.
   It is the menu built for the right-click section, reached from the wrong place.
3. **The study tool cannot shift-click or ctrl-click** (`--try` has --click, --rclick, --hover and
   --key only), so no participant could have multi-selected two rows. The hint "Shift-click or
   Ctrl-click adds a row" exists only in the state after two rows are already selected; on the start
   screen nothing teaches multi-select. 4 of 5 tried a second click and saw it replace the first.

A further skeleton defect hit one participant: clicking an input link in "Made with" reset the app
to the start state and lost the new list (marketing analyst).

Because of these, the grades above say what happened on screen, not whether the designed flow
works. Rerun t10 after the start screen holds both designed inputs (or the task names them), the
set row's menu acts on the selected row, and the harness can modifier-click.

## What the sessions show about the design anyway

Counts are out of 5.

1. **Multi-select is undiscoverable from the start screen.** 4 of 5 tried a plain second click and
   read the replacement as "this app cannot select two rows"; 2 said they would have tried
   Ctrl- or Cmd-click "but nothing tells me that works"; one wondered whether the row icons were
   checkboxes. "Combine with selected rows" presumes a selection the screen never teaches.
   Nielsen severity 3 (major): the operation is defined over a selection the user cannot see how
   to make. Part of this is the harness, so confirm with a modifier-capable rerun before acting.
2. **Which lists are "kept" is ambiguous.** 5 of 5 counted three rows with the set icon (Watchlist,
   Group 2, Group 8) against a task that says two. Group 2 and Group 8 read as "from the attribute
   group", which made 2 of 5 doubt they had kept them at all. Severity 2 (minor) for the product;
   mostly a task-wording and start-screen issue.
3. **The result shows its inputs, and that is what caught the error.** 5 of 5 singled out the
   "Made with" block (operation, both inputs, dataset, "a set keeps its members; it does not follow
   later changes to its inputs") and the toast "Its two inputs are unchanged" with Undo. 3 of 5 said
   it was better provenance than their current tool; the intelligence analyst said it was how he
   found the wrong input. Keep it.
4. **Show both inputs before committing.** 2 of 5 (Expert Emma, the intelligence analyst) asked to
   see the two inputs named before the operation runs, not only after. With the menu headed by a
   single row's name, "Combine with selected rows" gives no preview of what "selected" is.
   Severity 2.
5. **The operation words worked.** 5 of 5 recognized Union / Intersect / Subtract / Exclude; one
   (marketing analyst) wanted a plain gloss such as "in both", and found the result's "(in both
   rows)" helpful after the fact. Severity 1 (cosmetic).
6. **Two controls named "Data".** 1 of 5 (genomics) clicked "Data" meaning the inspector tab and got
   the left-rail Data place. Single voice; note, do not act on it alone.

## Single Ease Question

Emma 3, genomics 3, marketing 3, Gephi holdout 2, intelligence analyst 2 (median 3 of 7). Every
participant said finding Intersect was easy and everything around choosing the inputs was not.
