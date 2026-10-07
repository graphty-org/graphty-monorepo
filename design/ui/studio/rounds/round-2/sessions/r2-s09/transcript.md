# Session r2-s09 -- T15 Prompt B (friends.csv), participant Dev (class-project student)

## Step 1
Command: `node tool/real.mjs --start rounds/round-2/sessions/r2-s09 empty`
Saw (01.png): a dark start page. "Start" with "Open project or file..." (Ctrl+O) and "New from data...", "or drop a file anywhere in this window", "Files are read on this computer and never uploaded". Recent projects is empty. Samples on the right: Les Miserables, Zachary's karate club, College football, Florentine families. A usage-data banner at the bottom.
Dev: "Okay, I read everything. There are samples, which is nice, but the task is my own file, friends.csv. First I'll say No thanks to the data thing, it's covering stuff."

## Step 2
Command: `--step --click "No thanks"`
Saw (02.png): banner gone; a line "Usage data stays off. Change this in Settings > Privacy". Same Start choices.
Dev: "Wait -- 'Open project or file' or 'New from data'? The tutorial said 'import spreadsheet'. My CSV is a file, so I'll try Open project or file first, it's on top." (Hesitated between the two.)

## Step 3
Command: `--step --click "Open project or file..." --upload friends.csv`
Saw (03.png): it went straight to a drawing -- 20 blue balls with arrows on a light canvas. Title "friends", undo/redo arrows at top (relief, there IS undo). Right panel "Graph, From friends.csv", Values tab: Nodes 20, Edges 41, Direction Directed, Density 0.1079, Components 1, Edges per node 3 to 6, mean 4.1. Left panel: Find box, Selection, Everything, and a hint "Analyze (flask icon) in the toolbar (Shift+A) to add results here". Bottom toolbar: flask, a chart-ish icon, "3D", magnifier. No names on the dots.
Dev: "Oh nice, it just drew it, no separator or 'Edges table' questions like Gephi. Part 1 done: it's on screen, 20 people, 41 links. It says Directed though -- the tutorial said pick Undirected... a 'knows' list should be undirected, hmm. I'll leave it. Now I need the statistics. The hint says Analyze is the flask, so that's probably where statistics are."

PART 1 (get it on screen): DONE.

## Step 4
Command: `--step --click "Analyze"`
Saw (04.png): a popup list "Filter analyses", heading "Rank nodes and edges": Degree, Betweenness, Edge betweenness, Closeness, PageRank (with a "Start here" tag), Eigenvector, Katz, HITS, All-pairs distance, Depth-first order (grayed, "Select a node first"), Most flow... Each has a one-line explanation.
Dev: "Okay, these are the statistics, they just call it Analyze. I know Degree and Betweenness from the tutorial! PageRank says 'Start here' which is tempting... but the slides sized nodes by degree, so I'll do Degree first, like the tutorial."

## Step 5
Command: `--step --click "Degree"`
Saw (05.png): the list shrank to a small card: "< Degree -- How many edges each node has. Under a second" and a blue "Run" button.
Dev: "Like Gephi's Run button for statistics. Clicking Run."

## Step 6
Command: `--step --click "Run"`
Saw (06.png): every dot turned orange-brown, darker = more. A key in the top-left of the canvas: "Color: Connections, 3 [orange bar] 6". The left panel got a new row "Connections 20" with an orange swatch. Sizes did not change; still no names.
Dev: "Wait, it colored them instead of sizing them. 'Connections' must be what they call degree. The dark one in the middle has the most, I guess. But the task says make the dots BIGGER. In Gephi it was Ranking > size. Let me click the Connections row on the left, maybe it has options."

## Step 7
Command: `--step --click "Connections"`
Saw (07.png): the Connections row is highlighted (with an eye icon). Right panel is now "Connections -- Measure from Connections, Oct 6", Style tab, Nodes/Edges toggle. Rows: Fill (+), Color = "Connecti..." (-), Shape (+), Effects (+), Label (+), Tooltip (+).
Dev: "Okay this is like the Appearance panel. I'm looking for 'Size'... there's no Size row. Maybe size lives under Shape? Shape of a dot includes how big it is, right? I'll hit the + next to Shape."

## Step 8
Command: `--step --click-at 1419,234`
Saw (08.png): a small menu opened by the Shape +: "Size" (highlighted) and "Shape".
Dev: "Yes! Size was hiding under Shape. Clicking Size."

## Step 9
Command: `--step --click "Size"`
Saw (09.png): a new row "Size" with a number box "1", a chain-link icon, and a minus. Dots unchanged.
Dev: "Hmm, it's just one number, that would make them all the same size. The Color row says 'Connecti...' so it's tied to the data. Maybe that chain-link icon ties Size to the data too? Let me hover it to see what it says first."

## Step 10
Command: `--step --hover-at 1380,264`
Saw: tooltip "Size by attribute".
Dev: "'Size by attribute' -- that's the Ranking thing. Clicking it."

## Step 11
Command: `--step --click "Size by attribute"`
Saw (11.png): a "Size by attribute" popup: search box "Find an attribute", group "Connections": Connections, Connections rank, Connections percentile, Connections in degree, Connections out degree. Below, grayed: "Cannot be used: Holds groups, not amounts -- id".
Dev: "Plain 'Connections' is what the color uses, so I'll pick that so both match."

## Step 12
Command: `--step --click "Connections#2"` (the first one in this popup; the left panel row has the same name)
Saw (12.png): now the dots have different sizes -- the dark one near the middle is much bigger, a second one right of it is big too. The key grew: "Size: Connections 3 [wedge] 6" and "Color: Connections 3 [orange bar] 6". Size row now reads "1 to 3".
Dev: "Oh nice, that's it, that looks like the slides! The big dark one has the most connections (6). Parts 2 and 3 done: the program worked out who matters (by number of connections) and bigger dots = more connections. Now labels. There's a 'Label +' row right here."

PART 2 (work out who matters): DONE (Degree, called 'Connections' here).
PART 3 (bigger dots for more important): DONE.

## Step 13
Command: `--step --click "Add to Label"`
(Tool: no control is named "Add to Label"; I will point at the + instead.)

## Step 14
Command: `--step --click-at 1419,332`
Saw (14.png): a "Label" popup: "Find an attribute", Attributes: id; Connections: Connections, Connections rank, percentile, in degree, out degree. A row "Pick an attribute" appeared under Label.
Dev: "Wait, there's no 'name' or 'Label' column. Just 'id'. My CSV only had source, target, weight, so the names must be the id? I'll try id and see if names show up."

## Step 15
Command: `--step --click "id"`
Saw (15.png): names appeared above the dots! Omar, Pia, Quinn, Ravi, Sam (cut by an arrow), Theo, Nora, Milo, Lena, Kofi, Jada, Ivan, Hana, Ava (the big one), Gus, Ben, Dev, Chloe... Label row: "Aa Above | Abc id", and small text "20 labels, 1 hidden to avoid overlap". Bottom-left by Dev there's a squashed "E..." partly behind, and a dot tucked behind Chloe.
Dev: "Ha, there's a Dev in the club. So id WAS the names, good. But it says 1 hidden to avoid overlap -- the task says EVERYONE's name. The one by Dev at the bottom left looks squished. Maybe I can click that little '1 hidden' text to show it?"

## Step 16
Command: `--step --click-at 1287,387`
Saw (16.png): nothing changed; the note is just text.
Dev: "Not clickable. Maybe the 'Aa Above' bit has label settings, like font size or 'show all'. Second try."

## Step 17
Command: `--step --click-at 1243,362`
Saw (17.png): nothing again. Two misses.
Dev: "Okay, two wrong tries. What does 'hidden to avoid overlap' even want me to do? Let me hover the 'Aa' icon once in case it explains."

## Step 18
Command: `--step --hover-at 1220,362`
Saw: tooltip "Label position".
Dev: "Oh it IS a button, I just missed it. Label position -- maybe putting it somewhere else unhides it. Clicking it."

## Step 19
Command: `--step --click "Label position"`
Saw (19.png): a "Label position" popup with a 3x3 grid of dots, the top-middle one highlighted (Above). Nothing about showing hidden labels.
Dev: "That's just where the name sits. It won't unhide anything. I've tried enough -- 19 of 20 names show and the picture looks right. I'll call labels done-ish and move on to export. Closing this."

PART 4 (names on the drawing): MOSTLY DONE -- 20 labels on, but the app says 1 is hidden to avoid overlap (bottom-left, next to Dev); I could not find a way to show it.

## Step 20
Command: `--step --key Escape`
Dev: "Now export, like Gephi's Preview > Export. No Export button visible, so it's probably in the three-line menu at the top left."

## Step 21
Command: `--step --click-at 23,20`
Saw (21.png): the menu: Back to start, New project, Open project or file..., Open sample, Save, Save as..., Save local copy..., Export... (Ctrl+E), Rename, Settings..., Keyboard shortcuts, Help.
Dev: "There it is, Export."

## Step 22
Command: `--step --click "Export..."`
Saw (22.png): an Export dialog. Left: Image / Data. Image: "A picture of the drawing, 2x, PNG". Preset "To share -- PNG, 2x", View "Current view", Size 1x/2x/4x/400x300, Format PNG/JPEG/WebP, Background Canvas color/Transparent. A preview: the drawing on white with what looks like the little key box in the top-left corner (tiny). Buttons Cancel, Copy, Export. "Saved to this computer only; nothing is uploaded."
Dev: "The preview has the key in the corner, I think -- it's really small but it's there. PNG is what I paste into Word. Export."

## Step 23
Command: `--step --click "Export"`
Tool output: a file was saved: friends_current-view.png, 1806 x 1720 (downloads/friends_current-view.png). (The tool noted "Export" matched both the button and the dialog; it took the button.)
Saw (23.png): dialog closed, toast "Exported friends_current-view.png".
Opened the PNG (as I would before pasting into Word): the whole network on a light gray background, names above the dots, and a white key box top-left: "Size: Connections 3 [wedge] 6" and "Color: Connections 3 [orange-to-dark-brown bar] 6". Ava is the biggest, darkest dot; Ivan next. At the bottom left, a small dot is tucked behind Dev with only an "E" of its name peeking out, and a second dot sits behind Chloe -- so not every name is readable in the picture.
Dev: "Oh nice, that's it -- it has the key in it, it looks like the slides. Part 5 done."

PART 5 (picture file with its key): DONE -- downloads/friends_current-view.png.

## End
Command: `node tool/real.mjs --end rounds/round-2/sessions/r2-s09`

## Debrief (in character, Dev)

Did I finish? Mostly yes. The drawing is on screen, the program worked out who matters (Degree, which it calls "Connections"), the dots are bigger and darker for people with more connections, names are on the drawing, and I have a PNG with the key in it. The one thing I did not finish is "everyone's name": the app itself told me "20 labels, 1 hidden to avoid overlap", and in the picture one person near Dev at the bottom left shows only an "E". I tried clicking that note and the label settings (Label position) and found no way to show it, so I gave up on that one.

What the sizes and colors stand for: both mean the same thing -- Connections, how many people each person is linked to, from 3 (small, light orange) to 6 (big, dark brown). The key says that.

Essay sentence: "Ava is the most central member of the running club, with 6 connections, the most of anyone (range 3 to 6); Ivan is the next most connected."

Ease: 6 out of 7 (1 = very difficult, 7 = very easy). It was way easier than Gephi -- no import wizard, it just drew it.

What confused me / where I hesitated:
- At the start: "Open project or file" vs "New from data" -- I wasn't sure which one is "import spreadsheet". Open worked.
- It said the network is "Directed". A "who knows whom" list should be undirected, and the tutorial says to pick Undirected, but I never saw where to change it. I left it.
- Running Degree COLORED the dots but did not size them. The task asked for bigger dots, and there is no "Size" row -- Size was hidden under the "+" next to "Shape", and then it was a plain number "1" until I found the tiny chain-link icon ("Size by attribute"). I only found that by hovering.
- The analysis is called "Degree" in the list but "Connections" everywhere after, so I had to guess they're the same.
- Labels: there's no "name" column, only "id"; I guessed id was the names (it was). Then "1 hidden to avoid overlap" with no way to show it -- the task wanted everyone's name.
- The "Aa" label icon didn't look like a button; my first click near it did nothing.
- The key in the export preview is very small; I wasn't sure it was there until I opened the file.
- I did not try Betweenness or PageRank ("Start here"), so "who matters" is only by connections.
