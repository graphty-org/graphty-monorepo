// Does the ARF difference come from the order the nodes are summed in, and how far does it grow per iteration?
import { generateGraph, toSnapshot } from "../../../../../layout/stories/utils/graph-generators.ts";
import { beforeLayout } from "./before.ts";
import * as A from "../../../../../layout/src/index.ts";

const B = await import(beforeLayout());
const g = generateGraph("random", 10, 42);
const snap = toSnapshot(g);
const legacyNodes = g.nodes.map((x) => x.id);
const snapNodes = [...Array(snap.nodeCount).keys()].map((i) => snap.ids.idOf(i));
console.log("legacy node order ", legacyNodes.join(","));
console.log("snapshot node order", snapNodes.join(","));
const edges = g.edges.map((e) => [e.source, e.target]);
console.log("edges", edges.length, "distinct undirected", new Set(edges.map(([a, b]) => [a, b].sort().join("-"))).size);
type Pos = Record<string, number[]>;
const maxMove = (a: Pos, b: Pos) =>
    Math.max(...Object.keys(a).map((k) => Math.hypot(...a[k].map((v, i) => v - b[k][i]))));
for (const iters of [1, 10, 50, 100, 200, 400, 700, 1000]) {
    const before: Pos = B.arfLayout({ nodes: () => legacyNodes, edges: () => edges }, null, 1, 1.1, iters, 42);
    const reordered: Pos = B.arfLayout({ nodes: () => snapNodes, edges: () => edges }, null, 1, 1.1, iters, 42);
    const after = A.toPositionMap(A.arf(snap, { maxIter: iters, seed: 42 }), snap.ids) as Pos;
    console.log(
        `iters ${String(iters).padStart(4)}  before->after ${maxMove(before, after).toExponential(2)}  before-in-snapshot-order->after ${maxMove(reordered, after).toExponential(2)}`,
    );
}
