// Installs Mesh.prototype.thinInstanceSetBuffer and its siblings, which this module calls. Loaded
// here so any path that reaches a batch has them. See test/packaging/babylon-side-effects.test.ts.
import "@babylonjs/core/Meshes/thinInstanceMesh.js";

import { BoundingBox, Color3, Matrix, type Mesh, Quaternion, type Scene, Vector3 } from "@babylonjs/core";

import { DirtyRuns, sendThinInstanceMatrices } from "./DirtyRuns";
import { batchUploadFrames, type RangedUploads } from "./FrameRoster";
import { ParkedSlots } from "./ParkedSlots";

/** Floats in one 4x4 world matrix, which is what every slot holds. */
const FLOATS_PER_MATRIX = 16;

/** Slots a new batch starts with, before the first doubling. */
const INITIAL_SLOTS = 32;

/**
 * The per-instance values the billboard shader reads, and how many floats each takes.
 *
 * These are the things that used to be uniforms on a cap's own ShaderMaterial, which is why
 * every cap needed a material of its own. As thin-instance buffers they are rows in shared
 * arrays, so a red cap and a blue cap at two different sizes are one draw call. The fourth, the
 * clip, is only ever set on a pattern segment (see `PatternedLineMesh`); a cap is never clipped.
 * The fifth, the hidden flag, is 1 while the visibility mask hides the cap (`ArrowCapBatch.park`).
 * The colour carries the opacity in its fourth float, so caps of one shape share a batch whatever
 * their look and a restyle between two looks writes one row in place (issue #6026).
 */
const BILLBOARD_BUFFERS = { arrowDirection: 3, arrowSize: 1, arrowColor: 4, arrowClip: 1, arrowHidden: 1 } as const;

/**
 * What a billboarded batch's mesh is set to while any of its caps is translucent, which puts the
 * batch in the alpha-blended pass. The billboard shader never reads the mesh's visibility.
 */
const TRANSPARENT_PASS = 0.5;

/** One of the {@link BILLBOARD_BUFFERS}. */
type BillboardBuffer = keyof typeof BILLBOARD_BUFFERS;

/** The buffers of a batch with no per-slot billboard values, and of one with them. */
const MATRIX_ONLY = ["matrix"] as const;
const EVERY_BUFFER = ["matrix", ...(Object.keys(BILLBOARD_BUFFERS) as BillboardBuffer[])] as const;

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

/** Scratch: one row of a billboard buffer as the floats it is stored as, to compare before writing. */
const scratchRow = new Float32Array(4);

/**
 * Colour rows for a number of caps, opaque from a slot on, so a cap that is never given an
 * opacity of its own draws at its batch's (a zero alpha would draw nothing).
 * @param count - The caps.
 * @param from - The first slot made opaque; the ones before it are copied over by the caller.
 * @returns The rows.
 */
function opaqueRows(count: number, from: number): Float32Array {
    const stride = BILLBOARD_BUFFERS.arrowColor;
    const rows = new Float32Array(count * stride);
    for (let slot = from; slot < count; slot++) {
        rows[slot * stride + 3] = 1;
    }

    return rows;
}

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

    /** The shape name the caps in this batch carry, which is the name their source mesh had. */
    readonly shape: string;

    /** Whether these caps are drawn flat in the XY plane rather than billboarded. */
    readonly is2D: boolean;

    /** Whether the shader reads each cap's direction, size and colour from a per-slot buffer. */
    readonly billboarded: boolean;

    private readonly key: string;

    /** The half-diagonal of the cube a billboarded cap of scale 1 is bounded by. */
    private readonly unitCubeSpan: number;

    /** The corners of the geometry every cap in this batch is drawn from, before its slot. */
    private readonly localMin: Vector3;

    private readonly localMax: Vector3;

    /** Scratch, for measuring one slot's drawn extent. */
    private readonly scratchBox = new BoundingBox(Vector3.Zero(), Vector3.Zero());

    /** The world matrix of every slot, live or free, packed end to end. */
    private matrices: Float32Array;

    /**
     * What the caps the visibility mask hid held, so showing one puts it back (see {@link ParkedSlots}):
     * only for a batch drawn with a StandardMaterial. A billboarded batch hides a cap with its
     * `arrowHidden` flag instead and keeps its matrix where it is (issue #6025).
     */
    private readonly parking: ParkedSlots | null;

    /**
     * The billboard shader's per-instance values, or null for the batches drawn with a
     * StandardMaterial (2D caps and the 3D sphere-dot), which hold colour on the material.
     */
    private billboard: Record<BillboardBuffer, Float32Array> | null;

    /** The visibility the batch's mesh was built with: the opacity its material holds for every cap. */
    private readonly baseVisibility: number;

    /** Caps in use drawn at an opacity of their own under 1, which put the batch in the transparent pass. */
    private translucent = 0;

    /** Slots handed out so far. Slots at or past this index have never been used. */
    private highWater = 0;

    /** Slots handed back, ready to be handed out again. */
    private readonly free: number[] = [];

    /** Slots currently drawing a cap. The batch goes when this reaches zero. */
    private live = 0;

    /** Which slots of each buffer have been written since the last upload. */
    private readonly runs: Record<"matrix" | BillboardBuffer, DirtyRuns> = {
        matrix: new DirtyRuns(),
        arrowDirection: new DirtyRuns(),
        arrowSize: new DirtyRuns(),
        arrowColor: new DirtyRuns(),
        arrowClip: new DirtyRuns(),
        arrowHidden: new DirtyRuns(),
    };

    /** The scene's switch for uploading only what was written; see {@link batchUploadFrames}. */
    private readonly uploads: RangedUploads;

    private gone = false;

    /** Ends this batch's per-frame upload; see {@link batchUploadFrames}. */
    private readonly stopFlush: () => void;

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
        this.baseVisibility = mesh.visibility;
        this.parking = billboard ? null : new ParkedSlots(FLOATS_PER_MATRIX);
        this.uploads = batchUploadFrames.rangedUploads(scene);
        this.matrices = new Float32Array(INITIAL_SLOTS * FLOATS_PER_MATRIX);

        const { minimum, maximum } = mesh.getBoundingInfo().boundingBox;
        this.localMin = minimum.clone();
        this.localMax = maximum.clone();
        // HOW WIDE ONE OF THESE CAPS READS AT SCALE 1, for a billboarded cap. It is laid out on
        // the GPU from its own origin, so `applyShaderBoundingInfo` gave it a cube whose
        // half-extent is its furthest vertex, and a cube reads the same whichever way the cap is
        // turned. A StandardMaterial cap does not: it is drawn as its own geometry, so its world
        // box depends on the turn in its slot, and `spanOf` measures that instead.
        this.unitCubeSpan = Math.sqrt(3) * Math.max(minimum.length(), maximum.length());

        // The source mesh only carries the batch and is never drawn itself. It takes a name that
        // does not say "arrow", so code that looks for caps by name does not find the carrier.
        mesh.name = `cap-batch|${key}`;
        mesh.isVisible = true;
        mesh.isPickable = false;

        // THE CARRIER HOLDS NO TRANSFORM OF ITS OWN, which is what this constructor promises when
        // it asks for the shape "normalized at the origin": every slot's matrix is multiplied by
        // the carrier's world matrix, so anything left on the carrier is applied to every cap in
        // the batch at once. A 2D cap arrives with one: `MaterialHelper.apply2DMaterial` turns
        // the mesh it is given a quarter turn about X to stand it up in the XY plane, which was
        // right when that mesh WAS the cap and is wrong now that it is the carrier -- it tipped
        // all thirteen 2D cap shapes edge-on to the camera, so the caps were placed, enabled and
        // drawn and covered almost no pixels. Clearing it here rather than at that one call site
        // holds the contract for every caller, 2D and 3D alike, where a 3D shape is built at the
        // origin already and this is a no-op. The graph's own transform still reaches the caps:
        // it comes from the `graph-root` parent set below, not from the carrier's local matrix.
        mesh.position.setAll(0);
        mesh.rotation.setAll(0);
        mesh.rotationQuaternion = null;
        mesh.scaling.setAll(1);

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
                arrowColor: opaqueRows(INITIAL_SLOTS, 0),
                arrowClip: new Float32Array(INITIAL_SLOTS * BILLBOARD_BUFFERS.arrowClip),
                arrowHidden: new Float32Array(INITIAL_SLOTS * BILLBOARD_BUFFERS.arrowHidden),
            };

            for (const [kind, stride] of Object.entries(BILLBOARD_BUFFERS)) {
                mesh.thinInstanceSetBuffer(kind, this.billboard[kind as BillboardBuffer], stride, false);
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
        this.stopFlush = batchUploadFrames.join(scene, () => {
            this.flush();
        });
    }

    /**
     * Whether this batch's mesh has been disposed, so every slot in it is stale.
     * @returns True once it is gone.
     */
    get disposed(): boolean {
        // The mesh's own state as well as this batch's, because a scene teardown disposes the
        // mesh without anything here being told: an edge that then asks its cap whether it is
        // still drawn would otherwise be told yes.
        return this.gone || this.mesh.isDisposed();
    }

    /**
     * How see-through one cap is drawn: the batch's opacity times the cap's own.
     * @param index - The slot.
     * @param own - The cap's own opacity as it was given, read in place of the float its slot holds.
     * @returns The opacity, 0 to 1.
     */
    visibilityOf(index: number, own?: number): number {
        if (this.billboard === null) {
            return this.mesh.visibility;
        }

        return this.baseVisibility * (own ?? this.billboard.arrowColor[index * BILLBOARD_BUFFERS.arrowColor + 3]);
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
        this.forget(index);
        IDENTITY.copyToArray(this.matrices, index * FLOATS_PER_MATRIX);
        this.written("matrix", index);

        // Unclipped. A zero here would cut the shape off at its own origin. Opaque, until the cap
        // is given its look: a zero alpha would draw nothing.
        if (this.billboard) {
            this.billboard.arrowClip[index] = -1;
            this.written("arrowClip", index);
            // Live again at the opacity it last held (a new slot is opaque); its look comes next.
            if (this.billboard.arrowColor[index * BILLBOARD_BUFFERS.arrowColor + 3] < 1) {
                this.countTranslucent(1);
            }
        }

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
        // A free slot draws nothing and counts for no pass. It keeps its opacity, as the GPU does,
        // until `acquire` takes it again.
        if (this.billboard !== null && this.billboard.arrowColor[index * BILLBOARD_BUFFERS.arrowColor + 3] < 1) {
            this.countTranslucent(-1);
        }

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
     * Give one slot the length the billboard shader draws it at, keeping its colour. A no-op on a
     * batch whose caps hold their size in their matrix.
     * @param index - The slot.
     * @param size - The cap's length in world units.
     */
    setBillboardSize(index: number, size: number): void {
        if (this.gone || !this.billboard) {
            return;
        }

        this.billboard.arrowSize[index] = size;
        this.written("arrowSize", index);
    }

    /**
     * Give one slot the size, colour and opacity the billboard shader draws it at, writing only
     * what changed. A no-op on a batch whose caps hold them on their material.
     * @param index - The slot.
     * @param size - The cap's length in world units.
     * @param colour - The cap's colour, as a hex string.
     * @param opacity - The cap's own opacity, multiplying the batch's.
     */
    setAppearance(index: number, size: number, colour: string, opacity = 1): void {
        const { billboard } = this;
        if (this.gone || !billboard) {
            return;
        }

        scratchRow[0] = size;
        if (billboard.arrowSize[index] !== scratchRow[0]) {
            billboard.arrowSize[index] = size;
            this.written("arrowSize", index);
        }

        const rgb = Color3.FromHexString(colour);
        const at = index * BILLBOARD_BUFFERS.arrowColor;
        const colours = billboard.arrowColor;
        scratchRow[0] = rgb.r;
        scratchRow[1] = rgb.g;
        scratchRow[2] = rgb.b;
        if (colours[at] !== scratchRow[0] || colours[at + 1] !== scratchRow[1] || colours[at + 2] !== scratchRow[2]) {
            colours.set(scratchRow.subarray(0, 3), at);
            this.written("arrowColor", index);
        }

        this.setOpacity(index, opacity);
    }

    /**
     * Give one billboarded slot its own opacity, keeping count of the translucent caps.
     * @param index - The slot.
     * @param opacity - The opacity, 0 to 1.
     */
    private setOpacity(index: number, opacity: number): void {
        if (this.billboard === null) {
            return;
        }

        const at = index * BILLBOARD_BUFFERS.arrowColor + 3;
        const colours = this.billboard.arrowColor;
        scratchRow[3] = opacity;
        if (colours[at] === scratchRow[3]) {
            return;
        }

        const was = colours[at] < 1;
        colours[at] = opacity;
        this.written("arrowColor", index);
        const is = colours[at] < 1;
        if (was !== is) {
            this.countTranslucent(is ? 1 : -1);
        }
    }

    /**
     * Count a cap into or out of the translucent ones, and draw the batch in the pass they ask for:
     * the alpha-blended one while any cap is translucent, as a batch of translucent caps always
     * was, or the one its material's own opacity asks for (`baseVisibility`).
     * @param by - 1 for a cap that turned translucent, -1 for one that stopped.
     */
    private countTranslucent(by: number): void {
        this.translucent += by;
        const base = this.baseVisibility;
        this.mesh.visibility = this.translucent > 0 && base >= 1 ? TRANSPARENT_PASS : base;
    }

    /**
     * Draw one slot where a slot of another batch is drawn: its matrix, and its direction, length
     * and cut, copied rather than placed again. Its colour stays its own.
     * @param index - The slot.
     * @param from - The batch the other slot is in.
     * @param fromIndex - The other slot.
     * @returns False, copying nothing, when the two batches draw their caps differently.
     */
    copyPlacement(index: number, from: ArrowCapBatch, fromIndex: number): boolean {
        if (this.gone || from.gone || from.billboarded !== this.billboarded || from.is2D !== this.is2D) {
            return false;
        }

        // A slot the visibility mask parked stays parked, holding the placement it will be shown at.
        this.matrices.set(from.placementOf(fromIndex), index * FLOATS_PER_MATRIX);
        this.written("matrix", index);
        if (from.isParked(fromIndex)) {
            this.park(index);
        }
        if (this.billboard !== null && from.billboard !== null) {
            for (const kind of ["arrowDirection", "arrowSize", "arrowClip"] as const) {
                const stride = BILLBOARD_BUFFERS[kind];
                this.billboard[kind].set(
                    from.billboard[kind].subarray(fromIndex * stride, (fromIndex + 1) * stride),
                    index * stride,
                );
                this.written(kind, index);
            }
        }

        return true;
    }

    /**
     * Cut one slot's shape off past a point along its own X axis, or stop cutting it. A no-op on a
     * batch whose shapes hold nothing per instance.
     * @param index - The slot.
     * @param clipX - Where to cut, in the shape's own units, or -1 to draw it whole.
     */
    setClip(index: number, clipX: number): void {
        if (this.gone || !this.billboard || this.billboard.arrowClip[index] === clipX) {
            return;
        }

        this.billboard.arrowClip[index] = clipX;
        this.written("arrowClip", index);
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
        this.forget(index);
        const at = index * FLOATS_PER_MATRIX;
        IDENTITY.copyToArray(this.matrices, at);
        this.matrices[at + 12] = position.x;
        this.matrices[at + 13] = position.y;
        this.matrices[at + 14] = position.z;
        this.written("matrix", index);

        if (direction && this.billboard) {
            const to = index * BILLBOARD_BUFFERS.arrowDirection;
            this.billboard.arrowDirection[to] = direction.x;
            this.billboard.arrowDirection[to + 1] = direction.y;
            this.billboard.arrowDirection[to + 2] = direction.z;
            this.written("arrowDirection", index);
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

        this.forget(index);
        scratchScaling.setAll(scale);
        Matrix.ComposeToRef(scratchScaling, rotation ?? NO_ROTATION, position, scratchMatrix);
        scratchMatrix.copyToArray(this.matrices, index * FLOATS_PER_MATRIX);
        this.written("matrix", index);
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
        if (this.hiddenInPlace(index)) {
            return Vector3.Zero();
        }

        const at = index * FLOATS_PER_MATRIX;

        return new Vector3(this.matrices[at + 12], this.matrices[at + 13], this.matrices[at + 14]);
    }

    /**
     * How wide the cap in one slot is drawn, in world units.
     *
     * THE READING A STORY USED TO TAKE OFF THE CAP'S OWN BOUNDING BOX, and the same number. A
     * billboarded cap's box is a cube, so its span is its scale times the unit cube's; every
     * other cap is drawn as its own geometry turned and scaled by its slot, so its span is the
     * world box of that geometry under the slot's matrix -- the arithmetic Babylon itself did
     * when a cap was a mesh with a world matrix. A 2D cap's span therefore still moves with the
     * angle of the edge it caps, which is what a picture digest reads it for: two layouts that
     * point the same edges different ways draw different pictures, and nothing else in the
     * digest can see it.
     * @param index - The slot.
     * @param size - The cap's scale, which a billboarded cap does not keep in its matrix.
     * @returns The span.
     */
    spanOf(index: number, size: number): number {
        if (this.billboarded) {
            return this.unitCubeSpan * size;
        }

        this.scratchBox.reConstruct(this.localMin, this.localMax, this.matrixOf(index));

        return this.scratchBox.extendSizeWorld.length();
    }

    /**
     * The billboard shader's three per-instance values for one slot.
     *
     * The direction it points along, the world-space length it is drawn at and its colour --
     * the three things that were uniforms on a cap's own material and are now rows in the
     * batch's own arrays -- plus where a pattern segment is cut off, -1 for drawn whole. Null on
     * a batch whose caps hold colour on a shared material.
     * @param index - The slot.
     * @returns What the shader reads for that slot, or null when it reads none of it.
     */
    appearanceOf(index: number): { direction: Vector3; size: number; colour: Color3; clip: number } | null {
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
            clip: this.billboard.arrowClip[index],
        };
    }

    /**
     * How one slot's cap is placed, turned and scaled.
     * @param index - The slot.
     * @returns The slot's matrix, as a fresh matrix the caller may keep.
     */
    matrixOf(index: number): Matrix {
        if (this.hiddenInPlace(index)) {
            return Matrix.FromArray(new Float32Array(FLOATS_PER_MATRIX));
        }

        return Matrix.FromArray(this.matrices, index * FLOATS_PER_MATRIX);
    }

    /**
     * Stop drawing one slot.
     *
     * Only the hiding half does anything. A zero matrix collapses the cap to a point and the
     * shader draws no fragments for it -- the billboard shader reads the zero in the matrix's
     * bottom right as "hidden", because it builds a cap from its centre and its size rather than
     * from the matrix, and would otherwise draw it full size at the origin; showing it again is left to the next placement. The
     * visibility mask hides with {@link ArrowCapBatch.park} instead, which can put the slot back.
     * @param index - The slot.
     * @param drawn - Whether the cap is on screen.
     */
    setDrawn(index: number, drawn: boolean): void {
        if (!drawn) {
            this.hide(index);
        }
    }

    /**
     * Stop drawing one slot because the visibility mask hid its edge, keeping its matrix so
     * {@link ArrowCapBatch.unpark} can put it back. See {@link ParkedSlots}.
     * @param index - The slot.
     */
    park(index: number): void {
        if (this.gone) {
            return;
        }

        if (this.parking !== null) {
            this.parking.park(this.matrices, index);
            this.collapse(index);
        } else if (this.billboard !== null && this.billboard.arrowHidden[index] !== 1) {
            this.billboard.arrowHidden[index] = 1;
            this.written("arrowHidden", index);
        }
    }

    /**
     * Draw a parked slot again as it was when it was parked.
     * @param index - The slot.
     * @returns True when it was put back; false when it was not parked (or was written since).
     */
    unpark(index: number): boolean {
        if (this.gone) {
            return false;
        }

        if (this.parking === null) {
            if (this.billboard?.arrowHidden[index] !== 1) {
                return false;
            }

            this.billboard.arrowHidden[index] = 0;
            this.written("arrowHidden", index);
            return true;
        }

        if (!this.parking.unpark(this.matrices, index)) {
            return false;
        }

        this.written("matrix", index);
        return true;
    }

    /**
     * Whether the visibility mask hides a slot, its placement kept for {@link ArrowCapBatch.unpark}.
     * @param index - The slot.
     * @returns True while it is parked.
     */
    isParked(index: number): boolean {
        return this.parking === null ? this.hiddenInPlace(index) : this.parking.isParked(index);
    }

    /**
     * What a slot's matrix is when it is shown: its placement, parked or not.
     * @param index - The slot.
     * @returns A view of its floats; copy it before the batch is written.
     */
    private placementOf(index: number): Float32Array {
        if (this.parking !== null) {
            return this.parking.placementOf(this.matrices, index);
        }

        const at = index * FLOATS_PER_MATRIX;
        return this.matrices.subarray(at, at + FLOATS_PER_MATRIX);
    }

    /**
     * Whether a slot keeps its matrix while the shader draws nothing for it, so a read of where it
     * is drawn reads a zero matrix, as it does for a collapsed slot.
     * @param index - The slot.
     * @returns True for a parked billboarded cap.
     */
    private hiddenInPlace(index: number): boolean {
        return this.billboard?.arrowHidden[index] === 1;
    }

    /**
     * Forget that a slot is parked: something else wrote it.
     * @param index - The slot.
     */
    private forget(index: number): void {
        if (this.parking !== null) {
            this.parking.forget(index);
        } else if (this.billboard !== null && this.billboard.arrowHidden[index] !== 0) {
            this.billboard.arrowHidden[index] = 0;
            this.written("arrowHidden", index);
        }
    }

    /** Upload everything written since the last upload: per buffer, whole or by runs of slots. */
    flush(): void {
        const kinds = this.billboard ? EVERY_BUFFER : MATRIX_ONLY;
        // Babylon rebuilds a thin-instance buffer empty after a lost GL context (it keeps no copy
        // of data uploaded in part), so the first frame after one uploads every buffer again.
        if (batchUploadFrames.isRestoring(this.mesh.getScene())) {
            for (const kind of kinds) {
                this.runs[kind].whole();
            }
        }

        if (this.gone) {
            return;
        }

        for (const kind of kinds) {
            if (!this.runs[kind].dirty) {
                continue;
            }

            const runs = this.runs[kind].take(this.uploads.on);
            if (kind === "matrix") {
                sendThinInstanceMatrices(this.mesh, runs);
            } else {
                this.sendBillboard(kind, runs);
            }
        }
    }

    /** Drop the mesh, the buffers and the per-frame upload. Every slot in this batch is now stale. */
    dispose(): void {
        if (this.gone) {
            return;
        }

        this.gone = true;
        this.stopFlush();
        // Its material is this batch's own -- one for all its caps -- so it goes with it.
        this.mesh.dispose(false, true);
    }

    /**
     * Note a write to one buffer.
     * @param kind - The buffer.
     * @param index - The slot.
     */
    private written(kind: "matrix" | BillboardBuffer, index: number): void {
        this.runs[kind].mark(index, this.uploads.on, this.highWater);
    }

    /**
     * Send one billboard buffer to the GPU. A run is a view starting at its own first float, since
     * the engines read the source from its start and apply the offset to the destination only.
     * @param kind - The buffer.
     * @param runs - The runs to send, or null for every slot up to the high-water mark.
     */
    private sendBillboard(kind: BillboardBuffer, runs: readonly number[] | null): void {
        const data = this.billboard?.[kind];
        const buffer = this.mesh.getVertexBuffer(kind)?.getWrapperBuffer();
        if (data === undefined || buffer === undefined) {
            return;
        }

        if (runs === null) {
            buffer.updateDirectly(data, 0, this.highWater);
            return;
        }

        const width = BILLBOARD_BUFFERS[kind];
        for (let i = 0; i < runs.length; i += 2) {
            const [at, end] = [runs[i], runs[i + 1]];
            buffer.updateDirectly(data.subarray(at * width, end * width), at * width, end - at);
        }
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
     * Zero one slot's matrix and note it for upload, parked or not.
     * @param index - The slot.
     */
    private collapse(index: number): void {
        this.matrices.fill(0, index * FLOATS_PER_MATRIX, (index + 1) * FLOATS_PER_MATRIX);
        this.written("matrix", index);
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
            const name = kind as BillboardBuffer;
            const widened =
                name === "arrowColor"
                    ? opaqueRows((this.billboard[name].length / stride) * 2, this.billboard[name].length / stride)
                    : new Float32Array(this.billboard[name].length * 2);
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
     * How much larger or smaller than its size the cap is drawn, as its node is (a node kept one
     * size on screen, or drawn at one depth's size): 1 unless {@link setScale} said otherwise.
     */
    private scale = 1;

    /** The opacity of its own the billboard shader was last given for this cap. */
    private opacity = 1;

    /** The length the billboard shader was given at scale 1, or null before it was given one. */
    private billboardLength: number | null = null;

    /**
     * Take a slot in a batch for one cap.
     * @param batch - The batch that draws it.
     * @param size - Its size, as a uniform scale on the batch's normalized geometry.
     */
    constructor(batch: ArrowCapBatch, size: number) {
        this.batch = batch;
        this.slot = batch.acquire();
        this.size = size;

        // A cap drawn as its own geometry keeps its scale in its slot, so the slot carries it
        // from the moment the cap exists -- as `instance.scaling` did when a cap was a mesh, and
        // for the same reason: how big a cap is drawn is a fact about it before anything has
        // asked where it goes.
        if (!batch.billboarded) {
            batch.placeOriented(this.slot, Vector3.Zero(), null, size);
        }
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
     * How see-through this cap is drawn: its batch's opacity times its own.
     * @returns The visibility, 0 to 1.
     */
    get visibility(): number {
        const { batch } = this;
        if (batch === null) {
            return 0;
        }

        // A billboarded cap's own opacity as it was given, not as the 32-bit float its slot holds.
        return batch.billboarded ? batch.visibilityOf(this.slot, this.opacity) : batch.visibilityOf(this.slot);
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
        return this.batch?.spanOf(this.slot, this.size * this.scale) ?? 0;
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
     * it is drawn at, its colour and where it is cut off (-1 for whole). Null for a cap whose
     * colour is on its batch's material.
     * @returns The per-instance values, or null.
     */
    get drawnAppearance(): { direction: Vector3; size: number; colour: Color3; clip: number } | null {
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

        this.batch.placeOriented(this.slot, position, null, this.size * this.scale);
    }

    /**
     * Draw this cap larger or smaller than its size, as the node it stands on is drawn; the next
     * {@link place} puts it there at that scale.
     * @param scale - The factor; 1 is its own size.
     */
    setScale(scale: number): void {
        if (scale === this.scale || Number.isNaN(scale) || scale <= 0) {
            return;
        }

        this.scale = scale;
        if (this.batch?.billboarded && this.billboardLength !== null) {
            this.batch.setBillboardSize(this.slot, this.billboardLength * scale);
        }
    }

    /**
     * Cut this shape off past a point along its own X axis.
     * @param clipX - Where to cut, in the shape's own units, or -1 to draw it whole.
     */
    setClip(clipX: number): void {
        this.batch?.setClip(this.slot, clipX);
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
        this.batch?.placeOriented(this.slot, position, scratchRotation, this.size * this.scale);
    }

    /**
     * Stand where another cap of the same shape and size stands, drawn as it is drawn but in this
     * cap's own colour: what an edge whose colour or opacity changed does instead of placing its
     * new cap again.
     * @param other - The cap this one replaces.
     * @returns False when the two cannot be drawn alike, and this cap waits for its next placement.
     */
    takePlaceOf(other: ArrowCap): boolean {
        if (this.batch === null || other.batch === null || other.size !== this.size) {
            return false;
        }

        this.scale = other.scale;
        return this.batch.copyPlacement(this.slot, other.batch, other.slot);
    }

    /**
     * Give this cap the size and colour the billboard shader draws it at.
     * @param size - Its length in world units.
     * @param colour - Its colour, as a hex string.
     * @param opacity - Its own opacity, multiplying its batch's.
     */
    setAppearance(size: number, colour: string, opacity = 1): void {
        this.billboardLength = size;
        this.opacity = opacity;
        this.batch?.setAppearance(this.slot, size * this.scale, colour, opacity);
    }

    /**
     * Whether this cap is drawn by a batch at a size: what lets a restyle that keeps both recolor
     * it in place rather than build another.
     * @param batch - The batch.
     * @param size - The size.
     * @returns True when it is live in that batch at that size.
     */
    drawsIn(batch: ArrowCapBatch, size: number): boolean {
        return this.batch === batch && !batch.disposed && this.size === size;
    }

    /**
     * Draw or stop drawing this cap.
     * @param drawn - Whether it is on screen.
     */
    setDrawn(drawn: boolean): void {
        this.batch?.setDrawn(this.slot, drawn);
    }

    /**
     * Stop drawing this cap because the visibility mask hid its edge; see {@link ArrowCapBatch.park}.
     */
    park(): void {
        this.batch?.park(this.slot);
    }

    /**
     * Draw this cap again as it was when it was parked.
     * @returns True when it was put back.
     */
    unpark(): boolean {
        return this.batch?.unpark(this.slot) ?? false;
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
