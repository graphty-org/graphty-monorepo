/**
 * Lifecycle of the ForceAtlas2 grid tier (spec 11.3 "Device loss / errors / leaks"; P4-T10, the fa2-lifecycle.test.ts
 * three cases on `repulsion: "grid"` with rmat14): dispose() leaves no live buffer -- the grid stage's lease of sort
 * scratch and static params included, so the context's pool holds no live bytes once the simulation is disposed --
 * and a batch maps at most two staging slots; release(snapshot) during a live simulation makes the next step()
 * reject E_RELEASED; device loss mid-run rejects the pending step with E_DEVICE_LOST, disposes the simulation and
 * leaves the context "lost", and a fresh context runs afterwards.
 */

import { GpuContext } from "../../src/context.js";
import { type GpuLayoutTuning } from "../../src/types/layout.js";
import {
    BASE_OPTIONS,
    createSim,
    paritySnapshot,
    rejectionOf,
    startPositions,
    withSim,
} from "../helpers/fa2-parity.js";
import { LeakCounter } from "../helpers/leak-counter.js";
import { acquire, acquireRaw, gpuScale, requireGpu } from "../setup/gpu.js";

const CASE_TIMEOUT = 300_000;

/** The grid tuning of every case. */
const GRID: GpuLayoutTuning = Object.freeze({ repulsion: "grid", compat: "paper" });

/** One macrotask. */
function tick(): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, 0);
    });
}

describe("FA2 grid-tier lifecycle (spec 11.3)", () => {
    it(
        "dispose() leaves no live buffer (the lease's scratch included); a step() maps at most two staging slots",
        async (t) => {
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
        },
        CASE_TIMEOUT,
    );

    it(
        "release(snapshot) during a live simulation: the next step() rejects E_RELEASED; a load of another snapshot works; snapshots === 1",
        async (t) => {
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
        },
        CASE_TIMEOUT,
    );

    it(
        "device loss mid-run: the pending step rejects E_DEVICE_LOST, the simulation is disposed, the context is lost; a fresh context runs afterwards",
        async (t) => {
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
        },
        CASE_TIMEOUT,
    );
});
