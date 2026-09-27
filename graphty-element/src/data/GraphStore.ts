import {
    type Column,
    type ColumnHandle,
    type DerivedGraph,
    type FreezeReport,
    GraphBuilder,
    type GraphSnapshot,
    INVALID_INDEX,
    type NodeId,
    type U32,
} from "@graphty/graph-format";

import { retainArray } from "../session/project/strict";
import type { DirectionProvenance } from "../session/types";
import { ElementPositions, isStorableCoordinate, POSITION_COMPONENTS } from "./positions";

/** The payload of `snapshot-replaced` (graph-format design 14.4 rule 11). */
export interface SnapshotReplacement {
    /** The snapshot this one supersedes; null on the first freeze. */
    readonly previous: GraphSnapshot | null;
    /** The snapshot every consumer must switch to. */
    readonly next: GraphSnapshot;
    /** freezeWithReport's report, relative to the PREVIOUS freeze of this builder. */
    readonly report: FreezeReport;
}

export interface GraphStoreOptions {
    /**
     * config.data.directed. "auto" leaves the builder unlocked (14.4 rule 1). Given as a thunk it
     * is read again whenever the graph is emptied, so a cleared graph takes the setting in force
     * then, as a freshly built store would.
     */
    readonly directed: boolean | "auto" | (() => boolean | "auto");
    /**
     * config.data.knownFields.positionScale: record units -> scene units, read THROUGH A THUNK on
     * every seeding pass rather than captured once.
     *
     * The element mutates `config.data.knownFields` in place at runtime for every other known field
     * (graphty-element.ts writes them with `setDeep`), so a scale captured at construction would be
     * the one known field that silently ignored a later change while the rest followed the config.
     */
    readonly positionScale: () => number;
    /** Called INSIDE getSnapshot, after the position column is attached. */
    readonly onReplaced: (replacement: SnapshotReplacement) => void;
    /** Called before onReplaced when the freeze renumbered nodes, so Node.index can be walked. */
    readonly onNodeRemap: (remap: U32) => void;
    /** Called before onReplaced when the freeze renumbered edges, so edgesByIndex can be re-keyed. */
    readonly onEdgeRemap: (remap: U32) => void;
}

/** The node column an importer seeds file coordinates into; deleted from every snapshot by the attach. */
const SEED_COLUMN = "graphty.importPosition";
/** The element-assigned edge counter column. Its value, printed, is Edge.id. */
const EDGE_ID_COLUMN = "graphty.edgeId";

/**
 * The node column every frozen snapshot carries the reader's pins in.
 *
 * One byte per node, 1 while the reader has fixed that node in place. The OWNER is
 * `positions.pinnedView()`, the lane beside the coordinates; this column is that lane attached to
 * the snapshot, exactly as the position column is, so anything that reads or serialises a snapshot
 * carries the pins with the coordinates they pin rather than losing them at the freeze.
 */
export const PINNED_COLUMN = "graphty.pinned";

/**
 * A freeze already committed to the store whose consumer callbacks have not all returned yet.
 *
 * `stage` is the NEXT callback to deliver, so a retry after a consumer threw resumes there instead
 * of re-delivering what already succeeded. See `publish()`.
 */
interface PendingPublish {
    /** The event payload, built once when the freeze was committed. */
    readonly replacement: SnapshotReplacement;
    /** The next callback to deliver. */
    stage: "node-remap" | "edge-remap" | "replaced";
}

/**
 * The position work a committed freeze still owes, resumable stage by stage.
 *
 * `stage` is the NEXT step to run, so a retry after a step threw resumes there instead of repeating
 * one that already landed -- repeating them is not harmless: a second `remap()` would slide every
 * surviving row down a second time, and a second `seedUnplaced()` would ask for a seed column the
 * attach has already deleted from this snapshot's table. See `applyPositions()`.
 */
interface PendingPositions {
    /** The snapshot the coordinates belong to. */
    readonly snapshot: GraphSnapshot;
    /** The freeze report's nodeRemap, or null when the freeze renumbered nothing. */
    readonly nodeRemap: U32 | null;
    /** The next step to run. */
    stage: "remap" | "seed" | "attach";
}

/** Every registered builder column's value in one row, by column name; unset cells are absent. */
type RowValues = ReadonlyMap<string, unknown>;

/** A node row a removal took out, with what putting it back needs. */
interface RemovedNode {
    /** Its id. */
    readonly id: NodeId;
    /** Its row in the graph it was removed from. */
    readonly index: number;
    /** Its value in every registered column: the seed coordinate, and any column added later. */
    readonly values: RowValues;
}

/** An edge row a removal took out: resolved endpoints and weight, never re-read through ingest. */
interface RemovedEdge {
    /** The element-assigned id. */
    readonly edgeId: number;
    /** Its row in the graph it was removed from. */
    readonly index: number;
    /** The source id. */
    readonly source: NodeId;
    /** The target id. */
    readonly target: NodeId;
    /** The weight. */
    readonly weight: number;
    /** Its value in every registered column except the edge id. */
    readonly values: RowValues;
}

/** The rows one removal took out, each list in ascending row order. */
export interface RemovedRows {
    readonly nodes: readonly RemovedNode[];
    readonly edges: readonly RemovedEdge[];
}

/** Where rows the graph took out were in the positions lane, by id. */
interface LaneRows {
    readonly ids: readonly NodeId[];
    readonly coords: Float32Array;
}

/** A whole graph a replace set aside, for its undo. */
export interface KeptGraph {
    /** The graph, frozen fresh so it still carries every builder column and no positions lane. */
    readonly snapshot: GraphSnapshot;
    /** How its direction had been settled. */
    readonly direction: DirectionProvenance;
}

/**
 * A structural change not applied to the builder yet (design/undo/undo-design.md section 3.4,
 * "Structural inverses are applied lazily"): rows put back or taken out again, or the whole graph
 * swapped for a kept one (`restore`) or for an empty one.
 */
type Structural =
    | { readonly kind: "insert" | "drop"; readonly rows: RemovedRows }
    | { readonly kind: "replace"; readonly kept: KeptGraph; readonly restore: boolean };

/** One row of a rebuild: a row of the graph it starts from, or a recorded row put back. */
type Row<R> = number | R;

/**
 * Merge recorded rows back into a list at the rows they were removed from.
 * @param list - The rows now, in order.
 * @param inserts - The recorded rows, ascending by `index`.
 * @returns The merged list.
 */
function mergeAt<R extends { readonly index: number }>(list: readonly Row<R>[], inserts: readonly R[]): Row<R>[] {
    const out: Row<R>[] = [];
    let at = 0;
    for (const row of inserts) {
        while (out.length < row.index && at < list.length) {
            out.push(list[at++]);
        }

        out.push(row);
    }

    while (at < list.length) {
        out.push(list[at++]);
    }

    return out;
}

/**
 * Follow one remap with another.
 * @param first - old index -> middle index.
 * @param second - middle index -> new index, or null for none.
 * @returns old index -> new index.
 */
function compose(first: U32, second: U32 | null): U32 {
    if (second === null) {
        return first;
    }

    return first.map((middle) => (middle === INVALID_INDEX ? INVALID_INDEX : (second[middle] ?? INVALID_INDEX)));
}

/**
 * The element's ONE graph-format builder and the snapshot it freezes to (graph-format design 14.4).
 *
 * DataManager owns one of these for the life of the Graph. Nothing else freezes: `getSnapshot()` is
 * the only freeze site and it is LAZY, so however many mutations a burst contains -- through the
 * operation queue, through `skipQueue`, or through `addDataFromSource`, which bypasses the queue
 * entirely (Graph.ts:332-334) -- the first reader after the burst pays for exactly one freeze and
 * every later reader in the same revision gets the cached object.
 *
 * The element -- not the snapshot -- owns node coordinates: after every freeze `positions.view()` is
 * attached as the snapshot's `role: "position"` column BY REFERENCE, so a re-freeze never loses a
 * coordinate and every reader of the snapshot sees the live array.
 *
 * THE TRANSFER HAZARD (DEP-M6-D). A snapshot's own transfer list claims that live buffer as
 * exclusively transferable, because `AttributeTable.set` claims one holder of it and graph-format
 * exports no way for a consumer to say it still holds the buffer too. So NOTHING in the element
 * calls a snapshot's transfer-list or wire-form methods, and `test/data/no-transfer.test.ts` pins
 * that for the whole of `src/` -- which is why this note spells none of those method names in the
 * dotted form the guard greps for. Handing that list to `postMessage` would DETACH the array the
 * render loop reads every frame, and the symptom is a blank canvas with nothing in the console.
 */
export class GraphStore {
    /** The element-owned node coordinates, lent to every snapshot. */
    readonly positions = new ElementPositions();

    private readonly options: GraphStoreOptions;
    /** The builder now. Replaced only by a rebuild; see {@link GraphStore.builder}. */
    private current: GraphBuilder;
    private seedHandle: ColumnHandle;
    private edgeIdHandle: ColumnHandle;
    /** Structural changes waiting to be applied, already folded to their net effect. */
    private structural: Structural[] = [];
    /** Every column of the last freeze, taken before the positions lane replaced the seed column. */
    private frozenColumns: { readonly node: readonly Column[]; readonly edge: readonly Column[] } = {
        node: [],
        edge: [],
    };
    private rebuilds = 0;
    private readonly undirectedCache = new WeakMap<GraphSnapshot, DerivedGraph>();
    private cache: GraphSnapshot | null = null;
    private cachedRevision = -1;
    private revision = 0;
    private edgeIdCounter = 0;
    /** The edge-id column, mirrored by builder row: what {@link GraphStore.edgeIdAt} reads. */
    private edgeIdByIndex: number[] = [];
    /** Builder row by edge id: what {@link GraphStore.edgeIndexOf} reads. */
    private readonly indexByEdgeId: number[] = [];
    private pending: PendingPublish | null = null;
    private pendingPositions: PendingPositions | null = null;
    /**
     * Where the rows each removal and each kept graph took out were in the lane, read again at
     * every redo: the lane half of a removed row, so undoing the removal puts the node back where
     * it was rather than where its file seeded it.
     */
    private readonly heldLane = new WeakMap<RemovedRows | KeptGraph, LaneRows>();
    /** Rows put back since the last freeze, by what put them back; written once they have rows. */
    private readonly laneToRestore = new Map<RemovedRows | KeptGraph, LaneRows>();
    private publishing = false;
    private disposed = false;
    /** The builder and its `mutationCount` after the last write the store accounted for. */
    private accounted: { builder: GraphBuilder; count: number };
    /** Builder mutations found unaccounted for before a write of the store's own. */
    private drift = 0;

    /**
     * Build the empty store: one builder, one position array, the two element columns.
     * @param options - the store's configuration and its three freeze callbacks
     */
    constructor(options: GraphStoreOptions) {
        this.options = options;
        this.direction = this.emptyDirection();
        this.current = this.createBuilder(this.emptyDirected());
        this.seedHandle = this.current.nodeColumn(SEED_COLUMN);
        this.edgeIdHandle = this.current.edgeColumn(EDGE_ID_COLUMN);
        this.accounted = { builder: this.current, count: this.current.mutationCount };
    }

    /**
     * The one builder. Reading it first applies any structural change still waiting, so a reader
     * never sees rows in an order the graph does not hold. A rebuild replaces the object: hold the
     * store, not the builder.
     * @returns the builder
     */
    get builder(): GraphBuilder {
        this.settle();
        return this.current;
    }

    /**
     * Handle of the importer seed column; `setNodeValue(seedColumn, i, [x, y, z])` seeds a node.
     * @returns the handle of the current builder
     */
    get seedColumn(): ColumnHandle {
        this.settle();
        return this.seedHandle;
    }

    /**
     * Handle of the element-assigned edge counter column.
     * @returns the handle of the current builder
     */
    get edgeIdColumn(): ColumnHandle {
        this.settle();
        return this.edgeIdHandle;
    }

    /**
     * How many times a structural change rebuilt the builder rather than appending to it.
     * @returns the count
     */
    get rebuildCount(): number {
        return this.rebuilds;
    }

    /**
     * The direction setting now.
     * @returns config.data.directed
     */
    private directedSetting(): boolean | "auto" {
        const { directed } = this.options;
        return typeof directed === "function" ? directed() : directed;
    }

    /**
     * The direction an empty graph starts with: the configured one, or directed until a file says.
     * @returns Whether it is directed.
     */
    private emptyDirected(): boolean {
        const setting = this.directedSetting();
        return typeof setting === "boolean" ? setting : true;
    }

    /**
     * How an empty graph's direction is settled: by a consumer who named one, and no file can
     * overrule them, or not yet.
     * @returns The provenance.
     */
    private emptyDirection(): DirectionProvenance {
        return typeof this.directedSetting() === "boolean"
            ? { by: "configuration", statedBy: null }
            : { by: "unsettled", statedBy: null };
    }

    /**
     * A builder with the element's two columns declared.
     * @param directed - Its direction; locked when the configuration named one.
     * @returns the builder
     */
    private createBuilder(directed: boolean): GraphBuilder {
        const builder = new GraphBuilder({ directed, addMissingNodes: true });
        if (typeof this.directedSetting() === "boolean") {
            // Free only while the builder is empty (graph-format/src/builder/graph-builder.ts);
            // once edges exist, directed -> undirected throws E_DIRECTED. "auto" deliberately does
            // NOT lock (PLAN DECISION 2): an importer that learns the direction from the file it is
            // parsing sets it later, which a lock here would turn into E_DIRECTED.
            builder.lockDirected();
        }

        this.seedHandle = builder.declareNodeColumn({
            name: SEED_COLUMN,
            dtype: "f32",
            components: POSITION_COMPONENTS,
            role: "position",
            mutable: false,
        });
        this.edgeIdHandle = builder.declareEdgeColumn({
            name: EDGE_ID_COLUMN,
            dtype: "u32",
            role: "id",
            unique: true,
        });
        return builder;
    }

    /**
     * Whether a reader would get anything other than a settled, fully published snapshot.
     *
     * True when the cache is out of date -- the next `getSnapshot()` will freeze -- and ALSO while
     * a committed freeze still owes position work or still has callbacks to deliver, which are the
     * two states a throw leaves behind. The cache and `cachedRevision` commit BEFORE either of
     * those runs (see `getSnapshot`), so without those terms a caller that gates work on
     * `stale === false` would conclude every consumer had switched over while `onNodeRemap` had not
     * been delivered and `Node.index` was still in the OLD index space, or while the cached
     * snapshot did not yet carry a role-position column at all.
     * @returns true when the store is not settled
     */
    get stale(): boolean {
        return (
            this.structural.length > 0 ||
            this.cache === null ||
            this.cachedRevision !== this.revision ||
            this.pending !== null ||
            this.pendingPositions !== null
        );
    }

    /**
     * Whether dispose() has run. A disposed store is TERMINAL: `touch()`, `nextEdgeId()`,
     * `getSnapshot()` and `undirected()` throw afterwards, so a caller may guard with this and
     * trust the answer. `stale` and the readonly fields stay readable; see `dispose()`.
     * @returns true once dispose() ran
     */
    get isDisposed(): boolean {
        return this.disposed;
    }

    /**
     * Mark the graph mutated. DataManager calls this from EVERY mutating path, including a merge of
     * an existing id and an attribute write, because `builder.mutationCount` counts neither
     * (graph-format/src/types/builder.ts: "Increments on every topology or weight mutation; column
     * writes and freeze() do not count") and the 14.4 sketch's key is unsound against the element's
     * own mutation surface. See PLAN DECISION 1 of Task M6-T3 (DEP-M6-A).
     * @throws Error when the store has been disposed
     */
    touch(): void {
        this.requireAlive("touch");
        this.revision++;
        this.account();
    }

    /**
     * How many times the builder was mutated with nobody accounting for it: a write that reached
     * `builder` directly, without the graph primitives. Every legitimate write ends in
     * {@link GraphStore.touch}, which accounts for it, and begins with {@link GraphStore.audit},
     * which keeps what it finds. Strict state fails the next dispatch when this is not zero.
     * @returns The count.
     */
    get mutationDrift(): number {
        const { builder, count } = this.accounted;
        return this.drift + (builder === this.current ? this.current.mutationCount - count : 0);
    }

    /**
     * Keep the unaccounted mutations found now, before a write of the graph primitives or of the
     * store itself would account for them.
     */
    audit(): void {
        this.drift = this.mutationDrift;
        this.account();
    }

    /** Account for every mutation of the builder so far. */
    private account(): void {
        this.accounted = { builder: this.current, count: this.current.mutationCount };
    }

    /**
     * Take the next element-assigned edge id, written into the graphty.edgeId column at addEdge time.
     * @returns the id, one higher than the last
     * @throws Error when the store has been disposed
     */
    nextEdgeId(): number {
        this.requireAlive("nextEdgeId");
        return this.edgeIdCounter++;
    }

    /**
     * Stamp an element-assigned edge id into a builder row's `graphty.edgeId` column, and index it
     * both ways so the graph primitives can find a row by its id without freezing.
     *
     * The counter is never wound back: a redone edge gets the id it had, stamped here again.
     * @param edgeIndex - the builder row
     * @param edgeId - the counter
     */
    stampEdgeId(edgeIndex: number, edgeId: number): void {
        this.builder.setEdgeValue(this.edgeIdHandle, edgeIndex, edgeId);
        this.edgeIdByIndex[edgeIndex] = edgeId;
        this.indexByEdgeId[edgeId] = edgeIndex;
    }

    /**
     * The builder row a live edge occupies.
     * @param edgeId - the element-assigned counter
     * @returns the row, or INVALID_INDEX when no live edge has that id
     */
    edgeIndexOf(edgeId: number): number {
        // First, so the index below is not read from before a structural change still waiting.
        this.settle();
        const index = this.indexByEdgeId[edgeId];
        return index !== undefined && this.edgeIdByIndex[index] === edgeId && this.builder.hasEdge(index)
            ? index
            : INVALID_INDEX;
    }

    /**
     * The element-assigned id of the edge in one builder row.
     * @param edgeIndex - the row
     * @returns the counter, or INVALID_INDEX when the row is not a live edge
     */
    edgeIdAt(edgeIndex: number): number {
        this.settle();
        const edgeId = this.edgeIdByIndex[edgeIndex];
        return edgeId !== undefined && this.builder.hasEdge(edgeIndex) ? edgeId : INVALID_INDEX;
    }

    /**
     * Put back how the direction was settled, when the write that settled it is undone.
     * @param provenance - what it was before
     */
    restoreDirection(provenance: DirectionProvenance): void {
        this.direction = provenance;
    }

    /**
     * The current snapshot, freezing first when the graph has changed since the last one.
     *
     * A FREEZE IS PUBLISHED EXACTLY ONCE, and the store's own state commits before ANY other step
     * can throw. `freezeWithReport` reports relative to the PREVIOUS freeze, so a report that is
     * dropped is gone: the next freeze would report `nodeRemap: null` while `positions` is already
     * remapped, leaving a half-walked `Node.index` with nothing left to reconcile it. So the cache,
     * the revision and the two resumable work items are assigned IMMEDIATELY after the freeze, with
     * nothing between them that can fail, and everything that can fail is a resumable stage
     * afterwards: `applyPositions()` remaps, seeds and attaches the position column, and `publish()`
     * delivers the three callbacks. Each of those resumes at the stage that threw on the next call
     * instead of letting the caller's retry re-freeze past the report.
     *
     * RE-ENTRANT CALLS are answered from that committed freeze. A consumer callback asking the
     * store for the current snapshot is the obvious thing to write, and `publish()` advances a
     * stage only AFTER its callback returns, so a re-entrant call that went through `publish()`
     * again would deliver the same un-advanced stage forever: a stack overflow, with `onReplaced`
     * run thousands of times for the one freeze the class promises to publish exactly once. A
     * `touch()` from inside a callback is NOT served by this freeze; it bumps the revision, and the
     * next top-level call freezes it.
     * @returns the snapshot; the same object until the next `touch()`
     * @throws Error when the store has been disposed
     */
    getSnapshot(): GraphSnapshot {
        this.requireAlive("getSnapshot");
        const inFlight = this.pending;
        if (inFlight !== null && this.publishing) {
            return inFlight.replacement.next;
        }

        // A step threw on an earlier call: finish THAT freeze before anything else. The position
        // work comes first, because its remap has to land before the next freeze grows the array,
        // and because a listener must never be handed a snapshot whose position column is missing.
        this.applyPositions();
        this.publish();
        this.audit();
        const carried = this.materialize();
        this.account();
        if (carried === null && this.cache !== null && this.cachedRevision === this.revision) {
            return this.cache;
        }

        const previous = this.cache;
        const frozen = this.current.freezeWithReport({ label: "graphty-element" });
        const { snapshot } = frozen;
        this.remapEdgeIds(frozen.report.edgeRemap);
        // A rebuild renumbered from the old builder's index space into the new one's before this
        // freeze; consumers are handed the whole walk, old index to snapshot index.
        const report: FreezeReport =
            carried === null
                ? frozen.report
                : {
                      ...frozen.report,
                      nodeRemap: compose(carried.node, frozen.report.nodeRemap),
                      edgeRemap: compose(carried.edge, frozen.report.edgeRemap),
                  };
        // Before the attach below deletes the seed column from this snapshot's table: a removal
        // reads every column of the rows it takes out from here.
        this.frozenColumns = { node: [...snapshot.nodes], edge: [...snapshot.edges] };

        // COMMIT FIRST, with nothing between the freeze and these four assignments that can throw.
        // freezeWithReport reports against the PREVIOUS freeze, so any step that both follows the
        // freeze and precedes this commit can lose the report for good: the caller's retry
        // re-freezes, reports `nodeRemap: null`, and every surviving node is served at its
        // predecessor's coordinates with no remap left to reconcile Node.index. The remap itself is
        // the worst offender, not the safest -- `remapArray` allocates, and allocation on a large
        // graph is exactly where a failure comes from -- which is why it is a resumable stage below
        // rather than a step up here.
        this.cache = snapshot;
        this.cachedRevision = this.revision;
        this.pending = { replacement: { previous, next: snapshot, report }, stage: "node-remap" };
        this.pendingPositions = { snapshot, nodeRemap: report.nodeRemap, stage: "remap" };

        this.applyPositions();
        this.publish();
        return snapshot;
    }

    /**
     * Take rows out of the graph, recording everything that putting them back needs: their rows,
     * every registered column's value, and an edge's resolved endpoints and weight. Pins are the
     * session's `pins` slice, which the removal's own draft records.
     * Removing a node removes every edge attached to it.
     * @param nodeIds - The nodes to remove; one the graph does not hold is skipped.
     * @param edgeIds - The element-assigned ids of edges to remove; likewise.
     * @returns What was removed.
     */
    removeRows(nodeIds: readonly NodeId[], edgeIds: readonly number[]): RemovedRows {
        // Settled and compacted, so a builder row is a snapshot row and every column is readable.
        this.getSnapshot();
        const builder = this.current;
        const nodeRows = new Set<number>();
        for (const id of nodeIds) {
            const row = builder.indexOf(id);
            if (row !== INVALID_INDEX) {
                nodeRows.add(row);
            }
        }

        const edgeRows = new Set<number>();
        for (const edgeId of edgeIds) {
            const row = this.edgeIndexOf(edgeId);
            if (row !== INVALID_INDEX) {
                edgeRows.add(row);
            }
        }

        for (const row of nodeRows) {
            for (const edge of builder.outEdgesOf(row)) {
                edgeRows.add(edge);
            }

            if (builder.directed) {
                for (const edge of builder.inEdgesOf(row)) {
                    edgeRows.add(edge);
                }
            }
        }

        const edges = [...edgeRows]
            .sort((a, b) => a - b)
            .map((row): RemovedEdge => {
                const [source, target] = builder.edgeEndpoints(row);
                return {
                    edgeId: this.edgeIdAt(row),
                    index: row,
                    source: builder.idOf(source),
                    target: builder.idOf(target),
                    weight: builder.edgeWeight(row),
                    values: this.rowValues(this.frozenColumns.edge, row),
                };
            });
        const nodes = [...nodeRows]
            .sort((a, b) => a - b)
            .map(
                (row): RemovedNode => ({
                    id: builder.idOf(row),
                    index: row,
                    values: this.rowValues(this.frozenColumns.node, row),
                }),
            );
        const lane = this.positions.view(this.positions.count);
        const coords = new Float32Array(3 * nodes.length);
        nodes.forEach((node, at) => {
            coords.set(lane.subarray(POSITION_COMPONENTS * node.index, POSITION_COMPONENTS * node.index + 3), 3 * at);
        });
        for (const edge of edges) {
            builder.removeEdge(edge.index);
        }

        for (const node of nodes) {
            builder.removeNodeByIndex(node.index);
        }

        if (nodes.length > 0 || edges.length > 0) {
            this.touch();
        }

        const removed = { nodes, edges };
        this.heldLane.set(removed, { ids: nodes.map((node) => node.id), coords });
        return removed;
    }

    /**
     * Whether the graph holds no node rows, answered without freezing: a clear still waiting to be
     * applied empties it, and any other structural change still waiting is taken to leave rows.
     * @returns True when it holds none.
     */
    get holdsNoRows(): boolean {
        const last = this.structural.at(-1);
        if (last !== undefined) {
            return last.kind === "replace" && !last.restore;
        }

        return this.current.nodeCount === 0;
    }

    /**
     * Whether structural changes are waiting for the next read. While they are, a write that
     * would read the builder rebuilds it first; {@link GraphStore.dropAdded} waits with them.
     * @returns True when some are.
     */
    get deferring(): boolean {
        return this.structural.length > 0;
    }

    /**
     * Take rows an add appended out again -- the undo of an add -- at the next read, with the
     * structural changes waiting before it, so that undoing adds and removals in one run rebuilds
     * the graph once rather than once per add.
     * @param nodes - The nodes the add created.
     * @param edges - The element-assigned ids of the edges it added.
     */
    dropAdded(nodes: readonly NodeId[], edges: readonly number[]): void {
        const none: RowValues = new Map();
        this.defer({
            kind: "drop",
            rows: {
                nodes: nodes.map((id) => ({ id, index: INVALID_INDEX, values: none })),
                edges: edges.map((edgeId) => ({
                    edgeId,
                    index: INVALID_INDEX,
                    source: "",
                    target: "",
                    weight: 1,
                    values: none,
                })),
            },
        });
    }

    /**
     * Put removed rows back where they were: the undo of {@link GraphStore.removeRows}. Applied at
     * the next read, folded with whatever else is waiting.
     * @param rows - What the removal recorded.
     */
    insertRows(rows: RemovedRows): void {
        this.putBack(rows);
        this.defer({ kind: "insert", rows });
    }

    /**
     * Take recorded rows out again: the redo of {@link GraphStore.removeRows}. Applied at the next read.
     * @param rows - What the removal recorded.
     */
    dropRows(rows: RemovedRows): void {
        this.laneToRestore.delete(rows);
        this.holdLane(
            rows,
            rows.nodes.map((node) => node.id),
        );
        this.defer({ kind: "drop", rows });
    }

    /**
     * Forget the cached snapshot without freezing a replacement, once its holders have been told
     * the dataset is gone: the next freeze then reports no previous snapshot, so nothing releases
     * the forgotten one a second time.
     */
    forgetSnapshot(): void {
        this.cache?.dropCaches();
        this.cache = null;
        this.cachedRevision = -1;
    }

    /**
     * Set the whole graph aside for a replace: every row, every column and the direction.
     * @returns What was set aside.
     */
    keep(): KeptGraph {
        const current = this.getSnapshot();
        // A second freeze of a builder about to be replaced: its report chain no longer matters,
        // and unlike the cached snapshot this one still carries the seed column.
        const kept = { snapshot: this.current.freeze({ label: "graphty-element kept" }), direction: this.direction };
        // History holds it until the step is evicted: nothing may write it meanwhile.
        seal(kept.snapshot, "a kept graph's snapshot");
        this.heldLane.set(kept, { ids: current.ids.toArray(), coords: this.positions.view(current.nodeCount).slice() });
        return kept;
    }

    /**
     * Swap the whole graph for an empty one (`restore` false), or back to a kept one (`restore`
     * true). Applied at the next read; the last replace waiting wins over everything before it.
     * @param kept - The graph {@link GraphStore.keep} set aside.
     * @param restore - Whether to go back to it.
     */
    replace(kept: KeptGraph, restore: boolean): void {
        this.direction = restore ? kept.direction : this.emptyDirection();
        // Whatever was put back before the replace is gone with the graph it was put back into.
        this.laneToRestore.clear();
        if (restore) {
            this.putBack(kept);
        } else if (this.cache !== null) {
            this.holdLane(kept, this.cache.ids.toArray());
        }

        this.defer({ kind: "replace", kept, restore });
    }

    /**
     * Read again where rows about to be taken out are in the lane, for those it holds now.
     * @param taken - The removal or the kept graph.
     * @param ids - Its node ids.
     */
    private holdLane(taken: RemovedRows | KeptGraph, ids: readonly NodeId[]): void {
        const snapshot = this.cache;
        const held = this.heldLane.get(taken);
        // With structural changes still waiting, the rows were never put back into the lane, so
        // nothing has moved them since they were read.
        if (
            snapshot === null ||
            held === undefined ||
            this.structural.length > 0 ||
            snapshot.nodeCount > this.positions.count
        ) {
            return;
        }

        const lane = this.positions.view(snapshot.nodeCount);
        const coords = new Float32Array(3 * ids.length).fill(Number.NaN);
        ids.forEach((id, at) => {
            const row = snapshot.ids.indexOf(id as string | number);
            if (row !== INVALID_INDEX) {
                coords.set(lane.subarray(POSITION_COMPONENTS * row, POSITION_COMPONENTS * row + 3), 3 * at);
            }
        });
        this.heldLane.set(taken, { ids, coords });
    }

    /**
     * Queue the coordinates rows being put back had in the lane, for the next freeze.
     * @param taken - The removal or the kept graph.
     */
    private putBack(taken: RemovedRows | KeptGraph): void {
        const held = this.heldLane.get(taken);
        if (held !== undefined) {
            this.laneToRestore.set(taken, held);
        }
    }

    /**
     * Give rows put back the coordinates they had when they were taken out, before anything seeds
     * them. Not a move of the arrangement, so it writes the array directly.
     * @param snapshot - The snapshot just frozen, its lane already remapped.
     */
    private restoreLane(snapshot: GraphSnapshot): void {
        if (this.laneToRestore.size === 0) {
            return;
        }

        const lane = this.positions.view(snapshot.nodeCount);
        for (const { ids, coords } of this.laneToRestore.values()) {
            ids.forEach((id, at) => {
                const row = snapshot.ids.indexOf(id as string | number);
                if (row !== INVALID_INDEX && !this.positions.isPlaced(row) && isStorableCoordinate(coords[3 * at])) {
                    lane.set(coords.subarray(3 * at, 3 * at + 3), POSITION_COMPONENTS * row);
                }
            });
        }

        this.laneToRestore.clear();
    }

    /**
     * Queue a structural change, cancelling it against the one before when they undo each other.
     * @param change - The change.
     */
    private defer(change: Structural): void {
        this.requireAlive("defer");
        const last = this.structural.at(-1);
        const cancels =
            last !== undefined &&
            (last.kind === "replace"
                ? change.kind === "replace" && last.kept === change.kept && last.restore !== change.restore
                : change.kind !== "replace" && last.kind !== change.kind && last.rows === change.rows);
        if (cancels) {
            this.structural.pop();
        } else {
            this.structural.push(change);
        }

        this.touch();
    }

    /** Apply the structural changes waiting, if any, by freezing. */
    private settle(): void {
        if (this.structural.length > 0 && !this.disposed) {
            this.getSnapshot();
        }
    }

    /**
     * Apply the waiting structural changes to the builder. Appends and removals go straight into
     * it; anything that must land mid-row rebuilds it once, however many changes are waiting.
     * @returns The walk from the old builder's rows to the new one's when it rebuilt, else null.
     */
    private materialize(): { readonly node: U32; readonly edge: U32 } | null {
        const changes = this.structural;
        if (changes.length === 0) {
            return null;
        }

        this.structural = [];
        this.revision++;
        let from = changes.length - 1;
        while (from >= 0 && changes[from].kind !== "replace") {
            from--;
        }

        if (from >= 0) {
            return this.rebuild(changes[from] as Extract<Structural, { kind: "replace" }>, changes.slice(from + 1));
        }

        let at = 0;
        while (at < changes.length && this.applyDirect(changes[at])) {
            at++;
        }

        return at === changes.length ? null : this.rebuild(null, changes.slice(at));
    }

    /**
     * Apply one change straight to the builder when that keeps row order: a removal always, an
     * insert only when every row it puts back belongs at the end.
     * @param change - The change.
     * @returns False when it needs a rebuild.
     */
    private applyDirect(change: Structural): boolean {
        const builder = this.current;
        if (change.kind === "replace") {
            return false;
        }

        const { nodes, edges } = change.rows;
        if (change.kind === "drop") {
            for (const edge of edges) {
                const row = this.edgeIndexOf(edge.edgeId);
                if (row !== INVALID_INDEX) {
                    builder.removeEdge(row);
                }
            }

            for (const node of nodes) {
                if (builder.hasNode(node.id)) {
                    builder.removeNode(node.id);
                }
            }

            return true;
        }

        const atEnd =
            builder.nodeBound === builder.nodeCount &&
            builder.edgeBound === builder.edgeCount &&
            nodes.every((node, at) => node.index === builder.nodeCount + at) &&
            edges.every((edge, at) => edge.index === builder.edgeCount + at);
        if (!atEnd) {
            return false;
        }

        for (const node of nodes) {
            this.writeNode(builder.addNode(node.id), node.values);
        }

        for (const edge of edges) {
            this.writeEdge(builder.addEdge(edge.source, edge.target, edge.weight), edge.edgeId, edge.values);
        }

        return true;
    }

    /**
     * Build a new builder in one pass, in the style of `GraphBuilder.from`: the rows of the graph
     * it starts from, with the waiting changes merged in at their recorded rows.
     * @param replace - The replace it starts from, or null to start from the builder now.
     * @param changes - The inserts and removals after it, in order.
     * @returns The walk from the old builder's rows to the new one's.
     */
    private rebuild(
        replace: Extract<Structural, { kind: "replace" }> | null,
        changes: readonly Structural[],
    ): { node: U32; edge: U32 } {
        const old = this.current;
        const node = new Uint32Array(old.nodeBound).fill(INVALID_INDEX);
        const edge = new Uint32Array(old.edgeBound).fill(INVALID_INDEX);
        let base: GraphSnapshot | null = null;
        let oldNodes: U32 | null = null;
        let oldEdges: U32 | null = null;
        if (replace === null) {
            const frozen = old.freezeWithReport({ label: "graphty-element rebuild" });
            base = frozen.snapshot;
            oldNodes = frozen.report.nodeRemap ?? Uint32Array.from({ length: node.length }, (_, row) => row);
            oldEdges = frozen.report.edgeRemap ?? Uint32Array.from({ length: edge.length }, (_, row) => row);
        } else if (replace.restore) {
            base = replace.kept.snapshot;
        }

        let nodeRows: Row<RemovedNode>[] = Array.from({ length: base?.nodeCount ?? 0 }, (_, row) => row);
        let edgeRows: Row<RemovedEdge>[] = Array.from({ length: base?.edgeCount ?? 0 }, (_, row) => row);
        const nodeIdOf = (row: Row<RemovedNode>): NodeId =>
            typeof row === "number" ? (base as GraphSnapshot).ids.idOf(row) : row.id;
        const edgeIdOf = (row: Row<RemovedEdge>): unknown =>
            typeof row === "number" ? (base as GraphSnapshot).edges.value(EDGE_ID_COLUMN, row) : row.edgeId;
        for (const change of changes) {
            if (change.kind === "insert") {
                nodeRows = mergeAt(nodeRows, change.rows.nodes);
                edgeRows = mergeAt(edgeRows, change.rows.edges);
            } else if (change.kind === "drop") {
                const nodes = new Set(change.rows.nodes.map((each) => each.id));
                const edges = new Set(change.rows.edges.map((each) => each.edgeId));
                nodeRows = nodeRows.filter((row) => !nodes.has(nodeIdOf(row)));
                edgeRows = edgeRows.filter((row) => !edges.has(edgeIdOf(row) as number));
            }
        }

        const builder = this.createBuilder(base?.directed ?? this.emptyDirected());
        this.current = builder;
        this.edgeIdByIndex = [];
        this.indexByEdgeId.length = 0;
        const baseNode = new Uint32Array(base?.nodeCount ?? 0).fill(INVALID_INDEX);
        const baseEdge = new Uint32Array(base?.edgeCount ?? 0).fill(INVALID_INDEX);
        for (const row of nodeRows) {
            const index = builder.addNode(nodeIdOf(row));
            if (typeof row === "number") {
                baseNode[row] = index;
                for (const column of (base as GraphSnapshot).nodes) {
                    if (column.isSet(row)) {
                        builder.setNodeValue(column.meta.name, index, column.value(row));
                    }
                }
            } else {
                this.writeNode(index, row.values);
            }
        }

        const list = base?.edgeList() ?? null;
        for (const row of edgeRows) {
            if (typeof row === "number" && base !== null && list !== null) {
                const index = builder.addEdge(
                    base.ids.idOf(list.src[row]),
                    base.ids.idOf(list.dst[row]),
                    list.weights === null ? undefined : list.weights[row],
                );
                baseEdge[row] = index;
                for (const column of base.edges) {
                    if (column.meta.role !== "weight" && column.meta.name !== EDGE_ID_COLUMN && column.isSet(row)) {
                        builder.setEdgeValue(column.meta.name, index, column.value(row));
                    }
                }

                this.stampEdgeId(index, base.edges.value(EDGE_ID_COLUMN, row) as number);
            } else if (typeof row !== "number") {
                this.writeEdge(builder.addEdge(row.source, row.target, row.weight), row.edgeId, row.values);
            }
        }

        if (oldNodes !== null && oldEdges !== null) {
            for (let row = 0; row < node.length; row++) {
                const at = oldNodes[row] ?? INVALID_INDEX;
                node[row] = at === INVALID_INDEX ? INVALID_INDEX : (baseNode[at] ?? INVALID_INDEX);
            }

            for (let row = 0; row < edge.length; row++) {
                const at = oldEdges[row] ?? INVALID_INDEX;
                edge[row] = at === INVALID_INDEX ? INVALID_INDEX : (baseEdge[at] ?? INVALID_INDEX);
            }
        }

        this.rebuilds++;
        return { node, edge };
    }

    /**
     * Write a recorded node row's column values back.
     * @param index - The row.
     * @param values - The values.
     */
    private writeNode(index: number, values: RowValues): void {
        for (const [name, value] of values) {
            this.current.setNodeValue(name, index, value);
        }
    }

    /**
     * Write a recorded edge row's id and column values back.
     * @param index - The row.
     * @param edgeId - Its element-assigned id.
     * @param values - The values.
     */
    private writeEdge(index: number, edgeId: number, values: RowValues): void {
        for (const [name, value] of values) {
            this.current.setEdgeValue(name, index, value);
        }

        this.stampEdgeId(index, edgeId);
    }

    /**
     * Every set cell of one row of the last freeze.
     * @param columns - The columns of that freeze.
     * @param row - The row.
     * @returns The values by column name, the edge id and weight excepted.
     */
    private rowValues(columns: readonly Column[], row: number): RowValues {
        const values = new Map<string, unknown>();
        for (const column of columns) {
            if (column.meta.role !== "weight" && column.meta.name !== EDGE_ID_COLUMN && column.isSet(row)) {
                values.set(column.meta.name, column.value(row));
            }
        }

        return values;
    }

    /**
     * The undirected view of a snapshot, cached per snapshot (14.4 rule 8).
     *
     * Returns the whole DerivedGraph, not just its snapshot, because edge-result adapters need
     * `edgeRemap` to write both halves of a collapsed reciprocal pair. `toUndirected()` shares the
     * node AttributeTable INSTANCE with its source (graph-format C8), so the position column is
     * already on the view.
     * @param s - a snapshot this store produced
     * @returns the cached DerivedGraph
     * @throws Error when the store has been disposed
     */
    undirected(s: GraphSnapshot): DerivedGraph {
        this.requireAlive("undirected");
        let derived = this.undirectedCache.get(s);
        if (derived === undefined) {
            derived = s.directed
                ? s.toUndirected()
                : {
                      snapshot: s,
                      nodeOrigin: null,
                      edgeOrigin: null,
                      nodeRemap: null,
                      edgeRemap: null,
                      blockSizes: null,
                      report: { droppedEdges: 0, mergedEdges: 0 },
                  };
            this.undirectedCache.set(s, derived);
        }

        return derived;
    }

    /**
     * Drop the cached snapshot and make the store TERMINAL: `getSnapshot()`, `touch()`,
     * `nextEdgeId()` and `undirected()` throw afterwards.
     *
     * Terminal rather than merely cache-dropping because the callbacks in `options` point into a
     * DataManager that is being torn down: a freeze served after this one would emit
     * `snapshot-replaced` with `previous: null`, which the contract defines as "the FIRST freeze",
     * to listeners still holding the real previous snapshot. `undirected()` is in that list because
     * it would otherwise build and cache a fresh DerivedGraph over a snapshot the store has just
     * told the world it released.
     *
     * What stays readable, deliberately: `isDisposed` and `stale`, so a teardown path can ask; and
     * the readonly `builder`, `positions`, `seedColumn` and `edgeIdColumn`, which are plain fields
     * no accessor can guard. The builder is not reset. The `undirected()` cache is a WeakMap keyed
     * by the snapshots themselves, so dropping the snapshot is what releases it -- there is nothing
     * here to clear. Calling this twice is harmless.
     */
    dispose(): void {
        this.cache?.dropCaches();
        this.cache = null;
        this.cachedRevision = -1;
        this.pending = null;
        this.pendingPositions = null;
        this.structural = [];
        this.disposed = true;
    }

    /**
     * Finish the position work a committed freeze owes, resuming at the step that threw last time.
     *
     * Three steps, each advanced only AFTER it returns, because none of them is safe to repeat:
     *
     * - REMAP (or grow). `remapArray` allocates and can throw E_INDEX_RANGE, and a second remap
     *   would slide every surviving row down a second time, serving each node its successor's
     *   coordinates. It runs in the same resumable unit as the rest -- and AFTER the cache commit
     *   in `getSnapshot()` -- so a throw here cannot take the freeze report with it.
     * - SEED. In BOTH freeze branches (PLAN DECISION 4): one burst can remove a node AND add a
     *   seeded one, so the freeze that renumbers is also a freeze that has rows to seed. It is
     *   idempotent in itself (`fillUnplaced` refuses a placed row) but it must not run after the
     *   attach, which DELETES the seed column from this snapshot's table.
     * - ATTACH, last: `replaceRole` is what deletes that seed column (AttributeTable.set ->
     *   checkRole). PLAN DECISION 3.
     *
     * Retrying rather than giving up matters because the alternative is silent: a snapshot cached
     * and published with no role-position column answers every later `getSnapshot()` in the same
     * revision without an error, and the first consumer to read the column fails far from the
     * cause. Until this returns, `stale` stays true.
     */
    private applyPositions(): void {
        const work = this.pendingPositions;
        if (work === null) {
            return;
        }

        const { snapshot } = work;
        if (work.stage === "remap") {
            if (work.nodeRemap !== null) {
                this.positions.remap(work.nodeRemap, snapshot.nodeCount);
            } else {
                this.positions.grow(snapshot.nodeCount);
            }

            work.stage = "seed";
        }

        if (work.stage === "seed") {
            this.restoreLane(snapshot);
            this.seedUnplaced(snapshot);
            work.stage = "attach";
        }

        snapshot.nodes.set(
            "position",
            this.positions.view(snapshot.nodeCount),
            { dtype: "f32", components: POSITION_COMPONENTS, role: "position", mutable: true },
            { replaceRole: true },
        );
        // The pins ride with the coordinates, through the same lane object and on the same
        // schedule: re-attached on EVERY freeze, because a remap or a growth replaces the array
        // and a column attached to the old one would answer for a graph that no longer exists.
        snapshot.nodes.set(PINNED_COLUMN, this.positions.pinnedView(snapshot.nodeCount), {
            dtype: "u8",
            mutable: true,
        });
        // The resident snapshot is complete: from here its column set is fixed, and a consumer
        // that tries to attach, remove or rename a column gets E_FROZEN.
        seal(snapshot, "the resident snapshot");
        this.pendingPositions = null;
    }

    /**
     * Deliver a committed freeze to the consumer, resuming at the callback that threw last time.
     *
     * Each stage advances only AFTER its callback returns, and `this.pending` is cleared only after
     * the last one, so a consumer that throws leaves the publication pending and the next
     * `getSnapshot()` finishes it. A callback that already returned is never called twice.
     *
     * `publishing` is raised for the whole delivery, including the failure path, so that a callback
     * which calls back into `getSnapshot()` is answered from the committed freeze instead of
     * re-entering this un-advanced stage. See `getSnapshot`.
     *
     * A callback that DISPOSES the store abandons the rest of the delivery. `dispose()` is defined
     * as "no freeze event reaches a listener afterwards", and this method holds its own reference
     * to the pending publication, so without the check a `dispose()` from inside `onNodeRemap`
     * would still run `onEdgeRemap` and `onReplaced` against a DataManager that has already been
     * torn down -- and then re-clear a `pending` that `dispose()` had already cleared.
     */
    private publish(): void {
        const { pending } = this;
        if (pending === null) {
            return;
        }

        this.publishing = true;
        try {
            const { replacement } = pending;
            if (pending.stage === "node-remap") {
                if (replacement.report.nodeRemap !== null) {
                    this.options.onNodeRemap(replacement.report.nodeRemap);
                }

                if (this.disposed) {
                    return;
                }

                pending.stage = "edge-remap";
            }

            if (pending.stage === "edge-remap") {
                if (replacement.report.edgeRemap !== null) {
                    this.options.onEdgeRemap(replacement.report.edgeRemap);
                }

                if (this.disposed) {
                    return;
                }

                pending.stage = "replaced";
            }

            this.options.onReplaced(replacement);
            if (this.disposed) {
                return;
            }

            this.pending = null;
        } finally {
            this.publishing = false;
        }
    }

    /**
     * Follow a compacting freeze with the edge-id index: the builder's rows are the snapshot's
     * from here on.
     * @param remap - the freeze report's edgeRemap, or null when nothing was renumbered
     */
    private remapEdgeIds(remap: U32 | null): void {
        if (remap === null) {
            return;
        }

        const moved: number[] = [];
        for (const [index, edgeId] of this.edgeIdByIndex.entries()) {
            const next = remap[index] ?? INVALID_INDEX;
            if (edgeId === undefined || next === INVALID_INDEX) {
                continue;
            }

            moved[next] = edgeId;
            this.indexByEdgeId[edgeId] = next;
        }

        this.edgeIdByIndex = moved;
    }

    /**
     * Refuse a call on a store that has been disposed.
     * @param what - the method name, for the message
     * @throws Error when the store has been disposed
     */
    private requireAlive(what: string): void {
        if (this.disposed) {
            throw new Error(`GraphStore: ${what}() after dispose(); a disposed store is terminal`);
        }
    }

    /**
     * Copy importer-seeded coordinates into the element array for rows that are still unplaced.
     * Idempotent, so it is safe in both freeze branches, and it never overwrites a coordinate a
     * layout or a drag produced.
     * @param snapshot - the freshly frozen snapshot, BEFORE the position column is attached
     */
    /**
     * Record that a file settled the direction, and with what words.
     *
     * Called only when the declaration was actually taken -- a file whose direction was refused
     * because the configuration had already settled it, or because edges were already loaded, did
     * not settle anything and must not claim to have.
     * @param statedBy - the text in the file that said so
     */
    recordDirectionFromFile(statedBy: string): void {
        this.direction = { by: "file", statedBy };
    }

    /**
     * How the direction of this store's graph was settled.
     * @returns the provenance, which is `"unsettled"` until a file or the configuration says
     */
    get directionSettledBy(): DirectionProvenance {
        return this.direction;
    }

    /**
     * How many nodes the DATA arrived carrying a position for.
     *
     * THE DISTINCTION THAT MATTERS, and the one `positions.placedCount` cannot make. The position
     * array is written by the importer AND by every running layout, so a moment after a file with
     * no coordinates finishes loading, every node "carries a position" -- the layout put it there.
     * Anything deciding what to do BECAUSE the file placed the nodes must not read that number:
     * one animation frame after a load it says the file placed everything, for a file that placed
     * nothing, and the graph gets pinned to whatever the first step of a force layout reached.
     *
     * COUNTED DURING THE FREEZE rather than on demand, because the importer's seed column exists
     * only for that moment: attaching the live position array deletes it from the snapshot's
     * table. This is the one place it can be read.
     * @returns how many nodes arrived with a coordinate, zero before the first freeze
     */
    get seededNodeCount(): number {
        // Freezing is lazy, so asking before anything has been frozen must not answer from a
        // stale count -- it answers from the freeze this call performs.
        this.getSnapshot();

        return this.seeded;
    }

    /** How many rows the importer's own column carried, as of the last freeze. */
    private seeded = 0;
    /**
     * How the direction was settled. Written by the constructor for an explicit configuration and
     * by {@link GraphStore.recordDirectionFromFile} for a declaration that was taken.
     */
    private direction: DirectionProvenance = { by: "unsettled", statedBy: null };

    private seedUnplaced(snapshot: GraphSnapshot): void {
        // requireTyped, not the `Column | null` from get(): `Column` is a union and DictColumn has
        // no `data`, so reading `.data` off the union does not typecheck. requireTyped narrows to
        // F32Column AND asserts the dtype, which is the check a cast would have skipped. It also
        // throws for an absent column, which is right: the column is declared in the constructor
        // and re-materialized by every freeze -- the attach deletes it from the SNAPSHOT's table,
        // never from the builder -- so a miss here is a graph-format regression, not a normal state.
        const seed = snapshot.nodes.requireTyped(SEED_COLUMN, "f32");
        const { data } = seed;
        const scale = this.options.positionScale();
        let seeded = 0;
        for (let i = 0; i < snapshot.nodeCount; i++) {
            // Counted for EVERY seeded row, including one already placed and skipped below: the
            // question this answers is what the data carried, not what still needed seeding.
            if (seed.isSet(i)) {
                seeded++;
            }

            // The narrowed column's own isSet(i), which costs no lookup; `snapshot.nodes.isSet(name,
            // i)` is the same call through `require(name)` and would pay one map lookup per node per
            // freeze. NEVER write `column.isSet?.(i)`: under an optional call the expression is
            // `undefined` for a missing method, `!undefined` is true, and every row with any x would
            // be seeded -- the exact inverse of this guard, silently.
            if (this.positions.isPlaced(i) || !seed.isSet(i)) {
                continue;
            }

            // The `?? NaN` fallbacks are unreachable -- the column data is exactly 3 * nodeCount
            // long -- and they are NaN rather than 0 so that a change which made them reachable
            // would leave the row UNPLACED instead of placing the node at the origin.
            const base = POSITION_COMPONENTS * i;
            // SCALED FIRST, then checked: the scale is only `z.number().positive()`, so a seed of
            // 1e30 at a scale of 1e10 is a finite double and an f32 infinity, and it is the scaled
            // triple that gets stored. Checking the raw seed would wave that through.
            const x = (data[base] ?? Number.NaN) * scale;
            const y = (data[base + 1] ?? Number.NaN) * scale;
            const z = (data[base + 2] ?? Number.NaN) * scale;
            // ALL THREE components, not just x. A 2D importer that writes no z, or one that divides
            // by a zero extent, produces a row like (3, 4, NaN) or (Infinity, 0, 0); stored, that
            // row reports PLACED, so fillUnplaced() will never repair it and a layout that seeds
            // from NaN treats it as fixed. In Babylon the mesh then vanishes and the scene bounds
            // and camera framing are poisoned, with nothing in the console. Leaving the row unplaced
            // instead hands the node to the layout, which is what an unseeded node gets anyway.
            //
            // `continue`, not a throw from inside `write()`: this pass runs between the remap and
            // the cache commit in getSnapshot(), and one bad coordinate in an imported file must
            // not be able to tear a freeze in half.
            if (!isStorableCoordinate(x) || !isStorableCoordinate(y) || !isStorableCoordinate(z)) {
                continue;
            }

            this.positions.fillUnplaced(i, x, y, z);
        }

        this.seeded = seeded;
    }
}

/** The two columns the positions lane backs: a running layout writes them every frame. */
const LANE_COLUMNS: ReadonlySet<string> = new Set(["position", PINNED_COLUMN]);

/**
 * Seal a snapshot's column set, and under strict state sum the typed arrays its columns hold, the
 * lane columns excepted, so a write to one in place is found (design/undo/undo-design.md 12.1).
 * @param snapshot - The snapshot.
 * @param what - What holds it, for the message.
 */
function seal(snapshot: GraphSnapshot, what: string): void {
    snapshot.seal();
    for (const [domain, table] of [
        ["node", snapshot.nodes],
        ["edge", snapshot.edges],
    ] as const) {
        for (const column of table) {
            const data = "data" in column ? column.data : null;
            if (!LANE_COLUMNS.has(column.meta.name) && ArrayBuffer.isView(data)) {
                retainArray(data, `the graph slice's ${what} ${domain} column "${column.meta.name}"`);
            }
        }
    }
}
