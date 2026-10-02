# Session: bring in a saved file and check it arrived whole -- Explorer Elena

Task as read by the moderator: "A colleague saved the network of characters onto your computer
for you. Bring it into graphty, starting from the screen you see, and check it arrived whole. The
data on screen is a sample: characters of the novel Les Miserables, linked when they appear in the
same chapter. If that is not your line of work, treat them as your own people or things."

Start screen: shots/tasks/t14/01.png (a start page with "Open project or file...", "New from
data...", a recent projects list and a Samples column).

All commands were run from design/ui/prototype. Renders are in
tmp/round-7-sessions/t14--explorer-elena/.

## Step 0 -- the start screen

Elena: "OK, so there's a 'Les Miserables' right there on the right under Samples. But she said she
saved it onto my computer, so that one's probably the demo copy, not hers. I have a file. 'Open
project or file...' -- that's the one. There's also 'drop a file anywhere', but I don't have it
open in a folder right now. I'll just click Open."

## Step 1 -- Open project or file

    timeout 120 node app-b/study.mjs --try $PWD/tmp/round-7-sessions/t14--explorer-elena/01.png task:t14 --click "Open project or file..."

Screen (01.png): no file chooser that I saw. It went straight to a full graph titled "Les
Miserables" at the top, orange dots, some names (Valjean, Javert, Cosette, Marius), a key box
"Color: PageRank ... Size: Degree", and a left list with PageRank, Louvain "6 groups", Shortest
paths, Watchlist, "For the report", Betweenness.

Elena: "Oh -- it just opened. I guess it picked her file? It says Les Miserables up top, so yes.
Huh, it already has a lot of stuff on it. Shortest paths, a watchlist, 'For the report'... did my
colleague already do all this? I thought she just saved the data. Whatever, it's here."

"Valjean is the big dark one in the middle, so he's the main character -- makes sense, he's in
everything." (She reads dark-and-central as most important; she did not read the key, which says
the color is PageRank and the size is degree.)

"Now -- 'check it arrived whole'. How do I know nothing's missing? There's no number of rows
anywhere I can see on this screen. The sample said 77 characters. Let me look for where the data
lives. 'Data' on the left, that sounds right."

## Step 2 -- Data

    timeout 120 node app-b/study.mjs --try $PWD/tmp/round-7-sessions/t14--explorer-elena/02.png task:t14 --click "Open project or file..." --click "Data"

Screen (02.png): left panel "Data  Les Miserables", Sources: "miserables.gexf -- 77 nodes, 254
edges", then "nodes -- node . 77 nodes", "edges -- edges . 254 rows, 254 edges". Right panel
Summary: Nodes 77, Edges 254, Connected components 1, and a small curve chart.

Elena: "OK. miserables.gexf -- that must be the file she sent. 77... nodes. Nodes are the dots, I
think. 77, and the sample said 77 characters. Good, that matches. 254 edges -- the lines. '254
rows, 254 edges' -- so every row became a line, nothing dropped? I think that's what it means.
'Connected components 1' -- no idea, but it's a 1, not a warning, so fine."

"I don't really know if 254 is right, I never counted the links. Nobody told me how many there
should be. But the two numbers match, so I'll take it."

## Step 3 -- detour: "New from data..." (started over to compare)

Elena: "Actually, wait. I didn't really see myself open anything -- it just went in. Let me make
sure I didn't open some old project instead of her file. The other button was 'New from data'."

    timeout 120 node app-b/study.mjs --try $PWD/tmp/round-7-sessions/t14--explorer-elena/03.png task:t14 --click "New from data..."

Screen (03.png): a big table titled "Door entries, March 2026", "Open as a new graph", people 412,
buildings 9, entries 4,212, yellow warning marks "Not in people", "Not in buildings", a "Match
report" with "Add as people / Leave out", and Cancel / Load at the bottom.

Elena: "Whoa. Door entries? That's not mine at all, that's somebody's building badge data. And it
has warnings all over it. I'm not touching that. Cancel. ... OK so 'New from data' is for some
other thing. The Open one was right."

(Engagement dropped a little here: she backed out and did not try to understand the warnings or
whether this screen was also how her own file would have come in.)

## Step 4 -- clicking the file to see what's in it

Elena: "Let me click the miserables file itself, maybe it shows me what was in it."

    timeout 120 node app-b/study.mjs --try $PWD/tmp/round-7-sessions/t14--explorer-elena/04.png task:t14 --click "Open project or file..." --click "Data" --click "miserables.gexf"

Screen (04.png): "Edit: miserables.gexf", "Makes  Les Miserables: 77 nodes, 254 edges", a table of
id / label / group with Myriel, Napoleon, Mlle.Baptistine, Mme.Magloire... "Showing the first 8 of
77 rows." At the bottom: "Match report: nodes -- 77 rows; every id is unique." Cancel and a grayed
Apply.

Elena: "Oh, here are the names. Myriel, Napoleon... Those look like real names, not codes. '77
rows; every id is unique' -- OK, so no duplicates. That's actually what I wanted to know. Good."

"It says 'Edit' though. I don't want to edit anything. Apply is gray, so I didn't change anything.
I'll hit Cancel and leave it."

Elena stopped here.

## Wrap-up

**Did she think she succeeded?** Yes, mostly. "It opened, it's the Les Miserables file, 77
characters like it said, and 254 lines with 254 rows so nothing fell out. The names look right."
Lingering doubt: "I never actually picked a file -- I just clicked Open and it was there, with a
bunch of extra stuff already on it. If my colleague had sent me two files I wouldn't know which
one it opened."

**Single Ease Question (1-7):** 5. "Getting it in was one click. Figuring out whether it was all
there took me some digging -- the main screen doesn't say how many there are, I had to go into
Data. And that other button scared me a bit."

**Would she use this instead of her current tool?** "Maybe. Honestly my current tool is a
spreadsheet, and this is a lot nicer for seeing who's connected to who. And it said the files
stay on my computer, which I liked. But I'd want it to tell me 'loaded 77 of 77, nothing missing'
right when it opens, instead of me having to go find the numbers and guess whether 254 is right."

## Observations for the study team (moderator notes, not Elena's words)

- "Open project or file..." showed no visible file chooser in this run and landed directly on a
  fully worked project (algorithm results, saved paths, a report folder, notes). Elena could not
  tell whether she had opened the colleague's raw file or someone's saved project, and briefly
  suspected she had opened the wrong thing.
- The "arrived whole" evidence exists but is one panel away: the Data panel's "254 rows, 254
  edges" and the file view's "77 rows; every id is unique". The graph screen she landed on shows
  no counts and no load confirmation. She found the counts by guessing that "Data" was the place.
- She had no expected edge count to compare 254 against, so "whole" for edges rested only on rows
  equaling edges, which she half-understood.
- "New from data..." opened a different dataset (door entries) with warning marks; she read it as
  someone else's data and cancelled. This raised her doubt instead of resolving it.
- The file view is titled "Edit: miserables.gexf"; the word Edit made her wary even though Apply
  was disabled.
- Misreading: she took the darkest, most central dot (Valjean) as "the main character" without
  reading the key (color = PageRank, size = degree). Here the reading happened to be roughly right.
