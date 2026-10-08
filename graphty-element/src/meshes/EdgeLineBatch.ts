// Installs Mesh.prototype.thinInstanceSetBuffer and its siblings, which this module calls. Loaded
// here so any path that reaches a batch has them. See test/packaging/babylon-side-effects.test.ts.
import "@babylonjs/core/Meshes/thinInstanceMesh";

import { Matrix, type Mesh, Quaternion, type Scene, Vector3 } from "@babylonjs/core";

/** Floats in one 4x4 world matrix, which is what a thin-instance slot holds. */
const FLOATS_PER_SLOT = 16;

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
const flatSrc = new Vector3();
const flatDst = new Vector3();

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
 * Every edge line drawn with one appearance, as thin instances of a single mesh.
 *
 * WHAT THIS REPLACES. A 3D solid edge line used to be an `InstancedMesh` of a cached source
 * mesh: a scene object, an entry in `scene.meshes`, a node in the source's instance list and
 * about 12.7 KB of heap, per edge. A thin instance is sixteen floats in a shared array -- about
 * 240 bytes -- and the whole batch is one draw call and one scene object however many edges are
 * in it.
 *
 * MOVING ONE COSTS A WRITE AND NOTHING ELSE, which is the half of this that a note in
 * `EdgeMesh.createArrowHead` got wrong for two years: `thinInstanceSetMatrixAt` re-uploads the
 * WHOLE buffer unless it is told not to, so moving n instances one at a time is O(n^2) and
 * measured 42 seconds a frame at 20,000 edges. This class never calls it. It writes floats into
 * its own array and uploads once a frame, from {@link EdgeLineBatch.flush}, which measured 1.7 ms
 * for the same 20,000.
 */
export class EdgeLineBatch {
    /** The one mesh that draws every edge in this batch. */
    readonly mesh: Mesh;

    /** The world matrix of every slot, live or free, packed end to end. */
    private matrices: Float32Array;

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

    private readonly flushOnRender: () => void;

    /**
     * Whether every slot lies in the XY plane: a batch of 2D lines (`Simple2DLineRenderer`).
     *
     * A 2D LINE STAYS ON THE PLANE WHATEVER Z ITS ENDS CARRY. The rectangle spans local Y and Z,
     * and only a segment in the XY plane keeps local Y in that plane; given a Z the slot tilts, the
     * orthographic camera sees it foreshortened, and a line running along Y collapses to nothing.
     * The per-edge 2D mesh this batch replaced drew a rectangle in XY at the middle's Z, as long as
     * the XY distance between the ends, and a flat batch places its slots the same way.
     */
    private readonly flat: boolean;

    /**
     * Start a batch on one line mesh.
     * @param mesh - The line mesh to draw every edge in this batch from, at the origin and
     *     unrotated: a slot's matrix carries the placement, and this mesh's own world matrix is
     *     applied on top of it by the shader (which is how the batch follows `graph-root` under
     *     an XR gesture).
     * @param scene - The scene that renders it.
     * @param retire - Called when the last edge leaves this batch, so whoever holds it can forget
     *     it before it disposes itself. Defaults to doing nothing, for a batch nobody holds.
     */
    constructor(mesh: Mesh, scene: Scene, retire: () => void = (): void => undefined) {
        this.mesh = mesh;
        this.retire = retire;
        this.flat = (mesh.metadata as { is2DLine?: boolean } | null)?.is2DLine === true;
        this.matrices = new Float32Array(INITIAL_SLOTS * FLOATS_PER_SLOT);

        // An edge line was never a pick candidate and a batch of them is not one either. Picking
        // a thin instance also makes Babylon materialise and hold a Matrix object per instance,
        // which is the per-edge object this class exists to remove.
        mesh.isPickable = false;

        // The bounding box of a batch is meaningless -- it is the whole graph -- and recomputing
        // it walks every matrix, which would put the O(n) work back on every buffer change. The
        // line renderer already selects this mesh as active on every frame, because a line's box
        // is wrong anyway once the shader expands it in screen space.
        mesh.doNotSyncBoundingInfo = true;
        mesh.alwaysSelectAsActiveMesh = true;

        mesh.thinInstanceSetBuffer("matrix", this.matrices, FLOATS_PER_SLOT, false);
        mesh.thinInstanceCount = 0;

        // Follow the graph's own transform, so an XR pinch moves the lines with the nodes. Every
        // edge used to be parented here one mesh at a time; a batch is parented once and Babylon's
        // THIN_INSTANCES branch applies that transform to every slot in it. This was described in
        // `Edge.ts` before it was done: an endpoint is a node's position under `graph-root`, so
        // without the parent a gesture moved the nodes and left the lines where they were.
        const graphRoot = scene.getTransformNodeByName("graph-root");

        if (graphRoot) {
            mesh.parent = graphRoot;
        }

        // ONE UPLOAD PER FRAME, WHOEVER MOVED THE EDGES. Hanging the upload on the scene rather
        // than on the update loop means a render from anywhere -- the element's own frame, a
        // story that steps the graph by hand, a test that renders once -- draws what was written
        // for it, and still uploads once rather than once per edge.
        this.flushOnRender = (): void => {
            this.flush();
        };

        scene.onBeforeRenderObservable.add(this.flushOnRender);
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
     * Take a slot to draw one edge in.
     * @returns The slot's index, which the caller keeps until it releases it.
     */
    acquire(): number {
        this.live++;

        const recycled = this.free.pop();

        if (recycled !== undefined) {
            return recycled;
        }

        if (this.highWater === this.matrices.length / FLOATS_PER_SLOT) {
            this.grow();
        }

        const index = this.highWater;
        this.highWater++;
        this.mesh.thinInstanceCount = this.highWater;

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
     * Draw one slot's line between two points.
     * @param index - The slot.
     * @param srcPoint - Where the line starts.
     * @param dstPoint - Where the line ends.
     */
    place(index: number, srcPoint: Vector3, dstPoint: Vector3): void {
        if (this.gone) {
            return;
        }

        if (this.flat) {
            const z = (srcPoint.z + dstPoint.z) / 2;
            segmentMatrixToRef(
                flatSrc.set(srcPoint.x, srcPoint.y, z),
                flatDst.set(dstPoint.x, dstPoint.y, z),
                scratchMatrix,
            );
        } else {
            segmentMatrixToRef(srcPoint, dstPoint, scratchMatrix);
        }

        scratchMatrix.copyToArray(this.matrices, index * FLOATS_PER_SLOT);
        this.dirty = true;
    }

    /**
     * Draw or stop drawing one slot.
     *
     * Only the hiding half does anything. A zero matrix collapses the segment to a point, and the
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
     *
     * Read back out of the matrix rather than remembered, so there is nothing per edge to keep in
     * step with it. The z basis vector is the unit segment scaled by the line's length.
     * @param index - The slot.
     * @returns The length.
     */
    lengthOf(index: number): number {
        const at = index * FLOATS_PER_SLOT + 8;
        const x = this.matrices[at];
        const y = this.matrices[at + 1];
        const z = this.matrices[at + 2];

        return Math.sqrt(x * x + y * y + z * z); // NOSONAR(S7769): per edge, per frame; Math.hypot measured ~17x slower here
    }

    /**
     * Where the line in one slot is drawn, in world units: the middle of the segment.
     *
     * THE READING THAT USED TO BE `mesh.position`. An edge drawn as an instance of its own mesh
     * put the middle of its segment in that mesh's position, which is how a test asks "is this
     * edge drawn between the two ends the layout gave". A slot has no mesh, so the same number is
     * read back out of the matrix here -- it is the translation, written by
     * {@link segmentMatrixToRef}.
     * @param index - The slot.
     * @returns The middle of the drawn segment, as a fresh vector the caller may keep.
     */
    centreOf(index: number): Vector3 {
        const at = index * FLOATS_PER_SLOT + 12;

        return new Vector3(this.matrices[at], this.matrices[at + 1], this.matrices[at + 2]);
    }

    /**
     * Where the line in one slot starts and ends, read back out of its matrix: the unit segment
     * runs from -0.5 to 0.5 along the slot's z basis vector, about its translation.
     * @param index - The slot.
     * @returns The two ends, as fresh vectors the caller may keep.
     */
    endsOf(index: number): [Vector3, Vector3] {
        const at = index * FLOATS_PER_SLOT;
        const centre = this.centreOf(index);
        const half = new Vector3(this.matrices[at + 8], this.matrices[at + 9], this.matrices[at + 10]).scaleInPlace(
            0.5,
        );

        return [centre.subtract(half), centre.add(half)];
    }

    /** Upload everything written since the last upload, in one call. */
    flush(): void {
        if (!this.dirty || this.gone) {
            return;
        }

        this.dirty = false;
        this.mesh.thinInstanceBufferUpdated("matrix");
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
        this.mesh.getScene().onBeforeRenderObservable.removeCallback(this.flushOnRender);
        this.mesh.dispose(false, true);
    }

    /**
     * Collapse one slot to a point, which draws nothing.
     * @param index - The slot.
     */
    private hide(index: number): void {
        if (this.gone) {
            return;
        }

        this.matrices.fill(0, index * FLOATS_PER_SLOT, (index + 1) * FLOATS_PER_SLOT);
        this.dirty = true;
    }

    /** Double the buffer, keeping every slot where it is. */
    private grow(): void {
        const grown = new Float32Array(this.matrices.length * 2);
        grown.set(this.matrices);
        this.matrices = grown;

        // Rebuilding the vertex buffer resets the instance count to the whole capacity, so the
        // high-water mark is written back by the caller.
        this.mesh.thinInstanceSetBuffer("matrix", this.matrices, FLOATS_PER_SLOT, false);
    }
}
