import { assert, describe, it } from "vitest";

import { _computeShortestPathDistances, _kamadaKawaiSolve } from "../src/algorithms/optimization";
import { _kamadaKawaiCostfn } from "../src/algorithms/optimization/kamada-kawai-solver";

/**
 * The quantity the solver minimises, less the tiny centring term: half the squared relative
 * error between each pair's drawn distance and the distance it was asked for.
 */
function kkCost(positions: number[][], dist: number[][]): number {
    let cost = 0;
    for (let i = 0; i < positions.length; i++) {
        for (let j = i + 1; j < positions.length; j++) {
            const drawn = Math.hypot(...positions[i].map((v, d) => v - positions[j][d]));
            cost += 0.5 * (drawn / dist[i][j] - 1) ** 2;
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

    it("computes networkx's cost and gradient: every ordered pair, 1 / d off the diagonal", () => {
        // networkx 3.1 _kamada_kawai_costfn on this input, with invdist = 1 / (dist + 1e-3 * eye).
        const dist = [
            [0, 1, 2],
            [1, 0, 1],
            [2, 1, 0],
        ];
        const invDist = dist.map((row) => row.map((d) => (d === 0 ? 0 : 1 / d)));
        const [cost, grad] = _kamadaKawaiCostfn([0, 0, 0, 1.5, 0.5, 0, 0.3, 2, 1], invDist, 1e-3, 3);
        const expected = [
            -1.1178607417455915, -0.4785600536104517, -0.05575779282206374, 2.396216372203908, -1.2446842424148454,
            -1.0754858069207798, -1.2729556304583165, 1.730744296025297, 1.1342435997428433,
        ];

        assert.closeTo(cost, 1.7180829397543822, 1e-9);
        grad.forEach((g, i) => assert.closeTo(g, expected[i], 1e-9, `gradient ${String(i)}`));
    });

    it("draws two nodes exactly the distance apart they ask for", () => {
        const [a, b] = _kamadaKawaiSolve(
            [
                [0, 2],
                [2, 0],
            ],
            [
                [0, 0],
                [0.5, 0],
            ],
            2,
        );

        assert.closeTo(Math.hypot(a[0] - b[0], a[1] - b[1]), 2, 1e-4);
    });
});
