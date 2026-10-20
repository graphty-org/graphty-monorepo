// Installs Mesh.prototype.thinInstanceSetBuffer and its siblings. See EdgeLineBatch.
import "@babylonjs/core/Meshes/thinInstanceMesh";

import {
    Buffer,
    Constants,
    Frustum,
    Mesh,
    type Plane,
    type Scene,
    ShaderMaterial,
    ShaderStore,
    Vector2,
    Vector3,
    VertexData,
} from "@babylonjs/core";

import { motionOf } from "../catalog/shaders";
import { animatesEveryFrame } from "../managers/everyFrameAnimations";
import type { HostShader } from "../session/shaders";
import { BATCH_ATTRIBUTES, BATCH_FLOATS, batchProgram, type BatchRole } from "../shaders/runtime/nodePrograms";
import type { ShaderRuntime } from "../shaders/runtime/ShaderRuntime";
import { SCENE_BLOCK } from "../shaders/runtime/wrap";
import { batchUploadFrames } from "./FrameRoster";
import type { NodeShaderData } from "./NodeShaderDrawing";

/** Slots a new batch starts with, before the first doubling. */
const INITIAL_SLOTS = 32;

/** The square every slot is drawn on: two triangles from -1 to 1. */
const QUAD_POSITIONS = [-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0];
const QUAD_INDICES = [0, 1, 2, 0, 2, 3];

/** Scratch for the on-screen test, so the per-frame walk allocates nothing. */
const scratchCenter = new Vector3();

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
 * For an **impostor** surface (a sphere material on a round node) each square ray-casts the exact
 * sphere; for a **sprite** it is the flat picture. Either way the batch draws the outline ring,
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
    private readonly loops: boolean;
    private readonly name: string;

    /**
     * Start a batch for one shader.
     * @param scene - The scene.
     * @param role - What it draws: impostor surfaces, sprites or effects.
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
        const program = batchProgram(role, descriptor, glsl);
        ShaderStore.ShadersStore[`${this.name}VertexShader`] = program.vertex;
        ShaderStore.ShadersStore[`${this.name}FragmentShader`] = program.fragment;

        this.mesh = new Mesh(this.name, scene);
        const quad = new VertexData();
        quad.positions = QUAD_POSITIONS;
        quad.indices = QUAD_INDICES;
        quad.applyToMesh(this.mesh);
        this.mesh.isPickable = false;
        this.mesh.doNotSyncBoundingInfo = true;
        this.mesh.alwaysSelectAsActiveMesh = true;
        const graphRoot = scene.getTransformNodeByName("graph-root");
        if (graphRoot) {
            this.mesh.parent = graphRoot;
        }

        this.material = new ShaderMaterial(
            this.name,
            scene,
            { vertex: this.name, fragment: this.name },
            {
                attributes: [...program.attributes],
                uniforms: [...program.uniforms],
                uniformBuffers: [...program.uniformBuffers],
                samplers: [...program.samplers],
                needAlphaBlending: true,
            },
        );
        this.material.backFaceCulling = false;
        this.material.setUniformBuffer(SCENE_BLOCK, runtime.uniforms.buffer);
        this.material.setFloat("graphty_reach", descriptor.reach ?? 1);
        this.configureMaterial(this.material);
        this.bindTextures();
        this.stopData = data.onRebuilt(() => {
            this.bindTextures();
        });
        this.material.onBindObservable.add(() => {
            const engine = scene.getEngine();
            this.material.setVector2(
                "graphty_resolution",
                new Vector2(engine.getRenderWidth(), engine.getRenderHeight()),
            );
        });
        // See CustomLineRenderer: a ShaderMaterial re-derives its defines on every readiness check,
        // and everything set on it later is a uniform.
        this.material.blockDirtyMechanism = true;
        this.mesh.material = this.material;
        this.bindBuffers();

        this.ready = this.material.forceCompilationAsync(this.mesh).then(
            () => !this.gone,
            () => false,
        );

        this.stopFlush = batchUploadFrames.join(scene, () => {
            this.flush();
        });
    }

    /**
     * The blend and depth state of the material. A billboard blends straight alpha over and
     * writes depth, so a sphere or a sticker hides what is behind it.
     * @param material - The material.
     */
    protected configureMaterial(material: ShaderMaterial): void {
        material.alphaMode = Constants.ALPHA_COMBINE;
        material.disableDepthWrite = false;
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

        if (this.dirty) {
            this.dirty = false;
            this.buffer?.update(this.slots);
        }

        this.updateMotion();
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
        this.mesh.dispose(false, true);
        this.buffer?.dispose();
        this.buffer = null;
        Reflect.deleteProperty(ShaderStore.ShadersStore, `${this.name}VertexShader`);
        Reflect.deleteProperty(ShaderStore.ShadersStore, `${this.name}FragmentShader`);
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

        if (!this.loops) {
            return false;
        }

        const planes = this.frustum();
        if (planes === null) {
            return false;
        }

        const world = this.mesh.getWorldMatrix();
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
     * The active camera's frustum planes.
     * @returns The planes, or null with no camera.
     */
    private frustum(): Plane[] | null {
        const camera = this.mesh.getScene().activeCamera;
        return camera === null ? null : Frustum.GetPlanes(camera.getTransformationMatrix());
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
        this.material.setTexture(this.data.paramSampler, this.data.paramTexture);
        this.material.setTexture(this.data.stateSampler, this.data.stateTexture);
    }

    /** Hand the slots to the mesh as instanced attributes. */
    private bindBuffers(): void {
        this.buffer?.dispose();
        const buffer = new Buffer(this.mesh.getEngine(), this.slots, true, BATCH_FLOATS, false, true);
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
        this.bindBuffers();
    }
}
