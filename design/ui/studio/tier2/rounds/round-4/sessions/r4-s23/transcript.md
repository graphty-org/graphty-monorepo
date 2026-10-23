# Session r4-s23 -- Dev, returning (filter running pairs by weight)

Task: friends.csv is open; its third column counts runs together last month. Keep only pairs with 4 or more runs, say how many people remain, then bring the whole club back.

Session folder (screenshots): tmp/studio-sessions/tier2/rounds/round-4/sessions/r4-s23

## Step 0 -- start

    REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r4d1-5277e2cbe/ node design/ui/studio/tool/real.mjs --start <session> setup:friends-ranked.txt

01.png: friends.csv is open, PageRank ran, dots sized and colored by it. Left panel: Selection, PageRank (20), Everything. A toolbar at the bottom with icons. Dev: "Okay, it's my running club. I need only the pairs with 4 or more runs. There's an icon at the bottom that looks like a filter (the lines getting shorter). That's the obvious door."

## Step 1 -- hover the funnel icon

    real.mjs --step <session> --hover-at 833,863

Tooltip "Filters". Dev: "Yes, Filters. That's the word I wanted."

## Step 2 -- click Filters

    real.mjs --step <session> --click "Filters"

03.png: left panel switched to Data (friends.csv, 20 nodes, 41 edges; Filters +; Attributes: Nodes id, Edges weight). Right panel: "New filter step", Keep: "an attribute's value", Attribute: empty dropdown, "Add step" greyed. Dev: "Oh nice, it says 20 nodes, 41 edges, so I can count after. Keep an attribute's value -- the attribute is my runs column, weight. Let me pick it."

## Step 3 -- open Attribute

    real.mjs --step <session> --click "Attribute"

04.png: list shows Nodes: id; Edges: weight. Dev: "Edges, weight. That's the runs-together number."

## Step 4 -- pick weight

    real.mjs --step <session> --click "role=option:weight"

05.png: Attribute weight, Is "at least" (already chosen), Value empty, hint "Keeps edges that pass and the nodes at their ends." Dev: "At least is exactly what I want, 4 or more. And it says it keeps the nodes at their ends, so people with no 4+ pair should drop out. Type 4."

## Step 5 -- type 4

    real.mjs --step <session> --click "Value" --type "4"

06.png: Value 4, "Add step" is now blue. Drawing unchanged (no preview). Dev: "Okay, weight at least 4. Add step."

## Step 6 -- Add step

    real.mjs --step <session> --click "Add step"

07.png: the drawing now has only a few short chains. Top bar: "19 of 20 nodes, 12 of 41 edges". Left Filters list: "weight is at least 4 -- 20 to 19 nodes, 41 to 12 edges" with a ticked checkbox. Right panel Values: Nodes showing 19 of 20, Edges showing 12 of 41; Full graph 20 nodes, 41 edges. Legend now says "PageRank, full graph". Dev: "Oh nice, that worked. It even says it in three places: 19 of 20 nodes. So 19 people still have a pair with 4 or more runs, and only 12 of the 41 pairs are left. I counted the dots on screen too: 19. One person dropped out -- nobody they ran with 4+ times. Wait, two dots at the bottom left overlap so it's a little hard to see their line, but the count says 19 so I believe it. And the step shows exactly what I set, 'weight is at least 4', so I can show the instructor -- I mean the club -- what I did."

Essay-style sentence: "Keeping only pairs who ran together 4 or more times leaves 12 of the 41 pairs and 19 of the 20 runners."

Now bring the whole club back. Dev: "There's a checkbox on the filter step. Unticking it should turn it off without deleting it, so I can put it back later for the flyer."

## Step 7 -- untick the filter step

    real.mjs --step <session> --click-at 274,247

Tool: clicked input "Apply step: weight is at least 4". 08.png: the whole drawing is back, all lines. Filter step reads "weight is at least 4 -- off". Top bar no longer shows "19 of 20"; Values panel: Nodes 20, Edges 41. Legend lost the "full graph" note. Dev: "There we go, everybody's back, 20 nodes, 41 edges, and my filter is still there, just off. I can tick it again for the flyer. Done."

## End

    real.mjs --end <session>

--end answered with a further request: "Your club now asks the same for pairs who ran together 5 or more times. How many people are in the drawing then? Bring the whole club back when you are done."

## Step 8 -- open the existing filter step to change it

Dev: "Same thing with 5. I'd rather change my step than make a second one. Let me click on the step itself and see if it opens."

    real.mjs --step <session> --click-at 160,231

09.png: the right panel opened the step: title "weight is at least 4", "Filter step  Off", same fields with Value 4, button "Save and turn on". Dev: "Perfect, I can just change the 4 to a 5. 'Save and turn on' says what it'll do."

## Step 9 -- change 4 to 5

    real.mjs --step <session> --click "Value" --key Control+a --type "5"

10.png: Value now 5. Title still says "at least 4" until saved -- fine. Dev: "Save and turn on."

## Step 10 -- Save and turn on

    real.mjs --step <session> --click "Save and turn on"

11.png: top bar "10 of 20 nodes, 5 of 41 edges"; filter step "weight is at least 5 -- 20 to 10 nodes, 41 to 5 edges", ticked; Values panel Nodes showing 10 of 20, Edges showing 5 of 41. Five little pairs on screen. Dev: "Whoa, that cut it in half. 10 people, 5 pairs. Counting the dots: 10, though two at the bottom sit on top of each other, so I had to look twice. Makes sense -- five pairs, ten people, each pair is its own two people except the bottom one where three dots share lines... wait, that would be 11. Let me look again: the small dot, the middle one, and the two overlapping big ones at the bottom -- that's 4 dots with 2 lines... and 3 other pairs is 6. 4 + 6 = 10. Okay, the screen says 10, I'll trust it."

Sentence: "With pairs who ran together 5 or more times, only 5 pairs and 10 runners are left."

## Step 11 -- bring the whole club back

    real.mjs --step <session> --click-at 274,247

12.png: whole drawing back; step reads "weight is at least 5 -- off"; Values: Nodes 20, Edges 41. Dev: "Everyone's back again. Done."

## End (second)

    real.mjs --end <session>

Session ended.

## In character: how it went

**Did I finish?** Yes, both parts.
- 4 or more runs: 19 of the 20 people are still in the drawing (12 of 41 pairs). Then I turned the filter off and all 20 were back.
- 5 or more runs: 10 of the 20 people (5 of 41 pairs). Turned it off again; all 20 back.

**Ease: 7 of 7.** The Filters button on the bottom bar was the first thing I tried and it was right. The form read like a sentence: keep an attribute's value, weight, at least, 4. The line under it ("Keeps edges that pass and the nodes at their ends") told me people with no strong pair would disappear, which is what I wanted. After adding it, the count showed up in three places (top bar, the filter step itself, and the Values panel), so I did not have to count dots. Unticking the step brought everyone back and kept my step, and clicking the step let me change 4 to 5 with "Save and turn on", which said exactly what would happen.

**What confused me, a little:**
- Two dots at the bottom (and two at the bottom left) sit on top of each other, so when I tried to count the people myself I had to look twice and nearly got 11 instead of 10. The number on screen saved me.
- After I typed 5 the panel title still said "weight is at least 4" until I pressed Save. Not a problem, but for a second I wondered if it took my 5.
- The filter has no live preview: the drawing did not change until I pressed Add step. Fine, just noticed it.
- I would not know which one person dropped out at 4+ without hunting; the task did not need it, but for a flyer I might want to know who.
