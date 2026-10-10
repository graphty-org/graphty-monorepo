# Session r1-s55 -- Ruth (returning), task T12R, dataset A (Les Miserables)

Build: 946256efb876 (REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r1d4-946256efb/)
Tool: design/ui/studio/tool/real.mjs, run from design/ui/studio/tier2, S=rounds/round-1/sessions/r1-s55

## Step 1 -- start

Command: `REAL_DIST=... with-browser.sh node ../tool/real.mjs --start $S setup:lesmis-ranked.txt` -> 01.png

Sees: the Les Miserables map is open, dots colored and sized by PageRank, a PageRank layer in the
left list with 77 beside it. The find box "Find nodes, edges, values" is top left, where it was
last time. "77 -- I take it that is the number of characters. Fine."

Next: type Javert into the find box, the way I always start.

## Step 2 -- type Javert

Command: `--step $S --click "Find nodes, edges, values" --type "Javert"` -> 02.png

Sees: "Nodes 1 -- Javert" and "Edges 17", listing Javert -- Valjean, Fantine, Thenardier,
MmeThenardier, Cosette, Fauchelevent -- Javert, and more below. "Seventeen ties. Noted. But that is
a search hit count; I want it from his own page."

Next: click the Javert node result to open his page on the right.

## Step 3 -- open Javert

Command: `--step $S --click "Javert"` -> 03.png (tool note: the name matched 18 results; it took the
first, the node "Javert")

Sees: Javert is highlighted yellow on the map; right side says Javert, Node, Values tab: id Javert,
name Javert, Degree 17 with an arrow, and Results: PageRank 0.0303, #5 of 77. "Degree 17 -- matches
the 17 edges the search found. The arrow beside it is where his list was last time."

Next: click Degree to open his list of connections.

## Step 4 -- open his connections

Command: `--step $S --click "Degree"` -> 04.png

Sees: right side now says "Javert, Neighborhood", "Back to Javert", "Javert's 17 connections",
a "Hops 1 / 2 / 3" switch with 1 chosen, a "Filter to neighbors" button, then the names in
alphabetical order. Reading them aloud: Babet, Bamatabois, Claquesous, Cosette, Enjolras, Fantine,
Fauchelevent, Gavroche, Gueulemer, MmeThenardier, Montparnasse, Simplice, Thenardier, Toussaint,
Valjean, Woman1, Woman2. That is 17 -- I counted, and it matches the heading, the Degree row and the
17 edges the search showed. The left list's Selection now says 18: him plus 17. The map lights up
the same dots in yellow.

Checking one link: the search in step 2 listed "Javert -- Valjean" as an edge, and Valjean is in
this list. Held.

The Hops switch and "Filter to neighbors" are new since last time. I leave them alone: Hops 1 is
already chosen and the list is the one I wanted. The list was where I expected it, one click from
his page.

Next: nothing; I have the answer.

## End

Command: `--end $S`

## In Ruth's words, at the end

- **Finished?** Yes. Javert shares chapters with 17 characters: Babet, Bamatabois, Claquesous,
  Cosette, Enjolras, Fantine, Fauchelevent, Gavroche, Gueulemer, MmeThenardier, Montparnasse,
  Simplice, Thenardier, Toussaint, Valjean, Woman1 and Woman2. What the program knows about him:
  id and name Javert, 17 connections, PageRank 0.0303, fifth of 77.
- **Ease:** 6 of 7. Four steps, and every count agreed with every other count (17 edges in search,
  Degree 17, "17 connections", 17 names I counted, Selection 18 with him).
- **What confused me:**
  - Nothing on screen says that a tie means "appear in the same chapter". I am taking the task's
    word for that; the program only calls them connections. I can't confirm what a tie counted.
  - The new Hops 1/2/3 switch sits between the heading and the names. "Hops" is not a word I know
    here; I left it on 1 because the list already matched the heading. If it had been on 2 I am not
    sure I would have noticed the list had changed meaning.
  - Clicking the name in the search results opened him, but the search also listed 17 edges with
    his name, so it took a second to see which row was the person.
  - "PageRank 0.0303, #5 of 77" -- I know where it came from (I ran it last time), but the page
    does not say what the 0.0303 counts.
