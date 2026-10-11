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
import type { ProviderApiSettings, ProviderState, SavedMessage, TurnError, TurnEvent, TurnRequest } from "../types";

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
 * Headers an SDK adds for its own telemetry, which the AI SDK never sent: a proxy or a local server
 * whose CORS preflight allows only the headers it knew would refuse every request.
 * @param name - A header name, lower case.
 * @returns Whether to drop it.
 */
function isSdkTelemetryHeader(name: string): boolean {
    return name.startsWith("x-stainless-") || name === "x-goog-api-client";
}

/**
 * A fetch that records what the provider answered, for the error codes and the retry schedule,
 * and drops the SDKs' telemetry headers. It calls the page's `fetch` at request time.
 * @param record - Where it records.
 * @returns The fetch.
 */
function recordingFetch(record: ResponseRecord): typeof globalThis.fetch {
    return async (input, init) => {
        const headers = new Headers(init?.headers);
        for (const name of [...headers.keys()].filter(isSdkTelemetryHeader)) {
            headers.delete(name);
        }

        try {
            const response = await globalThis.fetch(input, { ...init, headers });
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
 * Whether a value is a plain JSON object.
 * @param value - The value.
 * @returns Whether it is.
 */
function isObject(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * A tool call's arguments as an object. The streamed text decides whether they are valid: every
 * adapter hands `{}` as the parsed input of arguments that did not parse, which would run the
 * command with its defaults.
 * @param input - TanStack's parsed input (OpenAI's has its nullable optional fields narrowed back).
 * @param raw - The streamed argument text.
 * @returns The arguments, or undefined when the text is not a JSON object (malformed or cut off).
 */
function callArguments(input: unknown, raw: string): Readonly<Record<string, unknown>> | undefined {
    let parsed: unknown = {};
    if (raw.trim() !== "") {
        try {
            parsed = JSON.parse(raw);
        } catch {
            return undefined;
        }
    }

    if (!isObject(parsed)) {
        return undefined;
    }

    return isObject(input) ? input : parsed;
}

/**
 * The provider's own words from an error message that carries its JSON body, as `@google/genai`
 * (twice encoded) and the Anthropic SDK (after the status) do.
 * @param message - The message.
 * @returns The innermost `error.message`, or the message as it was.
 */
function providerMessage(message: string): string {
    let current = message;
    for (let depth = 0; depth < 3; depth++) {
        const start = current.indexOf("{");
        if (start === -1) {
            break;
        }

        let body: unknown;
        try {
            body = JSON.parse(current.slice(start));
        } catch {
            break;
        }

        const inner = isObject(body) && isObject(body.error) ? body.error.message : undefined;
        if (typeof inner !== "string") {
            break;
        }

        current = inner;
    }

    return current;
}

/**
 * Whether an error is Google refusing the key: Gemini answers a wrong key with 400
 * `INVALID_ARGUMENT`, reason `API_KEY_INVALID`, where the others answer 401 or 403.
 * @param message - The error's message, the provider's body in it.
 * @param response - What the request got back.
 * @param settings - The provider.
 * @returns Whether it is.
 */
function isGoogleKeyRefusal(message: string, response: ResponseRecord, settings: ProviderApiSettings): boolean {
    return settings.provider === "google" && response.status === 400 && message.includes("API_KEY_INVALID");
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
    const error = Object.assign(new Error(providerMessage(message)), { name: "ProviderApiError" });
    const { status } = response;
    if (status !== undefined) {
        Object.assign(error, { statusCode: status });
    }

    const coded = providerFailure(error, settings.provider, signal, [settings.apiKey]);
    const event: TurnError =
        coded.code === "AI_PROVIDER_ERROR" && isGoogleKeyRefusal(message, response, settings)
            ? { ...coded, code: "AI_KEY_REJECTED" }
            : coded;
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

/** A tool call while its arguments stream. */
interface PendingCall {
    readonly name: string;
    args: string;
    readonly metadata?: Record<string, unknown>;
}

/** The end of a turn, as a `RUN_ERROR` chunk carries it. */
interface RunError {
    readonly message: string;
    readonly code?: string;
    readonly usage?: Usage;
}

/** A turn's token counts, as a chunk carries them. */
interface Usage {
    readonly promptTokens?: number;
    readonly completionTokens?: number;
}

/**
 * Whether a `RUN_ERROR` is a turn the provider cut short and still answered: the output limit
 * (Gemini `MAX_TOKENS`, Anthropic `max_tokens`, OpenAI `incomplete` for `max_output_tokens`) or
 * OpenAI's content filter. The AI SDK finished such a turn with what it had, and so does graphty.
 * @param chunk - The chunk.
 * @returns Whether it is.
 */
function isCutShort(chunk: RunError): boolean {
    return (
        chunk.code === "max_tokens" ||
        (chunk.code === "incomplete" && (chunk.message === "max_output_tokens" || chunk.message === "content_filter"))
    );
}

/** Reads one turn's TanStack chunks as turn events: each tool call as it completes, then the end. */
class ChunkReader {
    /** Whether the turn has ended, with a finish or an error. */
    done = false;
    private readonly pending = new Map<string, PendingCall>();
    private calls = 0;

    /**
     * A reader for one turn.
     * @param settings - The turn's provider and model, which the provider state names.
     * @param response - What graphty's fetch saw, for an error's code.
     * @param signal - The turn's signal.
     */
    constructor(
        private readonly settings: ProviderApiSettings,
        private readonly response: ResponseRecord,
        private readonly signal: AbortSignal,
    ) {}

    /**
     * The events one chunk makes.
     * @param chunk - The chunk.
     * @returns Its events, often none.
     */
    read(chunk: StreamChunk): TurnEvent[] {
        switch (chunk.type) {
            case EventType.TEXT_MESSAGE_CONTENT:
                return [{ type: "text", delta: chunk.delta }];
            case EventType.TOOL_CALL_START: {
                const { tanstack: _tanstack, ...metadata } = (chunk.metadata ?? {}) as Record<string, unknown>;
                this.pending.set(chunk.toolCallId, {
                    name: chunk.toolCallName,
                    args: "",
                    ...(Object.keys(metadata).length > 0 && { metadata }),
                });
                return [];
            }
            case EventType.TOOL_CALL_ARGS: {
                const call = this.pending.get(chunk.toolCallId);
                if (call) {
                    // Gemini's adapter sends the whole argument text so far as each delta; the
                    // others send the next piece.
                    call.args = this.settings.provider === "google" ? chunk.delta : call.args + chunk.delta;
                }
                return [];
            }
            case EventType.TOOL_CALL_END:
                return this.callEnded(chunk.toolCallId, (chunk as { input?: unknown }).input);
            case EventType.RUN_ERROR: {
                this.done = true;
                const error = chunk as RunError;
                return isCutShort(error)
                    ? this.finished(error.usage)
                    : [failure(error.message, this.response, this.settings, this.signal)];
            }
            case EventType.RUN_FINISHED:
                this.done = true;
                return this.finished((chunk as { usage?: Usage }).usage);
            default:
                return [];
        }
    }

    /**
     * A tool call whose arguments are complete, or that the turn's end cut off.
     * @param id - Its id.
     * @param input - TanStack's parsed arguments.
     * @param cutOff - The turn ended before the call did.
     * @returns The call's event; a call whose arguments are not a JSON object is marked, and runs
     *   nothing.
     */
    private callEnded(id: string, input: unknown, cutOff = false): TurnEvent[] {
        const call = this.pending.get(id);
        if (!call) {
            return [];
        }

        this.pending.delete(id);
        this.calls++;
        const { provider, model } = this.settings;
        const args = cutOff ? undefined : callArguments(input, call.args);
        return [
            {
                type: "tool-call",
                id,
                name: call.name,
                arguments: args ?? {},
                ...(args === undefined && { invalidArguments: true as const }),
                ...(call.metadata && {
                    providerState: { engine: ENGINE, provider, model, data: call.metadata },
                }),
            },
        ];
    }

    /**
     * The end of a turn that finished: any call it cut off, its usage and its finish, or a cancel
     * that came first.
     * @param usage - The turn's token counts.
     * @returns The events.
     */
    private finished(usage: Usage | undefined): TurnEvent[] {
        if (this.signal.aborted) {
            return [failure("The turn was cancelled.", this.response, this.settings, this.signal)];
        }

        const events = [...this.pending.keys()].flatMap((id) => this.callEnded(id, undefined, true));
        if (usage?.promptTokens !== undefined && usage.completionTokens !== undefined) {
            events.push({ type: "usage", inputTokens: usage.promptTokens, outputTokens: usage.completionTokens });
        }

        events.push({ type: "finish", reason: this.calls > 0 ? "tool-calls" : "stop" });
        return events;
    }
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

        const reader = new ChunkReader(settings, response, signal);
        for await (const chunk of stream) {
            yield* reader.read(chunk);
            if (reader.done) {
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
