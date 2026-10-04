# @graphty/cytoscape-extensions

Graph layouts and graph algorithms for [Cytoscape.js](https://js.cytoscape.org/) 3.x, added with one
`cytoscape.use()` call: 16 layouts registered as `graphty-<name>` (ForceAtlas2, Fruchterman-Reingold, Kamada-Kawai,
radial, shell and more), 63 algorithm methods on every collection and on the core named `graphty<Name>` (PageRank,
betweenness, Louvain, Leiden, Dijkstra, max flow, link prediction and more), seeded graph generators, sample
datasets, and import and export of GraphML, GEXF, GML, DOT, Pajek, CSV, JSON, Neo4j and CX2 files. The force
simulations and 17 of the algorithms run on WebGPU when the browser or Node has a usable device, with nothing extra
to import.

The package is not on npm yet. The names and install commands below are the ones it will be published under.

- Documentation: [graphty.app/docs/cytoscape-extensions](https://graphty.app/docs/cytoscape-extensions/)
- Demo: [every layout and algorithm in a live graph](https://graphty.app/storybook/cytoscape-extensions/)

## Install

```sh
npm install cytoscape @graphty/cytoscape-extensions @graphty/algorithms @graphty/layout @graphty/graph-format
```

@graphty/algorithms, @graphty/layout and @graphty/graph-format are peer dependencies. Cytoscape.js 3.31.0 or later is
required.

## Quick start

```js
import cytoscape from "cytoscape";
import graphtyCytoscape from "@graphty/cytoscape-extensions";

cytoscape.use(graphtyCytoscape);

const cy = cytoscape({
    container: document.getElementById("cy"),
    style: [{ selector: "node", style: { width: "mapData(rank, 0, 0.035, 8, 48)" } }],
});

async function draw() {
    await cy.graphtyGenerate("barabasi-albert", { n: 300, m: 2, seed: 1 }); // or cy.add() your own elements
    cy.elements().graphtyPageRank({ field: "rank" }); // writes data("rank"), which the style maps to a width
    cy.layout({ name: "graphty-forceatlas2", animate: true }).run();
}

draw();
```

## Loading

- With npm and a bundler (Vite, webpack, esbuild, Rollup), import the package as above. It is ES modules only; the
  WebGPU code, the generators, each dataset and the file formats load on first use.
- With no build step, import the ES module build from a CDN:
  `https://cdn.jsdelivr.net/npm/@graphty/cytoscape-extensions/dist/cdn/cytoscape-extensions.js`.
- With a classic `<script src>` tag, load `dist/cytoscape-extensions.bundle.js` after Cytoscape. It registers
  itself, so there is no `use()` call.

[Installation](https://graphty.app/docs/cytoscape-extensions/guide/installation) covers each of these, CommonJS,
TypeScript and the supported versions.

## Documentation

- [Getting started](https://graphty.app/docs/cytoscape-extensions/guide/getting-started)
- [Layouts](https://graphty.app/docs/cytoscape-extensions/guide/layouts)
- [Algorithms](https://graphty.app/docs/cytoscape-extensions/guide/algorithms)
- [WebGPU](https://graphty.app/docs/cytoscape-extensions/guide/webgpu)
- [Graphs in and out](https://graphty.app/docs/cytoscape-extensions/guide/graphs-in-and-out)
- [Migrating from Cytoscape's built-ins](https://graphty.app/docs/cytoscape-extensions/guide/migrating-from-cytoscape)
- [Troubleshooting](https://graphty.app/docs/cytoscape-extensions/guide/troubleshooting)
- Reference: [layouts](https://graphty.app/docs/cytoscape-extensions/reference/layouts),
  [algorithms](https://graphty.app/docs/cytoscape-extensions/reference/algorithms),
  [generators, datasets and formats](https://graphty.app/docs/cytoscape-extensions/reference/graphs)

## License

MIT. The sample datasets are their authors' work under their own licenses, listed in the
[dataset reference](https://graphty.app/docs/cytoscape-extensions/reference/graphs#datasets).
