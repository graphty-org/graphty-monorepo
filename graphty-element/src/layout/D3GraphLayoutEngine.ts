import type { NodeMask } from "@graphty/graph-format";
import {
    Edge as D3Edge,
    forceCenter,
    forceLink,
    forceManyBody,
    forceSimulation,
    InputEdge as D3InputEdge,
    Node as D3Node,
} from "d3-force-3d";
import { z } from "zod/v4";

import { defineOptions, type OptionsSchema } from "../config";
import type { Edge } from "../Edge";
import type { Node, NodeIdType } from "../Node";
import { EdgePosition, heldEdgeProblems, LayoutEngine, Position } from "./LayoutEngine";

/**
 * Zod-based options schema for D3 Force Layout
 */
const d3LayoutOptionsSchema = defineOptions({
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

const D3LayoutConfig = z.strictObject({
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
    static type = "d3";
    static maxDimensions = 3;
    static zodOptionsSchema: OptionsSchema = d3LayoutOptionsSchema;
    /** Accepts a scope: a held node is fixed through d3's own `fx`/`fy`/`fz`. */
    static override scoped = true;

    /**
     * Get dimension-specific options for the D3 layout
     * @param dimension - The desired dimension (2 or 3)
     * @returns Options object with dim parameter
     */
    static getOptionsForDimension(dimension: 2 | 3): object {
        return { dim: dimension };
    }

    d3ForceLayout: ReturnType<typeof forceSimulation>;
    d3AlphaMin: number;
    d3AlphaTarget: number;
    d3AlphaDecay: number;
    d3VelocityDecay: number;
    /** 2 or 3: how many dimensions the simulation moves nodes in. A 2D one keeps every z at 0. */
    readonly dim: 2 | 3;
    nodeMapping = new Map<Node, D3Node>();
    edgeMapping = new Map<Edge, D3Edge>();
    newNodeMap = new Map<Node, D3InputNode>();
    newEdgeMap = new Map<Edge, D3InputEdge>();
    /** Each node id's edges, so removing a node visits only its own edges (issue #1425). */
    private readonly edgesByNode = new Map<Edge["srcId"], Set<Edge>>();
    reheat = false;
    /** 2 or 3: in 2D d3 moves nodes in X and Y only, and every node stays at Z = 0. */
    private readonly dim: number;

    /**
     * Check if there are pending nodes or edges to be processed
     * @returns True if the graph needs to be refreshed
     */
    get graphNeedsRefresh(): boolean {
        return !!this.newNodeMap.size || !!this.newEdgeMap.size;
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

        // https://github.com/vasturiano/d3-force-3d?tab=readme-ov-file#links
        const fl = forceLink();
        fl.strength(0.9);
        // Type assertions needed due to d3-force-3d type definition issues with strict mode
        /* eslint-disable @typescript-eslint/no-explicit-any -- d3-force-3d types are incompatible */
        this.d3ForceLayout = forceSimulation()
            .numDimensions(this.dim)
            .alpha(1)
            .force("link", fl as any)
            .force("charge", forceManyBody() as any)
            .force("center", forceCenter() as any)
            .force("dagRadial", null)
            .stop();
        /* eslint-enable @typescript-eslint/no-explicit-any */
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- d3-force-3d types are incompatible
        (this.d3ForceLayout.force("link") as any).id((d: D3Node) => (d as D3InputNode).id);
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
            nodeList = nodeList.concat([...this.newNodeMap.values()]);
            this.d3ForceLayout
                .alpha(1) // re-heat the simulation
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- d3-force-3d types are incompatible
                .nodes(nodeList as any)
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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- d3-force-3d types are incompatible
            (this.d3ForceLayout.force("link") as any).links(linkList);

            // copy over new edges
            for (const entry of this.newEdgeMap.entries()) {
                const e = entry[0];
                const d3edge = entry[1];
                if (!isD3Edge(d3edge)) {
                    throw new Error("Internal error: Edge is not settled as a complete D3 Edge");
                }

                this.edgeMapping.set(e, d3edge);
            }
            this.newEdgeMap.clear();

            // Clear reheat flag so we don't keep reheating every tick
            this.reheat = false;
        }
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
        this.d3ForceLayout.tick();
        this.publishPositions();
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
        // A 2D simulation never initialises or moves z, so it starts, and stays, at 0.
        this.newNodeMap.set(n, this.dim === 2 ? { id: n.id, z: 0, vz: 0 } : { id: n.id });
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
     * Get all edges in the simulation
     * @returns Iterable of edges
     */
    get edges(): Iterable<Edge> {
        return this.edgeMapping.keys();
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
        this.reheat = true; // TODO: is this necessary?
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
        const nodes = new Set<unknown>(this.nodeMapping.values());
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
