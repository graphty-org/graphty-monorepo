# Troubleshooting

Each heading below is a symptom or the start of an error message.

## Layouts

### Positions have not changed right after `run()`

The simulations (`graphty-forceatlas2`, `graphty-fruchterman-reingold`, `graphty-spring-electrical`)
first decide whether to run on the GPU, and with the default `gpu: "auto"` that decision is
asynchronous. `run()` returns before any node has moved. Wait for `layoutstop` before you read
positions:

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

With `gpu: "off"` and `animate: false`, a simulation runs synchronously. Static layouts such as
`graphty-circular` always finish inside `run()`.

### Every node is in the same spot in a headless core

A headless core has a 1 x 1 pixel viewport, and a layout fits the graph into the viewport unless
you give it a box. Pass `boundingBox: { x1: 0, y1: 0, w: 800, h: 600 }` (any size you want).

### "animate needs a core that renders"

A tween (`animate: "end"`, or any truthy `animate` on a static layout) needs Cytoscape's animation
support, which a headless core has only when created with `styleEnabled: true`. Create the core
with `cytoscape({ headless: true, styleEnabled: true })`, or pass `animate: false`.

### `graphty-spring-electrical` emits `layouterror`

This layout has no CPU version. When no GPU is available it emits `layouterror` with "has no CPU
simulation and runs only on the GPU; no GPU ran because ..." and then `layoutstop`. The error is the
second argument of the handler: `layout.on("layouterror", (event, error) => ...)`. `layout.backend`
stays undefined, because nothing ran. Use
`graphty-forceatlas2` or `graphty-fruchterman-reingold` where there is no GPU.

## Algorithms

### "this algorithm reads no edge weights; remove the weight option"

You passed `weight` to an algorithm that ignores edge weights, such as
`graphtyBreadthFirstSearch`, `graphtyDegreeCentrality` or `graphtyBetweennessCentrality`. The
package throws instead of silently computing an unweighted answer. Remove the option.

### "... matches no node of the collection" or "the ... option is required"

A node option (`root`, `goal`, `source`, `sink`, `target`) was a selector or collection that
matched nothing, or it was missing. `graphtyDijkstra({ root: "#nope" })` throws "graphtyDijkstra:
root matches no node of the collection". Check the id, and check that the node is inside the
collection you called the method on: `cy.nodes("[weight > 1]").graphtyDijkstra(...)` sees only
those nodes.

### "a weight is negative; use graphtyBellmanFord"

`graphtyDijkstra`, `graphtyDijkstraAsync`, `graphtyAStar` and `graphtyBidirectionalDijkstra` take
weights of 0 or more. Call `graphtyBellmanFord` instead, and pass `directed: true` if the edges
are one-way: read undirected, a negative edge is a negative cycle.

### "takes one options object"

Cytoscape's built-ins take some arguments positionally, such as `kruskal(weightFn)`. Every graphty
method takes one options object: write `graphtyKruskalMST({ weight: weightFn })`.

### "unknown option ..."

You passed an option the method does not take, often a misspelling: `graphtyLouvain({ resoluton: 2 })`
throws "graphtyLouvain: unknown option resoluton; the options are directed, field, gpu, maxIterations,
resolution, tolerance, weight". The message lists the options the method takes; the
[algorithm reference](../reference/algorithms) describes each.

### "needs an undirected graph" or "needs a directed graph"

The algorithm is defined for one kind of graph only. `graphtyLouvain({ directed: true })` throws
"graphtyLouvain: needs an undirected graph; leave out directed: true". For components of a directed
graph, call `graphtyWeaklyConnectedComponents` or `graphtyStronglyConnectedComponents`.

### "runs on the CPU; call ...Async for the GPU" or "has no GPU implementation"

The plain methods (`graphtyPageRank`) are synchronous and always run on the CPU, so they reject
`gpu: "require"`. Call the `...Async` twin (`graphtyPageRankAsync`) and `await` it. Only the 17
methods in `ASYNC_ALGORITHM_NAMES` have a twin. The others, such as `graphtyDegrees`, cannot run on
the GPU, and their error says "has no GPU implementation": leave out `gpu`.

### `graphtyTopologicalSort` returns `null`

The graph has a cycle, so no order exists. The sort reads each edge from `source` to `target`.
To test for that kind of cycle first, call `graphtyHasCycle({ directed: true })`. Plain
`graphtyHasCycle()` treats the graph as undirected, so it returns `true` for a diamond (edges `a` to `b`, `a` to
`c`, `b` to `d`, `c` to `d`) even though the sort finds an order.

### `path()` throws "pass paths: true to walk shortest paths"

`graphtyAllPairsShortestPath({ paths: false })` keeps only the distances, so `distance()` works and
`path()` throws. Leave `paths` at its default, `true`, when you need the paths.

## Loading graphs

### "the core already has an element with id ..."

`graphtyGenerate`, `graphtyDataset` and `graphtyImport` refuse to add a node whose id is already in
the core, because Cytoscape would merge the two graphs. Nothing is added. Remove the old graph
first with `cy.elements().remove()`, or use a new core.

### `graphtyDataset` fails with "HTTP 404"

A name that is not in the [dataset list](../reference/graphs) is fetched from graphty.app, so a typo such as
`"karatee"` shows up as a network error: "fetching
https://graphty.app/data/graph-samples/v1/karatee.gsnp.gz failed: HTTP 404". Check the spelling.

### Script tag: `graphtyImport` or `graphtyDataset` rejects naming `dist/cdn/cytoscape-extensions.js`

The classic script `dist/cytoscape-extensions.bundle.js` loads the file formats and the datasets
from `dist/cdn/` next to itself, and finds that folder through its own `<script src>` URL. Loaded
any other way (inlined, injected without `src`, evaluated), it cannot, and those calls reject. Load
it with `<script src="...">`, or switch to the ES module build at
`https://cdn.jsdelivr.net/npm/@graphty/cytoscape-extensions/dist/cdn/cytoscape-extensions.js`. See
[Installation](./installation).

## GPU and backends

### The CPU ran when you expected the GPU

Every `...Async` result has `backend`, and so does a simulation layout once it starts. When
`backend.ran` is `"cpu"`, `backend.reason` says why. The
[table in the WebGPU guide](./webgpu#which-backend-ran) lists every reason with its cause and fix.
In Node the usual cause is the missing optional package: `npm install webgpu`.

### A console warning about a 5,000-node graph on the CPU

A graph of 5,000 nodes or more that runs on the CPU for a reason you can fix logs one warning:
"graphty: a 12,000-node graph ran on the CPU because ... To use the GPU: ...". Follow the fix it
names, or pass `gpu: "off"` to choose the CPU and silence it. Smaller graphs never warn.

### `gpu: "require"` throws

`gpu: "require"` turns "no GPU" into an error instead of a CPU run: an `...Async` method rejects
with `graphty: gpu: "require" but no usable WebGPU device: ...`, and a simulation emits
`layouterror`. The text after "but" is the same `reason` as above.

## TypeScript

Errors inside `@graphty/layout`'s typings, or "has no exported member 'LayoutAccelerator'", mean
your `moduleResolution` is `node16` or `nodenext`. Use `"moduleResolution": "bundler"`.

"Cannot find name 'AbortSignal'" or "'HTMLElement'" means your `lib` has no `DOM`. Add `"DOM"`,
even in a Node project: Cytoscape's typings and the file-format typings need it.

Errors about Cytoscape's types with a Cytoscape older than 3.31.0: the package extends the typings
Cytoscape ships with itself, and 3.31.0 is the first release that has them. Upgrade Cytoscape.

## See also

- [WebGPU](./webgpu) -- how the backend is chosen and how to require or refuse the GPU.
- [Limits](./limits) -- what the package will not do.
