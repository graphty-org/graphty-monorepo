// Installs Mesh.prototype.thinInstanceSetBuffer and its siblings, which this module calls. Loaded
// here so any path that reaches a batch has them. See test/packaging/babylon-side-effects.test.ts.
import "@babylonjs/core/Meshes/thinInstanceMesh";

import { Buffer, Matrix, type Mesh, Quaternion, type Scene, Vector3 } from "@babylonjs/core";

import { JOIN_FLOATS_PER_PIECE } from "./edgeJoinShader";
import { batchUploadFrames } from "./FrameRoster";
import { discreteMeshCount } from "./PatternedLineMesh";

/** Floats in one 4x4 world matrix, which is what a thin-instance slot holds. */
const FLOATS_PER_MATRIX = 16;

/** Floats in one slot: the piece and its neighbours (see `edgeJoinShader`). */
const FLOATS_PER_SLOT = JOIN_FLOATS_PER_PIECE;

/** Slots a new batch starts with, before the first doubling. */
const INITIAL_SLOTS = 32;

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
    /** A dashed or dotted line: which, its element's length along the line, and `line.patternCount`. */
    pattern?: { kind: "dash" | "dot"; elementLength: number; count?: number | undefined };
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

    /** Every slot, live or free, packed end to end: see {@link FLOATS_PER_SLOT}. */
    private slots: Float32Array;

    /** The thin-instance matrices of a batch that is not a joined line; null for a joined one. */
    private matrices: Float32Array | null;

    /** The GPU buffer a joined line's slots are read from, rebuilt when the batch grows. */
    private buffer: Buffer | null = null;

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

    /** Whether a slot has been written since the last upload. */
    private dirty = false;

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
        this.retire = retire;
        const meta = (mesh.metadata ?? {}) as EdgeLineMeta;
        this.pattern = meta.pattern;
        this.slots = new Float32Array(INITIAL_SLOTS * FLOATS_PER_SLOT);
        this.matrices = meta.joinedLine === true ? null : new Float32Array(INITIAL_SLOTS * FLOATS_PER_MATRIX);

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
     * Take a slot to draw one edge in.
     * @returns The slot's index, which the caller keeps until it releases it.
     */
    acquire(): number {
        this.live++;

        const recycled = this.free.pop();

        if (recycled !== undefined) {
            return recycled;
        }

        if (this.highWater === this.slots.length / FLOATS_PER_SLOT) {
            this.grow();
        }

        const index = this.highWater;
        this.highWater++;
        this.setCount();

        return index;
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
        this.free.push(index);
        this.live--;

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

        const spacing = this.spacingFor(Vector3.Distance(srcPoint, dstPoint));
        this.write(index, srcPoint, srcPoint, dstPoint, dstPoint, 0, spacing);
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
            this.writeFlat(slots[i], flat, i, pieces, distance, spacing);
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
     * shader draws no fragments for it; showing it again is left to the next placement, which the
     * visibility mask always asks for by invalidating the edge's cached endpoints.
     * @param index - The slot.
     * @param drawn - Whether the edge is on screen.
     */
    setDrawn(index: number, drawn: boolean): void {
        if (!drawn) {
            this.hide(index);
        }
    }

    /**
     * How long the line in one slot is drawn, in world units.
     * @param index - The slot.
     * @returns The length.
     */
    lengthOf(index: number): number {
        const at = index * FLOATS_PER_SLOT;
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
        const at = index * FLOATS_PER_SLOT;

        return [Vector3.FromArray(this.slots, at + 3), Vector3.FromArray(this.slots, at + 6)];
    }

    /** Upload everything written since the last upload, in one call. */
    flush(): void {
        // Babylon rebuilds a thin-instance buffer empty after a lost GL context (it keeps no copy
        // of data uploaded in part), so the first frame after one uploads every slot again.
        if (batchUploadFrames.isRestoring(this.mesh.getScene())) {
            this.dirty = true;
        }

        if (!this.dirty || this.gone) {
            return;
        }

        this.dirty = false;
        if (this.buffer) {
            this.buffer.update(this.slots);
        } else {
            this.mesh.thinInstanceBufferUpdated("matrix");
        }
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

        const { elementLength, count } = this.pattern;
        const n = discreteMeshCount(length, elementLength, count);

        return Math.max((length - elementLength) / (n - 1), 1e-6);
    }

    /**
     * Write one slot from points held as vectors.
     * @param index - The slot.
     * @param prev - The corner before the piece, or its start for none.
     * @param a - Where the piece starts.
     * @param b - Where it ends.
     * @param next - The corner after it, or its end for none.
     * @param distance - How far along the edge the piece starts.
     * @param spacing - The pattern's spacing, 0 for a solid line.
     */
    private write(
        index: number,
        prev: Vector3,
        a: Vector3,
        b: Vector3,
        next: Vector3,
        distance: number,
        spacing: number,
    ): void {
        const at = index * FLOATS_PER_SLOT;
        const s = this.slots;
        prev.toArray(s, at);
        a.toArray(s, at + 3);
        b.toArray(s, at + 6);
        next.toArray(s, at + 9);
        s[at + 12] = distance;
        s[at + 13] = spacing;
        this.writeMatrix(index);
        this.dirty = true;
    }

    /**
     * Write one piece of a run from points in a flat array. Its neighbours are the pieces either
     * side; the first piece's previous corner is its own start and the last's next corner its own
     * end, which the shader draws as a square end. See {@link EdgeLineBatch.write}.
     * @param index - The slot.
     * @param flat - The run's points.
     * @param piece - Which piece: from point `piece` to point `piece + 1`.
     * @param pieces - How many pieces the run has.
     * @param distance - How far along the edge the piece starts.
     * @param spacing - The pattern's spacing.
     */
    private writeFlat(
        index: number,
        flat: readonly number[],
        piece: number,
        pieces: number,
        distance: number,
        spacing: number,
    ): void {
        const prev = piece === 0 ? piece : piece - 1;
        const next = piece === pieces - 1 ? piece + 1 : piece + 2;
        const at = index * FLOATS_PER_SLOT;
        const s = this.slots;
        for (let k = 0; k < 3; k++) {
            s[at + k] = flat[prev * 3 + k];
            s[at + 3 + k] = flat[piece * 3 + k];
            s[at + 6 + k] = flat[(piece + 1) * 3 + k];
            s[at + 9 + k] = flat[next * 3 + k];
        }

        s[at + 12] = distance;
        s[at + 13] = spacing;
        this.writeMatrix(index);
        this.dirty = true;
    }

    /**
     * For a batch drawn from thin-instance matrices, compose one slot's matrix from its two ends.
     * @param index - The slot.
     */
    private writeMatrix(index: number): void {
        if (!this.matrices) {
            return;
        }

        const at = index * FLOATS_PER_SLOT;
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

        this.slots.fill(0, index * FLOATS_PER_SLOT, (index + 1) * FLOATS_PER_SLOT);
        this.matrices?.fill(0, index * FLOATS_PER_MATRIX, (index + 1) * FLOATS_PER_MATRIX);
        this.dirty = true;
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
     * Hand the slots to the mesh: as five instanced attributes for a joined line, or as the
     * thin-instance matrix buffer otherwise. Called again after the arrays grow.
     */
    private bindBuffers(): void {
        if (this.matrices) {
            this.mesh.thinInstanceSetBuffer("matrix", this.matrices, FLOATS_PER_MATRIX, false);
        } else {
            this.buffer?.dispose();
            const buffer = new Buffer(this.mesh.getEngine(), this.slots, true, FLOATS_PER_SLOT, false, true);
            this.mesh.setVerticesBuffer(buffer.createVertexBuffer("pPrev", 0, 3, FLOATS_PER_SLOT, true));
            this.mesh.setVerticesBuffer(buffer.createVertexBuffer("pA", 3, 3, FLOATS_PER_SLOT, true));
            this.mesh.setVerticesBuffer(buffer.createVertexBuffer("pB", 6, 3, FLOATS_PER_SLOT, true));
            this.mesh.setVerticesBuffer(buffer.createVertexBuffer("pNext", 9, 3, FLOATS_PER_SLOT, true));
            this.mesh.setVerticesBuffer(buffer.createVertexBuffer("run", 12, 2, FLOATS_PER_SLOT, true));
            this.buffer = buffer;
        }

        // Rebuilding the buffer resets the instance count, so the high-water mark is written back.
        this.setCount();
    }

    /** Double the arrays, keeping every slot where it is. */
    private grow(): void {
        const grown = new Float32Array(this.slots.length * 2);
        grown.set(this.slots);
        this.slots = grown;

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
