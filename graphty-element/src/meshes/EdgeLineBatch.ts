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
    const flat = Math.sqrt(scratchDirection.x * scratchDirection.x + scratchDirection.z * scratchDirection.z);
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

    /** Whether a slot has been written since the last upload. */
    private dirty = false;

    private gone = false;

    private readonly flushOnRender: () => void;

    /**
     * Start a batch on one line mesh.
     * @param mesh - The line mesh to draw every edge in this batch from, at the origin and
     *     unrotated: a slot's matrix carries the placement, and this mesh's own world matrix is
     *     applied on top of it by the shader (which is how the batch follows `graph-root` under
     *     an XR gesture).
     * @param scene - The scene that renders it.
     */
    constructor(mesh: Mesh, scene: Scene) {
        this.mesh = mesh;
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

        segmentMatrixToRef(srcPoint, dstPoint, scratchMatrix);
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

        return Math.sqrt(x * x + y * y + z * z);
    }

    /** Upload everything written since the last upload, in one call. */
    flush(): void {
        if (!this.dirty || this.gone) {
            return;
        }

        this.dirty = false;
        this.mesh.thinInstanceBufferUpdated("matrix");
    }

    /** Drop the mesh, the buffer and the per-frame upload. Every slot in this batch is now stale. */
    dispose(): void {
        if (this.gone) {
            return;
        }

        this.gone = true;
        this.mesh.getScene().onBeforeRenderObservable.removeCallback(this.flushOnRender);
        this.mesh.dispose();
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
