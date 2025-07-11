# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

@graphty/layout is a TypeScript graph layout library that ports NetworkX Python algorithms to JavaScript. All layout algorithms are implemented in a single file: `layout.ts`.

## Key Commands

### Development
```bash
# Build TypeScript to JavaScript
npm run build

# Watch mode for development
npm run watch
# or
npm run dev

# Currently no test framework is configured
# npm test exits with error code 1
```

### Git Commits
This project uses conventional commits with commitizen:
```bash
# Use commitizen for formatted commits
npm run commit
```

Commit types: build, chore, ci, docs, feat, fix, perf, refactor, revert, style, test

## Architecture

The entire library is contained in `layout.ts` with the following structure:

1. **Type System** (lines 1-50):
   - `Node`: string | number
   - `Edge`: [Node, Node] 
   - `Graph`: Interface with adjacency(), nodes(), edges() methods
   - `PositionMap`: Map<Node, Position> for storing layouts

2. **NumPy-like Utilities** (lines 50-500):
   - Array manipulation functions under `np` object
   - Used for mathematical operations in layout algorithms

3. **Layout Algorithms** (lines 500-2591):
   - Force-directed: springLayout, forceatlas2Layout, arfLayout, kamadaKawaiLayout
   - Geometric: randomLayout, circularLayout, shellLayout, spiralLayout
   - Specialized: spectralLayout, bipartiteLayout, multipartiteLayout, bfsLayout, planarLayout
   - Utilities: rescaleLayout, rescaleLayoutDict

Each algorithm returns a `PositionMap` with node positions.

## Module System

This is an ES module project (`"type": "module"` in package.json). When importing:
```typescript
import { springLayout, circularLayout } from '@graphty/layout';
```

## Common Tasks

### Adding a New Layout Algorithm
1. Add the function to `layout.ts` following the existing pattern
2. Export it at the bottom of the file
3. Update README.md with documentation and example
4. Add an example HTML file in `examples/`

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