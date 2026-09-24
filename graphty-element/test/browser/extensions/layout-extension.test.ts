/**
 * @file A third party's layout engine, and whether the element treats it as one of its own.
 *
 * WHAT A LAYOUT ENGINE IS. A layout engine decides where every node sits. graphty-element ships
 * sixteen of them -- force simulations, circles, shells, spirals, trees -- and it lets anyone
 * else register one more: a class extending `LayoutEngine` (a simulation that is stepped every
 * frame) or `SimpleLayoutEngine` (an arrangement computed once), handed to `LayoutEngine.register`
 * and then chosen by name, exactly the way `"ngraph"` or `"circular"` is chosen. Both base classes
 * are published on `@graphty/graphty-element/extend`, which is the entry point a plugin author is
 * meant to write against.
 *
 * WHAT THIS FILE PROVES. Registering is the easy half and it is not what a customer is buying.
 * What they are buying is that a layout THEY wrote does everything the element's own layouts do:
 * that its coordinates reach the screen, that they also reach the element's own position array --
 * the one the session, a drag and a re-freeze all read -- that the consumer's options arrive, that
 * the element stops stepping when the layout says it has settled and announces it, that a node or
 * an edge added or removed after the fact is passed along, that a pinned node is left alone, that
 * the engine is disposed when the reader switches away, and that the element's 2D/3D mode reaches
 * it. Each `it` below is one of those, asserted by reading the OUTCOME: where the nodes ended up,
 * what the position array holds, where the edge was drawn. "It did not throw" is not evidence.
 *
 * TWO ENGINES ARE DEFINED HERE, both written the way a customer would write one. Every type they
 * name -- `Node`, `Edge`, `NodeIdType`, `Position`, `EdgePosition`, `LayoutDescriptor`,
 * `OptionDescriptor` -- comes from `/extend`, with no cast and nothing re-declared; the only
 * import from the package root is `Graph`, which belongs to this test harness and not to a plugin.
 *
 * `RingLayout` is a live simulation: it walks every node outwards to a place on a ring, a fixed
 * stride per step, and reports itself settled once nothing has anywhere left to go. `GridLayout`
 * is a static arrangement on `SimpleLayoutEngine`: rows and columns, computed in one pass. Neither
 * is a good layout. Both are deliberately arithmetic a reader can check by eye, because what is
 * under test is the element's treatment of them and not their cleverness.
 *
 * WHAT A PLUGIN NO LONGER HAS TO KNOW. `publishPositions()` is what puts an engine's coordinates
 * into the element's shared position array -- the one `session.positions` reads, a drag writes and
 * a re-freeze preserves. It used to be the engine's job and nothing said so, so an engine that
 * never made the call rendered perfectly and left every node unplaced, with no symptom until
 * something read the array. The element makes the call now, and `RingLayout` below deliberately
 * never does: it counts the calls the element makes on its behalf, so that if the element ever
 * stops making them a test says so instead of a customer finding out.
 *
 * The same goes for two other things a plugin used to owe and could not have discovered. An engine
 * had to assign `this.config` or a 2D/3D switch silently threw away every option the consumer had
 * set; the element rebuilds from the options it was given instead, and `RingLayout` never assigns
 * `config` so that the test for it means something. And `dispose`, `removeNode`, `removeEdge` and
 * `updatePositions` were duck-typed by the element's managers, declared nowhere, and implemented by
 * none of the sixteen engines that ship here; they are declared on the base class with working
 * defaults, and `RingLayout` overrides each one.
 *
 * WHAT THE CATALOGUE HALF IS FOR. Being registered is not the same as being offerable. A layout
 * that reaches no catalogue cannot appear in a picker, cannot describe itself in a reader's
 * language, and cannot publish the options a settings form would render -- so it is reachable only
 * by a consumer who already knows its name, which is not what the element's own layouts get. The
 * `static descriptor` on each engine below is what closes that, and the tests read it back through
 * `session.catalog.layouts()` and `layoutDescriptor` rather than through the registry it came
 * from.
 */

import { afterAll, afterEach, assert, beforeEach, describe, it } from "vitest";

import { LAYOUT_CATALOG, LAYOUT_DESCRIPTORS, layoutDescriptor, layoutIdForEngine } from "../../../catalog";
import {
    type AuthoredLayoutDescriptor,
    clearRegisteredLayoutsForTesting,
    type Edge,
    type EdgePosition,
    GraphtyError,
    isGraphtyError,
    type LayoutDescriptor,
    LayoutEngine,
    type Node,
    type NodeIdType,
    type OptionDescriptor,
    type Position,
    SimpleLayoutEngine,
} from "../../../extend";
import { Graph } from "../../../index.js";

/** Five nodes, so a ring has five distinct angles and no two nodes sit opposite each other. */
const NODES = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }, { id: "e" }];

/** A path through all five, so every node has at least one edge drawn to it. */
const EDGES = [
    { src: "a", dst: "b" },
    { src: "b", dst: "c" },
    { src: "c", dst: "d" },
    { src: "d", dst: "e" },
];

/** Roughly one animation frame, which is the granularity everything here polls at. */
const FRAME_MS = 16;

/** How long any single wait below is allowed to take before it is called a failure. */
const PATIENCE_MS = 5000;

/** The ring radius `RingLayout` uses when the consumer asks for nothing in particular. */
const DEFAULT_RADIUS = 120;

/** A coordinate triple with every component present, which is what both engines keep internally. */
interface Coords {
    x: number;
    y: number;
    z: number;
}

/** What a consumer may configure on `RingLayout`. */
interface RingOptions {
    /** Distance from the origin to the ring, in scene units. */
    radius: number;
    /** How far a node is allowed to travel in one step, which is what makes this a simulation. */
    stride: number;
    /** Vertical separation between consecutive nodes, ignored in two dimensions. */
    layerGap: number;
    /** Set by the element from its own 2D/3D mode; see `getOptionsForDimension`. */
    dimensions: 2 | 3;
}

/**
 * What `RingLayout` lets a consumer configure, in the plain-JSON form the catalogue publishes.
 *
 * Declared beside the engine rather than inside the class because the class body reads better
 * with its behaviour in it, and because this is the thing a picker consumes: name, plain name,
 * type, default and range are everything a form needs and everything validation needs.
 */
const RING_OPTIONS: readonly OptionDescriptor[] = [
    {
        name: "radius",
        plainName: "Ring size",
        description: "How far from the middle the ring sits, in scene units.",
        type: "number",
        default: DEFAULT_RADIUS,
        min: 1,
        max: 1000,
    },
    {
        name: "stride",
        plainName: "Step size",
        description: "How far a node may travel in one step, which is what makes this a simulation.",
        type: "number",
        default: 45,
        min: 1,
        max: 500,
    },
    {
        name: "layerGap",
        plainName: "Layer gap",
        description: "Vertical separation between consecutive nodes. Ignored in two dimensions.",
        type: "number",
        default: 10,
        min: 0,
        max: 100,
    },
];

/**
 * Move one coordinate towards another, never overshooting it.
 * @param from - where the coordinate is now
 * @param to - where it is going
 * @param maxDelta - the furthest it may travel this step
 * @returns the new coordinate, exactly equal to `to` once it is within reach
 */
function approach(from: number, to: number, maxDelta: number): number {
    const delta = to - from;
    if (Math.abs(delta) <= maxDelta) {
        return to;
    }

    return from + Math.sign(delta) * maxDelta;
}

/**
 * A live layout engine written by a third party: a simulation that is stepped every frame.
 *
 * Nodes start at the origin and walk outwards to evenly spaced places on a ring of `radius`,
 * travelling at most `stride` units per step, so the arrangement a reader ends up looking at is
 * exactly predictable: every node sits at distance `radius` from the vertical axis. In three
 * dimensions consecutive nodes are also separated vertically, which is how the tests below tell
 * a 3D run from a 2D one.
 */
class RingLayout extends LayoutEngine {
    static type = "test-ring";
    static maxDimensions = 3;

    /**
     * What a picker reads about this layout, and the one place its options are declared.
     *
     * `id` is the same string as `static type` on purpose: a layout has ONE key, so the name a
     * consumer types, the name a saved document records and the name the catalogue publishes
     * cannot drift apart. The options are plain JSON -- the same `OptionDescriptor` shape the
     * element's own layouts publish -- so a settings form renders this without knowing anything
     * about the class behind it, and the element checks a caller's values against the same list.
     */
    static descriptor: AuthoredLayoutDescriptor = {
        id: "test-ring",
        plainName: "Ring Walk",
        technicalName: "Ring walk simulation",
        description: "Walks every node outwards to an evenly spaced place on one ring.",
        family: "geometric",
        kind: "live",
        maxDimensions: 3,
        sizeRating: "any",
        structuralInputs: [],
        engine: "test-ring",
        options: RING_OPTIONS,
    };

    /**
     * How the element asks a layout what it needs in order to draw in two or in three dimensions.
     *
     * The answer is merged into the options the consumer gave before the engine is constructed,
     * which is the only route by which a layout learns the element's view mode.
     * @param dimension - 2 or 3, taken from the element's current view mode
     * @returns the options to merge, or null when this layout cannot draw in that many dimensions
     */
    static getOptionsForDimension(dimension: 2 | 3): object | null {
        if (dimension > this.maxDimensions) {
            return null;
        }

        return { dimensions: dimension };
    }

    readonly radius: number;
    readonly stride: number;
    readonly layerGap: number;
    readonly dimensions: 2 | 3;

    /** Set by `dispose`, which the element calls when the reader switches to another layout. */
    disposed = false;

    /** Exactly what the element handed the constructor, so a test can see the defaults arrive. */
    readonly receivedOptions: Readonly<Record<string, unknown>>;

    /**
     * How many times the ELEMENT has published this engine's coordinates. This engine never
     * publishes its own, which is the point: a plugin that does not know the array exists still
     * fills it.
     */
    publishedByElement = 0;

    /** Every batch of nodes the element has asked this engine to place after the fact. */
    readonly incrementalUpdates: NodeIdType[][] = [];

    /** How many times the element has stepped this simulation. */
    stepCount = 0;

    /** How many times the element has asked this engine where an edge's two ends are. */
    edgeReads = 0;

    /** The ids the element passed to `removeNode`, in the order it passed them. */
    removedNodeIds: NodeIdType[] = [];

    /** The ids the element passed to `removeEdge`, in the order it passed them. */
    removedEdgeIds: string[] = [];

    private readonly nodeList: Node[] = [];
    private readonly edgeList: Edge[] = [];
    private readonly placed = new Map<Node, Coords>();
    private readonly pinnedNodes = new Set<Node>();
    private arrived = false;

    /**
     * Build the engine from whatever the element passed through.
     * @param opts - the consumer's `layoutConfig`, merged with `getOptionsForDimension`'s answer
     */
    constructor(opts: Partial<RingOptions> = {}) {
        super();
        this.receivedOptions = { ...opts };
        this.radius = opts.radius ?? DEFAULT_RADIUS;
        this.stride = opts.stride ?? 45;
        this.layerGap = opts.layerGap ?? 10;
        this.dimensions = opts.dimensions ?? 3;
    }

    /**
     * Nothing to set up. The element awaits this before it draws anything, which is where an
     * engine that has to fetch or compile something would do it.
     * @returns a promise that is already resolved
     */
    init(): Promise<void> {
        return Promise.resolve();
    }

    addNode(n: Node): void {
        this.nodeList.push(n);
        this.placed.set(n, { x: 0, y: 0, z: 0 });
        this.arrived = false;
    }

    addEdge(e: Edge): void {
        this.edgeList.push(e);
    }

    /**
     * Advance every unpinned node one stride towards its place on the ring.
     *
     * There is deliberately NO publish here. Copying these coordinates into the element's position
     * array is the element's job, and an engine written by someone who never read about that array
     * has to end up with the same picture as one that did.
     */
    step(): void {
        this.stepCount++;

        const count = this.nodeList.length;
        let moving = false;

        for (const [index, node] of this.nodeList.entries()) {
            if (this.pinnedNodes.has(node)) {
                continue;
            }

            const current = this.coordsOf(node);
            const goal = this.placeOnRing(index, count);
            const next = {
                x: approach(current.x, goal.x, this.stride),
                y: approach(current.y, goal.y, this.stride),
                z: approach(current.z, goal.z, this.stride),
            };

            if (next.x !== current.x || next.y !== current.y || next.z !== current.z) {
                moving = true;
            }

            this.placed.set(node, next);
        }

        this.arrived = !moving;
    }

    getNodePosition(n: Node): Position {
        return { ...this.coordsOf(n) };
    }

    /**
     * Take a node wherever the element says it now is, which is what a drag amounts to.
     *
     * The coordinate is written straight into the shared position array as well as into this
     * engine's own state, because a settled simulation may never run another step.
     * @param n - the node that moved
     * @param p - where it moved to
     */
    setNodePosition(n: Node, p: Position): void {
        const moved = { x: p.x, y: p.y, z: p.z ?? 0 };
        this.placed.set(n, moved);
        this.writeNodePosition(n, moved.x, moved.y, moved.z);
    }

    getEdgePosition(e: Edge): EdgePosition {
        this.edgeReads++;
        return { src: this.getNodePosition(e.srcNode), dst: this.getNodePosition(e.dstNode) };
    }

    pin(n: Node): void {
        this.pinnedNodes.add(n);
    }

    unpin(n: Node): void {
        this.pinnedNodes.delete(n);
        this.arrived = false;
    }

    /**
     * Whether the element has asked this engine to hold a node still.
     * @param n - the node to ask about
     * @returns true while the element's pin is in force
     */
    holdsPinned(n: Node): boolean {
        return this.pinnedNodes.has(n);
    }

    get nodes(): Iterable<Node> {
        return this.nodeList;
    }

    get edges(): Iterable<Edge> {
        return this.edgeList;
    }

    get isSettled(): boolean {
        return this.arrived;
    }

    /**
     * Part of the element's optional layout protocol, now declared on the base class with a
     * do-nothing default rather than duck-typed by the element's data manager.
     * @param n - the node the element has just taken out of the graph
     */
    override removeNode(n: Node): void {
        const index = this.nodeList.indexOf(n);
        if (index >= 0) {
            this.nodeList.splice(index, 1);
        }

        this.placed.delete(n);
        this.pinnedNodes.delete(n);
        this.removedNodeIds.push(n.id);
        this.arrived = false;
    }

    /**
     * The edge half of the same optional protocol.
     * @param e - the edge the element has just taken out of the graph
     */
    override removeEdge(e: Edge): void {
        const index = this.edgeList.indexOf(e);
        if (index >= 0) {
            this.edgeList.splice(index, 1);
        }

        this.removedEdgeIds.push(e.id);
    }

    /**
     * Copy this engine's coordinates into the element's shared position array.
     *
     * Overridden only to count: the base class does the work, and what is under test is that the
     * ELEMENT calls this rather than leaving it to an engine that may not know it exists.
     */
    override publishPositions(): void {
        this.publishedByElement++;
        super.publishPositions();
    }

    /**
     * Place nodes that reached the graph after this layout was already running.
     *
     * A declared hook with a working default on the base class, so an engine that can do better
     * than the element's blind re-stepping says so by overriding it. This one records what it was
     * asked about and then lets the default settle the ring.
     * @param nodes - the nodes the element wants placed
     */
    override updatePositions(nodes: readonly Node[]): void {
        this.incrementalUpdates.push(nodes.map((n) => n.id));
        super.updatePositions(nodes);
    }

    /** Called by the element when the reader chooses a different layout. */
    override dispose(): void {
        this.disposed = true;
    }

    /**
     * Where a node belongs once the simulation has finished.
     * @param index - the node's place in the order it was added
     * @param count - how many nodes the ring has to seat
     * @returns the node's destination in scene units
     */
    private placeOnRing(index: number, count: number): Coords {
        const angle = (2 * Math.PI * index) / count;
        return {
            x: this.radius * Math.cos(angle),
            y: this.radius * Math.sin(angle),
            z: this.dimensions === 3 ? (index - (count - 1) / 2) * this.layerGap : 0,
        };
    }

    /**
     * Where a node is right now, defaulting to the origin every node starts at.
     * @param n - the node to read
     * @returns its current coordinates, by reference
     */
    private coordsOf(n: Node): Coords {
        return this.placed.get(n) ?? { x: 0, y: 0, z: 0 };
    }
}

/** What a consumer may configure on `GridLayout`. */
interface GridOptions {
    /** Multiplier the base class applies to everything `doLayout` computes. */
    scalingFactor: number;
    /** How many nodes to a row. */
    columns: number;
}

/**
 * A static layout engine written by a third party, on the base class meant for arrangements that
 * are computed rather than simulated.
 *
 * `SimpleLayoutEngine` asks for one method. Everything else -- when to recompute, how to scale
 * what was computed, how to answer a position request, reporting itself settled -- belongs to the
 * base class, so this is the whole of a static plugin layout.
 */
class GridLayout extends SimpleLayoutEngine {
    static type = "test-grid";
    static maxDimensions = 3;

    /** See {@link RingLayout.descriptor}: one key, and one option list a form can render. */
    static descriptor: AuthoredLayoutDescriptor = {
        id: "test-grid",
        plainName: "Grid",
        technicalName: "Row-and-column placement",
        description: "Puts the nodes in rows, in the order they arrived.",
        family: "geometric",
        kind: "batch",
        maxDimensions: 3,
        sizeRating: "any",
        structuralInputs: [],
        engine: "test-grid",
        options: [
            {
                name: "columns",
                plainName: "Columns",
                description: "How many nodes to a row.",
                type: "integer",
                default: 3,
                min: 1,
                max: 100,
            },
            {
                name: "scalingFactor",
                plainName: "Spacing",
                description: "Scene units between neighbouring cells.",
                type: "number",
                default: 100,
                min: 1,
                max: 1000,
            },
        ],
    };

    readonly columns: number;

    /** How many times the base class has asked for the arrangement to be computed. */
    layoutPasses = 0;

    /**
     * Build the engine from whatever the element passed through.
     * @param opts - the consumer's `layoutConfig`, merged with the base class's dimension options
     */
    constructor(opts: Partial<GridOptions> = {}) {
        super(opts);
        this.columns = opts.columns ?? 3;
    }

    /**
     * Put the nodes in rows, in the order they arrived.
     *
     * The numbers written here are in layout units, not scene units: the base class multiplies
     * them by `scalingFactor` on its way into the shared position array.
     */
    doLayout(): void {
        this.layoutPasses++;
        this.positions = {};

        for (const [index, node] of [...this.nodes].entries()) {
            this.positions[node.id] = [index % this.columns, Math.floor(index / this.columns), 0];
        }
    }
}

/**
 * A filled-in descriptor for an engine that exists only so that a registration can be tried.
 * @param id - the layout's one key: the name a consumer types and the name the catalogue publishes
 * @param plainName - what a picker would show a reader
 * @returns a descriptor a registration would otherwise accept
 */
function spareDescriptor(id: string, plainName: string): AuthoredLayoutDescriptor {
    return {
        id,
        plainName,
        technicalName: `${plainName} layout`,
        description: `A layout registered by a test under the name "${id}".`,
        family: "special",
        kind: "batch",
        maxDimensions: 3,
        sizeRating: "any",
        structuralInputs: [],
        engine: id,
        options: [],
    };
}

/**
 * An engine with nothing to say, used only to be handed to `register` so that what comes back can
 * be read. It deliberately declares no `static type`, which is itself one of the refusals below.
 */
class SpareLayout extends SimpleLayoutEngine {
    static maxDimensions = 3;

    /** Place nothing: no consumer ever chooses this engine. */
    doLayout(): void {
        this.positions = {};
    }
}

/**
 * A throwaway engine that names itself and describes itself.
 * @param name - what the class declares as its `static type`
 * @param id - what its descriptor claims as its id; the same string unless a test wants a clash
 * @returns the class, ready to be handed to `LayoutEngine.register`
 */
function engineNamed(name: string, id: string = name): typeof SpareLayout {
    class Candidate extends SpareLayout {}
    Candidate.type = name;
    Candidate.descriptor = spareDescriptor(id, id);

    return Candidate;
}

/**
 * A throwaway engine that names itself and describes itself to nobody.
 * @param name - what the class declares as its `static type`
 * @returns the class, ready to be handed to `LayoutEngine.register`
 */
function undescribedEngine(name: string): typeof SpareLayout {
    class Candidate extends SpareLayout {}
    Candidate.type = name;

    return Candidate;
}

/**
 * A plugin that refuses the graph it was handed, the way one that needs a root node would.
 *
 * It throws from its CONSTRUCTOR, which used to be the one layout failure the element absorbed
 * entirely: the consumer got a plain `Error` with a rewritten message, the code was gone, and no
 * error event went out at all.
 */
class RefusingLayout extends GridLayout {
    static type = "test-refuses";
    static descriptor: AuthoredLayoutDescriptor = spareDescriptor("test-refuses", "Refuses");

    /**
     * Refuse immediately, with a code a consumer can switch on.
     * @param opts - the consumer's options, which this engine never gets as far as reading
     */
    constructor(opts: Partial<GridOptions> = {}) {
        super(opts);
        throw new GraphtyError({
            code: "E_UNSUPPORTED",
            message: "this layout needs a root node and was given none",
            source: "layout",
            details: { layout: "test-refuses" },
        });
    }
}

/**
 * A plugin whose asynchronous set-up fails, the way one that had to fetch or compile something
 * would. The element awaits `init()` before it draws a frame with a layout, so what it does with a
 * failure there decides what a plugin author can rely on.
 */
class LateFailureLayout extends GridLayout {
    static type = "test-late-failure";
    static descriptor: AuthoredLayoutDescriptor = spareDescriptor("test-late-failure", "Late failure");

    /**
     * How many engines of this class the element has told to let go of what they took.
     *
     * Counted on the class rather than on the instance because the element never hands back an
     * engine whose set-up failed: a test has no other way to see that it was released.
     */
    static releases = 0;

    /** Record that the element released this engine after its set-up failed. */
    override dispose(): void {
        LateFailureLayout.releases++;
    }

    /**
     * Fail the way a plugin that could not reach its own data would.
     * @returns a promise that always rejects, carrying a code a consumer can switch on
     */
    override init(): Promise<void> {
        return Promise.reject(
            new GraphtyError({
                code: "E_FETCH_FAILED",
                message: "the layout server did not answer",
                source: "layout",
                details: { layout: "test-late-failure" },
            }),
        );
    }
}

/**
 * Run a registration that must be refused, and hand back the refusal.
 * @param act - the registration to try
 * @returns the error it threw
 */
function refusalOf(act: () => void): GraphtyError {
    try {
        act();
    } catch (error) {
        if (isGraphtyError(error)) {
            return error;
        }

        throw error;
    }

    throw new Error("the registration was accepted when it should have been refused");
}

LayoutEngine.register(RingLayout);
LayoutEngine.register(GridLayout);
LayoutEngine.register(RefusingLayout);
LayoutEngine.register(LateFailureLayout);

/**
 * How far a point lies from the segment joining two others.
 *
 * The element trims an edge's line back to the surface of each node so an arrowhead has somewhere
 * to sit, so the drawn line is shorter than the engine's endpoints but still lies along them.
 * Distance from the segment is therefore the honest measure of "drawn between those two ends".
 * @param point - the point to measure
 * @param from - one end of the segment
 * @param to - the other end
 * @returns the distance in scene units
 */
function distanceFromSegment(point: Coords, from: Coords, to: Coords): number {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dz = to.z - from.z;
    const lengthSquared = dx * dx + dy * dy + dz * dz;

    const projection =
        lengthSquared === 0 ? 0 : ((point.x - from.x) * dx + (point.y - from.y) * dy + (point.z - from.z) * dz) / lengthSquared;
    const clamped = Math.min(1, Math.max(0, projection));

    return Math.hypot(
        point.x - (from.x + clamped * dx),
        point.y - (from.y + clamped * dy),
        point.z - (from.z + clamped * dz),
    );
}

/**
 * Pause for roughly one animation frame.
 * @param ms - how long to wait
 * @returns a promise that resolves after the wait
 */
function delay(ms: number): Promise<void> {
    return new Promise<void>((resolve) => {
        setTimeout(resolve, ms);
    });
}

/**
 * Poll until something becomes true, or give up loudly.
 * @param condition - what is being waited for
 * @param what - how to describe it if the wait fails
 */
async function waitFor(condition: () => boolean, what: string): Promise<void> {
    const deadline = Date.now() + PATIENCE_MS;

    while (Date.now() < deadline) {
        if (condition()) {
            return;
        }

        await delay(FRAME_MS);
    }

    throw new Error(`timed out waiting for ${what}`);
}

describe("a third party's layout engine", () => {
    let container: HTMLDivElement;
    let graph: Graph;

    /**
     * Choose a layout by name and wait until the element has finished drawing with it.
     *
     * The wait ends when the engine reports itself settled AND the element has noticed: the
     * element only stops running a layout after the frame in which it last moved the meshes, so
     * by the time both are true the picture on screen is the engine's final answer.
     * @param type - the layout's registered name, the way a consumer spells it
     * @param opts - the consumer's layout options
     * @returns the engine the element built
     */
    async function useLayout<T extends LayoutEngine>(type: string, opts: object = {}): Promise<T> {
        await graph.setLayout(type, opts);
        await graph.operationQueue.waitForCompletion();

        const manager = graph.getLayoutManager();
        const engine = manager.layoutEngine;
        if (!engine) {
            throw new Error(`the element built no layout engine for "${type}"`);
        }

        await waitFor(() => engine.isSettled && !manager.running, `the "${type}" layout to settle`);

        return engine as T;
    }

    /**
     * Wait for the element to finish redrawing after the graph itself changed.
     * @param what - how to describe the wait if it fails
     */
    async function waitForRedraw(what: string): Promise<void> {
        await graph.operationQueue.waitForCompletion();

        const manager = graph.getLayoutManager();
        await waitFor(() => (manager.layoutEngine?.isSettled ?? false) && !manager.running, what);
    }

    /**
     * The engine the element is laying out with right now, which must be the plugin's ring.
     *
     * Reading it back through the manager rather than through `setLayout`'s return is the point:
     * the element rebuilds an engine by itself on a view-mode change, and what a test needs to see
     * is what the element built, not what it was handed.
     * @returns the engine
     */
    function currentRingEngine(): RingLayout {
        const engine = graph.getLayoutManager().layoutEngine;
        if (!(engine instanceof RingLayout)) {
            throw new Error("the element is not laying out with the plugin's ring engine");
        }

        return engine;
    }

    /**
     * One layout as the SESSION offers it, which is what a picker would read.
     * @param id - the layout's key
     * @returns the descriptor
     */
    function offeredLayout(id: string): LayoutDescriptor {
        const found = graph
            .getSession()
            .catalog.layouts()
            .find((candidate) => candidate.id === id);
        if (!found) {
            throw new Error(`the session's catalogue offers no layout "${id}"`);
        }

        return found;
    }

    /**
     * Run something that must fail, and hand back the failure.
     * @param act - what to try
     * @returns the error it produced
     */
    async function failureOf(act: () => Promise<unknown>): Promise<GraphtyError> {
        try {
            await act();
        } catch (error) {
            if (isGraphtyError(error)) {
                return error;
            }

            throw error;
        }

        throw new Error("the call succeeded when it should have failed");
    }

    /**
     * Start collecting the layout failures the element reports to its consumer.
     * @returns a function answering with everything that has arrived so far
     */
    function collectLayoutErrors(): () => Error[] {
        const seen: Error[] = [];

        graph.on("error", (event) => {
            if (event.type === "error" && event.context === "layout") {
                seen.push(event.error);
            }
        });

        return () => seen;
    }

    /**
     * A node by id, or a failure that names the missing node.
     * @param id - the node's id
     * @returns the node
     */
    function nodeById(id: string): Node {
        const found = graph.getNode(id);
        if (!found) {
            throw new Error(`the graph has no node "${id}"`);
        }

        return found;
    }

    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = "400px";
        container.style.height = "300px";
        document.body.appendChild(container);

        graph = new Graph(container);
        await graph.init();
        await graph.addNodes(NODES);
        await graph.addEdges(EDGES);
        await graph.operationQueue.waitForCompletion();

        // Park the element on a layout that finishes in one pass before any test begins. The
        // element starts every graph on its own force simulation, which is still running while
        // these tests set up, and a test that watched for "the layout settled" would otherwise be
        // liable to see that one finish rather than its own.
        await useLayout("test-grid");
    });

    afterEach(() => {
        graph.dispose();
        container.remove();
    });

    describe("a live engine that the element steps", () => {
        it("is the engine the element lays the graph out with, once a consumer names it", async () => {
            const engine = await useLayout<RingLayout>("test-ring");

            assert.instanceOf(engine, RingLayout, "the element built the plugin's class");
            assert.strictEqual(engine.type, "test-ring", "and it answers to the name it registered under");
            assert.include(LayoutEngine.getRegisteredTypes(), "test-ring");
        });

        it("places every node, and the element draws each one where the engine put it", async () => {
            const engine = await useLayout<RingLayout>("test-ring");

            const drawn = new Set<string>();
            for (const node of graph.getNodes()) {
                const onScreen = node.getPosition();

                assert.closeTo(
                    Math.hypot(onScreen.x, onScreen.y),
                    DEFAULT_RADIUS,
                    0.5,
                    `node ${node.id} is drawn on the ring the engine computed`,
                );

                const fromEngine = engine.getNodePosition(node);
                assert.closeTo(onScreen.x, fromEngine.x, 0.01);
                assert.closeTo(onScreen.y, fromEngine.y, 0.01);
                assert.closeTo(onScreen.z, fromEngine.z ?? 0, 0.01);

                drawn.add(`${onScreen.x.toFixed(2)},${onScreen.y.toFixed(2)},${onScreen.z.toFixed(2)}`);
            }

            assert.strictEqual(drawn.size, NODES.length, "every node got its own place, not a shared one");
        });

        it("publishes its coordinates into the element's own position array", async () => {
            const engine = await useLayout<RingLayout>("test-ring");
            const { positions } = graph.getSession();
            const stored = { x: 0, y: 0, z: 0 };

            for (const node of graph.getNodes()) {
                assert.isTrue(positions.isPlaced(node.index), `the array holds a row for node ${node.id}`);

                positions.read(node.index, stored);
                const fromEngine = engine.getNodePosition(node);

                assert.closeTo(stored.x, fromEngine.x, 0.01, `stored x for node ${node.id}`);
                assert.closeTo(stored.y, fromEngine.y, 0.01, `stored y for node ${node.id}`);
                assert.closeTo(stored.z, fromEngine.z ?? 0, 0.01, `stored z for node ${node.id}`);
            }
        });

        it("draws every edge between the two ends the engine reports", async () => {
            const engine = await useLayout<RingLayout>("test-ring");

            assert.isAbove(engine.edgeReads, 0, "the element asked the engine where the edges are");

            for (const edge of graph.getDataManager().edges.values()) {
                const { src, dst } = engine.getEdgePosition(edge);
                const from = { x: src.x, y: src.y, z: src.z ?? 0 };
                const to = { x: dst.x, y: dst.y, z: dst.z ?? 0 };
                const { mesh } = edge;

                assert.isAbove(Math.hypot(from.x - to.x, from.y - to.y, from.z - to.z), 1, "the ends are apart");
                assert.isBelow(
                    distanceFromSegment(mesh.position, from, to),
                    1,
                    `edge ${edge.id} is drawn along the line between the ends the engine gave`,
                );
            }
        });

        it("is built with the options the consumer configured", async () => {
            const engine = await useLayout<RingLayout>("test-ring", { radius: 250 });

            assert.strictEqual(engine.radius, 250, "the consumer's option reached the constructor");

            for (const node of graph.getNodes()) {
                const onScreen = node.getPosition();
                assert.closeTo(Math.hypot(onScreen.x, onScreen.y), 250, 0.5, `node ${node.id} is on the wider ring`);
            }
        });

        it("stops the element stepping, and is announced to the consumer, once it reports itself settled", async () => {
            let settlements = 0;
            graph.on("graph-settled", () => {
                settlements++;
            });

            const engine = await useLayout<RingLayout>("test-ring");

            assert.isTrue(engine.isSettled, "the engine says it has finished");
            assert.isAbove(engine.stepCount, 1, "and it was stepped on the way there");
            assert.isAbove(settlements, 0, "the element told its consumer the graph had settled");

            const stepsWhenSettled = engine.stepCount;
            await delay(FRAME_MS * 6);

            assert.strictEqual(engine.stepCount, stepsWhenSettled, "and the element stopped stepping it");
        });

        it("is given nodes and edges that arrive after the layout was chosen", async () => {
            const engine = await useLayout<RingLayout>("test-ring");

            await graph.addNodes([{ id: "f" }]);
            await graph.addEdges([{ src: "e", dst: "f" }]);
            await waitForRedraw("the ring to take in the new node");

            assert.strictEqual([...engine.nodes].length, NODES.length + 1, "the engine was handed the new node");
            assert.strictEqual([...engine.edges].length, EDGES.length + 1, "and the new edge");

            const added = nodeById("f");
            assert.closeTo(
                Math.hypot(added.getPosition().x, added.getPosition().y),
                DEFAULT_RADIUS,
                0.5,
                "and it was laid out with the rest rather than left at the origin",
            );
        });

        it("is told when a node is taken out of the graph", async () => {
            const engine = await useLayout<RingLayout>("test-ring");

            await graph.removeNodes(["c"]);
            await graph.operationQueue.waitForCompletion();

            assert.deepStrictEqual(engine.removedNodeIds, ["c"], "the element named the node it removed");
            assert.strictEqual([...engine.nodes].length, NODES.length - 1, "and the engine is no longer holding it");
        });

        it("is told when an edge is taken out of the graph", async () => {
            const engine = await useLayout<RingLayout>("test-ring");

            const [first] = [...graph.getDataManager().edges.values()];
            graph.getDataManager().removeEdge(first.id);

            assert.deepStrictEqual(engine.removedEdgeIds, [first.id], "the element named the edge it removed");
            assert.strictEqual([...engine.edges].length, EDGES.length - 1, "and the engine is no longer holding it");
        });

        it("leaves a pinned node exactly where it is, and moves it again once it is released", async () => {
            const engine = await useLayout<RingLayout>("test-ring");

            const held = nodeById("a");
            const free = nodeById("b");
            const heldBefore = { ...held.getPosition() };
            const freeBefore = { ...free.getPosition() };

            held.pin();
            assert.isTrue(held.isPinned(), "the element reports the node pinned in the plugin's engine");
            assert.isTrue(engine.holdsPinned(held), "and the pin reached the engine itself");

            // A sixth node re-seats the whole ring, so every node that is free to move has
            // somewhere new to be and standing still means something.
            await graph.addNodes([{ id: "f" }]);
            await waitForRedraw("the ring to re-seat itself around the pinned node");

            assert.deepStrictEqual(held.getPosition(), heldBefore, "the pinned node did not move");
            assert.notDeepEqual(free.getPosition(), freeBefore, "while an unpinned one did");

            held.unpin();
            assert.isFalse(held.isPinned());
            assert.isFalse(engine.holdsPinned(held), "and the release reached the engine too");

            await graph.addNodes([{ id: "g" }]);
            await waitForRedraw("the released node to rejoin the ring");

            assert.notDeepEqual(held.getPosition(), heldBefore, "the released node moved with everything else");
        });

        it("is told where the reader dropped a node they dragged, and the element leaves it there", async () => {
            const engine = await useLayout<RingLayout>("test-ring");

            const dragged = nodeById("a");
            const handler = dragged.dragHandler;
            if (!handler) {
                throw new Error("the element gave the node no drag handler");
            }

            // A drag is the one route by which a coordinate travels from the reader INTO the
            // engine, and `setNodePosition` is the member every engine must implement to receive
            // it. Nothing else in the element calls it, so without this the element could stop
            // calling it and a plugin would only find out from a reader whose drag did nothing.
            const grabbed = dragged.mesh.position.clone();
            const released = dragged.mesh.position.clone();
            released.x += 60;
            released.y += 20;

            handler.onDragStart(grabbed);
            handler.onDragUpdate(released);
            handler.onDragEnd();

            const fromEngine = engine.getNodePosition(dragged);
            assert.closeTo(fromEngine.x, grabbed.x + 60, 0.01, "the engine was told where the node was dropped");
            assert.closeTo(fromEngine.y, grabbed.y + 20, 0.01);

            const { positions } = graph.getSession();
            const stored = { x: 0, y: 0, z: 0 };
            assert.isTrue(positions.isPlaced(dragged.index), "the drop has a row in the element's position array");

            positions.read(dragged.index, stored);
            assert.closeTo(stored.x, grabbed.x + 60, 0.5, "and the array holds where the reader left it");
            assert.closeTo(stored.y, grabbed.y + 20, 0.5);

            await delay(FRAME_MS * 6);

            assert.closeTo(dragged.getPosition().x, grabbed.x + 60, 0.01, "and nothing pulled it back afterwards");
            assert.closeTo(dragged.getPosition().y, grabbed.y + 20, 0.01);
        });

        it("is disposed when the consumer switches to another layout", async () => {
            const ring = await useLayout<RingLayout>("test-ring");
            assert.isFalse(ring.disposed, "still in use");

            await useLayout<GridLayout>("test-grid");

            assert.isTrue(ring.disposed, "the element released the engine it had finished with");
        });

        it("is told whether the element is drawing in two dimensions or three", async () => {
            const inThree = await useLayout<RingLayout>("test-ring");
            assert.strictEqual(inThree.dimensions, 3, "a 3D element asked for a 3D layout");
            assert.isTrue(
                graph.getNodes().some((node) => Math.abs(node.getPosition().z) > 1),
                "and the layout used the third dimension",
            );

            await graph.setViewMode("2d");
            const inTwo = await useLayout<RingLayout>("test-ring");

            assert.strictEqual(inTwo.dimensions, 2, "a 2D element asked for a 2D layout");

            const { positions } = graph.getSession();
            const stored = { x: 0, y: 0, z: 0 };
            for (const node of graph.getNodes()) {
                positions.read(node.index, stored);
                assert.strictEqual(stored.z, 0, `node ${node.id} was laid out flat`);
            }
        });
    });

    describe("a static engine built on SimpleLayoutEngine", () => {
        it("places every node in a single pass, with no simulation to step", async () => {
            const engine = await useLayout<GridLayout>("test-grid", { columns: 2 });

            assert.strictEqual(engine.layoutPasses, 1, "the arrangement was computed once");
            assert.isTrue(engine.isSettled, "and a static layout is finished the moment it exists");

            const places = new Set<string>();
            for (const node of graph.getNodes()) {
                const onScreen = node.getPosition();
                places.add(`${onScreen.x.toFixed(2)},${onScreen.y.toFixed(2)}`);
            }

            assert.strictEqual(places.size, NODES.length, "every node got its own cell in the grid");
        });

        it("has what it computed scaled by the consumer's scaling factor", async () => {
            await useLayout<GridLayout>("test-grid", { columns: 2, scalingFactor: 40 });
            const narrow = graph.getNodes().map((node) => ({ ...node.getPosition() }));

            await useLayout<GridLayout>("test-grid", { columns: 2, scalingFactor: 80 });
            const wide = graph.getNodes().map((node) => ({ ...node.getPosition() }));

            for (const [index, place] of narrow.entries()) {
                const expectedX = (index % 2) * 40;
                const expectedY = Math.floor(index / 2) * 40;

                assert.closeTo(place.x, expectedX, 0.01, `column ${index} at the narrow scale`);
                assert.closeTo(place.y, expectedY, 0.01, `row ${index} at the narrow scale`);
                assert.closeTo(wide[index].x, expectedX * 2, 0.01, `column ${index} at twice the scale`);
                assert.closeTo(wide[index].y, expectedY * 2, 0.01, `row ${index} at twice the scale`);
            }
        });
    });

    describe("being offerable, and not only reachable", () => {
        it("is in the list of layouts the session offers, described the way a picker needs", () => {
            const ring = offeredLayout("test-ring");

            assert.strictEqual(ring.plainName, "Ring Walk", "under the name a reader would be shown");
            assert.strictEqual(ring.description, "Walks every node outwards to an evenly spaced place on one ring.");
            assert.strictEqual(ring.kind, "live", "declared a simulation rather than a one-pass arrangement");
            assert.strictEqual(ring.maxDimensions, 3);

            const offered = graph.getSession().catalog.layouts();
            assert.isTrue(
                offered.some((candidate) => candidate.id === "force"),
                "and the element's own arrangements are still offered beside it",
            );
        });

        it("does not change what the element itself ships", () => {
            assert.strictEqual(
                LAYOUT_DESCRIPTORS.length,
                LAYOUT_CATALOG.length,
                "the element's own table is exactly its own arrangements",
            );
            assert.isUndefined(
                LAYOUT_DESCRIPTORS.find((candidate) => candidate.id === "test-ring"),
                "a registration adds to what this page can do, never to what the element ships",
            );
        });

        it("is found by name, without stopping the element's own layouts being found", () => {
            assert.strictEqual(layoutDescriptor("test-ring")?.plainName, "Ring Walk");
            assert.strictEqual(layoutDescriptor("test-grid")?.plainName, "Grid");
            assert.strictEqual(layoutDescriptor("force")?.engine, "ngraph", "the element's own answer is unchanged");
            assert.isUndefined(layoutDescriptor("no-such-layout"), "and a name nobody registered answers nothing");
        });

        it("answers which arrangement it is, the question the element answers for its own engines", () => {
            // A plugin declares ONE key, so the engine name and the arrangement name are the same
            // string. The element's own sixteen engines sit behind twelve arrangement names, which
            // is why this question exists at all.
            assert.strictEqual(layoutIdForEngine("test-ring"), "test-ring");
            assert.strictEqual(layoutIdForEngine("arf"), "force-2d", "the element's own answer is unchanged");
            assert.isUndefined(layoutIdForEngine("no-such-engine"));
        });

        it("has the catalogue answer whether it reads weights, without being asked to say so twice", () => {
            // A plugin declares `static honoursWeights` on the class, where the fact is true, and
            // the registration copies it onto the published descriptor. Neither of these two
            // engines reads a weight, so a picker is right not to offer them a weight control --
            // and the author of a weighted engine writes one word, in one place.
            assert.isFalse(offeredLayout("test-ring").honoursWeights);
            assert.isFalse(offeredLayout("test-grid").honoursWeights);
            assert.strictEqual(
                layoutDescriptor("force-2d")?.honoursWeights,
                false,
                "the element's own arrangements answer the same question the same way",
            );
        });

        it("is plain data, so a catalogue carrying it still survives the trip to a worker", () => {
            const wire = JSON.parse(JSON.stringify(graph.getSession().catalog.layouts())) as LayoutDescriptor[];
            const ring = wire.find((candidate) => candidate.id === "test-ring");

            assert.isDefined(ring, "the plugin's entry came back from the round trip");
            assert.deepStrictEqual(ring, offeredLayout("test-ring"), "unchanged in every field");
        });
    });

    describe("the options a consumer configures it with", () => {
        it("publishes its options as the plain list a settings form renders", () => {
            const { options } = offeredLayout("test-ring");

            assert.deepStrictEqual(
                options.map((option) => option.name),
                ["radius", "stride", "layerGap"],
            );

            const radius = options.find((option) => option.name === "radius");
            assert.isDefined(radius, "the ring size is offered");
            assert.strictEqual(radius.plainName, "Ring size", "in words rather than in the property's name");
            assert.strictEqual(radius.type, "number");
            assert.strictEqual(radius.default, DEFAULT_RADIUS);
            assert.strictEqual(radius.min, 1);
            assert.strictEqual(radius.max, 1000);
        });

        it("is built with the defaults it declared when the consumer asks for nothing", async () => {
            const engine = await useLayout<RingLayout>("test-ring");

            assert.strictEqual(engine.receivedOptions.radius, DEFAULT_RADIUS, "the declared default arrived");
            assert.strictEqual(engine.receivedOptions.stride, 45);
            assert.strictEqual(engine.receivedOptions.layerGap, 10);
        });

        it("refuses an option it never declared, and says what it does declare", async () => {
            const failure = await failureOf(() => graph.setLayout("test-ring", { radiuz: 200 }, { skipQueue: true }));

            assert.strictEqual(failure.code, "E_UNKNOWN_OPTION");
            assert.include(failure.details.available as readonly string[], "radius", "the declared names are listed");
            assert.include(failure.details.candidates as readonly string[], "radius", "and the near miss is offered");
        });

        it("refuses a value outside the range it declared", async () => {
            const failure = await failureOf(() => graph.setLayout("test-ring", { radius: 5000 }, { skipQueue: true }));

            assert.strictEqual(failure.code, "E_OPTION_RANGE");
            assert.strictEqual(failure.details.option, "radius");
            assert.strictEqual(failure.details.max, 1000, "and the failure carries the bound it broke");
        });

        it("keeps the consumer's options when the element switches between three dimensions and two", async () => {
            const inThree = await useLayout<RingLayout>("test-ring", { radius: 250 });
            assert.strictEqual(inThree.radius, 250);
            assert.strictEqual(inThree.dimensions, 3);
            assert.isUndefined(inThree.config, "this engine never filled the element's old `config` slot");

            await graph.setViewMode("2d");
            await graph.operationQueue.waitForCompletion();

            // The helper refuses anything that is not the plugin's engine, so reaching this line
            // is itself the assertion that the element rebuilt the same plugin rather than falling
            // back to one of its own.
            const inTwo = currentRingEngine();
            assert.notStrictEqual(inTwo, inThree, "a rebuild, because a 2D arrangement is a different computation");
            assert.strictEqual(inTwo.radius, 250, "and the consumer's ring size came with it");
            assert.strictEqual(inTwo.dimensions, 2, "into an engine told it is drawing flat");
        });
    });

    describe("what the element does on the engine's behalf", () => {
        it("has its coordinates published into the element's position array without publishing them itself", async () => {
            const engine = await useLayout<RingLayout>("test-ring");

            assert.isAbove(engine.publishedByElement, 0, "the element published this engine's coordinates");

            const { positions } = graph.getSession();
            const stored = { x: 0, y: 0, z: 0 };

            for (const node of graph.getNodes()) {
                assert.isTrue(positions.isPlaced(node.index), `the array holds a row for node ${node.id}`);

                positions.read(node.index, stored);
                assert.closeTo(
                    Math.hypot(stored.x, stored.y),
                    DEFAULT_RADIUS,
                    0.5,
                    `the row stored for node ${node.id} is where the ring finished, not where it started`,
                );
            }
        });

        it("is asked to place nodes that arrived later through the method it declared for that", async () => {
            const engine = await useLayout<RingLayout>("test-ring");
            assert.lengthOf(engine.incrementalUpdates, 0, "nothing has arrived since the layout was chosen");

            await graph.addNodes([{ id: "f" }]);
            await waitForRedraw("the ring to take in the new node");

            assert.isAbove(engine.incrementalUpdates.length, 0, "the element used the engine's own method");
            assert.include(
                engine.incrementalUpdates.flat(),
                "f",
                "and named the node that had just arrived",
            );
        });
    });

    describe("how a failure reaches the consumer", () => {
        it("reports a layout name nothing registered as a coded failure, not a bare TypeError", async () => {
            const failure = await failureOf(() => graph.setLayout("no-such-layout", {}, { skipQueue: true }));

            assert.strictEqual(failure.code, "E_UNKNOWN_LAYOUT");
            assert.include(
                failure.details.available as readonly string[],
                "test-ring",
                "and it says what could have been asked for instead",
            );
        });

        it("keeps the code a layout throws while it is being built, and tells the consumer", async () => {
            const reported = collectLayoutErrors();

            const failure = await failureOf(() => graph.setLayout("test-refuses", {}, { skipQueue: true }));

            assert.strictEqual(failure.code, "E_UNSUPPORTED", "the plugin's own code survived the trip");
            assert.isAbove(reported().length, 0, "and the consumer heard about it through the graph's error event");
        });

        it("keeps the code a layout throws while it is setting itself up, and leaves the running layout alone", async () => {
            const before = await useLayout<RingLayout>("test-ring");
            const reported = collectLayoutErrors();
            const releasedBefore = LateFailureLayout.releases;

            const failure = await failureOf(() => graph.setLayout("test-late-failure", {}, { skipQueue: true }));

            assert.strictEqual(failure.code, "E_FETCH_FAILED", "the plugin's own code survived the trip");
            assert.strictEqual(
                LateFailureLayout.releases,
                releasedBefore + 1,
                "and the engine that failed was told to let go of what it had taken",
            );
            assert.strictEqual(
                graph.getLayoutManager().layoutEngine,
                before,
                "and the layout that was working is the one still working",
            );
            assert.isAbove(reported().length, 0, "the consumer heard about it through the graph's error event");
        });
    });
});

describe("what a layout registration refuses", () => {
    afterAll(() => {
        // The catalogue half is global, so a later file asking what the element can offer must
        // not be shown this file's plugins. The ENGINE half cannot be cleared: `LayoutEngine`
        // publishes no way to forget a class, and forgetting them all would take the element's
        // own sixteen with them, since those register once when their module is first evaluated.
        // So `LayoutEngine.getRegisteredTypes()` still names these engines afterwards.
        clearRegisteredLayoutsForTesting();
    });

    it("a class that never named itself", () => {
        const failure = refusalOf(() => LayoutEngine.register(SpareLayout));

        assert.strictEqual(failure.code, "E_BAD_COMMAND");
        assert.strictEqual(failure.details.field, "type", "and it names the thing that is missing");
    });

    it("a class that describes itself to nobody", () => {
        const failure = refusalOf(() => LayoutEngine.register(undescribedEngine("test-undescribed")));

        assert.strictEqual(failure.code, "E_BAD_COMMAND");
        assert.strictEqual(failure.details.field, "descriptor");
        assert.isUndefined(
            layoutDescriptor("test-undescribed"),
            "and nothing was filed, so no picker can offer a layout the element would then refuse",
        );
    });

    it("a class whose description disagrees with its name", () => {
        const failure = refusalOf(() => LayoutEngine.register(engineNamed("test-mismatch", "test-something-else")));

        assert.strictEqual(failure.code, "E_BAD_COMMAND");
        assert.strictEqual(failure.details.field, "descriptor.id");
        assert.isUndefined(layoutDescriptor("test-something-else"), "and neither name was filed");
    });

    it("a name one of the element's own engines already answers to", () => {
        // Every engine the element ships, not a sample: the exemption that lets the element's own
        // sixteen register without a descriptor is a list, and a list can drift away from the
        // catalogue it was copied from without anything saying so.
        const shipped = LAYOUT_CATALOG.flatMap((arrangement) =>
            arrangement.implementations.map((implementation) => implementation.engine),
        );
        assert.isAbove(shipped.length, 0, "the catalogue names the engines it is served by");

        for (const engine of shipped) {
            const failure = refusalOf(() => LayoutEngine.register(engineNamed(engine)));

            assert.strictEqual(failure.code, "E_DUPLICATE_PLUGIN", `"${engine}" is the element's own`);
            assert.strictEqual(LayoutEngine.getClass(engine)?.type, engine, "and the element's own class still is");
        }
    });

    it("the name of an arrangement the element ships", () => {
        const failure = refusalOf(() => LayoutEngine.register(engineNamed("force")));

        assert.strictEqual(failure.code, "E_DUPLICATE_PLUGIN");
        assert.strictEqual(
            layoutDescriptor("force")?.engine,
            "ngraph",
            "and a saved document naming that arrangement still means what it meant",
        );
    });
});
