# Flow Algorithms

Network flow algorithms compute the maximum flow through a network or find minimum cuts that partition the graph.

They take a graph snapshot (see [Graph Data Structure](./graph.md)) and node indices. Edge weights are the capacities,
and an unweighted snapshot gives every edge capacity 1. Capacities of zero or less carry no flow. Results are typed
arrays indexed by node or by edge.

## Maximum Flow

Find the maximum flow from a source to a sink in a network with edge capacities.

<!-- doc-check -->

```typescript
import { GraphBuilder } from "@graphty/graph-format";
import { indexed } from "@graphty/algorithms";

const builder = new GraphBuilder({ directed: true });
builder.addEdge("source", "a", 10); // the weight is the capacity
builder.addEdge("source", "b", 5);
builder.addEdge("a", "c", 9);
builder.addEdge("a", "b", 4);
builder.addEdge("b", "c", 8);
builder.addEdge("c", "sink", 15);
builder.addEdge("b", "sink", 10);
const network = builder.freeze();
const source = network.ids.requireIndex("source");
const sink = network.ids.requireIndex("sink");

const result = indexed.maxFlow(network, source, sink);
console.log(result.maxFlow); // 15

// Flow on each edge, by edge index; negative means against the edge's direction
for (let e = 0; e < network.edgeCount; e++) {
    const from = String(network.ids.idOf(network.edgeSource(e)));
    const to = String(network.ids.idOf(network.edgeTarget(e)));
    console.log(`${from} -> ${to}: ${String(result.flow[e])}`);
}
```

## Ford-Fulkerson and Edmonds-Karp

`maxFlow` finds augmenting paths with a breadth-first search (Edmonds-Karp) by default. Pass `algorithm` to choose:

<!-- doc-check -->

```typescript
import { GraphBuilder } from "@graphty/graph-format";
import { indexed } from "@graphty/algorithms";

const builder = new GraphBuilder({ directed: true });
builder.addEdge("s", "a", 3);
builder.addEdge("s", "b", 2);
builder.addEdge("a", "t", 2);
builder.addEdge("b", "t", 3);
const network = builder.freeze();
const s = network.ids.requireIndex("s");
const t = network.ids.requireIndex("t");

console.log(indexed.maxFlow(network, s, t, { algorithm: "edmonds-karp" }).maxFlow); // 4
console.log(indexed.maxFlow(network, s, t, { algorithm: "ford-fulkerson" }).maxFlow); // 4
```

## Minimum Cut

Find the cheapest set of edges whose removal separates the source from the sink.

<!-- doc-check -->

```typescript
import { GraphBuilder } from "@graphty/graph-format";
import { indexed } from "@graphty/algorithms";

const builder = new GraphBuilder({ directed: true });
builder.addEdge("server", "router1", 1);
builder.addEdge("server", "router2", 1);
builder.addEdge("router1", "client", 1);
builder.addEdge("router2", "client", 1);
const network = builder.freeze();

const cut = indexed.minSTCut(network, network.ids.requireIndex("server"), network.ids.requireIndex("client"));
console.log(cut.cutValue); // 2
const edgeName = (e: number) =>
    `${String(network.ids.idOf(network.edgeSource(e)))}-${String(network.ids.idOf(network.edgeTarget(e)))}`;
console.log(Array.from(cut.cutEdges, edgeName)); // ["server-router1", "server-router2"]
```

`cut.side` is a node mask of the source side. Without a source and a sink, `indexed.stoerWagner(graph)` finds the global
minimum cut deterministically, and `indexed.kargerMinCut(graph, { iterations, randomSeed })` finds it by random
contraction.

::: info Max-Flow Min-Cut Theorem
The maximum flow value equals the minimum cut capacity. This fundamental theorem connects the two problems.
:::

## Practical Example: Transportation Network

<!-- doc-check -->

```typescript
import { GraphBuilder } from "@graphty/graph-format";
import { indexed } from "@graphty/algorithms";

// Road capacity between depots
const builder = new GraphBuilder({ directed: true });
builder.addEdge("warehouse", "hub1", 100);
builder.addEdge("warehouse", "hub2", 80);
builder.addEdge("hub1", "store1", 50);
builder.addEdge("hub1", "store2", 60);
builder.addEdge("hub2", "store2", 40);
builder.addEdge("hub2", "store3", 70);
const roads = builder.freeze();

const toStore2 = indexed.maxFlow(roads, roads.ids.requireIndex("warehouse"), roads.ids.requireIndex("store2"));
console.log(`Max delivery to store2: ${String(toStore2.maxFlow)} units`); // Max delivery to store2: 100 units
```

## Practical Example: Bipartite Matching

`bipartiteFlowNetwork` builds the flow network of a matching problem: a source joined to every left node, a sink joined
to every right node, and capacity 1 everywhere.

<!-- doc-check -->

```typescript
import { indexed } from "@graphty/algorithms";

// Match workers to jobs they can do
const net = indexed.bipartiteFlowNetwork(
    ["alice", "bob", "carol"],
    ["job1", "job2", "job3"],
    [
        ["alice", "job1"],
        ["alice", "job2"],
        ["bob", "job2"],
        ["carol", "job3"],
    ],
);
const result = indexed.maxFlow(net.snapshot, net.source, net.sink);
console.log(result.maxFlow); // 3
```

## Algorithm Comparison

| Algorithm      | Time Complexity      | Notes                              |
| -------------- | -------------------- | ---------------------------------- |
| Ford-Fulkerson | O(E x max_flow)      | Simple, may be slow                |
| Edmonds-Karp   | O(V x E^2)           | Polynomial, uses BFS; the default  |
| Stoer-Wagner   | O(V x E + V^2 log V) | Global minimum cut                 |
| Karger         | Randomized           | Global minimum cut, by contraction |

Where V = vertices and E = edges.
