# Session r4-s15 -- Dev, returning

Session folder (screenshots, logs): tmp/studio-sessions/tier2/rounds/round-4/sessions/r4-s15

Task: friends.csv is open. Work out the chain from Chloe to Milo with the fewest people in between: who is in it, in order, and how many introductions it takes.

## Start

    REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r4d1-5277e2cbe/ design/ui/studio/tool/with-browser.sh node design/ui/studio/tool/real.mjs --start <session> setup:friends-ranked.txt

01.png: friends.csv open with a PageRank ranking colored and sized. No names on the dots. Toolbar at the bottom has the flask (analysis) button I used last time.

## Steps

### Step 1
Dev: "Okay, the club list is up, still colored from my ranking. No names on anything though. 'Fewest people in between' sounds like a path thing -- last time the analysis stuff was the flask button, so I'll try that first."

    real.mjs --step <session> --click-at 615,864   -> button "Analyze" (02.png)

02.png: a list of analyses with a "Filter analyses" box. Rank section: Degree, Betweenness, Closeness, PageRank... all rankings.

### Step 2
Dev: "Those are all rankings. I want a route. There's a filter box with focus -- I'll type 'path'."

    real.mjs --step <session> --type "path"   (03.png)

03.png: "Shortest path -- Start here -- The fewest steps, or the shortest path by weight, between two nodes." Also "Guided route -- Select 2 nodes first".

### Step 3
Dev: "Oh nice, 'Shortest path, the fewest steps'. That's literally what I need. Clicking it."

    real.mjs --step <session> --click "Shortest path"   (04.png)

04.png: a Shortest path form: From ("Where the path starts", focused), To, Follow Out/All (All picked), Weight: "Each edge counts as 1; "weight" has no meaning set." set to None, Advanced, Find path.

### Step 4
Dev: "From and To. The weight says each tie counts as 1 -- good, I want fewest people, not anything about the numbers. The From box already has the cursor, so I'll type Chloe."

    real.mjs --step <session> --type "Chloe"   (05.png)

05.png: a suggestion "Chloe" drops down under the From box.

### Step 5
Dev: "It found Chloe. I'll pick her from the list."

    real.mjs --step <session> --click "role=option:Chloe"   (06.png)

06.png: From says Chloe; the cursor moved to the To box by itself.

### Step 6
Dev: "Nice, it jumped to To for me. Typing Milo."

    real.mjs --step <session> --type "Milo"   (07.png)

07.png: suggestion "Milo" under To.

### Step 7
Dev: "Picking Milo."

    real.mjs --step <session> --click "role=option:Milo"   (08.png)

08.png: From Chloe, To Milo, Follow All, Weight None; focus moved to Find path.

### Step 8
Dev: "Chloe to Milo, every tie counts as one, either direction. That's what 'fewest people in between' means, I think. Find path."

    real.mjs --step <session> --click "Find path"   (09.png)

09.png: the path is drawn in black on the map. The left list has a new row "Shortest path -- 4 hops". The right panel, Values tab: Summary "Path: 5 nodes, 4 edges"; "Nodes in order": Chloe 1, Ava 2, Ivan 3, Kofi 4, Milo 5; "Made with": Analysis Shortest path, Ran Oct 11 3:10:09 AM, From Chloe, To Milo, Follow All, Weight None, "Each edge counts as 1; "weight" has no meaning set."

Dev: "Oh nice, that's it. Chloe, Ava, Ivan, Kofi, Milo, in order, numbered. 4 edges -- so 4 introductions, with three people in between. And the 'Made with' part shows exactly what I picked -- from Chloe, to Milo, weight None, each tie counts as one. That matches what I meant, and I can screenshot that for the instructor as proof. I can't add it up against the sheet since there's no number to add here: five names, four links, that checks out with itself."

    real.mjs --end <session>
    -> session still open; next request: "Ben now wants to be introduced to Nora the same way. Who is in that chain, in order, and how many introductions does it take?"

### Step 9
Dev: "Okay, same thing again for Ben and Nora. I'll go back to the flask and pick Shortest path again."

    real.mjs --step <session> --click "Analyze"   (10.png)

10.png: the analysis list again; Shortest path is now at the top under Recent.

### Step 10
Dev: "Shortest path is right at the top under Recent. Clicking it."

    real.mjs --step <session> --click "Shortest path#1"   -> tool refused (ambiguous name), nothing happened (11.png)
    real.mjs --step <session> --click-at 501,448   (the Recent "Shortest path" row in 10.png)

12.png: a fresh Shortest path form, From focused and empty; the Chloe-Milo path stays on the map and in the right panel.

### Step 11
Dev: "Fresh form, same as before. Typing Ben."

    real.mjs --step <session> --type "Ben"   (13.png)

### Step 12
Dev: "Ben's there. Pick him, then Nora."

    real.mjs --step <session> --click "role=option:Ben" --type "Nora"
   (14.png): From Ben, "Nora" suggested under To.

### Step 13
Dev: "Pick Nora, weight still None, follow All. Find path."

    real.mjs --step <session> --click "role=option:Nora" --click "Find path"
   (15.png): new path in black. Right panel: "Path 5 nodes, 4 edges"; Nodes in order: Ben 1, Theo 2, Ravi 3, Pia 4, Nora 5; Made with: From Ben, To Nora, Follow All, Weight None, Ran 3:11:06 AM. The left list still shows one "Shortest path -- 4 hops" row; the Chloe-Milo path is no longer drawn.

Dev: "Ben, Theo, Ravi, Pia, Nora -- four introductions again, three people in between. Wait, the Chloe one isn't on the map anymore and there's still just one 'Shortest path' row. I guess the new one replaced it? That's fine, I wrote down Chloe's chain already, but if I'd wanted both on the figure I'm not sure how I'd keep them. The 'Made with' box updated to Ben and Nora, so I can show my settings again."

    real.mjs --end <session>

## End of session (in character)

- Finished: yes, both requests.
  - Chloe to Milo: Chloe -> Ava -> Ivan -> Kofi -> Milo. 4 introductions, 3 people in between.
  - Ben to Nora: Ben -> Theo -> Ravi -> Pia -> Nora. 4 introductions, 3 people in between.
- Ease: 6 out of 7.
- What went well: typing "path" in the analysis filter found "Shortest path -- The fewest steps" right away. The From/To boxes suggested names as I typed and jumped to the next box. The answer came as a numbered list of names plus "5 nodes, 4 edges", and "Made with" showed exactly the settings I used (weight None, each edge counts as 1), which is the proof I want for my instructor.
- What confused me:
  - The dots on the map have no names, so I could only read the chain from the side panel, not from the picture.
  - The summary says "5 nodes, 4 edges" and the list row says "4 hops". I had to work out myself that 4 edges means 4 introductions and 3 people in between; the words "introductions" or "people in between" never appear.
  - Running the second path seemed to replace the first: one "Shortest path" row, and Chloe's chain vanished from the map with no message. I did not lose anything I needed, but I would not know how to keep both.
  - The list I reopened showed "Shortest path" twice (under Recent and in its own section), which was a little unclear about which one to pick.
