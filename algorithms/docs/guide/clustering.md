# Clustering Algorithms

Clustering algorithms group nodes based on graph structure and connectivity patterns. These algorithms are useful for identifying related items, partitioning networks, and discovering hierarchical structures.

## Clustering Coefficient

Measures how well nodes tend to cluster together. High clustering means a node's neighbors are also neighbors of each other.

```typescript
import { Graph, clusteringCoefficient, averageClusteringCoefficient } from "@graphty/algorithms";

const graph = new Graph<string>({ directed: false });
graph.addEdge("a", "b");
graph.addEdge("a", "c");
graph.addEdge("b", "c"); // Triangle: a-b-c
graph.addEdge("a", "d");

// Local clustering coefficient for each node
const local = clusteringCoefficient(graph);
console.log(local.get("a")); // 0.33 (1 of 3 possible triangles)
console.log(local.get("b")); // 1.0 (all neighbors connected)

// Average clustering for the whole graph
const avg = averageClusteringCoefficient(graph);
console.log(`Average clustering: ${avg.toFixed(2)}`);
```

## K-Core Decomposition

Finds the k-core of a graph: the maximal subgraph where every node has at least k neighbors.

```typescript
import { Graph, kCore, coreNumber } from "@graphty/algorithms";

const graph = new Graph<string>({ directed: false });
// ... add edges

// Get the 3-core (nodes with at least 3 connections to other core nodes)
const core = kCore(graph, 3);
console.log("3-core nodes:", [...core.nodes()]);

// Get core number for each node
const cores = coreNumber(graph);
for (const [node, k] of cores) {
  console.log(`${node}: ${k}-core`);
}
```

### Use Cases

- Finding dense subgraphs
- Identifying influential users in social networks
- Graph visualization (layering by core number)

## Triangle Counting

Count triangles in the graph. Triangles indicate tight clustering.

```typescript
import { Graph, triangles, triangleCount } from "@graphty/algorithms";

const graph = new Graph<string>({ directed: false });
graph.addEdge("a", "b");
graph.addEdge("b", "c");
graph.addEdge("c", "a"); // Triangle 1
graph.addEdge("b", "d");
graph.addEdge("c", "d"); // Triangle 2
graph.addEdge("d", "a"); // Triangle 3

// Count triangles per node
const nodeTriangles = triangles(graph);
console.log(nodeTriangles.get("a")); // Number of triangles containing "a"

// Total triangle count
const total = triangleCount(graph);
console.log(`Total triangles: ${total}`);
```

## Hierarchical Clustering

Build a hierarchy of clusters using agglomerative clustering.

```typescript
import { Graph, hierarchicalClustering } from "@graphty/algorithms";

const graph = new Graph<string>({ directed: false });
// ... add edges with weights (similarity)

const dendrogram = hierarchicalClustering(graph, {
  linkage: "average", // "single", "complete", or "average"
});

// Cut the dendrogram to get k clusters
const clusters = dendrogram.cut(3);
console.log("Clusters:", clusters);
```

## Spectral Clustering

Uses eigenvalues of the graph Laplacian for clustering.

```typescript
import { Graph, spectralClustering } from "@graphty/algorithms";

const graph = new Graph<string>({ directed: false });
// ... add edges

const clusters = spectralClustering(graph, {
  k: 3, // Number of clusters
});

for (const [node, cluster] of clusters) {
  console.log(`${node} -> cluster ${cluster}`);
}
```

## Transitivity

Global measure of clustering in the graph.

```typescript
import { Graph, transitivity } from "@graphty/algorithms";

const graph = new Graph<string>({ directed: false });
// ... add edges

const t = transitivity(graph);
// Ratio of triangles to connected triples
console.log(`Transitivity: ${t.toFixed(3)}`);
```

## Practical Example: Finding Cohesive Groups

```typescript
import { Graph, kCore, clusteringCoefficient, triangles } from "@graphty/algorithms";

// Collaboration network
const colab = new Graph<string>({ directed: false });
colab.addEdge("alice", "bob");
colab.addEdge("alice", "carol");
colab.addEdge("bob", "carol");
colab.addEdge("bob", "dave");
colab.addEdge("carol", "dave");
colab.addEdge("dave", "eve");
colab.addEdge("eve", "frank");

// Find tightly-knit research groups
const cores = kCore(colab, 2);
console.log("Close collaborators:", [...cores.nodes()]);

// Analyze collaboration patterns
const clustering = clusteringCoefficient(colab);
const triCounts = triangles(colab);

for (const node of colab.nodes()) {
  console.log(`${node}:`);
  console.log(`  Clustering: ${clustering.get(node)?.toFixed(2)}`);
  console.log(`  Triangles: ${triCounts.get(node)}`);
}
```
