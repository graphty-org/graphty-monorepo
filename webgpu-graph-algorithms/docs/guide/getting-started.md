# Getting Started

`@graphty/webgpu-graph-algorithms` runs graph algorithms and force layouts on a GPU through WebGPU: in Node through
Dawn (the `webgpu` npm package), and in browsers that ship WebGPU. It works on the compact, frozen graph snapshots of
[`@graphty/graph-format`](https://www.npmjs.com/package/@graphty/graph-format).

## When to use it

Use it when a graph is large enough that the CPU is the bottleneck: tens of thousands of nodes and up. On small
graphs a CPU implementation such as [`@graphty/algorithms`](../../algorithms/) or [`@graphty/layout`](../../layout/)
is as fast or faster, because a GPU call pays a fixed cost to upload the graph and read the result back.

The package never falls back to the CPU. When there is no usable GPU it throws a
[`WebGpuGraphError`](./errors.md) (or, through `acquireAccelerator`, tells you why before any work runs), and
running a CPU implementation instead is your decision.

## Install

```bash
npm install @graphty/webgpu-graph-algorithms @graphty/graph-format
# Node only: Dawn, an optional peer dependency (browsers never need it)
npm install webgpu@0.6.1
```

`webgpu@0.6.x` needs glibc 2.38 (Ubuntu 24.04 or newer). On Ubuntu 22.04, install `webgpu@0.4.0` instead; see
[Node and Browser Setup](./setup.md).

## The smallest working example

This script opens a GPU context in Node, builds a five-node graph, and runs PageRank and connected components on it:

<<< ../examples/getting-started.ts

Three things to notice:

- **A context owns the device.** Create one per process (or page) and reuse it for every call.
- **Results are indexed by node index**, `0 .. nodeCount - 1`, never by node id. The snapshot's id map turns an index
  back into the id it was built from.
- **Nothing is freed by garbage collection.** `ctx.release(graph)` frees the buffers a graph was uploaded into, and
  `ctx.dispose()` frees the device and lets the process exit.

The first call on a snapshot uploads it; later calls on the same snapshot reuse the upload until you release it.

## What to read next

- [Node and Browser Setup](./setup.md): choosing an adapter, running in a browser, and `acquireAccelerator`
- [Algorithms](./algorithms.md): every algorithm, its options and its result
- [Layouts](./layouts.md): force layouts from a script or a browser frame loop
- [Errors](./errors.md): the error codes and what to do about each
- [API Reference](../api/): every exported function and type
