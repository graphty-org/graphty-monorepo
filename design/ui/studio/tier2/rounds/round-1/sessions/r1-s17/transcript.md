# Session r1-s17 -- Ruth (returning), task T18 prompt A (running club, friends.csv)

Build: 946256efb876 (frozen copy `.study-builds/tier2-r1d4-946256efb/`). Commands run from
`design/ui/studio/tier2`, with `S=rounds/round-1/sessions/r1-s17` and
`REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r1d4-946256efb/`.

Prompt: "You have used this program a few times. Your running club's list, friends.csv, is already
open. Chloe wants to be introduced to Milo through people who already run together. Work out the
chain from Chloe to Milo with the fewest people in between: who is in it, in order, and how many
introductions it takes."

## Steps

### 01 -- start

`node ../tool/real.mjs --start $S setup:friends-ranked.txt` -> 01.png

Ruth: The running club is open: twenty brown balls with arrows, no names on any of them. On the
left there's the find box I know, and a PageRank layer from a ranking someone already ran. Legend
says size and color are PageRank. I need Chloe. Same as always: I type her name into the find box.

### 02 -- type Chloe in the find box

`node ../tool/real.mjs --step $S --click "Find nodes, edges, values" --type "Chloe"` -> 02.png

Ruth: One node, Chloe, and four ties in names: Ava -> Chloe, Ben -> Chloe, Chloe -> Dev,
Chloe -> Farah. Good, names. Milo is not one of them, so it's at least two introductions. I'll
open Chloe to see her list of connections on the right, the way I did before.

### 03 -- open Chloe

`node ../tool/real.mjs --step $S --click "Chloe"` -> 03.png (tool: "Chloe" matched 5 options; took the first, the node)

Ruth: Chloe is lit up yellow at the bottom of the drawing. Right side: id Chloe, Degree 4, PageRank
0.0555, #4 of 20. Four ties, matches the find list. Now the real question -- the chain to Milo.
Last time the toolbar's analysis button had a list of things the program can work out. Maybe
there's one for how two people are linked. Hovering the first toolbar button to be sure it's that one.

### 04 -- hover the flask

`node ../tool/real.mjs --step $S --hover-at 680,864` -> 04.png (tooltip "Analyze Shift+A")

Ruth: "Analyze." That's the one. Opening it.

### 05 -- open Analyze

`node ../tool/real.mjs --step $S --click "Analyze"` -> 05.png

Ruth: A long list, all "Rank nodes and edges": Degree, Betweenness ("sit on the most shortest paths
between others" -- that's the middle-man one from my class, not my question), Closeness,
PageRank, Eigenvector, Katz, HITS, All-pairs distance ("how far each node is from all the others").
None of these is "how is Chloe linked to Milo". There's a "Filter analyses" box at the top, so I'll
ask it in my own word: "link".

### 06 -- filter "link"

`node ../tool/real.mjs --step $S --type "link"` -> 06.png

Ruth: Degree, Louvain, Leiden, and "Link prediction -- which missing edges the shared neighbors
suggest." No, I don't want missing ties guessed, I want the real ones. But there's a heading I
hadn't seen: "Find paths and edge sets". That's my question in their words. I'll clear the filter
and scroll down to that section to see everything under it.

### 07 -- clear the filter, scroll down

`node ../tool/real.mjs --step $S --click-at 849,592 --wheel 680,700,1500` -> 07.png

Ruth: "Find paths and edge sets": Shortest path (marked "Start here") -- "The fewest steps, or the
shortest route by weight, between two nodes." "The fewest steps ... between two" is my question
nearly word for word. Guided route and Weakest cut are grayed and say "Select 2 nodes first";
Shortest path isn't grayed, so presumably it will ask me for the two people. Picking Shortest path.

### 08 -- Shortest path form

`node ../tool/real.mjs --step $S --click "Shortest path"` -> 08.png

Ruth: A small form. "From" already says Chloe -- it took her from what I had selected, good.
"To: Where the path ends" is empty. "Follow: Out / All", All looks chosen; I don't care who
listed whom in the sheet, running together goes both ways, so All is right. "Weight: Not read --
weight's meaning is not set, and a path needs a distance. None." Fine: I want the fewest people,
not any weighting, so None suits me. Typing Milo into To.

### 09 -- type Milo

`node ../tool/real.mjs --step $S --click "Where the path ends" --type "Milo"` -> 09.png

Ruth: A suggestion "Milo" drops down under the box, covering the Follow row. Picking it.

### 10 -- pick Milo

`node ../tool/real.mjs --step $S --click-at 550,663` -> 10.png

Ruth: From Chloe, To Milo, Follow All, Weight None. Find path has focus. Pressing it.

### 11 -- Find path

`node ../tool/real.mjs --step $S --click "Find path"` -> 11.png

Ruth: There it is, in names. "Path: 5 nodes, 4 edges." "Nodes in order: Chloe 1, Ava 2, Ivan 3,
Kofi 4, Milo 5." Left list has a new "Shortest path -- 4 hops" layer, and the drawing shows the
chain in black with a key "On the path". "Made with" repeats From Chloe, To Milo, Follow All,
Weight None and the time. That is the kind of record I can show an editor.
Chloe -> Ava I already saw in Chloe's ties (Ava -> Chloe). Now I check one link I haven't seen:
Ava to Ivan. I'll look Ivan up in the find box.

### 12 -- find Ivan

`node ../tool/real.mjs --step $S --click "Find nodes, edges, values" --type "Ivan"` -> 12.png

Ruth: Ivan has five ties: Gus -> Ivan, Hana -> Ivan, Ivan -> Jada, Ivan -> Kofi, Ivan -> Ava.
So Ava-Ivan holds, and Ivan-Kofi holds too. The arrows run Ivan -> Ava -> Chloe, against the way
the chain is read, but I asked it to follow All, and running together goes both ways. Link checked.
Last thing: Milo's own ties, so I can see Kofi is really one of them.

### 13 -- find Milo

`node ../tool/real.mjs --step $S --click "Clear search" --click "Find nodes, edges, values" --type "Milo"` -> 13.png

Ruth: Milo's ties: Kofi -> Milo, Lena -> Milo, Milo -> Nora, Milo -> Omar. Kofi-Milo holds.
Every link I checked is in the data. My answer: Chloe -> Ava -> Ivan -> Kofi -> Milo. Three
people in between (Ava, Ivan, Kofi), four introductions. Done with the first part.

Follow-up (as given in the task, word for word): "Ben now wants to be introduced to Nora the same
way. Who is in that chain, in order, and how many introductions does it take?"

Ruth: Same thing again. Back to Analyze; Shortest path should be under Recent now.

### 14 -- reopen Analyze

`node ../tool/real.mjs --step $S --key Escape --click "Analyze"` -> 14.png

Ruth: Shortest path is at the top under Recent. Clicking it.

### 15 -- Shortest path form again

`node ../tool/real.mjs --step $S --click-at 565,448` -> 15.png

Ruth: Same form. From still says Chloe (she's still selected), To is empty again. I'll clear
From with its little x and type Ben.

### 16 -- From: Ben

`node ../tool/real.mjs --step $S --click-at 824,578 --click-at 660,578 --type "Ben"` -> 16.png

Ruth: "Ben" offered. Picking it, then Nora in To.

### 17 -- pick Ben, type Nora

`node ../tool/real.mjs --step $S --click-at 549,609 --click "Where the path ends" --type "Nora"` -> 17.png

Ruth: From Ben, To "Nora" with Nora offered. Pick it, then Find path. Follow still All, Weight None.

### 18 -- pick Nora, Find path

`node ../tool/real.mjs --step $S --click-at 551,663 --click "Find path"` -> 18.png

Ruth: "Path: 5 nodes, 4 edges. Nodes in order: Ben 1, Theo 2, Ravi 3, Pia 4, Nora 5." Made with:
From Ben, To Nora, All, None, ran 11:26:58. The black chain now runs round the left side of the
drawing. Note: the Chloe-Milo chain is gone -- the same "Shortest path 4 hops" layer now holds
Ben-Nora instead of adding a second one. I wrote the first one down, so no harm today, but if I
wanted both on the map for the editor I'd have lost one. Checking a middle link: Ravi.

### 19 -- find Ravi

`node ../tool/real.mjs --step $S --click "Find nodes, edges, values" --type "Ravi"` -> 19.png

Ruth: Ravi's ties: Pia -> Ravi, Quinn -> Ravi, Ravi -> Sana, Ravi -> Theo. Theo-Ravi and Ravi-Pia
both hold. Answer: Ben -> Theo -> Ravi -> Pia -> Nora, three people in between, four
introductions. I'm done.

### 20 -- end

`node ../tool/real.mjs --end $S`

## At the end (Ruth, in her own words)

**Did I finish?** Yes, both parts.

- Chloe to Milo: Chloe -> Ava -> Ivan -> Kofi -> Milo. Three people in between, four
  introductions. Checked: Ava-Chloe (Chloe's ties), Ava-Ivan and Ivan-Kofi (Ivan's ties),
  Kofi-Milo (Milo's ties).
- Ben to Nora: Ben -> Theo -> Ravi -> Pia -> Nora. Three in between, four introductions. Checked:
  Theo-Ravi and Ravi-Pia (Ravi's ties).

What I can't confirm: that there isn't a second chain just as short. The screen gave me one chain
and never said whether it was the only one of that length. For a story, "one of the shortest" and
"the shortest" are different sentences.

**Ease: 6 of 7.** About ten steps the first time, five the second.

**What confused me or slowed me down:**

1. Finding it. The Analyze list opens on a long run of rankings, and the thing I wanted sits far
   down under "Find paths and edge sets". I typed my own word, "link", into the filter and got
   "Link prediction", which guesses at ties that aren't there -- the opposite of what I want. It was
   only the heading in that filtered list that told me where to scroll. "Chain", "connected" or
   "introduce" would be my words; I don't know whether they would have found it.
2. "Shortest path" is the program's word, not mine, but its line underneath -- "the fewest steps
   ... between two nodes" -- is what sold me. I read that line, not the title.
3. The Weight line, "Not read -- weight's meaning is not set, and a path needs a distance," is a
   sentence I had to read twice. I left it at None because I wanted people, not weights, and the
   result was in people; but I couldn't tell you what "meaning is not set" asks me to do.
4. The second run replaced the first. There's still only one "Shortest path" layer and the
   Chloe-Milo chain is gone from the map and the panel. I had written it down, but I'd expected to
   keep both.
5. The arrows on the drawing point the "wrong" way along the chain (Ivan -> Ava -> Chloe). The
   Follow: All setting explains it if you read it, but the drawing alone would have made me doubt it.

**What worked:** "From" filled itself in with the person I had selected; the answer came as
names, in order, numbered; "Made with" recorded who, to whom, how and when, which is what I'd
show an editor; and the find box let me check every link against each person's own ties without
leaving the screen.
