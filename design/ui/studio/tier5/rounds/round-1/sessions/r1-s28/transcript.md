# Session r1-s28 transcript (Tom, returning user)

Task: make the Otter Creek basin sensors stand out in orange for the council visit; say how many are orange.

## Step 1 (start)
Command: REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier5-r1d1-1e123d7d33 REAL_TIER=5 node .../real.mjs --start <folder> setup:sensors-50k.txt
Screenshot 01.png: the state's sensor file, sensors-50k, 50,000 blue dots in a square. Right side says Nodes 50,000, Edges 100,000. Bottom right "Local only" -- good, data stays here. Left: Style layers Hovered, Selected, Pinned, Everything.
Thought: That's the file as I saved it. Nothing tells me which ones are Otter Creek. I'll try the search box at the top left and type Otter Creek.

## Step 2
Command: --step <folder> --click "Find nodes, edges, values" --type "Otter Creek"
Screenshot 02.png: a list "Nodes 1050", each says "basin: Otter Creek" (n38, n126, ...). So there is a basin column. Picture unchanged, nothing highlighted.
Thought: 1050 is a number, but it's a search, not orange. I have never colored anything. I'll try the + next to Style layers.

## Step 3
Command: --step <folder> --click-at 276,781 (the + "Add a layer or a folder")
Screenshot 03.png: the search results list went away, the Style layers moved back up to the top. No menu that I can see. Nothing changed.
Thought: Did it do anything? Maybe the list jumped under my finger. The + is now up top; I'll click it again there.

## Step 4
Command: --step <folder> --click-at 276,122
Screenshot 04.png: a small menu: Layer, Folder, Hover highlight, Analyze...
Thought: "Layer" is the plain one. Analyze is not for me. I'll pick Layer.

## Step 5
Command: --step <folder> --click-at 178,158 (menu item Layer)
Screenshot 05.png: a new "Layer 1" in the list with its name box highlighted. On the right: Which nodes "50k of 50k", All nodes; and Shape, Visibility, Text, Fill with + signs.
Thought: I'll name it so the postdoc knows what it is, then press Enter. Then I need "Which nodes" to be only Otter Creek.

## Step 6
Command: --step <folder> --type "Otter Creek orange" --key Enter --click "Which nodes"
Screenshot 06.png: a big "Which nodes -- Otter Creek orange 50,000 of 50,000" screen, all green dots, a table with station and basin, and an open list: Node id, station, basin (40 values), Degree, then Betweenness, Closeness, PageRank.
Thought: The ones below the line I don't know and won't touch. "basin" is what I want. Clicking basin.

## Step 7
Command: --step <folder> --click-at 945,244 (option "basin, 40 values")
Screenshot 07.png: a list of basins with tick boxes and counts (Lower Delta 11,640, Grand Reach 5,936 ...), "32 more", and a "Search 40" box. No Otter Creek in view.
Thought: I'll type Otter in the search box above the list.

## Step 8
Command: --step <folder> --click-at 1040,188 --type "Otter"
Screenshot 08.png: one row, "Otter Creek 1,050", with a box to tick. Matches the 1050 from the search earlier.
Thought: Tick the Otter Creek box.

## Step 9
Command: --step <folder> --click-at 903,217 (tick "Otter Creek, 1050 nodes")
Screenshot 09.png: header now says "1,050 of 50,000"; picture shows a scatter of green dots, the rest faded; "No match 48,950". Table shows only Otter Creek rows.
Thought: 1,050 + 48,950 = 50,000, that adds up. Press Done, then find the color.

## Step 10
Command: --step <folder> --click "Done"
Screenshot 10.png: back to the blue picture. Layer list shows "Otter Creek orange 1,050". Right side: Which nodes "basin Otter Creek", then Shape, Visibility, Text, Fill with +.
Thought: The picture didn't change yet, I haven't picked a color. "Fill" sounds like color. Click the + by Fill.

## Step 11
Command: --step <folder> --click-at 1404,401 ("Add to node fill")
Screenshot 11.png: under Fill a "Color" box appeared, empty. Which nodes says "1,050 of 50k". Picture still blue.
Thought: I'll click the little square in the Color box to get a color chooser.

## Step 12
Command: --step <folder> --click-at 1269,435 ("Pick node color")
Screenshot 12.png: a Color window with a big square, a rainbow strip, "Hex 6366F1", and six little swatches (blue, grey, grey, dark blue, yellow, black). No orange swatch.
Thought: No orange to just click. I'll click the orange part of the rainbow strip, near the left.

## Step 13
Command: --step <folder> --click-at 1025,712 (slider "Hue")
Screenshot 13.png: the color window closed by itself. Scattered dots across the square are now orange-ish (a salmon / coral orange, code F17F63). A legend box top left: "Color: Otter Creek orange, 1,050 of 50,000 nodes". Layer list: "Otter Creek orange 1,050". Autosave: saved.
Thought: There they are. It's more of a salmon than a true orange, and I wasn't asked to fine-tune it -- I'm not going to fiddle with a rainbow strip. The legend gives me the number: 1,050. That matches the basin list (1,050) and the count left over (48,950) adds to 50,000. I'm done; I'd stop here.

## End of session (in character)

- Did I finish? Yes. The Otter Creek basin sensors are colored orange-ish and the legend says 1,050 of 50,000. Answer: 1,050 sensors are in orange.
- How easy, 1 (very difficult) to 7 (very easy): 5.
- What confused me:
  - The first time I pressed the + next to Style layers (while the search list was open), nothing happened -- the list just closed and the + jumped to the top. I had to press it again.
  - The search box at top told me 1050 Otter Creek, but did nothing to the picture; I wasn't sure if searching was the same as coloring.
  - "Which nodes" turned the whole drawing green for a while; I didn't know if that was changing her colors. It went back to blue after Done, so fine.
  - After I chose Fill, nothing changed until I picked a color, and there was no orange among the ready-made little squares. I had to click on a rainbow strip, and the window shut after one click. What I got is more salmon than orange; I couldn't tell you if the council will call it orange.
  - Words I skipped: Shaders, Betweenness, Closeness, PageRank, Except, Group colors. Didn't touch them.
  - Good: "Local only" at the bottom, and the legend in the corner with the name and count -- that's what I'd show the PI.

## Follow-up

Facilitator: "On a scale from 1 (calm: you knew what to do next) to 7 (overwhelming: you wanted to walk away), how did the program feel while you did this? Say the number. Then name the moment you were least sure where to look or what to do next, and what was on the screen."

Tom: 3. Mostly I could see the next thing to press -- Layer, Which nodes, basin, tick the box, Done, Fill. The moment I was least sure was right after I pressed the + next to Style layers while the search results were still open. The list of 1,050 "basin: Otter Creek" nodes just vanished, the Style layers jumped back up to the top, and no menu came up. The picture was the same 50,000 blue dots. I didn't know whether I had added something, broken something, or missed the button, and I had to go find the + again in its new spot at the top and press it a second time. A close second was the Color window: a big square, a rainbow strip, "Hex 6366F1" and six little squares with no orange among them -- I clicked the strip once and the window shut on me, and I was left with salmon rather than orange.
