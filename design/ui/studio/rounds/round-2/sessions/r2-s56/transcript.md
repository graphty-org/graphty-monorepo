# Session r2-s56 -- Dev (class-project student), task T16 "First look"

Start: `node tool/real.mjs --start rounds/round-2/sessions/r2-s56 empty` -> 01.png

## Step 1 (01.png)

Seen: a dark start screen. "Start" with "Open project or file..." and "New from data...", "Recent projects" (empty), and "Samples": Les Miserables, Zachary's karate club, College football, Florentine families, each with a line about what it is good for. A box at the bottom asks to share usage data.
Thinking (Dev): "Okay, I read everything. There are samples, nice -- I always try the sample first to see what done looks like. Karate club says 'good for finding who connects the club and which members group together' -- that's literally my assignment. But first, the usage data box, I'll say No thanks."
Next: click "No thanks".
Command: `--step --click "No thanks"` -> 02.png. The usage box went away; the rest is unchanged.

## Step 2 (02.png)

Thinking (Dev): "Now the sample. Karate club sounds like my assignment (who connects, which groups)."
Command: `--step --click "Zachary's karate club"`
-> 03.png.

## Step 3 (03.png)

Seen: a drawing right away -- 34 blue balls joined by gray lines, no names on them. Left panel: "Find nodes, edges, values", "Selection", "Everything", and at the bottom "Analyze [flask] in the toolbar (Shift+A) to add results here". Right panel: Graph, "From Zachary's karate club", tabs Style / Values, Overview: Nodes 34, Edges 78, Density 0.139, Components 1, "Edges per ..." 1 to 17, mean 4.588. One line is cut off at the right edge: "Undirected, from the file: the GML def..." -- I can't read the end of it.
Thinking (Dev): "Oh nice, a drawing in like two clicks. It already looks laid out, so I don't need the 'layout' step? No names on the balls though -- labels are the thing everyone gets stuck on. First, where are the statistics? The hint at the bottom left says Analyze is the flask in the toolbar. That's my 'statistics' word, I think."
Hesitation: the cut-off "Undirected, from the file..." line; "Edges per ..." is truncated too (I guess it means edges per node = degree?).
Next: click the flask in the bottom toolbar.
Command: `--step --click-at 679,864`
-> 04.png ("at 679,864: button Analyze").

## Step 4 (04.png)

Seen: a menu "Filter analyses", heading "Rank nodes and edges": Degree, Betweenness, Edge betweenness, Closeness, PageRank (with a blue "Start here" tag), Eigenvector, Katz, HITS, All-pairs distance, Depth-first order (gray, "Select a node first"), Most flow... Each has a one-line explanation.
Thinking (Dev): "Okay these are the statistics! There's Degree and Betweenness, the two my slides use. It says 'Start here' on PageRank, which is a little tempting, but the tutorial says size by degree first. I'll do Degree. I'll look for Modularity later -- I don't see it yet, maybe further down."
Next: click "Degree".
Command: `--step --click "Degree"`
-> 05.png.

## Step 5 (05.png)

Seen: the menu shrank to a small card: "Degree -- How many edges each node has. Under a second" and a blue "Run" button.
Thinking (Dev): "Okay, it wants me to confirm. Run."
Command: `--step --click "Run"`
-> 06.png.

## Step 6 (06.png)

Seen: every ball turned orange, with a few very dark brown ones (two in the top cluster, one on the left). A legend top-left: "Color: Connections, 1 ... 17". The left panel now lists "Connections 34" with an orange bar.
Thinking (Dev): "Wait, it said Degree but now it's called 'Connections' -- I guess that's the same thing? It colored instead of sizing, but okay, dark = more connections, I can see the hubs. But who ARE they? There are still no names. Let me click Connections on the left, maybe it gives me a list, like the data laboratory."
Hesitation: Degree became "Connections"; I was looking for size, got color.
Command: `--step --click "Connections"`
-> 07.png.

## Step 7 (07.png)

Seen: "Connections" is highlighted on the left with an eye icon. The right panel switched to "Connections -- Measure from Connections, Oct 7", Style tab: Nodes / Edges, Fill, Color = "Connecti..." (orange), and Shape, Effects, Label, Tooltip each with a "+".
Thinking (Dev): "Okay so this is like the appearance panel. There's 'Label +' -- that's where names go, I'll do that in a second. But first I want the ranking, who has the most. There's a Values tab next to Style, I'll try that."
Command: `--step --click "Values"`
-> 08.png.

## Step 8 (08.png)

Seen: Values tab: a little histogram (1 to 17, "34 of 34 have a value, 1 to 17, median 3"), then "Top 10": 34 -> 17, 1 -> 16, 33 -> 12, 3 -> 10, 2 -> 9, 32 -> 6, 4 -> 6, 14 -> 5, 24 -> 5, 9 -> 5. "Made with: Analysis Degree, Ran Oct 7".
Thinking (Dev): "Oh nice, that's the ranking! The members are just numbers in this sample, so 34 and 1 are the big ones. And 'Made with Degree' answers my question that Connections = Degree. Essay sentence: 'Member 34 has the most ties (17), followed closely by member 1 (16); the median member has only 3.' Part one done. Now the groups -- the tutorial calls it Modularity. Back to the flask and I'll type it in the filter."
Command: `--step --click "Analyze" --type "modularity"`
-> 09.png.

## Step 9 (09.png)

Seen: typing "modularity" in "Filter analyses" shows "Find groups": Louvain ("Start here", "Which nodes form densely linked groups.") and Leiden.
Thinking (Dev): "It understood 'modularity' even though it's called Louvain here -- phew. 'Find groups' is what I want. Louvain says Start here, I'll take it."
Command: `--step --click "Louvain" --click "Run"`
-> 10.png.

## Step 10 (10.png)

Seen: the balls are now in four colors. Left panel: "Communities 4" with Group 1 (12), Group 2 (11), Group 3 (6), Group 4 (5), then Connections 34. Legend shows both "Color: Communities" (Groups 1-4) and "Color: Connections 1..17" -- but the balls only show the group colors now, the dark/light orange is gone.
Thinking (Dev): "Oh nice, that looks like the slides -- groups in colors. Essay: 'The club splits into four groups of 12, 11, 6 and 5 members.' But now I lost the degree, because both want to be color. In the tutorial degree is SIZE. Let me go to Connections and look at Style for a size option."
Hesitation: the legend still lists Connections as a color, though no ball shows it any more.
Command: `--step --click "Connections" --click "Style"`
-> 11.png (tool note: "Connections" was ambiguous, took the tree item -- that is what I meant).

## Step 11 (11.png)

Seen: Connections Style: Fill, Color = Connecti..., Shape +, Effects +, Label +, Tooltip +. No word "Size" anywhere.
Thinking (Dev): "Where's size? Not listed. Maybe size is under Shape? I'll click the + next to Shape."
Hesitation: looking for "Size" (tutorial word), not on screen.
Command: `--step --click-at 1419,234`
-> 12.png ("button Add to Shape").

## Step 12 (12.png)

Seen: a little menu: "Size", "Shape".
Thinking (Dev): "There it is, Size was hiding under Shape. Click Size."
Command: `--step --click "Size"`
-> 13.png.

## Step 13 (13.png)

Seen: a new row "Size [1] (chain-link icon) (-)". Nothing changed in the picture; all balls look the same size as before.
Thinking (Dev): "Hmm, it's a single number, 1. That would make them all the same size, not 'proportional to degree'. The little chain-link icon next to it -- maybe that links it to the data? Let me hover it first so I don't break anything."
Hesitation: expected size to follow Connections automatically since I added it inside the Connections layer.
Command: `--step --hover-at 1381,264`
-> 14.png. Tooltip: "Size by attribute".

## Step 14 (14.png)

Thinking (Dev): "'Size by attribute' -- 'attribute' is a Gephi-ish word, that's what I want. Click it."
Command: `--step --click-at 1381,264`
-> 15.png.

## Step 15 (15.png)

Seen: a popup "Size by attribute" with "Find an attribute", "Attributes: id", then "Connections": Connections, Connections rank, Connections percentile, Connections in degree, Connections out degree, and a "Communities" heading below.
Thinking (Dev): "Okay, plain 'Connections'. (Not sure why there's in/out degree when the overview said undirected, but whatever.)"
Command: `--step --click-at 1204,436` (the "Connections" option in the popup)
-> 16.png.

## Step 16 (16.png)

Seen: now the big hubs are BIG: a huge blue ball top-middle, a big blue one next to it, big yellow ones on the left. Colors are still the groups. Size row says "1 to 3". Legend adds "Size: Connections 1..17".
Thinking (Dev): "OH nice, that's it! That's the slide picture -- big = many connections, color = group. Now labels, so the instructor knows who the big ones are. 'Label +'."
Command: `--step --click-at 1419,332`
-> 17.png ("button Add label line").

## Step 17 (17.png)

Seen: a "Label" popup with "Find an attribute": Attributes: id; Connections: Connections, rank, percentile, in degree, out degree; Communities...
Thinking (Dev): "The members only have an 'id' in this sample (the numbers), so id is the name. Click id."
Command: `--step --click-at 1106,470`
-> 18.png.

## Step 18 (18.png)

Seen: every ball has its number above it now; the big ones have bigger text (34, 33, 1, 3, 2). Panel: "Label: Above, Abc id" and "34 labels, 0 hidden to avoid overlap".
Thinking (Dev): "YES. Names on everything, and it even tells me none got hidden -- in Gephi that's where I'd be stuck. Figure basically done. Tutorial next says Betweenness, for the 'connectors'. Flask, Betweenness, Run."
Command: `--step --click "Analyze" --click "Betweenness" --click "Run"`
-> 19.png.

## Step 19 (19.png)

Seen: everything went orange again -- my group colors are gone. Top of the left list: "Bridges 34". Legend: "Color: Bridges 0 ... 231.1" on top. Sizes and labels stayed. Node 1 is the darkest, then 34.
Thinking (Dev): "Wait -- I asked for Betweenness and it's called 'Bridges'. Okay, 'connectors', makes sense. But it painted over my groups! Did I break the figure? I'll first read the ranking (click Bridges, then Values), then figure out how to get the groups back -- I saw an eye icon earlier, maybe that hides it."
Hesitation: new analysis silently replaced the group coloring.
Command: `--step --click "Bridges" --click "Values"`
-> 20.png.

## Step 20 (20.png)

Seen: Bridges Values: histogram 0 to 231.1, median 1.167; Top 10: 1 -> 231.1, 34 -> 160.6, 33 -> 76.69, 3 -> 75.85, 32 -> 73.01, 9 -> 29.53, 2 -> 28.48, 14, 20, 6. "Made with: Analysis Betweenness".
Thinking (Dev): "Okay so Bridges = Betweenness, confirmed by 'Made with'. Essay: 'Member 1 is by far the strongest connector (betweenness 231.1), ahead of member 34 (160.6); most members are near zero.' Interesting that 1 beats 34 here but not on connections. I don't know what the units of 231.1 are, but the slides didn't explain either. Now I want my group colors back. The eye icon was at the right end of the selected row earlier -- I'll click there on Bridges to hide its color."
Command: `--step --click-at 276,156`
-> 21.png ("button Hide Bridges").

## Step 21 (21.png)

Seen: group colors are back, sizes and labels kept. The Bridges row shows a crossed-out eye; its legend entry is gone. (The legend still says "Color: Connections 1..17" though no ball is colored that way -- odd.)
Thinking (Dev): "Phew, nothing lost, and the numbers are still there. This is the figure I want. Last tutorial step: export. No 'Preview' button; I'll try the menu (three lines) top left."
Command: `--step --click-at 23,20`
-> 22.png ("button Main menu").

## Step 22 (22.png)

Seen: menu: Back to start, New project, Open project or file..., Open sample, Save, Save as..., Save local copy..., Export... (Ctrl+E), Rename, Settings..., Keyboard shortcuts, Help.
Thinking (Dev): "Export... there it is. Click."
Command: `--step --click "Export..."`
-> 23.png.

## Step 23 (23.png)

Seen: an "Export" dialog: Image / Data on the left; "Image -- A picture of the drawing, 2x, PNG"; Preset "To share -- PNG, 2x"; View "Current view"; Size 1x/2x/4x/400 x 300; Format PNG/JPEG/WebP; Background Canvas color/Transparent; a small preview with the legend in the corner. Footer: "Saved to this computer only; nothing is uploaded." Cancel / Copy / Export.
Thinking (Dev): "This is way simpler than Gephi's Preview. The thumbnail is tiny, I can't tell if the number labels are in it, but the colors and sizes are. Export."
Command: `--step --click "Export"`
-> 24.png. Tool: `a file was saved: zachary-s-karate-club_current-view.png, 1806 x 1720 (downloads/...)`.

## Step 24 (downloads/zachary-s-karate-club_current-view.png)

Seen (opened the saved PNG): the figure matches the screen -- group colors, big hubs, number labels, light gray background, a legend top-left: "Color: Communities, Group 1-4", "Size: Connections 1..17", and "Color: Connections 1..17" with an orange-to-brown bar.
Thinking (Dev): "Oh nice, it's sharp and it looks like the screen -- that was the thing the library lab couldn't get to work. But wait, why is there an orange 'Color: Connections' bar in the legend when no ball is orange? My instructor will ask what orange means. I'd have to crop that off or figure out how to remove it. Small thing, but it's in my figure."
Problem noted: the legend keeps a "Color: Connections" entry that nothing on the drawing uses (the group colors win), so the exported figure has a misleading legend row.

Thinking (Dev): "Okay, the sample worked great. The real question for my class is whether MY spreadsheet goes in. friends.csv is the same shape as my class file (a list of who knows whom). Menu -> Open project or file..."
Command: `--step --click "Main menu" --click "Open project or file..." --upload friends.csv`
-> 25.png. Tool: "a file chooser is open", "chose the file friends.csv".

## Step 25 (25.png)

Seen: a toast "Added friends.csv to this project". The drawing now has BOTH networks: the karate club (colored, labeled, big hubs) at the bottom, and a new ring of small blue unlabeled dots above it, tangled into the karate club near node 27. The window title still says "Zachary's karate club", but the left panel header now says "Graph friends.csv". Left list still shows Bridges 34, Communities 4, Connections 34 -- the old numbers.
Thinking (Dev): "Wait, wait. I didn't want to ADD it, I wanted to open it instead of the sample. Now my running club is glued onto the karate club?? Are they one network now? This is exactly the 'did the import work' panic. The menu said 'Open', not 'Add'. There's an undo arrow next to the title -- this app has undo, thank god. Let me undo."
Hesitation / problem: "Open project or file..." from inside a project merged the file into the current project instead of opening it on its own, and the drawing mixes both datasets.
Command: `--step --click-at 205,20`
-> 26.png ("button Undo").

## Step 26 (26.png)

Seen: the friends dots are gone; only the karate club is left, with colors, sizes, labels and my analyses all intact. It is drawn much smaller now (zoomed out), in the middle. Tooltip "Undo Ctrl+Z". The redo arrow is now active.
Thinking (Dev): "Phew, undo actually works -- that's a big deal for me. Okay, I want the running club on its own. 'Back to start' in the menu showed the start page with 'New from data...' -- that sounds like 'import a spreadsheet'. Does going back lose my karate work? It's just the sample, I don't care."
Command: `--step --click "Main menu" --click "Back to start"`
-> 27.png.

## Step 27 (27.png)

Seen: "Discard unsaved changes? Zachary's karate club has changes that are not saved. They are lost if you continue." Cancel / Discard (red).
Thinking (Dev): "Good that it warns me -- in a real assignment I'd save first. This is just the sample and I already have the PNG, so Discard."
Command: `--step --click "Discard"`
-> 28.png (back on the start page, as before).

## Step 28 (28.png)

Thinking (Dev): "Start page again. 'New from data...' -- that's my 'import spreadsheet'."
Command: `--step --click "New from data..."`
-> 29.png.

## Step 29 (29.png)

Seen: a mostly empty dark page, "Untitled", heading "Open as a new graph". "Tables +", "Drop a file here, or choose a file...", "Direction: As the file says", "Choose a file first", Cancel, Load (gray).
Thinking (Dev): "Okay, this looks like the Gephi import wizard but emptier. The Grinnell tutorial says pick Undirected -- 'As the file says' is fine for now, I'll check after. Choose a file..."
Command: `--step --click "choose a file..." --upload friends.csv`
-> 30.png. Tool: "chose the file friends.csv".

## Step 30 (30.png)

Seen: "Edges: friends.csv, 41 rows" with a green check. "node (20) --friends (41)--> node". "Each row is: a node / an edge" (edge chosen), "CSV auto". Columns: source = "From -> node" (text), target = "To -> node" (text), weight = "Weight" (whole number). A preview table: Ava-Ben 3, Ava-Chloe 5, Ava-Dev 2, Ben-Chloe 4, Ben-Eli 1, Chloe-Dev 3... Footer: "0 node rows and 41 edge rows read; the load makes 20 nodes and 41 edges." Direction: "As the file says". Cancel / Load.
Thinking (Dev): "Oh nice, it guessed everything the tutorial warns about: comma, edges table, and weight is a NUMBER, not text. 20 people, 41 rows -- I can check that against the spreadsheet. The arrow '-->' worries me a bit: the tutorial says pick Undirected, and 'As the file says' -- a CSV doesn't say anything. Who knows whom goes both ways. Let me open Direction."
Command: `--step --click "Direction"`
-> 31.png.

## Step 31 (31.png)

Seen: options "As the file says" (checked), "Directed", "Undirected".
Thinking (Dev): "Undirected, like the Grinnell tutorial says. Then Load."
Command: `--step --click "Undirected" --click "Load"`
-> 32.png.

## Step 32 (32.png)

Seen: a new project "friends", 20 blue balls in a ring-like shape, no names. Overview: Nodes 20, Edges 41, "D... Undirected, set in the project", Density 0.2158, Components 1, Edges per node 3 to 6, mean 4.1.
Thinking (Dev): "20 and 41 -- matches the import screen, so nothing got lost. And it says Undirected, like I chose. Import done, a drawing right away. Last thing I want to know before deciding: can I get the people's NAMES on my own data, since the sample only had numbers. I'll click 'Everything' and look for Label there."
Command: `--step --click "Everything"`
-> 33.png.

## Step 33 (33.png)

Seen: "Everything" Style: Fill Color 6366F1 100%, Shape Size 1, Shape Icosphere, Effects +, Label +, Tooltip +.
Thinking (Dev): "Same panel as before. Label +, then pick the name."
Command: `--step --click-at 1419,362`
-> 34.png ("button Add label line").

## Step 34 (34.png)

Seen: Label popup, only "id" under Attributes.
Thinking (Dev): "Only 'id'. There's no 'name' column in my file -- the names ARE the source/target. I hope id = the name. Try it."
Command: `--step --click-at 1106,500`
-> 35.png ("option id").

## Step 35 (35.png)

Seen: names on the runners: Omar, Pia, Quinn, Ravi, Nora, Milo, Lena, Kofi, Sana, Theo, Jada, Ivan, Ava, Gus, Hana, Ben, Dev, Eli, Chloe. Panel: "20 labels, 1 hidden to avoid overlap". One ball tucked right behind Chloe (bottom) has no name.
Thinking (Dev): "Oh nice -- id IS the name, and it put names on my own data in two clicks. It even admits one label is hidden (the one squashed behind Chloe); for a figure I'd want to know who that is, I guess I'd drag it out. Ha, there's a 'Dev' in the running club. Okay, I've seen enough to decide."

Command: `node tool/real.mjs --end rounds/round-2/sessions/r2-s56`

## End of session -- in character (Dev)

**Did I finish?** Yes. There was no fixed goal; I wanted to know if this could do my class project. On the karate club sample I got, in order: a drawing (immediately, no layout step needed), Degree (shown as "Connections"), groups (Louvain, found by typing "modularity"), Betweenness (shown as "Bridges") with a Top 10 list, size by connections + color by group + number labels, and an exported PNG that looks like the screen. Then I imported friends.csv as its own graph (20 people, 41 ties, undirected) and put names on it.

**Would I keep using it?** Yes, for the assignment. It does the tutorial steps faster than what the class uses, it has a real Undo, it tells me how many labels it hid, and the export matches the screen. The Top 10 lists give me the numbers for my essay sentences:

- "Member 34 has the most ties (17), closely followed by member 1 (16); the median member has 3."
- "The club splits into four groups of 12, 11, 6 and 5 members."
- "Member 1 is the strongest connector (betweenness 231.1), ahead of member 34 (160.6)."
  The one worry is my instructor teaches the other tool, so if I get stuck I'm on my own.

**How easy, 1 (very difficult) to 7 (very easy):** 6.

**What confused me:**

1. Opening friends.csv from the menu while the sample was open ADDED it to the karate club -- two networks glued into one drawing, under the karate club's title. The menu said "Open project or file...", so I expected it to open on its own. Undo saved me; I had to go Back to start -> New from data to get it by itself.
2. The exported figure's legend has a "Color: Connections" orange bar even though no ball is orange (the group colors won). My instructor would ask what orange means.
3. Each new analysis takes over the color: Betweenness repainted my group colors orange without asking. I found the eye icon to hide it, but for a second I thought I'd wrecked the figure.
4. Different words than the tutorial: Degree -> "Connections", Betweenness -> "Bridges", Modularity -> "Louvain"/"Find groups". The "Made with: Analysis ..." line and the filter that understood "modularity" saved me, but I had to check each time.
5. "Size" is hidden under the "+" next to "Shape", and adding it gives a fixed "1" -- I had to find the small chain-link "Size by attribute" icon to make it follow connections.
6. Small: a line in the overview was cut off ("Undirected, from the file: the GML def..."), "Edges per ..." was truncated, and the size picker offered "in degree" / "out degree" for an undirected graph. On my own data, one label was hidden behind another node with no easy way to see whose.
