# CLAUDE.md

This file provides guidance to Claude Code when working with the @graphty/algorithms package.

## Project Overview

@graphty/algorithms is a comprehensive TypeScript graph algorithms library optimized for browser environments. It provides 98+ algorithms covering traversal, pathfinding, centrality, clustering, community detection, flow, and link prediction.

## Package Structure

```
algorithms/
├── src/
│   ├── core/              # Graph data structure
│   ├── algorithms/        # Main algorithm implementations
│   │   ├── centrality/    # PageRank, betweenness, closeness, degree, eigenvector, HITS
│   │   ├── community/     # Louvain, Girvan-Newman, label propagation
│   │   ├── components/    # Connected components, strongly connected
│   │   ├── matching/      # Maximum matching algorithms
│   │   ├── mst/           # Kruskal, Prim minimum spanning tree
│   │   ├── shortest-path/ # Dijkstra, Bellman-Ford, Floyd-Warshall, A*
│   │   └── traversal/     # BFS, DFS with variants
│   ├── clustering/        # K-core, MCL, spectral, hierarchical
│   ├── data-structures/   # Priority queue, union-find
│   ├── optimized/         # CSR graph, bit-packed, direction-optimized BFS
│   ├── research/          # Experimental: GRSBM, SynC, TeraHAC
│   ├── flow/              # Max flow algorithms
│   ├── link-prediction/   # Link prediction algorithms
│   ├── pathfinding/       # A*, path utilities
│   ├── types/             # TypeScript interfaces
│   └── utils/             # Math utilities, normalization
├── test/
│   ├── unit/              # Unit tests (happy-dom environment)
│   ├── browser/           # Browser tests (Playwright)
│   └── helpers/           # Test utilities, performance regression
├── examples/              # Usage examples
└── docs/                  # VitePress documentation
```

`src/indexed/` holds index-based ports over `@graphty/graph-format` snapshots, exported as the
`indexed` namespace. Ported so far: BFS, direction-optimized BFS, DFS, cycle detection, topological
sort, bipartite check, strongly connected components, condensation, Dijkstra, Bellman-Ford,
bidirectional Dijkstra, A*, connected components, Kruskal MST, Prim MST, PageRank, personalized
PageRank, the delta PageRank engines (`deltaPageRank`, `DeltaPageRank`, `PriorityDeltaPageRank`),
HITS, Katz, eigenvector centrality, degree centrality, closeness centrality, betweenness centrality,
edge betweenness centrality, common neighbours, k-core, Louvain, label propagation, all-pairs
shortest paths, maximum flow, minimum s-t cut, Stoer-Wagner and Karger minimum cuts, the bipartite
flow network, Adamic-Adar link prediction, hierarchical, Markov and spectral clustering, modularity,
and the research clusterings teraHAC, SynC and GRSBM. Each lands beside its legacy function; tests
live in `test/unit/indexed/`. `benchmarks/port-bench.ts` times some of them (k-core, Katz, HITS,
Louvain, label propagation) against their legacy functions. Some legacy functions now delegate to
their port and keep only their signature and result shape: `floydWarshall`, `floydWarshallPath`,
`transitiveClosure`, `labelPropagation`, the BFS functions, `depthFirstSearch`, `hasCycleDFS`,
`topologicalSort`, the connected, weakly and strongly connected component functions (and
`condensationGraph` through them), `singleSourceShortestPath` (and `allPairsShortestPath` through it),
`hasNegativeCycle`, `kruskalMST`, the five common-neighbour link prediction functions,
`hierarchicalClustering`, `markovClustering`, `syncClustering`, `grsbm`, `kCoreDecomposition` (and
`getKCore` through it) and `girvanNewman`. Traversal facades pass
`legacyArcOrder` so neighbours are tried in the graph's insertion order. A graph with a NaN weight has
no weighted snapshot: `toTopologySnapshot` freezes it without weights for the ports that read none,
and the weighted facades keep their legacy code for it (and `singleSourceShortestPath` for negative
weights). Functions whose port breaks ties differently (`dijkstra`, `dijkstraPath`, `bellmanFord`,
`bellmanFordPath`, `astar`, `astarWithDetails`, `primMST`), returns less order (`bipartitePartition`,
`findStronglyConnectedComponents`, `connectedComponentsDFS`) or gives different answers (the
Adamic-Adar functions, `calculateMCLModularity`, `spectralClustering`, `teraHAC`) stay on legacy
code. So do the randomised or differently ruled community functions -- `louvain` and `leiden` (the
ports visit nodes in another seeded order, so they stop at other partitions), `labelPropagationAsync`
(the synchronous port adds a swap guard the old loop lacks) and `labelPropagationSemiSupervised`
(another random stream, and the port renumbers the seed labels) -- `maximumBipartiteMatching` and
`greedyBipartiteMatching` (a matching read off `indexed.bipartiteFlowNetwork` and `indexed.maxFlow`
can pair other nodes than the old augmenting-path loop, which follows the order `bipartitePartition`
lists each side in, and the greedy matching is by design not a maximum one) -- and `isGraphIsomorphic`
and `findAllIsomorphisms`, which have no port. The conversions the facades use live in `src/indexed/facade.ts`; each has a facade test in
`test/unit/indexed/*-facade*.test.ts`. Where a delegating function's old code is still needed for
inputs the port refuses, it sits beside it in a`*-legacy.ts`file, unchanged, until
the removal release deletes it. A`\*-legacy.ts`file can also be the only implementation of
published functions that do not delegate:`hierarchical-legacy.ts`holds`cutDendrogram`,
`cutDendrogramKClusters`and`modularityHierarchicalClustering`(and the`hierarchicalClustering`facade calls`cutDendrogram`), and `mcl-legacy.ts`holds`calculateMCLModularity`. Those functions
are re-exported from the public file and are not dead code; the removal release must move them, not
delete them.

No test runs a legacy function as an oracle any more. What each legacy call returned in the
differential and facade suites of `test/unit/indexed/` is recorded in `test/golden/` (one gzipped
JSON file per suite, one record per line, `zcat` to read), and `legacyResult()` in
`test/helpers/golden.ts` hands it back in its original shape: Map and Set order, number or string
keys, `-0`, `NaN` and the infinities, and exact f64 values. A recorded throw is thrown again with its
message; it is an instance of its class for `ConvergenceError`, `PathWalkError`, `RangeError` and
`TypeError`, and a plain `Error` carrying the recorded name otherwise.

The records are frozen: nothing re-records them. Each is keyed by the test's full name and the
call's position within that test, and `expectFacadeMatchesLegacy` makes one call per fixture, so
renaming a test, reordering its `legacyResult()` calls, or adding, removing or reordering a fixture
in `port-fixtures.ts` or another shared fixture list breaks the lookup. Two tests of one file with
the same name, and a record that a full passing run of its file never reads, fail that file. A
comment beside a `legacyResult()` call says which legacy call and inputs a record came from when the
test itself no longer shows them.

## Essential Commands

```bash
# Development
npm run dev              # Watch mode for TypeScript compilation
npm run build            # Build TypeScript to dist/
npm run build:bundle     # Create bundled distribution

# Testing
npm test                 # Run tests in watch mode
npm run test:run         # Run default tests once
npm run test:browser     # Run browser tests (Playwright)
npm run test:all         # Run all test projects

# Coverage
npm run coverage         # Full coverage with shards
npm run coverage:fast    # Quick coverage (default project only)
npm run coverage:preview # Serve coverage report (start it through servherd with PORT={{port}})

# Performance
npm run benchmark        # Run full benchmarks
npm run benchmark:quick  # Quick benchmark run
npm run test:performance # Run performance regression tests

# Linting
npm run lint             # ESLint + TypeScript check
npm run lint:fix         # Auto-fix lint issues
npm run lint:pkg         # Check for unused deps (knip)

# Documentation
npm run docs:dev         # Start docs dev server
npm run docs:build       # Build documentation
```

## Algorithm Implementation Pattern

Algorithms take a frozen `@graphty/graph-format` snapshot first and an options object last, and return typed arrays
plus scalars:

```typescript
export function algorithmName(snapshot: GraphSnapshot, options?: AlgorithmOptions): AlgorithmResult {
    // Implementation over node indices 0..nodeCount-1 and the snapshot's CSR arrays
}
```

Key principles:

- Concrete `NodeId` (`string | number`) and node indices, not a generic id type: ids appear only at the boundary
  (`snapshot.ids.requireIndex(id)` in, `snapshot.ids.idOf(i)` or `snapshot.ids.toMap(vector)` out)
- A required per-call input, such as a source node index, sits between the snapshot and the options
  (`dijkstra(snapshot, source, options?)`)
- Traversals and paths accept any `AdjacencyView` (a snapshot, or a view such as `snapshot.reverse()`)
- Optional configuration with sensible defaults
- Results are typed arrays indexed by node (or edge) index, never id-keyed maps

## Testing Guidelines

- **Test projects**: `default` (happy-dom) and `browser` (Playwright)
- Performance regression tests track algorithm speed over time
- Use `npm run test:performance:update` to update baselines after intentional changes

## Optimized Implementations

The `src/optimized/` directory contains high-performance implementations:

- **CSRGraph**: Compressed Sparse Row format for memory efficiency
- **Bit-packed structures**: TypedFastBitSet for large graphs
- **Direction-optimized BFS**: switches between top-down and bottom-up steps

No legacy function switches to these by graph size: the BFS family runs the indexed BFS on every
graph, and `indexed.directionOptimizedBfs` is the direction-optimised search, called explicitly.

## Design Philosophy

- **Zero configuration**: every function takes a snapshot and needs no other setup
- **Browser-first**: All implementations work in browser environments
- **Type safety**: Full TypeScript with strict mode
- **Performance**: Optimized for graphs up to millions of nodes

## Common Tasks

### Adding a New Algorithm

1. Create the implementation in `src/indexed/`, following the pattern above
2. Export it from `src/indexed/index.ts`
3. Write tests in `test/unit/indexed/`
4. Add examples in `examples/`
5. Update documentation; code samples in `docs/guide/getting-started.md` and the README's marked blocks are
   type-checked and run by `test/unit/docs/guide-samples.test.ts` (see below)

### Documentation Samples

`test/unit/docs/guide-samples.test.ts` type-checks and runs every ```typescript block of
`docs/guide/getting-started.md`, which must all be marked `<!-- doc-check -->`just before them, and every
block of`README.md` so marked. Keep each marked block self-contained, with its own imports.

### Running Examples

```bash
npm run examples         # Run all Node.js examples
npm run examples:html    # Start Vite server for HTML examples
```
