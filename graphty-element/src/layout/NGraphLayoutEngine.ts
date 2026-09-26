import ngraphCreateLayout, { Layout as NGraphLayout } from "ngraph.forcelayout";
import createGraph, { Graph as NGraph, Link as NGraphLink, Node as NGraphNode } from "ngraph.graph";
import random from "ngraph.random";
import { z } from "zod/v4";

import { defineOptions, type OptionsSchema } from "../config";
import type { Edge } from "../Edge";
import type { Node } from "../Node";
import { EdgePosition, LayoutEngine, Position } from "./LayoutEngine";

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
    seed: {
        schema: z.number().int().positive().nullable().default(null),
        meta: {
            label: "Random Seed",
            description: "Seed for reproducible layout",
            advanced: true,
        },
    },
});

/**
 * NGraph force-directed layout engine using ngraph.forcelayout
 */
export class NGraphEngine extends LayoutEngine {
    static type = "ngraph";
    static maxDimensions = 3;
    static zodOptionsSchema: OptionsSchema = ngraphLayoutOptionsSchema;
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
    /** Places each new node when `seed` is set; null leaves placement to ngraph. */
    private seededPlacement: { rng: ReturnType<typeof random>; dim: number } | null = null;

    /**
     * Create an NGraph layout engine
     * @param config - Configuration options for the NGraph simulation
     */
    constructor(config: object = {}) {
        super();
        this.ngraph = createGraph();

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

        this._settled = ngraphSettled || avgMovement <= customThreshold || this._stepCount >= maxSteps;
        // KEPT DELIBERATELY, even though `LayoutManager` publishes after every step batch as
        // well. This engine is driven directly, with no manager, by
        // `test/layout/layout-positions.test.ts`, which is what pins that a simulation's own
        // coordinates reach the shared array. The duplicate copy is the price of that being
        // testable without a renderer; an engine that never publishes is still correct, which is
        // what the layout extension test pins from the other side.
        this.publishPositions();
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

        // Publish first, then answer from the array, so a caller reading one node at a time sees
        // the same coordinates as a caller reading the array in bulk. A node with no row in the
        // graph falls through to the simulation's own body, which is the object ngraph itself
        // mutates -- see setNodePosition, which writes straight into it.
        const out = { x: 0, y: 0, z: 0 };
        this.writeNodePosition(n, pos.x, pos.y, pos.z ?? 0);
        if (this.readNodePosition(n, out)) {
            return out;
        }

        return pos;
    }

    /**
     * Set a node's position in the simulation
     * @param n - The node to set position for
     * @param newPos - The new position coordinates
     */
    setNodePosition(n: Node, newPos: Position): void {
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
    pin(n: Node): void {
        const ngraphNode = this._getMappedNode(n);
        this.ngraphLayout.pinNode(ngraphNode, true);
    }

    /**
     * Unpin a node to allow it to move freely
     * @param n - The node to unpin
     */
    unpin(n: Node): void {
        const ngraphNode = this._getMappedNode(n);
        this.ngraphLayout.pinNode(ngraphNode, false);
    }

    /**
     * Take a node out of the simulation, and the links ngraph drops with it.
     *
     * `ngraph.removeNode` removes the node's links too, so the element's own edge mapping is
     * swept for links that no longer belong to any graph -- otherwise `getEdgePosition` would ask
     * ngraph for the position of a link it has already forgotten.
     * @param n - the node leaving the graph
     */
    override removeNode(n: Node): void {
        const ngraphNode = this.nodeMapping.get(n);
        if (!ngraphNode) {
            return;
        }

        for (const [edge, link] of this.edgeMapping) {
            if (link.fromId === ngraphNode.id || link.toId === ngraphNode.id) {
                this.edgeMapping.delete(edge);
            }
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
