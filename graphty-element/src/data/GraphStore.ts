import {
    type ColumnHandle,
    type DerivedGraph,
    type FreezeReport,
    GraphBuilder,
    type GraphSnapshot,
    type U32,
} from "@graphty/graph-format";

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
}

/** The node column an importer seeds file coordinates into; deleted from every snapshot by the attach. */
const SEED_COLUMN = "graphty.importPosition";
/** The element-assigned edge counter column (D-M6-8: the counter is Edge.index, not Edge.id). */
const EDGE_ID_COLUMN = "graphty.edgeId";

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
    private readonly undirectedCache = new WeakMap<GraphSnapshot, DerivedGraph>();
    private cache: GraphSnapshot | null = null;
    private cachedRevision = -1;
    private revision = 0;
    private edgeIdCounter = 0;
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
        return this.edgeIdCounter++;
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
        for (let i = 0; i < snapshot.nodeCount; i++) {
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
    }
}
