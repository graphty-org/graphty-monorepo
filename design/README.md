# Design Documents

This directory contains design documents, implementation plans, research, and code reviews for the Graphty project.

## Directory Structure

| Directory                              | Description                                                                                                                                                                        |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`ai/`](ai/)                           | AI and LLM integration - natural language control, tool calling, schema discovery                                                                                                  |
| [`algorithms/`](algorithms/)           | Ports of individual algorithms onto the indexed graph-format snapshot (Floyd-Warshall, label propagation), anomaly detection                                                       |
| [`algorithms-pkg/`](algorithms-pkg/)   | @graphty/algorithms package - graph algorithms, optimizations, benchmarks                                                                                                          |
| [`apps/`](apps/)                       | Desktop and mobile apps - whether to ship native shells around the graphty app, and the web view probe                                                                             |
| [`architecture/`](architecture/)       | Core architecture - state management, async patterns, RxJS, dependency batching                                                                                                    |
| [`ci/`](ci/)                           | CI/CD and landing: how changes land (`golden-local.md`) and the release train (`ci-cd-plan.md`, whose merge queue part is superseded)                                              |
| [`code-reviews/`](code-reviews/)       | Code review findings and implementation plans (prefixed by package name)                                                                                                           |
| [`compact-mantine/`](compact-mantine/) | @graphty/compact-mantine - the shared compact Mantine theme: design, refactor, code reviews                                                                                        |
| [`data/`](data/)                       | Data handling - formats, loading, sources, validation                                                                                                                              |
| [`decisions/`](decisions/)             | Decision records: one decision per file, never edited after it lands                                                                                                               |
| [`designloom/`](designloom/)           | The UI requirements base - personas, workflows, views, components, capabilities, interactions, tokens (7 subdirectories)                                                           |
| [`documents/`](documents/)             | The graphty document formats, version 1: the container file, style, sources, recipe, notes and assets, with their JSON schemas                                                     |
| [`edges/`](edges/)                     | graphty-element edge drawing: sharp corners on bent and curved edges                                                                                                               |
| [`element-api/`](element-api/)         | graphty-element's public API - the design, the 2.0 migration, the documentation plan                                                                                               |
| [`extensions/`](extensions/)           | graphty-element extension contracts: one specification per extension point (algorithm, layout, camera, file format, ...) with its types                                            |
| [`githerd/`](githerd/)                 | githerd (retired 2026-10-18, superseded by ci/golden-local.md) - the daemon, MCP tools and headless runs: design and plan                                                          |
| [`graph-format/`](graph-format/)       | The shared frozen CSR graph format: design, landing status, conformance record                                                                                                     |
| [`graph-io/`](graph-io/)               | @graphty/graph-io - style import, network sources, the agent reference                                                                                                             |
| [`graph-samples/`](graph-samples/)     | @graphty/graph-samples - the generators and datasets package design                                                                                                                |
| [`graphty-element/`](graphty-element/) | graphty-element - extension points, the agent reference, testing blind spots                                                                                                       |
| [`infra/`](infra/)                     | Hosted services: moving the Cloudflare services to AWS                                                                                                                             |
| [`integrations/`](integrations/)       | Third-party integrations: the Cytoscape.js adapter and the size of cytoscape-extensions                                                                                            |
| [`layout/`](layout/)                   | graphty-element layouts: the location map layout (nodes on a flat map or a globe)                                                                                                  |
| [`layout-pkg/`](layout-pkg/)           | @graphty/layout package - layout algorithm research and implementation                                                                                                             |
| [`monorepo/`](monorepo/)               | Monorepo infrastructure - Nx, releases, CI/CD, ESLint configuration                                                                                                                |
| [`notes/`](notes/)                     | Notes in graphty-element: design, plan, decisions                                                                                                                                  |
| [`positions/`](positions/)             | One file-positions mechanism for graph-io and graphty-element (stored node coordinates)                                                                                            |
| [`remote-logger/`](remote-logger/)     | @graphty/remote-logger - the package, its MCP server, code reviews                                                                                                                 |
| [`rendering/`](rendering/)             | Visual rendering - edges, lines, cameras, styles, screen capture                                                                                                                   |
| [`sets/`](sets/)                       | Sets in graphty-element: design, plan, undo integration                                                                                                                            |
| [`sonarqube/`](sonarqube/)             | The SonarQube server: design, settings, backlog                                                                                                                                    |
| [`testing/`](testing/)                 | Testing strategies - Playwright, profiling, logging, documentation                                                                                                                 |
| [`ui/`](ui/)                           | React application UI - sidebars, modals, theming, Mantine components, mockups                                                                                                      |
| [`undo/`](undo/)                       | Undo and history: design, plan and the inventories of what can change                                                                                                              |
| [`visual-testing/`](visual-testing/)   | Visual review of Storybook screenshots (visual-review): design, plan, research                                                                                                     |
| [`webgpu/`](webgpu/)                   | WebGPU-accelerated graph algorithms and layouts: the accepted design, what later decisions superseded in it, the P0-P3 contract and the phase plans, the monorepo integration plan |
| [`work-protection/`](work-protection/) | Work protection in graphty-element: autosave and recovery                                                                                                                          |
| [`working-graph/`](working-graph/)     | The working graph: one view of what is shown, read by every reader                                                                                                                 |
| [`xr/`](xr/)                           | Extended reality - VR, AR, WebXR cameras and controllers                                                                                                                           |

## Quick Reference

### By Task

| I want to...                     | Look in...                              |
| -------------------------------- | --------------------------------------- |
| Add AI/LLM features              | `ai/`                                   |
| Write a graphty-element plugin   | `extensions/`                           |
| Change a file format or importer | `graph-io/`, `documents/`, `positions/` |
| Work on graph algorithms         | `algorithms-pkg/`                       |
| Understand async/state patterns  | `architecture/`                         |
| Review past code reviews         | `code-reviews/`                         |
| Add data sources or formats      | `data/`                                 |
| Work on layout algorithms        | `layout-pkg/`                           |
| Update build/release process     | `ci/`, `monorepo/`                      |
| Change edge/node rendering       | `rendering/`                            |
| Improve test infrastructure      | `testing/`                              |
| Build React UI components        | `ui/`                                   |
| Add VR/AR support                | `xr/`                                   |

### By Package

| Package                          | Primary Directories                                                                                     |
| -------------------------------- | ------------------------------------------------------------------------------------------------------- |
| @graphty/algorithms              | `algorithms-pkg/`, `algorithms/`                                                                        |
| @graphty/graph-format            | `graph-format/`                                                                                         |
| @graphty/graph-io                | `graph-io/`, `positions/`                                                                               |
| @graphty/graph-samples           | `graph-samples/`                                                                                        |
| @graphty/webgpu-graph-algorithms | `webgpu/`                                                                                               |
| @graphty/layout                  | `layout-pkg/`                                                                                           |
| @graphty/graphty-element         | `graphty-element/`, `extensions/`, `element-api/`, `ai/`, `architecture/`, `data/`, `rendering/`, `xr/` |
| @graphty/graphty (React app)     | `ui/`                                                                                                   |
| Monorepo (root)                  | `ci/`, `monorepo/`, `testing/`                                                                          |

## Document Types

Documents generally follow these patterns:

- **`*-design.md`** - Feature specifications and architecture decisions
- **`*-implementation-plan.md`** - Step-by-step execution plans
- **`*-research.md`** - Background research and comparisons
- **`*-guide.md`** - How-to documentation
- **`code-review-*.md`** - Code review findings (in `code-reviews/`)

## Key Documents

### Getting Started

- [`ci/channels-pipeline.md`](ci/channels-pipeline.md) - How a change ships: pull requests, canary, nightly, production
- [`graph-format/graph-format-design.md`](graph-format/graph-format-design.md) - The shared graph data format every package reads
- [`extensions/README.md`](extensions/README.md) - graphty-element's extension contracts
- [`monorepo/monorepo-design.md`](monorepo/monorepo-design.md) - Historical: the research that chose Nx for the monorepo
- [`monorepo/nx-configuration-guide.md`](monorepo/nx-configuration-guide.md) - Nx setup and configuration

### Architecture

- [`architecture/state-management.md`](architecture/state-management.md) - State management approach
- [`architecture/dependency-and-batching.md`](architecture/dependency-and-batching.md) - Operation batching system
- [`architecture/algorithms-implementation.md`](architecture/algorithms-implementation.md) - Historical: the first plan for graphty-element's algorithm wrappers

### Features

- [`ai/ai-interface-design.md`](ai/ai-interface-design.md) - Natural language control interface
- [`rendering/edge-styles-design.md`](rendering/edge-styles-design.md) - Edge styling system
- [`xr/xr-camera.md`](xr/xr-camera.md) - VR/AR camera design
- [`ui/properties-sidebar-design.md`](ui/properties-sidebar-design.md) - Properties panel design
- [`ui/framework/`](ui/framework/README.md) - The graphty app design framework: objects, principles, interaction patterns, the element contract and the one-way doors every screen is designed against
- [`ui/object-first-ux/`](ui/object-first-ux/README.md) - An object-first, Figma-style exploration of the app: analysis, proposal, critique rounds and HTML mocks with screenshots (`mocks/`)

### Future Work

- [`ai/ai-multi-turn.md`](ai/ai-multi-turn.md) - Multi-turn LLM conversations
- [`rendering/loading-optimization-plan.md`](rendering/loading-optimization-plan.md) - Bundle size reduction
- [`ui/run-algorithm-design.md`](ui/run-algorithm-design.md) - Algorithm execution UI
