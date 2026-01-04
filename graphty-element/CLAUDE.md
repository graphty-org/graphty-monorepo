# CLAUDE.md

This file provides guidance to Claude Code when working with the @graphty/graphty-element package.

## Project Overview

graphty-element is a Web Component library for 3D/2D graph visualization built with:

- **TypeScript** (ES2022, strict mode)
- **Lit** (Web Components framework)
- **Babylon.js** (3D rendering engine)
- **Vite** (build tool)

The main component `<graphty-element>` provides interactive graph visualizations with multiple layout algorithms, rich styling, AI integration, and XR support.

## Package Structure

```
graphty-element/
├── src/
│   ├── Graph.ts              # Central orchestrator
│   ├── graphty-element.ts    # Web Component entry point
│   ├── Node.ts / Edge.ts     # Graph element classes
│   ├── ai/                   # AI/LLM integration
│   │   ├── commands/         # Natural language command handlers
│   │   ├── providers/        # LLM provider adapters
│   │   ├── schema/           # Schema extraction for AI
│   │   └── keys/             # API key management
│   ├── algorithms/           # Algorithm wrappers and registry
│   ├── cameras/              # Camera implementations
│   ├── config/               # Configuration types and palettes
│   ├── data/                 # Data source implementations
│   ├── input/                # Input handling (keyboard, mouse, touch)
│   ├── layout/               # Layout engine wrappers
│   ├── logging/              # Logging infrastructure
│   ├── meshes/               # Babylon.js mesh factories
│   ├── screenshot/           # Screenshot capture utilities
│   ├── shaders/              # Custom GLSL shaders
│   ├── ui/                   # UI overlay components
│   ├── utils/                # Utility functions
│   ├── video/                # Video export functionality
│   └── xr/                   # VR/AR support
├── test/
│   ├── ai/                   # AI feature tests
│   ├── algorithms/           # Algorithm tests
│   ├── interactions/         # User interaction tests
│   ├── meshes/               # Mesh rendering tests
│   └── ...
├── stories/                  # Storybook stories
└── docs/                     # VitePress documentation
```

## Essential Commands

```bash
# Development
npm run dev              # Start Vite dev server (port 9020)
npm run storybook        # Start Storybook (port 9025)
npm run dev:xr           # Start XR demo server

# Testing
npm test                 # Run all test shards + visual tests
npm run test:default     # Run default (unit) tests
npm run test:browser     # Run browser tests (Playwright)
npm run test:storybook   # Run Storybook component tests
npm run test:interactions # Run interaction tests
npm run test:llm-regression # Run LLM regression tests

# Coverage
npm run coverage         # Full coverage with shards
npm run coverage:fast    # Quick coverage (default project only)
npm run coverage:preview # Serve coverage report on port 9053

# Linting
npm run lint             # ESLint + TypeScript check
npm run lint:fix         # Auto-fix lint issues
npm run lint:pkg         # Check for unused deps (knip)

# Building
npm run build            # Vite build + TypeScript declarations
npm run build-storybook  # Build Storybook for deployment

# Documentation
npm run docs:dev         # Start docs dev server
npm run docs:build       # Build documentation
```

## Architecture

### Core Components

1. **graphty-element.ts** - Lit Web Component wrapper (thin layer)
2. **Graph.ts** - Central orchestrator with all logic
3. **Node.ts / Edge.ts** - Graph element classes with Babylon.js meshes
4. **Managers** - Handle side effects: StyleManager, DataManager, LayoutManager, AlgorithmManager

### Key Design Patterns

- **Registry Pattern**: Layouts, data sources, algorithms are dynamically registered
- **Manager Pattern**: Side effects handled through managers (always use manager methods, not direct manipulation)
- **Observable Pattern**: Events via graphObservable, nodeObservable, edgeObservable
- **Stateless Design**: APIs work regardless of call order

### Test Projects

| Project | Environment | Purpose |
|---------|-------------|---------|
| `default` | happy-dom | Unit tests |
| `browser` | Playwright/Chromium | Browser integration tests |
| `storybook` | Playwright | Component tests via stories |
| `interactions` | Playwright | User interaction tests |
| `llm-regression` | Node | AI/LLM regression tests |

## Common Pitfalls

**Manager Pattern**: Always use manager methods instead of direct manipulation:
- ✅ `styleManager.addLayer(layer)` - uses manager
- ❌ `graph.styles.layers.push(layer)` - bypasses cache invalidation

**Algorithm Registration**: All algorithm classes must auto-register:
```typescript
export class MyAlgorithm extends Algorithm {
    static namespace = "my-namespace";
    static type = "my-type";
}
Algorithm.register(MyAlgorithm);
```

## Testing Guidelines

- Use `assert` instead of `expect` for assertions
- Visual tests run sequentially (`--workers=1`) to avoid resource contention
- Store temporary files (screenshots, debug scripts) in `./tmp`
- Don't create `__screenshots__` directories under `./test` unless intended for commit
- Don't increase Playwright timeouts to fix timeout issues - find the root cause

## Storybook Notes

- Storybook auto-reloads on changes (no manual rebuild needed)
- Check if Storybook is running on port 9025 before starting a new instance
- All story data URLs must be fully qualified (non-local) for Chromatic compatibility
- Visual regression via Chromatic

## Edge Styling System

Comprehensive edge customization:
- **Line Types**: solid, dash, dot, star, diamond, dash-dot, sinewave, zigzag
- **Arrow Types**: normal, inverted, dot, diamond, box, vee, tee, half-open, crow, etc.
- **Bezier Curves**: Smooth curved edges with automatic control points
- **Opacity**: Full transparency control (0.0 - 1.0)

Key files: `src/Edge.ts`, `src/meshes/EdgeMesh.ts`, `src/meshes/PatternedLineMesh.ts`

## AI Integration

The `src/ai/` directory provides LLM-powered features:
- Natural language commands for graph manipulation
- Schema extraction for data understanding
- Multiple provider support (OpenAI, Anthropic, Google)
- Secure API key management

## XR Support

The `src/xr/` directory provides VR/AR support:
- WebXR integration with Babylon.js
- Controller input handling
- Immersive graph exploration

## Debugging

### Screenshot Capture
```bash
# Multi-angle 3D screenshots
npx tsx test/helpers/capture-3d-debug-screenshots.ts <story-id> [--axes]
```

### Layout Position Capture
```bash
# Capture settled layout positions
npx tsx scripts/capture-with-actual-engine.ts
```

## Configuration Stability

The config interface in `src/config` should be stable:
- Don't remove or change existing config settings
- Adding new settings is acceptable for new features
