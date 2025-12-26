# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Graphty is a modular graph visualization ecosystem consisting of multiple TypeScript packages:

- **@graphty/algorithms** - Comprehensive graph algorithms library (32+ algorithms)
- **@graphty/layout** - Graph layout algorithms (TypeScript port of NetworkX)
- **@graphty/graphty-element** - Web Component for 3D/2D graph visualization
- **@graphty/graphty** - React wrapper application (private)
- **gpu-3d-force-layout** - WebGPU-accelerated layout engine

## Common Development Commands

### Building
```bash
# Build individual packages
npm run build                    # TypeScript compilation
npm run build:all               # Full build including bundling (layout package)

# Build all packages from root
npm run build:packages          # Build all packages in dependency order
```

### Testing
```bash
# Run tests (most packages support watch mode)
npm test                        # Run tests in watch mode
npm run test:ci                 # Run tests once with coverage
npm run test:visual             # Visual regression tests (graphty-element)

# Run specific test file
npm test -- path/to/test.spec.ts
```

### Development Servers
```bash
# Package-specific dev servers (use ports 9000-9099)
npm run dev                     # Start Vite dev server
npm run storybook               # Start Storybook (ports 9025/9035)
npm run examples:html           # Run interactive examples
```

### Code Quality
```bash
npm run lint                    # Check for linting errors
npm run lint:fix                # Auto-fix linting errors
npm run typecheck               # Run TypeScript type checking
npm run ready:commit            # Full pre-commit check (lint, build, test)
```

## Architecture & Key Patterns

### Web Component Architecture (graphty-element)
- Core `Graph` class orchestrates all functionality
- Registry pattern for extensibility (layouts, data sources, algorithms)
- Observable pattern for reactivity
- Babylon.js for 3D rendering with mesh instancing for performance
- Stateless design - all state passed via attributes/properties

### Algorithm Implementation Pattern
```typescript
// All algorithms follow this pattern in @graphty/algorithms
export function algorithmName<TNodeId = unknown>(
  graph: ReadonlyGraph<TNodeId>,
  options?: AlgorithmOptions
): AlgorithmResult<TNodeId> {
  // Implementation
}
```

### Layout System Architecture
- All layouts implement `LayoutFunction` interface
- Support both 2D and 3D coordinates
- Automatic layout selection via `autoLayout()` helper
- Layout interpolation for smooth transitions

### Plugin Architecture
```typescript
// Register custom implementations
LayoutRegistry.register('custom-layout', customLayoutFunction);
DataSourceRegistry.register('custom-source', CustomDataSource);
AlgorithmRegistry.register('custom-algo', customAlgorithm);
```

## Important Development Notes

### TypeScript Configuration
- Strict mode enabled across all packages
- Never disable `@typescript-eslint/no-explicit-any`
- Use type imports: `import type { ... }`

### Testing Preferences
- Use `assert` instead of `expect` in layout tests
- Visual tests run sequentially to avoid resource contention
- Don't increase test coverage for floyd-warshall (causes hang)

### Performance Considerations
- Browser-optimized implementations
- Mesh instancing for large graphs (graphty-element)
- GPU acceleration experiments in gpu-3d-force-layout
- Caching strategies for expensive computations

### Module System
- ES modules are the default format
- Bundled distributions available for browser usage
- Peer dependencies for Babylon.js and Lit (graphty-element)

### Publishing Workflow
- Use conventional commits (`npm run commit`)
- Run `npm run ready:commit` before committing
- Always build before publishing: `npm run build:all`
- Semantic versioning with automated releases

## Special Configurations

### Development Environment
- Node LTS version (18+)
- Server ports restricted to 9000-9099 range
- ESLint auto-fixes on save (VSCode configured)

### React App (graphty package)
- Mantine UI framework for components
- Always include eruda for mobile debugging
- Wraps graphty-element Web Component

### WebGPU Development
- Experimental gpu-3d-force-layout package
- Requires WebGPU-capable browser
- Octree spatial indexing implementation

## Key Files to Understand

1. **packages/graphty-element/src/graph/graph.ts** - Core orchestration class
2. **packages/algorithms/src/index.ts** - All available algorithms
3. **packages/layout/src/layouts/index.ts** - All layout algorithms
4. **packages/graphty-element/src/registry/** - Plugin system implementation
5. **packages/graphty/src/App.tsx** - React integration example

## Debugging Tips

- Use browser DevTools for graphty-element inspection
- Storybook provides isolated component testing
- Visual regression tests catch rendering issues
- Performance benchmarks available via `npm run benchmark`