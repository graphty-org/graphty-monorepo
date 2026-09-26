import { INVALID_INDEX } from "@graphty/graph-format";
import { z } from "zod/v4";

import { publishLayoutDescriptor } from "../catalog/layoutRegistry";
import { SharedImplementationMap } from "../catalog/pluginRegistry";
import type { AuthoredLayoutDescriptor } from "../catalog/types";
import type { OptionsSchema } from "../config";
import { ElementPositions, isStorableCoordinate } from "../data/positions";
import type { Edge } from "../Edge";
import { GraphtyError } from "../errors";
import { GraphtyLogger } from "../logging/GraphtyLogger.js";
import type { Node, NodeIdType } from "../Node";

export interface Position {
    x: number;
    y: number;
    z?: number;
}

/**
 * A coordinate triple with every component present, which is the shape the position array both
 * stores and fills.
 *
 * It is spelled out inline wherever it crosses the class boundary rather than being exported,
 * because the registration surface a third party imports is assembled in `extend.ts` and nothing
 * should carry a name from here that a consumer cannot import by that name.
 */
interface Coords {
    x: number;
    y: number;
    z: number;
}

export interface EdgePosition {
    src: Position;
    dst: Position;
}

type LayoutEngineClass = new (opts: object) => LayoutEngine;
// Shared with every other copy of graphty-element on the page, so a plugin registered through one
// reaches them all.
const layoutEngineRegistry = new SharedImplementationMap<LayoutEngineClass>("layout");

/**
 * A class as {@link LayoutEngine.register} reads it: a constructor, and whatever statics it
 * happens to declare.
 *
 * Everything is optional because registration is the door a hand-written JavaScript class comes
 * through as well as a TypeScript one, and the whole point of the checks below is to name what is
 * missing rather than to file something under the string "undefined".
 */
type RegisterableLayout = LayoutEngineClass & Partial<LayoutEngineStatics>;

/**
 * The engine names the element itself ships, which is also the list of names a third party may
 * not take.
 *
 * WHY IT IS SPELLED OUT HERE rather than read from the layout catalogue, which is where the
 * element's editorial answer lives: the catalogue module imports all nineteen engine classes so it
 * can emit their options, and every one of those imports this module in order to extend
 * {@link LayoutEngine}. Importing the catalogue from here would close that loop, and a class
 * evaluated before its own base class is a "Cannot access before initialization" crash at import
 * time rather than a type error. The list is pinned against the catalogue by
 * `test/browser/extensions/layout-extension.test.ts`, so the copy cannot drift in silence.
 *
 * These nineteen are also the one exemption from the descriptor requirement: the arrangements they
 * serve are authored centrally in `src/catalog/layouts.ts`, where five engines can sit behind one
 * public arrangement name, which is a judgement the element makes about its own implementations
 * and not a shape a plugin declares.
 */
const BUILT_IN_LAYOUT_ENGINES: readonly string[] = Object.freeze([
    "arf",
    "bfs",
    "bipartite",
    "circular",
    "d3",
    "fixed",
    "forceatlas2",
    "grid",
    "kamada-kawai",
    "multipartite",
    "ngraph",
    "planar",
    "radial",
    "random",
    "shell",
    "spectral",
    "spiral",
    "spring",
    "spring-electrical",
]);

const logger = GraphtyLogger.getLogger(["graphty", "layout"]);

/**
 * The smallest weight either weighted layout is allowed to act on.
 *
 * A record may carry `weight: 0`, and both layout functions in `@graphty/layout` read a weight as
 * `getEdgeData(...) || 1`, which turns a deliberate zero into a FULL-strength edge -- the exact
 * opposite of what the author wrote, with nothing on screen to say so. Clamping here means zero
 * reads as "as close to nothing as the solver allows" in both engines: the weakest possible pull
 * in ForceAtlas2, the largest possible distance in Kamada-Kawai.
 */
export const WEIGHT_EPSILON = 1e-6;

/**
 * The key an ordered endpoint pair is filed under in a {@link LayoutEngine.pairWeights} map.
 *
 * It names a PAIR, not an edge: two parallel edges between the same two nodes share one key, and
 * that is deliberate -- see {@link LayoutEngine.pairWeights}. JSON is used rather than a separator
 * because a node id is a string or a number and may contain any character at all, so `a:b -> c`
 * and `a -> b:c` would collide under any punctuation, and `"1"` would collide with `1`.
 * @param source - the edge's source node id
 * @param target - the edge's target node id
 * @returns a key unique to that ordered pair
 */
export function pairWeightKey(source: NodeIdType, target: NodeIdType): string {
    return JSON.stringify([source, target]);
}

/**
 * How many times the element steps a simulation to settle nodes that arrived after it started.
 *
 * Ten is what the element has always done, kept here because it is now the base class's default
 * rather than a number buried in the manager.
 */
const INCREMENTAL_STEPS = 10;

/**
 * What a layout engine class declares about itself, which is what the element and a picker read
 * without constructing one.
 */
export interface LayoutEngineStatics {
    /** The name a consumer passes to `setLayout`, and the name the class is filed under. */
    type: string;
    /** The most dimensions this engine can arrange a graph in. */
    maxDimensions: number;
    /**
     * Whether this engine arranges a graph differently when its edges carry weights.
     *
     * Optional, and false for all but two of the element's own nineteen. It exists so that a
     * picker can tell a reader which arrangements the `weighted` option actually does something
     * for, instead of offering it on seventeen layouts that ignore it.
     */
    honoursWeights?: boolean;
    /**
     * What the catalogue publishes about this layout, so a picker can offer it.
     *
     * REQUIRED OF A THIRD PARTY'S ENGINE and absent from the element's own nineteen, whose
     * arrangements are authored in `src/catalog/layouts.ts` instead. `descriptor.id` must equal
     * {@link LayoutEngineStatics.type}: one key, so nothing is named twice and `layoutIdForEngine`
     * can answer a plugin's own id.
     */
    descriptor?: AuthoredLayoutDescriptor;
    zodOptionsSchema?: OptionsSchema;
    getZodOptionsSchema(): OptionsSchema;
    hasZodOptions(): boolean;
}

/**
 * The refusal for a registration that would take one of the element's own engine names.
 *
 * Replacing a built-in changes what an already-saved document means: a graph arranged with
 * `circular` yesterday has to be arranged with `circular` today.
 * @param type - The name that was taken.
 * @returns The error to throw.
 */
function duplicateBuiltInEngine(type: string): GraphtyError {
    return new GraphtyError({
        code: "E_DUPLICATE_PLUGIN",
        message:
            `"${type}" is a layout engine the element ships, and a built-in name may not be taken: a saved ` +
            "document that named it yesterday has to mean the same thing today",
        source: "registry",
        details: { kind: "layout", name: type, builtIn: true },
    });
}

/**
 * Base class for all layout engines
 *
 * WHERE A COORDINATE LIVES. Node coordinates belong to ONE stride-3 float array owned by the
 * element -- the same array the graph snapshot carries as its `role: "position"` column -- and not
 * to the engine that computed them, nor to the mesh that draws them. This class holds that array
 * for every engine that extends it: {@link LayoutEngine.publishPositions} copies whatever the
 * engine currently holds into it, {@link LayoutEngine.readNodePosition} reads a row back out into
 * an object the CALLER supplies, and a row nothing has placed reads as NaN rather than as the
 * origin, because zero is a real coordinate and "not laid out yet" is not.
 *
 * The row number is {@link Node.index}, the node's dense index in the element's current snapshot.
 * A node that never reached the graph builder carries `INVALID_INDEX` and therefore has no row: it
 * is never published, and every read of it falls back to whatever the engine itself holds, which
 * is what such a node has always rendered at.
 *
 * Why this matters beyond tidiness: today each engine keeps its own copy of the layout and the
 * renderer asks for it one freshly allocated object at a time, so a second view of the same graph
 * is inexpressible and a frame allocates once per node. With the coordinates in one shared array,
 * a view reads them by index and allocates nothing, and a GPU layout can write into the same rows.
 */
export abstract class LayoutEngine {
    static type: string;
    static maxDimensions: number;

    /**
     * Whether this engine reads edge weights. See {@link LayoutEngineStatics.honoursWeights}.
     *
     * False here because most layouts have no weight channel at all: of the element's own
     * nineteen, only Kamada-Kawai and ForceAtlas2 can read one, and the other seventeen would be
     * advertising a control that changes nothing.
     */
    static honoursWeights = false;

    /**
     * What a picker reads about this layout. See {@link LayoutEngineStatics.descriptor}.
     *
     * A third party's engine declares one and {@link LayoutEngine.register} publishes it to the
     * catalogue; the element's own engines leave it undefined because their arrangements are
     * authored centrally.
     */
    static descriptor?: AuthoredLayoutDescriptor;

    /**
     * Whatever the engine wants to keep of the options it was built with.
     *
     * NOT AN OBLIGATION any more. The element used to rebuild an engine from this slot on a 2D/3D
     * switch, so an engine that never assigned it silently lost every option the consumer had set
     * -- which is what happened to the element's own two force engines. The manager rebuilds from
     * the options it was given instead, and this is now the engine's own business.
     */
    config?: Record<string, unknown>;

    /**
     * NEW: Zod-based options schema for unified validation and UI metadata
     *
     * Subclasses should override this to define their configurable options
     * using the new Zod-based schema system.
     */
    static zodOptionsSchema?: OptionsSchema;

    /**
     * The array in use: the element's once one has been found, otherwise this engine's own.
     *
     * Undefined until the first publish or read, so an engine that is constructed and thrown away
     * -- which is what `LayoutEngine.get()` does to probe a type -- allocates nothing.
     */
    private positionArray?: ElementPositions;

    /**
     * Set by {@link LayoutEngine.attachPositions}, which wins over the array a node offers.
     *
     * A host that hands the engine an array means it; without this flag the first published node
     * would silently swap that array for the one its own graph owns.
     */
    private positionArrayAttached = false;

    // basic functionality
    abstract init(): Promise<void>;
    abstract addNode(n: Node): void;
    abstract addEdge(e: Edge): void;
    abstract getNodePosition(n: Node): Position;
    abstract setNodePosition(n: Node, p: Position): void;
    abstract getEdgePosition(e: Edge): EdgePosition;
    // for animated layouts
    abstract step(): void;
    abstract pin(n: Node): void;
    abstract unpin(n: Node): void;
    // properties
    abstract get nodes(): Iterable<Node>;
    abstract get edges(): Iterable<Edge>;
    abstract get isSettled(): boolean;

    /**
     * Add multiple nodes to the layout engine
     * @param nodes - Array of nodes to add
     */
    addNodes(nodes: Node[]): void {
        for (const n of nodes) {
            this.addNode(n);
        }
    }

    /**
     * Add multiple edges to the layout engine
     * @param edges - Array of edges to add
     */
    addEdges(edges: Edge[]): void {
        for (const e of edges) {
            this.addEdge(e);
        }
    }

    /**
     * Take a node out of the layout, before the element disposes the mesh that drew it.
     *
     * Declared here, with a default that does nothing, because it used to be duck-typed by the
     * element's data manager and implemented by none of the nineteen engines that ship here: an
     * author learned it existed by reading the element's source, and got no worked example. An
     * engine that keeps its own node list must override this, or it holds every removed node --
     * and everything that node references -- for as long as the engine lives.
     * @param _n - the node leaving the graph
     */
    removeNode(_n: Node): void {
        // An engine that keeps no list of its own has nothing to forget.
    }

    /**
     * The edge half of {@link LayoutEngine.removeNode}, with the same default and the same reason.
     * @param _e - the edge leaving the graph
     */
    removeEdge(_e: Edge): void {
        // An engine that keeps no list of its own has nothing to forget.
    }

    /**
     * Settle nodes that reached the graph after this layout was already running.
     *
     * THE DEFAULT IS THE ELEMENT'S OWN FALLBACK -- up to ten steps, stopping early if the engine
     * settles -- so a simulation behaves exactly as it did before the hook was declared, and an
     * engine that can place a newcomer without re-running the whole simulation overrides it. It
     * lives on the base class rather than in the manager because the manager cannot tell "did not
     * implement it" from "implemented it as a deliberate no-op", and the difference decides
     * whether ten steps run.
     * @param _nodes - the nodes that have just arrived
     */
    updatePositions(_nodes: readonly Node[]): void {
        for (let i = 0; i < INCREMENTAL_STEPS; i++) {
            if (this.isSettled) {
                return;
            }

            this.step();
        }
    }

    /**
     * Release whatever this engine holds. The element calls it when the reader switches layouts
     * and when the graph is torn down, and never uses the engine again afterwards.
     *
     * Declared with a do-nothing default for the same reason as {@link LayoutEngine.removeNode}:
     * it was duck-typed, undeclared and unimplemented by every engine here.
     */
    dispose(): void {
        // An engine that holds no worker, no timer and no listener has nothing to release.
    }

    /**
     * The array this engine publishes node coordinates into.
     *
     * Allocated on demand, so reading it is enough to make an engine that has never been handed an
     * element's array produce one of its own.
     * @returns the position array in use
     */
    get nodePositions(): ElementPositions {
        this.positionArray ??= new ElementPositions(0);
        return this.positionArray;
    }

    /**
     * Hand this engine the array it must publish into, and stop it adopting any other.
     *
     * This is how a host says "these coordinates are mine": the engine writes into the array the
     * host already lends to its snapshots, so a layout, a drag and a GPU readback all land in the
     * one place and a re-freeze loses none of them.
     * @param positions - the element-owned array
     */
    attachPositions(positions: ElementPositions): void {
        this.positionArray = positions;
        this.positionArrayAttached = true;
    }

    /**
     * Copy every node's current coordinates out of the engine and into the position array.
     *
     * Engines call this at the end of a step, so that by the time anything draws, the array is the
     * answer rather than a copy of it. The default walks the engine's own nodes through
     * {@link LayoutEngine.getNodePosition}, which is correct for any engine but allocates one
     * object per node; an engine that can read its own state without allocating overrides it, and
     * an engine that already writes straight into the array overrides it to do nothing.
     */
    publishPositions(): void {
        for (const n of this.nodes) {
            const pos = this.getNodePosition(n);
            this.writeNodePosition(n, pos.x, pos.y, pos.z ?? 0);
        }
    }

    /**
     * Read a node's published coordinates into an object the CALLER owns.
     *
     * The point of the out parameter is that a renderer can pass the vector it is about to draw
     * with and allocate nothing per node per frame. A row that no engine has placed answers false
     * and leaves `out` untouched, so the caller keeps whatever it had rather than being handed a
     * NaN or an origin it cannot tell from a real coordinate.
     * @param n - the node to read
     * @param out - the object to fill; a Babylon `Vector3` is one, which is the point
     * @param out.x - receives the scene-unit x
     * @param out.y - receives the scene-unit y
     * @param out.z - receives the scene-unit z
     * @returns true when the node has a placed row
     */
    readNodePosition(n: Node, out: { x: number; y: number; z: number }): boolean {
        const positions = this.positionsFor(n);
        if (!positions.isPlaced(n.index)) {
            return false;
        }

        positions.read(n.index, out);
        return true;
    }

    /**
     * Publish one node's coordinates, growing the array to reach its row.
     *
     * Three things are silently skipped rather than thrown, because this runs inside a layout step
     * and a throw there kills the frame: a node with no row in the graph (`INVALID_INDEX`, which a
     * record whose id the graph builder would not take carries for its whole life), a node whose
     * index is not a row number at all, and a coordinate that cannot be stored. That last one is
     * the important one -- a force layout that divided by a zero distance produces NaN, and an
     * overflow of the f32 the array stores produces an infinity. Either one, written, would make
     * the row read back as a place: the mesh vanishes and the scene bounds and camera framing go
     * with it. Left alone, the row stays unplaced and the node keeps the coordinates it had.
     *
     * The array is GROWN to reach the row rather than the write being refused. A node's index is
     * handed out the moment its record is taken, but its row only appears when the graph is next
     * frozen, and a layout that ran in between would otherwise be thrown away in silence. Growth is
     * prefix-stable and fills what it adds with NaN, so it cannot disturb a row anything else
     * placed; the one thing it does change is that a node this engine placed before the first
     * freeze counts as placed, which is what makes a file's own coordinates yield to it.
     *
     * A PINNED ROW REFUSES A LAYOUT STEP. This is the whole of "a pin is meaningful under every
     * arrangement": fourteen of the element's nineteen engines implement `pin()` as a no-op and
     * `setNodePosition` as a no-op too, so before this guard a reader who dragged a node under a
     * static layout watched it snap back the next time the layout recomputed. One refusal here
     * covers every engine, including one written by a third party that has never heard of pinning,
     * because every engine reaches the shared array through this method.
     *
     * A DRAG IS NOT A LAYOUT STEP. `intent: "placement"` writes straight through, so a reader can
     * move a pinned node and have it stay where they put it; without that distinction the guard
     * would make a pinned node undraggable, which is the opposite of what a pin is for. The
     * default is `"layout"` so that an engine written before the parameter existed -- a plugin's
     * step loop -- is guarded without knowing it, and only the placement paths have to opt out.
     * @param n - the node being placed
     * @param x - scene-unit x
     * @param y - scene-unit y
     * @param z - scene-unit z
     * @param intent - `"layout"` for a simulation step, `"placement"` for a drag or a replay
     * @returns true when the row was written
     */
    protected writeNodePosition(
        n: Node,
        x: number,
        y: number,
        z: number,
        intent: "layout" | "placement" = "layout",
    ): boolean {
        const { index } = n;
        if (index === INVALID_INDEX || !Number.isInteger(index) || index < 0) {
            return false;
        }

        if (!isStorableCoordinate(x) || !isStorableCoordinate(y) || !isStorableCoordinate(z)) {
            return false;
        }

        const positions = this.positionsFor(n);
        if (intent === "layout" && positions.isPinned(index)) {
            return false;
        }

        if (index >= positions.count) {
            positions.grow(index + 1);
        }

        positions.write(index, x, y, z);
        return true;
    }

    /**
     * The weight of every ordered endpoint pair this batch of edges covers, or null when the
     * graph's weights carry no information.
     *
     * WHY A PAIR AND NOT AN EDGE. `@graphty/layout`'s one weight channel is
     * `graph.getEdgeData(source, target, attr)`, which is asked by endpoint pair, and both layout
     * functions that read it write the answer into a matrix cell -- `A[i][j]` in ForceAtlas2,
     * `distances[s][t]` in Kamada-Kawai. There is no cell for a second edge between the same two
     * nodes, so parallel edges are SUMMED into one number rather than left to last-writer-wins,
     * where the order the file happened to list them in would decide the arrangement. Summing is
     * also what the element does when it simplifies a multigraph for an algorithm, so a graph's
     * weights mean the same thing to a layout and to a metric.
     *
     * READ ONCE PER LAYOUT COMPUTATION, not per frame and not per edge: the weights come from the
     * current snapshot's edge list, indexed by the same logical edge index `Edge.index` holds.
     *
     * NULL MEANS "DO NOT ATTACH A CALLBACK". graph-format stores an all-ones graph with no weight
     * column at all, and a graph whose every weight is 1 carries no information a layout could
     * arrange by -- so the caller leaves `getEdgeData` off the graph object entirely and the
     * arrangement is bit-identical to the one the same seed produced before weights existed.
     *
     * THIS IS A SLIGHTLY NARROWER QUESTION THAN `statistics().weighted`, deliberately. The status
     * chip asks whether the SNAPSHOT's weight column carries anything but ones; this asks it of
     * the edges this engine is actually about to arrange. They answer differently only when the
     * engine holds a strict subset of the graph's edges whose weights are all 1, and there the
     * narrower answer is the correct one: a layout cannot be moved by a weight on an edge it is
     * not laying out. A consumer who sees "weighted" on the status bar and an unmoved arrangement
     * is looking at that case.
     * @param edges - the edges this engine is about to lay out
     * @returns pair key (see {@link pairWeightKey}) to summed weight, or null
     */
    protected pairWeights(edges: readonly Edge[]): Map<string, number> | null {
        if (edges.length === 0) {
            return null;
        }

        // Reached the same way `positionsFor` reaches the coordinate array, and guarded the same
        // way: an engine driven directly by a test, or by a host that keeps no graph, has edges
        // whose parent answers none of this, and an unweighted arrangement is the right answer
        // there rather than a throw inside a layout step.
        const snapshot = edges[0].parentGraph?.getDataManager?.()?.getSnapshot?.();
        const weights = snapshot?.edgeList().weights ?? null;
        if (weights === null) {
            return null;
        }

        const summed = new Map<string, number>();
        let informative = false;

        for (const e of edges) {
            // An edge the graph builder would not take has no row and therefore no weight; 1 is
            // what `resolveEdgeWeight` answers for a record carrying none, so it is the same
            // neutral number the rest of the element already uses for "unweighted".
            const stored = e.index >= 0 && e.index < weights.length ? weights[e.index] : 1;
            if (stored !== 1) {
                informative = true;
            }

            const key = pairWeightKey(e.srcId, e.dstId);
            summed.set(key, (summed.get(key) ?? 0) + stored);
        }

        return informative ? summed : null;
    }

    /**
     * Say once, per layout computation, how many pairs were clamped off zero.
     *
     * ONCE PER RUN AND NOT PER EDGE: a graph whose weights are all zero would otherwise produce
     * one line per edge, which buries every other message in the run it happened during. It is
     * reported at all because a clamp changes the picture -- a zero-weight edge is drawn as the
     * weakest connection the solver can express rather than as no connection -- and the record
     * that carried the zero is the reader's, not the element's, so they are the one who can fix
     * it.
     * @param layout - the layout name, for the message
     * @param weights - the pair weights about to be handed to the layout function
     */
    protected reportClampedWeights(layout: string, weights: ReadonlyMap<string, number>): void {
        let clamped = 0;
        for (const weight of weights.values()) {
            if (weight < WEIGHT_EPSILON) {
                clamped++;
            }
        }

        if (clamped > 0) {
            logger.warn("Edge weights at or below zero were clamped before the layout read them", {
                layout,
                clamped,
                epsilon: WEIGHT_EPSILON,
            });
        }
    }

    /**
     * The array to use for this node: the one its own graph owns, unless a host attached one.
     *
     * Resolved on every call rather than cached, because the element REPLACES its array when a
     * dataset is discarded -- the store and everything keyed into it is thrown away and rebuilt --
     * and an engine outlives that. A cached reference would keep publishing into the array of a
     * graph that no longer exists, which is invisible: every write succeeds and nothing draws.
     * @param n - the node being published or read
     * @returns the array to write to and read from
     */
    private positionsFor(n: Node): ElementPositions {
        if (!this.positionArrayAttached) {
            // A node built by hand for a unit test, or one belonging to a host that keeps no
            // position array, answers nothing here and the engine keeps its own.
            const owned: unknown = n.parentGraph?.getDataManager?.()?.positions;
            if (owned instanceof ElementPositions) {
                this.positionArray = owned;
            }
        }

        return this.nodePositions;
    }

    /**
     * Get the type identifier for this layout engine
     * @returns The layout engine type string
     */
    get type(): string {
        return (this.constructor as typeof LayoutEngine).type;
    }

    /**
     * File a layout engine class under the name it declares, and publish what it says about
     * itself to the catalogue.
     *
     * WHAT CHANGED AND WHY. This used to read `cls.type` through a cast and put the class in a
     * map, which meant a class with no `static type` registered under the string "undefined", a
     * second class under a taken name silently replaced the first, and a registered engine
     * reached no catalogue at all -- so a third party's layout could run but could never be
     * offered by a picker, described in a reader's language, or found by `layoutIdForEngine`.
     *
     * A third party's class must declare a `static descriptor` whose `id` equals its
     * `static type`. The element's own nineteen are the one exemption, because their arrangements
     * are authored centrally in the layout catalogue where several engines may sit behind one
     * public name.
     * @param cls - The layout engine class.
     * @returns The same class, so a declaration can register itself in one expression.
     * @throws A `GraphtyError` with `E_BAD_COMMAND` when the class declares no `static type`, no
     * `static descriptor`, or a descriptor whose `id` disagrees with its `static type`; or with
     * `E_DUPLICATE_PLUGIN` when the name or the descriptor id is one the element itself ships.
     */
    static register<T extends LayoutEngineClass>(cls: T): T {
        const declared = cls as RegisterableLayout;
        const { type, descriptor } = declared;

        if (typeof type !== "string" || type === "") {
            throw new GraphtyError({
                code: "E_BAD_COMMAND",
                message: "a layout engine is filed under its `static type`, and this class declares none",
                source: "registry",
                details: { kind: "layout", field: "type" },
            });
        }

        if (layoutEngineRegistry.get(type) === cls) {
            // The same class handed over twice, which is what a bundler re-evaluating a module or
            // hot module replacement re-running one looks like. One engine, not two.
            return cls;
        }

        const isBuiltIn = BUILT_IN_LAYOUT_ENGINES.includes(type);

        if (descriptor === undefined) {
            if (!isBuiltIn) {
                throw new GraphtyError({
                    code: "E_BAD_COMMAND",
                    message:
                        `the layout "${type}" declares no \`static descriptor\`, so nothing could offer it: a ` +
                        "picker reads the catalogue, and an engine the catalogue does not carry is reachable " +
                        "only by a consumer who already knows its name",
                    source: "registry",
                    details: { kind: "layout", name: type, field: "descriptor" },
                });
            }

            if (layoutEngineRegistry.hasOwn(type)) {
                throw duplicateBuiltInEngine(type);
            }

            layoutEngineRegistry.set(type, cls);
            return cls;
        }

        if (isBuiltIn) {
            throw duplicateBuiltInEngine(type);
        }

        if (descriptor.id !== type) {
            throw new GraphtyError({
                code: "E_BAD_COMMAND",
                message:
                    `the layout "${type}" describes itself as "${descriptor.id}". A layout has ONE key: the name ` +
                    "`setLayout` takes and the name the catalogue publishes are the same string, so nothing has " +
                    "to be named twice and a saved document means one thing",
                source: "registry",
                details: { kind: "layout", name: type, field: "descriptor.id", id: descriptor.id },
            });
        }

        // Published BEFORE the class is filed, so a refused descriptor leaves nothing registered:
        // an engine reachable by name whose descriptor nothing carries is exactly the half-built
        // state this check exists to prevent.
        //
        // `honoursWeights` is taken from the class rather than from the descriptor the author
        // wrote, because the engine is where the fact is true: a descriptor that claimed weights
        // for an engine whose arrangement ignores them would put a live control in front of a
        // reader that changes nothing.
        publishLayoutDescriptor({
            descriptor: { ...descriptor, honoursWeights: declared.honoursWeights ?? false },
            type,
        });
        layoutEngineRegistry.set(type, cls);
        return cls;
    }

    /**
     * Get a layout engine instance by type
     * @param type - The layout engine type identifier
     * @param opts - Configuration options for the layout engine
     * @returns A new layout engine instance or null if type not found
     */
    static get(type: string, opts: object = {}): LayoutEngine | null {
        const SourceClass = layoutEngineRegistry.get(type);
        if (SourceClass) {
            return new SourceClass(opts);
        }

        return null;
    }

    /**
     * Get dimension-specific options for this layout
     * @param dimension - The desired dimension (2 or 3)
     * @returns Options object for the dimension or null if unsupported
     */
    static getOptionsForDimension(dimension: 2 | 3): object | null {
        // Check if this layout supports the requested dimension
        if (dimension > this.maxDimensions) {
            return null;
        }

        // Default implementation returns nothing - subclasses override to provide
        // dimension-specific options (e.g., { dim: 2 } or { twoD: true })
        return {};
    }

    /**
     * Get dimension-specific options for a layout by type
     * @param type - The layout engine type identifier
     * @param dimension - The desired dimension (2 or 3)
     * @returns Options object for the dimension or null if type not found or unsupported
     */
    static getOptionsForDimensionByType(type: string, dimension: 2 | 3): object | null {
        const SourceClass = layoutEngineRegistry.get(type);
        if (!SourceClass) {
            return null;
        }

        return (SourceClass as unknown as typeof LayoutEngine).getOptionsForDimension(dimension);
    }

    /**
     * Get the Zod-based options schema for this layout
     * @returns The options schema, or an empty object if no schema defined
     */
    static getZodOptionsSchema(): OptionsSchema {
        return this.zodOptionsSchema ?? {};
    }

    /**
     * Check if this layout has a Zod-based options schema
     * @returns true if the layout has options defined
     */
    static hasZodOptions(): boolean {
        return this.zodOptionsSchema !== undefined && Object.keys(this.zodOptionsSchema).length > 0;
    }

    /**
     * Get a list of all registered layout types
     * @returns Array of registered layout type identifiers
     */
    static getRegisteredTypes(): string[] {
        return Array.from(layoutEngineRegistry.keys());
    }

    /**
     * Get a layout class by type
     * @param type - The layout engine type identifier
     * @returns The layout engine class or null if not found
     */
    static getClass(type: string): (LayoutEngineClass & LayoutEngineStatics) | null {
        return (layoutEngineRegistry.get(type) as (LayoutEngineClass & LayoutEngineStatics) | null) ?? null;
    }
}

export const SimpleLayoutConfig = z.looseObject({
    scalingFactor: z.number().default(100),
});
export type SimpleLayoutConfigType = z.infer<typeof SimpleLayoutConfig>;
export type SimpleLayoutOpts = Partial<SimpleLayoutConfigType>;

/**
 * Base class for simple static layout engines that compute positions synchronously
 */
export abstract class SimpleLayoutEngine extends LayoutEngine {
    static type: string;
    protected _nodes: Node[] = [];
    protected _edges: Edge[] = [];
    stale = true;
    positions: Record<string | number, number[]> = {};
    scalingFactor = 100;

    /**
     * Create a simple layout engine
     * @param opts - Configuration options including scalingFactor
     */
    constructor(opts: SimpleLayoutOpts = {}) {
        super();
        const config = SimpleLayoutConfig.parse(opts);
        this.scalingFactor = config.scalingFactor;
    }

    /**
     * Get dimension-specific options for simple layouts
     * @param dimension - The desired dimension (2 or 3)
     * @returns Options object with dim parameter or null if unsupported
     */
    static getOptionsForDimension(dimension: 2 | 3): object | null {
        // Check if this layout supports the requested dimension
        if (dimension > this.maxDimensions) {
            return null;
        }

        // Most simple layouts use 'dim' parameter
        return { dim: dimension };
    }

    // basic functionality

    /**
     * Initialize the layout engine
     *
     * Simple layouts compute positions synchronously and don't require initialization.
     */
    async init(): Promise<void> {
        // No-op for simple layouts
    }

    /**
     * Add a node to the layout and mark positions as stale
     * @param n - The node to add
     */
    addNode(n: Node): void {
        this._nodes.push(n);
        this.stale = true;
    }

    /**
     * Add an edge to the layout and mark positions as stale
     * @param e - The edge to add
     */
    addEdge(e: Edge): void {
        this._edges.push(e);
        this.stale = true;
    }

    /**
     * Get the position of a node, computing layout if stale
     *
     * The coordinates come from the shared position array, which `SimpleLayoutEngine.refresh`
     * fills from `positions` as soon as the layout is recomputed. They are the same numbers the
     * record holds, rounded to the f32 the array stores -- so an arrangement never moves, but a
     * coordinate may differ in its last digit or two from the double the layout function returned.
     * A node with no row falls back to the record, which is every node in an engine driven by hand.
     * @param n - The node to get position for
     * @returns The node's position coordinates
     */
    getNodePosition(n: Node): Position {
        this.refresh();
        return this.publishedOr(n, n.id);
    }

    /**
     * Record where the reader has just put a node.
     *
     * A static layout recomputes every coordinate from scratch, so it has no per-node state a
     * placement could live in -- which is why this used to do nothing at all, and why a drag
     * under any of the fourteen static arrangements was discarded by the next `refresh()`. The
     * placement is written into the SHARED array instead, with `"placement"` intent so that it
     * lands even on a pinned row, and into the computed record so that a read which falls back to
     * the record (a node with no row of its own) answers the same.
     * @param n - the node that moved
     * @param p - where it moved to
     */
    setNodePosition(n: Node, p: Position): void {
        const z = p.z ?? 0;
        this.writeNodePosition(n, p.x, p.y, z, "placement");
        this.positions[n.id] = [p.x / this.scalingFactor, p.y / this.scalingFactor, z / this.scalingFactor];
    }

    /**
     * Get the position of an edge based on its endpoints
     * @param e - The edge to get position for
     * @returns The edge's source and destination positions
     */
    getEdgePosition(e: Edge): EdgePosition {
        this.refresh();

        // Through the same rows the endpoints themselves render at, so an edge cannot be drawn to
        // where a node used to be by reading a second copy of the layout.
        return {
            src: this.publishedOr(e.srcNode, e.srcId),
            dst: this.publishedOr(e.dstNode, e.dstId),
        };
    }

    /**
     * Copy the computed layout into the shared position array, recomputing it first if it is stale.
     */
    override publishPositions(): void {
        if (this.stale) {
            // refresh() publishes what it computes, so publishing again here would write every row
            // a second time for nothing.
            this.refresh();
            return;
        }

        this.publishRecord();
    }

    // for animated layouts

    /**
     * Step the layout animation
     *
     * Simple layouts are static and don't animate, so stepping has no effect.
     */
    step(): void {
        // No-op for simple layouts
    }

    /**
     * Take a node out of the layout.
     *
     * WITHOUT THIS the engine holds the removed node -- and through it the node's Babylon mesh,
     * its data record and its endpoints -- for as long as the engine lives, and the frame loop
     * keeps walking it, so a node the reader deleted still draws at wherever it last was.
     *
     * The computed record is left alone and the layout is marked stale instead. Every layout
     * function here returns a WHOLE new record, which `doLayout` assigns over the old one, and
     * `refresh()` runs before any read -- so the removed node's entry is gone by the time anything
     * could read it, without this method having to reach into a keyed object by a computed name.
     * @param n - the node leaving the graph
     */
    override removeNode(n: Node): void {
        const index = this._nodes.indexOf(n);
        if (index >= 0) {
            this._nodes.splice(index, 1);
        }

        this.stale = true;
    }

    /**
     * The edge half of {@link SimpleLayoutEngine.removeNode}, with the same reason.
     * @param e - the edge leaving the graph
     */
    override removeEdge(e: Edge): void {
        const index = this._edges.indexOf(e);
        if (index >= 0) {
            this._edges.splice(index, 1);
        }

        this.stale = true;
    }

    /**
     * Pin a node in place
     *
     * A static layout has nothing of its own to hold still -- it recomputes every position from
     * scratch -- so the pin is kept by the element's position array instead, and
     * `writeNodePosition` refuses to move a pinned row. That is what makes a
     * pin mean something under all fourteen of these engines, none of which could hold one.
     */
    pin(): void {
        // See the doc comment: the element's position array holds the pin, not this engine.
    }

    /**
     * Unpin a node
     *
     * The element's position array holds the pin; see {@link SimpleLayoutEngine.pin}.
     */
    unpin(): void {
        // See the doc comment: the element's position array holds the pin, not this engine.
    }

    // properties
    /**
     * Get all nodes in the layout
     * @returns Iterable of nodes
     */
    get nodes(): Iterable<Node> {
        return this._nodes;
    }

    /**
     * Get all edges in the layout
     * @returns Iterable of edges
     */
    get edges(): Iterable<Edge> {
        return this._edges;
    }

    readonly isSettled = true;

    abstract doLayout(): void;

    /**
     * Recompute the layout when it is stale, and publish what it produced.
     *
     * A simple layout is computed once and then held, so this is the ONE place the shared array is
     * filled: every reader below goes through here first, which is why a node added after the last
     * read still gets a row before anything asks for its coordinates.
     */
    protected refresh(): void {
        if (!this.stale) {
            return;
        }

        this.doLayout();
        // doLayout() clears this itself in every engine that ships here, but an engine written
        // elsewhere may not, and leaving it set would recompute the whole layout on every read.
        this.stale = false;
        this.publishRecord();
    }

    /**
     * Write the computed record into the shared array, scaled to scene units.
     *
     * A node the layout function returned nothing for is LEFT UNPLACED rather than published at
     * the origin: the two are indistinguishable once stored, and the origin is a place a reader
     * would draw at.
     */
    private publishRecord(): void {
        for (const n of this._nodes) {
            const pos = this.positions[n.id];
            if (!pos || pos.length === 0) {
                continue;
            }

            this.writeNodePosition(
                n,
                pos[0] * this.scalingFactor,
                pos[1] * this.scalingFactor,
                (pos[2] ?? 0) * this.scalingFactor,
            );
        }
    }

    /**
     * A node's published row, or the computed record when it has no row of its own.
     *
     * The fallback is not a rare path: an engine driven directly -- by a test, or by a host that
     * keeps no graph -- has nodes whose index is `INVALID_INDEX`, and none of them is ever
     * published. Both branches produce the same arrangement; only the rounding differs.
     * @param n - the node, when the caller has one
     * @param id - the node's id, which is how the computed record is keyed
     * @returns a fresh coordinate triple
     */
    private publishedOr(n: Node | undefined, id: NodeIdType): Coords {
        const out = { x: 0, y: 0, z: 0 };
        if (n !== undefined && this.readNodePosition(n, out)) {
            return out;
        }

        return posToCoords(this.positions[id], this.scalingFactor);
    }
}

function posToCoords(pos: number[] | undefined, scale: number): Coords {
    if (!pos || pos.length === 0) {
        // Return default position if pos is undefined or empty
        return { x: 0, y: 0, z: 0 };
    }

    const x = pos[0] * scale;
    const y = pos[1] * scale;
    const z = (pos[2] ?? 0) * scale;
    // const z = pos[0] * scale;
    // const x = (pos[2] ?? 0) * scale;

    return { x, y, z };
}
