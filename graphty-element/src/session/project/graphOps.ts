/**
 * @file The graph primitives: the only writers of the `graph` slice and of the builder behind it.
 *
 * A primitive writes live state at once and records, beside the write, the resolved values its
 * inverse needs: the ids it added, the prior records of what it patched, an edge's endpoints,
 * weight and element-assigned id. Undo and redo write those values straight back into the builder
 * and the slice. They never go through ingest, so a change of the id path, the repeated-edge policy
 * or the weight path made after the write does not change what redo writes. See
 * design/undo/undo-design.md section 3.4, "The `graph` slice is an op-log".
 *
 * A {@link GraphWriter} is what ingest writes through. One bound to a command's draft records one
 * op-log entry per writer. The loads that do not come through the dispatcher yet run inside
 * {@link GraphOps.withUnrecordedWrites}, naming the door they came from: their writes record
 * nothing and clear the history, because steps recorded against the graph before the load cannot
 * be undone to any state that still exists. A writer with neither is a write outside the
 * dispatcher: strict state throws, and production logs it once.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import { INVALID_INDEX } from "@graphty/graph-format";

import type { EdgeId, NodeId } from "../../catalog/types";
import { edgeIdOf } from "../../data/edgeIdentity";
import type { GraphStore } from "../../data/GraphStore";
import type { DirectionProvenance } from "../types";
import type { Draft, OpLogEntry } from "./draft";
import { createCounter, emptyGraphSlice, type GraphRecord, type GraphSlice } from "./state";
import { strictViolation } from "./strict";

/**
 * The doors whose loads still write the graph without the dispatcher, each until the phase of
 * design/undo/undo-plan.md that ports it. `test/session/history/graph-add.test.ts` checks that each
 * is still a `knownGap` row in `../commands/doors.ts`, so a door ported without leaving this list
 * fails there.
 */
export const UNRECORDED_DOORS = [
    "DataManager.addDataFromSource",
    "DataManager.setEdges",
    "DataManager.clear",
    "DataManager.removeNodeAndIncidentEdges",
    "DataManager.removeEdge",
] as const;

/** A door allowed to write the graph without recording. */
export type UnrecordedDoor = (typeof UNRECORDED_DOORS)[number];

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
    /** Unrecorded writes happened: drop the history. */
    forget(): void;
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
          readonly kind: "direction";
          readonly prior: { readonly directed: boolean; readonly provenance: DirectionProvenance };
          readonly next: { readonly directed: boolean; readonly provenance: DirectionProvenance };
      };

/**
 * Whether an id is one graph-format stores: a string or a finite number.
 * @param id - The id.
 * @returns True when it can be stored.
 */
function isStorableId(id: unknown): id is string | number {
    return typeof id === "string" || (typeof id === "number" && Number.isFinite(id));
}

/**
 * What ingest writes through: one command's writes, or one legacy load's.
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
    addNode(id: NodeId, record: GraphRecord, seed: readonly [number, number, number] | null): { index: number; merged: boolean };
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
}

/** Unrecorded writes: their door, and whether the history was already dropped for them. */
interface UnrecordedScope {
    readonly door: UnrecordedDoor;
}

/** The graph primitives of one session (or of one data manager with no session). */
export class GraphOps {
    private readonly home: GraphHome;
    private readonly tokens = createCounter();
    private warned = false;

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
        return new GraphOps({
            read: () => slice,
            write: (next) => {
                slice = next;
            },
            touch: () => undefined,
            forget: () => undefined,
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
                    "a graph primitive was called outside a command and outside withUnrecordedWrites; " +
                        "dispatch data.apply, or name the legacy door",
                );
            }

            if (!this.warned) {
                this.warned = true;
                console.warn("[graphty] The graph was written outside a command; that write cannot be undone.");
            }
        }

        return new Writer(this, store, draft, null);
    }

    /**
     * Run a load that does not come through the dispatcher yet. Its writes record nothing, take a
     * fresh graph token and clear the history. Temporary: each door leaves
     * {@link UNRECORDED_DOORS} in the phase that ports it.
     * @param door - The door the load came through.
     * @param store - The store it writes.
     * @param fn - The load, handed the writer to write through.
     * @returns What `fn` returns.
     */
    withUnrecordedWrites<T>(door: UnrecordedDoor, store: GraphStore, fn: (writer: GraphWriter) => T): T {
        this.checkDoor(door);
        return fn(new Writer(this, store, null, { door }));
    }

    /**
     * Drop every record and graph value, unrecorded: the store has been emptied. Takes a fresh
     * token and clears the history.
     * @param door - The door that emptied it.
     */
    discardAll(door: UnrecordedDoor): void {
        this.checkDoor(door);
        const slice = this.home.read();
        (slice.nodes as Map<NodeId, GraphRecord>).clear();
        (slice.edges as Map<EdgeId, GraphRecord>).clear();
        (slice.values as Map<string, unknown>).clear();
        this.retoken();
        this.home.forget();
    }

    /**
     * Forget the records of rows a door removed without recording. The history is kept: the
     * inverses skip rows that are gone. Temporary, until the removals come through `data.apply`.
     * @param door - The door that removed them.
     * @param nodes - The node ids removed.
     * @param edges - The edge ids removed with them.
     */
    dropRecords(door: UnrecordedDoor, nodes: readonly NodeId[], edges: readonly EdgeId[]): void {
        this.checkDoor(door);
        const slice = this.home.read();
        for (const id of nodes) {
            (slice.nodes as Map<NodeId, GraphRecord>).delete(id);
        }

        for (const id of edges) {
            (slice.edges as Map<EdgeId, GraphRecord>).delete(id);
        }

        this.retoken();
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
     * Mark a key dirty on the lane.
     * @param key - The key.
     */
    touch(key: string): void {
        this.home.touch(key);
    }

    /** Drop the history, for an unrecorded write. */
    forget(): void {
        this.home.forget();
    }

    /**
     * Strict: only a door still waiting for its port may write without recording.
     * @param door - The door.
     */
    private checkDoor(door: string): void {
        if (this.home.strict && !(UNRECORDED_DOORS as readonly string[]).includes(door)) {
            throw strictViolation(`${door} wrote the graph without the dispatcher but is not a known gap`);
        }
    }
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
        }
    }

    bytes(): number {
        return this.retained;
    }

    undo(rollback: boolean): void {
        const { store } = this;
        const nodes = this.graph.slice.nodes as Map<NodeId, GraphRecord>;
        const edges = this.graph.slice.edges as Map<EdgeId, GraphRecord>;
        const values = this.graph.slice.values as Map<string, unknown>;
        for (let index = this.ops.length - 1; index >= 0; index--) {
            const op = this.ops[index];
            switch (op.kind) {
                case "node":
                    restore(nodes, op.id, op.prior);
                    if (!op.existed && isStorableId(op.id) && store.builder.hasNode(op.id)) {
                        store.builder.removeNode(op.id);
                    }

                    this.graph.touch(nodeKey(op.id));
                    break;
                case "edge": {
                    const row = store.edgeIndexOf(op.edgeId);
                    if (row !== INVALID_INDEX) {
                        store.builder.removeEdge(row);
                    }

                    edges.delete(edgeIdOf(op.edgeId));
                    for (const id of op.created) {
                        if (!nodes.has(id) && store.builder.hasNode(id)) {
                            store.builder.removeNode(id);
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
                    restore(op.target === "node" ? nodes : edges, op.target === "node" ? op.id : String(op.id), op.prior);
                    this.graph.touch(op.target === "node" ? nodeKey(op.id) : edgeKey(String(op.id)));
                    break;
                case "value":
                    restore(values, op.name, op.prior);
                    this.graph.touch(`v:${op.name}`);
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
        const nodes = this.graph.slice.nodes as Map<NodeId, GraphRecord>;
        const edges = this.graph.slice.edges as Map<EdgeId, GraphRecord>;
        const values = this.graph.slice.values as Map<string, unknown>;
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
                    restore(op.target === "node" ? nodes : edges, op.target === "node" ? op.id : String(op.id), op.next);
                    this.graph.touch(op.target === "node" ? nodeKey(op.id) : edgeKey(String(op.id)));
                    break;
                case "value":
                    restore(values, op.name, op.next);
                    this.graph.touch(`v:${op.name}`);
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

/** The writer: writes live state, and records into its entry when it has a draft. */
class Writer implements GraphWriter {
    private entry: GraphEntry | null = null;
    private begun = false;

    constructor(
        private readonly graph: GraphOps,
        readonly store: GraphStore,
        private readonly draft: Draft | null,
        private readonly unrecorded: UnrecordedScope | null,
    ) {}

    addNode(
        id: NodeId,
        record: GraphRecord,
        seed: readonly [number, number, number] | null,
    ): { index: number; merged: boolean } {
        this.begin();
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

    addEdge(source: unknown, target: unknown, weight: number, record: GraphRecord): { index: number; edgeId: number } {
        if (!isStorableId(source) || !isStorableId(target)) {
            return { index: INVALID_INDEX, edgeId: INVALID_INDEX };
        }

        this.begin();
        const { builder } = this.store;
        const created = [source, target].filter((id, at, both) => !builder.hasNode(id) && both.indexOf(id) === at);
        const index = builder.addEdge(source, target, weight);
        const edgeId = this.store.nextEdgeId();
        this.store.stampEdgeId(index, edgeId);
        this.store.touch();
        (this.graph.slice.edges as Map<EdgeId, GraphRecord>).set(edgeIdOf(edgeId), record);
        this.record({ kind: "edge", edgeId, source, target, weight, record, created }, edgeKey(edgeIdOf(edgeId)), EDGES_ADDED);
        return { index, edgeId };
    }

    mergeEdge(edgeIndex: number, weight: number, record: GraphRecord | null): void {
        this.begin();
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

        this.begin();
        const next = { ...prior, ...values };
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

    /** Before the first write: a fresh token, and the entry or the dropped history. */
    private begin(): void {
        if (this.begun) {
            return;
        }

        this.begun = true;
        const before = this.graph.slice.token;
        const after = this.graph.retoken();
        if (this.draft !== null) {
            this.entry = new GraphEntry(this.graph, this.store, before, after);
            this.draft.log(this.entry);
        } else if (this.unrecorded !== null) {
            this.graph.forget();
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
