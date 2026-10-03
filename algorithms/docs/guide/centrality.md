# Centrality Algorithms

Centrality measures identify the most important or influential nodes in a graph. Different measures capture different
notions of "importance". Each takes a graph snapshot (see [Graph Data Structure](./graph.md)) and returns one score per
node index, usually as a `Float64Array`.

## Overview

| Measure     | Captures              | Best For              |
| ----------- | --------------------- | --------------------- |
| Degree      | Direct connections    | Hub identification    |
| Betweenness | Bridge position       | Information flow      |
| Closeness   | Proximity to all      | Efficient access      |
| Eigenvector | Influential neighbors | Prestige/influence    |
| PageRank    | Link structure        | Web/citation networks |
| HITS        | Hub/Authority roles   | Web graphs            |
| Katz        | All walks, attenuated | Directed influence    |

## Degree Centrality

The simplest measure: the number of distinct neighbours of a node.

<!-- doc-check -->

```typescript
import { GraphBuilder } from "@graphty/graph-format";
import { degreeCentrality } from "@graphty/algorithms";

const builder = new GraphBuilder({ directed: false });
builder.addEdge("a", "b");
builder.addEdge("a", "c");
builder.addEdge("a", "d");
builder.addEdge("b", "c");
const graph = builder.freeze();

console.log(degreeCentrality(graph)); // [3, 2, 2, 1]

// Divided by n - 1, the most neighbours a node can have
const normalized = degreeCentrality(graph, { normalized: true });
console.log(Array.from(normalized, (x) => x.toFixed(2))); // ["1.00", "0.67", "0.67", "0.33"]
```

### In/Out Degree (Directed Graphs)

<!-- doc-check -->

```typescript
import { GraphBuilder } from "@graphty/graph-format";
import { degreeCentrality } from "@graphty/algorithms";

const builder = new GraphBuilder({ directed: true });
builder.addEdge("a", "b");
builder.addEdge("a", "c");
builder.addEdge("b", "c");
const graph = builder.freeze();

console.log(degreeCentrality(graph, { mode: "in" })); // [0, 1, 2]
console.log(degreeCentrality(graph, { mode: "out" })); // [2, 1, 0]
```

## Betweenness Centrality

Measures how often a node lies on shortest paths between other nodes. High betweenness nodes are "bridges" that control
information flow.

<!-- doc-check -->

```typescript
import { GraphBuilder } from "@graphty/graph-format";
import { betweennessCentrality } from "@graphty/algorithms";

const builder = new GraphBuilder({ directed: false });
builder.addEdge("a", "b");
builder.addEdge("b", "c");
builder.addEdge("b", "d");
builder.addEdge("c", "e");
builder.addEdge("d", "e");
const graph = builder.freeze();

const { scores } = betweennessCentrality(graph);
console.log(scores[graph.ids.requireIndex("b")]); // 3.5: a bridge node
console.log(scores[graph.ids.requireIndex("a")]); // 0: a peripheral node
```

### Options

<!-- doc-check -->

```typescript
import { GraphBuilder } from "@graphty/graph-format";
import { betweennessCentrality } from "@graphty/algorithms";

const builder = new GraphBuilder({ directed: false });
builder.addEdge("a", "b");
builder.addEdge("b", "c");
const graph = builder.freeze();

const result = betweennessCentrality(graph, {
    normalized: true, // divide by the number of pairs
    endpoints: false, // do not count a path's own ends
    k: 2, // sample only 2 source nodes, an approximation that is faster on big graphs
});
console.log(result.scores.length); // 3
```

`edgeBetweennessCentrality(graph)` gives the same measure per edge.

## Closeness Centrality

Measures how close a node is to all other nodes. Nodes with high closeness can reach all others quickly.

<!-- doc-check -->

```typescript
import { GraphBuilder } from "@graphty/graph-format";
import { closenessCentrality } from "@graphty/algorithms";

// A star
const builder = new GraphBuilder({ directed: false });
builder.addEdge("center", "a");
builder.addEdge("center", "b");
builder.addEdge("center", "c");
builder.addEdge("center", "d");
const graph = builder.freeze();

const { scores } = closenessCentrality(graph);
console.log(scores[graph.ids.requireIndex("center")]); // 0.25: 1 / (1 + 1 + 1 + 1)
console.log(scores[graph.ids.requireIndex("a")].toFixed(3)); // 0.143: 1 / (1 + 2 + 2 + 2)
```

Closeness is 1 over the sum of the distances to the other nodes, with edge weights read as distances when the graph
has them (`weighted: false` counts hops). Pass `normalized: true` to scale it by the fraction of other nodes reached,
and `harmonic: true` for harmonic closeness, which handles disconnected graphs. `nodeClosenessCentrality(graph, node)` scores one node.

On a big graph, sample: `k` draws that many sources (the same ones every time) and `sources` names them. Each node is
then scored from its distances to those sources alone, unscaled, and `sourcesUsed` says how many ran. To estimate the exact
score, multiply a plain sampled score by `k / n`, a `harmonic` one (normalized or not) by `n / k`, and leave a
`normalized` one as it is (it already divides by the sources reached); a sample of every node gives the exact score.

<!-- doc-check -->

```typescript
import { GraphBuilder } from "@graphty/graph-format";
import { closenessCentrality } from "@graphty/algorithms";

const builder = new GraphBuilder({ directed: false });
builder.addEdge("a", "b");
builder.addEdge("b", "c");
builder.addEdge("c", "d");
const graph = builder.freeze();

const sampled = closenessCentrality(graph, { sources: [graph.ids.requireIndex("a")] });
console.log(sampled.sourcesUsed); // 1
console.log(sampled.scores[graph.ids.requireIndex("d")].toFixed(3)); // 0.333: d is 3 from a
```

## Eigenvector Centrality

A node is important if it is connected to other important nodes.

<!-- doc-check -->

```typescript
import { GraphBuilder } from "@graphty/graph-format";
import { eigenvectorCentrality } from "@graphty/algorithms";

const builder = new GraphBuilder({ directed: false });
builder.addEdge("a", "b");
builder.addEdge("a", "c");
builder.addEdge("b", "c");
builder.addEdge("b", "d");
builder.addEdge("c", "d");
const graph = builder.freeze();

const result = eigenvectorCentrality(graph, { maxIterations: 100, tolerance: 1e-6 });
// By default the scores are rescaled so the lowest is 0 and the highest 1; `normalized: false` keeps the unit vector
console.log(Array.from(result.scores, (x) => x.toFixed(3))); // ["0.000", "1.000", "1.000", "0.000"]
```

If the power iteration has not met the tolerance after `maxIterations` passes, `eigenvectorCentrality` throws a
`ConvergenceError` rather than returning unconverged scores, as networkx raises `PowerIterationFailedConvergence`. The
error carries `algorithm`, `iterations` and `tolerance`. Long paths and large grids converge slowly; raise
`maxIterations` (or `tolerance`) and call again:

<!-- doc-check -->

```typescript
import { GraphBuilder } from "@graphty/graph-format";
import { ConvergenceError, eigenvectorCentrality } from "@graphty/algorithms";

const builder = new GraphBuilder({ directed: false });
for (let i = 0; i < 50; i++) {
    builder.addEdge(i, i + 1); // a long path
}
const graph = builder.freeze();

let result;
try {
    result = eigenvectorCentrality(graph, { maxIterations: 20 });
} catch (error) {
    if (!(error instanceof ConvergenceError)) {
        throw error;
    }
    console.log(error.algorithm); // eigenvectorCentrality
    result = eigenvectorCentrality(graph, { maxIterations: 10000 });
}
console.log(result.converged); // true
```

A graph with no cycle (no edges, or a directed acyclic graph) is not an error: every score is exactly 0.

## PageRank

Google's algorithm for ranking web pages. Similar to eigenvector centrality, but it handles directed graphs and
dangling nodes.

<!-- doc-check -->

```typescript
import { GraphBuilder } from "@graphty/graph-format";
import { pageRank } from "@graphty/algorithms";

const builder = new GraphBuilder({ directed: true });
builder.addEdge("page1", "page2");
builder.addEdge("page1", "page3");
builder.addEdge("page2", "page3");
builder.addEdge("page3", "page1");
const web = builder.freeze();

const ranks = pageRank(web, {
    dampingFactor: 0.85, // probability of following a link
    maxIterations: 100,
    tolerance: 1e-6,
});
console.log(Array.from(ranks.scores, (x) => x.toFixed(4))); // ["0.3878", "0.2148", "0.3974"]
console.log(ranks.converged); // true
```

Unlike eigenvector centrality, PageRank does not throw when it runs out of iterations: it returns the scores it has with
`converged: false`. `personalizedPageRank(web, personalization)` restarts at the nodes a per-node weight vector
favours.

## HITS (Hubs and Authorities)

Distinguishes hubs (pages that link to many authorities) from authorities (pages linked by many hubs).

<!-- doc-check -->

```typescript
import { GraphBuilder } from "@graphty/graph-format";
import { hits } from "@graphty/algorithms";

const builder = new GraphBuilder({ directed: true });
builder.addEdge("hub1", "auth1");
builder.addEdge("hub1", "auth2");
builder.addEdge("hub2", "auth1");
builder.addEdge("hub2", "auth3");
const web = builder.freeze();

const { hubs, authorities } = hits(web);
const top = (scores: Float64Array) => web.ids.idOf(scores.indexOf(Math.max(...scores)));
console.log(top(hubs), top(authorities)); // hub1 auth1
```

## Katz Centrality

Similar to eigenvector centrality, but every node also gets a base score.

<!-- doc-check -->

```typescript
import { GraphBuilder } from "@graphty/graph-format";
import { katzCentrality } from "@graphty/algorithms";

const builder = new GraphBuilder({ directed: true });
builder.addEdge("a", "b");
builder.addEdge("b", "c");
builder.addEdge("a", "c");
const graph = builder.freeze();

const result = katzCentrality(graph, {
    alpha: 0.1, // attenuation factor
    beta: 1.0, // base score
});
// Rescaled to [0, 1] by default, like eigenvector centrality
console.log(Array.from(result.scores, (x) => x.toFixed(3))); // ["0.000", "0.476", "1.000"]
```

## Practical Example: Social Network Analysis

<!-- doc-check -->

```typescript
import { GraphBuilder } from "@graphty/graph-format";
import { betweennessCentrality, degreeCentrality, pageRank } from "@graphty/algorithms";

const builder = new GraphBuilder({ directed: false });
builder.addEdge("Alice", "Bob");
builder.addEdge("Alice", "Carol");
builder.addEdge("Bob", "Carol");
builder.addEdge("Bob", "Dave");
builder.addEdge("Carol", "Eve");
builder.addEdge("Dave", "Eve");
builder.addEdge("Eve", "Frank");
const social = builder.freeze();

// Different perspectives on importance
const degree = degreeCentrality(social, { normalized: true });
const betweenness = betweennessCentrality(social, { normalized: true }).scores;
const pr = pageRank(social).scores;

for (let i = 0; i < social.nodeCount; i++) {
    console.log(
        `${String(social.ids.idOf(i))}: connections ${degree[i].toFixed(2)}, bridge role ${betweenness[i].toFixed(2)}, influence ${pr[i].toFixed(2)}`,
    );
}

const eve = social.ids.requireIndex("Eve");
console.log(betweenness[eve].toFixed(2)); // 0.45: Eve is the only way to Frank
```
