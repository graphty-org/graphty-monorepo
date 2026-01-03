# Shortest Path Algorithms

Find the shortest path between nodes in a graph. Different algorithms are suited for different graph types.

## Algorithm Selection Guide

| Algorithm | Weights | Negative Weights | All Pairs | Time Complexity |
|-----------|---------|------------------|-----------|-----------------|
| BFS | No (unit) | N/A | No | O(V + E) |
| Dijkstra | Yes (non-negative) | No | No | O((V + E) log V) |
| Bellman-Ford | Yes | Yes | No | O(V × E) |
| Floyd-Warshall | Yes | Yes (no neg cycles) | Yes | O(V³) |
| A* | Yes (non-negative) | No | No | O(E) best case |

## Dijkstra's Algorithm

The standard algorithm for weighted graphs with non-negative edge weights.

```typescript
import { Graph, dijkstra } from "@graphty/algorithms";

const graph = new Graph<string>();
graph.addEdge("a", "b", { weight: 4 });
graph.addEdge("a", "c", { weight: 2 });
graph.addEdge("b", "c", { weight: 1 });
graph.addEdge("b", "d", { weight: 5 });
graph.addEdge("c", "d", { weight: 8 });

const result = dijkstra(graph, "a");

// Get distance to a specific node
console.log(result.distances.get("d")); // 9

// Get the path to a node
console.log(result.paths.get("d")); // ["a", "b", "d"]

// Get all reachable distances
for (const [node, distance] of result.distances) {
  console.log(`${node}: ${distance}`);
}
```

### Dijkstra to Single Target

```typescript
// Stop as soon as target is found (more efficient)
const result = dijkstra(graph, "a", { target: "d" });

console.log(result.distance); // 9
console.log(result.path);     // ["a", "b", "d"]
```

::: warning
Dijkstra's algorithm does not work correctly with negative edge weights. Use Bellman-Ford instead.
:::

## Bellman-Ford Algorithm

Handles graphs with negative edge weights and detects negative cycles.

```typescript
import { Graph, bellmanFord } from "@graphty/algorithms";

const graph = new Graph<string>();
graph.addEdge("a", "b", { weight: 4 });
graph.addEdge("b", "c", { weight: -2 });
graph.addEdge("a", "c", { weight: 5 });

const result = bellmanFord(graph, "a");

if (result.hasNegativeCycle) {
  console.log("Graph contains a negative cycle!");
} else {
  console.log(result.distances.get("c")); // 2 (a -> b -> c: 4 + -2)
}
```

### Negative Cycle Detection

```typescript
const graph = new Graph<string>();
graph.addEdge("a", "b", { weight: 1 });
graph.addEdge("b", "c", { weight: -1 });
graph.addEdge("c", "a", { weight: -1 }); // Creates negative cycle

const result = bellmanFord(graph, "a");
console.log(result.hasNegativeCycle); // true
```

## Floyd-Warshall Algorithm

Finds shortest paths between all pairs of nodes.

```typescript
import { Graph, floydWarshall } from "@graphty/algorithms";

const graph = new Graph<string>();
graph.addEdge("a", "b", { weight: 3 });
graph.addEdge("b", "c", { weight: 1 });
graph.addEdge("a", "c", { weight: 6 });
graph.addEdge("c", "a", { weight: 2 });

const result = floydWarshall(graph);

// Get distance between any two nodes
console.log(result.distance("a", "c")); // 4 (a -> b -> c)
console.log(result.distance("c", "b")); // 5 (c -> a -> b)

// Get path between any two nodes
console.log(result.path("a", "c")); // ["a", "b", "c"]
```

::: tip
Floyd-Warshall is ideal when you need to query shortest paths between many different pairs of nodes, as it precomputes all paths in O(V³) time.
:::

## A* Search

A heuristic-guided search that can be faster than Dijkstra when a good heuristic is available.

```typescript
import { Graph, aStar } from "@graphty/algorithms";

// Graph with 2D coordinates
const graph = new Graph<string>();
const positions = new Map([
  ["a", { x: 0, y: 0 }],
  ["b", { x: 1, y: 0 }],
  ["c", { x: 2, y: 1 }],
  ["d", { x: 3, y: 1 }],
]);

graph.addEdge("a", "b", { weight: 1 });
graph.addEdge("b", "c", { weight: 1.5 });
graph.addEdge("a", "c", { weight: 3 });
graph.addEdge("c", "d", { weight: 1 });

// Euclidean distance heuristic
const heuristic = (node: string, goal: string) => {
  const p1 = positions.get(node)!;
  const p2 = positions.get(goal)!;
  return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
};

const result = aStar(graph, "a", "d", heuristic);

console.log(result.path);     // ["a", "b", "c", "d"]
console.log(result.distance); // 3.5
console.log(result.explored); // Number of nodes explored (often less than Dijkstra)
```

### Heuristic Requirements

For A* to find optimal paths, the heuristic must be:

1. **Admissible**: Never overestimates the actual cost
2. **Consistent** (optional): h(n) ≤ cost(n, n') + h(n')

Common heuristics:
- **Euclidean distance**: For 2D/3D spatial graphs
- **Manhattan distance**: For grid-based graphs
- **Zero**: Degenerates to Dijkstra's algorithm

## Practical Examples

### Road Network

```typescript
const roads = new Graph<string>();
roads.addEdge("NYC", "Boston", { weight: 215 });
roads.addEdge("NYC", "Philadelphia", { weight: 95 });
roads.addEdge("Boston", "Portland", { weight: 110 });
// ... more roads

const trip = dijkstra(roads, "NYC", { target: "Portland" });
console.log(`Distance: ${trip.distance} miles`);
console.log(`Route: ${trip.path.join(" → ")}`);
```

### Social Network (Unweighted)

```typescript
const social = new Graph<string>({ directed: false });
social.addEdge("Alice", "Bob");
social.addEdge("Bob", "Carol");
social.addEdge("Alice", "Dave");
// ... connections

// Find degrees of separation
const result = bfs(social, "Alice");
console.log(`Carol is ${result.distances.get("Carol")} connections away`);
```
