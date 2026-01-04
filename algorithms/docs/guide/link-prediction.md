# Link Prediction

Link prediction algorithms estimate the likelihood that two nodes will be connected in the future. These are useful for recommendation systems, knowledge graph completion, and social network analysis.

## Overview

Link prediction measures typically use the local neighborhood of two nodes to estimate connection probability.

| Method | Based On | Best For |
|--------|----------|----------|
| Common Neighbors | Shared connections | Social networks |
| Jaccard Coefficient | Relative overlap | Sparse networks |
| Adamic-Adar | Weighted shared connections | General use |
| Preferential Attachment | Degree product | Growing networks |
| Resource Allocation | Resource distribution | Dense networks |

## Common Neighbors

The simplest approach: count shared neighbors.

```typescript
import { Graph, commonNeighbors } from "@graphty/algorithms";

const graph = new Graph<string>({ directed: false });
graph.addEdge("alice", "bob");
graph.addEdge("alice", "carol");
graph.addEdge("bob", "carol");
graph.addEdge("bob", "dave");
graph.addEdge("carol", "dave");

// How many common friends do alice and dave share?
const cn = commonNeighbors(graph, "alice", "dave");
console.log(`Common neighbors: ${cn}`); // 2 (bob and carol)
```

### Batch Prediction

```typescript
import { Graph, predictLinks } from "@graphty/algorithms";

const graph = new Graph<string>({ directed: false });
// ... add edges

// Get top predictions for a specific node
const predictions = predictLinks(graph, "alice", {
  method: "common-neighbors",
  limit: 5,
});

for (const { node, score } of predictions) {
  console.log(`${node}: ${score} common neighbors`);
}
```

## Jaccard Coefficient

Normalizes common neighbors by total neighborhood size.

```typescript
import { Graph, jaccardCoefficient } from "@graphty/algorithms";

const graph = new Graph<string>({ directed: false });
// ... add edges

const score = jaccardCoefficient(graph, "alice", "dave");
// |neighbors(alice) ∩ neighbors(dave)| / |neighbors(alice) ∪ neighbors(dave)|
console.log(`Jaccard similarity: ${score.toFixed(3)}`);
```

## Adamic-Adar Index

Weighs common neighbors by their inverse log degree. Nodes with fewer connections contribute more to the score.

```typescript
import { Graph, adamicAdar } from "@graphty/algorithms";

const graph = new Graph<string>({ directed: false });
// ... add edges

const score = adamicAdar(graph, "alice", "dave");
// Sum of 1/log(degree) for each common neighbor
console.log(`Adamic-Adar score: ${score.toFixed(3)}`);
```

::: tip
Adamic-Adar often outperforms simpler methods because it down-weights common neighbors that are connected to everyone (high-degree hubs).
:::

## Preferential Attachment

Based on the observation that well-connected nodes tend to attract more connections.

```typescript
import { Graph, preferentialAttachment } from "@graphty/algorithms";

const graph = new Graph<string>({ directed: false });
// ... add edges

const score = preferentialAttachment(graph, "alice", "dave");
// degree(alice) × degree(dave)
console.log(`Preferential attachment: ${score}`);
```

## Resource Allocation Index

Similar to Adamic-Adar but uses 1/degree instead of 1/log(degree).

```typescript
import { Graph, resourceAllocation } from "@graphty/algorithms";

const graph = new Graph<string>({ directed: false });
// ... add edges

const score = resourceAllocation(graph, "alice", "dave");
// Sum of 1/degree for each common neighbor
console.log(`Resource allocation: ${score.toFixed(3)}`);
```

## All-Pairs Prediction

Predict links for all non-connected node pairs.

```typescript
import { Graph, allLinkPredictions } from "@graphty/algorithms";

const graph = new Graph<string>({ directed: false });
// ... add edges

const predictions = allLinkPredictions(graph, {
  method: "adamic-adar",
  limit: 100, // Top 100 predictions
  minScore: 0.1, // Minimum score threshold
});

for (const { source, target, score } of predictions) {
  console.log(`${source} - ${target}: ${score.toFixed(3)}`);
}
```

## Practical Example: Friend Recommendations

```typescript
import { Graph, predictLinks } from "@graphty/algorithms";

// Social network
const social = new Graph<string>({ directed: false });
social.addEdge("alice", "bob");
social.addEdge("alice", "carol");
social.addEdge("bob", "carol");
social.addEdge("bob", "dave");
social.addEdge("carol", "dave");
social.addEdge("carol", "eve");
social.addEdge("dave", "eve");
social.addEdge("dave", "frank");

// Get friend recommendations for alice
const recommendations = predictLinks(social, "alice", {
  method: "adamic-adar",
  limit: 3,
});

console.log("Friend recommendations for Alice:");
for (const { node, score } of recommendations) {
  console.log(`  ${node} (score: ${score.toFixed(2)})`);
}
// Likely: dave (connected through bob and carol)
```

## Knowledge Graph Completion

```typescript
import { Graph, predictLinks } from "@graphty/algorithms";

// Entity relationship graph
const kg = new Graph<string>({ directed: true });
kg.addEdge("Python", "uses", { target: "object-oriented" });
kg.addEdge("Java", "uses", { target: "object-oriented" });
kg.addEdge("Python", "used_for", { target: "data-science" });
kg.addEdge("R", "used_for", { target: "data-science" });
// ... more relationships

// What concepts might Python be related to?
const predictions = predictLinks(kg, "Python", {
  method: "common-neighbors",
  limit: 5,
});

console.log("Predicted relationships for Python:");
for (const { node, score } of predictions) {
  console.log(`  ${node}`);
}
```

## Method Comparison

```typescript
import {
  Graph,
  commonNeighbors,
  jaccardCoefficient,
  adamicAdar,
  preferentialAttachment
} from "@graphty/algorithms";

const graph = new Graph<string>({ directed: false });
// ... add edges

// Compare methods for a specific pair
const nodeA = "alice";
const nodeB = "frank";

console.log(`Link prediction scores for ${nodeA} - ${nodeB}:`);
console.log(`  Common Neighbors: ${commonNeighbors(graph, nodeA, nodeB)}`);
console.log(`  Jaccard: ${jaccardCoefficient(graph, nodeA, nodeB).toFixed(3)}`);
console.log(`  Adamic-Adar: ${adamicAdar(graph, nodeA, nodeB).toFixed(3)}`);
console.log(`  Preferential: ${preferentialAttachment(graph, nodeA, nodeB)}`);
```
