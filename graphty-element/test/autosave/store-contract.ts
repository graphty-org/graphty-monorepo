/**
 * The contract every `AutosaveStore` keeps, written once and run against each store: the memory
 * store and the fault wrapper in Node (test/autosave/), the IndexedDB store in Chromium, Firefox
 * and WebKit (test/browser/autosave/).
 */

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import {
    type AutosaveEntryMeta,
    type AutosaveStore,
    type AutosaveWrite,
    isAutosaveConflict,
} from "../../src/autosave/types";

/** A store to test, and how to clean up after it. */
export interface StoreUnderTest {
    readonly store: AutosaveStore;
    /** How many shared large values the store holds, for a store that shares them. */
    readonly blobCount?: () => Promise<number>;
    dispose(): Promise<void>;
}

/** A value long enough to count as a large part (over 1 MB) in every store that shares them. */
export function largeText(seed: string): string {
    return seed.repeat(Math.ceil((1.5 * 1024 * 1024) / seed.length));
}

function meta(id: string, key: string, extra: Record<string, unknown> = {}): AutosaveEntryMeta {
    return { id, key, gen: 0, seq: 0, ...extra };
}

/** A write of `parts` to entry `id` of `key`, expecting `expectedGen`. */
export function write(
    id: string,
    key: string,
    expectedGen: number,
    parts: AutosaveWrite["parts"],
    extra: Record<string, unknown> = {},
): AutosaveWrite {
    return { id, expectedGen, meta: meta(id, key, extra), parts };
}

async function rejection(promise: Promise<unknown>): Promise<unknown> {
    try {
        await promise;
    } catch (error) {
        return error;
    }
    throw new Error("expected the promise to reject");
}

/**
 * Registers the contract suite.
 * @param label - the store's name in the test titles
 * @param make - builds a fresh, empty store for one test
 */
export function describeAutosaveStoreContract(label: string, make: () => Promise<StoreUnderTest>): void {
    describe(`AutosaveStore contract: ${label}`, () => {
        let subject: StoreUnderTest;
        let store: AutosaveStore;

        beforeEach(async () => {
            subject = await make();
            ({ store } = subject);
        });

        afterEach(async () => {
            await subject.dispose();
        });

        it("starts empty", async () => {
            assert.deepEqual(await store.list("k"), []);
            assert.isUndefined(await store.read("nope"));
        });

        it("stores a new entry with gen 1, a seq, its opaque fields and its parts", async () => {
            const bytes = new Uint8Array([1, 2, 3, 250]);
            await store.commit([write("a", "k", 0, { data: "D", bin: bytes }, { revision: 7, nested: { x: [1, 2] } })]);
            bytes[0] = 99; // a caller changing its bytes later does not change the store

            const entry = await store.read("a");
            assert.isDefined(entry);
            assert.strictEqual(entry.meta.id, "a");
            assert.strictEqual(entry.meta.key, "k");
            assert.strictEqual(entry.meta.gen, 1);
            assert.isAbove(entry.meta.seq, 0);
            assert.strictEqual(entry.meta.revision, 7);
            assert.deepEqual(entry.meta.nested, { x: [1, 2] });
            assert.strictEqual(entry.parts.data, "D");
            assert.deepEqual([...(entry.parts.bin as Uint8Array)], [1, 2, 3, 250]);
        });

        it("commits several entries atomically: one stale fence writes none of them", async () => {
            await store.commit([write("b", "k", 0, { rest: "b1" })]);

            const error = await rejection(
                store.commit([write("a", "k", 0, { rest: "a1" }), write("b", "k", 0, { rest: "b2" })]),
            );
            assert.isTrue(isAutosaveConflict(error), String(error));

            assert.isUndefined(await store.read("a"));
            const b = await store.read("b");
            assert.strictEqual(b?.meta.gen, 1);
            assert.strictEqual(b?.parts.rest, "b1");
            assert.deepEqual(
                (await store.list("k")).map((m) => m.id),
                ["b"],
            );
        });

        it("commits several entries together when every fence holds", async () => {
            await store.commit([write("old", "k", 0, { rest: "o" })]);
            await store.commit([
                write("new", "k", 0, { rest: "n" }),
                write("old", "k", 1, { rest: "o2" }, { ended: "replaced" }),
            ]);
            const old = await store.read("old");
            assert.strictEqual(old?.meta.gen, 2);
            assert.strictEqual(old?.meta.ended, "replaced");
            assert.strictEqual((await store.read("new"))?.parts.rest, "n");
        });

        it("rejects a write whose expected gen is stale, and keeps the stored commit", async () => {
            await store.commit([write("a", "k", 0, { data: "first", rest: "first" })]);
            await store.commit([write("a", "k", 1, { rest: "second" })]);

            for (const stale of [0, 1, 3]) {
                const error = await rejection(store.commit([write("a", "k", stale, { data: "x", rest: "x" })]));
                assert.isTrue(isAutosaveConflict(error), String(error));
                if (isAutosaveConflict(error)) {
                    assert.strictEqual(error.id, "a");
                    assert.strictEqual(error.expectedGen, stale);
                    assert.strictEqual(error.storedGen, 2);
                }
            }

            const entry = await store.read("a");
            assert.strictEqual(entry?.meta.gen, 2);
            assert.strictEqual(entry?.parts.data, "first");
            assert.strictEqual(entry?.parts.rest, "second");
        });

        it("assigns seq inside each commit, increasing per key, and lists by key oldest first", async () => {
            await store.commit([write("a", "k", 0, { rest: "1" })]);
            await store.commit([write("b", "k", 0, { rest: "1" })]);
            await store.commit([write("other", "elsewhere", 0, { rest: "1" })]);
            await store.commit([write("a", "k", 1, { rest: "2" })]);
            await store.commit([write("c", "k", 0, { rest: "1" }), write("d", "k", 0, { rest: "1" })]);

            const listed = await store.list("k");
            assert.deepEqual(
                listed.map((m) => m.id),
                ["b", "a", "c", "d"],
            );
            for (let i = 1; i < listed.length; i++) {
                assert.isAbove(listed[i].seq, listed[i - 1].seq);
            }
            assert.deepEqual(
                (await store.list("elsewhere")).map((m) => m.id),
                ["other"],
            );
        });

        it("removes a part written as null and keeps every part not named, known or not", async () => {
            await store.commit([write("a", "k", 0, { data: "d", rest: "r", "x-future-part": "kept" })]);
            await store.commit([write("a", "k", 1, { data: null, rest: "r2" })]);

            const entry = await store.read("a");
            assert.deepEqual(entry?.parts, { rest: "r2", "x-future-part": "kept" });
        });

        it("removes an entry with its parts, and ignores a missing one", async () => {
            await store.commit([write("a", "k", 0, { data: "d" }), write("b", "k", 0, { data: "d" })]);
            await store.remove("a");
            await store.remove("never-existed");

            assert.isUndefined(await store.read("a"));
            assert.deepEqual(
                (await store.list("k")).map((m) => m.id),
                ["b"],
            );
            // A new entry under the removed id starts from gen 0 again.
            await store.commit([write("a", "k", 0, { rest: "again" })]);
            assert.deepEqual((await store.read("a"))?.parts, { rest: "again" });
        });

        it("writes nothing for a commit whose signal was already aborted", async () => {
            const controller = new AbortController();
            controller.abort();
            const error = await rejection(
                store.commit([write("a", "k", 0, { rest: "r" })], { signal: controller.signal }),
            );
            assert.strictEqual((error as Error).name, "AbortError");
            assert.isUndefined(await store.read("a"));
        });

        it("accepts strict durability", async () => {
            await store.commit([write("a", "k", 0, { rest: "r" })], { durability: "strict" });
            assert.strictEqual((await store.read("a"))?.parts.rest, "r");
        });

        it("shares a large part between entries and deletes it with its last reference", async (context) => {
            const { blobCount } = subject;
            if (blobCount === undefined) {
                context.skip();
                return;
            }
            const big = largeText("graph ");
            const otherBig = largeText("other ");

            await store.commit([write("a", "k", 0, { data: big }), write("b", "k", 0, { data: big })]);
            assert.strictEqual(await blobCount(), 1);
            assert.strictEqual((await store.read("a"))?.parts.data, big);
            assert.strictEqual((await store.read("b"))?.parts.data, big);

            // Rewriting the same value keeps its one copy.
            await store.commit([write("a", "k", 1, { data: big })]);
            assert.strictEqual(await blobCount(), 1);

            // Text and bytes are different values even when the bytes match.
            const bytes = new TextEncoder().encode(big);
            await store.commit([write("c", "k", 0, { data: bytes, alt: otherBig })]);
            assert.strictEqual(await blobCount(), 3);
            assert.deepEqual((await store.read("c"))?.parts.data, bytes);

            await store.commit([write("a", "k", 2, { data: "small" })]);
            assert.strictEqual(await blobCount(), 3, "b still refers to it");
            await store.remove("b");
            assert.strictEqual(await blobCount(), 2);
            await store.commit([write("c", "k", 1, { alt: null })]);
            assert.strictEqual(await blobCount(), 1);
            await store.remove("c");
            assert.strictEqual(await blobCount(), 0);
            assert.strictEqual((await store.read("a"))?.parts.data, "small");
        });
    });
}
