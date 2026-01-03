# Performance

`@graphty/algorithms` is optimized for browser environments while maintaining excellent performance. This guide covers performance characteristics and optimization tips.

## Automatic Optimization

The library automatically selects optimal algorithm implementations based on graph size:

```typescript
import { Graph, dijkstra } from "@graphty/algorithms";

// Small graph: uses simple implementation
const small = new Graph<number>();
for (let i = 0; i < 100; i++) {
  small.addNode(i);
}
// ... Automatically uses appropriate data structures

// Large graph: uses optimized implementation with better data structures
const large = new Graph<number>();
for (let i = 0; i < 100000; i++) {
  large.addNode(i);
}
// ... Automatically uses specialized priority queue, etc.
```

## Time Complexity Reference

### Traversal
| Algorithm | Time | Space |
|-----------|------|-------|
| BFS | O(V + E) | O(V) |
| DFS | O(V + E) | O(V) |
| Topological Sort | O(V + E) | O(V) |

### Shortest Path
| Algorithm | Time | Space |
|-----------|------|-------|
| Dijkstra | O((V + E) log V) | O(V) |
| Bellman-Ford | O(V × E) | O(V) |
| Floyd-Warshall | O(V³) | O(V²) |
| A* | O(E) to O(E log V) | O(V) |

### Centrality
| Algorithm | Time | Space |
|-----------|------|-------|
| Degree | O(V) | O(V) |
| Betweenness | O(V × E) | O(V + E) |
| Closeness | O(V × E) | O(V) |
| PageRank | O(k × E) | O(V) |

### Community Detection
| Algorithm | Time | Space |
|-----------|------|-------|
| Louvain | O(V log V) | O(V + E) |
| Label Propagation | O(E) | O(V) |
| Girvan-Newman | O(V × E²) | O(V + E) |

## Memory Optimization

### Use Numeric Node IDs

```typescript
// Less efficient: string IDs
const stringGraph = new Graph<string>();
stringGraph.addNode("node_12345");

// More efficient: numeric IDs
const numGraph = new Graph<number>();
numGraph.addNode(12345);
```

### Streaming for Large Graphs

```typescript
import { Graph } from "@graphty/algorithms";

// Process graph in chunks
async function* loadEdges() {
  // Load edges in batches from file/API
  for await (const batch of fetchEdgeBatches()) {
    yield* batch;
  }
}

const graph = new Graph<number>();
for await (const { source, target, weight } of loadEdges()) {
  graph.addEdge(source, target, { weight });
}
```

## Benchmarks

Performance on common graph sizes (Intel i7, Chrome 120):

### Dijkstra's Shortest Path

| Nodes | Edges | Time |
|-------|-------|------|
| 1,000 | 5,000 | 2ms |
| 10,000 | 50,000 | 25ms |
| 100,000 | 500,000 | 350ms |

### PageRank (100 iterations)

| Nodes | Edges | Time |
|-------|-------|------|
| 1,000 | 5,000 | 5ms |
| 10,000 | 50,000 | 45ms |
| 100,000 | 500,000 | 450ms |

### Louvain Community Detection

| Nodes | Edges | Time |
|-------|-------|------|
| 1,000 | 5,000 | 10ms |
| 10,000 | 50,000 | 80ms |
| 100,000 | 500,000 | 800ms |

## Best Practices

### 1. Choose the Right Algorithm

```typescript
// For single source-target: use A* with good heuristic
const path = aStar(graph, source, target, heuristic);

// For single source to all: use Dijkstra
const allPaths = dijkstra(graph, source);

// For all pairs: use Floyd-Warshall (precomputes all)
const allPairs = floydWarshall(graph);
```

### 2. Early Termination

```typescript
// Stop when target is found
const result = dijkstra(graph, "source", { target: "destination" });

// Limit depth
const bfsResult = bfs(graph, "start", { maxDepth: 5 });
```

### 3. Approximate for Large Graphs

```typescript
// Sample for betweenness centrality
const betweenness = betweennessCentrality(graph, {
  k: 100, // Sample 100 nodes
});

// Limit iterations for PageRank
const pagerank = pageRank(graph, {
  maxIterations: 50,
  tolerance: 1e-4, // Stop early if converged
});
```

### 4. Avoid Recomputation

```typescript
// Bad: recomputes for each query
for (const node of nodes) {
  const paths = dijkstra(graph, "source");
  console.log(paths.get(node));
}

// Good: compute once, query many
const paths = dijkstra(graph, "source");
for (const node of nodes) {
  console.log(paths.get(node));
}
```

### 5. Use Web Workers for Heavy Computation

```typescript
// worker.js
import { Graph, louvain } from "@graphty/algorithms";

self.onmessage = (event) => {
  const { nodes, edges } = event.data;

  const graph = new Graph();
  edges.forEach(({ source, target }) => graph.addEdge(source, target));

  const result = louvain(graph);
  self.postMessage({ communities: [...result.communities] });
};

// main.js
const worker = new Worker("worker.js", { type: "module" });
worker.postMessage({ nodes, edges });
worker.onmessage = (event) => {
  console.log("Communities:", event.data.communities);
};
```

## Profiling

```typescript
import { Graph, dijkstra } from "@graphty/algorithms";

const graph = new Graph<number>();
// ... populate graph

// Measure execution time
console.time("dijkstra");
const result = dijkstra(graph, 0);
console.timeEnd("dijkstra");

// Memory usage (if available)
if (performance.memory) {
  console.log(`Heap used: ${performance.memory.usedJSHeapSize / 1024 / 1024} MB`);
}
```
