# Session r5-s22b -- Dev, returning

Task: the Strozzi want a message carried to the Pazzi, passed only between families joined by marriage, through as few families as possible. Which families does it pass through, in order?

Session folder: tmp/studio-sessions/tier2/rounds/round-5/sessions/r5-s22b (started for me by setup florentine-ranked.txt).

## Step 1 -- 01.png (arrived)

Okay, the Florentine families network is open, colored and sized by PageRank like my first assignment. No names on the dots though. I need a route from Strozzi to Pazzi. I never asked it for a route before. The toolbar at the bottom has a flask icon -- that's where I ran the ranking last time, I think. I'll hover it first to check.

Command: `REAL_DIST=.../tier2-r5-8c015b806/ node design/ui/studio/tool/real.mjs --step <folder> --hover-at 615,864`
Result: button "Analyze", tooltip "Analyze Shift+A". (02.png)

## Step 2

"Analyze" -- yes, that's the ranking button. Maybe it has a route thing too. Clicking it.

Command: `--step <folder> --click "Analyze"`
Result (03.png): a list of analyses opened with a "Filter analyses" box: Recent PageRank, then "Rank nodes and edges" -- Degree, Betweenness, Closeness... All rankings so far. I want a route, so I'll type "path" in the filter -- in class they'd say "shortest path".

## Step 3

Command: `--step <folder> --type "path"`
Result (04.png): "Find paths and edge sets" -- "Shortest path  Start here: The fewest steps, or the shortest path by weight, between two nodes." Also "Guided route -- Select 2 nodes first" (grayed). Oh nice, that's exactly it. "Fewest steps" is what the task says.

## Step 4

Clicking "Shortest path".

Command: `--step <folder> --click "Shortest path"`
Result (05.png): a "Shortest path" form: From "Where the path starts", To "Where the path ends", Weight "None", Advanced, and a "Find path" button. The From box looks focused already. Weight None is right -- marriages, no numbers, fewest families.

## Step 5

Typing Strozzi in From.

Command: `--step <folder> --type "Strozzi"`
Result (06.png): a suggestion "Strozzi" dropped down under the box, highlighted.

## Step 6

Picking it from the list.

Command: `--step <folder> --click "role=option:Strozzi"`
Result (07.png): From says Strozzi, and focus jumped to To. Nice.

## Step 7

Typing Pazzi.

Command: `--step <folder> --type "Pazzi"`
Result (08.png): "Pazzi" suggestion shown.

## Step 8

Pick Pazzi, then I'll press Find path.

Command: `--step <folder> --click "role=option:Pazzi"`
Result (09.png): From Strozzi, To Pazzi, Weight None. Focus is on "Find path".

## Step 9

Command: `--step <folder> --click "Find path"`
Result (10.png): the route is drawn in black on the map, and the right panel "Shortest path" Values tab says: Summary -- Path 5 nodes, 4 edges. "Nodes in order": Strozzi 1, Ridolfi 2, Medici 3, Salviati 4, Pazzi 5. "Made with": Analysis Shortest path, From Strozzi, To Pazzi, Weight None, "Each edge counts as 1." The left list has a new "Shortest path 4 hops" row above PageRank.

Oh nice, that's it. And it says what it used -- Weight None, each edge counts as 1 -- which is what "as few families as possible" means. That's my proof for the instructor. The map has no names on it, so I can't eyeball which black dot is which, but the list in order is clear.

Essay sentence: "A message from the Strozzi to the Pazzi passes through the Ridolfi, the Medici and the Salviati (Strozzi -> Ridolfi -> Medici -> Salviati -> Pazzi), four marriage links."

## Step 10 -- end, first request

Command: `--end <folder>`
Result: the session stayed open with a next request: "The Peruzzi now want a message carried to the Ginori the same way. Which families does it pass through, in order?"

## Step 11

Same thing again, Peruzzi to Ginori. I'll open Analyze and look for Shortest path; maybe it's under Recent now.

Command: `--step <folder> --click "Analyze"`
Result (11.png): the list opens with "Recent: Shortest path" at the top now. Handy.

## Step 12

Command: `--step <folder> --click "Shortest path"`
Result: tool said the name was ambiguous (the left list row, the panel heading, and two list options); nothing happened. (A person would just click the item under Recent.) I click the Recent one by position on the screenshot.

## Step 13

Command: `--step <folder> --click-at 500,448`
Result (13.png): same blank form, From focused, Weight None.

## Step 14

Command: `--step <folder> --type "Peruzzi"`
Command was: `--step <folder> --type "Peruzzi" --click "role=option:Peruzzi"`
Result (14.png): From = Peruzzi, focus in To.

## Step 15

Ginori in To, pick it, then Find path.

Command: `--step <folder> --type "Ginori" --click "role=option:Ginori" --click "Find path"`
Result (15.png): a new black route on the map. Values: Path 5 nodes, 4 edges. Nodes in order: Peruzzi 1, Bischeri 2, Guadagni 3, Albizzi 4, Ginori 5. Made with: From Peruzzi, To Ginori, Weight None, "Each edge counts as 1", ran 10:19:48.

Wait -- the left list still has just one "Shortest path 4 hops" row, and the Strozzi-to-Pazzi route is gone from the map and the panel. So the new run replaced the old one rather than adding a second. I already wrote the first answer down, so it's fine for me, but if I wanted both routes in my figure I'd have been confused. Both happen to be 4 hops so the row label didn't change either, which made it hard to tell at a glance that anything new happened -- only the time and the From/To changed.

Essay sentence: "A message from the Peruzzi to the Ginori passes through the Bischeri, the Guadagni and the Albizzi (Peruzzi -> Bischeri -> Guadagni -> Albizzi -> Ginori), four marriage links."

## Step 16 -- end

Command: `--end <folder>`
Result: session ended.

## Wrap-up (in character)

**Did I finish?** Yes, both.
- Strozzi to Pazzi: Strozzi -> Ridolfi -> Medici -> Salviati -> Pazzi (4 marriage links).
- Peruzzi to Ginori: Peruzzi -> Bischeri -> Guadagni -> Albizzi -> Ginori (4 marriage links).

**Ease: 6 out of 7.** I'd never done a route before and it took me about a minute. Typing "path" in the Analyze filter found "Shortest path -- The fewest steps..." right away, the From and To boxes suggested the family names as I typed, and the result panel gave me the families in order plus "Made with: Weight None -- Each edge counts as 1", which is exactly the proof I need that it counted families and didn't use some number.

**What confused me:**
- Running it a second time replaced the first route instead of keeping both. The left row still just said "Shortest path 4 hops", so nothing in the list told me it was a new answer; only the From/To and the time in the panel changed. If I wanted both routes in my figure, I wouldn't know how.
- The map has no names on the dots, so I could see the black route but not which family is which without looking at the panel list. For the essay figure I'd have to turn labels on.
- The Analyze list opens on rankings; I only found the route by guessing the word "path". If I'd typed "route" first I'm not sure it would have shown up (I saw "Guided route" grayed out, which said "Select 2 nodes first" -- I didn't try it).
