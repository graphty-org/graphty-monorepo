/**
 * Direction resolution through the sink (design sections 3.6 and 8.4, decision D-DIR): the
 * importer reads the file's header direction, calls `sink.setDirected()` once before the first
 * edge, then pushes every edge as it is read. Mixed files are handled per `onMixedDirection`:
 *
 * - "expand" (default): an undirected edge into a directed sink becomes two logical edges linked
 *   by the `graphty.pair` column with `graphty.directed` = false on both halves; a directed edge
 *   into an undirected sink triggers ONE `setDirected(true, { expand: true })`, after which the
 *   builder has expanded everything pushed so far and the importer continues in directed mode.
 * - "directed" / "undirected": every edge is treated that way (the distinction is dropped and
 *   reported once, with the count).
 * - "error": the first edge whose direction differs from the sink's aborts the import.
 *
 * A locked or non-empty sink wins over the file (design section 8.4 precedence): a refused
 * `setDirected` is recorded as a coercion issue and the importer continues with `sink.directed`,
 * expanding every edge that differs. A GEXF `mutual` edge expands like an undirected one with the
 * additional `graphty.mutual` role column set on its primary half.
 *
 * The reserved columns are declared with exactly the builder's own declarations so that a sink the
 * builder already expanded hands back the existing handles.
 */

import {
    type Column,
    type ColumnDecl,
    type ColumnHandle,
    GraphFormatError,
    type GraphSink,
    type GraphSnapshot,
    INVALID_INDEX,
    type NodeId,
} from "@graphty/graph-format";

import { DIRECTION_FORCED_CODE, DIRECTION_REFUSED_CODE, MIXED_DIRECTION_CODE } from "./codes.js";
import { type ImportReportBuilder } from "./report.js";

/**
 * The direction of one source edge.
 * @public
 * @category Plugin helpers
 */
export type EdgeKind = "directed" | "undirected" | "mutual";

/**
 * Where an edge or header was read, for issues.
 * @public
 * @category Plugin helpers
 */
export interface EdgeLocation {
    /** The 1-based line, when known. */
    readonly line?: number | null | undefined;
    /** The edge id or another element name, when known. */
    readonly element?: string | null | undefined;
}

/**
 * The name of the bool edge column that, in a graph with both directed and undirected edges, says
 * which edges were directed in the file (true) and which were undirected (false).
 * @category Plugin helpers
 */
export const DIRECTED_COLUMN = "graphty.directed";

/**
 * The name of the edge column that links the two edges an undirected edge is stored as, in a graph
 * with both directed and undirected edges: each holds the index of the other.
 * @category Plugin helpers
 */
export const PAIR_COLUMN = "graphty.pair";

/**
 * The name of the bool edge column that marks a GEXF `mutual` edge.
 * @category Plugin helpers
 */
export const MUTUAL_COLUMN = "graphty.mutual";

export { DIRECTION_FORCED_CODE, DIRECTION_REFUSED_CODE, MIXED_DIRECTION_CODE };

const DIRECTED_DECL: ColumnDecl = { name: DIRECTED_COLUMN, dtype: "bool", role: "directed" };
const PAIR_DECL: ColumnDecl = { name: PAIR_COLUMN, dtype: "u32", role: "pair", refersTo: "edge" };
const MUTUAL_DECL: ColumnDecl = { name: MUTUAL_COLUMN, dtype: "bool", role: "mutual" };

/**
 * Adds edges to the sink and handles files whose edges have different directions, the way
 * `onMixedDirection` asks. Make one per import call, call `setHeader()` once with the direction the
 * file declares, then `addEdge()` for each edge. In a directed graph an undirected edge is stored as
 * two edges, one each way, linked so an exporter writes them back as one.
 * @category Writing a format
 */
export class DirectionResolver {
    private readonly sink: GraphSink;

    private readonly report: ImportReportBuilder;

    private readonly policy: "expand" | "directed" | "undirected" | "error";

    private directedHandle: ColumnHandle = INVALID_INDEX as ColumnHandle;

    private pairHandle: ColumnHandle = INVALID_INDEX as ColumnHandle;

    private mutualHandle: ColumnHandle = INVALID_INDEX as ColumnHandle;

    /** The first edge index this resolver pushed, for the backfill of graphty.directed; -1 before the first. */
    private firstEdge = -1;

    /** The next edge index this resolver expects to receive (contiguity between compactions, I16). */
    private nextEdge = -1;

    private forcedCount = 0;

    private headerSet = false;

    private mirrorOfLast: number = INVALID_INDEX;

    /**
     * Create a resolver.
     * @param sink - the sink edges are pushed into
     * @param report - the report issues are recorded in
     * @param policy - the resolved onMixedDirection option
     */
    constructor(sink: GraphSink, report: ImportReportBuilder, policy: "expand" | "directed" | "undirected" | "error") {
        this.sink = sink;
        this.report = report;
        this.policy = policy;
    }

    /**
     * The sink's current direction.
     * @returns true when directed
     */
    get directed(): boolean {
        return this.sink.directed;
    }

    /**
     * Whether the graph holds undirected edges stored as two edges.
     * @returns true once the first such edge was added
     */
    get expanded(): boolean {
        return this.pairHandle !== INVALID_INDEX;
    }

    /**
     * Set the graph's direction before the first edge: the direction the file declares, or the
     * `defaultDirected` option for a file that declares none. Under `onMixedDirection` "directed" or
     * "undirected" that direction is used instead, with a warning when it differs. When the sink
     * cannot change direction (a caller's builder that already holds edges or was locked), the
     * sink's direction stands and a warning is recorded.
     * @param headerDirected - the direction the file declares (or the default)
     * @param where - the line of the header, when known
     */
    setHeader(headerDirected: boolean, where?: EdgeLocation): void {
        this.headerSet = true;
        let wanted = headerDirected;
        if (this.policy === "directed" || this.policy === "undirected") {
            wanted = this.policy === "directed";
            if (wanted !== headerDirected) {
                this.report.warning(
                    "coercion",
                    DIRECTION_FORCED_CODE,
                    `the file declares ${direction(headerDirected)} edges; read as ${direction(wanted)} per onMixedDirection`,
                    { line: where?.line ?? null },
                );
            }
        }
        const { sink } = this;
        if (sink.directed === wanted) {
            this.adoptExisting();
            return;
        }
        try {
            if (wanted && sink.edgeCount > 0 && !sink.directedLocked) {
                const before = sink.edgeCount;
                sink.setDirected(true, { expand: true });
                this.adoptExpansionColumns();
                this.report.counts.expandedMixed += before;
            } else {
                sink.setDirected(wanted);
            }
        } catch (err) {
            if (!(err instanceof GraphFormatError) || err.code !== "E_DIRECTED") {
                throw err;
            }
            this.report.warning(
                "coercion",
                DIRECTION_REFUSED_CODE,
                `the file is ${direction(wanted)} but the sink is ${direction(sink.directed)} (${reasonOf(err)}); read as ${direction(sink.directed)}`,
                { line: where?.line ?? null },
            );
        }
        this.adoptExisting();
    }

    /**
     * Pick up reserved columns a caller's sink already holds (an earlier expansion), so every edge
     * pushed from now on gets its graphty.directed value.
     */
    private adoptExisting(): void {
        if (this.pairHandle === INVALID_INDEX && this.sink.edgeColumn(PAIR_COLUMN) !== INVALID_INDEX) {
            this.adoptExpansionColumns();
        }
    }

    /**
     * The second edge of the edge the last addEdge() call added, when that edge was stored as two;
     * otherwise INVALID_INDEX (4294967295). An edge attribute or weight you set after addEdge()
     * belongs on both: set it on the index addEdge() returned and, when this is not INVALID_INDEX,
     * on this index too.
     * @returns the second edge's index, or INVALID_INDEX
     */
    get lastMirror(): number {
        return this.mirrorOfLast;
    }

    /**
     * Add one edge. An edge with the graph's direction is added as it is; one with the other
     * direction is stored as two edges, given the graph's direction, or refused, as
     * `onMixedDirection` says. When it is stored as two, the return value is the first and
     * `lastMirror` the second.
     * @param source - the source id
     * @param target - the target id
     * @param kind - the edge's direction in the file
     * @param weight - the weight, or undefined when the file gives none
     * @param where - the line and element, for issues
     * @returns the index of the edge added (the first one, when it was stored as two)
     */
    addEdge(source: NodeId, target: NodeId, kind: EdgeKind, weight?: number, where?: EdgeLocation): number {
        if (!this.headerSet) {
            throw new GraphFormatError("E_DIRECTED", "DirectionResolver.setHeader() must run before the first edge", {
                reason: "header not set",
            });
        }
        const { sink } = this;
        this.mirrorOfLast = INVALID_INDEX;
        const edgeDirected = kind !== "undirected";
        if (edgeDirected === sink.directed && kind !== "mutual") {
            const e = sink.addEdge(source, target, weight);
            this.track(e);
            if (this.directedHandle !== INVALID_INDEX) {
                sink.setEdgeValue(this.directedHandle, e, edgeDirected);
            }
            return e;
        }
        switch (this.policy) {
            case "directed":
            case "undirected": {
                // the sink's direction is the policy's (or a locked sink's); the edge is pushed as the sink's kind
                this.forcedCount++;
                this.report.warnOnce(
                    "coercion",
                    DIRECTION_FORCED_CODE,
                    `${kind} edges read as ${direction(sink.directed)} per onMixedDirection`,
                    where,
                );
                const e = sink.addEdge(source, target, weight);
                this.track(e);
                if (this.directedHandle !== INVALID_INDEX) {
                    sink.setEdgeValue(this.directedHandle, e, sink.directed);
                }
                return e;
            }
            case "error":
                this.report.error(
                    "validation-error",
                    MIXED_DIRECTION_CODE,
                    `${kind} edge in a ${direction(sink.directed)} graph (onMixedDirection: "error")`,
                    where,
                );
                throw this.report.abort("mixed direction refused", { code: MIXED_DIRECTION_CODE });
            case "expand":
                return this.expand(source, target, kind, weight, where);
            default: {
                const name: string = this.policy;
                throw new GraphFormatError("E_UNSUPPORTED", `unknown onMixedDirection ${name}`, {
                    option: "onMixedDirection",
                    found: name,
                });
            }
        }
    }

    /**
     * How many edges were given a direction other than their own, under `onMixedDirection`
     * "directed" or "undirected".
     * @returns the count
     */
    get forced(): number {
        return this.forcedCount;
    }

    /**
     * Expand one edge that differs from the sink's direction.
     * @param source - the source id
     * @param target - the target id
     * @param kind - the edge's direction in the file
     * @param weight - the weight, or undefined
     * @param where - the line and element, for issues
     * @returns the primary edge index
     */
    private expand(
        source: NodeId,
        target: NodeId,
        kind: EdgeKind,
        weight: number | undefined,
        where: EdgeLocation | undefined,
    ): number {
        const { sink } = this;
        if (!sink.directed) {
            // a directed (or mutual) edge into an undirected sink: expand the sink once
            try {
                const before = sink.edgeCount;
                sink.setDirected(true, { expand: true });
                this.adoptExpansionColumns();
                this.report.counts.expandedMixed += before;
            } catch (err) {
                if (!(err instanceof GraphFormatError) || err.code !== "E_DIRECTED") {
                    throw err;
                }
                this.report.error(
                    "coercion",
                    DIRECTION_REFUSED_CODE,
                    `${direction(true)} edge in a locked ${direction(false)} sink cannot be expanded`,
                    where,
                );
                throw this.report.abort("the sink refused the expansion to directed", {
                    code: DIRECTION_REFUSED_CODE,
                    reason: err.details.reason,
                });
            }
            if (kind === "directed") {
                const e = sink.addEdge(source, target, weight);
                this.track(e);
                sink.setEdgeValue(this.directedHandle, e, true);
                return e;
            }
        }
        this.ensureExpansionColumns();
        const first = sink.addEdge(source, target, weight);
        this.track(first);
        const mutual = kind === "mutual";
        sink.setEdgeValue(this.directedHandle, first, mutual);
        this.report.counts.expandedMixed++;
        if (mutual) {
            this.ensureMutualColumn();
            sink.setEdgeValue(this.mutualHandle, first, true);
        }
        const u = sink.indexOf(source);
        const v = sink.indexOf(target);
        if (u === v) {
            // an undirected self-loop is one arc (I7); the builder does not mirror it either
            return first;
        }
        const mirror = sink.addEdge(target, source, weight);
        this.track(mirror);
        this.mirrorOfLast = mirror;
        sink.setEdgeValue(this.directedHandle, mirror, mutual);
        sink.setEdgeValue(this.pairHandle, first, mirror);
        sink.setEdgeValue(this.pairHandle, mirror, first);
        return first;
    }

    /**
     * Note an edge index this resolver pushed, for the backfill of graphty.directed.
     * @param e - the edge index
     */
    private track(e: number): void {
        if (this.firstEdge < 0) {
            this.firstEdge = e;
        }
        this.nextEdge = e + 1;
    }

    /**
     * Pick up the reserved columns the builder wrote during its own expansion.
     */
    private adoptExpansionColumns(): void {
        this.directedHandle = this.sink.declareEdgeColumn(DIRECTED_DECL);
        this.pairHandle = this.sink.declareEdgeColumn(PAIR_DECL);
    }

    /**
     * Declare the reserved columns on first use in a directed sink and backfill graphty.directed
     * = true for every edge this resolver pushed so far (they were directed in the source).
     */
    private ensureExpansionColumns(): void {
        if (this.pairHandle !== INVALID_INDEX) {
            return;
        }
        this.directedHandle = this.sink.declareEdgeColumn(DIRECTED_DECL);
        this.pairHandle = this.sink.declareEdgeColumn(PAIR_DECL);
        if (this.firstEdge >= 0) {
            for (let e = this.firstEdge; e < this.nextEdge; e++) {
                this.sink.setEdgeValue(this.directedHandle, e, true);
            }
        }
    }

    /** Declare graphty.mutual on first use. */
    private ensureMutualColumn(): void {
        if (this.mutualHandle === INVALID_INDEX) {
            this.mutualHandle = this.sink.declareEdgeColumn(MUTUAL_DECL);
        }
    }
}

/**
 * The reason of a refused setDirected(), for messages.
 * @param err - the E_DIRECTED error
 * @returns details.reason when it is a string, "refused" otherwise
 */
function reasonOf(err: GraphFormatError): string {
    const { reason } = err.details;
    return typeof reason === "string" ? reason : "refused";
}

/**
 * The word for a direction, for messages.
 * @param directed - the direction
 * @returns "directed" or "undirected"
 */
function direction(directed: boolean): string {
    return directed ? "directed" : "undirected";
}

// ============================================================ the exporter side

/**
 * What an exporter needs to know about edge direction, from `pairFolding(snapshot)`. In a graph
 * with both directed and undirected edges, each undirected edge is stored as two edges, one each
 * way. `folded(e)` tells you which of the two to skip, so the edge is written once, and
 * `sourceDirected(e)` whether an edge was directed. A GEXF `mutual` edge is also stored as two
 * edges; it is written as two directed edges unless you pass `foldMutual: true`.
 * @public
 * @category Plugin helpers
 */
export interface PairFolding {
    /** Whether the graph holds any edge stored as two edges. When false, every method answers as for a plain edge. */
    readonly expanded: boolean;
    /** How many GEXF mutual edges the graph holds, each counted once. */
    readonly mutualCount: number;
    /**
     * Whether to skip an edge: true for the second of the two edges an undirected edge (or, with
     * `foldMutual`, a mutual edge) is stored as. Write the first and skip this one.
     * @param e - the edge index
     * @returns true when the edge must be skipped
     */
    folded(e: number): boolean;
    /**
     * The other of the two edges an undirected or mutual edge is stored as.
     * @param e - the edge index
     * @returns the other edge's index, or INVALID_INDEX (4294967295) for an edge stored once
     */
    mateOf(e: number): number;
    /**
     * Whether an edge was directed in the file it was read from: false for an undirected edge of a
     * graph with both kinds. It is true for every edge of a graph without mixed direction, an
     * undirected graph included, so the direction to write for edge `e` is
     * `snapshot.directed && sourceDirected(e)`.
     * @param e - the edge index
     * @returns whether the edge is directed
     */
    sourceDirected(e: number): boolean;
    /**
     * Whether an edge is either of the two edges a GEXF `mutual` edge is stored as.
     * @param e - the edge index
     * @returns true for a mutual edge
     */
    isMutual(e: number): boolean;
}

/**
 * The per-format choice of pairFolding().
 * @category Plugin helpers
 */
export interface PairFoldingOptions {
    /**
     * Write a GEXF mutual edge once, for a format that can say an edge goes both ways. When false
     * (the default), `folded()` keeps both of its edges, so it is written as two directed edges.
     */
    readonly foldMutual?: boolean | undefined;
}

/**
 * Read how a snapshot stores edge direction, for an exporter: which edges to skip so each
 * undirected edge is written once, and which edges were directed.
 * @param snapshot - the graph to write
 * @param options - whether a GEXF mutual edge is written once
 * @returns the answers, per edge
 * @category Writing a format
 */
export function pairFolding(snapshot: GraphSnapshot, options: PairFoldingOptions = {}): PairFolding {
    const foldMutual = options.foldMutual ?? false;
    const directedColumn = roleColumn(snapshot.edges.byRole("directed"), "bool");
    const pairColumn = roleColumn(snapshot.edges.byRole("pair"), "u32");
    const mutualColumn = roleColumn(snapshot.edges.byRole("mutual"), "bool");
    const { edgeCount } = snapshot;
    const mateOf = (e: number): number => {
        if (pairColumn === null || !pairColumn.isSet(e)) {
            return INVALID_INDEX;
        }
        const mate = pairColumn.value(e);
        return typeof mate === "number" && mate !== INVALID_INDEX ? mate : INVALID_INDEX;
    };
    const sourceDirected = (e: number): boolean =>
        directedColumn === null || !directedColumn.isSet(e) || directedColumn.value(e) === true;
    const isMutual = (e: number): boolean => {
        if (mutualColumn === null) {
            return false;
        }
        if (mutualColumn.isSet(e) && mutualColumn.value(e) === true) {
            return true;
        }
        const mate = mateOf(e);
        return mate !== INVALID_INDEX && mutualColumn.isSet(mate) && mutualColumn.value(mate) === true;
    };
    const folded = (e: number): boolean => {
        const mate = mateOf(e);
        if (mate === INVALID_INDEX || mate >= e) {
            return false;
        }
        // an undirected pair always folds; a mutual pair (directed on both halves) folds on request
        return !sourceDirected(e) || (foldMutual && isMutual(e));
    };
    let mutualCount = 0;
    if (mutualColumn !== null) {
        for (let e = 0; e < edgeCount; e++) {
            if (mutualColumn.isSet(e) && mutualColumn.value(e) === true && mateOf(e) > e) {
                mutualCount++;
            }
        }
    }
    return { expanded: pairColumn !== null, mutualCount, folded, mateOf, sourceDirected, isMutual };
}

/**
 * A role column when it has the dtype the role requires, else null.
 * @param column - the column, or null
 * @param dtype - the required dtype
 * @returns the column or null
 */
function roleColumn(column: Column | null, dtype: "bool" | "u32"): Column | null {
    return column !== null && column.dtype === dtype ? column : null;
}
