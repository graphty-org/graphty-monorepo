# Session: Fantine to Gavroche, fewest go-betweens -- screen-reader analyst (Morgan)

Task as given by the moderator: "The Les Miserables network is open (example data, not your own).
Work out how Fantine and Gavroche are connected through the smallest number of go-betweens: say
who the go-betweens are, in order, and how many links it takes."

Participant: Morgan Reyes, blind data analyst, screen reader and keyboard (persona file
study/personas/screen-reader-analyst.md). Spoken in character. A render stands in for what the
screen reader would have read out.

All commands were run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t21--screen-reader-analyst/. In the commands below, D stands for that folder.

## Answer given

Fantine and Gavroche are two links apart, with one go-between. Three routes tie for shortest:

1. Fantine - Valjean - Gavroche
2. Fantine - Thenardier - Gavroche
3. Fantine - Javert - Gavroche

Computed with no edge weight ("None: fewest steps").

## Transcript

### 01 -- start screen (shots/tasks/r8-t21/01.png)

"Title says Les Miserables. There's a list of named rows on the left: Selection, Notes, PageRank,
Louvain, Shortest paths, Density... 'Shortest paths' is the only row that sounds like my question.
It has two children, 'Valjean t...' and 'Myriel to...', which are cut off. I'd hear the full name,
I hope. Neither one starts at Fantine."

### 02 -- open the Shortest paths row

    timeout 120 node app-b/study.mjs --try $PWD/$D/02.png task:r8-t21 --click "Shortest paths"

"The row is highlighted, but the detail panel on the right now says 'Louvain'. I picked
Shortest paths and the panel says Louvain. Either it shows something else on purpose or it's
wrong, and I can't tell which. I'm not guessing. There's no 'new path' anywhere I can find
from here, so I'll look for something that runs an analysis."

### 03 -- what are the icon-only toolbar buttons?

    timeout 120 node app-b/study.mjs --try $PWD/$D/03.png task:r8-t21 --hover "Analyze"

"Tooltip: 'Analyze, Shift+A'. Good, it has a name and a key. That goes in my keystroke file."

### 04 -- open Analyze

    timeout 120 node app-b/study.mjs --try $PWD/$D/04.png task:r8-t21 --click "Analyze"

"A dialog headed 'Analyze', with a search box, a 'Recent' group and 'Rank nodes and edges'. The
right panel turned into a graph summary: 77 nodes, 254 edges, undirected, 1 connected component,
average degree 6.60. That's the overview I always ask for, given without running anything. Under
Recent: 'Shortest path -- the fewest steps, or the lightest route, between two nodes.' That's
mine."

Note: the tool reports two controls called "Shortest path" (one in Recent, one further down
marked "Start here"). To me those are two items with the same first words.

### 05 -- open Shortest path

    timeout 120 node app-b/study.mjs --try $PWD/$D/05.png task:r8-t21 --click "Analyze" --click "Shortest path"

"Form headed 'Path between'. From: 'Type a name'. To: 'Click to pick'. I can't click a node in a
picture, so the To field is talking to somebody else. Weight is set to 'value (set at load)',
and the note says 'Shortest path reads a weight as distance: it uses 1/value.' I asked for the
fewest go-betweens. That's hop count, not weighted distance. Left as it is, this would give me
the 'lightest route', which is a different question. I'd have walked straight into that if I
hadn't read the note. Scope: whole graph, 77 nodes. A banner at the top says 'Click a node for
From'. That's more pointer talk."

### 06 -- type Fantine

    timeout 120 node app-b/study.mjs --try $PWD/$D/06.png task:r8-t21 --click "Analyze" --click "Shortest path" --click "From" --type "Fantine"

"It took the text. No list of matches came up and nothing confirmed a node called Fantine
exists. The tooltip says 'Click a node on the canvas, or type a name.' So I'll type the
other one too."

### 07 -- try to type in To

    timeout 120 node app-b/study.mjs --try $PWD/$D/07.png task:r8-t21 --click "Analyze" --click "Shortest path" --click "From" --type "Fantine" --click "To" --type "Gavroche"

"Activating 'To' left me on the page with nothing to type into. Typed nothing. Dead end one."

### 08 -- Tab to To

    timeout 120 node app-b/study.mjs --try $PWD/$D/08.png task:r8-t21 --click "Analyze" --click "Shortest path" --click "From" --type "Fantine" --key Tab --type "Gavroche"

"Tab lands on a button: 'To: not chosen', tooltip 'Pick To on the canvas'. It's a button, not a
text box, so my typing went nowhere. Dead end two. Normally I'd be out the door here. I'll give
it one more go, because the From box did take text."

### 09 -- press Enter on the To button and type

    timeout 120 node app-b/study.mjs --try $PWD/$D/09.png task:r8-t21 --click "Analyze" --click "Shortest path" --click "From" --type "Fantine" --key Tab --key Enter --type "Gavroche"

"Now To says Gavroche, and From has gone back to 'Click to pick'. My Fantine is gone, and
nothing told me. That's the content-disappears-under-you thing. So typing isn't enough; the
typed name has to be committed some way I wasn't told about."

### 10 -- press Enter after each name

    timeout 120 node app-b/study.mjs --try $PWD/$D/10.png task:r8-t21 --click "Analyze" --click "Shortest path" --click "From" --type "Fantine" --key Enter --key Tab --key Enter --type "Gavroche" --key Enter

"Enter on From kept Fantine and moved me into To on its own; To now says 'Type a name'. My Tab
then pushed me past it into Weight. Focus moving by itself makes me nervous, but it went to the
next field, which is what I'd want. Nobody told me Enter commits the name, though. I found it by
luck."

### 11 -- type both, Enter after each

    timeout 120 node app-b/study.mjs --try $PWD/$D/11.png task:r8-t21 --click "Analyze" --click "Shortest path" --click "From" --type "Fantine" --key Enter --type "Gavroche" --key Enter

"From Fantine, To Gavroche, and 'Find path' is enabled. Not running it yet: weight first."

### 12 -- open Weight by its label

    timeout 120 node app-b/study.mjs --try $PWD/$D/12.png task:r8-t21 --click "Analyze" --click "Shortest path" --click "From" --type "Fantine" --key Enter --type "Gavroche" --key Enter --click "Weight"

"Activating the label 'Weight' does nothing. The label isn't tied to its control, or there are
two 'Weight' things on the page (the summary panel has one too)."

### 13 -- open Weight by its value

    timeout 120 node app-b/study.mjs --try $PWD/$D/13.png task:r8-t21 --click "Analyze" --click "Shortest path" --click "From" --type "Fantine" --key Enter --type "Gavroche" --key Enter --click "value (set at load)"

"A list with two choices: 'value (set at load)' and 'None (fewest steps)'. That second one is
worded exactly right. The meaning comes first."

### 14 -- None, then Find path

    timeout 120 node app-b/study.mjs --try $PWD/$D/14.png task:r8-t21 --click "Analyze" --click "Shortest path" --click "From" --type "Fantine" --key Enter --type "Gavroche" --key Enter --click "value (set at load)" --click "None (fewest steps)" --click "Find path"

"'Found Fantine to Gavroche', with an Undo. The right panel: 'Fantine to Gavroche, Path. Size 3
nodes, 2 edges. From Fantine, To Gavroche.' Members, 'in path order': Fantine start, Valjean
hop 1, Gavroche end. 'Made with: Weight None: fewest steps (this run's override).' Good, it says
what it computed and with which setting, which is the first thing I'd check against NetworkX. A
new row 'Fantine t... 3 nodes' sits in the list under Shortest paths, so I can come back to it.
But it also says '3 routes tie, Route 1 of 3'. So Valjean is one answer, not the answer."

### 15 -- next route

    timeout 120 node app-b/study.mjs --try $PWD/$D/15.png task:r8-t21 --click "Analyze" --click "Shortest path" --click "From" --type "Fantine" --key Enter --type "Gavroche" --key Enter --click "value (set at load)" --click "None (fewest steps)" --click "Find path" --click "Next route"

"Route 2 of 3: Fantine, Thenardier, Gavroche. There are two 'Next route' buttons, one in the
panel and one in a bar under the picture. Same name, so I can't tell them apart, but they seem to
do the same thing."

### 16 -- next route again

    timeout 120 node app-b/study.mjs --try $PWD/$D/16.png task:r8-t21 --click "Analyze" --click "Shortest path" --click "From" --type "Fantine" --key Enter --type "Gavroche" --key Enter --click "value (set at load)" --click "None (fewest steps)" --click "Find path" --click "Next route" --click "Next route"

"Route 3 of 3: Fantine, Javert, Gavroche. Done. Two links, one go-between, three ties: Valjean,
Thenardier, Javert. NetworkX all_shortest_paths would give me the same three, if the moderator
cares to check. I'd want the three routes in one list I can copy, not stepped one at a time,
but stepping did work."

## After the task

- **Succeeded?** Yes. Two links, one go-between, three tied routes (Valjean, Thenardier, Javert),
  computed without weights.
- **Single Ease Question (1-7):** 4. The answer, once I had it, was the best-presented result I've
  had from a graph tool: in text, in order, with the setting it used. Getting the second name into
  the form took two dead ends, and Enter as the way to commit a name is something I stumbled on.
  The weight default would have answered a different question if I hadn't read the note.
- **Would I use this instead of my current tool?** Not for this. In NetworkX this is one line,
  `list(nx.all_shortest_paths(G, "Fantine", "Gavroche"))`, and I get all ties at once as text. What
  this has that my script doesn't: the result is kept as a named row with its settings next to
  it, and a sighted colleague sees the same path drawn. I'd use it to hand a path to someone
  sighted, not to find one.

## Problems noted (in Morgan's words, for the moderator)

1. The To field is a "pick on the canvas" button, not a text box, even though its tooltip says
   "or type a name". Tab then Enter turns it into one, but nothing says so. Two dead ends.
2. A typed name that isn't confirmed with Enter is silently dropped when focus moves on; my
   Fantine vanished.
3. Weight defaults to the loaded value, so "shortest path" means "lightest route" unless I
   change it. The task said fewest go-betweens. Only the small print warned me.
4. Picking the Shortest paths row showed "Louvain" in the detail panel.
5. Two controls each named "Shortest path" in the Analyze list; two named "Next route" on the
   result screen.
6. Activating the label "Weight" did nothing; I had to find the control by its current value.
7. Tied routes are stepped one at a time; there is no single list of all three I can copy.
8. From/To prompts and the top banner ("Click a node for From/To") speak only to mouse users.
