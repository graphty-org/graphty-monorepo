# CLAUDE.md

This file provides guidance to Claude Code when working with the @graphty/algorithms package.

## Project Overview

@graphty/algorithms is a TypeScript graph algorithms library for browser environments: 60+ algorithms covering
traversal, paths, centrality, clustering, community detection, flow, matching and link prediction, every one over a
frozen `@graphty/graph-format` snapshot.

## Package Structure

```
algorithms/
|-- src/
|   |-- index.ts           # The barrel: every algorithm at the top level, and the seam
|   |-- indexed/           # The algorithms, one file per family, and the accelerator seam (accelerator.ts)
|   |   `-- structures/    # Index-based heap and union-find the algorithms share
|   |-- data-structures/   # PriorityQueue, UnionFind (general purpose, exported)
|   |-- utils/             # SeededRandom
|   `-- errors.ts          # ConvergenceError, PathWalkError
|-- test/
|   |-- unit/indexed/      # One suite per algorithm family
|   |-- unit/docs/         # The guide samples and the migration table, run as checks
|   |-- types/             # Compile-only tests of the public surface (exports.test-d.ts, accelerator.test-d.ts)
|   |-- golden/            # What the removed 2.x functions returned, recorded
|   |-- browser/           # Browser tests (Playwright)
|   `-- helpers/           # Test-only: the 2.x Graph class as a fixture builder, its freezer, golden lookups
|-- benchmarks/            # node/algorithms-benchmark.ts times every algorithm over generated graphs
|-- stories/               # Storybook stories, one per algorithm
`-- docs/                  # VitePress documentation (docs/guide/migrating-to-3.md maps every 2.x function)
```

Every algorithm is a top-level export: `pageRank`, `dijkstra`, `louvain` and the rest. The `indexed` namespace 2.x
and 3.x offered them under is gone in 4.0. `test/types/exports.test-d.ts` pins every exported function's signature,
asserts that `indexed` is not exported, and asserts that none of the 2.x id-keyed names (the `Graph` class, the Map-of-Maps functions, `CSRGraph`
and its helpers, `toSnapshot`) is exported.

The id-keyed API of 2.x was removed in 3.0.0. What its functions returned is recorded in `test/golden/` (one gzipped
JSON file per suite, one record per line, `zcat` to read), and `legacyResult()` in `test/helpers/golden.ts` hands a
record back in its original shape: Map and Set order, number or string keys, `-0`, `NaN` and the infinities, and exact
f64 values. A recorded throw is thrown again with its message; it is an instance of its class for `ConvergenceError`,
`PathWalkError`, `RangeError` and `TypeError`, and a plain `Error` carrying the recorded name otherwise. The suites of
`test/unit/indexed/` check the algorithms against those records.

The records are frozen: nothing re-records them. Each is keyed by the test's full name and the call's position within
that test, and `expectFacadeMatchesLegacy` makes one call per fixture, so renaming a test, reordering its
`legacyResult()` calls, or adding, removing or reordering a fixture in `port-fixtures.ts` or another shared fixture list
breaks the lookup. Two tests of one file with the same name, and a record that a full passing run of its file never
reads, fail that file. A comment beside a `legacyResult()` call says which 2.x call and inputs a record came from when
the test itself no longer shows them.

The fixtures are built with a test-only copy of the 2.x `Graph` class (`test/helpers/legacy-graph.ts`) and frozen by
`test/helpers/to-snapshot.ts`, so each snapshot has exactly the node and edge order the 2.x functions saw when their
results were recorded. Neither is part of the package.

Where an algorithm's results differ from the 2.x function of the same name (tie-breaks, orders, seeded partitions,
the flow and matching rules the owner accepted on 2026-09-28), `docs/guide/migrating-to-3.md` says how.

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
npm run benchmark        # Time every algorithm over generated graphs
npm run benchmark:quick  # The same, at smaller sizes

# Linting
npm run lint             # ESLint + TypeScript check
npm run lint:fix         # Auto-fix lint issues
npm run lint:knip        # Check for unused files, exports and dependencies (knip)

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
- `test/types/*.test-d.ts` are compile-only; `npm run lint` checks them (`tsc -p tsconfig.typecheck.json`)
- A new algorithm's suite checks its results against an independent oracle or hand-computed answers, and calls
  `snapshot.validate({ checksum: true })` after the run so a write into a shared view fails the test

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
4. Add it to `test/types/exports.test-d.ts` (its signature) and to `benchmarks/node/algorithms-benchmark.ts`
5. Update documentation; code samples in `docs/guide/*.md` and the README's marked blocks are type-checked and run by
   `test/unit/docs/guide-samples.test.ts` (see below)

### Documentation Samples

`test/unit/docs/guide-samples.test.ts` type-checks and runs every ```typescript block of the `docs/guide/`pages,
which must all be marked`<!-- doc-check -->`just before them, and every block of`README.md`so marked. Keep each
marked block self-contained, with its own imports.`test/unit/docs/migration-table.test.ts`checks that the table of`docs/guide/migrating-to-3.md` has a row for every function and class 2.x exported, and names only functions 3.0
exports.
