# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

@graphty/layout is a TypeScript graph layout library that ports NetworkX Python algorithms to JavaScript. The library has been refactored from a single file into a modular structure but maintains a bundled distribution.

## Key Commands

### Development

```bash
# Build TypeScript output
npm run build

# Build ES module bundle (dist/layout.js)
npm run build:bundle

# Build everything (TypeScript + bundle)
npm run build:all

# Watch mode for development
npm run watch
# or
npm run dev

# Run tests
npm test           # Watch mode
npm run test:run   # Run once
npm run test:coverage  # With coverage
```

### Git Commits

This project uses conventional commits with commitizen:

```bash
# Use commitizen for formatted commits
npm run commit
```

Commit types: build, chore, ci, docs, feat, fix, perf, refactor, revert, style, test

## Architecture

The library is now modularly organized but distributed as a single bundle:

### Source Structure (`src/`)

- `types/` - TypeScript interfaces and types
- `utils/` - Utility functions (numpy-like operations, rescaling, etc.)
- `layouts/` - Layout algorithms organized by category
    - `force-directed/` - Spring, ForceAtlas2, ARF, Kamada-Kawai
    - `geometric/` - Random, Circular, Shell, Spiral
    - `hierarchical/` - BFS, Bipartite, Multipartite
    - `spectral/` - Spectral layout
    - `planar/` - Planar layout
- `generators/` - Graph generation utilities
- `algorithms/` - Graph algorithms (helpers)

### Distribution

- **NPM Package Entry**: `dist/layout.js` (bundled ES module)
- **TypeScript Types**: `dist/src/index.d.ts`
- The bundle includes all algorithms and works correctly with 3D layouts

Each algorithm returns a `PositionMap` with node positions.

## Module System

This is an ES module project (`"type": "module"` in package.json). When importing:

```typescript
import { springLayout, circularLayout } from "@graphty/layout";
```

## Common Tasks

### Adding a New Layout Algorithm

1. Add the function to the appropriate category under `src/layouts/`
2. Export it from the category's index file
3. Ensure it's exported from `src/index.ts`
4. Run `npm run build:all` to update the bundle
5. Update README.md with documentation
6. Add an example HTML file in `examples/`
7. Add tests in `test/`

### Modifying Build Output

Edit `tsconfig.json`. Current settings:

- Target: ES2020
- Module: ES2020
- Output: `dist/` directory
- Generates declaration files and source maps

## Testing

### Running Tests

```bash
npm test           # Run tests in watch mode
npm run test:run   # Run tests once
npm run test:coverage  # Run with coverage report
```

### Testing Preferences

- Use `assert` instead of `expect` for test assertions
- Tests are organized by layout algorithm in `test/` directory
- Each test file covers: basic functionality, parameter variations, edge cases, and algorithm-specific behaviors
- Graph generation utilities are available for creating test graphs

## Important Notes

- All algorithms should match NetworkX Python library behavior where possible
- Graph interface is minimal - algorithms work with any object providing nodes() and edges() methods
- Examples in `examples/` directory demonstrate usage patterns
- Tests serve as additional documentation for expected behavior
- **NPM Package Structure**: The package uses `dist/layout.js` as the main entry, NOT `dist/src/index.js`
- **3D Support**: All layout algorithms support 3D when `dim=3` is specified
- **Build Process**: Always run `npm run build:all` before publishing to ensure both TypeScript and bundle are built

## Claude Preferences

- NEVER automatically stage files with git add or create commits
- NEVER create commits unless explicitly requested by the user
- User prefers to handle git operations manually
