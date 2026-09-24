/**
 * The windowed upload EXECUTED by GraphResidency.core() (spec 4.2; P4-T7, PD-8) over a real device with FAKED limits
 * (fakeCaps, the residency.test.ts idiom): karate at a 256-byte binding limit plans windows and uploads rowPtr whole
 * plus one colIdx buffer; a maxBufferSize below the array splits colIdx across buffers exactly as placeWindows
 * reports; windowBinding addresses each window inside its buffer; release destroys every window buffer; a second
 * core() call uploads nothing.
 */

import { type TestContext } from "vitest";

import { isWebGpuGraphError } from "../../src/errors.js";
import { GraphResidency } from "../../src/memory/residency.js";
import { planUpload } from "../../src/memory/upload-plan.js";
import { windowBinding } from "../../src/primitives/core-shape.js";
import { fakeCaps } from "../helpers/caps-tables.js";
import { withContext } from "../helpers/device.js";
import { KARATE_EDGES, snapshotOf } from "../helpers/graphs.js";
import { requireGpu } from "../setup/gpu.js";

/** The code of the WebGpuGraphError `fn` throws. */
function codeOf(fn: () => unknown): string {
    try {
        fn();
    } catch (err) {
        if (isWebGpuGraphError(err)) {
            return err.code;
        }
        throw err;
    }
    throw new Error("expected a WebGpuGraphError");
}

describe("GraphResidency.core(): the windowed plan is executed (spec 4.2, PD-8)", () => {
    it("karate at a 256-byte binding limit: rowPtr whole, one colIdx buffer, the planner's windows, window bindings", async (t: TestContext) => {
        requireGpu(t);
        await withContext(undefined, async (ctx) => {
            // karate: rowPtr (140 B) fits a 256-byte binding, colIdx (624 B) does not
            const caps = fakeCaps(ctx.caps, { maxStorageBufferBindingSize: 256 });
            const residency = new GraphResidency(ctx.device, caps, ctx.allocator, { warnUnreleasedSnapshots: 2 });
            const s = snapshotOf(KARATE_EDGES);
            const plan = planUpload(s, caps, ["rowPtr", "colIdx"]);
            expect(plan.kind).toBe("windowed");
            const core = residency.core(s);
            expect(core.plan).toBe("windowed");
            expect(core.windows).not.toBeNull();
            expect(core.arcBuffers).not.toBeNull();
            if (core.windows === null || core.arcBuffers === null || plan.kind !== "windowed") {
                throw new Error("unreachable");
            }
            const { windows } = core;
            expect(windows.length).toBe(plan.windows.length);
            expect(windows.length).toBeGreaterThanOrEqual(3);
            expect(windows).toEqual(plan.windows);
            expect(core.arcBuffers.colIdx.length).toBe(1);
            expect(core.arcBuffers.weights.length).toBe(0);
            expect(core.arcBuffers.arcToEdge.length).toBe(0);
            expect(core.rowPtr.size).toBe(4 * (s.nodeCount + 1));
            expect(residency.stats().buffers).toBe(2);
            // the default colIdx binding is window 0
            expect(core.colIdx).toEqual(windowBinding(core, "colIdx", windows[0]));
            const second = windowBinding(core, "colIdx", windows[1]);
            expect(second.offset).toBe(windows[1].offset);
            expect(second.size).toBe(4 * (windows[1].end - windows[1].start));
            expect(second.buffer).toBe(core.arcBuffers.colIdx[0]);
            expect(second.window).toBe(windows[1]);
            expect(codeOf(() => windowBinding(core, "weights", windows[0]))).toBe("E_INVALID_ARGUMENT");
            const perArray = ctx.residency.core(s);
            expect(perArray.arcBuffers).toBeNull();
            expect(codeOf(() => windowBinding(perArray, "colIdx", windows[0]))).toBe("E_INVALID_ARGUMENT");
            ctx.release(s);
            residency.destroyAll();
            await ctx.allocator.check();
        });
    });

    it("a maxBufferSize below colIdx splits it across buffers at window boundaries, placed as the planner reports", async (t: TestContext) => {
        requireGpu(t);
        await withContext(undefined, async (ctx) => {
            const caps = fakeCaps(ctx.caps, { maxStorageBufferBindingSize: 256, maxBufferSize: 512 });
            const residency = new GraphResidency(ctx.device, caps, ctx.allocator, { warnUnreleasedSnapshots: 2 });
            const s = snapshotOf(KARATE_EDGES);
            const plan = planUpload(s, caps, ["rowPtr", "colIdx"]);
            const core = residency.core(s);
            if (core.windows === null || core.arcBuffers === null || plan.kind !== "windowed") {
                throw new Error("expected a windowed core");
            }
            const colIdx = plan.arrays.find((a) => a.name === "colIdx");
            expect(colIdx?.buffers.length).toBe(2);
            expect(core.arcBuffers.colIdx.length).toBe(2);
            expect(core.windows).toEqual(plan.windows);
            expect(new Set(core.windows.map((w) => w.bufferIndex))).toEqual(new Set([0, 1]));
            for (const w of core.windows) {
                const range = colIdx?.buffers[w.bufferIndex];
                const binding = windowBinding(core, "colIdx", w);
                expect(binding.buffer).toBe(core.arcBuffers.colIdx[w.bufferIndex]);
                expect(binding.buffer.size).toBe(range?.byteLength);
                expect(binding.offset + binding.size).toBeLessThanOrEqual(binding.buffer.size);
                expect(binding.offset).toBe(4 * w.start - (range?.byteOffset ?? 0));
            }
            expect(residency.stats().buffers).toBe(3);
            residency.destroyAll();
            await ctx.allocator.check();
        });
    });

    it("release destroys every window buffer; a second core() call returns the memoised bindings", async (t: TestContext) => {
        requireGpu(t);
        await withContext(undefined, async (ctx) => {
            const caps = fakeCaps(ctx.caps, { maxStorageBufferBindingSize: 256, maxBufferSize: 512 });
            const residency = new GraphResidency(ctx.device, caps, ctx.allocator, { warnUnreleasedSnapshots: 2 });
            const s = snapshotOf(KARATE_EDGES);
            const before = ctx.allocator.liveBuffers;
            const first = residency.core(s);
            const created = ctx.allocator.liveBuffers - before;
            expect(created).toBe(3);
            const again = residency.core(s);
            expect(ctx.allocator.liveBuffers - before).toBe(created);
            expect(again.rowPtr.buffer).toBe(first.rowPtr.buffer);
            expect(again.colIdx?.buffer).toBe(first.colIdx?.buffer);
            expect(again.arcBuffers?.colIdx).toEqual(first.arcBuffers?.colIdx);
            expect(again.windows).toEqual(first.windows);
            residency.release(s);
            expect(ctx.allocator.liveBuffers).toBe(before);
            expect(residency.stats()).toEqual({ buffers: 0, bytes: 0, snapshots: 0, perSnapshot: [] });
            expect(residency.isReleased(s.serial)).toBe(true);
            residency.destroyAll();
            await ctx.allocator.check();
        });
    });
});
