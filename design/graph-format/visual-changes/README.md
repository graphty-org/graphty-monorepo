# Story changes for the owner to review on pull request #587

The graph-format migration moves `@graphty/algorithms`, `@graphty/layout` and graphty-element
onto graph-format snapshots and ships as one breaking release (graphty-element 3.0.0, algorithms
3.0.0, layout 2.0.0). This page is the single list of every Storybook story whose picture that
changes, with what changed and why. Only the owner approves a visual change; none below is
approved yet.

How to review: read the record linked in each row (it has before and after captures and the
cause), then accept or reject the story on the visual-review page of pull request #587. layout
has no baselines on master, so visual-review shows every layout story as `new` with no before
picture; the records are the only before-and-after for those.

## Changes with captures

| Package         | Story                                                                                                      | What changed                                  | Why                                                                                                    | Record                                                         |
| --------------- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| layout          | Layout2D / ARF (`layout2d--arf`)                                                                           | a different drawing of the same graph         | start positions are 32-bit floats; ARF is chaotic and carries a 3e-8 start difference to a new drawing | [layout-stories](layout-stories/README.md)                     |
| layout          | Layout3D / Kamada-Kawai 3D (`layout3d--kamada-kawai-3-d`)                                                  | every node moves 1 to 3 px                    | same cause, a slightly different local minimum                                                         | [layout-stories](layout-stories/README.md)                     |
| layout          | Layout3D / Spherical (`layout3d--spherical`)                                                               | 5 anti-aliased pixels                         | 32-bit positions                                                                                       | [layout-stories](layout-stories/README.md)                     |
| layout          | Layout3D / Spring 3D (`layout3d--spring-3-d`)                                                              | 4 anti-aliased pixels                         | 32-bit positions                                                                                       | [layout-stories](layout-stories/README.md)                     |
| graphty-element | Layout/2D / Arf (`layout-2d--arf`)                                                                         | a different drawing of the same graph         | 32-bit start, and the start now comes from the layout package's shared seeding                         | [element-layout-stories](element-layout-stories/README.md) (1) |
| graphty-element | Layout/3D / Kamada Kawai Weighted (`layout-3d--kamada-kawai-weighted`)                                     | a different drawing of the same graph         | 32-bit start; the weighted solve lands in another minimum                                              | [element-layout-stories](element-layout-stories/README.md) (1) |
| graphty-element | Layout/3D / Kamada Kawai (`layout-3d--kamada-kawai`)                                                       | nodes move by under a pixel                   | 32-bit positions                                                                                       | [element-layout-stories](element-layout-stories/README.md) (1) |
| graphty-element | Layout/3D / Random (`layout-3d--random`)                                                                   | 8 anti-aliased pixels                         | 32-bit positions                                                                                       | [element-layout-stories](element-layout-stories/README.md) (1) |
| graphty-element | Algorithms/Community / Louvain (`algorithms-community--louvain`)                                           | four community colours where there were six   | the Louvain port finds a better partition on the cat network (modularity 0.462 against 0.402)          | `element-shipped-port-adapters/README.md` (2)                  |
| graphty-element | Algorithms/Combined / Centrality Vs Community (`algorithms-combined--centrality-vs-community`)             | the same Louvain colours under PageRank sizes | Louvain is applied last                                                                                | `element-shipped-port-adapters/README.md` (2)                  |
| graphty-element | Algorithms/Combined / Community Structure With Path (`algorithms-combined--community-structure-with-path`) | the same Louvain colours under the path       | Louvain is applied last                                                                                | `element-shipped-port-adapters/README.md` (2)                  |

(1) [element-stories](element-stories/README.md)
compares all 178 graphty-element stories between master and the branch at `48ff1b3a` and reaches
the same four layout changes. It supersedes the table of `element-layout-stories`, which keeps
the real-GPU captures and the numeric check of the three engines with no story.

(2) Arrives with the merge of `mig/merge-element-adapters-on-shipped-ports-r2`.

Two static-layout fixes change no story. Kamada-Kawai now sums the weights of a reciprocal pair
(a->b and b->a) instead of keeping only the first, even when every stored weight is 1; the one
weighted Kamada-Kawai story, Layout/3D / Kamada Kawai Weighted, draws the Les Miserables data,
whose 254 edges hold no reciprocal pair, and the other Kamada-Kawai stories turn weights off. After
an add, a static layout now carries the new nodes into the frame of the nodes it holds (turned,
mirrored or rescaled as the re-run needs), so a new node no longer lands on a held one, and it
holds nothing when the edges between existing nodes were swapped rather than only added to; no
story adds a node to a graph a static layout has already drawn (the one story that adds nodes at
runtime, AI Control, runs the default force layout).

One story is not a change: Styles/Label / Animation differs between two renders of the same
build because its label keeps animating.

## Changes expected but not captured yet

Each of these is a deliberate result change of work that is merged or about to be. A comparison
of every graphty-element story at the pull request head found none of the merged ones at the
stories' default arguments; the item that captures every story on master and on the finished
branch adds captures here, and anything it finds that is not listed.

| Package         | Stories                                                                                | What is expected to change                                                                                                    | Why                                                                                                                                                         |
| --------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| graphty-element | Algorithms/Community (label propagation)                                               | community colours for the same seed                                                                                           | the label propagation port uses a work queue, a uniform tie draw and another random generator                                                               |
| graphty-element | Algorithms/Shortest Path (Floyd-Warshall)                                              | eccentricity, diameter and radius on graphs with parallel edges or self-loops                                                 | the cheapest parallel edge sets the distance; a self-loop no longer overwrites a node's distance to itself                                                  |
| graphty-element | Algorithms/Centrality (PageRank), Algorithms/Component (strongly connected components) | values on a graph loaded undirected                                                                                           | the ports read an undirected graph as edges both ways                                                                                                       |
| graphty-element | Algorithms/Spanning Tree (Prim), Algorithms/Shortest Path (Bellman-Ford)               | which of two tied edges is flagged (8 of the 29 Prim edge flags on the cat network)                                           | the ports break ties by row order                                                                                                                           |
| graphty-element | Algorithms/Flow (bipartite matching)                                                   | the matching pairs alice with backend and carol with senior_dev, where it paired alice with senior_dev and carol with backend | the matching port visits nodes in index order and ignores arc direction by default                                                                          |
| graphty-element | Algorithms/Flow (max flow, min cut)                                                    | net flow shown on opposite directed edges; Karger's cut is the same on every run                                              | the flow port reports the net flow of a pair within capacity; the Karger port is seeded                                                                     |
| graphty-element | Data (CSV, JSON, DOT, GML, Pajek stories)                                              | none expected in the drawing; tooltips and data panels can show text ids and missing null keys                                | graph-io reads the files: JSON keys with null values are dropped, mixed-type CSV columns widen to text, CSV ids stay text, a Neo4j node gains its `:ID` key |
| graphty-element | every story, once the undo work of pull request #553 is in                             | not known yet                                                                                                                 | #553 changed the data layer and layout manager; it had no story comparison against this branch                                                              |
