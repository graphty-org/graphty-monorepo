# Clustering Algorithms

Clustering algorithms group nodes based on graph structure and connectivity patterns. They are useful for identifying
related items, partitioning networks, and discovering hierarchical structures. Each takes a graph snapshot (see
[Graph Data Structure](./graph.md)) and returns typed arrays indexed by node.

## K-Core Decomposition

The k-core of a graph is the largest subgraph in which every node has at least k neighbours. A node's core number is
the largest k whose k-core contains it.

<!-- doc-check -->

```typescript
import { GraphBuilder } from "@graphty/graph-format";
import { kCoreDecomposition } from "@graphty/algorithms";

const builder = new GraphBuilder({ directed: false });
// A 4-clique with a tail
builder.addEdge("a", "b");
builder.addEdge("a", "c");
builder.addEdge("a", "d");
builder.addEdge("b", "c");
builder.addEdge("b", "d");
builder.addEdge("c", "d");
builder.addEdge("d", "e");
builder.addEdge("e", "f");
const graph = builder.freeze();

const result = kCoreDecomposition(graph);
console.log(result.coreness); // [3, 3, 3, 3, 1, 1]
console.log(result.maxCore); // 3

// The nodes whose core number is exactly 3
console.log(Array.from(result.cores()[3], (i) => graph.ids.idOf(i))); // ["a", "b", "c", "d"]
```

### Use Cases

- Finding dense subgraphs
- Identifying influential users in social networks
- Graph visualization (layering by core number)

## Hierarchical Clustering

Builds a hierarchy of clusters by repeatedly merging the two closest ones, measuring distance in hops. Clusters
`0` to `nodeCount - 1` are the nodes themselves; merge `k` creates cluster `nodeCount + k`.

<!-- doc-check -->

```typescript
import { GraphBuilder } from "@graphty/graph-format";
import { hierarchicalClustering } from "@graphty/algorithms";

const builder = new GraphBuilder({ directed: false });
builder.addEdge("a", "b");
builder.addEdge("b", "c");
builder.addEdge("c", "d");
const graph = builder.freeze();

const dendrogram = hierarchicalClustering(graph, {
    linkage: "average", // "single", "complete", "average" or "ward"
});
console.log(dendrogram.left.length); // 3

// Cut at height 1: every cluster taller than one merge is split into its children
const clusters = dendrogram.cut(1);
console.log(clusters.map((c) => Array.from(c, (i) => graph.ids.idOf(i)))); // [["a", "b"], ["c", "d"]]
```

## Spectral Clustering

Uses the eigenvectors of the graph Laplacian to split the graph into `k` clusters.

<!-- doc-check -->

```typescript
import { GraphBuilder } from "@graphty/graph-format";
import { spectralClustering } from "@graphty/algorithms";

const builder = new GraphBuilder({ directed: false });
builder.addEdge("a", "b");
builder.addEdge("a", "c");
builder.addEdge("b", "c");
builder.addEdge("d", "e");
builder.addEdge("d", "f");
builder.addEdge("e", "f");
builder.addEdge("c", "d");
const graph = builder.freeze();

const result = spectralClustering(graph, { k: 2, seed: 42 });
console.log(result.count); // 2
console.log(result.labels[0] === result.labels[1], result.labels[0] === result.labels[5]); // true false
```

## Markov Clustering

Simulates random walks: flow is expanded along the edges and then sharpened, until it settles into clusters.

<!-- doc-check -->

```typescript
import { GraphBuilder } from "@graphty/graph-format";
import { markovClustering } from "@graphty/algorithms";

const builder = new GraphBuilder({ directed: false });
builder.addEdge("a", "b");
builder.addEdge("a", "c");
builder.addEdge("b", "c");
builder.addEdge("d", "e");
builder.addEdge("d", "f");
builder.addEdge("e", "f");
builder.addEdge("c", "d");
const graph = builder.freeze();

const result = markovClustering(graph, { expansion: 2, inflation: 2 });
console.log(result.count); // 2
console.log(result.converged); // true
```

`teraHAC`, `grsbm` and `syncClustering` offer further clustering methods with the same partition
result.

## Practical Example: Finding Cohesive Groups

<!-- doc-check -->

```typescript
import { GraphBuilder } from "@graphty/graph-format";
import { kCoreDecomposition } from "@graphty/algorithms";

// A collaboration network
const builder = new GraphBuilder({ directed: false });
builder.addEdge("alice", "bob");
builder.addEdge("alice", "carol");
builder.addEdge("bob", "carol");
builder.addEdge("bob", "dave");
builder.addEdge("carol", "dave");
builder.addEdge("dave", "eve");
builder.addEdge("eve", "frank");
const colab = builder.freeze();

// Tightly-knit research groups: everyone with a core number of at least 2
const { coreness } = kCoreDecomposition(colab);
const close = colab.ids.toArray().filter((_, i) => coreness[i] >= 2);
console.log(close); // ["alice", "bob", "carol", "dave"]
```
