# Session r3-s35 -- Jordan, marketing network analyst (returning user)

Task: friends.csv is open. Keep only pairs who ran together 4 or more times (third column), say how many people are still in the drawing, then bring the whole club back.

All commands ran from the studio worktree with
`REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r3d2-26f3bb968/ node design/ui/studio/tool/real.mjs ...`
against this session's folder (shown below as `S`). The screenshots are in this folder.

## Steps

### Start
`--start S setup:friends-ranked.txt` -> 01.png (it waited a few minutes for a free browser slot first).
The club map is open, colored and sized by my old PageRank run. I have never filtered ties before, so I'll look in the Data tab.

### Step 1
`--step S --click "Data"` -> 02.png. The Data tab lists friends.csv (20 nodes, 41 edges), a "Filters" row with a plus, and an Edges attribute "weight". The plus looks like the way in.

### Step 2
`--step S --click-at 276,197` (button "Add filter step") -> 03.png. The right panel shows "New filter step": Keep = "an attribute's value", Attribute empty, Add step grayed out.

### Step 3
`--step S --click "Attribute"` -> 04.png. The list has Nodes: id and Edges: weight. Good, it keeps node columns apart from edge columns.

### Step 4
`--step S --click "weight"`: the tool said this was ambiguous (the option in the open list and the weight row in the left tree), so nothing happened (05.png). `--click "weight#1"` was refused the same way (06.png). `--click "role=option:weight"` -> 07.png. Now there is "Is: at least" and a Value box, with the hint "Keeps edges that pass and the nodes at their ends." That is exactly what the flyer needs. (The two misses were the harness asking which "weight" I meant; a person would just click the item in the open list.)

### Step 5
`--step S --click "Value" --type "4" --click "Add step"` -> 08.png. The drawing dropped to a few short chains. The top bar says "19 of 20 nodes"; the Filters list shows "weight is at least 4, 20 to 19 nodes" with a checkbox; Values says Nodes showing 19 of 20, Edges showing 12 of 41. The legend now says "PageRank, full graph", so I know the sizes still come from the whole club.
Answer: 19 people are still in the drawing (12 of the 41 pairs ran together 4 or more times). I'm a little surprised only one person drops out, but three places on screen agree, so I trust it.

### Step 6
`--step S --click-at 273,238` (checkbox "Apply step: weight is at least 4") -> 09.png. Back to 20 nodes and 41 edges, the full ring; the top-bar count went away; the step stays in the list marked "off", so I can turn it on again for the flyer. That's how I'd want it.

### End (first try)
`--end S` answered with a follow-up: "Your club now asks the same for pairs who ran together 5 or more times. How many people are in the drawing then? Bring the whole club back when you are done." I carried on in the same session.

### Step 7
I'd rather change my existing step than add a second one, so I clicked its row.
`--step S --click-at 163,231` (treeitem "weight is at least 4") -> 10.png. The right panel opened the same form, filled in (weight, at least, 4), with a blue "Save and turn on" button. Easy to change.

### Step 8
`--step S --click "Value" --key Control+a --type "5" --click "Save and turn on"` -> 11.png. The step now reads "weight is at least 5, 20 to 10 nodes"; the top bar says "10 of 20 nodes"; Values says Nodes showing 10 of 20, Edges showing 5 of 41. I can count 10 people by eye in the small pairs and clusters on the canvas.
Answer: 10 people are in the drawing at 5 or more runs together.

### Step 9
`--step S --click-at 273,238` (checkbox "Apply step: weight is at least 5") -> 12.png. The full club is back: 20 nodes, 41 edges, step marked "off".

### End
`--end S` -> session ended.

## In my own words (Jordan)

- **Did I finish?** Yes. At 4 or more runs together: 19 people (12 pairs). At 5 or more: 10 people (5 pairs). Both times I brought the whole club back (20 people, 41 pairs) by unticking the filter.
- **Ease: 6 of 7.** I'd never filtered in this program, but "Data", then the plus by "Filters", then weight / at least / 4 read like a sentence, and the hint "keeps edges that pass and the nodes at their ends" told me exactly what would happen to the people. Editing the step for 5 and "Save and turn on" was quicker still.
- **What confused me or slowed me down:**
  - I had to guess that filtering lives under Data and not in the Graph tab or the toolbar; I found it on my first try, but only because "Filters" was the only word that fit.
  - At 4 or more, only one person dropped out even though 29 of 41 ties went, which made me double-check. The count in the top bar, in the filter row ("20 to 19 nodes") and in Values all agreed, so I believed it. I would still have liked to know which person dropped out, without hunting.
  - The node sizes did not change when I filtered; the legend's "full graph" wording explained why, but for a flyer I might want PageRank on just the filtered club, and I didn't see an obvious way to get that.
  - Turning the filter off keeps it as an "off" step. That's handy, but someone who wanted it gone would need to look for a remove option; I didn't need one.
