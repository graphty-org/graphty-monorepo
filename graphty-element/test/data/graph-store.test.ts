import { type F32, type FreezeReport, type GraphSnapshot, INVALID_INDEX, type U32 } from "@graphty/graph-format";
import { assert, describe, it } from "vitest";

import { GraphStore, type GraphStoreOptions, type SnapshotReplacement } from "../../src/data/GraphStore";

/** Which callback should throw on its next delivery, to prove a freeze survives a consumer bug. */
interface ThrowOnce {
    onNodeRemap: boolean;
    onEdgeRemap: boolean;
    onReplaced: boolean;
}

interface Harness {
    store: GraphStore;
    events: SnapshotReplacement[];
    nodeRemaps: number[][];
    edgeRemaps: number[][];
    /** Every callback delivery, in the order it happened: the ordering contract is part of the API. */
    log: string[];
    throwOnce: ThrowOnce;
    /** Arm this and EVERY callback asks the store for the current snapshot before it returns. */
    reenter: { on: boolean };
    /** What each of those re-entrant reads was answered with. */
    reentered: GraphSnapshot[];
    /** Set this to a callback name and that callback disposes the store before it returns. */
    disposeOn: { which: keyof ThrowOnce | null };
    /** The LIVE positionScale, so a test can change it after the store was constructed. */
    scale: { value: number };
}

function makeStore(directed: boolean | "auto" = "auto", positionScale = 1): Harness {
    const events: SnapshotReplacement[] = [];
    const nodeRemaps: number[][] = [];
    const edgeRemaps: number[][] = [];
    const log: string[] = [];
    const throwOnce: ThrowOnce = { onNodeRemap: false, onEdgeRemap: false, onReplaced: false };
    const reenter = { on: false };
    const reentered: GraphSnapshot[] = [];
    const disposeOn: { which: keyof ThrowOnce | null } = { which: null };
    const scale = { value: positionScale };
    let created: GraphStore | null = null;
    const failIfArmed = (which: keyof ThrowOnce): void => {
        if (!throwOnce[which]) {
            return;
        }

        throwOnce[which] = false;
        throw new Error(`the consumer blew up inside ${which}`);
    };

    // Asking the store for the current snapshot from inside the callback that hands it to you is
    // the obvious thing for a consumer to write, so the harness can do it from every callback.
    const reenterIfArmed = (): void => {
        if (reenter.on && created !== null) {
            reentered.push(created.getSnapshot());
        }
    };

    // Tearing the graph down from inside a snapshot-replaced handler is a real teardown race, and
    // dispose() promises that no freeze event reaches a listener afterwards.
    const disposeIfArmed = (which: keyof ThrowOnce): void => {
        if (disposeOn.which === which && created !== null) {
            disposeOn.which = null;
            created.dispose();
        }
    };

    const options: GraphStoreOptions = {
        directed,
        positionScale: () => scale.value,
        onReplaced: (r) => {
            failIfArmed("onReplaced");
            log.push("onReplaced");
            events.push(r);
            reenterIfArmed();
            disposeIfArmed("onReplaced");
        },
        onNodeRemap: (remap) => {
            failIfArmed("onNodeRemap");
            log.push("onNodeRemap");
            nodeRemaps.push([...remap]);
            reenterIfArmed();
            disposeIfArmed("onNodeRemap");
        },
        onEdgeRemap: (remap) => {
            failIfArmed("onEdgeRemap");
            log.push("onEdgeRemap");
            edgeRemaps.push([...remap]);
            reenterIfArmed();
            disposeIfArmed("onEdgeRemap");
        },
    };
    created = new GraphStore(options);
    return {
        store: created,
        events,
        nodeRemaps,
        edgeRemaps,
        log,
        throwOnce,
        reenter,
        reentered,
        disposeOn,
        scale,
    };
}

describe("GraphStore", () => {
    it("freezes once per revision and caches", () => {
        const { store, events } = makeStore();
        store.builder.addEdge("a", "b");
        store.touch();
        const first = store.getSnapshot();
        const second = store.getSnapshot();
        assert.strictEqual(first, second);
        assert.strictEqual(events.length, 1);
        assert.strictEqual(events[0]?.previous, null);
    });

    it("invalidates on a MERGE, which builder.mutationCount does not see", () => {
        const { store } = makeStore();
        store.builder.addNode("a");
        store.touch();
        const first = store.getSnapshot();
        const mutationCountBefore = store.builder.mutationCount;
        store.builder.addNodeRecord("a", { label: "second write" });
        store.touch();
        const second = store.getSnapshot();
        assert.strictEqual(store.builder.mutationCount, mutationCountBefore, "the format did not count the merge");
        assert.notStrictEqual(second, first, "but the store did");
    });

    it("attaches the element positions as the role-position column, by reference", () => {
        const { store } = makeStore();
        store.builder.addEdge("a", "b");
        store.touch();
        const snapshot = store.getSnapshot();
        assert.notStrictEqual(snapshot.nodes.byRole("position"), null);
        const { data } = snapshot.nodes.requireTyped("position", "f32");
        assert.strictEqual(data.buffer, store.positions.view(snapshot.nodeCount).buffer);
        store.positions.write(0, 4, 5, 6);
        assert.strictEqual(data[0], 4);
    });

    it("keeps a seeded coordinate across the replaceRole attach", () => {
        const { store } = makeStore();
        const index = store.builder.addNode("a");
        store.builder.setNodeValue(store.seedColumn, index, [11, 12, 13]);
        store.touch();
        const snapshot = store.getSnapshot();
        assert.strictEqual(snapshot.nodes.get("graphty.importPosition"), null, "replaceRole removed the seed column");
        const out = { x: 0, y: 0, z: 0 };
        store.positions.read(0, out);
        assert.deepStrictEqual(out, { x: 11, y: 12, z: 13 });
    });

    it("multiplies EVERY component of a seed by positionScale", () => {
        // A non-unit, non-symmetric scale: with [1, 2, 3] at scale 10 a dropped multiply on any one
        // component fails, and no component can borrow another's value.
        const { store } = makeStore("auto", 10);
        const index = store.builder.addNode("a");
        store.builder.setNodeValue(store.seedColumn, index, [1, 2, 3]);
        store.touch();
        store.getSnapshot();
        const out = { x: 0, y: 0, z: 0 };
        store.positions.read(0, out);
        assert.deepStrictEqual(out, { x: 10, y: 20, z: 30 }, "record units reach the scene scaled");
    });

    it("reads positionScale LIVE, so a config change after construction is not ignored", () => {
        // The element mutates config.data.knownFields in place at runtime (graphty-element.ts uses
        // setDeep for every other known field), so a scale captured in the constructor would make
        // this one field the only one that silently kept its startup value.
        const { store, scale } = makeStore("auto", 1);
        const first = store.builder.addNode("a");
        store.builder.setNodeValue(store.seedColumn, first, [1, 2, 3]);
        store.touch();
        store.getSnapshot();

        scale.value = 10;
        const second = store.builder.addNode("b");
        store.builder.setNodeValue(store.seedColumn, second, [1, 2, 3]);
        store.touch();
        store.getSnapshot();

        const out = { x: 0, y: 0, z: 0 };
        store.positions.read(first, out);
        assert.deepStrictEqual(out, { x: 1, y: 2, z: 3 }, "the already-placed node keeps the scale it was seeded at");
        store.positions.read(second, out);
        assert.deepStrictEqual(out, { x: 10, y: 20, z: 30 }, "and the new node follows the CURRENT config");
    });

    it("leaves a node with a NON-FINITE seed unplaced rather than storing it", () => {
        // A 2D importer that writes no z gives (x, y, NaN); one that divides by a zero extent gives
        // an infinity. Stored, such a row reports PLACED, so fillUnplaced() never repairs it and the
        // mesh vanishes in Babylon with the scene bounds poisoned and nothing in the console.
        const { store } = makeStore();
        const flatZ = store.builder.addNode("flat-z");
        const infinite = store.builder.addNode("infinite");
        const good = store.builder.addNode("good");
        store.builder.setNodeValue(store.seedColumn, flatZ, [3, 4, Number.NaN]);
        store.builder.setNodeValue(store.seedColumn, infinite, [Number.POSITIVE_INFINITY, 0, 0]);
        store.builder.setNodeValue(store.seedColumn, good, [1, 2, 3]);
        store.touch();
        store.getSnapshot();
        assert.strictEqual(store.positions.isPlaced(flatZ), false, "a NaN z must not pass as a placed row");
        assert.strictEqual(store.positions.isPlaced(infinite), false, "nor must an infinite x");
        assert.strictEqual(store.positions.isPlaced(good), true, "and the rest of the burst is still seeded");
        const out = { x: 0, y: 0, z: 0 };
        store.positions.read(good, out);
        assert.deepStrictEqual(out, { x: 1, y: 2, z: 3 });
    });

    it("leaves a seed the positionScale overflows to an f32 infinity unplaced", () => {
        // The seed is checked AFTER the scale is applied, because it is the product that gets
        // stored. positionScale is validated as nothing more than z.number().positive(), so a seed
        // of 1e30 at a scale of 1e10 is a finite double -- a guard on the raw seed waves it through
        // -- and an infinity in the f32 array, which reports PLACED and so is never repaired.
        const { store } = makeStore("auto", 1e10);
        const big = store.builder.addNode("big");
        const ok = store.builder.addNode("ok");
        store.builder.setNodeValue(store.seedColumn, big, [1e30, 1, 1]);
        store.builder.setNodeValue(store.seedColumn, ok, [1, 1, 2]);
        store.touch();
        const snapshot = store.getSnapshot();
        assert.strictEqual(store.positions.isPlaced(big), false, "the overflowing row is left to the layout");
        assert.strictEqual(store.positions.isPlaced(ok), true, "and the rest of the burst is still seeded");
        const { data } = snapshot.nodes.requireTyped("position", "f32");
        assert.strictEqual(Number.isNaN(data[0]), true, "no infinity reached the role-position column");
        const out = { x: 0, y: 0, z: 0 };
        store.positions.read(ok, out);
        // Every one of these is exactly representable in f32, so the scale is the only thing on
        // trial here.
        assert.deepStrictEqual(out, { x: 1e10, y: 1e10, z: 2e10 });
    });

    it("remaps positions and reports BOTH remaps, before onReplaced, on a compacting freeze", () => {
        const { store, nodeRemaps, edgeRemaps, log } = makeStore();
        store.builder.addEdge("a", "b");
        store.builder.addEdge("b", "c");
        store.touch();
        store.getSnapshot();
        store.positions.write(0, 1, 1, 1);
        store.positions.write(1, 2, 2, 2);
        store.positions.write(2, 3, 3, 3);
        store.builder.removeNode("a");
        store.touch();
        const next = store.getSnapshot();
        assert.strictEqual(next.nodeCount, 2);
        assert.strictEqual(nodeRemaps.length, 1);
        assert.deepStrictEqual(nodeRemaps[0], [INVALID_INDEX, 0, 1], "node a is gone; b and c slide down");
        // M6-T6 re-keys edgesByIndex from this, so it has to arrive and it has to be the real thing.
        assert.strictEqual(edgeRemaps.length, 1);
        assert.deepStrictEqual(edgeRemaps[0], [INVALID_INDEX, 0], "the a->b edge died with a; b->c slid down");
        // The ORDER is the contract: Node.index and edgesByIndex must be walked before a listener
        // reacts to the new snapshot, or the listener reads indices into the old space.
        assert.deepStrictEqual(log, ["onReplaced", "onNodeRemap", "onEdgeRemap", "onReplaced"]);
        const out = { x: 0, y: 0, z: 0 };
        store.positions.read(nodeRemaps[0]?.[1] ?? 0, out);
        assert.deepStrictEqual(out, { x: 2, y: 2, z: 2 });
    });

    it("seeds a node ADDED in the same burst that removed another one", () => {
        // PLAN DECISION 4: the seeding pass runs in BOTH freeze branches. One burst can remove a
        // node and add a seeded one, so the freeze that renumbers is also a freeze with rows to
        // seed. Move the pass under the non-remapping branch and the new node stays at NaN forever.
        const { store } = makeStore();
        store.builder.addEdge("a", "b");
        store.touch();
        store.getSnapshot();
        store.positions.write(0, 1, 1, 1);
        store.positions.write(1, 2, 2, 2);
        store.builder.removeNode("a");
        const added = store.builder.addNode("c");
        store.builder.setNodeValue(store.seedColumn, added, [7, 8, 9]);
        store.touch();
        const next = store.getSnapshot();
        assert.strictEqual(next.nodeCount, 2);
        const out = { x: 0, y: 0, z: 0 };
        store.positions.read(0, out);
        assert.deepStrictEqual(out, { x: 2, y: 2, z: 2 }, "the survivor kept its coordinate through the remap");
        store.positions.read(1, out);
        assert.deepStrictEqual(out, { x: 7, y: 8, z: 9 }, "and the new node was seeded on the SAME freeze");
    });

    it("undirected(s) is cached and shares the node table with its source", () => {
        const { store } = makeStore();
        store.builder.addEdge("a", "b");
        store.touch();
        const s = store.getSnapshot();
        const u = store.undirected(s);
        assert.strictEqual(store.undirected(s), u);
        assert.strictEqual(u.snapshot.nodes, s.nodes);
        assert.notStrictEqual(u.snapshot.nodes.byRole("position"), null);
    });

    it("emits previous on the second freeze so a listener can release it", () => {
        const { store, events } = makeStore();
        store.builder.addEdge("a", "b");
        store.touch();
        const first = store.getSnapshot();
        store.builder.addEdge("b", "c");
        store.touch();
        const second = store.getSnapshot();
        assert.strictEqual(events.length, 2);
        assert.strictEqual(events[1]?.previous, first);
        assert.strictEqual(events[1]?.next, second);
        const report: FreezeReport | undefined = events[1]?.report;
        assert.strictEqual(report?.nodeRemap, null);
    });
});

describe("GraphStore publication", () => {
    it("re-delivers a remap whose callback threw instead of re-freezing past it", () => {
        // freezeWithReport reports against the PREVIOUS freeze, so a dropped report is gone: the
        // retry would report nodeRemap null while positions are already remapped, stranding a
        // half-walked Node.index with nothing left to reconcile it.
        const { store, events, nodeRemaps, edgeRemaps, throwOnce } = makeStore();
        store.builder.addEdge("a", "b");
        store.builder.addEdge("b", "c");
        store.touch();
        const first = store.getSnapshot();
        store.positions.write(0, 1, 1, 1);
        store.positions.write(1, 2, 2, 2);
        store.positions.write(2, 3, 3, 3);
        store.builder.removeNode("a");
        store.touch();
        throwOnce.onNodeRemap = true;
        assert.throws(() => store.getSnapshot(), /blew up inside onNodeRemap/);
        assert.deepStrictEqual(nodeRemaps, [], "the throwing delivery recorded nothing");
        assert.deepStrictEqual(edgeRemaps, [], "and the later callbacks did not run");
        assert.strictEqual(events.length, 1, "no consumer was told to switch snapshots");
        assert.strictEqual(
            store.stale,
            true,
            "the cache is committed but no consumer has switched, which is NOT settled",
        );

        const next = store.getSnapshot();
        assert.strictEqual(next.nodeCount, 2);
        assert.deepStrictEqual(nodeRemaps[0], [INVALID_INDEX, 0, 1], "the same remap arrived on the retry");
        assert.deepStrictEqual(edgeRemaps[0], [INVALID_INDEX, 0]);
        assert.strictEqual(events.length, 2);
        assert.strictEqual(events[1]?.previous, first);
        assert.strictEqual(events[1]?.next, next);
        assert.notStrictEqual(events[1]?.report.nodeRemap, null, "a re-freeze would have reported NO remap at all");
        // A SECOND remap would slide b's row off the front and leave c's behind it, so this pins
        // that the store remapped exactly once across the throw and the retry.
        const out = { x: 0, y: 0, z: 0 };
        store.positions.read(0, out);
        assert.deepStrictEqual(out, { x: 2, y: 2, z: 2 }, "positions were remapped exactly once");
        store.positions.read(1, out);
        assert.deepStrictEqual(out, { x: 3, y: 3, z: 3 });
        assert.strictEqual(store.stale, false, "and settled once the publication finished");
    });

    it("re-delivers a snapshot-replaced whose listener threw, without repeating the remaps", () => {
        const { store, events, nodeRemaps, edgeRemaps, log, throwOnce } = makeStore();
        store.builder.addEdge("a", "b");
        store.builder.addEdge("b", "c");
        store.touch();
        store.getSnapshot();
        store.builder.removeNode("a");
        store.touch();
        throwOnce.onReplaced = true;
        assert.throws(() => store.getSnapshot(), /blew up inside onReplaced/);
        assert.strictEqual(nodeRemaps.length, 1, "the remap got through before the listener threw");
        assert.strictEqual(events.length, 1, "but the replacement did not");
        assert.strictEqual(store.stale, true, "a publication with a callback still owed is NOT settled");

        const next = store.getSnapshot();
        assert.strictEqual(events.length, 2, "the superseded snapshot is announced on the retry");
        assert.strictEqual(events[1]?.next, next);
        assert.strictEqual(nodeRemaps.length, 1, "a callback that already returned is never called twice");
        assert.strictEqual(edgeRemaps.length, 1);
        assert.deepStrictEqual(log, ["onReplaced", "onNodeRemap", "onEdgeRemap", "onReplaced"]);
        assert.strictEqual(store.stale, false);
    });

    it("answers a consumer that calls back into getSnapshot, rather than re-entering the publication", () => {
        // publish() advances a stage only AFTER its callback returns, and clears `pending` only
        // after onReplaced returns, so a re-entrant getSnapshot() that went through publish() again
        // would deliver the same un-advanced stage forever: a stack overflow, having run onReplaced
        // thousands of times for the freeze this class promises to publish EXACTLY ONCE. The event
        // is wired to a Babylon Observable of arbitrary listeners, so the re-entrant call is user
        // code, and asking the graph for its snapshot from a snapshot-replaced handler is the
        // obvious thing to write.
        const { store, events, nodeRemaps, edgeRemaps, log, reenter, reentered } = makeStore();
        store.builder.addEdge("a", "b");
        store.builder.addEdge("b", "c");
        store.touch();
        store.getSnapshot();
        store.builder.removeNode("a");
        store.touch();
        reenter.on = true;
        const next = store.getSnapshot();
        assert.strictEqual(reentered.length, 3, "all three callbacks asked");
        assert.deepStrictEqual(reentered, [next, next, next], "and each was handed the NEW snapshot");
        assert.strictEqual(nodeRemaps.length, 1, "no callback ran twice for the one freeze");
        assert.strictEqual(edgeRemaps.length, 1);
        assert.strictEqual(events.length, 2);
        assert.deepStrictEqual(log, ["onReplaced", "onNodeRemap", "onEdgeRemap", "onReplaced"]);
        assert.strictEqual(store.stale, false);
    });

    it("commits a freeze whose ATTACH threw, so the remap report survives to the retry", () => {
        const { store, events, nodeRemaps } = makeStore();
        store.builder.addEdge("a", "b");
        store.builder.addEdge("b", "c");
        store.touch();
        const first = store.getSnapshot();
        store.builder.removeNode("a");
        store.touch();
        // Fail the attach the way a graph-format regression would. By then `positions` has ALREADY
        // been remapped and freezeWithReport has reported against the previous freeze, so a store
        // that let the throw skip the commit would lose the report for good: the retry re-freezes,
        // reports nodeRemap null, and Node.index stays half-walked with nothing to reconcile it.
        const attach = store.positions.view.bind(store.positions);
        let armed = true;
        store.positions.view = (nodeCount: number): F32 => {
            if (!armed) {
                return attach(nodeCount);
            }

            armed = false;
            throw new Error("the attach blew up");
        };
        assert.throws(() => store.getSnapshot(), /the attach blew up/);
        assert.deepStrictEqual(nodeRemaps, [], "the failed call delivered nothing");
        assert.strictEqual(store.stale, true, "but the freeze is committed and still owes its callbacks");

        const next = store.getSnapshot();
        assert.deepStrictEqual(nodeRemaps[0], [INVALID_INDEX, 0, 1], "the report survived the failed attach");
        assert.strictEqual(events.length, 2);
        assert.strictEqual(events[1]?.previous, first);
        assert.strictEqual(events[1]?.next, next);
        assert.notStrictEqual(events[1]?.report.nodeRemap, null, "a re-freeze would have reported NO remap at all");
        // The attach is RETRIED, not abandoned. A snapshot cached and announced with no
        // role-position column answers every later getSnapshot() in the same revision without an
        // error, and the first consumer to read the column then fails a long way from the cause.
        assert.notStrictEqual(next.nodes.byRole("position"), null, "the retry finished the attach");
        assert.strictEqual(
            next.nodes.get("graphty.importPosition"),
            null,
            "and replaceRole ran, so the seed column is gone from the published snapshot",
        );
        assert.strictEqual(store.stale, false);
    });

    it("commits a freeze whose REMAP threw, so no node is served its predecessor's coordinates", () => {
        // The remap is the step whose partial application is unrecoverable, and it is NOT
        // throw-free: remapArray allocates (an allocation failure on a large graph reaches it) and
        // it raises E_INDEX_RANGE on a malformed report. Let a throw here skip the commit and the
        // caller's retry re-freezes, reports nodeRemap null, and every survivor silently keeps the
        // row -- and therefore the coordinate -- of the node that used to precede it.
        const { store, events, nodeRemaps } = makeStore();
        store.builder.addEdge("a", "b");
        store.builder.addEdge("b", "c");
        store.touch();
        const first = store.getSnapshot();
        store.positions.write(0, 10, 0, 0);
        store.positions.write(1, 20, 0, 0);
        store.positions.write(2, 30, 0, 0);
        store.builder.removeNode("a");
        store.touch();

        const remap = store.positions.remap.bind(store.positions);
        let armed = true;
        store.positions.remap = (nodeRemap: U32, nodeCount: number): void => {
            if (!armed) {
                remap(nodeRemap, nodeCount);
                return;
            }

            armed = false;
            throw new Error("the remap blew up");
        };
        assert.throws(() => store.getSnapshot(), /the remap blew up/);
        assert.deepStrictEqual(nodeRemaps, [], "the failed call delivered nothing");
        assert.strictEqual(store.stale, true, "but the freeze is committed and still owes its work");

        const next = store.getSnapshot();
        assert.strictEqual(next.nodeCount, 2);
        assert.deepStrictEqual(nodeRemaps[0], [INVALID_INDEX, 0, 1], "the report survived the failed remap");
        assert.strictEqual(events.length, 2);
        assert.strictEqual(events[1]?.previous, first);
        assert.notStrictEqual(events[1]?.report.nodeRemap, null, "a re-freeze would have reported NO remap at all");
        const out = { x: 0, y: 0, z: 0 };
        store.positions.read(0, out);
        assert.strictEqual(out.x, 20, "b is at b's coordinate, NOT at the dead node a's");
        store.positions.read(1, out);
        assert.strictEqual(out.x, 30, "and c at c's");
        assert.notStrictEqual(next.nodes.byRole("position"), null, "the retry finished the whole position pass");
        assert.strictEqual(store.stale, false);
    });

    it("stops delivering the moment a callback DISPOSES the store", () => {
        // dispose() is defined as "no freeze event reaches a listener afterwards", and publish()
        // holds its own reference to the in-flight publication, so without a check the remaining
        // callbacks would run against a DataManager that has already been torn down.
        const { store, log, events, edgeRemaps, disposeOn } = makeStore();
        store.builder.addEdge("a", "b");
        store.builder.addEdge("b", "c");
        store.touch();
        store.getSnapshot();
        store.builder.removeNode("a");
        store.touch();
        disposeOn.which = "onNodeRemap";
        store.getSnapshot();

        assert.deepStrictEqual(log, ["onReplaced", "onNodeRemap"], "the delivery stopped at the dispose");
        assert.deepStrictEqual(edgeRemaps, [], "onEdgeRemap never ran");
        assert.strictEqual(events.length, 1, "and the replacement was never announced");
        assert.strictEqual(store.isDisposed, true);
    });
});

describe("GraphStore hazards", () => {
    it("the format believes it owns the element's position buffer, so the element must never transfer", () => {
        const { store } = makeStore();
        store.builder.addEdge("a", "b");
        store.touch();
        const snapshot = store.getSnapshot();
        const transferables = snapshot.transferables();
        const positionsBuffer = store.positions.view(snapshot.nodeCount).buffer;
        assert.strictEqual(
            transferables.includes(positionsBuffer),
            true,
            "if this ever goes false, graph-format learned about shared holders and DEP-M6-D can be revisited",
        );
    });
});

describe("GraphStore lifecycle", () => {
    it("locks an explicitly undirected builder while it is still empty", () => {
        const { store } = makeStore(false);
        assert.strictEqual(store.builder.directedLocked, true);
        store.builder.addEdge("a", "b");
        store.touch();
        const s = store.getSnapshot();
        assert.strictEqual(s.directed, false);
        assert.throws(() => store.builder.setDirected(true), /locked/, "config.data.directed wins over any later writer");
    });

    it("locks an explicitly DIRECTED builder too", () => {
        const { store } = makeStore(true);
        assert.strictEqual(store.builder.directedLocked, true);
        store.builder.addEdge("a", "b");
        store.touch();
        assert.strictEqual(store.getSnapshot().directed, true);
        assert.throws(() => store.builder.setDirected(false), /locked/);
    });

    it("leaves the builder UNLOCKED under auto, which is the seam an importer sets direction through", () => {
        // PLAN DECISION 2. Lock unconditionally and a GEXF/GraphML importer that reads
        // directedness out of the file it is parsing gets E_DIRECTED instead.
        const { store } = makeStore("auto");
        assert.strictEqual(store.builder.directedLocked, false);
        store.builder.setDirected(false);
        store.builder.addEdge("a", "b");
        store.touch();
        assert.strictEqual(store.getSnapshot().directed, false, "the importer's choice reached the snapshot");
    });

    it("returns an identity DerivedGraph for an already undirected snapshot", () => {
        const { store } = makeStore(false);
        store.builder.addEdge("a", "b");
        store.touch();
        const s = store.getSnapshot();
        const u = store.undirected(s);
        assert.strictEqual(u.snapshot, s, "no second snapshot is built for a graph that is already undirected");
        assert.strictEqual(u.nodeRemap, null);
        assert.strictEqual(u.edgeRemap, null);
        assert.strictEqual(u.report.droppedEdges, 0);
        assert.strictEqual(u.report.mergedEdges, 0);
    });

    it("reports stale until the next read, and again after a touch", () => {
        const { store } = makeStore();
        assert.strictEqual(store.stale, true, "nothing has been frozen yet");
        store.builder.addNode("a");
        store.touch();
        store.getSnapshot();
        assert.strictEqual(store.stale, false);
        store.touch();
        assert.strictEqual(store.stale, true);
    });

    it("hands out edge ids from zero, one per call", () => {
        const { store } = makeStore();
        assert.strictEqual(store.nextEdgeId(), 0);
        assert.strictEqual(store.nextEdgeId(), 1);
        assert.strictEqual(store.nextEdgeId(), 2);
    });

    it("dispose is TERMINAL: a use after teardown throws instead of being served", () => {
        // The callbacks point into a DataManager that is being torn down. A freeze served after
        // dispose() emits snapshot-replaced with previous: null -- the contract's "FIRST freeze" --
        // to listeners still holding the real previous snapshot.
        const { store, events } = makeStore();
        store.builder.addEdge("a", "b");
        store.touch();
        const snapshot = store.getSnapshot();
        assert.strictEqual(store.isDisposed, false);
        store.dispose();
        assert.strictEqual(store.isDisposed, true);
        assert.throws(() => store.getSnapshot(), /after dispose/);
        assert.throws(() => store.touch(), /after dispose/);
        assert.throws(() => store.nextEdgeId(), /after dispose/);
        // Otherwise it builds and caches a fresh DerivedGraph over a snapshot the store has just
        // told the world it released, with the DataManager behind `options` already torn down.
        assert.throws(() => store.undirected(snapshot), /after dispose/);
        assert.strictEqual(events.length, 1, "nothing was announced after teardown");
        store.dispose();
        assert.strictEqual(store.isDisposed, true, "disposing twice is harmless");
    });
});
