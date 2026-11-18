/**
 * The FAKE ForceModel of the shared layout state machine's tests (spec 7.19, 7.12, 7.17; contract 3.13
 * ForceSimulation): its kernels are the registry's `fill` body, so every rule of ForceSimulation is testable without
 * ForceAtlas2. Shared by test/layouts/force-simulation-states.test.ts (the `node` project) and
 * test/layouts/force-simulation.test.ts (the in-flight and device-loss cases, `node-device-errors`).
 */

import { type F32, type GraphSnapshot, type NodeMask } from "@graphty/graph-format";

import { LAYOUT_TUNING_DEFAULTS, STATE_HEADER_BYTES, UNIFORM_SLOT_BYTES } from "../../src/constants.js";
import { GpuContext } from "../../src/context.js";
import { BufferUsage } from "../../src/device/webgpu-constants.js";
import { isWebGpuGraphError } from "../../src/errors.js";
import { type CommandBatch } from "../../src/kernel/batch.js";
import { plan1d } from "../../src/kernel/dispatch.js";
import { type BoundKernel, type Kernel } from "../../src/kernel/kernel.js";
import { UniformBlock, type UniformValues } from "../../src/kernel/struct-block.js";
import { type WgslModuleSpec } from "../../src/kernel/wgsl.js";
import { FILL_PARAMS, KERNELS } from "../../src/kernels.js";
import {
    type BufferSpec,
    type ForceModel,
    ForceSimulation,
    type ModelInputs,
    type ModelResources,
    type StateWriter,
} from "../../src/layouts/force-simulation.js";
import { resolveNodeMass, resolveWeights } from "../../src/layouts/inputs.js";
import { type LayoutStatsBase, type ResolvedLayoutTuning } from "../../src/types/layout.js";
import { type CommonLayoutOptions, type SimulationOptions } from "../../src/types/options.js";
import { gpuScale } from "../setup/gpu.js";
import { pathEdges, snapshotOf } from "./graphs.js";

// ============================================================ the fake model

export interface FakeOptions extends CommonLayoutOptions, SimulationOptions {
    readonly maxIter?: number | undefined;
    /** A pretend force law: a change recompiles (the simulation compares model.overrides() before and after). */
    readonly law?: number | undefined;
}

interface FakeStats extends LayoutStatsBase {
    /** Trace word 0 of the landed batch = the ring value of its last iteration (a u32 bit pattern). */
    readonly traceWord: number;
}

const FAKE_PARAMS = UniformBlock.define("FakeParams", [
    ["n", "u32"],
    ["dim", "u32"],
    ["flags", "u32"],
    ["iterationIndex", "u32"],
    ["seed", "u32"],
    ["scale", "f32"],
    ["center", "vec4f"],
    ["settleThreshold", "f32"],
    ["count", "u32"],
    ["value", "u32"],
    ["mode", "u32"],
    ["clusterStrength", "f32"],
    ["clusterCount", "u32"],
]);

export const FAKE_STATE_FIELDS = [
    ["centroid", "vec4f"],
    ["min", "vec4f"],
    ["max", "vec4f"],
    ["rmsRadius", "f32"],
    ["radius", "f32"],
    ["meanDisplacement", "f32"],
    ["iteration", "u32"],
    ["settledCount", "u32"],
] as const;

const FAKE_STATE = UniformBlock.define("FakeState", FAKE_STATE_FIELDS, {
    layout: "storage",
    padTo: STATE_HEADER_BYTES,
});

export const FAKE_TRACE = UniformBlock.define(
    "FakeTrace",
    [
        ["value", "u32"],
        ["pad0", "u32"],
        ["pad1", "u32"],
        ["pad2", "u32"],
    ],
    { layout: "storage" },
);

/** The fill body bound to a u32 array with the fake's ring block. */
const FILL_SPEC: WgslModuleSpec = {
    id: "fake-fill",
    body: KERNELS.fill.body,
    bindings: [
        { group: 1, binding: 0, name: "dst", kind: "storage", wgslType: "array<u32>" },
        { group: 2, binding: 0, name: "P", kind: "uniform", wgslType: "FakeParams" },
    ],
    overrideDecls: [],
    overrides: {},
    needs: [],
    uniforms: [FAKE_PARAMS],
};

/** The fill body with the registry's own FillParams (the header fill reads a model-owned uniform buffer). */
const HEADER_SPEC: WgslModuleSpec = {
    id: "fake-fill-header",
    body: KERNELS.fill.body,
    bindings: [
        { group: 1, binding: 0, name: "dst", kind: "storage", wgslType: "array<u32>" },
        { group: 2, binding: 0, name: "P", kind: "uniform", wgslType: "FillParams" },
    ],
    overrideDecls: [],
    overrides: {},
    needs: [],
    uniforms: [FILL_PARAMS],
};

export function floatBits(v: number): number {
    return new Uint32Array(new Float32Array([v]).buffer)[0];
}

export function bitsToFloat(w: number): number {
    return new Float32Array(new Uint32Array([w]).buffer)[0];
}

export class FakeModel implements ForceModel<FakeOptions, FakeStats> {
    readonly kind = "forceatlas2" as const;
    readonly stages = ["positions", "trace", "header", "toScene"] as const;
    readonly params: UniformBlock;
    readonly state: UniformBlock;
    readonly trace = FAKE_TRACE;
    /** When non-null every iteration also fills the 64 header words with this value. */
    headerValue: number | null = null;
    /** Extra positions fills per iteration, to make a batch heavy enough to still be in flight when a test acts. */
    workFactor = 1;
    /** When non-null, bind() waits on it after entry and before binding (a held bind, for the superseded-load test). */
    bindGate: Promise<void> | null = null;
    /** `resources.n` of the last bind() that COMPLETED (null before the first). */
    boundN: number | null = null;
    /** Trace word 0 of every landed batch, in landing order. */
    readonly seen: number[] = [];
    readonly calls = { load: 0, reheat: 0, setParams: 0, bind: 0, inputs: 0 };
    lastPatch: Partial<FakeOptions> | null = null;
    lastWriter: StateWriter | null = null;

    private res: ModelResources | null = null;
    private kernel: Kernel | null = null;
    private headerKernel: Kernel | null = null;
    private boundPositions: BoundKernel | null = null;
    private boundTrace: BoundKernel | null = null;
    private boundHeader: BoundKernel | null = null;
    private boundScene: BoundKernel | null = null;
    /** What inputs() returns as `fixed` (the FR `fixed` option seam, PD-6); null = absent. */
    private readonly fixed: NodeMask | null;

    constructor(blocks?: {
        readonly params?: UniformBlock;
        readonly state?: UniformBlock;
        readonly fixed?: NodeMask | null;
    }) {
        this.params = blocks?.params ?? FAKE_PARAMS;
        this.state = blocks?.state ?? FAKE_STATE;
        this.fixed = blocks?.fixed ?? null;
    }

    buffers(_n: number, _dim: 2 | 3): readonly BufferSpec[] {
        return [
            {
                name: "headerParams",
                byteLength: UNIFORM_SLOT_BYTES,
                usage: BufferUsage.UNIFORM | BufferUsage.COPY_DST | BufferUsage.COPY_SRC,
                zero: true,
            },
        ];
    }

    inputs(s: GraphSnapshot, _options: FakeOptions): ModelInputs {
        this.calls.inputs++;
        return { mass: resolveNodeMass(s, null), weights: resolveWeights(s, null), fixed: this.fixed };
    }

    overrides(options: FakeOptions): Readonly<Record<string, number | boolean>> {
        return { LAW: options.law ?? 0 };
    }

    specs(_overrides: Readonly<Record<string, number | boolean>>, _subgroups: boolean): readonly WgslModuleSpec[] {
        return [FILL_SPEC, HEADER_SPEC];
    }

    async bind(resources: ModelResources, _overrides: Readonly<Record<string, number | boolean>>): Promise<void> {
        this.calls.bind++;
        this.res = resources;
        if (this.bindGate !== null) {
            await this.bindGate;
        }
        this.kernel = await resources.pipelines.kernel(FILL_SPEC);
        this.headerKernel = await resources.pipelines.kernel(HEADER_SPEC);
        const P = resources.ring.binding(this.params);
        this.boundPositions = this.kernel.bind({ dst: resources.buffer("positions"), P });
        this.boundTrace = this.kernel.bind({ dst: resources.buffer("trace"), P });
        this.boundScene = this.kernel.bind({ dst: resources.buffer("scenePositions"), P });
        const headerParams = resources.buffer("headerParams");
        this.boundHeader = this.headerKernel.bind({
            dst: resources.buffer("state"),
            P: { buffer: headerParams.buffer, offset: 0, size: FILL_PARAMS.byteLength, window: null },
        });
        this.boundN = resources.n;
    }

    paramsFor(iteration: number, _options: FakeOptions): UniformValues {
        const n = this.res?.n ?? 0;
        return { count: 4 * n, value: floatBits(iteration + 1), mode: 0 };
    }

    recordIteration(batch: CommandBatch, slot: number, _tier: "exact" | "grid", upTo?: string): void {
        const { res, kernel, headerKernel } = this;
        if (res === null || kernel === null || headerKernel === null || this.boundPositions === null) {
            throw new Error("fake model: recordIteration before bind");
        }
        const pass = batch.pass(`fake/${slot}`);
        const offsets = [res.ring.offsetOf(slot)];
        const plan = plan1d(4 * res.n, kernel.workgroupSize, res.caps);
        for (let w = 0; w < this.workFactor; w++) {
            kernel.dispatch(pass, this.boundPositions, plan, offsets);
        }
        if (upTo === "positions") {
            return;
        }
        if (this.boundTrace !== null) {
            kernel.dispatch(pass, this.boundTrace, plan, offsets);
        }
        if (upTo === "trace") {
            return;
        }
        if (this.headerValue !== null && this.boundHeader !== null) {
            const bytes = new ArrayBuffer(FILL_PARAMS.byteLength);
            FILL_PARAMS.write(new DataView(bytes), { count: STATE_HEADER_BYTES / 4, value: this.headerValue, mode: 0 });
            res.device.queue.writeBuffer(res.buffer("headerParams").buffer, 0, bytes);
            headerKernel.dispatch(
                pass,
                this.boundHeader,
                plan1d(STATE_HEADER_BYTES / 4, headerKernel.workgroupSize, res.caps),
                [0],
            );
        }
        if (upTo === "header") {
            return;
        }
        // the per-batch epilogue "toScene": recorded when upTo is undefined (the simulation's last iteration of a
        // batch) or "toScene" (a debug run); the simulation passes "header" for every other iteration
        if (this.boundScene !== null) {
            kernel.dispatch(pass, this.boundScene, plan, offsets);
        }
    }

    onLoad(state: StateWriter): void {
        this.calls.load++;
        this.lastWriter = state;
    }

    onReheat(_state: StateWriter): void {
        this.calls.reheat++;
    }

    onSetParams(patch: Partial<FakeOptions>, _state: StateWriter): void {
        this.calls.setParams++;
        this.lastPatch = patch;
    }

    readStats(state: DataView, trace: DataView): FakeStats {
        const s = this.state.read(state);
        const traceWord = trace.byteLength >= 4 ? trace.getUint32(0, true) : 0;
        if (trace.byteLength > 0) {
            this.seen.push(traceWord);
        }
        const centroid = s.centroid as readonly number[];
        return {
            iteration: s.iteration as number,
            meanDisplacement: s.meanDisplacement as number,
            rmsRadius: s.rmsRadius as number,
            layoutRadius: s.radius as number,
            centroid: [centroid[0], centroid[1], centroid[2]],
            repulsionTier: "exact",
            maxCellOccupancy: null,
            outsideGrid: null,
            msPerIteration: null,
            traceWord,
        };
    }
}

// ============================================================ helpers

export type FakeSim = ForceSimulation<FakeOptions, FakeStats>;

export function makeSim(
    ctx: GpuContext,
    fake: FakeModel,
    options: FakeOptions = {},
    tuning: Partial<ResolvedLayoutTuning> = {},
): FakeSim {
    return new ForceSimulation<FakeOptions, FakeStats>(
        ctx,
        fake,
        { maxIter: 1000, seed: 1, ...options },
        { ...LAYOUT_TUNING_DEFAULTS, ...tuning },
        (patch, current) => ({ ...current, ...patch }),
    );
}

export function nanPositions(n: number): F32 {
    return new Float32Array(3 * n).fill(Number.NaN);
}

export function graph(n: number): GraphSnapshot {
    return snapshotOf(pathEdges(n), { nodeCount: n });
}

export function errorOf(fn: () => void): { code: string; details: Readonly<Record<string, unknown>> } {
    try {
        fn();
    } catch (err) {
        if (isWebGpuGraphError(err)) {
            return { code: err.code, details: err.details };
        }
        throw err;
    }
    throw new Error("expected the call to throw");
}

export async function rejectionOf(
    p: Promise<unknown>,
): Promise<{ code: string; details: Readonly<Record<string, unknown>> }> {
    try {
        await p;
    } catch (err) {
        if (isWebGpuGraphError(err)) {
            return { code: err.code, details: err.details };
        }
        throw err;
    }
    throw new Error("expected the promise to reject");
}

/**
 * One turn of the event loop (a zero-delay timer): lets pending promise work and Dawn's callbacks run between two
 * checks of a condition.
 * @returns a promise that resolves on the next timer turn
 */
export function nextTurn(): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, 0);
    });
}

/**
 * A batch created by step() is submitted on the serialised chain (after the bind promise, which compiles on the
 * first step); a test that must act while it is IN FLIGHT waits for the submission (a poll every timer turn, about
 * 1 ms in Node, so the test's continuation runs before any readback callback, which Dawn delivers from a later
 * macrotask) and uses a heavy batch (heavyFake(): heavyN() nodes, 256 iterations, 8 positions fills each) so the
 * GPU cannot have finished inside the poll interval. Every caller asserts the in-flight state explicitly right
 * after the wait (`inFlight` and an empty `fake.seen`) so a batch that landed early fails there, not in a later
 * assertion.
 */
export async function waitForSubmission(s: FakeSim, id: number): Promise<void> {
    while (s.lastSubmittedBatchId < id) {
        await nextTurn();
    }
}

/**
 * The node count of a heavy batch: 131,072 on a hardware adapter (about 4 GB of writes a batch, 8 ms on the RTX
 * 4070 SUPER), and gpuScale()'d to 2,621 on a software one (spec 11.2), like every other fixture size in this
 * suite. The batch has to outlast the 1 ms submission poll above, and the scaled software batch has more margin
 * there than the unscaled hardware one that has always worked: the two-batch device-loss case at the bottom of
 * this file measures 193 ms on the RTX 4070 SUPER against 283 .. 381 ms over three lavapipe runs. Unscaled that
 * batch cost about 22 s on WARP, which put the same case past the 30 s budget (finding G5-F13).
 *
 * Called inside a test, never at module level: the setup probes the adapter in a beforeAll, so gpuScale() is
 * still 1 while this file is being collected.
 * @returns the node count of a heavy fixture
 */
export function heavyN(): number {
    return Math.round(131_072 * gpuScale());
}

/**
 * On a hardware adapter heavyN() is above LAYOUT_TUNING_DEFAULTS.exactMaxNodes, so the "auto" tier would resolve to
 * the grid tier (PLAN DECISION 11: E_UNSUPPORTED until P4); the fake has no repulsion stage, so the heavy tests pin
 * the exact tier on every adapter rather than letting the tier follow the scale.
 */
export const EXACT_TIER: Partial<ResolvedLayoutTuning> = { repulsion: "exact" };

export function heavyFake(): FakeModel {
    const fake = new FakeModel();
    fake.workFactor = 8;
    return fake;
}

/** Every row of the owner's array equals (x, y, z) except the skipped rows (one scan; the first bad row is reported). */
export function expectRows(
    positions: F32,
    n: number,
    x: number,
    y: number,
    z: number,
    skip: ReadonlySet<number> = new Set(),
): void {
    let bad = -1;
    for (let i = 0; i < n && bad < 0; i++) {
        if (skip.has(i)) {
            continue;
        }
        if (positions[3 * i] !== x || positions[3 * i + 1] !== y || positions[3 * i + 2] !== z) {
            bad = i;
        }
    }
    if (bad >= 0) {
        expect([positions[3 * bad], positions[3 * bad + 1], positions[3 * bad + 2]], `row ${bad}`).toEqual([x, y, z]);
    }
    expect(bad).toBe(-1);
}
