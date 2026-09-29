# Story changes for the owner to review before the migration release

The graph-format migration moves `@graphty/algorithms`, `@graphty/layout` and graphty-element
onto graph-format snapshots and ships as one breaking release (graphty-element 3.0.0, algorithms
3.0.0, layout 2.0.0). This page is the single list of every Storybook story whose picture that
changes, with what changed and why. Only the owner approves a visual change; none below is
approved yet.

Pull request #587 merged the first half of the migration into master on 2026-09-29. The column
"On master" says whether a change is already there (it arrived with that merge) or arrives with
the next merge of `feat/graph-format-migration`. Every story of the graphty-element, layout,
graphty app and algorithms Storybooks was rendered on master before the merge, on master now and
on the finished branch; [story-comparison](story-comparison/README.md) has the method, the counts
and every story that differed.

How to review: read the record linked in each row (it has before and after captures and the
cause), then accept or reject the story on visual-review. layout has no baselines on master, so
visual-review shows every layout story as `new` with no before picture; the records are the only
before-and-after for those. The algorithms Storybook is not a visual-review project; its rows are
here for the record.

## Changes with captures

| Package         | Story                                                                                                      | What changed                                                 | Why                                                                                                    | On master | Record                                                                   |
| --------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ | --------- | ------------------------------------------------------------------------ |
| layout          | Layout2D / ARF (`layout2d--arf`)                                                                           | a different drawing of the same graph                        | start positions are 32-bit floats; ARF is chaotic and carries a 3e-8 start difference to a new drawing | yes       | [layout-stories](layout-stories/README.md)                               |
| layout          | Layout3D / Kamada-Kawai 3D (`layout3d--kamada-kawai-3-d`)                                                  | every node moves 1 to 3 px                                   | same cause, a slightly different local minimum                                                         | yes       | [layout-stories](layout-stories/README.md)                               |
| layout          | Layout3D / Spherical (`layout3d--spherical`)                                                               | 5 anti-aliased pixels                                        | 32-bit positions                                                                                       | yes       | [layout-stories](layout-stories/README.md)                               |
| layout          | Layout3D / Spring 3D (`layout3d--spring-3-d`)                                                              | 4 anti-aliased pixels                                        | 32-bit positions                                                                                       | yes       | [layout-stories](layout-stories/README.md)                               |
| graphty-element | Layout/2D / Arf (`layout-2d--arf`)                                                                         | a different drawing of the same graph                        | 32-bit start, and the start now comes from the layout package's shared seeding                         | yes       | [element-stories](element-stories/README.md)                             |
| graphty-element | Layout/3D / Kamada Kawai Weighted (`layout-3d--kamada-kawai-weighted`)                                     | a different drawing of the same graph                        | 32-bit start; the weighted solve lands in another minimum                                              | yes       | [element-stories](element-stories/README.md)                             |
| graphty-element | Layout/3D / Kamada Kawai (`layout-3d--kamada-kawai`)                                                       | nodes move by under a pixel                                  | 32-bit positions                                                                                       | yes       | [element-stories](element-stories/README.md)                             |
| graphty-element | Layout/3D / Random (`layout-3d--random`)                                                                   | 8 anti-aliased pixels                                        | 32-bit positions                                                                                       | yes       | [element-stories](element-stories/README.md)                             |
| graphty-element | Algorithms/Community / Louvain (`algorithms-community--louvain`)                                           | four community colours where there were six                  | the Louvain port finds a better partition on the cat network (modularity 0.462 against 0.402)          | no        | [element-shipped-port-adapters](element-shipped-port-adapters/README.md) |
| graphty-element | Algorithms/Combined / Centrality Vs Community (`algorithms-combined--centrality-vs-community`)             | the same Louvain colours under PageRank sizes                | Louvain is applied last                                                                                | no        | [element-shipped-port-adapters](element-shipped-port-adapters/README.md) |
| graphty-element | Algorithms/Combined / Community Structure With Path (`algorithms-combined--community-structure-with-path`) | the same Louvain colours under the path                      | Louvain is applied last                                                                                | no        | [element-shipped-port-adapters](element-shipped-port-adapters/README.md) |
| graphty-element | Algorithms/Flow / Bipartite Matching (`algorithms-flow--bipartite-matching`)                               | alice pairs with backend and carol with senior_dev (swapped) | the matching port visits nodes in index order and ignores arc direction; both matchings have 7 pairs   | no        | [story-comparison](story-comparison/README.md)                           |
| algorithms      | Centrality / Page Rank (`centrality--page-rank`)                                                           | "14 iterations" where it said 13                             | 3.0 `pageRank` is the snapshot port's power iteration, not the 2.x delta engine                        | no        | [algorithms-stories](algorithms-stories/README.md)                       |
| algorithms      | Community / Louvain (`community--louvain`)                                                                 | three communities where there were four                      | 3.0 `louvain` is the snapshot port, which stops at another (higher-modularity) partition               | no        | [algorithms-stories](algorithms-stories/README.md)                       |
| algorithms      | Community / Label Propagation (`community--label-propagation`)                                             | "2 iterations" where it said 3; the same three communities   | the port stops as soon as every label is dominant                                                      | yes       | [story-comparison](story-comparison/README.md)                           |
| algorithms      | Matching / Isomorphism (`matching--isomorphism`)                                                           | three node pairs change colour; the mapping is the same      | 3.0 returns the mapping in node order, and the story colours each pair by its place in the list (1)    | no        | [story-comparison](story-comparison/README.md)                           |
| algorithms      | Matching / Bipartite (`matching--bipartite`)                                                               | the same three pairs, listed in another order                | 3.0 returns the matching in node order (1)                                                             | no        | [story-comparison](story-comparison/README.md)                           |

(1) The order of an isomorphism's mapping and of a matching's pairs is not one of the result
differences the owner accepted on 2026-09-28 (a deterministic greedy visiting order, edge direction
ignored by default, and `edgeMatch` seeing every arc and self-loop). It follows from the 3.0 result
shape: both results are typed arrays indexed by node, where 2.x returned a Map filled in search
order. algorithms' migration guide (`algorithms/docs/guide/migrating-to-3.md`, "Matching and
isomorphism") names it. It stands until the owner decides it with the other changes on the pull
request that brings the rest of `feat/graph-format-migration` to master.

The layout counts are from each record's own capture (visual-review, 1200x900). The story
comparison counts pixels at 1000x800 with a per-channel threshold, so its numbers can differ by a
few anti-aliased pixels: it counts 3 for Spring 3D where the record counts 4.

[element-stories](element-stories/README.md) supersedes the table of `element-layout-stories`,
which keeps the real-GPU captures and the numeric check of the three engines with no story.

Two static-layout fixes change no story. Kamada-Kawai now sums the weights of a reciprocal pair
(a->b and b->a) instead of keeping only the first, even when every stored weight is 1; the one
weighted Kamada-Kawai story, Layout/3D / Kamada Kawai Weighted, draws the Les Miserables data,
whose 254 edges hold no reciprocal pair, and the other Kamada-Kawai stories turn weights off. After
an add, a static layout now carries the new nodes into the frame of the nodes it holds (turned,
mirrored or rescaled as the re-run needs), so a new node no longer lands on a held one, and it
holds nothing when the edges between existing nodes were swapped rather than only added to; no
story adds a node to a graph a static layout has already drawn (the one story that adds nodes at
runtime, AI Control, runs the default force layout).

Moving the fourteen single-pass layouts (arf, bfs, bipartite, circular, fixed, grid,
kamada-kawai, multipartite, planar, radial, random, shell, spectral, spiral) onto the snapshot
layout contract (`registerSnapshotLayout`) changes no story. Each engine computes the same numbers
through the same `@graphty/layout` call and scales them by the same factor, and the published
coordinates were compared with the previous engines' bit for bit on a twelve-node weighted graph
with a reciprocal pair, in 2D and 3D, with `Math.random` seeded for planar and spectral: all
sixteen cases were identical.

Stories that are not changes: Styles/Label / Animation (an animated label), Performance/Large
Graph / Physics 250 (a live simulation) and the algorithms story ShortestPath / Bellman Ford (an
animated path) differ between two renders of the same build. The algorithms story Flow / Ford
Fulkerson throws while rendering on every build, including master before the migration. The undo
work of pull request #553 is merged on master and on the branch and changes no story beyond the
table above.

## Result changes no story shows at its default arguments

Each of these is a deliberate result change of merged work. The algorithm results were read from
every graphty-element algorithm story on both sides of the comparison, and each of these leaves
every node and edge value of its story unchanged; [story-comparison](story-comparison/README.md)
has the check. The algorithm stories load the cat network (20 nodes, 29 directed edges, no
self-loop, no parallel edge, no reciprocal pair) and weigh its edges by their `value`, 1 to 10.

| Package         | Stories                                                                                | What the new code does differently                                                                                                                                                              | Why no story shows it                                                                                                                                                                                                                                                            |
| --------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| graphty-element | Algorithms/Community (label propagation)                                               | the port uses a work queue, a uniform tie draw and another random generator, so the same seed can give other communities on a graph with more than one valid partition                          | on the cat network the port reaches the same communities as before for the story's seed                                                                                                                                                                                          |
| graphty-element | Algorithms/Shortest Path (Floyd-Warshall)                                              | the cheapest parallel edge sets the distance (the last one added did); a self-loop no longer overwrites a node's distance to itself; eccentricity, diameter and radius follow                   | the cat network has no parallel edge and no self-loop                                                                                                                                                                                                                            |
| graphty-element | Algorithms/Centrality (PageRank), Algorithms/Component (strongly connected components) | the ports read a graph loaded undirected as edges both ways, so its values change                                                                                                               | the stories load the cat network with the default `directed: "auto"`, which is directed                                                                                                                                                                                          |
| graphty-element | Algorithms/Spanning Tree (Prim), Algorithms/Shortest Path (Bellman-Ford)               | the ports break a tie between equally cheap edges by edge index and relax arcs in row order, where the old code used its heap's insertion order and edge order                                  | the stories weigh edges by `value`, and on those weights both orders pick the same tree (weight 84) and route (cost 11). With every edge weighing 1 they disagree on 8 of the 29 Prim edge flags, the figure an earlier version of this page gave; no story runs Prim unweighted |
| graphty-element | Algorithms/Flow (max flow)                                                             | the flow port reports the net flow of a pair of opposite directed edges, each within its capacity                                                                                               | the story's water network has no pair of opposite edges                                                                                                                                                                                                                          |
| graphty-element | Algorithms/Flow (min cut)                                                              | Stoer-Wagner adds the weights of two opposite directed edges; the s-t cut reports its cut edges on graphs with numeric ids (it reported none); Karger's cut is seeded, so the same on every run | with no source or sink set, the Min Cut story runs Stoer-Wagner's global cut, on the cat network, which has no reciprocal pair (cut value 9 on both builds); the s-t cut and Karger's algorithm run only when a source and sink or `useKarger` are set                           |
| graphty-element | Data (CSV, JSON, DOT, GML, Pajek stories)                                              | graph-io reads the files: JSON keys with null values are dropped, mixed-type CSV columns widen to text, CSV ids stay text, a Neo4j node gains its `:ID` key                                     | the drawings are unchanged; the text appears only in a tooltip or data panel, when a reader hovers or selects a node, which no story does                                                                                                                                        |
