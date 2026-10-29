/**
 * @file How a graph's nodes draw their shaders (design/rendering/shader-styles.md section 5): which
 * of the three paths draws a node's surface or sprite, the per-element data every node shader
 * reads, the state stamps, the entrance rate limits and the effects.
 *
 * Three paths, chosen here and never by a consumer:
 *
 * - **Impostor batch** (`NodeBillboardBatch`): a surface on a round node, ray-cast on a
 *   camera-facing square, and every sprite. The node's mesh stays as an invisible pick proxy.
 * - **Mesh path** (`NodeShaderPlugin`): a surface on any other shape, on the node's own mesh.
 * - **Effect batch** (`NodeEffectBatch`): each effect, a second square around the node.
 *
 * **Nothing loads until a node names a shader.** This module holds no GLSL; the batches and the
 * plugin are imported the first time one is needed, with the shader runtime. Until a shader has
 * resolved and its program compiled, the node draws exactly what the layers beneath draw.
 *
 * **Per-element data** lives in two float textures: the parameter sets, one row per distinct set
 * of a shader's fixed values, and the state times, two texels per node (selected, hovered,
 * pinned, entered; exited, changed), written only when a state changes and uploaded once per
 * frame. Each node carries (seed, parameter-set row, state bits, state-time row) and its up to
 * four varying parameters as two `vec4`s.
 *
 * **Entrances.** A node plays an entrance when it starts carrying a shader or effect because of
 * something that happened to it -- it was selected, hovered, pinned, its data changed or it arrived
 * -- never because a layer was added or edited. An entrance never restarts within its own duration
 * on the same element, and at most {@link ENTRANCE_CAP} elements per shader play theirs at once;
 * the rest show the end state.
 */

import {
    type AbstractMesh,
    Constants,
    Frustum,
    type InstancedMesh,
    type Mesh,
    RawTexture,
    type Scene,
} from "@babylonjs/core";

import {
    drawingOf,
    fixedParamsOf,
    motionOf,
    type ShaderParamDescriptor,
    type ShaderParams,
    type ShaderPlace,
    type ShaderUse,
    timingOf,
} from "../catalog/shaders";
import type { Rgba } from "../catalog/types";
import { animatesEveryFrame } from "../managers/everyFrameAnimations";
import { trackOnScene } from "../managers/PendingWork";
import { type HostShader, shadersControllerOf } from "../session/shaders";
import { drawnUses } from "../session/styles/channels";
import type { GraphSession } from "../session/types";
import type { LazyShaderHost } from "../shaders/chunk";
import {
    PARAM_TEXTURE,
    PARAM_TEXTURE_WIDTH,
    STATE_NODES_PER_ROW,
    STATE_TEXELS,
    STATE_TEXTURE,
    uniformValueOf,
    varyingSlots,
} from "../shaders/runtime/nodeLayout";
import type { ShaderRuntime } from "../shaders/runtime/ShaderRuntime";
import { batchUploadFrames } from "./FrameRoster";
import type { NodeBillboardBatch, SlotValues, SquarePlace } from "./NodeBillboardBatch";
import type { NodeEffectBatch } from "./NodeEffectBatch";

/** The most elements per shader that play their entrance at once. */
export const ENTRANCE_CAP = 64;

/** How recently something must have happened to a node for a shader it starts carrying to enter. */
const CAUSE_WINDOW_MS = 400;

/** The stamp of a state that never changed. */
const NEVER = -1;

/** The state bits a node carries. */
const STATE_BITS = { selected: 1, hovered: 2, pinned: 4 } as const;

/** A state a node stamps. */
export type NodeShaderState = keyof typeof STATE_BITS;

/** The column of each stamp in a node's two state texels. */
const STAMP_COLUMN = { selected: 0, hovered: 1, pinned: 2, entered: 3, exited: 4, changed: 5 } as const;

/**
 * Which path draws a node's `paint` or `replace` use: an impostor (`paint` on a round node), the
 * square in place of the node (`replace`), or the node's own mesh (`paint` on any other shape).
 */
export type SurfacePath = "impostor" | "replace" | "mesh";

/** What a node hands the drawing on every paint. */
export interface NodeShaderLook {
    /** The node's mesh (an instance of its source). */
    readonly mesh: AbstractMesh;
    /** The node's resolved shader uses (`node.shaders`). */
    readonly uses: readonly ShaderUse[] | undefined;
    /** The path its mesh was built for, or null when its surface is drawn plainly. */
    readonly path: SurfacePath | null;
    /** The resolved color, 0..255 per channel. */
    readonly color: Rgba;
    /** The resolved opacity. */
    readonly opacity: number;
    /** The drawn radius, in graph-root units. */
    readonly radius: number;
    /** Whether the node is drawn at all. */
    readonly drawn: boolean;
    /** The halo the batch draws, or null. */
    readonly halo: { readonly color: string; readonly scale: number; readonly opacity: number } | null;
    /** The outline ring's color, or null. */
    readonly ring: string | null;
    /** The glow, or null. */
    readonly glow: { readonly color: string; readonly strength: number } | null;
}

/** What the drawing needs from a node: its id, its mesh and a way to be drawn again. */
export interface ShadedNode {
    readonly id: string | number;
    readonly mesh: AbstractMesh;
    /** Draw the node again from the paint it holds, because a shader it names became drawable. */
    refreshShaderPaint(): void;
    /** Its selected, hovered and pinned states now, as the state bits; read when it first draws a shader. */
    shaderStateBits?(): number;
}

/** The lazily loaded renderer. */
interface Renderer {
    readonly NodeBillboardBatch: typeof NodeBillboardBatch;
    readonly NodeEffectBatch: typeof NodeEffectBatch;
    readonly attachNodeShader: typeof import("./NodeShaderPlugin").attachNodeShader;
    readonly writeNodeShaderAttributes: typeof import("./NodeShaderPlugin").writeNodeShaderAttributes;
}

/** One shader as this drawing knows it. */
interface Known {
    /** Null until resolved; then the shader, or null when it may not draw. */
    shader: HostShader | null | undefined;
    /** Nodes drawn plainly until it can draw. */
    readonly waiting: Set<ShadedNode>;
    /** When the first of the nodes now waiting began to wait (performance.now()). */
    waitingSince: number;
}

/** A batch and whether its program compiled. */
interface BatchEntry {
    readonly batch: NodeBillboardBatch;
    ready: boolean | undefined;
}

/** A node's place in a batch. */
interface Slot {
    /** The shader id. */
    readonly id: string;
    /** The use's fixed parameter values. */
    params: ShaderParams | undefined;
    readonly batch: NodeBillboardBatch;
    readonly index: number;
    /** The entered stamp, or NEVER: at rest. */
    entered: number;
    /** The exited stamp while an exit plays, else NEVER. */
    exited: number;
    /** When an exit ends, by `performance.now()`, or 0. */
    exitEnds: number;
}

/** What the drawing holds per node. */
interface Entry {
    readonly node: ShadedNode;
    readonly seed: number;
    readonly row: number;
    bits: number;
    /** When something last happened to the node (a state, its data, its arrival). */
    causedAt: number;
    look: NodeShaderLook | null;
    surface: Slot | null;
    /** The id drawn on the mesh path, or null. */
    meshShader: string | null;
    /** The stacking uses (over, around, behind), by {@link useKey}. */
    readonly effects: Map<string, Slot>;
}

/** The drawing of each scene. */
const DRAWINGS = new WeakMap<Scene, NodeShaderDrawing>();

/** The bulk repaint each scene's update manager lends; see {@link NodeShaderDrawing.lendRepaint}. */
const REPAINTS = new WeakMap<Scene, (nodes: readonly ShadedNode[]) => void>();

/** One stacking use a node draws: the use and its place. */
interface WantedUse {
    readonly use: ShaderUse;
    readonly place: SquarePlace;
}

/**
 * The stacking uses a node's look wants drawn (over, around, behind), keyed by place, shader and
 * how many uses of that shader at that place come before it, so two uses of one shader draw apart
 * and keep their slots across repaints. None when the node is not drawn.
 * @param look - The node's look.
 * @returns The uses by key.
 */
function wantedUses(look: NodeShaderLook): Map<string, WantedUse> {
    const wanted = new Map<string, WantedUse>();
    if (!look.drawn) {
        return wanted;
    }

    const seen = new Map<string, number>();
    for (const { use, place } of drawnUses(look.uses).stacked) {
        const base = `${place}|${use.shader}`;
        const nth = seen.get(base) ?? 0;
        seen.set(base, nth + 1);
        wanted.set(`${base}|${String(nth)}`, { use, place: place as SquarePlace });
    }

    return wanted;
}

/**
 * A stable 0..1 random per node id.
 * @param id - The node id.
 * @returns The seed.
 */
function seedOf(id: string | number): number {
    let hash = 0x811c9dc5;
    const text = String(id);
    for (let i = 0; i < text.length; i++) {
        hash = Math.imul(hash ^ text.charCodeAt(i), 0x01000193); // NOSONAR(S7758): hashes UTF-16 code units; codePointAt would change the seed of ids outside the BMP
    }

    return (hash >>> 0) / 0xffffffff;
}

/**
 * A `#rrggbb` color as one float, r * 65536 + g * 256 + b, exact in float32.
 * @param hex - The color.
 * @returns The packed color, 0 for anything else.
 */
function packHex(hex: string): number {
    const match = /^#([\da-f]{6})/i.exec(hex);
    return match === null ? 0 : Number.parseInt(match[1], 16);
}

/**
 * The parameter-set and state-time textures of one scene.
 */
export class NodeShaderData {
    readonly paramSampler = PARAM_TEXTURE;
    readonly stateSampler = STATE_TEXTURE;
    paramTexture: RawTexture;
    stateTexture: RawTexture;
    private params = new Float32Array(PARAM_TEXTURE_WIDTH * 4 * 16);
    private states = new Float32Array(STATE_NODES_PER_ROW * STATE_TEXELS * 4 * 4).fill(NEVER);
    private readonly paramRows = new Map<string, number>();
    private stateRows = 0;
    private readonly freeStateRows: number[] = [];
    private dirty = false;
    private readonly rebuilt = new Set<() => void>();
    private readonly stopFlush: () => void;

    /**
     * Build the textures.
     * @param scene - The scene.
     */
    constructor(private readonly scene: Scene) {
        this.paramTexture = this.texture(this.params, PARAM_TEXTURE_WIDTH);
        this.stateTexture = this.texture(this.states, STATE_NODES_PER_ROW * STATE_TEXELS);
        this.stopFlush = batchUploadFrames.join(scene, () => {
            this.flush();
        });
    }

    /**
     * Listen for the textures being replaced (they grew).
     * @param listener - Called after.
     * @returns Stops listening.
     */
    onRebuilt(listener: () => void): () => void {
        this.rebuilt.add(listener);
        return () => {
            this.rebuilt.delete(listener);
        };
    }

    /**
     * The row of a shader's fixed parameter values, written the first time the set is seen.
     *
     * ponytail: rows are never freed; a reader dragging a slider through a thousand values leaves
     * a thousand rows (16 KB per thousand). Reference-count rows if that ever matters.
     * @param id - The shader id.
     * @param params - Its parameters.
     * @param values - The values over its defaults.
     * @returns The row.
     */
    paramRow(id: string, params: readonly ShaderParamDescriptor[], values: ShaderParams | undefined): number {
        const slots = varyingSlots(params);
        const fixed = params.map((param) => (slots.has(param.name) ? 0 : uniformValueOf(param, values?.[param.name])));
        const key = `${id}\u0000${JSON.stringify(fixed)}`;
        const known = this.paramRows.get(key);
        if (known !== undefined) {
            return known;
        }

        const row = this.paramRows.size;
        if ((row + 1) * PARAM_TEXTURE_WIDTH * 4 > this.params.length) {
            const grown = new Float32Array(this.params.length * 2);
            grown.set(this.params);
            this.params = grown;
            this.paramTexture.dispose();
            this.paramTexture = this.texture(this.params, PARAM_TEXTURE_WIDTH);
            this.announceRebuilt();
        }

        fixed.forEach((value, column) => {
            if (Array.isArray(value)) {
                this.params.set(value, (row * PARAM_TEXTURE_WIDTH + column) * 4);
            }
        });
        this.paramRows.set(key, row);
        this.dirty = true;
        return row;
    }

    /**
     * Take a state-time row for a node.
     * @returns The row.
     */
    takeStateRow(): number {
        const free = this.freeStateRows.pop();
        if (free !== undefined) {
            this.states.fill(NEVER, free * STATE_TEXELS * 4, (free + 1) * STATE_TEXELS * 4);
            this.dirty = true;
            return free;
        }

        const row = this.stateRows++;
        if ((row + 1) * STATE_TEXELS * 4 > this.states.length) {
            const grown = new Float32Array(this.states.length * 2).fill(NEVER);
            grown.set(this.states);
            this.states = grown;
            this.stateTexture.dispose();
            this.stateTexture = this.texture(this.states, STATE_NODES_PER_ROW * STATE_TEXELS);
            this.announceRebuilt();
        }

        return row;
    }

    /**
     * Give a node's row back.
     * @param row - The row.
     */
    freeStateRow(row: number): void {
        this.freeStateRows.push(row);
    }

    /**
     * Stamp one state time in a node's row.
     * @param row - The row.
     * @param stamp - Which time.
     * @param time - The scene time, or NEVER.
     */
    stamp(row: number, stamp: keyof typeof STAMP_COLUMN, time: number): void {
        this.states[row * STATE_TEXELS * 4 + STAMP_COLUMN[stamp]] = time;
        this.dirty = true;
    }

    /** Upload what changed, once per frame. */
    flush(): void {
        if (!this.dirty && !batchUploadFrames.isRestoring(this.scene)) {
            return;
        }

        this.dirty = false;
        this.paramTexture.update(this.params);
        this.stateTexture.update(this.states);
    }

    /** Release both textures. */
    dispose(): void {
        this.stopFlush();
        this.paramTexture.dispose();
        this.stateTexture.dispose();
        this.rebuilt.clear();
    }

    /**
     * A float texture over an array.
     * @param data - The texels.
     * @param width - Its width in texels.
     * @returns The texture.
     */
    private texture(data: Float32Array, width: number): RawTexture {
        return RawTexture.CreateRGBATexture(
            data,
            width,
            data.length / 4 / width,
            this.scene,
            false,
            false,
            Constants.TEXTURE_NEAREST_SAMPLINGMODE,
            Constants.TEXTURETYPE_FLOAT,
        );
    }

    /** Tell every material the textures were replaced. */
    private announceRebuilt(): void {
        for (const listener of this.rebuilt) {
            listener();
        }
    }
}

/**
 * The shader drawing of one scene's nodes.
 */
export class NodeShaderDrawing {
    private readonly known = new Map<string, Known>();
    private readonly batches = new Map<string, BatchEntry>();
    private readonly entries = new Map<ShadedNode, Entry>();
    /** Per shader id, the end times of the entrances playing now. */
    private readonly entrances = new Map<string, number[]>();
    /** Nodes that arrived and have not drawn a shader yet, with when. */
    private readonly arrivals = new WeakMap<ShadedNode, number>();
    private renderer: Renderer | null = null;
    private runtime: ShaderRuntime | null = null;
    private data: NodeShaderData | null = null;
    private readonly stopStatus: () => void;
    private stopFrames: (() => void) | null = null;
    private releaseMeshMotion: (() => void) | null = null;
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
        // A project shader that becomes drawable (approved, compiled) draws on the nodes waiting.
        this.stopStatus = session.on("shader:status", ({ id, state }) => {
            const known = this.known.get(id);
            const drawable = state === "ready" || state === "still";
            if (known?.shader === null && drawable) {
                known.shader = undefined;
                this.wake(known);
            } else if (known?.shader !== undefined && known.shader !== null && !drawable) {
                // Turned off (the frame guard, a lost context): the nodes drawing it draw what
                // the layers beneath paint, and draw it again once it is ready.
                known.shader = null;
                for (const entry of this.entries.values()) {
                    if (entry.surface?.id === id || entry.meshShader === id || entry.effects.has(id)) {
                        known.waiting.add(entry.node);
                    }
                }

                const waiting = [...known.waiting];
                const repaint = REPAINTS.get(this.scene);
                if (repaint === undefined) {
                    for (const node of waiting) {
                        node.refreshShaderPaint();
                    }
                } else {
                    repaint(waiting);
                }
            }
        });
        scene.onDisposeObservable.addOnce(() => {
            this.dispose();
        });
    }

    /**
     * The drawing of a scene, made the first time a node there names a shader.
     * @param scene - The scene.
     * @param session - The session; none means no shader can draw.
     * @returns The drawing, or null without a session or its shaders.
     */
    static of(scene: Scene, session: GraphSession | undefined): NodeShaderDrawing | null {
        const existing = DRAWINGS.get(scene);
        if (existing !== undefined) {
            return existing;
        }

        if (session === undefined || shadersControllerOf(session) === undefined) {
            return null;
        }

        const made = new NodeShaderDrawing(scene, session);
        DRAWINGS.set(scene, made);
        return made;
    }

    /**
     * Lend a scene's drawing the repaint that draws many nodes again in one pass (the update
     * manager's), used when a shader becomes drawable for the nodes waiting on it.
     * @param scene - The scene.
     * @param repaint - Draws the nodes again from their paints.
     */
    static lendRepaint(scene: Scene, repaint: (nodes: readonly ShadedNode[]) => void): void {
        REPAINTS.set(scene, repaint);
    }

    /**
     * The drawing of a scene when one was made.
     * @param scene - The scene.
     * @returns The drawing, or undefined.
     */
    static peek(scene: Scene): NodeShaderDrawing | undefined {
        return DRAWINGS.get(scene);
    }

    /**
     * Which path draws a node's `paint` or `replace` use now. Starts resolving and compiling what
     * is not ready, and draws the node again once it is; until then the node is drawn plainly.
     * @param node - The node.
     * @param id - The shader id the use names.
     * @param place - The use's place.
     * @param round - Whether the node's shape is a sphere.
     * @returns The path, or null to draw the node plainly.
     */
    surfacePath(node: ShadedNode, id: string, place: ShaderPlace, round: boolean): SurfacePath | null {
        const shader = this.resolved(id, node);
        const { descriptor } = shader?.registration ?? {};
        if (shader === null || descriptor === undefined || !(descriptor.places ?? []).includes(place)) {
            return null;
        }

        const kind = drawingOf(descriptor, place);
        if (kind === "node-paint" && !round) {
            return this.renderer !== null && !this.scene.getEngine().isWebGPU ? "mesh" : null;
        }

        if (kind !== "node-paint" && kind !== "node-replace") {
            return null;
        }

        const role = kind === "node-replace" ? "replace" : "impostor";
        return this.batchFor(role, shader, node) === null ? null : role;
    }

    /**
     * Draw a node's shaders from its paint: its `paint` or `replace` slot, its mesh-path
     * attributes and its stacking uses.
     * @param node - The node.
     * @param look - What it looks like now.
     */
    paint(node: ShadedNode, look: NodeShaderLook): void {
        if (this.disposed) {
            return;
        }

        const { stacked } = drawnUses(look.uses);
        const entry = this.entries.get(node);
        if (entry === undefined && look.path === null && stacked.length === 0) {
            return;
        }

        if (this.runtime === null || this.data === null || this.renderer === null) {
            // Nothing loaded yet: a stacking use starts the load and draws the node again after.
            for (const { use } of stacked) {
                this.resolved(use.shader, node);
            }

            return;
        }

        const current = entry ?? this.entryOf(node);
        current.look = look;
        this.paintSurface(current, look);
        this.paintEffects(current, look);
    }

    /**
     * A node moved: move its slots.
     * @param node - The node.
     * @param x - x in graph-root space.
     * @param y - y.
     * @param z - z.
     */
    moved(node: ShadedNode, x: number, y: number, z: number): void {
        const entry = this.entries.get(node);
        if (entry === undefined) {
            return;
        }

        entry.surface?.batch.move(entry.surface.index, x, y, z);
        for (const slot of entry.effects.values()) {
            slot.batch.move(slot.index, x, y, z);
        }
    }

    /**
     * A node's state changed before it had a shader drawing, and the paint that brings one
     * follows: the shader it starts carrying enters as if the change happened with the drawing.
     * @param node - The node.
     * @param cause - When the state changed (performance.now()).
     */
    noteCause(node: ShadedNode, cause: number): void {
        const entry = this.entries.get(node);
        if (entry === undefined) {
            this.causes.set(node, cause);
        } else {
            entry.causedAt = Math.max(entry.causedAt, cause);
        }
    }

    /**
     * A node's selection, hover or pin changed: stamp the time, set the bit, and draw again.
     * @param node - The node.
     * @param state - Which state.
     * @param on - Its new value.
     */
    stateChanged(node: ShadedNode, state: NodeShaderState, on: boolean): void {
        const entry = this.entries.get(node);
        if (entry === undefined || this.data === null || this.runtime === null) {
            // The node draws no shader yet (the shader may still be loading): keep the cause, so
            // the effect this change gives it enters when it first draws.
            this.causes.set(node, performance.now());
            return;
        }

        const bit = STATE_BITS[state];
        entry.bits = on ? entry.bits | bit : entry.bits & ~bit;
        entry.causedAt = performance.now();
        this.data.stamp(entry.row, state, this.runtime.uniforms.now());
        this.playTimes(entry, "times");
        this.repaint(entry);
    }

    /**
     * A node's data changed: stamp the time and play any change animation.
     * @param node - The node.
     */
    dataChanged(node: ShadedNode): void {
        const entry = this.entries.get(node);
        if (entry === undefined || this.data === null || this.runtime === null) {
            return;
        }

        entry.causedAt = performance.now();
        this.data.stamp(entry.row, "changed", this.runtime.uniforms.now());
        this.playTimes(entry, "change");
    }

    /**
     * A node arrived in a graph already drawing shaders: a shader it starts carrying enters, and
     * its `sinceChanged` counts from now.
     * @param node - The node.
     */
    arrived(node: ShadedNode): void {
        this.arrivals.set(node, performance.now());
    }

    /**
     * A node left the graph, or its drawing: free everything it holds.
     * @param node - The node.
     */
    forget(node: ShadedNode): void {
        const entry = this.entries.get(node);
        for (const known of this.known.values()) {
            known.waiting.delete(node);
        }

        if (entry === undefined) {
            return;
        }

        this.entries.delete(node);
        this.releaseSlot(entry.surface);
        for (const slot of entry.effects.values()) {
            this.releaseSlot(slot);
        }

        this.data?.freeStateRow(entry.row);
        this.updateFrames();
    }

    /**
     * What the drawing holds now, for tests and tools: entrances playing per shader, slots per
     * batch, the nodes drawn on the mesh path, and whether a frame claim is held for the mesh path.
     * @returns The counts.
     */
    stats(): {
        readonly entrances: ReadonlyMap<string, number>;
        readonly slots: ReadonlyMap<string, number>;
        readonly meshPath: number;
    } {
        const now = performance.now();
        const entrances = new Map<string, number>();
        for (const [id, ends] of this.entrances) {
            entrances.set(id, ends.filter((end) => end > now).length);
        }

        const slots = new Map<string, number>();
        for (const [key, { batch }] of this.batches) {
            slots.set(key, batch.liveCount);
        }

        let meshPath = 0;
        for (const entry of this.entries.values()) {
            meshPath += entry.meshShader === null ? 0 : 1;
        }

        return { entrances, slots, meshPath };
    }

    /**
     * Per shader id, how many nodes draw it now (on any path) and how many play its entrance at
     * this moment: what `element.drawnShaders()` reports.
     * @returns The counts, by shader id.
     */
    drawnById(): Map<string, { drawn: number; entering: number }> {
        const out = new Map<string, { drawn: number; entering: number }>();
        const count = (id: string): void => {
            const now = out.get(id) ?? { drawn: 0, entering: 0 };
            now.drawn++;
            out.set(id, now);
        };
        for (const entry of this.entries.values()) {
            if (entry.surface !== null && entry.surface !== undefined) {
                count(entry.surface.id);
            }

            if (entry.meshShader !== null) {
                count(entry.meshShader);
            }

            // The effects map is keyed by use (place, shader, position); the report is by shader.
            for (const slot of entry.effects.values()) {
                count(slot.id);
            }
        }

        for (const [id, playing] of this.stats().entrances) {
            const now = out.get(id) ?? { drawn: 0, entering: 0 };
            now.entering = playing;
            out.set(id, now);
        }

        return out;
    }

    /**
     * The shaders drawn now, of any origin, for the frame guard and the flashing check: whether a
     * heavy one is, and the text hashes of those that move by themselves.
     * @returns Whether a heavy shader draws, and the moving ones' hashes.
     */
    guardedDrawn(): { readonly heavy: boolean; readonly moving: readonly string[] } {
        let heavy = false;
        const moving = new Set<string>();
        const note = (shader: HostShader): void => {
            heavy ||= shader.heavy === true;
            const { loop } = motionOf(shader.registration.descriptor.motion);
            const { enter, exit, change } = timingOf(shader.registration.descriptor);
            if (loop !== undefined || (enter ?? 0) > 0 || (exit ?? 0) > 0 || (change ?? 0) > 0) {
                moving.add(shader.hash);
            }
        };
        for (const { batch, ready } of this.batches.values()) {
            if (ready === true && !batch.disposed && batch.liveCount > 0) {
                note(batch.shader);
            }
        }

        for (const entry of this.entries.values()) {
            const shader = entry.meshShader === null ? undefined : this.known.get(entry.meshShader)?.shader;
            if (shader !== undefined && shader !== null) {
                note(shader);
            }
        }

        return { heavy, moving: [...moving] };
    }

    /** Release every batch, texture, claim and listener. */
    dispose(): void {
        if (this.disposed) {
            return;
        }

        this.disposed = true;
        this.stopStatus();
        this.stopFrames?.();
        this.releaseMeshMotion?.();
        for (const { batch } of this.batches.values()) {
            batch.dispose();
        }

        this.batches.clear();
        this.entries.clear();
        this.data?.dispose();
        DRAWINGS.delete(this.scene);
    }

    /**
     * A shader by id, once resolved: starts resolving it (and loading the renderer and the
     * runtime) the first time, and remembers the node to draw again when it is done.
     * @param id - The id.
     * @param node - The node asking.
     * @returns The shader, or null while it is not (yet) drawable.
     */
    private resolved(id: string, node: ShadedNode): HostShader | null {
        let known = this.known.get(id);
        if (known === undefined) {
            known = { shader: undefined, waiting: new Set(), waitingSince: 0 };
            this.known.set(id, known);
        }

        if (known.shader === undefined) {
            this.waitOn(id, node);
            this.resolve(id, known);
            return null;
        }

        if (known.shader === null) {
            this.waitOn(id, node);
        }

        return known.shader;
    }

    /** The shaders being resolved now. */
    private readonly resolving = new Set<string>();

    /**
     * Resolve a shader: its text from the session, the renderer modules and the runtime.
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
        void trackOnScene(
            this.scene,
            "shader",
            "a node shader is still loading",
            Promise.all([controller.drawable(id), this.load(host)]),
        ).then(
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
     * Load the renderer modules and the runtime, once.
     * @param host - The shader host.
     * @returns Resolves when both are here.
     */
    private load(host: LazyShaderHost): Promise<void> {
        this.loading ??= Promise.all([
            import("./NodeBillboardBatch"),
            import("./NodeEffectBatch"),
            import("./NodeShaderPlugin"),
            host.runtime(),
        ]).then(([billboard, effect, plugin, runtime]) => {
            this.renderer = {
                NodeBillboardBatch: billboard.NodeBillboardBatch,
                NodeEffectBatch: effect.NodeEffectBatch,
                attachNodeShader: plugin.attachNodeShader,
                writeNodeShaderAttributes: plugin.writeNodeShaderAttributes,
            };
            this.runtime = runtime;
            this.data ??= new NodeShaderData(this.scene);
        });
        return this.loading;
    }

    private loading: Promise<void> | null = null;

    /**
     * A cause as the entrance sees it: while a wake draws the nodes that waited for a shader, a
     * cause from just before or during that wait counts as now, so the wait does not eat the
     * entrance; any other cause is unchanged.
     * @param cause - When it happened (performance.now()).
     * @returns When it counts as having happened.
     */
    private freshCause(cause: number): number {
        return this.wakingAt !== null && cause >= this.wakingAt - CAUSE_WINDOW_MS ? performance.now() : cause;
    }

    /** When a node's state last changed before it had an entry (performance.now()). */
    private readonly causes = new WeakMap<ShadedNode, number>();

    /** While a wake repaints its waiting nodes, when their wait began; else null. */
    private wakingAt: number | null = null;

    /**
     * Draw the nodes waiting on a shader again.
     * @param known - The shader's entry.
     */
    private wake(known: Known): void {
        const waiting = [...known.waiting];
        known.waiting.clear();
        // A node selected (or hovered, pinned, changed) just before or while the shader was
        // loading or compiling plays its entrance now that it can draw: the first click on a
        // fresh graph snaps a reticle in like every later one. A cause from well before the wait
        // began (a layer added over nodes selected earlier) still plays nothing.
        this.wakingAt = known.waitingSince;
        for (const node of waiting) {
            const entry = this.entries.get(node);
            if (entry !== undefined) {
                entry.causedAt = this.freshCause(entry.causedAt);
            }
        }

        const repaint = REPAINTS.get(this.scene);
        try {
            if (repaint === undefined) {
                for (const node of waiting) {
                    node.refreshShaderPaint();
                }
            } else {
                repaint(waiting);
            }
        } finally {
            this.wakingAt = null;
        }

        // A slot written into a batch that already exists changes nothing the render loop
        // watches, so a graph drawn on demand is asked for one frame.
        const release = animatesEveryFrame(this.scene);
        this.scene.onAfterRenderObservable.addOnce(release);
    }

    /**
     * The batch drawing one shader in one role, made and compiled the first time.
     * @param role - The role.
     * @param shader - The shader.
     * @param node - The node asking, drawn again once the batch compiled.
     * @returns The batch once its program compiled, else null.
     */
    private batchFor(
        role: "impostor" | "replace" | SquarePlace,
        shader: HostShader,
        node: ShadedNode,
    ): NodeBillboardBatch | null {
        const key = `${role}|${shader.id}|${shader.hash}`;
        const existing = this.batches.get(key);
        if (existing !== undefined) {
            if (existing.ready !== true) {
                this.waitOn(shader.id, node);
            }

            return existing.ready === true ? existing.batch : null;
        }

        const { renderer, runtime, data } = this;
        if (renderer === null || runtime === null || data === null) {
            return null;
        }

        const batch =
            role === "impostor" || role === "replace"
                ? new renderer.NodeBillboardBatch(this.scene, role, shader, data, runtime)
                : new renderer.NodeEffectBatch(this.scene, role, shader, data, runtime);
        const entry: BatchEntry = { batch, ready: undefined };
        this.batches.set(key, entry);
        this.waitOn(shader.id, node);
        void batch.ready.then((ready) => {
            entry.ready = ready;
            runtime.noteDrawn([shader.hash]);
            const known = this.known.get(shader.id);
            if (known !== undefined) {
                this.wake(known);
            }
        });
        return null;
    }

    /**
     * Remember a node to draw again when a shader's batch is ready.
     * @param id - The shader id.
     * @param node - The node.
     */
    private waitOn(id: string, node: ShadedNode): void {
        const known = this.known.get(id);
        if (known === undefined) {
            return;
        }

        if (known.waiting.size === 0) {
            // A wait that begins while a wake repaints (the batch is made, then compiles) counts
            // from that wake, so a cause carried over from the load still plays.
            known.waitingSince = this.wakingAt ?? performance.now();
        }

        known.waiting.add(node);
    }

    /**
     * A node's entry, made the first time it draws a shader.
     * @param node - The node.
     * @returns The entry.
     */
    private entryOf(node: ShadedNode): Entry {
        const data = this.data as NodeShaderData;
        const entry: Entry = {
            node,
            seed: seedOf(node.id),
            row: data.takeStateRow(),
            bits: node.shaderStateBits?.() ?? 0,
            causedAt: Number.NEGATIVE_INFINITY,
            look: null,
            surface: null,
            meshShader: null,
            effects: new Map(),
        };
        this.entries.set(node, entry);
        const cause = this.causes.get(node);
        if (cause !== undefined) {
            this.causes.delete(node);
            entry.causedAt = this.freshCause(cause);
        }

        const arrived = this.arrivals.get(node);
        if (arrived !== undefined && this.runtime !== null) {
            this.arrivals.delete(node);
            entry.causedAt = arrived;
            data.stamp(entry.row, "changed", this.runtime.uniforms.now() - (performance.now() - arrived) / 1000);
        }

        return entry;
    }

    /**
     * Draw the node again from the look it last had: a state bit changed.
     * @param entry - The node's entry.
     */
    private repaint(entry: Entry): void {
        if (entry.look !== null) {
            this.paintSurface(entry, entry.look);
            this.paintEffects(entry, entry.look);
        }
    }

    /**
     * The surface or sprite: a batch slot, the mesh-path attributes, or nothing.
     * @param entry - The node's entry.
     * @param look - Its look.
     */
    private paintSurface(entry: Entry, look: NodeShaderLook): void {
        const surface = drawnUses(look.uses).exclusive?.use;
        const id = surface?.shader;
        const known = id === undefined ? undefined : this.known.get(id)?.shader;
        const renderer = this.renderer as Renderer;
        const data = this.data as NodeShaderData;
        if (look.path === null || known === null || known === undefined || id === undefined) {
            if (!this.keepSurfaceForExit(entry, look)) {
                this.releaseSlot(entry.surface);
                entry.surface = null;
            }

            this.setMeshShader(entry, null);
            return;
        }

        if (entry.surface !== null && entry.surface.exitEnds > 0) {
            // Back on the surface while its exit plays: a fresh slot, so its entrance plays again.
            this.endSurfaceExit(entry);
        }

        const { descriptor } = known.registration;
        const values = fixedParamsOf(surface?.params);
        const row = data.paramRow(id, descriptor.params, values);
        const params = this.varying(descriptor.params, values);
        const meta: [number, number, number, number] = [entry.seed, row, entry.bits, entry.row];

        if (look.path === "mesh") {
            this.releaseSlot(entry.surface);
            entry.surface = null;
            const source = (look.mesh as InstancedMesh).sourceMesh as Mesh | undefined;
            const runtime = this.runtime as ShaderRuntime;
            if (source !== undefined && renderer.attachNodeShader(source, known, data, runtime)) {
                renderer.writeNodeShaderAttributes(look.mesh, params, meta);
                this.setMeshShader(entry, id);
            }

            return;
        }

        this.setMeshShader(entry, null);
        const batch = this.batchFor(look.path, known, entry.node);
        if (batch === null) {
            return;
        }

        if (entry.surface?.batch !== batch) {
            this.releaseSlot(entry.surface);
            entry.surface = this.newSlot(id, batch, entry, timingOf(descriptor).enter);
            data.stamp(entry.row, "entered", entry.surface.entered);
        }

        entry.surface.params = values;

        // The node's mesh stays as the pick proxy: picked by its radius, never drawn.
        const source = (look.mesh as InstancedMesh).sourceMesh as Mesh | undefined;
        if (source !== undefined && source.visibility !== 0) {
            source.visibility = 0;
        }

        batch.write(
            entry.surface.index,
            this.slotValues(entry, look, params, meta, entry.surface),
            this.speedOf(descriptor, values, params),
        );
    }

    /**
     * Keep a node's surface or sprite drawing while its exit plays, once the node stops carrying
     * it: a frost layer on pinned nodes thaws for its exit's seconds after an unpin. The node's
     * own mesh draws its plain look beneath meanwhile.
     * @param entry - The node's entry.
     * @param look - Its look now, which names no batch-drawn shader.
     * @returns True when the slot is kept: its exit plays, or already was.
     */
    private keepSurfaceForExit(entry: Entry, look: NodeShaderLook): boolean {
        const slot = entry.surface;
        if (slot === null || slot.batch.disposed) {
            return false;
        }

        if (slot.exitEnds > 0) {
            return true;
        }

        const exit = timingOf(this.known.get(slot.id)?.shader?.registration.descriptor).exit ?? 0;
        if (exit <= 0 || !look.drawn || this.runtime === null || this.data === null) {
            return false;
        }

        slot.exited = this.runtime.uniforms.now();
        slot.exitEnds = performance.now() + exit * 1000;
        this.data.stamp(entry.row, "exited", slot.exited);
        slot.batch.playUntil(slot.index, slot.exitEnds);
        this.updateFrames();
        return true;
    }

    /**
     * Drop a surface or sprite whose exit played, or was cut short.
     * @param entry - The node's entry.
     */
    private endSurfaceExit(entry: Entry): void {
        this.releaseSlot(entry.surface);
        entry.surface = null;
        this.data?.stamp(entry.row, "exited", NEVER);
    }

    /**
     * The effects: one slot per effect id the node carries, an exit kept while it plays.
     * @param entry - The node's entry.
     * @param look - Its look.
     */
    private paintEffects(entry: Entry, look: NodeShaderLook): void {
        const wanted = wantedUses(look);
        const data = this.data as NodeShaderData;
        /** Uses whose shader may not draw now: dropped at once, with no exit. */
        const dropped = new Set<string>();
        for (const [key, use] of wanted) {
            this.paintEffect(entry, look, data, key, use, dropped);
        }

        this.retireEffects(entry, look, wanted, dropped);
        this.updateFrames();
    }

    /**
     * Draw one stacking use the node wants, in its own slot; one whose shader may not draw now is
     * added to `dropped`.
     * @param entry - The node's entry.
     * @param look - Its look.
     * @param data - The shader data.
     * @param key - The use's key (see {@link wantedUses}).
     * @param wanted - The use and its place.
     * @param dropped - Uses whose shader may not draw now.
     */
    private paintEffect(
        entry: Entry,
        look: NodeShaderLook,
        data: NodeShaderData,
        key: string,
        wanted: WantedUse,
        dropped: Set<string>,
    ): void {
        const id = wanted.use.shader;
        const shader = this.resolved(id, entry.node);
        const descriptor = shader?.registration.descriptor;
        if (shader === null || descriptor?.target !== "node" || !(descriptor.places ?? []).includes(wanted.place)) {
            if (shader === null && this.known.get(id)?.shader === null) {
                dropped.add(key);
            }

            return;
        }

        const batch = this.batchFor(wanted.place, shader, entry.node);
        if (batch === null) {
            return;
        }

        const values = fixedParamsOf(wanted.use.params);
        let slot = entry.effects.get(key);
        if (slot !== undefined && slot.batch !== batch) {
            this.releaseSlot(slot);
            slot = undefined;
        }

        slot ??= this.newSlot(id, batch, entry, timingOf(descriptor).enter);
        slot.exited = NEVER;
        slot.exitEnds = 0;
        slot.params = values;
        entry.effects.set(key, slot);
        const row = data.paramRow(id, descriptor.params, values);
        const params = this.varying(descriptor.params, values);
        const meta: [number, number, number, number] = [entry.seed, row, entry.bits, entry.row];
        batch.write(
            slot.index,
            this.slotValues(entry, look, params, meta, slot),
            this.speedOf(descriptor, values, params),
        );
    }

    /**
     * The effects the node no longer wants: each plays its exit, kept drawing until it ends, or is
     * released at once when it has none or was dropped.
     * @param entry - The node's entry.
     * @param look - Its look.
     * @param wanted - The effects the node wants.
     * @param dropped - Effects whose shader may not draw now.
     */
    private retireEffects(
        entry: Entry,
        look: NodeShaderLook,
        wanted: ReadonlyMap<string, WantedUse>,
        dropped: ReadonlySet<string>,
    ): void {
        for (const [key, slot] of entry.effects) {
            if ((wanted.has(key) && !dropped.has(key)) || (slot.exitEnds > 0 && !dropped.has(key))) {
                continue;
            }

            const exit = timingOf(this.known.get(slot.id)?.shader?.registration.descriptor).exit ?? 0;
            if (exit > 0 && look.drawn && this.runtime !== null && !dropped.has(key)) {
                // Kept drawing while its exit plays.
                slot.exited = this.runtime.uniforms.now();
                slot.exitEnds = performance.now() + exit * 1000;
                const at = slot.index;
                slot.batch.playUntil(at, slot.exitEnds);
                this.rewriteTimes(entry, look, slot);
            } else {
                this.releaseSlot(slot);
                entry.effects.delete(key);
            }
        }
    }

    /**
     * A slot's floats.
     * @param entry - The node's entry.
     * @param look - Its look.
     * @param params - The varying parameters.
     * @param meta - The meta.
     * @param slot - The slot, for an effect's own times.
     * @returns The values.
     */
    private slotValues(
        entry: Entry,
        look: NodeShaderLook,
        params: readonly [number, number, number, number],
        meta: readonly [number, number, number, number],
        slot: Slot,
    ): SlotValues {
        const { x, y, z } = look.mesh.position;
        const radius = look.drawn ? look.radius : 0;
        const effect = slot.batch.role !== "impostor" && slot.batch.role !== "replace";
        const { halo, glow } = look;
        const minSize = this.minSizeOf(slot);
        return {
            center: [x, y, z, radius],
            color: [look.color.r / 255, look.color.g / 255, look.color.b / 255, look.opacity],
            params,
            meta,
            deco0: effect
                ? [slot.entered, slot.exited, 0, minSize]
                : [halo === null ? 0 : packHex(halo.color), halo?.scale ?? 0, halo?.opacity ?? 0, minSize],
            deco1: effect
                ? [0, 0, 0, 0]
                : [
                      look.ring === null ? 0 : packHex(look.ring),
                      look.ring === null ? 0 : 1,
                      glow === null ? 0 : packHex(glow.color),
                      glow?.strength ?? 0,
                  ],
        };
    }

    /**
     * A slot's minimum on-screen size, in CSS pixels: the use's `minSize`, else its shader's
     * default, 0 for a shader that declares none.
     * @param slot - The slot.
     * @returns The size.
     */
    private minSizeOf(slot: Slot): number {
        const param = this.known
            .get(slot.id)
            ?.shader?.registration.descriptor.params.find((each) => each.name === "minSize");
        return param === undefined ? 0 : Math.max(0, uniformValueOf(param, slot.params?.minSize)[0]);
    }

    /**
     * Write an effect slot again after its times changed.
     * @param entry - The node's entry.
     * @param look - Its look.
     * @param slot - The slot.
     */
    private rewriteTimes(entry: Entry, look: NodeShaderLook, slot: Slot): void {
        const shader = this.known.get(slot.id)?.shader;
        if (shader === null || shader === undefined || this.data === null) {
            return;
        }

        const set = slot.params;
        const { descriptor } = shader.registration;
        const params = this.varying(descriptor.params, set);
        const meta: [number, number, number, number] = [
            entry.seed,
            this.data.paramRow(slot.id, descriptor.params, set),
            entry.bits,
            entry.row,
        ];
        slot.batch.write(
            slot.index,
            this.slotValues(entry, look, params, meta, slot),
            this.speedOf(descriptor, set, params),
        );
    }

    /**
     * A new slot in a batch, with its entrance decided: played when something happened to the node
     * just now and fewer than {@link ENTRANCE_CAP} play for this shader, else at rest.
     * @param id - The shader id.
     * @param batch - The batch.
     * @param entry - The node's entry.
     * @param enter - The entrance's seconds, if the shader has one.
     * @returns The slot.
     */
    private newSlot(id: string, batch: NodeBillboardBatch, entry: Entry, enter: number | undefined): Slot {
        const index = batch.acquire();
        const slot: Slot = { id, params: undefined, batch, index, entered: NEVER, exited: NEVER, exitEnds: 0 };
        const now = performance.now();
        if (enter === undefined || enter <= 0 || now - entry.causedAt > CAUSE_WINDOW_MS || this.runtime === null) {
            return slot;
        }

        const playing = (this.entrances.get(id) ?? []).filter((end) => end > now);
        if (playing.length >= ENTRANCE_CAP) {
            this.entrances.set(id, playing);
            return slot;
        }

        const ends = now + enter * 1000;
        playing.push(ends);
        this.entrances.set(id, playing);
        slot.entered = this.runtime.uniforms.now();
        batch.playUntil(index, ends);
        return slot;
    }

    /**
     * Give a slot back.
     * @param slot - The slot, or null.
     */
    private releaseSlot(slot: Slot | null): void {
        if (slot !== null && !slot.batch.disposed) {
            slot.batch.release(slot.index);
        }
    }

    /**
     * Note which shader a node draws on the mesh path, for the mesh path's frame claim.
     * @param entry - The node's entry.
     * @param id - The id, or null.
     */
    private setMeshShader(entry: Entry, id: string | null): void {
        if (entry.meshShader !== id) {
            entry.meshShader = id;
            this.updateFrames();
        }
    }

    /**
     * Play the animations a state or data change starts on a node's slots: claim frames for the
     * longest of the shader's timed motions.
     * @param entry - The node's entry.
     * @param cause - "times" for a state change, "change" for a data change.
     */
    private playTimes(entry: Entry, cause: "times" | "change"): void {
        const slots = [...entry.effects.values(), ...(entry.surface === null ? [] : [entry.surface])];
        for (const slot of slots) {
            const descriptor = this.known.get(slot.id)?.shader?.registration.descriptor;
            if (descriptor === undefined) {
                continue;
            }

            const motion = timingOf(descriptor);
            // A state change plays whatever a shader that reads the times does with them; a
            // shader that reads none has nothing to play.
            const timed = descriptor.reads?.includes("times") === true;
            const onState = timed ? Math.max(motion.enter ?? 0, motion.exit ?? 0, motion.change ?? 0, 1) : 0;
            const seconds = cause === "change" ? (motion.change ?? 0) : onState;
            if (seconds > 0) {
                slot.batch.playUntil(slot.index, performance.now() + seconds * 1000);
            }
        }
    }

    /**
     * The varying parameters as the node's `vec4`.
     * @param params - The shader's parameters.
     * @param values - The values over the defaults.
     * @returns Four floats.
     */
    private varying(
        params: readonly ShaderParamDescriptor[],
        values: ShaderParams | undefined,
    ): [number, number, number, number] {
        const out: [number, number, number, number] = [0, 0, 0, 0];
        for (const [name, slot] of varyingSlots(params)) {
            const param = params.find((each) => each.name === name);
            if (param !== undefined) {
                out[slot] = uniformValueOf(param, values?.[name])[0];
            }
        }

        return out;
    }

    /**
     * A shader's loop speed on one node: its speed parameter's value, 1 when it names none, 0 for a
     * shader that does not loop.
     * @param descriptor - The shader's facts.
     * @param descriptor.motion - Its motion.
     * @param descriptor.params - Its parameters.
     * @param values - The node's values.
     * @param varying - The node's varying values.
     * @returns The speed.
     */
    private speedOf(
        descriptor: {
            readonly motion?: Parameters<typeof motionOf>[0];
            readonly params: readonly ShaderParamDescriptor[];
        },
        values: ShaderParams | undefined,
        varying: readonly number[],
    ): number {
        const { loop } = motionOf(descriptor.motion);
        if (loop === undefined) {
            return 0;
        }

        const name = loop.speedParam;
        const param = name === undefined ? undefined : descriptor.params.find((each) => each.name === name);
        if (param === undefined) {
            return 1;
        }

        const slot = varyingSlots(descriptor.params).get(param.name);
        return slot === undefined ? uniformValueOf(param, values?.[param.name])[0] : varying[slot];
    }

    /**
     * Keep the per-frame work joined while it has work: finished exits to drop, and the mesh
     * path's frame claim for a loop on a node on screen.
     */
    private updateFrames(): void {
        const needed = [...this.entries.values()].some(
            (entry) =>
                entry.meshShader !== null ||
                (entry.surface?.exitEnds ?? 0) > 0 ||
                [...entry.effects.values()].some((slot) => slot.exitEnds > 0),
        );
        if (needed && this.stopFrames === null) {
            this.stopFrames = batchUploadFrames.join(this.scene, () => {
                this.frame();
            });
        } else if (!needed && this.stopFrames !== null) {
            this.stopFrames();
            this.stopFrames = null;
            this.releaseMeshMotion?.();
            this.releaseMeshMotion = null;
        }
    }

    /** The per-frame work: drop finished exits, and claim frames for the mesh path's loops. */
    private frame(): void {
        const now = performance.now();
        let dropped = false;
        for (const entry of this.entries.values()) {
            const { surface } = entry;
            if (surface !== null && surface.exitEnds > 0 && surface.exitEnds <= now) {
                this.endSurfaceExit(entry);
                dropped = true;
            }

            for (const [id, slot] of entry.effects) {
                if (slot.exitEnds > 0 && slot.exitEnds <= now) {
                    this.releaseSlot(slot);
                    entry.effects.delete(id);
                    dropped = true;
                }
            }
        }

        const moving = this.meshPathMoves();
        if (moving && this.releaseMeshMotion === null && this.runtime !== null) {
            this.releaseMeshMotion = this.runtime.uniforms.claimMotion();
        } else if (!moving && this.releaseMeshMotion !== null) {
            this.releaseMeshMotion();
            this.releaseMeshMotion = null;
        }

        if (dropped) {
            this.updateFrames();
        }
    }

    /**
     * Whether a looping shader drawn on the mesh path is on a node the camera can see.
     * @returns True when it needs every frame.
     */
    private meshPathMoves(): boolean {
        const camera = this.scene.activeCamera;
        let planes: ReturnType<typeof Frustum.GetPlanes> | null = null;
        for (const entry of this.entries.values()) {
            const id = entry.meshShader;
            const shader = id === null ? undefined : this.known.get(id)?.shader;
            if (shader === null || shader === undefined || entry.look === null || camera === null) {
                continue;
            }

            const { descriptor } = shader.registration;
            const values = fixedParamsOf(drawnUses(entry.look.uses).exclusive?.use.params);
            if (this.speedOf(descriptor, values, this.varying(descriptor.params, values)) === 0) {
                continue;
            }

            planes ??= Frustum.GetPlanes(camera.getTransformationMatrix());
            if (entry.node.mesh.isInFrustum(planes)) {
                return true;
            }
        }

        return false;
    }
}
