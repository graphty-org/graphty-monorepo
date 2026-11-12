# Session r1-s40b -- Dev (student), task: Les Miserables, ties with >= 5 shared chapters thick and blue

## Step 1
Command: real.mjs --start <folder> empty
Notes: Okay, opening the program for the first time. Let's see what's on the first screen.

What I saw: Landing page "Analyze any network", big green "Open a file", plus "Open network data", "Samples", "New project". A spinning colored network on the right.

## Step 2
Notes: Okay, I need the ready-made Les Miserables network -- that's a sample, right? I'll click the "Samples" button under Open a file.
Command: --step --click "Samples#2"
Result: tool said ambiguous (button and top link both "Samples"); nothing happened.

## Step 3
Notes: Retrying, the green Samples button.
Command: --step --click "role=button:Samples"
Result: A "Sample library" page with cards. First card: "Who holds the novel together -- Les Miserables -- 77 nodes, 254 edges". Oh nice, that's the one.

## Step 4
Notes: Clicking the Les Miserables card.
Command: --step --click-at 183,480
Result: Les Miserables opened: 77 nodes, 254 edges, all purple-blue balls with grey lines. Left panel "Style layers": Hovered, Selected, Everything, with a "+" next to it. Right panel Graph overview.

## Step 5
Notes: Okay, so I need to change only some of the ties. Wait, "Style layers" -- I think that's where I make a new look. Let me hover the "+" first to see what it says.
Command: --step --hover-at 276,122
Result: tooltip "Add a layer or a folder".

## Step 6
Notes: A layer, that sounds right. Clicking +.
Command: --step --click-at 276,122
Result: A menu: Layer, Folder, Select layers..., Analyze...

## Step 7
Notes: "Layer" is highlighted. Clicking Layer.
Command: --step --click-at 210,158
Result: "Layer 1" appeared with its name selected for editing. Right panel shows Style with Node / Edge tabs, "Which nodes: All 77 nodes: add a condition to narrow", and sections Shape, Visibility, Text, Fill, Effects, Rendering. At the bottom "Edges: nothing set -- Edit edges".

## Step 8
Notes: I'll name it so I can tell the instructor what it is: "Strong ties". Then Enter.
Command: --step --type "Strong ties" --key Enter

## Step 9
Notes: I only want ties, not characters, so I'll switch to the "Edge" tab at the top of the right panel.
Command: --step --click-at 1292,142
Result: Edge tab: "Style edges" checked, "Which edges 254 of 254 edges -- All 254 edges: add a condition to narrow". Sections Visibility, Text, Line, Arrowheads, Effects.

## Step 10
Notes: Wait, it's all 254 ties right now. I need only the ones with 5 or more shared chapters, so I'll open "Which edges" to add a condition -- like a filter in the tutorial.
Command: --step --click-at 1260,201
Result: "Which edges: Edges that pass every condition", "+ Add a condition", Done button.

## Step 11
Notes: Clicking "Add a condition".
Command: --step --click "Add a condition"
Result: A list "Find an attribute" with Data: "shared_chapters 1 to 31". Oh nice, that's exactly the chapters thing.

## Step 12
Notes: Clicking shared_chapters.
Command: --step --click-at 1300,344
Result: A condition box "shared_chapters 254 edges, Between, slider, 1 to 31". The layer now says "Edge layer" and "Node not styled" -- good, characters are left alone.

## Step 13
Notes: "At least 5" means from 5 up, so I'll make the low number 5 and leave 31 as the top. Click the first box, select all, type 5, Tab.
Command: --step --click-at 1265,304 --key Control+a --type "5" --key Tab
Result: Now "5 to 31", "51 of 254 edges". The layer row says 51. Okay, 51 ties share 5 or more chapters.

## Step 14
Notes: Click Done to close the condition.
Command: --step --click "Done"
Result: Condition collapsed to a chip "shared_chapters 5 to 31, 51 edges". Now I need thick and blue -- that's the line, I think.

## Step 15
Notes: "Line" sounds like where thickness and color live. Clicking the + next to Line.
Command: --step --click-at 1404,340
Result: Menu: Color, Width, Pattern, Pattern count, Curved.

## Step 16
Notes: Color first, for blue.
Command: --step --click-at 1340,376
Result: A Color row appeared with a grey swatch and the code "A9A9A9" highlighted. Wait, I don't know color codes. Maybe the little grey square opens a picker.

## Step 17
Notes: Clicking the grey swatch to get a color picker.
Command: --step --click-at 1268,374
Result: A Color picker popup with a gradient, hue bar, Hex A9A9A9, and five little swatches at the bottom: purple-ish, grey, blue, yellow, black.

## Step 18
Notes: The third swatch looks like a proper blue. Hovering it first to check what it's called.
Command: --step --hover-at 1032,736
Result: tooltip "blue 0077BB". Yes, blue.

## Step 19
Notes: Clicking the blue swatch.
Command: --step --click-at 1032,736
Result: The picker closed and some lines are now blue! A legend popped up top-left "Edge color: Strong ties, 51 of 254 edges". Color row says 0077BB. Oh nice. But they're thin, hard to see.

## Step 20
Notes: Now thick. Back to the + next to Line for "Width".
Command: --step --click-at 1404,340
Result: Menu now: Width, Pattern, Pattern count, Curved.

## Step 21
Notes: Width.
Command: --step --click-at 1340,376
Result: A Width row with "8" highlighted. But wait, the blue lines don't look any thicker than before. Is 8 just what they already are? I don't know what the unit is.

## Step 22
Notes: I want them clearly thick, so I'll type a bigger number, 20, and press Enter.
Command: --step --key Control+a --type "20" --key Enter
Result: Oh nice, that's it -- the 51 strong ties are now clearly thicker and blue; all the other lines are still thin grey and the characters are still the same purple-blue balls. Width row shows 20, Color 0077BB. Layer "Strong ties" shows 51. Autosave says saved.

Stopping here: the task is done. (Not ending the session; the facilitator ends it.)

## Wrap-up (in character, Dev)
- Did I finish? Yes. I opened the Les Miserables sample, made a style layer called "Strong ties" for edges only, narrowed it with the condition shared_chapters 5 to 31 (51 of 254 ties), set the line color to blue (0077BB) and the width to 20. Nodes say "not styled" and the other 203 ties look the same as before.
- Essay sentence: "Of the 254 ties in Les Miserables, 51 join characters who share at least 5 chapters; these are drawn thick and blue."
- Ease: 6 of 7 (easy). The sample library had Les Mis right at the top, and the "add a condition" list showed shared_chapters with its range, which was exactly the word I needed.
- What confused me:
  - Two things on the first page are both called "Samples" (top link and the green button) -- fine for me as a person, but worth knowing.
  - "Style layers" was not a word from my tutorial; I was looking for something like "filter" or "partition"/"ranking" for edges. The "+" tooltip "Add a layer or a folder" helped.
  - The condition is "Between 1 and 31" rather than "at least"; I had to realize that 5 to 31 means "at least 5". An "at least" choice would feel safer -- I wasn't 100% sure 31 is truly the maximum, though the list said "1 to 31".
  - When I added Width it showed 8, but the lines did not visibly get thicker. I could not tell what unit the number is or what the normal width is, so I just guessed 20. 20 looked good, but I have no idea if it is "too thick" by the instructor's standard.
  - Color codes like A9A9A9 mean nothing to me; luckily the swatch opened a picker with a named "blue" swatch on hover.
