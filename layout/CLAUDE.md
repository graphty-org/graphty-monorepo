# CLAUDE.md

This file provides guidance to Claude Code when working with the @graphty/layout package.

## Project Overview

@graphty/layout is a TypeScript graph layout library that ports NetworkX Python algorithms to JavaScript. It provides 15+ layout algorithms supporting both 2D and 3D positioning.

## Package Structure

```
layout/
├── src/
│   ├── layouts/              # Layout algorithm implementations
│   │   ├── force-directed/   # Spring, ForceAtlas2, ARF, Kamada-Kawai, Fruchterman-Reingold
│   │   ├── geometric/        # Circular, Shell, Spiral
│   │   ├── hierarchical/     # BFS, Bipartite, Multipartite
│   │   ├── specialized/      # Planar, Spectral
│   │   └── basic/            # Random
│   ├── algorithms/           # Supporting algorithms
│   │   ├── planarity/        # Planarity testing (LR algorithm)
│   │   └── optimization/     # L-BFGS, line search, Kamada-Kawai solver
│   ├── generators/           # Graph generators (random, grid, scale-free, bipartite)
│   ├── types/                # TypeScript interfaces
│   └── utils/                # NumPy-like utilities, rescaling
├── test/                     # Vitest tests
├── examples/                 # HTML usage examples
└── docs/                     # VitePress documentation
```

## Essential Commands

```bash
# Development
npm run dev              # Watch mode for TypeScript compilation
npm run build            # Build TypeScript to dist/
npm run build:bundle     # Create bundled ES module
npm run build:all        # Build both TypeScript and bundle

# Testing
npm test                 # Run tests in watch mode
npm run test:run         # Run tests once
npm run coverage         # Run with coverage
npm run coverage:preview # Serve coverage report on port 9052

# Linting
npm run lint             # TypeScript type checking

# Examples
npm run examples         # Build and serve HTML examples

# Documentation
npm run docs:dev         # Start docs dev server
npm run docs:build       # Build documentation
```

## Layout Function Interface

All layouts follow a consistent pattern:

```typescript
type LayoutFunction = (
    graph: ReadonlyGraph,
    options?: LayoutOptions,
) => PositionMap;

// PositionMap: Map<NodeId, number[]>  (2D or 3D coordinates)
```

Common options:
- `dim`: Dimension (2 or 3, default: 2)
- `center`: Center point for the layout
- `scale`: Scale factor for positions
- `seed`: Random seed for deterministic layouts

## Testing Guidelines

- Use `assert` instead of `expect` for test assertions
- Tests are organized by layout algorithm
- Graph generators in `src/generators/` help create test graphs
- All layouts should work with both 2D (`dim=2`) and 3D (`dim=3`)

## Key Design Principles

- **NetworkX compatibility**: Algorithms match NetworkX Python behavior where possible
- **Minimal graph interface**: Works with any object providing `nodes()` and `edges()` methods
- **3D support**: All layouts support 3D when `dim=3` is specified
- **Deterministic**: Layouts produce consistent results with the same seed

## Adding a New Layout

1. Create implementation in appropriate `src/layouts/` subdirectory
2. Export from the category's `index.ts`
3. Export from main `src/index.ts`
4. Run `npm run build:all` to update bundle
5. Add tests in `test/`
6. Add HTML example in `examples/`
7. Update documentation

## Distribution

- **Main entry**: `dist/layout.js` (bundled ES module)
- **Types**: `dist/layout.d.ts`
- Always run `npm run build:all` before publishing
