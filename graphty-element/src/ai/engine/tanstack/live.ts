/**
 * @file The provider-API adapter's live conversations: speech to speech through TanStack's realtime
 * adapters (`openaiRealtime`, WebRTC; `geminiRealtime`, WebSocket), called directly through
 * `RealtimeAdapter.connect`. Loaded by its own `import()` (`loadProviderLive()` in `../load.ts`) on
 * the first live press; each provider's realtime adapter comes with that provider's chunk.
 *
 * TanStack's `RealtimeClient` is not used: it runs client tools itself, unordered, answers an
 * unknown tool with an English string and keeps message records of its own, and every part of
 * that is graphty's (the loop, the policy, the saved format, coded results). The token is graphty's
 * too: minted in the page with the reader's key, a fresh one per connection, so there is no refresh
 * timer, and the key never reaches a URL (UPSTREAM.md).
 */

import type { RealtimeAdapter, RealtimeConnection, RealtimeSessionConfig, RealtimeToken } from "@tanstack/ai";

import { AI_VOICE_CAPABILITIES, type AiResultCode, type AiResultParams } from "../../../catalog/ai";
import { providerFailure } from "../LlmProviderEngine";
import {
    type LiveConnection,
    type LiveEvent,
    type LiveOpened,
    type LiveOptions,
    type LiveToolCall,
    type ProviderApiId,
    type ProviderApiSettings,
    type ProviderLive,
    toolResultText,
} from "../types";

/** One provider's realtime adapter, in that provider's chunk. */
export interface ProviderLiveModule {
    /**
     * TanStack's realtime adapter for a model, with its logger off.
     * @param model - The live model.
     */
    realtime(model: string): RealtimeAdapter;
}

/** Each provider's realtime adapter, in that provider's chunk. */
const LIVES: Partial<Record<ProviderApiId, () => Promise<ProviderLiveModule>>> = {
    openai: async () => (await import("./openai")).openaiLive,
    google: async () => (await import("./google")).googleLive,
};

/**
 * How long a Gemini token stays good for messages (the longest audio session Gemini holds), and how
 * soon its one session must start.
 */
const GOOGLE_TOKEN_MS = 15 * 60_000;
const GOOGLE_SESSION_START_MS = 60_000;

/**
 * A failed HTTP request as an error `providerFailure` codes by its status.
 * @param response - The response.
 * @returns The error.
 */
async function httpError(response: Response): Promise<Error> {
    const text = await response.text().catch(() => "");
    return Object.assign(new Error(`HTTP ${String(response.status)}: ${text.slice(0, 500)}`), {
        name: "ProviderApiError",
        statusCode: response.status,
    });
}

/**
 * Mint a short-lived token with the reader's key: the key goes only in a header, and only to the
 * provider's own host.
 * @param settings - The provider and key.
 * @param model - The live model.
 * @param signal - Cancels the request.
 * @returns The token, as TanStack's adapter takes it.
 * @throws The coded request's error.
 */
async function getToken(settings: ProviderApiSettings, model: string, signal: AbortSignal): Promise<RealtimeToken> {
    const key = settings.apiKey ?? "";
    if (settings.provider === "openai") {
        const response = await globalThis.fetch("https://api.openai.com/v1/realtime/client_secrets", {
            method: "POST",
            headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
            body: JSON.stringify({ session: { type: "realtime", model } }),
            signal,
        });
        if (!response.ok) {
            throw await httpError(response);
        }

        const secret = (await response.json()) as { value: string; expires_at: number };
        return { provider: "openai", token: secret.value, expiresAt: secret.expires_at * 1000, config: { model } };
    }

    const now = Date.now();
    const response = await globalThis.fetch("https://generativelanguage.googleapis.com/v1alpha/auth_tokens", {
        method: "POST",
        headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
        body: JSON.stringify({
            uses: 1,
            expireTime: new Date(now + GOOGLE_TOKEN_MS).toISOString(),
            newSessionExpireTime: new Date(now + GOOGLE_SESSION_START_MS).toISOString(),
            // The token opens a session with this model only, whatever the socket's setup asks.
            bidiGenerateContentSetup: { model: `models/${model}` },
            fieldMask: "model",
        }),
        signal,
    });
    if (!response.ok) {
        throw await httpError(response);
    }

    const { name } = (await response.json()) as { name: string };
    return { provider: "gemini", token: name, expiresAt: now + GOOGLE_TOKEN_MS, config: { model } };
}

/** A failed opening's outcome. */
type Refused = Exclude<LiveOpened, { code: "AI_COMPLETED" }>;

/**
 * What a failure while opening means, as a code.
 * @param error - What was thrown.
 * @param settings - The provider and key, which is scrubbed.
 * @param signal - The opening's signal: when it fired, the opening was cancelled.
 * @returns The outcome.
 */
function refused(error: unknown, settings: ProviderApiSettings, signal: AbortSignal): Refused {
    const name = (error as { name?: unknown } | undefined)?.name;
    const message = error instanceof Error ? error.message : "";
    // The microphone: Gemini passes getUserMedia's DOMException on; the OpenAI adapter folds it
    // into an English sentence (UPSTREAM.md).
    if (!signal.aborted && (name === "NotAllowedError" || name === "SecurityError")) {
        return { code: "AI_VOICE_UNAVAILABLE", params: { path: "input", reason: "permission-denied" } };
    }

    if (!signal.aborted && (name === "NotFoundError" || name === "OverconstrainedError")) {
        return { code: "AI_VOICE_UNAVAILABLE", params: { path: "input", reason: "no-microphone" } };
    }

    if (!signal.aborted && message.startsWith("Microphone access required")) {
        return { code: "AI_VOICE_UNAVAILABLE", params: { path: "input", reason: "permission-denied" } };
    }

    const coded = providerFailure(error, settings.provider, signal, [settings.apiKey]);
    // Google refuses a bad key with 400 API_KEY_INVALID.
    const code =
        coded.code === "AI_PROVIDER_ERROR" && settings.provider === "google" && message.includes("API_KEY_INVALID")
            ? "AI_KEY_REJECTED"
            : coded.code;
    return { code: code === "AI_COMPLETED" ? "AI_PROVIDER_ERROR" : code, params: coded.params };
}

/**
 * The outcome of a connection that ended without graphty closing it.
 * @param provider - The provider's name.
 * @returns Its code and params.
 */
function lost(provider: string): { code: AiResultCode; params: AiResultParams } {
    return { code: "AI_PROVIDER_ERROR", params: { provider, cause: "live-closed" } };
}

/**
 * A tool call's arguments as the loop takes them: an object, or empty and refused as invalid.
 * @param input - What the adapter parsed (OpenAI hands on the raw text when it is not JSON).
 * @returns The arguments.
 */
function callArguments(input: unknown): Pick<LiveToolCall, "arguments" | "invalidArguments"> {
    return typeof input === "object" && input !== null && !Array.isArray(input)
        ? { arguments: input as Record<string, unknown> }
        : { arguments: {}, invalidArguments: true };
}

/**
 * graphty's connection over TanStack's: its events as `LiveEvent`s, one response's calls in one
 * `tool-calls` event, and the provider's loss of the connection as `closed`.
 * @param connection - TanStack's open connection.
 * @param provider - The provider's name.
 * @param cumulative - The adapter reports the answer's transcript as the whole text so far (Gemini),
 * not as deltas (OpenAI).
 * @returns The connection.
 */
function wrap(connection: RealtimeConnection, provider: string, cumulative: boolean): LiveConnection {
    const listeners = new Set<(event: LiveEvent) => void>();
    let open = true;
    let speaking = false;
    let heard = "";
    let answered = "";
    let calls: LiveToolCall[] = [];
    let flushQueued = false;
    /** Gemini's calls ended a response of their own: the end of their generation that follows is not another. */
    let callsEnded = false;

    const emit = (event: LiveEvent): void => {
        // A copy: a listener may unsubscribe while it is told.
        const told = [...listeners];
        for (const listener of told) {
            listener(event);
        }
    };
    const stopSpeaking = (): void => {
        if (speaking) {
            speaking = false;
            emit({ type: "speaking", on: false });
        }
    };
    const settleHeard = (): void => {
        if (heard !== "") {
            emit({ type: "reader-transcript", text: heard, final: true });
            heard = "";
        }
    };
    const callsIn = (): void => {
        if (calls.length > 0) {
            settleHeard();
            emit({ type: "tool-calls", calls });
            calls = [];
        }
    };
    const responseEnd = (): void => {
        if (!open) {
            return;
        }

        settleHeard();
        callsIn();
        answered = "";
        emit({ type: "response-end" });
    };

    const unsubscribe = [
        connection.on("transcript", ({ role, transcript, isFinal }) => {
            if (role === "user") {
                // OpenAI hands over the whole utterance once; Gemini hands over pieces.
                heard += transcript;
                if (isFinal) {
                    settleHeard();
                } else {
                    emit({ type: "reader-transcript", text: heard, final: false });
                }

                return;
            }

            const full = cumulative || isFinal ? transcript : answered + transcript;
            if (full.startsWith(answered) && full.length > answered.length) {
                emit({ type: "answer-text", delta: full.slice(answered.length) });
                answered = full;
            }
        }),
        connection.on("tool_call", ({ toolCallId, toolName, input }) => {
            calls.push({ id: toolCallId, name: toolName, ...callArguments(input) });
            // Gemini's calls arrive in one message and its turn goes on after the results, so the
            // calls are a response of their own; OpenAI's response ends with `message_complete`.
            if (cumulative && !flushQueued) {
                flushQueued = true;
                queueMicrotask(() => {
                    flushQueued = false;
                    if (calls.length > 0) {
                        responseEnd();
                        callsEnded = true;
                    }
                });
            }
        }),
        connection.on("message_complete", () => {
            const empty = callsEnded && heard === "" && answered === "" && calls.length === 0;
            callsEnded = false;
            if (!empty) {
                responseEnd();
            }
        }),
        connection.on("mode_change", ({ mode }) => {
            if (mode === "speaking" && !speaking) {
                speaking = true;
                emit({ type: "speaking", on: true });
            } else if (mode !== "speaking") {
                stopSpeaking();
            }
        }),
        connection.on("interrupted", () => {
            stopSpeaking();
            emit({ type: "interrupted" });
        }),
        connection.on("usage", ({ promptTokens, completionTokens }) => {
            emit({ type: "usage", inputTokens: promptTokens, outputTokens: completionTokens });
        }),
        connection.on("go_away", () => {
            end({ code: "AI_COMPLETED", params: {} });
        }),
        connection.on("status_change", ({ status }) => {
            // Only graphty's close disconnects on purpose, and it stops listening first.
            if (status === "idle" || status === "error") {
                end(lost(provider));
            }
        }),
    ];

    /** Stop listening, stop the microphone and the audio, and close the transport. */
    const shut = (): void => {
        open = false;
        for (const stop of unsubscribe) {
            stop();
        }

        void connection.disconnect().catch(() => undefined);
    };

    /**
     * The provider ended the connection: shut it, then say why.
     * @param outcome - Why.
     * @param outcome.code - The code.
     * @param outcome.params - Its params.
     */
    function end(outcome: { code: AiResultCode; params: AiResultParams }): void {
        if (!open) {
            return;
        }

        shut();
        stopSpeaking();
        emit({ type: "closed", ...outcome });
        listeners.clear();
    }

    return {
        capture(on) {
            if (!open) {
                return;
            }

            if (on) {
                // A new press: words still owed for the last one are its, not this one's.
                settleHeard();
                void connection.startAudioCapture().catch(() => undefined);
            } else {
                connection.stopAudioCapture();
            }
        },
        interrupt() {
            if (open) {
                connection.interrupt();
            }
        },
        sendToolResults(results) {
            if (open) {
                for (const result of results) {
                    connection.sendToolResult(result.callId, toolResultText(result));
                }
            }
        },
        level() {
            return open ? connection.getAudioVisualization().inputLevel : 0;
        },
        on(listener) {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        },
        close() {
            if (open) {
                shut();
                listeners.clear();
            }
        },
    };
}

/**
 * Wait for Gemini's answer to the setup message: the socket is usable only once the server took it.
 * @param connection - The connection.
 * @param signal - Cancels the wait.
 * @returns Whether the setup was taken.
 */
function setupTaken(connection: RealtimeConnection, signal: AbortSignal): Promise<boolean> {
    return new Promise((resolve) => {
        const stops: (() => void)[] = [];
        const settle = (taken: boolean): void => {
            for (const stop of stops) {
                stop();
            }

            signal.removeEventListener("abort", cancelled);
            resolve(taken);
        };
        const cancelled = (): void => {
            settle(false);
        };
        stops.push(
            connection.on("status_change", ({ status }) => {
                if (status === "connected") {
                    settle(true);
                } else if (status === "idle" || status === "error") {
                    settle(false);
                }
            }),
        );
        signal.addEventListener("abort", cancelled, { once: true });
    });
}

/**
 * Open a live conversation: mint a token, connect, stop the microphone at once (both adapters
 * start it), then configure the session in one update.
 * @param settings - The provider and key.
 * @param options - The model, voice, language, instructions and tools.
 * @param signal - Cancels the opening.
 * @returns The connection, or the code it failed with.
 */
async function openLive(settings: ProviderApiSettings, options: LiveOptions, signal: AbortSignal): Promise<LiveOpened> {
    const model = options.model ?? AI_VOICE_CAPABILITIES[settings.provider].live?.model;
    const load = LIVES[settings.provider];
    if (load === undefined || model === undefined) {
        return { code: "AI_VOICE_UNAVAILABLE", params: { path: "input", reason: "no-provider-live" } };
    }

    let connection: RealtimeConnection | undefined;
    try {
        const live = await load();
        const token = await getToken(settings, model, signal);
        signal.throwIfAborted();
        connection = await live.realtime(model).connect(token);
        // The reader's turn starts only when talk is held.
        connection.stopAudioCapture();
        signal.throwIfAborted();
        const cumulative = settings.provider === "google";
        const ready = cumulative ? setupTaken(connection, signal) : Promise.resolve(true);
        const session: RealtimeSessionConfig = {
            instructions: options.instructions,
            tools: options.tools.map(({ name, description, jsonSchema }) => ({
                name,
                description,
                inputSchema: { ...jsonSchema },
            })),
            vadMode: "server",
            outputModalities: ["audio", "text"],
            ...(options.voice !== undefined && { voice: options.voice }),
            ...(options.language !== undefined && { providerOptions: { languageCode: options.language } }),
        };
        connection.updateSession(session);
        if (!(await ready)) {
            signal.throwIfAborted();
            connection.disconnect().catch(() => undefined);
            return { code: "AI_PROVIDER_ERROR", params: lost(settings.provider).params };
        }

        return { code: "AI_COMPLETED", params: {}, connection: wrap(connection, settings.provider, cumulative) };
    } catch (error) {
        connection?.disconnect().catch(() => undefined);
        return refused(error, settings, signal);
    }
}

export const providerLive: ProviderLive = { openLive };
