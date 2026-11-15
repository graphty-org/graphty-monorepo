# Session r1-s23 -- Dana Okafor (supply chain risk analyst), returning user

Task: one site turned up only in the delivery log, not one of the food bank's own sites. Take it out of the picture without deleting it from the network; say how many sites are still in the picture.

## Step 0 -- start
Command: REAL_DIST=... REAL_TIER=4 node .../real.mjs --start <session> setup:pantries-joined.txt
Screenshot 01.png. Notes: The food bank project is open on Data. Sources: pantries.csv says 12, deliveries says 13 sites and 18 links, and a warning 1. Overview says 13 nodes. So the sites list has 12 and the delivery log brought in one extra -- that is my stray. There is a "Filters" box with a plus on the left. I'll scroll the table to find row 13 first.

## Step 1
Command: --step <session> --wheel 700,700,600
Screenshot 02.png. Notes: There it is: P13, a row with an id and nothing else -- no lat, no site name. That's the one from the delivery log. Twelve real sites. Now I need to hide P13 without deleting it. "Filters" with a plus on the left sounds like the Power BI way to do it. Clicking the plus next to Filters.

## Step 2
Command: --step <session> --click-at 275,420  (button "Add filter")
Screenshot 03.png. Notes: A list of columns to filter on: Node id, lat, lon, families, site ("92% have a value" -- that's 12 of 13, the stray has none). Simplest for me: filter on Node id and leave out P13. Clicking "Node id".

## Step 3
Command: --step <session> --click-at 324,522  (option "Node id")
Screenshot 04.png. Notes: A filter card: Node id, "Contains", a text box. "Contains P13" would keep only P13 -- the opposite of what I want. I want "does not contain" or "is not". Opening the "Contains" dropdown.

## Step 4
Command: --step <session> --click-at 180,476  (combobox "Node id: how to match")
Screenshot 05.png. Notes: Contains, Starts with, Ends with, Is exactly. No "is not". Hm. Maybe the card has a keep/hide switch once there's a value. I'll pick "Is exactly", type P13 and see what it does.

## Step 5
Command: --step <session> --click "Is exactly" --click "Type the text to match" --type "P13"
Screenshot 06.png. Notes: The card says "1 of 13" -- it found P13. But the picture looks the same, and there's no switch to say "hide these" instead of "keep these". If this keeps only P13 that's backwards. I'll right-click the card header to see if there's an "exclude" or "invert" option.

## Step 6
Command: --step <session> --rclick-at 130,456  (button "Node id")
Screenshot 07.png. Notes: The filter kicked in (maybe it applied once I left the text box). Now the picture shows ONLY P13 -- "1 of 13 nodes, 0 of 18 edges" at the top. Exactly backwards. The card grew a "Select | Hide" pair, with Hide looking like it's on, and a checkbox. Confusing: if Hide is on, why is P13 the one showing? Hovering "Hide" to see what it claims to do.

## Step 7
Command: --step <session> --hover-at 246,482
Screenshot 08.png. Tooltip: "Hide nodes that do not match". Notes: OK, so a filter here always means "keep what matches". There's no "is not". So I have to describe the 12 real sites instead of the 1 stray. The real ones all have a site name and P13 has none ("site 92% have a value"). I'll throw away this Node id filter (the X) and make a filter on "site".

## Step 8
Command: --step <session> --click-at 273,456 ("Remove Node id is P13") --click "Add filter"
Screenshot 09.png. Notes: Back to all 13, and the column list is open again. Picking "site".

## Step 9
Command: --step <session> --click-at 314,634 (option "site, 92% have a value")
Screenshot 10.png. Notes: Same card shape: "Contains" and a text box. The list said "92% have a value", so maybe the dropdown has a "has a value" choice this time. Opening it.

## Step 10
Command: --step <session> --click-at 180,476 (combobox "site: how to match")
Screenshot 11.png. Notes: This one does have "Has a value" and "Has no value". (Node id didn't -- I guess every row has an id.) "Has a value" keeps the 12 with a site name and drops the blank stray. Clicking it.

## Step 11
Command: --step <session> --click "Has a value"
Screenshot 12.png. Notes: That did it. Top bar: "12 of 13 nodes, 17 of 18 edges". Right panel: "Nodes showing 12 of 13", and under "Full graph" still Nodes 13, Edges 18 -- so P13 is hidden, not deleted. The table shows "12 of 13 nodes", Shown. One delivery route went with it (the one to the stray). I'm done.

## Wrap-up (in character, Dana)

Did I finish? Yes. P13 -- the site with only an id and no name, address or anything, that came in from the delivery log -- is out of the picture with a filter "site: Has a value". The network still has all 13; **12 sites are still in the picture** (17 of 18 delivery routes shown).

Ease: 5 out of 7.

What confused me:
- My first instinct was "Node id is not P13". There is no "is not" / "exclude" anywhere. Filters here only ever keep what matches, which I only learned from a tooltip ("Hide nodes that do not match") after I'd built a filter that showed ONLY the stray. In Power BI I'd untick one box in a list; here I had to think backwards and describe the 12 good ones instead of the 1 bad one.
- The "Select | Hide" pair on the card had "Hide" lit up while the picture was showing the one node I wanted gone. "Hide" means "hide the non-matches", which reads the opposite way at first glance.
- The Node id filter didn't apply while I was typing; it only kicked in after I clicked elsewhere, so for a moment I thought it did nothing.
- "Has a value" / "Has no value" exist for site but not for Node id, so I only found them by trying a second column. Lucky the stray had a blank name; if it had a name I'd have been stuck.
- Good: the counts are right there -- "12 of 13 nodes" at the top and "Full graph 13" on the right -- so I can see it's hidden, not gone. That I'd trust in front of a VP. Labels in the filter card ("Select", "Hide", the hint line) are tiny and grey; hard on my eyes.
