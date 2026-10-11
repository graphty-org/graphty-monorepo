# Session r4-s27 transcript (Tom, returning user)

Session folder (screenshots, logs): tmp/studio-sessions/tier2/rounds/round-4/sessions/r4-s27 in the studio worktree.
Every command ran with REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r4d1-5277e2cbe/ and T=design/ui/studio/tool, S=<session folder>.

## Step 1 -- start

Command: `node $T/real.mjs --start $S setup:friends-ranked.txt`

Screenshot 01: the friends map is open, colored and sized by PageRank, the way I left it. Left panel: Selection, PageRank (20), Everything. Bottom toolbar has a flask, a chart, 3D, a list, a table, a funnel-looking icon and a search. I want to keep only pairs who ran 4 or more times. The funnel-looking icon is probably a filter; I'll hover it first to read its name.

## Step 2

Command: `node $T/real.mjs --step $S --hover-at 833,863`

Output: button "Filters", tooltip "Filters", cursor: default (arrow, not a hand -- I was not sure it was clickable). Good, it's a filter. I'll click it.

## Step 3

Command: `node $T/real.mjs --step $S --click "Filters"`

Screenshot 03: the left side switched to Data (friends.csv, 20 nodes, 41 edges; Filters; Attributes: Nodes id, Edges weight). On the right a "New filter step": Keep "an attribute's value", an empty Attribute box, and a grey "Add step" button. The third column must be "weight". I'll open the Attribute box.

## Step 4

Command: `node $T/real.mjs --step $S --click "Attribute"`

Screenshot 04: the list opened with Nodes: id and Edges: weight. Weight is the run count. I'll pick weight.

## Step 5

Command: `node $T/real.mjs --step $S --click "role=option:weight"`

Screenshot 05: Attribute now weight, "Is: at least" already chosen, an empty Value box, and a small note "Keeps edges that pass and the nodes at their ends." That reads like exactly what I want (the small grey note is hard for my eyes, but I could read it). I'll click Value and type 4.

## Step 6

Command: `node $T/real.mjs --step $S --click "Value" --type "4"`

Screenshot 06: Value shows 4 and "Add step" turned blue. No preview on the drawing yet. "at least 4" is what the flyer needs. I'll press Add step.

## Step 7

Command: `node $T/real.mjs --step $S --click "Add step"`

Screenshot 07: the drawing thinned out a lot. Top bar now says "19 of 20 nodes, 12 of 41 edges". Left, under Filters: "weight is at least 4 -- 20 to 19 nodes, 41 to 12 edges" with a ticked box. Right panel: Nodes showing 19 of 20, Edges showing 12 of 41. The legend now says "PageRank, full graph".

This puzzles me. The note said it keeps the edges that pass "and the nodes at their ends". 12 links can't touch 19 people... can they? Bottom left there are two balls overlapping (around 570,755) with no line I can see, and a few others look like they hang on one line only. Before I write "19" on a flyer I want to check. I'll open the table (the grid icon in the toolbar) to see who is still in.

## Step 8

Command: `node $T/real.mjs --step $S --click-at 793,863` (button "Table")

Screenshot 08: a table opened under the drawing, Nodes tab, "20 nodes" -- Ava, Ben, Chloe, Dev... So the table still lists all 20 while the top says 19. Which one is gone? I'll look at the Edges tab first to see the 12 links that are left.

## Step 9

Command: `node $T/real.mjs --step $S --click "role=tab:Edges"`

Screenshot 09: the Edges tab says "41 edges" and the first rows include Ava-Ben 3 and Ava-Dev 2 -- pairs the filter should have dropped. So the table is showing the whole file, not what's on the drawing, and nothing on the table says so ("In the order loaded" is all it says). That shook my confidence for a moment. But the top bar, the Filters line and the right panel all agree: 19 of 20 people, 12 of 41 pairs. Twelve links can reach 19 people if they mostly don't share anyone, and the drawing is lots of little chains and pairs, so I'll believe 19. Answer for the flyer: 19 people still in it (12 pairs).

Now to bring everyone back. The filter line on the left has a ticked box; unticking seems like the gentle way -- it keeps the step in case I want it again for the flyer. I'll untick it.

## Step 10

Command: `node $T/real.mjs --step $S --click-at 274,247` (input "Apply step: weight is at least 4")

Screenshot 10: the whole club is back -- all the lines and balls, the right panel says Nodes 20, Edges 41, the top bar no longer shows the "19 of 20" count, and the legend lost "full graph". The filter stays listed as "weight is at least 4 -- off" with an empty box, so I can tick it again when I make the flyer. Done. I'll end the session.

## Step 11 -- end, and a follow-up request

Command: `node $T/real.mjs --end $S`

The session did not end; it asked: "Your club now asks the same for pairs who ran together 5 or more times. How many people are in the drawing then? Bring the whole club back when you are done."

The 4-or-more step is still sitting there, switched off. I'd rather change that one to 5 than pile up a second filter. I've never edited a step; I'll click its name to see whether it opens for changing.

## Step 12

Command: `node $T/real.mjs --step $S --click-at 160,231` (treeitem "weight is at least 4")

Screenshot 11: the right side shows the step again: "weight is at least 4, Filter step Off", the same boxes with Value 4, and a blue "Save and turn on" button. Good -- I can just change the number. I'll click Value, select what's there and type 5.

## Step 13

Command: `node $T/real.mjs --step $S --click "Value" --key Control+a --type "5"`

Screenshot 12: Value now reads 5 (the title still says "at least 4" until I save, which is fine). I'll press "Save and turn on".

## Step 14

Command: `node $T/real.mjs --step $S --click "Save and turn on"`

Screenshot 13: top bar "10 of 20 nodes, 5 of 41 edges"; the filter line now reads "weight is at least 5 -- 20 to 10 nodes, 41 to 5 edges", ticked; right panel Nodes showing 10 of 20. On the drawing I can count three separate pairs and a little group at the bottom (two balls overlap there), which fits 5 links and 10 people. Answer: 10 people at 5 or more runs. (The table below still lists all 41 pairs, as before.)

Now bring the whole club back: untick the step again.

## Step 15

Command: `node $T/real.mjs --step $S --click-at 274,247` (input "Apply step: weight is at least 5")

Screenshot 14: everyone is back -- 20 nodes, 41 edges on the right, no count in the top bar, the full drawing. The step stays as "weight is at least 5 -- off". I'm done; ending again.

Command: `node $T/real.mjs --end $S` -- "session ended".

## In my own words, at the end (Tom)

**Did I finish?** Yes, both parts.
- 4 or more runs together: 19 people (12 pairs) were left in the drawing. Then I unticked the filter and all 20 people and 41 links came back.
- 5 or more runs: I changed the same filter to 5 and saved it -- 10 people (5 pairs). Unticked it again and the whole club came back.

**Ease: 6 out of 7.** The Filters button walked me through it in plain words: Keep an attribute's value, weight, at least, 4. The little line "Keeps edges that pass and the nodes at their ends" told me what it would do before I pressed anything. Unticking to get everyone back, and clicking the step to change 4 to 5 ("Save and turn on"), were both obvious.

**What confused me:**
- The table under the drawing kept showing all 20 people and all 41 pairs, including pairs with 2 and 3 runs, while the filter was on and the top bar said 19 of 20. Nothing on the table says it is showing the whole file and not the drawing. For a minute I thought the filter hadn't worked, or that I was about to put a wrong number on the flyer. I went with 19 because three other places on screen agreed.
- 19 out of 20 for "4 or more" surprised me -- the drawing looked like it had lost most of its links but almost nobody. I couldn't tell which one person dropped out, and two balls at the bottom left sat on top of each other with no line I could see between them.
- The filter button in the toolbar shows a plain arrow when I point at it, not the hand, so I hovered first to make sure it did something.
- The note under the Value box and the labels like "Is" and "Value" are very small and grey for my eyes.
