/**
 * The option pins of createSpringElectrical (spec 7.20, 9.3; P5-T5 Step 3): the resolver's defaults (SE_DEFAULTS plus
 * the origin centre and the null seed) and every E_INVALID_ARGUMENT range (a POSITIVE gravity is accepted: ngraph's
 * "if you make it positive nodes start attract each other"), the patch rule with maxInFlight pinned, the constant
 * override set of PD-1 / PD-20, the six specs covered by the compile matrix, paramsFor's PD-12 mapping (`gravity` ->
 * `coulomb`, FA2's `gravity` 0, `frK` 0), a numeric setParams that recompiles nothing and reheats, the mass
 * `1 + degree / 3` on karate (PD-11), and the stats decoder.
 *
 * Every GPU test acquires a FRESH context (spec 11.2) and releases its snapshots; a wrong result is never a skip.
 */

import { type F32, type GraphSnapshot } from "@graphty/graph-format";

import { MAX_ITERATIONS_PER_STEP, SE_DEFAULTS, TRACE_RECORD_BYTES } from "../../src/constants.js";
import { WebGpuGraphError, type WebGpuGraphErrorCode } from "../../src/errors.js";
import { FA2_STATE, FA2_TRACE } from "../../src/kernels.js";
import { ForceSimulation, type StateWriter } from "../../src/layouts/force-simulation.js";
import { resolveLayoutTuning } from "../../src/layouts/forceatlas2.js";
import {
    createSpringElectrical,
    resolveSpringElectricalOptions,
    SpringElectricalModel,
} from "../../src/layouts/spring-electrical.js";
import { type GpuLayoutSimulation, type GpuLayoutTuning, type SpringElectricalStats } from "../../src/types/layout.js";
import { type SpringElectricalOptions } from "../../src/types/options.js";
import { KARATE_EDGES, snapshotOf } from "../helpers/graphs.js";
import { matrixCovers } from "../helpers/override-matrix.js";
import { acquire, requireGpu } from "../setup/gpu.js";

type SeSim = ForceSimulation<SpringElectricalOptions, SpringElectricalStats>;

/** A JS-shaped option record (out-of-type values for the range tests). */
function loose(record: Record<string, unknown>): SpringElectricalOptions & GpuLayoutTuning {
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

/** Narrows the public simulation to the class so the @internal members (model, options, inspect) are reachable. */
function asSim(sim: GpuLayoutSimulation<SpringElectricalOptions, SpringElectricalStats>): SeSim {
    if (!(sim instanceof ForceSimulation)) {
        throw new Error("createSpringElectrical must return a ForceSimulation");
    }
    return sim;
}

function nanPositions(n: number): F32 {
    return new Float32Array(3 * n).fill(Number.NaN);
}

class FakeWriter implements StateWriter {
    readonly writes: [string, number | readonly number[]][] = [];
    set(field: string, value: number | readonly number[]): void {
        this.writes.push([field, value]);
    }
    get(field: string): number | readonly number[] {
        for (let i = this.writes.length - 1; i >= 0; i--) {
            if (this.writes[i][0] === field) {
                return this.writes[i][1];
            }
        }
        return 0;
    }
}

const DEFAULT_RESOLVED = {
    springLength: 10,
    springCoefficient: null,
    gravity: null,
    dragCoefficient: 0.9,
    timeStep: 0.5,
    dim: 2,
    scale: 1,
    center: [0, 0, 0],
    seed: null,
    settleThreshold: 0.001,
    settleWindow: 10,
    iterationsPerStep: 1,
    maxInFlight: 2,
};

const SE_OVERRIDES = {
    LINLOG: false,
    DISTRIBUTED: false,
    TIER: 0,
    SWING_MODE: 1,
    STRONG_GRAVITY: false,
    GRAVITY_CENTER: 0,
    LAW: 2,
    APPLY: 2,
    STATS_MODE: 2,
};

// ============================================================ the resolver (no device)

describe("resolveSpringElectricalOptions (spec 7.20, 9.3; ngraph's names and defaults)", () => {
    it("applies SE_DEFAULTS plus the origin centre and the null seed; the record is frozen", () => {
        expect(resolveSpringElectricalOptions(undefined)).toEqual({
            ...SE_DEFAULTS,
            gravity: null,
            springCoefficient: null,
            center: [0, 0, 0],
            seed: null,
        });
        expect(resolveSpringElectricalOptions(undefined)).toEqual(DEFAULT_RESOLVED);
        expect(resolveSpringElectricalOptions({})).toEqual(DEFAULT_RESOLVED);
        expect(Object.isFrozen(resolveSpringElectricalOptions({}))).toBe(true);
        expect(
            resolveSpringElectricalOptions({
                springLength: 30,
                springCoefficient: 0.5,
                gravity: -1.2,
                dragCoefficient: 0.02,
                timeStep: 20,
                dim: 3,
                scale: 100,
                center: [1, 2, 0],
                seed: 42,
                settleThreshold: 0,
                settleWindow: 3,
                iterationsPerStep: 4,
                maxInFlight: 1,
            }),
        ).toEqual({
            springLength: 30,
            springCoefficient: 0.5,
            gravity: -1.2,
            dragCoefficient: 0.02,
            timeStep: 20,
            dim: 3,
            scale: 100,
            center: [1, 2, 0],
            seed: 42,
            settleThreshold: 0,
            settleWindow: 3,
            iterationsPerStep: 4,
            maxInFlight: 1,
        });
        // a POSITIVE gravity is accepted (ngraph createPhysicsSimulator.js:38-39) and so is a zero drag
        expect(resolveSpringElectricalOptions({ gravity: 5 }).gravity).toBe(5);
        expect(resolveSpringElectricalOptions({ gravity: 0 }).gravity).toBe(0);
        expect(resolveSpringElectricalOptions({ dragCoefficient: 0 }).dragCoefficient).toBe(0);
        expect(resolveSpringElectricalOptions({ iterationsPerStep: MAX_ITERATIONS_PER_STEP }).iterationsPerStep).toBe(
            MAX_ITERATIONS_PER_STEP,
        );
    });

    it("rejects every out-of-range field with E_INVALID_ARGUMENT naming the argument", () => {
        const bad: [Record<string, unknown>, string][] = [
            [{ springLength: 0 }, "springLength"],
            [{ springLength: -1 }, "springLength"],
            [{ springLength: "10" }, "springLength"],
            [{ springCoefficient: 0 }, "springCoefficient"],
            [{ springCoefficient: -0.5 }, "springCoefficient"],
            [{ dragCoefficient: -0.1 }, "dragCoefficient"],
            [{ dragCoefficient: Number.NaN }, "dragCoefficient"],
            [{ timeStep: 0 }, "timeStep"],
            [{ timeStep: -1 }, "timeStep"],
            [{ gravity: Number.NaN }, "gravity"],
            [{ gravity: Number.POSITIVE_INFINITY }, "gravity"],
            [{ gravity: Number.NEGATIVE_INFINITY }, "gravity"],
            [{ gravity: "-12" }, "gravity"],
            [{ settleWindow: 0 }, "settleWindow"],
            [{ settleThreshold: -0.001 }, "settleThreshold"],
            [{ maxInFlight: 0 }, "maxInFlight"],
            [{ maxInFlight: 2.5 }, "maxInFlight"],
            [{ iterationsPerStep: 0 }, "iterationsPerStep"],
            [{ iterationsPerStep: MAX_ITERATIONS_PER_STEP + 1 }, "iterationsPerStep"],
            [{ dim: 4 }, "dim"],
            [{ scale: 0 }, "scale"],
            [{ center: [1] }, "center"],
            [{ center: [1, Number.NaN] }, "center"],
            [{ seed: Number.POSITIVE_INFINITY }, "seed"],
        ];
        for (const [record, argument] of bad) {
            expectCode(() => resolveSpringElectricalOptions(loose(record)), "E_INVALID_ARGUMENT", { argument });
        }
    });

    it("merges a patch over a previous record and pins maxInFlight", () => {
        const previous = resolveSpringElectricalOptions({ gravity: -3, seed: 5, maxInFlight: 4, dim: 3 });
        expect(resolveSpringElectricalOptions({ springLength: 20 }, previous)).toEqual({
            ...previous,
            springLength: 20,
        });
        expect(resolveSpringElectricalOptions({}, previous)).toEqual(previous);
        expect(resolveSpringElectricalOptions({ maxInFlight: 4 }, previous)).toEqual(previous);
        expect(resolveSpringElectricalOptions({ seed: null }, previous).seed).toBeNull();
        expectCode(() => resolveSpringElectricalOptions({ maxInFlight: 3 }, previous), "E_INVALID_ARGUMENT", {
            argument: "maxInFlight",
            value: 3,
            expected: 4,
        });
        expectCode(() => resolveSpringElectricalOptions({ timeStep: 0 }, previous), "E_INVALID_ARGUMENT", {
            argument: "timeStep",
        });
    });
});

// ============================================================ the model without a device

describe("SpringElectricalModel (no device; contract 3.13)", () => {
    const model = new SpringElectricalModel(resolveLayoutTuning(undefined), resolveSpringElectricalOptions(undefined));

    it("has the springElectrical kind, the four-kernel stages, the FA2 blocks and the velocity buffer (PD-2)", () => {
        expect(model.kind).toBe("springElectrical");
        expect(model.stages).toEqual(["K1", "K2", "K3", "K5", "toScene"]);
        expect(model.params.name).toBe("Fa2Params");
        expect(model.state.name).toBe("Fa2State");
        expect(model.trace.name).toBe("Fa2Trace");
        expect(model.buffers(34, 2).map((b) => [b.name, b.byteLength, b.zero])).toEqual([
            ["force", 408, true],
            ["velocity", 408, true],
            ["fillParams", 256, false],
        ]);
        expect(model.buffers(0, 3).map((b) => b.byteLength)).toEqual([12, 12, 256]);
    });

    it("compiles every option record to the constant override set (PD-1, PD-20)", () => {
        expect(model.overrides(resolveSpringElectricalOptions(undefined))).toEqual(SE_OVERRIDES);
        expect(model.overrides(resolveSpringElectricalOptions({ gravity: 3, springLength: 1, timeStep: 9 }))).toEqual(
            SE_OVERRIDES,
        );
    });

    it("hands each of the six kernels only the override names its entry declares (no fa2-speed-finalize)", () => {
        const merged = { ...SE_OVERRIDES, USE_PERM: false, HAS_WEIGHTS: false };
        const specs = model.specs(merged, true);
        expect(specs.map((s) => s.id)).toEqual([
            "fa2-stats-finalize",
            "fa2-attraction",
            "fa2-repulsion-exact",
            "fa2-integrate",
            "fa2-to-scene",
            "fill",
        ]);
        expect(specs.map((s) => s.overrides)).toEqual([
            { STATS_MODE: 2 },
            { LINLOG: false, DISTRIBUTED: false, TIER: 0, USE_PERM: false, HAS_WEIGHTS: false, LAW: 2 },
            { SWING_MODE: 1, STRONG_GRAVITY: false, GRAVITY_CENTER: 0, LAW: 2 },
            { SWING_MODE: 1, APPLY: 2 },
            {},
            {},
        ]);
    });

    it("inputs(): mass 1 + degree / 3 (PD-11; karate node 33 has degree 17), weights none, no fixed", () => {
        const s = snapshotOf(KARATE_EDGES, { label: "karate" });
        const inputs = model.inputs(s, resolveSpringElectricalOptions(undefined));
        expect(inputs.mass).toBeInstanceOf(Float32Array);
        expect(inputs.mass).toHaveLength(34);
        expect(inputs.mass[33]).toBe(Math.fround(1 + 17 / 3));
        expect(inputs.mass[0]).toBe(Math.fround(1 + 16 / 3));
        expect(inputs.mass[11]).toBe(Math.fround(1 + 1 / 3));
        const degree = s.outDegree();
        for (let i = 0; i < 34; i++) {
            expect(inputs.mass[i]).toBe(Math.fround(1 + degree[i] / 3));
        }
        expect(inputs.weights).toEqual({ data: null, source: "none", column: null });
        expect(inputs.fixed).toBeUndefined();
    });

    it("refuses paramsFor before bind() with E_NOT_LOADED", () => {
        expectCode(() => model.paramsFor(0, resolveSpringElectricalOptions(undefined)), "E_NOT_LOADED", {
            state: "created",
        });
    });

    it("onLoad writes kineticEnergy 0 and temperature 0; onReheat writes nothing; onSetParams replaces the record", () => {
        const writer = new FakeWriter();
        model.onLoad(writer);
        expect(writer.writes).toEqual([
            ["kineticEnergy", 0],
            ["temperature", 0],
        ]);
        const reheat = new FakeWriter();
        model.onReheat(reheat);
        expect(reheat.writes).toEqual([]);
        const fresh = new SpringElectricalModel(
            resolveLayoutTuning(undefined),
            resolveSpringElectricalOptions(undefined),
        );
        const set = new FakeWriter();
        fresh.onSetParams({ springLength: 3 }, set);
        expect(set.writes).toEqual([]);
        expectCode(() => fresh.onSetParams({ timeStep: -1 }, set), "E_INVALID_ARGUMENT", { argument: "timeStep" });
    });

    it("readStats decodes the header and the trace records (kineticEnergy from modelScalar) with null grid fields", () => {
        const bytes = new ArrayBuffer(FA2_STATE.byteLength + 2 * FA2_TRACE.byteLength);
        const view = new DataView(bytes);
        FA2_STATE.write(view, {
            centroid: [0.25, -0.5, 0.125, 0],
            rmsRadius: 0.875,
            radius: 1.75,
            meanDisplacement: 0.0625,
            iteration: 12,
            settledCount: 3,
            kineticEnergy: 2.5,
        });
        FA2_TRACE.write(
            view,
            { modelScalar: 4.5, meanDisplacement: 0.03125, settledCount: 1, iteration: 11 },
            FA2_STATE.byteLength,
        );
        FA2_TRACE.write(
            view,
            { modelScalar: 2.5, meanDisplacement: 0.0625, settledCount: 3, iteration: 12 },
            FA2_STATE.byteLength + FA2_TRACE.byteLength,
        );
        const stats = model.readStats(
            new DataView(bytes, 0, FA2_STATE.byteLength),
            new DataView(bytes, FA2_STATE.byteLength, 2 * FA2_TRACE.byteLength),
        );
        expect(stats).toEqual({
            iteration: 12,
            meanDisplacement: 0.0625,
            rmsRadius: 0.875,
            layoutRadius: 1.75,
            centroid: [0.25, -0.5, 0.125],
            repulsionTier: "exact",
            maxCellOccupancy: null,
            outsideGrid: null,
            msPerIteration: null,
            kineticEnergy: 2.5,
            trace: [
                { kineticEnergy: 4.5, meanDisplacement: 0.03125, settledCount: 1 },
                { kineticEnergy: 2.5, meanDisplacement: 0.0625, settledCount: 3 },
            ],
        });
        expect(FA2_TRACE.byteLength).toBe(TRACE_RECORD_BYTES);
    });
});

// ============================================================ on the device

describe("createSpringElectrical on the device (spec 7.20; PD-12)", () => {
    let s: GraphSnapshot;

    beforeAll(() => {
        s = snapshotOf(KARATE_EDGES, { label: "karate" });
    });

    it("returns a ForceSimulation in state created whose stats read 0 before load() and kineticEnergy 0 after it", async (t) => {
        requireGpu(t);
        const ctx = await acquire();
        const sim = asSim(createSpringElectrical(ctx));
        try {
            expect(sim.state).toBe("created");
            expect(sim.model.kind).toBe("springElectrical");
            expect(sim.options).toEqual(DEFAULT_RESOLVED);
            const before = sim.stats;
            expect(before.kineticEnergy).toBe(0);
            expect(before.trace).toEqual([]);
            expect(before.iteration).toBe(0);
            sim.load(s, nanPositions(s.nodeCount));
            expect(sim.state).toBe("loaded");
            expect(sim.stats.kineticEnergy).toBe(0);
            expect(sim.stats.trace).toEqual([]);
            expect(sim.stats.repulsionTier).toBe("exact");
        } finally {
            sim.dispose();
            ctx.release(s);
        }
    });

    it("paramsFor writes coulomb = gravity, FA2 gravity 0, frK 0, temperature 0 and ngraph's four other constants (PD-12)", async (t) => {
        requireGpu(t);
        const ctx = await acquire();
        const sim = asSim(
            createSpringElectrical(ctx, {
                seed: 7,
                gravity: -3.5,
                springLength: 12,
                springCoefficient: 0.25,
                dragCoefficient: 0.75,
                timeStep: 0.125,
            }),
        );
        try {
            sim.load(s, nanPositions(s.nodeCount));
            await sim.step(3);
            expect(sim.model.paramsFor(3, sim.options)).toMatchObject({
                n: 34,
                dim: 2,
                flags: 0,
                tierStart: 0,
                tierEnd: 34,
                iterationIndex: 3,
                seed: 7,
                scalingRatio: 0,
                gravity: 0,
                jitterTolerance: 0,
                scale: 1,
                center: [0, 0, 0, 0],
                settleThreshold: 0.001,
                frK: 0,
                temperature: 0,
                springLength: 12,
                springCoefficient: 0.25,
                coulomb: -3.5,
                dragCoefficient: 0.75,
                timeStep: 0.125,
            });
            const { stats } = sim;
            expect(stats.iteration).toBe(3);
            expect(stats.trace).toHaveLength(3);
            for (const record of stats.trace) {
                expect(Number.isFinite(record.kineticEnergy)).toBe(true);
                expect(record.kineticEnergy).toBeGreaterThanOrEqual(0);
            }
        } finally {
            sim.dispose();
            ctx.release(s);
        }
    });

    it("a numeric setParams patch recompiles nothing and reheats; a bad patch leaves the record alone", async (t) => {
        requireGpu(t);
        const ctx = await acquire();
        const sim = asSim(createSpringElectrical(ctx, { seed: 7 }));
        try {
            const positions = nanPositions(s.nodeCount);
            sim.load(s, positions);
            await sim.step(4);
            expect(sim.iterationsDone).toBe(4);
            const pipelines = ctx.pipelines.size;
            sim.setParams({ springLength: 20, gravity: -6, timeStep: 0.25 });
            expect(sim.iterationsDone, "setParams reheats").toBe(0);
            expect(ctx.pipelines.size, "no recompile: the override set is constant").toBe(pipelines);
            expect(sim.options.springLength).toBe(20);
            expect(sim.options.gravity).toBe(-6);
            expect(sim.options.timeStep).toBe(0.25);
            await sim.step(2);
            expect(sim.iterationsDone).toBe(2);
            expect(ctx.pipelines.size).toBe(pipelines);
            expectCode(() => sim.setParams({ springCoefficient: 0 }), "E_INVALID_ARGUMENT", {
                argument: "springCoefficient",
            });
            expect(sim.options.springLength).toBe(20);
            expect(sim.iterationsDone, "a rejected patch changes nothing").toBe(2);
            expectCode(() => sim.setParams({ dim: 3 }), "E_INVALID_ARGUMENT", { argument: "dim" });
            expectCode(() => sim.setParams({ maxInFlight: 5 }), "E_INVALID_ARGUMENT", { argument: "maxInFlight" });
        } finally {
            sim.dispose();
            ctx.release(s);
        }
    });

    it("compiles its six pipelines on the device, every key covered by OVERRIDE_MATRIX", async (t) => {
        requireGpu(t);
        const ctx = await acquire();
        const sim = createSpringElectrical(ctx, { seed: 7 });
        try {
            sim.load(s, nanPositions(s.nodeCount));
            await sim.step(1);
            expect(ctx.pipelines.size).toBe(6);
            const keys = ctx.pipelines.keys();
            expect(keys.filter((k) => k.startsWith("fa2-speed-finalize|"))).toHaveLength(0);
            expect(keys.some((k) => k.startsWith("fa2-integrate|") && k.includes('"APPLY":2'))).toBe(true);
            expect(keys.some((k) => k.startsWith("fa2-stats-finalize|") && k.includes('"STATS_MODE":2'))).toBe(true);
            const cover = matrixCovers(keys, ctx.caps);
            expect(cover.missing, `keys missing from OVERRIDE_MATRIX: ${cover.missing.join(" ; ")}`).toEqual([]);
            expect(cover.ok).toBe(true);
        } finally {
            sim.dispose();
            ctx.release(s);
        }
    });
});
