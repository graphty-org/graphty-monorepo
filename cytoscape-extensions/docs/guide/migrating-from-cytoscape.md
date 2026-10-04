# Migrating from Cytoscape's built-ins

You can move from Cytoscape's built-in algorithms and layouts to the graphty ones one call at a time. Every graphty method starts with `graphty` and every graphty layout with `graphty-`, so no name clashes with a built-in: `pageRank` and `graphtyPageRank` both work on the same core, and existing code keeps running while you switch.

## Before and after

The snippets in this section run against this graph. In a page, pass `container` instead of `headless: true`.

```js
import cytoscape from "cytoscape";
import graphtyCytoscape from "@graphty/cytoscape-extensions";

cytoscape.use(graphtyCytoscape);

const cy = cytoscape({
    headless: true,
    elements: [
        { data: { id: "a" } },
        { data: { id: "b" } },
        { data: { id: "c" } },
        { data: { id: "d" } },
        { data: { id: "ab", source: "a", target: "b", weight: 4 } },
        { data: { id: "ac", source: "a", target: "c", weight: 1 } },
        { data: { id: "cb", source: "c", target: "b", weight: 1 } },
        { data: { id: "bd", source: "b", target: "d", weight: 2 } },
        { data: { id: "da", source: "d", target: "a", weight: 1 } },
    ],
});
```

### PageRank

Cytoscape's `pageRank` follows edges from source to target and applies its damping factor in a nonstandard way (see [PageRank damping](#pagerank-damping)). To get the same ranks from `graphtyPageRank`, pass `directed: true` and convert the damping factor:

```js
// Before
const before = cy.elements().pageRank({ dampingFactor: 0.8 });

// After: the same formula
const after = cy.elements().graphtyPageRank({ directed: true, dampingFactor: 1 / (2 - 0.8) });

console.log(before.rank("#b").toFixed(4), after.rank("#b").toFixed(4)); // 0.2866 0.2870
```

The two differ in the third digit because Cytoscape's stopping rule ends the iteration sooner. Pass `precision: 1e-12` to `pageRank` and both print `0.286976` to six decimals. Cytoscape's `precision` becomes `tolerance` and `iterations` becomes `maxIterations`; passing the old names throws. Both tolerances default to `0.000001`, but Cytoscape tests the sum of squared changes per round and graphty the sum of absolute changes, so the same value runs graphty longer. `maxIterations` defaults to 100; `iterations` defaulted to 200. With no options, `graphtyPageRank` reads every edge both ways and uses damping 0.85.

### Dijkstra

The options and accessors are the same. `weight` also accepts the name of a data field. Distances with fractional weights can differ from Cytoscape's past about 7 significant digits (see [Weights are 32-bit floats](#weights-are-32-bit-floats)):

```js
// Before
const before = cy.elements().dijkstra({ root: "#a", weight: (edge) => edge.data("weight") });

// After
const after = cy.elements().graphtyDijkstra({ root: "#a", weight: "weight" });

console.log(before.distanceTo("#b"), after.distanceTo("#b")); // 2 2
console.log(
    after
        .pathTo("#b")
        .map((ele) => ele.id())
        .join(" "),
); // a ac c cb b
```

### cose to ForceAtlas2

```js
// Before
cy.layout({ name: "cose", animate: false, boundingBox: { x1: 0, y1: 0, w: 600, h: 400 } }).run();

// After: gpu: "off" keeps cose's synchronous run, on the CPU
cy.layout({
    name: "graphty-forceatlas2",
    seed: 1,
    gpu: "off",
    boundingBox: { x1: 0, y1: 0, w: 600, h: 400 },
}).run();
console.log(cy.$("#a").position()); // the new position
```

Without `gpu: "off"`, the default `gpu: "auto"` makes the run asynchronous in Node and in any browser that has `navigator.gpu`, even on a machine with no GPU: `run()` returns before any node moves, because the layout first looks for a WebGPU device and then runs on the GPU or the CPU. Read positions in a `layoutstop` listener, where `layout.backend.ran` says `"gpu"` or `"cpu"`. The core keeps a GPU device it found until `cy.destroy()`, so a Node script that ran on the GPU must call `cy.destroy()` to exit. cose's force options (`idealEdgeLength`, `nodeRepulsion`, `edgeElasticity`, `numIter`) are ignored. ForceAtlas2 has its own: `scalingRatio` (default 2), `gravity` (1) and `maxIter` (100). Graphty layouts default to `animate: false`, where cose defaults to `true`.

## What carries over

The node options `root` and `goal` and the graph option `directed` (default `false`) mean what they mean in Cytoscape. So does `weight`, on the methods that read weights; the others throw when you pass it. Where Cytoscape's `bfs` and `dfs` take `roots`, graphty takes `root`, one node. The result accessors keep Cytoscape's names: `rank`, `degree`, `closeness`, `betweenness`, `betweennessNormalized`, `distanceTo`, `pathTo`, `distance`, `path` and `found`.

`bfs` and `dfs` take no `visit` callback. Read the visit order from `result.path.nodes()`, and use `result.depth(node)` and `result.parent(node)` for what the callback received. `graphtyDepthFirstSearch` lists nodes in pre-order; pass `order: "post"` for post-order.

Options specific to one algorithm take the @graphty/algorithms names. `markovClustering`'s `expandFactor` and `inflateFactor` become `expansion` and `inflation`, and `maxIterations` defaults to 100 instead of 20. Its `attributes: [fn]` becomes `weight: fn` or a data field name. Several attribute functions have no counterpart: combine them into one function.

## Algorithm mapping

| Cytoscape                       | graphty                              | What changes                                                                               |
| ------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------ |
| `pageRank`                      | `graphtyPageRank`                    | Damping convention; `directed` defaults to `false`                                         |
| `dijkstra`                      | `graphtyDijkstra`                    | Unreachable `pathTo` is empty (Cytoscape: the node alone); a negative weight throws        |
| `aStar`                         | `graphtyAStar`                       | No `steps`; not found gives `distance` `Infinity`, `path` empty                            |
| `floydWarshall`                 | `graphtyAllPairsShortestPath`        | 32-bit weights (below); `distance(from, to)`, `path(from, to)`                             |
| `bellmanFord`                   | `graphtyBellmanFord`                 | `hasNegativeWeightCycle` only, no list of the cycles                                       |
| `bfs`                           | `graphtyBreadthFirstSearch`          | `goal` instead of a `visit` callback                                                       |
| `dfs`                           | `graphtyDepthFirstSearch`            | `goal` instead of `visit`; visit order                                                     |
| `kruskal`                       | `graphtyKruskalMST`                  | `{ weight: fn }` instead of a function argument, which throws; adds `totalWeight`          |
| `kargerStein`                   | `graphtyKargerMinCut`                | `partition1`/`2` become `partitionFirst`/`Second`; adds `value`; no `components`           |
| `degreeCentrality`              | `graphtyDegreeCentrality`            | Every node at once, `degree(node)`; no `alpha` or `weight`; directed: use `graphtyDegrees` |
| `degreeCentralityNormalized`    | `graphtyDegreeCentrality`            | Divide by the largest degree yourself                                                      |
| `closenessCentrality`           | `graphtyNodeClosenessCentrality`     | Returns a number; pass `harmonic: true` to match                                           |
| `closenessCentralityNormalized` | `graphtyClosenessCentrality`         | Pass `harmonic: true`, then divide by the largest value                                    |
| `betweennessCentrality`         | `graphtyBetweennessCentrality`       | No `weight`: unweighted only (below)                                                       |
| `markovClustering`              | `graphtyMarkovClustering`            | Option names (above)                                                                       |
| `components`                    | `graphtyConnectedComponents`         | Each component holds its nodes only, no edges                                              |
| `tarjanStronglyConnected`       | `graphtyStronglyConnectedComponents` | An array of node collections; no `cut`                                                     |
| `hopcroftTarjanBiconnected`     | none                                 | Keep the Cytoscape built-in                                                                |
| `hierholzer`                    | none                                 | Keep the Cytoscape built-in                                                                |

Cytoscape's attribute clustering, `kMeans`, `kMedoids`, `fuzzyCMeans`, `hierarchicalClustering` and `affinityPropagation`, groups nodes by their data values. Graphty has no counterpart. `graphtyHierarchicalClustering` is a different algorithm: it clusters by graph structure and ignores node data.

With `directed: true`, Cytoscape's `degreeCentrality` returns `indegree` and `outdegree`. `graphtyDegreeCentrality({ directed: true })` returns only the total in `degree(node)`. Call `graphtyDegrees({ directed: true })` for `indegree(node)` and `outdegree(node)`, or pass `mode: "in"` or `mode: "out"` to `graphtyDegreeCentrality`.

## Layout mapping

| Cytoscape                         | graphty                                                                                                                                  |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `cose`, and the `fcose` extension | `graphty-forceatlas2` or `graphty-fruchterman-reingold`                                                                                  |
| `circle`                          | `graphty-circular`                                                                                                                       |
| `concentric`                      | `graphty-shell`, with `nlist`: a list of selectors or collections, innermost shell first (below)                                         |
| `breadthfirst`                    | `graphty-bfs` with `root` (one node, not `roots`) and `align: "horizontal"`, or `graphty-radial` with `root` for the `circle: true` look |
| `grid`                            | `graphty-grid`                                                                                                                           |
| `random`                          | `graphty-random`; pass `seed` for the same result every run                                                                              |

The common layout options work as they do on Cytoscape's layouts: `fit` (default `true`), `padding` (default `30`), `animate`, `animationDuration`, `animationEasing`, `spacingFactor`, `transform`, `ready` and `stop`.

`graphty-bfs` without `align` puts the root on the left and lays the levels out as columns; `align: "horizontal"` gives Cytoscape's top-down rows. `boundingBox` follows its own rule: a graphty layout centers its result in the box and scales it so the farthest node is half the box's shorter side from the center. Cytoscape's layouts each treat the box differently. For the karate club in a 600 x 400 box, `cose` fills it, `breadthfirst` spills past it (x -170..770), `concentric` ignores its size (about 100 px wide), and `graphty-forceatlas2` covers x 154..424, y 100..337.

### concentric to shell

Cytoscape's `concentric` sorts nodes by `concentric(node)`, highest first, and starts a new ring when the value drops by `levelWidth` from the ring's first node. The defaults are `node.degree()` and `cy.nodes().maxDegree() / 4`. `graphty-shell` takes the rings themselves in `nlist`, so build them the same way. On the `cy` from the first example:

```js
const levelWidth = cy.nodes().maxDegree() / 4;
const nlist = [];
let first = Infinity;
cy.nodes()
    .sort((a, b) => b.degree() - a.degree())
    .forEach((node) => {
        if (first - node.degree() >= levelWidth) {
            nlist.push(cy.collection());
            first = node.degree();
        }
        nlist[nlist.length - 1].merge(node);
    });

cy.layout({ name: "graphty-shell", nlist, boundingBox: { x1: 0, y1: 0, w: 600, h: 400 } }).run();
```

On the karate club graph (`await cy.graphtyDataset("karate")`) this gives the same 4 rings as Cytoscape's default `concentric`. For your own `concentric` function, replace `node.degree()` with it.

## Numbers that change

These conversions were checked against Cytoscape 3.34 on Zachary's karate club graph (34 nodes, 78 edges).

### PageRank damping

Cytoscape adds the teleport share `(1 - d) / n` without scaling the link share by `d`, then renormalizes. That equals standard PageRank with damping `1 / (2 - d)`. Cytoscape's default 0.8 is graphty's 0.8333. Going the other way, graphty's default 0.85 is Cytoscape's `2 - 1 / 0.85`, about 0.8235.

### Weights are 32-bit floats

Graphty stores edge weights as 32-bit floats, so every weighted result (distances, path costs, `totalWeight` of a spanning tree) agrees with Cytoscape's to about 7 significant digits. A 0.1 edge gives `distanceTo` 0.10000000149011612 where Cytoscape gives 0.1. Integer weights match exactly. Compare weighted results with a tolerance, and expect two paths whose costs tie within that precision to be picked differently.

### Betweenness

`betweenness(node)` and `betweennessNormalized(node)` equal Cytoscape's unweighted ones. There is no weighted betweenness: `graphtyBetweennessCentrality` throws when you pass `weight`, so keep Cytoscape's built-in for a weighted call. `score(node)` counts each unordered pair once, so on an undirected graph it is half of `betweenness(node)`.

### Closeness

Cytoscape's closeness is harmonic by default: the sum of `1 / distance`. Graphty's default is `1 / sum(distance)`. For node `0` Cytoscape gives 23.17 and `graphtyNodeClosenessCentrality({ root: "#0" })` gives 0.0172, which is 1 / 58. Pass `harmonic: true` and graphty gives 23.17 too. Cytoscape's normalized closeness divides by the largest value. Graphty's `normalized: true` instead scales by the fraction of other nodes reached, so divide by the largest value yourself.

### Degree

`degree(node)` is the plain neighbor count, the same as Cytoscape's with the default `alpha: 0`. Cytoscape's normalized degree divides by the largest degree; `normalized: true` divides by `n - 1`. Node `0` has degree 16: Cytoscape normalizes it to 16 / 17 = 0.941, graphty to 16 / 33 = 0.485.

### Depth-first order

`graphtyDepthFirstSearch` tries neighbors in edge order. Cytoscape's `dfs` tries the last one first. From node `0`, Cytoscape visits `0, 31, 33, 32` and graphty visits `0, 1, 2, 3`. Both are valid depth-first orders.

## See also

- [Algorithms](./algorithms): calling a graphty algorithm, reading its result and writing it onto elements.
- [Layouts](./layouts): static layouts, simulations, animation and events.
- [Algorithm reference](../reference/algorithms): every method with every option and default.
