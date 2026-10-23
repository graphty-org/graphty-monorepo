# Session r4-s19 transcript (Tom, returning user)

Session folder (screenshots, logs): tmp/studio-sessions/tier2/rounds/round-4/sessions/r4-s19/
Build: tier2-r4d1-5277e2cbe (commit 5277e2cbe, graphty@0.8.64)

Task: find the chain from Chloe to Milo with the fewest people in between, in order, and how many introductions it takes.

## Steps

### 01 -- start
Command: `REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r4d1-5277e2cbe/ node design/ui/studio/tool/real.mjs --start tmp/studio-sessions/tier2/rounds/round-4/sessions/r4-s19 setup:friends-ranked.txt`
Saw: the friends map is open, brown balls of different sizes, a PageRank legend at top left. No names on any of the dots. Right panel shows PageRank style. Toolbar at the bottom: a flask button first -- that is the analysis button my colleague showed me.
Next: click the flask button to find something that gives me a chain between two people.

### 02 -- open the analysis list
Command: `... --step <session> --click-at 615,864` (the flask, named "Analyze")
Saw: a long list of analyses with a "Filter analyses" box. Degree, Betweenness, Closeness, PageRank, Katz, HITS... Names I do not know. "Betweenness" talks about "shortest paths", but it ranks nodes, it does not give me a chain between two people.
Next: type "shortest" in the filter box rather than scroll through algorithm names.

### 03 -- filter for "shortest"
Command: `... --step <session> --click "Filter analyses" --type "shortest"`
Saw: "Shortest path -- Start here -- The fewest steps, or the shortest path by weight, between two nodes." That is exactly what I want: fewest steps between two people.
Next: click "Shortest path".

### 04 -- the Shortest path form
Command: `... --step <session> --click "Shortest path"`
Saw: From ("Where the path starts"), To ("Where the path ends"), Follow Out/All (All is picked), Weight "None -- Each edge counts as 1". Each link counting as one is what I want: fewest people. I leave Follow and Weight alone; I do not change settings I do not understand. "Advanced" I will not touch.
Next: type Chloe in From.

### 05 -- type Chloe
Command: `... --step <session> --click "Where the path starts" --type "Chloe"`
Saw: a suggestion "Chloe" drops down under the box. Good, she is in the list.
Next: pick the Chloe suggestion.

### 06 -- pick Chloe
Command: `... --step <session> --click-at 490,609` (option "Chloe")
Saw: From now says Chloe; the To box is highlighted, ready for me.
Next: type Milo in To.

### 07 -- type Milo
Command: `... --step <session> --type "Milo"`
Saw: the suggestion "Milo" drops down.
Next: pick Milo.

### 08 -- pick Milo
Command: `... --step <session> --click-at 486,663` (option "Milo")
Saw: From Chloe, To Milo, Follow All, Weight None. "Find path" button is highlighted.
Next: click "Find path".

### 09 -- Find path
Command: `... --step <session> --click "Find path"`
Saw: the chain is drawn in black on the picture, and the right panel lists "Nodes in order": Chloe 1, Ava 2, Ivan 3, Kofi 4, Milo 5. Summary: "Path 5 nodes, 4 edges". The left list has a new row "Shortest path 4 hops" above my PageRank row, which is still there with its 20. Nothing of mine was removed. "Made with" repeats what I asked: From Chloe, To Milo, Follow All, Weight None.
That answers it. Next: end the session.

### end attempt 1
Command: `... --end <session>`
Answer: a further request -- "Ben now wants to be introduced to Nora the same way. Who is in that chain, in order, and how many introductions does it take?"
Next: same way as before -- the flask button, then Shortest path.

### 10 -- open the analysis list again
Command: `... --step <session> --click "Analyze"`
Saw: the list again; "Shortest path" is now first under "Recent". Handy.
Next: click it (by position, the Recent one).

### 11 -- Shortest path form again
Command: `... --step <session> --click-at 500,454` (the Recent "Shortest path")
Saw: a fresh empty form, From has focus, Follow All and Weight None as before. Will this replace the Chloe one? It does not say. I'll see.
Next: type Ben.

### 12 -- type Ben
Command: `... --step <session> --type "Ben"`
Saw: suggestion "Ben".
Next: pick Ben, then type Nora (To gets focus after picking, as before).

### 13 -- pick Ben, type Nora
Command: `... --step <session> --click-at 484,609 --type "Nora"`
Saw: From Ben, To shows "Nora" with the suggestion "Nora".
Next: pick Nora and click "Find path".

### 14 -- pick Nora, Find path
Command: `... --step <session> --click-at 486,663 --click "Find path"`
Saw: a new chain in black, top-left of the picture. "Nodes in order": Ben 1, Theo 2, Ravi 3, Pia 4, Nora 5. Summary "5 nodes, 4 edges"; left row still "Shortest path 4 hops"; "Made with" now says From Ben, To Nora, run 3:14:21.
The Chloe-to-Milo chain is gone from the picture and the panel: there is still only one "Shortest path" row, and it now holds Ben to Nora. Nothing told me the first one would be replaced. I had already written the Chloe answer down, so no harm today, but if I had wanted both on the slide I would not know how.
Next: end.

### end
Command: `... --end <session>`
Answer: session ended.

## In my own words (Tom)

**Did I finish?** Yes, both.
- Chloe to Milo: Chloe -> Ava -> Ivan -> Kofi -> Milo. Three people in between, four introductions (Chloe-Ava, Ava-Ivan, Ivan-Kofi, Kofi-Milo).
- Ben to Nora: Ben -> Theo -> Ravi -> Pia -> Nora. Three people in between, four introductions.

**Ease: 6 out of 7.**

**What went well.** The flask button was where my colleague showed me. Typing "shortest" in the filter found "Shortest path -- The fewest steps ... between two nodes", which is the plain-English question I had. The name boxes suggested the names as I typed, so I did not have to find anyone on the picture (the dots have no names on them, which would have stopped me). The answer came as a numbered list of names, in order, and a count. That is what I would read out. The PageRank ranking I saved earlier was still there afterwards.

**What confused me.**
- The dots have no names, so the black line on the picture told me nothing by itself; only the list on the right did.
- "Follow: Out / All" -- I left it on All because I did not know what Out would do. Nothing explained it.
- The summary says "5 nodes, 4 edges" and the row says "4 hops". I had to work out myself that "4 edges" means four introductions. The words "nodes", "edges" and "hops" are not how I would say it.
- Running it the second time quietly replaced the Chloe answer. Nothing warned me it would. I had written it down already, but I would have liked to keep both.
