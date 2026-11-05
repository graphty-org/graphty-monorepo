// Installs Mesh.prototype.thinInstanceSetBuffer and its siblings. See EdgeLineBatch.
import "@babylonjs/core/Meshes/thinInstanceMesh.js";

import {
    Buffer,
    type Camera,
    Constants,
    type Matrix,
    Mesh,
    type Scene,
    ShaderMaterial,
    ShaderStore,
    Vector2,
    Vector3,
    VertexData,
} from "@babylonjs/core";

import { motionOf } from "../catalog/shaders";
import { animatesEveryFrame } from "../managers/everyFrameAnimations";
import { wantsLowDetail } from "../managers/ShaderGuard";
import type { HostShader } from "../session/shaders";
import { BATCH_ATTRIBUTES, BATCH_FLOATS, batchProgram, type BatchRole } from "../shaders/runtime/nodePrograms";
import type { ShaderRuntime } from "../shaders/runtime/ShaderRuntime";
import { SCENE_BLOCK } from "../shaders/runtime/wrap";
import { noteBloomMesh } from "./BloomPass";
import { batchUploadFrames } from "./FrameRoster";
import type { NodeShaderData } from "./NodeShaderDrawing";
import { ViewWatch } from "./viewWatch";

/** Slots a new batch starts with, before the first doubling. */
const INITIAL_SLOTS = 32;

/** The square every slot is drawn on: two triangles from -1 to 1. */
const QUAD_POSITIONS = [-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0];
const QUAD_INDICES = [0, 1, 2, 0, 2, 3];

/**
 * The transparent-pass order of the squares that draw a node's surface (Babylon draws a lower
 * `alphaIndex` first): before the edge shaders' lines (`EdgeEffectBatch`, 1e9) and the node
 * effects (the default), so those are depth tested against the nodes, which write depth.
 */
const NODE_SURFACE_ALPHA_INDEX = 1e8;

/** Scratch for the on-screen test, so the per-frame walk allocates nothing. */
const scratchCenter = new Vector3();

/** The places a stacking square draws at: over, around or behind the node. */
export type SquarePlace = "over" | "around" | "behind";

/** What one slot draws: every float of its attributes, in {@link BATCH_ATTRIBUTES} order. */
export interface SlotValues {
    /** x, y, z in graph-root space, then the drawn radius. */
    readonly center: readonly [number, number, number, number];
    /** r, g, b in 0..1, then the opacity. */
    readonly color: readonly [number, number, number, number];
    /** The varying parameters. */
    readonly params: readonly [number, number, number, number];
    /** seed, parameter-set row, state bits, state-time row. */
    readonly meta: readonly [number, number, number, number];
    readonly deco0: readonly [number, number, number, number];
    readonly deco1: readonly [number, number, number, number];
}

/**
 * Every node drawn with one shader on camera-facing squares, as instances of one mesh: one draw
 * call however many nodes carry it (design/rendering/shader-styles.md section 5).
 *
 * For an **impostor** (a `paint` use on a round node) each square ray-casts the exact sphere; at
 * **`replace`** it is the shader's flat picture in place of the node. Either way the batch draws the outline ring,
 * glow and halo from the radius itself, because the highlight layer's shaders would outline the
 * square, and the node's own mesh stays in the scene as an invisible pick proxy, so picking is by
 * the node's drawn radius and never by a shader's alpha.
 *
 * Slots are floats in this batch's own array, written through a dirty flag and uploaded once per
 * frame, as `EdgeLineBatch.flush` does. Nothing here indexes the node meshes' instance buffers,
 * which Babylon repacks per frame.
 */
export class NodeBillboardBatch {
    /** The one mesh that draws every slot. */
    readonly mesh: Mesh;
    /** The material, compiled from the shader's program. */
    readonly material: ShaderMaterial;
    /** Resolves true once the program compiled, false when it failed. */
    readonly ready: Promise<boolean>;

    protected slots = new Float32Array(INITIAL_SLOTS * BATCH_FLOATS);
    /** The slots in drawing order, farthest from the camera first: what the GPU buffer holds. */
    private drawn = new Float32Array(INITIAL_SLOTS * BATCH_FLOATS);
    /** Slot indices in drawing order, and each slot's distance along the view. */
    private order = new Uint32Array(0);
    private depths = new Float32Array(INITIAL_SLOTS);
    private readonly sortView = new ViewWatch();
    /** Per slot: the loop's speed (0 still), NaN for a free slot. */
    protected speeds = new Float32Array(INITIAL_SLOTS).fill(Number.NaN);
    /** Per slot: until when (performance.now()) a timed animation plays on it. */
    protected until = new Float64Array(INITIAL_SLOTS);
    private buffer: Buffer | null = null;
    private highWater = 0;
    private readonly free: number[] = [];
    private dirty = false;
    private gone = false;
    private readonly stopFlush: () => void;
    private readonly stopData: () => void;
    private releaseMotion: (() => void) | null = null;
    /** The camera's planes for the on-screen test, and whether a loop was on screen by them. */
    private readonly view = new ViewWatch();
    private loopOnScreen = false;
    /** Whether a slot was written since the on-screen test last walked them. */
    private slotsChanged = true;
    private readonly loops: boolean;
    private readonly name: string;

    /**
     * Start a batch for one shader.
     * @param scene - The scene.
     * @param role - What it draws: impostor surfaces, or squares at `replace`, `over`, `around` or `behind`.
     * @param shader - The shader.
     * @param data - The scene's parameter-set and state-time textures.
     * @param runtime - The shader runtime, for the scene uniforms and the motion claim.
     */
    constructor(
        scene: Scene,
        readonly role: BatchRole,
        readonly shader: HostShader,
        private readonly data: NodeShaderData,
        private readonly runtime: ShaderRuntime,
    ) {
        const { descriptor, glsl } = shader.registration;
        this.loops = motionOf(descriptor.motion).loop !== undefined;
        this.name = `graphtyNode${role}${shader.hash.slice(0, 24)}`;

        this.mesh = new Mesh(this.name, scene);
        const quad = new VertexData();
        quad.positions = QUAD_POSITIONS;
        quad.indices = QUAD_INDICES;
        quad.applyToMesh(this.mesh);
        this.mesh.isPickable = false;
        this.mesh.doNotSyncBoundingInfo = true;
        this.mesh.alwaysSelectAsActiveMesh = true;
        if (role === "impostor" || role === "replace") {
            this.mesh.alphaIndex = NODE_SURFACE_ALPHA_INDEX;
        }

        const graphRoot = scene.getTransformNodeByName("graph-root");
        if (graphRoot) {
            this.mesh.parent = graphRoot;
        }

        this.material = this.buildMaterial(this.name, glsl);
        this.stopData = data.onRebuilt(() => {
            this.bindTextures();
        });
        this.mesh.material = this.material;
        this.bindBuffers();
        if (descriptor.bloom === true) {
            noteBloomMesh(scene, this.mesh);
        }

        this.ready = this.compiled(); // NOSONAR(S7059): compiling starts with the batch, read at once

        this.stopFlush = batchUploadFrames.join(scene, () => {
            this.flush();
        });
    }

    /**
     * Compile the batch's material.
     * @returns Whether it compiled while the batch still lives.
     */
    private compiled(): Promise<boolean> {
        return this.material.forceCompilationAsync(this.mesh).then(
            () => !this.gone,
            () => false,
        );
    }

    /**
     * Build and configure one material of this batch's program from a body.
     * @param name - Its name in Babylon's shader store.
     * @param glsl - The body.
     * @returns The material.
     */
    private buildMaterial(name: string, glsl: string): ShaderMaterial {
        const scene = this.mesh.getScene();
        const { descriptor } = this.shader.registration;
        const program = batchProgram(this.role, descriptor, glsl);
        ShaderStore.ShadersStore[`${name}VertexShader`] = program.vertex;
        ShaderStore.ShadersStore[`${name}FragmentShader`] = program.fragment;
        const material = new ShaderMaterial(
            name,
            scene,
            { vertex: name, fragment: name },
            {
                attributes: [...program.attributes],
                uniforms: [...program.uniforms],
                uniformBuffers: [...program.uniformBuffers],
                samplers: [...program.samplers],
                needAlphaBlending: true,
            },
        );
        material.backFaceCulling = false;
        material.setUniformBuffer(SCENE_BLOCK, this.runtime.uniforms.buffer);
        material.setFloat("graphty_reach", descriptor.reach ?? 1);
        this.configureMaterial(material);
        material.setTexture(this.data.paramSampler, this.data.paramTexture);
        material.setTexture(this.data.stateSampler, this.data.stateTexture);
        material.onBindObservable.add(() => {
            const engine = scene.getEngine();
            material.setVector2("graphty_resolution", new Vector2(engine.getRenderWidth(), engine.getRenderHeight()));
            material.setFloat("graphty_effectCap", this.runtime.uniforms.effectCap);
            material.setFloat("graphty_freeze", this.runtime.uniforms.frozenTime(this.shader.hash));
            // CSS pixels to render pixels, for a use's minimum size.
            material.setFloat("graphty_pixelRatio", 1 / Math.max(engine.getHardwareScalingLevel(), 1e-6));
        });
        // See CustomLineRenderer: a ShaderMaterial re-derives its defines on every readiness check,
        // and everything set on it later is a uniform.
        material.blockDirtyMechanism = true;
        return material;
    }

    /** The cheap program's material, once asked for; see {@link chooseDetail}. */
    private lowMaterial: { material: ShaderMaterial; ready: boolean } | null = null;
    /** The camera's view and projection when the batch last looked, to see it come to rest. */
    private readonly cameraWas = new Float32Array(32);
    /** Whether the camera moved since the detail was last chosen. */
    private cameraMoved = true;

    /**
     * Choose the level of detail when the camera comes to rest (design section 5): a heavy
     * surface with a cheap program draws it for the whole batch while the median node on screen is
     * under 12 px. The program drawing keeps drawing until the other one compiled.
     */
    private chooseDetail(): void {
        const { lowDetail } = this.shader.registration;
        const camera = this.mesh.getScene().activeCamera;
        if (
            lowDetail === undefined ||
            (this.role !== "impostor" && this.role !== "replace") ||
            camera === null ||
            this.liveCount === 0
        ) {
            return;
        }

        const view = camera.getViewMatrix().m;
        const projection = camera.getProjectionMatrix().m;
        let moved = false;
        for (let i = 0; i < 16; i++) {
            moved ||=
                this.cameraWas[i] !== Math.fround(view[i]) || this.cameraWas[16 + i] !== Math.fround(projection[i]);
            this.cameraWas[i] = view[i];
            this.cameraWas[16 + i] = projection[i];
        }

        if (moved) {
            this.cameraMoved = true;
            return;
        }

        if (!this.cameraMoved) {
            return;
        }

        this.cameraMoved = false;
        const low = wantsLowDetail(this.pixelSizes(view, projection));
        if (!low) {
            this.useMaterial(this.material);
            return;
        }

        if (this.lowMaterial === null) {
            const entry = { material: this.buildMaterial(`${this.name}low`, lowDetail), ready: false };
            this.lowMaterial = entry;
            void entry.material.forceCompilationAsync(this.mesh).then(
                () => {
                    entry.ready = true;
                    // Chosen again on the next frame, from where the camera is then.
                    this.cameraMoved = true;
                    this.checkMotionNextFrame();
                },
                () => undefined,
            );
            return;
        }

        if (this.lowMaterial.ready) {
            this.useMaterial(this.lowMaterial.material);
        }
    }

    /**
     * Draw with a material, asking a graph drawn on demand for the frame that shows it.
     * @param material - The material.
     */
    private useMaterial(material: ShaderMaterial): void {
        if (this.mesh.material !== material) {
            this.mesh.material = material;
            this.checkMotionNextFrame();
        }
    }

    /**
     * Each live slot's drawn radius on screen, in pixels, as the vertex stage computes it.
     * @param view - The camera's view matrix.
     * @param projection - Its projection matrix.
     * @returns The sizes.
     */
    private pixelSizes(view: ArrayLike<number>, projection: ArrayLike<number>): Float32Array {
        const world = this.mesh.getWorldMatrix();
        const scale = Math.hypot(world.m[0], world.m[1], world.m[2]);
        const height = this.mesh.getEngine().getRenderHeight();
        const sizes: number[] = [];
        for (let i = 0; i < this.highWater; i++) {
            if (Number.isNaN(this.speeds[i])) {
                continue;
            }

            const at = i * BATCH_FLOATS;
            Vector3.TransformCoordinatesFromFloatsToRef(
                this.slots[at],
                this.slots[at + 1],
                this.slots[at + 2],
                world,
                scratchCenter,
            );
            const viewZ = view[2] * scratchCenter.x + view[6] * scratchCenter.y + view[10] * scratchCenter.z + view[14];
            const w = projection[11] * viewZ + projection[15];
            sizes.push(
                (this.slots[at + 3] * scale * Math.abs(projection[5]) * 0.5 * height) / Math.max(Math.abs(w), 1e-6),
            );
        }

        return Float32Array.from(sizes);
    }

    /**
     * The blend and depth state of the material. A billboard blends straight alpha over and
     * writes depth, so a sphere or a sticker hides what is behind it. Babylon turns depth writes
     * off for every alpha-blended mesh when it sets the blend mode, so writing depth has to be
     * forced (issue #3320: without it the last node drawn covered every node it overlapped).
     * @param material - The material.
     */
    protected configureMaterial(material: ShaderMaterial): void {
        material.alphaMode = Constants.ALPHA_COMBINE;
        material.disableDepthWrite = false;
        material.forceDepthWrite = true;
    }

    /**
     * Whether the mesh is gone.
     * @returns True once disposed.
     */
    get disposed(): boolean {
        return this.gone;
    }

    /**
     * How many slots draw something.
     * @returns The count.
     */
    get liveCount(): number {
        return this.highWater - this.free.length;
    }

    /**
     * Take a slot.
     * @returns The slot's index.
     */
    acquire(): number {
        const recycled = this.free.pop();
        if (recycled !== undefined) {
            return recycled;
        }

        if (this.highWater === this.slots.length / BATCH_FLOATS) {
            this.grow();
        }

        const index = this.highWater;
        this.highWater++;
        this.mesh.forcedInstanceCount = this.highWater;
        return index;
    }

    /**
     * Hand a slot back: it draws nothing (radius 0) until it is taken again.
     * @param index - The slot.
     */
    release(index: number): void {
        if (this.gone) {
            return;
        }

        this.slots.fill(0, index * BATCH_FLOATS, (index + 1) * BATCH_FLOATS);
        this.speeds[index] = Number.NaN;
        this.until[index] = 0;
        this.free.push(index);
        this.dirty = true;
    }

    /**
     * Write everything one slot draws.
     * @param index - The slot.
     * @param values - The values.
     * @param speed - The loop's speed on it, 0 when it stands still.
     */
    write(index: number, values: SlotValues, speed: number): void {
        if (this.gone) {
            return;
        }

        const at = index * BATCH_FLOATS;
        this.slots.set(values.center, at);
        this.slots.set(values.color, at + 4);
        this.slots.set(values.params, at + 8);
        this.slots.set(values.meta, at + 12);
        this.slots.set(values.deco0, at + 16);
        this.slots.set(values.deco1, at + 20);
        this.speeds[index] = speed;
        this.dirty = true;
        this.checkMotionNextFrame();
    }

    /**
     * Move one slot.
     * @param index - The slot.
     * @param x - x in graph-root space.
     * @param y - y.
     * @param z - z.
     */
    move(index: number, x: number, y: number, z: number): void {
        const at = index * BATCH_FLOATS;
        this.slots[at] = x;
        this.slots[at + 1] = y;
        this.slots[at + 2] = z;
        this.dirty = true;
    }

    /**
     * Say that a timed animation plays on a slot until a moment, so the batch holds a frame claim
     * until then.
     * @param index - The slot.
     * @param untilMs - When it ends, by `performance.now()`.
     */
    playUntil(index: number, untilMs: number): void {
        this.until[index] = Math.max(this.until[index], untilMs);
        this.checkMotionNextFrame();
    }

    /** Upload what was written since the last upload, and take or release the frame claim. */
    flush(): void {
        if (this.gone) {
            return;
        }

        if (batchUploadFrames.isRestoring(this.mesh.getScene())) {
            this.dirty = true;
        }

        const camera = this.mesh.getScene().activeCamera;
        const moved = camera !== null && this.sortView.moved(camera, this.mesh.getWorldMatrix());
        if (this.dirty || moved) {
            const written = this.dirty;
            this.dirty = false;
            this.slotsChanged ||= written;
            if (this.sortBackToFront(camera) || written) {
                this.pack();
                this.buffer?.update(this.drawn);
            }
        }

        this.updateMotion();
        this.chooseDetail();
    }

    /**
     * Order the slots farthest first, so a translucent node blends over the nodes behind it
     * rather than hiding them behind the depth it writes (the instances of one mesh are drawn in
     * buffer order, never sorted by Babylon).
     * ponytail: a full sort on every frame the camera or a slot moved; sort incrementally if it
     * shows in a profile of a very large graph.
     * @param camera - The active camera, or null.
     * @returns Whether the order changed.
     */
    private sortBackToFront(camera: Camera | null): boolean {
        const count = this.highWater;
        if (this.depths.length < count) {
            this.depths = new Float32Array(this.slots.length / BATCH_FLOATS);
        }

        const previous = this.order;
        const order = previous.length === count ? previous.slice() : Uint32Array.from({ length: count }, (_, i) => i);
        if (camera !== null) {
            const { m } = this.mesh.getWorldMatrix().multiply(camera.getViewMatrix());
            for (let i = 0; i < count; i++) {
                const at = i * BATCH_FLOATS;
                this.depths[i] = m[2] * this.slots[at] + m[6] * this.slots[at + 1] + m[10] * this.slots[at + 2] + m[14];
            }

            const { depths } = this;
            order.sort((a, b) => depths[b] - depths[a]);
        }

        this.order = order;
        return order.length !== previous.length || order.some((slot, i) => slot !== previous[i]);
    }

    /** Copy the slots into the drawing buffer in drawing order. */
    private pack(): void {
        this.order.forEach((slot, i) => {
            this.drawn.set(this.slots.subarray(slot * BATCH_FLOATS, (slot + 1) * BATCH_FLOATS), i * BATCH_FLOATS);
        });
    }

    /** Drop the mesh, its material, the buffer, the claim and the per-frame upload. */
    dispose(): void {
        if (this.gone) {
            return;
        }

        this.gone = true;
        this.stopFlush();
        this.stopData();
        this.releaseMotion?.();
        this.releaseMotion = null;
        const drawn = this.mesh.material;
        this.mesh.dispose(false, true);
        for (const material of [this.material, this.lowMaterial?.material]) {
            if (material !== undefined && material !== drawn) {
                material.dispose();
            }
        }

        this.buffer?.dispose();
        this.buffer = null;
        for (const name of [this.name, `${this.name}low`]) {
            Reflect.deleteProperty(ShaderStore.ShadersStore, `${name}VertexShader`);
            Reflect.deleteProperty(ShaderStore.ShadersStore, `${name}FragmentShader`);
        }
    }

    /**
     * Whether anything this batch draws moves by itself now: a timed animation still playing, or
     * a loop with a speed on a slot the camera can see. A loop on a node off screen holds no claim.
     * @returns True when the batch needs every frame drawn.
     */
    protected needsMotion(): boolean {
        const now = performance.now();
        for (let i = 0; i < this.highWater; i++) {
            if (this.until[i] > now) {
                return true;
            }
        }

        const camera = this.mesh.getScene().activeCamera;
        if (!this.loops || camera === null) {
            return false;
        }

        // The walk is redone only when a slot, the camera or the graph's transform changed.
        const world = this.mesh.getWorldMatrix();
        if (this.view.moved(camera, world) || this.slotsChanged) {
            this.slotsChanged = false;
            this.loopOnScreen = this.anyLoopOnScreen(world);
        }

        return this.loopOnScreen;
    }

    /**
     * Whether a slot with a moving loop is on screen, by the planes {@link view} holds.
     * @param world - The mesh's world matrix.
     * @returns True when one is.
     */
    private anyLoopOnScreen(world: Matrix): boolean {
        const { planes } = this.view;
        const scale = Math.hypot(world.m[0], world.m[1], world.m[2]);
        for (let i = 0; i < this.highWater; i++) {
            const speed = this.speeds[i];
            const at = i * BATCH_FLOATS;
            const radius = this.slots[at + 3] * scale * this.reachOf();
            if (Number.isNaN(speed) || speed === 0 || radius <= 0) {
                continue;
            }

            Vector3.TransformCoordinatesFromFloatsToRef(
                this.slots[at],
                this.slots[at + 1],
                this.slots[at + 2],
                world,
                scratchCenter,
            );
            if (planes.every((plane) => plane.dotCoordinate(scratchCenter) >= -radius)) {
                return true;
            }
        }

        return false;
    }

    /**
     * How far past the radius a slot draws, for the on-screen test.
     * @returns The multiple of the radius.
     */
    protected reachOf(): number {
        return 2;
    }

    /**
     * Have the claim checked on the next frame rather than now: a repaint writes every slot of a
     * batch, and checking on each write walked every slot per write, the size of the graph
     * squared. A graph drawn on demand is asked for that one frame.
     */
    private checkMotionNextFrame(): void {
        if (this.releaseMotion !== null || this.checkPending || this.gone) {
            return;
        }

        this.checkPending = true;
        const scene = this.mesh.getScene();
        const release = animatesEveryFrame(scene);
        scene.onAfterRenderObservable.addOnce(() => {
            this.checkPending = false;
            release();
        });
    }

    /** Whether a frame was asked for to check the claim. */
    private checkPending = false;

    /** Take or release the frame claim to match {@link needsMotion}. */
    private updateMotion(): void {
        const needed = !this.gone && this.needsMotion();
        if (needed && this.releaseMotion === null) {
            this.releaseMotion = this.runtime.uniforms.claimMotion();
        } else if (!needed && this.releaseMotion !== null) {
            this.releaseMotion();
            this.releaseMotion = null;
        }
    }

    /** Hand the data textures to the material. */
    private bindTextures(): void {
        for (const material of [this.material, this.lowMaterial?.material]) {
            material?.setTexture(this.data.paramSampler, this.data.paramTexture);
            material?.setTexture(this.data.stateSampler, this.data.stateTexture);
        }
    }

    /** Hand the slots to the mesh as instanced attributes. */
    private bindBuffers(): void {
        this.buffer?.dispose();
        const buffer = new Buffer(this.mesh.getEngine(), this.drawn, true, BATCH_FLOATS, false, true);
        BATCH_ATTRIBUTES.forEach((name, i) => {
            this.mesh.setVerticesBuffer(buffer.createVertexBuffer(name, i * 4, 4, BATCH_FLOATS, true));
        });
        this.buffer = buffer;
        this.mesh.forcedInstanceCount = this.highWater;
    }

    /** Double the arrays, keeping every slot where it is. */
    private grow(): void {
        const slots = new Float32Array(this.slots.length * 2);
        slots.set(this.slots);
        this.slots = slots;
        const speeds = new Float32Array(this.speeds.length * 2).fill(Number.NaN);
        speeds.set(this.speeds);
        this.speeds = speeds;
        const until = new Float64Array(this.until.length * 2);
        until.set(this.until);
        this.until = until;
        this.drawn = new Float32Array(slots.length);
        this.bindBuffers();
        this.dirty = true;
    }
}
