# Session r1-s09b -- Tom (recipe recipient)

Task: open the ready-made Les Miserables network, color every "Mme" character purple, leave everyone else alone, say how many there are.

## Step 1 -- start
Command: REAL_DIST=... REAL_TIER=3 node .../real.mjs --start .../r1-s09b empty
Screenshot 01.png. A landing page: "graphty", big green "Open a file", "Open network data", "Samples", "New project". A spinning colored network on the right. Footnote says the file never leaves my computer -- good, though I have no data of my own here today. "Ready-made" sounds like Samples. I'll click Samples.

## Step 2 -- Samples (02.png, 03.png)
Command: --click "Samples#2" (refused as ambiguous, nothing happened, 02.png), then --click "role=button:Samples" (03.png).
A "Sample library". First card: "Who holds the novel together -- Les Miserables -- 77 nodes, 254 edges". That's the one. Clicking it.

## Step 3 -- open Les Miserables (04.png)
Command: --click-at 183,480 (button "Open the Les Miserables sample").
It opened: 77 nodes, 254 edges, all purple-blue dots, no names on them. "Local only" at the top, fine. A black bar says the browser may clear what it keeps -- not my problem right now. There's a box "Find nodes, edges, values" at the top left. I'll type Mme in it.

## Step 4 -- search Mme (05.png)
Command: --click "Find nodes, edges, values" --type "Mme"
It says "Nodes 6": MmeMagloire, MmeDeR, MmeThenardier, MmeBurgon, MmePontmercy, MmeHucheloup. So six. Nothing lit up in the picture though. Now I need them purple. I don't see a "color these" button. I'll press Enter and see if it picks all six.

## Step 5 -- Enter (06.png)
Command: --key Enter
It only picked the first one, MmeMagloire ("Selected 1"), and the search went away. Not all six. There's a "+" next to "Style layers" on the left. I'll try that -- it's the only "add" thing I see.

## Step 6 -- plus button (07.png)
Command: --click-at 276,122 (button "Add a layer or a folder")
A small menu: Layer, Folder, Select layers..., Analyze... "Layer" is highlighted. I'll take Layer.

## Step 7 -- new layer (08.png)
Command: --click-at 178,158 (menuitem "Layer")
"Layer 1" appeared with its name highlighted for typing. Right side: "Which nodes -- 77 of 77 nodes. All 77 nodes: add a condition to narrow", and Fill with a plus. Worry: right now it applies to all 77 -- I don't want to paint everyone. I'll name it "Married women" first, then narrow "Which nodes".

## Step 8 -- name and Which nodes (09.png)
Command: --type "Married women" --key Enter --click-at 1260,201
Layer is called "Married women", still 77. "Which nodes" opened: "Nodes that pass every condition", "+ Add a condition", Done. Clicking Add a condition.

## Step 9 -- Add a condition (10.png)
Command: --click "Add a condition"
A list: "name" and "Node id". The names are what has "Mme" in them. Clicking "name".

## Step 10 -- name condition (11.png)
Command: --click-at 1271,344 (option "name")
"name / Contains / Type the text to match". Plain enough. Typing Mme into the box.

## Step 11 -- typed Mme (12.png)
Command: --click "Type the text to match" --type "Mme"
"6 of 77 nodes", and the layer on the left now says 6. A list shows the six: Mme Burgon, Mme de R, Mme Hucheloup, Mme Magloire, Mme Pontmercy, Mme Thenardier. Same six as the search. Good, a number. Now the color: "Fill" with a plus. Clicking the Fill plus.

## Step 12 -- Fill (13.png)
Command: --click-at 1404,539 (button "Add to node fill")
Fill now has "Color" with a code "6366F1" and a little blue-violet square. The summary reads "name contains Mme, 6 nodes" -- good. I don't speak hex codes. The dots are already a bluish-purple, so I can't tell what's mine. I'll click the little colored square and hope for a palette.

## Step 13 -- color picker (14.png)
Command: --click-at 1268,415 (button "Pick node color")
A color box with a rainbow bar and five little squares: blue-violet, grey, blue, yellow, black. No purple square, and it says "Hex". The current color is already bluish-purple like every other dot -- that's the trouble. I'll click the rainbow bar a bit further toward the pink end, where purple should be.

## Step 14 -- picked a purple (15.png)
Command: --click-at 1146,692 (slider "Hue")
The color box closed by itself and the code is now "DC63F1", a pinky-purple square. In the picture six dots turned that purple-pink color; I counted them, six, the rest stayed blue. A box appeared top left of the picture: "Color: Married women -- 6 of 77 nodes". That's a legend and a number -- that's what I wanted. It's more orchid than a deep purple, but next to the blue dots it reads as purple, and the legend says what it means. I'm stopping here.

## End of session (in character)

Did I finish? Yes. Six married women ("Mme" in the name): Mme Burgon, Mme de R, Mme Hucheloup, Mme Magloire, Mme Pontmercy, Mme Thenardier. They are purple-pink in the picture, everyone else is still the original blue, and the little legend says "Color: Married women, 6 of 77 nodes".

How easy, 1 (very difficult) to 7 (very easy): 5.

What confused me:
- Clicking "Samples" first did nothing the first time (there were two things called Samples); the second worked.
- The search box found the six right away and gave me the number, but there was nothing there to color them. Pressing Enter just picked the first one, MmeMagloire, which then stayed highlighted with a yellow ring the whole time. I'm not sure if that changed anything.
- To color them I had to make a "Layer" -- I'd never have guessed the word "layer" means "a group of dots you color". When I made it, it said it applied to all 77 at first, which made me nervous I was about to paint everybody.
- "Which nodes" and "Add a condition" were okay once I was in them; "name contains Mme" I understood, and it showed me the six names and "6 of 77 nodes". That part I trusted.
- The color starts as a hex code, 6366F1, which is the same bluish-purple as every dot already. If I'd left it, nothing would have changed and I wouldn't have known. There was no purple among the little squares; I had to guess on the rainbow bar, and the box closed as soon as I clicked, so I got a pinkish purple, not the deep purple I had in mind.
- I'd probably ask her whether "DC63F1" counts as purple for the lab's slides.
