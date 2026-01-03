# Graph Data Structure

The `Graph` class is the core data structure for all algorithms in this library. It provides a flexible, type-safe way to represent both directed and undirected graphs.

## Creating a Graph

```typescript
import { Graph } from "@graphty/algorithms";

// Directed graph (default)
const directed = new Graph();

// Undirected graph
const undirected = new Graph({ directed: false });

// With generic type for node IDs
const typed = new Graph<string>();
```

## Adding Nodes

```typescript
const graph = new Graph<string>();

// Add individual nodes
graph.addNode("a");
graph.addNode("b");

// Add node with data
graph.addNode("c", { label: "Node C", weight: 10 });

// Check if node exists
graph.hasNode("a"); // true
graph.hasNode("x"); // false
```

## Adding Edges

```typescript
// Add edge (auto-creates nodes if they don't exist)
graph.addEdge("a", "b");

// Add edge with weight
graph.addEdge("a", "c", { weight: 5 });

// Add edge with custom data
graph.addEdge("b", "c", {
  weight: 3,
  label: "connection",
});

// Check if edge exists
graph.hasEdge("a", "b"); // true
```

## Accessing Graph Data

### Nodes

```typescript
// Get all nodes
const nodes = graph.nodes(); // ["a", "b", "c"]

// Get node count
graph.nodeCount; // 3

// Get node data
graph.getNodeData("c"); // { label: "Node C", weight: 10 }
```

### Edges

```typescript
// Get all edges
const edges = graph.edges();
// [{ source: "a", target: "b" }, { source: "a", target: "c" }, ...]

// Get edge count
graph.edgeCount; // number

// Get edge data
graph.getEdgeData("a", "b"); // { weight: 5 }

// Get edge weight (convenience method)
graph.getWeight("a", "b"); // 5 (defaults to 1 if not set)
```

### Neighbors

```typescript
// Get successors (outgoing neighbors)
graph.successors("a"); // ["b", "c"]

// Get predecessors (incoming neighbors)
graph.predecessors("b"); // ["a"]

// Get all neighbors (for undirected or both directions)
graph.neighbors("a"); // ["b", "c"]
```

## Modifying the Graph

```typescript
// Remove an edge
graph.removeEdge("a", "b");

// Remove a node (also removes connected edges)
graph.removeNode("c");

// Clear all nodes and edges
graph.clear();
```

## Graph Properties

```typescript
// Check if directed
graph.isDirected; // true or false

// Get statistics
console.log(`Nodes: ${graph.nodeCount}`);
console.log(`Edges: ${graph.edgeCount}`);
console.log(`Density: ${graph.density}`);
```

## Iteration

```typescript
// Iterate over nodes
for (const node of graph.nodes()) {
  console.log(node);
}

// Iterate over edges
for (const { source, target, data } of graph.edges()) {
  console.log(`${source} -> ${target}`, data);
}

// Iterate over neighbors
for (const neighbor of graph.successors("a")) {
  console.log(`a -> ${neighbor}`);
}
```

## Type Safety

The Graph class is generic, allowing you to specify the type of node IDs:

```typescript
// String node IDs (common)
const stringGraph = new Graph<string>();
stringGraph.addNode("node1");

// Number node IDs
const numberGraph = new Graph<number>();
numberGraph.addNode(1);

// Custom object IDs (must be usable as Map keys)
interface CustomId {
  id: string;
  type: string;
}
const customGraph = new Graph<CustomId>();
```

## Next Steps

- [Traversal Algorithms](./traversal.md) - BFS, DFS, and more
- [Shortest Path](./shortest-path.md) - Dijkstra, Bellman-Ford
- [API Reference](/api/graph) - Complete Graph API
