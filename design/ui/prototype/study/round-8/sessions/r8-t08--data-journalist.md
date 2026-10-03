# Session: find the circles of characters in Les Miserables -- the reporter with a contacts sheet

Participant: Ruth, a reporter on an investigations desk, first time with graph tools (persona file
study/personas/data-journalist.md).

Task as given: "You have never used this program before. You will practice on the ready-made
network of characters from the novel Les Miserables that comes with the program, not on your own
data. Have the program pick out the circles of characters who keep turning up together. Tell us
how many circles it came up with, how big the largest one is, and which character is at its
center."

All commands were run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t08--data-journalist/.

## Step 1 -- the start screen (shots/tasks/r8-t08/01.png)

"OK, a start page. Samples on the right, Les Miserables is the first one, '77 characters', and the
blurb even says 'good for a first look at communities'. Fine. There's a big box at the bottom
asking to collect usage data. I don't share anything I don't have to -- No thanks. I like that it
says files are read on this computer and never uploaded, and 'Local only' up top."

## Step 2 -- open the sample (02.png)

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t08--data-journalist/02.png task:r8-t08 --click "No thanks" --click "Les Miserables"

"Whoa, that's a lot already. Everything's orange, there's a key that says 'Color: PageRank'. The
list on the left has PageRank, Louvain '6 groups', Shortest paths, Density, Watchlist, 'For the
report' with Group 2 and Group 8... Somebody has already been working in here. Louvain -- is that
a person? A place in France? It says 6 groups, so maybe that's grouping. But the task says to have
the program pick out the circles, so I want to make it do it myself, not trust somebody's leftovers."

## Step 3 -- what is the flask button? (03.png)

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t08--data-journalist/03.png task:r8-t08 --click "No thanks" --click "Les Miserables" --hover "Analyze"

Tooltip: "Analyze Shift+A". "Analyze. That sounds like where you make it do things."

## Step 4 -- open Analyze (04.png)

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t08--data-journalist/04.png task:r8-t08 --click "No thanks" --click "Les Miserables" --click "Analyze"

"A list: Louvain again under Recent, PageRank, Shortest path, then 'Rank nodes and edges' --
Degree, Betweenness, Closeness... jargon. But the box says 'Search, or say what to find'. Good,
I'll just say it in English."

## Step 5 -- say what I want (05.png)

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t08--data-journalist/05.png task:r8-t08 --click "No thanks" --click "Les Miserables" --click "Analyze" --type "groups of characters"

Result: 'No match for "groups of characters"'.

"It told me to say what to find and then didn't understand me. That's annoying. So it's a keyword
search pretending to listen. Let me try one word."

## Step 6 -- one word (06.png)

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t08--data-journalist/06.png task:r8-t08 --click "No thanks" --click "Les Miserables" --click "Analyze" --type "group"

"'Find groups': Louvain, Leiden with a 'Start here' tag, Label propagation. So Louvain IS a
grouping thing. Leiden says 'Start here' -- I'm new, I'll do what it tells me."

## Step 7 -- Leiden (07.png)

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t08--data-journalist/07.png task:r8-t08 --click "No thanks" --click "Les Miserables" --click "Analyze" --type "group" --click "Leiden"

"Weight, 'Higher means Stronger / Farther / Capacity', Resolution 1.0. I have no idea what
resolution means here. It says all 254 edges have a weight, none left out -- I like that it tells
me nothing was dropped. I'll leave the defaults and hit Run. 'Under a second', good."

## Step 8 -- Run (08.png)

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t08--data-journalist/08.png task:r8-t08 --click "No thanks" --click "Les Miserables" --click "Analyze" --type "group" --click "Leiden" --click "Run"

A dark box: "Would add Leiden at the top of the list, running". The panel stays, the picture does
not change, nothing new in the list.

"'Would add'? Would? Did it or didn't it? Nothing new on the left, the picture's the same. I
clicked Run and nothing ran. OK -- I give up on making it do it fresh. The Louvain line said 6
groups already, and Analyze told me Louvain finds groups. I'll go read that one."

## Step 9 -- the Louvain line (09.png)

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t08--data-journalist/09.png task:r8-t08 --click "No thanks" --click "Les Miserables" --click "Louvain"

(The tool noted "Louvain" matched both a tab and the list row; it clicked the tab.)

A table opens below the picture: "6 communities", Community 1 size 25, Community 2 17, 3 is 10,
4 is 10, 5 is 9, 6 is 6, with density, edges inside, edges leaving.

"Now this I can read. Six communities, a table I can check line by line. Largest is Community 1
with 25. But the picture is still all orange -- I can't SEE the circles on the map at all. And
the table doesn't tell me who's in them or who's the center."

## Step 10 -- the largest one (10.png)

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t08--data-journalist/10.png task:r8-t08 --click "No thanks" --click "Les Miserables" --click "Louvain" --click "Community 1"

Right panel: Community 1, Group from Louvain. Size 25 nodes. Hub: "Gavroche, 16 links inside".
Made with: all at their defaults.

"Hub: Gavroche, 16 links inside. That's my center. And it tells me why -- 16 ties inside the
circle -- which is something I could say to an editor. 'All at their defaults', fine.

But hang on. The table at the bottom now shows characters with a 'group' column, and Gavroche
says group 8. Valjean group 2. And on the left under 'For the report' there's 'Group 8, 13 nodes'
and 'Group 2, 14 nodes'. So is Gavroche in a group of 25 or a group of 13? Are those the same
groups with different numbers? Different groupings? Somebody else's? This is exactly the kind of
thing that gets a correction printed."

## Step 11 -- check Gavroche (11.png)

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t08--data-journalist/11.png task:r8-t08 --click "No thanks" --click "Les Miserables" --click "Louvain" --click "Community 1" --click "Gavroche, 16 links inside"

Gavroche is ringed on the map, "Gavroche, 22 connections". The right side says why he looks the
way he does: PageRank color, which "covers Louvain ... Group 8".

"22 connections overall, 16 of them inside the circle -- that adds up, fine. But again 'Group 8'.
I'll go with what the Louvain table says, since that's the one that called itself 6 groups, and
I'd ask somebody about the Group 8 thing before printing anything."

Stopped here.

## Answer given

- Circles: 6
- Largest: 25 characters (Community 1)
- At its center: Gavroche (16 ties inside that circle)

## Debrief

Did I succeed? "I think so -- six, twenty-five, Gavroche. But I didn't make the program find them;
I pressed Run and it said it 'would' do something and didn't. I read a grouping someone had
already done. And I'm only about 70 percent sure, because the same character is 'group 8' in one
place and the hub of 'Community 1' in another."

Single Ease Question (1 = very difficult, 7 = very easy): 4.

"Getting the numbers was quick once I found the table, and the 'Hub, 16 links inside' line is
the best thing here -- it tells me what was counted. But the search box asked me to say what I
want and then didn't understand plain words, Run did nothing I could see, the map never showed
the circles in color, and two different numbering systems for groups is a trust problem."

Would I use this instead of what I use now? "Maybe -- I don't have a network tool now, I have a
spreadsheet and I've been told Gephi is a slog. The table of communities with sizes and edges
inside is the kind of thing I'd hand a fact-checker, and it stays on my computer, which matters
for unpublished names. But I would not trust it for a story until the group numbers agree with
each other and I can watch it actually run on my own data."

## Problems seen

1. Analyze's box says "Search, or say what to find", but plain words ("groups of characters")
   get "No match"; only the keyword "group" works. (severity: medium)
2. Run on Leiden showed only "Would add Leiden at the top of the list, running"; no new row, no
   visible change. The participant could not make the program find the groups herself and fell
   back on a grouping already in the sample. (severity: high for this task)
3. The node table's "group" column (Gavroche = 8, Valjean = 2) and the "For the report" rows
   (Group 2, 14 nodes; Group 8, 13 nodes) use numbers that do not match the Louvain communities
   (Community 1, 25 nodes, hub Gavroche). The participant could not tell whether these are the
   same grouping. (severity: high -- it undermines trust in the answer)
4. The map stays colored by PageRank; the communities are never visible as colors on the
   picture, so "circles of characters" cannot be seen, only read in a table. (severity: medium)
5. "Louvain" and "Leiden" mean nothing to a newcomer; only the one-line descriptions under them
   and the "Start here" tag carried her. (severity: low)
6. The sample opens already full of someone's earlier work (PageRank, paths, watchlist, groups),
   which made it unclear whether to trust or redo what was there. (severity: low)

## What worked

- "Hub: Gavroche, 16 links inside" -- names the center and says what was counted.
- The communities table: size, density, edges inside, edges leaving, in one place.
- "All 254 edges have value set; none is left out" in the Leiden panel.
- "Local only" and "never uploaded" visible from the first screen.
