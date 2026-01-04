# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Graphty is a modular graph visualization ecosystem built as a TypeScript monorepo managed by **pnpm** and **Nx**.

## Naming Conventions

**IMPORTANT**: Always use the full package name to avoid confusion:

| Package | Correct Name | DO NOT Use |
|---------|--------------|------------|
| `@graphty/graphty-element` | **graphty-element** | "graphty" (ambiguous) |
| `@graphty/graphty` | **graphty** or **graphty app** | - |
| `@graphty/algorithms` | **algorithms** | - |
| `@graphty/layout` | **layout** | - |

- The Web Component library is **graphty-element** (not "graphty")
- The React application is **graphty** or **graphty app**
- In documentation URLs, use `/graphty-element/` for the Web Component docs
- When referring to the visualization library, always say "graphty-element"

## Package Directory

| Package | Location | Version | Description |
|---------|----------|---------|-------------|
| `@graphty/algorithms` | `algorithms/` | 1.4.0 | 98+ graph algorithms (traversal, pathfinding, centrality, clustering, flow, link prediction) |
| `@graphty/layout` | `layout/` | 1.3.0 | Graph layout algorithms (NetworkX TypeScript port) |
| `@graphty/graphty-element` | `graphty-element/` | 1.5.0 | Web Component for 3D/2D graph visualization (Lit + Babylon.js) |
| `@graphty/graphty` | `graphty/` | 0.1.0 | React wrapper application (private, Mantine UI) |

## Monorepo Structure

```
graphty-monorepo/
├── algorithms/           # @graphty/algorithms package
├── layout/               # @graphty/layout package
├── graphty-element/      # @graphty/graphty-element package
├── graphty/              # @graphty/graphty React app
├── tools/                # Build scripts
│   ├── merge-coverage.sh # Coverage report merging
│   ├── run-tests.sh      # Unified test runner
│   └── validate-outputs.cjs  # Build output validation
├── design/               # Architecture and design documents
├── .github/workflows/    # CI/CD workflows
├── nx.json               # Nx configuration
├── pnpm-workspace.yaml   # pnpm workspace config
├── tsconfig.base.json    # Shared TypeScript config (project references)
├── vite.shared.config.ts # Shared Vite config factory
├── vitest.shared.config.ts # Shared Vitest config factory
└── eslint.config.js      # Shared ESLint config
```

## Development Commands

### From Root (Nx-orchestrated)

```bash
# Build
pnpm run build                    # Build all packages
pnpm exec nx run-many -t build    # Build with Nx caching

# Test
pnpm run test                     # Test all packages
pnpm exec nx run-many -t test     # Test with Nx caching
./tools/run-tests.sh              # Run tests with minimal output

# Coverage
pnpm run coverage                 # Run all coverage
./tools/merge-coverage.sh         # Merge coverage reports

# Lint
pnpm run lint                     # Lint all packages

# Development servers
pnpm run dev:algorithms           # Port 9000
pnpm run dev:layout               # Port 9010
pnpm run dev:graphty-element      # Port 9020
pnpm run dev:graphty              # Port 9050

# Storybook
pnpm run storybook:graphty-element  # Port 9025
pnpm run storybook:graphty          # Port 9035

# Interactive examples
pnpm run examples:algorithms      # Algorithm demos
pnpm run examples:layout          # Layout demos
```

### Per-Package Commands

```bash
# Inside any package directory:
npm run build         # Build the package
npm run build:bundle  # Bundle for distribution (algorithms, layout)
npm test              # Run tests (watch mode)
npm run test:run      # Run tests once
npm run coverage      # Run with coverage
npm run lint          # Lint package
npm run lint:fix      # Auto-fix lint issues
```

### Coverage Preview (HTTP servers)

```bash
pnpm run coverage:preview:algorithms       # Port 9051
pnpm run coverage:preview:layout           # Port 9052
pnpm run coverage:preview:graphty-element  # Port 9053
pnpm run coverage:preview:graphty          # Port 9054
```

## Shared Configuration

The monorepo uses shared configuration files in the root directory:

| File | Purpose |
|------|---------|
| `vite.shared.config.ts` | Shared Vite config factory (port assignments, build formats) |
| `vitest.shared.config.ts` | Shared Vitest config factory (coverage thresholds, environment) |
| `tsconfig.base.json` | Shared TypeScript settings with project references |
| `eslint.config.js` | Shared ESLint flat config |

## Tools Directory

The `tools/` directory contains build scripts:

| File | Purpose |
|------|---------|
| `merge-coverage.sh` | Merges coverage from all packages, supports CI artifacts |
| `run-tests.sh` | Runs all tests with minimal output, parallel execution |
| `validate-outputs.cjs` | Validates build outputs (ES modules, UMD, types, sourcemaps) |

### Port Assignments

All dev servers use ports 9000-9099:
- algorithms: 9000
- layout: 9010
- graphty-element: 9020
- graphty: 9050
- Coverage previews: 9051-9054

## Testing Infrastructure

### Test Projects by Package

**algorithms:**
- `default` - Node.js environment
- `browser` - Playwright browser tests

**layout:**
- Single test project (Node.js)

**graphty:**
- Browser-based tests (Playwright)

**graphty-element:**
- `default` - Node.js tests
- `browser` - Playwright tests (5 CI shards)
- `storybook` - Component tests (4 CI shards)
- `interactions` - Interaction tests
- `llm-regression` - LLM regression tests

### Running Specific Test Projects

```bash
# In graphty-element:
npm test -- --project=browser
npm test -- --project=storybook

# In algorithms:
npm test -- --project=browser
```

### Coverage Thresholds

All packages: 80% lines/functions/statements, 75% branches

## CI/CD Pipeline

### Workflows (`.github/workflows/`)

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ci.yml` | Push/PR | Build, lint, sharded tests (14 parallel jobs) |
| `coverage.yml` | After CI | Merge coverage reports, publish to Coveralls |
| `release.yml` | After CI (master) | Semantic release with Nx |
| `deploy-pages.yml` | After CI | Deploy docs to GitHub Pages |

### CI Test Shards

The CI runs 14 parallel test jobs:
- `algorithms-default`, `algorithms-browser`
- `layout`
- `graphty`
- `graphty-element-default`
- `graphty-element-browser-1` through `graphty-element-browser-5`
- `graphty-element-storybook-1` through `graphty-element-storybook-4`

## Architecture & Key Patterns

### Algorithm Implementation Pattern

```typescript
// All algorithms in @graphty/algorithms follow this pattern:
export function algorithmName<TNodeId = unknown>(
    graph: ReadonlyGraph<TNodeId>,
    options?: AlgorithmOptions,
): AlgorithmResult<TNodeId> {
    // Implementation
}
```

### Layout Function Interface

```typescript
// All layouts in @graphty/layout implement:
type LayoutFunction = (
    graph: ReadonlyGraph,
    options?: LayoutOptions,
) => PositionMap;
```

### Web Component Architecture (graphty-element)

- **Graph.ts** - Core orchestrator class
- **Manager pattern** - Side effects handled by dedicated managers
- **Registry pattern** - Extensible layouts, algorithms, data sources
- **Babylon.js** - 3D rendering with mesh instancing
- **Lit** - Web Component framework

### Plugin System

```typescript
// Register custom implementations
LayoutRegistry.register("custom-layout", customLayoutFunction);
DataSourceRegistry.register("custom-source", CustomDataSource);
AlgorithmRegistry.register("custom-algo", customAlgorithm);
```

## Key Files to Understand

### Core Implementation Files

| File | Purpose |
|------|---------|
| `graphty-element/src/Graph.ts` | Core orchestration class |
| `graphty-element/src/graphty-element.ts` | Web Component entry point |
| `graphty-element/src/Node.ts` | Node implementation |
| `graphty-element/src/Edge.ts` | Edge implementation |
| `algorithms/src/index.ts` | All algorithm exports |
| `layout/src/layouts/index.ts` | All layout exports |
| `graphty/src/App.tsx` | React integration example |

### Configuration Files

| File | Purpose |
|------|---------|
| `nx.json` | Nx build system config (caching, plugins, release) |
| `pnpm-workspace.yaml` | pnpm workspace packages |
| `tsconfig.base.json` | Shared TypeScript config with project references |
| `eslint.config.js` | Shared ESLint flat config |
| `vite.shared.config.ts` | Vite build configuration factory |
| `vitest.shared.config.ts` | Vitest test configuration factory |

### Package CLAUDE.md Files

Each package has its own CLAUDE.md with package-specific guidance:
- `algorithms/CLAUDE.md` - Algorithm-specific notes (e.g., floyd-warshall hang)
- `layout/CLAUDE.md` - Layout testing patterns
- `graphty-element/CLAUDE.md` - Web component patterns, visual testing
- `graphty/CLAUDE.md` - React app specifics

## Important Development Notes

### TypeScript

- Strict mode enabled across all packages
- Never disable `@typescript-eslint/no-explicit-any`
- Use type imports: `import type { ... }`
- Uses TypeScript project references for cross-package dependencies:
  - `tsconfig.base.json` provides shared compiler options
  - Each package extends base config and sets `composite: true`
  - Dependent packages declare `references` array pointing to dependencies
  - Build order enforced by TypeScript: `algorithms` → `layout` → `graphty-element` → `graphty`

### Testing

- Use `assert` instead of `expect` in layout tests
- Visual tests run sequentially (`--workers=1`) to avoid resource contention
- Don't increase test coverage for floyd-warshall (causes vitest hang)
- Use `./tools/run-tests.sh` for quick test runs with minimal output

### Storybook

- Storybook auto-reloads on changes (no manual rebuild needed)
- Visual regression via Chromatic
- graphty-element: port 9025
- graphty: port 9035 (requires SSL cert)

### Build System

- Nx caches build outputs in `.nx/cache`
- Affected commands run only changed packages on PRs
- CI builds artifacts once, tests download and reuse them
- Release workflow reuses CI artifacts (no rebuild)

### Module System

- ES modules are the default format
- Bundled distributions: `dist/{package}.js`
- UMD builds available for graphty-element

## Design Documents

The `design/` directory contains architecture documentation:

- `monorepo-design.md` - Overall architecture
- `nx-configuration-guide.md` - Nx setup details
- `nx-monorepo-implementation-plan.md` - Implementation guide
- `nx-semantic-release-guide.md` - Release strategy
- `eslint-config.md` - Linting configuration
- `ci-parity-plan.md` - CI/CD alignment plan

## Debugging Tips

- Use browser DevTools for graphty-element inspection
- Storybook provides isolated component testing
- Visual regression tests catch rendering issues
- Performance benchmarks: `npm run benchmark` (in algorithms/)
- Coverage preview servers for inspecting coverage reports
- Nx graph visualization: `pnpm exec nx graph`
