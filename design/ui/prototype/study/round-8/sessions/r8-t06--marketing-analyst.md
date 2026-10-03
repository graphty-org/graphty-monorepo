# Session: Les Miserables sample, first look -- Jordan (marketing network analyst)

Task as given: "You have never used this program before. You will practice on the
ready-made network of characters from the novel Les Miserables that comes with the
program, not on your own data. Get it on screen and work out what you have: how many
characters there are, how many connections between them, whether every character can
be reached from every other, and what facts are recorded about each character."

All commands run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t06--marketing-analyst/.

## Step 1 -- start screen (shots/tasks/r8-t06/01.png)

Think-aloud: "OK, start page. Open, New from data, drop a file. And -- good --
'Files are read on this computer and never uploaded', plus a 'Local only' badge up
top. That is the first thing I'd ask about with customer data, so that's answered
before I asked. Samples on the right: Les Miserables, 77 characters. So that's
question one already, assuming the card is telling the truth -- I'll check it.
There's a usage-data box covering the bottom. I always say no to these, I'd have
to clear it with IT anyway."

## Step 2 -- decline usage data, open the sample

    timeout 120 node app-b/study.mjs --try $PWD/tmp/round-8-sessions/r8-t06--marketing-analyst/02.png task:r8-t06 --click "No thanks" --click "Les Miserables"

Think-aloud: "Whoa, it opens with a lot already done. A whole list on the left --
PageRank, Louvain, Shortest paths, Density, Link prediction, Watchlist, 'For the
report' -- I didn't do any of that. I guess those are the 'worked examples' the card
mentioned. The map itself is fine, colored by PageRank with a legend top left, labels
on the big ones. Not a total hairball. But nothing on screen says '77 characters,
254 connections' in plain view. Right panel is all about styling PageRank, which is
not what I came for. There's a 'Table' thing at the bottom -- I always want the
table, let's open it."

## Step 3 -- open the table

    timeout 120 node app-b/study.mjs --try $PWD/tmp/round-8-sessions/r8-t06--marketing-analyst/03.png task:r8-t06 --click "No thanks" --click "Les Miserables" --click "Table"

(The tool reported two controls called "Table" and clicked the first.)

Think-aloud: "There's my table. '77 nodes, sorted by degree', rows 1 to 77 of 77.
So 77 characters, matches the card. Good, I believe it now. Columns: label, Notes,
group, Degree, Rank by degree, PageRank, Rank by PageRank... 'Columns: 9 of 9'.
Valjean on top with 36, which is what I'd expect -- he's the main character -- so
the ranking passes my sniff test. But which of these columns are facts about the
character and which did the program compute? Degree and PageRank are obviously
math. 'group' -- no idea what that is. And there's an 'Edges' tab next to Nodes."

## Step 4 -- the Edges tab

    timeout 120 node app-b/study.mjs --try $PWD/tmp/round-8-sessions/r8-t06--marketing-analyst/04.png task:r8-t06 --click "No thanks" --click "Les Miserables" --click "Table" --click "Edges"

Think-aloud: "254 edges. Source, target, value -- Cosette and Valjean, 31. I'd guess
value is how many times they show up together. So 254 connections. Two of four
answered. Now 'can everyone reach everyone' -- the picture looks like one blob,
but there could be a loner hiding off the edge, and I'm not going to trust my eyes
on that. Nothing in the table says it. Maybe the 'Data' button on the left has a
summary."

## Step 5 -- the Data section

    timeout 120 node app-b/study.mjs --try $PWD/tmp/round-8-sessions/r8-t06--marketing-analyst/05.png task:r8-t06 --click "No thanks" --click "Les Miserables" --click "Data"

(The tool reported two controls called "Data" -- the left rail button and a tab
on the right -- and clicked the first.)

Think-aloud: "OK, THIS is the page I wanted first. Right side, 'Summary': Nodes 77,
Edges 254 'each a distinct pair', Undirected, Density 0.0868, Connected components
1, average degree 6.60, highest 36. One connected component -- that's the 'is
everyone reachable' answer: it's all one piece, nobody stranded. I know that term
from the Gephi tutorials; my VP wouldn't, but I do.

Left side has 'Attributes'. Nodes, 'In use (2)': label and group. 'Other
attributes': betweenness and degree. Edges: value. 'Results': Louvain and PageRank.
So I read it as: the file came with label, group, betweenness and degree for each
character, and the program itself worked out Louvain and PageRank. Mildly
surprised the file already had betweenness and degree baked in -- somebody
pre-computed those, like my colleague's notebook does. Still don't know what
'group' means; the source is miserables.gexf, and nothing tells me who set the
groups or why. I'd want one line on that before I quote it.

Honestly this summary should be the first thing I see when I open something. I had
to go hunting -- I clicked Table first because that's what Gephi trained me to do."

## Step 6 -- checking the "1"

    timeout 120 node app-b/study.mjs --try $PWD/tmp/round-8-sessions/r8-t06--marketing-analyst/06.png task:r8-t06 --click "No thanks" --click "Les Miserables" --click "Data" --click "1"

Think-aloud: "The 1 is a link, so I clicked it to see what it means. It flipped the
left panel back to that Graph list and opened the table with every row highlighted
blue. I guess it's saying 'these 77 are your one component' -- all rows selected =
everyone's in it. That works, but it yanked me off the summary I was reading, and
it didn't say anything like 'all 77 characters are in one connected group'. I had
to infer it from the blue. I'm fine, but I'd have to explain it to anyone I show."

Off-topic, in character: "This is the kind of summary Brandwatch used to give you
before they lost half the Instagram data. Now I get whatever CSV they feel like
exporting and no summary at all."

## Answers I would give the moderator

- Characters: 77.
- Connections: 254 (undirected, each a distinct pair, weighted by 'value' -- I assume
  times they appear together).
- Every character reachable from every other: yes -- one connected component.
- Facts recorded per character: label (name) and group from the file, plus
  betweenness and degree that came in the file already computed. Louvain and PageRank
  are results the program added. I'm not sure what 'group' means.

## Debrief

- Did I succeed? Yes, I think so. The one thing I'm unsure about is whether
  betweenness and degree count as "facts recorded" or are just math someone did
  earlier, and what 'group' is.
- Single Ease Question: 5 of 7. Easy once I found the Data summary; the sample opens
  busy with a lot of pre-made work I didn't ask for, and the summary was not where I
  looked first.
- Would I use this instead of my current tool? For a first look at a file, maybe --
  the summary panel plus a real table plus "never uploaded" beats opening Gephi.
  But I haven't seen it take my own 30,000-row mention export yet, and I haven't
  gotten a CSV out. Ask me again after that.

## What went well / badly (her words)

- Good: "Files are read on this computer and never uploaded" on the start page.
- Good: Summary panel -- nodes, edges, components in one block.
- Good: Table shows "77 nodes" and "254 edges" counts right in the header.
- Bad: the summary lives behind "Data"; I went to Table first and the main screen
  never states the counts.
- Bad: clicking the component count jumped me away from the summary and only
  highlighted rows -- no plain sentence.
- Bad: no explanation of what 'group' is or where it came from.
- Bad: the sample opens pre-loaded with lots of analysis rows I didn't create; a
  first-timer can't tell what is data and what is somebody's worked example.
