/**
 * @file Ingest: how records become the graph, with no renderer anywhere in reach.
 *
 * Id and endpoint extraction, the repeated-edge policy, weight resolution, the direction a file
 * declares, the import report and the chunked load all live here. What happens to a record once
 * the graph holds it -- a mesh, a place in the layout engine, an event -- is the host's business,
 * reached through {@link IngestHost}. `DataManager` is the element's host and keeps only that
 * render half; a headless session can be another.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM: `test/packaging/node-safe-entries.test.ts`
 * checks it.
 */

import { type DuplicatePolicy, INVALID_INDEX } from "@graphty/graph-format";
import jmespath from "jmespath";

import { unknownFormat } from "../../catalog/detect";
import { DataSource, type DeclaredDirection } from "../../data/DataSource";
import { readEndpoint, type ResolvedEndpoints, resolveEndpoints } from "../../data/endpoints";
import type { ErrorAggregator } from "../../data/ErrorAggregator";
import type { GraphStore } from "../../data/GraphStore";
import { type ImportReport, type ImportTally, newImportTally, sealImportReport } from "../../data/report";
import { GraphtyError, isGraphtyError } from "../../errors";
import { GraphtyLogger, type Logger } from "../../logging/GraphtyLogger.js";
import type { NodeIdType } from "../../Node";
import type { Styles } from "../../Styles";
import { DEFAULT_LIMITS } from "../limits";

/**
 * Whether a value may be used as a graph-format node id.
 *
 * graph-format accepts a string or a FINITE number and throws `E_INVALID_ID` for anything else
 * (`graph-format/src/ids/node-id-map.ts`). The element is looser: a node id is whatever the
 * configured JMESPath expression returns, which is `null` for a record that does not carry the
 * key at all, and the element has always let such a record through and rendered it. So the id is
 * CHECKED here rather than thrown on -- an unusable id leaves the render object exactly as it is
 * today and keeps it out of the store, which is the one place the id has to be real.
 * @param id - the extracted id
 * @returns true when graph-format will accept it
 */
function isStorableId(id: unknown): id is string | number {
    return typeof id === "string" || (typeof id === "number" && Number.isFinite(id));
}

/**
 * The file-unit coordinate a record carries, in the two shapes the element's own data has always
 * used, or null when it carries none.
 *
 * `{ x, y, z? }` is what `FixedLayoutEngine` reads off `node.data` today
 * (`src/layout/FixedLayoutEngine.ts`), and `[x, y]` / `[x, y, z]` is the array form the importers
 * produce. A missing z is 0, not NaN: a 2D record IS placed, on the z = 0 plane, and NaN is
 * reserved for "no layout has run".
 *
 * Anything non-finite makes the WHOLE record unseeded rather than partly seeded. A row stored with
 * one NaN component reports itself PLACED (`ElementPositions.isPlaced` tests x), so a layout would
 * never repair it and the mesh would vanish; left unseeded, the node is laid out like any other.
 * @param record - the raw node record
 * @returns the file-unit triple, or null when there is nothing usable to seed
 */
function readSeedPosition(record: Record<string | number, unknown>): [number, number, number] | null {
    const { position } = record;
    if (position === null || typeof position !== "object") {
        return null;
    }

    let x: unknown;
    let y: unknown;
    let z: unknown;
    if (Array.isArray(position)) {
        if (position.length !== 2 && position.length !== 3) {
            return null;
        }

        [x, y] = position;
        z = position.length === 3 ? position[2] : 0;
    } else {
        const vector = position as { x?: unknown; y?: unknown; z?: unknown };
        ({ x, y } = vector);
        z = vector.z ?? 0;
    }

    if (typeof x !== "number" || typeof y !== "number" || typeof z !== "number") {
        return null;
    }

    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
        return null;
    }

    return [x, y, z];
}

/**
 * Push one node record into the element's builder and seed its import position.
 *
 * The seed column keeps FILE units: `config.data.knownFields.positionScale` is applied by
 * `GraphStore` on every freeze, so a scale changed after a record arrived still reaches the scene
 * correctly from the same column.
 * @param store - the element's store
 * @param id - the node id, already extracted with JMESPath
 * @param record - the raw record
 * @returns the assigned node index -- `INVALID_INDEX` when the id is not one graph-format accepts
 *     -- and whether the builder already knew this id
 */
export function ingestNode(
    store: GraphStore,
    id: unknown,
    record: Record<string | number, unknown>,
): { index: number; merged: boolean } {
    if (!isStorableId(id)) {
        return { index: INVALID_INDEX, merged: false };
    }

    const before = store.builder.nodeCount;
    const index = store.builder.addNode(id);
    const merged = store.builder.nodeCount === before;

    const seed = readSeedPosition(record);
    if (seed !== null) {
        store.builder.setNodeValue(store.seedColumn, index, seed);
    }

    // EVERY mutating path touches, including this one when it was a merge: `builder.mutationCount`
    // counts neither a merge nor a column write, so a burst of merges would otherwise serve a stale
    // snapshot and fire no `snapshot-replaced` (DEP-M6-A).
    store.touch();
    return { index, merged };
}

/**
 * Resolve an edge weight: the configured path, then the legacy "value" key, then 1.
 *
 * The second probe exists because the conversion this replaced hard-coded a `value` weight key, so
 * every weighted dataset, fixture and story in this repository carries `value` and nothing carries
 * `weight`. Reading only the configured path would silently re-read all of them as unweighted.
 * The probe is removed once nothing ships a `value` key.
 * @param record - the raw edge record
 * @param path - `config.data.knownFields.edgeWeightPath`; null means "do not look"
 * @returns the weight and which probe produced it
 */
export function resolveEdgeWeight(
    record: Record<string | number, unknown>,
    path: string | null,
): { weight: number; source: "path" | "legacy" | "default" } {
    const fromPath = path === null ? undefined : record[path];
    if (typeof fromPath === "number" && Number.isFinite(fromPath)) {
        return { weight: fromPath, source: "path" };
    }

    const legacy = record.value;
    if (typeof legacy === "number" && Number.isFinite(legacy)) {
        return { weight: legacy, source: "legacy" };
    }

    return { weight: 1, source: "default" };
}

/**
 * Push one edge into the element's builder and stamp its element-assigned counter column.
 *
 * The builder is constructed with `addMissingNodes: true`, so an endpoint that has not arrived yet
 * is MATERIALISED here and the snapshot is complete while the render side is still catching up.
 * That is deliberate: the snapshot is the authoritative copy, and it must not be missing an edge
 * merely because a mesh has not been built for one of its endpoints.
 *
 * Note the argument order of `setEdgeValue`: `(column, edge, value)`. Swapping the first two is
 * `E_UNKNOWN_COLUMN` at run time in plain JavaScript; the branded `ColumnHandle` type is what makes
 * it a compile error here.
 * @param store - the element's store
 * @param srcId - source node id, already extracted with JMESPath
 * @param dstId - destination node id
 * @param weight - the resolved weight
 * @returns the logical edge index and the counter stamped into the edge's id column, or
 *     `INVALID_INDEX` for both when either id is not one graph-format accepts
 */
export function ingestEdge(
    store: GraphStore,
    srcId: unknown,
    dstId: unknown,
    weight: number,
): { index: number; edgeId: number } {
    if (!isStorableId(srcId) || !isStorableId(dstId)) {
        return { index: INVALID_INDEX, edgeId: INVALID_INDEX };
    }

    const index = store.builder.addEdge(srcId, dstId, weight);
    const edgeId = store.nextEdgeId();
    store.builder.setEdgeValue(store.edgeIdColumn, index, edgeId);
    store.touch();
    return { index, edgeId };
}

/**
 * What became of a file's declared direction when it reached the builder.
 *
 * - `applied`: the builder now holds the direction the file declared.
 * - `unchanged`: the builder already held it, so there was nothing to do.
 * - `config-wins`: `data.directed` was set explicitly, which locked the builder. The consumer
 *   settled the question and a file header does not overrule them.
 * - `edges-present`: the builder already holds edges, which is a direction graph-format will not
 *   reinterpret in place. This is a second file loaded into a graph that the first file, or
 *   pushed records, already filled.
 */
type DirectionOutcome = "applied" | "unchanged" | "config-wins" | "edges-present";

/**
 * Give the builder the direction a file declared, without ever overruling the consumer.
 *
 * THE PRECEDENCE, highest first: an explicit `config.data.directed`, then the file's own header,
 * then the builder's constructor value. `GraphStore` implements the first rung by calling
 * `lockDirected()` for an explicit boolean and NOT calling it under `"auto"`, so
 * `builder.directedLocked` is exactly "the consumer has settled this" and is the flag this reads.
 * Locked is checked rather than caught, because `setDirected` on a locked builder whose value
 * differs throws `E_DIRECTED` -- turning a consumer's perfectly legitimate `directed: false` plus
 * a directed file into a failed import.
 *
 * A builder that already holds edges is refused for the same reason and not as a policy choice:
 * graph-format accepts directed -> undirected only while the builder is empty, and accepts
 * undirected -> directed with live edges only by MIRRORING every edge it holds, which would
 * silently double the first file's edge count when a second file disagreed with it. So the first
 * thing that settles the direction of a non-empty graph keeps it, and the caller is told.
 * @param store - the element's store
 * @param directed - the direction the file declared
 * @param statedBy - the text in the file that declared it, recorded on the store so a consumer can
 *     be told not only what the graph is but what said so
 * @returns what happened, for the caller to log
 */
export function ingestDeclaredDirection(store: GraphStore, directed: boolean, statedBy: string): DirectionOutcome {
    const { builder } = store;
    if (builder.directed === directed) {
        // The file agreed with what the builder already held, which is still the file SETTLING the
        // direction -- unless the configuration had locked it, in which case the agreement is a
        // coincidence and the consumer is the one who decided.
        if (!builder.directedLocked) {
            store.recordDirectionFromFile(statedBy);
        }

        return "unchanged";
    }

    if (builder.directedLocked) {
        return "config-wins";
    }

    if (builder.edgeCount > 0) {
        return "edges-present";
    }

    builder.setDirected(directed);
    store.recordDirectionFromFile(statedBy);
    // The direction is frozen into the snapshot, and `builder.mutationCount` is not what the store
    // keys its cache on (see GraphStore.touch), so without this a snapshot taken before the
    // declaration -- an empty one, taken by a consumer asking for statistics during the load --
    // would still be served after it.
    store.touch();
    return "applied";
}

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

/** An edge the graph already holds, as the host hands it back; the host may carry more. */
interface KnownEdge {
    /** The edge's index in the builder. */
    readonly edgeIndex: number;
}

/** One edge record the store has just taken. */
export interface StoredEdge {
    /** The raw edge record. */
    readonly record: Record<string | number, unknown>;
    /** The source endpoint id, resolved once for the batch. */
    readonly sourceId: NodeIdType;
    /** The target endpoint id, resolved once for the batch. */
    readonly targetId: NodeIdType;
    /** The edge's index in the builder. */
    readonly edgeIndex: number;
    /** The counter the store stamped into this edge's id column. */
    readonly edgeId: number;
}

/**
 * What ingest needs from whoever draws the graph.
 *
 * Every question about an edge the graph already holds comes here because the host is what knows
 * both halves of it: an edge with a render object and an edge still waiting for its endpoints. A
 * repeat policy has to be able to reach both -- a `sum` that ignored a waiting edge would lose a
 * weight, and a `first` that ignored it would create the second edge it exists to prevent.
 * @template K - the host's own description of an existing edge
 */
export interface IngestHost<K extends KnownEdge> {
    /** The store records are written into; asked each time, because clearing replaces it. */
    store(): GraphStore;
    /** The data configuration; asked each time, because the element edits it in place. */
    dataConfig(): Styles["config"]["data"];
    /** Whether a node with this id is already held, so a re-supplied node is skipped. */
    hasNode(id: NodeIdType): boolean;
    /** How many nodes are held, for the ceiling. */
    nodeCount(): number;
    /** Every edge between one ordered pair, oldest first. */
    edgesBetween(sourceId: NodeIdType, targetId: NodeIdType): readonly K[];
    /** The edge occupying one store row, or null. */
    edgeAt(edgeIndex: number): K | null;
    /** Replace the attributes an existing edge carries (the `last` repeat policy). */
    replaceEdgeRecord(known: K, record: Record<string | number, unknown>): void;
    /** A node the store has just taken; `index` is `INVALID_INDEX` for an id it will not hold. */
    nodeStored(id: NodeIdType, record: Record<string | number, unknown>, index: number): void;
    /** An edge the store has just taken. */
    edgeStored(edge: StoredEdge): void;
    /** A non-empty batch of node records has been ingested. */
    nodesArrived(count: number): void;
    /** A non-empty batch of edge records has been ingested. */
    edgesArrived(count: number): void;
    /** A chunk of a load has been ingested. */
    loadProgress(progress: LoadProgress): void;
    /** A load finished and its source counted errors along the way. */
    loadErrors(format: string, errors: ErrorAggregator): void;
    /** A load finished. */
    loadComplete(format: string, report: ImportReport, progress: LoadProgress, duration: number, errors: number): void;
    /** A load failed after `progress.chunks` chunks. */
    loadFailed(format: string, error: Error, progress: LoadProgress): void;
}

/** How far a load has got. */
interface LoadProgress {
    /** The data source being read. */
    readonly format: string;
    /** The file size the caller passed, when it passed one. */
    readonly fileSize: number | undefined;
    /** Node RECORDS the source has handed over so far. */
    readonly nodeRecords: number;
    /** Edge RECORDS the source has handed over so far. */
    readonly edgeRecords: number;
    /** Chunks ingested so far. */
    readonly chunks: number;
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
 * Turns node and edge records, and whole data sources, into the graph a host holds.
 *
 * One per graph. It keeps what outlives a single call: the record identifiers already seen, the
 * last import report, and -- while a load is in progress -- the load's tally and the endpoint
 * spelling its first edge chunk settled on.
 * @template K - the host's own description of an existing edge
 */
export class Ingest<K extends KnownEdge> {
    private readonly logger: Logger = GraphtyLogger.getLogger(["graphty", "data"]);

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
     * Start with no records seen and no report.
     * @param host - what draws the graph, and knows which edges it already holds
     */
    constructor(private readonly host: IngestHost<K>) {}

    /**
     * What the last load did: which endpoint spelling answered, how many repeats were seen and
     * what the policy did with them, and how many edges the graph actually holds.
     * @returns the report, or null when nothing has been loaded into this graph
     */
    get lastImport(): ImportReport | null {
        return this.importReport;
    }

    /** Forget everything about the graph that was: called when the host discards its store. */
    reset(): void {
        this.edgesByRecordId.clear();
        this.importReport = null;
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
        const query = idPath ?? this.host.dataConfig().knownFields.nodeIdPath;

        // The ids first, so the ceiling is checked against the nodes this batch would ADD (a
        // re-supplied node costs nothing) and checked before any of them is created: a batch
        // the renderer cannot hold is refused whole, not half-applied.
        const ids = nodes.map((node) => jmespath.search(node, query) as NodeIdType);
        const fresh = new Set(ids.filter((id) => !this.host.hasNode(id)));
        this.refuseAboveCeiling("nodes", this.host.nodeCount(), fresh.size, DEFAULT_LIMITS.renderCeiling);

        for (const [i, node] of nodes.entries()) {
            const nodeId = ids[i];

            if (this.host.hasNode(nodeId)) {
                continue;
            }

            // The store is what gives the node its dense row; INVALID_INDEX comes back for an id
            // graph-format will not take, and the host draws the node anyway.
            this.host.nodeStored(nodeId, node, ingestNode(this.host.store(), nodeId, node).index);
        }

        if (nodes.length > 0) {
            this.host.nodesArrived(nodes.length);
        }
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

        const { knownFields } = this.host.dataConfig();
        const store = this.host.store();
        const endpoints = this.endpointsFor(edges, options);
        const policy = options?.repeated ?? knownFields.repeatedEdges;
        const recordIdPath = knownFields.edgeIdPath;
        const weightPath = knownFields.edgeWeightPath;
        const tally = this.loadTally ?? newImportTally();
        let legacyWeights = 0;

        // Decided before any record is stored: a batch the renderer cannot hold is refused whole,
        // so a caller never finds the first part of it held and the rest missing.
        this.refuseAboveCeiling(
            "edges",
            store.builder.edgeCount,
            this.edgesAdded(edges, endpoints, policy, false),
            DEFAULT_LIMITS.edgesDrawn,
        );

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
            const { index: edgeIndex, edgeId } = ingestEdge(store, srcNodeId, dstNodeId, weight.weight);
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

            this.host.edgeStored({ record: edge, sourceId: srcNodeId, targetId: dstNodeId, edgeIndex, edgeId });
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

        if (edges.length > 0) {
            this.host.edgesArrived(edges.length);
        }
    }

    /**
     * Refuse a replacement edge set the renderer cannot hold, before the caller removes anything.
     *
     * Removing first and letting `addEdges` refuse would leave a host that assigned too many edges
     * with its old edges gone and none of the new ones held, which is neither the graph it had nor
     * the one it asked for. The new batch is counted against an emptied graph, since the old edges
     * are what it replaces; a pending edge, whose endpoints have not arrived, survives the replace.
     * @param edges - the edges the graph should hold afterwards
     * @param replaced - how many held edges the replacement removes
     * @param options - the endpoint expressions and the repeat policy for this call
     * @throws A `GraphtyError` with `E_TOO_LARGE` when the new set is past the ceiling.
     */
    refuseReplacement(edges: Record<string | number, unknown>[], replaced: number, options?: AddEdgesOptions): void {
        const surviving = this.host.store().builder.edgeCount - replaced;
        const policy = options?.repeated ?? this.host.dataConfig().knownFields.repeatedEdges;
        this.refuseAboveCeiling(
            "edges",
            surviving,
            this.edgesAdded(edges, this.endpointsFor(edges, options), policy, true),
            DEFAULT_LIMITS.edgesDrawn,
        );
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

        const { knownFields } = this.host.dataConfig();
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
    private knownEdgeFor(sourceId: NodeIdType, targetId: NodeIdType, recordId: unknown): K | null {
        if (isStorableRecordId(recordId)) {
            // A record identifier is a stronger statement than a repeated pair: the consumer said
            // these two records are the same edge.
            const edgeIndex = this.edgesByRecordId.get(recordId);
            return edgeIndex === undefined ? null : this.host.edgeAt(edgeIndex);
        }

        // The oldest edge between the pair is the one a merge policy folds into, so that `first`
        // and `last` mean what they say when three records name one pair.
        return this.host.edgesBetween(sourceId, targetId)[0] ?? null;
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
        known: K,
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

        const store = this.host.store();
        const survivorWeight = store.builder.edgeWeight(known.edgeIndex);
        const merged = mergeWeights(policy, survivorWeight, weight);
        store.builder.setEdgeWeight(known.edgeIndex, merged);
        store.touch();

        if (policy === "last") {
            // "the repeat's weight and attributes replace the existing edge's". The other three
            // reducers keep the survivor's attributes, because there is no reading of `sum` under
            // which the last record's colour is the group's colour.
            this.host.replaceEdgeRecord(known, record);
        }

        tally.repeatedMerged++;
        return true;
    }

    /**
     * How many edges a batch would add, by the same tests the ingest loop applies.
     *
     * A record whose endpoint ids graph-format will not store adds nothing (the loop rejects it).
     * Under the `keep` policy every other record is an edge. Under a folding policy a record that
     * repeats an edge the graph holds, or a record earlier in the same batch, folds into it and
     * adds nothing; a repeat is named the way `knownEdgeFor` names it, by record id when one is
     * configured and stored, else by the ordered endpoint pair.
     * @param edges - the batch
     * @param endpoints - the batch's endpoint expressions
     * @param policy - the repeat policy the batch is under
     * @param replacing - true when every held edge is about to be removed, so none of them can be
     *     repeated
     * @returns the number of edges the batch would add
     */
    private edgesAdded(
        edges: readonly Record<string | number, unknown>[],
        endpoints: ResolvedEndpoints,
        policy: DuplicatePolicy,
        replacing: boolean,
    ): number {
        const recordIdPath = this.host.dataConfig().knownFields.edgeIdPath;
        const seenIds = new Set<string | number>();
        const seenPairs = new Map<NodeIdType, Set<NodeIdType>>();
        let adding = 0;

        for (const edge of edges) {
            const srcNodeId = readEndpoint(edge, endpoints.source);
            const dstNodeId = readEndpoint(edge, endpoints.target);
            if (!isStorableId(srcNodeId) || !isStorableId(dstNodeId)) {
                continue;
            }

            if (policy !== "keep") {
                const recordId = recordIdPath === null ? undefined : readEndpoint(edge, recordIdPath);
                if (!replacing && this.knownEdgeFor(srcNodeId, dstNodeId, recordId) !== null) {
                    continue;
                }

                const pairs = seenPairs.get(srcNodeId) ?? new Set<NodeIdType>();
                seenPairs.set(srcNodeId, pairs);
                const repeatsBatch = isStorableRecordId(recordId) ? seenIds.has(recordId) : pairs.has(dstNodeId);
                if (repeatsBatch) {
                    continue;
                }

                if (isStorableRecordId(recordId)) {
                    seenIds.add(recordId);
                }

                pairs.add(dstNodeId);
            }

            adding++;
        }

        return adding;
    }

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

        const store = this.host.store();
        const outcome: DirectionOutcome = ingestDeclaredDirection(store, declaration.directed, declaration.statedBy);
        if (outcome === "config-wins") {
            this.logger.info("File declares a direction the configuration has already settled", {
                type,
                fileDeclares: declaration.directed,
                statedBy: declaration.statedBy,
                configuredDirected: store.builder.directed,
            });
        } else if (outcome === "edges-present") {
            // Not a warning a consumer can act on by changing their configuration: it means this
            // file arrived into a graph that already had edges, and the direction of a graph that
            // already holds edges is not something graph-format will reinterpret in place.
            this.logger.warn("File declares a direction the graph has already been built with", {
                type,
                fileDeclares: declaration.directed,
                statedBy: declaration.statedBy,
                graphDirected: store.builder.directed,
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
        // Get file size for progress tracking (if available)
        let progress: LoadProgress = {
            format: type,
            fileSize: (opts as { size?: number }).size,
            nodeRecords: 0,
            edgeRecords: 0,
            chunks: 0,
        };

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

                    progress = {
                        ...progress,
                        nodeRecords: progress.nodeRecords + chunk.nodes.length,
                        edgeRecords: progress.edgeRecords + chunk.edges.length,
                        chunks: progress.chunks + 1,
                    };
                    this.host.loadProgress(progress);
                }

                const errors = source.getErrorAggregator();
                if (errors.getErrorCount() > 0) {
                    this.host.loadErrors(type, errors);
                }

                const duration = Date.now() - startTime;
                const errorCount = errors.getErrorCount();

                // The number a consumer is told is the number of edges the graph HOLDS, which is
                // what `edgesLoaded` has always claimed to be and never was: it counted records
                // handed over, so it reported 254 for a file that produced zero edges. The old
                // meaning survives, under its true name, as `report.counts.edgeRecords`.
                const report = this.sealLoad(type, tally);

                this.logger.info("Data source loading complete", {
                    nodeRecords: progress.nodeRecords,
                    nodesLoaded: report.counts.nodes,
                    edgeRecords: progress.edgeRecords,
                    edgesLoaded: report.counts.edges,
                    endpointsResolvedFrom: report.endpoints.resolvedFrom,
                    duration,
                    chunks: progress.chunks,
                    errors: errorCount,
                });

                this.host.loadComplete(type, report, progress, duration, errorCount);
            } catch (error) {
                const failure = error instanceof Error ? error : new Error(String(error));
                this.logger.error("Data source loading failed", failure, {
                    type,
                    chunksProcessed: progress.chunks,
                    nodeRecordsLoaded: progress.nodeRecords,
                    edgeRecordsLoaded: progress.edgeRecords,
                });

                this.host.loadFailed(type, failure, progress);

                // A coded failure travels out UNCHANGED. Wrapping it in a plain Error destroyed
                // the `code` a caller switches on, so `await graph.addDataFromSource(...)` was
                // the one route where a reader's parse failure arrived as an unclassifiable
                // string while the same failure on the event channel arrived as E_PARSE_FAILED.
                if (isGraphtyError(error)) {
                    throw error;
                }

                throw new Error(
                    `Failed to load data from source '${type}' after ${progress.chunks} chunks: ${failure.message}`,
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
        const { knownFields } = this.host.dataConfig();
        const endpoints = this.loadEndpoints ?? {
            // A file with no edge records at all: nothing was probed, so nothing was decided, and
            // saying "source/target" would be reporting a decision that was never made.
            source: knownFields.edgeSrcIdPath ?? "source",
            target: knownFields.edgeDstIdPath ?? "target",
            resolvedFrom: "source/target" as const,
        };

        const report = sealImportReport(tally, {
            format,
            endpoints,
            policy: knownFields.repeatedEdges,
            ...this.heldCounts(),
        });
        this.importReport = report;
        return report;
    }

    /**
     * What the graph HOLDS right now, as the report and the session's own counts both mean it.
     *
     * Read off the builder rather than off the host's render objects, and that is the whole
     * point: an edge endpoint the file never declared as a node is created by the builder, so it
     * is in the graph and in `session.status.counts.nodes` while having no render `Node`. Counting
     * the render objects made the report say two nodes for a load the session reported three for
     * -- one load, two numbers, disagreeing, which is the defect this report exists to end rather
     * than to repeat one level down.
     * @returns the node and edge counts the graph holds
     */
    private heldCounts(): { nodes: number; edges: number } {
        const { builder } = this.host.store();
        return { nodes: builder.nodeCount, edges: builder.edgeCount };
    }

    /**
     * Refuse to grow past what the renderer can draw, instead of freezing the tab.
     *
     * WHY A REFUSAL AND NOT A DEGRADED DRAW. The design says that above the render ceiling the
     * element draws a smaller render set, and above `edgesDrawn` it hides edges until the view
     * narrows. Neither exists yet. What exists is a renderer that, past these counts, exhausts
     * the renderer process and produces no further frame -- measured for issue #405 at 18,000
     * nodes / 180,000 edges on an RTX 4070 SUPER, where the renderer process reached 4.7 GB and
     * died while 17,000 / 170,000 loaded in 17 s. Until the degraded draw lands, the honest
     * behaviour at the ceiling is a coded error the consumer can show, so `DEFAULT_LIMITS` is
     * the number the element enforces rather than a number it merely publishes.
     *
     * `E_TOO_LARGE` is the code because the ceiling is a hard limit of this renderer, and the
     * caller's remedy is the one that code names: load a subset.
     * @param of - what is being counted
     * @param held - how many the graph holds already
     * @param adding - how many this call would add
     * @param limit - the most the renderer can draw
     * @throws A `GraphtyError` with `E_TOO_LARGE` when `held + adding` is past the limit
     */
    private refuseAboveCeiling(of: "nodes" | "edges", held: number, adding: number, limit: number): void {
        if (held + adding <= limit) {
            return;
        }

        const { nodes, edges } = this.heldCounts();
        throw new GraphtyError({
            code: "E_TOO_LARGE",
            source: "data",
            message:
                `Loading ${adding.toLocaleString("en-US")} more ${of} would take the graph to ` +
                `${(held + adding).toLocaleString("en-US")}, past the ${limit.toLocaleString("en-US")} ` +
                `this renderer can draw. Load a subset of the graph.`,
            details: { limit, count: held + adding, of, graph: { nodes, edges } },
        });
    }
}
