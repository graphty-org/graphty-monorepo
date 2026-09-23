/**
 * P5-T3 option tests for createFruchtermanReingold (spec 7.20, 9.3; mirroring test/layouts/fa2-options.test.ts): the
 * resolver's defaults and every E_INVALID_ARGUMENT range (the CPU's `if (!k)` rule for k), the patch rule and the
 * maxInFlight pin, the created simulation's kind and its stats before and after load() (the host-written header),
 * the PD-16 rejection of setParams({ fixed }) beside the reheat-without-recompile of a numeric patch, the constant
 * override set and the six specs (every key covered by OVERRIDE_MATRIX), and the PD-5 temperature schedule of
 * paramsFor across a reheat.
 *
 * Every GPU test acquires a FRESH context (spec 11.2) and releases its snapshots; a wrong result is never a skip.
 */

import { makeMask, maskSet } from "@graphty/graph-format";

import { FR_DEFAULTS, FR_START_TEMPERATURE } from "../../src/constants.js";
import { WebGpuGraphError, type WebGpuGraphErrorCode } from "../../src/errors.js";
import { type CommandBatch } from "../../src/kernel/batch.js";
import { ForceSimulation } from "../../src/layouts/force-simulation.js";
import { resolveLayoutTuning } from "../../src/layouts/forceatlas2.js";
import {
    createFruchtermanReingold,
    FruchtermanReingoldModel,
    resolveFruchtermanReingoldOptions,
} from "../../src/layouts/fruchterman-reingold.js";
import { verifyDevice } from "../../src/primitives/verify.js";
import { type FruchtermanReingoldStats, type GpuLayoutSimulation } from "../../src/types/layout.js";
import { type FruchtermanReingoldOptions } from "../../src/types/options.js";
import { KARATE_EDGES, snapshotOf } from "../helpers/graphs.js";
import { matrixCovers } from "../helpers/override-matrix.js";
import { acquire, requireGpu } from "../setup/gpu.js";

type FrSim = ForceSimulation<FruchtermanReingoldOptions, FruchtermanReingoldStats>;

/** A JS-shaped option record (out-of-type values for the range tests). */
function loose(record: Record<string, unknown>): FruchtermanReingoldOptions {
    return record;
}

function expectCode(fn: () => unknown, code: WebGpuGraphErrorCode, details?: Record<string, unknown>): void {
    let caught: unknown = null;
    try {
        fn();
    } catch (err) {
        caught = err;
    }
    expect(caught).toBeInstanceOf(WebGpuGraphError);
    if (!(caught instanceof WebGpuGraphError)) {
        return;
    }
    expect(caught.code).toBe(code);
    if (details !== undefined) {
        expect(caught.details).toMatchObject(details);
    }
}

/** Narrows the public simulation to the class so the @internal members (model, options) are reachable. */
function asSim(sim: GpuLayoutSimulation<FruchtermanReingoldOptions, FruchtermanReingoldStats>): FrSim {
    if (!(sim instanceof ForceSimulation)) {
        throw new Error("createFruchtermanReingold must return a ForceSimulation");
    }
    return sim;
}

const DEFAULT_RESOLVED = { ...FR_DEFAULTS, center: [0, 0, 0], seed: null };

const FR_OVERRIDES = {
    LINLOG: false,
    DISTRIBUTED: false,
    TIER: 0,
    SWING_MODE: 1,
    STRONG_GRAVITY: false,
    GRAVITY_CENTER: 0,
    LAW: 1,
    APPLY: 1,
    STATS_MODE: 1,
};

describe("resolveFruchtermanReingoldOptions (spec 7.20, 9.3)", () => {
    it("applies FR_DEFAULTS plus the origin center and the null seed; the record is frozen", () => {
        expect(resolveFruchtermanReingoldOptions(undefined)).toEqual(DEFAULT_RESOLVED);
        expect(resolveFruchtermanReingoldOptions({})).toEqual(DEFAULT_RESOLVED);
        expect(resolveFruchtermanReingoldOptions({ k: undefined, fixed: undefined, seed: undefined })).toEqual(
            DEFAULT_RESOLVED,
        );
        expect(Object.isFrozen(resolveFruchtermanReingoldOptions({}))).toBe(true);
    });

    it("k: 0 and NaN resolve to null (the CPU's `if (!k)`); -1 and Infinity are rejected; iterations >= 0 integer; fixed is a mask, a name or null", () => {
        expect(resolveFruchtermanReingoldOptions({ k: 0 }).k).toBeNull();
        expect(resolveFruchtermanReingoldOptions({ k: Number.NaN }).k).toBeNull();
        expect(resolveFruchtermanReingoldOptions({ k: null }).k).toBeNull();
        expect(resolveFruchtermanReingoldOptions({ k: 0.25 }).k).toBe(0.25);
        expectCode(() => resolveFruchtermanReingoldOptions({ k: -1 }), "E_INVALID_ARGUMENT", { argument: "k" });
        expectCode(() => resolveFruchtermanReingoldOptions({ k: Number.POSITIVE_INFINITY }), "E_INVALID_ARGUMENT", {
            argument: "k",
        });
        expectCode(() => resolveFruchtermanReingoldOptions(loose({ k: "0.5" })), "E_INVALID_ARGUMENT", {
            argument: "k",
        });
        expect(resolveFruchtermanReingoldOptions({ iterations: 0 }).iterations).toBe(0);
        expect(resolveFruchtermanReingoldOptions({ iterations: 7 }).iterations).toBe(7);
        expectCode(() => resolveFruchtermanReingoldOptions({ iterations: 1.5 }), "E_INVALID_ARGUMENT", {
            argument: "iterations",
        });
        expectCode(() => resolveFruchtermanReingoldOptions({ iterations: -1 }), "E_INVALID_ARGUMENT", {
            argument: "iterations",
        });
        const mask = makeMask(34);
        expect(resolveFruchtermanReingoldOptions({ fixed: "pinned" }).fixed).toBe("pinned");
        expect(resolveFruchtermanReingoldOptions({ fixed: mask }).fixed).toBe(mask);
        expect(resolveFruchtermanReingoldOptions({ fixed: null }).fixed).toBeNull();
        expectCode(() => resolveFruchtermanReingoldOptions(loose({ fixed: 7 })), "E_INVALID_ARGUMENT", {
            argument: "fixed",
        });
        const bad: [Record<string, unknown>, string][] = [
            [{ settleWindow: 0 }, "settleWindow"],
            [{ settleThreshold: -0.001 }, "settleThreshold"],
            [{ maxInFlight: 0 }, "maxInFlight"],
            [{ iterationsPerStep: 0 }, "iterationsPerStep"],
            [{ dim: 4 }, "dim"],
            [{ scale: 0 }, "scale"],
            [{ center: [1] }, "center"],
            [{ seed: Number.POSITIVE_INFINITY }, "seed"],
        ];
        for (const [record, argument] of bad) {
            expectCode(() => resolveFruchtermanReingoldOptions(loose(record)), "E_INVALID_ARGUMENT", { argument });
        }
    });

    it("merges a patch over a previous record and pins maxInFlight", () => {
        const previous = resolveFruchtermanReingoldOptions({ k: 0.3, seed: 5, maxInFlight: 4, dim: 3, iterations: 9 });
        expect(resolveFruchtermanReingoldOptions({ iterations: 20 }, previous)).toEqual({
            ...previous,
            iterations: 20,
        });
        expect(resolveFruchtermanReingoldOptions({}, previous)).toEqual(previous);
        expect(resolveFruchtermanReingoldOptions({ maxInFlight: 4 }, previous)).toEqual(previous);
        expect(resolveFruchtermanReingoldOptions({ k: null }, previous).k).toBeNull();
        expectCode(() => resolveFruchtermanReingoldOptions({ maxInFlight: 3 }, previous), "E_INVALID_ARGUMENT", {
            argument: "maxInFlight",
            value: 3,
            expected: 4,
        });
        expectCode(() => resolveFruchtermanReingoldOptions({ k: -2 }, previous), "E_INVALID_ARGUMENT", {
            argument: "k",
        });
    });
});

describe("FruchtermanReingoldModel (no device)", () => {
    const model = new FruchtermanReingoldModel(
        resolveLayoutTuning(undefined),
        resolveFruchtermanReingoldOptions(undefined),
    );
    const options = resolveFruchtermanReingoldOptions(undefined);

    it("refuses paramsFor and recordIteration before bind() with E_NOT_LOADED on either tier, an unknown upTo stage with E_INVALID_ARGUMENT", () => {
        expectCode(() => model.paramsFor(0, options), "E_NOT_LOADED", { state: "created" });
        expectCode(() => model.recordIteration({} as CommandBatch, 0, "grid"), "E_NOT_LOADED", { state: "created" });
        expectCode(() => model.recordIteration({} as CommandBatch, 0, "exact"), "E_NOT_LOADED", { state: "created" });
        expectCode(() => model.recordIteration({} as CommandBatch, 0, "exact", "K4"), "E_NOT_LOADED", {
            state: "created",
        });
    });

    it("inputs(): fixed naming a non-bool column, a missing column or a short mask is E_INVALID_ARGUMENT; a bool column and a mask are copied", () => {
        const s = snapshotOf(KARATE_EDGES);
        const mask = makeMask(s.nodeCount);
        maskSet(mask, 4, true);
        const columned = s.withColumns({
            pinned: { data: mask, decl: { dtype: "bool", role: "fixed" } },
            score: new Float32Array(s.nodeCount),
        });
        expectCode(() => model.inputs(s, { fixed: "score" }), "E_INVALID_ARGUMENT", { argument: "fixed" });
        expectCode(() => model.inputs(s, { fixed: "absent" }), "E_INVALID_ARGUMENT", { argument: "fixed" });
        expectCode(() => model.inputs(s, { fixed: makeMask(3) }), "E_INVALID_ARGUMENT", { argument: "fixed" });
        expectCode(() => model.inputs(columned, { fixed: "score" }), "E_INVALID_ARGUMENT", { argument: "fixed" });
        const byName = model.inputs(columned, { fixed: "pinned" }).fixed;
        const byRole = model.inputs(columned, { fixed: null }).fixed;
        const byMask = model.inputs(s, { fixed: mask }).fixed;
        for (const words of [byName, byRole, byMask]) {
            expect(words).toBeInstanceOf(Uint32Array);
            expect(words).not.toBe(mask);
            expect(Array.from(words ?? [])).toEqual(Array.from(mask));
        }
        expect(model.inputs(s, { fixed: null }).fixed).toBeNull();
    });
});

describe("createFruchtermanReingold (spec 3.3, 7.20)", () => {
    it("returns a simulation in state created with the FR model kind; stats read 0 before load() and 0.1 after it, before any step()", async (t) => {
        requireGpu(t);
        const ctx = await acquire();
        const s = snapshotOf(KARATE_EDGES);
        try {
            const sim = asSim(createFruchtermanReingold(ctx));
            expect(sim.state).toBe("created");
            expect(sim.model.kind).toBe("fruchtermanReingold");
            expect(sim.model).toBeInstanceOf(FruchtermanReingoldModel);
            expect(sim.stats.temperature).toBe(0);
            expect(sim.stats.trace).toEqual([]);
            expect(sim.stats.iteration).toBe(0);
            const positions = new Float32Array(3 * s.nodeCount).fill(Number.NaN);
            sim.load(s, positions);
            expect(sim.state).toBe("loaded");
            // load() wrote the header through onLoad (temperature 0.1 as an f32 field) and no batch has landed
            expect(sim.stats.temperature).toBe(Math.fround(FR_START_TEMPERATURE));
            expect(sim.stats.trace).toEqual([]);
            expect(sim.stats.repulsionTier).toBe("exact");
            expect(sim.settled).toBe(false);
            sim.dispose();
        } finally {
            ctx.release(s);
        }
    });

    it("setParams({ fixed }) is E_INVALID_ARGUMENT (PD-16); setParams({ k }) and ({ iterations }) reheat without a recompile", async (t) => {
        requireGpu(t);
        const ctx = await acquire();
        const s = snapshotOf(KARATE_EDGES);
        try {
            const sim = asSim(createFruchtermanReingold(ctx, { seed: 7 }));
            const positions = new Float32Array(3 * s.nodeCount).fill(Number.NaN);
            sim.load(s, positions);
            await sim.step(3);
            expect(sim.iterationsDone).toBe(3);
            const pipelines = ctx.pipelines.size;
            const before = Float32Array.from(positions);
            const mask = makeMask(s.nodeCount);
            maskSet(mask, 0, true);
            expectCode(
                () => {
                    sim.setParams({ fixed: mask });
                },
                "E_INVALID_ARGUMENT",
                { argument: "fixed" },
            );
            expect(sim.iterationsDone, "a rejected patch leaves the simulation unchanged").toBe(3);
            expect(sim.options.k).toBeNull();
            sim.setParams({ k: 0.3 });
            expect(sim.iterationsDone, "a k patch reheats").toBe(0);
            expect(sim.options.k).toBe(0.3);
            await sim.step(1);
            sim.setParams({ iterations: 10 });
            expect(sim.iterationsDone, "an iterations patch reheats").toBe(0);
            expect(sim.options.iterations).toBe(10);
            await sim.step(1);
            expect(ctx.pipelines.size, "no recompile: the override set is constant").toBe(pipelines);
            expect(Array.from(positions).some((v, i) => v !== before[i])).toBe(true);
            sim.dispose();
        } finally {
            ctx.release(s);
        }
    });

    it("overrides() is the constant FR set for every record; specs() names K1, K2, K3, K5, fa2-to-scene, fill; every key the run creates is covered by OVERRIDE_MATRIX", async (t) => {
        requireGpu(t);
        const ctx = await acquire();
        // the device self-check compiles the two scan pipelines once per device before any layout runs
        // (src/primitives/verify.ts); count what THIS run added
        await verifyDevice(ctx);
        const gate = ctx.pipelines.size;
        const s = snapshotOf(KARATE_EDGES);
        try {
            const model = new FruchtermanReingoldModel(
                resolveLayoutTuning(undefined),
                resolveFruchtermanReingoldOptions(undefined),
            );
            for (const record of [
                resolveFruchtermanReingoldOptions(undefined),
                resolveFruchtermanReingoldOptions({ k: 0.5, iterations: 3, dim: 3, fixed: "pinned" }),
            ]) {
                expect(model.overrides(record)).toEqual(FR_OVERRIDES);
            }
            const merged = { ...FR_OVERRIDES, USE_PERM: false, HAS_WEIGHTS: false };
            const specs = model.specs(merged, true);
            expect(specs.map((spec) => spec.id)).toEqual([
                "fa2-stats-finalize",
                "fa2-attraction",
                "fa2-repulsion-exact",
                "fa2-integrate",
                "fa2-to-scene",
                "fill",
            ]);
            expect(specs.map((spec) => spec.overrides)).toEqual([
                { STATS_MODE: 1 },
                { LINLOG: false, DISTRIBUTED: false, TIER: 0, USE_PERM: false, HAS_WEIGHTS: false, LAW: 1 },
                { SWING_MODE: 1, STRONG_GRAVITY: false, GRAVITY_CENTER: 0, LAW: 1 },
                { SWING_MODE: 1, APPLY: 1 },
                {},
                {},
            ]);
            expect(model.stages).toEqual([
                "K1",
                "K2",
                "K3",
                "G1",
                "G2",
                "G3",
                "G4",
                "G5",
                "G6",
                "G7",
                "K4",
                "K5",
                "toScene",
            ]);
            expect(model.buffers(34, 2).map((b) => [b.name, b.byteLength, b.zero])).toEqual([
                ["force", 408, true],
                ["oldForce", 408, true],
                ["fillParams", 256, false],
                ["hubCounters", 16, true],
            ]);
            // the grid tier (P4-T13, PD-18 / PD-22): the grid buffers by tierFor, the grid specs with LAW 1 once a
            // grid load has been resolved by inputs()
            const gridModel = new FruchtermanReingoldModel(
                resolveLayoutTuning({ repulsion: "grid" }),
                resolveFruchtermanReingoldOptions(undefined),
            );
            expect(gridModel.buffers(34, 2).map((b) => b.name)).toEqual([
                "force",
                "oldForce",
                "fillParams",
                "hubCounters",
                "cellKey",
                "cellVal",
                "sortedKey",
                "sortedIdx",
                "cellHist",
                "cellStart",
                "hubList",
                "hubArgs",
                "pyramid",
            ]);
            expect(gridModel.specs(merged, true).map((spec) => spec.id)).toHaveLength(6);
            gridModel.inputs(s, resolveFruchtermanReingoldOptions(undefined));
            const gridSpecs = gridModel.specs(merged, true);
            expect(gridSpecs.map((spec) => spec.id)).toContain("grid-far-field");
            expect(gridSpecs.find((spec) => spec.id === "grid-far-field")?.overrides).toEqual({ LAW: 1 });
            expect(gridSpecs.find((spec) => spec.id === "grid-near-field")?.overrides).toEqual({
                SWING_MODE: 1,
                STRONG_GRAVITY: false,
                GRAVITY_CENTER: 0,
                LAW: 1,
            });
            const inputs = model.inputs(s, resolveFruchtermanReingoldOptions(undefined));
            expect(Array.from(inputs.mass)).toEqual(new Array<number>(34).fill(1));
            expect(inputs.weights).toEqual({ data: null, source: "none", column: null });
            expect(inputs.fixed).toBeNull();
            const sim = createFruchtermanReingold(ctx, { seed: 7 });
            const positions = new Float32Array(3 * s.nodeCount).fill(Number.NaN);
            sim.load(s, positions);
            await sim.step(1);
            expect(ctx.pipelines.size - gate).toBe(6);
            const cover = matrixCovers(ctx.pipelines.keys(), ctx.caps);
            expect(cover.missing, `keys missing from OVERRIDE_MATRIX: ${cover.missing.join(" ; ")}`).toEqual([]);
            expect(cover.ok).toBe(true);
            sim.dispose();
        } finally {
            ctx.release(s);
        }
    });

    it("paramsFor(global): the PD-5 temperature schedule (iterations 9: dt 0.01) with the reheat anchor at floor(0.7 * 9) = 6; frK is 1 / sqrt(n) or k", async (t) => {
        requireGpu(t);
        const ctx = await acquire();
        const s = snapshotOf(KARATE_EDGES);
        try {
            const sim = asSim(createFruchtermanReingold(ctx, { iterations: 9, seed: 7 }));
            const positions = new Float32Array(3 * s.nodeCount).fill(Number.NaN);
            sim.load(s, positions);
            await sim.step(1);
            const temperatureAt = (global: number): number =>
                Math.fround(Number(sim.model.paramsFor(global, sim.options).temperature));
            expect(temperatureAt(0)).toBe(Math.fround(0.1));
            expect(temperatureAt(5)).toBe(Math.fround(0.05));
            expect(temperatureAt(9)).toBe(Math.fround(0.01));
            expect(temperatureAt(12)).toBe(0);
            expect(sim.model.paramsFor(2, sim.options)).toMatchObject({
                n: 34,
                dim: 2,
                flags: 0,
                tierStart: 0,
                tierEnd: 34,
                iterationIndex: 2,
                seed: 7,
                scalingRatio: 0,
                gravity: 0,
                jitterTolerance: 0,
                scale: 1,
                center: [0, 0, 0, 0],
                settleThreshold: 0.001,
                frK: 1 / Math.sqrt(34),
            });
            sim.reheat();
            expect(temperatureAt(20), "the first paramsFor after a reheat carries index 6").toBe(Math.fround(0.04));
            expect(temperatureAt(21)).toBe(Math.fround(0.03));
            expect(temperatureAt(26)).toBe(0);
            sim.setParams({ k: 0.25 });
            expect(sim.model.paramsFor(0, sim.options).frK).toBe(0.25);
            sim.dispose();
        } finally {
            ctx.release(s);
        }
    });
});
