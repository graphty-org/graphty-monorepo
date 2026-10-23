# Session r5-s34b -- Tom, the lab manager, with the hiking club's trails.csv

Task: bring trails.csv in so every calculation treats more kilometers as a longer walk, find the shortest walk from the Trailhead to the Summit (junctions in order, total km), and show where the program says it used the kilometers.

Commands run from the studio worktree, with REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r5-8c015b806/ and S=tmp/studio-sessions/tier2/rounds/round-5/sessions/r5-s34b.

## 01 (start, already open)
The start screen. Open project or file at the top, "Files are read on this computer and never uploaded" under it, "Local only" in the top right. A usage-data box at the bottom. Not my lab's data today, but good to see. I'll say No thanks to the usage box first.

## 02
`--click "No thanks"` -- the box is gone. Now Open project or file..., the same way I always open what people send me, and pick trails.csv from Downloads.

## 03
`--click "Open project or file" --upload trails.csv` -- "Open as a new graph". It says trails: 9 nodes, 13 edges, and 13 edge rows read; the table shows lines 2 to 14, that is 13 trails, matches the file. But there is a line "Weight: none (each edge counts 1)". That is exactly what I do not want: the club wants the kilometers to count. The km column has a box under it saying "Attribute". I'll open that box and see what else it can be.

## 04
`--click "km"` -- nothing happened (two things called km: the column header and the box under it). I meant the box with "Attribute" in it.

## 05
`--click "Role of km"` -- a list: From, To, Weight, Date or time, Edge id, Attribute. "Weight" goes with the line above that said "Weight: none". I'll pick Weight.

## 06
`--click "role=option:Weight"` -- now it says "Weight: km" and asks "Higher means": Not set, Closer, Farther, Capacity. The sentence under it says until I choose, a path counts every edge as one step. More kilometers is a longer walk, so "Farther". That one I can answer.

## 07
`--click "Farther"` -- "Weight: km (farther)" and the sentence: "a higher weight means farther apart, such as a longer distance or travel time; a path takes the smallest total." That is plain English, good. There is a Direction box at the bottom ("As the file says"); I do not know what else it would be and I don't change what I don't understand. Load.

## 08
`--click "Load"` -- a picture of blue balls with arrows, no names on them, so I can't tell which is the Trailhead. On the right: Nodes 9, Edges 13, "Loaded weight: km (farther)". That is one place it says it has the kilometers. It also says "Direction: Directed" -- arrows, as if trails are one-way. I didn't choose that; I'll leave it. Bottom left says "Analyze in the toolbar (Shift+A) to add results here". The flask button in the toolbar, then.

## 09
`--click-at 615,864` (Analyze) -- a long list: Degree, Betweenness, Closeness, PageRank "Start here", Katz, HITS... I don't know these and I'm not learning them today. There's a "Filter analyses" box with the cursor in it. I want the shortest walk, so I'll type "shortest".

## 10
`--type "shortest"` -- "Shortest path -- Start here. The fewest steps, or the shortest path by weight, between two nodes." That's my one. Click it.

## 11
`--click-at 501,668` (Shortest path) -- a small form: From, To, Follow (Out / All -- All is picked), Weight already says "km (farther, loaded)". Good, I don't have to pick it again. The From box has the cursor; type Trailhead.

## 12
`--type "Trailhead"` -- a suggestion "Trailhead" drops down under the box. Click it.

## 13
`--click-at 498,627` -- From says Trailhead, and the cursor moved to To on its own. Type Summit.

## 14
`--type "Summit"` -- "Summit" suggested. Click it.

## 15
`--click-at 494,681` -- From Trailhead, To Summit, Weight km. Press the blue Find path.

## 16
`--click "Find path"` -- the path is drawn in black on the picture (still no names on the balls, so the picture alone tells me nothing). The right side is what I read: Summary -- Path 5 nodes, 4 edges; Total km 7.5. "Nodes in order": Trailhead 1, Creek 2, Meadow 3, Ridge 4, Summit 5. Under "Made with": Analysis Shortest path, From Trailhead, To Summit, Follow All, Weight km (farther). The list on the left also says "Shortest path km 7.5".
I checked it against the table I saw before loading: Trailhead-Creek 1.5, Creek-Meadow 2, Meadow-Ridge 2.5, Ridge-Summit 1.5 = 7.5. Adds up. The other way through Pine Fork would be 3 + 1 + 2.5 + 1.5 = 8, longer. So it did use the kilometers, not just the number of steps. I have my answer.

`--end` -- session ended.

## At the end, in Tom's words

**Did I finish?** Yes. Shortest walk from the Trailhead to the Summit: Trailhead, Creek, Meadow, Ridge, Summit -- 7.5 km in all. Where it says it used the kilometers: before loading, "Weight: km (farther)" with "a path takes the smallest total"; after loading, "Loaded weight: km (farther)" in the overview; in the path form, "Weight: km (farther, loaded)"; and on the result, "Total km 7.5" and "Made with ... Weight km (farther)".

**Ease: 6 of 7.**

**What confused me or slowed me down:**
- When the file opened, the first thing it told me was "Weight: none (each edge counts 1)". Had I just pressed Load like I usually do, every walk would have counted one step per trail and I would not have known. I only found the fix because the km box said "Attribute" and I opened it to see what else it could be.
- The km column header and the box under it are both called "km"; my first click on it did nothing.
- "Closer", "Farther", "Capacity" -- Farther was obvious for kilometers, and the sentence under it was clear once I picked it. Capacity I'd have to ask about.
- After loading, it says "Direction: Directed" and draws arrows, as if trails are one-way. I never chose that; the bottom of the load screen said "As the file says" and I left it. The path form had "Follow: All" already picked, so it came out fine, but I'd ask the club whether that matters.
- The picture has no names on the balls. I could not tell the Trailhead from the Summit on the canvas; the black path means nothing to me without the list on the right. The list ("Nodes in order") is what I'd copy into the email.
- The Analyze list is long and full of names I don't know (Katz, HITS, Eigenvector). Typing "shortest" in the filter box found it straight away.
