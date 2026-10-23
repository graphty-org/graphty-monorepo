/**
 * The store contract on the memory store, on the fault wrapper with no fault switched on, and
 * every fault the wrapper injects.
 */

import { assert, describe, it } from "vitest";

import { memoryAutosaveStore } from "../../extend";
import { abortReason } from "../../src/autosave/indexedDbStore";
import { AutosaveConflict, isAutosaveConflict } from "../../src/autosave/types";
import { faultAutosaveStore } from "../../src/testing/faultAutosaveStore";
import { describeAutosaveStoreContract, write } from "./store-contract";

describeAutosaveStoreContract("memoryAutosaveStore", () =>
    Promise.resolve({ store: memoryAutosaveStore(), dispose: () => Promise.resolve() }),
);

describeAutosaveStoreContract("faultAutosaveStore with no fault", () =>
    Promise.resolve({ store: faultAutosaveStore(memoryAutosaveStore()), dispose: () => Promise.resolve() }),
);

async function rejection(promise: Promise<unknown>): Promise<Error> {
    try {
        await promise;
    } catch (error) {
        return error as Error;
    }
    throw new Error("expected the promise to reject");
}

describe("memoryAutosaveStore", () => {
    it("writes nothing when a meta cannot be cloned", async () => {
        const store = memoryAutosaveStore();
        await store.commit([write("a", "k", 0, { rest: "r" })]);
        const error = await rejection(
            store.commit([write("b", "k", 0, { rest: "b" }), write("a", "k", 1, { rest: "x" }, { fn: () => 1 })]),
        );
        assert.strictEqual(error.name, "DataCloneError");
        assert.isUndefined(await store.read("b"));
        assert.strictEqual((await store.read("a"))?.meta.gen, 1);
    });
});

describe("AutosaveConflict", () => {
    it("is recognized by instance and by name", () => {
        const conflict = new AutosaveConflict("a", 1, 2);
        assert.isTrue(isAutosaveConflict(conflict));
        const foreign = new Error("from another copy of the module");
        foreign.name = "AutosaveConflict";
        assert.isTrue(isAutosaveConflict(foreign));
        assert.isFalse(isAutosaveConflict(new Error("x")));
        assert.isFalse(isAutosaveConflict("AutosaveConflict"));
    });
});

describe("abortReason (IndexedDB store)", () => {
    const quota = new DOMException("full", "QuotaExceededError");
    const unknown = new DOMException("lost", "UnknownError");

    it("reports QuotaExceededError whether the transaction or only the request carries it", () => {
        assert.strictEqual(abortReason(quota, null), quota);
        assert.strictEqual(abortReason(null, quota), quota);
        assert.strictEqual(abortReason(unknown, quota), quota);
    });

    it("prefers the transaction's error, then the request's, then a plain AbortError", () => {
        assert.strictEqual(abortReason(unknown, null), unknown);
        assert.strictEqual(abortReason(null, unknown), unknown);
        assert.strictEqual(abortReason(null, null).name, "AbortError");
    });
});

describe("faultAutosaveStore", () => {
    function setup(): { inner: ReturnType<typeof memoryAutosaveStore>; faults: ReturnType<typeof faultAutosaveStore> } {
        const inner = memoryAutosaveStore();
        return { inner, faults: faultAutosaveStore(inner) };
    }

    it("quota: the next commits reject with QuotaExceededError and write nothing", async () => {
        const { inner, faults } = setup();
        faults.quota(2);
        for (let i = 0; i < 2; i++) {
            const error = await rejection(faults.commit([write("a", "k", 0, { rest: "r" })]));
            assert.strictEqual(error.name, "QuotaExceededError");
        }
        assert.isUndefined(await inner.read("a"));
        await faults.commit([write("a", "k", 0, { rest: "r" })]);
        assert.strictEqual(faults.commits, 1);
        assert.strictEqual(faults.commitCalls, 3);
    });

    it("a lost connection fails every call with UnknownError until healed", async () => {
        const { faults } = setup();
        await faults.commit([write("a", "k", 0, { rest: "r" })]);
        faults.loseConnection();
        for (const call of [
            faults.list("k"),
            faults.read("a"),
            faults.commit([write("a", "k", 1, { rest: "x" })]),
            faults.remove("a"),
        ]) {
            assert.strictEqual((await rejection(call)).name, "UnknownError");
        }
        faults.heal();
        assert.strictEqual((await faults.read("a"))?.parts.rest, "r");
    });

    it("a stalled commit never settles until its signal aborts it, and writes nothing", async () => {
        const { inner, faults } = setup();
        faults.stall();
        const controller = new AbortController();
        let settled = false;
        const pending = faults.commit([write("a", "k", 0, { rest: "r" })], { signal: controller.signal });
        pending.then(
            () => (settled = true),
            () => (settled = true),
        );
        // Other calls still run while the commit hangs.
        assert.deepEqual(await faults.list("k"), []);
        assert.isFalse(settled);

        controller.abort();
        assert.strictEqual((await rejection(pending)).name, "AbortError");
        assert.isUndefined(await inner.read("a"));

        faults.heal();
        await faults.commit([write("a", "k", 0, { rest: "r" })]);
        assert.strictEqual(faults.commits, 1);
    });

    it("a stalled commit whose signal was already aborted rejects at once", async () => {
        const { faults } = setup();
        faults.stall();
        const controller = new AbortController();
        controller.abort();
        const error = await rejection(
            faults.commit([write("a", "k", 0, { rest: "r" })], { signal: controller.signal }),
        );
        assert.strictEqual(error.name, "AbortError");
    });

    it("aborts a commit carrying data and leaves the previous commit whole", async () => {
        const { faults } = setup();
        await faults.commit([write("a", "k", 0, { data: "d1", rest: "r1" })]);
        faults.abortDataWrites();

        const error = await rejection(faults.commit([write("a", "k", 1, { data: "d2", rest: "r2" })]));
        assert.strictEqual(error.name, "AbortError");
        assert.deepEqual((await faults.read("a"))?.parts, { data: "d1", rest: "r1" });

        // Writes without data, and a write that removes data, still go through.
        await faults.commit([write("a", "k", 1, { rest: "r2" })]);
        await faults.commit([write("a", "k", 2, { data: null })]);
        assert.deepEqual((await faults.read("a"))?.parts, { rest: "r2" });

        faults.abortDataWrites(false);
        await faults.commit([write("a", "k", 3, { data: "d3" })]);
        assert.strictEqual((await faults.read("a"))?.parts.data, "d3");
    });

    it("returns a corrupt part from read and leaves the stored part alone", async () => {
        const { inner, faults } = setup();
        await faults.commit([write("a", "k", 0, { data: '{"nodes":[1,2,3]}', rest: "{}" })]);
        faults.corruptPart("a", "data");

        const parts = (await faults.read("a"))?.parts;
        assert.strictEqual(parts?.data, '{"nodes"');
        assert.strictEqual(parts?.rest, "{}");
        assert.strictEqual((await inner.read("a"))?.parts.data, '{"nodes":[1,2,3]}');
        assert.isUndefined(await faults.read("missing"));
    });

    it("reports a newer formatVersion from list and read", async () => {
        const { faults } = setup();
        await faults.commit([
            write("a", "k", 0, { rest: "{}" }, { formatVersion: 1 }),
            write("b", "k", 0, {}, { formatVersion: 1 }),
        ]);
        faults.newerFormat("a", 2);

        const listed = await faults.list("k");
        assert.deepEqual(
            listed.map((m) => [m.id, m.formatVersion]),
            [
                ["a", 2],
                ["b", 1],
            ],
        );
        assert.strictEqual((await faults.read("a"))?.meta.formatVersion, 2);
    });

    it("a held write released after a second writer committed is rejected; the entry holds one writer's state", async () => {
        const { faults } = setup();
        await faults.commit([write("a", "k", 0, { data: "d0", rest: "r0" })]);

        const held = faults.hold();
        const first = faults.commit([write("a", "k", 1, { data: "first", rest: "first" })]);
        const writes = await held.reached;
        assert.strictEqual(writes[0]?.parts.data, "first");

        await faults.commit([write("a", "k", 1, { data: "second", rest: "second" })]);
        held.release();

        const error = await rejection(first);
        assert.isTrue(isAutosaveConflict(error), String(error));
        const entry = await faults.read("a");
        assert.strictEqual(entry?.meta.gen, 2);
        assert.deepEqual(entry?.parts, { data: "second", rest: "second" });
    });

    it("passes close through to a store that has one", async () => {
        let closed = 0;
        const inner = { ...memoryAutosaveStore(), close: (): Promise<void> => Promise.resolve(void (closed += 1)) };
        await faultAutosaveStore(inner).close();
        await faultAutosaveStore(memoryAutosaveStore()).close();
        assert.strictEqual(closed, 1);
    });
});
