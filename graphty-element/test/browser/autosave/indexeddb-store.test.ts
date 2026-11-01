/**
 * The IndexedDB autosave store on a real IndexedDB: the shared store contract, a transaction
 * aborted mid-way, and a close that waits for the commit in flight.
 *
 * Runs in Chromium through the "browser" project and in Firefox and WebKit through the
 * "autosave-engines" project (vitest.config.ts). Each test uses its own database.
 */

import { assert, describe, it } from "vitest";

import { indexedDbAutosaveStore, type IndexedDbAutosaveStoreOptions } from "../../../src/autosave/indexedDbStore";
import type { AutosaveWrite } from "../../../src/autosave/types";
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

/**
 * Records, for every IndexedDB read issued while `run` runs, how many request answers it waited for
 * one after another: 0 for one issued at once, 1 for one issued once an answer of depth 0 arrived.
 * Each answer costs the page a turn of its event loop, which a page drawing a large graph in
 * software gets once per frame, seconds apart, so a commit's deepest read counts the frames it waits.
 * @param run - The work to measure.
 * @returns The deepest read.
 */
async function deepestRead(run: () => Promise<void>): Promise<number> {
    const reads = new Set(["get", "getAll", "count", "openKeyCursor", "openCursor"]);
    const patched: [object, string, unknown][] = [];
    let current = 0;
    let deepest = 0;
    for (const proto of [IDBObjectStore.prototype, IDBIndex.prototype]) {
        for (const method of ["get", "getAll", "count", "openKeyCursor", "openCursor", "put", "delete"]) {
            const original = (proto as unknown as Record<string, (...args: unknown[]) => IDBRequest>)[method];
            if (original === undefined) {
                continue;
            }
            patched.push([proto, method, original]);
            Object.defineProperty(proto, method, {
                configurable: true,
                writable: true,
                value(this: unknown, ...args: unknown[]): IDBRequest {
                    const req = original.apply(this, args);
                    const depth = current;
                    if (reads.has(method)) {
                        deepest = Math.max(deepest, depth);
                    }
                    // Added before the store's own handler, so it runs first, and the store's
                    // continuation (a microtask after both) issues its next requests at depth + 1.
                    req.addEventListener("success", () => {
                        current = depth + 1;
                    });
                    return req;
                },
            });
        }
    }
    try {
        await run();
    } finally {
        for (const [proto, method, original] of patched) {
            Object.defineProperty(proto, method, { configurable: true, writable: true, value: original });
        }
    }
    return deepest;
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
    it("a commit asks about all its large parts at once, not one after another", async () => {
        const name = databaseName();
        const store = storeFor(name);
        const big = (seed: string): AutosaveWrite["parts"] => ({
            data: largeText(`${seed} data `),
            arrangement: largeText(`${seed} arrangement `),
            rest: largeText(`${seed} rest `),
        });
        await store.commit([write("a", "k", 0, big("first"))]);
        // Three new blobs to look up, and three old ones released to look up again.
        const deepest = await deepestRead(() => store.commit([write("a", "k", 1, big("second"))]));
        // Every read the commit needs (the fence, the sequence number, the old parts, the new
        // blobs), then the released blobs: two rounds, however many large parts it carries (#2957).
        assert.isAtMost(deepest, 1, "a commit's reads asked one after another");
        assert.strictEqual(await countBlobs(name), 3, "the replaced blobs were dropped, the new ones kept");
        assert.strictEqual((await store.read("a"))?.parts.rest, largeText("second rest "));
        await store.close();
        await deleteDatabase(name);
    });

    it("a commit hashes all its large parts at once", async () => {
        const name = databaseName();
        const store = storeFor(name);
        const { subtle } = crypto;
        const original = subtle.digest.bind(subtle);
        let inFlight = 0;
        let most = 0;
        Object.defineProperty(subtle, "digest", {
            configurable: true,
            value: async (...args: Parameters<SubtleCrypto["digest"]>): Promise<ArrayBuffer> => {
                inFlight += 1;
                most = Math.max(most, inFlight);
                try {
                    return await original(...args);
                } finally {
                    inFlight -= 1;
                }
            },
        });
        try {
            await store.commit([
                write("a", "k", 0, {
                    data: largeText("data "),
                    arrangement: largeText("arrangement "),
                    rest: largeText("rest "),
                }),
            ]);
        } finally {
            delete (subtle as unknown as { digest?: unknown }).digest;
        }
        // Each digest's answer waits for a turn of the page's event loop: one after another, a
        // page drawing in software waits a frame for each (#2957).
        assert.strictEqual(most, 3, "large parts hashed one after another");
        await store.close();
        await deleteDatabase(name);
    });

    it("a read asks for the entry, its parts and all its large values in two rounds", async () => {
        const name = databaseName();
        const store = storeFor(name);
        const parts = { data: largeText("data "), arrangement: largeText("arrangement "), rest: largeText("rest ") };
        await store.commit([write("a", "k", 0, parts)]);
        let read: Awaited<ReturnType<typeof store.read>> | undefined;
        const deepest = await deepestRead(async () => {
            read = await store.read("a");
        });
        // The meta with the part records, then every large value: not one round per value (#2957).
        assert.isAtMost(deepest, 1, "a read's lookups asked one after another");
        assert.deepEqual(read?.parts, parts);
        await store.close();
        await deleteDatabase(name);
    });

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

    it("a commit queued behind another connection's transaction rejects as soon as its signal aborts", async () => {
        // WebKit delivers the abort of a queued transaction only once the one ahead of it ends, so
        // a stuck database held the commit, and every write after it, for as long as it was stuck.
        const name = databaseName();
        let queued: () => void = () => undefined;
        const transactionMade = new Promise<void>((resolve) => {
            queued = resolve;
        });
        const factory = {
            open(dbName: string, version?: number): IDBOpenDBRequest {
                const req = indexedDB.open(dbName, version);
                req.addEventListener("success", () => {
                    const db = req.result;
                    const make = db.transaction.bind(db);
                    db.transaction = ((...args: Parameters<IDBDatabase["transaction"]>) => {
                        const tx = make(...args);
                        if (args[1] === "readwrite") {
                            queued();
                        }
                        return tx;
                    }) as IDBDatabase["transaction"];
                });
                return req;
            },
        } as unknown as IDBFactory;
        const creator = storeFor(name);
        await creator.list("k"); // creates the database
        await creator.close();
        const blocker = await new Promise<IDBDatabase>((resolve, reject) => {
            const req = indexedDB.open(name);
            req.onsuccess = (): void => {
                resolve(req.result);
            };
            req.onerror = (): void => {
                reject(req.error ?? new Error("open failed"));
            };
        });
        const held = blocker.transaction(["entries", "parts", "blobs"], "readwrite");
        let holding = true;
        const spin = (): void => {
            if (holding) {
                held.objectStore("entries").count().onsuccess = spin;
            }
        };
        spin();

        const store = storeFor(name, { factory });
        const controller = new AbortController();
        const committing = rejection(store.commit([write("a", "k", 0, { rest: "r" })], { signal: controller.signal }));
        await transactionMade;
        controller.abort();
        const error = await committing;
        assert.strictEqual(error.name, "AbortError");
        assert.isTrue(holding, "the commit settled while the other transaction still held the database");

        holding = false;
        await new Promise<void>((resolve) => {
            held.oncomplete = (): void => {
                resolve();
            };
        });
        blocker.close();
        assert.isUndefined(await store.read("a"), "the aborted commit wrote nothing");
        await store.commit([write("a", "k", 0, { rest: "r" })]);
        assert.strictEqual((await store.read("a"))?.parts.rest, "r");
        await store.close();
        await deleteDatabase(name);
    });

    it("a commit whose database never opens rejects when its signal aborts, and close does not wait for the open", async () => {
        let opening: () => void = () => undefined;
        const opened = new Promise<void>((resolve) => {
            opening = resolve;
        });
        const factory = {
            open: (): IDBOpenDBRequest => {
                opening();
                return {} as IDBOpenDBRequest; // never answers, as Safari's stuck IndexedDB does
            },
        } as unknown as IDBFactory;
        const store = storeFor(databaseName(), { factory });
        const controller = new AbortController();
        const committing = rejection(store.commit([write("a", "k", 0, { rest: "r" })], { signal: controller.signal }));
        await opened;
        controller.abort();
        assert.strictEqual((await committing).name, "AbortError");
        await store.close();
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
