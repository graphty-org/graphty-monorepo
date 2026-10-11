/**
 * @file The provider-API adapter: one model turn on TanStack AI's `chat()`, from the page, with the
 * reader's key. The only folder that imports TanStack or a provider SDK; `../load.ts` loads it with
 * `import()` on the first turn, and each provider's module is a further `import()`, so a page loads
 * the shared loop plus the one provider it uses.
 *
 * Tools are declared without executors, so a turn that calls tools ends there and hands the calls
 * back: graphty's loop runs them (design/ai/tanstack-ai-harness-design.md, section 2.1). Retries
 * are the engine's (`../ProviderApiEngine.ts`); every lower layer's are off.
 */

import { chat, EventType, type ModelMessage, type StreamChunk } from "@tanstack/ai";

import { providerFailure } from "../LlmProviderEngine";
import type { ProviderApiSettings, ProviderState, SavedMessage, TurnEvent, TurnRequest } from "../types";

/** Marks the provider state this engine wrote. */
const ENGINE = "provider-api";

/** What one provider's module supplies: its adapter, its options, and its round-trip data. */
export interface ProviderModule {
    /**
     * The provider's TanStack adapter, with the reader's key, the consumer's base URL, no retries,
     * and graphty's fetch.
     */
    createAdapter(settings: ProviderApiSettings, fetch: typeof globalThis.fetch): Parameters<typeof chat>[0]["adapter"];
    /** The turn's tool mode, output limit and temperature, under this provider's own option names. */
    modelOptions(request: TurnRequest, settings: ProviderApiSettings): Record<string, unknown>;
    /**
     * The metadata each tool call of one assistant message carries back.
     * @param own - Each call's own saved data, or undefined for a call with none of this engine's.
     * @param model - The model the turn asks.
     */
    callStates(own: readonly unknown[], model: string): readonly (Record<string, unknown> | undefined)[];
}

/** What the turn's request got back, as graphty's own fetch saw it. */
interface ResponseRecord {
    /** The HTTP status of a response that was not ok. */
    status?: number;
    /** How long the provider asked to wait, from `retry-after-ms` or `retry-after`. */
    retryAfterMs?: number;
    /** The request never got a response (and was not cancelled). */
    networkError: boolean;
}

/**
 * How long a response asks the client to wait: `retry-after-ms`, else `retry-after` in seconds or
 * as an HTTP date.
 * @param headers - The response's headers.
 * @returns Milliseconds, or undefined when it does not say.
 */
function retryAfter(headers: Headers): number | undefined {
    const ms = Number.parseFloat(headers.get("retry-after-ms") ?? "");
    if (!Number.isNaN(ms)) {
        return ms;
    }

    const value = headers.get("retry-after");
    if (value === null) {
        return undefined;
    }

    const seconds = Number.parseFloat(value);
    const wait = Number.isNaN(seconds) ? Date.parse(value) - Date.now() : seconds * 1000;
    return Number.isNaN(wait) ? undefined : wait;
}

/**
 * A fetch that records what the provider answered, for the error codes and the retry schedule.
 * It calls the page's `fetch` at request time.
 * @param record - Where it records.
 * @returns The fetch.
 */
function recordingFetch(record: ResponseRecord): typeof globalThis.fetch {
    return async (input, init) => {
        try {
            const response = await globalThis.fetch(input, init);
            if (!response.ok) {
                record.status = response.status;
                record.retryAfterMs = retryAfter(response.headers);
            }

            return response;
        } catch (error) {
            record.networkError = init?.signal?.aborted !== true;
            throw error;
        }
    };
}

/** Each provider's module, loaded on its first turn. */
const PROVIDERS: Readonly<Record<ProviderApiSettings["provider"], () => Promise<ProviderModule>>> = {
    openai: async () => (await import("./openai")).openai,
    anthropic: async () => (await import("./anthropic")).anthropic,
    google: async () => (await import("./google")).google,
};

/**
 * The provider state a tool call carries back, when this engine, provider and model wrote it.
 * @param state - The saved state.
 * @param settings - The turn's provider and model.
 * @returns Its data, or undefined for foreign state (another engine, provider or model).
 */
function ownState(state: ProviderState | undefined, settings: ProviderApiSettings): unknown {
    return state?.engine === ENGINE && state.provider === settings.provider && state.model === settings.model
        ? state.data
        : undefined;
}

/**
 * The conversation as TanStack messages: a tool message per tool result; a tool call carries its
 * provider state back only to the engine, provider and model that wrote it.
 * @param messages - graphty's messages.
 * @param settings - The turn's provider and model.
 * @param module - The provider's module, which may stand in for a foreign call's state.
 * @returns TanStack's messages.
 */
function toModelMessages(
    messages: readonly SavedMessage[],
    settings: ProviderApiSettings,
    module: ProviderModule,
): ModelMessage[] {
    return messages.flatMap((message): ModelMessage[] => {
        const text = message.parts.flatMap((part) => (part.type === "text" ? [part.text] : [])).join("\n");
        if (message.role === "user") {
            return [{ role: "user", content: text }];
        }

        if (message.role === "assistant") {
            const calls = message.parts.flatMap((part) => (part.type === "tool-call" ? [part] : []));
            const states = module.callStates(
                calls.map((call) => ownState(call.providerState, settings)),
                settings.model,
            );
            return [
                {
                    role: "assistant",
                    content: text === "" ? null : text,
                    ...(calls.length > 0 && {
                        toolCalls: calls.map((call, index) => ({
                            id: call.callId,
                            type: "function" as const,
                            function: { name: call.command, arguments: JSON.stringify(call.arguments) },
                            ...(states[index] !== undefined && { metadata: states[index] }),
                        })),
                    }),
                },
            ];
        }

        return message.parts.flatMap((part) =>
            part.type === "tool-result"
                ? [{ role: "tool" as const, toolCallId: part.callId, content: part.content }]
                : [],
        );
    });
}

/**
 * A tool call's arguments as an object.
 * @param input - TanStack's parsed input, when the arguments parsed.
 * @param raw - The streamed argument text.
 * @returns The arguments; `{}` when there were none or they did not parse (the command's schema
 *   then refuses them, as it refuses any wrong argument).
 */
function callArguments(input: unknown, raw: string): Readonly<Record<string, unknown>> {
    if (input !== null && typeof input === "object" && !Array.isArray(input)) {
        return input as Record<string, unknown>;
    }

    try {
        const parsed: unknown = JSON.parse(raw);
        return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)
            ? (parsed as Record<string, unknown>)
            : {};
    } catch {
        return {};
    }
}

/**
 * A failure as a coded error event. The HTTP status comes from the response graphty's own fetch
 * saw, never from an SDK error's shape, so every provider codes the same status the same way.
 * @param message - What failed, in the provider's or the SDK's words.
 * @param response - What the turn's request got back.
 * @param settings - The provider and the key, which is scrubbed from the message.
 * @param signal - The turn's signal: when it fired, the turn was cancelled.
 * @returns The error event.
 */
function failure(
    message: string,
    response: ResponseRecord,
    settings: ProviderApiSettings,
    signal: AbortSignal,
): TurnEvent {
    const error = Object.assign(new Error(message), { name: "ProviderApiError" });
    if (response.status !== undefined) {
        Object.assign(error, { statusCode: response.status });
    }

    const { status } = response;
    const event = providerFailure(error, settings.provider, signal, [settings.apiKey]);
    const retryable =
        event.code === "AI_PROVIDER_ERROR" &&
        (status === undefined
            ? response.networkError
            : status === 408 || status === 409 || status === 429 || status >= 500);
    return {
        ...event,
        retryable,
        ...(response.retryAfterMs !== undefined && { retryAfterMs: response.retryAfterMs }),
    };
}

/**
 * One model turn on TanStack AI: one request to the provider, no tool run.
 * @param settings - The provider, key, model and options, as they are now.
 * @param request - The turn.
 * @param signal - Cancels the request.
 * @yields The text as it streams, each tool call, the usage, then the finish; or one coded error.
 */
export async function* providerApiTurn(
    settings: ProviderApiSettings,
    request: TurnRequest,
    signal: AbortSignal,
): AsyncIterable<TurnEvent> {
    const response: ResponseRecord = { networkError: false };
    const pending = new Map<string, { name: string; args: string; metadata?: Record<string, unknown> }>();
    let calls = 0;
    // chat() takes a controller; the turn's signal cancels it.
    const controller = new AbortController();
    const cancel = (): void => {
        controller.abort(signal.reason);
    };
    signal.addEventListener("abort", cancel, { once: true });
    try {
        if (signal.aborted) {
            cancel();
        }

        const module = await PROVIDERS[settings.provider]();
        const stream = chat({
            adapter: module.createAdapter(settings, recordingFetch(response)),
            messages: toModelMessages(request.messages, settings, module),
            ...(request.system !== "" && { systemPrompts: [request.system] }),
            tools: request.tools.map(({ name, description, jsonSchema }) => ({
                name,
                description,
                inputSchema: { ...jsonSchema },
            })),
            modelOptions: module.modelOptions(request, settings),
            abortController: controller,
            debug: false,
        }) as AsyncIterable<StreamChunk>;

        for await (const chunk of stream) {
            if (chunk.type === EventType.TEXT_MESSAGE_CONTENT) {
                yield { type: "text", delta: chunk.delta };
            } else if (chunk.type === EventType.TOOL_CALL_START) {
                const { tanstack: _tanstack, ...metadata } = (chunk.metadata ?? {}) as Record<string, unknown>;
                pending.set(chunk.toolCallId, {
                    name: chunk.toolCallName,
                    args: "",
                    ...(Object.keys(metadata).length > 0 && { metadata }),
                });
            } else if (chunk.type === EventType.TOOL_CALL_ARGS) {
                const call = pending.get(chunk.toolCallId);
                if (call) {
                    call.args += chunk.delta;
                }
            } else if (chunk.type === EventType.TOOL_CALL_END) {
                const call = pending.get(chunk.toolCallId);
                if (call) {
                    calls++;
                    yield {
                        type: "tool-call",
                        id: chunk.toolCallId,
                        name: call.name,
                        arguments: callArguments((chunk as { input?: unknown }).input, call.args),
                        ...(call.metadata && {
                            providerState: {
                                engine: ENGINE,
                                provider: settings.provider,
                                model: settings.model,
                                data: call.metadata,
                            },
                        }),
                    };
                }
            } else if (chunk.type === EventType.RUN_ERROR) {
                yield failure(chunk.message, response, settings, signal);
                return;
            } else if (chunk.type === EventType.RUN_FINISHED) {
                const { usage } = chunk as { usage?: { promptTokens?: number; completionTokens?: number } };
                if (usage?.promptTokens !== undefined && usage.completionTokens !== undefined) {
                    yield { type: "usage", inputTokens: usage.promptTokens, outputTokens: usage.completionTokens };
                }

                if (signal.aborted) {
                    yield failure("The turn was cancelled.", response, settings, signal);
                    return;
                }

                yield { type: "finish", reason: calls > 0 ? "tool-calls" : "stop" };
                return;
            }
        }

        // The stream ended with neither a finish nor an error: cancelled, or dropped.
        if (signal.aborted) {
            yield failure("The turn was cancelled.", response, settings, signal);
        }
    } catch (error) {
        yield failure(error instanceof Error ? error.message : String(error), response, settings, signal);
    } finally {
        signal.removeEventListener("abort", cancel);
    }
}
