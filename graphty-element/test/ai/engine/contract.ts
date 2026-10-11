/**
 * The engine contract: what every `AiEngine` must do, run against each engine through a fixture
 * that can script its model. The Node project runs it in contract.test.ts, the browser project in
 * test/browser/ai-engine-contract.test.ts. Milestone 2 adds the provider-API engine, over recorded
 * provider responses.
 * @module test/ai/engine/contract
 */

import { assert, describe, it } from "vitest";
import { z } from "zod";

import { FakeEngine } from "../../../src/ai/engine/FakeEngine";
import { LlmProviderEngine } from "../../../src/ai/engine/LlmProviderEngine";
import type { AiEngine, SavedMessage, ToolSpec, TurnEvent, TurnRequest } from "../../../src/ai/engine/types";
import { MockLlmProvider } from "../../../src/ai/providers/MockLlmProvider";
import type { LlmResponse, Message, ToolDefinition } from "../../../src/ai/providers/types";

/** What one scripted turn answers. */
interface Answer {
    text?: string;
    toolCalls?: { id: string; name: string; arguments: Record<string, unknown> }[];
    usage?: { input: number; output: number };
}

/** One message as the model saw it, the same for every engine. */
interface SeenMessage {
    role: string;
    text?: string;
    calls?: string[];
    resultFor?: string;
}

/** One request as the model saw it. */
interface SeenRequest {
    system: string;
    messages: SeenMessage[];
    tools: string[];
    toolMode: string;
}

/** An engine, and a way to script and watch its model. */
export interface EngineFixture {
    readonly engine: AiEngine;
    /** The next turn answers this. */
    reply(answer: Answer): void;
    /** The next turn fails the way a provider answering this HTTP status does. */
    fail(status: number): void;
    /** The next turn waits until its signal fires. */
    hang(): void;
    /** Every request the model received, in order. */
    seen(): SeenRequest[];
}

/** A promise that settles when the signal fires. */
function aborted(signal: AbortSignal): Promise<never> {
    return new Promise((_, reject) => {
        signal.addEventListener("abort", () => {
            reject(new Error("Request was aborted"));
        });
    });
}

/** A `FakeEngine`, scripted with turn events. */
export function fakeFixture(): EngineFixture {
    const engine = new FakeEngine();
    return {
        engine,
        reply: (answer) => {
            engine.push([
                ...(answer.text ? [{ type: "text" as const, delta: answer.text }] : []),
                ...(answer.toolCalls ?? []).map((call) => ({ type: "tool-call" as const, ...call })),
                ...(answer.usage
                    ? [{ type: "usage" as const, inputTokens: answer.usage.input, outputTokens: answer.usage.output }]
                    : []),
                { type: "finish", reason: answer.toolCalls?.length ? "tool-calls" : "stop" },
            ]);
        },
        fail: (status) => {
            const cause = Object.assign(new Error(`HTTP ${status}`), { statusCode: status });
            engine.push([
                status === 401 || status === 403
                    ? { type: "error", code: "AI_KEY_REJECTED", params: { provider: "fake", status }, cause }
                    : { type: "error", code: "AI_PROVIDER_ERROR", params: { provider: "fake", status }, cause },
            ]);
        },
        hang: () => {
            engine.push(async function* (_request, signal) {
                await aborted(signal).catch(() => undefined);
                yield* [];
            });
        },
        seen: () =>
            engine.requests.map((request) => ({
                system: request.system,
                messages: request.messages.flatMap(seenMessages),
                tools: request.tools.map((tool) => tool.name),
                toolMode: request.toolMode,
            })),
    };
}

/** A saved message as the model saw it: one entry per tool result, as a provider's messages have. */
function seenMessages(message: SavedMessage): SeenMessage[] {
    const text = message.parts.flatMap((p) => (p.type === "text" ? [p.text] : [])).join("\n");
    if (message.role === "tool") {
        return message.parts.flatMap((p) => (p.type === "tool-result" ? [{ role: "tool", resultFor: p.callId }] : []));
    }

    const calls = message.parts.flatMap((p) => (p.type === "tool-call" ? [p.callId] : []));
    return [{ role: message.role, text, ...(calls.length > 0 ? { calls } : {}) }];
}

/** A `MockLlmProvider` whose next answer can be scripted, and which records what it was asked. */
class ScriptedMockProvider extends MockLlmProvider {
    readonly asks: { messages: Message[]; tools: ToolDefinition[]; toolChoice: string }[] = [];
    next: ((signal?: AbortSignal) => Promise<LlmResponse>) | undefined;

    override async generate(
        messages: Message[],
        tools: ToolDefinition[],
        options?: { signal?: AbortSignal; toolChoice?: "auto" | "none" },
    ): Promise<LlmResponse> {
        this.asks.push({ messages: [...messages], tools, toolChoice: options?.toolChoice ?? "auto" });
        const { next } = this;
        this.next = undefined;
        return next ? next(options?.signal) : super.generate(messages, tools, options);
    }
}

/** `LlmProviderEngine` over a `MockLlmProvider`. */
export function mockProviderFixture(): EngineFixture {
    const provider = new ScriptedMockProvider();
    return {
        engine: new LlmProviderEngine(provider),
        reply: (answer) => {
            provider.next = () =>
                Promise.resolve({
                    text: answer.text ?? "",
                    toolCalls: answer.toolCalls ?? [],
                    usage: answer.usage
                        ? { promptTokens: answer.usage.input, completionTokens: answer.usage.output }
                        : undefined,
                });
        },
        fail: (status) => {
            provider.next = () => Promise.reject(Object.assign(new Error(`HTTP ${status}`), { statusCode: status }));
        },
        hang: () => {
            provider.next = (signal) => aborted(signal ?? new AbortController().signal);
        },
        seen: () =>
            provider.asks.map(({ messages, tools, toolChoice }) => ({
                system: messages.find((m) => m.role === "system")?.content ?? "",
                messages: messages
                    .filter((m) => m.role !== "system")
                    .map((m) =>
                        m.role === "tool"
                            ? { role: "tool", resultFor: m.toolCallId }
                            : {
                                  role: m.role,
                                  text: m.content,
                                  ...(m.toolCalls ? { calls: m.toolCalls.map((c) => c.id) } : {}),
                              },
                    ),
                tools: tools.map((tool) => tool.name),
                toolMode: toolChoice,
            })),
    };
}

const TOOL: ToolSpec = {
    name: "findNodes",
    description: "Find nodes",
    schema: z.object({ selector: z.string() }),
    jsonSchema: { type: "object" },
};

/** A request with one user message. */
function request(overrides: Partial<TurnRequest> = {}): TurnRequest {
    return {
        system: "You drive a graph.",
        messages: [{ id: "m1", role: "user", parts: [{ type: "text", origin: "reader", text: "find the servers" }] }],
        tools: [TOOL],
        toolMode: "auto",
        ...overrides,
    };
}

/** Every event of one turn. */
async function events(
    engine: AiEngine,
    turn: TurnRequest,
    signal = new AbortController().signal,
): Promise<TurnEvent[]> {
    const out: TurnEvent[] = [];
    for await (const event of engine.turn(turn, signal)) {
        out.push(event);
    }

    return out;
}

/**
 * The contract, for one engine.
 * @param name - The engine, as the suite names it.
 * @param make - A fresh fixture per case.
 */
export function runEngineContract(name: string, make: () => EngineFixture): void {
    describe(`engine contract: ${name}`, () => {
        it("streams the model's text and finishes with stop", async () => {
            const { engine, reply } = make();
            reply({ text: "Two servers." });
            const out = await events(engine, request());
            const text = out.flatMap((e) => (e.type === "text" ? [e.delta] : [])).join("");
            assert.strictEqual(text, "Two servers.");
            assert.deepStrictEqual(out.at(-1), { type: "finish", reason: "stop" });
        });

        it("reports the tool calls in the order the model made them, and runs none of them", async () => {
            const { engine, reply, seen } = make();
            reply({
                toolCalls: [
                    { id: "t1", name: "findNodes", arguments: { selector: "a" } },
                    { id: "t2", name: "findNodes", arguments: { selector: "b" } },
                ],
            });
            const out = await events(engine, request());
            const calls = out.flatMap((e) => (e.type === "tool-call" ? [[e.id, e.arguments]] : []));
            assert.deepStrictEqual(calls, [
                ["t1", { selector: "a" }],
                ["t2", { selector: "b" }],
            ]);
            assert.deepStrictEqual(out.at(-1), { type: "finish", reason: "tool-calls" });
            // One turn is one request: the model is not asked again with the calls' results.
            assert.strictEqual(seen().length, 1);
        });

        it("sends a history that ends in tool results, and the system prompt", async () => {
            const { engine, reply, seen } = make();
            reply({ text: "Done." });
            const history: SavedMessage[] = [
                ...request().messages,
                {
                    id: "m2",
                    role: "assistant",
                    parts: [
                        {
                            type: "tool-call",
                            origin: "model",
                            callId: "t1",
                            command: "findNodes",
                            arguments: { selector: "a" },
                        },
                    ],
                },
                {
                    id: "m3",
                    role: "tool",
                    parts: [
                        {
                            type: "tool-result",
                            origin: "graph-data",
                            callId: "t1",
                            code: "AI_COMPLETED",
                            params: {},
                            content: '{"success":true}',
                        },
                    ],
                },
            ];
            const out = await events(engine, request({ messages: history }));
            assert.notOk(out.some((e) => e.type === "error"));
            const [sent] = seen();
            assert.strictEqual(sent.system, "You drive a graph.");
            assert.deepStrictEqual(
                sent.messages.map((m) => m.role),
                ["user", "assistant", "tool"],
            );
            assert.deepStrictEqual(sent.messages[1].calls, ["t1"]);
            assert.strictEqual(sent.messages[2].resultFor, "t1");
        });

        it("asks for text only under toolMode none, with the tools still declared", async () => {
            const { engine, reply, seen } = make();
            reply({ text: "Here is what I found." });
            await events(engine, request({ toolMode: "none" }));
            assert.strictEqual(seen()[0].toolMode, "none");
            assert.deepStrictEqual(seen()[0].tools, ["findNodes"]);
        });

        it("ends an aborted turn with AI_CANCELLED and nothing after it", async () => {
            const { engine, hang } = make();
            hang();
            const controller = new AbortController();
            const pending = events(engine, request(), controller.signal);
            controller.abort();
            const out = await pending;
            const last = out.at(-1);
            assert.strictEqual(last?.type, "error");
            assert.strictEqual(last.type === "error" ? last.code : undefined, "AI_CANCELLED");
            assert.notOk(out.slice(0, -1).some((e) => e.type === "tool-call" || e.type === "finish"));
        });

        for (const status of [401, 403]) {
            it(`codes a ${status} as AI_KEY_REJECTED with the status`, async () => {
                const { engine, fail } = make();
                fail(status);
                const out = await events(engine, request());
                const last = out.at(-1);
                assert.strictEqual(last?.type, "error");
                if (last?.type === "error") {
                    assert.strictEqual(last.code, "AI_KEY_REJECTED");
                    assert.strictEqual(last.params.status, status);
                    assert.instanceOf(last.cause, Error);
                }
            });
        }

        it("codes any other failure as AI_PROVIDER_ERROR with the status", async () => {
            const { engine, fail } = make();
            fail(500);
            const last = (await events(engine, request())).at(-1);
            assert.strictEqual(last?.type === "error" ? last.code : undefined, "AI_PROVIDER_ERROR");
            assert.strictEqual(last?.type === "error" ? last.params.status : undefined, 500);
        });

        it("reports the turn's usage", async () => {
            const { engine, reply } = make();
            reply({ text: "ok", usage: { input: 12, output: 3 } });
            const usage = (await events(engine, request())).find((e) => e.type === "usage");
            assert.deepStrictEqual(usage, { type: "usage", inputTokens: 12, outputTokens: 3 });
        });

        it("takes a model id no table lists", async () => {
            const { engine, reply } = make();
            reply({ text: "ok" });
            assert.include(["available", "unsupported"], engine.capabilities("not-a-listed-model").toolCalls);
            const out = await events(engine, request({ model: "not-a-listed-model" }));
            assert.strictEqual(out.at(-1)?.type, "finish");
        });

        it("answers a key check with a code, and disposes", async () => {
            const { engine } = make();
            const { code } = await engine.checkKey(new AbortController().signal);
            assert.strictEqual(code, "AI_COMPLETED");
            engine.dispose();
        });
    });
}
