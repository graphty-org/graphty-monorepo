# Session r1-s32: Ruth (reporter with a contacts sheet), task T3 "Your own list of ties", friends.csv

Participant: Ruth, a newspaper reporter, fast in spreadsheets, first time with any graph tool.
Privacy-minded; wants every number explained and checkable.

Commands run from `design/ui/studio`, with `S=rounds/round-1/sessions/r1-s32`.

## Steps

### 1. Start

`node tool/real.mjs --start $S empty` -> 01.png (the tool waited several minutes for a free
browser slot first).

Saw: a start screen with "Open project or file...", "New from data...", "or drop a file
anywhere", "Files are read on this computer and never uploaded", Recent projects (empty), four
samples, and a "Your data is yours, but please help us" banner at the bottom.

Think-aloud: "Good, it says files stay on this computer -- my names are unpublished. I don't want
to share anything. 'Open project or file...' is where my sheet goes."

### 2. Decline usage data

`--step $S --click "No thanks"` -> 02.png. Banner gone.

### 3. Open the file

`--step $S --click "Open project or file..." --upload friends.csv` -> 03.png

Saw: the graph drawn at once (about 20 blue balls with arrows). The right panel, "Graph, From
friends.csv", Overview: Nodes 20, Edges 41, Direction Directed, Density 0.1079, Components 1,
Edges per node 3 to 6, mean 4.1. The left panel has a search box "Find nodes, edges, values".

Think-aloud: "Oh, it just drew it, no questions asked. 20 and 41. But there are no names on the
dots -- I can't tell who is who. And 'Directed', with arrows? Friendships go both ways; my friend
just wrote one name first. Hmm. Density, components -- no idea, skip. Did it drop anything? It
doesn't say."

Hesitation: no message saying how many rows were read or whether any were skipped.

Outside the app, Ruth opened friends.csv in her spreadsheet: 41 data rows under a
`source,target,weight` header, 20 distinct names. "Numbers match. But I want the program to say
it, not to work it out myself."

### 4. Look for where the numbers came from

`--step $S --click "From friends.csv"` -> 04.png

Saw: the left side switched to the Data tab: Sources > friends.csv "20 nodes, 41 edges", under it
"Node ... 20 rows, 20 nodes" and "Edge t... 41 rows, 41 edges"; Attributes: Nodes > id, Edges >
weight.

Think-aloud: "This is better: 41 rows, 41 edges. Rows in, ties out -- that's the check I wanted.
And it kept my weight column. But what is 'Node ... 20 rows'? I never gave it a node sheet. And
both names are cut off."

### 5. Hover the cut-off names

`--step $S --hover-at 157,168` -> 05.png, tooltip "Node table".
`--step $S --hover-at 157,200` -> 06.png; the screenshot shows the tooltip "Edge table" (the tool
printed "Node table" for this hover, a stale reading; the screen was right).

Think-aloud: "Node table and Edge table. So it made a list of people from my two name columns.
I'd like to see that list."

### 6. Click the node table to see the people (dead end)

`--step $S --click "Node table"` -> 07.png

Saw: the whole window replaced by "Add to friends": an empty "Tables +" column, "Drop a file
here, or choose a file...", a Direction dropdown "As the file says", and Cancel / Load (Load
greyed, "Choose a file first").

Think-aloud: "What? I clicked the people list and it wants another file. I didn't ask to add
anything. Where is my list? ... Cancel."

Hesitation: strong. Expected a table of the 20 names (or the 41 rows); got an import form.

`--step $S --click "Cancel"` -> 08.png, back to the Data tab with the graph.

Side note: "As the file says" for direction -- my file doesn't say anything about direction. So
why does the overview say Directed?

### 7. Search for a person I know

`--step $S --click "Graph" --click "Find nodes, edges, values" --type "Ava"` -> 09.png. The Graph
tab came back but the search box was not found by that name, nothing typed.
`--step $S --click-at 180,90 --type "Ava"` -> 10.png. A list "Elements: Ava" under the box.

Think-aloud: "There she is."

### 8. Open Ava

`--step $S --click-at 108,153` -> 11.png

Saw: the camera moved; one ball in the middle highlighted yellow; right panel "Ava, Node",
Summary: id Ava, Degree 6. A round button appeared above the bottom toolbar.

Think-aloud: "Degree 6 -- I guess that's how many ties she has. My sheet has Ava on 6 rows.
Matches. I'd have liked her name next to the dot, and to see who the 6 are."

Checked the sheet: 6 rows mention Ava.

### 9. End

`node tool/real.mjs --end $S`

## In character, at the end

**Did I finish?** Yes. The sheet is in and drawn. The program says 20 people and 41 ties, and the
Data tab says 41 rows became 41 edges, which matches my spreadsheet. I spot-checked Ava: 6 ties in
the program, 6 rows in my sheet. Nothing seems dropped, and the weight column came in.

**How hard was it (1 = very easy, 7 = very hard)?** 3. Loading was effortless. Confirming that
nothing was dropped took digging and my own spreadsheet.

**What confused me:**

1. No message after loading saying "41 rows read, 0 skipped". I found "41 rows, 41 edges" only
   by clicking a small blue "From friends.csv" link; I'd not have guessed that.
2. Clicking "Node table" opened an empty "Add to friends" import page instead of showing me the
   names. I couldn't find a list of the 20 people anywhere.
3. No names on the dots. Without clicking one, I can't tell who is who.
4. The program called my friendships "Directed" and drew arrows, but my file says nothing about
   direction (the import page even says "As the file says"). For a who-knows-whom list that's
   wrong, and I didn't see where to change it.
5. "Node ..." and "Edge t..." cut off in the Data tab; I had to hover to read them.
6. "Degree", "Density", "Components" -- words I'd need to explain to my editor and can't.
