# Limits

Some layouts refuse some graphs and throw from `run()`. Catch the error and pick another layout:

```js
import cytoscape from "cytoscape";
import graphtyCytoscape from "@graphty/cytoscape-extensions";

cytoscape.use(graphtyCytoscape);

const cy = cytoscape({ headless: true });
await cy.graphtyGenerate("complete", { n: 5 });

const boundingBox = { x1: 0, y1: 0, w: 600, h: 400 };
try {
    cy.layout({ name: "graphty-planar", boundingBox }).run();
} catch (err) {
    // The complete graph on 5 nodes is not planar: "G is not planar."
    console.log(err.message);
    cy.layout({ name: "graphty-kamada-kawai", boundingBox }).run();
}
```

## Graphs a layout refuses

- `graphty-planar` throws `G is not planar.` on a graph that is not planar.
- `graphty-bfs` throws on a disconnected graph, because the walk from `root` misses some nodes.
- `graphty-spring-electrical` runs only on the GPU, and refuses in two ways. When the package
  knows before running that no GPU will be used (`gpu: "off"`, `accelerator: null`, or a browser
  with no `navigator.gpu`), `run()` throws. When it has to probe for a GPU and finds none, it
  emits `layouterror` with the reason, then `layoutstop`. Either way no node moves and
  `layout.backend` stays undefined. Handle both:

```js
const layout = cy.layout({ name: "graphty-spring-electrical" });
layout.on("layouterror", (event, err) => console.log(err.message));
try {
    layout.run();
} catch (err) {
    console.log(err.message);
}
```

[Layouts](./layouts#events) gives the exact error of each one and says which arrive as `layouterror`.

## Memory on large graphs

`graphty-kamada-kawai` keeps one distance for every pair of nodes, so memory grows with the
square of the node count: 10,000 nodes need about 800 MB. Use a force layout such as
`graphty-forceatlas2` above a few thousand nodes.

`graphtyAllPairsShortestPath` stores 12 bytes per pair with the default `paths: true` (8 for the
distance, 4 for the predecessor), 8 with `paths: false`. It throws a `RangeError` on a graph of
more than 5,792 nodes unless you pass a larger `maxNodes`. At 6,000 nodes the result is about
432 MB.

## Positions are 2D

Every layout writes x and y only. `dim: 3` runs the layout in three dimensions and drops z.

## Compound parents

A layout positions the leaf nodes only. Cytoscape places and sizes each compound parent from its
children.

## Loading a graph whose node ids are taken

`cy.graphtyGenerate()`, `cy.graphtyDataset()` and `cy.graphtyImport()` add nothing and throw when the
core already holds one of the new graph's node ids. Call `cy.elements().remove()` first. See
[Direction and existing elements](./graphs-in-and-out#direction-and-existing-elements).

## Layout weights are field names

A layout's `weight` option is the name of an edge data field, such as `weight: "w"`. Its
TypeScript type accepts only a string. Algorithms also accept a function of the edge; for a
layout, write the computed value into a data field first.

## GPU results are single precision

A result computed on the GPU can differ from the CPU result in the last digits. Label
propagation can break ties differently. The [WebGPU](./webgpu) page lists the tolerances.

## The script-tag build loads everything

`dist/cytoscape-extensions.bundle.js` is one file that the browser downloads and parses in full at
start: about 239 KB gzipped. The ES module build loads about 114 KB gzipped at start and fetches
the WebGPU code, generators, datasets and file formats only when you first use them.
