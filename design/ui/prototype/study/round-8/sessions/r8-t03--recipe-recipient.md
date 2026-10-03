# Session: bring in miserables.gexf and check it all arrived -- Tom, the recipe recipient

Task as given: "You have never used this program before. A colleague sent you a network file of
the characters in Les Miserables and the chapters they share; you saved it as miserables.gexf in
your Downloads folder. Bring it into the program and, before you do anything else with it, check
that all of it arrived: how many characters, how many connections, and that nothing was dropped
on the way in."

All commands were run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t03--recipe-recipient/. Abbreviation below: `S=` the common prefix
`timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t03--recipe-recipient/NN.png task:r8-t03`
(the real commands used the absolute path to the PNG).

## 01 -- start screen (shots/tasks/r8-t03/01.png)

"OK. Big box at the bottom about usage data. I read the first line, 'Your data is yours, but
please help us.' Fine, no thanks. On the left it says 'Open project or file...' and, better,
'Files are read on this computer and never uploaded.' Good, that is the first thing I would
have asked. There is also a Les Miserables sample on the right, 77 characters. That is not my
file, that is theirs. I want the one in my Downloads."

## 02 -- open the file picker

    S --click "No thanks" --click "Open project or file..."

"A list of my Downloads. miserables-edited.graphml, miserables.gexf, a patent file. The one she
sent is the .gexf. I am not touching the 'edited' one."

## 03 -- pick the file and press Open

    S --click "No thanks" --click "Open project or file..." --click "miserables.gexf" --click "Open"

"It did not just open it, it shows me a table first. Across the top: 'Les Miserables: 77 nodes,
254 edges'. Nodes, I suppose, are the characters. Myriel, Napoleon, Mlle.Baptistine. At the
bottom, 'Match report: nodes. 77 rows; every id is unique.' That I can read. 77 characters.
There are little blue tags, 'Key', 'Name', 'auto', which I don't understand and won't touch.
Left side has 'nodes 77' and 'edges 254' with green ticks. I'll check the connections."

## 04 -- look at the edges table

    S ... --click "Open" --click "edges"

"'254 rows; every edge has both ends.' So nothing pointing at a character who is missing. 254
connections. There is a 'value' column with 1, 8, 10, and right above it, in grey, 'Weight: none
(each edge counts 1)'. Hm. So the numbers in that column are being ignored? Is that dropping
something? I don't know what weight means here. I'd probably ask her about this bit. Anyway,
'Load' is the blue button, that's the obvious next step."

## 05 -- press Load

    S ... --click "edges" --click "Load"

"'Reading miserables.gexf, 77 nodes, 254 edges...' and a progress bar about half way. Right
side says 'Summary: Reading...', left says 'Reading the data...'. Fine, wait."

## 06 -- wait (rest the pointer on Summary)

    S ... --click "Load" --hover "Summary"

"Still the same. Bar at the same place. Nothing moving. Is it stuck? It's a 22 KB file."

## 07 -- try the blue 'from miserables.gexf' link while it sits there

    S ... --click "Load" --click "from miserables.gexf"

"Now it says 'Edit: miserables.gexf' at the top. Edit? I didn't want to edit her file. I just
wanted to see if it was in. Same table as before, with a greyed-out 'Apply' and 'Apply is off:
Nothing has changed yet'. Get me out of here."

## 08 -- back out with Cancel

    S ... --click "from miserables.gexf" --click "Cancel"

(The tool reported two controls called Cancel and clicked the first.)

"'Edit canceled: nothing changed.' Good, I like that it told me. But I am back to 'Reading
miserables.gexf' with the bar half way. That's twice now it has looked stuck. If the next
thing doesn't work I'm asking her for a PNG."

## 09 -- click 'Everything' in the left list

    S ... --click "Load" --click "Everything"

"Oh, there it is. A picture. Orange dots, names: Valjean, Javert, Cosette, Marius. On the right,
'Paints 77 nodes, 254 edges.' Same numbers. But the left still says 'Reading the data...' under
the list, so did it finish or not? And there's a box saying 'Color: PageRank' and a 'Louvain'
tab at the bottom. I don't know what either of those is, and I didn't ask for them. Did she put
them in the file, or did the program do that to it? That makes me nervous."

## 10 -- open Data (the left rail button, as it turned out)

    S ... --click "Everything" --click "Data"

(The tool reported two controls called Data and clicked the first, the left rail button.)

"This is the page I wanted from the start. Right side, Summary: Nodes 77, Edges '254 edges, each
a distinct pair', Connected components 1. Left side: 'miserables.gexf, 77 nodes, 254 edges'.
So everything agrees: 77 and 254.

But now Weight says 'value, stronger' and the left says 'Weight: value, a higher value is a
stronger tie'. Before I pressed Load it said 'Weight: none (each edge counts 1)'. Which one is
it? And there are things in here I did not bring: betweenness, degree, Louvain, PageRank, and
'1 note'. The sample on the first screen said it 'opens with worked examples: measures, groups,
paths and notes already added'. Am I looking at her file or at their sample? I can't tell. The
title at the top just says 'Les Miserables' either way.

Nowhere does it say in so many words 'nothing was dropped' or '0 skipped'. I'm piecing that
together from 'every id is unique' and 'every edge has both ends', which I only saw because I
clicked the edges row before loading. If I had pressed Load straight away I would have seen
only the nodes one."

I stop here.

## Debrief

**Did I succeed?** Mostly, I think. I can tell the PI 77 characters and 254 connections, and the
two reports before loading say no character was repeated and no connection pointed at someone
missing. I am less sure about "nothing dropped": the weight line changed between before and
after loading, and the loaded graph has measures and a note I did not put there, so I am not
certain the thing on screen is exactly her file.

**Single Ease Question:** 4 of 7. Getting the file in was easy and the counts were there
early. Then the loading box sat half way with no change, the only thing I found to click took
me into something called "Edit", and the counts I wanted were on a page I found on my third try.

**Would I use this instead of what I do now?** Not yet. What I do now is ask her for a PNG and an
Excel file and count the rows. This was better than that in one way: it opened in the browser,
nothing to install, and it said up front the file stays on my computer. But it showed me two
different answers about the 'value' column and added things I don't recognize, and I'd have to
ask her whether those came from her or from the program. If I have to ask her anyway, the PNG
is faster.
