import { fromEdgeArrays } from "@graphty/graph-format";
import { acquireAccelerator } from "@graphty/webgpu-graph-algorithms/acquire";

const graph = fromEdgeArrays({
    directed: true,
    nodeCount: 3,
    src: new Uint32Array([0, 1]),
    dst: new Uint32Array([1, 2]),
});

const gpu = acquireAccelerator(); // nothing is probed until the first current()
const result = await gpu.current();
if (result.ok) {
    const ranks = await result.accelerator.pageRank(graph);
    console.log(ranks.scores.length); // 3
    result.accelerator.release(graph);
} else {
    // decided before any work ran: E_NO_WEBGPU, E_NO_ADAPTER, E_SOFTWARE_ONLY or E_DEVICE_INCORRECT
    console.warn(`no GPU: ${result.code} ${result.reason}`, result.fix ?? "");
}
gpu.dispose();
