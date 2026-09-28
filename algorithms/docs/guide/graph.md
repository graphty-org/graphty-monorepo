# Graph Data Structure

Every algorithm in `@graphty/algorithms` runs over a `GraphSnapshot` from
[`@graphty/graph-format`](https://www.npmjs.com/package/@graphty/graph-format): a frozen, read-only graph stored as typed
arrays in compressed sparse row (CSR) form. You build one with a `GraphBuilder`, freeze it, and hand the snapshot to the
algorithms in the `indexed` namespace.

## Building a Graph

<!-- doc-check -->

```typescript
import { GraphBuilder } from "@graphty/graph-format";

// `directed` is required
const builder = new GraphBuilder({ directed: false });

// Add nodes explicitly, or let addEdge add them on first mention
builder.addNode("a");
builder.addEdge("a", "b");
builder.addEdge("b", "c", 5); // an optional weight

const graph = builder.freeze();
console.log(graph.nodeCount, graph.edgeCount, graph.directed); // 3 2 false
```

A snapshot never changes. To change the graph, keep using the builder (or start one from a snapshot with
`GraphBuilder.from(snapshot)`) and freeze again.

## Node Ids and Node Indices

Algorithms work on node indices, `0` to `nodeCount - 1`, which follow the order in which ids first appeared. The
snapshot's `ids` map converts between the two:

<!-- doc-check -->

```typescript
import { GraphBuilder } from "@graphty/graph-format";

const builder = new GraphBuilder({ directed: true });
builder.addEdge("x", "y");
builder.addEdge("y", "z");
const graph = builder.freeze();

console.log(graph.ids.requireIndex("y")); // 1
console.log(graph.ids.idOf(2)); // z
console.log(graph.ids.indexOf("missing")); // 4294967295: INVALID_INDEX, the "not found" index
console.log(graph.ids.toArray()); // ["x", "y", "z"]

// Turn a per-node result into a Map keyed by id
const labels = new Float64Array([0.5, 0.25, 0.25]);
console.log(graph.ids.toMap(labels).get("x")); // 0.5
```

`requireIndex` throws for an unknown id; `indexOf` returns `INVALID_INDEX` instead.

## Neighbours, Degrees and Weights

<!-- doc-check -->

```typescript
import { GraphBuilder } from "@graphty/graph-format";

const builder = new GraphBuilder({ directed: true });
builder.addEdge("a", "b", 2);
builder.addEdge("a", "c", 3);
builder.addEdge("c", "a", 1);
const graph = builder.freeze();
const a = graph.ids.requireIndex("a");

// The out-neighbours of a node are a slice of colIdx
const [start, end] = graph.outArcs(a);
console.log(Array.from(graph.colIdx.subarray(start, end), (i) => graph.ids.idOf(i))); // ["b", "c"]
console.log(Array.from(graph.weights?.subarray(start, end) ?? [])); // [2, 3]

// In-neighbours come from the reverse view
const reverse = graph.reverse();
console.log(reverse.rowPtr[a + 1] - reverse.rowPtr[a]); // 1: only "c" points at "a"

console.log(graph.outDegree()); // [2, 0, 1]
console.log(graph.inDegree()); // [1, 1, 1]
console.log(graph.hasArc(a, graph.ids.requireIndex("b"))); // true
```

An undirected snapshot stores each edge as two arcs, one in each direction, so `outArcs` lists every neighbour.

## Loading Edges in Bulk

When the edges are already in arrays, `fromEdgeArrays` builds the snapshot in one call:

<!-- doc-check -->

```typescript
import { fromEdgeArrays } from "@graphty/graph-format";

const graph = fromEdgeArrays({
    directed: false,
    nodeCount: 3, // or `ids`, one id per node index
    src: Uint32Array.of(0, 1, 2),
    dst: Uint32Array.of(1, 2, 0),
});
console.log(graph.nodeCount, graph.edgeCount); // 3 3
```

Files in GEXF, GraphML, GML, DOT, Pajek, CSV and JSON load into a snapshot through
[`@graphty/graph-io`](https://www.npmjs.com/package/@graphty/graph-io).

## Derived Graphs

<!-- doc-check -->

```typescript
import { GraphBuilder } from "@graphty/graph-format";

const builder = new GraphBuilder({ directed: true });
builder.addEdge("a", "b");
builder.addEdge("b", "a");
builder.addEdge("b", "c");
const directed = builder.freeze();

// The undirected copy merges a-b and b-a into one edge
const undirected = directed.toUndirected().snapshot;
console.log(undirected.directed, undirected.edgeCount); // false 2
```

## Graphs Built With the `Graph` Class

The id-keyed `Graph` class of this package is the previous API and is still exported. `toSnapshot` converts one of its
graphs:

<!-- doc-check -->

```typescript
import { Graph, indexed, toSnapshot } from "@graphty/algorithms";

const legacy = new Graph({ directed: false });
legacy.addEdge("a", "b");
legacy.addEdge("b", "c");

const graph = toSnapshot(legacy);
console.log(indexed.connectedComponents(graph).count); // 1
```

## Next Steps

- [Traversal Algorithms](./traversal.md) - BFS, DFS, and more
- [Shortest Path](./shortest-path.md) - Dijkstra, Bellman-Ford
