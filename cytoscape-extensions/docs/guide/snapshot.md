# Calling graphty functions directly

To run an @graphty/algorithms or @graphty/layout function that has no `graphty*` method or layout
in this package, turn your collection into a snapshot with `toSnapshot()`, call the function, and
write the result back onto the elements with `writeData()`. A snapshot is a frozen copy of the graph
in which every node and edge is addressed by its index. See the
[@graphty/algorithms docs](https://graphty.app/docs/algorithms/) and the
[@graphty/layout API reference](https://graphty.app/docs/layout/api/generated/).

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

`scores[i]` belongs to `nodes[i]`; `writeData` stores it in that node's `rank` field.

## Starting from a node and writing edge results

Functions that start from a node, such as `dijkstra`, take its index or `{ id }` with the Cytoscape
id. Path functions return edge indices: edge index `e` is `edges[e]`. This example marks the
cheapest path from `a` to `d` by the `w` field:

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
        { data: { id: "d" } },
        { data: { id: "ab", source: "a", target: "b", w: 2 } },
        { data: { id: "bd", source: "b", target: "d", w: 1 } },
        { data: { id: "ad", source: "a", target: "d", w: 5 } },
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

`snapshot.ids.requireIndex("a")` turns an id into an index, and throws for an unknown id.

## toSnapshot

`toSnapshot(eles, options)` returns `{ snapshot, nodes, edges }`. Indices follow the collection's
order. An edge is included only when the collection holds it and both endpoints, so
`toSnapshot(cy.nodes())` has no edges. A compound parent becomes an isolated node that takes
PageRank away from real nodes; leave parents out with `cy.elements().not(":parent")`.

| Option     | Type                         | Default | Meaning                                    |
| ---------- | ---------------------------- | ------- | ------------------------------------------ |
| `directed` | `boolean`                    | `false` | Build a directed snapshot                  |
| `weight`   | `string \| (edge) => number` | none    | Edge data field, or a function of the edge |

Without `weight` every edge weighs 1, and so does an edge whose field is missing or not a finite
number. Weights are stored as
[32-bit floats](./migrating-from-cytoscape#weights-are-32-bit-floats). `dijkstra` and
`allPairsShortestPath` use weights by default; `pageRank`, `hits` and `katzCentrality` ignore them
unless you pass `weighted: true`.

## Caching

Each core caches one snapshot per `directed` and weight field name: the same elements in the same
order return the identical object. A call on other elements replaces it, and graphty layouts and
algorithm methods call `toSnapshot` too. Adding or removing an element, changing an edge's
endpoints or a node's parent, or changing any data drops it; dragging does not. A `weight`
function is never cached. `writeData` changes data, so run every function before you write.

## writeData

`writeData(elements, values, field)` sets `elements[i].data(field, values[i])` in one
`cy.batch()`. `elements` is a snapshot's `nodes` or `edges`; `values` is a typed or plain array.

## Feeding a layout per-node data

Options such as `dist` on `graphty-kamada-kawai` hold one value per node or node pair, in the order
of `toSnapshot(cy.elements().not(":parent"))`. This example treats karate club members more than 3
hops apart as exactly 3 apart, which pulls the two factions together:

```js
import cytoscape from "cytoscape";
import graphtyCytoscape, { toSnapshot } from "@graphty/cytoscape-extensions";
import { allPairsShortestPath } from "@graphty/algorithms";

cytoscape.use(graphtyCytoscape);

const cy = cytoscape({ headless: true });
await cy.graphtyDataset("karate");

// The node order the layout uses.
const { snapshot } = toSnapshot(cy.elements().not(":parent"));
const { dist } = allPairsShortestPath(snapshot);

cy.layout({
    name: "graphty-kamada-kawai",
    dist: dist.map((d) => Math.min(d, 3)),
    boundingBox: { x1: 0, y1: 0, w: 600, h: 600 },
}).run();
```

The [layout reference](../reference/layouts#per-node-arrays) lists every per-node option.

## See also

- [Algorithms](./algorithms): the same functions as Cytoscape methods.
