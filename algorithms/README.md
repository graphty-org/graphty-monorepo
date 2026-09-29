# @graphty/algorithms

[![CI](https://github.com/graphty-org/graphty-monorepo/actions/workflows/ci.yml/badge.svg)](https://github.com/graphty-org/graphty-monorepo/actions/workflows/ci.yml)
[![Coverage Status](https://coveralls.io/repos/github/graphty-org/graphty-monorepo/badge.svg?branch=master)](https://coveralls.io/github/graphty-org/graphty-monorepo?branch=master)
[![npm version](https://img.shields.io/npm/v/@graphty/algorithms.svg)](https://www.npmjs.com/package/@graphty/algorithms)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Documentation](https://img.shields.io/badge/docs-vitepress-blue)](https://graphty.app/docs/algorithms/)
[![Storybook](https://img.shields.io/badge/storybook-interactive%20demos-ff4785)](https://graphty.app/storybook/algorithms/)

Graph algorithms for the browser and Node, in TypeScript: traversal, shortest paths, centrality, community detection,
clustering, flow, matching and link prediction. Every algorithm runs over a frozen graph snapshot from
[`@graphty/graph-format`](https://www.npmjs.com/package/@graphty/graph-format) -- compact typed arrays in compressed
sparse row form -- and returns typed arrays indexed by node, so it runs on graphs of millions of edges without an
object per node.

## Installation

```bash
npm install @graphty/algorithms @graphty/graph-format
```

## Quick Start

Build a snapshot with `GraphBuilder`, run an algorithm on it, and read the result by node index. `graph.ids` maps
between your node ids and the indices.

<!-- doc-check -->

```typescript
import { GraphBuilder } from "@graphty/graph-format";
import { betweennessCentrality, dijkstra, louvain } from "@graphty/algorithms";

const builder = new GraphBuilder({ directed: false });
builder.addEdge("alice", "bob", 1);
builder.addEdge("bob", "carol", 2);
builder.addEdge("alice", "carol", 4);
builder.addEdge("carol", "dave", 1);
const graph = builder.freeze();

const alice = graph.ids.requireIndex("alice");
const dave = graph.ids.requireIndex("dave");

// Shortest paths from one node: distances and the path to any other
const paths = dijkstra(graph, alice);
console.log(paths.dist[dave]); // 4
console.log(Array.from(paths.pathTo(dave), (i) => graph.ids.idOf(i))); // ["alice", "bob", "carol", "dave"]

// A score per node, keyed by id again with toMap
const betweenness = graph.ids.toMap(betweennessCentrality(graph).scores);
console.log(betweenness.get("carol")); // 2

// A community label per node
const communities = louvain(graph);
console.log(communities.count > 0); // true
```

Every function takes the snapshot first and an options object last; a required input such as a source node index sits
between them (`dijkstra(graph, source, options?)`). The [guide](https://graphty.app/docs/algorithms/guide/getting-started)
covers each family with runnable examples.

## Algorithms

| Family                   | Functions                                                                                                                                                                                                                                                                                                |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Traversal                | `breadthFirstSearch`, `directionOptimizedBfs`, `depthFirstSearch`, `topologicalSort`, `hasCycle`, `isBipartite`                                                                                                                                                                                          |
| Components               | `connectedComponents`, `weaklyConnectedComponents`, `stronglyConnectedComponents`, `condensation`                                                                                                                                                                                                        |
| Shortest paths           | `dijkstra`, `bellmanFord`, `bidirectionalDijkstra`, `astar`, `allPairsShortestPath`                                                                                                                                                                                                                      |
| Spanning trees           | `kruskalMST`, `primMST`                                                                                                                                                                                                                                                                                  |
| Centrality               | `degreeCentrality`, `betweennessCentrality`, `edgeBetweennessCentrality`, `closenessCentrality`, `nodeClosenessCentrality`, `eigenvectorCentrality`, `katzCentrality`, `hits`, `pageRank`, `personalizedPageRank`, `DeltaPageRank`, `PriorityDeltaPageRank`                                              |
| Community detection      | `louvain`, `leiden`, `girvanNewman`, `labelPropagation`, `labelPropagationSynchronous`, `labelPropagationSemiSupervised`, `modularity`                                                                                                                                                                   |
| Clustering               | `kCoreDecomposition`, `hierarchicalClustering`, `markovClustering`, `spectralClustering`, `teraHAC`, `syncClustering`, `grsbm`                                                                                                                                                                           |
| Flow and cuts            | `maxFlow`, `minSTCut`, `stoerWagner`, `kargerMinCut`, `bipartiteFlowNetwork`                                                                                                                                                                                                                             |
| Matching and isomorphism | `maximumBipartiteMatching`, `greedyBipartiteMatching`, `isGraphIsomorphic`, `findAllIsomorphisms`                                                                                                                                                                                                        |
| Link prediction          | `commonNeighborsScore`, `commonNeighborsPrediction`, `commonNeighborsForPairs`, `getTopCandidatesForNode`, `evaluateCommonNeighbors`, `adamicAdarScore`, `adamicAdarPrediction`, `adamicAdarForPairs`, `getTopAdamicAdarCandidatesForNode`, `evaluateAdamicAdar`, `compareAdamicAdarWithCommonNeighbors` |

## GPU Acceleration

`accelerated(accelerator)` runs the same algorithms through an accelerator such as
[`@graphty/webgpu-graph-algorithms`](https://www.npmjs.com/package/@graphty/webgpu-graph-algorithms) where it
implements them, and on the CPU otherwise: `await accelerated(gpu).pageRank(graph)`. Without an accelerator
(`accelerated(null)`) every call runs on the CPU. An accelerator's failure is thrown, never quietly retried on the CPU.

## Upgrading From 2.x

algorithms 3.0.0 removed the id-keyed API of 2.x: the `Graph` class, the functions that took it and returned Maps keyed
by node id, and the `CSRGraph` helpers. The snapshot functions that 2.x offered as `indexed.<name>` are the top-level
exports now, and `indexed` stays as a deprecated alias until 4.0. The
[migration guide](https://graphty.app/docs/algorithms/guide/migrating-to-3) gives the replacement for every 2.x function
and lists the results that changed.

## Documentation

- [Guide](https://graphty.app/docs/algorithms/guide/getting-started) -- every algorithm family, with runnable examples
- [API reference](https://graphty.app/docs/algorithms/api/)
- [Storybook](https://graphty.app/storybook/algorithms/) -- an interactive demo of each algorithm

## Development

The package lives in [graphty-monorepo](https://github.com/graphty-org/graphty-monorepo) under `algorithms/`.

```bash
pnpm install              # from the monorepo root
cd algorithms
npm run build             # compile to dist/
npm run test:run          # the default test project
npm run test:browser      # the browser test project (Playwright)
npm run lint              # ESLint and the type checks, the compile-only export tests included
npm run benchmark:quick   # time every algorithm over generated graphs
```

Contributions are welcome as issues or pull requests on GitHub. Commits follow
[Conventional Commits](https://www.conventionalcommits.org/).

## License

MIT (c) Adam Powers

## Related Projects

- [@graphty/graph-format](https://github.com/graphty-org/graphty-monorepo/tree/master/graph-format) - The graph snapshot every algorithm takes
- [@graphty/layout](https://github.com/graphty-org/graphty-monorepo/tree/master/layout) - Graph layout algorithms
- [@graphty/graphty-element](https://github.com/graphty-org/graphty-monorepo/tree/master/graphty-element) - 3D graph visualization web component
