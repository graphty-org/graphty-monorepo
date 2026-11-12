# Session r3-s39 -- Nadia (returning user)

Task: friends.csv is open. Keep only pairs who ran together 4 or more times, say how many people remain, then bring the whole club back.

## Step 0 -- start
Command: `REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r3d2-26f3bb968/ node design/ui/studio/tool/real.mjs --start <session> setup:friends-ranked.txt`
Screenshot 01.png: friends.csv open, colored and sized by PageRank. Left panel: find box, "Selection", "PageRank 20", "Everything". Right panel: PageRank style. Toolbar at bottom: flask, chart, 3D, search.
Nadia: "OK, the network's up. I've never cut a network down to part of it. 'Everything' on the left sounds like the opposite of what I want -- maybe that's where the parts live. I'll click it."

## Step 1 -- click "Everything"
Command: `--step <session> --click "Everything"` -> 02.png
Nadia: "That's just the color and size of all the dots. Not a way to cut anything. The 'Data' button on the far left might be where the runs-together numbers are -- I'll try that."

## Step 2 -- click "Data"
Command: `--step <session> --click "Data"` -> 03.png
Nadia: "friends.csv, 20 nodes, 41 edges. There's 'Filters' with a plus, and under Edges there's 'weight' -- that must be the runs-together column. A filter is what I want. Plus next to Filters."

## Step 3 -- click the plus beside "Filters"
Command: `--step <session> --click-at 276,197` (button "Add filter step") -> 04.png
Nadia: "New filter step on the right. 'Keep an attribute's value', then 'Attribute' is empty. I'll open Attribute and look for weight."

## Step 4 -- open "Attribute"
Command: `--step <session> --click "Attribute"` -> 05.png
Nadia: "List shows Nodes: id, Edges: weight. Weight under Edges -- that's the pairs. Picking it."

## Step 5 -- choose "weight"
Command: `--step <session> --click "role=option:weight"` -> 06.png
Nadia: "weight, 'is at least', Value empty. 'Keeps edges that pass and the nodes at their ends' -- that's exactly 4 or more. Type 4, Add step."

## Step 6 -- type 4 in Value, click "Add step"
Command: `--step <session> --click "Value" --type "4" --click "Add step"` -> 07.png
Nadia: "Drawing thinned out. Top bar says '19 of 20 nodes', filter row says 'weight is at least 4, 20 to 19 nodes', right panel 'Nodes showing 19 of 20, Edges showing 12 of 41'. So 12 pairs and 19 people still in it. Only one person drops out -- surprising, but three places agree, so I'd write down 19. Legend says 'full graph', so the sizes weren't recalculated, fine.
Now to bring everyone back: there's a checked box on the filter row. Unticking it should switch the filter off without deleting it -- I'd rather not delete in case I need it for the flyer."

## Step 7 -- untick the filter
Command: `--step <session> --click-at 273,239` (checkbox "Apply step: weight is at least 4") -> 08.png
Nadia: "All the lines are back, 20 nodes and 41 edges on the right, the '19 of 20' in the top bar is gone, and the filter row now says 'off' -- still there if I need it again. Whole club is back. Done."

## End
Command: `--end <session>`
The end answered with a further request: "Your club now asks the same for pairs who ran together 5 or more times. How many people are in the drawing then? Bring the whole club back when you are done."

## Step 8 -- open the existing filter row
Nadia: "Same thing at 5. I'd rather change the filter I already have than make another one. Clicking the row's name to see if it opens for editing."
Command: `--step <session> --click "weight is at least 4"`
-> 09.png
Nadia: "It opened my filter on the right with Value 4 and a 'Save and turn on' button. Change 4 to 5 and press that."

## Step 9 -- change 4 to 5, "Save and turn on"
Command: `--step <session> --click "Value" --key Control+a --type "5" --click "Save and turn on"`
-> 10.png
Nadia: "'weight is at least 5, 20 to 10 nodes', top bar '10 of 20 nodes', right panel 'Edges showing 5 of 41'. Five pairs, 10 people. Answer: 10. Two of the dots at the bottom overlap, so I'm trusting the count over my eyes. Untick to bring everyone back."

## Step 10 -- untick the filter
Command: `--step <session> --click-at 273,239`
-> 11.png
Nadia: "All 20 back, 41 edges, filter row says 'off'. Done."

## End (second)
Command: `--end <session>`
Session ended.

## In character, at the end
- Finished: yes. At 4 or more runs together: 12 pairs, 19 people still in the drawing. At 5 or more: 5 pairs, 10 people. Both times I brought the whole club back (20 people, 41 pairs) by unticking the filter, which left it in the list marked "off".
- Ease: 6 of 7.
- What confused me: at first I didn't know where cutting the network down would live. "Everything" in the Graph list sounded like it, but it only holds colors and sizes. I found "Filters" under Data on the second try. Once I was there, the words led me straight through: weight, "at least", a value, and the line "Keeps edges that pass and the nodes at their ends". Seeing the count in three places (the top bar, the filter row, the right panel) made me trust 19 even though I expected more people to drop out. Two dots overlap at the bottom, so I could not have counted them by eye. The checkbox told me plainly that it only switched the filter off and didn't delete anything, which is what I wanted. For the alert file I'd still want to know whether the legend's "full graph" means the sizes ignore the filter. I think it does, but I'd have to ask.
