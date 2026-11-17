/**
 * Lifecycle of the ForceAtlas2 grid tier (spec 11.3 "Device loss / errors / leaks"; P4-T10, the fa2-lifecycle.test.ts
 * three cases on `repulsion: "grid"` with rmat14): dispose() leaves no live buffer -- the grid stage's lease of sort
 * scratch and static params included, so the context's pool holds no live bytes once the simulation is disposed --
 * and a batch maps at most two staging slots; release(snapshot) during a live simulation makes the next step()
 * reject E_RELEASED; device loss mid-run rejects the pending step with E_DEVICE_LOST, disposes the simulation and
 * leaves the context "lost", and a fresh context runs afterwards.
 *
 * run-twice exempt: it asserts errors, state transitions and leak counts, not a kernel's numbers.
 */

import { GpuContext } from "../../src/context.js";
import { createFruchtermanReingold } from "../../src/layouts/fruchterman-reingold.js";
import { createSpringElectrical } from "../../src/layouts/spring-electrical.js";
import { type GpuLayoutTuning } from "../../src/types/layout.js";
import {
    BASE_OPTIONS,
    createSim,
    paritySnapshot,
    rejectionOf,
    startPositions,
    withSim,
} from "../helpers/fa2-parity.js";
import { FR_BASE_OPTIONS } from "../helpers/fr-parity.js";
import { LeakCounter } from "../helpers/leak-counter.js";
import { SE_BASE_OPTIONS } from "../helpers/se-parity.js";
import { acquire, acquireRaw, gpuScale, requireGpu } from "../setup/gpu.js";

/** The grid tuning of every case. */
const GRID: GpuLayoutTuning = Object.freeze({ repulsion: "grid", compat: "paper" });

/** Spring-electrical (ngraph) on the grid tier. */
const SE_GRID = { ...SE_BASE_OPTIONS, dim: 2, repulsion: "grid" } as const;
/** Fruchterman-Reingold on the grid tier, with a budget past the long run's 101 iterations. */
const FR_GRID = { ...FR_BASE_OPTIONS, iterations: 1000, repulsion: "grid" } as const;
/** Every model that builds the RepulsionGrid stage: its name, its options and its grid-tier simulation. */
const LONG_RUN_MODELS = [
    ["forceatlas2", BASE_OPTIONS, (ctx: GpuContext) => createSim(ctx, BASE_OPTIONS, GRID)],
    ["spring-electrical", SE_GRID, (ctx: GpuContext) => createSpringElectrical(ctx, SE_GRID)],
    ["fruchterman-reingold", FR_GRID, (ctx: GpuContext) => createFruchtermanReingold(ctx, FR_GRID)],
] as const;

/** One macrotask. */
function tick(): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, 0);
    });
}

describe("FA2 grid-tier lifecycle (spec 11.3)", () => {
    it("dispose() leaves no live buffer (the lease's scratch included); a step() maps at most two staging slots", async (t) => {
        requireGpu(t);
        const { device } = await acquireRaw();
        const counter = LeakCounter.wrap(device);
        const own = GpuContext.from(device);
        const s = paritySnapshot("rmat14", gpuScale(), false);
        try {
            const sim = createSim(own, BASE_OPTIONS, GRID);
            const positions = startPositions(s, BASE_OPTIONS, false);
            sim.load(s, positions);
            await sim.step(1);
            expect(sim.tier).toBe("grid");
            expect(own.pool.liveBytes, "the grid stage leases its scratch from the pool").toBeGreaterThan(0);
            counter.resetMapAsync();
            await sim.step(4);
            expect(counter.mapAsyncCalls, "mapAsync calls of one batch").toBeLessThanOrEqual(2);
            expect(counter.mapAsyncCalls, "a batch reads back").toBeGreaterThanOrEqual(1);
            sim.dispose();
            expect(sim.state).toBe("disposed");
            expect(own.pool.liveBytes, "dispose() released the lease").toBe(0);
            sim.dispose();
            expect(sim.state, "dispose is idempotent").toBe("disposed");
            const disposed = await rejectionOf(sim.step(1));
            expect(disposed.code).toBe("E_DISPOSED");
            own.release(s);
            expect(own.residency.stats().buffers).toBe(0);
        } finally {
            own.dispose();
        }
        expect(counter.live, "live buffers after release + dispose").toBe(0);
        expect(counter.destroyed).toBe(counter.created);
        counter.restore();
    });

    it.for(LONG_RUN_MODELS)(
        "%s: a long run holds the buffers of its first step and no more (issue #8545: the sort's params grew per iteration)",
        async ([, options, create], t) => {
            requireGpu(t);
            const { device } = await acquireRaw();
            const counter = LeakCounter.wrap(device);
            const own = GpuContext.from(device);
            const s = paritySnapshot("rmat14", gpuScale(), false);
            try {
                const sim = create(own);
                sim.load(s, startPositions(s, options, false));
                await sim.step(1);
                expect(sim.stats.repulsionTier).toBe("grid");
                const bytes = own.pool.liveBytes;
                const buffers = counter.live;
                for (let i = 0; i < 20; i++) {
                    await sim.step(5);
                }
                expect(sim.iterationsDone).toBe(101);
                expect(own.pool.liveBytes, "pool bytes after 100 more iterations").toBe(bytes);
                expect(counter.live, "live buffers after 100 more iterations").toBe(buffers);
                sim.dispose();
                expect(own.pool.liveBytes, "dispose() released the lease").toBe(0);
                own.release(s);
            } finally {
                own.dispose();
            }
            expect(counter.live, "live buffers after release + dispose").toBe(0);
            counter.restore();
        },
    );

    it("release(snapshot) during a live simulation: the next step() rejects E_RELEASED; a load of another snapshot works; snapshots === 1", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "grid-lifecycle/release" });
        const first = paritySnapshot("rmat14", gpuScale(), false);
        const second = paritySnapshot("karate", 1, false);
        try {
            await withSim(ctx, BASE_OPTIONS, GRID, async (sim) => {
                sim.load(first, startPositions(first, BASE_OPTIONS, false));
                await sim.step(2);
                expect(ctx.residency.stats().snapshots).toBe(1);
                ctx.release(first);
                const err = await rejectionOf(sim.step(1));
                expect(err.code).toBe("E_RELEASED");
                expect(err.details.serial).toBe(first.serial);
                sim.load(second, startPositions(second, BASE_OPTIONS, false));
                expect(sim.tier).toBe("grid");
                await sim.step(2);
                expect(ctx.residency.stats().snapshots).toBe(1);
                expect(sim.iterationsDone).toBe(2);
            });
            await withSim(ctx, BASE_OPTIONS, GRID, async (sim) => {
                sim.load(first, startPositions(first, BASE_OPTIONS, false));
                await sim.step(1);
                sim.load(second, startPositions(second, BASE_OPTIONS, false));
                expect(ctx.residency.stats().snapshots).toBe(2);
                ctx.release(first);
                expect(ctx.residency.stats().snapshots).toBe(1);
                await sim.step(2);
                expect(sim.iterationsDone).toBe(2);
            });
        } finally {
            ctx.release(first);
            ctx.release(second);
        }
    });

    it("device loss mid-run: the pending step rejects E_DEVICE_LOST, the simulation is disposed, the context is lost; a fresh context runs afterwards", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "grid-lifecycle/lost" });
        const s = paritySnapshot("rmat14", gpuScale(), false);
        const sim = createSim(ctx, BASE_OPTIONS, GRID);
        sim.load(s, startPositions(s, BASE_OPTIONS, false));
        await sim.step(1);
        const submittedBefore = sim.lastSubmittedBatchId;
        const pending = sim.step(200);
        while (sim.lastSubmittedBatchId === submittedBefore) {
            await tick();
        }
        ctx.device.destroy();
        const err = await rejectionOf(pending);
        expect(err.code).toBe("E_DEVICE_LOST");
        await ctx.lost;
        expect(ctx.state).toBe("lost");
        expect(sim.state).toBe("disposed");
        const again = await rejectionOf(sim.step(1));
        expect(["E_DISPOSED", "E_DEVICE_LOST"]).toContain(again.code);
        expect(ctx.residency.stats().buffers, "the residency was cleared without destroying").toBe(0);
        const fresh = await acquire({ label: "grid-lifecycle/recovered" });
        try {
            await withSim(fresh, BASE_OPTIONS, GRID, async (recovered) => {
                const positions = startPositions(s, BASE_OPTIONS, false);
                recovered.load(s, positions);
                await recovered.step(2);
                expect(recovered.iterationsDone).toBe(2);
                expect(positions.every((v) => Number.isFinite(v))).toBe(true);
            });
        } finally {
            fresh.release(s);
        }
    });
});
