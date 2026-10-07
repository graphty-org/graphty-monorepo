# Session r2-s03 -- Ruth (data journalist), task T15 prompt A (Les Miserables)

Tool: design/ui/studio/tool/real.mjs. Session folder: rounds/round-2/sessions/r2-s03.

## Step 1 -- start

Command: `node tool/real.mjs --start rounds/round-2/sessions/r2-s03 empty` -> 01.png

Saw: a start page. Left: "Open project or file...", "New from data...", a line "Files are read on
this computer and never uploaded." Right: Samples, with "Les Miserables -- 77 characters". Bottom:
a box asking me to share usage data. Top right: "Local only".

Ruth: "Local only, files never uploaded. Good. I'm not sharing usage data -- No thanks first, then
the Les Miserables sample. 77 characters; I'll write that down and check it after it loads."

## Step 2 -- decline usage data

Command: `--step --click "No thanks"` -> 02.png

Saw: the box is gone; a footer says "Usage data stays off. Change this in Settings > Privacy."

Ruth: "Good, it says plainly it stays off. Now the sample: Les Miserables."

## Step 3 -- open the sample

Command: `--step --click "Les Miserables"` -> 03.png

Saw: a drawing of blue dots and gray lines, all the same size and color, no names. Right panel
"Graph -- From Les Miserables", Values tab, Overview: Nodes 77, Edges 254, "Undirected, from the
file: directed 0", Density 0.08681, Components 1, "Edges per ... 1 to 36, mean 6.597". Bottom left:
"Analyze (flask icon) in the toolbar (Shift+A) to add results here." Bottom toolbar: flask, a chart
icon, "3D", a magnifier. Search box top left: "Find nodes, edges, values".

Ruth: "77 nodes -- matches the 77 characters the card promised. 254 ties. 'Undirected, from the file:
directed 0' -- I read that as the file had zero one-way ties, so nothing was turned around. Clumsy
words but fine. First, habit: I look up a name. Valjean."

Part 1 (get it on screen): done -- 77 of 77 arrived.

## Step 4 -- search for a name (missed)

Command: `--step --click "Find nodes, edges, values" --type "Valjean"` -> 04.png

Tool said: nothing on screen is called "Find nodes, edges, values"; typed nothing. (The visible
placeholder text is not the box's name to the tool -- possibly a missing label on the search box.)
Screen unchanged.

Ruth: "I'll just click into the box itself."

## Step 5 -- search for Valjean

Command: `--step --click-at 176,90 --type "Valjean"` -> 05.png (tool: combobox "Find")

Saw: the list shows "Elements: Valjean" and "Values: Select where name is Valjean (1)". Drawing
unchanged, nothing marked yet.

Ruth: "He's in there. Good enough. Now the real job: have it work out who matters. The hint says
Analyze is the flask in the toolbar. I'll click that."

## Step 6 -- open Analyze

Command: `--step --click "Analyze"` -> 06.png

Saw: a list "Rank nodes and edges", each with one plain line: Degree "How many edges each node has";
Betweenness "Which nodes sit on the most shortest paths between others"; Closeness; PageRank
(tagged "Start here") "Which nodes are connected to other well-connected nodes"; Eigenvector; Katz;
HITS; All-pairs distance; Depth-first order (grayed, "Select a node first"); Most flow...

Ruth (reading each aloud): "PageRank says 'Start here', but 'connected to other well-connected
nodes' is a number I'd have to explain twice to an editor. 'Matters most' in a story means 'in the
most scenes with the most people'. Degree: 'How many edges each node has' -- a count. I can check a
count by hand. The words that decided it: 'how many'. Degree."

Hesitation: briefly tempted by "Start here" on PageRank.

## Step 7 -- choose Degree

Command: `--step --click "Degree"` -> 07.png

Saw: a small panel "Degree -- How many edges each node has. Under a second. [Run]".

Ruth: "It tells me the cost before it runs. Run."

## Step 8 -- run Degree

Command: `--step --click "Run"` -> 08.png

Saw: every dot turned orange, darker for some. A key top-left of the drawing: "Color: Connections,
1 [orange bar] 36". Left list gained a row "Connections 77" with an orange swatch. Sizes unchanged.

Ruth: "Counted over what? 77 -- every character got a number, and 1 to 36 matches 'Edges per ...
1 to 36' in the overview, so the number is the count of ties. Good, I can trace that. But the shades
are hard to tell apart; dark brown is the most connected. Part 2 (work out who matters): done.
Now bigger dots. I'll click the Connections row to see what I can do with it."

## Step 9 -- select the Connections result

Command: `--step --click "Connections"` -> 09.png

Saw: right panel now "Connections -- Measure from Connections, Oct 6", Style tab, Nodes/Edges.
Rows: Fill (+), Color "Connecti..." (-), Shape (+), Effects (+), Label (+), Tooltip (+). No row says
"Size".

Ruth: "There's no 'Size'. Size of a dot is its shape, I suppose. I'll press the plus by Shape."
Hesitation: no word "size" anywhere; guessing.

## Step 10 -- plus by Shape

Command: `--step --click-at 1419,234` -> 10.png (tool: button "Add to Shape")

Saw: a small menu: "Size", "Shape".

Ruth: "There it is, Size. Click."

## Step 11 -- add Size

Command: `--step --click "Size"` -> 11.png

Saw: a row "Size [1] (chain-link icon) (-)". Dots unchanged -- all the same size. A fixed number
1 would make every dot the same. The Color row shows "Connecti..." instead of a number, so it
follows the Connections count. The chain-link icon next to Size probably ties it to a value.

Ruth: "A box with '1' isn't 'bigger for the ones that matter'. What does the chain icon do? I'll
hover it before I press anything."

## Step 12 -- hover the chain icon

Command: `--step --hover-at 1380,264` -> 12.png. Tooltip: "Size by attribute".

Ruth: "'Attribute' -- a column, I take it. That's what I want: size by the Connections number. Click."

## Step 13 -- Size by attribute

Command: `--step --click-at 1380,264` -> 13.png

Saw: a picker "Size by attribute", search "Find an attribute", group "Connections": Connections,
Connections rank, Connections percentile, Connections in degree, Connections out degree. Then
"Cannot be used: Holds groups, not amounts" -- id, name (grayed).

Ruth: "In degree and out degree? The overview said this network has no direction. Why offer them?
Says who? I'll ignore those. Plain 'Connections' -- the same count the color uses, so the size and
color will tell the same story."
Hesitation: in/out degree offered on an undirected network made me doubt what plain
"Connections" counts.

## Step 14 -- size by Connections

Command: `--step --click "Connections#2"` -> 14.png

Saw: dots now vary in size; one big dark dot in the middle (most ties), many small ones on the
edges. The key now has two rows: "Size: Connections 1 [wedge] 36" and "Color: Connections 1 [orange
bar] 36". The Size box reads "1 to 3".

Ruth: "Now the big dark one in the middle is obviously the one with the most ties. Size and color
both stand for the same thing: the number of ties each character has, 1 to 36. Part 3 (bigger dots):
done. '1 to 3' in the box is the dot size, not the count, I assume -- the key says 1 to 36, so fine.
Names next: the plus by Label."

## Step 15 -- add a label line

Command: `--step --click-at 1419,332` -> 15.png (tool: button "Add label line")

Saw: a picker "Label" with Attributes: id, name; Connections: Connections, rank, percentile, in
degree, out degree.

Ruth: "'name' -- the characters' names. Click."

## Step 16 -- label by name

Command: `--step --click "name"` -> 16.png

Saw: names written above the dots, small serif text (Valjean on the big dot, Myriel, Fantine,
Napoleon, Cosette...). A line under the Label row: "77 labels, 6 hidden to avoid overlap". Key still
top-left; part of the key box covers names near the top (Blacheville is half under it).

Ruth: "Six hidden -- which six? It tells me how many, which is honest, but I can't tell who without
hunting. The text is tiny; an editor would squint. The key box also sits on top of a couple of
names. Still, 'names written on the drawing': done, with 6 of 77 held back. Now the picture file
with its key. No 'Export' in sight; I'll try the menu at the top left."
Hesitation: no visible export control.

## Step 17 -- main menu

Command: `--step --click-at 23,20` -> 17.png (tool: button "Main menu")

Saw: Back to start, New project, Open project or file..., Open sample, Save, Save as..., Save local
copy..., Export... (Ctrl+E), Rename, Settings..., Keyboard shortcuts, Help.

Ruth: "Export. There."

## Step 18 -- Export dialog

Command: `--step --click "Export..."` -> 18.png

Saw: an Export dialog. Left: Image, Data. "Image -- A picture of the drawing, 2x, PNG." Preset "To
share -- PNG, 2x", View "Current view", Size 1x/2x/4x/400x300, Format PNG/JPEG/WebP, Background
Canvas color/Transparent. A preview: the drawing with a tiny key in its top-left corner. Footer:
"Saved to this computer only; nothing is uploaded." Buttons Cancel, Copy, Export.

Ruth: "The preview has the key in the corner -- small, but it's there. No switch for the key that I
can see, so I'll trust the preview and open the file to check. PNG, 2x is fine for a document. No
vector option, which my class recommended for print -- noted. Export."

## Step 19 -- Export (missed)

Command: `--step --click "Export#2"` -> 19.png. Nothing changed and no file was saved; the name
"Export" matched something other than the blue button (likely the dialog title). Not a participant
error the app caused -- a tool naming miss.

Ruth: "Nothing happened. I'll press the blue Export button itself."

## Step 20 -- Export

Command: `--step --click-at 1057,746` -> 20.png. Tool: a file was saved:
les-miserables_current-view.png, 1806 x 1720 (downloads/les-miserables_current-view.png). Toast on
screen: "Exported les-miserables_current-view.png".

Opened the file and compared it with the screen. The file holds the same drawing as the screen.
The key sits top-left in a white box, larger and easier to read than on screen: "Size: Connections
1 [wedge] 36" and "Color: Connections 1 [orange-to-dark bar] 36". In the file the key does not cover
any names (on screen it covered Blacheville). The names are there but small and soft. Some, like
"Valjean" over the biggest dot, are hard to read because the text sits on the dark dot. A few dots
have no name, presumably the 6 hidden to avoid overlap.

Ruth: "Picture and key agree with the screen. Part 4 (picture file with its key): done. I could
paste this into a document, though I'd want bigger names for print."

Command: `node tool/real.mjs --end rounds/round-2/sessions/r2-s03`

## End -- in character

**Did I finish?** Yes, all four parts:
1. On screen: 77 nodes, 254 edges -- the 77 characters the sample card promised.
2. Who matters: Degree ("How many edges each node has"), shown as "Connections", 1 to 36 for all 77.
3. Bigger dots: Style > Shape > Size, then "Size by attribute" > Connections.
4. Names: Label > name (77 labels, 6 hidden to avoid overlap). Picture: Menu > Export... >
   PNG 2x, key included.

**What the sizes and colors stand for:** Both show the same thing, the number of ties
("Connections") each character has, from 1 to 36. A bigger dot means more ties, and so does a
darker orange. The biggest, darkest dot is Valjean.

**Ease: 5 of 7.** "Each step was there once I found it, and the Analyze list read like plain
English. Two spots cost me. I had to guess that Size lives under 'Shape'. Then the size box showed
a fixed '1' until I found the small chain-link icon. Export sits only in the menu; nothing on the
screen says 'picture'."

**What confused me:**
- Size is not its own row; it hides behind the plus by "Shape". After adding it, the dots don't
  change until you find the chain-link "Size by attribute" icon. Making dots bigger "for the ones
  that matter" took three clicks of guessing.
- The size picker offers "Connections in degree" and "out degree" on a network the overview calls
  undirected. That made me doubt what plain "Connections" counts.
- "77 labels, 6 hidden to avoid overlap": honest, but it doesn't say which six, and I can't find
  out without hunting.
- On screen, the key box covers names at the top of the drawing. In the exported file it doesn't.
- The overview line "Undirected, from the file: directed 0" took two reads.
- Names are very small and soft on screen and in the PNG. The name on the biggest, darkest dot
  (Valjean) is the hardest to read. There is no vector (SVG/PDF) export for print.
- Small things I liked: "Local only", "nothing is uploaded" on Export, usage data off with one
  click, and Degree's cost ("Under a second") shown before running.

**Tool notes (not app findings unless noted):** `--click "Find nodes, edges, values"` missed. The
search box's accessible name is "Find", not its placeholder; I clicked it by point. `--click
"Export#2"` hit something other than the blue Export button; I clicked it by point.
