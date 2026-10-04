# Layouts

Every graphty layout is a normal Cytoscape layout. Register the package once with `cytoscape.use()`, then pass `"graphty-<name>"` to `cy.layout()` or `eles.layout()` and call `run()`.

This example places Zachary's karate club graph with Kamada-Kawai inside an 800 x 600 box and tweens the nodes there over 800 ms:

```js
import cytoscape from "cytoscape";
import graphtyCytoscape from "@graphty/cytoscape-extensions";

cytoscape.use(graphtyCytoscape);

const cy = cytoscape({ container: document.getElementById("cy") });

async function draw() {
    await cy.graphtyDataset("karate");
    cy.layout({
        name: "graphty-kamada-kawai",
        boundingBox: { x1: 0, y1: 0, w: 800, h: 600 },
        animate: "end",
        animationDuration: 800,
    }).run();
}
draw();
```

In a Vite production build, a top-level `await` on this method hangs the page with no error, so the example calls it inside an `async` function ([why](./getting-started)).

## Laying out part of the graph

`cy.layout()` lays out the whole graph. `eles.layout()` reads only the nodes and edges in the collection and leaves every other node where it is. A selector such as `cy.$(".group")` returns nodes only, so a layout run on it sees no edges and places the nodes as if they were unconnected. Add the edges among them when those edges should shape the result:

```js
import cytoscape from "cytoscape";
import graphtyCytoscape from "@graphty/cytoscape-extensions";

cytoscape.use(graphtyCytoscape);

const cy = cytoscape({ headless: true });
cy.add([
    { data: { id: "a" }, classes: "group" },
    { data: { id: "b" }, classes: "group" },
    { data: { id: "c" }, classes: "group" },
    { data: { id: "x" } },
    { data: { source: "a", target: "b" } },
    { data: { source: "b", target: "c" } },
    { data: { source: "c", target: "x" } },
]);

const group = cy.$(".group");
group
    .union(group.edgesWith(group))
    .layout({ name: "graphty-kamada-kawai", boundingBox: { x1: 0, y1: 0, w: 200, h: 200 } })
    .run();
console.log(cy.nodes().map((node) => node.position()));
```

It places `a`, `b` and `c` on a line, the chain their two edges form, and leaves `x` at 0, 0.

## The layouts

`LAYOUT_NAMES` lists all 16 names without the `graphty-` prefix:

```js
import { LAYOUT_NAMES } from "@graphty/cytoscape-extensions";

console.log(LAYOUT_NAMES.map((name) => `graphty-${name}`));
```

Start with `graphty-forceatlas2` for most networks. Use `graphty-bfs` or `graphty-radial` for trees and hierarchies, `graphty-bipartite` for a graph with two sides, and `graphty-circular` or `graphty-shell` for a small graph where every node must stay visible. Above a few thousand nodes, avoid `graphty-kamada-kawai`: it keeps a distance for every pair of nodes, and 10,000 nodes need about 800 MB.

A static layout computes the positions once, on the CPU, and then places the nodes. There are 13:

| Name                   | Places the nodes                                                          |
| ---------------------- | ------------------------------------------------------------------------- |
| `graphty-random`       | at random points in the box                                               |
| `graphty-circular`     | evenly on one circle                                                      |
| `graphty-spiral`       | along a spiral                                                            |
| `graphty-grid`         | in rows and columns                                                       |
| `graphty-spectral`     | so that tightly linked groups sit close together                          |
| `graphty-planar`       | with no two edges crossing (planar graphs only)                           |
| `graphty-arf`          | with linked nodes pulled together and the rest pushed apart               |
| `graphty-kamada-kawai` | so that drawn distances match shortest-path distances                     |
| `graphty-shell`        | on concentric circles, one per group in `nlist`                           |
| `graphty-multipartite` | in one column per layer, read from a node data field (default `"subset"`) |
| `graphty-bipartite`    | on two lines, the first given by `top`                                    |
| `graphty-bfs`          | in layers by distance from `root` (connected graphs only)                 |
| `graphty-radial`       | on rings by distance from `root`                                          |

A simulation steps a force model iteration by iteration, and can run on the GPU through WebGPU. There are 3:

| Name                           | Model                                                                             |
| ------------------------------ | --------------------------------------------------------------------------------- |
| `graphty-forceatlas2`          | ForceAtlas2, as in Gephi; 100 iterations at most by default (`maxIter`)           |
| `graphty-fruchterman-reingold` | Fruchterman-Reingold; 50 iterations by default (`iterations`)                     |
| `graphty-spring-electrical`    | springs on edges and charge between nodes; GPU only, it has no CPU implementation |

Each layout's own options, such as `columns` for the grid or `gravity` for ForceAtlas2, are listed with their defaults in the [layout reference](../reference/layouts). An option this page and the reference do not list goes to the matching @graphty/layout function unchanged. The exceptions are `scale` and `center`, which the package sets from `boundingBox`.

## Animating a simulation

With `animate: true` a simulation draws the graph after every frame, so you watch it settle. `refresh` sets how many iterations run between two frames. The `layoutstop` handler runs once the simulation settles, reaches its iteration cap or is stopped, and `layout.backend` then says whether it ran on the GPU or the CPU:

```js
import cytoscape from "cytoscape";
import graphtyCytoscape from "@graphty/cytoscape-extensions";

cytoscape.use(graphtyCytoscape);

const cy = cytoscape({ container: document.getElementById("cy") });

async function draw() {
    await cy.graphtyGenerate("barabasi-albert", { n: 300, m: 2, seed: 1 });
    const layout = cy.layout({
        name: "graphty-forceatlas2",
        animate: true,
        refresh: 5,
        maxIter: 400,
        seed: 42,
    });
    layout.on("layoutstop", () => {
        const { ran, reason } = layout.backend;
        console.log(`ForceAtlas2 ran on the ${ran}`, reason ?? "");
    });
    layout.run();
}
draw();
```

Call `layout.stop()` to end a running simulation early. It finishes the frame in progress, leaves the nodes where that frame put them and emits `layoutstop`. To continue from there, run the layout again with `randomize: false`. It starts from the current positions, read at the scale the last run of that layout on this core drew them, so the first frame carries on where the last one stopped.

## Synchronous and asynchronous runs

Static layouts finish inside `run()` when `animate` is `false`. Simulations finish inside `run()` only with `animate: false` and `gpu: "off"`, or in a browser without `navigator.gpu`. Everywhere else, wait for `layoutstop`.

With the default `gpu: "auto"`, in Node or in a browser that has `navigator.gpu`, `run()` returns before any node moves. The package first loads @graphty/webgpu-graph-algorithms and asks for a WebGPU adapter, then starts the simulation on the GPU or the CPU. Put your follow-up work in a `layoutstop` handler, or create `layout.promiseOn("layoutstop")` before calling `run()` and await it.

With `animate: "end"` or `true`, `layoutstop` fires when the animation ends: about `animationDuration` milliseconds later for a tween. For a tween, `node.position()` reports the final position as soon as `run()` returns, as with Cytoscape's built-in layouts. Reads taken during the tween return intermediate values, so read positions in `layoutstop`.

This Node script waits for the layout either way. With `gpu: "off"` the run is synchronous, so the promise must exist before `run()`; one created after would miss the event and never resolve:

```js
import cytoscape from "cytoscape";
import graphtyCytoscape from "@graphty/cytoscape-extensions";

cytoscape.use(graphtyCytoscape);

const cy = cytoscape({ headless: true });
await cy.graphtyGenerate("barabasi-albert", { n: 200, m: 2, seed: 1 });

const layout = cy.layout({
    name: "graphty-fruchterman-reingold",
    // a headless core's viewport is 1 x 1 pixel, so give the layout a real box
    boundingBox: { x1: 0, y1: 0, w: 1000, h: 1000 },
    gpu: "off",
    seed: 7,
});
const stopped = layout.promiseOn("layoutstop");
layout.run();
await stopped;

console.log(cy.$id("0").position(), layout.backend.reason);
```

It prints the first node's position and `gpu: "off" was requested`. The [WebGPU guide](./webgpu) covers how the package finds a device and what each `reason` means.

## Common options

Besides its own options, every layout takes the same set of common ones: the box (`boundingBox`, `fit`, `padding`, `spacingFactor`, `transform`), the animation (`animate`, `animationDuration`, `animationEasing`, `animateFilter`), the `ready` and `stop` handlers, `dim`, `seed` and `weight`. The simulations add `randomize`, `refresh`, `gpu` and `accelerator`. The [layout reference](../reference/layouts#options-every-layout-takes) gives each one's type and default; the rest of this section covers the ones that behave differently from Cytoscape's built-in layouts.

`animate` means different things for the two kinds of layout:

| Value   | Static layout                  | Simulation                        |
| ------- | ------------------------------ | --------------------------------- |
| `false` | nodes jump to their positions  | runs to the end, then nodes jump  |
| `"end"` | nodes tween to their positions | runs to the end, then nodes tween |
| `true`  | same as `"end"`                | draws every frame while it runs   |

`animationDuration`, `animationEasing`, `animateFilter`, `spacingFactor` and `transform` act on the final jump or tween, so a simulation with `animate: true` ignores them. It applies `fit` and `padding` after every frame. Animation needs a core that renders: on a headless core created without `styleEnabled: true`, `run()` with a tween throws "graphty-circular: animate needs a core that renders; create a headless core with styleEnabled: true, or pass animate: false" (with the layout's own name). Such a core keeps a timer running, so in Node call `cy.destroy()` when you are done, or the process never exits.

`boundingBox` defaults to the viewport, from 0, 0 to `cy.width()`, `cy.height()`. A headless core's viewport is 1 x 1 pixel, so headless code always passes a box. The layout centers its result on the middle of the box and scales it so the node farthest from the middle is half the box's shorter side away. The result therefore fits in a circle inside the box and does not reach a wide box's sides: a 3-column grid of 6 nodes in a 300 x 200 box lands at x = 60.56, 150 and 239.44 and y = 55.28 and 144.72.

`weight` takes the name of an edge data field, such as `weight: "strength"`. An edge without a numeric value in that field counts as 1. It is read by `graphty-forceatlas2`, `graphty-kamada-kawai` and the other simulations; a function of the edge is not accepted here.

`gpu: "require"` makes a simulation fail with `layouterror` instead of running on the CPU. The [WebGPU guide](./webgpu) covers `gpu`, `accelerator` and `layout.backend` in full.

## Events

A layout that runs emits `layoutstart`, `layoutready` and `layoutstop`, in that order, and calls your `ready` and `stop` options on the matching events. Each event fires on the layout and then on the core, so `cy.on("layoutstop", handler)` sees every layout that finishes.

When a simulation fails after `run()` has returned, for example `gpu: "require"` with no usable GPU, it emits `layouterror` with the error as the handler's second argument, then `layoutstop`. Nothing else fires, and your `ready` and `stop` options are not called, so do your cleanup in a `layoutstop` handler. Calling `stop()` before a simulation has started emits `layoutstop` alone, too:

```js
import cytoscape from "cytoscape";
import graphtyCytoscape from "@graphty/cytoscape-extensions";

cytoscape.use(graphtyCytoscape);

const cy = cytoscape({ headless: true });
await cy.graphtyGenerate("barabasi-albert", { n: 200, m: 2, seed: 1 });

const layout = cy.layout({
    name: "graphty-forceatlas2",
    boundingBox: { x1: 0, y1: 0, w: 1000, h: 1000 },
    gpu: "require",
});
layout.on("layouterror", (event, error) => {
    console.error(error.message);
});
layout.run();
```

A failure the package can detect before anything starts throws from `run()` instead, and emits no events:

- `graphty-planar` on a graph that is not planar throws `G is not planar.`
- `graphty-bfs` on a disconnected graph throws `bfs_layout didn't include all nodes. Graph may be disconnected.`
- `graphty-bfs` or `graphty-radial` with a `root` that matches no node throws `graphty layout: root matches no node of the collection`.
- `graphty-spring-electrical` throws when the CPU is known up front (`gpu: "off"`, `accelerator: null`, a browser with no `navigator.gpu`). Otherwise the package first asks for a WebGPU device, and the same error arrives as `layouterror`. Either way `layout.backend` stays undefined, because nothing ran.

## Locked nodes and compound nodes

Locked nodes never move. A static layout computes as if every node were free and then leaves locked nodes where they stand. A simulation treats them as fixed points while it computes, so the rest of the graph arranges itself around them. With a locked node present, a simulation scales the free nodes about the locked nodes' center until the first free node reaches an edge of `boundingBox`. The free nodes stay inside the box but can cover only part of it: with one node locked near a corner, they gather in that corner. When the locked nodes stand outside the box, the free nodes are placed within half the box's shorter side of them, which puts them outside the box too.

Compound parent nodes are not laid out. The layout places their children, and Cytoscape sizes and positions each parent around its children. On a headless core, Cytoscape computes a parent's position only when the core was created with `styleEnabled: true`; without it, `parent.position()` stays where it was.

## Try it

- [Static layouts demo](https://graphty.app/storybook/cytoscape-extensions/?path=/story/demo-layouts--static-layouts): switch between the 13 static layouts on one graph.
- [Force simulations demo](https://graphty.app/storybook/cytoscape-extensions/?path=/story/demo-layouts--force-simulations): run, stop and restart the simulations and see which backend ran.
- [Layout gallery](https://graphty.app/storybook/cytoscape-extensions/?path=/story/gallery--layouts): every layout side by side.

## Next

- [Layout reference](../reference/layouts): every layout's own options and defaults.
- [Animate a force layout](./recipes/animate-force-layout): watch ForceAtlas2 settle, stop it and continue.
- [WebGPU](./webgpu): what runs on the GPU and how to require or refuse it.
