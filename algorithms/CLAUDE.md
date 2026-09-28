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
`hierarchicalClustering`, `markovClustering`, `syncClustering` and `grsbm`. Traversal facades pass
`legacyArcOrder` so neighbours are tried in the graph's insertion order. A graph with a NaN weight has
no weighted snapshot: `toTopologySnapshot` freezes it without weights for the ports that read none,
and the weighted facades keep their legacy code for it (and `singleSourceShortestPath` for negative
weights). Functions whose port breaks ties differently (`dijkstra`, `dijkstraPath`, `bellmanFord`,
`bellmanFordPath`, `astar`, `astarWithDetails`, `primMST`), returns less order (`bipartitePartition`,
`findStronglyConnectedComponents`, `connectedComponentsDFS`) or gives different answers (the
Adamic-Adar functions, `calculateMCLModularity`, `spectralClustering`, `teraHAC`) stay on legacy
code. The conversions the facades use live in `src/indexed/facade.ts`; each has a facade test in
`test/unit/indexed/*-facade*.test.ts`. The code the traversal, path, component and tree facades
replaced is kept verbatim in `test/helpers/legacy-traversal-paths-trees.ts` as their test oracle.
Elsewhere, where a delegating function's old code is still needed -- as the oracle of its facade
test, or for inputs the port refuses -- it sits beside it in a `*-legacy.ts` file, unchanged, until
the removal release deletes it. A `*-legacy.ts` file can also be the only implementation of
published functions that do not delegate: `hierarchical-legacy.ts` holds `cutDendrogram`,
`cutDendrogramKClusters` and `modularityHierarchicalClustering` (and the `hierarchicalClustering`
facade calls `cutDendrogram`), and `mcl-legacy.ts` holds `calculateMCLModularity`. Those functions
are re-exported from the public file and are not dead code; the removal release must move them, not
delete them.

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

All algorithms follow a consistent interface:

```typescript
export function algorithmName<TNodeId = unknown>(
    graph: ReadonlyGraph<TNodeId>,
    options?: AlgorithmOptions,
): AlgorithmResult<TNodeId> {
    // Implementation
}
```

Key principles:

- Generic `TNodeId` type for flexible node identification
- Read-only graph interface for safety
- Optional configuration with sensible defaults
- Automatic optimization based on graph size

## Testing Guidelines

- **Test projects**: `default` (happy-dom) and `browser` (Playwright)
- The Map-based Floyd-Warshall sweep that used to live in
  `src/algorithms/shortest-path/floyd-warshall.ts` hung vitest when its coverage was raised. It is
  gone: that file now delegates to `indexed.allPairsShortestPath` (`src/indexed/all-pairs.ts`), and
  both are tested normally
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

- **Zero configuration**: every function takes a Graph and needs no setup
- **Browser-first**: All implementations work in browser environments
- **Type safety**: Full TypeScript with strict mode
- **Performance**: Optimized for graphs up to millions of nodes

## Common Tasks

### Adding a New Algorithm

1. Create implementation in appropriate `src/algorithms/` subdirectory
2. Export from the category's `index.ts`
3. Add to main `src/index.ts` exports
4. Write comprehensive tests in `test/unit/`
5. Add examples in `examples/`
6. Update documentation

### Running Examples

```bash
npm run examples         # Run all Node.js examples
npm run examples:html    # Start Vite server for HTML examples
```
