import { fromEdgeArrays } from "@graphty/graph-format";
import { hasErrorCode, isWebGpuGraphError, pageRank } from "@graphty/webgpu-graph-algorithms";
import { createNodeGpuContext } from "@graphty/webgpu-graph-algorithms/node";

const ctx = await createNodeGpuContext();
const graph = fromEdgeArrays({ directed: true, nodeCount: 2, src: new Uint32Array([0]), dst: new Uint32Array([1]) });

try {
    await pageRank(ctx, graph, { maxIterations: 0 });
} catch (error) {
    console.log(isWebGpuGraphError(error)); // true
    console.log(hasErrorCode(error, "E_INVALID_ARGUMENT")); // true
}

ctx.release(graph);
ctx.dispose();
