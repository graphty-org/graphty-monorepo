import { type DerivedGraph, type GraphSnapshot, INVALID_INDEX, type U32 } from "@graphty/graph-format";
import jmespath from "jmespath";

import type { AdHocData } from "../config";
import { DataSource } from "../data/DataSource";
import { GraphStore } from "../data/GraphStore";
import { ingestEdge, ingestNode, resolveEdgeWeight } from "../data/ingest";
import type { ElementPositions } from "../data/positions";
import { Edge, EdgeMap } from "../Edge";
import type { LayoutEngine } from "../layout/LayoutEngine";
import { GraphtyLogger, type Logger } from "../logging/GraphtyLogger.js";
import { MeshCache } from "../meshes/MeshCache";
import { Node, NodeIdType } from "../Node";
import type { Styles } from "../Styles";
import type { EventManager } from "./EventManager";
import type { GraphContext } from "./GraphContext";
import type { Manager } from "./interfaces";

// Type guards for layout engines with optional removal methods
type LayoutEngineWithRemoveNode = LayoutEngine & { removeNode(node: Node): void };
type LayoutEngineWithRemoveEdge = LayoutEngine & { removeEdge(edge: Edge): void };

function hasRemoveNode(engine: LayoutEngine): engine is LayoutEngineWithRemoveNode {
    return "removeNode" in engine;
}

function hasRemoveEdge(engine: LayoutEngine): engine is LayoutEngineWithRemoveEdge {
    return "removeEdge" in engine;
}

/** One pending edge: in the store already, waiting for both endpoints to have a render object. */
interface PendingEdge {
    /** The raw edge record. */
    record: Record<string | number, unknown>;
    /** The JMESPath override this edge arrived with, if any. */
    srcIdPath?: string;
    /** The JMESPath override this edge arrived with, if any. */
    dstIdPath?: string;
    /** The edge's index in the builder, walked through every `edgeRemap` until the Edge is built. */
    edgeIndex: number;
}

/**
 * Manages all data operations for nodes and edges
 * Handles CRUD operations, caching, and data source loading
 *
 * THE AUTHORITATIVE COPY OF THE GRAPH IS THE STORE, NOT THE MESHES. `nodes` and `edges` hold the
 * render objects -- a `Node` builds a Babylon mesh in its constructor -- and they remain how the
 * scene is drawn. Alongside them this manager keeps ONE {@link GraphStore} for the life of the
 * graph: every record that arrives is pushed into its builder, and `getSnapshot()` hands out an
 * immutable graph-format snapshot of it. `Node.index` and `Edge.index` are that snapshot's dense
 * row numbers, so an id maps to a row without walking a map of meshes.
 *
 * The two copies are not always in step, and the direction of the discrepancy is deliberate:
 *
 * - An edge whose endpoints have not arrived is in the STORE already (the builder is
 *   `addMissingNodes: true`, so it materialises both endpoints) while its render object waits in
 *   `pendingEdges` for the `Node` objects it reads in its constructor. The snapshot is therefore
 *   the more complete of the two mid-load.
 * - A record whose configured id path yields something graph-format will not accept -- `null` from
 *   a record with no id key, most often -- gets a render object with `index === INVALID_INDEX` and
 *   no row in the store. The element has always drawn such a record; refusing it here would be a
 *   new failure in the middle of a data load.
 */
export class DataManager implements Manager {
    // Node and edge collections
    nodes = new Map<string | number, Node>();
    edges = new Map<string | number, Edge>();
    nodeCache = new Map<NodeIdType, Node>();
    edgeCache = new EdgeMap();

    /**
     * Render objects by their store edge index, so a freeze report's `edgeRemap` -- and a removal,
     * which hands back the incident edge indices and nothing else -- can find them in O(1). Sparse:
     * an index with no render object yet, or whose edge was removed, reads `undefined`.
     */
    readonly edgesByIndex: (Edge | undefined)[] = [];

    private logger: Logger = GraphtyLogger.getLogger(["graphty", "data"]);

    /** The one graph-format builder and its cached snapshot; replaced only by `clear()`/`dispose()`. */
    private store: GraphStore;

    // Graph-level algorithm results storage
    graphResults?: AdHocData;

    // Mesh cache for performance
    meshCache: MeshCache;

    // GraphContext for creating nodes and edges
    private graphContext: GraphContext | null = null;

    // State management flags
    private shouldStartLayout = false;
    private shouldZoomToFit = false;

    // Buffer for edges whose RENDER objects cannot be built yet because a Node is missing. The
    // store already has every one of them; see the class comment.
    private pendingEdges: PendingEdge[] = [];

    /**
     * The `"src:dst"` keys in {@link pendingEdges}, so a duplicate record that arrives while the
     * render object is still pending is dropped instead of being pushed into the builder twice.
     * `edgeCache` cannot answer that question: it only learns about an edge when the `Edge` is
     * built.
     */
    private readonly pendingEdgeKeys = new Set<string>();

    /**
     * Creates an instance of DataManager
     * @param eventManager - Event manager for emitting data events
     * @param styles - Styles instance for applying styles to data
     */
    constructor(
        private eventManager: EventManager,
        private styles: Styles,
    ) {
        this.meshCache = new MeshCache();
        this.store = this.createStore();
    }

    /**
     * The current graph snapshot, freezing first when records have arrived since the last one.
     *
     * The same object is returned until the graph changes again, so a burst of records -- through
     * the operation queue, through `skipQueue`, or through `addDataFromSource`, which bypasses the
     * queue entirely -- costs exactly one freeze however many readers ask afterwards. The snapshot
     * is immutable; the node coordinates it carries are not, because the element lends it
     * {@link positions} by reference.
     * @returns the snapshot
     */
    getSnapshot(): GraphSnapshot {
        return this.store.getSnapshot();
    }

    /**
     * The undirected view of a snapshot, built once per snapshot and cached.
     * @param snapshot - a snapshot this manager produced
     * @returns the derived graph, including the edge remap an edge-result adapter needs
     */
    undirected(snapshot: GraphSnapshot): DerivedGraph {
        return this.store.undirected(snapshot);
    }

    /**
     * The element-owned node coordinates: a stride-3 Float32Array indexed by `Node.index`.
     *
     * The element owns these, not the snapshot -- every freeze lends the array to the new snapshot
     * as its `role: "position"` column BY REFERENCE -- so a layout, a drag or a GPU readback writes
     * in one place and nothing is lost when the graph is frozen again. A row that no layout has
     * placed reads as NaN, never as the origin: zero is a real coordinate and "not placed yet" is
     * not.
     * @returns the live position array
     */
    get positions(): ElementPositions {
        return this.store.positions;
    }

    /**
     * Build the store, wiring its three freeze callbacks back into this manager.
     *
     * `positionScale` is passed as a thunk rather than a value because the element mutates
     * `config.data.knownFields` in place at run time; a scale captured here would be the one known
     * field that ignored a later change.
     * @returns the new store
     */
    private createStore(): GraphStore {
        const { data } = this.styles.config;
        return new GraphStore({
            directed: data.directed,
            positionScale: () => this.styles.config.data.knownFields.positionScale,
            onNodeRemap: (remap) => {
                this.walkNodeRemap(remap);
            },
            onEdgeRemap: (remap) => {
                this.walkEdgeRemap(remap);
            },
            onReplaced: (replacement) => {
                // Before the graph context is set there is nobody to emit to, and nothing has been
                // rendered either -- the event exists so holders can release per-snapshot
                // resources, and at that point there are none.
                if (this.graphContext) {
                    this.eventManager.emitSnapshotReplaced(
                        this.graphContext,
                        replacement.previous,
                        replacement.next,
                        replacement.report,
                    );
                }
            },
        });
    }

    /**
     * Move every render node onto its row in the new snapshot after a compacting freeze.
     *
     * Delivered BEFORE `snapshot-replaced`, so no listener ever reads a `Node.index` that still
     * points into the previous index space.
     * @param remap - the freeze report's nodeRemap: old index -> new index, or INVALID_INDEX for a
     *     node the freeze dropped
     */
    private walkNodeRemap(remap: U32): void {
        for (const node of this.nodes.values()) {
            // A node that never reached the store carries INVALID_INDEX, which is 0xFFFFFFFF and
            // therefore past the end of the remap: the read is `undefined` and it stays invalid.
            node.index = remap[node.index] ?? INVALID_INDEX;
        }
    }

    /**
     * Re-key {@link edgesByIndex} and every `Edge.index` after a compacting freeze, and drop any
     * pending edge whose store edge died with the freeze.
     * @param remap - the freeze report's edgeRemap: old index -> new index, or INVALID_INDEX
     */
    private walkEdgeRemap(remap: U32): void {
        this.edgesByIndex.length = 0;
        for (const edge of this.edges.values()) {
            const moved = remap[edge.index] ?? INVALID_INDEX;
            edge.index = moved;
            if (moved !== INVALID_INDEX) {
                this.edgesByIndex[moved] = edge;
            }
        }

        const survivors: PendingEdge[] = [];
        for (const pending of this.pendingEdges) {
            const moved = remap[pending.edgeIndex] ?? INVALID_INDEX;
            if (moved === INVALID_INDEX) {
                // The store edge is gone, so there is no longer anything for the render object to
                // be built FOR. Forget the key too, or a later record for the same pair would be
                // dropped as a duplicate of an edge that no longer exists.
                this.pendingEdgeKeys.delete(this.pendingEdgeKey(pending));
                continue;
            }

            pending.edgeIndex = moved;
            survivors.push(pending);
        }

        this.pendingEdges = survivors;
    }

    /**
     * The `"src:dst"` key of a pending edge, resolved the same way `addEdges` resolved it.
     * @param pending - the pending entry
     * @returns the key, identical to the `Edge.id` the render object will carry
     */
    private pendingEdgeKey(pending: PendingEdge): string {
        const srcQuery = pending.srcIdPath ?? this.styles.config.data.knownFields.edgeSrcIdPath;
        const dstQuery = pending.dstIdPath ?? this.styles.config.data.knownFields.edgeDstIdPath;
        const srcNodeId = jmespath.search(pending.record, srcQuery) as NodeIdType;
        const dstNodeId = jmespath.search(pending.record, dstQuery) as NodeIdType;
        return `${srcNodeId}:${dstNodeId}`;
    }

    /**
     * Discard the store and everything keyed into it, and start a fresh one.
     *
     * The builder's own `clear()` would drop the DECLARED columns along with the data, so the seed
     * and edge-id columns -- and the handles this manager holds for them -- would all have to be
     * re-made at the call site. A fresh `GraphStore` re-runs those declarations in the one place
     * they are written. The discarded `ElementPositions` goes with it, which is correct: a cleared
     * dataset has no coordinates to keep.
     */
    private resetStore(): void {
        this.edgesByIndex.length = 0;
        this.pendingEdges = [];
        this.pendingEdgeKeys.clear();
        this.store.dispose();
        this.store = this.createStore();
    }

    /**
     * Update the styles reference when styles change
     * @param styles - New styles instance to use
     */
    updateStyles(styles: Styles): void {
        this.styles = styles;
        // Re-apply styles to all existing nodes and edges
        this.applyStylesToExistingNodes();
        this.applyStylesToExistingEdges();
    }

    /**
     * Re-resolve every node against the current style layers and redraw it.
     */
    applyStylesToExistingNodes(): void {
        for (const n of this.nodes.values()) {
            n.updateStyle(this.styles.getStyleForNode(n.data));
            n.update();
        }
    }

    /**
     * Re-resolve every edge against the current style layers and redraw it.
     */
    applyStylesToExistingEdges(): void {
        for (const e of this.edges.values()) {
            e.updateStyle(this.styles.getStyleForEdge(e.data));
            e.update();
        }
    }

    /**
     * Set the GraphContext for creating nodes and edges
     * @param context - GraphContext instance to use for node/edge creation
     */
    setGraphContext(context: GraphContext): void {
        this.graphContext = context;
    }

    /**
     * Set the layout engine reference for adding nodes/edges
     */
    private layoutEngine?: LayoutEngine;

    /**
     * Set the layout engine reference for managing node and edge positions
     * @param engine - Layout engine instance or undefined to clear
     */
    setLayoutEngine(engine: LayoutEngine | undefined): void {
        this.layoutEngine = engine;
    }

    /**
     * Initializes the data manager
     * @returns Promise that resolves when initialization is complete
     */
    async init(): Promise<void> {
        // DataManager doesn't need async initialization
        return Promise.resolve();
    }

    /**
     * Dispose every node and edge currently held, in the one order that is not wasted work.
     *
     * EDGES BEFORE NODES: an edge reads `srcNode.mesh` / `dstNode.mesh` while tearing itself down
     * and its arrowheads are positioned against those meshes, so a node must still be intact when
     * its edges go.
     *
     * BOTH BEFORE `meshCache.clear()`: the cache disposes the SOURCE meshes, and Babylon disposes
     * a source's instances along with it. Disposing an instance whose source is already gone is
     * wasted work at best; more importantly, everything a node or edge created OUTSIDE the cache
     * -- arrowheads, patterned lines, bezier curves, labels, drag handlers -- is invisible to the
     * cache and is only ever freed here. Before this existed, roughly sixty arrowheads per
     * dataset stayed in the scene forever; see Edge.dispose for the full account.
     *
     * NOTE ON THE LAYOUT ENGINE: this class still does not notify it (the standing TODO in
     * `clear`), so the engine keeps its own lists of these now-disposed objects and UpdateManager
     * keeps walking them. Node and Edge both carry a `disposed` guard for exactly that reason --
     * without it, the next frame would rebuild the meshes this method just freed.
     */
    private disposeNodesAndEdges(): void {
        for (const edge of this.edges.values()) {
            edge.dispose();
        }

        for (const node of this.nodes.values()) {
            node.dispose();
        }
    }

    /**
     * Disposes of the data manager and cleans up all resources
     */
    dispose(): void {
        // Free the per-node and per-edge Babylon resources BEFORE dropping the references to
        // them -- once the maps are cleared nothing can reach those meshes again.
        this.disposeNodesAndEdges();

        // Clear all collections
        this.nodes.clear();
        this.edges.clear();
        this.nodeCache.clear();
        this.edgeCache.clear();

        // Drop the graph data itself, not only the render objects built from it.
        this.resetStore();

        // Clear graph-level results
        this.graphResults = undefined;

        // Clear mesh cache
        this.meshCache.clear();
    }

    // Node operations

    /**
     * Adds a single node to the graph
     * @param node - Node data object
     * @param idPath - JMESPath expression to extract node ID from data
     */
    addNode(node: AdHocData, idPath?: string): void {
        this.addNodes([node], idPath);
    }

    /**
     * Adds multiple nodes to the graph
     * @param nodes - Array of node data objects
     * @param idPath - JMESPath expression to extract node ID from data
     */
    addNodes(nodes: Record<string | number, unknown>[], idPath?: string): void {
        this.logger.debug("Adding nodes", { count: nodes.length });

        // create path to node ids
        const query = idPath ?? this.styles.config.data.knownFields.nodeIdPath;

        // create nodes
        for (const node of nodes) {
            const nodeId = jmespath.search(node, query) as NodeIdType;

            if (this.nodeCache.get(nodeId)) {
                continue;
            }

            const styleId = this.styles.getStyleForNode(node as AdHocData);
            if (!this.graphContext) {
                throw new Error("GraphContext not set. Call setGraphContext before adding nodes.");
            }

            const n = new Node(this.graphContext, nodeId, styleId, node as AdHocData, {
                pinOnDrag: this.graphContext.getConfig().pinOnDrag,
            });
            // The store is what gives the node its dense row; INVALID_INDEX comes back for an id
            // graph-format will not take, and the node renders anyway. See the class comment.
            n.index = ingestNode(this.store, nodeId, node).index;
            this.nodeCache.set(nodeId, n);
            this.nodes.set(nodeId, n);

            // Add to layout engine if it exists
            if (this.layoutEngine) {
                this.layoutEngine.addNode(n);
            }

            // Emit node added event
            this.eventManager.emitNodeEvent("node-add-before", {
                nodeId,
                metadata: node,
            });
        }

        // Notify that nodes were added
        if (nodes.length > 0) {
            // Request layout start and zoom to fit
            this.shouldStartLayout = true;
            this.shouldZoomToFit = true;

            // Process any pending edges whose nodes now exist
            this.processPendingEdges();

            // Emit event to notify graph that data has been added
            this.eventManager.emitDataAdded("nodes", nodes.length, true, true);
        }
    }

    /**
     * Build the render objects for pending edges whose nodes now exist.
     *
     * Called after nodes are added. Only the RENDER object was deferred: every one of these edges
     * is already in the store, which is why the entry carries the index the builder gave it.
     */
    private processPendingEdges(): void {
        if (this.pendingEdges.length === 0) {
            return;
        }

        // Try to process all pending edges
        const stillPending: PendingEdge[] = [];

        for (const pending of this.pendingEdges) {
            const { record, srcIdPath, dstIdPath, edgeIndex } = pending;
            // get paths
            const srcQuery = srcIdPath ?? this.styles.config.data.knownFields.edgeSrcIdPath;
            const dstQuery = dstIdPath ?? this.styles.config.data.knownFields.edgeDstIdPath;

            const srcNodeId = jmespath.search(record, srcQuery) as NodeIdType;
            const dstNodeId = jmespath.search(record, dstQuery) as NodeIdType;

            // Check if both nodes now exist
            const srcNode = this.nodeCache.get(srcNodeId);
            const dstNode = this.nodeCache.get(dstNodeId);

            if (!srcNode || !dstNode) {
                // Nodes still don't exist, keep it pending
                stillPending.push(pending);
                continue;
            }

            this.pendingEdgeKeys.delete(`${srcNodeId}:${dstNodeId}`);

            // Check if edge already exists
            if (this.edgeCache.get(srcNodeId, dstNodeId)) {
                continue;
            }

            // Create the edge now that both nodes exist
            const style = this.styles.getStyleForEdge(record as AdHocData);
            const opts = {};
            if (!this.graphContext) {
                throw new Error("GraphContext not set. Call setGraphContext before adding edges.");
            }

            const e = new Edge(this.graphContext, srcNodeId, dstNodeId, style, record as AdHocData, opts);
            this.registerEdge(e, edgeIndex);

            // Add to layout engine if it exists
            if (this.layoutEngine) {
                this.layoutEngine.addEdge(e);
            }

            // Emit edge added event
            this.eventManager.emitEdgeEvent("edge-add-before", {
                srcNodeId,
                dstNodeId,
                metadata: record,
            });
        }

        // Update the queue with edges that still couldn't be processed
        this.pendingEdges = stillPending;
    }

    /**
     * Record a freshly built render edge in all three of the places that index it.
     * @param edge - the new render object
     * @param edgeIndex - the index the builder gave this edge, or INVALID_INDEX when its endpoint
     *     ids were not ones graph-format accepts
     */
    private registerEdge(edge: Edge, edgeIndex: number): void {
        edge.index = edgeIndex;
        if (edgeIndex !== INVALID_INDEX) {
            this.edgesByIndex[edgeIndex] = edge;
        }

        this.edgeCache.set(edge.srcId, edge.dstId, edge);
        this.edges.set(edge.id, edge);
    }

    /**
     * Gets a node by its ID
     * @param nodeId - Node identifier
     * @returns Node instance or undefined if not found
     */
    getNode(nodeId: NodeIdType): Node | undefined {
        return this.nodes.get(nodeId);
    }

    /**
     * Removes a node from the graph
     * @param nodeId - Node identifier to remove
     * @returns True if the node was removed, false if not found
     */
    removeNode(nodeId: NodeIdType): boolean {
        const node = this.nodes.get(nodeId);
        if (!node) {
            return false;
        }

        // Remove from collections
        this.nodes.delete(nodeId);
        this.nodeCache.delete(nodeId);

        // Remove from the store, which tombstones the node AND every live incident edge and hands
        // back their indices. The render objects for those edges are NOT disposed here -- see the
        // standing TODO below -- so they are detached from the store instead: their rows are
        // released and their index is invalidated, which is what an edge that is no longer part of
        // the graph should report.
        this.detachNodeFromStore(node);

        // Remove from layout engine
        if (this.layoutEngine && hasRemoveNode(this.layoutEngine)) {
            this.layoutEngine.removeNode(node);
        }

        // Dispose AFTER the layout engine has been told, so the engine is never asked to read a
        // position off a mesh that is already gone.
        node.dispose();

        // TODO: Remove connected edges
        //
        // LEFT OPEN DELIBERATELY. Cascading the removal to incident edges changes an existing
        // behaviour -- callers that remove a node and then remove its edges themselves would
        // start seeing edges that are already gone -- so it is a separate change from fixing the
        // mesh leak, and it needs AlgorithmManager and the shell's filter/expand paths checked
        // first. Until then an edge can outlive an endpoint: `Edge.update` keeps ray-casting
        // against the removed node's mesh, which `AbstractMesh.intersects` handles without
        // throwing (it returns an empty PickingInfo once the geometry is gone), so the edge
        // either keeps its last endpoint or falls back to centre-to-centre. Ugly, not fatal, and
        // no worse than before -- previously the node's mesh was never disposed at all, so the
        // dangling edge pointed at a fully drawn ghost node instead.
        return true;
    }

    /**
     * Take a node and its incident edges out of the store, leaving the render objects alone.
     * @param node - the node being removed
     */
    private detachNodeFromStore(node: Node): void {
        if (node.index === INVALID_INDEX) {
            return;
        }

        const removedEdges = this.store.builder.removeNodeByIndex(node.index);
        this.store.touch();
        node.index = INVALID_INDEX;
        if (removedEdges.length === 0) {
            return;
        }

        // One pass over the pending queue for the WHOLE incident set, not one pass per edge: a
        // node removed during a load can be incident to thousands of edges whose render objects
        // are all still waiting.
        const dead = new Set<number>(removedEdges);
        for (const edgeIndex of dead) {
            const edge = this.edgesByIndex[edgeIndex];
            if (edge) {
                edge.index = INVALID_INDEX;
                this.edgesByIndex[edgeIndex] = undefined;
            }
        }

        if (this.pendingEdges.length === 0) {
            return;
        }

        const survivors: PendingEdge[] = [];
        for (const pending of this.pendingEdges) {
            if (dead.has(pending.edgeIndex)) {
                // Forget the key too, or a later record for the same pair would be dropped as a
                // duplicate of an edge that no longer exists.
                this.pendingEdgeKeys.delete(this.pendingEdgeKey(pending));
                continue;
            }

            survivors.push(pending);
        }

        this.pendingEdges = survivors;
    }

    // Edge operations

    /**
     * Adds a single edge to the graph
     * @param edge - Edge data object
     * @param srcIdPath - JMESPath expression to extract source node ID from data
     * @param dstIdPath - JMESPath expression to extract destination node ID from data
     */
    addEdge(edge: AdHocData, srcIdPath?: string, dstIdPath?: string): void {
        this.addEdges([edge], srcIdPath, dstIdPath);
    }

    /**
     * Adds multiple edges to the graph
     * @param edges - Array of edge data objects
     * @param srcIdPath - JMESPath expression to extract source node ID from data
     * @param dstIdPath - JMESPath expression to extract destination node ID from data
     */
    addEdges(edges: Record<string | number, unknown>[], srcIdPath?: string, dstIdPath?: string): void {
        this.logger.debug("Adding edges", { count: edges.length });

        // get paths
        const srcQuery = srcIdPath ?? this.styles.config.data.knownFields.edgeSrcIdPath;
        const dstQuery = dstIdPath ?? this.styles.config.data.knownFields.edgeDstIdPath;

        const weightPath = this.styles.config.data.knownFields.edgeWeightPath;
        let legacyWeights = 0;

        // create edges
        for (const edge of edges) {
            const srcNodeId = jmespath.search(edge, srcQuery) as NodeIdType;
            const dstNodeId = jmespath.search(edge, dstQuery) as NodeIdType;
            const edgeKey = `${srcNodeId}:${dstNodeId}`;

            if (this.edgeCache.get(srcNodeId, dstNodeId) || this.pendingEdgeKeys.has(edgeKey)) {
                continue;
            }

            const weight = resolveEdgeWeight(edge, weightPath);
            if (weight.source === "legacy") {
                legacyWeights++;
            }

            // The STORE takes the edge now, whether or not the endpoints have render objects:
            // the builder creates a missing endpoint itself, so the snapshot is complete while
            // the scene is still catching up.
            const edgeIndex = ingestEdge(this.store, srcNodeId, dstNodeId, weight.weight);

            // Check if both nodes exist before creating the RENDER object, which reads them
            const srcNode = this.nodeCache.get(srcNodeId);
            const dstNode = this.nodeCache.get(dstNodeId);

            if (!srcNode || !dstNode) {
                // Defer the render object until the nodes exist
                this.pendingEdges.push({ record: edge, srcIdPath, dstIdPath, edgeIndex });
                this.pendingEdgeKeys.add(edgeKey);
                continue;
            }

            const style = this.styles.getStyleForEdge(edge as AdHocData);
            const opts = {};
            if (!this.graphContext) {
                throw new Error("GraphContext not set. Call setGraphContext before adding edges.");
            }

            const e = new Edge(this.graphContext, srcNodeId, dstNodeId, style, edge as AdHocData, opts);
            this.registerEdge(e, edgeIndex);

            // Add to layout engine if it exists
            if (this.layoutEngine) {
                this.layoutEngine.addEdge(e);
            }

            // Emit edge added event
            this.eventManager.emitEdgeEvent("edge-add-before", {
                srcNodeId,
                dstNodeId,
                metadata: edge,
            });
        }

        if (legacyWeights > 0) {
            // One line per burst, not per edge: this is a deprecation signal, not a per-record
            // warning, and a 50k-edge load would otherwise write 50k of them.
            this.logger.debug("edge weight read from the legacy 'value' key; set data.knownFields.edgeWeightPath", {
                count: legacyWeights,
                edgeWeightPath: weightPath,
            });
        }

        // Notify that edges were added
        if (edges.length > 0) {
            // Request layout start
            this.shouldStartLayout = true;
            // Emit event to notify graph that data has been added
            this.eventManager.emitDataAdded("edges", edges.length, true, false);
        }
    }

    /**
     * Gets an edge by its ID
     * @param edgeId - Edge identifier
     * @returns Edge instance or undefined if not found
     */
    getEdge(edgeId: string | number): Edge | undefined {
        return this.edges.get(edgeId);
    }

    /**
     * Gets an edge between two nodes
     * @param srcNodeId - Source node identifier
     * @param dstNodeId - Destination node identifier
     * @returns Edge instance or undefined if not found
     */
    getEdgeBetween(srcNodeId: NodeIdType, dstNodeId: NodeIdType): Edge | undefined {
        return this.edgeCache.get(srcNodeId, dstNodeId);
    }

    /**
     * Removes an edge from the graph
     * @param edgeId - Edge identifier to remove
     * @returns True if the edge was removed, false if not found
     */
    removeEdge(edgeId: string | number): boolean {
        const edge = this.edges.get(edgeId);
        if (!edge) {
            return false;
        }

        // Remove from collections
        this.edges.delete(edgeId);
        this.edgeCache.delete(edge.srcNode.id, edge.dstNode.id);

        // Remove from the store
        if (edge.index !== INVALID_INDEX) {
            this.store.builder.removeEdge(edge.index);
            this.store.touch();
            this.edgesByIndex[edge.index] = undefined;
            edge.index = INVALID_INDEX;
        }

        // Remove from layout engine
        if (this.layoutEngine && hasRemoveEdge(this.layoutEngine)) {
            this.layoutEngine.removeEdge(edge);
        }

        // Dispose AFTER the layout engine has been told. This is what frees the edge's arrowheads
        // and label, none of which live in the mesh cache -- see Edge.dispose.
        edge.dispose();

        return true;
    }

    // Data source operations

    /**
     * Loads data from a registered data source
     * @param type - Data source type identifier
     * @param opts - Options to pass to the data source
     */
    async addDataFromSource(type: string, opts: object = {}): Promise<void> {
        this.logger.info("Loading data source", { type, options: opts });

        const startTime = Date.now();
        let nodesLoaded = 0;
        let edgesLoaded = 0;
        let chunksProcessed = 0;

        try {
            const source = DataSource.get(type, opts);
            if (!source) {
                throw new TypeError(`No data source named: ${type}`);
            }

            // Get file size for progress tracking (if available)
            const fileSize = (opts as { size?: number }).size;

            try {
                for await (const chunk of source.getData()) {
                    this.addNodes(chunk.nodes);
                    this.addEdges(chunk.edges);

                    nodesLoaded += chunk.nodes.length;
                    edgesLoaded += chunk.edges.length;
                    chunksProcessed++;

                    // Emit progress event
                    if (this.graphContext) {
                        this.eventManager.emitDataLoadingProgress(
                            type,
                            chunksProcessed * 64 * 1024, // Approximate bytes (chunk size)
                            fileSize,
                            nodesLoaded,
                            edgesLoaded,
                            chunksProcessed,
                        );
                    }
                }

                // Emit error summary if there were errors
                if (this.graphContext) {
                    const errorAggregator = source.getErrorAggregator();
                    if (errorAggregator.getErrorCount() > 0) {
                        const summary = errorAggregator.getSummary();
                        this.eventManager.emitDataLoadingErrorSummary(
                            type,
                            summary.totalErrors,
                            summary.message,
                            errorAggregator.getDetailedReport(),
                            summary.primaryCategory,
                            summary.suggestion,
                        );
                    }
                }

                // Emit completion event
                const duration = Date.now() - startTime;
                const errorCount = source.getErrorAggregator().getErrorCount();

                this.logger.info("Data source loading complete", {
                    nodesLoaded,
                    edgesLoaded,
                    duration,
                    chunks: chunksProcessed,
                    errors: errorCount,
                });

                if (this.graphContext) {
                    this.eventManager.emitDataLoadingComplete(
                        type,
                        nodesLoaded,
                        edgesLoaded,
                        duration,
                        errorCount,
                        0, // warnings
                        true,
                    );
                }

                // Keep existing data-loaded event for backward compatibility
                if (this.graphContext) {
                    this.eventManager.emitGraphDataLoaded(this.graphContext, chunksProcessed, type);
                }
            } catch (error) {
                // Log the error
                this.logger.error(
                    "Data source loading failed",
                    error instanceof Error ? error : new Error(String(error)),
                    {
                        type,
                        chunksProcessed,
                        nodesLoaded,
                        edgesLoaded,
                    },
                );

                // Emit error event
                if (this.graphContext) {
                    this.eventManager.emitDataLoadingError(
                        error instanceof Error ? error : new Error(String(error)),
                        "parsing",
                        type,
                        { canContinue: false },
                    );

                    // Keep existing error event for backward compatibility
                    this.eventManager.emitGraphError(
                        this.graphContext,
                        error instanceof Error ? error : new Error(String(error)),
                        "data-loading",
                        { chunksLoaded: chunksProcessed, dataSourceType: type },
                    );
                }

                throw new Error(
                    `Failed to load data from source '${type}' after ${chunksProcessed} chunks: ${error instanceof Error ? error.message : String(error)}`,
                );
            }
        } catch (error) {
            // Re-throw if already a processed error
            if (error instanceof Error && error.message.includes("Failed to load data")) {
                throw error;
            }

            // Otherwise wrap and throw
            throw new Error(
                `Error initializing data source '${type}': ${error instanceof Error ? error.message : String(error)}`,
            );
        }
    }

    // Utility methods

    /**
     * Clear all data
     */
    clear(): void {
        // Free the per-node and per-edge Babylon resources BEFORE dropping the references to
        // them. See disposeNodesAndEdges: meshCache.clear() below only reaches CACHED meshes,
        // and arrowheads, patterned lines and labels are not cached.
        this.disposeNodesAndEdges();

        // Remove all nodes and edges
        this.nodes.clear();
        this.edges.clear();
        this.nodeCache.clear();
        this.edgeCache.clear();

        // Drop the graph data itself, not only the render objects built from it.
        this.resetStore();

        // Clear graph-level results
        this.graphResults = undefined;

        // Clear mesh cache
        this.meshCache.clear();

        // TODO: Notify layout engine to clear
    }

    /**
     * Start label animations for all nodes
     * Called when layout has settled
     */
    startLabelAnimations(): void {
        for (const node of this.nodes.values()) {
            node.label?.startAnimation();
        }
    }

    /**
     * Get statistics about the data
     * @returns Object containing node count, edge count, and cached mesh count
     */
    getStats(): {
        nodeCount: number;
        edgeCount: number;
        cachedMeshes: number;
    } {
        return {
            nodeCount: this.nodes.size,
            edgeCount: this.edges.size,
            cachedMeshes: this.meshCache.size(),
        };
    }
}
