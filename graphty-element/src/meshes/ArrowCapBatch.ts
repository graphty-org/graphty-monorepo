// Installs Mesh.prototype.thinInstanceSetBuffer and its siblings, which this module calls. Loaded
// here so any path that reaches a batch has them. See test/packaging/babylon-side-effects.test.ts.
import "@babylonjs/core/Meshes/thinInstanceMesh";

import { Color3, Matrix, type Mesh, Quaternion, type Scene, Vector3 } from "@babylonjs/core";

/** Floats in one 4x4 world matrix, which is what every slot holds. */
const FLOATS_PER_MATRIX = 16;

/** Slots a new batch starts with, before the first doubling. */
const INITIAL_SLOTS = 32;

/**
 * The per-instance values the billboard shader reads, and how many floats each takes.
 *
 * These are the three things that used to be uniforms on a cap's own ShaderMaterial, which is
 * why every cap needed a material of its own. As thin-instance buffers they are rows in three
 * shared arrays, so a red cap and a blue cap at two different sizes are one draw call.
 */
const BILLBOARD_BUFFERS = { arrowDirection: 3, arrowSize: 1, arrowColor: 3 } as const;

/** Scratch values for composing a slot's matrix; the placement path allocates nothing. */
const scratchScaling = new Vector3(1, 1, 1);
const scratchMatrix = new Matrix();
const scratchRotation = new Quaternion();

/** No turn at all, for the caps whose shape reads the same from every side. */
const NO_ROTATION = Quaternion.Identity();

/**
 * A quarter turn about X, which lifts a cap's geometry out of the XZ plane it is built in and
 * into the XY plane a 2D graph is drawn in.
 */
const INTO_XY_PLANE = Quaternion.RotationAxis(Vector3.Right(), Math.PI / 2);

/** The identity matrix, copied into a slot that only ever carries a translation. */
const IDENTITY = Matrix.Identity();

/** Every scene's cap batches, by the key that says what the caps in one have in common. */
const batchesByScene = new WeakMap<Scene, Map<string, ArrowCapBatch>>();

/**
 * Every arrow cap drawn with one appearance, as thin instances of a single mesh.
 *
 * WHAT THIS REPLACES. A cap used to be a `Mesh` with a `ShaderMaterial` of its own -- about
 * 23 KB of heap and a draw call per edge end -- and then, after the batching that pull request
 * 394 landed, an `InstancedMesh` of a shared source: one draw call for the batch, but still a
 * scene object, an entry in the source's instance list and roughly 2 KB per cap. A thin
 * instance is sixteen floats plus the seven the billboard shader reads. Nothing per cap is
 * added to a scene list, and an edge holds a slot index rather than an object.
 *
 * MOVING ONE COSTS A WRITE AND NOTHING ELSE. `thinInstanceSetMatrixAt` re-uploads the whole
 * buffer unless it is told not to, which is the API misuse behind the "thin instances are 35x
 * slower" note this renderer carried for two years. This class never calls it: it writes floats
 * into its own arrays and uploads once a frame, from {@link ArrowCapBatch.flush}.
 *
 * CAPS ARE NOT PICKABLE, deliberately. `thinInstanceEnablePicking` makes Babylon materialise and
 * hold a `Matrix` object per instance -- the exact per-edge object this class exists to remove --
 * and nothing in the element picks a cap: every `scene.pick` consumer reads
 * `pickedMesh.metadata.nodeId`, so a cap winning the pick against the node behind it was only
 * ever a way to lose a click.
 */
export class ArrowCapBatch {
    /** The one mesh that draws every cap in this batch. */
    readonly mesh: Mesh;

    /**
     * How wide a cap in this batch is drawn at scale 1, as `extendSizeWorld.length()` reads it.
     *
     * The reading a story used to take off each cap's own bounding box, kept here because the
     * caps no longer have one. See {@link ArrowCap.span}.
     */
    readonly unitSpan: number;

    /** The shape name the caps in this batch carry, which is the name their source mesh had. */
    readonly shape: string;

    /** Whether these caps are drawn flat in the XY plane rather than billboarded. */
    readonly is2D: boolean;

    /** Whether the shader reads each cap's direction, size and colour from a per-slot buffer. */
    readonly billboarded: boolean;

    private readonly key: string;

    /** The world matrix of every slot, live or free, packed end to end. */
    private matrices: Float32Array;

    /**
     * The billboard shader's per-instance values, or null for the batches drawn with a
     * StandardMaterial (2D caps and the 3D sphere-dot), which hold colour on the material.
     */
    private billboard: Record<keyof typeof BILLBOARD_BUFFERS, Float32Array> | null;

    /** Slots handed out so far. Slots at or past this index have never been used. */
    private highWater = 0;

    /** Slots handed back, ready to be handed out again. */
    private readonly free: number[] = [];

    /** Slots currently drawing a cap. The batch goes when this reaches zero. */
    private live = 0;

    /** Which buffers have been written since the last upload. */
    private readonly dirty = new Set<string>();

    private gone = false;

    private readonly flushOnRender: () => void;

    /**
     * Start a batch on one cap mesh.
     * @param mesh - The cap mesh every slot draws, in its normalized shape at the origin: a
     *     slot's matrix carries the placement and the scale, and this mesh's own world matrix is
     *     applied on top of it by the shader, which is how the batch follows `graph-root` under
     *     an XR gesture.
     * @param key - What the caps in this batch have in common.
     * @param scene - The scene that renders it.
     * @param billboard - Whether the caps read direction, size and colour per instance.
     */
    constructor(mesh: Mesh, key: string, scene: Scene, billboard: boolean) {
        this.mesh = mesh;
        this.key = key;
        this.shape = mesh.name;
        this.is2D = key.startsWith("2d|");
        this.billboarded = billboard;
        this.matrices = new Float32Array(INITIAL_SLOTS * FLOATS_PER_MATRIX);

        const { minimum, maximum, extendSize } = mesh.getBoundingInfo().boundingBox;
        // HOW WIDE ONE OF THESE CAPS READS, spelled the way the thing that draws it bounds it.
        // A billboarded cap is laid out on the GPU from its origin, so `applyShaderBoundingInfo`
        // gives it a cube whose half-extent is its furthest vertex; a StandardMaterial cap (2D,
        // and the sphere-dot) is drawn as its own geometry, so its box is the geometry's. Both
        // are then read as `extendSizeWorld.length()`, which is what a story measured off the
        // cap's own mesh before there was a batch.
        this.unitSpan = billboard ? Math.sqrt(3) * Math.max(minimum.length(), maximum.length()) : extendSize.length();

        // The source mesh only carries the batch and is never drawn itself. It takes a name that
        // does not say "arrow", so code that looks for caps by name does not find the carrier.
        mesh.name = `cap-batch|${key}`;
        mesh.isVisible = true;
        mesh.isPickable = false;

        // The bounding box of a batch is the whole graph, and recomputing it walks every matrix,
        // which would put O(edges) work back on every buffer change. A billboarded cap's box was
        // wrong anyway: the shader builds the cap's geometry from the camera, not from the box.
        mesh.doNotSyncBoundingInfo = true;
        mesh.alwaysSelectAsActiveMesh = true;

        mesh.thinInstanceSetBuffer("matrix", this.matrices, FLOATS_PER_MATRIX, false);
        mesh.thinInstanceCount = 0;

        this.billboard = null;

        if (billboard) {
            this.billboard = {
                arrowDirection: new Float32Array(INITIAL_SLOTS * BILLBOARD_BUFFERS.arrowDirection),
                arrowSize: new Float32Array(INITIAL_SLOTS * BILLBOARD_BUFFERS.arrowSize),
                arrowColor: new Float32Array(INITIAL_SLOTS * BILLBOARD_BUFFERS.arrowColor),
            };

            for (const [kind, stride] of Object.entries(BILLBOARD_BUFFERS)) {
                mesh.thinInstanceSetBuffer(kind, this.billboard[kind as keyof typeof BILLBOARD_BUFFERS], stride, false);
            }
        }

        // Follow the graph's own transform, so an XR pinch moves the caps with the nodes. One
        // parent for the whole batch, where each cap used to be parented on its own.
        const graphRoot = scene.getTransformNodeByName("graph-root");

        if (graphRoot) {
            mesh.parent = graphRoot;
        }

        // ONE UPLOAD PER FRAME, WHOEVER MOVED THE CAPS. Hanging the upload on the scene rather
        // than on the update loop means a render from anywhere -- the element's own frame, a
        // story that steps the graph by hand, a test that renders once -- draws what was written
        // for it, and still uploads once rather than once per cap.
        this.flushOnRender = (): void => {
            this.flush();
        };

        scene.onBeforeRenderObservable.add(this.flushOnRender);
    }

    /**
     * Whether this batch's mesh has been disposed, so every slot in it is stale.
     * @returns True once it is gone.
     */
    get disposed(): boolean {
        return this.gone;
    }

    /**
     * How see-through every cap in this batch is drawn.
     * @returns The opacity, which is what puts the batch in the alpha queue below 1.
     */
    get visibility(): number {
        return this.mesh.visibility;
    }

    /**
     * Take a slot to draw one cap in.
     * @returns The slot's index, which the caller keeps until it releases it.
     */
    acquire(): number {
        this.live++;

        const recycled = this.free.pop();
        const index = recycled ?? this.highWater;

        if (recycled === undefined) {
            if (this.highWater === this.matrices.length / FLOATS_PER_MATRIX) {
                this.grow();
            }

            this.highWater++;
            this.mesh.thinInstanceCount = this.highWater;
        }

        // A cap that only ever carries a translation -- every 3D cap, because the billboard
        // shader reads the camera rather than the slot's rotation -- gets its rotation and scale
        // from here once, and `placeAt` then writes three floats a frame.
        IDENTITY.copyToArray(this.matrices, index * FLOATS_PER_MATRIX);
        this.dirty.add("matrix");

        return index;
    }

    /**
     * Hand a slot back, and stop drawing it.
     *
     * ponytail: the free list never shrinks and the slots are never compacted, so a graph that
     * loses most of its caps keeps paying a vertex shader for the gaps. Compact when a profile
     * shows the high-water mark outgrowing the live cap count by more than about a third.
     * @param index - The slot.
     */
    release(index: number): void {
        if (this.gone) {
            return;
        }

        this.hide(index);
        this.free.push(index);
        this.live--;

        // The last cap takes the batch with it, so a cleared dataset leaves nothing in the scene.
        if (this.live === 0) {
            const byKey = batchesByScene.get(this.mesh.getScene());

            if (byKey?.get(this.key) === this) {
                byKey.delete(this.key);
            }

            this.dispose();
        }
    }

    /**
     * Give one slot the size and colour the billboard shader draws it at. A no-op on a batch
     * whose caps hold both on their material.
     * @param index - The slot.
     * @param size - The cap's length in world units.
     * @param colour - The cap's colour, as a hex string.
     */
    setAppearance(index: number, size: number, colour: string): void {
        if (this.gone || !this.billboard) {
            return;
        }

        this.billboard.arrowSize[index] = size;
        this.dirty.add("arrowSize");

        const rgb = Color3.FromHexString(colour);
        const at = index * BILLBOARD_BUFFERS.arrowColor;
        this.billboard.arrowColor[at] = rgb.r;
        this.billboard.arrowColor[at + 1] = rgb.g;
        this.billboard.arrowColor[at + 2] = rgb.b;
        this.dirty.add("arrowColor");
    }

    /**
     * Draw one slot's cap at a point, pointing along a line.
     *
     * The only placement a 3D cap needs. The billboard shader takes the cap's centre from the
     * matrix's translation and builds the rest of its frame from the direction and the camera,
     * so the slot's rotation and scale are never read -- which is why this writes three floats
     * and why the `lookAt` the old per-mesh path did here was already drawing nothing.
     * @param index - The slot.
     * @param position - Where the cap's centre sits.
     * @param direction - The line's direction, which the cap points along.
     */
    placeAt(index: number, position: Vector3, direction: Vector3 | null): void {
        if (this.gone) {
            return;
        }

        // The identity goes back first. A cap the visibility mask hid has a ZEROED matrix, and
        // a zero in the bottom right would drop the batch mesh's own translation out of
        // `world * slotMatrix` -- so placing a cap again has to restore the whole row, not only
        // the three numbers that moved.
        const at = index * FLOATS_PER_MATRIX;
        IDENTITY.copyToArray(this.matrices, at);
        this.matrices[at + 12] = position.x;
        this.matrices[at + 13] = position.y;
        this.matrices[at + 14] = position.z;
        this.dirty.add("matrix");

        if (direction && this.billboard) {
            const to = index * BILLBOARD_BUFFERS.arrowDirection;
            this.billboard.arrowDirection[to] = direction.x;
            this.billboard.arrowDirection[to + 1] = direction.y;
            this.billboard.arrowDirection[to + 2] = direction.z;
            this.dirty.add("arrowDirection");
        }
    }

    /**
     * Draw one slot's cap at a point, turned and scaled: what a 2D cap and the 3D sphere-dot
     * need, because both are drawn by a StandardMaterial that reads the slot's whole matrix.
     * @param index - The slot.
     * @param position - Where the cap sits.
     * @param rotation - How it is turned, or null to leave it unturned.
     * @param scale - How big it is drawn, as a uniform scale on its normalized geometry.
     */
    placeOriented(index: number, position: Vector3, rotation: Quaternion | null, scale: number): void {
        if (this.gone) {
            return;
        }

        scratchScaling.setAll(scale);
        Matrix.ComposeToRef(scratchScaling, rotation ?? NO_ROTATION, position, scratchMatrix);
        scratchMatrix.copyToArray(this.matrices, index * FLOATS_PER_MATRIX);
        this.dirty.add("matrix");
    }

    /**
     * Where the cap in one slot is drawn.
     *
     * Read back out of the matrix rather than remembered, so there is nothing per cap to keep in
     * step with it. This is what an arrow caption hangs from.
     * @param index - The slot.
     * @returns The cap's centre, as a fresh vector the caller may keep.
     */
    positionOf(index: number): Vector3 {
        const at = index * FLOATS_PER_MATRIX;

        return new Vector3(this.matrices[at + 12], this.matrices[at + 13], this.matrices[at + 14]);
    }

    /**
     * The billboard shader's three per-instance values for one slot.
     *
     * The direction it points along, the world-space length it is drawn at and its colour --
     * the three things that were uniforms on a cap's own material and are now rows in the
     * batch's own arrays. Null on a batch whose caps hold colour on a shared material.
     * @param index - The slot.
     * @returns What the shader reads for that slot, or null when it reads none of it.
     */
    appearanceOf(index: number): { direction: Vector3; size: number; colour: Color3 } | null {
        if (!this.billboard) {
            return null;
        }

        const at = index * BILLBOARD_BUFFERS.arrowDirection;
        const colourAt = index * BILLBOARD_BUFFERS.arrowColor;

        return {
            direction: new Vector3(
                this.billboard.arrowDirection[at],
                this.billboard.arrowDirection[at + 1],
                this.billboard.arrowDirection[at + 2],
            ),
            size: this.billboard.arrowSize[index],
            colour: new Color3(
                this.billboard.arrowColor[colourAt],
                this.billboard.arrowColor[colourAt + 1],
                this.billboard.arrowColor[colourAt + 2],
            ),
        };
    }

    /**
     * How one slot's cap is placed, turned and scaled.
     * @param index - The slot.
     * @returns The slot's matrix, as a fresh matrix the caller may keep.
     */
    matrixOf(index: number): Matrix {
        return Matrix.FromArray(this.matrices, index * FLOATS_PER_MATRIX);
    }

    /**
     * Stop drawing one slot.
     *
     * Only the hiding half does anything. A zero matrix collapses the cap to a point and the
     * shader draws no fragments for it; showing it again is left to the next placement, which
     * the visibility mask always asks for by invalidating the edge's cached endpoints.
     * @param index - The slot.
     * @param drawn - Whether the cap is on screen.
     */
    setDrawn(index: number, drawn: boolean): void {
        if (!drawn) {
            this.hide(index);
        }
    }

    /** Upload everything written since the last upload, one call per buffer that changed. */
    flush(): void {
        if (this.gone || this.dirty.size === 0) {
            return;
        }

        for (const kind of this.dirty) {
            this.mesh.thinInstanceBufferUpdated(kind);
        }

        this.dirty.clear();
    }

    /** Drop the mesh, the buffers and the per-frame upload. Every slot in this batch is now stale. */
    dispose(): void {
        if (this.gone) {
            return;
        }

        this.gone = true;
        this.mesh.getScene().onBeforeRenderObservable.removeCallback(this.flushOnRender);
        // Its material is this batch's own -- one for all its caps -- so it goes with it.
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

        this.matrices.fill(0, index * FLOATS_PER_MATRIX, (index + 1) * FLOATS_PER_MATRIX);
        this.dirty.add("matrix");
    }

    /** Double every buffer, keeping every slot where it is. */
    private grow(): void {
        const grown = new Float32Array(this.matrices.length * 2);
        grown.set(this.matrices);
        this.matrices = grown;
        this.mesh.thinInstanceSetBuffer("matrix", this.matrices, FLOATS_PER_MATRIX, false);

        if (!this.billboard) {
            return;
        }

        for (const [kind, stride] of Object.entries(BILLBOARD_BUFFERS)) {
            const name = kind as keyof typeof BILLBOARD_BUFFERS;
            const widened = new Float32Array(this.billboard[name].length * 2);
            widened.set(this.billboard[name]);
            this.billboard[name] = widened;
            this.mesh.thinInstanceSetBuffer(kind, widened, stride, false);
        }
    }
}

/**
 * One arrow cap: a slot in the batch that draws every cap of its appearance.
 *
 * WHAT AN EDGE HOLDS INSTEAD OF A MESH. Three fields -- the batch, the slot and the scale -- in
 * place of the `InstancedMesh` an edge end used to own, and every question the renderer asks of
 * a cap is answered off the batch.
 */
export class ArrowCap {
    private batch: ArrowCapBatch | null;

    private readonly slot: number;

    /**
     * How big this cap is drawn, as a uniform scale on its batch's normalized geometry.
     *
     * For a billboarded cap that scale IS its world-space length, which is what the shader's
     * `arrowSize` attribute carries; for the sphere-dot it is the sphere's drawn diameter.
     */
    readonly size: number;

    /**
     * Take a slot in a batch for one cap.
     * @param batch - The batch that draws it.
     * @param size - Its size, as a uniform scale on the batch's normalized geometry.
     */
    constructor(batch: ArrowCapBatch, size: number) {
        this.batch = batch;
        this.slot = batch.acquire();
        this.size = size;
    }

    /**
     * The shape this cap is drawn as.
     * @returns The name its own mesh used to carry, which its batch's mesh carries now.
     */
    get name(): string {
        return this.batch?.shape ?? "";
    }

    /**
     * Which of the two ways this cap is drawn.
     * @returns True when it is drawn flat in the XY plane rather than billboarded.
     */
    get is2D(): boolean {
        return this.batch?.is2D ?? false;
    }

    /**
     * How see-through this cap is drawn, which is its batch's, because opacity is part of a
     * batch's key.
     * @returns The visibility, 0 to 1.
     */
    get visibility(): number {
        return this.batch?.visibility ?? 0;
    }

    /**
     * How wide this cap is drawn, in world units.
     *
     * THE READING A STORY USED TO TAKE OFF THE CAP'S OWN BOUNDING BOX, which a cap no longer
     * has. Spelled the same way -- `extendSizeWorld.length()` of the drawn geometry -- so a
     * story that measured a cap before this change measures the same number now.
     * @returns The span.
     */
    get span(): number {
        return (this.batch?.unitSpan ?? 0) * this.size;
    }

    /**
     * Where this cap is drawn, which is what an arrow caption hangs from.
     * @returns Its centre, as a fresh vector the caller may keep.
     */
    get position(): Vector3 {
        return this.batch?.positionOf(this.slot) ?? Vector3.Zero();
    }

    /**
     * The mesh this cap is drawn by, which is its batch's and is shared with every other cap of
     * the same appearance -- so it carries their common material, and disposing it would take
     * all of them with it.
     * @returns The batch's mesh, or null once this cap has been given up.
     */
    get batchMesh(): Mesh | null {
        return this.batch?.mesh ?? null;
    }

    /**
     * What the billboard shader draws this cap with: the direction it points along, the length
     * it is drawn at and its colour. Null for a cap whose colour is on its batch's material.
     * @returns The three per-instance values, or null.
     */
    get drawnAppearance(): { direction: Vector3; size: number; colour: Color3 } | null {
        return this.batch?.appearanceOf(this.slot) ?? null;
    }

    /**
     * How this cap is placed, turned and scaled: the whole of what its slot holds.
     *
     * A billboarded cap carries only its centre here, because its shape is laid out on the GPU
     * from the camera and the line's direction; a 2D cap and the sphere-dot carry their turn and
     * their scale too.
     * @returns The slot's matrix, as a fresh matrix the caller may keep.
     */
    get transform(): Matrix {
        return this.batch?.matrixOf(this.slot) ?? Matrix.Identity();
    }

    /**
     * Put this cap where the edge says it goes, pointing along the line.
     *
     * ONE CALL FOR ALL THIRTEEN SHAPES IN BOTH MODES, where the mesh path had three blocks of
     * branches. A billboarded 3D cap is laid out on the GPU from its centre and the line's
     * direction, so only the translation and the direction are written and the slot's rotation
     * is never read -- which is why the `lookAt` the old path did for `open-dot` and `tee` was
     * already drawing nothing. A 2D cap and the 3D sphere-dot are drawn as their own geometry,
     * so they take a turn and a scale in the matrix.
     * @param position - Where the cap's centre sits.
     * @param direction - The line's direction at that end, pointing the way the cap points.
     */
    place(position: Vector3, direction: Vector3): void {
        if (!this.batch) {
            return;
        }

        if (this.batch.billboarded) {
            this.batch.placeAt(this.slot, position, direction);
            return;
        }

        if (this.batch.is2D) {
            this.place2D(position, Math.atan2(direction.y, direction.x));
            return;
        }

        this.batch.placeOriented(this.slot, position, null, this.size);
    }

    /**
     * Place this cap turned to face along a line in the XY plane: what a 2D cap takes.
     *
     * The geometry is in the XZ plane with its tip at the origin along +X, so it is first turned
     * a quarter turn about X into the XY plane and then about Z to the line's angle. Composed as
     * quaternions and in that order: with Euler angles in Babylon's YXZ order the X turn moves
     * the local Z axis onto world -Y, and the Z turn then spins the cap in the wrong plane.
     * @param position - Where the cap sits.
     * @param angle - The line's angle in the XY plane, in radians.
     */
    private place2D(position: Vector3, angle: number): void {
        Quaternion.RotationAxisToRef(Vector3.Forward(), angle, scratchRotation);
        // "Turn into the plane first, then along the line" composes as alongLine * intoPlane.
        scratchRotation.multiplyInPlace(INTO_XY_PLANE);
        this.batch?.placeOriented(this.slot, position, scratchRotation, this.size);
    }

    /**
     * Give this cap the size and colour the billboard shader draws it at.
     * @param size - Its length in world units.
     * @param colour - Its colour, as a hex string.
     */
    setAppearance(size: number, colour: string): void {
        this.batch?.setAppearance(this.slot, size, colour);
    }

    /**
     * Draw or stop drawing this cap.
     * @param drawn - Whether it is on screen.
     */
    setDrawn(drawn: boolean): void {
        this.batch?.setDrawn(this.slot, drawn);
    }

    /**
     * Whether anything still draws this cap.
     * @returns True once it has been given up, or its batch disposed under it.
     */
    isDisposed(): boolean {
        return this.batch === null || this.batch.disposed;
    }

    /** Give up this cap's slot. The batch goes with the last cap in it. */
    dispose(): void {
        this.batch?.release(this.slot);
        this.batch = null;
    }
}

/**
 * The batch that draws every cap of one appearance in one scene, built on first use.
 * @param scene - The scene the cap is drawn in.
 * @param key - What the caps in this batch have in common: the shape, and whatever else lives on
 *     the shared material rather than in a per-instance buffer.
 * @param build - Builds the batch's mesh, with its material, for a key the scene has not drawn.
 * @param billboard - Whether these caps read direction, size and colour per instance.
 * @returns The batch to take a slot in.
 */
export function arrowCapBatch(scene: Scene, key: string, build: () => Mesh, billboard: boolean): ArrowCapBatch {
    let byKey = batchesByScene.get(scene);

    if (!byKey) {
        byKey = new Map();
        batchesByScene.set(scene, byKey);
    }

    const existing = byKey.get(key);

    if (existing && !existing.disposed) {
        return existing;
    }

    const batch = new ArrowCapBatch(build(), key, scene, billboard);
    byKey.set(key, batch);

    return batch;
}
