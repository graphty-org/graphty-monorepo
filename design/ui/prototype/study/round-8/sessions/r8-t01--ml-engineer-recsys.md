# Session: first sitting with the Les Miserables sample -- Chris, ML engineer (recommendation systems)

Task as given by the moderator: "You have never used this program before. A friend said it turns a
list of connections into a picture that shows who matters and how people cluster. You have no file
of your own today, so you will practice on the ready-made network of characters from the novel Les
Miserables that comes with the program. In one sitting: get that network on screen, have the program
work out something about the characters (for example who matters most, or which of them belong
together), make the drawing show that result in its colors or sizes, get the characters' names
written on the drawing, and finish with a picture file you could paste into a document. Say out loud
when you think each part is done."

All commands were run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t01--ml-engineer-recsys/. Each command replays from the start screen.
Abbreviation used below: `TRY NN` = `timeout 120 node app-b/study.mjs --try $PWD/tmp/round-8-sessions/r8-t01--ml-engineer-recsys/NN.png task:r8-t01`.

## Start screen (shots/tasks/r8-t01/01.png)

"OK. Open, New from data, drop a file. 'Files are read on this computer and never uploaded' -- good,
that's the first thing I'd ask. Normally I'd drag my edge list in here first, but I was told no file
today. Samples on the right, Les Miserables, 77 characters. Fine. There's a big telemetry banner at
the bottom; I'm saying no to that."

## Step 1 -- get the network on screen

`TRY 01 --click "No thanks" --click "Les Miserables"` -> 01.png

"It opened straight away. 77 nodes, drawn, already colored orange-to-brown, legend top left says
'Color: PageRank 0.00330 to 0.0754'. And there's a whole list on the left -- PageRank, Louvain 6
groups, Shortest paths, Density, Link prediction, Watchlist, 'For the report'... Somebody already did
the work. That's a worked example, I guess the card said so. A bit noisy for a first look, but fine.
**Part 1 done: network is on screen.**"

"Honestly, though, if I'm supposed to make it compute something, half of this is already done for
me. I want to run something myself so I know the button exists."

## Step 2 -- have the program work something out

`TRY 02 ... --hover "flask"` -> "nothing on screen is called 'flask'". "The flask icon at the bottom
has no name I can guess. Skip it."

`TRY 03 --click "No thanks" --click "Les Miserables" --click "from Analyze"` -> 03.png

"Clicked the 'from Analyze' link under PageRank. That opened an Analyze picker: search box ('Search,
or say what to find'), Recent runs with their parameters (PageRank damping 0.85, weight value --
nice, it tells me the parameters), then 'Rank nodes and edges': PageRank, Degree, Total value,
Betweenness, Closeness, Eigenvector, each with a one-line definition. That's the kind of tooltip I
actually read. Also the right panel flipped to a graph summary: 77 nodes, 254 edges, undirected,
weighted by value, density 0.0868, 1 component, avg degree 6.60, max 36, and a log-log degree CCDF.
That panel is the best thing I've seen so far -- that's exactly what I check first."

"Who matters most -- PageRank is already done, so I'll do betweenness, the brokers."

`TRY 04 ... --click "Betweenness"` -> ambiguous, it clicked a list row behind the dialog and timed
out. "Two things called Betweenness. Pick the one in the dialog."

`TRY 04 ... --click "Betweenness Which nodes sit on the most"` -> 04.png

"Betweenness form. Weight: value (loaded weight). Higher means: Stronger / Farther / Capacity, each
explained. 'All 254 edges have value set; none is left out.' 'Betweenness reads a weight as
distance: it uses 1/value.' That is exactly the denominator and the weight semantics I'd want.
Footer says 'Under a second'. Run."

`TRY 05 ... --click "Run"` -> 05.png

"A new row 'Betweenness 2' appeared at the top with a spinner and a thin progress bar. Drawing
didn't change, legend still says PageRank. No numbers, just a bar."

`TRY 06 ... --click "Run" --click "Betweenness 2"` -> 06.png

"Clicked the row. Still spinning. Right panel didn't switch to it either -- still the graph
summary. It said under a second."

`TRY 07 ... --click "Run" --click "Fantine" --click "Betweenness 2"` -> "nothing on screen is called
'Fantine'" (I was trying to click a node to let time pass); 07.png still spinning.

"It's stuck. A spinner with no numbers that promised 'under a second' -- in my book that's hung. I'm
not going to sit here. There's an older 'Betweenness' row down in 'For the report' with its eye
crossed out. I'll use that one."

`TRY 08 ... --click "Run" --click "Betweenness"` -> 08.png

"Right panel: Betweenness, 'Covered by PageRank for Color' with a 'Move above' button. 'Paints 77
nodes, none visible.' OK, so these rows are layers and PageRank wins the color. That's actually a
clear explanation. Move above."

`TRY 09 ... --click "Move above"` -> 09.png

"Toast: 'Moved Betweenness above PageRank', with Undo. But the list order looks the same -- it's
still at the bottom under 'For the report' -- and the drawing and legend still say PageRank. Right
panel now says 'Covers PageRank for Color'. So which is it? Oh -- it's still hidden, the eye is
crossed out."

`TRY 10 ... --hover "Show"` -> tooltip "Show Betweenness  Alt-click or Alt+Space: show only this
row". "Good, a keyboard shortcut."

`TRY 11 ... --click "Show Betweenness"` -> 11.png

"Eye is on now. Drawing: still orange-brown, legend still 'Color: PageRank'. The panel claims
Betweenness covers PageRank for color, the drawing says otherwise. I don't believe either of them
now."

`TRY 12 ... --click "PageRank" --click "Hide PageRank"` -> ambiguous, clicked a 'PageRank' link;
12.png. "Weird -- clicking the PageRank link took me to the PageRank row, and the 'Betweenness 2'
row that was spinning is just gone from the list. And PageRank is now hidden, but the nodes are
still PageRank-orange and the legend still says PageRank."

`TRY 13 --click "No thanks" --click "Les Miserables" --click "Hide PageRank"` -> 13.png. "Fresh
start, hide PageRank only. Drawing unchanged. The canvas does not react to anything I do in that
list."

`TRY 14 ... --click "Louvain"` -> clicked a 'Louvain' tab, not useful; did not look further.

"Verdict on part 2 and 3: the program clearly HAS worked out PageRank and Louvain, and the drawing
is colored by PageRank with a legend that gives the range. But the run I started myself never
finished, and nothing I toggled changed the picture. **I'll call parts 2 and 3 done only because
the sample came pre-done -- I didn't make it happen.** If this were my data I'd be stuck here."

## Step 4 -- names on the drawing

"About 13 names are already on the drawing: Valjean, Javert, Fantine, Myriel, Cosette, Marius,
Gavroche, Enjolras, Eponine, Mme.Thenardier, Bossuet, Bahorel, Courfeyrac. Not all 77. There's a
row 'Labels show... 1 node', which doesn't help me. I'll look for a label switch on the
'Everything' row."

`TRY 15 ... --click "Everything"` -> 15.png. "Everything: paints 77 nodes, 254 edges, fill 808080,
faceted sphere, size 1. Sections: Effects, Label, Tooltip, each with a plus."

`TRY 16 ... --click "Label"` -> 16.png, nothing happened. `TRY 17 ... --hover "Add label"` ->
"nothing on screen is called 'Add label'". `TRY 17 ... --hover "Add"` -> it's "Add to Effects",
"Add to Label", "Add to Tooltip". "So the plus is 'Add to Label'."

`TRY 18 ... --click "Add to Label"` -> 18.png, menu: "Label line", "Show labels".

`TRY 19 ... --click "Show labels"` -> 19.png, a 'Show labels' checkbox appeared, unchecked, with a
database icon next to it.

`TRY 20 ... --click "Show labels" --click "Show labels"` -> 20.png. "Checked. Drawing: same 13
names. No count, no message. Did it do anything? It doesn't say which column it uses for the name,
either -- I'm assuming the label column. The database icon is probably 'pick a column', but I'm not
going hunting."

"**Names: partly done** -- some names are on the drawing; I can't tell if the checkbox changed
anything."

## Step 5 -- picture file

`TRY 21 ... --hover "Menu"` -> "Main menu". `TRY 22 ... --click "Main menu"` -> 22.png: New project,
Open recent, Open project or file (Ctrl+O), Save (Ctrl+S), Export... (Ctrl+E), Apply recipe or style
file, Version history, Select where..., Settings, Keyboard shortcuts, Help. "Ctrl+E, noted."

`TRY 23 ... --click "Export..."` -> 23.png

"Export dialog: Image / Video / Report / Recipe / Data. Image .png, 'Full graph, with the legend',
preview, and '64 labels hidden to avoid overlap: show list'. THAT answers my label question: 13 of
77 shown, 64 hidden. Should have been on the canvas, not buried in the export dialog. Preset 'To
share -- PNG, 2x', 1,802 x 1,638. 'Saved to this computer only; nothing is uploaded.' Good. And a
Data export too, which is the one I'd actually want for my own work."

`TRY 24 ... --click "show list"` -> 24.png: hidden labels listed with degree (Thenardier degree 16,
Joly 12, Mabeuf 11, ...). "It hid Thenardier with degree 16 but kept Myriel? Whatever, it's by
overlap, fine. For a picture in a doc, 13 readable names beats 77 overlapping ones."

`TRY 25 ... --click "Export"` -> 25.png, toast "Exported les-miserables.png to Downloads".

"**Picture file done.** les-miserables.png in Downloads."

## Wrap-up

Did I succeed? "Mostly, with an asterisk. I have a PNG of the network, colored by PageRank with a
legend, with 13 names on it. But the analysis in that picture is the one that came with the sample.
The betweenness I ran myself never finished, and nothing I did in the layer list -- showing,
hiding, moving above -- changed the drawing. If the sample hadn't come pre-cooked, I would not have
a colored picture."

Single Ease Question (1-7): **4**. "The Analyze form and the summary panel are good -- better than I
expected, honestly. But the run that hung and a canvas that ignores the list cost me most of the
session."

Would I use this instead of my current tool (networkx + matplotlib in a notebook)? "Not yet. For
this exact job -- PageRank, color, labels, PNG -- that's fifteen lines in a notebook and I trust
every step. What would pull me over: the graph summary panel (degree CCDF, components, weight
semantics stated up front), the Analyze form that says how many edges were used and how weight is
read, local-only processing, and the 'N labels hidden' honesty. What keeps me out: I never saw it
import my own file, a run that promised 'under a second' and spun forever, and toggles whose effect
I couldn't see on the drawing. I'd try it again on a real edge list before deciding."
