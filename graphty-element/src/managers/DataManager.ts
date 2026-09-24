import {
    type DerivedGraph,
    type DuplicatePolicy,
    type GraphSnapshot,
    INVALID_INDEX,
    type U32,
} from "@graphty/graph-format";
import jmespath from "jmespath";

import { unknownFormat } from "../catalog/detect";
import type { EdgeId } from "../catalog/types";
import type { AdHocData } from "../config";
import { DataSource, type DeclaredDirection } from "../data/DataSource";
import { edgeIdOf } from "../data/edgeIdentity";
import { readEndpoint, type ResolvedEndpoints, resolveEndpoints } from "../data/endpoints";
import { GraphStore } from "../data/GraphStore";
import { type DirectionOutcome, ingestDeclaredDirection, ingestEdge, ingestNode, resolveEdgeWeight } from "../data/ingest";
import type { ElementPositions } from "../data/positions";
import { type ImportReport, type ImportTally, newImportTally, sealImportReport } from "../data/report";
import { Edge, EdgeMap } from "../Edge";
import { GraphtyError, isGraphtyError } from "../errors";
import type { LayoutEngine } from "../layout/LayoutEngine";
import { GraphtyLogger, type Logger } from "../logging/GraphtyLogger.js";
import { MeshCache } from "../meshes/MeshCache";
import { Node, NodeIdType } from "../Node";
import type { DirectionProvenance } from "../session/types";
import type { Styles } from "../Styles";
import type { EventManager } from "./EventManager";
import type { GraphContext } from "./GraphContext";
import type { Manager } from "./interfaces";
import { bootstrapEdgePaint, bootstrapNodePaint } from "./StylePainter";

/** An id that is an integer written as text, and so has a second spelling worth retrying. */
const INTEGER_ID = /^-?\d+$/;

/** What a caller may say about one `addEdges` call that the configuration does not already say. */
export interface AddEdgesOptions {
    /** The JMESPath expression naming the source endpoint, overriding the configured one. */
    readonly source?: string;
    /** The JMESPath expression naming the target endpoint, overriding the configured one. */
    readonly target?: string;
    /**
     * What to do with a record naming an ordered pair the graph already holds, overriding
     * `data.knownFields.repeatedEdges` for this call alone.
     *
     * The expand-a-node path passes `"first"`, because "fetch the neighbourhood of this node" is a
     * request that legitimately re-supplies edges the graph already has, and the element knows
     * that about its own call site.
     */
    readonly repeated?: DuplicatePolicy;
}

/** One pending edge: in the store already, waiting for both endpoints to have a render object. */
interface PendingEdge {
    /** The raw edge record. */
    record: Record<string | number, unknown>;
    /**
     * The endpoint ids `addEdges` already resolved.
     *
     * Held rather than re-resolved because the same record used to be resolved against the same
     * configured paths in three separate places, which meant a deferred edge could resolve
     * differently from an immediate one and nothing would say so.
     */
    readonly sourceId: NodeIdType;
    /** The target endpoint id `addEdges` already resolved. */
    readonly targetId: NodeIdType;
    /** The edge's index in the builder, walked through every `edgeRemap` until the Edge is built. */
    edgeIndex: number;
    /** The counter the store stamped into this edge's id column; becomes `Edge.id`. */
    readonly edgeId: number;
}

/**
 * An edge the graph already holds between one ordered pair, whether or not its render object has
 * been built yet.
 *
 * A repeat policy has to be able to reach both: an edge whose endpoints have not arrived is in the
 * store, so a `sum` that ignored it would lose a weight, and a `first` that ignored it would
 * create the second edge it exists to prevent.
 */
interface ExistingEdge {
    /** The edge's index in the builder. */
    readonly edgeIndex: number;
    /** The render object, or null while it is still pending. */
    readonly edge: Edge | null;
    /** The pending entry, or null once the render object exists. */
    readonly pending: PendingEdge | null;
}

/**
 * Whether a value read from `knownFields.edgeIdPath` can identify an edge.
 *
 * A Map keyed on anything else would hold one entry per object identity, so every record would be
 * its own edge and the setting would silently do nothing.
 * @param value - what the configured expression returned
 * @returns true when it is usable as a record identifier
 */
function isStorableRecordId(value: unknown): value is string | number {
    return typeof value === "string" || (typeof value === "number" && Number.isFinite(value));
}

/**
 * Fold a repeat's weight into the weight of the edge that survives it.
 * @param policy - the merging repeat policy; "keep", "first" and "error" never reach here
 * @param survivor - the weight the edge already carries
 * @param repeat - the repeating record's weight
 * @returns the weight the surviving edge should carry
 */
function mergeWeights(policy: DuplicatePolicy, survivor: number, repeat: number): number {
    switch (policy) {
        case "sum":
            return survivor + repeat;
        case "min":
            return Math.min(survivor, repeat);
        case "max":
            return Math.max(survivor, repeat);
        default:
            // "last": the repeat's weight replaces the survivor's, which is the same statement its
            // attributes make one line up in `mergeRepeat`.
            return repeat;
    }
}

/**
 * Manages all data operations for nodes and edges
 * Handles CRUD operations, caching, and data source loading
 *
 * THE AUTHORITATIVE COPY OF THE GRAPH IS THE STORE, NOT THE MESHES. `nodes` and `edges` hold the
 * render objects -- a `Node` builds a Babylon mesh in its constructor -- and they remain how the
 * scene is drawn. Alongside them this manager keeps ONE `GraphStore` for the life of the
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
 * - A NODE whose configured id path yields something graph-format will not accept -- `null` from a
 *   record with no id key, most often -- gets a render object with `index === INVALID_INDEX` and no
 *   row in the store. The element has always drawn such a record; refusing it would be a new
 *   failure in the middle of a data load.
 *
 * An EDGE is the exception, and deliberately: one whose endpoint ids the store will not take is
 * REJECTED, counted in the import report, and never becomes a render object at all. An edge with
 * no store row could not be filtered -- the per-frame mask forces an unplaced edge visible -- so it
 * was permanently on screen with nothing able to hide it.
 */
export class DataManager implements Manager {
    // Node and edge collections
    nodes = new Map<string | number, Node>();
    /**
     * Every edge the graph holds, keyed by `Edge.id`.
     *
     * The key type is `string` and not `string | number`, because `Edge.id` is the element's own
     * edge counter printed as a string and nothing else. While the key was widened, `getEdge(0)`
     * compiled, answered `undefined` for the edge whose id is `"0"`, and said nothing about it.
     */
    edges = new Map<string, Edge>();
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
     * {@link pendingEdges} indexed by ordered endpoint pair, so a repeat policy can see an edge
     * whose render object has not been built yet.
     *
     * Nested maps rather than one map keyed by a joined pair string, for the same reason
     * {@link Edge.id} stopped being one: a node id may contain any character, so any single-string
     * encoding of two ids is ambiguous for some pair of them.
     */
    private pendingByPair = new Map<NodeIdType, Map<NodeIdType, PendingEdge[]>>();

    /**
     * The store edge index each record identifier has already produced, when
     * `knownFields.edgeIdPath` names one. Empty when it does not, which is the default.
     */
    private edgesByRecordId = new Map<string | number, number>();

    /** What the last load did, for `session.data.lastImport()`. Null until something has loaded. */
    private importReport: ImportReport | null = null;

    /**
     * The endpoint expressions the load in progress resolved, so a chunked load probes ONCE.
     *
     * A file that spells one chunk's edges `source`/`target` and the next chunk's `from`/`to` is a
     * broken file, and letting each chunk decide for itself makes the answer both unreportable and
     * dependent on how the file happened to be split.
     */
    private loadEndpoints: ResolvedEndpoints | null = null;

    /** The tally the load in progress is counting into, or null outside a load. */
    private loadTally: ImportTally | null = null;

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
     * How many nodes the DATA arrived carrying a coordinate for.
     *
     * Distinct from `positions.placedCount`, which counts what anything has placed -- including
     * a layout that has run for one frame. See `GraphStore.seededNodeCount`.
     * @returns the count
     */
    get seededNodeCount(): number {
        return this.store.seededNodeCount;
    }

    /**
     * How the direction of the loaded graph was settled, and by what text.
     * @returns the provenance; `"unsettled"` until a file or the configuration says
     */
    get directionSettledBy(): DirectionProvenance {
        return this.store.directionSettledBy;
    }

    /**
     * What the last load did: which endpoint spelling answered, how many repeats were seen and
     * what the policy did with them, and how many edges the graph actually holds.
     *
     * A door rather than only an event, because the two load events are fire-and-forget and a
     * consumer that subscribed after the load has no way to ask otherwise.
     * @returns the report, or null when nothing has been loaded into this graph
     */
    get lastImport(): ImportReport | null {
        return this.importReport;
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
                // be built FOR.
                this.forgetPending(pending);
                continue;
            }

            pending.edgeIndex = moved;
            survivors.push(pending);
        }

        this.pendingEdges = survivors;
    }

    /**
     * File a pending edge under its endpoint pair.
     * @param pending - the entry
     */
    private rememberPending(pending: PendingEdge): void {
        let byTarget = this.pendingByPair.get(pending.sourceId);
        if (!byTarget) {
            byTarget = new Map();
            this.pendingByPair.set(pending.sourceId, byTarget);
        }

        const parallel = byTarget.get(pending.targetId);
        if (parallel) {
            parallel.push(pending);
            return;
        }

        byTarget.set(pending.targetId, [pending]);
    }

    /**
     * Take a pending edge out of the pair index, without touching {@link pendingEdges} itself.
     * @param pending - the entry
     */
    private forgetPending(pending: PendingEdge): void {
        const byTarget = this.pendingByPair.get(pending.sourceId);
        const parallel = byTarget?.get(pending.targetId);
        if (!byTarget || !parallel) {
            return;
        }

        const at = parallel.indexOf(pending);
        if (at !== -1) {
            parallel.splice(at, 1);
        }

        if (parallel.length === 0) {
            byTarget.delete(pending.targetId);
        }

        if (byTarget.size === 0) {
            this.pendingByPair.delete(pending.sourceId);
        }
    }

    /**
     * Every edge the graph already holds between one ordered pair, built or still pending.
     * @param sourceId - the source endpoint id
     * @param targetId - the target endpoint id
     * @returns the existing edges, oldest first; empty when the pair is new
     */
    private existingBetween(sourceId: NodeIdType, targetId: NodeIdType): ExistingEdge[] {
        const built = this.edgeCache.get(sourceId, targetId);
        const pending = this.pendingByPair.get(sourceId)?.get(targetId) ?? [];
        return [
            ...built.map((edge) => ({ edgeIndex: edge.index, edge, pending: null })),
            ...pending.map((entry) => ({ edgeIndex: entry.edgeIndex, edge: null, pending: entry })),
        ];
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
        this.pendingByPair.clear();
        this.edgesByRecordId.clear();
        this.store.dispose();
        this.store = this.createStore();
    }

    /**
     * Update the configuration document reference when it changes
     * @param styles - New configuration document to read from
     */
    updateStyles(styles: Styles): void {
        this.styles = styles;
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

        // The report described a graph that no longer exists.
        this.importReport = null;

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

        // Records handed over, counted before any of them is skipped as already known, because
        // this is the number a progress bar is driven by and the number the report contrasts with
        // the nodes the graph ends up holding.
        if (this.loadTally !== null) {
            this.loadTally.nodeRecords += nodes.length;
        }

        // create path to node ids
        const query = idPath ?? this.styles.config.data.knownFields.nodeIdPath;

        // create nodes
        for (const node of nodes) {
            const nodeId = jmespath.search(node, query) as NodeIdType;

            if (this.nodeCache.get(nodeId)) {
                continue;
            }

            if (!this.graphContext) {
                throw new Error("GraphContext not set. Call setGraphContext before adding nodes.");
            }

            // The element's own defaults, because the row index the session's paint is addressed
            // by is assigned on the line below this one. The first style pass replaces it.
            const n = new Node(this.graphContext, nodeId, bootstrapNodePaint(), node as AdHocData, {
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
            // No JMESPath and no resolution here: `addEdges` already decided what this record's
            // endpoints are and wrote them onto the entry, so a deferred edge can no longer
            // resolve differently from an immediate one.
            const { record, sourceId, targetId, edgeIndex, edgeId } = pending;

            // Check if both nodes now exist
            const srcNode = this.nodeCache.get(sourceId);
            const dstNode = this.nodeCache.get(targetId);

            if (!srcNode || !dstNode) {
                // Nodes still don't exist, keep it pending
                stillPending.push(pending);
                continue;
            }

            this.forgetPending(pending);

            // No duplicate check. A second edge between the same pair is a second EDGE, and the
            // repeat policy already decided that in `addEdges`, before the store was told. The
            // check that used to be here dropped a render object for an edge the snapshot holds,
            // which left a store edge with no `Edge` and a permanently occupied index slot.
            const opts = {};
            if (!this.graphContext) {
                throw new Error("GraphContext not set. Call setGraphContext before adding edges.");
            }

            const e = new Edge(
                this.graphContext,
                sourceId,
                targetId,
                edgeId,
                bootstrapEdgePaint(),
                record as AdHocData,
                opts,
            );
            this.registerEdge(e, edgeIndex);

            // Add to layout engine if it exists
            if (this.layoutEngine) {
                this.layoutEngine.addEdge(e);
            }

            // Emit edge added event
            this.eventManager.emitEdgeEvent("edge-add-before", {
                srcNodeId: sourceId,
                dstNodeId: targetId,
                metadata: record,
            });
        }

        // Update the queue with edges that still couldn't be processed
        this.pendingEdges = stillPending;
    }

    /**
     * Record a freshly built render edge in all three of the places that index it.
     * @param edge - the new render object
     * @param edgeIndex - the index the builder gave this edge. Never INVALID_INDEX: an edge whose
     *     endpoint ids graph-format will not store is rejected before it reaches here
     */
    private registerEdge(edge: Edge, edgeIndex: number): void {
        edge.index = edgeIndex;
        this.edgesByIndex[edgeIndex] = edge;
        this.edgeCache.set(edge.srcId, edge.dstId, edge);
        this.edges.set(edge.id, edge);
    }

    /**
     * Gets a node by its ID, in either of the two types an integer id can be written as.
     *
     * The map is keyed on the id the source file carried, untouched: GML parses a bare integer
     * with `parseInt`, so the shipped Karate Club and Football samples hold NUMBER keys, while
     * every id that has been through a URL, a DOM attribute, a JSON document or a consumer's own
     * UI is a string by the time it comes back. `Map.get("34")` misses the key `34` in silence --
     * no throw, no event -- so `pin`, `selectNode` and `zoomToNodes` were no-ops on exactly those
     * samples, and the one consumer carried its own retry for the two verbs whose return value
     * made the miss detectable at all.
     *
     * The exact key always wins, so a graph holding both `34` and `"34"` is unaffected. The
     * retry is integers only: a float or a hexadecimal id would round-trip through `Number` into
     * a different value than the file carried, and finding an id the file never had is worse
     * than a lookup that missed.
     * @param nodeId - Node identifier
     * @returns Node instance or undefined if not found
     */
    getNode(nodeId: NodeIdType): Node | undefined {
        const exact = this.nodes.get(nodeId);
        if (exact !== undefined) {
            return exact;
        }

        if (typeof nodeId === "string") {
            return INTEGER_ID.test(nodeId) ? this.nodes.get(Number.parseInt(nodeId, 10)) : undefined;
        }

        return Number.isInteger(nodeId) ? this.nodes.get(String(nodeId)) : undefined;
    }

    /**
     * Remove a node AND every edge attached to it.
     *
     * The cascade is what the name says, and it used to be missing: the store side already
     * tombstoned the incident edges, but their render objects survived with their meshes, their
     * place in the layout engine's own lists and a hard reference to the disposed `Node`. Three
     * things followed from that, all of them visible to a reader. The edge kept drawing, because
     * the frame loop walks the engine's list rather than this manager's. The edge became
     * permanently visible and unfilterable, because the mask application forces an edge with no
     * store row visible. And the removed `Node` stayed reachable through `Edge.srcNode`, so
     * disposing it freed the Babylon resources and not the JavaScript retention -- which on a
     * large graph is the removal leak that matters.
     * @param nodeId - Node identifier to remove
     * @returns the ids of the edges that went with it, or null when there was no such node
     */
    removeNodeAndIncidentEdges(nodeId: NodeIdType): readonly EdgeId[] | null {
        // Through `getNode`, so an id printed as text still names a node the file supplied as a
        // number; the collections are then keyed by the id the node actually carries, which is
        // the only one they hold.
        const node = this.getNode(nodeId);
        if (!node) {
            return null;
        }

        // Remove from collections
        this.nodes.delete(node.id);
        this.nodeCache.delete(node.id);

        // The store tombstones the node AND every live incident edge and hands back their indices,
        // which is the incident set the cascade tears down. Edges go BEFORE the node is disposed:
        // an edge reads `srcNode.mesh` and `dstNode.mesh` while tearing itself down.
        const removedEdges = this.detachNodeFromStore(node);

        // Remove from layout engine
        this.layoutEngine?.removeNode(node);

        // Dispose AFTER the layout engine has been told, so the engine is never asked to read a
        // position off a mesh that is already gone.
        node.dispose();

        return removedEdges;
    }

    /**
     * Take a node out of the store and tear down every edge that was attached to it.
     * @param node - the node being removed
     * @returns the ids of the edges that went with it
     */
    private detachNodeFromStore(node: Node): readonly EdgeId[] {
        if (node.index === INVALID_INDEX) {
            return [];
        }

        const removedEdges = this.store.builder.removeNodeByIndex(node.index);
        this.store.touch();
        node.index = INVALID_INDEX;
        if (removedEdges.length === 0) {
            return [];
        }

        const dead = new Set<number>(removedEdges);
        const removedIds: EdgeId[] = [];
        const tornDown = new Set<number>();
        for (const edgeIndex of dead) {
            const edge = this.edgesByIndex[edgeIndex];
            if (edge) {
                removedIds.push(edge.id);
                tornDown.add(edgeIndex);
                this.teardownEdge(edge, edgeIndex);
            }
        }

        if (this.pendingEdges.length === 0) {
            return removedIds;
        }

        // One pass over the pending queue for the WHOLE incident set, not one pass per edge: a
        // node removed during a load can be incident to thousands of edges whose render objects
        // are all still waiting.
        const survivors: PendingEdge[] = [];
        for (const pending of this.pendingEdges) {
            if (dead.has(pending.edgeIndex)) {
                // The store edge is gone, so there is nothing left for a render object to be
                // built FOR. Named in the answer only when no render object already was: an edge
                // is one thing, so it must appear once in the removal event whichever half of this
                // method found it.
                this.forgetPending(pending);
                if (!tornDown.has(pending.edgeIndex)) {
                    removedIds.push(edgeIdOf(pending.edgeId));
                }

                continue;
            }

            survivors.push(pending);
        }

        this.pendingEdges = survivors;
        return removedIds;
    }

    /**
     * Take one render edge out of every structure that holds it, and free its meshes.
     *
     * The store row is NOT released here: this is called both from the node cascade, where the
     * builder has already tombstoned the row, and from `removeEdge`, which releases it itself.
     * @param edge - the edge to tear down
     * @param edgeIndex - the row it occupied, which the caller has in hand
     */
    private teardownEdge(edge: Edge, edgeIndex: number): void {
        this.edges.delete(edge.id);
        this.edgeCache.delete(edge.srcId, edge.dstId, edge);
        this.edgesByIndex[edgeIndex] = undefined;
        edge.index = INVALID_INDEX;

        // Told BEFORE the meshes go, so the engine is never asked to read a position off geometry
        // that is already disposed.
        this.layoutEngine?.removeEdge(edge);

        // This is what frees the edge's arrowheads and label, none of which live in the mesh
        // cache -- see Edge.dispose.
        edge.dispose();
    }

    // Edge operations

    /**
     * Adds a single edge to the graph
     * @param edge - Edge data object
     * @param options - the endpoint expressions and the repeat policy for this call
     */
    addEdge(edge: AdHocData, options?: AddEdgesOptions): void {
        this.addEdges([edge], options);
    }

    /**
     * Add edge records to the graph, resolving their endpoints once for the whole batch.
     *
     * THREE THINGS HAPPEN HERE THAT USED TO HAPPEN ELSEWHERE OR NOT AT ALL.
     *
     * The endpoint spelling is decided once per batch and reported, rather than read from two
     * configured paths whose defaults disagreed with every guide the element ships. A batch whose
     * records answer none of the accepted spellings throws instead of quietly producing a graph
     * with nodes and no edges.
     *
     * A record naming an ordered pair the graph already holds is handed to the repeat policy,
     * which by default KEEPS it as a second edge. It used to be dropped before the store could
     * see it, which is why `statistics().repeatedEdgeCount` has always been zero.
     *
     * A record whose endpoint ids graph-format will not store is REJECTED and counted, rather than
     * becoming a render object with no store row -- which is how an edge ended up permanently
     * visible and unfilterable.
     * @param edges - Array of edge data objects
     * @param options - the endpoint expressions and the repeat policy for this call
     * @throws A `GraphtyError` with `E_EDGE_ENDPOINTS_UNRESOLVED` when no spelling answers, and
     *     with `E_DUPLICATE_EDGE` under the `"error"` repeat policy.
     */
    addEdges(edges: Record<string | number, unknown>[], options?: AddEdgesOptions): void {
        this.logger.debug("Adding edges", { count: edges.length });

        const { knownFields } = this.styles.config.data;
        const endpoints = this.endpointsFor(edges, options);
        const policy = options?.repeated ?? knownFields.repeatedEdges;
        const recordIdPath = knownFields.edgeIdPath;
        const weightPath = knownFields.edgeWeightPath;
        const tally = this.loadTally ?? newImportTally();
        let legacyWeights = 0;

        for (const edge of edges) {
            tally.edgeRecords++;
            const srcNodeId = readEndpoint(edge, endpoints.source) as NodeIdType;
            const dstNodeId = readEndpoint(edge, endpoints.target) as NodeIdType;

            const weight = resolveEdgeWeight(edge, weightPath);
            if (weight.source === "legacy") {
                legacyWeights++;
            }

            if (weight.source !== "default") {
                tally.weightsResolvedFrom = weight.source;
                tally.weightsAttribute = weight.source === "legacy" ? "value" : weightPath;
            }

            const recordId = recordIdPath === null ? undefined : readEndpoint(edge, recordIdPath);
            const known = this.knownEdgeFor(srcNodeId, dstNodeId, recordId);
            if (known !== null) {
                tally.repeatedSeen++;
                if (this.mergeRepeat(known, edge, weight.weight, policy, srcNodeId, dstNodeId, tally)) {
                    continue;
                }
            }

            // The STORE takes the edge now, whether or not the endpoints have render objects:
            // the builder creates a missing endpoint itself, so the snapshot is complete while
            // the scene is still catching up.
            const { index: edgeIndex, edgeId } = ingestEdge(this.store, srcNodeId, dstNodeId, weight.weight);
            if (edgeIndex === INVALID_INDEX) {
                // graph-format will not hold an edge between these ids -- most often because the
                // record does not answer the endpoint expressions at all, so both came back null.
                // It gets no row, no counter and no render object, which is what makes "every Edge
                // has a store row" an invariant everything downstream can rely on.
                tally.rejected++;
                continue;
            }

            if (isStorableRecordId(recordId)) {
                this.edgesByRecordId.set(recordId, edgeIndex);
            }

            // Check if both nodes exist before creating the RENDER object, which reads them
            const srcNode = this.nodeCache.get(srcNodeId);
            const dstNode = this.nodeCache.get(dstNodeId);

            if (!srcNode || !dstNode) {
                // Defer the render object until the nodes exist
                const pending: PendingEdge = {
                    record: edge,
                    sourceId: srcNodeId,
                    targetId: dstNodeId,
                    edgeIndex,
                    edgeId,
                };
                this.pendingEdges.push(pending);
                this.rememberPending(pending);
                continue;
            }

            const opts = {};
            if (!this.graphContext) {
                throw new Error("GraphContext not set. Call setGraphContext before adding edges.");
            }

            const e = new Edge(
                this.graphContext,
                srcNodeId,
                dstNodeId,
                edgeId,
                bootstrapEdgePaint(),
                edge as AdHocData,
                opts,
            );
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

        if (this.loadTally === null) {
            // A push of records rather than a file, so there is no enclosing load to seal the
            // report. Seal one here, or `session.data.lastImport()` would answer about the last
            // FILE for a graph whose edges came from a consumer's own array.
            this.importReport = sealImportReport(tally, {
                format: "records",
                endpoints,
                policy,
                ...this.heldCounts(),
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
     * The endpoint expressions this batch is read with, resolved once per load rather than once
     * per batch when a load is in progress.
     * @param edges - the batch's records
     * @param options - the caller's overrides, if any
     * @returns the expressions
     */
    private endpointsFor(
        edges: readonly Record<string | number, unknown>[],
        options: AddEdgesOptions | undefined,
    ): ResolvedEndpoints {
        if (options?.source !== undefined && options.target !== undefined) {
            return { source: options.source, target: options.target, resolvedFrom: "declared" };
        }

        if (this.loadEndpoints !== null) {
            return this.loadEndpoints;
        }

        const { knownFields } = this.styles.config.data;
        const resolved = resolveEndpoints(edges, {
            source: options?.source ?? knownFields.edgeSrcIdPath,
            target: options?.target ?? knownFields.edgeDstIdPath,
        });

        if (this.loadTally !== null && edges.length > 0) {
            // A load is in progress and this is the first chunk that carried edge records, so this
            // answer is the load's answer from here on.
            this.loadEndpoints = resolved;
        }

        return resolved;
    }

    /**
     * The edge a record repeats, or null when it repeats none.
     * @param sourceId - the source endpoint id
     * @param targetId - the target endpoint id
     * @param recordId - the value of `knownFields.edgeIdPath`, when one is configured
     * @returns the existing edge, or null
     */
    private knownEdgeFor(sourceId: NodeIdType, targetId: NodeIdType, recordId: unknown): ExistingEdge | null {
        if (isStorableRecordId(recordId)) {
            // A record identifier is a stronger statement than a repeated pair: the consumer said
            // these two records are the same edge.
            const edgeIndex = this.edgesByRecordId.get(recordId);
            return edgeIndex === undefined ? null : this.existingAt(edgeIndex);
        }

        // The oldest edge between the pair is the one a merge policy folds into, so that `first`
        // and `last` mean what they say when three records name one pair.
        return this.existingBetween(sourceId, targetId)[0] ?? null;
    }

    /**
     * The edge occupying one store row, whether or not its render object has been built.
     * @param edgeIndex - the row
     * @returns the existing edge, or null when the row is not one this manager holds
     */
    private existingAt(edgeIndex: number): ExistingEdge | null {
        const edge = this.edgesByIndex[edgeIndex];
        if (edge) {
            return { edgeIndex, edge, pending: null };
        }

        // A linear scan, and deliberately so: it is reached only when `edgeIdPath` is configured
        // AND that identifier has been seen before AND the earlier record's endpoints have still
        // not arrived. The pending queue is empty in every load that supplies nodes before edges.
        const pending = this.pendingEdges.find((entry) => entry.edgeIndex === edgeIndex);
        return pending ? { edgeIndex, edge: null, pending } : null;
    }

    /**
     * Apply the repeat policy to one record that names an edge the graph already holds.
     * @param known - the edge already present
     * @param record - the repeating record
     * @param weight - the repeating record's resolved weight
     * @param policy - what to do about it
     * @param sourceId - the source endpoint id, for the error message
     * @param targetId - the target endpoint id, for the error message
     * @param tally - the load's counters
     * @returns true when the repeat has been dealt with and must not become an edge of its own
     * @throws A `GraphtyError` with `E_DUPLICATE_EDGE` under the `"error"` policy.
     */
    private mergeRepeat(
        known: ExistingEdge,
        record: Record<string | number, unknown>,
        weight: number,
        policy: DuplicatePolicy,
        sourceId: NodeIdType,
        targetId: NodeIdType,
        tally: ImportTally,
    ): boolean {
        if (policy === "keep") {
            tally.repeatedKept++;
            return false;
        }

        if (policy === "error") {
            throw new GraphtyError({
                code: "E_DUPLICATE_EDGE",
                source: "data",
                message:
                    `Two edges run from ${JSON.stringify(sourceId)} to ${JSON.stringify(targetId)}, and ` +
                    `data.knownFields.repeatedEdges is "error". Set it to "keep" to hold both, or to ` +
                    `"first", "last", "sum", "min" or "max" to fold them into one.`,
                details: { source: sourceId, target: targetId, existing: known.edgeIndex, repeat: record },
            });
        }

        if (policy === "first") {
            tally.repeatedDropped++;
            return true;
        }

        const survivorWeight = this.store.builder.edgeWeight(known.edgeIndex);
        const merged = mergeWeights(policy, survivorWeight, weight);
        this.store.builder.setEdgeWeight(known.edgeIndex, merged);
        this.store.touch();

        if (policy === "last") {
            // "the repeat's weight and attributes replace the existing edge's". The other three
            // reducers keep the survivor's attributes, because there is no reading of `sum` under
            // which the last record's colour is the group's colour.
            if (known.edge) {
                known.edge.data = record as AdHocData;
            } else if (known.pending) {
                known.pending.record = record;
            }
        }

        tally.repeatedMerged++;
        return true;
    }

    /**
     * Gets an edge by its ID
     * @param edgeId - Edge identifier
     * @returns Edge instance or undefined if not found
     */
    getEdge(edgeId: string): Edge | undefined {
        return this.edges.get(edgeId);
    }

    /**
     * Every edge running from one node to another.
     *
     * Plural because "the edge between a and b" stopped being a single thing the moment parallel
     * edges became representable.
     * @param srcNodeId - Source node identifier
     * @param dstNodeId - Destination node identifier
     * @returns the edges, oldest first; empty when there are none
     */
    getEdgesBetween(srcNodeId: NodeIdType, dstNodeId: NodeIdType): readonly Edge[] {
        return this.edgeCache.get(srcNodeId, dstNodeId);
    }

    /**
     * Removes an edge from the graph
     * @param edgeId - Edge identifier to remove
     * @returns True if the edge was removed, false if not found
     */
    removeEdge(edgeId: string): boolean {
        const edge = this.edges.get(edgeId);
        if (!edge) {
            return false;
        }

        const { index } = edge;
        if (index !== INVALID_INDEX) {
            this.store.builder.removeEdge(index);
            this.store.touch();
        }

        this.teardownEdge(edge, index);
        return true;
    }

    // Data source operations

    /**
     * Adopt the direction a file declared, and say out loud when the element could not.
     *
     * The element reports the direction its DATA declares, so that a file which says it is
     * undirected is not counted, measured or offered algorithms as though it were a digraph. What
     * it must never do is overrule the consumer: `data.directed` set to a boolean settles the
     * question and locks the builder, and this reports that rather than fighting it.
     * @param type - the data source type, for the log line
     * @param declaration - what the file said, or null when it said nothing
     * @returns true once the question is settled and need not be asked again this import; false
     *     while the source has still declared nothing
     */
    private applyDeclaredDirection(type: string, declaration: DeclaredDirection | null): boolean {
        if (declaration === null) {
            return false;
        }

        const outcome: DirectionOutcome = ingestDeclaredDirection(this.store, declaration.directed, declaration.statedBy);
        if (outcome === "config-wins") {
            this.logger.info("File declares a direction the configuration has already settled", {
                type,
                fileDeclares: declaration.directed,
                statedBy: declaration.statedBy,
                configuredDirected: this.store.builder.directed,
            });
        } else if (outcome === "edges-present") {
            // Not a warning a consumer can act on by changing their configuration: it means this
            // file arrived into a graph that already had edges, and the direction of a graph that
            // already holds edges is not something graph-format will reinterpret in place.
            this.logger.warn("File declares a direction the graph has already been built with", {
                type,
                fileDeclares: declaration.directed,
                statedBy: declaration.statedBy,
                graphDirected: this.store.builder.directed,
            });
        }

        // Logged even when the declaration was adopted, and especially then: the file described a
        // graph the element cannot hold, and these are the edges whose own direction it overrode.
        if (declaration.conflictingEdges > 0) {
            this.logger.warn("File mixes directed and undirected edges; the graph holds one direction", {
                type,
                directed: declaration.directed,
                statedBy: declaration.statedBy,
                overriddenEdges: declaration.conflictingEdges,
            });
        }

        return true;
    }

    /**
     * Loads data from a registered data source
     * @param type - Data source type identifier
     * @param opts - Options to pass to the data source
     */
    async addDataFromSource(type: string, opts: object = {}): Promise<void> {
        this.logger.info("Loading data source", { type, options: opts });

        const startTime = Date.now();
        let nodeRecordsLoaded = 0;
        let edgeRecordsLoaded = 0;
        let chunksProcessed = 0;

        // One tally and one endpoint decision for the WHOLE load, however many chunks it arrives
        // in. Cleared in the `finally` below so a failed load cannot leave the next one counting
        // into it, or reading its endpoint answer.
        const tally = newImportTally();
        this.loadTally = tally;
        this.loadEndpoints = null;

        const named = opts as { edgeSource?: unknown; edgeTarget?: unknown };
        const endpointOverrides: AddEdgesOptions = {
            ...(typeof named.edgeSource === "string" ? { source: named.edgeSource } : {}),
            ...(typeof named.edgeTarget === "string" ? { target: named.edgeTarget } : {}),
        };

        try {
            const source = DataSource.get(type, opts);
            if (!source) {
                throw unknownFormat(type);
            }

            // Get file size for progress tracking (if available)
            const fileSize = (opts as { size?: number }).size;

            try {
                // Whether the file's own direction has been dealt with, so the work and the log
                // line happen once per import rather than once per chunk.
                let directionSettled = false;

                for await (const chunk of source.getData()) {
                    // BEFORE this chunk's edges, every time: the builder accepts a direction only
                    // while it holds none. Read per chunk rather than once before the loop because
                    // a source parses nothing until its first chunk is pulled, so before the loop
                    // every source declares null.
                    if (!directionSettled) {
                        directionSettled = this.applyDeclaredDirection(type, source.declaredDirection);
                    }

                    this.addNodes(chunk.nodes);
                    // The endpoint names a caller passed to the SOURCE are honoured here rather
                    // than inside each of the seven importers: whatever shape a source produces,
                    // the consumer who named the columns named them for the records that come out.
                    this.addEdges(chunk.edges, endpointOverrides);

                    nodeRecordsLoaded += chunk.nodes.length;
                    edgeRecordsLoaded += chunk.edges.length;
                    chunksProcessed++;

                    // Emit progress event
                    if (this.graphContext) {
                        this.eventManager.emitDataLoadingProgress(
                            type,
                            chunksProcessed * 64 * 1024, // Approximate bytes (chunk size)
                            fileSize,
                            nodeRecordsLoaded,
                            edgeRecordsLoaded,
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

                // The number a consumer is told is the number of edges the graph HOLDS, which is
                // what `edgesLoaded` has always claimed to be and never was: it counted records
                // handed over, so it reported 254 for a file that produced zero edges. The old
                // meaning survives, under its true name, as `report.counts.edgeRecords`.
                const report = this.sealLoad(type, tally);
                const edgesHeld = report.counts.edges;
                const nodesHeld = report.counts.nodes;

                this.logger.info("Data source loading complete", {
                    nodeRecords: nodeRecordsLoaded,
                    nodesLoaded: nodesHeld,
                    edgeRecords: edgeRecordsLoaded,
                    edgesLoaded: edgesHeld,
                    endpointsResolvedFrom: report.endpoints.resolvedFrom,
                    duration,
                    chunks: chunksProcessed,
                    errors: errorCount,
                });

                if (this.graphContext) {
                    this.eventManager.emitDataLoadingComplete(
                        type,
                        nodesHeld,
                        edgesHeld,
                        duration,
                        errorCount,
                        0, // warnings
                        true,
                        report,
                    );
                }

                // Keep existing data-loaded event for backward compatibility
                if (this.graphContext) {
                    this.eventManager.emitGraphDataLoaded(this.graphContext, chunksProcessed, type, report);
                }
            } catch (error) {
                // Log the error
                this.logger.error(
                    "Data source loading failed",
                    error instanceof Error ? error : new Error(String(error)),
                    {
                        type,
                        chunksProcessed,
                        nodeRecordsLoaded,
                        edgeRecordsLoaded,
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

                // A coded failure travels out UNCHANGED. Wrapping it in a plain Error destroyed
                // the `code` a caller switches on, so `await graph.addDataFromSource(...)` was
                // the one route where a reader's parse failure arrived as an unclassifiable
                // string while the same failure on the event channel arrived as E_PARSE_FAILED.
                if (isGraphtyError(error)) {
                    throw error;
                }

                throw new Error(
                    `Failed to load data from source '${type}' after ${chunksProcessed} chunks: ${error instanceof Error ? error.message : String(error)}`,
                );
            }
        } catch (error) {
            // Same rule one level out: a coded failure is the answer, not something to re-word.
            if (isGraphtyError(error)) {
                throw error;
            }

            // Re-throw if already a processed error
            if (error instanceof Error && error.message.includes("Failed to load data")) {
                throw error;
            }

            // Otherwise wrap and throw
            throw new Error(
                `Error initializing data source '${type}': ${error instanceof Error ? error.message : String(error)}`,
            );
        } finally {
            // Whatever happened, this load is over: the next one probes for itself and counts into
            // its own tally.
            this.loadTally = null;
            this.loadEndpoints = null;
        }
    }

    /**
     * Freeze one load's counters into the report a consumer reads, and keep it for `lastImport`.
     * @param format - the data source that read the file
     * @param tally - what the load counted
     * @returns the report
     */
    private sealLoad(format: string, tally: ImportTally): ImportReport {
        const endpoints = this.loadEndpoints ?? {
            // A file with no edge records at all: nothing was probed, so nothing was decided, and
            // saying "source/target" would be reporting a decision that was never made.
            source: this.styles.config.data.knownFields.edgeSrcIdPath ?? "source",
            target: this.styles.config.data.knownFields.edgeDstIdPath ?? "target",
            resolvedFrom: "source/target" as const,
        };

        const report = sealImportReport(tally, {
            format,
            endpoints,
            policy: this.styles.config.data.knownFields.repeatedEdges,
            ...this.heldCounts(),
        });
        this.importReport = report;
        return report;
    }

    /**
     * What the graph HOLDS right now, as the report and the session's own counts both mean it.
     *
     * Read off the builder rather than off this manager's render maps, and that is the whole
     * point: an edge endpoint the file never declared as a node is created by the builder, so it
     * is in the graph and in `session.status.counts.nodes` while having no render `Node` and so no
     * entry in `nodes`. Counting the render objects made the report say two nodes for a load the
     * session reported three for -- one load, two numbers, disagreeing, which is the defect this
     * report exists to end rather than to repeat one level down.
     * @returns the node and edge counts the graph holds
     */
    private heldCounts(): { nodes: number; edges: number } {
        return { nodes: this.store.builder.nodeCount, edges: this.store.builder.edgeCount };
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

        // The dataset boundary, announced BEFORE the store goes: clearing freezes no replacement,
        // so `snapshot-replaced` never fires and a holder of per-snapshot resources -- an
        // accelerator's device buffers, which no garbage collector can reach -- would keep them for
        // a graph that no longer exists. Emitted while the outgoing store still answers, because a
        // listener releasing a snapshot may need a derived view of it that only that store has.
        this.eventManager.emitSnapshotDropped();

        // Drop the graph data itself, not only the render objects built from it.
        this.resetStore();

        // The report described a graph that no longer exists.
        this.importReport = null;

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
