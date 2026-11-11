import { fromEdgeArrays } from "@graphty/graph-format";
import {
    eigenvectorCentrality,
    hits,
    katzCentrality,
    pageRank,
    personalizedPageRank,
} from "@graphty/webgpu-graph-algorithms";
import { createNodeGpuContext } from "@graphty/webgpu-graph-algorithms/node";

const ctx = await createNodeGpuContext();

// a tail into a 3-cycle: 0 -> 1 -> 2 -> 3 -> 1
const graph = fromEdgeArrays({
    directed: true,
    nodeCount: 4,
    src: new Uint32Array([0, 1, 2, 3]),
    dst: new Uint32Array([1, 2, 3, 1]),
});

const ranks = await pageRank(ctx, graph, { dampingFactor: 0.85 });
console.log(ranks.scores[0] < ranks.scores[1]); // true
console.log(ranks.precision); // f32

// restart every walk at node 0
const bias = new Float32Array(graph.nodeCount);
bias[0] = 1;
const near = await personalizedPageRank(ctx, graph, bias);
console.log(near.scores.length); // 4

const { hubs, authorities } = await hits(ctx, graph);
console.log(hubs.length, authorities.length); // 4 4

const eigen = await eigenvectorCentrality(ctx, graph, { maxIterations: 100 });
const katz = await katzCentrality(ctx, graph, { alpha: 0.1, beta: 1 });
console.log(eigen.scores.length, katz.scores.length); // 4 4

ctx.release(graph);
ctx.dispose();
