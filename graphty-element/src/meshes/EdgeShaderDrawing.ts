/**
 * @file How a graph's edges draw their shaders (design/rendering/shader-styles.md section 5): an
 * edge surface replaces the color of the line's own pixels, and each edge effect draws light along
 * the edge's route over the line. Both are drawn on the edge's own pieces, so they keep the line's
 * width, taper, corners and route.
 *
 * **Nothing loads until an edge names a shader.** This module holds no GLSL: the batches
 * (`EdgeEffectBatch.ts`) are imported the first time one is needed, with the shader runtime.
 * Until a shader has resolved and its program compiled, the edge draws exactly the line the
 * layers beneath paint, and is drawn again once it can draw the shader.
 *
 * **Per-edge data** is each slot's static values (`EdgeLineBatch.writeStatic`): the end colors,
 * the varying parameters, the seed, the parameter-set row (a row of the scene's parameter-set
 * texture, one per distinct set of fixed values), the state bits, the taper, and the entered,
 * exited and changed stamps. They are written on a repaint and never because an edge moved.
 */

import type { Scene } from "@babylonjs/core";

import { drawingOf, motionOf, type ShaderParamDescriptor, type ShaderParams, timingOf } from "../catalog/shaders";
import { animatesEveryFrame } from "../managers/everyFrameAnimations";
import { type HostShader, shadersControllerOf } from "../session/shaders";
import type { GraphSession } from "../session/types";
import type { LazyShaderHost } from "../shaders/chunk";
import { uniformValueOf, varyingSlots } from "../shaders/runtime/nodeLayout";
import type { ShaderRuntime } from "../shaders/runtime/ShaderRuntime";
import type { EdgeEffectBatch, ShadedEdgeBatch, ShadedLineOptions } from "./EdgeEffectBatch";
import { EDGE_STATIC_FLOATS } from "./edgeJoinShader";
import type { EdgeLineBatch } from "./EdgeLineBatch";
import type { MeshCache } from "./MeshCache";
import { ENTRANCE_CAP, NodeShaderData } from "./NodeShaderDrawing";

/** The stamp of a state that never changed. */
export const EDGE_NEVER = -1;

/** How recently an edge must have arrived or changed for a shader it starts carrying to enter. */
const CAUSE_WINDOW_MS = 400;

/** What an edge hands the drawing so it can be drawn again once a shader it names can draw. */
export interface ShadedEdge {
    /** Draw the edge again from the paint it holds. */
    refreshShaderPaint(): void;
}

/** The lazily loaded renderer. */
interface Renderer {
    readonly shadedLineMesh: typeof import("./EdgeEffectBatch").shadedLineMesh;
    readonly ShadedEdgeBatch: typeof ShadedEdgeBatch;
    readonly EdgeEffectBatch: typeof EdgeEffectBatch;
}

/** One shader as this drawing knows it. */
interface Known {
    /** Undefined until resolved; then the shader, or null when it may not draw. */
    shader: HostShader | null | undefined;
    /** Edges drawn without it until it can draw. */
    readonly waiting: Set<ShadedEdge>;
}

/** What one edge's static values are built from, beside its shader's own. */
export interface EdgeStaticLook {
    /** The line color at the source and at the target, 0..1, alpha the opacity. */
    readonly colorA: readonly [number, number, number, number];
    readonly colorB: readonly [number, number, number, number];
    /** A stable 0..1 random per edge. */
    readonly seed: number;
    /** The state bits (`EDGE_STATE_BITS`). */
    readonly bits: number;
    /** Width at the target over width at the source. */
    readonly taper: number;
    /** The entered, exited and changed stamps, scene time, or {@link EDGE_NEVER}. */
    readonly times: readonly [number, number, number];
}

/** The drawing of each scene. */
const DRAWINGS = new WeakMap<Scene, EdgeShaderDrawing>();

/** The edge walk each scene's update manager lends; see {@link EdgeShaderDrawing.lendWalk}. */
const WALKS = new WeakMap<Scene, () => void>();

/**
 * The shader drawing of one scene's edges.
 */
export class EdgeShaderDrawing {
    private readonly known = new Map<string, Known>();
    /** Whether each shader batch's program compiled: undefined while it compiles. */
    private readonly ready = new WeakMap<EdgeLineBatch, boolean>();
    /** Per shader id, the end times of the entrances playing now. */
    private readonly entrances = new Map<string, number[]>();
    /** Every shader batch made, for the frame guard's question of what shaders draw. */
    private readonly made = new Set<EdgeLineBatch>();
    private renderer: Renderer | null = null;
    private runtime: ShaderRuntime | null = null;
    private textures: NodeShaderData | null = null;
    private loading: Promise<void> | null = null;
    private readonly resolving = new Set<string>();
    private readonly stopStatus: () => void;
    private disposed = false;

    /**
     * Start a scene's drawing.
     * @param scene - The scene.
     * @param session - The session, for its shaders.
     */
    private constructor(
        private readonly scene: Scene,
        private readonly session: GraphSession,
    ) {
        // A project shader that becomes drawable draws on the edges waiting; one turned off (the
        // frame guard, a lost context) gives its edges back the line the layers beneath paint.
        this.stopStatus = session.on("shader:status", ({ id, state }) => {
            const known = this.known.get(id);
            const drawable = state === "ready" || state === "still";
            if (known === undefined) {
                return;
            }

            if (known.shader === null && drawable) {
                known.shader = undefined;
                this.wake(known);
            } else if (known.shader !== undefined && known.shader !== null && !drawable) {
                known.shader = null;
                this.wake(known);
            }
        });
        scene.onDisposeObservable.addOnce(() => {
            this.dispose();
        });
    }

    /**
     * The drawing of a scene, made the first time an edge there names a shader.
     * @param scene - The scene.
     * @param session - The session; none means no shader can draw.
     * @returns The drawing, or null without a session or its shaders.
     */
    static of(scene: Scene, session: GraphSession | undefined): EdgeShaderDrawing | null {
        const existing = DRAWINGS.get(scene);
        if (existing !== undefined) {
            return existing;
        }

        if (session === undefined || shadersControllerOf(session) === undefined) {
            return null;
        }

        const made = new EdgeShaderDrawing(scene, session);
        DRAWINGS.set(scene, made);
        return made;
    }

    /**
     * Lend a scene's drawing the update manager's edge walk: an edge drawn again because a shader
     * became drawable outside a style pass takes new slots, and only the next walk places them.
     * @param scene - The scene.
     * @param walk - Makes the next frame visit every edge.
     */
    static lendWalk(scene: Scene, walk: () => void): void {
        WALKS.set(scene, walk);
    }

    /**
     * The drawing of a scene when one was made.
     * @param scene - The scene.
     * @returns The drawing, or undefined.
     */
    static peek(scene: Scene): EdgeShaderDrawing | undefined {
        return DRAWINGS.get(scene);
    }

    /**
     * The kind of a shader by id, once it resolved and may draw: starts resolving it the first
     * time, and draws the edge again when it is done.
     * @param id - The id.
     * @param edge - The edge asking.
     * @returns The shader, or null while it may not draw (yet).
     */
    shader(id: string, edge: ShadedEdge): HostShader | null {
        let known = this.known.get(id);
        if (known === undefined) {
            known = { shader: undefined, waiting: new Set() };
            this.known.set(id, known);
        }

        if (known.shader === undefined || known.shader === null || this.renderer === null) {
            known.waiting.add(edge);
            if (known.shader === undefined) {
                this.resolve(id, known);
            }

            return null;
        }

        return known.shader;
    }

    /**
     * The batch drawing one edge surface on lines sized one way, once its program compiled; built
     * in the mesh cache the first time, so it goes with the cache's other line batches (a 2D/3D
     * switch).
     * @param edge - The edge asking, drawn again once the batch is ready.
     * @param id - The surface's id.
     * @param cache - The mesh cache.
     * @param name - The batch's name in the cache, which says how its line is sized.
     * @param line - How its line is sized.
     * @returns The batch, or null while it cannot draw.
     */
    surfaceBatch(
        edge: ShadedEdge,
        id: string,
        cache: MeshCache,
        name: string,
        line: ShadedLineOptions,
    ): ShadedEdgeBatch | null {
        return this.batchOf("paint", edge, id, cache, name, line) as ShadedEdgeBatch | null;
    }

    /**
     * The batch drawing one edge effect on lines of one width, once its program compiled.
     * @param edge - The edge asking.
     * @param id - The effect's id.
     * @param cache - The mesh cache.
     * @param name - The batch's name in the cache.
     * @param line - How its line is sized.
     * @returns The batch, or null while it cannot draw.
     */
    effectBatch(
        edge: ShadedEdge,
        id: string,
        cache: MeshCache,
        name: string,
        line: ShadedLineOptions,
    ): EdgeEffectBatch | null {
        return this.batchOf("along", edge, id, cache, name, line) as EdgeEffectBatch | null;
    }

    /**
     * The static values one edge's slots carry for one shader.
     * @param look - The edge's colors, seed, state, taper and stamps.
     * @param shader - The shader drawn.
     * @param values - The shader's parameter values over its defaults.
     * @returns The static values, EDGE_STATIC_FLOATS floats.
     */
    staticValues(look: EdgeStaticLook, shader: HostShader, values: ShaderParams | undefined): Float32Array {
        const { params } = shader.registration.descriptor;
        const row = this.textures?.paramRow(shader.id, params, values) ?? 0;
        return edgeStaticValues(look, { row, varying: varying(params, values) });
    }

    /**
     * The scene time now, in the seconds the shaders read, or {@link EDGE_NEVER} before the
     * runtime is loaded.
     * @returns The time.
     */
    now(): number {
        return this.runtime?.uniforms.now() ?? EDGE_NEVER;
    }

    /**
     * Decide whether a shader an edge starts carrying plays its entrance: when the edge arrived or
     * changed just now (`causedAt`) and fewer than {@link ENTRANCE_CAP} entrances play for it.
     * @param shader - The shader.
     * @param causedAt - When something last happened to the edge, by `performance.now()`.
     * @returns The entered stamp, or {@link EDGE_NEVER} to start at rest, and until when it plays.
     */
    entrance(shader: HostShader, causedAt: number): { stamp: number; untilMs: number } {
        const enter = timingOf(shader.registration.descriptor).enter ?? 0;
        const now = performance.now();
        if (enter <= 0 || now - causedAt > CAUSE_WINDOW_MS || this.runtime === null) {
            return { stamp: EDGE_NEVER, untilMs: 0 };
        }

        const playing = (this.entrances.get(shader.id) ?? []).filter((end) => end > now);
        this.entrances.set(shader.id, playing);
        if (playing.length >= ENTRANCE_CAP) {
            return { stamp: EDGE_NEVER, untilMs: 0 };
        }

        const untilMs = now + enter * 1000;
        playing.push(untilMs);
        return { stamp: this.runtime.uniforms.now() - (now - causedAt) / 1000, untilMs };
    }

    /**
     * A shader's loop speed on one edge: its speed parameter's value, 1 when it names none, 0 for
     * a shader that does not loop.
     * @param shader - The shader.
     * @param values - The edge's values.
     * @returns The speed.
     */
    speedOf(shader: HostShader, values: ShaderParams | undefined): number {
        const { motion, params } = shader.registration.descriptor;
        const { loop } = motionOf(motion);
        if (loop === undefined) {
            return 0;
        }

        const param = params.find((each) => each.name === loop.speedParam);
        return param === undefined ? 1 : uniformValueOf(param, values?.[param.name])[0];
    }

    /**
     * The shaders drawn on edges now, of any origin, for the frame guard and the flashing check.
     * @returns Whether a heavy shader draws, and the moving ones' text hashes.
     */
    guardedDrawn(): { readonly heavy: boolean; readonly moving: readonly string[] } {
        let heavy = false;
        const moving = new Set<string>();
        for (const batch of [...this.made]) {
            if (batch.disposed) {
                this.made.delete(batch);
                continue;
            }

            const { shader } = batch as ShadedEdgeBatch;
            if (batch.liveCount === 0 || this.ready.get(batch) !== true) {
                continue;
            }

            heavy ||= shader.heavy === true;
            const { loop } = motionOf(shader.registration.descriptor.motion);
            const { enter, exit, change } = timingOf(shader.registration.descriptor);
            if (loop !== undefined || (enter ?? 0) > 0 || (exit ?? 0) > 0 || (change ?? 0) > 0) {
                moving.add(shader.hash);
            }
        }

        return { heavy, moving: [...moving] };
    }

    /**
     * What the drawing's shader batches hold now, for tests and tools: live slots per batch name,
     * slots kept for an exit, and whether any batch holds a frame claim.
     * @returns The counts.
     */
    stats(): { readonly slots: ReadonlyMap<string, number>; readonly exiting: number; readonly moving: boolean } {
        const slots = new Map<string, number>();
        let exiting = 0;
        let moving = false;
        for (const batch of this.made) {
            if (batch.disposed) {
                continue;
            }

            slots.set(batch.name, batch.liveCount);
            exiting += (batch as Partial<EdgeEffectBatch>).exiting ?? 0;
            moving ||= (batch as ShadedEdgeBatch).moving;
        }

        return { slots, exiting, moving };
    }

    /** Release the parameter texture and the listener. */
    dispose(): void {
        if (this.disposed) {
            return;
        }

        this.disposed = true;
        this.stopStatus();
        this.textures?.dispose();
        this.textures = null;
        DRAWINGS.delete(this.scene);
    }

    /**
     * A batch of one role, once its program compiled.
     * @param role - `paint` or `along`.
     * @param edge - The edge asking.
     * @param id - The shader's id.
     * @param cache - The mesh cache.
     * @param name - The batch's name in the cache.
     * @param line - How its line is sized.
     * @returns The batch, or null while it cannot draw.
     */
    private batchOf(
        role: "paint" | "along",
        edge: ShadedEdge,
        id: string,
        cache: MeshCache,
        name: string,
        line: ShadedLineOptions,
    ): EdgeLineBatch | null {
        const shader = this.shader(id, edge);
        const { renderer, runtime, textures: data } = this;
        if (
            shader?.registration.descriptor.target !== "edge" ||
            !(shader.registration.descriptor.places ?? []).includes(role) ||
            drawingOf(shader.registration.descriptor, role) !== `edge-${role}` ||
            renderer === null ||
            runtime === null ||
            data === null
        ) {
            return null;
        }

        const batch = cache.getBatch(
            `${name}|${shader.hash}`,
            () => renderer.shadedLineMesh(this.scene, role, shader, data, runtime, line),
            this.scene,
            (mesh, scene, retire) =>
                role === "paint"
                    ? new renderer.ShadedEdgeBatch(mesh, scene, retire, shader, runtime, data)
                    : new renderer.EdgeEffectBatch(mesh, scene, retire, shader, runtime, data),
        ) as ShadedEdgeBatch;
        if (!this.ready.has(batch)) {
            this.ready.set(batch, false);
            this.made.add(batch);
            const known = this.known.get(id);
            known?.waiting.add(edge);
            void batch.ready.then((ok) => {
                this.ready.set(batch, ok);
                runtime.noteDrawn([shader.hash]);
                if (known !== undefined && ok) {
                    this.wake(known);
                }
            });
            return null;
        }

        if (this.ready.get(batch) !== true) {
            this.known.get(id)?.waiting.add(edge);
            return null;
        }

        return batch;
    }

    /**
     * Resolve a shader: its text from the session, the renderer module and the runtime.
     * @param id - The id.
     * @param known - Its entry.
     */
    private resolve(id: string, known: Known): void {
        if (this.resolving.has(id)) {
            return;
        }

        const controller = shadersControllerOf(this.session);
        const host = controller?.host as LazyShaderHost | null | undefined;
        if (controller === undefined || host === null || host === undefined) {
            known.shader = null;
            return;
        }

        this.resolving.add(id);
        void Promise.all([controller.drawable(id), this.load(host)]).then(
            ([shader]) => {
                this.resolving.delete(id);
                if (this.disposed) {
                    return;
                }

                known.shader = shader;
                if (shader !== null) {
                    this.wake(known);
                }
            },
            () => {
                this.resolving.delete(id);
                known.shader = null;
            },
        );
    }

    /**
     * Load the renderer module and the runtime, once.
     * @param host - The shader host.
     * @returns Resolves when both are here.
     */
    private load(host: LazyShaderHost): Promise<void> {
        this.loading ??= Promise.all([import("./EdgeEffectBatch"), host.runtime()]).then(([module, runtime]) => {
            this.renderer = {
                shadedLineMesh: module.shadedLineMesh,
                ShadedEdgeBatch: module.ShadedEdgeBatch,
                EdgeEffectBatch: module.EdgeEffectBatch,
            };
            this.runtime = runtime;
            this.textures ??= new NodeShaderData(this.scene);
        });
        return this.loading;
    }

    /**
     * Draw the edges waiting on a shader again, and ask a graph drawn on demand for the frame.
     * @param known - The shader's entry.
     */
    private wake(known: Known): void {
        const waiting = [...known.waiting];
        known.waiting.clear();
        for (const edge of waiting) {
            edge.refreshShaderPaint();
        }

        WALKS.get(this.scene)?.();

        const release = animatesEveryFrame(this.scene);
        this.scene.onAfterRenderObservable.addOnce(release);
    }
}

/**
 * The static values one edge's slots carry, in `EDGE_STATIC_ATTRIBUTES` order.
 * @param look - The edge's colors, seed, state, taper and stamps.
 * @param shader - Its shader's parameter-set row and varying parameters; none for a taper alone.
 * @param shader.row - The row.
 * @param shader.varying - The four varying values.
 * @returns The static values, EDGE_STATIC_FLOATS floats.
 */
export function edgeStaticValues(
    look: EdgeStaticLook,
    shader?: { readonly row: number; readonly varying: readonly number[] },
): Float32Array {
    const out = new Float32Array(EDGE_STATIC_FLOATS);
    out.set(look.colorA, 0);
    out.set(look.colorB, 4);
    out.set(shader?.varying ?? [0, 0, 0, 0], 8);
    out.set([look.seed, shader?.row ?? 0, look.bits, look.taper], 12);
    out.set([...look.times, 0], 16);
    return out;
}

/**
 * The varying parameters as a slot's `vec4`.
 * @param params - The shader's parameters.
 * @param values - The values over the defaults.
 * @returns Four floats.
 */
function varying(params: readonly ShaderParamDescriptor[], values: ShaderParams | undefined): number[] {
    const out = [0, 0, 0, 0];
    for (const [name, slot] of varyingSlots(params)) {
        const param = params.find((each) => each.name === name);
        if (param !== undefined) {
            out[slot] = uniformValueOf(param, values?.[name])[0];
        }
    }

    return out;
}
