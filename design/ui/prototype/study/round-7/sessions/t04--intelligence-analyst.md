# Session: look up Valjean, then narrow to him and his direct contacts (Marcus, criminal intelligence analyst)

Task as given by the moderator: "Look up the character Valjean: what is recorded about him, how he
stands on the measures already worked out, and who appears right around him. Then narrow the whole
picture to him and the characters directly around him, so that every number describes only them."

All commands were run from design/ui/prototype. Renders are in
tmp/round-7-sessions/t04--intelligence-analyst/.

## Start screen (shots/tasks/t04/01.png)

Link chart of orange dots, same shape for everybody. Valjean is labelled right in the middle and
he is the biggest, darkest one. There is a "Find rows and notes" box top left, but I can just see
him, so I will click him. Legend says color is PageRank and size is degree. Fine, degree I know.

## Step 1 -- click Valjean

    timeout 120 node app-b/study.mjs --try .../01.png task:t04 --click "Valjean"

Got him. A chip under the chart says "Valjean, 36 connections". Right panel says "Valjean, Node"
with Style and Data tabs; it is on Style, showing "Why this look" -- notes, PageRank, degree,
Group 2. That is how he is drawn, not what is on file about him. I want the Data tab. A row of
five icon buttons popped up over the toolbar; no words on them.

## Step 2 -- click "Data" to see his record

    timeout 120 node app-b/study.mjs --try .../02.png task:t04 --click "Valjean" --click "Data"

That did not do what I meant. It went to the "Data" section on the left rail instead of the Data
tab on his panel, and the right panel now shows the whole graph summary -- 77 nodes, 254 edges,
density, components. My guy is gone from the panel. There are two things called "Data" sitting a
few inches apart. Annoying.

## Step 3 -- go to Data first, then click him

    timeout 120 node app-b/study.mjs --try .../03.png task:t04 --click "Data" --click "Valjean"

Clicking him on the chart throws me back to the Graph section, panel on Style again. So I still
cannot get to his Data tab by name. Is there a way to just see his row?

## Step 4 -- open the Table

    timeout 120 node app-b/study.mjs --try .../04.png task:t04 --click "Valjean" --click "Table"

OK, this is more like it. A table, sorted by degree. Valjean is the top row: group 2, degree 36,
PageRank 0.0754, rank 1 by PageRank, betweenness 0.570. A line above it says "Valjean is first on
all three measures; Gavroche is in the top 3 on all three." Good, that is a sentence I could say
to a sergeant. Betweenness I know -- the middleman number -- and he is the top middleman too.
Column headers say "(full graph)", noted.

What is "recorded" about him is thin: a label, a group number, degree. I guess that is all this
sample carries. I never did see a record card for him.

## Step 5 -- find the icons' names

    timeout 120 node app-b/study.mjs --try .../05.png task:t04 --click "Valjean" --hover "Neighbors"
      -> nothing on screen is called "Neighbors"
    ... --hover "Select neighbors"  -> nothing on screen is called "Select neighbors"
    ... --hover "Neighborhood"      -> tooltip "Neighborhood" on the first icon
    ... --hover "Focus"             -> nothing on screen is called "Focus"
    ... --hover "Expand"            -> nothing on screen is called "Expand"

(05.png is the "Neighborhood" hover.) Took me a few tries resting on icons, but the first one,
the target-looking one, is "Neighborhood". That is what I want.

## Step 6 -- Neighborhood

    timeout 120 node app-b/study.mjs --try .../06.png task:t04 --click "Valjean" --click "Neighborhood"

Box: "Neighborhood of Valjean", Hops 1 / 2 / 3, "Selected: Valjean and his 36 neighbors." Two
buttons: "Add as steps" and "Filter to neighbors". More names came up on the chart -- Bamatabois,
Thenardier, Claquesous, Montparnasse, Gillenormand. But the 36 are not highlighted any different
from everybody else that I can see; same orange dots. Who is around him I can read off labels,
partly. "Filter to neighbors" is plain English. Clicking it.

## Step 7 -- Filter to neighbors

    timeout 120 node app-b/study.mjs --try .../07.png task:t04 --click "Valjean" --click "Neighborhood" --click "Filter to neighbors"

Chart dropped to his crowd. Top bar now reads "37 of 77 nodes". Toast: "Added filter step:
Neighbors of Valjean, 1 hop" with Undo. Good. But the legend still says PageRank 0.0033 to 0.0754
and degree 1 to 36 -- those are the same ranges as before. Did anything get recomputed?

## Step 8 -- Table after the filter

    timeout 120 node app-b/study.mjs --try .../08.png task:t04 --click "Valjean" --click "Neighborhood" --click "Filter to neighbors" --click "Table"

Top bar says 37 of 77. Table says "77 nodes". Columns still say "(full graph)", Valjean still
36 / 0.0754 / 0.570, same sentence about Gavroche. So which one's lying? The picture is 37
people, the numbers are the whole book. That is exactly what the task told me not to have. These
numbers do not describe only them.

## Step 9 -- click the "37 of 77 nodes" chip to find out what is going on

    timeout 120 node app-b/study.mjs --try .../09.png task:t04 --click "Valjean" --click "Neighborhood" --click "Filter to neighbors" --click "37 of 77 nodes"

What? This is a different case. "Transfers, March 2026", accounts and transfers CSVs, "812 of
3,000 nodes", a gray blob of hexagons, a filter "amount is at least 1,000". Where is Les
Miserables? I clicked the count of my own filter and it opened somebody else's data. If this
happened on a real case I would be on the phone with IT.

## Step 10 -- try the Data section to see my filter

    timeout 120 node app-b/study.mjs --try .../10.png task:t04 --click "Valjean" --click "Neighborhood" --click "Filter to neighbors" --click "Data"

Back on Les Miserables, but Filters says "No filters" and the top bar says "Full graph". My
filter is gone. It even says right there "Filters change what is computed; the eye in the Graph
tree only hides" -- so a filter is supposed to recompute -- but the one I made has vanished.

## Step 11 -- one last try with "Add as steps"

    timeout 120 node app-b/study.mjs --try .../11.png task:t04 --click "Valjean" --click "Neighborhood" --click "Add as steps"

Toast: "Added Neighbors of Valjean, 1 hop: one group per hop". The chart did not change, still
all 77, and my selection is gone. "One group per hop" -- a group where? I do not see a new row on
the left. I am done.

## Outcome

Did I succeed? Half. I found him, I got his measures (degree 36, PageRank 0.0754 and rank 1,
betweenness 0.570, top on all three) and I got the chart cut down to him and his 36 contacts. I
did not get numbers that describe only those 37: the table and the legend still say full graph,
the filter disappeared when I went to look at it, and clicking the filter count opened a whole
different dataset. And I never saw an actual record card for him -- the "Data" tab on his panel
was beaten to the click by the "Data" on the left rail.

Single Ease Question: 2 out of 7.

Would I use this instead of i2 and Excel? Not today. The neighborhood button is good -- one
click to "him and his 36" is faster than i2's expand. But the screen told me 37 in one place and
77 in another, and when I went to check, the filter was gone and a different case was on screen.
I cannot put a number in front of a sergeant if I cannot tell which population it was computed
on, and I cannot use a tool that loses the filter I just made.

## Problems seen, in order

1. Two controls named "Data" (left rail section and the node panel tab); clicking "Data" with a
   node selected left the node and showed the whole-graph summary. Never reached his record.
2. Neighborhood icon is unlabeled; took several guesses to find its name. Once found, it worked.
3. After "Neighborhood", the 36 neighbors are not visibly marked on the chart.
4. After "Filter to neighbors", legend ranges, table row count ("77 nodes") and column headers
   ("full graph") are unchanged while the top bar says 37 of 77. Numbers do not describe only the
   filtered people, and nothing offers to recompute them.
5. Clicking the "37 of 77 nodes" chip opened a different dataset ("Transfers, March 2026").
6. Opening the Data section after filtering shows "No filters" and "Full graph": the filter was lost.
7. "Add as steps" says it added "one group per hop" but nothing visible changed.
