# Session r1-s42: Ruth (reporter with a contacts sheet), task T6 "What did I get?", Les Miserables

Participant: Ruth, a newspaper reporter who works in spreadsheets and has never used a network
tool. Task: get the ready-made Les Miserables network on screen and find out how many characters,
how many connections, whether every character can reach every other, and what facts are recorded
about each character and each connection.

All commands run from `design/ui/studio` with `S=rounds/round-1/sessions/r1-s42`.

## Steps

### 1. Start

`node tool/real.mjs --start $S empty` -> 01.png (waited a few minutes for a free browser slot)

Saw: a start page with "Open project or file...", "New from data...", an empty "Recent projects"
column, and a "Samples" column listing Les Miserables (77 characters), Zachary's karate club,
College football and Florentine families. At the bottom a box: "Your data is yours, but please help
us", with "Share usage data" and "No thanks".

Think-aloud: "Nothing is collected until I answer. I'm careful with data, so no. And Les Miserables
is right there under Samples, 77 characters. That already answers the first question, if I believe
it."

### 2. Decline usage data, open the sample

`--step $S --click "No thanks" --click "Les Miserables"` -> 02.png

Saw: the network drawn as blue balls and thin gray lines, no names on any ball. Right panel
"Graph / From Les Miserables", tab Values, section Overview: Nodes 77, Edges 254, a line
"Undirected, from the file: directed 0" that runs off the right edge of the panel, Density 0.08681,
Components 1, "Edges per ..." (cut off) 1 to 36, mean 6.597.

Think-aloud: "Nodes 77, Edges 254. I assume nodes are characters and edges are connections -- the
start page said 77 characters, so that matches. 'Components 1' -- is that 'everyone is in one
piece'? The picture looks like one piece. What does 'Undirected, from the file: directed 0' mean?
It's cut off. And 'Edges per ...' per what?"

Hesitation: the jargon (nodes, edges, density, components) with no explanation.

### 3. Hover for explanations

`--step $S --hover "Components"` -> 03.png. Printed: ambiguous (2 matches), hover timed out,
tooltip null.
`--step $S --hover-at 1330,236` -> 04.png. "Direction Undirected, from the file: directed 0",
tooltip null.
`--step $S --hover-at 1267,300` -> 05.png. "Components 1", tooltip null.

Think-aloud: "Nothing explains itself when I point at it. I'll take Components 1 as 'it's all
one connected piece' because the drawing agrees, but I couldn't print that without asking someone.
The direction line I still don't understand -- 'directed 0'? Zero what?"

### 4. Search for a name

`--step $S --click "Find nodes, edges, values" --type "Valjean"` -> 06.png. Failed: nothing called
that (it is placeholder text), typed nothing.
`--step $S --click-at 180,90 --type "Valjean"` -> 07.png

Saw: under the box, "Elements: Valjean" and "Values: Select where name is Valjean (1)".

Think-aloud: "Good, it found him straight away."

### 5. Open Valjean

`--step $S --click-at 117,153` -> 08.png

Saw: Valjean's ball highlighted yellow in the middle of the drawing. Right panel "Valjean / Node",
Summary: id Valjean, name Valjean, Degree 36. A target-like button appeared above the bottom
toolbar.

Think-aloud: "So each character has an id and a name -- here both say Valjean. Degree 36 -- is that
in the file or did the program work it out? Doesn't say. Now, connections. There's a 'Data' button
on the left edge; that sounds like a table."

### 6. Data view

`--step $S --click-at 28,130` -> 09.png

Saw: left panel "Les Miserables / Sources": the file "Les Mis..." 77 nodes, 254 edges; "Node t..."
77 rows, 77 nodes; "Ed..." 254 rows, 254 edges. "Attributes": Nodes -> id, name; Edges ->
shared_chapters (marked with #).

Think-aloud: "This is what I wanted. 77 rows became 77 nodes and 254 rows became 254 edges, so
nothing was dropped. Characters have id and name. Connections have one thing, shared_chapters, a
number. So Degree isn't in the file -- the program counted it. The names are cut off ('Node t...',
'Ed...') but I can guess node table and edge table."

### 7. Try to open the edge table

`--step $S --click-at 200,200` -> 10.png (clicked treeitem "Edge table")

Saw: a full screen "Add to Les Miserables", "Tables +", "Drop a file here, or choose a file...",
Direction "As the file says", Cancel and a disabled Load.

Think-aloud: "Huh. I clicked the edge table to look at its rows and it wants me to load a new file.
I don't want to add anything. That's the opposite of what I clicked."

Hesitation: the biggest surprise of the session.

### 8. Back out

`--step $S --click "Cancel"` -> 11.png. Back to the Data view; nothing changed.

### 9. Try to click a connection on the drawing

`--step $S --click-at 750,515` -> 12.png. "empty canvas"; the panel went back to the graph
overview (Valjean deselected).

Think-aloud: "The lines are hair-thin. I missed and lost Valjean."

### 10. Click the edge attribute

`--step $S --click-at 180,413` -> 13.png (treeitem "shared_chapters, edge attribute")

Saw: right panel "shared_chapters / Attribute", Summary: Table Edges, tags "Amount" and "From the
file", Has a value 100%, Distinct values 17, Range 1 to 31.

Think-aloud: "That's clear. shared_chapters comes from the file, it's an amount, every connection
has one, between 1 and 31. I'm guessing it's how many chapters two characters appear in together --
the start page said 'characters who share a chapter'."

### 11. One more try at a single connection

`--step $S --click-at 958,377` -> 14.png. "empty canvas", nothing selected.

Think-aloud: "Missed again, on a line that's all by itself. I'd have liked to check one tie by hand
-- who to whom, how many chapters -- but I can't hit them and I couldn't get a table of rows. I
have enough to answer. Stopping."

`--end $S`

## Answers I would give

- Characters: 77. Connections: 254 (77 node rows and 254 edge rows, nothing dropped).
- Everyone reachable from everyone: I think yes -- "Components 1", and the drawing is one piece.
  I'm inferring the meaning of "components"; nothing on screen said so.
- Recorded about each character: id and name (in Valjean's case the same text). Degree is shown
  too, but it is not in the file's attribute list, so I take it to be counted by the program.
- Recorded about each connection: shared_chapters, a number from 1 to 31, present on every
  connection, from the file.
- Direction: "Undirected", but I could not read or understand "from the file: directed 0".

## In character, at the end

Did I finish? Mostly yes. I have all four answers, but one rests on my guess at what "Components"
means, and I never saw a single real connection with both names and its number.

How hard (1-7, 7 hardest): 3.

What confused me:
- No explanation for any number: hovering Components, Density or the direction line shows nothing.
  "Undirected, from the file: directed 0" is cut off and means nothing to me. "Edges per ..." is
  cut off too.
- Clicking "Edge table" in Data opened "Add to Les Miserables", a screen for loading a new file,
  instead of showing me the rows. I wanted to read the table, the way a fact-checker would.
- The connection lines are too thin to click; two tries both hit empty canvas, and the first one
  deselected the character I had open.
- No names on the dots, so I can only find a character by typing a name I already know.
- I couldn't tell whether "Degree" came from the file or from the program until I compared it with
  the attribute list in Data.
- The search box couldn't be found by its placeholder text, but clicking it worked.
