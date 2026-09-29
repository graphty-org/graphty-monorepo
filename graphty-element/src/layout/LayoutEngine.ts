import {
    type DerivedGraph,
    type F32,
    GraphBuilder,
    type GraphSnapshot,
    INVALID_INDEX,
    makeMask,
    maskSet,
    maskTest,
    type NodeMask,
} from "@graphty/graph-format";
import { fromPositionColumn, type LayoutResult, toPositionColumn } from "@graphty/layout";
import { z } from "zod/v4";

import { publishLayoutDescriptor } from "../catalog/layoutRegistry";
import { SharedImplementationMap } from "../catalog/pluginRegistry";
import type { AuthoredLayoutDescriptor } from "../catalog/types";
import type { OptionsSchema } from "../config";
import { readonlyPositions, writableLane } from "../data/lane";
import { ElementPositions, isStorableCoordinate } from "../data/positions";
import type { Edge } from "../Edge";
import { GraphtyError } from "../errors";
import type { Node } from "../Node";
import type { ReadonlyElementPositions } from "../session/types";

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
     * Whether this engine can lay out a set of nodes while holding every other node still, which is
     * what `setLayout(type, opts, { scope })` asks of it.
     *
     * Optional, and false unless declared: an engine that says nothing refuses a scope with
     * `E_UNSUPPORTED`, so no existing engine is handed a hold it never agreed to.
     *
     * THE CONTRACT A SCOPED ENGINE ACCEPTS. The element hands it a hold mask through
     * {@link LayoutEngine.setHoldMask} after `init()` and again whenever the graph is renumbered,
     * and the protected `writeNodePosition` already refuses a layout write onto a held row that
     * has a coordinate -- so a held node never MOVES under any engine. That alone is not enough:
     * an engine that keeps integrating a held body computes every force on its members against a
     * position the element will never draw. A scoped engine must therefore treat held nodes as
     * fixed in its own state -- a fixed-node mask, `fx`/`fy`, a pinned body -- read through
     * the protected `isHeld(index)`, including for a node added after the hold was set and a node a
     * reader unpins while it is held. The hold is never a pin: it is not written to the element's
     * pin lane, so it never leaks into saved pins or exports.
     */
    scoped?: boolean;
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
 * The element's own reach into an engine's protected placement members: the hooks that apply the
 * `positions` and `pins` slices, and the drag. No entry point exports it; a consumer places and
 * pins nodes through `session.positions`.
 */
export const layoutEngineInternals = {} as {
    /** See `LayoutEngine.setNodePosition`. */
    setNodePosition(engine: LayoutEngine, n: Node, p: Position): void;
    /** See `LayoutEngine.pin`. */
    pin(engine: LayoutEngine, n: Node): void;
    /** See `LayoutEngine.unpin`. */
    unpin(engine: LayoutEngine, n: Node): void;
    /** The engine's writable coordinate array; `LayoutEngine.nodePositions` is its read-only view. */
    positions(engine: LayoutEngine): ElementPositions;
    /** See `LayoutEngine.addNode`. */
    addNode(engine: LayoutEngine, n: Node): void;
    /** See `LayoutEngine.addEdge`. */
    addEdge(engine: LayoutEngine, e: Edge): void;
    /** See `LayoutEngine.addNodes`. */
    addNodes(engine: LayoutEngine, nodes: Node[]): void;
    /** See `LayoutEngine.addEdges`. */
    addEdges(engine: LayoutEngine, edges: Edge[]): void;
    /** See `LayoutEngine.removeNode`. */
    removeNode(engine: LayoutEngine, n: Node): void;
    /** See `LayoutEngine.removeEdge`. */
    removeEdge(engine: LayoutEngine, e: Edge): void;
    /** See `LayoutEngine.attachPositions`. */
    attachPositions(engine: LayoutEngine, positions: ElementPositions): void;
    /** See `LayoutEngine.edgeProblems`. */
    edgeProblems(engine: LayoutEngine, drawn: ReadonlyMap<string, Edge>): string[];
};

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
/**
 * The edges an engine holds against the edges drawn: each drawn edge held exactly once, and
 * nothing held that is not drawn.
 * @param held - What the engine holds.
 * @param drawn - What the element draws.
 * @returns One sentence per problem.
 */
export function heldEdgeProblems(held: Iterable<Edge>, drawn: ReadonlyMap<string, Edge>): string[] {
    const problems: string[] = [];
    const seen = new Set<Edge>();
    for (const edge of held) {
        if (seen.has(edge)) {
            problems.push(`edge ${edge.id} is held twice`);
        }

        seen.add(edge);
        if (drawn.get(edge.id) !== edge) {
            problems.push(`edge ${edge.id} is held but not drawn`);
        }
    }

    for (const edge of drawn.values()) {
        if (!seen.has(edge)) {
            problems.push(`edge ${edge.id} is drawn but not held`);
        }
    }

    return problems;
}

/** The base every layout engine extends: how the element adds, places, steps and removes. */
export abstract class LayoutEngine {
    static {
        layoutEngineInternals.setNodePosition = (engine, n, p) => {
            engine.setNodePosition(n, p);
        };
        layoutEngineInternals.pin = (engine, n) => {
            engine.pin(n);
        };
        layoutEngineInternals.unpin = (engine, n) => {
            engine.unpin(n);
        };
        layoutEngineInternals.positions = (engine) => engine.writablePositions;
        layoutEngineInternals.edgeProblems = (engine, drawn) => engine.edgeProblems(drawn);
        layoutEngineInternals.addNode = (engine, n) => {
            engine.addNode(n);
        };
        layoutEngineInternals.addEdge = (engine, e) => {
            engine.addEdge(e);
        };
        layoutEngineInternals.addNodes = (engine, nodes) => {
            engine.addNodes(nodes);
        };
        layoutEngineInternals.addEdges = (engine, edges) => {
            engine.addEdges(edges);
        };
        layoutEngineInternals.removeNode = (engine, n) => {
            engine.removeNode(n);
        };
        layoutEngineInternals.removeEdge = (engine, e) => {
            engine.removeEdge(e);
        };
        layoutEngineInternals.attachPositions = (engine, positions) => {
            engine.attachPositions(positions);
        };
    }

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
     * Whether this engine accepts a scope. See {@link LayoutEngineStatics.scoped}, which states the
     * contract a scoped engine accepts.
     *
     * False here because a one-shot arrangement recomputes every coordinate from scratch, and
     * where it would place a subset among nodes it may not move is a question nothing answers yet.
     */
    static scoped = false;

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
    protected config?: Record<string, unknown>;

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

    /** The rows the element is holding still, or null when nothing is held. See {@link setHoldMask}. */
    private hold: NodeMask | null = null;

    /** How many rows {@link hold} covers; a row at or past it is newer than the hold, so held. */
    private holdRows = 0;

    // basic functionality
    abstract init(): Promise<void>;
    // The element's to call: the engine follows the graph slice, and a consumer who added or removed
    // an element here would leave the engine out of step with the graph, with no step to undo.
    // The element calls these through `layoutEngineInternals`; an engine author implements them.
    protected abstract addNode(n: Node): void;
    protected abstract addEdge(e: Edge): void;
    abstract getNodePosition(n: Node): Position;
    /**
     * Place one node, as a drag or a restore does. Protected: the element reaches it through
     * {@link layoutEngineInternals}, from the hooks that apply the `positions` and `pins` slices,
     * so a caller cannot place a node without a step.
     */
    protected abstract setNodePosition(n: Node, p: Position): void;
    abstract getEdgePosition(e: Edge): EdgePosition;
    // for animated layouts
    abstract step(): void;
    /** Hold a node where it is; protected for the reason {@link LayoutEngine.setNodePosition} is. */
    protected abstract pin(n: Node): void;
    /** Release a held node; protected for the reason {@link LayoutEngine.setNodePosition} is. */
    protected abstract unpin(n: Node): void;
    // properties
    abstract get nodes(): Iterable<Node>;
    abstract get edges(): Iterable<Edge>;
    abstract get isSettled(): boolean;

    /**
     * Add multiple nodes to the layout engine
     * @param nodes - Array of nodes to add
     */
    protected addNodes(nodes: Node[]): void {
        for (const n of nodes) {
            this.addNode(n);
        }
    }

    /**
     * Add multiple edges to the layout engine
     * @param edges - Array of edges to add
     */
    protected addEdges(edges: Edge[]): void {
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
    protected removeNode(_n: Node): void {
        // An engine that keeps no list of its own has nothing to forget.
    }

    /**
     * The edge half of {@link LayoutEngine.removeNode}, with the same default and the same reason.
     * @param _e - the edge leaving the graph
     */
    protected removeEdge(_e: Edge): void {
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
     * Declared with a do-nothing default for the same reason as `removeNode`:
     * it was duck-typed, undeclared and unimplemented by every engine here.
     */
    dispose(): void {
        // An engine that holds no worker, no timer and no listener has nothing to release.
    }

    /**
     * Strict state: what is wrong with this engine's hold on the drawn edges, checked after every
     * derivation pass. An engine that keeps a copy of the edges must hold every drawn edge once
     * and nothing else, or a redraw asks it for a position it cannot give. Reads nothing lazily:
     * the check must not change what it checks.
     * @param drawn - The edges the element draws.
     * @returns One sentence per problem; empty when there is none.
     */
    protected edgeProblems(drawn: ReadonlyMap<string, Edge>): string[] {
        return heldEdgeProblems(this.edges, drawn);
    }

    /**
     * The coordinates this engine publishes, read-only.
     *
     * Read-only because the array is the element's: a write here would move or pin a node with no
     * undo step. The engine writes through `writeNodePosition`; a consumer
     * places and pins nodes through `session.positions`.
     * @returns the coordinates in use, read-only
     */
    get nodePositions(): ReadonlyElementPositions {
        return this.readonlyPositionArray;
    }

    /** The read-only view {@link LayoutEngine.nodePositions} hands out; reads the array in use now. */
    private readonly readonlyPositionArray = readonlyPositions(() => this.writablePositions);

    /**
     * The array this engine publishes node coordinates into, writable.
     *
     * Allocated on demand, so reading it is enough to make an engine that has never been handed an
     * element's array produce one of its own. The element reaches it through
     * {@link layoutEngineInternals}.
     * @returns the position array in use
     */
    private get writablePositions(): ElementPositions {
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
    protected attachPositions(positions: ElementPositions): void {
        this.positionArray = positions;
        this.positionArrayAttached = true;
    }

    /**
     * Hold the nodes a scoped layout may not move, or release them all with null.
     *
     * The element calls this on an engine whose class declares `static scoped = true`, after
     * `init()` and after every renumbering of the graph. A set bit is a held row. A row at or past
     * `rows` belongs to a node that arrived after the scope was captured, and is held too: the
     * members of a scoped layout are the ones it started with. An engine that overrides this calls
     * `super.setHoldMask` first and then fixes held nodes in its own state (see
     * {@link LayoutEngineStatics.scoped}).
     * @param mask - One bit per row, set for a row to hold; null holds nothing.
     * @param rows - How many rows the mask covers.
     */
    setHoldMask(mask: NodeMask | null, rows: number): void {
        this.hold = mask;
        this.holdRows = mask === null ? 0 : rows;
    }

    /**
     * The hold mask the element last handed this engine, or null when nothing is held.
     * @returns The mask, which the caller must not change.
     */
    get holdMask(): NodeMask | null {
        return this.hold;
    }

    /**
     * Whether the element is holding this row still for a scoped layout.
     * @param index - The node's row, or `INVALID_INDEX`.
     * @returns True while a hold is set and the row is held or newer than the hold.
     */
    protected isHeld(index: number): boolean {
        const { hold } = this;
        if (hold === null) {
            return false;
        }

        return index >= this.holdRows || !Number.isInteger(index) || index < 0 || maskTest(hold, index);
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
     * Take the coordinates in the position array as this engine's own, and stay at rest.
     *
     * Undo and redo write where the nodes were into the array and then call this, so the next
     * drag, add or `setRunning(true)` starts from the restored arrangement instead of the one the
     * engine was holding. The default hands every placed node back through
     * `setNodePosition`, which is right for any engine that keeps coordinates of
     * its own; an engine that can adopt the array in one pass overrides it.
     */
    loadArrangement(): void {
        const at = { x: 0, y: 0, z: 0 };
        for (const n of this.nodes) {
            if (this.readNodePosition(n, at)) {
                this.setNodePosition(n, at);
            }
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
        // A HELD ROW IS REFUSED LIKE A PINNED ONE, once it has a coordinate. A node that arrived
        // after a scoped layout started has none, and its first coordinate lands so that it is
        // drawn somewhere; from then on it stays where that put it.
        if (intent === "layout" && (positions.isPinned(index) || (this.isHeld(index) && positions.isPlaced(index)))) {
            return false;
        }

        if (index >= positions.count) {
            positions.grow(index + 1);
        }

        positions.write(index, x, y, z);
        return true;
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
            const owned = writableLane(n.parentGraph?.getDataManager?.());
            if (owned !== undefined) {
                this.positionArray = owned;
            }
        }

        return this.writablePositions;
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
        // `honoursWeights` and `scoped` are taken from the class rather than from the descriptor the author
        // wrote, because the engine is where the fact is true: a descriptor that claimed weights
        // for an engine whose arrangement ignores them would put a live control in front of a
        // reader that changes nothing.
        publishLayoutDescriptor({
            descriptor: {
                ...descriptor,
                honoursWeights: declared.honoursWeights ?? false,
                scoped: declared.scoped ?? false,
            },
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

/** What a static engine reads the graph through: the element's data manager, or nothing. */
interface GraphSource {
    getSnapshot(): GraphSnapshot;
    undirected(snapshot: GraphSnapshot): DerivedGraph;
}

/** The graph one run of a static engine arranges, and how a node finds its row in it. */
interface LoadedGraph {
    /** The undirected graph the layout reads. */
    readonly snapshot: GraphSnapshot;
    /** The element's snapshot it was derived from, or null for an engine driven without one. */
    readonly source: GraphSnapshot | null;
    /** The element's array, or null for an engine driven without one. */
    readonly positions: ElementPositions | null;
    /** A node's row in `snapshot`, or `INVALID_INDEX`. */
    rowOf(n: Node): number;
}

/** The freeze a static engine is told about: the snapshot it replaced, the new one, and the renumbering. */
interface SnapshotReplacement {
    readonly previous: GraphSnapshot | null;
    readonly next: GraphSnapshot;
    readonly report: { readonly nodeRemap: Uint32Array | null };
}

/**
 * The rows of `next` that were already nodes of `previous`, when the freeze only ADDED to the graph:
 * no node left, and no edge appeared or disappeared between two nodes that were already there.
 *
 * That is what an interactive add looks like -- a new node, perhaps with edges to existing ones --
 * and it is the one change after which a static layout keeps every existing node where it was
 * (graph-format design 14.4). Anything else re-arranges the whole graph: edges arriving between
 * nodes that were already drawn change what a spectral, planar or Kamada-Kawai picture should be,
 * and holding the old picture would keep it wrong.
 * @param change - the freeze
 * @returns one set bit per existing row, or null when the freeze was not an add
 */
function existingRows(change: SnapshotReplacement): NodeMask | null {
    const { previous, next, report } = change;
    if (previous === null || next.nodeCount <= previous.nodeCount) {
        return null;
    }

    const old = makeMask(next.nodeCount);
    const remap = report.nodeRemap;
    for (let i = 0; i < previous.nodeCount; i++) {
        const row = remap === null ? i : remap[i];
        if (row === INVALID_INDEX) {
            return null;
        }

        maskSet(old, row, true);
    }

    const { src, dst } = next.edgeList();
    let between = 0;
    for (let e = 0; e < next.edgeCount; e++) {
        if (maskTest(old, src[e]) && maskTest(old, dst[e])) {
            between++;
        }
    }

    return between === previous.edgeCount ? old : null;
}

/**
 * Base class for static layout engines: an arrangement computed in one pass whenever the graph
 * changes, rather than stepped frame by frame.
 *
 * TWO WAYS TO WRITE ONE. The element's own engines read the protected `graph` -- the
 * element's undirected graph snapshot, whose row `i` is the node whose `index` is `i` -- and assign
 * an index-based `@graphty/layout` result to the protected `result` in `doLayout`. An
 * engine written before that existed fills the id-keyed {@link SimpleLayoutEngine.positions} record
 * instead, and still works. Either way the base class scales the answer into the element's shared
 * position array, never over a pinned row.
 *
 * AFTER AN ADD, EXISTING NODES STAY PUT. When the graph only grew -- a node added, with or without
 * edges to the ones already drawn -- and no file is still loading, a re-run of an engine that
 * reads `graph` places only the new nodes and leaves every existing one where it was. The
 * existing coordinates are also offered to the layout as its start (`startPositions`), which is
 * what lets Kamada-Kawai and ARF place a newcomer among its neighbours rather than from scratch.
 */
export abstract class SimpleLayoutEngine extends LayoutEngine {
    static type: string;
    protected _nodes: Node[] = [];
    protected _edges: Edge[] = [];
    stale = true;
    /** What an engine that does not read the protected `graph` computed, keyed by node id, in layout units. */
    positions: Record<string | number, number[]> = {};
    /** What an engine that reads the protected `graph` computed: row `i` is row `i` of that graph. */
    protected result: LayoutResult | null = null;
    scalingFactor = 100;

    /** The graph of the run in progress or the last one, once `graph` has been read. */
    #loaded: LoadedGraph | null = null;
    /** The last result in scene units, stride 3, in the row order of `#loaded`. */
    #column: F32 = new Float32Array(0);
    /** The element snapshot the last run arranged, which is what makes the next freeze an add to it. */
    #laidOut: GraphSnapshot | null = null;
    /** The rows the next run leaves where they are, set by an add. */
    #keep: NodeMask | null = null;

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
     * The graph this run arranges: the element's undirected snapshot, or, for an engine driven
     * without an element, a graph built from the nodes and edges it was handed, in that order.
     *
     * Read it in `doLayout`. Reading it may freeze the element's graph, which is how a node added
     * since the last run gets a row.
     * @returns the undirected graph
     */
    protected get graph(): GraphSnapshot {
        this.#loaded ??= this.#load();
        return this.#loaded.snapshot;
    }

    /**
     * The coordinates to start this run from, in layout units, `dim` values per row of
     * the protected `graph`: the element's current coordinates when the run follows an
     * add, otherwise null. An unplaced row is NaN.
     * @param dim - components per row
     * @returns the start rows, or null
     */
    protected startPositions(dim: 2 | 3): F32 | null {
        const { snapshot, positions } = this.#loaded ?? this.#load();
        if (this.#keep === null || positions === null) {
            return null;
        }

        return fromPositionColumn(positions.view(snapshot.nodeCount), dim, this.scalingFactor, null);
    }

    /**
     * The row of a node named in an option, in the protected `graph`.
     *
     * A key of an options record is always a string, so a string that misses is tried again as the
     * number it spells: `{ 1: [...] }` names the node whose id is the number 1.
     * @param id - the node id, or a record key naming one
     * @returns the row, or `INVALID_INDEX` when the graph has no such node
     */
    protected rowOfId(id: string | number): number {
        const { ids } = this.graph;
        const row = ids.indexOf(id);
        return row === INVALID_INDEX && typeof id === "string" && id.trim() !== "" ? ids.indexOf(Number(id)) : row;
    }

    /**
     * {@link SimpleLayoutEngine.rowOfId} for an option that must name a node.
     * @param id - the node id
     * @param what - what the option names, for the message
     * @returns the row
     * @throws when the graph has no such node
     */
    protected requireRow(id: string | number, what: string): number {
        const row = this.rowOfId(id);
        if (row === INVALID_INDEX) {
            throw new Error(`${what} node ${String(id)} is not in the graph`);
        }

        return row;
    }

    /**
     * Rows of an option that gives coordinates by node id, `dim` values per row of
     * the protected `graph`; a node the record does not give is NaN.
     * @param record - the coordinates by node id, in layout units, or null
     * @param dim - components per row
     * @returns the rows, or null for no record
     */
    protected rowsOfRecord(record: Record<string | number, number[]> | null, dim: 2 | 3): F32 | null {
        if (record === null) {
            return null;
        }

        const out = new Float32Array(dim * this.graph.nodeCount).fill(Number.NaN);
        for (const [id, coords] of Object.entries(record)) {
            const row = this.rowOfId(id);
            if (row !== INVALID_INDEX) {
                for (let k = 0; k < dim; k++) {
                    out[dim * row + k] = coords[k] ?? 0;
                }
            }
        }

        return out;
    }

    /**
     * Hear that the element's graph was frozen again.
     *
     * The layout is re-run at the next read. When the freeze only added to the graph this engine
     * last arranged, and the data is not still loading, the re-run keeps every existing node where
     * it is (see the class comment). A load is excluded because its chunks are one graph arriving,
     * not a reader adding to a finished one: a circle whose first chunk was held would be drawn as
     * two overlapping circles.
     * @param change - the freeze
     * @param loading - whether a load is still streaming records in
     */
    reload(change: SnapshotReplacement, loading: boolean): void {
        this.stale = true;
        this.#keep =
            !loading && this.#laidOut !== null && this.#laidOut === change.previous ? existingRows(change) : null;
    }

    /**
     * Get the position of a node, computing layout if stale
     *
     * The coordinates come from the shared position array, rounded to the f32 it stores. A node
     * with no row there falls back to what the engine computed, which is every node in an engine
     * driven by hand.
     * @param n - The node to get position for
     * @returns The node's position coordinates
     */
    getNodePosition(n: Node): Position {
        this.refresh();
        return this.publishedOr(n);
    }

    /**
     * Record where the reader has just put a node.
     *
     * A static layout has no per-node state a placement could live in, so the placement is
     * written into the SHARED array, with `"placement"` intent so that it lands even on a pinned
     * row, and into what the engine computed, so that the next publish of the same answer does
     * not put the node back.
     * @param n - the node that moved
     * @param p - where it moved to
     */
    protected setNodePosition(n: Node, p: Position): void {
        const z = p.z ?? 0;
        this.writeNodePosition(n, p.x, p.y, z, "placement");
        this.positions[n.id] = [p.x / this.scalingFactor, p.y / this.scalingFactor, z / this.scalingFactor];

        const row = this.#loaded?.rowOf(n) ?? INVALID_INDEX;
        if (row !== INVALID_INDEX && 3 * row + 2 < this.#column.length) {
            this.#column[3 * row] = p.x;
            this.#column[3 * row + 1] = p.y;
            this.#column[3 * row + 2] = z;
        }
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
            src: this.publishedOr(e.srcNode),
            dst: this.publishedOr(e.dstNode),
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

        this.publishComputed();
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
     * keeps walking it, so a node the reader deleted still draws at wherever it last was. The
     * layout is marked stale, so the next read recomputes it without the node.
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
     * `writeNodePosition` refuses to move a pinned row.
     */
    protected pin(): void {
        // See the doc comment: the element's position array holds the pin, not this engine.
    }

    /**
     * Unpin a node
     *
     * The element's position array holds the pin; see {@link SimpleLayoutEngine.pin}.
     */
    protected unpin(): void {
        // See the doc comment: the element's position array holds the pin, not this engine.
    }

    /**
     * Keep the arrangement in the array instead of recomputing one: a static layout that was
     * marked stale by the graph change an undo made would otherwise lay the graph out afresh at
     * the next read and write over what was restored.
     */
    override loadArrangement(): void {
        this.stale = false;
        super.loadArrangement();
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

    /** Compute the layout: assign the protected `result` from `graph`, or fill `positions`. */
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

        this.#loaded = null;
        this.result = null;
        this.doLayout();
        // doLayout() clears this itself in every engine that ships here, but an engine written
        // elsewhere may not, and leaving it set would recompute the whole layout on every read.
        this.stale = false;

        const loaded = this.#loaded as LoadedGraph | null;
        this.#column =
            this.result === null || loaded === null
                ? new Float32Array(0)
                : toPositionColumn(this.result, this.scalingFactor, null);
        this.#laidOut = loaded?.source ?? null;

        // A held row is dropped from the answer rather than skipped at publish time, so that a
        // later publish of the same answer cannot move it either: NaN is never written.
        const keep = this.#keep;
        this.#keep = null;
        if (keep !== null) {
            for (let row = 0; row < this.#column.length / 3; row++) {
                if (maskTest(keep, row)) {
                    this.#column.fill(Number.NaN, 3 * row, 3 * row + 3);
                }
            }
        }

        this.publishComputed();
    }

    /**
     * Read the graph this run arranges. See the protected `graph`.
     * @returns the loaded graph
     */
    #load(): LoadedGraph {
        // Reached the way `positionsFor` reaches the coordinate array: an engine driven directly,
        // by a test or by a host that keeps no graph, has nodes whose parent answers none of this.
        const manager: object | undefined = this._nodes[0]?.parentGraph?.getDataManager?.();
        const source = manager as Partial<GraphSource> | undefined;
        if (typeof source?.getSnapshot === "function" && typeof source.undirected === "function") {
            const store = source.getSnapshot();
            const { snapshot } = source.undirected(store);
            return {
                snapshot,
                source: store,
                positions: writableLane(manager) ?? null,
                rowOf: (n) => (n.index < snapshot.nodeCount ? n.index : INVALID_INDEX),
            };
        }

        const builder = new GraphBuilder({ directed: false, addMissingNodes: true });
        for (const n of this._nodes) {
            builder.addNode(n.id);
        }

        for (const e of this._edges) {
            builder.addEdge(e.srcId, e.dstId);
        }

        const snapshot = builder.freeze({ label: "static-layout" });
        return { snapshot, source: null, positions: null, rowOf: (n) => snapshot.ids.indexOf(n.id) };
    }

    /**
     * Write the computed answer into the shared array, scaled to scene units.
     *
     * A node the layout left unplaced (a NaN row, or no entry in `positions`) is LEFT UNPLACED
     * rather than published at the origin: the two are indistinguishable once stored, and the
     * origin is a place a reader would draw at.
     */
    private publishComputed(): void {
        const loaded = this.#loaded;
        const column = this.#column;
        for (const n of this._nodes) {
            if (loaded !== null && column.length > 0) {
                const row = loaded.rowOf(n);
                if (row !== INVALID_INDEX && 3 * row + 2 < column.length) {
                    this.writeNodePosition(n, column[3 * row], column[3 * row + 1], column[3 * row + 2]);
                }

                continue;
            }

            const pos = this.positions[n.id] as number[] | undefined;
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
     * A node's published row, or what the engine computed when it has no row of its own.
     *
     * The fallback is not a rare path: an engine driven directly -- by a test, or by a host that
     * keeps no graph -- has nodes whose index is `INVALID_INDEX`, and none of them is ever
     * published. Both branches produce the same arrangement; only the rounding differs.
     * @param n - the node, when the caller has one
     * @returns a fresh coordinate triple; the origin for a node nothing placed
     */
    private publishedOr(n: Node | undefined): Coords {
        const out = { x: 0, y: 0, z: 0 };
        if (n === undefined || this.readNodePosition(n, out)) {
            return out;
        }

        const row = this.#loaded?.rowOf(n) ?? INVALID_INDEX;
        const column = this.#column;
        if (row !== INVALID_INDEX && 3 * row + 2 < column.length && !Number.isNaN(column[3 * row])) {
            return { x: column[3 * row], y: column[3 * row + 1], z: column[3 * row + 2] };
        }

        const pos = this.positions[n.id] as number[] | undefined;
        if (!pos || pos.length === 0) {
            return out;
        }

        return {
            x: pos[0] * this.scalingFactor,
            y: pos[1] * this.scalingFactor,
            z: (pos[2] ?? 0) * this.scalingFactor,
        };
    }
}

/**
 * A dimension option as the index-based layouts take it.
 * @param dim - the option, a number from a config
 * @returns 3 for 3, otherwise 2
 */
export function layoutDim(dim: number): 2 | 3 {
    return dim === 3 ? 3 : 2;
}
