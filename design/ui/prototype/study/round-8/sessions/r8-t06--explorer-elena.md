# Session: Explorer Elena -- get the Les Miserables sample on screen and work out what it holds

Participant: Explorer Elena (first-time graph user, product manager, no graph vocabulary).
Task as given: "You have never used this program before. You will practice on the ready-made network
of characters from the novel Les Miserables that comes with the program, not on your own data.
Get it on screen and work out what you have: how many characters there are, how many connections
between them, whether every character can be reached from every other, and what facts are
recorded about each character."

All commands were run from `design/ui/prototype`. Renders are in
`tmp/round-8-sessions/r8-t06--explorer-elena/`.

## Step 1 -- the start screen (shots/tasks/r8-t06/01.png)

Think-aloud: "OK, a start page. Open, New from data... and on the right, Samples. There it is,
Les Miserables, 77 characters. Nice, it already tells me one of my answers. There's a big box at
the bottom about usage data. I'm just going to say No thanks so it goes away."

## Step 2 -- open the sample

```
timeout 120 node app-b/study.mjs --try .../r8-t06--explorer-elena/02.png task:r8-t06 --click "No thanks" --click "Les Miserables"
```

What I saw: the network, all orange dots, a few names (Valjean, Javert, Marius, Cosette...). A
long list on the left: PageRank, Louvain, Shortest paths, Density, Link prediction, Watchlist,
For the report, Betweenness... A box on the right says "Paints 77 nodes".

Think-aloud: "Ooh, OK, it loaded fast. That's kind of pretty. But wow, there's a LOT already in
this list. Shortest paths? Watchlist? Did somebody already do stuff to this? I don't know which of
these are the book and which are things someone added. The dark one in the middle must be
Valjean -- he's in the middle, so he's the main character, makes sense." (She reads the dark
center dot as "most important" from position and shade; she did not read the PageRank legend at
the top left.)

"77 nodes -- I guess nodes are the characters. That matches the 77 on the start page. Now how
many lines? There's a 'Table' thing at the bottom, that's the closest thing to a spreadsheet."

## Step 3 -- the table

```
timeout 120 node app-b/study.mjs --try .../03.png task:r8-t06 --click "No thanks" --click "Les Miserables" --click "Table"
```

What I saw: a table opened under the picture. "77 nodes", columns label, Notes, group, Degree
(full graph), Rank by degree, PageRank... Valjean first with degree 36.

Think-aloud: "OK, this I understand, it's a spreadsheet. 77 rows, one per character. Columns:
label is the name, group is a number with a color... degree, PageRank, rank -- no idea, but
they're numbers. There's a tab called Edges. Edges must be the lines."

## Step 4 -- the edges tab

```
timeout 120 node app-b/study.mjs --try .../04.png task:r8-t06 --click "No thanks" --click "Les Miserables" --click "Table" --click "Edges"
```

What I saw: "254 edges", columns source, target, Notes, value. Cosette -- Valjean 31 at the top.

Think-aloud: "254 connections. Cosette and Valjean have a value of 31, the biggest -- I guess
that's how many times they're together? It doesn't say. OK, 77 characters, 254 connections. Now,
can everyone reach everyone... looking at the picture it's all one blob, nothing floating off on
its own, so I'd say yes. But I can't really check that by eye with 77 dots. There's a 'Data'
thing on the left side, maybe that has a summary."

## Step 5 -- the Data section

```
timeout 120 node app-b/study.mjs --try .../05.png task:r8-t06 --click "No thanks" --click "Les Miserables" --click "Data"
```

(The tool said two things on screen are called "Data" -- the left-side button and a tab on the
right. It clicked the left-side one, which is what I meant.)

What I saw: left side shows the file, "miserables.gexf, 77 nodes, 254 edges", and an Attributes
list: Nodes -- In use: label, group; Other attributes: betweenness, degree; Edges: value;
Results: Louvain, PageRank. Right side shows a Summary: Nodes 77, Edges 254 each a distinct pair,
Direction Undirected, Weight value stronger, Density 0.0868, Connected components 1, Average
degree 6.60, Highest degree 36.

Think-aloud: "Oh, here we go -- this is the summary. 77 nodes, 254 edges, same numbers, good,
they agree. 'Connected components: 1.' Hmm. Is 1 good? I think it means it's all in one piece?
Let me rest on it."

## Step 6 -- tooltip on "Connected components"

```
timeout 120 node app-b/study.mjs --try .../06.png task:r8-t06 --click "No thanks" --click "Les Miserables" --click "Data" --hover "Connected components"
```

Tooltip: "Groups of nodes joined to each other and to nothing else. Click to select the 77 nodes;
the table marks them as selected rows."

Think-aloud: "OK -- one group, and it has all 77. So yes, everybody can get to everybody, maybe
through other people. That's what I guessed from the picture, but now I trust it."

"Facts about each character: the list on the left says label and group are 'in use', and then
betweenness and degree are 'other attributes', and Louvain and PageRank are 'results'. So... is
betweenness something the book data came with, or something this program worked out? The ones
with the little stack icon -- I don't know what that icon means. I'll say the file has a name and
a group number for each character, and probably those two numbers too. Each connection has a
'value'."

## Step 7 -- try clicking a character to see its facts

```
timeout 120 node app-b/study.mjs --try .../07.png task:r8-t06 --click "No thanks" --click "Les Miserables" --click "Valjean"
```

What I saw: Valjean got a ring, "Valjean, 36 connections" under the picture, and a little toolbar
of icons. The right panel says "Why this look" with Notes, PageRank, Degree, Group 2, Selection,
Everything.

Think-aloud: "I clicked Valjean to see his info card and it's telling me about... colors? 'Why
this look'. I wanted his details, not why he's orange. There's a Data tab up there."

## Step 8 -- the Data tab for Valjean

```
timeout 120 node app-b/study.mjs --try .../08.png task:r8-t06 --click "No thanks" --click "Les Miserables" --click "Valjean" --click "Data"
```

(Two things are called "Data" again; the click landed on the left-side Data button, not the tab
next to Style on the right.)

What I saw: the same Data screen as step 5. Valjean is no longer highlighted; the right panel
shows the whole network's summary again.

Think-aloud: "Huh, I lost him. It went back to the summary. I probably clicked the wrong Data.
Whatever -- I already have what I need from the table anyway: name, group, and those numbers."

Stopped here.

## My answers

- Characters: 77.
- Connections: 254 (each pair once, no direction; each has a "value", bigger means closer).
- Can everyone reach everyone: yes -- the summary says 1 connected component holding all 77.
- Facts per character: a name (label) and a group number; also degree and betweenness numbers,
  though I am not sure whether those came with the book data or were worked out by the program.
  PageRank and Louvain look like things the program added ("Results").

## Debrief

- Did I succeed? "Mostly, yes. The counts I'm sure about. The 'everyone reachable' one I only
  got because the tooltip explained it. The 'facts recorded' one I'm only half sure about -- I
  can't tell what came in the file from what the program added."
- Single Ease Question (1-7): 5.
- Would I use this instead of my current tool? "For poking at a network, maybe -- I didn't have
  to install anything and the Data summary was basically the answer sheet. But it opened with a
  ton of stuff already on it that I didn't ask for, and I couldn't tell the book's data from the
  extras. My current 'tool' is a pivot table, and there at least I know every column is mine."
