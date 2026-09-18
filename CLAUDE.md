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
| `@graphty/graph-format` | **graph-format** | "format", "snapshot package" |
| `@graphty/graph-io` (and `@graphty/graph-io/<format>` subpaths: gexf, graphml, gml, dot, pajek, csv, json, neo4j) | **graph-io** | "io", "importers" |
| `@graphty/webgpu-graph-algorithms` (and `@graphty/webgpu-graph-algorithms/browser`, `/node` subpaths) | **webgpu-graph-algorithms** | "webgpu", "the GPU package", "the GPU layout" |

- The Web Component library is **graphty-element** (not "graphty")
- The React application is **graphty** or **graphty app**
- In documentation URLs, use `/graphty-element/` for the Web Component docs
- When referring to the visualization library, always say "graphty-element"

## Package Directory

| Package | Location | Version | Description |
|---------|----------|---------|-------------|
| `@graphty/graph-format` | `graph-format/` | 0.1.0 | Frozen CSR graph snapshot over typed arrays (builder, id map, attribute columns, views, wire form); zero dependencies |
| `@graphty/graph-io` | `graph-io/` | 0.1.0 | Importers and exporters (GEXF, GraphML, GML, DOT, Pajek, CSV, JSON, Neo4j) for the graph-format snapshot; subpath exports per format |
| `@graphty/webgpu-graph-algorithms` | `webgpu-graph-algorithms/` | 0.1.0 | WebGPU-accelerated graph algorithms and layouts (ForceAtlas2 first) over the graph-format snapshot, for Node (Dawn) and browsers; never falls back to the CPU |
| `@graphty/algorithms` | `algorithms/` | 1.4.0 | 98+ graph algorithms (traversal, pathfinding, centrality, clustering, flow, link prediction) |
| `@graphty/layout` | `layout/` | 1.3.0 | Graph layout algorithms (NetworkX TypeScript port) |
| `@graphty/graphty-element` | `graphty-element/` | 1.5.0 | Web Component for 3D/2D graph visualization (Lit + Babylon.js) |
| `@graphty/graphty` | `graphty/` | 0.1.0 | React wrapper application (private, Mantine UI) |

## Monorepo Structure

```
graphty-monorepo/
├── graph-format/         # @graphty/graph-format package (bottom of the dependency chain)
├── graph-io/             # @graphty/graph-io package (depends on graph-format)
├── webgpu-graph-algorithms/  # @graphty/webgpu-graph-algorithms package (depends on graph-format)
├── algorithms/           # @graphty/algorithms package
├── layout/               # @graphty/layout package
├── graphty-element/      # @graphty/graphty-element package
├── graphty/              # @graphty/graphty React app
├── tools/                # Build scripts
│   ├── merge-coverage.sh # Coverage report merging
│   ├── run-tests.sh      # Unified test runner
│   ├── prepush.sh        # Pre-push gate (build, lint, knip, fast tests)
│   ├── commit-changes.sh # Conventional-commit runner (--dry-run stages nothing)
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
pnpm run storybook:algorithms       # Port 9001
pnpm run storybook:layout           # Port 9011

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
pnpm run coverage:preview:graph-format     # Port 9056
pnpm run coverage:preview:graph-io         # Port 9057
pnpm run coverage:preview:webgpu-graph-algorithms  # Port 9058
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
| `prepush.sh` | The pre-push gate: build, lint, knip and the fast tests. Run by `.husky/pre-push` via `pnpm run prepush:fast` |
| `commit-changes.sh` | Lands the working tree as a sequence of conventional commits. `--dry-run` first: it stages nothing |

### Port Assignments

All dev servers use ports 9000-9099:
- algorithms: 9000
- algorithms Storybook: 9001
- layout: 9010
- layout Storybook: 9011
- graphty-element: 9020
- graphty-element Storybook: 9025
- graphty: 9050
- graphty Storybook: 9035
- compact-mantine Storybook: 9060
- webgpu-graph-algorithms demo (vite): 9030
- Coverage previews: 9051-9054, graph-format 9056, graph-io 9057, webgpu-graph-algorithms 9058

## Testing Infrastructure

### Test Projects by Package

**algorithms:**
- `default` - Node.js environment
- `browser` - Playwright browser tests

**layout:**
- Single test project (Node.js)

**graph-format:**
- Single test project (Node.js); `test/types/*.test-d.ts` are compile-only (`npm run typecheck:strict-consumer` after a build)

**graph-io:**
- Single test project (Node.js); resolves `@graphty/graph-format` through `graph-format/dist`, so build graph-format first

**webgpu-graph-algorithms:**
- `node` - Node.js on Dawn (`GRAPHTY_GPU_REQUIRE` unset skips without an adapter; CI sets `any` on lavapipe)
- `node-limits` - the GPU lane only (real device limits)
- `browser` - Playwright Chromium with the `GRAPHTY_BROWSER_GPU` flag set (swiftshader in CI) through `scripts/run-browser-project.js`

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
| `ci.yml` | Push/PR | Build, lint, sharded tests (20 parallel jobs) |
| `coverage.yml` | After CI | Merge coverage reports, publish to Coveralls |
| `release.yml` | After CI (master) | Semantic release with Nx |
| `deploy-pages.yml` | After CI | Deploy docs to GitHub Pages |
| `gpu.yml` | Push to master, nightly, dispatch, labelled same-repo PRs | The webgpu-graph-algorithms NVIDIA T4 lane (a machine.dev T4 by default); never a job of CI, but `release.yml` waits for it and requires it green |
| `hosts.yml` | Push/PR touching `webgpu-graph-algorithms/` or `graph-format/`, dispatch | Host matrix: Dawn on Metal + WebKit (macOS), Dawn on D3D12 WARP + Chromium (Windows); `release.yml` waits for it and requires it green when it ran |

### CI Test Shards

The CI runs 20 parallel test jobs:
- `graph-format`
- `graph-io`
- `webgpu-graph-algorithms-node`, `webgpu-graph-algorithms-browser`
- `algorithms-default`, `algorithms-browser`
- `layout`
- `graphty`
- `remote-logger`
- `compact-mantine`
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
- `graph-format/CLAUDE.md` - Snapshot invariants, freeze pipeline, adding a view / a dtype
- `graph-io/CLAUDE.md` - Importer / exporter contract, adding a format
- `webgpu-graph-algorithms/CLAUDE.md` - The GPU context and adapter policy, the kernel layers, the lanes and their environment variables, verified platform facts
- `algorithms/CLAUDE.md` - Algorithm-specific notes (e.g., floyd-warshall hang)
- `layout/CLAUDE.md` - Layout testing patterns
- `graphty-element/CLAUDE.md` - Web component patterns, visual testing
- `graphty/CLAUDE.md` - React app specifics

## Important Development Notes

### WebGPU

- Never create fallbacks if WebGPU isn't supported. The GPU package throws (`E_NO_WEBGPU`, `E_NO_ADAPTER`, `E_TOO_LARGE`, ...) and never runs a CPU path; the CPU packages' dispatchers choose the CPU only when no accelerator was injected (`design/webgpu/webgpu-acceleration-plan.md` section 2.4).

### TypeScript

- Strict mode enabled across all packages
- Never disable `@typescript-eslint/no-explicit-any`
- Use type imports: `import type { ... }`
- Uses TypeScript project references for cross-package dependencies:
  - `tsconfig.base.json` provides shared compiler options
  - Each package extends base config and sets `composite: true`
  - Dependent packages declare `references` array pointing to dependencies
  - Build order enforced by TypeScript: `graph-format` → `graph-io` → `webgpu-graph-algorithms` → `algorithms` → `layout` → `graphty-element` → `graphty`

### UI Components

- Use the default components. Never write a bespoke control to work around one
- If a shared component is wrong, fix the shared component, so every caller gets the fix
- Example (2026-09-13): the app shell's lock button grew a custom contrast ring because
  Mantine's `light` active state measured 1.21:1 against the panel header where WCAG 1.4.11
  asks 3:1. The ring left one control in the app behaving unlike every other toggle. The fix
  belonged in `compact-mantine`'s ActionIcon theme, and once it was there the local ring was
  deleted

### Graph Styling

- Node and edge appearance MUST be applied through a style layer, as a layer handed to
  graphty-element through the StyleManager
- It MUST NOT be applied manually under any circumstance -- never by mutating a mesh, a
  material, or a node or edge object
- The failure mode: styling applied outside the layer system is invisible to the layer list,
  cannot be reordered, removed or persisted, and is silently lost at a dataset boundary

### Algorithm Styles

- An algorithm's suggested style layers MUST write ONLY to the nodes and edges that are part of
  that algorithm's own result. Dijkstra styles the nodes and edges ON the path; every other node
  and edge MUST be left exactly as the layers beneath it painted them, UNMODIFIED
- "Part of the result" means the element carries a value this algorithm produced. Degree colours
  every node because every node HAS a degree; Dijkstra colours the path because only path
  elements have `isInPath == true`. An element the algorithm has nothing to say about is not
  the algorithm's to paint -- not even to a default, a muted grey, or a full opacity
- Two ways a layer breaks this, both silent:
  - an empty `selector: ""` matches EVERY node or edge, so the layer's `calculatedStyle` runs
    on the whole graph. Calculated values are last-writer-wins, so the write lands whatever the
    value is -- including the value the expression returns for "not in my result"
  - a helper with an un-highlighted branch (`blueHighlight(false)` returns `#CCCCCC`) turns
    "this element is not part of my result" into a paint instruction. So does an input that is
    `undefined` before the algorithm has even run
  Scope the layer with a selector that matches only the elements carrying a result
  (``algorithmResults.graphty.dijkstra.isInPath == `true` ``), so a non-result element is never
  visited at all
- Dimming, fading, greying or hiding what an algorithm did NOT select is a READER's choice, not
  the algorithm's. It belongs to the caller -- a story, the app, a user-added layer -- and MUST
  NOT ship in `suggestedStyles`
- Why: layers stack bottom to top, and `applySuggestedStyles(["a", "b"])` appends a's layers and
  then b's, so the last algorithm applied wins every property it writes. One algorithm that
  writes to everything erases every algorithm under it -- and stacking algorithms is the entire
  point of style layers

### Testing

- Use `assert` instead of `expect` in layout tests
- Visual tests run sequentially (`--workers=1`) to avoid resource contention
- Don't increase test coverage for floyd-warshall (causes vitest hang)
- Use `./tools/run-tests.sh` for quick test runs with minimal output

### Storybook

- Storybook auto-reloads on changes (no manual rebuild needed)
- Visual regression via Chromatic
- algorithms: port 9001 (interactive algorithm demos)
- layout: port 9011 (interactive layout demos)
- graphty-element: port 9025
- graphty: port 9035 (requires SSL cert)
- GitHub Pages: https://graphty.app/storybook/

### GitHub Pages URLs

**IMPORTANT**: Use `graphty.app` for all documentation and Storybook links (NOT `graphty-org.github.io`):
- Documentation: `https://graphty.app/docs/{package}/`
- Storybook: `https://graphty.app/storybook/{package}/`

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
- `graph-format/graph-format-design.md` - The shared graph data format and the consumer migration
- `webgpu/webgpu-acceleration-plan.md` - WebGPU acceleration: the design, `webgpu/plans/` the contract, the phase plans and the monorepo integration plan

## Debugging Tips

- Use browser DevTools for graphty-element inspection
- Storybook provides isolated component testing
- Visual regression tests catch rendering issues
- Performance benchmarks: `npm run benchmark` (in algorithms/)
- Coverage preview servers for inspecting coverage reports
- Nx graph visualization: `pnpm exec nx graph`

## Claude Session History

- Past Claude Code sessions for this project (transcripts, subagent logs, workflows, memory) are archived in ./.claudehistory/. Look there for context from earlier work. Synced by claude-history-sync.sh.
