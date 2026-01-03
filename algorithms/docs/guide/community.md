# Community Detection

Community detection algorithms identify groups of densely connected nodes within a graph. These communities often represent meaningful structures like social groups, topic clusters, or functional modules.

## Louvain Algorithm

The Louvain algorithm is a fast, greedy method that optimizes modularity. It's widely used for large networks.

```typescript
import { Graph, louvain } from "@graphty/algorithms";

const graph = new Graph<string>({ directed: false });
// Social network with two friend groups
graph.addEdge("alice", "bob");
graph.addEdge("alice", "carol");
graph.addEdge("bob", "carol");
graph.addEdge("dave", "eve");
graph.addEdge("dave", "frank");
graph.addEdge("eve", "frank");
graph.addEdge("carol", "dave"); // Bridge between groups

const result = louvain(graph);

console.log("Communities:", result.communities);
// Map { "alice" => 0, "bob" => 0, "carol" => 0, "dave" => 1, ... }

console.log("Modularity:", result.modularity);
// Higher is better (0-1 range typically)
```

### Options

```typescript
const result = louvain(graph, {
  // Resolution parameter (higher = smaller communities)
  resolution: 1.0,

  // Random seed for reproducibility
  seed: 42,

  // Maximum iterations per level
  maxIterations: 100,
});
```

## Girvan-Newman Algorithm

Detects communities by progressively removing edges with high betweenness centrality.

```typescript
import { Graph, girvanNewman } from "@graphty/algorithms";

const graph = new Graph<string>({ directed: false });
// ... add edges

const result = girvanNewman(graph);

// Returns a dendrogram (hierarchy of communities)
console.log("Number of communities:", result.numCommunities);
console.log("Community assignments:", result.communities);
```

### Specifying Number of Communities

```typescript
const result = girvanNewman(graph, {
  // Stop when reaching k communities
  k: 3,
});
```

::: tip
Girvan-Newman is slower than Louvain but can be more accurate for small networks. Use Louvain for large graphs.
:::

## Label Propagation

A fast, near-linear time algorithm where nodes adopt the most common label among their neighbors.

```typescript
import { Graph, labelPropagation } from "@graphty/algorithms";

const graph = new Graph<string>({ directed: false });
// ... add edges

const communities = labelPropagation(graph);

// Returns community labels for each node
for (const [node, community] of communities) {
  console.log(`${node} belongs to community ${community}`);
}
```

### Options

```typescript
const communities = labelPropagation(graph, {
  // Maximum iterations
  maxIterations: 100,

  // Random seed
  seed: 42,
});
```

## K-Clique Communities

Finds overlapping communities based on clique percolation.

```typescript
import { Graph, kCliqueCommunities } from "@graphty/algorithms";

const graph = new Graph<string>({ directed: false });
// ... add edges

const communities = kCliqueCommunities(graph, 3); // k=3 (triangles)

// Returns list of communities (nodes can belong to multiple)
for (let i = 0; i < communities.length; i++) {
  console.log(`Community ${i}: ${[...communities[i]].join(", ")}`);
}
```

## Modularity

Modularity measures the quality of a community partition. Higher values indicate better community structure.

```typescript
import { Graph, modularity } from "@graphty/algorithms";

const graph = new Graph<string>({ directed: false });
// ... add edges

// Your community assignments
const communities = new Map([
  ["a", 0],
  ["b", 0],
  ["c", 1],
  ["d", 1],
]);

const q = modularity(graph, communities);
console.log(`Modularity: ${q.toFixed(4)}`);
// Typically: Q < 0.3 = weak, 0.3-0.7 = moderate, > 0.7 = strong structure
```

## Practical Example: Document Clustering

```typescript
import { Graph, louvain } from "@graphty/algorithms";

// Build similarity graph from documents
const docGraph = new Graph<string>({ directed: false });

// Add edges between similar documents (weight = similarity)
docGraph.addEdge("doc1", "doc2", { weight: 0.8 });
docGraph.addEdge("doc1", "doc3", { weight: 0.6 });
docGraph.addEdge("doc2", "doc3", { weight: 0.9 });
docGraph.addEdge("doc4", "doc5", { weight: 0.7 });
docGraph.addEdge("doc5", "doc6", { weight: 0.85 });
// ... more similarities

// Detect topic clusters
const result = louvain(docGraph);

// Group documents by topic
const topics = new Map<number, string[]>();
for (const [doc, topic] of result.communities) {
  if (!topics.has(topic)) topics.set(topic, []);
  topics.get(topic)!.push(doc);
}

console.log("Document clusters:");
for (const [topic, docs] of topics) {
  console.log(`Topic ${topic}: ${docs.join(", ")}`);
}
```

## Algorithm Comparison

| Algorithm | Time Complexity | Overlapping | Deterministic |
|-----------|-----------------|-------------|---------------|
| Louvain | O(n log n) | No | No |
| Girvan-Newman | O(m² n) | No | Yes |
| Label Propagation | O(m) | No | No |
| K-Clique | O(n² k) | Yes | Yes |

Where n = nodes, m = edges, k = clique size.
