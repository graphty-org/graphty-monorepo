/**
 * The collision force (issue #3256; `LayoutSimulation.setCollision`): the stage every force model runs after its
 * integrate. One sweep hashes the nodes into cells one largest diameter wide (`collide-cell-key`), sorts them by that
 * bucket with the stable radix sort and counts the buckets, as the grid tier does (spec 7.7 G2-G3), then every free
 * node sums its pushes (`collide-gather`) and takes them (`collide-apply`). Its own buffers, so it never touches the
 * grid tier's, and the sort is always the stable one, so two runs are bitwise equal whatever `deterministic` says.
 *
 * ponytail: one cell width for every node, so a single node far larger than the rest makes every cell wide and a
 * cell's work grows with it; per-size grids when that shows up in a real graph.
 */

import { COLLIDE_CELL_MAX, COLLIDE_FINAL_SWEEPS, COLLIDE_MAX_BUCKETS, GRID_SORT_BITS } from "../constants.js";
import { plan1d } from "../kernel/dispatch.js";
import { type BoundKernel, type Kernel } from "../kernel/kernel.js";
import { type UniformBlock, type UniformValues } from "../kernel/struct-block.js";
import { COLLIDE_PARAMS, kernelSpec } from "../kernels.js";
import { type HistogramPlanner, prepareHistogram } from "../primitives/histogram.js";
import { prepareRadixSort, radixHistBytes, type RadixSortPlanner } from "../primitives/radix-sort.js";
import { type ReduceScope } from "../primitives/reduce.js";
import { prepareScan, type ScanPlanner } from "../primitives/scan.js";
import { type Binding } from "../types/memory.js";
import { type ModelResources } from "./force-simulation.js";
import { type LeaseBox, leaseOf, writeParams } from "./repulsion-grid.js";

/**
 * What a collision needs of the owner's call, in the device's layout units.
 * @public
 */
export interface CollisionUpdate {
    /** One radius per node, in the owner's units. */
    readonly radii: Float32Array<ArrayBuffer>;
    /** What turns a radius into layout units. */
    readonly radiusScale: number;
    /** Whether a 3D simulation compares x and y only. */
    readonly flat: boolean;
}

/**
 * The hash bucket count: a power of two with about two buckets per node.
 * @param n - the node count
 * @returns the count
 */
function bucketsFor(n: number): number {
    return Math.min(COLLIDE_MAX_BUCKETS, 2 ** Math.ceil(Math.log2(Math.max(2, 2 * n))));
}

/** The planners and kernels of a sweep. */
interface Compiled {
    readonly radix: RadixSortPlanner;
    readonly histogram: HistogramPlanner;
    readonly scan: ScanPlanner;
    readonly key: Kernel;
    readonly gather: Kernel;
    readonly apply: Kernel;
}

/** See the file header. */
export class CollisionStage {
    private readonly n: number;
    private readonly dim: 2 | 3;
    private readonly device: GPUDevice;
    private readonly box: LeaseBox;
    private readonly compiled: Compiled;
    private readonly plan: ReturnType<typeof plan1d>;
    private readonly buckets: number;
    private readonly bins: number;
    private readonly params: Binding;
    private readonly radii: Binding;
    private readonly cellKey: Binding;
    private readonly cellVal: Binding;
    private readonly sortedKey: Binding;
    private readonly sortedIdx: Binding;
    private readonly cellHist: Binding;
    private readonly cellStart: Binding;
    private readonly hist: Binding;
    private readonly offsets: Binding;
    private readonly bound: { readonly key: BoundKernel; readonly gather: BoundKernel; readonly apply: BoundKernel };
    /** False while every radius is 0: nothing can overlap and the cell width is undefined. */
    private active = false;
    /** How many sweeps the next integrate records: one, or COLLIDE_FINAL_SWEEPS. */
    private sweeps = 1;

    /**
     * Takes the stage's buffers from the lease and binds the kernels; create() is the only caller.
     * @param resources - the simulation's resources
     * @param box - the lease
     * @param compiled - the planners and kernels
     */
    private constructor(resources: ModelResources, box: LeaseBox, compiled: Compiled) {
        const { n, dim, device, caps } = resources;
        const wg = compiled.key.workgroupSize;
        const storage = (bytes: number, label: string): Binding => ({
            buffer: leaseOf(box).storage(bytes, label),
            offset: 0,
            size: bytes,
            window: null,
        });
        this.n = n;
        this.dim = dim;
        this.device = device;
        this.box = box;
        this.compiled = compiled;
        this.plan = plan1d(n, wg, caps);
        this.buckets = bucketsFor(n);
        this.bins = this.buckets + 1;
        this.radii = storage(4 * n, "collide/radii");
        this.cellKey = storage(4 * n, "collide/cellKey");
        this.cellVal = storage(4 * n, "collide/cellVal");
        this.sortedKey = storage(4 * n, "collide/sortedKey");
        this.sortedIdx = storage(4 * n, "collide/sortedIdx");
        this.cellHist = storage(4 * this.bins, "collide/cellHist");
        this.cellStart = storage(4 * this.bins, "collide/cellStart");
        this.hist = storage(radixHistBytes(n, wg), "collide/sort-hist");
        this.offsets = storage(radixHistBytes(n, wg), "collide/sort-offsets");
        const moves = storage(16 * n, "collide/moves");
        const pos = resources.buffer("positions");
        this.params = {
            buffer: leaseOf(box).uniform(COLLIDE_PARAMS.byteLength, "collide/params"),
            offset: 0,
            size: COLLIDE_PARAMS.byteLength,
            window: null,
        };
        const P = this.params;
        this.bound = {
            key: compiled.key.bind({ pos, cellKey: this.cellKey, cellVal: this.cellVal, P }),
            gather: compiled.gather.bind({
                pos,
                radii: this.radii,
                sortedIdx: this.sortedIdx,
                cellStart: this.cellStart,
                fixedMask: resources.buffer("fixed"),
                moves,
                P,
            }),
            apply: compiled.apply.bind({ pos, moves, P }),
        };
    }

    /**
     * Compiles the stage (sequentially: PipelineCache.get compiles inside a validation scope) and binds it over a
     * lease of the context's pool. The planners ask their scope for scratch and params on every record, so the scope
     * answers each distinct request once: the settling batch's sweeps run one after another and share them.
     * @param resources - the simulation's resources (n > 0)
     * @returns the stage
     */
    static async create(resources: ModelResources): Promise<CollisionStage> {
        const { device, caps, pipelines, pool } = resources;
        const box: LeaseBox = { lease: pool.lease() };
        const written = new Map<string, { readonly binding: Binding; readonly offset: number }>();
        const scratch = new Map<string, GPUBuffer>();
        try {
            const key = await pipelines.kernel(kernelSpec("collide-cell-key"));
            const gather = await pipelines.kernel(kernelSpec("collide-gather"));
            const apply = await pipelines.kernel(kernelSpec("collide-apply"));
            const scope: ReduceScope = {
                device,
                caps,
                pipelines,
                pool,
                workgroupSize: key.workgroupSize,
                scratch: (byteLength: number, label: string): GPUBuffer => {
                    const id = `${label}:${byteLength}`;
                    const known = scratch.get(id) ?? leaseOf(box).storage(byteLength, label);
                    scratch.set(id, known);
                    return known;
                },
                params: (
                    block: UniformBlock,
                    values: UniformValues,
                ): { readonly binding: Binding; readonly offset: number } => {
                    const id = `${block.name}:${JSON.stringify(values)}`;
                    const known = written.get(id);
                    if (known !== undefined) {
                        return known;
                    }
                    const params = writeParams(device, leaseOf(box), block, values);
                    written.set(id, params);
                    return params;
                },
            };
            return new CollisionStage(resources, box, {
                radix: await prepareRadixSort(scope),
                histogram: await prepareHistogram(scope),
                scan: await prepareScan(scope),
                key,
                gather,
                apply,
            });
        } catch (error) {
            leaseOf(box).release();
            throw error;
        }
    }

    /**
     * Uploads what the owner set; a queue write, so it lands before the next submit.
     * @param update - the radii and how to read them
     * @param radiiChanged - whether the radii differ from the last upload
     */
    update(update: CollisionUpdate, radiiChanged: boolean): void {
        let largest = 0;
        for (const radius of update.radii) {
            largest = Math.max(largest, radius);
        }
        this.active = largest > 0;
        if (!this.active) {
            return;
        }
        if (radiiChanged) {
            this.device.queue.writeBuffer(this.radii.buffer, 0, update.radii);
        }
        const bytes = new ArrayBuffer(COLLIDE_PARAMS.byteLength);
        COLLIDE_PARAMS.write(new DataView(bytes), {
            n: this.n,
            dim: update.flat ? 2 : this.dim,
            hashMask: this.buckets - 1,
            cellMax: COLLIDE_CELL_MAX,
            invCell: 1 / (2 * largest * update.radiusScale),
            radiusScale: update.radiusScale,
            pad0: 0,
            pad1: 0,
        });
        this.device.queue.writeBuffer(this.params.buffer, 0, bytes);
    }

    /**
     * Records `sweeps` sweeps after an integrate.
     * @param pass - the open compute pass
     */
    record(pass: GPUComputePassEncoder): void {
        if (!this.active) {
            return;
        }
        const { compiled, bound, plan, n, bins } = this;
        for (let sweep = 0; sweep < this.sweeps; sweep++) {
            compiled.key.dispatch(pass, bound.key, plan, [0]);
            compiled.radix.record(pass, this.cellKey, this.cellVal, n, GRID_SORT_BITS, {
                keys: this.sortedKey,
                vals: this.sortedIdx,
                hist: this.hist,
                offsets: this.offsets,
            });
            compiled.histogram.record(pass, this.cellKey, n, bins, this.cellHist);
            compiled.scan.record(pass, this.cellHist, bins, this.cellStart);
            compiled.gather.dispatch(pass, bound.gather, plan, [0]);
            compiled.apply.dispatch(pass, bound.apply, plan, [0]);
        }
    }

    /**
     * Sets the next record() to the settling sweeps, or back to one.
     * @param last - whether this is the iteration that carries them
     */
    settling(last: boolean): void {
        this.sweeps = last ? COLLIDE_FINAL_SWEEPS : 1;
    }

    /** Releases the lease and drops the bind groups; idempotent. */
    dispose(): void {
        if (this.box.lease !== null) {
            this.box.lease.release();
            this.box.lease = null;
        }
        for (const kernel of [this.compiled.key, this.compiled.gather, this.compiled.apply]) {
            kernel.invalidate();
        }
    }
}
