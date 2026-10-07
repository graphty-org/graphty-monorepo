# Troubleshooting

Search this page for the first words of your error message.

## Layouts

### Positions have not changed right after `run()`

With the default `gpu: "auto"`, a simulation layout first decides asynchronously whether to run on
the GPU, so `run()` returns before any node has moved. Wait for `layoutstop`:

```js
import cytoscape from "cytoscape";
import graphtyCytoscape from "@graphty/cytoscape-extensions";

cytoscape.use(graphtyCytoscape);

const cy = cytoscape({ headless: true });
await cy.graphtyDataset("karate");

const layout = cy.layout({
    name: "graphty-forceatlas2",
    boundingBox: { x1: 0, y1: 0, w: 800, h: 600 },
});
// subscribe before run(), so a fast finish is not missed
const stopped = layout.promiseOn("layoutstop");
layout.run();
await stopped;

console.log(cy.$id("0").position(), layout.backend.ran);
```

With `gpu: "off"` and `animate: false`, a simulation runs synchronously, as static layouts such as
`graphty-circular` always do.

### Every node is in the same spot in a headless core

A headless core has a 1 x 1 pixel viewport, and a layout fits the graph into it. Pass a
`boundingBox`, such as `{ x1: 0, y1: 0, w: 800, h: 600 }`.

### "animate needs a core that renders"

A tween (`animate: "end"`, or any truthy `animate` on a static layout) needs Cytoscape's animation
support, which a headless core has only with `styleEnabled: true`. Create it with
`cytoscape({ headless: true, styleEnabled: true })`, or pass `animate: false`. Such a core keeps a
timer running, so in Node call `cy.destroy()` when done or the process never exits.

### `graphty-spring-electrical` emits `layouterror`

This layout has no CPU version. Without a usable GPU (or with `gpu: "off"`) it emits `layouterror`
(`graphty-spring-electrical has no CPU simulation`), then `layoutstop`, and no node moves. Handle it
as [Layouts](./layouts#events) shows, or use `graphty-forceatlas2`.

## Algorithms

### "this algorithm reads no edge weights; remove the weight option"

You passed `weight` to an algorithm that ignores edge weights, such as
`graphtyBreadthFirstSearch` or `graphtyDegreeCentrality`. Remove the option.

### "... matches no node of the collection" or "the ... option is required"

A node option such as `root`, `target`, `clusters` or `seeds` matched nothing, or was missing.
Check the id, and check that the node is inside the collection you called the method on:
`cy.nodes("[weight > 1]").graphtyDijkstra(...)` sees only those nodes.

### "a weight is negative; use graphtyBellmanFord"

`graphtyDijkstra`, `graphtyDijkstraAsync`, `graphtyAStar` and `graphtyBidirectionalDijkstra` take
weights of 0 or more. Call `graphtyBellmanFord` instead, and pass `directed: true` if the edges
are one-way: read undirected, a negative edge is a negative cycle.

### "takes one options object"

Cytoscape's built-ins take some arguments positionally, such as `kruskal(weightFn)`. Every graphty
method takes one options object: write `graphtyKruskalMST({ weight: weightFn })`.

### "unknown option ..."

You passed an option the method does not take, often a misspelling such as `resoluton`. The message
lists the options it does take; the [algorithm reference](../reference/algorithms) describes each.

### "needs an undirected graph" or "needs a directed graph"

Add or remove `directed: true` as the message says. For components of a directed graph, call
`graphtyWeaklyConnectedComponents` or `graphtyStronglyConnectedComponents`.

### "runs on the CPU; call ...Async for the GPU" or "has no GPU implementation"

Plain methods such as `graphtyPageRank` always run on the CPU, so they reject `gpu: "require"`.
`await` the `...Async` twin (`graphtyPageRankAsync`) instead. Only the methods in `ASYNC_ALGORITHM_NAMES`
have one; for the others ("has no GPU implementation"), leave out `gpu`.

### `graphtyTopologicalSort` returns `null`

The graph has a cycle with edges read from `source` to `target`, so no order exists. Test first with
`graphtyHasCycle({ directed: true })`; plain `graphtyHasCycle()` reads edges as undirected and finds
cycles the sort does not care about.

### `path()` throws "pass paths: true to walk shortest paths"

`graphtyAllPairsShortestPath({ paths: false })` keeps only distances. Leave `paths` at its default,
`true`, to call `path()`.

## Loading graphs

### A top-level `await` never finishes

In a Vite 6 or 7 production build, a top-level `await` of `graphtyGenerate`, `graphtyDataset`,
`graphtyImport`, `graphtyExport`, an `...Async` method or (with WebGPU) a simulation layout never
finishes: these calls download part of the package on first use, and that build holds the download
until your module finishes. After 5 seconds the console shows `graphty: graphtyDataset has waited
5 s for part of @graphty/cytoscape-extensions to load...`. Move the code into an `async` function:

```js
async function main() {
    await cy.graphtyDataset("karate");
    cy.layout({ name: "graphty-circular" }).run();
}
main();
```

The Vite dev server, Vite 8, Node and the CDN build are not affected.

### "the core already has an element with id ..."

`graphtyGenerate`, `graphtyDataset` and `graphtyImport` refuse to add a node whose id is already in
the core. The promise rejects with an `IdTakenError` (`code` `"E_ID_TAKEN"`, `id` the clashing id)
and nothing is added. Remove the old graph with `cy.elements().remove()`, or use a new core.

### `graphtyDataset` fails with "unknown dataset" or "HTTP 404"

A name not in the [dataset list](../reference/graphs#datasets) rejects with a `RangeError` naming
the closest match. With your own `baseUrl`, any other name is fetched from
`<baseUrl>/<name>.gsnp.gz` and fails with HTTP 404 if your server lacks it.

### Script tag: `graphtyImport` or `graphtyDataset` rejects naming `dist/cdn/cytoscape-extensions.js`

`dist/cytoscape-extensions.bundle.js` finds `dist/cdn/` through its own `<script src>` URL, so it
cannot be inlined. Load it with `<script src>`, as [Installation](./installation#script-tag) shows.

## GPU and backends

### The CPU ran when you expected the GPU

Every `...Async` result and every started simulation layout has `backend`. When `backend.ran` is
`"cpu"`, `backend.reason` says why; the
[WebGPU guide](./webgpu#which-backend-ran) lists every reason and its fix. In Node the usual cause
is the missing optional package: `npm install webgpu`. Graphs of 5,000 nodes or more also log a
console warning when the cause is one you can fix; see [Console messages](./webgpu#console-messages).

### "gpu must be ..." or `gpu: "require"` throws

`gpu` takes only `"auto"`, `"off"` or `"require"`. With `"require"` and no usable device, an
`...Async` method rejects with `graphty: gpu: "require" but no usable WebGPU device: ` and the same
reason, and a simulation emits `layouterror`. See [Requiring or refusing the GPU](./webgpu#requiring-or-refusing-the-gpu).

## TypeScript

Errors inside `@graphty/layout`'s typings mean your `moduleResolution` is `node16` or `nodenext`:
use `"bundler"`. "Cannot find name 'HTMLElement'" means your `lib` lacks `"DOM"`, which you need
even in Node. Errors in Cytoscape's types mean a Cytoscape older than 3.31.0. See
[Installation](./installation#typescript).

## See also

- [WebGPU](./webgpu) -- how the backend is chosen and how to require or refuse the GPU.
- [Limits](./limits) -- what the package will not do.
