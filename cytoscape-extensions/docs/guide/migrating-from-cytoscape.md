# Migrating from Cytoscape's built-ins

You can move from Cytoscape's built-in algorithms and layouts to the ones @graphty/cytoscape-extensions adds (graphty below) one call at a time. graphty methods start with `graphty` and layouts with `graphty-`, so `pageRank` and `graphtyPageRank` work side by side.

## Before and after

The examples use this graph. In a page, pass `container` instead of `headless: true`.

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

Cytoscape's `pageRank` follows edges from source to target and does not scale the link share by `d`, which equals standard PageRank with damping `1 / (2 - d)`: Cytoscape's 0.8 is graphty's 0.8333. For the same ranks, pass `directed: true` and convert the damping:

```js
// Before
const before = cy.elements().pageRank({ dampingFactor: 0.8 });

// After: the same formula
const after = cy.elements().graphtyPageRank({ directed: true, dampingFactor: 1 / (2 - 0.8) });

console.log(before.rank("#b").toFixed(4), after.rank("#b").toFixed(4)); // 0.2866 0.2870
```

Cytoscape stops sooner (with `precision: 1e-12` both print `0.286976`). `precision` becomes `tolerance` and `iterations` becomes `maxIterations` (default 100, was 200); the old names throw. graphty's defaults are undirected, damping 0.85.

### Dijkstra

Same options and accessors; `weight` also takes a data field name:

```js
// Before
const before = cy.elements().dijkstra({ root: "#a", weight: (edge) => edge.data("weight") });

// After
const after = cy.elements().graphtyDijkstra({ root: "#a", weight: "weight" });

console.log(before.distanceTo("#b"), after.distanceTo("#b")); // 2 2
```

### cose to ForceAtlas2

```js
// gpu: "off" keeps cose's synchronous run, on the CPU
cy.layout({
    name: "graphty-forceatlas2",
    seed: 1,
    gpu: "off",
    boundingBox: { x1: 0, y1: 0, w: 600, h: 400 },
}).run();
console.log(cy.$("#a").position());
```

cose's `idealEdgeLength`, `nodeRepulsion`, `edgeElasticity` and `numIter` are ignored; ForceAtlas2 has `scalingRatio` (default 2), `gravity` (1) and `maxIter` (100). `animate` defaults to `false`, not `true`.

Without `gpu: "off"`, in Node or a browser with `navigator.gpu`, `run()` returns before any node moves: read positions on `layoutstop` ([Layouts](./layouts)).

## What carries over

`root`, `goal`, `directed` and `weight` mean what they do in Cytoscape. A method that reads no weights throws when you pass `weight`. `directed` defaults to `false`, except on the directed-only methods ([Algorithms](./algorithms)). Results keep Cytoscape's accessor names (`rank`, `distanceTo`, `pathTo`) unless the table below says otherwise.

`bfs` and `dfs` take one `root`, not `roots`, and no `visit` callback: `result.path.nodes()` is the visit order, and `result.depth(node)` and `result.parent(node)` replace the callback's arguments. `graphtyDepthFirstSearch` is pre-order (`order: "post"` for post-order) and tries neighbors in edge order; Cytoscape tries the last one first.

`markovClustering`'s `expandFactor` and `inflateFactor` become `expansion` and `inflation`, `maxIterations` defaults to 100 instead of 20, and `attributes: [fn]` becomes `weight: fn` or a data field name (combine several functions into one).

## Algorithm mapping

| Cytoscape                       | graphty                              | What changes                                               |
| ------------------------------- | ------------------------------------ | ---------------------------------------------------------- |
| `pageRank`                      | `graphtyPageRank`                    | Damping (above); undirected by default                     |
| `dijkstra`                      | `graphtyDijkstra`                    | Unreachable `pathTo` is empty; negative weights throw      |
| `aStar`                         | `graphtyAStar`                       | No `steps`; not found: `distance` `Infinity`, empty `path` |
| `floydWarshall`                 | `graphtyAllPairsShortestPath`        | `distance(from, to)`, `path(from, to)`                     |
| `bellmanFord`                   | `graphtyBellmanFord`                 | `hasNegativeWeightCycle`, no list of cycles                |
| `bfs`                           | `graphtyBreadthFirstSearch`          | `goal` instead of a `visit` callback                       |
| `dfs`                           | `graphtyDepthFirstSearch`            | `goal` instead of `visit`; visit order                     |
| `kruskal`                       | `graphtyKruskalMST`                  | `{ weight: fn }`, not a function; adds `totalWeight`       |
| `kargerStein`                   | `graphtyKargerMinCut`                | `partitionFirst`/`Second`, `value`; no `components`        |
| `degreeCentrality`              | `graphtyDegreeCentrality`            | Every node at once; no `weight` (below)                    |
| `degreeCentralityNormalized`    | `graphtyDegreeCentrality`            | Divide by the largest degree yourself                      |
| `closenessCentrality`           | `graphtyNodeClosenessCentrality`     | Returns a number; pass `harmonic: true` to match           |
| `closenessCentralityNormalized` | `graphtyClosenessCentrality`         | `harmonic: true`, then divide by the largest value         |
| `betweennessCentrality`         | `graphtyBetweennessCentrality`       | `betweenness(node)` matches (below)                        |
| `markovClustering`              | `graphtyMarkovClustering`            | Option names (above)                                       |
| `components`                    | `graphtyConnectedComponents`         | Each component holds its nodes only, no edges              |
| `tarjanStronglyConnected`       | `graphtyStronglyConnectedComponents` | An array of node collections; no `cut`                     |

`hopcroftTarjanBiconnected`, `hierholzer`, `kMeans`, `kMedoids`, `fuzzyCMeans`, `hierarchicalClustering` and `affinityPropagation` have no graphty counterpart: keep the Cytoscape built-ins. (`graphtyHierarchicalClustering` groups by structure, not data.)

### Weights are 32-bit floats

Edge weights are 32-bit floats, so weighted results match Cytoscape's to about 7 digits (a 0.1 edge gives `distanceTo` 0.10000000149011612). Integer weights match exactly.

## Layout mapping

| Cytoscape       | graphty                                                 |
| --------------- | ------------------------------------------------------- |
| `cose`, `fcose` | `graphty-forceatlas2` or `graphty-fruchterman-reingold` |
| `circle`        | `graphty-circular`                                      |
| `concentric`    | `graphty-shell` with `nlist` (below)                    |
| `breadthfirst`  | `graphty-bfs`, or `graphty-radial` for `circle: true`   |
| `grid`          | `graphty-grid`                                          |
| `random`        | `graphty-random`; pass `seed` for a repeatable result   |

`graphty-bfs` takes one `root`, not `roots`; pass `align: "horizontal"` for breadthfirst's root-at-top tree. Cytoscape's common layout options work the same, except `boundingBox`: a graphty layout keeps its aspect ratio instead of stretching to fill it.

### concentric to shell

Cytoscape's `concentric` sorts nodes by `concentric(node)` (default `node.degree()`), highest first, and starts a new ring when the value drops by `levelWidth` (default `maxDegree / 4`). `graphty-shell` takes the rings, innermost first, in `nlist`:

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

## Closeness, degree and betweenness

Cytoscape's closeness is harmonic, the sum of `1 / distance`; graphty's default is `1 / sum(distance)`. On the karate club graph, node `0` gives 0.0172, or Cytoscape's 23.17 with `harmonic: true`.

Weighted degree and `alpha` have no graphty counterpart: `graphtyDegreeCentrality` and `graphtyDegrees` throw on `weight`, so keep Cytoscape's `degreeCentrality` for them.

graphty's `degree(node)` counts distinct neighbors, Cytoscape's counts edges (two edges from `a` to `b`: Cytoscape 2, graphty 1); `graphtyDegrees()` counts edges. `normalized: true` divides by `n - 1`, not by the largest degree.

With `directed: true`, `degree(node)` is the total. For in- and out-degree, call `graphtyDegrees({ directed: true })` (`indegree(node)`, `outdegree(node)`) or pass `mode: "in"` or `"out"`, which needs `directed: true`.

On an undirected graph, `graphtyBetweennessCentrality`'s `score(node)` and `field` are half of `betweenness(node)`, which matches Cytoscape. Its `weight` option throws.

## See also

- [Algorithms](./algorithms): calling an algorithm and reading its result.
- [Layouts](./layouts): static layouts, simulations and events.
- [Algorithm reference](../reference/algorithms): every option and default.
