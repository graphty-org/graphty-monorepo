/**
 * The provider-API engine against each provider's HTTP API, faked at `fetch`: every turn really
 * goes through TanStack AI and the provider's SDK, and the fake answers with the provider's own
 * streaming wire format (written from each API's documented events, no recorded headers, no keys).
 * The fake records every request, so a case can check the URL, the headers and a normalized
 * snapshot of what the model was sent.
 * @module test/ai/engine/providerApiFixtures
 */

import { vi } from "vitest";

import { ProviderApiEngine, type ProviderApiEngineOptions } from "../../../src/ai/engine/ProviderApiEngine";
import type { ProviderApiId, ProviderApiSettings } from "../../../src/ai/engine/types";
import type { EngineFixture } from "./contract";

/** One scripted answer. */
interface Answer {
    text?: string;
    /** A call's arguments as an object, or as the raw text the model wrote (OpenAI and Anthropic). */
    toolCalls?: { id: string; name: string; arguments: Record<string, unknown> | string; signature?: string }[];
    usage?: { input: number; output: number };
    /** The answer stops at the output limit (Gemini MAX_TOKENS, Anthropic max_tokens, OpenAI incomplete). */
    cutOff?: boolean;
}

/**
 * A call's argument text, as the model wrote it.
 * @param args - The arguments, or their raw text.
 * @returns The text.
 */
function argumentText(args: Record<string, unknown> | string): string {
    return typeof args === "string" ? args : JSON.stringify(args);
}

/** One request the fake received. */
export interface SentRequest {
    readonly url: string;
    readonly headers: Readonly<Record<string, string>>;
    readonly body: Record<string, unknown>;
}

/** What the fake answers a request with. */
type Reply = (init: RequestInit | undefined) => Promise<Response>;

/** The keys the fixtures configure, one per provider, so a case can check where each one went. */
export const KEYS: Readonly<Record<ProviderApiId, string>> = {
    openai: "sk-test-openai-0123456789abcdef",
    anthropic: "sk-ant-test-0123456789abcdef",
    google: "AIza-test-0123456789abcdef",
};

/** Each provider's API host, where its key may go and no other key may. */
export const HOSTS: Readonly<Record<ProviderApiId, string>> = {
    openai: "api.openai.com",
    anthropic: "api.anthropic.com",
    google: "generativelanguage.googleapis.com",
};

/** The default model each fixture asks, as the provider's catalogue names it. */
const MODELS: Readonly<Record<ProviderApiId, string>> = {
    openai: "gpt-4o",
    anthropic: "claude-haiku-4-5-20251001",
    google: "gemini-3.8-flash",
};

/**
 * A server-sent-events body.
 * @param events - Each event's name (none for Gemini) and data.
 * @returns The body.
 */
function sse(events: readonly (readonly [string | null, unknown])[]): string {
    return events
        .map(([name, data]) => `${name === null ? "" : `event: ${name}\n`}data: ${JSON.stringify(data)}\n\n`)
        .join("");
}

/**
 * Why an Anthropic answer stopped.
 * @param answer - The answer.
 * @returns The `stop_reason`.
 */
function anthropicStopReason(answer: Answer): string {
    if (answer.cutOff) {
        return "max_tokens";
    }

    return answer.toolCalls?.length ? "tool_use" : "end_turn";
}

/** Each provider's streaming answer, in its own wire format. */
const STREAMS: Readonly<Record<ProviderApiId, (answer: Answer) => string>> = {
    openai: (answer) => {
        const items = [
            ...(answer.text
                ? [
                      {
                          id: "msg_1",
                          type: "message" as const,
                          status: "completed",
                          role: "assistant",
                          content: [{ type: "output_text", text: answer.text, annotations: [] }],
                      },
                  ]
                : []),
            ...(answer.toolCalls ?? []).map((call, index) => ({
                id: `fc_${index}`,
                type: "function_call" as const,
                status: "completed",
                call_id: call.id,
                name: call.name,
                arguments: argumentText(call.arguments),
            })),
        ];
        const response = { id: "resp_1", object: "response", created_at: 1, model: MODELS.openai };
        let n = 0;
        const event = (type: string, data: Record<string, unknown>): [string, unknown] => [
            type,
            { type, sequence_number: n++, ...data },
        ];
        return sse([
            event("response.created", { response: { ...response, status: "in_progress", output: [] } }),
            ...items.flatMap((item, index) =>
                item.type === "message"
                    ? [
                          event("response.output_item.added", {
                              output_index: index,
                              item: { ...item, status: "in_progress", content: [] },
                          }),
                          event("response.output_text.delta", {
                              item_id: item.id,
                              output_index: index,
                              content_index: 0,
                              delta: answer.text,
                          }),
                          event("response.output_item.done", { output_index: index, item }),
                      ]
                    : [
                          event("response.output_item.added", {
                              output_index: index,
                              item: { ...item, status: "in_progress", arguments: "" },
                          }),
                          event("response.function_call_arguments.delta", {
                              item_id: item.id,
                              output_index: index,
                              delta: item.arguments,
                          }),
                          event("response.function_call_arguments.done", {
                              item_id: item.id,
                              output_index: index,
                              arguments: item.arguments,
                          }),
                          event("response.output_item.done", { output_index: index, item }),
                      ],
            ),
            event(answer.cutOff ? "response.incomplete" : "response.completed", {
                response: {
                    ...response,
                    status: answer.cutOff ? "incomplete" : "completed",
                    ...(answer.cutOff && { incomplete_details: { reason: "max_output_tokens" } }),
                    output: items,
                    usage: {
                        input_tokens: answer.usage?.input ?? 1,
                        output_tokens: answer.usage?.output ?? 1,
                        total_tokens: 2,
                    },
                },
            }),
        ]);
    },
    anthropic: (answer) => {
        const blocks = [
            ...(answer.text ? [{ type: "text" as const, text: answer.text }] : []),
            ...(answer.toolCalls ?? []).map((call) => ({
                type: "tool_use" as const,
                id: call.id,
                name: call.name,
                input: call.arguments,
            })),
        ];
        return sse([
            [
                "message_start",
                {
                    type: "message_start",
                    message: {
                        id: "msg_1",
                        type: "message",
                        role: "assistant",
                        model: MODELS.anthropic,
                        content: [],
                        stop_reason: null,
                        stop_sequence: null,
                        usage: { input_tokens: answer.usage?.input ?? 1, output_tokens: 1 },
                    },
                },
            ],
            ...blocks.flatMap((block, index): [string, unknown][] =>
                block.type === "text"
                    ? [
                          [
                              "content_block_start",
                              { type: "content_block_start", index, content_block: { type: "text", text: "" } },
                          ],
                          [
                              "content_block_delta",
                              { type: "content_block_delta", index, delta: { type: "text_delta", text: block.text } },
                          ],
                          ["content_block_stop", { type: "content_block_stop", index }],
                      ]
                    : [
                          [
                              "content_block_start",
                              { type: "content_block_start", index, content_block: { ...block, input: {} } },
                          ],
                          [
                              "content_block_delta",
                              {
                                  type: "content_block_delta",
                                  index,
                                  delta: { type: "input_json_delta", partial_json: argumentText(block.input) },
                              },
                          ],
                          ["content_block_stop", { type: "content_block_stop", index }],
                      ],
            ),
            [
                "message_delta",
                {
                    type: "message_delta",
                    delta: { stop_reason: anthropicStopReason(answer), stop_sequence: null },
                    usage: { output_tokens: answer.usage?.output ?? 1 },
                },
            ],
            ["message_stop", { type: "message_stop" }],
        ]);
    },
    google: (answer) =>
        sse([
            [
                null,
                {
                    candidates: [
                        {
                            content: {
                                role: "model",
                                parts: [
                                    ...(answer.text ? [{ text: answer.text }] : []),
                                    ...(answer.toolCalls ?? []).map((call) => ({
                                        functionCall: { id: call.id, name: call.name, args: call.arguments },
                                        ...(call.signature !== undefined && { thoughtSignature: call.signature }),
                                    })),
                                ],
                            },
                            finishReason: answer.cutOff ? "MAX_TOKENS" : "STOP",
                            index: 0,
                        },
                    ],
                    usageMetadata: {
                        promptTokenCount: answer.usage?.input ?? 1,
                        candidatesTokenCount: answer.usage?.output ?? 1,
                        totalTokenCount: 2,
                    },
                    modelVersion: MODELS.google,
                },
            ],
        ]),
};

/** Each provider's error body. */
function errorBody(provider: ProviderApiId, status: number): string {
    const message = "refused";
    if (provider === "anthropic") {
        return JSON.stringify({ type: "error", error: { type: "api_error", message } });
    }

    return JSON.stringify({
        error:
            provider === "google"
                ? { code: status, message, status: "UNAVAILABLE" }
                : { message, type: "server_error", code: null },
    });
}

/**
 * A promise that rejects when the signal fires, as `fetch` does.
 * @param signal - The request's signal.
 * @returns The promise.
 */
function abortedFetch(signal: AbortSignal | null | undefined): Promise<never> {
    return new Promise((_, reject) => {
        const abort = (): void => {
            reject(new DOMException("The operation was aborted.", "AbortError"));
        };
        if (signal?.aborted) {
            abort();
        }

        signal?.addEventListener("abort", abort, { once: true });
    });
}

/** The request as the model saw it, one entry per message, the same shape for every engine. */
type Seen = ReturnType<EngineFixture["seen"]>[number];

/** Each provider's request body, normalized to what the model saw. */
const SEEN: Readonly<Record<ProviderApiId, (body: Record<string, unknown>) => Seen>> = {
    openai: (body) => {
        const messages: Seen["messages"] = [];
        for (const item of body.input as Record<string, unknown>[]) {
            const last = messages.at(-1);
            if (item.type === "function_call") {
                // TanStack sends a turn's calls before its text: both are the one assistant message.
                if (last?.role === "assistant" && last.calls) {
                    last.calls.push(item.call_id as string);
                } else {
                    messages.push({ role: "assistant", text: "", calls: [item.call_id as string] });
                }
            } else if (item.type === "function_call_output") {
                messages.push({ role: "tool", resultFor: item.call_id as string });
            } else if (item.role === "assistant" && last?.role === "assistant" && last.text === "") {
                last.text = item.content as string;
            } else {
                const content = item.content as string | { text: string }[];
                messages.push({
                    role: item.role as string,
                    text: typeof content === "string" ? content : content.map((c) => c.text).join(""),
                });
            }
        }

        return {
            system: (body.instructions as string | undefined) ?? "",
            messages,
            tools: ((body.tools as { name: string }[] | undefined) ?? []).map((t) => t.name),
            toolMode: (body.tool_choice as string | undefined) ?? "auto",
        };
    },
    anthropic: (body) => ({
        system: ((body.system as { text: string }[] | undefined) ?? []).map((s) => s.text).join("\n"),
        messages: (body.messages as { role: string; content: string | Record<string, unknown>[] }[]).flatMap(
            (m): Seen["messages"] => {
                if (typeof m.content === "string") {
                    return [{ role: m.role, text: m.content }];
                }

                const results = m.content.filter((b) => b.type === "tool_result");
                if (results.length > 0) {
                    return results.map((b) => ({ role: "tool", resultFor: b.tool_use_id as string }));
                }

                const calls = m.content.filter((b) => b.type === "tool_use").map((b) => b.id as string);
                const text = m.content.flatMap((b) => (b.type === "text" ? [b.text as string] : [])).join("");
                return [{ role: m.role, text, ...(calls.length > 0 && { calls }) }];
            },
        ),
        tools: ((body.tools as { name: string }[] | undefined) ?? []).map((t) => t.name),
        toolMode: (body.tool_choice as { type: string } | undefined)?.type ?? "auto",
    }),
    google: (body) => ({
        system: ((body.systemInstruction as { parts: { text: string }[] } | undefined)?.parts ?? [])
            .map((p) => p.text)
            .join("\n"),
        messages: (body.contents as { role: string; parts: Record<string, unknown>[] }[]).flatMap(
            (c): Seen["messages"] => {
                const results = c.parts.filter((p) => p.functionResponse !== undefined);
                if (results.length > 0) {
                    return results.map((p) => ({ role: "tool", resultFor: (p.functionResponse as { id: string }).id }));
                }

                const calls = c.parts.flatMap((p) => (p.functionCall ? [(p.functionCall as { id: string }).id] : []));
                const text = c.parts.flatMap((p) => (typeof p.text === "string" ? [p.text] : [])).join("");
                return [{ role: c.role === "model" ? "assistant" : c.role, text, ...(calls.length > 0 && { calls }) }];
            },
        ),
        tools: ((body.tools as { functionDeclarations?: { name: string }[] }[] | undefined) ?? []).flatMap((t) =>
            (t.functionDeclarations ?? []).map((d) => d.name),
        ),
        toolMode:
            (
                body.toolConfig as { functionCallingConfig?: { mode?: string } } | undefined
            )?.functionCallingConfig?.mode?.toLowerCase() ?? "auto",
    }),
};

/** A provider-API fixture, with what a provider-specific case needs beyond the contract. */
export interface ProviderApiFixture extends EngineFixture {
    readonly engine: ProviderApiEngine;
    /** The next turn answers this; a Gemini call may carry a thought signature. */
    reply(answer: Answer): void;
    /** Every request the fake received, in order. */
    readonly requests: SentRequest[];
    /** The engine's settings; a case may change them between turns. */
    readonly settings: { -readonly [K in keyof ProviderApiSettings]: ProviderApiSettings[K] };
    /** The next request is answered with this status, `retry-after-ms` and body. */
    failOnce(status: number, retryAfterMs?: number): void;
    /** The next request never reaches the server. */
    dropConnection(): void;
    /** The next request is answered with this status, body and headers, as they are. */
    respondOnce(status: number, body: string, headers?: Record<string, string>): void;
    /** Every wait the engine asked for between attempts, in milliseconds. */
    readonly waits: number[];
}

/**
 * The provider-API engine for one provider, over a fake `fetch` (stubbed globally: unstub after
 * each case with `vi.unstubAllGlobals()`).
 * @param provider - The provider.
 * @param options - Engine options to replace (the wait between attempts is recorded, not slept).
 * @returns The fixture.
 */
export function providerApiFixture(
    provider: ProviderApiId,
    options: ProviderApiEngineOptions = {},
): ProviderApiFixture {
    const requests: SentRequest[] = [];
    const replies: Reply[] = [];
    const waits: number[] = [];
    const settings: ProviderApiFixture["settings"] = { provider, apiKey: KEYS[provider], model: MODELS[provider] };
    const respond =
        (status: number, body: string, headers: Record<string, string> = {}): Reply =>
        () =>
            Promise.resolve(new Response(body, { status, headers }));
    vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = input instanceof Request ? input.url : String(input);
        requests.push({
            url,
            headers: Object.fromEntries(new Headers(init?.headers).entries()),
            body: typeof init?.body === "string" ? (JSON.parse(init.body) as Record<string, unknown>) : {},
        });
        const reply =
            replies.shift() ?? respond(200, STREAMS[provider]({ text: "ok" }), { "content-type": "text/event-stream" });
        return reply(init);
    });
    const engine = new ProviderApiEngine(() => ({ ...settings }), {
        wait: (ms) => {
            waits.push(ms);
            return Promise.resolve();
        },
        ...options,
    });
    const fail = (status: number, retryAfterMs = 0): Reply =>
        respond(status, errorBody(provider, status), {
            "content-type": "application/json",
            "retry-after-ms": String(retryAfterMs),
        });
    return {
        engine,
        requests,
        settings,
        waits,
        reply: (answer) => {
            replies.push(respond(200, STREAMS[provider](answer), { "content-type": "text/event-stream" }));
        },
        // A failure that lasts: every attempt, retries included, gets it.
        fail: (status) => {
            replies.push(fail(status), fail(status), fail(status));
        },
        failOnce: (status, retryAfterMs) => {
            replies.push(fail(status, retryAfterMs));
        },
        dropConnection: () => {
            replies.push(() => Promise.reject(new TypeError("Failed to fetch")));
        },
        respondOnce: (status, body, headers) => {
            replies.push(respond(status, body, headers));
        },
        hang: () => {
            replies.push((init) => abortedFetch(init?.signal));
        },
        answerAfterAbort: (answer) => {
            replies.push(async (init) => {
                await abortedFetch(init?.signal).catch(() => undefined);
                return new Response(STREAMS[provider](answer), {
                    status: 200,
                    headers: { "content-type": "text/event-stream" },
                });
            });
        },
        seen: () => requests.map((r) => SEEN[provider](r.body)),
        wire: () => requests.map((r) => r.body),
    };
}
