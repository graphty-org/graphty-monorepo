import type { NodeMask } from "@graphty/graph-format";
import ngraphCreateLayout, { Layout as NGraphLayout } from "ngraph.forcelayout";
import createGraph, { Graph as NGraph, Link as NGraphLink, Node as NGraphNode } from "ngraph.graph";
import random from "ngraph.random";
import { z } from "zod/v4";

import { defineOptions, type OptionsSchema } from "../config";
import type { Edge } from "../Edge";
import type { Node } from "../Node";
import { EdgePosition, heldEdgeProblems, LayoutEngine, Position } from "./LayoutEngine";

/**
 * Zod-based options schema for NGraph Force Layout
 */
const ngraphLayoutOptionsSchema = defineOptions({
    dim: {
        schema: z.number().int().min(2).max(3).default(3),
        meta: {
            label: "Dimensions",
            description: "Layout dimensionality (2D or 3D)",
        },
    },
    springLength: {
        schema: z.number().positive().default(30),
        meta: {
            label: "Spring Length",
            description: "Ideal spring length between connected nodes",
        },
    },
    springCoefficient: {
        schema: z.number().positive().default(0.0008),
        meta: {
            label: "Spring Coefficient",
            description: "Spring stiffness coefficient",
            step: 0.0001,
            advanced: true,
        },
    },
    gravity: {
        schema: z.number().default(-1.2),
        meta: {
            label: "Gravity",
            description: "Gravity strength (negative for repulsion)",
            step: 0.1,
        },
    },
    theta: {
        schema: z.number().positive().default(0.8),
        meta: {
            label: "Theta",
            description: "Barnes-Hut approximation parameter",
            step: 0.1,
            advanced: true,
        },
    },
    dragCoefficient: {
        schema: z.number().positive().default(0.02),
        meta: {
            label: "Drag Coefficient",
            description: "Velocity damping coefficient",
            step: 0.01,
            advanced: true,
        },
    },
    timeStep: {
        schema: z.number().positive().default(20),
        meta: {
            label: "Time Step",
            description: "Simulation time step size",
            advanced: true,
        },
    },
    nodeGap: {
        schema: z.number().min(0).nullable().default(null),
        meta: {
            label: "Node Gap",
            description:
                "Keep at least this much space between two nodes' drawn surfaces, measured from each " +
                "node's drawn size. Unset (null), nodes may be drawn over each other",
            step: 0.5,
            advanced: true,
        },
    },
    nodeGapFront: {
        schema: z.boolean().default(false),
        meta: {
            label: "Node Gap From the Front",
            description:
                "In 3D, measure Node Gap as seen from the front (across x and y, not depth), so no node " +
                "is drawn over another in the starting view even when one is behind the other",
            advanced: true,
        },
    },
    seed: {
        schema: z.number().int().positive().nullable().default(null),
        meta: {
            label: "Random Seed",
            description: "Seed for reproducible layout",
            advanced: true,
        },
    },
});

/** How many extra sweeps a forced stop may spend pushing overlapping nodes apart. */
const MAX_FINAL_SWEEPS = 100;
/** A grid cell and the cells around it, in 3D and in a plane. */
const NEIGHBOURS: readonly (readonly [number, number, number])[] = [-1, 0, 1].flatMap((x) =>
    [-1, 0, 1].flatMap((y) => [-1, 0, 1].map((z) => [x, y, z] as const)),
);
const NEIGHBOURS_FLAT = NEIGHBOURS.filter(([, , z]) => z === 0);
/** Spreads the directions of coincident pairs evenly around the circle. */
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/**
 * One grid cell's key. A collision of two cells only costs a few extra comparisons.
 * @param x - Column.
 * @param y - Row.
 * @param z - Layer.
 * @returns The key.
 */
function cellKey(x: number, y: number, z: number): number {
    return (Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ Math.imul(z, 83492791)) >>> 0;
}

/**
 * NGraph force-directed layout engine using ngraph.forcelayout
 */
export class NGraphEngine extends LayoutEngine {
    static type = "ngraph";
    static maxDimensions = 3;
    static zodOptionsSchema: OptionsSchema = ngraphLayoutOptionsSchema;
    /** Accepts a scope: a held node is a pinned body in ngraph's own simulation. */
    static override scoped = true;
    ngraph: NGraph;
    ngraphLayout: NGraphLayout<NGraph>;

    /**
     * Get dimension-specific options for NGraph layout
     * @param dimension - The desired dimension (2 or 3)
     * @returns Options object with dim parameter
     */
    static getOptionsForDimension(dimension: 2 | 3): object {
        return { dim: dimension };
    }
    nodeMapping = new Map<Node, NGraphNode>();
    edgeMapping = new Map<Edge, NGraphLink>();
    _settled = true;
    _stepCount = 0;
    _lastMoves: number[] = [];
    /** The least space between two drawn surfaces, or null to let nodes overlap. */
    private readonly nodeGap: number | null = null;
    /** Whether `nodeGap` ignores depth: see the option. */
    private readonly nodeGapFront: boolean = false;
    /** Reused by {@link NGraphEngine.separate}: each body, its radius and whether it may move. */
    private readonly bodies: { x: number; y: number; z?: number }[] = [];
    private radii = new Float64Array(0);
    private movable = new Uint8Array(0);
    private readonly cells = new Map<number, number[]>();
    /** Places each new node when `seed` is set; null leaves placement to ngraph. */
    private seededPlacement: { rng: ReturnType<typeof random>; dim: number } | null = null;

    /**
     * Create an NGraph layout engine
     * @param config - Configuration options for the NGraph simulation
     */
    constructor(config: object = {}) {
        super();
        // A multigraph: each element edge is its own ngraph link. ngraph's default names a link by
        // its endpoints' strings, so two parallel edges -- or `"1" -> 1` beside `1 -> 1` -- came
        // back as ONE shared link, and removing either took the other's spring with it: its
        // position was then undefined and redrawing it threw.
        this.ngraph = createGraph({ multigraph: true });

        // Cast config to a more specific type for property access
        const typedConfig = config as Record<string, unknown>;

        // Build ngraph configuration from provided config
        const ngraphConfig: Record<string, unknown> = {
            dimensions: typedConfig.dim !== undefined ? typedConfig.dim : 3,
        };

        // Map from layout config to ngraph parameters
        if (typedConfig.springLength !== undefined) {
            ngraphConfig.springLength = typedConfig.springLength;
        }

        if (typedConfig.springCoefficient !== undefined) {
            ngraphConfig.springCoefficient = typedConfig.springCoefficient;
        }

        if (typedConfig.gravity !== undefined) {
            ngraphConfig.gravity = typedConfig.gravity;
        }

        if (typedConfig.theta !== undefined) {
            ngraphConfig.theta = typedConfig.theta;
        }

        if (typedConfig.dragCoefficient !== undefined) {
            ngraphConfig.dragCoefficient = typedConfig.dragCoefficient;
        }

        if (typedConfig.timeStep !== undefined) {
            ngraphConfig.timeStep = typedConfig.timeStep;
        }

        // ngraph.forcelayout never reads a generator from its settings: it seeds its own with a
        // hard-coded 42, so every seed used to give the same picture. A seeded layout therefore
        // places each node itself, from this generator, before the simulation moves it.
        if (typeof typedConfig.seed === "number") {
            this.seededPlacement = { rng: random(typedConfig.seed), dim: ngraphConfig.dimensions as number };
        }

        if (typeof typedConfig.nodeGap === "number") {
            this.nodeGap = typedConfig.nodeGap;
        }

        this.nodeGapFront = typedConfig.nodeGapFront === true;

        this.ngraphLayout = ngraphCreateLayout(this.ngraph, ngraphConfig);
    }

    /**
     * Initialize the layout engine
     *
     * NGraph layout is initialized in the constructor and doesn't require
     * additional async initialization.
     */
    async init(): Promise<void> {
        // No-op - NGraph layout is ready after construction
    }

    /**
     * Advance the NGraph simulation by one step
     */
    step(): void {
        const ngraphSettled = this.ngraphLayout.step();
        const { lastMove } = this.ngraphLayout;
        const nodeCount = this.nodeMapping.size;
        const ratio = nodeCount > 0 ? lastMove / nodeCount : 0;

        this._stepCount++;

        // Keep track of last 10 moves for averaging
        this._lastMoves.push(ratio);
        if (this._lastMoves.length > 10) {
            this._lastMoves.shift();
        }

        // Calculate average movement over last 10 steps
        const avgMovement =
            this._lastMoves.length > 0 ? this._lastMoves.reduce((a, b) => a + b, 0) / this._lastMoves.length : 0;

        // Use a more forgiving threshold or force settling after many steps
        const customThreshold = 0.05; // More forgiving than ngraph's 0.01
        const maxSteps = 1000; // Force settling after 1000 steps

        // With `nodeGap` set the simulation is not at rest while two nodes still overlap; the last
        // step before a forced stop pushes them apart until none do.
        const resting = ngraphSettled || avgMovement <= customThreshold;
        const overlaps = this.separate(!resting);
        this._settled = (resting && overlaps === 0) || this._stepCount >= maxSteps;
        if (this._settled && overlaps > 0) {
            for (let sweep = 0; sweep < MAX_FINAL_SWEEPS && this.separate() > 0; sweep++) {
                // Each sweep resolves what the one before it pushed into a neighbour.
            }
        }

        // KEPT DELIBERATELY, even though `LayoutManager` publishes after every step batch as
        // well. This engine is driven directly, with no manager, by
        // `test/layout/layout-positions.test.ts`, which is what pins that a simulation's own
        // coordinates reach the shared array. The duplicate copy is the price of that being
        // testable without a renderer; an engine that never publishes is still correct, which is
        // what the layout extension test pins from the other side.
        this.publishPositions();
    }

    /**
     * One sweep that pushes apart every two nodes closer than their drawn radii plus `nodeGap`,
     * moving the simulation's own bodies so the next step starts from there. A pinned node is not
     * moved; its partner takes the whole push. Pairs are found through a grid of cells one
     * largest diameter wide, so each node is compared with its neighbours, not with every node.
     *
     * WHILE THE SIMULATION IS STILL SPREADING a graph whose nodes cannot yet fit in the space it
     * spans is left alone: every node starts within half a spring length of the origin, and
     * pushing ten thousand of them apart there compared each with hundreds of others, four times
     * the step's own cost, for an arrangement the forces were about to undo.
     * @param whileSpreading - Skip the sweep when the nodes do not fit in the space they span.
     * @returns How many pairs overlapped (1 for a skipped sweep); 0 when `nodeGap` is unset.
     */
    private separate(whileSpreading = false): number {
        const gap = this.nodeGap;
        if (gap === null) {
            return 0;
        }

        const count = this.nodeMapping.size;
        const extent = this.gather(gap);
        const size = 2 * extent.largest;
        if (size <= 0) {
            return 0;
        }

        // Seen from the front, depth does not keep two nodes apart: only x and y are compared.
        const flat = this.nodeGapFront || this.ngraphLayout.simulator.settings.dimensions !== 3;
        // Each node's cell against the cells the arrangement spans: fewer cells than nodes is a
        // graph still packed together.
        const span = (extent.x / size) * (extent.y / size) * (flat ? 1 : extent.z / size);
        if (whileSpreading && span < count) {
            return 1;
        }

        this.bucketBodies(size, flat);
        let overlaps = 0;
        for (let i = 0; i < count; i++) {
            overlaps += this.pushNeighbours(i, size, flat);
        }

        return overlaps;
    }

    /**
     * Read every body, its radius plus half the gap and whether it may move.
     * @param gap - The gap.
     * @returns The largest radius and how far the bodies spread on each axis.
     */
    private gather(gap: number): { largest: number; x: number; y: number; z: number } {
        const count = this.nodeMapping.size;
        if (this.radii.length < count) {
            this.radii = new Float64Array(count);
            this.movable = new Uint8Array(count);
        }

        const { bodies, radii, movable } = this;
        bodies.length = 0;
        let largest = 0;
        const min = [Infinity, Infinity, Infinity];
        const max = [-Infinity, -Infinity, -Infinity];
        for (const [node, ngraphNode] of this.nodeMapping) {
            const i = bodies.length;
            const b = this.ngraphLayout.getNodePosition(ngraphNode.id);
            bodies.push(b);
            radii[i] = node.drawnRadius + gap / 2;
            movable[i] = this.ngraphLayout.isNodePinned(ngraphNode) ? 0 : 1;
            largest = Math.max(largest, radii[i]);
            const at = [b.x, b.y, b.z ?? 0];
            for (let axis = 0; axis < 3; axis++) {
                min[axis] = Math.min(min[axis], at[axis]);
                max[axis] = Math.max(max[axis], at[axis]);
            }
        }

        return { largest, x: max[0] - min[0], y: max[1] - min[1], z: max[2] - min[2] };
    }

    /**
     * Put every body in its grid cell.
     * @param size - The cell size.
     * @param flat - Whether depth is ignored.
     */
    private bucketBodies(size: number, flat: boolean): void {
        const { cells, bodies } = this;
        // Emptied, not rebuilt; dropped when nodes have wandered into many more cells than there are.
        if (cells.size > 4 * bodies.length) {
            cells.clear();
        }

        for (const bucket of cells.values()) {
            bucket.length = 0;
        }

        for (let i = 0; i < bodies.length; i++) {
            const b = bodies[i];
            const key = cellKey(
                Math.floor(b.x / size),
                Math.floor(b.y / size),
                flat ? 0 : Math.floor((b.z ?? 0) / size),
            );
            let bucket = cells.get(key);
            if (!bucket) {
                bucket = [];
                cells.set(key, bucket);
            }

            bucket.push(i);
        }
    }

    /**
     * Push one body apart from every later body in its own and the neighbouring cells.
     * @param i - The body.
     * @param size - The cell size.
     * @param flat - Whether depth is ignored.
     * @returns How many of those pairs overlapped.
     */
    private pushNeighbours(i: number, size: number, flat: boolean): number {
        const a = this.bodies[i];
        const cx = Math.floor(a.x / size);
        const cy = Math.floor(a.y / size);
        const cz = flat ? 0 : Math.floor((a.z ?? 0) / size);
        let overlaps = 0;
        for (const [dx, dy, dz] of flat ? NEIGHBOURS_FLAT : NEIGHBOURS) {
            for (const j of this.cells.get(cellKey(cx + dx, cy + dy, cz + dz)) ?? []) {
                if (j > i && this.push(i, j, flat)) {
                    overlaps++;
                }
            }
        }

        return overlaps;
    }

    /**
     * Push two bodies apart when they are closer than their radii allow.
     * @param i - One body's index.
     * @param j - The other's.
     * @param flat - Whether the layout is two-dimensional.
     * @returns True when they overlapped.
     */
    private push(i: number, j: number, flat: boolean): boolean {
        const a = this.bodies[i];
        const b = this.bodies[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let dz = flat ? 0 : (b.z ?? 0) - (a.z ?? 0);
        const least = this.radii[i] + this.radii[j];
        const squared = dx * dx + dy * dy + dz * dz;
        if (squared >= least * least) {
            return false;
        }

        const wa = this.movable[i];
        const wb = this.movable[j];
        if (wa + wb === 0) {
            return true;
        }

        let distance = Math.sqrt(squared);
        if (distance === 0) {
            // Two nodes on one point: a direction from their indices, so a seeded layout stays
            // the same from run to run.
            const angle = (i * GOLDEN_ANGLE + j) % (2 * Math.PI);
            dx = Math.cos(angle);
            dy = Math.sin(angle);
            dz = 0;
            distance = 1;
        }

        const share = (least - distance) / distance / (wa + wb);
        a.x -= dx * share * wa;
        a.y -= dy * share * wa;
        b.x += dx * share * wb;
        b.y += dy * share * wb;
        if (!flat) {
            a.z = (a.z ?? 0) - dz * share * wa;
            b.z = (b.z ?? 0) + dz * share * wb;
        }

        return true;
    }

    /**
     * Start the simulation again because a node's drawn size changed, when `nodeGap` keeps nodes
     * apart by that size: a node that grew after the layout came to rest may now cover another.
     * @returns True when the simulation was woken.
     */
    wakeForResize(): boolean {
        if (this.nodeGap === null || !this._settled) {
            return false;
        }

        this._settled = false;
        this._stepCount = 0;
        this._lastMoves = [];
        return true;
    }

    /**
     * Copy the simulation's node coordinates into the shared position array.
     *
     * `ngraphLayout.getNodePosition` hands back the body's own position object rather than a copy,
     * so this reads it in place and allocates nothing -- which is the point of overriding the base,
     * whose default would build one object per node per step. In two dimensions ngraph carries no
     * z at all, and the row is published flat rather than left unplaced.
     */
    override publishPositions(): void {
        for (const [node, ngraphNode] of this.nodeMapping) {
            const pos = this.ngraphLayout.getNodePosition(ngraphNode.id);
            this.writeNodePosition(node, pos.x, pos.y, pos.z ?? 0);
        }
    }

    /**
     * Check if the simulation has settled
     * @returns True if the simulation has settled
     */
    get isSettled(): boolean {
        return this._settled;
    }

    /**
     * Add a node to the NGraph simulation
     * @param n - The node to add
     */
    addNode(n: Node): void {
        const ngraphNode: NGraphNode = this.ngraph.addNode(n.id, { parentNode: n });
        this.nodeMapping.set(n, ngraphNode);
        if (this.seededPlacement) {
            // THE RULE NGRAPH ITSELF USES for a node with no placed neighbour -- within half a
            // spring length of the origin -- only drawn from the seed. A wider start is a graph
            // that flies in from far away: a box of ten spring lengths took a 20-node graph four
            // times as long to settle, and was drawn a few pixels wide while it did.
            const { rng, dim } = this.seededPlacement;
            const { springLength } = this.ngraphLayout.simulator.settings;
            const coord = (): number => (rng.nextDouble() - 0.5) * springLength;
            const x = coord();
            const y = coord();
            this.ngraphLayout.setNodePosition(n.id, x, y, dim === 3 ? coord() : 0);
        }

        // A node that arrived after a scoped layout started is not one of its members.
        if (this.isHeld(n.index)) {
            this.ngraphLayout.pinNode(ngraphNode, true);
        }

        this._settled = false;
        this._stepCount = 0;
        this._lastMoves = [];
    }

    /**
     * Add an edge to the NGraph simulation
     * @param e - The edge to add
     */
    addEdge(e: Edge): void {
        // `parentEdge: e`, not `this`. It used to hand ngraph the ENGINE under a key named for an
        // edge; nothing read it, which is why it survived, and anything that started carrying
        // per-link data would have landed in that slot and found the wrong object.
        const ngraphEdge = this.ngraph.addLink(e.srcId, e.dstId, { parentEdge: e });
        this.edgeMapping.set(e, ngraphEdge);
        this._settled = false;
        this._stepCount = 0;
        this._lastMoves = [];
    }

    /**
     * Get the current position of a node
     * @param n - The node to get position for
     * @returns The node's position coordinates
     */
    getNodePosition(n: Node): Position {
        const ngraphNode = this._getMappedNode(n);
        const pos = this.ngraphLayout.getNodePosition(ngraphNode.id);

        // A node whose row is unplaced or missing falls through to the simulation's own body,
        // which is the object ngraph itself mutates -- see setNodePosition, which writes straight
        // into it.
        return this.publishOnRead(n, pos.x, pos.y, pos.z ?? 0) ?? pos;
    }

    /**
     * Set a node's position in the simulation
     * @param n - The node to set position for
     * @param newPos - The new position coordinates
     */
    protected setNodePosition(n: Node, newPos: Position): void {
        const ngraphNode = this._getMappedNode(n);
        const currPos = this.ngraphLayout.getNodePosition(ngraphNode.id);
        currPos.x = newPos.x;
        currPos.y = newPos.y;
        currPos.z = newPos.z;
        // A drag is a placement like any other, so it lands in the shared array immediately rather
        // than waiting for a step that a settled simulation may never run. It is a PLACEMENT and
        // not a layout step, so it writes even onto a pinned row: a reader must be able to move a
        // node they have pinned.
        this.writeNodePosition(n, newPos.x, newPos.y, newPos.z ?? 0, "placement");
    }

    /**
     * Get the position of an edge based on its endpoint positions
     * @param e - The edge to get position for
     * @returns The edge's source and destination positions
     */
    getEdgePosition(e: Edge): EdgePosition {
        const ngraphEdge = this._getMappedEdge(e);
        const pos = this.ngraphLayout.getLinkPosition(ngraphEdge.id);
        return {
            src: {
                x: pos.from.x,
                y: pos.from.y,
                z: pos.from.z,
            },
            dst: {
                x: pos.to.x,
                y: pos.to.y,
                z: pos.to.z,
            },
        };
    }

    /**
     * Get all nodes in the simulation
     * @returns Iterable of nodes
     */
    get nodes(): Iterable<Node> {
        // ...is this cheating?
        return this.nodeMapping.keys();
    }

    /**
     * Get all edges in the simulation
     * @returns Iterable of edges
     */
    get edges(): Iterable<Edge> {
        return this.edgeMapping.keys();
    }

    /**
     * Pin a node to its current position
     * @param n - The node to pin
     */
    protected pin(n: Node): void {
        const ngraphNode = this._getMappedNode(n);
        this.ngraphLayout.pinNode(ngraphNode, true);
    }

    /**
     * Unpin a node to allow it to move freely
     * @param n - The node to unpin
     */
    protected unpin(n: Node): void {
        const ngraphNode = this._getMappedNode(n);
        // A node a scoped layout is holding stays pinned: the hold is not the reader's pin to lift.
        this.ngraphLayout.pinNode(ngraphNode, this.isHeld(n.index));
    }

    /**
     * Holds the nodes a scoped layout may not move, as pinned bodies. A node that is no longer
     * held is released unless the reader pinned it.
     * @param mask - One bit per row to hold, or null to hold nothing.
     * @param rows - How many rows the mask covers.
     */
    override setHoldMask(mask: NodeMask | null, rows: number): void {
        super.setHoldMask(mask, rows);
        for (const [node, ngraphNode] of this.nodeMapping) {
            this.ngraphLayout.pinNode(ngraphNode, this.isHeld(node.index) || node.isPinned());
        }
    }

    /**
     * Take a node out of the simulation, and the links ngraph drops with it.
     *
     * `ngraph.removeNode` removes the node's links too, so the element's own edge mapping drops
     * the edge behind each of the node's links -- otherwise `getEdgePosition` would ask
     * ngraph for the position of a link it has already forgotten.
     * @param n - the node leaving the graph
     */
    override removeNode(n: Node): void {
        const ngraphNode = this.nodeMapping.get(n);
        if (!ngraphNode) {
            return;
        }

        // The node's own links, not every link: each carries the edge it was added for.
        for (const link of ngraphNode.links ?? []) {
            this.edgeMapping.delete((link.data as { parentEdge: Edge }).parentEdge);
        }

        this.ngraph.removeNode(ngraphNode.id);
        this.nodeMapping.delete(n);
        this._settled = false;
    }

    /**
     * Take an edge out of the simulation. See {@link NGraphEngine.removeNode}.
     * @param e - the edge leaving the graph
     */
    override removeEdge(e: Edge): void {
        const link = this.edgeMapping.get(e);
        if (!link) {
            return;
        }

        this.ngraph.removeLink(link);
        this.edgeMapping.delete(e);
        this._settled = false;
    }

    /**
     * Strict state: {@link LayoutEngine.edgeProblems}, and each edge its own link, which ngraph
     * still holds.
     * @param drawn - The edges the element draws.
     * @returns One sentence per problem.
     */
    protected override edgeProblems(drawn: ReadonlyMap<string, Edge>): string[] {
        const problems = heldEdgeProblems(this.edgeMapping.keys(), drawn);
        const links = new Set<NGraphLink>();
        for (const [edge, link] of this.edgeMapping) {
            if (links.has(link)) {
                problems.push(`edge ${edge.id} shares a link with another edge`);
            }

            links.add(link);
            if (this.ngraph.getLinkById(link.id) !== link) {
                problems.push(`edge ${edge.id} maps to a link its graph no longer holds`);
            }
        }

        return problems;
    }

    private _getMappedNode(n: Node): NGraphNode {
        const ngraphNode = this.nodeMapping.get(n);
        if (!ngraphNode) {
            throw new Error("Internal error: Node not found in NGraphEngine");
        }

        return ngraphNode;
    }

    private _getMappedEdge(e: Edge): NGraphLink {
        const ngraphNode = this.edgeMapping.get(e);
        if (!ngraphNode) {
            throw new Error("Internal error: Edge not found in NGraphEngine");
        }

        return ngraphNode;
    }
}
