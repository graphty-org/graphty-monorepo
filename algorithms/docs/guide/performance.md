# Performance

`@graphty/algorithms` runs over graph snapshots: compact typed arrays in compressed sparse row form, with no per-node or
per-edge objects. This guide covers performance characteristics and optimization tips. To measure every algorithm on
your own machine, run `npm run benchmark` in the package.

## Time Complexity Reference

### Traversal

| Algorithm        | Time     | Space |
| ---------------- | -------- | ----- |
| BFS              | O(V + E) | O(V)  |
| DFS              | O(V + E) | O(V)  |
| Topological Sort | O(V + E) | O(V)  |

### Shortest Path

| Algorithm    | Time               | Space  |
| ------------ | ------------------ | ------ |
| Dijkstra     | O((V + E) log V)   | O(V)   |
| Bellman-Ford | O(V x E)           | O(V)   |
| All pairs    | O(V x E) to O(V^3) | O(V^2) |
| A\*          | O(E) to O(E log V) | O(V)   |

### Centrality

| Algorithm   | Time     | Space    |
| ----------- | -------- | -------- |
| Degree      | O(V + E) | O(V)     |
| Betweenness | O(V x E) | O(V + E) |
| Closeness   | O(V x E) | O(V)     |
| PageRank    | O(k x E) | O(V)     |

### Community Detection

| Algorithm         | Time       | Space    |
| ----------------- | ---------- | -------- |
| Louvain           | O(V log V) | O(V + E) |
| Label Propagation | O(E)       | O(V)     |
| Girvan-Newman     | O(V x E^2) | O(V + E) |

## Memory

A snapshot stores a graph in a few flat typed arrays of 4-byte entries, indexed by node or by arc (an undirected edge
is two arcs), rather than one object per node and per edge. Results are typed arrays with one entry per node, so they
cost no more than the graph itself.

## Best Practices

### 1. Choose the Right Algorithm

<!-- doc-check -->

```typescript
import { GraphBuilder } from "@graphty/graph-format";
import { indexed } from "@graphty/algorithms";

const builder = new GraphBuilder({ directed: false });
for (let i = 0; i < 100; i++) {
    builder.addEdge(i, (i + 1) % 100, 1);
}
const graph = builder.freeze();

// One source, one target: search from both ends
const one = indexed.bidirectionalDijkstra(graph, 0, 50);

// One source, every target: Dijkstra
const all = indexed.dijkstra(graph, 0);

// Every pair: compute the whole table once
const table = indexed.allPairsShortestPath(graph);

console.log(one.distance, all.dist[50], table.dist[0 * table.n + 50]); // 50 50 50
```

### 2. Early Termination

<!-- doc-check -->

```typescript
import { GraphBuilder } from "@graphty/graph-format";
import { indexed } from "@graphty/algorithms";

const builder = new GraphBuilder({ directed: false });
for (let i = 0; i < 1000; i++) {
    builder.addEdge(i, i + 1, 1);
}
const graph = builder.freeze();

// Stop once the target is reached
const toTen = indexed.breadthFirstSearch(graph, 0, { target: 10 });
console.log(toTen.visitedCount); // 11

// Limit the depth
console.log(indexed.breadthFirstSearch(graph, 0, { maxDepth: 5 }).visitedCount); // 6

// Skip everything farther than a distance
const near = indexed.dijkstra(graph, 0, { cutoff: 3 });
console.log(near.dist[4]); // Infinity: beyond the cutoff
```

### 3. Approximate for Large Graphs

<!-- doc-check -->

```typescript
import { GraphBuilder } from "@graphty/graph-format";
import { indexed } from "@graphty/algorithms";

const builder = new GraphBuilder({ directed: false });
for (let i = 0; i < 500; i++) {
    builder.addEdge(i, (i * 7 + 3) % 500);
    builder.addEdge(i, (i + 1) % 500);
}
const graph = builder.freeze();

// Betweenness from 100 sampled sources instead of all 500
const betweenness = indexed.betweennessCentrality(graph, { k: 100 });

// Fewer PageRank iterations and a looser tolerance
const ranks = indexed.pageRank(graph, { maxIterations: 50, tolerance: 1e-4 });

console.log(betweenness.scores.length, ranks.scores.length); // 500 500
```

### 4. Avoid Recomputation

Compute once and read the result many times. Every per-node result is a typed array, so a lookup is one index:

<!-- doc-check -->

```typescript
import { GraphBuilder } from "@graphty/graph-format";
import { indexed } from "@graphty/algorithms";

const builder = new GraphBuilder({ directed: true });
builder.addEdge("source", "a", 2);
builder.addEdge("a", "b", 3);
const graph = builder.freeze();

const paths = indexed.dijkstra(graph, graph.ids.requireIndex("source"));
for (const id of ["a", "b"]) {
    console.log(`${id}: ${String(paths.dist[graph.ids.requireIndex(id)])}`);
}
console.log(paths.dist[graph.ids.requireIndex("b")]); // 5
```

Freezing is not free either: keep the snapshot and reuse it until the graph changes.

### 5. Use Web Workers for Heavy Computation

A snapshot crosses to a worker without copying its arrays: `graph.toWire({ transfer: true })` gives a manifest and the
buffers to pass as the `postMessage` transfer list, and `fromWire` rebuilds the snapshot on the other side. The round
trip, in one thread:

<!-- doc-check -->

```typescript
import { fromWire, GraphBuilder } from "@graphty/graph-format";
import { indexed } from "@graphty/algorithms";

const builder = new GraphBuilder({ directed: false });
builder.addEdge("a", "b");
builder.addEdge("b", "c");
builder.addEdge("d", "e");
const graph = builder.freeze();

// main thread: worker.postMessage(wire, [...wire.buffers])
const wire = graph.toWire();

// worker: const copy = fromWire(event.data)
const copy = fromWire(wire);
console.log(indexed.connectedComponents(copy).count); // 2
```

## Profiling

<!-- doc-check -->

```typescript
import { GraphBuilder } from "@graphty/graph-format";
import { indexed } from "@graphty/algorithms";

const builder = new GraphBuilder({ directed: false });
for (let i = 0; i < 10000; i++) {
    builder.addEdge(i, (i + 1) % 10000, 1);
}
const graph = builder.freeze();

const started = performance.now();
const result = indexed.dijkstra(graph, 0);
const elapsed = performance.now() - started;
console.log(`dijkstra over ${String(graph.nodeCount)} nodes took ${elapsed.toFixed(1)} ms`);
console.log(result.dist[5000]); // 5000
```
