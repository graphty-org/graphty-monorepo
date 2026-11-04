/**
 * The two guards cosmos.gl added after bugs, over every CPU force layout (issue #3255): nodes that start on one point
 * are pushed apart, and no tick throws a node far beyond the layout. ForceAtlas2 has no displacement clamp by design
 * (plan D25, a clamp caps the layout's expansion): its bound is the speed controller, so these tests hold the
 * controller to it, including while it has nothing to measure because every node is pinned.
 */

import assert from "node:assert";

import { type F32, fromEdgeArrays, type GraphSnapshot, makeMask, maskSet } from "@graphty/graph-format";
import { describe, it } from "vitest";

import { arf } from "../../src/indexed/arf";
import { ForceAtlas2Simulation } from "../../src/simulation/forceatlas2";
import { FruchtermanReingoldSimulation } from "../../src/simulation/fruchterman-reingold";

/** A ring with chords: 2n edges, every node of degree 4 (mass 5), so the seeded start is under real force. */
function ring(n: number): GraphSnapshot {
    const src: number[] = [];
    const dst: number[] = [];
    for (let i = 0; i < n; i++) {
        src.push(i, i);
        dst.push((i + 1) % n, (i * 7 + 3) % n);
    }
    return fromEdgeArrays({ directed: false, nodeCount: n, src: Uint32Array.from(src), dst: Uint32Array.from(dst) });
}

/** A stride-3 start of radius about 4, z 0. */
function spread(n: number): F32 {
    return Float32Array.from({ length: 3 * n }, (_, i) => (i % 3 === 2 ? 0 : Math.sin(i * 12.9) * 3));
}

function maxMove(a: F32, b: F32): number {
    let worst = 0;
    for (let i = 0; i < a.length; i += 3) {
        worst = Math.max(worst, Math.hypot(a[i] - b[i], a[i + 1] - b[i + 1], a[i + 2] - b[i + 2]));
    }
    return worst;
}

function radius(p: F32): number {
    let worst = 0;
    for (let i = 0; i < p.length; i += 3) {
        worst = Math.max(worst, Math.hypot(p[i], p[i + 1], p[i + 2]));
    }
    return worst;
}

/** The smallest distance between two rows of `dim` values. */
function minGap(p: ArrayLike<number>, stride: number): number {
    let gap = Number.POSITIVE_INFINITY;
    for (let i = 0; i < p.length; i += stride) {
        for (let j = i + stride; j < p.length; j += stride) {
            let sq = 0;
            for (let k = 0; k < stride; k++) {
                sq += (p[i + k] - p[j + k]) ** 2;
            }
            gap = Math.min(gap, Math.sqrt(sq));
        }
    }
    return gap;
}

function allPinned(n: number): ReturnType<typeof makeMask> {
    const mask = makeMask(n);
    for (let i = 0; i < n; i++) {
        maskSet(mask, i, true);
    }
    return mask;
}

const N = 30;

describe("nodes that start on one point are pushed apart", () => {
    for (const dim of [2, 3] as const) {
        for (const barnesHutOptimize of [false, true]) {
            it(`ForceAtlas2, ${dim}D, Barnes-Hut ${barnesHutOptimize}`, () => {
                const positions = new Float32Array(3 * N);
                const sim = new ForceAtlas2Simulation({ dim, barnesHutOptimize, settleThreshold: 0 });
                sim.load(ring(N), positions);
                sim.step(20);
                assert.ok(minGap(positions, 3) > 1e-3, `closest pair ${minGap(positions, 3)}`);
            });
        }

        it(`Fruchterman-Reingold, ${dim}D`, () => {
            const positions = new Float32Array(3 * N);
            const sim = new FruchtermanReingoldSimulation({ dim, iterations: 50, settleThreshold: 0 });
            sim.load(ring(N), positions);
            sim.step(50);
            assert.ok(minGap(positions, 3) > 1e-3, `closest pair ${minGap(positions, 3)}`);
        });

        it(`ARF, ${dim}D`, () => {
            const { positions } = arf(ring(N), { dim, pos: new Float32Array(dim * N), maxIter: 200 });
            assert.ok(minGap(positions, dim) > 1e-3, `closest pair ${minGap(positions, dim)}`);
        });
    }
});

describe("no tick throws a node beyond the layout", () => {
    it("Fruchterman-Reingold moves a node at most the temperature, even from one point", () => {
        const positions = new Float32Array(3 * N);
        const sim = new FruchtermanReingoldSimulation({ iterations: 50, settleThreshold: 0 });
        sim.load(ring(N), positions);
        for (let tick = 0; tick < 50; tick++) {
            const cap = sim.temperature;
            const before = positions.slice();
            sim.step();
            assert.ok(maxMove(before, positions) <= cap * (1 + 1e-5), `tick ${tick} moved past ${cap}`);
        }
    });

    for (const compat of ["paper", "networkx"] as const) {
        it(`ForceAtlas2 (${compat}): a drag in a running layout moves no node as far as the layout's radius`, () => {
            const positions = spread(N);
            const sim = new ForceAtlas2Simulation({ compat, settleThreshold: 0, maxIter: 1e9 });
            sim.load(ring(N), positions);
            sim.step(500);
            const r = radius(positions);
            sim.setPosition(0, positions[0] + r, positions[1], 0);
            for (let tick = 0; tick < 50; tick++) {
                const before = positions.slice();
                sim.step();
                assert.ok(
                    maxMove(before, positions) < r,
                    `tick ${tick} moved ${maxMove(before, positions)}, radius ${r}`,
                );
            }
        });

        it(`ForceAtlas2 (${compat}): pinning every node and letting go moves nodes as far as a fresh load`, () => {
            const fresh = spread(N);
            const reference = new ForceAtlas2Simulation({ compat, settleThreshold: 0 });
            reference.load(ring(N), fresh);
            reference.step();
            const firstTick = maxMove(spread(N), fresh);

            const positions = spread(N);
            // settleWindow keeps the pinned run going: the default stops it after 11 ticks, already a 1.5^11 speed
            const sim = new ForceAtlas2Simulation({ compat, settleThreshold: 0, settleWindow: 1e9, maxIter: 1e9 });
            sim.load(ring(N), positions);
            sim.setFixed(allPinned(N));
            sim.step(500);
            sim.setFixed(makeMask(N));
            sim.step();
            const moved = maxMove(spread(N), positions);
            assert.ok(moved <= firstTick * (1 + 1e-6), `moved ${moved}, a fresh load moves ${firstTick}`);
        });
    }

    it("ForceAtlas2: letting go of one pinned node does not skip its damping", () => {
        const fresh = spread(N);
        const reference = new ForceAtlas2Simulation({ settleThreshold: 0 });
        reference.load(ring(N), fresh);
        reference.step();
        const firstTick = maxMove(spread(N), fresh);

        const positions = spread(N);
        const others = allPinned(N);
        maskSet(others, 0, false);
        const sim = new ForceAtlas2Simulation({ settleThreshold: 0, maxIter: 1e9 });
        sim.load(ring(N), positions);
        sim.setFixed(allPinned(N));
        sim.step(5);
        sim.setFixed(others);
        sim.step();
        const moved = maxMove(spread(N), positions);
        assert.ok(moved <= firstTick * (1 + 1e-6), `moved ${moved}, a fresh load moves ${firstTick}`);
    });

    it("ARF stays finite and near its own scale when a stiff spring would overshoot every tick", () => {
        const { positions } = arf(ring(N), { a: 5000, seed: 1, maxIter: 300 });
        const bound = 2 * Math.sqrt(N) * N; // a tick moves at most sqrt(n); 300 ticks of a bounded swing stay far inside
        for (const v of positions) {
            assert.ok(Math.abs(v) < bound, `component ${v}`);
        }
    });
});
