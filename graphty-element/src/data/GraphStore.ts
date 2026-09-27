import {
    type ColumnHandle,
    type DerivedGraph,
    type FreezeReport,
    GraphBuilder,
    type GraphSnapshot,
    INVALID_INDEX,
    type U32,
} from "@graphty/graph-format";

import { hashNodeId } from "../catalog/sets/hash";
import { type InputCounters, inputCountersOf } from "../session/attributes";
import type { DirectionProvenance } from "../session/types";
import {
    completeLoad,
    createEdgeCounter,
    EDGE_ID_COLUMN,
    type EdgeCounter,
    IDENTITY_COLUMNS,
    type IdentityGraph,
    PAIRS_ORDERED_ATTRIBUTE,
    sessionEdgeHash,
} from "./edgeIdentity";
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
    /** config.data.directed. "auto" leaves the builder unlocked (14.4 rule 1). */
    readonly directed: boolean | "auto";
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
    /**
     * The edge counter `nextEdgeId()` draws from. Its owner (`DataManager`, a headless
     * `GraphSession`) hands the same object to every store it builds, so a Clear or a replacing
     * import never rewinds it and no edge id is issued twice in a session. A store built without
     * one counts from 0 on its own.
     */
    readonly edgeCounter?: EdgeCounter;
    /**
     * The input counters every freeze advances the tick of (design/sets 6.2). Handed in by the
     * same owner, for the same reason, as the edge counter; a store built without them keys its
     * own under itself, which is what a headless session reads.
     */
    readonly inputs?: InputCounters;
}

/** The node column an importer seeds file coordinates into; deleted from every snapshot by the attach. */
const SEED_COLUMN = "graphty.importPosition";

/**
 * The node column every frozen snapshot carries the reader's pins in.
 *
 * One byte per node, 1 while the reader has fixed that node in place. The OWNER is
 * `positions.pinnedView()`, the lane beside the coordinates; this column is that lane attached to
 * the snapshot, exactly as the position column is, so anything that reads or serialises a snapshot
 * carries the pins with the coordinates they pin rather than losing them at the freeze.
 */
const PINNED_COLUMN = "graphty.pinned";

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
    /** The one builder, alive for the whole life of the Graph. */
    readonly builder: GraphBuilder;
    /** The element-owned node coordinates, lent to every snapshot. */
    readonly positions = new ElementPositions();
    /** Handle of the importer seed column; `setNodeValue(seedColumn, i, [x, y, z])` seeds a node. */
    readonly seedColumn: ColumnHandle;
    /** Handle of the element-assigned edge counter column. */
    readonly edgeIdColumn: ColumnHandle;

    private readonly options: GraphStoreOptions;
    private readonly counter: EdgeCounter;
    private readonly nodeHashColumn: ColumnHandle;
    private readonly edgeHashColumn: ColumnHandle;
    private readonly edgeOrdinalColumn: ColumnHandle;
    private readonly edgeAmongColumn: ColumnHandle;
    /** Node rows below this have their hash; rows from here to `nodeBound` are new. */
    private nodeMark = 0;
    /** Edges ingested outside a load and not yet completed: row, counter, file id. */
    private sessionEdges: { row: number; counter: number; fileId: string | number | undefined }[] = [];
    /** Rows of the open load, in ingest order, remapped by every compacting freeze. */
    private loadRows = new Uint32Array(64);
    private loadLength = 0;
    /** File ids of the open load's edges, aligned with `loadRows`; sparse. */
    private loadFileIds: (string | number | undefined)[] = [];
    /** Open `openLoad()` calls; loads that overlap are completed as one. */
    private loadDepth = 0;
    /** Whether edge pairs are ordered, latched when the first edge is completed. */
    private pairsOrdered: boolean | null = null;
    /** The counters whose tick every freeze advances. */
    private readonly inputs: InputCounters;
    private readonly undirectedCache = new WeakMap<GraphSnapshot, DerivedGraph>();
    private cache: GraphSnapshot | null = null;
    private cachedRevision = -1;
    private revision = 0;
    private pending: PendingPublish | null = null;
    private pendingPositions: PendingPositions | null = null;
    private publishing = false;
    private disposed = false;

    /**
     * Build the empty store: one builder, one position array, the two element columns.
     * @param options - the store's configuration and its three freeze callbacks
     */
    constructor(options: GraphStoreOptions) {
        this.options = options;
        this.builder = new GraphBuilder({ directed: true, addMissingNodes: true });
        if (typeof options.directed === "boolean") {
            // A consumer who names the direction has settled it, and no file can overrule them, so
            // that is the provenance from here on unless the store is rebuilt.
            this.direction = { by: "configuration", statedBy: null };
            // Free only while the builder is empty (graph-format/src/builder/graph-builder.ts);
            // once edges exist, directed -> undirected throws E_DIRECTED. "auto" deliberately does
            // NOT lock (PLAN DECISION 2): an importer that learns the direction from the file it is
            // parsing sets it later, which a lock here would turn into E_DIRECTED.
            this.builder.setDirected(options.directed);
            this.builder.lockDirected();
        }

        this.seedColumn = this.builder.declareNodeColumn({
            name: SEED_COLUMN,
            dtype: "f32",
            components: POSITION_COMPONENTS,
            role: "position",
            mutable: false,
        });
        this.edgeIdColumn = this.builder.declareEdgeColumn({
            name: EDGE_ID_COLUMN,
            dtype: "u32",
            role: "id",
            unique: true,
        });
        // The stable-identity columns (design/sets/sets-design.md 12.2, 12.3), beside the counter
        // they are derived from, filled by the completion pass at freeze. 8 bytes per node, 16 per
        // edge. Ordinal and among default to -1, the reading of a session edge and of a row the
        // pass has not reached yet.
        this.nodeHashColumn = this.builder.declareNodeColumn({ name: IDENTITY_COLUMNS.nodeHash, dtype: "u32", components: 2 });
        this.edgeHashColumn = this.builder.declareEdgeColumn({ name: IDENTITY_COLUMNS.edgeHash, dtype: "u32", components: 2 });
        this.edgeOrdinalColumn = this.builder.declareEdgeColumn({ name: IDENTITY_COLUMNS.edgeOrdinal, dtype: "i32", default: -1 });
        this.edgeAmongColumn = this.builder.declareEdgeColumn({ name: IDENTITY_COLUMNS.edgeAmong, dtype: "i32", default: -1 });
        this.counter = options.edgeCounter ?? createEdgeCounter();
        this.inputs = options.inputs ?? inputCountersOf(this);
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
    }

    /**
     * Take the next element-assigned edge id, written into the graphty.edgeId column at addEdge time.
     * @returns the id, one higher than the last
     * @throws Error when the store has been disposed
     */
    nextEdgeId(): number {
        this.requireAlive("nextEdgeId");
        return this.counter.next++;
    }

    /**
     * Record an ingested edge for the completion pass. `ingestEdge` calls this for every edge it
     * stamps; an edge added to the builder directly (a test fixture) gets no identity values.
     * @param row - the edge row
     * @param counter - the counter stamped into its `graphty.edgeId` cell
     * @param fileId - the file id read at the configured `edgeIdPath`, if any
     */
    recordIngestedEdge(row: number, counter: number, fileId?: string | number): void {
        if (this.loadDepth === 0) {
            this.sessionEdges.push({ row, counter, fileId });
            return;
        }

        if (this.loadLength === this.loadRows.length) {
            const grown = new Uint32Array(this.loadRows.length * 2);
            grown.set(this.loadRows);
            this.loadRows = grown;
        }

        if (fileId !== undefined) {
            this.loadFileIds[this.loadLength] = fileId;
        }

        this.loadRows[this.loadLength++] = row;
    }

    /**
     * Open a load: every edge ingested until the matching `closeLoad()` belongs to it, and its
     * ordinals are counted over it as a whole however many chunks and freezes it spans
     * (design 12.3: a load is one import). Edges ingested with no load open are session edges.
     */
    openLoad(): void {
        this.loadDepth++;
    }

    /**
     * Close a load. When the last open load closes, it is completed there and then. A disposed
     * store ignores this, so a load's cleanup may run after a Clear replaced its store.
     */
    closeLoad(): void {
        if (this.disposed || this.loadDepth === 0) {
            return;
        }

        this.loadDepth--;
        if (this.loadDepth === 0) {
            // Completed now rather than at the next freeze: the load is over, so an edit made
            // before that freeze (a removal, or a second load opened straight after) belongs to
            // no load and must not move this one's ordinals or merge into it.
            this.completeIdentity();
            // Column writes do not move the builder, so without this a snapshot frozen during the
            // load would keep being served without the load's identity values.
            this.touch();
        }
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
        if (this.cache !== null && this.cachedRevision === this.revision) {
            return this.cache;
        }

        const previous = this.cache;
        // Before the freeze, so the columns ride in the snapshot. Idempotent: a throw here leaves
        // the marks unmoved and the next call writes the same values again.
        this.completeIdentity();
        const { snapshot, report } = this.builder.freezeWithReport({ label: "graphty-element" });

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
        // Allocation-free, so it cannot throw between the commit and the resumable stages.
        this.inputs.tick.advance();
        // Allocation-free, so it cannot throw between the commit and the resumable stages.
        this.followIdentityRemap(report.edgeRemap);

        this.applyPositions();
        this.publish();
        return snapshot;
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
            // Last, once every stage has landed: a session re-resolves its live sets from here.
            this.inputs.tick.announce({ kind: "snapshot", serial: replacement.next.serial });
        } finally {
            this.publishing = false;
        }
    }

    /**
     * The completion pass (design 12.2, 12.3): hash new nodes, complete session edges, and, when
     * no load is open, complete the load's edges -- ordinal and among per pair over the load's
     * surviving edges, and the edge hash, in one sorted pass.
     */
    private completeIdentity(): void {
        const { builder } = this;
        // Every node row at once (the first freeze of a store): one typed array and one bulk
        // column write instead of a checked cell write per node.
        const bulkNodes = this.nodeMark === 0 && builder.nodeBound > 0 ? new Uint32Array(2 * builder.nodeBound) : null;
        for (let i = this.nodeMark; i < builder.nodeBound; i++) {
            let id;
            try {
                id = builder.idOf(i);
            } catch {
                // A row added and removed again before any freeze. graph-format offers no
                // liveness test by index, and such rows are rare.
                continue;
            }

            const { a, b } = hashNodeId(id);
            if (bulkNodes === null) {
                builder.setNodeValue(this.nodeHashColumn, i, [a, b]);
            } else {
                bulkNodes[2 * i] = a;
                bulkNodes[2 * i + 1] = b;
            }
        }

        if (bulkNodes !== null) {
            builder.setNodeColumn(IDENTITY_COLUMNS.nodeHash, bulkNodes, { dtype: "u32", components: 2 });
        }

        const completingLoad = this.loadDepth === 0 && this.loadLength > 0;
        if (this.sessionEdges.length === 0 && !completingLoad) {
            return;
        }

        const graph: IdentityGraph = {
            endpoints: (edge) => builder.edgeEndpoints(edge),
            idOf: (node) => builder.idOf(node),
            ...(bulkNodes === null ? {} : { hashOf: (node: number) => ({ a: bulkNodes[2 * node], b: bulkNodes[2 * node + 1] }) }),
        };
        const ordered = this.latchPairsOrdered();
        const noSessionEdges = this.sessionEdges.length === 0;
        for (const { row, counter, fileId } of this.sessionEdges) {
            if (builder.hasEdge(row)) {
                builder.setEdgeValue(this.edgeOrdinalColumn, row, -1);
                builder.setEdgeValue(this.edgeAmongColumn, row, -1);
                const { a, b } = sessionEdgeHash(graph, row, counter, fileId, ordered);
                builder.setEdgeValue(this.edgeHashColumn, row, [a, b]);
            }
        }

        this.sessionEdges = [];
        if (!completingLoad) {
            return;
        }

        // Only surviving edges count: a row removed during the load takes no ordinal.
        let kept = 0;
        for (let i = 0; i < this.loadLength; i++) {
            if (builder.hasEdge(this.loadRows[i])) {
                this.loadFileIds[kept] = this.loadFileIds[i];
                this.loadRows[kept++] = this.loadRows[i];
            }
        }

        const fileIds = this.loadFileIds;
        const rows = this.loadRows.subarray(0, kept);
        if (noSessionEdges && kept === builder.edgeCount) {
            // The load covers every edge in the store (a first load, or one that replaced it): the
            // three columns are written whole, as typed arrays, instead of three checked cell
            // writes per edge. Rows no live edge holds keep ordinal and among -1.
            const bound = builder.edgeBound;
            const hashes = new Uint32Array(2 * bound);
            const ordinals = new Int32Array(bound).fill(-1);
            const amongs = new Int32Array(bound).fill(-1);
            completeLoad(rows, graph, ordered, (position) => fileIds[position], (row, ordinal, among, hash) => {
                ordinals[row] = ordinal;
                amongs[row] = among;
                hashes[2 * row] = hash.a;
                hashes[2 * row + 1] = hash.b;
            });
            builder.setEdgeColumn(IDENTITY_COLUMNS.edgeHash, hashes, { dtype: "u32", components: 2 });
            builder.setEdgeColumn(IDENTITY_COLUMNS.edgeOrdinal, ordinals, { dtype: "i32", default: -1 });
            builder.setEdgeColumn(IDENTITY_COLUMNS.edgeAmong, amongs, { dtype: "i32", default: -1 });
        } else {
            completeLoad(rows, graph, ordered, (position) => fileIds[position], (row, ordinal, among, hash) => {
                builder.setEdgeValue(this.edgeOrdinalColumn, row, ordinal);
                builder.setEdgeValue(this.edgeAmongColumn, row, among);
                builder.setEdgeValue(this.edgeHashColumn, row, [hash.a, hash.b]);
            });
        }
        this.loadLength = 0;
        this.loadFileIds = [];
        this.loadRows = new Uint32Array(64);
    }

    /**
     * Whether pairs are ordered, latched the first time an edge is completed: ordered only when the
     * graph was declared directed by then. Recorded as a graph attribute so every snapshot says
     * which rule its edge hashes follow.
     * @returns the latched value
     */
    private latchPairsOrdered(): boolean {
        if (this.pairsOrdered === null) {
            this.pairsOrdered = this.direction.by !== "unsettled" && this.builder.directed;
            this.builder.setGraphValue(PAIRS_ORDERED_ATTRIBUTE, this.pairsOrdered ? 1 : 0, { dtype: "u8" });
        }

        return this.pairsOrdered;
    }

    /**
     * Move the pass's marks and the open load's rows into the index space of a freeze just
     * committed. Allocation-free.
     * @param edgeRemap - the freeze's edge remap, or null when nothing was renumbered
     */
    private followIdentityRemap(edgeRemap: U32 | null): void {
        this.nodeMark = this.builder.nodeBound;
        if (edgeRemap === null) {
            return;
        }

        let kept = 0;
        for (let i = 0; i < this.loadLength; i++) {
            const moved = edgeRemap[this.loadRows[i]] ?? INVALID_INDEX;
            if (moved !== INVALID_INDEX) {
                this.loadFileIds[kept] = this.loadFileIds[i];
                this.loadRows[kept++] = moved;
            }
        }

        this.loadFileIds.length = Math.min(this.loadFileIds.length, kept);
        this.loadLength = kept;
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
