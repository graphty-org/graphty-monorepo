# Calling graphty functions directly

To run an @graphty/algorithms or @graphty/layout function that has no `graphty*` method or layout
in this package, turn your collection into a snapshot with `toSnapshot()`, call the function, and
write the result back onto the elements with `writeData()`. A snapshot is a frozen copy of the graph
in which every node and edge is addressed by its index, which is the input every function in those
two packages takes. The [@graphty/algorithms docs](https://graphty.app/docs/algorithms/) and the
[@graphty/layout API reference](https://graphty.app/docs/layout/api/generated/) list every
function and its options.

```js
import cytoscape from "cytoscape";
import graphtyCytoscape, { toSnapshot, writeData } from "@graphty/cytoscape-extensions";
import { pageRank } from "@graphty/algorithms";

cytoscape.use(graphtyCytoscape);

const cy = cytoscape({ headless: true });
await cy.graphtyDataset("karate");

const { snapshot, nodes } = toSnapshot(cy.elements());
const { scores } = pageRank(snapshot, { dampingFactor: 0.85 });
writeData(nodes, scores, "rank");

const top = cy.nodes().max((n) => n.data("rank")).ele;
console.log(top.id(), top.data("rank"));
```

`scores[i]` belongs to `nodes[i]`, so `writeData` stores each score in that node's `rank` data
field, where a stylesheet can map it (`mapData(rank, ...)`).

## Starting from a node and writing edge results

Functions that start from a node, such as `dijkstra`, take the node as its index or as `{ id }`
with the Cytoscape id. Path functions return edge indices, and edge index `e` is `edges[e]` of the
same `toSnapshot` result. This example finds the cheapest path from `a` to `d` by the `w` field and
marks its edges:

```js
import cytoscape from "cytoscape";
import graphtyCytoscape, { toSnapshot, writeData } from "@graphty/cytoscape-extensions";
import { dijkstra } from "@graphty/algorithms";

cytoscape.use(graphtyCytoscape);

const cy = cytoscape({
    headless: true,
    elements: [
        { data: { id: "a" } },
        { data: { id: "b" } },
        { data: { id: "c" } },
        { data: { id: "d" } },
        { data: { id: "ab", source: "a", target: "b", w: 2 } },
        { data: { id: "bd", source: "b", target: "d", w: 1 } },
        { data: { id: "ac", source: "a", target: "c", w: 1 } },
        { data: { id: "cd", source: "c", target: "d", w: 5 } },
    ],
});

const { snapshot, nodes, edges } = toSnapshot(cy.elements(), { weight: "w" });
const result = dijkstra(snapshot, { id: "a" });

const onPath = new Float64Array(edges.length);
for (const e of result.pathEdges({ id: "d" })) {
    onPath[e] = 1;
}
writeData(edges, onPath, "onPath");
writeData(nodes, result.dist, "distance");

console.log(cy.$("#d").data("distance")); // 3
console.log(cy.edges("[onPath = 1]").map((e) => e.id())); // [ "ab", "bd" ]
```

If you need the index itself, `snapshot.ids.requireIndex("a")` returns it.

## toSnapshot

`toSnapshot(eles, options)` returns a `CytoscapeSnapshot`:

| Field      | Type             | Meaning                                                 |
| ---------- | ---------------- | ------------------------------------------------------- |
| `snapshot` | `GraphSnapshot`  | The graph-format snapshot to pass to a graphty function |
| `nodes`    | `NodeCollection` | Node index `i` is `nodes[i]`                            |
| `edges`    | `EdgeCollection` | Edge index `e` is `edges[e]`                            |

Indices follow the collection's own order. An edge is included only when the collection holds the
edge and both of its endpoints. `toSnapshot(cy.nodes())` therefore has no edges at all: pass
`cy.elements()`, or a collection that contains the edges you want.

A compound parent in the collection becomes a node with no edges. It gets a PageRank score, takes
rank away from the real nodes, and is unreachable in path searches. When parents only group other
nodes, leave them out: `toSnapshot(cy.elements().not(":parent"))`.

The options (`SnapshotOptions`):

| Option     | Type                         | Default | Meaning                                    |
| ---------- | ---------------------------- | ------- | ------------------------------------------ |
| `directed` | `boolean`                    | `false` | Build a directed snapshot                  |
| `weight`   | `string \| (edge) => number` | none    | Edge data field, or a function of the edge |

With no `weight` every edge weighs 1. A weight field whose value is missing or not a finite number
reads as 1. The snapshot stores weights as 32-bit floats, so weights that differ only past about 7
significant digits can tie, which can change which path is shortest.

Each @graphty/algorithms function decides whether it uses the weights. `dijkstra` and
`allPairsShortestPath` use them by default. `pageRank`, `hits` and `katzCentrality` ignore them unless you pass
their own `weighted: true` option, so `pageRank(snapshot)` on a weighted snapshot gives unweighted
ranks. Check the options of the function you call.

## Caching

Each Cytoscape core caches one snapshot per option set (`directed` and the weight field name).
Calling `toSnapshot` again with the same options on a collection with the same elements, in the
same order, returns the identical `CytoscapeSnapshot`, with the same `snapshot` inside.

The cached snapshot is replaced or dropped when:

- you call `toSnapshot` with the same options on different elements, or on the same ones in
  another order. graphty layouts and algorithm methods call it too, so running one can replace
  yours (a layout reads the elements without compound parents).
- an element is added or removed, or an edge or node moves to another endpoint or parent.
- any element's data changes.

Dragging a node does not clear it. Writing a result is a data change, so after `writeData` the next
`toSnapshot` call builds a new snapshot. Build the snapshot once, run every function you need over
it, then write the results.

A `weight` function is never cached: each call with one builds a new snapshot.

## writeData

`writeData(elements, values, field)` sets `elements[i].data(field, values[i])` for every element,
inside one `cy.batch()`, so Cytoscape restyles once. `elements` is the `nodes` or `edges` of a
`CytoscapeSnapshot`, and `values` is any array-like of numbers in the same order: a
typed array or a plain array.

## Feeding a layout per-node data

Some layout options hold one value per node or per pair of nodes, such as `dist` on
`graphty-kamada-kawai`. The layout reads its nodes in the order of
`toSnapshot(cy.elements().not(":parent"))`: the laid-out collection without compound parents, which
Cytoscape sizes from their children. Build your array from that snapshot and the indices line up.

This example lays out the karate club graph with Kamada-Kawai, but treats any two members more than
3 hops apart as exactly 3 apart, which pulls the two factions closer together:

```js
import cytoscape from "cytoscape";
import graphtyCytoscape, { toSnapshot } from "@graphty/cytoscape-extensions";
import { allPairsShortestPath } from "@graphty/algorithms";

cytoscape.use(graphtyCytoscape);

const cy = cytoscape({ headless: true });
await cy.graphtyDataset("karate");

// Nodes and edges, without compound parents: the order the layout uses.
const { snapshot } = toSnapshot(cy.elements().not(":parent"));
const { dist } = allPairsShortestPath(snapshot);

const capped = dist.map((d) => Math.min(d, 3));

cy.layout({
    name: "graphty-kamada-kawai",
    dist: capped,
    boundingBox: { x1: 0, y1: 0, w: 600, h: 600 },
}).run();
```

`dist` holds `n * n` values row by row, so `dist[i * n + j]` is the ideal distance from node `i` to
node `j`. Without the option, Kamada-Kawai computes the plain shortest-path matrix itself; pass
`dist` when you want different distances. A matrix of the wrong length makes `run()` throw a
`RangeError`.

`nodeMass` on `graphty-forceatlas2` needs no snapshot. Give the name of a node data
field (`nodeMass: "mass"`; a node without a number there gets the default) or an object keyed by node
id (`{ a: 2, b: 5 }`). An ordered list must be a `Float32Array` with one value per node in the order
above. A plain array is read as an object keyed by id, so `[2, 5]` sets the mass of nodes `"0"` and
`"1"`, not of the first two nodes. `graphty-forceatlas2` also accepts `nodeSize` in the same forms, but
does not use it yet: nodes are treated as points.

The package also exports `NodeSelection`, the type of options that name nodes (a selector string
such as `"#a"`, or a collection), for typing your own wrappers.

## See also

- [Algorithms](./algorithms): the same functions as Cytoscape methods, with results you read by element.
- [Layouts](./layouts): every graphty layout and its options.
- [Algorithm reference](../reference/algorithms): every algorithm and its options.
