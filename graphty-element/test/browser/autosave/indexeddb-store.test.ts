/**
 * The IndexedDB autosave store on a real IndexedDB: the shared store contract, a transaction
 * aborted mid-way, and a close that waits for the commit in flight.
 *
 * Runs in Chromium through the "browser" project and in Firefox and WebKit through the
 * "autosave-engines" project (vitest.config.ts). Each test uses its own database.
 */

import { assert, describe, it } from "vitest";

import { indexedDbAutosaveStore, type IndexedDbAutosaveStoreOptions } from "../../../src/autosave/indexedDbStore";
import { describeAutosaveStoreContract, largeText, write } from "../../autosave/store-contract";

let databases = 0;

function databaseName(): string {
    databases += 1;
    return `graphty-autosave-test-${crypto.randomUUID()}-${databases}`;
}

function deleteDatabase(name: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.deleteDatabase(name);
        req.onsuccess = (): void => {
            resolve();
        };
        req.onerror = (): void => {
            reject(req.error ?? new Error(`could not delete ${name}`));
        };
    });
}

/** Counts the records of the `blobs` store through a connection of its own. */
function countBlobs(name: string): Promise<number> {
    return new Promise((resolve, reject) => {
        const open = indexedDB.open(name);
        open.onerror = (): void => {
            reject(open.error ?? new Error("open failed"));
        };
        open.onsuccess = (): void => {
            const db = open.result;
            const count = db.transaction("blobs", "readonly").objectStore("blobs").count();
            count.onsuccess = (): void => {
                db.close();
                resolve(count.result);
            };
            count.onerror = (): void => {
                db.close();
                reject(count.error ?? new Error("count failed"));
            };
        };
    });
}

function storeFor(
    name: string,
    options: Omit<IndexedDbAutosaveStoreOptions, "name"> = {},
): ReturnType<typeof indexedDbAutosaveStore> {
    return indexedDbAutosaveStore({ ...options, name });
}

async function rejection(promise: Promise<unknown>): Promise<Error> {
    try {
        await promise;
    } catch (error) {
        return error as Error;
    }
    throw new Error("expected the promise to reject");
}

describeAutosaveStoreContract("IndexedDB", () => {
    const name = databaseName();
    const store = storeFor(name);
    return Promise.resolve({
        store,
        blobCount: () => countBlobs(name),
        async dispose(): Promise<void> {
            await store.close();
            await deleteDatabase(name);
        },
    });
});

describe("IndexedDB autosave store on a real database", () => {
    it("a transaction aborted mid-way leaves the previous commit whole", async () => {
        const name = databaseName();
        let abortNext = false;
        const store = storeFor(name, {
            beforeCommitEnds: (tx) => {
                if (abortNext) {
                    tx.abort();
                }
            },
        });
        const big = largeText("first ");
        await store.commit([write("a", "k", 0, { data: big, rest: "r1", arrangement: "p1" }, { revision: 1 })]);

        abortNext = true;
        const error = await rejection(
            store.commit([
                write("a", "k", 1, { data: largeText("second "), rest: "r2", arrangement: null }, { revision: 2 }),
                write("b", "k", 0, { rest: "new entry" }),
            ]),
        );
        assert.strictEqual(error.name, "AbortError");
        await store.close();

        // Read through a fresh connection: what is on disk, not what one connection remembers.
        const reopened = storeFor(name);
        const entry = await reopened.read("a");
        assert.strictEqual(entry?.meta.gen, 1);
        assert.strictEqual(entry?.meta.revision, 1);
        assert.deepEqual(Object.keys(entry?.parts ?? {}).sort(), ["arrangement", "data", "rest"]);
        assert.strictEqual(entry?.parts.data, big);
        assert.strictEqual(entry?.parts.rest, "r1");
        assert.strictEqual(entry?.parts.arrangement, "p1");
        assert.isUndefined(await reopened.read("b"));
        assert.strictEqual(await countBlobs(name), 1, "the aborted commit's blob was not kept");

        // The entry goes on from where it was.
        await reopened.commit([write("a", "k", 1, { rest: "r2" })]);
        assert.strictEqual((await reopened.read("a"))?.meta.gen, 2);
        await reopened.close();
        await deleteDatabase(name);
    });

    it("a signal aborted while the transaction runs rejects with AbortError and writes nothing", async () => {
        const name = databaseName();
        const controller = new AbortController();
        const store = storeFor(name, {
            beforeCommitEnds: () => {
                controller.abort();
            },
        });
        const error = await rejection(store.commit([write("a", "k", 0, { rest: "r" })], { signal: controller.signal }));
        assert.strictEqual(error.name, "AbortError");
        assert.isUndefined(await store.read("a"));
        await store.close();
        await deleteDatabase(name);
    });

    it("close waits for an in-flight commit to complete", async () => {
        const name = databaseName();
        const store = storeFor(name);
        await store.list("k"); // open the connection first, as a visible page does
        const order: string[] = [];
        const parts = { data: largeText("data "), arrangement: largeText("arrangement "), rest: "r" };

        const committing = store.commit([write("a", "k", 0, parts)]).then(() => order.push("committed"));
        const closing = store.close().then(() => order.push("closed"));
        await Promise.all([committing, closing]);
        assert.deepEqual(order, ["committed", "closed"]);

        const reopened = storeFor(name);
        const entry = await reopened.read("a");
        assert.strictEqual(entry?.meta.gen, 1);
        assert.strictEqual(entry?.parts.data, parts.data);
        assert.strictEqual(entry?.parts.arrangement, parts.arrangement);
        await reopened.close();
        await deleteDatabase(name);
    });

    it("reopens lazily after close", async () => {
        const name = databaseName();
        const store = storeFor(name);
        await store.commit([write("a", "k", 0, { rest: "r" })]);
        await store.close();
        await store.commit([write("a", "k", 1, { rest: "r2" })]);
        assert.strictEqual((await store.read("a"))?.parts.rest, "r2");
        await store.close();
        await deleteDatabase(name);
    });

    it("steps aside when another page deletes the database, and opens it again on next use", async () => {
        const name = databaseName();
        const store = storeFor(name);
        await store.commit([write("a", "k", 0, { rest: "r" })]);
        // deleteDatabase is blocked until every connection closes: versionchange must close ours.
        await deleteDatabase(name);
        assert.isUndefined(await store.read("a"));
        await store.close();
        await deleteDatabase(name);
    });
});
