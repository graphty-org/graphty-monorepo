import { type GraphSnapshot, INVALID_INDEX, type NodeMask } from "@graphty/graph-format";
import {
    Edge as D3Edge,
    forceCenter,
    type ForceCollide,
    forceCollide,
    type ForceLink,
    forceLink,
    forceManyBody,
    forceSimulation,
    InputEdge as D3InputEdge,
    Node as D3Node,
} from "d3-force-3d";
import { z } from "zod";

import { defineOptions, type OptionsSchema } from "../config";
import type { ElementPositions } from "../data/positions";
import type { Edge } from "../Edge";
import type { Node, NodeIdType } from "../Node";
import {
    clusterByOption,
    clusterCentroids,
    clusterStrengthOption,
    readCommunities,
    sameCommunities,
} from "./clusterForce";
import { EdgePosition, heldEdgeProblems, LayoutEngine, Position } from "./LayoutEngine";
import { nodeGapOption } from "./nodeGapOptions";

/**
 * Zod-based options schema for D3 Force Layout
 */
const d3LayoutOptionsSchema = defineOptions({
    clusterBy: clusterByOption,
    clusterStrength: clusterStrengthOption,
    nodeGap: nodeGapOption,
    dim: {
        schema: z.number().int().min(2).max(3).default(3),
        meta: {
            label: "Dimensions",
            description: "Layout dimensionality (2D or 3D)",
        },
    },
    alphaMin: {
        schema: z.number().positive().default(0.1),
        meta: {
            label: "Alpha Min",
            description: "Minimum alpha before simulation stops",
            step: 0.01,
            advanced: true,
        },
    },
    alphaTarget: {
        schema: z.number().min(0).default(0),
        meta: {
            label: "Alpha Target",
            description: "Target alpha value",
            step: 0.01,
            advanced: true,
        },
    },
    alphaDecay: {
        schema: z.number().positive().default(0.0228),
        meta: {
            label: "Alpha Decay",
            description: "Rate of alpha decay per tick",
            step: 0.001,
            advanced: true,
        },
    },
    velocityDecay: {
        schema: z.number().positive().default(0.4),
        meta: {
            label: "Velocity Decay",
            description: "Velocity damping factor",
            step: 0.05,
        },
    },
});

/** Where a row drawn with no `Node` finds its row, and the element's array its body publishes into. */
export interface D3RowSource {
    getSnapshot(): GraphSnapshot;
    readonly positions: ElementPositions;
}

interface D3InputNode extends Partial<D3Node> {
    id: NodeIdType;
}

function isD3Node(n: unknown): n is D3Node {
    if (
        typeof n === "object" &&
        n !== null &&
        "index" in n &&
        typeof n.index === "number" &&
        "x" in n &&
        typeof n.x === "number" &&
        "y" in n &&
        typeof n.y === "number" &&
        "z" in n &&
        typeof n.z === "number" &&
        "vx" in n &&
        typeof n.vx === "number" &&
        "vy" in n &&
        typeof n.vy === "number" &&
        "vz" in n &&
        typeof n.vz === "number"
    ) {
        return true;
    }

    return false;
}

/** How many sweeps a run that has come to rest may spend parting overlapping nodes. */
const MAX_FINAL_SWEEPS = 256;

/** d3's own many-body strength, which every node that is not a following group keeps. */
const DEFAULT_CHARGE = -30;

/** The share of the way to its centroid a node's velocity takes per tick at strength 1, d3's own `forceX` default. */
const CLUSTER_RATE = 0.1;

const D3LayoutConfig = z.strictObject({
    clusterBy: clusterByOption.schema,
    clusterStrength: clusterStrengthOption.schema,
    nodeGap: nodeGapOption.schema,
    dim: z.number().int().min(2).max(3).default(3),
    alphaMin: z.number().positive().default(0.1),
    alphaTarget: z.number().min(0).default(0),
    alphaDecay: z.number().positive().default(0.0228),
    velocityDecay: z.number().positive().default(0.4),
});

type D3LayoutOptions = Partial<z.infer<typeof D3LayoutConfig>>;

function isD3Edge(e: unknown): e is D3Edge {
    if (
        typeof e === "object" &&
        e !== null &&
        Object.hasOwn(e, "index") &&
        "index" in e &&
        typeof e.index === "number" &&
        "source" in e &&
        isD3Node(e.source) &&
        "target" in e &&
        isD3Node(e.target)
    ) {
        return true;
    }

    return false;
}

/**
 * Fix a d3 node where it is now, which is how d3 holds a body still.
 * @param d3node - The node to fix.
 */
function fixAt(d3node: D3Node): void {
    d3node.fx = d3node.x;
    d3node.fy = d3node.y;
    d3node.fz = d3node.z;
}

/**
 * D3 force-directed layout engine using d3-force-3d simulation
 */
export class D3GraphEngine extends LayoutEngine {
    static readonly type: string = "d3";
    static readonly maxDimensions: number = 3;
    static readonly zodOptionsSchema: OptionsSchema = d3LayoutOptionsSchema;
    /** Accepts a scope: a held node is fixed through d3's own `fx`/`fy`/`fz`. */
    static override readonly scoped: boolean = true;

    /**
     * Get dimension-specific options for the D3 layout
     * @param dimension - The desired dimension (2 or 3)
     * @returns Options object with dim parameter
     */
    static getOptionsForDimension(dimension: 2 | 3): object {
        return { dim: dimension };
    }

    d3ForceLayout: ReturnType<typeof forceSimulation>;
    /** The link force, kept here so its links can be replaced without reading it back by name. */
    private readonly linkForce: ForceLink;
    d3AlphaMin: number;
    d3AlphaTarget: number;
    d3AlphaDecay: number;
    d3VelocityDecay: number;
    /** 2 or 3: how many dimensions the simulation moves nodes in. A 2D one keeps every z at 0. */
    readonly dim: 2 | 3;
    /** The space kept between nodes' drawn surfaces, or null to let them overlap. */
    private readonly nodeGap: number | null;
    /** d3's collision force, while `nodeGap` is set. */
    private readonly collideForce: ForceCollide | null;
    /** A node changed size, or the nodes changed, since the collision force read their radii. */
    private radiiStale = true;
    /** The sweeps of the run that has come to rest have been made. */
    private collisionsSettled = false;
    nodeMapping = new Map<Node, D3Node>();
    /** The many-body force, kept so a group following its members can be given no charge. */
    private readonly chargeForce = forceManyBody();
    edgeMapping = new Map<Edge, D3Edge>();
    /** The mapping's edges as an array, rebuilt after the mapping changes. See {@link edges}. */
    private edgeList: Edge[] | null = null;
    newNodeMap = new Map<Node, D3InputNode>();
    /**
     * The bodies of rows drawn with no `Node`, under renderPath "batched", keyed by node id: a freeze
     * renumbers rows, an id stays. See {@link D3GraphEngine.addRows}.
     */
    private readonly rowBodies = new Map<NodeIdType, D3InputNode>();
    /** Where a row body finds its row and publishes, once rows were added. */
    private rowSource: D3RowSource | null = null;
    /** Rows were added since the last refresh. */
    private rowsAdded = false;
    newEdgeMap = new Map<Edge, D3InputEdge>();
    /** Each node id's edges, so removing a node visits only its own edges (issue #1425). */
    private readonly edgesByNode = new Map<Edge["srcId"], Set<Edge>>();
    reheat = false;
    /** What `clusterBy` names, or null for no pull. */
    private readonly clusterBy: string | null;
    private readonly clusterStrength: number;
    /** The last read of `clusterBy`, and each member's d3 node and community, in the same order. */
    private communities = new Map<Node, number>();
    private clusterNodes: D3Node[] = [];
    private clusterOf: number[] = [];
    private clusterCount = 0;
    /** The nodes changed since `clusterBy` was read. */
    private clustersStale = true;

    /**
     * Check if there are pending nodes or edges to be processed
     * @returns True if the graph needs to be refreshed
     */
    get graphNeedsRefresh(): boolean {
        return !!this.newNodeMap.size || !!this.newEdgeMap.size || this.rowsAdded;
    }

    /**
     * Create a D3 force-directed layout engine
     * @param anyOpts - Configuration options for the D3 simulation
     */
    constructor(anyOpts: D3LayoutOptions = {}) {
        super();

        const opts = D3LayoutConfig.parse(anyOpts);
        this.d3AlphaMin = opts.alphaMin;
        this.d3AlphaTarget = opts.alphaTarget;
        this.d3AlphaDecay = opts.alphaDecay;
        this.d3VelocityDecay = opts.velocityDecay;
        this.dim = opts.dim === 2 ? 2 : 3;
        this.clusterBy = opts.clusterBy;
        this.clusterStrength = opts.clusterStrength;
        this.nodeGap = opts.nodeGap;
        this.collideForce = opts.nodeGap === null ? null : forceCollide();

        // https://github.com/vasturiano/d3-force-3d?tab=readme-ov-file#links
        this.linkForce = forceLink()
            .strength(0.9)
            .id((d) => (d as D3InputNode).id);
        this.d3ForceLayout = forceSimulation()
            .numDimensions(this.dim)
            .alpha(1)
            .force("link", this.linkForce)
            .force("charge", this.chargeForce)
            .force("center", forceCenter())
            .force("dagRadial", null)
            .force(
                "cluster",
                opts.clusterBy === null
                    ? null
                    : (alpha) => {
                          this.pullClusters(alpha);
                      },
            )
            .force("collide", this.collideForce)
            .stop();
    }

    /**
     * Initialize the layout engine
     *
     * D3 force simulation is initialized in the constructor and doesn't require
     * additional async initialization.
     */
    async init(): Promise<void> {
        // No-op - D3 simulation is ready after construction
    }

    /**
     * Refresh the D3 simulation with pending nodes and edges
     */
    refresh(): void {
        if (this.graphNeedsRefresh || this.reheat) {
            // update nodes
            let nodeList: (D3Node | D3InputNode)[] = [...this.nodeMapping.values()];
            nodeList = nodeList.concat([...this.newNodeMap.values()], [...this.rowBodies.values()]);
            this.rowsAdded = false;
            this.d3ForceLayout
                .alpha(1) // re-heat the simulation
                .nodes(nodeList)
                .stop();

            // copy over new nodes
            for (const entry of this.newNodeMap.entries()) {
                const n = entry[0];
                const d3node = entry[1];
                if (!isD3Node(d3node)) {
                    throw new Error("Internal error: Node is not settled as a complete D3 Node");
                }

                this.nodeMapping.set(n, d3node);
                // A node that arrived after a scoped layout started is not one of its members.
                if (this.isHeld(n.index)) {
                    fixAt(d3node);
                }
            }
            this.newNodeMap.clear();

            // update edges
            let linkList: (D3Edge | D3InputEdge)[] = [...this.edgeMapping.values()];
            linkList = linkList.concat([...this.newEdgeMap.values()]);
            this.linkForce.links(linkList);

            // copy over new edges
            for (const entry of this.newEdgeMap.entries()) {
                const e = entry[0];
                const d3edge = entry[1];
                if (!isD3Edge(d3edge)) {
                    throw new Error("Internal error: Edge is not settled as a complete D3 Edge");
                }

                this.edgeMapping.set(e, d3edge);
            }
            this.edgeList = null;
            this.newEdgeMap.clear();

            // Clear reheat flag so we don't keep reheating every tick
            this.reheat = false;
            this.clustersStale = true;
            this.radiiStale = true;
            this.collisionsSettled = false;
        }

        if (this.radiiStale) {
            this.readRadii();
        }
    }

    /** Hands the collision force every node's reach plus half of `nodeGap`; a following group keeps nothing apart. */
    private readRadii(): void {
        this.radiiStale = false;
        const { collideForce, nodeGap } = this;
        if (collideForce === null || nodeGap === null) {
            return;
        }

        const radii = new Map<NodeIdType, number>();
        for (const node of this.nodeMapping.keys()) {
            radii.set(node.id, this.isFollower(node.index) ? 0 : node.spacingRadius(this.dim === 2) + nodeGap / 2);
        }

        collideForce.radius((d) => radii.get((d as D3InputNode).id) ?? 0);
    }

    /**
     * Whether `nodeGap` is set.
     * @returns True when the engine spaces nodes by their drawn size.
     * @internal
     */
    override get spacesBySize(): boolean {
        return this.nodeGap !== null;
    }

    /**
     * Start the simulation again because a node's drawn size changed, when `nodeGap` keeps nodes apart by that size.
     * @returns True when the frame loop has to start stepping this layout again.
     */
    override wakeForResize(): boolean {
        if (this.nodeGap === null) {
            return false;
        }

        this.radiiStale = true;
        const settled = this.isSettled;
        if (settled) {
            this.d3ForceLayout.alpha(1);
            this.collisionsSettled = false;
        }

        return settled;
    }

    /**
     * Read `clusterBy` and note each member's d3 node.
     * @returns True when the communities changed.
     */
    private readClusters(): boolean {
        this.clustersStale = false;
        const read = readCommunities(this.clusterBy as string, this.nodeMapping.keys(), this.clusterColumn, (row) =>
            this.isFollower(row),
        );
        const nodes = [...read.keys()].map((node) => this.nodeMapping.get(node) as D3Node);
        const same = sameCommunities(read, this.communities);
        this.communities = read;
        this.clusterNodes = nodes;
        this.clusterOf = [...read.values()];
        this.clusterCount = new Set(this.clusterOf).size;
        return !same;
    }

    /**
     * The cluster force: every member's velocity moves toward its community's centroid, as d3's `forceX` toward a point.
     * @param alpha - The simulation's current heat.
     */
    private pullClusters(alpha: number): void {
        const { clusterNodes: nodes, clusterOf } = this;
        const centroids = clusterCentroids(nodes, clusterOf, this.clusterCount, () => 1);
        const rate = CLUSTER_RATE * this.clusterStrength * alpha;
        nodes.forEach((node, member) => {
            const at = 3 * clusterOf[member];
            node.vx += (centroids[at] - node.x) * rate;
            node.vy += (centroids[at + 1] - node.y) * rate;
            if (this.dim === 3) {
                node.vz += (centroids[at + 2] - node.z) * rate;
            }
        });
    }

    /**
     * Read `clusterBy` again and start the simulation when the communities changed.
     * @returns True when the simulation was woken.
     */
    override wakeForClusters(): boolean {
        if (this.clusterBy === null || !this.readClusters()) {
            return false;
        }

        this.d3ForceLayout.alpha(1);
        return true;
    }

    /**
     * Advance the D3 simulation by one tick, and publish where it moved every node to.
     *
     * `LayoutManager` publishes after every step batch as well, so this copy is a duplicate when
     * the element is driving. It is kept because this engine is also driven directly, with no
     * manager, by `test/layout/layout-positions.test.ts` -- which is what pins that a
     * simulation's own coordinates reach the shared array at all. An engine that never publishes
     * is still correct; that is what the layout extension test pins from the other side.
     */
    step(): void {
        this.refresh();
        if (this.clustersStale && this.clusterBy !== null) {
            this.readClusters();
        }

        this.d3ForceLayout.tick();
        if (this.isSettled && !this.collisionsSettled) {
            this.settleCollisions();
        }

        this.publishPositions();
    }

    /**
     * The sweeps of a run that has come to rest: d3 stops long before its collision force has parted a crowd, so that
     * force alone runs on until nothing overlaps. It writes velocities, which are moved along here, as a tick would.
     */
    private settleCollisions(): void {
        this.collisionsSettled = true;
        const { collideForce } = this;
        for (let sweep = 0; collideForce !== null && sweep < MAX_FINAL_SWEEPS; sweep++) {
            collideForce(1);
            let moved = false;
            for (const d3node of this.bodies()) {
                moved = this.moveAlong(d3node) || moved;
            }

            if (!moved) {
                return;
            }
        }
    }

    /**
     * Moves a node by its velocity, as a tick would, and stops it. A fixed node stays.
     * @param d3node - The node.
     * @returns Whether it had a velocity.
     */
    private moveAlong(d3node: D3Node): boolean {
        const moving = d3node.vx !== 0 || d3node.vy !== 0 || d3node.vz !== 0;
        d3node.x += d3node.fx === undefined ? d3node.vx : 0;
        d3node.y += d3node.fy === undefined ? d3node.vy : 0;
        d3node.z += d3node.fz === undefined && this.dim === 3 ? d3node.vz : 0;
        d3node.vx = 0;
        d3node.vy = 0;
        d3node.vz = 0;
        return moving;
    }

    /**
     * Copy the simulation's node coordinates into the shared position array.
     *
     * d3 keeps x, y and z as plain numbers on its own node objects, so this reads them in place and
     * allocates nothing -- which is the point of overriding the base, whose default would build one
     * object per node per tick.
     */
    override publishPositions(): void {
        this.refresh();
        for (const [node, d3node] of this.nodeMapping) {
            this.writeNodePosition(node, d3node.x, d3node.y, d3node.z);
        }

        const source = this.rowSource;
        if (source === null || this.rowBodies.size === 0) {
            return;
        }

        const snapshot = source.getSnapshot();
        const { rows, coords } = this.publishScratch(this.rowBodies.size);
        let count = 0;
        for (const [id, body] of this.rowBodies as Map<NodeIdType, D3Node>) {
            const row = snapshot.ids.indexOf(id);
            if (row === INVALID_INDEX) {
                continue;
            }

            rows[count] = row;
            coords[3 * count] = body.x;
            coords[3 * count + 1] = body.y;
            coords[3 * count + 2] = body.z;
            count++;
        }

        this.publishColumn(source.positions, rows, coords, count);
    }

    /**
     * Fix each held row body where it is and free the rest, and note each follower row's id.
     * @param followers - The follower ids, which this adds to.
     */
    private holdRowBodies(followers: Set<NodeIdType>): void {
        const snapshot = this.rowBodies.size > 0 ? this.rowSource?.getSnapshot() : undefined;
        for (const [id, body] of snapshot === undefined ? [] : this.rowBodies) {
            const row = snapshot?.ids.indexOf(id) ?? INVALID_INDEX;
            if (row === INVALID_INDEX) {
                continue;
            }

            if (this.isFollower(row)) {
                followers.add(id);
            }

            if (this.isHeld(row)) {
                fixAt(body as D3Node);
            } else {
                body.fx = undefined;
                body.fy = undefined;
                body.fz = undefined;
            }
        }
    }

    /**
     * Every body: each `Node`'s, then each row's drawn with no `Node`.
     * @yields Each body, settled by the last refresh.
     */
    private *bodies(): Iterable<D3Node> {
        yield* this.nodeMapping.values();
        yield* this.rowBodies.values() as Iterable<D3Node>;
    }

    /**
     * Under renderPath "batched", give the simulation a body for each row drawn with no `Node`.
     * Such a row is unsized (no collision radius), in no `clusterBy` community and never pinned,
     * since each of those is read from a `Node`; a hold reaches it by its row. A third party's
     * engine is handed `Node`s only.
     * @param ids - The rows' node ids.
     * @param source - Where a body finds its row at publish, and the element's array it publishes into.
     * @internal
     */
    addRows(ids: readonly NodeIdType[], source: D3RowSource): void {
        this.rowSource = source;
        for (const id of ids) {
            this.rowBodies.set(id, this.dim === 2 ? { id, z: 0, vz: 0 } : { id });
        }

        this.rowsAdded = ids.length > 0 || this.rowsAdded;
    }

    /**
     * Under renderPath "batched", take out the bodies of rows that leave the graph with no `Node`;
     * otherwise each would stay in the simulation and keep pushing the others. Their edges have
     * already gone through {@link D3GraphEngine.removeEdge}.
     * @param ids - The rows' node ids; an id with no row body is skipped.
     * @internal
     */
    removeRows(ids: Iterable<NodeIdType>): void {
        for (const id of ids) {
            if (this.rowBodies.delete(id)) {
                this.clustersStale = true;
                this.reheat = true;
            }
        }
    }

    /**
     * Check if the simulation has settled below alpha minimum
     * @returns True if the simulation has settled
     */
    get isSettled(): boolean {
        // If there are pending nodes/edges to be processed, we're not settled
        if (this.graphNeedsRefresh) {
            return false;
        }

        return this.d3ForceLayout.alpha() < this.d3AlphaMin;
    }

    /**
     * Add a node to the D3 simulation
     * @param n - The node to add
     */
    addNode(n: Node): void {
        // A row's `Node` built late takes over the row's body, where it already is.
        const body = this.rowBodies.get(n.id);
        this.rowBodies.delete(n.id);
        // Already in the simulation: it keeps its place in the node list, and a settled simulation
        // stays settled, since nothing it steps changed.
        // ponytail: the next refresh lists it among the Nodes, ahead of the rows still with no Node,
        // so a reheat after a mixed load orders bodies differently from the object path.
        if (body !== undefined && isD3Node(body)) {
            this.nodeMapping.set(n, body);
            if (this.isHeld(n.index)) {
                fixAt(body);
            }

            return;
        }

        // A 2D simulation never initialises or moves z, so it starts, and stays, at 0.
        this.newNodeMap.set(n, body ?? (this.dim === 2 ? { id: n.id, z: 0, vz: 0 } : { id: n.id }));
    }

    /**
     * Add an edge to the D3 simulation
     * @param e - The edge to add
     */
    addEdge(e: Edge): void {
        this.newEdgeMap.set(e, {
            source: e.srcId,
            target: e.dstId,
        });
        for (const id of [e.srcId, e.dstId]) {
            let incident = this.edgesByNode.get(id);
            if (!incident) {
                incident = new Set();
                this.edgesByNode.set(id, incident);
            }

            incident.add(e);
        }
    }

    /**
     * Get all nodes in the simulation
     * @returns Iterable of nodes
     */
    get nodes(): Iterable<Node> {
        return this.nodeMapping.keys();
    }

    /**
     * Get all edges in the simulation.
     *
     * An array, because an edge joins the simulation at a `refresh`, after the store told it. The
     * frame loop sees that only by the array's length, and an edge it missed would stay unplaced
     * for as long as its nodes held still.
     * @returns The edges
     */
    get edges(): Iterable<Edge> {
        this.edgeList ??= [...this.edgeMapping.keys()];
        return this.edgeList;
    }

    /**
     * Get the current position of a node in the simulation
     * @param n - The node to get position for
     * @returns The node's position coordinates
     */
    getNodePosition(n: Node): Position {
        const d3node = this._getMappedNode(n);

        // A node whose row is unplaced or missing falls through to the simulation's own numbers.
        const published = this.publishOnRead(n, d3node.x, d3node.y, d3node.z);
        if (published !== null) {
            return published;
        }

        return {
            x: d3node.x,
            y: d3node.y,
            z: d3node.z,
        };
    }

    /**
     * Set a node's position in the simulation
     * @param n - The node to set position for
     * @param newPos - The new position coordinates
     */
    protected setNodePosition(n: Node, newPos: Position): void {
        const d3node = this._getMappedNode(n);
        d3node.x = newPos.x;
        d3node.y = newPos.y;
        d3node.z = this.dim === 2 ? 0 : (newPos.z ?? 0);
        // A drag is a placement like any other, so it lands in the shared array immediately rather
        // than waiting for a tick that a settled simulation may never run. It is a PLACEMENT and
        // not a layout step, so it writes even onto a pinned row: a reader must be able to move a
        // node they have pinned, and the layout-step guard would otherwise make a pin mean
        // "undraggable".
        this.writeNodePosition(n, d3node.x, d3node.y, d3node.z, "placement");
        this.reheat = true;
    }

    /**
     * Take the position array as this engine's own. Nodes still waiting for the next refresh are
     * taken into the simulation first: undo and rollback rebuild the nodes they bring back, and a
     * node left waiting would be placed by d3's own initial layout at its first tick -- over the
     * coordinates the restore wrote for it.
     */
    override loadArrangement(): void {
        this.refresh();
        super.loadArrangement();
    }

    /**
     * Get the position of an edge based on its endpoint positions
     * @param e - The edge to get position for
     * @returns The edge's source and destination positions
     */
    getEdgePosition(e: Edge): EdgePosition {
        const d3edge = this._getMappedEdge(e);

        return {
            src: {
                x: d3edge.source.x,
                y: d3edge.source.y,
                z: d3edge.source.z,
            },
            dst: {
                x: d3edge.target.x,
                y: d3edge.target.y,
                z: d3edge.target.z,
            },
        };
    }

    /**
     * Pin a node to its current position
     * @param n - The node to pin
     */
    protected pin(n: Node): void {
        const d3node = this._getMappedNode(n);

        d3node.fx = d3node.x;
        d3node.fy = d3node.y;
        d3node.fz = d3node.z;
        // Note: We intentionally do NOT reheat the simulation when pinning.
        // Pinning just locks the node's current position - it shouldn't restart
        // the simulation. Reheating here would cause the layout to never settle.
    }

    /**
     * Unpin a node to allow it to move freely
     * @param n - The node to unpin
     */
    protected unpin(n: Node): void {
        const d3node = this._getMappedNode(n);
        // A node a scoped layout is holding stays fixed: the hold is not the reader's pin to lift.
        if (this.isHeld(n.index)) {
            return;
        }

        d3node.fx = undefined;
        d3node.fy = undefined;
        d3node.fz = undefined;
        // Reheat so the released node moves: a settled simulation would otherwise leave it where
        // the pin held it.
        this.reheat = true;
    }

    /**
     * Holds the nodes a scoped layout may not move, as d3 fixes a node: at its current position.
     *
     * A node that is no longer held is released unless the reader pinned it.
     * @param mask - One bit per row to hold, or null to hold nothing.
     * @param rows - How many rows the mask covers.
     */
    override setHoldMask(mask: NodeMask | null, rows: number): void {
        super.setHoldMask(mask, rows);
        this.refresh();
        // A group following its members pushes nothing; d3 reads a strength once per node at
        // initialisation, so the accessor is set again whenever the followers change.
        const followers = new Set<NodeIdType>();
        for (const node of this.nodeMapping.keys()) {
            if (this.isFollower(node.index)) {
                followers.add(node.id);
            }
        }

        this.holdRowBodies(followers);

        this.chargeForce.strength((d) => (followers.has((d as D3InputNode).id) ? 0 : DEFAULT_CHARGE));
        for (const [node, d3node] of this.nodeMapping) {
            if (this.isHeld(node.index)) {
                fixAt(d3node);
            } else if (!node.isPinned()) {
                d3node.fx = undefined;
                d3node.fy = undefined;
                d3node.fz = undefined;
            }
        }
    }

    /**
     * Take a node out of the simulation.
     *
     * The re-push is what makes it real: d3 keeps its own arrays of nodes and links, so deleting
     * the mapping alone would leave the simulation stepping a node the element has disposed --
     * and every link that referenced it, whose `source` and `target` are those very objects.
     * `refresh()` rebuilds both arrays from the mappings, and `reheat` is what makes it run.
     *
     * The incident links go too, and not only because the element's own removal already takes
     * them out first: d3's link force RESOLVES a link's endpoints against the node list on every
     * re-push and throws for an endpoint it cannot find, so one link left behind would take the
     * next tick down rather than merely draw wrong. An engine has to survive a caller that removes
     * a node without removing its edges.
     * @param n - the node leaving the graph
     */
    override removeNode(n: Node): void {
        this.clustersStale = true;
        // removeEdge deletes the visited edge from this set, which Set iteration allows.
        for (const edge of this.edgesByNode.get(n.id) ?? []) {
            this.removeEdge(edge);
        }

        this.edgesByNode.delete(n.id);
        this.nodeMapping.delete(n);
        this.newNodeMap.delete(n);
        this.reheat = true;
    }

    /**
     * Take an edge out of the simulation. See {@link D3GraphEngine.removeNode}.
     * @param e - the edge leaving the graph
     */
    override removeEdge(e: Edge): void {
        this.edgeMapping.delete(e);
        this.edgeList = null;
        this.newEdgeMap.delete(e);
        this.edgesByNode.get(e.srcId)?.delete(e);
        this.edgesByNode.get(e.dstId)?.delete(e);
        this.reheat = true;
    }

    /**
     * Strict state: {@link LayoutEngine.edgeProblems} over the links and the edges still waiting
     * for the next refresh, each once, with both endpoints held.
     * @param drawn - The edges the element draws.
     * @returns One sentence per problem.
     */
    protected override edgeProblems(drawn: ReadonlyMap<string, Edge>): string[] {
        const problems = heldEdgeProblems([...this.edgeMapping.keys(), ...this.newEdgeMap.keys()], drawn);
        const nodes = new Set<unknown>(this.bodies());
        for (const [edge, link] of this.edgeMapping) {
            if (!nodes.has(link.source) || !nodes.has(link.target)) {
                problems.push(`edge ${edge.id} links a node the simulation no longer holds`);
            }
        }

        return problems;
    }

    private _getMappedNode(n: Node): D3Node {
        this.refresh(); // ensure consistent state

        const d3node = this.nodeMapping.get(n);
        if (!d3node) {
            throw new Error("Internal error: Node not found in D3GraphEngine");
        }

        return d3node;
    }

    private _getMappedEdge(e: Edge): D3Edge {
        this.refresh(); // ensure consistent state

        const d3edge = this.edgeMapping.get(e);
        if (!d3edge) {
            throw new Error("Internal error: Edge not found in D3GraphEngine");
        }

        return d3edge;
    }
}
