# Session r1-s19 -- Dana (returning supply-chain risk analyst), task T18 A (running club, friends.csv)

Build: tier2-r1d4-946256efb (REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r1d4-946256efb/)

Task as given: "You have used this program a few times. Your running club's list, friends.csv, is already open. Chloe wants to be introduced to Milo through people who already run together. Work out the chain from Chloe to Milo with the fewest people in between: who is in it, in order, and how many introductions it takes."

## Steps

### 1. Start

Command: `node tool/real.mjs --start r1-s19 setup:friends-ranked.txt` -> 01.png
Saw: my running club file open, colored and sized by PageRank, no names on the balls. Plan: type Chloe in the search box, like I search for a supplier.

### 2. Search for Chloe

Command: `--step --click "Find nodes, edges, values" --type "Chloe"` -> 02.png
Saw: one node Chloe, and four links: Ava -> Chloe, Ben -> Chloe, Chloe -> Dev, Chloe -> Farah. So Chloe runs with Ava, Ben, Dev, Farah. Nothing on the picture lit up, though. Plan: click the Chloe result and see what it gives me -- I'm hoping for a "who is connected" view.

### 3. Click the Chloe result

Command: `--step --click "Chloe"` (tool: ambiguous, took the first, the node) -> 03.png
Saw: Chloe is lit yellow at the bottom of the picture, sitting right on top of another ball. Right panel: Degree 4, PageRank #4 of 20. Nothing about getting to Milo. Plan: the button I use to rank things in the toolbar (the flask) -- maybe there's something there for "how do I get from one to another".

### 4. Open the analysis button

Command: `--step --click-at 680,864` (button "Analyze") -> 04.png
Saw: the list I know -- PageRank, Degree, Betweenness... these are all "rank" things. Betweenness says "shortest paths between others", which is the idea, but it ranks everyone, it doesn't answer Chloe-to-Milo. The list goes on below. Plan: scroll the list to see what's further down.

### 5. Scroll the analysis list

Command: `--step --wheel 680,700,600` -> 05.png
Saw: a section "Find paths and edge sets" with "Shortest path -- Start here: The fewest steps, or the shortest route by weight, between two nodes." That's exactly "fewest people in between". Plan: click Shortest path.

### 6. Open Shortest path

Command: `--step --click-at 566,794` -> 06.png
Saw: a small form. From already says Chloe (good, it took the one I picked). To is empty. "Follow: Out / All" with All picked -- I don't really know what that means, but All sounds like "count every link", which is what I want. Weight: "Not read -- weight's meaning is not set, and a path needs a distance." I had to read that twice. I don't care about weights, I care about the number of people, so None is fine. Plan: type Milo in To.

### 7. Type Milo in To

Command: `--step --click "Where the path ends" --type "Milo"` -> 07.png
Saw: a dropdown offering "Milo". Plan: pick it from the list.

### 8. Pick Milo

Command: `--step --click-at 550,663` (option "Milo") -> 08.png
Saw: From Chloe, To Milo, Follow All, Weight None. Plan: press Find path.

### 9. Find path

Command: `--step --click "Find path"` -> 09.png
Saw: a black chain drawn on the picture, a key "On the path", and on the right "Path: 5 nodes, 4 edges" and "Nodes in order: Chloe 1, Ava 2, Ivan 3, Kofi 4, Milo 5". That's a table, I can read that. "Shortest path, 4 hops" in the left list.
Answer to the main prompt: Chloe -> Ava -> Ivan -> Kofi -> Milo. Three people in between (Ava, Ivan, Kofi), four introductions. One thing I had to work out myself: it says "4 edges" and "4 hops", never "introductions" -- I took edges as the introductions. Also Chloe is still highlighted yellow from my earlier click, so on the picture the first ball of the chain isn't black like the others; I had to trust the list for that. The arrows on the black line don't all point the same way (one points back toward Chloe), which made me pause, but I had picked "All", so I let it go.

Prompt said done. Follow-up given: "Ben now wants to be introduced to Nora the same way. Who is in that chain, in order, and how many introductions does it take?"
Plan: I'd rather not rebuild the form. Open the analysis button again and see if Shortest path remembers my settings.

### 10. Reopen the analysis button

Command: `--step --click "Analyze"` -> 10.png
Saw: "Shortest path" now at the top under Recent. Handy. Plan: click it.

### 11. Open Shortest path again

Command: `--step --click-at 566,448` -> 11.png
Saw: same form; From still says Chloe (Chloe is still my selection), To is empty again -- it forgot Milo but kept Chloe, a bit odd, but fine. Plan: clear From and type Ben.

### 12. Clear From, type Ben

Command: `--step --click-at 824,578 --click-at 660,578 --type "Ben"` -> 12.png
Saw: dropdown offers Ben. Plan: pick Ben, then type Nora in To and pick her.

### 13. Pick Ben, type Nora

Command: `--step --click-at 548,609 --click "Where the path ends" --type "Nora"` -> 13.png
Saw: From Ben, To shows the Nora option. Follow still All. Plan: pick Nora and press Find path.

### 14. Pick Nora, Find path

Command: `--step --click-at 550,663 --click "Find path"` -> 14.png
Saw: a new black chain on the left side of the picture; right panel "Path: 5 nodes, 4 edges", "Nodes in order: Ben 1, Theo 2, Ravi 3, Pia 4, Nora 5". From Ben, To Nora. The Chloe-to-Milo chain is gone -- the new one replaced it (still one "Shortest path" row on the left). I'd have liked to keep both side by side to put on a slide, but I already wrote the first one down. Chloe is still glowing yellow from my very first click even though she has nothing to do with this chain -- a bit confusing on the picture.
Answer to the follow-up: Ben -> Theo -> Ravi -> Pia -> Nora. Three people in between, four introductions.

### 15. End

Command: `node tool/real.mjs --end r1-s19`

## Debrief (in character)

- **Finished?** Yes, both. Chloe -> Ava -> Ivan -> Kofi -> Milo, four introductions. Then Ben -> Theo -> Ravi -> Pia -> Nora, four introductions.
- **Ease:** 6 out of 7.
- **What worked:** The analysis button I already use for ranking had it, under "Find paths", and the one-line description ("the fewest steps ... between two nodes") said my question in plain words. From was filled with the person I had selected. The answer came back as a numbered list in order -- a table, which is what I trust, not just a picture. The second time it was right at the top under Recent.
- **What confused me:**
    - I had to scroll past a long list of ranking and grouping things I don't use to find it. If I hadn't scrolled I'd have thought it wasn't there.
    - The Weight line, "Not read -- weight's meaning is not set, and a path needs a distance", is gibberish to me. I left it on None because I was counting people. If I'd cared about the numbers in my file I wouldn't know what to do.
    - "Follow: Out / All" -- I don't know what Out means. I kept All because it sounded like "use every link".
    - It says "4 edges" and "4 hops", never "steps" or "introductions"; I translated it myself.
    - Chloe stayed highlighted yellow the whole time, even on Ben's chain, and on the first chain she wasn't black like the rest of the chain, so on the picture the chain looked like it started one ball late.
    - Arrows on the chain point both ways; not a problem here, but for my suppliers direction matters (who ships to whom) and I'd want to know which way it went.
    - The second run replaced the first one. To compare two chains I'd have to write the first down.
- **Would I use it for work?** For "how is this site connected to that supplier" on Tier 1 data, maybe. For anything deeper, I'd ask where the Tier 2 data comes from.
