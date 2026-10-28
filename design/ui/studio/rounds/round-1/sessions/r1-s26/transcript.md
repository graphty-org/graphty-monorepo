# Session r1-s26: Ruth (the reporter with a contacts sheet), task T9, prompt A (Les Miserables)

Participant: Ruth, a reporter on an investigations desk who is new to graph tools. She is fast in
spreadsheets, wants every number explained, and is careful about privacy.

Task as given: "You have never used this program before. You will practice on the ready-made
network of characters from the novel Les Miserables that comes with the program, not on your own
data. Make the drawing show which characters the network depends on most: the more it depends on a
character, the bigger that character's dot. Then tell us what the sizes and the colors on the
drawing now stand for."

Start: empty app. Tool: `design/ui/studio/tool/real.mjs`. All commands were run from
`design/ui/studio`, with `S=rounds/round-1/sessions/r1-s26`.

## Steps

### 1. Start -- `--start $S empty` -> 01.png

Seen: the start page. Start (Open project or file..., New from data...), Recent projects (empty),
and Samples: Les Miserables (77 characters), Zachary's karate club, College football, Florentine
families. At the bottom, a box headed "Your data is yours, but please help us" with "Share usage
data" and "No thanks".

Thinking aloud: "Usage data -- no. Even on a practice set I don't send anything out. 'Files are
read on this computer and never uploaded' is good to see. Les Miserables is right there under
Samples."

### 2. `--step $S --click "No thanks"` -> 02.png, then `--step $S --click "Les Miserables"` -> 03.png

Seen: a graph of blue dots, all the same size, no names. Left: a search box ("Find nodes, edges,
values"), Selection, Everything, and at the bottom "Analyze (Shift+A) to add results here". Right:
an Overview -- Nodes 77, Edges 254, "Undirected, from the file: directed 0", Density 0.08681,
Components 1, "Edges per ... 1 to 36, mean 6.597". A toolbar at the bottom with five icons.

Thinking aloud: "77 and 254 -- fine. One blob of identical dots. Nothing says who matters. The
hint at the bottom left says Analyze, and the first toolbar icon is a lab flask. I'll try the
flask."

Hesitation: "Edges per ..." is cut off. "from the file: directed 0" reads oddly -- I don't know
what the 0 is.

### 3. `--step $S --click-at 659,864` (the flask) -> 04.png

Tool said: `button "Analyze"`.

Seen: a pop-up list "Rank nodes and edges": Degree, Betweenness, Edge betweenness, Closeness,
PageRank (tagged "Start here"), Eigenvector, Katz, HITS, All-pairs distance, Depth-first order
(greyed, "Select a node first"), Most flow...

Thinking aloud: "A lot of jargon, but each one has a plain line under it. PageRank says 'Start
here', but its line -- 'connected to other well-connected nodes' -- is about popularity. 'Which
nodes sit on the most shortest paths between others' is what I mean by the network depending on
someone: the go-between, the person whose removal breaks the chains. That's Betweenness."

Hesitation: the "Start here" tag pulled me toward PageRank, which is not what the question asks.

### 4. `--step $S --click "Betweenness"` -> 05.png

Seen: a small panel "Betweenness -- Which nodes sit on the most shortest paths between others.
Under a second. [Run]".

### 5. `--step $S --click "Run"` -> 06.png

Seen: every dot turned orange; one dot in the middle is dark brown. A key at the top left: "Color:
Bridges, 0 to 1624". On the left a new row "Bridges 77".

Thinking aloud: "I asked for Betweenness and now it's called 'Bridges'. Same thing, I assume --
but nothing on screen tells me so. Almost every dot is the same orange, so the colors barely tell
me anything. And the dots are still all one size, which is what I was asked to change."

Hesitation: the rename from Betweenness to Bridges. The color change happened without my asking.

### 6. `--step $S --click "Bridges"` -> 07.png

Seen: right panel now about Bridges. A small histogram ("77 of 77 have a value, 0 to 1,624, median
0"), a Top 10: Valjean 1,624; Myriel 504; Gavroche 470.6; Marius 376.3; Fantine 369.5; Thenardier
213.5; Javert 154.8; MlleGillenormand 135.7; Enjolras 121.3; Tholomyes 115.8. "Made with: Analysis
Bridges, Ran Oct 6". Tabs Style and Values.

Thinking aloud: "Now this is useful -- a ranked list I can check line by line. Valjean far ahead.
But what is 1,624 a count of? Paths? Pairs? 'Made with: Bridges' just repeats the name. I couldn't
put that number in a story without knowing. Median 0 -- so most characters are never a go-between.
Size should be under Style."

### 7. `--step $S --click "role=tab:Style"` -> 08.png

Seen: Nodes / Edges switch; Fill with "Color: Bridges"; Shape (+), Effects (+), Label (+),
Tooltip (+). No row called Size.

Thinking aloud: "Color: Bridges -- that's where the orange comes from. No Size anywhere. Shape
is the closest thing; I'll try its plus."

### 8. `--step $S --click-at 1419,226` (plus beside Shape) -> 09.png

Tool said: `button "Add to Shape"`. Seen: a small menu with Size and Shape.

Thinking aloud: "Size hides under Shape. Lucky guess."

### 9. `--step $S --click "Size"` -> 10.png

Seen: a new row "Size [1 v]" with a chain-link icon and a minus. Dots unchanged.

Thinking aloud: "It added a fixed size of 1. I want size to follow the Bridges number, the way
Color says 'Bridges'. The little arrow should let me pick."

### 10. `--step $S --click-at 1352,256` (the arrow in the Size box) -> 11.png

Tool said: `button "Open list"`. Seen: an empty, thin dark strip under the box. Nothing to pick.

Thinking aloud: "An empty list. Dead end."

Hesitation: this was the moment I would have started to doubt myself.

### 11. `--step $S --key Escape --hover-at 1381,256` (the chain-link icon) -> 12.png

Tooltip: "Size by attribute".

Thinking aloud: "In a spreadsheet a chain means 'link to something'. Yes -- 'Size by attribute'."

### 12. `--step $S --click-at 1381,256` -> 13.png

Seen: "Find an attribute", group "Bridges": Bridges, Bridges rank, Bridges percentile. Below,
greyed: "Cannot be used: Holds groups, not amounts" -- id, name.

Thinking aloud: "Good, and it even tells me why names can't be used. Plain Bridges."

### 13. `--step $S --click-at 1188,324` (Bridges) -> 14.png

Tool said: `option "Bridges"`. Seen: the Size box now reads "1 to 3". The key shows two rows:
"Size: Bridges, 0 to 1624" and "Color: Bridges, 0 to 1624". One big dark dot in the middle, a
medium dot at the bottom left hub, another fairly large one near the top; most dots small.

Thinking aloud: "That's the picture asked for."

### 14. `--step $S --hover-at 768,447` (the biggest dot) -> 15.png

Tool said: `node with id "Valjean"`, `tooltip: null`. On screen: nothing appears -- no name.

Thinking aloud: "I wanted to confirm the big one is Valjean. Hovering shows me nothing. I have to
trust that it matches the Top 10. For an editor's picture I'd need names on the dots, but that
wasn't today's task."

### 15. `--end $S`

## In character, at the end

**Did I finish?** Yes. The dots are now sized by how much the network depends on each character
(the measure the program calls "Bridges", which I chose as "Betweenness"), and the biggest is
Valjean, then Myriel and Gavroche per the Top 10.

**What the sizes and colors stand for:** both stand for the same thing -- the Bridges
(betweenness) score, from 0 to 1,624. Bigger and darker means more of the shortest chains between
other characters run through that character. The color was put on by the program as soon as the
measure ran; I added the size myself.

**How hard (1-7):** 4. The analysis was easy to find. Getting size to follow it took a guess
(Size lives under Shape) and a dead end (the empty list in the Size box) before I found the
chain-link icon.

**What confused me:**

- The measure I picked is called "Betweenness" in the list and "Bridges" everywhere after.
  Nothing on screen links the two names.
- There is no Size row in Style until you add one under Shape.
- The Size box's arrow opens an empty list. The real control is an unlabeled chain-link icon
  whose meaning I only learned by hovering.
- I could not find what the number 1,624 counts. "Made with: Analysis Bridges" does not say. I
  couldn't put that number in front of an editor.
- Hovering the biggest dot shows no name, so I could not check the drawing against the Top 10
  list.
- "PageRank -- Start here" pulled me toward a measure that doesn't answer this question.
- Minor: "Edges per ..." is cut off, and "Undirected, from the file: directed 0" is unclear.
- Coloring every dot by the measure made nearly all of them the same orange, so the color added
  little beyond the size.
