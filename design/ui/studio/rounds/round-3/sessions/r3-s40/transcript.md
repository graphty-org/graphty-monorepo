# Session r3-s40 -- Alex, task T6 (What did I get?), dataset Les Miserables

Participant: Analyst Alex (intermediate graph analyst, Gephi and NetworkX user).
Task: get the bundled Les Miserables network on screen and work out how many characters, how many
connections, whether every character can be reached from every other, and what facts are recorded
about each character and each connection.

## Step 1 -- start
Command: `node tool/real.mjs --start rounds/round-3/sessions/r3-s40 empty`
Screenshot: 01.png

Saw: a start page. Top right says "Local only" with a lock; under Start, "Files are read on this
computer and never uploaded." Good -- that answers my first question before I even ask it. Samples
list on the right: Les Miserables, "77 characters". A usage-data box at the bottom asking me to
share usage data.
Next: decline the usage data ("No thanks") -- I do not opt in to tracking on a work laptop -- then
open the Les Miserables sample.

## Step 2 -- decline usage data, open the sample
Command: `node tool/real.mjs --step $S --click "No thanks" --click "Les Miserables"`
Screenshot: 02.png

Saw: the graph drawn straight away, no hairball for once -- 77 dots, blue. Right panel "Graph,
From Les Miserables", Values tab, Overview: Nodes 77, Edges 254, Density 0.08681, Components 1,
"Edges per ..." 1 to 36, mean 6.597. That is three of my four answers on one screen without
clicking anything: 77 characters, 254 connections, and Components = 1 means everyone can reach
everyone. Matches what I remember NetworkX giving for this one (77/254).
Hesitated: the line "Undirected, from the file: directed 0" reads oddly -- I think it means the
file had no directed edges, so it is treated as undirected, but "directed 0" took me a second.
"Edges per ..." is cut off; I assume it is edges per node, i.e. degree 1 to 36.
Next: the fourth question, what is recorded about each character and each connection. There is a
"Data" icon on the far left; I will try that, it sounds like a table.

## Step 3 -- Data view
Command: `node tool/real.mjs --step $S --click "Data"`
Screenshot: 03.png

Saw: left panel now lists Sources -- "Les Mis... 77 nodes, 254 edges", a node table "77 rows, 77
nodes", an edge table "254 rows, 254 edges" -- and Attributes: Nodes have "id" and "name" (text
icons), Edges have "shared_chapters" (a # icon, so a number). So each character has an id and a
name, and each connection has a count of shared chapters. Rows equal nodes and edges, so nothing
dropped on import -- that is the check I always do.
Hesitated: the source names are truncated ("Node t...", "Ed...") -- fine, I can guess them.
Next: I want to see what shared_chapters actually holds (range of values) before I would trust it
as an edge weight. I will click it.

## Step 4 -- the edge attribute
Command: `node tool/real.mjs --step $S --click "shared_chapters"`
Screenshot: 04.png

Saw: right panel switched to "shared_chapters, Attribute", Summary: Table Edges, tags "Amount" and
"From the file", Has a value 100%, Distinct values 17, Range 1 to 31. So every connection has a
shared-chapter count between 1 and 31 -- usable as a weight, no gaps. That is what I wanted to know.
I did not open id or name; they are text and obviously the character's identifier and name.
Decision: I have all four answers. Stopping here.

## Step 5 -- end
Command: `node tool/real.mjs --end $S`

## Wrap-up (in character)

**Did I finish?** Yes.
- Characters: 77 (Nodes 77; the sample card also said "77 characters").
- Connections: 254 (Edges 254), undirected.
- Can everyone reach everyone? Yes -- Components 1, one connected piece.
- Recorded about each character: an id and a name (both text). About each connection: shared_chapters,
  a number on every edge (100% filled), 17 distinct values, range 1 to 31. Nothing else.

**How easy, 1 (very difficult) to 7 (very easy):** 6. Four clicks total. The counts and the
component number were on screen the moment the graph loaded, which is exactly what I check first,
and the import check (77 rows = 77 nodes, 254 rows = 254 edges) was right there in Data.

**What took longest / confused me:**
- "Undirected, from the file: directed 0" -- I had to reread it. I think it means "the file had no
  directed edges", but it reads like a contradiction at first glance.
- "Edges per ..." is truncated in the Overview; I am guessing it means edges per node (degree).
  If I am putting "1 to 36, mean 6.6" in a deck I want to see the full label.
- "Components 1" is right, but someone less used to graph jargon might not read it as "everyone
  can reach everyone". I knew it from NetworkX.
- Names truncated in the Sources list ("Node t...", "Ed...").
- It was not obvious that the left-hand "Data" icon was where the attribute list lived; I guessed it
  because it looked like a database. The Graph view's "Everything"/"Selection" list did not tell me.
- I did not see the actual values per character (a table of rows) -- the summary was enough for
  this task, but for my real work I would want to look at and export the rows.
