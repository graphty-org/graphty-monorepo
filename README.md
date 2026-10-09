# Graphty Monorepo

[![CI](https://github.com/graphty-org/graphty-monorepo/actions/workflows/ci.yml/badge.svg)](https://github.com/graphty-org/graphty-monorepo/actions/workflows/ci.yml)
[![Coverage Status](https://coveralls.io/repos/github/graphty-org/graphty-monorepo/badge.svg?branch=master)](https://coveralls.io/github/graphty-org/graphty-monorepo?branch=master)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](#license)
[![Documentation](https://img.shields.io/badge/docs-graphty.app-blue)](https://graphty.app/docs/)

A modular graph visualization ecosystem in TypeScript: interactive 2D and 3D graph visualization, graph algorithms,
layouts, file formats and sample graphs, each in its own package that you can install on its own.

<h3 align="center"><a href="https://graphty.app">Try the live demo at graphty.app</a></h3>

## Packages

### Visualization

#### graphty app (@graphty/graphty)

[![Demo](https://img.shields.io/badge/demo-graphty.app-blue)](https://graphty.app)
[![Storybook](https://img.shields.io/badge/storybook-examples-ff4785)](https://graphty.app/storybook/app/)

The graph explorer at [graphty.app](https://graphty.app): load a graph, lay it out, run algorithms and style it in 2D
or 3D, in the browser, built on graphty-element (not published to npm). [View package](./graphty)

#### @graphty/graphty-element

[![npm version](https://img.shields.io/npm/v/@graphty/graphty-element.svg)](https://www.npmjs.com/package/@graphty/graphty-element)
[![Documentation](https://img.shields.io/badge/docs-vitepress-blue)](https://graphty.app/docs/graphty-element/)
[![Storybook](https://img.shields.io/badge/storybook-examples-ff4785)](https://graphty.app/storybook/graphty-element/)

A web component (`<graphty-element>`) that draws an interactive 2D or 3D graph, with layouts, algorithms, styling and
optional WebGPU acceleration built in. [View package](./graphty-element)

#### @graphty/cytoscape-extensions

[![npm version](https://img.shields.io/npm/v/@graphty/cytoscape-extensions.svg)](https://www.npmjs.com/package/@graphty/cytoscape-extensions)
[![Documentation](https://img.shields.io/badge/docs-vitepress-blue)](https://graphty.app/docs/cytoscape-extensions/)
[![Storybook](https://img.shields.io/badge/storybook-demo-ff4785)](https://graphty.app/storybook/cytoscape-extensions/)

Every graphty layout and algorithm, plus graph generators, sample datasets and file import and export, as
[Cytoscape.js](https://js.cytoscape.org/) extensions registered with one call. [View package](./cytoscape-extensions)

### Graph computation

#### @graphty/algorithms

[![npm version](https://img.shields.io/npm/v/@graphty/algorithms.svg)](https://www.npmjs.com/package/@graphty/algorithms)
[![Documentation](https://img.shields.io/badge/docs-vitepress-blue)](https://graphty.app/docs/algorithms/)
[![Storybook](https://img.shields.io/badge/storybook-demos-ff4785)](https://graphty.app/storybook/algorithms/)

60+ graph algorithms: traversal, shortest paths, centrality, community detection, clustering, network flow, matching
and link prediction. [View package](./algorithms)

#### @graphty/layout

[![npm version](https://img.shields.io/npm/v/@graphty/layout.svg)](https://www.npmjs.com/package/@graphty/layout)
[![Documentation](https://img.shields.io/badge/docs-vitepress-blue)](https://graphty.app/docs/layout/api/generated/)
[![Storybook](https://img.shields.io/badge/storybook-demos-ff4785)](https://graphty.app/storybook/layout/)

2D and 3D graph layouts ported from NetworkX (force-directed, circular, shell, spiral, bipartite, planar and more),
plus steppable ForceAtlas2 and Fruchterman-Reingold simulations. [View package](./layout)

#### @graphty/webgpu-graph-algorithms

[![npm version](https://img.shields.io/npm/v/@graphty/webgpu-graph-algorithms.svg)](https://www.npmjs.com/package/@graphty/webgpu-graph-algorithms)

Graph algorithms and force-directed layouts on the GPU through WebGPU, in browsers and in Node.
[View package](./webgpu-graph-algorithms)

### Graph data

#### @graphty/graph-format

[![npm version](https://img.shields.io/npm/v/@graphty/graph-format.svg)](https://www.npmjs.com/package/@graphty/graph-format)

The compact, immutable graph snapshot (typed arrays, node ids, attribute columns) that every graphty package reads and
writes; zero dependencies. [View package](./graph-format)

#### @graphty/graph-io

[![npm version](https://img.shields.io/npm/v/@graphty/graph-io.svg)](https://www.npmjs.com/package/@graphty/graph-io)
[![Documentation](https://img.shields.io/badge/docs-vitepress-blue)](https://graphty.app/docs/graph-io/)

Read and write 13 graph file formats (JSON, GraphML, GEXF, CSV, GML, DOT, Pajek, Neo4j CSV, XGMML, CX2, CX, OBO and
Cytoscape sessions). [View package](./graph-io)

#### @graphty/graph-samples

[![npm version](https://img.shields.io/npm/v/@graphty/graph-samples.svg)](https://www.npmjs.com/package/@graphty/graph-samples)

Seeded random-graph generators that give the same graph on every platform, and classic sample datasets (karate club,
Les Miserables, college football and more) with their ground truth. [View package](./graph-samples)

### User interface

#### @graphty/compact-mantine

[![npm version](https://img.shields.io/npm/v/@graphty/compact-mantine.svg)](https://www.npmjs.com/package/@graphty/compact-mantine)
[![Storybook](https://img.shields.io/badge/storybook-examples-ff4785)](https://graphty.app/storybook/compact-mantine/)

A [Mantine](https://mantine.dev/) theme and components for dense, compact interfaces. [View package](./compact-mantine)

## Tools

Developer tools, useful outside graphty too.

#### @graphty/visual-review

[![npm version](https://img.shields.io/npm/v/@graphty/visual-review.svg)](https://www.npmjs.com/package/@graphty/visual-review)
[![Documentation](https://img.shields.io/badge/docs-vitepress-blue)](https://graphty.app/docs/visual-review/)

Visual review for any Storybook with nothing hosted: screenshots in GitHub Actions, baselines in git, accept or reject
each change in a page on your own machine. [View package](./visual-review)

#### @graphty/remote-logger

[![npm version](https://img.shields.io/npm/v/@graphty/remote-logger.svg)](https://www.npmjs.com/package/@graphty/remote-logger)

Send a browser's console logs to a server in your terminal, for debugging a page remotely.
[View package](./remote-logger)

## License

MIT
