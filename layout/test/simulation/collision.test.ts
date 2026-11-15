/**
 * setCollision (issue #3256): a force like d3's forceCollide on the CPU simulations. Off by default, it keeps every
 * two nodes at least the sum of their radii apart, moves no fixed or inert row, and pulls coincident nodes apart.
 */

import assert from "node:assert";

import { type F32, fromEdgeArrays, type GraphSnapshot, makeMask, maskSet } from "@graphty/graph-format";
import { describe, it } from "vitest";

import { ForceAtlas2Simulation } from "../../src/simulation/forceatlas2";
import { FruchtermanReingoldSimulation } from "../../src/simulation/fruchterman-reingold";
import { Lcg } from "../../src/simulation/seed";
import type { LayoutSimulation } from "../../src/simulation/types";

/** A connected graph of `n` nodes: a ring with a seeded chord per node, the shape of a dense small world. */
function graph(n: number): GraphSnapshot {
    const random = new Lcg(5);
    const src: number[] = [];
    const dst: number[] = [];
    for (let i = 0; i < n; i++) {
        src.push(i, i);
        dst.push((i + 1) % n, (i + 2 + Math.floor(random.next() * (n - 3))) % n);
    }
    return fromEdgeArrays({ directed: false, nodeCount: n, src: Uint32Array.from(src), dst: Uint32Array.from(dst) });
}

/** The worst shortfall of any pair, as a share of the distance it should keep: 0 when nothing overlaps. */
function worstOverlap(positions: F32, radii: F32, n: number): number {
    let worst = 0;
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            const d = Math.hypot(
                positions[3 * i] - positions[3 * j],
                positions[3 * i + 1] - positions[3 * j + 1],
                positions[3 * i + 2] - positions[3 * j + 2],
            );
            worst = Math.max(worst, 1 - d / (radii[i] + radii[j]));
        }
    }
    return worst;
}

/** Runs a loaded simulation until it settles. */
function run(simulation: LayoutSimulation): void {
    while (!simulation.settled) {
        void simulation.step(1);
    }
}

/** Each simulation, and `scale` for radii in step with how far it spreads: ForceAtlas2 goes far past its own `scale`. */
const SIMULATIONS: readonly (readonly [string, (dim: 2 | 3) => LayoutSimulation, number])[] = [
    ["ForceAtlas2", (dim) => new ForceAtlas2Simulation({ dim, scale: 100, seed: 3, maxIter: 80 }), 100],
    [
        "Fruchterman-Reingold",
        (dim) => new FruchtermanReingoldSimulation({ dim, scale: 100, seed: 3, iterations: 80 }),
        1,
    ],
];

describe.each(SIMULATIONS)("%s setCollision", (_name, create, scale) => {
    const n = 200;
    /** A loaded simulation and its array. */
    function loaded(dim: 2 | 3): { simulation: LayoutSimulation; positions: F32 } {
        const positions = new Float32Array(3 * n).fill(Number.NaN);
        const simulation = create(dim);
        simulation.load(graph(n), positions);
        return { simulation, positions };
    }

    it.each([2, 3] as const)("keeps nodes of different sizes apart in %iD", (dim) => {
        const { simulation, positions } = loaded(dim);
        const radii = Float32Array.from({ length: n }, (_, i) => 1 + (i % 4));
        simulation.setCollision?.({ radii, scale });
        run(simulation);
        assert(
            worstOverlap(
                positions,
                radii.map((r) => r * scale),
                n,
            ) < 1e-3,
        );
    });

    it("is off until set, and null takes it off", () => {
        const plain = loaded(2);
        run(plain.simulation);
        const off = loaded(2);
        off.simulation.setCollision?.({ radii: new Float32Array(n).fill(50) });
        off.simulation.setCollision?.(null);
        run(off.simulation);
        assert.deepStrictEqual(off.positions, plain.positions);
    });

    it("never moves a fixed or an inert row, and an inert row pushes nothing", () => {
        const { simulation, positions } = loaded(2);
        const held = makeMask(n);
        maskSet(held, 0, true);
        const inert = makeMask(n);
        maskSet(inert, 1, true);
        simulation.setFixed(held);
        simulation.setInert?.(inert);
        const before = positions.slice(0, 6);
        const radii = new Float32Array(n).fill(3);
        simulation.setCollision?.({ radii, scale });
        run(simulation);
        assert.deepStrictEqual(positions.slice(0, 6), before);
        for (let i = 2; i < n; i++) {
            assert(
                Math.hypot(positions[0] - positions[3 * i], positions[1] - positions[3 * i + 1]) >= 6 * scale * 0.999,
            );
        }
    });

    it("flat compares across x and y only", () => {
        const { simulation, positions } = loaded(3);
        const radii = new Float32Array(n).fill(3);
        simulation.setCollision?.({ radii, scale, flat: true });
        run(simulation);
        const flatten = positions.slice();
        for (let i = 0; i < n; i++) {
            flatten[3 * i + 2] = 0;
        }
        assert(
            worstOverlap(
                flatten,
                radii.map((r) => r * scale),
                n,
            ) < 1e-3,
        );
    });

    it("parts coincident nodes", () => {
        const positions = new Float32Array(3 * n).fill(1);
        const simulation = create(2);
        simulation.load(graph(n), positions);
        const radii = new Float32Array(n).fill(3);
        simulation.setCollision?.({ radii, scale });
        run(simulation);
        assert(
            worstOverlap(
                positions,
                radii.map((r) => r * scale),
                n,
            ) < 1e-3,
        );
    });

    it("refuses radii of the wrong length, and negative or infinite values", () => {
        const { simulation } = loaded(2);
        assert.throws(() => {
            simulation.setCollision?.({ radii: new Float32Array(1) });
        }, RangeError);
        assert.throws(() => {
            simulation.setCollision?.({ radii: new Float32Array(n).fill(-1) });
        }, RangeError);
        assert.throws(() => {
            simulation.setCollision?.({ radii: new Float32Array(n), scale: 0 });
        }, RangeError);
    });

    it("a new node count clears it", () => {
        const { simulation } = loaded(2);
        simulation.setCollision?.({ radii: new Float32Array(n).fill(5) });
        const positions = new Float32Array(3 * 50).fill(Number.NaN);
        simulation.load(graph(50), positions);
        run(simulation);
        assert(positions.every((v) => Number.isFinite(v)));
    });
});
