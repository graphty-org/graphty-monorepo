/**
 * @file A Node-side stand-in for the data layer the sets tests drive: one session's edge counter,
 * the store it currently fills, loads bracketed the way `DataManager` brackets them, and the kept
 * sets doors over it.
 *
 * Everything that decides identity is production code: `ingestEdge` stamps counters, the store's
 * completion pass writes ordinals, among and hashes, `decideRepeat` decides which repeated
 * records become edges, and `sessionEdgeMember` turns a session edge id into its stable member.
 * What this file does itself is only what `DataManager` does around them: look up the edge a
 * record repeats (by file id when the record has one, else the oldest edge of its pair), keep
 * each edge's record, and start a new store on a replacing import.
 */

import { type DuplicatePolicy, type GraphSnapshot, INVALID_INDEX } from "@graphty/graph-format";

import type { EdgeId, NodeId } from "../../../src/catalog/types";
import {
    createEdgeCounter,
    decideRepeat,
    EDGE_ID_COLUMN,
    type EdgeCounter,
    edgeIdOf,
    IDENTITY_COLUMNS,
    PAIRS_ORDERED_ATTRIBUTE,
    pairsOrdered,
    resumeEdgeCounter,
} from "../../../src/data/edgeIdentity";
import { GraphStore } from "../../../src/data/GraphStore";
import { createSetsApi, sessionEdgeMember, setsStoreOf } from "../../../src/session/sets/SetsApi";
import type { SetsStore } from "../../../src/session/sets/store";
import type { SetsApi } from "../../../src/session/sets/types";
import { ingestDeclaredDirection, ingestEdge, ingestNode } from "../../helpers/rawIngest";

/** One edge record: endpoints, weight, and any fields (a file id among them). */
export interface EdgeRecord {
    readonly s: NodeId;
    readonly t: NodeId;
    readonly w?: number;
    readonly fields?: Readonly<Record<string, unknown>>;
}

/** How a load arrives. */
export interface LoadOptions {
    /** The repeated-edge policy; `keep` when absent. */
    readonly policy?: DuplicatePolicy;
    /** How many chunks, with a freeze between each. */
    readonly chunks?: number;
    /** False ingests the records as session edges, with no load open. */
    readonly asLoad?: boolean;
}

/**
 * A usable file id: a string, or a finite number, as `DataManager` accepts one.
 * @param value - The value read at the id path.
 * @returns The id, or undefined.
 */
function usableId(value: unknown): string | number | undefined {
    return typeof value === "string" || (typeof value === "number" && Number.isFinite(value)) ? value : undefined;
}

/** One session's data layer, in Node. */
export class TestGraph {
    readonly counter: EdgeCounter = createEdgeCounter();
    store: GraphStore;
    /** Each edge's record fields, by counter. */
    readonly bags = new Map<number, Readonly<Record<string, unknown>>>();
    /** The configured `edgeIdPath`. */
    path: string | null = null;
    readonly sets: SetsApi;
    readonly setsStore: SetsStore;
    /** Whether the last load stopped at a repeat the `error` policy refused. */
    lastLoadRefused = false;
    /** How many of the last load's records were read, the refused one included. */
    lastLoadRead = 0;
    /** The record each edge the last load created came from, aligned with what it returned. */
    lastLoadSources: number[] = [];
    /** File id to counter, per store, as `DataManager.edgesByRecordId`. */
    private byFileId = new Map<string | number, number>();
    /** Counter to builder row, followed through every freeze's edge remap, as `DataManager` does. */
    private counterRow = new Map<number, number>();

    /**
     * A session with an empty store.
     * @param directed - The store's `data.directed`.
     */
    constructor(directed: boolean | "auto" = "auto") {
        this.store = this.newStore(directed);
        this.sets = createSetsApi({
            edgeMember: (id: EdgeId) =>
                sessionEdgeMember(this.snapshot(), id, (row) => this.bags.get(this.counterAt(row)), this.path),
        });
        this.setsStore = setsStoreOf(this.sets);
    }

    /**
     * The current snapshot.
     * @returns It.
     */
    snapshot(): GraphSnapshot {
        return this.store.getSnapshot();
    }

    /**
     * The store resolutions are tagged with.
     * @returns The current store.
     */
    storeTag(): object {
        return this.store;
    }

    /**
     * The record an edge carries now.
     * @param counter - The edge.
     * @returns Its fields.
     */
    bag(counter: number): Readonly<Record<string, unknown>> | undefined {
        return this.bags.get(counter);
    }

    /**
     * The counter at a row of the current snapshot.
     * @param row - The row.
     * @returns The counter.
     */
    counterAt(row: number): number {
        return this.snapshot().edges.requireTyped(EDGE_ID_COLUMN, "u32").data[row];
    }

    /**
     * The row carrying a counter, or `INVALID_INDEX`.
     * @param counter - The counter.
     * @returns The row.
     */
    rowOf(counter: number): number {
        return this.snapshot().edgeIndexOf(counter);
    }

    /**
     * Every live edge's counter, ascending.
     * @returns The counters.
     */
    counters(): number[] {
        return [...this.snapshot().edges.requireTyped(EDGE_ID_COLUMN, "u32").data].sort((a, b) => a - b);
    }

    /**
     * Start a new store, as a Clear or a replacing import does: the counter carries on.
     * @param directed - The new store's `data.directed`.
     */
    replaceStore(directed: boolean | "auto" = "auto"): void {
        this.store.dispose();
        this.store = this.newStore(directed);
        this.byFileId = new Map();
        this.counterRow = new Map();
    }

    /**
     * Ingest records, as one load unless told otherwise.
     * @param records - The records.
     * @param options - Policy, chunking and bracketing.
     * @param declared - A direction the file declares, applied before its edges.
     * @returns The counters of the edges the records became, in ingest order. A repeat the `error`
     *     policy refuses stops the load there, as `E_DUPLICATE_EDGE` does, and sets
     *     {@link lastLoadRefused}; what came before it stays.
     */
    load(records: readonly EdgeRecord[], options: LoadOptions = {}, declared?: boolean): number[] {
        const { policy = "keep", chunks = 1, asLoad = true } = options;
        const { store } = this;
        const { builder } = store;
        const created: number[] = [];
        this.lastLoadRefused = false;
        this.lastLoadRead = 0;
        this.lastLoadSources = [];
        if (asLoad) {
            store.openLoad();
        }

        try {
            if (declared !== undefined) {
                ingestDeclaredDirection(store, declared, "test file");
            }

            const perChunk = Math.max(1, Math.ceil(records.length / chunks));
            for (const [i, record] of records.entries()) {
                if (i > 0 && i % perChunk === 0) {
                    store.getSnapshot();
                }

                ingestNode(store, record.s, {});
                ingestNode(store, record.t, {});
                this.lastLoadRead = i + 1;
                const weight = record.w ?? 1;
                const fields = record.fields ?? {};
                const fileId = this.path === null ? undefined : usableId(fields[this.path]);
                const known =
                    fileId === undefined
                        ? builder.findEdges(builder.indexOf(record.s), builder.indexOf(record.t))[0]
                        : this.liveRow(this.byFileId.get(fileId));
                if (known !== undefined && known !== INVALID_INDEX) {
                    const decision = decideRepeat(policy, builder.edgeWeight(known), weight);
                    if (decision.kind === "refuse") {
                        this.lastLoadRefused = true;
                        break;
                    }

                    if (decision.kind === "drop") {
                        continue;
                    }

                    if (decision.kind === "merge") {
                        builder.setEdgeWeight(known, decision.weight);
                        if (decision.replaceRecord) {
                            this.bags.set(this.counterOfRow(known), fields);
                        }

                        store.touch();
                        continue;
                    }
                }

                const { edgeId, index } = ingestEdge(store, record.s, record.t, weight, fileId);
                this.bags.set(edgeId, fields);
                this.counterRow.set(edgeId, index);
                if (fileId !== undefined) {
                    this.byFileId.set(fileId, edgeId);
                }

                created.push(edgeId);
                this.lastLoadSources.push(i);
            }
        } finally {
            if (asLoad) {
                store.closeLoad();
            }
        }

        return created;
    }

    /**
     * Add a node with no edges.
     * @param id - Its id.
     */
    addNode(id: NodeId): void {
        ingestNode(this.store, id, {});
    }

    /**
     * Remove a node and its edges.
     * @param id - Its id.
     */
    removeNode(id: NodeId): void {
        if (this.store.builder.hasNode(id)) {
            this.store.builder.removeNode(id);
            this.store.touch();
        }
    }

    /**
     * Remove the edge carrying a counter.
     * @param counter - Its counter.
     */
    removeEdge(counter: number): void {
        const row = this.liveRow(counter);
        if (row !== INVALID_INDEX) {
            this.store.builder.removeEdge(row);
            this.store.touch();
        }
    }

    /**
     * The session edge id of a counter.
     * @param counter - The counter.
     * @returns The id.
     */
    edgeId(counter: number): EdgeId {
        return edgeIdOf(counter);
    }

    /**
     * Rebuild the store from the current snapshot's saved builder columns, as loading a file that
     * embeds the graph will: node order and the order of edges shuffled by a seeded permutation,
     * the order within each pair kept (ordinals depend on it), every identity column restored as
     * it was and the counter resumed past the largest one restored.
     * @param seed - The permutation's seed.
     */
    rebuildEmbedded(seed: number): void {
        const saved = this.snapshot();
        // The latch when an edge was ever completed, else what the store would latch.
        const ordered =
            saved.graph.typed(PAIRS_ORDERED_ATTRIBUTE, "u8") === null
                ? this.store.directionSettledBy.by !== "unsettled" && this.store.builder.directed
                : pairsOrdered(saved);
        let state = seed >>> 0 || 1;
        const random = (): number => {
            state ^= state << 13;
            state >>>= 0;
            state ^= state >>> 17;
            state ^= state << 5;
            state >>>= 0;
            return state / 2 ** 32;
        };

        const counters = saved.edges.requireTyped(EDGE_ID_COLUMN, "u32").data;
        const ordinal = saved.edges.requireTyped(IDENTITY_COLUMNS.edgeOrdinal, "i32").data;
        const among = saved.edges.requireTyped(IDENTITY_COLUMNS.edgeAmong, "i32").data;
        const hash = saved.edges.requireTyped(IDENTITY_COLUMNS.edgeHash, "u32").data;

        this.store.dispose();
        // Configured the way the saved pairs were latched, so the new store latches the same rule
        // when its first new edge is completed.
        this.store = this.newStore(ordered);
        this.counterRow = new Map();
        const { builder } = this.store;
        const nodes = Array.from({ length: saved.nodeCount }, (_, i) => ({ i, key: random() })).sort(
            (a, b) => a.key - b.key,
        );
        for (const { i } of nodes) {
            ingestNode(this.store, saved.ids.idOf(i), {});
        }

        // Each pair gets one random key; edges sort by it, then by their saved order.
        const pairKeys = new Map<string, number>();
        const edges = Array.from({ length: saved.edgeCount }, (_, e) => {
            const s = saved.edgeSource(e);
            const t = saved.edgeTarget(e);
            const pair = ordered || s <= t ? `${s}:${t}` : `${t}:${s}`;
            if (!pairKeys.has(pair)) {
                pairKeys.set(pair, random());
            }

            return { e, key: pairKeys.get(pair) ?? 0 };
        }).sort((a, b) => a.key - b.key || a.e - b.e);

        let last = -1;
        for (const { e } of edges) {
            const row = builder.addEdge(saved.ids.idOf(saved.edgeSource(e)), saved.ids.idOf(saved.edgeTarget(e)), 1);
            builder.setEdgeValue(this.store.edgeIdColumn, row, counters[e]);
            this.counterRow.set(counters[e], row);
            builder.setEdgeValue(IDENTITY_COLUMNS.edgeOrdinal, row, ordinal[e]);
            builder.setEdgeValue(IDENTITY_COLUMNS.edgeAmong, row, among[e]);
            builder.setEdgeValue(IDENTITY_COLUMNS.edgeHash, row, [hash[2 * e], hash[2 * e + 1]]);
            last = Math.max(last, counters[e]);
        }

        builder.setGraphValue(PAIRS_ORDERED_ATTRIBUTE, ordered ? 1 : 0, { dtype: "u8" });
        this.store.touch();
        resumeEdgeCounter(this.counter, last);
        this.byFileId = new Map();
    }

    /**
     * A store drawing from this session's counter.
     * @param directed - Its `data.directed`.
     * @returns The store.
     */
    private newStore(directed: boolean | "auto"): GraphStore {
        return new GraphStore({
            directed,
            positionScale: () => 1,
            onNodeRemap: () => undefined,
            onEdgeRemap: (remap) => {
                for (const [counter, row] of [...this.counterRow]) {
                    const moved = remap[row] ?? INVALID_INDEX;
                    if (moved === INVALID_INDEX) {
                        this.counterRow.delete(counter);
                    } else {
                        this.counterRow.set(counter, moved);
                    }
                }
            },
            onReplaced: () => undefined,
            edgeCounter: this.counter,
        });
    }

    /**
     * The builder row carrying a counter, when that edge is live.
     * @param counter - The counter, or undefined.
     * @returns The row, or `INVALID_INDEX`.
     */
    private liveRow(counter: number | undefined): number {
        const row = counter === undefined ? undefined : this.counterRow.get(counter);

        return row !== undefined && this.store.builder.hasEdge(row) ? row : INVALID_INDEX;
    }

    /**
     * The counter stamped into a live builder row.
     * @param row - The builder row.
     * @returns The counter.
     * @throws An Error for a row no ingested edge holds.
     */
    private counterOfRow(row: number): number {
        for (const [counter, at] of this.counterRow) {
            if (at === row && this.store.builder.hasEdge(row)) {
                return counter;
            }
        }

        throw new Error(`no ingested edge at builder row ${row}`);
    }
}
