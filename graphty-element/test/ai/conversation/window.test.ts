/**
 * @file The history window: what of a conversation one turn shows the model. Whole exchanges,
 * newest first within the budget, only the newest facts block, and the record left untouched.
 */

import { assert, describe, it } from "vitest";

import { DEFAULT_HISTORY_BUDGET_TOKENS, historyWindow } from "../../../src/ai/conversation/Conversation";
import type { SavedMessage } from "../../../src/ai/engine/types";

/**
 * One exchange: the reader's message (with a facts block), a tool call, its result and an answer.
 * @param n - Its number, in its ids and text.
 * @param size - Characters of the tool result.
 * @returns Its messages.
 */
function exchange(n: number, size = 40): SavedMessage[] {
    return [
        {
            id: `u${n}`,
            role: "user",
            parts: [
                { type: "text", origin: "graph-data", text: `facts ${n}` },
                { type: "text", origin: "reader", text: `request ${n}` },
            ],
        },
        {
            id: `a${n}`,
            role: "assistant",
            parts: [{ type: "tool-call", origin: "model", callId: `c${n}`, command: "query", arguments: {} }],
        },
        {
            id: `t${n}`,
            role: "tool",
            parts: [
                {
                    type: "tool-result",
                    origin: "graph-data",
                    callId: `c${n}`,
                    code: "AI_COMPLETED",
                    params: {},
                    content: "x".repeat(size),
                },
            ],
        },
        { id: `r${n}`, role: "assistant", parts: [{ type: "text", origin: "model", text: `answer ${n}` }] },
    ];
}

const ids = (messages: readonly SavedMessage[]): string[] => messages.map((message) => message.id);

describe("the history window", () => {
    it("drops the oldest exchange first when the budget is short", () => {
        const messages = [...exchange(1, 400), ...exchange(2, 400), ...exchange(3, 400)];
        // Room for two exchanges of about 440 characters, not three.
        const shown = historyWindow(messages, 250);

        assert.deepEqual(ids(shown), ["u2", "a2", "t2", "r2", "u3", "a3", "t3", "r3"]);
    });

    it("never separates a tool call from its result", () => {
        const messages = [...exchange(1), ...exchange(2, 4000)];
        for (const budget of [1, 10, 100, 1000, 1010, 1100]) {
            const shown = historyWindow(messages, budget);
            const calls = shown.flatMap((m) => m.parts.flatMap((p) => (p.type === "tool-call" ? [p.callId] : [])));
            const results = shown.flatMap((m) => m.parts.flatMap((p) => (p.type === "tool-result" ? [p.callId] : [])));
            assert.deepEqual(calls, results, `budget ${budget}`);
            assert.equal(shown[0].role, "user", `budget ${budget}: starts at a reader's message`);
        }
    });

    it("always shows the newest exchange, even over budget", () => {
        const shown = historyWindow([...exchange(1), ...exchange(2, 100_000)], 10);
        assert.deepEqual(ids(shown), ["u2", "a2", "t2", "r2"]);
    });

    it("shows only the newest facts block", () => {
        const shown = historyWindow([...exchange(1), ...exchange(2), ...exchange(3)], 16000);
        const facts = shown.flatMap((m) =>
            m.parts.flatMap((p) => (p.type === "text" && p.origin === "graph-data" ? [p.text] : [])),
        );
        assert.deepEqual(facts, ["facts 3"]);
        // The reader's text of the older messages is still there.
        assert.include(JSON.stringify(shown), "request 1");
    });

    it("keeps everything in the record", () => {
        const messages = [...exchange(1, 400), ...exchange(2, 400), ...exchange(3, 400)];
        const before = structuredClone(messages);
        historyWindow(messages, 10);
        assert.deepEqual(messages, before);
    });

    it("keeps a short conversation as it is, and its unchanged messages by identity", () => {
        const messages = exchange(1);
        const shown = historyWindow(messages, DEFAULT_HISTORY_BUDGET_TOKENS.small);
        assert.deepEqual(shown, messages);
        assert.strictEqual(shown[2], messages[2]);
    });

    it("defaults to 16,000 tokens for the standard profile and 3,000 for small", () => {
        assert.deepEqual({ ...DEFAULT_HISTORY_BUDGET_TOKENS }, { standard: 16000, small: 3000 });
    });
});
