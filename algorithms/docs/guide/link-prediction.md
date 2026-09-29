# Link Prediction

Link prediction algorithms estimate the likelihood that two nodes will be connected in the future. They are useful for
recommendation systems, knowledge graph completion, and social network analysis.

Each function takes a graph snapshot (see [Graph Data Structure](./graph.md)) and node indices. A neighbour reached by
parallel edges counts once.

## Overview

| Method           | Based On                                 | Best For        |
| ---------------- | ---------------------------------------- | --------------- |
| Common Neighbors | Shared connections                       | Social networks |
| Adamic-Adar      | Shared connections, rare ones weigh more | General use     |

## Common Neighbors

The simplest approach: count shared neighbours.

<!-- doc-check -->

```typescript
import { GraphBuilder } from "@graphty/graph-format";
import { indexed } from "@graphty/algorithms";

const builder = new GraphBuilder({ directed: false });
builder.addEdge("alice", "bob");
builder.addEdge("alice", "carol");
builder.addEdge("bob", "carol");
builder.addEdge("bob", "dave");
builder.addEdge("carol", "dave");
const graph = builder.freeze();

// How many friends do alice and dave share?
const score = indexed.commonNeighborsScore(graph, graph.ids.requireIndex("alice"), graph.ids.requireIndex("dave"));
console.log(score); // 2
```

On a directed graph, pass `{ directed: true }` to count the nodes on a path u -> z -> v; without it the out-neighbours
of both nodes are compared.

## Adamic-Adar Index

Weighs each common neighbour by the inverse logarithm of its degree, so neighbours with fewer connections contribute
more to the score.

<!-- doc-check -->

```typescript
import { GraphBuilder } from "@graphty/graph-format";
import { indexed } from "@graphty/algorithms";

const builder = new GraphBuilder({ directed: false });
builder.addEdge("alice", "bob");
builder.addEdge("alice", "carol");
builder.addEdge("bob", "carol");
builder.addEdge("bob", "dave");
builder.addEdge("carol", "dave");
const graph = builder.freeze();

// The sum of 1 / log(degree) over the common neighbours
const score = indexed.adamicAdarScore(graph, graph.ids.requireIndex("alice"), graph.ids.requireIndex("dave"));
console.log(score.toFixed(3)); // 1.820
```

::: tip
Adamic-Adar often outperforms plain common neighbours because it down-weights neighbours that are connected to everyone
(high-degree hubs).
:::

## Scoring Many Pairs

`commonNeighborsForPairs` and `adamicAdarForPairs` score a list of pairs, given as two parallel index lists, and return
one score per pair:

<!-- doc-check -->

```typescript
import { GraphBuilder } from "@graphty/graph-format";
import { indexed } from "@graphty/algorithms";

const builder = new GraphBuilder({ directed: false });
builder.addEdge("a", "b");
builder.addEdge("b", "c");
builder.addEdge("c", "d");
builder.addEdge("a", "c");
const graph = builder.freeze();
const [a, b, c, d] = ["a", "b", "c", "d"].map((id) => graph.ids.requireIndex(id));

const scores = indexed.commonNeighborsForPairs(graph, { sources: [a, b], targets: [d, d] });
console.log(scores); // [1, 1]
```

## All-Pairs Prediction

Rank every pair of nodes not yet joined by an edge, highest score first:

<!-- doc-check -->

```typescript
import { GraphBuilder } from "@graphty/graph-format";
import { indexed } from "@graphty/algorithms";

const builder = new GraphBuilder({ directed: false });
builder.addEdge("alice", "bob");
builder.addEdge("alice", "carol");
builder.addEdge("bob", "dave");
builder.addEdge("carol", "dave");
builder.addEdge("dave", "eve");
const graph = builder.freeze();
const name = (i: number) => String(graph.ids.idOf(i));

const top = indexed.adamicAdarPrediction(graph, { topK: 3 });
for (let k = 0; k < top.scores.length; k++) {
    console.log(`${name(top.sources[k])} - ${name(top.targets[k])}: ${top.scores[k].toFixed(3)}`);
}
console.log(`${name(top.sources[0])} - ${name(top.targets[0])}`); // alice - dave
```

`indexed.commonNeighborsPrediction(graph, { topK })` ranks by common neighbours instead, and `includeExisting: true`
also scores pairs that are already joined.

## Practical Example: Friend Recommendations

<!-- doc-check -->

```typescript
import { GraphBuilder } from "@graphty/graph-format";
import { indexed } from "@graphty/algorithms";

const builder = new GraphBuilder({ directed: false });
builder.addEdge("alice", "bob");
builder.addEdge("alice", "carol");
builder.addEdge("bob", "carol");
builder.addEdge("bob", "dave");
builder.addEdge("carol", "dave");
builder.addEdge("carol", "eve");
builder.addEdge("dave", "eve");
builder.addEdge("dave", "frank");
const social = builder.freeze();

// The best candidates for alice, among the people she does not know yet
const recommendations = indexed.getTopAdamicAdarCandidatesForNode(social, social.ids.requireIndex("alice"), {
    topK: 3,
});
console.log(Array.from(recommendations.targets, (i) => social.ids.idOf(i))); // ["dave", "eve"]
```

`indexed.getTopCandidatesForNode` does the same by common neighbours.

## Evaluating a Predictor

Hold some edges out of the graph, then ask how well each method ranks them above pairs that are not edges:

<!-- doc-check -->

```typescript
import { GraphBuilder } from "@graphty/graph-format";
import { indexed } from "@graphty/algorithms";

// The training graph, without the held-out edge a-d
const builder = new GraphBuilder({ directed: false });
builder.addEdge("a", "b");
builder.addEdge("a", "c");
builder.addEdge("b", "d");
builder.addEdge("c", "d");
builder.addEdge("d", "e");
const graph = builder.freeze();
const [a, b, c, d, e] = ["a", "b", "c", "d", "e"].map((id) => graph.ids.requireIndex(id));

const heldOut = { sources: [a], targets: [d] };
const nonEdges = { sources: [a, b], targets: [e, c] };
const { adamicAdar, commonNeighbors } = indexed.compareAdamicAdarWithCommonNeighbors(graph, heldOut, nonEdges);
console.log(adamicAdar.auc, commonNeighbors.auc); // 1 1
```

Each result carries the `precision`, `recall` and `f1Score` of the best threshold and the ranking `auc`.
