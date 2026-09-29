# Story changes for the owner to review on pull request #587

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
| layout          | Layout3D / Spring 3D (`layout3d--spring-3-d`)                                                              | 3 anti-aliased pixels                                        | 32-bit positions                                                                                       | yes       | [layout-stories](layout-stories/README.md)                               |
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
| algorithms      | Matching / Isomorphism (`matching--isomorphism`)                                                           | three node pairs change colour; the mapping is the same      | 3.0 returns the mapping in node order, and the story colours each pair by its place in the list        | no        | [story-comparison](story-comparison/README.md)                           |
| algorithms      | Matching / Bipartite (`matching--bipartite`)                                                               | the same three pairs, listed in another order                | 3.0 returns the matching in node order                                                                 | no        | [story-comparison](story-comparison/README.md)                           |

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
has the check.

| Package         | Stories                                                                                | What changes                                                                                 | Why no story shows it                                                                                                                                            |
| --------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| graphty-element | Algorithms/Community (label propagation)                                               | community colours for the same seed, on a graph with more than one valid partition           | on the cat network, the data every algorithm story loads, the port reaches the same communities as before for the story's seed                                   |
| graphty-element | Algorithms/Shortest Path (Floyd-Warshall)                                              | eccentricity, diameter and radius on graphs with parallel edges or self-loops                | the cat network has no parallel edge and no self-loop                                                                                                            |
| graphty-element | Algorithms/Centrality (PageRank), Algorithms/Component (strongly connected components) | values on a graph loaded undirected                                                          | the stories load the cat network with the default `directed: "auto"`, which is directed                                                                          |
| graphty-element | Algorithms/Spanning Tree (Prim), Algorithms/Shortest Path (Bellman-Ford)               | which of two tied edges is flagged                                                           | every edge of the cat network weighs 1 to these algorithms (its weights are in `value`, they read `weight`), yet row order and the old order pick the same edges |
| graphty-element | Algorithms/Flow (max flow, min cut)                                                    | net flow shown on opposite directed edges; Karger's cut is the same on every run             | the water network has no pair of opposite edges, and the Min Cut story runs the s-t cut, not Karger's algorithm                                                  |
| graphty-element | Data (CSV, JSON, DOT, GML, Pajek stories)                                              | tooltips and data panels can show text ids and missing null keys; the drawings are unchanged | the text appears only when a reader hovers or selects a node, which no story does                                                                                |
