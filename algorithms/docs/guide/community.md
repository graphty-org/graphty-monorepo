# Community Detection

Community detection algorithms identify groups of densely connected nodes within a graph. These communities often
represent meaningful structures like social groups, topic clusters, or functional modules.

Each algorithm takes a graph snapshot (see [Graph Data Structure](./graph.md)) and returns a partition: `labels`, a
`Uint32Array` holding each node's community, `count`, the number of communities, and `groups()`, the node indices of
each community. Community numbers are dense, `0` to `count - 1`.

## Louvain Algorithm

The Louvain algorithm is a fast, greedy method that optimizes modularity. It is widely used for large networks.

<!-- doc-check -->

```typescript
import { GraphBuilder } from "@graphty/graph-format";
import { indexed } from "@graphty/algorithms";

// A social network with two friend groups
const builder = new GraphBuilder({ directed: false });
builder.addEdge("alice", "bob");
builder.addEdge("alice", "carol");
builder.addEdge("bob", "carol");
builder.addEdge("dave", "eve");
builder.addEdge("dave", "frank");
builder.addEdge("eve", "frank");
builder.addEdge("carol", "dave"); // the bridge between the groups
const graph = builder.freeze();

const result = indexed.louvain(graph, {
    resolution: 1.0, // higher gives smaller communities
    maxIterations: 100,
});

console.log(result.count); // 2
console.log(result.groups().map((g) => Array.from(g, (i) => graph.ids.idOf(i)))); // [["alice", "bob", "carol"], ["dave", "eve", "frank"]]
console.log(result.modularity.toFixed(3)); // 0.357
```

`indexed.leiden(graph, { resolution, randomSeed })` is a refinement of Louvain that guarantees every community is
connected.

## Girvan-Newman Algorithm

Detects communities by repeatedly removing the edges with the highest betweenness. It returns every level of the
resulting hierarchy, the uncut graph first, with each level's modularity. It needs an undirected graph.

<!-- doc-check -->

```typescript
import { GraphBuilder } from "@graphty/graph-format";
import { indexed } from "@graphty/algorithms";

const builder = new GraphBuilder({ directed: false });
builder.addEdge("a", "b");
builder.addEdge("a", "c");
builder.addEdge("b", "c");
builder.addEdge("d", "e");
builder.addEdge("d", "f");
builder.addEdge("e", "f");
builder.addEdge("c", "d");
const graph = builder.freeze();

// Stop once a level has 2 communities
const result = indexed.girvanNewman(graph, { maxCommunities: 2 });
console.log(result.levels.length); // 2
console.log(Array.from(result.levels[1])); // [0, 0, 0, 1, 1, 1]
console.log(result.modularity[1].toFixed(3)); // 0.357
```

::: tip
Girvan-Newman is much slower than Louvain. Use it on small networks, where the whole hierarchy is useful.
:::

## Label Propagation

A fast, near-linear time algorithm where nodes adopt the most common label among their neighbours. It is fast label
propagation (FLPA, Traag and Subelj 2023): nodes wait in a queue and only nodes whose neighbourhood changed are
revisited, so it stops once every node's label is the most common among its neighbours, even on paths and trees.

<!-- doc-check -->

```typescript
import { GraphBuilder } from "@graphty/graph-format";
import { indexed } from "@graphty/algorithms";

const builder = new GraphBuilder({ directed: false });
builder.addEdge("a", "b");
builder.addEdge("a", "c");
builder.addEdge("b", "c");
builder.addEdge("d", "e");
builder.addEdge("d", "f");
builder.addEdge("e", "f");
const graph = builder.freeze();

const result = indexed.labelPropagation(graph, {
    maxIterations: 100, // work cap, in full-sweep equivalents
    randomSeed: 42, // visit order and tie draws; one seed gives one result
    weighted: true, // false: each distinct neighbour votes once
});

console.log(result.count); // 2
console.log(result.converged); // true
```

Self-loops are ignored and parallel edges are summed. On a directed snapshot a node's neighbours are its out- and
in-neighbours. A negative, NaN or infinite weight throws a `RangeError`.

To hold some nodes at a known community, pass one seed per node to `indexed.labelPropagationSemiSupervised`: a label for
a fixed node, `INVALID_INDEX` for a free one. Seeded nodes never move, seeds with the same label share a community, and
seeds with different labels never do. The result is renumbered like every partition here, so read a seed's community
through `labels[seedNode]`.

<!-- doc-check -->

```typescript
import { GraphBuilder, INVALID_INDEX } from "@graphty/graph-format";
import { indexed } from "@graphty/algorithms";

const builder = new GraphBuilder({ directed: false });
builder.addEdge("alice", "carol");
builder.addEdge("carol", "bob");
const graph = builder.freeze();
const alice = graph.ids.requireIndex("alice");
const bob = graph.ids.requireIndex("bob");

const seeds = new Uint32Array(graph.nodeCount).fill(INVALID_INDEX);
seeds[alice] = 0;
seeds[bob] = 1;
const held = indexed.labelPropagationSemiSupervised(graph, seeds, { randomSeed: 42 });
console.log(held.labels[alice] === held.labels[bob]); // false
```

`indexed.labelPropagationSynchronous(graph, { maxIterations, weighted })` updates every node at once from the previous
pass and uses no random numbers, so it gives one answer per graph. Passes alternate between allowing only moves to a
higher label and only to a lower one, which stops two neighbours trading labels for ever; it ends after one quiet pass
of each kind. Some weighted graphs still cycle, and then it stops with `converged: false`.

## Modularity

Modularity measures the quality of a community partition. Higher values indicate better community structure.

<!-- doc-check -->

```typescript
import { GraphBuilder } from "@graphty/graph-format";
import { indexed } from "@graphty/algorithms";

const builder = new GraphBuilder({ directed: false });
builder.addEdge("a", "b");
builder.addEdge("c", "d");
builder.addEdge("b", "c");
const graph = builder.freeze();

// Your community assignments, one per node index: a and b in 0, c and d in 1
const labels = Uint32Array.of(0, 0, 1, 1);
console.log(indexed.modularity(graph, labels).toFixed(4)); // 0.1667
```

Typically Q below 0.3 is weak structure, 0.3 to 0.7 moderate, and above 0.7 strong.

## Practical Example: Document Clustering

<!-- doc-check -->

```typescript
import { GraphBuilder } from "@graphty/graph-format";
import { indexed } from "@graphty/algorithms";

// A similarity graph: edge weight = similarity between two documents
const builder = new GraphBuilder({ directed: false });
builder.addEdge("doc1", "doc2", 0.8);
builder.addEdge("doc1", "doc3", 0.6);
builder.addEdge("doc2", "doc3", 0.9);
builder.addEdge("doc4", "doc5", 0.7);
builder.addEdge("doc5", "doc6", 0.85);
builder.addEdge("doc4", "doc6", 0.75);
const docs = builder.freeze();

// Detect topic clusters and list each one's documents
const topics = indexed.louvain(docs).groups();
for (const [topic, members] of topics.entries()) {
    console.log(`Topic ${String(topic)}: ${Array.from(members, (i) => String(docs.ids.idOf(i))).join(", ")}`);
}
console.log(topics.length); // 2
```

## Algorithm Comparison

| Algorithm         | Time Complexity | Deterministic     |
| ----------------- | --------------- | ----------------- |
| Louvain           | O(n log n)      | Yes               |
| Leiden            | O(n log n)      | Yes, for one seed |
| Girvan-Newman     | O(m^2 n)        | Yes               |
| Label Propagation | O(m)            | Yes, for one seed |

Where n = nodes and m = edges.
