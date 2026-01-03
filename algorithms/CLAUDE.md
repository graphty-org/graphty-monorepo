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
npm run coverage:preview # Serve coverage report on port 9051

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
- **IMPORTANT**: Do not increase test coverage for floyd-warshall module - it causes vitest to hang
- Performance regression tests track algorithm speed over time
- Use `npm run test:performance:update` to update baselines after intentional changes

## Optimized Implementations

The `src/optimized/` directory contains high-performance implementations:
- **CSRGraph**: Compressed Sparse Row format for memory efficiency
- **Bit-packed structures**: TypedFastBitSet for large graphs
- **Direction-optimized BFS**: Automatic switching between top-down and bottom-up

The library automatically selects optimal implementations based on graph size - users don't need to configure this.

## Design Philosophy

- **Zero configuration**: Algorithms auto-optimize based on graph characteristics
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
