/**
 * @file A scripted engine for tests: each turn answers with the next scripted events and records
 * the request it was given. New assistant features are tested on it, never on a real provider.
 */

import { providerFailure } from "./LlmProviderEngine";
import {
    type AiEngine,
    type EngineCapabilities,
    type EngineOutcome,
    type LiveConnection,
    type LiveEvent,
    type LiveOpened,
    type LiveOptions,
    type LiveToolResult,
    NO_HOSTED_TOOLS,
    type SpeakOptions,
    type SpokenAudio,
    type TranscribeOptions,
    type TurnEvent,
    type TurnRequest,
    type TurnText,
} from "./types";

/**
 * One scripted turn: its events, or a function that yields them (one that waits on the signal,
 * say, to stand for a model that is still thinking). A function that throws stands for a provider
 * that failed: the engine codes what it threw, as a provider engine does.
 */
export type FakeTurn =
    | readonly TurnEvent[]
    | ((request: TurnRequest, signal: AbortSignal) => AsyncIterable<TurnEvent> | readonly TurnEvent[]);

/** A scripted transcription, as a function of the clip. */
export type FakeTranscribe = (audio: Blob, options: TranscribeOptions, signal: AbortSignal) => Promise<TurnText>;

/** A scripted speech, as a function of the text. */
export type FakeSpeak = (text: string, options: SpeakOptions, signal: AbortSignal) => Promise<SpokenAudio>;

/**
 * A live connection a test drives: it records what graphty asked of it, and `emit` plays what the
 * provider would report.
 */
export class FakeLiveConnection implements LiveConnection {
    /** Every `capture` call, in order. */
    readonly captures: boolean[] = [];
    /** How many times `interrupt` was called. */
    interrupts = 0;
    /** Every `sendToolResults` call's results, in order. */
    readonly sentResults: (readonly LiveToolResult[])[] = [];
    /** What `level` answers. */
    inputLevel = 0;
    closed = false;
    private readonly listeners = new Set<(event: LiveEvent) => void>();

    /**
     * A connection opened with these options.
     * @param options - What it was opened with.
     */
    constructor(readonly options: LiveOptions) {}

    /**
     * Record a capture switch.
     * @param on - Whether the microphone is sent.
     */
    capture(on: boolean): void {
        if (!this.closed) {
            this.captures.push(on);
        }
    }

    /** Record an interrupt. */
    interrupt(): void {
        if (!this.closed) {
            this.interrupts++;
        }
    }

    /**
     * Record tool results.
     * @param results - One response's results.
     */
    sendToolResults(results: readonly LiveToolResult[]): void {
        if (!this.closed) {
            this.sentResults.push([...results]);
        }
    }

    /**
     * The scripted level.
     * @returns `inputLevel`.
     */
    level(): number {
        return this.inputLevel;
    }

    /**
     * Listen.
     * @param listener - Called with each event.
     * @returns Stops listening.
     */
    on(listener: (event: LiveEvent) => void): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    /** Close: no more events reach a listener. */
    close(): void {
        this.closed = true;
        this.listeners.clear();
    }

    /**
     * Play what the provider would report; a `closed` event closes the connection after it.
     * @param event - The event.
     */
    emit(event: LiveEvent): void {
        if (this.closed) {
            return;
        }

        for (const listener of [...this.listeners]) {
            listener(event);
        }

        if (event.type === "closed") {
            this.close();
        }
    }
}

/**
 * An engine that plays a script. Like a provider that cannot, it has no `transcribe`, `speak` or
 * `openLive` until a test scripts them (`scriptVoice`, `scriptLive`).
 */
export class FakeEngine implements AiEngine {
    readonly kind = "fake";
    readonly providerName = "fake";
    /** Every request, in order: what the model was shown. */
    readonly requests: TurnRequest[] = [];
    /** What `checkKey` answers. */
    keyOutcome: EngineOutcome = { code: "AI_COMPLETED", params: {} };
    /**
     * What `capabilities` answers: tool calls, and none of the provider's own tools until a test
     * scripts them (a scripted turn may then emit `hosted-tool` events).
     */
    capability: EngineCapabilities = { toolCalls: "available", hostedTools: NO_HOSTED_TOOLS };
    disposed = false;
    // Declared, not initialized: an own property holding undefined would make `"speak" in engine` lie.
    declare transcribe?: FakeTranscribe;
    declare speak?: FakeSpeak;
    declare openLive?: (options: LiveOptions, signal: AbortSignal) => Promise<LiveOpened>;
    /** Every live connection `openLive` opened, in order. */
    readonly liveConnections: FakeLiveConnection[] = [];
    /** Every clip `transcribe` was given and every text `speak` was given, in order. */
    readonly voiceCalls: ({ kind: "transcribe"; audio: Blob } | { kind: "speak"; text: string })[] = [];
    private readonly script: FakeTurn[];

    /**
     * An engine playing a script.
     * @param script - The turns, in order. Past the end, a turn answers nothing and stops.
     */
    constructor(script: readonly FakeTurn[] = []) {
        this.script = [...script];
    }

    /**
     * Script more turns.
     * @param turns - More turns, played after the ones already scripted.
     */
    push(...turns: FakeTurn[]): void {
        this.script.push(...turns);
    }

    /**
     * Give the fake a provider's speech: a `transcribe` that hears `voice.transcribe`, a `speak`
     * that produces `voice.speak`, or either as a function. Each call is recorded in `voiceCalls`.
     * @param voice - What to script; a direction left out stays absent.
     * @param voice.transcribe - The text heard, or the transcription itself.
     * @param voice.speak - The audio produced, or the speech itself.
     */
    scriptVoice(voice: { transcribe?: string | FakeTranscribe; speak?: Blob | FakeSpeak }): void {
        const { transcribe, speak } = voice;
        if (transcribe !== undefined) {
            this.transcribe = (audio, options, signal) => {
                this.voiceCalls.push({ kind: "transcribe", audio });
                return typeof transcribe === "string"
                    ? Promise.resolve({ code: "AI_COMPLETED", params: {}, text: transcribe })
                    : transcribe(audio, options, signal);
            };
        }

        if (speak !== undefined) {
            this.speak = (text, options, signal) => {
                this.voiceCalls.push({ kind: "speak", text });
                return speak instanceof Blob
                    ? Promise.resolve({ code: "AI_COMPLETED", params: {}, audio: speak })
                    : speak(text, options, signal);
            };
        }
    }

    /**
     * Give the fake a provider's live conversations: `openLive` opens a `FakeLiveConnection`
     * (recorded in `liveConnections`), or fails with `failure`.
     * @param failure - What every open fails with; absent, each open succeeds.
     */
    scriptLive(failure?: Exclude<LiveOpened, { code: "AI_COMPLETED" }>): void {
        this.openLive = (options, signal) => {
            if (signal.aborted) {
                return Promise.resolve({ code: "AI_CANCELLED", params: {} });
            }

            if (failure !== undefined) {
                return Promise.resolve(failure);
            }

            const connection = new FakeLiveConnection(options);
            this.liveConnections.push(connection);
            return Promise.resolve({ code: "AI_COMPLETED", params: {}, connection });
        };
    }

    /**
     * What the fake can do, as scripted.
     * @returns `capability`.
     */
    capabilities(): EngineCapabilities {
        return this.capability;
    }

    /**
     * Play the next scripted turn, recording the request.
     * @param request - The turn.
     * @param signal - Ends the turn with `AI_CANCELLED` when it fires.
     * @yields The scripted events; a coded error for a script that threw.
     */
    async *turn(request: TurnRequest, signal: AbortSignal): AsyncIterable<TurnEvent> {
        this.requests.push(request);
        const next = this.script.shift() ?? [{ type: "finish", reason: "stop" }];
        try {
            const events = typeof next === "function" ? next(request, signal) : next;
            for await (const event of events) {
                if (signal.aborted) {
                    break;
                }

                yield event;
                if (event.type === "finish" || event.type === "error") {
                    return;
                }
            }
        } catch (error) {
            yield providerFailure(error, this.providerName, signal);
            return;
        }

        if (signal.aborted) {
            yield providerFailure(signal.reason, this.providerName, signal);
        }
    }

    /**
     * The scripted key check.
     * @returns `keyOutcome`.
     */
    checkKey(): Promise<EngineOutcome> {
        return Promise.resolve(this.keyOutcome);
    }

    /** Record that the engine was disposed. */
    dispose(): void {
        this.disposed = true;
    }
}
