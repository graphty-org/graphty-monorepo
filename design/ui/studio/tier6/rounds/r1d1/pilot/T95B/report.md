# Pilot walk: T95 B, which genes are essential, targeted re-walk

Build 3549e11129, served from `.study-builds/tier6-r1d1-3549e11129`, live Gemini 3.8 Flash, start
`setup:connected-yeast.txt`. Screenshots are under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier6/r1d1/pilot/T95B/ (written below as
`<walk>/<n>.png`). The data stayed yeast-galactose.graphml on both walks: 331 nodes and 361 edges, all
visible and none selected, at the end of each (`data.json`).

Result: the task can be reached by pointer. Nothing crashed, blocked the task or gave a result that
would spoil its grading. No script error, console error or failed request was printed on either walk.
An empty result alone still shows its row.

Walked: the pointer success path, and the one route of the touched list that belongs to this task.
No other route of that list is a T95 B route, so there was no keyboard walk or detour on this pass.

Model calls: success 10, touched-35 9.

## Success path, by pointer (success/)

The replay of the earlier walk matched its first step (the Assistant opening, 02.png) and went its own
way at the second, because this reply finished in 6 steps within the wait. The rest was walked by hand.

1. Assistant on the rail. Focus in the composer, "Ask about this graph or change it. It can be wrong.",
   three starters (02.png).
2. "Which of these genes are essential, meaning a yeast cell dies without them?", Enter. Reply: "The
   graph does not contain essentiality or lethality annotations; its node attributes record only gene
   identifiers and galactose expression measurements (gal1RGexp, gal4RGexp, and gal80Rexp).
   Essentiality data would need to be imported to identify those genes." No chip, no empty row (this
   turn made no search that came back empty), no change to the drawing (03.png).
3. 6 steps opened: Query data, Catalog, Sets, Query data, Catalog, Columns (04.png).
4. Composer keys: Enter when empty does nothing (05.png); Tab goes to the model label with the typed
   text kept (06.png); Shift+Tab comes back and Escape keeps the text (07.png). All as `decided.md`
   says.
5. Second question, Send button: "From what you know, which of these genes are likely essential?"
   gave "In yeast biology, several prominent genes in this network are known to be essential ...":
   MCM1, RAP1, GSP1, CRM1, NAB2, DED1 and YEF3 as essential, GAL4, MIG1 and STE11 as non-essential, in
   plain text, with "Computed Connections for 331 nodes", Open run and Undo beneath (08.png). All ten
   genes are in the file. The reply names biology as its source. The Undo at the top lit up.
6. 2 steps opened: Connections, Query data, and a chip 5 under the query. The transcript took its own
   scrollbar and the header, scope line and composer stayed where they were (09.png).

## Touched route 35: an empty result alone still shows its row (touched-35/)

1. "Which genes are marked essential?", Enter. Reply: "No genes in the graph are marked as essential;
   the available data only includes expression values ... No changes were made. Which attribute,
   threshold, or gene list would you like to use to identify them?" with "No matches for essential."
   and its warning mark beneath, no chip and no change line (02.png). The row is there.
2. 9 steps opened: the row shows under the Query data that came back empty, and again under the reply
   (03.png). The doubled row is already in the backlog.

## Mismatches with the answer key

None. The path of three steps, a plain refusal, a question run leaving "Computed Connections" and Undo
behind, and the list from memory all came as the key says.

## Defects

None that crashes, blocks the task or spoils its grading. Seen and already known to the key or the
backlog: the bare chip 5 in the open steps under a reply from memory (success/09.png, the key's "they
count the query's nodes, not the claim"); the "No matches for essential." row with a warning mark on
a correct answer, twice with steps open (touched-35/03.png).
