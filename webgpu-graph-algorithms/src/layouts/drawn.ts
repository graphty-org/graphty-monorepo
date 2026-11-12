/**
 * The drawn ring (design/rendering/row-renderer.md 4.5; `GpuLayoutSimulation.setDrawn`): a renderer on the same
 * device reads the layout's positions from here instead of uploading them. Every batch ends with `to-drawn`, which
 * writes `(scene - center) * scale + target` (z = 0 in 2D) into the batch's own slot of the ring, a stride-4 buffer
 * per batch in flight, so the slot of a landed batch is not written again until `slots` more batches were submitted.
 * Rows in the skip mask and the w lane are the owner's: `to-drawn` never writes them, the owner does.
 */

import { plan1d } from "../kernel/dispatch.js";
import { type BoundKernel, type Kernel } from "../kernel/kernel.js";
import { DRAWN_PARAMS, kernelSpec } from "../kernels.js";
import { type DrawnTransform } from "../types/layout.js";
import { type Binding } from "../types/memory.js";
import { type ModelResources } from "./force-simulation.js";
import { type LeaseBox, leaseOf } from "./repulsion-grid.js";

/** One batch's slot: its buffer and its bind group. */
interface Slot {
    readonly binding: Binding;
    readonly bound: BoundKernel;
    /** This slot's own transform and skip mask, written when a batch is recorded into it. */
    readonly params: Binding;
    readonly skip: Binding;
    /** Rows the owner wrote since this slot's last batch, written again before its next one. */
    readonly pending: Set<number>;
}

/** What one batch's slot holds once it lands: the buffer and the transform it was drawn with. */
export interface DrawnRecord {
    readonly buffer: GPUBuffer;
    readonly transform: DrawnTransform;
}

/** The compiled `to-drawn` kernel and one slot per batch in flight. */
export class DrawnStage {
    private readonly kernel: Kernel;
    private readonly box: LeaseBox;
    private readonly slots: Slot[];
    private skipWords: Uint32Array<ArrayBuffer>;
    private paramsBytes = new ArrayBuffer(DRAWN_PARAMS.byteLength);
    private current: DrawnTransform = { center: [0, 0, 0], scale: 1, target: [0, 0, 0] };
    private readonly plan: ReturnType<typeof plan1d>;
    private readonly device: GPUDevice;
    private readonly n: number;
    private readonly dim: 2 | 3;
    private next = 0;

    /**
     * Leases the skip mask, the params and the slots, and binds one group per slot.
     * @param resources - the simulation's resources
     * @param box - the lease
     * @param kernel - the compiled kernel
     * @param count - how many slots
     */
    private constructor(resources: ModelResources, box: LeaseBox, kernel: Kernel, count: number) {
        const { n, dim, device, caps } = resources;
        const lease = leaseOf(box);
        const storage = (bytes: number, label: string): Binding => ({
            buffer: lease.storage(bytes, label),
            offset: 0,
            size: bytes,
            window: null,
        });
        this.kernel = kernel;
        this.box = box;
        this.device = device;
        this.n = n;
        this.dim = dim;
        this.plan = plan1d(n, kernel.workgroupSize, caps);
        const skipBytes = 4 * Math.max(1, Math.ceil(n / 32));
        this.skipWords = new Uint32Array(skipBytes / 4);
        const scene = resources.buffer("scenePositions");
        this.slots = [];
        for (let i = 0; i < count; i++) {
            const binding = storage(16 * Math.max(1, n), `drawn/slot${i}`);
            // A batch's commands are recorded across awaits, so a transform or a mask set before its submit
            // would reach a shared uniform the batch already chose against: each slot has its own.
            const skip = storage(skipBytes, `drawn/skip${i}`);
            const params: Binding = {
                buffer: lease.uniform(DRAWN_PARAMS.byteLength, `drawn/params${i}`),
                offset: 0,
                size: DRAWN_PARAMS.byteLength,
                window: null,
            };
            this.slots.push({
                binding,
                bound: kernel.bind({ scene, skip, drawn: binding, P: params }),
                params,
                skip,
                pending: new Set(),
            });
        }
        this.transform(this.current);
    }

    /**
     * Compiles the kernel and leases the ring.
     * @param resources - the simulation's resources (n > 0)
     * @param count - how many slots
     * @returns the stage
     */
    static async create(resources: ModelResources, count: number): Promise<DrawnStage> {
        const box: LeaseBox = { lease: resources.pool.lease() };
        try {
            const kernel = await resources.pipelines.kernel(kernelSpec("to-drawn"));
            return new DrawnStage(resources, box, kernel, count);
        } catch (error) {
            leaseOf(box).release();
            throw error;
        }
    }

    /**
     * Writes the transform the next batches apply; a queue write, so it lands before the next submit.
     * @param t - the transform
     */
    transform(t: DrawnTransform): void {
        this.current = t;
        const bytes = new ArrayBuffer(DRAWN_PARAMS.byteLength);
        DRAWN_PARAMS.write(new DataView(bytes), {
            n: this.n,
            dim: this.dim,
            scale: t.scale,
            pad0: 0,
            cx: t.center[0],
            cy: t.center[1],
            cz: t.center[2],
            pad1: 0,
            tx: t.target[0],
            ty: t.target[1],
            tz: t.target[2],
            pad2: 0,
        });
        this.paramsBytes = bytes;
    }

    /**
     * Uploads the rows `to-drawn` leaves alone.
     * @param mask - one bit per row
     */
    setSkip(mask: Uint32Array): void {
        const copy = new Uint32Array(this.skipWords.length);
        copy.set(mask.subarray(0, Math.min(mask.length, copy.length)));
        this.skipWords = copy;
    }

    /**
     * Writes stride-4 rows into every slot, starting at `row`.
     * @param row - the first row
     * @param values - x, y, z and w per row
     */
    write(row: number, values: Float32Array<ArrayBuffer>): void {
        for (const slot of this.slots) {
            this.device.queue.writeBuffer(slot.binding.buffer, 16 * row, values);
            if (values.length === 4) {
                slot.pending.add(row);
            }
        }
    }

    /**
     * Records `to-drawn` into the next slot, in a pass of its own.
     * @param encoder - a pass opened for it
     * @param rows - the owner's stride-4 rows, for the rows written since this slot's last batch
     * @returns the slot's buffer and the transform the batch draws with
     */
    record(encoder: GPUComputePassEncoder, rows: Float32Array<ArrayBuffer>): DrawnRecord {
        const slot = this.slots[this.next];
        this.next = (this.next + 1) % this.slots.length;
        const { queue } = this.device;
        queue.writeBuffer(slot.params.buffer, 0, this.paramsBytes);
        queue.writeBuffer(slot.skip.buffer, 0, this.skipWords);
        // a row the owner wrote while an earlier batch in this slot was still to run, which drew over it
        for (const row of slot.pending) {
            queue.writeBuffer(slot.binding.buffer, 16 * row, rows, 4 * row, 4);
        }
        slot.pending.clear();
        this.kernel.dispatch(encoder, slot.bound, this.plan, [0]);
        return { buffer: slot.binding.buffer, transform: this.current };
    }

    /** Releases the lease and drops the bind groups; idempotent. */
    dispose(): void {
        if (this.box.lease !== null) {
            this.box.lease.release();
            this.box.lease = null;
        }
        this.kernel.invalidate();
    }
}
