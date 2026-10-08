# Session r2-s48 -- Tom (recipe recipient), task T3 "Your own list of ties"

Participant: Tom, 52, lab manager, not a network person; reads glasses on, trackpad, counts rows.
Dataset: friends.csv (I opened it in Excel first: 41 rows of source,target,weight; 20 different names).

## Step 1 -- start

Command: `node tool/real.mjs --start rounds/round-2/sessions/r2-s48 empty` -> 01.png

Saw: a dark start page. "Open project or file...", "New from data...", "or drop a file anywhere in
this window", "Files are read on this computer and never uploaded." Top right says "Local only".
Samples on the right. A box at the bottom asking to share usage data.
Tom: "Read on this computer, never uploaded. Good, that's the first thing I'd ask." The usage box
is in the way; I'll say No thanks. Then I have a spreadsheet, not a project, so "New from data..."
sounds like mine more than "Open project".

## Step 2 -- dismiss usage box

Command: `--step ... --click "No thanks"` -> 02.png
Next: "New from data..." -- my file is a list from a spreadsheet, that sounds like it.

## Step 3 -- New from data

Command: `--step ... --click "New from data..."` -> 03.png
Saw: "Open as a new graph". A "Tables" column on the left with a +, "Drop a file here, or choose a
file..." in small grey text, a "Direction: As the file says" dropdown, Cancel and a greyed Load
("Choose a file first"). The text is tiny; I had to lean in.
Tom: "Direction? I don't know what direction my file says. I'll leave it." Next: choose a file...
and pick friends.csv from Downloads.

## Step 4 -- choose friends.csv

Command: `--step ... --click "choose a file..." --upload friends.csv` -> 04.png
Saw: left list "Edges: friends.csv, 41 rows" with a green tick. A preview of my rows (Ava-Ben 3,
Ava-Chloe 5 ...) with a "Line" column starting at 2. Above: "node (20) --friends (41)--> node",
"Each row is [a node] [an edge]" with "an edge" picked, CSV auto, three dropdowns "From -> node",
"To -> node", "Weight". Below: "0 node rows and 41 edge rows read; the load makes 20 nodes and 41
edges." Load button is blue now.
Tom: "41 rows -- I counted 41. And 20 people, I counted 20 names. So it's read all of it, before I've
even pressed anything." Hesitation: the words "node" and "edge" -- I'm guessing node is a person and
edge is a tie; the line "node (20) --friends (41)--> node" looks like a formula and means little to
me. "Each row is a node / an edge" is a question I wouldn't know how to answer if it hadn't already
picked one. The "Line" column starting at 2 threw me for a second until I remembered the header
row. I'm not touching any dropdowns. Next: Load.

## Step 5 -- Load

Command: `--step ... --click "Load"` -> 05.png
Saw: the drawing -- 20 blue balls joined by grey lines with little arrowheads on a light panel. Title
bar now says "friends". Right side: "Graph, From friends.csv", Overview: Nodes 20, Edges 41,
Direction Directed, Density 0.1079, Components 1, Edges per node 3 to 6, mean 4.1. Left: a search
box, "Selection", "Everything". Bottom toolbar with a few icons and "3D".
Tom: "There it is, drawn. 20 and 41, same as my count -- that's parts one and two done." But: no
names on the balls, so I can't see who is who. And arrows -- knowing someone goes both ways, why
does it say "Directed"? Did it think Ava knows Ben but Ben doesn't know Ava? I'd ask the postdoc.
Density and Components mean nothing to me; I ignore them. For "nothing dropped" the load screen
said 41 rows read and 41 edges made, which is what I'd want, but I'd like to see the list itself
once. Next: the Data tab on the left, to see if it shows my rows and anything it skipped.

## Step 6 -- Data tab

Command: `--step ... --click "Data"` -> 06.png
Saw: "Sources: friends.csv -- 41 rows, 41 edges". "Attributes: Nodes -> id; Edges -> weight".
Drawing and right panel unchanged.
Tom: "41 rows in, 41 edges out. That's the line I wanted -- nothing fell off." It doesn't say in
words "0 skipped", I'm working it out from the two numbers, but they match, so I'm satisfied. "id"
is presumably the names. Last thing: I'd like to see one name, to know the balls are my people.
Next: point at one ball.

## Step 7 -- point at a ball

Command: `--step ... --hover-at 816,125` -> 07.png (tool: node with id "Omar"; tooltip: null)
Saw: nothing changed on screen. No name popped up.
Tom: "Nothing. I held the pointer on it and it doesn't tell me who it is." Next: click it once; that
usually shows something.

## Step 8 -- click a ball

Command: `--step ... --click-at 816,125` -> 08.png
Saw: the ball got a yellow ring and turned brownish. Right panel now says "Omar, Node", Summary:
id Omar, Degree 4.
Tom: "Omar. He's in my list -- and I count four rows with Omar in my spreadsheet, so 4 ties checks
out." "Degree" is a word I'd have to ask about, but the number matches what I counted, so I'll guess
it means how many ties. That's enough: the list came in, it's drawn, 20 people, 41 ties, 41 rows
read and 41 made. I'm done.

Command: `node tool/real.mjs --end rounds/round-2/sessions/r2-s48`

## End -- in Tom's words

**Finished?** Yes, all three parts: brought it in, got it drawn, checked the counts (20 people,
41 ties, 41 rows read and 41 ties made, so nothing dropped). 8 steps, no dead ends.

**Rating: 6 of 7 (easy).** "Quicker than I expected. It told me the counts before I even pressed Load,
and they matched my own count of the rows. It also said up front that the file stays on my computer,
which is the first thing I'd have asked. Not a 7 because of the words and the small grey print."

**What confused me:**

- "node" and "edge" everywhere, and "node (20) --friends (41)--> node" on the load screen reads like
  a formula. I guessed node = person, edge = tie, but nothing said so.
- "Each row is a node / an edge" and "Direction: As the file says" are questions I couldn't have
  answered; luckily it had already chosen.
- It says "Directed" and draws arrows. Knowing someone goes both ways -- did it decide Ava knows Ben
  but not the other way round? I'd ask the postdoc whether that's wrong.
- "Nothing dropped" I had to work out myself from "41 rows, 41 edges". A plain "all 41 rows used,
  none skipped" would have saved me the arithmetic.
- No names on the dots, and pointing at one showed nothing; I had to click to learn it was Omar.
  "Degree 4" -- I matched it to my 4 rows, but the word means nothing to me.
- The "Line" column in the preview starts at 2 (header row), which made me double-take.
- Small grey text (the "Drop a file here, or choose a file..." line, "Choose a file first") is hard
  to read at my eyesight.
- Density 0.1079, Components 1: I don't know what those are and ignored them.
