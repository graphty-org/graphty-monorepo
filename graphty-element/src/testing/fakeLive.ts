/**
 * A scripted live conversation, for stories and tests: an engine whose live connection answers
 * each press of talk with the next scripted exchange, as a provider's live API would, with no
 * microphone, no network and no key.
 *
 * Releasing talk (`capture(false)` after `capture(true)`) plays the next exchange: the reader's
 * words as the provider heard them, the model's tool calls (if any) and, once graphty has sent
 * their results back, the spoken answer's text. Register it as a provider's engine with
 * `registerProviderApiEngine(provider, () => engine)`.
 *
 * This module is reachable from no entry point; it ships in the package the way the tests do.
 * @module testing/fakeLive
 */

import { FakeEngine, FakeLiveConnection } from "../ai/engine/FakeEngine";
import type { LiveToolCall, LiveToolResult } from "../ai/engine/types";

/** One press of talk and what the scripted provider makes of it. */
export interface LiveExchange {
    /** What the reader said, as the provider heard it. */
    readonly heard: string;
    /** The model's tool calls, in order; absent, it only answers. */
    readonly calls?: readonly LiveToolCall[];
    /** The text of the model's spoken answer. */
    readonly answer: string;
}

/** The microphone level the scripted connection reports while talk is held. */
const HELD_LEVEL = 0.4;

/** A live connection that plays one scripted exchange per press. */
class ScriptedLiveConnection extends FakeLiveConnection {
    /** Called with each response's tool results, once. */
    private resultsSent: (() => void) | undefined;

    /**
     * A connection over a shared script.
     * @param options - What it was opened with.
     * @param script - The exchanges left, shared by every connection of the engine.
     */
    constructor(
        options: ConstructorParameters<typeof FakeLiveConnection>[0],
        private readonly script: LiveExchange[],
    ) {
        super(options);
    }

    override capture(on: boolean): void {
        const wasHeld = this.captures.at(-1) === true;
        super.capture(on);
        this.inputLevel = on ? HELD_LEVEL : 0;
        const exchange = !on && wasHeld ? this.script.shift() : undefined;
        if (exchange !== undefined) {
            // After the release returns, as a provider's events arrive.
            queueMicrotask(() => {
                void this.play(exchange);
            });
        }
    }

    override sendToolResults(results: readonly LiveToolResult[]): void {
        super.sendToolResults(results);
        const sent = this.resultsSent;
        this.resultsSent = undefined;
        sent?.();
    }

    /**
     * Play one exchange.
     * @param exchange - What the reader said and what the model does.
     */
    private async play(exchange: LiveExchange): Promise<void> {
        this.emit({ type: "reader-transcript", text: exchange.heard, final: true });
        if (exchange.calls !== undefined && exchange.calls.length > 0) {
            const answered = new Promise<void>((resolve) => {
                this.resultsSent = resolve;
            });
            this.emit({ type: "tool-calls", calls: exchange.calls });
            this.emit({ type: "response-end" });
            await answered;
        }

        this.emit({ type: "speaking", on: true });
        this.emit({ type: "answer-text", delta: exchange.answer });
        this.emit({ type: "response-end" });
        this.emit({ type: "speaking", on: false });
    }
}

/**
 * An engine whose live connections answer each press with the next of `exchanges`.
 * @param exchanges - What the reader says, press by press, and what the model does.
 * @returns The engine; its `liveConnections` holds every connection it opened.
 */
export function scriptedLiveEngine(exchanges: readonly LiveExchange[]): FakeEngine {
    const script = [...exchanges];
    const engine = new FakeEngine();
    engine.openLive = (options, signal) => {
        if (signal.aborted) {
            return Promise.resolve({ code: "AI_CANCELLED", params: {} });
        }

        const connection = new ScriptedLiveConnection(options, script);
        engine.liveConnections.push(connection);
        return Promise.resolve({ code: "AI_COMPLETED", params: {}, connection });
    };
    return engine;
}
