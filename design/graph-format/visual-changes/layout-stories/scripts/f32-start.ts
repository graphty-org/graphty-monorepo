// The new layouts keep the start positions as float32. Run the OLD code from the float32-rounded start:
// if that reproduces the new picture, the rounding of the start is the whole difference.
import { generateGraph, toSnapshot } from "../../../../../layout/stories/utils/graph-generators.ts";
import { beforeLayout } from "./before.ts";
import * as A from "../../../../../layout/src/index.ts";

const B = await import(beforeLayout());
type Pos = Record<string, number[]>;
const g = generateGraph("random", 10, 42);
const snap = toSnapshot(g);
const legacy = { nodes: () => g.nodes.map((x) => x.id), edges: () => g.edges.map((e) => [e.source, e.target]) };
const f32 = (p: Pos): Pos => Object.fromEntries(Object.entries(p).map(([k, v]) => [k, v.map(Math.fround)]));
const maxMove = (a: Pos, b: Pos) =>
    Math.max(...Object.keys(a).map((k) => Math.hypot(...a[k].map((v, i) => v - b[k][i]))));
const startDelta = (p: Pos) => Math.max(...Object.values(p).flatMap((v) => v.map((x) => Math.abs(x - Math.fround(x)))));

const arfStart: Pos = B.randomLayout(legacy, null, 2, 42);
const arfAfter = A.toPositionMap(A.arf(snap, { maxIter: 1000, seed: 42 }), snap.ids) as Pos;
console.log("ARF: largest start rounding", startDelta(arfStart).toExponential(2));
console.log(
    "ARF: old code from the float32 start vs after",
    maxMove(B.arfLayout(legacy, f32(arfStart), 1, 1.1, 1000, 42), arfAfter).toExponential(2),
);
console.log(
    "ARF: old code from the float64 start vs old code from the float32 start",
    maxMove(
        B.arfLayout(legacy, arfStart, 1, 1.1, 1000, 42),
        B.arfLayout(legacy, f32(arfStart), 1, 1.1, 1000, 42),
    ).toExponential(2),
);

const kkStart: Pos = B.randomLayout(legacy, null, 3, 42);
const kkAfter = A.toPositionMap(A.kamadaKawai(snap, { scale: 1, center: [0, 0, 0], dim: 3 }), snap.ids) as Pos;
console.log("KK3D: largest start rounding", startDelta(kkStart).toExponential(2));
console.log(
    "KK3D: old code from the float32 start vs after",
    maxMove(B.kamadaKawaiLayout(legacy, null, f32(kkStart), "weight", 1, [0, 0, 0], 3), kkAfter).toExponential(2),
);
console.log(
    "KK3D: old code from the float64 start vs old code from the float32 start",
    maxMove(
        B.kamadaKawaiLayout(legacy, null, kkStart, "weight", 1, [0, 0, 0], 3),
        B.kamadaKawaiLayout(legacy, null, f32(kkStart), "weight", 1, [0, 0, 0], 3),
    ).toExponential(2),
);
