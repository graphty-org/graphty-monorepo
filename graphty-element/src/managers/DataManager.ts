import { type DerivedGraph, type GraphSnapshot, INVALID_INDEX, type U32 } from "@graphty/graph-format";

import type { EdgeId } from "../catalog/types";
import type { AdHocData } from "../config";
import { edgeCounterOf } from "../data/edgeIdentity";
import { GraphStore } from "../data/GraphStore";
import { readonlyPositions, WRITABLE_LANE } from "../data/lane";
import type { ElementPositions } from "../data/positions";
import type { ImportReport } from "../data/report";
import { adoptEdgeRecord, Edge, EdgeMap, placeEdgeRow, type ReadonlyEdgeMap } from "../Edge";
import { GraphtyError } from "../errors/GraphtyError";
import { type LayoutEngine, layoutEngineInternals } from "../layout/LayoutEngine";
import { MeshCache } from "../meshes/MeshCache";
import { adoptNodeRecord, Node, NodeIdType, placeNodeRow } from "../Node";
import { legacyScopeOf } from "../session/commands/algo";
import { type DataMutation, replaceEdgesCommand } from "../session/commands/data";
import type { LaneStore } from "../session/GraphSession";
import type { Dispatcher, UndoableContext } from "../session/project/Dispatcher";
import { GraphOps, type GraphWriter } from "../session/project/graphOps";
import { type AddEdgesOptions, Ingest, type IngestHost, type StoredEdge } from "../session/project/ingest";
import type { GraphSlice } from "../session/project/state";
import { readonlyMapView } from "../session/sealed";
import type { DirectionProvenance, HistoryCause, ReadonlyElementPositions } from "../session/types";
import type { Styles } from "../Styles";
import type { EventManager } from "./EventManager";
import type { GraphContext } from "./GraphContext";
import type { Manager } from "./interfaces";
import { bootstrapEdgePaint, bootstrapNodePaint } from "./StylePainter";

/** The graph value a plugin algorithm's graph-level results are kept under. */
const GRAPH_RESULTS = "graphResults";

/** An id that is an integer written as text, and so has a second spelling worth retrying. */
const INTEGER_ID = /^-?\d+$/;

export type { AddEdgesOptions } from "../session/project/ingest";

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
 * A data manager as its own session reads it: every store member, with the writable lane under
 * `positions`, which the session's dispatcher writes when it places, pins or restores nodes. No
 * entry point exports it; the manager's own `positions` is read-only.
 * @param manager - The data manager.
 * @returns The store the session is handed.
 */
export function laneStoreOf(manager: DataManager): LaneStore {
    return {
        getSnapshot: () => manager.getSnapshot(),
        undirected: (snapshot) => manager.undirected(snapshot),
        get positions() {
            return manager[WRITABLE_LANE];
        },
        get seededNodeCount() {
            return manager.seededNodeCount;
        },
        get directionSettledBy() {
            return manager.directionSettledBy;
        },
        get lastImport() {
            return manager.lastImport;
        },
    };
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
 * A standalone renderer test's reach into a data manager's collections: registering a render
 * object it built by hand, as ingest would have. No entry point exports it; the collections are
 * read-only to everything else, and nodes and edges arrive through the data doors.
 */
export const dataManagerInternals = {} as {
    /** Register a node under its id. */
    adoptNode(manager: DataManager, node: Node): void;
    /** Register an edge under its id, its endpoint pair and, when it has one, its row. */
    adoptEdge(manager: DataManager, edge: Edge): void;
};

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
    // Node and edge collections: written only here, as commands add, remove and renumber rows.
    private readonly nodeMap = new Map<string | number, Node>();
    private readonly edgeMap = new Map<string, Edge>();
    private readonly edgePairs = new EdgeMap();
    private readonly edgeRows: (Edge | undefined)[] = [];

    static {
        dataManagerInternals.adoptNode = (manager, node) => {
            manager.nodeMap.set(node.id, node);
        };
        dataManagerInternals.adoptEdge = (manager, edge) => {
            manager.edgeMap.set(edge.id, edge);
            manager.edgePairs.set(edge.srcId, edge.dstId, edge);
            if (edge.index !== INVALID_INDEX) {
                manager.edgeRows[edge.index] = edge;
            }
        };
    }

    /**
     * Every node the graph holds, keyed by id. Read-only: nodes arrive and leave through the data
     * doors, which are undoable steps.
     * @returns The nodes.
     */
    get nodes(): ReadonlyMap<string | number, Node> {
        return this.nodeView;
    }

    /** {@link DataManager.nodes}: the node map with no writer. */
    private readonly nodeView = readonlyMapView(this.nodeMap);

    /**
     * Every edge the graph holds, keyed by `Edge.id`.
     *
     * The key type is `string` and not `string | number`, because `Edge.id` is the element's own
     * edge counter printed as a string and nothing else. While the key was widened, `getEdge(0)`
     * compiled, answered `undefined` for the edge whose id is `"0"`, and said nothing about it.
     * @returns The edges.
     */
    get edges(): ReadonlyMap<string, Edge> {
        return this.edgeView;
    }

    /** {@link DataManager.edges}: the edge map with no writer. */
    private readonly edgeView = readonlyMapView(this.edgeMap);

    /** Goes up on every edge added or removed, so a cache over the edge set knows it is stale. */
    edgeVersion = 0;
    nodeCache = new Map<NodeIdType, Node>();

    /**
     * The edges between each ordered pair of nodes, read-only.
     * @returns The edges by endpoint pair.
     */
    get edgeCache(): ReadonlyEdgeMap {
        return this.edgePairView;
    }

    /** {@link DataManager.edgeCache}: the pair index with no writer, handing out copies of its lists. */
    private readonly edgePairView: ReadonlyEdgeMap = ((pairs: EdgeMap) =>
        Object.freeze({
            has: (srcId: NodeIdType, dstId: NodeIdType) => pairs.has(srcId, dstId),
            get: (srcId: NodeIdType, dstId: NodeIdType) => pairs.get(srcId, dstId).slice(),
            first: (srcId: NodeIdType, dstId: NodeIdType) => pairs.first(srcId, dstId),
            get size() {
                return pairs.size;
            },
        }))(this.edgePairs);

    /**
     * Render objects by their store edge index, so a freeze report's `edgeRemap` -- and a removal,
     * which hands back the incident edge indices and nothing else -- can find them in O(1). Sparse:
     * an index with no render object yet, or whose edge was removed, reads `undefined`.
     * @returns The edges by row, read-only.
     */
    get edgesByIndex(): readonly (Edge | undefined)[] {
        return this.edgeRows;
    }

    /** The one graph-format builder and its cached snapshot; replaced only by `clear()`/`dispose()`. */
    private store: GraphStore;

    /**
     * Graph-level results a plugin algorithm without a descriptor wrote, kept as the `graphResults`
     * value of the graph. Read-only, except to a plugin while `algo.legacy` runs it: what it writes
     * then is part of that command's step.
     * @returns The value, or undefined when none was written.
     */
    get graphResults(): AdHocData | undefined {
        const { values } = this.graph.slice;
        const scope = legacyScopeOf(this.dispatcher);
        return (scope === undefined ? values.get(GRAPH_RESULTS) : scope.graph(values)[GRAPH_RESULTS]) as
            | AdHocData
            | undefined;
    }

    /**
     * Write graph-level results; only a plugin can, while `algo.legacy` runs it.
     * @param value - The results.
     * @throws A `GraphtyError` with `E_UNSUPPORTED` outside a plugin run.
     */
    set graphResults(value: AdHocData | undefined) {
        const scope = legacyScopeOf(this.dispatcher);
        if (scope === undefined) {
            throw new GraphtyError({
                code: "E_UNSUPPORTED",
                message:
                    "graphResults is written by a plugin algorithm while graph.runAlgorithm runs it, so the write is " +
                    "part of that step; it cannot be written from anywhere else.",
                source: "data",
            });
        }

        scope.graph(this.graph.slice.values)[GRAPH_RESULTS] = value;
    }

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

    /** Turns records and data sources into the graph; this manager draws what it produces. */
    private readonly ingest: Ingest<ExistingEdge> = new Ingest(this.ingestHost());

    /**
     * The graph primitives every write goes through. A data manager on its own has nothing to
     * record into; the graph's session hands it its own in {@link DataManager.bindSession}.
     */
    private graph: GraphOps = GraphOps.standalone();

    /** The session's dispatcher, once bound: the data doors dispatch through it. */
    private dispatcher: Dispatcher | null = null;

    /** The edges the last removal took out, for the doors that answer with them. */
    private removedEdges: readonly EdgeId[] = [];

    /** Why rows are arriving: set while a dispatched command writes, for the `data-added` event. */
    private cause: HistoryCause | undefined = undefined;

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
     *
     * Read-only here: a write would move nodes with no step. The element's own engines reach the
     * writable lane through `writableLane`; a consumer places nodes through
     * `session.positions.set`.
     * @returns the coordinates, read-only
     */
    get positions(): ReadonlyElementPositions {
        return this.readonlyLane;
    }

    /** The coordinates, read-only; reads whichever lane the store holds now. */
    private readonly readonlyLane = readonlyPositions(() => this.store.positions);

    /**
     * The writable lane, for the element's own engines and nodes. See `writableLane`.
     * @returns the live position array
     */
    get [WRITABLE_LANE](): ElementPositions {
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
        return (this.graph.slice.values.get("importReport") as ImportReport | undefined) ?? null;
    }

    /**
     * Write through the session from here on: the data doors dispatch `data.apply` and
     * `data.import`, and the session carries both out through this manager's ingest, over this
     * manager's store.
     * @param dispatcher - The session's dispatcher.
     * @param hooks - What the graph does around a write.
     * @param hooks.rowsAdded - Called by each command that adds rows, after it wrote them, with how
     *     that command starts work as its deferred members.
     * @param hooks.loading - Called with true when an import starts reading and false when it stops.
     * @param hooks.removing - Called with the nodes and edges a removal names, before it writes.
     */
    bindSession(
        dispatcher: Dispatcher,
        hooks: {
            rowsAdded(after: UndoableContext["after"] | undefined): void;
            loading(active: boolean): void;
            removing(nodes: readonly NodeIdType[], edges: readonly EdgeId[]): void;
        },
    ): void {
        this.dispatcher = dispatcher;
        this.graph = dispatcher.graph;
        dispatcher.services.data = {
            apply: (mutation, draft, after) => {
                if (mutation.kind === "remove-nodes") {
                    hooks.removing(mutation.ids, []);
                } else if (mutation.kind === "remove-edges") {
                    hooks.removing([], mutation.ids);
                }

                this.applyMutation(mutation, this.graph.writer(draft, this.store));
                if (mutation.kind === "add-nodes" || mutation.kind === "add-edges") {
                    hooks.rowsAdded(after);
                }
            },
            values: (values, draft) => {
                this.graph.writer(draft, this.store).setGraphValues(values);
            },
            import: async (command, draft, signal, after) => {
                const writer = this.graph.writer(draft, this.store);
                const { cause } = this;
                this.cause = "command";
                hooks.loading(true);
                try {
                    await this.ingest.importSource(command, writer, signal);
                } finally {
                    this.cause = cause;
                    hooks.loading(false);
                }

                if (command.source.type !== undefined && command.source.config !== undefined) {
                    hooks.rowsAdded(after);
                }
            },
        };
    }

    /**
     * Carry out one mutation through ingest, drawing what it adds as it goes.
     * @param mutation - The mutation.
     * @param writer - The command's writer.
     */
    private applyMutation(mutation: DataMutation, writer: GraphWriter): void {
        const { cause } = this;
        this.cause = "command";
        try {
            this.ingest.apply(mutation, writer, (target, id) => this.resolveId(target, id));
        } finally {
            this.cause = cause;
        }
    }

    /**
     * The id a node is held under, for an id that may be spelled as the other type (see
     * {@link DataManager.getNode}); an edge id is taken as it is.
     * @param target - Node or edge.
     * @param id - The id as given.
     * @returns The id the graph holds it under, or the one given when it holds none.
     */
    private resolveId(target: "node" | "edge", id: NodeIdType): NodeIdType {
        return target === "node" ? (this.getNode(id)?.id ?? id) : id;
    }

    /**
     * Bring the render objects in line with the `graph` slice: what the derivation lane's `graph`
     * hook runs, forward and on undo, redo and rollback alike. A node or edge the slice holds and
     * nothing draws is built; one drawn that the slice no longer holds is torn down; one whose
     * record changed is handed the new record. Forward adds were drawn as they were ingested, so
     * for them this finds nothing to build.
     * @param slice - The slice to draw.
     * @param dirty - The slice's keys changed since the last pass.
     * @param cause - What moved the state, for the events.
     * @returns How many rows were built and torn down.
     */
    reconcile(slice: GraphSlice, dirty: ReadonlySet<string>, cause: HistoryCause): { added: number; removed: number } {
        const removedNodes: NodeIdType[] = [];
        const removedEdges: EdgeId[] = [];
        let addedNodes = 0;
        let addedEdges = 0;
        const edgeKeys: EdgeId[] = [];
        const doomed = new Set<NodeIdType>();
        for (const key of dirty) {
            if (key.startsWith("e:")) {
                edgeKeys.push(key.slice(2));
            } else if (key.startsWith("n:")) {
                const id = JSON.parse(key.slice(2)) as NodeIdType;
                const record = slice.nodes.get(id);
                const node = this.nodes.get(id);
                if (record === undefined && node !== undefined) {
                    doomed.add(node.id);
                } else if (record !== undefined && node === undefined) {
                    this.buildNode(id, record as Record<string, unknown>, this.store.builder.indexOf(id));
                    addedNodes++;
                } else if (record !== undefined && node !== undefined) {
                    adoptNodeRecord(node, record as AdHocData<string | number>);
                }
            }
        }

        // Torn down together: one pass over the edges for all of them, not one per node, and the
        // nodes in the order they were built, which is the order the scene holds their meshes in.
        if (doomed.size > 0) {
            removedEdges.push(...this.dropRenderNodes(doomed));
            removedNodes.push(...doomed);
        }

        // Edges after nodes: an edge is built only once both its endpoints are drawn.
        for (const id of edgeKeys) {
            const record = slice.edges.get(id);
            const edge = this.edges.get(id);
            const counter = edgeCounterOf(id);
            const pending = this.pendingEdges.find((entry) => entry.edgeId === counter);
            if (record === undefined) {
                if (edge !== undefined) {
                    this.teardownEdge(edge, edge.index);
                    removedEdges.push(id);
                } else if (pending !== undefined) {
                    this.forgetPending(pending);
                    this.pendingEdges.splice(this.pendingEdges.indexOf(pending), 1);
                    removedEdges.push(id);
                }
            } else if (edge !== undefined) {
                adoptEdgeRecord(edge, record as AdHocData);
            } else if (pending !== undefined) {
                pending.record = record as Record<string, unknown>;
            } else {
                const row = this.store.edgeIndexOf(counter);
                if (row !== INVALID_INDEX) {
                    const [source, target] = this.store.builder.edgeEndpoints(row);
                    this.buildEdge({
                        record: record as Record<string, unknown>,
                        sourceId: this.store.builder.idOf(source),
                        targetId: this.store.builder.idOf(target),
                        edgeIndex: row,
                        edgeId: counter,
                    });
                    addedEdges++;
                }
            }
        }

        if (addedNodes > 0) {
            this.processPendingEdges();
            this.eventManager.emitDataAdded("nodes", addedNodes, false, false, cause);
        }

        if (addedEdges > 0) {
            this.eventManager.emitDataAdded("edges", addedEdges, false, false, cause);
        }

        if (removedNodes.length > 0 || removedEdges.length > 0) {
            this.eventManager.emitElementsRemoved(removedNodes, removedEdges, cause);
        }

        return { added: addedNodes + addedEdges, removed: removedNodes.length + removedEdges.length };
    }

    /**
     * Tear down nodes' render objects and every render edge attached to one of them, leaving the
     * store alone: the store already reflects the state being drawn.
     * @param ids - The nodes.
     * @returns The ids of the edges torn down with them.
     */
    private dropRenderNodes(ids: ReadonlySet<NodeIdType>): EdgeId[] {
        const removed: EdgeId[] = [];
        for (const edge of [...this.edges.values()]) {
            if (ids.has(edge.srcId) || ids.has(edge.dstId)) {
                this.teardownEdge(edge, edge.index);
                removed.push(edge.id);
            }
        }

        for (const node of [...this.nodes.values()]) {
            if (ids.has(node.id)) {
                this.disposeRenderNode(node);
            }
        }

        return removed;
    }

    /**
     * Tear down what draws rows a forward removal took out of the store: the edges first, since an
     * edge reads its endpoints' meshes while it goes, then the nodes. One `elements-removed`.
     * @param nodes - The node ids removed.
     * @param edges - The edge ids removed, including every edge attached to a removed node.
     */
    private dropRendered(nodes: readonly NodeIdType[], edges: readonly EdgeId[]): void {
        for (const id of edges) {
            const edge = this.edges.get(id);
            if (edge !== undefined) {
                this.teardownEdge(edge, edge.index);
                continue;
            }

            const counter = edgeCounterOf(id);
            const pending = this.pendingEdges.findIndex((entry) => entry.edgeId === counter);
            if (pending !== -1) {
                this.forgetPending(this.pendingEdges[pending]);
                this.pendingEdges.splice(pending, 1);
            }
        }

        for (const id of nodes) {
            const node = this.nodes.get(id);
            if (node !== undefined) {
                this.disposeRenderNode(node);
            }
        }

        this.removedEdges = edges;
        if (nodes.length > 0 || edges.length > 0) {
            this.eventManager.emitElementsRemoved([...nodes], [...edges], this.cause);
        }
    }

    /** Tear down every render object: the graph was emptied. */
    private dropEverythingRendered(): void {
        // The dataset boundary. The empty graph is frozen lazily, so no `snapshot-replaced` would
        // name the snapshot on screen until something read the graph, and a holder of per-snapshot
        // resources -- an accelerator's device buffers, which no garbage collector can reach --
        // would keep them for a graph that no longer exists. The store then forgets it, so the
        // next freeze does not name it a second time.
        this.eventManager.emitSnapshotDropped();
        this.store.forgetSnapshot();

        // The layout lets go of them too, as it does of a node removed one at a time: an engine
        // still holding the old nodes would lay out a graph that no longer exists and write their
        // old rows into the position array, growing it under the snapshot it is lent to.
        for (const edge of this.edges.values()) {
            if (this.layoutEngine) {
            layoutEngineInternals.removeEdge(this.layoutEngine, edge);
        }
        }

        for (const node of this.nodes.values()) {
            placeNodeRow(node, INVALID_INDEX);
            if (this.layoutEngine) {
            layoutEngineInternals.removeNode(this.layoutEngine, node);
        }
        }

        // Free the per-node and per-edge Babylon resources BEFORE dropping the references to
        // them. See disposeNodesAndEdges: meshCache.clear() below only reaches CACHED meshes,
        // and arrowheads, patterned lines and labels are not cached.
        this.disposeNodesAndEdges();
        this.nodeMap.clear();
        this.edgeMap.clear();
        this.edgeVersion++;
        this.nodeCache.clear();
        this.edgePairs.clear();
        this.edgeRows.length = 0;
        this.pendingEdges = [];
        this.pendingByPair.clear();
        this.meshCache.clear();
    }

    /**
     * Take one node's render object out of every structure that holds it and free it. Its edges
     * must already be gone.
     * @param node - The node.
     */
    private disposeRenderNode(node: Node): void {
        this.nodeMap.delete(node.id);
        this.nodeCache.delete(node.id);
        placeNodeRow(node, INVALID_INDEX);
        if (this.layoutEngine) {
            layoutEngineInternals.removeNode(this.layoutEngine, node);
        }
        node.dispose();
    }

    /**
     * What ingest needs from the render half: which edges exist (built or pending), and what to
     * do with each record once the store holds it.
     * @returns the host, reading this manager's fields lazily
     */
    private ingestHost(): IngestHost<ExistingEdge> {
        return {
            store: () => this.store,
            dataConfig: () => this.styles.config.data,
            hasNode: (id) => this.nodeCache.has(id),
            nodeCount: () => this.nodes.size,
            edgesBetween: (sourceId, targetId) => this.existingBetween(sourceId, targetId),
            edgeAt: (edgeIndex) => this.existingAt(edgeIndex),
            replaceEdgeRecord: (known, record) => {
                if (known.edge) {
                    adoptEdgeRecord(known.edge, record as AdHocData);
                } else if (known.pending) {
                    known.pending.record = record;
                }
            },
            rowsRemoved: (nodes, edges) => {
                this.dropRendered(nodes, edges);
            },
            cleared: () => {
                this.dropEverythingRendered();
            },
            nodeStored: (id, record, index) => {
                this.buildNode(id, record, index);
            },
            edgeStored: (edge) => {
                this.buildEdge(edge);
            },
            nodesArrived: (count) => {
                // Request layout start and zoom to fit
                this.shouldStartLayout = true;
                this.shouldZoomToFit = true;

                // Process any pending edges whose nodes now exist
                this.processPendingEdges();

                // Emit event to notify graph that data has been added
                this.eventManager.emitDataAdded("nodes", count, true, true, this.cause);
            },
            edgesArrived: (count) => {
                this.shouldStartLayout = true;
                this.eventManager.emitDataAdded("edges", count, true, false, this.cause);
            },
            loadProgress: (progress) => {
                if (this.graphContext) {
                    this.eventManager.emitDataLoadingProgress(
                        progress.format,
                        progress.chunks * 64 * 1024, // Approximate bytes (chunk size)
                        progress.fileSize,
                        progress.nodeRecords,
                        progress.edgeRecords,
                        progress.chunks,
                    );
                }
            },
            loadErrors: (format, errors) => {
                if (this.graphContext) {
                    const summary = errors.getSummary();
                    this.eventManager.emitDataLoadingErrorSummary(
                        format,
                        summary.totalErrors,
                        summary.message,
                        errors.getDetailedReport(),
                        summary.primaryCategory,
                        summary.suggestion,
                    );
                }
            },
            loadComplete: (format, report, progress, duration, errors) => {
                if (this.graphContext) {
                    this.eventManager.emitDataLoadingComplete(
                        format,
                        report.counts.nodes,
                        report.counts.edges,
                        duration,
                        errors,
                        0, // warnings
                        true,
                        report,
                    );
                    // Keep existing data-loaded event for backward compatibility
                    this.eventManager.emitGraphDataLoaded(this.graphContext, progress.chunks, format, report);
                }
            },
            loadFailed: (format, error, progress) => {
                if (this.graphContext) {
                    this.eventManager.emitDataLoadingError(error, "parsing", format, { canContinue: false });
                    // Keep existing error event for backward compatibility
                    this.eventManager.emitGraphError(this.graphContext, error, "data-loading", {
                        chunksLoaded: progress.chunks,
                        dataSourceType: format,
                    });
                }
            },
        };
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
        return new GraphStore({
            // Read again when the graph is emptied, so a clear takes the setting in force then.
            directed: () => this.styles.config.data.directed,
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
            placeNodeRow(node, remap[node.index] ?? INVALID_INDEX);
        }
    }

    /**
     * Re-key {@link edgesByIndex} and every `Edge.index` after a compacting freeze, and drop any
     * pending edge whose store edge died with the freeze.
     * @param remap - the freeze report's edgeRemap: old index -> new index, or INVALID_INDEX
     */
    private walkEdgeRemap(remap: U32): void {
        this.edgeRows.length = 0;
        for (const edge of this.edges.values()) {
            const moved = remap[edge.index] ?? INVALID_INDEX;
            placeEdgeRow(edge, moved);
            if (moved !== INVALID_INDEX) {
                this.edgeRows[moved] = edge;
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
        this.edgeRows.length = 0;
        this.pendingEdges = [];
        this.pendingByPair.clear();
        this.ingest.reset();
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
        this.nodeMap.clear();
        this.edgeMap.clear();
        this.edgeVersion++;
        this.nodeCache.clear();
        this.edgePairs.clear();

        // Drop the graph data itself, not only the render objects built from it.
        this.resetStore();

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
        if (this.dispatcher === null) {
            this.ingest.addNodes(nodes, idPath, this.graph.writer(null, this.store));
            return;
        }

        this.dispatcher.dispatchNow({
            op: "data.apply",
            mutation: { kind: "add-nodes", records: nodes, ...(idPath === undefined ? {} : { idPath }) },
        });
    }

    /**
     * Build the render object for a node the store has just taken.
     * @param nodeId - the node id
     * @param node - the raw record
     * @param index - the row the store gave it; INVALID_INDEX for an id graph-format will not
     *     take, and the node renders anyway. See the class comment.
     */
    private buildNode(nodeId: NodeIdType, node: Record<string | number, unknown>, index: number): void {
        if (!this.graphContext) {
            throw new Error("GraphContext not set. Call setGraphContext before adding nodes.");
        }

        // The element's own defaults, because the row index the session's paint is addressed
        // by is assigned on the line below this one. The first style pass replaces it.
        const n = new Node(this.graphContext, nodeId, bootstrapNodePaint(), node as AdHocData, {
            pinOnDrag: this.graphContext.getConfig().pinOnDrag,
        });
        placeNodeRow(n, index);
        this.nodeCache.set(nodeId, n);
        this.nodeMap.set(nodeId, n);

        // Add to layout engine if it exists
        if (this.layoutEngine) {
            layoutEngineInternals.addNode(this.layoutEngine, n);
        }

        // Emit node added event
        this.eventManager.emitNodeEvent("node-add-before", {
            nodeId,
            metadata: node,
        });
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
                layoutEngineInternals.addEdge(this.layoutEngine, e);
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
        placeEdgeRow(edge, edgeIndex);
        this.edgeRows[edgeIndex] = edge;
        this.edgePairs.set(edge.srcId, edge.dstId, edge);
        this.edgeMap.set(edge.id, edge);
        this.edgeVersion++;
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
     * Remove a node AND every edge attached to it, as one undoable step.
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
        // number; the rows are held under the id the node actually carries.
        const node = this.getNode(nodeId);
        if (node === undefined) {
            return null;
        }

        this.removedEdges = [];
        this.write({ kind: "remove-nodes", ids: [node.id] });
        return this.removedEdges;
    }

    /**
     * Carry out one mutation: through the session's dispatcher once bound, so it is a step, or
     * straight through the primitives on a data manager with no session.
     * @param mutation - The mutation.
     */
    private write(mutation: DataMutation): void {
        if (this.dispatcher === null) {
            this.applyMutation(mutation, this.graph.writer(null, this.store));
            return;
        }

        this.dispatcher.dispatchNow({ op: "data.apply", mutation });
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
        this.edgeMap.delete(edge.id);
        this.edgeVersion++;
        this.edgePairs.delete(edge.srcId, edge.dstId, edge);
        this.edgeRows[edgeIndex] = undefined;
        placeEdgeRow(edge, INVALID_INDEX);

        // Told BEFORE the meshes go, so the engine is never asked to read a position off geometry
        // that is already disposed.
        if (this.layoutEngine) {
            layoutEngineInternals.removeEdge(this.layoutEngine, edge);
        }

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
        if (this.dispatcher === null) {
            this.ingest.addEdges(edges, options, this.graph.writer(null, this.store));
            return;
        }

        this.dispatcher.dispatchNow({
            op: "data.apply",
            mutation: {
                kind: "add-edges",
                records: edges,
                ...(options?.source === undefined ? {} : { source: options.source }),
                ...(options?.target === undefined ? {} : { target: options.target }),
                ...(options?.repeated === undefined ? {} : { repeated: options.repeated }),
            },
        });
    }

    /**
     * Build the render object for an edge the store has just taken, or defer it until both
     * endpoints have one.
     * @param stored - the edge, its resolved endpoints and the row and counter the store gave it
     */
    private buildEdge(stored: StoredEdge): void {
        const { record: edge, sourceId: srcNodeId, targetId: dstNodeId, edgeIndex, edgeId } = stored;

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
            return;
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
            layoutEngineInternals.addEdge(this.layoutEngine, e);
        }

        // Emit edge added event
        this.eventManager.emitEdgeEvent("edge-add-before", {
            srcNodeId,
            dstNodeId,
            metadata: edge,
        });
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
     * Replace every built edge with a new set, or leave the graph exactly as it was.
     *
     * The ceiling is decided BEFORE anything is removed. Removing first and letting `addEdges`
     * refuse would leave a host that assigned too many edges with its old edges gone and none of
     * the new ones held, which is neither the graph it had nor the one it asked for. The new
     * batch is counted against an emptied graph, since the old edges are what it replaces; a
     * pending edge, whose endpoints have not arrived, survives the replace as it always has.
     * @param edges - the edges the graph should hold afterwards
     * @param options - the endpoint expressions and the repeat policy for this call
     * @throws A `GraphtyError` with `E_TOO_LARGE` when the new set is past the ceiling, and
     *     whatever `addEdges` throws.
     */
    setEdges(edges: Record<string | number, unknown>[], options?: AddEdgesOptions): void {
        this.ingest.refuseReplacement(edges, this.edges.size, options);

        if (this.dispatcher === null) {
            const writer = this.graph.writer(null, this.store);
            const removed = writer.removeEdges([...this.edges.keys()]);
            this.dropRendered(removed.nodes, removed.edges);
            this.ingest.addEdges(edges, options, writer);
            return;
        }

        // One step: the removal and the new edges roll back together.
        this.dispatcher.dispatchNow(replaceEdgesCommand([...this.edges.keys()], edges, options));
    }

    /**
     * Removes an edge from the graph
     * @param edgeId - Edge identifier to remove
     * @returns True if the edge was removed, false if not found
     */
    removeEdge(edgeId: string): boolean {
        if (!this.edges.has(edgeId)) {
            return false;
        }

        this.write({ kind: "remove-edges", ids: [edgeId] });
        return true;
    }

    // Data source operations

    /**
     * Loads data from a registered data source
     * @param type - Data source type identifier
     * @param opts - Options to pass to the data source
     */
    async addDataFromSource(type: string, opts: object = {}): Promise<void> {
        if (this.dispatcher === null) {
            await this.ingest.addDataFromSource(type, opts, this.graph.writer(null, this.store));
            return;
        }

        // Added to the graph, as this door always has; one step, on its turn in the queue.
        await this.dispatcher.dispatch({
            op: "data.import",
            source: { type, config: opts as Readonly<Record<string, unknown>> },
            mode: "merge",
        });
    }

    // Utility methods

    /**
     * Remove every node, edge, record and graph-level value, as one undoable step.
     */
    clear(): void {
        this.write({ kind: "clear" });
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
