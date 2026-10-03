# Session: fraud analyst (Sarah) -- find Javert, read what is known, see who shares chapters with him

Task as given by the moderator: "You have never used this program before. You will practice on
the ready-made network of characters from the novel Les Miserables that comes with the program,
not on your own data. Go to the police inspector Javert, read what the program knows about him,
and see which characters he shares chapters with."

Mode: first-impression patience (not mandated). Start screen: shots/tasks/r8-t12/01.png.
All commands were run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t12--fraud-analyst/. Every run replays from the start screen; the
common prefix is written as PREFIX below.

## Think-aloud

**01 (start screen).** Home page. "Local only" top right and "Files are read on this computer
and never uploaded" -- good, that is the first thing compliance asks me. Then a big banner asking
to share usage data. No. Samples on the right, Les Miserables first, "77 characters". Fine.

**02** `--click "No thanks" --click "Les Miserables"`
Opens straight into a chart with every dot orange, a "Color: PageRank" box I am not going to read,
and a left list with Louvain, Shortest paths, Density, Link prediction, Betweenness... that is
somebody's analysis already loaded, not mine. I can see a "Javert" label in the middle but it is
jammed against "Valjean" -- the two labels overlap. First search-looking box: "Find rows and
notes". Rows? I want a person. I'll try it anyway.

**03** `PREFIX --click "Find rows and notes"` -- box focused, nothing else.

**04** `... --type "Javert"` -- I typed Javert. Nothing happened. No results dropdown, the list
did not filter. Is it searching at all?

**05** `... --key Enter` -- Enter does it. Now there is a result list: "Nodes: Javert, 17
neighbors", then "Rows" (two shortest paths and a Watchlist) and two notes. OK, that I can work
with. The "17 neighbors" is the count I actually want. Oddly the right panel switched to a
summary of the whole network (77 nodes, 254 edges, density, a log-log chart) -- I did not ask
for that.

**06** `... --click "Javert 17 neighbors"` -- Javert gets a ring on the chart, a little label
"Javert, 17 connections" and a row of five unlabeled icons under it. The right panel says
"Javert / Node" and opens on a "Style" tab, "Why this look", PageRank, Louvain, Betweenness...
I don't care why he is orange. I want what the program knows about him. There is a "Data" tab
next to Style.

**07** `... --click "Data"` -- WRONG Data. It took me to a whole different screen (left side:
Sources, Filters, Attributes for the file) and Javert is gone from the right panel -- it went
back to the whole-network summary. Two things on screen called "Data" doing different things.
Where's my person?

**08** `... --click "tab Data"` -- nothing on screen called that; I was trying to aim at the
little tab. (Tool limitation as much as mine.)

**09** `... --click "Javert 17 neighbors" --click "Style" --key ArrowRight` -- went keyboard:
click the Style tab, arrow right. That got me the Data tab. Now this is the profile: from
miserables.gexf, id 27, label Javert, group 4, PageRank 0.0303 "#5 of 77", Degree 17 "#4 of 77",
betweenness 0.0543. Memberships: Watchlist, Valjean to Javert, Myriel to Javert, Top 9 by
degree, Group 4. One note. Good -- "#4 of 77" I understand without knowing what degree means.
The "#5 of 77" next to PageRank is useful the same way. This part is fine. But there is no list
of WHO he is connected to here. I have the number 17, not the names.

**10** `... --hover "Javert, 17 connections"` -- that small label is not a control, no tooltip.

**11, 13** Hovering the icons under Javert. The run needs a name, so I tried what I would expect
a button to be called: "Neighbors" (nothing), then "Neighborhood" -- tooltip "Neighborhood G".
"Select neighbors", "Show neighbors", "Expand" -- nothing. Five icons with no words; I would
have had to hover every one of them.

**12** `... --key ArrowRight --click "Edges"` -- tried the table at the bottom instead, the
Excel instinct. Edges table: source, target, value, 254 edges, sorted by value. Cosette-Valjean
31, Marius-Cosette 21... Javert-Valjean 17 is in there, row 5. But it is all 254, not Javert's.
I'd have to page through 13 pages and pick his out by eye. In Excel I'd filter the column in
two seconds; I see no filter on the column.

**14** `... --click "Neighborhood"` -- a popup: "Neighborhood of Javert, Distance 1 2 3 edge
away, Covers: Javert and 17 neighbors", buttons "Add as steps" and "Filter to neighbors".
Finally. "Filter to neighbors".

**15** `... --click "Filter to neighbors"` -- toast "Added filter step: Neighbors of Javert,
1 edge away", top bar now says "18 of 77 nodes". But the chart did not change, every dot is
still there. And the right panel now says VALJEAN, not Javert. I didn't click Valjean. Where's
my person?

**16** `... --click "Table"` -- Nodes table: header says "18 of 77 nodes" but the pager says
"Rows 1 to 77 of 77". Which is it? Valjean 36, Gavroche 22, Marius 19, Javert 17... Gavroche
and Marius are probably his. The table only shows four rows because the chart takes the room.

**17** `... --click "Edges"` -- Edges table, still "254 edges", still Cosette-Valjean at the
top, which has nothing to do with Javert. So the filter did not reach the links either.

I stop here. I've used my five minutes.

## Commands run (verbatim; PREFIX = `timeout 120 node app-b/study.mjs --try <dir>/NN.png task:r8-t12 --click "No thanks" --click "Les Miserables"`)

```
02 PREFIX
03 PREFIX --click "Find rows and notes"
04 PREFIX --click "Find rows and notes" --type "Javert"
05 PREFIX --click "Find rows and notes" --type "Javert" --key Enter
06 ... --key Enter --click "Javert"            (tool: ambiguous, 5 matches, clicked "Javert 17 neighbors")
07 ... --click "Javert 17 neighbors" --click "Data"   (tool: ambiguous, button vs tab; clicked the rail button)
08 ... --click "Javert 17 neighbors" --click "tab Data"  (nothing on screen is called "tab Data")
09 ... --click "Javert 17 neighbors" --click "Style" --key ArrowRight
10 ... --key ArrowRight --hover "Javert, 17 connections"   (tooltip: null)
11 ... --key ArrowRight --hover "Neighbors"     (nothing on screen is called "Neighbors")
12 ... --key ArrowRight --click "Edges"
13 ... --click "Javert 17 neighbors" --hover "Neighborhood" | "Select neighbors" | "Show neighbors" | "Expand"
   (only "Neighborhood" exists: tooltip "Neighborhood G")
14 ... --key ArrowRight --click "Neighborhood"
15 ... --click "Neighborhood" --click "Filter to neighbors"
16 ... --click "Filter to neighbors" --click "Table"
17 ... --click "Filter to neighbors" --click "Table" --click "Edges"
```

## Outcome

- Found Javert: yes, through the search box, but only after pressing Enter -- typing alone did
  nothing.
- Read what is known about him: yes, once I reached the node's Data tab (id, group, PageRank
  #5 of 77, degree 17 #4 of 77, betweenness, memberships, one note). Getting to that tab cost me
  a wrong turn: the left rail also has a "Data" and it threw my person away.
- Which characters he shares chapters with: NOT really. I got the count (17) three different
  ways, and a filter that says "18 of 77 nodes", but the chart kept showing all 77, the table
  pager still said 77 of 77, the edge table still listed all 254 links, and the selection jumped
  from Javert to Valjean. I can name maybe Valjean, Gavroche and Marius from what was on screen.
  I could not write down the 17 names with any confidence.

Do I think I succeeded? Partly. Two of three. The part I actually needed -- the list of who he
is linked to, with how many chapters each -- I never got clean.

Single Ease Question: **3 / 7**.

Would I use this instead of my current tool? No, not on this showing. The person profile was
decent and "#4 of 77" is the kind of plain ranking I'd actually put in a narrative, and I like
"Local only" up front. But my first question on any case is "who are this account's
counterparties, and how much with each", and here that took a hidden icon, a popup, and a filter
that then did not visibly filter anything and swapped my subject for someone else. In i2 I
expand the entity and get the links; in Excel I filter the source/target column. Both give me
the 17 names in seconds. Until a selected person gives me a plain list of their links with the
counts, I'm doing it in the spreadsheet anyway.

## Problems observed (in her words, ranked)

1. "Filter to neighbors" says 18 of 77 but the chart, the node pager (77 of 77) and the edge
   table (254) all still show everything -- I can't tell if it worked. (15, 16, 17)
2. After filtering, the right panel switched from Javert to Valjean on its own. (15)
3. No list of a person's links with their counts on the person's own panel; the neighbor
   count is there, the names are not. (09)
4. Two different things called "Data" -- the left rail one wipes the selected person. (07)
5. Search does nothing until Enter; no live results. (04)
6. The neighbor action is an unlabeled icon among five unlabeled icons. (06, 11, 13)
7. The person panel opens on "Style / Why this look" instead of the facts. (06)
8. Edge table has no obvious per-column filter. (12)
9. Javert and Valjean labels overlap on the chart. (02)
10. Table area shows only four rows under the chart. (16)
