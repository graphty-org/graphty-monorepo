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
}

/** The compiled `to-drawn` kernel and one slot per batch in flight. */
export class DrawnStage {
    private readonly kernel: Kernel;
    private readonly box: LeaseBox;
    private readonly slots: Slot[];
    private readonly skip: Binding;
    private readonly params: Binding;
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
        this.skip = storage(4 * Math.max(1, Math.ceil(n / 32)), "drawn/skip");
        this.params = {
            buffer: lease.uniform(DRAWN_PARAMS.byteLength, "drawn/params"),
            offset: 0,
            size: DRAWN_PARAMS.byteLength,
            window: null,
        };
        const scene = resources.buffer("scenePositions");
        this.slots = [];
        for (let i = 0; i < count; i++) {
            const binding = storage(16 * Math.max(1, n), `drawn/slot${i}`);
            this.slots.push({
                binding,
                bound: kernel.bind({ scene, skip: this.skip, drawn: binding, P: this.params }),
            });
        }
        this.device.queue.writeBuffer(this.skip.buffer, 0, new Uint32Array(this.skip.size / 4));
        this.transform({ center: [0, 0, 0], scale: 1, target: [0, 0, 0] });
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
        this.device.queue.writeBuffer(this.params.buffer, 0, bytes);
    }

    /**
     * Uploads the rows `to-drawn` leaves alone.
     * @param mask - one bit per row
     */
    setSkip(mask: Uint32Array): void {
        const words = Math.min(mask.length, this.skip.size / 4);
        const copy = new Uint32Array(this.skip.size / 4);
        copy.set(mask.subarray(0, words));
        this.device.queue.writeBuffer(this.skip.buffer, 0, copy);
    }

    /**
     * Writes stride-4 rows into every slot, starting at `row`.
     * @param row - the first row
     * @param values - x, y, z and w per row
     */
    write(row: number, values: Float32Array<ArrayBuffer>): void {
        for (const slot of this.slots) {
            this.device.queue.writeBuffer(slot.binding.buffer, 16 * row, values);
        }
    }

    /**
     * Records `to-drawn` into the next slot, in a pass of its own.
     * @param encoder - a pass opened for it
     * @returns the slot's buffer
     */
    record(encoder: GPUComputePassEncoder): GPUBuffer {
        const slot = this.slots[this.next];
        this.next = (this.next + 1) % this.slots.length;
        this.kernel.dispatch(encoder, slot.bound, this.plan, [0]);
        return slot.binding.buffer;
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
