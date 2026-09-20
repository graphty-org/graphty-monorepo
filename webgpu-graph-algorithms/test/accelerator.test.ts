import { createAccelerator } from "../src/accelerator.js";
import { connectedComponents } from "../src/algorithms/components.js";
import { pageRank, personalizedPageRank } from "../src/algorithms/pagerank.js";
import { eigenvectorCentrality, hits, katzCentrality } from "../src/algorithms/spectral.js";
import { FA2_DEFAULTS, FR_DEFAULTS, LAYOUT_TUNING_DEFAULTS, SE_DEFAULTS } from "../src/constants.js";
import { isWebGpuGraphError } from "../src/errors.js";
import { ForceSimulation } from "../src/layouts/force-simulation.js";
import { type AcceleratorOptions, type AlgorithmAccelerator } from "../src/types/accelerator.js";
import {
    type ForceAtlas2Stats,
    type FruchtermanReingoldStats,
    type GpuLayoutTuning,
    type LayoutStatsBase,
    type SpringElectricalStats,
} from "../src/types/layout.js";
import {
    type CommonLayoutOptions,
    type ForceAtlas2Options,
    type FruchtermanReingoldOptions,
    type SimulationOptions,
    type SpringElectricalOptions,
} from "../src/types/options.js";
import { KARATE_EDGES, snapshotOf } from "./helpers/graphs.js";
import { expectBitwiseEqual } from "./helpers/matchers.js";
import { acquire, requireGpu } from "./setup/gpu.js";

/** The seven P7 algorithm members (spec 9.2; M8b-T8 PD-14), in the order AlgorithmAccelerator declares them. */
const ALGORITHM_MEMBERS = [
    "pageRank",
    "personalizedPageRank",
    "hits",
    "eigenvectorCentrality",
    "katzCentrality",
    "connectedComponents",
    "weaklyConnectedComponents",
] as const;

/** The simulation class behind createForceAtlas2, narrowed so the tests can read `tuning` and `options`. */
type Fa2Simulation = ForceSimulation<ForceAtlas2Options, ForceAtlas2Stats>;

/** The two P5 layout members (spec 3.3 lines 892-893; PD-19), beside `forceAtlas2`. */
const P5_LAYOUT_MEMBERS = ["fruchtermanReingold", "springElectrical"] as const;

/** The WebGpuGraphError code `fn` throws synchronously, or null when it returns or throws something else. */
function thrownCode(fn: () => unknown): string | null {
    try {
        fn();
    } catch (error: unknown) {
        return isWebGpuGraphError(error) ? error.code : null;
    }
    return null;
}

/** Narrows the public simulation type to the class (asserting it IS the class, contract 3.13). */
function asForceSimulation(sim: unknown): Fa2Simulation {
    expect(sim).toBeInstanceOf(ForceSimulation);
    return sim as Fa2Simulation;
}

/** The same narrowing for the P5 models, keeping the option and stats types the member declares. */
function asModelSimulation<Options extends CommonLayoutOptions & SimulationOptions, Stats extends LayoutStatsBase>(
    sim: unknown,
): ForceSimulation<Options, Stats> {
    expect(sim).toBeInstanceOf(ForceSimulation);
    return sim as ForceSimulation<Options, Stats>;
}

describe("createAccelerator (contract 3.14; spec 3.3, 9.2, 9.3)", () => {
    it("carries kind, ctx and exactly the P3 + P7 members; a missing method is undefined for the dispatchers", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "accelerator-members" });
        const acc = createAccelerator(ctx);
        expect(acc.kind).toBe("webgpu");
        expect(acc.ctx).toBe(ctx);
        expect(Object.keys(acc).sort()).toEqual(
            [
                "ctx",
                "dispose",
                "forceAtlas2",
                "kind",
                "options",
                "release",
                ...P5_LAYOUT_MEMBERS,
                ...ALGORITHM_MEMBERS,
            ].sort(),
        );
        expect(typeof acc.forceAtlas2).toBe("function");
        expect(typeof acc.fruchtermanReingold).toBe("function");
        expect(typeof acc.springElectrical).toBe("function");
        expect(typeof acc.release).toBe("function");
        expect(typeof acc.dispose).toBe("function");
        // spec 2.4 row "method missing" / 9.2 `acc.betweennessCentrality === undefined -> CPU`: absent, never a
        // throwing stub (P9's member); the P7 members are present and route to the GPU
        expect(acc.betweennessCentrality).toBeUndefined();
        expect("betweennessCentrality" in acc).toBe(false);
        expect(acc.breadthFirstSearch).toBeUndefined();
        const route = acc.betweennessCentrality !== undefined ? "gpu" : "cpu";
        expect(route).toBe("cpu");
        const p7Route = acc.pageRank !== undefined ? "gpu" : "cpu";
        expect(p7Route).toBe("gpu");
        // one per call (spec 3.3): two accelerators over one context are distinct objects
        const second = createAccelerator(ctx);
        expect(second).not.toBe(acc);
        expect(second.ctx).toBe(ctx);
    });

    it("keeps a frozen deep copy of the options", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "accelerator-options" });
        const sources = [3, 1, 2];
        const layout: { compat: "networkx"; exactMaxNodes: number } = { compat: "networkx", exactMaxNodes: 4096 };
        const input: AcceleratorOptions = { layout, algorithms: { betweenness: { k: 8, sources } } };
        const acc = createAccelerator(ctx, input);
        expect(acc.options).toEqual(input);
        expect(acc.options).not.toBe(input);
        expect(acc.options.layout).not.toBe(layout);
        expect(acc.options.algorithms).not.toBe(input.algorithms);
        expect(acc.options.algorithms?.betweenness).not.toBe(input.algorithms?.betweenness);
        expect(acc.options.algorithms?.betweenness?.sources).not.toBe(sources);
        const frozenLevels = [
            acc.options,
            acc.options.layout,
            acc.options.algorithms,
            acc.options.algorithms?.betweenness,
            acc.options.algorithms?.betweenness?.sources,
        ];
        for (const level of frozenLevels) {
            expect(level).toBeDefined();
            expect(Object.isFrozen(level)).toBe(true);
        }
        // a later edit of the caller's objects is invisible to the accelerator
        layout.exactMaxNodes = 1;
        sources.push(99);
        expect(acc.options.layout?.exactMaxNodes).toBe(4096);
        expect(acc.options.algorithms?.betweenness?.sources).toEqual([3, 1, 2]);
        // and a write into the copy throws (ES modules run in strict mode: a frozen property assignment is a TypeError)
        expect(() => {
            (acc.options as { layout?: unknown }).layout = undefined;
        }).toThrow(TypeError);
        const nested: { compat?: unknown } | undefined = acc.options.layout;
        expect(nested).toBeDefined();
        expect(() => {
            if (nested !== undefined) {
                nested.compat = "paper";
            }
        }).toThrow(TypeError);
    });

    it("copies every level the options may carry (each branch of the freeze helper)", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "accelerator-option-shapes" });
        const cases: readonly { readonly name: string; readonly input: AcceleratorOptions | undefined }[] = [
            { name: "undefined", input: undefined },
            { name: "empty", input: {} },
            { name: "layout only", input: { layout: { compat: "networkx" } } },
            { name: "algorithms empty", input: { algorithms: {} } },
            { name: "betweenness k only", input: { algorithms: { betweenness: { k: 8 } } } },
            { name: "betweenness sources only", input: { algorithms: { betweenness: { sources: [1, 2] } } } },
            {
                name: "everything",
                input: { layout: { exactMaxNodes: 64 }, algorithms: { betweenness: { k: 2, sources: [0] } } },
            },
        ];
        for (const { name, input } of cases) {
            const acc = createAccelerator(ctx, input);
            expect(Object.isFrozen(acc.options), name).toBe(true);
            expect(acc.options, name).toEqual(input ?? {});
            if (input !== undefined) {
                expect(acc.options, name).not.toBe(input);
            }
            if (input?.layout !== undefined) {
                expect(Object.isFrozen(acc.options.layout), name).toBe(true);
                expect(acc.options.layout, name).not.toBe(input.layout);
            }
            if (input?.algorithms !== undefined) {
                expect(Object.isFrozen(acc.options.algorithms), name).toBe(true);
                expect(acc.options.algorithms, name).not.toBe(input.algorithms);
            }
            if (input?.algorithms?.betweenness !== undefined) {
                expect(Object.isFrozen(acc.options.algorithms?.betweenness), name).toBe(true);
                expect(acc.options.algorithms?.betweenness, name).not.toBe(input.algorithms.betweenness);
            }
            if (input?.algorithms?.betweenness?.sources !== undefined) {
                expect(Object.isFrozen(acc.options.algorithms?.betweenness?.sources), name).toBe(true);
                expect(acc.options.algorithms?.betweenness?.sources, name).not.toBe(
                    input.algorithms.betweenness.sources,
                );
            }
        }
        expect(createAccelerator(ctx, undefined).options).toEqual({});
    });

    it("forceAtlas2 inherits options.layout and passes the CPU options through", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "accelerator-tuning" });
        const acc = createAccelerator(ctx, { layout: { exactMaxNodes: 4096, compat: "networkx" } });
        const sim = asForceSimulation(acc.forceAtlas2({ maxIter: 5, seed: 7 }));
        expect(sim.ctx).toBe(ctx);
        // the two tuning knobs given to createAccelerator are visible in the simulation's resolved tuning ...
        expect(sim.tuning.exactMaxNodes).toBe(4096);
        expect(sim.tuning.compat).toBe("networkx");
        // ... the untouched knobs keep LAYOUT_TUNING_DEFAULTS ...
        expect(sim.tuning.repulsion).toBe(LAYOUT_TUNING_DEFAULTS.repulsion);
        expect(sim.tuning.nearMax).toBe(LAYOUT_TUNING_DEFAULTS.nearMax);
        expect(sim.tuning.deterministic).toBe(LAYOUT_TUNING_DEFAULTS.deterministic);
        expect(sim.tuning.gridMax2D).toBe(LAYOUT_TUNING_DEFAULTS.gridMax2D);
        expect(sim.tuning.gridMax3D).toBe(LAYOUT_TUNING_DEFAULTS.gridMax3D);
        expect(sim.tuning.extentFactor).toBe(LAYOUT_TUNING_DEFAULTS.extentFactor);
        // ... and the CPU options reach the simulation with FA2_DEFAULTS applied to the rest
        expect(sim.options.maxIter).toBe(5);
        expect(sim.options.seed).toBe(7);
        expect(sim.options.gravity).toBe(FA2_DEFAULTS.gravity);
        expect(sim.options.scalingRatio).toBe(FA2_DEFAULTS.scalingRatio);
        expect(sim.options.iterationsPerStep).toBe(FA2_DEFAULTS.iterationsPerStep);
        sim.dispose();
        // no layout defaults at all -> LAYOUT_TUNING_DEFAULTS throughout
        const plain = asForceSimulation(createAccelerator(ctx).forceAtlas2());
        expect(plain.tuning).toEqual({ ...LAYOUT_TUNING_DEFAULTS });
        expect(plain.options.maxIter).toBe(FA2_DEFAULTS.maxIter);
        plain.dispose();
        // contract 3.14: `{ ...o, ...options.layout }` -- tuning keys smuggled through the CPU-typed argument lose
        const smuggled: ForceAtlas2Options & GpuLayoutTuning = { maxIter: 3, compat: "paper", exactMaxNodes: 64 };
        const overridden = asForceSimulation(acc.forceAtlas2(smuggled));
        expect(overridden.tuning.compat).toBe("networkx");
        expect(overridden.tuning.exactMaxNodes).toBe(4096);
        expect(overridden.options.maxIter).toBe(3);
        overridden.dispose();
        // what createForceAtlas2 throws, the accelerator throws (contract 3.13: nodeSize -> E_UNSUPPORTED at creation)
        expect(thrownCode(() => acc.forceAtlas2({ nodeSize: "radius" }))).toBe("E_UNSUPPORTED");
        expect(thrownCode(() => acc.forceAtlas2({ gravity: -1 }))).toBe("E_INVALID_ARGUMENT");
    });

    it("fruchtermanReingold inherits options.layout, passes the CPU options through and lays out karate (PD-19)", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "accelerator-fr" });
        const acc = createAccelerator(ctx, { layout: { exactMaxNodes: 4096, compat: "networkx" } });
        // (a) a fresh simulation in state "created" over the FR model
        const sim = asModelSimulation<FruchtermanReingoldOptions, FruchtermanReingoldStats>(
            acc.fruchtermanReingold({ iterations: 30, k: 0.5, seed: 7 }),
        );
        expect(sim.ctx).toBe(ctx);
        expect(sim.state).toBe("created");
        expect(sim.model.kind).toBe("fruchtermanReingold");
        // (b) the tuning given to createAccelerator reaches the simulation, the rest keeps LAYOUT_TUNING_DEFAULTS
        expect(sim.tuning.exactMaxNodes).toBe(4096);
        expect(sim.tuning.compat).toBe("networkx");
        expect(sim.tuning.repulsion).toBe(LAYOUT_TUNING_DEFAULTS.repulsion);
        expect(sim.tuning.deterministic).toBe(LAYOUT_TUNING_DEFAULTS.deterministic);
        // (c) the CPU-typed record's fields reach the simulation with FR_DEFAULTS applied to the rest
        expect(sim.options.iterations).toBe(30);
        expect(sim.options.k).toBe(0.5);
        expect(sim.options.seed).toBe(7);
        expect(sim.options.dim).toBe(FR_DEFAULTS.dim);
        expect(sim.options.settleWindow).toBe(FR_DEFAULTS.settleWindow);
        expect(sim.options.iterationsPerStep).toBe(FR_DEFAULTS.iterationsPerStep);
        sim.dispose();
        const plain = asModelSimulation<FruchtermanReingoldOptions, FruchtermanReingoldStats>(
            createAccelerator(ctx).fruchtermanReingold(),
        );
        expect(plain.tuning).toEqual({ ...LAYOUT_TUNING_DEFAULTS });
        expect(plain.options.iterations).toBe(FR_DEFAULTS.iterations);
        expect(plain.options.k).toBe(FR_DEFAULTS.k);
        plain.dispose();
        // contract 3.14: `{ ...o, ...options.layout }` -- tuning keys smuggled through the CPU-typed argument lose
        const smuggled: FruchtermanReingoldOptions & GpuLayoutTuning = {
            iterations: 3,
            compat: "paper",
            exactMaxNodes: 64,
        };
        const overridden = asModelSimulation<FruchtermanReingoldOptions, FruchtermanReingoldStats>(
            acc.fruchtermanReingold(smuggled),
        );
        expect(overridden.tuning.compat).toBe("networkx");
        expect(overridden.tuning.exactMaxNodes).toBe(4096);
        expect(overridden.options.iterations).toBe(3);
        overridden.dispose();
        // what createFruchtermanReingold throws, the accelerator throws (a negative k; iterations 0 is legal: settled at load)
        expect(thrownCode(() => acc.fruchtermanReingold({ k: -1 }))).toBe("E_INVALID_ARGUMENT");
        expect(thrownCode(() => acc.fruchtermanReingold({ iterations: -1 }))).toBe("E_INVALID_ARGUMENT");
        // (d) a 34-node karate run through the member lays out end to end
        const snapshot = snapshotOf(KARATE_EDGES);
        const run = acc.fruchtermanReingold({ seed: 11 });
        const positions = new Float32Array(3 * snapshot.nodeCount).fill(Number.NaN);
        run.load(snapshot, positions);
        const stats = await run.run({ maxIter: 20 });
        expect(run.iterationsDone).toBe(20);
        expect(run.inFlight).toBe(0);
        expect(stats.repulsionTier).toBe("exact");
        expect(stats.iteration).toBe(20);
        expect(Number.isFinite(stats.temperature)).toBe(true);
        expect(Array.from(positions).every((v) => Number.isFinite(v))).toBe(true);
        run.dispose();
        acc.release(snapshot);
        expect(ctx.residency.stats().buffers).toBe(0);
    });

    it("springElectrical inherits options.layout, passes the CPU options through and lays out karate (PD-19)", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "accelerator-se" });
        const acc = createAccelerator(ctx, { layout: { exactMaxNodes: 4096, compat: "networkx" } });
        // (a) a fresh simulation in state "created" over the spring-electrical model
        const sim = asModelSimulation<SpringElectricalOptions, SpringElectricalStats>(
            acc.springElectrical({ springLength: 5, timeStep: 0.25, seed: 7 }),
        );
        expect(sim.ctx).toBe(ctx);
        expect(sim.state).toBe("created");
        expect(sim.model.kind).toBe("springElectrical");
        // (b) the tuning given to createAccelerator reaches the simulation, the rest keeps LAYOUT_TUNING_DEFAULTS
        expect(sim.tuning.exactMaxNodes).toBe(4096);
        expect(sim.tuning.compat).toBe("networkx");
        expect(sim.tuning.repulsion).toBe(LAYOUT_TUNING_DEFAULTS.repulsion);
        expect(sim.tuning.deterministic).toBe(LAYOUT_TUNING_DEFAULTS.deterministic);
        // (c) the CPU-typed record's fields reach the simulation with SE_DEFAULTS applied to the rest
        expect(sim.options.springLength).toBe(5);
        expect(sim.options.timeStep).toBe(0.25);
        expect(sim.options.seed).toBe(7);
        expect(sim.options.gravity, "left out: the size-scaled default").toBeNull();
        expect(sim.options.springCoefficient, "left out: the size-scaled default").toBeNull();
        expect(sim.options.dragCoefficient).toBe(SE_DEFAULTS.dragCoefficient);
        expect(sim.options.dim).toBe(SE_DEFAULTS.dim);
        sim.dispose();
        const plain = asModelSimulation<SpringElectricalOptions, SpringElectricalStats>(
            createAccelerator(ctx).springElectrical(),
        );
        expect(plain.tuning).toEqual({ ...LAYOUT_TUNING_DEFAULTS });
        expect(plain.options.springLength).toBe(SE_DEFAULTS.springLength);
        expect(plain.options.timeStep).toBe(SE_DEFAULTS.timeStep);
        plain.dispose();
        // contract 3.14: `{ ...o, ...options.layout }` -- tuning keys smuggled through the CPU-typed argument lose
        const smuggled: SpringElectricalOptions & GpuLayoutTuning = {
            springLength: 3,
            compat: "paper",
            exactMaxNodes: 64,
        };
        const overridden = asModelSimulation<SpringElectricalOptions, SpringElectricalStats>(
            acc.springElectrical(smuggled),
        );
        expect(overridden.tuning.compat).toBe("networkx");
        expect(overridden.tuning.exactMaxNodes).toBe(4096);
        expect(overridden.options.springLength).toBe(3);
        overridden.dispose();
        // what createSpringElectrical throws, the accelerator throws
        expect(thrownCode(() => acc.springElectrical({ springLength: 0 }))).toBe("E_INVALID_ARGUMENT");
        // (d) a 34-node karate run through the member lays out end to end
        const snapshot = snapshotOf(KARATE_EDGES);
        const run = acc.springElectrical({ seed: 11 });
        const positions = new Float32Array(3 * snapshot.nodeCount).fill(Number.NaN);
        run.load(snapshot, positions);
        const stats = await run.run({ maxIter: 20 });
        expect(run.iterationsDone).toBe(20);
        expect(run.inFlight).toBe(0);
        expect(stats.repulsionTier).toBe("exact");
        expect(stats.iteration).toBe(20);
        expect(Number.isFinite(stats.kineticEnergy)).toBe(true);
        expect(Array.from(positions).every((v) => Number.isFinite(v))).toBe(true);
        run.dispose();
        acc.release(snapshot);
        expect(ctx.residency.stats().buffers).toBe(0);
    });

    it("carries the seven P7 algorithm members, each delegating to its algorithm (PD-14; spec 9.2, 9.7)", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "accelerator-algorithms" });
        const acc = createAccelerator(ctx);
        const snapshot = snapshotOf(KARATE_EDGES);
        // structurally an AlgorithmAccelerator (spec 9.2): what the CPU dispatchers receive
        const injected: AlgorithmAccelerator = acc;
        for (const member of ALGORITHM_MEMBERS) {
            expect(typeof acc[member], member).toBe("function");
            expect(injected[member], member).toBe(acc[member]);
        }
        const pr = await acc.pageRank(snapshot, { dampingFactor: 0.9 });
        const prDirect = await pageRank(ctx, snapshot, { dampingFactor: 0.9 });
        expectBitwiseEqual(pr.scores, prDirect.scores, "pageRank");
        expect(pr.iterations).toBe(prDirect.iterations);
        expect(pr.converged).toBe(prDirect.converged);
        expect(pr.danglingMass).toBe(prDirect.danglingMass);
        expect(pr.precision).toBe("f32");
        const mass = new Float32Array(snapshot.nodeCount);
        mass[0] = 1;
        const ppr = await acc.personalizedPageRank(snapshot, mass);
        const pprDirect = await personalizedPageRank(ctx, snapshot, mass);
        expectBitwiseEqual(ppr.scores, pprDirect.scores, "personalizedPageRank");
        expect(ppr.iterations).toBe(pprDirect.iterations);
        // the CPU seam may hand an f64 personalization (spec 9.2 `F32 | F64`); it is narrowed to f32, not rejected
        const ppr64 = await acc.personalizedPageRank(snapshot, Float64Array.from(mass));
        expectBitwiseEqual(ppr64.scores, pprDirect.scores, "personalizedPageRank (f64)");
        const h = await acc.hits(snapshot, { maxIterations: 20 });
        const hDirect = await hits(ctx, snapshot, { maxIterations: 20 });
        expectBitwiseEqual(h.hubs, hDirect.hubs, "hits.hubs");
        expectBitwiseEqual(h.authorities, hDirect.authorities, "hits.authorities");
        expect(h.iterations).toBe(hDirect.iterations);
        const ev = await acc.eigenvectorCentrality(snapshot, { tolerance: 1e-5 });
        const evDirect = await eigenvectorCentrality(ctx, snapshot, { tolerance: 1e-5 });
        expectBitwiseEqual(ev.scores, evDirect.scores, "eigenvectorCentrality");
        expect(ev.converged).toBe(evDirect.converged);
        const katz = await acc.katzCentrality(snapshot, { alpha: 0.05, beta: 2 });
        const katzDirect = await katzCentrality(ctx, snapshot, { alpha: 0.05, beta: 2 });
        expectBitwiseEqual(katz.scores, katzDirect.scores, "katzCentrality");
        expect(katz.iterations).toBe(katzDirect.iterations);
        const cc = await acc.connectedComponents(snapshot);
        const wcc = await acc.weaklyConnectedComponents(snapshot);
        const ccDirect = await connectedComponents(ctx, snapshot);
        expectBitwiseEqual(cc.labels, wcc.labels, "connectedComponents vs weaklyConnectedComponents");
        expectBitwiseEqual(cc.labels, ccDirect.labels, "connectedComponents");
        expect(cc.count).toBe(ccDirect.count);
        expect(wcc.count).toBe(ccDirect.count);
        expect(cc.groups().length).toBe(cc.count);
        // renumber: false reaches the algorithm through both names (the option stays OPTIONAL, PD-19 clause 3)
        const raw = await acc.weaklyConnectedComponents(snapshot, { renumber: false });
        const rawDirect = await connectedComponents(ctx, snapshot, { renumber: false });
        expectBitwiseEqual(raw.labels, rawDirect.labels, "weaklyConnectedComponents raw roots");
        acc.release(snapshot);
        // after dispose every member rejects through assertReady (contract 3.14 throws line), never a hang
        acc.dispose();
        for (const member of ALGORITHM_MEMBERS) {
            const call =
                member === "personalizedPageRank" ? acc.personalizedPageRank(snapshot, mass) : acc[member](snapshot);
            await expect(call, member).rejects.toMatchObject({ code: "E_DISPOSED" });
        }
    });

    it("release and dispose delegate to the context", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "accelerator-lifecycle" });
        const acc = createAccelerator(ctx);
        const snapshot = snapshotOf(KARATE_EDGES);
        ctx.residency.core(snapshot);
        expect(ctx.residency.stats().buffers).toBeGreaterThan(0);
        const releaseSpy = vi.spyOn(ctx, "release");
        acc.release(snapshot);
        expect(releaseSpy).toHaveBeenCalledTimes(1);
        expect(releaseSpy.mock.calls[0]?.[0]).toBe(snapshot);
        expect(ctx.residency.stats().buffers).toBe(0);
        expect(ctx.residency.isReleased(snapshot.serial)).toBe(true);
        acc.release(snapshot); // idempotent (contract 3.5)
        acc.release(snapshotOf(KARATE_EDGES)); // never uploaded: safe
        expect(releaseSpy).toHaveBeenCalledTimes(3);
        releaseSpy.mockRestore();
        const disposeSpy = vi.spyOn(ctx, "dispose");
        acc.dispose();
        expect(disposeSpy).toHaveBeenCalledTimes(1);
        expect(ctx.state).toBe("disposed");
        acc.dispose(); // idempotent
        expect(disposeSpy).toHaveBeenCalledTimes(2);
        expect(ctx.state).toBe("disposed");
        disposeSpy.mockRestore();
        // afterwards every creating call fails through assertReady (contract 3.14 throws line)
        expect(thrownCode(() => acc.forceAtlas2())).toBe("E_DISPOSED");
        expect(thrownCode(() => acc.fruchtermanReingold())).toBe("E_DISPOSED");
        expect(thrownCode(() => acc.springElectrical())).toBe("E_DISPOSED");
        expect(thrownCode(() => createAccelerator(ctx))).toBe("E_DISPOSED");
    });

    it("lays out a graph end to end through the accelerator", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "accelerator-smoke" });
        const acc = createAccelerator(ctx, { layout: { compat: "paper" } });
        const snapshot = snapshotOf(KARATE_EDGES);
        const sim = acc.forceAtlas2({ maxIter: 4, seed: 11, iterationsPerStep: 2 });
        const positions = new Float32Array(3 * snapshot.nodeCount).fill(Number.NaN);
        sim.load(snapshot, positions);
        await sim.step();
        expect(sim.iterationsDone).toBe(2);
        expect(sim.inFlight).toBe(0);
        expect(sim.settled).toBe(false);
        expect(sim.stats.repulsionTier).toBe("exact");
        expect(sim.stats.maxCellOccupancy).toBeNull();
        expect(sim.stats.outsideGrid).toBeNull();
        expect(sim.stats.trace).toHaveLength(2);
        expect(Array.from(positions).every((v) => Number.isFinite(v))).toBe(true);
        // dim 2 (FA2_DEFAULTS.dim): every row's z is the same value (center.z), whatever was uploaded
        for (let i = 1; i < snapshot.nodeCount; i++) {
            expect(positions[3 * i + 2]).toBe(positions[2]);
        }
        await sim.step();
        expect(sim.iterationsDone).toBe(4);
        expect(sim.settled).toBe(true); // iterationsDone >= maxIter (contract 3.13 step())
        await sim.step(); // settled -> resolves at once, nothing submitted
        expect(sim.iterationsDone).toBe(4);
        sim.dispose();
        acc.release(snapshot);
        expect(ctx.residency.stats().buffers).toBe(0);
    });
});
