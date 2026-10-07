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

- `graphty-planar` throws `G is not planar.` for K5, K3,3 and a connected graph with more than
  3n - 6 distinct edges. Other non-planar graphs are drawn with crossing edges.
- `graphty-bfs` throws on a disconnected graph, because the walk from `root` misses some nodes.
- `graphty-spring-electrical` runs only on the GPU. With no GPU, the layout emits `layouterror`
  and then `layoutstop`, and no node moves. [Layouts](./layouts#events) shows how to handle it.

## Memory on large graphs

`graphty-kamada-kawai` keeps one distance for every pair of nodes, so memory grows with the
square of the node count: 10,000 nodes need about 800 MB. Use a force layout such as
`graphty-forceatlas2` above a few thousand nodes.

`graphtyAllPairsShortestPath` stores 12 bytes per pair with the default `paths: true` (8 for the
distance, 4 for the predecessor), 8 with `paths: false`. It throws a `RangeError` on a graph of
more than 5,792 nodes unless you pass a larger `maxNodes`. At 6,000 nodes the result is about
432 MB.

## Positions are 2D

Every layout writes x and y only. With `dim: 3`, graphty-circular, graphty-random,
graphty-kamada-kawai, graphty-arf and the three simulations place the nodes in three dimensions and
z is dropped, so the drawing is the 3D result seen from above. The other layouts ignore `dim`.

## Compound parents

A layout positions the leaf nodes only. Cytoscape places and sizes each compound parent from its
children.

## Loading a graph whose node ids are taken

`cy.graphtyGenerate()`, `cy.graphtyDataset()` and `cy.graphtyImport()` add nothing and reject when
the core already holds one of the new graph's node ids. Call `cy.elements().remove()` first. See
[Direction and existing elements](./graphs-in-and-out#direction-and-existing-elements).

## Layout `weight` is typed as a field name only

A layout's `weight` option takes an edge data field name, such as `weight: "w"`, or a function
of the edge, such as `weight: (edge) => edge.data("w")`. Both work at run time. The TypeScript
type accepts only the field name, so in TypeScript a function fails to type-check. Algorithm
options are typed for both.

## GPU results are single precision

A result computed on the GPU can differ from the CPU result in the last digits. Label
propagation can break ties differently. The [WebGPU](./webgpu) page lists the tolerances.

## The script-tag build loads most of the package at start

`dist/cytoscape-extensions.bundle.js` is about 249 KB gzipped, against about 114 KB at start for
the ES module build. See [Installation](./installation#script-tag).
