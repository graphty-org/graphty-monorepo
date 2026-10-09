# Session r2-s50 -- Dev (class-project student), T7 Prompt B (running club)

## Step 1

Command: `node tool/real.mjs --start rounds/round-2/sessions/r2-s50 setup:rounds/round-2/setups/T7-B.txt`
Saw (01.png): Okay, the club is already drawn -- 20 blue balls with arrows, a panel on the right saying Nodes 20, Edges 41, Direction Directed. No names on anyone, wait. Bottom-left says "Analyze (flask) in the toolbar (Shift+A) to add results here". In the tutorial the next thing is "statistics" -- I think Analyze is that. Trying the flask button at the bottom.

## Step 2

Command: `--step --click-at 679,864`
Saw (02.png): A list opened under "Rank nodes and edges": Degree, Betweenness, Edge betweenness, Closeness, PageRank (with a blue "Start here" tag), Eigenvector, Katz, HITS... Oh nice, it says "rank", that's the tutorial word. Hesitation: PageRank says "Start here", but the slides said "Betweenness centrality" for who the network depends on, and the line under it says "Which nodes sit on the most shortest paths between others" -- that's the connectors. Going with Betweenness.

## Step 3

Command: `--step --click Betweenness`
Saw (03.png): A small Betweenness box with "Advanced", "Under a second" and a blue Run button. Wait -- the class tutorial said to pick "Undirected" and the panel on the right says Direction: Directed. Knowing whom is both ways, right? Let me peek at Advanced before I run it, in case that's where it is.

## Step 4

Command: `--step --click Advanced`
Saw (04.png): Advanced only has "Sample size" with 0 in it. No directed/undirected choice here. I don't know what sample size means; I'll leave it at 0 and just press Run. (Note to self: the tutorial's "Undirected" step has no home here as far as I can see.)

## Step 5

Command: `--step --click Run`
Saw (05.png): Everyone turned orange, a few dark brown (two near the bottom middle look darkest). A legend says "Color: Bridges 2.583 to 51.27", and on the left a new row "Bridges 20". Wait, I ran Betweenness and it's called "Bridges"? I guess that's its plain name. But I need the people IN ORDER with names, and nobody has a name on the picture. Clicking the "Bridges" row on the left to see if it lists them.

## Step 6

Command: `--step --click Bridges`
Saw (06.png): The right side now says "Bridges -- Measure from Bridges, Oct 7" with Style options (Fill, Color: Bridges, Shape, Effects, Label, Tooltip). There's a "Values" tab next to Style. Values sounds like where the numbers would be in order. Trying it.

## Step 7

Command: `--step --click Values`
Saw (07.png): Oh nice, that's it! A "Top 10" list in order: Ava 51.27, Ivan 40.02, Sana 21.35, Kofi 18.31, Jada 16.1, Theo 15.71, Ravi 14.28, Lena 13.37, Quinn 12.55, Hana 11.95. Under "Made with" it says Analysis: Betweenness, Ran Oct 7, so I can prove what I did. Also "20 of 20 have a value, 2.583 to 51.27, median 11.2". Part done -- I have the order and what it was based on.

## Step 8

Command: `--end`

## End of session (in character)

**Did I finish?** Yes. Top three, in order: 1. Ava (51.27), 2. Ivan (40.02), 3. Sana (21.35). The order is by betweenness centrality -- how many of the shortest paths between other club members run through each person -- which the program shows under the name "Bridges".

Essay sentence: "Using betweenness centrality, Ava (51.27) is the person the running club depends on most to connect its members, followed by Ivan (40.02) and Sana (21.35); Ava's score is more than twice the median of 11.2."

**How easy was it?** 6 out of 7. Five clicks: flask button, Betweenness, Run, the Bridges row, Values. The Top 10 list was exactly what I wanted.

**What confused me:**

- PageRank had a "Start here" tag right below Betweenness. My slides say betweenness for "who the network depends on", so I ignored it, but someone without the slides would probably click PageRank and get a different order.
- I ran "Betweenness" and the result is called "Bridges" everywhere (legend, left row, panel title). For a second I thought I had run the wrong thing; only "Made with: Analysis Betweenness" at the bottom of Values confirmed it.
- The tutorial says to set the graph to Undirected, and the program says "Direction: Directed" for a who-knows-whom list. I looked in Advanced and found only "Sample size: 0" (no idea what that means, left it). I'm not sure whether my numbers would change if the knowing went both ways -- I can't tell from the screen and couldn't find where to change it.
- After running, the picture has colors but still no names on anyone, so I couldn't tell which dark ball is Ava without the list. The ranked list was on the second tab ("Values"), not shown right away; I found it only because "Values" sounded like numbers.
