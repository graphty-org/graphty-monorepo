# Design Documents

This directory contains design documents, implementation plans, research, and code reviews for the Graphty project.

## Directory Structure

| Directory | Description | Files |
|-----------|-------------|-------|
| [`ai/`](ai/) | AI and LLM integration - natural language control, tool calling, schema discovery | 11 |
| [`algorithms-pkg/`](algorithms-pkg/) | @graphty/algorithms package - graph algorithms, optimizations, benchmarks | 14 |
| [`architecture/`](architecture/) | Core architecture - state management, async patterns, RxJS, dependency batching | 10 |
| [`code-reviews/`](code-reviews/) | Code review findings and implementation plans (prefixed by package name) | 14 |
| [`data/`](data/) | Data handling - formats, loading, sources, validation | 4 |
| [`layout-pkg/`](layout-pkg/) | @graphty/layout package - layout algorithm research and implementation | 1 |
| [`monorepo/`](monorepo/) | Monorepo infrastructure - Nx, releases, CI/CD, ESLint configuration | 13 |
| [`rendering/`](rendering/) | Visual rendering - edges, lines, cameras, styles, screen capture | 21 |
| [`testing/`](testing/) | Testing strategies - Playwright, profiling, logging, documentation | 12 |
| [`ui/`](ui/) | React application UI - sidebars, modals, theming, Mantine components | 19 |
| [`xr/`](xr/) | Extended reality - VR, AR, WebXR cameras and controllers | 7 |

## Quick Reference

### By Task

| I want to... | Look in... |
|--------------|------------|
| Add AI/LLM features | `ai/` |
| Work on graph algorithms | `algorithms-pkg/` |
| Understand async/state patterns | `architecture/` |
| Review past code reviews | `code-reviews/` |
| Add data sources or formats | `data/` |
| Work on layout algorithms | `layout-pkg/` |
| Update build/release process | `monorepo/` |
| Change edge/node rendering | `rendering/` |
| Improve test infrastructure | `testing/` |
| Build React UI components | `ui/` |
| Add VR/AR support | `xr/` |

### By Package

| Package | Primary Directories |
|---------|---------------------|
| @graphty/algorithms | `algorithms-pkg/` |
| @graphty/layout | `layout-pkg/` |
| @graphty/graphty-element | `ai/`, `architecture/`, `data/`, `rendering/`, `xr/` |
| @graphty/graphty (React app) | `ui/` |
| Monorepo (root) | `monorepo/`, `testing/` |

## Document Types

Documents generally follow these patterns:

- **`*-design.md`** - Feature specifications and architecture decisions
- **`*-implementation-plan.md`** - Step-by-step execution plans
- **`*-research.md`** - Background research and comparisons
- **`*-guide.md`** - How-to documentation
- **`code-review-*.md`** - Code review findings (in `code-reviews/`)

## Key Documents

### Getting Started
- [`monorepo/monorepo-design.md`](monorepo/monorepo-design.md) - Overall monorepo architecture
- [`monorepo/nx-configuration-guide.md`](monorepo/nx-configuration-guide.md) - Nx setup and configuration

### Architecture
- [`architecture/state-management.md`](architecture/state-management.md) - State management approach
- [`architecture/dependency-and-batching.md`](architecture/dependency-and-batching.md) - Operation batching system
- [`architecture/algorithms-implementation.md`](architecture/algorithms-implementation.md) - Algorithm wrapper strategy

### Features
- [`ai/ai-interface-design.md`](ai/ai-interface-design.md) - Natural language control interface
- [`rendering/edge-styles-design.md`](rendering/edge-styles-design.md) - Edge styling system
- [`xr/xr-camera.md`](xr/xr-camera.md) - VR/AR camera design
- [`ui/properties-sidebar-design.md`](ui/properties-sidebar-design.md) - Properties panel design

### Future Work
- [`ai/ai-multi-turn.md`](ai/ai-multi-turn.md) - Multi-turn LLM conversations
- [`rendering/loading-optimization-plan.md`](rendering/loading-optimization-plan.md) - Bundle size reduction
- [`ui/run-algorithm-design.md`](ui/run-algorithm-design.md) - Algorithm execution UI
