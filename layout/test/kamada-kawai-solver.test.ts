import { assert, describe, it } from "vitest";

import { _computeShortestPathDistances, _kamadaKawaiSolve } from "../src/algorithms/optimization";

/**
 * The quantity the solver minimises, less the tiny centring term: half the squared relative
 * error between each pair's drawn distance and the distance it was asked for.
 */
function kkCost(positions: number[][], dist: number[][]): number {
    let cost = 0;
    for (let i = 0; i < positions.length; i++) {
        for (let j = i + 1; j < positions.length; j++) {
            const drawn = Math.hypot(...positions[i].map((v, d) => v - positions[j][d]));
            cost += 0.5 * (drawn / (dist[i][j] + 1e-3) - 1) ** 2;
        }
    }
    return cost;
}

/**
 * A ring with chords whose edge weights run 1..31, as a co-occurrence graph's do. Distances are
 * 1/weight, so they span thirty-fold and the first gradient from a circle is large -- the case
 * where the solver used to take steps uphill.
 */
function nonUniformDistances(n: number): number[][] {
    let seed = 7;
    const next = (): number => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
    const weights = new Map<string, number>();
    const edges: [number, number][] = [];
    const add = (a: number, b: number): void => {
        edges.push([a, b]);
        weights.set(`${a}-${b}`, 1 + Math.floor(next() * 31));
    };
    for (let i = 0; i < n; i++) {
        add(i, (i + 1) % n);
    }
    for (let i = 0; i < n; i += 3) {
        add(i, Math.floor(next() * n));
    }
    const nodes = [...Array(n).keys()];
    const graph = {
        nodes: () => nodes,
        edges: () => edges,
        getEdgeData: (s: number, t: number) => {
            const w = weights.get(`${s}-${t}`) ?? weights.get(`${t}-${s}`);
            return w === undefined ? undefined : 1 / w;
        },
    };
    const map = _computeShortestPathDistances(graph as never, "weight");
    return nodes.map((i) => nodes.map((j) => map[i][j]));
}

describe("the Kamada-Kawai solver", () => {
    it("ends well below its circular start on non-uniform distances, in 2D and 3D", () => {
        const n = 40;
        const dist = nonUniformDistances(n);

        for (const dim of [2, 3]) {
            const start = [...Array(n).keys()].map((i) => {
                const t = (2 * Math.PI * i) / n;
                return dim === 2 ? [Math.cos(t), Math.sin(t)] : [Math.cos(t), Math.sin(t), 0.1 * Math.sin(3 * t)];
            });
            const before = kkCost(start, dist);
            const after = kkCost(_kamadaKawaiSolve(dist, start, dim), dist);

            assert.isBelow(after, before / 2, `dim ${String(dim)}: cost ${after.toFixed(1)} from ${before.toFixed(1)}`);
        }
    });
});
