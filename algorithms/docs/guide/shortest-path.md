# Shortest Path Algorithms

Find the shortest path between nodes in a graph. Different algorithms suit different graph types. Each takes a graph
snapshot and node indices (see [Graph Data Structure](./graph.md)); edge weights are read as distances.

## Algorithm Selection Guide

| Algorithm              | Weights            | Negative Weights    | All Pairs | Time Complexity    |
| ---------------------- | ------------------ | ------------------- | --------- | ------------------ |
| BFS                    | No (unit)          | N/A                 | No        | O(V + E)           |
| Dijkstra               | Yes (non-negative) | No                  | No        | O((V + E) log V)   |
| Bidirectional Dijkstra | Yes (non-negative) | No                  | No        | O((V + E) log V)   |
| Bellman-Ford           | Yes                | Yes                 | No        | O(V x E)           |
| All pairs              | Yes                | Yes (no neg cycles) | Yes       | O(V x E) to O(V^3) |
| A\*                    | Yes (non-negative) | No                  | No        | O(E) best case     |

## Dijkstra's Algorithm

The standard algorithm for weighted graphs with non-negative edge weights.

<!-- doc-check -->

```typescript
import { GraphBuilder } from "@graphty/graph-format";
import { indexed } from "@graphty/algorithms";

const builder = new GraphBuilder({ directed: true });
builder.addEdge("a", "b", 4);
builder.addEdge("a", "c", 2);
builder.addEdge("b", "c", 1);
builder.addEdge("b", "d", 5);
builder.addEdge("c", "d", 8);
const graph = builder.freeze();
const d = graph.ids.requireIndex("d");

const result = indexed.dijkstra(graph, graph.ids.requireIndex("a"));

console.log(result.dist[d]); // 9
console.log(Array.from(result.pathTo(d), (i) => graph.ids.idOf(i))); // ["a", "b", "d"]

// Every node's distance; Infinity for a node the source cannot reach
console.log(Array.from(result.dist)); // [0, 4, 2, 9]
```

`result.pathEdges(target)` gives the edge indices along the same path, and the `cutoff` option skips every node farther
away than the given distance.

### Between Two Nodes

When only one target matters, `bidirectionalDijkstra` searches from both ends and stops where they meet:

<!-- doc-check -->

```typescript
import { GraphBuilder } from "@graphty/graph-format";
import { indexed } from "@graphty/algorithms";

const builder = new GraphBuilder({ directed: true });
builder.addEdge("a", "b", 4);
builder.addEdge("a", "c", 2);
builder.addEdge("b", "d", 5);
builder.addEdge("c", "d", 8);
const graph = builder.freeze();

const trip = indexed.bidirectionalDijkstra(graph, graph.ids.requireIndex("a"), graph.ids.requireIndex("d"));
console.log(trip.distance); // 9
console.log(Array.from(trip.path, (i) => graph.ids.idOf(i))); // ["a", "b", "d"]
```

::: warning
Dijkstra's algorithm does not work correctly with negative edge weights. Use Bellman-Ford instead.
:::

## Bellman-Ford Algorithm

Handles graphs with negative edge weights and detects negative cycles.

<!-- doc-check -->

```typescript
import { GraphBuilder } from "@graphty/graph-format";
import { indexed } from "@graphty/algorithms";

const builder = new GraphBuilder({ directed: true });
builder.addEdge("a", "b", 4);
builder.addEdge("b", "c", -2);
builder.addEdge("a", "c", 5);
const graph = builder.freeze();

const result = indexed.bellmanFord(graph, graph.ids.requireIndex("a"));
console.log(result.hasNegativeCycle); // false
console.log(result.dist[graph.ids.requireIndex("c")]); // 2

// A cycle whose weights sum below zero
builder.addEdge("c", "a", -3);
console.log(indexed.bellmanFord(builder.freeze(), 0).hasNegativeCycle); // true
```

On an undirected graph every edge can be walked both ways, so a single negative edge is already a negative cycle.

## All-Pairs Shortest Paths

`indexed.allPairsShortestPath` returns the distance between every pair of nodes as a dense row-major `Float64Array`. It
picks the fastest strategy for the graph: one breadth-first search per source when unweighted, Floyd-Warshall when a
weight is negative or the graph is dense, and one Dijkstra per source otherwise.

<!-- doc-check -->

```typescript
import { GraphBuilder } from "@graphty/graph-format";
import { indexed } from "@graphty/algorithms";

const builder = new GraphBuilder({ directed: true });
builder.addEdge("a", "b", 3);
builder.addEdge("b", "c", 1);
builder.addEdge("a", "c", 6);
builder.addEdge("c", "a", 2);
const graph = builder.freeze();
const a = graph.ids.requireIndex("a");
const b = graph.ids.requireIndex("b");
const c = graph.ids.requireIndex("c");

const result = indexed.allPairsShortestPath(graph, { paths: true });
console.log(result.dist[a * result.n + c]); // 4
console.log(result.dist[c * result.n + b]); // 5
console.log(Array.from(result.pathTo(a, c), (i) => graph.ids.idOf(i))); // ["a", "b", "c"]
```

It refuses graphs above 5,792 nodes unless `maxNodes` is raised, and reports a negative cycle as
`hasNegativeCycle: true` with every distance `NaN`.

::: tip
All-pairs shortest paths suit graphs where you query many different pairs: the whole table is computed once.
:::

### Exact Weights

A snapshot stores arc weights as 32-bit floats. Rounding a weight such as 0.1 to 32 bits changes more than the last
digits: with edges a-b 0.1, b-c 0.2 and a-c 0.3, the rounded weights make the path a, b, c shorter than the edge a-c,
where exact arithmetic finds them equal. A builder created with `weightDtype: "f64"` keeps the exact weights in an edge
column as well; pass them as the `weights` option:

<!-- doc-check -->

```typescript
import { expandEdges, GraphBuilder } from "@graphty/graph-format";
import { indexed } from "@graphty/algorithms";

const builder = new GraphBuilder({ directed: false, weightDtype: "f64" });
builder.addEdge("a", "b", 0.1);
builder.addEdge("b", "c", 0.2);
builder.addEdge("a", "c", 0.3);
const graph = builder.freeze();

const shadow = graph.edges.byRole("weight");
const exact = shadow !== null && shadow.dtype === "f64" ? expandEdges(graph, shadow.data) : graph.weights;
const result = indexed.allPairsShortestPath(graph, { weights: exact ?? undefined, paths: true });
console.log(result.pathTo(0, 2).length); // 2: the direct edge a-c

// With the rounded weights the detour through b is shorter
console.log(indexed.allPairsShortestPath(graph, { paths: true }).pathTo(0, 2).length); // 3: a, b, c
```

## A\* Search

A heuristic-guided search that can be faster than Dijkstra when a good heuristic is available.

<!-- doc-check -->

```typescript
import { GraphBuilder } from "@graphty/graph-format";
import { indexed } from "@graphty/algorithms";

// Graph with 2D coordinates
const positions: Record<string, [number, number]> = {
    a: [0, 0],
    b: [1, 0],
    c: [2, 1],
    d: [3, 1],
};
const builder = new GraphBuilder({ directed: true });
builder.addEdge("a", "b", 1);
builder.addEdge("b", "c", 1.5);
builder.addEdge("a", "c", 3);
builder.addEdge("c", "d", 1);
const graph = builder.freeze();

// Euclidean distance heuristic, over node indices
const heuristic = (node: number, goal: number) => {
    const [x1, y1] = positions[String(graph.ids.idOf(node))];
    const [x2, y2] = positions[String(graph.ids.idOf(goal))];
    return Math.hypot(x1 - x2, y1 - y2);
};

const result = indexed.astar(graph, graph.ids.requireIndex("a"), graph.ids.requireIndex("d"), heuristic);
console.log(Array.from(result.path, (i) => graph.ids.idOf(i))); // ["a", "b", "c", "d"]
console.log(result.distance); // 3.5
console.log(result.visited.length); // 3
```

### Heuristic Requirements

For A\* to find optimal paths, the heuristic must be:

1. **Admissible**: never overestimates the actual cost
2. **Consistent**: h(n) <= cost(n, n') + h(n'); an expanded node is never reopened, so an inconsistent heuristic can
   miss the shortest path

Common heuristics:

- **Euclidean distance**: for 2D/3D spatial graphs
- **Manhattan distance**: for grid-based graphs
- **Zero**: degenerates to Dijkstra's algorithm

## Practical Example: Degrees of Separation

In an unweighted graph the BFS depth is the number of hops:

<!-- doc-check -->

```typescript
import { GraphBuilder } from "@graphty/graph-format";
import { indexed } from "@graphty/algorithms";

const builder = new GraphBuilder({ directed: false });
builder.addEdge("Alice", "Bob");
builder.addEdge("Bob", "Carol");
builder.addEdge("Alice", "Dave");
const social = builder.freeze();

const result = indexed.breadthFirstSearch(social, social.ids.requireIndex("Alice"));
console.log(`Carol is ${String(result.depth[social.ids.requireIndex("Carol")])} connections away`); // Carol is 2 connections away
```
