/**
 * The two guards cosmos.gl added after bugs, over every GPU force model (issue #3255; the CPU half is
 * layout/test/simulation/force-guards.test.ts): nodes that start on one point are pushed apart, and no tick throws a
 * node far beyond the layout. Fruchterman-Reingold and spring-electrical clamp the move in K5. ForceAtlas2 has no
 * clamp by design (spec D25): its bound is the speed controller, so these tests hold the controller to it while it
 * has nothing to measure because every node is pinned.
 */

import { type F32, fromEdgeArrays, type GraphSnapshot, makeMask, maskSet, type NodeMask } from "@graphty/graph-format";

import type { GpuContext } from "../../src/context.js";
import type { GpuLayoutTuning } from "../../src/types/layout.js";
import { BASE_OPTIONS, NETWORKX, PAPER, withSim } from "../helpers/fa2-parity.js";
import { FR_BASE_OPTIONS, FR_TUNING, withFrSim } from "../helpers/fr-parity.js";
import { expectBitwiseEqual } from "../helpers/matchers.js";
import { SE_BASE_OPTIONS, SE_TUNING, withSeSim } from "../helpers/se-parity.js";
import { acquire, requireGpu } from "../setup/gpu.js";

const N = 30;
const GRID: GpuLayoutTuning = Object.freeze({ repulsion: "grid", compat: "paper", deterministic: true });

/** A ring with chords: every node of degree 4, so a spread start is under real force. */
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

function minGap(p: F32): number {
    let gap = Number.POSITIVE_INFINITY;
    for (let i = 0; i < p.length; i += 3) {
        for (let j = i + 3; j < p.length; j += 3) {
            gap = Math.min(gap, Math.hypot(p[i] - p[j], p[i + 1] - p[j + 1], p[i + 2] - p[j + 2]));
        }
    }
    return gap;
}

function allPinned(n: number): NodeMask {
    const mask = makeMask(n);
    for (let i = 0; i < n; i++) {
        maskSet(mask, i, true);
    }
    return mask;
}

describe("the force kernels' guards (issue #3255)", () => {
    let ctx: GpuContext;

    beforeAll(async () => {
        ctx = await acquire({ label: "force-guards" });
    });

    for (const dim of [2, 3] as const) {
        for (const [name, tuning] of [
            ["exact", PAPER],
            ["grid", GRID],
        ] as const) {
            it(`ForceAtlas2 (${name}, ${dim}D) pushes apart nodes on one point`, async (t) => {
                requireGpu(t);
                const run = (): Promise<F32> =>
                    withSim(ctx, { ...BASE_OPTIONS, dim, settleThreshold: 0 }, tuning, async (sim) => {
                        const positions = new Float32Array(3 * N);
                        sim.load(ring(N), positions);
                        await sim.step(20);
                        return positions;
                    });
                const positions = await run();
                expectBitwiseEqual(positions, await run(), "second run");
                expect(minGap(positions)).toBeGreaterThan(1e-3);
            });
        }

        it(`Fruchterman-Reingold (${dim}D) pushes apart nodes on one point, at most the start temperature a tick`, async (t) => {
            requireGpu(t);
            const options = { ...FR_BASE_OPTIONS, dim, iterations: 50, settleThreshold: 0 };
            const run = (): Promise<F32> =>
                withFrSim(ctx, options, FR_TUNING, async (sim) => {
                    const positions = new Float32Array(3 * N);
                    sim.load(ring(N), positions);
                    for (let tick = 0; tick < 50; tick++) {
                        const before = positions.slice();
                        await sim.step(1);
                        expect(maxMove(before, positions)).toBeLessThanOrEqual(0.1 * (1 + 1e-5));
                    }
                    return positions;
                });
            const positions = await run();
            expectBitwiseEqual(positions, await run(), "second run");
            expect(minGap(positions)).toBeGreaterThan(1e-3);
        });

        it(`spring-electrical (${dim}D) pushes apart nodes on one point, at most the time step a tick`, async (t) => {
            requireGpu(t);
            const options = { ...SE_BASE_OPTIONS, dim, settleThreshold: 0, timeStep: 0.5 };
            const run = (): Promise<F32> =>
                withSeSim(ctx, options, SE_TUNING, async (sim) => {
                    const positions = new Float32Array(3 * N);
                    sim.load(ring(N), positions);
                    for (let tick = 0; tick < 50; tick++) {
                        const before = positions.slice();
                        await sim.step(1);
                        expect(maxMove(before, positions)).toBeLessThanOrEqual(0.5 * (1 + 1e-5));
                    }
                    return positions;
                });
            const positions = await run();
            expectBitwiseEqual(positions, await run(), "second run");
            expect(minGap(positions)).toBeGreaterThan(1e-3);
        });
    }

    for (const [name, tuning] of [
        ["paper", PAPER],
        ["networkx", NETWORKX],
        ["grid", GRID],
    ] as const) {
        it(`ForceAtlas2 (${name}): pinning every node and letting go moves nodes as far as a fresh load`, async (t) => {
            requireGpu(t);
            const firstTick = await withSim(ctx, { ...BASE_OPTIONS, settleThreshold: 0 }, tuning, async (sim) => {
                const positions = spread(N);
                sim.load(ring(N), positions);
                await sim.step(1);
                return maxMove(spread(N), positions);
            });
            // settleWindow keeps the pinned run going: the default stops it after 11 ticks, already a 1.5^11 speed
            const pinnedRun = { ...BASE_OPTIONS, settleThreshold: 0, settleWindow: 1e9, maxIter: 1e9 };
            await withSim(ctx, pinnedRun, tuning, async (sim) => {
                const positions = spread(N);
                sim.load(ring(N), positions);
                sim.setFixed(allPinned(N));
                await sim.step(250);
                await sim.step(250);
                sim.setFixed(makeMask(N));
                await sim.step(1);
                expect(maxMove(spread(N), positions)).toBeLessThanOrEqual(firstTick * (1 + 1e-3));
            });
        });
    }
});
