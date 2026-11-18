# Large Graphs

By default graphty-element draws every node and edge as an object of its own. That is the most
flexible way to draw, and it is slow and heavy past a few tens of thousands of nodes. The
**batched render path** draws every node that shares a look in one draw call, and reads plain
edge lines straight from a table on the graphics card, so a graph of 100,000 nodes and 1,000,000
edges loads and moves far faster and uses far less memory. The picture stays the same.

## Turning it on

Set `render-path="batched"` as an attribute, or `renderPath = "batched"` as a property:

```html
<graphty-element render-path="batched" view-mode="2d" layout="random"></graphty-element>
<script type="module">
    import "@graphty/graphty-element";
    const graph = document.querySelector("graphty-element");
    await graph.session.data.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
    await graph.session.data.addEdges([
        { src: "a", dst: "b" },
        { src: "b", dst: "c" },
    ]);
    console.log(graph.rowCounts); // { batchedNodes: 3, objectNodes: 0, pulledEdges: 2, objectEdges: 0 }
</script>
```

The path can be changed at any time; `"objects"` is the default. Everything else -- styles,
selection, hover, dragging, layouts, algorithms, events, undo -- works the same on both paths.

## What it covers

`rowCounts` tells you how each node and edge is being drawn: `batchedNodes` and `pulledEdges`
are on the fast path, `objectNodes` and `objectEdges` are drawn as objects of their own.

A **node** is drawn in a batch when its style sets only its shape (type, size, detail, z order),
its color, opacity, gradient or picture, its wireframe, flat or unlit effect, whether it is
visible, and its label or tooltip. A node with anything else, such as a border, an outline or a
3D model, is drawn as an object, and the rest of the graph stays batched.

An **edge** is read from the card's table when it is a plain solid line between two node centers:
straight in 2D, straight or curved in 3D, with no arrowhead, dash, label or band, and, if it is
animated, straight and opaque. Any other edge is drawn as an object. An edge that ends at a group's
outline, or at a 2D node drawn behind the edges, is drawn as an object too.

So for the most speed on a big graph, keep the styles of most nodes and edges plain, and give the
extra looks (borders, arrowheads, dashes, edge labels) to the few rows that need them.

## Loading more than 100,000 nodes

A load past 100,000 nodes or 1,000,000 edges is refused with `E_TOO_LARGE`. On the batched path
you can raise either number with `limits` (experimental). Set it before you load:

```js
const graph = document.querySelector("graphty-element");
graph.renderPath = "batched";
graph.limits = { renderCeiling: 1_000_000, edgesDrawn: 2_000_000 };
console.log(graph.session.capabilities.limits.renderCeiling); // 1000000
```

On `"objects"` the `limits` are ignored and the element fires `limits-warning` with the code
`W_LIMITS_IGNORED`. See [Renderer](./renderer.md#loading-past-the-size-caps) for the caps on
how many object rows a batched graph may hold.

## Loading the fastest way

If your graph is already arrays (edge endpoints as row numbers), hand them over with
`session.data.importColumns` instead of building one record per node and edge. It makes the same
graph as `addNodes` and `addEdges`, in a fraction of the time:

```js
await graph.session.data.importColumns({
    sources: new Uint32Array([0, 1, 2]),
    targets: new Uint32Array([1, 2, 0]),
    nodeCount: 3,
});
```

## Faster frames with many edges

With a million edges, most of each frame is smoothing the lines. `antialias="false"` turns
smoothing off, for harder edges and faster frames. `antialias="shader"` costs about as little and
keeps plain straight lines smooth, though nodes stay hard-edged; see
[Renderer](./renderer.md#smoothing-antialias).

```html
<graphty-element render-path="batched" antialias="false"></graphty-element>
```
