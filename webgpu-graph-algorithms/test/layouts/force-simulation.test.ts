/**
 * The shared layout state machine (spec 7.19, 7.12, 7.17; contract 3.13 ForceSimulation) driven by a FAKE
 * ForceModel (test/helpers/fake-force-model.ts), for the cases that catch a heavy batch in flight -- generation
 * discard on load(), the setPosition override list across a batch, reheat during flight, a state write that keeps the
 * in-flight header -- and device loss, which destroys a device on purpose. It runs in `node-device-errors`, one file at
 * a time; the rest of ForceSimulation's rules are test/layouts/force-simulation-states.test.ts in the `node` project.
 *
 * run-twice exempt: it asserts in-flight state, generation discard and loss codes of a fake fill kernel, not a
 * kernel's numbers; the fake's run-twice check is in force-simulation-states.test.ts.
 */

import { makeMask, maskSet } from "@graphty/graph-format";

import { GpuContext } from "../../src/context.js";
import { type ResolvedLayoutTuning } from "../../src/types/layout.js";
import {
    bitsToFloat,
    errorOf,
    EXACT_TIER,
    expectRows,
    FakeModel,
    FakeOptions,
    FakeSim,
    graph,
    heavyFake,
    heavyN,
    makeSim,
    nanPositions,
    nextTurn,
    rejectionOf,
    waitForSubmission,
} from "../helpers/fake-force-model.js";
import { acquire, requireGpu } from "../setup/gpu.js";

describe("ForceSimulation (fake model)", () => {
    // one context for the describe, acquired lazily AFTER requireGpu() so a "skip" policy skips instead of failing
    let shared: GpuContext | null = null;
    const sims: FakeSim[] = [];

    async function ctxOf(): Promise<GpuContext> {
        if (shared === null) {
            shared = await acquire({ label: "force-simulation" });
        }
        return shared;
    }

    afterEach(() => {
        for (const sim of sims.splice(0)) {
            sim.dispose();
        }
    });

    function sim(
        ctx: GpuContext,
        fake: FakeModel,
        options?: FakeOptions,
        tuning?: Partial<ResolvedLayoutTuning>,
    ): FakeSim {
        const s = makeSim(ctx, fake, options, tuning);
        sims.push(s);
        return s;
    }

    it("load() during flight bumps the generation and discards the in-flight batch", async (t) => {
        requireGpu(t);
        const ctx = await ctxOf();
        const fake = heavyFake();
        const s = sim(ctx, fake, { maxInFlight: 2 }, EXACT_TIER);
        const gA = graph(heavyN());
        const posA = nanPositions(heavyN());
        s.load(gA, posA);
        const seededA = Array.from(posA);
        const { generation } = s;
        const p = s.step(256);
        await waitForSubmission(s, 1); // submitted and still executing
        expect(s.inFlight).toBe(1);
        expect(fake.seen).toEqual([]);
        const gB = graph(12);
        const posB = nanPositions(12);
        s.load(gB, posB);
        expect(s.generation).toBe(generation + 1);
        expect(s.nodeCount).toBe(12);
        await p; // resolves (discarded), never rejects
        expect(Array.from(posA)).toEqual(seededA);
        expect(s.iterationsDone).toBe(0);
        expect(fake.seen).toEqual([]);
        // a record that is created but not yet submitted at load() time is discarded the same way
        const p2 = s.step(2);
        const gC = graph(12);
        s.load(gC, posB);
        await p2;
        expect(fake.seen).toEqual([]);
        await s.step(1);
        expectRows(posB, 12, 1, 1, 1);
        expect(fake.seen.map(bitsToFloat)).toEqual([1]);
        expect(s.inFlight).toBe(0);
        // a load() of the same snapshot and size keeps the buffers and the fixed words
        const mask = makeMask(12);
        maskSet(mask, 2, true);
        s.setFixed(mask);
        s.load(gC, posB);
        expect(s.generation).toBe(generation + 3);
        await s.step(1);
        expect(s.iterationsDone).toBe(1);
    });

    it("setPosition: validation, the immediate owner write, and the override list across a batch", async (t) => {
        requireGpu(t);
        const ctx = await ctxOf();
        const fake = heavyFake();
        const s = sim(ctx, fake, { maxInFlight: 2 }, EXACT_TIER);
        const n = heavyN();
        const positions = nanPositions(n);
        s.load(graph(n), positions);
        expect(errorOf(() => s.setPosition(n, 0, 0, 0)).code).toBe("E_INVALID_ARGUMENT");
        expect(errorOf(() => s.setPosition(-1, 0, 0, 0)).code).toBe("E_INVALID_ARGUMENT");
        expect(errorOf(() => s.setPosition(1.5, 0, 0, 0)).code).toBe("E_INVALID_ARGUMENT");
        expect(errorOf(() => s.setPosition(0, Number.NaN, 0, 0)).code).toBe("E_INVALID_ARGUMENT");
        const p = s.step(256);
        await waitForSubmission(s, 1); // the batch is in flight
        expect(s.inFlight).toBe(1);
        expect(fake.seen).toEqual([]);
        const reheats = fake.calls.reheat;
        s.setPosition(3, 100, 200, 5);
        expect(positions[9]).toBe(100);
        expect(positions[10]).toBe(200);
        expect(positions[11]).toBe(5);
        expect(s.overrides.get(3)).toBe(s.lastSubmittedBatchId);
        expect(s.lastSubmittedBatchId).toBeGreaterThanOrEqual(1);
        expect(fake.calls.reheat).toBe(reheats + 1);
        await p;
        // the batch computed before the write does not move the node back
        expect(positions[9]).toBe(100);
        expect(positions[10]).toBe(200);
        expect(positions[11]).toBe(5);
        expectRows(positions, n, 256, 256, 256, new Set([3]));
        expect(s.overrides.size).toBe(1);
        // the next batch was submitted after the write and lands normally; the override is cleared
        await s.step(1);
        expectRows(positions, n, 257, 257, 257);
        expect(s.overrides.size).toBe(0);
        expect(s.iterationsDone).toBe(257);
    });

    it("a batch in flight at reheat() cannot settle the simulation when it lands (PLAN DECISION 21)", async (t) => {
        requireGpu(t);
        const ctx = await ctxOf();
        const fake = heavyFake();
        const s = sim(ctx, fake, { settleWindow: 2, maxIter: 1000, maxInFlight: 2 }, EXACT_TIER);
        s.load(graph(heavyN()), nanPositions(heavyN()));
        fake.headerValue = 2; // the batch lands with settledCount = 2 >= settleWindow
        const p = s.step(256);
        await waitForSubmission(s, 1);
        expect(s.inFlight).toBe(1);
        expect(fake.seen).toEqual([]);
        s.reheat(); // an unpin or a drag while the batch is still executing
        expect(s.settled).toBe(false);
        await p;
        expect(s.settled).toBe(false); // the landed settledCount predates the reheat
        expect(s.iterationsDone).toBe(256); // the contract's iterationsDone += k still applies
        expect(s.stats.iteration).toBe(2); // the rest of the header is absorbed as usual
        // the next batch starts from the settledCount the reheat wrote (0); without the header fill it stays 0
        fake.headerValue = null;
        await s.step(1);
        expect(s.settled).toBe(false);
        expect(s.iterationsDone).toBe(257);
        // a batch submitted AFTER the reheat settles the simulation as usual
        fake.headerValue = 2;
        await s.step(1);
        expect(s.settled).toBe(true);
    });

    it("a state write flushes only its own field: the in-flight batch's GPU-written header words survive the next submit (PLAN DECISION 5)", async (t) => {
        requireGpu(t);
        const ctx = await ctxOf();
        const fake = heavyFake();
        const s = sim(ctx, fake, { settleWindow: 2, maxIter: 1000, maxInFlight: 2 }, EXACT_TIER);
        s.load(graph(heavyN()), nanPositions(heavyN()));
        fake.headerValue = 2; // batch A fills every header word with 2 on the GPU
        const a = s.step(256);
        await waitForSubmission(s, 1);
        expect(s.inFlight).toBe(1);
        expect(fake.seen).toEqual([]);
        // reheat while A is still executing (the shadow still holds load()'s header: iteration 0), then submit B
        // at once: its flush must write the ONE queued word (settledCount = 0), not the whole shadow -- a
        // whole-header writeBuffer would land after A and put iteration back to 0
        s.reheat();
        fake.headerValue = null;
        const b = s.step(1);
        await waitForSubmission(s, 2);
        expect(s.inFlight).toBe(2);
        expect(fake.seen).toEqual([]); // A had not landed when B's state writes were flushed
        await a;
        expect(s.stats.iteration).toBe(2);
        await b;
        expect(s.iterationsDone).toBe(257);
        expect(s.settled).toBe(false); // B's header carries the reheat's settledCount = 0
        expect(s.stats.iteration).toBe(2); // A's GPU-written word survived B's flush
        expect(s.stats.rmsRadius).toBe(bitsToFloat(2)); // and so did the rest of A's header
        expect(fake.lastWriter?.get("settledCount")).toBe(0);
        expect(fake.lastWriter?.get("iteration")).toBe(2);
    });
});

describe("ForceSimulation lifecycle on a raw device", () => {
    it("device loss disposes the simulation and rejects the pending steps with E_DEVICE_LOST", async (t) => {
        requireGpu(t);
        const lossCtx = await acquire({ label: "force-simulation-loss" });
        const fake = heavyFake();
        const s = makeSim(lossCtx, fake, { maxInFlight: 2 }, EXACT_TIER);
        s.load(graph(heavyN()), nanPositions(heavyN()));
        await s.step(1); // compiles and binds on this FRESH context, so the two heavy submissions below are immediate
        fake.seen.length = 0;
        const p1 = s.step(256);
        const p2 = s.step(256);
        await waitForSubmission(s, 2);
        // both batches are submitted and still executing: their readbacks are pending at the loss
        expect(s.inFlight).toBe(2);
        expect(fake.seen).toEqual([]);
        lossCtx.device.destroy();
        expect((await rejectionOf(p1)).code).toBe("E_DEVICE_LOST");
        expect((await rejectionOf(p2)).code).toBe("E_DEVICE_LOST");
        await lossCtx.lost;
        await nextTurn();
        expect(s.state).toBe("disposed");
        expect(s.inFlight).toBe(0);
        expect((await rejectionOf(s.step(1))).code).toBe("E_DISPOSED");
        s.dispose();
    });
});
