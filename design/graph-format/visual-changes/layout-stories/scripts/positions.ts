// Before (layout at 77c84820, the end of phase 5) against after (this branch) for the layout calls of
// the changed stories at their default arguments, plus the experiments that locate each difference.
import { generateGraph, toSnapshot } from "../../../../../layout/stories/utils/graph-generators.ts";
import { beforeLayout } from "./before.ts";
import * as A from "../../../../../layout/src/index.ts";

const B = await import(beforeLayout());
type Pos = Record<string, number[]>;
const graph = (t: string, n: number) => {
    const g = generateGraph(t as never, n, 42);
    return {
        g,
        legacy: { nodes: () => g.nodes.map((x) => x.id), edges: () => g.edges.map((e) => [e.source, e.target]) },
        snap: toSnapshot(g),
    };
};
const maxMove = (a: Pos, b: Pos) =>
    Math.max(...Object.keys(a).map((k) => Math.hypot(...a[k].map((v, i) => v - b[k][i]))));
const rows = (p: Pos, ids: string[], dim: number) => Float32Array.from(ids.flatMap((id) => p[id].slice(0, dim)));
const f32 = (p: Pos): Pos => Object.fromEntries(Object.entries(p).map(([k, v]) => [k, v.map(Math.fround)]));
const span = (p: Pos) => {
    const v = Object.values(p).flat();
    return Math.max(...v) - Math.min(...v);
};
const log = (name: string, d: number, extra = "") => console.log(`${name.padEnd(58)} ${d.toExponential(3)} ${extra}`);

{
    const { legacy, snap } = graph("random", 10);
    const ids = [...Array(snap.nodeCount).keys()].map((i) => String(snap.ids.idOf(i)));
    const before: Pos = B.arfLayout(legacy, null, 1, 1.1, 1000, 42);
    const after = A.toPositionMap(A.arf(snap, { scaling: 1, a: 1.1, maxIter: 1000, seed: 42 }), snap.ids) as Pos;
    log("ARF: max node move, before -> after", maxMove(before, after), `(layout span ${span(before).toFixed(2)})`);
    const oldStart: Pos = B.randomLayout(legacy, null, 2, 42);
    const newStart = A.toPositionMap(A.arf(snap, { maxIter: 0, seed: 42 }), snap.ids) as Pos;
    log("ARF: start positions, old random draw vs new seed draw", maxMove(f32(oldStart), newStart));
    const fromOld = A.toPositionMap(
        A.arf(snap, { maxIter: 1000, seed: 42, pos: rows(oldStart, ids, 2) }),
        snap.ids,
    ) as Pos;
    log("ARF: after, started from the old start, vs before", maxMove(before, fromOld));
}
for (const dim of [2, 3] as const) {
    const { legacy, snap } = graph("random", 10);
    const ids = [...Array(snap.nodeCount).keys()].map((i) => String(snap.ids.idOf(i)));
    const c = dim === 3 ? [0, 0, 0] : [0, 0];
    const before: Pos = B.kamadaKawaiLayout(legacy, null, null, "weight", 1, c, dim);
    const after = A.toPositionMap(A.kamadaKawai(snap, { scale: 1, center: c, dim }), snap.ids) as Pos;
    log(
        `KamadaKawai ${dim}D: max node move, before -> after`,
        maxMove(before, after),
        `(layout span ${span(before).toFixed(2)})`,
    );
    if (dim === 3) {
        const oldStart: Pos = B.randomLayout(legacy, null, 3, 42);
        const fromOld = A.toPositionMap(
            A.kamadaKawai(snap, { scale: 1, center: c, dim, pos: rows(oldStart, ids, 3) }),
            snap.ids,
        ) as Pos;
        log("KamadaKawai 3D: after, started from the old start, vs before", maxMove(before, fromOld));
    }
    const ecc = snap.nodeCount;
    void ecc;
}
{
    const { legacy, snap } = graph("complete", 20);
    const before: Pos = B.circularLayout(legacy, 200, [0, 0, 0], 3);
    const after = A.toPositionMap(A.circular(snap, { scale: 200, center: [0, 0, 0], dim: 3 }), snap.ids) as Pos;
    log("Spherical: max node move, before -> after", maxMove(before, after), `(radius 200)`);
    log("Spherical: after vs before rounded to float32", maxMove(f32(before), after));
}
