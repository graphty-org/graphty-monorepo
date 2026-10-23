# Session r4-s21 -- Grace, returning

Task: friends.csv is open. Keep only pairs who ran together 4 or more times (third column), say how many people are left, then bring the whole club back.

Session folder (screenshots, logs): tmp/studio-sessions/tier2/rounds/round-4/sessions/r4-s21 in the studio worktree.
All commands run from the studio worktree with REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r4d1-5277e2cbe/ and S=tmp/studio-sessions/tier2/rounds/round-4/sessions/r4-s21.

## Step 01 -- start
`node design/ui/studio/tool/real.mjs --start $S setup:friends-ranked.txt` -> 01.png

Okay, friends is open, PageRank colors and sizes from last time are there, 20 next to PageRank. No dot names on. At the bottom toolbar there is an icon that looks like a filter (three lines getting shorter). That is what I want for "only 4 or more".

## Step 02 -- Filters button
`--step $S --click-at 833,863` -> "button Filters", 02.png

It took me to Data and opened "New filter step" on the right: Keep "an attribute's value", Attribute (empty). Left side says friends.csv 20 nodes, 41 edges -- matches my 20 people, 41 rows. The edge column is "weight". Next: pick weight in the Attribute box.

## Step 03 -- open Attribute list
`--step $S --click "Attribute"` -> 03.png

List shows Nodes: id, Edges: weight. Weight is the runs column. Picking weight.

## Step 04 -- pick weight
`--step $S --click "role=option:weight"` -> 04.png

Now: Attribute weight, Is "at least" (already what I want), Value empty, and a plain line "Keeps edges that pass and the nodes at their ends." Good, that is exactly "pairs who ran 4+ times and those runners". Typing 4 in Value, then Add step.

## Step 05 -- type 4
`--step $S --click "Value" --type "4"` -> 05.png

Value says 4, Add step turned blue. No preview of how many would stay yet, but fine. Clicking Add step.

## Step 06 -- Add step
`--step $S --click "Add step"` -> 06.png

The drawing thinned out right away. Top bar now says "19 of 20 nodes, 12 of 41 edges". Left under Filters: "weight is at least 4 -- 20 to 19 nodes, 41 to 12 edges", with a checkbox ticked. Right panel: Nodes showing 19 of 20, Edges showing 12 of 41, and a "Full graph" section still saying 20 and 41. The key now says "PageRank, full graph" -- so the sizes are still last quarter's ranking on everybody, okay.

So 19 people still in it, 12 pairs. Hmm, only one runner dropped out? Let me count dots on the drawing... I count 19, a couple are overlapping at the bottom. Two dots at the bottom left (around 570,755) don't show a line between them, and one big one at the bottom (734,745) sits behind another. I'd like to see the list to be sure. Trying the table button in the toolbar.

## Step 07 -- Table
`--step $S --click-at 793,863` -> "button Table", 07.png

A table opened under the drawing: Nodes / Edges tabs, "20 nodes", "In the order loaded", Id and PageRank. Wait -- the table says 20 nodes while the top says 19 of 20 showing. Is the table the full list or what's on screen? It doesn't say. Let me look at the Edges tab; I should see 12 there if it follows the filter.

## Step 08 -- Edges tab
`--step $S --click "role=tab:Edges"` -> 08.png

Edges tab says "41 edges" and the first rows are Ava-Ben 3, Ava-Chloe 5, Ava-Dev 2, Ben-Chloe 4. So the table is the whole spreadsheet, not the filtered picture -- rows with 3 and 2 are still listed and nothing marks them as hidden. Nothing on the table says "all rows, filter not applied". That threw me for a second. I'll sort by weight to count the 4s and 5s myself, like I would in Excel.

## Step 09 -- sort by weight
`--step $S --click-at 1133,742` -> "button weight", 09.png

"Sorted by weight, highest first": Ava-Chloe 5, Farah-Gus 5, Ivan-Jada 5, Lena-Milo 5... The table only shows four rows at a time. Scrolling down to find where the 4s end.

## Step 10 -- scroll the table
`--step $S --wheel 740,820,300` -> 10.png

Now I see Milo-Nora 4, Omar-Pia 4, Ravi-Sana 4, then Ava-Ben 3. Judging from the scrollbar the 3s start at about row 13, so 12 rows of 4 or more -- matches "12 of 41 edges". Good, I trust the 19 people then. Answer for the flyer: 19 people still in it (12 pairs).

Now bring everyone back. The filter row on the left has a ticked box next to "weight is at least 4". Unticking should switch it off without throwing it away, which I like -- I may want it again for the flyer.

## Step 11 -- untick the filter
`--step $S --click-at 274,247` -> input "Apply step: weight is at least 4", 11.png

Whole club is back: every line returned, right panel says Nodes 20, Edges 41, the "19 of 20" in the top bar is gone, and the key no longer says "full graph". The filter row stays on the left as "weight is at least 4 -- off", so I can tick it again when I make the flyer. My PageRank sizes and colors were kept the whole time. Done.

`--end $S`

(--end answered with a further request: "Your club now asks the same for pairs who ran together 5 or more times. How many people are in the drawing then? Bring the whole club back when you are done." Continuing in the same session.)

## Step 12 -- open the saved filter row
Okay, same thing with 5. I'd rather change my existing step than make a new one. Clicking the "weight is at least 4" row to see if I can edit it.
`--step $S --click-at 165,238`
-> treeitem "weight is at least 4", 12.png

The right panel shows my step, "Filter step Off", with Value 4 and a button "Save and turn on". Nice and plain. I'll replace 4 with 5 and press it.

## Step 13 -- change 4 to 5
`--step $S --click "Value" --key Control+a --type "5"`
-> 13.png

Value now 5. Title still says "at least 4" until I save, fair enough. Pressing "Save and turn on".

## Step 14 -- Save and turn on
`--step $S --click "Save and turn on"`
-> 14.png

Top bar: "10 of 20 nodes, 5 of 41 edges". The row now reads "weight is at least 5 -- 20 to 10 nodes, 41 to 5 edges", ticked. Right panel agrees: 10 of 20, 5 of 41. The drawing shows five little pairs (two of the dots at the bottom overlap). That matches the four 5s I saw at the top of the sorted table plus one more. Answer: 10 people at 5 or more runs.

Now unticking again to get the whole club back.

## Step 15 -- untick the filter
`--step $S --click-at 274,247`
-> input "Apply step: weight is at least 5", 15.png

Everyone is back: Nodes 20, Edges 41, the counter in the top bar is gone, the step is kept as "weight is at least 5 -- off". Note: by changing 4 to 5 I replaced my 4-or-more step; if the flyer still needs the 4s I'd change the number back. Done.

`--end $S`
-> "session ended"

## At the end, in Grace's words

**Did I finish?** Yes, both. Pairs who ran together 4 or more times: 19 people (12 pairs). Pairs who ran 5 or more times: 10 people (5 pairs). Both times I brought the whole club back (20 people, 41 rows) by unticking the step.

**Ease: 6 of 7.** The Filters button in the toolbar went straight to a form that read like a sentence: keep an attribute's value, weight, at least, 4. The line "Keeps edges that pass and the nodes at their ends" told me exactly what would happen to the people. The count in the top bar ("19 of 20 nodes, 12 of 41 edges") and the "20 to 19 nodes, 41 to 12 edges" on the step are just what I check against Excel. Unticking to get everyone back, and the step staying there as "off", is perfect for next time. Editing the step and "Save and turn on" for the 5s was quick. My PageRank sizes and colors stayed put, and the key said "full graph" while filtered, so I knew the ranking was not recomputed.

**What confused me:**
- The table under the drawing ignored the filter: "20 nodes" and "41 edges", rows with 2s and 3s still listed, while the picture showed 19 and 12. Nothing on the table says it is the whole file. I only trusted it after sorting by weight and counting the rows of 4 and up myself.
- The table shows only four rows at a time, so counting rows meant scrolling and guessing from the scrollbar.
- Only one runner dropped at 4 or more. I would have liked to be told who (which person has no pair of 4+), but the count was enough for the flyer.
- In the drawing a couple of dots overlap at the bottom, so counting the dots by eye did not work; I relied on the numbers.
- Changing 4 to 5 replaced my first step rather than keeping both; fine today, but I had to think about it.
