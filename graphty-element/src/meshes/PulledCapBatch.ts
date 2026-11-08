// Installs Mesh.prototype.thinInstanceSetBuffer and its siblings, which this module calls.
import "@babylonjs/core/Meshes/thinInstanceMesh.js";

import { type BaseTexture, Color3, type Mesh, type Scene, type ShaderMaterial } from "@babylonjs/core";

import { batchUploadFrames } from "./FrameRoster";

/**
 * @file Arrow caps drawn from the row table: a cap is two row numbers and what it stands back by,
 * not a place. The billboard shader (`CAP_PULLED` in `FilledArrowRenderer`) trims the line between
 * the two rows with the same include a pulled line reads (`EDGE_TRIM_GLSL`) and stands the cap at
 * the head end, so a move uploads its rows and no cap byte, and a cap and a line end cannot disagree.
 * Design: `design/rendering/row-renderer.md`, section 4.3, stage 17.
 *
 * Only a 3D billboarded cap at the end of a straight line between two closed ends is pulled: no 2D
 * cap, no image, no stack, no cap part-way along.
 */

/** Slots a new batch starts with, before the first doubling. */
const INITIAL_SLOTS = 32;

/** A row number no row has: the cap draws nothing. */
const NO_ROW = -1;

/** The per-cap buffers and the floats each takes; `matrix` is the identity, which thin instances need. */
const BUFFERS = { matrix: 16, arrowSize: 1, arrowColor: 3, capRows: 2, capPlace: 4 } as const;

type Buffer = keyof typeof BUFFERS;

/** What a cap stands back by: see {@link PulledCapBatch.setCap}. */
export interface PulledCapPlace {
    /** The head end's node's row; for a tail, the source's. */
    head: number;
    /** The other end's node's row. */
    from: number;
    /** The gap at the other end, as `Edge.gapAt` gives it. */
    fromGap: number;
    /** The gap at the head end. */
    headGap: number;
    /** The cap's own gap back from the head end (`Edge.capGap`). */
    capGap: number;
    /** How far the cap's centre sits behind its tip at node scale 1 (`EdgeMesh.calculateArrowPosition`). */
    centreBack: number;
    /** Its length at node scale 1. */
    size: number;
    /** Its colour, as a hex string. */
    colour: string;
}

/** Arrow caps of one shape and opacity, placed by the shader from the row table; see the file comment. */
export class PulledCapBatch {
    /** The one mesh that draws every cap. */
    readonly mesh: Mesh;

    /** Bytes of cap buffers sent to the card so far: buffers built and caps written, never a move. */
    uploadedBytes = 0;

    private capacity = INITIAL_SLOTS;

    private buffers: Record<Buffer, Float32Array<ArrayBuffer>>;

    private highWater = 0;

    private readonly free: number[] = [];

    /** Whether a cap was written since the last upload. */
    private dirty = false;

    private readonly stopFlush: () => void;

    /**
     * Start a batch on a cap mesh given `FilledArrowRenderer.applyPulledShader`.
     * @param mesh - The mesh, parented as the rows' own space is.
     * @param scene - The scene whose frames upload the buffers.
     * @param rowTextures - The row table's `rowPosition` and `rowExtent` textures, asked each frame:
     *     the row table replaces them when it grows.
     */
    constructor(
        mesh: Mesh,
        scene: Scene,
        private readonly rowTextures: () => { position: BaseTexture; extent: BaseTexture },
    ) {
        this.mesh = mesh;
        mesh.isPickable = false;
        mesh.doNotSyncBoundingInfo = true;
        mesh.alwaysSelectAsActiveMesh = true;
        this.buffers = this.build();
        this.stopFlush = batchUploadFrames.join(scene, () => {
            this.flush();
        });
    }

    /**
     * Hand out a cap, drawing nothing until {@link PulledCapBatch.setCap}.
     * @returns The cap's slot.
     */
    acquire(): number {
        const reused = this.free.pop();
        if (reused !== undefined) {
            return reused;
        }

        if (this.highWater === this.capacity) {
            this.capacity *= 2;
            this.buffers = this.build(this.buffers);
        }

        const slot = this.highWater++;
        this.mesh.thinInstanceCount = this.highWater;
        return slot;
    }

    /**
     * Hand a cap back: it draws nothing.
     * @param slot - The cap.
     */
    release(slot: number): void {
        this.setRows(slot, NO_ROW, NO_ROW);
        this.free.push(slot);
    }

    /**
     * Stand a cap at the head end of the line between two rows. Written when an edge joins or
     * changes its look or a node, never because one moved.
     * @param slot - The cap.
     * @param cap - Its rows and what it stands back by.
     */
    setCap(slot: number, cap: PulledCapPlace): void {
        const { arrowSize, arrowColor, capPlace } = this.buffers;
        this.setRows(slot, cap.from, cap.head);
        arrowSize[slot] = cap.size;
        const colour = Color3.FromHexString(cap.colour);
        arrowColor.set([colour.r, colour.g, colour.b], slot * 3);
        capPlace.set([cap.fromGap, cap.headGap, cap.capGap, cap.centreBack], slot * 4);
    }

    /**
     * Draw a cap between two rows, or nothing with a row of -1, keeping what it stands back by.
     * @param slot - The cap.
     * @param from - The other end's row.
     * @param head - The head end's row.
     */
    setRows(slot: number, from: number, head: number): void {
        this.buffers.capRows.set([from, head], slot * 2);
        this.dirty = true;
    }

    /** Send what was written since the last frame, and bind this frame's row table. */
    flush(): void {
        const material = this.mesh.material as ShaderMaterial | null;
        const { position, extent } = this.rowTextures();
        material?.setTexture("rowPosition", position);
        material?.setTexture("rowExtent", extent);
        if (!this.dirty) {
            return;
        }

        // ponytail: whole buffers, as a cap is written only on a join or a look change; ranged
        // uploads (DirtyRuns) if a stage writes caps per frame.
        for (const kind of ["arrowSize", "arrowColor", "capRows", "capPlace"] as const) {
            this.mesh.thinInstanceBufferUpdated(kind);
            this.uploadedBytes += this.buffers[kind].byteLength;
        }

        this.dirty = false;
    }

    /** Stop following the frames and free the mesh. */
    dispose(): void {
        this.stopFlush();
        // Not its textures: they are the row table's, which outlives this batch.
        this.mesh.material?.dispose(true, false);
        this.mesh.dispose();
    }

    /**
     * Make every buffer at this capacity, keeping what an older set held.
     * @param old - The buffers before a doubling.
     * @returns The buffers.
     */
    private build(old?: Record<Buffer, Float32Array<ArrayBuffer>>): Record<Buffer, Float32Array<ArrayBuffer>> {
        const made = {} as Record<Buffer, Float32Array<ArrayBuffer>>;
        for (const kind of Object.keys(BUFFERS) as Buffer[]) {
            const stride = BUFFERS[kind];
            const floats = new Float32Array(this.capacity * stride);
            if (kind === "capRows") {
                floats.fill(NO_ROW);
            }

            if (kind === "matrix") {
                for (let i = 0; i < this.capacity; i++) {
                    floats.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], i * stride);
                }
            }

            if (old) {
                floats.set(old[kind]);
            }

            this.mesh.thinInstanceSetBuffer(kind, floats, stride, false);
            this.uploadedBytes += floats.byteLength;
            made[kind] = floats;
        }

        this.mesh.thinInstanceCount = this.highWater;
        return made;
    }
}
