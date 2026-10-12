/**
 * The engine contract: what every `AiEngine` must do, run against each engine through a fixture
 * that can script its model. The Node project runs it in contract.test.ts, the browser project in
 * test/browser/ai-engine-contract.test.ts. Milestone 2 adds the provider-API engine, over recorded
 * provider responses.
 * @module test/ai/engine/contract
 */

import { assert, describe, it } from "vitest";
import { z } from "zod";

import { readConversation, writeConversation } from "../../../src/ai/conversation/formats";
import { FakeEngine } from "../../../src/ai/engine/FakeEngine";
import { LlmProviderEngine } from "../../../src/ai/engine/LlmProviderEngine";
import type {
    AiEngine,
    ProviderState,
    SavedMessage,
    ToolSpec,
    TurnEvent,
    TurnRequest,
} from "../../../src/ai/engine/types";
import { MockLlmProvider } from "../../../src/ai/providers/MockLlmProvider";
import type { LlmResponse, Message, ToolDefinition } from "../../../src/ai/providers/types";
import { AI_CONVERSATION_FORMAT } from "../../../src/catalog/ai";

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
    /** The next turn waits until its signal fires, then answers anyway: a provider that ignores it. */
    answerAfterAbort(answer: Answer): void;
    /** Every request the model received, in order. */
    seen(): SeenRequest[];
    /**
     * Every request as it left the engine, in full: the HTTP body for a provider API, the
     * provider's messages for an `LlmProvider`, what the model was shown for the fake.
     */
    wire(): unknown[];
}

/** A promise that settles when the signal fires. */
function aborted(signal: AbortSignal): Promise<never> {
    return new Promise((_, reject) => {
        signal.addEventListener("abort", () => {
            reject(new Error("Request was aborted"));
        });
    });
}

/** What a model answering `answer` streams, as turn events. */
function answerEvents(answer: Answer): TurnEvent[] {
    return [
        ...(answer.text ? [{ type: "text" as const, delta: answer.text }] : []),
        ...(answer.toolCalls ?? []).map((call) => ({ type: "tool-call" as const, ...call })),
        ...(answer.usage
            ? [{ type: "usage" as const, inputTokens: answer.usage.input, outputTokens: answer.usage.output }]
            : []),
        { type: "finish", reason: answer.toolCalls?.length ? "tool-calls" : "stop" },
    ];
}

/** A `FakeEngine`, scripted with turn events; a failure is scripted raw, for the engine to code. */
export function fakeFixture(): EngineFixture {
    const engine = new FakeEngine();
    return {
        engine,
        reply: (answer) => {
            engine.push(answerEvents(answer));
        },
        fail: (status) => {
            engine.push(() => {
                throw Object.assign(new Error(`HTTP ${status}`), { statusCode: status });
            });
        },
        hang: () => {
            engine.push(async function* (_request, signal) {
                await aborted(signal);
                yield* [];
            });
        },
        answerAfterAbort: (answer) => {
            engine.push(async function* (_request, signal) {
                await aborted(signal).catch(() => undefined);
                yield* answerEvents(answer);
            });
        },
        seen: () => seenRequests(engine.requests),
        // The fake model sees the request itself; what a provider would be sent is its projection.
        wire: () => seenRequests(engine.requests),
    };
}

/** Requests as the model saw them. */
function seenRequests(requests: readonly TurnRequest[]): SeenRequest[] {
    return requests.map((request) => ({
        system: request.system,
        messages: request.messages.flatMap(seenMessages),
        tools: request.tools.map((tool) => tool.name),
        toolMode: request.toolMode,
    }));
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
        answerAfterAbort: (answer) => {
            provider.next = async (signal) => {
                await aborted(signal ?? new AbortController().signal).catch(() => undefined);
                return { text: answer.text ?? "", toolCalls: answer.toolCalls ?? [] };
            };
        },
        wire: () => provider.asks.map(({ messages, toolChoice }) => ({ messages, toolChoice })),
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

/** A history ending in a tool result, its call carrying provider state Gemini 3.8 Flash wrote. */
function historyWithState(state: ProviderState | undefined): SavedMessage[] {
    return [
        ...request().messages,
        {
            id: "m2",
            role: "assistant",
            parts: [
                { type: "text", origin: "model", text: "Looking." },
                {
                    type: "tool-call",
                    origin: "model",
                    callId: "t1",
                    command: "findNodes",
                    arguments: { selector: "a" },
                    ...(state === undefined ? {} : { providerState: state }),
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
}

/** Gemini's state on a call: a thought signature, sent back only to the model that wrote it. */
const GEMINI_STATE: ProviderState = {
    engine: "provider-api",
    provider: "google",
    model: "gemini-3.8-flash",
    data: { thoughtSignature: "c2lnLWdlbWluaQ==" },
};

/**
 * Messages saved in the conversation format and read back from its JSON, as a reload reads them.
 * @param messages - The messages.
 * @returns The messages the record holds after the round trip.
 */
function throughJson(messages: readonly SavedMessage[]): SavedMessage[] {
    const at = "2026-10-11T00:00:00.000Z";
    const read = readConversation(
        writeConversation({
            format: AI_CONVERSATION_FORMAT,
            version: 1,
            revision: 0,
            id: "c1",
            key: "",
            createdAt: at,
            updatedAt: at,
            graph: { dataKey: null, fingerprint: null },
            messages,
            pending: [],
        }),
    );
    assert.isTrue(read.ok, "the history is a valid record");
    return read.ok ? [...read.record.messages] : [];
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
 * Asserts a turn ended with one error event and nothing else of note: no finish anywhere, and
 * nothing after the error. The loop relies on it, stopping at the first error.
 * @param out - The turn's events.
 * @returns The error event.
 */
function endsInError(out: TurnEvent[]): Extract<TurnEvent, { type: "error" }> {
    const last = out.at(-1);
    assert.strictEqual(last?.type, "error", "the turn ends with an error");
    assert.strictEqual(
        out.findIndex((e) => e.type === "error"),
        out.length - 1,
        "nothing follows the error",
    );
    assert.notOk(
        out.some((e) => e.type === "finish"),
        "a failed turn does not finish",
    );
    return last as Extract<TurnEvent, { type: "error" }>;
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

        it("sends a history read back from its saved JSON exactly as the live one", async () => {
            const { engine, reply, wire } = make();
            reply({ text: "Done." });
            reply({ text: "Done." });
            const live = historyWithState(GEMINI_STATE);
            await events(engine, request({ messages: live }));
            await events(engine, request({ messages: throughJson(live) }));
            const [first, second] = wire();
            assert.deepStrictEqual(second, first);
        });

        it("continues from a saved record stripped of provider state, or ends with a code, and never throws", async () => {
            const { engine, reply } = make();
            reply({ text: "Done." });
            const stripped = throughJson(historyWithState(undefined));
            const out = await events(engine, request({ messages: stripped }));
            const last = out.at(-1);
            assert.include(["finish", "error"], last?.type);
            if (last?.type === "error") {
                assert.match(last.code, /^AI_/);
            }
        });

        it("sends no state another provider wrote, after a conversation switched from Anthropic", async () => {
            const { engine, reply, wire } = make();
            reply({ text: "Done." });
            // Another model than any fixture asks, so the state is foreign on every engine.
            const foreign: ProviderState = {
                engine: "provider-api",
                provider: "anthropic",
                model: "claude-sonnet-4-5",
                data: { signature: "anthropic-thinking-signature-0451" },
            };
            await events(engine, request({ messages: throughJson(historyWithState(foreign)) }));
            assert.notInclude(JSON.stringify(wire()), "anthropic-thinking-signature-0451");
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
            assert.strictEqual(endsInError(out).code, "AI_CANCELLED");
            assert.notOk(out.some((e) => e.type === "tool-call"));
        });

        it("ends a turn whose provider answers after the abort with AI_CANCELLED, dropping the answer", async () => {
            const { engine, answerAfterAbort } = make();
            answerAfterAbort({
                text: "late",
                toolCalls: [{ id: "t1", name: "findNodes", arguments: { selector: "a" } }],
            });
            const controller = new AbortController();
            const pending = events(engine, request(), controller.signal);
            controller.abort();
            const out = await pending;
            assert.strictEqual(endsInError(out).code, "AI_CANCELLED");
            assert.notOk(out.some((e) => e.type === "tool-call"));
        });

        for (const status of [401, 403]) {
            it(`codes a ${status} as AI_KEY_REJECTED with the status`, async () => {
                const { engine, fail } = make();
                fail(status);
                const last = endsInError(await events(engine, request()));
                assert.strictEqual(last.code, "AI_KEY_REJECTED");
                assert.strictEqual(last.params.status, status);
                assert.instanceOf(last.cause, Error);
            });
        }

        it("codes any other failure as AI_PROVIDER_ERROR with the status", async () => {
            const { engine, fail } = make();
            fail(500);
            const last = endsInError(await events(engine, request()));
            assert.strictEqual(last.code, "AI_PROVIDER_ERROR");
            assert.strictEqual(last.params.status, 500);
        });

        it("reports the turn's usage", async () => {
            const { engine, reply } = make();
            reply({ text: "ok", usage: { input: 12, output: 3 } });
            const usage = (await events(engine, request())).find((e) => e.type === "usage");
            assert.deepStrictEqual(usage, { type: "usage", inputTokens: 12, outputTokens: 3 });
        });

        it("states, for each tool the provider runs itself, whether it can offer it", () => {
            const { hostedTools } = make().engine.capabilities("not-a-listed-model");
            assert.sameMembers(Object.keys(hostedTools), ["web-search", "web-fetch"]);
            for (const status of Object.values(hostedTools)) {
                assert.include(["available", "unsupported"], status);
            }
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
