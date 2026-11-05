import assert from "node:assert";

import { fromEdgeArrays } from "@graphty/graph-format";
import { barabasiAlbertGraph } from "@graphty/graph-samples/generators";
import { describe, it } from "vitest";

import { BarnesHutTree } from "../../src/simulation/barnes-hut";
import { ForceAtlas2Simulation } from "../../src/simulation/forceatlas2";
import { Lcg } from "../../src/simulation/seed";

/** n random stride-3 positions in [-1, 1) (z = 0 in 2D) and masses in [1, 4). */
function cloud(n: number, dim: 2 | 3, seed: number) {
    const rng = new Lcg(seed);
    const pos = new Float64Array(3 * n);
    const mass = new Float64Array(n);
    for (let i = 0; i < n; i++) {
        pos[3 * i] = rng.next() * 2 - 1;
        pos[3 * i + 1] = rng.next() * 2 - 1;
        pos[3 * i + 2] = dim === 3 ? rng.next() * 2 - 1 : 0;
        mass[i] = 1 + 3 * rng.next();
    }
    return { pos, mass };
}

/** The sum over j != i of m_j (p_i - p_j) / d^2 through the tree (exact visits summed the same way), and its work. */
function treeSum(tree: BarnesHutTree, i: number, pos: Float64Array, mass: Float64Array, theta: number) {
    const out = new Float64Array(3);
    const visits = tree.repel(i, pos, theta, out, (j) => {
        const dx = pos[3 * i] - pos[3 * j];
        const dy = pos[3 * i + 1] - pos[3 * j + 1];
        const dz = pos[3 * i + 2] - pos[3 * j + 2];
        const s = mass[j] / (dx * dx + dy * dy + dz * dz);
        out[0] += dx * s;
        out[1] += dy * s;
        out[2] += dz * s;
    });
    return { out, visits };
}

/** The exact sum, and the sum of its terms' magnitudes (what the error of an approximation is measured against). */
function exactSum(i: number, pos: Float64Array, mass: Float64Array, n: number) {
    const out = [0, 0, 0, 0];
    for (let j = 0; j < n; j++) {
        if (j !== i) {
            const dx = pos[3 * i] - pos[3 * j];
            const dy = pos[3 * i + 1] - pos[3 * j + 1];
            const dz = pos[3 * i + 2] - pos[3 * j + 2];
            const d2 = dx * dx + dy * dy + dz * dz;
            const s = mass[j] / d2;
            out[0] += dx * s;
            out[1] += dy * s;
            out[2] += dz * s;
            out[3] += mass[j] / Math.sqrt(d2);
        }
    }
    return out;
}

describe("BarnesHutTree", () => {
    for (const dim of [2, 3] as const) {
        it(`${dim}D: theta near 0 visits every other node once; theta 1.2 visits a small share, within 5% of the force's terms`, () => {
            const n = 2000;
            const { pos, mass } = cloud(n, dim, 5);
            const tree = new BarnesHutTree(dim);
            tree.build(pos, mass, n);
            let visits12 = 0;
            for (const i of [0, 17, 999, 1999]) {
                const exact = exactSum(i, pos, mass, n);
                const all = treeSum(tree, i, pos, mass, 1e-9);
                assert.equal(all.visits, n - 1);
                for (let a = 0; a < 3; a++) {
                    assert.ok(Math.abs(all.out[a] - exact[a]) <= 1e-9 * (1 + Math.abs(exact[a])));
                }
                const far = treeSum(tree, i, pos, mass, 1.2);
                visits12 += far.visits;
                const err = Math.hypot(far.out[0] - exact[0], far.out[1] - exact[1], far.out[2] - exact[2]);
                assert.ok(err <= 0.05 * exact[3], `node ${i}: error ${err} of ${exact[3]}`);
            }
            // the counted work: O(log n) cells and near nodes per node, not the n - 1 of every pair
            assert.ok(visits12 / 4 < n / 8, `${visits12 / 4} interactions per node`);
        });
    }

    it("keeps coincident nodes in one leaf and visits them pair by pair", () => {
        const n = 50;
        const pos = new Float64Array(3 * n).fill(0.25);
        const mass = new Float64Array(n).fill(1);
        const tree = new BarnesHutTree(2);
        tree.build(pos, mass, n);
        const seen: number[] = [];
        const out = new Float64Array(3);
        assert.equal(
            tree.repel(3, pos, 1.2, out, (j) => seen.push(j)),
            n - 1,
        );
        assert.deepEqual(
            seen.sort((a, b) => a - b),
            [...Array(n).keys()].filter((j) => j !== 3),
        );
        assert.deepEqual(Array.from(out), [0, 0, 0]);
    });

    it("rebuilds over another node count and an empty graph", () => {
        const tree = new BarnesHutTree(3);
        const big = cloud(300, 3, 9);
        tree.build(big.pos, big.mass, 300);
        const small = cloud(3, 3, 2);
        tree.build(small.pos, small.mass, 3);
        assert.equal(treeSum(tree, 0, small.pos, small.mass, 1.2).visits, 2);
        tree.build(new Float64Array(0), new Float64Array(0), 0);
    });
});

describe("ForceAtlas2Simulation: barnesHutOptimize", () => {
    const g = barabasiAlbertGraph({ n: 1500, m: 2, seed: 3 });
    const s = fromEdgeArrays({ directed: false, nodeCount: g.nodeCount, src: g.src, dst: g.dst });

    function settle(options: ConstructorParameters<typeof ForceAtlas2Simulation>[0]) {
        const positions = new Float32Array(3 * s.nodeCount).fill(Number.NaN);
        const sim = new ForceAtlas2Simulation({ seed: 4, maxIter: 2000, ...options });
        sim.load(s, positions);
        while (!sim.settled) {
            sim.step(50);
        }
        return { positions, iterations: sim.iterationsDone };
    }

    it("settles 1,500 nodes to a finite, spread-out drawing, deterministic for a seed", () => {
        const a = settle({ barnesHutOptimize: true });
        const b = settle({ barnesHutOptimize: true });
        assert.ok(a.iterations < 2000, `settled by the window, not the budget (${a.iterations})`);
        assert.deepEqual(Array.from(a.positions), Array.from(b.positions));
        let min = Infinity;
        for (let i = 1; i < 200; i++) {
            const d = Math.hypot(a.positions[0] - a.positions[3 * i], a.positions[1] - a.positions[3 * i + 1]);
            min = Math.min(min, d);
        }
        assert.ok(Number.isFinite(min) && min > 0);
    });

    it("changes nothing when off, and validates barnesHutTheta", () => {
        const positions = (o: object) => {
            const p = new Float32Array(3 * s.nodeCount).fill(Number.NaN);
            const sim = new ForceAtlas2Simulation({ seed: 4, ...o });
            sim.load(s, p);
            sim.step(3);
            return Array.from(p);
        };
        assert.deepEqual(positions({ barnesHutOptimize: false, barnesHutTheta: 0.5 }), positions({}));
        assert.notDeepEqual(positions({ barnesHutOptimize: true }), positions({}));
        assert.throws(() => new ForceAtlas2Simulation({ barnesHutOptimize: true, barnesHutTheta: 0 }), RangeError);
        assert.throws(() => new ForceAtlas2Simulation({ barnesHutOptimize: "yes" as unknown as boolean }), TypeError);
    });
});
