# Session r2-s06 -- Elena, task T20 (prompt B: hiking trails, trails.csv)

Build: tier2-r2d4-8f0d5a6f7 (8f0d5a6f7791). Start: empty. Tool: `real.mjs` with `REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r2d4-8f0d5a6f7/`.

Commands run from `design/ui/studio/tool`; `$S` is the session folder.

## Steps

### 01 -- start
`node real.mjs --start $S empty` -> 01.png

Elena: The start screen. I remember this -- Open project or file is where I go. There's a banner at the bottom asking about usage data; I'll say no thanks first so it's out of my way.

### 02 -- dismiss usage banner
`node real.mjs --step $S --click "No thanks"` -> 02.png

Elena: Banner gone. There's "Open project or file..." and "New from data...". I've used Open before; I'll go with what I know and pick trails.csv from Downloads.

### 03 -- open trails.csv
`node real.mjs --step $S --click "Open project or file" --upload trails.csv` -> 03.png

Elena: A preview of my file -- nice, I can see the rows. 9 nodes, 13 edges. The km column says "Attribute", and right below there's "Weight: none (each edge counts 1)". That sounds like it would treat every trail as the same length, which is exactly what I don't want. I'll open the km dropdown to see what else it can be.

### 04 -- (tool: name was ambiguous, nothing happened)
`node real.mjs --step $S --click "km"` -> 04.png (ambiguous: a "km" column header button and the "Role of km" dropdown; nothing clicked)

Elena: I meant the dropdown under "km" that says Attribute.

### 05 -- open the km dropdown
`node real.mjs --step $S --click "Role of km"` -> 05.png

Elena: Choices: From, To, Weight, Date or time, Edge id, Attribute. "Weight" matches the "Weight: none" line I saw, so that's probably how I tell it the kilometers count. I'll pick Weight.

### 06 -- km set to Weight
`node real.mjs --step $S --click "Weight"` -> 06.png

Elena: Now it says "Weight: km" and asks "Higher means": Not set, Closer, Farther, Capacity. The line under it says until I choose, a path counts every edge as one step. More kilometers is a longer walk, so "Farther" is my answer.

### 07 -- Farther chosen
`node real.mjs --step $S --click "Farther"` -> 07.png

Elena: "Weight: km (farther)" and "a path takes the smallest total" -- good, that's what I want. Down at the bottom there's "Direction: As the file says". Trails go both ways, so I'm curious what the other choices are before I load.

### 08 -- Direction list open
`node real.mjs --step $S --click "Direction"` -> 08.png

Elena: As the file says, Directed, Undirected. A trail isn't one-way, so "Undirected" sounds right -- I can walk it either way.

### 09 -- Undirected chosen
`node real.mjs --step $S --click "Undirected"` -> 09.png

Elena: Header now reads "each edge goes both ways". km is Weight, farther. Looks set. Load.

### 10 -- loaded
`node real.mjs --step $S --click "Load"` -> 10.png

Elena: There's my map -- 9 dots, no names on them though. On the right it says "Loaded weight: km (farther)", which is reassuring. Now for the shortest walk. Last time the analysis button in the toolbar (the flask at the bottom) is where I had it rank people; I'll look there for something about the quickest way between two places.

### 11 -- Analyze list open
`node real.mjs --step $S --click-at 679,864` -> 11.png (button "Analyze")

Elena: The list of analyses. Lots of ranking ones. There's a "Filter analyses" box at the top; rather than scroll I'll type "shortest" and see what comes up.

### 12 -- filtered to "shortest"
`node real.mjs --step $S --type "shortest"` -> 12.png

Elena: "Shortest path -- Start here -- the fewest steps, or the shortest path by weight, between two nodes." That's my walk. Clicking it.

### 13 -- Shortest path form
`node real.mjs --step $S --click "Shortest path"` -> 13.png

Elena: From, To, and Weight already says "km (farther, loaded)" -- so it picked up what I set when I opened the file. I'll type Trailhead into From.

### 14 -- typed Trailhead
`node real.mjs --step $S --click "Where the path starts" --type "Trailhead"` -> 14.png

Elena: A suggestion "Trailhead" dropped down. I'll click it.

### 15 -- From = Trailhead
`node real.mjs --step $S --click-at 563,679` -> 15.png (option "Trailhead")

Elena: From says Trailhead and the cursor jumped to the To box on its own. Typing Summit.

### 16 -- typed Summit
`node real.mjs --step $S --type "Summit"` -> 16.png

Elena: Summit suggested. Clicking it.

### 17 -- To = Summit
`node real.mjs --step $S --click-at 559,733` -> 17.png (option "Summit")

Elena: Trailhead to Summit, weight km (farther, loaded). Find path.

### 18 -- path found
`node real.mjs --step $S --click "Find path"` -> 18.png

Tool output: `Could not click "Find path": elementHandle.click: Timeout 3000ms exceeded` -- yet the screenshot shows the run happened. The click itself landed: the popover closed and the result replaced it while Playwright was still waiting for the click action to finish, so the tool reported a timeout on a click that took effect. A participant would see only the result.

Elena: There it is. The path is drawn in black on the map, and the right side says Path: 5 nodes, 4 edges, "Total km 7.5". Nodes in order: Trailhead, Creek, Meadow, Ridge, Summit. Under "Made with" it says Weight: km (farther) -- that's where it says it used the kilometers. Checking against my file: 1.5 + 2 + 2.5 + 1.5 = 7.5. The other way through Pine Fork would be 3 + 1 + 2.5 + 1.5 = 8, or 3 + 6 = 9 straight up, so this really is the shortest. The left list says "Shortest path 4 hops", which is a slightly odd word, but fine.

### End
`node real.mjs --end $S`

## Debrief (in character)

- **Finished?** Yes. Shortest walk from Trailhead to Summit: Trailhead -> Creek -> Meadow -> Ridge -> Summit, 7.5 km in all. The program shows it used the kilometers in three places: the Graph overview's "Loaded weight: km (farther)", the Shortest path form's Weight box "km (farther, loaded)", and the result's "Made with -- Weight: km (farther)" plus the "Total km 7.5" line.
- **Ease: 6 of 7.** It went smoothly once I noticed the "Weight: none (each edge counts 1)" line in the file preview. That line is what made me open the km dropdown; without it I would have loaded and only found out later.
- **What confused me:**
  - In the km dropdown, the word "Weight" is not one I'd use for kilometers. I picked it only because the line underneath also said "Weight". If that line had not been there I'm not sure I'd have guessed.
  - "Higher means: Not set / Closer / Farther / Capacity" -- Farther was obvious for trails, but I don't know what Capacity is and Closer sounded like the opposite of what I wanted; the explanation line only appeared after I chose.
  - Direction ("As the file says") was at the very bottom, far from everything else; I only went there because I was curious. I'm not sure whether leaving it alone would have changed the answer.
  - The dots have no names on the map, so I couldn't tell which dot was the Trailhead until the path was drawn and listed on the right.
  - "4 hops" in the left list vs "4 edges" on the right -- two words for the same thing.

## Notes for the study team (out of character)

- No implementation defect blocked the task. The only tool oddity was the "Find path" click reported as a 3-second timeout while the click had taken effect (the popover was replaced by the result during the click), so the step's screenshot is correct.
- The `--click "km"` ambiguity (column header button vs "Role of km" combobox) was a tool naming collision, not something a person would hit.
