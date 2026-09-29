# Traversal Algorithms

Traversal algorithms systematically visit the nodes of a graph. They form the foundation for many other graph
algorithms. Each one takes a graph snapshot and a start node index, and returns typed arrays indexed by node (see
[Graph Data Structure](./graph.md) for how snapshots and node indices work).

## Breadth-First Search (BFS)

BFS explores nodes level by level, visiting all neighbours of a node before moving to the next level.

<!-- doc-check -->

```typescript
import { GraphBuilder } from "@graphty/graph-format";
import { indexed } from "@graphty/algorithms";

const builder = new GraphBuilder({ directed: true });
builder.addEdge("a", "b");
builder.addEdge("a", "c");
builder.addEdge("b", "d");
builder.addEdge("c", "d");
const graph = builder.freeze();
const name = (i: number) => graph.ids.idOf(i);

const result = indexed.breadthFirstSearch(graph, graph.ids.requireIndex("a"));

// `order` holds the visited nodes first; `visitedCount` says how many
console.log(Array.from(result.order.subarray(0, result.visitedCount), name)); // ["a", "b", "c", "d"]
console.log(result.depth[graph.ids.requireIndex("d")]); // 2
console.log(name(result.parent[graph.ids.requireIndex("d")])); // b
```

`parent` and `depth` hold `INVALID_INDEX` (4294967295) for the start node's parent and for every node the search did
not reach.

### BFS Options

<!-- doc-check -->

```typescript
import { GraphBuilder } from "@graphty/graph-format";
import { indexed } from "@graphty/algorithms";

const builder = new GraphBuilder({ directed: true });
builder.addEdge("a", "b");
builder.addEdge("b", "c");
builder.addEdge("c", "d");
const graph = builder.freeze();
const a = graph.ids.requireIndex("a");

// Explore at most two hops from the start
const near = indexed.breadthFirstSearch(graph, a, { maxDepth: 2 });
console.log(near.visitedCount); // 3

// Stop as soon as "c" is reached
const toC = indexed.breadthFirstSearch(graph, a, { target: graph.ids.requireIndex("c") });
console.log(toC.visitedCount); // 3
```

To search against the direction of the edges, pass the reverse view: `indexed.breadthFirstSearch(graph.reverse(), start)`.

For very large, low-diameter graphs, `indexed.directionOptimizedBfs(graph, start)` returns the same kind of result and
switches between top-down and bottom-up steps.

### Use Cases

- Finding shortest paths in unweighted graphs
- Level-order traversal
- Finding connected components
- Testing bipartiteness

## Depth-First Search (DFS)

DFS explores as far as possible along each branch before backtracking.

<!-- doc-check -->

```typescript
import { GraphBuilder } from "@graphty/graph-format";
import { indexed } from "@graphty/algorithms";

const builder = new GraphBuilder({ directed: true });
builder.addEdge("a", "b");
builder.addEdge("a", "c");
builder.addEdge("b", "d");
builder.addEdge("c", "d");
const graph = builder.freeze();
const name = (i: number) => graph.ids.idOf(i);
const a = graph.ids.requireIndex("a");

const pre = indexed.depthFirstSearch(graph, a);
console.log(Array.from(pre.order.subarray(0, pre.visitedCount), name)); // ["a", "b", "d", "c"]

// Post-order lists a node once everything below it is done
const post = indexed.depthFirstSearch(graph, a, { order: "post" });
console.log(Array.from(post.order.subarray(0, post.visitedCount), name)); // ["d", "b", "c", "a"]
```

### Use Cases

- Topological sorting
- Cycle detection
- Strongly connected components
- Path finding

## Topological Sort

Orders the nodes of a directed acyclic graph (DAG) so that for every edge u -> v, u comes before v.

<!-- doc-check -->

```typescript
import { GraphBuilder } from "@graphty/graph-format";
import { indexed } from "@graphty/algorithms";

const builder = new GraphBuilder({ directed: true });
builder.addEdge("compile", "link");
builder.addEdge("compile", "test");
builder.addEdge("link", "deploy");
builder.addEdge("test", "deploy");
const graph = builder.freeze();

const order = indexed.topologicalSort(graph);
console.log(order === null ? null : Array.from(order, (i) => graph.ids.idOf(i))); // ["compile", "test", "link", "deploy"]
```

::: warning
`topologicalSort` returns `null` when the graph has a cycle, and throws for an undirected graph.
:::

## Cycle Detection

<!-- doc-check -->

```typescript
import { GraphBuilder } from "@graphty/graph-format";
import { indexed } from "@graphty/algorithms";

const builder = new GraphBuilder({ directed: true });
builder.addEdge("a", "b");
builder.addEdge("b", "c");
const graph = builder.freeze();
console.log(indexed.hasCycle(graph)); // false

builder.addEdge("c", "a"); // closes a cycle
console.log(indexed.hasCycle(builder.freeze())); // true
```

## Connected Components

<!-- doc-check -->

```typescript
import { GraphBuilder } from "@graphty/graph-format";
import { indexed } from "@graphty/algorithms";

const builder = new GraphBuilder({ directed: false });
builder.addEdge("a", "b");
builder.addEdge("c", "d");
builder.addNode("e");
const graph = builder.freeze();

const components = indexed.connectedComponents(graph);
console.log(components.count); // 3
console.log(components.groups().map((g) => Array.from(g, (i) => graph.ids.idOf(i)))); // [["a", "b"], ["c", "d"], ["e"]]

// On a directed graph: weakly (ignoring direction) or strongly connected components
const cycle = new GraphBuilder({ directed: true });
cycle.addEdge("x", "y");
cycle.addEdge("y", "x");
cycle.addEdge("y", "z");
const directed = cycle.freeze();
console.log(indexed.weaklyConnectedComponents(directed).count); // 1
console.log(indexed.stronglyConnectedComponents(directed).count); // 2
```

## Bipartite Test

<!-- doc-check -->

```typescript
import { GraphBuilder } from "@graphty/graph-format";
import { indexed } from "@graphty/algorithms";

const builder = new GraphBuilder({ directed: false });
builder.addEdge("a", "b");
builder.addEdge("b", "c");
builder.addEdge("c", "d");
builder.addEdge("d", "a");
console.log(indexed.isBipartite(builder.freeze()).bipartite); // true
```

## Performance Comparison

| Algorithm        | Time Complexity | Space Complexity | Best For                    |
| ---------------- | --------------- | ---------------- | --------------------------- |
| BFS              | O(V + E)        | O(V)             | Shortest hops, level order  |
| DFS              | O(V + E)        | O(V)             | Connectivity, cycles        |
| Topological Sort | O(V + E)        | O(V)             | Dependency order            |
| Components       | O(V + E)        | O(V)             | Splitting a graph in pieces |

Where V = vertices and E = edges.
