/**
 * @file A scripted engine for tests: each turn answers with the next scripted events and records
 * the request it was given. New assistant features are tested on it, never on a real provider.
 */

import { providerFailure } from "./LlmProviderEngine";
import {
    type AiEngine,
    type EngineCapabilities,
    type EngineOutcome,
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
 * An engine that plays a script. Like a provider that cannot, it has no `transcribe` or `speak`
 * until a test scripts them (`scriptVoice`).
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
