/**
 * @file The vocabulary of a graph session: what it holds, what it hands back, and what it needs
 * from the element in order to answer.
 *
 * A session is the graph with no screen attached. Everything declared here is plain data, a
 * typed array, or a function over those, and nothing in this file -- or anything it imports --
 * reaches Babylon.js, Lit or the DOM. That is the whole point of the split: the same object that
 * backs a rendered view backs a Node test with no GPU, and two views of one dataset are one of
 * these and two renderers.
 *
 * The rule that decides whether a thing belongs here or on the view: if two synchronised views
 * of one dataset would DISAGREE about it, it belongs to the view. A camera disagrees. Node
 * count, coordinates and statistics do not.
 */

import type { DerivedGraph, GraphSnapshot, NodeId } from "@graphty/graph-format";
import type { z } from "zod/v4";

import type {
    AccelerationCapabilities,
    AccelerationPolicy,
    AccelerationStatus,
    GraphAccelerator,
} from "../acceleration";
// EdgeId comes from the ELEMENT's catalogue rather than from graph-format, which is the one line
// that makes `const id: EdgeId = record.id` type-check. This entry point used to publish two
// different EdgeId types -- graph-format's `string | number` on EdgeRecord and the catalogue's
// `string` everywhere else -- so assigning one to the other was an error on the element's own
// published surface.
import type { CameraState } from "../camera/types";
import type {
    AlgorithmKey,
    AttributeDescriptor,
    AttributeType,
    CatalogApi,
    DeprecatedCatalogMethod,
    EdgeId,
    LayoutId,
    RunId,
    Scope,
    ScopeInput,
    SetId,
} from "../catalog/types";
import type { DataConfig } from "../config/DataConfig";
import type { GraphBackgroundConfig, GraphSelectionStyleConfig, GraphSelectionStyleInput } from "../config/GraphStyle";
import type { ImportReport } from "../data/report";
import type { GraphtyError } from "../errors/GraphtyError";
import type { CostEstimate, CostGateLimits, CostMeasurement, MachineCalibration } from "./cost";
import type { NoteChange, NoteId, NotesApi } from "./notes/types";
import type { AlgorithmRunCommand, Plan, SessionCommand } from "./planning";
import type { ResultsApi } from "./results";
import type {
    Caveats,
    EngineVersions,
    Run,
    RunChange,
    RunExecutor,
    RunOptions,
    RunQueue,
    RunRemoval,
    RunsApi,
} from "./runs";
import type { ScopeApi } from "./scope/index";
import type { SelectionApi, SelectionDelta, SelectionOwner } from "./selection";
import type { SetChange, SetsApi } from "./sets/types";
import type { ElementPaint, SessionStylesApi, StyleChange, StylesApi } from "./styles";
import type { SessionVisibilityApi, VisibilityApi, VisibilityChange } from "./visibility";

/**
 * The element's data configuration, parsed: the id and weight paths, the position scale, the
 * direction policy and the id coercion rule.
 *
 * It is the configuration the session's own behaviour reads, which is why it is the part of the
 * configuration a session carries. The style layers, the camera defaults and the XR settings are
 * the view's, and they are not here.
 */
export type SessionDataConfig = Readonly<z.output<typeof DataConfig>>;

/** A node as a consumer reads it: its id, and whatever attributes its record arrived with. */
export interface NodeRecord {
    /** The id the record was imported under. */
    readonly id: NodeId;
    /** Every other key the record carried. */
    readonly [attribute: string]: unknown;
}

/** An edge as a consumer reads it: its endpoints, and whatever attributes its record carried. */
export interface EdgeRecord {
    /** The element-assigned edge id. */
    readonly id: EdgeId;
    /** The id of the node the edge leaves. */
    readonly source: NodeId;
    /** The id of the node the edge enters. */
    readonly target: NodeId;
    /** Every other key the record carried. */
    readonly [attribute: string]: unknown;
}

/** The attribute bag one record arrived with, as the session reads it. */
export type SessionAttributes = Readonly<Record<string, unknown>>;

/** What a page of records is sorted by. */
export interface RecordSort {
    /**
     * The record key to sort by: a top-level attribute, or `id` (and `source` or `target` for an
     * edge). Numbers (bigints among them) come before text, text sorts in natural order ("2" before "10"), and a record
     * without the key comes last in either direction.
     */
    readonly key: string;
    /** Largest first. Default false. */
    readonly descending?: boolean;
}

/** Which records a page holds, and from where in their order. */
export interface RecordPageOptions {
    /** The position of the page's first record in the ordered list. Default 0. */
    readonly offset?: number;
    /** The most records the page holds; `Infinity` reads to the end. Default 100. */
    readonly limit?: number;
    /** Which records: any scope, such as `"selection"` or `{ set: id }`. Default `"graph"`. */
    readonly scope?: ScopeInput;
    /**
     * The order. Absent, records come in the graph's own order: the order they were added, which
     * an edit never changes -- a removed record leaves a gap that closes, an added one goes last.
     * Records that sort equal keep that order too.
     */
    readonly sort?: RecordSort;
}

/** Which edges a page holds: {@link RecordPageOptions}, plus the edges at one node. */
export interface EdgePageOptions extends RecordPageOptions {
    /** Only the edges with this node at one end or both. */
    readonly touching?: NodeId;
}

/** One window onto an ordered list of records. */
export interface RecordPage<TRecord> {
    /** The records, deep-frozen; at most `limit` of them, fewer at the end of the list. */
    readonly records: readonly TRecord[];
    /** The position of `records[0]` in the ordered list: the offset asked for. */
    readonly offset: number;
    /** How many records the whole ordered list holds. */
    readonly total: number;
    /**
     * Changes whenever anything a page could show may have changed: a record added, removed or
     * edited, an undo, a load, the selection or a set's members. A page held under one revision
     * is stale once {@link SessionDataApi.nodePage} answers another. Opaque: compare it, do not
     * parse it.
     */
    readonly revision: string;
}

/**
 * The connected-component shape of the graph.
 *
 * `sizes` is the size distribution rather than only the largest, because without it a consumer
 * has to walk `componentOf` over every node to answer "are the small parts mostly single
 * nodes?", and that walk is the sort of graph logic that belongs in the element.
 */
export interface ComponentStatistics {
    /** How many connected components the graph has, counting isolated nodes as components. */
    readonly count: number;
    /** Component sizes, descending, capped at `COMPONENT_SIZE_CAP` entries. */
    readonly sizes: readonly number[];
    /** The size of the largest component; zero for an empty graph. */
    readonly largestSize: number;
    /** How many components hold exactly one node. */
    readonly isolatedCount: number;
    /** True when `sizes` was cut short by the cap, so it is a prefix rather than the whole list. */
    readonly truncatedSizes: boolean;
    /**
     * Which component a node belongs to.
     * @param id - the node id
     * @returns the component number, or undefined when the graph has no such node
     */
    componentOf(id: NodeId): number | undefined;
}

/**
 * How the graph's direction came to be what it is.
 *
 * WHY THE SOURCE IS PUBLISHED AND NOT ONLY THE ANSWER. "This graph is directed" and "this file
 * said it is directed" are different claims, and a reader deciding whether to trust the first one
 * needs the second. A properties panel that prints "Directed" on a CSV nobody labelled is stating
 * the element's own default as though it were a fact about the data; the same word on a GEXF file
 * whose header says so is reporting what the author wrote. Without this, a consumer cannot tell
 * those apart, and the only alternative is to re-parse the file they already handed over.
 */
export interface DirectionProvenance {
    /**
     * What settled the direction.
     *
     * `"file"` when an importer read it out of the data -- from a header the file wrote, or from
     * the default its format's own specification assigns to a file that omits that header.
     * `"configuration"` when `data.directed` was set to a boolean, which no file can overrule.
     * `"unsettled"` when nothing has said yet, which is an empty graph under `"auto"`, and a graph
     * loaded entirely from formats that state nothing.
     */
    readonly by: "file" | "configuration" | "unsettled";
    /**
     * The text that said so, ready to show a reader: `defaultedgetype="undirected"`, `digraph`,
     * `*Arcs`, `the GML default for an absent directed key (undirected)`.
     *
     * Null whenever no file settled it, so a consumer can render "Directed" and "Directed (from
     * `digraph`)" from the same two fields without a second lookup.
     */
    readonly statedBy: string | null;
}

/**
 * The facts about the graph's shape that a consumer would otherwise compute for itself.
 *
 * Every field is derived from one snapshot and cached against it, so the first read after a
 * change pays for the walk and every later read in the same revision is free.
 */
export interface GraphStatistics {
    /** Nodes in the snapshot. */
    readonly nodeCount: number;
    /** Edges in the snapshot, self-loops and repeats included. */
    readonly edgeCount: number;
    /**
     * Edges as a fraction of the pairs that could carry one, self-loops excluded from both
     * halves. Zero for a graph with fewer than two nodes.
     */
    readonly density: number;
    /**
     * Whether the graph is directed, as a fact about the graph rather than a guess per edge.
     *
     * `"unknown"` is the honest answer for an empty graph the element was never told about:
     * under `data.directed: "auto"` nothing has settled the question yet. `"mixed"` is in the
     * union because a format can report it; the element does not produce it today, because a
     * snapshot carries one flag for the whole graph.
     */
    readonly directedness: "directed" | "undirected" | "mixed" | "unknown";
    /** Where {@link GraphStatistics.directedness} came from, so a reader can qualify the claim. */
    readonly directednessSource: DirectionProvenance;
    /** True when any edge carries a weight other than 1. */
    readonly weighted: boolean;
    /** Edges whose two endpoints are the same node. */
    readonly selfLoopCount: number;
    /** Edges beyond the first between the same pair of endpoints. */
    readonly repeatedEdgeCount: number;
    /** The smallest and the largest total degree in the graph; `[0, 0]` when there are no nodes. */
    readonly degreeRange: readonly [number, number];
    /**
     * The mean total degree, over the same measure {@link GraphStatistics.degreeRange} summarises:
     * both ends of every edge counted, so a self-loop contributes two. Zero for an empty graph.
     *
     * It is published because the alternative is every consumer deriving it from the edge count,
     * and `2m / n` is the undirected reading: on a directed graph it double-counts, and on any
     * graph it disagrees with the range printed beside it the moment self-loops are involved. One
     * number measured from the same vector as the range cannot drift from it.
     */
    readonly meanDegree: number;
    /** The connected-component shape. */
    readonly components: ComponentStatistics;
}

/**
 * The O(1) half of a session: the facts a status chip or a disabled button needs before it can
 * decide how to behave.
 *
 * Nothing here walks the graph. Reading `counts` does freeze the builder when records have
 * arrived since the last freeze, but the freeze is cached, so a burst of a thousand records
 * costs exactly one however many readers ask afterwards.
 */
export interface SessionStatus {
    /** False once {@link GraphSession.dispose} has run; the session answers nothing after that. */
    readonly ready: boolean;
    /** How much graph there is. */
    readonly counts: {
        /** Nodes in the store, which mid-load can exceed the nodes that have been drawn. */
        readonly nodes: number;
        /** Edges in the store, which mid-load can exceed the edges that have been drawn. */
        readonly edges: number;
        /**
         * Nodes the filters and the time window have left showing.
         *
         * This is the DATA scope, and it is the number a status bar means by "showing 1,204 of
         * 50,000". It is NOT the render set: above the renderer's ceiling fewer nodes are drawn
         * than are counted here, and a run over the `"visible"` scope covers these rather than
         * whatever happened to reach a mesh.
         */
        readonly visibleNodes: number;
        /** Edges the filters and the time window have left showing, on the same terms. */
        readonly visibleEdges: number;
    };
    /** The direction the current snapshot is frozen with; false for a disposed session. */
    readonly directed: boolean;
}

/**
 * What the session needs from the one graph-format builder behind it.
 *
 * It is an interface rather than the concrete `GraphStore` because the element's `DataManager`
 * owns the store for a rendered graph and answers exactly these three members, while a headless
 * session builds a `GraphStore` of its own. Both are "the store" as far as the session is
 * concerned, and the session disposes only the one it made.
 */
export interface SessionGraphStore {
    /**
     * The current snapshot, freezing first when records have arrived since the last one.
     * @returns the immutable snapshot
     */
    getSnapshot(): GraphSnapshot;
    /**
     * The undirected view of a snapshot, built once per snapshot and cached.
     * @param snapshot - a snapshot this store produced
     * @returns the derived graph
     */
    undirected(snapshot: GraphSnapshot): DerivedGraph;
    /** The element-owned node coordinates, indexed by dense node index, read-only. */
    readonly positions: ReadonlyElementPositions;
    /**
     * How many nodes the DATA arrived carrying a coordinate for.
     *
     * THE HONEST ANSWER to "did the file that loaded this graph place its nodes", which
     * {@link ReadonlyElementPositions.placedCount} cannot give: the position array is written by the
     * importer AND by every running layout, so a moment after a file with no coordinates loads,
     * every node carries a position because the layout put it there. This counts the importer's
     * own seed column, which nothing but the importer writes.
     * @returns the count, zero for a graph with no data
     */
    readonly seededNodeCount: number;
    /**
     * How the direction of the graph in this store was settled, and by what text.
     *
     * The store is where the answer lives because the snapshot cannot carry it: a snapshot holds
     * one direction FLAG and no record of who set it, and by the time statistics are computed the
     * importer that read the file has been thrown away.
     */
    readonly directionSettledBy: DirectionProvenance;
    /**
     * What the last load into this store did: which endpoint spelling answered, how many repeated
     * edges were seen and what the policy did with them, and how many edges the graph holds.
     *
     * Optional because a store built by a session that nothing ever imported into has never had a
     * load to report on.
     */
    readonly lastImport?: ImportReport | null;
}

/**
 * Where the session reads the attributes a record arrived with.
 *
 * The store carries ids, coordinates and weights; it does not yet carry the arbitrary keys a
 * record was imported with, and those still live on the element's render objects. Until an
 * attribute column lands in the store, a session over a rendered graph reads them through this
 * seam and a session with no view reports a graph with no attributes -- which is true rather
 * than merely convenient.
 *
 * A node is looked up by BOTH its index and its id because the two holders are keyed
 * differently: the element's node render objects are in a map keyed by id, and its edge render
 * objects are in an array keyed by dense store index. Each implementation uses the key it has.
 */
export interface SessionRecordSource {
    /**
     * The attributes the node at this row arrived with.
     * @param index - the dense node index in the current snapshot
     * @param id - the same node's id
     * @returns the attribute bag, or undefined when nothing is held for that node
     */
    nodeAttributes(index: number, id: NodeId): SessionAttributes | undefined;
    /**
     * The attributes the edge at this row arrived with.
     * @param index - the dense edge index in the current snapshot
     * @returns the attribute bag, or undefined when nothing is held for that edge
     */
    edgeAttributes(index: number): SessionAttributes | undefined;
}

/**
 * Reading the graph.
 *
 * Every verb here is synchronous, because every verb here is either an O(1) lookup or a walk
 * whose answer is cached against the snapshot it was computed from, except {@link nodes} and
 * {@link edges}, which list every record and walk the graph to do it. The verbs that walk a part
 * of the graph -- id listings over a scope, neighbour pages, search -- are asynchronous by
 * construction and are not part of this surface yet.
 */
export interface SessionDataApi {
    /** The store this session reads, read-only: its snapshot is the one {@link snapshot} returns. */
    readonly store: SessionGraphStore;
    /**
     * The current snapshot. Its structure, id map and attribute columns are the graph's own,
     * shared rather than copied; its `position` and `graphty.pinned` columns are copies taken
     * now, because the graph's own are written by the layout every frame and a write into them
     * would place nodes without a step. Place and pin through `session.positions`.
     * @returns the sealed graph-format snapshot
     */
    snapshot(): GraphSnapshot;
    /**
     * The undirected view of the current snapshot, or of one handed in.
     * @param snapshot - the snapshot to derive from; the current one by default
     * @returns the derived graph, including the edge remap an edge result needs
     */
    undirected(snapshot?: GraphSnapshot): DerivedGraph;
    /**
     * One node, by id.
     * @param id - the node id, compared without coercion: 1 and "1" are two different nodes
     * @returns the record, or undefined when the graph has no such node
     */
    node(id: NodeId): NodeRecord | undefined;
    /**
     * One edge, by the element-assigned edge id.
     * @param id - the edge id
     * @returns the record, or undefined when the graph has no such edge
     */
    edge(id: EdgeId): EdgeRecord | undefined;
    /**
     * Every node, in the graph's order: the records {@link node} reads one at a time. Walks the
     * whole graph on every call, so read it when the graph changes, not every frame.
     * @returns the records, deep-frozen
     */
    nodes(): readonly NodeRecord[];
    /**
     * Every edge, in the graph's order: the records {@link edge} reads one at a time. Walks the
     * whole graph on every call, so read it when the graph changes, not every frame.
     * @returns the records, deep-frozen
     */
    edges(): readonly EdgeRecord[];
    /**
     * One page of node records, without reading the rest: what a table showing a few rows of a
     * large graph reads. The order is computed once per revision, scope and sort and then reused,
     * so scrolling through the pages of one order costs only the records on each page.
     * @param options - the window, the scope and the order; every field optional
     * @returns the page, with the total and the revision it was read at
     * @throws A `GraphtyError` with `E_OPTION_RANGE` when `offset` or `limit` is not a whole
     *     number of zero or more.
     */
    nodePage(options?: RecordPageOptions): RecordPage<NodeRecord>;
    /**
     * One page of edge records, without reading the rest: {@link nodePage}, for edges, and
     * optionally only the edges at one node.
     * @param options - the window, the scope, the order and the node; every field optional
     * @returns the page, with the total and the revision it was read at
     * @throws A `GraphtyError` with `E_OPTION_RANGE` when `offset` or `limit` is not a whole
     *     number of zero or more.
     */
    edgePage(options?: EdgePageOptions): RecordPage<EdgeRecord>;
    /**
     * What the last load did: which endpoint spelling the element resolved, how many repeated
     * edges it saw and what the policy did with them, and how many edges the graph actually holds.
     *
     * A door as well as the two load events, because those are fire-and-forget: a consumer that
     * subscribed after the load has no other way to ask.
     * @returns the report, or null when nothing has been loaded into this graph
     */
    lastImport(): ImportReport | null;
    /**
     * Where the graph was loaded from: the format, the name the reader knows the data by, the
     * URL, and the file's size. It follows undo and redo like the graph does, so a top bar that
     * names the dataset reads it again after either.
     * @returns the source, or null when the graph was not loaded by an import, or was cleared
     */
    source(): DataSourceDescriptor | null;
    /**
     * Every attribute the graph's records carry, with its type, how complete it is and a few
     * sample values. Walked once per snapshot and cached.
     * @returns the descriptors, node attributes first, each kind in first-seen order
     */
    attributes(): readonly AttributeDescriptor[];
    /**
     * The graph's shape. Walked once per snapshot and cached.
     * @returns the statistics
     */
    statistics(): GraphStatistics;
    /**
     * A stable identity for the graph's topology: equal fingerprints mean the same node ids in
     * the same order with the same arcs between them. Attributes and coordinates are not in it.
     * @returns the fingerprint
     */
    fingerprint(): string;
    /**
     * Add node records, as one undoable step. A record's id is read through
     * `data.knownFields.nodeIdPath`; a record whose id the graph already holds is skipped.
     * @param records - The records.
     * @returns Settles once the nodes are in the graph and drawn.
     */
    addNodes(records: readonly NodeRecordInput[]): Promise<void>;
    /**
     * Add edge records, as one undoable step. Endpoints are read through the configured edge id
     * paths, the repeated-edge policy applies, and each edge is given an id.
     * @param records - The records.
     * @returns Settles once the edges are in the graph and drawn.
     */
    addEdges(records: readonly EdgeRecordInput[]): Promise<void>;
    /**
     * Change some attributes of existing nodes, as one undoable step. Keys not named are kept; an
     * id the graph does not hold is skipped.
     * @param rows - The new values, per node.
     * @returns Settles once the change is drawn.
     */
    updateNodes(rows: readonly RowUpdate<NodeId>[]): Promise<void>;
    /**
     * Change some attributes of existing edges, as one undoable step.
     * @param rows - The new values, per edge id.
     * @returns Settles once the change is drawn.
     */
    updateEdges(rows: readonly RowUpdate<EdgeId>[]): Promise<void>;
    /**
     * Remove nodes, and every edge attached to one, as one undoable step. Undo puts them back at
     * the rows they held, with their records, weights and edge ids.
     * @param ids - The node ids; one the graph does not hold is skipped.
     * @returns Settles once they are gone from the graph and the picture.
     */
    removeNodes(ids: readonly NodeId[]): Promise<void>;
    /**
     * Remove edges, as one undoable step.
     * @param ids - The element-assigned edge ids; one the graph does not hold is skipped.
     * @returns Settles once they are gone from the graph and the picture.
     */
    removeEdges(ids: readonly EdgeId[]): Promise<void>;
    /**
     * Remove every node, edge, record and graph-level value, as one undoable step.
     * @returns Settles once the graph and the picture are empty.
     */
    clear(): Promise<void>;
    /**
     * Load a file, a URL or inline text through a registered data source, as one undoable step.
     * It waits its turn behind loads and layouts already asked for. What was loaded, and from
     * where, is kept: `lastImport()` and `source()` report it, and undo and redo never read the
     * source again.
     *
     * Without a `type`, the format is detected the way `loadFromUrl` and `loadFromFile` detect
     * it: from the file name or the URL's extension, then from the first bytes, fetching the URL
     * once when its name says nothing. A format nothing recognises rejects with
     * `E_UNKNOWN_FORMAT`, naming the formats this element reads.
     * @param source - The data source's name, or none to detect it, and its options: inline
     *     `data`, a `url` or a `file`.
     * @param options - Whether to replace the graph (the default) or add to it.
     * @returns Settles once the last chunk is in the graph; rejects, recording nothing, when the
     *     load fails.
     */
    import(source: DataSourceInput, options?: ImportOptions): Promise<void>;
    /**
     * Read a source the way `import` would and say what it would load, loading nothing: the
     * format, each table with its columns and a few rows, the key and weight columns, and the
     * report `lastImport()` would return. The graph and its history are untouched, and no
     * `data:progress` event is published. A source `import` would refuse is refused here with the
     * same error code -- `E_TOO_LARGE` with `details.limit`, `E_EDGE_ENDPOINTS_UNRESOLVED` with the
     * columns the file carries -- so the refusal can be shown before the reader presses Load.
     * @param source - What `import` takes.
     * @param options - The reader's column roles, as `import` will apply them.
     * @returns What the load would hold.
     */
    preview(source: DataSourceInput, options?: LoadPreviewOptions): Promise<LoadPreview>;
}

/** What a column of a previewed table is to the load. */
export type LoadColumnRole = "id" | "source" | "target" | "weight" | "attribute";

/** What a column's values measure. */
export type LoadColumnLevel = "id" | "category" | "quantity" | "time" | "text";

/** One column of a previewed table. */
export interface LoadPreviewColumn {
    /** The column's name, as the records carry it. */
    readonly name: string;
    /** The type of its values. */
    readonly type: AttributeType;
    /** What its values measure. */
    readonly level: LoadColumnLevel;
    /** The role the load gives it, with the mapping applied. */
    readonly role: LoadColumnRole;
    /** The role the element picks for it by itself, with no mapping. */
    readonly suggested: LoadColumnRole;
}

/** One table of a previewed load: the node rows or the edge rows. */
export interface LoadPreviewTable {
    /** The file's name for one of two files, else `"nodes"` or `"edges"`. */
    readonly name: string;
    /** Whether its rows become nodes or edges. */
    readonly role: "nodes" | "edges";
    /** How many rows the source handed over. */
    readonly rowCount: number;
    /** Its columns, key columns first. */
    readonly columns: readonly LoadPreviewColumn[];
    /** Its first few rows. */
    readonly sample: readonly Readonly<Record<string, unknown>>[];
}

/** What a load would hold, read before anything is loaded. */
export interface LoadPreview {
    /** The data source that reads it: the format named, or the one detected. */
    readonly format: string;
    /** The tables with any rows, nodes first. */
    readonly tables: readonly LoadPreviewTable[];
    /** The columns a node's id and an edge's endpoints are read from; null where no table has rows. */
    readonly keys: { readonly node: string | null; readonly source: string | null; readonly target: string | null };
    /** The column edge weights are read from, or null when none. */
    readonly weight: string | null;
    /** The report `lastImport()` would return after this load. */
    readonly report: ImportReport;
}

/**
 * The reader's edits to the roles a preview showed. A column named here takes that role; a role
 * not named is the element's own pick.
 */
export interface LoadMapping {
    /** The column holding a node's id. */
    readonly nodeId?: string;
    /** The column holding the node an edge leaves. */
    readonly source?: string;
    /** The column holding the node an edge enters. */
    readonly target?: string;
    /** The column holding an edge's weight, or null for none. */
    readonly weight?: string | null;
    /**
     * Whether each table's rows are nodes or edges, by table name. Read for CSV: one file is
     * read as a node list or an edge list, and two files are swapped when they were handed over
     * the wrong way round.
     */
    readonly tables?: Readonly<Record<string, "nodes" | "edges">>;
}

/** How `data.preview` reads a source. */
export interface LoadPreviewOptions {
    /** The reader's column roles. */
    readonly mapping?: LoadMapping;
}

/** How far a load has got: the payload of `data:progress`. */
export interface LoadProgress {
    /** The data source reading it. */
    readonly format: string;
    /** Records read so far: node records plus edge records. */
    readonly read: number;
    /** Node records read so far. */
    readonly nodeRecords: number;
    /** Edge records read so far. */
    readonly edgeRecords: number;
}

/**
 * A source to import: the pair the element takes as `dataSource` and `dataSourceConfig`. `type`
 * is a registered data source ("json", "csv", "graphml", ...), and `config` its options: inline
 * `data`, a `url` or a `file`, and what the source reads besides.
 */
export interface DataSourceInput {
    /** The data source's name; detected from the file name, the URL or the content when absent. */
    readonly type?: string;
    /** Its options. */
    readonly config: Readonly<Record<string, unknown>>;
    /**
     * What the reader calls the data, kept with the graph for `data.source()`. The file's name,
     * or the last part of the URL, when absent.
     */
    readonly name?: string;
}

/**
 * Where a graph was loaded from, as the graph keeps it: never the inline text or the file itself,
 * which the loaded rows already hold.
 */
export interface DataSourceDescriptor {
    /** The data source that read it: the format named, or the one detected. */
    readonly type?: string;
    /** What the reader calls the data. */
    readonly name?: string;
    /** The file's size in bytes, when a file was read. */
    readonly size?: number;
    /** The source's options, without `data` and `file`: the `url`, and what the source reads besides. */
    readonly config?: Readonly<Record<string, unknown>>;
}

/** How an import treats the graph already there. */
export interface ImportOptions {
    /** `"replace"` (the default) empties the graph first, in the same step; `"merge"` adds to it. */
    readonly mode?: "replace" | "merge";
    /**
     * `"recommended"` also chooses a layout for what was loaded, from its shape and its
     * coordinates, in the same step; `"keep"` (the default) leaves the layout as it is.
     */
    readonly layout?: "recommended" | "keep";
    /** The reader's column roles, as a `data.preview` with the same mapping showed them. */
    readonly mapping?: LoadMapping;
}

/** A node record to add: its id is read through `data.knownFields.nodeIdPath`. */
export type NodeRecordInput = Readonly<Record<string, unknown>>;

/** An edge record to add: its endpoints are read through the edge id paths; its id is assigned. */
export type EdgeRecordInput = Readonly<Record<string, unknown>>;

/** New values for some attributes of one existing row; keys not named are left as they are. */
export interface RowUpdate<Id> {
    /** The row's id. */
    readonly id: Id;
    /** The new values. */
    readonly values: Readonly<Record<string, unknown>>;
}

/**
 * The part of the catalogue a session can answer today: the seven capability tables, which are
 * plain data and need no graph, plus `metrics()`, which needs one.
 *
 * Six of the seven -- algorithms, cameras, formats, layouts, log destinations and palettes --
 * carry the element's own entries followed by whatever a third party registered, because those
 * are the six supported extension points and an extension a picker cannot find is half an
 * extension. `scales` is the element's own table alone.
 *
 * `metrics()` is the graph-dependent half's first member, and it is here because everything it
 * reads now exists: the catalogue declares what each algorithm requires of a graph, the cost model
 * answers what one would take over the scope a run would cover and reports a requirement the graph
 * does not meet as an unavailability rather than a throw, and the runs API holds what has already
 * been run. A consumer wanting only the metrics that CAN run filters on `available`; both lists
 * come off one call rather than two that could disagree.
 *
 * The rest of {@link CatalogApi} -- the methods named in `DeprecatedCatalogMethod` -- is absent
 * rather than stubbed, and deprecated on `CatalogApi` itself. A consumer discovers that gap by
 * autocomplete finding nothing, not by a call that throws. This type is derived from that list,
 * so implementing one of them means deleting its name there and nothing here.
 */
export type SessionCatalogApi = Omit<CatalogApi, DeprecatedCatalogMethod>;

/**
 * The project settings: the ones a project file saves, every one of them undoable.
 *
 * `data` is the element's data configuration in its own shape: the on-load `algorithms`, the
 * `directed` policy, and `knownFields` with every known field (`nodeIdPath`, `nodeLabelPath`,
 * `nodeWeightPath`, `nodeTimePath`, `edgeSrcIdPath`, `edgeDstIdPath`, `edgeIdPath`,
 * `repeatedEdges`, `edgeWeightPath`, `edgeTimePath`, `positionScale`, `idCoercion`). A setting
 * nobody has set reads as its default.
 */
export interface ProjectConfig {
    readonly data: SessionDataConfig;
    /** Whether the algorithms in `data.algorithms` run once data has loaded. */
    readonly runAlgorithmsOnLoad: boolean;
    /** What the graph is drawn against: a colour or a skybox. */
    readonly background: GraphBackgroundConfig;
    /** What a selected node's halo looks like. */
    readonly selectionStyle: GraphSelectionStyleConfig;
    /**
     * The layout-behaviour settings a project file saves. The rest of the element's
     * `layoutBehavior` (label declutter, pin on drag, throughput tuning) is a preference of the
     * view and not a project setting.
     */
    readonly layoutBehavior: {
        /** Simulation steps run before the first frame is drawn. */
        readonly preSteps: number;
        /** Simulation steps per frame. */
        readonly stepMultiplier: number;
        /** The movement below which a simulation counts as settled. */
        readonly minDelta: number;
    };
    /**
     * Who is writing: stamped on each note added from now on. Absent when no name is set, never
     * blank. A claim, never a verified identity.
     */
    readonly author?: string;
}

/**
 * A partial {@link ProjectConfig}, nested: `{ data: { knownFields: { nodeIdPath: "key" } } }`.
 * Plain objects are merged key by key; `data.algorithms`, `background` and `selectionStyle` are
 * replaced whole. Setting a key to `undefined` returns it to its default.
 */
export interface ProjectConfigPatch {
    readonly data?: {
        readonly algorithms?: SessionDataConfig["algorithms"];
        readonly directed?: SessionDataConfig["directed"];
        readonly knownFields?: Partial<SessionDataConfig["knownFields"]>;
    };
    readonly runAlgorithmsOnLoad?: boolean;
    readonly background?: GraphBackgroundConfig;
    readonly selectionStyle?: GraphSelectionStyleInput;
    readonly layoutBehavior?: Partial<ProjectConfig["layoutBehavior"]>;
    /** At most 256 characters; empty or only white space counts as no name, and `null` clears it. */
    readonly author?: string | null;
}

/**
 * The session's settings as they are now: every project setting, read live, and the
 * acceleration policy, which is a preference about this machine and not saved in a project.
 */
export interface SessionConfig extends ProjectConfig {
    /**
     * Change project settings. One step, which undo takes back.
     * @param values - The settings to change.
     * @returns Settles once the step is recorded and the picture has caught up.
     * @throws A `GraphtyError` (as a rejection) with `E_BAD_COMMAND` when a key is not a project
     *     setting or a value is one its setting refuses; nothing is changed then.
     */
    set(values: ProjectConfigPatch): Promise<void>;
    /** What the consumer asked of the hardware. */
    readonly acceleration: {
        /** Use an accelerator when one is available, never look, or refuse to run without one. */
        readonly policy: AccelerationPolicy;
        /** The node count at or above which accelerated work actually uses the accelerator. */
        readonly minNodes: number;
    };
}

/**
 * What a session publishes to whoever is watching it.
 *
 * A map rather than a bare handler, so that the events arriving with the layout, the camera and
 * the journal are added without changing a signature. An event that does not fire is not declared
 * here: a consumer discovers the gap by autocomplete finding nothing rather than by subscribing
 * to something silent.
 */
export interface SessionEventMap {
    /** A run reached one of the four watched moments. */
    "run:changed": RunChange;
    /**
     * Elements joined or left the selection.
     *
     * Only a real movement arrives: selecting what is already selected changes nothing a listener
     * could act on, and is not published.
     */
    "selection:changed": SelectionDelta;
    /** A filter, the time window or the context flag changed what is showing. */
    "visibility:changed": VisibilityChange;
    /**
     * A layer was added, changed, removed or moved, and how much of the picture it repainted.
     *
     * Published for every verb that changes the stack, including the ones that write several
     * layers at once: one event per EDIT rather than one per layer, because an edit is what a
     * consumer undoes, records and mirrors.
     */
    "style:changed": StyleChange;
    /**
     * The element tried to paint something of its own and was refused.
     *
     * THE ONLY STYLE FAILURE A CONSUMER CANNOT OTHERWISE SEE. A style edit a consumer asks for
     * rejects the promise it handed back, so the refusal arrives at the call that caused it. The
     * element also paints on its own account -- a run's suggested encoding lands on the run's
     * first completion, without anybody awaiting it -- and a refusal there had nowhere to go:
     * the work is fire-and-forget by design, because the element must not make a consumer await
     * the picture in order to have started the run. So it arrives here instead.
     *
     * A graph that quietly kept the picture it had while the element believed it had painted a
     * new one is the exact defect this whole style system replaces. Subscribe to this and a
     * consumer can say "the degree colouring could not be applied" instead of leaving a reader
     * looking at an old picture that reads as an answer.
     */
    "style:problem": StyleProblem;
    /** Every acceleration transition; the document is the one `capabilities` returns. */
    "capabilities:changed": { readonly capabilities: AccelerationCapabilities };
    /**
     * The history changed: a step was recorded, merged, undone, redone, restored, evicted or
     * cleared, or the pending work (and so what the next undo will do) changed. Fires
     * synchronously after `project:changed`. Read `session.history` for the new state; its
     * `version` has moved.
     */
    "history:changed": {
        readonly reason: "record" | "merge" | "undo" | "redo" | "restore" | "evict" | "clear" | "pending" | "size";
    };
    /**
     * Project state changed: the slices written and what wrote them. Fires synchronously, as
     * soon as the state has changed and before the picture has caught up; the per-domain events
     * (`style:changed` and the rest) follow once it has.
     */
    "project:changed": { readonly slices: readonly ProjectSlice[]; readonly cause: HistoryCause };
    /**
     * A kept set was created, renamed, redefined or removed: one event per set a write touched,
     * after the write committed. A write that was refused publishes nothing.
     *
     * Membership has no event: a set's members follow the data lazily, so a panel showing counts
     * re-reads them on the events it already watches and on this one.
     */
    "set:changed": SetChange;
    /**
     * A note was added, edited or removed: one event per note a write touched, after the write
     * committed. A write that was refused, or that changed nothing, publishes nothing.
     */
    "note:changed": NoteChange;
    /** A chunk of a load is in the graph: the running count of records read. Not sent for a preview. */
    "data:progress": LoadProgress;
}

/**
 * The parts of a project. Everything a project file saves lives in one of these, and a change
 * to any of them is undoable; nothing outside them (camera, hover, the selection, a run still
 * computing) is.
 *
 * OPEN UNION: slices may be added in a minor release; handle one you do not know.
 */
export type ProjectSlice =
    | "graph"
    | "config"
    | "layout"
    | "pins"
    | "arrangement"
    | "runs"
    | "styles"
    | "visibility"
    | "sets"
    | "views"
    | "notes";

/** What moved project state: a command, a history move, or a failed command being reverted. */
export type HistoryCause = "command" | "undo" | "redo" | "restore" | "rollback";

/** The id of one step in `session.history.steps`. */
export type HistoryStepId = string & { readonly __brand: "HistoryStepId" };

/** The id of one item in `session.history.pending`. */
export type PendingId = string & { readonly __brand: "PendingId" };

/** One undoable step: everything one command, gesture or transaction changed. Frozen. */
export interface HistoryStep {
    /** Stable for the life of the step. */
    readonly id: HistoryStepId;
    /** What a history list shows, such as "Changed colour of Hubs". */
    readonly label: string;
    /** ISO 8601 of the last commit or merge into the step. */
    readonly at: string;
    /** The ops of the commands in the step, in the order they ran. Payloads are not kept for display. */
    readonly ops: readonly SessionCommand["op"][];
    /** The slices the step changed. */
    readonly slices: readonly ProjectSlice[];
    /** What the step retains on the side of the cursor it is on. */
    readonly bytes: number;
    /** Where the step came from, such as `{ via: "assistant" }`. */
    readonly provenance: Readonly<Record<string, string>>;
}

/** Undoable work dispatched and not yet recorded: queued, waiting, or an open transaction. Frozen. */
export interface PendingStep {
    /** Pass it to `history.cancel`. */
    readonly id: PendingId;
    /** The label the step will have. */
    readonly label: string;
    /** ISO 8601 of the dispatch. */
    readonly since: string;
    /** The runs this work is waiting on. */
    readonly runIds: readonly RunId[];
}

/** What an undo, a redo or a restore did. */
export type HistoryOutcome =
    | { readonly kind: "undone" | "redone" | "restored"; readonly steps: readonly HistoryStep[] }
    | { readonly kind: "cancelled"; readonly pending: readonly PendingStep[] }
    | { readonly kind: "nothing" };

/**
 * The session's undo history. `steps`, `pending` and `nextUndo` are frozen values, the identical
 * objects between changes; `version` moves on every `history:changed`, so a React host can
 * subscribe with `useSyncExternalStore(subscribe, () => session.history.version)`.
 */
export interface SessionHistory {
    /** Bumped on every `history:changed`. */
    readonly version: number;
    /** Oldest first; `steps[position..]` have been undone and can be redone. */
    readonly steps: readonly HistoryStep[];
    /** How many steps are applied. */
    readonly position: number;
    /** Undoable work dispatched and not yet recorded, oldest first. */
    readonly pending: readonly PendingStep[];
    /** What the next `undo()` will do: cancel pending work, undo a step, or nothing (null). */
    readonly nextUndo:
        | { readonly kind: "cancel"; readonly pending: readonly PendingStep[] }
        | { readonly kind: "undo"; readonly step: HistoryStep }
        | null;
    /** What every step retains, in bytes. */
    readonly bytes: number;
    /**
     * The byte budget. Default 256 MiB. When a record goes past it, or past `limitSteps`, the
     * oldest steps (then the farthest redo steps) are dropped until the history is within 90% of
     * both budgets, so the work of dropping is spread over many records. Lowering a budget below
     * what the history holds trims it the same way at once.
     */
    limitBytes: number;
    /**
     * The step budget. Default 1000. Going past it trims the history to 90% of it, rounded down,
     * as `limitBytes` describes: with a budget of 10, the eleventh step leaves 9.
     */
    limitSteps: number;
    /**
     * Move to the state just after a step, or to the baseline with `null`, as the equivalent run
     * of undos or redos. Resolves once the picture matches the state.
     * @param step - The step, or null for the state before every step.
     * @returns What was done.
     */
    restoreTo(step: HistoryStepId | null): Promise<HistoryOutcome>;
    /**
     * Cancel a pending item, and every later-dispatched item that depends on what it writes.
     * @param pending - The item.
     * @returns Every item cancelled; empty when the id is not pending.
     */
    cancel(pending: PendingId): readonly PendingStep[];
    /** Drop every step, cancelling pending work: the current state becomes the baseline. */
    clear(): void;
}

/** Stamped on the step a transaction records. */
export interface TransactionOptions {
    /** Where the step came from, such as `{ via: "assistant" }`. Shown in `HistoryStep.provenance`. */
    readonly provenance?: Readonly<Record<string, string>>;
}

/**
 * The session a transaction's callback works through: every verb of the session, and what it
 * dispatches joins the transaction's step. It cannot undo, redo, read the history or dispose.
 */
export type TransactionScope = Omit<GraphSession, "undo" | "redo" | "history" | "dispose">;

/**
 * What `execute` returns, per op. No entry is wrapped in a promise, because a promise resolved
 * with a `Run` would adopt it and yield the result instead of the handle.
 */
export interface CommandOutcomeMap {
    /** The run's handle; awaiting it yields the result. */
    "algo.run": Run;
    /** Settles once the plugin has run and everything it wrote is recorded as one step. */
    "algo.legacy": Promise<void>;
    /** What went with the run, once the removal is recorded. */
    "algo.remove": Promise<RunRemoval>;
    /** Settles once every member is recorded as one step and the pass that draws it has run. */
    batch: Promise<void>;
    /** Settles once the change is recorded and the pass that draws it has run. */
    "data.apply": Promise<void>;
    /** Settles once the last chunk is recorded and the pass that draws it has run. */
    "data.import": Promise<void>;
    /** Settles once the neighbourhood is recorded and the pass that draws it has run. */
    "data.expand": Promise<void>;
    /** Settles once the edit is recorded and the pass that repaints it has run. */
    "style.patch": Promise<void>;
    /** Settles once the edit is recorded and the pass that repaints it has run. */
    "style.encode": Promise<void>;
    /** Settles once the edit is recorded and the pass that repaints it has run. */
    "style.template": Promise<void>;
    /** Settles once the filter is recorded and the pass that evaluates the masks has run. */
    "visibility.set": Promise<void>;
    /** Settles once the window is recorded and the pass that evaluates the masks has run. */
    "visibility.window": Promise<void>;
    /** Settles once the flag is recorded and the pass that follows it has run. */
    "visibility.context": Promise<void>;
    /** The new set's id, once it is recorded. */
    "set.create": Promise<SetId>;
    /** Settles once the rename is recorded. */
    "set.rename": Promise<void>;
    /** Settles once the redefinition is recorded. */
    "set.redefine": Promise<void>;
    /** Settles once the member edit is recorded. */
    "set.members": Promise<void>;
    /** Settles once the removal is recorded. */
    "set.remove": Promise<void>;
    /** Settles once the restore is recorded. */
    "set.restore": Promise<void>;
    /** The new note's id, once it is recorded. */
    "note.add": Promise<NoteId>;
    /** Settles once the edit is recorded. */
    "note.update": Promise<void>;
    /** Settles once the removal is recorded. */
    "note.remove": Promise<void>;
    /** Settles once the merged notes are recorded; `session.notes.mergeDocument` returns the report. */
    "note.merge": Promise<void>;
    /** Settles once the views are recorded. */
    "view.save": Promise<void>;
    /** Settles once the removal is recorded. */
    "view.remove": Promise<void>;
    /** Settles once the camera has arrived. */
    "view.camera": Promise<void>;
    /** Settles once the settings are recorded and the picture has caught up. */
    "config.set": Promise<void>;
    /** Settles once the coordinates are recorded and the layout has taken them. */
    "positions.set": Promise<void>;
    /** Settles once the pins are recorded and the layout has taken them. */
    "positions.pin": Promise<void>;
    /** Settles once the choice is recorded and the layout has spent its pre-steps. */
    "layout.set": Promise<void>;
    /** Settles once the scope is recorded. */
    "layout.scope": Promise<void>;
    /** Settles once the switch is recorded and the layout has been rebuilt for it. */
    "view.dimension": Promise<void>;
    /** Settles once the layout has started or stopped moving. */
    "layout.transport": Promise<void>;
    /** Settles once the device session has started or ended. */
    "view.immersive": Promise<void>;
}

/** One node's coordinates for `positions.set`, in scene units. */
export interface PositionEntry {
    readonly id: NodeId;
    readonly x: number;
    readonly y: number;
    /** Defaults to 0. */
    readonly z?: number;
}

/**
 * The node coordinates, read by dense node index: a row no layout has placed reads as unplaced
 * rather than as the origin.
 *
 * Read-only. A consumer places and pins nodes through `session.positions.set`, `pin` and `unpin`,
 * which are undoable steps; the array a layout writes every frame is the element's own.
 */
export interface ReadonlyElementPositions {
    /** Rows the coordinates can hold without growing. */
    readonly capacity: number;
    /** Rows in use: the node count of the current snapshot. */
    readonly count: number;
    /** Rows in use that hold a coordinate. */
    readonly placedCount: number;
    /** Rows in use that are pinned. */
    readonly pinnedCount: number;
    /** Moves whenever coordinates are written on purpose, so a reader can tell they changed. */
    readonly generation: number;
    /**
     * Whether a row holds a coordinate.
     * @param index - The dense node index.
     * @returns False for an unplaced row or one past the rows in use.
     */
    isPlaced(index: number): boolean;
    /**
     * Whether a row is pinned.
     * @param index - The dense node index.
     * @returns False for an unpinned row or one past the rows in use.
     */
    isPinned(index: number): boolean;
    /**
     * Read a row's coordinates into an object the caller owns.
     * @param index - The dense node index.
     * @param out - Receives x, y and z in scene units; NaN for an unplaced row.
     * @param out.x - Receives x.
     * @param out.y - Receives y.
     * @param out.z - Receives z.
     */
    read(index: number, out: { x: number; y: number; z: number }): void;
}

/**
 * Placing and pinning nodes, as undoable steps, beside the read-only coordinates.
 *
 * Coordinates a running layout writes are not steps: where the layout comes to rest is recorded
 * into the step before it, so undo and redo restore where the nodes were without running the
 * layout again.
 */
export interface SessionPositions extends ReadonlyElementPositions {
    /** The pinned node ids: the nodes no layout moves. */
    readonly pinned: ReadonlySet<NodeId>;
    /**
     * Place nodes. One step; calls made one after another within the coalescing window are one.
     * @param entries - The nodes and where to put them.
     * @returns Settles once the step is recorded and the layout has taken the coordinates.
     * @throws A `GraphtyError` (as a rejection) with `E_BAD_COMMAND` for a node the graph does not
     *     hold or a coordinate that is not a finite number; nothing is placed then.
     */
    set(entries: readonly PositionEntry[]): Promise<void>;
    /**
     * Pin nodes where they are. One step. A node the graph does not hold is skipped.
     * @param ids - The nodes.
     * @returns Settles once the step is recorded and the layout has taken the pins.
     */
    pin(ids: readonly NodeId[]): Promise<void>;
    /**
     * Release pinned nodes, so the layout arranges them again. One step.
     * @param ids - The nodes.
     * @returns Settles once the step is recorded and the layout has taken the change.
     */
    unpin(ids: readonly NodeId[]): Promise<void>;
}

/**
 * Which layout draws the graph, and in how many dimensions: the project's `layout` slice.
 *
 * Choosing a layout and switching between 2D and 3D are undoable steps, and undo puts back the
 * engine that was chosen with its own options, not the catalogue's default. Until one is chosen
 * it reads the element's default, the `force` layout drawn by `ngraph` in 3D.
 */
export interface SessionLayout {
    /** The catalogue id, such as `"force"`. */
    readonly id: LayoutId;
    /** The engine that draws it, such as `"d3"`. */
    readonly engine: string;
    /** The options it was chosen with. */
    readonly options: Readonly<Record<string, unknown>>;
    /** Whether the graph is drawn in two dimensions or three. */
    readonly dimension: "2d" | "3d";
    /**
     * Choose the layout. One step.
     * @param id - The catalogue id; a registered engine name is read as the id it serves.
     * @param options - The engine, when not the catalogue's default for `id`, and its options.
     * @param options.engine - The engine that draws it, such as `"d3"`.
     * @param options.options - The engine's options.
     * @returns Settles once the step is recorded and the layout has taken its pre-steps.
     * @throws A `GraphtyError` (as a rejection) with `E_UNKNOWN_LAYOUT`, `E_UNKNOWN_OPTION` or
     *     `E_OPTION_RANGE` when the renderer cannot build it; nothing is changed then.
     */
    set(
        id: LayoutId,
        options?: { readonly engine?: string; readonly options?: Readonly<Record<string, unknown>> },
    ): Promise<void>;
    /**
     * Draw in 2D or 3D. One step; nothing is recorded when the graph is drawn so already.
     * @param dimension - Which.
     * @returns Settles once the step is recorded and the layout has been rebuilt for it.
     */
    setDimension(dimension: "2d" | "3d"): Promise<void>;
}

/**
 * The saved camera views, read as a map from name to camera state.
 *
 * A saved view is a fixed position, not a rule: it does not recompute itself for a different
 * graph the way a camera view does, which is why a name a camera view answers to is refused.
 */
export interface SessionViews extends ReadonlyMap<string, CameraState> {
    /**
     * Keep camera states under names, replacing any view already saved under one. One step.
     * @param views - The names and the camera states.
     * @returns Settles once the step is recorded.
     * @throws A `GraphtyError` (as a rejection) with `E_PROTECTED` when a camera view answers to
     *     a name, or `E_BAD_COMMAND` for an empty name; nothing is saved then.
     */
    save(views: readonly { readonly name: string; readonly camera: CameraState }[]): Promise<void>;
    /**
     * Forget saved views. One step.
     * @param names - The names.
     * @returns Settles once the step is recorded.
     * @throws A `GraphtyError` (as a rejection) with `E_BAD_COMMAND` when a name is not saved;
     *     nothing is removed then.
     */
    remove(names: readonly string[]): Promise<void>;
}

/** What `execute` returns for one command. */
export type CommandOutcome<C extends SessionCommand> = CommandOutcomeMap[C["op"]];

/**
 * A painting the element started for itself, and why it did not land.
 *
 * Structured-cloneable: the run's id and a `GraphtyError`, so it survives being posted to a
 * worker or written to a log.
 */
export interface StyleProblem {
    /** The run whose suggested styling was refused. */
    readonly runId: RunId;
    /** Why it was refused. */
    readonly error: GraphtyError;
}

/**
 * A graph with no view attached.
 *
 * The session holds the graph data, the coordinates, the runs and their results, the scope,
 * selection and visibility models, the style layers, the status, the catalogue, the configuration
 * and the measured capabilities of the machine. A renderer binds to one; a Node test uses one on
 * its own; two synchronised views of one dataset share one.
 *
 * What is deliberately NOT here yet: the layout transport, notes and the journal. Each waits on
 * work that has not landed, and each is absent rather than stubbed.
 */
export interface GraphSession {
    /** Reading the graph. */
    readonly data: SessionDataApi;
    /** Starting computations, watching them, stopping them, and finding them again. */
    readonly runs: RunsApi;
    /** Addressing what a run produced: the path, the lookup and the completion list. */
    readonly results: ResultsApi;
    /**
     * Which elements a piece of work is allowed to look at: resolving a specification, counting
     * it without resolving it, and keeping one under a name.
     */
    readonly scope: ScopeApi;
    /**
     * The kept sets: named collections of nodes and edges -- groups, kept selections, communities
     * and paths -- that anything taking a scope can name as `{ set: id }`.
     *
     * A set is fixed (a member list), a rule (a query or rule tree that follows the data) or a
     * path (an ordered walk). Reading and counting one goes through `scope.resolve({ set: id })`
     * and `scope.count({ set: id })`; every change is published as `set:changed`.
     */
    readonly sets: SetsApi;
    /**
     * The notes: text people write about the graph, its nodes and edges, kept sets and results.
     * Every write is one undoable step and is published as `note:changed`; graphty-element stores
     * a note's text exactly as given and never interprets it.
     */
    readonly notes: NotesApi;
    /**
     * What is selected: two sets, five set operations, one selection for the whole session.
     *
     * Every surface reads and writes this one -- the canvas, a data table, an inspector, a
     * headset -- which is why it belongs to the session rather than to the thing that draws it.
     */
    readonly selection: SelectionApi;
    /**
     * What is visible: the DATA scope, produced by the filters and the time window.
     *
     * Never the render set. Above the renderer's ceiling fewer elements are drawn than are
     * visible here, and "analyse the visible graph" means this model rather than whatever
     * happened to be drawn.
     */
    readonly visibility: VisibilityApi;
    /**
     * The style layers: what paints what, in what order, and why one element looks as it does.
     *
     * The stack is read BOTTOM FIRST, so a layer later in `list()` paints over one earlier in
     * it, and every layer is addressed by its id rather than by its place -- a position is what
     * goes wrong the moment anything else moves.
     *
     * The bottom of every stack is the element's own: the layers that give a node and an edge
     * their appearance before anything else is asked for. They carry `source.by === "element"`
     * and `locked: true`, and removing, editing or moving one is refused. That is what a
     * consumer tests rather than the layer's NAME, which two layers may share and a reader may
     * change.
     */
    readonly styles: StylesApi;
    /**
     * The saved camera views, by name: camera states kept under a name of the consumer's
     * choosing. Saving and removing one are undoable steps; moving the camera to one is not.
     */
    readonly views: SessionViews;
    /** Which layout draws the graph, and in how many dimensions; choosing either is a step. */
    readonly layout: SessionLayout;
    /**
     * The element-owned node coordinates, read by dense node index, where a row no layout has
     * placed reads as unplaced rather than at the origin, with the verbs that place and pin nodes
     * as undoable steps.
     *
     * Place and pin through `set`, `pin` and `unpin`; the coordinates themselves are read-only
     * here, because a layout, a drag and a GPU readback write them and a write made there is not a
     * step.
     */
    readonly positions: SessionPositions;
    /**
     * How many nodes the DATA arrived carrying a coordinate for.
     *
     * Ask this, not `positions.placedCount`, whenever the question is "did the file place these
     * nodes". The array above is written by the importer AND by every running layout, so one
     * frame after a file with no coordinates loads, every node carries a position because the
     * layout put it there. This counts the importer's own column, which nothing else writes.
     */
    readonly seededNodeCount: number;
    /** The O(1) facts, always current. */
    readonly status: SessionStatus;
    /** Everything the element can offer, as data. */
    readonly catalog: SessionCatalogApi;
    /** The settings as they are now, and `set` to change the project ones. */
    readonly config: SessionConfig;
    /** What this machine can do, measured rather than guessed at by the consumer. */
    readonly capabilities: AccelerationCapabilities;
    /**
     * What the consumer asks of the hardware: use an accelerator when there is one, never look,
     * or refuse to run without one.
     *
     * Settable, and the set applies at once: the next piece of accelerated work is planned under
     * the new policy, and `capabilities:changed` reports where that left the hardware.
     */
    acceleration: AccelerationPolicy;
    /**
     * Attach an accelerator the caller built, or detach the current one with `null`.
     *
     * For tests and third parties. An injected accelerator is never replaced by a probed one and
     * is not disposed by the session -- whoever built it owns its lifetime.
     * @param accelerator - The accelerator to attach, or null to detach.
     */
    setAccelerator(accelerator: GraphAccelerator | null): void;
    /**
     * The current snapshot. Its structure, id map and attribute columns are the graph's own,
     * shared rather than copied; its `position` and `graphty.pinned` columns are copies taken
     * now, because the graph's own are written by the layout every frame and a write into them
     * would place nodes without a step. Place and pin through `session.positions`.
     * @returns the sealed graph-format snapshot
     */
    snapshot(): GraphSnapshot;
    /**
     * The topology fingerprint. Same answer as `data.fingerprint()`.
     * @returns the fingerprint
     */
    fingerprint(): string;
    /**
     * Do one thing, as a command.
     *
     * The same verb `runs.start` offers, reached through the serialisable form -- so a recipe, a
     * journal entry and an agent's tool call all replay through one door rather than three.
     * @param command - What to do.
     * @param options - The signal, the progress handler and how the call joins the queue.
     * @returns The run, awaitable and watchable straight away.
     */
    run(command: AlgorithmRunCommand, options?: RunOptions): Run;
    /**
     * Do any command in the vocabulary (`COMMANDS` in `@graphty/graphty-element/commands`).
     *
     * Returns the op's outcome directly, not wrapped in a promise; every outcome is itself
     * awaitable (a `Run` for `algo.run`), so `await session.execute(...)` waits for the command,
     * and a caller that wants the run handle keeps the returned value without awaiting it.
     * @param command - The command.
     * @returns Its outcome.
     */
    execute<C extends SessionCommand>(command: C): CommandOutcome<C>;
    /**
     * Undo the last step, or cancel pending undoable work dispatched after it instead. Never
     * waits for pending work. Resolves once the picture matches the state.
     * @returns What was done; `{ kind: "nothing" }` when there was nothing to undo.
     */
    undo(): Promise<HistoryOutcome>;
    /**
     * Redo the last undone step. Resolves once the picture matches the state.
     * @returns What was done; `{ kind: "nothing" }` when there was nothing to redo.
     */
    redo(): Promise<HistoryOutcome>;
    /** Whether `undo()` would do something: undo a step or cancel pending work. */
    readonly canUndo: boolean;
    /** Whether `redo()` would do something. */
    readonly canRedo: boolean;
    /** The steps, the cursor, the pending work and the budget. */
    readonly history: SessionHistory;
    /**
     * Run `fn`, and record everything it dispatches through `tx` as one step. Throw, or abort
     * the transaction, to roll all of it back. A transaction that changed nothing records
     * nothing.
     * @param label - The step's label.
     * @param fn - The body; `signal` fires when the transaction is aborted.
     * @param options - Provenance stamped on the step.
     * @returns What `fn` returned, once the step is recorded and the picture has caught up.
     */
    transaction<T>(
        label: string,
        fn: (tx: TransactionScope, signal: AbortSignal) => T | Promise<T>,
        options?: TransactionOptions,
    ): Promise<T>;
    /**
     * What one command would cost, answered synchronously.
     *
     * Synchronous because a user interface has to decide how a button behaves before the click
     * happens, and a promise cannot gate a click. It is O(1) in the size of the graph: the
     * session maintains the statistics it reads.
     * @param command - What would be done.
     * @returns The estimate, which reports `available: false` with a reason rather than throwing.
     */
    estimate(command: SessionCommand): CostEstimate;
    /**
     * What one command would do, what it would cost, and whether it would be allowed.
     * @param command - What would be done.
     * @returns The plan.
     */
    plan(command: SessionCommand): Promise<Plan>;
    /**
     * Watch the session.
     * @param event - Which event.
     * @param handler - Called with the event's detail.
     * @returns A function that stops the subscription. There is no `off` to learn.
     */
    on<K extends keyof SessionEventMap>(event: K, handler: (detail: SessionEventMap[K]) => void): () => void;
    /**
     * Release what this session owns: the accelerator it attached, the store it built, and every
     * run still in flight.
     *
     * A store handed in by a caller is NOT disposed -- the caller that built it owns its
     * lifetime. Calling this twice is harmless.
     */
    dispose(): void;
}

/**
 * The session as the element's own renderer holds it: everything a consumer sees, plus the two
 * live mask readers the render loop needs.
 *
 * Both extras exist for the same reason and it is a shape disagreement rather than a privilege.
 * A consumer reads the selection as a list of ids and the visible set as a set of ids; the render
 * loop needs the mask OBJECTS, so that it can test one element at a time and key its "have I
 * already drawn this?" bookkeeping on a mask's version without materialising a list of fifty
 * thousand ids every frame. Nothing here decides anything a consumer could not decide -- the
 * verbs are the same verbs -- which is why the renderer is not a privileged consumer, merely a
 * per-element one.
 */
export interface ElementSession extends GraphSession {
    /** The selection, with the synchronous door a gesture handler needs and the live masks. */
    readonly selection: SelectionOwner;
    /** Visibility, with the live masks. */
    readonly visibility: SessionVisibilityApi;
    /** The style stack, with the compiled form a repaint reads and a consumer has no use for. */
    readonly styles: SessionStylesApi;
    /**
     * What the last style pass painted, per element.
     *
     * The third member of the same shape disagreement. A consumer asks what one element looks
     * like through `styles.explain(...)`, which answers in whole sentences about layers; a render
     * loop asks fifty thousand times a second which source mesh an element belongs to and what
     * colour to write into its instance, and it asks by dense index. Neither the questions nor
     * the verbs differ -- the stack is still the one that decides -- only the shape of the answer.
     */
    readonly paint: ElementPaint;
}

/**
 * What {@link createGraphSession} accepts.
 *
 * The session is the only writer of its graph and its settings, which is what makes every change
 * undoable: hand data in through `session.data.import`, `addNodes` and `addEdges`, and settings
 * through `session.config.set`.
 */
export interface CreateGraphSessionOptions {
    /** The configuration. Every part not given takes the element's own default. */
    readonly config?: {
        /** The data configuration the session starts from; change it later with `config.set`. */
        readonly data?: SessionDataConfig;
        /** The acceleration policy and threshold. */
        readonly acceleration?: {
            /** Use an accelerator when available, never look, or refuse to run without one. */
            readonly policy?: AccelerationPolicy;
            /** The node count at or above which accelerated work uses the accelerator. */
            readonly minNodes?: number;
        };
    };
    /**
     * An acceleration controller to publish capabilities from, so a host that already owns one
     * does not end up with two. When absent the session builds one and disposes it with itself.
     */
    readonly acceleration?: AccelerationControllerLike;
    /** How this session runs algorithms. */
    readonly runs?: SessionRunsOptions;
}

/**
 * How a session runs algorithms.
 *
 * `execute` is the one member without a default, and the reason is worth stating: every algorithm
 * this package ships is constructed from the renderer's `Graph` and reads the graph through its
 * data manager, so the session -- which must resolve in Node with no renderer anywhere in its
 * import graph -- cannot reach one. The element builds the executor and hands it in. A session
 * built without one answers `runs.start` with `E_UNSUPPORTED` rather than pretending.
 */
export interface SessionRunsOptions {
    /**
     * The thing that actually runs an algorithm. Absent means this session cannot run one.
     */
    readonly execute?: RunExecutor;
    /**
     * The queue runs take their turn in. Absent builds a sequential one of the session's own,
     * which is right for a headless session and wrong for a rendered graph: a rendered graph has
     * loads, layouts and style passes that must not interleave with a run, and it hands in the
     * element's own operation queue so that they do not.
     */
    readonly queue?: RunQueue;
    /** Which versions are producing the numbers. Defaults to the element's own. */
    readonly engine?: EngineVersions;
    /** What a call that names no scope gets. Defaults to the visible graph. */
    readonly defaultScope?: Scope;
    /** The caveats a run starts from, before the work refines them. */
    readonly defaultCaveats?: Caveats;
    /** The cap and the memory budget the cost gate compares a run against. */
    readonly limits?: Readonly<CostGateLimits>;
    /** Reads this machine's measured throughput, when the host has measured it. */
    readonly calibration?: () => MachineCalibration | undefined;
    /** Reads the most recent timing of each algorithm on this machine. */
    readonly measurements?: () => ReadonlyMap<AlgorithmKey, CostMeasurement> | undefined;
}

/**
 * The part of the acceleration controller a session uses.
 *
 * Declared structurally so that a caller can hand in the controller it already holds without the
 * session naming the class, and so that a test can publish a fixed capability document.
 */
export interface AccelerationControllerLike {
    /** The published capabilities subset. */
    readonly capabilities: AccelerationCapabilities;
    /** What the consumer asked for. */
    readonly policy: AccelerationPolicy;
    /** The node count at or above which accelerated work uses the accelerator. */
    readonly minNodes: number;
    /**
     * Changes what the consumer asks of the hardware.
     * @param policy - The new policy.
     */
    setPolicy(policy: AccelerationPolicy): void;
    /**
     * Attaches an accelerator the caller built, or detaches the current one with `null`.
     * @param accelerator - The accelerator, or null to detach.
     */
    setAccelerator(accelerator: GraphAccelerator | null): void;
    /**
     * Watches every transition.
     * @param listener - Called with the new status.
     * @returns A function that stops the subscription.
     */
    onChange(listener: (status: AccelerationStatus) => void): () => void;
    /** Releases the hardware. */
    dispose(): void;
}

/** The largest number of component sizes {@link ComponentStatistics.sizes} will list. */
export const COMPONENT_SIZE_CAP = 1000;

/** How many sample values an {@link AttributeDescriptor} carries. */
export const ATTRIBUTE_SAMPLE_CAP = 5;

/**
 * Above this many distinct values an attribute stops being counted as a category, and
 * `uniqueCount` stops being tracked exactly.
 */
export const ATTRIBUTE_UNIQUE_CAP = 256;
