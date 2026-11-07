/**
 * @file The memory conversation store, the save and claim rules every store shares, and the
 * reopen scope.
 */

import { assert, describe, it } from "vitest";

import { openConversationStore } from "../../../src/ai/conversation/Conversation";
import type { ConversationRecord } from "../../../src/ai/conversation/formats";
import { MemoryStore } from "../../../src/ai/conversation/MemoryStore";
import { conversationToReopen, defaultConversationKey } from "../../../src/ai/conversation/scope";
import type { SavedMessage } from "../../../src/ai/engine/types";

/**
 * A record with one approval waiting.
 * @param overrides - Fields to change.
 * @returns The record.
 */
function record(overrides: Partial<ConversationRecord> = {}): ConversationRecord {
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
        ...overrides,
    };
}

/**
 * A reader's message.
 * @param id - Its id.
 * @returns The message.
 */
function message(id: string): SavedMessage {
    return { id, role: "user", parts: [{ type: "text", origin: "reader", text: id }] };
}

describe("the memory store", () => {
    it("saves, loads, lists by key newest first, deletes and clears", async () => {
        const store = new MemoryStore();
        await store.save(record({ id: "old", updatedAt: "2026-10-11T09:00:00.000Z" }));
        await store.save(record({ id: "new", updatedAt: "2026-10-11T10:00:00.000Z" }));
        await store.save(record({ id: "other", key: "h:/" }));

        assert.deepEqual(
            (await store.list("g:/")).map((r) => r.id),
            ["new", "old"],
        );
        assert.lengthOf(await store.list(), 3);
        assert.equal((await store.load("old"))?.id, "old");

        await store.delete("old");
        assert.isUndefined(await store.load("old"));
        await store.clear();
        assert.deepEqual(await store.list(), []);
    });

    it("bumps the revision on every save, and keeps copies", async () => {
        const store = new MemoryStore();
        const first = await store.save(record());
        assert.equal(first.revision, 1);
        (first.messages as SavedMessage[]).push(message("not-saved"));
        const second = await store.save({ ...(await store.load("c1"))!, messages: [message("m1"), message("m2")] });
        assert.equal(second.revision, 2);
        assert.deepEqual(
            (await store.load("c1"))?.messages.map((m) => m.id),
            ["m1", "m2"],
        );
    });

    it("merges a save from a stale copy, keeping both messages", async () => {
        const store = new MemoryStore();
        const loaded = await store.save(record());
        // Two copies loaded at the same revision each append a message.
        await store.save({ ...loaded, messages: [...loaded.messages, message("from-a")] });
        const merged = await store.save({ ...loaded, messages: [...loaded.messages, message("from-b")] });

        assert.deepEqual(
            merged.messages.map((m) => m.id),
            ["m1", "from-a", "from-b"],
        );
        assert.equal(merged.revision, 3);
    });

    it("lets exactly one of two claims win, and a stale save keeps the claim", async () => {
        const store = new MemoryStore();
        const loaded = await store.save(record());
        const [a, b] = await Promise.all([store.claim("c1", "p1", "a"), store.claim("c1", "p1", "b")]);

        assert.equal([a, b].filter((r) => r !== undefined).length, 1);
        assert.equal(a?.pending[0].claim, "a");
        assert.isUndefined(await store.claim("c1", "missing", "a"));
        assert.isUndefined(await store.claim("missing", "p1", "a"));

        const saved = await store.save({ ...loaded, messages: [...loaded.messages, message("m2")] });
        assert.equal(saved.pending[0].claim, "a");
    });

    it("is what openConversationStore gives for memory", async () => {
        const opened = await openConversationStore({ store: "memory" });
        assert.instanceOf(opened.store, MemoryStore);
        assert.isUndefined(opened.failure);
    });
});

describe("the conversation scope", () => {
    it("is the element's id and the page's path by default", () => {
        assert.equal(defaultConversationKey("graph-1", "/explore"), "graph-1:/explore");
    });

    it("reopens the newest of the key whose dataKey, else fingerprint, matches", () => {
        const records = [
            record({
                id: "fp-old",
                updatedAt: "2026-10-11T08:00:00.000Z",
                graph: { dataKey: null, fingerprint: "f1" },
            }),
            record({
                id: "fp-new",
                updatedAt: "2026-10-11T09:00:00.000Z",
                graph: { dataKey: null, fingerprint: "f1" },
            }),
            record({
                id: "dk",
                updatedAt: "2026-10-11T07:00:00.000Z",
                graph: { dataKey: "les-mis", fingerprint: "f0" },
            }),
            record({
                id: "other-key",
                key: "h:/",
                updatedAt: "2026-10-11T10:00:00.000Z",
                graph: { dataKey: "les-mis", fingerprint: "f1" },
            }),
        ];

        assert.equal(conversationToReopen(records, "g:/", { dataKey: "les-mis", fingerprint: "f1" })?.id, "dk");
        assert.equal(conversationToReopen(records, "g:/", { dataKey: "unknown", fingerprint: "f1" })?.id, "fp-new");
        assert.equal(conversationToReopen(records, "g:/", { fingerprint: "f1" })?.id, "fp-new");
        assert.isUndefined(conversationToReopen(records, "g:/", { fingerprint: "f9" }));
    });
});
