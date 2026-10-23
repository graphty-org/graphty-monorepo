# Bar 9 (b): the words on an edge's inspector, round 1's build against round 4's

Measured 2026-10-11 with `tool/bars.mjs` (unchanged in its walk since round 1's limits were set,
2026-10-10), once per build:

- round 1's build, graphty@0.8.56 (946256efb), `.study-builds/tier2-r1d4-946256efb`:
  `bars-round-1-build-946256efb.txt`
- round 4's build, graphty@0.8.64 (5277e2cbe), `.study-builds/tier2-r4d1-5277e2cbe`:
  `bars-round-4-build-5277e2cbe.txt`

## The state is the same on both builds

The walk reaches the screen the same way on both: friends.csv with PageRank and a shortest path
(Chloe to Milo) run, the neighbor filter on Ava at 2 hops (header "15 of 32 nodes"), then the edge
Gus -> Ivan picked from the find box, at 1440 x 900. The screenshots (move 20 of the returning
walk) show the same selection, layers, filter and inspector on both builds. Round 1's build counts
27 again, which is the limit in `tool/bars-limits.json`. Round 1 measured the screen in this
state, so there is no measurement fault: the limit stays 27 and the criteria's change log gets no
entry.

## The two word lists

Round 1's build, 27 words:

    of nodes Local only Graph Data Notes Graph Selection Shortest path hops PageRank Everything
    Shortest path On the path Color PageRank Edge Style Values Summary From To

Round 4's build, 29 words:

    of nodes Local only Graph Data Notes Settings Graph Selection Shortest path hops PageRank
    Everything Shortest path full graph Color PageRank on nodes Edge Style Values Summary From To

## What changed, word by word

| Where                      | Round 1's build                        | Round 4's build                          | Words |
| -------------------------- | -------------------------------------- | ---------------------------------------- | ----- |
| Rail                       | Graph, Data, Notes                     | Graph, Data, Notes, Settings             | +1    |
| Key, path entry            | "Shortest path" title, "On the path"   | one row: "Shortest path, full graph"     | -1    |
| Key, color entry           | "Color: PageRank"                      | "Color: PageRank on 20 nodes"            | +2    |
| Header                     | "15 of 32 nodes"                       | "15 of 32 nodes"                         | 0     |

Added: "Settings", "full graph", "on nodes" (5). Removed: "On the path" (3). Net: +2.

"of nodes" is in the header on both builds: it is not a new word.

## Decision

- **No word is cut. Bar 9 (b) on an edge's inspector fails honestly in round 5: 29 against 27.**
- ", full graph" and "on 20 nodes" are scope words. With a filter step on, the path and the
  ranking were run on more nodes than the drawing shows (15 of 32 on screen; PageRank on 20). The
  words keep a reader from taking either for a result about the 15 they see. A true fact is not cut
  to pass a count.
- "Settings" names a place on the rail that nothing else on the screen names.
- None of the five added words repeats something already on that screen: "nodes" appears in the
  header, but "15 of 32 nodes" counts what is drawn, and "on 20 nodes" says what the ranking was
  computed on; they are different facts. So the rule's one allowed cut, a repeat, does not apply.
- The limit is not re-set from round 4's data.
