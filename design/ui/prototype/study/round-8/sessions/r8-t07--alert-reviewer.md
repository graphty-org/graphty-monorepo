# Session: rank the Les Miserables characters by how much the network depends on them

Participant: Nadia, level-1 alert reviewer (transaction monitoring). First time in the program.

Task as given: "You have never used this program before. You will practice on the ready-made
network of characters from the novel Les Miserables that comes with the program, not on your own
data. Have the program put the characters in order of how much the whole network depends on
them, and tell us the top three, in order, and what the order was based on."

All commands were run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t07--alert-reviewer/. S below stands for that folder.

## Step 1 -- start screen (shots/tasks/r8-t07/01.png)

"OK. A box at the bottom wants usage data. No thanks, I click that on everything. Samples on the
right, Les Miserables is the first one, 77 characters. It even says it 'opens with worked
examples'. Fine, click it."

## Step 2 -- open the sample (02.png)

    timeout 120 node app-b/study.mjs --try S/02.png task:r8-t07 --click "No thanks" --click "Les Miserables"

"That is a lot. A picture of dots, a long list on the left -- PageRank, Louvain, Shortest paths,
Density, Watchlist, Betweenness with a crossed-out eye -- and a panel on the right about
PageRank, orange to brown. Somebody already did stuff here. I don't know which of these is 'how
much the network depends on them'. I want a list, sorted. There's a 'Table' at the bottom."

## Step 3 -- open the table (03.png)

    timeout 120 node app-b/study.mjs --try S/03.png task:r8-t07 --click "No thanks" --click "Les Miserables" --click "Table"

(The tool reported "Table" matched two things and clicked the first; the table opened.)

"Good, a table. 77 nodes, sorted by degree. Valjean 36, Gavroche 22, Marius 19. And a line over
it: 'Valjean is first on all three measures; Gavroche is in the top 3 on all three.' Which three?
I can see Degree and PageRank, the third is cut off. I could just write Valjean, Gavroche, Marius
and say 'degree'. But degree is how many people you're connected to. That's not the same as the
network depending on you. QA would ask me why I picked degree and I wouldn't have an answer. Let
me see what the program offers. The flask at the bottom."

## Step 4 -- what is the flask? (04.png)

    timeout 120 node app-b/study.mjs --try S/04.png task:r8-t07 --click "No thanks" --click "Les Miserables" --hover "Analyze"

"Tooltip: Analyze, Shift+A. OK."

## Step 5 -- open Analyze (05.png)

    timeout 120 node app-b/study.mjs --try S/05.png task:r8-t07 --click "No thanks" --click "Les Miserables" --click "Analyze"

"A list. 'Search, or say what to find.' Under 'Rank nodes and edges': PageRank with a 'Start
here' tag, Degree, Total value, Betweenness, Closeness, Eigenvector. The search box says I can
say what I want, so I'll say it."

## Step 6 -- type what I want (06.png)

    timeout 120 node app-b/study.mjs --try S/06.png task:r8-t07 --click "No thanks" --click "Les Miserables" --click "Analyze" --type "depends on"

"'No match for depends on.' It said 'say what to find', so I said it. It's just a name filter. OK,
read the descriptions then. PageRank, 'connected to other well-connected nodes' -- that's
popularity again. Betweenness, 'which nodes sit on the most shortest paths between others'. That
one sounds like a pass-through account: everything has to go through them. If you took them out,
things fall apart. That's 'depends on'. PageRank says 'Start here' though, which made me hesitate
-- start here for what? I'm going with Betweenness."

## Step 7 -- pick Betweenness (07.png)

    timeout 120 node app-b/study.mjs --try S/07.png task:r8-t07 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Betweenness"
    (failed: "Betweenness" matched the row in the left list first and timed out)
    timeout 120 node app-b/study.mjs --try S/07.png task:r8-t07 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Betweenness Which nodes sit on the most"

"Weight: value (loaded weight). Higher means: Stronger, Farther, Capacity. 'Betweenness reads a
weight as distance: it uses 1/value.' I don't know what any of that means for me. I'm not
touching it. Leave the default. It says 'Under a second'. Run."

## Step 8 -- Run (08.png)

    timeout 120 node app-b/study.mjs --try S/08.png task:r8-t07 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Betweenness Which nodes sit on the most" --click "Run"

"The box closed. A new row at the top of the left list, 'Betweenness 2', with a spinner and a
little blue bar. The picture didn't change, still PageRank colors. Why 2? There's already a
Betweenness lower down with the eye crossed out. Did I just make a duplicate?"

## Step 9 -- click the new row (09.png)

    timeout 120 node app-b/study.mjs --try S/09.png task:r8-t07 ... --click "Run" --click "Betweenness 2"

"Still spinning. 'Under a second' it said. The right panel still shows the graph summary, not my
result. Nothing to read."

## Step 10 -- maybe it went into the table (10.png)

    timeout 120 node app-b/study.mjs --try S/10.png task:r8-t07 ... --click "Run" --click "Table"

"Same table, still sorted by degree. Still spinning on the left."

## Step 11 -- the older Betweenness row (11.png)

    timeout 120 node app-b/study.mjs --try S/11.png task:r8-t07 ... --click "Run" --click "Betweenness"

"The old one. Right panel: 'Paints 77 nodes, none visible', 'Covered by PageRank for Color',
'Move above'. None visible? So it's there but I can't see it. It's about colors. I don't want
colors, I want a list. There's a Data tab next to Style."

## Step 12 -- Data (12.png)

    timeout 120 node app-b/study.mjs --try S/12.png task:r8-t07 ... --click "Betweenness" --click "Data"

(The tool reported "Data" matched two things -- the left-rail button and the tab -- and clicked the
left-rail one.)

"Wrong place, the whole left side changed to Sources, Filters, Attributes. There IS a
'betweenness' under 'Other attributes' though. So it's already in the file? Then what did I just
run? Back."

## Step 13 -- is my run finished? (13.png)

    timeout 120 node app-b/study.mjs --try S/13.png task:r8-t07 ... --click "Run" --hover "Betweenness 2"

"Tooltip: 'This name cannot be changed: a run is named by its algorithm, and a second run of the
same algorithm is numbered.' I didn't ask to rename it, I wanted to know if it's done. Still
spinning. I'll stop waiting on it and find a betweenness column in the table."

## Step 14 -- columns (14.png)

    timeout 120 node app-b/study.mjs --try S/14.png task:r8-t07 ... --click "Run" --click "Table" --click "Columns: 9 of 9"

"Columns list: label, group, betweenness, degree, all ticked. So betweenness is already showing,
it's just off the right edge. And now the 'Betweenness 2' row is gone from the left list
altogether. Did my run finish, fail, or vanish? No idea. I'll untick degree to make room."

## Step 15 -- untick degree (15.png)

    timeout 120 node app-b/study.mjs --try S/15.png task:r8-t07 ... --click "Columns: 9 of 9" --click "degree" --key Escape

"Columns 8 of 9. Now I can see the start of a '# Betw...' header at the edge. Click it to sort."

## Step 16 -- sort by betweenness (16.png)

    timeout 120 node app-b/study.mjs --try S/16.png task:r8-t07 ... --click "degree" --key Escape --click "Betweenness (full graph)"

"There. Betweenness (full graph), arrow down. Valjean 0.570, Myriel 0.177, Gavroche 0.165,
Marius 0.132. The numbers are cut off at the edge but readable. The line above still says
'sorted by degree' -- that's wrong now, I sorted by betweenness. If I screenshotted this for a
file, QA would see 'sorted by degree' over a betweenness sort. And I can't tell if these numbers
are from MY run or from whatever was already in the file."

## Answer given

"Top three: Valjean, then Myriel, then Gavroche. Based on betweenness -- how many of the shortest
paths between other characters run through them. Valjean is way out in front. Myriel surprised me,
he's only 18th by degree."

## Debrief

- Succeeded? "I think so. I've got three names and a reason. But I'm not sure the numbers came
  from the run I started, because my run never stopped spinning and then disappeared. I'd say
  80 percent."
- Single Ease Question: 3 of 7.
- Would I use this instead of my current tool? "For alerts, no. It took me longer than an alert,
  and half of it was figuring out what was already done to the sample and what I did. The ranking
  itself was fine once I found it. The good part: the descriptions in that Analyze list are in
  plain words, that's how I picked betweenness. The bad part: the search box told me to 'say what
  to find' and then didn't understand me, the run said under a second and never finished, and the
  answer was in a column I had to drag into view by hiding another one. And the table header
  lied about what it was sorted by. That's the kind of thing QA catches."
