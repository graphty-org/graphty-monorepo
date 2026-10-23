# Session r2-s21 -- Dev (returning student), task T17, dataset A (running club, friends.csv)

Build: frozen build 8f0d5a6f7791 (`.study-builds/tier2-r2d4-8f0d5a6f7/`). Setup: `friends-ranked.txt`.

All commands run from `design/ui/studio/tier2` with `REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r2d4-8f0d5a6f7/`.

## Start

`../tool/with-browser.sh node ../tool/real.mjs --start rounds/round-2/sessions/r2-s21 setup:friends-ranked.txt` -> 01.png

01.png: Okay, my running club map from last time. Dots sized and colored by PageRank, the key on top left. Left side has "Selection", "PageRank 20", "Everything". Bottom toolbar has a flask, a chart-ish icon, "3D" and a magnifier. I need to get rid of the pairs who ran fewer than 4 times. In Gephi this was the "filter"... I do not see that word. The third column was "weight", I think. Maybe the Data tab on the far left shows my columns.

## Step 2

Hovered the chart-ish toolbar icon to see what it is.
`node ../tool/real.mjs --step rounds/round-2/sessions/r2-s21 --hover-at 728,864` -> 02.png, tooltip "Layout". Not it. The flask is the analysis button I used for the ranking. Nothing says filter down there. I will try the Data tab on the left, since that is where my spreadsheet columns should be.

## Step 3

`node ../tool/real.mjs --step rounds/round-2/sessions/r2-s21 --click "Data"` -> 03.png

Oh nice, "Filters" with a plus, that is the Gephi word. Source says friends.csv, 20 nodes, 41 edges. Under Edges there is "weight" with a # sign, so it read my runs column as a number, good. I will press the plus next to Filters.

## Step 4

`node ../tool/real.mjs --step rounds/round-2/sessions/r2-s21 --click-at 276,197` -> 04.png ("Add filter step")

A "New filter step" panel on the right: Keep "an attribute's value", Attribute empty, "Add step" button greyed out. Fine, I need weight. Opening the Attribute box.

## Step 5

`node ../tool/real.mjs --step rounds/round-2/sessions/r2-s21 --click "Attribute"` -> 05.png

List shows Nodes: id, Edges: weight. Picking weight.

## Step 6-7

`--click "weight"` -> 06.png: the tool said the name was ambiguous (the dropdown option and the weight in the left tree), so nothing happened. `--click "weight#1"` (the dropdown option) -> 07.png

Now it shows "Is: at least" and an empty Value, with "Keeps edges that pass and the nodes at their ends." "At least" is exactly what I want, 4 or more. Typing 4 in Value.

## Step 8

`--click "Value" --type "4"` -> 08.png

Value says 4, "Add step" is blue now. Clicking it.

## Step 9

`--click "Add step"` -> 09.png

Oh nice. Lots of the lines are gone. Top bar now says "19 of 20 nodes" next to a little funnel, and the filter shows in the left list as "weight is at least 4 / 20 to 19 nodes" with a checkbox ticked. The right panel switched to Graph > Values: "Nodes showing 19 of 20", "Edges showing 12 of 41". So 12 pairs ran together 4 or more times, and 19 people are still in it. Wait, only one person dropped out? I count the dots on the drawing... I get about 19, there are two dots stuck together near the bottom left. Okay, believable: most people have at least one regular partner. The dots did not move, and the key still says "PageRank on 20 nodes", so the ranking is still the whole-club one. That is fine for the flyer, I think.

Answer I would give: 19 people are still in the drawing (12 pairs).

Now bring the whole club back. The checkbox next to the filter looks like an on/off switch. Unticking it.

## Step 10

`--click-at 273,239` ("Apply step: weight is at least 4") -> 10.png

All the lines are back, the funnel and "19 of 20" left the top bar, the filter row says "off", right panel says Nodes 20, Edges 41. Whole club is back. Prompt done: 19 people with 4 or more runs together, and the club is back.

### Follow-up given: "Your club now asks the same for pairs who ran together 5 or more times. How many people are in the drawing then? Bring the whole club back when you are done."

Okay, I already have a filter, I would rather change the 4 to a 5 than make a new one. Clicking on the filter row's words to see if it opens.

## Step 11

`--click-at 163,231` (treeitem "weight is at least 4") -> 11.png

The right panel opened my filter: "weight is at least 4, Filter step, Off", same boxes, Value 4, and the button now says "Save and turn on". So I can change the 4 to a 5 and turn it back on in one go. Clearing the value and typing 5.

## Step 12

`--click "Value" --key Control+a --type "5"` -> 12.png

Value says 5 now. The title up top and the left row still say "at least 4" until I save, I guess. Pressing "Save and turn on".

## Step 13

`--click "Save and turn on"` -> 13.png

Way fewer now. Top bar "10 of 20 nodes", the row says "weight is at least 5 / 20 to 10 nodes", ticked, and the right panel says "Nodes showing 10 of 20", "Edges showing 5 of 41". I count the dots: two up top left, two top right, two in the middle, and four at the bottom (two of them are squashed together, I had to look twice). That is 10. Matches.

Answer I would give: 10 people are in the drawing at 5 or more runs together (5 pairs).

Bringing the whole club back the same way as before: unticking the filter.

## Step 14

`--click-at 273,239` ("Apply step: weight is at least 5") -> 14.png

All 20 dots and all the lines are back, the filter row says "off", the top bar has no "of 20" any more, right panel Nodes 20, Edges 41. Done.

`node ../tool/real.mjs --end rounds/round-2/sessions/r2-s21` (the first --end printed the follow-up question, which steps 11-14 had already answered; --end was run a second time to close the session)

## End (in character)

**Did I finish?** Yes, both parts. At 4 or more runs together: 19 people (12 pairs). At 5 or more: 10 people (5 pairs). Both times I brought the whole club back by unticking the filter, and the counts went back to 20 people and 41 ties.

**Ease: 6 out of 7.**

**What confused me:**
- I looked at the bottom toolbar first, because that is where I ran the ranking last time. There is nothing there for "filter". I only found it because I went into the Data tab looking for my columns, and "Filters" was there. If I had not wandered in there I might have asked a classmate.
- When I chose "weight", I was not sure which "weight" to pick, because it is in two places: the dropdown and the list on the left.
- After I typed 5, the title and the left row still said "at least 4" until I pressed save. For a second I thought it had not taken my 5.
- The dots did not move when people were removed, and the key still says "PageRank on 20 nodes", so the drawing has gaps where the missing people were. For a flyer I am not sure if I should rerun the ranking on just the strong pairs. Nothing told me to, so I left it.
- Two dots near the bottom sit on top of each other, so counting by eye was hard. I trusted the "Nodes showing" number instead.

**What I liked:** "at least" was already picked, and the little line "Keeps edges that pass and the nodes at their ends" told me what would happen. The "19 of 20 nodes" in the top bar and "Nodes showing" gave me a number I can put in the essay. The tick box to turn the filter off and on was easy to understand.
