/**
 * @file What an application reads of a saved conversation: an assistant message lists the pages
 * the provider's tools found for it, as `sources`.
 */

import { readFileSync } from "node:fs";

import { assert, describe, it } from "vitest";

import { readConversation } from "../../../src/ai/conversation/formats";
import { conversationSnapshot } from "../../../src/ai/conversation/snapshot";
import type { AiRule } from "../../../src/catalog/ai";

const GOLDEN = readFileSync(new URL("fixtures/v1-every-kind.json", import.meta.url), "utf8");

describe("the conversation snapshot", () => {
    it("lists a helper's web sources under its message, and none under a message without them", () => {
        const read = readConversation(GOLDEN);
        assert.isTrue(read.ok);
        const messages = read.ok ? conversationSnapshot(read.record).messages : [];
        const research = messages.find((message) => message.id === "h5");
        assert.deepEqual(research?.role === "assistant" ? research : undefined, {
            id: "h5",
            role: "assistant",
            agent: "research",
            text: "It opened in 1889.",
            calls: [],
            sources: [
                { tool: "web-search", url: "https://en.wikipedia.org/wiki/Eiffel_Tower", title: "Eiffel Tower" },
                { tool: "web-search", url: "http://example.org/tower" },
            ],
        });
        const plain = messages.find((message) => message.id === "m2");
        assert.deepEqual(plain?.role === "assistant" ? plain.sources : undefined, []);
    });

    it("gives each call what it did, and none to a call that did nothing", () => {
        const read = readConversation(GOLDEN);
        assert.isTrue(read.ok);
        const golden = read.ok ? read.record : undefined;
        assert.isDefined(golden);
        const found = { code: "AI_EFFECT_FOUND" as const, params: { nodes: 22 }, target: { where: "degree >= `3`" } };
        const call = (callId: string): Record<string, unknown> => ({
            type: "tool-call",
            origin: "model",
            callId,
            command: "query",
            arguments: { action: "count" },
        });
        const messages = [
            { id: "u1", role: "user", parts: [{ type: "text", origin: "reader", text: "How many?" }] },
            { id: "c1", role: "assistant", parts: [call("k1"), call("k2")] },
            {
                id: "r1",
                role: "tool",
                parts: [
                    {
                        type: "tool-result",
                        origin: "graph-data",
                        callId: "k1",
                        code: "AI_COMPLETED",
                        params: {},
                        content: "{}",
                        effects: [found],
                    },
                    {
                        type: "tool-result",
                        origin: "graph-data",
                        callId: "k2",
                        code: "AI_COMPLETED",
                        params: {},
                        content: "{}",
                    },
                ],
            },
        ];
        const record = { ...golden, messages, pending: [] } as unknown as NonNullable<typeof golden>;
        const reply = conversationSnapshot(record).messages.find((message) => message.id === "c1");
        const calls = reply?.role === "assistant" ? reply.calls : [];
        // Its rule comes in parts too, for an application to word.
        const rule: AiRule = { join: "all", terms: [{ column: "degree", op: ">=", values: [3] }] };
        assert.deepEqual(calls[0]?.effects, [{ ...found, rule }]);
        assert.notProperty(calls[1], "effects");
    });

    describe("words said while a request waited on the reader", () => {
        const read = readConversation(GOLDEN);
        const golden = read.ok ? read.record : undefined;
        const asked = { id: "u1", role: "user", parts: [{ type: "text", origin: "reader", text: "Delete it all" }] };
        const held = {
            id: "c1",
            role: "assistant",
            parts: [
                {
                    type: "tool-call",
                    origin: "model",
                    callId: "k1",
                    command: "edit_data",
                    arguments: { action: "delete_all" },
                },
            ],
        };
        const waiting = {
            id: "w1",
            role: "assistant",
            parts: [{ type: "text", origin: "model", text: "It waits for your approval." }],
        };
        const result = {
            id: "r1",
            role: "tool",
            parts: [
                { type: "tool-result", origin: "graph-data", callId: "k1", code: "AI_OK", params: {}, content: "{}" },
            ],
        };
        const done = {
            id: "d1",
            role: "assistant",
            parts: [{ type: "text", origin: "model", text: "Deleted it all." }],
        };
        const approval = golden?.pending.find((entry) => entry.kind === "approval");
        const snapshotOf = (messages: unknown[], claim: string | null | "none"): Record<string, unknown> => {
            assert.isDefined(golden);
            assert.isDefined(approval);
            const pending = claim === "none" ? [] : [{ ...approval, messageId: "c1", claim }];
            const record = { ...golden, messages, pending } as unknown as NonNullable<typeof golden>;
            return Object.fromEntries(
                conversationSnapshot(record).messages.map((message) => [
                    message.id,
                    message.role === "assistant" ? message.saidWhileHeld : undefined,
                ]),
            );
        };

        it("are not marked while the request still waits", () => {
            assert.isUndefined(snapshotOf([asked, held, waiting], null).w1);
        });

        it("are marked once the request is claimed to run, before its results are saved", () => {
            assert.isTrue(snapshotOf([asked, held, waiting], "tab-1").w1);
        });

        it("are marked once the decision's results are saved, and the reply after them is not", () => {
            const marks = snapshotOf([asked, held, waiting, result, done], "none");
            assert.isTrue(marks.w1);
            assert.isUndefined(marks.d1);
        });

        it("leave a reply that followed its results at once unmarked", () => {
            assert.isUndefined(snapshotOf([asked, held, result, done], "none").d1);
        });
    });
});
