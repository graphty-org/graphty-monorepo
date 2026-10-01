# Acceleration

Guide to running layouts and algorithms on the GPU.

## Overview

A force layout and a centrality score are the same arithmetic done many times over, and a graphics
card does that kind of arithmetic in parallel. graphty-element will use one when it can: the
layout runs on the device, the result comes back to the same position array the CPU path writes,
and nothing else about your page changes.

The element finds the hardware, builds against it, attaches it, watches it and recovers from
losing it. You do not write any of that. You install one package, import one module, and read one
property when you want to know where the work ran.

## Turning it on

Two imports. The second is the whole of the activation:

```javascript
import "@graphty/graphty-element";
import "@graphty/graphty-element/webgpu";
```

The second import is a side effect: it registers a WebGPU accelerator factory that the element
uses if the machine has a device it can use. Without that import the element never looks for
hardware and runs everything on the CPU.

The module behind it is an optional package, so install it alongside the element:

```bash
npm install @graphty/webgpu-graph-algorithms
```

If it is not installed, drop the second import: everything else on this page still works and
reports that acceleration is unavailable.

## Policies

The `acceleration` attribute says what you want, and it is one of three words.

| Policy     | What it means                                                                              |
| ---------- | ------------------------------------------------------------------------------------------ |
| `auto`     | The default. Use an accelerator when one can be attached; run on the CPU when none can.    |
| `off`      | Never look. Every layout and every run is on the CPU.                                      |
| `required` | Work that would fall back to the CPU throws `E_NO_ACCELERATOR` instead (exceptions below). |

If you are drawing a control over these, take the list from the element rather than typing the words yourself:
`ACCELERATION_POLICIES`, `ACCELERATION_POLICY_DEFAULT` and `isAccelerationPolicy` are exported from
`@graphty/graphty-element/session`, which loads without a browser.

```html
<graphty-element acceleration="auto"></graphty-element>
```

```javascript
element.acceleration = "required";
```

`auto` turns down a software rasteriser (SwiftShader, llvmpipe), because it is slower than the
element's own CPU path and using it would make your graph worse while reporting success. Under
`required` a software device is accepted: you have said there is to be no CPU path, and a software
device is a device. Switch back from `required` to `auto` and the element lets go of a software
device again, reporting `unavailable` with `E_SOFTWARE_ONLY`; hardware stays attached.

The attribute, the property and `element.session.acceleration` are one setting. Whichever you
write, the attribute reflects it and `graphty-capabilities-change` fires once, carrying the new
policy as `capabilities.acceleration.policy`.

The element never remembers the policy for you. Storing a reader's choice and re-applying it on
their next visit is your application's storage, not the element's.

## Knowing where the work ran

Read it:

```javascript
const { state, reason, device } = element.session.capabilities.acceleration;
```

`vendor`, `architecture` and `device` are present only when the backend named them, and a browser
masks the device string for an ordinary origin -- so absent is the ordinary answer, not a rare one.
Write them as `device ?? backend` and let the fallback do its job: the element omits a fact it was
not given rather than publishing an empty string in its place.

`policy` is always there: it is the policy in force, however it was set.

Or listen for it. `graphty-capabilities-change` fires on every transition -- a change of state, of
device, of reason, or of policy -- and carries the same document the property returns:

```javascript
element.addEventListener("graphty-capabilities-change", (event) => {
    const { state, reason } = event.detail.capabilities.acceleration;
    chip.textContent = state === "unavailable" ? `CPU -- ${reason}` : state;
});
```

The state is one of these words:

| State         | What it means                                                                             |
| ------------- | ----------------------------------------------------------------------------------------- |
| `active`      | An accelerator is attached and work is on it right now.                                   |
| `idle`        | An accelerator is attached and usable, and nothing is using it at this moment.            |
| `unavailable` | Nothing could be attached. `reason` says why in a sentence, `code` in a string.           |
| `error`       | Something was attached and then failed -- a lost device, usually. The CPU path continues. |
| `off`         | You switched acceleration off, so the element never looked.                               |

`idle` is the resting state of working hardware, not a degraded one. A graph below the threshold
below, or a page where nothing has run yet, sits there.

## What the numbers are computed in

A GPU computes in single precision and the CPU path computes in double, so two runs of one
algorithm over one graph can disagree in the seventh decimal place. Every run says which it was:

```javascript
const run = element.run("pagerank");
await run;
run.caveats.precision; // "f32" from an accelerator, "f64" from the CPU
```

That is the label to show beside a value a reader might compare against a saved one.

## What is accelerated today

| Work                                   | On an accelerator       | Without one                                      |
| -------------------------------------- | ----------------------- | ------------------------------------------------ |
| `forceatlas2` layout                   | Yes                     | The CPU simulation                               |
| `spring` layout (Fruchterman-Reingold) | Yes                     | The CPU simulation                               |
| `spring-electrical` layout             | Yes                     | Nothing -- `setLayout` throws `E_NO_ACCELERATOR` |
| `pagerank`                             | Yes, with one exception | The CPU implementation                           |
| `connected-components`                 | Yes                     | The CPU implementation                           |
| `dijkstra`, `bfs`                      | Yes, above a floor      | The CPU implementation                           |
| `hits`, `katz`, `eigenvector`          | Yes, with exceptions    | The CPU implementation                           |
| `closeness`                            | Yes, with one exception | The CPU implementation                           |
| `betweenness`, `floyd-warshall`        | Yes, above a floor      | The CPU implementation                           |
| `clustering-coefficient`               | Yes, above a floor      | The CPU implementation                           |
| `label-propagation`                    | Yes, with one exception | The CPU implementation                           |
| `kruskal`                              | Yes, above a floor      | The CPU implementation                           |
| `dfs`, `bellman-ford`, `prim`, `scc`   | No                      | The CPU implementation                           |

The algorithms in the last row are never handed to an accelerator, even one that implements
them. They always run on the CPU and say `"f64"`, under `required` too, rather than throwing.

An algorithm is accelerated only above a measured node count: `floyd-warshall` from 300 nodes,
`betweenness` from 400, `closeness` from 4,000, `kruskal` from 5,000, `pagerank` from 10,000,
`hits` from 15,000, and `katz`, `eigenvector`, `dijkstra`, `bfs`, `connected-components`,
`clustering-coefficient` and `label-propagation` from 100,000. An algorithm
is one call, and on the device that call costs several round trips whatever the size, so below
those counts the CPU has finished before the device has started -- and a traversal, which is one
round trip per level, stays behind for longest. Under the floor the run takes the CPU path,
`caveats.precision` reads `"f64"`, and the state stays `idle`. The numbers were measured on one
card (see `acceleration-min-nodes` below for how to replace them with your own), and
`acceleration="required"` ignores them, so a benchmark can put a small graph on the device on
purpose.

Seven of those floors are above the 50,000 nodes this renderer will draw, so `katz`, `eigenvector`,
`dijkstra`, `bfs`, `connected-components`, `clustering-coefficient` and `label-propagation` take
the CPU path at every size the element will hold today. That is the measurement, not caution: an
accelerated call costs several readbacks of roughly 2 milliseconds each whatever the size, and on
a graph of 50,000 nodes and 100,000 edges the CPU implementations of those seven finish inside that,
or -- for `clustering-coefficient` and `label-propagation`, which do win on denser graphs of
10,000 to 20,000 nodes, and `katz`, which wins on 50,000 nodes with one edge each but loses on a
grid -- lose at that shape, and a floor has to hold at every size above it. The
floors were measured on 2026-09-30 by timing the CPU implementations against the GPU package in
headless Chromium on one card. Raising the renderer's ceiling is what would put the seven in reach;
until then, `acceleration="required"` or your own `acceleration-min-nodes` is how to put them on the
device deliberately.

`kruskal` has a second floor. When every edge weighs the same -- a graph whose edges carry no
`weight`, say -- the CPU implementation has nothing to sort and finishes five to ten times sooner,
so such a run goes to the device only from 100,000 nodes, above what the renderer holds. On either
path the tree is the same set of edges: the device breaks a tie between equal weights the way the
CPU does, so only `caveats.precision` tells the two apart.

PageRank is the exception in the table. A run that sets `personalization` or `initialRanks`, and
any run over an undirected graph, takes the CPU implementation whatever hardware is attached:
those three change what the numbers mean rather than how fast they are computed. Such a run
reports `caveats.precision` as `"f64"`, and under `acceleration="required"` it throws
`E_NO_ACCELERATOR`. On an undirected graph every edge carries rank both ways. A personalization
entry naming a node outside the run's graph -- outside a scope, say -- is left out, and the notes
say how many were. A `bfs` with a `targetNode` is the same: it stops early, which the accelerator
cannot, so it runs on the CPU and throws under `required`.

`hits`, `katz` and `eigenvector` have exceptions of the same kind. A `katz` run with `normalized`
switched off, over a graph where every node has the same number of neighbours, or with an `alpha`
too large for its series to be certain to converge on that graph, takes the CPU implementation.
That last one is checked against a bound on the graph's largest eigenvalue: a hub with d
neighbours raises it to about the square root of d, so at the default `alpha` of 0.1 a graph stays
on the CPU once its busiest region is roughly as dense as a hub of 100 neighbours, or a hub of 10
whose neighbours have 10 each. So does an `eigenvector` run that follows edge direction or runs over a graph
with a two-colourable component (an even ring, a tree, a grid). Above the floor the accelerated scores are the CPU's scores to
single precision: the same scale, the same weighting, the same order. Under
`acceleration="required"` such a run fails with `E_NO_ACCELERATOR` instead of answering on the CPU.

`closeness` has one exception: an exact run (no `k`) over more than 30,000 nodes
takes the CPU implementation, and throws `E_NO_ACCELERATOR` under `acceleration="required"`. The
device computes it, but the time grows with the square of the node count and is tens of seconds at
100,000 nodes, so above that size ask for a sampled run instead. A sampled run has no cap.

`betweenness` and `closeness` take a `k` option: set, the run is sampled from `k` sources drawn the
same way every time, and the CPU and the device draw the same ones. Past the node floor, a run
also needs enough work: the number of sources times the number of edges must reach 500,000 for
`betweenness` and 1,000,000 for `closeness` (an exact run counts every node as a source). The
device's cost of a sampled run hardly depends on the size, while the CPU's grows with the sources,
so with a small `k` the CPU is faster on graphs where a larger `k` would be faster on the device.

`label-propagation` has one exception. With no `randomSeed` (the default) it runs synchronous
passes -- every node takes the lowest of its neighbours' best-voted labels, all at once, with passes
alternating between moving labels only up and only down -- which is the rule a GPU runs, so above
the floor it goes to the device and below it `@graphty/algorithms`' synchronous implementation
runs. The two agree on community structure but differ in three details: which direction the first
pass moves, whether a node keeps a label tied for the lead, and how a run that never settles ends.
So on a graph with tied votes they can settle on different, equally valid partitions;
`caveats.precision` says which ran. When labels cycle, which happens on some weighted graphs, the CPU
stops as soon as it sees the cycle and reports `caveats.converged` as false; the device runs every
one of `maxIterations` passes, returns whichever state that lands on and cannot report convergence,
so `caveats.converged` is absent. With a
`randomSeed` it runs the seeded asynchronous algorithm, one node at a time in an order drawn from the
seed, which no GPU kernel implements: it always runs on the CPU, and under `acceleration="required"`
it throws `E_NO_ACCELERATOR`.

An algorithm the element does not route to the device at all (`dfs`, `bellman-ford`, `prim`,
`scc`, `k-core` and `louvain` today) runs on the CPU and says `"f64"` under `acceleration="required"` too, rather
than throwing.

Every other layout and every other algorithm runs on the CPU, and always did.

An accelerated layout is a live simulation rather than a one-shot arrangement: it keeps stepping
until it comes to rest, `element.setRunning(false)` stops it, and `element.setRunning(true)` sets
it going again.

## Tuning

Three knobs, none of which you need to touch to get a working graph.

**`acceleration-min-nodes`** -- the node count at or above which accelerated work actually uses
the accelerator. Below it the element takes the CPU path even with hardware attached, and the
state reads `idle`. Unset, the layouts use the hardware whenever there is any (a threshold of 0,
measured for the accelerated layout, which was never slower than the CPU at any size) and each
algorithm keeps the built-in floor listed above. Set to any number, including 0, it is
your number for every layout and every algorithm, and the built-in floors no longer apply. Set
it when you have measured the machine your graphs are drawn on: the crossover is a property of
that machine's CPU and device, and the built-in floors come from one card.

```html
<graphty-element acceleration-min-nodes="5000"></graphty-element>
```

**`layoutBehavior.layout.iterationsPerStep`** -- how many simulation iterations one frame submits
as a single batch. Each batch costs one round trip to the device, so a bigger batch spends less
time waiting and more time computing, at the cost of a coarser picture of the motion. Left unset
the element resolves it from the frame-loop multiplier and raises it on a very large graph.

**`layoutBehavior.layout.maxInFlight`** -- how many batches may be outstanding at once, from 1 to
4, default 2. One makes every frame wait for its readback; more than four buys nothing. A CPU
simulation ignores it, because its step is synchronous.

```javascript
element.layoutBehavior = { layout: { iterationsPerStep: 16, maxInFlight: 2 } };
```

## When it does not work

These arrive as `capabilities.acceleration.code`, beside a `reason` written for a person. None of
them stops your graph from being drawn; they say why it is being drawn by the CPU.

| Code                 | What happened                                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------------------------------- |
| `E_NO_WEBGPU`        | The runtime exposes no WebGPU at all -- usually an insecure context, or a browser that does not implement it. |
| `E_NO_ADAPTER`       | WebGPU is there but no adapter could be acquired.                                                             |
| `E_SOFTWARE_ONLY`    | The only adapter is a software rasteriser, which `auto` turns down as slower than the CPU path.               |
| `E_DEVICE_INCORRECT` | The adapter answers, and its answers are wrong. See below.                                                    |
| `E_DEVICE_LOST`      | The device was lost mid-session -- a driver reset, a suspended tab.                                           |
| `E_TOO_LARGE`        | The accelerator cannot compute exactly over as many nodes as it was asked for.                                |

A lost device is not the end of it. The element drops to the CPU path and then tries up to
three times to attach a fresh accelerator, so a state that goes `error` and comes back to `idle`
is a recovery that worked; after the third failure it stays down.

`E_DEVICE_INCORRECT` is the one that surprises people, because the hardware is there and it
works. Before the element gives an accelerator any of your graph, it asks the accelerator to
compute something whose answer is already known, and a device that gets it wrong is turned down.
The WebGPU accelerator answers by scanning a prefix sum of 8,193 known numbers through the
kernels it would really use and checking every word on the host. It costs 14 to 20 milliseconds,
once per device, and only on a machine that has already produced an adapter.

The software renderer that ships with Windows is the device this exists for. It miscomputes
shaders that pass a value across a workgroup barrier, so prefix sums, sorts and the grid layouts
built on them come back wrong, with plausible numbers and no error anywhere. Nothing you change
makes it pass; a driver update might. Your graph is drawn by the CPU in the meantime, which is
what it would have done on a machine with no GPU at all.

A backend you registered yourself is asked the same question, and answers it by implementing
`verify()` on the accelerator its factory returns: resolve when the hardware is trustworthy,
reject with `E_DEVICE_INCORRECT` when it is not. One that does not implement it is attached on
the strength of the probe, and so is an accelerator you hand to `setAccelerator` already built --
the element only asks about accelerators it constructed itself.

`E_TOO_LARGE` from an accelerator is about the ceiling the element asks for when one is built --
the WebGPU one computes exactly up to 32,768 nodes -- and not about the size of your graph. The
element asks for no ceiling today, so no accelerator refuses a graph you draw. The same code from
a run is the run's own bound, whatever the policy: `floyd-warshall` refuses more than 5,792
nodes, because it holds a distance for every pair.

One code is thrown rather than reported: `E_NO_ACCELERATOR`, when the policy is `required` and
there is nothing to accelerate with. That is the policy working -- it is what `required` asked
for.

A failure part-way through accelerated work is that work's failure. The element reports it with
its code and never quietly finishes the job on the CPU, because a result that silently changed
where it came from is a result nobody can trust.
