import { fromEdgeArrays } from "@graphty/graph-format";
import { createForceAtlas2 } from "@graphty/webgpu-graph-algorithms";
import { createNodeGpuContext } from "@graphty/webgpu-graph-algorithms/node";

const ctx = await createNodeGpuContext();

// layouts take an undirected snapshot: a ring of 6 nodes
const graph = fromEdgeArrays({
    directed: false,
    nodeCount: 6,
    src: new Uint32Array([0, 1, 2, 3, 4, 5]),
    dst: new Uint32Array([1, 2, 3, 4, 5, 0]),
});

// x, y, z per node; NaN rows are placed from the seed when the simulation loads
const positions = new Float32Array(3 * graph.nodeCount).fill(Number.NaN);

const sim = createForceAtlas2(ctx, { seed: 42, dim: 2, maxIter: 100 });
sim.load(graph, positions);
const stats = await sim.run({ batch: 10 }); // until settled or maxIter
console.log(sim.settled); // true
console.log(stats.repulsionTier); // exact
console.log(positions.every(Number.isFinite)); // true

sim.dispose();
ctx.release(graph);
ctx.dispose();
