# Traversal Algorithms

Traversal algorithms systematically visit all nodes in a graph. They form the foundation for many other graph algorithms.

## Breadth-First Search (BFS)

BFS explores nodes level by level, visiting all neighbors of a node before moving to the next level.

```typescript
import { Graph, bfs } from "@graphty/algorithms";

const graph = new Graph<string>();
graph.addEdge("a", "b");
graph.addEdge("a", "c");
graph.addEdge("b", "d");
graph.addEdge("c", "d");

const result = bfs(graph, "a");

console.log(result.order);     // ["a", "b", "c", "d"]
console.log(result.distances); // Map { "a" => 0, "b" => 1, "c" => 1, "d" => 2 }
console.log(result.parents);   // Map { "b" => "a", "c" => "a", "d" => "b" }
```

### BFS Options

```typescript
const result = bfs(graph, "a", {
  // Maximum depth to explore
  maxDepth: 3,

  // Custom visitor function
  visitor: (node, depth) => {
    console.log(`Visiting ${node} at depth ${depth}`);
  },

  // Stop when target is found
  target: "d",
});
```

### Use Cases

- Finding shortest path in unweighted graphs
- Level-order traversal
- Finding connected components
- Testing bipartiteness

## Depth-First Search (DFS)

DFS explores as far as possible along each branch before backtracking.

```typescript
import { Graph, dfs } from "@graphty/algorithms";

const graph = new Graph<string>();
graph.addEdge("a", "b");
graph.addEdge("a", "c");
graph.addEdge("b", "d");
graph.addEdge("c", "d");

const result = dfs(graph, "a");

console.log(result.order);      // ["a", "b", "d", "c"]
console.log(result.preorder);   // Pre-order traversal
console.log(result.postorder);  // Post-order traversal
```

### DFS Options

```typescript
const result = dfs(graph, "a", {
  // Pre-visit callback
  preVisit: (node) => {
    console.log(`Entering ${node}`);
  },

  // Post-visit callback
  postVisit: (node) => {
    console.log(`Leaving ${node}`);
  },

  // Maximum depth
  maxDepth: 5,
});
```

### Use Cases

- Topological sorting
- Cycle detection
- Strongly connected components
- Path finding
- Tree/graph traversal

## Iterative Deepening DFS

Combines the space efficiency of DFS with the completeness of BFS.

```typescript
import { Graph, iterativeDeepeningDfs } from "@graphty/algorithms";

const graph = new Graph<string>();
// ... add nodes and edges

const result = iterativeDeepeningDfs(graph, "start", "goal");

console.log(result.found);     // true if goal was found
console.log(result.path);      // Path from start to goal
console.log(result.depth);     // Depth at which goal was found
```

## Bidirectional Search

Searches from both the start and goal simultaneously, meeting in the middle.

```typescript
import { Graph, bidirectionalSearch } from "@graphty/algorithms";

const graph = new Graph<string>();
// ... add nodes and edges

const result = bidirectionalSearch(graph, "start", "goal");

console.log(result.found);  // true if path exists
console.log(result.path);   // Shortest path
console.log(result.length); // Path length
```

### Efficiency

Bidirectional search can be significantly faster than unidirectional BFS for large graphs:

- BFS: O(b^d) where b is branching factor, d is depth
- Bidirectional: O(b^(d/2)) - explores much less of the graph

## Topological Sort

Orders nodes in a directed acyclic graph (DAG) such that for every edge u→v, u comes before v.

```typescript
import { Graph, topologicalSort } from "@graphty/algorithms";

const graph = new Graph<string>();
graph.addEdge("compile", "link");
graph.addEdge("compile", "test");
graph.addEdge("link", "deploy");
graph.addEdge("test", "deploy");

const order = topologicalSort(graph);
console.log(order); // ["compile", "link", "test", "deploy"] or similar valid order
```

::: warning
Topological sort only works on directed acyclic graphs (DAGs). If the graph contains cycles, an error will be thrown.
:::

## Cycle Detection

```typescript
import { Graph, hasCycle, findCycles } from "@graphty/algorithms";

const graph = new Graph<string>();
graph.addEdge("a", "b");
graph.addEdge("b", "c");
graph.addEdge("c", "a"); // Creates a cycle

console.log(hasCycle(graph)); // true

const cycles = findCycles(graph);
console.log(cycles); // [["a", "b", "c"]]
```

## Performance Comparison

| Algorithm | Time Complexity | Space Complexity | Best For |
|-----------|-----------------|------------------|----------|
| BFS | O(V + E) | O(V) | Shortest paths, level order |
| DFS | O(V + E) | O(V) | Connectivity, cycles |
| IDDFS | O(b^d) | O(d) | Unknown depth, memory limited |
| Bidirectional | O(b^(d/2)) | O(b^(d/2)) | Single source-target |

Where V = vertices, E = edges, b = branching factor, d = depth.
