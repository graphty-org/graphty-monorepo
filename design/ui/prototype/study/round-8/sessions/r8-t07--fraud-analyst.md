# Session: rank the characters by how much the network depends on them (fraud analyst)

Participant: Sarah, level-2 financial crime investigator (persona: study/personas/fraud-analyst.md).
Mode: first use, not mandated; about five minutes of goodwill.
Task as given: "You have never used this program before. You will practice on the ready-made
network of characters from the novel Les Miserables that comes with the program, not on your own
data. Have the program put the characters in order of how much the whole network depends on
them, and tell us the top three, in order, and what the order was based on."

Start screen: shots/tasks/r8-t07/01.png. Renders: tmp/round-8-sessions/r8-t07--fraud-analyst/NN.png.
All commands run from design/ui/prototype. Prefix for every command below:
`timeout 120 node app-b/study.mjs --try <render> task:r8-t07`

## Steps, thinking aloud

**01 (start screen).** "Samples on the right. Les Miserables, 77 characters. And a box at the
bottom asking to collect usage data. No. 'Local only' and 'never uploaded' -- good, that's the
first thing I'd have asked."

**02** `--click "No thanks" --click "Les Miserables"`
"OK, a picture and a long list on the left that somebody already filled in. PageRank, Louvain,
Shortest paths, Density, Link prediction, Betweenness... that's a lot of words I don't use. The
dots are all orange-brown. There's a 'Table' at the bottom. I want a list I can sort, so table."

**03** `... --click "Table"`
"Now we're talking. 77 rows, sorted by degree. Valjean 36, Gavroche 22, Marius 19. 'Valjean is
first on all three measures; Gavroche is in the top 3 on all three.' Which three measures? I can
see degree and PageRank, the third is off the edge. Degree I'll guess is how many links each one
has -- the account everything touches. But the question said 'depends on'. Most links is not
the same thing as depends on. In my world the one that matters is the pass-through account: take
it out and the money can't get from A to B. Let me see what the program offers."

**04** `... --hover "Analyze"` -- tooltip "Analyze Shift+A". (I found it by guessing a name for
the flask button; I would not have known the flask means analyze.)

**05** `... --click "Analyze"`
"A list. 'Rank nodes and edges.' PageRank says 'Start here' -- I don't trust a button that tells
me where to start. Degree, Total value, Betweenness, Closeness, Eigenvector. There's a search
box that says 'say what to find'. I'll say it."

**06** `... --click "Analyze" --type "depends on"` -- "No match for 'depends on'."
"It said 'say what to find'. I said it. Nothing."

**07** `... --type "hub"` -- Degree, and HITS ("needs direction").
"Hub gets me Degree. Fine, that's what I thought degree was."

**08** `... --type "hub" --click "Degree"`
"Top 10 on the right with numbers. Valjean 36, Gavroche 22, Marius 19, Javert 17. That's the most
connected. Still not 'depends on'. The Betweenness line earlier said something about shortest
paths. Let me rest on it."

**09** `... --click "Analyze" --hover "Betweenness"` -- the name matched the row in the left list
too; the hover failed and nothing told me why. Narrowed it with the search instead.

**10** `... --type "betweenness" --hover "Betweenness Which nodes sit on the most"`
Tooltip: "Centrality family. Betweenness: the share of shortest paths between other nodes that
pass through a node."
"'Pass through.' That I understand. That's my pass-through account: everyone else's route goes
through it. That's dependence. The 'Centrality family' bit means nothing to me."

**11** `... --click "Betweenness Which nodes sit on the most"`
"A form. Weight, 'Higher means: Stronger / Farther / Capacity', 'reads a weight as distance: it
uses 1/value.' I'm not touching any of that. Defaults. 'Under a second.' Run."

**12** `... --click "Run"` -- a new row "Betweenness 2" appears at the top of the left list with a
spinner and a progress line. Picture unchanged.

**13** `... --click "Run" --click "Betweenness 2"`
"Still spinning. It said under a second. The right side still shows the graph summary, not my
result. Nothing to read."

**14** `... --click "Run" --key Escape --click "Table" --click "Betweenness 2"`
"I pressed Escape to get rid of whatever was open, and my run is gone -- 'nothing on screen is
called Betweenness 2'. Did Escape cancel it? Nobody asked me. Back to the table: still sorted by
degree."

**15** `... --click "Betweenness"` (the row already in the list, under 'For the report', with a
crossed-out eye)
"There's already a Betweenness in here that someone made. 'Paints 77 nodes, none visible.
Covered by PageRank.' Yellow to orange. I don't want colors, I want numbers in order."

**16** `... --click "Betweenness" --click "Data"`
"I meant the Data tab on the right. It took me to a whole different Data screen on the left
rail: sources, filters, attributes. Where's my account... I mean my character?"

**17** `... --click "Data" --click "betweenness"`
"'betweenness, imported, not computed.' Range 0 to 0.57. So this number came in with the file;
the program didn't work it out. No list of who has what."

**18** `... --click "Table" --click "betweenness"` -- clicked the eye ("Show Betweenness")
instead of anything in the table; six things on screen are called betweenness.

**19** `... --click "Table" --click "# Betweenness (full graph)"` -- nothing called that.

**20** `... --click "Table" --click "Betweenness (full graph)"`
"There. The table jumped right, Betweenness column with a down arrow. Valjean 0.570 (#1 of 77),
Myriel 0.177 (#2), Gavroche 0.165 (#3), Marius 0.132 (#4). Rank column agrees. But the line
above the table still says 'sorted by degree'. Which is it? The numbers go down in the
Betweenness column and the arrow is on it, so I'll believe the column, not the caption. A
reviewer would catch that and ask."

Stopped here.

## Answer given to the moderator

"Valjean, then Myriel, then Gavroche. Based on betweenness -- how often the shortest route
between two other characters passes through that one. That's my reading of 'the network depends
on them'. If you meant 'most links', it's Valjean, Gavroche, Marius, by degree. Both lists are in
the same table. The betweenness numbers I used came with the file -- my own run never finished
that I could see."

## Debrief

- Succeeded? "Probably. I've got an order and I can say what it's based on. I'm not certain
  which measure you meant, and the program didn't help me pick: I had to read a tooltip to find
  the words 'pass through'."
- Single Ease Question (1-7): **3**.
- Would she use this instead of her current tool? "Not instead of anything. For this kind of
  question -- who's the pass-through -- i2 doesn't give me a number at all, so the table with a
  rank column is genuinely useful; I could paste that into a case file. But my own run spun and
  then vanished when I pressed Escape, the caption said one sort while the column said another,
  and the number I ended up using was imported, not calculated by the program. I can't put a
  number in a SAR when I can't say where it came from. Excel wouldn't have given me betweenness,
  but it would have told me the truth about what it's sorted by."

## Problems observed

1. Plain-language search in Analyze ("say what to find") found nothing for "depends on"; "hub"
   led to Degree, not to the pass-through measure the task wanted.
2. The only plain-words explanation of betweenness ("pass through a node") lives in a hover
   tooltip; the visible line ("sit on the most shortest paths between others") and "Centrality
   family" did not land.
3. Running Betweenness left a spinning row and no result past "under a second"; pressing Escape
   then removed the run without asking or saying so.
4. The Data tab in the inspector and the Data section on the left rail share a name; clicking
   "Data" went to the wrong one and lost her place.
5. Sorting the table by Betweenness left the caption reading "sorted by degree".
6. The betweenness she ended up citing was "imported, not computed"; nothing near the table says
   so, and the pre-made rows (PageRank, Betweenness, Top 9, Watchlist) made it unclear what she
   had done versus what was already there.
7. Six controls named "betweenness" on one screen; the first one she reached was a show/hide eye.
