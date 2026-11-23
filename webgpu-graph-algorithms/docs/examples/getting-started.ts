import { fromEdgeArrays } from "@graphty/graph-format";
import { connectedComponents, pageRank } from "@graphty/webgpu-graph-algorithms";
import { createNodeGpuContext } from "@graphty/webgpu-graph-algorithms/node";

// one context per process: it owns the GPU device
const ctx = await createNodeGpuContext();

// a path 0 -> 1 -> 2 and an edge 3 -> 4: two components
const graph = fromEdgeArrays({
    directed: true,
    nodeCount: 5,
    src: new Uint32Array([0, 1, 3]),
    dst: new Uint32Array([1, 2, 4]),
});

const ranks = await pageRank(ctx, graph);
console.log(ranks.scores.length); // 5
console.log(ranks.converged); // true

const components = await connectedComponents(ctx, graph);
console.log(components.labels); // Uint32Array(5) [ 0, 0, 0, 1, 1 ]
console.log(components.count); // 2

ctx.release(graph); // frees the graph's GPU buffers
ctx.dispose(); // frees the device
