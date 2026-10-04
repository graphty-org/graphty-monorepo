# WebGPU

The `...Async` algorithm methods and the force simulations run on the GPU when the runtime has a
usable WebGPU device, and on the CPU when it does not. In a browser there is no setup: installing
`@graphty/cytoscape-extensions` installs the GPU code (`@graphty/webgpu-graph-algorithms`), and you
import nothing extra. In Node, also run `npm install webgpu` (see [Node](#node)).

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

On a machine with no GPU, or in Node without the optional `webgpu` package, this prints
`CPU, because no usable WebGPU device: ...` followed by the cause, and then the rank.

## What runs on the GPU

Seventeen algorithms have an asynchronous twin named `graphty<Name>Async`: breadth-first search,
Dijkstra, Bellman-Ford, all-pairs shortest paths, PageRank, personalized PageRank, eigenvector,
Katz, HITS, closeness, betweenness and edge betweenness centrality, connected and weakly connected
components, triangle count, and both label propagations. They take the same options as the plain
method and return the same result, plus `backend`. `ASYNC_ALGORITHM_NAMES` exports their
method names, such as `"graphtyPageRankAsync"`.

Of the layouts, the three simulations use the GPU: `graphty-forceatlas2`,
`graphty-fruchterman-reingold` and `graphty-spring-electrical`. `graphty-spring-electrical` has
no CPU implementation. Without a GPU, its `run()` throws when the CPU is known up front (`gpu:
"off"`, `accelerator: null`, no `navigator.gpu`); otherwise it emits `layouterror` and then
`layoutstop` (no `webgpu` package in Node, `requestAdapter()` returning `null`). Wrap `run()` in
`try`/`catch` and also listen for `layouterror`. `layout.backend` stays undefined either way.

The plain methods (`graphtyPageRank()` and the rest) and the static layouts always run on the CPU
and stay synchronous.

## How the GPU code loads

Nothing GPU-related loads at import time. The first `...Async` call or simulation loads the GPU
code with a dynamic `import()`, in its own chunk under a bundler or the CDN build. A browser where
`navigator.gpu` is undefined never loads it. The script-tag build is one file and contains it.

Each Cytoscape core then acquires one device the first time it needs one and reuses it for every
later call. After a device loss, the next call acquires a new one. `cy.destroy()` releases it.
If you destroy the core during an `...Async` call, check `cy.destroyed()` after the `await` and
drop the result when it is `true`; the call almost always resolves normally. It rejects with
`graphty: the Cytoscape core was destroyed` only when the destroy lands while the page's first GPU
call is still loading the GPU code. With no `navigator.gpu`, or `gpu: "off"`, it always resolves.

### Node

Node has no WebGPU of its own. To use the GPU there, install the optional `webgpu` package, which
brings Dawn, Google's WebGPU implementation:

```sh
npm install webgpu
```

Without it, every run is on the CPU and `backend.reason` names the missing package.

## Which backend ran

`backend` is `{ ran, reason, device }`:

| Field    | Type             | Meaning                                                                   |
| -------- | ---------------- | ------------------------------------------------------------------------- |
| `ran`    | `"gpu" \| "cpu"` | The implementation that produced the result.                              |
| `reason` | `string \| null` | Why the CPU ran; `null` when the GPU ran.                                 |
| `device` | `string \| null` | The GPU as `"vendor device"`, when one was acquired, even if the CPU ran. |

An `...Async` result has it. A simulation sets `layout.backend` once it has chosen, before
`layoutready`; static layouts leave it undefined. In TypeScript, the exported `GraphtyLayouts`
type declares it.

`reason` starts with one of these:

| `reason` begins with                                   | What happened                                                   | Fix                                                  |
| ------------------------------------------------------ | --------------------------------------------------------------- | ---------------------------------------------------- |
| `gpu: "off" was requested`                             | You passed `gpu: "off"`.                                        | Remove it.                                           |
| `this runtime has no WebGPU`                           | A browser or worker with no `navigator.gpu`.                    | Use a browser with WebGPU enabled.                   |
| `no usable WebGPU device:`                             | The runtime offered no WebGPU device the package would use.     | See below.                                           |
| `@graphty/webgpu-graph-algorithms did not load:`       | The GPU chunk failed to load.                                   | Serve the package's chunks.                          |
| `the options or the graph need the CPU implementation` | A device is set, but this call needs the CPU.                   | See [below](#when-the-options-send-work-to-the-cpu). |
| `accelerator: null was passed`                         | A simulation was given `accelerator: null`.                     | Remove it.                                           |
| `the core was destroyed`                               | A device was found, but `cy.destroy()` ran while it was set up. | Drop the result.                                     |

After `no usable WebGPU device:` the text names the cause: no `webgpu` package under Node (fix:
`npm install webgpu`), no adapter (`requestAdapter() returned null`), a software-only adapter,
refused by default (see [Software adapters](#software-adapters-and-the-node-adapter)), or a device
that computed a known test sum wrong (no option accepts it; a driver update or another GPU can).

## Requiring or refusing the GPU

Every `...Async` method and every simulation takes a `gpu` option:

| Value       | Behavior                                                                                                          |
| ----------- | ----------------------------------------------------------------------------------------------------------------- |
| `"auto"`    | Default. The GPU when there is a usable device, the CPU otherwise.                                                |
| `"off"`     | Always the CPU. A simulation finishes inside `run()` only when `animate` is `false`.                              |
| `"require"` | No usable device is an error: an `...Async` call rejects, a simulation emits `layouterror` and then `layoutstop`. |

A plain method throws on `gpu: "require"`. The message points at its `...Async` twin, or, for a
method with no twin, says it runs only on the CPU.

A simulation that must run on the GPU looks like this. The error reaches the `layouterror`
handler as its second argument; `layout.backend` stays undefined because nothing ran.

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

With no device, the error message is `graphty: gpu: "require" but ` followed by the reason.

## When the options send work to the CPU

With a device acquired, some calls still run on the CPU, because the GPU version does not support
what they ask for. `backend.ran` is then `"cpu"`, `backend.device` is set, and `backend.reason`
does not say which condition applied. These are all the conditions:

| Method                                  | Runs on the CPU when                                                                                                                    |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `graphtyPageRankAsync`                  | `initialRanks` is set, or `convergenceNorm: "max"`.                                                                                     |
| `graphtyPersonalizedPageRankAsync`      | As PageRank; also when every `personalization` value is 0, or some node has no out-edges.                                               |
| `graphtyKatzCentralityAsync`            | `normalized: false`; `alpha: 0`; every node has the same in-degree; or the hub rule below.                                              |
| `graphtyEigenvectorCentralityAsync`     | `startVector` is set; the graph is directed, has parallel edges, or has a bipartite component.                                          |
| `graphtyClosenessCentralityAsync`       | `normalized: true`, `cutoff`, or `harmonic: true` with `sources` or `k`; `sources` or `k` on a directed graph.                          |
| `graphtyBetweennessCentralityAsync`     | `endpoints: true`, or the graph has parallel edges.                                                                                     |
| `graphtyEdgeBetweennessCentralityAsync` | The graph has parallel edges.                                                                                                           |
| `graphtyAllPairsShortestPathAsync`      | `paths: true` (the default), `method` or `maxNodes` is set, a weight is negative or not finite, or the graph has more than 5,792 nodes. |
| `graphtyBreadthFirstSearchAsync`        | `goal` is set.                                                                                                                          |
| `graphtyLabelPropagationAsync`          | You pass `randomSeed`. The CPU's default seed of 42 does not count: without the option, the GPU runs.                                   |

The Katz hub rule: when `alpha` squared times the largest product of in-degrees across an edge is
1 or more, the call runs on the CPU. At the default `alpha: 0.1`, one edge between a node of
in-degree 50 and one of in-degree 2 is enough. Pass a smaller `alpha` to let the GPU answer.

For all-pairs shortest paths, pass `paths: false` to let the GPU answer; `path()` on that result
then throws, and `distance()` still works.

## Software adapters and the Node adapter

`configureWebGpu(options)`, exported from the package, changes how every core picks its device.
Each core releases its current device and decides again on its next call.

| Option           | Type      | Default | Meaning                                                                                    |
| ---------------- | --------- | ------- | ------------------------------------------------------------------------------------------ |
| `acceptSoftware` | `boolean` | `false` | Use a software adapter (SwiftShader, llvmpipe, WARP).                                      |
| `adapter`        | `string`  | none    | Node only: a substring of the Dawn adapter name to pick, such as `"llvmpipe"` or `"4070"`. |

A software adapter is refused by default because it is slower than the CPU code on most machines.
Accept it to exercise the GPU path on a machine without a GPU, such as a CI runner.
`acceptSoftware` only accepts an adapter the runtime already offers. In Node, Dawn offers llvmpipe
on Linux and WARP on Windows. In a browser, `requestAdapter()` must already return a software
adapter, which in Chromium takes browser flags. If `reason` still says `requestAdapter() returned
null`, there is no adapter to accept.

```js
import { configureWebGpu } from "@graphty/cytoscape-extensions";

configureWebGpu({ acceptSoftware: true });
```

## The large-graph warning

`GPU_SIZE_FLOOR` is 5,000 nodes. When a graph that large runs on the CPU, the console gets one
warning with the reason and the fix, but only for these three reasons: Node without the `webgpu`
package, a refused software adapter, and a GPU chunk that failed to load. Every other reason is
silent, including `this runtime has no WebGPU`, a browser whose `requestAdapter()` returns `null`,
and `gpu: "off"`. It warns once, and again after a `configureWebGpu()` call. Smaller graphs never
warn.

Chromium prints its own console warning, `No available adapters.`, each time a probe finds no
adapter: once per core, and again after `configureWebGpu()`. That line comes from the browser, not
from graphty. Pass `gpu: "off"` to skip the probe.

## When the GPU fails during a run

The GPU-or-CPU choice is made once, before any work starts. A later failure, such as a lost
device, rejects the `...Async` call or emits `layouterror`; the work never finishes on the CPU.

## Precision

GPU results are single precision. They agree with the CPU to about 1e-5 relative for PageRank
(same iteration count), distances and closeness, and to 1e-4 for betweenness. Components, breadth-first depths, triangle counts and
unweighted distances match exactly.

Label propagation breaks ties differently on the two, so partitions can differ, and the GPU result
has no `iterations` or `converged`. For PageRank, the GPU stops when the L1 change falls below
`tolerance` times the node count, the CPU when it falls below `tolerance`, so the GPU often stops
sooner.

## Bringing your own accelerator

To run a simulation on a GPU context you hold, build an accelerator over it with
`@graphty/webgpu-graph-algorithms` (install it to import it) and pass it as `accelerator`.

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

A top-level `await` on `graphtyGenerate` hangs a Vite 7 production build, hence `draw()`
([why](./getting-started)).

The option applies to simulations only and overrides `gpu`. `layout.backend` is then
`{ ran: "gpu", reason: null, device: "webgpu" }`. `accelerator: null` forces the CPU.

## Try it

- [Force simulations demo](https://graphty.app/storybook/cytoscape-extensions/?path=/story/demo-layouts--force-simulations) shows which backend each simulation ran on.
- [Centrality demo](https://graphty.app/storybook/cytoscape-extensions/?path=/story/demo-algorithms--centrality) runs the `...Async` centrality methods.

## See also

- [Layouts](./layouts): simulations, animation and layout events.
- [Algorithms](./algorithms): result shapes and writing values onto elements.
- [Troubleshooting](./troubleshooting): from an error message to its fix.
