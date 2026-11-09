// Installs Mesh.prototype.thinInstanceSetBuffer and its siblings, which this module calls. Loaded
// here so any path that reaches a batch has them. See test/packaging/babylon-side-effects.test.ts.
import "@babylonjs/core/Meshes/thinInstanceMesh.js";

import { Buffer, Matrix, type Mesh, Quaternion, type Scene, Vector3 } from "@babylonjs/core";

import { UNTIMED_AGE } from "../session/time/ageFade";
import { CustomLineRenderer } from "./CustomLineRenderer";
import { DirtyRuns, sendThinInstanceMatrices } from "./DirtyRuns";
import {
    EDGE_STATIC_ATTRIBUTES,
    EDGE_STATIC_FLOATS,
    JOIN_FLOATS_PER_PIECE,
    WIDENED_FLOATS_PER_PIECE,
} from "./edgeJoinShader";
import { batchUploadFrames, type EdgeAgeState, type RangedUploads } from "./FrameRoster";
import { ParkedSlots } from "./ParkedSlots";
import { discreteMeshCount } from "./PatternedLineMesh";

/** Floats in one 4x4 world matrix, which is what a thin-instance slot holds. */
const FLOATS_PER_MATRIX = 16;

/** Floats in one slot of a plain batch: the piece and its neighbours (see `edgeJoinShader`). */
const FLOATS_PER_SLOT = JOIN_FLOATS_PER_PIECE;

/** Slots a new batch starts with, before the first doubling. */
const INITIAL_SLOTS = 32;

/** Floats in one slot's color: red, green, blue and the opacity. */
const FLOATS_PER_COLOR = 4;

/**
 * What a batch's mesh is set to while any of its slots is translucent, which puts the batch in the
 * alpha-blended pass. The join shader never reads the mesh's visibility, so this is not ink.
 */
const TRANSPARENT_PASS = 0.5;

/** What a slot draws: its row, which says how old it is when lines fade by age. */
export interface SlotOwner {
    /** The edge's row. */
    readonly index: number;
}

/** Every mesh an edge line batch draws with, so a teardown can tell a shared batch from an edge's own mesh. */
const batchMeshes = new WeakSet<Mesh>();

/**
 * Count a mesh as a shared edge batch's, as {@link isEdgeLineBatchMesh} reads it (`PulledLineBatch`).
 * @param mesh - The mesh.
 */
export function markEdgeLineBatchMesh(mesh: Mesh): void {
    batchMeshes.add(mesh);
}

/**
 * Whether a mesh is a shared edge line batch rather than one edge's own mesh. A pulled batch has
 * no instances, so `hasThinInstances` cannot tell.
 * @param mesh - The mesh.
 * @returns True for a batch's mesh.
 */
export function isEdgeLineBatchMesh(mesh: unknown): boolean {
    return batchMeshes.has(mesh as Mesh);
}

// Scratch values for composing a slot's matrix. One edge moving is the hottest path in the
// renderer -- every edge of a settling layout comes through here on every frame -- so the
// arithmetic below allocates nothing at all.
const scratchDirection = new Vector3();
const scratchMiddle = new Vector3();
const scratchScaling = new Vector3(1, 1, 1);
const scratchRotation = new Quaternion();
const scratchMatrix = new Matrix();
const scratchA = new Vector3();
const scratchB = new Vector3();
const scratchColor = new Float32Array(FLOATS_PER_COLOR);

/**
 * What a batch's mesh says about how it is drawn, in `mesh.metadata`.
 *
 * `joinedLine` is set by the line meshes built on `edgeJoinShader` (`CustomLineRenderer
 * .createJoinedLineMesh`): their slots are the instanced attributes that shader reads, so the
 * pieces of a bent edge meet at their corners. Any other mesh -- the animated line -- is drawn from
 * a thin-instance matrix per slot, one straight piece each, as before.
 */
export interface EdgeLineMeta {
    joinedLine?: boolean;
    /**
     * A dashed or dotted line: which, its element's length along the line, `line.patternCount`, and the gap between
     * two elements (`line.dashGap`, in world units; unset, the elements spread from end to end).
     */
    pattern?: { kind: "dash" | "dot"; elementLength: number; count?: number | undefined; gap?: number | undefined };
    /**
     * A joined line drawn with a shader or a taper (`edgeJoinShader`'s `EDGE_WIDENED`): each slot
     * also carries the whole edge's length, and the static values in a buffer of their own.
     */
    widened?: boolean;
    /** A line drawn without alpha blending (`line.blending` false), which never fades by age. */
    opaque?: boolean;
    /**
     * The color and opacity a new slot is drawn in, for a batch whose shader reads them per slot
     * (`edgeJoinShader`'s `EDGE_SLOT_COLOR`); absent when the material holds them.
     */
    color?: readonly [number, number, number, number];
}

/**
 * The local matrix that puts the renderer's unit line segment between two points.
 *
 * THE SAME ARITHMETIC `EdgeMesh.transformMesh` DOES, spelled as a matrix instead of as three
 * writes to a mesh. That method sets `position` to the middle of the segment, calls `lookAt` at
 * the far end and scales z by the segment's length; Babylon then composes exactly the matrix
 * below out of those three. Writing it here is what lets an edge be a row of floats rather than
 * a scene object -- and `test/edge-line-batch.test.ts` holds the two spellings against each other
 * so they cannot drift.
 * @param srcPoint - Where the line starts.
 * @param dstPoint - Where the line ends.
 * @param out - The matrix to write.
 */
export function segmentMatrixToRef(srcPoint: Vector3, dstPoint: Vector3, out: Matrix): void {
    dstPoint.subtractToRef(srcPoint, scratchDirection);
    const length = scratchDirection.length();

    scratchMiddle.set(
        srcPoint.x + scratchDirection.x / 2,
        srcPoint.y + scratchDirection.y / 2,
        srcPoint.z + scratchDirection.z / 2,
    );

    // `lookAt(dstPoint)` measures from the mesh's own position, which is the middle of the
    // segment, so the vector it turns into yaw and pitch is half the delta -- same direction,
    // and the angles below are Babylon's own (TransformNode.setDirection).
    const yaw = -Math.atan2(scratchDirection.z, scratchDirection.x) + Math.PI / 2;
    const flat = Math.sqrt(scratchDirection.x * scratchDirection.x + scratchDirection.z * scratchDirection.z); // NOSONAR(S7769): per edge, per frame; Math.hypot made this function 50-70% slower
    const pitch = -Math.atan2(scratchDirection.y, flat);

    Quaternion.RotationYawPitchRollToRef(yaw, pitch, 0, scratchRotation);
    scratchScaling.set(1, 1, length);
    Matrix.ComposeToRef(scratchScaling, scratchRotation, scratchMiddle, out);
}

/**
 * Every edge line drawn with one appearance, as instances of a single mesh: one draw call however
 * many edges are in it.
 *
 * A SLOT IS ONE STRAIGHT PIECE AND ITS NEIGHBOURS. A straight edge takes one slot, a curve or a
 * bent edge one per piece ({@link EdgeLineBatch.placeRun}). Each slot holds the piece's two ends,
 * the corner before it and the corner after it, how far along the edge it starts and the dash
 * spacing -- fourteen floats, read by `edgeJoinShader`, which joins the pieces at their corners
 * with a miter or a bevel and no pixel drawn twice. Design: `design/edges/sharp-corners.md`.
 *
 * A mesh that is not a joined line (the animated line, `EdgeLineMeta`) is drawn from a
 * thin-instance matrix per slot instead, composed from the same two ends.
 *
 * MOVING ONE COSTS A WRITE AND NOTHING ELSE. Slots are floats in this batch's own array, uploaded
 * once a frame from {@link EdgeLineBatch.flush}, never once per edge: uploading per edge is
 * O(n^2), and measured 42 seconds a frame at 20,000 edges when thin instances were moved with
 * `thinInstanceSetMatrixAt`.
 */
export class EdgeLineBatch {
    /** The one mesh that draws every edge in this batch. */
    readonly mesh: Mesh;

    /** Every slot, live or free, packed end to end, {@link EdgeLineBatch.stride} floats each. */
    private slots: Float32Array;

    /**
     * Floats per slot: the plain piece's fourteen, or sixteen in a widened batch, whose slots also
     * carry the whole edge's length. A plain batch uploads exactly what it always uploaded.
     */
    private readonly stride: number;

    /**
     * What the slots the visibility mask hid held, so showing one puts it back (see {@link ParkedSlots}):
     * only for a batch drawn from thin-instance matrices. A joined line hides a slot with
     * {@link EdgeLineBatch.hidden} instead and keeps its floats where they are.
     */
    private readonly parking: ParkedSlots | null;

    /**
     * Per slot, 1 while the visibility mask hides it (the shader's `edgeHidden`): hiding or showing
     * a joined line's slot writes this one float and leaves the slot as placed (issue #6025).
     */
    private hidden: Float32Array;

    /** The GPU buffer {@link EdgeLineBatch.hidden} is read from; null for a matrix batch. */
    private hiddenBuffer: Buffer | null = null;

    /** Which hidden flags have been written since the last upload. */
    private readonly hiddenRuns = new DirtyRuns();

    /**
     * Per slot, its color and opacity (the shader's `edgeColor`), for a batch whose shader reads
     * them per slot; null when the material holds them. Edges that differ only in color share
     * such a batch, and recoloring one writes these four floats (issue #6026).
     */
    private colors: Float32Array | null;

    /** What a slot is drawn in until its edge writes its own; see {@link EdgeLineMeta.color}. */
    private readonly defaultColor: readonly number[] | null;

    /** The GPU buffer {@link EdgeLineBatch.colors} is read from. */
    private colorBuffer: Buffer | null = null;

    /** Which colors have been written since the last upload. */
    private readonly colorRuns = new DirtyRuns();

    /** Slots in use drawn at an opacity under 1, which put the whole batch in the transparent pass. */
    private translucent = 0;

    /** Whether this batch draws without alpha blending, where an opacity is never translucent. */
    private readonly opaque: boolean;

    /** The visibility the batch's mesh was built with: below 1 for a look made translucent. */
    private readonly baseVisibility: number;

    /**
     * A widened batch's static values, {@link EDGE_STATIC_FLOATS} per slot, uploaded only when one
     * is written (a repaint), never because an edge moved; null for a plain batch.
     */
    private statics: Float32Array | null;

    /** The GPU buffer the static values are read from. */
    private staticBuffer: Buffer | null = null;

    /** Which static values have been written since the last upload. */
    private readonly staticRuns = new DirtyRuns();

    /** The thin-instance matrices of a batch that is not a joined line; null for a joined one. */
    private matrices: Float32Array | null;

    /** The GPU buffer a joined line's slots are read from, rebuilt when the batch grows. */
    private buffer: Buffer | null = null;

    /** The scene's fade by age; see {@link batchUploadFrames}. */
    private readonly ageState: EdgeAgeState;

    /** Whether this batch can fade by age: a joined line that blends. */
    private readonly ageable: boolean;

    /** The look last asked for: fading by age or not. Drawn once its program has compiled. */
    private agedTarget = false;

    /** How many times the look was asked to change, so a compile that finished late is dropped. */
    private ageSwitches = 0;

    /** Who each slot draws, for its age. */
    private readonly owners: (SlotOwner | undefined)[] = [];

    /** Each slot's age while the batch fades by age; null otherwise. */
    private ages: Float32Array | null = null;

    /** The GPU buffer the ages are read from. */
    private ageBuffer: Buffer | null = null;

    /** Which ages have been written since the last upload. */
    private readonly ageRuns = new DirtyRuns();

    /** The scene's ages the slots' ages were last written from. */
    private agesFrom: Float32Array | null = null;

    /** Slots handed out so far. Slots at or past this index have never been used. */
    private highWater = 0;

    /** Slots handed back, ready to be handed out again. */
    private readonly free: number[] = [];

    /**
     * Slots currently drawing an edge. The batch goes when this reaches zero.
     *
     * WITHOUT THIS A RETIRED APPEARANCE NEVER LEAVES THE SCENE. Every edge starts on the paint
     * the element gives one it has not styled yet and moves off it as soon as the style stack
     * resolves, so the batch that drew that first appearance ends every load with no edges in it.
     * Held only by the mesh cache, which lives as long as the graph does, it stayed in
     * `scene.meshes` with its material for the rest of the session --
     * `test/browser/every-element-leaves-the-bootstrap-paint.test.ts` is what noticed.
     */
    private live = 0;

    /** Told by this batch that it has emptied, so whoever holds it can forget it. */
    private readonly retire: () => void;

    /** Which slots have been written since the last upload. */
    private readonly slotRuns = new DirtyRuns();

    /** The scene's switch for uploading only what was written; see {@link batchUploadFrames}. */
    private readonly uploads: RangedUploads;

    private gone = false;

    /** Ends this batch's per-frame upload; see {@link batchUploadFrames}. */
    private readonly stopFlush: () => void;

    /** A dashed or dotted line's element length and count; see {@link EdgeLineMeta}. */
    private readonly pattern: EdgeLineMeta["pattern"];

    /**
     * Start a batch on one line mesh.
     * @param mesh - The line mesh to draw every edge in this batch from, at the origin and
     *     unrotated: the slots carry the placement, and this mesh's own world matrix is applied on
     *     top of it by the shader (which is how the batch follows `graph-root` under an XR gesture).
     * @param scene - The scene that renders it.
     * @param retire - Called when the last edge leaves this batch, so whoever holds it can forget
     *     it before it disposes itself. Defaults to doing nothing, for a batch nobody holds.
     */
    constructor(mesh: Mesh, scene: Scene, retire: () => void = (): void => undefined) {
        this.mesh = mesh;
        batchMeshes.add(mesh);
        this.retire = retire;
        this.uploads = batchUploadFrames.rangedUploads(scene);
        const meta = (mesh.metadata ?? {}) as EdgeLineMeta;
        this.pattern = meta.pattern;
        const widened = meta.joinedLine === true && meta.widened === true;
        this.stride = widened ? WIDENED_FLOATS_PER_PIECE : FLOATS_PER_SLOT;
        this.parking = meta.joinedLine === true ? null : new ParkedSlots(this.stride);
        this.hidden = new Float32Array(INITIAL_SLOTS);
        this.opaque = meta.opaque === true;
        this.defaultColor = meta.joinedLine === true && !widened ? (meta.color ?? null) : null;
        this.colors = this.defaultColor === null ? null : this.colorRows(INITIAL_SLOTS);
        this.baseVisibility = mesh.visibility;
        this.statics = widened ? new Float32Array(INITIAL_SLOTS * EDGE_STATIC_FLOATS) : null;
        this.slots = new Float32Array(INITIAL_SLOTS * this.stride);
        this.matrices = meta.joinedLine === true ? null : new Float32Array(INITIAL_SLOTS * FLOATS_PER_MATRIX);
        this.ageState = batchUploadFrames.edgeAges(scene);
        this.ageable = meta.joinedLine === true && meta.opaque !== true;
        // A batch built while lines fade by age starts with the look: it has drawn nothing yet.
        if (this.ageable && this.ageState.on) {
            this.agedTarget = true;
            this.ages = new Float32Array(INITIAL_SLOTS);
            CustomLineRenderer.setAged(mesh, true, this.ageState);
        }

        // An edge line was never a pick candidate and a batch of them is not one either.
        mesh.isPickable = false;

        // The bounding box of a batch is meaningless -- it is the whole graph -- and recomputing
        // it walks every slot, which would put the O(n) work back on every buffer change. The
        // line's box is wrong anyway once the shader expands it in screen space.
        mesh.doNotSyncBoundingInfo = true;
        mesh.alwaysSelectAsActiveMesh = true;

        this.bindBuffers();

        // Follow the graph's own transform, so an XR pinch moves the lines with the nodes. A batch
        // is parented once and its shader applies that transform to every slot in it.
        const graphRoot = scene.getTransformNodeByName("graph-root");

        if (graphRoot) {
            mesh.parent = graphRoot;
        }

        // ONE UPLOAD PER FRAME, WHOEVER MOVED THE EDGES. Hanging the upload on the scene rather
        // than on the update loop means a render from anywhere -- the element's own frame, a
        // story that steps the graph by hand, a test that renders once -- draws what was written
        // for it, and still uploads once rather than once per edge.
        this.stopFlush = batchUploadFrames.join(scene, () => {
            this.flush();
        });
    }

    /**
     * The name the renderer gave this batch's mesh, which carries the appearance it draws.
     * @returns The name.
     */
    get name(): string {
        return this.mesh.name;
    }

    /**
     * Whether this batch's mesh has been disposed, so every slot in it is stale.
     * @returns True once it is gone.
     */
    get disposed(): boolean {
        return this.gone;
    }

    /**
     * How many slots the mesh draws: every slot handed out, live or free (a free one draws nothing).
     * @returns The count.
     */
    get drawnCount(): number {
        return this.highWater;
    }

    /**
     * Whether this batch is widened: drawn with a shader or a taper, its slots carrying static
     * values ({@link EdgeLineBatch.writeStatic}).
     * @returns True for a widened batch.
     */
    get widened(): boolean {
        return this.statics !== null;
    }

    /**
     * How many slots draw an edge now.
     * @returns The count.
     */
    get liveCount(): number {
        return this.live;
    }

    /**
     * Write one slot's static values in a widened batch: uploaded with the next frame, and not
     * again until one is written. A plain batch ignores it.
     * @param index - The slot.
     * @param values - {@link EDGE_STATIC_FLOATS} floats, in `EDGE_STATIC_ATTRIBUTES` order.
     */
    writeStatic(index: number, values: ArrayLike<number>): void {
        if (this.statics === null || this.gone) {
            return;
        }

        this.statics.set(values, index * EDGE_STATIC_FLOATS);
        this.staticRuns.mark(index, this.uploads.on, this.highWater);
    }

    /**
     * The static values one slot of a widened batch holds.
     * @param index - The slot.
     * @returns A copy, or null for a plain batch.
     */
    staticOf(index: number): Float32Array | null {
        return this.statics === null
            ? null
            : this.statics.slice(index * EDGE_STATIC_FLOATS, (index + 1) * EDGE_STATIC_FLOATS);
    }

    /**
     * Take a slot to draw one edge in.
     * @param owner - The edge it draws, whose row says how old it is when lines fade by age; a slot
     *     with none draws as the newest.
     * @returns The slot's index, which the caller keeps until it releases it.
     */
    acquire(owner?: SlotOwner): number {
        this.live++;

        let index = this.free.pop();
        if (index === undefined) {
            if (this.highWater === this.slots.length / this.stride) {
                this.grow();
            }

            index = this.highWater;
            this.highWater++;
            this.setCount();
        }

        this.forget(index);
        if (this.colors !== null && this.defaultColor !== null) {
            // Live again with the color it last held (a new slot holds the default), then given
            // the default, which writes nothing when it already holds it.
            if (this.colors[index * FLOATS_PER_COLOR + 3] < 1) {
                this.countTranslucent(1);
            }
            const [r, g, b, a] = this.defaultColor;
            this.setColor(index, r, g, b, a);
        }

        // ponytail: slots taken while the timeline is off record no edge, so a timeline switched
        // on later fades them as the newest until they are rebuilt. Record always if that matters.
        if (this.ageable && this.ageState.track) {
            this.owners[index] = owner;
            if (this.ages !== null) {
                this.ages[index] = this.ageOf(owner);
                this.ageRuns.mark(index, this.uploads.on, this.highWater);
            }
        }

        return index;
    }

    /**
     * Take a slot drawn exactly as a slot of another batch is drawn: its placement copied, not
     * placed again. What an edge whose colour or opacity changed takes, because those are its
     * batch's and nothing about where it is drawn moved.
     * @param from - The batch the edge is drawn in now.
     * @param index - Its slot there, which the caller releases afterwards.
     * @param owner - The edge it draws; see {@link EdgeLineBatch.acquire}.
     * @returns The new slot, and whether its placement was copied: false when the two batches lay
     *     their slots out differently, and the slot is left for the next placement.
     */
    adopt(from: EdgeLineBatch, index: number, owner?: SlotOwner): { slot: number; copied: boolean } {
        const slot = this.acquire(owner);
        const copied =
            !this.gone &&
            !from.gone &&
            from.stride === this.stride &&
            (from.matrices === null) === (this.matrices === null) &&
            (from.statics === null) === (this.statics === null);
        if (!copied) {
            return { slot, copied };
        }

        // A slot the visibility mask parked stays parked, holding the placement it will be shown at.
        const { stride } = this;
        const parked = from.isParked(index);
        this.slots.set(from.placementOf(index), slot * stride);
        if (this.statics !== null && from.statics !== null) {
            this.writeStatic(slot, from.statics.subarray(index * EDGE_STATIC_FLOATS, (index + 1) * EDGE_STATIC_FLOATS));
        }

        if (parked) {
            if (this.parking === null) {
                // A joined line's parked slot holds its placement, which goes up with its flag.
                this.slotRuns.mark(slot, this.uploads.on, this.highWater);
            }

            this.park(slot);
            return { slot, copied };
        }

        if (this.matrices !== null && from.matrices !== null) {
            const at = index * FLOATS_PER_MATRIX;
            this.matrices.set(from.matrices.subarray(at, at + FLOATS_PER_MATRIX), slot * FLOATS_PER_MATRIX);
        }

        this.slotRuns.mark(slot, this.uploads.on, this.highWater);

        return { slot, copied };
    }

    /**
     * Draw one slot in a color and an opacity, in place: one row of four floats uploaded with the
     * next frame. A no-op on a batch whose material holds the color.
     * @param index - The slot.
     * @param r - Red, 0 to 1.
     * @param g - Green, 0 to 1.
     * @param b - Blue, 0 to 1.
     * @param a - The opacity, 0 to 1.
     */
    setColor(index: number, r: number, g: number, b: number, a: number): void {
        const c = this.colors;
        if (c === null || this.gone) {
            return;
        }

        const at = index * FLOATS_PER_COLOR;
        // Compared as the floats the array holds, so a value that rounds the same writes nothing.
        scratchColor[0] = r;
        scratchColor[1] = g;
        scratchColor[2] = b;
        scratchColor[3] = a;
        if (
            c[at] !== scratchColor[0] ||
            c[at + 1] !== scratchColor[1] ||
            c[at + 2] !== scratchColor[2] ||
            c[at + 3] !== scratchColor[3]
        ) {
            this.writeColor(index, scratchColor);
        }
    }

    /**
     * Draw one slot in the color another slot of this batch is drawn in: what a run of pieces takes
     * for a piece it grows by. A no-op on a batch whose material holds the color.
     * @param index - The slot.
     * @param from - The slot whose color it takes.
     */
    copyColor(index: number, from: number): void {
        const c = this.colors;
        if (c !== null && index !== from) {
            this.setColor(
                index,
                c[from * FLOATS_PER_COLOR],
                c[from * FLOATS_PER_COLOR + 1],
                c[from * FLOATS_PER_COLOR + 2],
                c[from * FLOATS_PER_COLOR + 3],
            );
        }
    }

    /**
     * The color and opacity one slot is drawn in.
     * @param index - The slot.
     * @returns Red, green, blue and the opacity, or null for a batch whose material holds them.
     */
    colorOf(index: number): [number, number, number, number] | null {
        const c = this.colors;
        if (c === null) {
            return null;
        }

        const at = index * FLOATS_PER_COLOR;
        return [c[at], c[at + 1], c[at + 2], c[at + 3]];
    }

    /**
     * Hand a slot back, and stop drawing it.
     *
     * ponytail: the free list never shrinks and the slots are never compacted, so a graph that
     * loses most of its edges keeps paying a vertex shader for the gaps. Compact when a profile
     * shows the high-water mark outgrowing the live edge count by more than about a third.
     * @param index - The slot.
     */
    release(index: number): void {
        if (this.gone) {
            return;
        }

        this.hide(index);
        if (this.ageable && this.ageState.track) {
            this.owners[index] = undefined;
        }

        // A free slot draws nothing and counts for no pass. It keeps its color, as the GPU does,
        // until `acquire` takes it again.
        if (this.colors !== null && this.colors[index * FLOATS_PER_COLOR + 3] < 1) {
            this.countTranslucent(-1);
        }

        this.free.push(index);
        this.live--;
        this.slotReleased(index);

        // The last edge takes the batch with it, so an appearance nothing is drawn with any more
        // leaves no mesh and no material behind. This is what `ArrowCapBatch.release` does too.
        if (this.live === 0) {
            this.retire();
            this.dispose();
        }
    }

    /**
     * Draw one slot's line straight between two points: a run of one piece.
     * @param index - The slot.
     * @param srcPoint - Where the line starts.
     * @param dstPoint - Where the line ends.
     */
    place(index: number, srcPoint: Vector3, dstPoint: Vector3): void {
        if (this.gone) {
            return;
        }

        const length = Vector3.Distance(srcPoint, dstPoint);
        this.write(index, srcPoint, srcPoint, dstPoint, dstPoint, {
            distance: 0,
            spacing: this.spacingFor(length),
            total: length,
        });
    }

    /**
     * Draw one edge as a run of straight pieces through points, one slot per piece, joined at
     * every corner. The slots must number one fewer than the points; extra slots are hidden.
     * @param slots - The edge's slots, in order along it.
     * @param flat - The points, flat x, y, z.
     */
    placeRun(slots: readonly number[], flat: readonly number[]): void {
        if (this.gone) {
            return;
        }

        const pieces = Math.min(slots.length, flat.length / 3 - 1);
        let total = 0;
        for (let i = 0; i < pieces; i++) {
            total += pieceLength(flat, i);
        }

        const spacing = this.spacingFor(total);
        let distance = 0;
        for (let i = 0; i < pieces; i++) {
            this.writeFlat(slots[i], flat, i, pieces, { distance, spacing, total });
            distance += pieceLength(flat, i);
        }

        for (let i = pieces; i < slots.length; i++) {
            this.hide(slots[i]);
        }
    }

    /**
     * Draw or stop drawing one slot.
     *
     * Only the hiding half does anything. A zero slot collapses the piece to a point, and the
     * shader draws no fragments for it; showing it again is left to the next placement. The
     * visibility mask hides with {@link EdgeLineBatch.park} instead, which can put the slot back.
     * @param index - The slot.
     * @param drawn - Whether the edge is on screen.
     */
    setDrawn(index: number, drawn: boolean): void {
        if (!drawn) {
            this.hide(index);
        }
    }

    /**
     * Stop drawing one slot because the visibility mask hid its edge, keeping what it held so
     * {@link EdgeLineBatch.unpark} can put it back. A joined line sets the slot's hidden flag and
     * leaves its floats alone; a matrix batch stashes and zeroes them (see {@link ParkedSlots}).
     * @param index - The slot.
     */
    park(index: number): void {
        if (this.gone) {
            return;
        }

        if (this.parking !== null) {
            this.parking.park(this.slots, index);
            this.collapse(index);
        } else if (this.hidden[index] !== 1) {
            this.hidden[index] = 1;
            this.hiddenRuns.mark(index, this.uploads.on, this.highWater);
        }
    }

    /**
     * Draw a parked slot again as it was when it was parked.
     * @param index - The slot.
     * @returns True when it was put back; false when it was not parked (or was written since), so
     *     its edge has to place it.
     */
    unpark(index: number): boolean {
        if (this.gone) {
            return false;
        }

        if (this.parking === null) {
            if (this.hidden[index] !== 1) {
                return false;
            }

            this.hidden[index] = 0;
            this.hiddenRuns.mark(index, this.uploads.on, this.highWater);
            return true;
        }

        if (!this.parking.unpark(this.slots, index)) {
            return false;
        }

        this.writeMatrix(index);
        this.slotRuns.mark(index, this.uploads.on, this.highWater);

        return true;
    }

    /**
     * Whether the visibility mask hides a slot, its placement kept for {@link EdgeLineBatch.unpark}.
     * @param index - The slot.
     * @returns True while it is parked.
     */
    isParked(index: number): boolean {
        return this.parking === null ? this.hidden[index] === 1 : this.parking.isParked(index);
    }

    /**
     * What a slot is drawn as when it is shown: its placement, parked or not.
     * @param index - The slot.
     * @returns A view of its floats; copy it before the batch is written.
     */
    private placementOf(index: number): Float32Array {
        if (this.parking !== null) {
            return this.parking.placementOf(this.slots, index);
        }

        const at = index * this.stride;
        return this.slots.subarray(at, at + this.stride);
    }

    /**
     * Whether a slot keeps its placement while the shader draws nothing for it, so a read of what is
     * drawn there reads nothing, as it does for a zeroed slot.
     * @param index - The slot.
     * @returns True for a parked slot of a joined line.
     */
    private hiddenInPlace(index: number): boolean {
        return this.parking === null && this.hidden[index] === 1;
    }

    /**
     * Forget that a slot is parked: something else wrote it.
     * @param index - The slot.
     */
    private forget(index: number): void {
        if (this.parking !== null) {
            this.parking.forget(index);
        } else if (this.hidden[index] !== 0) {
            this.hidden[index] = 0;
            this.hiddenRuns.mark(index, this.uploads.on, this.highWater);
        }
    }

    /**
     * How long the line in one slot is drawn, in world units.
     * @param index - The slot.
     * @returns The length.
     */
    lengthOf(index: number): number {
        if (this.hiddenInPlace(index)) {
            return 0;
        }

        const at = index * this.stride;
        const x = this.slots[at + 6] - this.slots[at + 3];
        const y = this.slots[at + 7] - this.slots[at + 4];
        const z = this.slots[at + 8] - this.slots[at + 5];

        return Math.sqrt(x * x + y * y + z * z); // NOSONAR(S7769): per edge, per frame; Math.hypot measured ~17x slower here
    }

    /**
     * Where the line in one slot is drawn, in world units: the middle of the piece.
     *
     * THE READING THAT USED TO BE `mesh.position`. An edge drawn as an instance of its own mesh
     * put the middle of its segment in that mesh's position, which is how a test asks "is this
     * edge drawn between the two ends the layout gave". A slot has no mesh, so the same number is
     * read back out of the slot here.
     * @param index - The slot.
     * @returns The middle of the drawn piece, as a fresh vector the caller may keep.
     */
    centreOf(index: number): Vector3 {
        const [a, b] = this.endsOf(index);

        return a.addInPlace(b).scaleInPlace(0.5);
    }

    /**
     * Where the line in one slot starts and ends.
     * @param index - The slot.
     * @returns The two ends, as fresh vectors the caller may keep.
     */
    endsOf(index: number): [Vector3, Vector3] {
        if (this.hiddenInPlace(index)) {
            return [Vector3.Zero(), Vector3.Zero()];
        }

        const at = index * this.stride;

        return [Vector3.FromArray(this.slots, at + 3), Vector3.FromArray(this.slots, at + 6)];
    }

    /**
     * Where one end of the piece in a slot is, written into a vector the caller keeps, so a walk
     * over every slot allocates nothing.
     * @param index - The slot.
     * @param end - 0 for the piece's start, 1 for its end.
     * @param out - Where to write it.
     * @returns `out`.
     */
    protected pieceEndToRef(index: number, end: 0 | 1, out: Vector3): Vector3 {
        if (this.hiddenInPlace(index)) {
            return out.setAll(0);
        }

        return out.fromArray(this.slots, index * this.stride + (end === 0 ? 3 : 6));
    }

    /**
     * Upload what was written since the last upload: with ranged uploads off, in one call up to the
     * high-water mark (the arrays double, so uploading all of them would send as much again of slots
     * nothing draws), and with them on, one call per run of written slots.
     */
    flush(): void {
        // Babylon rebuilds a thin-instance buffer empty after a lost GL context (it keeps no copy
        // of data uploaded in part), so the first frame after one uploads every slot again.
        if (batchUploadFrames.isRestoring(this.mesh.getScene())) {
            this.slotRuns.whole();
            this.ageRuns.whole();
            this.hiddenRuns.whole();
            this.colorRuns.whole();
            if (this.statics !== null) {
                this.staticRuns.whole();
            }
        }

        if (this.gone) {
            return;
        }

        this.followAges();
        const { uploads } = this;
        if (this.ageRuns.dirty && this.ages !== null) {
            const runs = this.ageRuns.take(uploads.on);
            this.send(runs, this.ages, this.ageBuffer, 1);
        }

        if (this.staticRuns.dirty && this.statics !== null) {
            const runs = this.staticRuns.take(uploads.on);
            this.send(runs, this.statics, this.staticBuffer, EDGE_STATIC_FLOATS);
        }

        const shown = this.hiddenRuns.dirty;
        if (shown) {
            const runs = this.hiddenRuns.take(uploads.on);
            this.send(runs, this.hidden, this.hiddenBuffer, 1);
        }

        if (this.colorRuns.dirty && this.colors !== null) {
            const runs = this.colorRuns.take(uploads.on);
            this.send(runs, this.colors, this.colorBuffer, FLOATS_PER_COLOR);
        }

        const placed = this.slotRuns.dirty;
        if (placed) {
            const runs = this.slotRuns.take(uploads.on);
            if (this.buffer) {
                this.send(runs, this.slots, this.buffer, this.stride);
            } else {
                sendThinInstanceMatrices(this.mesh, runs);
            }
        }

        this.afterFlush(placed || shown);
    }

    /**
     * Run after each frame's upload; a shader batch takes or releases its frame claim here.
     * @param _placed - Whether a slot was placed, hidden or released since the last upload.
     */
    protected afterFlush(_placed: boolean): void {
        // A plain line has no motion of its own.
    }

    /**
     * A slot was handed back.
     * @param _index - The slot.
     */
    protected slotReleased(_index: number): void {
        // A plain line keeps nothing per slot beside the slot itself.
    }

    /**
     * Drop the mesh, its material, the buffer and the per-frame upload. Every slot in this batch
     * is now stale. The material goes too: every batch's line mesh is built with its own, and
     * `mesh.dispose()` alone would leave it in `scene.materials` after a clear.
     */
    dispose(): void {
        if (this.gone) {
            return;
        }

        this.gone = true;
        this.stopFlush();
        this.mesh.dispose(false, true);
        this.buffer?.dispose();
        this.buffer = null;
        this.staticBuffer?.dispose();
        this.staticBuffer = null;
        this.ageBuffer?.dispose();
        this.ageBuffer = null;
        this.hiddenBuffer?.dispose();
        this.hiddenBuffer = null;
        this.colorBuffer?.dispose();
        this.colorBuffer = null;
    }

    /**
     * Follow the scene's fade by age: switch the look when it is turned on or off, and rewrite every
     * slot's age when the scene's ages are new (an index build or merge). One comparison a frame
     * otherwise; a step moves only the uniform.
     */
    private followAges(): void {
        if (!this.ageable) {
            return;
        }

        const state = this.ageState;
        if (state.on !== this.agedTarget) {
            this.switchAges(state.on);
        }

        if (this.ages !== null && state.ages !== this.agesFrom) {
            this.agesFrom = state.ages;
            for (let slot = 0; slot < this.highWater; slot++) {
                this.ages[slot] = this.ageOf(this.owners[slot]);
            }

            this.ageRuns.whole();
        }
    }

    /**
     * Turn fading by age on or off. The ages are bound at once and the program compiled aside, so
     * the lines keep drawing in the old look until the new one is ready; then the material
     * switches, and the scene is told so the next frame re-reads what it draws.
     * @param on - Whether lines fade by age.
     */
    private switchAges(on: boolean): void {
        this.agedTarget = on;
        const turn = ++this.ageSwitches;
        if (on && this.ages === null) {
            this.ages = new Float32Array(this.slots.length / this.stride);
            this.agesFrom = null;
            this.bindAges();
        }

        this.ageState.warming++;
        CustomLineRenderer.warmAged(this.mesh, on).then(
            () => {
                this.ageState.warming--;
                if (this.gone || turn !== this.ageSwitches) {
                    return;
                }

                CustomLineRenderer.setAged(this.mesh, on, this.ageState);
                if (!on) {
                    this.ages = null;
                    this.agesFrom = null;
                    this.mesh.removeVerticesData("edgeAge");
                    this.ageBuffer?.dispose();
                    this.ageBuffer = null;
                }

                this.ageState.switched();
            },
            () => {
                this.ageState.warming--;
                // ponytail: a program that fails to compile leaves the lines in the old look, and
                // the batch does not try again until the setting changes twice.
            },
        );
    }

    /**
     * How old a slot's edge is: its start normalized over the data's extent.
     * @param owner - Who the slot draws.
     * @returns The age; the newest for a slot with no owner or no time.
     */
    private ageOf(owner: SlotOwner | undefined): number {
        const age = owner === undefined ? undefined : this.ageState.ages?.[owner.index];
        return age ?? UNTIMED_AGE;
    }

    /** Hand the ages to the mesh as their own attribute, sized to the slots' capacity. */
    private bindAges(): void {
        if (this.ages === null) {
            return;
        }

        this.ageBuffer?.dispose();
        const buffer = new Buffer(this.mesh.getEngine(), this.ages, true, 1, false, true);
        this.mesh.setVerticesBuffer(buffer.createVertexBuffer("edgeAge", 0, 1, 1, true));
        this.ageBuffer = buffer;
        this.ageRuns.whole();
    }

    /** Hand the hidden flags to the mesh as their own attribute, sized to the slots' capacity. */
    private bindHidden(): void {
        this.hiddenBuffer?.dispose();
        const buffer = new Buffer(this.mesh.getEngine(), this.hidden, true, 1, false, true);
        this.mesh.setVerticesBuffer(buffer.createVertexBuffer("edgeHidden", 0, 1, 1, true));
        this.hiddenBuffer = buffer;
    }

    /** Hand the colors to the mesh as their own attribute, sized to the slots' capacity. */
    private bindColors(): void {
        if (this.colors === null) {
            return;
        }

        this.colorBuffer?.dispose();
        const buffer = new Buffer(this.mesh.getEngine(), this.colors, true, FLOATS_PER_COLOR, false, true);
        this.mesh.setVerticesBuffer(
            buffer.createVertexBuffer("edgeColor", 0, FLOATS_PER_COLOR, FLOATS_PER_COLOR, true),
        );
        this.colorBuffer = buffer;
    }

    /**
     * Rows of colors for a number of slots, each the default, so a slot never taken draws in it
     * and taking one writes nothing.
     * @param count - The slots.
     * @returns The rows.
     */
    private colorRows(count: number): Float32Array {
        const rows = new Float32Array(count * FLOATS_PER_COLOR);
        for (let at = 0; at < rows.length; at += FLOATS_PER_COLOR) {
            rows.set(this.defaultColor ?? [], at);
        }

        return rows;
    }

    /**
     * Write one slot's color and note it for upload, keeping count of the translucent slots.
     * @param index - The slot.
     * @param rgba - Red, green, blue and the opacity.
     */
    private writeColor(index: number, rgba: ArrayLike<number>): void {
        const c = this.colors;
        if (c === null) {
            return;
        }

        const at = index * FLOATS_PER_COLOR;
        const was = c[at + 3] < 1;
        c.set(rgba, at);
        this.colorRuns.mark(index, this.uploads.on, this.highWater);
        const is = c[at + 3] < 1;
        if (was !== is) {
            this.countTranslucent(is ? 1 : -1);
        }
    }

    /**
     * Count a slot into or out of the translucent ones, and draw the batch in the pass they ask for.
     *
     * ONE BATCH, ONE PASS. Edges that differ only in color share a batch, but opaque and translucent
     * edges never do: the pass is in the batch's key (`EdgeMesh.lineBatch`). An opaque edge drawn in
     * the alpha-blended pass is drawn after the translucent edges its batch drew first, and the
     * depth they wrote hides it. While any slot is translucent the batch is drawn in the
     * alpha-blended pass; its mesh's visibility never takes its first edge's opacity, which at 0
     * would stop Babylon drawing the whole batch. A line drawn without blending (`line.blending`
     * false) is never translucent.
     * @param by - 1 for a slot that turned translucent, -1 for one that stopped.
     */
    private countTranslucent(by: number): void {
        if (this.opaque) {
            return;
        }

        this.translucent += by;
        const base = this.baseVisibility;
        this.mesh.visibility = this.translucent > 0 && base >= 1 ? TRANSPARENT_PASS : base;
    }

    /**
     * Send one buffer's rows to the GPU.
     *
     * A RUN IS A VIEW STARTING AT ITS OWN FIRST FLOAT, WITH ITS COUNT. Babylon's engines read the
     * source from the start of the array and apply the offset to the destination only, and without
     * a count a run at slot 0 would stay behind as `Buffer._data`, which a lost context rebuilds the
     * buffer from at the run's size.
     * @param runs - The runs to send, or null for every row up to the high-water mark.
     * @param rows - One row per slot.
     * @param buffer - The GPU buffer.
     * @param width - Floats in a row.
     */
    private send(runs: readonly number[] | null, rows: Float32Array, buffer: Buffer | null, width: number): void {
        if (runs === null) {
            buffer?.updateDirectly(rows, 0, this.highWater);
            return;
        }

        for (let i = 0; i < runs.length; i += 2) {
            const [at, end] = [runs[i], runs[i + 1]];
            buffer?.updateDirectly(rows.subarray(at * width, end * width), at * width, end - at);
        }
    }

    /**
     * The dash or dot spacing for an edge of one length: the centre-to-centre distance that puts
     * the first element at the start and the last at the end, as `PatternedLineMesh` places its
     * elements on a straight line. 0 for a solid line.
     * @param length - The edge's length along its pieces.
     * @returns The spacing.
     */
    private spacingFor(length: number): number {
        if (!this.pattern) {
            return 0;
        }

        const { elementLength, count, gap } = this.pattern;
        // a gap of the line's own repeats from the line's start, as a dash pattern does, the last element cut
        // where the line ends
        if (gap !== undefined && count === undefined) {
            return Math.max(elementLength + gap, 1e-6);
        }
        const n = discreteMeshCount(length, elementLength, count);
        // one element: the next would start past the line's end
        if (n < 2) {
            return 2 * (length + elementLength);
        }

        return Math.max((length - elementLength) / (n - 1), 1e-6);
    }

    /**
     * Write one slot from points held as vectors.
     * @param index - The slot.
     * @param prev - The corner before the piece, or its start for none.
     * @param a - Where the piece starts.
     * @param b - Where it ends.
     * @param next - The corner after it, or its end for none.
     * @param along - Where the piece is along the edge.
     * @param along.distance - How far along the edge the piece starts.
     * @param along.spacing - The pattern's spacing, 0 for a solid line.
     * @param along.total - The whole edge's length along its pieces, which a widened slot carries.
     */
    private write(
        index: number,
        prev: Vector3,
        a: Vector3,
        b: Vector3,
        next: Vector3,
        along: { readonly distance: number; readonly spacing: number; readonly total: number },
    ): void {
        const { distance, spacing, total } = along;
        this.forget(index);
        const at = index * this.stride;
        const s = this.slots;
        prev.toArray(s, at);
        a.toArray(s, at + 3);
        b.toArray(s, at + 6);
        next.toArray(s, at + 9);
        s[at + 12] = distance;
        s[at + 13] = spacing;
        prev.toArray(s, at + 14);
        next.toArray(s, at + 17);
        if (this.statics !== null) {
            s[at + 20] = total;
        }

        this.writeMatrix(index);
        this.slotRuns.mark(index, this.uploads.on, this.highWater);
    }

    /**
     * Write one piece of a run from points in a flat array. Its neighbours are the pieces either
     * side; the first piece's previous corner is its own start and the last's next corner its own
     * end, which the shader draws as a square end. The corner two pieces back is the previous
     * corner when there is none, and the corner two ahead the next corner. See
     * {@link EdgeLineBatch.write}.
     * @param index - The slot.
     * @param flat - The run's points.
     * @param piece - Which piece: from point `piece` to point `piece + 1`.
     * @param pieces - How many pieces the run has.
     * @param along - Where the piece is along the edge.
     * @param along.distance - How far along the edge the piece starts.
     * @param along.spacing - The pattern's spacing.
     * @param along.total - The whole edge's length along its pieces.
     */
    private writeFlat(
        index: number,
        flat: readonly number[],
        piece: number,
        pieces: number,
        along: { readonly distance: number; readonly spacing: number; readonly total: number },
    ): void {
        const { distance, spacing, total } = along;
        const prev = piece === 0 ? piece : piece - 1;
        const prev2 = piece < 2 ? prev : piece - 2;
        const next = piece === pieces - 1 ? piece + 1 : piece + 2;
        const next2 = piece >= pieces - 2 ? next : piece + 3;
        this.forget(index);
        const at = index * this.stride;
        const s = this.slots;
        for (let k = 0; k < 3; k++) {
            s[at + k] = flat[prev * 3 + k];
            s[at + 3 + k] = flat[piece * 3 + k];
            s[at + 6 + k] = flat[(piece + 1) * 3 + k];
            s[at + 9 + k] = flat[next * 3 + k];
            s[at + 14 + k] = flat[prev2 * 3 + k];
            s[at + 17 + k] = flat[next2 * 3 + k];
        }

        s[at + 12] = distance;
        s[at + 13] = spacing;
        if (this.statics !== null) {
            s[at + 20] = total;
        }

        this.writeMatrix(index);
        this.slotRuns.mark(index, this.uploads.on, this.highWater);
    }

    /**
     * For a batch drawn from thin-instance matrices, compose one slot's matrix from its two ends.
     * @param index - The slot.
     */
    private writeMatrix(index: number): void {
        if (!this.matrices) {
            return;
        }

        const at = index * this.stride;
        scratchA.fromArray(this.slots, at + 3);
        scratchB.fromArray(this.slots, at + 6);
        segmentMatrixToRef(scratchA, scratchB, scratchMatrix);
        scratchMatrix.copyToArray(this.matrices, index * FLOATS_PER_MATRIX);
    }

    /**
     * Collapse one slot to a point, which draws nothing.
     * @param index - The slot.
     */
    private hide(index: number): void {
        if (this.gone) {
            return;
        }

        this.forget(index);
        this.collapse(index);
    }

    /**
     * Zero one slot and note it for upload, parked or not.
     * @param index - The slot.
     */
    private collapse(index: number): void {
        this.slots.fill(0, index * this.stride, (index + 1) * this.stride);
        this.matrices?.fill(0, index * FLOATS_PER_MATRIX, (index + 1) * FLOATS_PER_MATRIX);
        this.slotRuns.mark(index, this.uploads.on, this.highWater);
    }

    /** Tell the mesh how many instances to draw. */
    private setCount(): void {
        if (this.matrices) {
            this.mesh.thinInstanceCount = this.highWater;
        } else {
            this.mesh.forcedInstanceCount = this.highWater;
        }
    }

    /**
     * Hand the slots to the mesh: as seven instanced attributes for a joined line, or as the
     * thin-instance matrix buffer otherwise. Called again after the arrays grow.
     */
    private bindBuffers(): void {
        if (this.matrices) {
            this.mesh.thinInstanceSetBuffer("matrix", this.matrices, FLOATS_PER_MATRIX, false);
        } else {
            this.buffer?.dispose();
            const { stride } = this;
            const buffer = new Buffer(this.mesh.getEngine(), this.slots, true, stride, false, true);
            this.mesh.setVerticesBuffer(buffer.createVertexBuffer("pPrev", 0, 3, stride, true));
            this.mesh.setVerticesBuffer(buffer.createVertexBuffer("pA", 3, 3, stride, true));
            this.mesh.setVerticesBuffer(buffer.createVertexBuffer("pB", 6, 3, stride, true));
            this.mesh.setVerticesBuffer(buffer.createVertexBuffer("pNext", 9, 3, stride, true));
            this.mesh.setVerticesBuffer(buffer.createVertexBuffer("run", 12, 2, stride, true));
            this.mesh.setVerticesBuffer(buffer.createVertexBuffer("pPrev2", 14, 3, stride, true));
            this.mesh.setVerticesBuffer(buffer.createVertexBuffer("pNext2", 17, 3, stride, true));
            this.buffer = buffer;
            if (this.statics !== null) {
                this.mesh.setVerticesBuffer(buffer.createVertexBuffer("runTotal", 20, 1, stride, true));
                this.staticBuffer?.dispose();
                const statics = new Buffer(this.mesh.getEngine(), this.statics, true, EDGE_STATIC_FLOATS, false, true);
                EDGE_STATIC_ATTRIBUTES.forEach((name, i) => {
                    this.mesh.setVerticesBuffer(statics.createVertexBuffer(name, i * 4, 4, EDGE_STATIC_FLOATS, true));
                });
                this.staticBuffer = statics;
            }

            this.bindAges();
            this.bindHidden();
            this.bindColors();
        }

        // Rebuilding the buffer resets the instance count, so the high-water mark is written back.
        this.setCount();
    }

    /** Double the arrays, keeping every slot where it is. */
    private grow(): void {
        const grown = new Float32Array(this.slots.length * 2);
        grown.set(this.slots);
        this.slots = grown;

        if (this.statics !== null) {
            const statics = new Float32Array(this.statics.length * 2);
            statics.set(this.statics);
            this.statics = statics;
        }

        const hidden = new Float32Array(this.hidden.length * 2);
        hidden.set(this.hidden);
        this.hidden = hidden;

        if (this.colors !== null) {
            const colors = this.colorRows((this.colors.length / FLOATS_PER_COLOR) * 2);
            colors.set(this.colors);
            this.colors = colors;
        }

        if (this.ages !== null) {
            const ages = new Float32Array(this.ages.length * 2);
            ages.set(this.ages);
            this.ages = ages;
        }

        if (this.matrices) {
            const matrices = new Float32Array(this.matrices.length * 2);
            matrices.set(this.matrices);
            this.matrices = matrices;
        }

        this.bindBuffers();
    }
}

/**
 * The length of one piece of a run of points.
 * @param flat - The points, flat x, y, z.
 * @param i - The piece: from point i to point i + 1.
 * @returns Its length.
 */
function pieceLength(flat: readonly number[], i: number): number {
    const x = flat[i * 3 + 3] - flat[i * 3];
    const y = flat[i * 3 + 4] - flat[i * 3 + 1];
    const z = flat[i * 3 + 5] - flat[i * 3 + 2];

    return Math.sqrt(x * x + y * y + z * z); // NOSONAR(S7769): per piece, per frame; Math.hypot is measurably slower
}
