import { INVALID_INDEX } from "@graphty/graph-format";
import { z } from "zod/v4";

import type { OptionsSchema } from "../config";
import { ElementPositions, isStorableCoordinate } from "../data/positions";
import type { Edge } from "../Edge";
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
const layoutEngineRegistry = new Map<string, LayoutEngineClass>();

/**
 * Interface for LayoutEngine class static members
 * Used in type annotations when referencing layout classes
 */
interface LayoutEngineStatics {
    type: string;
    maxDimensions: number;
    zodOptionsSchema?: OptionsSchema;
    getZodOptionsSchema(): OptionsSchema;
    hasZodOptions(): boolean;
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
     * @param n - the node being placed
     * @param x - scene-unit x
     * @param y - scene-unit y
     * @param z - scene-unit z
     * @returns true when the row was written
     */
    protected writeNodePosition(n: Node, x: number, y: number, z: number): boolean {
        const { index } = n;
        if (index === INVALID_INDEX || !Number.isInteger(index) || index < 0) {
            return false;
        }

        if (!isStorableCoordinate(x) || !isStorableCoordinate(y) || !isStorableCoordinate(z)) {
            return false;
        }

        const positions = this.positionsFor(n);
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
     * Register a layout engine class in the global registry
     * @param cls - The layout engine class to register
     * @returns The registered class for chaining
     */
    static register<T extends LayoutEngineClass>(cls: T): T {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const t: string = (cls as any).type;
        layoutEngineRegistry.set(t, cls);
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
     * The coordinates come from the shared position array, which {@link SimpleLayoutEngine.refresh}
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
     * Set node position
     *
     * Simple layouts are static and recompute all positions from scratch,
     * so individual position setting is not supported.
     */
    setNodePosition(): void {
        // No-op for simple layouts
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
     * Pin a node in place
     *
     * Simple layouts are static and don't support interactive node pinning.
     */
    pin(): void {
        // No-op for simple layouts
    }

    /**
     * Unpin a node
     *
     * Simple layouts are static and don't support interactive node pinning.
     */
    unpin(): void {
        // No-op for simple layouts
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
