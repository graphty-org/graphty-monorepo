import { Frustum, type Mesh, type Scene, type ShaderMaterial, ShaderStore, Vector3 } from "@babylonjs/core";

import { motionOf } from "../catalog/shaders";
import { animatesEveryFrame } from "../managers/everyFrameAnimations";
import type { HostShader } from "../session/shaders";
import { edgeShaderProgram } from "../shaders/runtime/edgePrograms";
import type { ShaderRuntime } from "../shaders/runtime/ShaderRuntime";
import { SCENE_BLOCK } from "../shaders/runtime/wrap";
import { noteBloomMesh } from "./BloomPass";
import { CustomLineRenderer } from "./CustomLineRenderer";
import { EdgeLineBatch } from "./EdgeLineBatch";
import type { NodeShaderData } from "./NodeShaderDrawing";

/** What an edge shader batch draws on. */
export type EdgeShaderRole = "surface" | "effect";

/** How the line a shader batch draws on is sized, as the plain line batch of the same edge is. */
export interface ShadedLineOptions {
    /** The line's width: the 3D line's screen width, or world units with `worldWidth`. */
    readonly width: number;
    /** Hex color the plain line is drawn in; a surface reads it as `e.color`. */
    readonly color: string;
    /** The line's opacity. */
    readonly opacity: number;
    /** Whether `width` is in world units (the 2D view). */
    readonly worldWidth: boolean;
}

/** Scratch for the on-screen test, so the per-frame walk allocates nothing. */
const scratchA = new Vector3();
const scratchB = new Vector3();

/**
 * The line mesh an edge shader is drawn on: the joined line (`edgeJoinShader`, widened and
 * shaded) with the shader's fragment after it, bound to the scene uniforms and the parameter-set
 * texture. A surface blends straight alpha over, as the line does; an effect premultiplied over
 * or added, writing no depth, `reach` times the line's width.
 * @param scene - The scene.
 * @param role - Surface or effect.
 * @param shader - The shader.
 * @param data - The scene's data textures.
 * @param runtime - The shader runtime.
 * @param line - How the line is sized.
 * @returns The mesh, with its material.
 */
export function shadedLineMesh(
    scene: Scene,
    role: EdgeShaderRole,
    shader: HostShader,
    data: NodeShaderData,
    runtime: ShaderRuntime,
    line: ShadedLineOptions,
): Mesh {
    const { descriptor, glsl } = shader.registration;
    const name = `graphtyEdge${role}${shader.hash.slice(0, 24)}`;
    const program = edgeShaderProgram(role === "surface" ? "edge-surface" : "edge-effect", descriptor, glsl);
    ShaderStore.ShadersStore[`${name}FragmentShader`] = program.fragment;
    let blend: "combine" | "premultiplied" | "add" = "combine";
    if (role === "effect") {
        blend = descriptor.blend === "add" ? "add" : "premultiplied";
    }

    const mesh = CustomLineRenderer.createJoinedLineMesh(
        {
            width: line.width,
            color: line.color,
            opacity: line.opacity,
            worldWidth: line.worldWidth,
            program: { ...program, fragment: name },
            blend,
        },
        scene,
    );
    const material = mesh.material as ShaderMaterial;
    material.setUniformBuffer(SCENE_BLOCK, runtime.uniforms.buffer);
    material.setTexture(data.paramSampler, data.paramTexture);
    material.setFloat("edgeReach", role === "effect" ? Math.max(1, descriptor.reach ?? 1) : 1);
    if (role === "effect") {
        material.disableDepthWrite = true;
    }

    material.onBindObservable.add(() => {
        material.setFloat("graphty_freeze", runtime.uniforms.frozenTime(shader.hash));
    });
    return mesh;
}

/**
 * Every edge drawn with one edge surface, as slots of a widened joined line (design/rendering
 * /shader-styles.md section 5): one draw call however many edges carry it. A slot is a piece of
 * an edge, placed by the edge exactly as its plain line's slots are, so the surface keeps the
 * line's width, taper, corners and route; the slot's static values (colors, parameters, state,
 * taper) are written on a repaint and uploaded only then.
 *
 * It holds the frame claim the shader's motion needs: while a timed animation plays on a slot, or
 * a loop with a speed runs on a piece the camera can see. A still shader asks for no frame.
 */
export class ShadedEdgeBatch extends EdgeLineBatch {
    /** Resolves true once the program compiled, false when it failed. */
    readonly ready: Promise<boolean>;
    /** Per slot: the loop's speed (0 still), NaN for a free slot. */
    private speeds = new Float32Array(32).fill(Number.NaN);
    /** Per slot: until when (`performance.now()`) a timed animation plays on it. */
    private until = new Float64Array(32);
    private releaseMotion: (() => void) | null = null;
    private checkPending = false;
    private readonly loops: boolean;
    private readonly stopData: () => void;

    /**
     * Start a batch on a shaded line mesh ({@link shadedLineMesh}).
     * @param mesh - The mesh.
     * @param scene - The scene.
     * @param retire - Called when the last slot leaves, so the cache forgets the batch.
     * @param shader - The shader it draws.
     * @param runtime - The shader runtime, for the motion claim.
     * @param data - The scene's data textures, rebound when they grow.
     */
    constructor(
        mesh: Mesh,
        scene: Scene,
        retire: () => void,
        readonly shader: HostShader,
        private readonly runtime: ShaderRuntime,
        data: NodeShaderData,
    ) {
        super(mesh, scene, retire);
        this.loops = motionOf(shader.registration.descriptor.motion).loop !== undefined;
        if (shader.registration.descriptor.bloom === true) {
            noteBloomMesh(scene, mesh);
        }
        const material = mesh.material as ShaderMaterial;
        this.stopData = data.onRebuilt(() => {
            material.setTexture(data.paramSampler, data.paramTexture);
        });
        this.ready = material.forceCompilationAsync(mesh).then(
            () => !this.disposed,
            () => false,
        );
    }

    /**
     * Set how one slot moves: its loop's speed (0 stands it still).
     * @param index - The slot.
     * @param speed - The speed.
     */
    setSpeed(index: number, speed: number): void {
        this.fit(index);
        this.speeds[index] = speed;
        this.checkMotionNextFrame();
    }

    /**
     * Say that a timed animation plays on a slot until a moment, so the batch holds a frame claim
     * until then.
     * @param index - The slot.
     * @param untilMs - When it ends, by `performance.now()`.
     */
    playUntil(index: number, untilMs: number): void {
        this.fit(index);
        this.until[index] = Math.max(this.until[index], untilMs);
        this.checkMotionNextFrame();
    }

    /** Drop the mesh, its material, the buffers, the claim and the per-frame upload. */
    override dispose(): void {
        if (this.disposed) {
            return;
        }

        this.stopData();
        this.releaseMotion?.();
        this.releaseMotion = null;
        super.dispose();
    }

    /**
     * Whether a frame claim is held now, for tests and tools.
     * @returns True while the batch asks for every frame.
     */
    get moving(): boolean {
        return this.releaseMotion !== null;
    }

    protected override afterFlush(): void {
        const needed = !this.disposed && this.needsMotion();
        if (needed && this.releaseMotion === null) {
            this.releaseMotion = this.runtime.uniforms.claimMotion();
        } else if (!needed && this.releaseMotion !== null) {
            this.releaseMotion();
            this.releaseMotion = null;
        }
    }

    protected override slotReleased(index: number): void {
        this.fit(index);
        this.speeds[index] = Number.NaN;
        this.until[index] = 0;
    }

    /**
     * Whether anything this batch draws moves by itself now.
     * @returns True when the batch needs every frame drawn.
     */
    private needsMotion(): boolean {
        const now = performance.now();
        const count = Math.min(this.drawnCount, this.until.length);
        for (let i = 0; i < count; i++) {
            if (this.until[i] > now) {
                return true;
            }
        }

        const camera = this.mesh.getScene().activeCamera;
        if (!this.loops || camera === null) {
            return false;
        }

        const planes = Frustum.GetPlanes(camera.getTransformationMatrix());
        const world = this.mesh.getWorldMatrix();
        for (let i = 0; i < count; i++) {
            const speed = this.speeds[i];
            if (Number.isNaN(speed) || speed === 0) {
                continue;
            }

            Vector3.TransformCoordinatesToRef(this.pieceEndToRef(i, 0, scratchA), world, scratchA);
            Vector3.TransformCoordinatesToRef(this.pieceEndToRef(i, 1, scratchB), world, scratchB);
            const reach = Vector3.Distance(scratchA, scratchB);
            if (reach === 0) {
                continue;
            }

            scratchA.addInPlace(scratchB).scaleInPlace(0.5);
            if (planes.every((plane) => plane.dotCoordinate(scratchA) >= -reach)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Grow the per-slot motion arrays to hold a slot.
     * @param index - The slot.
     */
    private fit(index: number): void {
        if (index < this.speeds.length) {
            return;
        }

        const size = Math.max(index + 1, this.speeds.length * 2);
        const speeds = new Float32Array(size).fill(Number.NaN);
        speeds.set(this.speeds);
        this.speeds = speeds;
        const until = new Float64Array(size);
        until.set(this.until);
        this.until = until;
    }

    /**
     * Have the claim checked on the next frame rather than now, asking a graph drawn on demand
     * for that one frame: a repaint writes every slot, and checking on each write would walk
     * every slot per write.
     */
    private checkMotionNextFrame(): void {
        if (this.releaseMotion !== null || this.checkPending || this.disposed) {
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
}

/**
 * Every edge carrying one edge effect: light along the edge's route, drawn over the line on the
 * line's own pieces at `reach` times its width (design/rendering/shader-styles.md section 5). An
 * edge places its effect's slots with the same points as its line, so an effect draws the same on
 * a straight, curved, bent or lifted edge. Effects stack in the order their batches draw and never
 * replace the line.
 *
 * A removed edge's slots can be kept while the effect's exit plays ({@link EdgeEffectBatch.retireAt}):
 * they are handed back once it ends, and nothing else about the removed edge is drawn.
 */
export class EdgeEffectBatch extends ShadedEdgeBatch {
    /** Slots kept for an exit, and when each ends by `performance.now()`. */
    private readonly exits = new Map<number, number>();

    /**
     * Keep a slot drawn until an exit ends, then hand it back.
     * @param index - The slot.
     * @param endsMs - When the exit ends, by `performance.now()`.
     */
    retireAt(index: number, endsMs: number): void {
        this.exits.set(index, endsMs);
        this.playUntil(index, endsMs);
    }

    /**
     * How many slots are kept for an exit now.
     * @returns The count.
     */
    get exiting(): number {
        return this.exits.size;
    }

    protected override afterFlush(): void {
        const now = performance.now();
        for (const [index, ends] of [...this.exits]) {
            if (ends <= now) {
                this.exits.delete(index);
                this.release(index);
                if (this.disposed) {
                    return;
                }
            }
        }

        super.afterFlush();
    }
}
