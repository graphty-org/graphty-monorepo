import { fromEdgeArrays } from "@graphty/graph-format";

// a directed graph with a duplicate edge (0 -> 1 twice) and a self-loop (3 -> 3)
const snapshot = fromEdgeArrays({
    directed: true,
    nodeCount: 4,
    src: new Uint32Array([0, 0, 1, 2, 3]),
    dst: new Uint32Array([1, 1, 2, 0, 3]),
});

// views: computed on first use, cached, and shared -- copy one with .slice() before writing to it
console.log(snapshot.outDegree()); // Uint32Array(4) [ 2, 1, 1, 1 ]
console.log(snapshot.inDegree()); // Uint32Array(4) [ 1, 2, 1, 1 ]
const reverse = snapshot.reverse(); // who points at each node
console.log(Array.from(reverse.colIdx.subarray(reverse.rowPtr[1], reverse.rowPtr[2]))); // [ 0, 0 ]

// derived graphs: new snapshots, with maps back to the one they came from
const simple = snapshot.simplified();
console.log(simple.snapshot.edgeCount, simple.edgeRemap); // 4 Uint32Array(5) [ 0, 0, 1, 2, 3 ]

const noLoops = snapshot.withoutSelfLoops();
console.log(noLoops.snapshot.flags.hasSelfLoops); // false

const sub = snapshot.inducedSubgraph(new Uint32Array([1, 2]));
console.log(sub.snapshot.nodeCount, sub.snapshot.edgeCount, sub.nodeOrigin); // 2 1 Uint32Array(2) [ 1, 2 ]

// toUndirected() merges a -> b with b -> a; the two 0 -> 1 edges are parallel, not reciprocal, so both stay
const undirected = snapshot.toUndirected();
console.log(undirected.snapshot.directed, undirected.snapshot.edgeCount); // false 5
