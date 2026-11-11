import { detCos, detSin, INVALID_INDEX, type NodeMask } from "@graphty/graph-format";
import ngraphCreateLayout, { Body, Layout as NGraphLayout, Spring } from "ngraph.forcelayout";
import createGraph, { Graph as NGraph, Link as NGraphLink, Node as NGraphNode } from "ngraph.graph";
import random from "ngraph.random";
import { z } from "zod";

import { defineOptions, type OptionsSchema } from "../config";
import { getDefaults } from "../config/OptionsSchema";
import { NGRAPH_SPRING_LENGTH } from "../constants/layoutConstants";
import type { Edge } from "../Edge";
import type { Node, NodeIdType } from "../Node";
import {
    clusterByOption,
    clusterCentroids,
    type ClusterPoint,
    clusterStrengthOption,
    readCommunities,
    sameCommunities,
} from "./clusterForce";
import type { D3RowSource } from "./D3GraphLayoutEngine";
import { EdgePosition, type EdgeRow, heldEdgeProblems, LayoutEngine, Position } from "./LayoutEngine";
import { nodeGapFrontOption, nodeGapOption } from "./nodeGapOptions";

/**
 * Zod-based options schema for NGraph Force Layout. The defaults are ngraph.forcelayout's own,
 * the values the simulation runs with when an option is not passed. They once said 30, 0.0008,
 * -1.2, 0.02 and 20 while ngraph ran 10, 0.8, -12, 0.9 and 0.5, so a reader who saw "30" and asked
 * for 80 got eight times the spring length and a drawing that never formed groups.
 */
const ngraphLayoutOptionsSchema = defineOptions({
    clusterBy: clusterByOption,
    clusterStrength: clusterStrengthOption,
    dim: {
        schema: z.number().int().min(2).max(3).default(3),
        meta: {
            label: "Dimensions",
            description: "Layout dimensionality (2D or 3D)",
        },
    },
    springLength: {
        schema: z.number().positive().default(NGRAPH_SPRING_LENGTH),
        meta: {
            label: "Spring Length",
            description: "Ideal spring length between connected nodes",
        },
    },
    springCoefficient: {
        schema: z.number().positive().default(0.8),
        meta: {
            label: "Spring Coefficient",
            description: "Spring stiffness coefficient",
            step: 0.1,
            advanced: true,
        },
    },
    gravity: {
        schema: z.number().default(-12),
        meta: {
            label: "Gravity",
            description: "Gravity strength (negative for repulsion)",
            step: 1,
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
        schema: z.number().positive().default(0.9),
        meta: {
            label: "Drag Coefficient",
            description: "Velocity damping coefficient",
            step: 0.05,
            advanced: true,
        },
    },
    timeStep: {
        schema: z.number().positive().default(0.5),
        meta: {
            label: "Time Step",
            description: "Simulation time step size",
            step: 0.1,
            advanced: true,
        },
    },
    nodeGap: nodeGapOption,
    nodeGapFront: nodeGapFrontOption,
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

/** The mass of a group following its members: small enough that it pushes and pulls nothing. */
const FOLLOWER_MASS = 1e-9;
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
 * What this engine keeps on each ngraph link: every edge between its pair, `Edge` or edge row
 * (by edge id), and the pair's key.
 */
interface PairData {
    edges: Set<Edge>;
    rows: Set<string>;
    row: Map<NodeIdType, NGraphLink>;
    key: NodeIdType;
}

/**
 * The data a link carries.
 * @param link - an ngraph link this engine made
 * @returns its edges and where it is filed in `pairLinks`
 */
function pairOf(link: NGraphLink): PairData {
    return link.data as PairData;
}

/**
 * NGraph force-directed layout engine using ngraph.forcelayout
 */
export class NGraphEngine extends LayoutEngine {
    static readonly type: string = "ngraph";
    static readonly maxDimensions: number = 3;
    static readonly zodOptionsSchema: OptionsSchema = ngraphLayoutOptionsSchema;
    /** Accepts a scope: a held node is a pinned body in ngraph's own simulation. */
    static override readonly scoped: boolean = true;
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
    /**
     * The bodies of rows drawn with no `Node`, under renderPath "batched", keyed by node id: a freeze
     * renumbers rows, an id stays. See {@link NGraphEngine.addRows}.
     */
    private readonly rowNodes = new Map<NodeIdType, NGraphNode>();
    /** Where a row body finds its row and publishes, once rows were added. */
    private rowSource: D3RowSource | null = null;
    edgeMapping = new Map<Edge, NGraphLink>();
    /** The link carrying each edge stored with no `Edge`, by edge id. See {@link NGraphEngine.addEdgeRows}. */
    private readonly rowLinks = new Map<string, NGraphLink>();
    /** The one link between two nodes, keyed by both ids in the order the first edge gave them. */
    private readonly pairLinks = new Map<NodeIdType, Map<NodeIdType, NGraphLink>>();
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
    /** Each body's half-size plus half the gap on x, y and z, three per body. */
    private reaches = new Float64Array(0);
    /** 1 for a body drawn round, which is kept apart as a sphere; 0 for one kept apart as a box. */
    private round = new Uint8Array(0);
    private movable = new Uint8Array(0);
    private readonly cells = new Map<number, number[]>();
    /** What `clusterBy` names, or null for no pull. */
    private readonly clusterBy: string | null = null;
    private readonly clusterStrength: number = 1;
    /** The last read of `clusterBy`, and each member's body and community, in the same order. */
    private communities = new Map<Node, number>();
    private clusterBodies: Body[] = [];
    private clusterPoints: ClusterPoint[] = [];
    private clusterOf: number[] = [];
    private clusterCount = 0;
    /** The nodes changed since `clusterBy` was read. */
    private clustersStale = true;
    /** Places each new node when `seed` is set; null leaves placement to ngraph. */
    private readonly seededPlacement: { rng: ReturnType<typeof random>; dim: number } | null = null;

    /**
     * Create an NGraph layout engine
     * @param config - Configuration options for the NGraph simulation
     */
    constructor(config: object = {}) {
        super();
        // A multigraph, so ngraph never merges links by its own string key: `"1" -> 1` beside
        // `1 -> 1` are different pairs. Parallel edges between one pair share ONE link (see
        // addEdge), which this engine counts itself in `pairLinks`.
        this.ngraph = createGraph({ multigraph: true });

        // The declared defaults first, so what the catalog publishes is what the simulation runs.
        const typedConfig: Record<string, unknown> = getDefaults(ngraphLayoutOptionsSchema);
        for (const [key, value] of Object.entries(config)) {
            if (value !== undefined) {
                typedConfig[key] = value;
            }
        }

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
        if (typeof typedConfig.clusterBy === "string") {
            this.clusterBy = typedConfig.clusterBy;
            this.clusterStrength = typedConfig.clusterStrength as number;
            this.ngraphLayout.simulator.addForce("cluster", () => {
                this.pullClusters();
            });
        }
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
        if (this.clustersStale && this.clusterBy !== null) {
            this.readClusters();
        }

        const ngraphSettled = this.ngraphLayout.step();
        const { lastMove } = this.ngraphLayout;
        const nodeCount = this.nodeMapping.size + this.rowNodes.size;
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
            this.reaches = new Float64Array(3 * count);
            this.round = new Uint8Array(count);
            this.movable = new Uint8Array(count);
        }

        const { bodies, radii, reaches, round, movable } = this;
        bodies.length = 0;
        let largest = 0;
        const min = [Infinity, Infinity, Infinity];
        const max = [-Infinity, -Infinity, -Infinity];
        for (const [node, ngraphNode] of this.nodeMapping) {
            const i = bodies.length;
            const b = this.ngraphLayout.getNodePosition(ngraphNode.id);
            bodies.push(b);
            radii[i] = node.layoutRadius + gap / 2;
            // A round node is a sphere; anything else (a box, a tall cylinder, a torus) is kept
            // apart by its bounding box, which one radius over- or under-states (#2668).
            round[i] = node.roundRadius === null ? 0 : 1;
            const half = round[i] === 1 ? null : node.drawnHalfExtents;
            reaches[3 * i] = (half?.x ?? node.layoutRadius) + gap / 2;
            reaches[3 * i + 1] = (half?.y ?? node.layoutRadius) + gap / 2;
            reaches[3 * i + 2] = (half?.z ?? node.layoutRadius) + gap / 2;
            movable[i] = this.ngraphLayout.isNodePinned(ngraphNode) ? 0 : 1;
            // A group following its members encloses them: it is not kept apart from them.
            if (this.isFollower(node.index)) {
                radii[i] = 0;
                reaches.fill(0, 3 * i, 3 * i + 3);
            }

            largest = Math.max(largest, radii[i], reaches[3 * i], reaches[3 * i + 1], reaches[3 * i + 2]);
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
        if (this.round[i] === 0 || this.round[j] === 0) {
            return this.pushBoxes(i, j, flat, [dx, dy, dz]);
        }

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
            dx = detCos(angle);
            dy = detSin(angle);
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
     * Push two bodies apart when their bounding boxes overlap: along the axis they overlap least
     * on, by that much, which is the shortest move that parts them.
     * @param i - One body's index.
     * @param j - The other's.
     * @param flat - Whether depth is ignored.
     * @param d - The other's centre minus the first's, per axis.
     * @returns True when they overlapped.
     */
    private pushBoxes(i: number, j: number, flat: boolean, d: number[]): boolean {
        const { reaches } = this;
        let axis = -1;
        let least = Infinity;
        for (let k = 0; k < (flat ? 2 : 3); k++) {
            const overlap = reaches[3 * i + k] + reaches[3 * j + k] - Math.abs(d[k]);
            if (overlap <= 0) {
                return false;
            }

            if (overlap < least) {
                least = overlap;
                axis = k;
            }
        }

        const wa = this.movable[i];
        const wb = this.movable[j];
        if (wa + wb === 0) {
            return true;
        }

        // Two centres level on that axis: a side from their indices, so a seeded layout stays
        // the same from run to run.
        const level = (i + j) % 2 === 0 ? 1 : -1;
        const sign = d[axis] === 0 ? level : Math.sign(d[axis]);
        const share = (sign * least) / (wa + wb);
        const key = (["x", "y", "z"] as const)[axis];
        const a = this.bodies[i];
        const b = this.bodies[j];
        a[key] = (a[key] ?? 0) - share * wa;
        b[key] = (b[key] ?? 0) + share * wb;

        return true;
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
     * Start the simulation again because a node's drawn size changed, when `nodeGap` keeps nodes
     * apart by that size: a node that grew after the layout came to rest may now cover another.
     * @returns True when the simulation was woken.
     */
    override wakeForResize(): boolean {
        if (this.nodeGap === null || !this._settled) {
            return false;
        }

        this._settled = false;
        this._stepCount = 0;
        this._lastMoves = [];
        return true;
    }

    /**
     * Read `clusterBy` again and start the simulation when the communities changed.
     * @returns True when the simulation was woken.
     */
    override wakeForClusters(): boolean {
        if (this.clusterBy === null || !this.readClusters()) {
            return false;
        }

        this._settled = false;
        this._stepCount = 0;
        this._lastMoves = [];
        return true;
    }

    /**
     * Read `clusterBy` and note each member's body.
     * @returns True when the communities changed.
     */
    private readClusters(): boolean {
        this.clustersStale = false;
        const read = readCommunities(this.clusterBy as string, this.nodeMapping.keys(), this.clusterColumn, (row) =>
            this.isFollower(row),
        );
        const same = sameCommunities(read, this.communities);
        this.communities = read;
        this.clusterBodies = [...read.keys()].map((node) => this.ngraphLayout.getBody(node.id) as Body);
        this.clusterPoints = this.clusterBodies.map((body) => body.pos);
        this.clusterOf = [...read.values()];
        this.clusterCount = new Set(this.clusterOf).size;
        return !same;
    }

    /** The cluster force, ngraph's spring of rest length 0 to the centroid: spring-electrical's law on the accelerator. */
    private pullClusters(): void {
        const { clusterBodies: bodies, clusterOf, clusterStrength } = this;
        const centroids = clusterCentroids(
            this.clusterPoints,
            clusterOf,
            this.clusterCount,
            (member) => bodies[member].mass,
        );
        const coefficient = clusterStrength * this.ngraphLayout.simulator.settings.springCoefficient;
        bodies.forEach(({ force, mass, pos }, member) => {
            const at = 3 * clusterOf[member];
            const pull = coefficient * mass;
            force.x += pull * (centroids[at] - pos.x);
            force.y += pull * (centroids[at + 1] - pos.y);
            if (pos.z !== undefined && force.z !== undefined) {
                force.z += pull * (centroids[at + 2] - pos.z);
            }
        });
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
        const { rows, coords } = this.publishScratch(this.nodeMapping.size + this.rowNodes.size);
        let count = 0;
        let first: Node | undefined;
        for (const [node, ngraphNode] of this.nodeMapping) {
            first ??= node;
            this.copyBody(ngraphNode.id, node.index, count++, rows, coords);
        }

        const snapshot = this.rowNodes.size > 0 ? this.rowSource?.getSnapshot() : undefined;
        for (const id of snapshot === undefined ? [] : this.rowNodes.keys()) {
            const row = snapshot?.ids.indexOf(id) ?? INVALID_INDEX;
            if (row !== INVALID_INDEX) {
                this.copyBody(id, row, count++, rows, coords);
            }
        }

        this.publishColumn(first ?? this.rowSource?.positions, rows, coords, count);
    }

    /**
     * Copy one body's position into the publish scratch, flat when ngraph carries no z.
     * @param id - The body's ngraph id.
     * @param row - Its row.
     * @param at - Its entry in the scratch.
     * @param rows - The scratch's rows.
     * @param coords - The scratch's coordinates.
     */
    private copyBody(id: NodeIdType, row: number, at: number, rows: Float64Array, coords: Float64Array): void {
        const pos = this.ngraphLayout.getNodePosition(id);
        rows[at] = row;
        coords[3 * at] = pos.x;
        coords[3 * at + 1] = pos.y;
        coords[3 * at + 2] = pos.z ?? 0;
    }

    /**
     * Under renderPath "batched", give the simulation a body for each row drawn with no `Node`.
     * Such a row is unsized (no `nodeGap` push), in no `clusterBy` community and never pinned,
     * since each of those is read from a `Node`; a hold reaches it by its row. A third party's
     * engine is handed `Node`s only.
     * @param ids - The rows' node ids.
     * @param source - Where a body finds its row at publish, and the element's array it publishes into.
     * @internal
     */
    addRows(ids: readonly NodeIdType[], source: D3RowSource): void {
        this.rowSource = source;
        for (const id of ids) {
            // An edge added first may already have made this body, placed by ngraph's own
            // unseeded generator; nothing has stepped yet, so the seed places it here either way.
            this.rowNodes.set(id, this.ngraph.addNode(id));
            this.place(id);
        }

        this.holdRowBodies();
        if (ids.length > 0) {
            this._settled = false;
            this._stepCount = 0;
            this._lastMoves = [];
        }
    }

    /**
     * Pin each held row body and free the rest, and weigh each by whether its row follows.
     */
    private holdRowBodies(): void {
        const snapshot = this.rowNodes.size > 0 ? this.rowSource?.getSnapshot() : undefined;
        for (const [id, ngraphNode] of snapshot === undefined ? [] : this.rowNodes) {
            const row = snapshot?.ids.indexOf(id) ?? INVALID_INDEX;
            if (row !== INVALID_INDEX) {
                this.ngraphLayout.pinNode(ngraphNode, this.isHeld(row));
                this.weigh(row, id);
            }
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
        this.clustersStale = true;
        // A row's `Node` built late takes over the row's body, where it already is: the
        // simulation is unchanged, so a settled one stays settled.
        const tookOver = this.rowNodes.delete(n.id);
        if (!tookOver) {
            this.place(n.id);
        }

        // A node that arrived after a scoped layout started is not one of its members.
        if (this.isHeld(n.index)) {
            this.ngraphLayout.pinNode(ngraphNode, true);
            this.weigh(n.index, n.id);
        }

        if (!tookOver) {
            this._settled = false;
            this._stepCount = 0;
            this._lastMoves = [];
        }
    }

    /**
     * Place a new body from the seed, when `seed` is set; otherwise ngraph places it.
     * @param id - The body's ngraph id.
     */
    private place(id: NodeIdType): void {
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
            this.ngraphLayout.setNodePosition(id, x, y, dim === 3 ? coord() : 0);
        }
    }

    /**
     * Add an edge to the NGraph simulation
     * @param e - The edge to add
     */
    addEdge(e: Edge): void {
        const link = this.pairLink(e.srcId, e.dstId);
        pairOf(link).edges.add(e);
        this.edgeMapping.set(e, link);
        this.slacken(link);
        this.unsettle();
    }

    /**
     * Under renderPath "batched", put each edge stored with no `Edge` on its pair's link. Such an
     * edge is never left out by an edge filter, which reads an `Edge`; an end left out still
     * slackens the link. A third party's engine is handed `Edge`s only.
     * @param rows - The edges.
     * @internal
     */
    addEdgeRows(rows: readonly EdgeRow[]): void {
        for (const { key, source, target } of rows) {
            const link = this.pairLink(source, target);
            pairOf(link).rows.add(key);
            this.rowLinks.set(key, link);
            this.slacken(link);
        }

        if (rows.length > 0) {
            this.unsettle();
        }
    }

    /**
     * Take edges that leave the graph with no `Edge` off their links, and drop a link left carrying none.
     * @param keys - The edges' ids; one on no link is skipped.
     * @internal
     */
    removeEdgeRows(keys: Iterable<string>): void {
        for (const key of keys) {
            const link = this.rowLinks.get(key);
            if (link !== undefined) {
                this.rowLinks.delete(key);
                pairOf(link).rows.delete(key);
                this.dropIfEmpty(link);
            }
        }
    }

    /**
     * The one link, and so one spring, between two nodes, made when they have none. A link per
     * edge made thirteen parallel emails thirteen springs while ngraph's damping stayed the same,
     * and a dense multigraph oscillated until the step budget stopped it.
     * @param source - One node's id.
     * @param target - The other's.
     * @returns The link.
     */
    private pairLink(source: NodeIdType, target: NodeIdType): NGraphLink {
        let link = this.pairLinks.get(source)?.get(target) ?? this.pairLinks.get(target)?.get(source);
        if (link === undefined) {
            let row = this.pairLinks.get(source);
            if (row === undefined) {
                row = new Map();
                this.pairLinks.set(source, row);
            }

            const data: PairData = { edges: new Set(), rows: new Set(), row, key: target };
            link = this.ngraph.addLink(source, target, data);
            row.set(target, link);
        }

        return link;
    }

    /** Step again from the start. */
    private unsettle(): void {
        this._settled = false;
        this._stepCount = 0;
        this._lastMoves = [];
    }

    /**
     * Drop a link that carries no edge any more.
     * @param link - The link.
     */
    private dropIfEmpty(link: NGraphLink): void {
        const { edges, rows, row, key } = pairOf(link);
        if (edges.size === 0 && rows.size === 0) {
            this.ngraph.removeLink(link);
            row.delete(key);
            this._settled = false;
        }
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
     * Take the position array as this engine's own: each `Node`'s body, and each row's with no
     * `Node`, which a `Node` built later takes where it is.
     */
    override loadArrangement(): void {
        super.loadArrangement();
        const snapshot = this.rowNodes.size > 0 ? this.rowSource?.getSnapshot() : undefined;
        const at = { x: 0, y: 0, z: 0 };
        for (const id of snapshot === undefined ? [] : this.rowNodes.keys()) {
            if (this.readRowPosition(snapshot?.ids.indexOf(id) ?? INVALID_INDEX, at)) {
                const pos = this.ngraphLayout.getNodePosition(id);
                pos.x = at.x;
                pos.y = at.y;
                pos.z = at.z;
            }
        }
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
        // From the edge's own endpoints: the link it shares may run the other way.
        this._getMappedEdge(e);
        const from = this.ngraphLayout.getNodePosition(e.srcId);
        const to = this.ngraphLayout.getNodePosition(e.dstId);
        return {
            src: { x: from.x, y: from.y, z: from.z },
            dst: { x: to.x, y: to.y, z: to.z },
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
     * Give a group that follows its members a body that pulls and pushes nothing: ngraph's
     * repulsion is proportional to both bodies' masses, so a mass this small is no force at all.
     * Zero would divide by zero in its quadtree's centre of mass. A body that stops following
     * gets ngraph's own mass back.
     * @param row - The body's row.
     * @param id - Its ngraph id.
     */
    private weigh(row: number, id: NodeIdType): void {
        const body = this.ngraphLayout.getBody(id);
        if (body === undefined) {
            return;
        }

        if (this.isFollower(row)) {
            body.mass = FOLLOWER_MASS;
        } else if (body.mass === FOLLOWER_MASS) {
            body.mass = 1 + (this.ngraph.getLinks(id)?.size ?? 0) / 3;
        }
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
            this.weigh(node.index, ngraphNode.id);
        }

        this.holdRowBodies();
        for (const link of new Set(this.edgeMapping.values())) {
            this.slacken(link);
        }
    }

    /**
     * Give a link to a node the layout leaves out (see `LayoutEngine.setLeftOut`) a spring too weak
     * to pull, and a link that no longer touches one ngraph's own spring back. Zero would not do:
     * ngraph reads a coefficient of 0 as "use the default".
     * @param link - The link.
     */
    private slacken(link: NGraphLink): void {
        const spring = this.ngraphLayout.getSpring(link) as Spring | undefined;
        if (spring === undefined) {
            return;
        }

        const leftOut =
            [link.fromId, link.toId].some((id) => {
                const node = (this.ngraph.getNode(id)?.data as { parentNode?: Node } | undefined)?.parentNode;
                return node !== undefined && this.isLeftOut(node.index);
            }) ||
            (pairOf(link).edges.size > 0 &&
                pairOf(link).rows.size === 0 &&
                [...pairOf(link).edges].every((edge) => this.isEdgeLeftOut(edge)));
        if (leftOut) {
            spring.coefficient = FOLLOWER_MASS;
        } else if (spring.coefficient === FOLLOWER_MASS) {
            spring.coefficient = 0;
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

        this.dropBody(ngraphNode);
        this.nodeMapping.delete(n);
    }

    /**
     * Under renderPath "batched", take out the bodies of rows that leave the graph with no `Node`;
     * otherwise each would stay in the simulation and keep pushing the others.
     * @param ids - The rows' node ids; an id with no row body is skipped.
     * @internal
     */
    removeRows(ids: Iterable<NodeIdType>): void {
        for (const id of ids) {
            const ngraphNode = this.rowNodes.get(id);
            if (ngraphNode !== undefined) {
                this.rowNodes.delete(id);
                this.dropBody(ngraphNode);
            }
        }
    }

    /**
     * Take a body and its links out of ngraph.
     * @param ngraphNode - The body.
     */
    private dropBody(ngraphNode: NGraphNode): void {
        this.clustersStale = true;

        // The node's own links, not every link: each carries the edges between its pair.
        for (const link of ngraphNode.links ?? []) {
            const { edges, rows, row, key } = pairOf(link);
            for (const edge of edges) {
                this.edgeMapping.delete(edge);
            }

            for (const edgeRow of rows) {
                this.rowLinks.delete(edgeRow);
            }

            row.delete(key);
        }

        this.ngraph.removeNode(ngraphNode.id);
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

        this.edgeMapping.delete(e);
        pairOf(link).edges.delete(e);
        this.dropIfEmpty(link);
    }

    /**
     * Strict state: {@link LayoutEngine.edgeProblems}, and each edge on a link that carries it,
     * which ngraph still holds.
     * @param drawn - The edges the element draws.
     * @returns One sentence per problem.
     */
    protected override edgeProblems(drawn: ReadonlyMap<string, Edge>): string[] {
        const problems = heldEdgeProblems(this.edgeMapping.keys(), drawn);
        for (const [edge, link] of this.edgeMapping) {
            if (!pairOf(link).edges.has(edge)) {
                problems.push(`edge ${edge.id} maps to a link that does not carry it`);
            }

            if (this.ngraph.getLinkById(link.id) !== link) {
                problems.push(`edge ${edge.id} maps to a link its graph no longer holds`);
            }
        }

        for (const [key, link] of this.rowLinks) {
            if (!pairOf(link).rows.has(key) || this.ngraph.getLinkById(link.id) !== link) {
                problems.push(`edge row ${key} maps to a link that does not carry it`);
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
