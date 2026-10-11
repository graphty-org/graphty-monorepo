/**
 * The loop on the scripted engine: what only an engine that streams can show, and that the loop
 * is reentrant (two messages at once, each with its own conversation).
 * @module test/ai/runConversation.test
 */

import { assert, describe, it } from "vitest";
import { z } from "zod";

import { AiStatusManager } from "../../src/ai/AiStatus";
import { CommandRegistry } from "../../src/ai/commands";
import { FakeEngine } from "../../src/ai/engine/FakeEngine";
import { type Conversation, runConversation } from "../../src/ai/runConversation";
import type { AiEvent } from "../../src/events";
import { createMessageGraph } from "../helpers/message-graph";

/** A conversation with one request in it. */
function conversation(text: string): Conversation {
    return { system: "s", messages: [{ id: "m1", role: "user", parts: [{ type: "text", origin: "reader", text }] }] };
}

/** Runs one message on an engine and collects its events. */
async function run(engine: FakeEngine, text: string, registry = new CommandRegistry(), message = "1") {
    const graph = createMessageGraph();
    const events: AiEvent[] = [];
    const conv = conversation(text);
    const result = await runConversation({
        conversation: conv,
        engine,
        tools: registry,
        graph,
        session: graph.getSession(),
        label: text,
        message,
        abort: new AbortController(),
        sink: { emit: (event) => events.push(event), status: new AiStatusManager() },
    });
    return { result, events, conv };
}

describe("runConversation", () => {
    it("sends each streamed delta on, with the text so far", async () => {
        const engine = new FakeEngine([
            [
                { type: "text", delta: "Two " },
                { type: "text", delta: "servers." },
                { type: "finish", reason: "stop" },
            ],
        ]);
        const { result, events } = await run(engine, "how many servers?");
        const chunks = events.flatMap((e) => (e.type === "ai-stream-chunk" ? [[e.text, e.accumulated]] : []));
        assert.deepStrictEqual(chunks, [
            ["Two ", "Two "],
            ["servers.", "Two servers."],
        ]);
        assert.strictEqual(result.llmText, "Two servers.");
        assert.strictEqual(result.code, "AI_COMPLETED");
    });

    it("hands each call's result back, then asks for text only once the tool rounds run out", async () => {
        const registry = new CommandRegistry();
        let ran = 0;
        registry.register({
            name: "look",
            description: "look",
            parameters: z.object({}),
            examples: [],
            execute: () => {
                ran++;
                return Promise.resolve({ success: true, message: "looked" });
            },
        });
        const call = { type: "tool-call", id: "t", name: "look", arguments: {} } as const;
        const engine = new FakeEngine(
            Array.from({ length: 6 }, () => [call, { type: "finish", reason: "tool-calls" } as const]),
        );
        const { result } = await run(engine, "look around", registry);
        // Five tool rounds run; the sixth turn may only answer, so its call does not run.
        assert.strictEqual(ran, 5);
        assert.deepStrictEqual(
            engine.requests.map((r) => r.toolMode),
            ["auto", "auto", "auto", "auto", "auto", "none"],
        );
        const last = engine.requests.at(-1);
        assert.strictEqual(last?.messages.at(-2)?.role, "tool");
        assert.strictEqual(last?.messages.at(-1)?.parts[0].type, "text");
        assert.strictEqual(result.params?.toolCalls, 5);
    });

    it("runs two messages at once, each in its own conversation", async () => {
        const first = new FakeEngine([[{ type: "text", delta: "one" }]]);
        const second = new FakeEngine([[{ type: "text", delta: "two" }]]);
        const [a, b] = await Promise.all([run(first, "first", undefined, "a"), run(second, "second", undefined, "b")]);
        assert.strictEqual(a.result.llmText, "one");
        assert.strictEqual(b.result.llmText, "two");
        assert.strictEqual(a.conv.messages.length, 1);
    });
});
