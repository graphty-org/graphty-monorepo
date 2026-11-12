# Session r2-s27 -- Alex (returning analyst), dataset A: running club, friends.csv

Task: work out the chain from Chloe to Milo with the fewest people in between -- who is in it, in
order, and how many introductions it takes.

Commands are run from `design/ui/studio/tier2` with
`REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r2d4-8f0d5a6f7/`; `$S` is this
session folder.

## Step 1 -- start

`../tool/with-browser.sh node ../tool/real.mjs --start $S setup:friends-ranked.txt` -> 01.png

Alex: The club list is open, with last week's PageRank run on it -- sizes and colors. No names on
the dots, so I can't spot Chloe or Milo by eye. In NetworkX this is `nx.shortest_path`. My usual
analysis button is the flask in the bottom toolbar; I'll look in there for a shortest-path tool.

## Step 2

`node ../tool/real.mjs --step $S --hover-icon 1` -> 02.png. Tooltip: "Main menu: open, save, export, settings".

Alex: That's just the menu. Going straight for the flask button at the bottom, where I usually
run my analyses.

## Step 3

`node ../tool/real.mjs --step $S --click-at 680,864` -> 03.png (button "Analyze").

Alex: The analysis list, with a filter box already focused. Lots of ranking measures; I want a
shortest path, so I'll type "shortest" into the filter.

## Step 4

`node ../tool/real.mjs --step $S --type "shortest"` -> 04.png

Alex: "Shortest path -- The fewest steps, or the shortest path by weight, between two nodes."
Exactly what I want. "Fewest steps" is the count I need, not weighted. Clicking it.

## Step 5

`node ../tool/real.mjs --step $S --click-at 566,806` -> 05.png (option "Shortest path").

Alex: A From / To form. Follow is already on "All", which is right -- an introduction works
either way, regardless of the arrow direction in my CSV. Weight is None, each tie counts 1, which
is what "fewest people" means. I'll click the From box and type Chloe.

## Step 6

`node ../tool/real.mjs --step $S --click "Where the path starts" --type "Chloe"` -> 06.png

Alex: A suggestion "Chloe" dropped down. Picking it, then the To box with Milo.

## Step 7

`node ../tool/real.mjs --step $S --click-at 554,593 --click "Where the path ends" --type "Milo"` -> 07.png (option "Chloe")

Alex: Chloe is in From, Milo is suggested for To. Picking Milo and pressing Find path.

## Step 8

`node ../tool/real.mjs --step $S --click-at 550,647 --click "Find path"` -> 08.png (option "Milo")

Alex: Done, and it's clean. Path drawn in black on the graph, legend says "On the path", the run
shows "4 hops" in the left list, and Values lists Nodes in order: Chloe, Ava, Ivan, Kofi, Milo --
5 nodes, 4 edges. "Made with" repeats From Chloe, To Milo, Follow All, Weight None, so I can tell
a director exactly how it was computed.

**Answer:** Chloe -> Ava -> Ivan -> Kofi -> Milo. Three people in between (Ava, Ivan, Kofi);
four introductions.

Follow-up given: "Ben now wants to be introduced to Nora the same way. Who is in that chain, in
order, and how many introductions does it take?"

Alex: Same thing again. I'll open the flask; Shortest path should be under Recent now.

## Step 9

`node ../tool/real.mjs --step $S --click "Analyze"` -> 09.png

Alex: Shortest path is at the top under Recent. Clicking it, then Ben in From.

## Step 10

`node ../tool/real.mjs --step $S --click-at 566,448` -> 10.png (option "Shortest path")

Alex: Empty form again, Follow still All. Typing Ben into From.

## Step 11

`node ../tool/real.mjs --step $S --click "Where the path starts" --type "Ben"` -> 11.png

Alex: Ben suggested. Pick it, Nora in To.

## Step 12

`node ../tool/real.mjs --step $S --click-at 549,593 --click "Where the path ends" --type "Nora"` -> 12.png (option "Ben")

Alex: Ben in From, Nora suggested. Pick it and Find path.

## Step 13

`node ../tool/real.mjs --step $S --click-at 551,647 --click "Find path"` -> 13.png (option "Nora")

Alex: New chain drawn in black: Values says Ben, Theo, Ravi, Pia, Nora -- 5 nodes, 4 edges, and
Made with shows From Ben, To Nora, Follow All, Weight None.

**Follow-up answer:** Ben -> Theo -> Ravi -> Pia -> Nora. Three people in between (Theo, Ravi,
Pia); four introductions.

One thing I noticed: the left list still has a single "Shortest path, 4 hops" entry, and the
Chloe-to-Milo result is gone from it -- the new run replaced the old one rather than sitting
beside it. I had already written the first chain down, so no harm today, but if I'd wanted both
chains on one slide I'd have been stuck re-running.

## End

`node ../tool/real.mjs --end $S` (the tool printed the follow-up request word for word and asked to carry on; it had already been done in steps 9-13, so `--end` was run a second time to close the session)

## Debrief (in character)

- **Finished?** Yes, both. Chloe -> Ava -> Ivan -> Kofi -> Milo (4 introductions, 3 people in
  between); Ben -> Theo -> Ravi -> Pia -> Nora (4 introductions, 3 people in between).
- **Ease:** 6 out of 7.
- **What worked:** Typing "shortest" in the analysis filter found "Shortest path" at once, with
  a one-line description that said "fewest steps". The From/To boxes suggest names as you type,
  so I never needed to find Chloe on an unlabeled canvas. Follow defaulted to All, which matches
  how introductions work. The result names the people in order and repeats the settings it used,
  which is what I'd paste into a readout. The second time it was under Recent, two clicks away.
- **What confused or bothered me:**
  - The dots have no names on them, so the black path on the canvas alone doesn't tell me who is
    who; I relied entirely on the Values list.
  - Running the second pair replaced the first result instead of keeping both runs. I'd expect
    each run to stay in the list like my PageRank run does, so I can compare or export them.
  - "Hops" in the left list, "edges" in the summary, "introductions" in my head -- I had to do
    the small translation that 4 hops / 4 edges means 4 introductions and 3 people in between.
  - Minor: "Out / All" under Follow is terse; I knew what it meant from NetworkX, a newer user
    might not.
