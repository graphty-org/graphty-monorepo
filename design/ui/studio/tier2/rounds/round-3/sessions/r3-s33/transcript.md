# Session r3-s33 -- Ruth, returning

Task: friends.csv is open. Keep only pairs who ran together 4 or more times, say how many people are still in it, then bring the whole club back.

Every command ran from the studio worktree with
`REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r3d2-26f3bb968/` and
`node design/ui/studio/tool/real.mjs ... <session>`, where `<session>` is this session's folder.

## Step 0 -- start

    --start <session> setup:friends-ranked.txt

Output: build 26f3bb968e43 graphty@0.8.61; 01.png. The friends map is open: 20 dots, a PageRank run in the left list, an "Everything" layer, a toolbar at the bottom. Nothing labeled filter in sight.

## Step 1
"What is the second bottom button?" `--step <session> --hover-at 728,864` -> button "Layout". Not it. (02.png)

## Step 2
"'Everything' might be what is shown." `--click "Everything"` -> 03.png: a style panel (fill color, size, shape). That is about looks, not which pairs show.

## Step 3
"The Data tab on the far left, where the columns live." `--click "Data"` -> 04.png: Sources friends.csv "20 nodes, 41 edges" (matches my sheet), a "Filters" row with a +, Attributes: Nodes id, Edges weight. Filters is what I want.

## Step 4
`--click-at 276,197` -> button "Add filter step". 05.png: right panel "New filter step", Keep "an attribute's value", Attribute empty, Add step grayed.

## Step 5
`--click "Attribute"` -> 06.png: list grouped Nodes (id) and Edges (weight).

## Step 6
`--click "role=option:weight"` -> 07.png: Is "at least", Value empty, hint "Keeps edges that pass and the nodes at their ends." That plain sentence answers my "counted over what?" before I ask.

## Step 7
`--click "Value" --type "4"` -> 08.png: Value 4, Add step now blue.

## Step 8
`--click "Add step"` -> 09.png: top bar "19 of 20 nodes" with a filter icon; Filters row "weight is at least 4 / 20 to 19 nodes" with its box ticked; right panel Overview "Nodes showing 19 of 20", "Edges showing 12 of 41"; Full graph 20 nodes, 41 edges. I counted 19 dots on the drawing myself -- picture and numbers agree. The legend now says "PageRank, full graph", so the ranking was not silently redone on the cut-down map. Good.

## Step 9
"Check one link." `--click-at 532,330` -> edge "34". 10.png: right panel "Ravi -> Sana", Edge, weight 4. At least 4 -- the link held. Answer: 19 people remain (12 of the 41 pairs).

## Step 10
"Whole club back. Is the tick box an on/off switch?" `--hover-at 274,239` -> input "Apply step: weight is at least 4", tooltip "Turn this step off". (11.png)

## Step 11
`--click-at 274,239` -> 12.png: every line back, the "19 of 20 nodes" tag gone from the top bar, the filter row reads "weight is at least 4 / off" with the box empty, legend back to plain "PageRank". The rule is kept for later without deleting it.

## --end
`--end <session>` -> not ended; follow-up request: "Your club now asks the same for pairs who ran together 5 or more times. How many people are in the drawing then? Bring the whole club back when you are done."

## Step 12
"Open my existing rule and change 4 to 5." `--click "weight is at least 4"` -> 13.png: right panel "weight is at least 4 / Filter step Off", same fields, value 4, button "Save and turn on".

## Step 13
`--click "Value" --key Control+a --type "5"` -> 14.png: Value 5. The panel title still says "at least 4" until saved; fair enough.

## Step 14
`--click "Save and turn on"` -> 15.png: top bar "10 of 20 nodes"; rule row "weight is at least 5 / 20 to 10 nodes", ticked. I count 10 dots (two overlap at the bottom), 5 pairs. Answer: 10 people. Note: the right panel still shows "Ravi -> Sana, weight 4" from my earlier click -- a tie that is no longer drawn. Nothing on that panel says it is hidden now.

## Step 15
"Bring the whole club back." `--click-at 274,239` -> input "Apply step: weight is at least 5". 16.png: every line back, no "of 20" tag in the top bar, rule row "weight is at least 5 / off".

## --end (again)
`--end <session>` -> "session ended".

## In character, at the end

Did I finish? Yes, both asks. At 4 or more runs together: 19 of the 20 people are still in the drawing (12 of the 41 pairs). At 5 or more: 10 people (5 pairs). Both times I brought the whole club back by turning the rule off, and the rule stayed in the list for next time.

Ease: 6 of 7.

What confused me:
- Finding where to start. Nothing on the main Graph screen says "filter" or "show only". I tried the bottom Layout button and the "Everything" layer (colors and sizes) before the Data tab showed me "Filters" with a plus. Two wrong turns.
- After the 5-or-more rule hid Ravi and Sana's tie, the right-hand panel kept showing "Ravi -> Sana, weight 4" as if it were still on the map. Nothing said it was hidden now. I would want a word there.
- The editor's title still read "weight is at least 4" while my value said 5, until I saved. Minor.

What saved me a check: the sentence under the value ("Keeps edges that pass and the nodes at their ends") told me exactly what was counted; the top bar and the rule row both gave the count ("19 of 20 nodes", "20 to 19 nodes") and they matched the dots I counted myself; the legend said "PageRank, full graph", so I knew the ranking had not been redone on the cut-down map.
