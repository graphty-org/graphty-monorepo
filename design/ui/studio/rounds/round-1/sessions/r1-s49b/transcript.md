# Session r1-s49b -- "First look" (Grace, nonprofit operations analyst)

Participant: Grace. She does the data at a small nonprofit, uses Excel every day and has never
used a graph tool. Task: a first look at a newly installed program, using either a sample or
friends.csv (who in her running club knows whom). At the end she says whether she would keep
using it, and why. Start: the empty app. The participant chose her own file, friends.csv.

Commands are run from the worktree root with `T=design/ui/studio/tool` and
`S=design/ui/studio/rounds/round-1/sessions/r1-s49b`.

Note: before the first screen appeared, the start waited about 15 minutes for a free browser slot.

## Steps

### 1. Start (01.png)

    node $T/real.mjs --start $S empty

What I saw: a start page with "Open project or file...", "New from data...", "or drop a file
anywhere in this window" and "Files are read on this computer and never uploaded." On the right
are four samples. At the bottom is a request for usage data.

Think-aloud: "Good, it says plainly that files are never uploaded. That matters for donor names.
I'll decline the usage data and drag my own file in, since it offers that."

### 2. Decline the usage data, drop friends.csv (02.png)

    node $T/real.mjs --step $S --click "No thanks" --drop friends.csv

What I saw: the drawing appeared at once, with no import dialog. There are 20 purple balls with
arrows between them. On the right, an Overview: Nodes 20, Edges 41, Direction Directed, Density
0.1079, Components 1, Edges per node 3 to 6, mean 4.1.

Think-aloud: "That was easy, no reshaping. 41 edges matches the 41 rows I'd see in Excel. 20
people sounds right. But no names are drawn, so I can't tell who is who. 'Directed' is odd for
friendships, but fine. 'Density' and 'Components' mean nothing to me."

Hesitation: none to get the drawing. Small doubts about "Directed" and the jargon in Overview.

### 3. Click a central ball (03.png)

    node $T/real.mjs --step $S --click-at 640,578

What I saw: node "Ava" selected. The right panel shows id Ava, Degree 6.

Think-aloud: "So names only show when I click. 'Degree 6' -- I guess that's six links? I'd
rather it said so."

### 4. Open the flask button (04.png)

    node $T/real.mjs --step $S --click-at 659,864

The bottom-left of the screen said "Analyze (Shift+A) to add results here", and the flask looked
like the matching button.

What I saw: a long list headed "Rank nodes and edges": Degree, Betweenness, Edge betweenness,
Closeness, PageRank ("Start here"), Eigenvector, Katz, HITS, All-pairs distance, Depth-first
order, Most flow... Each has a one-line description.

Think-aloud: "Lots of words I don't know. PageRank says 'Start here', but I want who is most
connected, and Degree's line, 'How many edges each node has', is closest to that."

Hesitation: there is no plain "most connected" entry. The "Start here" badge pulled me toward
PageRank, which I didn't understand. I went with the plainer description.

### 5. Choose Degree (05.png)

    node $T/real.mjs --step $S --click-at 528,454

What I saw: a small card, "Degree -- How many edges each node has. Under a second", and a Run
button.

### 6. Run (06.png)

    node $T/real.mjs --step $S --click "Run"

What I saw: every ball turned orange, light to dark, with a legend "Color: Connections 3 -- 6".
A "Connections 20" row was added on the left. Ava's panel now reads "Connections 6, #1 of 20".

Think-aloud: "'Connections' and '#1 of 20' I understand. That's better than 'Degree'. But the
oranges all look about the same. I couldn't explain light orange versus dark orange to the
board."

### 7. Click the Connections row on the left (07.png)

    node $T/real.mjs --step $S --click-at 131,156

What I saw: a histogram ("20 of 20 have a value, 3 to 6, median 4"), then "Top 10" listing only
Ava 6 and Ivan 5, then "Made with: Connections, Oct 6".

Think-aloud: "It says Top 10, but there are only two names. Where are the other eight? Maybe
everyone else is tied at 4 or so, but it doesn't say. I wanted a ranked list I could paste
into Excel."

Hesitation: confused by "Top 10" showing two people.

### 8. Open Data (08.png)

    node $T/real.mjs --step $S --click-at 28,130

What I saw: Sources -- friends.csv 20 nodes, 41 edges; a node table of 20 rows; an edge table of
41 rows. Attributes: Nodes have id; Edges have weight.

Think-aloud: "Good, the counts match again: 41 rows, 41 links. But I can't see a table here to
copy. I'll come back to that. First I need names on the picture."

Did not find: a list to paste back into Excel. I didn't try the row labels or the menus further.

### 9. Graph, Everything, Style (09.png)

    node $T/real.mjs --step $S --click-at 28,74 --click "Everything" --click "role=tab:Style"

What I saw: Style for Everything: Fill Color #63... (a purple swatch), Size 1, Shape
Icosphere, then Effects, Label (+) and Tooltip (+).

Think-aloud: "'Label' with a plus. That must be where names go. Funny that the color here says
purple when the balls are orange."

### 10. Plus next to Label (10.png)

    node $T/real.mjs --step $S --click-at 1419,342

What I saw: "Find an attribute", with id under Attributes, and Connections, Connections rank,
percentile, in degree and out degree under Connections.

### 11. Pick id (11.png)

    node $T/real.mjs --step $S --click-at 1106,440

What I saw: names above every ball: Omar, Pia, Quinn, Ravi, Nora, Milo, Lena, Sara, Kofi, Theo,
Jada, Ivan, Ava, Hana, Gus, Ben, Chloe, Dev, Eli. A note: "20 labels, 1 hidden to avoid
overlap".

Think-aloud: "There they are. They're small, and Eli and Dev crowd each other. One person is
hidden behind Chloe and I can't see who. For a slide I'd want them bigger, but this is close."

### 12. Analyze, search "group" (12.png)

    node $T/real.mjs --step $S --click "Analyze" --type "group"

What I saw: "Find groups": Louvain ("Start here", "Which nodes form densely linked groups"),
Leiden, Label propagation, Girvan-Newman, Markov, Spectral, Hierarchical clustering.

Think-aloud: "Typing 'group' worked nicely. The names are gibberish to me, but the descriptions
help. I'll trust 'Start here' this time."

### 13. Louvain, Run (13.png)

    node $T/real.mjs --step $S --click-at 530,584 --click "Run"

What I saw: four colored groups. The legend shows Group 1 orange, Group 2 light blue, Group 3
green and Group 4 dark blue. On the left, Communities 4: 6, 6, 5 and 3 people. The legend box
still also shows "Color: Connections 3 -- 6", though no orange shading by connections is visible
any more.

Think-aloud: "That's the clusters I wanted, and 6+6+5+3 is 20, so nobody fell out. But Group 2
and Group 4 are both blue, and on a projector I couldn't tell them apart. And why is
'Connections' still in the color box when the orange shading is gone? Which color am I
looking at?"

### 14. End

    node $T/real.mjs --end $S

## Verdict, in character

- **Did I finish?** Yes. I decided: I'd keep trying it, with reservations.
- **Why keep it:** my export went in with no reshaping. The counts matched Excel (20 people, 41
  rows). It says nothing is uploaded. Within a dozen clicks I had names on the picture, who has
  the most connections (Ava, then Ivan) and four groups that add up to everyone.
- **Why not yet:** I didn't find a way to get a ranked list back into Excel. The labels are
  small for a slide and one is hidden. The two blue groups look alike.
- **How hard (1-7, 7 = very hard):** 3.
- **What confused me:**
  - No names on the first drawing. I had to find Style, then Label, then +, then "id".
  - The analysis list is mostly jargon (Betweenness, Katz, HITS, Eigenvector). There is no
    "most connected" entry. "Degree" is only explained in small print, and "Start here" points
    at PageRank, which isn't what I'd want.
  - "Top 10" listed only two people.
  - The Style panel showed a purple Color while the balls were orange.
  - After grouping, the legend still showed "Color: Connections", so I wasn't sure what the
    colors meant.
  - Group 2 (light blue) and Group 4 (dark blue) are too alike to explain to a board.
  - "Directed" for friendships, and "Density", "Components" in the overview, meant nothing to me.
