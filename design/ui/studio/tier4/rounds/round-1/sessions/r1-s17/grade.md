Grade: S
False done: 0
Wrong turns: 0
Steps: 4 (path steps: 2; Open network data, then the web address box with the address and Enter; 2 more reading the counts in the table)
Model: opus (claude-opus-5-5 in the transcript; no Sonnet)
Leaks: none (leaks.json lists no file outside the session folder; 12 calls checked over 1 transcript)

# r1-s17 -- T60 A, Ruth (returning user), build 79ed770292

## Result

The last screenshot (05.png) shows the network open as "sources", the Graph panel headed "Graph
sources.graphml", the inspector reading "From sources.graphml" with Overview Nodes 24 and Edges 59,
and the table's Edges tab reading "59 edges". 04.png, one step earlier, shows the Nodes tab with "24
nodes". `data.json` agrees: one source, s1 sources.graphml, of kind `url` (brought in from the
address, not from a file), 24 nodes and 59 edges, recount the same, nothing left out. The Sources
row is not on screen (the participant never opened Data), so its link glyph is graded from
`data.json`'s source kind, which is what the glyph shows. No file was saved (no `downloads/`).

The participant reported 24 people and organizations and 59 ties, brought in through Open network
data > Web address with no download. Both counts match the key (A: 24 nodes, 59 edges): S.

## Route against the success path

The path is start screen > Open network data > the box "Web address of a graph file" > paste the
address > Enter. The participant took:

1. Open network data (02.png: the dialog with NDEx, Neo4j, Web API, and the "Web address" box).
2. Clicked the box, typed the full address, Enter (03.png: the network open, Nodes 24, Edges 59).
   Success state reached here.
3. Table (04.png: Nodes tab, "24 nodes", the kind column showing company, person and agency).
4. Edges tab (05.png: "59 edges").

Steps 3 and 4 read the answer a second way off the loaded network; neither left the path or was
taken back, so neither is a wrong turn. The participant said done only after the screen showed the
counts she reported: no false done.

## Problems

| # | Severity | Kind | What | Evidence |
| - | -------- | ---- | ---- | -------- |
| 1 | 2 | opinion | Nothing on the start screen names a web address: "Open a file" is where she first looked, and "Open network data" sits among tiles (NDEx, Neo4j) that read as specialist databases. She opened it only to look, and found the "Web address" box at the bottom. It cost no steps here; r1-s18 (T60 B) reported the same. | Step 1 notes; 01.png, 02.png |
| 2 | 2 | behavior | The Edges table names each end by its id (s01 - s02), not by the node's name, although the file has a `name` column. `data.json` shows no label column was taken from the file (`nodeLabelPath` null), so the table has no name to show. Checking a tie means cross-reading two tables. | Step 5, 05.png; 04.png (name column present); data.json knownFields |
| 3 | 1 | behavior | After the load, nothing said whether anything was skipped on the way in; she trusted the counts only because three places agreed. `data.json` shows nothing was left out (leftOut null, recount equal), but the screen does not say so. r1-s18 reported the same. | End-of-session notes; 03.png; data.json |
| 4 | 1 | wording | The start screen promises a file "never leaves your computer"; nothing near the web address says what fetching a link sends where. The status bar's "Local only" is the only sign, and she did not connect it to the address. | End-of-session notes; 01.png, 05.png (status bar) |
| 5 | 1 | opinion | No breakdown of nodes by kind (how many persons, companies, agencies) without reading the table; the task wording asked only for the total, so this did not affect the answer. | End-of-session notes; 04.png |

No build defect was found: the path worked as the key describes, so no repro was needed.
