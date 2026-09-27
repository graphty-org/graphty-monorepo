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
import type { GraphStore, KeptGraph, RemovedRows } from "../../data/GraphStore";
import { deepEquals } from "../styles/predicate";
import type { DirectionProvenance } from "../types";
import { type Draft, frozenRecord, type OpLogEntry } from "./draft";
import { createCounter, emptyGraphSlice, type GraphRecord, type GraphSlice } from "./state";
import { builderDrift, strictViolation } from "./strict";

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

/** The lane key marking that node rows were added: a forward pass starts the layout and frames. */
export const NODES_ADDED = "rows:nodes";

/** The lane key marking that edge rows were added: a forward pass starts the layout. */
export const EDGES_ADDED = "rows:edges";

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
      }
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
     * @returns The row and the id; INVALID_INDEX for both when either endpoint cannot be stored.
     */
    addEdge(source: unknown, target: unknown, weight: number, record: GraphRecord): { index: number; edgeId: number };
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
     * @returns False when the graph holds no such element.
     */
    setAttributes(target: RecordTarget, id: NodeId, values: GraphRecord): boolean;
    /**
     * Set graph-level values: the import report, graph-level results.
     * @param values - The values by name.
     */
    setGraphValues(values: Readonly<Record<string, unknown>>): void;
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
     * primitives. The dispatcher asks at each dispatch and each commit.
     */
    checkStore(): void {
        const drift = this.store?.isDisposed === false ? this.store.mutationDrift : 0;
        if (drift > 0) {
            throw builderDrift(drift);
        }
    }

    /**
     * Take a token never issued before and make it the slice's.
     * @returns The token.
     */
    retoken(): number {
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
     * Pin or release nodes in the `pins` slice, recording the change in `draft`.
     * @param draft - The command's draft, or null for a write with no history to record into.
     * @param ids - The nodes.
     * @param pinned - Pin, or release.
     * @returns The ids whose pin changed.
     */
    setPinned(draft: Draft | null, ids: readonly NodeId[], pinned: boolean): NodeId[] {
        const pins = this.home.pins();
        const changed = [...new Set(ids)].filter((id) => pins.has(id) !== pinned);
        if (changed.length === 0) {
            return changed;
        }

        const entry = new PinsEntry(this, changed, pinned);
        entry.redo();
        draft?.log(entry);
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

/**
 * The node and edge ids the steps an undo, a redo or a restore passed touched, which the session
 * then selects (design/undo/undo-design.md section 8). Collection stops, and nothing is selected,
 * once a replace or a clear passes or more ids than the limit are touched: selecting everything
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
        (entry) => entry instanceof GraphEntry && entry.ops.some((op) => op.kind === "remove" && op.rows.nodes.length > 0),
    );
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
            entry.ops.some((op) => (op.kind === "node" ? !op.existed : op.kind !== "record" && op.kind !== "value")),
    );
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

    bytes(): number {
        return this.retained;
    }

    touched(into: TouchedIds): void {
        for (const op of this.ops) {
            switch (op.kind) {
                case "node":
                    into.node(op.id);
                    break;
                case "edge":
                    into.edge(edgeIdOf(op.edgeId));
                    for (const id of op.created) {
                        into.node(id);
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
                    return;
                default:
                    // "value" and "direction" name no element.
                    break;
            }
        }
    }

    /**
     * The slice's maps now, writable.
     * @returns The maps.
     */
    private maps(): { nodes: Map<NodeId, GraphRecord>; edges: Map<EdgeId, GraphRecord>; values: Map<string, unknown> } {
        const { slice } = this.graph;
        return {
            nodes: slice.nodes as Map<NodeId, GraphRecord>,
            edges: slice.edges as Map<EdgeId, GraphRecord>,
            values: slice.values as Map<string, unknown>,
        };
    }

    undo(rollback: boolean): void {
        const { store } = this;
        store.audit();
        // Re-read after a replace, which swaps the maps.
        let { nodes, edges, values } = this.maps();
        for (let index = this.ops.length - 1; index >= 0; index--) {
            const op = this.ops[index];
            switch (op.kind) {
                case "node":
                    restore(nodes, op.id, op.prior);
                    if (!op.existed && isStorableId(op.id)) {
                        // Behind a structural change still waiting, the row goes with it, at
                        // the next read: reading the builder now would rebuild the graph.
                        if (store.deferring) {
                            store.dropAdded([op.id], []);
                        } else if (store.builder.hasNode(op.id)) {
                            store.builder.removeNode(op.id);
                        }
                    }

                    this.graph.touch(nodeKey(op.id));
                    break;
                case "edge": {
                    edges.delete(edgeIdOf(op.edgeId));
                    const created = op.created.filter((id) => !nodes.has(id));
                    if (store.deferring) {
                        store.dropAdded(created, [op.edgeId]);
                    } else {
                        const row = store.edgeIndexOf(op.edgeId);
                        if (row !== INVALID_INDEX) {
                            store.builder.removeEdge(row);
                        }

                        for (const id of created) {
                            if (store.builder.hasNode(id)) {
                                store.builder.removeNode(id);
                            }
                        }
                    }

                    this.graph.touch(edgeKey(edgeIdOf(op.edgeId)));
                    break;
                }

                case "weight": {
                    const row = store.edgeIndexOf(op.edgeId);
                    if (row !== INVALID_INDEX) {
                        store.builder.setEdgeWeight(row, op.prior);
                    }

                    this.graph.touch(edgeKey(edgeIdOf(op.edgeId)));
                    break;
                }

                case "record":
                    restore(
                        op.target === "node" ? nodes : edges,
                        op.target === "node" ? op.id : String(op.id),
                        op.prior,
                    );
                    this.graph.touch(op.target === "node" ? nodeKey(op.id) : edgeKey(String(op.id)));
                    break;
                case "value":
                    restore(values, op.name, op.prior);
                    this.graph.touch(`v:${op.name}`);
                    break;
                case "remove":
                    op.rows.nodes.forEach((node, at) => {
                        restore(nodes, node.id, op.nodeRecords[at]);
                        this.graph.touch(nodeKey(node.id));
                    });
                    op.rows.edges.forEach((edge, at) => {
                        restore(edges, edgeIdOf(edge.edgeId), op.edgeRecords[at]);
                        this.graph.touch(edgeKey(edgeIdOf(edge.edgeId)));
                    });
                    store.insertRows(op.rows);
                    break;
                case "replace":
                    this.graph.swapMaps(op.prior);
                    this.graph.restoreEpoch(op.epochs.prior);
                    ({ nodes, edges, values } = this.maps());
                    touchAll(this.graph, op.prior);
                    store.replace(op.kept, true);
                    break;
                default:
                    // "direction"
                    if (store.builder.directed !== op.prior.directed && !store.builder.directedLocked) {
                        store.builder.setDirected(op.prior.directed);
                    }

                    store.restoreDirection(op.prior.provenance);
                    this.graph.touch("directed");
                    break;
            }
        }

        store.touch();
        if (rollback) {
            this.graph.retoken();
        } else {
            this.graph.restoreToken(this.tokenBefore);
        }
    }

    redo(): void {
        const { store } = this;
        store.audit();
        // Re-read after a replace, which swaps the maps.
        let { nodes, edges, values } = this.maps();
        const added = new Set<string>();
        for (const op of this.ops) {
            switch (op.kind) {
                case "node":
                    if (isStorableId(op.id)) {
                        const row = store.builder.addNode(op.id);
                        if (op.seed !== null) {
                            store.builder.setNodeValue(store.seedColumn, row, op.seed);
                        }
                    }

                    nodes.set(op.id, op.record);
                    this.graph.touch(nodeKey(op.id));
                    added.add(NODES_ADDED);
                    break;
                case "edge": {
                    const row = store.builder.addEdge(op.source, op.target, op.weight);
                    store.stampEdgeId(row, op.edgeId);
                    edges.set(edgeIdOf(op.edgeId), op.record);
                    this.graph.touch(edgeKey(edgeIdOf(op.edgeId)));
                    added.add(EDGES_ADDED);
                    break;
                }

                case "weight": {
                    const row = store.edgeIndexOf(op.edgeId);
                    if (row !== INVALID_INDEX) {
                        store.builder.setEdgeWeight(row, op.next);
                    }

                    this.graph.touch(edgeKey(edgeIdOf(op.edgeId)));
                    break;
                }

                case "record":
                    restore(
                        op.target === "node" ? nodes : edges,
                        op.target === "node" ? op.id : String(op.id),
                        op.next,
                    );
                    this.graph.touch(op.target === "node" ? nodeKey(op.id) : edgeKey(String(op.id)));
                    break;
                case "value":
                    restore(values, op.name, op.next);
                    this.graph.touch(`v:${op.name}`);
                    break;
                case "remove":
                    for (const node of op.rows.nodes) {
                        nodes.delete(node.id);
                        this.graph.touch(nodeKey(node.id));
                    }

                    for (const edge of op.rows.edges) {
                        edges.delete(edgeIdOf(edge.edgeId));
                        this.graph.touch(edgeKey(edgeIdOf(edge.edgeId)));
                    }

                    store.dropRows(op.rows);
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

        store.touch();
        this.graph.restoreToken(this.tokenAfter);
    }
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
    private begun = false;

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
            index = this.store.builder.addNode(id);
            if (seed !== null) {
                this.store.builder.setNodeValue(this.store.seedColumn, index, seed);
            }

            // EVERY mutating path touches, including a merge: `builder.mutationCount` counts
            // neither a merge nor a column write (DEP-M6-A).
            this.store.touch();
        }

        nodes.set(id, record);
        this.record({ kind: "node", id, record, seed, existed: merged, prior }, nodeKey(id), NODES_ADDED);
        return { index, merged };
    }

    addEdge(source: unknown, target: unknown, weight: number, given: GraphRecord): { index: number; edgeId: number } {
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
        this.store.touch();
        (this.graph.slice.edges as Map<EdgeId, GraphRecord>).set(edgeIdOf(edgeId), record);
        this.record(
            { kind: "edge", edgeId, source, target, weight, record, created },
            edgeKey(edgeIdOf(edgeId)),
            EDGES_ADDED,
        );
        return { index, edgeId };
    }

    mergeEdge(edgeIndex: number, weight: number, given: GraphRecord | null): void {
        this.begin();
        const record = given === null ? null : frozenRecord(given);
        const edgeId = this.store.edgeIdAt(edgeIndex);
        const prior = this.store.builder.edgeWeight(edgeIndex);
        this.store.builder.setEdgeWeight(edgeIndex, weight);
        this.store.touch();
        this.record({ kind: "weight", edgeId, prior, next: weight }, edgeKey(edgeIdOf(edgeId)), null);
        if (record !== null) {
            const edges = this.graph.slice.edges as Map<EdgeId, GraphRecord>;
            const id = edgeIdOf(edgeId);
            const priorRecord = edges.get(id);
            edges.set(id, record);
            this.record({ kind: "record", target: "edge", id, prior: priorRecord, next: record }, edgeKey(id), null);
        }
    }

    setAttributes(target: RecordTarget, id: NodeId, values: GraphRecord): boolean {
        const map = (target === "node" ? this.graph.slice.nodes : this.graph.slice.edges) as Map<NodeId, GraphRecord>;
        const key = target === "node" ? id : String(id);
        const prior = map.get(key);
        if (prior === undefined) {
            return false;
        }

        // Writing what the record already holds changes nothing, so it records nothing: a second
        // identical edit is not a step of its own.
        if (Object.entries(values).every(([name, value]) => Object.hasOwn(prior, name) && deepEquals(prior[name], value))) {
            return true;
        }

        this.begin();
        const next = frozenRecord({ ...prior, ...values });
        map.set(key, next);
        // A layer or a filter may read any value just written, so every reader keyed on the
        // snapshot asks again.
        this.store.touch();
        this.record(
            { kind: "record", target, id: key, prior, next },
            target === "node" ? nodeKey(key) : edgeKey(String(key)),
            null,
        );
        return true;
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
            // The direction is frozen into the snapshot, and the store does not key its cache on
            // `builder.mutationCount`, so a snapshot taken before the declaration would be served.
            store.touch();
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
        return this.removeRows([], counters);
    }

    clear(): void {
        this.begin();
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

    /** Before the first write: a fresh token, and the entry a recorded writer logs into. */
    private begin(): void {
        if (this.begun) {
            return;
        }

        this.begun = true;
        // Anything that wrote the builder since the last primitive is kept, not absorbed.
        this.store.audit();
        const before = this.graph.slice.token;
        const after = this.graph.retoken();
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

        this.entry.push(op);
        this.graph.touch(key);
        if (rows !== null) {
            this.graph.touch(rows);
        }
    }
}
