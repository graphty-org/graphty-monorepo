/**
 * @file Reading the graph: the session's data surface, over one snapshot.
 *
 * Three of these verbs -- attributes, statistics and the fingerprint -- have to walk the graph
 * to answer. They are still synchronous, and they are still safe to call from a render loop,
 * because each answer is cached against the snapshot it was computed from and a snapshot is
 * replaced only when the graph actually changes. The first reader after a change pays; everyone
 * else in the same revision reads a field.
 */

import { type DerivedGraph, type EdgeId, type GraphSnapshot, INVALID_INDEX, type NodeId } from "@graphty/graph-format";

import type { AttributeDescriptor } from "../catalog/types";
import { GraphtyError } from "../errors";
import { describeAttributes } from "./attributes";
import { computeFingerprint, computeStatistics } from "./statistics";
import type {
    EdgeRecord,
    GraphStatistics,
    NodeRecord,
    SessionDataApi,
    SessionDataConfig,
    SessionGraphStore,
    SessionRecordSource,
} from "./types";

/** Everything derived from one snapshot, computed on demand and thrown away with it. */
interface Derived {
    /** The snapshot the rest of this belongs to. */
    readonly snapshot: GraphSnapshot;
    /** The graph's shape, once something asked for it. */
    statistics: GraphStatistics | null;
    /** The attribute descriptors, once something asked for them. */
    attributes: readonly AttributeDescriptor[] | null;
    /** The topology fingerprint, once something asked for it. */
    fingerprint: string | null;
}

/**
 * The session's view of the graph data.
 *
 * It reads a store it does not own the lifetime of, so every answer starts from
 * `store.getSnapshot()` rather than from a snapshot held here: the store is free to replace the
 * snapshot, and a data surface holding the old one would answer confidently about a graph that
 * no longer exists.
 */
export class SessionData implements SessionDataApi {
    readonly store: SessionGraphStore;

    private readonly records: SessionRecordSource | null;
    private readonly readConfig: () => SessionDataConfig;
    private derived: Derived | null = null;
    private disposed = false;

    /**
     * Build the data surface.
     * @param store - the store to read
     * @param records - where to read the attributes a record arrived with, or null when the
     *     element holds none
     * @param readConfig - reads the data configuration, live: the element replaces that object
     *     when a style template is applied, so it is read on demand rather than captured
     */
    constructor(store: SessionGraphStore, records: SessionRecordSource | null, readConfig: () => SessionDataConfig) {
        this.store = store;
        this.records = records;
        this.readConfig = readConfig;
    }

    /**
     * The current snapshot, freezing first when records have arrived since the last freeze.
     * @returns the immutable snapshot
     * @throws A `GraphtyError` with `E_DISPOSED` when the session has been disposed.
     */
    snapshot(): GraphSnapshot {
        this.requireLive("snapshot");
        return this.store.getSnapshot();
    }

    /**
     * The undirected view of a snapshot.
     * @param snapshot - the snapshot to derive from; the current one by default
     * @returns the derived graph
     * @throws A `GraphtyError` with `E_DISPOSED` when the session has been disposed.
     */
    undirected(snapshot?: GraphSnapshot): DerivedGraph {
        this.requireLive("undirected");
        return this.store.undirected(snapshot ?? this.store.getSnapshot());
    }

    /**
     * One node, by id.
     * @param id - the node id, compared without coercion
     * @returns the record, or undefined when the graph has no such node
     * @throws A `GraphtyError` with `E_DISPOSED` when the session has been disposed.
     */
    node(id: NodeId): NodeRecord | undefined {
        const snapshot = this.snapshot();
        const index = snapshot.ids.indexOf(id);
        if (index === INVALID_INDEX) {
            return undefined;
        }

        // The id is written AFTER the attribute bag so that a record carrying its own "id" key --
        // which every record imported through the element's default id path does -- cannot
        // disagree with the id the node is actually stored under.
        return Object.freeze({ ...this.records?.nodeAttributes(index, id), id });
    }

    /**
     * One edge, by the element-assigned edge id.
     * @param id - the edge id
     * @returns the record, or undefined when the graph has no such edge
     * @throws A `GraphtyError` with `E_DISPOSED` when the session has been disposed.
     */
    edge(id: EdgeId): EdgeRecord | undefined {
        const snapshot = this.snapshot();
        const index = snapshot.edgeIndexOf(id);
        if (index === INVALID_INDEX) {
            return undefined;
        }

        return Object.freeze({
            ...this.records?.edgeAttributes(index),
            id,
            source: snapshot.ids.idOf(snapshot.edgeSource(index)),
            target: snapshot.ids.idOf(snapshot.edgeTarget(index)),
        });
    }

    /**
     * Every attribute the graph's records carry.
     * @returns the descriptors, node attributes first
     * @throws A `GraphtyError` with `E_DISPOSED` when the session has been disposed.
     */
    attributes(): readonly AttributeDescriptor[] {
        const derived = this.derivedFor(this.snapshot());
        derived.attributes ??= describeAttributes(derived.snapshot, this.records);
        return derived.attributes;
    }

    /**
     * The graph's shape.
     * @returns the statistics
     * @throws A `GraphtyError` with `E_DISPOSED` when the session has been disposed.
     */
    statistics(): GraphStatistics {
        const derived = this.derivedFor(this.snapshot());
        derived.statistics ??= computeStatistics(derived.snapshot, this.readConfig().directed);
        return derived.statistics;
    }

    /**
     * A stable identity for the graph's topology.
     * @returns the fingerprint
     * @throws A `GraphtyError` with `E_DISPOSED` when the session has been disposed.
     */
    fingerprint(): string {
        const derived = this.derivedFor(this.snapshot());
        derived.fingerprint ??= computeFingerprint(derived.snapshot);
        return derived.fingerprint;
    }

    /**
     * Refuse every verb from here on, and let go of what was derived from the last snapshot.
     *
     * The store is NOT touched: the session decides whose store it is, and this class is handed
     * one either way.
     */
    dispose(): void {
        this.disposed = true;
        this.derived = null;
    }

    /**
     * The derived cache for one snapshot, emptied when the snapshot is not the one it was built
     * for.
     *
     * Identity is the whole test. A store hands back the same frozen object until the graph
     * changes, so `!==` is exactly "the graph changed", and it works the same whether the store
     * belongs to this session or to a data manager that never tells it anything.
     * @param snapshot - the snapshot being read
     * @returns the cache for that snapshot
     */
    private derivedFor(snapshot: GraphSnapshot): Derived {
        if (this.derived === null || this.derived.snapshot !== snapshot) {
            this.derived = { snapshot, statistics: null, attributes: null, fingerprint: null };
        }

        return this.derived;
    }

    /**
     * Refuse a verb on a disposed session, naming it.
     * @param verb - the verb that was called
     * @throws A `GraphtyError` with `E_DISPOSED`.
     */
    private requireLive(verb: string): void {
        if (this.disposed) {
            throw new GraphtyError({
                code: "E_DISPOSED",
                message: `the session has been disposed, so data.${verb}() cannot answer`,
                source: "data",
                details: { verb },
            });
        }
    }
}
