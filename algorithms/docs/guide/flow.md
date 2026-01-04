# Flow Algorithms

Network flow algorithms compute the maximum flow through a network or find minimum cuts that partition the graph.

## Maximum Flow

Find the maximum flow from a source to a sink in a network with edge capacities.

```typescript
import { Graph, maxFlow } from "@graphty/algorithms";

const network = new Graph<string>();
// Add edges with capacities
network.addEdge("source", "a", { capacity: 10 });
network.addEdge("source", "b", { capacity: 5 });
network.addEdge("a", "c", { capacity: 9 });
network.addEdge("a", "b", { capacity: 4 });
network.addEdge("b", "c", { capacity: 8 });
network.addEdge("c", "sink", { capacity: 15 });
network.addEdge("b", "sink", { capacity: 10 });

const result = maxFlow(network, "source", "sink");

console.log(`Maximum flow: ${result.value}`);

// Flow on each edge
for (const [edge, flow] of result.flow) {
  console.log(`${edge.source} -> ${edge.target}: ${flow}`);
}
```

## Ford-Fulkerson Algorithm

The classic augmenting path algorithm for maximum flow.

```typescript
import { Graph, fordFulkerson } from "@graphty/algorithms";

const network = new Graph<string>();
// ... add edges with capacities

const result = fordFulkerson(network, "source", "sink");

console.log(`Max flow: ${result.maxFlow}`);
console.log(`Augmenting paths used: ${result.paths.length}`);
```

## Edmonds-Karp Algorithm

A BFS-based implementation of Ford-Fulkerson with better worst-case performance.

```typescript
import { Graph, edmondsKarp } from "@graphty/algorithms";

const network = new Graph<string>();
// ... add edges with capacities

const result = edmondsKarp(network, "source", "sink");

console.log(`Max flow: ${result.maxFlow}`);
```

## Minimum Cut

Find the minimum cut that separates source from sink.

```typescript
import { Graph, minCut } from "@graphty/algorithms";

const network = new Graph<string>();
// ... add edges with capacities

const result = minCut(network, "source", "sink");

console.log(`Min cut value: ${result.value}`);
console.log("Source side:", result.sourcePartition);
console.log("Sink side:", result.sinkPartition);
console.log("Cut edges:", result.cutEdges);
```

::: info Max-Flow Min-Cut Theorem
The maximum flow value equals the minimum cut capacity. This fundamental theorem connects the two problems.
:::

## Practical Examples

### Transportation Network

```typescript
import { Graph, maxFlow } from "@graphty/algorithms";

// Model road capacity between cities
const roads = new Graph<string>();
roads.addEdge("warehouse", "hub1", { capacity: 100 });
roads.addEdge("warehouse", "hub2", { capacity: 80 });
roads.addEdge("hub1", "store1", { capacity: 50 });
roads.addEdge("hub1", "store2", { capacity: 60 });
roads.addEdge("hub2", "store2", { capacity: 40 });
roads.addEdge("hub2", "store3", { capacity: 70 });

// Find max throughput to each store
const toStore1 = maxFlow(roads, "warehouse", "store1");
console.log(`Max delivery to store1: ${toStore1.value} units`);
```

### Network Reliability

```typescript
import { Graph, minCut } from "@graphty/algorithms";

// Computer network with link capacities
const network = new Graph<string>();
network.addEdge("server", "router1", { capacity: 1 });
network.addEdge("server", "router2", { capacity: 1 });
network.addEdge("router1", "client", { capacity: 1 });
network.addEdge("router2", "client", { capacity: 1 });

const cut = minCut(network, "server", "client");
console.log(`Min links to disconnect: ${cut.value}`);
console.log("Vulnerable links:", cut.cutEdges);
```

### Bipartite Matching via Max Flow

```typescript
import { Graph, maxFlow } from "@graphty/algorithms";

// Match workers to jobs
const matching = new Graph<string>();

// Source connects to all workers
matching.addEdge("source", "alice", { capacity: 1 });
matching.addEdge("source", "bob", { capacity: 1 });
matching.addEdge("source", "carol", { capacity: 1 });

// Workers connect to jobs they can do
matching.addEdge("alice", "job1", { capacity: 1 });
matching.addEdge("alice", "job2", { capacity: 1 });
matching.addEdge("bob", "job2", { capacity: 1 });
matching.addEdge("carol", "job3", { capacity: 1 });

// All jobs connect to sink
matching.addEdge("job1", "sink", { capacity: 1 });
matching.addEdge("job2", "sink", { capacity: 1 });
matching.addEdge("job3", "sink", { capacity: 1 });

const result = maxFlow(matching, "source", "sink");
console.log(`Maximum matching: ${result.value} assignments`);

// Extract matching from flow
for (const [edge, flow] of result.flow) {
  if (flow > 0 && !edge.source.startsWith("source") && !edge.target.startsWith("sink")) {
    console.log(`${edge.source} -> ${edge.target}`);
  }
}
```

## Algorithm Comparison

| Algorithm | Time Complexity | Notes |
|-----------|-----------------|-------|
| Ford-Fulkerson | O(E × max_flow) | Simple, may be slow |
| Edmonds-Karp | O(V × E²) | Polynomial, uses BFS |
| Dinic's | O(V² × E) | Better for unit capacity |
| Push-Relabel | O(V² × E) | Good in practice |

Where V = vertices, E = edges.
