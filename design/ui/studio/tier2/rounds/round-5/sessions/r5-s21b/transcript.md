# Session r5-s21b -- Grace, returning (shortest chain Chloe to Milo)

Session folder: tmp/studio-sessions/tier2/rounds/round-5/sessions/r5-s21b
All commands: `REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r5-8c015b806/ node design/ui/studio/tool/real.mjs ...`

## 01.png (start)
Okay, friends.csv is open, PageRank colors and sizes from before. 20 dots, no names on them. I need a chain from Chloe to Milo with the fewest people. That's a "route" thing. The flask button at the bottom is where I ran the ranking last time, so I'll start there.

## Step 1: `--step <folder> --click-at 615,864` -> 02.png
The flask is "Analyze". A list opened with a filter box: rankings like Degree, Betweenness, Closeness... and "All-pairs distance". I want a route between two people. I'll type "path" in the filter box.

## Step 2: `--step <folder> --type "path"` -> 03.png
"Shortest path -- The fewest steps ... between two nodes." That's exactly my question, in plain words. "Guided route" is greyed: "Select 2 nodes first". I'll click Shortest path and see if it asks me for the two people.

## Step 3: `--step <folder> --click-at 500,630` (Shortest path) -> 04.png
A small form: From, To, Follow (Out / All -- All is picked), Weight None ("each edge counts as 1"). Fewest steps is what I want, so leave those. The From box has the cursor; I'll type Chloe.

## Step 4: `--step <folder> --type "Chloe"` -> 05.png
It found "Chloe" in a dropdown under the box. I'll pick her.

## Step 5: `--step <folder> --click-at 490,609` (option Chloe) -> 06.png
From says Chloe, and the cursor jumped to To on its own. Nice. Typing Milo.

## Step 6: `--step <folder> --type "Milo"` -> 07.png
Milo in the dropdown. Picking him.

## Step 7: `--step <folder> --click-at 486,663` (option Milo) -> 08.png
Chloe to Milo, Follow All, Weight None. Find path.

## Step 8: `--step <folder> --click "Find path"` -> 09.png
There it is. The path is drawn in black on the map, the left list has a new "Shortest path -- 4 hops" row above my PageRank (which is still there, good), and the right panel lists "Nodes in order": Chloe 1, Ava 2, Ivan 3, Kofi 4, Milo 5. Summary: "5 nodes, 4 edges". Let me count: Chloe-Ava, Ava-Ivan, Ivan-Kofi, Kofi-Milo, that's 4 links, 3 people in between. That's my answer, I'm done.

## Step 9: `--end <folder>`

--end answered with a further request: "Ben now wants to be introduced to Nora the same way. Who is in that chain, in order, and how many introductions does it take?"

## Step 10 (09.png)
Okay, same thing again with Ben and Nora. I'll go back to the flask (Analyze) where I found Shortest path.

`--step <folder> --click "Analyze"` -> 10.png
Shortest path is right at the top under Recent. Clicking it.

## Step 11: `--step <folder> --click-at 500,448` (Recent: Shortest path) -> 11.png
Same empty form, cursor in From. Typing Ben.

## Step 12: `--step <folder> --type "Ben"` -> 12.png
Ben shows up. Picking him, then I'll type Nora.

## Step 13: `--step <folder> --click-at 484,609 --type "Nora"` -> 13.png
From Ben, To shows Nora in the dropdown. Pick Nora, then Find path. Follow is still All, Weight None.

## Step 14: `--step <folder> --click-at 486,663 --click "Find path"` -> 14.png
New path drawn. Nodes in order: Ben 1, Theo 2, Ravi 3, Pia 4, Nora 5. "5 nodes, 4 edges", 4 hops. So Ben -> Theo -> Ravi -> Pia -> Nora: 4 introductions, 3 people in between. Done.
One thing I notice: there is still only one "Shortest path" row on the left, and it now says Ben to Nora. The Chloe-to-Milo chain is gone from the list -- the new one replaced it rather than sitting next to it. I wrote the first answer down, so it's fine today, but if I'd wanted both on the slide I'd have been surprised. Nothing told me it was replacing it.

## Step 15: `--end <folder>`

Session ended.

## In Grace's words, at the end

**Did I finish?** Yes, both.
- Chloe to Milo: Chloe -> Ava -> Ivan -> Kofi -> Milo. 4 introductions, 3 people in between.
- Ben to Nora: Ben -> Theo -> Ravi -> Pia -> Nora. 4 introductions, 3 people in between.

**Ease: 6 out of 7.** Typing "path" into the Analyze box found "Shortest path -- the fewest steps between two nodes", which is my question in plain words. The From and To boxes found people by name, and the right-hand panel gave me "Nodes in order" as a numbered list I could read straight off. The second time, Shortest path was waiting under Recent, so it took seconds.

**What confused me:**
- The second path replaced the first one in the left list without saying so. I expected two rows, one per chain, the way it kept my PageRank next to it.
- "4 hops" on the row and "5 nodes, 4 edges" in the summary are three ways of saying it; I had to count to be sure 4 hops meant 4 introductions. "4 introductions" or "3 people in between" is what I'd put in an email.
- The dots on the map still have no names, so the black line alone doesn't tell me who's who; I relied on the list on the right.
- "Follow: Out / All" -- I left it on All and it worked, but I wouldn't know what Out means for "people who run together".
