# API Reference

Complete API documentation for `@graphty/webgpu-graph-algorithms`. Every algorithm takes a `GpuContext` and a frozen
`GraphSnapshot` from `@graphty/graph-format`, and every result is indexed by node index.

[Every function and type in the generated TypeDoc](./generated/)

## Getting a GPU

- `acquireAccelerator()` - A verified accelerator, or the reason there is none (`./acquire`, `./node`, `./browser`)
- `createNodeGpuContext()`, `probeNodeWebGpu()`, `createNodeGpu()`, `dawnFlags()` - Node, through Dawn (`./node`)
- `requestGpuContext()`, `probeBrowserWebGpu()`, `summarizeAdapter()` - Browsers (`./browser`)
- `GpuContext` - One device: `create()`, `probe()`, `from()`, `release(snapshot)`, `dispose()`
- `createAccelerator(ctx)` - An object with one method per algorithm and layout, for `@graphty/algorithms` and
  `@graphty/layout`
- `verifyDevice(ctx)` - The device self-check, on demand
- `isSoftwareAdapter()` - Whether an adapter is a software renderer

See [Node and Browser Setup](../guide/setup.md).

## Algorithms

- `pageRank()`, `personalizedPageRank()`, `hits()`, `eigenvectorCentrality()`, `katzCentrality()` - Centrality by
  iteration
- `closenessCentrality()`, `betweennessCentrality()`, `edgeBetweennessCentrality()` - Centrality by shortest paths
- `connectedComponents()`, `labelPropagation()`, `triangleCount()` - Components, communities and triangles
- `breadthFirstSearch()`, `sssp()`, `bellmanFord()`, `allPairsShortestPath()`, `minimumSpanningTree()` - Paths and
  trees
- `degree()` - A diagnostic: out-degree computed on the device

See [Algorithms](../guide/algorithms.md).

## Layouts

- `createForceAtlas2()`, `createFruchtermanReingold()`, `createSpringElectrical()` - Force simulations
- `GpuLayoutSimulation` - What they return: `load()`, `step()`, `run()`, `settled`, `stats`, `setPosition()`,
  `setFixed()`, `reheat()`, `flush()`, `dispose()`
- `calibrateLayout()` - Measures the repulsion tiers on the device
- `seedPositions()` - Places the `NaN` rows of a positions array as a simulation does

See [Layouts](../guide/layouts.md).

## Errors

- `WebGpuGraphError` - Every error the package throws, with a stable `code`
- `isWebGpuGraphError()`, `hasErrorCode()` - Checks that work across two copies of the package
- `PASSTHROUGH_FORMAT_CODES` - The graph-format codes passed through unchanged

See [Errors](../guide/errors.md).

## Constants

- `FA2_DEFAULTS`, `FR_DEFAULTS`, `SE_DEFAULTS`, `LAYOUT_TUNING_DEFAULTS` - The layout defaults
- `EXACT_MAX_NODES` - The default `exactMaxNodes`: the largest graph `repulsion: "auto"` lays out exactly
- `WORKGROUP_SIZE`, `MAX_WORKGROUPS_PER_DIM`, `MAX_1D_ITEMS`, `STORAGE_ALIGN`, `ARC_WINDOW_ALIGN` - Device sizing
