# Migrating to 4.0

4.0 gives every algorithm the same rules for edge weights and for stopping a power iteration, so the same options
give the same answer whichever algorithm you call and whether `@graphty/webgpu-graph-algorithms` runs it or the CPU
does. Most code keeps working; the answers change where a graph has edge weights.

## Edge weights are read by default

An algorithm that can use edge weights reads them whenever the graph has a weight column, and `weighted: false`
turns them off. In 3.x some algorithms read weights only with `weighted: true` and some ignored them.

| Algorithm                                                                                                                                                                                        | 3.x                                | 4.0                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `pageRank`, `personalizedPageRank`, `katzCentrality`, `hits`, `closenessCentrality`, `nodeClosenessCentrality`, the `DeltaPageRank` engines                                                      | weights only with `weighted: true` | weights unless `weighted: false`                                                                         |
| `eigenvectorCentrality`                                                                                                                                                                          | weights ignored                    | weights unless `weighted: false`                                                                         |
| `betweennessCentrality`, `edgeBetweennessCentrality`                                                                                                                                             | hops, weights ignored              | shortest paths by weight unless `weighted: false`; a negative or non-finite weight throws `E_BAD_WEIGHT` |
| `dijkstra`, `bellmanFord`, `bidirectionalDijkstra`, `astar`, the spanning trees, the flows and cuts, `louvain`, `leiden`, `girvanNewman`, `modularity`, `markovClustering`, `spectralClustering` | weights, no way to turn them off   | weights unless `weighted: false`                                                                         |
| traversals, components, triangles, matchings, link prediction and the other algorithms that cannot use weights                                                                                   | `weighted` ignored                 | `weighted: true` throws a `RangeError` with code `E_BAD_OPTION`                                          |

To keep a 3.x answer on a weighted graph, pass `weighted: false` to the algorithms in the first three rows. In the
`ALGORITHMS` catalog, `weights` is now `"by-default"` or `"never"`; `"always"` and `"on-request"` are gone.

`girvanNewman` reads the weights for the modularity of each level; the betweenness that picks the edge to remove
still counts hops, as NetworkX's default does.

## One stopping rule for every power iteration

`pageRank`, `personalizedPageRank`, `katzCentrality`, `hits` and `eigenvectorCentrality` stop at the first iteration
whose summed change over all nodes is below `nodeCount * tolerance`, the rule NetworkX and
`@graphty/webgpu-graph-algorithms` use. In 3.x PageRank compared the summed change with `tolerance` alone, and Katz
and HITS compared the largest single-node change with it. At the same options the runs now stop at the same
iteration on the CPU and the GPU. `pageRank`'s `convergenceNorm: "max"` still compares the largest single-node change
with `tolerance`.

## Closeness: `normalized` is now `normalization`

`closenessCentrality` and `nodeClosenessCentrality` take `normalization` in place of `normalized`:

- `normalized: true` becomes `normalization: "per-other-node"`, the same numbers.
- `normalization: "wasserman-faust"` is new: `(reached / sum) * (reached / (n - 1))`, the score NetworkX's
  `closeness_centrality` reports by default.

<!-- doc-check -->

```typescript
import { GraphBuilder } from "@graphty/graph-format";
import { betweennessCentrality, closenessCentrality } from "@graphty/algorithms";

const builder = new GraphBuilder({ directed: false });
builder.addEdge("a", "b", 1);
builder.addEdge("b", "c", 1);
builder.addEdge("a", "c", 5);
builder.addNode("d");
const graph = builder.freeze();
const a = graph.ids.requireIndex("a");
const b = graph.ids.requireIndex("b");

// a - b - c weighs 2 and a - c weighs 5, so b lies between a and c once weights are read
console.log(betweennessCentrality(graph).scores[b]); // 1
console.log(betweennessCentrality(graph, { weighted: false }).scores[b]); // 0

// a reaches 2 of the 3 other nodes at total distance 3: (2 / 3) * (2 / 3)
console.log(closenessCentrality(graph, { normalization: "wasserman-faust" }).scores[a].toFixed(3)); // 0.444
```

## Link prediction lists each pair once

`commonNeighborsPrediction` and `adamicAdarPrediction` list each pair once, so `topK` counts distinct pairs. In 3.x
an undirected pair appeared twice, as (u, v) and (v, u), and `topK` counted both. Under `directed: true` on a directed
graph every ordered pair is now scored; 3.x scored only the pairs whose first node had the lower index.

## The accelerator seam

`BetweennessAcceleratorOptions` gains `weighted`. The dispatcher hands an accelerator only the betweenness calls that
count hops, with `weighted: false`, and runs a weighted one on the CPU. It hands every other accelerator method
`weighted` resolved, true or false, by the rule above.
