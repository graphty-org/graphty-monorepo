# Session r2-s49 -- Alex (intermediate graph analyst), task T3 "Your own list of ties"

Task: bring friends.csv (Downloads) into the program, get it drawn, and check that all of it
arrived: how many people, how many ties, nothing dropped.

Before starting, Alex opened friends.csv in Excel: 41 data rows (source,target,weight), 20 distinct
names. Those are the numbers he expects to see.

## Step 1 -- start

Command: `node tool/real.mjs --start rounds/round-2/sessions/r2-s49 empty` -> 01.png

Saw: a dark start screen. "Open project or file...", "New from data...", "or drop a file anywhere",
and right under them "Files are read on this computer and never uploaded." Top right says
"Local only". Samples on the right. A usage-data banner at the bottom.

Alex: "Good -- the first thing I wanted to know is answered right where I load the file: read on
this computer, never uploaded. Fine. The usage-data box -- no thanks." Next: decline usage data,
then open the CSV.

## Step 2 -- decline usage data

Command: `--step ... --click "No thanks"` -> 02.png

Saw: the banner went away; the start screen is otherwise the same. Next: "Open project or file..."
and pick friends.csv from Downloads.

## Step 3 -- open the CSV

Command: `--step ... --click "Open project or file..." --upload friends.csv` -> 03.png

Saw: no dialog, no column-mapping step -- it went straight to a drawing. Blue balls with arrows on
a light canvas, roughly a ring. Right panel "Graph -- From friends.csv", Overview: Nodes 20,
Edges 41, Direction Directed, Density 0.1079, Components 1, Edges per node 3 to 6, mean 4.1.

Alex: "Twenty and forty-one. That's exactly what Excel told me -- 41 rows, 20 names. Good, it
didn't eat the header or a row. One component, so no orphans." Drawn: yes. Hesitation: it says
Directed -- a "knows" list is really two-way, but the file is source,target so fair enough. And
no names on the dots, which I'd want to eyeball. The panel doesn't say in so many words "41 rows
read, 0 skipped". The counts match so I can infer it, but I'd like it stated. "From friends.csv"
is a link -- maybe that's the import details. Next: click it.

## Step 4 -- import details

Command: `--step ... --click "From friends.csv"` -> 04.png

Saw: the left panel switched to Data. Sources: "friends.csv 41 rows, 41 edges". Attributes:
Nodes -> id (text), Edges -> weight (number).

Alex: "41 rows in, 41 edges out. That's the line I wanted -- nothing dropped. And it picked up
weight as a number, not text." Part 1 (bring it in) and part 2 (drawn) were done at step 3; the
check is done now. One last thing: the dots have no names, so I want to make sure the names came
through and it's not just numbering them. Next: hover a dot.

## Step 5 -- hover a dot

Command: `--step ... --hover-at 816,125` -> 05.png (tool: node with id "Omar", tooltip: null)

Saw: nothing changed on screen. No tooltip, no highlight, no name.

Alex: "Hovering does nothing. In Gephi I'd at least get the label. Let me click it then." Mild
hesitation: unclear whether names arrived at all from the picture alone, though the Attributes
list does show an "id" column. Next: click the same dot.

## Step 6 -- click the dot

Command: `--step ... --click-at 816,125` -> 06.png

Saw: the dot got a yellow ring; the right panel now says "Omar -- Node", Summary: id Omar,
Degree 4.

Alex: "OK, names are there -- that's Omar, Ava's club friend. Degree 4. That's all I needed."
Done.

Command: `node tool/real.mjs --end rounds/round-2/sessions/r2-s49`

## Debrief (in character)

**Finished?** Yes. Loaded friends.csv with one click and a file pick; it drew straight away; the
right panel showed Nodes 20 and Edges 41, which match the 20 names and 41 rows I counted in Excel;
the Data panel said "friends.csv -- 41 rows, 41 edges", so nothing was dropped; one component, so
no stray nodes.

**Ease: 6 out of 7.** It was faster than Gephi -- no import wizard, no "append to workspace"
question, and the counts were on screen without asking. The "never uploaded" line right next to
Open answered my first question before I had to ask it.

**What slowed or confused me:**

- The "41 rows, 41 edges" line -- the one that actually proves nothing was dropped -- is behind a
  small "From friends.csv" link; the first screen only had the totals, so I had to infer
  "nothing dropped" until I clicked.
- No names on the dots and nothing on hover. I had to click a dot to find out the names came
  through. On a 20-person file I'd expect to see the names.
- It calls the file "Directed" with arrows. A who-knows-whom list is two-way; I didn't see where
  to say so, though for this task it didn't matter.
- Two dots near the bottom (around x 570, y 755 and x 720, y 745) overlap their neighbors, so
  counting dots on the picture would not have given 20 -- I relied on the panel.
