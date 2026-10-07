---
layout: home

hero:
    name: cytoscape-extensions
    text: Graph layouts and algorithms for Cytoscape.js
    tagline: 16 layouts, 63 algorithms, WebGPU acceleration, generators, datasets and file formats, added with one cytoscape.use() call
    actions:
        - theme: brand
          text: Get started
          link: ./guide/getting-started
        - theme: alt
          text: Demo
          link: https://graphty.app/storybook/cytoscape-extensions/?path=/story/gallery--layouts
        - theme: alt
          text: Reference
          link: ./reference/algorithms

features:
    - title: Getting started
      details: Install the package and draw a graph with a graphty layout and a PageRank result.
      link: ./guide/getting-started
      linkText: Start here
    - title: Installation
      details: npm with a bundler, ES modules from a CDN, a classic script tag, CommonJS or TypeScript.
      link: ./guide/installation
      linkText: Install
    - title: Layouts
      details: 16 layouts registered under names such as graphty-forceatlas2 and graphty-circular. Simulations such as ForceAtlas2 and static ones such as Kamada-Kawai and radial. Run them with cy.layout().
      link: ./guide/layouts
      linkText: Choose a layout
    - title: Algorithms
      details: 63 methods on every collection and on the core, from graphtyPageRank to graphtyLouvain and graphtyMaxFlow.
      link: ./guide/algorithms
      linkText: Run an algorithm
    - title: WebGPU
      details: 17 algorithms have an ...Async twin, such as graphtyPageRankAsync, that runs on the GPU when one is present and on the CPU when not.
      link: ./guide/webgpu
      linkText: Use the GPU
    - title: Graphs in and out
      details: Seeded generators, sample datasets, and import and export of GEXF, GraphML, GML, DOT, Pajek, CSV, JSON, Neo4j, XGMML and CX2. CX, OBO and Cytoscape session files import too.
      link: ./guide/graphs-in-and-out
      linkText: Load a graph
    - title: Recipes
      details: Color nodes by PageRank, size them by degree, find communities, highlight a shortest path.
      link: ./guide/recipes/color-by-pagerank
      linkText: See recipes
    - title: Reference
      details: Every layout option, algorithm option, result type, generator, dataset and file format.
      link: ./reference/layouts
      linkText: Look it up
---

## Size nodes by PageRank

This script loads the karate club sample graph, scores every node with PageRank and draws it with ForceAtlas2. Your page needs a `<div id="cy">` with a height.

```js
import cytoscape from "cytoscape";
import graphtyCytoscape from "@graphty/cytoscape-extensions";

cytoscape.use(graphtyCytoscape);

async function main() {
    const cy = cytoscape({
        container: document.getElementById("cy"),
        style: [
            {
                selector: "node[rank]",
                style: {
                    width: "mapData(rank, 0, 0.1, 10, 50)",
                    height: "mapData(rank, 0, 0.1, 10, 50)",
                },
            },
        ],
    });
    await cy.graphtyDataset("karate");
    cy.elements().graphtyPageRank({ field: "rank" });
    cy.layout({ name: "graphty-forceatlas2" }).run();
}

main();
```

`graphtyPageRank` writes each node's score to `data("rank")`, and the `mapData()` style turns scores from 0 to 0.1 into sizes from 10 to 50 pixels. The `node[rank]` selector applies the sizing only to nodes that have a score, so Cytoscape does not warn about nodes added before PageRank runs. The [getting started guide](./guide/getting-started) builds this into a full page.

## Status

`@graphty/cytoscape-extensions` has not had its first release yet. Until it does, `npm install` fetches `0.0.0-placeholder.0`, a package that holds only a README, so the imports on this page fail to resolve and the jsDelivr URLs return 404. The package names, URLs and install commands in these docs are the ones it will be released under.
