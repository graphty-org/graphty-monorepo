# Session r2-s46 -- Grace (nonprofit operations analyst), task T6 "What did I get?"

Dataset: Les Miserables sample. Start: empty.

## Steps

### 1. Start

`node tool/real.mjs --start rounds/round-2/sessions/r2-s46 empty`

Saw (01.png): a start page. Left: "Open project or file...", "New from data...", a note "Files are read on this computer and never uploaded" (good -- that is what I look for first). Right: "Samples" with "Les Miserables -- 77 characters". At the bottom a box asking to share usage data.
Grace: "Okay, 77 characters, it already tells me one number. First I say no to the usage data -- donor names, I don't share anything."

### 2. Decline usage data

`node tool/real.mjs --step rounds/round-2/sessions/r2-s46 --click "No thanks"` -> 02.png
Grace: "The box went away. Now I open the Les Miserables sample."

### 3. Open the Les Miserables sample

`node tool/real.mjs --step rounds/round-2/sessions/r2-s46 --click "Les Miserables"` -> 03.png
Saw: the network drawn right away (blue dots, gray lines). Right panel "Graph -- From Les Miserables", tab "Values", section "Overview": Nodes 77, Edges 254, a line "Undirected, from the file: directed 0", Density 0.08681, Components 1, "Edges per ..." (cut off) "1 to 36, mean 6.597".
Grace: "Nodes 77 -- matches the 77 characters on the start page. Edges 254, so 254 connections. 'Undirected, from the file: directed 0' -- I think that means the lines have no direction, but 'directed 0' reads oddly. 'Components 1' -- I'm guessing that means it's all one piece, but that's a word I'd not put on a slide. Let me hover it to see if it explains itself."
Hesitation: "Components" and "Density" are jargon to me; "Edges per ..." is cut off.

### 4. Hover "Components"

`node tool/real.mjs --step rounds/round-2/sessions/r2-s46 --hover "Components"` -> 04.png (tool: ambiguous, took the first; tooltip: null)
Saw: nothing changed, no explanation appeared.
Grace: "No tooltip. I'll take 'Components 1' as 'it's all one connected piece' -- the drawing agrees, I don't see any dot floating alone. Let me see what 'Edges per ...' says in full."

### 5. Hover the cut-off "Edges per ..." row

`node tool/real.mjs --step rounds/round-2/sessions/r2-s46 --hover-at 1265,332` -> 05.png (tooltip: "Edges per node")
Grace: "'Edges per node, 1 to 36, mean 6.6' -- so each character has between 1 and 36 connections. Fine. Part one done: 77 characters, 254 connections, and it's one piece, so everyone can reach everyone. Now: what's recorded about each character and each connection? There's a 'Data' button on the left -- that sounds like my spreadsheet."

### 6. Open "Data"

`node tool/real.mjs --step rounds/round-2/sessions/r2-s46 --click "Data"` -> 06.png
Saw: left panel now lists "Sources": the Les Miserables file "77 nodes, 254 edges", a node table "77 rows, 77 nodes", an edge table "254 rows, 254 edges" (names cut off: "Node t...", "Ed..."). Below, "Attributes": Nodes -> id, name; Edges -> shared_chapters (with a # mark, so a number I guess).
Grace: "This is the bit I understand -- rows! 77 rows of characters, 254 rows of connections, the counts agree with the overview. Each character has an id and a name; each connection has 'shared_chapters'. Let me click shared_chapters to see what the values look like."

### 7. Click "shared_chapters"

`node tool/real.mjs --step rounds/round-2/sessions/r2-s46 --click "shared_chapters"` -> 07.png
Saw: right panel "shared_chapters -- Attribute", Summary: Table Edges; tags "Amount", "From the file"; Has a value 100%; Distinct values 17; Range 1 to 31.
Grace: "So every connection has a count of chapters the two share, from 1 to 31, filled in on every row. Good, that's a number I can explain: 'how many chapters they appear in together'. Let me click one dot to see a single character's row, to be sure id and name are all there is."

### 8. Click a dot (the busy one in the middle)

`node tool/real.mjs --step rounds/round-2/sessions/r2-s46 --click-at 768,447` -> 08.png (tool: node with id "Valjean")
Saw: the dot turned yellow-outlined; right panel "Valjean -- Node", Summary: id Valjean, name Valjean, Degree 36 (with an arrow).
Grace: "Valjean: id and name, both 'Valjean', and 36 connections -- that's the 36 top end from the overview. So a character carries an id and a name, nothing else from the file; 'Degree' is the program counting his connections. That's everything the task asked. Done."

### 9. End

`node tool/real.mjs --end rounds/round-2/sessions/r2-s46`

## Answers I came away with

- Characters: 77 (Nodes 77; node table 77 rows; start page also said 77 characters).
- Connections: 254 (Edges 254; edge table 254 rows). The connections have no direction.
- Can everyone reach everyone? Yes -- "Components 1", which I read as "one connected piece"; the drawing has no loose dots, which backs that up.
- Recorded about each character: id and name (in this file they are the same text). The app also shows a computed "Degree" (number of connections, 1 to 36).
- Recorded about each connection: shared_chapters, a whole number from 1 to 31 (17 different values), filled in on every connection.

## Debrief (in character)

- Did I finish? Yes, all four parts.
- Ease: 6 of 7 (easy). Everything was one or two clicks away: the numbers were already on screen when the sample opened, and "Data" showed the columns like a spreadsheet header row.
- What confused me:
    - "Components 1" is the only way it tells me whether everyone is connected, and it has no tooltip or plain wording. I guessed right, but a colleague might not. I would have liked "All connected: yes" or "1 connected group".
    - "Undirected, from the file: directed 0" -- I read it twice. "directed 0" sounds like a count of zero, or a flag; I am not sure which.
    - "Density 0.08681" means nothing to me and I would not put it on a slide.
    - Labels cut off: "Edges per ..." in the overview (the hover fixed it), "Node t...", "Ed..." and "Les Mis..." in the Sources list.
    - The app says "Nodes" and "Edges" where the start page said "characters"; fine once I matched 77 to 77, but the words changed on me.
    - "Degree" next to the file's columns: it took me a moment to see that it is the program's count, not something recorded in the file.
