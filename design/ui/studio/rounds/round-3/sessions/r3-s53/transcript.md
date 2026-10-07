# Session r3-s53 -- Elena, task T3 (friends.csv)

Participant: Explorer Elena (product manager, first time with graph tools). Clock: first contact.
Task: bring friends.csv (who in the running club knows whom) into the program, get it drawn, and
check that all of it arrived: how many people, how many ties, nothing dropped.

## Step 0 -- start

Command: `node tool/real.mjs --start rounds/round-3/sessions/r3-s53 empty` -> 01.png

Seen: a dark start page. "Start" with "Open project or file..." and "New from data...", a line
"or drop a file anywhere in this window", Recent projects (empty), Samples on the right, and a
"Your data is yours, but please help us" box at the bottom.

Elena: "OK, a usage-data box. No thanks. I've got a spreadsheet, so... I'll just drop it on the
window, it says I can."

## Step 1 -- dismiss the usage box

Command: `--step --click "No thanks"` -> 02.png. The box went away.

Elena: "Now drop my file on it."

## Step 2 -- drop the file

Command: `--step --drop friends.csv` -> 03.png

Seen: it went straight to a drawing -- about 20 purple balls joined by grey arrows on a light
canvas. No question about columns, nothing to confirm. Top left says "friends"; a left panel
says "Graph friends.csv" with a search box, "Selection", "Everything". The right panel says
"Graph / From friends.csv" and an Overview: Nodes 20, Edges 41, Direction Directed, Density
0.1079, Components 1, Edges per node 3 to 6, mean 4.1.

Elena: "Oh, that was fast -- it just drew it. Nice. OK, 'Nodes 20' -- I guess nodes are the people,
the dots. 'Edges 41', the lines? So 20 people and 41 ties. But did it drop anything? I don't
actually know how many rows my friend's sheet had. 'Directed'... the lines have arrows, which is
weird, knowing someone goes both ways. Whatever. Maybe 'From friends.csv' tells me about the file."
Hesitation: "Nodes"/"Edges" are not her words; she guessed from the picture.

## Step 3 -- click "From friends.csv"

Command: `--step --click "From friends.csv"` -> 04.png

Seen: the left panel switched to the Data tab: "friends", Sources: "friends.csv  41 rows, 41
edges"; Attributes: Nodes -> id, Edges -> weight. The drawing did not move.

Elena: "Oh there it is. '41 rows, 41 edges' -- so every row in the sheet became a line. Good,
nothing got lost. 20 people over on the right. I'll click the file name, just to see if it says
anything was skipped."

## Step 4 -- click the friends.csv source row

Command: `--step --click "friends.csv"` -> 05.png

Seen: the row got a light highlight. Nothing else opened: no details, no list of skipped rows,
no "all rows read" message.

Elena: "Hm, nothing. OK, I guess there's nothing more to say about it. 41 rows, 41 lines, 20
people. That's it, I'm done."
(Engagement dropped here; she stopped trying new things.)

Command: `node tool/real.mjs --end rounds/round-3/sessions/r3-s53`

## End of session (in character)

- **Did I finish?** Yes. The file is in, drawn, and I can say: 20 people, 41 ties, and the
  sheet's 41 rows all came in as 41 lines, so nothing was dropped.
- **Ease:** 6 out of 7. Dropping the file just worked -- no column picking, it drew right away,
  and the numbers were sitting on the right.
- **What confused me:**
  - The counts are called "Nodes" and "Edges". I worked out that nodes are the dots and edges
    are the lines only by looking at the picture. I'd have said "people" and "connections".
  - The "nothing was dropped" part was not on the first screen. The right side says Edges 41, but
    I didn't know my sheet had 41 rows until I clicked the blue "From friends.csv" link -- which I
    clicked hoping, not knowing -- and found "41 rows, 41 edges" on the Data side, in small grey
    text. Clicking that file name did nothing, so there is no "all rows read, 0 skipped" sentence
    anywhere; I'm trusting that 41 = 41 means everything.
  - The lines have arrows and it says "Directed". Knowing someone goes both ways, so I don't know
    what an arrow means here. I left it alone.
  - "Density 0.1079" -- no idea if that's a lot.
