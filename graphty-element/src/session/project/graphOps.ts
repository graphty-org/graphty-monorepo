/**
 * @file The graph primitives: the only writers of the `graph` slice and of the builder behind it.
 *
 * The `pins` slice is an op-log too, written here: a pin or a release, and the pins a removal
 * takes with the rows it removes, so undoing the removal pins them again.
 *
 * A primitive writes live state at once and records, beside the write, the resolved values its
 * inverse needs: the ids it added, the prior records of what it patched, an edge's endpoints,
 * weight and element-assigned id. Undo and redo write those values straight back into the builder
 * and the slice. They never go through ingest, so a change of the id path, the repeated-edge policy
 * or the weight path made after the write does not change what redo writes. See
 * design/undo/undo-design.md section 3.4, "The `graph` slice is an op-log".
 *
 * A {@link GraphWriter} is what ingest writes through. One bound to a command's draft records one
 * op-log entry per writer. A writer with no draft is a write outside the dispatcher: strict state
 * throws, and production logs it once. Only a data manager built without a session, which has no
 * history to bypass, writes with no draft.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import { type GraphSnapshot, INVALID_INDEX } from "@graphty/graph-format";

import type { EdgeId, NodeId } from "../../catalog/types";
import { edgeCounterOf, edgeIdOf } from "../../data/edgeIdentity";
import type { EdgeIdentityCells, GraphStore, KeptGraph, RemovedRows } from "../../data/GraphStore";
import { deepEquals } from "../styles/predicate";
import type { DirectionProvenance } from "../types";
import { type Draft, frozenRecord, type OpLogEntry } from "./draft";
import { createCounter, emptyGraphSlice, type GraphRecord, type GraphSlice } from "./state";
import { builderDrift, strictViolation, verifyRetainedArrays } from "./strict";

/** Which kind of element a record belongs to. */
type RecordTarget = "node" | "edge";

/** What became of a file's declared direction when it reached the builder. */
export type DirectionOutcome = "applied" | "unchanged" | "config-wins" | "edges-present";

/** Where the graph slice lives, and who hears of a write to it. */
interface GraphHome {
    /** The slice now. */
    read(): GraphSlice;
    /** Replace the slice object (its maps are shared): how a new token lands. */
    write(slice: GraphSlice): void;
    /** A key of the slice changed; the derivation lane marks it. */
    touch(key: string): void;
    /** The `pins` slice now. */
    pins(): Set<NodeId>;
    /** A node's pin changed; the derivation lane marks it. */
    touchPin(id: NodeId): void;
    /** Whether strict state is on for this home. */
    readonly strict: boolean;
    /** Whether a history lives here: false for a data manager built without a session. */
    readonly session: boolean;
    /** Whether anything reads {@link GraphOps.rewrites}: the timeline's experiment is on. */
    readonly countsRewrites?: () => boolean;
    /**
     * Whether the rows are drawn on the `"batched"` render path: a forward add then marks its
     * edges dirty as one range key, not one key per edge. Absent reads `false`.
     */
    readonly batched?: () => boolean;
    /** A key of the slice changed whose text is read when the next pass starts; see `DerivationLane.touchLater`. */
    readonly touchLater?: (key: () => string) => void;
}

/**
 * The lane key of a node's record and row.
 * @param id - The node id.
 * @returns The key; JSON, so 1 and "1" stay two keys.
 */
export const nodeKey = (id: NodeId): string => `n:${JSON.stringify(id)}`;

/**
 * The node id a lane key names.
 * @param key - A key {@link nodeKey} made.
 * @returns The id.
 */
export const nodeOfKey = (key: string): NodeId => JSON.parse(key.slice(2)) as NodeId;

/**
 * The lane key of an edge's record and row.
 * @param id - The edge id.
 * @returns The key.
 */
export const edgeKey = (id: EdgeId): string => `e:${id}`;

/**
 * The lane key of a run of edges with consecutive element ids, which a forward add on the
 * `"batched"` render path marks instead of one {@link edgeKey} per edge.
 * @param first - The run's first edge counter.
 * @param count - How many edges it holds.
 * @returns The key, `e+:<first>:<count>`.
 */
const edgeRangeKey = (first: number, count: number): string => `e+:${String(first)}:${String(count)}`;

/**
 * Whether a lane key names edges: one ({@link edgeKey}) or a run ({@link edgeRangeKey}).
 * @param key - The lane key.
 * @returns True for an edge key.
 */
export const namesEdges = (key: string): boolean => key.startsWith("e:") || key.startsWith("e+:");

/**
 * Call `visit` with each edge id a lane key names: one for an edge key, every id of a range key,
 * none for any other key.
 * @param key - The lane key.
 * @param visit - Called per edge id.
 */
export function forEachEdgeOfKey(key: string, visit: (id: EdgeId) => void): void {
    if (key.startsWith("e:")) {
        visit(key.slice(2));
    } else if (key.startsWith("e+:")) {
        const [first, count] = key.slice(3).split(":").map(Number);
        for (let at = 0; at < count; at++) {
            visit(edgeIdOf(first + at));
        }
    }
}

/** The lane key marking that node rows were added: a forward pass starts the layout and frames. */
export const NODES_ADDED = "rows:nodes";

/** The lane key marking that edge rows were added: a forward pass starts the layout. */
export const EDGES_ADDED = "rows:edges";

/**
 * The key touched with any write that changes the graph's rows, weights or direction rather than
 * only its records' attributes: what tells a hook that a record edit is all a pass has to follow.
 */
export const ROWS_MOVED = "rows:moved";

/**
 * Whether an op changes more than records' attributes and graph-level values.
 * @param op - The op.
 * @returns True for every op but a record or a value write.
 */
function movesRows(op: GraphOp): boolean {
    return op.kind !== "record" && op.kind !== "value";
}

/**
 * What a snapshot holds, estimated from its storage: the adjacency arrays, every column's arrays,
 * and an id slot and a map entry per node. Arrays a snapshot derives on first access are not
 * counted until something asks for them.
 * @param snapshot - The snapshot.
 * @returns Bytes.
 */
export function snapshotBytes(snapshot: GraphSnapshot): number {
    let bytes = snapshot.rowPtr.byteLength + snapshot.colIdx.byteLength + (snapshot.weights?.byteLength ?? 0);
    bytes += 64 * snapshot.ids.size;
    for (const table of [snapshot.nodes, snapshot.edges]) {
        for (const name of table.names()) {
            const column = table.get(name) as unknown as Readonly<Record<string, unknown>> | null;
            for (const field of ["data", "validity", "codes", "offsets", "utf8", "dictionary"]) {
                const value = column?.[field];
                if (ArrayBuffer.isView(value)) {
                    bytes += value.byteLength;
                } else if (Array.isArray(value)) {
                    bytes += 16 * value.length;
                }
            }
        }
    }

    return bytes;
}

/**
 * Bytes a record is estimated at: 64 for the object, 32 per key, plus string lengths.
 * @param record - The record, or undefined for none.
 * @returns The estimate.
 */
function recordBytes(record: GraphRecord | undefined): number {
    if (record === undefined) {
        return 0;
    }

    let bytes = 64;
    for (const [key, value] of Object.entries(record)) {
        bytes += 32 + key.length * 2 + (typeof value === "string" ? value.length * 2 : 0);
    }

    return bytes;
}

/** One recorded write, in the order it was made. Plain data, so a large add holds no closures. */
type GraphOp =
    | {
          readonly kind: "node";
          readonly id: NodeId;
          readonly record: GraphRecord;
          /** The file coordinate seeded into the builder's seed column, in file units. */
          readonly seed: readonly [number, number, number] | null;
          /** Whether the builder held the id before (an endpoint an edge created): undo keeps the row. */
          readonly existed: boolean;
          /** The record the slice held for the id before, if any. */
          readonly prior: GraphRecord | undefined;
      }
    | {
          readonly kind: "edge";
          readonly edgeId: number;
          readonly source: NodeId;
          readonly target: NodeId;
          readonly weight: number;
          readonly record: GraphRecord;
          /** Endpoints the builder created for this edge; undo removes them with it. */
          readonly created: readonly NodeId[];
          /** The file's own id for the edge, read at `edgeIdPath`, its stable identity. */
          readonly fileId: string | number | undefined;
          /** The identity cells it was completed with, kept by its first undo for its redo. */
          identity?: EdgeIdentityCells;
      }
    | NodeRange
    | EdgeRange
    | { readonly kind: "weight"; readonly edgeId: number; readonly prior: number; readonly next: number }
    | {
          readonly kind: "record";
          readonly target: RecordTarget;
          readonly id: NodeId;
          readonly prior: GraphRecord | undefined;
          readonly next: GraphRecord | undefined;
      }
    | { readonly kind: "value"; readonly name: string; readonly prior: unknown; readonly next: unknown }
    | {
          /** Rows taken out, with their records; undo puts them back at their rows. */
          readonly kind: "remove";
          readonly rows: RemovedRows;
          readonly nodeRecords: readonly (GraphRecord | undefined)[];
          readonly edgeRecords: readonly (GraphRecord | undefined)[];
      }
    | {
          /** The whole graph swapped for an empty one; the prior graph and maps are kept by reference. */
          readonly kind: "replace";
          readonly kept: KeptGraph;
          readonly prior: GraphMaps;
          /** The graph epoch before the swap, and the fresh one the empty graph took. */
          readonly epochs: { readonly prior: number; readonly next: number };
      }
    | {
          readonly kind: "direction";
          readonly prior: { readonly directed: boolean; readonly provenance: DirectionProvenance };
          readonly next: { readonly directed: boolean; readonly provenance: DirectionProvenance };
      };

/**
 * A run of edges with consecutive counters that one forward add wrote under the `"batched"` render
 * path, kept as columns: the op log's one bulk entry (design/rendering/row-renderer.md 4.6), which
 * undo takes back and redo puts again edge by edge, in one op, with no object per edge.
 */
interface EdgeRange {
    readonly kind: "edges";
    /** The first edge's counter; edge `i` of the run has counter `first + i`. */
    readonly first: number;
    readonly sources: NodeId[];
    readonly targets: NodeId[];
    readonly weights: number[];
    readonly records: GraphRecord[];
    /** The file's own id per edge, or undefined. */
    readonly fileIds: (string | number | undefined)[];
    /** The endpoints an edge created, by its place in the run; most create none. */
    readonly created: Map<number, readonly NodeId[]>;
    /** The identity cells each edge was completed with, kept by the first undo for its redo. */
    identities?: (EdgeIdentityCells | undefined)[];
}

/**
 * A run of nodes one forward add wrote under the `"batched"` render path, kept as columns: the op
 * log's bulk entry for nodes, as `EdgeRange` is for edges. Undo takes the nodes back and redo puts
 * them again node by node, in one op, with no object per node.
 */
interface NodeRange {
    readonly kind: "nodes";
    readonly ids: NodeId[];
    readonly records: GraphRecord[];
    readonly seeds: (readonly [number, number, number] | null)[];
    readonly existed: boolean[];
    /** The record the slice held before, by the node's place in the run; most had none. */
    readonly priors: Map<number, GraphRecord>;
}

/** One node added, as a node op holds it. */
type NodeOp = Extract<GraphOp, { kind: "node" }>;

/**
 * Node `at` of a run, as a node op.
 * @param range - The run.
 * @param at - The node's place in it.
 * @returns The op.
 */
function nodeAt(range: NodeRange, at: number): NodeOp {
    return {
        kind: "node",
        id: range.ids[at],
        record: range.records[at],
        seed: range.seeds[at],
        existed: range.existed[at],
        prior: range.priors.get(at),
    };
}

/** One edge added, as an edge op holds it. */
type EdgeOp = Extract<GraphOp, { kind: "edge" }>;

/** The three maps of the `graph` slice. */
interface GraphMaps {
    readonly nodes: ReadonlyMap<NodeId, GraphRecord>;
    readonly edges: ReadonlyMap<EdgeId, GraphRecord>;
    readonly values: ReadonlyMap<string, unknown>;
}

/** What a removal took out, by id. */
interface Removed {
    readonly nodes: readonly NodeId[];
    readonly edges: readonly EdgeId[];
}

/**
 * Whether an id is one graph-format stores: a string or a finite number.
 * @param id - The id.
 * @returns True when it can be stored.
 */
function isStorableId(id: unknown): id is string | number {
    return typeof id === "string" || (typeof id === "number" && Number.isFinite(id));
}

/**
 * Resolve an edge's flow capacity: the record's `capacity`, else its `value`, else 1. A key that is
 * present but not a number reads as 1 rather than falling through to the next key.
 * @param record - the raw edge record
 * @returns the capacity
 */
export function resolveEdgeCapacity(record: Readonly<Record<string | number, unknown>>): number {
    const raw = record.capacity ?? record.value ?? 1;
    return typeof raw === "number" ? raw : 1;
}

/**
 * Write an edge's capacity column from the record it holds now, so the column always reads what
 * {@link resolveEdgeCapacity} reads from that record. An edge with no row writes nothing.
 * @param store - The store.
 * @param edgeId - The edge's element-assigned id.
 * @param record - Its record, or undefined for none.
 */
function writeCapacity(store: GraphStore, edgeId: number, record: GraphRecord | undefined): void {
    const row = store.edgeIndexOf(edgeId);
    if (row !== INVALID_INDEX) {
        store.builder.setEdgeValue(store.capacityColumn, row, resolveEdgeCapacity(record ?? {}));
        store.account();
    }
}

/**
 * What ingest writes through: one command's writes.
 *
 * Every method writes live state before it returns, so a getter reads the write at once.
 */
export interface GraphWriter {
    /** The store written, for reads. */
    readonly store: GraphStore;
    /**
     * Add a node row and its record, or give a row the builder already holds (an endpoint an edge
     * created) its record.
     * @param id - The extracted id; one graph-format will not store keeps its record and gets no row.
     * @param record - The record.
     * @param seed - The file coordinate, in file units, or null.
     * @returns The row, INVALID_INDEX for an id with none, and whether the builder already held it.
     */
    addNode(
        id: NodeId,
        record: GraphRecord,
        seed: readonly [number, number, number] | null,
    ): { index: number; merged: boolean };
    /**
     * Add an edge row with a fresh element-assigned id, and its record.
     * @param source - The resolved source id.
     * @param target - The resolved target id.
     * @param weight - The resolved weight.
     * @param record - The record.
     * @param fileId - The file's own id for the edge, read at `edgeIdPath`, when it has one.
     * @returns The row and the id; INVALID_INDEX for both when either endpoint cannot be stored.
     */
    addEdge(
        source: unknown,
        target: unknown,
        weight: number,
        record: GraphRecord,
        fileId?: string | number,
    ): { index: number; edgeId: number };
    /**
     * Fold a repeated edge record into the edge it repeats: a new weight, and for the `last`
     * policy its record too.
     * @param edgeIndex - The row of the edge that survives.
     * @param weight - Its new weight.
     * @param record - Its new record, or null to keep the one it has.
     */
    mergeEdge(edgeIndex: number, weight: number, record: GraphRecord | null): void;
    /**
     * Patch one record: the named keys take the new values, the rest are kept.
     * @param target - Node or edge.
     * @param id - Its id.
     * @param values - The new values.
     * @param replace - The values are the whole new record: a key they lack is dropped.
     * @returns False when the graph holds no such element.
     */
    setAttributes(target: RecordTarget, id: NodeId, values: GraphRecord, replace?: boolean): boolean;
    /**
     * Set graph-level values: the import report, graph-level results.
     * @param values - The values by name.
     */
    setGraphValues(values: Readonly<Record<string, unknown>>): void;
    /**
     * Read one node's record as this command's writes have left it.
     * @param id - The node id.
     * @returns The record, or undefined when the graph holds none.
     */
    nodeRecord(id: NodeId): GraphRecord | undefined;
    /**
     * Read one graph-level value as this command's writes have left it.
     * @param name - The value's name.
     * @returns The value, or undefined when none is set.
     */
    graphValue(name: string): unknown;
    /**
     * Give the builder the direction a file declared, without overruling the consumer.
     * @param directed - The declared direction.
     * @param statedBy - The text that declared it.
     * @returns What happened.
     */
    setDirected(directed: boolean, statedBy: string): DirectionOutcome;
    /**
     * Remove nodes and every edge attached to them, keeping everything their undo needs.
     * @param ids - The node ids; one the graph does not hold is skipped.
     * @returns What was removed.
     */
    removeNodes(ids: readonly NodeId[]): Removed;
    /**
     * Remove edges, keeping everything their undo needs.
     * @param ids - The edge ids; one the graph does not hold is skipped.
     * @returns What was removed.
     */
    removeEdges(ids: readonly EdgeId[]): Removed;
    /** Empty the graph: every row, record and graph-level value. */
    clear(): void;
}

/** The graph primitives of one session (or of one data manager with no session). */
export class GraphOps {
    private readonly home: GraphHome;
    private readonly tokens = createCounter();
    private readonly epochs = createCounter();
    private warned = false;
    /** How many changes were more than rows added at the end. */
    private rewritten = 0;
    /** The store the last writer wrote, which strict state checks for writes made around it. */
    private store: GraphStore | null = null;

    /**
     * Primitives over a slice held somewhere else, a session's project state.
     * @param home - Where the slice lives and who hears of writes.
     */
    constructor(home: GraphHome) {
        this.home = home;
    }

    /**
     * Primitives with nothing to record into: a data manager built without a session. There is
     * no history for a write to bypass, so every write is accepted and recorded nowhere.
     * @returns The primitives, over a slice of their own.
     */
    static standalone(): GraphOps {
        let slice = emptyGraphSlice();
        const pins = new Set<NodeId>();
        return new GraphOps({
            read: () => slice,
            write: (next) => {
                slice = next;
            },
            touch: () => undefined,
            pins: () => pins,
            touchPin: () => undefined,
            strict: false,
            session: false,
        });
    }

    /**
     * The slice now.
     * @returns The `graph` slice.
     */
    get slice(): GraphSlice {
        return this.home.read();
    }

    /**
     * A writer whose writes are recorded in a command's draft, or, handed no draft, a write
     * outside the dispatcher: refused under strict state, logged once otherwise.
     * @param draft - The command's draft, or null.
     * @param store - The store to write.
     * @returns The writer.
     */
    writer(draft: Draft | null, store: GraphStore): GraphWriter {
        if (draft === null && this.home.session) {
            if (this.home.strict) {
                throw strictViolation(
                    "a graph primitive was called outside a command; dispatch data.apply or data.import",
                );
            }

            if (!this.warned) {
                this.warned = true;
                console.warn("[graphty] The graph was written outside a command; that write cannot be undone.");
            }
        }

        this.store = store;
        return new Writer(this, store, draft);
    }

    /**
     * Strict: throw when the builder of the store last written was mutated outside the graph
     * primitives, or its resident snapshot's arrays were written in place. The dispatcher asks at
     * each dispatch and each commit.
     */
    checkStore(): void {
        const drift = this.store?.isDisposed === false ? this.store.mutationDrift : 0;
        if (drift > 0) {
            throw builderDrift(drift);
        }

        verifyRetainedArrays([this.store?.sealedResident ?? null]);
    }

    /**
     * A mark that moves on every change other than rows added at the end: a record edit, a removal,
     * a merge into an existing row, an undo or a redo, any token not taken by a writer, and rows
     * renumbered by a freeze, so read it after the freeze. Two reads alike mean the rows of the first
     * still hold what they held. It reads the two counts apart: the store's restarts with a new store.
     * @returns The mark.
     */
    get rewrites(): string {
        return `${String(this.rewritten)}:${String(this.store?.renumberCount ?? 0)}`;
    }

    /**
     * Whether anything reads {@link GraphOps.rewrites}.
     * @returns True with the timeline on.
     */
    get countsRewrites(): boolean {
        return this.home.countsRewrites?.() === true;
    }

    /** Count a change that is more than rows added at the end. */
    noteRewrite(): void {
        if (this.countsRewrites) {
            this.rewritten++;
        }
    }

    /**
     * Take a token never issued before and make it the slice's, for a write {@link GraphOps.noteRewrite}
     * does not see: anyone but a writer may have changed anything.
     * @returns The token.
     */
    retoken(): number {
        this.noteRewrite();
        return this.nextToken();
    }

    /**
     * Take a token never issued before and make it the slice's.
     * @returns The token.
     */
    nextToken(): number {
        const token = this.tokens.next();
        const slice = this.home.read();
        if (this.home.strict && token <= slice.token) {
            throw strictViolation(`graph token ${String(token)} was issued before`);
        }

        this.home.write(Object.freeze({ ...slice, token }));
        return token;
    }

    /**
     * Put a recorded token back: undo and redo restore the rows it names exactly.
     * @param token - The token.
     */
    restoreToken(token: number): void {
        this.noteRewrite();
        this.home.write(Object.freeze({ ...this.home.read(), token }));
    }

    /**
     * Take an epoch never issued before and make it the slice's: the graph is a new dataset, whose
     * coordinates are never mapped from another's.
     * @returns The epoch.
     */
    newEpoch(): number {
        const epoch = this.epochs.next();
        this.home.write(Object.freeze({ ...this.home.read(), epoch }));
        return epoch;
    }

    /**
     * Put a recorded epoch back.
     * @param epoch - The epoch.
     */
    restoreEpoch(epoch: number): void {
        this.home.write(Object.freeze({ ...this.home.read(), epoch }));
    }

    /**
     * Mark a key dirty on the lane.
     * @param key - The key.
     */
    touch(key: string): void {
        this.home.touch(key);
    }

    /**
     * Whether a forward add marks its edges as one range key (the `"batched"` render path).
     * @returns True when it does.
     */
    get touchesRanges(): boolean {
        return this.home.touchLater !== undefined && this.home.batched?.() === true;
    }

    /**
     * Mark a key whose text is read when the next pass starts.
     * @param key - Gives the key.
     */
    touchLater(key: () => string): void {
        if (this.home.touchLater === undefined) {
            this.home.touch(key());
        } else {
            this.home.touchLater(key);
        }
    }

    /**
     * Pin or release nodes in the `pins` slice, recording the change in `draft`.
     * @param draft - The command's draft, or null for a write with no history to record into.
     * @param ids - The nodes.
     * @param pinned - Pin, or release.
     * @returns The ids whose pin changed.
     */
    setPinned(draft: Draft | null, ids: readonly NodeId[], pinned: boolean): NodeId[] {
        const pins = this.home.pins();
        const changed = [...new Set(ids)].filter((id) => pins.has(id) !== pinned);
        if (changed.length > 0) {
            const entry = new PinsEntry(this, changed, pinned);
            entry.redo();
            draft?.log(entry);
        }

        return changed;
    }

    /**
     * The `pins` slice, for the entries that write it.
     * @returns The set.
     */
    pins(): Set<NodeId> {
        return this.home.pins();
    }

    /**
     * Mark a node's pin dirty on the lane.
     * @param id - The node.
     */
    touchPin(id: NodeId): void {
        this.home.touchPin(id);
    }

    /**
     * Swap the slice's three maps, keeping the token.
     * @param maps - The maps to hold from now on.
     */
    swapMaps(maps: GraphMaps): void {
        this.home.write(Object.freeze({ ...this.home.read(), ...maps }));
    }
}

/** The graph values a dataset-wide step writes: `SOURCES_VALUE` and `COLUMNS_VALUE` of `commands/data.ts`. */
const DATASET_VALUES: ReadonlySet<string> = new Set(["sources", "columns"]);

/**
 * The node and edge ids the steps an undo, a redo or a restore passed touched, which the session
 * then selects (design/undo/undo-design.md section 8). Collection stops, and nothing is selected,
 * once a replace, a clear or another dataset-wide step passes or more ids than the limit are touched: selecting everything
 * says nothing, and a selection built only to be truncated says less.
 */
export class TouchedIds {
    readonly nodes = new Set<NodeId>();
    readonly edges = new Set<EdgeId>();
    /** Whether to leave the selection as it is. */
    skip = false;

    /**
     * An empty collection.
     * @param limit - The most ids worth selecting: the selection cap.
     */
    constructor(private readonly limit: number) {}

    /**
     * A node was touched.
     * @param id - The node.
     */
    node(id: NodeId): void {
        if (!this.skip) {
            this.nodes.add(id);
            this.check();
        }
    }

    /**
     * An edge was touched.
     * @param id - The edge.
     */
    edge(id: EdgeId): void {
        if (!this.skip) {
            this.edges.add(id);
            this.check();
        }
    }

    /** Everything was touched: a replace or a clear. Select nothing. */
    all(): void {
        this.skip = true;
        this.nodes.clear();
        this.edges.clear();
    }

    /** Give up once past the limit. */
    private check(): void {
        if (this.nodes.size + this.edges.size > this.limit) {
            this.all();
        }
    }
}

/** One pin or release of several nodes, as the `pins` slice records it. */
class PinsEntry implements OpLogEntry {
    readonly slice = "pins";

    constructor(
        private readonly graph: GraphOps,
        private readonly ids: readonly NodeId[],
        private readonly pinned: boolean,
    ) {}

    bytes(): number {
        return 32 * this.ids.length;
    }

    touched(into: TouchedIds): void {
        for (const id of this.ids) {
            into.node(id);
        }
    }

    undo(): void {
        this.write(!this.pinned);
    }

    redo(): void {
        this.write(this.pinned);
    }

    /**
     * Pin or release every id.
     * @param pinned - Pin, or release.
     */
    private write(pinned: boolean): void {
        const pins = this.graph.pins();
        for (const id of this.ids) {
            if (pinned) {
                pins.add(id);
            } else {
                pins.delete(id);
            }

            this.graph.touchPin(id);
        }
    }
}

/**
 * Whether undoing a patch puts removed nodes back. Their rows come back at the coordinates they
 * had when they were removed, which is not the arrangement below the step when the layout had
 * moved them since the last rest point.
 * @param log - The patch's op-log writes.
 * @returns True when one of them removed a node.
 */
export function restoresNodes(log: readonly OpLogEntry[]): boolean {
    return log.some(
        (entry) =>
            entry instanceof GraphEntry && entry.ops.some((op) => op.kind === "remove" && op.rows.nodes.length > 0),
    );
}

/**
 * The nodes an op log created rows for: a node the graph held no row for, and an endpoint an edge
 * brought in. Each starts unplaced.
 * @param log - The op log.
 * @returns Their ids, in the order they were created.
 */
export function createdNodes(log: readonly OpLogEntry[]): NodeId[] {
    const out: NodeId[] = [];
    for (const entry of log) {
        if (entry instanceof GraphEntry) {
            for (const op of entry.ops) {
                // One push per id: spreading a run's 200,000 ids as arguments overflows the stack.
                for (const id of createdBy(op)) {
                    out.push(id);
                }
            }
        }
    }

    return out;
}

/**
 * The nodes one op created rows for.
 * @param op - The op.
 * @returns Their ids, in the order they were created.
 */
function createdBy(op: GraphOp): readonly NodeId[] {
    switch (op.kind) {
        case "node":
            return op.existed ? [] : [op.id];
        case "edge":
            return op.created;
        case "nodes":
            return op.ids.filter((_, at) => !op.existed[at]);
        case "edges":
            return [...op.created.values()].flat();
        default:
            return [];
    }
}

/**
 * Whether an op log added or removed nodes or edges, or changed an edge's weight: what sets a
 * running layout moving. A record or value edit does not.
 * @param log - The op log.
 * @returns True when it changed the graph's shape.
 */
export function reshapes(log: readonly OpLogEntry[]): boolean {
    return log.some(
        (entry) =>
            entry instanceof GraphEntry &&
            entry.ops.some((op) => {
                if (op.kind === "node") {
                    return !op.existed;
                }

                return op.kind === "nodes" ? op.existed.includes(false) : op.kind !== "record" && op.kind !== "value";
            }),
    );
}

/**
 * Names the elements one graph step touched.
 * @param op - The step.
 * @param into - Collects the ids.
 * @returns True when the step touched the whole dataset, so the walk stops.
 */
function touchOp(op: GraphOp, into: TouchedIds): boolean {
    switch (op.kind) {
        case "node":
            into.node(op.id);
            break;
        case "nodes":
            op.ids.forEach((id) => {
                into.node(id);
            });
            break;
        case "edge":
            into.edge(edgeIdOf(op.edgeId));
            for (const id of op.created) {
                into.node(id);
            }

            break;
        case "edges":
            op.records.forEach((_, at) => {
                into.edge(edgeIdOf(op.first + at));
            });
            for (const ids of op.created.values()) {
                ids.forEach((id) => {
                    into.node(id);
                });
            }

            break;
        case "weight":
            into.edge(edgeIdOf(op.edgeId));
            break;
        case "record":
            if (op.target === "node") {
                into.node(op.id);
            } else {
                into.edge(String(op.id));
            }

            break;
        case "remove":
            for (const node of op.rows.nodes) {
                into.node(node.id);
            }

            for (const edge of op.rows.edges) {
                into.edge(edgeIdOf(edge.edgeId));
            }

            break;
        case "replace":
            into.all();
            return true;
        case "value":
            // A step that rewrites the sources list or the column settings -- a load, a
            // join, a replace with a newer copy, a type change -- is about the dataset,
            // not elements: selecting the rows it rewrote would select a column's worth.
            if (DATASET_VALUES.has(op.name)) {
                into.all();
                return true;
            }

            break;
        default:
            // "direction" names no element.
            break;
    }

    return false;
}

/** The graph slice's maps, writable. */
interface SliceMaps {
    nodes: Map<NodeId, GraphRecord>;
    edges: Map<EdgeId, GraphRecord>;
    values: Map<string, unknown>;
}

/** The entry one recorded writer logs, growing as it writes. */
class GraphEntry implements OpLogEntry {
    readonly slice = "graph";
    readonly ops: GraphOp[] = [];
    private retained = 0;

    constructor(
        private readonly graph: GraphOps,
        private readonly store: GraphStore,
        private readonly tokenBefore: number,
        private readonly tokenAfter: number,
    ) {}

    /**
     * Keep one op.
     * @param op - The op.
     */
    push(op: GraphOp): void {
        this.ops.push(op);
        this.retained += 48 + (op.kind === "node" || op.kind === "edge" ? recordBytes(op.record) : 0);
        if (op.kind === "record") {
            this.retained += recordBytes(op.prior) + recordBytes(op.next);
        } else if (op.kind === "remove") {
            // A removed row keeps its record and a small map of column values.
            this.retained += 96 * (op.rows.nodes.length + op.rows.edges.length);
            for (const record of [...op.nodeRecords, ...op.edgeRecords]) {
                this.retained += recordBytes(record);
            }
        } else if (op.kind === "replace") {
            // The kept graph: its records, its snapshot's arrays and columns, and the lane rows
            // held for its undo.
            const { snapshot } = op.kept;
            this.retained += snapshotBytes(snapshot) + 3 * Float32Array.BYTES_PER_ELEMENT * snapshot.nodeCount;
            for (const record of [...op.prior.nodes.values(), ...op.prior.edges.values()]) {
                this.retained += recordBytes(record);
            }
        }
    }

    /**
     * Keep one node added in the run the last op holds, or start a run: what a forward add under
     * the `"batched"` render path records instead of one op per node.
     * @param op - The node.
     */
    pushNodeRange(op: NodeOp): void {
        const last = this.ops.at(-1);
        let range: NodeRange;
        if (last?.kind === "nodes") {
            range = last;
        } else {
            range = { kind: "nodes", ids: [], records: [], seeds: [], existed: [], priors: new Map() };
            this.ops.push(range);
            this.retained += 48;
        }

        if (op.prior !== undefined) {
            range.priors.set(range.ids.length, op.prior);
        }

        range.ids.push(op.id);
        range.records.push(op.record);
        range.seeds.push(op.seed);
        range.existed.push(op.existed);
        // Four array slots per node and a seed reference, not an op object.
        this.retained += 20 + recordBytes(op.record);
    }

    /**
     * Keep one edge added in the run the last op holds, or start a run: what a forward add under
     * the `"batched"` render path records instead of one op per edge.
     * @param op - The edge.
     */
    pushRange(op: EdgeOp): void {
        const last = this.ops.at(-1);
        let range: EdgeRange;
        if (last?.kind === "edges" && last.first + last.records.length === op.edgeId) {
            range = last;
        } else {
            range = {
                kind: "edges",
                first: op.edgeId,
                sources: [],
                targets: [],
                weights: [],
                records: [],
                fileIds: [],
                created: new Map(),
            };
            this.ops.push(range);
            this.retained += 48;
        }

        if (op.created.length > 0) {
            range.created.set(range.records.length, op.created);
        }

        range.sources.push(op.source);
        range.targets.push(op.target);
        range.weights.push(op.weight);
        range.records.push(op.record);
        range.fileIds.push(op.fileId);
        // Five array slots per edge, not an op object.
        this.retained += 16 + recordBytes(op.record);
    }

    bytes(): number {
        return this.retained;
    }

    touched(into: TouchedIds): void {
        for (const op of this.ops) {
            if (touchOp(op, into)) {
                return;
            }
        }
    }

    /**
     * The slice's maps now, writable.
     * @returns The maps.
     */
    private maps(): SliceMaps {
        const { slice } = this.graph;
        return {
            nodes: slice.nodes as Map<NodeId, GraphRecord>,
            edges: slice.edges as Map<EdgeId, GraphRecord>,
            values: slice.values as Map<string, unknown>,
        };
    }

    undo(rollback: boolean): void {
        const { store } = this;
        const seen = bumped();
        store.audit();
        // Re-read after a replace, which swaps the maps.
        let maps = this.maps();
        for (let index = this.ops.length - 1; index >= 0; index--) {
            maps = this.undoOp(this.ops[index], maps, seen);
        }

        if (this.ops.some(movesRows)) {
            this.graph.touch(ROWS_MOVED);
        }

        store.recordsChanged();
        if (rollback) {
            this.graph.retoken();
        } else {
            this.graph.restoreToken(this.tokenBefore);
        }
    }

    /**
     * Undo one op.
     * @param op - The op.
     * @param maps - The slice's maps now.
     * @param seen - The fields this batch bumped already.
     * @returns The slice's maps after: new ones after a replace.
     */
    private undoOp(op: GraphOp, maps: SliceMaps, seen: Bumped): SliceMaps {
        const { store } = this;
        switch (op.kind) {
            case "node":
                this.undoNode(op, maps.nodes, seen);
                break;
            case "nodes":
                this.undoNodes(op, maps.nodes, seen);
                break;
            case "edge":
                op.identity ??= store.frozenEdgeIdentity(op.edgeId);
                this.undoEdge(op.edgeId, op.record, op.created, maps, seen);
                break;
            case "edges":
                this.undoRange(op, maps, seen);
                break;
            case "weight": {
                const row = store.edgeIndexOf(op.edgeId);
                if (row !== INVALID_INDEX) {
                    store.builder.setEdgeWeight(row, op.prior);
                }

                this.graph.touch(edgeKey(edgeIdOf(op.edgeId)));
                break;
            }

            case "record":
                bumpFields(store, op.target, op.next, op.prior, seen, true);
                restore(
                    op.target === "node" ? maps.nodes : maps.edges,
                    op.target === "node" ? op.id : String(op.id),
                    op.prior,
                );
                if (op.target === "edge") {
                    writeCapacity(store, edgeCounterOf(String(op.id)), op.prior);
                }

                this.graph.touch(op.target === "node" ? nodeKey(op.id) : edgeKey(String(op.id)));
                break;
            case "value":
                restore(maps.values, op.name, op.prior);
                this.graph.touch(`v:${op.name}`);
                break;
            case "remove":
                this.undoRemove(op, maps);
                break;
            case "replace": {
                this.graph.swapMaps(op.prior);
                this.graph.restoreEpoch(op.epochs.prior);
                const swapped = this.maps();
                touchAll(this.graph, op.prior);
                store.replace(op.kept, true);
                return swapped;
            }

            default:
                // "direction"
                if (store.builder.directed !== op.prior.directed && !store.builder.directedLocked) {
                    store.builder.setDirected(op.prior.directed);
                }

                store.restoreDirection(op.prior.provenance);
                this.graph.touch("directed");
                break;
        }

        return maps;
    }

    /**
     * Undo a node added: its record, and its row unless the builder held it before.
     * @param op - The op.
     * @param nodes - The node records.
     * @param seen - The fields this batch bumped already.
     */
    private undoNode(op: NodeOp, nodes: Map<NodeId, GraphRecord>, seen: Bumped): void {
        const { store } = this;
        bumpFields(store, "node", op.record, op.prior, seen);
        restore(nodes, op.id, op.prior);
        if (!op.existed && isStorableId(op.id)) {
            // Behind a structural change still waiting, the row goes with it, at
            // the next read: reading the builder now would rebuild the graph.
            if (store.deferring) {
                store.dropAdded([op.id], []);
            } else if (store.builder.hasNode(op.id)) {
                // A row-numbered node keeps its id through the freeze that compacts it away.
                store.builder.keepIds();
                store.builder.removeNode(op.id);
            }
        }

        this.graph.touch(nodeKey(op.id));
    }

    /**
     * Undo a run of nodes added, last first, each as one node op is undone.
     * @param op - The run.
     * @param nodes - The node records.
     * @param seen - The fields this batch bumped already.
     */
    private undoNodes(op: NodeRange, nodes: Map<NodeId, GraphRecord>, seen: Bumped): void {
        for (let at = op.ids.length - 1; at >= 0; at--) {
            this.undoNode(nodeAt(op, at), nodes, seen);
        }
    }

    /**
     * Undo a run of edges added, last first, each as one edge op is undone.
     * @param op - The run.
     * @param maps - The slice's maps.
     * @param seen - The fields this batch bumped already.
     */
    private undoRange(op: EdgeRange, maps: SliceMaps, seen: Bumped): void {
        const { store } = this;
        const identities = (op.identities ??= []);
        for (let at = op.records.length - 1; at >= 0; at--) {
            const edgeId = op.first + at;
            identities[at] ??= store.frozenEdgeIdentity(edgeId);
            this.undoEdge(edgeId, op.records[at], op.created.get(at) ?? [], maps, seen);
        }
    }

    /**
     * Undo an edge added: its record, its row, and the endpoints it created that no node record holds.
     * @param edgeId - The edge's counter.
     * @param record - Its record.
     * @param made - The endpoints it created.
     * @param maps - The slice's maps.
     * @param seen - The fields this batch bumped already.
     */
    private undoEdge(
        edgeId: number,
        record: GraphRecord,
        made: readonly NodeId[],
        maps: SliceMaps,
        seen: Bumped,
    ): void {
        const { store } = this;
        bumpFields(store, "edge", record, undefined, seen);
        maps.edges.delete(edgeIdOf(edgeId));
        const created = made.filter((id) => !maps.nodes.has(id));
        if (store.deferring) {
            store.dropAdded(created, [edgeId]);
        } else {
            const row = store.edgeIndexOf(edgeId);
            if (row !== INVALID_INDEX) {
                store.builder.removeEdge(row);
            }

            for (const id of created) {
                if (store.builder.hasNode(id)) {
                    store.builder.keepIds();
                    store.builder.removeNode(id);
                }
            }
        }

        this.graph.touch(edgeKey(edgeIdOf(edgeId)));
    }

    /**
     * Undo rows removed: their records, then their rows.
     * @param op - The op.
     * @param maps - The slice's maps.
     */
    private undoRemove(op: Extract<GraphOp, { kind: "remove" }>, maps: SliceMaps): void {
        op.rows.nodes.forEach((node, at) => {
            restore(maps.nodes, node.id, op.nodeRecords[at]);
            this.graph.touch(nodeKey(node.id));
        });
        op.rows.edges.forEach((edge, at) => {
            restore(maps.edges, edgeIdOf(edge.edgeId), op.edgeRecords[at]);
            this.graph.touch(edgeKey(edgeIdOf(edge.edgeId)));
        });
        this.store.insertRows(op.rows);
    }

    redo(): void {
        const { store } = this;
        const seen = bumped();
        store.audit();
        // Re-read after a replace, which swaps the maps.
        let { nodes, edges, values } = this.maps();
        const added = new Set<string>();
        for (const op of this.ops) {
            switch (op.kind) {
                case "node":
                    this.redoNode(op, nodes, seen);
                    added.add(NODES_ADDED);
                    break;
                case "nodes":
                    op.ids.forEach((_, at) => {
                        this.redoNode(nodeAt(op, at), nodes, seen);
                    });
                    added.add(NODES_ADDED);
                    break;
                case "edge":
                    this.redoEdge(op, op.identity, edges, seen);
                    added.add(EDGES_ADDED);
                    break;
                case "edges":
                    op.records.forEach((record, at) => {
                        const edge = {
                            edgeId: op.first + at,
                            source: op.sources[at],
                            target: op.targets[at],
                            weight: op.weights[at],
                            record,
                            fileId: op.fileIds[at],
                        };
                        this.redoEdge(edge, op.identities?.[at], edges, seen);
                    });
                    added.add(EDGES_ADDED);
                    break;
                case "weight": {
                    const row = store.edgeIndexOf(op.edgeId);
                    if (row !== INVALID_INDEX) {
                        store.builder.setEdgeWeight(row, op.next);
                    }

                    this.graph.touch(edgeKey(edgeIdOf(op.edgeId)));
                    break;
                }

                case "record":
                    this.redoRecord(op, nodes, edges, seen);
                    break;
                case "value":
                    restore(values, op.name, op.next);
                    this.graph.touch(`v:${op.name}`);
                    break;
                case "remove":
                    this.redoRemove(op, nodes, edges);
                    break;
                case "replace":
                    this.graph.swapMaps(emptyMaps());
                    this.graph.restoreEpoch(op.epochs.next);
                    ({ nodes, edges, values } = this.maps());
                    touchAll(this.graph, op.prior);
                    store.replace(op.kept, false);
                    break;
                default:
                    // "direction"
                    if (store.builder.directed !== op.next.directed && !store.builder.directedLocked) {
                        store.builder.setDirected(op.next.directed);
                    }

                    store.restoreDirection(op.next.provenance);
                    this.graph.touch("directed");
                    break;
            }
        }

        for (const key of added) {
            this.graph.touch(key);
        }

        if (this.ops.some(movesRows)) {
            this.graph.touch(ROWS_MOVED);
        }

        store.recordsChanged();
        this.graph.restoreToken(this.tokenAfter);
    }

    /**
     * Redo a node added: its row, its seed, its record.
     * @param op - The op.
     * @param nodes - The node records.
     * @param seen - The fields this batch bumped already.
     */
    private redoNode(op: NodeOp, nodes: Map<NodeId, GraphRecord>, seen: Bumped): void {
        const { store } = this;
        if (isStorableId(op.id)) {
            const row = store.builder.addNode(op.id);
            if (op.seed !== null) {
                store.builder.setNodeValue(store.seedColumn, row, op.seed);
            }
        }

        nodes.set(op.id, op.record);
        bumpFields(store, "node", op.prior, op.record, seen);
        this.graph.touch(nodeKey(op.id));
    }

    /**
     * Redo an edge added: its row, its identity, its record and its capacity.
     * @param op - The edge.
     * @param identity - The identity cells its first undo kept, if any.
     * @param edges - The edge records.
     * @param seen - The fields this batch bumped already.
     */
    private redoEdge(
        op: Pick<EdgeOp, "edgeId" | "source" | "target" | "weight" | "record" | "fileId">,
        identity: EdgeIdentityCells | undefined,
        edges: Map<EdgeId, GraphRecord>,
        seen: Bumped,
    ): void {
        const { store } = this;
        const row = store.builder.addEdge(op.source, op.target, op.weight);
        store.stampEdgeId(row, op.edgeId);
        if (identity === undefined) {
            store.recordIngestedEdge(row, op.edgeId, op.fileId);
        } else {
            store.restoreEdgeIdentity(row, identity);
        }

        edges.set(edgeIdOf(op.edgeId), op.record);
        if (resolveEdgeCapacity(op.record) !== 1) {
            writeCapacity(store, op.edgeId, op.record);
        }
        bumpFields(store, "edge", undefined, op.record, seen);
        this.graph.touch(edgeKey(edgeIdOf(op.edgeId)));
    }

    /**
     * Redo a record written.
     * @param op - The op.
     * @param nodes - The node records.
     * @param edges - The edge records.
     * @param seen - The fields this batch bumped already.
     */
    private redoRecord(
        op: Extract<GraphOp, { kind: "record" }>,
        nodes: Map<NodeId, GraphRecord>,
        edges: Map<EdgeId, GraphRecord>,
        seen: Bumped,
    ): void {
        const { store } = this;
        bumpFields(store, op.target, op.prior, op.next, seen, true);
        restore(op.target === "node" ? nodes : edges, op.target === "node" ? op.id : String(op.id), op.next);
        if (op.target === "edge") {
            writeCapacity(store, edgeCounterOf(String(op.id)), op.next);
        }

        this.graph.touch(op.target === "node" ? nodeKey(op.id) : edgeKey(String(op.id)));
    }

    /**
     * Redo rows removed.
     * @param op - The op.
     * @param nodes - The node records.
     * @param edges - The edge records.
     */
    private redoRemove(
        op: Extract<GraphOp, { kind: "remove" }>,
        nodes: Map<NodeId, GraphRecord>,
        edges: Map<EdgeId, GraphRecord>,
    ): void {
        for (const node of op.rows.nodes) {
            nodes.delete(node.id);
            this.graph.touch(nodeKey(node.id));
        }

        for (const edge of op.rows.edges) {
            edges.delete(edgeIdOf(edge.edgeId));
            this.graph.touch(edgeKey(edgeIdOf(edge.edgeId)));
        }

        this.store.dropRows(op.rows);
    }
}

/**
 * Move the attribute revision of every top-level field a record write changed (design/sets 6.2):
 * each field whose value is not the same in the old and the new record, a field that appeared or
 * disappeared included; every field of a record added or taken away.
 * @param store - The store whose owner's counters move.
 * @param target - Node or edge.
 * @param prior - The record before, or undefined.
 * @param next - The record after, or undefined.
 * @param seen - The fields this batch (one command, one undo or redo of a step) bumped already.
 * @param announce - Whether to tell the sets that watch attributes, as an edit after load does.
 * A row added or removed announces nothing: the freeze that follows re-queues every watch.
 */
function bumpFields(
    store: GraphStore,
    target: RecordTarget,
    prior: GraphRecord | undefined,
    next: GraphRecord | undefined,
    seen: Bumped,
    announce = false,
): void {
    const fields = new Set<string>();
    for (const key of [...Object.keys(prior ?? {}), ...Object.keys(next ?? {})]) {
        if ((prior?.[key] !== next?.[key] || prior === undefined || next === undefined) && !seen[target].has(key)) {
            fields.add(key);
        }
    }

    if (fields.size === 0) {
        return;
    }

    for (const field of fields) {
        seen[target].add(field);
    }

    const { inputs } = store;
    (target === "node" ? inputs.nodes : inputs.edges).bump(fields);
    if (announce) {
        inputs.tick.announce({ kind: "attributes", element: target, fields: [...fields] });
    }
}

/** The fields one batch of writes has bumped already, by element: each moves once per batch. */
interface Bumped {
    readonly node: Set<string>;
    readonly edge: Set<string>;
}

/**
 * An empty batch.
 * @returns It.
 */
function bumped(): Bumped {
    return { node: new Set(), edge: new Set() };
}

/**
 * Put a map entry back to what it was: the value, or absent.
 * @param map - The map.
 * @param key - The key.
 * @param value - The value, or undefined for absent.
 */
function restore<K, V>(map: Map<K, V>, key: K, value: V | undefined): void {
    if (value === undefined) {
        map.delete(key);
    } else {
        map.set(key, value);
    }
}

/**
 * Three empty maps for the `graph` slice.
 * @returns The maps.
 */
function emptyMaps(): GraphMaps {
    return { nodes: new Map(), edges: new Map(), values: new Map() };
}

/**
 * Mark every key of a whole graph dirty, so the derivation pass builds or tears down each row.
 * @param graph - The primitives.
 * @param maps - The graph's maps.
 */
function touchAll(graph: GraphOps, maps: GraphMaps): void {
    // ponytail: O(rows) keys for a replace; a single "everything" key the graph hook diffs by
    // itself would make this O(1), worth it once a million-row clear is measured.
    for (const id of maps.nodes.keys()) {
        graph.touch(nodeKey(id));
    }

    for (const id of maps.edges.keys()) {
        graph.touch(edgeKey(id));
    }

    for (const name of maps.values.keys()) {
        graph.touch(`v:${name}`);
    }
}

/** The writer: writes live state, and records into its entry when it has a draft. */
class Writer implements GraphWriter {
    private entry: GraphEntry | null = null;
    /** The fields this command's writes bumped already: each moves once per command. */
    private readonly bumped = bumped();
    private begun = false;
    /** The run of consecutive edges marked as one range key; see `extendRun`. */
    private run: { readonly first: number; count: number; read: boolean } | null = null;

    constructor(
        private readonly graph: GraphOps,
        readonly store: GraphStore,
        private readonly draft: Draft | null,
    ) {}

    addNode(
        id: NodeId,
        given: GraphRecord,
        seed: readonly [number, number, number] | null,
    ): { index: number; merged: boolean } {
        this.begin();
        const record = frozenRecord(given);
        const nodes = this.graph.slice.nodes as Map<NodeId, GraphRecord>;
        const prior = nodes.get(id);
        let index = INVALID_INDEX;
        let merged = false;
        if (isStorableId(id)) {
            merged = this.store.builder.hasNode(id);
            index = this.rowNumbered(id, merged)
                ? this.store.builder.addAnonymousNodes(1)
                : this.store.builder.addNode(id);
            if (seed !== null) {
                this.store.builder.setNodeValue(this.store.seedColumn, index, seed);
            }

            // A merge may change only the record, which the builder does not hold.
            this.store.recordsChanged();
        }

        // A record holding only the id, as a node an edge made is given, puts nothing in the row.
        if (this.graph.countsRewrites && (prior !== undefined || (merged && Object.keys(record).length > 1))) {
            this.graph.noteRewrite();
        }

        nodes.set(id, record);
        bumpFields(this.store, "node", prior, record, this.bumped);
        this.record({ kind: "node", id, record, seed, existed: merged, prior }, nodeKey(id), NODES_ADDED);
        return { index, merged };
    }

    /**
     * Whether a new node's id is the row it lands on, so the builder may add it with no id map
     * (row-renderer.md 4.6, "Staging"): only under "batched", and only while the builder holds no
     * removed row, so the id cannot name a row waiting to be revived. The builder still builds its
     * map the first time a node with any other id joins.
     * @param id - The node's id.
     * @param merged - Whether a live node already has it.
     * @returns True when the node may be added as an anonymous row.
     */
    private rowNumbered(id: NodeId, merged: boolean): boolean {
        const { builder } = this.store;
        return (
            !merged && this.graph.touchesRanges && id === builder.nodeBound && builder.nodeBound === builder.nodeCount
        );
    }

    addEdge(
        source: unknown,
        target: unknown,
        weight: number,
        given: GraphRecord,
        fileId?: string | number,
    ): { index: number; edgeId: number } {
        if (!isStorableId(source) || !isStorableId(target)) {
            return { index: INVALID_INDEX, edgeId: INVALID_INDEX };
        }

        this.begin();
        const record = frozenRecord(given);
        const { builder } = this.store;
        const created = [source, target].filter((id, at, both) => !builder.hasNode(id) && both.indexOf(id) === at);
        const index = builder.addEdge(source, target, weight);
        const edgeId = this.store.nextEdgeId();
        this.store.stampEdgeId(index, edgeId);
        this.store.recordIngestedEdge(index, edgeId, fileId);
        this.store.recordsChanged();
        (this.graph.slice.edges as Map<EdgeId, GraphRecord>).set(edgeIdOf(edgeId), record);
        // A new row already reads the column default, 1: only another capacity costs a write.
        if (resolveEdgeCapacity(record) !== 1) {
            writeCapacity(this.store, edgeId, record);
        }

        bumpFields(this.store, "edge", undefined, record, this.bumped);
        const op: EdgeOp = { kind: "edge", edgeId, source, target, weight, record, created, fileId };
        if (this.entry !== null && this.graph.touchesRanges) {
            // The run marks its edges, and the rows they add and move, once per run, not per edge,
            // and the op log keeps it as one range.
            this.entry.pushRange(op);
            this.extendRun(edgeId);
        } else {
            this.record(op, edgeKey(edgeIdOf(edgeId)), EDGES_ADDED);
        }

        return { index, edgeId };
    }

    mergeEdge(edgeIndex: number, weight: number, given: GraphRecord | null): void {
        this.begin();
        this.graph.noteRewrite();
        const record = given === null ? null : frozenRecord(given);
        const edgeId = this.store.edgeIdAt(edgeIndex);
        const prior = this.store.builder.edgeWeight(edgeIndex);
        this.store.builder.setEdgeWeight(edgeIndex, weight);
        this.store.recordsChanged();
        this.record({ kind: "weight", edgeId, prior, next: weight }, edgeKey(edgeIdOf(edgeId)), null);
        if (record !== null) {
            const edges = this.graph.slice.edges as Map<EdgeId, GraphRecord>;
            const id = edgeIdOf(edgeId);
            const priorRecord = edges.get(id);
            edges.set(id, record);
            writeCapacity(this.store, edgeId, record);
            bumpFields(this.store, "edge", priorRecord, record, this.bumped);
            this.record({ kind: "record", target: "edge", id, prior: priorRecord, next: record }, edgeKey(id), null);
        }
    }

    nodeRecord(id: NodeId): GraphRecord | undefined {
        return this.graph.slice.nodes.get(id);
    }

    setAttributes(target: RecordTarget, id: NodeId, values: GraphRecord, replace = false): boolean {
        const map = (target === "node" ? this.graph.slice.nodes : this.graph.slice.edges) as Map<NodeId, GraphRecord>;
        const key = target === "node" ? id : String(id);
        const prior = map.get(key);
        // A node an edge made has a row and no record yet: the write gives it one.
        if (prior === undefined && !(target === "node" && this.store.builder.hasNode(key))) {
            return false;
        }

        // Writing what the record already holds changes nothing, so it records nothing: a second
        // identical edit is not a step of its own. The fields it wrote still move their
        // revisions, as every attribute write does (design/sets 6.2): comparing values to spare a
        // bump would cost a deep equality per field for no correctness gain.
        if (
            prior !== undefined &&
            (!replace || Object.keys(prior).length === Object.keys(values).length) &&
            Object.entries(values).every(
                ([name, value]) => Object.hasOwn(prior, name) && deepEquals(prior[name], value),
            )
        ) {
            const { inputs } = this.store;
            (target === "node" ? inputs.nodes : inputs.edges).bump(Object.keys(values));
            return true;
        }

        this.begin();
        this.graph.noteRewrite();
        const next = frozenRecord(replace ? values : { ...prior, ...values });
        map.set(key, next);
        if (target === "edge") {
            writeCapacity(this.store, edgeCounterOf(String(key)), next);
        }

        bumpFields(this.store, target, prior, next, this.bumped, true);
        // A layer or a filter may read any value just written, and the builder holds no record.
        this.store.recordsChanged();
        this.record(
            { kind: "record", target, id: key, prior, next },
            target === "node" ? nodeKey(key) : edgeKey(String(key)),
            null,
        );
        return true;
    }

    graphValue(name: string): unknown {
        return this.graph.slice.values.get(name);
    }

    setGraphValues(values: Readonly<Record<string, unknown>>): void {
        this.begin();
        const map = this.graph.slice.values as Map<string, unknown>;
        for (const [name, next] of Object.entries(values)) {
            const prior = map.get(name);
            restore(map, name, next);
            this.record({ kind: "value", name, prior, next }, `v:${name}`, null);
        }
    }

    setDirected(directed: boolean, statedBy: string): DirectionOutcome {
        const { store } = this;
        const { builder } = store;
        const prior = { directed: builder.directed, provenance: store.directionSettledBy };
        let outcome: DirectionOutcome;
        if (builder.directed === directed) {
            // The file agreed with what the builder already held, which is still the file
            // SETTLING the direction -- unless the configuration had locked it.
            if (builder.directedLocked) {
                return "unchanged";
            }

            outcome = "unchanged";
        } else if (builder.directedLocked) {
            return "config-wins";
        } else if (builder.edgeCount > 0) {
            return "edges-present";
        } else {
            builder.setDirected(directed);
            store.account();
            outcome = "applied";
        }

        this.begin();
        store.recordDirectionFromFile(statedBy);
        this.record(
            { kind: "direction", prior, next: { directed, provenance: store.directionSettledBy } },
            "directed",
            null,
        );
        return outcome;
    }

    removeNodes(ids: readonly NodeId[]): Removed {
        const nodes = this.graph.slice.nodes as Map<NodeId, GraphRecord>;
        const rowless = ids.filter((id) => nodes.has(id) && !(isStorableId(id) && this.store.builder.hasNode(id)));
        const stored = ids.filter((id) => isStorableId(id) && this.store.builder.hasNode(id));
        if (rowless.length === 0 && stored.length === 0) {
            return { nodes: [], edges: [] };
        }

        this.begin();
        this.graph.noteRewrite();
        // A record whose id graph-format would not store has no row: only the record goes.
        for (const id of new Set(rowless)) {
            const prior = nodes.get(id);
            nodes.delete(id);
            this.record({ kind: "record", target: "node", id, prior, next: undefined }, nodeKey(id), null);
        }

        const pins = this.graph.pins();
        this.graph.setPinned(
            this.draft,
            [...new Set(rowless)].filter((id) => pins.has(id)),
            false,
        );
        const removed = this.removeRows(stored, []);
        return { nodes: [...new Set(rowless), ...removed.nodes], edges: removed.edges };
    }

    removeEdges(ids: readonly EdgeId[]): Removed {
        const counters = ids
            .map((id) => edgeCounterOf(id))
            .filter((counter) => this.store.edgeIndexOf(counter) !== INVALID_INDEX);
        if (counters.length === 0) {
            return { nodes: [], edges: [] };
        }

        this.begin();
        this.graph.noteRewrite();
        return this.removeRows([], counters);
    }

    clear(): void {
        this.begin();
        this.graph.noteRewrite();
        const { slice } = this.graph;
        const prior: GraphMaps = { nodes: slice.nodes, edges: slice.edges, values: slice.values };
        // The pins go with the graph, in this draft, so undoing the clear pins them again.
        this.graph.setPinned(this.draft, [...this.graph.pins()], false);
        const kept = this.store.keep();
        this.graph.swapMaps(emptyMaps());
        // A new dataset: its coordinates are never restored from the one it replaced.
        const epochs = { prior: this.graph.slice.epoch, next: this.graph.newEpoch() };
        this.store.replace(kept, false);
        if (this.entry !== null) {
            this.entry.push({ kind: "replace", kept, prior, epochs });
            touchAll(this.graph, prior);
        }
    }

    /**
     * Take rows out of the store and their records out of the slice, recording both.
     * @param nodeIds - The nodes, each with a row.
     * @param edgeIds - The element-assigned ids of edges, each with a row.
     * @returns What was removed.
     */
    private removeRows(nodeIds: readonly NodeId[], edgeIds: readonly number[]): Removed {
        const nodes = this.graph.slice.nodes as Map<NodeId, GraphRecord>;
        const edges = this.graph.slice.edges as Map<EdgeId, GraphRecord>;
        const rows = this.store.removeRows(nodeIds, edgeIds);
        const nodeRecords = rows.nodes.map((node) => nodes.get(node.id));
        const edgeRecords = rows.edges.map((edge) => edges.get(edgeIdOf(edge.edgeId)));
        for (const node of rows.nodes) {
            nodes.delete(node.id);
        }

        for (const edge of rows.edges) {
            edges.delete(edgeIdOf(edge.edgeId));
        }

        // A removed node's pin goes with it, after the rows, so undo puts the rows back first.
        const pins = this.graph.pins();
        this.graph.setPinned(
            this.draft,
            rows.nodes.map((node) => node.id).filter((id) => pins.has(id)),
            false,
        );

        if (this.entry !== null) {
            this.entry.push({ kind: "remove", rows, nodeRecords, edgeRecords });
            for (const node of rows.nodes) {
                this.graph.touch(nodeKey(node.id));
            }

            for (const edge of rows.edges) {
                this.graph.touch(edgeKey(edgeIdOf(edge.edgeId)));
            }
        }

        return { nodes: rows.nodes.map((node) => node.id), edges: rows.edges.map((edge) => edgeIdOf(edge.edgeId)) };
    }

    /**
     * Add an edge to the run of consecutive edges this writer is marking as one range key, or
     * start a new run when it does not follow on or a pass already read the run's key. A new run
     * also marks the rows added and moved, which a pass reading the run's key has cleared.
     * @param edgeId - The edge's counter.
     */
    private extendRun(edgeId: number): void {
        const { run } = this;
        if (run !== null && !run.read && edgeId === run.first + run.count) {
            run.count++;
            return;
        }

        const next = { first: edgeId, count: 1, read: false };
        this.run = next;
        this.graph.touch(EDGES_ADDED);
        this.graph.touch(ROWS_MOVED);
        this.graph.touchLater(() => {
            next.read = true;
            return edgeRangeKey(next.first, next.count);
        });
    }

    /** Before the first write: a fresh token, and the entry a recorded writer logs into. */
    private begin(): void {
        if (this.begun) {
            return;
        }

        this.begun = true;
        // Anything that wrote the builder since the last primitive is kept, not absorbed.
        this.store.audit();
        const before = this.graph.slice.token;
        const after = this.graph.nextToken();
        if (this.draft !== null) {
            this.entry = new GraphEntry(this.graph, this.store, before, after);
            this.draft.log(this.entry);
        }
    }

    /**
     * Keep an op in the entry, and mark its key dirty, when the writer records.
     * @param op - The op.
     * @param key - Its lane key.
     * @param rows - The key marking the rows it added, or null.
     */
    private record(op: GraphOp, key: string, rows: string | null): void {
        if (this.entry === null) {
            return;
        }

        if (op.kind === "node" && this.graph.touchesRanges) {
            this.entry.pushNodeRange(op);
        } else {
            this.entry.push(op);
        }

        this.graph.touch(key);

        if (rows !== null) {
            this.graph.touch(rows);
        }

        if (movesRows(op)) {
            this.graph.touch(ROWS_MOVED);
        }
    }
}
