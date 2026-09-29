// The changed stories' layout calls over every graph type in their controls (10 nodes, seed 42): before vs after,
// as a fraction of the layout's span, so a reader who changes the controls knows what moves.
import { generateGraph, toSnapshot } from "../../../../../layout/stories/utils/graph-generators.ts";
import { beforeLayout } from "./before.ts";
import * as A from "../../../../../layout/src/index.ts";

const B = await import(beforeLayout());
type Pos = Record<string, number[]>;
const maxMove = (a: Pos, b: Pos) =>
    Math.max(...Object.keys(a).map((k) => Math.hypot(...a[k].map((v, i) => v - b[k][i]))));
const span = (p: Pos) => {
    const v = Object.values(p).flat();
    return Math.max(...v) - Math.min(...v);
};
for (const t of ["tree", "random", "grid", "cycle", "complete", "star", "path"]) {
    const g = generateGraph(t as never, 10, 42);
    const snap = toSnapshot(g);
    const legacy = { nodes: () => g.nodes.map((x) => x.id), edges: () => g.edges.map((e) => [e.source, e.target]) };
    const m = (a: Pos, b: Pos) => (maxMove(a, b) / span(a)).toExponential(1);
    const arf = m(
        B.arfLayout(legacy, null, 1, 1.1, 1000, 42),
        A.toPositionMap(A.arf(snap, { maxIter: 1000, seed: 42 }), snap.ids) as Pos,
    );
    const kk2 = m(
        B.kamadaKawaiLayout(legacy, null, null, "weight", 1, [0, 0], 2),
        A.toPositionMap(A.kamadaKawai(snap, { center: [0, 0] }), snap.ids) as Pos,
    );
    const kk3 = m(
        B.kamadaKawaiLayout(legacy, null, null, "weight", 1, [0, 0, 0], 3),
        A.toPositionMap(A.kamadaKawai(snap, { center: [0, 0, 0], dim: 3 }), snap.ids) as Pos,
    );
    console.log(`${t.padEnd(9)} arf ${arf}  kamadaKawai 2D ${kk2}  kamadaKawai 3D ${kk3}`);
}
