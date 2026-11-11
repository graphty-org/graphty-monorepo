/**
 * @file The IndexedDB conversation store in Chromium's real IndexedDB: two instances on one
 * database never lose each other's messages, one claim of an entry wins, the other instance hears
 * of a change, and the two failures (IndexedDB cannot open, a write fails) each give their code
 * and leave a working store.
 */

import { afterEach, assert, describe, it, vi } from "vitest";

import {
    type ConversationStore,
    type ConversationStoreChange,
    openConversationStore,
} from "../../../src/ai/conversation/Conversation";
import type { ConversationRecord } from "../../../src/ai/conversation/formats";
import { MemoryStore } from "../../../src/ai/conversation/MemoryStore";
import type { SavedMessage } from "../../../src/ai/engine/types";

let databases = 0;
const opened: ConversationStore[] = [];
const names: string[] = [];

/**
 * A fresh database's name, deleted after the test.
 * @returns The name.
 */
function databaseName(): string {
    const name = `graphty-ai-test-${crypto.randomUUID()}-${++databases}`;
    names.push(name);
    return name;
}

/**
 * Open a store on a database, closed after the test.
 * @param database - The database.
 * @returns The store and the failure, if any.
 */
async function open(database: string): Promise<Awaited<ReturnType<typeof openConversationStore>>> {
    const result = await openConversationStore({ store: "browser", database });
    opened.push(result.store);
    return result;
}

/**
 * A reader's message.
 * @param id - Its id.
 * @returns The message.
 */
function message(id: string): SavedMessage {
    return { id, role: "user", parts: [{ type: "text", origin: "reader", text: id }] };
}

/**
 * A record with one approval waiting.
 * @returns The record.
 */
function record(): ConversationRecord {
    return {
        format: "graphty-ai-conversation",
        version: 1,
        revision: 0,
        id: "c1",
        key: "g:/",
        createdAt: "2026-10-11T09:00:00.000Z",
        updatedAt: "2026-10-11T09:00:00.000Z",
        graph: { dataKey: null, fingerprint: "f1" },
        messages: [message("m1")],
        pending: [
            {
                kind: "approval",
                id: "p1",
                messageId: "m1",
                gate: "large",
                calls: [{ callId: "t1", command: "removeNodes", arguments: {} }],
                preview: {},
                graph: { dataKey: null, fingerprint: "f1", nodes: 1, edges: 0 },
                historyRevision: 0,
                claim: null,
                createdAt: "2026-10-11T09:00:00.000Z",
            },
        ],
    };
}

/**
 * The next change a store tells its listeners of.
 * @param store - The store.
 * @returns The change.
 */
function nextChange(store: ConversationStore): Promise<ConversationStoreChange> {
    return new Promise((resolve) => {
        const stop = store.subscribe((change) => {
            stop();
            resolve(change);
        });
    });
}

afterEach(async () => {
    vi.restoreAllMocks();
    for (const store of opened.splice(0)) {
        store.close();
    }

    await Promise.all(
        names.splice(0).map(
            (name) =>
                new Promise<void>((resolve) => {
                    const request = indexedDB.deleteDatabase(name);
                    request.onsuccess = () => resolve();
                    request.onerror = () => resolve();
                }),
        ),
    );
});

describe("the IndexedDB conversation store", () => {
    it("keeps both messages when two instances append to one conversation", async () => {
        const database = databaseName();
        const a = (await open(database)).store;
        const b = (await open(database)).store;
        assert.notInstanceOf(a, MemoryStore);

        await a.save(record());
        const loadedA = (await a.load("c1"))!;
        const loadedB = (await b.load("c1"))!;
        await Promise.all([
            a.save({ ...loadedA, messages: [...loadedA.messages, message("from-a")] }),
            b.save({ ...loadedB, messages: [...loadedB.messages, message("from-b")] }),
        ]);

        // A third instance reads what is on disk.
        const stored = (await (await open(database)).store.load("c1"))!;
        assert.sameMembers(
            stored.messages.map((m) => m.id),
            ["m1", "from-a", "from-b"],
        );
        assert.equal(stored.revision, 3);
    });

    it("lets exactly one of two claims of one entry win", async () => {
        const database = databaseName();
        const a = (await open(database)).store;
        const b = (await open(database)).store;
        await a.save(record());

        const [byA, byB] = await Promise.all([a.claim("c1", "p1", "a"), b.claim("c1", "p1", "b")]);
        const winners = [byA, byB].filter((r) => r !== undefined);

        assert.lengthOf(winners, 1);
        const stored = (await a.load("c1"))!;
        assert.equal(stored.pending[0].claim, winners[0]?.pending[0].claim);
    });

    it("tells the other instance which conversation changed", async () => {
        const database = databaseName();
        const a = (await open(database)).store;
        const b = (await open(database)).store;
        const heard = nextChange(b);

        await a.save(record());

        assert.deepEqual(await heard, { conversationId: "c1" });
        assert.equal((await b.load("c1"))?.revision, 1);
    });

    it("falls back to memory with AI_HISTORY_UNAVAILABLE when IndexedDB cannot open", async () => {
        vi.spyOn(indexedDB, "open").mockImplementation(() => {
            const request = {} as IDBOpenDBRequest;
            queueMicrotask(() => request.onblocked?.call(request, new Event("blocked") as IDBVersionChangeEvent));
            return request;
        });

        const { store, failure } = await open(databaseName());

        assert.instanceOf(store, MemoryStore);
        assert.deepEqual(failure, { code: "AI_HISTORY_UNAVAILABLE", params: { reason: "storage-unavailable" } });
        assert.equal((await store.save(record())).revision, 1);
    });

    it("reports AI_STORAGE_FAILED when a write fails, and the next save works in memory", async () => {
        const { store } = await open(databaseName());
        await store.save(record());
        const failed = nextChange(store);
        const put = vi.spyOn(IDBObjectStore.prototype, "put").mockImplementation(() => {
            throw new DOMException("quota", "QuotaExceededError");
        });

        const loaded = (await store.load("c1"))!;
        const saved = await store.save({ ...loaded, messages: [...loaded.messages, message("m2")] });

        assert.deepEqual(await failed, { code: "AI_STORAGE_FAILED", params: { reason: "QuotaExceededError" } });
        assert.deepEqual(
            saved.messages.map((m) => m.id),
            ["m1", "m2"],
        );

        put.mockClear();
        const next = await store.save({ ...saved, messages: [...saved.messages, message("m3")] });
        assert.deepEqual(
            next.messages.map((m) => m.id),
            ["m1", "m2", "m3"],
        );
        assert.deepEqual(
            (await store.load("c1"))?.messages.map((m) => m.id),
            ["m1", "m2", "m3"],
        );
        assert.equal(put.mock.calls.length, 0, "the next save stays in memory");
    });

    it("keeps every earlier conversation, and its waiting entry, after a write fails", async () => {
        const { store } = await open(databaseName());
        await store.save(record());
        await store.save({ ...record(), id: "c2", pending: [] });
        vi.spyOn(IDBObjectStore.prototype, "put").mockImplementation(() => {
            throw new DOMException("quota", "QuotaExceededError");
        });

        await store.save({ ...record(), id: "c3", pending: [] });

        assert.sameMembers(
            (await store.list()).map((r) => r.id),
            ["c1", "c2", "c3"],
        );
        assert.equal((await store.claim("c1", "p1", "a"))?.pending[0].claim, "a", "a claim still works");
        assert.isUndefined(await store.claim("c1", "p1", "b"), "and is still exclusive here");
    });

    it("does not bring back a conversation another instance deleted", async () => {
        const database = databaseName();
        const a = (await open(database)).store;
        const b = (await open(database)).store;
        const saved = await a.save(record());
        const copy = (await b.load("c1"))!;

        await a.clear();
        const late = b.save({ ...copy, messages: [...copy.messages, message("late")] });

        const error = await late.then(
            () => undefined,
            (thrown: unknown) => thrown,
        );
        assert.instanceOf(error, DOMException);
        assert.equal(error.name, "NotFoundError");
        assert.isUndefined(await a.load("c1"));
        assert.deepEqual(await a.list(), []);
        // A new conversation (never saved) is still created.
        assert.equal((await b.save({ ...record(), id: "c9", revision: 0 })).revision, 1);
        assert.equal(saved.revision, 1);
    });

    it("answers reads with a code, not a throw, once another tab closed its connection", async () => {
        const database = databaseName();
        const { store } = await open(database);
        await store.save(record());
        const failed = nextChange(store);

        // A newer version opened elsewhere closes this store's connection (onversionchange).
        const newer = await new Promise<IDBDatabase>((resolve, reject) => {
            const request = indexedDB.open(database, 2);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error ?? new Error("open failed"));
        });
        newer.close();

        assert.deepEqual(await store.list(), []);
        assert.isUndefined(await store.load("c1"));
        const change = await failed;
        assert.equal(change.code, "AI_STORAGE_FAILED");
        assert.equal(change.params?.reason, "InvalidStateError");
    });

    it("keeps a configured key out of what it writes", async () => {
        const database = databaseName();
        const result = await openConversationStore({ store: "browser", database, secrets: () => ["sk-secret-123"] });
        opened.push(result.store);
        await result.store.save({ ...record(), messages: [message("my key is sk-secret-123")] });

        assert.notInclude(JSON.stringify(await result.store.load("c1")), "sk-secret-123");
    });
});
