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
import { EdgePosition, LayoutEngine, Position } from "./LayoutEngine";

/**
 * Zod-based options schema for D3 Force Layout
 */
const d3LayoutOptionsSchema = defineOptions({
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
 * D3 force-directed layout engine using d3-force-3d simulation
 */
export class D3GraphEngine extends LayoutEngine {
    static type = "d3";
    static maxDimensions = 3;
    static zodOptionsSchema: OptionsSchema = d3LayoutOptionsSchema;
    d3ForceLayout: ReturnType<typeof forceSimulation>;
    d3AlphaMin: number;
    d3AlphaTarget: number;
    d3AlphaDecay: number;
    d3VelocityDecay: number;
    nodeMapping = new Map<Node, D3Node>();
    edgeMapping = new Map<Edge, D3Edge>();
    newNodeMap = new Map<Node, D3InputNode>();
    newEdgeMap = new Map<Edge, D3InputEdge>();
    reheat = false;

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

        // https://github.com/vasturiano/d3-force-3d?tab=readme-ov-file#links
        const fl = forceLink();
        fl.strength(0.9);
        // Type assertions needed due to d3-force-3d type definition issues with strict mode
        /* eslint-disable @typescript-eslint/no-explicit-any -- d3-force-3d types are incompatible */
        this.d3ForceLayout = forceSimulation()
            .numDimensions(3)
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
        this.newNodeMap.set(n, { id: n.id });
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

        // Publish first, then answer from the array, so a caller reading one node at a time sees
        // the same coordinates as a caller reading the array in bulk. A node with no row in the
        // graph falls through to the simulation's own numbers.
        const out = { x: 0, y: 0, z: 0 };
        this.writeNodePosition(n, d3node.x, d3node.y, d3node.z);
        if (this.readNodePosition(n, out)) {
            return out;
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
    setNodePosition(n: Node, newPos: Position): void {
        const d3node = this._getMappedNode(n);
        d3node.x = newPos.x;
        d3node.y = newPos.y;
        d3node.z = newPos.z ?? 0;
        // A drag is a placement like any other, so it lands in the shared array immediately rather
        // than waiting for a tick that a settled simulation may never run. It is a PLACEMENT and
        // not a layout step, so it writes even onto a pinned row: a reader must be able to move a
        // node they have pinned, and the layout-step guard would otherwise make a pin mean
        // "undraggable".
        this.writeNodePosition(n, d3node.x, d3node.y, d3node.z, "placement");
        this.reheat = true;
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
    pin(n: Node): void {
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
    unpin(n: Node): void {
        const d3node = this._getMappedNode(n);

        d3node.fx = undefined;
        d3node.fy = undefined;
        d3node.fz = undefined;
        this.reheat = true; // TODO: is this necessary?
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
        for (const edge of this.nodeEdges(n)) {
            this.removeEdge(edge);
        }

        this.nodeMapping.delete(n);
        this.newNodeMap.delete(n);
        this.reheat = true;
    }

    /**
     * Every edge this engine holds that touches one node.
     * @param n - the node
     * @returns the incident edges, as a fresh array so the caller may delete while it walks
     */
    private nodeEdges(n: Node): Edge[] {
        const incident: Edge[] = [];
        for (const edge of [...this.edgeMapping.keys(), ...this.newEdgeMap.keys()]) {
            if (edge.srcId === n.id || edge.dstId === n.id) {
                incident.push(edge);
            }
        }

        return incident;
    }

    /**
     * Take an edge out of the simulation. See {@link D3GraphEngine.removeNode}.
     * @param e - the edge leaving the graph
     */
    override removeEdge(e: Edge): void {
        this.edgeMapping.delete(e);
        this.newEdgeMap.delete(e);
        this.reheat = true;
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
