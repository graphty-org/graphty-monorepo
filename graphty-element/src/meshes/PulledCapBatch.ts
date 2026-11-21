// Installs Mesh.prototype.thinInstanceSetBuffer and its siblings, which this module calls.
import "@babylonjs/core/Meshes/thinInstanceMesh.js";

import type { BaseTexture } from "@babylonjs/core";
import type { ShaderMaterial } from "@babylonjs/core/Materials/shaderMaterial.js";
import { Color3 } from "@babylonjs/core/Maths/math.color.js";
import { Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import type { Mesh } from "@babylonjs/core/Meshes/mesh.js";
import type { Scene } from "@babylonjs/core/scene.js";

import type { RowTable } from "../render/RowTable";
import { trimEnds } from "./edgeTrim";
import { batchUploadFrames } from "./FrameRoster";
import { type RestSource, RestWatch, roundRowEnd, rowCapScale } from "./restPlacement";

/**
 * @file Arrow caps drawn from the row table: a cap is two row numbers and what it stands back by,
 * not a place. The billboard shader (`CAP_PULLED` in `FilledArrowRenderer`) trims the line between
 * the two rows with the same include a pulled line reads (`EDGE_TRIM_GLSL`) and stands the cap at
 * the head end, so a move uploads its rows and no cap byte, and a cap and a line end cannot disagree.
 * Design: `design/rendering/row-renderer.md`, section 4.3, stage 17.
 *
 * Only a 3D billboarded cap at the end of a straight line between two closed ends is pulled: no 2D
 * cap, no image, no stack, no cap part-way along. Only renderPath "batched" builds one, for the heads of
 * its straight pulled lines (`meshes/pulledHead.ts`). At rest it places them on the CPU by the object path's own
 * arithmetic (`restPlacement.ts`), so a still graph draws the objects picture.
 */

/** Slots a new batch starts with, before the first doubling. */
const INITIAL_SLOTS = 32;

/** A row number no row has: the cap draws nothing. */
const NO_ROW = -1;

/** The per-cap buffers and the floats each takes; `matrix` is the identity, which thin instances need. */
const BUFFERS = {
    matrix: 16,
    arrowSize: 1,
    arrowColor: 3,
    capRows: 2,
    capPlace: 4,
    capAt: 4,
    arrowDirection: 3,
} as const;

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
    /** How far the cap's center sits behind its tip at node scale 1 (`EdgeMesh.calculateArrowPosition`). */
    centreBack: number;
    /** Its length at node scale 1. */
    size: number;
    /** Its color, as a hex string. */
    colour: string;
}

/**
 * How a head is drawn, shared by every head of one style: what {@link PulledCapBatch} places one by at rest, and
 * `PulledLineBatch` the line under it.
 */
export interface PulledCapLook {
    /** Its length at node scale 1. */
    readonly size: number;
    /** Where its center stands for a tip, a direction and a length (`EdgeMesh.calculateArrowPosition`). */
    readonly centreAt: (tip: Vector3, direction: Vector3, length: number) => Vector3;
    /** How far before the tip the line stops for a length (`EdgeMesh.lineStopOf`). */
    readonly lineStopAt: (length: number) => number;
}

/** Arrow caps of one shape and opacity, placed by the shader from the row table; see the file comment. */
export class PulledCapBatch {
    /** The one mesh that draws every cap. */
    readonly mesh: Mesh;

    /** The shape its caps are drawn in: the name its mesh was made with, as `ArrowCapBatch.shape` reads it. */
    readonly shape: string;

    /** How wide one of its caps reads at size 1, as `ArrowCapBatch.spanOf` reads a billboarded cap. */
    readonly unitSpan: number;

    /** Bytes of cap buffers sent to the card so far: buffers built and caps written, never a move. */
    uploadedBytes = 0;

    private capacity = INITIAL_SLOTS;

    private buffers: Record<Buffer, Float32Array<ArrayBuffer>>;

    private highWater = 0;

    private readonly free: number[] = [];

    /** Whether a cap was written since the last upload. */
    private dirty = false;

    /** Each slot's look, for placing it at rest; undefined for a slot with no look (drawn only by the shader). */
    private readonly looks: (PulledCapLook | undefined)[] = [];

    /** When the caps are placed on the CPU (`restPlacement.ts`). */
    private readonly watch = new RestWatch();

    /** Caps placed on the CPU at rest, counted for tests. */
    placedCaps = 0;

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
        private readonly rest: RestSource | null = null,
    ) {
        this.mesh = mesh;
        this.shape = mesh.name;
        const { minimum, maximum } = mesh.getBoundingInfo().boundingBox;
        this.unitSpan = Math.sqrt(3) * Math.max(minimum.length(), maximum.length());
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
        this.looks[slot] = undefined;
        this.free.push(slot);
    }

    /**
     * Stand a cap at the head end of the line between two rows. Written when an edge joins or
     * changes its look or a node, never because one moved.
     * @param slot - The cap.
     * @param cap - Its rows and what it stands back by.
     * @param look - Its look, shared by every cap of its style, so the batch places it at rest; none leaves it to the
     *     shader alone.
     */
    setCap(slot: number, cap: PulledCapPlace, look?: PulledCapLook): void {
        const { arrowSize, arrowColor, capPlace } = this.buffers;
        this.looks[slot] = look;
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
        // the shader stands it from its rows until the next rest places it
        this.buffers.capAt[slot * 4 + 3] = 0;
        this.dirty = true;
        this.watch.touch();
    }

    /** Send what was written since the last frame, and bind this frame's row table. */
    flush(): void {
        const material = this.mesh.material as ShaderMaterial | null;
        const { position, extent } = this.rowTextures();
        material?.setTexture("rowPosition", position);
        material?.setTexture("rowExtent", extent);
        this.followRest();
        material?.setFloat("capPlaced", this.watch.placed ? 1 : 0);
        if (!this.dirty) {
            return;
        }

        // ponytail: whole buffers, as a cap is written only on a join, a look change or a rest; ranged
        // uploads (DirtyRuns) if a stage writes caps per frame.
        for (const kind of ["arrowSize", "arrowColor", "capRows", "capPlace", "capAt", "arrowDirection"] as const) {
            this.mesh.thinInstanceBufferUpdated(kind);
            this.uploadedBytes += this.buffers[kind].byteLength;
        }

        this.dirty = false;
    }

    /**
     * Place the caps on the CPU once the rows are at rest (`restPlacement.ts`), by the same float64 arithmetic as
     * `Edge.placeArrowHead` over the row table (`Edge.interceptPointsFromColumns`), so a still graph draws the objects
     * picture.
     */
    private followRest(): void {
        const { rest } = this;
        if (rest === null || !this.watch.due(rest)) {
            return;
        }

        this.placeAll(rest.rows);
        this.watch.done(rest.rows);
        // uploaded by this flush, so this frame draws them
        this.dirty = true;
    }

    /**
     * Place every cap that has a look and two rows, as {@link PulledCapBatch.followRest} says.
     * @param rows - The row table.
     */
    private placeAll(rows: RowTable): void {
        const { capRows, capPlace, capAt, arrowDirection } = this.buffers;
        for (let slot = 0; slot < this.highWater; slot++) {
            const look = this.looks[slot];
            const [from, head] = [capRows[slot * 2], capRows[slot * 2 + 1]];
            capAt[slot * 4 + 3] = 0;
            if (look === undefined || from < 0 || head < 0) {
                continue;
            }

            const source = roundRowEnd(rows, from, capPlace[slot * 4]);
            const target = roundRowEnd(rows, head, capPlace[slot * 4 + 1]);
            const scale = rowCapScale(rows, head);
            if (source === null || target === null) {
                continue;
            }

            // Edge.placeArrowCaps over Edge.interceptPointsFromColumns, then Edge.placeArrowHead
            const { src, dst } = trimEnds({
                src: rows.centerOf(from),
                dst: rows.centerOf(head),
                source,
                target,
                capBack: 0,
            });
            if (src === null || dst === null) {
                continue;
            }

            const srcPoint = new Vector3(src.x, src.y, src.z);
            const dstPoint = new Vector3(dst.x, dst.y, dst.z);
            const direction = dstPoint.subtract(srcPoint).normalize();
            const tip = dstPoint.subtract(direction.scale(capPlace[slot * 4 + 2]));
            const length = look.size * scale;
            const centre = look.centreAt(tip, direction, length);
            capAt.set([centre.x, centre.y, centre.z, length], slot * 4);
            arrowDirection.set([direction.x, direction.y, direction.z], slot * 3);
            this.placedCaps++;
        }
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
