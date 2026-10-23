# Session r3-s37 -- Explorer Elena, returning user

Task: friends.csv is open. Keep only pairs who ran together 4 or more times, say how many people are still in the drawing, then bring the whole club back. (Follow-up after the first --end: the same for 5 or more.)

Every command ran from the studio worktree with
`REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r3d2-26f3bb968/` and
`node design/ui/studio/tool/real.mjs`, against this session's folder (written as `$S` below; the
screenshots NN.png are in this folder).

## Start -- `--start $S setup:friends-ranked.txt` (01.png)
My running club as orange balls with arrows. A little box top-left says Size: PageRank and Color: PageRank. Left list: Selection, PageRank (20), Everything. Right panel is PageRank with Style / Values.

## Step 1 -- `--step $S --click "Data"` (02.png)
"The numbers are probably under Data." Data shows friends.csv, 20 nodes, 41 edges, a Filters row with a plus, and Attributes: Nodes id, Edges weight. I take "weight" to be my runs-together count.

## Step 2 -- `--step $S --click-at 276,197` ("Add filter step") (03.png)
"Filters, plus. That's the obvious thing." The right side changed to "New filter step": Keep = "an attribute's value", Attribute = empty dropdown, a grey "Add step" button.

## Step 3 -- `--step $S --click "Attribute"` (04.png)
"Which thing do I filter on?" A list opened: Nodes: id; Edges: weight.

## Step 4 -- `--step $S --click "role=option:weight"` (05.png)
"Weight -- that has to be the runs count." Now it shows Is = "at least", a Value box, and a line "Keeps edges that pass and the nodes at their ends." "At least" is exactly what I want.

## Step 5 -- `--step $S --click "Value" --type "4"` (06.png)
"Four or more." Value shows 4; "Add step" turned blue. The picture has not changed yet.

## Step 6 -- `--step $S --click "Add step"` (07.png)
"Go." Most lines vanished. Top bar now reads "19 of 20 nodes" with a funnel icon. Left: Filters "weight is at least 4 / 20 to 19 nodes" with a blue tick. Right: Nodes showing 19 of 20, Edges showing 12 of 41. The legend now says "PageRank, full graph".
"So 19 people are still in it -- just one person never ran 4 times with anyone." Answer: 19 people (12 pairs).
Small doubt: two dots at the bottom left sit on top of each other with no line I can see between them, so I trust the number over counting dots.

## Step 7 -- `--step $S --click-at 274,238` (the tick on "weight is at least 4") (08.png)
"That tick looks like on/off." Unticked it: all lines are back, right side says Nodes 20, Edges 41, the "19 of 20" in the top bar is gone, and the filter row says "off". The filter is still there if I want it again for the flyer. Whole club back.

## `--end $S` (first time)
The session answered with a further request: "Your club now asks the same for pairs who ran together 5 or more times. How many people are in the drawing then? Bring the whole club back when you are done." Carrying on in the same session.

## Step 8 -- `--step $S --click-at 160,231` (the "weight is at least 4" row) (09.png)
"Can I just change the 4?" The right side shows my filter: weight, at least, Value 4, button "Save and turn on". Header says Filter step Off.

## Step 9 -- `--step $S --click "Value" --key Control+a --type "5"` (10.png)
Value now reads 5. Nothing else changed yet; the row on the left still says "at least 4".

## Step 10 -- `--step $S --click "Save and turn on"` (11.png)
The drawing dropped to a few pairs. Top bar "10 of 20 nodes"; filter row "weight is at least 5 / 20 to 10 nodes", ticked; right side Nodes showing 10 of 20, Edges showing 5 of 41. I can count about 10 dots too (two at the bottom overlap). Answer: 10 people (5 pairs).

## Step 11 -- `--step $S --click-at 274,238` (untick "weight is at least 5") (12.png)
Everyone is back: Nodes 20, Edges 41, the top-bar count is gone, the filter row says "off". Whole club back again.

## `--end $S` (second time)
Session ended.

## Wrap-up, in character

- **Did I finish?** Yes, both. 4 or more times: 19 people still in it (12 pairs). 5 or more times: 10 people (5 pairs). Both times I brought the whole club back (20 people, 41 lines) by unticking the filter.
- **Ease:** 6 out of 7. "Filters" with a plus under Data was right where I looked, the choices read like a sentence ("weight is at least 4"), and the "19 of 20 nodes" up top told me the answer without counting dots. Changing 4 to 5 was just clicking my filter and editing the number.
- **What confused me:**
  - I had to guess that "weight" is my "runs together" number. It is the only number, so it worked, but my sheet calls it runs, not weight.
  - It says "nodes", not people. I figured it out, but that is not my word.
  - Two dots at the bottom sit on top of each other, so counting by eye would have been wrong -- I trusted the number instead.
  - I wasn't sure the tick box would just switch the filter off and not delete it; it did say "off" and kept it, which was a relief.
