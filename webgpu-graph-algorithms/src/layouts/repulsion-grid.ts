/**
 * The grid-tier repulsion stage of the force models (spec 7.7, 7.4; P4-T10): G1-G3 through the T8 grid build, G4-G5
 * through the T9 pyramid, then G6 (`grid-far-field`) and G7 (`grid-near-field`, K3's pair law and epilogue) over
 * `plan1d(n)`, followed by K4 (`fa2-speed-finalize`) exactly as `RepulsionExact` records it. The named grid buffers
 * are the model's `BufferSpec`s (`buffers()`, so `inspect(name)` reaches them); the anonymous scratch of the sort
 * and the scan and the static params of the pyramid draw on ONE `Lease` of the context's pool taken at `create()`
 * (the scan planner takes its block-sum levels at prepare time) and released by `dispose()` (PD-11, DEP-P4-D: a
 * per-batch lease would rebuild the G2-G4 bind groups every batch; a model creates one stage per bind(), so a stage
 * is bound once). The stage is the ONE class every model reaches the grid tier through (PD-22): the FR and
 * spring-electrical models pass `LAW` 1 / 2 in their override set, which reaches G6's per-cell law and G7's pair law
 * (P4-T13).
 */

import { GRID_HUB_CELL } from "../constants.js";
import { BufferUsage } from "../device/webgpu-constants.js";
import { WebGpuGraphError } from "../errors.js";
import { plan1d } from "../kernel/dispatch.js";
import { type BoundKernel, INDIRECT_ARGS_STRIDE, type Kernel } from "../kernel/kernel.js";
import { type PipelineCache } from "../kernel/pipeline-cache.js";
import { type UniformBlock, type UniformValues } from "../kernel/struct-block.js";
import { type WgslModuleSpec } from "../kernel/wgsl.js";
import { kernelSpec } from "../kernels.js";
import { type BufferPool } from "../memory/buffer-pool.js";
import { type Lease } from "../memory/lease.js";
import {
    type GridBuildPlanner,
    type GridBuildStage,
    gridPyramidBytes,
    type GridSpec,
    prepareGridBuild,
} from "../primitives/grid.js";
import { type GridPyramidPlanner, preparePyramid } from "../primitives/grid-pyramid.js";
import { type ReduceScope } from "../primitives/reduce.js";
import { type PlanCaps } from "../types/context.js";
import { type Binding } from "../types/memory.js";
import { type BufferSpec } from "./force-simulation.js";
import { type RepulsionExactOverrides, type RepulsionExactResources } from "./repulsion-exact.js";

/** The stage names the grid tier records, in dispatch order (the `upTo` vocabulary of recordRepulsion). */
const GRID_STAGES = ["G1", "G2", "G3", "G4", "G5", "G6", "G7"] as const;

/** A grid stage name. */
export type GridStage = (typeof GRID_STAGES)[number];

/**
 * The buffers the grid-tier repulsion stage binds: the exact tier's plus the named grid buffers of `buffers()`. The
 * parameter type of RepulsionGrid.bind (knip: exported for the signature, not imported by name).
 * @public
 */
export interface RepulsionGridResources extends RepulsionExactResources {
    readonly cellKey: Binding;
    readonly cellVal: Binding;
    readonly sortedKey: Binding;
    readonly sortedIdx: Binding;
    readonly cellHist: Binding;
    readonly cellStart: Binding;
    readonly hubList: Binding;
    readonly hubCounters: Binding;
    readonly hubArgs: Binding;
    readonly pyramid: Binding;
}

/**
 * The override set G6 / G7 / K4 compile with: K3's three plus the repulsion law (0 FA2, 1 FR, 2 coulomb; P4-T13,
 * PD-22).
 * @public
 */
export interface RepulsionGridOverrides extends RepulsionExactOverrides {
    readonly LAW: 0 | 1 | 2;
}

/**
 * What the stage needs of the context to build its scope: the pieces `ModelResources` carries. The parameter type
 * of RepulsionGrid.create (knip: exported for the signature, not imported by name).
 * @public
 */
export interface RepulsionGridScope {
    readonly device: GPUDevice;
    readonly caps: PlanCaps;
    readonly pipelines: PipelineCache;
    readonly pool: BufferPool;
}

/** The storage usage of every grid buffer. */
const STORAGE_RW = BufferUsage.STORAGE | BufferUsage.COPY_SRC | BufferUsage.COPY_DST;

/** The lease the scope's scratch() and params() draw on: taken at create(), null after dispose(). */
interface LeaseBox {
    lease: Lease | null;
}

/**
 * The stage's lease, or E_DISPOSED after dispose().
 * @param box - the stage's lease box
 * @returns the lease
 */
function leaseOf(box: LeaseBox): Lease {
    if (box.lease === null) {
        throw new WebGpuGraphError("E_DISPOSED", "RepulsionGrid: the stage was disposed", { label: "RepulsionGrid" });
    }
    return box.lease;
}

/**
 * A uniform buffer of the lease holding one written record of `block` (the pyramid's static params, PD-11).
 * @param device - the device
 * @param lease - the stage's lease
 * @param block - the uniform block
 * @param values - the values to write
 * @returns the whole-buffer binding and a zero dynamic offset
 */
function writeParams(
    device: GPUDevice,
    lease: Lease,
    block: UniformBlock,
    values: UniformValues,
): { readonly binding: Binding; readonly offset: number } {
    const buffer = lease.uniform(block.byteLength, `grid/${block.name}`);
    const bytes = new ArrayBuffer(block.byteLength);
    block.write(new DataView(bytes), values);
    device.queue.writeBuffer(buffer, 0, bytes);
    return { binding: { buffer, offset: 0, size: block.byteLength, window: null }, offset: 0 };
}

/**
 * The G6 spec of an override set (the law alone).
 * @param overrides - the override set of the stage
 * @returns the spec
 */
function farFieldSpec(overrides: RepulsionGridOverrides): WgslModuleSpec {
    return kernelSpec("grid-far-field", { LAW: overrides.LAW });
}

/**
 * The G7 spec of an override set (K3's four).
 * @param overrides - the override set of the stage
 * @returns the spec
 */
function nearFieldSpec(overrides: RepulsionGridOverrides): WgslModuleSpec {
    return kernelSpec("grid-near-field", {
        SWING_MODE: overrides.SWING_MODE,
        STRONG_GRAVITY: overrides.STRONG_GRAVITY,
        GRAVITY_CENTER: overrides.GRAVITY_CENTER,
        LAW: overrides.LAW,
    });
}

/** The three kernels the stage dispatches itself (the planners hold the others). */
interface FieldKernels {
    readonly far: Kernel;
    readonly near: Kernel;
    readonly speedFinalize: Kernel;
}

/** What bind() produced. */
interface Bound {
    readonly far: BoundKernel;
    readonly near: BoundKernel;
    readonly speedFinalize: BoundKernel;
}

/** G1-G7 then K4 (spec 7.7, 7.4): the grid tier's repulsion stage. */
export class RepulsionGrid {
    /** The overrides G6 / G7 / K4 were compiled with (a frozen copy of the argument of create()). */
    readonly overrides: RepulsionGridOverrides;
    /** The grid geometry the stage was prepared for. */
    readonly spec: GridSpec;

    private readonly caps: PlanCaps;
    private readonly workgroupSize: number;
    private readonly box: LeaseBox;
    private readonly build: GridBuildPlanner;
    private readonly pyramid: GridPyramidPlanner;
    private readonly far: Kernel;
    private readonly near: Kernel;
    private readonly speedFinalize: Kernel;
    private bound: Bound | null = null;

    /**
     * Holds the planners and kernels; create() is the only caller.
     * @param scope - the context pieces
     * @param workgroupSize - the device's workgroup size (every kernel compiles with it)
     * @param overrides - the override set G6 / G7 / K4 were compiled with
     * @param spec - the grid
     * @param box - the lease box the scope's scratch() and params() read
     * @param build - the T8 planner (G1-G3)
     * @param pyramid - the T9 planner (G4-G5)
     * @param kernels - G6 (`far`), G7 (`near`) and K4 (`speedFinalize`)
     */
    private constructor(
        scope: RepulsionGridScope,
        workgroupSize: number,
        overrides: RepulsionGridOverrides,
        spec: GridSpec,
        box: LeaseBox,
        build: GridBuildPlanner,
        pyramid: GridPyramidPlanner,
        kernels: FieldKernels,
    ) {
        this.caps = scope.caps;
        this.box = box;
        this.workgroupSize = workgroupSize;
        this.overrides = Object.freeze({
            SWING_MODE: overrides.SWING_MODE,
            STRONG_GRAVITY: overrides.STRONG_GRAVITY,
            GRAVITY_CENTER: overrides.GRAVITY_CENTER,
            LAW: overrides.LAW,
        });
        this.spec = spec;
        this.build = build;
        this.pyramid = pyramid;
        this.far = kernels.far;
        this.near = kernels.near;
        this.speedFinalize = kernels.speedFinalize;
    }

    /**
     * The model-owned buffers of the grid tier (spec 7.3; PD-11): `cellKey` / `cellVal` / `sortedKey` / `sortedIdx`
     * 4n, `cellHist` / `cellStart` 4 (cells + 2) zeroed, `hubList` one word per possible hub cell, `hubArgs` one
     * indirect slot, `pyramid` 16 B per pyramid cell zeroed. `hubCounters` (16 B, zeroed) is the MODEL's on every
     * tier (PD-14: K1 binds it on the exact tier too). n = 0 reports one node's worth of bytes (spec 3.6).
     * @param n - the node count
     * @param spec - the grid
     * @returns the specs
     */
    static buffers(n: number, spec: GridSpec): readonly BufferSpec[] {
        const words = 4 * Math.max(1, n);
        return [
            { name: "cellKey", byteLength: words, usage: STORAGE_RW, zero: false },
            { name: "cellVal", byteLength: words, usage: STORAGE_RW, zero: false },
            { name: "sortedKey", byteLength: words, usage: STORAGE_RW, zero: false },
            { name: "sortedIdx", byteLength: words, usage: STORAGE_RW, zero: false },
            { name: "cellHist", byteLength: 4 * spec.histWords, usage: STORAGE_RW, zero: true },
            { name: "cellStart", byteLength: 4 * spec.histWords, usage: STORAGE_RW, zero: true },
            {
                name: "hubList",
                byteLength: 4 * Math.max(1, Math.ceil(n / GRID_HUB_CELL)),
                usage: STORAGE_RW,
                zero: false,
            },
            { name: "hubArgs", byteLength: INDIRECT_ARGS_STRIDE, usage: STORAGE_RW | BufferUsage.INDIRECT, zero: true },
            { name: "pyramid", byteLength: gridPyramidBytes(spec), usage: STORAGE_RW, zero: true },
        ];
    }

    /**
     * The module specs of the grid tier under an override set (for warm() and the compile matrix): the build's
     * (G1, the sort path `spec.deterministic` selects, the histogram, the scan, the fill), the pyramid's (G4, the
     * finalize, G4b, G5), G6, G7 and K4.
     * @param overrides - the override set of the stage
     * @param spec - the grid (only its `deterministic` flag matters: the pipeline key carries no geometry)
     * @returns the specs
     */
    static specs(overrides: RepulsionGridOverrides, spec: GridSpec): readonly WgslModuleSpec[] {
        const sort: WgslModuleSpec[] = spec.deterministic
            ? [kernelSpec("radix-hist"), kernelSpec("radix-scatter"), kernelSpec("scan-block"), kernelSpec("scan-add")]
            : [kernelSpec("counting-scatter"), kernelSpec("scan-block"), kernelSpec("scan-add")];
        return [
            kernelSpec("grid-cell-key"),
            ...sort,
            kernelSpec("histogram"),
            kernelSpec("fill"),
            kernelSpec("grid-centroid"),
            kernelSpec("indirect-finalize"),
            kernelSpec("grid-centroid-hub"),
            kernelSpec("grid-downsample"),
            farFieldSpec(overrides),
            nearFieldSpec(overrides),
            kernelSpec("fa2-speed-finalize", { SWING_MODE: overrides.SWING_MODE }),
        ];
    }

    /**
     * Compiles every kernel of the tier through the cache (sequentially: PipelineCache.get compiles inside a
     * validation scope, one stack per device) over a scope whose scratch and params draw on the stage's lease.
     * @param scope - the context pieces (device, caps, pipelines, pool)
     * @param workgroupSize - the device's workgroup size
     * @param overrides - the SWING_MODE / STRONG_GRAVITY / GRAVITY_CENTER / LAW set of this stage
     * @param spec - the grid
     * @returns the stage, ready for bind()
     */
    static async create(
        scope: RepulsionGridScope,
        workgroupSize: number,
        overrides: RepulsionGridOverrides,
        spec: GridSpec,
    ): Promise<RepulsionGrid> {
        const box: LeaseBox = { lease: scope.pool.lease() };
        const reduceScope: ReduceScope = {
            device: scope.device,
            caps: scope.caps,
            pipelines: scope.pipelines,
            pool: scope.pool,
            workgroupSize,
            scratch: (byteLength: number, label: string): GPUBuffer => leaseOf(box).storage(byteLength, label),
            params: (
                block: UniformBlock,
                values: UniformValues,
            ): { readonly binding: Binding; readonly offset: number } =>
                writeParams(scope.device, leaseOf(box), block, values),
        };
        try {
            const build = await prepareGridBuild(reduceScope, spec);
            const pyramid = await preparePyramid(reduceScope, spec);
            const far = await scope.pipelines.kernel(farFieldSpec(overrides));
            const near = await scope.pipelines.kernel(nearFieldSpec(overrides));
            const speedFinalize = await scope.pipelines.kernel(
                kernelSpec("fa2-speed-finalize", { SWING_MODE: overrides.SWING_MODE }),
            );
            return new RepulsionGrid(scope, workgroupSize, overrides, spec, box, build, pyramid, {
                far,
                near,
                speedFinalize,
            });
        } catch (error) {
            leaseOf(box).release();
            throw error;
        }
    }

    /**
     * Builds every bind group once per load(): the build's and the pyramid's bind() (which take their scratch and
     * write their static params through the lease), then G6, G7 and K4 against the named buffers (the 3.10.1
     * binding names). A second bind() takes fresh scratch from the same lease and the first bind()'s scratch stays
     * held until dispose(): the one lease also holds the prepare-time allocations (the scan's block-sum levels), so
     * it cannot be released on a rebind (the model creates one stage per bind(), so a rebind never happens).
     * @param resources - the buffers of spec 7.3 plus the grid's
     */
    bind(resources: RepulsionGridResources): void {
        leaseOf(this.box);
        const r = resources;
        this.build.bind({
            pos: r.pos,
            state: r.state,
            params: r.params,
            cellKey: r.cellKey,
            cellVal: r.cellVal,
            sortedKey: r.sortedKey,
            sortedIdx: r.sortedIdx,
            cellHist: r.cellHist,
            cellStart: r.cellStart,
        });
        this.pyramid.bind({
            pos: r.pos,
            params: r.params,
            sortedIdx: r.sortedIdx,
            cellStart: r.cellStart,
            pyramid: r.pyramid,
            hubList: r.hubList,
            hubCounters: r.hubCounters,
            hubArgs: r.hubArgs,
        });
        this.bound = {
            far: this.far.bind({
                pos: r.pos,
                sortedIdx: r.sortedIdx,
                pyramid: r.pyramid,
                S: r.state,
                force: r.force,
                P: r.params,
            }),
            near: this.near.bind({
                pos: r.pos,
                sortedIdx: r.sortedIdx,
                cellStart: r.cellStart,
                S: r.state,
                force: r.force,
                oldForce: r.oldForce,
                fixedMask: r.fixedMask,
                partials: r.partials,
                P: r.params,
            }),
            speedFinalize: this.speedFinalize.bind({ partials: r.partials, S: r.state, T: r.trace, P: r.params }),
        };
    }

    /**
     * Records G1..G7 for `n` nodes with the params slot's dynamic offset, stopping after `upTo` when given (spec 7.4
     * grid sequence; the inspect() stage split, spec 11.9 item 2): G1-G3 through the build planner, G4-G5 through the
     * pyramid planner, then G6 and G7 over plan1d(n).
     * @param pass - the open compute pass of the batch
     * @param n - the node count (in [1, the capacity of the grid buffers])
     * @param paramsOffset - the dynamic offset of this iteration's Fa2Params slot in the uniform ring
     * @param upTo - the last grid stage to record (default "G7")
     */
    recordRepulsion(pass: GPUComputePassEncoder, n: number, paramsOffset: number, upTo?: GridStage): void {
        const bound = this.requireBound("recordRepulsion");
        const stop = GRID_STAGES.indexOf(upTo ?? "G7");
        let buildStop: GridBuildStage = "G3";
        if (stop === 0) {
            buildStop = "G1";
        } else if (stop === 1) {
            buildStop = "G2";
        }
        this.build.record(pass, n, paramsOffset, buildStop);
        if (stop < 3) {
            return;
        }
        this.pyramid.record(pass, paramsOffset, stop === 3 ? "G4" : "G5");
        if (stop < 5) {
            return;
        }
        const plan = plan1d(n, this.workgroupSize, this.caps);
        this.far.dispatch(pass, bound.far, plan, [paramsOffset]);
        if (stop < 6) {
            return;
        }
        this.near.dispatch(pass, bound.near, plan, [paramsOffset]);
    }

    /**
     * Records K4 only (one workgroup).
     * @param pass - the open compute pass
     * @param paramsOffset - the dynamic offset of the Fa2Params slot
     */
    recordSpeedFinalize(pass: GPUComputePassEncoder, paramsOffset: number): void {
        const bound = this.requireBound("recordSpeedFinalize");
        const one = plan1d(this.speedFinalize.workgroupSize, this.speedFinalize.workgroupSize, this.caps);
        this.speedFinalize.dispatch(pass, bound.speedFinalize, one, [paramsOffset]);
    }

    /** Releases the lease (the sort and scan scratch, the static params) and drops the bind groups; idempotent. */
    dispose(): void {
        if (this.box.lease !== null) {
            this.box.lease.release();
            this.box.lease = null;
        }
        for (const kernel of [this.far, this.near, this.speedFinalize]) {
            kernel.invalidate();
        }
        this.bound = null;
    }

    /**
     * The bound groups, or E_NOT_LOADED when bind() has not run.
     * @param method - the caller's name for the message
     * @returns the bound groups
     */
    private requireBound(method: string): Bound {
        if (this.bound === null) {
            throw new WebGpuGraphError(
                "E_NOT_LOADED",
                `RepulsionGrid.${method}(): bind() has not been called for this stage`,
                {
                    state: "unbound",
                },
            );
        }
        return this.bound;
    }
}
