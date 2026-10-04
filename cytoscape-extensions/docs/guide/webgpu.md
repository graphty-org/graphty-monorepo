# WebGPU

The `...Async` algorithm methods and the force simulations run on the GPU when the runtime has a
usable WebGPU device, and on the CPU when it does not. A browser needs no setup. Node has no
WebGPU of its own: install the optional `webgpu` package (Dawn, Google's WebGPU implementation),
or every run is on the CPU.

```sh
npm install webgpu
```

Every `...Async` result carries a `backend` object that says which implementation ran and why:

```js
import cytoscape from "cytoscape";
import graphtyCytoscape from "@graphty/cytoscape-extensions";

cytoscape.use(graphtyCytoscape);

const cy = cytoscape({ headless: true });
await cy.graphtyGenerate("barabasi-albert", { n: 2000, m: 2, seed: 1 });

const r = await cy.elements().graphtyPageRankAsync();
if (r.backend.ran === "gpu") {
    console.log("GPU:", r.backend.device);
} else {
    console.log("CPU, because", r.backend.reason);
}
console.log(r.rank(cy.nodes()[0]));
```

Without a GPU, or in Node without `webgpu`, this prints `CPU, because no usable WebGPU device:`
and the cause, then the rank.

## What runs on the GPU

Seventeen algorithms have a `graphty<Name>Async` twin: breadth-first search, Dijkstra,
Bellman-Ford, all-pairs shortest paths, PageRank, personalized PageRank, eigenvector, Katz, HITS,
closeness, betweenness and edge betweenness centrality, connected and weakly connected components,
triangle count, and both label propagations. They take the same options as the plain method and
return the same result, plus `backend`. `ASYNC_ALGORITHM_NAMES` lists their method names.

The simulations `graphty-forceatlas2`, `graphty-fruchterman-reingold` and
`graphty-spring-electrical` use the GPU. `graphty-spring-electrical` has no CPU implementation, so
without a GPU it emits `layouterror`, then `layoutstop`
([Troubleshooting](./troubleshooting#graphty-spring-electrical-emits-layouterror)). Plain methods
and static layouts always run on the CPU, synchronously.

## How the GPU code loads

The first `...Async` call or simulation loads the GPU code with a dynamic `import()`, as its own
chunk. A browser without `navigator.gpu` never loads it. Each Cytoscape core acquires one device
when it first needs one and reuses it; after a device loss the next call acquires a new one, and
`cy.destroy()` releases it. If you destroy the core during an `...Async` call, check
`cy.destroyed()` after the `await` and drop the result; the call can also reject with
`graphty: the Cytoscape core was destroyed`.

## Which backend ran

`backend` is `{ ran, reason, device }`:

| Field    | Type             | Meaning                                                             |
| -------- | ---------------- | ------------------------------------------------------------------- |
| `ran`    | `"gpu" \| "cpu"` | The implementation that produced the result.                        |
| `reason` | `string \| null` | Why the CPU ran; `null` when the GPU ran.                           |
| `device` | `string \| null` | The GPU as `"vendor device"` when one was acquired, even if unused. |

A simulation sets `layout.backend` just before it emits `layoutstart`. Under the default
`gpu: "auto"` that is after `run()` returns, once the device check ends, so read it in a
`layoutstart`, `layoutready` or `layoutstop` handler. Static layouts leave it undefined.

`reason` starts with one of these:

| `reason` begins with                                   | What happened                                | Fix                                              |
| ------------------------------------------------------ | -------------------------------------------- | ------------------------------------------------ |
| `gpu: "off" was requested`                             | You passed `gpu: "off"`.                     | Remove it.                                       |
| `this runtime has no WebGPU`                           | A browser or worker with no `navigator.gpu`. | See below.                                       |
| `no usable WebGPU device:`                             | No WebGPU device the package would use.      | See below.                                       |
| `@graphty/webgpu-graph-algorithms did not load:`       | The GPU chunk failed to load.                | Serve the package's chunks.                      |
| `the options or the graph need the CPU implementation` | This call needs the CPU.                     | [See below](#when-options-send-work-to-the-cpu). |
| `accelerator: null was passed`                         | A simulation got `accelerator: null`.        | Remove it.                                       |
| `the core was destroyed`                               | `cy.destroy()` ran during setup.             | Drop the result.                                 |

Browsers expose `navigator.gpu` only in secure contexts: a page over plain `http` from a LAN
address gets `this runtime has no WebGPU`. Serve it over `https` or from `localhost`.

After `no usable WebGPU device:` the text names the cause: no `webgpu` package under Node, no
adapter (`requestAdapter() returned null`), a refused [software adapter](#software-adapters), or a
device that failed the package's startup check (a small computation with a known answer). No
option overrides that last one; update the driver or use another GPU.

## Requiring or refusing the GPU

Every `...Async` method and every simulation takes a `gpu` option:

- `"auto"` (default): the GPU when there is a usable device, the CPU otherwise.
- `"off"`: always the CPU. A simulation finishes inside `run()` only when `animate` is `false`.
- `"require"`: no usable device is an error. An `...Async` call rejects; a simulation emits
  `layouterror`, then `layoutstop`.

Any other value throws a `TypeError`. A plain method throws on `gpu: "require"`. With no device,
the error is `graphty: gpu: "require" but ` and the reason; a simulation passes it to
`layouterror` as the second argument and leaves `layout.backend` undefined:

```js
import cytoscape from "cytoscape";
import graphtyCytoscape from "@graphty/cytoscape-extensions";

cytoscape.use(graphtyCytoscape);

const cy = cytoscape({ headless: true });
await cy.graphtyGenerate("barabasi-albert", { n: 2000, m: 2, seed: 1 });

const layout = cy.layout({
    name: "graphty-forceatlas2",
    gpu: "require",
    boundingBox: { x1: 0, y1: 0, w: 800, h: 600 },
});
layout.on("layouterror", (event, error) => {
    console.error("No GPU layout:", error.message);
});
layout.on("layoutstop", () => {
    console.log("stopped; backend:", layout.backend);
});
layout.run();
```

## When options send work to the CPU

With a device acquired, these calls still run on the CPU, and `backend.reason` does not say
which condition applied:

- `graphtyPageRankAsync`: `initialRanks` is set, or `convergenceNorm: "max"`.
- `graphtyPersonalizedPageRankAsync`: as PageRank; also when some node has no out-edges.
- `graphtyKatzCentralityAsync`: `normalized: false`; `alpha: 0`; every node has the same
  in-degree; or the hub rule below.
- `graphtyEigenvectorCentralityAsync`: `startVector` is set; the graph is directed, has parallel
  edges, or has a bipartite component.
- `graphtyClosenessCentralityAsync`: `normalized: true`, `cutoff`, or `harmonic: true` with
  `sources` or `k`; `sources` or `k` on a directed graph.
- `graphtyBetweennessCentralityAsync`: `endpoints: true`, or the graph has parallel edges.
- `graphtyEdgeBetweennessCentralityAsync`: the graph has parallel edges.
- `graphtyAllPairsShortestPathAsync`: `paths: true` (the default), `method` or `maxNodes` is set,
  a weight is negative or not finite, or over 5,792 nodes.
- `graphtyBreadthFirstSearchAsync`: `goal` is set.
- `graphtyLabelPropagationAsync`: you pass `randomSeed` (the CPU's default seed of 42 does not count).

The Katz hub rule: the CPU runs when `alpha` squared times the largest product of in-degrees
across an edge is 1 or more. At the default `alpha: 0.1`, one edge between nodes of in-degree 50
and 2 is enough. For all-pairs shortest paths on the GPU, pass `paths: false`; `distance()` works
and `path()` throws.

## Software adapters

`configureWebGpu(options)` changes how every core picks its device. Each call replaces the
previous options and makes every core decide again on its next call; no argument restores the
defaults.

| Option           | Type      | Default | Meaning                                                                                    |
| ---------------- | --------- | ------- | ------------------------------------------------------------------------------------------ |
| `acceptSoftware` | `boolean` | `false` | Use a software adapter (SwiftShader, llvmpipe, WARP).                                      |
| `adapter`        | `string`  | none    | Node only: a substring of the Dawn adapter name to pick, such as `"llvmpipe"` or `"4070"`. |

A software adapter is refused by default because it is slower than the CPU code. Accept it to
test the GPU path on a CI runner:

```js
import { configureWebGpu } from "@graphty/cytoscape-extensions";

configureWebGpu({ acceptSoftware: true });
```

It only accepts an adapter the runtime offers. Dawn offers llvmpipe on Linux and WARP on
Windows. Chromium offers SwiftShader only when started with these testing flags:

```sh
--enable-unsafe-webgpu --use-angle=swiftshader --enable-unsafe-swiftshader --use-webgpu-adapter=swiftshader
```

If `reason` still says `requestAdapter() returned null`, there is no adapter to accept.

## Console messages

When a graph of `GPU_SIZE_FLOOR` (5,000) nodes or more runs on the CPU because of a missing
`webgpu` package, a refused software adapter or a GPU chunk that failed to load, the console gets
one warning with the fix, repeated only after a `configureWebGpu()` call. Chromium's own
`No available adapters.` line means there was no adapter; `gpu: "off"` stops the package asking.

## Failures and precision

The GPU-or-CPU choice is made once, before work starts. A later failure, such as a lost device,
rejects the call or emits `layouterror`; the work never finishes on the CPU.

GPU results are single precision: within about 1e-5 relative of the CPU for PageRank (same
iteration count), distances and closeness, and 1e-4 for betweenness. Components, breadth-first
depths, triangle counts and unweighted distances match exactly. GPU label propagation breaks ties
differently and returns no `iterations` or `converged`. GPU PageRank stops when the L1 change falls
below `tolerance` times the node count, the CPU below `tolerance`, so the GPU often stops sooner.

## Bringing your own accelerator

To run a simulation on a GPU context you hold, build an accelerator with
`@graphty/webgpu-graph-algorithms` and pass it as `accelerator`:

```js
import cytoscape from "cytoscape";
import graphtyCytoscape from "@graphty/cytoscape-extensions";
import { createAccelerator } from "@graphty/webgpu-graph-algorithms";
import { requestGpuContext } from "@graphty/webgpu-graph-algorithms/browser";

cytoscape.use(graphtyCytoscape);

async function draw() {
    const cy = cytoscape({ container: document.getElementById("cy") });
    await cy.graphtyGenerate("barabasi-albert", { n: 2000, m: 2, seed: 1 });

    const accelerator = createAccelerator(await requestGpuContext({ powerPreference: "low-power" }));
    const layout = cy.layout({ name: "graphty-forceatlas2", accelerator });
    // you own the accelerator; cy.destroy() does not dispose it
    layout.one("layoutstop", () => accelerator.dispose());
    layout.run();
}
draw();
```

`accelerator` applies to simulations only and overrides `gpu`. `layout.backend` is then
`{ ran: "gpu", reason: null, device: "webgpu" }`.

## Try it

The [force simulations](https://graphty.app/storybook/cytoscape-extensions/?path=/story/demo-layouts--force-simulations)
and [centrality](https://graphty.app/storybook/cytoscape-extensions/?path=/story/demo-algorithms--centrality)
demos have a `backend` control and an `acceptSoftware` switch, and show which backend ran and why.

## See also

- [Layouts](./layouts): simulations, animation and layout events.
- [Algorithms](./algorithms): result shapes and writing values onto elements.
- [Troubleshooting](./troubleshooting): from an error message to its fix.
