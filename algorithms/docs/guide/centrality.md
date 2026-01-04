# Centrality Algorithms

Centrality measures identify the most important or influential nodes in a graph. Different measures capture different notions of "importance."

## Overview

| Measure | Captures | Best For |
|---------|----------|----------|
| Degree | Direct connections | Hub identification |
| Betweenness | Bridge position | Information flow |
| Closeness | Proximity to all | Efficient access |
| Eigenvector | Influential neighbors | Prestige/influence |
| PageRank | Link structure | Web/citation networks |
| HITS | Hub/Authority roles | Web graphs |

## Degree Centrality

The simplest measure: count of connections to a node.

```typescript
import { Graph, degreeCentrality } from "@graphty/algorithms";

const graph = new Graph<string>({ directed: false });
graph.addEdge("a", "b");
graph.addEdge("a", "c");
graph.addEdge("a", "d");
graph.addEdge("b", "c");

const centrality = degreeCentrality(graph);

// Returns normalized values (0-1)
console.log(centrality.get("a")); // 1.0 (highest - 3 connections)
console.log(centrality.get("b")); // 0.67
console.log(centrality.get("d")); // 0.33 (lowest - 1 connection)
```

### In/Out Degree (Directed Graphs)

```typescript
const directed = new Graph<string>();
directed.addEdge("a", "b");
directed.addEdge("a", "c");
directed.addEdge("b", "c");

// In-degree: incoming connections
const inDegree = inDegreeCentrality(directed);
console.log(inDegree.get("c")); // highest (receives from a and b)

// Out-degree: outgoing connections
const outDegree = outDegreeCentrality(directed);
console.log(outDegree.get("a")); // highest (connects to b and c)
```

## Betweenness Centrality

Measures how often a node lies on shortest paths between other nodes. High betweenness nodes are "bridges" that control information flow.

```typescript
import { Graph, betweennessCentrality } from "@graphty/algorithms";

const graph = new Graph<string>({ directed: false });
graph.addEdge("a", "b");
graph.addEdge("b", "c");
graph.addEdge("b", "d");
graph.addEdge("c", "e");
graph.addEdge("d", "e");

const centrality = betweennessCentrality(graph);

// Node "b" is on many shortest paths
console.log(centrality.get("b")); // High value - bridge node
console.log(centrality.get("a")); // Low value - peripheral node
```

### Options

```typescript
const centrality = betweennessCentrality(graph, {
  // Normalize values to 0-1 range
  normalized: true,

  // Include endpoints in path count
  endpoints: false,

  // Sample only k nodes for approximation (faster)
  k: 100,
});
```

## Closeness Centrality

Measures how close a node is to all other nodes. Nodes with high closeness can reach all others quickly.

```typescript
import { Graph, closenessCentrality } from "@graphty/algorithms";

const graph = new Graph<string>({ directed: false });
// Create a star topology
graph.addEdge("center", "a");
graph.addEdge("center", "b");
graph.addEdge("center", "c");
graph.addEdge("center", "d");

const centrality = closenessCentrality(graph);

// Center node can reach all others in 1 step
console.log(centrality.get("center")); // 1.0 (highest)
console.log(centrality.get("a"));      // Lower (must go through center)
```

## Eigenvector Centrality

A node is important if it's connected to other important nodes. This creates a recursive definition that captures influence.

```typescript
import { Graph, eigenvectorCentrality } from "@graphty/algorithms";

const graph = new Graph<string>({ directed: false });
graph.addEdge("a", "b");
graph.addEdge("a", "c");
graph.addEdge("b", "c");
graph.addEdge("b", "d");
graph.addEdge("c", "d");

const centrality = eigenvectorCentrality(graph);

// Nodes connected to well-connected nodes score higher
for (const [node, score] of centrality) {
  console.log(`${node}: ${score.toFixed(3)}`);
}
```

### Options

```typescript
const centrality = eigenvectorCentrality(graph, {
  // Maximum iterations
  maxIterations: 100,

  // Convergence tolerance
  tolerance: 1e-6,
});
```

## PageRank

Google's algorithm for ranking web pages. Similar to eigenvector centrality but handles directed graphs and dangling nodes.

```typescript
import { Graph, pageRank } from "@graphty/algorithms";

const web = new Graph<string>();
web.addEdge("page1", "page2");
web.addEdge("page1", "page3");
web.addEdge("page2", "page3");
web.addEdge("page3", "page1");

const ranks = pageRank(web);

// Pages linked by many/important pages rank higher
for (const [page, rank] of ranks) {
  console.log(`${page}: ${rank.toFixed(4)}`);
}
```

### Options

```typescript
const ranks = pageRank(web, {
  // Damping factor (probability of following links)
  damping: 0.85,

  // Maximum iterations
  maxIterations: 100,

  // Convergence tolerance
  tolerance: 1e-6,
});
```

## HITS (Hubs and Authorities)

Distinguishes between hubs (link to many authorities) and authorities (linked by many hubs).

```typescript
import { Graph, hits } from "@graphty/algorithms";

const web = new Graph<string>();
// Authorities: actual content pages
// Hubs: directory/index pages

web.addEdge("hub1", "auth1");
web.addEdge("hub1", "auth2");
web.addEdge("hub2", "auth1");
web.addEdge("hub2", "auth3");

const { hubs, authorities } = hits(web);

console.log("Hub scores:");
for (const [node, score] of hubs) {
  console.log(`  ${node}: ${score.toFixed(3)}`);
}

console.log("Authority scores:");
for (const [node, score] of authorities) {
  console.log(`  ${node}: ${score.toFixed(3)}`);
}
```

## Katz Centrality

Similar to eigenvector centrality but adds a base score for all nodes.

```typescript
import { Graph, katzCentrality } from "@graphty/algorithms";

const graph = new Graph<string>();
// ... add edges

const centrality = katzCentrality(graph, {
  alpha: 0.1,  // Attenuation factor
  beta: 1.0,   // Base score
});
```

## Practical Example: Social Network Analysis

```typescript
import { Graph, degreeCentrality, betweennessCentrality, pageRank } from "@graphty/algorithms";

const social = new Graph<string>({ directed: false });
social.addEdge("Alice", "Bob");
social.addEdge("Alice", "Carol");
social.addEdge("Bob", "Carol");
social.addEdge("Bob", "Dave");
social.addEdge("Carol", "Eve");
social.addEdge("Dave", "Eve");
social.addEdge("Eve", "Frank");

// Different perspectives on importance
const degree = degreeCentrality(social);
const betweenness = betweennessCentrality(social);
const pr = pageRank(social);

console.log("Node Analysis:");
for (const node of social.nodes()) {
  console.log(`${node}:`);
  console.log(`  Connections: ${degree.get(node)?.toFixed(2)}`);
  console.log(`  Bridge role: ${betweenness.get(node)?.toFixed(2)}`);
  console.log(`  Influence: ${pr.get(node)?.toFixed(2)}`);
}
```
