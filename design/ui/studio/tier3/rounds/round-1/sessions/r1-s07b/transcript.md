# Session r1-s07b -- Ruth (reporter), task: Les Miserables, mark every "Mme" in purple, count them

Start command:
`REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier3-r1d2-758b8e8081 REAL_TIER=3 node .../real.mjs --start <session folder> empty`

## Step 1 (01.png)
A landing page. "Open a file", "Open network data", "Samples", "New project". It says the file never leaves my computer -- good. Les Miserables is a ready-made network, so "Samples" is where I'd look.
Next: `--click "Samples"` (the button in the card).
Result: ambiguous (a button and a link both named Samples), nothing happened (02.png).

## Step 2
I'll press the big Samples button in the card.
`--click-at 455,540`
Result (03.png): Sample library. First card: "Who holds the novel together -- Les Miserables -- 77 nodes, 254 edges". I write down 77 and 254.

## Step 3
Open the Les Miserables card.
`--click-at 183,410`
Result (04.png): The network opened. Right panel: Nodes 77, Edges 254 -- matches the card. Left: a search box "Find nodes, edges, values" and "Style layers" (Hovered, Selected, Everything 77). Every dot is already a bluish purple, which worries me -- "purple" must stand out from that.

## Step 4
Starting with a name, as I always do: type "Mme" in the search box.
`--click "Find nodes, edges, values" --type "Mme"`
Result (05.png): "Nodes 6": MmeMagloire, MmeDeR, MmeThenardier, MmeBurgon, MmePontmercy, MmeHucheloup. Plus "Edges 26" that touch them. So six. Is that all of them? The search matched "Mme" in the name; I can't yet confirm it isn't missing a lowercase one, but the list says 6.
Now to color them. There is a "+" next to "Style layers". I'll try that.

## Step 5
`--click-at 276,799`
Result (06.png): The results list collapsed (the search still says Mme) and no menu appeared -- the "+" seems to have jumped to the top. Nothing added.

## Step 6
Click the "+" again where it is now.
`--click "Add a layer or a folder"`
Result (07.png): A menu: Layer, Folder, Select layers..., Analyze...

## Step 7
"Layer" is what I want.
`--click "Layer"`
Result (08.png): "Layer 1" added, name box highlighted for typing. Right panel: "Which nodes -- 77 of 77 nodes. All 77 nodes: add a condition to narrow". Good, it tells me what it's counting over. Sections Shape, Visibility, Text, Fill...

## Step 8
Name the layer so I know what it is, then open "Which nodes".
`--type "Married women (Mme)" --key Enter --click "Which nodes"`
Result (09.png): Layer renamed "Married women (Mme)". Which nodes: "Nodes that pass every condition", "+ Add a condition", Done.

## Step 9
`--click "Add a condition"`
Result (10.png): An attribute list: Data -> "name"; Structure -> "Node id". The task is about the name, so "name".

## Step 10
`--click "name"`
Result (11.png): Condition: name / Contains / "Type the text to match" / Match case (off).

## Step 11
Type Mme. I'll also tick Match case so a stray lowercase "mme" inside some other name can't sneak in.
`--click "Type the text to match" --type "Mme" --click "Match case"`
Result (12.png): Typed Mme; a suggestion list covered "Match case" so that click failed. But the panel now says "6 of 77 nodes" and the layer row says 6. The suggestions list the six: Mme Burgon, Mme de R, Mme Hucheloup, Mme Magloire, Mme Pontmercy, Mme Thenardier. Same six as the search box. 

## Step 12
Close the suggestions and tick Match case.
`--key Escape --click "Match case"`
Result (13.png): Match case ticked; still "6 nodes", "6 of 77 nodes". Edges "not styled" -- good, I only want the women.

## Step 13
Press Done, then open Fill to set the color.
`--click "Done" --click "Fill"`
Result (14.png): Done worked: summary "name contains Mme, 6 nodes". The "Fill" click was ambiguous (three things called Fill). The "+" next to Fill is highlighted.

## Step 14
Click the "+" on the Fill row.
`--click-at 1404,381`
Result (15.png): Fill -> Color "6366F1", text selected, with a bluish swatch -- the same color every dot already has. That's a computer code, not a color name. I'll try simply typing the word.

## Step 15
`--type "purple" --key Enter`
Result (16.png): It took the word: Color now "800080" with a purple swatch. A legend appeared top-left: "Color: Married women (Mme) -- 6 of 77 nodes". I count the purple dots on the picture myself: around (726,254), (796,384), (702,409), (711,523), (691,535), (799,528) -- six. The rest stay bluish. Picture and count agree.

## Step 16
One spot check: hover a purple dot to see who it is.
`--hover-at 711,523`
Result (17.png): The dot under my pointer is MmeMagloire (the Hovered layer count went to 1). No name label popped up on screen when hovering, though -- I only know because of what was reported; on screen there was no tooltip. Still, the purple marks match the six names.

## Wrap-up (in character, as Ruth)
- Did I finish? Yes. Les Miserables is open (77 nodes, 254 edges, matching the sample card), a style layer "Married women (Mme)" colors exactly the characters whose name contains "Mme" (match case on) in purple (800080), everyone else unchanged, edges untouched.
- How many: **6** -- Mme Burgon, Mme de R, Mme Hucheloup, Mme Magloire, Mme Pontmercy, Mme Thenardier. The search box, the layer's condition count ("6 of 77 nodes"), the legend and my own count of purple dots on the picture all agree.
- Ease: 6 out of 7 (1 very difficult, 7 very easy).
- What confused me:
  - The "+" by Style layers jumped: with search results open it sat at the bottom; my first click just closed the results and did nothing else.
  - The color box shows a code (6366F1) instead of a color name, and the default dot color is already a bluish purple, so "purple" next to it is not very far apart; I had to look closely. Typing the word "purple" worked, which I would not have guessed.
  - The name suggestion list popped open over the "Match case" box and blocked it until I pressed Escape.
  - Hovering a dot showed no name on screen; to check who a dot is I'd want a label.
  - Small point: the search shows names run together ("MmeMagloire") while the condition suggestions show "Mme Magloire" with a space. Which is the real name? Says who? It counted the same six either way, so I let it go.
