# Graphty Monorepo

[![CI](https://github.com/graphty-org/graphty-monorepo/actions/workflows/ci.yml/badge.svg)](https://github.com/graphty-org/graphty-monorepo/actions/workflows/ci.yml)
[![Coverage Status](https://coveralls.io/repos/github/graphty-org/graphty-monorepo/badge.svg?branch=master)](https://coveralls.io/github/graphty-org/graphty-monorepo?branch=master)

A modular graph visualization ecosystem consisting of multiple TypeScript packages. This monorepo contains libraries for graph algorithms, layout computation, and interactive 2D/3D visualization.

## Packages

### @graphty/graphty

React application providing a user-friendly interface for graph visualization and exploration. Built on top of the `graphty-element` web component, it offers interactive graph visualization with multiple layout algorithms, rich styling options, and 2D/3D visualization modes. This package is private and not published to npm.

[View package](./graphty)

---

### @graphty/graphty-element

[![npm version](https://img.shields.io/npm/v/@graphty/graphty-element.svg)](https://www.npmjs.com/package/@graphty/graphty-element)
[![Documentation](https://img.shields.io/badge/docs-vitepress-blue)](https://graphty-org.github.io/docs/graphty/)
[![Storybook](https://img.shields.io/badge/storybook-examples-ff4785)](https://graphty-org.github.io/storybook/element/)

A Web Component for 3D/2D graph visualization built with Lit and Babylon.js. Provides interactive graph visualizations with multiple layout algorithms, rich styling options, and support for large datasets through mesh instancing and GPU acceleration.

[View package](./graphty-element)

---

### @graphty/layout

[![npm version](https://img.shields.io/npm/v/@graphty/layout.svg)](https://www.npmjs.com/package/@graphty/layout)
[![Documentation](https://img.shields.io/badge/docs-vitepress-blue)](https://graphty-org.github.io/docs/layout/)
[![Examples](https://img.shields.io/badge/demo-github%20pages-blue)](https://graphty-org.github.io/layout/examples/index.html)

TypeScript library for positioning nodes in graphs. A port of layout algorithms from Python's NetworkX library, supporting force-directed layouts (Spring, ForceAtlas2, Kamada-Kawai), geometric layouts (Circular, Shell, Spiral), and specialized layouts (Bipartite, Multipartite, Planar).

[View package](./layout)

---

### @graphty/algorithms

[![npm version](https://img.shields.io/npm/v/@graphty/algorithms.svg)](https://www.npmjs.com/package/@graphty/algorithms)
[![Documentation](https://img.shields.io/badge/docs-vitepress-blue)](https://graphty-org.github.io/docs/algorithms/)
[![Examples](https://img.shields.io/badge/demo-github%20pages-blue)](https://graphty-org.github.io/algorithms/)

Comprehensive TypeScript graph algorithms library with 98 algorithms optimized for browser environments. Includes traversal, shortest paths, centrality measures, community detection, clustering, network flow, matching, and link prediction algorithms.

[View package](./algorithms)

## License

MIT
