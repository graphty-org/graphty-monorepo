# Session r1-s42 -- Explorer Elena (first-time user)

Task: open the ready-made college football network, have the program find its own clusters (not the conferences), color Nebraska's cluster bright red leaving the others alone, and say how many teams are in it.

All commands use REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier3-r1d2-758b8e8081 and real.mjs with this session folder (abbreviated $S below).

## Step 1 -- start
Command: `REAL_TIER=3 node real.mjs --start $S empty` -> 01.png
Notes: A landing page. Big green "Open a file", plus "Open network data" and "Samples". A pretty colored ball of dots on the right. "Ready-made" sounds like Samples. I will click Samples.

## Step 2 -- Samples
Command: `--step $S --click "Samples#2"` -> 02.png (refused as ambiguous, nothing happened)
Command: `--step $S --click "role=button:Samples"` -> 03.png
Notes: A sample library. Third card: "Conferences fall out of who played whom -- College football, 115 nodes". That's my football one. Clicking it.

## Step 3 -- open College football
Command: `--step $S --click-at 712,410` (button "Open the College football sample") -> 04.png
Notes: OK it loaded. All blue dots, kind of a box-shaped hairball. On the front page there was a "Communities" button that colored groups -- I don't see it here. Little icons at the bottom. The flask one maybe means "experiment / analyze"? Hovering to see.

## Step 4 -- hover flask
Command: `--step $S --hover-at 615,864` -> 05.png. Tooltip "Analyze Shift+A".
Notes: "Analyze" -- that sounds right for figuring out groups. Clicking it.

## Step 5 -- Analyze menu
Command: `--step $S --click "Analyze"` -> 06.png
Notes: Whoa, long list: Degree, Betweenness, Closeness, PageRank, Katz... I don't know any of these. There's a "Filter analyses" box at the top and it seems to have focus. Typing "cluster".

## Step 6 -- filter "cluster"
Command: `--step $S --type "cluster"` -> 07.png
Notes: There's a heading "Find groups" -- that's what I want. Louvain, Leiden, Label propagation... no idea which. Louvain is first, "Which nodes form densely linked groups". Teams that play each other a lot = densely linked, I guess. Clicking Louvain.

## Step 7 -- Louvain options
Command: `--step $S --click "Louvain"` -> 08.png
Notes: Settings: "Resolution 1", "Weight None". I won't touch those. "Under a second" and a green Run button. Clicking Run.

## Step 8 -- Run
Command: `--step $S --click "Run"` -> 09.png
Notes: Ooh, colors! A legend popped up: "Color: Louvain", Group 1 to Group 10. And a "Louvain" row in the left list. Still kind of a jumble -- the dots didn't move into groups. Now where is Nebraska? Typing it into the "Find nodes, edges, values" box at the top left.

## Step 9 -- search Nebraska
Command: `--step $S --click "Find nodes, edges, values" --type "Nebraska"` -> 10.png
Notes: Found it: "Nodes 1 -- Nebraska" and a list of its games (Iowa, Kansas, Colorado...). Clicking Nebraska to see which group it is in.

## Step 10 -- select Nebraska
Command: `--step $S --click-at 123,153` (option "Nebraska") -> 11.png
Notes: The picture zoomed over and there's a ring on a light blue dot near the bottom. Right side says label Nebraska, Memberships: Louvain -- Group 4. Light blue = Group 4 in the legend. Now to make it red. I'll try clicking the light blue square next to "Group 4" in the legend, like in Slides where you click the color.

## Step 11 -- click legend swatch
Command: `--step $S --click-at 338,183` (img "light blue") -> 12.png
Notes: Nothing happened. Hm, maybe the legend is just a picture. On the left there's a "Louvain" row with a little arrow -- it appeared when I ran it. Clicking "Louvain" there.

## Step 12 -- click Louvain folder
Command: `--step $S --click-at 117,216` (treeitem "Louvain, folder, 10 layers") -> 13.png
Notes: Right side switched to "Louvain Folder", "10 layers in Louvain". Color says "<<Layer>>" with little swatches -- no idea what that means. 10 layers = 10 groups maybe? Opening the tiny arrow next to Louvain to see what's inside.

## Step 13 -- expand folder
Command: `--step $S --click-at 64,216` -> 14.png
Notes: There they are: Group 1 (16), Group 2 (15) ... Group 4 has 12. Nebraska is Group 4, so 12 teams? Clicking "Group 4" to change its color.

## Step 14 -- select Group 4 layer
Command: `--step $S --click-at 160,344` (treeitem "Group 4, node layer, 12 nodes") -> 15.png
Notes: Right side: "Group 4", "Louvain: Group 4, 12 nodes", Fill Color A1CAF1 with a light blue square. Clicking the little blue square to pick a new color.

## Step 15 -- color picker
Command: `--step $S --click-at 1269,415` (button "Pick node color") -> 16.png
Notes: A color picker like in Slides. There's a red-ish swatch at the bottom, but it looks darker, kind of like Group 5's color already -- I don't want two groups the same. The A1CAF1 code box is highlighted, so I'll just type FF0000, the bright red from Slides, and press Enter.

## Step 16 -- type FF0000
Command: `--step $S --type "FF0000" --key Enter` -> 17.png
Notes: It worked. Color box says FF0000, Group 4 is red in the left list and in the legend, and the light blue dots in the lower left (around Nebraska's ringed dot) are now bright red. The other groups look the same as before. Group 4 says 12, and "Louvain: Group 4, 12 nodes". Though honestly Group 5's dark red dots look a lot like my new red ones at a glance -- in a meeting people might lump them together.

I'm done; I'm stopping here (not ending the session -- facilitator does that).

## Wrap-up (in character)

- Did I finish? Yes, I think so. The program's own groups came from "Louvain" under "Find groups" (10 groups). Nebraska is in Group 4, which I made bright red (FF0000), and the other groups kept their colors. **Nebraska's cluster has 12 teams.**
- Ease: 5 out of 7. Getting the sample open and running the grouping was quick once I found the flask button and typed "cluster" into the filter.
- What confused me:
  - The front page had a nice "Communities" button, but after opening the football sample it was gone, and I had to guess that a flask icon meant "Analyze".
  - The Analyze list is a wall of words I don't know (Betweenness, Katz, HITS). Typing "cluster" saved me; I just picked the first one under "Find groups" (Louvain) without knowing if it was the right one or what "Resolution" means.
  - After running it, the dots got colors but didn't move into groups, so the picture still looked like a jumble.
  - I clicked the colored square in the floating legend first, expecting to change the color there -- nothing happened. I had to find the "Louvain" folder on the left, open its tiny arrow, then pick "Group 4".
  - Clicking the folder itself showed "<<Layer>>" in the color box, which meant nothing to me.
  - The ready-made red swatch in the picker looked like the color Group 5 already had, so I typed a code instead. Even with bright red, Group 5's dark red is easy to confuse with it.
  - The team count was only in the small grey number next to "Group 4" on the left (and in the "12 nodes" chip) -- I'd have missed it if I hadn't opened the folder.
