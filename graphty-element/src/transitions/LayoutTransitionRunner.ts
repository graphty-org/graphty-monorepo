/**
 * @file Runs the graph's layout transition: where each node is drawn while it travels from the
 * layout it was in to the one just built (design/rendering/shader-styles.md section 3.7).
 *
 * The layout's answer is never changed: `session.positions`, a saved project and picking read it at
 * once. Only the drawn picture moves, through the one place a node's mesh is moved
 * (`Node.update` -> `setMeshPosition`), so every edge, label, arrowhead and effect follows it.
 *
 * The clock starts on the first frame a node's new place differs from where it was drawn, not when
 * the layout is built, so a layout that computes for a while (in a worker) still moves over its
 * whole duration once its answer arrives.
 */

import type { Scene } from "@babylonjs/core/scene";

import type { Vec3 } from "../camera/types";
import { resolveOptionValues } from "../catalog/options";
import type { LayoutTransitionConfig } from "../config/GraphStyle";
import type { Edge } from "../Edge";
import { GraphtyLogger, type Logger } from "../logging/GraphtyLogger.js";
import type { RenderQuality } from "../session/shaders";
import { ParticleDrawable } from "./ParticleDrawable";
import { easeInOut } from "./presets/glide";
import { type RegisteredTransition, transitionById, type TransitionNode } from "./registry";

/** A transition's duration when `seconds` is not set. */
export const DEFAULT_TRANSITION_SECONDS = 0.8;

/** A move shorter than this, in scene units, is no move: the clock does not start for it. */
const STILL = 1e-6;

/** What the runner moves: the part of a node it reads and writes. */
export interface TransitionSubject {
    readonly index: number;
    readonly mesh: {
        readonly position: Vec3;
        /** The mesh's scale: a particle transition shrinks the node while its cloud is in flight. */
        readonly scaling?: { readonly x: number; setAll(value: number): unknown };
        computeWorldMatrix(force?: boolean): unknown;
    };
    readonly drawnRadius: number;
    readonly paintedColor: { r: number; g: number; b: number; a: number } | null;
    setMeshPosition(x: number, y: number, z: number): void;
}

/** What the runner asks of the graph. */
export interface TransitionHost {
    /** The scene the graph draws in now; a renderer swap replaces it. */
    scene(): Scene;
    /** The graph's `layoutTransition` setting. */
    config(): LayoutTransitionConfig | undefined;
    /** The shader quality, whose motion and level the transition follows. */
    quality(): RenderQuality;
    /** Every node the layout places. */
    nodes(): Iterable<TransitionSubject>;
    /** Every edge, for the hops from the selection. */
    edges(): Iterable<Pick<Edge, "srcNode" | "dstNode">>;
    /** The selected nodes. */
    selected(): readonly TransitionSubject[];
    /** Whether the layout is still running. */
    layoutRunning(): boolean;
}

const logger: Logger = GraphtyLogger.getLogger(["graphty", "layout", "transition"]);

/** One moving node. */
interface Mover {
    readonly from: Vec3;
    /** Where the layout puts it, as of the last frame. */
    readonly to: { x: number; y: number; z: number };
    /** Where it was drawn on the last frame. */
    readonly drawn: { x: number; y: number; z: number };
    readonly info: TransitionNode;
    /** The mesh's scale before the move, which a shrunken node is put back to. */
    readonly scale: number;
    /** How far along its own way the node was drawn on the last frame, 0..1. */
    travel: number;
}

/** A box, corner to corner. */
export interface TransitionBox {
    readonly min: Vec3;
    readonly max: Vec3;
}

/** A transition taken: what moves, and how. */
export interface TransitionSnapshot {
    readonly transition: RegisteredTransition;
    readonly params: Readonly<Record<string, unknown>>;
    readonly durationMs: number;
    readonly movers: Map<TransitionSubject, Mover>;
}

/** The runner of each scene, for picking. */
const runners = new WeakMap<Scene, LayoutTransitionRunner>();

/** The runner of each layout manager. */
const owners = new WeakMap<object, LayoutTransitionRunner>();

/**
 * The layout transition of a graph, found from its layout manager: what `Node.update`, the update
 * loop and the layout build ask where a node is drawn while it moves.
 * @param layoutManager - The graph's layout manager.
 * @returns Its runner, or undefined for a manager with no renderer.
 */
export function transitionsOf(layoutManager: object): LayoutTransitionRunner | undefined {
    return owners.get(layoutManager);
}

/**
 * Give a graph's layout manager its transition runner.
 * @param layoutManager - The graph's layout manager.
 * @param runner - The runner.
 */
export function attachTransitions(layoutManager: object, runner: LayoutTransitionRunner): void {
    owners.set(layoutManager, runner);
}

/**
 * Run a pick against the layout's answer rather than the moving picture.
 * @param scene - The scene picked in.
 * @param pick - The pick.
 * @returns What the pick returned.
 */
export function pickAtLayout<T>(scene: Scene, pick: () => T): T {
    const runner = runners.get(scene);
    return runner === undefined ? pick() : runner.atLayout(pick);
}

/**
 * A stable number in 0..1 for an index.
 * @param index - The index.
 * @returns The number.
 */
function seedOf(index: number): number {
    const x = Math.sin((index + 1) * 12.9898) * 43758.5453;
    return x - Math.floor(x);
}

/**
 * How many hops each node is from the selection, as a fraction of the farthest reached.
 * @param host - The graph.
 * @param nodes - The nodes.
 * @returns Each node's fraction (1 when not reached), or null when nothing is selected.
 */
function hopsFromSelection(
    host: TransitionHost,
    nodes: readonly TransitionSubject[],
): Map<TransitionSubject, number> | null {
    const selected = host.selected();
    if (selected.length === 0) {
        return null;
    }

    const neighbors = new Map<TransitionSubject, TransitionSubject[]>();
    const link = (a: TransitionSubject, b: TransitionSubject): void => {
        let list = neighbors.get(a);
        if (list === undefined) {
            list = [];
            neighbors.set(a, list);
        }

        list.push(b);
    };
    for (const edge of host.edges()) {
        link(edge.srcNode, edge.dstNode);
        link(edge.dstNode, edge.srcNode);
    }

    const hops = new Map<TransitionSubject, number>(selected.map((node) => [node, 0]));
    let frontier = [...selected];
    let depth = 0;
    while (frontier.length > 0) {
        depth++;
        const next: TransitionSubject[] = [];
        for (const node of frontier) {
            for (const other of neighbors.get(node) ?? []) {
                if (!hops.has(other)) {
                    hops.set(other, depth);
                    next.push(other);
                }
            }
        }

        frontier = next;
    }

    const farthest = Math.max(1, depth - 1);
    return new Map(nodes.map((node) => [node, Math.min(1, (hops.get(node) ?? farthest) / farthest)]));
}

/**
 * Whether a point is a usable position.
 * @param at - The point.
 * @returns True when every coordinate is finite.
 */
function finite(at: Vec3 | undefined): at is Vec3 {
    return at !== undefined && Number.isFinite(at.x) && Number.isFinite(at.y) && Number.isFinite(at.z);
}

/**
 * How far the nodes reach from their middle, before and after the move.
 * @param movers - Every move.
 * @returns The largest distance from the middle, in scene units.
 */
function extentOf(movers: Iterable<Mover>): number {
    const points = [...movers].flatMap((mover) => [mover.from, mover.to]);
    const n = Math.max(1, points.length);
    const mid = points.reduce((sum, at) => ({ x: sum.x + at.x / n, y: sum.y + at.y / n, z: sum.z + at.z / n }), {
        x: 0,
        y: 0,
        z: 0,
    });
    return points.reduce((far, at) => Math.max(far, Math.hypot(at.x - mid.x, at.y - mid.y, at.z - mid.z)), 0);
}

/**
 * How far along its own way a node is drawn: the share of the distance from where it left to
 * where it lands. A node that does not move follows the transition's clock.
 * @param mover - The move, with this frame's drawn place.
 * @param t - The transition's progress, 0..1.
 * @returns 0 where it left, 1 where it lands.
 */
function travelOf(mover: Mover, t: number): number {
    const { from, to, drawn } = mover;
    const way = Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z);
    if (way < STILL) {
        return t;
    }

    return Math.min(1, Math.hypot(drawn.x - from.x, drawn.y - from.y, drawn.z - from.z) / way);
}

/**
 * The scale a node is drawn at this frame under a particle transition. The node gives way to its
 * cloud: gone at the height of the burst, whole where it left and where it lands.
 *
 * ponytail: `layoutBehavior.node.depthIndependentSize` rescales every node after the move and so
 * keeps them whole; a scale both multiply into, if that pairing is ever wanted.
 * @param mover - The move.
 * @returns The scale.
 */
function drawnScale(mover: Mover): number {
    return mover.scale * (1 - Math.sin(Math.PI * mover.travel)) ** 3;
}

/** The graph's layout transition: idle until a layout changes with `layoutTransition` set. */
export class LayoutTransitionRunner {
    private state: (TransitionSnapshot & { start: number | null }) | null = null;
    private now = 0;
    private drawable: ParticleDrawable | null = null;

    /**
     * Serve one graph.
     * @param host - What the runner asks of the graph.
     */
    constructor(private readonly host: TransitionHost) {}

    /**
     * Whether a transition is under way: the picture is still moving, or about to.
     * @returns True until the last frame of the move has been placed.
     */
    get active(): boolean {
        return this.state !== null;
    }

    /**
     * Take where every node is drawn now, before a new layout replaces the old one.
     * @returns The snapshot, or null when no transition is set, motion is off, or the setting
     *   names a transition this page does not have.
     */
    snapshot(): TransitionSnapshot | null {
        const config = this.host.config();
        if (config === undefined || this.host.quality().motion === "still") {
            return null;
        }

        const transition = transitionById(config.transition);
        if (transition === undefined) {
            logger.warn("The layout transition is not registered; the new layout is drawn in one frame", {
                code: "transition.unknown",
                transition: config.transition,
            });
            return null;
        }

        let params: Readonly<Record<string, unknown>>;
        try {
            params = resolveOptionValues(transition.descriptor.params, config.params ?? {}, {
                kind: "transition",
                id: config.transition,
            });
        } catch (error) {
            logger.warn("The layout transition refused its parameters; the new layout is drawn in one frame", {
                code: "transition.params",
                transition: config.transition,
                error: error instanceof Error ? error.message : String(error),
            });
            return null;
        }

        const seconds = config.seconds ?? DEFAULT_TRANSITION_SECONDS;
        if (seconds <= 0) {
            return null;
        }

        const nodes = [...this.host.nodes()];
        const from = nodes.map((node) => ({
            x: node.mesh.position.x,
            y: node.mesh.position.y,
            z: node.mesh.position.z,
        }));
        const center = { x: 0, y: 0, z: 0 };
        for (const at of from) {
            center.x += at.x / Math.max(1, from.length);
            center.y += at.y / Math.max(1, from.length);
            center.z += at.z / Math.max(1, from.length);
        }

        const distances = from.map((at) => Math.hypot(at.x - center.x, at.y - center.y, at.z - center.z));
        const farthest = Math.max(STILL, ...distances);
        const hops = hopsFromSelection(this.host, nodes);
        const movers = new Map<TransitionSubject, Mover>();
        nodes.forEach((node, i) => {
            movers.set(node, {
                from: Object.freeze(from[i]),
                to: { ...from[i] },
                drawn: { ...from[i] },
                info: Object.freeze({
                    index: node.index,
                    seed: seedOf(node.index),
                    hopFromSelection: hops?.get(node),
                    distanceFromCenter: distances[i] / farthest,
                }),
                scale: node.mesh.scaling?.x ?? 1,
                travel: 0,
            });
        });

        return { transition, params, durationMs: seconds * 1000, movers };
    }

    /**
     * Start moving from a snapshot: the new layout is built.
     * @param snapshot - What {@link LayoutTransitionRunner.snapshot} took before it was.
     */
    begin(snapshot: TransitionSnapshot | null): void {
        this.end();
        if (snapshot !== null && snapshot.movers.size > 0) {
            this.state = { ...snapshot, start: null };
            runners.set(this.host.scene(), this);
        }
    }

    /** Read the clock once for the frame, so every node of it is placed at the same moment. */
    beginPass(): void {
        this.now = performance.now();
    }

    /**
     * Where to draw a node this frame.
     * @param node - The node.
     * @param to - Where the layout puts it.
     * @param to.x - X.
     * @param to.y - Y.
     * @param to.z - Z.
     * @returns Where to draw it: `to` itself when nothing moves it.
     */
    place<T extends { x: number; y: number; z?: number }>(node: TransitionSubject, to: T): T | Vec3 {
        const { state } = this;
        const mover = state?.movers.get(node);
        if (state === null || mover === undefined) {
            return to;
        }

        mover.to.x = to.x;
        mover.to.y = to.y;
        mover.to.z = to.z ?? 0;
        if (state.start === null) {
            const { from } = mover;
            if (Math.hypot(mover.to.x - from.x, mover.to.y - from.y, mover.to.z - from.z) < STILL) {
                return to;
            }

            state.start = this.now;
        }

        const t = (this.now - state.start) / state.durationMs;
        let at: Vec3 | undefined = mover.to;
        if (t < 1) {
            try {
                at = state.transition.move(Math.max(0, t), mover.from, { ...mover.to }, mover.info, state.params);
            } catch {
                at = undefined;
            }
        }

        const drawn = finite(at) ? at : mover.to;
        mover.drawn.x = drawn.x;
        mover.drawn.y = drawn.y;
        mover.drawn.z = drawn.z;
        mover.travel = t >= 1 ? 1 : travelOf(mover, t);
        if (state.transition.descriptor.drawable === "particles") {
            node.mesh.scaling?.setAll(drawnScale(mover));
        }

        return drawn;
    }

    /**
     * The box a framing camera frames this frame while the nodes move: the box measured on the
     * picture, grown to take in where the nodes are on their way, eased from where they left to
     * where they land. It starts as the old layout's box and ends as the new one's, so the camera
     * neither loses a node mid-move nor jumps when the move ends.
     * @param measured - The box measured on the drawn picture, nodes and labels.
     * @returns The box to frame; `measured` itself when nothing moves.
     */
    framing(measured: TransitionBox): TransitionBox {
        const { state } = this;
        if (state?.start === null || state === null) {
            return measured;
        }

        const e = easeInOut(Math.min(1, Math.max(0, (this.now - state.start) / state.durationMs)));
        // Copied coordinate by coordinate: a Babylon vector keeps them behind getters.
        const min = { x: measured.min.x, y: measured.min.y, z: measured.min.z };
        const max = { x: measured.max.x, y: measured.max.y, z: measured.max.z };
        for (const axis of ["x", "y", "z"] as const) {
            // The centers' box where it left, where it lands and where it is drawn.
            const box = { from: [Infinity, -Infinity], to: [Infinity, -Infinity], drawn: [Infinity, -Infinity] };
            for (const mover of state.movers.values()) {
                for (const key of ["from", "to", "drawn"] as const) {
                    box[key][0] = Math.min(box[key][0], mover[key][axis]);
                    box[key][1] = Math.max(box[key][1], mover[key][axis]);
                }
            }

            // The measured box already reaches past the drawn centers by the nodes and labels; it
            // grows by however far the eased box is past them.
            const low = box.from[0] + (box.to[0] - box.from[0]) * e;
            const high = box.from[1] + (box.to[1] - box.from[1]) * e;
            min[axis] += Math.min(0, low - box.drawn[0]);
            max[axis] += Math.max(0, high - box.drawn[1]);
        }

        return { min, max };
    }

    /** After every node of the frame is placed: the move ends once its last frame is drawn. */
    endPass(): void {
        const { state } = this;
        if (state === null) {
            return;
        }

        if (state.start === null) {
            // Nothing has moved, and the layout has finished: there is nothing to move.
            if (!this.host.layoutRunning()) {
                this.end();
            }

            return;
        }

        const t = (this.now - state.start) / state.durationMs;
        if (t >= 1) {
            this.end();
            return;
        }

        // Built after the first frame of the move has placed every node, so it knows where they go.
        this.drawable ??= this.startDrawable(state);
        this.drawable?.update(this.now / 1000, state.movers.entries());
    }

    /**
     * Run something with every moving node at its place in the new layout, then put the picture back.
     *
     * ponytail: moves each moving node's mesh twice per pick (a pointer move picks once); a pick
     * against a position table instead of the meshes, if a graph of 100,000 moving nodes ever
     * hitches on hover.
     * @param pick - What to run: a pick.
     * @returns What it returned.
     */
    atLayout<T>(pick: () => T): T {
        const { state } = this;
        if (state?.start === null || state === null) {
            return pick();
        }

        const moved: [TransitionSubject, Mover][] = [];
        const shrinks = state.transition.descriptor.drawable === "particles";
        for (const [node, mover] of state.movers) {
            const { drawn, to } = mover;
            if (drawn.x !== to.x || drawn.y !== to.y || drawn.z !== to.z) {
                node.setMeshPosition(to.x, to.y, to.z);
                if (shrinks) {
                    // Picked at its whole size, not shrunk into its cloud.
                    node.mesh.scaling?.setAll(mover.scale);
                }

                // Forced: between two frames Babylon keeps the world matrix of the last frame
                // drawn, so a pick would still see the node where it is drawn.
                node.mesh.computeWorldMatrix(true);
                moved.push([node, mover]);
            }
        }

        try {
            return pick();
        } finally {
            for (const [node, mover] of moved) {
                const { drawn } = mover;
                node.setMeshPosition(drawn.x, drawn.y, drawn.z);
                if (shrinks) {
                    node.mesh.scaling?.setAll(drawnScale(mover));
                }

                node.mesh.computeWorldMatrix(true);
            }
        }
    }

    /** Stop moving: nodes are drawn where their layout puts them from the next frame. */
    end(): void {
        if (this.state?.transition.descriptor.drawable === "particles") {
            for (const [node, mover] of this.state.movers) {
                node.mesh.scaling?.setAll(mover.scale);
            }
        }

        this.state = null;
        this.drawable?.dispose();
        this.drawable = null;
    }

    /** Let go of the scene. */
    dispose(): void {
        this.end();
        const scene = this.host.scene();
        if (runners.get(scene) === this) {
            runners.delete(scene);
        }
    }

    /**
     * Build the transition's drawing, when it has one, as the move starts.
     * @param state - The transition.
     * @returns The drawing, or null when the transition has none.
     */
    private startDrawable(state: TransitionSnapshot): ParticleDrawable | null {
        if (state.transition.descriptor.drawable !== "particles") {
            return null;
        }

        return new ParticleDrawable(this.host.scene(), [...state.movers.entries()], {
            particles: typeof state.params.particles === "number" ? state.params.particles : undefined,
            curl: typeof state.params.curl === "number" ? state.params.curl : undefined,
            level: this.host.quality().level,
            extent: extentOf(state.movers.values()),
        });
    }
}
