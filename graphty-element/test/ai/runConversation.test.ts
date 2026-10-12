/**
 * The loop on the scripted engine: what only an engine that streams can show, how each call's
 * result is recorded, and that the loop is reentrant (two messages at once on one session).
 * @module test/ai/runConversation.test
 */

import { assert, describe, it } from "vitest";
import { z } from "zod";

import { createGraphSession, type GraphSession } from "../../session";
import { AiStatusManager } from "../../src/ai/AiStatus";
import { CommandRegistry } from "../../src/ai/commands";
import type { CommandContext } from "../../src/ai/commands/types";
import { FakeEngine } from "../../src/ai/engine/FakeEngine";
import { type AiEngine, NO_HOSTED_TOOLS, type TurnEvent } from "../../src/ai/engine/types";
import { type Conversation, runConversation, TurnFailed } from "../../src/ai/runConversation";
import type { AiEvent } from "../../src/events";
import { createMessageGraph } from "../helpers/message-graph";

/** A conversation with one request in it. */
function conversation(text: string): Conversation {
    return { system: "s", messages: [{ id: "m1", role: "user", parts: [{ type: "text", origin: "reader", text }] }] };
}

/** Where a run happens: its graph, and the controller that cancels it. */
interface RunPlace {
    graph?: CommandContext["graph"];
    abort?: AbortController;
}

/** Runs one message on an engine and collects its events. */
async function run(
    engine: AiEngine,
    text: string,
    registry = new CommandRegistry(),
    message = "1",
    place: RunPlace = {},
) {
    const graph = place.graph ?? createMessageGraph();
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
        abort: place.abort ?? new AbortController(),
        sink: { emit: (event) => events.push(event), status: new AiStatusManager() },
    });
    return { result, events, conv };
}

/** A promise and the function that settles it. */
function gate(): { promise: Promise<void>; open: () => void } {
    let open: () => void = () => undefined;
    const promise = new Promise<void>((resolve) => {
        open = resolve;
    });
    return { promise, open };
}

/** A turn that calls one tool. */
function callTurn(id: string, name: string, args: Record<string, unknown> = {}): TurnEvent[] {
    return [
        { type: "tool-call", id, name, arguments: args },
        { type: "finish", reason: "tool-calls" },
    ];
}

/** A turn that answers in text. */
function textTurn(text: string): TurnEvent[] {
    return [
        { type: "text", delta: text },
        { type: "finish", reason: "stop" },
    ];
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
            Array.from({ length: 9 }, () => [call, { type: "finish", reason: "tool-calls" } as const]),
        );
        const { result } = await run(engine, "look around", registry);
        // Eight tool rounds run; the ninth turn may only answer, so its call does not run.
        assert.strictEqual(ran, 8);
        assert.deepStrictEqual(
            engine.requests.map((r) => r.toolMode),
            [...Array.from({ length: 8 }, () => "auto"), "none"],
        );
        const last = engine.requests.at(-1);
        assert.strictEqual(last?.messages.at(-2)?.role, "tool");
        assert.strictEqual(last?.messages.at(-1)?.parts[0].type, "text");
        assert.strictEqual(result.params?.toolCalls, 8);
    });

    it("keeps a call's provider state with it, so the next turn can send it back", async () => {
        const registry = new CommandRegistry();
        registry.register({
            name: "look",
            description: "look",
            parameters: z.object({}),
            examples: [],
            execute: () => Promise.resolve({ success: true, message: "looked" }),
        });
        const providerState = {
            engine: "provider-api",
            provider: "google",
            model: "m",
            data: { thoughtSignature: "s" },
        };
        const engine = new FakeEngine([
            [
                { type: "tool-call", id: "t1", name: "look", arguments: {}, providerState },
                { type: "finish", reason: "tool-calls" },
            ],
            textTurn("Done."),
        ]);
        await run(engine, "look", registry);
        const call = engine.requests[1].messages.flatMap((m) => m.parts).find((part) => part.type === "tool-call");
        assert.deepStrictEqual(call?.type === "tool-call" ? call.providerState : undefined, providerState);
    });

    it("records each call's own outcome: the failure, and the others rolled back with it or never run", async () => {
        const registry = new CommandRegistry();
        for (const [name, success] of [
            ["ok", true],
            ["broken", false],
            ["later", true],
        ] as const) {
            registry.register({
                name,
                description: name,
                parameters: z.object({}),
                examples: [],
                execute: () => Promise.resolve({ success, message: name }),
            });
        }

        const engine = new FakeEngine([
            [
                { type: "tool-call", id: "t1", name: "ok", arguments: {} },
                { type: "tool-call", id: "t2", name: "broken", arguments: {} },
                { type: "tool-call", id: "t3", name: "later", arguments: {} },
                { type: "finish", reason: "tool-calls" },
            ],
        ]);
        const { conv } = await run(engine, "do three things", registry);
        const results = conv.messages
            .flatMap((m) => m.parts)
            .flatMap((p) => (p.type === "tool-result" ? [[p.callId, p.code, p.params]] : []));
        // The batch is all or nothing: the failure rolls back the call before it, too.
        assert.deepStrictEqual(results, [
            ["t1", "AI_TOOL_NOT_RUN", { tool: "ok" }],
            ["t2", "AI_TOOL_FAILED", { tool: "broken", cause: "AI_TOOL_FAILED" }],
            ["t3", "AI_TOOL_NOT_RUN", { tool: "later" }],
        ]);
    });

    it("refuses a call whose arguments did not parse, without running it, and tells the model why", async () => {
        const registry = new CommandRegistry();
        let ran = 0;
        registry.register({
            name: "clearStyles",
            description: "clear",
            // Every parameter optional: run with none, it would clear everything.
            parameters: z.object({ layerName: z.string().optional() }),
            examples: [],
            execute: () => {
                ran++;
                return Promise.resolve({ success: true, message: "cleared" });
            },
        });
        const engine = new FakeEngine([
            [
                { type: "tool-call", id: "t1", name: "clearStyles", arguments: {}, invalidArguments: true },
                { type: "finish", reason: "tool-calls" },
            ],
            textTurn("Sorry, which layer?"),
        ]);
        const { result, conv } = await run(engine, "remove the red styling", registry);
        assert.strictEqual(ran, 0);
        assert.strictEqual(result.code, "AI_TOOL_INVALID_ARGUMENTS");
        const [part] = conv.messages.flatMap((m) => m.parts).filter((p) => p.type === "tool-result");
        assert.strictEqual(part.type === "tool-result" && part.code, "AI_TOOL_INVALID_ARGUMENTS");
        assert.include(part.type === "tool-result" ? part.content : "", "AI_TOOL_INVALID_ARGUMENTS");
    });

    it("runs no call of a turn whose stream stops without a finish", async () => {
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
        // The connection dropped after the first call: the batch may be cut short.
        const engine = new FakeEngine([[{ type: "tool-call", id: "t", name: "look", arguments: {} }]]);
        const error = await run(engine, "look", registry).catch((e: unknown) => e);
        assert.instanceOf(error, TurnFailed);
        assert.strictEqual(error.failure.code, "AI_PROVIDER_ERROR");
        assert.deepStrictEqual(error.failure.params, { provider: "fake" });
        assert.strictEqual(ran, 0);
    });

    it("drops an answer that arrives after a cancel, from an engine that ignores the signal", async () => {
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
        const started = gate();
        const abort = new AbortController();
        const deaf: AiEngine = {
            kind: "fake",
            providerName: "deaf",
            capabilities: () => ({ toolCalls: "available", hostedTools: NO_HOSTED_TOOLS }),
            async *turn(_request, signal) {
                started.open();
                await new Promise((resolve) => {
                    signal.addEventListener("abort", resolve);
                });
                yield* callTurn("t", "look");
            },
            checkKey: () => Promise.resolve({ code: "AI_COMPLETED", params: {} }),
            dispose: () => undefined,
        };
        const pending = run(deaf, "look", registry, "1", { abort }).catch((e: unknown) => e);
        await started.promise;
        abort.abort();
        const error = await pending;
        assert.instanceOf(error, TurnFailed);
        assert.strictEqual(error.failure.code, "AI_CANCELLED");
        assert.strictEqual(ran, 0);
    });

    it("runs two messages at once on one session, each with its own steps and results", async () => {
        const session: GraphSession = createGraphSession();
        const graph = { getSession: () => session } as unknown as CommandContext["graph"];
        const baseline = session.history.position;
        const registry = new CommandRegistry();
        registry.register({
            name: "addNode",
            description: "Adds a node",
            parameters: z.object({ id: z.string() }),
            examples: [],
            execute: async (_graph, params, context) => {
                await context?.tx.data.addNodes([{ id: String(params.id) }]);
                return { success: true, message: `added ${String(params.id)}` };
            },
        });

        // a adds a1, then waits while b adds b1 and answers, then adds a2 and answers.
        const aWaits = gate();
        const bDone = gate();
        const a = new FakeEngine([
            callTurn("a1", "addNode", { id: "a1" }),
            async function* () {
                aWaits.open();
                await bDone.promise;
                yield* callTurn("a2", "addNode", { id: "a2" });
            },
            textTurn("a done"),
        ]);
        const b = new FakeEngine([
            async function* () {
                await aWaits.promise;
                yield* callTurn("b1", "addNode", { id: "b1" });
            },
            function () {
                bDone.open();
                return textTurn("b done");
            },
        ]);

        const [ra, rb] = await Promise.all([
            run(a, "first", registry, "a", { graph }),
            run(b, "second", registry, "b", { graph }),
        ]);

        assert.strictEqual(ra.result.llmText, "a done");
        assert.strictEqual(rb.result.llmText, "b done");
        assert.strictEqual(ra.result.params?.toolCalls, 2);
        assert.strictEqual(rb.result.params?.toolCalls, 1);
        const steps = session.history.steps.slice(baseline, session.history.position);
        // b's step sits between a's two, so a's second batch is its own step, continuing a's first.
        assert.deepStrictEqual(
            steps.map((step) => [step.provenance.message, step.label, step.ops.length]),
            [
                ["a", "first", 1],
                ["b", "second", 1],
                ["a", "first", 1],
            ],
        );
        assert.strictEqual(steps[2].provenance.after, steps[0].id);
        for (const id of ["a1", "a2", "b1"]) {
            assert.exists(session.data.node(id), id);
        }
    });
});
